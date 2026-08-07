import axios, { type AxiosError, type AxiosInstance, type AxiosResponse } from 'axios'
import { emit } from './offlineEvents'
import {
  cacheGet,
  cachePut,
  getMeta,
  markOfflineSaleFailed,
  markOfflineSaleSynced,
  outboxAll,
  outboxEnqueue,
  outboxMarkFailed,
  outboxRemove,
  setMeta,
} from './offlineStore'

let backendOnline = true

function getDeviceId(): string {
  const KEY = 'deviceId'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
    localStorage.setItem(KEY, id)
  }
  return id
}

export function isNetworkError(error: AxiosError): boolean {
  return !error.response && Boolean(error.request || error.code)
}

const UNREACHABLE_STATUSES = [502, 503, 504]

export function isBackendUnreachable(error: AxiosError): boolean {
  return isNetworkError(error) || (error.response?.status != null && UNREACHABLE_STATUSES.includes(error.response.status))
}

function getCacheKey(baseURL: string | undefined, url: string | undefined): string {
  return `${baseURL ?? ''}${url ?? ''}`
}

const KNOWN_ENTITIES = [
  'products',
  'categories',
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
]

// Entities whose rows belong to a single branch. Their pulls are scoped with
// ?branchId so a device never caches another branch's data. Everything else
// in PULL_ENTITIES is global reference data.
const BRANCH_SCOPED_ENTITIES = [
  'expenses',
  'purchases',
  'sales',
  'inventories',
  'inventory-transfers',
  'notifications',
]

// The branch the offline cache is scoped to. Kept in sync with AuthContext,
// which persists it to the same localStorage key on select-branch.
function getSelectedBranchId(): string | null {
  try {
    const raw = localStorage.getItem('selectedBranch')
    if (!raw) return null
    const branch = JSON.parse(raw) as { branch_id?: string }
    return branch?.branch_id ?? null
  } catch {
    return null
  }
}

// Best-effort: fold successful /products/search results into the offline
// product catalog so the cache stays warm between full sync pulls. Search
// responses are paginated, so merge by product_id (search row wins) instead
// of replacing the whole catalog.
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

function guessEntity(url: string): string | null {
  const clean = url.split('?')[0].replace(/^\/+/, '')
  const segments = clean.split('/').filter(Boolean)
  for (const seg of segments) {
    if (KNOWN_ENTITIES.includes(seg)) return seg
    if (KNOWN_ENTITIES.includes(`${seg}s`)) return `${seg}s`
  }
  return segments[0] ?? null
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
        // Successful /products/search results are folded into the offline
        // product catalog so it stays warm between full sync pulls — this is
        // what keeps offline POS search working when the backend goes down
        // long after the last successful hydration.
        const data = response.data as { products?: unknown } | null
        if (data && Array.isArray(data.products) && data.products.length > 0) {
          void mergePulledProducts(data.products).catch(() => {})
        }
      }
      return response
    },
    async (error: AxiosError) => {
      // Real API error (4xx/5xx) — unless it's a gateway/upstream failure
      // (502/503/504), which means the backend is unreachable: treat as offline.
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

      // Reads → serve from the local cache when available
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
        } catch {
          // cache unavailable — fall through to the network error
        }
        return Promise.reject(error)
      }

      // Read-like POSTs (e.g. /products/search) are NOT mutations — never
      // queue them. Reject so callers can fall back to local data.
      const url = config.url ?? ''
      if (method === 'post' && url.includes('/search')) {
        return Promise.reject(error)
      }

      // Mutations → record in the outbox and let the caller know it is queued
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
        if (
          entity !== 'sales' &&
          typeof data === 'object' &&
          data !== null &&
          !(data instanceof FormData)
        ) {
          const obj = data as Record<string, unknown>
          if (obj.client_mutation_id === undefined) {
            obj.client_mutation_id =
              typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `mut-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
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

export async function drainOutbox(
  api: AxiosInstance,
): Promise<{ processed: number; failed: number; remaining: number }> {
  emit('sync-state', { syncing: true })
  let processed = 0
  let failed = 0
  try {
    const entries = await outboxAll()
    const pending = entries
      .filter((e) => e.status === 'pending')
      .sort((a, b) => a.createdAt - b.createdAt)

    const baseURL = api.defaults.baseURL ?? ''
    for (const entry of pending) {
      if (entry.id == null) continue
      try {
        // Use raw axios (not the instance) so replay failures are never re-queued
        const token = localStorage.getItem('accessToken')
        const res = await axios.request({
          method: entry.method,
          url: `${baseURL}${entry.url}`,
          data: entry.data,
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Device-Id': getDeviceId(),
          },
          timeout: 15000,
        })
        await outboxRemove(entry.id)
        processed++
        emit('queue-changed')

        // Link a replayed sale back to its local ledger record
        if (entry.entity === 'sales') {
          const payload = (entry.data ?? {}) as { local_transaction_id?: string }
          const body = res.data as {
            data?: { sale_id?: string }
            sale?: { sale_id?: string }
            sale_id?: string
          }
          const saleId = body?.data?.sale_id ?? body?.sale?.sale_id ?? body?.sale_id
          if (payload.local_transaction_id && saleId) {
            void markOfflineSaleSynced(payload.local_transaction_id, saleId).catch(() => {})
          }
        }
      } catch (err) {
        const anyErr = err as AxiosError
        if (isBackendUnreachable(anyErr)) {
          // Still offline (network error or gateway 502/503/504) — stop
          // draining and retry later; keep the entry pending.
          break
        }
        if (anyErr.response) {
          const data = anyErr.response.data as
            | { message?: string; errors?: { msg?: string }[] }
            | undefined
          const msg =
            data?.errors?.[0]?.msg ??
            data?.message ??
            anyErr.message ??
            'Request failed'
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
          // Still offline — stop draining; we will retry later
          break
        }
      }
    }
    await setMeta('lastSyncAt', new Date().toISOString())
    // Only re-pull caches when something was actually replayed, otherwise an
    // empty drain (e.g. app boot) fires N authenticated pulls for no reason.
    if (processed > 0 || failed > 0) {
      void hydrateOfflineCache(api).catch(() => {})
    }
  } finally {
    emit('sync-state', { syncing: false })
    emit('sync-done', { processed, failed })
  }
  const remaining = (await outboxAll()).filter((e) => e.status === 'pending').length
  return { processed, failed, remaining }
}

export async function refreshProductsCatalog(api: AxiosInstance): Promise<void> {
  if (!localStorage.getItem('accessToken')) return
  const res = await api.get('/sync/products/pull', { timeout: 15000 })
  const payload = res.data as { data?: unknown } | unknown[] | null
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: unknown }).data
      : undefined
  if (rows !== undefined) {
    await cachePut('entity:pulled:products', rows)
    await setMeta('sync:pull:products', new Date().toISOString())
  }
}

export async function refreshInventoriesCatalog(api: AxiosInstance): Promise<void> {
  if (!localStorage.getItem('accessToken')) return
  const branchId = getSelectedBranchId()
  // Without a selected branch the pull would return an empty branch-scoped
  // set — do not overwrite a previously cached catalog with nothing.
  if (!branchId) return
  const res = await api.get('/sync/inventories/pull', { params: { branchId }, timeout: 15000 })
  const payload = res.data as { data?: unknown } | unknown[] | null
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: unknown }).data
      : undefined
  if (rows !== undefined) {
    await cachePut('entity:pulled:inventories', rows)
    await setMeta('sync:pull:inventories', new Date().toISOString())
  }
}

export async function hydrateOfflineCache(api: AxiosInstance): Promise<number> {
  // Nothing to hydrate while signed out — pulls would just 401.
  if (!localStorage.getItem('accessToken')) return 0
  let hydrated = 0
  await Promise.allSettled(
    PULL_ENTITIES.map(async (entity) => {
      try {
        // Products + branch inventory drive the offline POS catalog: always
        // pull FULL snapshots (no `since`), otherwise an incremental pull would
        // overwrite the cached data with only recently-changed rows.
        const isFull = entity === 'products' || entity === 'inventories'
        const sinceKey = `sync:pull:${entity}`
        const sinceVal = isFull ? undefined : await getMeta(sinceKey)
        const since = typeof sinceVal === 'string' && sinceVal ? sinceVal : undefined
        // Branch-scoped entities are only pulled once a branch is selected —
        // never fetch all branches into the offline cache.
        const isBranchScoped = BRANCH_SCOPED_ENTITIES.includes(entity)
        const branchId = getSelectedBranchId()
        if (isBranchScoped && !branchId) return
        const res = await api.get(`/sync/${entity}/pull`, {
          params: {
            ...(since ? { since } : {}),
            ...(isBranchScoped && branchId ? { branchId } : {}),
          },
          timeout: 15000,
        })
        const payload = res.data as { data?: unknown } | unknown[] | null
        const rows = Array.isArray(payload)
          ? payload
          : payload && typeof payload === 'object' && 'data' in payload
            ? (payload as { data: unknown }).data
            : undefined
        if (rows !== undefined) {
          await cachePut(`entity:pulled:${entity}`, rows)
          await setMeta(sinceKey, new Date().toISOString())
          hydrated++
        }
      } catch {
        // per-entity pull failure — do not abort the rest
      }
    }),
  )
  return hydrated
}
