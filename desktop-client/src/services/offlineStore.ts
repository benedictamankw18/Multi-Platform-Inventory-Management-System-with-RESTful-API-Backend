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
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>('inventory-offline', 1, {
      upgrade(db) {
        db.createObjectStore('cache', { keyPath: 'key' })
        db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true })
        db.createObjectStore('meta', { keyPath: 'key' })
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

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put('meta', { key, value })
}

export async function getMeta(key: string): Promise<unknown | undefined> {
  const db = await getDB()
  const rec = await db.get('meta', key)
  return rec?.value
}
