import axios, { type AxiosError, type AxiosInstance, type AxiosResponse } from 'axios'
import { emit } from './offlineEvents'
import {
  cacheGet,
  cachePut,
  getMeta,
  getPulledCache,
  markOfflineSaleFailed,
  markOfflineSaleSynced,
  mergeEntityRows,
  outboxAll,
  outboxEnqueue,
  outboxMarkFailed,
  outboxRemove,
  setMeta,
  logConflict,
} from './offlineStore'

let backendOnline = true

// (store access handled via secureTokens import where needed)

/**
 * The acting branch id, used to scope `/sync/<entity>/pull` for branch-scoped
 * entities (inventories, sales, …). Persisted by AuthContext under
 * `STORAGE_KEYS.selectedBranch`; read through `secureTokens` so it works on
 * native (SecureStore) as well as web (localStorage).
 */
async function getSelectedBranchId(): Promise<string | null> {
  try {
    const { readJson, STORAGE_KEYS } = await import('./secureTokens')
    const branch = await readJson<{ branch_id?: string }>(STORAGE_KEYS.selectedBranch)
    if (branch?.branch_id) return branch.branch_id
  } catch {}
  return null
}

function getCacheKey(baseURL: string | undefined, url: string | undefined): string {
  return `${baseURL ?? ''}${url ?? ''}`
}

const UNREACHABLE_STATUSES = [502, 503, 504]

export function isNetworkError(error: AxiosError): boolean {
  return !error.response && Boolean(error.request || error.code)
}

export function isBackendUnreachable(error: AxiosError): boolean {
  return isNetworkError(error) || (error.response?.status != null && UNREACHABLE_STATUSES.includes(error.response.status))
}

/**
 * True when a rejected promise is the outbox "queued offline" rejection — i.e.
 * the mutation was saved and will be replayed when the connection returns.
 * Screens should treat this as success (with an offline notice), not failure.
 */
export function isQueuedOffline(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { queuedOffline?: boolean; message?: string }
  return (
    e.queuedOffline === true ||
    (typeof e.message === 'string' && /saved to the sync queue/i.test(e.message))
  )
}

const KNOWN_ENTITIES = [
  'products',
  'categories',
  'units-of-measure',
  'suppliers',
  'customers',
  'branches',
  'expenses',
  'expense-categories',
  'purchases',
  'sales',
  'users',
  'roles',
  'inventory',
  'transfers',
  'notifications',
]

const PULL_ENTITIES = [
  'products',
  'categories',
  'units-of-measure',
  'suppliers',
  'customers',
  'branches',
  'expenses',
  'purchases',
  'sales',
  'users',
  'roles',
  'inventories',
  'inventory-transfers',
  'notifications',
  'product-batches',
]

const BRANCH_SCOPED_ENTITIES = ['expenses', 'purchases', 'sales', 'inventories', 'inventory-transfers', 'notifications', 'product-batches']

async function mergePulledProducts(products: unknown[]): Promise<void> {
  const existing = await cacheGet('entity:pulled:products')
  const existingRows = Array.isArray(existing) ? (existing as unknown[]) : []
  const byId = new Map<string, unknown>()
  for (const row of existingRows) {
    const rowObj = row as { product_id?: unknown }
    if (rowObj && rowObj.product_id != null) byId.set(String(rowObj.product_id), row)
  }
  for (const row of products) {
    const rowObj = row as { product_id?: unknown }
    if (rowObj && rowObj.product_id != null) byId.set(String(rowObj.product_id), row)
  }
  await cachePut('entity:pulled:products', Array.from(byId.values()))
  await setMeta('sync:pull:products', new Date().toISOString())
}

export function guessEntity(url: string): string | null {
  const clean = url.split('?')[0].replace(/^\/+/, '')
  const segments = clean.split('/').filter(Boolean)
  for (const seg of segments) {
    if (KNOWN_ENTITIES.includes(seg)) return seg
    if (KNOWN_ENTITIES.includes(`${seg}s`)) return `${seg}s`
  }
  return segments[0] ?? null
}

/** The primary-key field used to merge/cache mirror rows per entity. */
const MIRROR_ID_FIELD: Record<string, string> = {
  products: 'product_id',
  categories: 'category_id',
  'units-of-measure': 'uom_id',
  inventories: 'inventory_id',
  sales: 'sale_id',
  branches: 'branch_id',
}

export function mirrorIdField(entity: string): string | undefined {
  return MIRROR_ID_FIELD[entity]
}

/**
 * Best-effort primary-key field for a mirror entity without an explicit entry in
 * `MIRROR_ID_FIELD`, so incremental pull deltas can still be merged by id.
 */
function deriveIdField(rows: Record<string, unknown>[]): string | undefined {
  const first = rows[0]
  if (!first) return undefined
  const keys = Object.keys(first)
  return keys.find((k) => k.endsWith('_id')) ?? (keys.includes('id') ? 'id' : undefined)
}

/**
 * Read the offline mirror for `entity`, overlaying **pending** outbox mutations
 * so an item created/edited/deactivated offline is visible immediately.
 *
 * Only entities with a known id field are overlaid; others are returned as-is.
 * Failed entries are intentionally excluded — they are surfaced separately.
 */
export async function readMirrorWithPending(entity: string): Promise<Record<string, unknown>[]> {
  const base = (await getPulledCache(entity)) as Record<string, unknown>[]
  const rows = base.map((r) => ({ ...(r as Record<string, unknown>) }))
  const idField = MIRROR_ID_FIELD[entity]
  if (!idField) return rows

  const byId = new Map<string, Record<string, unknown>>()
  for (const r of rows) {
    const id = r[idField]
    if (id != null) byId.set(String(id), r)
  }

  const entries = await outboxAll()
  for (const e of entries) {
    if (e.status !== 'pending') continue
    if (guessEntity(e.url) !== entity) continue
    const method = (e.method || '').toUpperCase()
    const path = (e.url || '').split('?')[0].split('/').filter(Boolean)
    const data = (e.data && typeof e.data === 'object' ? e.data : {}) as Record<string, unknown>

    if (method === 'POST' && path.length === 1) {
      // Create with a temporary local id until the server assigns a real one.
      const id = String(data[idField] ?? `local:${e.id ?? e.createdAt}`)
      byId.set(id, { ...data, [idField]: id, __pending: true })
    } else if ((method === 'PATCH' || method === 'PUT') && path.length >= 2) {
      const id = path[1]
      byId.set(id, { ...(byId.get(id) ?? {}), ...data, [idField]: id, __pending: true })
    } else if (method === 'DELETE' && path.length >= 2) {
      byId.delete(path[1])
    } else if (
      method === 'POST' &&
      path.length === 3 &&
      (path[2] === 'activate' || path[2] === 'deactivate')
    ) {
      const id = path[1]
      byId.set(id, {
        ...(byId.get(id) ?? {}),
        [idField]: id,
        is_active: path[2] === 'activate',
        __pending: true,
      })
    }
  }
  return Array.from(byId.values())
}

export function setupOfflineSupport(api: AxiosInstance): void {
  api.interceptors.response.use(
    (response) => {
      if (!backendOnline) {
        backendOnline = true
        emit('online')
      }
      const config = response.config
      const method = (config.method ?? 'get').toLowerCase()
      if (method === 'get') {
        const key = getCacheKey(config.baseURL, config.url)
        void cachePut(key, response.data).catch(() => {})
      } else if (method === 'post' && (config.url ?? '').includes('/search')) {
        const data = response.data as { products?: unknown } | null
        if (data && Array.isArray(data.products) && data.products.length > 0) {
          void mergePulledProducts(data.products).catch(() => {})
        }
      }
      return response
    },
    async (error: AxiosError) => {
      if (error.response && !isBackendUnreachable(error)) {
        if (!backendOnline) {
          backendOnline = true
          emit('online')
        }
        return Promise.reject(error)
      }

      const config = error.config
      if (!config) return Promise.reject(error)
      const method = (config.method ?? 'get').toLowerCase()

      if (backendOnline) {
        backendOnline = false
        emit('offline')
      }

      if (method === 'get' || method === 'head') {
        const key = getCacheKey(config.baseURL, config.url)
        try {
          const cached = await cacheGet(key)
          if (cached !== undefined) {
            const synthetic: AxiosResponse = {
              data: cached,
              status: 200,
              statusText: 'OK',
              headers: {},
              config,
            }
            return synthetic
          }
        } catch {}
        return Promise.reject(error)
      }

      const url = config.url ?? ''
      if (method === 'post' && url.includes('/search')) {
        return Promise.reject(error)
      }

      // Auth calls (except the deferred branch switch) require connectivity and
      // must never be replayed later; reject them rather than queueing.
      if (url.includes('/auth/') && !url.includes('/auth/select-branch')) {
        return Promise.reject(error)
      }

      try {
        let data: unknown = undefined
        if (config.data) {
          try {
            data = JSON.parse(String(config.data))
          } catch {
            data = config.data
          }
        }
        const entity = guessEntity(url)
        if (entity === 'sales' && typeof data === 'object' && data !== null) {
          const obj = data as Record<string, unknown>
          if (obj.created_offline === undefined) {
            obj.created_offline = true
          }
        }
        if (entity !== 'sales' && typeof data === 'object' && data !== null && !(data instanceof FormData)) {
          const obj = data as Record<string, unknown>
          if (obj.client_mutation_id === undefined) {
            try {
              if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
                obj.client_mutation_id = (crypto as any).randomUUID()
              } else {
                obj.client_mutation_id = `mut-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
              }
            } catch {
              obj.client_mutation_id = `mut-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
            }
          }
        }
        await outboxEnqueue({
          method: String(method).toUpperCase(),
          url,
          data,
          entity,
        })
        emit('queue-changed')
        const queuedError = new Error(
          'Offline: this action was saved to the sync queue and will be sent automatically when the connection is restored.',
        ) as Error & { queuedOffline: boolean; originalError: unknown }
        queuedError.queuedOffline = true
        queuedError.originalError = error
        return Promise.reject(queuedError)
      } catch {
        return Promise.reject(error)
      }
    },
  )
}

// ---- Local → server id mapping -------------------------------------------
//
// An entity created while offline (product / category / UoM / sale) is only
// known locally: `readMirrorWithPending` exposes it under a synthetic id
// (`local:<outboxId>`, or the payload's own id when it has one), and dependent
// mutations (sale lines, stock movements, refunds) reference that synthetic id.
// When the parent create finally reaches the server we must rewrite those
// references — otherwise the backend rejects them ("… must be a UUID").
// The mapping is persisted in `meta` so it survives restarts and covers any
// dependents retried in a later drain.

const ID_MAP_META_KEY = 'sync:idMap'

type LocalIdMap = Record<string, string>

/** Entity → the primary-key field of the created row in the API response. */
const CREATED_ID_FIELD: Record<string, string> = {
  products: 'product_id',
  categories: 'category_id',
  'units-of-measure': 'uom_id',
  inventories: 'inventory_id',
  sales: 'sale_id',
}

async function readLocalIdMap(): Promise<LocalIdMap> {
  try {
    const raw = await getMeta(ID_MAP_META_KEY)
    if (raw && typeof raw === 'object') return raw as LocalIdMap
  } catch {}
  return {}
}

/** Record `localId → serverId` (no-op when either is missing or already equal). */
async function rememberLocalId(localId?: string | null, serverId?: string | null): Promise<void> {
  if (!localId || !serverId || localId === serverId) return
  try {
    const map = await readLocalIdMap()
    map[localId] = serverId
    await setMeta(ID_MAP_META_KEY, map)
  } catch {}
}

/** Replace exact local-id string values anywhere inside a JSON payload. */
function applyLocalIdMap<T>(value: T, map: LocalIdMap): T {
  if (typeof value === 'string') {
    return ((map[value] ?? value) as unknown) as T
  }
  if (Array.isArray(value)) {
    return (value.map((v) => applyLocalIdMap(v, map)) as unknown) as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = applyLocalIdMap(v, map)
    }
    return (out as unknown) as T
  }
  return value
}

/** Rewrite a path segment of `url` that is a known local id (e.g. a refund). */
function applyLocalIdMapToUrl(url: string, map: LocalIdMap): string {
  const [path, query] = url.split('?')
  const rebuilt = path
    .split('/')
    .map((seg) => map[seg] ?? seg)
    .join('/')
  return query ? `${rebuilt}?${query}` : rebuilt
}

/**
 * Pull the created row's primary key out of a create response body.
 *
 * Create endpoints are inconsistent about their envelope: most return
 * `{ data: row }`, but products return `{ product: row }` and categories return
 * `{ category: row }`. Inspect the body, `body.data`, and any other single
 * nested object, otherwise the local→server id mapping is never recorded for
 * those entities and dependents referencing `local:<id>` are rejected by the
 * backend ("… must be a UUID").
 */
function extractServerId(entity: string | null | undefined, body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined
  const outer = body as Record<string, unknown>
  const inner = (
    outer.data && typeof outer.data === 'object' && !Array.isArray(outer.data)
      ? outer.data
      : outer
  ) as Record<string, unknown>

  const candidates: Record<string, unknown>[] = [inner]
  for (const value of Object.values(inner)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      candidates.push(value as Record<string, unknown>)
    }
  }

  const key = entity ? CREATED_ID_FIELD[entity] : undefined
  for (const candidate of candidates) {
    if (key && typeof candidate[key] === 'string') return candidate[key] as string
  }
  for (const candidate of candidates) {
    const fallback = Object.keys(candidate).find(
      (k) => k.endsWith('_id') && typeof candidate[k] === 'string',
    )
    if (fallback) return candidate[fallback] as string
  }
  return undefined
}

/**
 * Exchange the stored refresh token for a new access token. Returns the new
 * access token, or `null` when there is no refresh token or the exchange fails.
 * Used by the outbox drain, which bypasses the `api` refresh interceptor.
 */
async function refreshAccessToken(api: AxiosInstance): Promise<string | null> {
  try {
    const { getRefreshToken, storeTokens } = await import('./secureTokens')
    const refreshToken = await getRefreshToken()
    if (!refreshToken) return null
    const baseURL = api.defaults.baseURL ?? ''
    const { data } = await axios.post<{ accessToken?: string; refreshToken?: string }>(
      `${baseURL}/auth/refresh`,
      { refreshToken },
      { timeout: 15000 },
    )
    if (data?.accessToken && data?.refreshToken) {
      await storeTokens(data.accessToken, data.refreshToken)
      return data.accessToken
    }
    return null
  } catch {
    return null
  }
}

export async function drainOutbox(api: AxiosInstance): Promise<{ processed: number; failed: number; remaining: number }> {
  emit('sync-state', { syncing: true })
  let processed = 0
  let failed = 0
  try {
    const entries = await outboxAll()
    const pending = entries.filter((e) => e.status === 'pending').sort((a, b) => a.createdAt - b.createdAt)
    const baseURL = api.defaults.baseURL ?? ''
    const idMap = await readLocalIdMap()
    for (const entry of pending) {
      if (entry.id == null) continue
      try {
        const { getAccessToken, getDeviceId } = await import('./secureTokens')
        let token = await getAccessToken()
        const deviceId = await getDeviceId()
        // A dependent mutation may reference an entity created offline and since
        // synced — rewrite those local ids to their server ids before sending.
        const requestUrl = applyLocalIdMapToUrl(entry.url, idMap)
        const requestData = applyLocalIdMap(entry.data, idMap)
        const send = () =>
          axios.request({
            method: entry.method,
            url: `${baseURL}${requestUrl}`,
            data: requestData,
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
            },
            timeout: 15000,
          })
        let res
        try {
          res = await send()
        } catch (firstErr) {
          const status = (firstErr as AxiosError).response?.status
          // The stored access token may simply be stale — refresh once and retry.
          if ((status === 401 || status === 403) && token) {
            const refreshed = await refreshAccessToken(api)
            if (!refreshed) throw firstErr
            token = refreshed
            res = await send()
          } else {
            throw firstErr
          }
        }
        await outboxRemove(entry.id)
        processed++
        emit('queue-changed')

        const entity = entry.entity ?? guessEntity(entry.url)
        const pathParts = entry.url.split('?')[0].split('/').filter(Boolean)
        const isCreate = String(entry.method).toUpperCase() === 'POST' && pathParts.length === 1
        if (isCreate && entity) {
          const serverId = extractServerId(entity, res.data)
          if (serverId) {
            const payload = (entry.data ?? {}) as Record<string, unknown>
            if (entity === 'sales') {
              const localTxn =
                typeof payload.local_transaction_id === 'string'
                  ? payload.local_transaction_id
                  : undefined
              if (localTxn) {
                idMap[localTxn] = serverId
                idMap[`local:${entry.id}`] = serverId
                void markOfflineSaleSynced(localTxn, serverId).catch(() => {})
                await rememberLocalId(localTxn, serverId)
              }
            } else {
              // The synthetic id `readMirrorWithPending` exposed the row under.
              const explicit = payload[MIRROR_ID_FIELD[entity] ?? '']
              const localId = typeof explicit === 'string' ? explicit : `local:${entry.id}`
              idMap[localId] = serverId
              await rememberLocalId(localId, serverId)
            }
          }
        }
      } catch (err) {
        const anyErr = err as AxiosError
        if (isBackendUnreachable(anyErr)) {
          break
        }
        if (anyErr.response) {
          const status = anyErr.response.status
          const data = anyErr.response.data as { message?: string; errors?: { msg?: string }[] } | undefined
          const msg = data?.errors?.[0]?.msg ?? data?.message ?? anyErr.message ?? 'Request failed'
          if (status === 409 || /conflict/i.test(String(msg))) {
            try {
              await logConflict({ at: Date.now(), entity: entry.entity || '', id: null, reason: msg || 'Conflict' })
            } catch {}
          }
          await outboxMarkFailed(entry.id, String(msg))
          failed++
          emit('queue-changed')
          if (entry.entity === 'sales') {
            const payload = (entry.data ?? {}) as { local_transaction_id?: string }
            if (payload.local_transaction_id) {
              void markOfflineSaleFailed(payload.local_transaction_id, String(msg)).catch(() => {})
            }
          }
        } else {
          break
        }
      }
    }
    await setMeta('lastSyncAt', new Date().toISOString())
    if (processed > 0 || failed > 0) {
      void hydrateOfflineCache(api).catch(() => {})
    }
  } finally {
    emit('sync-state', { syncing: false })
    emit('sync-done', { processed, failed })
  }
  const remainingEntries = await outboxAll()
  const remaining = remainingEntries.filter((e) => e.status === 'pending').length
  return { processed, failed, remaining }
}

export async function refreshProductsCatalog(api: AxiosInstance): Promise<void> {
  const { getAccessToken } = await import('./secureTokens')
  const token = await getAccessToken()
  if (!token) return
  const res = await api.get('/sync/products/pull', { timeout: 15000 })
  const payload = res.data as { data?: unknown } | unknown[] | null
  const rows = Array.isArray(payload) ? payload : payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: unknown }).data : undefined
  if (rows !== undefined) {
    await cachePut('entity:pulled:products', rows)
    await setMeta('sync:pull:products', new Date().toISOString())
  }
}

export async function refreshInventoriesCatalog(api: AxiosInstance): Promise<void> {
  const { getAccessToken } = await import('./secureTokens')
  const token = await getAccessToken()
  if (!token) return
  const branchId = await getSelectedBranchId()
  if (!branchId) return
  const res = await api.get('/sync/inventories/pull', { params: { branchId }, timeout: 15000 })
  const payload = res.data as { data?: unknown } | unknown[] | null
  const rows = Array.isArray(payload) ? payload : payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: unknown }).data : undefined
  if (rows !== undefined) {
    await cachePut('entity:pulled:inventories', rows)
    await setMeta('sync:pull:inventories', new Date().toISOString())
  }
}

export async function hydrateOfflineCache(api: AxiosInstance): Promise<number> {
  const { getAccessToken } = await import('./secureTokens')
  const token = await getAccessToken()
  if (!token) return 0
  let hydrated = 0
  await Promise.allSettled(
    PULL_ENTITIES.map(async (entity) => {
      try {
        const isFull = entity === 'products' || entity === 'inventories' || entity === 'product-batches'
        const sinceKey = `sync:pull:${entity}`
        // With no mirror rows yet (first run, or a mirror wiped by an older
        // build), pull the full snapshot instead of trusting `since`.
        const cached = await getPulledCache(entity)
        const hasMirror = Array.isArray(cached) && cached.length > 0
        const sinceVal = isFull || !hasMirror ? undefined : await getMeta(sinceKey)
        const since = typeof sinceVal === 'string' && sinceVal ? sinceVal : undefined
        const isBranchScoped = BRANCH_SCOPED_ENTITIES.includes(entity)
        const branchId = await getSelectedBranchId()
        if (isBranchScoped && !branchId) return
        const res = await api.get(`/sync/${entity}/pull`, {
          params: {
            ...(since ? { since } : {}),
            ...(isBranchScoped && branchId ? { branchId } : {}),
          },
          timeout: 15000,
        })
        const payload = res.data as { data?: unknown } | unknown[] | null
        const raw = Array.isArray(payload) ? payload : payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: unknown }).data : undefined
        if (raw !== undefined) {
          const rows = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []
          if (isFull) {
            // A full pull is the complete snapshot, so replacing is correct
            // (and lets server-side deletions drop out of the mirror).
            await cachePut(`entity:pulled:${entity}`, rows)
          } else if (rows.length > 0) {
            // Incremental pulls return only rows changed since `since`. Merge
            // them into the mirror instead of replacing it — otherwise a thin
            // or empty delta would wipe everything already cached.
            const idField = MIRROR_ID_FIELD[entity] ?? deriveIdField(rows)
            if (idField) await mergeEntityRows(entity, rows, idField)
            else await cachePut(`entity:pulled:${entity}`, rows)
          }
          await setMeta(sinceKey, new Date().toISOString())
          hydrated++
        }
      } catch {}
    }),
  )
  return hydrated
}