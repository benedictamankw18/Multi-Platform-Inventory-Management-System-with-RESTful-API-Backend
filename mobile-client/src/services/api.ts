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

import axios, { create, isAxiosError } from 'axios'
import { router } from 'expo-router'
import {
  clearTokens,
  getAccessToken,
  getDeviceId,
  getRefreshToken,
  storeTokens,
} from './secureTokens'

export { isAxiosError }

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

import { Platform } from 'react-native'

const getBaseUrl = () => {
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

export const API_BASE_URL = getBaseUrl()

/**
 * Origin that serves the API's static assets (e.g. `/uploads/...`). Product and
 * category image URLs are stored relative, so the client resolves them against
 * this origin — the same approach the web client uses.
 */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '')

export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url}`
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
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

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
        `${API_BASE_URL}/auth/refresh`,
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

export async function searchProducts(body: Record<string, unknown> = {}) {
  const { data } = await api.post<{ products: Product[]; total: number }>('/products/search', body)
  return data
}

export async function getInventory(body: Record<string, unknown> = {}) {
  const { data } = await api.post<{ data: InventoryItem[]; total: number }>(
    '/inventories/search',
    body,
  )
  return data
}

// ---- Catalog (products CRUD, categories, UoM, price history) --------------

export async function getProductById(productId: string) {
  const { data } = await api.get<{ product: Product }>(`/products/${productId}`)
  return data.product
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
  const { data } = await api.post<{ categories: Category[]; total: number }>(
    '/categories/search',
    params,
  )
  return data
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
  const { data } = await api.get<{ data: UnitOfMeasure[]; total: number }>('/units-of-measure', {
    params,
  })
  return data
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
  const { data } = await api.get<{ data: Sale[]; total: number }>('/sales', { params })
  return data
}

export async function getSaleById(saleId: string) {
  const { data } = await api.get<{ data: Sale }>(`/sales/${saleId}`)
  return data.data
}

/**
 * Sale detail **with payments**. The receipt endpoint is the only read that
 * exposes the payment rows (web uses it the same way); it returns the existing
 * receipt or creates one on first access.
 */
export async function getSaleReceipt(saleId: string) {
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
