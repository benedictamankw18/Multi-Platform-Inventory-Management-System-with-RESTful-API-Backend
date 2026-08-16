import axios from 'axios'
import { setupOfflineSupport } from './offline'

export const isAxiosError = axios.isAxiosError

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

export type ApiError = {
  message: string
  details?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export function resolveImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
  const origin = base.startsWith('http') ? base.replace(/\/api\/v1\/?$/, '') : window.location.origin
  return `${origin}${url}`
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

function getAccessToken(): string | null {
  return localStorage.getItem('accessToken')
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken')
}

function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('authUser')
}

// ---------------------------------------------------------------------------
// Device identity: a persistent UUID identifying this install. Sent on every
// request as X-Device-Id so the backend can attribute rate-limit counters to
// (user, device, login, session) instead of the shared IP.
// ---------------------------------------------------------------------------

export function getDeviceId(): string {
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

// ---------------------------------------------------------------------------
// Refresh-token logic with concurrent-request queue
// ---------------------------------------------------------------------------

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((promise) => {
    if (error || !token) {
      promise.reject(error)
    } else {
      promise.resolve(token)
    }
  })
  failedQueue = []
}

function redirectToLogin() {
  clearTokens()
  // Guard against redirect loops: if we're already on the login screen, do nothing.
  const current = window.location.hash.replace(/^#/, '') || '/'
  if (current === '/login') return
  // HashRouter-compatible navigation (works in dev and packaged file://)
  window.location.hash = '#/login'
}

// ---------------------------------------------------------------------------
// Request interceptor: attach access token
// ---------------------------------------------------------------------------

api.interceptors.request.use((config) => {
  config.headers['X-Device-Id'] = getDeviceId()
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---------------------------------------------------------------------------
// Response interceptor: handle 401 with token refresh
// ---------------------------------------------------------------------------

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only attempt refresh once per request and only on 401
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Don't try to refresh if this IS the refresh endpoint
    if (originalRequest.url?.includes('/auth/refresh')) {
      redirectToLogin()
      return Promise.reject(error)
    }

    // A 401 on a request that never carried a token just means "not logged in".
    // Reject without refresh or redirect, otherwise anonymous requests (e.g.
    // the splash screen or offline sync pulls on the login page) reload the
    // whole app in an infinite loop.
    if (!originalRequest.headers?.Authorization) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue this request until the refresh completes
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      isRefreshing = false
      redirectToLogin()
      return Promise.reject(error)
    }

    try {
      // Use a raw axios call (not the instance) to avoid interceptor loops
      const { data } = await axios.post<RefreshResponse>(
        `${api.defaults.baseURL}/auth/refresh`,
        { refreshToken },
      )

      storeTokens(data.accessToken, data.refreshToken)
      processQueue(null, data.accessToken)

      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      redirectToLogin()
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
  try {
    await api.post('/auth/logout')
  } finally {
    clearTokens()
  }
}

export async function logoutAll() {
  try {
    await api.post('/auth/logout-all')
  } finally {
    clearTokens()
  }
}

export async function forgotPassword(email: string) {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data as { message: string }
}

export async function resetPassword(token: string, password: string) {
  const { data } = await api.post('/auth/reset-password', { token, password })
  return data as { message: string }
}

// ---- Branch selection after login -------------------------------------------

export type BranchInfo = {
  branch_id: string
  branch_name: string
  address: string | null
  city: string | null
  country: string | null
  phone: string | null
  email: string | null
  manager_id: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type MyBranchesResponse = {
  branches: BranchInfo[]
}

export type SelectBranchResponse = {
  accessToken: string
  refreshToken: string
  branch: BranchInfo
  user: AuthUser
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

// ---- Profile (self-service) ------------------------------------------------

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
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export async function getMyProfile() {
  const { data } = await api.get<UserProfile>('/auth/me')
  return data
}

export async function updateMyProfile(body: { fullName?: string; email?: string; phone?: string | null; profilePhoto?: string | null }) {
  const { data } = await api.patch<UserProfile>('/auth/me/profile', body)
  return data
}

export async function changeMyPassword(body: { currentPassword: string; newPassword: string }) {
  const { data } = await api.post<{ message: string }>('/auth/me/change-password', body)
  return data
}

export async function uploadProfilePhoto(file: File) {
  const formData = new FormData()
  formData.append('image', file)
  const { data } = await api.post<UserProfile>('/auth/me/profile-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ---- Users ----------------------------------------------------------------

export async function getUsers(params?: Record<string, unknown>) {
  const { data } = await api.get('/users', { params })
  return data
}

export async function getUserById(id: string) {
  const { data } = await api.get(`/users/${id}`)
  return data
}

export async function createUser(body: Record<string, unknown>) {
  const { data } = await api.post('/users', body)
  return data
}

export async function updateUser(id: string, body: Record<string, unknown>) {
  const { data } = await api.put(`/users/${id}`, body)
  return data
}

export async function deleteUser(id: string) {
  const { data } = await api.delete(`/users/${id}`)
  return data
}

export async function activateUser(id: string) {
  const { data } = await api.patch(`/users/${id}/reactivate`)
  return data
}

export async function deactivateUser(id: string) {
  const { data } = await api.patch(`/users/${id}/deactivate`)
  return data
}

// ---- User Branches (multi-branch assignment) -------------------------------

export async function getUserBranches(userId: string) {
  const { data } = await api.get(`/users/${userId}/branches`)
  return data
}

export async function assignUserBranch(userId: string, branchId: string) {
  const { data } = await api.post('/user-branches', { user_id: userId, branch_id: branchId })
  return data
}

export async function removeUserBranch(userId: string, branchId: string) {
  const { data } = await api.delete(`/user-branches/${userId}/${branchId}`)
  return data
}

// ---- Roles ----------------------------------------------------------------

export async function getRoles(params?: Record<string, unknown>) {
  const { data } = await api.get('/roles', { params })
  return data
}

export async function getRoleById(id: string) {
  const { data } = await api.get(`/roles/${id}`)
  return data
}

export async function getRolesDropdown() {
  const { data } = await api.get('/roles/dropdown')
  return data
}

export async function getRoleStatistics() {
  const { data } = await api.get('/roles/statistics')
  return data
}

export async function getRoleSummary(id: string) {
  const { data } = await api.get(`/roles/${id}/summary`)
  return data
}

export async function canDeleteRole(id: string) {
  const { data } = await api.get(`/roles/${id}/can-delete`)
  return data
}

export async function createRole(body: Record<string, unknown>) {
  const { data } = await api.post('/roles', body)
  return data
}

export async function updateRole(id: string, body: Record<string, unknown>) {
  const { data } = await api.put(`/roles/${id}`, body)
  return data
}

export async function deleteRole(id: string) {
  const { data } = await api.delete(`/roles/${id}`)
  return data
}

export async function getRolePermissions(roleId: string) {
  const { data } = await api.get(`/roles/${roleId}/permissions`)
  return data
}

export async function replaceRolePermissions(roleId: string, permissionIds: string[]) {
  const { data } = await api.put(`/roles/${roleId}/permissions`, { permissionIds })
  return data
}

export async function assignRolePermission(roleId: string, permissionId: string) {
  const { data } = await api.post(`/roles/${roleId}/permissions`, { permissionId })
  return data
}

export async function removeRolePermission(roleId: string, permissionId: string) {
  const { data } = await api.delete(`/roles/${roleId}/permissions/${permissionId}`)
  return data
}

export async function getRoleUsers(roleId: string) {
  const { data } = await api.get(`/roles/${roleId}/users`)
  return data
}

// ---- Permissions -----------------------------------------------------------

export async function getPermissions(params?: Record<string, unknown>) {
  const { data } = await api.get('/permissions', { params })
  return data
}

export async function createPermission(body: Record<string, unknown>) {
  const { data } = await api.post('/permissions', body)
  return data
}

export async function updatePermission(id: string, body: Record<string, unknown>) {
  const { data } = await api.put(`/permissions/${id}`, body)
  return data
}

export async function deletePermission(id: string) {
  const { data } = await api.delete(`/permissions/${id}`)
  return data
}

export async function getRolesUsingPermission(id: string) {
  const { data } = await api.get(`/permissions/${id}/roles`)
  return data
}

export async function canDeletePermission(id: string) {
  const { data } = await api.get(`/permissions/${id}/can-delete`)
  return data
}

// ---- Products --------------------------------------------------------------

export type Product = {
  product_id: string
  sku: string
  barcode: string | null
  product_name: string
  description: string | null
  image_url: string | null
  primary_image_url?: string | null
  brand: string | null
  model: string | null
  manufacturer: string | null
  category_id: string | null
  supplier_id: string | null
  base_uom_id: string
  cost_price: number
  retail_price: number
  wholesale_uom_id: string | null
  wholesale_conversion_factor: number | null
  wholesale_price: number | null
  wholesale_min_qty: number | null
  weight: number | null
  length: number | null
  width: number | null
  height: number | null
  tax_rate: number
  discount_percentage: number
  minimum_stock: number
  maximum_stock: number | null
  serial_number_required: boolean
  expiry_required: boolean
  track_inventory: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function searchProducts(body?: Record<string, unknown>) {
  const { data } = await api.post<{ products: Product[]; total: number }>('/products/search', body ?? {})
  return data
}

export async function viewProduct(id: string) {
  const { data } = await api.get<{ product: Product }>(`/products/${id}`)
  return data.product
}

export async function viewProductImages(productId: string) {
  const { data } = await api.get<{ images: ProductImage[] }>(`/products/${productId}/images`)
  return data.images
}

export async function createProduct(body: Record<string, unknown>) {
  const { data } = await api.post<{ product: Product }>('/products', body)
  return data.product
}

export async function updateProduct(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch<{ product: Product }>(`/products/${id}`, body)
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

// ---- Product Images ---------------------------------------------------------

export type ProductImage = {
  image_id: string
  product_id: string
  image_url: string
  is_primary: boolean
  created_at: string
}

export async function getProductImages(productId: string) {
  const { data } = await api.get<{ images: ProductImage[] }>(`/products/${productId}/images`)
  return data.images
}

export async function uploadProductImage(productId: string, file: File, isPrimary?: boolean) {
  const form = new FormData()
  form.append('image', file)
  if (isPrimary != null) form.append('is_primary', String(isPrimary))
  const { data } = await api.post<{ image: ProductImage }>(`/products/${productId}/images`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.image
}

export async function deleteProductImage(imageId: string) {
  const { data } = await api.delete<{ image: ProductImage }>(`/product-images/${imageId}`)
  return data.image
}

export async function setProductImagePrimary(imageId: string) {
  const { data } = await api.patch<{ image: ProductImage }>(`/product-images/${imageId}/primary`)
  return data.image
}

// ---- Categories ------------------------------------------------------------
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

export async function getCategories(params?: Record<string, unknown>) {
  const { data } = await api.post('/categories/search', params ?? {})
  return data
}

export async function createCategory(body: Record<string, unknown>) {
  const { data } = await api.post('/categories', body)
  return data
}

export async function updateCategory(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/categories/${id}`, body)
  return data
}

export async function deleteCategory(id: string) {
  const { data } = await api.post(`/categories/${id}/deactivate`)
  return data
}

export async function activateCategory(id: string) {
  const { data } = await api.post(`/categories/${id}/activate`)
  return data
}

export async function uploadCategoryImage(categoryId: string, file: File) {
  const form = new FormData()
  form.append('image', file)
  const { data } = await api.post<{ category: Category; imageUrl: string }>(`/categories/${categoryId}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ---- Units of Measure ------------------------------------------------------
export type UnitOfMeasure = {
  uom_id: string
  uom_name: string
  abbreviation: string
  is_active: boolean
}

export async function getUnitsOfMeasure() {
  const { data } = await api.get('/units-of-measure')
  return data
}

export async function createUnitOfMeasure(body: Record<string, unknown>) {
  const { data } = await api.post('/units-of-measure', body)
  return data
}

export async function updateUnitOfMeasure(id: string, body: Record<string, unknown>) {
  const { data } = await api.put(`/units-of-measure/${id}`, body)
  return data
}

export async function deleteUnitOfMeasure(id: string) {
  const { data } = await api.delete(`/units-of-measure/${id}`)
  return data
}

// ---- Suppliers -------------------------------------------------------------

export type Supplier = {
  supplier_id: string
  supplier_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  is_active: boolean
  company_registration_no: string | null
  tax_number: string | null
  website: string | null
  bank_name: string | null
  account_name: string | null
  account_number: string | null
  payment_terms: string | null
  created_at: string
  updated_at: string
}

export async function getSuppliers(params?: Record<string, unknown>) {
  const { data } = await api.post('/suppliers/search', params ?? {})
  return data
}

export async function getSupplierById(id: string) {
  const { data } = await api.get(`/suppliers/${id}`)
  return data
}

export async function createSupplier(body: Record<string, unknown>) {
  const { data } = await api.post('/suppliers', body)
  return data
}

export async function updateSupplier(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/suppliers/${id}`, body)
  return data
}

export async function deleteSupplier(id: string) {
  const { data } = await api.post(`/suppliers/${id}/deactivate`)
  return data
}

export async function activateSupplier(id: string) {
  const { data } = await api.post(`/suppliers/${id}/reactivate`)
  return data
}

export async function getSupplierPayments(id: string) {
  const { data } = await api.get(`/suppliers/${id}/payments`)
  return data
}

// ---- Customers -------------------------------------------------------------

export type Customer = {
  customer_id: string
  customer_type: 'WALK_IN' | 'RETAIL' | 'WHOLESALE'
  business_name: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  credit_limit: number
  is_active: boolean
  loyalty_points: number
  tax_number: string | null
  date_of_birth: string | null
  gender: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export async function getCustomers(params?: Record<string, unknown>) {
  const { data } = await api.post('/customers/search', params ?? {})
  return data
}

export async function getCustomerById(id: string) {
  const { data } = await api.get(`/customers/${id}`)
  return data
}

export async function createCustomer(body: Record<string, unknown>) {
  const { data } = await api.post('/customers', body)
  return data
}

export async function updateCustomer(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/customers/${id}`, body)
  return data
}

export async function deleteCustomer(id: string) {
  const { data } = await api.post(`/customers/${id}/deactivate`)
  return data
}

export async function activateCustomer(id: string) {
  const { data } = await api.post(`/customers/${id}/activate`)
  return data
}

// ---- Inventory -------------------------------------------------------------

export type InventoryItem = {
  inventory_id: string
  product_id: string
  branch_id: string
  quantity_on_hand: number
  reorder_level: number
  reorder_quantity: number
  reserved_quantity: number
  damaged_quantity: number
  expired_quantity: number
  available_quantity: number
  is_active: boolean
  last_updated: string
  created_at: string
  updated_at: string
  sku: string
  product_name: string
  brand: string | null
  branch_name: string | null
  primary_image_url?: string | null
}

export async function getInventory(params?: Record<string, unknown>) {
  const { data } = await api.post<{ data: InventoryItem[]; total: number }>('/inventories/search', params ?? {})
  return data
}

export async function getProductBranchInventory(params?: Record<string, unknown>) {
  const { data } = await api.get('/product-branch-inventory', { params })
  return data
}

export async function createInventoryEntry(body: Record<string, unknown>) {
  const { data } = await api.post('/product-branch-inventory', body)
  return data
}

export async function updateInventoryEntry(inventoryId: string, body: Record<string, unknown>) {
  const { data } = await api.put(`/product-branch-inventory/${inventoryId}`, body)
  return data
}

export async function getInventoryTransactions(params?: Record<string, unknown>) {
  const { data } = await api.get('/inventory/transactions', { params })
  return data
}

export async function createInventoryTransaction(body: Record<string, unknown>) {
  const { data } = await api.post('/inventory/transactions', body)
  return data
}

// ---- Inventory Transfers ---------------------------------------------------

export type InventoryTransfer = {
  transfer_id: string
  product_id: string
  from_branch_id: string
  to_branch_id: string
  quantity: number
  status: string
  requested_by: string
  approved_by: string | null
  requested_at: string
  approved_at: string | null
  shipped_at: string | null
  received_at: string | null
  received_by: string | null
  shipped_by: string | null
  notes: string | null
  transfer_number: string | null
  created_at: string
  updated_at: string
  product_name?: string
  sku?: string
  from_branch_name?: string
  to_branch_name?: string
  requested_by_name?: string
  approved_by_name?: string
  shipped_by_name?: string
  received_by_name?: string
}

export async function getInventoryTransfers(params?: Record<string, unknown>) {
  const { data } = await api.post('/inventory-transfers/search', params ?? {})
  return data
}

export async function createInventoryTransfer(body: Record<string, unknown>) {
  const { data } = await api.post('/inventory-transfers', body)
  return data
}

export async function approveInventoryTransfer(id: string) {
  const { data } = await api.post(`/inventory-transfers/${id}/approve`)
  return data
}

export async function shipInventoryTransfer(id: string) {
  const { data } = await api.post(`/inventory-transfers/${id}/ship`)
  return data
}

export async function receiveInventoryTransfer(id: string) {
  const { data } = await api.post(`/inventory-transfers/${id}/receive`)
  return data
}

export async function rejectInventoryTransfer(id: string) {
  const { data } = await api.post(`/inventory-transfers/${id}/reject`)
  return data
}

export async function getInventoryTransferById(id: string) {
  const { data } = await api.get(`/inventory-transfers/${id}`)
  return data
}

export async function activateInventoryTransfer(id: string) {
  const { data } = await api.post(`/inventory-transfers/${id}/activate`)
  return data
}

export async function deactivateInventoryTransfer(id: string) {
  const { data } = await api.post(`/inventory-transfers/${id}/deactivate`)
  return data
}

// ---- Purchase Orders -------------------------------------------------------

export type PurchaseOrder = {
  po_id: string
  supplier_id: string
  branch_id: string
  created_by: string | null
  order_date: string
  expected_delivery_date: string | null
  status: string
  total_amount: number
  notes: string | null
  po_number: string
  approved_date: string | null
  approved_by: string | null
  received_date: string | null
  payment_status: string | null
  shipping_cost: number
  tax_amount: number
  discount_amount: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PurchaseOrderItem = {
  po_item_id: string
  po_id: string
  product_id: string
  uom_id: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  line_total: number
  expiry_date: string | null
  batch_number: string | null
  serial_number: string | null
  discount: number
  created_at: string
  updated_at: string
}

export async function getPurchases(params?: Record<string, unknown>) {
  const { data } = await api.post('/purchases/search', params ?? {})
  return data
}

export async function getPurchaseById(id: string) {
  const { data } = await api.get(`/purchases/${id}`)
  return data
}

export async function createPurchase(body: Record<string, unknown>) {
  const { data } = await api.post('/purchases', body)
  return data
}

export async function updatePurchase(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/purchases/${id}`, body)
  return data
}

export async function deletePurchase(id: string) {
  const { data } = await api.post(`/purchases/${id}/deactivate`)
  return data
}

export async function submitPurchase(id: string) {
  const { data } = await api.post(`/purchases/${id}/submit`)
  return data
}

export async function approvePurchase(id: string) {
  const { data } = await api.post(`/purchases/${id}/approve`)
  return data
}

export async function receivePurchase(id: string) {
  const { data } = await api.post(`/purchases/${id}/receive`)
  return data
}

export async function getPurchaseItems(poId: string, params?: Record<string, unknown>) {
  const { data } = await api.get(`/purchases/${poId}/items`, { params })
  return data
}

export async function addPurchaseItem(poId: string, body: Record<string, unknown>) {
  const { data } = await api.post(`/purchases/${poId}/items`, body)
  return data
}

export async function updatePurchaseItem(poId: string, itemId: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/purchases/${poId}/items/${itemId}`, body)
  return data
}

export async function deletePurchaseItem(poId: string, itemId: string) {
  const { data } = await api.delete(`/purchases/${poId}/items/${itemId}`)
  return data
}

export async function createPurchasePayment(poId: string, body: Record<string, unknown>) {
  const { data } = await api.post(`/purchases/${poId}/payments`, body)
  return data
}

// ---- Sales -----------------------------------------------------------------

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
}

export async function getSales(params?: Record<string, unknown>) {
  const { data } = await api.get<{ data: Sale[]; total: number }>('/sales', { params })
  return data
}

export async function getSaleById(id: string) {
  const { data } = await api.get(`/sales/${id}`)
  return data
}

export async function createSale(body: Record<string, unknown>) {
  const { data } = await api.post('/sales', body)
  return data
}

export async function getSaleReceipt(saleId: string) {
  const { data } = await api.get(`/sales/${saleId}/receipt`)
  return data?.data ?? data
}

export async function voidSale(saleId: string) {
  const { data } = await api.post(`/sales/${saleId}/void`)
  return data?.data ?? data
}

export async function refundSale(saleId: string, body?: { amount?: number; reason?: string }) {
  const { data } = await api.post(`/sales/${saleId}/refund`, body)
  return data?.data ?? data
}

// ---- Branches --------------------------------------------------------------

export async function getBranches(params?: Record<string, unknown>) {
  const { data } = await api.get('/branches', { params })
  return data
}

export async function getBranchById(id: string) {
  const { data } = await api.get(`/branches/${id}`)
  return data
}

export async function createBranch(body: Record<string, unknown>) {
  const { data } = await api.post('/branches', body)
  return data
}

export async function updateBranch(id: string, body: Record<string, unknown>) {
  const { data } = await api.put(`/branches/${id}`, body)
  return data
}

export async function deleteBranch(id: string) {
  const { data } = await api.delete(`/branches/${id}`)
  return data
}

export async function activateBranch(id: string) {
  const { data } = await api.post(`/branches/${id}/activate`)
  return data
}

export async function deactivateBranch(id: string) {
  const { data } = await api.post(`/branches/${id}/deactivate`)
  return data
}

// ---- Reports ---------------------------------------------------------------

export async function getReports(params?: Record<string, unknown>) {
  const { data } = await api.get('/reports', { params })
  return data
}

export async function exportReport(params?: Record<string, unknown>) {
  const format = (params?.format ?? 'csv') as string
  const { data } = await api.get('/reports', {
    params: { ...params, format },
    responseType: format === 'csv' ? 'blob' : undefined,
  })
  return data
}

// ---- Report Endpoints ------------------------------------------------------

export type DailySalesData = {
  date: string
  transactions: number
  total_sales: number
}

export type MonthlySalesDay = {
  day: string  // DATE_TRUNC returns a timestamp like "2024-01-15T00:00:00.000Z"
  transactions: number
  total_sales: number
}

export type LowStockItem = {
  inventory_id: string
  product_id: string
  quantity_on_hand: number
  available_quantity: number
  reorder_level: number
  product_name: string
  sku?: string
  branch_name?: string
}

export type BestSellingItem = {
  product_id: string
  product_name: string
  qty_sold: number
}

export type BranchPerfItem = {
  branch_id: string
  branch_name: string
  transactions: number
  total_sales: number
}

export type ProfitData = {
  profit: number
}

export async function getDailySales(date?: string, branchId?: string) {
  const params: Record<string, string> = {}
  if (date) params.date = date
  if (branchId) params.branchId = branchId
  // Backend returns { data: DailySalesData } (single object), not an array
  const { data } = await api.get<{ data: DailySalesData }>('/reports/daily-sales', { params })
  return data.data
}

export async function getMonthlySales(year?: number, month?: number, branchId?: string) {
  const params: Record<string, string | number> = {}
  if (year != null) params.year = year
  if (month != null) params.month = month
  if (branchId) params.branchId = branchId
  const { data } = await api.get<{ data: MonthlySalesDay[] }>('/reports/monthly-sales', { params })
  return data.data
}

export async function getLowStock(branchId?: string) {
  const params: Record<string, string> = {}
  if (branchId) params.branchId = branchId
  const { data } = await api.get<{ data: LowStockItem[] }>('/reports/low-stock', { params })
  return data.data
}

export async function getBestSelling(params?: { limit?: number; startDate?: string; endDate?: string; branchId?: string }) {
  const { data } = await api.get<{ data: BestSellingItem[] }>('/reports/best-selling', { params })
  return data.data
}

export async function getBranchPerformance(params?: { startDate?: string; endDate?: string }) {
  const { data } = await api.get<{ data: BranchPerfItem[] }>('/reports/branch-performance', { params })
  return data.data
}

export async function getProfitReport(params?: { startDate?: string; endDate?: string; branchId?: string }) {
  const { data } = await api.get<{ data: ProfitData }>('/reports/profit', { params })
  return data.data
}

export type AnnualSalesItem = {
  year: string
  transactions: number
  total_sales: number
}

export async function getAnnualSales(year?: number, branchId?: string) {
  const params: Record<string, string | number> = {}
  if (year != null) params.year = year
  if (branchId) params.branchId = branchId
  const { data } = await api.get<{ data: AnnualSalesItem[] }>('/reports/annual-sales', { params })
  return data.data
}

export type InventoryReportItem = {
  inventory_id: string
  product_id: string
  quantity_on_hand: number
  available_quantity: number
  reorder_level: number
  product_name: string
  uom_name: string
}

export async function getInventoryReport(branchId?: string) {
  const params: Record<string, string> = {}
  if (branchId) params.branchId = branchId
  const { data } = await api.get<{ data: InventoryReportItem[] }>('/reports/inventory', { params })
  return data.data
}

export type PurchasesReportItem = {
  date: string
  purchases: number
  total_purchased: number
}

export async function getPurchasesReport(params?: { startDate?: string; endDate?: string; branchId?: string }) {
  const { data } = await api.get<{ data: PurchasesReportItem[] }>('/reports/purchases', { params })
  return data.data
}

export type StockMovementItem = {
  product_id: string
  product_name: string | null
  sku: string | null
  stock_in: number
  stock_out: number
  adjustment: number
  transfer_in: number
  transfer_out: number
  sale: number
  net: number
}

export type StockMovementDay = {
  date: string
  total_in: number
  total_out: number
  net: number
  transactions: number
}

export async function getStockMovements(params?: { startDate?: string; endDate?: string; branchId?: string; productId?: string; transactionType?: string; groupBy?: 'product' | 'day' }) {
  const { data } = await api.get<{ data: StockMovementItem[] | StockMovementDay[] }>('/reports/stock-movements', { params })
  return data.data
}

// ---- Notifications ---------------------------------------------------------

export async function getNotifications(params?: Record<string, unknown>) {
  const { data } = await api.get('/notifications', { params })
  return data
}

export async function markNotificationRead(id: string) {
  const { data } = await api.patch(`/notifications/${id}/read`)
  return data
}

export type NotificationItem = {
  notification_id: string
  branch_id: string | null
  title: string | null
  message: string | null
  notification_type: string | null
  priority: string | null
  is_read: boolean
  read_at: string | null
  created_at: string | null
  created_by: string | null
  expires_at: string | null
}

export async function getMyNotifications(params?: Record<string, unknown>) {
  const { data } = await api.get('/notifications/me', { params })
  return data
}

export async function deleteNotification(id: string) {
  const { data } = await api.delete(`/notifications/${id}`)
  return data
}

export async function createNotification(body: Record<string, unknown>) {
  const { data } = await api.post('/notifications', body)
  return data
}

export async function lookupUsers(q: string) {
  const { data } = await api.get('/users/lookup', { params: { q } })
  return data
}

// ---- Expenses --------------------------------------------------------------

export type Expense = {
  expense_id: string
  branch_id: string | null
  recorded_by: string | null
  category: string | null
  description: string | null
  amount: number | null
  expense_date: string | null
  created_at: string | null
  updated_at: string | null
}

export type ExpenseCategory = {
  category_id: string
  category_name: string
  description: string | null
}

export async function getExpenses(params?: Record<string, unknown>) {
  const { data } = await api.get('/expenses', { params })
  return data
}

export async function createExpense(body: Record<string, unknown>) {
  const { data } = await api.post('/expenses', body)
  return data
}

export async function updateExpense(id: string, body: Record<string, unknown>) {
  const { data } = await api.put(`/expenses/${id}`, body)
  return data
}

export async function deleteExpense(id: string) {
  const { data } = await api.delete(`/expenses/${id}`)
  return data
}

// ---- Expense Categories ----------------------------------------------------

export async function getExpenseCategories() {
  const { data } = await api.get('/expense-categories')
  return data
}

export async function createExpenseCategory(body: Record<string, unknown>) {
  const { data } = await api.post('/expense-categories', body)
  return data
}

export async function updateExpenseCategory(id: string, body: Record<string, unknown>) {
  const { data } = await api.put(`/expense-categories/${id}`, body)
  return data
}

export async function deleteExpenseCategory(id: string) {
  const { data } = await api.delete(`/expense-categories/${id}`)
  return data
}

// ---- Business Settings -----------------------------------------------------

export async function getBusinessSettings() {
  const { data } = await api.get('/business-settings')
  return data?.data?.[0] || {}
}

export async function getPublicBusinessSettings() {
  const { data } = await api.get('/business/public')
  const d = data?.data
  return d && typeof d === 'object' ? d : {}
}

export async function updateBusinessSettings(body: Record<string, unknown>) {
  const { data } = await api.put('/business-settings', { patch: body })
  return data
}

export async function uploadBusinessLogo(file: File) {
  const formData = new FormData()
  formData.append('image', file)
  const { data } = await api.post('/business-settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ---- System Settings -------------------------------------------------------

export async function getSystemSettings() {
  const { data } = await api.get('/system-settings')
  return data
}

export async function updateSystemSettings(body: { key: string; value: unknown; type?: string; description?: string | null }) {
  const { data } = await api.post('/system-settings', body)
  return data
}

export async function getSystemSetting(key: string): Promise<unknown> {
  const res = await getSystemSettings()
  return (Array.isArray(res?.data) ? res.data.find((s: { key: string }) => s.key === key) : undefined)?.value
}

// ---- Sessions --------------------------------------------------------------

export async function getSessions(params?: Record<string, unknown>) {
  const { data } = await api.get('/sessions', { params })
  return data
}

export async function getLoginHistory(params?: Record<string, unknown>) {
  const { data } = await api.get('/sessions/login-history', { params })
  return data
}

export async function revokeSession(id: string) {
  const { data } = await api.delete(`/sessions/${id}`)
  return data
}

// ---- Audit Logs ------------------------------------------------------------

export async function getAuditLogs(params?: Record<string, unknown>) {
  const { data } = await api.get('/audit', { params })
  return data
}

// ---- Price History ---------------------------------------------------------

export async function getPriceHistory(params?: Record<string, unknown>) {
  const { data } = await api.get('/price-history', { params })
  return data
}

// ---- Sync ------------------------------------------------------------------

export async function syncPush(body: Record<string, unknown>) {
  const { data } = await api.post('/sync/push', body)
  return data
}

export async function syncPull(params?: Record<string, unknown>) {
  const { data } = await api.post('/sync/pull', params ?? {})
  return data
}

export async function getSyncLogs(params?: Record<string, unknown>) {
  const { data } = await api.get('/sync/logs', { params })
  return data
}

export async function getEntityLastSync(entity: string) {
  const { data } = await api.get(`/sync/${entity}/last`)
  return data
}

export async function pullEntityChanges(entity: string, since?: string) {
  const { data } = await api.get(`/sync/${entity}/pull`, { params: since ? { since } : {} })
  return data
}

export async function pushEntityChanges(entity: string, items: unknown[]) {
  const { data } = await api.post(`/sync/${entity}/push`, { items })
  return data
}

export async function retrySync(syncId: string) {
  const { data } = await api.post('/sync/retry', { sync_id: syncId })
  return data
}

// ---- Message Queue ---------------------------------------------------------

export async function getMessageQueue(params?: Record<string, unknown>) {
  const { data } = await api.get('/admin/queue', { params })
  return data
}

// ---- SMS Balance ------------------------------------------------------------

export type SmsBalance = {
  balance: number | null
  currency: string | null
  checkedAt: string
}

export async function getSmsBalance() {
  const { data } = await api.get<{ success: boolean; data: SmsBalance }>('/admin/sms/balance')
  return data
}

// ---- Supplier Payments -----------------------------------------------------

export type SupplierPayment = {
  payment_id: string
  supplier_id: string | null
  po_id: string | null
  amount: number | null
  payment_method: string | null
  payment_date: string | null
  reference_number: string | null
}

export async function listSupplierPayments(params?: Record<string, unknown>) {
  const { data } = await api.get('/supplier-payments', { params })
  return data
}

export async function createSupplierPayment(body: Record<string, unknown>) {
  const { data } = await api.post('/supplier-payments', body)
  return data
}

// ---- Customer Payments -----------------------------------------------------

export type CustomerPayment = {
  payment_id: string
  customer_id: string | null
  sale_id: string | null
  amount: number | null
  payment_method: string | null
  payment_date: string | null
}

export async function getCustomerPayments(params?: Record<string, unknown>) {
  const { data } = await api.get('/customer-payments', { params })
  return data
}

export async function getCustomerPaymentsByCustomer(id: string) {
  const { data } = await api.get(`/customers/${id}/payments`)
  return data
}

export async function createCustomerPayment(body: Record<string, unknown>) {
  const { data } = await api.post('/customer-payments', body)
  return data
}

// ---- Health Check ----------------------------------------------------------

export async function healthCheck() {
  const { data } = await api.get('/health')
  return data as { success: boolean; message: string }
}

setupOfflineSupport(api)

export default api

// ---- Products Import / Export ----------------------------------------------

export type ImportRow = Record<string, string | number | boolean | null | undefined>

export async function importProducts(rows: ImportRow[]) {
  const results = { imported: 0, errors: 0, messages: [] as string[] }
  for (const row of rows) {
    try {
      await createProduct(row)
      results.imported++
    } catch (err) {
      results.errors++
      const msg = isAxiosError(err) ? err.response?.data?.message ?? 'Unknown error' : 'Unknown error'
      results.messages.push(`Row ${results.imported + results.errors}: ${msg}`)
    }
  }
  return results
}
