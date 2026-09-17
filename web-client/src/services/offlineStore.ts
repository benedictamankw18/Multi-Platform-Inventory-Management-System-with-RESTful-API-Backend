import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export type OutboxStatus = 'pending' | 'failed'

export type OutboxEntry = {
  id?: number
  method: string
  url: string
  data: unknown
  entity: string | null
  createdAt: number
  attempts: number
  lastError: string | null
  status: OutboxStatus
}

export type OfflineSaleStatus = 'pending' | 'synced' | 'failed'

export type OfflineSale = {
  local_transaction_id: string
  payload: Record<string, unknown>
  invoice_number: string
  items: unknown[]
  payments: unknown[]
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  customer_name: string | null
  cashier_name: string | null
  branch_id: string | null
  created_at: string
  status: OfflineSaleStatus
  server_sale_id?: string | null
  error?: string | null
}

interface OfflineDB extends DBSchema {
  cache: {
    key: string
    value: { key: string; data: unknown; savedAt: number }
  }
  outbox: {
    key: number
    value: OutboxEntry
  }
  meta: {
    key: string
    value: { key: string; value: unknown }
  }
  offlineSales: {
    key: string
    value: OfflineSale
  }
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>('inventory-offline', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('outbox')) {
          db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('offlineSales')) {
          db.createObjectStore('offlineSales', { keyPath: 'local_transaction_id' })
        }
      },
    })
  }
  return dbPromise
}

export async function cacheGet(key: string): Promise<unknown | undefined> {
  const db = await getDB()
  const rec = await db.get('cache', key)
  return rec?.data
}

export async function cachePut(key: string, data: unknown): Promise<void> {
  const db = await getDB()
  await db.put('cache', { key, data, savedAt: Date.now() })
}

export async function cacheClear(): Promise<void> {
  const db = await getDB()
  await db.clear('cache')
}

// The offline catalog hydrated via /sync/<entity>/pull
export async function getPulledCache(entity: string): Promise<unknown[]> {
  const data = await cacheGet(`entity:pulled:${entity}`)
  return Array.isArray(data) ? data : []
}

export async function outboxEnqueue(entry: Omit<OutboxEntry, 'id' | 'createdAt' | 'attempts' | 'status' | 'lastError'>): Promise<number> {
  const db = await getDB()
  return db.add('outbox', { ...entry, createdAt: Date.now(), attempts: 0, status: 'pending' } as OutboxEntry)
}

export async function outboxAll(): Promise<OutboxEntry[]> {
  const db = await getDB()
  return db.getAll('outbox')
}

export async function outboxRemove(id: number): Promise<void> {
  const db = await getDB()
  await db.delete('outbox', id)
}

export async function outboxMarkFailed(id: number, lastError: string): Promise<void> {
  const db = await getDB()
  const entry = await db.get('outbox', id)
  if (entry) {
    await db.put('outbox', { ...entry, attempts: entry.attempts + 1, lastError, status: 'failed' })
  }
}

export async function outboxRetry(id: number): Promise<void> {
  const db = await getDB()
  const entry = await db.get('outbox', id)
  if (entry) {
    await db.put('outbox', { ...entry, status: 'pending' })
  }
}

export async function outboxClear(): Promise<void> {
  const db = await getDB()
  await db.clear('outbox')
}

// ---- Offline sales ledger ---------------------------------------------------

export async function saveOfflineSale(sale: OfflineSale): Promise<void> {
  const db = await getDB()
  await db.put('offlineSales', sale)
}

export async function offlineSalesAll(): Promise<OfflineSale[]> {
  const db = await getDB()
  return db.getAll('offlineSales')
}

export async function markOfflineSaleSynced(localTransactionId: string, serverSaleId: string): Promise<void> {
  const db = await getDB()
  const sale = await db.get('offlineSales', localTransactionId)
  if (sale) {
    await db.put('offlineSales', { ...sale, status: 'synced', server_sale_id: serverSaleId, error: null })
  }
}

export async function markOfflineSaleFailed(localTransactionId: string, error: string): Promise<void> {
  const db = await getDB()
  const sale = await db.get('offlineSales', localTransactionId)
  if (sale) {
    await db.put('offlineSales', { ...sale, status: 'failed', error })
  }
}

export async function removeOfflineSale(localTransactionId: string): Promise<void> {
  const db = await getDB()
  await db.delete('offlineSales', localTransactionId)
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put('meta', { key, value })
}

export async function getMeta(key: string): Promise<unknown | undefined> {
  const db = await getDB()
  const rec = await db.get('meta', key)
  return rec?.value
}
