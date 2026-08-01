import axios, { type AxiosError, type AxiosInstance, type AxiosResponse } from 'axios'
import { emit } from './offlineEvents'
import {
  cacheGet,
  cachePut,
  getMeta,
  outboxAll,
  outboxEnqueue,
  outboxMarkFailed,
  outboxRemove,
  setMeta,
} from './offlineStore'

let backendOnline = true

export function isNetworkError(error: AxiosError): boolean {
  return !error.response && Boolean(error.request || error.code)
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
      }
      return response
    },
    async (error: AxiosError) => {
      // Server responded (4xx/5xx) — real API error, not an offline condition
      if (error.response) {
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
        const url = config.url ?? ''
        await outboxEnqueue({
          method: String(method).toUpperCase(),
          url,
          data,
          entity: guessEntity(url),
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
        await axios.request({
          method: entry.method,
          url: `${baseURL}${entry.url}`,
          data: entry.data,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          timeout: 15000,
        })
        await outboxRemove(entry.id)
        processed++
        emit('queue-changed')
      } catch (err) {
        const anyErr = err as AxiosError
        if (anyErr.response) {
          const msg =
            (anyErr.response.data as { message?: string } | undefined)?.message ??
            anyErr.message ??
            'Request failed'
          await outboxMarkFailed(entry.id, String(msg))
          failed++
          emit('queue-changed')
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

export async function hydrateOfflineCache(api: AxiosInstance): Promise<number> {
  // Nothing to hydrate while signed out — pulls would just 401.
  if (!localStorage.getItem('accessToken')) return 0
  let hydrated = 0
  await Promise.allSettled(
    PULL_ENTITIES.map(async (entity) => {
      try {
        const sinceKey = `sync:pull:${entity}`
        const sinceVal = await getMeta(sinceKey)
        const since = typeof sinceVal === 'string' && sinceVal ? sinceVal : undefined
        const res = await api.get(`/sync/${entity}/pull`, {
          params: since ? { since } : {},
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
