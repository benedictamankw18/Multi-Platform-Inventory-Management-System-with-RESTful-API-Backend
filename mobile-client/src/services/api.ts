/**
 * api.ts
 *
 * Axios client for the REST API at `/api/v1`.
 *
 * Ported from `web-client/src/services/api.ts`, with two mobile-specific
 * changes:
 *   1. Tokens live in `expo-secure-store` (via secureTokens.ts), not localStorage.
 *   2. The 401 handler navigates with `expo-router` instead of `window.location`.
 *
 * Auth model: Bearer access token + rotating refresh token. The refresh token is
 * accepted in the JSON body (`POST /auth/refresh`), so no cookies are required.
 * Every request sends `X-Device-Id`.
 */

import axios, { create, isAxiosError, type AxiosError } from 'axios'
import { router } from 'expo-router'
import {
  clearTokens,
  getAccessToken,
  getDeviceId,
  getRefreshToken,
  storeTokens,
} from './secureTokens'
import { isBackendUnreachable, readMirrorWithPending, setupOfflineSupport } from './offline'
import { mergeEntityRows, offlineSalesAll, type OfflineSale } from './offlineStore'
import { Platform } from 'react-native'

export { isAxiosError }

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------


/**
 * Build the *default* base URL from the build-time env var, applying the
 * Android-emulator localhost mapping. This is only the seed value; the running
 * value comes from `getApiBaseUrl()` and may have been set by the
 * "Connect to Your Server" screen (persisted in SecureStore).
 */
const getDefaultBaseUrl = () => {
  const env = process.env.EXPO_PUBLIC_API_BASE_URL
  if (env) {
    // Android emulator maps localhost to 10.0.2.2; iOS simulator uses localhost
    if (Platform.OS === 'android' && env.includes('localhost')) {
      return env.replace('localhost', '10.0.2.2')
    }
    return env
  }
  if (Platform.OS === 'android') return 'http://10.0.2.2:8040/api/v1'
  return 'http://localhost:8040/api/v1'
}

const DEFAULT_BASE_URL = getDefaultBaseUrl()

let currentBaseUrl = DEFAULT_BASE_URL

/** The base URL currently in use (runtime-configurable). */
export function getApiBaseUrl(): string {
  return currentBaseUrl
}

/** Repoint the API client. Called by the Connect screen once a server is chosen. */
export function setApiBaseUrl(url: string): void {
  currentBaseUrl = url
  // Keep the instance default in sync too: the offline outbox replay reads it
  // directly (it doesn't go through the request interceptor).
  api.defaults.baseURL = url
}

/**
 * Origin that serves the API's static assets (e.g. `/uploads/...`). Product and
 * category image URLs are stored relative, so the client resolves them against
 * this origin — the same approach the web client uses.
 */
export function getApiOrigin(): string {
  return currentBaseUrl.replace(/\/api\/v1\/?$/, '')
}

export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${getApiOrigin()}${url}`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthUser = {
  userId: string
  username: string
  fullName: string
  email: string | null
  role: string
  branchId: string | null
  profilePhoto: string | null
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export type RefreshResponse = {
  accessToken: string
  refreshToken: string
}

export type BranchInfo = {
  branch_id: string
  branch_name: string
  address: string | null
  city: string | null
  country: string | null
  phone: string | null
  email: string | null
  manager_id: string | null
  is_active: boolean
}

export type MyBranchesResponse = { branches: BranchInfo[] }

export type SelectBranchResponse = {
  accessToken: string
  refreshToken: string
  branch: BranchInfo
  user: AuthUser
}

export type UserProfile = {
  userId: string
  username: string
  fullName: string
  email: string | null
  phone: string | null
  profilePhoto: string | null
  role: string
  branchId: string | null
  branchName: string | null
  isActive: boolean
}

export type Product = {
  product_id: string
  sku: string
  barcode: string | null
  product_name: string
  description: string | null
  image_url: string | null
  primary_image_url?: string | null
  brand: string | null
  category_id: string | null
  base_uom_id: string
  cost_price: number
  retail_price: number
  /** Wholesale price + threshold; when `quantity >= wholesale_min_qty` the POS uses this price. */
  wholesale_uom_id: string | null
  wholesale_price: number | null
  wholesale_min_qty: number | null
  tax_rate: number
  discount_percentage: number
  minimum_stock: number
  maximum_stock?: number | null
  model?: string | null
  manufacturer?: string | null
  wholesale_conversion_factor?: number | null
  /** True when this product requires an expiry date on stock-in. */
  expiry_required?: boolean
  serial_number_required?: boolean
  track_inventory?: boolean
  is_active: boolean
}

/** Writable subset of `Product`, using the backend's snake_case field names. */
export type ProductInput = {
  sku: string
  product_name: string
  barcode?: string | null
  category_id?: string | null
  base_uom_id: string
  /**
   * Branch to open the product in. When supplied, `POST /products` also creates
   * the product's `product_branch_inventory` row (default quantity 0). A product
   * with no row for the acting branch is filtered out of the branch-scoped
   * product list and POS search, so callers should send the selected branch.
   */
  branch_id?: string | null
  cost_price?: number
  retail_price?: number
  wholesale_price?: number
  wholesale_uom_id?: string | null
  wholesale_min_qty?: number
  tax_rate?: number
  discount_percentage?: number
  minimum_stock?: number
  description?: string | null
  track_inventory?: boolean
  expiry_required?: boolean
  serial_number_required?: boolean
}

export type Category = {
  category_id: string
  category_name: string
  description: string | null
  parent_category_id: string | null
  image_url: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type UnitOfMeasure = {
  uom_id: string
  uom_name: string
  /** Alias the API also returns (`uom_name` duplicated as `name`). */
  name?: string
  description: string | null
  symbol: string | null
  conversion_factor: number | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type PriceHistoryEntry = {
  history_id: string
  product_id: string
  product_name: string | null
  image_url: string | null
  old_price: number | null
  new_price: number | null
  changed_by: string | null
  changed_by_name: string | null
  created_at: string
  price_type: string | null
  source: string | null
  reference_type: string | null
  reference_id: string | null
}

export type InventoryItem = {
  inventory_id: string
  product_id: string
  branch_id: string
  quantity_on_hand: number
  reorder_level: number
  available_quantity: number
  reorder_quantity: number
  sku: string
  product_name: string
  primary_image_url?: string | null
}

export type InventoryTransaction = {
  transaction_id: string
  product_id: string
  branch_id: string
  transaction_type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'
  quantity: number
  previous_quantity: number | null
  new_quantity: number | null
  unit_cost: number | null
  notes: string | null
  performed_by: string | null
  created_at: string
  product_name?: string
  sku?: string
}

export type CreateInventoryTransactionInput = {
  product_id: string
  branch_id: string
  /** Must be non-zero. */
  quantity: number
  type: 'in' | 'out' | 'adjustment'
  unit_cost?: number
  batch_number?: string
  /** ISO date, e.g. `YYYY-MM-DD`. Required by the API when stock-in adds a lot. */
  expiry_date?: string
  batch_id?: string
  notes?: string
  /** Optional idempotency key (used by the offline outbox, Milestone D). */
  client_mutation_id?: string
}

export type NotificationItem = {
  notification_id: string
  title: string | null
  message: string | null
  notification_type: string | null
  priority: string | null
  is_read: boolean
  created_at: string | null
}

// ---- Sales ----------------------------------------------------------------

export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CREDIT'

export type SaleItemInput = {
  product_id: string
  /** Must be greater than 0. */
  quantity: number
  /** 0 or greater. */
  unit_price: number
  uom_id?: string
  cost_price?: number
  line_discount?: number
  tax_amount?: number
  batch_number?: string
  expiry_date?: string
}

export type PaymentInput = {
  amount: number
  payment_method: PaymentMethod
  reference_number?: string
}

export type CreateSaleInput = {
  branch_id: string
  items: SaleItemInput[]
  payments: PaymentInput[]
  customer_id?: string
  customer_name?: string
  cashier_id?: string
  cashier_name?: string
  sale_type?: 'RETAIL' | 'WHOLESALE'
  /** Omit to let the server compute the total from the items. */
  discount_amount?: number
  tax_amount?: number
  remarks?: string
  device_id?: string
  /** Idempotency key — reuse across retries of the same cart. */
  local_transaction_id?: string
}

export type SaleItem = {
  sale_item_id: string
  product_id: string
  product_name?: string
  uom_id?: string | null
  /** Present on receipts fetched via `getSaleReceipt` (joined from uoms). */
  uom_name?: string | null
  /** Unit-of-measure symbol, e.g. "kg" (joined from uoms). */
  symbol?: string | null
  quantity: number
  unit_price: number
  line_discount: number
  line_total?: number
  cost_price?: number
  tax_amount: number
  batch_number?: string | null
  expiry_date?: string | null
}

export type SalePayment = {
  payment_id?: string
  payment_method: string
  amount: number
  reference_number?: string | null
  payment_status?: string | null
}

export type Sale = {
  sale_id: string
  branch_id: string
  customer_id: string | null
  cashier_id: string | null
  sale_type: string
  sale_date: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  status: string
  payment_status: string
  invoice_number: string | null
  cashier_name: string | null
  customer_name: string | null
  remarks: string | null
  device_id: string | null
  refunded_amount: number
  created_at: string
  updated_at: string
  items?: SaleItem[]
  payments?: SalePayment[]
}

export type ReceiptRecord = {
  receipt_id: string
  sale_id: string
  receipt_number: string
  printed_at: string | null
  printed_by: string | null
}

/** Unauthenticated storefront fields from `GET /business/public`. */
export type PublicBusinessSettings = {
  business_name?: string | null
  business_type?: string | null
  currency?: string | null
  business_email?: string | null
  phone?: string | null
  address?: string | null
  logo?: string | null
  website?: string | null
  receipt_footer?: string | null
  /** Included in `/business/public` — printed on receipts. */
  tax_number?: string | null
  registration_number?: string | null
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const api = create({
  baseURL: DEFAULT_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

setupOfflineSupport(api)

// ---------------------------------------------------------------------------
// Refresh-token logic with concurrent-request queue
// ---------------------------------------------------------------------------

let isRefreshing = false
let failedQueue: {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}[] = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((promise) => {
    if (error || !token) promise.reject(error)
    else promise.resolve(token)
  })
  failedQueue = []
}

async function redirectToLogin() {
  await clearTokens()
  try {
    router.replace('/login')
  } catch {
    // Navigation not ready yet — the root layout will handle routing on the
    // next render once auth state updates.
  }
}

// Request interceptor: attach device id + bearer token.
api.interceptors.request.use(async (config) => {
  // Re-read the base URL per request so switching servers takes effect without
  // recreating the client or reloading the app.
  config.baseURL = getApiBaseUrl()
  config.headers['X-Device-Id'] = await getDeviceId()
  const token = await getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor: refresh once on 401 and replay the request.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Never try to refresh the refresh call itself.
    if (originalRequest.url?.includes('/auth/refresh')) {
      await redirectToLogin()
      return Promise.reject(error)
    }

    // A 401 without a token just means "not logged in".
    if (!originalRequest.headers?.Authorization) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    const refreshToken = await getRefreshToken()
    if (!refreshToken) {
      isRefreshing = false
      await redirectToLogin()
      return Promise.reject(error)
    }

    try {
      const { data } = await axios.post<RefreshResponse>(
        `${getApiBaseUrl()}/auth/refresh`,
        { refreshToken },
      )
      await storeTokens(data.accessToken, data.refreshToken)
      processQueue(null, data.accessToken)
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      await redirectToLogin()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

// ===========================================================================
// API functions
// ===========================================================================

// ---- Auth -----------------------------------------------------------------

export async function login(usernameOrEmail: string, password: string) {
  const { data } = await api.post<LoginResponse>('/auth/login', {
    usernameOrEmail,
    password,
  })
  return data
}

export async function logout() {
  const { data } = await api.post('/auth/logout')
  return data
}

export async function forgotPassword(email: string) {
  const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email })
  return data
}

export async function resetPassword(token: string, password: string) {
  const { data } = await api.post<{ message: string }>('/auth/reset-password', { token, password })
  return data
}

export async function getMyBranches() {
  const { data } = await api.get<MyBranchesResponse>('/auth/my-branches')
  return data
}

export async function selectBranch(branchId: string) {
  const { data } = await api.post<SelectBranchResponse>('/auth/select-branch', { branchId })
  return data
}

export async function getMyPermissions() {
  const { data } = await api.get<{ permissions: string[] }>('/auth/me/permissions')
  return data
}

export async function getMyProfile() {
  const { data } = await api.get<UserProfile>('/auth/me')
  return data
}

// ---- MVP reads ------------------------------------------------------------

// ---------------------------------------------------------------------------
// Offline-aware reads
//
// Every read tries the network first; on an unreachable backend it serves the
// local mirror (kept warm by `/sync/<entity>/pull` and by these very reads) so
// list/lookup screens keep working offline. Online answers always win and
// refresh the mirror (server-authoritative).
// ---------------------------------------------------------------------------

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function flag(v: unknown): boolean {
  return v === true || v === 'true'
}

function filterProducts(rows: Record<string, unknown>[], body: Record<string, unknown>) {
  const q = str(body.q).trim().toLowerCase()
  const includeInactive = flag(body.includeInactive)
  const page = Math.max(1, num(body.page) || 1)
  const limit = Math.max(1, num(body.limit) || 25)
  let list = rows as unknown as Product[]
  if (!includeInactive) list = list.filter((p) => p.is_active !== false)
  if (q) {
    list = list.filter((p) =>
      `${p.product_name ?? ''} ${p.sku ?? ''} ${p.barcode ?? ''} ${p.description ?? ''}`
        .toLowerCase()
        .includes(q),
    )
  }
  list = list.slice().sort((a, b) => str(a.product_name).localeCompare(str(b.product_name)))
  const total = list.length
  const start = (page - 1) * limit
  return { products: list.slice(start, start + limit), total }
}

function filterCategories(rows: Record<string, unknown>[], params: Record<string, unknown>) {
  const q = str(params.q).trim().toLowerCase()
  const includeInactive = flag(params.includeInactive)
  const limit = Math.max(1, num(params.limit) || 200)
  let list = rows as unknown as Category[]
  if (!includeInactive) list = list.filter((c) => c.is_active !== false)
  if (q) {
    list = list.filter((c) =>
      `${c.category_name ?? ''} ${c.description ?? ''}`.toLowerCase().includes(q),
    )
  }
  list = list.slice().sort((a, b) => str(a.category_name).localeCompare(str(b.category_name)))
  return { categories: list.slice(0, limit), total: list.length }
}

function filterUoms(rows: Record<string, unknown>[], params: Record<string, unknown>) {
  const q = str(params.q).trim().toLowerCase()
  const activeOnly = flag(params.isActive)
  const limit = Math.max(1, num(params.limit) || 200)
  let list = rows.map((r) => ({
    ...(r as unknown as UnitOfMeasure),
    name: (r.uom_name as string | undefined) ?? (r.name as string | undefined),
  }))
  if (activeOnly) list = list.filter((u) => u.is_active !== false)
  if (q) list = list.filter((u) => `${u.uom_name ?? ''} ${u.symbol ?? ''}`.toLowerCase().includes(q))
  list = list.slice().sort((a, b) => str(a.uom_name).localeCompare(str(b.uom_name)))
  return { data: list.slice(0, limit), total: list.length }
}

function mapInventoryRow(
  row: Record<string, unknown>,
  products: Map<string, Record<string, unknown>>,
): InventoryItem {
  const p = products.get(str(row.product_id))
  return {
    inventory_id: str(row.inventory_id),
    product_id: str(row.product_id),
    branch_id: str(row.branch_id),
    quantity_on_hand: num(row.quantity_on_hand),
    reorder_level: num(row.reorder_level),
    available_quantity:
      row.available_quantity != null ? num(row.available_quantity) : num(row.quantity_on_hand),
    reorder_quantity: num(row.reorder_quantity),
    sku: str(row.sku ?? p?.sku),
    product_name: str(row.product_name ?? p?.product_name),
    primary_image_url:
      (row.primary_image_url as string | null | undefined) ??
      (p?.primary_image_url as string | null | undefined) ??
      null,
  }
}

function filterInventory(items: InventoryItem[], body: Record<string, unknown>) {
  const q = str(body.q).trim().toLowerCase()
  const productId = str(body.productId ?? body.product_id)
  const branchId = str(body.branchId ?? body.branch_id)
  const limit = Math.max(1, num(body.limit) || 50)
  let list = items
  if (productId) list = list.filter((i) => i.product_id === productId)
  if (branchId) list = list.filter((i) => i.branch_id === branchId)
  if (q) {
    list = list.filter((i) =>
      `${i.product_name ?? ''} ${i.sku ?? ''}`.toLowerCase().includes(q),
    )
  }
  return { data: list.slice(0, limit), total: list.length }
}

/** Project a locally-stored (offline) sale into the `Sale` shape the UI uses. */
function toSaleFromOffline(o: OfflineSale): Sale {
  const sale = {
    sale_id: o.server_sale_id ?? o.local_transaction_id,
    branch_id: o.branch_id ?? '',
    customer_id: null,
    cashier_id: null,
    sale_type: 'RETAIL',
    sale_date: o.created_at,
    subtotal: o.subtotal,
    discount_amount: o.discount_amount,
    tax_amount: o.tax_amount,
    total_amount: o.total_amount,
    amount_paid: o.amount_paid,
    balance_due: o.balance_due,
    status: o.status === 'failed' ? 'FAILED' : 'COMPLETED',
    payment_status: o.balance_due > 0 ? 'PARTIAL' : 'PAID',
    invoice_number: o.invoice_number,
    cashier_name: o.cashier_name,
    customer_name: o.customer_name,
    remarks: null,
    device_id: null,
    refunded_amount: 0,
    created_at: o.created_at,
    updated_at: o.created_at,
    items: Array.isArray(o.items) ? o.items : [],
    payments: Array.isArray(o.payments) ? o.payments : [],
  } as unknown as Sale
  const meta = sale as Record<string, unknown>
  meta.__offline = o.status !== 'synced'
  meta.__offline_status = o.status
  meta.__local_transaction_id = o.local_transaction_id
  meta.__server_sale_id = o.server_sale_id ?? null
  return sale
}

function matchesSaleFilters(s: Sale, params: Record<string, unknown>): boolean {
  const branchId = str(params.branchId ?? params.branch_id)
  if (branchId && s.branch_id && s.branch_id !== branchId) return false
  const status = str(params.status)
  if (status && s.status !== status) return false
  const q = str(params.q).trim().toLowerCase()
  if (q) {
    const hay = `${s.invoice_number ?? ''} ${s.customer_name ?? ''} ${s.cashier_name ?? ''}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  return true
}

export async function searchProducts(body: Record<string, unknown> = {}) {
  try {
    const { data } = await api.post<{ products: Product[]; total: number }>(
      '/products/search',
      body,
    )
    void mergeEntityRows('products', data.products ?? [], 'product_id').catch(() => {})
    return data
  } catch (err) {
    if (!isBackendUnreachable(err as AxiosError)) throw err
    const rows = await readMirrorWithPending('products')
    return filterProducts(rows, body)
  }
}

export async function getInventory(body: Record<string, unknown> = {}) {
  try {
    const { data } = await api.post<{ data: InventoryItem[]; total: number }>(
      '/inventories/search',
      body,
    )
    void mergeEntityRows('inventories', data.data ?? [], 'inventory_id').catch(() => {})
    return data
  } catch (err) {
    if (!isBackendUnreachable(err as AxiosError)) throw err
    const [inv, products] = await Promise.all([
      readMirrorWithPending('inventories'),
      readMirrorWithPending('products'),
    ])
    const byId = new Map(products.map((p) => [str(p.product_id), p]))
    const items = inv.map((row) => mapInventoryRow(row, byId))
    return filterInventory(items, body)
  }
}

// ---- Catalog (products CRUD, categories, UoM, price history) --------------

export async function getProductById(productId: string) {
  try {
    const { data } = await api.get<{ product: Product }>(`/products/${productId}`)
    if (data.product) void mergeEntityRows('products', [data.product], 'product_id').catch(() => {})
    return data.product
  } catch (err) {
    if (!isBackendUnreachable(err as AxiosError)) throw err
    const found = (await readMirrorWithPending('products')).find(
      (p) => str(p.product_id) === productId,
    )
    if (found) return found as unknown as Product
    throw err
  }
}

/**
 * Create a product.
 *
 * `product.repository.createProduct` reads four fields under camelCase names
 * (`categoryId`, `wholesaleUomId`, `wholesaleMinQty`, `supplierId`); every
 * other field is snake_case. We send both spellings so the value is persisted.
 */
export async function createProduct(body: ProductInput) {
  const payload: Record<string, unknown> = { ...body }
  if (body.category_id !== undefined) payload.categoryId = body.category_id
  if (body.wholesale_uom_id !== undefined) payload.wholesaleUomId = body.wholesale_uom_id
  if (body.wholesale_min_qty !== undefined) payload.wholesaleMinQty = body.wholesale_min_qty
  const { data } = await api.post<{ product: Product }>('/products', payload)
  return data.product
}

export async function updateProduct(id: string, body: Partial<ProductInput>) {
  const payload: Record<string, unknown> = { ...body }
  if (body.category_id !== undefined) payload.categoryId = body.category_id
  if (body.wholesale_uom_id !== undefined) payload.wholesaleUomId = body.wholesale_uom_id
  if (body.wholesale_min_qty !== undefined) payload.wholesaleMinQty = body.wholesale_min_qty
  const { data } = await api.patch<{ product: Product }>(`/products/${id}`, payload)
  return data.product
}

export async function deactivateProduct(id: string) {
  const { data } = await api.post<{ product: Product }>(`/products/${id}/deactivate`)
  return data.product
}

export async function reactivateProduct(id: string) {
  const { data } = await api.post<{ product: Product }>(`/products/${id}/reactivate`)
  return data.product
}

// ---- Product images -------------------------------------------------------

export type ProductImage = {
  image_id: string
  product_id: string
  image_url: string
  is_primary: boolean
  created_at: string
}

/** A locally-picked file ready to upload (expo-image-picker asset shape). */
export type UploadableImage = {
  uri: string
  name: string
  type: string
}

export async function getProductImages(productId: string) {
  const { data } = await api.get<{ images: ProductImage[] }>(`/products/${productId}/images`)
  return data.images
}

export async function uploadProductImage(
  productId: string,
  file: UploadableImage,
  isPrimary?: boolean,
) {
  const form = new FormData()
  // React Native's FormData accepts a `{ uri, name, type }` file descriptor.
  form.append('image', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob)
  if (isPrimary != null) form.append('is_primary', String(isPrimary))
  const { data } = await api.post<{ image: ProductImage }>(`/products/${productId}/images`, form, {
    // Override the instance's default JSON content-type for the multipart body.
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.image
}

export async function setProductImagePrimary(imageId: string) {
  const { data } = await api.patch<{ image: ProductImage }>(`/product-images/${imageId}/primary`)
  return data.image
}

export async function deleteProductImage(imageId: string) {
  const { data } = await api.delete<{ image: ProductImage }>(`/product-images/${imageId}`)
  return data.image
}

// ---- Categories -----------------------------------------------------------

export async function getCategories(params: Record<string, unknown> = {}) {
  try {
    const { data } = await api.post<{ categories: Category[]; total: number }>(
      '/categories/search',
      params,
    )
    void mergeEntityRows('categories', data.categories ?? [], 'category_id').catch(() => {})
    return data
  } catch (err) {
    if (!isBackendUnreachable(err as AxiosError)) throw err
    const rows = await readMirrorWithPending('categories')
    return filterCategories(rows, params)
  }
}

export async function createCategory(body: {
  category_name: string
  description?: string
  parent_id?: string
}) {
  const { data } = await api.post<{ category: Category }>('/categories', body)
  return data.category
}

export async function updateCategory(
  id: string,
  body: { category_name?: string; description?: string; parent_id?: string },
) {
  const { data } = await api.patch<{ category: Category }>(`/categories/${id}`, body)
  return data.category
}

export async function deactivateCategory(id: string) {
  const { data } = await api.post<{ category: Category }>(`/categories/${id}/deactivate`)
  return data.category
}

export async function activateCategory(id: string) {
  const { data } = await api.post<{ category: Category }>(`/categories/${id}/activate`)
  return data.category
}

// ---- Units of measure -----------------------------------------------------

export async function getUnitsOfMeasure(params: Record<string, unknown> = {}) {
  try {
    const { data } = await api.get<{ data: UnitOfMeasure[]; total: number }>('/units-of-measure', {
      params,
    })
    void mergeEntityRows('units-of-measure', data.data ?? [], 'uom_id').catch(() => {})
    return data
  } catch (err) {
    if (!isBackendUnreachable(err as AxiosError)) throw err
    const rows = await readMirrorWithPending('units-of-measure')
    return filterUoms(rows, params)
  }
}

export async function createUnitOfMeasure(body: {
  name: string
  symbol?: string | null
  description?: string | null
  conversion_factor?: number
}) {
  const { data } = await api.post<{ data: UnitOfMeasure }>('/units-of-measure', body)
  return data.data
}

export async function updateUnitOfMeasure(
  id: string,
  body: {
    name?: string
    symbol?: string | null
    description?: string | null
    conversion_factor?: number
  },
) {
  const { data } = await api.put<{ data: UnitOfMeasure }>(`/units-of-measure/${id}`, body)
  return data.data
}

export async function deactivateUnitOfMeasure(id: string) {
  const { data } = await api.post<{ data: UnitOfMeasure }>(`/units-of-measure/${id}/deactivate`)
  return data.data
}

export async function activateUnitOfMeasure(id: string) {
  const { data } = await api.post<{ data: UnitOfMeasure }>(`/units-of-measure/${id}/activate`)
  return data.data
}

export async function deleteUnitOfMeasure(id: string) {
  const { data } = await api.delete<{ data: UnitOfMeasure }>(`/units-of-measure/${id}`)
  return data.data
}

// ---- Price history --------------------------------------------------------

export async function getPriceHistory(params: Record<string, unknown> = {}) {
  const { data } = await api.get<{ data: PriceHistoryEntry[] }>('/price-history', { params })
  return data.data
}

// ---- Inventory transactions (stock in / out) ------------------------------

export async function createInventoryTransaction(body: CreateInventoryTransactionInput) {
  const { data } = await api.post<{ data: InventoryTransaction }>('/inventory/transactions', body)
  return data.data
}

export async function getInventoryTransactions(params: Record<string, unknown> = {}) {
  const { data } = await api.get<{ data: InventoryTransaction[] }>('/inventory/transactions', {
    params,
  })
  return data
}

export async function getLowStock(branchId?: string) {
  const params: Record<string, string> = {}
  if (branchId) params.branchId = branchId
  const { data } = await api.get<{ data: InventoryItem[] }>('/reports/low-stock', { params })
  return data.data
}

// ---- Dashboard metrics ----------------------------------------------------

/** Sales + transaction count for a single calendar day (`YYYY-MM-DD`). */
export async function getDailySales(date: string, branchId?: string) {
  const params: Record<string, string> = { date }
  if (branchId) params.branchId = branchId
  const { data } = await api.get<{
    data: { date?: string; transactions?: number | string; total_sales?: number | string }
  }>('/reports/daily-sales', { params })
  const row = data.data
  return {
    date: row?.date ?? date,
    transactions: Number(row?.transactions ?? 0),
    total_sales: Number(row?.total_sales ?? 0),
  }
}

/** Total sales for a whole calendar month (sums the per-day rows). */
export async function getMonthSalesTotal(year: number, month: number, branchId?: string) {
  const params: Record<string, string | number> = { year, month }
  if (branchId) params.branchId = branchId
  const { data } = await api.get<{ data: { total_sales: number }[] }>('/reports/monthly-sales', {
    params,
  })
  return (data.data ?? []).reduce((sum, r) => sum + Number(r.total_sales || 0), 0)
}

/** Total sales for a whole calendar year (sums the per-year rows). */
export async function getYearSalesTotal(year: number, branchId?: string) {
  const params: Record<string, string | number> = { year }
  if (branchId) params.branchId = branchId
  const { data } = await api.get<{ data: { total_sales: number }[] }>('/reports/annual-sales', {
    params,
  })
  return (data.data ?? []).reduce((sum, r) => sum + Number(r.total_sales || 0), 0)
}

/** Total sales between two inclusive dates (used for the current week). */
export async function getSalesRangeTotal(startDate: string, endDate: string, branchId?: string) {
  const params: Record<string, string> = { startDate, endDate, granularity: 'day' }
  if (branchId) params.branchId = branchId
  const { data } = await api.get<{
    data: { totals: { revenue: number | string; orders: number; profit: number } }
  }>('/reports/sales-trend', { params })
  return Number(data.data?.totals?.revenue ?? 0)
}

/** Profit between two inclusive dates (used for month-to-date). */
export async function getProfitRangeTotal(startDate: string, endDate: string, branchId?: string) {
  const params: Record<string, string> = { startDate, endDate }
  if (branchId) params.branchId = branchId
  const { data } = await api.get<{ data: { profit: number | string } }>('/reports/profit', {
    params,
  })
  return Number(data.data?.profit ?? 0)
}

/** Number of products (SKUs) in the catalogue for the branch. */
export async function getProductCount(branchId?: string) {
  const { data } = await api.post<{ total: number | string }>('/products/search', {
    limit: 1,
    ...(branchId ? { branchId } : {}),
  })
  return Number(data?.total ?? 0)
}

export async function getMyNotifications(params?: Record<string, unknown>) {
  const { data } = await api.get<{ data: NotificationItem[] }>('/notifications/me', { params })
  return data
}

// ---- Sales (point of sale) ------------------------------------------------

export async function createSale(body: CreateSaleInput) {
  const { data } = await api.post<{ data: Sale }>('/sales', body)
  return data.data
}

export async function getSales(params: Record<string, unknown> = {}) {
  const page = Math.max(1, num(params.page) || 1)
  const limit = Math.max(1, num(params.limit) || 25)

  let serverData: Sale[] = []
  let serverTotal = 0
  let offline = false
  try {
    const { data } = await api.get<{ data: Sale[]; total: number }>('/sales', { params })
    serverData = data.data ?? []
    serverTotal = data.total ?? 0
    void mergeEntityRows('sales', serverData, 'sale_id').catch(() => {})
  } catch (err) {
    if (!isBackendUnreachable(err as AxiosError)) throw err
    offline = true
    const all = (await readMirrorWithPending('sales'))
      .map((r) => r as unknown as Sale)
      .filter((s) => matchesSaleFilters(s, params))
      .sort((a, b) => str(b.sale_date).localeCompare(str(a.sale_date)))
    const start = (page - 1) * limit
    serverData = all.slice(start, start + limit)
    serverTotal = all.length
  }

  // Local (not-yet-synced) sales ride on page 1 so they are visible immediately;
  // dedupe against anything the server already returned.
  if (page === 1) {
    const seen = new Set(serverData.map((s) => s.sale_id))
    const extras = (await offlineSalesAll())
      .filter((o) => o.status !== 'synced')
      .map(toSaleFromOffline)
      .filter((s) => matchesSaleFilters(s, params))
      .filter((s) => {
        const sid = (s as Record<string, unknown>).__server_sale_id as string | null
        return !seen.has(s.sale_id) && !(sid && seen.has(sid))
      })
    if (extras.length) {
      return { data: [...extras, ...serverData], total: serverTotal + extras.length, offline }
    }
  }
  return { data: serverData, total: serverTotal, offline }
}

export async function getSaleById(saleId: string) {
  // A sale captured offline has no server id yet: serve it from the local store.
  const local = (await offlineSalesAll()).find(
    (o) => o.local_transaction_id === saleId || o.server_sale_id === saleId,
  )
  if (local && !local.server_sale_id) return toSaleFromOffline(local)

  try {
    const { data } = await api.get<{ data: Sale }>(`/sales/${saleId}`)
    return data.data
  } catch (err) {
    if (!isBackendUnreachable(err as AxiosError)) throw err
    const found = (await readMirrorWithPending('sales')).find((s) => str(s.sale_id) === saleId)
    if (found) return found as unknown as Sale
    throw err
  }
}

export async function getSaleReceipt(saleId: string) {
  const local = (await offlineSalesAll()).find(
    (o) => o.local_transaction_id === saleId || o.server_sale_id === saleId,
  )
  if (local && !local.server_sale_id) {
    // Synthesize a receipt-shaped payload so the detail screen renders offline.
    return {
      receipt: {
        receipt_id: local.local_transaction_id,
        sale_id: local.local_transaction_id,
        receipt_number: local.invoice_number,
        printed_at: null,
        printed_by: null,
      } as ReceiptRecord,
      sale: toSaleFromOffline(local),
    }
  }
  const { data } = await api.get<{ data: { receipt: ReceiptRecord; sale: Sale } }>(
    `/sales/${saleId}/receipt`,
  )
  return data.data
}

export async function voidSale(saleId: string) {
  const { data } = await api.post<{ data: Sale }>(`/sales/${saleId}/void`)
  return data.data
}

export async function refundSale(saleId: string, body: { amount?: number; reason?: string } = {}) {
  const { data } = await api.post<{ data: Sale }>(`/sales/${saleId}/refund`, body)
  return data.data
}

// ---- Business (public, display-only) --------------------------------------

/**
 * Storefront branding/settings (business name, currency, …). Unauthenticated —
 * used only for display. The management page stays web/desktop-only.
 */
export async function getPublicBusinessSettings() {
  const { data } = await api.get<{ data: PublicBusinessSettings | null }>('/business/public')
  return data.data ?? null
}

export async function healthCheck() {
  const { data } = await api.get('/health')
  return data as { success: boolean; message: string }
}

export default api
