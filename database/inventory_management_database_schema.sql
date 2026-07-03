-- ============================================================================
-- MULTI-PLATFORM INVENTORY MANAGEMENT SYSTEM
-- Database Schema (PostgreSQL)  -  C-002: PostgreSQL as primary database
--
-- Designed from the project SRS. Supports a shop that is RETAIL-only,
-- WHOLESALE-only, or BOTH at the same time:
--   - products carry independent retail_price AND wholesale_price
--   - products can be sold in different units (e.g. Piece for retail,
--     Carton for wholesale) via units_of_measure + conversion factor
--   - customers/sales are tagged RETAIL/WHOLESALE for reporting
--   - business_settings simply records which mode(s) the shop runs in
--
-- FR-xxx / NFR-xxx comments map each section back to the SRS requirement.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- provides gen_random_uuid()

-- ============================================================================
-- SECTION 1: BUSINESS CONFIGURATION
-- ============================================================================

-- One row per deployment (or per branch, if each branch is run independently).
-- business_type is informational/UI-driving only -- the schema below always
-- supports retail AND wholesale data regardless of this setting.
CREATE TABLE business_settings (
    setting_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name   VARCHAR(150) NOT NULL,
    business_type   VARCHAR(20) NOT NULL DEFAULT 'BOTH'
                        CHECK (business_type IN ('RETAIL', 'WHOLESALE', 'BOTH')),
    currency        VARCHAR(10) NOT NULL DEFAULT 'GHS',
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 2: USERS, ROLES & ACCESS CONTROL
-- FR-001 (login), FR-002 (logout), FR-003 (RBAC), FR-004 (admin manages users)
-- NFR-004 (password encryption), NFR-005 (JWT), NFR-006 (roles/permissions),
-- NFR-007 (session inactivity expiry)
-- ============================================================================

CREATE TABLE roles (
    role_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name   VARCHAR(50) UNIQUE NOT NULL,   -- Business Owner, Administrator, Branch Manager, Cashier, Storekeeper
    description TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
    permission_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_name VARCHAR(100) UNIQUE NOT NULL,  -- e.g. CREATE_PRODUCT, APPROVE_TRANSFER, VIEW_REPORTS
    description     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id),
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- FR-023 (multiple branches)
CREATE TABLE branches (
    branch_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_name VARCHAR(100) NOT NULL,
    address     TEXT,
    phone       VARCHAR(20),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE users (
    user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id      UUID REFERENCES branches(branch_id) ON DELETE SET NULL,  -- NULL = all-branch access (Owner/Admin)
    role_id        UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    full_name      VARCHAR(100) NOT NULL,
    username       VARCHAR(50) UNIQUE NOT NULL,
    email          VARCHAR(100) UNIQUE,
    phone          VARCHAR(20),
    password_hash  VARCHAR(255) NOT NULL,       -- NFR-004
    is_active      BOOLEAN NOT NULL DEFAULT TRUE, -- FR-004
    last_login_at  TIMESTAMP,
    created_at     TIMESTAMP NOT NULL DEFAULT now(),
    updated_at     TIMESTAMP NOT NULL DEFAULT now()
);

-- Tracks active JWT sessions so inactivity timeout (NFR-007) can be enforced
CREATE TABLE user_sessions (
    session_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_identifier VARCHAR(255) NOT NULL,     -- JWT "jti" claim, never store the raw token
    issued_at        TIMESTAMP NOT NULL DEFAULT now(),
    expires_at       TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP NOT NULL DEFAULT now(),
    revoked          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 3: PRODUCTS
-- FR-005 (add), FR-006 (update), FR-007 (deactivate), FR-008 (search/view),
-- FR-009 (barcode)
-- ============================================================================

CREATE TABLE categories (
    category_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description   TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- Lets one product be sold/stocked in different units --
-- e.g. "Piece" for retail customers, "Carton" for wholesale buyers.
CREATE TABLE units_of_measure (
    uom_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uom_name    VARCHAR(50) UNIQUE NOT NULL,   -- Piece, Dozen, Box, Carton, Kg, etc.
    description TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE suppliers (
    supplier_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name VARCHAR(150) NOT NULL,
    contact_name  VARCHAR(100),
    phone         VARCHAR(20),
    email         VARCHAR(100),
    address       TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE products (
    product_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku            VARCHAR(50) UNIQUE NOT NULL,
    barcode        VARCHAR(100) UNIQUE,                 -- FR-009
    product_name   VARCHAR(150) NOT NULL,
    category_id    UUID REFERENCES categories(category_id) ON DELETE SET NULL,
    supplier_id    UUID REFERENCES suppliers(supplier_id) ON DELETE SET NULL,  -- preferred/default supplier

    base_uom_id    UUID NOT NULL REFERENCES units_of_measure(uom_id),  -- smallest sellable unit, e.g. Piece
    cost_price     NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- --- Retail pricing: sold individually, per base unit ---
    retail_price   NUMERIC(12,2),

    -- --- Wholesale pricing: sold in bulk, per wholesale unit ---
    wholesale_uom_id             UUID REFERENCES units_of_measure(uom_id),
    wholesale_conversion_factor  NUMERIC(10,2),  -- base units per wholesale unit (e.g. 24 pieces/carton)
    wholesale_price              NUMERIC(12,2),  -- price per wholesale unit
    wholesale_min_qty            NUMERIC(10,2),  -- min qty (in base units) to qualify for wholesale price

    is_active      BOOLEAN NOT NULL DEFAULT TRUE,  -- FR-007
    created_at     TIMESTAMP NOT NULL DEFAULT now(),
    updated_at     TIMESTAMP NOT NULL DEFAULT now(),

    -- A product must support at least one selling mode (retail-only, wholesale-only, or both)
    CONSTRAINT chk_at_least_one_price CHECK (retail_price IS NOT NULL OR wholesale_price IS NOT NULL)
);

-- ============================================================================
-- SECTION 4: INVENTORY
-- FR-010 (stock-in), FR-011 (stock-out), FR-012 (history), FR-013 (current levels),
-- FR-014 (low-stock alerts), FR-024 (inventory by branch),
-- FR-036/037/038 (inter-branch transfers)
-- ============================================================================

-- Current stock-on-hand, always tracked in base units, per product per branch
CREATE TABLE product_branch_inventory (
    inventory_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id       UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    branch_id        UUID NOT NULL REFERENCES branches(branch_id) ON DELETE RESTRICT,
    quantity_on_hand NUMERIC(12,2) NOT NULL DEFAULT 0,
    reorder_level    NUMERIC(12,2) NOT NULL DEFAULT 0,   -- FR-014 / FR-033 trigger point
    reorder_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
    last_updated     TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (product_id, branch_id),
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- Full audit trail of every stock movement (FR-012, FR-028)
CREATE TABLE inventory_transactions (
    transaction_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id       UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    branch_id        UUID NOT NULL REFERENCES branches(branch_id) ON DELETE RESTRICT,
    transaction_type VARCHAR(20) NOT NULL
                        CHECK (transaction_type IN
                            ('STOCK_IN','STOCK_OUT','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','SALE')),
    quantity         NUMERIC(12,2) NOT NULL,    -- base units, always positive; direction implied by type
    reference_type   VARCHAR(20),               -- PURCHASE_ORDER, SALE, TRANSFER, MANUAL
    reference_id     UUID,                      -- points to purchase_orders.po_id / sales.sale_id / inventory_transfers.transfer_id
    performed_by     UUID REFERENCES users(user_id) ON DELETE SET NULL,
    notes            TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- Branch-to-branch transfer requests (FR-036 - FR-038)
CREATE TABLE inventory_transfers (
    transfer_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id     UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    from_branch_id UUID NOT NULL REFERENCES branches(branch_id) ON DELETE RESTRICT,
    to_branch_id   UUID NOT NULL REFERENCES branches(branch_id) ON DELETE RESTRICT,
    quantity       NUMERIC(12,2) NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED')),
    requested_by   UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_by    UUID REFERENCES users(user_id) ON DELETE SET NULL,
    requested_at   TIMESTAMP NOT NULL DEFAULT now(),
    approved_at    TIMESTAMP,
    notes          TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),
    CHECK (from_branch_id <> to_branch_id)
);

-- ============================================================================
-- SECTION 5: CUSTOMERS
-- Not explicitly named in the SRS, but needed to distinguish walk-in retail
-- buyers from wholesale/business accounts (credit terms, business name, etc.)
-- ============================================================================

CREATE TABLE customers (
    customer_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_type VARCHAR(20) NOT NULL DEFAULT 'WALK_IN'
                    CHECK (customer_type IN ('WALK_IN','RETAIL','WHOLESALE')),
    business_name VARCHAR(150),       -- relevant for wholesale/B2B customers
    contact_name  VARCHAR(100),
    phone         VARCHAR(20),
    email         VARCHAR(100),
    address       TEXT,
    credit_limit  NUMERIC(12,2) NOT NULL DEFAULT 0,   -- wholesale customers may buy on credit
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 6: SALES
-- FR-015 (process sale), FR-016 (totals), FR-017 (receipts),
-- FR-018 (store records), FR-019 (multiple payment methods),
-- FR-025 (sales by branch), FR-039 - FR-041 (offline sync)
-- ============================================================================

CREATE TABLE sales (
    sale_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branches(branch_id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,  -- NULL = anonymous walk-in
    cashier_id  UUID REFERENCES users(user_id) ON DELETE SET NULL,
    sale_type   VARCHAR(20) NOT NULL DEFAULT 'RETAIL'
                    CHECK (sale_type IN ('RETAIL','WHOLESALE')),
    sale_date   TIMESTAMP NOT NULL DEFAULT now(),

    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
    balance_due     NUMERIC(12,2) NOT NULL DEFAULT 0,  -- > 0 typically on wholesale credit sales

    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED'
                CHECK (status IN ('COMPLETED','PARTIALLY_PAID','VOID','REFUNDED')),

    -- Offline sync support (FR-039 - FR-041)
    local_transaction_id VARCHAR(100) UNIQUE,  -- ID generated by the desktop app while offline
    synced               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE sale_items (
    sale_item_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id       UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
    product_id    UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    uom_id        UUID NOT NULL REFERENCES units_of_measure(uom_id),  -- unit actually sold in (Piece vs Carton)
    quantity      NUMERIC(12,2) NOT NULL,
    unit_price    NUMERIC(12,2) NOT NULL,    -- price actually applied: retail or wholesale tier
    line_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    line_total    NUMERIC(12,2) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE payments (
    payment_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id         UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
    payment_method  VARCHAR(20) NOT NULL
                        CHECK (payment_method IN ('CASH','CARD','MOBILE_MONEY','BANK_TRANSFER','CREDIT')),
    amount          NUMERIC(12,2) NOT NULL,
    payment_date    TIMESTAMP NOT NULL DEFAULT now(),
    reference_number VARCHAR(100),
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE receipts (
    receipt_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id        UUID NOT NULL UNIQUE REFERENCES sales(sale_id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    printed_at     TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 7: PURCHASING / SUPPLIERS
-- FR-020 (supplier records), FR-021 (purchase orders), FR-022 (purchase history)
-- ============================================================================

CREATE TABLE purchase_orders (
    po_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id    UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    branch_id      UUID NOT NULL REFERENCES branches(branch_id) ON DELETE RESTRICT,
    created_by     UUID REFERENCES users(user_id) ON DELETE SET NULL,
    order_date     TIMESTAMP NOT NULL DEFAULT now(),
    expected_delivery_date DATE,
    status         VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','RECEIVED','CANCELLED')),
    total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes          TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT now(),
    updated_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE purchase_order_items (
    po_item_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id             UUID NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
    product_id        UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    uom_id            UUID NOT NULL REFERENCES units_of_measure(uom_id),
    quantity_ordered  NUMERIC(12,2) NOT NULL,
    quantity_received NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit_cost         NUMERIC(12,2) NOT NULL,
    line_total        NUMERIC(12,2) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 8: NOTIFICATIONS
-- FR-033 (reorder level), FR-034 (sync failures), FR-035 (branch shortages)
-- ============================================================================

CREATE TABLE notifications (
    notification_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    branch_id         UUID REFERENCES branches(branch_id) ON DELETE SET NULL,
    notification_type VARCHAR(30) NOT NULL
                        CHECK (notification_type IN
                            ('LOW_STOCK','SYNC_FAILURE','BRANCH_SHORTAGE','TRANSFER_REQUEST','OTHER')),
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 9: AUDIT & OFFLINE-SYNC LOGS
-- NFR-018 (audit log), NFR-019 (1-year retention), FR-039 - FR-041 (offline sync)
-- ============================================================================

CREATE TABLE audit_logs (
    audit_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,    -- e.g. LOGIN, CREATE_PRODUCT, DEACTIVATE_USER
    entity_type VARCHAR(50),
    entity_id   UUID,
    details     JSONB,
    ip_address  VARCHAR(45),
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- Tracks offline transactions created on the desktop app and their sync outcome.
-- The UNIQUE constraint is what enforces FR-041 (no duplicate sync).
CREATE TABLE sync_logs (
    sync_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id            VARCHAR(100) NOT NULL,
    local_transaction_id VARCHAR(100) NOT NULL,
    entity_type          VARCHAR(50) NOT NULL,   -- SALE, INVENTORY_TRANSACTION, etc.
    sync_status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (sync_status IN ('PENDING','SUCCESS','FAILED','DUPLICATE')),
    synced_at     TIMESTAMP,
    error_message TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (device_id, local_transaction_id)
);

-- ============================================================================
-- SECTION 10: INDEXES  (NFR-001: fast API responses)
-- ============================================================================

CREATE INDEX idx_products_barcode  ON products(barcode);
CREATE INDEX idx_products_sku      ON products(sku);
CREATE INDEX idx_products_active   ON products(is_active);

CREATE INDEX idx_inventory_branch  ON product_branch_inventory(branch_id);
CREATE INDEX idx_inventory_product ON product_branch_inventory(product_id);

CREATE INDEX idx_inv_txn_product_branch ON inventory_transactions(product_id, branch_id);
CREATE INDEX idx_inv_txn_created_at     ON inventory_transactions(created_at);

CREATE INDEX idx_sales_branch   ON sales(branch_id);
CREATE INDEX idx_sales_date     ON sales(sale_date);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_type     ON sales(sale_type);

CREATE INDEX idx_sale_items_sale    ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_branch   ON purchase_orders(branch_id);

CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_audit_logs_user      ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created   ON audit_logs(created_at);

-- ============================================================================
-- SECTION 11: AUTO-UPDATE updated_at TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_branches_updated_at        BEFORE UPDATE ON branches         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at           BEFORE UPDATE ON users            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated_at        BEFORE UPDATE ON products         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_suppliers_updated_at       BEFORE UPDATE ON suppliers        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_updated_at       BEFORE UPDATE ON customers        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_business_settings_updated_at BEFORE UPDATE ON business_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- SECTION 12: SEED DATA
-- ============================================================================

INSERT INTO roles (role_name, description) VALUES
    ('Business Owner',  'Full access to all reports and configuration'),
    ('Administrator',   'Manages users, roles, and system configuration'),
    ('Branch Manager',  'Oversees a branch: inventory and sales monitoring'),
    ('Cashier',         'Processes sales and generates receipts'),
    ('Storekeeper',     'Manages stock-in, stock-out, and inventory updates');

INSERT INTO units_of_measure (uom_name, description) VALUES
    ('Piece',  'Single unit'),
    ('Dozen',  '12 pieces'),
    ('Box',    'Standard box quantity'),
    ('Carton', 'Standard carton/case quantity'),
    ('Kg',     'Kilogram');

-- Change business_type to 'RETAIL' or 'WHOLESALE' if the shop only operates one way
INSERT INTO business_settings (business_name, business_type, currency) VALUES
    ('My Shop', 'BOTH', 'GHS');
