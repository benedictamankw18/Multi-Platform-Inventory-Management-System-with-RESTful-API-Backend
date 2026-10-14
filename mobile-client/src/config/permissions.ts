/**
 * permissions.ts
 *
 * Single source of truth for the permission codes the mobile client checks.
 *
 * The backend exposes TWO kinds of code (verified in `backend/src/routes/*`
 * and `database/seed-permissions.sql`):
 *
 *  - PAGE permissions gate a screen in the UI (e.g. `VIEW_PRODUCTS_PAGE`).
 *    Use these to show/hide tabs and to guard a route with `PermissionGate`.
 *  - DATA permissions gate an API endpoint (e.g. `VIEW_PRODUCTS`).
 *
 * A role can hold the DATA permission without the PAGE permission: a Cashier
 * may call `POST /products/search` (needs `VIEW_PRODUCTS`) to power POS, but
 * cannot open the Products page (`VIEW_PRODUCTS_PAGE`). Gate navigation on the
 * PAGE permission.
 */

export const PERMISSIONS = {
  /** Products catalog page. */
  productsPage: 'VIEW_PRODUCTS_PAGE',
  /** Create / edit / (de)activate products (data permission on `/products` writes). */
  createProduct: 'CREATE_PRODUCT',
  /** Categories + units-of-measure page (also the data permission for their reads). */
  categories: 'VIEW_CATEGORIES',
  /** Create / edit / (de)activate categories and units of measure. */
  manageCategories: 'MANAGE_CATEGORIES',
  /** Inventory levels page (also the data permission for /inventories/search). */
  inventory: 'VIEW_INVENTORY',
  /** Stock in / out / adjustments (future stock-movement screen). */
  manageInventory: 'MANAGE_INVENTORY',
  /** Sales list + sale detail. */
  sales: 'VIEW_SALES',
  /** Point of sale. */
  createSale: 'CREATE_SALE',
  /** Void / refund a sale. */
  voidSale: 'VOID_SALE',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
