# Services, Controllers, Routes & Validation Requirements

This document enumerates the service, controller, route files and the validation requirements for each repository module in the backend.

---

### Audit
- Service: `backend/src/services/audit.service.js`
- Controller: `backend/src/controllers/audit.controller.js`
- Routes: `GET /api/v1/audits`, `GET /api/v1/audits/:id`, `GET /api/v1/audits/export` (`backend/src/routes/audit.routes.js`)
- Validations:
  - Query: `page` (integer >=1), `limit` (integer <=100)
  - Date filters: `from`/`to` (ISO 8601), `user_id` (uuid)
  - Export: `format` in [csv,xlsx], optional `fields` list

### Auth / Sessions
- Service: `backend/src/services/auth.service.js`
- Controller: `backend/src/controllers/auth.controller.js`
- Routes: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/logout-all`, `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`, session listing/revoke under `/api/v1/sessions`
- Validations:
  - Login: `email` (email, required), `password` (string, required)
  - Refresh: `refresh_token` (jwt string, required)
  - Password reset: `email` (email), `token` (string), `new_password` (min length 8, complexity)
  - Session actions: `session_id` (uuid)

### Branch
- Service: `backend/src/services/branch.service.js`
- Controller: `backend/src/controllers/branch.controller.js`
- Routes: `GET /api/v1/branches`, `POST /api/v1/branches`, `GET/PUT/DELETE /api/v1/branches/:branchId`, `POST /api/v1/branches/:id/activate`, `POST /api/v1/branches/:id/deactivate`
- Validations:
  - Create/Update: `branch_name` (string, required), `address` (string), `is_active` (boolean)
  - Params: `branchId` (uuid)

### Business Settings
- Service: `backend/src/services/business.service.js`
- Controller: `backend/src/controllers/business.controller.js`
- Routes: `GET /api/v1/business-settings`, `PUT /api/v1/business-settings`
- Validations:
  - Settings payload schema (key-value), required fields depending on settings (e.g., currency, timezone)

### Category
- Service: `backend/src/services/category.service.js`
- Controller: `backend/src/controllers/category.controller.js`
- Routes: `GET /api/v1/categories`, `POST /api/v1/categories`, `GET/PUT/DELETE /api/v1/categories/:id` (activate/deactivate)
- Validations:
  - `name` (string, required), `parent_id` (uuid, optional), `is_active` (boolean)

### Customer
- Service: `backend/src/services/customer.service.js`
- Controller: `backend/src/controllers/customer.controller.js`
- Routes: `GET /api/v1/customers`, `POST /api/v1/customers`, `GET/PUT/DELETE /api/v1/customers/:id`, `/api/v1/customers/:id/payments`, import/export endpoints
- Validations:
  - Create/Update: `customer_name` (required), `email` (email), `phone` (phone format), `address` (string)
  - Search: `q` (string), `page`/`limit` pagination
  - Import: file type csv/xlsx, required columns mapping

### Customer Payments
- Service: `backend/src/services/customerPayment.service.js`
- Controller: `backend/src/controllers/customerPayment.controller.js`
- Routes: `POST /api/v1/customer-payments`, `GET /api/v1/customer-payments`, `GET /api/v1/customers/:id/payments`
- Validations:
  - `customer_id` (uuid, required), `amount` (positive number, required), `payment_date` (ISO date), `method` (enum)

### Expense Categories
- Service: `backend/src/services/expenseCategory.service.js`
- Controller: `backend/src/controllers/expenseCategory.controller.js`
- Routes: `GET/POST/PUT/DELETE /api/v1/expense-categories`
- Validations:
  - `name` (required), `description` (optional)

### Expenses
- Service: `backend/src/services/expense.service.js`
- Controller: `backend/src/controllers/expense.controller.js`
- Routes: `GET/POST/PUT/DELETE /api/v1/expenses`, export
- Validations:
  - `category_id` (uuid, required), `amount` (positive, required), `date` (ISO date), `notes` (optional)

### Inventory
- Service: `backend/src/services/inventory.service.js`
- Controller: `backend/src/controllers/inventory.controller.js`
- Routes: `/api/v1/inventory`, `/api/v1/inventory/transactions`
- Validations:
  - Transaction: `product_id` (uuid), `branch_id` (uuid), `quantity` (number, non-zero), `type` (in ['in','out','adjustment'])

### Inventory Transfers
- Service: `backend/src/services/inventoryTransfer.service.js`
- Controller: `backend/src/controllers/inventoryTransfer.controller.js`
- Routes: `POST /api/v1/inventory-transfers`, `GET /api/v1/inventory-transfers`, `POST /api/v1/inventory-transfers/:id/approve`
- Validations:
  - `from_branch_id`, `to_branch_id` (uuid, required, not equal), `items` array with `product_id` and `quantity` (>0)

### Notification
- Service: `backend/src/services/notification.service.js`
- Controller: `backend/src/controllers/notification.controller.js`
- Routes: `GET /api/v1/notifications`, `GET /api/v1/notifications/me`, `POST /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`, `DELETE /api/v1/notifications/:id`
- Validations:
  - Create: `recipient_id` (uuid), `type` (string), `payload` (object), `is_read` (boolean)

### Permission
- Service: `backend/src/services/permission.service.js`
- Controller: `backend/src/controllers/permission.controller.js`
- Routes: `GET/POST/PUT/DELETE /api/v1/permissions`
- Validations:
  - `name` (required), `description` (optional), `code` (unique identifier)

### Price History
- Service: `backend/src/services/priceHistory.service.js`
- Controller: `backend/src/controllers/priceHistory.controller.js`
- Routes: `GET /api/v1/price-history`, `POST /api/v1/price-history`
- Validations:
  - `product_id` (uuid), `price` (positive number), `effective_date` (ISO date)

### Product
- Service: `backend/src/services/product.service.js`
- Controller: `backend/src/controllers/product.controller.js`
- Routes: `GET /api/v1/products`, `POST /api/v1/products`, `GET/PUT/DELETE /api/v1/products/:id`, `/api/v1/products/:id/images`, `/api/v1/products/:id/price-history`, import/export
- Validations:
  - Create/Update: `sku` (string, unique), `name` (required), `category_id` (uuid), `uom_id` (uuid), `cost_price` (>=0), `sell_price` (>=0), `reorder_level` (integer)
  - Bulk import: required columns, file type validation

### Product Branch Inventory
- Service: `backend/src/services/productBranchInventory.service.js`
- Controller: `backend/src/controllers/productBranchInventory.controller.js`
- Routes: `GET/POST /api/v1/product-branch-inventory`
- Validations:
  - `product_id`, `branch_id` (uuid), `quantity` (number)

### Product Images
- Service: `backend/src/services/productImage.service.js`
- Controller: `backend/src/controllers/productImage.controller.js`
- Routes: `POST /api/v1/products/:id/images`, `GET /api/v1/products/:id/images`, `DELETE /api/v1/product-images/:id`
- Validations:
  - File: mime types (image/png,image/jpeg), max size; `product_id` (uuid)

### Purchase Orders
- Service: `backend/src/services/purchase.service.js`
- Controller: `backend/src/controllers/purchase.controller.js`
- Routes: `GET/POST/PUT/DELETE /api/v1/purchase-orders`, `/api/v1/purchase-orders/:id/items`, submit/approve/receive actions
- Validations:
  - PO: `supplier_id` (uuid), `order_date` (ISO), `items` array with `product_id`, `quantity` (>0), `unit_price` (>=0)

### Purchase Order Items
- Service: `backend/src/services/purchaseItem.service.js`
- Controller: `backend/src/controllers/purchaseItem.controller.js`
- Routes: under `/api/v1/purchase-orders/:poId/items`
- Validations:
  - `poId` (uuid), `product_id`, `quantity`, `unit_price`

### Report
- Service: `backend/src/services/report.service.js`
- Controller: `backend/src/controllers/report.controller.js`
- Routes: `GET /api/v1/reports`, `GET /api/v1/reports/export` (CSV/XLSX streaming)
- Validations:
  - `report_type` (enum), `from`/`to` dates, `format` in [csv,xlsx], filters per report

### Role
- Service: `backend/src/services/role.service.js`
- Controller: `backend/src/controllers/role.controller.js`
- Routes: `GET/POST/PUT/DELETE /api/v1/roles`, `/api/v1/roles/:id/permissions`
- Validations:
  - `name` (required), `permissions` (array of permission ids)

### Sales
- Service: `backend/src/services/sales.service.js`
- Controller: `backend/src/controllers/sales.controller.js`
- Routes: `GET/POST /api/v1/sales`, `GET /api/v1/sales/:id`, `/api/v1/sales/:id/items`, `/api/v1/sales/:id/receipt`, void/refund
- Validations:
  - Sale create: `customer_id` (uuid optional), `items` array with `product_id`, `quantity` (>0), `unit_price` (>=0), `payment` details (amount >=0)

### Supplier
- Service: `backend/src/services/supplier.service.js`
- Controller: `backend/src/controllers/supplier.controller.js`
- Routes: `GET/POST/PUT/DELETE /api/v1/suppliers`
- Validations:
  - `supplier_name` (required), `contact_name`, `email`, `phone`, `payment_terms`

### Supplier Payments
- Service: `backend/src/services/supplierPayment.service.js`
- Controller: `backend/src/controllers/supplierPayment.controller.js`
- Routes: `POST /api/v1/supplier-payments`, `GET /api/v1/suppliers/:id/payments`
- Validations:
  - `supplier_id` (uuid), `amount` (positive), `payment_date` (ISO date)

### Sync / Sync Logs
- Service: `backend/src/services/sync.service.js`
- Controller: `backend/src/controllers/sync.controller.js`
- Routes: `/api/v1/sync/push`, `/api/v1/sync/pull`, `/api/v1/sync/logs`, `/api/v1/sync/retry`
- Validations:
  - `sync_payload` structure validation, `source`/`target`, `batch_id`, retry parameters

### System Settings
- Service: `backend/src/services/system.service.js`
- Controller: `backend/src/controllers/system.controller.js`
- Routes: `/api/v1/system-settings`
- Validations:
  - Settings key/value schema, careful validation for types (boolean, number, string)

### Units of Measure (UoM)
- Service: `backend/src/services/uom.service.js`
- Controller: `backend/src/controllers/uom.controller.js`
- Routes: `GET/POST/PUT/DELETE /api/v1/units-of-measure`
- Validations:
  - `name` (required), `symbol`, `conversion_factor` (positive number)

### User
- Service: `backend/src/services/user.service.js`
- Controller: `backend/src/controllers/user.controller.js`
- Routes: `GET/POST/PUT/DELETE /api/v1/users`, `/api/v1/users/:id/sessions`, `/api/v1/users/:id/branches`
- Validations:
  - Create: `email` (unique, email), `password` (min length 8), `first_name`, `last_name`, `roles` (array)
  - Update: allow partial fields, validate role assignment

### User Branches
- Service: `backend/src/services/userBranch.service.js`
- Controller: `backend/src/controllers/userBranch.controller.js`
- Routes: `POST /api/v1/user-branches`, `DELETE /api/v1/user-branches/:id`, `GET /api/v1/users/:id/branches`
- Validations:
  - `user_id` (uuid), `branch_id` (uuid), ensure uniqueness per pair

---

Notes:
- For endpoints that perform multiple DB writes, enforce transaction (`client`) in services.
- Use `express-validator` consistent patterns: sanitize inputs, validate types, and return standardized error responses.
- CSV/XLSX import endpoints must validate file type, required columns, and row-level validation with clear error reporting.

If you want, I can scaffold the validation middleware files and basic service/controller stubs for a selected set of high-priority modules (auth, products, sales, purchases).
