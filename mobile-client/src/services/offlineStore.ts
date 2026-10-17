/**
 * offlineStore.ts (mobile)
 *
 * SQLite-backed store mirroring the web client's IndexedDB schema:
 * - cache (key -> {key, data, savedAt})
 * - outbox (id autoincrement -> OutboxEntry)
 * - meta (key -> {key, value})
 * - offlineSales (local_transaction_id -> OfflineSale)
 */

import * as SQLite from 'expo-sqlite'

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

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('inventory-offline.db').then(async (db) => {
      await db.execAsync(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  savedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  data TEXT,
  entity TEXT,
  createdAt INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  lastError TEXT,
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT
);
CREATE TABLE IF NOT EXISTS offlineSales (
  local_transaction_id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  items TEXT NOT NULL,
  payments TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount_amount REAL NOT NULL,
  tax_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  amount_paid REAL NOT NULL,
  balance_due REAL NOT NULL,
  customer_name TEXT,
  cashier_name TEXT,
  branch_id TEXT,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  server_sale_id TEXT,
  error TEXT
);
`)
      return db
    })
  }
  return dbPromise
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v)
  } catch {
    return 'null'
  }
}

function safeParse<T = unknown>(s: string | null | undefined): T | undefined {
  if (!s) return undefined
  try {
    return JSON.parse(s) as T
  } catch {
    return undefined
  }
}

export async function cacheGet(key: string): Promise<unknown | undefined> {
  const db = await getDB()
  const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM cache WHERE key = ?', key)
  return safeParse(row?.data ?? null)
}

export async function cachePut(key: string, data: unknown): Promise<void> {
  const db = await getDB()
  const json = safeStringify(data)
  await db.runAsync('INSERT OR REPLACE INTO cache (key, data, savedAt) VALUES (?, ?, ?)', key, json, Date.now())
}

export async function cacheClear(): Promise<void> {
  const db = await getDB()
  await db.execAsync('DELETE FROM cache')
}

export async function getPulledCache(entity: string): Promise<unknown[]> {
  const data = await cacheGet(`entity:pulled:${entity}`)
  return Array.isArray(data) ? data : []
}

/**
 * Merge `rows` into the pulled mirror for `entity`, keyed by `idField`.
 *
 * Used by online reads (`/products/search`, `/categories/search`, …) so the
 * offline mirror stays warm even before/without a `/sync/<entity>/pull`. Rows
 * without an id are kept under a synthetic key so they are not silently lost.
 */
export async function mergeEntityRows(
  entity: string,
  rows: unknown[],
  idField: string,
): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return
  const key = `entity:pulled:${entity}`
  const existing = await cacheGet(key)
  const byId = new Map<string, unknown>()
  const put = (row: unknown) => {
    const obj = row as Record<string, unknown> | null
    if (!obj || typeof obj !== 'object') return
    const id = obj[idField]
    if (id == null) byId.set(`__noid:${byId.size}`, obj)
    else byId.set(String(id), obj)
  }
  if (Array.isArray(existing)) existing.forEach(put)
  rows.forEach(put)
  await cachePut(key, Array.from(byId.values()))
}

/** Replace the pulled mirror for `entity` wholesale (used by sync hydrate). */
export async function setEntityRows(entity: string, rows: unknown[]): Promise<void> {
  await cachePut(`entity:pulled:${entity}`, Array.isArray(rows) ? rows : [])
}

/** A recorded last-write-wins conflict (kept for the sync/conflict log). */
export type ConflictEntry = {
  at: number
  entity: string
  id: string | null
  reason: string
}

/** Append a conflict to the capped conflict log (`meta` key `sync:conflicts`). */
export async function logConflict(entry: ConflictEntry): Promise<void> {
  const existing = await getMeta('sync:conflicts')
  const list = Array.isArray(existing) ? (existing as ConflictEntry[]) : []
  list.unshift(entry)
  await setMeta('sync:conflicts', list.slice(0, 100))
}

export async function conflictsAll(): Promise<ConflictEntry[]> {
  const v = await getMeta('sync:conflicts')
  return Array.isArray(v) ? (v as ConflictEntry[]) : []
}

export async function outboxEnqueue(entry: Omit<OutboxEntry, 'id' | 'createdAt' | 'attempts' | 'status' | 'lastError'>): Promise<number> {
  const db = await getDB()
  const res = await db.runAsync(
    'INSERT INTO outbox (method, url, data, entity, createdAt, attempts, lastError, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    entry.method,
    entry.url,
    entry.data === undefined ? null : safeStringify(entry.data),
    entry.entity,
    Date.now(),
    0,
    null,
    'pending',
  )
  return res.lastInsertRowId ?? 0
}

export async function outboxAll(): Promise<OutboxEntry[]> {
  const db = await getDB()
  const rows = await db.getAllAsync<any>(
    'SELECT id, method, url, data, entity, createdAt, attempts, lastError, status FROM outbox ORDER BY id ASC',
  )
  return rows.map((r) => ({
    id: r.id,
    method: r.method,
    url: r.url,
    data: safeParse(r.data),
    entity: r.entity ?? null,
    createdAt: r.createdAt,
    attempts: r.attempts,
    lastError: r.lastError ?? null,
    status: r.status as OutboxStatus,
  }))
}

export async function outboxRemove(id: number): Promise<void> {
  const db = await getDB()
  await db.runAsync('DELETE FROM outbox WHERE id = ?', id)
}

export async function outboxMarkFailed(id: number, lastError: string): Promise<void> {
  const db = await getDB()
  await db.runAsync('UPDATE outbox SET attempts = attempts + 1, lastError = ?, status = ? WHERE id = ?', lastError, 'failed', id)
}

export async function outboxRetry(id: number): Promise<void> {
  const db = await getDB()
  await db.runAsync('UPDATE outbox SET status = ? WHERE id = ?', 'pending', id)
}

/**
 * Move every `failed` outbox entry back to `pending` so it is retried on the
 * next drain. Returns how many entries were requeued.
 */
export async function outboxRetryFailed(): Promise<number> {
  const db = await getDB()
  const res = await db.runAsync(
    "UPDATE outbox SET status = 'pending', attempts = 0, lastError = NULL WHERE status = 'failed'",
  )
  return res.changes ?? 0
}

export async function outboxClear(): Promise<void> {
  const db = await getDB()
  await db.execAsync('DELETE FROM outbox')
}

export async function saveOfflineSale(sale: OfflineSale): Promise<void> {
  const db = await getDB()
  await db.runAsync(
    `INSERT OR REPLACE INTO offlineSales (
      local_transaction_id, payload, invoice_number, items, payments,
      subtotal, discount_amount, tax_amount, total_amount, amount_paid, balance_due,
      customer_name, cashier_name, branch_id, created_at, status, server_sale_id, error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    sale.local_transaction_id,
    safeStringify(sale.payload),
    sale.invoice_number,
    safeStringify(sale.items),
    safeStringify(sale.payments),
    sale.subtotal,
    sale.discount_amount,
    sale.tax_amount,
    sale.total_amount,
    sale.amount_paid,
    sale.balance_due,
    sale.customer_name,
    sale.cashier_name,
    sale.branch_id,
    sale.created_at,
    sale.status,
    sale.server_sale_id ?? null,
    sale.error ?? null,
  )
}

export async function offlineSalesAll(): Promise<OfflineSale[]> {
  const db = await getDB()
  const rows = await db.getAllAsync<any>('SELECT * FROM offlineSales ORDER BY created_at DESC')
  return rows.map((r) => ({
    local_transaction_id: r.local_transaction_id,
    payload: (safeParse(r.payload) as Record<string, unknown>) ?? {},
    invoice_number: r.invoice_number,
    items: (safeParse(r.items) as unknown[]) ?? [],
    payments: (safeParse(r.payments) as unknown[]) ?? [],
    subtotal: r.subtotal,
    discount_amount: r.discount_amount,
    tax_amount: r.tax_amount,
    total_amount: r.total_amount,
    amount_paid: r.amount_paid,
    balance_due: r.balance_due,
    customer_name: r.customer_name,
    cashier_name: r.cashier_name,
    branch_id: r.branch_id,
    created_at: r.created_at,
    status: r.status as OfflineSaleStatus,
    server_sale_id: r.server_sale_id,
    error: r.error,
  }))
}

export async function markOfflineSaleSynced(localTransactionId: string, serverSaleId: string): Promise<void> {
  const db = await getDB()
  await db.runAsync('UPDATE offlineSales SET status = ?, server_sale_id = ?, error = NULL WHERE local_transaction_id = ?', 'synced', serverSaleId, localTransactionId)
}

export async function markOfflineSaleFailed(localTransactionId: string, error: string): Promise<void> {
  const db = await getDB()
  await db.runAsync('UPDATE offlineSales SET status = ?, error = ? WHERE local_transaction_id = ?', 'failed', error, localTransactionId)
}

export async function removeOfflineSale(localTransactionId: string): Promise<void> {
  const db = await getDB()
  await db.runAsync('DELETE FROM offlineSales WHERE local_transaction_id = ?', localTransactionId)
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, safeStringify(value))
}

export async function getMeta(key: string): Promise<unknown | undefined> {
  const db = await getDB()
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key)
  return safeParse(row?.value ?? null)
}