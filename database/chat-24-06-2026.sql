CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    phone VARCHAR(30),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id),
    branch_id UUID REFERENCES branches(id),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(255) UNIQUE,
    description TEXT,
    cost_price NUMERIC(12,2) DEFAULT 0,
    selling_price NUMERIC(12,2) NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, branch_id)
);

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    user_id UUID REFERENCES users(id),
    transaction_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction Types:
    -- STOCK_IN
    -- STOCK_OUT
    -- ADJUSTMENT
    -- TRANSFER_IN
    -- TRANSFER_OUT
    -- SALE
    -- PURCHASE

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(100),
    phone VARCHAR(30),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_date DATE,
    status VARCHAR(50) DEFAULT 'PENDING',
    total_amount NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Status:
    -- PENDING
    -- APPROVED
    -- RECEIVED
    -- CANCELLED

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    cashier_id UUID REFERENCES users(id),
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    payment_method VARCHAR(50),
    total_amount NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    source_branch_id UUID NOT NULL REFERENCES branches(id),
    destination_branch_id UUID NOT NULL REFERENCES branches(id),
    quantity INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Status:
    -- PENDING
    -- APPROVED
    -- COMPLETED
    -- CANCELLED

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    message TEXT NOT NULL,
    notification_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255),
    entity_name VARCHAR(100),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name VARCHAR(100),
    entity_id UUID,
    operation VARCHAR(20),
    payload JSONB,
    sync_status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings
    (setting_key, setting_value, description)
VALUES
    ('company_name', 'My Inventory System', 'Business name'),
    ('company_logo_url', 'https://example.com/logo.png', 'Business Logo URL'),
    ('company_address', 'Accra, Ghana', 'Business address'),
    ('company_phone', '+233000000000', 'Business phone'),
    ('company_email', 'info@example.com', 'Business email'),
    ('currency', 'GH₵', 'Default currency'),
    ('vat_rate', '15', 'VAT percentage'),
    ('receipt_footer', 'Thank you for shopping with us', 'Receipt footer message'),
    ('low_stock_threshold', '10', 'Minimum stock level'),
    ('jwt_expiry', '1d', 'JWT expiration period'),
    ('receipt_header', 'My Inventory System', 'Receipt header message'),
    ('default_payment_method', 'CASH', 'Default payment method for sales'),
    ('enable_notifications', 'true', 'Enable or disable notifications'),
    ('default_language', 'en', 'Default language for the system'),
    ('enable_audit_logs', 'true', 'Enable or disable audit logging'),
    ('enable_sync', 'true', 'Enable or disable data synchronization'),
    ('sync_interval_minutes', '15', 'Interval in minutes for data synchronization'),
    ('enable_multi_branch', 'true', 'Enable or disable multi-branch support'),
    ('default_branch_id', NULL, 'Default branch for operations'),
    ('enable_bulk_import_export', 'true', 'Enable or disable bulk import/export of data'),
    ('enable_user_activity_tracking', 'true', 'Enable or disable user activity tracking'),
    ('enable_email_notifications', 'true', 'Enable or disable email notifications'),
    ('enable_sms_notifications', 'false', 'Enable or disable SMS notifications'),
    ('enable_backup', 'true', 'Enable or disable database backup'),
    ('backup_schedule', '0 2 * * *', 'Cron schedule for database backup (default: daily at 2 AM)'),
    ('backup_location', '/backups/', 'Directory path for storing backups');