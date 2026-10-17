--
-- PostgreSQL database dump
--

\restrict sDuiiIDMwphcXhiegRaEQfFZZCvAb1Uw6NgMb79DmPgyNICqWdRB5XLp8IKg5GP

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = now();

    RETURN NEW;

END;

$$;



SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    activity_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    activity text,
    ip_address inet,
    created_at timestamp without time zone DEFAULT now()
);



--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    audit_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    details jsonb,
    ip_address character varying(45),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    browser character varying(100),
    operating_system character varying(100),
    endpoint character varying(255),
    http_method character varying(10),
    status_code integer,
    user_agent text
);



--
-- Name: backups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.backups (
    backup_id uuid DEFAULT gen_random_uuid() NOT NULL,
    filename text,
    backup_size bigint,
    storage_path text,
    created_at timestamp without time zone DEFAULT now(),
    status character varying(20)
);



--
-- Name: branches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.branches (
    branch_id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_name character varying(100) NOT NULL,
    address text,
    phone character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    email character varying(100),
    manager_id uuid,
    city character varying(100),
    country character varying(100),
    postal_code character varying(20),
    latitude numeric(10,7),
    longitude numeric(10,7)
);



--
-- Name: business_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_settings (
    setting_id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_name character varying(150) NOT NULL,
    business_type character varying(20) DEFAULT 'BOTH'::character varying NOT NULL,
    currency character varying(10) DEFAULT 'GHS'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    business_email character varying(100),
    phone character varying(30),
    address text,
    logo text,
    website text,
    tax_number character varying(100),
    registration_number character varying(100),
    receipt_footer text,
    timezone character varying(100),
    language character varying(50),
    date_format character varying(50),
    allow_negative_stock boolean DEFAULT false,
    enable_offline_mode boolean DEFAULT true,
    CONSTRAINT business_settings_business_type_check CHECK (((business_type)::text = ANY (ARRAY[('RETAIL'::character varying)::text, ('WHOLESALE'::character varying)::text, ('BOTH'::character varying)::text])))
);



--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    category_id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    parent_category_id uuid,
    image_url text,
    is_active boolean DEFAULT true
);



--
-- Name: customer_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_payments (
    payment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    sale_id uuid,
    amount numeric(12,2),
    payment_method character varying(30),
    payment_date timestamp without time zone DEFAULT now()
);



--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    customer_id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_type character varying(20) DEFAULT 'WALK_IN'::character varying NOT NULL,
    business_name character varying(150),
    contact_name character varying(100),
    phone character varying(20),
    email character varying(100),
    address text,
    credit_limit numeric(12,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    loyalty_points numeric(12,2) DEFAULT 0,
    tax_number character varying(100),
    date_of_birth date,
    gender character varying(20),
    notes text,
    CONSTRAINT customers_customer_type_check CHECK (((customer_type)::text = ANY (ARRAY[('WALK_IN'::character varying)::text, ('RETAIL'::character varying)::text, ('WHOLESALE'::character varying)::text])))
);



--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_categories (
    category_id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_name character varying(100),
    description text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);



--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    expense_id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid,
    recorded_by uuid,
    category character varying(100),
    description text,
    amount numeric(12,2),
    expense_date date,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);



--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_transactions (
    transaction_id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    transaction_type character varying(20) NOT NULL,
    quantity numeric(12,2) NOT NULL,
    reference_type character varying(20),
    reference_id uuid,
    performed_by uuid,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    previous_quantity numeric(12,2),
    new_quantity numeric(12,2),
    unit_cost numeric(12,2),
    transaction_reference character varying(100),
    device_id character varying(100),
    CONSTRAINT inventory_transactions_transaction_type_check CHECK (((transaction_type)::text = ANY (ARRAY[('STOCK_IN'::character varying)::text, ('STOCK_OUT'::character varying)::text, ('ADJUSTMENT'::character varying)::text, ('TRANSFER_IN'::character varying)::text, ('TRANSFER_OUT'::character varying)::text, ('SALE'::character varying)::text, ('DISPOSAL'::character varying)::text])))
);



--
-- Name: inventory_transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_transfers (
    transfer_id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    from_branch_id uuid NOT NULL,
    to_branch_id uuid NOT NULL,
    quantity numeric(12,2) NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    requested_by uuid,
    approved_by uuid,
    requested_at timestamp without time zone DEFAULT now() NOT NULL,
    approved_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    transfer_number character varying(50),
    shipped_at timestamp without time zone,
    received_at timestamp without time zone,
    received_by uuid,
    shipped_by uuid,
    CONSTRAINT inventory_transfers_check CHECK ((from_branch_id <> to_branch_id)),
    CONSTRAINT inventory_transfers_status_check CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('PENDING'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text, ('SHIPPED'::character varying)::text, ('RECEIVED'::character varying)::text, ('COMPLETED'::character varying)::text])))
);



--
-- Name: login_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_history (
    login_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    username character varying(50),
    session_id uuid,
    login_time timestamp without time zone DEFAULT now() NOT NULL,
    logout_time timestamp without time zone,
    ip_address inet,
    user_agent text,
    device character varying(150),
    operating_system character varying(100),
    browser character varying(100),
    successful boolean NOT NULL,
    failure_reason character varying(255),
    location character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);



--
-- Name: message_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_queue (
    id uuid NOT NULL,
    type text NOT NULL,
    payload jsonb,
    attempts integer DEFAULT 0,
    status text DEFAULT 'PENDING'::text,
    next_try timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);



--
-- Name: notification_recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_recipients (
    notification_recipient_id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp without time zone,
    delivered_at timestamp without time zone DEFAULT now()
);



--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    notification_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    branch_id uuid,
    notification_type character varying(30) NOT NULL,
    message text NOT NULL,
    created_by uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    title character varying(200),
    priority character varying(20) DEFAULT 'NORMAL'::character varying,
    expires_at timestamp without time zone,
    deleted_at timestamp without time zone,
    CONSTRAINT notifications_notification_type_check CHECK (((notification_type)::text = ANY (ARRAY[('LOW_STOCK'::character varying)::text, ('SYNC_FAILURE'::character varying)::text, ('BRANCH_SHORTAGE'::character varying)::text, ('TRANSFER_REQUEST'::character varying)::text, ('OTHER'::character varying)::text, ('INFO'::character varying)::text, ('WARNING'::character varying)::text, ('ERROR'::character varying)::text, ('SUCCESS'::character varying)::text, ('EXPIRY_ALERT'::character varying)::text])))
);



--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);



--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    payment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    payment_method character varying(20) NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_date timestamp without time zone DEFAULT now() NOT NULL,
    reference_number character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    received_by uuid,
    payment_status character varying(20) DEFAULT 'SUCCESS'::character varying,
    notes text,
    CONSTRAINT payments_payment_method_check CHECK (((payment_method)::text = ANY (ARRAY[('CASH'::character varying)::text, ('CARD'::character varying)::text, ('MOBILE_MONEY'::character varying)::text, ('BANK_TRANSFER'::character varying)::text, ('CREDIT'::character varying)::text])))
);



--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    permission_id uuid DEFAULT gen_random_uuid() NOT NULL,
    permission_name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);



--
-- Name: price_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_history (
    history_id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    old_price numeric(12,2),
    new_price numeric(12,2),
    changed_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    price_type character varying(20),
    source character varying(20),
    reference_type character varying(50),
    reference_id uuid,
    CONSTRAINT price_history_price_type_check CHECK (((price_type IS NULL) OR ((price_type)::text = ANY (ARRAY['COST'::text, 'RETAIL'::text, 'WHOLESALE'::text])))),
    CONSTRAINT price_history_source_check CHECK (((source IS NULL) OR ((source)::text = ANY (ARRAY['MANUAL'::text, 'PURCHASE'::text]))))
);



--
-- Name: product_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_batches (
    batch_id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    supplier_id uuid,
    po_id uuid,
    batch_number character varying(100),
    expiry_date date,
    received_date date DEFAULT CURRENT_DATE,
    cost_price numeric(12,2),
    quantity_received numeric(12,2) DEFAULT 0 NOT NULL,
    quantity_on_hand numeric(12,2) DEFAULT 0 NOT NULL,
    quantity_reserved numeric(12,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_batches_status_check CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('DEPLETED'::character varying)::text, ('EXPIRED'::character varying)::text, ('DISPOSED'::character varying)::text])))
);



--
-- Name: product_branch_inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_branch_inventory (
    inventory_id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    quantity_on_hand numeric(12,2) DEFAULT 0 NOT NULL,
    reorder_level numeric(12,2) DEFAULT 0 NOT NULL,
    reorder_quantity numeric(12,2) DEFAULT 0 NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    reserved_quantity numeric(12,2) DEFAULT 0,
    damaged_quantity numeric(12,2) DEFAULT 0,
    expired_quantity numeric(12,2) DEFAULT 0,
    available_quantity numeric(12,2) DEFAULT 0,
    last_stock_take timestamp without time zone,
    created_by character varying(100),
    is_active boolean DEFAULT true NOT NULL
);



--
-- Name: product_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_images (
    image_id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    image_url text NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);



--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    product_id uuid DEFAULT gen_random_uuid() NOT NULL,
    sku character varying(50) NOT NULL,
    barcode character varying(100),
    product_name character varying(150) NOT NULL,
    category_id uuid,
    supplier_id uuid,
    base_uom_id uuid NOT NULL,
    cost_price numeric(12,2) DEFAULT 0 NOT NULL,
    retail_price numeric(12,2),
    wholesale_uom_id uuid,
    wholesale_conversion_factor numeric(10,2),
    wholesale_price numeric(12,2),
    wholesale_min_qty numeric(10,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    description text,
    image_url text,
    brand character varying(100),
    model character varying(100),
    manufacturer character varying(150),
    weight numeric(10,2),
    length numeric(10,2),
    width numeric(10,2),
    height numeric(10,2),
    tax_rate numeric(5,2) DEFAULT 0,
    discount_percentage numeric(5,2) DEFAULT 0,
    minimum_stock numeric(12,2) DEFAULT 0,
    maximum_stock numeric(12,2),
    serial_number_required boolean DEFAULT false,
    expiry_required boolean DEFAULT false,
    track_inventory boolean DEFAULT true,
    CONSTRAINT chk_at_least_one_price CHECK (((retail_price IS NOT NULL) OR (wholesale_price IS NOT NULL)))
);



--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_order_items (
    po_item_id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    product_id uuid NOT NULL,
    uom_id uuid NOT NULL,
    quantity_ordered numeric(12,2) NOT NULL,
    quantity_received numeric(12,2) DEFAULT 0 NOT NULL,
    unit_cost numeric(12,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    expiry_date date,
    batch_number character varying(100),
    serial_number character varying(100),
    discount numeric(12,2) DEFAULT 0
);



--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_orders (
    po_id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    created_by uuid,
    order_date timestamp without time zone DEFAULT now() NOT NULL,
    expected_delivery_date date,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    po_number character varying(50),
    approved_date timestamp without time zone,
    approved_by uuid,
    received_date timestamp without time zone,
    payment_status character varying(20) DEFAULT 'UNPAID'::character varying,
    shipping_cost numeric(12,2) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    discount_amount numeric(12,2) DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT purchase_orders_status_check CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('SUBMITTED'::character varying)::text, ('APPROVED'::character varying)::text, ('RECEIVED'::character varying)::text, ('CANCELLED'::character varying)::text])))
);



--
-- Name: receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receipts (
    receipt_id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    receipt_number character varying(50) NOT NULL,
    printed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    qr_code text,
    emailed boolean DEFAULT false,
    printed_by uuid
);



--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    refresh_token_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    revoked boolean DEFAULT false,
    replaced_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);



--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);



--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    role_id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone
);



--
-- Name: sale_item_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sale_item_batches (
    sale_item_id uuid NOT NULL,
    batch_id uuid NOT NULL,
    quantity numeric(12,2) NOT NULL,
    cost_price numeric(12,2)
);



--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sale_items (
    sale_item_id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    product_id uuid NOT NULL,
    uom_id uuid NOT NULL,
    quantity numeric(12,2) NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    line_discount numeric(12,2) DEFAULT 0 NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    cost_price numeric(12,2),
    tax_amount numeric(12,2) DEFAULT 0,
    batch_number character varying(100),
    expiry_date date,
    serial_number character varying(100)
);



--
-- Name: sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales (
    sale_id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    customer_id uuid,
    cashier_id uuid,
    sale_type character varying(20) DEFAULT 'RETAIL'::character varying NOT NULL,
    sale_date timestamp without time zone DEFAULT now() NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    amount_paid numeric(12,2) DEFAULT 0 NOT NULL,
    balance_due numeric(12,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'COMPLETED'::character varying NOT NULL,
    local_transaction_id character varying(100),
    synced boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    invoice_number character varying(50),
    cashier_name character varying(100),
    customer_name character varying(150),
    remarks text,
    device_id character varying(100),
    payment_status character varying(20) DEFAULT 'PAID'::character varying,
    due_date date,
    created_offline boolean DEFAULT false,
    refunded_amount numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT sales_sale_type_check CHECK (((sale_type)::text = ANY (ARRAY[('RETAIL'::character varying)::text, ('WHOLESALE'::character varying)::text]))),
    CONSTRAINT sales_status_check CHECK (((status)::text = ANY (ARRAY[('COMPLETED'::character varying)::text, ('PARTIALLY_PAID'::character varying)::text, ('VOID'::character varying)::text, ('REFUNDED'::character varying)::text, ('PARTIALLY_REFUNDED'::character varying)::text])))
);



--
-- Name: stock_adjustment_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_adjustment_items (
    item_id uuid DEFAULT gen_random_uuid() NOT NULL,
    adjustment_id uuid,
    product_id uuid,
    quantity numeric(12,2),
    adjustment_type character varying(20),
    cost_price numeric(12,2)
);



--
-- Name: stock_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_adjustments (
    adjustment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    adjusted_by uuid,
    reason character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT now()
);



--
-- Name: stock_count_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_count_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    count_id uuid,
    product_id uuid,
    expected_quantity numeric(12,2),
    counted_quantity numeric(12,2),
    difference numeric(12,2)
);



--
-- Name: stock_counts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_counts (
    count_id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid,
    counted_by uuid,
    status character varying(20) DEFAULT 'OPEN'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);



--
-- Name: supplier_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_payments (
    payment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    po_id uuid,
    amount numeric(12,2),
    payment_method character varying(30),
    payment_date timestamp without time zone DEFAULT now(),
    reference_number character varying(100)
);



--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    supplier_id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_name character varying(150) NOT NULL,
    contact_name character varying(100),
    phone character varying(20),
    email character varying(100),
    address text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    company_registration_no character varying(100),
    tax_number character varying(100),
    website text,
    bank_name character varying(100),
    account_name character varying(150),
    account_number character varying(100),
    payment_terms character varying(100)
);



--
-- Name: sync_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sync_logs (
    sync_id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id character varying(100) NOT NULL,
    local_transaction_id character varying(100) NOT NULL,
    entity_type character varying(50) NOT NULL,
    sync_status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    synced_at timestamp without time zone,
    error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    retry_count integer DEFAULT 0,
    sync_duration_ms integer,
    CONSTRAINT sync_logs_sync_status_check CHECK (((sync_status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('SUCCESS'::character varying)::text, ('FAILED'::character varying)::text, ('DUPLICATE'::character varying)::text])))
);



--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    setting_id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);



--
-- Name: units_of_measure; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units_of_measure (
    uom_id uuid DEFAULT gen_random_uuid() NOT NULL,
    uom_name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    symbol character varying(20),
    conversion_factor numeric(12,4) DEFAULT 1,
    is_active boolean DEFAULT true NOT NULL
);



--
-- Name: user_branches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_branches (
    user_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);



--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_sessions (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_identifier character varying(255) NOT NULL,
    issued_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    last_activity_at timestamp without time zone DEFAULT now() NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);



--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid,
    role_id uuid NOT NULL,
    full_name character varying(100) NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100),
    phone character varying(20),
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    password_changed_at timestamp without time zone,
    last_login_ip inet,
    deleted_at timestamp without time zone,
    failed_login_attempts integer DEFAULT 0,
    account_locked boolean DEFAULT false,
    locked_until timestamp without time zone,
    profile_photo text,
    two_factor_enabled boolean DEFAULT false
);



--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_logs (activity_id, user_id, activity, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (audit_id, user_id, action, entity_type, entity_id, details, ip_address, created_at, updated_at, browser, operating_system, endpoint, http_method, status_code, user_agent) FROM stdin;
04212fc2-4f52-4592-9a5d-fb1f26980854	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 17:29:42.717216	2026-10-14 17:29:42.717216	\N	\N	\N	\N	\N	\N
05289683-b2d5-4f75-b4dd-edcf78b2ae62	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	06722868-7459-41f7-8d4e-b0fd967f7ae6	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-14 17:29:42.847755	2026-10-14 17:29:42.847755	\N	\N	\N	\N	\N	\N
5fd4dd66-9055-4fe1-809f-97ff1e0ab224	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 17:29:43.111194	2026-10-14 17:29:43.111194	\N	\N	\N	\N	\N	\N
96fc246e-074a-4221-9afc-b7d1a7386e46	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 17:30:10.251452	2026-10-14 17:30:10.251452	\N	\N	\N	\N	\N	\N
7c175693-d24c-46d8-b12a-a3320b4825c4	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	f1ef16f2-8c77-4e7a-9eb5-7228ab569806	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-14 17:30:10.269491	2026-10-14 17:30:10.269491	\N	\N	\N	\N	\N	\N
e18d1586-e74a-4a0f-9198-e7b4dad230c7	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 17:30:10.374481	2026-10-14 17:30:10.374481	\N	\N	\N	\N	\N	\N
0de18912-0073-48dd-8051-28caa6737c08	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 17:30:37.368111	2026-10-14 17:30:37.368111	\N	\N	\N	\N	\N	\N
e54ba914-03a0-4fc4-8497-998541f62506	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGOUT	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 17:33:11.070393	2026-10-14 17:33:11.070393	\N	\N	\N	\N	\N	\N
7ba274f5-2b9b-4c1b-bb9b-20d8c46360fb	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	f53f34a1-be0b-4228-9744-57f446586df6	{"title": "Logged Out", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-14 17:33:11.094555	2026-10-14 17:33:11.094555	\N	\N	\N	\N	\N	\N
d0bb29e8-ea56-44c0-954d-e88370e7ccf1	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 17:33:43.372977	2026-10-14 17:33:43.372977	\N	\N	\N	\N	\N	\N
901eca94-a9a1-4df5-9593-87f8ad5bd926	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	87e39edb-fff8-4597-82db-bc1f1fbe2653	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-14 17:33:43.417051	2026-10-14 17:33:43.417051	\N	\N	\N	\N	\N	\N
cea22da5-654c-4387-87fd-91164482b34f	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 17:33:43.512095	2026-10-14 17:33:43.512095	\N	\N	\N	\N	\N	\N
c8668dc4-069b-45d5-89be-8b1f66630605	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGOUT	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 17:33:49.40387	2026-10-14 17:33:49.40387	\N	\N	\N	\N	\N	\N
66521fcc-dfad-4d29-acf7-559ddf1554ac	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	d1643494-0b2d-4fb2-8dfb-8fc2caa2f21d	{"title": "Logged Out", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-14 17:33:49.447267	2026-10-14 17:33:49.447267	\N	\N	\N	\N	\N	\N
25b6ead9-a7e5-4ac1-9b5b-36eaab545a3c	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 17:37:56.805729	2026-10-14 17:37:56.805729	\N	\N	\N	\N	\N	\N
5dbe9e5c-c058-4dc6-8fd6-4b8a873110ec	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	20a2acd8-de71-440f-93e6-dc3616c284c0	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-14 17:37:56.842919	2026-10-14 17:37:56.842919	\N	\N	\N	\N	\N	\N
57a29998-23d4-4c7f-b756-09f4888d8084	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 17:37:56.970801	2026-10-14 17:37:56.970801	\N	\N	\N	\N	\N	\N
14b642ec-e173-40a6-b0d3-0f6144ff243a	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	52a4576a-589b-4d8e-8d6a-63c2c7bef3f2	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-14 17:37:57.008615	2026-10-14 17:37:57.008615	\N	\N	\N	\N	\N	\N
92e1f109-8234-4f2b-8243-d5513d49dd9d	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 17:38:37.636844	2026-10-14 17:38:37.636844	\N	\N	\N	\N	\N	\N
be77a98b-3ad3-4624-be14-0dba4c38638f	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	f81b6e45-162b-452e-bc01-4cd6b46bc155	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-14 17:38:37.694803	2026-10-14 17:38:37.694803	\N	\N	\N	\N	\N	\N
6b1ca958-63d7-4533-bc17-9177f08b1879	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 17:38:37.843422	2026-10-14 17:38:37.843422	\N	\N	\N	\N	\N	\N
46425b4f-3f06-4a6f-b5dd-56f691458208	2d513fdd-6742-4d0f-bdaa-35f33753956f	CREATE_UOM	UNIT_OF_MEASURE	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	{"name": "Kilogram"}	\N	2026-10-14 17:43:10.951227	2026-10-14 17:43:10.951227	\N	\N	\N	\N	\N	\N
5b1cd36d-c71f-4261-b998-9de01aa564ae	2d513fdd-6742-4d0f-bdaa-35f33753956f	CREATE_PRODUCT	PRODUCT	3375dd97-ef95-46c1-b65a-52fcfcc97afa	{"sku": "PRD-11CD8967", "name": "Dog Food"}	\N	2026-10-14 17:44:13.26193	2026-10-14 17:44:13.26193	\N	\N	\N	\N	\N	\N
cdfb12ba-3e32-44d6-a38c-a50d383a547d	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 23:21:07.352029	2026-10-14 23:21:07.352029	\N	\N	\N	\N	\N	\N
b057c934-c89c-4990-8737-a6415b8f96c4	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	c4b08150-5545-4e5c-a1fb-994daec43353	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-14 23:21:08.562508	2026-10-14 23:21:08.562508	\N	\N	\N	\N	\N	\N
d0e8875a-c000-4100-949c-ec70254d38e1	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-14 23:21:09.170747	2026-10-14 23:21:09.170747	\N	\N	\N	\N	\N	\N
3ca6bd72-5488-4f43-896e-12451de997d1	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 00:06:26.601701	2026-10-15 00:06:26.601701	\N	\N	\N	\N	\N	\N
59e3f11f-60e1-436e-8c15-1b8a94a50627	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	0bb32904-8c7c-4a7e-a431-f52c19e51d20	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-15 00:06:27.144142	2026-10-15 00:06:27.144142	\N	\N	\N	\N	\N	\N
6120b036-3d0b-4eca-b22c-055b9a74df74	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 00:06:28.497473	2026-10-15 00:06:28.497473	\N	\N	\N	\N	\N	\N
ae0c450c-683b-40c6-afbb-49333697d494	2d513fdd-6742-4d0f-bdaa-35f33753956f	CHANGE_PASSWORD	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 00:06:56.74137	2026-10-15 00:06:56.74137	\N	\N	\N	\N	\N	\N
e482f25e-c1ce-4260-a309-df88741de791	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	61099046-b800-492b-a14b-57eb52ab5329	{"title": "Password Changed", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-15 00:06:56.819259	2026-10-15 00:06:56.819259	\N	\N	\N	\N	\N	\N
a6319689-039f-4597-82bc-9be6a63e8610	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 00:07:25.525383	2026-10-15 00:07:25.525383	\N	\N	\N	\N	\N	\N
20c4bd8b-b6ae-4455-9214-daf3b236cef0	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	2825cb93-cdcc-46e6-bac5-3c2984f6dad8	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-15 00:07:25.554612	2026-10-15 00:07:25.554612	\N	\N	\N	\N	\N	\N
26285796-c074-4f03-91e7-53bce788972f	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 00:07:26.309513	2026-10-15 00:07:26.309513	\N	\N	\N	\N	\N	\N
9c55f3b6-dff9-4c08-9647-2b3ae8705e2c	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 00:16:04.31422	2026-10-15 00:16:04.31422	\N	\N	\N	\N	\N	\N
31c2a93e-48ef-42bb-a2bb-330c79965f30	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	d6062bf2-24a5-4f6c-8fc8-a862a096d8c8	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-15 00:16:04.369757	2026-10-15 00:16:04.369757	\N	\N	\N	\N	\N	\N
f73fe8dd-fdb7-4bd3-9ae7-e41ec245e4e9	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 00:16:05.135106	2026-10-15 00:16:05.135106	\N	\N	\N	\N	\N	\N
3b12b760-9b7f-4065-b3e4-a9419fd6041d	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 00:16:36.051801	2026-10-15 00:16:36.051801	\N	\N	\N	\N	\N	\N
b0a543b9-1446-485f-be9c-614bab182d06	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	afa33adb-ecc5-48cd-8800-7b9594ae1996	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-15 00:16:36.082505	2026-10-15 00:16:36.082505	\N	\N	\N	\N	\N	\N
9c574460-1eeb-41f2-a831-62acb0c8fcfd	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 00:16:36.685838	2026-10-15 00:16:36.685838	\N	\N	\N	\N	\N	\N
a4ee4560-3122-4c92-b1ca-c2215c44b848	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 00:18:15.657186	2026-10-15 00:18:15.657186	\N	\N	\N	\N	\N	\N
2f33a7af-b9f9-4455-954d-0fcad1da6ce3	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	34539625-f882-4059-ac96-79c17053a2cd	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-15 00:18:16.480859	2026-10-15 00:18:16.480859	\N	\N	\N	\N	\N	\N
ebf951b2-eebb-4097-8fd1-cfae5af2f9ec	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 00:18:17.405282	2026-10-15 00:18:17.405282	\N	\N	\N	\N	\N	\N
addb1b28-769f-41bc-8010-b6930526ffde	2d513fdd-6742-4d0f-bdaa-35f33753956f	UPDATE_PRODUCT	PRODUCT	3375dd97-ef95-46c1-b65a-52fcfcc97afa	{"sku": "PRD-11CD8967", "barcode": "IOQ4RNB4Q6ZHU", "quantity": 200, "tax_rate": 0, "branch_id": "134daca6-ec0c-40bb-b6e2-9bae4bf67443", "cost_price": 0, "base_uom_id": "dd1cd0e9-2fbf-4418-987b-99a9b97017e8", "product_name": "Dog Food", "retail_price": 20, "minimum_stock": 0, "reorder_level": 0, "expiry_required": false, "track_inventory": true, "damaged_quantity": 0, "expired_quantity": 0, "reorder_quantity": 0, "reserved_quantity": 0, "available_quantity": 0, "discount_percentage": 0, "serial_number_required": false}	\N	2026-10-15 00:18:40.746378	2026-10-15 00:18:40.746378	\N	\N	\N	\N	\N	\N
ea0f06d4-14ad-4575-9e20-d3cb239dd381	2d513fdd-6742-4d0f-bdaa-35f33753956f	CREATE_SALE	SALE	874689c6-0060-4c6a-8867-03ea82c42852	{"item_count": 1, "total_amount": 20, "invoice_number": "INV-1792023524049"}	\N	2026-10-15 00:18:44.032279	2026-10-15 00:18:44.032279	\N	\N	\N	\N	\N	\N
1827f8e6-d866-427e-8ee3-188d57822d80	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 02:10:20.068655	2026-10-15 02:10:20.068655	\N	\N	\N	\N	\N	\N
fedf677c-5d57-4b8d-b553-80509c0e4a24	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	fb3f7233-5a25-4a2b-a19c-4bcf675fffc1	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-15 02:10:20.336982	2026-10-15 02:10:20.336982	\N	\N	\N	\N	\N	\N
9389256e-67cd-4bd5-ac00-2b0dc0643f6d	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 02:10:21.8033	2026-10-15 02:10:21.8033	\N	\N	\N	\N	\N	\N
a69d31ff-5e2d-46b2-89a0-532d86b89c58	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 11:24:15.718789	2026-10-15 11:24:15.718789	\N	\N	\N	\N	\N	\N
ff1d2a68-ac90-4bb3-b911-22364c5c733f	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	d8975811-dc7e-47f5-9e9a-c4d42636225c	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-15 11:24:16.011297	2026-10-15 11:24:16.011297	\N	\N	\N	\N	\N	\N
17a86366-90ef-4323-a9ef-022735154808	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 11:24:16.548467	2026-10-15 11:24:16.548467	\N	\N	\N	\N	\N	\N
24772e4e-aef0-427e-bfe1-12b230fbac5b	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_supplier	SUPPLIER	34e208b1-3587-441d-b866-6f01072ca24c	{"supplier_name": "Acme"}	\N	2026-10-15 11:24:44.929986	2026-10-15 11:24:44.929986	\N	\N	\N	\N	\N	\N
40f86931-dcc0-46be-88e6-f6183275fed5	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_purchase	PURCHASE	9ab80038-e035-4af7-bf48-6c503a50dc8e	{"supplier_id": "34e208b1-3587-441d-b866-6f01072ca24c", "order_number": "PO-9GBXVH"}	\N	2026-10-15 11:25:06.53335	2026-10-15 11:25:06.53335	\N	\N	\N	\N	\N	\N
25fec4b6-0ad8-4f88-9ba6-c50f95d753a4	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_purchase_item	PURCHASE_ITEM	e557b79f-8676-49fe-9503-fef86c52916f	{"po_id": "9ab80038-e035-4af7-bf48-6c503a50dc8e", "uom_id": "dd1cd0e9-2fbf-4418-987b-99a9b97017e8", "discount": 0, "unit_cost": 0, "product_id": "3375dd97-ef95-46c1-b65a-52fcfcc97afa", "quantity_ordered": 1}	\N	2026-10-15 11:25:37.960137	2026-10-15 11:25:37.960137	\N	\N	\N	\N	\N	\N
8969172a-c691-4ebc-ac6e-df857f23d228	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 18:22:43.108754	2026-10-15 18:22:43.108754	\N	\N	\N	\N	\N	\N
d4881f94-748a-461e-bdd9-2ea47d42bcfd	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	ef763927-5738-4368-af7d-d2a26f05c422	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-15 18:22:43.152008	2026-10-15 18:22:43.152008	\N	\N	\N	\N	\N	\N
0f179225-b481-4149-b086-985641cd7842	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 18:22:43.902135	2026-10-15 18:22:43.902135	\N	\N	\N	\N	\N	\N
ca354d2d-5c75-4d54-949a-4036e40d0bd9	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 18:23:19.902985	2026-10-15 18:23:19.902985	\N	\N	\N	\N	\N	\N
9e3bae26-2367-4cee-8d1e-2c8889c806f1	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	9706207f-1bfd-46b4-a23b-a26092d57a45	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-15 18:23:19.924819	2026-10-15 18:23:19.924819	\N	\N	\N	\N	\N	\N
d5ec157e-cc5c-44e0-886f-63edcd80717f	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 18:23:20.539035	2026-10-15 18:23:20.539035	\N	\N	\N	\N	\N	\N
9c8f9651-cd16-4caa-a6c8-188e5e7efd99	2d513fdd-6742-4d0f-bdaa-35f33753956f	CREATE_CATEGORY	CATEGORY	7be35c6b-8ec5-4264-965a-bddcb13d44fa	{"name": "General"}	\N	2026-10-15 18:38:38.526737	2026-10-15 18:38:38.526737	\N	\N	\N	\N	\N	\N
af085ef5-8a13-4407-bb77-d1e4f8b49cf4	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 18:46:08.564819	2026-10-15 18:46:08.564819	\N	\N	\N	\N	\N	\N
a6aea8d4-bf62-4ba2-8fc7-62895468bed1	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	98312201-ce71-4423-b07d-dc182a7253b9	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-15 18:46:08.591474	2026-10-15 18:46:08.591474	\N	\N	\N	\N	\N	\N
362284eb-7eb4-47eb-9f61-21487257b75f	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 18:46:08.988901	2026-10-15 18:46:08.988901	\N	\N	\N	\N	\N	\N
2186c3ab-2240-455d-bc86-58d5c9235258	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-15 18:54:21.741775	2026-10-15 18:54:21.741775	\N	\N	\N	\N	\N	\N
bf86e5cb-5b44-4ba2-9a2a-90b7fec9a76a	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-16 05:05:19.318742	2026-10-16 05:05:19.318742	\N	\N	\N	\N	\N	\N
9440e5e0-0cdb-4e4a-9cce-167a33492db4	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	dfcd22bd-a698-4b15-911e-a892f04d9a3b	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-16 05:05:19.358528	2026-10-16 05:05:19.358528	\N	\N	\N	\N	\N	\N
a565dc7e-63ee-43d4-8a4c-bf85afe4b3fb	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-16 05:05:20.088872	2026-10-16 05:05:20.088872	\N	\N	\N	\N	\N	\N
362aaf83-d467-4560-91b8-da4fb37dd43f	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-16 05:08:44.013972	2026-10-16 05:08:44.013972	\N	\N	\N	\N	\N	\N
3af0dc7e-d194-4209-b95b-75139acc51ff	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	a8d62d15-7528-4162-b1ce-ac0e6370de64	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-16 05:08:44.064328	2026-10-16 05:08:44.064328	\N	\N	\N	\N	\N	\N
cb74ff46-21c7-4e5c-a74c-7728b3aa3361	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-16 05:09:13.850131	2026-10-16 05:09:13.850131	\N	\N	\N	\N	\N	\N
50b7ccbc-47e3-44c4-ac65-a74af9ec2110	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	82b3b277-787a-4d94-acac-c71b14d87539	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-16 05:09:13.86743	2026-10-16 05:09:13.86743	\N	\N	\N	\N	\N	\N
18e4e674-ba4b-4eb8-9289-12c582a5fa8c	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-16 05:14:41.657454	2026-10-16 05:14:41.657454	\N	\N	\N	\N	\N	\N
a856482a-f722-448a-be3e-d289cd327d43	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	a66d927b-df6c-4094-9fa0-df0e35a46dc0	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-16 05:14:41.703876	2026-10-16 05:14:41.703876	\N	\N	\N	\N	\N	\N
4c91b656-9290-4e3c-9206-21aac7b04cb5	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-16 05:14:42.536158	2026-10-16 05:14:42.536158	\N	\N	\N	\N	\N	\N
964d83c4-dec5-4849-ba36-cc74138ea746	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-16 06:39:31.154431	2026-10-16 06:39:31.154431	\N	\N	\N	\N	\N	\N
9a6e9d4c-e445-4580-a882-623141e843d0	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	a5984324-25e1-48e7-9042-7cd8da8393c7	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-16 06:39:31.299297	2026-10-16 06:39:31.299297	\N	\N	\N	\N	\N	\N
561623af-3ba1-4e8e-94fe-0da730343e76	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-16 06:39:31.534975	2026-10-16 06:39:31.534975	\N	\N	\N	\N	\N	\N
d83d09bc-2ba0-4b63-b4b1-c15fad422704	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-16 06:40:13.314914	2026-10-16 06:40:13.314914	\N	\N	\N	\N	\N	\N
f1f3c5e7-b8f6-4770-8c24-15e8010d40c9	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	d043ecd0-9384-4b92-b1ea-5a95e4f91beb	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-16 06:40:13.341291	2026-10-16 06:40:13.341291	\N	\N	\N	\N	\N	\N
79adc917-b04b-4586-8144-ab2978a9a8f3	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-16 06:40:15.160041	2026-10-16 06:40:15.160041	\N	\N	\N	\N	\N	\N
c8d27daf-1109-4b0a-b0b4-af5f8427619b	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	d043ecd0-9384-4b92-b1ea-5a95e4f91beb	\N	\N	2026-10-16 06:41:16.611226	2026-10-16 06:41:16.611226	\N	\N	\N	\N	\N	\N
0ba4d9cc-8be5-4667-a919-65cb30484a47	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	a5984324-25e1-48e7-9042-7cd8da8393c7	\N	\N	2026-10-16 06:41:17.238374	2026-10-16 06:41:17.238374	\N	\N	\N	\N	\N	\N
4ca2780e-fe95-47a7-8c09-79635d9425ac	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	a66d927b-df6c-4094-9fa0-df0e35a46dc0	\N	\N	2026-10-16 06:41:17.771663	2026-10-16 06:41:17.771663	\N	\N	\N	\N	\N	\N
3d1c6f57-7dc1-469d-b6fc-a1b678a8deda	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	82b3b277-787a-4d94-acac-c71b14d87539	\N	\N	2026-10-16 06:41:18.13593	2026-10-16 06:41:18.13593	\N	\N	\N	\N	\N	\N
89a4a22f-7a22-4f81-8f25-4162d06daa0c	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	a8d62d15-7528-4162-b1ce-ac0e6370de64	\N	\N	2026-10-16 06:41:18.372823	2026-10-16 06:41:18.372823	\N	\N	\N	\N	\N	\N
c67b2ad2-7f2a-431f-8253-00d907cfe74b	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	dfcd22bd-a698-4b15-911e-a892f04d9a3b	\N	\N	2026-10-16 06:41:18.623064	2026-10-16 06:41:18.623064	\N	\N	\N	\N	\N	\N
7d321e25-6fb6-4cc3-b102-8cd580e04f52	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	98312201-ce71-4423-b07d-dc182a7253b9	\N	\N	2026-10-16 06:41:19.171166	2026-10-16 06:41:19.171166	\N	\N	\N	\N	\N	\N
1734965a-0477-4a1b-9bda-3a734214e522	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	9706207f-1bfd-46b4-a23b-a26092d57a45	\N	\N	2026-10-16 06:41:19.754428	2026-10-16 06:41:19.754428	\N	\N	\N	\N	\N	\N
a5ed3803-7ac4-43f0-847f-691e52166734	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	ef763927-5738-4368-af7d-d2a26f05c422	\N	\N	2026-10-16 06:41:21.193885	2026-10-16 06:41:21.193885	\N	\N	\N	\N	\N	\N
df46eb26-7e9c-4022-b053-bef487e7d1b2	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	d8975811-dc7e-47f5-9e9a-c4d42636225c	\N	\N	2026-10-16 06:41:23.507399	2026-10-16 06:41:23.507399	\N	\N	\N	\N	\N	\N
6ecb392a-937e-4628-876a-b0753023b3e9	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	fb3f7233-5a25-4a2b-a19c-4bcf675fffc1	\N	\N	2026-10-16 06:41:23.736665	2026-10-16 06:41:23.736665	\N	\N	\N	\N	\N	\N
41157186-5f0f-4ec9-b254-4bc51f711470	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	34539625-f882-4059-ac96-79c17053a2cd	\N	\N	2026-10-16 06:41:24.109935	2026-10-16 06:41:24.109935	\N	\N	\N	\N	\N	\N
58ed506a-3da1-4d2c-9a9e-480bab435d75	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	afa33adb-ecc5-48cd-8800-7b9594ae1996	\N	\N	2026-10-16 06:41:24.355453	2026-10-16 06:41:24.355453	\N	\N	\N	\N	\N	\N
80167189-b77a-42a5-a840-fe0e4dda5106	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	d6062bf2-24a5-4f6c-8fc8-a862a096d8c8	\N	\N	2026-10-16 06:41:24.609604	2026-10-16 06:41:24.609604	\N	\N	\N	\N	\N	\N
47f431cd-648a-465d-8371-742376df8432	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	2825cb93-cdcc-46e6-bac5-3c2984f6dad8	\N	\N	2026-10-16 06:41:29.189984	2026-10-16 06:41:29.189984	\N	\N	\N	\N	\N	\N
af91cb6f-296f-4b39-8199-1d7a500d0f5f	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	0bb32904-8c7c-4a7e-a431-f52c19e51d20	\N	\N	2026-10-16 06:41:33.00944	2026-10-16 06:41:33.00944	\N	\N	\N	\N	\N	\N
b83a3b99-7f46-416d-a379-0f86395c43dd	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	c4b08150-5545-4e5c-a1fb-994daec43353	\N	\N	2026-10-16 06:41:33.856004	2026-10-16 06:41:33.856004	\N	\N	\N	\N	\N	\N
72a664e2-5be9-43da-81ea-f1d535405bc1	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	52a4576a-589b-4d8e-8d6a-63c2c7bef3f2	\N	\N	2026-10-16 06:41:36.171684	2026-10-16 06:41:36.171684	\N	\N	\N	\N	\N	\N
d3aed6da-cbc9-4862-a8b4-74fb955451ba	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	87e39edb-fff8-4597-82db-bc1f1fbe2653	\N	\N	2026-10-16 06:41:42.486167	2026-10-16 06:41:42.486167	\N	\N	\N	\N	\N	\N
eddabd22-d657-4852-8575-3d09f7614437	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	f1ef16f2-8c77-4e7a-9eb5-7228ab569806	\N	\N	2026-10-16 06:41:43.853155	2026-10-16 06:41:43.853155	\N	\N	\N	\N	\N	\N
2228489e-f985-4ab0-8641-d85648351438	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	f81b6e45-162b-452e-bc01-4cd6b46bc155	\N	\N	2026-10-16 06:41:34.608699	2026-10-16 06:41:34.608699	\N	\N	\N	\N	\N	\N
afd00813-26d7-4ab1-8610-5380c3151a72	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	20a2acd8-de71-440f-93e6-dc3616c284c0	\N	\N	2026-10-16 06:41:38.683407	2026-10-16 06:41:38.683407	\N	\N	\N	\N	\N	\N
2b9bda10-465b-4e85-9c19-5d4a22e5fab2	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	d1643494-0b2d-4fb2-8dfb-8fc2caa2f21d	\N	\N	2026-10-16 06:41:39.799554	2026-10-16 06:41:39.799554	\N	\N	\N	\N	\N	\N
0614363c-0eec-452f-aa7c-46406348543a	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	f53f34a1-be0b-4228-9744-57f446586df6	\N	\N	2026-10-16 06:41:43.207038	2026-10-16 06:41:43.207038	\N	\N	\N	\N	\N	\N
a310dc5c-f3e9-4582-b42d-4ebd128280b4	2d513fdd-6742-4d0f-bdaa-35f33753956f	delete_notification	NOTIFICATION	06722868-7459-41f7-8d4e-b0fd967f7ae6	\N	\N	2026-10-16 06:41:47.893626	2026-10-16 06:41:47.893626	\N	\N	\N	\N	\N	\N
ec33778b-f92c-4ffb-8aab-a19fc50f3157	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 02:59:29.387316	2026-10-17 02:59:29.387316	\N	\N	\N	\N	\N	\N
07060fd0-3fc1-45f4-979e-0236f3262dd3	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	a1d39974-19f6-4f30-9707-6c81129d27a2	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-17 02:59:29.48818	2026-10-17 02:59:29.48818	\N	\N	\N	\N	\N	\N
d54b915d-7546-40e0-bc58-77ec9afff53d	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 02:59:30.41755	2026-10-17 02:59:30.41755	\N	\N	\N	\N	\N	\N
f8483755-00d3-4a2e-aa79-474f03e0b5b4	2d513fdd-6742-4d0f-bdaa-35f33753956f	CREATE_PRODUCT	PRODUCT	71caeff7-55a3-4b4b-89eb-6f9e79fc42f6	{"sku": "C38KEZAY6OUP8", "name": "Bowl"}	\N	2026-10-17 03:01:19.859695	2026-10-17 03:01:19.859695	\N	\N	\N	\N	\N	\N
cbea1493-07c3-4f75-be97-bca60d528bd2	2d513fdd-6742-4d0f-bdaa-35f33753956f	CREATE_SALE	SALE	35655f33-01f4-499f-bf58-2f106d2b5138	{"item_count": 1, "total_amount": 20, "invoice_number": "INV-1792206147580"}	\N	2026-10-17 03:02:27.516025	2026-10-17 03:02:27.516025	\N	\N	\N	\N	\N	\N
bfcbc3ba-15ed-458c-9267-d49ba2513b50	2d513fdd-6742-4d0f-bdaa-35f33753956f	CREATE_PRODUCT	PRODUCT	5e0ba2f4-d92e-4a8e-b353-7caacdb13dd1	{"sku": "8OJE2AQCV6N6Z", "name": "Banana"}	\N	2026-10-17 03:19:11.563376	2026-10-17 03:19:11.563376	\N	\N	\N	\N	\N	\N
2da13346-021c-455a-a0ea-73e13a7f299f	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 03:26:10.887961	2026-10-17 03:26:10.887961	\N	\N	\N	\N	\N	\N
0c62e15f-3dd4-4e2b-83dc-ce90edcc1675	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	abd41615-7677-4ac7-b390-79585617afed	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-17 03:26:11.365513	2026-10-17 03:26:11.365513	\N	\N	\N	\N	\N	\N
24f2ab2f-32df-4def-a784-1e955d3787c2	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 03:26:11.460315	2026-10-17 03:26:11.460315	\N	\N	\N	\N	\N	\N
fb08d045-1c61-40a8-985d-dc1093ff9d42	2d513fdd-6742-4d0f-bdaa-35f33753956f	CREATE_PRODUCT	PRODUCT	d6aeb8dc-5cfa-4363-8fef-91ba3971a6dc	{"sku": "AQDGC4G4AQ5VJ", "name": "Bowl"}	\N	2026-10-17 03:39:32.472357	2026-10-17 03:39:32.472357	\N	\N	\N	\N	\N	\N
06956051-ee32-4e76-b192-839208720b9b	2d513fdd-6742-4d0f-bdaa-35f33753956f	inventory_transaction	INVENTORY	692e841b-fb7a-4321-b036-8bc3362ad2de	{"quantity": 10000, "branch_id": "134daca6-ec0c-40bb-b6e2-9bae4bf67443", "product_id": "3375dd97-ef95-46c1-b65a-52fcfcc97afa", "transaction_type": "STOCK_IN"}	\N	2026-10-17 03:39:35.077497	2026-10-17 03:39:35.077497	\N	\N	\N	\N	\N	\N
2814276f-209f-48f5-a9fa-ca88325e069a	2d513fdd-6742-4d0f-bdaa-35f33753956f	CREATE_PRODUCT	PRODUCT	f03383c6-210b-4143-9b9d-06b6d14149d5	{"sku": "OFFSKU1", "name": "OfflineProbe"}	\N	2026-10-17 04:08:11.073523	2026-10-17 04:08:11.073523	\N	\N	\N	\N	\N	\N
468ebdd1-459a-4c17-aafb-539f72b1af6f	2d513fdd-6742-4d0f-bdaa-35f33753956f	CREATE_PRODUCT	PRODUCT	8a1e3264-3bf1-450b-b781-ac41db10d284	{"sku": "OFFSKU3", "name": "OfflineProbe3"}	\N	2026-10-17 04:48:55.513649	2026-10-17 04:48:55.513649	\N	\N	\N	\N	\N	\N
00c31b15-c76e-4fc0-8ec5-799f15da48ab	2d513fdd-6742-4d0f-bdaa-35f33753956f	inventory_transaction	INVENTORY	f75cf6c3-f6bb-49cf-a20e-62a984d35264	{"quantity": 5, "branch_id": "134daca6-ec0c-40bb-b6e2-9bae4bf67443", "product_id": "8a1e3264-3bf1-450b-b781-ac41db10d284", "transaction_type": "STOCK_IN"}	\N	2026-10-17 04:48:56.209526	2026-10-17 04:48:56.209526	\N	\N	\N	\N	\N	\N
46652348-c0fa-46b8-a306-99d636b8706a	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 05:41:39.332427	2026-10-17 05:41:39.332427	\N	\N	\N	\N	\N	\N
cda93390-25ce-48b9-97a3-b0ce2c455c4e	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	6620093d-d6f7-42c3-a886-31a7f2498dbb	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-17 05:41:39.527231	2026-10-17 05:41:39.527231	\N	\N	\N	\N	\N	\N
ec8c3c78-2388-42c1-a031-4ff1c19b0fc1	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 05:41:39.897339	2026-10-17 05:41:39.897339	\N	\N	\N	\N	\N	\N
2dc47584-1567-43c9-90e3-9a66bd8a44da	2d513fdd-6742-4d0f-bdaa-35f33753956f	inventory_transaction	INVENTORY	caeb31bd-b749-4537-a201-a87044083048	{"quantity": 1000, "branch_id": "134daca6-ec0c-40bb-b6e2-9bae4bf67443", "product_id": "5e0ba2f4-d92e-4a8e-b353-7caacdb13dd1", "transaction_type": "STOCK_IN"}	\N	2026-10-17 06:05:16.607074	2026-10-17 06:05:16.607074	\N	\N	\N	\N	\N	\N
02f1ddfb-6356-4805-910e-aebb854595d0	2d513fdd-6742-4d0f-bdaa-35f33753956f	CREATE_SALE	SALE	20f75bf3-ea10-4880-be2f-3fb4208ec9f1	{"item_count": 3, "total_amount": 410, "invoice_number": "INV-1792217357348"}	\N	2026-10-17 06:09:17.275226	2026-10-17 06:09:17.275226	\N	\N	\N	\N	\N	\N
9bdd9aa5-1b99-4625-9088-6a031834974d	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 06:10:38.736298	2026-10-17 06:10:38.736298	\N	\N	\N	\N	\N	\N
796788b2-25c4-4388-8c64-874a6f8c6b90	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 06:10:40.80792	2026-10-17 06:10:40.80792	\N	\N	\N	\N	\N	\N
85433ca7-0f81-45b4-a813-2479ec9b0515	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 06:10:42.091712	2026-10-17 06:10:42.091712	\N	\N	\N	\N	\N	\N
9c3cd666-4b86-4d26-9bd2-038377265b66	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 06:10:42.965343	2026-10-17 06:10:42.965343	\N	\N	\N	\N	\N	\N
32dfc6cc-a4c6-49a1-a264-3e1285c0b9ec	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 06:10:43.876464	2026-10-17 06:10:43.876464	\N	\N	\N	\N	\N	\N
5d89d7fa-06a8-4cf1-b61d-b37a8bcc8329	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 06:10:44.677849	2026-10-17 06:10:44.677849	\N	\N	\N	\N	\N	\N
ac244f5e-36c5-4755-b2ea-7b03e9a53fd9	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 06:10:45.368864	2026-10-17 06:10:45.368864	\N	\N	\N	\N	\N	\N
c843a88c-fba9-4782-b35e-280a2675ac1b	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 06:10:46.124872	2026-10-17 06:10:46.124872	\N	\N	\N	\N	\N	\N
9871f09a-29b1-47ee-9e33-9584797227d5	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 06:10:46.847687	2026-10-17 06:10:46.847687	\N	\N	\N	\N	\N	\N
3903304c-972e-4db4-bf10-9835b6576ef0	2d513fdd-6742-4d0f-bdaa-35f33753956f	CREATE_BRANCH	BRANCH	77ee81be-60d4-4465-ad02-e3bc04db998a	{"branch_name": "Second"}	\N	2026-10-17 06:11:08.604587	2026-10-17 06:11:08.604587	\N	\N	\N	\N	\N	\N
23d909fa-0901-4e5c-a3d2-b06c1be8adda	2d513fdd-6742-4d0f-bdaa-35f33753956f	ASSIGN_BRANCH	USER_BRANCH	\N	{"user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f", "branch_id": "77ee81be-60d4-4465-ad02-e3bc04db998a"}	\N	2026-10-17 06:11:18.515264	2026-10-17 06:11:18.515264	\N	\N	\N	\N	\N	\N
4aa87ad6-567d-486c-8399-8957cc6f07f9	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	19404381-3927-4da6-8d4e-dcbfecfb28d5	{"title": "Branch Assigned", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-17 06:11:18.562499	2026-10-17 06:11:18.562499	\N	\N	\N	\N	\N	\N
766953b6-172c-45fc-90b9-54420164be97	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 06:11:58.570665	2026-10-17 06:11:58.570665	\N	\N	\N	\N	\N	\N
75f47083-5d54-47fc-aae9-956d1010da12	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 12:44:29.587683	2026-10-17 12:44:29.587683	\N	\N	\N	\N	\N	\N
68ca112c-37e2-49d5-9a34-e2b2d41b9251	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	f380f90d-bcc9-4c1b-bbdb-cfef04b55559	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-17 12:44:29.70544	2026-10-17 12:44:29.70544	\N	\N	\N	\N	\N	\N
7b62ab43-e506-4f8a-8d5a-b6aa73eb22e6	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 12:44:31.471495	2026-10-17 12:44:31.471495	\N	\N	\N	\N	\N	\N
ef6136b2-bd8c-4d76-834f-83505e4fd0fa	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 12:54:53.562964	2026-10-17 12:54:53.562964	\N	\N	\N	\N	\N	\N
30ab20a5-5d54-46d5-9ec6-02a96b2c70f3	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	0e49eae5-9e39-4bcc-a6e8-b93e94bfb541	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-17 12:54:53.623305	2026-10-17 12:54:53.623305	\N	\N	\N	\N	\N	\N
7c7c99e9-acc9-4647-825b-11ea5719c0d9	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 12:54:57.67114	2026-10-17 12:54:57.67114	\N	\N	\N	\N	\N	\N
784fd03b-d578-4caa-987b-fba93dfb92ec	2d513fdd-6742-4d0f-bdaa-35f33753956f	LOGIN	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 12:55:26.607917	2026-10-17 12:55:26.607917	\N	\N	\N	\N	\N	\N
31a7a21a-e39f-460e-add9-1cee2dae69fc	2d513fdd-6742-4d0f-bdaa-35f33753956f	create_notification	NOTIFICATION	57c127b9-6aab-41bc-beed-5824d235a179	{"title": "New Login", "target": "USERS", "user_id": "2d513fdd-6742-4d0f-bdaa-35f33753956f"}	\N	2026-10-17 12:55:26.644305	2026-10-17 12:55:26.644305	\N	\N	\N	\N	\N	\N
e4e67f54-a592-4c3b-891f-9c9dc1ba1f79	2d513fdd-6742-4d0f-bdaa-35f33753956f	SELECT_BRANCH	USER	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	\N	2026-10-17 12:55:29.543334	2026-10-17 12:55:29.543334	\N	\N	\N	\N	\N	\N
0b024b0d-1e65-419a-befb-1d5160b0157e	2d513fdd-6742-4d0f-bdaa-35f33753956f	CREATE_PRODUCT	PRODUCT	d1c4395e-4a0c-4de1-8fb8-685402c09db2	{"sku": "0S2GBFKMZRK64", "name": "Goat meat"}	\N	2026-10-17 12:57:22.298471	2026-10-17 12:57:22.298471	\N	\N	\N	\N	\N	\N
b5fde769-a571-4f9e-b1d6-d3b10141f23b	2d513fdd-6742-4d0f-bdaa-35f33753956f	inventory_transaction	INVENTORY	9e365a83-34d1-4db1-8c87-868040c85bfd	{"quantity": 200, "branch_id": "134daca6-ec0c-40bb-b6e2-9bae4bf67443", "product_id": "d1c4395e-4a0c-4de1-8fb8-685402c09db2", "transaction_type": "STOCK_IN"}	\N	2026-10-17 12:57:22.535965	2026-10-17 12:57:22.535965	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: backups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.backups (backup_id, filename, backup_size, storage_path, created_at, status) FROM stdin;
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branches (branch_id, branch_name, address, phone, is_active, created_at, updated_at, email, manager_id, city, country, postal_code, latitude, longitude) FROM stdin;
134daca6-ec0c-40bb-b6e2-9bae4bf67443	Main Branch	\N	\N	t	2026-10-14 17:15:22.494521	2026-10-14 17:15:22.494521	\N	\N	\N	\N	\N	\N	\N
77ee81be-60d4-4465-ad02-e3bc04db998a	Second	\N	\N	t	2026-10-17 06:11:08.598811	2026-10-17 06:11:08.598811	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: business_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_settings (setting_id, business_name, business_type, currency, created_at, updated_at, business_email, phone, address, logo, website, tax_number, registration_number, receipt_footer, timezone, language, date_format, allow_negative_stock, enable_offline_mode) FROM stdin;
def67589-d079-4556-809e-a0310a13f49f	My Business	BOTH	GHS	2026-10-14 17:15:22.499602	2026-10-14 17:15:22.499602	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	t
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (category_id, category_name, description, created_at, updated_at, parent_category_id, image_url, is_active) FROM stdin;
7be35c6b-8ec5-4264-965a-bddcb13d44fa	General	\N	2026-10-15 18:38:38.522192	2026-10-15 18:38:38.522192	\N	\N	t
\.


--
-- Data for Name: customer_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_payments (payment_id, customer_id, sale_id, amount, payment_method, payment_date) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (customer_id, customer_type, business_name, contact_name, phone, email, address, credit_limit, is_active, created_at, updated_at, loyalty_points, tax_number, date_of_birth, gender, notes) FROM stdin;
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_categories (category_id, category_name, description, updated_at) FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (expense_id, branch_id, recorded_by, category, description, amount, expense_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_transactions (transaction_id, product_id, branch_id, transaction_type, quantity, reference_type, reference_id, performed_by, notes, created_at, updated_at, previous_quantity, new_quantity, unit_cost, transaction_reference, device_id) FROM stdin;
692e841b-fb7a-4321-b036-8bc3362ad2de	3375dd97-ef95-46c1-b65a-52fcfcc97afa	134daca6-ec0c-40bb-b6e2-9bae4bf67443	STOCK_IN	10000.00	\N	\N	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	2026-10-17 03:39:34.981946	2026-10-17 03:39:34.981946	198.00	10198.00	23.00	\N	\N
f75cf6c3-f6bb-49cf-a20e-62a984d35264	8a1e3264-3bf1-450b-b781-ac41db10d284	134daca6-ec0c-40bb-b6e2-9bae4bf67443	STOCK_IN	5.00	\N	\N	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	2026-10-17 04:48:56.009751	2026-10-17 04:48:56.009751	0.00	5.00	\N	\N	\N
caeb31bd-b749-4537-a201-a87044083048	5e0ba2f4-d92e-4a8e-b353-7caacdb13dd1	134daca6-ec0c-40bb-b6e2-9bae4bf67443	STOCK_IN	1000.00	\N	\N	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	2026-10-17 06:05:16.476804	2026-10-17 06:05:16.476804	0.00	1000.00	\N	\N	\N
9e365a83-34d1-4db1-8c87-868040c85bfd	d1c4395e-4a0c-4de1-8fb8-685402c09db2	134daca6-ec0c-40bb-b6e2-9bae4bf67443	STOCK_IN	200.00	\N	\N	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	2026-10-17 12:57:22.509189	2026-10-17 12:57:22.509189	0.00	200.00	\N	\N	\N
\.


--
-- Data for Name: inventory_transfers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_transfers (transfer_id, product_id, from_branch_id, to_branch_id, quantity, status, requested_by, approved_by, requested_at, approved_at, notes, created_at, updated_at, transfer_number, shipped_at, received_at, received_by, shipped_by) FROM stdin;
\.


--
-- Data for Name: login_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.login_history (login_id, user_id, username, session_id, login_time, logout_time, ip_address, user_agent, device, operating_system, browser, successful, failure_reason, location, created_at) FROM stdin;
aae460fa-b741-49e9-8b18-da59db7fe013	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	ea7f8978-dbdb-4400-82db-e422298f0dfb	2026-10-15 00:07:25.510504	\N	::ffff:172.18.0.1	okhttp/4.9.2	dev-mv8s2tmp-ouwydpgcab	\N	\N	t	\N	\N	2026-10-15 00:07:25.510504
ce454d93-9c60-43a0-a702-15cadf739d3e	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	2ce6f316-017a-4bc5-a396-9261bb3bb6ee	2026-10-15 00:16:04.281226	\N	::ffff:172.18.0.1	okhttp/4.9.2	dev-mv8sfcyr-znvk52qg6l	\N	\N	t	\N	\N	2026-10-15 00:16:04.281226
d0b301cb-96bb-49b4-ada3-4d4d932ba89e	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	9355c895-a186-4b08-86b8-6564704fab0e	2026-10-15 00:16:36.042044	\N	::ffff:172.18.0.1	okhttp/4.9.2	dev-mv8sfcyr-znvk52qg6l	\N	\N	t	\N	\N	2026-10-15 00:16:36.042044
984b3f40-8a1c-489c-b741-1d7dc3a811c3	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	c9d89e5b-acf8-4b40-a666-97e840c0900e	2026-10-15 18:22:43.041288	\N	::ffff:172.18.0.1	okhttp/4.9.2	dev-mv9v6uhn-xamnksutte	\N	\N	t	\N	\N	2026-10-15 18:22:43.041288
3d694be2-d134-44d3-8e26-b010fb7f6cea	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	3a958ede-4700-47ff-918a-d58f2d2b7dc9	2026-10-15 18:23:19.892355	\N	::ffff:172.18.0.1	okhttp/4.9.2	dev-mv9v6uhn-xamnksutte	\N	\N	t	\N	\N	2026-10-15 18:23:19.892355
50f06697-0c41-403c-b1d5-84cf8dcd8e0c	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-14 17:30:10.24665	\N	::ffff:172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) desktop-client/1.0.0 Chrome/148.0.7778.271 Electron/42.5.0 Safari/537.36	e7687d76-cf63-4f3f-a6b5-24470e7cf15f	\N	\N	t	\N	\N	2026-10-14 17:30:10.24665
598ba625-6766-468a-a3d4-a6ac57765006	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-14 17:33:43.364648	\N	::ffff:172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) desktop-client/1.0.0 Chrome/148.0.7778.271 Electron/42.5.0 Safari/537.36	e7687d76-cf63-4f3f-a6b5-24470e7cf15f	\N	\N	t	\N	\N	2026-10-14 17:33:43.364648
cf80b021-bdd2-4f16-a9f6-27492617c02b	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-14 17:29:42.638843	\N	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0	7dd79138-6c87-4e40-866e-54e90026b031	\N	\N	t	\N	\N	2026-10-14 17:29:42.638843
ff2b1d15-60a5-4487-b2fc-e137fa839382	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-14 23:21:07.324017	\N	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0	7dd79138-6c87-4e40-866e-54e90026b031	\N	\N	t	\N	\N	2026-10-14 23:21:07.324017
e6ae739d-d160-4050-8bce-622faff31bdc	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-14 17:37:56.788439	\N	::ffff:172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) desktop-client/1.0.0 Chrome/148.0.7778.271 Electron/42.5.0 Safari/537.36	e7687d76-cf63-4f3f-a6b5-24470e7cf15f	\N	\N	t	\N	\N	2026-10-14 17:37:56.788439
695b9f6a-3a45-4e4d-9c53-9ffebdc54154	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-14 17:37:56.962369	\N	::ffff:172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) desktop-client/1.0.0 Chrome/148.0.7778.271 Electron/42.5.0 Safari/537.36	e7687d76-cf63-4f3f-a6b5-24470e7cf15f	\N	\N	t	\N	\N	2026-10-14 17:37:56.962369
3022ad6d-bbcb-4833-8f09-ec06fbd22ea3	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-14 17:38:37.627476	\N	::ffff:172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) desktop-client/1.0.0 Chrome/148.0.7778.271 Electron/42.5.0 Safari/537.36	e7687d76-cf63-4f3f-a6b5-24470e7cf15f	\N	\N	t	\N	\N	2026-10-14 17:38:37.627476
855438f2-bdcc-439b-bbfd-cd4f733faf74	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-15 00:06:26.258159	\N	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0	7dd79138-6c87-4e40-866e-54e90026b031	\N	\N	t	\N	\N	2026-10-15 00:06:26.258159
1c5bffb2-506e-4664-bcc7-a1a6ee85b4fe	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-15 00:18:15.512012	\N	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0	7dd79138-6c87-4e40-866e-54e90026b031	\N	\N	t	\N	\N	2026-10-15 00:18:15.512012
9ce6cb49-de5e-448e-99e3-a5b2c44856d1	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-15 02:10:19.917975	\N	::ffff:172.18.0.1	okhttp/4.9.2	dev-mv8wi4f3-t1gl2qqaus	\N	\N	t	\N	\N	2026-10-15 02:10:19.917975
8c39a8b5-1901-48d2-829f-9cca023bb49a	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-15 18:46:08.540704	\N	::ffff:172.18.0.1	okhttp/4.9.2	dev-mv9w2rxt-erz8wtwsjq	\N	\N	t	\N	\N	2026-10-15 18:46:08.540704
d92883a5-f7fb-4f55-a512-94766b686e27	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	75ced618-c032-41aa-ab7c-481619eaa523	2026-10-16 05:05:19.260235	\N	::ffff:172.18.0.1	okhttp/4.12.0	dev-mvaedfao-u77z9nvetc	\N	\N	t	\N	\N	2026-10-16 05:05:19.260235
9f07263c-0fca-430e-a576-744d751093c7	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	2f433054-6c27-4709-a79e-379c40dbe5e7	2026-10-16 05:08:43.983196	\N	::ffff:172.18.0.1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.9711	\N	\N	\N	t	\N	\N	2026-10-16 05:08:43.983196
d13e49ce-bc2b-4303-88da-f8f3890caf1c	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	c972f5e4-6e75-4c69-b00f-5171a3b6ab8e	2026-10-16 05:09:13.843878	\N	::ffff:172.18.0.1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.9711	\N	\N	\N	t	\N	\N	2026-10-16 05:09:13.843878
a7035dad-fad3-4613-9764-5384169e1c7c	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	8419ed5f-26f5-4cc0-9010-eca74d8aa206	2026-10-17 02:59:29.329459	\N	::ffff:172.18.0.1	okhttp/4.12.0	dev-mvaih3kc-jg9pa7u3kk	\N	\N	t	\N	\N	2026-10-17 02:59:29.329459
a348d2c3-a6f4-4aab-a275-9237cf88c49f	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-16 05:14:41.640746	\N	::ffff:172.18.0.1	okhttp/4.12.0	dev-mvaih3kc-jg9pa7u3kk	\N	\N	t	\N	\N	2026-10-16 05:14:41.640746
1412f9e8-eec5-446e-a80c-6d39fddd7295	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-15 11:24:15.649	\N	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0	7dd79138-6c87-4e40-866e-54e90026b031	\N	\N	t	\N	\N	2026-10-15 11:24:15.649
df6e28e7-dfdc-4829-a223-ba2df8381ec9	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-16 06:40:13.297927	\N	::ffff:172.18.0.1	okhttp/4.12.0	dev-mvaih3kc-jg9pa7u3kk	\N	\N	t	\N	\N	2026-10-16 06:40:13.297927
7bebe709-1a42-4beb-b871-a9d03dd91a6d	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-16 06:39:31.118544	\N	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0	7dd79138-6c87-4e40-866e-54e90026b031	\N	\N	t	\N	\N	2026-10-16 06:39:31.118544
66a695d9-257d-4c56-b6fb-9d71fd2065c1	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	\N	2026-10-17 03:26:10.860212	\N	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0	7dd79138-6c87-4e40-866e-54e90026b031	\N	\N	t	\N	\N	2026-10-17 03:26:10.860212
ceb86d86-58ec-4840-be79-4c52971dc696	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	fcd1add2-b321-4180-968a-678a8986ed69	2026-10-17 05:41:39.275104	\N	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0	7dd79138-6c87-4e40-866e-54e90026b031	\N	\N	t	\N	\N	2026-10-17 05:41:39.275104
9adc1281-240a-45e6-8741-c4b69b8b8001	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	7d876d91-6785-48e0-9d77-cf6686054f29	2026-10-17 12:44:29.549462	\N	::ffff:172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) desktop-client/1.0.0 Chrome/148.0.7778.271 Electron/42.5.0 Safari/537.36	e7687d76-cf63-4f3f-a6b5-24470e7cf15f	\N	\N	t	\N	\N	2026-10-17 12:44:29.549462
8829e1e5-37e2-421b-b026-72fff25d43c6	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	da2d2be3-c2a3-471f-bb76-922f3660930e	2026-10-17 12:54:53.521133	\N	::ffff:172.18.0.1	okhttp/4.9.2	dev-mvceeibs-b5gtwdm47m	\N	\N	t	\N	\N	2026-10-17 12:54:53.521133
939f39a8-bb2f-426a-bb12-4d3c9b244c3d	2d513fdd-6742-4d0f-bdaa-35f33753956f	admin	ed468320-802c-40f8-b5f6-9905d1f046bb	2026-10-17 12:55:26.597309	\N	::ffff:172.18.0.1	okhttp/4.9.2	dev-mvceeibs-b5gtwdm47m	\N	\N	t	\N	\N	2026-10-17 12:55:26.597309
\.


--
-- Data for Name: message_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_queue (id, type, payload, attempts, status, next_try, last_error, created_at, updated_at) FROM stdin;
ebb9beb3-ceb6-4fc4-9136-b16549040fce	email	{"to": "admin@example.com", "html": "<p>Your password has been changed successfully.</p>", "text": "Your password has been changed successfully.", "subject": "Password Changed"}	0	COMPLETED	\N	\N	2026-10-15 00:06:56.855648+00	2026-10-15 00:07:15.632407+00
5b696661-4cb9-4e48-804e-574e8ea1ae57	email	{"to": "admin@example.com", "html": "<p>You have been assigned to branch Second.</p>", "text": "You have been assigned to branch Second.", "subject": "Branch Assigned"}	0	COMPLETED	\N	\N	2026-10-17 06:11:18.570007+00	2026-10-17 06:11:29.845663+00
\.


--
-- Data for Name: notification_recipients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_recipients (notification_recipient_id, notification_id, user_id, is_read, read_at, delivered_at) FROM stdin;
929f2abe-f7ea-4b13-b5be-9538336ae88b	06722868-7459-41f7-8d4e-b0fd967f7ae6	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-14 17:29:42.750136
ccb7aa28-3810-414e-83c8-68a6336ea68d	f1ef16f2-8c77-4e7a-9eb5-7228ab569806	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-14 17:30:10.258125
a152eddc-584d-4790-b35a-0dffe661566b	f53f34a1-be0b-4228-9744-57f446586df6	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-14 17:33:11.078362
365e1f66-7662-4304-b6cc-ba6c1328369b	87e39edb-fff8-4597-82db-bc1f1fbe2653	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-14 17:33:43.383143
4e1aa584-e557-4e93-9d89-36609836331b	d1643494-0b2d-4fb2-8dfb-8fc2caa2f21d	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-14 17:33:49.413226
3b8362f8-1bfa-488d-b3ab-a5c5501b9f98	20a2acd8-de71-440f-93e6-dc3616c284c0	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-14 17:37:56.814563
203bcf9b-44b2-4937-82b1-34fcbca565d3	52a4576a-589b-4d8e-8d6a-63c2c7bef3f2	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-14 17:37:56.987688
9453cfae-bf5d-4eaa-ad4c-8db2698c4b19	f81b6e45-162b-452e-bc01-4cd6b46bc155	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-14 17:38:37.6434
b112c45a-df1b-4126-8d55-71ed440b260b	c4b08150-5545-4e5c-a1fb-994daec43353	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-14 23:21:07.366577
6d9dcfef-821a-49ee-93d6-78e03da332bc	0bb32904-8c7c-4a7e-a431-f52c19e51d20	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-15 00:06:26.659198
ad2042aa-7f42-4d2c-8be0-b4a386a1ee0e	61099046-b800-492b-a14b-57eb52ab5329	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-15 00:06:56.765649
6a63a7cd-0775-4d6f-8376-cbf8f05279af	2825cb93-cdcc-46e6-bac5-3c2984f6dad8	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-15 00:07:25.539676
77892597-e279-4874-9dd3-86b281020b50	d6062bf2-24a5-4f6c-8fc8-a862a096d8c8	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-15 00:16:04.342635
7050b0cc-44ce-4a2a-9a8c-69e5e1f3bfb3	afa33adb-ecc5-48cd-8800-7b9594ae1996	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-15 00:16:36.064352
da6f68fe-2499-4e91-9961-51c572878e6e	34539625-f882-4059-ac96-79c17053a2cd	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-15 00:18:15.786155
8f9c51ce-242a-4d21-89d8-7f8b9c87b56d	fb3f7233-5a25-4a2b-a19c-4bcf675fffc1	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-15 02:10:20.169043
6d07f698-de83-4ac9-a4df-701403afab95	d8975811-dc7e-47f5-9e9a-c4d42636225c	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-15 11:24:15.759475
fd28d30f-d248-463c-905b-7c3b63197837	ef763927-5738-4368-af7d-d2a26f05c422	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-15 18:22:43.131686
a7092351-f4ad-4c51-b610-a32f299db14c	9706207f-1bfd-46b4-a23b-a26092d57a45	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-15 18:23:19.912115
08ff8aea-5feb-4fe1-9e0d-263ee82e1731	98312201-ce71-4423-b07d-dc182a7253b9	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-15 18:46:08.57463
79831afe-0c42-4790-9e13-01743932196c	dfcd22bd-a698-4b15-911e-a892f04d9a3b	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-16 05:05:19.341284
2ce84ea9-0e06-4bc2-aa5e-23f357863eeb	a8d62d15-7528-4162-b1ce-ac0e6370de64	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-16 05:08:44.02981
2d84bd10-98d0-4881-b817-20dd39af13b5	82b3b277-787a-4d94-acac-c71b14d87539	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-16 05:09:13.854029
ac6cc020-38a9-44fd-ac67-d736c141e861	a66d927b-df6c-4094-9fa0-df0e35a46dc0	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-16 05:14:41.674844
3a07c21c-152f-46d1-950a-dd07f744dfd4	a5984324-25e1-48e7-9042-7cd8da8393c7	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-16 06:39:31.170562
ed3f930f-7bd4-4eec-a81c-fd5436808167	d043ecd0-9384-4b92-b1ea-5a95e4f91beb	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-16 06:40:13.326451
2e46cb3d-3dd6-4dcb-add0-a025e526b84a	a1d39974-19f6-4f30-9707-6c81129d27a2	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-17 02:59:29.422113
9e58b1bc-19b8-4ff5-899b-df8a3a20fd68	abd41615-7677-4ac7-b390-79585617afed	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-17 03:26:10.913989
a9debba0-3357-411b-8364-2e77f632d1fe	6620093d-d6f7-42c3-a886-31a7f2498dbb	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-17 05:41:39.354536
0948db72-926a-41dc-ad11-aa5c879bf26c	19404381-3927-4da6-8d4e-dcbfecfb28d5	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-17 06:11:18.526064
d903a552-1300-475b-9fb2-dcc89bdb4425	f380f90d-bcc9-4c1b-bbdb-cfef04b55559	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-17 12:44:29.612886
1d7d4f64-b1e6-4ea2-b5f8-fed735a17abb	0e49eae5-9e39-4bcc-a6e8-b93e94bfb541	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-17 12:54:53.579505
05f67d1f-e728-4318-b5e2-c71a8127021b	57c127b9-6aab-41bc-beed-5824d235a179	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	\N	2026-10-17 12:55:26.619275
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (notification_id, user_id, branch_id, notification_type, message, created_by, is_read, created_at, updated_at, title, priority, expires_at, deleted_at) FROM stdin;
61099046-b800-492b-a14b-57eb52ab5329	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	Your password has been changed successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-15 00:06:56.765649	2026-10-15 00:06:56.765649	Password Changed	HIGH	\N	\N
d043ecd0-9384-4b92-b1ea-5a95e4f91beb	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-16 06:40:13.326451	2026-10-16 06:41:16.606647	New Login	LOW	\N	2026-10-16 06:41:16.606647
a5984324-25e1-48e7-9042-7cd8da8393c7	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-16 06:39:31.170562	2026-10-16 06:41:17.233632	New Login	LOW	\N	2026-10-16 06:41:17.233632
a66d927b-df6c-4094-9fa0-df0e35a46dc0	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-16 05:14:41.674844	2026-10-16 06:41:17.768866	New Login	LOW	\N	2026-10-16 06:41:17.768866
82b3b277-787a-4d94-acac-c71b14d87539	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-16 05:09:13.854029	2026-10-16 06:41:18.129015	New Login	LOW	\N	2026-10-16 06:41:18.129015
a8d62d15-7528-4162-b1ce-ac0e6370de64	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-16 05:08:44.02981	2026-10-16 06:41:18.369302	New Login	LOW	\N	2026-10-16 06:41:18.369302
dfcd22bd-a698-4b15-911e-a892f04d9a3b	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-16 05:05:19.341284	2026-10-16 06:41:18.618729	New Login	LOW	\N	2026-10-16 06:41:18.618729
98312201-ce71-4423-b07d-dc182a7253b9	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-15 18:46:08.57463	2026-10-16 06:41:19.166897	New Login	LOW	\N	2026-10-16 06:41:19.166897
9706207f-1bfd-46b4-a23b-a26092d57a45	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-15 18:23:19.912115	2026-10-16 06:41:19.750742	New Login	LOW	\N	2026-10-16 06:41:19.750742
ef763927-5738-4368-af7d-d2a26f05c422	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-15 18:22:43.131686	2026-10-16 06:41:21.191112	New Login	LOW	\N	2026-10-16 06:41:21.191112
d8975811-dc7e-47f5-9e9a-c4d42636225c	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-15 11:24:15.759475	2026-10-16 06:41:23.504144	New Login	LOW	\N	2026-10-16 06:41:23.504144
fb3f7233-5a25-4a2b-a19c-4bcf675fffc1	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-15 02:10:20.169043	2026-10-16 06:41:23.717216	New Login	LOW	\N	2026-10-16 06:41:23.717216
34539625-f882-4059-ac96-79c17053a2cd	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-15 00:18:15.786155	2026-10-16 06:41:24.10702	New Login	LOW	\N	2026-10-16 06:41:24.10702
afa33adb-ecc5-48cd-8800-7b9594ae1996	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-15 00:16:36.064352	2026-10-16 06:41:24.346724	New Login	LOW	\N	2026-10-16 06:41:24.346724
d6062bf2-24a5-4f6c-8fc8-a862a096d8c8	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-15 00:16:04.342635	2026-10-16 06:41:24.605853	New Login	LOW	\N	2026-10-16 06:41:24.605853
2825cb93-cdcc-46e6-bac5-3c2984f6dad8	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-15 00:07:25.539676	2026-10-16 06:41:29.184029	New Login	LOW	\N	2026-10-16 06:41:29.184029
0bb32904-8c7c-4a7e-a431-f52c19e51d20	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-15 00:06:26.659198	2026-10-16 06:41:33.006585	New Login	LOW	\N	2026-10-16 06:41:33.006585
c4b08150-5545-4e5c-a1fb-994daec43353	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-14 23:21:07.366577	2026-10-16 06:41:33.852299	New Login	LOW	\N	2026-10-16 06:41:33.852299
f81b6e45-162b-452e-bc01-4cd6b46bc155	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-14 17:38:37.6434	2026-10-16 06:41:34.605748	New Login	LOW	\N	2026-10-16 06:41:34.605748
52a4576a-589b-4d8e-8d6a-63c2c7bef3f2	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-14 17:37:56.987688	2026-10-16 06:41:36.167134	New Login	LOW	\N	2026-10-16 06:41:36.167134
20a2acd8-de71-440f-93e6-dc3616c284c0	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-14 17:37:56.814563	2026-10-16 06:41:38.679855	New Login	LOW	\N	2026-10-16 06:41:38.679855
d1643494-0b2d-4fb2-8dfb-8fc2caa2f21d	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged out successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-14 17:33:49.413226	2026-10-16 06:41:39.796593	Logged Out	LOW	\N	2026-10-16 06:41:39.796593
87e39edb-fff8-4597-82db-bc1f1fbe2653	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-14 17:33:43.383143	2026-10-16 06:41:42.483177	New Login	LOW	\N	2026-10-16 06:41:42.483177
f53f34a1-be0b-4228-9744-57f446586df6	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged out successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-14 17:33:11.078362	2026-10-16 06:41:43.204726	Logged Out	LOW	\N	2026-10-16 06:41:43.204726
f1ef16f2-8c77-4e7a-9eb5-7228ab569806	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-14 17:30:10.258125	2026-10-16 06:41:43.847203	New Login	LOW	\N	2026-10-16 06:41:43.847203
06722868-7459-41f7-8d4e-b0fd967f7ae6	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-14 17:29:42.750136	2026-10-16 06:41:47.886363	New Login	LOW	\N	2026-10-16 06:41:47.886363
a1d39974-19f6-4f30-9707-6c81129d27a2	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-17 02:59:29.422113	2026-10-17 02:59:29.422113	New Login	LOW	\N	\N
abd41615-7677-4ac7-b390-79585617afed	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-17 03:26:10.913989	2026-10-17 03:26:10.913989	New Login	LOW	\N	\N
6620093d-d6f7-42c3-a886-31a7f2498dbb	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-17 05:41:39.354536	2026-10-17 05:41:39.354536	New Login	LOW	\N	\N
19404381-3927-4da6-8d4e-dcbfecfb28d5	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You have been assigned to branch Second.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-17 06:11:18.526064	2026-10-17 06:11:18.526064	Branch Assigned	NORMAL	\N	\N
f380f90d-bcc9-4c1b-bbdb-cfef04b55559	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-17 12:44:29.612886	2026-10-17 12:44:29.612886	New Login	LOW	\N	\N
0e49eae5-9e39-4bcc-a6e8-b93e94bfb541	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-17 12:54:53.579505	2026-10-17 12:54:53.579505	New Login	LOW	\N	\N
57c127b9-6aab-41bc-beed-5824d235a179	2d513fdd-6742-4d0f-bdaa-35f33753956f	\N	INFO	You logged in successfully.	2d513fdd-6742-4d0f-bdaa-35f33753956f	f	2026-10-17 12:55:26.619275	2026-10-17 12:55:26.619275	New Login	LOW	\N	\N
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, used, created_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (payment_id, sale_id, payment_method, amount, payment_date, reference_number, created_at, updated_at, received_by, payment_status, notes) FROM stdin;
624276d7-02e2-430d-8507-274b2fecef5b	874689c6-0060-4c6a-8867-03ea82c42852	CASH	20.00	2026-10-15 00:18:44.032279	\N	2026-10-15 00:18:44.032279	2026-10-15 00:18:44.032279	2d513fdd-6742-4d0f-bdaa-35f33753956f	SUCCESS	\N
fc272b6f-48a9-4e31-a700-a057773a85b8	35655f33-01f4-499f-bf58-2f106d2b5138	CASH	20.00	2026-10-17 03:02:27.516025	\N	2026-10-17 03:02:27.516025	2026-10-17 03:02:27.516025	2d513fdd-6742-4d0f-bdaa-35f33753956f	SUCCESS	\N
0ab23c56-e46f-455b-9968-6f5e2bed946b	20f75bf3-ea10-4880-be2f-3fb4208ec9f1	CASH	100.00	2026-10-17 06:09:17.275226	\N	2026-10-17 06:09:17.275226	2026-10-17 06:09:17.275226	2d513fdd-6742-4d0f-bdaa-35f33753956f	SUCCESS	\N
b4342754-6882-43ce-bd5f-cd7098bd041b	20f75bf3-ea10-4880-be2f-3fb4208ec9f1	MOBILE_MONEY	200.00	2026-10-17 06:09:17.275226	\N	2026-10-17 06:09:17.275226	2026-10-17 06:09:17.275226	2d513fdd-6742-4d0f-bdaa-35f33753956f	SUCCESS	\N
9f9c47c2-fcd3-4984-99ba-4402f218488f	20f75bf3-ea10-4880-be2f-3fb4208ec9f1	CREDIT	100.00	2026-10-17 06:09:17.275226	\N	2026-10-17 06:09:17.275226	2026-10-17 06:09:17.275226	2d513fdd-6742-4d0f-bdaa-35f33753956f	SUCCESS	\N
6d8aa1d3-2e80-4056-9062-ab61c1715416	20f75bf3-ea10-4880-be2f-3fb4208ec9f1	BANK_TRANSFER	100.00	2026-10-17 06:09:17.275226	\N	2026-10-17 06:09:17.275226	2026-10-17 06:09:17.275226	2d513fdd-6742-4d0f-bdaa-35f33753956f	SUCCESS	\N
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (permission_id, permission_name, description, created_at, updated_at) FROM stdin;
0d30df02-76c1-4029-b712-ce9f400277c9	VIEW_DASHBOARD	Access the dashboard page	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
1b4de8f4-2f84-4b14-aabe-0717824c252b	VIEW_PRODUCTS	View products list	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
fd022c73-2f40-4e5f-942b-a452cbb8df83	CREATE_PRODUCT	Create and edit products	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
255b2d93-fddf-4452-b7e7-6a189bfefca7	DELETE_PRODUCT	Delete products	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
5a46ea32-0275-46d8-8920-16e5166faa0f	IMPORT_PRODUCTS	Import products from file	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
002a603a-f574-4699-b78d-b5d5dbae36fa	EXPORT_PRODUCTS	Export products to file	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
2da0d5e3-4469-439d-ab6d-b49da5f81006	VIEW_CATEGORIES	View categories	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
69d257a2-6ea8-4acb-bdd8-06cb76ecf718	MANAGE_CATEGORIES	Create, edit, and delete categories	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
69105b04-2a4f-4970-a840-c343c42a931d	VIEW_INVENTORY	View inventory levels	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
f12e3692-346b-43ea-8032-4af056cf2752	MANAGE_INVENTORY	Create inventory entries and adjustments	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
1aaf0f0b-b7ce-4c97-a131-554e6fae3276	TRANSFER_INVENTORY	Create inventory transfers between branches	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
58cf9679-da1c-428e-9718-d6b95f3c2b83	VIEW_SALES	View sales list	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
8d72087c-22c9-4c10-a7a0-475b342c7f03	CREATE_SALE	Create sales via POS and manual entry	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
adb5856b-be58-41e6-b7b1-d9a7f0a2e297	VOID_SALE	Void and refund sales	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
3a154065-572e-47ec-8c17-655bda0566b1	VIEW_PURCHASES	View purchase orders	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
6391a802-b869-4f99-b2c8-25e4f94055eb	MANAGE_PURCHASES	Create and edit purchase orders	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
3ec80734-d1d7-4643-902e-88c93d272b8c	VIEW_SUPPLIERS	View suppliers list	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
3aa5df22-38aa-4ecf-ae19-4e30509055ee	MANAGE_SUPPLIERS	Create, edit, and delete suppliers	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
f564ae50-21c1-4c3d-914e-7dfc42b48703	VIEW_CUSTOMERS	View customers list	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
7e333081-58ac-49e4-b3ba-b52b35073033	MANAGE_CUSTOMERS	Create, edit, and delete customers	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
37ef7d52-6a9c-42a1-b041-7d765ded8d02	VIEW_EXPENSES	View expenses	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
6c073dec-365e-4139-b7f9-a1997d4bf800	MANAGE_EXPENSES	Create, edit, and delete expenses	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
dfa70069-f193-4766-827f-4b082d9110b1	VIEW_REPORTS	Access reports and analytics	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
1a2d7d51-accf-4bd1-8684-f05293e02e68	MANAGE_USERS	Manage users, roles, and permissions	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
c5fc9457-8d8d-48d7-9c9f-7199ffd1a1a8	VIEW_BRANCHES	View branches list	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
24b8c117-ae20-4401-bcac-e74b5bd8fb86	MANAGE_BRANCHES	Create, edit, and delete branches	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
18fa9d71-715b-46b0-a468-8c9e7cf69763	VIEW_AUDIT_LOGS	View audit logs	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
23ae2892-c6e5-4a83-9067-7e6a034cad03	MANAGE_SETTINGS	Access and modify business settings	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
23aeede8-7bf1-47fd-91e7-1936c6b1129d	MANAGE_NOTIFICATIONS	Create and send notifications	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
6fcefa62-bffd-44eb-99e8-061e4ddb1aba	MANAGE_SYNC	View sync operations and receive sync failure alerts	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
77338346-2741-44df-abe1-e73f90b2d593	VIEW_PRODUCTS_PAGE	Access the products and price history pages	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
2dfd0190-39ed-4ee3-a8d7-84c4172a5968	VIEW_CUSTOMERS_PAGE	Access the customers page	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
b08b2186-0e9b-4f9b-bbf3-6669bc1b3154	VIEW_SYNC_PAGE	Access the sync and offline page	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
976301b1-14b4-404d-869a-514b5a673e46	VIEW_REPORTS_PAGE	Access the reports and expiry report pages	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
45db558a-b816-438b-8dba-b2ebedb500d6	VIEW_AUDIT_LOGS_PAGE	Access the audit logs and sync logs pages	2026-10-14 17:15:22.769484	2026-10-14 17:15:22.769484
\.


--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_history (history_id, product_id, old_price, new_price, changed_by, created_at, price_type, source, reference_type, reference_id) FROM stdin;
\.


--
-- Data for Name: product_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_batches (batch_id, product_id, branch_id, supplier_id, po_id, batch_number, expiry_date, received_date, cost_price, quantity_received, quantity_on_hand, quantity_reserved, status, created_by, created_at, updated_at) FROM stdin;
efe042ec-2bc9-410e-85df-ab678c6bb3da	3375dd97-ef95-46c1-b65a-52fcfcc97afa	134daca6-ec0c-40bb-b6e2-9bae4bf67443	\N	\N	\N	\N	2026-10-15	22.55	10200.00	10186.00	0.00	ACTIVE	\N	2026-10-15 00:18:40.667364	2026-10-17 06:09:17.275226
e06e1449-0ff5-422a-8f9e-8d106af53189	5e0ba2f4-d92e-4a8e-b353-7caacdb13dd1	134daca6-ec0c-40bb-b6e2-9bae4bf67443	\N	\N	\N	\N	2026-10-17	0.00	1000.00	995.00	0.00	ACTIVE	2d513fdd-6742-4d0f-bdaa-35f33753956f	2026-10-17 06:05:16.476804	2026-10-17 06:09:17.275226
20399103-aafe-409e-a59c-4dd2af50e325	8a1e3264-3bf1-450b-b781-ac41db10d284	134daca6-ec0c-40bb-b6e2-9bae4bf67443	\N	\N	\N	\N	2026-10-17	0.00	5.00	4.00	0.00	ACTIVE	2d513fdd-6742-4d0f-bdaa-35f33753956f	2026-10-17 04:48:56.009751	2026-10-17 06:09:17.275226
113f4edb-12c9-416a-8e48-e1ca83df4a54	d1c4395e-4a0c-4de1-8fb8-685402c09db2	134daca6-ec0c-40bb-b6e2-9bae4bf67443	\N	\N	\N	\N	2026-10-17	0.00	200.00	200.00	0.00	ACTIVE	2d513fdd-6742-4d0f-bdaa-35f33753956f	2026-10-17 12:57:22.509189	2026-10-17 12:57:22.509189
\.


--
-- Data for Name: product_branch_inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_branch_inventory (inventory_id, product_id, branch_id, quantity_on_hand, reorder_level, reorder_quantity, last_updated, created_at, updated_at, reserved_quantity, damaged_quantity, expired_quantity, available_quantity, last_stock_take, created_by, is_active) FROM stdin;
d406d227-c372-4479-b936-6b79152c5e04	71caeff7-55a3-4b4b-89eb-6f9e79fc42f6	134daca6-ec0c-40bb-b6e2-9bae4bf67443	0.00	0.00	0.00	2026-10-17 03:01:19.821547	2026-10-17 03:01:19.821547	2026-10-17 03:01:19.821547	0.00	0.00	0.00	0.00	\N	\N	t
452a8d6c-d563-46cb-8d0d-45c8b721ddde	d6aeb8dc-5cfa-4363-8fef-91ba3971a6dc	134daca6-ec0c-40bb-b6e2-9bae4bf67443	0.00	0.00	0.00	2026-10-17 03:39:32.324404	2026-10-17 03:39:32.324404	2026-10-17 03:39:32.324404	0.00	0.00	0.00	0.00	\N	\N	t
2e0fabd4-5957-43da-a695-13051559e40e	f03383c6-210b-4143-9b9d-06b6d14149d5	134daca6-ec0c-40bb-b6e2-9bae4bf67443	0.00	0.00	0.00	2026-10-17 04:08:11.024731	2026-10-17 04:08:11.024731	2026-10-17 04:08:11.024731	0.00	0.00	0.00	0.00	\N	\N	t
10618f75-5623-437d-9d4c-63ce8baa9548	3375dd97-ef95-46c1-b65a-52fcfcc97afa	134daca6-ec0c-40bb-b6e2-9bae4bf67443	10186.00	0.00	0.00	2026-10-17 06:09:17.275226	2026-10-14 17:44:13.240444	2026-10-17 06:09:17.275226	0.00	0.00	0.00	10186.00	\N	\N	t
63e79ad1-f6e3-40bd-b54f-c65b71e0594f	5e0ba2f4-d92e-4a8e-b353-7caacdb13dd1	134daca6-ec0c-40bb-b6e2-9bae4bf67443	995.00	0.00	0.00	2026-10-17 06:09:17.275226	2026-10-17 03:19:11.505567	2026-10-17 06:09:17.275226	0.00	0.00	0.00	995.00	\N	\N	t
44d2b657-2321-4a64-854b-91e453e9e975	8a1e3264-3bf1-450b-b781-ac41db10d284	134daca6-ec0c-40bb-b6e2-9bae4bf67443	4.00	0.00	0.00	2026-10-17 06:09:17.275226	2026-10-17 04:48:55.383089	2026-10-17 06:09:17.275226	0.00	0.00	0.00	4.00	\N	\N	t
923a5da4-981c-4825-8c0d-885121c78c42	d1c4395e-4a0c-4de1-8fb8-685402c09db2	134daca6-ec0c-40bb-b6e2-9bae4bf67443	200.00	0.00	0.00	2026-10-17 12:57:22.509189	2026-10-17 12:57:22.22384	2026-10-17 12:57:22.22384	0.00	0.00	0.00	200.00	\N	\N	t
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_images (image_id, product_id, image_url, is_primary, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (product_id, sku, barcode, product_name, category_id, supplier_id, base_uom_id, cost_price, retail_price, wholesale_uom_id, wholesale_conversion_factor, wholesale_price, wholesale_min_qty, is_active, created_at, updated_at, description, image_url, brand, model, manufacturer, weight, length, width, height, tax_rate, discount_percentage, minimum_stock, maximum_stock, serial_number_required, expiry_required, track_inventory) FROM stdin;
3375dd97-ef95-46c1-b65a-52fcfcc97afa	PRD-11CD8967	IOQ4RNB4Q6ZHU	Dog Food	\N	\N	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	0.00	20.00	\N	\N	\N	\N	t	2026-10-14 17:44:13.240444	2026-10-15 00:18:40.667364	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	0.00	\N	f	f	t
71caeff7-55a3-4b4b-89eb-6f9e79fc42f6	C38KEZAY6OUP8	ZRYC9612MZX2T	Bowl	\N	\N	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	0.00	20.00	\N	\N	\N	\N	t	2026-10-17 03:01:19.821547	2026-10-17 03:01:19.821547	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	0.00	\N	f	f	t
5e0ba2f4-d92e-4a8e-b353-7caacdb13dd1	8OJE2AQCV6N6Z	QRH6U4W3KR28U	Banana	\N	\N	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	0.00	20.00	\N	\N	\N	\N	t	2026-10-17 03:19:11.505567	2026-10-17 03:19:11.505567	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	0.00	\N	f	f	t
d6aeb8dc-5cfa-4363-8fef-91ba3971a6dc	AQDGC4G4AQ5VJ	T76X7B10ZYFTU	Bowl	\N	\N	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	0.00	20.00	\N	\N	\N	\N	t	2026-10-17 03:39:32.324404	2026-10-17 03:39:32.324404	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	0.00	\N	f	f	t
f03383c6-210b-4143-9b9d-06b6d14149d5	OFFSKU1	SYLWSK4FBKV07	OfflineProbe	\N	\N	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	0.00	50.00	\N	\N	\N	\N	t	2026-10-17 04:08:11.024731	2026-10-17 04:08:11.024731	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	0.00	\N	f	f	t
8a1e3264-3bf1-450b-b781-ac41db10d284	OFFSKU3	GKOSOI6F0S48H	OfflineProbe3	7be35c6b-8ec5-4264-965a-bddcb13d44fa	\N	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	0.00	70.00	\N	\N	\N	\N	t	2026-10-17 04:48:55.383089	2026-10-17 04:48:55.383089	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	0.00	\N	f	f	t
d1c4395e-4a0c-4de1-8fb8-685402c09db2	0S2GBFKMZRK64	35RP1RWWBSM4M	Goat meat	\N	\N	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	0.00	20.00	\N	\N	\N	\N	t	2026-10-17 12:57:22.22384	2026-10-17 12:57:22.22384	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	0.00	\N	f	f	t
\.


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_order_items (po_item_id, po_id, product_id, uom_id, quantity_ordered, quantity_received, unit_cost, line_total, created_at, updated_at, expiry_date, batch_number, serial_number, discount) FROM stdin;
e557b79f-8676-49fe-9503-fef86c52916f	9ab80038-e035-4af7-bf48-6c503a50dc8e	3375dd97-ef95-46c1-b65a-52fcfcc97afa	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	1.00	0.00	0.00	0.00	2026-10-15 11:25:37.946742	2026-10-15 11:25:37.946742	2026-10-24	\N	\N	0.00
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_orders (po_id, supplier_id, branch_id, created_by, order_date, expected_delivery_date, status, total_amount, notes, created_at, updated_at, po_number, approved_date, approved_by, received_date, payment_status, shipping_cost, tax_amount, discount_amount, is_active) FROM stdin;
9ab80038-e035-4af7-bf48-6c503a50dc8e	34e208b1-3587-441d-b866-6f01072ca24c	134daca6-ec0c-40bb-b6e2-9bae4bf67443	2d513fdd-6742-4d0f-bdaa-35f33753956f	2026-10-15 00:00:00	\N	DRAFT	0.00	\N	2026-10-15 11:25:06.485535	2026-10-15 11:25:37.955003	PO-9GBXVH	\N	\N	\N	UNPAID	0.00	0.00	0.00	t
\.


--
-- Data for Name: receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receipts (receipt_id, sale_id, receipt_number, printed_at, created_at, updated_at, qr_code, emailed, printed_by) FROM stdin;
952e0dcb-4022-4c16-8dd9-b37dcb5d88c5	874689c6-0060-4c6a-8867-03ea82c42852	RCPT-1792023524810	2026-10-15 00:18:44.810717	2026-10-15 00:18:44.810717	2026-10-15 00:18:44.810717	\N	f	2d513fdd-6742-4d0f-bdaa-35f33753956f
176b0f6f-9f30-4ced-a278-1e373cfd79c0	35655f33-01f4-499f-bf58-2f106d2b5138	RCPT-1792206149681	2026-10-17 03:02:29.682102	2026-10-17 03:02:29.682102	2026-10-17 03:02:29.682102	\N	f	2d513fdd-6742-4d0f-bdaa-35f33753956f
71d0e95e-8d04-4b1a-8105-e8b144d171a3	20f75bf3-ea10-4880-be2f-3fb4208ec9f1	RCPT-1792217357625	2026-10-17 06:09:17.625411	2026-10-17 06:09:17.625411	2026-10-17 06:09:17.625411	\N	f	2d513fdd-6742-4d0f-bdaa-35f33753956f
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (refresh_token_id, user_id, token_hash, expires_at, revoked, replaced_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_id, permission_id, created_at, updated_at) FROM stdin;
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	0d30df02-76c1-4029-b712-ce9f400277c9	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	1b4de8f4-2f84-4b14-aabe-0717824c252b	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	fd022c73-2f40-4e5f-942b-a452cbb8df83	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	255b2d93-fddf-4452-b7e7-6a189bfefca7	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	5a46ea32-0275-46d8-8920-16e5166faa0f	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	002a603a-f574-4699-b78d-b5d5dbae36fa	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	2da0d5e3-4469-439d-ab6d-b49da5f81006	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	69d257a2-6ea8-4acb-bdd8-06cb76ecf718	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	69105b04-2a4f-4970-a840-c343c42a931d	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	f12e3692-346b-43ea-8032-4af056cf2752	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	1aaf0f0b-b7ce-4c97-a131-554e6fae3276	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	58cf9679-da1c-428e-9718-d6b95f3c2b83	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	8d72087c-22c9-4c10-a7a0-475b342c7f03	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	adb5856b-be58-41e6-b7b1-d9a7f0a2e297	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	3a154065-572e-47ec-8c17-655bda0566b1	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	6391a802-b869-4f99-b2c8-25e4f94055eb	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	3ec80734-d1d7-4643-902e-88c93d272b8c	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	3aa5df22-38aa-4ecf-ae19-4e30509055ee	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	f564ae50-21c1-4c3d-914e-7dfc42b48703	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	7e333081-58ac-49e4-b3ba-b52b35073033	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	37ef7d52-6a9c-42a1-b041-7d765ded8d02	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	6c073dec-365e-4139-b7f9-a1997d4bf800	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	dfa70069-f193-4766-827f-4b082d9110b1	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	1a2d7d51-accf-4bd1-8684-f05293e02e68	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	c5fc9457-8d8d-48d7-9c9f-7199ffd1a1a8	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	24b8c117-ae20-4401-bcac-e74b5bd8fb86	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	18fa9d71-715b-46b0-a468-8c9e7cf69763	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	23ae2892-c6e5-4a83-9067-7e6a034cad03	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	23aeede8-7bf1-47fd-91e7-1936c6b1129d	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	6fcefa62-bffd-44eb-99e8-061e4ddb1aba	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	77338346-2741-44df-abe1-e73f90b2d593	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	2dfd0190-39ed-4ee3-a8d7-84c4172a5968	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	b08b2186-0e9b-4f9b-bbf3-6669bc1b3154	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	976301b1-14b4-404d-869a-514b5a673e46	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	45db558a-b816-438b-8dba-b2ebedb500d6	2026-10-14 17:15:22.803165	2026-10-14 17:15:22.803165
71a3fae3-e050-45a5-b914-922d0e58ba03	0d30df02-76c1-4029-b712-ce9f400277c9	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	1b4de8f4-2f84-4b14-aabe-0717824c252b	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	fd022c73-2f40-4e5f-942b-a452cbb8df83	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	255b2d93-fddf-4452-b7e7-6a189bfefca7	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	5a46ea32-0275-46d8-8920-16e5166faa0f	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	002a603a-f574-4699-b78d-b5d5dbae36fa	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	2da0d5e3-4469-439d-ab6d-b49da5f81006	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	69d257a2-6ea8-4acb-bdd8-06cb76ecf718	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	69105b04-2a4f-4970-a840-c343c42a931d	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	f12e3692-346b-43ea-8032-4af056cf2752	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	1aaf0f0b-b7ce-4c97-a131-554e6fae3276	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	58cf9679-da1c-428e-9718-d6b95f3c2b83	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	8d72087c-22c9-4c10-a7a0-475b342c7f03	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	adb5856b-be58-41e6-b7b1-d9a7f0a2e297	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	3a154065-572e-47ec-8c17-655bda0566b1	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	6391a802-b869-4f99-b2c8-25e4f94055eb	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	3ec80734-d1d7-4643-902e-88c93d272b8c	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	3aa5df22-38aa-4ecf-ae19-4e30509055ee	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	f564ae50-21c1-4c3d-914e-7dfc42b48703	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	7e333081-58ac-49e4-b3ba-b52b35073033	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	37ef7d52-6a9c-42a1-b041-7d765ded8d02	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	6c073dec-365e-4139-b7f9-a1997d4bf800	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	dfa70069-f193-4766-827f-4b082d9110b1	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	1a2d7d51-accf-4bd1-8684-f05293e02e68	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	c5fc9457-8d8d-48d7-9c9f-7199ffd1a1a8	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	24b8c117-ae20-4401-bcac-e74b5bd8fb86	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	18fa9d71-715b-46b0-a468-8c9e7cf69763	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	23ae2892-c6e5-4a83-9067-7e6a034cad03	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	23aeede8-7bf1-47fd-91e7-1936c6b1129d	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	6fcefa62-bffd-44eb-99e8-061e4ddb1aba	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	77338346-2741-44df-abe1-e73f90b2d593	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	2dfd0190-39ed-4ee3-a8d7-84c4172a5968	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	b08b2186-0e9b-4f9b-bbf3-6669bc1b3154	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	976301b1-14b4-404d-869a-514b5a673e46	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
71a3fae3-e050-45a5-b914-922d0e58ba03	45db558a-b816-438b-8dba-b2ebedb500d6	2026-10-14 17:15:22.878491	2026-10-14 17:15:22.878491
00b3799d-0e29-4b24-85cb-edc7fedb68b9	0d30df02-76c1-4029-b712-ce9f400277c9	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	1b4de8f4-2f84-4b14-aabe-0717824c252b	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	fd022c73-2f40-4e5f-942b-a452cbb8df83	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	255b2d93-fddf-4452-b7e7-6a189bfefca7	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	5a46ea32-0275-46d8-8920-16e5166faa0f	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	002a603a-f574-4699-b78d-b5d5dbae36fa	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	2da0d5e3-4469-439d-ab6d-b49da5f81006	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	69d257a2-6ea8-4acb-bdd8-06cb76ecf718	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	69105b04-2a4f-4970-a840-c343c42a931d	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	f12e3692-346b-43ea-8032-4af056cf2752	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	1aaf0f0b-b7ce-4c97-a131-554e6fae3276	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	58cf9679-da1c-428e-9718-d6b95f3c2b83	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	8d72087c-22c9-4c10-a7a0-475b342c7f03	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	adb5856b-be58-41e6-b7b1-d9a7f0a2e297	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	3a154065-572e-47ec-8c17-655bda0566b1	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	6391a802-b869-4f99-b2c8-25e4f94055eb	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	3ec80734-d1d7-4643-902e-88c93d272b8c	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	3aa5df22-38aa-4ecf-ae19-4e30509055ee	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	f564ae50-21c1-4c3d-914e-7dfc42b48703	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	7e333081-58ac-49e4-b3ba-b52b35073033	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	37ef7d52-6a9c-42a1-b041-7d765ded8d02	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	6c073dec-365e-4139-b7f9-a1997d4bf800	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	dfa70069-f193-4766-827f-4b082d9110b1	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	c5fc9457-8d8d-48d7-9c9f-7199ffd1a1a8	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	18fa9d71-715b-46b0-a468-8c9e7cf69763	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	6fcefa62-bffd-44eb-99e8-061e4ddb1aba	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	77338346-2741-44df-abe1-e73f90b2d593	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	2dfd0190-39ed-4ee3-a8d7-84c4172a5968	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	b08b2186-0e9b-4f9b-bbf3-6669bc1b3154	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	976301b1-14b4-404d-869a-514b5a673e46	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
00b3799d-0e29-4b24-85cb-edc7fedb68b9	45db558a-b816-438b-8dba-b2ebedb500d6	2026-10-14 17:15:22.934307	2026-10-14 17:15:22.934307
ef9c602b-9589-4a44-8cba-57a4a31ed026	0d30df02-76c1-4029-b712-ce9f400277c9	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	1b4de8f4-2f84-4b14-aabe-0717824c252b	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	fd022c73-2f40-4e5f-942b-a452cbb8df83	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	5a46ea32-0275-46d8-8920-16e5166faa0f	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	002a603a-f574-4699-b78d-b5d5dbae36fa	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	2da0d5e3-4469-439d-ab6d-b49da5f81006	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	69d257a2-6ea8-4acb-bdd8-06cb76ecf718	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	69105b04-2a4f-4970-a840-c343c42a931d	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	f12e3692-346b-43ea-8032-4af056cf2752	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	1aaf0f0b-b7ce-4c97-a131-554e6fae3276	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	58cf9679-da1c-428e-9718-d6b95f3c2b83	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	8d72087c-22c9-4c10-a7a0-475b342c7f03	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	adb5856b-be58-41e6-b7b1-d9a7f0a2e297	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	3a154065-572e-47ec-8c17-655bda0566b1	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	6391a802-b869-4f99-b2c8-25e4f94055eb	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	3ec80734-d1d7-4643-902e-88c93d272b8c	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	3aa5df22-38aa-4ecf-ae19-4e30509055ee	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	f564ae50-21c1-4c3d-914e-7dfc42b48703	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	7e333081-58ac-49e4-b3ba-b52b35073033	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	37ef7d52-6a9c-42a1-b041-7d765ded8d02	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	6c073dec-365e-4139-b7f9-a1997d4bf800	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	dfa70069-f193-4766-827f-4b082d9110b1	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	c5fc9457-8d8d-48d7-9c9f-7199ffd1a1a8	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	18fa9d71-715b-46b0-a468-8c9e7cf69763	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	77338346-2741-44df-abe1-e73f90b2d593	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	2dfd0190-39ed-4ee3-a8d7-84c4172a5968	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	b08b2186-0e9b-4f9b-bbf3-6669bc1b3154	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	976301b1-14b4-404d-869a-514b5a673e46	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
ef9c602b-9589-4a44-8cba-57a4a31ed026	45db558a-b816-438b-8dba-b2ebedb500d6	2026-10-14 17:15:23.021127	2026-10-14 17:15:23.021127
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	0d30df02-76c1-4029-b712-ce9f400277c9	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	1b4de8f4-2f84-4b14-aabe-0717824c252b	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	fd022c73-2f40-4e5f-942b-a452cbb8df83	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	2da0d5e3-4469-439d-ab6d-b49da5f81006	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	69d257a2-6ea8-4acb-bdd8-06cb76ecf718	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	69105b04-2a4f-4970-a840-c343c42a931d	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	f12e3692-346b-43ea-8032-4af056cf2752	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	1aaf0f0b-b7ce-4c97-a131-554e6fae3276	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	58cf9679-da1c-428e-9718-d6b95f3c2b83	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	3ec80734-d1d7-4643-902e-88c93d272b8c	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	f564ae50-21c1-4c3d-914e-7dfc42b48703	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	dfa70069-f193-4766-827f-4b082d9110b1	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	c5fc9457-8d8d-48d7-9c9f-7199ffd1a1a8	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	18fa9d71-715b-46b0-a468-8c9e7cf69763	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	77338346-2741-44df-abe1-e73f90b2d593	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	2dfd0190-39ed-4ee3-a8d7-84c4172a5968	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	b08b2186-0e9b-4f9b-bbf3-6669bc1b3154	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	976301b1-14b4-404d-869a-514b5a673e46	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	45db558a-b816-438b-8dba-b2ebedb500d6	2026-10-14 17:15:23.065999	2026-10-14 17:15:23.065999
547f33be-00b0-40c0-ab58-a27e5c9854bf	0d30df02-76c1-4029-b712-ce9f400277c9	2026-10-14 17:15:23.083062	2026-10-14 17:15:23.083062
547f33be-00b0-40c0-ab58-a27e5c9854bf	1b4de8f4-2f84-4b14-aabe-0717824c252b	2026-10-14 17:15:23.083062	2026-10-14 17:15:23.083062
547f33be-00b0-40c0-ab58-a27e5c9854bf	58cf9679-da1c-428e-9718-d6b95f3c2b83	2026-10-14 17:15:23.083062	2026-10-14 17:15:23.083062
547f33be-00b0-40c0-ab58-a27e5c9854bf	8d72087c-22c9-4c10-a7a0-475b342c7f03	2026-10-14 17:15:23.083062	2026-10-14 17:15:23.083062
547f33be-00b0-40c0-ab58-a27e5c9854bf	f564ae50-21c1-4c3d-914e-7dfc42b48703	2026-10-14 17:15:23.083062	2026-10-14 17:15:23.083062
547f33be-00b0-40c0-ab58-a27e5c9854bf	dfa70069-f193-4766-827f-4b082d9110b1	2026-10-14 17:15:23.083062	2026-10-14 17:15:23.083062
547f33be-00b0-40c0-ab58-a27e5c9854bf	c5fc9457-8d8d-48d7-9c9f-7199ffd1a1a8	2026-10-14 17:15:23.083062	2026-10-14 17:15:23.083062
547f33be-00b0-40c0-ab58-a27e5c9854bf	18fa9d71-715b-46b0-a468-8c9e7cf69763	2026-10-14 17:15:23.083062	2026-10-14 17:15:23.083062
18963f02-457d-4d8b-8028-0f957ad87e71	0d30df02-76c1-4029-b712-ce9f400277c9	2026-10-14 17:15:23.101862	2026-10-14 17:15:23.101862
18963f02-457d-4d8b-8028-0f957ad87e71	1b4de8f4-2f84-4b14-aabe-0717824c252b	2026-10-14 17:15:23.101862	2026-10-14 17:15:23.101862
18963f02-457d-4d8b-8028-0f957ad87e71	2da0d5e3-4469-439d-ab6d-b49da5f81006	2026-10-14 17:15:23.101862	2026-10-14 17:15:23.101862
18963f02-457d-4d8b-8028-0f957ad87e71	69105b04-2a4f-4970-a840-c343c42a931d	2026-10-14 17:15:23.101862	2026-10-14 17:15:23.101862
18963f02-457d-4d8b-8028-0f957ad87e71	58cf9679-da1c-428e-9718-d6b95f3c2b83	2026-10-14 17:15:23.101862	2026-10-14 17:15:23.101862
18963f02-457d-4d8b-8028-0f957ad87e71	3ec80734-d1d7-4643-902e-88c93d272b8c	2026-10-14 17:15:23.101862	2026-10-14 17:15:23.101862
18963f02-457d-4d8b-8028-0f957ad87e71	dfa70069-f193-4766-827f-4b082d9110b1	2026-10-14 17:15:23.101862	2026-10-14 17:15:23.101862
18963f02-457d-4d8b-8028-0f957ad87e71	c5fc9457-8d8d-48d7-9c9f-7199ffd1a1a8	2026-10-14 17:15:23.101862	2026-10-14 17:15:23.101862
18963f02-457d-4d8b-8028-0f957ad87e71	18fa9d71-715b-46b0-a468-8c9e7cf69763	2026-10-14 17:15:23.101862	2026-10-14 17:15:23.101862
18963f02-457d-4d8b-8028-0f957ad87e71	77338346-2741-44df-abe1-e73f90b2d593	2026-10-14 17:15:23.101862	2026-10-14 17:15:23.101862
18963f02-457d-4d8b-8028-0f957ad87e71	b08b2186-0e9b-4f9b-bbf3-6669bc1b3154	2026-10-14 17:15:23.101862	2026-10-14 17:15:23.101862
18963f02-457d-4d8b-8028-0f957ad87e71	976301b1-14b4-404d-869a-514b5a673e46	2026-10-14 17:15:23.101862	2026-10-14 17:15:23.101862
18963f02-457d-4d8b-8028-0f957ad87e71	45db558a-b816-438b-8dba-b2ebedb500d6	2026-10-14 17:15:23.101862	2026-10-14 17:15:23.101862
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (role_id, role_name, description, created_at, updated_at, is_system, deleted_at) FROM stdin;
ef9c602b-9589-4a44-8cba-57a4a31ed026	Branch Manager	Branch supervisor	2026-10-14 17:15:22.46815	2026-10-14 17:15:22.46815	t	\N
71a3fae3-e050-45a5-b914-922d0e58ba03	Business Owner	Business owner	2026-10-14 17:15:22.46815	2026-10-14 17:15:22.46815	t	\N
00b3799d-0e29-4b24-85cb-edc7fedb68b9	Manager	Operations manager	2026-10-14 17:15:22.46815	2026-10-14 17:15:22.46815	t	\N
8644ffea-c0cf-47fa-9fcb-9bd645aa3468	Storekeeper	Inventory custodian	2026-10-14 17:15:22.46815	2026-10-14 17:15:22.46815	t	\N
9a48f15f-1166-4bf0-bc42-4c02de7c94f3	Administrator	Full system access	2026-10-14 17:15:22.46815	2026-10-14 17:15:22.46815	t	\N
18963f02-457d-4d8b-8028-0f957ad87e71	Technical	Monitoring and read-only access	2026-10-14 17:15:22.46815	2026-10-14 17:15:22.46815	t	\N
547f33be-00b0-40c0-ab58-a27e5c9854bf	Cashier	Point of sale operator	2026-10-14 17:15:22.46815	2026-10-14 17:15:22.46815	t	\N
\.


--
-- Data for Name: sale_item_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sale_item_batches (sale_item_id, batch_id, quantity, cost_price) FROM stdin;
04a730a7-9dd8-45e7-bdce-8cc1346449ff	efe042ec-2bc9-410e-85df-ab678c6bb3da	1.00	0.00
f2e349f3-dcad-44ad-bf5d-bf9bc5957b42	efe042ec-2bc9-410e-85df-ab678c6bb3da	1.00	0.00
ade237a9-4b8d-48a9-ae08-d5a10135190a	efe042ec-2bc9-410e-85df-ab678c6bb3da	12.00	22.55
f64b1032-896a-49d4-a075-10afbedb6e2b	e06e1449-0ff5-422a-8f9e-8d106af53189	5.00	0.00
1735126b-259b-4420-bac5-815adb18fcc7	20399103-aafe-409e-a59c-4dd2af50e325	1.00	0.00
\.


--
-- Data for Name: sale_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sale_items (sale_item_id, sale_id, product_id, uom_id, quantity, unit_price, line_discount, line_total, created_at, updated_at, cost_price, tax_amount, batch_number, expiry_date, serial_number) FROM stdin;
04a730a7-9dd8-45e7-bdce-8cc1346449ff	874689c6-0060-4c6a-8867-03ea82c42852	3375dd97-ef95-46c1-b65a-52fcfcc97afa	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	1.00	20.00	0.00	20.00	2026-10-15 00:18:44.032279	2026-10-15 00:18:44.032279	0.00	0.00	\N	\N	\N
f2e349f3-dcad-44ad-bf5d-bf9bc5957b42	35655f33-01f4-499f-bf58-2f106d2b5138	3375dd97-ef95-46c1-b65a-52fcfcc97afa	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	1.00	20.00	0.00	20.00	2026-10-17 03:02:27.516025	2026-10-17 03:02:27.516025	0.00	0.00	\N	\N	\N
ade237a9-4b8d-48a9-ae08-d5a10135190a	20f75bf3-ea10-4880-be2f-3fb4208ec9f1	3375dd97-ef95-46c1-b65a-52fcfcc97afa	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	12.00	20.00	0.00	240.00	2026-10-17 06:09:17.275226	2026-10-17 06:09:17.275226	22.55	0.00	\N	\N	\N
f64b1032-896a-49d4-a075-10afbedb6e2b	20f75bf3-ea10-4880-be2f-3fb4208ec9f1	5e0ba2f4-d92e-4a8e-b353-7caacdb13dd1	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	5.00	20.00	0.00	100.00	2026-10-17 06:09:17.275226	2026-10-17 06:09:17.275226	0.00	0.00	\N	\N	\N
1735126b-259b-4420-bac5-815adb18fcc7	20f75bf3-ea10-4880-be2f-3fb4208ec9f1	8a1e3264-3bf1-450b-b781-ac41db10d284	dd1cd0e9-2fbf-4418-987b-99a9b97017e8	1.00	70.00	0.00	70.00	2026-10-17 06:09:17.275226	2026-10-17 06:09:17.275226	0.00	0.00	\N	\N	\N
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales (sale_id, branch_id, customer_id, cashier_id, sale_type, sale_date, subtotal, discount_amount, tax_amount, total_amount, amount_paid, balance_due, status, local_transaction_id, synced, created_at, updated_at, invoice_number, cashier_name, customer_name, remarks, device_id, payment_status, due_date, created_offline, refunded_amount) FROM stdin;
874689c6-0060-4c6a-8867-03ea82c42852	134daca6-ec0c-40bb-b6e2-9bae4bf67443	\N	2d513fdd-6742-4d0f-bdaa-35f33753956f	RETAIL	2026-10-15 00:18:44.032279	20.00	0.00	0.00	20.00	20.00	0.00	COMPLETED	21eee49d-b03a-454a-8aee-7c31afdfc859	t	2026-10-15 00:18:44.032279	2026-10-15 00:18:44.032279	INV-1792023524049	System Administrator	\N	\N	dev-mv8sfcyr-znvk52qg6l	PAID	\N	f	0.00
35655f33-01f4-499f-bf58-2f106d2b5138	134daca6-ec0c-40bb-b6e2-9bae4bf67443	\N	2d513fdd-6742-4d0f-bdaa-35f33753956f	RETAIL	2026-10-17 03:02:27.516025	20.00	0.00	0.00	20.00	20.00	0.00	COMPLETED	d3bf6b36-d09a-44bd-9da0-c6392690c482	t	2026-10-17 03:02:27.516025	2026-10-17 03:02:27.516025	INV-1792206147580	System Administrator	\N	\N	dev-mvaih3kc-jg9pa7u3kk	PAID	\N	f	0.00
20f75bf3-ea10-4880-be2f-3fb4208ec9f1	134daca6-ec0c-40bb-b6e2-9bae4bf67443	\N	2d513fdd-6742-4d0f-bdaa-35f33753956f	RETAIL	2026-10-17 06:09:17.275226	410.00	0.00	0.00	410.00	500.00	0.00	COMPLETED	14d39221-5170-4c1c-98f5-166f9614f375	t	2026-10-17 06:09:17.275226	2026-10-17 06:09:17.275226	INV-1792217357348	System Administrator	\N	\N	7dd79138-6c87-4e40-866e-54e90026b031	PAID	\N	f	0.00
\.


--
-- Data for Name: stock_adjustment_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_adjustment_items (item_id, adjustment_id, product_id, quantity, adjustment_type, cost_price) FROM stdin;
\.


--
-- Data for Name: stock_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_adjustments (adjustment_id, branch_id, adjusted_by, reason, notes, created_at) FROM stdin;
\.


--
-- Data for Name: stock_count_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_count_items (id, count_id, product_id, expected_quantity, counted_quantity, difference) FROM stdin;
\.


--
-- Data for Name: stock_counts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_counts (count_id, branch_id, counted_by, status, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: supplier_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplier_payments (payment_id, supplier_id, po_id, amount, payment_method, payment_date, reference_number) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (supplier_id, supplier_name, contact_name, phone, email, address, is_active, created_at, updated_at, company_registration_no, tax_number, website, bank_name, account_name, account_number, payment_terms) FROM stdin;
34e208b1-3587-441d-b866-6f01072ca24c	Acme	\N	\N	\N	\N	t	2026-10-15 11:24:44.921566	2026-10-15 11:24:44.921566	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: sync_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sync_logs (sync_id, device_id, local_transaction_id, entity_type, sync_status, synced_at, error_message, created_at, updated_at, retry_count, sync_duration_ms) FROM stdin;
9191e093-56ba-42f5-b779-66fb962c6736	e3ce0bb7-3b91-4d5e-b272-049fe4cb5049	1569fb31-0597-43ae-b511-454d34c2724e	products	SUCCESS	2026-10-14 17:29:43.547	pulled 0 rows	2026-10-14 17:29:43.548277	2026-10-14 17:29:43.548277	0	\N
ef218032-9302-42c4-a1cb-8e7b11625185	c6356159-be3c-49e1-9c4b-7ab4ed99fc62	9899ac46-151e-439b-923c-d50b0ac072ab	inventories	SUCCESS	2026-10-14 17:29:43.66	pulled 0 rows	2026-10-14 17:29:43.661526	2026-10-14 17:29:43.661526	0	\N
d6c51626-deaf-44d3-8266-8ff431505e08	1e82ae8d-6b10-488a-8fa0-4ccf966c0db8	de6b87e3-a73e-4d5d-b0ad-4d6fd492ae79	products	SUCCESS	2026-10-14 17:30:10.703	pulled 0 rows	2026-10-14 17:30:10.708236	2026-10-14 17:30:10.708236	0	\N
15768daf-3bcd-4d79-81fe-60b1db6c41de	b31d4654-1325-4d46-92c6-bccc8c69db55	fd0d796f-51ed-4980-ae6d-8e68350ab603	inventories	SUCCESS	2026-10-14 17:30:10.715	pulled 0 rows	2026-10-14 17:30:10.716538	2026-10-14 17:30:10.716538	0	\N
c38508a5-357c-46fb-908c-6c2eaff96bf7	26018ed9-e871-4323-b3e0-ad1770d5d435	24f3ae6f-24a2-4967-89ba-cf681f245059	inventories	SUCCESS	2026-10-14 17:33:00.302	pulled 0 rows	2026-10-14 17:33:00.303154	2026-10-14 17:33:00.303154	0	\N
0eb20475-6a51-45dc-bfaa-b3202242972c	851370cc-a9a2-46bb-84af-c5ae8a7c00e2	878e6046-ad1a-430f-8a4e-f44a2ce1ea79	products	SUCCESS	2026-10-14 17:33:00.415	pulled 0 rows	2026-10-14 17:33:00.417089	2026-10-14 17:33:00.417089	0	\N
91fc47bd-eea5-4e32-a1de-a71927a24286	b9e7c954-2f10-48fe-8afb-297ba1d4b39e	65d0bdef-7cc9-4dc6-9515-2dc17a63e340	product-batches	SUCCESS	2026-10-14 17:33:00.535	pulled 0 rows	2026-10-14 17:33:00.535441	2026-10-14 17:33:00.535441	0	\N
3279b7e5-7ea2-4cc7-8429-e81b1e115d44	a3db2089-ba65-40ca-a881-b19fc63f26d2	99d9c134-1d56-4266-9021-b9fdd075bb7e	categories	SUCCESS	2026-10-14 17:33:00.636	pulled 0 rows	2026-10-14 17:33:00.645786	2026-10-14 17:33:00.645786	0	\N
285d72bc-ae6c-4573-a964-782ab5eed30c	d5f56096-e39c-4825-a1e5-2f56de48669d	49a6ec40-e884-4f0f-ada4-4c32bae024bd	suppliers	SUCCESS	2026-10-14 17:33:00.667	pulled 0 rows	2026-10-14 17:33:00.669908	2026-10-14 17:33:00.669908	0	\N
7cfbc8c2-457d-410f-9a73-faef100d438f	db0ab619-7c59-4725-9564-29553b1ade42	7256939e-70f5-4557-bac6-f2d66d3b86fc	customers	SUCCESS	2026-10-14 17:33:00.901	pulled 0 rows	2026-10-14 17:33:00.912185	2026-10-14 17:33:00.912185	0	\N
1ea338c2-5647-4ecf-9308-d0dbcc463166	7e2b46c7-b0bc-436f-bab7-26e629921f08	fe89b1c5-4ebd-4adb-84df-02a6012c23df	branches	SUCCESS	2026-10-14 17:33:01.092	pulled 1 rows	2026-10-14 17:33:01.092587	2026-10-14 17:33:01.092587	0	\N
b2d6516e-347d-47e8-9f3d-492e25da6040	3fd80a99-0a75-4b81-ae32-b940f78dc894	0c87ae7a-3400-41ee-a6c3-9b41f5be677c	expenses	SUCCESS	2026-10-14 17:33:01.137	pulled 0 rows	2026-10-14 17:33:01.170032	2026-10-14 17:33:01.170032	0	\N
d7b8a1e4-3067-404c-9bff-8c4d9208a724	5d1cbc0b-c050-4384-89b3-6f5863f61eaa	07530247-b816-4124-89a1-94d6c3096ae4	sales	SUCCESS	2026-10-14 17:33:01.189	pulled 0 rows	2026-10-14 17:33:01.196804	2026-10-14 17:33:01.196804	0	\N
e3bd7c8a-547d-462e-a434-0aaf145c1154	b5f1a8d5-76f0-40cf-9f4f-0c74cc4dc37f	17b3d0ed-c111-4758-b216-359e4aa71b6f	purchases	SUCCESS	2026-10-14 17:33:01.198	pulled 0 rows	2026-10-14 17:33:01.205057	2026-10-14 17:33:01.205057	0	\N
e29d7174-4f3b-400b-bb41-6f8d3fec4f6d	eea81263-4d12-4021-a795-fe2bf13fa5d8	e0546860-3dcb-425b-8056-7583bad02240	inventory-transfers	SUCCESS	2026-10-14 17:33:01.304	pulled 0 rows	2026-10-14 17:33:01.312212	2026-10-14 17:33:01.312212	0	\N
53ab5886-2f37-43dd-aeaa-25bdd0540170	8bde1bcd-b12d-489f-8240-7e0fd1a2e31f	96873318-b476-46b6-90cb-050a46242c0f	notifications	SUCCESS	2026-10-14 17:33:01.32	pulled 2 rows	2026-10-14 17:33:01.321141	2026-10-14 17:33:01.321141	0	\N
3499cc3d-4a31-4917-9d5e-b6041c42ff1f	b8fb6063-2557-42c6-8128-2d3911ac6169	8eab1680-d121-4d74-b803-cdcd314b9b4c	roles	SUCCESS	2026-10-14 17:33:01.322	pulled 7 rows	2026-10-14 17:33:01.322575	2026-10-14 17:33:01.322575	0	\N
f805e9b5-8ec4-432a-bfa3-37157ee1c3b9	46844a4e-77af-4474-90eb-f20cee751a56	0377da54-b0c9-4009-9bd1-620c59056964	users	SUCCESS	2026-10-14 17:33:01.382	pulled 1 rows	2026-10-14 17:33:01.38289	2026-10-14 17:33:01.38289	0	\N
6d50dd9b-84a4-42b6-81fc-0bc1d7bf84bc	de5467c4-a0d8-4655-a026-2a72a8550d99	fbbef765-aafb-4ca4-b51a-101926735c43	inventories	SUCCESS	2026-10-14 17:38:38.16	pulled 0 rows	2026-10-14 17:38:38.164273	2026-10-14 17:38:38.164273	0	\N
82886d1f-89db-4ced-b901-5a8764c61f65	c176dd52-cde6-4542-a98b-889d58f4f0a4	43653983-8c3b-454a-bfca-762ba94e6a07	products	SUCCESS	2026-10-14 17:38:38.158	pulled 0 rows	2026-10-14 17:38:38.160803	2026-10-14 17:38:38.160803	0	\N
ec51c330-1e8b-4e2f-9029-6a73e1eb8a19	dbb2ad20-bfb6-48e1-a738-1496fc90324b	9d01698e-7ce9-460b-99dc-af09f50cb4ae	product-batches	SUCCESS	2026-10-14 17:41:16.849	pulled 0 rows	2026-10-14 17:41:16.850022	2026-10-14 17:41:16.850022	0	\N
a281ae98-8e2d-45ed-8b21-fc6f44519fdf	d1a776f1-ee70-4e28-8273-5444ddb1a975	b5fa588e-c72b-4d82-8829-23e38eb33260	categories	SUCCESS	2026-10-14 17:41:16.85	pulled 0 rows	2026-10-14 17:41:16.851301	2026-10-14 17:41:16.851301	0	\N
81394118-a0b2-4c85-b865-81eb711dabdc	68e84e4a-ab2c-40b8-aa65-76006960f9e4	05e612c0-5b1b-4beb-88cd-2671a56b50b8	suppliers	SUCCESS	2026-10-14 17:41:16.854	pulled 0 rows	2026-10-14 17:41:16.854709	2026-10-14 17:41:16.854709	0	\N
ab913b6c-a852-4bd6-b691-fe73b5abc712	997f3771-dd2e-4250-aa7a-a9103d2917e4	4ca4c981-94e2-40f5-b342-5d7d509a9cce	customers	SUCCESS	2026-10-14 17:41:16.851	pulled 0 rows	2026-10-14 17:41:16.85254	2026-10-14 17:41:16.85254	0	\N
7f2ee585-953f-445d-bae8-1ec806a6ad07	15ff315b-08bb-49e9-aaf2-231983ee6199	237a7d5f-e5b3-473a-be82-df9df357d21b	products	SUCCESS	2026-10-14 17:41:16.853	pulled 0 rows	2026-10-14 17:41:16.856736	2026-10-14 17:41:16.856736	0	\N
4e60d3bc-0c4e-49ad-b117-218fc36819b8	b46d325f-3421-42c0-a0af-a139368a254f	6fccebd9-00bb-438d-a497-fa4344ac6847	inventories	SUCCESS	2026-10-14 17:41:16.859	pulled 0 rows	2026-10-14 17:41:16.868864	2026-10-14 17:41:16.868864	0	\N
ccf7a1a5-aa7b-4c6a-8bca-f7bde34568de	b7119538-6f81-4f5d-af3b-61bb8fdd386f	6ce155a2-f291-4639-aa65-4193878caeb5	expenses	SUCCESS	2026-10-14 17:41:16.975	pulled 0 rows	2026-10-14 17:41:16.976293	2026-10-14 17:41:16.976293	0	\N
9617f6b4-b48d-471a-8790-eba2b299671e	1d3d9594-19d3-4b54-83d7-ff5e8af16185	a5db4bc8-7fd1-4d1d-9b54-681ddabea097	purchases	SUCCESS	2026-10-14 17:41:16.978	pulled 0 rows	2026-10-14 17:41:16.978968	2026-10-14 17:41:16.978968	0	\N
b2488e78-0659-4480-8ce2-d75cec2ac7fb	3f7e5459-f59d-4edb-a5f5-101e76c7b579	d4fd36a8-e31b-4c5d-bc4e-4be1aadafdcc	branches	SUCCESS	2026-10-14 17:41:16.995	pulled 0 rows	2026-10-14 17:41:16.995579	2026-10-14 17:41:16.995579	0	\N
dfcbaae8-a927-47d5-9e4c-23d475e1a22a	4ac981f6-a426-4146-b935-c76c30309c27	a9879890-4f02-4521-ad08-be9a2d4c8a1e	sales	SUCCESS	2026-10-14 17:41:17.024	pulled 0 rows	2026-10-14 17:41:17.024604	2026-10-14 17:41:17.024604	0	\N
53767aca-215f-4f03-aa66-05beb392af2d	05a4d99a-3eb1-4636-8fd3-92a554b08798	4691b583-a10e-42d4-a92c-c6ad573dc5d2	roles	SUCCESS	2026-10-14 17:41:17.025	pulled 0 rows	2026-10-14 17:41:17.026622	2026-10-14 17:41:17.026622	0	\N
4138c1b1-c2bb-4a1a-816e-c884d00a3473	1c7bd188-9845-47b9-aba0-d64ad2ab0f7c	994a08f3-d44a-4c0d-bbee-c7c3fbe3933e	users	SUCCESS	2026-10-14 17:41:17.028	pulled 1 rows	2026-10-14 17:41:17.028595	2026-10-14 17:41:17.028595	0	\N
18449589-c1af-455c-9d42-b892a2050c52	e34dcb19-4578-49d4-80c1-5a7a67b2c0da	a9201d4b-dd43-4b91-98c6-fa5f94ac7018	inventory-transfers	SUCCESS	2026-10-14 17:41:17.085	pulled 0 rows	2026-10-14 17:41:17.08593	2026-10-14 17:41:17.08593	0	\N
871afc0f-76e9-465e-959e-24cd8dbb1976	6e7ad972-df5a-415a-970e-7e30284a69b0	2f7767f2-1544-4834-ae32-c23c7fdd2836	notifications	SUCCESS	2026-10-14 17:41:17.098	pulled 6 rows	2026-10-14 17:41:17.098865	2026-10-14 17:41:17.098865	0	\N
0c867feb-3413-466d-bb72-dc3d7c501b38	32199d46-29e6-4018-8971-1ca5a05d4cb6	731d7128-2385-48da-be27-52585da151b1	categories	SUCCESS	2026-10-14 17:42:04.72	pulled 0 rows	2026-10-14 17:42:04.723128	2026-10-14 17:42:04.723128	0	\N
06060fc1-3b62-488b-a57c-f04641dde668	0dd15802-c8df-4a99-b794-9b0ae83c1e8b	83069692-45a3-4a08-80bd-f69336b7d18e	suppliers	SUCCESS	2026-10-14 17:42:04.718	pulled 0 rows	2026-10-14 17:42:04.720794	2026-10-14 17:42:04.720794	0	\N
a16ef9f2-9287-4840-b9a0-9fe311053caf	c23ffa1c-67d2-4323-92f3-1eb1e93415e9	4b9e5687-344c-485b-8807-7913b48479dd	inventories	SUCCESS	2026-10-14 17:42:04.734	pulled 0 rows	2026-10-14 17:42:04.735205	2026-10-14 17:42:04.735205	0	\N
97c42438-09ab-4ea5-8734-05ae03920fb5	983a1706-42d1-435f-8f9e-0adf494716a1	dea15fe4-2431-4977-a449-92557b7b5f25	product-batches	SUCCESS	2026-10-14 17:42:04.743	pulled 0 rows	2026-10-14 17:42:04.745603	2026-10-14 17:42:04.745603	0	\N
ba7a8b09-ff41-40e7-9c60-2d7f063997bc	f0c3b599-02d4-4177-ac06-4d18e3786f0f	10b988b9-2dd0-4679-be37-2e4791ed0b04	products	SUCCESS	2026-10-14 17:42:04.792	pulled 0 rows	2026-10-14 17:42:04.794582	2026-10-14 17:42:04.794582	0	\N
e22690ab-b4be-4bd2-ace9-98cb5830c923	1d6584e6-5a0c-4345-944b-f209b837643e	a98aed98-4044-4cda-93ba-4b0e0a0b2df5	branches	SUCCESS	2026-10-14 17:42:04.8	pulled 0 rows	2026-10-14 17:42:04.803126	2026-10-14 17:42:04.803126	0	\N
754e2d83-da1a-4a51-b6a3-344aa92e2216	bd3ad09d-9653-46c8-bf81-3d1f0e989af2	4a5ebbc6-7f26-4b67-877c-0d171c45d640	customers	SUCCESS	2026-10-14 17:42:04.808	pulled 0 rows	2026-10-14 17:42:04.80901	2026-10-14 17:42:04.80901	0	\N
ca4ddf27-a942-4cef-905b-4a6b0625b6c5	035690c3-40ac-47c3-a5dd-96e74ec24730	fffe25bc-54d1-435e-910a-4e726b04ee0d	expenses	SUCCESS	2026-10-14 17:42:04.847	pulled 0 rows	2026-10-14 17:42:04.848097	2026-10-14 17:42:04.848097	0	\N
1384e3ab-37b7-4222-b9af-9c73a96e6112	fc0da080-9aaf-4341-bae4-9725cd1adb6d	c00c897b-2bfe-42c2-b86e-90067fbfff0b	sales	SUCCESS	2026-10-14 17:42:04.898	pulled 0 rows	2026-10-14 17:42:04.900644	2026-10-14 17:42:04.900644	0	\N
76d1a02e-c5e1-418a-a673-b6c0592af70b	ae4b5c39-b87f-49d8-9eeb-f0b7caa8ccff	58fff317-ba59-4119-b92c-306cd3768746	purchases	SUCCESS	2026-10-14 17:42:04.851	pulled 0 rows	2026-10-14 17:42:04.852827	2026-10-14 17:42:04.852827	0	\N
a4274b2d-e47e-4988-85ea-34ed9ff3145b	83720143-b80d-41e1-b5a8-bfbd6f066a01	4f42b316-89f2-4d73-864d-466f6692d4ae	notifications	SUCCESS	2026-10-14 17:42:04.916	pulled 0 rows	2026-10-14 17:42:04.91916	2026-10-14 17:42:04.91916	0	\N
46adf3bb-c834-4fce-9b57-b7beefe5e989	8ceb1679-17dc-4bad-b8a1-6a877d29c7ca	25a355f2-5a4e-443f-96b1-17ca3dbb2c28	roles	SUCCESS	2026-10-14 17:42:04.891	pulled 0 rows	2026-10-14 17:42:04.894187	2026-10-14 17:42:04.894187	0	\N
3031c028-d1ed-4784-be54-0fe68f9ca47e	9585a5b1-1b5d-4ad7-9417-18a7f39c2b80	52fae7fd-860a-4c9a-bce5-a21646b45b16	users	SUCCESS	2026-10-14 17:42:04.897	pulled 0 rows	2026-10-14 17:42:04.897536	2026-10-14 17:42:04.897536	0	\N
38f64e30-c0e1-444a-8a3b-5b4a80c447a3	d8c47dd4-5b00-4cd3-9623-0f0b3cb204bf	854337c3-733e-471b-9de7-1ab60bf67688	inventory-transfers	SUCCESS	2026-10-14 17:42:04.898	pulled 0 rows	2026-10-14 17:42:04.898393	2026-10-14 17:42:04.898393	0	\N
1137e9db-893a-4a73-94fb-2bf7c391a875	ad69c14a-449c-4920-953a-d86a8c00506c	9ba09793-e5a6-440f-b2c7-8212f4b3abad	products	SUCCESS	2026-10-14 23:21:09.444	pulled 1 rows	2026-10-14 23:21:09.445812	2026-10-14 23:21:09.445812	0	\N
4d00ba38-15cc-432c-af99-0cab59e46f06	3bb470bc-be92-496f-8296-bc1af605d60a	df901ca6-4c7c-49a1-81c8-39a488aaf790	inventories	SUCCESS	2026-10-14 23:21:09.529	pulled 1 rows	2026-10-14 23:21:09.544257	2026-10-14 23:21:09.544257	0	\N
28912eee-edb2-4207-864a-57e9dcb82fb4	1c9551cd-6c27-460e-9836-15ab856e8f1f	e0aef4db-6b71-4680-9d78-9faed59c3062	products	SUCCESS	2026-10-15 00:06:29.507	pulled 1 rows	2026-10-15 00:06:29.507645	2026-10-15 00:06:29.507645	0	\N
d390f68e-c4ed-4821-a094-4830099cdcaa	9727bb5b-6bd2-4e0f-b6d1-02c38c5c1e1d	dfe38a54-8714-4985-9eca-8c613af18e70	inventories	SUCCESS	2026-10-15 00:06:29.589	pulled 1 rows	2026-10-15 00:06:29.599587	2026-10-15 00:06:29.599587	0	\N
b7e44f04-496e-4a9b-810c-326b4bec21fc	b4019ddf-2a3b-4998-9419-31135158e21a	f4097e3f-5b68-4228-8d4e-1e9e75aac97c	products	SUCCESS	2026-10-15 00:07:31.631	pulled 1 rows	2026-10-15 00:07:31.674638	2026-10-15 00:07:31.674638	0	\N
2989a932-e12c-424b-8016-1a05156b3bb8	ff499e15-a09e-4705-a452-effcc3a037b5	a7a98f9d-4c2f-448f-9b8c-2d68697e1170	branches	SUCCESS	2026-10-15 00:07:31.936	pulled 1 rows	2026-10-15 00:07:31.9588	2026-10-15 00:07:31.9588	0	\N
c9a9504f-cfed-4d09-93e2-d73c3ce0d5fd	9ddd99a8-8c62-4a89-9d51-825552f46088	f0a60887-0398-47db-ad2c-4e8b75648bbb	users	SUCCESS	2026-10-15 00:07:32.061	pulled 1 rows	2026-10-15 00:07:32.062478	2026-10-15 00:07:32.062478	0	\N
32a5b91f-bb82-4202-8a89-d5a16c05e469	8ac69332-e673-4261-a66b-545569678eef	3006ac17-64d8-4ecd-b7a7-5bc3c94d23ff	roles	SUCCESS	2026-10-15 00:07:32.493	pulled 7 rows	2026-10-15 00:07:32.49411	2026-10-15 00:07:32.49411	0	\N
69f3ce1a-adae-4296-8937-dd59823df54b	39e3602c-c511-4161-8d72-2e75c7730bd8	5d0d0628-159f-4c6a-abcf-c3bcc8f9666a	suppliers	SUCCESS	2026-10-15 00:07:32.877	pulled 0 rows	2026-10-15 00:07:32.878055	2026-10-15 00:07:32.878055	0	\N
ca0ba80d-e4f0-4357-a486-f5c32781c5db	17c657f6-8847-41fb-9e6a-7dfe5569bdd6	3bd203ee-8e15-42c0-a53f-779e4ae98ac5	categories	SUCCESS	2026-10-15 00:07:33.114	pulled 0 rows	2026-10-15 00:07:33.121704	2026-10-15 00:07:33.121704	0	\N
787d12ba-74e0-4488-8663-a11f295dc092	dde4af7b-4ddd-4c49-a0fc-1b23ffe3f713	ec8e406c-2687-4a07-88bd-6d6fa990590c	customers	SUCCESS	2026-10-15 00:07:33.131	pulled 0 rows	2026-10-15 00:07:33.131584	2026-10-15 00:07:33.131584	0	\N
bd294d5a-5145-483e-a0aa-ef1de2197eb0	f4e9f41b-2cc0-49f1-a14d-d812fcfa7df4	94f75f04-04cf-4647-ac4b-be0362e555e6	inventories	SUCCESS	2026-10-15 00:18:18.293	pulled 1 rows	2026-10-15 00:18:18.332498	2026-10-15 00:18:18.332498	0	\N
f8f211a1-5050-4d01-a7d5-9219ec5383b7	9e49b67a-78c8-4a11-ac85-25e1171be463	a4b706a5-738d-4754-afae-59d2c7a82edd	products	SUCCESS	2026-10-15 00:18:18.589	pulled 1 rows	2026-10-15 00:18:18.592144	2026-10-15 00:18:18.592144	0	\N
6875ae64-1f70-4bcf-a4cc-c3d0ec480970	dev-mv8sfcyr-znvk52qg6l	21eee49d-b03a-454a-8aee-7c31afdfc859	sales	SUCCESS	2026-10-15 00:18:44.10202	\N	2026-10-15 00:18:44.016774	2026-10-15 00:18:44.10202	0	\N
f56b3032-ad16-4dfd-855f-8d3d90d76ae4	cdacf61e-2b4f-4e70-88f9-c339b28098b9	770c320c-220c-4bb8-83ac-98580860c616	products	SUCCESS	2026-10-15 00:19:51.496	pulled 1 rows	2026-10-15 00:19:51.497698	2026-10-15 00:19:51.497698	0	\N
909ea21c-4629-42aa-8815-45be729245bd	830ac8a2-82d0-44f9-a984-bb440f3235e8	503d5689-0863-40ed-ae92-4ac8fe2ad8b0	categories	SUCCESS	2026-10-15 00:19:51.51	pulled 0 rows	2026-10-15 00:19:51.51103	2026-10-15 00:19:51.51103	0	\N
19f19a51-fe57-4b74-893c-9c942cd66866	7dc976ef-b58a-4d9c-8b1e-d93639f89216	c11e4d1c-dcce-486b-9e6c-28981ed17f46	users	SUCCESS	2026-10-15 00:19:51.53	pulled 1 rows	2026-10-15 00:19:51.531431	2026-10-15 00:19:51.531431	0	\N
18efbf12-f310-49dd-9e33-161f19eb5635	10890a9c-6b7f-41eb-8f74-9fffd35ef754	fcadbf3e-f288-45ce-8466-dfd8045757d7	roles	SUCCESS	2026-10-15 00:19:51.554	pulled 7 rows	2026-10-15 00:19:51.554842	2026-10-15 00:19:51.554842	0	\N
20b97e94-f018-49f8-bb2c-da43208aca7b	c0289adf-dd58-4d2e-a5ea-1d788350cd1c	23094fe2-66cc-4421-b3fe-3f746a86e762	customers	SUCCESS	2026-10-15 00:19:51.557	pulled 0 rows	2026-10-15 00:19:51.559361	2026-10-15 00:19:51.559361	0	\N
a35dd4f8-bd7b-4249-9829-3872897c1e2e	160a1550-f00f-47d3-b096-47601bc78d0e	60ae34e7-654a-41b4-bcf6-7ebfe2a778e3	suppliers	SUCCESS	2026-10-15 00:19:51.571	pulled 0 rows	2026-10-15 00:19:51.571643	2026-10-15 00:19:51.571643	0	\N
4e55d783-e784-408e-bee3-eceb462ec322	4ccb31ba-827d-4633-852d-1522670959fe	dcf5f4f4-0089-4f69-adb9-f50bc5f6f672	branches	SUCCESS	2026-10-15 00:19:51.579	pulled 1 rows	2026-10-15 00:19:51.580279	2026-10-15 00:19:51.580279	0	\N
909a7784-f6d0-4f5b-8fff-16ed24989f18	bc1b1fdc-5c9f-467b-8c1f-9fe9a2931596	30c80097-418a-4ed7-9c35-ac10d622aae1	products	SUCCESS	2026-10-15 00:19:59.859	pulled 1 rows	2026-10-15 00:19:59.859385	2026-10-15 00:19:59.859385	0	\N
ae034a21-21ea-42e0-ad90-a296b576faca	8dc4af5e-2952-4eff-9fa2-0f5d53dd7441	793fefd3-d3a7-4c40-a46f-712bc16b50a6	branches	SUCCESS	2026-10-15 00:19:59.862	pulled 0 rows	2026-10-15 00:19:59.863752	2026-10-15 00:19:59.863752	0	\N
1b4afeb9-10ef-44a6-872c-6ae0e5856741	4303cf2d-ede9-45b5-b1e8-34533cea33fd	81935792-085b-4b07-b72d-1127c0d8ebe7	customers	SUCCESS	2026-10-15 00:19:59.887	pulled 0 rows	2026-10-15 00:19:59.888042	2026-10-15 00:19:59.888042	0	\N
0c8d0207-c6b1-48aa-8d4f-97962aff9bf8	14cc4b74-9d5e-4751-8e2e-bbf1cf39a9ba	4e4591fd-24b1-4399-88ab-e35f2bd713d0	categories	SUCCESS	2026-10-15 00:19:59.888	pulled 0 rows	2026-10-15 00:19:59.888585	2026-10-15 00:19:59.888585	0	\N
0321905a-91ca-4b45-8f04-c1df8e8ac568	2b10c7fd-9f60-47a3-8e66-b6f6d13988c0	f6dbfb95-1ab6-44eb-8ee4-59eea2270719	users	SUCCESS	2026-10-15 00:19:59.904	pulled 0 rows	2026-10-15 00:19:59.904489	2026-10-15 00:19:59.904489	0	\N
67b2ee6b-14de-44d3-8857-74f43d2c7ce5	2337bbd5-7b79-46ad-9a60-caf765557523	70f2f245-1f3f-45e2-b587-e6fea5984c27	suppliers	SUCCESS	2026-10-15 00:19:59.925	pulled 0 rows	2026-10-15 00:19:59.926178	2026-10-15 00:19:59.926178	0	\N
97ac5158-f011-4352-9406-da577ae81b2b	027e0fe7-9bc4-4a43-84bb-9142d014bc50	80a715ed-4b7e-4a8a-ad66-216759c80ed7	roles	SUCCESS	2026-10-15 00:19:59.934	pulled 0 rows	2026-10-15 00:19:59.934989	2026-10-15 00:19:59.934989	0	\N
a9114a02-dcd5-41ca-b0a9-c210ae3926b6	25c1ed31-7409-4ac7-af41-deddb6b61887	f0085593-bf28-4086-99f0-edb8e38cdc2c	products	SUCCESS	2026-10-15 00:20:09.928	pulled 1 rows	2026-10-15 00:20:09.928867	2026-10-15 00:20:09.928867	0	\N
3682d4ea-410b-4960-b844-8e634e52b79b	0d3b5446-5770-4885-8682-1085466947ed	c71ab22b-0ce1-4815-a272-19f6bbc6a257	branches	SUCCESS	2026-10-15 00:20:09.988	pulled 0 rows	2026-10-15 00:20:09.9888	2026-10-15 00:20:09.9888	0	\N
64a890e3-3cf4-4ef8-a665-55925dc95049	0ae0059e-4698-4b57-985a-42462f57c08a	1a829ae8-d69b-44d6-9e4e-7c3b9020c667	suppliers	SUCCESS	2026-10-15 00:20:10.054	pulled 0 rows	2026-10-15 00:20:10.054528	2026-10-15 00:20:10.054528	0	\N
e1925a0c-f23f-4f8d-8a57-ecfb73a05b27	22ddc15e-1016-4113-83b8-50cb9722540b	89d32713-e39b-4522-9abb-be463312fd7a	users	SUCCESS	2026-10-15 00:20:10.089	pulled 0 rows	2026-10-15 00:20:10.089831	2026-10-15 00:20:10.089831	0	\N
148d12cd-f8b9-419e-b15c-71b56c1bfb36	b4663ec7-0bd2-4ddc-9263-14e0b70a48da	a5953b1f-1a92-429f-b9aa-451702e3942b	categories	SUCCESS	2026-10-15 00:20:10.104	pulled 0 rows	2026-10-15 00:20:10.105568	2026-10-15 00:20:10.105568	0	\N
01a8fd6d-17dc-47f3-a8d3-b79c12153b81	1aa845ec-a89c-4290-86ad-77a9f1f1ee7d	a90c2a22-13ef-4a79-ab52-b5896716dc04	customers	SUCCESS	2026-10-15 00:20:10.191	pulled 0 rows	2026-10-15 00:20:10.191755	2026-10-15 00:20:10.191755	0	\N
60df1450-6a5e-4e2b-a026-bd448aaaf7d6	2ec40aab-c992-4341-af0b-0ec93da9e7c7	f3cf146b-42ee-4737-8451-abdbedac2e51	roles	SUCCESS	2026-10-15 00:20:10.235	pulled 0 rows	2026-10-15 00:20:10.235925	2026-10-15 00:20:10.235925	0	\N
58ddd046-38e3-4604-8918-d721e203ba32	12723454-1e33-4cd6-96ea-69f673e05875	e99cc58d-497b-4b45-9539-bbecd442f861	suppliers	SUCCESS	2026-10-15 00:30:46.45	pulled 0 rows	2026-10-15 00:30:46.45848	2026-10-15 00:30:46.45848	0	\N
43516957-d2e6-4b99-b45e-b1614a11a8ff	9c87071f-c0a8-4ead-9088-51798008846d	9cdcb78a-bb6b-44b3-ac83-8add2f9b0689	customers	SUCCESS	2026-10-15 00:30:46.436	pulled 0 rows	2026-10-15 00:30:46.453619	2026-10-15 00:30:46.453619	0	\N
dea104ee-fe65-4707-99c4-8e1cf71d2a2d	f3c62a22-a554-480a-81a6-a94854a76df2	946f0fae-ee60-4e63-89dc-5aa57ad8ecf6	products	SUCCESS	2026-10-15 00:30:46.635	pulled 1 rows	2026-10-15 00:30:46.639796	2026-10-15 00:30:46.639796	0	\N
4bdefa3b-0cb0-4a24-a6f0-6d32f3941adb	d349756b-99a0-4045-adc9-f10f7c4e1b2f	d49640d2-31ad-4e6f-a8b3-0007ef91edb9	categories	SUCCESS	2026-10-15 00:30:46.639	pulled 0 rows	2026-10-15 00:30:46.656976	2026-10-15 00:30:46.656976	0	\N
d7bf078a-922a-47bf-bb39-fa186a447780	6668280d-310b-4f50-980a-029e1561b874	8cc9c526-63d5-4a56-b863-3e4b226248c1	users	SUCCESS	2026-10-15 00:30:46.751	pulled 0 rows	2026-10-15 00:30:46.752339	2026-10-15 00:30:46.752339	0	\N
babc9f7a-cc6e-41be-968a-fbb615560db5	c04f9d77-85c7-4af4-b5e7-cc88b5c205e9	2151d7fe-9545-4636-8357-654cbe9d5c2c	branches	SUCCESS	2026-10-15 00:30:46.766	pulled 0 rows	2026-10-15 00:30:46.767544	2026-10-15 00:30:46.767544	0	\N
8567896c-86eb-4975-b54f-2f0e0aaeebb5	c41d7075-a137-4fc2-b694-e877a5a5c400	b6abad67-82f7-456a-bfee-7e274b94f82e	roles	SUCCESS	2026-10-15 00:30:46.792	pulled 0 rows	2026-10-15 00:30:46.793402	2026-10-15 00:30:46.793402	0	\N
a86c1dfc-abe8-45c8-9b5d-d2898ead1cbd	ed955944-75f0-4e24-b68c-76e8a4286c74	5388b0a8-7637-400c-918b-316724b672a2	categories	SUCCESS	2026-10-15 00:35:08.834	pulled 0 rows	2026-10-15 00:35:08.84275	2026-10-15 00:35:08.84275	0	\N
9d6c47ab-176b-4ca2-b45f-1c1afe468abb	1df7c2c7-0948-4d45-a118-5df5f58691b5	51f9034d-caa4-4bcc-9c89-506e6c3c74a4	suppliers	SUCCESS	2026-10-15 00:35:08.947	pulled 0 rows	2026-10-15 00:35:08.947726	2026-10-15 00:35:08.947726	0	\N
223e3274-edce-4561-811c-97f90ce34e53	906fee0b-0360-48f6-b6b4-e9012d932e71	c0f770a6-066d-4030-9260-9e77abace0aa	customers	SUCCESS	2026-10-15 00:35:08.967	pulled 0 rows	2026-10-15 00:35:08.977262	2026-10-15 00:35:08.977262	0	\N
212deb8c-e9bb-49c5-81eb-6bf5e8cba7da	e7a70563-6a63-4447-b098-713b08fd96b0	35db9528-7de9-4049-aee4-a9c2f41efda9	products	SUCCESS	2026-10-15 00:35:08.996	pulled 1 rows	2026-10-15 00:35:08.999314	2026-10-15 00:35:08.999314	0	\N
7675824e-8e64-40ff-a2ba-97fa8115b37c	26904f36-0fdf-45d3-a90a-7e1e90b6f1e2	fc0c9ed6-39cb-44da-a0f9-9019433f44e8	branches	SUCCESS	2026-10-15 00:35:09.077	pulled 0 rows	2026-10-15 00:35:09.078027	2026-10-15 00:35:09.078027	0	\N
1f668b98-3b39-48a6-97aa-0f673ac057da	7c64c658-e8ab-48c2-8742-9b140500b4cb	b79a37ff-6259-4eed-8f7d-6e6295e48d23	roles	SUCCESS	2026-10-15 00:35:09.164	pulled 0 rows	2026-10-15 00:35:09.165371	2026-10-15 00:35:09.165371	0	\N
5c87a1d2-e159-443f-b46d-20435a99f0d5	64c74364-f976-44bd-bc88-2ec711651d0f	4ef2864b-a003-42a7-8407-ee54718e9eec	users	SUCCESS	2026-10-15 00:35:09.181	pulled 0 rows	2026-10-15 00:35:09.182065	2026-10-15 00:35:09.182065	0	\N
e9163ed9-35d8-4bfc-be3f-55ea14306eb0	9d92e1b4-bdb5-49c0-88a4-e4d8d7ef7a3e	52a2e445-a20e-4f2a-8a72-a1f4de8f322f	customers	SUCCESS	2026-10-15 00:35:09.344	pulled 0 rows	2026-10-15 00:35:09.347079	2026-10-15 00:35:09.347079	0	\N
744a5cbb-250e-4763-9119-b0eb0adbc5cd	3f785574-113a-4477-8f0b-2272a963d524	aef50af1-1c58-40f2-90ab-f8cb436b5317	categories	SUCCESS	2026-10-15 00:35:09.345	pulled 0 rows	2026-10-15 00:35:09.346065	2026-10-15 00:35:09.346065	0	\N
86bd4487-20a7-41b7-8437-0b859b9ac113	184b9918-f639-4e38-90a6-9cf4a2e3d677	3129d23c-b1d4-47c9-b4b6-90173ff5c38a	products	SUCCESS	2026-10-15 00:35:09.348	pulled 1 rows	2026-10-15 00:35:09.351967	2026-10-15 00:35:09.351967	0	\N
4eab4164-6c6e-4c5e-b5ba-411dcfe96b5b	d63980c9-7732-4133-b529-2edd51282226	c9e86c94-1eaf-4880-a0e0-d8b63f786da5	roles	SUCCESS	2026-10-15 00:35:09.346	pulled 0 rows	2026-10-15 00:35:09.346691	2026-10-15 00:35:09.346691	0	\N
2c99866d-e2fb-480f-9a88-5305aaed0280	7e1e76b5-43d3-4284-acb5-67990713118e	f0d76779-706d-4077-b726-ab8e85bc92de	suppliers	SUCCESS	2026-10-15 00:35:09.416	pulled 0 rows	2026-10-15 00:35:09.41736	2026-10-15 00:35:09.41736	0	\N
9b6e22a2-5d81-43c2-b90c-62a240f5b31e	c80594d1-551c-4c5a-9ade-45038a43ac34	e4f7bca2-2276-41b7-94c8-568c58cc639e	branches	SUCCESS	2026-10-15 00:35:09.439	pulled 0 rows	2026-10-15 00:35:09.44193	2026-10-15 00:35:09.44193	0	\N
7f74fa7b-183f-4eaf-b7c0-8aaf8b6675ae	75b61c53-7b01-4413-abb4-babcd635d889	9e4fa810-cec5-486d-86be-a126ca4be958	users	SUCCESS	2026-10-15 00:35:09.467	pulled 0 rows	2026-10-15 00:35:09.467751	2026-10-15 00:35:09.467751	0	\N
25827497-2b2e-4e92-a08a-f9f9f78b7bb1	19556082-2548-403a-b858-ac5a83a3c9d7	fade4122-461a-4838-8718-2bce5a73253e	categories	SUCCESS	2026-10-15 00:49:50.212	pulled 0 rows	2026-10-15 00:49:50.213089	2026-10-15 00:49:50.213089	0	\N
fc77354f-9e3f-4d1f-b82b-bd90ce5d05fc	d8c3339f-3131-4914-af40-445f8554dac0	72b3fcd8-0414-49b2-ab20-400cbb8bd687	products	SUCCESS	2026-10-15 00:49:50.296	pulled 1 rows	2026-10-15 00:49:50.29659	2026-10-15 00:49:50.29659	0	\N
ec6dfb8f-8d3e-4e32-8bb1-160fcee49804	bd8349ea-ed83-40dd-8d09-6b4b587b772a	3d443ab1-a58e-4366-8384-209afffbf60c	suppliers	SUCCESS	2026-10-15 00:49:50.354	pulled 0 rows	2026-10-15 00:49:50.354664	2026-10-15 00:49:50.354664	0	\N
06ba2b70-eda5-413a-b982-4b999eba46a4	a66c0f9b-e1b0-44d1-9a9f-2a26f3dc2e69	7a38ec15-3fc8-443c-be3b-0f7c5c2d8337	products	SUCCESS	2026-10-15 00:49:50.361	pulled 1 rows	2026-10-15 00:49:50.361511	2026-10-15 00:49:50.361511	0	\N
6c150dea-db9b-4fa7-bb4a-44bd56ab82a0	e5b018a8-5d7f-4e16-b5c6-aae401be59b7	8bb4ccb8-ffaa-463c-b5d5-6f6ec60c73e3	customers	SUCCESS	2026-10-15 00:49:50.393	pulled 0 rows	2026-10-15 00:49:50.396866	2026-10-15 00:49:50.396866	0	\N
f35cbaf2-4b84-4d41-84cc-a3e9da2451aa	8473d4e4-9677-4d04-a28a-b571f63d64c8	181598c5-088d-455b-881c-e8ca8bc9c967	users	SUCCESS	2026-10-15 00:49:50.428	pulled 0 rows	2026-10-15 00:49:50.429365	2026-10-15 00:49:50.429365	0	\N
82059fbd-0d60-4946-8eb7-73dae162e6a0	781fb66a-38a6-479d-9d25-8c15c751f97f	14bbb96a-4773-4288-b8e4-755976fba26f	branches	SUCCESS	2026-10-15 00:49:50.44	pulled 0 rows	2026-10-15 00:49:50.445401	2026-10-15 00:49:50.445401	0	\N
7fb48557-40eb-406e-a8b2-7f5d58040062	285cc5ff-65e6-4dc3-8853-0863cf5bd832	f623efc0-2cf8-475c-a1f7-599a724ecbf9	roles	SUCCESS	2026-10-15 00:49:50.478	pulled 0 rows	2026-10-15 00:49:50.479184	2026-10-15 00:49:50.479184	0	\N
237e0e5d-155d-42c1-b4a7-963bc4bde712	96253289-1e76-4135-a512-ee6a650203ec	4aa52eb7-b41d-4860-9131-d564eeb82a1a	categories	SUCCESS	2026-10-15 00:49:50.486	pulled 0 rows	2026-10-15 00:49:50.486625	2026-10-15 00:49:50.486625	0	\N
2fa397c0-441c-4327-abf1-cedae9c63324	ccce722c-37c5-40cf-9fae-0e21c63de754	f467120d-93e6-4b39-a65d-cb8df2bbc0e9	suppliers	SUCCESS	2026-10-15 00:49:50.529	pulled 0 rows	2026-10-15 00:49:50.531865	2026-10-15 00:49:50.531865	0	\N
dde784af-1c21-4c4b-b1e0-eaa7ea5305e7	fbc26a94-f375-402e-ba15-0cc151ce1cda	d73a1cd0-27b9-4ec5-980f-eb96a4b611c4	roles	SUCCESS	2026-10-15 00:49:50.661	pulled 0 rows	2026-10-15 00:49:50.661902	2026-10-15 00:49:50.661902	0	\N
e726040f-e6ea-4c68-b508-736af949abec	cbabbd3a-7519-421f-a493-a6691e931ec5	b8cb42c0-2fdc-4150-befe-dc4e9f91970b	branches	SUCCESS	2026-10-15 00:49:50.741	pulled 0 rows	2026-10-15 00:49:50.741524	2026-10-15 00:49:50.741524	0	\N
15a5fd8e-9835-4c4e-8691-3f6cd8cb0004	b54c67a7-539d-4d88-b2a1-678e81653e97	240df566-0f3b-4dd2-a35d-6eb62dd5f5a4	customers	SUCCESS	2026-10-15 00:49:50.736	pulled 0 rows	2026-10-15 00:49:50.741594	2026-10-15 00:49:50.741594	0	\N
5fe72e35-2942-4278-9d83-64b66bdf1f03	7e1163c7-8fbe-43ae-833f-bcdd5b60b780	3361648e-279d-4aa1-b909-ea083a5f81dc	users	SUCCESS	2026-10-15 00:49:50.767	pulled 0 rows	2026-10-15 00:49:50.769484	2026-10-15 00:49:50.769484	0	\N
b27857e5-1020-41ca-b90c-9b411f4aef15	35ad5e9e-caed-466a-bdd7-2344c864fa06	8b077fac-477e-49a6-b5d6-cfe6a9960b8e	categories	SUCCESS	2026-10-15 00:50:04.118	pulled 0 rows	2026-10-15 00:50:04.118593	2026-10-15 00:50:04.118593	0	\N
ab2f2293-c447-409d-a3fc-64ee495a107f	ec9fbcf6-f8df-4f6a-bf73-5ca031f43aee	42c351db-91e3-4683-a5e1-f9bcd318f975	suppliers	SUCCESS	2026-10-15 00:50:04.12	pulled 0 rows	2026-10-15 00:50:04.120555	2026-10-15 00:50:04.120555	0	\N
300f8f44-7942-4b34-a556-ce8bf88e081f	b339fa2e-5738-4ea0-9adc-601a024e25c0	f826a39c-9903-4c19-a4e1-d8503b49e22f	roles	SUCCESS	2026-10-15 00:50:04.124	pulled 0 rows	2026-10-15 00:50:04.125046	2026-10-15 00:50:04.125046	0	\N
303b275d-750d-40e9-ba2b-cbcd8da9b345	b561c3e1-ad30-4fc2-8a13-0dcb6a8cbdbe	8b6e6cc9-a3de-406b-942a-37fa0af1d60d	users	SUCCESS	2026-10-15 00:50:04.195	pulled 0 rows	2026-10-15 00:50:04.202082	2026-10-15 00:50:04.202082	0	\N
8e3f6588-6f16-4857-afd8-93afd99eab85	2d6df15c-8c11-4dbe-b9d0-6897c855720b	0f1db9f1-36a3-4218-b69d-00582554e862	customers	SUCCESS	2026-10-15 00:50:04.284	pulled 0 rows	2026-10-15 00:50:04.285785	2026-10-15 00:50:04.285785	0	\N
dff9dad4-a38a-44f3-be9d-ee2652ce56a5	00e21d5f-68cc-49a6-b78b-149df6cd16d9	66d720ba-c341-4c44-b140-66aab06604e8	branches	SUCCESS	2026-10-15 00:50:04.286	pulled 0 rows	2026-10-15 00:50:04.28783	2026-10-15 00:50:04.28783	0	\N
c9c425bb-0e7d-4420-ac3a-1407f55679fd	596dfc2a-ae61-45ab-8651-2b3f7b21b1f4	4627c9bf-2da2-41c3-9590-8121cb2e6a99	products	SUCCESS	2026-10-15 00:50:04.289	pulled 1 rows	2026-10-15 00:50:04.289739	2026-10-15 00:50:04.289739	0	\N
27037113-a271-4dc7-9b8e-cdae5a739bac	f4f5c0c7-4f72-40d3-9c31-f1ac1c6006b1	930625de-0ff5-478c-9b09-3c1f45458e15	suppliers	SUCCESS	2026-10-15 02:10:37.442	pulled 0 rows	2026-10-15 02:10:37.442642	2026-10-15 02:10:37.442642	0	\N
3450d674-a257-4114-94df-d78da99f9aea	06297877-ad4f-4b13-b735-7cc7f2ddd57a	eb1774ae-d925-4c45-b251-1f7f1bf2ffeb	categories	SUCCESS	2026-10-15 02:10:37.464	pulled 0 rows	2026-10-15 02:10:37.492543	2026-10-15 02:10:37.492543	0	\N
9c306584-27a9-4d98-ab81-28c34cfe59da	95bc0bde-c01b-4888-83d4-86f176e5bfce	3dbf9a73-59b5-400c-a8f0-ab903791de50	products	SUCCESS	2026-10-15 02:10:37.447	pulled 1 rows	2026-10-15 02:10:37.465087	2026-10-15 02:10:37.465087	0	\N
70073f9d-677a-461e-8f09-0a0db78e0c48	5e78ad51-5cb6-4a4a-8144-c9415c59d167	4a4b89c1-154b-4639-9638-976665b4b785	roles	SUCCESS	2026-10-15 02:10:37.643	pulled 7 rows	2026-10-15 02:10:37.651375	2026-10-15 02:10:37.651375	0	\N
e9625e30-c035-498a-a3ae-055e1dfb2ba2	65b24a2c-5345-4ef6-8acc-821d9318ef5a	3cfe91bb-2d71-4086-862f-79c26b0ca377	customers	SUCCESS	2026-10-15 02:10:37.647	pulled 0 rows	2026-10-15 02:10:37.655735	2026-10-15 02:10:37.655735	0	\N
ce8361be-1cef-4cd2-a7f7-3ec9d8d03669	c0bfe32f-0e7c-4add-93d2-3b9eb988e929	8a2e2d14-f718-42bd-b6a2-5e8d99885ecc	users	SUCCESS	2026-10-15 02:10:37.764	pulled 1 rows	2026-10-15 02:10:37.765015	2026-10-15 02:10:37.765015	0	\N
55e686ab-aac1-44c6-9c77-c5c385b355ce	44c8eafc-588a-41aa-8e41-27d2d3586283	bcaa10ff-ce3a-41bd-a02c-93554dbae585	branches	SUCCESS	2026-10-15 02:10:37.801	pulled 1 rows	2026-10-15 02:10:37.804581	2026-10-15 02:10:37.804581	0	\N
9c291e5b-6f41-4823-8041-83c0e572c056	2c596585-ba9c-4ecd-ba02-a9f492393cae	6f58bbca-ddc8-49e5-9a9a-cd7b579e1c5b	products	SUCCESS	2026-10-15 11:24:16.895	pulled 1 rows	2026-10-15 11:24:16.907698	2026-10-15 11:24:16.907698	0	\N
17765430-6e21-4b6f-a58f-4c5502f63961	3f5aba8a-420c-4119-9d58-1c7a44ee8899	d771de94-6ec4-4a66-9816-cae71f1fb8f7	inventories	SUCCESS	2026-10-15 11:24:17.017	pulled 1 rows	2026-10-15 11:24:17.018874	2026-10-15 11:24:17.018874	0	\N
0e26f1f6-c710-4066-959e-23cc6bb8eb5a	c4a7dcf5-7961-40c0-90ee-8a697ed65df0	52b0c42e-b8eb-42cd-a41a-672041a39277	products	SUCCESS	2026-10-15 18:24:00.634	pulled 1 rows	2026-10-15 18:24:00.635127	2026-10-15 18:24:00.635127	0	\N
9828c0d7-0d3e-4726-80d7-daa2cd298087	cc425634-69d9-48a0-9a86-9b9f184bb3eb	c1dfc8e2-346e-4e18-b909-2daf2a409157	categories	SUCCESS	2026-10-15 18:24:00.829	pulled 0 rows	2026-10-15 18:24:00.831986	2026-10-15 18:24:00.831986	0	\N
31e0893a-3b83-47ea-9ed7-58f3ee7c63c4	c4536e64-2eb1-476c-9ba9-9345f462f5a7	d2580da1-02a0-4170-8190-8995ef7f19cd	roles	SUCCESS	2026-10-15 18:24:00.906	pulled 7 rows	2026-10-15 18:24:00.907219	2026-10-15 18:24:00.907219	0	\N
5437f540-06fc-4a0a-8da4-05b196914930	369e81d5-35a0-44d0-93c1-d758ec021bcd	b91d5d60-edb2-4b3f-80af-06be002baae8	customers	SUCCESS	2026-10-15 18:24:00.936	pulled 0 rows	2026-10-15 18:24:00.946796	2026-10-15 18:24:00.946796	0	\N
33b1a6d0-5bc3-4f2e-ae3e-993cd8cbd799	9100f6d1-c676-4e87-9286-9e4a3c3020a7	f6e99de6-9732-4e84-98d9-eeb30201052e	users	SUCCESS	2026-10-15 18:24:00.951	pulled 1 rows	2026-10-15 18:24:00.952272	2026-10-15 18:24:00.952272	0	\N
9bb2d3a5-5a15-4772-9fe4-309b2d463d4c	6a4903d6-2c83-4e9d-abe3-25e702303c99	2d9a05f1-be84-40f5-a3ae-29f6f00001d0	branches	SUCCESS	2026-10-15 18:24:00.952	pulled 1 rows	2026-10-15 18:24:00.953177	2026-10-15 18:24:00.953177	0	\N
dfcbce41-6941-4b12-b24e-a45d74b41526	8912c2b6-2c25-4d1d-860d-3d4c8319751e	ad4cbfb8-a72e-40e3-9194-7e042b45c663	suppliers	SUCCESS	2026-10-15 18:24:00.966	pulled 1 rows	2026-10-15 18:24:00.966895	2026-10-15 18:24:00.966895	0	\N
b8bbb4da-259f-4c36-98fa-b56710f6044a	97fa2145-2d7f-4c7e-832d-3a5f2aebed7b	cf0e79e8-9b08-4d67-b2aa-f3b3395a8e95	products	SUCCESS	2026-10-15 18:24:06.514	pulled 1 rows	2026-10-15 18:24:06.514971	2026-10-15 18:24:06.514971	0	\N
944e5008-c33a-4114-932d-a23d843699da	0261ecbc-1e92-4030-bcc7-2ec0e53b949b	52710176-c289-4ad2-a4c0-5b69f11719f4	categories	SUCCESS	2026-10-15 18:24:06.601	pulled 0 rows	2026-10-15 18:24:06.601804	2026-10-15 18:24:06.601804	0	\N
27a87d4d-96d4-4379-b42a-7126c8f505d2	674ab888-fc9b-41a7-a621-137fc26619a9	b9405833-98f7-4eab-8082-37c44e6019a9	customers	SUCCESS	2026-10-15 18:24:06.625	pulled 0 rows	2026-10-15 18:24:06.62551	2026-10-15 18:24:06.62551	0	\N
70f4b36e-c729-4626-bb25-be659d200bb0	b38caa8f-4cbd-41ee-86d1-9175be7de2e1	09813bb6-61c8-4912-a832-cb4ed972988b	suppliers	SUCCESS	2026-10-15 18:24:06.64	pulled 0 rows	2026-10-15 18:24:06.641225	2026-10-15 18:24:06.641225	0	\N
e8f1b67b-bf33-4ce8-b409-3a5a6fa5d8d3	11fbfb57-dc5a-49a1-bfd5-c395d0ec5849	549a6056-a8b3-4a21-bd5e-1b42456ca029	branches	SUCCESS	2026-10-15 18:24:06.658	pulled 0 rows	2026-10-15 18:24:06.658975	2026-10-15 18:24:06.658975	0	\N
009f0016-2057-4fbf-87fa-f5b2ee29b282	905b453c-1575-4f44-b621-4a68ff377d65	a41f599b-bcf8-4e12-a757-3212bbfac78e	users	SUCCESS	2026-10-15 18:24:06.675	pulled 0 rows	2026-10-15 18:24:06.675643	2026-10-15 18:24:06.675643	0	\N
c46d5c17-c3bb-4efc-87e1-86433eca60c4	db47bc58-b35d-446c-b369-3bfc4dd26cd7	3cd823aa-40a3-4fd1-aca5-ed4ef1531a68	roles	SUCCESS	2026-10-15 18:24:06.689	pulled 0 rows	2026-10-15 18:24:06.689384	2026-10-15 18:24:06.689384	0	\N
5ad16388-2647-467c-bfe1-73e31cec3370	88a50d85-5901-4b46-8e9e-5e09e8df0a15	cc67e7f1-814e-4a0d-9dd0-6ba2d2b3de1d	products	SUCCESS	2026-10-15 18:24:09.532	pulled 1 rows	2026-10-15 18:24:09.53308	2026-10-15 18:24:09.53308	0	\N
7163517b-b73d-40bb-84bc-d00efdf5cf07	ef93f316-819c-4035-b624-a27f6ad3e2e6	053f3821-7ca9-4f0b-9b5a-16b30a75f5e4	categories	SUCCESS	2026-10-15 18:24:09.605	pulled 0 rows	2026-10-15 18:24:09.606001	2026-10-15 18:24:09.606001	0	\N
5fbe5a5f-535a-4dad-84fb-b1491e70c284	9b612df9-6326-4c0c-99e4-49f85816ee21	8a214822-562e-4cb2-bcea-9ce39e6ef165	suppliers	SUCCESS	2026-10-15 18:24:09.618	pulled 0 rows	2026-10-15 18:24:09.618765	2026-10-15 18:24:09.618765	0	\N
22758f46-60d4-402e-a451-55ab15b99de9	eeb2fdea-b2f5-4f4b-9f9f-10d21d03ec9e	ffd5fbbb-5a7c-4fe7-b4c6-7d5b2de69cb4	customers	SUCCESS	2026-10-15 18:24:09.631	pulled 0 rows	2026-10-15 18:24:09.631891	2026-10-15 18:24:09.631891	0	\N
23421827-d899-4029-ab04-325b8aa61e3d	0f3c035a-2e92-49e0-80d7-c5b99665b0ff	40dd24e5-dbd1-4b92-91b4-4a1025833180	branches	SUCCESS	2026-10-15 18:24:09.654	pulled 0 rows	2026-10-15 18:24:09.655107	2026-10-15 18:24:09.655107	0	\N
0ed70d91-1829-4912-9a16-f0ff57ddb8a3	1f0a3554-3483-4c46-a072-4612c11562ce	5e71f7a4-8eab-4a6a-b50f-59f21271696b	users	SUCCESS	2026-10-15 18:24:09.685	pulled 0 rows	2026-10-15 18:24:09.686147	2026-10-15 18:24:09.686147	0	\N
166cba89-bea5-4b7b-b172-7e3a9ee287be	bb68fde4-8243-4989-8bdf-9e20a3105d01	3c1baa0e-a177-40c4-9549-2df7d060df97	roles	SUCCESS	2026-10-15 18:24:09.701	pulled 0 rows	2026-10-15 18:24:09.702312	2026-10-15 18:24:09.702312	0	\N
6667c543-89aa-4342-a248-0d2a0de40deb	7a99fcce-ba1d-4957-955e-b0128cbfd81f	24d65bdc-edf1-45c3-8158-b88353488661	products	SUCCESS	2026-10-15 18:24:15.613	pulled 1 rows	2026-10-15 18:24:15.61441	2026-10-15 18:24:15.61441	0	\N
aa723528-0418-448f-b955-6b8c57af27cd	922bf620-5bcb-414d-a124-596bb4b88dd3	225000ff-319b-4b9d-8ca6-264441ca02be	suppliers	SUCCESS	2026-10-15 18:24:15.626	pulled 0 rows	2026-10-15 18:24:15.627022	2026-10-15 18:24:15.627022	0	\N
352658f6-629e-445e-b0a3-30a76483e305	c86c62b9-886b-4497-a74b-d5d1744afffa	78ef8ccf-0ba2-47d9-aa06-af14bac45d89	branches	SUCCESS	2026-10-15 18:24:15.641	pulled 0 rows	2026-10-15 18:24:15.641984	2026-10-15 18:24:15.641984	0	\N
36bd935a-d65b-4784-90cc-72bb49a5cb9a	a45c01a6-eac8-4cb8-b6cb-fa772731026d	6745a4ae-9d71-4816-b337-01b0fd539f58	categories	SUCCESS	2026-10-15 18:24:15.647	pulled 0 rows	2026-10-15 18:24:15.6478	2026-10-15 18:24:15.6478	0	\N
4c7a0565-3390-4fa2-bc3d-af3679439ac6	eb3ecab3-d79b-4229-a537-ca20a07db32f	ec7e38e8-06ab-4b9f-8b52-d292d2ddefd9	customers	SUCCESS	2026-10-15 18:24:15.663	pulled 0 rows	2026-10-15 18:24:15.664157	2026-10-15 18:24:15.664157	0	\N
fb609b73-7118-4edf-aeab-2624e694e613	251412f5-d744-4111-ba14-d5706ddf44bb	70bcdce5-7546-4553-b138-90c4c060f7d7	users	SUCCESS	2026-10-15 18:24:15.677	pulled 0 rows	2026-10-15 18:24:15.678147	2026-10-15 18:24:15.678147	0	\N
efe18812-bb15-49d9-a4b5-a5506f706a43	202e97c6-958e-476c-96a7-b6e7a76b81c5	cbcc6760-610e-4608-b533-69c194573d34	roles	SUCCESS	2026-10-15 18:24:15.698	pulled 0 rows	2026-10-15 18:24:15.698491	2026-10-15 18:24:15.698491	0	\N
6e373152-aa60-4b8b-9cb6-dc8ed7089d40	b29f6386-0d87-4786-8dec-9659ea6c5df1	5bd4f655-7e4e-429a-9f69-db69d91370fe	products	SUCCESS	2026-10-15 18:24:21.628	pulled 1 rows	2026-10-15 18:24:21.629272	2026-10-15 18:24:21.629272	0	\N
7e805f1a-280c-4b22-844a-e09b01d6c287	f58b5816-bdc7-4dea-ba49-10100af5e98e	38ca6339-e0d7-453c-823d-27af54569fd1	categories	SUCCESS	2026-10-15 18:24:21.707	pulled 0 rows	2026-10-15 18:24:21.708253	2026-10-15 18:24:21.708253	0	\N
99c2e9c0-c9ab-46b0-a37d-d20706201fc2	7260836a-055c-4258-a106-45957aa74a3c	c49d2e6a-b78e-44a3-a39a-c4fbcd59b5d4	customers	SUCCESS	2026-10-15 18:24:21.75	pulled 0 rows	2026-10-15 18:24:21.75126	2026-10-15 18:24:21.75126	0	\N
bb7bbb39-bd9c-4212-af0b-fa5c6295ee96	13cd0523-8376-4bfc-9a06-8d509bd81747	e451fb46-7c7b-49ec-b3ee-ae531b778684	branches	SUCCESS	2026-10-15 18:24:21.762	pulled 0 rows	2026-10-15 18:24:21.762615	2026-10-15 18:24:21.762615	0	\N
052419ca-12dc-4110-8d94-b6518985214a	56c17ab2-a441-4052-a99e-16f513906948	bc892e7e-38c0-4674-9dff-d30076fb8b43	users	SUCCESS	2026-10-15 18:24:21.768	pulled 0 rows	2026-10-15 18:24:21.768915	2026-10-15 18:24:21.768915	0	\N
313025e9-402a-4342-866b-c103201a9063	eaa5a0ff-a1dc-4de6-b04e-11f705f7b067	6e1f1d06-3f42-44e8-979f-ff315780e370	roles	SUCCESS	2026-10-15 18:24:21.777	pulled 0 rows	2026-10-15 18:24:21.777847	2026-10-15 18:24:21.777847	0	\N
b1674985-f194-4355-a6ff-5ae451945c2b	0a91d49a-8abf-44a6-8375-2617d8f6dc18	2b543995-1cac-426b-baff-b539460d4b86	suppliers	SUCCESS	2026-10-15 18:24:21.787	pulled 0 rows	2026-10-15 18:24:21.787467	2026-10-15 18:24:21.787467	0	\N
30167775-ce7d-45e7-8ebb-8665affce387	ee45e3c1-3fee-4416-a0ed-f9a9bf163a55	095c8533-e095-4c7e-98da-bc716a82947a	products	SUCCESS	2026-10-15 18:25:31.954	pulled 1 rows	2026-10-15 18:25:31.955226	2026-10-15 18:25:31.955226	0	\N
ecdd74ce-ce42-4f5d-b105-ab357f1c929a	df85873e-8ecb-407c-beee-e8c6ac635d68	737d8990-6c28-4e7c-af5d-6e2360dea3f8	categories	SUCCESS	2026-10-15 18:25:31.969	pulled 0 rows	2026-10-15 18:25:31.969494	2026-10-15 18:25:31.969494	0	\N
05319aa6-2a72-4908-ad97-84d6c4b766ea	ec8f2452-2c08-484e-bdc7-3465f4ebfe42	79199d47-be0a-4552-aeb6-af48759238be	suppliers	SUCCESS	2026-10-15 18:25:31.982	pulled 0 rows	2026-10-15 18:25:31.983672	2026-10-15 18:25:31.983672	0	\N
21313c28-8635-4e3a-8585-aab9f4e443ae	ca8aaf35-b42e-49fc-8540-40a9d5ff1650	f2298944-d1cd-43ef-b590-648059d8cd9c	customers	SUCCESS	2026-10-15 18:25:31.996	pulled 0 rows	2026-10-15 18:25:31.997181	2026-10-15 18:25:31.997181	0	\N
130c8b10-91b9-4b22-8348-26632820ec06	e8b2357b-7889-4f15-aa74-b0d80992a96f	b73488e3-1d5d-437e-b50c-ce72fe6dae31	users	SUCCESS	2026-10-15 18:25:32.012	pulled 0 rows	2026-10-15 18:25:32.013098	2026-10-15 18:25:32.013098	0	\N
a203e450-7e87-4aeb-b161-c6b6a2ddf043	c1430933-a447-47ae-af3f-55e957c2091d	4b52e1dc-f578-497d-a25a-39dfe1e6ddbb	branches	SUCCESS	2026-10-15 18:25:32.042	pulled 0 rows	2026-10-15 18:25:32.043367	2026-10-15 18:25:32.043367	0	\N
bfb91024-7821-45ab-8d79-08e5f722b4f6	861af989-676a-4ef8-8658-478be5362996	cdf4e802-a8ad-4c22-a9a6-b126f5659126	roles	SUCCESS	2026-10-15 18:25:32.063	pulled 0 rows	2026-10-15 18:25:32.063846	2026-10-15 18:25:32.063846	0	\N
743e1a15-47ed-47ba-ada3-d4feb6d350eb	e88fdda7-7d13-42a8-bf2e-e7e9d0bbb21e	972e3fc6-1f3e-4774-95b6-63ec4639ac9e	products	SUCCESS	2026-10-15 18:25:32.129	pulled 1 rows	2026-10-15 18:25:32.13023	2026-10-15 18:25:32.13023	0	\N
6aa6e5a2-fd67-42e0-b940-b2492c80ac30	911c2a2f-27f3-46cb-9bc7-999e2def0de7	5f4379f6-e391-4553-a36a-bc8ea40d4999	categories	SUCCESS	2026-10-15 18:25:32.273	pulled 0 rows	2026-10-15 18:25:32.274326	2026-10-15 18:25:32.274326	0	\N
b2a0d6db-ba4a-4c3c-b0f2-b20fdbba8825	fbd556ab-fc60-4e9a-a275-dbb92598f4f7	9e427b33-d6b1-464b-a7df-e02f3bf1051f	suppliers	SUCCESS	2026-10-15 18:25:32.274	pulled 0 rows	2026-10-15 18:25:32.275289	2026-10-15 18:25:32.275289	0	\N
fea6e5bd-3342-4668-9997-5877a3fbd337	6227ce60-cc45-440f-9edf-885cf370fd46	2f491678-75af-415e-bcd5-0dd9666bd564	customers	SUCCESS	2026-10-15 18:25:32.322	pulled 0 rows	2026-10-15 18:25:32.322961	2026-10-15 18:25:32.322961	0	\N
fd3491db-5fd0-467b-b1b5-90adc41ab16a	5271b29c-6d7f-4bcc-a79a-bd8cb4cc355b	6ef20ea2-9972-4c4e-ace6-89f782b5d835	users	SUCCESS	2026-10-15 18:25:32.331	pulled 0 rows	2026-10-15 18:25:32.33179	2026-10-15 18:25:32.33179	0	\N
c2fa5bae-bdda-4bd0-9814-11d83e3e0de3	98b2b163-9682-48b2-9d4f-f977231eb418	7dab24f6-db7d-4702-b3fa-e3939a99d4f8	branches	SUCCESS	2026-10-15 18:25:32.345	pulled 0 rows	2026-10-15 18:25:32.345896	2026-10-15 18:25:32.345896	0	\N
ed4de1a3-32f7-4a67-9e77-ec0c2d2f655e	22dc363e-1337-464f-b1e7-ad5793721a1c	c6d48862-0d26-4e6e-8147-f4d7893bdaf8	roles	SUCCESS	2026-10-15 18:25:32.346	pulled 0 rows	2026-10-15 18:25:32.347017	2026-10-15 18:25:32.347017	0	\N
ae7702b4-8815-4fc5-ad58-7995a14d47ab	924b1a92-ada7-48fb-bf82-6fd214b2af69	3963ea0c-ceeb-49a4-8b7d-eb5b288bfade	categories	SUCCESS	2026-10-15 18:25:34.144	pulled 0 rows	2026-10-15 18:25:34.144762	2026-10-15 18:25:34.144762	0	\N
747ffbb8-4bf3-49ad-8a5e-ab6d30ad850d	f906d152-64a2-4b53-b6b5-f29e1ad8054f	2bc1d276-e775-4bb2-a49a-dfbe3e7325a5	products	SUCCESS	2026-10-15 18:25:34.149	pulled 1 rows	2026-10-15 18:25:34.150048	2026-10-15 18:25:34.150048	0	\N
8d6a4dbf-bcd5-4f0c-b1e8-d67028c6a555	85ff1e7f-06d6-4a37-82a3-2cc0764ac1f7	60380125-773a-40a0-a283-d68e42646f90	customers	SUCCESS	2026-10-15 18:25:34.157	pulled 0 rows	2026-10-15 18:25:34.157364	2026-10-15 18:25:34.157364	0	\N
db2eac27-db9d-48af-b859-37f2c0c55d6d	54b4b703-1dff-4f94-98b1-c6dd69bdedb0	02ccc9b5-93d9-4839-9a15-98bb96151181	suppliers	SUCCESS	2026-10-15 18:25:34.166	pulled 0 rows	2026-10-15 18:25:34.166491	2026-10-15 18:25:34.166491	0	\N
47db283a-87d2-44b9-b18a-d86a972a0ca3	a2cf5c65-63a7-481a-9d60-8bee8c9f9b8b	0b307e5d-14ac-42f8-b182-7a2f92a43d17	branches	SUCCESS	2026-10-15 18:25:34.199	pulled 0 rows	2026-10-15 18:25:34.200081	2026-10-15 18:25:34.200081	0	\N
cc924ebd-ccc2-4ae4-8352-3604ae4c664e	95606c4a-b149-4c71-943d-a28232b82793	87aa0716-5674-45da-af2f-68f2847ee7e4	users	SUCCESS	2026-10-15 18:25:34.206	pulled 0 rows	2026-10-15 18:25:34.207483	2026-10-15 18:25:34.207483	0	\N
c57f2bd0-4c41-4036-a1fb-489825971a29	ce1cbef3-230d-4e3d-bf46-05e51f510fe7	7108d262-e5f7-4894-82e1-c2cc504edf22	roles	SUCCESS	2026-10-15 18:25:34.223	pulled 0 rows	2026-10-15 18:25:34.224065	2026-10-15 18:25:34.224065	0	\N
10fa72a1-02e0-44a3-8c6c-f4663b9c8809	7be68f00-066c-4282-ac04-3e762726a29a	c37df78f-533d-4986-9602-9b1b85e53fda	products	SUCCESS	2026-10-15 18:25:36.045	pulled 1 rows	2026-10-15 18:25:36.045941	2026-10-15 18:25:36.045941	0	\N
7d36b98c-1f39-4d99-bee1-9538351b0fcd	331cb2da-ec91-4aac-b681-b6be0790a336	6d18e37c-16e7-4de8-bfdf-11f22d09d2c2	categories	SUCCESS	2026-10-15 18:25:36.071	pulled 0 rows	2026-10-15 18:25:36.07201	2026-10-15 18:25:36.07201	0	\N
06b74aca-9586-44a5-b32a-4ae3542dec04	e979d986-4d75-453b-b8d8-11f093792742	7136729c-2621-4b2d-b527-b15febea949a	suppliers	SUCCESS	2026-10-15 18:25:36.091	pulled 0 rows	2026-10-15 18:25:36.091689	2026-10-15 18:25:36.091689	0	\N
ac3a3e2b-bc35-48fe-80ad-c383b69a542f	131e0a5e-9100-48b1-a8db-db97a6c88168	71fce82e-1d88-4f80-bf2f-c33c0f298dfe	customers	SUCCESS	2026-10-15 18:25:36.097	pulled 0 rows	2026-10-15 18:25:36.098184	2026-10-15 18:25:36.098184	0	\N
7f2feef5-8b9b-41c1-9ed5-ff4941e4166c	61d10cd7-07b7-4693-b1f6-2b792f5ccd11	5ce2d2ad-59ea-42f6-8802-7ccb86c5d76e	branches	SUCCESS	2026-10-15 18:25:36.115	pulled 0 rows	2026-10-15 18:25:36.115877	2026-10-15 18:25:36.115877	0	\N
5f7cc98d-b185-46ff-ac7d-eecbc07c038c	1ce87785-199d-4236-9827-11509092631b	b94778ef-6805-47c2-a737-0edabf7ee2a6	roles	SUCCESS	2026-10-15 18:25:36.134	pulled 0 rows	2026-10-15 18:25:36.134485	2026-10-15 18:25:36.134485	0	\N
3e91f6fd-792e-4dfe-b954-d537ec283b31	3f028fa7-524a-4e0d-abc0-f091e7bd268a	dbfb1692-5483-4c46-8cd4-db9f4e6de9ea	users	SUCCESS	2026-10-15 18:25:36.146	pulled 0 rows	2026-10-15 18:25:36.146518	2026-10-15 18:25:36.146518	0	\N
edd38c01-99a2-45a0-89fe-6c1acb8b39ea	6b38544e-6e43-4628-8ca3-9ffa30708fd3	3fd2d417-846d-4aa9-ad5d-9b2df51397dd	products	SUCCESS	2026-10-15 18:25:39.084	pulled 1 rows	2026-10-15 18:25:39.085193	2026-10-15 18:25:39.085193	0	\N
4080fba1-fc13-4dbb-b410-86a5ad6d196a	810648ca-ed2d-498e-84e4-0f1587648d70	b2b2d487-26f7-49a3-b844-e5b736832ebd	categories	SUCCESS	2026-10-15 18:25:39.128	pulled 0 rows	2026-10-15 18:25:39.128735	2026-10-15 18:25:39.128735	0	\N
d95aa485-68db-4584-8842-bf5626978533	70636035-8285-43e9-8bec-61ba852cdfa5	4c4cde35-f846-47fa-a0b6-19657b2b9b74	suppliers	SUCCESS	2026-10-15 18:25:39.138	pulled 0 rows	2026-10-15 18:25:39.138794	2026-10-15 18:25:39.138794	0	\N
429885e9-0779-48ed-bed5-5612b1a9b665	ed13ed83-10d3-490f-87bb-15f3dce91840	2b588c3d-dbde-4e47-bd6b-70d4dd0e57c4	customers	SUCCESS	2026-10-15 18:25:39.157	pulled 0 rows	2026-10-15 18:25:39.157468	2026-10-15 18:25:39.157468	0	\N
4f98b2b5-08ab-48d5-9764-ad80a29a9f1a	42776a65-181c-4b52-aaa4-149d96eeeaba	ae9ec090-37a2-4671-b619-9730a22173d1	branches	SUCCESS	2026-10-15 18:25:39.172	pulled 0 rows	2026-10-15 18:25:39.172694	2026-10-15 18:25:39.172694	0	\N
e79337e0-e681-47af-88a1-00a68b4258de	94d21cde-c91d-4459-9c24-d843765a2f40	6d529bf0-7619-4ce1-bb4a-2c3974b52717	users	SUCCESS	2026-10-15 18:25:39.202	pulled 0 rows	2026-10-15 18:25:39.20295	2026-10-15 18:25:39.20295	0	\N
b5176390-a3f9-410c-8cbf-4fa3f5744e0b	dfd72e23-a32e-416d-8e5e-4f8130d9a3d2	dd649562-d7f7-4ec6-b026-e5ee12dc5955	roles	SUCCESS	2026-10-15 18:25:39.205	pulled 0 rows	2026-10-15 18:25:39.205854	2026-10-15 18:25:39.205854	0	\N
594891b3-5d61-4f18-9b8b-2824accf474f	2ec9453e-5c2a-456d-b862-5ab53f974c15	1895963a-355c-4d78-8afc-ca119b07ea15	products	SUCCESS	2026-10-15 18:25:40.054	pulled 1 rows	2026-10-15 18:25:40.055022	2026-10-15 18:25:40.055022	0	\N
10f6c33e-5422-48c3-881a-adf47f8704b1	314bfe59-6af4-40fc-b62f-795119a6c27f	e0ad219c-31bb-4c0c-ab25-72fc5e3f72fa	categories	SUCCESS	2026-10-15 18:25:40.227	pulled 0 rows	2026-10-15 18:25:40.227466	2026-10-15 18:25:40.227466	0	\N
dea3c074-52c5-4167-87ed-bf88060c58d5	499d922b-b4c5-4c1f-b60f-07f5474e8dd5	51196aeb-d808-41c8-a3e9-205cb6f5fdba	branches	SUCCESS	2026-10-15 18:25:40.326	pulled 0 rows	2026-10-15 18:25:40.326755	2026-10-15 18:25:40.326755	0	\N
21626939-ee42-4d51-bf23-b05697ad71e1	2940dd5c-0701-495c-825b-8e8f14497f0f	8eb66672-59ce-44cf-89b5-0a95613a3714	users	SUCCESS	2026-10-15 18:25:40.329	pulled 0 rows	2026-10-15 18:25:40.330981	2026-10-15 18:25:40.330981	0	\N
921ea684-b93b-42ad-8958-788e21e887a3	234a13a1-d3a9-4285-a373-272488b936ea	93905846-dd45-400b-a7cf-11367995b8be	customers	SUCCESS	2026-10-15 18:25:40.336	pulled 0 rows	2026-10-15 18:25:40.336836	2026-10-15 18:25:40.336836	0	\N
8bacb906-2a04-42b1-a2f2-aecf58a459ef	3e7265bc-8396-4bcb-ab02-ef2c3662793a	cee2fd22-e408-409e-bb6f-25c95afef924	suppliers	SUCCESS	2026-10-15 18:25:40.346	pulled 0 rows	2026-10-15 18:25:40.347271	2026-10-15 18:25:40.347271	0	\N
86a70e0d-0294-49e4-8a81-2a1e33c1c52c	734bbb8d-311b-4476-bcae-eae99fc46978	60a93f23-c17c-4157-bc7b-2128fdbc1684	roles	SUCCESS	2026-10-15 18:25:40.369	pulled 0 rows	2026-10-15 18:25:40.369652	2026-10-15 18:25:40.369652	0	\N
42a77c2e-b436-4e88-bdd3-1929f15a1212	d579fd2a-5c6f-44c1-91f1-ea1705641055	d969166b-76a8-4988-8865-11cf36ad4072	products	SUCCESS	2026-10-15 18:25:49.161	pulled 1 rows	2026-10-15 18:25:49.16204	2026-10-15 18:25:49.16204	0	\N
f6a14c0e-6791-40b1-8d3d-71199c85d943	9ee2c8eb-177a-4c01-853e-60b07a5f34fa	769e5ff8-3efd-4ceb-a5d8-629f5ee1c969	users	SUCCESS	2026-10-15 18:25:49.206	pulled 0 rows	2026-10-15 18:25:49.206712	2026-10-15 18:25:49.206712	0	\N
5db02502-6ffc-4ddd-9f44-3a80a79213d6	a1791880-fb95-4e5c-9c0f-f99f3206bf97	e691076b-867a-42bf-ab78-b2aa2413b50c	categories	SUCCESS	2026-10-15 18:25:49.221	pulled 0 rows	2026-10-15 18:25:49.221651	2026-10-15 18:25:49.221651	0	\N
17c8b7be-38ae-46a7-8b1a-7f85d30f9674	ee6f4ea4-632d-4517-8f35-62f89ea8762a	65095bff-d9b9-4a38-958a-b115be89f408	suppliers	SUCCESS	2026-10-15 18:25:49.246	pulled 0 rows	2026-10-15 18:25:49.246991	2026-10-15 18:25:49.246991	0	\N
9b34c51b-a0a2-406e-8f73-95d2eb41ad50	c2de9148-0d16-4239-bff0-3fcacffa71ec	bb955ba4-c80e-4399-8e7d-d4e84d50d8bb	branches	SUCCESS	2026-10-15 18:25:49.354	pulled 0 rows	2026-10-15 18:25:49.355313	2026-10-15 18:25:49.355313	0	\N
7976fb30-5b99-4909-98fb-26c0b99e23a3	02a8c12c-af2b-44f9-a9b0-79089e71b158	f9468239-80d2-41b8-850f-9685e8003c4f	customers	SUCCESS	2026-10-15 18:25:49.37	pulled 0 rows	2026-10-15 18:25:49.371413	2026-10-15 18:25:49.371413	0	\N
d5739881-1e8d-4aba-a45e-8f37f4934c1a	673a8c0b-fda8-4c22-908c-7a4ad4bae05a	de358fe2-3b6f-4f0a-9197-9eb98d1d08cc	suppliers	SUCCESS	2026-10-15 18:25:51.259	pulled 0 rows	2026-10-15 18:25:51.260042	2026-10-15 18:25:51.260042	0	\N
78a4c774-77b0-4a93-83f8-cb7d34c60274	90da27dc-b14d-4e3d-a4bb-72f0f99ac67a	e81b4fe3-41b2-4b23-9763-485d648ef820	customers	SUCCESS	2026-10-15 18:25:51.275	pulled 0 rows	2026-10-15 18:25:51.276398	2026-10-15 18:25:51.276398	0	\N
9dac2c6a-0b39-485a-9ff2-7d9be3ddd44c	79e2e6bd-21a3-4e34-be30-84e440b8c6b4	85d89433-b53d-468f-b94c-3c149c785c4b	users	SUCCESS	2026-10-15 18:25:51.304	pulled 0 rows	2026-10-15 18:25:51.304856	2026-10-15 18:25:51.304856	0	\N
06ea93cc-4faa-4fca-a038-636832af21d3	f59ac52f-8995-4b2e-b60e-f48cc4c8a673	76bb51ed-769d-4c7c-8cc2-a7f6ce4e6394	roles	SUCCESS	2026-10-15 18:25:49.373	pulled 0 rows	2026-10-15 18:25:49.374255	2026-10-15 18:25:49.374255	0	\N
41c219af-c69b-4a23-9e2d-9a1571b067bb	8392b362-a473-40a7-b9de-0dd12e5e67f8	9069c2f0-6903-462b-80c5-0639988220d8	categories	SUCCESS	2026-10-15 18:25:51.26	pulled 0 rows	2026-10-15 18:25:51.260853	2026-10-15 18:25:51.260853	0	\N
5bb6936a-e703-471f-9f0d-055690287b66	480075af-33eb-4a22-9b6a-d66cfd708f1e	775e5b2c-cd12-4567-b04d-f54f3486412c	branches	SUCCESS	2026-10-15 18:25:51.303	pulled 0 rows	2026-10-15 18:25:51.304119	2026-10-15 18:25:51.304119	0	\N
78c80c5b-fb9e-4d65-9997-11f7d8a1cbdd	715cc884-0124-456a-a342-052b4bf84073	9c9eb1ae-b7c7-47e2-808c-afd5d8616ac4	roles	SUCCESS	2026-10-15 18:25:51.308	pulled 0 rows	2026-10-15 18:25:51.309631	2026-10-15 18:25:51.309631	0	\N
bd66ecec-de79-4364-8731-654d19c4b70c	b11b3b05-e3c9-4962-8adf-976af93a29ae	584f3153-d1e7-4804-af85-a868f84275d3	products	SUCCESS	2026-10-15 18:25:51.31	pulled 1 rows	2026-10-15 18:25:51.310422	2026-10-15 18:25:51.310422	0	\N
58c3697e-4ec9-4b8e-909c-06606ddaa36e	66ad6938-9986-4d6b-a6d7-963af778f389	8fd5cd5f-4a04-487e-9268-2179558b0bf2	products	SUCCESS	2026-10-15 18:25:52.149	pulled 1 rows	2026-10-15 18:25:52.150595	2026-10-15 18:25:52.150595	0	\N
7776e445-9e85-4781-b4f6-a269172551e3	a4ef9170-3d47-4ff6-85a3-1bf203efc5ab	287f6752-55ea-49d6-90f8-36e4ce94e782	categories	SUCCESS	2026-10-15 18:25:52.204	pulled 0 rows	2026-10-15 18:25:52.204541	2026-10-15 18:25:52.204541	0	\N
88d22998-0291-4e5d-b1e0-175bb34f7282	55b69b80-cfc9-4ce8-a1cb-5afc90a6cea9	6b9df4ae-dd7a-4fb9-be09-3a149627beb3	suppliers	SUCCESS	2026-10-15 18:25:52.217	pulled 0 rows	2026-10-15 18:25:52.217492	2026-10-15 18:25:52.217492	0	\N
d6a5d1e6-7143-4502-8b51-efa630445cce	89dc52d3-ca22-4fcb-a4c3-5fbf762aab58	05cf756c-81ef-4ced-82ec-c55de5308fc8	customers	SUCCESS	2026-10-15 18:25:52.227	pulled 0 rows	2026-10-15 18:25:52.227922	2026-10-15 18:25:52.227922	0	\N
3699827a-6333-43fd-a1b8-241815d80b7c	b70903dd-6473-4fce-907f-582fa99209d6	ba6b5326-180e-4e4a-963b-f2a0c45c7817	branches	SUCCESS	2026-10-15 18:25:52.262	pulled 0 rows	2026-10-15 18:25:52.262864	2026-10-15 18:25:52.262864	0	\N
3fe1dd1e-e7cb-4997-b856-85f721aa2814	82d7dc82-967e-4eec-a5af-dbe7a9b85c49	c2a96b7d-91f9-49d0-a2b7-88e122da3100	users	SUCCESS	2026-10-15 18:25:52.276	pulled 0 rows	2026-10-15 18:25:52.276816	2026-10-15 18:25:52.276816	0	\N
f8851ede-407d-4b0c-9eb9-30db74f318ea	3a018ebd-2717-43c4-812c-c941d23b872f	7d704c68-cd26-4b29-a9d0-95ea19ad8e3c	roles	SUCCESS	2026-10-15 18:25:52.285	pulled 0 rows	2026-10-15 18:25:52.285879	2026-10-15 18:25:52.285879	0	\N
a3199d06-dc6f-434b-b163-4ca55acd911b	6307ba48-d125-4673-b292-bf1d1dfdb1cc	dc40533d-7f46-4634-ae52-b1d435f778a6	products	SUCCESS	2026-10-15 18:25:55.16	pulled 1 rows	2026-10-15 18:25:55.161404	2026-10-15 18:25:55.161404	0	\N
25818bae-7f2b-46c6-abef-e229aba073ef	1737939e-87f8-4fb8-b5da-1c0a988e2fd3	7b8f07a3-35cc-4741-b652-8339c884bbbd	categories	SUCCESS	2026-10-15 18:25:55.217	pulled 0 rows	2026-10-15 18:25:55.218213	2026-10-15 18:25:55.218213	0	\N
6d0e7c78-7f48-4233-9ed9-93b0b0ac912d	e77b4391-e26a-4b22-84dc-09969551236c	6f74ff31-b298-4cbe-8653-90898dfbfa26	suppliers	SUCCESS	2026-10-15 18:25:55.231	pulled 0 rows	2026-10-15 18:25:55.231762	2026-10-15 18:25:55.231762	0	\N
3fcacc93-9ad2-4a92-8468-0b0174976435	49f609e4-0bca-4a88-9340-2c4cc8f21d4f	6cb08e35-83fd-4370-afbc-72613f025777	customers	SUCCESS	2026-10-15 18:25:55.242	pulled 0 rows	2026-10-15 18:25:55.242471	2026-10-15 18:25:55.242471	0	\N
15e16f29-d022-4f3c-983d-fea00df6c5ab	e3c178b8-5859-45a5-9b72-a0b13d35d315	c177a4fb-bdd1-4545-92b8-fba69fa7bff0	branches	SUCCESS	2026-10-15 18:25:55.258	pulled 0 rows	2026-10-15 18:25:55.259286	2026-10-15 18:25:55.259286	0	\N
b005b1ae-2d43-4858-9438-9cc24799efaf	8a6956e5-f8c7-47f6-ae1f-31f475855714	45a31154-4b1c-457d-b2b0-0aba59876a64	users	SUCCESS	2026-10-15 18:25:55.285	pulled 0 rows	2026-10-15 18:25:55.285895	2026-10-15 18:25:55.285895	0	\N
71ede28e-7d35-4a53-828c-59122d7d508d	aa647072-632a-40a7-9f74-7122bb10d6ab	37dfc4b1-bd41-4c93-997b-ae9c95dfe2e9	roles	SUCCESS	2026-10-15 18:25:55.297	pulled 0 rows	2026-10-15 18:25:55.2974	2026-10-15 18:25:55.2974	0	\N
ba81188a-2a0b-47da-b4de-9dd2bfd457ad	bd9ba210-c6df-4b18-b3e8-3435a688bc1f	e6acc470-8e69-44fd-96f9-cab1d2e1b37c	products	SUCCESS	2026-10-15 18:25:57.336	pulled 1 rows	2026-10-15 18:25:57.337074	2026-10-15 18:25:57.337074	0	\N
b30b571b-530d-45d7-b883-fe47990583e4	d5f69f5b-5fdb-4ae9-b8cd-d96a3fb2afe8	afee8800-da43-402b-a421-d854e266a35e	categories	SUCCESS	2026-10-15 18:25:57.338	pulled 0 rows	2026-10-15 18:25:57.338801	2026-10-15 18:25:57.338801	0	\N
5127e32c-fbe0-41e1-9a74-3faf493f67a9	d03995df-2ff3-4047-be16-12ddcc3dc24f	1caf7aa7-02a7-40f7-b845-8fdf143d8303	suppliers	SUCCESS	2026-10-15 18:25:57.354	pulled 0 rows	2026-10-15 18:25:57.355004	2026-10-15 18:25:57.355004	0	\N
2c2fc2df-08d5-4b53-82e9-d356a33a1ed2	1608909b-5369-4adc-89c0-4ff6431d999b	a1cd6f0d-232d-42c0-a44c-7718aa36a4c9	customers	SUCCESS	2026-10-15 18:25:57.368	pulled 0 rows	2026-10-15 18:25:57.368683	2026-10-15 18:25:57.368683	0	\N
848c44b9-1fcd-44c3-8e3a-3bcfdf293b48	01e58ab8-20a4-4c97-90df-ca6d980a13fd	13810dec-70ec-45ae-86c2-9c1cc0421e86	branches	SUCCESS	2026-10-15 18:25:57.388	pulled 0 rows	2026-10-15 18:25:57.38873	2026-10-15 18:25:57.38873	0	\N
60a3ffac-578a-4fc7-b658-a9627d6edb94	62557210-31af-45cc-b43d-561a5958318e	b35ccf0d-714b-4771-981f-c2b0c7555a55	users	SUCCESS	2026-10-15 18:25:57.396	pulled 0 rows	2026-10-15 18:25:57.397434	2026-10-15 18:25:57.397434	0	\N
07703b71-1876-49a0-bcd7-6c0962fe48e6	2084cb43-4489-44d1-9cd5-73b1311c1f26	99b8e09b-fd54-4d66-8c89-6d53896d6570	roles	SUCCESS	2026-10-15 18:25:57.399	pulled 0 rows	2026-10-15 18:25:57.399815	2026-10-15 18:25:57.399815	0	\N
6244e1fc-b55d-4f75-87eb-0914942e43fa	6dbbaecb-1a69-4ed0-8562-abe60811dd26	de3691b4-a231-4450-8bee-fb9ee2d6a60f	products	SUCCESS	2026-10-15 18:27:30.82	pulled 1 rows	2026-10-15 18:27:30.820828	2026-10-15 18:27:30.820828	0	\N
fea7564e-8a9e-452f-a5e8-14cdfa4803ed	af21f715-71f6-4ccf-9cba-a76d48e42f18	5ff4a299-c5b4-41b4-ae1b-bd394d116272	customers	SUCCESS	2026-10-15 18:27:30.981	pulled 0 rows	2026-10-15 18:27:30.981822	2026-10-15 18:27:30.981822	0	\N
5f42bf6f-f8f1-4b31-bce7-6307f7f18586	64034c58-838e-4568-a5eb-e3eee10310cc	00844373-79a9-4152-8389-274c4ec41aac	suppliers	SUCCESS	2026-10-15 18:27:31.031	pulled 0 rows	2026-10-15 18:27:31.032374	2026-10-15 18:27:31.032374	0	\N
02617dd9-960b-4806-9bb6-5bbff2514f9e	f59bc1af-95cd-4150-87bd-c50586209a92	1f0b087c-2977-42d3-8ef9-bacd02fdf9df	users	SUCCESS	2026-10-15 18:27:31.055	pulled 0 rows	2026-10-15 18:27:31.055556	2026-10-15 18:27:31.055556	0	\N
7d73ae1a-f275-475b-8c13-bfdf0f0fef7d	3508ca7d-9a6f-4f25-88e0-a7856dad9901	d9a2e075-96f6-4bb6-bec8-715c12570526	roles	SUCCESS	2026-10-15 18:27:31.089	pulled 0 rows	2026-10-15 18:27:31.09031	2026-10-15 18:27:31.09031	0	\N
9a4c27ac-8d4c-493a-9b59-a565da9e29e7	2aadb643-6d92-4460-960e-6dacf028752d	6095d3be-4360-4f57-adb1-e5ba6ab9e1ae	categories	SUCCESS	2026-10-15 18:27:31.096	pulled 0 rows	2026-10-15 18:27:31.096945	2026-10-15 18:27:31.096945	0	\N
66dd7563-2ae8-4887-a692-b68f2277baed	78b34aa6-93bb-4d32-883a-2571f46fcb5b	c12c886a-8714-4e15-84d9-0daf8616ded8	branches	SUCCESS	2026-10-15 18:27:31.109	pulled 0 rows	2026-10-15 18:27:31.110634	2026-10-15 18:27:31.110634	0	\N
84337ccc-e551-4b75-bd6b-b1315afd3e13	d1aa92f5-03e8-46ad-ad29-6b22b8e4133d	81a2dfd2-b3eb-49c5-aacd-dd8654328ec7	products	SUCCESS	2026-10-15 18:27:31.596	pulled 1 rows	2026-10-15 18:27:31.597111	2026-10-15 18:27:31.597111	0	\N
8f51f481-75d2-4fe6-a7f3-3f57e3c077f0	9ac71a52-65de-4ac7-9a2e-011296172526	d89d2699-8a88-4ccf-8204-715618f5d044	roles	SUCCESS	2026-10-15 18:27:31.748	pulled 0 rows	2026-10-15 18:27:31.748975	2026-10-15 18:27:31.748975	0	\N
85879f10-b458-4585-a295-b3a9c473f006	d07db3c3-692d-418d-9ab3-4c8520cd6d19	cc77f8d1-2bf2-4fbc-863f-9c8a8c052819	users	SUCCESS	2026-10-15 18:27:31.749	pulled 0 rows	2026-10-15 18:27:31.749794	2026-10-15 18:27:31.749794	0	\N
bb5aa4d2-ab4f-4469-bd99-6ffffc0e5463	28b30a1b-f620-4c2a-a8a7-fd7139a54e75	d7a69d34-e1c0-4743-a560-4ebb080b546c	suppliers	SUCCESS	2026-10-15 18:27:31.75	pulled 0 rows	2026-10-15 18:27:31.750739	2026-10-15 18:27:31.750739	0	\N
8176b658-8c76-45f5-8455-74a325dd52c6	e67059be-ef1a-413e-b5e7-747e4ed75dbc	880e8a55-17dd-4a30-9354-e2c88f4a4242	categories	SUCCESS	2026-10-15 18:27:31.751	pulled 0 rows	2026-10-15 18:27:31.75197	2026-10-15 18:27:31.75197	0	\N
0251c045-836f-445a-8ab1-e4d50dbb8570	5fc71aac-cf71-4fef-9154-58a6b74f6b25	e0dc6966-a80b-4aba-bf9a-598f7620426e	branches	SUCCESS	2026-10-15 18:27:31.778	pulled 0 rows	2026-10-15 18:27:31.77868	2026-10-15 18:27:31.77868	0	\N
213945d1-a581-4177-b672-8496b1ac68c8	39c5191b-7659-42b4-bd50-a5dfc36b1192	327b0e8e-9ed4-4804-998b-fc78f00444ae	customers	SUCCESS	2026-10-15 18:27:31.792	pulled 0 rows	2026-10-15 18:27:31.792355	2026-10-15 18:27:31.792355	0	\N
93734bf5-e689-4d01-8dd3-4a6c57a29f00	59cadd9f-6842-4c42-ab27-e6439fa08b19	c82b121a-f217-45f0-b491-3780a96ac39b	products	SUCCESS	2026-10-15 18:27:33.482	pulled 1 rows	2026-10-15 18:27:33.483059	2026-10-15 18:27:33.483059	0	\N
e80b454c-afe1-4d02-90f5-c0162297f007	81cc9c4f-674f-4a59-beca-17a2affadbfd	68514645-fa8b-416b-a10e-c88fa05bce26	customers	SUCCESS	2026-10-15 18:27:33.676	pulled 0 rows	2026-10-15 18:27:33.677457	2026-10-15 18:27:33.677457	0	\N
80b38c23-e106-4f2a-9fe3-70f3ee1aaed9	0df4ec08-d95a-4193-8e46-fc569c1634f6	ddfeacdb-ebdf-441d-bd7d-ea722d4b777e	users	SUCCESS	2026-10-15 18:27:33.682	pulled 0 rows	2026-10-15 18:27:33.683161	2026-10-15 18:27:33.683161	0	\N
ca9388f2-09a9-4ba7-aaa1-90874385053f	2131f7ea-6b92-43d0-a651-ec408d7b38e5	8a9f40cd-702f-407a-820c-6834f212446c	users	SUCCESS	2026-10-15 18:27:36.696	pulled 0 rows	2026-10-15 18:27:36.696799	2026-10-15 18:27:36.696799	0	\N
05f58d32-f2c2-473c-bcae-f3a0f43ef749	970deb29-011a-4d7c-bb98-9c426d4d27f7	0157ea85-9be9-486d-b870-23956ef1d37a	branches	SUCCESS	2026-10-15 18:27:39.736	pulled 0 rows	2026-10-15 18:27:39.736591	2026-10-15 18:27:39.736591	0	\N
43cced84-1bd7-47ac-852d-28db62846240	15176014-aab1-4668-bdb7-f21f53e00653	1f36a58d-6333-4185-afdd-b60da7ab1e46	roles	SUCCESS	2026-10-15 18:27:39.772	pulled 0 rows	2026-10-15 18:27:39.773094	2026-10-15 18:27:39.773094	0	\N
f56d35fd-3cbb-4692-8524-c1f94d7d5276	82cb2b98-be40-46da-ac8b-ab05703bfefb	a2b4d6df-005c-4fbf-bd8f-01ec8aa37926	products	SUCCESS	2026-10-15 18:27:40.98	pulled 1 rows	2026-10-15 18:27:40.980844	2026-10-15 18:27:40.980844	0	\N
36cee962-5266-4155-aba7-acfd770edd9b	03bc22fe-6552-48b3-b139-7bcf1017dab6	1755e0a1-bd03-4697-9682-3526e56c9588	suppliers	SUCCESS	2026-10-15 18:27:42.802	pulled 0 rows	2026-10-15 18:27:42.802898	2026-10-15 18:27:42.802898	0	\N
ba0b8bdc-3132-4d7f-8c37-b043efbc9702	07a4e478-2236-469d-83d1-390b2a865d70	54e5cca0-0362-4f0e-b821-e109cfde85c9	customers	SUCCESS	2026-10-15 18:27:45.714	pulled 0 rows	2026-10-15 18:27:45.715086	2026-10-15 18:27:45.715086	0	\N
24854e56-ec7e-454a-a8c0-0e55a81e2f50	586c9cdd-7a0d-40d5-971c-5f0249cdfc4f	fdd7976f-7fd1-4241-8017-03c7e8e1a7f9	branches	SUCCESS	2026-10-15 18:27:45.731	pulled 0 rows	2026-10-15 18:27:45.731863	2026-10-15 18:27:45.731863	0	\N
d03f0c9f-dcb6-4516-9d2b-ce6d3769465a	90e0c609-a16c-4966-95b3-cf184cccc518	7068a8d5-d74b-4670-af58-e9ef9c96cef5	roles	SUCCESS	2026-10-15 18:27:45.751	pulled 0 rows	2026-10-15 18:27:45.752398	2026-10-15 18:27:45.752398	0	\N
f735b2d4-6155-44b1-9876-428119687932	8fc1c173-fcb2-4b93-a586-17140ad50d88	040beb97-095a-4b3c-8ae6-55f95451fabd	users	SUCCESS	2026-10-15 18:27:45.765	pulled 0 rows	2026-10-15 18:27:45.765602	2026-10-15 18:27:45.765602	0	\N
9ebb38b5-d970-4ad8-b775-dc059e6e3ce6	a78a28e2-b217-4443-b967-8780b8cda701	3e770db1-01d5-44d6-bbca-7d8e1d71d32b	roles	SUCCESS	2026-10-15 18:27:33.682	pulled 0 rows	2026-10-15 18:27:33.684222	2026-10-15 18:27:33.684222	0	\N
39ee9712-36cd-45d0-bdcc-f783957ff230	5222a833-34a7-4e57-8b52-70151be4a123	5ff5bcd9-25f3-4253-80d2-c6f3e05a099d	suppliers	SUCCESS	2026-10-15 18:27:36.695	pulled 0 rows	2026-10-15 18:27:36.696045	2026-10-15 18:27:36.696045	0	\N
dec7e46f-f639-4ccc-aa63-2e81562cfcae	a5e6df10-f259-4a7f-a6cd-7640d5a09dfa	e8dbca7b-e520-42b2-b731-a3193d3d65e9	suppliers	SUCCESS	2026-10-15 18:27:40.978	pulled 0 rows	2026-10-15 18:27:40.979544	2026-10-15 18:27:40.979544	0	\N
270374fe-db0a-4820-b4bf-286b2b8ff47d	b367c914-fa59-4359-897d-76a03a0f491d	80819cbb-4b4c-46b2-89d6-53007ace378f	users	SUCCESS	2026-10-15 18:27:42.801	pulled 0 rows	2026-10-15 18:27:42.801992	2026-10-15 18:27:42.801992	0	\N
3b471a68-930c-44c5-95e9-c16ff3145c65	0382c53c-1840-4565-b559-cd58fbc4f0c2	ee5a248a-ec88-4ee9-a446-8aef354e259b	categories	SUCCESS	2026-10-15 18:27:45.709	pulled 0 rows	2026-10-15 18:27:45.709942	2026-10-15 18:27:45.709942	0	\N
926bf53e-81d4-4f0d-8a74-d3e435a63000	65048948-3603-4a1f-80e5-5b6c41149015	681e757e-eae7-4d57-be97-2b0e4066e389	products	SUCCESS	2026-10-15 18:27:46.834	pulled 1 rows	2026-10-15 18:27:46.834714	2026-10-15 18:27:46.834714	0	\N
c98f0de7-1dd2-499d-b572-c0ea9a5b4a86	2d2cbbd6-eb54-45c2-90e0-8a1cf1edb844	d6bbe8f3-b439-4be1-bc79-36beaa8b3373	categories	SUCCESS	2026-10-15 18:27:46.934	pulled 0 rows	2026-10-15 18:27:46.935113	2026-10-15 18:27:46.935113	0	\N
147ca128-cad8-4607-9937-b39bc4437d77	a4cede64-55dd-42ad-99d4-7407f3fc9d9b	d8335374-0464-4e4b-98e4-1b9282559917	customers	SUCCESS	2026-10-15 18:27:46.965	pulled 0 rows	2026-10-15 18:27:46.967708	2026-10-15 18:27:46.967708	0	\N
08fabd2f-01a1-4cef-b125-ca6588d0cd2e	594d9ad4-3a13-4cc2-adae-507c00168229	ebd2b4bf-e8de-43c8-8123-3ebd161a7229	users	SUCCESS	2026-10-15 18:27:46.982	pulled 0 rows	2026-10-15 18:27:46.982883	2026-10-15 18:27:46.982883	0	\N
d8431253-1411-4bbe-b507-3941763b6833	a5eb3b59-b6e4-4345-8aef-3fce70125421	501c2cd7-d194-48ed-ac6d-219f19f96437	customers	SUCCESS	2026-10-15 18:27:55.942	pulled 0 rows	2026-10-15 18:27:55.943188	2026-10-15 18:27:55.943188	0	\N
bd1a1976-e4e5-4298-bcf8-2596af894780	74200688-3456-4a8e-9166-9bcc0faf06a6	22161501-1749-4f46-a112-1062f7b8ed29	branches	SUCCESS	2026-10-15 18:27:55.96	pulled 0 rows	2026-10-15 18:27:55.960428	2026-10-15 18:27:55.960428	0	\N
fa04b427-8bd0-4765-8ed4-509c8dd26320	76416f91-e05e-4cf5-ab63-bd0a0bc7ee33	e4a3ebfa-99f4-4c53-a98d-697199890d0f	users	SUCCESS	2026-10-15 18:27:55.976	pulled 0 rows	2026-10-15 18:27:55.977197	2026-10-15 18:27:55.977197	0	\N
7e55a3a4-6bb3-450d-ab06-238c56c60213	1ce845ea-35a6-4554-af8b-3b14085650b2	5c47eb3f-a788-4675-8000-0f4d46b266ec	roles	SUCCESS	2026-10-15 18:27:56.077	pulled 0 rows	2026-10-15 18:27:56.078094	2026-10-15 18:27:56.078094	0	\N
7f727f84-b814-4b92-bc72-6542bf6c84df	555beca5-0a55-4dcc-a450-5bc32c502fd8	e7fa4a6c-2a67-4bff-ae92-047294b12afa	users	SUCCESS	2026-10-15 18:27:58.991	pulled 0 rows	2026-10-15 18:27:58.991975	2026-10-15 18:27:58.991975	0	\N
2586271f-1522-40f1-a75e-14d3c6125a11	7aa52c08-9c89-4ec6-bdf0-2080cb1b6045	33e6af1d-cedb-4884-b20b-81e48908b924	branches	SUCCESS	2026-10-15 18:27:33.683	pulled 0 rows	2026-10-15 18:27:33.683898	2026-10-15 18:27:33.683898	0	\N
515ca98b-9960-4c4f-a427-1fafbf08871c	d63c84db-d4d8-46f8-a76b-3174ea381f76	2a89a59d-7e20-4f54-9b86-15d76403dbd1	customers	SUCCESS	2026-10-15 18:27:36.693	pulled 0 rows	2026-10-15 18:27:36.694376	2026-10-15 18:27:36.694376	0	\N
f6e25a2a-08c3-41e5-95c3-5351591ca6d3	b808f588-cb11-4207-9d64-cfa663266467	a759e684-769e-4342-878b-1f9e0060eac2	categories	SUCCESS	2026-10-15 18:27:40.982	pulled 0 rows	2026-10-15 18:27:40.982792	2026-10-15 18:27:40.982792	0	\N
2e013911-42f1-40de-801f-f6ddf94c110f	cd529586-090e-4aaa-9408-3f34bf7dcc80	d0acf8db-ef5f-41cc-8b61-6dd9e0b501f5	roles	SUCCESS	2026-10-15 18:27:41.407	pulled 0 rows	2026-10-15 18:27:41.407571	2026-10-15 18:27:41.407571	0	\N
eaf4e2a8-7e25-450f-8c74-89047defe76a	2fe56324-cc59-4836-8e76-3ba7c8cb5769	ac848c9d-1741-4c9e-8b50-c71b75b3db76	customers	SUCCESS	2026-10-15 18:27:42.8	pulled 0 rows	2026-10-15 18:27:42.801342	2026-10-15 18:27:42.801342	0	\N
758c5b64-2112-4af2-89a6-e099e757c2e6	7830df47-6c68-4f6b-bf74-828b35a329bf	13b98424-e700-427c-829c-9c5a027c2003	suppliers	SUCCESS	2026-10-15 18:27:33.693	pulled 0 rows	2026-10-15 18:27:33.694491	2026-10-15 18:27:33.694491	0	\N
88d9b9d4-8773-4430-b5e6-1a9d5e77749b	b56e92b5-efbc-4a16-8009-1d2eb0b7a601	2d141a8b-607f-4adb-82d6-706d44340912	categories	SUCCESS	2026-10-15 18:27:33.747	pulled 0 rows	2026-10-15 18:27:33.748102	2026-10-15 18:27:33.748102	0	\N
ce1b010f-f9d7-4f8a-a849-dafc9225995d	ddfe0186-2d3a-438b-83ca-b8d3d958ace8	c5f400fb-1b00-42db-a809-ebc8c9236db3	products	SUCCESS	2026-10-15 18:27:36.501	pulled 1 rows	2026-10-15 18:27:36.501985	2026-10-15 18:27:36.501985	0	\N
2ad88554-730b-498a-9329-4397a6fed00c	cc5fef5a-5576-4bae-ba0f-bd2f0c2595d7	ed2c0bc5-1d41-4a75-a66a-f215c06eb2c2	categories	SUCCESS	2026-10-15 18:27:36.694	pulled 0 rows	2026-10-15 18:27:36.695182	2026-10-15 18:27:36.695182	0	\N
7ee09a88-7e12-4c40-805b-d8a36205aa08	844cee0f-0df3-417d-8411-3326082082d6	58753a33-5fae-4495-83c0-428c4e43412a	branches	SUCCESS	2026-10-15 18:27:40.985	pulled 0 rows	2026-10-15 18:27:40.986077	2026-10-15 18:27:40.986077	0	\N
74b1fd61-d676-444b-a02a-34e846a12cf4	440491b7-f608-4b39-bc16-d3122bdd7991	673e941a-4898-4ead-969f-5d234835f0f1	users	SUCCESS	2026-10-15 18:27:41.407	pulled 0 rows	2026-10-15 18:27:41.408125	2026-10-15 18:27:41.408125	0	\N
7cd4b967-a112-44f1-b6f5-b3622b4fde15	eff41912-19b4-4dc4-a402-cb542b6bb498	6f17b8a0-c17e-45ce-a77d-b1f0d0e02529	products	SUCCESS	2026-10-15 18:27:42.545	pulled 1 rows	2026-10-15 18:27:42.546112	2026-10-15 18:27:42.546112	0	\N
245f925d-c2eb-48b6-b132-d675c625d028	56de416a-60c0-4f24-8047-9745b89327c3	4354b138-f99f-467e-8e15-5ecddf3a77d4	categories	SUCCESS	2026-10-15 18:27:42.79	pulled 0 rows	2026-10-15 18:27:42.790544	2026-10-15 18:27:42.790544	0	\N
3e9daf64-bee1-4914-984c-26ab98ee40bf	32e9ac33-43bb-4f8b-8d1a-6244bc1ec106	55045798-7a3d-427c-aa40-6f560cb97368	branches	SUCCESS	2026-10-15 18:27:36.7	pulled 0 rows	2026-10-15 18:27:36.7006	2026-10-15 18:27:36.7006	0	\N
d56ec7fc-9f28-4e2b-92f5-3c0b3742a4e7	4bdda046-7a1d-40e1-95df-949688fedbaf	6e793c40-9820-4868-a77a-2701782b6308	roles	SUCCESS	2026-10-15 18:27:36.748	pulled 0 rows	2026-10-15 18:27:36.749181	2026-10-15 18:27:36.749181	0	\N
fabfaaf6-75c1-451d-8fcd-58392931cec7	4c6e06d5-43d6-483c-9f53-b9afe7a3303c	5a70e407-a76f-41b7-aeaa-aa2386a9bb79	products	SUCCESS	2026-10-15 18:27:39.517	pulled 1 rows	2026-10-15 18:27:39.517785	2026-10-15 18:27:39.517785	0	\N
62229e25-56c1-4eda-9316-101298df8f6c	b79a9e4e-34b1-4938-a1a0-c7912c5bad4c	1415e6a7-4498-4b9d-8972-8bc4f3a63917	categories	SUCCESS	2026-10-15 18:27:39.588	pulled 0 rows	2026-10-15 18:27:39.588448	2026-10-15 18:27:39.588448	0	\N
5a85746d-4cec-4ab9-8564-b08d58477b34	1bb25054-72da-4b3a-864f-d4166655ce4d	b8f9bb60-e8c4-4930-8067-793c507c0d2a	suppliers	SUCCESS	2026-10-15 18:27:39.599	pulled 0 rows	2026-10-15 18:27:39.599961	2026-10-15 18:27:39.599961	0	\N
4c30cedf-fb12-48f0-ba41-7249e49f45b4	a0f93f40-2655-451f-840e-99f189852ec8	1a76075a-811c-4b39-8594-046593bccc75	customers	SUCCESS	2026-10-15 18:27:39.615	pulled 0 rows	2026-10-15 18:27:39.616353	2026-10-15 18:27:39.616353	0	\N
976dd2d5-dc94-42c7-879e-3111faf8b05a	d53f4de1-fc14-401e-90a2-48070a74cdd9	c379272a-f558-4357-9004-06d5503a0e25	users	SUCCESS	2026-10-15 18:27:39.726	pulled 0 rows	2026-10-15 18:27:39.727203	2026-10-15 18:27:39.727203	0	\N
c958cc2e-4c81-485e-b338-0f4fb7fd573a	2a57b2fc-7260-46d8-acae-7626dec085f8	e9cb8587-f950-48ed-aa66-6399eed29395	customers	SUCCESS	2026-10-15 18:27:40.976	pulled 0 rows	2026-10-15 18:27:40.976631	2026-10-15 18:27:40.976631	0	\N
27cd8538-a40c-4d9b-bd79-c6bf884cf984	5f304562-882a-417b-955e-6aa2cdc0a0f0	09a62084-1e89-4ff1-9aa1-a1163eac7add	branches	SUCCESS	2026-10-15 18:27:42.804	pulled 0 rows	2026-10-15 18:27:42.80448	2026-10-15 18:27:42.80448	0	\N
64f9fb76-4ce8-4dec-b4f7-b3acb1a98c23	1820e8a3-538a-43a4-be3e-f2bb5ffdd528	830f215e-4036-40f3-b643-395196d8ad04	roles	SUCCESS	2026-10-15 18:27:42.996	pulled 0 rows	2026-10-15 18:27:42.996337	2026-10-15 18:27:42.996337	0	\N
abf5c595-0cd3-4797-b651-df5b7a4eebe2	fa111f90-a91e-480f-b8f6-0a90f637b403	7d4f744a-e1b2-45af-a03b-fd9e7d805cde	products	SUCCESS	2026-10-15 18:27:43.804	pulled 1 rows	2026-10-15 18:27:43.805009	2026-10-15 18:27:43.805009	0	\N
f2e09d3c-50c9-4327-b11a-f6e08837be2e	dc2dfbb5-5cd8-45b7-bd88-243784c9ebb5	540b62b2-2dad-49b0-991d-73c210494405	categories	SUCCESS	2026-10-15 18:27:43.956	pulled 0 rows	2026-10-15 18:27:43.956965	2026-10-15 18:27:43.956965	0	\N
81b01750-4965-4528-8e0c-2fd33db298f4	b30546b8-33c2-44c6-9cdf-f5382abf6eac	f9ff4caf-d2fa-4c32-aae4-5727ee5b476f	suppliers	SUCCESS	2026-10-15 18:27:43.968	pulled 0 rows	2026-10-15 18:27:43.968904	2026-10-15 18:27:43.968904	0	\N
f20d5026-32d6-4813-ba47-2bc3589a7acd	c7e7a151-ab55-462f-8069-a30d53d33935	9d1ed2f3-2fe5-4f34-af65-b70cd33a5efe	branches	SUCCESS	2026-10-15 18:27:43.985	pulled 0 rows	2026-10-15 18:27:43.985626	2026-10-15 18:27:43.985626	0	\N
5c187757-088c-436a-9016-67794752085a	afffa055-5a36-4b1b-b260-4ca7a040a840	ce5cf624-dc68-42cd-91bf-61123dd8126a	customers	SUCCESS	2026-10-15 18:27:43.997	pulled 0 rows	2026-10-15 18:27:43.997914	2026-10-15 18:27:43.997914	0	\N
ba2e3126-ad62-44e6-8e01-ed375cada5ed	df60c968-dbac-418b-a031-3c96fcf4dfe0	e37dd394-cd86-4764-8f84-dfcfc304484c	users	SUCCESS	2026-10-15 18:27:44.016	pulled 0 rows	2026-10-15 18:27:44.016444	2026-10-15 18:27:44.016444	0	\N
4ccec39d-676c-4479-bb88-8a3889a52c0e	6577b089-5413-4f45-856e-d28640585dd2	f6408985-c435-4dbe-964f-8bdbc05708a8	roles	SUCCESS	2026-10-15 18:27:44.03	pulled 0 rows	2026-10-15 18:27:44.030987	2026-10-15 18:27:44.030987	0	\N
abb4827f-2d5b-4251-9995-52295ce46188	c6355abc-1c78-4c50-99f7-66f30ec85aea	e7a51a8f-9f00-4bd5-8305-d33af93b507e	products	SUCCESS	2026-10-15 18:27:45.586	pulled 1 rows	2026-10-15 18:27:45.586904	2026-10-15 18:27:45.586904	0	\N
d4f3bb93-92a6-433d-834c-160b7469f5e4	1df771a1-229f-446a-b18d-9b99a4ba95a2	5400af70-94d3-49c0-afe1-d51de3983e1b	suppliers	SUCCESS	2026-10-15 18:27:45.707	pulled 0 rows	2026-10-15 18:27:45.707806	2026-10-15 18:27:45.707806	0	\N
1ae868fb-57d8-4670-93f5-f308233dcad7	8fdc7065-6d7e-451c-9f77-6577572a4219	20ccc1ad-ac37-4521-9205-e04851b680dd	suppliers	SUCCESS	2026-10-15 18:27:46.938	pulled 0 rows	2026-10-15 18:27:46.93905	2026-10-15 18:27:46.93905	0	\N
4e450313-ffdf-406b-a066-ff93c93e57df	43d23a14-3dcf-4b31-8b26-674f36f5e263	1cece155-a921-441f-a447-a36f8747f284	branches	SUCCESS	2026-10-15 18:27:46.973	pulled 0 rows	2026-10-15 18:27:46.974397	2026-10-15 18:27:46.974397	0	\N
6d7011db-c6a0-4f1e-86e0-923363b3c2da	f1a6c44d-676e-4b8f-b276-af32b46ce51f	7c23f197-59c5-4e7b-940c-5c71a5f8719e	roles	SUCCESS	2026-10-15 18:27:46.99	pulled 0 rows	2026-10-15 18:27:46.990613	2026-10-15 18:27:46.990613	0	\N
3c233266-db0d-4a2e-bc0e-4c25646811f7	219b4994-c827-4633-96d6-208bd7d98750	5b318cee-5464-4f91-90c4-8fc5f7f3b0d4	products	SUCCESS	2026-10-15 18:27:55.861	pulled 1 rows	2026-10-15 18:27:55.862353	2026-10-15 18:27:55.862353	0	\N
2705799c-0a54-4484-a8ab-756f167c43f2	27a170e2-04d5-4533-9919-1a656f2427ca	8f65fe0a-65fc-4f0a-9d41-d4665fb62d5c	categories	SUCCESS	2026-10-15 18:27:55.91	pulled 0 rows	2026-10-15 18:27:55.911333	2026-10-15 18:27:55.911333	0	\N
3881bf30-54bc-468f-b2e1-e0bb45f3bd11	44a7fea0-04c5-4838-814c-ded1055bc46e	a52e52e0-342b-4599-8ed7-f7613bb0e8be	suppliers	SUCCESS	2026-10-15 18:27:55.941	pulled 0 rows	2026-10-15 18:27:55.942194	2026-10-15 18:27:55.942194	0	\N
5731ffe3-bf13-4283-af86-5a7d79166891	c53b6012-142c-4a82-afcf-505864cadc5a	00cb7f53-6fac-4d2a-aca7-a44d7cd021d6	roles	SUCCESS	2026-10-15 18:27:58.995	pulled 0 rows	2026-10-15 18:27:58.997831	2026-10-15 18:27:58.997831	0	\N
e724db20-1256-4574-aa15-2dfcfa8547dc	f08d8051-5179-4e84-b39b-a1494963e27d	69d0d842-e30f-4aed-8494-63160b594afb	categories	SUCCESS	2026-10-15 18:27:59.035	pulled 0 rows	2026-10-15 18:27:59.036133	2026-10-15 18:27:59.036133	0	\N
3432ed0f-504a-45cf-8d3b-51ef48e168ba	d6d86d71-f9b1-43fb-a5c5-4ee8db1391ee	99b20005-aed8-421e-be11-45d169dd5549	products	SUCCESS	2026-10-15 18:27:59.039	pulled 1 rows	2026-10-15 18:27:59.040141	2026-10-15 18:27:59.040141	0	\N
dcef67fc-76ab-4e2c-9456-cd55ec5bc6b4	caab0df6-2add-4be0-beca-71c6f76466b1	ce9896ec-309b-4f82-996b-1a7b030c06a4	suppliers	SUCCESS	2026-10-15 18:27:59.042	pulled 0 rows	2026-10-15 18:27:59.042779	2026-10-15 18:27:59.042779	0	\N
2b46bcd5-7db3-4f55-941d-caecc617b1fe	8ada65a0-3e85-49e0-824f-8ca6e346bb61	f43a2d77-f8d7-4385-aceb-574cc5535b13	branches	SUCCESS	2026-10-15 18:27:59.198	pulled 0 rows	2026-10-15 18:27:59.198951	2026-10-15 18:27:59.198951	0	\N
831e6bf1-0ca7-492d-bedd-68455a318e0d	31fd3fb2-876b-4689-a2bb-e58fc4988c83	a1fa983b-8ca2-43ac-9137-2be7facf00f1	customers	SUCCESS	2026-10-15 18:27:59.199	pulled 0 rows	2026-10-15 18:27:59.199866	2026-10-15 18:27:59.199866	0	\N
5ad81011-a599-4930-9bdd-d3cef77edf3b	1dfbbe3a-8b7f-405b-ad71-68b3308dd3b6	7a68cdd2-627b-4641-9649-6aabd1fac984	products	SUCCESS	2026-10-15 18:38:26.515	pulled 1 rows	2026-10-15 18:38:26.515677	2026-10-15 18:38:26.515677	0	\N
569dc6fd-a6d7-4b01-a00b-131ed9e6182f	aaedc1c8-0e14-4237-921e-63c20c0cd284	a32482fa-d58e-4f2b-ac2d-7db9102cbccb	customers	SUCCESS	2026-10-15 18:38:26.54	pulled 0 rows	2026-10-15 18:38:26.540439	2026-10-15 18:38:26.540439	0	\N
24b6dc8d-233a-4635-bded-5bad5fe19cdd	9b9118f6-b1b1-46d3-95c7-a91ac65e8e8f	58450e5d-c68e-4374-aee3-7a2c78d494b7	suppliers	SUCCESS	2026-10-15 18:38:26.558	pulled 0 rows	2026-10-15 18:38:26.559216	2026-10-15 18:38:26.559216	0	\N
88cc0377-8670-49ba-b17d-51d67e400d80	8c26b151-cda2-4720-9c00-1af821af5e7b	6d355640-13c6-4fe7-8738-853c99e5d069	categories	SUCCESS	2026-10-15 18:38:26.564	pulled 0 rows	2026-10-15 18:38:26.564695	2026-10-15 18:38:26.564695	0	\N
444e15dd-e5c9-4142-a66f-f1d20703dd6b	58031fb7-a752-4fff-86a4-0eb9cf238890	f0fcd105-aee1-43c8-bc85-27b2428df0c5	users	SUCCESS	2026-10-15 18:38:26.571	pulled 0 rows	2026-10-15 18:38:26.572237	2026-10-15 18:38:26.572237	0	\N
ddc3ec0f-a0f6-46cf-b8fb-e1f252d534ec	ef308bc4-3555-4a1d-b2dc-95fb99b4d6a2	8a26f3d7-7af4-4315-ad04-1acd466f7044	roles	SUCCESS	2026-10-15 18:38:26.604	pulled 0 rows	2026-10-15 18:38:26.604601	2026-10-15 18:38:26.604601	0	\N
19625d64-4993-4690-b9f0-021e3940766a	0d73a452-68f1-4301-a3fc-3fbaa3adb378	1c8adb12-5730-4742-b390-642da2883609	branches	SUCCESS	2026-10-15 18:38:26.622	pulled 0 rows	2026-10-15 18:38:26.622899	2026-10-15 18:38:26.622899	0	\N
a6204adf-4d6e-4b0e-9e63-95f1d832d5dc	97459763-d095-4768-a5df-be4cac2ac97d	3ce79c5e-ce0b-4bf6-a51d-8b9b7b69f9af	products	SUCCESS	2026-10-15 18:38:28.733	pulled 1 rows	2026-10-15 18:38:28.734159	2026-10-15 18:38:28.734159	0	\N
d093ad22-0907-4342-97c6-252ed231ae4c	86832b39-4294-4757-ad64-4d86eb832cfd	d0eaf2bf-f53c-4f64-afcf-e8b78df07dd7	categories	SUCCESS	2026-10-15 18:38:28.858	pulled 0 rows	2026-10-15 18:38:28.858578	2026-10-15 18:38:28.858578	0	\N
fdf2b74b-a079-426f-a89d-d2c7dbbfb66c	eb74e063-fd0b-4528-a9a4-ff583386b855	ea959335-6a30-4604-bf43-cb0f43832258	suppliers	SUCCESS	2026-10-15 18:38:28.888	pulled 0 rows	2026-10-15 18:38:28.888751	2026-10-15 18:38:28.888751	0	\N
70d535f5-dc15-4ba2-bdaa-14f3134dcd55	72962354-fa3e-4ad6-8f7a-9e79cb41b299	765a90f0-7445-4c5b-b3c8-8b216ef88302	branches	SUCCESS	2026-10-15 18:38:28.893	pulled 0 rows	2026-10-15 18:38:28.893729	2026-10-15 18:38:28.893729	0	\N
b6d9b873-eac1-4ebf-b65b-649377c4f613	b141febf-cf91-4c43-b084-c1d9e11accd8	908239b9-d9de-44aa-a490-22ff7a11e167	customers	SUCCESS	2026-10-15 18:38:28.917	pulled 0 rows	2026-10-15 18:38:28.918283	2026-10-15 18:38:28.918283	0	\N
912d42aa-51a1-4a08-8239-a1b37df60bfd	4df35e65-d90a-4635-8524-310b9dde149c	a968c476-afc6-44b5-ba9f-eb522e9efbc0	users	SUCCESS	2026-10-15 18:38:28.961	pulled 0 rows	2026-10-15 18:38:28.962313	2026-10-15 18:38:28.962313	0	\N
69483808-16a3-4841-9b51-715c0b31d3bd	704c862b-5121-4729-a6b5-0aedea15b52b	5241e75a-56e6-4475-abfc-7fa29b8b45d2	roles	SUCCESS	2026-10-15 18:38:28.994	pulled 0 rows	2026-10-15 18:38:28.994564	2026-10-15 18:38:28.994564	0	\N
bc82f95d-489d-4bc8-b8ea-b17c1a75e032	63546bb0-7871-4c27-b559-a8a18e3510fd	110bef08-dd7b-49ad-8771-16827320358a	products	SUCCESS	2026-10-15 18:47:48.052	pulled 1 rows	2026-10-15 18:47:48.053068	2026-10-15 18:47:48.053068	0	\N
9a1fd18b-b757-4143-9731-296a5043a1d5	d19f1519-81b5-45d4-b8c6-c72bee1b2bf4	bf971902-e875-42c8-a486-a1ebccf0e9c0	suppliers	SUCCESS	2026-10-15 18:47:48.117	pulled 1 rows	2026-10-15 18:47:48.118341	2026-10-15 18:47:48.118341	0	\N
47cb4723-c249-46f3-90cf-962325f1c493	a4aaf389-bb0c-4b8a-b83a-734f630601b7	2254b165-a813-4f3f-859a-d783980795aa	categories	SUCCESS	2026-10-15 18:47:48.134	pulled 1 rows	2026-10-15 18:47:48.13542	2026-10-15 18:47:48.13542	0	\N
73abe3c2-d1d3-4528-b51e-4a60026771c3	e0f7ae13-f48a-4846-9fa3-b114aa49d5df	04eabe2f-5fda-46c0-a12e-21738c85d3c9	roles	SUCCESS	2026-10-15 18:47:48.156	pulled 7 rows	2026-10-15 18:47:48.157166	2026-10-15 18:47:48.157166	0	\N
d932cfea-afd0-4ac7-8eb6-df98ecbc5fea	7be5a01d-c36b-4705-8b84-e9e8cb1a0e54	5673cb24-69b8-449f-a5ed-1bdf1309274a	users	SUCCESS	2026-10-15 18:47:48.184	pulled 1 rows	2026-10-15 18:47:48.184987	2026-10-15 18:47:48.184987	0	\N
ffc12245-8777-4bc9-85c1-034431681844	df91c7dc-069b-463d-9c3b-0c4dae31e28b	3267b430-8536-48dd-9b42-e9997ea23bd8	branches	SUCCESS	2026-10-15 18:47:48.203	pulled 1 rows	2026-10-15 18:47:48.204155	2026-10-15 18:47:48.204155	0	\N
58f2862d-8160-4358-b61b-4ac44f555e44	a9b28a84-617f-4f1c-971f-d16ff32ec73a	483d4a22-704d-4465-a75a-587b5ec5760f	customers	SUCCESS	2026-10-15 18:47:48.25	pulled 0 rows	2026-10-15 18:47:48.2512	2026-10-15 18:47:48.2512	0	\N
6e92fe99-be8f-4187-b6b5-7fa46005c35a	94ea44a6-54f9-47a1-a4fd-93dd666ca7a3	a9b897bd-88b3-4a4f-aeb1-83ef868ea126	suppliers	SUCCESS	2026-10-15 18:47:50.544	pulled 0 rows	2026-10-15 18:47:50.544574	2026-10-15 18:47:50.544574	0	\N
32f5869b-1cac-4ecb-8934-25f5be1a1658	0f92269d-e437-4a39-8e8d-f58b30c5915f	a76abef7-1433-43ca-a527-33cea3bedc30	products	SUCCESS	2026-10-15 18:47:50.547	pulled 1 rows	2026-10-15 18:47:50.548269	2026-10-15 18:47:50.548269	0	\N
4596c5eb-1cb7-4ed8-ba76-8c056222db4c	44ad6753-8c2c-4612-87b2-fc7d270c7960	2b2e2389-ce54-49f3-abdc-66636665ecb0	customers	SUCCESS	2026-10-15 18:47:50.581	pulled 0 rows	2026-10-15 18:47:50.58171	2026-10-15 18:47:50.58171	0	\N
896936e6-8db6-4b3c-a3d2-215e4343126b	4d231a06-6171-47f8-a551-4207fd8a1718	bce4d9ad-bf78-4ef3-aee5-bb837c368f5c	categories	SUCCESS	2026-10-15 18:47:50.59	pulled 0 rows	2026-10-15 18:47:50.5912	2026-10-15 18:47:50.5912	0	\N
76d35663-5230-431d-85d5-1a4921bbcec8	571cb6fc-c118-4566-bd4e-c08c54403529	df5c01c8-090d-4983-9131-8842e57fbad4	users	SUCCESS	2026-10-15 18:47:50.765	pulled 0 rows	2026-10-15 18:47:50.76583	2026-10-15 18:47:50.76583	0	\N
5426c362-8ac7-4f92-8202-4beaf5a40a81	ed8f49e4-f7a1-4f32-9822-374a84af4ba0	ec7716ed-1394-4212-a19e-35b4dc3bc663	branches	SUCCESS	2026-10-15 18:47:50.766	pulled 0 rows	2026-10-15 18:47:50.766777	2026-10-15 18:47:50.766777	0	\N
7462ac1e-c5ba-4b48-9c23-5abe433335d2	94e0d30b-3bbe-4a96-9e25-23dfe550836d	d47e4aac-9103-40c1-9fe9-7f176cb25955	roles	SUCCESS	2026-10-15 18:47:50.998	pulled 0 rows	2026-10-15 18:47:50.998314	2026-10-15 18:47:50.998314	0	\N
66cf2ce9-3ffb-48f2-b2d2-c1f7dd965c31	8f8b74fd-1cfc-4c0e-9fcc-7f40aefba9df	7e92a767-c881-4d2a-b698-e3419f022652	suppliers	SUCCESS	2026-10-15 18:47:51.004	pulled 0 rows	2026-10-15 18:47:51.004776	2026-10-15 18:47:51.004776	0	\N
cc620c11-0a0e-41b0-b9cb-63071fced73d	04677767-155c-4cae-8895-9dae1dbc51b0	1c9521e6-9894-46a0-af3a-8e52a16fdcf2	categories	SUCCESS	2026-10-15 18:47:51.004	pulled 0 rows	2026-10-15 18:47:51.005375	2026-10-15 18:47:51.005375	0	\N
06e5a5a9-df18-4763-8c76-e33bdaaef0b4	81e85424-a99f-4cd9-acd7-f121f9587c4e	ba4da5de-f986-4872-9764-d489d079cc8b	products	SUCCESS	2026-10-15 18:47:51.007	pulled 1 rows	2026-10-15 18:47:51.008132	2026-10-15 18:47:51.008132	0	\N
fe8bcfa4-4dc1-420e-b397-ad6117af30df	c28af6f1-c26a-492c-9631-6f36dacd57e5	eb7fdde6-882e-4bdd-8ffb-ae7a3508e412	customers	SUCCESS	2026-10-15 18:47:51.044	pulled 0 rows	2026-10-15 18:47:51.044565	2026-10-15 18:47:51.044565	0	\N
0d8e6ce4-eca9-46d4-afec-4f469833f983	310934be-0185-4034-a7f4-4407dade704b	02a19229-e6e6-4adc-a194-476e75b3557b	roles	SUCCESS	2026-10-15 18:47:51.235	pulled 0 rows	2026-10-15 18:47:51.236216	2026-10-15 18:47:51.236216	0	\N
04907e49-d943-444f-ab84-8277f9cd8682	cdb3a84d-9ff8-4036-84fb-d32639d5116e	6326784a-5666-4d40-977a-04c8faf5b84b	users	SUCCESS	2026-10-15 18:47:51.239	pulled 0 rows	2026-10-15 18:47:51.240763	2026-10-15 18:47:51.240763	0	\N
571426f9-1710-4331-a693-fe96337af37e	45ed4821-0974-4aee-a93e-e125137390ba	50ce4be2-ea3f-46f3-9c2d-635bf41afceb	branches	SUCCESS	2026-10-15 18:47:51.243	pulled 0 rows	2026-10-15 18:47:51.243916	2026-10-15 18:47:51.243916	0	\N
c63f70c4-e090-4966-a81d-b366c9336383	57119d6c-e40c-4a4e-b7fe-d73083743c9f	2e85b305-b0b7-4f43-b245-fb47ad320bcb	products	SUCCESS	2026-10-15 18:47:54.904	pulled 1 rows	2026-10-15 18:47:54.905425	2026-10-15 18:47:54.905425	0	\N
85cff298-0dcd-4965-a312-001f99d7d46d	d6e8a8ea-12d5-4eec-97ff-dfaecf4fd592	6123a4f5-8c69-4d1d-8ec3-d46fc1df075d	suppliers	SUCCESS	2026-10-15 18:47:54.914	pulled 0 rows	2026-10-15 18:47:54.91529	2026-10-15 18:47:54.91529	0	\N
6ca30016-c9ec-4824-9e8d-e2a4cf1af650	955adc5f-4a23-44e7-ad87-c312a9e7bbbd	835023f3-f95d-47e3-a96e-170b03d23ce3	branches	SUCCESS	2026-10-15 18:47:54.926	pulled 0 rows	2026-10-15 18:47:54.927252	2026-10-15 18:47:54.927252	0	\N
8412b3ad-c19e-4c71-91cd-6d17d4ade826	73b2d590-c727-4d35-8b4d-5a65367a4bdc	020e8145-d7ab-42bb-aa2b-33344af41ad0	customers	SUCCESS	2026-10-15 18:47:54.986	pulled 0 rows	2026-10-15 18:47:54.987254	2026-10-15 18:47:54.987254	0	\N
55d2a917-6729-4e02-b7f6-ece9ccfb764c	32c2e55a-7bf8-4d65-8d05-2749e102438e	4a2f92ef-d268-4138-9819-4db824286c25	users	SUCCESS	2026-10-15 18:47:55.097	pulled 0 rows	2026-10-15 18:47:55.098423	2026-10-15 18:47:55.098423	0	\N
a2845d8e-a7d1-4274-94bd-9f33e6c1a10c	88007089-215c-4d48-bfc0-544f8ba351fe	068e441f-65ac-4ffb-b385-b944fec6c32d	categories	SUCCESS	2026-10-15 18:47:55.098	pulled 0 rows	2026-10-15 18:47:55.099504	2026-10-15 18:47:55.099504	0	\N
6f4b4e12-0a8b-4055-86d4-b4ea0c1146bd	3a1bc7f8-aadb-4a9e-bc4e-4a10e25ba7d2	fa10473b-b13a-4e67-bfa3-a734f4770bc8	roles	SUCCESS	2026-10-15 18:47:55.1	pulled 0 rows	2026-10-15 18:47:55.101392	2026-10-15 18:47:55.101392	0	\N
f8826cda-aa16-4ff8-ad8d-9d85d2cff5c1	2de0e9d1-cc5a-4a13-8100-b08401e90fef	ae25988c-c6c5-4d93-9908-d98d95dff915	products	SUCCESS	2026-10-15 18:53:01.009	pulled 1 rows	2026-10-15 18:53:01.010228	2026-10-15 18:53:01.010228	0	\N
5ec71fd5-285e-4239-9ab6-95915648e261	29260fb7-e732-4823-99c0-19a2d3a232c7	5eb8ea46-ddcc-4654-9fcb-e5e9d7be40d2	categories	SUCCESS	2026-10-15 18:53:01.06	pulled 0 rows	2026-10-15 18:53:01.06187	2026-10-15 18:53:01.06187	0	\N
5e9b1d8c-032d-4220-9656-4db516c5a7ef	18f650a6-3095-4595-9098-9b3c64abb34a	a8916033-32a6-46a1-bee1-fc225459943d	customers	SUCCESS	2026-10-15 18:53:01.082	pulled 0 rows	2026-10-15 18:53:01.082981	2026-10-15 18:53:01.082981	0	\N
a70af7d3-2b81-4d77-bb2f-a9a8114f4e0b	28e5badf-602d-4153-9108-90085090db79	c84963b3-9726-41c1-9dfc-9e2b76c519e4	branches	SUCCESS	2026-10-15 18:53:01.112	pulled 0 rows	2026-10-15 18:53:01.112797	2026-10-15 18:53:01.112797	0	\N
72b88d32-5346-4ed8-b6ed-96aaf823e303	4e97b272-b83e-49c3-a03b-5682aed3221c	67b19b3b-8db3-424e-95c1-17da72245f3a	roles	SUCCESS	2026-10-15 18:53:01.182	pulled 0 rows	2026-10-15 18:53:01.182454	2026-10-15 18:53:01.182454	0	\N
db29bde3-8fb6-45cb-b4ab-49aaa1f34dc0	7e538ed4-8060-4f37-b160-e735847fb50f	b0ee5589-c1d9-4185-9a48-e29c706d6abc	suppliers	SUCCESS	2026-10-15 18:53:01.21	pulled 0 rows	2026-10-15 18:53:01.211278	2026-10-15 18:53:01.211278	0	\N
dfe56741-0239-4df3-b6fc-bd7d223f176d	9feee50f-24f1-4d8b-9ef3-635b22c1e988	5776efa2-8939-4b95-bcef-af62664088bb	users	SUCCESS	2026-10-15 18:53:01.214	pulled 0 rows	2026-10-15 18:53:01.214574	2026-10-15 18:53:01.214574	0	\N
bd708ef9-27b1-4274-8f43-b0e42e468320	ac13e78f-bfb8-411f-9264-9ddc9f715314	02000e2a-3c0e-454e-a1e0-f3811923f942	products	SUCCESS	2026-10-15 18:53:01.96	pulled 1 rows	2026-10-15 18:53:01.961231	2026-10-15 18:53:01.961231	0	\N
c483f546-1eb8-406d-a2fe-d9505534100a	8ed255a9-0b60-4a2d-a98b-36211104cb3d	a5ce22f3-3673-490d-842e-24e4125a4faa	categories	SUCCESS	2026-10-15 18:53:02.016	pulled 0 rows	2026-10-15 18:53:02.01664	2026-10-15 18:53:02.01664	0	\N
d3bd9183-7157-46cd-ba1e-5a99b7c5db34	3623a96c-b341-4e9d-80a5-707034391879	42b457d1-526d-43a5-9ce0-918b787139ee	customers	SUCCESS	2026-10-15 18:53:02.212	pulled 0 rows	2026-10-15 18:53:02.213083	2026-10-15 18:53:02.213083	0	\N
16e076cc-9755-4154-938d-01152d0c3e1d	06cb5948-e7ca-4918-afb5-a0628b378529	0fe1f3f4-bfb7-4275-bc45-e07c5e26965e	suppliers	SUCCESS	2026-10-15 18:53:02.213	pulled 0 rows	2026-10-15 18:53:02.221726	2026-10-15 18:53:02.221726	0	\N
0717d58a-4422-484b-8331-030bf0da40c8	e2142bbf-7600-4776-83eb-03412739dd42	ab09b693-a869-4d91-80de-4b347cfcc760	branches	SUCCESS	2026-10-15 18:53:02.222	pulled 0 rows	2026-10-15 18:53:02.229902	2026-10-15 18:53:02.229902	0	\N
92b1053b-25f2-421a-9567-d28158d9d3e6	f28d30fa-7e47-435c-a349-99e132e3fc0e	a6619875-8aaf-4be3-a304-a52c1d9cd291	users	SUCCESS	2026-10-15 18:53:02.274	pulled 0 rows	2026-10-15 18:53:02.274463	2026-10-15 18:53:02.274463	0	\N
9ce57207-46e9-44e9-ba34-1a88598daf27	71df7ccb-5abe-4914-9b1d-d00a1c9fb7b3	a3c74733-4376-417d-b915-56b1999e45ff	products	SUCCESS	2026-10-15 18:53:03.725	pulled 1 rows	2026-10-15 18:53:03.725823	2026-10-15 18:53:03.725823	0	\N
41819ee1-a379-45f6-8417-7c68787fb7a6	1fb7e3bc-ea07-4e39-a3a7-5c45803f987b	b811896e-f776-47f6-b754-08653456d226	categories	SUCCESS	2026-10-15 18:53:03.748	pulled 0 rows	2026-10-15 18:53:03.748892	2026-10-15 18:53:03.748892	0	\N
b14c87c4-9606-4bc8-ac2a-241827378a9b	6a5b9c05-9253-4d73-bb30-74559b258b3e	ba019324-8b97-4490-b885-c06064434341	customers	SUCCESS	2026-10-15 18:53:03.799	pulled 0 rows	2026-10-15 18:53:03.799626	2026-10-15 18:53:03.799626	0	\N
2057c676-0168-4b75-b511-015f890e2fa7	7fb7675f-6806-4f8d-a3a8-9cb3e117701f	643066b5-c76d-4157-882c-05b9e22e40a3	suppliers	SUCCESS	2026-10-15 18:53:03.871	pulled 0 rows	2026-10-15 18:53:03.872845	2026-10-15 18:53:03.872845	0	\N
33c99d50-a832-4eac-a572-1ba97852cd59	dd1ebfa4-4395-4c4b-8861-e0e54faa5cc9	d07135bb-bac8-4243-a54d-af43ceffc9a8	roles	SUCCESS	2026-10-15 18:53:02.261	pulled 0 rows	2026-10-15 18:53:02.264826	2026-10-15 18:53:02.264826	0	\N
525c90f9-8269-4012-a502-33b1e3c2589b	dac7cb2c-ac1a-46c1-a89c-ccc7d25f9d49	16291e49-d7a9-4eaf-9ae2-64d0cfaf2697	branches	SUCCESS	2026-10-15 18:53:03.8	pulled 0 rows	2026-10-15 18:53:03.800761	2026-10-15 18:53:03.800761	0	\N
9b85aa1b-3e20-4b65-bb2a-01101da4e684	16826ca1-19cc-44d8-9d5c-0d1cf789915e	36dd3b12-cb1a-4e21-a8e4-a1cd79850a3e	roles	SUCCESS	2026-10-15 18:53:03.82	pulled 0 rows	2026-10-15 18:53:03.821246	2026-10-15 18:53:03.821246	0	\N
be939676-8de6-455f-94a7-94cabf0eba0b	b031993e-f799-4f4b-b8e2-ca2043980507	ff6b77f8-f44f-4652-96d2-8cf02e9cea3e	users	SUCCESS	2026-10-15 18:53:03.869	pulled 0 rows	2026-10-15 18:53:03.869732	2026-10-15 18:53:03.869732	0	\N
729b4ab3-666a-4637-a07a-b435dccd04f1	2fe101de-cfa3-4e09-8c2a-fa780f7a1633	f8cc7fdd-2b12-493b-9a85-81f4e7990cfb	branches	SUCCESS	2026-10-15 18:58:35.949	pulled 0 rows	2026-10-15 18:58:35.953984	2026-10-15 18:58:35.953984	0	\N
ae5dca69-0ec7-43fb-8f49-562d93b41014	d38cf28c-c8ef-4bb0-ad4a-d42cd425e9d8	b2946109-4d3e-41eb-98c5-9230a40e4df0	categories	SUCCESS	2026-10-15 18:58:35.951	pulled 0 rows	2026-10-15 18:58:35.957736	2026-10-15 18:58:35.957736	0	\N
8c64b908-67ec-498a-b8b7-8459f6a5a5b4	4125dbcd-28a9-44f8-90d4-db195ced8daf	f56e7d6b-e501-4a1c-9bf4-855d60b2bba2	suppliers	SUCCESS	2026-10-15 18:58:35.992	pulled 0 rows	2026-10-15 18:58:35.993	2026-10-15 18:58:35.993	0	\N
fea3cc22-7afb-4836-9e94-13ba09ab8455	337f3719-9c1d-4b40-84c3-92dd6505f5ee	5f80ba81-5605-4b75-bd49-0248123b8305	customers	SUCCESS	2026-10-15 18:58:35.971	pulled 0 rows	2026-10-15 18:58:35.987288	2026-10-15 18:58:35.987288	0	\N
7dc5fb02-15c3-4e71-b4bb-be34a65088c0	af045968-e30b-468f-a2a2-0332e9683fa2	a4dcb4a3-c2a5-47d7-aded-20c7f01cbc59	products	SUCCESS	2026-10-15 18:58:36.02	pulled 1 rows	2026-10-15 18:58:36.021013	2026-10-15 18:58:36.021013	0	\N
a7107af0-de6f-44a0-bd4f-ef945d323b1f	9ebc91d3-b3db-4ce9-a400-aa8e0d6d16ec	7f2cdb8c-56a6-4914-b80b-22cfd1e9f00f	users	SUCCESS	2026-10-15 18:58:36.074	pulled 1 rows	2026-10-15 18:58:36.074814	2026-10-15 18:58:36.074814	0	\N
5371e558-221d-4a6f-a1d7-9d27093aa11c	689c9be7-6da3-404e-a65d-8906b080d3da	12f9daaa-32a2-4710-b935-b985f8cc78d2	roles	SUCCESS	2026-10-15 18:58:36.075	pulled 0 rows	2026-10-15 18:58:36.076322	2026-10-15 18:58:36.076322	0	\N
7928e08b-1a5f-4e61-97a3-c9f56b95d1fc	880f5227-01a3-4fc5-b6af-9354dc94fd40	caa3aef4-6563-4873-a175-63ef8db5827d	products	SUCCESS	2026-10-16 05:14:45.8	pulled 1 rows	2026-10-16 05:14:45.801278	2026-10-16 05:14:45.801278	0	\N
996a83ca-c527-4f27-89e6-8c3410b9b976	611cf661-b647-4f72-8aa4-ce5ee6e99f5a	27204473-c1af-4918-95e3-d4d0bea459b3	inventories	SUCCESS	2026-10-16 05:14:46.036	pulled 1 rows	2026-10-16 05:14:46.037106	2026-10-16 05:14:46.037106	0	\N
e843f83a-9bd3-4154-a216-6b6d18317300	4fed7add-b96a-46da-8279-014c16572198	719efab6-d62e-4d23-996a-45aef05e2e9f	product-batches	SUCCESS	2026-10-16 05:14:46.157	pulled 1 rows	2026-10-16 05:14:46.158419	2026-10-16 05:14:46.158419	0	\N
8788b227-0501-4292-a725-742b45252c07	1ba612f1-7291-4d01-aca4-7ab2b80297d6	e5adfc13-46d2-41cf-9c60-16bafbc48a80	categories	SUCCESS	2026-10-16 05:14:46.277	pulled 1 rows	2026-10-16 05:14:46.278528	2026-10-16 05:14:46.278528	0	\N
f593cc76-3226-4b6a-affd-cdcb6858082a	67417320-27cc-4c0f-a91c-01d14f8d01d5	2509828f-d472-44c5-b214-ac98f0829b5c	units-of-measure	SUCCESS	2026-10-16 05:14:46.291	pulled 1 rows	2026-10-16 05:14:46.291412	2026-10-16 05:14:46.291412	0	\N
e6c12e65-70fc-4560-b74e-7ed38935a6bc	c542500c-f74c-4dc0-a7de-4aa686e24dec	5f338db6-d712-4f7e-9f98-d267f511dd56	suppliers	SUCCESS	2026-10-16 05:14:46.351	pulled 1 rows	2026-10-16 05:14:46.351586	2026-10-16 05:14:46.351586	0	\N
e2c2b819-5cea-46f3-880d-29c328e51f52	f1b355f1-b994-46a2-bd69-53430cf9b7f1	f4a84a93-b16d-4263-9c69-3255641cf17f	branches	SUCCESS	2026-10-16 05:14:46.371	pulled 1 rows	2026-10-16 05:14:46.372266	2026-10-16 05:14:46.372266	0	\N
a2f15c9c-8a10-454d-9f83-aaf6edc58494	d5dc3d6b-1e6a-4bf5-a7a5-d24f9ef1321f	551c3335-0967-4b3b-a037-d3c5bfc78764	customers	SUCCESS	2026-10-16 05:14:46.392	pulled 0 rows	2026-10-16 05:14:46.392899	2026-10-16 05:14:46.392899	0	\N
9f1585f0-fc95-42b6-8d8f-630a197ae8bb	47797342-f85b-4da6-94a2-65ad88ffbc19	a62477c0-01e6-4209-9682-a84c43a92e63	purchases	SUCCESS	2026-10-16 05:14:46.505	pulled 1 rows	2026-10-16 05:14:46.505653	2026-10-16 05:14:46.505653	0	\N
c10c39e7-a66a-43f2-ba93-9d43d104e6da	65bfe301-f273-43a0-9e7d-74cd77dd1eb8	760d2f32-a9b2-400f-a935-dfdc876d31fe	users	SUCCESS	2026-10-16 05:14:46.508	pulled 1 rows	2026-10-16 05:14:46.508933	2026-10-16 05:14:46.508933	0	\N
ff870699-fc73-4713-8f73-85acdcc999de	5452838f-97ee-42c1-90ed-ae6fa3b475f5	e33e2ba3-2242-4d40-bb79-37eee34386b6	expenses	SUCCESS	2026-10-16 05:14:46.524	pulled 0 rows	2026-10-16 05:14:46.524646	2026-10-16 05:14:46.524646	0	\N
f3391133-c0e5-4bc6-a463-8aaf5383f350	a2b6125f-360f-451b-89f4-126777b6d263	e0443990-1e3a-4282-ac8c-eab8c40c4db8	roles	SUCCESS	2026-10-16 05:14:46.586	pulled 7 rows	2026-10-16 05:14:46.587246	2026-10-16 05:14:46.587246	0	\N
e58815ab-0f01-4269-ab87-133ea805a868	7218ddb6-646c-458f-b30b-958c71272a1b	6beba136-8a96-450f-9f50-35aa81b905f3	sales	SUCCESS	2026-10-16 05:14:46.605	pulled 1 rows	2026-10-16 05:14:46.605588	2026-10-16 05:14:46.605588	0	\N
ceeeed51-73f0-4522-85bf-f523609b47ed	3720b687-a864-4edb-8374-6a19ce6d6240	7cc55814-d28d-451e-867c-5ac2ce0f6729	inventory-transfers	SUCCESS	2026-10-16 05:14:46.617	pulled 0 rows	2026-10-16 05:14:46.617891	2026-10-16 05:14:46.617891	0	\N
bac48e75-3a26-458b-9567-991f7470fc29	702ed4a6-9548-40f4-87d4-4759e8f108d7	3c9fb954-a500-483d-a734-f1fc8d5a56f0	notifications	SUCCESS	2026-10-16 05:14:46.624	pulled 24 rows	2026-10-16 05:14:46.624727	2026-10-16 05:14:46.624727	0	\N
8983ae94-a46f-4b55-9687-54cc60c601c7	18db34bb-3395-4842-b475-1c454b4a5ff1	fefd8f5f-10df-436c-94f8-e279fe671e72	products	SUCCESS	2026-10-16 06:39:31.788	pulled 1 rows	2026-10-16 06:39:31.789775	2026-10-16 06:39:31.789775	0	\N
82e776c6-0111-472b-91df-10900f4e8be6	6d054592-2810-422a-b4fb-60e752bb6ccf	df7e39f7-95cf-488d-ab9d-676178a5c25e	inventories	SUCCESS	2026-10-16 06:39:31.832	pulled 1 rows	2026-10-16 06:39:31.838725	2026-10-16 06:39:31.838725	0	\N
c7739cb1-1ea8-49e7-a424-3bd24da8abd9	4bd6206b-700f-41ba-ae19-048a00ed8327	3d3176b7-9d38-46a0-8e50-b16aa1a57c80	products	SUCCESS	2026-10-16 06:40:19.689	pulled 1 rows	2026-10-16 06:40:19.689905	2026-10-16 06:40:19.689905	0	\N
1f139c48-9142-4b31-9bae-4b62ea6c3744	c751e444-7549-4a65-9884-9cac12f2504a	fab02b21-cae4-41a5-a3b8-88603c6063d7	inventories	SUCCESS	2026-10-16 06:40:19.716	pulled 1 rows	2026-10-16 06:40:19.716448	2026-10-16 06:40:19.716448	0	\N
29b0ddc7-47c9-48e6-85aa-8b23caa13947	e7ba1ce2-9bf0-47e5-9be2-9995dd2dfdc2	b1c8c214-aa7b-4531-abfc-c60326074a8b	product-batches	SUCCESS	2026-10-16 06:40:19.874	pulled 1 rows	2026-10-16 06:40:19.875258	2026-10-16 06:40:19.875258	0	\N
1db27f04-40c5-4966-bef9-d056ccf15c45	d571be46-22be-43fc-8e5f-8fd5e271f40c	3bbf929f-5044-4323-8ac6-e2a4f7142d93	units-of-measure	SUCCESS	2026-10-16 06:40:20.005	pulled 0 rows	2026-10-16 06:40:20.006388	2026-10-16 06:40:20.006388	0	\N
c93d717a-fc82-4872-98cf-f0d6ef4ae075	0127b77c-cefa-46e4-83c9-e451e4863fe1	ffcdf6d1-f308-4758-ac42-c519c7bbe5a4	suppliers	SUCCESS	2026-10-16 06:40:20.029	pulled 0 rows	2026-10-16 06:40:20.03074	2026-10-16 06:40:20.03074	0	\N
54a792ec-1715-4f38-a00b-2ec6352f5505	d9500ff4-c267-478a-bd87-d2ade2f9e05d	8798cdaf-d83f-41c8-b5f9-fcf5558b0bd9	customers	SUCCESS	2026-10-16 06:40:20.053	pulled 0 rows	2026-10-16 06:40:20.054383	2026-10-16 06:40:20.054383	0	\N
27955ec6-1896-4118-a6ae-4ed1c94277c1	a2f07fbb-d7e4-4957-979d-0816079de9ff	107d9462-cdf4-4453-9d30-1b6db45da59c	expenses	SUCCESS	2026-10-16 06:40:20.275	pulled 0 rows	2026-10-16 06:40:20.275666	2026-10-16 06:40:20.275666	0	\N
0fba850e-2118-46b8-b1f5-d4fc2575c5aa	be50f7ee-16da-419e-acca-f6593bb44004	59cf6a88-6f23-4914-9b44-308cfc11ed3f	sales	SUCCESS	2026-10-16 06:40:20.277	pulled 0 rows	2026-10-16 06:40:20.280843	2026-10-16 06:40:20.280843	0	\N
93496016-3339-4df6-b432-abb4feb42b65	ff2f161a-6f7e-44d7-ab8d-9d4d67dd32b8	45832475-a3cc-464d-8236-a7491a04cee5	purchases	SUCCESS	2026-10-16 06:40:20.311	pulled 0 rows	2026-10-16 06:40:20.311763	2026-10-16 06:40:20.311763	0	\N
70f96075-cbd1-4371-9abd-79cbab1fdeba	03e8997e-a161-4c32-a4e6-a3b8e0c2b2cf	f41dd5cd-d034-4f18-b0bc-f38565cee3c7	branches	SUCCESS	2026-10-16 06:40:20.337	pulled 0 rows	2026-10-16 06:40:20.338223	2026-10-16 06:40:20.338223	0	\N
be86ecc5-2c13-4d87-843f-52cfbc88b20c	29de1b87-a676-4147-bd68-14e6d65ba480	32b9ffdd-9a03-459e-84b1-36199ab8406d	categories	SUCCESS	2026-10-16 06:40:20.352	pulled 0 rows	2026-10-16 06:40:20.352601	2026-10-16 06:40:20.352601	0	\N
cfab06e7-0ad5-4764-a0b3-d2e003cdc9cf	f23d085c-aafd-4112-b054-38f5ef6cc71f	7188df7c-30f0-469a-aff0-f9647d0e8946	roles	SUCCESS	2026-10-16 06:40:20.385	pulled 0 rows	2026-10-16 06:40:20.385283	2026-10-16 06:40:20.385283	0	\N
73bdbef5-d2ff-4da6-98eb-03177fe10f95	027b7c6a-6d06-4772-bfb4-6bec97b5cb01	e19c99dd-4841-4843-b30b-76583e3b1741	inventory-transfers	SUCCESS	2026-10-16 06:40:20.43	pulled 0 rows	2026-10-16 06:40:20.431346	2026-10-16 06:40:20.431346	0	\N
035c43cc-ff34-4aaf-8936-aca343bf0955	eb28c6a5-00d6-42db-8f85-eac9f433cc19	3c6ccfd9-b437-4e52-92e9-15b8ca36f6b7	users	SUCCESS	2026-10-16 06:40:20.512	pulled 1 rows	2026-10-16 06:40:20.513445	2026-10-16 06:40:20.513445	0	\N
09ddaf13-79ec-4e10-b56b-6fc57aca5d47	91793830-63a0-4fa4-827b-0d209804cbc9	c8ea5c55-a2d2-46af-a810-3a7197e3f60e	notifications	SUCCESS	2026-10-16 06:40:20.625	pulled 2 rows	2026-10-16 06:40:20.62591	2026-10-16 06:40:20.62591	0	\N
2135aeed-e652-46e9-b8e7-62a53d81b93f	9ca65d25-4ee0-4203-8342-22c42ebf6b4c	2f90a6b6-f661-4adf-bf24-9e43b7afe4f0	products	SUCCESS	2026-10-16 06:43:21.952	pulled 1 rows	2026-10-16 06:43:21.952528	2026-10-16 06:43:21.952528	0	\N
4c5f9935-8a5b-4499-afb0-3a08d3bb9489	81167cf8-de76-4bdb-b510-fcfdf9df4fbb	ee4bfbcd-45e0-42c8-80a6-f4c898934410	inventories	SUCCESS	2026-10-16 06:43:22.247	pulled 1 rows	2026-10-16 06:43:22.248865	2026-10-16 06:43:22.248865	0	\N
f78b8f9d-027f-48bb-a7d2-5d55681fa631	f820f518-5cb4-451d-a5c4-816ab5f5d821	e6d16af9-4dd2-4b9b-8a33-43ad65294174	product-batches	SUCCESS	2026-10-16 06:43:22.283	pulled 1 rows	2026-10-16 06:43:22.284077	2026-10-16 06:43:22.284077	0	\N
841ac5d3-a21e-46d7-8b8a-d3345f7f2cbe	1e94b3e3-57bd-425c-b4fd-87fc5c1d9c93	2f87d27c-eef0-4e93-b522-1f0dd1ac35ff	suppliers	SUCCESS	2026-10-16 06:43:22.457	pulled 0 rows	2026-10-16 06:43:22.458165	2026-10-16 06:43:22.458165	0	\N
df831ca1-1c22-4de3-8e82-e2489ffe29d9	a2dab0b5-68ab-400d-82ef-b7657b7245e2	bbb36125-852a-45c4-b471-f008f4fc687d	categories	SUCCESS	2026-10-16 06:43:22.46	pulled 0 rows	2026-10-16 06:43:22.460659	2026-10-16 06:43:22.460659	0	\N
284bc77a-f595-4851-8681-38742e821308	34dc7a54-d923-45a9-93d8-1fa364166e19	653b19d7-417e-4827-a3a6-c30db36f470f	branches	SUCCESS	2026-10-16 06:43:22.607	pulled 0 rows	2026-10-16 06:43:22.611808	2026-10-16 06:43:22.611808	0	\N
c07f33a2-03d1-4552-8a6d-531dfb9ad2db	d4480d53-bd77-472f-b388-07f95cdbb826	5e70b597-b26f-4726-88d2-3ec6774ab8eb	units-of-measure	SUCCESS	2026-10-16 06:43:22.618	pulled 0 rows	2026-10-16 06:43:22.618384	2026-10-16 06:43:22.618384	0	\N
865fbccb-2938-4c84-9a11-f324434225c5	fe1d5e29-2991-4926-91b2-0072ffba4003	2b07aea7-259b-4186-9454-c065556ee928	customers	SUCCESS	2026-10-16 06:43:22.644	pulled 0 rows	2026-10-16 06:43:22.645546	2026-10-16 06:43:22.645546	0	\N
989b6dc3-ed20-4bda-8508-5888a4671625	12be9cc8-7d55-48cc-9ff9-5d9012f5f15a	906f5db0-a2ee-4e02-a71c-8b8a977cedc3	purchases	SUCCESS	2026-10-16 06:43:22.77	pulled 0 rows	2026-10-16 06:43:22.770866	2026-10-16 06:43:22.770866	0	\N
26ffdee5-ed39-4003-bcdc-e363a3055958	2af4aeec-0c33-429b-a9e7-2807055cc660	f4406b09-1bbf-4623-a032-8653b02c18d3	sales	SUCCESS	2026-10-16 06:43:22.776	pulled 0 rows	2026-10-16 06:43:22.777269	2026-10-16 06:43:22.777269	0	\N
b4822319-7f4f-4f83-8d1e-1a875a0e9e8b	3eb94171-3586-4f32-9cae-eb21958425e5	d5f5532d-4a6e-41bb-9832-3bbffb146618	users	SUCCESS	2026-10-16 06:43:22.987	pulled 0 rows	2026-10-16 06:43:22.987846	2026-10-16 06:43:22.987846	0	\N
cfa43153-915d-41c2-b0d0-5d01530cedae	c255eba4-91c0-48c7-b1e9-b50acacee49d	d1b5a29f-f7db-4c7f-9f8f-e2a9742c1eb2	inventory-transfers	SUCCESS	2026-10-16 06:43:22.995	pulled 0 rows	2026-10-16 06:43:22.995475	2026-10-16 06:43:22.995475	0	\N
7564e61e-8e94-4d53-af72-f0ad6012599e	8ae3d845-617f-4f72-aa2b-b25074514b48	2a613d82-194a-4422-a4e0-b2a5af001a69	expenses	SUCCESS	2026-10-16 06:43:22.996	pulled 0 rows	2026-10-16 06:43:22.997591	2026-10-16 06:43:22.997591	0	\N
cd268892-d26e-4c6c-bf23-709e14bc6e9b	adc548c7-def7-49e4-bd97-b1eff44cedbd	2b8a6a97-7787-4e77-91bc-2bdac93045f1	roles	SUCCESS	2026-10-16 06:43:23.027	pulled 0 rows	2026-10-16 06:43:23.028117	2026-10-16 06:43:23.028117	0	\N
dd17f13c-22d1-444b-a5b8-7e00c2199509	633b9b36-4473-4f5f-a2a9-7b8dd276562c	34611d0f-493e-41eb-8010-1d10fb61a4ae	notifications	SUCCESS	2026-10-16 06:43:23.03	pulled 25 rows	2026-10-16 06:43:23.031158	2026-10-16 06:43:23.031158	0	\N
be516da1-c42c-4c3c-8b02-ddb9c6c8d6cf	69326279-da1a-4719-921e-1c142de483fa	bf9239e7-b835-410e-9541-b9ad72d6dbaa	categories	SUCCESS	2026-10-17 02:59:33.709	pulled 1 rows	2026-10-17 02:59:33.710709	2026-10-17 02:59:33.710709	0	\N
abd9d534-1ad9-4e7f-8fab-610343130e61	045a8c61-b628-442c-ac9b-391a13f5e364	e131818e-6548-455c-9276-65355fdd0413	products	SUCCESS	2026-10-17 02:59:33.723	pulled 1 rows	2026-10-17 02:59:33.725826	2026-10-17 02:59:33.725826	0	\N
8a32ebc6-b3a4-4065-87fe-35bdc6026a81	fb73d651-746b-4580-be1e-4413abbd6abd	3b810dad-ff05-4746-afbe-ed52ae952c10	suppliers	SUCCESS	2026-10-17 02:59:33.923	pulled 1 rows	2026-10-17 02:59:33.924297	2026-10-17 02:59:33.924297	0	\N
b1dfdb75-209a-408f-8357-4388bb92edc6	966df6e3-fe33-4331-a13f-0d134023fe4e	a7ffa8df-97c6-49ba-8aa7-0ea582df1eac	units-of-measure	SUCCESS	2026-10-17 02:59:33.929	pulled 1 rows	2026-10-17 02:59:33.929714	2026-10-17 02:59:33.929714	0	\N
8db0dfac-f6bf-4743-b61f-e25b1ecbf453	a7f19819-c838-4a61-bd95-aa34abf46a3b	b99f620c-6a45-4dee-8d12-7a28e839c6d7	customers	SUCCESS	2026-10-17 02:59:33.976	pulled 0 rows	2026-10-17 02:59:33.978095	2026-10-17 02:59:33.978095	0	\N
2e7c6df4-a4f0-4ea8-957e-0d85382329ef	fcafd1df-b235-46b7-9775-00382f15dfdf	be8ab2d9-8b94-41da-ba16-cea03e6b9e28	branches	SUCCESS	2026-10-17 02:59:34.055	pulled 1 rows	2026-10-17 02:59:34.056182	2026-10-17 02:59:34.056182	0	\N
39893fc1-fdd7-4e6c-9ab3-8a8cffd8da37	53996f1e-0602-4161-9a8e-9797da8f2958	94db97b2-faf2-407f-9d70-b2beb30dd3ec	expenses	SUCCESS	2026-10-17 02:59:34.069	pulled 0 rows	2026-10-17 02:59:34.071375	2026-10-17 02:59:34.071375	0	\N
43add78d-4ea5-4048-ba65-c66e92ecb21a	04fc5343-ed00-4c82-ba63-a33bfbb78864	48851691-ffec-435d-b555-8902703735d9	purchases	SUCCESS	2026-10-17 02:59:34.13	pulled 1 rows	2026-10-17 02:59:34.131137	2026-10-17 02:59:34.131137	0	\N
102d1151-1fdc-4c8d-aa61-785a70b29134	1fd2b62f-d314-4175-a4bd-a35e2d2cd388	55b88ce4-d640-46ca-9881-9d98375ee5ed	inventory-transfers	SUCCESS	2026-10-17 02:59:34.317	pulled 0 rows	2026-10-17 02:59:34.317766	2026-10-17 02:59:34.317766	0	\N
87b5b9b0-b5cc-4a1e-bb47-46ef015efca3	b1c72fd2-ad3e-4c51-99dc-0ae47bca8de6	2e774674-d857-4d3f-804d-982e1e510db2	roles	SUCCESS	2026-10-17 02:59:34.319	pulled 7 rows	2026-10-17 02:59:34.323515	2026-10-17 02:59:34.323515	0	\N
26ed9e2d-ddba-4080-89f1-85219b0832b7	be79fc87-2727-4e79-8fff-bea5491062e1	3f6d2dba-664b-46dd-bfe9-5cab80fdab87	users	SUCCESS	2026-10-17 02:59:34.33	pulled 1 rows	2026-10-17 02:59:34.330666	2026-10-17 02:59:34.330666	0	\N
de08a625-bf37-47bc-8bf3-3c1fc451ff59	ac3d868f-099b-4117-abdf-b126ebf17f69	f86fa413-76a9-4377-b618-9fe4de928c71	inventories	SUCCESS	2026-10-17 02:59:34.348	pulled 1 rows	2026-10-17 02:59:34.349618	2026-10-17 02:59:34.349618	0	\N
ece61eed-fcef-46ab-b64a-ab77f00ddf71	b513b480-f231-46dd-9d61-0a92f3594cb4	1d5db237-ce61-41be-983e-da58f2142d44	product-batches	SUCCESS	2026-10-17 02:59:34.386	pulled 1 rows	2026-10-17 02:59:34.386914	2026-10-17 02:59:34.386914	0	\N
0bb6ee48-3425-4c53-8cdd-22e576e3cb5e	0fa276ef-75ea-4aaa-a617-f9b2c3a92ba8	5a5e04b4-49b7-44a9-b3c5-42ebc79e4e76	notifications	SUCCESS	2026-10-17 02:59:34.554	pulled 1 rows	2026-10-17 02:59:34.555461	2026-10-17 02:59:34.555461	0	\N
602cb29f-acc3-47ce-99e7-812bf8f6dba5	4b8a597d-cba0-4d46-b77a-642ca7711250	63c0b640-8fbb-4dee-aadc-c0a4e601eac8	sales	SUCCESS	2026-10-17 02:59:34.575	pulled 0 rows	2026-10-17 02:59:34.575816	2026-10-17 02:59:34.575816	0	\N
0b228b7c-ab66-41a6-879f-aefe87d7385c	dev-mvaih3kc-jg9pa7u3kk	d3bf6b36-d09a-44bd-9da0-c6392690c482	sales	SUCCESS	2026-10-17 03:02:27.659316	\N	2026-10-17 03:02:27.496684	2026-10-17 03:02:27.659316	0	\N
df88dcca-d0fd-403e-86fd-eeb5464d2036	dev-mvaih3kc-jg9pa7u3kk	mut-mvbtfozq-u9jle4aw98	products	SUCCESS	2026-10-17 03:19:11.585172	\N	2026-10-17 03:19:11.477919	2026-10-17 03:19:11.585172	0	\N
8575027d-305f-4589-891f-3aa5bb96851d	130758f7-e1e8-4e8b-838f-5536167c2601	f3683c85-106b-45b7-a34b-dfe0b288f2e2	products	SUCCESS	2026-10-17 03:19:11.928	pulled 3 rows	2026-10-17 03:19:11.92941	2026-10-17 03:19:11.92941	0	\N
67af223b-8c3a-4def-83cc-948db11aa743	963389f2-ad6c-4f57-be20-58fc5da28f4d	5ce46592-2a3a-4cb7-bf1d-668f06f33c13	expenses	SUCCESS	2026-10-17 03:19:12	pulled 0 rows	2026-10-17 03:19:12.001129	2026-10-17 03:19:12.001129	0	\N
4897a439-4d56-49be-a162-1c8d5e6b2007	e4a9139f-1c3d-4789-a83c-3dc92cb40f25	0f4a6235-4425-460a-a76f-f6e2fe98ea1d	inventories	SUCCESS	2026-10-17 03:19:12.017	pulled 3 rows	2026-10-17 03:19:12.018191	2026-10-17 03:19:12.018191	0	\N
d5ea19a1-41ee-4d69-b260-b938f351171d	875dcac7-ab52-4ae7-abc0-58dc146b1584	6fd1accf-af44-46ea-a21f-c983b9896368	customers	SUCCESS	2026-10-17 03:19:12.021	pulled 0 rows	2026-10-17 03:19:12.023265	2026-10-17 03:19:12.023265	0	\N
31ee11b5-5c1a-40ce-a097-7a12dce6ddc0	c66eba53-e9de-4494-97c7-6c69f510736d	85403bd3-ceaa-44ba-b194-21b156609411	inventory-transfers	SUCCESS	2026-10-17 03:19:12.024	pulled 0 rows	2026-10-17 03:19:12.025615	2026-10-17 03:19:12.025615	0	\N
a28ae36c-74e0-4488-87a0-9a0411e7c720	ebf7ee1b-d503-4ef6-b68a-b354c0b63ec9	16977667-8773-42b2-9d4f-5d816d76a25f	product-batches	SUCCESS	2026-10-17 03:19:12.078	pulled 1 rows	2026-10-17 03:19:12.079406	2026-10-17 03:19:12.079406	0	\N
0cbfaf49-eed3-4680-b0ed-9ddd63c2e301	5e3c0bdc-012a-41fb-87f5-5e05377e3662	1c625594-9767-49a3-96c7-b0221a92e4b9	units-of-measure	SUCCESS	2026-10-17 03:19:12.345	pulled 0 rows	2026-10-17 03:19:12.350423	2026-10-17 03:19:12.350423	0	\N
bb42c473-23ec-4430-a958-b016a64715b9	b8270545-8208-4e30-a842-0b85423d65d3	b619057e-110d-4c14-8fe6-2ebf452bf069	inventories	SUCCESS	2026-10-17 03:19:13.959	pulled 3 rows	2026-10-17 03:19:13.961168	2026-10-17 03:19:13.961168	0	\N
42a53a39-77a1-4d00-a9d4-165d680e4cdb	6b320107-4cd1-4d9f-865f-7a5f87ce000b	53ab40c3-1a8d-4c29-bd48-1c3b85bac6e5	units-of-measure	SUCCESS	2026-10-17 03:19:14.301	pulled 0 rows	2026-10-17 03:19:14.3029	2026-10-17 03:19:14.3029	0	\N
7afa3873-01d7-4850-bbe6-f460b7eb4aff	2f435534-bbe5-4946-8de7-3b55fa1935ad	5379cb0c-7ecd-4e00-aea3-53be7f42364e	purchases	SUCCESS	2026-10-17 03:19:14.346	pulled 0 rows	2026-10-17 03:19:14.346935	2026-10-17 03:19:14.346935	0	\N
8a4d7f2b-56e9-4531-9422-ea36559b02ec	7d65c601-6feb-4b6d-b559-9b0d9900e818	693dbc3d-7dab-4e25-b8a9-be00e4999c25	sales	SUCCESS	2026-10-17 03:19:14.385	pulled 0 rows	2026-10-17 03:19:14.386247	2026-10-17 03:19:14.386247	0	\N
e7d21aed-f1ab-4c23-aaa5-2f5fc2f59bd5	8ec24d92-f127-4022-a7f4-1f6ab0a7870c	95a72337-6126-4205-99db-55b630ff0823	users	SUCCESS	2026-10-17 03:19:14.445	pulled 0 rows	2026-10-17 03:19:14.446445	2026-10-17 03:19:14.446445	0	\N
f7cc7af5-a6cd-43ad-befc-04d67989ff18	72dec88a-85e8-46f6-82f2-f928ec90c250	40509103-7ce3-4cde-864f-bd7036685909	roles	SUCCESS	2026-10-17 03:19:14.478	pulled 0 rows	2026-10-17 03:19:14.478975	2026-10-17 03:19:14.478975	0	\N
270095eb-5d02-4e89-8618-104d90f09c19	bdbe3596-040d-4785-a2b6-165079d55ab1	ec177422-07e3-4b0f-8fd1-c06a6a6eebce	notifications	SUCCESS	2026-10-17 03:19:14.507	pulled 0 rows	2026-10-17 03:19:14.508491	2026-10-17 03:19:14.508491	0	\N
bba04576-018f-489b-b64b-f94bea5e0c94	b1cfef9d-afa1-4ba6-9128-125ca62d8800	022ca67a-2296-4a1b-9414-db96535e68ca	categories	SUCCESS	2026-10-17 03:19:12.347	pulled 0 rows	2026-10-17 03:19:12.348449	2026-10-17 03:19:12.348449	0	\N
c867b97a-6e47-472e-bb4a-6e8bd0b7626d	4d7f0d15-b6ba-4d8e-a2bf-ff43ac1e59ca	4e3c1a07-34ec-41f4-8b20-5d05621e6268	suppliers	SUCCESS	2026-10-17 03:19:12.349	pulled 0 rows	2026-10-17 03:19:12.349774	2026-10-17 03:19:12.349774	0	\N
a6e40c68-e6ca-47e3-b2be-acc92594679e	31096cfd-9117-438f-b786-38adb821f133	43d2bfa0-e38a-4f65-b6d1-adfef96cc35d	expenses	SUCCESS	2026-10-17 03:19:13.953	pulled 0 rows	2026-10-17 03:19:13.954695	2026-10-17 03:19:13.954695	0	\N
278f8ae5-8f0b-4778-824d-47e39bb74f62	d9c3d876-e7c7-4551-85d1-20d0d41e5a3d	c10d3a29-8993-4dc8-97ef-87bedd21112b	categories	SUCCESS	2026-10-17 03:19:14.316	pulled 0 rows	2026-10-17 03:19:14.317958	2026-10-17 03:19:14.317958	0	\N
0108f5f9-e24e-4c4a-b226-6d69bef4eedf	60dc490d-c237-49da-8257-4eee60617fee	27c5d1b2-f1f0-4660-a29b-996a96e1c488	branches	SUCCESS	2026-10-17 03:19:12.363	pulled 0 rows	2026-10-17 03:19:12.364604	2026-10-17 03:19:12.364604	0	\N
55494352-15f2-4451-8889-3b569cc45fb8	3b4f0faf-044c-41d7-8b0d-013037570b73	3787887b-2670-455b-b595-d8af8b871f5f	roles	SUCCESS	2026-10-17 03:19:12.53	pulled 0 rows	2026-10-17 03:19:12.531294	2026-10-17 03:19:12.531294	0	\N
7668ee76-aba0-4968-983d-5db5f2d8c74b	ca01fa31-099f-4a9a-a797-b406bd169b03	78a9a4d5-ae39-47bb-90fc-9b11cd11d5b8	products	SUCCESS	2026-10-17 03:19:13.926	pulled 3 rows	2026-10-17 03:19:13.929879	2026-10-17 03:19:13.929879	0	\N
44115683-9186-4179-bebb-885eecaec1b7	7cd36bc4-7bc2-4f78-845c-7dd9801b3473	f1b2ddad-ede4-4ba7-ab93-2f4185874afb	branches	SUCCESS	2026-10-17 03:19:14.303	pulled 0 rows	2026-10-17 03:19:14.307001	2026-10-17 03:19:14.307001	0	\N
e42731f5-efc7-4453-b39e-a71a49e3c43f	75c9afa8-25f6-4804-b351-3005b99ef450	6ec0c5ad-2db6-4b70-8972-95588cab15ea	sales	SUCCESS	2026-10-17 03:19:12.384	pulled 0 rows	2026-10-17 03:19:12.38475	2026-10-17 03:19:12.38475	0	\N
466178df-7ec6-4c64-b492-759a4c75ad7e	3963dcff-812d-4ea4-8fdc-2e5ea6c29dab	d4020584-3d32-4ae5-aa48-39f2334cab83	users	SUCCESS	2026-10-17 03:19:12.497	pulled 0 rows	2026-10-17 03:19:12.498471	2026-10-17 03:19:12.498471	0	\N
978cd8f3-4033-4521-80a3-fd10ee293f61	5b2c1e4b-f87d-4613-8b9b-303340625976	e5131549-00af-45e1-80b2-4f59c41bf4ac	purchases	SUCCESS	2026-10-17 03:19:12.526	pulled 0 rows	2026-10-17 03:19:12.528449	2026-10-17 03:19:12.528449	0	\N
8de8b35b-0c5f-4af7-8d86-a149e15a8faf	cd5a73d3-ac2d-4dda-93b3-83bef24d419e	c4948005-7295-48a6-910e-0817e838cb4d	notifications	SUCCESS	2026-10-17 03:19:12.555	pulled 0 rows	2026-10-17 03:19:12.556659	2026-10-17 03:19:12.556659	0	\N
3976928e-e7e7-4432-b442-342e34d2db2a	a8dc83e7-082d-4685-a1d1-1248d17b05b4	dfd7abb7-d825-4e33-9aa3-ba642829fbeb	customers	SUCCESS	2026-10-17 03:19:13.931	pulled 0 rows	2026-10-17 03:19:13.93186	2026-10-17 03:19:13.93186	0	\N
735eb1d8-25a7-4cf6-8a17-0462e3ec2d27	89a4c10b-b851-43f1-b700-27a52c7b5a76	e09ef166-945c-46e5-8758-b8830bdaae9b	inventory-transfers	SUCCESS	2026-10-17 03:19:13.968	pulled 0 rows	2026-10-17 03:19:13.969077	2026-10-17 03:19:13.969077	0	\N
21f85d89-c177-43bc-b94c-22b8a5e9df37	cd06f6db-b445-4045-bdc6-f4f0b458e669	e1bf5fe8-7816-4038-bd02-2ad2084bd22c	product-batches	SUCCESS	2026-10-17 03:19:14.126	pulled 1 rows	2026-10-17 03:19:14.127074	2026-10-17 03:19:14.127074	0	\N
5a4e37ca-ba72-414e-837f-3390e34b14ec	adfe7f09-36aa-4319-86f3-85395819dd10	0042dccd-ad5f-4f35-a749-96919e9a12d3	suppliers	SUCCESS	2026-10-17 03:19:14.309	pulled 0 rows	2026-10-17 03:19:14.310079	2026-10-17 03:19:14.310079	0	\N
22b6d022-6ffd-4c24-966c-db0d5ab9c9ba	e22335af-f38e-4540-8d5a-412e76e683f9	c05410d3-7d7a-45a8-adf9-09afb6c1078a	inventories	SUCCESS	2026-10-17 03:26:11.804	pulled 3 rows	2026-10-17 03:26:11.805401	2026-10-17 03:26:11.805401	0	\N
7140e811-b809-4b0e-9c99-35e47ef683ad	8652de11-4e59-4fde-9ce3-cbb53354b20c	c4ec6251-de5b-4100-8a37-97422b7081bd	products	SUCCESS	2026-10-17 03:26:11.827	pulled 3 rows	2026-10-17 03:26:11.827925	2026-10-17 03:26:11.827925	0	\N
aa2370d2-0f86-48b0-b239-588cd8f8807d	dev-mvaih3kc-jg9pa7u3kk	mut-mvakrlab-hxa44olrwa	products	SUCCESS	2026-10-17 03:39:32.517552	\N	2026-10-17 03:39:32.281438	2026-10-17 03:39:32.517552	0	\N
dcd9ceed-f2c2-447b-86d2-8aef5bf5e12c	dev-mvaih3kc-jg9pa7u3kk	mut-mval80bg-7fujb8u505	inventory-transactions	SUCCESS	2026-10-17 03:39:35.090318	\N	2026-10-17 03:39:34.935917	2026-10-17 03:39:35.090318	0	\N
a87e2a18-0895-4445-a6fe-354cb2019297	b5928e1c-df38-4dd1-a02e-b70abdab8587	5b87911c-352c-4469-8fcd-c36ee1d882aa	products	SUCCESS	2026-10-17 03:39:36.81	pulled 4 rows	2026-10-17 03:39:36.81424	2026-10-17 03:39:36.81424	0	\N
c1268759-246c-4853-90d5-23f147c7297e	72cdd3c6-7003-4d56-87b2-a5fe7db55c5b	7945c7dd-6e0f-477a-86bf-92d1ed86a2f2	customers	SUCCESS	2026-10-17 03:39:36.83	pulled 0 rows	2026-10-17 03:39:36.831046	2026-10-17 03:39:36.831046	0	\N
97e25f1c-592e-4e7d-8c92-300056518fce	63c6e08b-d8b3-4bfc-be97-b0e3191b4f28	604e5372-0bc1-4a6f-80bd-dfa128e40daa	expenses	SUCCESS	2026-10-17 03:39:36.841	pulled 0 rows	2026-10-17 03:39:36.84183	2026-10-17 03:39:36.84183	0	\N
1986d949-eebb-4e1a-b7d7-d2e48640e68c	51b70a51-ba4d-45c1-82de-9781fe77aa04	19667acc-88be-4fd4-a594-1567e7844cb1	inventory-transfers	SUCCESS	2026-10-17 03:39:37.242	pulled 0 rows	2026-10-17 03:39:37.243468	2026-10-17 03:39:37.243468	0	\N
37503dbd-9980-464d-8b2c-c2b75fca8fd6	5c2f0be2-0d62-4518-a172-d93cd3e5ac1c	d498b4d4-1cf6-422b-bc69-f0a5ea3b556f	inventories	SUCCESS	2026-10-17 03:39:37.24	pulled 4 rows	2026-10-17 03:39:37.247659	2026-10-17 03:39:37.247659	0	\N
c7ff296c-9292-41cf-a3ed-02c951f04569	a0d539a5-4ba1-4a80-9076-7e7ebce57354	431a82a4-94e5-4dd2-b866-5d28ca3ca507	product-batches	SUCCESS	2026-10-17 03:39:37.278	pulled 1 rows	2026-10-17 03:39:37.279499	2026-10-17 03:39:37.279499	0	\N
9372346c-016d-435c-a557-a50a8c477d70	4ce225bb-eb98-48cc-bbfd-3b6f5f5c37c7	70db26d8-eb47-40ee-9993-7d7c6717aa17	categories	SUCCESS	2026-10-17 03:39:37.577	pulled 0 rows	2026-10-17 03:39:37.579981	2026-10-17 03:39:37.579981	0	\N
15fd5b7a-8a0a-4853-a2ca-80768421f410	5be44d34-697e-4294-8811-dfff193136b7	7a612bf1-d551-4481-ac87-d514f3f08edf	units-of-measure	SUCCESS	2026-10-17 03:39:37.58	pulled 0 rows	2026-10-17 03:39:37.585068	2026-10-17 03:39:37.585068	0	\N
6fd1c689-4336-4fa9-a5a8-d40cd479364c	29c8ffbb-3736-4d4a-a01c-63b0db9c0d69	6a82b077-c8b8-40eb-a170-207734e19417	suppliers	SUCCESS	2026-10-17 03:39:37.787	pulled 0 rows	2026-10-17 03:39:37.788077	2026-10-17 03:39:37.788077	0	\N
b02996db-55fd-4118-b0e1-ed8a9d5e3757	b7b5e95f-34b2-4e47-a007-67642f05f54b	17f820be-e238-4d62-afad-b7b3277f787c	users	SUCCESS	2026-10-17 03:39:37.926	pulled 1 rows	2026-10-17 03:39:37.929696	2026-10-17 03:39:37.929696	0	\N
be886d18-93d0-4ae8-906e-572bf2e1ae67	2e653267-002a-46b8-960f-fd769c5425da	42adf4d8-d8f0-4cfa-8771-7bc9d6ff9ee4	sales	SUCCESS	2026-10-17 03:39:37.929	pulled 0 rows	2026-10-17 03:39:37.929712	2026-10-17 03:39:37.929712	0	\N
5e5f6f07-6b5d-4f02-a3f7-0bf0b53c0e6d	d3fa0a39-7333-48ad-9a85-b30e187d9c16	d7b5897a-90ed-4df4-9b9f-53a8560e56d9	branches	SUCCESS	2026-10-17 03:39:37.931	pulled 0 rows	2026-10-17 03:39:37.931759	2026-10-17 03:39:37.931759	0	\N
9c091920-e25b-43e9-b0f4-d2fb41014b10	41783111-a09c-41eb-8bc8-a7a7cb122347	bb9ee22d-a7e5-49be-9815-7bd81d97115c	purchases	SUCCESS	2026-10-17 03:39:37.949	pulled 0 rows	2026-10-17 03:39:37.949694	2026-10-17 03:39:37.949694	0	\N
3e27af02-e134-4a31-8530-6032d2b4fed0	715e2ccf-190c-4cfe-b417-4450e6e212ec	ec3227da-7c17-488a-a3a7-6d4ce1de27ca	roles	SUCCESS	2026-10-17 03:39:37.984	pulled 0 rows	2026-10-17 03:39:37.986265	2026-10-17 03:39:37.986265	0	\N
b918c2a6-ef58-4552-94a4-dbc765a97f82	29447c6b-521d-48da-ba43-326d3f8a108e	9e4731a2-6cf8-431b-bd3c-d20f40868273	products	SUCCESS	2026-10-17 03:39:38.025	pulled 4 rows	2026-10-17 03:39:38.025927	2026-10-17 03:39:38.025927	0	\N
7c31e346-b117-474c-8f1d-29ed2a635830	db8a49b0-67a0-46f1-ae76-d0ef9a3dbd96	954da064-3926-4fcb-b289-5bd465b2e1e9	customers	SUCCESS	2026-10-17 03:39:38.083	pulled 0 rows	2026-10-17 03:39:38.083899	2026-10-17 03:39:38.083899	0	\N
c800405d-bfec-4043-b3ed-0b8b060153b3	066161be-54f7-46fc-998a-00a52ffb87c1	ce4044bf-3193-4951-a424-375da696b95e	expenses	SUCCESS	2026-10-17 03:39:38.115	pulled 0 rows	2026-10-17 03:39:38.116091	2026-10-17 03:39:38.116091	0	\N
84050a21-c752-4efc-986b-cdc129bc1386	67df65d4-f8a7-4df9-8ded-895c647bd1b1	148deffc-0b37-4cd7-8749-81b96b1ab348	inventories	SUCCESS	2026-10-17 03:39:38.132	pulled 4 rows	2026-10-17 03:39:38.133155	2026-10-17 03:39:38.133155	0	\N
15f1d237-72f3-44c3-a20b-31386e04910d	3a5b9313-75dc-4ed3-a5cb-5662e1a476d0	a0620095-926b-4964-b03a-9db96a175469	inventory-transfers	SUCCESS	2026-10-17 03:39:38.159	pulled 0 rows	2026-10-17 03:39:38.159466	2026-10-17 03:39:38.159466	0	\N
cc58983b-72da-4e67-966a-d7dcaeacb2dc	9cb7fe23-d914-4258-92c2-bbe8dbaf4df5	e108587b-3a22-42da-93a5-2d4a4f1de5ca	product-batches	SUCCESS	2026-10-17 03:39:38.169	pulled 1 rows	2026-10-17 03:39:38.17004	2026-10-17 03:39:38.17004	0	\N
eea2d234-8b0b-4281-894f-bacd717bf9f4	3a33a09d-6623-4490-a33b-61f7aea41d34	f75ff27c-7b86-424d-9bbe-7e82ab05060d	categories	SUCCESS	2026-10-17 03:39:38.381	pulled 0 rows	2026-10-17 03:39:38.382838	2026-10-17 03:39:38.382838	0	\N
252f880b-8b0a-49a4-9e7b-b3b935f6558f	a234dc61-8448-4438-9e9c-ff6832d1f209	6ff1b897-cc58-4d51-8bef-441440d783d6	units-of-measure	SUCCESS	2026-10-17 03:39:38.397	pulled 0 rows	2026-10-17 03:39:38.398806	2026-10-17 03:39:38.398806	0	\N
3df7fd91-5eb9-4ecc-bef1-ddeb1b660d8e	4cb2e8f6-561d-438a-86dc-10da78759b25	18816f63-d1f2-45e1-9b02-0e70b54fbda2	suppliers	SUCCESS	2026-10-17 03:39:38.412	pulled 0 rows	2026-10-17 03:39:38.414151	2026-10-17 03:39:38.414151	0	\N
9bd69693-0b8a-446e-a0d6-980f815f7fa0	d821a6f6-2413-4ad9-8bec-0f91a3e3eba5	aed7e299-76b4-4190-b342-53c07afdc7df	notifications	SUCCESS	2026-10-17 03:39:38.416	pulled 1 rows	2026-10-17 03:39:38.417763	2026-10-17 03:39:38.417763	0	\N
1210b884-dc3a-4415-b949-315808d04b50	893b760e-5103-460b-8ad6-2f201a6f1653	846e92ff-4bf1-4803-9da8-e8cc7ba5f634	branches	SUCCESS	2026-10-17 03:39:38.447	pulled 0 rows	2026-10-17 03:39:38.448339	2026-10-17 03:39:38.448339	0	\N
89b5d509-ad0c-4df5-a49e-b94cce81ce0b	45f0e41c-9621-4fb4-b76d-b60396aadd10	04ffe9b4-8f8f-4de1-8c64-dc8c01dcf43a	purchases	SUCCESS	2026-10-17 03:39:38.802	pulled 0 rows	2026-10-17 03:39:38.803356	2026-10-17 03:39:38.803356	0	\N
193afd18-241a-43d4-83ce-18b8f832dd1e	47e6f437-3691-46d2-946b-6ae4fc62da41	8422ca18-c78d-4287-a6c9-9a38fae3b3f9	roles	SUCCESS	2026-10-17 03:39:38.82	pulled 0 rows	2026-10-17 03:39:38.824387	2026-10-17 03:39:38.824387	0	\N
450dca8d-aaef-4dd9-9013-fa73250603c4	f9a285d2-034d-4d7a-a3da-2daf3fce0633	975e9eb5-12eb-48f7-8715-2f9a28dcba06	sales	SUCCESS	2026-10-17 03:39:38.843	pulled 0 rows	2026-10-17 03:39:38.84435	2026-10-17 03:39:38.84435	0	\N
4c816c6e-0658-4f87-ac77-f7994a7b81f1	7d22da5a-f8fc-4eb4-a736-50dff47bd74b	58822af9-4714-4538-8e1b-48d983efc51b	users	SUCCESS	2026-10-17 03:39:38.849	pulled 1 rows	2026-10-17 03:39:38.850418	2026-10-17 03:39:38.850418	0	\N
ec630002-98a3-4e15-a671-618d0ecfd829	6ef50b44-e78d-450a-a9de-8e5f2f57cd93	c0d20c18-b34a-4483-870a-bc41dd9e98cf	notifications	SUCCESS	2026-10-17 03:39:38.856	pulled 1 rows	2026-10-17 03:39:38.857323	2026-10-17 03:39:38.857323	0	\N
e338ae8b-6d2d-4f15-ac56-dffca77001bd	2064d6cd-6e90-4d49-8cc7-93367bb3ac24	a8336797-033d-43eb-a17d-b34f7370d31c	products	SUCCESS	2026-10-17 03:40:29.382	pulled 4 rows	2026-10-17 03:40:29.392129	2026-10-17 03:40:29.392129	0	\N
9b2d8b55-f468-448a-8a6c-8574ae75f0b0	d5497dc3-1d9f-4c4d-96be-ab4f238deb78	04adb32c-0b3f-4c15-aa2b-40cd1d3d4929	inventory-transfers	SUCCESS	2026-10-17 03:40:29.474	pulled 0 rows	2026-10-17 03:40:29.480533	2026-10-17 03:40:29.480533	0	\N
63c3fbba-f0d9-4f15-91fb-5e577f67ebed	6b40dc53-75b5-48f2-ab56-85e5ecef684e	8142c99c-445e-4281-9554-21acdb7df431	inventories	SUCCESS	2026-10-17 03:40:29.488	pulled 4 rows	2026-10-17 03:40:29.492331	2026-10-17 03:40:29.492331	0	\N
c2258893-5bb2-4e7b-8996-27b8155936ff	e3e12cab-384f-4af4-8b2e-c4836efbc8b2	f05130e4-469c-4a15-9cf4-1da3d63ca196	expenses	SUCCESS	2026-10-17 03:40:29.542	pulled 0 rows	2026-10-17 03:40:29.563248	2026-10-17 03:40:29.563248	0	\N
21b74e2e-cdf1-45f5-8369-79cd4edc0198	27a04b55-c540-4e11-8a11-e72c0bbbd478	42fdecbb-933d-4b1c-9b69-4185384e042b	customers	SUCCESS	2026-10-17 03:40:29.604	pulled 0 rows	2026-10-17 03:40:29.609463	2026-10-17 03:40:29.609463	0	\N
dd0812c1-11cc-43ad-9f14-8cabbdb2c062	61e6603d-bcc0-443c-92af-b5fc7aed6c4b	9e684bf4-f049-4626-a8f8-d669d39538c9	product-batches	SUCCESS	2026-10-17 03:40:29.65	pulled 1 rows	2026-10-17 03:40:29.651411	2026-10-17 03:40:29.651411	0	\N
98ad4c4c-1684-4c1d-b7f4-fbbbda6a3344	cf7b2460-7062-4855-bdf4-a9665ab6d449	2ef853cc-3556-4916-a4b7-6ad0d3ef1f51	categories	SUCCESS	2026-10-17 03:40:30.064	pulled 0 rows	2026-10-17 03:40:30.065651	2026-10-17 03:40:30.065651	0	\N
83df5f48-3d4f-436c-b108-cd1524c733a3	5db654ba-0989-4fbc-9364-139165266946	7ac76366-e1d2-4694-9ec9-1558eb8aa880	suppliers	SUCCESS	2026-10-17 03:40:30.066	pulled 0 rows	2026-10-17 03:40:30.066851	2026-10-17 03:40:30.066851	0	\N
1e6cb5ff-e602-4beb-97b3-6169362ffc19	168946ff-d735-4327-98c4-e17a87796e86	fb96de8d-6137-497b-bc77-cb21c95000d9	units-of-measure	SUCCESS	2026-10-17 03:40:30.067	pulled 0 rows	2026-10-17 03:40:30.070164	2026-10-17 03:40:30.070164	0	\N
6889954d-14a5-4a11-8f7b-32111e57a9be	c7386174-64e7-4b33-a810-0cf2fa773481	cbd208ee-3a2a-47cf-a2eb-e897de5d2e38	branches	SUCCESS	2026-10-17 03:40:30.172	pulled 0 rows	2026-10-17 03:40:30.173798	2026-10-17 03:40:30.173798	0	\N
3254948b-13b4-4458-8ce0-791729ec1f84	9a913b5c-3a8e-4e97-b687-b38491280c8e	d680f62d-571d-4f85-85b3-02eb29595121	sales	SUCCESS	2026-10-17 03:40:30.176	pulled 0 rows	2026-10-17 03:40:30.176594	2026-10-17 03:40:30.176594	0	\N
608d78a5-e736-43bf-88ea-bc349e18da94	5ab1ca4a-d0b2-4657-a2a1-7405f3c4f883	847275b5-cff7-4197-9206-cff06829d9b3	users	SUCCESS	2026-10-17 03:40:30.2	pulled 0 rows	2026-10-17 03:40:30.200802	2026-10-17 03:40:30.200802	0	\N
4f9ef11c-3aa7-40fe-8feb-fda246afe198	a2e1f768-f573-4143-89de-93694ca36573	d1b70602-0808-4f00-90ae-c5fe22ff6872	roles	SUCCESS	2026-10-17 03:40:30.201	pulled 0 rows	2026-10-17 03:40:30.203407	2026-10-17 03:40:30.203407	0	\N
145bf8b4-bf67-48c0-92fc-bdb223f2bd90	e68a45ef-25c7-4630-b986-6354a83648bf	bf479f3e-f6a3-4e80-9226-754110eddd41	purchases	SUCCESS	2026-10-17 03:40:30.207	pulled 0 rows	2026-10-17 03:40:30.20881	2026-10-17 03:40:30.20881	0	\N
e22265b4-5a55-4eac-adf7-9308064f381b	1342c0fa-5b0c-4fc2-b2bd-3a5487eb3d0f	3722ad25-1b24-4adc-ae78-f9b3b0f64d62	notifications	SUCCESS	2026-10-17 03:40:30.39	pulled 0 rows	2026-10-17 03:40:30.394962	2026-10-17 03:40:30.394962	0	\N
d926cbde-857e-422d-95ef-f38108e54fcb	2375d7a5-64bb-44c8-b9d9-fa4654cd5c45	d2875a3b-95f5-4741-a7e7-4e5692ba9e01	products	SUCCESS	2026-10-17 03:41:29.001	pulled 4 rows	2026-10-17 03:41:29.001784	2026-10-17 03:41:29.001784	0	\N
a20a7313-5573-4e7a-9135-4ae0012a410b	ed2e2f78-df8d-4a18-b46f-95b13933e860	25ca8a41-86b6-4af7-b0e6-125c834ea57e	customers	SUCCESS	2026-10-17 03:41:29.105	pulled 0 rows	2026-10-17 03:41:29.109292	2026-10-17 03:41:29.109292	0	\N
36a97d64-e64f-4029-9e95-35dcc143d136	d6f04a27-23c3-4ab0-b763-0ff51435eb03	76a3cea7-3b73-4df2-b067-8d10cf527f2c	inventories	SUCCESS	2026-10-17 03:41:29.115	pulled 4 rows	2026-10-17 03:41:29.116232	2026-10-17 03:41:29.116232	0	\N
6dbddc70-1a9e-4b2b-8b41-d9ddc50e4218	d51e6e15-a96a-48fd-a6d4-44dd74b17af2	50b39330-ccaa-4204-aed3-80c9a6fa4078	expenses	SUCCESS	2026-10-17 03:41:29.17	pulled 0 rows	2026-10-17 03:41:29.179358	2026-10-17 03:41:29.179358	0	\N
512b5667-672b-41ed-b8af-c50607a96242	b32288d6-f006-436b-a919-73da21fe22b0	9a074f1f-f0f6-47ac-ad51-d9ea15ff603d	inventory-transfers	SUCCESS	2026-10-17 03:41:29.167	pulled 0 rows	2026-10-17 03:41:29.170147	2026-10-17 03:41:29.170147	0	\N
e3318319-6c91-4cc0-8cbb-884e37805132	317df66d-6773-4acd-8fe2-05710f51c3fa	5933c9a9-aae2-46ab-8b9d-e15d727ce4b1	product-batches	SUCCESS	2026-10-17 03:41:29.25	pulled 1 rows	2026-10-17 03:41:29.25299	2026-10-17 03:41:29.25299	0	\N
3ba3fccd-6dc4-4b96-9f66-0b7aff6db342	0d35998a-5ca8-4095-8010-971952e3671a	c115a0d1-7e3e-41bc-83b5-b7a3ae85104e	categories	SUCCESS	2026-10-17 03:41:29.668	pulled 0 rows	2026-10-17 03:41:29.675082	2026-10-17 03:41:29.675082	0	\N
d3d8f9ab-4a73-4879-b3b5-a3579c3588d0	18305276-af88-4496-8128-742ce9856f29	dbf10ed3-b399-418a-8a17-c49cba624d51	branches	SUCCESS	2026-10-17 03:41:29.703	pulled 0 rows	2026-10-17 03:41:29.704125	2026-10-17 03:41:29.704125	0	\N
62ef78c2-5a9d-4d79-bc5f-b7361008bc26	c8111ae7-49fd-4090-ab33-f0e4659aa714	f53aa53c-0c93-48d6-8ba4-575bdf7a551f	units-of-measure	SUCCESS	2026-10-17 03:41:29.723	pulled 0 rows	2026-10-17 03:41:29.727392	2026-10-17 03:41:29.727392	0	\N
05226c26-ee0c-4d9c-887d-e9b89cccb737	751cafb6-b026-4c5b-93ab-3ae86efa2535	df59d295-b3e1-493b-938d-c69eae9640df	suppliers	SUCCESS	2026-10-17 03:41:29.752	pulled 0 rows	2026-10-17 03:41:29.752649	2026-10-17 03:41:29.752649	0	\N
15e013cc-5f13-4cfb-bef0-1aa32ab0c716	acbb8110-73a6-469e-b127-41dc8e636969	99f13a6f-4873-4a7b-b18c-ee8c5f6b40a7	purchases	SUCCESS	2026-10-17 03:41:29.83	pulled 0 rows	2026-10-17 03:41:29.830598	2026-10-17 03:41:29.830598	0	\N
a7b9b021-eafd-4ee6-a44d-d89876ccd580	8e16ce31-dc0d-4561-a679-e99d65088ecf	113331bc-35a3-4611-b716-3921c95509bb	users	SUCCESS	2026-10-17 03:41:29.896	pulled 0 rows	2026-10-17 03:41:29.897517	2026-10-17 03:41:29.897517	0	\N
b382b52d-7305-4016-87cf-5270a4a01a8e	0d092e9f-7bd9-44ee-a145-7a127a8cee7e	87bf749f-1f85-4615-8d24-49fe71050cb9	sales	SUCCESS	2026-10-17 03:41:29.899	pulled 0 rows	2026-10-17 03:41:29.899564	2026-10-17 03:41:29.899564	0	\N
e17b8db8-7402-4a09-9b1e-d864c54d1ca6	38441043-c75b-486e-95a4-3f592fc0ec08	6b2c6721-afe8-4fcb-b14f-eb1a98a1258c	roles	SUCCESS	2026-10-17 03:41:29.963	pulled 0 rows	2026-10-17 03:41:29.964196	2026-10-17 03:41:29.964196	0	\N
532d42dc-1da0-4fd6-bf7c-0b0c388b3a29	46cd8622-8186-4bee-a704-401f9b6fc50f	847f3b40-6004-461e-a8e1-6d2facb0f61a	notifications	SUCCESS	2026-10-17 03:41:29.98	pulled 0 rows	2026-10-17 03:41:29.981361	2026-10-17 03:41:29.981361	0	\N
a195253f-f864-4a12-9c09-30f095912c85	7eb89e38-e0fa-47dd-b646-ec19f942219c	72332d1d-8a70-4523-b63e-4695b10594db	products	SUCCESS	2026-10-17 03:42:29.027	pulled 4 rows	2026-10-17 03:42:29.027747	2026-10-17 03:42:29.027747	0	\N
a3a5a800-2578-4813-aa03-36716819c8d0	57ad54af-1ddb-4cda-a8c5-28a770d3dc24	5dd537d3-2598-4bf5-8ddf-76380eb77573	customers	SUCCESS	2026-10-17 03:42:29.099	pulled 0 rows	2026-10-17 03:42:29.100064	2026-10-17 03:42:29.100064	0	\N
34a9603d-2262-4987-b288-145a8b122ec5	059bbbb5-8900-467e-8b24-43525ec293e2	3595fb39-fc30-4627-a0c9-204f2f0119eb	inventory-transfers	SUCCESS	2026-10-17 03:42:29.121	pulled 0 rows	2026-10-17 03:42:29.122946	2026-10-17 03:42:29.122946	0	\N
dfad6308-cfc7-4a1e-bba4-e673367fe50c	f0581fc2-3209-477b-8b6c-1fcdc5d89d99	cb74e3e3-37f5-4cb5-94f3-366540f68bf9	inventories	SUCCESS	2026-10-17 03:42:29.175	pulled 4 rows	2026-10-17 03:42:29.176416	2026-10-17 03:42:29.176416	0	\N
ccd8a4b2-5d08-4916-905d-a8106b56f43e	8c354cb9-2d89-4f34-91d9-220ba9497d14	04132d1e-9b2e-48fb-8fbe-87b9c1867199	expenses	SUCCESS	2026-10-17 03:42:29.203	pulled 0 rows	2026-10-17 03:42:29.204746	2026-10-17 03:42:29.204746	0	\N
d8476cb2-0384-497a-a498-803f48c51254	c71f42cf-066c-4a2e-b634-726749a634ec	eda5e871-3c29-4a65-a69e-2ad7bea67d61	product-batches	SUCCESS	2026-10-17 03:42:29.238	pulled 1 rows	2026-10-17 03:42:29.238762	2026-10-17 03:42:29.238762	0	\N
5877bc73-53d9-40a7-81ff-83545daaee4a	54832ad8-65d0-415d-b831-268c75a9a75a	ef2b1761-378a-4e0d-9a46-6f71b5ff31e2	categories	SUCCESS	2026-10-17 03:42:29.673	pulled 0 rows	2026-10-17 03:42:29.674289	2026-10-17 03:42:29.674289	0	\N
81d97281-caa6-4353-9b19-bb2791058657	3ac4021c-f3c7-43cd-916b-f447477573fc	3741ba73-c363-4a03-a97f-eeaf5038e3d7	units-of-measure	SUCCESS	2026-10-17 03:42:29.709	pulled 0 rows	2026-10-17 03:42:29.710038	2026-10-17 03:42:29.710038	0	\N
1b1d3cb7-adc7-4d8f-894c-df59fdd3dfb4	70359d46-7359-4d52-9f59-65f3fc839ad4	d8842932-ee09-43db-86a1-4d20f5ec0813	branches	SUCCESS	2026-10-17 03:42:29.774	pulled 0 rows	2026-10-17 03:42:29.774934	2026-10-17 03:42:29.774934	0	\N
d7aa705b-8f36-4a15-a84b-ef43852fc352	ca36deb2-652c-4213-9194-6b3dd731cb61	b9ebdebb-a308-41be-b347-a50a7d98c1ec	suppliers	SUCCESS	2026-10-17 03:42:29.794	pulled 0 rows	2026-10-17 03:42:29.795341	2026-10-17 03:42:29.795341	0	\N
67e8d6fa-6410-46d8-a59f-922836cf58ee	8f866c95-6e48-4989-b917-aebb9390edf0	956caa7b-3f2f-4a16-a33e-947517c3aa34	purchases	SUCCESS	2026-10-17 03:42:29.831	pulled 0 rows	2026-10-17 03:42:29.832573	2026-10-17 03:42:29.832573	0	\N
eb5c6b26-82ac-42d6-aa14-c88f207ea643	84719c65-2831-42b4-a585-28e1c4450fef	b6434158-f4e6-41e8-820e-29edde9a9227	users	SUCCESS	2026-10-17 03:42:29.934	pulled 0 rows	2026-10-17 03:42:29.934919	2026-10-17 03:42:29.934919	0	\N
4bc9ac9e-2f3a-4d4e-b4ec-b3f48320c614	0ae8fb97-fd7d-486d-be60-ac0dc57979b1	b6163f0b-d1b4-44ab-a5df-001ac83ff788	roles	SUCCESS	2026-10-17 03:42:29.995	pulled 0 rows	2026-10-17 03:42:30.004854	2026-10-17 03:42:30.004854	0	\N
d41f0d8d-9f46-44ae-b92d-97baaecc4e60	bf4ae9ac-7029-4960-8cb3-af856027ef44	8ac2b958-e6c1-4d99-96dc-687703b7a7ec	notifications	SUCCESS	2026-10-17 03:42:30.103	pulled 0 rows	2026-10-17 03:42:30.104531	2026-10-17 03:42:30.104531	0	\N
291545f8-62f4-4375-8935-34ca01a69899	5f723476-5d0a-4170-9c80-ccac52f2c7e8	429849c7-7315-4777-8969-caf5fef029db	sales	SUCCESS	2026-10-17 03:42:29.917	pulled 0 rows	2026-10-17 03:42:29.930106	2026-10-17 03:42:29.930106	0	\N
decdacbd-2d4c-46b0-9f1b-35256def39ad	6463591e-f0fe-4025-b7fc-ec6409f25a04	fdba7c72-dac1-459f-8180-433c830b6372	expenses	SUCCESS	2026-10-17 03:43:21.07	pulled 0 rows	2026-10-17 03:43:21.072636	2026-10-17 03:43:21.072636	0	\N
7af0f845-aedd-41fb-af00-6c5442ce9254	5a937a7a-d9a1-43b3-9c74-82d28a9a59f0	a4399582-9030-469b-a3c1-711cb1e1a97d	customers	SUCCESS	2026-10-17 03:43:21.079	pulled 0 rows	2026-10-17 03:43:21.07985	2026-10-17 03:43:21.07985	0	\N
a2058aba-8be6-49c1-9501-b1a2e9a8b447	ade09e50-442d-4303-b581-ec37036aa389	d4ea3b90-d9d4-467f-b510-5d3d2591a701	products	SUCCESS	2026-10-17 03:43:21.104	pulled 4 rows	2026-10-17 03:43:21.106503	2026-10-17 03:43:21.106503	0	\N
f0148a96-3e06-4475-ae4d-05905006dec5	6bd1020e-553b-477e-b1bd-d3c819175ca0	e0ca211a-ca8a-4416-ba29-74958e58bc6f	inventories	SUCCESS	2026-10-17 03:43:21.331	pulled 4 rows	2026-10-17 03:43:21.333749	2026-10-17 03:43:21.333749	0	\N
ef3e7161-8aba-4226-bd9e-24e76022c4f8	8196e754-1cda-4a94-a039-3a0292bf6b66	0902ede6-f9ae-4173-838b-ea8ecbde715f	inventory-transfers	SUCCESS	2026-10-17 03:43:21.396	pulled 0 rows	2026-10-17 03:43:21.397965	2026-10-17 03:43:21.397965	0	\N
7402e5d9-49cb-41b9-af58-b172854dc297	e1d9c659-9a7f-44a3-8006-eddd5e0d6b7e	bfc75e14-4f20-4d1d-8725-c31f71e3d71d	product-batches	SUCCESS	2026-10-17 03:43:21.417	pulled 1 rows	2026-10-17 03:43:21.428226	2026-10-17 03:43:21.428226	0	\N
97b0f10e-59b4-444c-aacf-961ac69abe09	2cf1314e-c7ff-4421-9ae1-514bce0e6cfc	964a0d90-5936-4ece-ad5a-5e52715901a1	units-of-measure	SUCCESS	2026-10-17 03:43:21.796	pulled 0 rows	2026-10-17 03:43:21.797157	2026-10-17 03:43:21.797157	0	\N
a9e0c8cc-78db-4290-955e-05730231b1ac	ba6b7c4b-d87e-409a-8c82-d3b209d3202f	9ac2a527-e5b9-470a-8618-be30e956573c	categories	SUCCESS	2026-10-17 03:43:21.81	pulled 0 rows	2026-10-17 03:43:21.812039	2026-10-17 03:43:21.812039	0	\N
9ffef098-350d-4848-9158-4b17ea12733a	3c9de0b7-47bc-45e9-81ed-e5bbe06a9fca	34febc3f-8cae-40e5-8193-8d6cedbb3931	users	SUCCESS	2026-10-17 03:43:22.321	pulled 0 rows	2026-10-17 03:43:22.321807	2026-10-17 03:43:22.321807	0	\N
a46c27bd-2f00-492d-bfb3-dbf2a1fa157e	641211fe-34c7-407a-8c4d-fc03c1df3298	fef28a83-fb13-4d66-ad79-e123283fc198	branches	SUCCESS	2026-10-17 03:43:22.323	pulled 0 rows	2026-10-17 03:43:22.323554	2026-10-17 03:43:22.323554	0	\N
c593275a-b1fc-4e0a-b0f6-2694ae1ff97c	ddcfc7af-c6b4-4503-aac9-9c0afe707312	86ba600e-923d-4b2b-9792-6335ef31a16e	suppliers	SUCCESS	2026-10-17 03:43:22.323	pulled 0 rows	2026-10-17 03:43:22.324363	2026-10-17 03:43:22.324363	0	\N
91e37414-9d6f-405d-9a96-b9cd8fd40bc3	549d4bd0-7d0b-47d7-b31b-04669d2f1e01	ba862306-b904-488b-8d09-5c4232ac67d7	sales	SUCCESS	2026-10-17 03:43:22.406	pulled 0 rows	2026-10-17 03:43:22.408101	2026-10-17 03:43:22.408101	0	\N
17fa6dfd-a303-4724-b825-295601678566	0e5249c0-d066-4f7f-93b1-c23789dd05b8	5ee488fb-9b01-4b62-b8f7-6708fd32a010	purchases	SUCCESS	2026-10-17 03:43:22.408	pulled 0 rows	2026-10-17 03:43:22.40975	2026-10-17 03:43:22.40975	0	\N
b27a4e56-ad35-4fbc-9654-6b80ca5fa985	4f716908-998d-4502-91c3-791fff789787	61a905c7-0310-41ee-b329-9b4544adeedd	roles	SUCCESS	2026-10-17 03:43:22.855	pulled 0 rows	2026-10-17 03:43:22.857842	2026-10-17 03:43:22.857842	0	\N
3d91b0d4-753f-4459-b0b0-b1684d67f261	b31a112b-4b12-4cd3-a776-56f9f456021a	cbef8a68-5d2f-4901-8ab6-4ade7428eef3	products	SUCCESS	2026-10-17 03:43:22.893	pulled 4 rows	2026-10-17 03:43:22.894137	2026-10-17 03:43:22.894137	0	\N
115a047b-efd1-4681-8508-6f228c16c2a0	7e7b6046-a3ae-4210-bd96-e96e388c3dec	62e70109-5a9f-4df2-9bd0-2fce53d4a157	customers	SUCCESS	2026-10-17 03:43:22.894	pulled 0 rows	2026-10-17 03:43:22.89595	2026-10-17 03:43:22.89595	0	\N
d943c95f-be77-4414-9d69-f2dc977c116d	1881ebe7-572e-4876-ba60-ccf5a7e29dc8	f09d9dd2-0cce-4387-80f8-5927881cb5d5	expenses	SUCCESS	2026-10-17 03:43:22.896	pulled 0 rows	2026-10-17 03:43:22.897262	2026-10-17 03:43:22.897262	0	\N
416fadbe-eda8-4083-b853-4db78e79c24e	432f7aaf-d0a7-4d76-9387-c903e4ec8ee7	9ad60f1c-7cef-4050-bfc6-c5bc628d1cef	inventories	SUCCESS	2026-10-17 03:43:22.898	pulled 4 rows	2026-10-17 03:43:22.899006	2026-10-17 03:43:22.899006	0	\N
403cd812-255c-4b68-aa41-59df74cc6f75	4007d3be-6e2c-40ba-b590-eefe535c95c6	3b7f1bab-71da-4ecf-815c-a9005a0da99b	inventory-transfers	SUCCESS	2026-10-17 03:43:22.966	pulled 0 rows	2026-10-17 03:43:22.967719	2026-10-17 03:43:22.967719	0	\N
7e472d30-3898-476e-b9f2-14470b99d4d0	535395d0-b0d1-4c1a-a7bd-69b5e5c7ace4	ed1aac1e-5bab-472a-846a-aa8b4f962f00	notifications	SUCCESS	2026-10-17 03:43:23.002	pulled 0 rows	2026-10-17 03:43:23.004434	2026-10-17 03:43:23.004434	0	\N
5ad35670-47bc-4361-85f3-923fb9c2513f	02cb3945-8f52-4506-9112-b630d2f52a57	76d09322-21c3-4d56-8eef-188566d1f750	product-batches	SUCCESS	2026-10-17 03:43:23.011	pulled 1 rows	2026-10-17 03:43:23.01244	2026-10-17 03:43:23.01244	0	\N
3386ce43-85d2-45b5-b5d2-43f42ae172b8	b6cd4e3b-7a87-4b7b-84ef-a3b44f22ca9f	a3f6f6a6-6bb6-4419-8b26-f5d3674a1a00	units-of-measure	SUCCESS	2026-10-17 03:43:23.05	pulled 0 rows	2026-10-17 03:43:23.051708	2026-10-17 03:43:23.051708	0	\N
0829a8ff-48a6-4150-ad6d-0c7dd6b78295	3d7aec9c-f9fc-4e71-a8f0-b6bdbb2f7775	c6b0a977-f826-4dd0-83ef-3a31e05973d2	suppliers	SUCCESS	2026-10-17 03:43:23.095	pulled 0 rows	2026-10-17 03:43:23.095487	2026-10-17 03:43:23.095487	0	\N
b8219e36-7ddf-4973-ac9d-931911a37d29	62df328c-8c56-43e2-ba74-25bc8483b839	408177aa-570a-4b38-98f9-e40fee3591a4	categories	SUCCESS	2026-10-17 03:43:23.095	pulled 0 rows	2026-10-17 03:43:23.0963	2026-10-17 03:43:23.0963	0	\N
3fdfb203-ddc5-40da-9a79-d0b0e1d2dff7	7efb6196-8b64-4558-919c-323a17a09ce0	e2c029ed-04e4-4fab-8e5c-afcf7204cc1d	branches	SUCCESS	2026-10-17 03:43:23.444	pulled 0 rows	2026-10-17 03:43:23.445426	2026-10-17 03:43:23.445426	0	\N
6f02afe1-f65e-4632-b857-af1fbf628dfe	7deef0f2-f68f-4c95-a1ef-bef325cacfcf	c95f1535-ab2a-4ec8-8adc-24d1278d8bba	sales	SUCCESS	2026-10-17 03:43:23.447	pulled 0 rows	2026-10-17 03:43:23.448147	2026-10-17 03:43:23.448147	0	\N
4b74fb85-ca17-48c2-9535-f270c47bdcb6	a32f5a48-5e3a-42e3-893e-dfce9ff7e46b	2a36df3e-2117-4dca-b3bf-9b9d24d59210	purchases	SUCCESS	2026-10-17 03:43:23.452	pulled 0 rows	2026-10-17 03:43:23.462551	2026-10-17 03:43:23.462551	0	\N
671884c4-a508-4070-b812-0f46b05b446a	e52ba32a-e570-41ec-b21e-f320a8538e3b	06def103-f2d2-406e-a454-b09dbf62260f	users	SUCCESS	2026-10-17 03:43:23.617	pulled 0 rows	2026-10-17 03:43:23.619366	2026-10-17 03:43:23.619366	0	\N
3d917e2b-edc1-4293-b671-dda7a97b8aa2	ae281e0c-fd15-4bd8-88f2-ca3a56a00a05	b7b68427-cacb-4f44-b9b2-de2574fce60e	roles	SUCCESS	2026-10-17 03:43:23.7	pulled 0 rows	2026-10-17 03:43:23.701032	2026-10-17 03:43:23.701032	0	\N
33aa5792-cc64-4d24-8ad6-1c20a2cb996f	ed0c141d-8af6-494c-8d41-989546428451	543e4608-e670-45a2-afd2-00d7daff36ef	notifications	SUCCESS	2026-10-17 03:43:23.704	pulled 0 rows	2026-10-17 03:43:23.704992	2026-10-17 03:43:23.704992	0	\N
1943360e-7bd0-4519-9b77-2c14b38ef54f	1cffcc14-003c-4a35-a922-cab73478c37c	9109f12a-2088-40bf-8ebe-ffc4daee3ca7	customers	SUCCESS	2026-10-17 03:43:39.565	pulled 0 rows	2026-10-17 03:43:39.565612	2026-10-17 03:43:39.565612	0	\N
50fc0290-4e18-4c97-8e27-4b8e86fd1601	8e49312c-c629-4a3c-b68f-e0289a456a60	adcddbe2-53b6-4676-98c5-1e42110da557	products	SUCCESS	2026-10-17 03:43:39.561	pulled 4 rows	2026-10-17 03:43:39.561577	2026-10-17 03:43:39.561577	0	\N
4554553a-0054-4345-9b31-0e553f6dc1b4	4d6e4e6d-396e-4500-a9a1-2f1079809136	1af1b30f-506b-4a19-9a81-22d8cf0ad140	expenses	SUCCESS	2026-10-17 03:43:39.609	pulled 0 rows	2026-10-17 03:43:39.609706	2026-10-17 03:43:39.609706	0	\N
cc65fb98-167e-4c2a-9044-422ee733dc64	733ac39a-698f-4570-b37d-c2fdc4dd7a3b	5c0ae1b6-50c4-455c-80ad-257b7c2c2dde	product-batches	SUCCESS	2026-10-17 03:43:39.935	pulled 1 rows	2026-10-17 03:43:39.941671	2026-10-17 03:43:39.941671	0	\N
892b63c3-6260-4b38-ab8e-82f97b228242	e0b72bec-5885-47ee-a21c-8f6fe8a748eb	8336b8f0-93b2-45c5-b9c8-0ff89fdbcf48	inventory-transfers	SUCCESS	2026-10-17 03:43:39.954	pulled 0 rows	2026-10-17 03:43:39.954714	2026-10-17 03:43:39.954714	0	\N
98a91f56-5584-4566-a4a3-9222c5b58dc9	6892471f-b639-4e2f-ae5c-4ef7b00dabc2	11b70132-a52e-4e1f-983b-e8c1a84e5f52	inventories	SUCCESS	2026-10-17 03:43:39.962	pulled 4 rows	2026-10-17 03:43:39.963558	2026-10-17 03:43:39.963558	0	\N
977e33ab-8f8e-4d40-accb-39cba152881a	6e091aae-e676-4318-ba3c-f9f93574a4c0	f69201d6-30be-4014-a86d-4ce10f511786	units-of-measure	SUCCESS	2026-10-17 03:43:40.309	pulled 0 rows	2026-10-17 03:43:40.310367	2026-10-17 03:43:40.310367	0	\N
9f459ab3-d2c6-4375-b88a-aa43657262d1	ae77322f-3d9d-4352-99d5-eb9822992493	7a725f10-07e5-485f-87a7-b276d8c66aff	categories	SUCCESS	2026-10-17 03:43:40.322	pulled 0 rows	2026-10-17 03:43:40.326043	2026-10-17 03:43:40.326043	0	\N
e379259b-ea22-4547-a12d-da5813fc5636	20000152-f1e5-4d69-b821-41e3fe12e582	d064dfe4-2a01-464d-947a-66dae68cbd7c	suppliers	SUCCESS	2026-10-17 03:43:40.548	pulled 0 rows	2026-10-17 03:43:40.5487	2026-10-17 03:43:40.5487	0	\N
362c5422-68e6-43d7-8f41-4b766e6a9378	1459945d-8ddc-466e-bb68-9a1d082a2ac7	b4b6f1b8-7333-4a8b-a8dc-215fa5bf7d7a	branches	SUCCESS	2026-10-17 03:43:40.566	pulled 0 rows	2026-10-17 03:43:40.567367	2026-10-17 03:43:40.567367	0	\N
4135bd28-506e-482f-810f-d22b5cddf717	64017555-f4a2-47f1-9bd5-fa4cb01661d1	86873a54-d374-42e7-851b-ee47a890bd09	purchases	SUCCESS	2026-10-17 03:43:40.58	pulled 0 rows	2026-10-17 03:43:40.58165	2026-10-17 03:43:40.58165	0	\N
53e3a573-6397-47d7-bd09-68a08f4ff457	06b581ad-4f84-4dc5-8653-ec43100d0810	71d66016-4528-49b2-9b1f-2182a9593672	roles	SUCCESS	2026-10-17 03:43:40.886	pulled 0 rows	2026-10-17 03:43:40.89073	2026-10-17 03:43:40.89073	0	\N
1f606bee-26ed-4a0a-92b0-9e18041ab031	1b4e930e-46c2-4b5a-987d-4650ca721484	58b79d8a-f0f8-4528-a262-d476ccbb23bc	notifications	SUCCESS	2026-10-17 03:43:41.254	pulled 0 rows	2026-10-17 03:43:41.255348	2026-10-17 03:43:41.255348	0	\N
4fea4256-1f45-43b6-8d01-2cd15a1bb2e0	21444692-e2a7-48f8-ab8c-3e031638717c	de21b569-ec12-40a5-a2c2-f6e96ad12596	sales	SUCCESS	2026-10-17 03:43:40.62	pulled 0 rows	2026-10-17 03:43:40.621053	2026-10-17 03:43:40.621053	0	\N
0bbc5008-a551-4af4-aa98-c4f1d2201197	13e0d553-f663-4ce1-b33b-06b327931541	b2d9eccd-be9e-4c46-8d9b-ef7556ad4555	users	SUCCESS	2026-10-17 03:43:40.699	pulled 0 rows	2026-10-17 03:43:40.699977	2026-10-17 03:43:40.699977	0	\N
2a8cea91-2912-40ea-8fbe-b70a87cdcf9e	7042f47d-0500-47c3-8083-f761f44a6123	b39fbf2c-1c0d-4640-96dc-4de4bfb821a0	products	SUCCESS	2026-10-17 03:43:41.022	pulled 4 rows	2026-10-17 03:43:41.036259	2026-10-17 03:43:41.036259	0	\N
2ec76568-7722-423e-901e-568a64db7e0f	c4b205fb-150c-4674-9541-304222c6cc1f	d214e7e2-120f-4aa3-8550-fe9e50f6fdbd	inventory-transfers	SUCCESS	2026-10-17 03:43:41.269	pulled 0 rows	2026-10-17 03:43:41.269537	2026-10-17 03:43:41.269537	0	\N
870c63ad-6068-4214-b55c-47abfada4b0d	a01e1955-c5bb-49a3-bc71-4e850adc6d6a	3ea843fe-a1b5-44fb-b143-032a3d429813	users	SUCCESS	2026-10-17 03:43:41.717	pulled 0 rows	2026-10-17 03:43:41.717796	2026-10-17 03:43:41.717796	0	\N
b6b16056-61d1-4e29-9a8b-865c3ad99be2	62b56913-7198-4014-adc5-67394f4923e1	52d4ec20-319c-4310-bc7f-442200f57b7d	roles	SUCCESS	2026-10-17 03:43:41.749	pulled 0 rows	2026-10-17 03:43:41.749517	2026-10-17 03:43:41.749517	0	\N
ddce56e4-f3ae-45b2-b956-ee953f3c16e8	dc8f6a2d-6516-4836-9d0b-2e95c14d840e	9bd3ecee-b814-4c8a-a2c9-ae14b1627393	notifications	SUCCESS	2026-10-17 03:43:41.83	pulled 0 rows	2026-10-17 03:43:41.831328	2026-10-17 03:43:41.831328	0	\N
a77ff71a-97ec-4869-a804-d9e8fcf5d309	656bd619-d9cc-4b09-a2ce-8bb05fc5886f	8dd2a97f-597a-4169-91be-aa9844f28462	expenses	SUCCESS	2026-10-17 03:43:41.037	pulled 0 rows	2026-10-17 03:43:41.050073	2026-10-17 03:43:41.050073	0	\N
8a379e20-0023-4b84-8b13-d73770ef5f68	7438957b-d4ce-4638-94d0-85edc0060296	20359924-37b0-4bda-b8c3-00047263db33	customers	SUCCESS	2026-10-17 03:43:41.168	pulled 0 rows	2026-10-17 03:43:41.168411	2026-10-17 03:43:41.168411	0	\N
92dd790e-b273-4557-a8b5-12fc62789ff8	ab9c0bd0-0fd4-445b-97b3-6473ae2a2293	17a554f2-651e-4a5c-b4b7-3da4808caa09	product-batches	SUCCESS	2026-10-17 03:43:41.283	pulled 1 rows	2026-10-17 03:43:41.28343	2026-10-17 03:43:41.28343	0	\N
6a061b42-569b-4d43-aba1-e2c170355194	71f186fa-77a0-4b1c-8c5d-0ee54c3a7594	04b8a7fc-3a51-4dac-b3ac-f4b1822291bc	inventories	SUCCESS	2026-10-17 03:43:41.3	pulled 4 rows	2026-10-17 03:43:41.302001	2026-10-17 03:43:41.302001	0	\N
82d804e2-09d7-446d-b383-3a8471f7812e	1715c3e1-00e7-4e4a-a1c5-902a0f161322	ca04ccd9-8b7e-4895-9915-6c34573a5dbc	categories	SUCCESS	2026-10-17 03:43:41.372	pulled 0 rows	2026-10-17 03:43:41.373256	2026-10-17 03:43:41.373256	0	\N
84775269-94a8-42e4-8ca5-4f5e0a82bcf0	32a06986-d8a9-4473-906c-a6d593289136	2bd03eb8-7221-4998-93ca-dc9df9b121e6	units-of-measure	SUCCESS	2026-10-17 03:43:41.486	pulled 0 rows	2026-10-17 03:43:41.492554	2026-10-17 03:43:41.492554	0	\N
c434717a-9597-4dcd-9182-eaab63d8075b	843c406b-e85a-4f61-8a84-c00441592a81	ace0942b-acca-406e-b5c7-908d41f0996c	suppliers	SUCCESS	2026-10-17 03:43:41.651	pulled 0 rows	2026-10-17 03:43:41.651628	2026-10-17 03:43:41.651628	0	\N
7611b3a5-b66d-45d7-8280-2ef01758ec4d	dd3f89ee-a52c-4c54-873f-1cf89c386948	006c6e20-5b4c-44a4-b73a-53bd6983a853	branches	SUCCESS	2026-10-17 03:43:41.654	pulled 0 rows	2026-10-17 03:43:41.654614	2026-10-17 03:43:41.654614	0	\N
0031dc0f-59bd-4979-a567-809946231276	48eb5f94-e421-4643-8c8e-d9643ac284c2	a641e75a-02d7-4e51-acc4-fe5fcb9b80e0	purchases	SUCCESS	2026-10-17 03:43:41.7	pulled 0 rows	2026-10-17 03:43:41.701018	2026-10-17 03:43:41.701018	0	\N
0eed3e0e-1a59-46f3-8f89-e27b9f42a696	99c4b79d-d6af-463d-9e36-234232612f64	d7e2b6fc-7797-4242-88ce-5e8f04835e47	sales	SUCCESS	2026-10-17 03:43:41.701	pulled 0 rows	2026-10-17 03:43:41.706566	2026-10-17 03:43:41.706566	0	\N
56c37484-0941-4d3d-b084-6052f61cf075	c17d33e3-c7f5-4a26-9046-52fa7756f362	69f0fdd2-486a-4a5f-943d-50759a289d90	customers	SUCCESS	2026-10-17 03:44:36.228	pulled 0 rows	2026-10-17 03:44:36.229106	2026-10-17 03:44:36.229106	0	\N
cd795b08-8746-4a7f-97d0-aca8e2b4459b	2facf774-2d55-4849-98bc-666706123f33	d9ddca32-349d-4aaa-83fa-403afedf0192	expenses	SUCCESS	2026-10-17 03:44:36.24	pulled 0 rows	2026-10-17 03:44:36.241129	2026-10-17 03:44:36.241129	0	\N
d2c8e624-44a0-4dfd-ad7e-17dbc2b2dbd4	b93020a0-bee7-4abc-a602-7912b3e0d608	58fe3b8f-24d6-4662-9645-d2a834f42220	products	SUCCESS	2026-10-17 03:44:36.262	pulled 4 rows	2026-10-17 03:44:36.262998	2026-10-17 03:44:36.262998	0	\N
56b3044a-037a-43cf-aecf-c071c2b9ae73	b6689186-8a56-454c-8cc3-9e8c385e29f3	93236b31-fe39-4bc7-8c53-bd1e11b8a3cd	inventories	SUCCESS	2026-10-17 03:44:36.308	pulled 4 rows	2026-10-17 03:44:36.308983	2026-10-17 03:44:36.308983	0	\N
795013db-74d5-4e1d-9b75-60023455afd9	acc4cf4b-4999-4af4-b512-9e693f5254d2	a3b55840-4459-4c0e-864b-1f3181dfacfd	inventory-transfers	SUCCESS	2026-10-17 03:44:36.436	pulled 0 rows	2026-10-17 03:44:36.436829	2026-10-17 03:44:36.436829	0	\N
ddce52e3-f8d8-459d-b26e-07f5d6bf496d	573155ab-dfbe-400b-b1ff-d638d13d5de2	8553033c-522b-4198-a1a6-4e2255e138e9	suppliers	SUCCESS	2026-10-17 03:44:37.812	pulled 0 rows	2026-10-17 03:44:37.812649	2026-10-17 03:44:37.812649	0	\N
06d9f8e6-94c3-47df-bf93-ad13474f686e	64464768-160f-4bc0-9ca7-704449ba02b0	abf6b649-4ac7-4b21-99ec-471a7a139413	units-of-measure	SUCCESS	2026-10-17 03:44:37.836	pulled 0 rows	2026-10-17 03:44:37.841451	2026-10-17 03:44:37.841451	0	\N
7f441762-eec6-4a09-9bdf-74939eeb891f	8a73e278-aa96-4a32-af05-6f2f62303955	ed0f15f7-4516-4406-a558-4d0d3a0b5c43	categories	SUCCESS	2026-10-17 03:44:37.862	pulled 0 rows	2026-10-17 03:44:37.868901	2026-10-17 03:44:37.868901	0	\N
e9dc78e7-512a-4c05-ba08-508b6c82d2b4	905d5baf-1558-4bf8-8f84-9bd6ee9976b6	3543363e-f853-41e1-b987-6ae0957b2c0b	product-batches	SUCCESS	2026-10-17 03:44:37.847	pulled 1 rows	2026-10-17 03:44:37.867396	2026-10-17 03:44:37.867396	0	\N
c45be4ed-d9cf-48d1-9c81-2ca015ca135c	cb395cd7-57ef-44c5-a651-bbbb09e064e6	46cb892b-0efb-4d8a-9e93-c0b469663bf0	branches	SUCCESS	2026-10-17 03:44:37.994	pulled 0 rows	2026-10-17 03:44:37.995449	2026-10-17 03:44:37.995449	0	\N
a207fa54-fa7f-4157-ad79-443fd9216a34	45ce203b-979a-489f-aac6-c6e4c7318f10	1fbc4786-6e34-493d-a74a-949484734232	sales	SUCCESS	2026-10-17 03:44:38.088	pulled 0 rows	2026-10-17 03:44:38.088662	2026-10-17 03:44:38.088662	0	\N
0903b73c-2b38-4e57-9016-0cca9f78cf3f	a716f646-77b2-4a98-bcd9-14c0d94376f6	08af2231-cbcb-4049-afa5-4f0811da1b30	users	SUCCESS	2026-10-17 03:44:38.095	pulled 0 rows	2026-10-17 03:44:38.095823	2026-10-17 03:44:38.095823	0	\N
6fb0a9b2-1fa6-450e-8ea5-5c569f204b0f	9c92ec3c-9d9c-44e6-969b-33c5ec166004	55c445db-1350-4184-9dcc-d11837b2aeed	roles	SUCCESS	2026-10-17 03:44:38.106	pulled 0 rows	2026-10-17 03:44:38.117518	2026-10-17 03:44:38.117518	0	\N
bdb9d422-279b-4df6-8202-19cab7ad3a8b	cc02a6b7-4350-4e3a-bb43-2cf0f0ac5d78	cbd0be0c-61ad-47bc-804b-fad3e91f34ea	purchases	SUCCESS	2026-10-17 03:44:38.12	pulled 0 rows	2026-10-17 03:44:38.121593	2026-10-17 03:44:38.121593	0	\N
0e071b4f-a9c9-4ffe-8f48-b0fdcd2931f4	f3694b81-25d8-46de-ba53-54ee83f62629	7e67c8ec-f962-494b-a220-ac6d97ac5b04	notifications	SUCCESS	2026-10-17 03:44:38.164	pulled 0 rows	2026-10-17 03:44:38.165471	2026-10-17 03:44:38.165471	0	\N
542b8299-1755-4d62-af86-19232d23fb60	459a1810-eb99-4b6b-977f-1e25e0433801	d5578cf5-4ff8-451c-bd76-e6b5fc4b89eb	customers	SUCCESS	2026-10-17 03:45:19.203	pulled 0 rows	2026-10-17 03:45:19.204264	2026-10-17 03:45:19.204264	0	\N
ea614291-a8ac-4e74-b18c-e02c7703f9dc	11f99639-e7e1-438b-bb77-fd298c9455cc	b75fdcce-bd7c-45ff-86e7-3ddb01f9619f	inventories	SUCCESS	2026-10-17 03:45:19.742	pulled 4 rows	2026-10-17 03:45:19.747046	2026-10-17 03:45:19.747046	0	\N
6d2cb348-ddf7-4ef7-a96d-e60af5b59e9a	8b55c9fd-42db-4327-afc9-ff6353886d3b	a7723d67-fea6-4b46-a74b-e048a1e159e2	products	SUCCESS	2026-10-17 03:45:19.787	pulled 4 rows	2026-10-17 03:45:19.797555	2026-10-17 03:45:19.797555	0	\N
959dc33d-280e-4a62-a640-81743c016614	aa420698-88b5-4d05-afa5-7b7c3a4360ee	d6bb74f2-05f7-4362-bd57-4cbb8c24279e	expenses	SUCCESS	2026-10-17 03:45:20.106	pulled 0 rows	2026-10-17 03:45:20.128271	2026-10-17 03:45:20.128271	0	\N
4a436801-374c-4c47-9d81-b18885239c10	501b96ed-01a2-4d24-8cfd-a47789f485b9	c8b2be7a-8776-4b9e-8e01-df66e59f714e	categories	SUCCESS	2026-10-17 03:45:20.28	pulled 0 rows	2026-10-17 03:45:20.300029	2026-10-17 03:45:20.300029	0	\N
865889e1-87e2-4d7c-a6bd-e4414358f14d	3fc33150-32a2-44a8-9daf-a8264aac9e37	786ac24e-d17e-48d5-a3c3-88c4b6998dd8	units-of-measure	SUCCESS	2026-10-17 03:45:20.343	pulled 0 rows	2026-10-17 03:45:20.343987	2026-10-17 03:45:20.343987	0	\N
eeb13bad-a3e7-4279-ae5a-3afd66657513	4c66d168-9a7e-4b65-9720-3d58444239fb	a3532884-8b61-4c46-b9ce-8e242468cdf8	suppliers	SUCCESS	2026-10-17 03:45:20.491	pulled 0 rows	2026-10-17 03:45:20.502553	2026-10-17 03:45:20.502553	0	\N
ff9ec1da-905f-473d-b16c-45e1219fb3a6	f0f7b71c-0978-492e-885f-f7ef6002b7e6	9901e0d7-fadd-42ed-8172-8cb966e293e2	inventory-transfers	SUCCESS	2026-10-17 03:45:20.654	pulled 0 rows	2026-10-17 03:45:20.660679	2026-10-17 03:45:20.660679	0	\N
3d632b2b-5166-49e7-9117-98595cc9581f	03210421-bdb7-4636-b191-cffb1fe6605d	faa882d0-fc21-4bce-9490-00865b4554fb	branches	SUCCESS	2026-10-17 03:45:20.78	pulled 0 rows	2026-10-17 03:45:20.804891	2026-10-17 03:45:20.804891	0	\N
d92b55ae-5dac-4cf1-a1c3-892d51d02255	fc907961-4964-427a-8846-9314d8177291	f72a2479-9acc-4ad8-954e-3745504d4c60	product-batches	SUCCESS	2026-10-17 03:45:20.734	pulled 1 rows	2026-10-17 03:45:20.781779	2026-10-17 03:45:20.781779	0	\N
43814876-7425-46bf-b310-7cdfddd3a61a	176f5970-58fd-40e9-81ff-007dff3b2a62	104619a4-5f4a-4bd4-82e4-fda358001b23	sales	SUCCESS	2026-10-17 03:45:20.913	pulled 0 rows	2026-10-17 03:45:20.954261	2026-10-17 03:45:20.954261	0	\N
7fe41d13-e958-418d-b8cb-8b002943212b	f18d30b3-b333-4524-8599-6952e651f2e9	4aa5e7f8-aec1-4236-8a4b-77a1c1431949	purchases	SUCCESS	2026-10-17 03:45:20.95	pulled 0 rows	2026-10-17 03:45:20.991235	2026-10-17 03:45:20.991235	0	\N
a2c096b7-385a-4af1-9e73-420dac14697f	9db77c3b-31b9-4f31-aaf3-21b5d1cc5b7c	7ad8f44c-0f28-4bb5-b7f4-9c763b0f6d6e	users	SUCCESS	2026-10-17 03:45:20.995	pulled 0 rows	2026-10-17 03:45:20.998251	2026-10-17 03:45:20.998251	0	\N
f1d7cb02-b4d1-4b1a-9b83-724323fb6fb1	924f25ff-0ebc-4f10-87fd-8bde4ff62f41	d8c1e081-f959-4dce-b617-4ab28e5fe715	roles	SUCCESS	2026-10-17 03:45:21.161	pulled 0 rows	2026-10-17 03:45:21.178709	2026-10-17 03:45:21.178709	0	\N
68fb089c-fc5b-4ec4-8b5d-5dc90b35641d	e17c6478-40ff-43a0-807e-1bc47bafdb63	0b35ab38-6755-4787-9ef8-3675bb57f337	expenses	SUCCESS	2026-10-17 03:45:21.293	pulled 0 rows	2026-10-17 03:45:21.324108	2026-10-17 03:45:21.324108	0	\N
abdbdede-a78f-4488-8948-180f8674ecf8	941e1e9d-05c1-4b3c-bcd0-8d52a4dffcc4	17d880b0-47ef-48c0-9949-7f48b3e9df5a	products	SUCCESS	2026-10-17 03:45:21.342	pulled 4 rows	2026-10-17 03:45:21.354947	2026-10-17 03:45:21.354947	0	\N
6a477ffd-ba85-41d7-8c68-ab3d2ce70fa1	75e44c65-5097-4b7d-a5a2-32530613c334	1cabe9ad-92ad-40f0-b9ac-424405d68507	customers	SUCCESS	2026-10-17 03:45:21.359	pulled 0 rows	2026-10-17 03:45:21.360211	2026-10-17 03:45:21.360211	0	\N
f43d1d56-1639-4d1b-a330-8097765d5826	76ab0bb5-8ac2-4ed4-aa89-8ec2796d7ccb	b3fffa50-e3fb-453b-84e4-82f05d3dff94	notifications	SUCCESS	2026-10-17 03:45:21.61	pulled 0 rows	2026-10-17 03:45:21.625833	2026-10-17 03:45:21.625833	0	\N
565a1506-7ffd-4520-b977-7b498ccba6b1	747b7d8a-1dd4-4e74-8323-9577c307ddc6	1148378f-f89b-4ec6-b1d4-ea1a6e840d4b	branches	SUCCESS	2026-10-17 03:45:22.1	pulled 0 rows	2026-10-17 03:45:22.100486	2026-10-17 03:45:22.100486	0	\N
45add9cc-b0cb-471e-8f55-8657de5481a0	95f82b49-cd1a-4eb3-9641-dfdd3cda77a3	f2588ce9-129a-4315-9ecc-f6986969b714	inventories	SUCCESS	2026-10-17 03:45:21.468	pulled 4 rows	2026-10-17 03:45:21.469183	2026-10-17 03:45:21.469183	0	\N
49b0bb12-5d23-41f7-8f2f-dbb7c4f93613	70f08935-d514-4a84-b41a-4ce8236803eb	74a6f89e-ede7-4f4a-af1f-b036a64636e8	inventory-transfers	SUCCESS	2026-10-17 03:45:21.501	pulled 0 rows	2026-10-17 03:45:21.504059	2026-10-17 03:45:21.504059	0	\N
6e9d3e2a-9537-420a-a0d1-c1081e4e7a1a	cec89f8b-76e2-4c7a-9bd4-a168e0f504f6	6f9c4316-d120-4e90-ac8b-df1d9d54c921	sales	SUCCESS	2026-10-17 03:45:22.13	pulled 0 rows	2026-10-17 03:45:22.133723	2026-10-17 03:45:22.133723	0	\N
094e9f6f-24f8-4585-bae1-d8e0c27c8934	b2b26930-c228-4621-bc56-12d3379a1720	17e26115-e562-4392-b09d-19e6168a609a	product-batches	SUCCESS	2026-10-17 03:45:21.581	pulled 1 rows	2026-10-17 03:45:21.606789	2026-10-17 03:45:21.606789	0	\N
d414b112-1aab-49f3-ba57-f0c5485b7603	d2f3849d-5138-46ae-be93-0f7bce4a0edb	916bb2ea-73bc-431c-ba7d-dbf19def56b2	suppliers	SUCCESS	2026-10-17 03:45:22.113	pulled 0 rows	2026-10-17 03:45:22.114349	2026-10-17 03:45:22.114349	0	\N
48383390-9d9e-457c-8a21-b4353eb0b7f7	96876333-0e3a-4b48-9bef-244a39c62411	7473a984-9ded-4c36-ad4e-9d77202ffb09	users	SUCCESS	2026-10-17 03:45:22.163	pulled 0 rows	2026-10-17 03:45:22.164249	2026-10-17 03:45:22.164249	0	\N
92b82b7f-037e-4f16-9a67-56969eecc985	acc802cc-71d5-4b5c-9ff0-f61470c512ba	423da2a7-f51e-4134-80a7-8d3110e96215	roles	SUCCESS	2026-10-17 03:45:22.296	pulled 0 rows	2026-10-17 03:45:22.300168	2026-10-17 03:45:22.300168	0	\N
c80ad9d5-a7a7-44e8-bc98-0401e332f329	9a574af0-577c-4806-a90e-a5b4a33df5fb	9528e7a2-f0cc-406e-bab3-b5f7901c29da	notifications	SUCCESS	2026-10-17 03:45:22.525	pulled 0 rows	2026-10-17 03:45:22.525957	2026-10-17 03:45:22.525957	0	\N
861e572d-57cb-4b5b-a35a-b741e2039d03	0516a490-3f7c-4d46-a247-fed4fcf12000	b7b82483-312e-4f03-b6e0-76e5f8a567cc	categories	SUCCESS	2026-10-17 03:45:21.63	pulled 0 rows	2026-10-17 03:45:21.641583	2026-10-17 03:45:21.641583	0	\N
407610fa-ef06-4c57-9a13-25cff717d96e	4e102d4c-5a5d-4632-be34-2fb75985897b	464a7806-911a-4d63-b064-5e0d7904cd9c	units-of-measure	SUCCESS	2026-10-17 03:45:21.76	pulled 0 rows	2026-10-17 03:45:21.76187	2026-10-17 03:45:21.76187	0	\N
4ffa079a-d4f2-44cc-aadc-ff667deca7d8	bb154b78-f9d8-4eab-a3aa-efd056f01854	88cb8bda-7cf3-4542-8b26-8945e38a1505	purchases	SUCCESS	2026-10-17 03:45:22.102	pulled 0 rows	2026-10-17 03:45:22.102544	2026-10-17 03:45:22.102544	0	\N
4f6ba212-1c82-47f6-9d21-77e390c7bb36	835407d4-bf0f-4bcb-be14-f8d5443b987b	1dc0ffbc-b458-4f33-b1f3-24669024f233	products	SUCCESS	2026-10-17 03:45:37.606	pulled 4 rows	2026-10-17 03:45:37.678922	2026-10-17 03:45:37.678922	0	\N
b23f7a5e-61a1-4e30-bab7-1340924b6e11	bf13bfc3-27a6-454d-b035-c060c94c7d54	de5bb929-b5e8-4e39-8f3a-380c911be4e9	customers	SUCCESS	2026-10-17 03:45:37.837	pulled 0 rows	2026-10-17 03:45:37.884542	2026-10-17 03:45:37.884542	0	\N
71fe94ab-3a4d-4ac2-a7bd-b29afb46449c	0de7759b-dc98-43a6-82b8-59257950464d	1d481b29-66ad-4e30-b350-14bf3936b92a	expenses	SUCCESS	2026-10-17 03:45:37.91	pulled 0 rows	2026-10-17 03:45:37.942868	2026-10-17 03:45:37.942868	0	\N
333968a2-d9a3-4539-80af-f31c0fee5c4f	a76e9d70-722b-46b4-a1f1-337acf2e0cdb	3189877d-5d09-48dd-9548-75ba66b696ae	inventory-transfers	SUCCESS	2026-10-17 03:45:38.101	pulled 0 rows	2026-10-17 03:45:38.128858	2026-10-17 03:45:38.128858	0	\N
0b0d2fb0-4ec8-4a3f-81ae-dd3fb8613852	eab6b099-91f3-486e-a160-da87159a3e56	f0fb14a3-29cf-4b97-a1c8-e89b43cb24bc	inventories	SUCCESS	2026-10-17 03:45:38.583	pulled 4 rows	2026-10-17 03:45:38.583812	2026-10-17 03:45:38.583812	0	\N
32d5f1fa-02b3-4dfa-889b-13c187186e92	f6d292b5-b276-4439-85a4-c3e43900d9a8	e6d6ba4d-0aef-4919-9f1e-379e9807e9d1	categories	SUCCESS	2026-10-17 03:45:39.291	pulled 0 rows	2026-10-17 03:45:39.306732	2026-10-17 03:45:39.306732	0	\N
5df63120-8f34-43b7-b2e0-86fe16213e4c	cd62c272-cb66-4cc0-acb7-787aab9bcfba	e60d9edd-3ee5-49b1-af77-48ae2fd042b1	units-of-measure	SUCCESS	2026-10-17 03:45:39.322	pulled 0 rows	2026-10-17 03:45:39.322841	2026-10-17 03:45:39.322841	0	\N
62175600-2726-4ffc-bd1f-998d7249e721	3091962b-339c-4673-b48c-b22e83972d56	749f5dca-03b1-4a47-a586-a0c458faa8d8	suppliers	SUCCESS	2026-10-17 03:45:39.353	pulled 0 rows	2026-10-17 03:45:39.374268	2026-10-17 03:45:39.374268	0	\N
f5b4dcf5-d96f-49b6-bc9a-ac737068e9d0	cb3fb737-81f9-498d-9ed8-31e6a613c429	273ca2c5-8f53-4037-aa71-38e435609cb6	product-batches	SUCCESS	2026-10-17 03:45:39.43	pulled 1 rows	2026-10-17 03:45:39.444556	2026-10-17 03:45:39.444556	0	\N
6172f53e-b787-4712-9d4b-d7e33055158f	9068bb17-8fd4-4f7b-a3f7-b1424a3fee72	84e07bb2-a192-4d53-ae04-11234156101d	purchases	SUCCESS	2026-10-17 03:45:39.661	pulled 0 rows	2026-10-17 03:45:39.662134	2026-10-17 03:45:39.662134	0	\N
5fdf29fb-e681-40c3-bad8-8e7580a6c07e	1ae1a6e9-bdfb-40cc-b5fa-ade216c50dcc	ed9145bb-0688-4659-b999-7d2378b80a64	branches	SUCCESS	2026-10-17 03:45:39.709	pulled 0 rows	2026-10-17 03:45:39.712076	2026-10-17 03:45:39.712076	0	\N
6422ddd7-1d83-49a2-b8c2-6b552bc5e0df	19f3d4c3-209a-4782-a2a2-42df48c97a63	f5e6ddfe-ab48-4848-8b2c-ae81e45d0667	users	SUCCESS	2026-10-17 03:45:39.89	pulled 0 rows	2026-10-17 03:45:39.891117	2026-10-17 03:45:39.891117	0	\N
5ebccb25-80a4-40a9-a158-6a480a800d62	ffcfcd6a-7787-4bd2-a915-d25ea82e15aa	a14789a6-81a7-45d0-bed7-6af63c00848a	sales	SUCCESS	2026-10-17 03:45:39.906	pulled 0 rows	2026-10-17 03:45:39.946457	2026-10-17 03:45:39.946457	0	\N
febf53df-f51e-46a3-922d-d4e19d3370f6	3e208f7a-88c2-4aab-9a93-3843dbb4e97d	cac79761-ef68-4034-8230-23341aec1e6f	roles	SUCCESS	2026-10-17 03:45:40.113	pulled 0 rows	2026-10-17 03:45:40.127324	2026-10-17 03:45:40.127324	0	\N
29bdea73-a76a-4ab4-a333-84b14c58458b	3ccfaf18-1b6c-46a0-acba-1ca9f70794c1	2f2397c3-4cb7-4c6d-a051-1c9de9618a45	notifications	SUCCESS	2026-10-17 03:45:40.246	pulled 0 rows	2026-10-17 03:45:40.252474	2026-10-17 03:45:40.252474	0	\N
41aed788-c83a-40af-96b7-5627a950595c	2d1a243a-e11e-4c02-bd74-78b471a07049	f73122b6-f810-4575-a266-60bcb3d85116	customers	SUCCESS	2026-10-17 03:46:17.371	pulled 0 rows	2026-10-17 03:46:17.376824	2026-10-17 03:46:17.376824	0	\N
a408bfbd-c13c-4701-86c6-49042f079c63	c9d18f03-55f0-44d1-8762-408d160397c5	a463cad7-dece-432d-b90b-0e9fd99c615d	products	SUCCESS	2026-10-17 03:46:17.394	pulled 4 rows	2026-10-17 03:46:17.397594	2026-10-17 03:46:17.397594	0	\N
db0cd7f3-5340-4ef8-b9b3-8c0422f82b0a	d685cbfa-4bcf-481d-8306-75aefd83ce67	abed66dd-d29e-4e2b-8f5a-5030632b0538	inventories	SUCCESS	2026-10-17 03:46:17.402	pulled 4 rows	2026-10-17 03:46:17.404162	2026-10-17 03:46:17.404162	0	\N
33b9de53-e4d6-4d2f-8145-92beff24fbc6	f55dee93-9957-4257-b8ec-fe2c9cc03a3b	c9d64392-4ab2-4f54-915b-785c8a04216d	expenses	SUCCESS	2026-10-17 03:46:17.464	pulled 0 rows	2026-10-17 03:46:17.464991	2026-10-17 03:46:17.464991	0	\N
dcd82ac5-c4f4-41bb-ba30-328e949ddef5	6f39ec59-d37d-428d-ae84-db999beaa306	364a78d7-7401-4619-ae17-641d519c3a06	inventory-transfers	SUCCESS	2026-10-17 03:46:17.718	pulled 0 rows	2026-10-17 03:46:17.721758	2026-10-17 03:46:17.721758	0	\N
1e2c9770-97a6-4396-ac36-f80a4a38da63	105d93b1-a8d5-4152-9e71-04cf196d29af	bda3f70b-ab2e-4b56-88c5-fe90d4de3c76	product-batches	SUCCESS	2026-10-17 03:46:17.737	pulled 1 rows	2026-10-17 03:46:17.737994	2026-10-17 03:46:17.737994	0	\N
ec208297-e7a0-4bf0-a6f3-8caf0a669ef7	84525af4-f0a4-42f1-9298-86147cbc0296	7c4999b4-dfcd-4d76-9f3a-89f00082bf8d	categories	SUCCESS	2026-10-17 03:46:18.075	pulled 0 rows	2026-10-17 03:46:18.076094	2026-10-17 03:46:18.076094	0	\N
9cd264ba-0910-40cf-8ecf-873f00401141	6a6c0f2c-e18d-40f7-915d-0beb29fdccd4	1d229ddc-b2d9-4d4f-8167-f47cabecc8d0	units-of-measure	SUCCESS	2026-10-17 03:46:18.091	pulled 0 rows	2026-10-17 03:46:18.091768	2026-10-17 03:46:18.091768	0	\N
43bd420b-f5e6-4101-b649-ec55f52ff38b	4279f092-4a3a-43dd-ad5f-58bcada9d565	ca8ff56a-d3fc-49de-ae38-b0bfc929c05f	suppliers	SUCCESS	2026-10-17 03:46:18.162	pulled 0 rows	2026-10-17 03:46:18.163395	2026-10-17 03:46:18.163395	0	\N
90451c09-d2b4-4ee9-a1f7-e870a728d175	8b579d2b-6e74-4b0a-b46f-20c4f5bf50f2	6cc73f46-52d1-41b6-ae92-760dcdb75330	purchases	SUCCESS	2026-10-17 03:46:18.209	pulled 0 rows	2026-10-17 03:46:18.210448	2026-10-17 03:46:18.210448	0	\N
8d326e7e-ca4c-4ecc-a53c-b53b5b4e49b6	45175d04-c7e9-4842-9c14-342dae1fd0dc	0ea77534-58b2-42b6-8f03-a69b78722eff	branches	SUCCESS	2026-10-17 03:46:18.49	pulled 0 rows	2026-10-17 03:46:18.490964	2026-10-17 03:46:18.490964	0	\N
c405dbbb-b726-405e-b631-5dc4965bf07e	01690ff8-1b9d-4916-abdb-3c19f123977e	2aeb7f65-b6b8-4d18-bb8e-75f25969d4d1	sales	SUCCESS	2026-10-17 03:46:18.512	pulled 0 rows	2026-10-17 03:46:18.512436	2026-10-17 03:46:18.512436	0	\N
fbf6bb18-88f3-4786-baf2-0142a8893ad7	ca6d3698-9a30-48a0-a9e5-0a3a77cb2a08	0cef005d-0fca-4298-afdc-78e589240c8d	users	SUCCESS	2026-10-17 03:46:18.513	pulled 0 rows	2026-10-17 03:46:18.513561	2026-10-17 03:46:18.513561	0	\N
1e4fbc7e-3d6e-43c8-80cd-9460fc22e4db	1b9f05b0-4a58-4ce2-a7d9-d13186cb5bbd	be5cc062-2716-494e-bb16-c9e867e674a7	customers	SUCCESS	2026-10-17 03:46:18.538	pulled 0 rows	2026-10-17 03:46:18.53901	2026-10-17 03:46:18.53901	0	\N
aabfe4fa-211c-4fa2-8dcb-cece932c040b	e573c030-a63c-49d5-8e2a-73d9a21413fa	6cecace3-f0f8-4454-bec6-a177efbeffbf	products	SUCCESS	2026-10-17 03:46:18.541	pulled 4 rows	2026-10-17 03:46:18.542095	2026-10-17 03:46:18.542095	0	\N
e6099244-97b3-4fc3-bcf8-18987fad39bb	0efc779d-0500-4cfa-bf94-9db4c29d6f22	755a3ef4-1070-4bfe-871a-b191060fb473	roles	SUCCESS	2026-10-17 03:46:18.801	pulled 0 rows	2026-10-17 03:46:18.804056	2026-10-17 03:46:18.804056	0	\N
21cb75ec-b89d-4252-90f6-5a7e37726ef1	c87160b3-05cf-4c9d-a982-c3d1ca1819d6	31103b91-cb98-4912-af31-7ac4e814f1e3	expenses	SUCCESS	2026-10-17 03:46:18.823	pulled 0 rows	2026-10-17 03:46:18.82428	2026-10-17 03:46:18.82428	0	\N
3d2e10e5-8974-46b2-ac72-4369e3f06cbe	5f239ce1-caf9-47a1-ae12-befc1531d624	62b63a05-c523-4b30-be2f-ec2b0a650619	inventories	SUCCESS	2026-10-17 03:46:18.811	pulled 4 rows	2026-10-17 03:46:18.824682	2026-10-17 03:46:18.824682	0	\N
91075a82-406b-4680-8621-f0ace8362784	297e26d8-2f02-429d-aacf-841c8b824cb2	923a49b9-99a5-4b3b-90d5-1480c4c3d96c	inventory-transfers	SUCCESS	2026-10-17 03:46:18.826	pulled 0 rows	2026-10-17 03:46:18.838218	2026-10-17 03:46:18.838218	0	\N
2b654ac3-4602-4e86-83c1-de463b4f1ae4	70f6b764-7cec-4e9f-9bb6-6311631cb61e	1088be00-c9cf-418b-b19b-9774f9504540	product-batches	SUCCESS	2026-10-17 03:46:18.889	pulled 1 rows	2026-10-17 03:46:18.889808	2026-10-17 03:46:18.889808	0	\N
eec31c83-d690-4415-8c29-cdda8fdd9d45	406228c9-2f46-4e73-8b78-45a2ff77a087	6cb099d5-60aa-4b82-9689-26b2a2730f80	notifications	SUCCESS	2026-10-17 03:46:18.922	pulled 0 rows	2026-10-17 03:46:18.923318	2026-10-17 03:46:18.923318	0	\N
f4035548-5bb9-4627-9126-a6f2fa43fed6	247aeea1-43f6-4479-b08b-a7ce7b01c289	5a0dd97a-7ff4-4899-959c-55faf4e9b63d	categories	SUCCESS	2026-10-17 03:46:19.01	pulled 0 rows	2026-10-17 03:46:19.010708	2026-10-17 03:46:19.010708	0	\N
8ba53b5e-7fae-4f68-a521-3e207e43ac17	aa43078b-3610-4ca0-9346-afed23eb9848	a7722929-c26f-4b25-8f63-f2eb7067ebf8	suppliers	SUCCESS	2026-10-17 03:46:19.191	pulled 0 rows	2026-10-17 03:46:19.192198	2026-10-17 03:46:19.192198	0	\N
f24aa4bb-3d25-41b7-8210-beec8dc7e66b	a82d5f04-0fa7-4fa8-8e73-5d27ae8eee24	2c2e5792-b080-4039-a48a-a9c54d240bbd	purchases	SUCCESS	2026-10-17 03:46:19.193	pulled 0 rows	2026-10-17 03:46:19.193763	2026-10-17 03:46:19.193763	0	\N
f476a7eb-60c0-4a5b-be15-f31eeb7ba8fa	bfec118e-8904-415f-b0ae-bbc0eb9a2201	494ef1a9-4ecd-471f-a66c-08bcef6583ba	branches	SUCCESS	2026-10-17 03:46:19.216	pulled 0 rows	2026-10-17 03:46:19.225121	2026-10-17 03:46:19.225121	0	\N
9152f270-bf34-404f-875c-140b7d592152	54ba970d-9d17-449c-a396-4b66820edaf6	7c14485d-0b3e-48bb-b93c-aa9e94ff457d	units-of-measure	SUCCESS	2026-10-17 03:46:19.241	pulled 0 rows	2026-10-17 03:46:19.243195	2026-10-17 03:46:19.243195	0	\N
bd048be8-361f-486a-91a5-d67bda4609ae	f3673d4b-e410-4a88-af69-561f003c101f	9b58a576-efeb-4c20-a175-a47422d332c4	sales	SUCCESS	2026-10-17 03:46:19.273	pulled 0 rows	2026-10-17 03:46:19.273996	2026-10-17 03:46:19.273996	0	\N
c2a19139-d242-40fb-990f-2b31cee8864d	6f53d79e-5919-4682-aeb4-f744c8c9796f	22189277-208a-4a22-a1aa-f2f7ecbb427f	roles	SUCCESS	2026-10-17 03:46:19.568	pulled 0 rows	2026-10-17 03:46:19.569773	2026-10-17 03:46:19.569773	0	\N
7892e595-2bf6-40f6-8a6c-b04fcd9a2ef2	0b23ba07-faf9-41a4-8e88-365e75da5241	4021c1db-295b-4ce0-8abd-3b71952212c5	notifications	SUCCESS	2026-10-17 03:46:19.656	pulled 0 rows	2026-10-17 03:46:19.656698	2026-10-17 03:46:19.656698	0	\N
d10535ba-3e47-4fee-86e7-298477552f4e	60851488-41c5-48dd-aa47-8f797c8f7d3b	5c8eb154-30a8-4f8b-b3df-4cde987e0c35	users	SUCCESS	2026-10-17 03:46:19.675	pulled 0 rows	2026-10-17 03:46:19.676161	2026-10-17 03:46:19.676161	0	\N
bf0d4d27-fa96-4632-93f1-a492974a98d1	443e91ef-a3b4-421e-bba1-5b69df0796d0	b8c4f7c6-c6ca-4e10-9a45-a12fede1503a	inventories	SUCCESS	2026-10-17 03:47:10.591	pulled 4 rows	2026-10-17 03:47:10.59154	2026-10-17 03:47:10.59154	0	\N
795f7ef6-c883-4e8e-a1a2-114f253288be	946e98f9-0e4b-4966-852f-d43359f7d1db	5a148162-ac90-4089-9b67-1e0c0c45d25e	products	SUCCESS	2026-10-17 03:47:10.599	pulled 4 rows	2026-10-17 03:47:10.600089	2026-10-17 03:47:10.600089	0	\N
db58e87b-47f0-4034-a248-2ae2c4d00f8a	3f5d6862-ef9e-4f4b-a965-bf7cebd08a88	78462ccd-4408-47fa-8508-e3489b07545e	customers	SUCCESS	2026-10-17 03:47:10.607	pulled 0 rows	2026-10-17 03:47:10.60813	2026-10-17 03:47:10.60813	0	\N
3d7fccce-fbd8-4c7d-a2e8-363849b7bbe4	e4cce36b-6bbf-4142-8d55-75b9b32c66bb	4b06cae8-9d8c-4b03-888a-068dbac1c85d	expenses	SUCCESS	2026-10-17 03:47:10.64	pulled 0 rows	2026-10-17 03:47:10.641321	2026-10-17 03:47:10.641321	0	\N
67cd1a32-77b6-4211-b332-210a47bc6983	449d8c28-2794-48a4-8e1e-9db463d60e2c	7f584130-81e9-4e1e-9ad8-3a3a89fe191a	inventory-transfers	SUCCESS	2026-10-17 03:47:10.667	pulled 0 rows	2026-10-17 03:47:10.668214	2026-10-17 03:47:10.668214	0	\N
36cd1a64-ccee-4409-8d12-7de90fc45e8d	fd8cb013-ad03-4a7d-b16e-6fe6f212261e	4a2d1e11-757c-4c80-8e90-32c4b8560e5a	product-batches	SUCCESS	2026-10-17 03:47:10.85	pulled 1 rows	2026-10-17 03:47:10.852719	2026-10-17 03:47:10.852719	0	\N
56e4bdaa-7244-430e-b03f-e24b6614c0b2	c2ceffb4-6971-4bc6-931e-cdfecb06af6c	258b72e9-6026-44e6-a56d-997d8c713b95	suppliers	SUCCESS	2026-10-17 03:47:11.2	pulled 0 rows	2026-10-17 03:47:11.200885	2026-10-17 03:47:11.200885	0	\N
7132e131-0cb8-4065-b92a-00577870f833	c07397b7-9717-4644-87aa-289296c0da77	0cddc91d-3509-4e3f-a708-a16a86dbac38	units-of-measure	SUCCESS	2026-10-17 03:47:11.217	pulled 0 rows	2026-10-17 03:47:11.218058	2026-10-17 03:47:11.218058	0	\N
b3de4d91-26b6-4171-81a6-37109373e640	08bf25a7-0c54-4254-adef-546927a42fa1	92b3d14c-2f49-403e-9a05-80ed1e8aeca1	categories	SUCCESS	2026-10-17 03:47:11.218	pulled 0 rows	2026-10-17 03:47:11.219035	2026-10-17 03:47:11.219035	0	\N
a0c195b1-243a-41fe-9670-2412ba6554ee	68084dde-5640-4dfd-941b-29f184ddddb8	c0617fd0-7cf2-45a5-86d0-102015db2db1	branches	SUCCESS	2026-10-17 03:47:11.257	pulled 0 rows	2026-10-17 03:47:11.257462	2026-10-17 03:47:11.257462	0	\N
0fb94aa3-6b02-4519-b526-6e57d687e6f5	57057331-2a04-451f-a6fd-e5e7a297d5ff	78fcd461-ba48-4dbe-b8a7-16b3618676fb	purchases	SUCCESS	2026-10-17 03:47:11.287	pulled 0 rows	2026-10-17 03:47:11.287336	2026-10-17 03:47:11.287336	0	\N
dec93756-133a-4f44-a427-297cff3168ca	28aa7931-bd36-44db-a099-729b3012f896	bb880ac9-4c58-4f90-8f78-a6a36731c9a4	sales	SUCCESS	2026-10-17 03:47:11.305	pulled 0 rows	2026-10-17 03:47:11.305497	2026-10-17 03:47:11.305497	0	\N
e40b379a-fd51-4871-9347-4a299dce7072	aa477d39-cec4-43ab-a987-5638a3e6e997	3168ffe2-ab79-4764-87ba-51ee237ba816	users	SUCCESS	2026-10-17 03:47:11.405	pulled 0 rows	2026-10-17 03:47:11.405937	2026-10-17 03:47:11.405937	0	\N
06c85898-9c02-4750-89b4-f6e4cfb255bb	889680d6-1682-49ee-83e7-a50c8f02e71b	c2135759-80d2-47a6-aca5-8814635dae00	roles	SUCCESS	2026-10-17 03:47:11.414	pulled 0 rows	2026-10-17 03:47:11.415271	2026-10-17 03:47:11.415271	0	\N
ebba8334-6a36-4ebc-a14c-f70f33e16849	09040274-684b-418a-aaef-ba1f1e016b90	1e2c0cce-2ee2-4d4e-a207-1e4a29ef0c4d	notifications	SUCCESS	2026-10-17 03:47:11.449	pulled 0 rows	2026-10-17 03:47:11.450288	2026-10-17 03:47:11.450288	0	\N
5750d968-f047-447a-bd78-3a952b20caf9	9e138699-de04-481f-90de-d163e6ad07df	0aa18f39-55a3-4258-99b1-5cca0aa79011	products	SUCCESS	2026-10-17 03:47:32.677	pulled 4 rows	2026-10-17 03:47:32.677677	2026-10-17 03:47:32.677677	0	\N
1f7a21be-2f88-41e2-a3e1-c723c9ac2f88	2fab7de6-e0f0-4de9-aa4b-07fd1952d85d	b09ba321-2a4c-4b68-94bb-0c3ebfa8a3ea	expenses	SUCCESS	2026-10-17 03:47:32.701	pulled 0 rows	2026-10-17 03:47:32.703469	2026-10-17 03:47:32.703469	0	\N
b89d0b25-69d5-4c49-a4f8-3bbb30a93f58	7d69297d-cf5b-4d07-81aa-ca1dbcd6230b	3510d243-0f18-4dec-85cb-900b65374410	customers	SUCCESS	2026-10-17 03:47:32.712	pulled 0 rows	2026-10-17 03:47:32.7145	2026-10-17 03:47:32.7145	0	\N
8f374f20-5354-43cb-8e3a-2da8b4ae24bb	88a3cde0-cb1c-4f6f-aaa0-4c7f9516a36e	7feeb736-825f-49f2-a31a-8c9465169b51	inventories	SUCCESS	2026-10-17 03:47:33.053	pulled 4 rows	2026-10-17 03:47:33.053415	2026-10-17 03:47:33.053415	0	\N
8253a8d7-ede4-47e1-ba56-79e9d4060bea	d51095c5-73dc-4327-9474-81304bd3e4c4	4400ca58-06a4-406d-9d12-8e0676c4163f	inventory-transfers	SUCCESS	2026-10-17 03:47:33.055	pulled 0 rows	2026-10-17 03:47:33.057212	2026-10-17 03:47:33.057212	0	\N
e9d399a8-03f6-426f-8bf7-5fbc7f1e8e40	f1df2c37-92ec-4974-95fc-02ef324ff4eb	6a8154b2-41c7-4c05-9b1c-7093f4f70dbf	product-batches	SUCCESS	2026-10-17 03:47:33.064	pulled 1 rows	2026-10-17 03:47:33.065281	2026-10-17 03:47:33.065281	0	\N
21b5723f-d8da-4762-b891-8ee0eb4801e1	2b73a9fc-cb36-4237-b3d8-70e5038441f7	6c108876-094a-4422-b27b-9cae31eb063a	purchases	SUCCESS	2026-10-17 03:47:33.532	pulled 0 rows	2026-10-17 03:47:33.532813	2026-10-17 03:47:33.532813	0	\N
028dffd3-5a1a-4021-b099-3f0d421a7062	6aba6de0-9a05-4003-baf7-cc7bbb95cfbf	f3791ee1-d99e-4ce8-9b94-050f57b6ae40	units-of-measure	SUCCESS	2026-10-17 03:47:33.528	pulled 0 rows	2026-10-17 03:47:33.531903	2026-10-17 03:47:33.531903	0	\N
b63cb378-6ce5-4d75-823c-2ef0950c333e	07bd51ec-9b51-4a02-9e7c-00efdfc343fa	eef0d44b-a68f-4521-a967-343d74f7f973	categories	SUCCESS	2026-10-17 03:47:33.533	pulled 0 rows	2026-10-17 03:47:33.53443	2026-10-17 03:47:33.53443	0	\N
dfcb42b5-2a4e-4f9e-9d77-c97dc188bef5	95fb8ec9-871f-42eb-b38d-aabbdea8848f	3988ce53-c97a-4e1a-b726-d2a3e29d5b02	branches	SUCCESS	2026-10-17 03:47:33.718	pulled 0 rows	2026-10-17 03:47:33.722339	2026-10-17 03:47:33.722339	0	\N
706aa4ae-95c9-42f5-9e68-ffee7f63ff66	56c25681-5a42-4b5a-b068-7ffa20b4a2b1	092757a5-60ac-4afb-87a7-4ff513fe304c	sales	SUCCESS	2026-10-17 03:47:33.719	pulled 0 rows	2026-10-17 03:47:33.735656	2026-10-17 03:47:33.735656	0	\N
e74c191e-7081-4630-b7b1-85eee2d17707	6b1707e8-6373-453f-abb1-7d3e90043ed6	2a292449-2131-45c5-a106-dd5659f4018a	users	SUCCESS	2026-10-17 03:47:33.758	pulled 0 rows	2026-10-17 03:47:33.759177	2026-10-17 03:47:33.759177	0	\N
d4b16147-ca33-4d42-a886-c57ef73b7942	673305da-95cc-4351-a1c9-64b7e58957ae	b55e51f8-d242-44e5-a35c-4140e4375c2d	customers	SUCCESS	2026-10-17 03:47:33.877	pulled 0 rows	2026-10-17 03:47:33.877637	2026-10-17 03:47:33.877637	0	\N
768df35c-e4f9-4479-8b03-8571258bff5e	5977349c-1082-4357-9a03-357a0d90012f	61640749-1257-46fc-810b-97e84b401e6b	suppliers	SUCCESS	2026-10-17 03:47:33.877	pulled 0 rows	2026-10-17 03:47:33.878251	2026-10-17 03:47:33.878251	0	\N
20610dda-d639-42b1-8d90-8deb227eb8ee	75576659-5f32-4f72-95c7-7dece273d1b3	fe6d9907-9700-468d-8945-3130b76d4928	roles	SUCCESS	2026-10-17 03:47:33.878	pulled 0 rows	2026-10-17 03:47:33.879085	2026-10-17 03:47:33.879085	0	\N
c371004e-0691-4323-8a08-d91934bb7c0f	9b8fb997-42ff-4013-92d5-d669ea061292	567081f3-31b5-4055-bcef-c23cd1fe7cb1	inventories	SUCCESS	2026-10-17 03:47:34.194	pulled 4 rows	2026-10-17 03:47:34.198603	2026-10-17 03:47:34.198603	0	\N
11185d30-b9e8-46e2-90ac-e95d40492672	c2243787-e023-4bc3-993e-17ee4352a69b	1ce7f232-3e9b-4290-8c05-c73bee680412	inventory-transfers	SUCCESS	2026-10-17 03:47:34.244	pulled 0 rows	2026-10-17 03:47:34.244578	2026-10-17 03:47:34.244578	0	\N
5ed712d7-278a-44a7-9288-e7e0ad7c6c76	a88e38f5-fc91-438f-a505-ca19d1e53e6b	f2ee7582-6785-4ff7-9175-30c86529876f	expenses	SUCCESS	2026-10-17 03:47:34.263	pulled 0 rows	2026-10-17 03:47:34.263848	2026-10-17 03:47:34.263848	0	\N
f1885d52-7a1e-4d81-a746-b241b739106d	e2d1df7f-2917-40e9-85c4-ef473db50aca	3bd4542b-987c-46fd-a8d1-b4add68a9dde	product-batches	SUCCESS	2026-10-17 03:47:34.322	pulled 1 rows	2026-10-17 03:47:34.322464	2026-10-17 03:47:34.322464	0	\N
614b3dbe-8714-4056-a5b8-94fb2acc3c5a	43558985-60a7-44d8-8def-abfbf424b023	7cba2ff7-d1e4-42b8-8950-86f3a4af8910	products	SUCCESS	2026-10-17 03:47:34.326	pulled 4 rows	2026-10-17 03:47:34.327127	2026-10-17 03:47:34.327127	0	\N
bf8701da-1e46-4d9a-963d-445eff515856	2228e3fa-389e-4bbd-916d-e721892eb5fa	56ef6ff7-9894-456c-a809-63b9f6625e42	suppliers	SUCCESS	2026-10-17 03:47:34.518	pulled 0 rows	2026-10-17 03:47:34.51892	2026-10-17 03:47:34.51892	0	\N
48050123-25eb-4015-928a-1a6315b04884	ffb5f72c-e1d7-42c6-871a-de11d9572a93	88626eaa-a564-45fb-98b7-86b10885d618	notifications	SUCCESS	2026-10-17 03:47:34.519	pulled 0 rows	2026-10-17 03:47:34.520503	2026-10-17 03:47:34.520503	0	\N
de404b1b-89e4-4c79-a8e9-e2bc9c93db47	f35dc27f-e1e7-4889-8824-5661f673c7b0	0f3355a3-8828-455b-84f2-cb2bc2ed9567	branches	SUCCESS	2026-10-17 03:47:34.528	pulled 0 rows	2026-10-17 03:47:34.52915	2026-10-17 03:47:34.52915	0	\N
39c98ce8-b21c-4fef-b224-19f269115e59	10cf086e-3d2a-4aef-b927-17fbfcf8b4b1	067f2e5e-2aba-47e6-b964-f19389b0ce51	users	SUCCESS	2026-10-17 03:47:35.15	pulled 0 rows	2026-10-17 03:47:35.150949	2026-10-17 03:47:35.150949	0	\N
e0cd08ce-eecb-4455-aafc-77461e3704b9	a0e09cdf-2911-42d8-9ea1-ed7e59b10dde	6929edc4-49fa-42dd-bb89-24be6d75af63	sales	SUCCESS	2026-10-17 03:47:35.327	pulled 0 rows	2026-10-17 03:47:35.32886	2026-10-17 03:47:35.32886	0	\N
da63cf61-4203-4910-b598-7066585d1319	76c28002-fdf6-48e7-a806-a5ca9aaf42ea	faebc8dd-ff5e-43e1-9bb6-decb59b01ff7	products	SUCCESS	2026-10-17 03:47:41.195	pulled 4 rows	2026-10-17 03:47:41.197411	2026-10-17 03:47:41.197411	0	\N
11391e23-3cb4-4e96-a6a2-97c2b85fb791	5e750db1-4316-4257-af53-9546e7818549	ba69a182-d2f2-4d71-9f4c-806d37999431	suppliers	SUCCESS	2026-10-17 03:47:42.38	pulled 0 rows	2026-10-17 03:47:42.381057	2026-10-17 03:47:42.381057	0	\N
992e4926-45cd-4f4e-84f5-e711d4172fe4	4dbe6f5d-5a0f-4703-9b0c-c68536b34566	7eb203dc-43ba-4d6d-95a6-971584a2bb64	customers	SUCCESS	2026-10-17 03:47:42.714	pulled 0 rows	2026-10-17 03:47:42.714525	2026-10-17 03:47:42.714525	0	\N
b8f2fa0c-50a1-4265-bb53-de9efd9f171d	343cfb3e-e3f3-4cf6-a403-d130503ff8b3	7405f7cc-486f-41f7-9d42-8ebbd48fd221	units-of-measure	SUCCESS	2026-10-17 03:47:43.009	pulled 0 rows	2026-10-17 03:47:43.009798	2026-10-17 03:47:43.009798	0	\N
6319129c-8967-4ea2-8648-2bb703fb32ec	65002280-02e6-4a17-b782-148d83df2d19	cb487cc6-0ca8-4c76-9409-bb14547d6fcc	branches	SUCCESS	2026-10-17 03:47:43.288	pulled 0 rows	2026-10-17 03:47:43.289431	2026-10-17 03:47:43.289431	0	\N
7904f0bf-910a-4464-b4d0-29d2b04fbf19	b9ef36de-45b8-43c9-9dd7-aa563e6d72c1	5381a8fb-b113-46c9-97f7-018a951ae98c	suppliers	SUCCESS	2026-10-17 03:47:43.377	pulled 0 rows	2026-10-17 03:47:43.378044	2026-10-17 03:47:43.378044	0	\N
fca94f27-fbbe-434d-9129-dbc6a0c2d080	40e53454-c88e-4dda-8469-0dba824b0aa8	20d00812-2df0-4555-b10b-682be98712bd	notifications	SUCCESS	2026-10-17 03:47:43.582	pulled 0 rows	2026-10-17 03:47:43.587948	2026-10-17 03:47:43.587948	0	\N
fc3a6c68-921f-4343-9a3e-7c88d86561e3	2290bde7-255d-48d0-9968-cb12018dac98	ac4ab4b7-6b2c-4cbb-be93-7ea27283d942	units-of-measure	SUCCESS	2026-10-17 03:47:34.554	pulled 0 rows	2026-10-17 03:47:34.554903	2026-10-17 03:47:34.554903	0	\N
3fea8257-8122-4ccd-a978-6d5a386f355d	4c000063-0b35-4047-8ca1-3c8da2856a86	c6f963c9-16a6-4c57-8bf9-28f1d29eeb9d	purchases	SUCCESS	2026-10-17 03:47:34.818	pulled 0 rows	2026-10-17 03:47:34.819091	2026-10-17 03:47:34.819091	0	\N
dc00214b-412c-4264-a52a-09b27c077753	6f23f580-e224-4873-92d6-3e06114cdfe2	d3d5ef33-8f9b-4585-ad92-bffdd946df9e	roles	SUCCESS	2026-10-17 03:47:35.13	pulled 0 rows	2026-10-17 03:47:35.13307	2026-10-17 03:47:35.13307	0	\N
0bea3b66-8c2f-40e6-a44a-a30bda04ee38	70cfd83a-4c4b-45ef-a284-08b7302538ab	32d4d9fa-5153-4e0f-b6a8-82c7ff49039b	customers	SUCCESS	2026-10-17 03:47:41.21	pulled 0 rows	2026-10-17 03:47:41.212962	2026-10-17 03:47:41.212962	0	\N
6f062b38-b1b3-47b4-a894-f36a319f1bff	d9efc706-6de2-417c-8026-95e6f2cff9f5	ea7e4c9d-dabb-49bb-90e6-9ef523cd8056	inventories	SUCCESS	2026-10-17 03:47:41.451	pulled 4 rows	2026-10-17 03:47:41.454316	2026-10-17 03:47:41.454316	0	\N
a85f22bc-be49-44d7-8a73-eb64374cd447	e803e53f-bb24-41f7-aea0-7455053802f4	1c0f978b-3c04-4fd3-a8a5-33e0469c14e8	product-batches	SUCCESS	2026-10-17 03:47:41.615	pulled 1 rows	2026-10-17 03:47:41.616257	2026-10-17 03:47:41.616257	0	\N
a5846ad4-1474-4f05-8afa-edce3ea0f48f	a16eb6d1-1be7-4775-9e97-6ae7411358ef	acfddcd9-f352-4012-9663-032ae2be88c0	categories	SUCCESS	2026-10-17 03:47:42.048	pulled 0 rows	2026-10-17 03:47:42.050192	2026-10-17 03:47:42.050192	0	\N
85c67f07-faa1-49da-8680-d41cba214e20	ab69dd91-dc0b-496e-8409-d2053fdfe604	8419e091-71f1-4e70-87fa-1718a8bf42ca	purchases	SUCCESS	2026-10-17 03:47:42.381	pulled 0 rows	2026-10-17 03:47:42.381776	2026-10-17 03:47:42.381776	0	\N
2e9fdcc5-1fdf-4f25-93e5-b82ece36ff58	6fafd1b7-ec29-4069-b01e-c01845140f3d	eee12929-c443-45ca-a135-9bcb82b1ca1f	inventories	SUCCESS	2026-10-17 03:47:42.713	pulled 4 rows	2026-10-17 03:47:42.713516	2026-10-17 03:47:42.713516	0	\N
d5581baa-d71a-4062-992f-35cb3d0be21e	d1bf055b-241c-410b-bb4a-2dacb9b75eaa	8c6d9797-75ce-45e8-8c4f-f3e82069f9b4	product-batches	SUCCESS	2026-10-17 03:47:42.843	pulled 1 rows	2026-10-17 03:47:42.850099	2026-10-17 03:47:42.850099	0	\N
6eea793d-d6e7-41a5-95dd-4e317de53531	60a1a228-f12b-4475-b267-ca978868014a	a91b445e-88cf-4278-8d78-37aa003fc420	notifications	SUCCESS	2026-10-17 03:47:42.93	pulled 0 rows	2026-10-17 03:47:42.933105	2026-10-17 03:47:42.933105	0	\N
d892e9d0-4734-4219-b042-355199615c13	4293679f-0726-478d-8b81-6e11b023f48b	1ded2fba-39e0-4edc-acf2-96e35109938a	categories	SUCCESS	2026-10-17 03:47:42.999	pulled 0 rows	2026-10-17 03:47:42.999561	2026-10-17 03:47:42.999561	0	\N
9aa73175-c56a-4791-b6f5-210ddff39650	2caa2ada-d9d6-4235-b116-2bfb0d020616	c59f02fb-a672-4f37-a81d-aba9ad63ec17	sales	SUCCESS	2026-10-17 03:47:43.38	pulled 0 rows	2026-10-17 03:47:43.380845	2026-10-17 03:47:43.380845	0	\N
89f5961d-f5c0-4f64-b6dd-193207edb16b	5b7abecd-12d0-4385-8ee7-37d5313e02d0	3af7b34b-489a-4f4d-b0ea-cbce9869c615	roles	SUCCESS	2026-10-17 03:47:43.556	pulled 0 rows	2026-10-17 03:47:43.55768	2026-10-17 03:47:43.55768	0	\N
0a9f75d7-4fb6-4408-9ae7-d7a59c08be19	86b2bed5-a156-41a5-b7d9-312de0337b6d	92d28669-dac9-40d0-bfd2-7a043277ca0b	categories	SUCCESS	2026-10-17 03:47:34.555	pulled 0 rows	2026-10-17 03:47:34.556182	2026-10-17 03:47:34.556182	0	\N
90ebb7bb-b274-4c4f-b8a6-a0c6754feef1	db194f4f-5253-495a-b50a-dc81fffc0bd9	dd40d5e9-83bc-4b6d-a3d4-081c919664b2	sales	SUCCESS	2026-10-17 03:47:42.409	pulled 0 rows	2026-10-17 03:47:42.410213	2026-10-17 03:47:42.410213	0	\N
66aa83a2-0811-4f71-9dec-2e9bf5fd214d	c6c06720-bfa8-4406-ade7-db1abd6a635a	7910d646-4df1-4d53-a17e-b4461e498cfc	purchases	SUCCESS	2026-10-17 03:47:43.392	pulled 0 rows	2026-10-17 03:47:43.393224	2026-10-17 03:47:43.393224	0	\N
1786be72-0553-4bbf-868d-5c9a43ffea4b	3caee168-a412-435f-b87b-88a0af123a06	719f08a2-955b-4511-abb8-027a6e0fafe3	users	SUCCESS	2026-10-17 03:47:43.558	pulled 0 rows	2026-10-17 03:47:43.558921	2026-10-17 03:47:43.558921	0	\N
53bf3173-611d-4cee-a153-6cd354f7a0a6	b71cad67-cc4f-4811-ac60-7d5b9bd0ab1e	1f2555b5-3224-427d-9c6f-65e9a78deffd	notifications	SUCCESS	2026-10-17 03:47:35.334	pulled 0 rows	2026-10-17 03:47:35.33559	2026-10-17 03:47:35.33559	0	\N
3b1c3a75-ebd6-4251-a21d-e0201d6743e1	c5aeb3d0-980b-4f3e-b4d3-7db98525eb10	b4a3ef31-38c4-432b-aea2-5ceda2204d8b	expenses	SUCCESS	2026-10-17 03:47:41.198	pulled 0 rows	2026-10-17 03:47:41.202195	2026-10-17 03:47:41.202195	0	\N
9aeda9df-9f90-40c5-9fd3-a6dc06a2c99f	3c593986-d107-46a2-9621-061d363af36f	02b6dae8-b535-45bc-87d9-56425b2bdff5	inventory-transfers	SUCCESS	2026-10-17 03:47:41.619	pulled 0 rows	2026-10-17 03:47:41.620511	2026-10-17 03:47:41.620511	0	\N
ef026e15-8f59-42e2-826b-5597d48012ac	e2578947-3b57-4f97-a04b-db707e7eb96e	347d7737-7bc5-4955-931b-b66e7e2ce2ea	units-of-measure	SUCCESS	2026-10-17 03:47:42.051	pulled 0 rows	2026-10-17 03:47:42.05209	2026-10-17 03:47:42.05209	0	\N
3971aa1d-b046-47d8-9965-b9f482bcf90f	6fc78c35-90ec-4dcb-9bed-7ca16f5cf775	1393feef-e840-4f74-9a4c-7df9e77fcd8b	branches	SUCCESS	2026-10-17 03:47:42.379	pulled 0 rows	2026-10-17 03:47:42.380303	2026-10-17 03:47:42.380303	0	\N
b091da90-b826-4d7c-8a08-7971242621a2	43597195-1bf3-46c8-b013-0ab17a9835e0	04d0cebe-9090-425b-be50-cd33904c0b7d	roles	SUCCESS	2026-10-17 03:47:42.407	pulled 0 rows	2026-10-17 03:47:42.409092	2026-10-17 03:47:42.409092	0	\N
b4e867e4-ac1b-49e4-a921-9630aaf1eccc	5f0f09bb-573b-4ea3-9307-0129ff2c1c4f	4d240cd1-2f76-4084-b4ca-846314663462	users	SUCCESS	2026-10-17 03:47:42.589	pulled 0 rows	2026-10-17 03:47:42.590203	2026-10-17 03:47:42.590203	0	\N
2b23eef3-38f8-4f30-b18c-30b29dc44fb8	787b7c4c-72e1-4960-9976-3638d984cc28	9cf4baae-6691-4243-8cad-663e8749d394	products	SUCCESS	2026-10-17 03:47:42.621	pulled 4 rows	2026-10-17 03:47:42.621731	2026-10-17 03:47:42.621731	0	\N
9021d723-e752-477a-8668-48c766c469ff	5c0ac05b-2b1f-4fa6-88f2-70d0d0d69885	6b45dd2b-83fa-49da-8a86-61757010f34a	expenses	SUCCESS	2026-10-17 03:47:42.715	pulled 0 rows	2026-10-17 03:47:42.715536	2026-10-17 03:47:42.715536	0	\N
1e8e9b89-cdff-463d-80fa-364137068a98	60c78472-db2e-4368-8f86-a180127c42ae	81f3cdc7-ae8e-4790-89f1-4929f871057c	inventory-transfers	SUCCESS	2026-10-17 03:47:42.819	pulled 0 rows	2026-10-17 03:47:42.821266	2026-10-17 03:47:42.821266	0	\N
85afabf6-1375-4e39-948c-ed6aa202b873	88b1e213-8e71-4ee9-a7e7-aa8015f8e0fc	6ec46ba5-5b5c-4b85-b48c-49b30ddae015	customers	SUCCESS	2026-10-17 03:55:18.495	pulled 0 rows	2026-10-17 03:55:18.499466	2026-10-17 03:55:18.499466	0	\N
11bb47c5-1b2a-41b1-8ee0-d48d06a7b6ea	260c857c-cdb0-4bc6-a621-0324cd2a04eb	ca7cec46-6a16-4877-a7b5-8cf1058283d5	expenses	SUCCESS	2026-10-17 03:55:18.519	pulled 0 rows	2026-10-17 03:55:18.520554	2026-10-17 03:55:18.520554	0	\N
92914ac2-2f23-4919-9a41-a650eb6a6869	a419ddfb-be07-42dd-a213-8e0389316dd0	26d9bce0-3b1a-475a-8200-3addb1c4480c	products	SUCCESS	2026-10-17 03:55:18.528	pulled 4 rows	2026-10-17 03:55:18.529209	2026-10-17 03:55:18.529209	0	\N
229059d8-cbed-43b4-98ff-e12726d59b04	0ddadd19-6b15-442b-a82d-eef5c88741db	37e82b5d-61ce-42ae-8563-bbe0bf272eeb	inventories	SUCCESS	2026-10-17 03:55:18.534	pulled 4 rows	2026-10-17 03:55:18.536727	2026-10-17 03:55:18.536727	0	\N
e07ed254-a903-4114-84f7-0881e33ea93a	d805caac-ee8a-42fa-8e1c-e79dfe96b705	9c622fe8-c4aa-4857-ad83-7c812a101c70	inventory-transfers	SUCCESS	2026-10-17 03:55:18.593	pulled 0 rows	2026-10-17 03:55:18.594307	2026-10-17 03:55:18.594307	0	\N
924b63b8-6064-4b2e-92aa-0310ee7a0aad	16bcb1e7-c89a-476d-a8ac-b19fb6852dd2	8cd9fb36-5860-454c-bf12-431b14d7c51e	product-batches	SUCCESS	2026-10-17 03:55:18.746	pulled 1 rows	2026-10-17 03:55:18.747133	2026-10-17 03:55:18.747133	0	\N
0e358a53-0bb5-4380-87af-e31eacdc07d5	ac72af1c-e74a-48be-beff-a2de3f8a73c0	e781ed62-3f26-4318-95ad-a2a1c117d424	suppliers	SUCCESS	2026-10-17 03:55:19.275	pulled 0 rows	2026-10-17 03:55:19.277289	2026-10-17 03:55:19.277289	0	\N
b7192a1c-12f9-4f6f-8fed-07e162dd9485	33d5f1c5-ebca-40bf-a913-23055b61c4b5	fb60b6e4-4e9a-4d7d-b753-7a83a06b153d	branches	SUCCESS	2026-10-17 03:55:19.276	pulled 0 rows	2026-10-17 03:55:19.279065	2026-10-17 03:55:19.279065	0	\N
4603dfb2-dbdf-4053-98a6-f8df1033919a	b06377b8-ce62-4a88-bbf4-ffcb0c3a1daf	829950e9-2595-489e-869c-4c8ff9335d0b	units-of-measure	SUCCESS	2026-10-17 03:55:19.278	pulled 0 rows	2026-10-17 03:55:19.282753	2026-10-17 03:55:19.282753	0	\N
a7225f99-d378-4e9b-8cc3-882919d0c997	38ea9c61-b480-4b57-bc1a-8447f55b29b0	49f1c628-2ff7-4952-9ae0-7008d47d88e1	categories	SUCCESS	2026-10-17 03:55:19.3	pulled 0 rows	2026-10-17 03:55:19.304362	2026-10-17 03:55:19.304362	0	\N
b13bb835-1aef-4021-8b50-5afc8f8184a3	1ec9a3b4-adc0-4ef5-aba2-1ce70d4574b7	e9bfc708-b4f7-43bf-94f3-2acd03038e48	purchases	SUCCESS	2026-10-17 03:55:19.448	pulled 0 rows	2026-10-17 03:55:19.44888	2026-10-17 03:55:19.44888	0	\N
2ad8337b-bebc-46c4-b8f1-965119544a4d	c0d57802-a025-4397-ba44-127d421f7097	ca765975-6ab2-41b4-893a-4c53725d94a7	sales	SUCCESS	2026-10-17 03:55:19.543	pulled 0 rows	2026-10-17 03:55:19.544041	2026-10-17 03:55:19.544041	0	\N
efab615b-e152-4b1a-82a3-1348bb6413e7	f7e70a9d-f29c-49eb-ba54-73f48205cdfc	5d8c0480-e46b-49ae-8f8b-57bd46fe7113	customers	SUCCESS	2026-10-17 03:55:19.579	pulled 0 rows	2026-10-17 03:55:19.579848	2026-10-17 03:55:19.579848	0	\N
f21be792-686b-421b-8858-16a7e6e01a09	648600e5-549c-419c-bed8-348841a96cce	10657a94-0e2d-404a-a6d9-3341cf8152df	products	SUCCESS	2026-10-17 03:55:19.581	pulled 4 rows	2026-10-17 03:55:19.587405	2026-10-17 03:55:19.587405	0	\N
8c1c729a-1913-4594-9889-b3ea70af621c	5ed6970d-f313-4cd7-becf-c5a4154318de	96281ae9-15b2-4a31-aeae-331cf997feb2	expenses	SUCCESS	2026-10-17 03:55:19.627	pulled 0 rows	2026-10-17 03:55:19.628556	2026-10-17 03:55:19.628556	0	\N
a471da7e-7e03-4732-8fae-cf43beb810ce	2afcea04-4636-4770-95df-6338924414cc	75d0ba69-388b-4890-8da7-d872d2927812	inventories	SUCCESS	2026-10-17 03:55:19.642	pulled 4 rows	2026-10-17 03:55:19.643352	2026-10-17 03:55:19.643352	0	\N
d7130db6-217f-4d99-8e11-22364f08e9dd	005c11cf-8978-4803-9068-1175fa1fa0db	e53481d5-256a-4fbb-86c2-42ffcd132f7b	users	SUCCESS	2026-10-17 03:55:19.892	pulled 0 rows	2026-10-17 03:55:19.893187	2026-10-17 03:55:19.893187	0	\N
582c97e1-c15d-4bc0-bdaf-e5343166339a	2c78802b-28b3-4d10-908c-4125071a899e	216e2bef-34ac-42c4-95d8-8cca7d4632a2	inventory-transfers	SUCCESS	2026-10-17 03:55:19.903	pulled 0 rows	2026-10-17 03:55:19.905636	2026-10-17 03:55:19.905636	0	\N
dbac4b34-eed0-4b6a-bd42-1987231640a3	8bcf3ccc-399d-4912-a4a8-a43abfb862d5	b351941b-b8ba-4b5b-abbb-513765305503	roles	SUCCESS	2026-10-17 03:55:19.898	pulled 0 rows	2026-10-17 03:55:19.899653	2026-10-17 03:55:19.899653	0	\N
67be8668-0723-4126-ac11-c4127ada084d	da3f9fb9-877b-42c0-a400-cb6e1d6acf38	e9fd4259-5e28-4f92-b82e-49070db7098a	product-batches	SUCCESS	2026-10-17 03:55:19.899	pulled 1 rows	2026-10-17 03:55:19.901891	2026-10-17 03:55:19.901891	0	\N
f34aeb1f-eeb5-4c74-9110-a80cb1c73c79	1944d37c-2815-4437-b5f0-df7976d927e2	43272165-bc52-4323-ba80-25ba878b0148	notifications	SUCCESS	2026-10-17 03:55:19.929	pulled 0 rows	2026-10-17 03:55:19.929922	2026-10-17 03:55:19.929922	0	\N
f03bb207-301a-4564-8e16-ceda5f99f686	f92b79b3-eeb7-4c5a-8df9-ce8ad18b85da	701164eb-9e24-429b-9e0e-611735a9a4e2	categories	SUCCESS	2026-10-17 03:55:20.099	pulled 0 rows	2026-10-17 03:55:20.099834	2026-10-17 03:55:20.099834	0	\N
04cdad54-9995-4db9-831f-495c34f07ed3	a9638413-99f7-440c-a9a3-38aa838dd5f2	2face1c4-482d-4b7c-b021-b89937c21a15	suppliers	SUCCESS	2026-10-17 03:55:20.21	pulled 0 rows	2026-10-17 03:55:20.211231	2026-10-17 03:55:20.211231	0	\N
e45fba1e-e248-4281-a509-21cce679a983	8277672d-d467-4b75-aac6-df7913e2114e	27aa4a43-5dec-4ce2-bb86-991f90c9886d	units-of-measure	SUCCESS	2026-10-17 03:55:20.228	pulled 0 rows	2026-10-17 03:55:20.229266	2026-10-17 03:55:20.229266	0	\N
b44f0359-5d2a-41f1-af62-56805d6b34e2	f88ce34c-b14b-4b8f-a265-bd3130eff0fd	76a496b0-12d5-475c-8f7e-419b1b251cd2	branches	SUCCESS	2026-10-17 03:55:20.431	pulled 0 rows	2026-10-17 03:55:20.431543	2026-10-17 03:55:20.431543	0	\N
e2b25a02-8e45-4305-9c0a-1bded94a2da5	4f4fbb19-9423-4ac2-a68d-635c9e4cc101	bbaf228f-b005-4661-96ee-527a1e715d20	sales	SUCCESS	2026-10-17 03:55:20.65	pulled 0 rows	2026-10-17 03:55:20.657237	2026-10-17 03:55:20.657237	0	\N
06c14e01-2d68-4531-88c2-4d4af66c7cb8	737adb1e-3d25-4ff5-9a5a-3fee6bf2c5af	67647aac-4ec5-40ff-9a5b-2a7ae73818ba	users	SUCCESS	2026-10-17 03:55:20.678	pulled 0 rows	2026-10-17 03:55:20.678631	2026-10-17 03:55:20.678631	0	\N
f8997e6c-6f43-4029-9676-f5a38042d46a	4e7ea86e-403e-4de7-8afe-d19e38bb58d9	546e03fb-f054-4d83-806b-ed78821c702c	purchases	SUCCESS	2026-10-17 03:55:20.689	pulled 0 rows	2026-10-17 03:55:20.69114	2026-10-17 03:55:20.69114	0	\N
2651bf69-b289-4b35-b2a4-63d54b5a0c6b	d03aaed5-d2b2-47fb-9b36-29cc321f5c1a	d57aa542-09aa-46ae-9876-c5a8a24f5636	roles	SUCCESS	2026-10-17 03:55:20.708	pulled 0 rows	2026-10-17 03:55:20.708488	2026-10-17 03:55:20.708488	0	\N
b8a19a15-8af5-4644-a390-b206b7c96cfc	7adcc3fa-8dfa-4f37-a05b-470811eb7a6d	e36f4fc2-aa82-4c1b-a502-6be16cf464e7	notifications	SUCCESS	2026-10-17 03:55:20.708	pulled 0 rows	2026-10-17 03:55:20.709654	2026-10-17 03:55:20.709654	0	\N
e61f5669-d548-48e7-9db3-9a5f7992d052	1ad42780-732f-461b-af73-dd042aad7b08	fcc604dd-eb3c-45ed-87a2-b80b3a823174	customers	SUCCESS	2026-10-17 03:56:12.063	pulled 0 rows	2026-10-17 03:56:12.074869	2026-10-17 03:56:12.074869	0	\N
225990fb-3bea-4227-a8d5-43f7099542a3	dab3b6fe-5a59-4f1e-9a13-3d3cea0f5bdc	f3817745-674a-49cc-8c12-d339a92b5ab3	products	SUCCESS	2026-10-17 03:56:12.11	pulled 4 rows	2026-10-17 03:56:12.11062	2026-10-17 03:56:12.11062	0	\N
871935fc-c064-4ae8-b459-d19e002c5cd3	afa76401-5cd3-4a54-9bda-16fab491a824	df1f00bb-c854-4593-9b56-55fb2ec08fe9	inventories	SUCCESS	2026-10-17 03:56:12.163	pulled 4 rows	2026-10-17 03:56:12.163768	2026-10-17 03:56:12.163768	0	\N
4f0213db-9cb6-4bda-95e9-2cef305586ef	8315448e-35dd-4ff3-a0ff-faa1dfde6885	e86cef1a-a255-4708-ab5a-d3351247adfa	inventory-transfers	SUCCESS	2026-10-17 03:56:12.194	pulled 0 rows	2026-10-17 03:56:12.194763	2026-10-17 03:56:12.194763	0	\N
ed49c108-2e5f-42dc-989a-31973f87f761	fe4b6ff7-737d-482c-82a9-7a61d058a220	e7404aed-7eec-4f14-a57e-c7001bcc82d0	expenses	SUCCESS	2026-10-17 03:56:12.207	pulled 0 rows	2026-10-17 03:56:12.208184	2026-10-17 03:56:12.208184	0	\N
92349332-3186-4527-9e46-8905f187d09f	44fafa24-136f-4296-9e32-897ac92048d0	34ebe41a-4058-46a3-8a53-02c27905898c	product-batches	SUCCESS	2026-10-17 03:56:12.461	pulled 1 rows	2026-10-17 03:56:12.462007	2026-10-17 03:56:12.462007	0	\N
0c65906e-f1c0-441d-8174-169600699b30	bae64c58-6e07-4bba-b70d-35a1fb46474f	b600517f-19e9-4d43-805e-74ba390f04e9	categories	SUCCESS	2026-10-17 03:56:12.697	pulled 0 rows	2026-10-17 03:56:12.705154	2026-10-17 03:56:12.705154	0	\N
d5bfbc31-0976-4d07-9498-584b5d4c66fe	a3a65df1-0df4-400c-949e-2d279c19dc39	a9b83817-c4cb-4789-866f-f1aaa0b98d60	notifications	SUCCESS	2026-10-17 03:56:13.244	pulled 0 rows	2026-10-17 03:56:13.246383	2026-10-17 03:56:13.246383	0	\N
a9e84cd3-13e1-4449-bed0-718c00a64fcb	b7edd30b-d10c-4ceb-8bdd-1b4671f38291	cfb5d701-5b3d-49b6-8a5b-2cd3d293e6e5	units-of-measure	SUCCESS	2026-10-17 03:56:12.696	pulled 0 rows	2026-10-17 03:56:12.703512	2026-10-17 03:56:12.703512	0	\N
a04c76c1-d098-48b5-951d-8717fd9924bd	6a494c00-53df-4a9c-a886-5c2f3a18601f	1f57a2ef-5152-4e4d-bbdf-e0cbfa6d0c93	roles	SUCCESS	2026-10-17 03:56:13.203	pulled 0 rows	2026-10-17 03:56:13.204656	2026-10-17 03:56:13.204656	0	\N
99cb5749-a899-4f88-b89a-f4253e1c7377	6bfc3026-607d-480c-8ebd-6d1593a32fc3	07ba2433-8b01-4da7-b2dc-cebc2a04ec90	suppliers	SUCCESS	2026-10-17 03:56:12.752	pulled 0 rows	2026-10-17 03:56:12.753553	2026-10-17 03:56:12.753553	0	\N
a18a11e3-2c57-4e0f-92fe-51120e29b661	c7d68359-9157-447b-8610-8212a4040fb4	184cd107-fdb4-4c19-8675-ca6534791195	branches	SUCCESS	2026-10-17 03:56:12.794	pulled 0 rows	2026-10-17 03:56:12.794371	2026-10-17 03:56:12.794371	0	\N
10c23539-98f0-4542-aeee-10817045f2f1	4ae06526-cd70-415b-b9e1-371ea58fceaf	f177f2b4-84cf-4ca5-bc23-b6c8ff39d458	purchases	SUCCESS	2026-10-17 03:56:12.821	pulled 0 rows	2026-10-17 03:56:12.821861	2026-10-17 03:56:12.821861	0	\N
7a3eae53-55af-49d2-af9e-8a514e1210b0	145cf567-b3fb-4695-9b6c-9b7799cecfba	bd4fc46e-8e5e-4af3-8000-e2104ea5bd7a	sales	SUCCESS	2026-10-17 03:56:12.853	pulled 0 rows	2026-10-17 03:56:12.85419	2026-10-17 03:56:12.85419	0	\N
8ba1171d-5425-4158-805c-2b5360fd2ec3	ab8ad2d6-ab1d-43b2-86b6-6f6382ca6f24	005a7d97-5b70-4cc6-a932-de242b3bddfe	users	SUCCESS	2026-10-17 03:56:13.207	pulled 0 rows	2026-10-17 03:56:13.207925	2026-10-17 03:56:13.207925	0	\N
bd3ac972-50bc-4349-9e8a-79dba4036475	81aa2b1a-6637-4ecf-beb0-b3b0b58e7ac8	640b56e2-74b3-4ab0-b98e-028937477231	inventories	SUCCESS	2026-10-17 03:57:11.726	pulled 4 rows	2026-10-17 03:57:11.726626	2026-10-17 03:57:11.726626	0	\N
30b21a31-cfcc-4b76-8603-f8b8e6587c1a	34651b53-c527-4863-9aa5-45956d30138b	5572f996-5ef0-47db-a324-5ca09c3e5661	expenses	SUCCESS	2026-10-17 03:57:11.733	pulled 0 rows	2026-10-17 03:57:11.735088	2026-10-17 03:57:11.735088	0	\N
a9dfcd7a-573d-49d9-8a19-fd889fe4ab63	0c0d138a-6a77-45ac-9ae6-e7daf693944a	a0bd5860-bafc-45eb-8362-cded101306a9	customers	SUCCESS	2026-10-17 03:57:11.737	pulled 0 rows	2026-10-17 03:57:11.737526	2026-10-17 03:57:11.737526	0	\N
14693d04-835f-495e-a7d8-85d828f24b59	28ba0b80-a00b-4fa0-bd10-0a2907a54261	b01b9d8d-8063-49ee-92cd-2cef4f5b4fba	products	SUCCESS	2026-10-17 03:57:11.749	pulled 4 rows	2026-10-17 03:57:11.751543	2026-10-17 03:57:11.751543	0	\N
d8a012d7-5a4a-4c40-8532-8ba8b915d43a	3e375e93-9229-4757-9ce7-2906555acafc	69745d33-b7a0-47c2-9724-b94adac7f509	inventory-transfers	SUCCESS	2026-10-17 03:57:11.8	pulled 0 rows	2026-10-17 03:57:11.800969	2026-10-17 03:57:11.800969	0	\N
ed91cc18-ae19-4a7d-a735-8013163ecf49	e6ac0912-f57d-43ab-be51-7359d1d2f556	a1018849-3c48-4a1b-8283-ae0b11603d4a	product-batches	SUCCESS	2026-10-17 03:57:11.87	pulled 1 rows	2026-10-17 03:57:11.870879	2026-10-17 03:57:11.870879	0	\N
1d9a7959-244f-4bcc-9532-c72d9a926703	71575742-063e-4a25-a392-25626096c579	30f800ee-569e-430d-9142-7a9091199a67	categories	SUCCESS	2026-10-17 03:57:12.143	pulled 0 rows	2026-10-17 03:57:12.143805	2026-10-17 03:57:12.143805	0	\N
aade4876-e857-49d5-a1b2-6858e4c7fd8e	91bedc32-cb33-49f2-afc0-f6186b011c26	c3fb7600-4984-49b7-b59c-993eaedfcf0e	units-of-measure	SUCCESS	2026-10-17 03:57:12.144	pulled 0 rows	2026-10-17 03:57:12.144978	2026-10-17 03:57:12.144978	0	\N
778a05c3-569a-43f9-a12e-e99cea2488b4	8798eca8-5092-4d80-8eb3-95553ee1edff	f0b008df-25f7-4170-b54a-e5234a9962f8	suppliers	SUCCESS	2026-10-17 03:57:12.16	pulled 0 rows	2026-10-17 03:57:12.160401	2026-10-17 03:57:12.160401	0	\N
5baefce1-ec36-481e-8e75-2194f6abb488	82a5110c-c1c4-45d3-9174-e29be936b39a	0c66b292-2a96-4dd6-8d3d-6456bd383455	sales	SUCCESS	2026-10-17 03:57:12.372	pulled 0 rows	2026-10-17 03:57:12.372809	2026-10-17 03:57:12.372809	0	\N
10bd49d3-4910-40cf-9537-17aa2d0f1638	b9f4a5ab-a40f-41bb-bbda-16a8aa9284a1	fcdd2a68-4e1f-4115-ac59-2deb8b5b11d3	purchases	SUCCESS	2026-10-17 03:57:12.373	pulled 0 rows	2026-10-17 03:57:12.373994	2026-10-17 03:57:12.373994	0	\N
f7f4f092-4219-471c-98ea-47348c1d3bfb	bf9c8fe1-b174-43b4-b003-4afd12d0c3f6	80db66cf-4ae6-424f-ae8b-ab62f244ac29	branches	SUCCESS	2026-10-17 03:57:12.374	pulled 0 rows	2026-10-17 03:57:12.374985	2026-10-17 03:57:12.374985	0	\N
5d3f5b3a-2010-48e9-88bf-6e0aea006919	599a307c-aa33-469d-9ded-bc7bdca35b62	c93e757b-d3db-4fdf-a03f-20ecc626b93d	roles	SUCCESS	2026-10-17 03:57:12.385	pulled 0 rows	2026-10-17 03:57:12.386908	2026-10-17 03:57:12.386908	0	\N
a200e513-c826-49f2-9c8e-f0c67792bf32	425bca09-1b99-4bc7-9db7-9444c024044c	6a07dadf-d612-4ebc-9654-617e519c627e	users	SUCCESS	2026-10-17 03:57:12.422	pulled 0 rows	2026-10-17 03:57:12.423129	2026-10-17 03:57:12.423129	0	\N
b5df1a76-c209-480c-b6f4-e86a95d90a5c	cc079ef0-5062-48aa-8904-d77e9da7f5b1	92771554-5ed4-4798-b8ff-3a121e37377e	notifications	SUCCESS	2026-10-17 03:57:12.528	pulled 0 rows	2026-10-17 03:57:12.530046	2026-10-17 03:57:12.530046	0	\N
158807fb-95a0-4ef3-b0e1-67f584b58aef	cc7941c9-6570-451a-b543-4d5e1b734e29	ad0c417e-21a1-482a-84fc-f2e9bb9d000a	products	SUCCESS	2026-10-17 03:58:11.849	pulled 4 rows	2026-10-17 03:58:11.856531	2026-10-17 03:58:11.856531	0	\N
72861cb0-026e-413a-be25-31a0f6a7882f	6c02ad7c-963b-44b6-bb68-75a14ca55b25	7d65c42e-1fa6-46ac-a920-230d33126a42	expenses	SUCCESS	2026-10-17 03:58:11.858	pulled 0 rows	2026-10-17 03:58:11.859401	2026-10-17 03:58:11.859401	0	\N
3c9cfc14-7808-46a3-bb9d-74299118d19f	bf4f29fc-40a5-455f-bf18-3e355362b2f6	9043cc28-fc43-4cad-bb9b-32edabcb7ca1	customers	SUCCESS	2026-10-17 03:58:11.889	pulled 0 rows	2026-10-17 03:58:11.890883	2026-10-17 03:58:11.890883	0	\N
3e0369e6-a81a-4ffe-9054-1fa8674ee7ac	9c52a407-c30c-4936-9e52-d0b750d0c89d	ae7f57ef-c545-408e-8534-ae11ee06d729	inventory-transfers	SUCCESS	2026-10-17 03:58:11.914	pulled 0 rows	2026-10-17 03:58:11.922602	2026-10-17 03:58:11.922602	0	\N
73dc082f-693c-4c32-a1a3-bb6b8e6a355b	7300ff1f-e7f2-4ce4-b9b4-32aaba23c625	67a7489b-f627-4e8e-9d65-34a07f294729	inventories	SUCCESS	2026-10-17 03:58:11.911	pulled 4 rows	2026-10-17 03:58:11.918373	2026-10-17 03:58:11.918373	0	\N
1a9d67f0-7a68-4ece-81aa-dc5f06e57d2f	ac781d16-9c9d-49d2-bffb-8a59a529c30f	68161ee9-ae73-45e5-8f8a-23b6aae3edfe	product-batches	SUCCESS	2026-10-17 03:58:12.093	pulled 1 rows	2026-10-17 03:58:12.093632	2026-10-17 03:58:12.093632	0	\N
11c1eb80-be13-42fb-b6c6-a5c08e4619b7	aeea5a54-2d9f-4776-8bc3-9e80ade9c12c	558b1f85-33dc-4530-9a8b-296948c0ac62	categories	SUCCESS	2026-10-17 03:58:12.276	pulled 0 rows	2026-10-17 03:58:12.276628	2026-10-17 03:58:12.276628	0	\N
7afd2cca-871d-4dfe-8f3c-b88f80781d76	9c05be25-d416-449e-bf10-98753825116f	d01b7229-de15-4186-9a1b-8ef55af6ef04	units-of-measure	SUCCESS	2026-10-17 03:58:12.291	pulled 0 rows	2026-10-17 03:58:12.291647	2026-10-17 03:58:12.291647	0	\N
19b60413-41c5-48ce-98b8-1b5c2d139e62	ed1022ce-5cb3-4ae7-b3b7-bc5b65a33d98	9c3c35bd-4e75-44b4-acb2-64aa5f51db78	branches	SUCCESS	2026-10-17 03:58:12.305	pulled 0 rows	2026-10-17 03:58:12.305758	2026-10-17 03:58:12.305758	0	\N
7e1d2a9a-0448-438d-95ef-e78a51036f63	1f48507a-75c1-4a32-8664-5c8e91842c39	638fe3c4-dfd4-447d-8861-23571d7a42fa	suppliers	SUCCESS	2026-10-17 03:58:12.306	pulled 0 rows	2026-10-17 03:58:12.307201	2026-10-17 03:58:12.307201	0	\N
ef2360ec-ff46-4d20-8cc3-4ebfa315949c	d1d65c7e-bc1d-43e6-a7c7-224fa497eab0	8560c5b2-8bab-4f37-b20e-3c501f5d0d24	sales	SUCCESS	2026-10-17 03:58:12.437	pulled 0 rows	2026-10-17 03:58:12.438776	2026-10-17 03:58:12.438776	0	\N
891d5dea-92bc-474a-a389-90bfa019dade	6ff85560-97e5-43aa-8a01-c25c411b8bb5	fae95b3f-4228-4271-bfd4-779e026cc14b	purchases	SUCCESS	2026-10-17 03:58:12.478	pulled 0 rows	2026-10-17 03:58:12.47898	2026-10-17 03:58:12.47898	0	\N
fa3d6b0a-3868-4c25-a716-11473211a864	3600a9df-3716-42f3-b1b8-ab878066164a	aa5990df-1c55-48ae-9ea9-7a393bff4c87	notifications	SUCCESS	2026-10-17 03:58:12.538	pulled 0 rows	2026-10-17 03:58:12.538449	2026-10-17 03:58:12.538449	0	\N
7fc589ab-8286-4aa5-a00a-7c6b0dc4c8fb	e45c723a-6171-4d13-a2d8-e444f5476726	c67478bc-474d-4ad5-bfa8-4a26af4a146d	roles	SUCCESS	2026-10-17 03:58:12.538	pulled 0 rows	2026-10-17 03:58:12.539486	2026-10-17 03:58:12.539486	0	\N
0de54f92-7341-47a1-9420-9700fae70e31	f14bf764-f654-48fa-8b78-0b1946a190e5	9958ade0-e02c-4b4b-a6b1-d999340175a6	users	SUCCESS	2026-10-17 03:58:12.539	pulled 0 rows	2026-10-17 03:58:12.540638	2026-10-17 03:58:12.540638	0	\N
3189d48d-d734-4c6c-b013-5b06979b9507	3abe937e-d376-4dc9-894a-6f2749667349	6922035c-0939-4942-9f0f-2d0f173af345	inventories	SUCCESS	2026-10-17 03:59:11.765	pulled 4 rows	2026-10-17 03:59:11.766161	2026-10-17 03:59:11.766161	0	\N
983f46c3-40a9-4a91-b2ab-eea2870abda2	3cfb929e-6910-412a-9cb7-a556bd40d6e0	ac0ff190-6f94-478e-a214-bf4a518f913a	expenses	SUCCESS	2026-10-17 03:59:11.78	pulled 0 rows	2026-10-17 03:59:11.780775	2026-10-17 03:59:11.780775	0	\N
9c5ed24d-b229-4b3e-b7be-86dd1c71e952	45ac210d-9f97-4e12-ac78-64fb9e4f7bad	397afc67-d600-4746-916a-85660b9ccaab	customers	SUCCESS	2026-10-17 03:59:11.777	pulled 0 rows	2026-10-17 03:59:11.778005	2026-10-17 03:59:11.778005	0	\N
1d8fb8e1-2bc9-40d3-b887-ddec739edded	d858b4d4-3eeb-4cf5-8111-14b2d5d85583	95669872-4bfd-477a-83de-651ab14c6a9d	products	SUCCESS	2026-10-17 03:59:11.781	pulled 4 rows	2026-10-17 03:59:11.781782	2026-10-17 03:59:11.781782	0	\N
91a94dd4-7374-4dd7-8133-e00fdf69c32a	b06334b0-2f09-46b0-84dd-6747db9b75ce	1c39c7f9-61fd-4462-83ad-b41861910891	inventory-transfers	SUCCESS	2026-10-17 03:59:11.83	pulled 0 rows	2026-10-17 03:59:11.830662	2026-10-17 03:59:11.830662	0	\N
82e116ce-64a8-44f0-a197-26eb6e598c46	1e256fd4-0460-45af-8ba2-c140caad3578	f5655a7b-4aed-46f1-b4c4-17e06280944a	product-batches	SUCCESS	2026-10-17 03:59:12.153	pulled 1 rows	2026-10-17 03:59:12.154888	2026-10-17 03:59:12.154888	0	\N
cec9c4a0-3d93-4876-a6bc-b42d388521f3	1771eb26-3f05-4f76-a9c8-02fa5b5e2899	331b9f39-1dc6-4ae1-ac55-c28f2f61aa6e	units-of-measure	SUCCESS	2026-10-17 03:59:12.333	pulled 0 rows	2026-10-17 03:59:12.340824	2026-10-17 03:59:12.340824	0	\N
7b1b3557-4b97-4b09-bee5-79f97dabebe2	08e56edf-a3a9-4db4-ad8f-f23bde81e4d4	0dbfbd41-467a-4f76-b74c-01c9057a3fe7	categories	SUCCESS	2026-10-17 03:59:12.339	pulled 0 rows	2026-10-17 03:59:12.346841	2026-10-17 03:59:12.346841	0	\N
0154f07a-6661-402f-b28c-b402b591b24d	1c20f8e2-97d5-43d6-89b6-3ae45fb75da1	24663e30-b936-491a-8a5a-ea0b5895b44a	roles	SUCCESS	2026-10-17 03:59:12.615	pulled 0 rows	2026-10-17 03:59:12.616316	2026-10-17 03:59:12.616316	0	\N
9187bb9e-2abe-4dda-8502-5c94111bef50	e3176a50-a3a2-4b74-94e0-8e980770f7c9	c7618552-85c4-4502-8205-6d80ea1f38dd	suppliers	SUCCESS	2026-10-17 03:59:12.343	pulled 0 rows	2026-10-17 03:59:12.349098	2026-10-17 03:59:12.349098	0	\N
a0574023-f11c-42c7-99c5-84724988824b	bafd4923-3092-40dd-9ff8-5b576c3cb23c	68f63b3a-9034-4793-b155-e5d1e1bbfa20	users	SUCCESS	2026-10-17 03:59:12.599	pulled 0 rows	2026-10-17 03:59:12.599851	2026-10-17 03:59:12.599851	0	\N
9bcd4792-37c4-43ee-9e56-5243bd1465a9	3b0846f9-84ea-44d2-b6a7-17a4ca81dd77	1d16c8f0-7cd7-463e-91f4-9ca60a1f30a3	branches	SUCCESS	2026-10-17 03:59:12.398	pulled 0 rows	2026-10-17 03:59:12.398928	2026-10-17 03:59:12.398928	0	\N
313b2382-d6ce-45f0-8a5c-a574edd00ccc	74cb7967-a3cd-42e8-b3c9-86c6d0139a27	026050bc-233e-414c-b63f-9163a9375da7	purchases	SUCCESS	2026-10-17 03:59:12.483	pulled 0 rows	2026-10-17 03:59:12.483677	2026-10-17 03:59:12.483677	0	\N
98ba0667-6151-49b6-a935-2ced8f572be6	c4c54b55-8588-4019-b1d7-861396820965	2255f13f-3bd1-4dd6-8155-47d21efefdf0	sales	SUCCESS	2026-10-17 03:59:12.576	pulled 0 rows	2026-10-17 03:59:12.577361	2026-10-17 03:59:12.577361	0	\N
f7507051-677a-4d38-b450-98034c481fb3	97660db5-4928-49e7-9da4-a9b1bf3f4c10	05d0c361-debc-4cfd-98c6-b166c2755b33	notifications	SUCCESS	2026-10-17 03:59:12.639	pulled 0 rows	2026-10-17 03:59:12.639516	2026-10-17 03:59:12.639516	0	\N
d3ef63d4-d14e-46b5-a74e-ac2dc6ebeb9c	dev-mvaih3kc-jg9pa7u3kk	mut-mvbve5bc-x5k9zrmoql	products	SUCCESS	2026-10-17 04:08:11.083726	\N	2026-10-17 04:08:11.001063	2026-10-17 04:08:11.083726	0	\N
45f61fda-6bea-47e7-8efa-404d0aba35a4	62d30590-9f4f-4f71-b717-d4b74303ef26	338c54b5-c8f4-4db1-932a-30c275e120ea	customers	SUCCESS	2026-10-17 04:08:12.442	pulled 0 rows	2026-10-17 04:08:12.442628	2026-10-17 04:08:12.442628	0	\N
2fd85b49-ad0a-4a7e-a834-b5fd27abee81	f7392729-54dd-4b6a-b2ec-28a49335cf38	376252da-e81d-43ae-9331-7aa461acfbe5	expenses	SUCCESS	2026-10-17 04:08:12.486	pulled 0 rows	2026-10-17 04:08:12.491536	2026-10-17 04:08:12.491536	0	\N
b1e14c0d-a082-465d-83cb-377b9180ffa2	587b612a-28d7-4b98-bc56-ca9bbff5aa64	e901decd-d046-4621-8728-51f308dc7307	products	SUCCESS	2026-10-17 04:08:12.753	pulled 5 rows	2026-10-17 04:08:12.754942	2026-10-17 04:08:12.754942	0	\N
d827693d-f710-4fc6-85ea-67507ec24694	e1cd5258-959c-4b6a-ab8a-3b616ad96ee2	4424058a-c06e-4c20-b787-a0d963cde89d	inventory-transfers	SUCCESS	2026-10-17 04:08:12.817	pulled 0 rows	2026-10-17 04:08:12.818245	2026-10-17 04:08:12.818245	0	\N
381669e8-d2d3-40f9-9c70-91730898af3c	a029f42f-8d13-4291-b4f0-3b720794bab6	53407894-e0c0-4915-bad6-1f7e7967ae30	inventories	SUCCESS	2026-10-17 04:08:12.881	pulled 5 rows	2026-10-17 04:08:12.881625	2026-10-17 04:08:12.881625	0	\N
299792ae-f029-4f56-ba35-95119d090a19	3a8b2df1-68e4-44d2-b2a7-65b54059d741	21fa3b0a-ae0b-49b5-bec2-085d4e39ed29	product-batches	SUCCESS	2026-10-17 04:08:12.882	pulled 1 rows	2026-10-17 04:08:12.882537	2026-10-17 04:08:12.882537	0	\N
eeae295a-9306-4b8f-a5cb-b355670d575d	3b9ae74b-d89f-4a9d-8f03-472297ea7e02	634da4d6-a9ca-41a0-9a15-5dee3fb099c9	categories	SUCCESS	2026-10-17 04:08:13.227	pulled 0 rows	2026-10-17 04:08:13.228129	2026-10-17 04:08:13.228129	0	\N
fa12c0d6-4cf1-4a42-880f-79e39defc076	e89d26d0-2b4a-4362-9f30-fe31a92818ab	3613df16-8308-426f-a20c-a5f3579e1fee	purchases	SUCCESS	2026-10-17 04:08:13.23	pulled 0 rows	2026-10-17 04:08:13.231628	2026-10-17 04:08:13.231628	0	\N
494a694d-75aa-46cd-9190-33eeb488110a	d1764fea-74ba-45b0-a604-f2b009f7b37c	857c6e71-f744-43e1-ab4b-1570ee2d9475	branches	SUCCESS	2026-10-17 04:08:13.477	pulled 0 rows	2026-10-17 04:08:13.480728	2026-10-17 04:08:13.480728	0	\N
102e25ae-bd77-4010-bd2c-251ed4d122a6	ab362ff7-2499-4769-9042-0855624949c8	cce0cc91-4695-40f9-bd21-8201cf4386a0	units-of-measure	SUCCESS	2026-10-17 04:08:13.508	pulled 0 rows	2026-10-17 04:08:13.508749	2026-10-17 04:08:13.508749	0	\N
8f4766a7-f276-46c5-a25f-402b990b55d0	f031e4c5-eec9-496d-98fc-200304b149ee	0dff1f84-7bfd-4205-81cf-4c2045f4d7c2	sales	SUCCESS	2026-10-17 04:08:13.522	pulled 0 rows	2026-10-17 04:08:13.526096	2026-10-17 04:08:13.526096	0	\N
ee086573-c943-4b04-bfc5-9d1c222324a3	6bf4a90d-92ea-40f4-9f38-d3993a62dd43	e20d31f9-ab8a-417e-b5ce-5ad40c74ede0	suppliers	SUCCESS	2026-10-17 04:08:13.56	pulled 0 rows	2026-10-17 04:08:13.560519	2026-10-17 04:08:13.560519	0	\N
338bdce8-16d3-47f4-8b58-58a641ca4e5c	18d70998-7336-4984-b26c-17247b3c0271	0fdbd474-ed8a-49c1-b6ba-a93cc604ab1d	users	SUCCESS	2026-10-17 04:08:13.572	pulled 0 rows	2026-10-17 04:08:13.573509	2026-10-17 04:08:13.573509	0	\N
65cae48a-2bdd-43f0-8e4f-21af04c55831	13f84cee-c734-412e-a315-3a88a1c50783	1e580650-035d-4e6f-824c-503f7806e3ec	products	SUCCESS	2026-10-17 04:08:13.598	pulled 5 rows	2026-10-17 04:08:13.598678	2026-10-17 04:08:13.598678	0	\N
760aa608-75b6-4151-9638-6ace6ff5b060	ae34807e-9c8e-4f16-b275-2bc6ba9aae21	dd1c7cb0-8fe3-44b0-ac5e-14daece852cb	roles	SUCCESS	2026-10-17 04:08:13.713	pulled 0 rows	2026-10-17 04:08:13.714875	2026-10-17 04:08:13.714875	0	\N
9f8360a3-4b80-4bb3-a5ed-8044c99f99b4	08e407ad-5caf-43ae-ada7-f22bc76445c4	be489129-caeb-4ec6-9542-41c5f6e87355	expenses	SUCCESS	2026-10-17 04:08:13.814	pulled 0 rows	2026-10-17 04:08:13.814832	2026-10-17 04:08:13.814832	0	\N
62e9d677-5ad4-4b3d-887c-ce173b150fc3	362fafcb-e9f1-4ded-81dd-a22d483b0ee2	ddeeb14c-4aa3-4046-8933-ac998653f0b7	customers	SUCCESS	2026-10-17 04:08:13.816	pulled 0 rows	2026-10-17 04:08:13.816818	2026-10-17 04:08:13.816818	0	\N
40be9c3d-d434-47a5-a9f3-23d64219d433	d7528fbc-8908-4fe9-b49e-f380bfca1d1a	99afd682-198f-40a8-94c5-c1b303616a1a	inventory-transfers	SUCCESS	2026-10-17 04:08:13.88	pulled 0 rows	2026-10-17 04:08:13.881152	2026-10-17 04:08:13.881152	0	\N
7e30be51-e38e-49fd-ac2b-671ee5a45693	787b5558-adba-4911-8334-6306a46d6dc4	87b4f21e-1dad-435a-9795-d161f83dd292	inventories	SUCCESS	2026-10-17 04:08:13.894	pulled 5 rows	2026-10-17 04:08:13.894676	2026-10-17 04:08:13.894676	0	\N
c2e24e76-6f67-4d83-a36b-cdaa6d43ba5d	6644e742-e9fe-41ed-8f1f-922a1a7ef2c0	a245c4fa-6e5a-473b-b878-503120b0da40	units-of-measure	SUCCESS	2026-10-17 04:08:14.086	pulled 0 rows	2026-10-17 04:08:14.088956	2026-10-17 04:08:14.088956	0	\N
486a4c17-08d0-4d60-aee1-93e2d8d653de	7a1ce5f9-bc2d-41af-91cc-b4657eb42023	255c9df7-dc49-4bfb-985f-d6a4c05b56ea	notifications	SUCCESS	2026-10-17 04:08:14.096	pulled 0 rows	2026-10-17 04:08:14.097457	2026-10-17 04:08:14.097457	0	\N
6e9759d0-1442-44f5-a017-e807a65cd4e1	6acbcca2-5659-4b5f-9bad-651745508892	e1305a5c-a9b1-4fa3-9f5b-57876babd6a2	product-batches	SUCCESS	2026-10-17 04:08:14.111	pulled 1 rows	2026-10-17 04:08:14.111996	2026-10-17 04:08:14.111996	0	\N
511a12ea-f7cf-4ea9-8464-bc26e41ee83a	83a69b32-6348-455e-a784-cdda608e9f10	bd56bd75-6558-4d47-8282-282fcdeaa6f8	categories	SUCCESS	2026-10-17 04:08:14.112	pulled 0 rows	2026-10-17 04:08:14.117912	2026-10-17 04:08:14.117912	0	\N
8425c2ee-a77d-4a23-b7af-7ff4b6f1831d	3bdda3c7-26d8-4412-9f2f-073b005cb181	e3cb6b4f-ec6a-494f-aa52-ee39a8e9b76e	branches	SUCCESS	2026-10-17 04:08:14.267	pulled 0 rows	2026-10-17 04:08:14.273186	2026-10-17 04:08:14.273186	0	\N
e2ebf9dd-e41d-4fd0-8b97-8190f6a55471	72469653-0930-42a3-a013-73e5ceb26764	7e8d3250-90d0-4e98-8970-c2e389040f3e	suppliers	SUCCESS	2026-10-17 04:08:14.692	pulled 0 rows	2026-10-17 04:08:14.694001	2026-10-17 04:08:14.694001	0	\N
facdeca0-ffcf-4078-b4d6-a72a4504e5be	c66378a6-19d6-4cb2-b351-3c287df06999	313a7bbf-6d69-4d3f-afcc-ab83e0295da7	users	SUCCESS	2026-10-17 04:08:14.698	pulled 0 rows	2026-10-17 04:08:14.699053	2026-10-17 04:08:14.699053	0	\N
5ef91c9c-55df-4dff-9041-305f9233fed4	df58a5b3-f2a6-4ba3-9729-d4413cc6606d	ad990d07-2d17-4310-81a7-445e503c175e	sales	SUCCESS	2026-10-17 04:08:14.699	pulled 0 rows	2026-10-17 04:08:14.700379	2026-10-17 04:08:14.700379	0	\N
d44f2778-fbf7-4b86-af6d-5a24374ed752	712a3f60-30eb-4491-839b-a032c373c4e1	5319d810-844c-4bed-9f81-d2d510fb2177	purchases	SUCCESS	2026-10-17 04:08:14.766	pulled 0 rows	2026-10-17 04:08:14.766928	2026-10-17 04:08:14.766928	0	\N
c1631b0e-8b17-48e4-a4a5-eab098120176	ac22479a-68b9-4f0d-991b-f35b31bacc55	0ca06fcf-2d8f-4cdc-bc31-71f35b81041a	roles	SUCCESS	2026-10-17 04:08:14.78	pulled 0 rows	2026-10-17 04:08:14.78202	2026-10-17 04:08:14.78202	0	\N
558abd38-78aa-4f4b-966b-21b1d8aa5b1d	fb81da80-4167-4fd8-9293-485e61b30ecb	376d6fb3-fd50-44d9-bf16-658c400f2632	notifications	SUCCESS	2026-10-17 04:08:14.808	pulled 0 rows	2026-10-17 04:08:14.80892	2026-10-17 04:08:14.80892	0	\N
168f57ee-4b0f-41b1-b781-927d8ea81ae5	1405d2a2-7da4-437e-8ab6-21c8d053da37	60b5b740-7872-4821-ad24-ff6001866432	customers	SUCCESS	2026-10-17 04:09:11.815	pulled 0 rows	2026-10-17 04:09:11.816035	2026-10-17 04:09:11.816035	0	\N
820a316b-f028-4f5f-853a-f0c8f6b764d3	9bf2ebde-d5f2-49cb-813b-f57eb302ae91	4a547862-53df-444d-9cbc-000d8f8ada0a	products	SUCCESS	2026-10-17 04:09:11.85	pulled 5 rows	2026-10-17 04:09:11.856171	2026-10-17 04:09:11.856171	0	\N
7a5b2576-1cec-435b-8233-0c3d76f1e25e	82bc372a-d453-429d-90ee-4aa4783f1f04	b1630c6e-46e3-4ae4-b5f7-f97d51f16a1a	expenses	SUCCESS	2026-10-17 04:09:11.857	pulled 0 rows	2026-10-17 04:09:11.858453	2026-10-17 04:09:11.858453	0	\N
9a00833c-585a-4c4d-8981-376ea2a68eec	3cb38b83-e903-4116-9d2c-1a0c0514f875	5f72d3cb-1687-433b-8630-cbde86297e78	inventories	SUCCESS	2026-10-17 04:09:11.862	pulled 5 rows	2026-10-17 04:09:11.863307	2026-10-17 04:09:11.863307	0	\N
2cfd70e9-0a64-4e6f-917b-ae7331ddcf83	5e1323cb-9d23-4b32-aee3-b4b2ec3f6908	6832b2eb-ee6a-4b11-a475-4b906c4f64e4	inventory-transfers	SUCCESS	2026-10-17 04:09:12.066	pulled 0 rows	2026-10-17 04:09:12.070352	2026-10-17 04:09:12.070352	0	\N
0e8da782-ef55-4201-98ca-c733ae17eac1	4499d974-795b-4a8a-be9c-72236e78625d	6a62a439-a399-40b0-bc53-6896a0c33498	product-batches	SUCCESS	2026-10-17 04:09:12.09	pulled 1 rows	2026-10-17 04:09:12.097782	2026-10-17 04:09:12.097782	0	\N
0b813a0a-f9bd-40b3-9af2-18de02dc6034	7498837f-76ae-4235-bc6f-2e4ef4e28748	26080480-f9b5-4949-8435-c69fac37c143	categories	SUCCESS	2026-10-17 04:09:12.263	pulled 0 rows	2026-10-17 04:09:12.264784	2026-10-17 04:09:12.264784	0	\N
f668f2da-e7f4-4e96-a0d1-8a663c00e81c	4994de23-e8c5-43d5-ba61-b5df384e629a	6649f591-e1e4-4b92-b6ac-3134dc04a3ec	branches	SUCCESS	2026-10-17 04:09:12.474	pulled 0 rows	2026-10-17 04:09:12.481547	2026-10-17 04:09:12.481547	0	\N
8c1e7ae5-ff1e-4ce4-a2b3-e17174e4334b	2ca57af5-adbc-46b2-952e-e08b6f12c116	1e0b68c4-8044-4ba7-9064-581cd4dc4eac	units-of-measure	SUCCESS	2026-10-17 04:09:12.483	pulled 0 rows	2026-10-17 04:09:12.485158	2026-10-17 04:09:12.485158	0	\N
5cad056e-0a0a-4a3e-8452-8aae89c7be6e	9d983ae0-b288-4c71-a793-86e1120ae974	5af11b16-396e-4124-b13a-fe1097650673	purchases	SUCCESS	2026-10-17 04:09:12.519	pulled 0 rows	2026-10-17 04:09:12.524761	2026-10-17 04:09:12.524761	0	\N
ddb94b2b-c807-4549-83c0-7c2ad46da98c	58f18cbf-0d7f-4390-ae47-ee137e31cc7e	358065b9-5c4e-40c3-9eb2-cdee0dd2a9b7	users	SUCCESS	2026-10-17 04:09:12.828	pulled 0 rows	2026-10-17 04:09:12.848607	2026-10-17 04:09:12.848607	0	\N
9448b97a-75fd-4ebd-ba07-19031432779f	414c4318-c5ba-4884-9b30-25495a017cb6	013c954e-e0cb-48b5-b914-f5c6e5e3fc73	suppliers	SUCCESS	2026-10-17 04:09:12.532	pulled 0 rows	2026-10-17 04:09:12.53353	2026-10-17 04:09:12.53353	0	\N
8cc058cd-0414-4027-973d-ece05b0b3848	66e13007-ea70-490c-a022-ee6ab2569613	eb644996-df05-4147-949f-146235db4296	notifications	SUCCESS	2026-10-17 04:09:12.84	pulled 0 rows	2026-10-17 04:09:12.84646	2026-10-17 04:09:12.84646	0	\N
62cd57e3-b1d3-4fb9-9c8e-d975bcfecbf8	8903bda8-a5d8-427f-873d-853fba5a5166	bde00f80-99ec-4a5c-8e4d-e8b99e2cbeca	sales	SUCCESS	2026-10-17 04:09:12.534	pulled 0 rows	2026-10-17 04:09:12.541681	2026-10-17 04:09:12.541681	0	\N
fece8001-81ee-4419-89ed-fd8a2d6b9b9b	b4c90283-b78b-4763-a30b-98c94d89ec17	601efd1a-41c7-4f6d-9dc6-d0fbd6bfac50	roles	SUCCESS	2026-10-17 04:09:12.823	pulled 0 rows	2026-10-17 04:09:12.829035	2026-10-17 04:09:12.829035	0	\N
7c2b002a-1255-4fe6-bffa-b703e4bdc91b	df68ecf2-be74-402c-ba55-0bc626899a6e	97161179-0c0b-491c-bb54-b081a6d3c1ba	products	SUCCESS	2026-10-17 04:09:39.372	pulled 5 rows	2026-10-17 04:09:39.373773	2026-10-17 04:09:39.373773	0	\N
d27f8894-a0b7-45ae-be0f-0f1425cde88a	daa0d99b-f183-453d-8496-9e96f111c2a3	666ca6f9-23ab-44c2-96fe-c13a0011b58d	expenses	SUCCESS	2026-10-17 04:09:39.474	pulled 0 rows	2026-10-17 04:09:39.474832	2026-10-17 04:09:39.474832	0	\N
a512ec16-3217-4a8a-a607-d5980b706384	52ae1fb2-6adc-4738-91de-7f0b3d6c64cb	aa33b814-c966-470d-a420-97162a21436d	customers	SUCCESS	2026-10-17 04:09:39.529	pulled 0 rows	2026-10-17 04:09:39.530456	2026-10-17 04:09:39.530456	0	\N
af9f763f-cc10-433b-95be-16abd9d8df33	77abbf21-eb0e-4c32-acd7-af6faf20d157	fe56a27b-52e6-4b13-a226-296f728ca0fb	inventories	SUCCESS	2026-10-17 04:09:39.75	pulled 5 rows	2026-10-17 04:09:39.752143	2026-10-17 04:09:39.752143	0	\N
9289c280-e867-40af-930b-8a087f024c1c	8df89b3b-aae6-45d2-b1da-5f947e67fe12	37b3af54-986e-4e62-9cb0-c75a58ede322	inventory-transfers	SUCCESS	2026-10-17 04:09:39.747	pulled 0 rows	2026-10-17 04:09:39.75189	2026-10-17 04:09:39.75189	0	\N
5d7a514f-e60a-42e5-bb15-9e92112457b9	a439d969-6147-496b-b3b8-4a430a3a74c2	ef5bdfa1-cae8-4d53-921c-55e49c168dd2	product-batches	SUCCESS	2026-10-17 04:09:39.786	pulled 1 rows	2026-10-17 04:09:39.787163	2026-10-17 04:09:39.787163	0	\N
e68eecaa-c2df-4e27-8739-5379cf600cd1	55a3bccb-33ba-4e0f-9fe9-fe09c5daaff0	8da0f782-ae50-4897-b1c4-c7466e9f3c67	units-of-measure	SUCCESS	2026-10-17 04:09:40.114	pulled 0 rows	2026-10-17 04:09:40.114874	2026-10-17 04:09:40.114874	0	\N
c8e30772-b381-4852-b31f-a4c8a63c497e	239801ad-f8bd-4b9a-930f-c37f666efbdb	0c7307e9-54a9-4f1a-b726-6e4c174fa3b6	categories	SUCCESS	2026-10-17 04:09:40.126	pulled 0 rows	2026-10-17 04:09:40.129387	2026-10-17 04:09:40.129387	0	\N
4f760535-869f-4d92-b402-9ebf3df098df	34934af1-e72d-4d9d-b344-24b20d1c8772	09012d60-6877-4bfe-9b79-299a81adad1e	suppliers	SUCCESS	2026-10-17 04:09:40.413	pulled 0 rows	2026-10-17 04:09:40.414651	2026-10-17 04:09:40.414651	0	\N
200f8f22-ece2-45a3-a3cd-4651cac75d38	24991555-02d6-4ade-acaa-2b34b440d901	c456498b-14a7-40a3-8279-2f3b63de98d4	branches	SUCCESS	2026-10-17 04:09:40.446	pulled 0 rows	2026-10-17 04:09:40.447401	2026-10-17 04:09:40.447401	0	\N
d418d410-3700-4a0b-9a01-c2f44485bc5c	a41a301d-6465-4227-8730-dea422ab55e0	0d4af4f0-ba7f-4da9-827a-5a13d7bfbfaa	purchases	SUCCESS	2026-10-17 04:09:40.514	pulled 0 rows	2026-10-17 04:09:40.516542	2026-10-17 04:09:40.516542	0	\N
43afaed4-a096-4ddd-a1c8-3f4dc1780950	8e171392-85ec-4563-92cb-b634c84fbc5e	0823f688-1dd3-4f29-a961-d9c26713e178	sales	SUCCESS	2026-10-17 04:09:40.535	pulled 0 rows	2026-10-17 04:09:40.541411	2026-10-17 04:09:40.541411	0	\N
0ccfd01a-efcd-4ebb-8dfa-7f5f0cb2a56f	e086eef0-5ebd-4aa1-83c1-9e086755644e	c61cb395-1757-4b60-9f84-bd81c2a944e8	users	SUCCESS	2026-10-17 04:09:40.543	pulled 0 rows	2026-10-17 04:09:40.545737	2026-10-17 04:09:40.545737	0	\N
9a2682db-96e6-4c04-ba4f-ddd38f256adc	3a9a9f7e-9b70-466a-ace1-5a3a00a31c74	7e4e8f96-2e29-4845-b6c7-dc1483d81450	roles	SUCCESS	2026-10-17 04:09:40.555	pulled 0 rows	2026-10-17 04:09:40.556379	2026-10-17 04:09:40.556379	0	\N
98c1f766-c117-45e3-b34e-8a074f9beba9	9f1139e8-caaa-4440-b911-a7ad153ede87	852fd577-abf7-4a9a-93e3-09c5b450c8ab	products	SUCCESS	2026-10-17 04:09:40.598	pulled 5 rows	2026-10-17 04:09:40.599942	2026-10-17 04:09:40.599942	0	\N
6478fd2e-ce30-4619-ad16-aaedb0d0bc96	925d7c3b-6093-4d88-9d30-66391b11a357	2ecb080a-f94c-4e40-a9ac-e86a372329cf	customers	SUCCESS	2026-10-17 04:09:40.642	pulled 0 rows	2026-10-17 04:09:40.642496	2026-10-17 04:09:40.642496	0	\N
f83a7d4e-b0e2-4b3b-9748-2c5839fb1775	14f531f9-0787-48e8-9ee5-7ab4c4cf312c	0426d978-38d5-4b71-9008-ca71e1c4d85a	expenses	SUCCESS	2026-10-17 04:09:40.677	pulled 0 rows	2026-10-17 04:09:40.677579	2026-10-17 04:09:40.677579	0	\N
432025c3-7683-4ea9-9d22-e323423f63ee	e5a521cd-998a-4b3c-a745-da073ae462cb	f81ba0f9-d55e-4914-90cd-5879684d0508	inventory-transfers	SUCCESS	2026-10-17 04:09:40.72	pulled 0 rows	2026-10-17 04:09:40.721332	2026-10-17 04:09:40.721332	0	\N
4ecc1b0e-ef26-426b-8bd0-04c23f3d6ef7	846ab512-0089-4b53-8916-d8dfd7aa1815	12840266-39a4-4243-829b-57c71b422cd9	inventories	SUCCESS	2026-10-17 04:09:40.743	pulled 5 rows	2026-10-17 04:09:40.744059	2026-10-17 04:09:40.744059	0	\N
2cfdfd26-d900-4735-9707-8d09bb12bf7a	3ebf3f66-db8c-45cf-8190-2a07db982f20	c0966dae-fa1f-47b4-a676-75e23315a9f5	product-batches	SUCCESS	2026-10-17 04:09:40.75	pulled 1 rows	2026-10-17 04:09:40.753979	2026-10-17 04:09:40.753979	0	\N
4611229e-ce13-44d7-8e38-8ad1718f9a9e	eb16c6e0-cf96-4883-bfc6-381a6cfeb622	3b121c19-4b5b-4d64-b04e-e5462fb16cc7	categories	SUCCESS	2026-10-17 04:09:40.937	pulled 0 rows	2026-10-17 04:09:40.938185	2026-10-17 04:09:40.938185	0	\N
7ebe47a9-f5cb-497d-9443-fb4015b6e77c	49638c0c-177a-4a01-ad7a-bc851bf4a5a6	9f068d90-37dd-4706-bdc0-7b0a6c8b3df7	notifications	SUCCESS	2026-10-17 04:09:40.939	pulled 0 rows	2026-10-17 04:09:40.940268	2026-10-17 04:09:40.940268	0	\N
41a98a70-8fd6-4aef-8a9d-332f2af43f6a	b27a7cc5-c208-41c3-a5d7-bfdaaf1a7963	d6842143-e73b-4684-b182-9ce75cffc662	suppliers	SUCCESS	2026-10-17 04:09:40.941	pulled 0 rows	2026-10-17 04:09:40.943198	2026-10-17 04:09:40.943198	0	\N
ad59a6f4-4a52-4f87-a0bc-91d08af2ac0d	9a40e8ac-c821-4686-8824-1075bf76541c	6be3fcf4-139b-4302-ad33-57c025a36346	units-of-measure	SUCCESS	2026-10-17 04:09:41.013	pulled 0 rows	2026-10-17 04:09:41.014233	2026-10-17 04:09:41.014233	0	\N
b4722f81-0a8f-4997-84a8-8dd64cc50bf3	2de1d430-b4a8-4478-ba4a-d20c2bf27f1e	6acc3216-8167-4856-bb8f-eb545bbd460a	branches	SUCCESS	2026-10-17 04:09:41.014	pulled 0 rows	2026-10-17 04:09:41.016073	2026-10-17 04:09:41.016073	0	\N
637f5707-33bd-4683-8aba-13d3aca34491	07483888-a33b-42b0-b3d0-ca488f2499fd	d46961af-3d42-4400-b2cd-ea328f17f856	sales	SUCCESS	2026-10-17 04:09:41.073	pulled 0 rows	2026-10-17 04:09:41.07464	2026-10-17 04:09:41.07464	0	\N
a485322b-2713-4f23-888a-3d5c145da097	e204bd5a-1ba9-4c9e-b93e-d36881e7a204	0f5181d0-36b9-4900-a9f4-63fd3e8c8012	roles	SUCCESS	2026-10-17 04:09:41.344	pulled 0 rows	2026-10-17 04:09:41.35076	2026-10-17 04:09:41.35076	0	\N
2aec85da-9cc8-4b18-acf9-598cfa95ed64	088b3d61-50a1-49e1-82c8-569c16f8b8fa	ee80f452-d200-4efa-a3f2-50f0353f1d55	purchases	SUCCESS	2026-10-17 04:09:41.353	pulled 0 rows	2026-10-17 04:09:41.356084	2026-10-17 04:09:41.356084	0	\N
5ce3bb7e-6aa9-4797-9be1-ab2d6ffb1a36	93bf6de3-b17a-4733-9a1a-bbbfcf2c1ba1	791d2782-0c6a-40ef-b74f-6e45247c4d89	notifications	SUCCESS	2026-10-17 04:09:41.39	pulled 0 rows	2026-10-17 04:09:41.392517	2026-10-17 04:09:41.392517	0	\N
96b8d446-3310-4b52-834d-b60d20ae9332	dfef7eb4-041a-4128-873b-fd64421b7656	fd306af5-1ea5-4ba0-b7f6-0db28faf002a	users	SUCCESS	2026-10-17 04:09:41.392	pulled 0 rows	2026-10-17 04:09:41.394459	2026-10-17 04:09:41.394459	0	\N
29058628-ed0a-42cd-8fa1-d85711804d24	c5a6a0bf-45ea-407a-ba1c-e11385164474	8ff6ce23-30d2-4a45-9faf-52ec24ed40de	products	SUCCESS	2026-10-17 04:10:14.01	pulled 5 rows	2026-10-17 04:10:14.011332	2026-10-17 04:10:14.011332	0	\N
9f9bc4fb-605d-4835-9b63-2588f392ae5a	9e0f9b74-3905-49d6-aa8c-308c817e5af3	3cb5317a-377d-469a-a08b-a21c0986538b	product-batches	SUCCESS	2026-10-17 04:10:14.251	pulled 1 rows	2026-10-17 04:10:14.25445	2026-10-17 04:10:14.25445	0	\N
9cf24ac4-98fa-4d7c-b428-7ee9e9917b30	1a67f114-e36e-4496-8808-f1b5872bf511	79addaf5-7e27-4b45-b672-11780b7628b4	customers	SUCCESS	2026-10-17 04:10:14.46	pulled 0 rows	2026-10-17 04:10:14.464204	2026-10-17 04:10:14.464204	0	\N
f6848318-6d19-4194-9aac-8b96436c3bf2	1b15a5f9-7de2-491f-a812-8b83655de058	26ec7c58-f69d-4f49-8c6a-33e2ce01205f	expenses	SUCCESS	2026-10-17 04:10:14.87	pulled 0 rows	2026-10-17 04:10:14.875264	2026-10-17 04:10:14.875264	0	\N
a6b3efca-278b-42c7-9c4e-699d86c2435f	5fa14d3d-811c-4744-9b64-4366b79a411d	65d16fc0-d7b9-4aa9-800b-a542bb3f746a	inventory-transfers	SUCCESS	2026-10-17 04:10:14.855	pulled 0 rows	2026-10-17 04:10:14.857246	2026-10-17 04:10:14.857246	0	\N
fd3f8988-6ce5-4b78-bcd0-57d94987bf89	8bfbc60c-4670-4e30-90c1-dbf2bf1a734c	de5e70f3-bfd9-48c9-825d-1275df822954	inventories	SUCCESS	2026-10-17 04:10:14.781	pulled 5 rows	2026-10-17 04:10:14.81515	2026-10-17 04:10:14.81515	0	\N
4aa91139-c03a-49f8-b004-0ad2d3686f40	da898c8d-c7a8-43cf-b2e1-bab7d5b3d2ac	3798f9a0-4752-4083-b88c-53363873d4ba	units-of-measure	SUCCESS	2026-10-17 04:10:15.15	pulled 0 rows	2026-10-17 04:10:15.152204	2026-10-17 04:10:15.152204	0	\N
48a21171-e535-43b9-96bc-63fcff990470	e68161e5-2203-4a78-896a-c679f7674cbd	b5cd4fc3-17c8-48de-8b84-d1edf5c335c6	categories	SUCCESS	2026-10-17 04:10:15.23	pulled 0 rows	2026-10-17 04:10:15.247656	2026-10-17 04:10:15.247656	0	\N
5b562a79-772c-4500-acdf-e04ff3794caa	41da846b-4c7d-4c3a-aa20-6438d5cfb2f6	e369c790-3fea-4f97-949d-27645a915b82	suppliers	SUCCESS	2026-10-17 04:10:15.257	pulled 0 rows	2026-10-17 04:10:15.259295	2026-10-17 04:10:15.259295	0	\N
638912ee-ff53-4588-b234-afeeb3334c22	a7f3fa49-c03a-4fbe-87ae-a3ba2107db98	6b95c94d-558b-4b05-92b2-665ce890f9a4	purchases	SUCCESS	2026-10-17 04:10:15.258	pulled 0 rows	2026-10-17 04:10:15.259943	2026-10-17 04:10:15.259943	0	\N
99cfbae7-0c42-4556-b491-0bdc8f1f84a3	e9b08ecb-e4ae-470d-8419-854531da972d	8be5ebc6-36b3-4d21-982b-f3e4d7b019b9	users	SUCCESS	2026-10-17 04:10:15.362	pulled 0 rows	2026-10-17 04:10:15.374681	2026-10-17 04:10:15.374681	0	\N
549a5ae5-3a4c-4fdc-b12c-8026fd25db3d	d62b54de-4a5f-4903-972c-d8cc6f96ea2c	098fd845-9da7-437d-ad92-e1b79ef20648	notifications	SUCCESS	2026-10-17 04:10:15.481	pulled 0 rows	2026-10-17 04:10:15.481448	2026-10-17 04:10:15.481448	0	\N
7f448474-82a9-4b01-a513-9a51e648dbc8	9648e97f-3f6d-4144-a018-fd457d963c49	6e434c54-78df-4f83-9cfb-20457296c861	sales	SUCCESS	2026-10-17 04:10:15.55	pulled 0 rows	2026-10-17 04:10:15.551031	2026-10-17 04:10:15.551031	0	\N
e619af99-9732-4251-8cf3-9dc78e59108e	526a4857-ab12-4c8a-9990-224d5356646d	4f1793d3-8fff-463b-9828-b983526781f0	branches	SUCCESS	2026-10-17 04:10:15.279	pulled 0 rows	2026-10-17 04:10:15.289028	2026-10-17 04:10:15.289028	0	\N
ee08f2ab-8950-442a-823f-ad581851635f	c63bb0df-d487-4ff7-90e2-34714fdcecd1	f22ef8d8-4676-4170-8d2c-5ef1bc9464e6	roles	SUCCESS	2026-10-17 04:10:15.37	pulled 0 rows	2026-10-17 04:10:15.371469	2026-10-17 04:10:15.371469	0	\N
ff90ef67-8b13-4187-bc8a-0ccccd25fce2	7a85cdaf-f864-45f2-8523-997694ac1ea8	9d69d824-5abe-47ae-aeb7-296beb38134d	expenses	SUCCESS	2026-10-17 04:10:51.273	pulled 0 rows	2026-10-17 04:10:51.286603	2026-10-17 04:10:51.286603	0	\N
a71c0d2a-6647-41e0-9649-fa782f993c43	ad3275cb-b7e7-40da-82c8-36bb7997f60d	29ca3c21-4c85-4a64-a905-d77ed69beacd	products	SUCCESS	2026-10-17 04:10:51.338	pulled 5 rows	2026-10-17 04:10:51.343158	2026-10-17 04:10:51.343158	0	\N
716d3f99-3e9d-4084-8106-a45abdeb297a	4c428864-4462-4102-8582-5fe6dc1094c4	810732bd-e7f9-4455-8250-5242a588ec5e	inventories	SUCCESS	2026-10-17 04:10:52.08	pulled 5 rows	2026-10-17 04:10:52.083138	2026-10-17 04:10:52.083138	0	\N
fc0a5007-6bc2-4a99-9411-31d2b280e2bd	f77ef350-ab1c-46fa-9a6f-699d335736a6	c5c2b3c5-2031-4fb1-9f69-42a29e1323bf	customers	SUCCESS	2026-10-17 04:10:52.097	pulled 0 rows	2026-10-17 04:10:52.112133	2026-10-17 04:10:52.112133	0	\N
57160c6d-db0d-4e1f-b34b-892e792aec54	9eb236a7-a57c-4fb4-b4fd-fdda04e21897	e9f3f561-40f4-47e1-a96a-7f990fda1d69	inventory-transfers	SUCCESS	2026-10-17 04:10:52.131	pulled 0 rows	2026-10-17 04:10:52.144076	2026-10-17 04:10:52.144076	0	\N
b62e7346-c4be-420a-82fc-7db12389dce0	2867113e-4324-4ee3-a256-822e7aef237a	81bb8ea1-a9ae-455b-b15a-32dda814bb17	product-batches	SUCCESS	2026-10-17 04:10:54.033	pulled 1 rows	2026-10-17 04:10:54.080128	2026-10-17 04:10:54.080128	0	\N
dd5d4faf-d9b0-4a3d-9cb3-bc81265ec13f	f741d12a-74d3-4b07-8078-d708bcc04bf3	d9c9c298-1ec5-4d83-bd9e-f4a55c62c83a	categories	SUCCESS	2026-10-17 04:10:55.32	pulled 0 rows	2026-10-17 04:10:55.463527	2026-10-17 04:10:55.463527	0	\N
0cc0307b-d0ef-4e2f-9168-a6d70088ffe2	4abf58a6-c8c0-4033-98a1-5cc81e96d3be	55304ad8-e64b-4e21-922b-c4c25d4b770a	units-of-measure	SUCCESS	2026-10-17 04:10:56.187	pulled 0 rows	2026-10-17 04:10:56.203303	2026-10-17 04:10:56.203303	0	\N
f474c2c5-c5d3-4f31-b0ad-accd116b56df	1bb581a5-472b-444d-ab1a-ac348a48076b	6cb33b66-72d8-4aa8-807a-bc477dee580b	branches	SUCCESS	2026-10-17 04:10:56.183	pulled 0 rows	2026-10-17 04:10:56.207099	2026-10-17 04:10:56.207099	0	\N
cad48077-000c-4384-b820-b0055ee61f81	e2153216-9361-4fe7-a20f-eb799d4f607f	d01f5174-0e1e-4ad3-b942-bb7db4703aec	suppliers	SUCCESS	2026-10-17 04:10:58.389	pulled 0 rows	2026-10-17 04:10:58.39745	2026-10-17 04:10:58.39745	0	\N
19a84d73-517b-42d3-9eb1-2b7c6cf292be	43f9d452-14d5-4e66-873a-84dd02ed8b6d	603316b5-69aa-4a29-9cc7-0ac73b195a61	purchases	SUCCESS	2026-10-17 04:10:59.482	pulled 0 rows	2026-10-17 04:10:59.565501	2026-10-17 04:10:59.565501	0	\N
c1896752-8fb1-4311-9095-61dbc27fe501	67016b38-8edb-429e-b0c5-323c557a62e4	20ea6b51-a8dd-4a78-8b13-918e903c50cf	sales	SUCCESS	2026-10-17 04:10:59.676	pulled 0 rows	2026-10-17 04:10:59.825386	2026-10-17 04:10:59.825386	0	\N
0b6e0f97-6307-4b75-b098-0774b0b09477	2c1eee82-326a-47dd-b318-f8b36ef56ad4	fb9799ae-d781-4b99-a65b-30ac47a7d34e	roles	SUCCESS	2026-10-17 04:11:00.331	pulled 0 rows	2026-10-17 04:11:00.339448	2026-10-17 04:11:00.339448	0	\N
190b32ce-a8f5-4650-bb24-9eacdd4d9d26	22b5f0da-1a2a-4c6c-b970-d881ff70c187	962676fd-ca9e-435b-aaef-99379ae6ec5e	users	SUCCESS	2026-10-17 04:11:00.599	pulled 0 rows	2026-10-17 04:11:00.647694	2026-10-17 04:11:00.647694	0	\N
025a9422-6926-4c2e-888f-d20280e791da	04c8c5f4-ff82-41d3-a260-cef15a0b5074	96f2d8f9-54f2-4a20-ae12-b81ad6c554a6	customers	SUCCESS	2026-10-17 04:11:01.265	pulled 0 rows	2026-10-17 04:11:01.283642	2026-10-17 04:11:01.283642	0	\N
e5bdb57c-083a-4559-88f2-823768b9038c	08b0765b-4490-4b35-b2f4-fe1b7b02dd43	24bc96df-7f18-41cd-a244-f3023e1300eb	products	SUCCESS	2026-10-17 04:11:01.384	pulled 5 rows	2026-10-17 04:11:01.427839	2026-10-17 04:11:01.427839	0	\N
a67e6007-8f15-4892-814d-54c4bc475f45	98035733-7463-40ea-8bc0-1ec221c86591	248db500-d620-44e5-abcd-62774c822094	inventories	SUCCESS	2026-10-17 04:11:01.648	pulled 5 rows	2026-10-17 04:11:01.656981	2026-10-17 04:11:01.656981	0	\N
bb89090b-53a3-46bf-87e1-35a6d1c7d7de	729330b1-f8f0-460d-8845-1e5c3bffe200	8957c422-b312-4098-8a73-f2975a1c58b6	expenses	SUCCESS	2026-10-17 04:11:01.794	pulled 0 rows	2026-10-17 04:11:01.803416	2026-10-17 04:11:01.803416	0	\N
41216e59-b1ea-49ae-af0f-68b08cec67f1	0aec9be4-bc79-47c5-8ddb-b1f99ecf374a	a3e962dd-eb41-4ad1-aa3f-09b56afda551	inventory-transfers	SUCCESS	2026-10-17 04:11:02.926	pulled 0 rows	2026-10-17 04:11:02.927505	2026-10-17 04:11:02.927505	0	\N
2b9bfefa-5f25-48fb-b95f-d4f47402c03c	75ac3dc9-5ca7-4b7f-a15b-902bc681f1f2	f2a7cb8e-6861-4ef1-a175-b3c06c761481	product-batches	SUCCESS	2026-10-17 04:11:03.038	pulled 1 rows	2026-10-17 04:11:03.075646	2026-10-17 04:11:03.075646	0	\N
b991d933-1645-4616-bc93-999806b54a75	16212723-617d-463c-bdab-1732bcf03186	46d21b1c-29f7-4728-8e53-f761cc4209a3	notifications	SUCCESS	2026-10-17 04:11:03.124	pulled 0 rows	2026-10-17 04:11:03.135358	2026-10-17 04:11:03.135358	0	\N
64d00288-3278-47f3-b521-38a94acc5ea1	9f2c4990-474c-42b2-87de-9c20a1c83c26	87fd98df-393d-47e0-b382-60fc62ac0216	units-of-measure	SUCCESS	2026-10-17 04:11:03.291	pulled 0 rows	2026-10-17 04:11:03.308135	2026-10-17 04:11:03.308135	0	\N
2917b9e7-fe8a-40a1-8419-77df9c241d4a	7875422f-3d2c-4b12-bc3e-4cdb0d8851b7	c66c86a6-5e6a-4c8a-b931-1900e3421067	categories	SUCCESS	2026-10-17 04:11:04.138	pulled 0 rows	2026-10-17 04:11:04.14601	2026-10-17 04:11:04.14601	0	\N
04b534b4-500b-47e6-8938-82f295246e7d	a93904aa-763e-4a5a-879a-c1643ad931c5	48a3e334-0f1e-4a45-b486-fa1c111f6b68	branches	SUCCESS	2026-10-17 04:11:04.153	pulled 0 rows	2026-10-17 04:11:04.153873	2026-10-17 04:11:04.153873	0	\N
08651242-b40a-43ad-acef-effe55ae52c8	e23645b4-5a93-4126-b140-7e6050e0fe4a	1fb3dd3f-7640-4e5e-b432-dd6456d6c766	purchases	SUCCESS	2026-10-17 04:11:04.609	pulled 0 rows	2026-10-17 04:11:04.616968	2026-10-17 04:11:04.616968	0	\N
2fbd02c8-7823-46fe-9219-e8ad49ee1f90	98f70ca1-a242-4437-9a46-827ca67b6886	29af30b2-039e-4d08-ad3e-e402a64b0d09	sales	SUCCESS	2026-10-17 04:11:04.61	pulled 0 rows	2026-10-17 04:11:04.657254	2026-10-17 04:11:04.657254	0	\N
483bfc41-16e9-45a3-9cdf-d16f83b3f180	8f3b467a-5025-4b75-834c-d2b173453550	666a8ab8-688b-41d0-afd1-684aa90ec2cd	roles	SUCCESS	2026-10-17 04:11:05.075	pulled 0 rows	2026-10-17 04:11:05.101988	2026-10-17 04:11:05.101988	0	\N
37fe832f-315e-4e8e-a997-123870578ae9	9b470523-a0ed-4819-a577-98b982a432c7	aba55aeb-5119-481f-b395-c12c7d5129f3	suppliers	SUCCESS	2026-10-17 04:11:05.105	pulled 0 rows	2026-10-17 04:11:05.10623	2026-10-17 04:11:05.10623	0	\N
0b8b22eb-3c32-48ec-a56a-cc3f386630d9	c3db3c37-a5f7-4050-bdf5-e4ecafe790ac	3c46a9e1-7926-40b3-878d-bfdf996df03c	users	SUCCESS	2026-10-17 04:11:05.189	pulled 0 rows	2026-10-17 04:11:05.233479	2026-10-17 04:11:05.233479	0	\N
399e570e-ef07-4f8c-b61b-5f94045f1e18	69b97107-25c9-4d38-9a3d-084f390e7ca4	3fad061f-dd7c-4cf7-a24b-6c1a0365d195	notifications	SUCCESS	2026-10-17 04:11:05.531	pulled 0 rows	2026-10-17 04:11:05.531557	2026-10-17 04:11:05.531557	0	\N
41ba0d5c-f48f-4b3e-ac81-bd8f709c2a6c	513d7526-de2d-451e-9026-0908e41c1921	427a185f-4aeb-4290-867d-78babc929072	inventory-transfers	SUCCESS	2026-10-17 04:11:46.004	pulled 0 rows	2026-10-17 04:11:46.050583	2026-10-17 04:11:46.050583	0	\N
086218d7-9464-4303-8b6d-08752870147f	6c7c9bf1-2902-4e9c-9c1e-0941bf10a5a4	b98895cb-5dd8-4975-ba6f-1444ae249dea	product-batches	SUCCESS	2026-10-17 04:11:49.634	pulled 1 rows	2026-10-17 04:11:49.798663	2026-10-17 04:11:49.798663	0	\N
bf3150a0-9e3f-4808-9b49-b0694ba34a52	74c0aa4b-727d-4f8d-a390-c255923797eb	f1ccdbda-6bc9-48ea-b09b-6deb8fc2e911	customers	SUCCESS	2026-10-17 04:11:50.847	pulled 0 rows	2026-10-17 04:11:50.860816	2026-10-17 04:11:50.860816	0	\N
c76375e1-f5c2-4641-b2c6-e4f41367b0a0	6e25c9eb-f811-4e1a-95ef-c47ef4c66c26	8ac5d092-54ed-44f6-944a-24b9ef956717	inventories	SUCCESS	2026-10-17 04:11:50.682	pulled 5 rows	2026-10-17 04:11:50.693559	2026-10-17 04:11:50.693559	0	\N
ff15a6a2-5f48-43b1-811c-f5f8353b7e3b	d8c1cdac-c1c1-4482-9360-1846f50fac09	15dfc6e3-ebf0-4214-92a2-f17219eecd16	categories	SUCCESS	2026-10-17 04:11:51.186	pulled 0 rows	2026-10-17 04:11:51.25782	2026-10-17 04:11:51.25782	0	\N
c406b3b6-2882-48f2-a5f2-370fca5644e4	46cc29ca-bf70-420f-8fbb-b73b21caffca	e51375a3-c40e-48c4-9430-fa561ac27769	expenses	SUCCESS	2026-10-17 04:11:50.712	pulled 0 rows	2026-10-17 04:11:50.729815	2026-10-17 04:11:50.729815	0	\N
6ee5ec37-2d17-4392-966b-d364a93efc11	ce0e3e93-2e1b-4039-99d6-f4bc43f5bef4	23c3fbda-0955-48f6-a8fd-b9cb186eda0c	products	SUCCESS	2026-10-17 04:11:51.376	pulled 5 rows	2026-10-17 04:11:51.378732	2026-10-17 04:11:51.378732	0	\N
cade30bb-e688-43f6-b678-90c9a46c305b	9580c58c-a5fd-4c5e-b9c0-0c5ad4b1c0a3	59348a4b-31b2-4436-a737-9ef2955add37	branches	SUCCESS	2026-10-17 04:11:52.066	pulled 0 rows	2026-10-17 04:11:52.067162	2026-10-17 04:11:52.067162	0	\N
4bfd17b8-2dd5-49f0-bf3f-49d63b1ec8c6	ae4dcbd5-5c17-4091-8b60-b160f3038318	dfb067c2-cbd8-4bab-9ea5-7e01211cd40e	suppliers	SUCCESS	2026-10-17 04:11:52.704	pulled 0 rows	2026-10-17 04:11:52.722735	2026-10-17 04:11:52.722735	0	\N
5888810d-c111-43e0-894d-41bfefafbe28	f01869d2-6926-4f94-8dc7-876f3ef4896b	ccefd957-36e0-4b27-9c21-8a0f15cfe430	units-of-measure	SUCCESS	2026-10-17 04:11:53.089	pulled 0 rows	2026-10-17 04:11:53.090669	2026-10-17 04:11:53.090669	0	\N
d3b4d4a5-8208-421c-977c-6c50ea3af2c1	f1ff08da-fe19-4602-a084-178e8ac7e55a	409a44ea-1487-454e-a0ff-afd19f8b3fee	sales	SUCCESS	2026-10-17 04:11:53.392	pulled 0 rows	2026-10-17 04:11:53.57579	2026-10-17 04:11:53.57579	0	\N
1718d210-c851-494a-8296-0387f1239a09	b27415b1-fc54-4a9f-91d3-14b7dd6fa749	55debb71-be10-47af-a8bb-e662c0fdba68	roles	SUCCESS	2026-10-17 04:11:54.273	pulled 0 rows	2026-10-17 04:11:54.273697	2026-10-17 04:11:54.273697	0	\N
d85dc430-97b0-49ff-9f61-4a7883c2bc4d	dd77c011-0f46-48e6-893d-d0d795e1cf42	8626107a-baa7-4929-ba84-60ed33f1ba4b	purchases	SUCCESS	2026-10-17 04:11:53.654	pulled 0 rows	2026-10-17 04:11:53.660013	2026-10-17 04:11:53.660013	0	\N
8d75f030-a6be-458d-9e52-aa6e7329d7b5	11533884-3270-49c4-83e9-603370c591d8	3fb0f9cd-70ff-4c55-b178-6439a695da8c	inventory-transfers	SUCCESS	2026-10-17 04:12:43.411	pulled 0 rows	2026-10-17 04:12:43.438659	2026-10-17 04:12:43.438659	0	\N
ece4646c-5b9d-4137-b493-6eed631bb007	409575bf-bc72-4995-8955-10b28830e34f	ea1d67e4-309c-4bd1-a316-fdb04a1b50d5	products	SUCCESS	2026-10-17 04:12:44.186	pulled 5 rows	2026-10-17 04:12:44.212583	2026-10-17 04:12:44.212583	0	\N
f8d5695c-5feb-46ed-9b9c-c6eed334811d	99f81d47-19d5-4118-bd4d-48aa060ab547	70abf80a-6c99-49f6-81f4-0b91ead4e7f5	product-batches	SUCCESS	2026-10-17 04:12:44.266	pulled 1 rows	2026-10-17 04:12:44.315899	2026-10-17 04:12:44.315899	0	\N
d71395ca-216c-46a6-8f24-d3714cc10541	d3be3360-cdab-40bc-b639-9ec5135a7bfa	fc31946c-07ef-4f70-8fdb-b5b61a0c437e	categories	SUCCESS	2026-10-17 04:12:44.636	pulled 0 rows	2026-10-17 04:12:44.66128	2026-10-17 04:12:44.66128	0	\N
a7512cb7-1d42-47ea-8bb1-33309a618cb4	fbc44247-7d67-4f0e-9a08-a9e6d7312646	698a0fbe-51b5-4d7f-a5a4-32647f561f74	inventories	SUCCESS	2026-10-17 04:12:44.606	pulled 5 rows	2026-10-17 04:12:44.612111	2026-10-17 04:12:44.612111	0	\N
f54dd749-bbd8-4e97-be86-2923edae3315	cd8a3735-2fb4-43df-a8fd-d55f2ded2cf5	ee4dcc42-4dc8-48c0-a943-1be50e43bc9d	suppliers	SUCCESS	2026-10-17 04:12:44.945	pulled 0 rows	2026-10-17 04:12:44.945797	2026-10-17 04:12:44.945797	0	\N
1d6de550-a450-4499-b8e7-e7bf3c4886f4	1a450b3b-db48-40fd-89ce-baf105e4c4c1	6f8330cc-5335-4966-92c8-d2935da448a4	branches	SUCCESS	2026-10-17 04:12:45.145	pulled 0 rows	2026-10-17 04:12:45.145609	2026-10-17 04:12:45.145609	0	\N
ed7b394b-dbe9-4809-be94-4baab445bd11	ee46bb0f-c361-43de-ae2b-0f4688904c06	e7465af6-eaec-4bec-abbd-4b09457cc5a1	users	SUCCESS	2026-10-17 04:12:45.4	pulled 0 rows	2026-10-17 04:12:45.40679	2026-10-17 04:12:45.40679	0	\N
b9f3fbfb-7f23-4102-83f5-b0eb12a46ef1	a7d740e9-1516-4bee-bd4e-e2257339da92	1843bdbd-2e51-4072-a92a-e3da83c31589	sales	SUCCESS	2026-10-17 04:12:45.401	pulled 0 rows	2026-10-17 04:12:45.407943	2026-10-17 04:12:45.407943	0	\N
fd35c1f3-2c98-45e0-9d01-14ebc62b86b3	70576032-74fc-41b4-bbb9-12b0718ce1a8	a474b9b0-30bf-4d22-ab27-1fb22f78e691	roles	SUCCESS	2026-10-17 04:12:45.437	pulled 0 rows	2026-10-17 04:12:45.486239	2026-10-17 04:12:45.486239	0	\N
1471740a-04e8-4bfa-b457-58b5e39266f4	4ae9b504-0a67-4e4d-beac-71b7a4fe00d9	7ec171d9-180f-43da-95f7-6aa00d40b058	notifications	SUCCESS	2026-10-17 04:12:45.938	pulled 0 rows	2026-10-17 04:12:45.95425	2026-10-17 04:12:45.95425	0	\N
6a2c841d-fcd3-48d6-8ae4-29894126d563	0acc9e0a-1363-4a72-b4b3-eccd2443bbfe	c996e14b-9401-4400-93b8-60a295d5903b	customers	SUCCESS	2026-10-17 04:27:09.526	pulled 0 rows	2026-10-17 04:27:09.526973	2026-10-17 04:27:09.526973	0	\N
fe13a183-d20b-42e4-a052-c90b4029e1b5	86fd6247-9365-4316-88a5-fa3de7276d2f	4de17ba5-3379-43ee-b032-b8ae5c55ed00	inventories	SUCCESS	2026-10-17 04:27:09.531	pulled 5 rows	2026-10-17 04:27:09.532211	2026-10-17 04:27:09.532211	0	\N
10971a71-9858-4aa0-9db2-a4fd5c3ead3c	7090477d-1fff-4a22-95ac-c1ab2e6e0ab6	30eeef8a-b724-463e-84ac-84e685f0baf0	product-batches	SUCCESS	2026-10-17 04:27:09.8	pulled 1 rows	2026-10-17 04:27:09.801668	2026-10-17 04:27:09.801668	0	\N
530a1ac6-3655-40fc-9ce0-49bb9fcad566	67b3ad13-806d-4c5b-9b02-c6167ca22306	f901ea6d-b591-4ea9-8c3c-2b5b8f56d431	branches	SUCCESS	2026-10-17 04:27:10.148	pulled 0 rows	2026-10-17 04:27:10.149405	2026-10-17 04:27:10.149405	0	\N
21c75459-3709-4e79-a9a8-cd918cdfbe14	54616fd7-003b-41fa-8b4b-b9f88fcc2cae	57631c1c-e361-43e4-a631-a890f6de493d	units-of-measure	SUCCESS	2026-10-17 04:27:10.183	pulled 0 rows	2026-10-17 04:27:10.187335	2026-10-17 04:27:10.187335	0	\N
7760b42b-152f-4ecf-b1f1-8339a396037a	1908f3f3-d412-43c0-88ab-f6c03a81d253	54fc1028-4363-4f53-ac17-8028935c0ce9	purchases	SUCCESS	2026-10-17 04:27:10.249	pulled 0 rows	2026-10-17 04:27:10.250338	2026-10-17 04:27:10.250338	0	\N
c4de924f-91ac-494d-8c3f-71bf4db22306	0981b192-f69a-4812-a2d8-66c0a44b255f	f535f521-fe92-4ec0-a31d-67eafe13331d	users	SUCCESS	2026-10-17 04:27:10.596	pulled 0 rows	2026-10-17 04:27:10.60315	2026-10-17 04:27:10.60315	0	\N
c8cc5f48-f497-483a-876f-58da82686f1f	f7401ce6-5f87-4331-8ab5-ba72088d7df7	1325459b-370b-43b0-99e9-e6d2c76d1f5c	suppliers	SUCCESS	2026-10-17 04:27:10.603	pulled 0 rows	2026-10-17 04:27:10.605017	2026-10-17 04:27:10.605017	0	\N
d00d36e4-e68f-42d8-a441-13473eb250ba	1f9b2fa9-7c74-4ede-b285-d8e3ce47b433	28b067a5-62fd-4613-868b-7e6f5a502ff3	customers	SUCCESS	2026-10-17 04:27:10.865	pulled 0 rows	2026-10-17 04:27:10.867422	2026-10-17 04:27:10.867422	0	\N
992f6cab-384a-4d8b-8fb2-6b77b3638a83	93da2f40-70b2-4f46-b020-8fcb758f729c	1799bb7b-72dd-4016-91a7-a5d1107e999b	inventories	SUCCESS	2026-10-17 04:27:10.885	pulled 5 rows	2026-10-17 04:27:10.88614	2026-10-17 04:27:10.88614	0	\N
09d63460-3511-45a2-92cc-9483f394d23d	4cb98922-7f32-4d9d-a755-8e13d4551873	2635ac2f-28b9-4e0c-a2cd-b640a908d496	sales	SUCCESS	2026-10-17 04:27:11.152	pulled 0 rows	2026-10-17 04:27:11.157579	2026-10-17 04:27:11.157579	0	\N
2dcfc033-4fe8-44a8-9c39-05b27601d7c3	33a5d4b3-8c6e-40cd-be6d-7e84416f19b1	6c462148-c9a9-427b-86c3-6b8fcbf68cc3	product-batches	SUCCESS	2026-10-17 04:27:11.165	pulled 1 rows	2026-10-17 04:27:11.16675	2026-10-17 04:27:11.16675	0	\N
eb49c084-3bd2-4d01-a443-418abf1f1522	4377f125-c842-4bc1-9993-59e13ef56935	f0c373d1-6178-4035-897c-dda7c991861b	products	SUCCESS	2026-10-17 04:27:50.088	pulled 5 rows	2026-10-17 04:27:50.088743	2026-10-17 04:27:50.088743	0	\N
f1f300c2-30e2-451f-9b97-44098937aa14	afb20bcc-1f2a-4e38-943e-6da6467ad609	8325a6cd-b5e6-42b9-a5f8-578d61225bdc	customers	SUCCESS	2026-10-17 04:27:50.152	pulled 0 rows	2026-10-17 04:27:50.152373	2026-10-17 04:27:50.152373	0	\N
ab6f9b43-74bd-4b12-9548-6f1b3cd96097	8b530f68-e740-4831-8305-8519d4cbfe2c	cb645a33-fcae-42ba-903d-d848f3c6b074	inventories	SUCCESS	2026-10-17 04:27:50.168	pulled 5 rows	2026-10-17 04:27:50.169116	2026-10-17 04:27:50.169116	0	\N
cde936c9-e0b8-48dc-aeba-2c55f2e673d3	531377f6-2209-4a42-b040-e6003d5ef060	a6ac18ae-4f64-4e12-a522-486c8327f308	units-of-measure	SUCCESS	2026-10-17 04:27:50.608	pulled 0 rows	2026-10-17 04:27:50.608938	2026-10-17 04:27:50.608938	0	\N
125e076a-15f0-4b51-ac74-fa8466556f3c	e65ce234-c53d-4688-87a3-9aca012d88bc	7b313591-44f5-4bb6-904b-31ad13458141	branches	SUCCESS	2026-10-17 04:27:50.877	pulled 0 rows	2026-10-17 04:27:50.878578	2026-10-17 04:27:50.878578	0	\N
a8649dc5-6dc6-45b1-b428-71293bc783a7	791b610b-b6b6-4895-a88d-93a0f768c659	e88d2ae0-942e-4c13-8f5b-168e8ebc8fb3	sales	SUCCESS	2026-10-17 04:27:50.882	pulled 0 rows	2026-10-17 04:27:50.885794	2026-10-17 04:27:50.885794	0	\N
12fde27d-38ab-4a03-a26d-f21a6cedb2f1	77674fd0-7b71-4249-97f4-a083d01d8869	6534ce58-0e62-472f-8d9f-7d05b2fc0500	purchases	SUCCESS	2026-10-17 04:27:50.894	pulled 0 rows	2026-10-17 04:27:50.896162	2026-10-17 04:27:50.896162	0	\N
b6d28927-fe07-4019-8d6f-e1790256e81a	f4541eb0-a743-42d1-8e19-b1305a30d3bd	0229455e-5896-47cd-9087-bbcc27d387cc	notifications	SUCCESS	2026-10-17 04:27:50.969	pulled 0 rows	2026-10-17 04:27:50.970258	2026-10-17 04:27:50.970258	0	\N
341f5875-33b5-4bc2-bedc-4f7e8e154638	0d0d857f-c53e-4951-93b0-9b916e0a5f26	1cf9ff3f-c8b1-4c3d-8e9c-1472e2546e77	expenses	SUCCESS	2026-10-17 04:28:50.378	pulled 0 rows	2026-10-17 04:28:50.385096	2026-10-17 04:28:50.385096	0	\N
0d523c50-ce1f-4a4b-b809-d846e029f692	c9143934-617b-486c-a8fb-866766aa9364	d2496fb4-d8fc-42f5-9c61-a63b78903bbc	inventory-transfers	SUCCESS	2026-10-17 04:28:50.402	pulled 0 rows	2026-10-17 04:28:50.402507	2026-10-17 04:28:50.402507	0	\N
813fbd01-a516-4010-9f25-642c6799cbf0	884177d5-bf19-4c5d-afe5-330751601e31	5c21e911-675e-458e-91f6-9447092ab859	product-batches	SUCCESS	2026-10-17 04:28:50.66	pulled 1 rows	2026-10-17 04:28:50.6616	2026-10-17 04:28:50.6616	0	\N
374c0fc1-1fcb-4828-97fa-bfd3a591aa80	aa5fb3e0-f9fc-4093-9c57-b13f0d3d82f5	2aaa98d1-2ccc-4cf0-b54e-26e8b9295827	units-of-measure	SUCCESS	2026-10-17 04:28:50.905	pulled 0 rows	2026-10-17 04:28:50.906361	2026-10-17 04:28:50.906361	0	\N
e6dca8fc-154f-4dd6-b836-35fa2b1a4740	64e64954-d5f7-44f0-8cb4-b3e698ee9679	f8c1fe55-ec9d-414b-b72e-361ff8e4ae9a	suppliers	SUCCESS	2026-10-17 04:28:51.006	pulled 0 rows	2026-10-17 04:28:51.008579	2026-10-17 04:28:51.008579	0	\N
74184d85-111d-479f-99f3-a3186a1f8657	09bf85fa-8569-413a-a98f-7f52ee70ab55	1a1eaeb1-d5a0-4b69-8f05-a77471e03683	branches	SUCCESS	2026-10-17 04:28:51.062	pulled 0 rows	2026-10-17 04:28:51.063363	2026-10-17 04:28:51.063363	0	\N
d081d1f8-1ff4-45b5-aa9f-b8dce720b738	e3c9b4f2-ddfe-4d54-9954-cbc67f45fb82	4e8e5e25-a62b-41a2-b15d-f4f043c8cd0d	users	SUCCESS	2026-10-17 04:28:51.099	pulled 0 rows	2026-10-17 04:28:51.100579	2026-10-17 04:28:51.100579	0	\N
47e14b71-22ba-4308-a5e3-daa4c6d3d066	6608e76c-8465-4688-8ccf-1c606cd1345f	4761ed5b-3f0c-4822-b4eb-f7e1269ac62c	roles	SUCCESS	2026-10-17 04:28:51.157	pulled 0 rows	2026-10-17 04:28:51.157889	2026-10-17 04:28:51.157889	0	\N
5dbb497c-c5a3-4c11-8007-d18a90d3a04f	dc708e1e-d3e6-4447-a906-dbe6606c7d29	205fdc08-3418-4119-a5d2-6a35097948e9	notifications	SUCCESS	2026-10-17 04:28:51.297	pulled 0 rows	2026-10-17 04:28:51.298237	2026-10-17 04:28:51.298237	0	\N
d0dc3568-8741-4150-9d26-52683c9d731e	3a58ce5b-db09-429c-a927-33517cafcf60	37f83447-d262-4996-bbcb-b40ec84696da	products	SUCCESS	2026-10-17 04:29:50.154	pulled 5 rows	2026-10-17 04:29:50.155	2026-10-17 04:29:50.155	0	\N
16584718-05ab-449c-90a4-b9a3440b50e0	12b84699-0dd8-4a25-9b41-b8473e5c9b66	f99e15ce-e9fc-43a3-9486-58566aa2e717	users	SUCCESS	2026-10-17 04:11:53.538	pulled 0 rows	2026-10-17 04:11:53.714015	2026-10-17 04:11:53.714015	0	\N
856c2c23-4e88-4190-a78d-de10cbeb5412	83e6da96-ba8a-4625-bb40-8e55109a1900	87454741-9328-49c8-a9f3-21db8ceda4dd	notifications	SUCCESS	2026-10-17 04:11:55.688	pulled 0 rows	2026-10-17 04:11:55.765555	2026-10-17 04:11:55.765555	0	\N
3dd4aa6d-b96e-40f3-8983-4b7ee1719cc9	d10bfc55-8904-487a-ac7c-0407f8f102b2	bf24eec4-18b0-4a46-8bca-b6c2370233fd	customers	SUCCESS	2026-10-17 04:12:44.008	pulled 0 rows	2026-10-17 04:12:44.008922	2026-10-17 04:12:44.008922	0	\N
08f8aa5a-6edd-42d1-b4a7-1bfaecaf1ce6	746b4685-811e-4f61-9da7-a63c0201889e	47e97477-e821-4cd4-81c2-3c05c28bc7f5	expenses	SUCCESS	2026-10-17 04:12:44.434	pulled 0 rows	2026-10-17 04:12:44.444302	2026-10-17 04:12:44.444302	0	\N
244024b1-a493-4bfb-b09d-5856d7ac884a	94bc5f42-3e6b-4947-a5e3-1e7dac10f716	62153c77-b3be-4a3a-a3aa-5baa2e8925fb	units-of-measure	SUCCESS	2026-10-17 04:12:44.838	pulled 0 rows	2026-10-17 04:12:44.843695	2026-10-17 04:12:44.843695	0	\N
58b15762-ae61-403e-940d-3db102308f10	f08b31d2-d631-4a04-b92c-3e831c886047	467acb85-3ae5-4d9c-aa9e-1e9d66c0c44e	purchases	SUCCESS	2026-10-17 04:12:45.395	pulled 0 rows	2026-10-17 04:12:45.40836	2026-10-17 04:12:45.40836	0	\N
37a07ade-1913-4fde-97b4-d630af8e7406	831e2d7d-4a08-438c-a593-1c98bf0f0b3a	9f1ffe03-5bf9-49cb-9439-aa4883d41d37	products	SUCCESS	2026-10-17 04:27:09.347	pulled 5 rows	2026-10-17 04:27:09.350297	2026-10-17 04:27:09.350297	0	\N
a26a997f-c07e-4c81-8466-a5d6d0702c72	5bf24f1c-d05b-4dcb-b74f-de3609ff5a9e	64793db1-1f17-4574-9657-cde251d1de2c	expenses	SUCCESS	2026-10-17 04:27:09.504	pulled 0 rows	2026-10-17 04:27:09.504781	2026-10-17 04:27:09.504781	0	\N
dedc6a84-76d0-4909-bf35-d554a9ed4430	ed9cca08-8cc7-45d8-8b87-83b878bf519b	b1be05c6-39a5-47b8-ada1-b67c1608dcb1	inventory-transfers	SUCCESS	2026-10-17 04:27:09.529	pulled 0 rows	2026-10-17 04:27:09.529706	2026-10-17 04:27:09.529706	0	\N
cd1508e0-292d-4d1f-be3e-a87563342f09	c15ea75d-48b4-4f68-b4c1-4c1c98dc1906	246dfeea-ed04-46a4-ad7b-2501bffd18f5	categories	SUCCESS	2026-10-17 04:27:10.19	pulled 0 rows	2026-10-17 04:27:10.196526	2026-10-17 04:27:10.196526	0	\N
f05bb77e-8a6e-4534-b8fc-95e26726aa28	ae04403c-9fb5-48ad-972c-77a7f6e08ccf	cca1bbc6-042d-431a-bf0a-c741b6ea4a77	sales	SUCCESS	2026-10-17 04:27:10.585	pulled 0 rows	2026-10-17 04:27:10.586951	2026-10-17 04:27:10.586951	0	\N
a16a155a-e6df-4eb1-8b9f-84cba536acee	8200a952-2007-4515-a038-7fd06587f3fc	95b206e2-0587-4671-8525-7b3882f36f0f	roles	SUCCESS	2026-10-17 04:27:10.609	pulled 0 rows	2026-10-17 04:27:10.61132	2026-10-17 04:27:10.61132	0	\N
6ba91a04-1d37-4b79-b429-896889ab7c95	a16d7d94-18f5-4b55-a54a-68dd9bcb2876	49ababd4-e7e3-4769-ab48-02644ca35e00	notifications	SUCCESS	2026-10-17 04:27:10.639	pulled 0 rows	2026-10-17 04:27:10.640532	2026-10-17 04:27:10.640532	0	\N
a6d93f80-db48-4514-a43e-50cd1c459ac0	9866812e-3038-48f0-8c81-63e6be02840f	1028bc2b-6701-4ba0-8cb7-5e71349c9a7c	expenses	SUCCESS	2026-10-17 04:27:10.852	pulled 0 rows	2026-10-17 04:27:10.853638	2026-10-17 04:27:10.853638	0	\N
e124abf4-c529-495f-a43d-8c662b038ffd	0d62fc06-443c-42d2-87ed-454ae2aa388e	220b8bbb-9725-4347-af9c-c338c6940b87	products	SUCCESS	2026-10-17 04:27:10.878	pulled 5 rows	2026-10-17 04:27:10.879767	2026-10-17 04:27:10.879767	0	\N
70752acd-bdbc-4bee-80c8-f45d24ac20bd	3e609abd-364d-4578-b0cc-16bfaeee25c6	1fea1e2a-fd05-4bfd-8db8-612805bafd1c	inventory-transfers	SUCCESS	2026-10-17 04:27:10.881	pulled 0 rows	2026-10-17 04:27:10.884165	2026-10-17 04:27:10.884165	0	\N
90dda2b2-8c7d-4621-9a44-24c5f6c370cc	28aeab74-fddf-421c-8de0-7cef8968f2d3	02e4e977-beb2-4593-a25e-753ba94940b9	categories	SUCCESS	2026-10-17 04:27:11.141	pulled 0 rows	2026-10-17 04:27:11.143807	2026-10-17 04:27:11.143807	0	\N
939620a9-8c21-4ff0-a45a-30050679523a	a2a797c0-5aee-4d98-b579-ac8dc3c679ba	8cca4904-98a8-465a-bb63-f96bda49d01b	units-of-measure	SUCCESS	2026-10-17 04:27:11.194	pulled 0 rows	2026-10-17 04:27:11.196217	2026-10-17 04:27:11.196217	0	\N
93aaa59d-8d1b-403b-b30e-b4121fdb118a	59dc8a11-3c42-402a-918a-589bb452175c	591c282b-6714-4bce-b227-89f7c6cf494c	branches	SUCCESS	2026-10-17 04:27:11.204	pulled 0 rows	2026-10-17 04:27:11.207095	2026-10-17 04:27:11.207095	0	\N
48bbf2d0-0c5a-450f-b1f8-05873a52cee3	98ed2d3d-86fb-4761-aebf-cb3ca493656c	e99b47ff-3a7b-4d97-8096-0e54e17b9cd2	suppliers	SUCCESS	2026-10-17 04:27:11.31	pulled 0 rows	2026-10-17 04:27:11.311837	2026-10-17 04:27:11.311837	0	\N
66154bbe-1b2f-49d8-9acb-656a628250c4	0ee64df4-07e2-4458-a36d-82700abbd9a4	3c2408dd-7be5-4e75-8534-a920a9fd2512	users	SUCCESS	2026-10-17 04:27:11.324	pulled 0 rows	2026-10-17 04:27:11.325772	2026-10-17 04:27:11.325772	0	\N
a55a9a65-188a-4821-8a51-a88136f7bb60	db290aee-a997-4fcc-aa65-031aee98ba72	2e85f683-0b62-4117-8943-93dcbabbe0ff	roles	SUCCESS	2026-10-17 04:27:11.365	pulled 0 rows	2026-10-17 04:27:11.3658	2026-10-17 04:27:11.3658	0	\N
c86bfc70-b080-470c-b974-f9db306c7cc6	becdb63e-f779-4179-8843-ad2b1e71e4e9	981b0d80-9160-491f-91b8-668b31133274	purchases	SUCCESS	2026-10-17 04:27:11.369	pulled 0 rows	2026-10-17 04:27:11.370162	2026-10-17 04:27:11.370162	0	\N
e1b274b2-9e60-4bff-92ce-a8df63784c20	30f0fc87-b903-45b4-8ea0-1e66e0a37e83	f359286b-f699-45ad-88a2-1b0108309fc4	notifications	SUCCESS	2026-10-17 04:27:11.647	pulled 0 rows	2026-10-17 04:27:11.648583	2026-10-17 04:27:11.648583	0	\N
a1f376cc-6526-423d-82d3-2c575be50304	aa9d64bb-d93d-4e18-ae3c-776126f9570d	9ff2e42b-d792-4827-a350-1a97ebc8773c	expenses	SUCCESS	2026-10-17 04:27:50.151	pulled 0 rows	2026-10-17 04:27:50.151651	2026-10-17 04:27:50.151651	0	\N
8b55e0c4-fabe-49c2-9725-4cf09a63341a	113a730d-711a-4311-9185-5cd6ba88bc67	cee0ac5e-aa14-42b4-a157-8d911918bae2	inventory-transfers	SUCCESS	2026-10-17 04:27:50.152	pulled 0 rows	2026-10-17 04:27:50.15336	2026-10-17 04:27:50.15336	0	\N
153515e9-4062-4e9d-ab91-6b67868272f6	180f6173-2be9-488e-8932-5097b7f0538d	270d236d-f961-4f42-982f-5768a4815a2a	product-batches	SUCCESS	2026-10-17 04:27:50.178	pulled 1 rows	2026-10-17 04:27:50.179124	2026-10-17 04:27:50.179124	0	\N
51b003d2-93de-4383-a7a0-15e907145566	2cd5802e-fc0d-4bf6-93d3-9c225d26128e	ec9e7761-9586-4208-806d-f69e2be35ce2	categories	SUCCESS	2026-10-17 04:27:50.592	pulled 0 rows	2026-10-17 04:27:50.594921	2026-10-17 04:27:50.594921	0	\N
940df476-ecb6-4bd5-9fdf-cca4a177dfe3	8d42b722-f319-4c45-a479-77cc94c21ad1	ed5a7010-2b4c-4dc4-bb15-ac5ddb453f7d	suppliers	SUCCESS	2026-10-17 04:27:50.62	pulled 0 rows	2026-10-17 04:27:50.621132	2026-10-17 04:27:50.621132	0	\N
e2b553b4-c526-4952-ac7b-ca463338c6dc	6975de18-a796-4e1c-9764-3a0e0cbd5c2a	3cf2c14c-1a93-4826-8e7e-5d342217da84	roles	SUCCESS	2026-10-17 04:27:50.856	pulled 0 rows	2026-10-17 04:27:50.857011	2026-10-17 04:27:50.857011	0	\N
9015b070-29a1-45ca-b70c-52ca84da1439	ac9360fd-c5b3-42d5-8738-6b0aafa347a9	1f618894-62ae-4e83-8ed8-25b146896645	users	SUCCESS	2026-10-17 04:27:50.858	pulled 0 rows	2026-10-17 04:27:50.859222	2026-10-17 04:27:50.859222	0	\N
675e981d-90bf-440e-8522-0ddefe13e7d2	a2bd1645-1214-414b-ada2-49930fe92a8c	cf21c38d-a730-4d32-a907-41a742e6c8e8	products	SUCCESS	2026-10-17 04:28:50.365	pulled 5 rows	2026-10-17 04:28:50.367922	2026-10-17 04:28:50.367922	0	\N
4ecf7b9d-0576-40ef-971d-ef3a071e3b86	93b64132-21c8-4995-a633-2586b7f3c2d5	a9a6e3e9-66da-439c-91b0-411310f2e2f7	inventories	SUCCESS	2026-10-17 04:28:50.406	pulled 5 rows	2026-10-17 04:28:50.407199	2026-10-17 04:28:50.407199	0	\N
4ea69ec7-0328-45b5-add0-5672ce759ee1	bc9b9487-235c-41e4-bb07-40b09ece52af	98fbcfdc-7ce6-49df-b645-6e756a3c40a7	customers	SUCCESS	2026-10-17 04:28:50.413	pulled 0 rows	2026-10-17 04:28:50.423686	2026-10-17 04:28:50.423686	0	\N
c7a9bf48-2c04-4750-837c-364ed927c9a4	3b259780-bfbe-4501-a248-7d67e59948f5	57e3f78b-798a-4d01-a7fc-9134fa0ebc4d	categories	SUCCESS	2026-10-17 04:28:50.9	pulled 0 rows	2026-10-17 04:28:50.901491	2026-10-17 04:28:50.901491	0	\N
7c77d617-15c9-42c1-88ee-eb6b0b22a2e4	04801bba-12b6-4a1c-8341-fbd419fc0185	528b24d1-7754-4cea-bb4c-2242a8dfba2e	purchases	SUCCESS	2026-10-17 04:28:51.064	pulled 0 rows	2026-10-17 04:28:51.066723	2026-10-17 04:28:51.066723	0	\N
d7e2f7b5-71e9-4595-b24f-00edebc1ddb3	f8f6e53a-cc88-4023-b005-577f086e7b18	e5f4db2f-5d4a-46d0-9a7f-0551fb758a1b	sales	SUCCESS	2026-10-17 04:28:51.097	pulled 0 rows	2026-10-17 04:28:51.098016	2026-10-17 04:28:51.098016	0	\N
f5e2ea60-5a5c-4d3e-8020-cac8e41533ad	11f28ffa-c228-4ca4-84d5-1139c520d820	d0a40c3f-a4bd-4040-97ea-8efc8dc41c8b	expenses	SUCCESS	2026-10-17 04:29:50.15	pulled 0 rows	2026-10-17 04:29:50.151169	2026-10-17 04:29:50.151169	0	\N
d3f65b75-d243-416d-9555-fac4210df5a4	1378aad8-bde9-4e2a-97d9-978d0d64085e	8d914700-5dc6-4264-8c19-58103bfb854e	customers	SUCCESS	2026-10-17 04:29:50.16	pulled 0 rows	2026-10-17 04:29:50.161318	2026-10-17 04:29:50.161318	0	\N
4ff33e27-9086-4938-8c8d-5ce20cf0e807	8775240b-4db3-45bf-b21e-b9ef01eb1f60	af142bea-7030-4e95-9a0a-ad399ac7f464	inventories	SUCCESS	2026-10-17 04:29:50.162	pulled 5 rows	2026-10-17 04:29:50.163537	2026-10-17 04:29:50.163537	0	\N
85ec30d4-ad23-44e2-aec2-b719e3781bbf	111d1e29-84b3-4cdb-8b3d-e881b0a58f10	db3fc59d-3ef8-4f25-bafa-e621dc419022	inventory-transfers	SUCCESS	2026-10-17 04:29:50.209	pulled 0 rows	2026-10-17 04:29:50.209468	2026-10-17 04:29:50.209468	0	\N
a54f3d82-456d-4ecf-974a-18a92202ba5e	11220ce5-17d6-445c-95a2-532953cdb52d	e4c090d3-6bad-426b-82e3-2debfa65642a	product-batches	SUCCESS	2026-10-17 04:29:50.526	pulled 1 rows	2026-10-17 04:29:50.528534	2026-10-17 04:29:50.528534	0	\N
d0f3d3e0-0b45-446f-a5dd-dc63907f1dd5	b4a11113-680e-4ced-badc-eeb10c01dc19	254a87a0-3137-4db9-8432-e71fc7cfac76	categories	SUCCESS	2026-10-17 04:29:50.576	pulled 0 rows	2026-10-17 04:29:50.577586	2026-10-17 04:29:50.577586	0	\N
091aa797-fca4-4f85-82d9-7155644a2289	4ce8d3d7-2556-4b5a-9c33-7a7b71d3b3c6	3232abe1-f11b-4d14-aa50-b2ea8970a6bf	units-of-measure	SUCCESS	2026-10-17 04:29:50.606	pulled 0 rows	2026-10-17 04:29:50.610001	2026-10-17 04:29:50.610001	0	\N
45d86b7b-1e12-4188-9fd0-231c6f410ba6	d2a8f9fe-f3b6-42f5-af2b-8ceb6fb588c2	6bb9066b-39d1-4d83-8d6e-2d297d938e01	branches	SUCCESS	2026-10-17 04:29:50.647	pulled 0 rows	2026-10-17 04:29:50.648277	2026-10-17 04:29:50.648277	0	\N
8642ccf4-798f-4a01-97f6-fa7485595111	9f43132c-dddf-4f97-8f79-13e9e55beae7	579451e6-748a-4b84-b895-317db75b42cc	notifications	SUCCESS	2026-10-17 04:29:50.849	pulled 0 rows	2026-10-17 04:29:50.84988	2026-10-17 04:29:50.84988	0	\N
60ca59e8-8502-4f76-95a0-26d496c4dc7c	c1626cbd-e6e6-495c-9182-13c883c0ef93	f7d295cf-f6e3-4e34-af24-61facbe89fb6	suppliers	SUCCESS	2026-10-17 04:29:50.65	pulled 0 rows	2026-10-17 04:29:50.650945	2026-10-17 04:29:50.650945	0	\N
f2359ecc-4c31-45db-982f-f7600e6ee808	e744ce17-12dd-47bb-9e19-626b622abd2e	a6947483-e655-4629-98fc-9b706c2c70ba	users	SUCCESS	2026-10-17 04:29:50.841	pulled 0 rows	2026-10-17 04:29:50.841554	2026-10-17 04:29:50.841554	0	\N
b38c74c9-1cec-4958-8d59-48d295d7e860	1cb4419f-ec82-409c-98f4-54bb7cc8f8cc	2c6ef05c-5945-4e96-964f-b706cf022349	purchases	SUCCESS	2026-10-17 04:29:50.667	pulled 0 rows	2026-10-17 04:29:50.668292	2026-10-17 04:29:50.668292	0	\N
31f8aad0-7d1c-4355-b818-3aeebeb226f9	e0ff677a-2764-4562-bd4b-87672b492d4d	f5d6e4ed-9f5e-47bc-8761-4145fcc3883a	sales	SUCCESS	2026-10-17 04:29:50.852	pulled 0 rows	2026-10-17 04:29:50.852845	2026-10-17 04:29:50.852845	0	\N
118e9cbe-1d90-4dba-8efd-4586474c5fa2	74051bf2-2073-49ee-9981-001cc6f0e80d	4247dd61-1a1d-452d-8227-25e5a04e2473	roles	SUCCESS	2026-10-17 04:29:50.85	pulled 0 rows	2026-10-17 04:29:50.851569	2026-10-17 04:29:50.851569	0	\N
88800c43-e53b-48d3-9ec2-c3da37aba210	6acfe28b-b43e-4795-b2b0-33a366d3b201	755775f9-0e78-4d07-b3eb-5be5116ff247	products	SUCCESS	2026-10-17 04:30:50.189	pulled 5 rows	2026-10-17 04:30:50.191737	2026-10-17 04:30:50.191737	0	\N
449edcf4-be2c-41a5-ae1e-1e61ce295246	8cb9f9f1-a3f9-40e1-8825-42133bc30ef8	7ea6dcfa-34de-4f5e-9756-5ccdf83e62a1	customers	SUCCESS	2026-10-17 04:30:50.203	pulled 0 rows	2026-10-17 04:30:50.203971	2026-10-17 04:30:50.203971	0	\N
30550346-2e55-4f12-9800-f8e215074d46	b5030f07-ddb1-4788-9a65-c590f6c5a1c6	a3f1d71e-b330-4f2d-845c-32f3c9a0cea1	inventory-transfers	SUCCESS	2026-10-17 04:30:50.209	pulled 0 rows	2026-10-17 04:30:50.210761	2026-10-17 04:30:50.210761	0	\N
12e100be-8fda-4b0e-9c5e-2199a28b98c3	98602f17-45a6-497f-aebb-215cdd114312	23273c20-0bf0-47b2-9366-cfb303b5f19e	expenses	SUCCESS	2026-10-17 04:30:50.216	pulled 0 rows	2026-10-17 04:30:50.217022	2026-10-17 04:30:50.217022	0	\N
567f2b6f-aad3-4149-b2c1-dfd1f0b09ea3	bd0b20f5-ed16-4ccc-a414-c6a454085739	90807cd3-715f-415c-8bd7-391c0880cb29	inventories	SUCCESS	2026-10-17 04:30:50.229	pulled 5 rows	2026-10-17 04:30:50.229643	2026-10-17 04:30:50.229643	0	\N
8ed3de0e-ee8f-4ca5-8bb1-7d8d02af5945	b22dd0f7-d3cc-42ec-9bbe-8d9d8555dcaf	aed01a3b-4b18-4b6a-99c4-affd5541d5ce	product-batches	SUCCESS	2026-10-17 04:30:50.274	pulled 1 rows	2026-10-17 04:30:50.275453	2026-10-17 04:30:50.275453	0	\N
3bdc7c33-c31b-43c9-9478-864e1e5eebc8	cec34cb3-bad6-4175-ba07-104d52dca64c	aeb5ef28-a98f-4024-bfc6-f206f3e5a4ae	categories	SUCCESS	2026-10-17 04:30:50.765	pulled 0 rows	2026-10-17 04:30:50.770948	2026-10-17 04:30:50.770948	0	\N
f0ae630b-55a2-4155-92a7-8cf88a2b5f6e	bd4780d9-d125-4cdf-9056-b8eca71e7e43	65083e29-5692-4407-be59-c547804d56fe	suppliers	SUCCESS	2026-10-17 04:30:50.792	pulled 0 rows	2026-10-17 04:30:50.793083	2026-10-17 04:30:50.793083	0	\N
38ad9883-de0b-48b2-accb-01198efabd7e	354e248c-1a4b-49c6-a17e-cb5ba16106d6	a6fca539-ef11-4499-99c2-2a1c59943ea1	units-of-measure	SUCCESS	2026-10-17 04:30:50.795	pulled 0 rows	2026-10-17 04:30:50.796767	2026-10-17 04:30:50.796767	0	\N
a7ff2f66-4260-46c1-bc72-a089fdb6f69e	794d1b46-5988-463c-8057-f4ae596dc550	c8432b8a-7e0c-43ef-b8a3-a422d43cff86	branches	SUCCESS	2026-10-17 04:30:50.954	pulled 0 rows	2026-10-17 04:30:50.956267	2026-10-17 04:30:50.956267	0	\N
27106fc7-4771-4174-ae21-3b5b342300bb	553656bb-e56b-4984-9aff-69c494b5a078	8a521309-9c41-45ad-8b7f-301ddb5f70d8	roles	SUCCESS	2026-10-17 04:30:50.997	pulled 0 rows	2026-10-17 04:30:50.999814	2026-10-17 04:30:50.999814	0	\N
79672150-97ae-4fdd-8d68-cd736156d367	a5fe5315-b97c-4e9d-ab41-24e20ab5f0cd	27ad272a-a6c6-43f2-80fb-8dc3b7277e6a	users	SUCCESS	2026-10-17 04:30:51.002	pulled 0 rows	2026-10-17 04:30:51.01138	2026-10-17 04:30:51.01138	0	\N
ded08d86-39cc-4cfb-b3b8-2eaf739fce9f	e15d1619-84bf-4f99-925b-2756b9bc6fcf	6ef97517-8a69-4058-8fef-e28fb8c20b1d	sales	SUCCESS	2026-10-17 04:30:51.016	pulled 0 rows	2026-10-17 04:30:51.020426	2026-10-17 04:30:51.020426	0	\N
5c044d84-270b-430f-90e7-012ffc71a49f	2575fb30-5647-41be-96ed-b00cac56e86c	fe432049-f055-43b8-82d5-50a58ffeb204	purchases	SUCCESS	2026-10-17 04:30:51.055	pulled 0 rows	2026-10-17 04:30:51.057231	2026-10-17 04:30:51.057231	0	\N
cd34887a-393e-442f-bc93-a7ec1474cee2	08d4f414-146e-4aa3-bc60-3bf46cfa64c7	4ff51859-2d48-47e1-bce5-48aa670014e3	notifications	SUCCESS	2026-10-17 04:30:51.07	pulled 0 rows	2026-10-17 04:30:51.070353	2026-10-17 04:30:51.070353	0	\N
9913b562-96b1-4868-bacb-c3ea834b98bc	c64e7982-cdfa-4098-9b56-a3a5e76c6975	1fdf69d7-e5da-4179-b8ff-1fb219197601	customers	SUCCESS	2026-10-17 04:31:50.218	pulled 0 rows	2026-10-17 04:31:50.219302	2026-10-17 04:31:50.219302	0	\N
0e4392cc-6abc-4b93-ac63-63ab59e02e9b	e77f3a57-0dca-4d29-b77f-f76150cf2c11	e252ae4e-4044-40d9-9da9-f50419bfaf64	inventories	SUCCESS	2026-10-17 04:31:50.234	pulled 5 rows	2026-10-17 04:31:50.23559	2026-10-17 04:31:50.23559	0	\N
1aa3c65d-30c7-4069-ace2-58a587ce1430	af292179-bc41-45dd-98e8-465fbd366c6a	e235908e-0173-410b-a238-10e02bf4744a	products	SUCCESS	2026-10-17 04:31:50.238	pulled 5 rows	2026-10-17 04:31:50.241794	2026-10-17 04:31:50.241794	0	\N
8a9d9d9e-b9e3-4926-bb3a-cca868c28e52	3097b059-e46c-4d95-8fb0-81a2afd9b6eb	003b0526-b421-40c4-a122-0cb02163b839	expenses	SUCCESS	2026-10-17 04:31:50.272	pulled 0 rows	2026-10-17 04:31:50.276654	2026-10-17 04:31:50.276654	0	\N
b07c965e-d976-41d4-86b8-9f7404b4a358	8aabc3b5-b0c8-452b-8f16-c4804bc59fe5	0b25eb1b-fc39-46aa-bb72-c5adbf997cb6	inventory-transfers	SUCCESS	2026-10-17 04:31:50.301	pulled 0 rows	2026-10-17 04:31:50.303464	2026-10-17 04:31:50.303464	0	\N
18f5ac69-4dab-414b-ad1a-69afe6eb12aa	6ed2d6d0-00cf-40e9-921b-cad1e8951b0e	66334af7-5687-46f9-a7fb-8ed74290d3ff	units-of-measure	SUCCESS	2026-10-17 04:31:50.786	pulled 0 rows	2026-10-17 04:31:50.786864	2026-10-17 04:31:50.786864	0	\N
254d081e-9660-497e-a6d4-a012bc68ba70	505bbc7f-07c4-4024-af5f-f61a107b5343	f9078a92-7d92-4176-a52b-35eb436052f5	product-batches	SUCCESS	2026-10-17 04:31:50.808	pulled 1 rows	2026-10-17 04:31:50.811469	2026-10-17 04:31:50.811469	0	\N
28daa56d-9050-4a38-aa96-83774f83e21f	a919903f-0676-46a3-808a-bfe3df7c7a6c	05b129a3-a4e2-4889-b1b9-bd1a250cc485	categories	SUCCESS	2026-10-17 04:31:50.85	pulled 0 rows	2026-10-17 04:31:50.851159	2026-10-17 04:31:50.851159	0	\N
549eefc1-75e7-4e6b-b784-33d13ff35207	716da5a2-9451-4dd6-99c3-96cdb3a1beca	70a403d0-02f9-43d4-a4ca-02b1b16151df	sales	SUCCESS	2026-10-17 04:31:51.034	pulled 0 rows	2026-10-17 04:31:51.035629	2026-10-17 04:31:51.035629	0	\N
e063f8a7-839d-46b2-b40a-7f71ce3abda8	693c08d0-212e-4b2f-a70e-e9240ac585be	989e5c7b-5564-480f-b315-30a0975cdecf	suppliers	SUCCESS	2026-10-17 04:31:51.037	pulled 0 rows	2026-10-17 04:31:51.039329	2026-10-17 04:31:51.039329	0	\N
c6999a35-6d8e-44d2-92c5-f53443214ba0	e943d09d-9c86-425e-8a86-daaccbf2ae63	c392a61d-5443-428b-a937-28857c201355	purchases	SUCCESS	2026-10-17 04:31:51.039	pulled 0 rows	2026-10-17 04:31:51.040756	2026-10-17 04:31:51.040756	0	\N
f6ec626d-b942-421c-89a6-ea5401a7faa2	1bee7c44-3a5a-4497-9962-a120a595d586	50780ee8-d5f6-4f7d-a0a8-6e632c190cf9	users	SUCCESS	2026-10-17 04:31:51.047	pulled 0 rows	2026-10-17 04:31:51.047929	2026-10-17 04:31:51.047929	0	\N
b017782d-b64e-4c79-a275-436dd143f477	97402173-13c8-4a24-bdb1-a12e70e289b3	e23740fb-d0e9-4670-aedc-ffb0a0a4145b	branches	SUCCESS	2026-10-17 04:31:51.048	pulled 0 rows	2026-10-17 04:31:51.049727	2026-10-17 04:31:51.049727	0	\N
3615d971-b0f6-491f-9791-31b9621fc905	d51e239b-8be1-442e-81d9-ebfbde18773b	90c857f8-c83b-4270-81f4-b026eae6d544	roles	SUCCESS	2026-10-17 04:31:51.202	pulled 0 rows	2026-10-17 04:31:51.202592	2026-10-17 04:31:51.202592	0	\N
b512ba5a-d635-4cb6-9a24-2136e9c7e45b	55ea6dd2-9eb5-4cc2-bca3-0bb453308648	5a3ae514-986c-4194-981c-37a19adad2f4	notifications	SUCCESS	2026-10-17 04:31:51.203	pulled 0 rows	2026-10-17 04:31:51.204001	2026-10-17 04:31:51.204001	0	\N
b73ccf6d-06ba-401b-b3bb-ec9b089ec5e6	dev-mvaih3kc-jg9pa7u3kk	mut-mvbwswji-grzu5vaqw6	products	SUCCESS	2026-10-17 04:48:55.550653	\N	2026-10-17 04:48:55.318051	2026-10-17 04:48:55.550653	0	\N
505134c4-14d7-4de6-a5a8-e2e5488b07f6	dev-mvaih3kc-jg9pa7u3kk	mut-mvbx1fdy-av0i3uf0qw	inventory-transactions	SUCCESS	2026-10-17 04:48:56.233494	\N	2026-10-17 04:48:55.99777	2026-10-17 04:48:56.233494	0	\N
1f881915-6972-4cd9-af7e-6f4ae1dd7713	ad9712da-fcb4-4398-9ad4-438fabda6d50	b8bf3d64-aed2-4620-b3ba-f4024da763bb	products	SUCCESS	2026-10-17 04:48:57.39	pulled 6 rows	2026-10-17 04:48:57.392215	2026-10-17 04:48:57.392215	0	\N
13c0b016-b24d-4720-b966-9435040b3e2e	947d46e1-fcba-4c30-9db6-57501cddee80	75267b63-f643-4244-99ec-700f1b62af5a	expenses	SUCCESS	2026-10-17 04:48:57.416	pulled 0 rows	2026-10-17 04:48:57.416492	2026-10-17 04:48:57.416492	0	\N
8c7ee5ed-00de-4ff3-ba4a-6bbf350d4731	db2d77f5-84b8-4ea2-8025-ca65b2634edf	d0db8834-17ed-441c-bab8-940b97b26d54	inventory-transfers	SUCCESS	2026-10-17 04:48:57.466	pulled 0 rows	2026-10-17 04:48:57.472562	2026-10-17 04:48:57.472562	0	\N
8d057965-b481-4e85-8e02-f0be0bf0cad9	04e81cc1-ad85-4549-9a8f-2724e88a9226	d22a6436-bec7-44b6-ae90-2981855e78c4	inventories	SUCCESS	2026-10-17 04:48:57.486	pulled 6 rows	2026-10-17 04:48:57.490521	2026-10-17 04:48:57.490521	0	\N
6e2449f5-8de6-48d5-9673-f72a8f7ecf91	ff1a13cc-0242-4582-9b76-e0bf42c3fcfe	9274610d-a000-4df6-88e8-a7a4c07f9c8a	customers	SUCCESS	2026-10-17 04:48:57.545	pulled 0 rows	2026-10-17 04:48:57.546157	2026-10-17 04:48:57.546157	0	\N
2c6a4c17-65fe-4dee-8540-23be05c5124d	ac874b77-79a1-4a9c-8241-33753a2aa9c3	e4cd9c7b-cf46-4f1a-a889-82a701945063	product-batches	SUCCESS	2026-10-17 04:48:57.642	pulled 2 rows	2026-10-17 04:48:57.644323	2026-10-17 04:48:57.644323	0	\N
4e307606-f660-409f-8748-da643a42bce5	2d5ba210-5754-4094-a389-27d0d6fe1dce	ccc86d1e-0bc2-4a77-b2c6-09b794555ff6	categories	SUCCESS	2026-10-17 04:48:57.889	pulled 0 rows	2026-10-17 04:48:57.892955	2026-10-17 04:48:57.892955	0	\N
94615475-365a-4bb2-9268-32c636ed69cd	513fe61f-04a9-4c1c-bfb5-1e61ad27c7fd	37e7da2c-bae8-498f-b64e-a01bf041d1a7	suppliers	SUCCESS	2026-10-17 04:48:57.906	pulled 0 rows	2026-10-17 04:48:57.908173	2026-10-17 04:48:57.908173	0	\N
207e2730-1893-4476-87e1-18d31e75b376	c425492b-1a2e-4a4a-afd8-a85ffbacf517	fb8e6f59-7ba6-48e0-a721-6915cde581fe	units-of-measure	SUCCESS	2026-10-17 04:48:58.039	pulled 0 rows	2026-10-17 04:48:58.042161	2026-10-17 04:48:58.042161	0	\N
915ab6c3-a3a1-421c-a8ea-e0092a2453da	f945c1c2-b353-42a8-ae40-8cd70f8a297c	e1ad14d8-6879-4036-95cf-2df2eb09f979	purchases	SUCCESS	2026-10-17 04:48:58.273	pulled 0 rows	2026-10-17 04:48:58.275977	2026-10-17 04:48:58.275977	0	\N
c975d6a3-012f-4033-ac79-d923573e3088	0803b700-53f7-45d7-83a5-a32a6d34e840	9ec8048f-80c1-4bbc-98d5-11be95c4a6d8	roles	SUCCESS	2026-10-17 04:48:58.251	pulled 0 rows	2026-10-17 04:48:58.256721	2026-10-17 04:48:58.256721	0	\N
7eb95ec8-32a1-4c77-af27-5fc61f2b26ed	2afd922e-6231-438b-8cb8-36764b56dc29	2cea9746-ea50-4892-b614-5401f4603ce8	sales	SUCCESS	2026-10-17 04:48:58.313	pulled 0 rows	2026-10-17 04:48:58.320288	2026-10-17 04:48:58.320288	0	\N
90bff9a7-d2c8-4a25-8d25-ed766c53edc7	813baf90-fd4b-493a-bc5b-63b58603496d	bc338036-fe3a-4e4b-89e7-9adf89d6fe75	users	SUCCESS	2026-10-17 04:48:58.494	pulled 0 rows	2026-10-17 04:48:58.495027	2026-10-17 04:48:58.495027	0	\N
3e695dfb-29cd-4374-b105-6bf3476e5f9e	25a16987-3777-4664-9115-b2281a506795	9dcca0c1-e593-473e-8915-17d12d693bd5	branches	SUCCESS	2026-10-17 04:48:58.515	pulled 0 rows	2026-10-17 04:48:58.524345	2026-10-17 04:48:58.524345	0	\N
e8464825-6ec1-4d6c-940e-7b83d52bf8a6	1d28cafd-f7fb-4b6b-a776-fbec85c80cf2	5c6f4da2-4c14-44c2-bd4d-47b5a7d2d3f5	notifications	SUCCESS	2026-10-17 04:48:58.573	pulled 0 rows	2026-10-17 04:48:58.574896	2026-10-17 04:48:58.574896	0	\N
6e11a2d2-d32f-4ecf-a6b4-5a35cb9b3576	f9a6641b-728b-421c-872c-19c775a3e27f	e9edc7db-28f6-4657-a318-fff9a9419074	customers	SUCCESS	2026-10-17 04:48:58.607	pulled 0 rows	2026-10-17 04:48:58.616644	2026-10-17 04:48:58.616644	0	\N
cf39dc49-8f93-48dd-b644-d4696cda3403	c7453693-2b06-4f2a-9833-b125e0d19899	c27795c3-6156-46e9-bb56-a717d1b738ce	products	SUCCESS	2026-10-17 04:48:58.624	pulled 6 rows	2026-10-17 04:48:58.625581	2026-10-17 04:48:58.625581	0	\N
377bc17d-a4bf-4a97-a9f5-d715a061ab7a	01b996b1-c944-4b68-8339-3f116a1f17c6	ddce9041-c637-4e2d-9428-e0634588a8c1	expenses	SUCCESS	2026-10-17 04:48:58.665	pulled 0 rows	2026-10-17 04:48:58.665976	2026-10-17 04:48:58.665976	0	\N
4868d975-d514-4fe0-a73a-3bc025e32b10	1ac0e9c1-b558-4ca0-87d2-c66057cd9735	c357b4f1-6125-49cd-8e22-40fd756a735c	inventory-transfers	SUCCESS	2026-10-17 04:48:58.67	pulled 0 rows	2026-10-17 04:48:58.672268	2026-10-17 04:48:58.672268	0	\N
db719a48-c7d4-49f5-9789-2b1f0fbfb45a	abb9fcd9-6872-43d0-b1a7-048947495a23	4219491a-46b4-4d28-84a2-b6f46d54b306	product-batches	SUCCESS	2026-10-17 04:48:58.71	pulled 2 rows	2026-10-17 04:48:58.711105	2026-10-17 04:48:58.711105	0	\N
0f23e9b5-e273-4a50-a86b-a265334f7dfd	61a81857-abc8-422a-a3ee-f09906327e7b	79ee3811-35e9-438e-8b66-5b93088b65ba	inventories	SUCCESS	2026-10-17 04:48:58.827	pulled 6 rows	2026-10-17 04:48:58.827742	2026-10-17 04:48:58.827742	0	\N
b0317e33-ce5c-46ea-af50-1b3d85cef46f	450b514d-c334-427d-8636-1282b9bd2a25	3c9a882d-d217-43bd-9c46-16e23068bd13	roles	SUCCESS	2026-10-17 04:48:59.242	pulled 0 rows	2026-10-17 04:48:59.244561	2026-10-17 04:48:59.244561	0	\N
723ef896-bedb-482a-a63d-6fe144a8f83c	5c7a97de-e392-4945-b4ef-ed096630394c	e258c568-ba61-4c52-9846-979dbd32abdc	categories	SUCCESS	2026-10-17 04:48:59.27	pulled 0 rows	2026-10-17 04:48:59.273381	2026-10-17 04:48:59.273381	0	\N
fcc7ebc8-21f6-41ee-b0e7-f1475b673f56	b176d88d-a25a-4d54-9640-3203becb6973	14acb268-353a-4ae8-9ca2-6977751384e7	branches	SUCCESS	2026-10-17 04:48:59.267	pulled 0 rows	2026-10-17 04:48:59.27717	2026-10-17 04:48:59.27717	0	\N
04624fb5-ca86-4535-8c0a-0eb558282d3e	3a433999-015a-44d4-94a0-90531b903ce0	52f9033c-f6a3-4cde-9128-f3914fa83d29	units-of-measure	SUCCESS	2026-10-17 04:48:59.293	pulled 0 rows	2026-10-17 04:48:59.294203	2026-10-17 04:48:59.294203	0	\N
fa851be5-1ebe-4ad7-8fe6-2f3787e8a84f	194cf5a7-450c-44d9-bd6e-d2d6bd99611d	e97256cd-cacf-4676-903a-0cb7ac7e4b34	purchases	SUCCESS	2026-10-17 04:48:59.349	pulled 0 rows	2026-10-17 04:48:59.350139	2026-10-17 04:48:59.350139	0	\N
b849e7cc-b2cf-4ba3-871c-ea04c6fcd49e	8e56d951-6bb4-4aa9-92b8-ab11de60e2a4	83b3e56b-a39e-4dd2-a1cf-bc62a3856b85	suppliers	SUCCESS	2026-10-17 04:48:59.351	pulled 0 rows	2026-10-17 04:48:59.352112	2026-10-17 04:48:59.352112	0	\N
8af67d29-c239-4251-9868-ca3d432aeddc	eced7352-8f58-4358-a34d-fa7bb68cef48	39117eb5-9a7b-4540-8349-a7511684c34f	users	SUCCESS	2026-10-17 04:48:59.427	pulled 0 rows	2026-10-17 04:48:59.439458	2026-10-17 04:48:59.439458	0	\N
05252ab9-c607-4fb8-93be-6cefa4c9bd01	7a03aa39-79f8-480b-87e8-9b61836b919c	bf3155dc-4f32-4aab-9ea0-103a317e5c63	sales	SUCCESS	2026-10-17 04:48:59.44	pulled 0 rows	2026-10-17 04:48:59.44192	2026-10-17 04:48:59.44192	0	\N
a7d42a75-8722-46a6-8132-91a72fe71d2b	ffcada51-c76f-45d6-b4dc-8b8ff6af616b	0bca8106-101b-4dcd-849a-856b0506f961	notifications	SUCCESS	2026-10-17 04:48:59.471	pulled 0 rows	2026-10-17 04:48:59.474022	2026-10-17 04:48:59.474022	0	\N
e4696224-24f6-46b2-a258-2df890b20dd3	840edae6-f490-4937-8153-9a4a755d7eb4	f3f2bb45-8c40-4e4c-b47a-418507ab4a19	expenses	SUCCESS	2026-10-17 04:49:52.793	pulled 0 rows	2026-10-17 04:49:52.794244	2026-10-17 04:49:52.794244	0	\N
f5d40421-093c-4016-a74f-9e6d70c538d8	50557e3d-a583-4259-bfe8-4c76595848ba	41d54fb6-20e3-430b-a48b-94f61a01a12f	customers	SUCCESS	2026-10-17 04:49:52.792	pulled 0 rows	2026-10-17 04:49:52.798682	2026-10-17 04:49:52.798682	0	\N
406b7e05-7ac2-4472-a757-01886e9437ce	418a05a9-6477-4e8e-ac94-67fab43b1f0b	f6c24bc0-03e2-4ec4-bc02-5cceb300e498	products	SUCCESS	2026-10-17 04:49:52.823	pulled 6 rows	2026-10-17 04:49:52.823927	2026-10-17 04:49:52.823927	0	\N
a6c6420b-3ef6-48d3-9785-48ae8144ac8d	8781325c-8000-4066-8b5b-6d40dd0f6ec8	026baa4e-b77c-4ae3-b0c1-b89f9cb5f557	inventories	SUCCESS	2026-10-17 04:49:52.869	pulled 6 rows	2026-10-17 04:49:52.8707	2026-10-17 04:49:52.8707	0	\N
56d7ab85-3f43-4d88-9c71-95a354e63b80	879af284-2944-4a39-a375-16d8add4e213	851e969d-b9e0-4a5f-81ad-9363930b71e2	inventory-transfers	SUCCESS	2026-10-17 04:49:52.922	pulled 0 rows	2026-10-17 04:49:52.92302	2026-10-17 04:49:52.92302	0	\N
73ce4e9b-31e6-4b68-b7dd-f346034e3e1d	b5afbff3-998c-483f-b768-b4d92d451326	17214074-60f0-4f41-936a-a58675cd65eb	product-batches	SUCCESS	2026-10-17 04:49:52.951	pulled 2 rows	2026-10-17 04:49:52.951805	2026-10-17 04:49:52.951805	0	\N
cc16c893-54f7-443a-b25e-793a9cf1b4c5	be261e98-e94e-4ad5-a6a8-616dc6729487	c6a533ef-a5f0-4616-9ca6-b58d8b713ea8	categories	SUCCESS	2026-10-17 04:49:53.243	pulled 0 rows	2026-10-17 04:49:53.244368	2026-10-17 04:49:53.244368	0	\N
ad925f3c-ea55-48ef-9b99-57a07dd9d707	dcf0b23c-be90-401d-9478-9be0f4a6faa0	b063b752-3261-4d37-8582-13bda8ce898a	units-of-measure	SUCCESS	2026-10-17 04:49:53.326	pulled 0 rows	2026-10-17 04:49:53.328498	2026-10-17 04:49:53.328498	0	\N
d8c3bde2-1758-4a50-95e4-9e2ea44ad650	de2ce617-497e-49b8-9a76-c2bfcee06681	c5d4d70d-4050-4ad1-b86a-16ec22688ffb	branches	SUCCESS	2026-10-17 04:49:53.349	pulled 0 rows	2026-10-17 04:49:53.349612	2026-10-17 04:49:53.349612	0	\N
8e5fbeb3-40a8-4fae-91f0-ca1498b0c597	192f86ac-486f-4886-a740-cf5b09fc51c1	1b57a898-822b-47d3-88f7-74cceea447f0	suppliers	SUCCESS	2026-10-17 04:49:53.356	pulled 0 rows	2026-10-17 04:49:53.357182	2026-10-17 04:49:53.357182	0	\N
8ebf442a-28a0-4e39-9f0b-b54a7fe02ab1	7a73009e-5bc7-4499-8da9-c9f72979c400	3cac84f0-869e-4ef5-a07f-d15ae434ae7c	users	SUCCESS	2026-10-17 04:49:53.632	pulled 0 rows	2026-10-17 04:49:53.63365	2026-10-17 04:49:53.63365	0	\N
c7b36aad-0e84-46bf-a9e1-d659611dd6da	0f5c08aa-0205-43e3-a954-5ab5c5ef0c00	a44a92e9-8a52-4444-b64c-35ce3678f0e1	sales	SUCCESS	2026-10-17 04:49:53.391	pulled 0 rows	2026-10-17 04:49:53.392032	2026-10-17 04:49:53.392032	0	\N
ed6f5ed4-5eee-46d6-9ffb-f0b261afbe03	e4c26b10-7774-42c6-8cc5-563e3f2f3312	363ed8b7-9961-429b-af98-5ed8851d2a90	roles	SUCCESS	2026-10-17 04:49:53.628	pulled 0 rows	2026-10-17 04:49:53.629205	2026-10-17 04:49:53.629205	0	\N
f3088a66-191d-471c-a042-6efbfdd89836	c6b75d23-ffd4-484c-99bb-6d0ac2eb66f1	637ead78-0124-4284-98d9-8ff08007c5d7	purchases	SUCCESS	2026-10-17 04:49:53.392	pulled 0 rows	2026-10-17 04:49:53.392995	2026-10-17 04:49:53.392995	0	\N
16569470-f148-41a5-af75-bb491973a5bb	be59d1c7-4daf-481e-a78f-7e11495b79c2	c15a4634-314c-4da0-b6ed-db57ada758d5	notifications	SUCCESS	2026-10-17 04:49:53.631	pulled 0 rows	2026-10-17 04:49:53.632152	2026-10-17 04:49:53.632152	0	\N
e58c8180-596a-4d65-9877-38f09648fced	3b2f2775-9674-4f45-9518-5ded5939133e	4a1472ea-fa00-4095-8665-45c512898d62	products	SUCCESS	2026-10-17 04:50:53.008	pulled 6 rows	2026-10-17 04:50:53.010737	2026-10-17 04:50:53.010737	0	\N
5b4196f3-034e-495a-9256-e8eba9d6f450	b2122f95-8b39-42f9-8067-ae99c26992c1	e5650145-90ba-4639-a93d-cd2efce76005	inventory-transfers	SUCCESS	2026-10-17 04:50:53.319	pulled 0 rows	2026-10-17 04:50:53.34013	2026-10-17 04:50:53.34013	0	\N
a8453878-a889-47ee-81b3-6d975fd65070	d03aaaf0-f168-4d1d-bfde-ce0cca771eec	f5ee7e4e-0405-410b-87d2-ef9a3cf3c111	customers	SUCCESS	2026-10-17 04:50:53.283	pulled 0 rows	2026-10-17 04:50:53.301	2026-10-17 04:50:53.301	0	\N
9054eaa2-2ae8-4375-87ba-a016d8a93004	10b60306-89f6-47f7-9bd0-bce5cae4e66b	c23a3337-c574-42be-bf0c-d9f09a8959b3	expenses	SUCCESS	2026-10-17 04:50:53.395	pulled 0 rows	2026-10-17 04:50:53.396483	2026-10-17 04:50:53.396483	0	\N
f96fae00-1f2f-4900-a820-68cd212eaac4	f7a9de1b-8450-4abb-bd50-145f035f63bd	f3f8ced6-488b-4f85-a125-897dac0d768d	inventories	SUCCESS	2026-10-17 04:50:53.463	pulled 6 rows	2026-10-17 04:50:53.469295	2026-10-17 04:50:53.469295	0	\N
cb80d19c-b75f-4c75-a601-259bdd493dd3	2d48ff1c-54e4-40f2-a7eb-2c79dc23e541	d5effe9f-7d5f-4261-81b6-5f1883cd2474	units-of-measure	SUCCESS	2026-10-17 04:50:53.804	pulled 0 rows	2026-10-17 04:50:53.805298	2026-10-17 04:50:53.805298	0	\N
98b5ac16-57b5-4018-80e9-4e131878dcf5	75ffd8f7-8c03-4d5a-82bf-749d623d5895	a680c0bc-228b-4c90-b1ba-b3b36bcd1020	product-batches	SUCCESS	2026-10-17 04:50:53.867	pulled 2 rows	2026-10-17 04:50:53.867888	2026-10-17 04:50:53.867888	0	\N
5d9e45d7-f332-42b9-88fd-625de3b17b0d	4d5fcf78-432b-4986-9f80-49d6bf35df10	18975831-97eb-4a55-8f07-bc6a3e4e8f11	categories	SUCCESS	2026-10-17 04:50:53.9	pulled 0 rows	2026-10-17 04:50:53.900744	2026-10-17 04:50:53.900744	0	\N
e7d179f3-3be1-4862-ad73-244e9b5c555c	c27d1312-2641-4206-bb2d-bd03030cba9a	68e47773-bc12-44e2-aca4-3f004fe700ca	suppliers	SUCCESS	2026-10-17 04:50:53.911	pulled 0 rows	2026-10-17 04:50:53.912237	2026-10-17 04:50:53.912237	0	\N
aeef4b9e-94c8-4147-a2f9-18e5aae76543	f76111ae-3927-46fd-8f83-9556a8702a68	e7ab0520-4bad-4461-8452-6514076ae136	branches	SUCCESS	2026-10-17 04:50:53.973	pulled 0 rows	2026-10-17 04:50:53.973639	2026-10-17 04:50:53.973639	0	\N
52e438e0-b7b1-475b-9efa-6609ccda71de	617acfb9-e596-4dac-9ffe-6a7df44fd061	8da0be1f-f403-4145-ab35-04ce96b8edc5	purchases	SUCCESS	2026-10-17 04:50:54.082	pulled 0 rows	2026-10-17 04:50:54.08297	2026-10-17 04:50:54.08297	0	\N
11f340c9-fb0e-421e-9abc-322b3013fa1b	b5e38284-83d1-4dfa-8ffe-66652582f6a0	4ea50e79-0110-4d35-bbd3-a72a50e4196a	notifications	SUCCESS	2026-10-17 04:50:54.181	pulled 0 rows	2026-10-17 04:50:54.182363	2026-10-17 04:50:54.182363	0	\N
69bf3752-5ad5-41bd-b17c-ae775696ccb4	f6799994-c02b-4bd0-8a60-f599c0f0dcfe	a7aec296-4705-49eb-a06a-5522209af3f1	sales	SUCCESS	2026-10-17 04:50:54.189	pulled 0 rows	2026-10-17 04:50:54.189758	2026-10-17 04:50:54.189758	0	\N
9037a370-e22d-46df-926e-9f2214b4bc23	0b69b8b7-2400-49ef-9331-1b0119c2cb34	03c65e6c-176e-40eb-86c4-cf2c31ad287f	roles	SUCCESS	2026-10-17 04:50:54.19	pulled 0 rows	2026-10-17 04:50:54.190749	2026-10-17 04:50:54.190749	0	\N
a7e5214b-83c1-45e0-bdaf-a9addb149b4c	257bf9ae-3bde-4287-94ee-3c3d18be1860	2af25cfe-5adb-4f83-b4a7-098304d6000e	users	SUCCESS	2026-10-17 04:50:54.213	pulled 0 rows	2026-10-17 04:50:54.214347	2026-10-17 04:50:54.214347	0	\N
27390e2b-3997-4d09-a2ff-ff06800a4a45	050edb62-8b9a-489e-b8d5-325d16b99d8f	b35a2641-d142-4efb-be7a-390623bbee3c	products	SUCCESS	2026-10-17 04:51:00.109	pulled 6 rows	2026-10-17 04:51:00.110269	2026-10-17 04:51:00.110269	0	\N
ee042d10-46c8-4119-b750-bd98bf4aab4d	a16322c3-39e6-4027-a553-6af77420fc3e	f7790f38-509d-4072-9d3f-3e91e6163448	customers	SUCCESS	2026-10-17 04:51:00.11	pulled 0 rows	2026-10-17 04:51:00.111195	2026-10-17 04:51:00.111195	0	\N
fd3e5c26-3c8c-4b78-b2ab-fe46a3319b11	414b43ae-e6e1-410e-b1f5-a07828f1fcac	4615e6db-5ba7-4d21-9f78-d1f6aeea3f57	expenses	SUCCESS	2026-10-17 04:51:00.112	pulled 0 rows	2026-10-17 04:51:00.112574	2026-10-17 04:51:00.112574	0	\N
49c41b62-377d-4316-92b4-9e07a671d464	d9d45901-a158-4388-aff6-aad2f6b1e869	3b26f166-23e9-4c25-bd63-6634ae9e602d	inventories	SUCCESS	2026-10-17 04:51:00.545	pulled 6 rows	2026-10-17 04:51:00.545651	2026-10-17 04:51:00.545651	0	\N
0258c44c-b433-4738-9d7d-58b8ed37bd78	8828e029-c25d-4404-9bf7-d98586db57d7	d12ea66c-5f7f-40d8-9136-e916ed57aa87	product-batches	SUCCESS	2026-10-17 04:51:00.558	pulled 2 rows	2026-10-17 04:51:00.55927	2026-10-17 04:51:00.55927	0	\N
a2411c74-ae5b-4735-b2bc-4f5f08ed58c6	3efcb294-bc22-4ec8-8bcf-a1c8ebb18fca	1efdbdaf-6a72-4a6b-9b7b-9bb4a20effc3	inventory-transfers	SUCCESS	2026-10-17 04:51:00.557	pulled 0 rows	2026-10-17 04:51:00.561979	2026-10-17 04:51:00.561979	0	\N
f40abf4c-4308-4bdc-b5fb-f7fdadfaf73f	a324d289-f8c5-4304-858d-6c473bfe8dd2	8d6af1b7-2ba2-400e-bac8-ce0c723c3950	categories	SUCCESS	2026-10-17 04:51:00.815	pulled 0 rows	2026-10-17 04:51:00.815999	2026-10-17 04:51:00.815999	0	\N
638bd01b-8ddc-4748-9125-6612bfbbbccb	eaa772c0-0b5f-4fe6-beaa-e537665d6b63	77b6f755-14b3-4e3b-b04b-bcb6c33f9bd6	units-of-measure	SUCCESS	2026-10-17 04:51:00.912	pulled 0 rows	2026-10-17 04:51:00.913508	2026-10-17 04:51:00.913508	0	\N
8d40950e-71c8-4bbe-98ff-dcbc29803c18	9f3b583a-c03a-46da-b810-89fa9a600aaa	fcc7c8c4-df99-42e4-b440-13f7177fe66f	suppliers	SUCCESS	2026-10-17 04:51:01.279	pulled 0 rows	2026-10-17 04:51:01.279567	2026-10-17 04:51:01.279567	0	\N
5741f869-9dd9-42a8-9b57-3ca5a24bdd21	76c3ba90-2353-4033-bed8-bdf4bf7dbd67	45e7d030-fb47-4474-b46e-2f08a983b5dd	sales	SUCCESS	2026-10-17 04:51:01.28	pulled 0 rows	2026-10-17 04:51:01.292758	2026-10-17 04:51:01.292758	0	\N
9035716a-2bbc-499a-9932-a544ee4996c5	3cc56122-908e-4253-ab90-c3a96a13e1fc	a16e1121-1777-4751-9eb5-e9ac0a1dd068	purchases	SUCCESS	2026-10-17 04:51:01.293	pulled 0 rows	2026-10-17 04:51:01.294072	2026-10-17 04:51:01.294072	0	\N
7cf5b5c4-a08b-4d65-9f03-114c417da632	e9bd008d-6af4-4753-9d9e-9455d0d75211	4b8773d3-2578-4445-82ec-d431329a9244	users	SUCCESS	2026-10-17 04:51:01.294	pulled 0 rows	2026-10-17 04:51:01.295134	2026-10-17 04:51:01.295134	0	\N
302e6150-d361-4f0f-9c2d-044067916842	97318407-b604-48c5-9f07-f2cbe2c5b023	06769096-3c4c-4a10-8d43-ac8acb29b7f6	branches	SUCCESS	2026-10-17 04:51:01.326	pulled 0 rows	2026-10-17 04:51:01.327255	2026-10-17 04:51:01.327255	0	\N
26a362ad-5c1a-447b-bfc5-533711369eea	edeeff79-41f5-4894-8053-9ac241bb6fe0	97eccbc7-32f2-4447-91fc-737a7fc91067	products	SUCCESS	2026-10-17 04:51:01.595	pulled 6 rows	2026-10-17 04:51:01.605602	2026-10-17 04:51:01.605602	0	\N
4912541a-83b4-44df-8c1d-74fa712f7c38	2b3b9ed1-5434-4403-8da7-1f58b3d9270e	dd2070ba-9c3b-480a-bcba-55bd86154bf5	roles	SUCCESS	2026-10-17 04:51:01.606	pulled 0 rows	2026-10-17 04:51:01.607572	2026-10-17 04:51:01.607572	0	\N
7c927e3c-b9ef-4182-8ebf-b26bc5e8a08f	e55590e8-9c2a-4b0f-a032-2ac8656c0986	42f6e047-b6f4-4632-947c-bc3dedb320e1	expenses	SUCCESS	2026-10-17 04:51:01.626	pulled 0 rows	2026-10-17 04:51:01.626982	2026-10-17 04:51:01.626982	0	\N
c311ddf4-0f58-40ac-935f-2205d31be665	a05ff227-398e-4dd6-a742-b141f5df660a	2e9ecc3d-834e-4abb-bcc1-d236a7483768	customers	SUCCESS	2026-10-17 04:51:01.63	pulled 0 rows	2026-10-17 04:51:01.631187	2026-10-17 04:51:01.631187	0	\N
a0e90e46-0b4d-4116-b7d3-2aa81be46cdd	3abda852-85c2-4b8c-b95e-b05eb8f04d87	a3ceab09-c747-4407-a3bb-dc2fc8566e86	inventories	SUCCESS	2026-10-17 04:51:01.635	pulled 6 rows	2026-10-17 04:51:01.636089	2026-10-17 04:51:01.636089	0	\N
953d742a-8d53-4f03-8b37-1927e29decec	ebb290f7-6b6b-40b5-bd28-219dea518619	f9bc6415-8161-42a6-8014-a757be95d431	product-batches	SUCCESS	2026-10-17 04:51:01.754	pulled 2 rows	2026-10-17 04:51:01.759263	2026-10-17 04:51:01.759263	0	\N
8b333f96-e13d-4a00-a599-53f113fe2398	c6a42eed-e58f-479d-afbb-ee328897ee09	1cef0b2b-75e2-4633-8e96-6103ba185494	notifications	SUCCESS	2026-10-17 04:51:01.774	pulled 0 rows	2026-10-17 04:51:01.775228	2026-10-17 04:51:01.775228	0	\N
cd80dd12-a268-47c9-a371-c8ac101b5a45	cbb61d06-13bc-4431-92a3-7585a80118d2	1fdb13d9-1482-4906-b5fe-608d3151a9a4	inventory-transfers	SUCCESS	2026-10-17 04:51:01.789	pulled 0 rows	2026-10-17 04:51:01.791891	2026-10-17 04:51:01.791891	0	\N
65079068-be45-4ea9-b663-b8a0bfdfb0f1	8beb969c-631f-46c6-819c-cf60a42f9774	45e7eb87-6517-4522-864f-6eb8435c4691	units-of-measure	SUCCESS	2026-10-17 04:51:01.853	pulled 0 rows	2026-10-17 04:51:01.853847	2026-10-17 04:51:01.853847	0	\N
17127986-1be3-4ab2-8131-3aaf30159677	0bcc1871-2da5-4791-92c9-a0809c86f2d8	edbebfc9-b82b-467e-a34c-b79795f4c9e5	categories	SUCCESS	2026-10-17 04:51:01.867	pulled 0 rows	2026-10-17 04:51:01.86796	2026-10-17 04:51:01.86796	0	\N
aeebf334-148f-45fb-8b79-9ea10314128b	e007a962-da06-4bc6-b6eb-f019b452c4eb	fb50d8ae-f93f-4f22-99d5-e381aa670330	suppliers	SUCCESS	2026-10-17 04:51:02.018	pulled 0 rows	2026-10-17 04:51:02.028033	2026-10-17 04:51:02.028033	0	\N
30a7691a-0733-4879-b69c-d9b7d6e5c022	743d7f1c-909a-4696-9338-88fdc61f0cd8	ab469174-11d9-41f0-a73e-224c893b62b6	purchases	SUCCESS	2026-10-17 04:51:02.104	pulled 0 rows	2026-10-17 04:51:02.115246	2026-10-17 04:51:02.115246	0	\N
dff7fc21-6cdb-4215-9ac3-1da8cc56c2eb	90ca040c-7fd2-4ba9-b469-b62dd25769b8	8647f04d-1344-4bbb-85c2-41687284bafe	branches	SUCCESS	2026-10-17 04:51:02.452	pulled 0 rows	2026-10-17 04:51:02.457165	2026-10-17 04:51:02.457165	0	\N
e8d98ffe-aa42-4f10-966b-210c43f877a0	b6d39548-e9c7-40d6-8937-1527ee423d2e	73bbdd78-dcd8-432a-b3cc-4f1da86a177d	sales	SUCCESS	2026-10-17 04:51:02.119	pulled 0 rows	2026-10-17 04:51:02.120154	2026-10-17 04:51:02.120154	0	\N
6cfbeaab-73e8-444f-86a5-0a1a52551ee0	7b22ec4c-1e58-4629-893f-3f6a7587da15	5c6c3b3c-2c63-456d-8c46-3c67b3af2942	users	SUCCESS	2026-10-17 04:51:02.436	pulled 0 rows	2026-10-17 04:51:02.437356	2026-10-17 04:51:02.437356	0	\N
84970dc9-8b77-4cd5-b27c-be2bd2c9203e	e5eb4a3b-232d-4f44-a8ab-846e25c14bf7	49c3dec3-0d10-4f9e-b9a1-9843e3427ff5	notifications	SUCCESS	2026-10-17 04:51:02.557	pulled 0 rows	2026-10-17 04:51:02.56058	2026-10-17 04:51:02.56058	0	\N
a2732e97-9447-496e-b86c-123a767ae886	f46aafab-a998-44fc-9ad1-59d36ccb9202	9e73487d-0d6d-4134-a486-211077c16841	roles	SUCCESS	2026-10-17 04:51:02.544	pulled 0 rows	2026-10-17 04:51:02.545158	2026-10-17 04:51:02.545158	0	\N
db9dd60d-63b2-4992-a073-56fbf9894d9e	68857b6b-8590-404c-919d-bd927b27b5e2	2b12bb09-d15e-4f7c-97a7-9f2b946482c4	customers	SUCCESS	2026-10-17 04:51:56.416	pulled 0 rows	2026-10-17 04:51:56.416814	2026-10-17 04:51:56.416814	0	\N
415a9d66-7601-47fb-9daa-9f747a334980	45b84820-560c-440f-bca2-ab5f21a0d045	2cbd6e7c-ef30-4c5e-be79-4a5f4bf19b05	inventories	SUCCESS	2026-10-17 04:51:56.423	pulled 6 rows	2026-10-17 04:51:56.43283	2026-10-17 04:51:56.43283	0	\N
bc1fe2e5-41f8-492b-8085-04e3469b837e	c719297d-37ec-43c8-acb7-75a687c6e087	88a2b1c9-3701-41ec-8835-2d11db7bda01	products	SUCCESS	2026-10-17 04:51:56.431	pulled 6 rows	2026-10-17 04:51:56.432566	2026-10-17 04:51:56.432566	0	\N
121c668e-e0be-4804-ab1a-85def9b96373	d6aaaefb-bb35-4f9d-ac75-7f7a63fb2b03	0bb39f79-4029-4951-9909-95f2f220603b	expenses	SUCCESS	2026-10-17 04:51:56.465	pulled 0 rows	2026-10-17 04:51:56.484605	2026-10-17 04:51:56.484605	0	\N
ae6311b7-89cc-4745-879b-eb12b93ecbb3	be1f9d1a-9901-4f4c-8e47-966238a1f248	803e185d-f915-4c49-8690-f9804501ff29	product-batches	SUCCESS	2026-10-17 04:51:56.624	pulled 2 rows	2026-10-17 04:51:56.625477	2026-10-17 04:51:56.625477	0	\N
16b913b3-cb5b-45fd-bb73-db8baaaabe04	26e6f12e-2bd4-44fa-823d-3309cc6e5561	e94a197b-c099-4bd7-9e27-90db3abce1d2	inventory-transfers	SUCCESS	2026-10-17 04:51:56.638	pulled 0 rows	2026-10-17 04:51:56.639208	2026-10-17 04:51:56.639208	0	\N
78218df9-99f8-4f19-8a05-d3cdbae83f97	335a4b2b-c849-416b-8ede-b92a5c2504e3	fa898aca-9a0c-49d9-92fc-0e6a3db6de90	categories	SUCCESS	2026-10-17 04:51:57.223	pulled 0 rows	2026-10-17 04:51:57.233149	2026-10-17 04:51:57.233149	0	\N
1b7df709-4f4f-4af6-aec7-04f1754c8449	5fb62262-eb45-4b6b-b38f-24a241404763	49139af5-ce55-4327-9488-7687788d28c3	units-of-measure	SUCCESS	2026-10-17 04:51:57.226	pulled 0 rows	2026-10-17 04:51:57.238807	2026-10-17 04:51:57.238807	0	\N
c6ab6593-3735-479b-b0aa-dcfdc793d14e	623bceaa-d69a-455c-bc17-7cbf10bf8ee8	4e14338a-60cf-4f80-aaa1-1040b4b4f195	suppliers	SUCCESS	2026-10-17 04:51:57.349	pulled 0 rows	2026-10-17 04:51:57.350515	2026-10-17 04:51:57.350515	0	\N
43a9bbf4-6547-47a6-b73e-8cd35cfe315e	605fe1c2-462f-4074-95a4-b1d18fa81286	4188a8fb-0d37-4352-b9b3-8afad1a44df6	branches	SUCCESS	2026-10-17 04:51:57.412	pulled 0 rows	2026-10-17 04:51:57.412846	2026-10-17 04:51:57.412846	0	\N
a1a650ad-d425-43a1-ad6c-8016d179fba7	fbfc7508-8afd-4369-92ae-d2e6fc10e705	f322f632-3ed4-4594-a700-24c149bc052e	sales	SUCCESS	2026-10-17 04:51:57.526	pulled 0 rows	2026-10-17 04:51:57.52799	2026-10-17 04:51:57.52799	0	\N
3101097a-63b8-4fa9-91be-494cf2c113f6	170e6fe1-1800-4a70-8311-150afec15e48	0f935804-c0fb-43e1-9bee-7e1f39210378	purchases	SUCCESS	2026-10-17 04:51:57.569	pulled 0 rows	2026-10-17 04:51:57.572713	2026-10-17 04:51:57.572713	0	\N
7778b770-a7c3-4694-969e-447664909089	598b5392-c766-487e-b98a-df04cdb37097	229a5bc1-1cb0-41f7-bfc2-4635ca39a64a	users	SUCCESS	2026-10-17 04:51:57.614	pulled 0 rows	2026-10-17 04:51:57.630585	2026-10-17 04:51:57.630585	0	\N
0e7c81ed-614e-443d-8db5-936b16ea56e0	44c91a88-f4fe-4456-b71e-0e96cb476466	e724e1ac-f996-400c-a676-05246e068edf	notifications	SUCCESS	2026-10-17 04:51:57.712	pulled 0 rows	2026-10-17 04:51:57.713355	2026-10-17 04:51:57.713355	0	\N
6fad7a2b-9a97-4c1d-b49d-a6fa48b66a52	a8d45109-d21b-4b2e-bd65-caaa4e46de03	0ce0b873-2209-4b89-94b0-f81a9339fb3b	roles	SUCCESS	2026-10-17 04:51:57.735	pulled 0 rows	2026-10-17 04:51:57.756568	2026-10-17 04:51:57.756568	0	\N
6f3daa85-0a74-4c02-8537-bda08914ed6f	fee8148f-82d8-4bf8-aa69-85208625371c	01ac7b77-e2d7-4fa0-8d78-13d9858d9742	expenses	SUCCESS	2026-10-17 04:52:56.309	pulled 0 rows	2026-10-17 04:52:56.31027	2026-10-17 04:52:56.31027	0	\N
63d4ff4b-b5fb-4e22-ba80-88d5e0729238	da6f49fa-618c-4c33-b360-e6d83ad8514a	d3e71690-53ba-43fe-9a87-5b59eb93ba01	products	SUCCESS	2026-10-17 04:52:56.322	pulled 6 rows	2026-10-17 04:52:56.323332	2026-10-17 04:52:56.323332	0	\N
d1fec81b-f08c-4684-b398-e4d5cda8b7ae	41ba7a5f-8047-4a87-aea8-0ea552e463ae	5f93f2be-b9bd-4535-9868-092ef82a212e	customers	SUCCESS	2026-10-17 04:52:56.323	pulled 0 rows	2026-10-17 04:52:56.335016	2026-10-17 04:52:56.335016	0	\N
f60577b5-fd71-40b5-9561-9b8aebb0d9fe	88ec5d0f-d86c-419a-9ec7-6ff6c874ef2b	384ad9f1-c27d-4710-af64-91864f00f939	inventories	SUCCESS	2026-10-17 04:52:56.377	pulled 6 rows	2026-10-17 04:52:56.378354	2026-10-17 04:52:56.378354	0	\N
b8bad4e9-269b-4656-b850-50271cfa2f51	61742475-9f96-4c01-8f80-5f149a44b4cb	ab2a0d86-d1c2-4e2c-b928-81c59e9ca871	product-batches	SUCCESS	2026-10-17 04:52:56.476	pulled 2 rows	2026-10-17 04:52:56.476648	2026-10-17 04:52:56.476648	0	\N
f32a05f5-2ba6-4174-be12-071e69015133	531d71c2-8dd1-43d4-9750-6f79b5db51d6	c03ac15c-6f75-4842-b43a-10a362e0d21a	inventory-transfers	SUCCESS	2026-10-17 04:52:56.481	pulled 0 rows	2026-10-17 04:52:56.485058	2026-10-17 04:52:56.485058	0	\N
b5122214-6a1f-4ca9-86c1-65a082f78207	66fa7331-3819-4439-8d9c-59744850f461	2ef41499-a06c-41a5-9f53-19bd2fea51a9	categories	SUCCESS	2026-10-17 04:52:56.715	pulled 0 rows	2026-10-17 04:52:56.721076	2026-10-17 04:52:56.721076	0	\N
162304be-b0aa-491b-80eb-47e1cd3d9236	c64849a5-cf5a-4c83-9fca-037b2f56ff51	23aa01c1-d938-4cd7-9bcd-de215f191062	units-of-measure	SUCCESS	2026-10-17 04:52:56.856	pulled 0 rows	2026-10-17 04:52:56.874044	2026-10-17 04:52:56.874044	0	\N
8427d50c-f2a1-4b30-aaea-44bfb2f63f68	d0c28bfd-9936-45a8-a2c6-e6a7ab9088e3	d9a5266e-8e25-4939-bdb1-49d33d693862	branches	SUCCESS	2026-10-17 04:52:56.922	pulled 0 rows	2026-10-17 04:52:56.922675	2026-10-17 04:52:56.922675	0	\N
22fa946b-5ebb-42f8-a07b-296ddec1ae45	006a1eb0-2913-4f18-8e6d-339a691e6ddc	feea5834-289e-4eee-9df8-3b122988418f	suppliers	SUCCESS	2026-10-17 04:52:56.936	pulled 0 rows	2026-10-17 04:52:56.937713	2026-10-17 04:52:56.937713	0	\N
f2820795-e6e2-48b9-8666-35355c803018	7cb43df6-2981-41c7-abf1-fb92b3c4b624	52ba740a-08b4-4f81-9072-6dd6633fac8d	purchases	SUCCESS	2026-10-17 04:52:56.956	pulled 0 rows	2026-10-17 04:52:56.95713	2026-10-17 04:52:56.95713	0	\N
10ca1fd0-f820-4a40-a36a-4d08a24ca412	c904ae17-91bc-4811-b552-e0f23afac48b	b4c8e461-6b6c-415a-aa15-19d37c34f9c7	notifications	SUCCESS	2026-10-17 04:52:57.18	pulled 0 rows	2026-10-17 04:52:57.180901	2026-10-17 04:52:57.180901	0	\N
27ba78ea-c7ce-42bd-88dc-51c2252da6d1	1054f16c-1f2f-44a6-87ee-41e0304c2e77	6fb473e1-0b7f-4e19-b5c8-c88bed4bfda6	roles	SUCCESS	2026-10-17 04:52:57.189	pulled 0 rows	2026-10-17 04:52:57.190711	2026-10-17 04:52:57.190711	0	\N
b0712cdb-97a4-455b-ab1f-b129284942fa	00d88189-6912-4e88-93c7-d9055528a460	5242b4dc-7bb8-4a2f-94e1-5297f9a97cbb	users	SUCCESS	2026-10-17 04:52:57.193	pulled 0 rows	2026-10-17 04:52:57.205925	2026-10-17 04:52:57.205925	0	\N
c5e36951-e920-4d04-86e9-385ed4c6f844	576c897c-25f9-4a2a-855b-3e8c1654a4f5	0889b5eb-d9ba-4d69-b420-68d7ed58fd56	sales	SUCCESS	2026-10-17 04:52:57.208	pulled 0 rows	2026-10-17 04:52:57.208765	2026-10-17 04:52:57.208765	0	\N
f3a10d31-90c5-4e3d-abf2-1f3295920b71	7c4d49f6-78c3-477c-b820-5d39f6b36db4	f49ef31b-2c25-48f4-9edd-9df4e24e3c88	expenses	SUCCESS	2026-10-17 04:53:56.211	pulled 0 rows	2026-10-17 04:53:56.212178	2026-10-17 04:53:56.212178	0	\N
c9aae42c-921f-4529-bd79-f68bb51d0c87	12355d40-a0bd-45b6-920b-9602193b04be	77a1e4af-c790-42ad-8df6-121b09dbed00	inventories	SUCCESS	2026-10-17 04:53:56.208	pulled 6 rows	2026-10-17 04:53:56.209862	2026-10-17 04:53:56.209862	0	\N
87c41c6c-1d49-47e2-b6fa-953f5928e065	6ef36e6c-93df-4462-acfa-ae82a225cefe	7f7e385e-7a42-4c02-b7c6-2bd368ab694e	products	SUCCESS	2026-10-17 04:53:56.216	pulled 6 rows	2026-10-17 04:53:56.217507	2026-10-17 04:53:56.217507	0	\N
8b376cb8-cf49-452d-b07d-0e3fe68847e2	a4bd9e60-47e2-48a3-8cc0-bb208f2810c1	9694b8f1-a640-4a35-81c0-f8bc15625072	customers	SUCCESS	2026-10-17 04:53:56.224	pulled 0 rows	2026-10-17 04:53:56.225254	2026-10-17 04:53:56.225254	0	\N
6ed1b1ea-4d68-4f47-8d5d-37e897697533	d25a166b-63e2-4d9f-8871-3d52ac235e4f	31682d0d-7f1c-4325-a283-c066b4bca5e9	inventory-transfers	SUCCESS	2026-10-17 04:53:56.229	pulled 0 rows	2026-10-17 04:53:56.230233	2026-10-17 04:53:56.230233	0	\N
bb9d3973-2cd6-424a-b17b-9bcd96733f76	f235fd7e-3c29-4c67-b93c-c7930a3d429f	8bbd9496-d987-4e04-a147-e6f97c59daab	product-batches	SUCCESS	2026-10-17 04:53:56.537	pulled 2 rows	2026-10-17 04:53:56.538699	2026-10-17 04:53:56.538699	0	\N
7c3479ef-b5bf-4071-ac09-6abcbe007fa5	5a7234fc-276d-4b60-a981-ab1b60e0cb78	378d768a-2152-44fd-8318-6dd273b84a74	categories	SUCCESS	2026-10-17 04:53:56.888	pulled 0 rows	2026-10-17 04:53:56.8897	2026-10-17 04:53:56.8897	0	\N
900996f7-fdcc-4a98-8334-0599c5e15911	d4520776-2043-452c-b574-3ef0afa298a0	2906da52-5d94-4742-925b-5468e4ad2547	units-of-measure	SUCCESS	2026-10-17 04:53:56.892	pulled 0 rows	2026-10-17 04:53:56.896167	2026-10-17 04:53:56.896167	0	\N
7158e3ae-db00-426e-926b-b0866093b708	441de7a3-2301-4b0d-8174-dc17ebf08700	8dd32d13-e09c-4e69-9433-6e113ea753a2	sales	SUCCESS	2026-10-17 04:53:57.476	pulled 0 rows	2026-10-17 04:53:57.477518	2026-10-17 04:53:57.477518	0	\N
6da6cd5d-9ed5-4dd0-af77-70faaf3c978b	d19bd9b8-598b-47d5-bb00-31a7b81e6ffd	2270c2ba-a6a5-4f82-adfc-f1c514930ce9	users	SUCCESS	2026-10-17 04:53:57.513	pulled 0 rows	2026-10-17 04:53:57.514595	2026-10-17 04:53:57.514595	0	\N
79da7142-5b24-4d52-a774-1643b6bbcacd	a3c883a1-a59e-45c0-9d5e-2b70443dd32e	f0d7f480-9653-4de3-9459-c797adafe8ca	suppliers	SUCCESS	2026-10-17 04:53:57.523	pulled 0 rows	2026-10-17 04:53:57.526276	2026-10-17 04:53:57.526276	0	\N
edf486f9-0342-40cf-80a2-829b6ab39141	0f62ab73-9a7a-4ddf-b0f3-90f37f271fe6	c2f388ca-51b3-4842-8ec1-162a28853a90	branches	SUCCESS	2026-10-17 04:53:57.53	pulled 0 rows	2026-10-17 04:53:57.531204	2026-10-17 04:53:57.531204	0	\N
1b42ee2a-cf38-499d-bfc9-60426ed3e35e	27e8b6d6-21b1-43a2-a835-0f099d5597f6	bbb696c6-fe15-4e62-931a-056faaade341	purchases	SUCCESS	2026-10-17 04:53:57.537	pulled 0 rows	2026-10-17 04:53:57.538612	2026-10-17 04:53:57.538612	0	\N
3ac1fea7-8aab-420c-af84-c00f86ff1f2c	fc7b2608-8543-4d91-93e4-fdee1ab0cd7e	4fa3c5a0-76fa-43f5-ab36-d381ee450cfd	roles	SUCCESS	2026-10-17 04:53:57.654	pulled 0 rows	2026-10-17 04:53:57.655264	2026-10-17 04:53:57.655264	0	\N
3043abf4-afba-466d-9dda-79f0f7c51f30	723010bf-7a48-40f4-a744-ee84cc14577b	993b4875-ae88-44ba-a4c0-c6e30f82bf89	notifications	SUCCESS	2026-10-17 04:53:57.678	pulled 0 rows	2026-10-17 04:53:57.679121	2026-10-17 04:53:57.679121	0	\N
243a9353-1ea8-4eb5-b685-2703bf01fd6e	873ebe9d-eb6a-465b-b765-45eed5f3c1f0	ba07f9a4-92d6-4328-820e-95628cf719d4	products	SUCCESS	2026-10-17 04:54:56.174	pulled 6 rows	2026-10-17 04:54:56.175273	2026-10-17 04:54:56.175273	0	\N
545fbde7-1f9a-4855-8f10-e50b51fa4edb	e4624604-defc-4ccb-8386-d0239ed7549e	d8ae7c27-7ad8-4cf2-8b28-3e416ca82ca5	customers	SUCCESS	2026-10-17 04:54:56.166	pulled 0 rows	2026-10-17 04:54:56.17526	2026-10-17 04:54:56.17526	0	\N
8069f860-b412-4563-b54b-fe57aec0e590	96090291-60c8-4f27-8d23-43de81125c41	32d1fcb3-9c1b-4d58-bb09-887303027265	inventories	SUCCESS	2026-10-17 04:54:56.301	pulled 6 rows	2026-10-17 04:54:56.301719	2026-10-17 04:54:56.301719	0	\N
1219d90a-0efe-4c7f-9996-b328f9f1e775	4f4720d3-4dda-440f-b9ae-5033febf929d	03ad609e-c283-4457-b3cb-43edb444745e	expenses	SUCCESS	2026-10-17 04:54:56.351	pulled 0 rows	2026-10-17 04:54:56.351942	2026-10-17 04:54:56.351942	0	\N
613b860a-fd23-449d-93b1-3d1249eaec0c	95129a25-9c4a-43e3-92ee-6d63bed8359d	862e2918-cf12-4c16-b55c-b6080e0418f2	inventory-transfers	SUCCESS	2026-10-17 04:54:56.386	pulled 0 rows	2026-10-17 04:54:56.387238	2026-10-17 04:54:56.387238	0	\N
d9c9b899-28cf-474a-a97b-b30b301ce91b	3b137ec9-dbbc-4c9c-8549-e8b96a98f0c3	f6b8a5a6-26be-407c-b06b-b73a6af1c629	product-batches	SUCCESS	2026-10-17 04:54:56.499	pulled 2 rows	2026-10-17 04:54:56.500146	2026-10-17 04:54:56.500146	0	\N
abdb99fa-7e57-49e3-a835-29e4570f683f	8c3bd240-212a-4755-b1b1-606c04f95267	756c1767-8e45-4648-8f19-bd984fb44549	categories	SUCCESS	2026-10-17 04:54:56.645	pulled 0 rows	2026-10-17 04:54:56.64641	2026-10-17 04:54:56.64641	0	\N
26d0dee7-d316-433d-9dee-b8b5f5193dba	4d6d7300-a636-4f12-ad0c-1df02985e9c5	3a581486-0c89-4d8c-b183-795c806d2efc	units-of-measure	SUCCESS	2026-10-17 04:54:56.686	pulled 0 rows	2026-10-17 04:54:56.6939	2026-10-17 04:54:56.6939	0	\N
de4d98cf-ced1-459a-85d2-47064a4f24dc	0bb18984-3a66-437c-9030-2b27e66d59c1	31acbe76-bbc8-4256-ae64-258b8af4c9bd	suppliers	SUCCESS	2026-10-17 04:54:56.85	pulled 0 rows	2026-10-17 04:54:56.855168	2026-10-17 04:54:56.855168	0	\N
fcb26123-ea28-4cae-8698-996d3d4876eb	67158433-5b0d-4a76-9fc0-1270afb7b1b2	08c678a8-52d8-4004-9f2c-fb07b0f00a6c	sales	SUCCESS	2026-10-17 04:54:56.864	pulled 0 rows	2026-10-17 04:54:56.865177	2026-10-17 04:54:56.865177	0	\N
af29d287-1774-4ea8-9d16-c8ecce0a8f11	04fcde9d-ac8a-4fcf-9228-96cafec8a51c	f7c10b43-fdf8-4339-8121-64ea15cd1f27	branches	SUCCESS	2026-10-17 04:54:56.867	pulled 0 rows	2026-10-17 04:54:56.885848	2026-10-17 04:54:56.885848	0	\N
c1940a71-f7e5-406d-a52f-0d7a01139d71	efba51af-9d79-4163-9f99-0c45e1773d84	86206189-f52c-4822-9e3c-6ef462c9b8e0	purchases	SUCCESS	2026-10-17 04:54:56.898	pulled 0 rows	2026-10-17 04:54:56.907239	2026-10-17 04:54:56.907239	0	\N
33592dea-90af-4b91-ac70-44e960076850	459fee55-39b7-490e-a9d6-b0519f2ce94f	214eaec8-b928-47f0-9843-348bceb27f9f	users	SUCCESS	2026-10-17 04:54:56.945	pulled 0 rows	2026-10-17 04:54:56.949941	2026-10-17 04:54:56.949941	0	\N
6a43d96f-2462-412f-ae39-32c1e962bdf3	def16eef-0bbb-4991-9cb3-89fc5dbc9311	7b37e885-0ce5-416a-ba56-d21779e94c0c	notifications	SUCCESS	2026-10-17 04:54:57.014	pulled 0 rows	2026-10-17 04:54:57.014639	2026-10-17 04:54:57.014639	0	\N
1a71e7b9-6079-4016-887c-fc2bf2749ce7	d687bfef-c499-4f8b-8a0e-c25d5c9912f2	2cbb1864-47d7-4a87-a779-01cdc2424dc9	roles	SUCCESS	2026-10-17 04:54:57.015	pulled 0 rows	2026-10-17 04:54:57.018006	2026-10-17 04:54:57.018006	0	\N
b60f954d-404b-4193-b4c8-6a36e8121481	bfa90d9e-98c8-44ee-b34e-a6fd676abcfb	4c06aea3-50fd-47bf-a3b0-e1a660b9de72	products	SUCCESS	2026-10-17 04:55:56.1	pulled 6 rows	2026-10-17 04:55:56.107504	2026-10-17 04:55:56.107504	0	\N
454f00c4-19c2-4732-9db7-93ca3883ac35	5be0608a-f4ce-4e65-b660-f1f6e3b3ebec	835f8fc7-1465-4c38-bbdf-b43ed5caf0bd	inventories	SUCCESS	2026-10-17 04:55:56.142	pulled 6 rows	2026-10-17 04:55:56.143443	2026-10-17 04:55:56.143443	0	\N
f39cd760-a0d6-4b7e-961f-77bdffdc631e	c23a703c-7e38-4e84-b650-ac30bf1632ef	cb6c695e-fc5e-4e7c-8ade-de3660bd4ce3	customers	SUCCESS	2026-10-17 04:55:56.141	pulled 0 rows	2026-10-17 04:55:56.142108	2026-10-17 04:55:56.142108	0	\N
9a013b9c-f016-4e72-885d-96ebdb648a2c	ca7e5e70-157c-4b92-818a-e4af4997fa2a	a95780a5-bd3a-4d2b-950c-59a8f5674bf7	expenses	SUCCESS	2026-10-17 04:55:56.171	pulled 0 rows	2026-10-17 04:55:56.171662	2026-10-17 04:55:56.171662	0	\N
83312cc0-ac66-4bce-9729-97856f5e2f47	95b330da-62b9-4b84-95fa-291fe7c57f8c	f853305e-ca19-41ff-afef-148b3d51a118	inventory-transfers	SUCCESS	2026-10-17 04:55:56.378	pulled 0 rows	2026-10-17 04:55:56.379038	2026-10-17 04:55:56.379038	0	\N
a0502d9d-4101-4bd6-9add-b50e33abb8c4	7eda5e2f-0713-4518-bec3-675f38c4d67a	4746539f-10f5-4811-9742-928347f08c2a	product-batches	SUCCESS	2026-10-17 04:55:57.104	pulled 2 rows	2026-10-17 04:55:57.108193	2026-10-17 04:55:57.108193	0	\N
24d8a131-27f8-4818-95c7-48ddb3c19dbf	008cf15d-de57-4df6-9c35-74fe93fdc740	3aa313bd-85d8-4e92-9392-7e6457606f9d	categories	SUCCESS	2026-10-17 04:55:57.113	pulled 0 rows	2026-10-17 04:55:57.115687	2026-10-17 04:55:57.115687	0	\N
720224d0-cba0-4798-b6b6-cc790c3d4833	5ceae100-d06a-4147-bcd7-4f0425454c8d	6779276e-9f62-46ab-b1e2-001e6a43abf9	units-of-measure	SUCCESS	2026-10-17 04:55:57.22	pulled 0 rows	2026-10-17 04:55:57.22349	2026-10-17 04:55:57.22349	0	\N
eecf3a72-3a43-4745-805f-61d1dc5fd19f	e614fdc4-4a26-4930-9a52-7db2a070650f	ee3c5ec5-1009-4f4a-a232-11e423552f26	suppliers	SUCCESS	2026-10-17 04:55:57.229	pulled 0 rows	2026-10-17 04:55:57.230146	2026-10-17 04:55:57.230146	0	\N
e820e693-33d3-4a41-a48e-4f3ed200a0a6	6d086d35-e580-4b17-a226-dd7f96f76981	58c4b3af-c2c5-4409-927f-2469564a44c5	branches	SUCCESS	2026-10-17 04:55:57.264	pulled 0 rows	2026-10-17 04:55:57.265216	2026-10-17 04:55:57.265216	0	\N
c784fe36-79d7-4d04-b4a1-a3941f772c46	765afe98-7d4d-4e74-a908-cbc5be2afede	faea1742-c1aa-4051-89cb-3a03a264dae7	sales	SUCCESS	2026-10-17 04:55:57.265	pulled 0 rows	2026-10-17 04:55:57.269817	2026-10-17 04:55:57.269817	0	\N
cf14fe22-3655-4d92-acb9-845bc7bc932b	54511742-060c-4a92-a075-3a4e5c7cbc01	ede8c7d7-58c5-4a43-9f9e-832ba10d91d7	purchases	SUCCESS	2026-10-17 04:55:57.268	pulled 0 rows	2026-10-17 04:55:57.274463	2026-10-17 04:55:57.274463	0	\N
a942548f-5b38-480a-88df-a55deb48578a	319b1691-1c25-4560-a2b9-03a469d642a2	17040051-b470-423e-b4a2-0e93b89120aa	users	SUCCESS	2026-10-17 04:55:57.307	pulled 0 rows	2026-10-17 04:55:57.307779	2026-10-17 04:55:57.307779	0	\N
0f75ccc9-e6ec-4b0d-b6ea-4151207b6ac3	90479765-0cfa-4f9d-b3ea-545fafcf740b	a79eea21-ea9a-4d5c-8771-8f32a2bc77bf	roles	SUCCESS	2026-10-17 04:55:57.342	pulled 0 rows	2026-10-17 04:55:57.342947	2026-10-17 04:55:57.342947	0	\N
19842fa3-a0de-4285-8c15-1225c235b2d3	abd7b6bc-23e3-4286-b236-401d737c487a	7c39d796-5c44-48c8-8082-bc9522b9405b	notifications	SUCCESS	2026-10-17 04:55:57.354	pulled 0 rows	2026-10-17 04:55:57.358644	2026-10-17 04:55:57.358644	0	\N
a6dbecec-792e-4783-a694-e36479d27a18	2aff0738-b55f-4a90-ba8d-a283d9976f1c	6729f9ad-63cf-4dfb-ab92-ac7f3fa6e1cc	products	SUCCESS	2026-10-17 04:56:56.159	pulled 6 rows	2026-10-17 04:56:56.160471	2026-10-17 04:56:56.160471	0	\N
42ad6da0-0d84-4dd5-9f06-02d316e7790e	1a9cf464-0410-4543-825d-701aad702ae5	780705a4-79f7-449f-ac1e-7d4e602dd569	customers	SUCCESS	2026-10-17 04:56:56.177	pulled 0 rows	2026-10-17 04:56:56.178106	2026-10-17 04:56:56.178106	0	\N
b7574fc8-6d29-41f2-a90b-7645196e8e46	9a4b7173-7b57-4254-a645-570b77ddd161	a62b2c15-95a9-4e5f-b3ba-334e6c8cf051	expenses	SUCCESS	2026-10-17 04:56:56.185	pulled 0 rows	2026-10-17 04:56:56.186569	2026-10-17 04:56:56.186569	0	\N
bba305a1-1a68-4fd6-aaef-d940fce97ceb	ad1873e5-ec83-4864-a75b-0430d5addf29	0dbf5384-5b11-4b0f-881b-948919c46519	inventory-transfers	SUCCESS	2026-10-17 04:56:56.302	pulled 0 rows	2026-10-17 04:56:56.303599	2026-10-17 04:56:56.303599	0	\N
cc521a25-345e-4427-861b-425c00740193	38f71ec6-f9b9-4607-940a-bc5e7a5a9c70	89c69d13-cc6f-435e-a133-f137ccbc1a95	inventories	SUCCESS	2026-10-17 04:56:56.307	pulled 6 rows	2026-10-17 04:56:56.308808	2026-10-17 04:56:56.308808	0	\N
87c09392-f892-4850-ad21-4aba34e4bfdd	493e5bf8-ab4b-40b6-a598-c2624d92687f	56e71faa-b1c2-49fc-8805-4efb3191e658	product-batches	SUCCESS	2026-10-17 04:56:56.696	pulled 2 rows	2026-10-17 04:56:56.697866	2026-10-17 04:56:56.697866	0	\N
59806c39-239e-49d3-b6cb-ed98faa1fab5	a7f79cdb-1b28-416b-a474-39439a48bd2c	bfb25ca9-fd3d-43ed-a527-c46a5869a1a4	categories	SUCCESS	2026-10-17 04:56:56.783	pulled 0 rows	2026-10-17 04:56:56.7838	2026-10-17 04:56:56.7838	0	\N
e51eb3e5-f507-45bc-bb7b-dab345ef8ac1	6d606005-a985-44b4-af43-c5d5358af57f	539a7d4f-3f3a-4184-b803-3f94a40ef049	units-of-measure	SUCCESS	2026-10-17 04:56:56.874	pulled 0 rows	2026-10-17 04:56:56.874437	2026-10-17 04:56:56.874437	0	\N
1379d954-3371-4bd3-9cc2-f6c68fab6094	df28f1ec-f1d9-4eb1-9f09-0259ab09cfe8	da68f63b-4c39-493c-b1f5-71991b491676	suppliers	SUCCESS	2026-10-17 04:56:56.879	pulled 0 rows	2026-10-17 04:56:56.879849	2026-10-17 04:56:56.879849	0	\N
caa14f36-bb07-4155-b16d-c69dfd7a3de9	4a4aaba0-5a53-4d55-8b95-3cc4366c4361	4907b999-60c2-404a-b603-fa631f52add8	users	SUCCESS	2026-10-17 04:56:57.109	pulled 0 rows	2026-10-17 04:56:57.11104	2026-10-17 04:56:57.11104	0	\N
40896ce2-15b7-4c40-8712-44f6b01ffa50	a72402d0-4ba4-4547-af91-6bd6e160cbf5	7a7cdaed-76c6-4359-8192-afc94bbc0c2d	branches	SUCCESS	2026-10-17 04:56:56.884	pulled 0 rows	2026-10-17 04:56:56.886942	2026-10-17 04:56:56.886942	0	\N
17fa67c8-ef72-404e-8267-f1259a8b8f32	dbdd82dc-01bc-4561-8b14-1c387f2d4fc4	4d340580-f198-4218-a55f-a0cdaa6b13db	sales	SUCCESS	2026-10-17 04:56:56.93	pulled 0 rows	2026-10-17 04:56:56.930307	2026-10-17 04:56:56.930307	0	\N
bee8d80e-2713-4a68-9938-f82688d18754	63c70991-1e53-49f8-a9d1-958c8be3b49c	823ba2bd-57e8-4d06-952e-dcff7b4be720	purchases	SUCCESS	2026-10-17 04:56:56.946	pulled 0 rows	2026-10-17 04:56:56.946672	2026-10-17 04:56:56.946672	0	\N
dae7d8cb-b6da-40e0-9873-a12e4063f881	c7542f2e-dc8c-4cb0-8ecb-f421471fb8a1	7672e333-3a3e-4357-8861-20110daab41c	roles	SUCCESS	2026-10-17 04:56:57.107	pulled 0 rows	2026-10-17 04:56:57.108742	2026-10-17 04:56:57.108742	0	\N
cfa2ce36-7aa1-4645-bddb-c9e997002822	a1f9446a-dc67-4aab-b310-3250f2d97640	6fb0eaaf-97b0-4162-9dc7-6c27a81b34eb	notifications	SUCCESS	2026-10-17 04:56:57.122	pulled 0 rows	2026-10-17 04:56:57.124388	2026-10-17 04:56:57.124388	0	\N
54f42174-faa4-4762-b7d8-c6763841a3fe	4e9d5eea-7071-4729-a142-ea524c5ad963	2cf59648-534a-461d-b4a3-4938b399eacf	customers	SUCCESS	2026-10-17 04:57:56.04	pulled 0 rows	2026-10-17 04:57:56.0405	2026-10-17 04:57:56.0405	0	\N
0ebb76ab-e732-45bd-be20-da4e6bd1b41e	0987ef14-30ec-4766-97c5-8e64864bf9e4	a48ccec5-51c1-426b-a8a9-425804cfe4b4	products	SUCCESS	2026-10-17 04:57:56.042	pulled 6 rows	2026-10-17 04:57:56.043013	2026-10-17 04:57:56.043013	0	\N
325a6d6e-2e6e-48b8-bd26-d24b82c3294a	5b792435-58ed-4cef-90a5-5a4d8a0d664f	07e5bc04-2621-4f13-a744-e7e654dcce1b	expenses	SUCCESS	2026-10-17 04:57:56.051	pulled 0 rows	2026-10-17 04:57:56.052319	2026-10-17 04:57:56.052319	0	\N
24443ee8-53cf-4aa1-9cdb-6f3e90829b5a	75e41685-00be-45a7-bb3e-b4f2de9620a8	8b278210-0045-4e51-8771-8b8c1d732442	inventories	SUCCESS	2026-10-17 04:57:56.069	pulled 6 rows	2026-10-17 04:57:56.070257	2026-10-17 04:57:56.070257	0	\N
85bf296e-1e83-457b-b07a-4e86873a356a	e0228205-d5f1-45e7-885d-eb5799d03ba1	31e21f52-077f-417b-ba9a-9588d1315014	inventory-transfers	SUCCESS	2026-10-17 04:57:56.449	pulled 0 rows	2026-10-17 04:57:56.449925	2026-10-17 04:57:56.449925	0	\N
ba0e0d44-1aed-49a3-968d-3ecbb9abbe92	b64a37c7-54ea-447d-bf3d-f650c9a47526	d115a960-0cc1-45ff-b3b6-7699f2787eb5	categories	SUCCESS	2026-10-17 04:57:56.576	pulled 0 rows	2026-10-17 04:57:56.57701	2026-10-17 04:57:56.57701	0	\N
35eb1435-ba34-4a5a-99b2-1900cc826cba	5f66033a-7a01-4d81-82f9-a3a44771dd7e	e9c1998b-fa76-4b96-95cc-8213abff8a57	product-batches	SUCCESS	2026-10-17 04:57:56.579	pulled 2 rows	2026-10-17 04:57:56.579912	2026-10-17 04:57:56.579912	0	\N
d7215804-3f43-4b6f-9d7c-33fdfa6c99b6	7412f132-06a9-4362-b601-8030df63011d	edbcaed5-7911-4965-83bd-f8db41b3cb5d	units-of-measure	SUCCESS	2026-10-17 04:57:56.608	pulled 0 rows	2026-10-17 04:57:56.608446	2026-10-17 04:57:56.608446	0	\N
b1a8d303-4399-4e29-b5c2-a2c9bf86c4de	9991ebc3-bfb6-4bd2-a6e0-98ba048996de	d61f71ee-cd29-44c4-b2c9-cf40388acf9f	suppliers	SUCCESS	2026-10-17 04:57:56.62	pulled 0 rows	2026-10-17 04:57:56.621368	2026-10-17 04:57:56.621368	0	\N
89488261-cec7-4749-a989-db27c1f04418	ed925cb8-207e-458c-abd0-995ee0d33044	2180a65b-41bd-4cdc-9a54-67b49a1d72aa	sales	SUCCESS	2026-10-17 04:57:56.769	pulled 0 rows	2026-10-17 04:57:56.785693	2026-10-17 04:57:56.785693	0	\N
a8fd9baf-115b-4e15-bc22-05054f44f439	96ae75b1-fb6d-4385-83e0-a72bc5898c2d	37b4e0ea-85a7-4dbb-8a0b-7f372a99275a	branches	SUCCESS	2026-10-17 04:57:56.825	pulled 0 rows	2026-10-17 04:57:56.826391	2026-10-17 04:57:56.826391	0	\N
90e5cdf7-8921-49c9-945a-25a493d11a61	27bd20e3-3e87-4617-a073-c013e060dc0a	c391dab8-f532-4701-adff-f2d2cfe7e3aa	purchases	SUCCESS	2026-10-17 04:57:56.828	pulled 0 rows	2026-10-17 04:57:56.829665	2026-10-17 04:57:56.829665	0	\N
fe41ba02-d5e4-4bb7-a66d-b50fc25dc3af	e7f5bbf2-0e6e-4dc0-86e0-f967c82799f2	0ca851a0-c862-4c6a-bd70-54f0ca5a3096	users	SUCCESS	2026-10-17 04:57:56.83	pulled 0 rows	2026-10-17 04:57:56.830847	2026-10-17 04:57:56.830847	0	\N
8a35792d-745d-483a-b8f8-d150b7f3f109	f92edf63-fcb7-4802-8749-f500422d12e1	bb8a475b-055c-4582-b403-0cd0a213addf	roles	SUCCESS	2026-10-17 04:57:56.887	pulled 0 rows	2026-10-17 04:57:56.887318	2026-10-17 04:57:56.887318	0	\N
d7ebd5ba-0a41-4c08-81c2-2f33a4433888	e088a10b-2312-468e-bb3b-4274d1a2b472	7f1df69f-76ff-48fc-80c0-338a50996402	notifications	SUCCESS	2026-10-17 04:57:56.962	pulled 0 rows	2026-10-17 04:57:56.963084	2026-10-17 04:57:56.963084	0	\N
22bc2847-4d6b-45ce-8177-52409f8ddd92	5b1dfd48-a9fe-436e-ab24-7306c0685111	3a377439-ae85-489c-853c-71c1fb309cc0	products	SUCCESS	2026-10-17 04:58:56.239	pulled 6 rows	2026-10-17 04:58:56.245803	2026-10-17 04:58:56.245803	0	\N
590310b9-6326-4836-862b-fdc2043792ea	e92aad48-ed7c-4fc5-8789-ba4d30872a61	953abe95-f535-4004-8f31-1dc3c3c6338f	expenses	SUCCESS	2026-10-17 04:58:56.288	pulled 0 rows	2026-10-17 04:58:56.289	2026-10-17 04:58:56.289	0	\N
13b7b5ff-42c1-4385-bb93-9b9464c7759f	3195bf15-37d8-40c5-868f-dc8b3f703157	a0a5d895-23cc-400c-9e12-7d934d0f740f	customers	SUCCESS	2026-10-17 04:58:56.313	pulled 0 rows	2026-10-17 04:58:56.317876	2026-10-17 04:58:56.317876	0	\N
1bc755d7-2143-4c9b-a4f0-ce1e94a53908	76355f66-2ea3-47a2-b28e-04351a55bc12	4fefa0db-18eb-4c61-8d53-a8bd89c46b44	inventory-transfers	SUCCESS	2026-10-17 04:58:56.385	pulled 0 rows	2026-10-17 04:58:56.394328	2026-10-17 04:58:56.394328	0	\N
840fec6a-c1d1-4750-8a7e-2470e1a0d6fa	acdacfbf-b3f6-4843-8969-1cdaf05ae75d	113b28a5-df87-4ac4-9065-723d627bf31f	product-batches	SUCCESS	2026-10-17 04:58:56.4	pulled 2 rows	2026-10-17 04:58:56.40179	2026-10-17 04:58:56.40179	0	\N
780e647c-9402-4dd2-859e-ff38cb4ea0b7	0b62a1f6-5d13-4992-b826-6e5dfdb3951f	236aa49e-0aba-446f-b3c9-f8c0db5ddbb4	inventories	SUCCESS	2026-10-17 04:58:56.447	pulled 6 rows	2026-10-17 04:58:56.449404	2026-10-17 04:58:56.449404	0	\N
ecf492cd-b480-4520-9bb9-d918c6fffbbe	c40f2252-7c14-44ea-b1e2-66913c576d0f	2cae085a-fc8f-4426-ba70-f8a547cc4b0a	categories	SUCCESS	2026-10-17 04:58:56.766	pulled 0 rows	2026-10-17 04:58:56.766529	2026-10-17 04:58:56.766529	0	\N
50b25feb-8026-4589-be4e-352b4ae90c2b	cb1f6f57-9bc6-4710-937f-d8ee231c9c76	5291c338-3316-4398-92ca-f374ea0b9650	suppliers	SUCCESS	2026-10-17 04:58:56.8	pulled 0 rows	2026-10-17 04:58:56.800718	2026-10-17 04:58:56.800718	0	\N
8a963625-a577-44b8-8f0e-e44210f72400	171e2140-15c0-4174-a757-2b03a6f6ef0c	1b1a63d9-b0e6-450b-a91e-28f8ccd46546	units-of-measure	SUCCESS	2026-10-17 04:58:56.818	pulled 0 rows	2026-10-17 04:58:56.81869	2026-10-17 04:58:56.81869	0	\N
f9f9c4a8-7014-4f02-8b2e-add7c41c4071	f42ad667-1a37-49d2-b4da-5d76aa8c9e0e	8e6a4752-6c61-4ab8-9d9c-27c98a3eb03c	branches	SUCCESS	2026-10-17 04:58:56.83	pulled 0 rows	2026-10-17 04:58:56.836081	2026-10-17 04:58:56.836081	0	\N
06eacf86-faf3-49e0-9ee2-8967be5ea29e	b92ecf27-3bf7-4b3f-bf9a-3f490ba22e5f	2f4243e8-0b04-40fb-adc6-dbdef0027e02	purchases	SUCCESS	2026-10-17 04:58:56.92	pulled 0 rows	2026-10-17 04:58:56.921028	2026-10-17 04:58:56.921028	0	\N
20672926-df08-41c0-9f05-3eb33301158a	3242956f-9422-45df-8db1-84766cc8ad28	af86aa83-db78-4b6f-8525-9145732e5a44	sales	SUCCESS	2026-10-17 04:58:56.924	pulled 0 rows	2026-10-17 04:58:56.925943	2026-10-17 04:58:56.925943	0	\N
f64b4efe-2828-4752-83d7-0ea6bbf09094	93d067bc-b7c3-408b-8f7c-a5ed72d00fcd	bc35ce4e-8485-44b0-913f-44d9a40756f3	users	SUCCESS	2026-10-17 04:58:57.013	pulled 0 rows	2026-10-17 04:58:57.016104	2026-10-17 04:58:57.016104	0	\N
b5ab632e-993a-4e7c-a55c-04f02e1c4e79	cc4def61-f1b9-4c70-b6a0-f50738566815	575844f9-33d7-409e-b4be-ec3e4309f432	roles	SUCCESS	2026-10-17 04:58:57.05	pulled 0 rows	2026-10-17 04:58:57.062971	2026-10-17 04:58:57.062971	0	\N
975d46b0-7c86-415b-97e2-80592a627f95	e82adc03-a855-4415-83c3-a33aa84d5414	a0a32bfd-8601-45da-a55c-5f381716c834	notifications	SUCCESS	2026-10-17 04:58:57.066	pulled 0 rows	2026-10-17 04:58:57.066997	2026-10-17 04:58:57.066997	0	\N
5b14008f-13d7-4dbd-a0fa-bb87ff917fac	8b417377-069a-4347-a3e1-c978b463210a	67a00e75-d292-4a74-aba1-9ae9e4166849	customers	SUCCESS	2026-10-17 04:59:56.125	pulled 0 rows	2026-10-17 04:59:56.127294	2026-10-17 04:59:56.127294	0	\N
111fce25-2363-4d3b-bb2d-8f8479007ed3	567d1df8-939a-4f95-b68f-943f2a6e9385	6ab96937-5926-451d-bd9d-7a8d0af41ef9	inventories	SUCCESS	2026-10-17 04:59:56.132	pulled 6 rows	2026-10-17 04:59:56.132594	2026-10-17 04:59:56.132594	0	\N
e52477f0-4a29-4af5-a0aa-2bdaa2d1a17a	8b6cf27e-f3e2-46cb-8d8d-1f3fbe16f215	c86dfe00-8936-44c6-908a-04f8ec2fba9f	products	SUCCESS	2026-10-17 04:59:56.144	pulled 6 rows	2026-10-17 04:59:56.145488	2026-10-17 04:59:56.145488	0	\N
60a98636-fc8c-4fba-bb05-e09a38ce213a	4dbd2e91-778e-4aea-aa07-6c8cca65cc43	3dfd83d3-8b0f-4e4b-92c3-b54edbccdcef	expenses	SUCCESS	2026-10-17 04:59:56.145	pulled 0 rows	2026-10-17 04:59:56.146346	2026-10-17 04:59:56.146346	0	\N
e62d46d7-b811-446c-bb56-1f11b76d8895	35f0f06e-a6cb-4b17-b178-bcb5c45f6ef3	eb62bd12-cb91-4149-9579-b0cdd59663f4	inventory-transfers	SUCCESS	2026-10-17 04:59:56.261	pulled 0 rows	2026-10-17 04:59:56.262199	2026-10-17 04:59:56.262199	0	\N
d2a5f9d1-b7d7-40f8-b4fe-00561be3f839	cf6d81e3-da39-4740-9043-b88501f57615	65670eee-7f03-42db-aec4-66eca7cf0710	units-of-measure	SUCCESS	2026-10-17 04:59:56.63	pulled 0 rows	2026-10-17 04:59:56.631339	2026-10-17 04:59:56.631339	0	\N
66e3d141-d29c-408c-a776-ab5bc337f004	c2421a8d-0a30-4fcc-b1b6-247d92bca4a4	99c242a6-18d2-4a7d-8b42-f86e7bcb26a0	categories	SUCCESS	2026-10-17 04:59:56.631	pulled 0 rows	2026-10-17 04:59:56.633005	2026-10-17 04:59:56.633005	0	\N
298e17b5-cf51-4792-a3bd-031b715a0a9e	9d416c36-7e8b-4bad-b6d0-429bfdff2ef9	0a6d510c-3be1-44e7-9efe-115655561921	suppliers	SUCCESS	2026-10-17 04:59:56.633	pulled 0 rows	2026-10-17 04:59:56.636088	2026-10-17 04:59:56.636088	0	\N
33bf3cbc-79ec-43ae-87cd-6b9f58d9ca45	ddcec5b8-31c0-45f9-a6a4-d978c85d28b6	2d8ca638-fa84-4768-ba46-efd1f12eca10	product-batches	SUCCESS	2026-10-17 04:59:56.638	pulled 2 rows	2026-10-17 04:59:56.639035	2026-10-17 04:59:56.639035	0	\N
98b3be4d-b029-4d6f-acb2-35d6b74f0516	e9d2b56e-c3de-4226-8014-cd75d719af7a	f0e7fbba-0472-4b3e-b0b6-680cd5c080fe	branches	SUCCESS	2026-10-17 04:59:56.692	pulled 0 rows	2026-10-17 04:59:56.693918	2026-10-17 04:59:56.693918	0	\N
9bcfb1ca-49e0-4003-9074-ab3204922912	28fe8c90-79ae-49d6-9824-0fcbc33431ba	91d06029-050c-42be-834f-650d85563c0b	sales	SUCCESS	2026-10-17 04:59:56.782	pulled 0 rows	2026-10-17 04:59:56.783234	2026-10-17 04:59:56.783234	0	\N
dac99e20-b6c6-4860-bb82-063c0bf5e3c5	ab639c55-71bd-4080-b53b-be4296d37f5a	42bf242c-6728-4fb3-9591-dc2ec90ae44c	purchases	SUCCESS	2026-10-17 04:59:56.784	pulled 0 rows	2026-10-17 04:59:56.784657	2026-10-17 04:59:56.784657	0	\N
ca6b8ff3-0daf-4d04-84ae-48679d18325a	f1ef831e-6672-485e-92e9-879d244d904f	69b3ea40-1121-40cc-ad63-59ffb1325c9b	roles	SUCCESS	2026-10-17 04:59:56.784	pulled 0 rows	2026-10-17 04:59:56.785264	2026-10-17 04:59:56.785264	0	\N
8867b007-8d2b-42b5-8813-e9a72db8fe81	fac1575a-b2b5-46aa-bb9f-b9a97552f243	1a5afe61-27aa-4d1a-86bd-2743553f31d1	users	SUCCESS	2026-10-17 04:59:56.785	pulled 0 rows	2026-10-17 04:59:56.785872	2026-10-17 04:59:56.785872	0	\N
dc05446c-7831-4b30-b27f-ea2d94d178be	c71c1880-2681-453a-b518-746aa2bea8ac	b1d43cab-6446-41ce-917c-8775582cf2f6	notifications	SUCCESS	2026-10-17 04:59:56.799	pulled 0 rows	2026-10-17 04:59:56.799452	2026-10-17 04:59:56.799452	0	\N
187b0d91-f2ec-4a35-a70b-8a31ee0c30c7	75580101-473b-40de-b8f4-07bd758b7da3	ebf4e6c1-ac98-4f56-8331-416564e2d007	customers	SUCCESS	2026-10-17 05:00:56.158	pulled 0 rows	2026-10-17 05:00:56.159204	2026-10-17 05:00:56.159204	0	\N
c87a8ff7-1e13-415f-88f8-0da9ab55fc64	0d87eb7c-b838-428a-994f-278b8e9f7a28	fe10907c-b92d-441c-a980-54a931335e31	expenses	SUCCESS	2026-10-17 05:00:56.161	pulled 0 rows	2026-10-17 05:00:56.162438	2026-10-17 05:00:56.162438	0	\N
7c719076-2cdd-4b66-a83e-5581c1201d64	69b8318c-934a-49d7-88e0-d2cf11d14462	412493a8-2bc1-4302-a83c-968b1a05d8bc	products	SUCCESS	2026-10-17 05:00:56.163	pulled 6 rows	2026-10-17 05:00:56.168101	2026-10-17 05:00:56.168101	0	\N
ec4137e7-3619-4306-91df-07bacb74c156	f20a0d2f-463d-43aa-929f-5b49afe46abe	9ba99899-cc11-4360-b703-019f98920591	inventories	SUCCESS	2026-10-17 05:00:56.196	pulled 6 rows	2026-10-17 05:00:56.197372	2026-10-17 05:00:56.197372	0	\N
fc9385b5-14a2-4986-8d03-5eb36d544ce3	c55272af-1337-44a1-9b7b-75cd7a666689	693fddd5-69f5-4036-8837-25689422bd77	inventory-transfers	SUCCESS	2026-10-17 05:00:56.326	pulled 0 rows	2026-10-17 05:00:56.327648	2026-10-17 05:00:56.327648	0	\N
f1db9cc5-24eb-486c-aaab-1268a070ff4a	3ce3a58d-2761-4f4c-bc0f-23b9825b32f2	e49b8d3c-8633-4c7c-90df-ecd4224bc60d	product-batches	SUCCESS	2026-10-17 05:00:56.366	pulled 2 rows	2026-10-17 05:00:56.369011	2026-10-17 05:00:56.369011	0	\N
2c578a77-3ebd-46ee-814c-0e10e508f6a7	52e802c5-b8f8-48e6-87f4-edce3f2b74a1	57755394-34e4-4611-ae25-f2a485ce39d6	units-of-measure	SUCCESS	2026-10-17 05:00:56.738	pulled 0 rows	2026-10-17 05:00:56.738642	2026-10-17 05:00:56.738642	0	\N
0ffb692e-6905-4d1b-9c9e-fc4700e78c0b	7ada9f83-db58-4c6a-a7bd-753450cc4697	9d4b2906-0e1e-42ed-bb28-3ca68636bc3f	categories	SUCCESS	2026-10-17 05:00:56.77	pulled 0 rows	2026-10-17 05:00:56.770608	2026-10-17 05:00:56.770608	0	\N
8f3e22ba-a657-445d-9ef5-1f7466302c90	9025caf2-c561-4c1b-b3f5-371fc9285137	9c0f56fd-5cbe-4f21-ade1-0ec8100f2d1f	suppliers	SUCCESS	2026-10-17 05:00:56.821	pulled 0 rows	2026-10-17 05:00:56.821775	2026-10-17 05:00:56.821775	0	\N
33f681ab-dd2f-4b28-8a32-b4bda59456f1	8f520040-c236-4c2a-9d26-b49b51db267c	98b87004-ff8d-4acc-820a-e5d986f7b9b1	users	SUCCESS	2026-10-17 05:00:57.079	pulled 0 rows	2026-10-17 05:00:57.089084	2026-10-17 05:00:57.089084	0	\N
4e0e3e67-66e9-4c94-9ef0-50e98c09a2d3	c62277f4-ff1c-41f1-89f5-f30472d2f1b4	ae8d1256-2216-4cb3-87e8-b84e91f78525	branches	SUCCESS	2026-10-17 05:00:57.11	pulled 0 rows	2026-10-17 05:00:57.110518	2026-10-17 05:00:57.110518	0	\N
58c74ccd-ac10-4d74-afd8-6427a68f72ba	9028f46c-d343-428e-8b73-0e443bbaaf18	b667509b-d75d-4f1c-92b9-ebf674602ba2	purchases	SUCCESS	2026-10-17 05:00:57.123	pulled 0 rows	2026-10-17 05:00:57.124191	2026-10-17 05:00:57.124191	0	\N
fd9389aa-6b2b-4e44-acf3-9942f1d5a31a	12933254-29b9-4b92-981d-b85b8ecd6ddd	df958b1d-02e7-4366-8001-757740790999	roles	SUCCESS	2026-10-17 05:00:57.126	pulled 0 rows	2026-10-17 05:00:57.139169	2026-10-17 05:00:57.139169	0	\N
9eb330a0-0b6b-47da-8226-3726f98fae78	b481ace8-cf0a-48d7-890a-c08edf3654e4	26b665d4-1a55-4786-a46b-510e1760b8d8	sales	SUCCESS	2026-10-17 05:00:57.145	pulled 0 rows	2026-10-17 05:00:57.145612	2026-10-17 05:00:57.145612	0	\N
82ad7387-fe2a-4d69-980d-0eafa20df710	52ed45f6-4d2d-4511-9997-825c3f260182	24a70ec9-2bce-4e44-bbc5-85c8b83abcd5	notifications	SUCCESS	2026-10-17 05:00:57.213	pulled 0 rows	2026-10-17 05:00:57.214251	2026-10-17 05:00:57.214251	0	\N
6c6c5869-a564-4c90-820f-24d6c5b68dbd	5b363341-5ce3-4421-903f-ed96d7b63b06	834e5c43-1306-4e52-a083-86bde0048909	products	SUCCESS	2026-10-17 05:01:56.191	pulled 6 rows	2026-10-17 05:01:56.191335	2026-10-17 05:01:56.191335	0	\N
79126d11-9a92-4fac-8f51-6d643e108b01	ab4608de-6194-4ef7-9089-f66131d6ed26	6ce2f183-b826-4f21-b339-2224bcadf16b	customers	SUCCESS	2026-10-17 05:01:56.257	pulled 0 rows	2026-10-17 05:01:56.259838	2026-10-17 05:01:56.259838	0	\N
45bd24e0-2aed-4607-958f-1a3d0e5eaee7	b53c927f-204b-4291-b56d-6a053e680bc7	b8db23b7-2059-4131-b794-9768eb386c0d	inventory-transfers	SUCCESS	2026-10-17 05:01:56.351	pulled 0 rows	2026-10-17 05:01:56.35143	2026-10-17 05:01:56.35143	0	\N
6bcc6316-e3a5-4962-8e6e-47107b88e83d	63da0d12-054e-4005-985d-0e0d9932fab9	64c52acf-2d88-4175-b184-ba4ad51eea54	expenses	SUCCESS	2026-10-17 05:01:56.355	pulled 0 rows	2026-10-17 05:01:56.358147	2026-10-17 05:01:56.358147	0	\N
65e58d81-a1c8-4291-84a1-9ce4bdfceff7	b8f24991-6231-4e72-9923-9463f6901008	465c5a89-0891-4876-a7a7-d2ad151b0c3b	inventories	SUCCESS	2026-10-17 05:01:56.366	pulled 6 rows	2026-10-17 05:01:56.369904	2026-10-17 05:01:56.369904	0	\N
8882a099-bed9-4fd9-a52f-4ee216b2d212	58ebe1ba-6237-4d91-8dff-5c3cc42db789	7fbda1ee-0e76-4303-8ce7-a3bb08568b72	suppliers	SUCCESS	2026-10-17 05:01:56.672	pulled 0 rows	2026-10-17 05:01:56.674313	2026-10-17 05:01:56.674313	0	\N
91f98ed1-a23b-4005-94fc-3256ee4bcc13	204072f4-e71e-4971-a634-0f92b935b067	60295742-672e-4ae1-9827-4e46441a0420	categories	SUCCESS	2026-10-17 05:01:56.696	pulled 0 rows	2026-10-17 05:01:56.697251	2026-10-17 05:01:56.697251	0	\N
e62a4f10-d965-4a69-aba0-48797262a763	98b8251d-6386-4607-ab8e-9771b6b3fb71	ff4f3f67-51a0-46c2-854e-7214a88e85f7	product-batches	SUCCESS	2026-10-17 05:01:56.786	pulled 2 rows	2026-10-17 05:01:56.787481	2026-10-17 05:01:56.787481	0	\N
38ac06ab-66a1-4cc2-bb0a-a571998dd83c	38eb7862-5b4f-42b3-9ffc-fbd57c8af3fa	51786bcf-29ff-4201-9aa2-ba3141197b9a	units-of-measure	SUCCESS	2026-10-17 05:01:56.788	pulled 0 rows	2026-10-17 05:01:56.800617	2026-10-17 05:01:56.800617	0	\N
5a60be41-7e25-4b4c-881c-931943dab8fb	4be3ef25-4a82-4ddb-a20d-e83fc53d3c61	a080a904-2ee7-430f-9394-f8327076319a	branches	SUCCESS	2026-10-17 05:01:56.828	pulled 0 rows	2026-10-17 05:01:56.835026	2026-10-17 05:01:56.835026	0	\N
2f074bab-f3ee-4d4b-9422-238be77c5687	4348ac63-4802-4434-981c-9ec61287304e	26c70382-8436-4554-bd1c-0d733c9f5817	sales	SUCCESS	2026-10-17 05:01:56.839	pulled 0 rows	2026-10-17 05:01:56.839831	2026-10-17 05:01:56.839831	0	\N
478a8cec-cfad-460f-8d80-8cf127800d86	83c612bd-1ae2-4521-9318-b95e4bceda73	3a259a38-b1a8-4154-a750-c3178ea5e234	purchases	SUCCESS	2026-10-17 05:01:56.84	pulled 0 rows	2026-10-17 05:01:56.84067	2026-10-17 05:01:56.84067	0	\N
bdc12e90-c3db-4d92-be39-76fa6b895042	125109b2-cd22-47ce-8431-14d51247ede1	2fbd8ce1-925d-46eb-9ed8-f01b8b539a60	users	SUCCESS	2026-10-17 05:01:56.875	pulled 0 rows	2026-10-17 05:01:56.87627	2026-10-17 05:01:56.87627	0	\N
8a765683-c23d-4ef8-9cf9-b065535209fb	cd8763c2-1a1c-4d85-96e9-76f26334f02c	5e3ca7fa-65cb-4e59-b5f2-687bafc53848	roles	SUCCESS	2026-10-17 05:01:56.901	pulled 0 rows	2026-10-17 05:01:56.902059	2026-10-17 05:01:56.902059	0	\N
b87d2daf-043a-4ee5-aab9-a782b0e13062	2fd067e2-fe4a-4de0-8c1a-62df80942cda	be81daf3-0ac9-4821-bfd9-85b27b1468ee	notifications	SUCCESS	2026-10-17 05:01:56.924	pulled 0 rows	2026-10-17 05:01:56.924921	2026-10-17 05:01:56.924921	0	\N
b64d2755-5a34-495b-a996-cbec78fc1ad3	ceb4576b-344b-4964-bc38-ec1e586070a3	be22287f-d38b-4450-9ee6-a6967ec8f50c	customers	SUCCESS	2026-10-17 05:02:56.325	pulled 0 rows	2026-10-17 05:02:56.330052	2026-10-17 05:02:56.330052	0	\N
fa75e3e2-44a6-4aa6-bb99-6417cdf894ab	5c6f5add-ffd6-4260-9c2d-ebfeace3a58f	7d404997-1ee4-4b6a-8449-d7daf16cdb5f	products	SUCCESS	2026-10-17 05:02:56.335	pulled 6 rows	2026-10-17 05:02:56.335505	2026-10-17 05:02:56.335505	0	\N
b2a4fecd-03bb-4155-af67-2e76e08e4811	f6e47418-080d-431d-86b4-dd5233d1cc36	2b8bbe44-fc9d-4460-a46c-2e7044e716a1	inventories	SUCCESS	2026-10-17 05:02:56.404	pulled 6 rows	2026-10-17 05:02:56.404805	2026-10-17 05:02:56.404805	0	\N
00f2e571-f477-4f04-9c5e-b99013de9865	5e63432c-0c6c-468d-9ca6-baf3a2b1f7b7	bf3a41cd-d7cd-4a74-9b01-d93aa939f3b3	expenses	SUCCESS	2026-10-17 05:02:56.447	pulled 0 rows	2026-10-17 05:02:56.447957	2026-10-17 05:02:56.447957	0	\N
9b656490-6dca-4dc2-80f3-395b7f70ae6c	9531b2d9-6f58-43a2-9914-222e40640faf	43463a27-0122-4698-9078-8ce893ff1f74	inventory-transfers	SUCCESS	2026-10-17 05:02:56.505	pulled 0 rows	2026-10-17 05:02:56.506066	2026-10-17 05:02:56.506066	0	\N
c8514048-7eaa-49d9-9159-a003fd370d0c	2940e3c0-f432-4708-97b4-fc61ba2bf8a5	0e94c473-ae2d-40b8-a36d-a2fd519ba77c	units-of-measure	SUCCESS	2026-10-17 05:02:56.853	pulled 0 rows	2026-10-17 05:02:56.871187	2026-10-17 05:02:56.871187	0	\N
b6ed0a3f-be34-4180-8fa9-86d61ea65c5d	0f9476db-6871-445e-9778-40ebd06bb207	a2f1a57e-5b1f-4f90-b2c6-dc1e20826477	product-batches	SUCCESS	2026-10-17 05:02:56.912	pulled 2 rows	2026-10-17 05:02:56.920671	2026-10-17 05:02:56.920671	0	\N
1b07de53-57b4-4bf2-b687-72dd346c9e27	89c32b40-8c88-410e-a7fc-19eb810bb4cc	7a7d29d8-2a75-44f1-8393-e3ba23588128	categories	SUCCESS	2026-10-17 05:02:56.922	pulled 0 rows	2026-10-17 05:02:56.934803	2026-10-17 05:02:56.934803	0	\N
e751933c-f9b0-4b57-9c90-339ae7898af0	3d62f804-6c7e-4a91-98db-76124abb6e9c	720ff45a-2f24-4309-8f69-9a930683dcba	branches	SUCCESS	2026-10-17 05:02:57.021	pulled 0 rows	2026-10-17 05:02:57.021985	2026-10-17 05:02:57.021985	0	\N
c0004725-c78f-4afb-bd71-e2ea97e445c5	5f1c8d70-a8f0-49db-bfdd-321b3a8d4182	d5d2e066-59c8-4155-b2e1-49f2c5473870	suppliers	SUCCESS	2026-10-17 05:02:57.019	pulled 0 rows	2026-10-17 05:02:57.020976	2026-10-17 05:02:57.020976	0	\N
ca800495-bc6a-44c0-b871-b232b7d25915	18be25e2-6db2-4ee1-a7b0-25042d50a6d7	0d659099-ba00-4c1a-86f4-c2916b638d9e	users	SUCCESS	2026-10-17 05:02:57.084	pulled 0 rows	2026-10-17 05:02:57.084544	2026-10-17 05:02:57.084544	0	\N
46636706-b11c-4555-b36d-b0152de1d8f3	65ac8db4-50cd-4820-95e8-bc1f2c7e2978	f7fe5503-f5e8-4d62-9846-c824886812ec	notifications	SUCCESS	2026-10-17 05:02:57.181	pulled 0 rows	2026-10-17 05:02:57.181388	2026-10-17 05:02:57.181388	0	\N
c79db133-d022-4450-b33a-2e2d4e880f6f	79283e14-c86f-48b1-8167-051802d8d3fd	2d3b69f8-fe8a-43f4-979d-97f6f4f1445e	purchases	SUCCESS	2026-10-17 05:02:57.023	pulled 0 rows	2026-10-17 05:02:57.024238	2026-10-17 05:02:57.024238	0	\N
20c161f3-ed1b-449e-8616-1a629153cfbc	348db7bb-5151-42f0-8930-c20cc429206b	3037301a-e931-454c-8031-d75f98750145	sales	SUCCESS	2026-10-17 05:02:57.058	pulled 0 rows	2026-10-17 05:02:57.060144	2026-10-17 05:02:57.060144	0	\N
2cfea5d1-9226-469c-bcea-6fa8dc4ff363	9ac43ada-c6e2-4090-9377-9b9387d4fd9c	8fc7b99f-20e1-4ecf-9b3d-3236fdb8c326	roles	SUCCESS	2026-10-17 05:02:57.181	pulled 0 rows	2026-10-17 05:02:57.182066	2026-10-17 05:02:57.182066	0	\N
2cdf2d5f-bc8f-41b5-a7e5-3d5c6b4713a9	ec02d655-b587-49d8-9c56-0bdce5c4ec07	a4d99675-95d7-4dda-83b5-5288e45977c1	inventories	SUCCESS	2026-10-17 05:03:57.767	pulled 6 rows	2026-10-17 05:03:57.773464	2026-10-17 05:03:57.773464	0	\N
edb340b1-1589-4631-be10-917f99ea16ef	c115c470-f5be-431d-a874-ae0d73b2b5e6	8fb2414f-dd46-4cf8-99da-1285e406cba6	products	SUCCESS	2026-10-17 05:03:58.033	pulled 6 rows	2026-10-17 05:03:58.033905	2026-10-17 05:03:58.033905	0	\N
636c959e-5fad-4920-a169-627ccc2e4a84	66d1fd87-f675-4ef3-a7a9-3bbd4d4708e0	6219bb91-51f6-488d-88eb-6d33f3102f60	inventory-transfers	SUCCESS	2026-10-17 05:03:58.014	pulled 0 rows	2026-10-17 05:03:58.015664	2026-10-17 05:03:58.015664	0	\N
8d0a758e-d906-4f96-9b39-cc70825dd98c	ed3d1188-2a7f-4faa-8c65-1b6dae54be77	3824a203-1790-490e-9ecf-898181b1dd61	customers	SUCCESS	2026-10-17 05:03:58.059	pulled 0 rows	2026-10-17 05:03:58.059895	2026-10-17 05:03:58.059895	0	\N
b9e02256-f86e-4ee0-8035-66c0f3db051a	39c51072-bc47-4264-b146-76d1a5c9d998	3ecdfe08-e249-4a4d-80e3-ec377e019787	expenses	SUCCESS	2026-10-17 05:03:58.102	pulled 0 rows	2026-10-17 05:03:58.103384	2026-10-17 05:03:58.103384	0	\N
c2b59ee6-ae0d-4e1d-8d7f-81c0932fcebd	764071cd-f828-4980-b49a-3d34521c28fe	135db5c7-7cd3-45d0-a3ed-c19ff6d87d77	categories	SUCCESS	2026-10-17 05:03:58.55	pulled 0 rows	2026-10-17 05:03:58.558773	2026-10-17 05:03:58.558773	0	\N
c7105e8c-2e52-4dde-9c4d-ce7e75d278e6	f26632a9-ffdc-4e6a-98cf-ebe54e1c70f4	e854c0f8-be55-438a-a180-4a2a755c743f	product-batches	SUCCESS	2026-10-17 05:03:58.565	pulled 2 rows	2026-10-17 05:03:58.589854	2026-10-17 05:03:58.589854	0	\N
7d914b26-bf34-4876-b257-864dccb4eece	4f2724d1-b61f-49cd-91aa-e0146bff80ce	3a6d7933-fbdc-40f5-aeba-87859eec1982	suppliers	SUCCESS	2026-10-17 05:03:58.669	pulled 0 rows	2026-10-17 05:03:58.671468	2026-10-17 05:03:58.671468	0	\N
22ab1a4c-758f-462c-8294-b75e780ef1b0	5c312aa8-d23f-41eb-aa96-25e4836d0241	a8aac470-80e7-484c-a081-3b833468bcc3	sales	SUCCESS	2026-10-17 05:03:59.234	pulled 0 rows	2026-10-17 05:03:59.262606	2026-10-17 05:03:59.262606	0	\N
1a8d7dd2-3c76-47d7-bcd1-583247ac4d87	5bbd8357-5700-4fbd-908e-526f644cb51d	efd6e9dc-a47a-49b8-969b-394d70e15675	units-of-measure	SUCCESS	2026-10-17 05:03:59.403	pulled 0 rows	2026-10-17 05:03:59.403853	2026-10-17 05:03:59.403853	0	\N
adf72bdb-e496-4369-9d1f-59d2e8ba007c	84d2df62-af56-479b-a3d2-143cb0d19a5d	42e9b394-5f93-417b-8a9e-73148b233673	purchases	SUCCESS	2026-10-17 05:03:59.416	pulled 0 rows	2026-10-17 05:03:59.436558	2026-10-17 05:03:59.436558	0	\N
d0f5add0-b496-442f-99af-2e26cf0506e8	c49319f6-97c9-46bb-8cd8-a54857f5e689	3c85a006-445b-4d88-9510-f45e43ad8620	notifications	SUCCESS	2026-10-17 05:03:59.496	pulled 0 rows	2026-10-17 05:03:59.504076	2026-10-17 05:03:59.504076	0	\N
43319116-5bdd-4280-b89d-fef6156da817	14770435-ad80-4b2e-9216-946c2cfb8afd	61c96b18-2049-44c0-b09b-c5b8f3968f80	branches	SUCCESS	2026-10-17 05:03:59.53	pulled 0 rows	2026-10-17 05:03:59.533875	2026-10-17 05:03:59.533875	0	\N
218e6621-52f2-48c6-aa05-64e0319d845f	282ed464-7435-4e54-87a4-5c8fa1ee444e	5a99bbbe-3abb-465e-9aa4-0ba452d46580	users	SUCCESS	2026-10-17 05:03:59.687	pulled 0 rows	2026-10-17 05:03:59.688192	2026-10-17 05:03:59.688192	0	\N
3847a8d9-60f7-48da-863c-9ec3c305bdc6	5139ea8f-fd1c-4ba4-a976-034593a6051d	cbfb8507-2957-4750-b712-3caa24fd025f	roles	SUCCESS	2026-10-17 05:03:59.702	pulled 0 rows	2026-10-17 05:03:59.703636	2026-10-17 05:03:59.703636	0	\N
660f71d3-21a7-4346-a7a3-0d27320cad44	84e1ad83-6ce0-4c6a-9229-a74e00d92dd4	f67e0a4c-9ca1-4dea-8b2f-4ef932e5c804	customers	SUCCESS	2026-10-17 05:04:56.294	pulled 0 rows	2026-10-17 05:04:56.299123	2026-10-17 05:04:56.299123	0	\N
3e687a84-b0ae-41db-9b1e-09b4002ca2bd	75ea59a8-5289-498a-8eba-f842d5dac4be	3f27c468-d1b8-478a-a528-5e936fdc3349	inventories	SUCCESS	2026-10-17 05:04:56.303	pulled 6 rows	2026-10-17 05:04:56.304609	2026-10-17 05:04:56.304609	0	\N
0aac0468-63b5-420f-9b05-f4c9daef5925	78c21d2f-8fbb-42cd-b1ab-96f8cbf414af	f9d46150-73f3-466c-8d83-386b3f75853a	expenses	SUCCESS	2026-10-17 05:04:56.295	pulled 0 rows	2026-10-17 05:04:56.299123	2026-10-17 05:04:56.299123	0	\N
51038032-bf23-44ce-bb34-f154de70d6d3	262b3e97-33c1-4a44-a7b9-f918b9a8cf09	f466cd32-5123-4e4c-ba01-2d326367a681	inventory-transfers	SUCCESS	2026-10-17 05:04:56.324	pulled 0 rows	2026-10-17 05:04:56.324979	2026-10-17 05:04:56.324979	0	\N
536598da-7700-4bb5-9de8-10000fc62db4	821ef91b-b382-4504-bb44-64acaf6e3829	c34aca0f-cf93-42ca-820a-c74f5e392968	products	SUCCESS	2026-10-17 05:04:56.348	pulled 6 rows	2026-10-17 05:04:56.348524	2026-10-17 05:04:56.348524	0	\N
56faf480-69dc-4c3d-ad21-8b6c419fefc1	7e326e91-baba-4645-892a-4ace669eee4e	7a45a00b-ae0c-4dc8-8ad5-07fb77c9dedd	product-batches	SUCCESS	2026-10-17 05:04:56.514	pulled 2 rows	2026-10-17 05:04:56.515111	2026-10-17 05:04:56.515111	0	\N
6d036f57-918f-4edd-8970-f0ee110eaa38	1a042bd2-e929-4864-8663-b0df87a65477	006dc96f-2192-4433-b043-6f3bb042ffbd	categories	SUCCESS	2026-10-17 05:04:56.837	pulled 0 rows	2026-10-17 05:04:56.83792	2026-10-17 05:04:56.83792	0	\N
748001b7-a2da-44cb-8aa6-80ef29d65345	bfedd607-cff4-406c-8789-7100e049769f	6062b265-62d5-4a76-856c-016d56547e29	units-of-measure	SUCCESS	2026-10-17 05:04:56.84	pulled 0 rows	2026-10-17 05:04:56.840989	2026-10-17 05:04:56.840989	0	\N
d412129d-298b-4bea-a672-07a9768cd148	603ea2fe-11eb-462f-a425-84f7bbe187b9	79b780c4-85f6-4e5f-bf85-c8d7b457abd4	suppliers	SUCCESS	2026-10-17 05:04:56.836	pulled 0 rows	2026-10-17 05:04:56.838355	2026-10-17 05:04:56.838355	0	\N
e1290eb1-30a1-4e27-bc2b-9d474d6fafa9	d7a7fd2a-7adb-440c-9b16-7b5ece9ccbf3	4cc3f1d4-b8b8-4ff6-9df4-1639ed2aaba5	branches	SUCCESS	2026-10-17 05:04:56.868	pulled 0 rows	2026-10-17 05:04:56.870317	2026-10-17 05:04:56.870317	0	\N
f664563a-a8d8-47b2-92f6-8b31e2a8013e	36dca0de-80f9-4cb6-b41b-2cbc18bc84db	ecf9ce68-ac0b-4ae7-8138-34e0894d804a	purchases	SUCCESS	2026-10-17 05:04:56.893	pulled 0 rows	2026-10-17 05:04:56.894096	2026-10-17 05:04:56.894096	0	\N
db37ebf8-fff8-415f-aec5-46197abfc6ac	73c08df4-1916-4125-820a-7b0c27d358c6	87a6dc62-e10a-4c72-b244-a8d4eee6a440	sales	SUCCESS	2026-10-17 05:04:56.998	pulled 0 rows	2026-10-17 05:04:57.010141	2026-10-17 05:04:57.010141	0	\N
ebe22062-e474-46da-b240-5aeafeb47513	28bf4911-5b40-422d-864a-16b0969a415d	40aa2091-bedd-4905-8a55-e7bb6ce21a55	users	SUCCESS	2026-10-17 05:04:57.057	pulled 0 rows	2026-10-17 05:04:57.058298	2026-10-17 05:04:57.058298	0	\N
a0479205-f3ce-4f08-8f46-cce02d82fb46	3229e232-e35c-4907-a138-e141c6348330	9b35f074-e261-4969-9916-d7e787fe3051	roles	SUCCESS	2026-10-17 05:04:57.058	pulled 0 rows	2026-10-17 05:04:57.061561	2026-10-17 05:04:57.061561	0	\N
801003b8-f831-4202-ad70-1717ff36806c	3b148db9-1ae7-4de2-bfe6-a54d72ef86ee	515a4699-3e71-47de-a095-8e5f533d60d7	notifications	SUCCESS	2026-10-17 05:04:57.086	pulled 0 rows	2026-10-17 05:04:57.093831	2026-10-17 05:04:57.093831	0	\N
2a55eaac-cc61-4ab7-8407-5997878fc209	ecdfb27b-0710-4a94-8577-c2437f5501be	eecb4f0e-58ea-408d-b894-1b8a9285d88f	products	SUCCESS	2026-10-17 05:05:56.217	pulled 6 rows	2026-10-17 05:05:56.22033	2026-10-17 05:05:56.22033	0	\N
9ae12a86-2217-4361-b4c5-a646c33b452b	2658cebb-733c-4fa0-9d5c-8751253afaa6	f48f74c0-208f-4c3f-8172-db471e4f3f55	expenses	SUCCESS	2026-10-17 05:05:56.261	pulled 0 rows	2026-10-17 05:05:56.261886	2026-10-17 05:05:56.261886	0	\N
ba11885e-44eb-4bb3-b8e7-e9682436723f	68133504-dc5b-4850-886e-2d8933b387ec	57e609ab-ab0b-4a42-af2c-88f852461308	customers	SUCCESS	2026-10-17 05:05:56.26	pulled 0 rows	2026-10-17 05:05:56.261039	2026-10-17 05:05:56.261039	0	\N
8d04d507-e7d7-4e5a-a478-e69ee99dd2fe	2b2ae04f-9ee5-4b2f-8ed9-eea88fe42c4b	c0cbde8d-11e8-4d68-8072-47061199d9b1	inventories	SUCCESS	2026-10-17 05:05:56.288	pulled 6 rows	2026-10-17 05:05:56.288457	2026-10-17 05:05:56.288457	0	\N
bbd11fa7-24b5-4f8c-adbc-5c9bfd0d4de9	772c62cf-dd25-4508-aca6-46814c4c44f1	ad71ccea-04f7-4d49-93d9-199e3c30c6e6	inventory-transfers	SUCCESS	2026-10-17 05:05:56.384	pulled 0 rows	2026-10-17 05:05:56.385443	2026-10-17 05:05:56.385443	0	\N
7b18e69f-ee0a-4c44-b7db-1d77a9072caf	96bed5f9-8fc5-4e91-a6f7-e2ee175196a7	f08d834b-370a-49eb-bcb9-f6764bd08fd4	branches	SUCCESS	2026-10-17 05:05:56.776	pulled 0 rows	2026-10-17 05:05:56.776854	2026-10-17 05:05:56.776854	0	\N
32c3a01a-a043-4f1c-acde-735d4cd792f0	21b1eb9e-6447-4eb6-bef2-877793c0b17d	106e3587-09d1-4fd2-81a0-07de86171f59	units-of-measure	SUCCESS	2026-10-17 05:05:56.777	pulled 0 rows	2026-10-17 05:05:56.789804	2026-10-17 05:05:56.789804	0	\N
50fd22d0-fb1e-45ff-9f1d-018ec9196069	37b67d2f-9b5c-4284-8ea3-98d47b546312	3552ff9d-93aa-4951-a886-0f2346752cc2	categories	SUCCESS	2026-10-17 05:05:56.796	pulled 0 rows	2026-10-17 05:05:56.79805	2026-10-17 05:05:56.79805	0	\N
cb3bd93e-02b2-4e94-80fc-270acd21a044	c9bb7daa-0ba4-400c-84af-19cb659b1faf	d3b82f84-b6e7-4815-ab00-4d4b120d0001	product-batches	SUCCESS	2026-10-17 05:05:56.808	pulled 2 rows	2026-10-17 05:05:56.809292	2026-10-17 05:05:56.809292	0	\N
ebf81eb1-a79f-483a-a048-4e12de8b5e9f	8b17e414-dde6-483c-84be-0b9ac6efc77a	de830a1b-a5ca-4559-a1dc-d9e2f60481a3	suppliers	SUCCESS	2026-10-17 05:05:56.853	pulled 0 rows	2026-10-17 05:05:56.853484	2026-10-17 05:05:56.853484	0	\N
f4998cf3-41f1-46a5-99e4-d405574778e8	6da822ad-3138-4215-910d-138a3051be8d	6f505c51-2840-4e97-9632-f24bf2d37ce9	sales	SUCCESS	2026-10-17 05:05:56.914	pulled 0 rows	2026-10-17 05:05:56.914738	2026-10-17 05:05:56.914738	0	\N
5c030214-9e33-43ee-a455-1d01853a124c	850e0c07-de5e-4d30-9f8a-064eff6e8701	6f79266d-bba4-427a-bf0a-3277b603370e	purchases	SUCCESS	2026-10-17 05:05:56.914	pulled 0 rows	2026-10-17 05:05:56.91561	2026-10-17 05:05:56.91561	0	\N
db0585e7-aa48-4cf0-af70-6ed09c73c61d	18eae9d1-8ee8-4f98-94f0-6a51e62044c4	92b363e9-0ba5-4e07-9940-f5d644ca994e	notifications	SUCCESS	2026-10-17 05:05:56.939	pulled 0 rows	2026-10-17 05:05:56.939687	2026-10-17 05:05:56.939687	0	\N
f2b6913b-0c3c-4942-9bd3-d56d8d3cbd8a	74be64a7-09a6-4f0b-b2a6-3875f5c8eeee	a6d621ad-4c2b-483d-9341-b31f6b95a4e0	users	SUCCESS	2026-10-17 05:05:56.918	pulled 0 rows	2026-10-17 05:05:56.919171	2026-10-17 05:05:56.919171	0	\N
034760f2-e3d5-4b83-8bae-457dd54a21a4	d3f8f073-8ffd-4efc-ab14-2ec9c53711ed	0d6ad244-c8dd-4a6d-a973-7a12b657c6d0	roles	SUCCESS	2026-10-17 05:05:56.93	pulled 0 rows	2026-10-17 05:05:56.931244	2026-10-17 05:05:56.931244	0	\N
355e30bf-f593-4cb3-8f32-0fa204b4e113	5d40dab2-df9e-4a2e-961d-fad941a5c086	a74c6671-0bcc-41df-8887-292995e1c85a	products	SUCCESS	2026-10-17 05:06:56.222	pulled 6 rows	2026-10-17 05:06:56.222621	2026-10-17 05:06:56.222621	0	\N
7f3340f4-b0ef-4bc1-9ef1-234d0e43bba4	d68bb3de-e886-4074-8fda-58af04b3b20a	9b0b1fda-8dbf-4806-90d3-bdb9abdfb7af	customers	SUCCESS	2026-10-17 05:06:56.253	pulled 0 rows	2026-10-17 05:06:56.253447	2026-10-17 05:06:56.253447	0	\N
20c3f25f-a033-45ed-9bb6-3ed00d1365d3	9fdb78fc-a986-41c1-bcd6-34843570efdf	3d3c4392-e345-4564-a12a-817a5ff67fe4	inventory-transfers	SUCCESS	2026-10-17 05:06:56.261	pulled 0 rows	2026-10-17 05:06:56.261968	2026-10-17 05:06:56.261968	0	\N
1da3d8b8-9abc-440d-978b-2a3b73ee077b	17575fbf-90a4-44a7-a952-f14c63c2e56e	12c98174-34f4-4f4b-9a52-2a3de6e35078	inventories	SUCCESS	2026-10-17 05:06:56.26	pulled 6 rows	2026-10-17 05:06:56.260813	2026-10-17 05:06:56.260813	0	\N
7cf2d5c6-d6f1-4b8e-856b-88b3a5b94f12	7a168395-89a1-44aa-9f30-107ef09c7609	43930031-9a1f-4b2d-ba62-900a7a3bf247	expenses	SUCCESS	2026-10-17 05:06:56.264	pulled 0 rows	2026-10-17 05:06:56.265203	2026-10-17 05:06:56.265203	0	\N
26548b97-068d-44a1-af51-88e9dfad7b31	8f72eca3-70cb-42ab-8f61-68831cf9facb	d5e4a3c1-d7ae-467b-ac18-1b93155c6cf9	product-batches	SUCCESS	2026-10-17 05:06:56.411	pulled 2 rows	2026-10-17 05:06:56.413169	2026-10-17 05:06:56.413169	0	\N
0293c6b0-cef6-4ee3-8a72-8be9fb39a0fd	f137bfa9-7b1a-4e39-a0a9-07484f95b23f	7e2a7fdc-9509-4393-b7d3-5d0559c0821f	units-of-measure	SUCCESS	2026-10-17 05:06:56.698	pulled 0 rows	2026-10-17 05:06:56.701906	2026-10-17 05:06:56.701906	0	\N
22ae6588-110d-4d0b-8b04-5c971f987692	68129a04-69be-416c-a399-9d4a55d24948	b96551e0-aa92-479e-b3ce-866e2ec311e9	suppliers	SUCCESS	2026-10-17 05:06:56.71	pulled 0 rows	2026-10-17 05:06:56.710411	2026-10-17 05:06:56.710411	0	\N
8efbcf11-9189-478f-9442-990230679acd	f9fa2291-4a7e-49ce-9143-d66c9aab60f3	6e731481-b4af-401a-ae07-b91fba096155	branches	SUCCESS	2026-10-17 05:06:56.757	pulled 0 rows	2026-10-17 05:06:56.757578	2026-10-17 05:06:56.757578	0	\N
4ee202ec-b493-41c8-864e-0ba5ec8091e4	1acca108-a8ea-4c7a-a303-9b0583e82668	fab843e2-dfa8-4a2f-a4af-57b32580332c	users	SUCCESS	2026-10-17 05:06:56.909	pulled 0 rows	2026-10-17 05:06:56.911681	2026-10-17 05:06:56.911681	0	\N
b84c2588-d1ec-467f-9ee8-30ddee8fd057	7699162e-e746-4bc8-aedd-2764dff2b5c1	c6971b5a-a86c-452f-b8a6-2938e33e994f	roles	SUCCESS	2026-10-17 05:06:56.913	pulled 0 rows	2026-10-17 05:06:56.914988	2026-10-17 05:06:56.914988	0	\N
e5405898-1e17-4295-95b2-fea84ab1d4b8	32489110-218f-4651-9460-ea1708405185	67d9ba02-22da-4be0-800a-d2477e83b061	categories	SUCCESS	2026-10-17 05:06:56.916	pulled 0 rows	2026-10-17 05:06:56.917246	2026-10-17 05:06:56.917246	0	\N
3b81bd47-ddb6-43a3-a854-e162e37954a8	47fca72a-dd4d-41ef-8014-7d70be323e74	1505c95d-4e64-4d45-b24a-88cf5f2d4b47	sales	SUCCESS	2026-10-17 05:06:56.918	pulled 0 rows	2026-10-17 05:06:56.918953	2026-10-17 05:06:56.918953	0	\N
da028d4a-85cc-4516-b45a-27505299d3e7	bff2e7fd-b48f-46e3-9745-c4724d578e81	72aebc56-44d2-44df-b298-af26762aa660	purchases	SUCCESS	2026-10-17 05:06:56.919	pulled 0 rows	2026-10-17 05:06:56.920808	2026-10-17 05:06:56.920808	0	\N
b640c535-f844-4c3e-99cf-e00e318b3c01	d93e72d2-ef7b-4c2b-89aa-d875d10e67e4	914a3cf3-c460-469b-b1d3-66469633e646	notifications	SUCCESS	2026-10-17 05:06:57.143	pulled 0 rows	2026-10-17 05:06:57.151845	2026-10-17 05:06:57.151845	0	\N
dee912ce-dfc3-4c33-b0a9-1fc12552301f	a763255c-86c6-4772-b5e5-03c5c56fa916	6e9f208d-e90a-4cad-b870-65112f2ed335	products	SUCCESS	2026-10-17 05:07:56.37	pulled 6 rows	2026-10-17 05:07:56.370775	2026-10-17 05:07:56.370775	0	\N
e22e648b-8806-468e-937b-9b99073bf43e	55272b84-2d3b-4955-9278-819993658522	304b567a-31a5-4885-b2a9-614e93ffbe50	customers	SUCCESS	2026-10-17 05:07:56.383	pulled 0 rows	2026-10-17 05:07:56.383856	2026-10-17 05:07:56.383856	0	\N
5e6cb73a-e516-4adf-aa48-4a495ce5ee1e	2684be67-8559-4371-9770-f281b1aa2e10	b808b5e3-1b5a-43de-acb8-591e606eb502	expenses	SUCCESS	2026-10-17 05:07:56.402	pulled 0 rows	2026-10-17 05:07:56.402571	2026-10-17 05:07:56.402571	0	\N
6ecc33b2-a8f3-49d3-b73f-c2d121c8b577	fc573793-3d24-453c-b28e-fe6f7e63ec80	5303f94c-3de6-4da2-95be-1ba09e92d4db	inventory-transfers	SUCCESS	2026-10-17 05:07:56.403	pulled 0 rows	2026-10-17 05:07:56.404123	2026-10-17 05:07:56.404123	0	\N
d06e6185-ea84-4304-bf92-d64c210fa94b	f2f14aa0-17e1-46cd-aaf1-b27083db921c	df36f87f-cfb4-4c27-a068-ecc432df3daf	inventories	SUCCESS	2026-10-17 05:07:56.403	pulled 6 rows	2026-10-17 05:07:56.403441	2026-10-17 05:07:56.403441	0	\N
2457659c-8791-4bd4-8a7b-e06aa4470155	72936cce-a8b4-436b-a35a-f37a261e14ad	2170c664-be23-4677-abb0-77359e439ea2	product-batches	SUCCESS	2026-10-17 05:07:56.469	pulled 2 rows	2026-10-17 05:07:56.470432	2026-10-17 05:07:56.470432	0	\N
05f242da-734e-40f4-8443-3e9d1c30cb39	d6992b35-9aee-458d-babb-a530eb1e6c55	04c8e895-675f-41bf-a431-ef6562796afe	units-of-measure	SUCCESS	2026-10-17 05:07:56.697	pulled 0 rows	2026-10-17 05:07:56.697478	2026-10-17 05:07:56.697478	0	\N
c112f195-7248-464f-a744-7a5dadaa26f1	b22786b4-fc14-4dbb-a900-1e4bcc900568	b67e3fdf-5042-4111-b5c9-150cbc251f0c	suppliers	SUCCESS	2026-10-17 05:07:56.717	pulled 0 rows	2026-10-17 05:07:56.71772	2026-10-17 05:07:56.71772	0	\N
65bce6ef-9c23-48a2-bcc9-80970a283b82	bcd86f8f-898d-4cce-aad1-b59109cdc3e8	7d850260-b4b0-47fa-8e7f-8849c70bc9c7	branches	SUCCESS	2026-10-17 05:07:56.77	pulled 0 rows	2026-10-17 05:07:56.771301	2026-10-17 05:07:56.771301	0	\N
e9ff7f3a-ea18-4d9f-8ff0-3b3add81d57d	4b4eac55-a99b-43fa-8b3e-24e3251adc77	7bb31c31-ef61-4d00-92ba-35ea87366723	purchases	SUCCESS	2026-10-17 05:07:56.768	pulled 0 rows	2026-10-17 05:07:56.772099	2026-10-17 05:07:56.772099	0	\N
1ddf9712-abf5-436e-8797-e642b47c9d18	21dc49d9-6245-421f-b5f5-fb9722d27472	2a8fb0b7-3348-4348-9fe3-d891dd73cda0	sales	SUCCESS	2026-10-17 05:07:56.81	pulled 0 rows	2026-10-17 05:07:56.811141	2026-10-17 05:07:56.811141	0	\N
e7c80aa7-ef47-4daa-b9c7-c4634853ff57	30adab32-0fb5-4b12-95ca-2b6cc80a0b85	a5e6337d-7a08-4ff6-bc04-b5502fde20d7	users	SUCCESS	2026-10-17 05:07:56.812	pulled 0 rows	2026-10-17 05:07:56.813105	2026-10-17 05:07:56.813105	0	\N
e2f680de-4927-42b5-a936-1332649e5baa	7dff4e09-e63b-46d1-9da0-e81199f1850c	36e2c46f-8f9e-4fc9-b275-1ac4c09f5921	categories	SUCCESS	2026-10-17 05:07:56.814	pulled 0 rows	2026-10-17 05:07:56.815425	2026-10-17 05:07:56.815425	0	\N
4673d8c5-3524-4391-9b9a-f2baf00f1115	8618e44a-b8f8-4a5b-a465-03ecb414b525	bf7d49c5-76b9-4879-b2f2-82f798e6d315	roles	SUCCESS	2026-10-17 05:07:56.831	pulled 0 rows	2026-10-17 05:07:56.832235	2026-10-17 05:07:56.832235	0	\N
abc10c3d-a7ce-45b9-9e1c-a27aaad8c00a	1bc756b5-accc-40ce-8db4-3c7fb71864d6	ccb88955-265c-48d1-93de-9915a0010807	notifications	SUCCESS	2026-10-17 05:07:56.98	pulled 0 rows	2026-10-17 05:07:56.980941	2026-10-17 05:07:56.980941	0	\N
e851da19-9a5e-4533-8a8a-257d472984dc	8d4d2583-b808-4c18-a1e1-189026e60298	e9207676-70e3-424f-8e8c-615e9b7093bd	products	SUCCESS	2026-10-17 05:08:56.125	pulled 6 rows	2026-10-17 05:08:56.12587	2026-10-17 05:08:56.12587	0	\N
c321dc4d-7457-4755-9be9-d0e99e4dcaaf	a97b5c8a-84bd-4aef-80fa-c0d51421680a	af3daad1-40f9-41f5-a928-5ce34ea69e22	customers	SUCCESS	2026-10-17 05:08:56.153	pulled 0 rows	2026-10-17 05:08:56.154219	2026-10-17 05:08:56.154219	0	\N
cbd3f343-582c-4dc4-9c93-a3eb2dde7f02	5511f2a5-e826-45ab-8e2a-3ba9d79c055c	34a3a6dd-7e2a-4f19-acf6-210ad5d02365	expenses	SUCCESS	2026-10-17 05:08:56.171	pulled 0 rows	2026-10-17 05:08:56.171709	2026-10-17 05:08:56.171709	0	\N
ac874289-ef82-42ba-991d-2a70d283a923	e834814f-4e15-4101-9b3a-53f5c89f6696	b4051cde-3c8b-45a1-a422-5776491c9b9e	inventories	SUCCESS	2026-10-17 05:08:56.252	pulled 6 rows	2026-10-17 05:08:56.25335	2026-10-17 05:08:56.25335	0	\N
80a20c15-2c48-482d-85c5-46124c22b414	2f530d50-ba61-4b76-a190-515e185545ed	bb2ed164-b05c-40d9-96f8-9d32c85d2bd6	inventory-transfers	SUCCESS	2026-10-17 05:08:56.255	pulled 0 rows	2026-10-17 05:08:56.256037	2026-10-17 05:08:56.256037	0	\N
95034185-903b-4445-9e72-cc5e3ee098a7	a06a9a40-21ad-4968-ac9f-33d8c5544042	5308f8ae-755d-4600-b4c0-250ffd9fe8bf	product-batches	SUCCESS	2026-10-17 05:08:56.38	pulled 2 rows	2026-10-17 05:08:56.381744	2026-10-17 05:08:56.381744	0	\N
f2510e88-fcf8-417e-8264-43b2c4d1411d	7bd49c5e-9f69-405f-9bc9-fe6fbffd85d5	512d1cd3-c9b1-4a3f-892b-c2ef1ac39d76	units-of-measure	SUCCESS	2026-10-17 05:08:56.752	pulled 0 rows	2026-10-17 05:08:56.752658	2026-10-17 05:08:56.752658	0	\N
5aff0fad-81c7-4838-ad4e-2c83304fd0d1	888d8c22-088b-4a49-9388-81b501eed30b	67d7a9fe-ac64-410d-ab33-5f82985e379a	suppliers	SUCCESS	2026-10-17 05:08:56.778	pulled 0 rows	2026-10-17 05:08:56.779067	2026-10-17 05:08:56.779067	0	\N
ee8c0ef9-b381-47ab-85ac-e08d8a42c505	321b133a-4a91-40d8-831e-6d6f14eb1bc9	0e1764c6-53df-4a00-b772-9ecb2a84839d	branches	SUCCESS	2026-10-17 05:08:56.809	pulled 0 rows	2026-10-17 05:08:56.813332	2026-10-17 05:08:56.813332	0	\N
3c74a53d-280b-43a2-9ae5-18aad1a676a7	034a9fbe-2627-43f3-83ba-12c3bb8b0f15	00ced93c-3c00-4604-9b9b-5560d55571ef	categories	SUCCESS	2026-10-17 05:08:56.819	pulled 0 rows	2026-10-17 05:08:56.826885	2026-10-17 05:08:56.826885	0	\N
b0357c5d-ccdf-4186-bfbd-9a21d739cbce	77d0eabe-8ce8-4ef7-a1e9-f504333e2b0c	14422f0e-1334-4972-9361-959126f7fe83	purchases	SUCCESS	2026-10-17 05:08:56.89	pulled 0 rows	2026-10-17 05:08:56.896897	2026-10-17 05:08:56.896897	0	\N
31a48ac1-1cbc-457e-b549-bb1ec80dfca7	25c96f7a-83d9-4ef9-908e-0f0e444d3716	c988de3b-ecd2-4fd0-9995-0674775b372f	users	SUCCESS	2026-10-17 05:08:56.996	pulled 0 rows	2026-10-17 05:08:56.996823	2026-10-17 05:08:56.996823	0	\N
bc7bc75b-ae42-47d6-992c-102ccdaa23cc	93c12088-46ba-4fee-b6a0-818c4cad7195	aa80fad3-bb8b-42ed-855b-36c97e1b6507	notifications	SUCCESS	2026-10-17 05:08:57.072	pulled 0 rows	2026-10-17 05:08:57.073113	2026-10-17 05:08:57.073113	0	\N
932ef9d0-663b-4968-800e-89f940c978b4	acedf980-6996-41eb-9129-808e44a47c74	8c3d7e43-37c1-48f4-8a73-15c6acc0f066	sales	SUCCESS	2026-10-17 05:08:56.909	pulled 0 rows	2026-10-17 05:08:56.909642	2026-10-17 05:08:56.909642	0	\N
3990a9be-8e7f-4610-90e0-71f2f8d48736	5a9b42f2-19f9-4f57-91f2-075f635ad715	8de8ad47-e9bf-46b0-86b3-9c6198823180	roles	SUCCESS	2026-10-17 05:08:56.995	pulled 0 rows	2026-10-17 05:08:56.995603	2026-10-17 05:08:56.995603	0	\N
dd232c0f-3d2e-4bb4-a2f8-541661da56f0	44bfe4c9-42bf-46fd-835d-4d88a50941a2	8381fa66-43ff-4cac-b8f7-3e04c2094b33	products	SUCCESS	2026-10-17 05:09:56.368	pulled 6 rows	2026-10-17 05:09:56.379896	2026-10-17 05:09:56.379896	0	\N
c07cdfc0-2794-46fa-8f01-00616907ea3a	3eb880b1-00e7-44b0-9495-4ffb86dc61a7	9e788e5d-197a-47ee-a603-7e0cb4c4c61f	inventory-transfers	SUCCESS	2026-10-17 05:09:56.425	pulled 0 rows	2026-10-17 05:09:56.426741	2026-10-17 05:09:56.426741	0	\N
e7970389-8b0f-46d8-92ce-ec158ddfd6c0	7a91c305-3e2c-4d99-a9d1-f8f3390a8e81	7e42c22c-d19e-412e-b921-11bacccaf07b	customers	SUCCESS	2026-10-17 05:09:56.452	pulled 0 rows	2026-10-17 05:09:56.455935	2026-10-17 05:09:56.455935	0	\N
09c1124e-2718-48d6-b923-6673964b7e89	2c1982dc-28d3-4b45-980d-049d3025ff06	a6af0467-ae40-4384-9f73-c4cf59f9da3f	product-batches	SUCCESS	2026-10-17 05:09:56.464	pulled 2 rows	2026-10-17 05:09:56.466432	2026-10-17 05:09:56.466432	0	\N
814b0898-a40a-4f0a-a834-9fd1d8a5b8fa	16722c78-2d03-4123-a5e8-dc8d6b492315	2799508b-cc13-49f0-9628-04b9d4eeab91	expenses	SUCCESS	2026-10-17 05:09:56.469	pulled 0 rows	2026-10-17 05:09:56.469366	2026-10-17 05:09:56.469366	0	\N
4c4889eb-e45d-40a3-881d-e5fd2d6159a8	17463108-5f22-4334-a166-0cee05fc1b87	88f50d1f-a945-4511-ab7c-4cecaafe257a	inventories	SUCCESS	2026-10-17 05:09:56.501	pulled 6 rows	2026-10-17 05:09:56.501546	2026-10-17 05:09:56.501546	0	\N
caa049e6-dc9a-476a-bc6c-e957a471558f	369ad8be-82c4-4830-89ba-85761056ff7a	fc387706-a08f-43fb-87b1-d8340b88d719	categories	SUCCESS	2026-10-17 05:09:57.047	pulled 0 rows	2026-10-17 05:09:57.048189	2026-10-17 05:09:57.048189	0	\N
8091bc65-1ed7-42d2-94fa-223fe2c162d4	f0bb4874-39a5-44e1-b1d1-58f2c41b49f0	f8787e16-fc89-4e50-8f71-e0d1636328c9	units-of-measure	SUCCESS	2026-10-17 05:09:57.052	pulled 0 rows	2026-10-17 05:09:57.053077	2026-10-17 05:09:57.053077	0	\N
b1146411-4cbd-4c5d-adc6-ca7cb51a8a7f	f0a3a9f8-073d-4d88-8efe-bcb11d205fd6	c070a900-1da3-45f3-b72f-e6320a9a1eaf	sales	SUCCESS	2026-10-17 05:09:57.105	pulled 0 rows	2026-10-17 05:09:57.105444	2026-10-17 05:09:57.105444	0	\N
85fa897b-3a38-48bd-86b0-1a0b26321905	5e8e1188-aea9-425e-ba80-2d5fd7c00338	54bf0532-f583-4e98-b50a-3c8f5fbcffc8	branches	SUCCESS	2026-10-17 05:09:57.105	pulled 0 rows	2026-10-17 05:09:57.107464	2026-10-17 05:09:57.107464	0	\N
98f48b35-7f78-488f-af72-fb61a4b8b8cd	71713522-dc02-44ba-9098-3b841c1f89ee	04429f00-75af-41a5-81bd-9e613a15a628	suppliers	SUCCESS	2026-10-17 05:09:57.102	pulled 0 rows	2026-10-17 05:09:57.106827	2026-10-17 05:09:57.106827	0	\N
715fb135-feeb-469c-bf09-36bb7278a112	703616ac-e38a-46a8-9762-0e7797472946	d5ffab1f-b698-40d7-830b-2da23ade8664	roles	SUCCESS	2026-10-17 05:09:57.16	pulled 0 rows	2026-10-17 05:09:57.160455	2026-10-17 05:09:57.160455	0	\N
3aaa4110-0f3c-46b1-8607-d223f4c21a93	f4e19cd3-0c1d-4d48-8579-9b313ade2af9	3ec2fa39-462c-4338-822a-89022a7e5fd8	users	SUCCESS	2026-10-17 05:09:57.159	pulled 0 rows	2026-10-17 05:09:57.159742	2026-10-17 05:09:57.159742	0	\N
62e84194-ff01-4ba5-814b-0fe03fac5035	9bfef534-4591-43a4-941a-b10c378fa755	5aa85009-b5b6-4c6a-b8a9-9cb28d42acce	notifications	SUCCESS	2026-10-17 05:09:57.216	pulled 0 rows	2026-10-17 05:09:57.216544	2026-10-17 05:09:57.216544	0	\N
c9b0b61d-948a-4ef0-ad73-f8e7cf74397c	1227549f-72b7-4f7d-9dbb-ac0aeaf52289	9f678c4d-9f58-4977-89f3-5b6f96c8d68a	purchases	SUCCESS	2026-10-17 05:09:57.228	pulled 0 rows	2026-10-17 05:09:57.229061	2026-10-17 05:09:57.229061	0	\N
a9b2ba59-406d-4a52-8a36-14a41b51a2c4	d50bd597-2216-4a1d-af7f-08805f510015	4d007305-b9b0-453f-94eb-0d64794b1130	products	SUCCESS	2026-10-17 05:10:56.228	pulled 6 rows	2026-10-17 05:10:56.22866	2026-10-17 05:10:56.22866	0	\N
0575e5cd-dd6d-4f8b-b788-deb0c3ac22e1	22d9c98b-05d8-4845-a274-562736bcf6be	94e2ef26-728b-44d9-9956-1c0b6ee24ba7	customers	SUCCESS	2026-10-17 05:10:56.337	pulled 0 rows	2026-10-17 05:10:56.33807	2026-10-17 05:10:56.33807	0	\N
5b9ce6ff-0f32-4b57-a16a-179a1245f3f8	f70dcd3a-59e8-4eb6-89b0-380facf77d01	053e8321-7d52-4606-9e17-f20e831812b3	product-batches	SUCCESS	2026-10-17 05:10:56.365	pulled 2 rows	2026-10-17 05:10:56.365934	2026-10-17 05:10:56.365934	0	\N
a7142bae-c44b-489d-a1e5-8d1ca2b60e35	6efa3ee0-9d8b-4158-b382-fa573ef4bf06	4a0bb75e-2cf2-41eb-b702-833f5ab37e29	inventory-transfers	SUCCESS	2026-10-17 05:10:56.403	pulled 0 rows	2026-10-17 05:10:56.404543	2026-10-17 05:10:56.404543	0	\N
e8e44d53-1aa7-4a71-b6bd-160d6f910ed3	af737cf5-6f8a-41f5-a47f-34e77d59e7f9	6f2fcca9-0579-4454-b931-ae5eac0db021	expenses	SUCCESS	2026-10-17 05:10:56.421	pulled 0 rows	2026-10-17 05:10:56.421624	2026-10-17 05:10:56.421624	0	\N
d813508f-60ae-4fcb-b79d-4db2d4ab1cac	18b86f94-bd2d-4081-b6c8-ca53c952f8ce	27f3e9a8-2b82-4e47-af12-69bc4f6e0ee6	inventories	SUCCESS	2026-10-17 05:10:56.416	pulled 6 rows	2026-10-17 05:10:56.417664	2026-10-17 05:10:56.417664	0	\N
d513d4d9-2eaf-4901-ab94-eeb3f6dfa6b9	a98fc328-49cb-4bc8-8d13-ad82855dab59	1acd0ec7-8def-47cd-ae73-63529efffb13	categories	SUCCESS	2026-10-17 05:10:56.747	pulled 0 rows	2026-10-17 05:10:56.750652	2026-10-17 05:10:56.750652	0	\N
18670672-6e34-472f-a3ec-8ca644f17d1a	e9d9d9e5-495b-43d2-8be0-d58bd007e8cf	066c2b06-38d9-441a-8133-4d6b3f675a13	units-of-measure	SUCCESS	2026-10-17 05:10:56.749	pulled 0 rows	2026-10-17 05:10:56.751376	2026-10-17 05:10:56.751376	0	\N
c7158f1c-c975-4103-9498-f66665a7d58f	8b8faad2-9990-44e5-aeec-08cb501db4a9	31801df6-ee7f-44b7-9f1d-59a03d32ca9a	suppliers	SUCCESS	2026-10-17 05:10:56.762	pulled 0 rows	2026-10-17 05:10:56.76245	2026-10-17 05:10:56.76245	0	\N
2d276a99-ab92-4275-893a-0eea43819f3a	28ead169-b5e4-42f5-b89f-f672455e97ea	7839f9e7-5b2d-4844-8d95-76cd30e6231e	branches	SUCCESS	2026-10-17 05:10:56.803	pulled 0 rows	2026-10-17 05:10:56.80402	2026-10-17 05:10:56.80402	0	\N
f6a6ab18-28c6-4b22-b5f7-740bd225206d	3f514e31-0382-411a-86c9-233bf9a03d88	6a147e3c-99d6-48d2-9946-dfa2bfae866c	purchases	SUCCESS	2026-10-17 05:10:56.804	pulled 0 rows	2026-10-17 05:10:56.804717	2026-10-17 05:10:56.804717	0	\N
70453c50-de80-47b8-9458-2940f56dc3e1	9603f1b3-c6ee-4e3f-9b88-9ec1e62ca4dd	9bc310ab-5324-441d-b73b-e546a7b31ba5	sales	SUCCESS	2026-10-17 05:10:56.827	pulled 0 rows	2026-10-17 05:10:56.828046	2026-10-17 05:10:56.828046	0	\N
2fa5db0e-3a9f-46bc-8dd8-fe761ece41fc	622e5c4e-8180-4dc8-b8d5-d886c053e499	afe3c031-2608-45de-9245-141096bc1d7f	users	SUCCESS	2026-10-17 05:10:56.842	pulled 0 rows	2026-10-17 05:10:56.842681	2026-10-17 05:10:56.842681	0	\N
9a68804a-4381-4721-82f2-8422c7b17076	c26f88be-550c-4f60-94dd-314df269c55f	0f3ccccd-b4be-47b0-8c64-cb476188d0e2	roles	SUCCESS	2026-10-17 05:10:56.871	pulled 0 rows	2026-10-17 05:10:56.871612	2026-10-17 05:10:56.871612	0	\N
3349f3f3-0992-4c5f-8089-2ffb04081a62	cf6863a9-1624-4269-b6eb-bb29ac447cda	4dc78208-d398-402c-b4c8-13bf552e654e	notifications	SUCCESS	2026-10-17 05:10:56.932	pulled 0 rows	2026-10-17 05:10:56.93292	2026-10-17 05:10:56.93292	0	\N
9bc5411a-cd29-4f0d-81b7-a326f653dd72	29039414-cfb3-44e0-99ac-07666485d8df	2f0211a5-8f13-4f9f-b95c-1f6154e2c6aa	customers	SUCCESS	2026-10-17 05:11:56.254	pulled 0 rows	2026-10-17 05:11:56.254587	2026-10-17 05:11:56.254587	0	\N
f9099cec-3e31-4816-9d35-431f787efd0f	0596f684-5b46-4c9c-bb71-6b1499977c89	ac94b966-304e-4478-b004-36e107594f23	products	SUCCESS	2026-10-17 05:11:56.257	pulled 6 rows	2026-10-17 05:11:56.257982	2026-10-17 05:11:56.257982	0	\N
248bdb55-1417-44c2-b995-51bd51341291	834df24b-1b17-4146-8b3f-ffbcb2aa5ce6	e9dc55c9-e57a-4b8c-82fe-7151d61129f7	expenses	SUCCESS	2026-10-17 05:11:56.267	pulled 0 rows	2026-10-17 05:11:56.267948	2026-10-17 05:11:56.267948	0	\N
b551eaab-7839-44ee-bdc1-9dd49b16dc39	46e2618b-c3d2-4c9e-900a-28000d9b8291	315b0130-73c2-4d7f-b916-7c210deb57ae	inventories	SUCCESS	2026-10-17 05:11:56.401	pulled 6 rows	2026-10-17 05:11:56.402857	2026-10-17 05:11:56.402857	0	\N
374cc469-1da7-4cff-9160-4e86bef4d861	cfeb65c3-8dfd-4a43-836b-3cf46fe18054	e0e30800-b8b0-4c0d-bef3-5a15c889eb3c	inventory-transfers	SUCCESS	2026-10-17 05:11:56.436	pulled 0 rows	2026-10-17 05:11:56.438532	2026-10-17 05:11:56.438532	0	\N
264ab294-ad7e-4013-b685-5e45a6646bc0	c3dd5cc1-3965-4f6b-b5fc-9bd8c6a34b41	9e138ecb-8d16-431a-95f6-03f7b0d13e29	product-batches	SUCCESS	2026-10-17 05:11:56.661	pulled 2 rows	2026-10-17 05:11:56.662763	2026-10-17 05:11:56.662763	0	\N
6203c82e-de37-4e25-a998-1c70a1a121e7	8b7866ec-3cf6-49a1-91c0-805623398a5f	3e9be0f0-2414-43f9-b4da-53f1fb879ccc	units-of-measure	SUCCESS	2026-10-17 05:11:56.678	pulled 0 rows	2026-10-17 05:11:56.678364	2026-10-17 05:11:56.678364	0	\N
d555c04c-687d-472a-a13d-aeb40c9c6d64	73c90853-6cb2-4adf-931f-36d1119d752a	fe87750e-c019-4508-b460-8d860ef57737	suppliers	SUCCESS	2026-10-17 05:11:56.679	pulled 0 rows	2026-10-17 05:11:56.68016	2026-10-17 05:11:56.68016	0	\N
08a8f77b-6bd3-4a95-bbab-123ec26cd435	23cba0e3-6d22-472d-b623-f3fdeb13a86e	35de49da-c6e4-465d-acd7-150e79d8140b	categories	SUCCESS	2026-10-17 05:11:56.684	pulled 0 rows	2026-10-17 05:11:56.684666	2026-10-17 05:11:56.684666	0	\N
21a7a4c3-378b-4ab0-86ec-70cd5c0bf5f9	a56d59bd-5d73-4fc3-a6f1-020614a454ca	a36fb859-4412-4ee1-9ea5-f81ac3105428	sales	SUCCESS	2026-10-17 05:11:56.878	pulled 0 rows	2026-10-17 05:11:56.883807	2026-10-17 05:11:56.883807	0	\N
067cf15f-0c63-4f0d-bbe0-6664d81d2b1e	68f4bf12-4d07-4d3c-af5f-00d0a5f1bdf9	c8a172d8-9c86-453d-9c16-6765e731b100	users	SUCCESS	2026-10-17 05:11:56.896	pulled 0 rows	2026-10-17 05:11:56.898498	2026-10-17 05:11:56.898498	0	\N
512a0604-e450-445e-9030-b1c4072bdf45	38a8e730-3c31-4d2e-b410-b258c14a7015	7225f121-fcb4-457a-bf8e-e94bdf7853f6	purchases	SUCCESS	2026-10-17 05:11:56.899	pulled 0 rows	2026-10-17 05:11:56.90034	2026-10-17 05:11:56.90034	0	\N
0b2046e5-829c-4cb0-b2d7-6372b1a55d64	8c01679a-ead9-4e31-bbe7-3db94227b0fc	1c1014d4-59c1-4eb9-9926-886d43074785	roles	SUCCESS	2026-10-17 05:11:56.906	pulled 0 rows	2026-10-17 05:11:56.911346	2026-10-17 05:11:56.911346	0	\N
c7d7faff-22f3-4a37-8939-88444248ada6	1de7c8a4-bd3c-489f-84a3-0371477d3c6b	2f35a1d2-3396-48e0-ada2-6657e780ba68	branches	SUCCESS	2026-10-17 05:11:56.929	pulled 0 rows	2026-10-17 05:11:56.929874	2026-10-17 05:11:56.929874	0	\N
1bbf05f5-f708-4545-bef5-0e540e9ae306	cb198abc-5548-45d8-befb-df02b2ed8c89	35dcb521-4e4a-466f-93f7-4347f4a357a4	notifications	SUCCESS	2026-10-17 05:11:57.056	pulled 0 rows	2026-10-17 05:11:57.057228	2026-10-17 05:11:57.057228	0	\N
73350495-dc7b-47b3-b750-c8393811789b	f5ae569e-9725-48e5-b383-7413c0ce98ba	308d29d8-06bb-4df3-a68a-1fe4a417052b	expenses	SUCCESS	2026-10-17 05:12:56.692	pulled 0 rows	2026-10-17 05:12:56.694195	2026-10-17 05:12:56.694195	0	\N
d3ef7e81-960d-4034-a3a4-c6776c25a60b	ad3bdb9f-b186-45d4-9828-cd8219acfbcc	d40cbf85-7415-4c01-ab12-cdaf388d6e6d	products	SUCCESS	2026-10-17 05:12:56.693	pulled 6 rows	2026-10-17 05:12:56.695536	2026-10-17 05:12:56.695536	0	\N
0f2bb8c8-df66-4930-a825-3b6de67425a5	5b3f809b-6680-4c6b-9ae4-b58b4ac5ca46	9ae836d3-fd5b-41e0-8d76-7a3fb9800dd4	inventories	SUCCESS	2026-10-17 05:12:56.701	pulled 6 rows	2026-10-17 05:12:56.701632	2026-10-17 05:12:56.701632	0	\N
c0c6a15c-2caa-4609-b777-04606643bf4f	44655d4b-91dd-4ae0-a574-fc3f1025a26e	2adef4c7-4473-4615-8641-8d661ff2a3cc	customers	SUCCESS	2026-10-17 05:12:56.709	pulled 0 rows	2026-10-17 05:12:56.712089	2026-10-17 05:12:56.712089	0	\N
650cb3ba-6165-4c13-9048-f818f64b9ae2	c3cb0ddd-284b-40eb-8037-10dc07431427	c4f0e36a-b50b-4c24-bc00-5c2bdec97284	inventory-transfers	SUCCESS	2026-10-17 05:12:56.713	pulled 0 rows	2026-10-17 05:12:56.713649	2026-10-17 05:12:56.713649	0	\N
9693b4f6-1510-4d73-aabb-9d76afd5f7df	9c6ad396-4c1f-4ae8-8356-a5466ebc2fed	8629e9c9-e135-401c-937f-5e8443bdbd8d	product-batches	SUCCESS	2026-10-17 05:12:56.833	pulled 2 rows	2026-10-17 05:12:56.834707	2026-10-17 05:12:56.834707	0	\N
fc9665f0-c9f6-4a71-9af2-a5d1e3c7a224	72a7f708-36b9-46a2-b08f-9c125de7201a	1f1ac4cf-14dc-491c-9925-c3424b0970e3	categories	SUCCESS	2026-10-17 05:12:57.237	pulled 0 rows	2026-10-17 05:12:57.238213	2026-10-17 05:12:57.238213	0	\N
166df4e2-1603-476e-be14-fe63ddaf5acf	72fd2176-bf0c-424f-93f9-4af2611a4838	22e85e09-8fe0-4e32-912a-954f44704402	units-of-measure	SUCCESS	2026-10-17 05:12:57.242	pulled 0 rows	2026-10-17 05:12:57.24339	2026-10-17 05:12:57.24339	0	\N
1c735f1f-57cc-459b-8c3f-a35f2bbd8e39	799d62b0-15cc-4678-91c5-7ea330e33ce2	b56fd6a5-b06d-4c79-a4e9-d69068726efe	suppliers	SUCCESS	2026-10-17 05:12:57.243	pulled 0 rows	2026-10-17 05:12:57.245026	2026-10-17 05:12:57.245026	0	\N
373002e7-0416-43a0-8c79-9a4d4f06a032	d723c090-1594-4a9d-8b44-f77fda57f3ad	6bba0eee-3be7-48b3-9efb-7df6096ba4ee	purchases	SUCCESS	2026-10-17 05:12:57.247	pulled 0 rows	2026-10-17 05:12:57.249677	2026-10-17 05:12:57.249677	0	\N
4c53f699-0119-4adb-bfde-2dd694cc5d52	91a2adea-0e0c-47ce-a727-817901ea40f0	76260422-e8b8-4e4a-8a2f-74c3b9ec3cc4	branches	SUCCESS	2026-10-17 05:12:57.252	pulled 0 rows	2026-10-17 05:12:57.25299	2026-10-17 05:12:57.25299	0	\N
05f7e173-5c8e-435a-9d0a-e6c1131413d5	ad5b3399-47bb-41e7-96bb-44499dadda00	29a51246-7e52-4b67-ab10-dde558fa2e8c	roles	SUCCESS	2026-10-17 05:12:57.387	pulled 0 rows	2026-10-17 05:12:57.388504	2026-10-17 05:12:57.388504	0	\N
5c5bb2a4-9fd0-425d-9f0d-93a5454c181a	558127fb-6452-4b71-9d76-5233db20cf88	4d4cb637-fb27-4675-b12f-5b3194240afd	notifications	SUCCESS	2026-10-17 05:12:57.409	pulled 0 rows	2026-10-17 05:12:57.413796	2026-10-17 05:12:57.413796	0	\N
f9585914-4c2a-40da-92d3-b5051fa35d01	143928c1-d091-4fd5-886e-d39e0d90790a	b473f96d-9b3f-4ac4-8933-ace5fda2a6d2	sales	SUCCESS	2026-10-17 05:12:57.416	pulled 0 rows	2026-10-17 05:12:57.417796	2026-10-17 05:12:57.417796	0	\N
ae5fd814-e53a-46e9-95a5-b8735f242774	ab301e96-8e17-4ec3-b9fd-a439f2aaf499	49536ff9-035a-4e2f-9563-73c1c4d0fe50	users	SUCCESS	2026-10-17 05:12:57.42	pulled 0 rows	2026-10-17 05:12:57.421037	2026-10-17 05:12:57.421037	0	\N
033c0625-4757-4c25-b5e9-6cfcfc1f87a5	054910f3-1532-4058-becf-ce0f08510f45	88c67470-b23e-4e1b-b04b-bcbb123e4579	products	SUCCESS	2026-10-17 05:13:56.221	pulled 6 rows	2026-10-17 05:13:56.221477	2026-10-17 05:13:56.221477	0	\N
e2591784-593c-4539-ac87-e544e89db8fe	f7923756-c6b4-4c26-910e-45ebb91557ee	5ead84cd-b8d7-425e-8081-e683964e5b58	customers	SUCCESS	2026-10-17 05:13:56.224	pulled 0 rows	2026-10-17 05:13:56.225383	2026-10-17 05:13:56.225383	0	\N
f1075a0b-2761-46fc-b00f-322222d67d5c	312ae7b2-7188-43aa-9f86-250cf8fd8f24	5bf0f25f-b8aa-4ce4-9052-0327bced9849	expenses	SUCCESS	2026-10-17 05:13:56.246	pulled 0 rows	2026-10-17 05:13:56.246717	2026-10-17 05:13:56.246717	0	\N
5b5391df-78ea-4159-aba9-7ccf4b8a30a5	3c94140c-1b76-4664-994f-42f70d5c95bc	0290213c-2292-4230-aa23-ef13d6a1fb97	inventories	SUCCESS	2026-10-17 05:13:56.258	pulled 6 rows	2026-10-17 05:13:56.25903	2026-10-17 05:13:56.25903	0	\N
2b1406e3-675d-4172-9a01-a6cc587a98ed	421d3714-2c55-40a3-9676-57acc7db581c	aef9c7ec-1a45-4912-bf45-04fa8521664f	inventory-transfers	SUCCESS	2026-10-17 05:13:56.593	pulled 0 rows	2026-10-17 05:13:56.596786	2026-10-17 05:13:56.596786	0	\N
547b0760-7468-4fd0-88c2-919e627e3483	b13f9342-62e3-46d8-9d2d-538d992d83eb	419774b0-7242-4108-9eab-293397ffb0f1	categories	SUCCESS	2026-10-17 05:13:56.846	pulled 0 rows	2026-10-17 05:13:56.846776	2026-10-17 05:13:56.846776	0	\N
a5885fb4-3469-4ac4-bdfe-4e62772e3ffa	612f7758-44bb-4da1-b847-a73787891ab8	6a82ea74-d906-43f4-8bb2-d4cc4de154ac	product-batches	SUCCESS	2026-10-17 05:13:56.845	pulled 2 rows	2026-10-17 05:13:56.845413	2026-10-17 05:13:56.845413	0	\N
52d57722-1392-43e0-903a-46d381ddfb59	2d356021-f669-4a47-b7f0-8a85e1c0ea13	8542dc1e-6d53-45ea-aa85-f3eef130de4b	units-of-measure	SUCCESS	2026-10-17 05:13:56.897	pulled 0 rows	2026-10-17 05:13:56.897692	2026-10-17 05:13:56.897692	0	\N
2c626166-a2ad-4226-99c9-e7a691abdb32	6bd2aeb1-e863-4d0d-8b60-3b48c76bcdbe	8be74bd1-af17-4b73-b0f7-f424245acf09	suppliers	SUCCESS	2026-10-17 05:13:56.923	pulled 0 rows	2026-10-17 05:13:56.923625	2026-10-17 05:13:56.923625	0	\N
26ce1733-2b49-4315-afbe-e2f6e2aad908	c58199ef-ff2d-41a3-9b05-cb42b8809e67	8abad526-9921-469d-8800-d3a5ed9efdb9	purchases	SUCCESS	2026-10-17 05:13:56.934	pulled 0 rows	2026-10-17 05:13:56.935239	2026-10-17 05:13:56.935239	0	\N
77e175cd-826c-4673-b9f5-006cbab480f7	01a96711-ad32-4a28-a0bc-c44f78e7db25	e044b110-e28f-4691-997d-3ab7cb2048c7	branches	SUCCESS	2026-10-17 05:13:56.94	pulled 0 rows	2026-10-17 05:13:56.94187	2026-10-17 05:13:56.94187	0	\N
61827fda-1454-43aa-ba8e-c34fcde0efce	9ad5f984-954a-4cd7-b264-a5ce809db65a	51d1526e-b6f5-49b9-84bc-14907f92978a	sales	SUCCESS	2026-10-17 05:13:56.955	pulled 0 rows	2026-10-17 05:13:56.955825	2026-10-17 05:13:56.955825	0	\N
7e803f6f-455b-4d2c-a775-27f14e448346	e03e54e5-5903-4685-9fc5-c0619b319d98	e9a9fbfc-bf2f-4bc6-9076-706b20fdc0e4	roles	SUCCESS	2026-10-17 05:13:56.984	pulled 0 rows	2026-10-17 05:13:56.985145	2026-10-17 05:13:56.985145	0	\N
24b6caa9-fe1c-4f07-8b0f-3a62bee25ec9	59b43789-dc63-43d6-8bf6-bb600c3f6966	00c7c108-74b7-47bd-9060-18d6106e9886	users	SUCCESS	2026-10-17 05:13:57.003	pulled 0 rows	2026-10-17 05:13:57.003907	2026-10-17 05:13:57.003907	0	\N
2e1ae072-374e-45d5-8222-7ad6d53d1d9f	d9106fa2-89cf-4037-8ed8-6f54ed7ef34d	c87ace4a-8a48-4363-bb2d-d8332972e82a	notifications	SUCCESS	2026-10-17 05:13:57.141	pulled 0 rows	2026-10-17 05:13:57.142555	2026-10-17 05:13:57.142555	0	\N
a7abeaf2-9b00-4b7c-9400-fe6b727a37c4	e85264c4-689f-4783-ba8a-7b8eefbcce21	54631e47-f5cc-4749-b727-634119939b6e	products	SUCCESS	2026-10-17 05:14:56.266	pulled 6 rows	2026-10-17 05:14:56.268673	2026-10-17 05:14:56.268673	0	\N
9030b9e8-a05e-4579-a62e-b22bb547f4e5	d1392a11-802b-4966-9105-02b5b743272b	7f7ddae8-fe63-4c31-9a31-e19507f3d3f8	customers	SUCCESS	2026-10-17 05:14:56.284	pulled 0 rows	2026-10-17 05:14:56.284699	2026-10-17 05:14:56.284699	0	\N
9e3f7c90-aec1-4b64-b987-15ac80bebc99	99e4035c-348e-416b-b012-4362ed37de60	da6d50fd-129e-45ce-b3e0-af27bad2ae6e	expenses	SUCCESS	2026-10-17 05:14:56.316	pulled 0 rows	2026-10-17 05:14:56.317172	2026-10-17 05:14:56.317172	0	\N
2949991c-b0b5-4dae-9454-eae8e1671a11	e9e95568-7e3e-4072-8722-df445c012be7	5e0c8b00-9ee2-4001-84d6-450c9c3cd67a	inventories	SUCCESS	2026-10-17 05:14:56.326	pulled 6 rows	2026-10-17 05:14:56.326867	2026-10-17 05:14:56.326867	0	\N
7a1d2372-da0e-420e-8b07-d9c21cbb0a81	61b2ba19-0e4d-4bab-9b52-1e6a2fa76d98	45197b5e-ee46-4d1e-a16a-a8541fe27564	inventory-transfers	SUCCESS	2026-10-17 05:14:56.353	pulled 0 rows	2026-10-17 05:14:56.35419	2026-10-17 05:14:56.35419	0	\N
76914586-d716-4c4b-9d9d-123fbf228f35	5ced6b1d-28b0-4a92-88a4-1c6795843d09	9c71e954-271b-46d0-afe0-f8c6a835a927	product-batches	SUCCESS	2026-10-17 05:14:56.595	pulled 2 rows	2026-10-17 05:14:56.59728	2026-10-17 05:14:56.59728	0	\N
3c671910-cbb6-429c-9d12-f2ffaebf80c9	2707e470-a96c-4b06-b303-0944576db457	f366999c-702c-4ba0-bdad-5cd5b0b1bd10	categories	SUCCESS	2026-10-17 05:14:56.909	pulled 0 rows	2026-10-17 05:14:56.910352	2026-10-17 05:14:56.910352	0	\N
cf9277a2-f4b3-473a-8850-e4ecb6a3c323	420abb12-605d-499d-839b-7b4c35443420	0eaf4c39-0931-482a-9e0a-323e8a6d88a1	suppliers	SUCCESS	2026-10-17 05:14:56.923	pulled 0 rows	2026-10-17 05:14:56.927188	2026-10-17 05:14:56.927188	0	\N
2a57ea7e-bf24-4d96-bc89-62ceffd97865	36806ee4-3430-4cae-9ba7-7b7c7a1f18e3	f7df3ceb-1d95-4caa-89c1-472daf794b07	units-of-measure	SUCCESS	2026-10-17 05:14:56.987	pulled 0 rows	2026-10-17 05:14:56.988257	2026-10-17 05:14:56.988257	0	\N
369c7119-191e-4555-95a8-7da450d77a83	9024fb7b-0d05-404c-b8b4-9d6eeb57c14d	9ff197ee-c731-4202-b51f-eae04e4359bb	branches	SUCCESS	2026-10-17 05:14:56.994	pulled 0 rows	2026-10-17 05:14:56.995118	2026-10-17 05:14:56.995118	0	\N
b09ed973-5bdf-48f2-97c5-88e936de9910	8b5fbd1a-0e12-4e73-8cb6-6d722b76e00c	c1a9c822-1f38-4702-87c9-6c072132e569	sales	SUCCESS	2026-10-17 05:14:57.019	pulled 0 rows	2026-10-17 05:14:57.020077	2026-10-17 05:14:57.020077	0	\N
4e6664d6-beab-4852-9922-d997b42be366	a22bee3b-c3a4-4e47-847b-b456b260d72d	794ce549-e65e-4886-ad5f-f0af4936aabb	roles	SUCCESS	2026-10-17 05:14:57.173	pulled 0 rows	2026-10-17 05:14:57.173884	2026-10-17 05:14:57.173884	0	\N
31b777cc-9405-4b04-9c09-e33770bf50ef	557ae812-b4c9-41c1-800b-871fdab47399	6701c20a-7f66-45e2-899b-e84607d5375b	purchases	SUCCESS	2026-10-17 05:14:57.007	pulled 0 rows	2026-10-17 05:14:57.008097	2026-10-17 05:14:57.008097	0	\N
1ac4b4cd-5973-47f5-8e15-436526c756be	f5c25e28-3489-4beb-b61e-e85e9ba9f34b	40cc387a-5bd7-4d85-b2e8-f4974b833e96	users	SUCCESS	2026-10-17 05:14:57.015	pulled 0 rows	2026-10-17 05:14:57.015809	2026-10-17 05:14:57.015809	0	\N
579516ad-7a4c-4c0c-b2e9-e045d91ffbfa	20000748-598e-41cf-940e-710f10c79c18	d53aa945-e435-413f-b1fc-7004487b362a	notifications	SUCCESS	2026-10-17 05:14:57.178	pulled 0 rows	2026-10-17 05:14:57.179657	2026-10-17 05:14:57.179657	0	\N
fc1ddc58-5ec4-4b97-83e3-9031895f1e98	f01589aa-137f-4189-9575-902a2735c84c	80fd6dbc-af8d-40ce-96bc-c3cdd1d70fde	products	SUCCESS	2026-10-17 05:15:56.233	pulled 6 rows	2026-10-17 05:15:56.234024	2026-10-17 05:15:56.234024	0	\N
1bb72914-7231-4229-9710-53c434ea6896	33d4b477-2980-4cc3-890c-5e2e4508fbf1	a4bdbcad-08ac-4e60-bcfd-ab18b1db153c	customers	SUCCESS	2026-10-17 05:15:56.262	pulled 0 rows	2026-10-17 05:15:56.262795	2026-10-17 05:15:56.262795	0	\N
d0f737b0-2e3c-45c8-a223-8103c15ffd00	1cdbd741-2249-41fd-b153-706ea8dbf139	20fd18fa-47ba-4e84-92d5-7c8d811872f8	expenses	SUCCESS	2026-10-17 05:15:56.295	pulled 0 rows	2026-10-17 05:15:56.295573	2026-10-17 05:15:56.295573	0	\N
d2d577fb-66e7-4e12-95f8-73559bf16948	fe885472-f425-4958-8b6f-19d65d755b75	2d53572a-8b9a-499b-bda6-75831c539aaf	inventories	SUCCESS	2026-10-17 05:15:56.308	pulled 6 rows	2026-10-17 05:15:56.30903	2026-10-17 05:15:56.30903	0	\N
5bce70b8-cca1-441e-b464-d8198035b0a5	65bb7041-cfcc-4ff7-bf09-2f108f05c7f1	123d9d09-d607-4456-bdc2-cc01dad968bd	inventory-transfers	SUCCESS	2026-10-17 05:15:56.405	pulled 0 rows	2026-10-17 05:15:56.406027	2026-10-17 05:15:56.406027	0	\N
48e36f66-8fe7-4f2d-9db5-4a392fc3fc90	38f8c57e-7d50-4a43-b152-e9c941bb38c4	c8a04d76-c193-4e66-a987-4a87dd0ee924	suppliers	SUCCESS	2026-10-17 05:15:56.702	pulled 0 rows	2026-10-17 05:15:56.7042	2026-10-17 05:15:56.7042	0	\N
8f2207a7-735a-4875-bb91-8f4aee9f4202	48b65f26-308b-4ebf-9e07-523c76b33564	ba2687eb-9982-419e-b14e-be725c21e9a4	product-batches	SUCCESS	2026-10-17 05:15:56.709	pulled 2 rows	2026-10-17 05:15:56.712471	2026-10-17 05:15:56.712471	0	\N
d4b650b8-c3a4-4f97-8142-281b4b2800ee	a3ffcf72-be9e-481b-9a28-7e8f5ffd71b5	4fc1608a-891f-41c2-821f-89b1e6e76859	branches	SUCCESS	2026-10-17 05:15:56.719	pulled 0 rows	2026-10-17 05:15:56.719494	2026-10-17 05:15:56.719494	0	\N
dc0a819a-0982-44fe-b3d9-165cdda82e96	7588ea89-a27f-46c0-b638-cc19e529659a	c90bf3cb-1ce6-4e3e-a172-4d5f9b749734	categories	SUCCESS	2026-10-17 05:15:56.824	pulled 0 rows	2026-10-17 05:15:56.82628	2026-10-17 05:15:56.82628	0	\N
427d0d25-5fd3-46f9-9171-0f2dc2775269	e5377ff6-e5e9-401a-b034-5cc8857fc4ff	33930899-4929-48f0-a52c-39bd7fb1ff78	units-of-measure	SUCCESS	2026-10-17 05:15:56.927	pulled 0 rows	2026-10-17 05:15:56.929574	2026-10-17 05:15:56.929574	0	\N
7d6666da-13c1-44b0-951a-35befe3a55f9	86bea08d-3600-4c1c-b1c6-53181802a35b	6d70862a-49a4-48c9-9fb0-4b658967d1bb	purchases	SUCCESS	2026-10-17 05:15:56.926	pulled 0 rows	2026-10-17 05:15:56.927029	2026-10-17 05:15:56.927029	0	\N
f11a14cb-e967-48e0-b39c-50e3f757e9b9	1e47bc16-73ab-4c8e-93a3-420c512f9d43	f1e2a5ad-d906-43aa-bad2-e20dca62fac0	users	SUCCESS	2026-10-17 05:15:56.931	pulled 0 rows	2026-10-17 05:15:56.931775	2026-10-17 05:15:56.931775	0	\N
7d636d1e-9664-47f4-958a-eaa4c1702359	a4f885ff-8de6-43aa-a20e-a066641b1b60	fcc15e0b-d81a-46c7-8107-1c7e4616a0de	sales	SUCCESS	2026-10-17 05:15:56.932	pulled 0 rows	2026-10-17 05:15:56.933261	2026-10-17 05:15:56.933261	0	\N
bb55fb9e-08eb-4a9f-ba4d-ed501ee8a96b	ee8466d1-b804-48bb-b579-a8c3ee22856d	1a0a6323-fe8f-4283-b209-2fabeec95f4b	roles	SUCCESS	2026-10-17 05:15:56.984	pulled 0 rows	2026-10-17 05:15:56.984728	2026-10-17 05:15:56.984728	0	\N
fbf7715f-d1c6-4029-ae8c-7ed68f8b3b49	3948417e-d70a-4231-baa4-53096155895f	0267b096-0b57-4bf9-a3d0-8364d6efc085	notifications	SUCCESS	2026-10-17 05:15:57.079	pulled 0 rows	2026-10-17 05:15:57.080624	2026-10-17 05:15:57.080624	0	\N
04111cf9-1a84-4ef4-b1af-48db40068dc9	1e7a7211-cd2a-4ae1-9b1d-7a8c78068cf9	eecf6c86-a1e7-4c7a-9736-fde2687b5728	customers	SUCCESS	2026-10-17 05:16:56.03	pulled 0 rows	2026-10-17 05:16:56.031145	2026-10-17 05:16:56.031145	0	\N
19258cac-dcfa-4906-9742-f7a58e705510	1179fe8a-a4e8-46de-923b-e9bbd4d29759	4d8be1b0-836f-40dd-8bf9-42a3904afdd6	products	SUCCESS	2026-10-17 05:16:56.037	pulled 6 rows	2026-10-17 05:16:56.038517	2026-10-17 05:16:56.038517	0	\N
3cdc08c0-fbe2-468a-bbb4-e51e4744a137	0e0a1ecc-457c-49d6-9843-9e71e2b642eb	009a21bf-a110-4c24-a31e-bda82263d888	expenses	SUCCESS	2026-10-17 05:16:56.071	pulled 0 rows	2026-10-17 05:16:56.072073	2026-10-17 05:16:56.072073	0	\N
7c936219-59ec-46b5-ad0a-42901bbf937c	84542e15-8368-4bd9-8304-b9175732dbb7	9f2c93c3-8c9d-4a83-ba87-656bee028430	inventories	SUCCESS	2026-10-17 05:16:56.109	pulled 6 rows	2026-10-17 05:16:56.11021	2026-10-17 05:16:56.11021	0	\N
8478ac66-8272-452b-bfe2-eb59ed456e17	d58a0d2e-ef7e-48d7-8648-acfba79efa9a	5f87a1d1-8a22-44bf-92dd-b633a3ffe99f	inventory-transfers	SUCCESS	2026-10-17 05:16:56.221	pulled 0 rows	2026-10-17 05:16:56.222681	2026-10-17 05:16:56.222681	0	\N
c0278290-3c9b-43fa-b5e5-4af3484ccd99	7ec83d25-8f3a-4c14-be0e-efd31bfe25d8	05e2349d-d128-4cf2-940c-a9cb341b1150	product-batches	SUCCESS	2026-10-17 05:16:56.298	pulled 2 rows	2026-10-17 05:16:56.299252	2026-10-17 05:16:56.299252	0	\N
bfac5bbf-1b7c-47d3-b285-64cf4c10e6b5	b3db17ed-6483-4912-91de-88a9f3f9c093	a75a99de-dd0a-4193-8228-d0f19f17599c	units-of-measure	SUCCESS	2026-10-17 05:16:56.602	pulled 0 rows	2026-10-17 05:16:56.604893	2026-10-17 05:16:56.604893	0	\N
ef8e66e0-da7c-4f20-a084-f5d3143cb55e	17aad6e5-5687-4b4e-a08f-27a71f10df0a	c0f8fb0b-352a-45af-87d1-2f8ce9b50caa	suppliers	SUCCESS	2026-10-17 05:16:56.612	pulled 0 rows	2026-10-17 05:16:56.613297	2026-10-17 05:16:56.613297	0	\N
2c2a30d6-9995-4b5e-baec-bc185c0830ff	d56ac07b-aec2-4e47-825a-7dfa73a30e80	cba731bc-369f-4585-9de8-fbf33bc2857c	branches	SUCCESS	2026-10-17 05:16:56.652	pulled 0 rows	2026-10-17 05:16:56.653078	2026-10-17 05:16:56.653078	0	\N
6bdbf341-c5b7-420e-be94-7cb4fd1047bb	b6c69aa6-1997-4d20-84b0-2b22d38b68a3	727042fa-5e98-430f-9fda-7b6f61685851	users	SUCCESS	2026-10-17 05:16:56.875	pulled 0 rows	2026-10-17 05:16:56.876271	2026-10-17 05:16:56.876271	0	\N
3e17c30f-29af-40bd-a50d-6acfdc5f4f63	e91a4593-c359-4eef-84a7-e06f222ea6e3	294d6e90-d2a5-4acd-b324-0dbddd41c939	categories	SUCCESS	2026-10-17 05:16:56.878	pulled 0 rows	2026-10-17 05:16:56.879241	2026-10-17 05:16:56.879241	0	\N
7954ae90-9247-4a7f-9960-3b1864fc599c	62a2ce9a-4ce0-445e-9d0b-e39b23aaf7f9	5e9ccadf-3a88-44b8-8f0d-6971c2ced445	sales	SUCCESS	2026-10-17 05:16:56.876	pulled 0 rows	2026-10-17 05:16:56.876997	2026-10-17 05:16:56.876997	0	\N
8b3cca12-7cc3-474b-b066-8198d91d98f3	1261eadb-faff-4ee1-ac53-f930272cc6db	ba7c61b8-0d50-44d9-bf03-1ec95a8c99b8	notifications	SUCCESS	2026-10-17 05:16:56.888	pulled 0 rows	2026-10-17 05:16:56.888468	2026-10-17 05:16:56.888468	0	\N
e326dc68-3c61-462f-8fa3-16ab7b3ea355	724af48d-d05a-4055-9610-80bb4391b3d7	b5358ef6-acd0-4a6b-873f-ef294d188a2a	purchases	SUCCESS	2026-10-17 05:16:56.891	pulled 0 rows	2026-10-17 05:16:56.892022	2026-10-17 05:16:56.892022	0	\N
7d33bbf0-7303-4859-b947-e6ecf8c931cd	3a007da5-9af8-41ca-96c3-d2dab1173eeb	4f465ade-91aa-4a55-8697-cba7ebedef6b	roles	SUCCESS	2026-10-17 05:16:56.95	pulled 0 rows	2026-10-17 05:16:56.950907	2026-10-17 05:16:56.950907	0	\N
1cb13918-9e30-4022-b21b-020650cb7be8	86d89514-492d-45ac-abb9-a507f141ae11	3636e988-37e8-46a6-9f72-e96d7c7d9033	inventories	SUCCESS	2026-10-17 05:41:40.313	pulled 6 rows	2026-10-17 05:41:40.315195	2026-10-17 05:41:40.315195	0	\N
9910fe11-1606-4734-84bc-47aa8f962ac2	a0d34d3d-555f-406b-a150-b76b2068d27f	1a5e3375-61d0-432a-a0ae-f9418d4ac0f4	products	SUCCESS	2026-10-17 05:41:40.457	pulled 6 rows	2026-10-17 05:41:40.457745	2026-10-17 05:41:40.457745	0	\N
a91f6d0b-b3fe-4425-99b7-0b9068942041	07985dbd-acec-42ca-89b1-a86b3e098a7c	babc545c-d4bd-4a8d-aa7a-7ff323f02af4	inventories	SUCCESS	2026-10-17 06:04:23.652	pulled 6 rows	2026-10-17 06:04:23.656257	2026-10-17 06:04:23.656257	0	\N
205d5dc5-b014-41f0-8cd5-97423025afba	7dd79138-6c87-4e40-866e-54e90026b031	14d39221-5170-4c1c-98f5-166f9614f375	sales	SUCCESS	2026-10-17 06:09:17.436568	\N	2026-10-17 06:09:17.224984	2026-10-17 06:09:17.436568	0	\N
c03d7342-125e-4d49-baaa-3bb300e85a94	8134c7ed-7a1c-4a3d-a335-6da2fe98f2d4	39b4865f-a28a-4583-a6f8-d6765eac82fd	inventories	SUCCESS	2026-10-17 06:10:39.176	pulled 6 rows	2026-10-17 06:10:39.177173	2026-10-17 06:10:39.177173	0	\N
c945d268-6c03-4e8c-9b43-42d379e66c32	fe7533ea-2a57-46f7-8b26-a28519ae7e1c	0845c3db-465d-4628-91ab-0aea07799fc4	products	SUCCESS	2026-10-17 06:11:58.712	pulled 6 rows	2026-10-17 06:11:58.716283	2026-10-17 06:11:58.716283	0	\N
012ccbac-2e79-4127-b2e7-913ba4eadcc6	4df86bc8-10bf-4219-92dd-1c43207ffa7a	6e33e0a4-4a82-4ad6-ac62-067f79d287fd	product-batches	SUCCESS	2026-10-17 06:11:58.824	pulled 0 rows	2026-10-17 06:11:58.824766	2026-10-17 06:11:58.824766	0	\N
fab4d66b-415d-4fdc-a3f0-5b817754465d	b19eadd0-19ca-479d-8a6b-5853f284a8b0	6d7d09f2-5a8a-4735-890b-0e9f97a05b48	categories	SUCCESS	2026-10-17 06:11:58.945	pulled 0 rows	2026-10-17 06:11:58.947421	2026-10-17 06:11:58.947421	0	\N
f1dbcc66-43c4-4f4f-81fd-56e29777563c	9d457b11-0867-4749-a629-f68971c6bab2	817bdc03-b9bc-433e-ad6a-d07e09981f97	branches	SUCCESS	2026-10-17 06:11:58.998	pulled 1 rows	2026-10-17 06:11:59.000048	2026-10-17 06:11:59.000048	0	\N
91eedfd3-9a13-4669-b6cb-4dbbd93fff02	dcec966f-ff84-4980-811e-d9fe147f485f	aba26854-a73b-4169-a52e-687a8e290fed	inventories	SUCCESS	2026-10-17 06:11:59.028	pulled 0 rows	2026-10-17 06:11:59.02924	2026-10-17 06:11:59.02924	0	\N
682ac416-10ac-47e1-ae50-9611b5158124	9da0ffa8-f71e-4b77-b989-6d89d59642c5	1f32b61e-5717-4423-900c-ca644b3c43eb	roles	SUCCESS	2026-10-17 06:11:59.158	pulled 0 rows	2026-10-17 06:11:59.158918	2026-10-17 06:11:59.158918	0	\N
db14a153-395f-4a6b-83da-711841cd4249	8b1840cc-aa31-4676-b0a7-8ae997af6476	c3b2aefd-2dc6-4deb-99d6-1f47ff6883bb	users	SUCCESS	2026-10-17 06:11:59.161	pulled 1 rows	2026-10-17 06:11:59.162132	2026-10-17 06:11:59.162132	0	\N
5c7ba37b-1485-49a0-b14f-b86fc578546a	f26cd55c-c32c-4823-84d4-cd2df4dc3be5	1a9cacbe-9427-4e8f-93c2-a33f08231e72	products	SUCCESS	2026-10-17 06:11:59.276	pulled 6 rows	2026-10-17 06:11:59.277105	2026-10-17 06:11:59.277105	0	\N
b01d7da3-be13-4d41-971e-5f3cae00c49e	56f4c14a-9132-4803-bef0-a2017a519fba	ae9d363f-1898-4b0e-ae8c-9f8144065e73	purchases	SUCCESS	2026-10-17 06:11:59.08	pulled 0 rows	2026-10-17 06:11:59.084412	2026-10-17 06:11:59.084412	0	\N
7a423b11-9861-4192-8451-7ba6950476da	ccbaa8f9-6180-4f1a-8de0-f5b15b34429d	e8339678-dbfd-4398-b31a-194eff258a70	customers	SUCCESS	2026-10-17 06:11:59.138	pulled 0 rows	2026-10-17 06:11:59.139011	2026-10-17 06:11:59.139011	0	\N
6c616d30-a21c-4d5d-80cd-2faee53bb7b8	18c55fe7-0bcb-491d-8036-d50d2da693e7	fe2e7271-3385-405c-b0d2-317192007484	suppliers	SUCCESS	2026-10-17 06:11:59.134	pulled 0 rows	2026-10-17 06:11:59.139414	2026-10-17 06:11:59.139414	0	\N
afe53ebd-014f-4f14-ad3c-d836dfc244d3	c87a22e1-845a-4eb2-b579-acc8fd7efd85	c00bc988-364b-4d60-b998-60633e02703a	sales	SUCCESS	2026-10-17 06:11:59.183	pulled 0 rows	2026-10-17 06:11:59.184134	2026-10-17 06:11:59.184134	0	\N
d3a4bd47-1515-499a-8bea-298fdd5fd11b	828ce203-e221-49c1-affe-ea42b5b1e633	87f9f339-877c-4f52-9bc1-d1a2ab6fe71d	expenses	SUCCESS	2026-10-17 06:11:59.207	pulled 0 rows	2026-10-17 06:11:59.207875	2026-10-17 06:11:59.207875	0	\N
21f91231-94f5-470c-a8b3-12eb59ed2ca4	3f75ee71-4f23-4520-a6ed-afcb97a84e17	dff05cd5-e039-421e-80a0-64236e00fb10	notifications	SUCCESS	2026-10-17 06:11:59.264	pulled 29 rows	2026-10-17 06:11:59.265664	2026-10-17 06:11:59.265664	0	\N
4f64633b-b691-464a-927b-e56b2c88ae7b	9ae83968-61a5-4405-a54d-dc1f80f73a3b	caa58092-c09f-4ac7-8133-fcc45f597afc	inventory-transfers	SUCCESS	2026-10-17 06:11:59.272	pulled 0 rows	2026-10-17 06:11:59.273232	2026-10-17 06:11:59.273232	0	\N
2e2d1ff7-3e70-44db-b363-57acda760c07	3efa7f11-a744-4e24-ba92-ab2aecbdac1d	bf33966e-aa53-42c2-b417-91e6d6dd8155	inventories	SUCCESS	2026-10-17 12:44:31.664	pulled 6 rows	2026-10-17 12:44:31.664787	2026-10-17 12:44:31.664787	0	\N
79172086-1ab3-4a70-adef-952a0bbee11d	3f6ecfa7-f3c8-4582-9be4-6095fff98266	bde3013e-4730-4365-b7a4-abeacdd505c3	products	SUCCESS	2026-10-17 12:44:31.672	pulled 6 rows	2026-10-17 12:44:31.67259	2026-10-17 12:44:31.67259	0	\N
847e6e4b-d229-429e-9617-59599c0f3fc7	3d66e229-d240-4855-8809-b024b0e6676c	f8530939-b82f-4eb5-88f8-3544c3a3d31c	product-batches	SUCCESS	2026-10-17 12:44:31.656	pulled 3 rows	2026-10-17 12:44:31.662337	2026-10-17 12:44:31.662337	0	\N
2fd9a511-c8df-4b4d-b9ea-3a1149a6fc75	4d448538-f208-4994-9fd1-1f2fc1143e26	068522d1-49ed-4e3a-91ee-8521458c939f	customers	SUCCESS	2026-10-17 12:44:31.728	pulled 0 rows	2026-10-17 12:44:31.729518	2026-10-17 12:44:31.729518	0	\N
efd7b97d-e66e-43f2-9d76-8d847fe17ad2	8b4f6643-8603-41c4-84ae-d0ff909dd63b	8b459f8e-7299-4090-8e2c-bf14a1d0b1d2	branches	SUCCESS	2026-10-17 12:44:31.763	pulled 1 rows	2026-10-17 12:44:31.763616	2026-10-17 12:44:31.763616	0	\N
3aa7bbcd-3857-4230-a2bf-f2440592f2b0	886f1aaf-42f0-487e-902d-827078faefda	b8a47c62-4ef9-4c75-bb10-bc44359b3f69	purchases	SUCCESS	2026-10-17 12:44:31.786	pulled 1 rows	2026-10-17 12:44:31.787345	2026-10-17 12:44:31.787345	0	\N
3a47ff00-6f21-4f60-8331-1e9cad95106d	80aabadc-279b-404a-886c-d0affaf3ee23	54b825cf-0dae-41ba-8ae8-ce8cd8da8784	expenses	SUCCESS	2026-10-17 12:44:31.788	pulled 0 rows	2026-10-17 12:44:31.811483	2026-10-17 12:44:31.811483	0	\N
8707ae68-96ed-4dd8-bf34-4e0487b1dff7	b16f64e2-5f83-4ec2-8acf-88264350bf0b	e0c6ae3f-32c5-4ee8-8004-6d18c38d07cd	users	SUCCESS	2026-10-17 12:44:31.818	pulled 1 rows	2026-10-17 12:44:31.820925	2026-10-17 12:44:31.820925	0	\N
5c60d0e6-3c14-44a7-b70f-a658e8187368	8b91ac33-0c69-40d4-ad8c-deabfb19a904	e29ed6ee-12c2-431d-84be-f0e99d34fcb5	categories	SUCCESS	2026-10-17 12:44:31.828	pulled 1 rows	2026-10-17 12:44:31.833576	2026-10-17 12:44:31.833576	0	\N
7539b49e-beb5-4520-9bdd-b9cd48e507fb	7e575b73-babe-409b-8d2a-5ec1a2a66908	3aceadd9-3de3-4e49-9af4-b5afefe668d3	sales	SUCCESS	2026-10-17 12:44:31.857	pulled 3 rows	2026-10-17 12:44:31.8575	2026-10-17 12:44:31.8575	0	\N
da85c3fa-55b4-4cc3-abfd-1e85bb896222	e086a589-eb99-4c57-8753-f8e1b9b11367	022bd947-2def-4600-a0d4-5e11b589f460	suppliers	SUCCESS	2026-10-17 12:44:31.871	pulled 1 rows	2026-10-17 12:44:31.875461	2026-10-17 12:44:31.875461	0	\N
8ba62013-1290-47a9-9743-6f25d967e037	b99a3b95-a237-4347-9d1b-836c31a036d4	343bb35d-41b7-4813-b06e-dc818261dc9f	inventory-transfers	SUCCESS	2026-10-17 12:44:31.935	pulled 0 rows	2026-10-17 12:44:31.936174	2026-10-17 12:44:31.936174	0	\N
57bdc6c5-171c-4096-ac6a-fa1f89a8be31	bc921423-d548-480a-849b-5bc4a800a0b8	4fb5d0a1-d108-4c3d-be38-921df9a68b58	roles	SUCCESS	2026-10-17 12:44:31.94	pulled 0 rows	2026-10-17 12:44:31.94053	2026-10-17 12:44:31.94053	0	\N
8e790556-6815-407e-99b6-c9327ee790af	a012adca-d09f-439a-a4ce-9e1576f3521d	1b9296d6-ff6b-4dd8-8e4b-999201d53e8f	notifications	SUCCESS	2026-10-17 12:44:31.955	pulled 31 rows	2026-10-17 12:44:31.955693	2026-10-17 12:44:31.955693	0	\N
c03d83ad-679c-4016-b150-55ebd235bf2f	a7dc21e6-458d-445b-8ba4-93f885ad0517	e43b24cf-48a7-4ca9-9583-8412d00cf541	inventories	SUCCESS	2026-10-17 12:44:32.062	pulled 6 rows	2026-10-17 12:44:32.06465	2026-10-17 12:44:32.06465	0	\N
e26f57b9-af13-4046-8b4f-c0f1ef030bf2	bdb748fd-f548-4027-83f3-25d281abd0e5	79d70840-22ca-4194-a833-e1344ae8b6bb	products	SUCCESS	2026-10-17 12:44:32.066	pulled 6 rows	2026-10-17 12:44:32.066588	2026-10-17 12:44:32.066588	0	\N
ec8c368b-146d-4ec8-b2b2-febb53daedd2	0b3c0c39-fa32-4b13-ace9-e85a86d11ea4	f18f2dff-0f6d-424a-b8c5-3062787c562f	products	SUCCESS	2026-10-17 12:54:58.508	pulled 6 rows	2026-10-17 12:54:58.50853	2026-10-17 12:54:58.50853	0	\N
f4291f63-e668-4b97-8a0f-54f6c54e75ac	d07f076f-d48e-4401-8d19-112f7184b6ce	e1acfb39-4815-4df7-a349-9e592b1b9441	units-of-measure	SUCCESS	2026-10-17 12:54:58.534	pulled 1 rows	2026-10-17 12:54:58.534731	2026-10-17 12:54:58.534731	0	\N
a505e361-48ae-478d-bf37-a3f4dc378917	ba9af423-0513-47c3-a262-a6eefd521a31	d0846ff1-7cb2-436b-a526-b085dc231036	categories	SUCCESS	2026-10-17 12:54:58.565	pulled 1 rows	2026-10-17 12:54:58.565474	2026-10-17 12:54:58.565474	0	\N
886affbc-2438-441b-bbc0-d4056130ffde	e72766d8-8c0c-466a-b6a2-c30f6e44c559	5cf2dd22-4a02-4072-97d8-161aca67776d	suppliers	SUCCESS	2026-10-17 12:54:58.6	pulled 1 rows	2026-10-17 12:54:58.600634	2026-10-17 12:54:58.600634	0	\N
c39de537-28ac-40ba-9450-ddc4f34709a3	b689705d-f4b7-4ff5-9a69-bc7b14385041	dfd90270-cb68-4b71-9685-018b9d6b11a6	customers	SUCCESS	2026-10-17 12:54:58.62	pulled 0 rows	2026-10-17 12:54:58.621053	2026-10-17 12:54:58.621053	0	\N
516ccb96-644a-4020-991a-26fda0606a4b	9fec4d38-545d-4541-802c-bddcb9ae8c33	d2da7a57-e33b-4e4f-9651-804b6a22223e	branches	SUCCESS	2026-10-17 12:54:58.611	pulled 2 rows	2026-10-17 12:54:58.617727	2026-10-17 12:54:58.617727	0	\N
b6a94637-97a0-4063-9dda-bcb70012b957	76ffe17f-703c-412c-ae4f-f045098d0c90	81aaaaed-8a09-4617-b474-277bca828e2e	expenses	SUCCESS	2026-10-17 12:54:58.642	pulled 0 rows	2026-10-17 12:54:58.642645	2026-10-17 12:54:58.642645	0	\N
b2af315f-0c95-4609-bdbe-56aa4f7702e5	1ac072ac-c7e2-4dab-bd63-5a0749d4fb44	5a4a861c-0915-4893-b522-6265e9ad6977	purchases	SUCCESS	2026-10-17 12:54:58.656	pulled 1 rows	2026-10-17 12:54:58.657158	2026-10-17 12:54:58.657158	0	\N
810a8471-40ec-4ce4-ba9f-2796ee62d85e	eb176782-aa36-424d-8488-82a30c7a8ee8	8fb10689-1e58-4b55-8e87-7362f71eb277	sales	SUCCESS	2026-10-17 12:54:58.7	pulled 3 rows	2026-10-17 12:54:58.700579	2026-10-17 12:54:58.700579	0	\N
0afb4d75-efb5-4c9a-ac28-3d7948e32b89	c1549c0c-d3f4-4ee3-82a7-3dd4dec6b34c	5d00862e-89c7-4c48-a468-899ab3df02f8	roles	SUCCESS	2026-10-17 12:54:58.78	pulled 7 rows	2026-10-17 12:54:58.781962	2026-10-17 12:54:58.781962	0	\N
2c957c12-e1a0-4f42-9893-b7526789e020	4dcf973b-0965-47ab-8bd5-f85c1bb08a34	f1b164d4-a252-4754-b2d7-4dc912e6db1a	users	SUCCESS	2026-10-17 12:54:58.818	pulled 1 rows	2026-10-17 12:54:58.818588	2026-10-17 12:54:58.818588	0	\N
99d5a978-9cef-43fa-bda9-fe04b4bbbe39	5cc9f0d8-7514-46e8-a8e9-9feb675b2e13	b5a5a8f4-1960-4b8e-b9f0-5b7971da9ce5	inventory-transfers	SUCCESS	2026-10-17 12:54:58.839	pulled 0 rows	2026-10-17 12:54:58.839819	2026-10-17 12:54:58.839819	0	\N
a5c738ec-1e11-47b1-a04b-36a611e01826	a1885312-6167-42b5-901b-60bca69f2b12	e78aac63-7ca4-4043-b025-70061f370da0	inventories	SUCCESS	2026-10-17 12:54:58.841	pulled 6 rows	2026-10-17 12:54:58.841832	2026-10-17 12:54:58.841832	0	\N
65b788c0-c8c8-413d-b4cc-591550f405be	090ac66f-c333-463b-a9ce-e38cd564cf07	53978f1c-c37c-48e8-9ca2-35f6a893eb50	notifications	SUCCESS	2026-10-17 12:54:58.933	pulled 32 rows	2026-10-17 12:54:58.934006	2026-10-17 12:54:58.934006	0	\N
feb52469-d4a6-4491-8331-19f643b7115b	45af45c1-ac3d-4ed2-ab04-0753e5c68a89	b55bf3aa-be34-483f-b27b-5e8f39ab0413	product-batches	SUCCESS	2026-10-17 12:54:58.945	pulled 3 rows	2026-10-17 12:54:58.946071	2026-10-17 12:54:58.946071	0	\N
66fc4704-d1d1-4ed2-af5a-ed6d2fe9c1b6	155ee650-d2b2-4d91-9c6e-193f0b5e56b9	cdccd15e-55da-4f2d-80ee-f83a25197760	products	SUCCESS	2026-10-17 12:55:09.229	pulled 6 rows	2026-10-17 12:55:09.229889	2026-10-17 12:55:09.229889	0	\N
7c4e872f-3e23-475d-94c6-8b8584f5a2cd	c71c195e-c875-4fe8-8be8-f5210b6d322b	0edb70c8-0918-4396-8623-178f395bb3c2	inventories	SUCCESS	2026-10-17 12:55:09.254	pulled 6 rows	2026-10-17 12:55:09.256716	2026-10-17 12:55:09.256716	0	\N
a14004c0-f0f1-4e28-8cfc-766af16f0ae3	739bacac-17d6-4257-937b-85264b6fc8a2	1ba6c78f-3fa2-4288-944d-6ba413ecee13	customers	SUCCESS	2026-10-17 12:55:09.28	pulled 0 rows	2026-10-17 12:55:09.280938	2026-10-17 12:55:09.280938	0	\N
87a1403d-b8b3-4adf-a4a6-68c04d698e06	bc43570b-2ef3-460f-8941-58a67b24f871	96e3edf9-3b9f-4f56-84a1-a20bcb8f7bb7	product-batches	SUCCESS	2026-10-17 12:55:09.286	pulled 3 rows	2026-10-17 12:55:09.287305	2026-10-17 12:55:09.287305	0	\N
abd9f307-fef9-4b01-804e-94ebce89a115	05a480d6-ca15-4e84-b015-84018e91894e	9a17517d-9f81-4208-8ea9-3fbcf7ede003	inventory-transfers	SUCCESS	2026-10-17 12:55:09.594	pulled 0 rows	2026-10-17 12:55:09.594562	2026-10-17 12:55:09.594562	0	\N
262427ed-5997-458d-a276-118e6863b832	d9c51364-20d7-40b4-8c43-c6aa068e1ce0	f7534a80-865f-4ed3-afd1-ec8ac1021b47	units-of-measure	SUCCESS	2026-10-17 12:55:09.64	pulled 0 rows	2026-10-17 12:55:09.64081	2026-10-17 12:55:09.64081	0	\N
eeb81272-2524-4621-b4d8-14d5f5abcc45	612ad8d7-7acf-499e-a8bc-2beb6f5968fa	1e623332-7dd1-4c3f-ae03-4714d893fc59	notifications	SUCCESS	2026-10-17 12:55:09.907	pulled 0 rows	2026-10-17 12:55:09.907675	2026-10-17 12:55:09.907675	0	\N
7f2fe576-0fb1-493f-9efe-4895a9aae3ef	db445171-56dc-4a29-aa0e-b95bb9eb9ea2	87562355-7483-49d3-bdbc-8d914da3349b	expenses	SUCCESS	2026-10-17 12:55:09.601	pulled 0 rows	2026-10-17 12:55:09.601649	2026-10-17 12:55:09.601649	0	\N
35bb358c-5b2e-4f95-b79d-ea4d19b21b2a	f4c57c99-e68a-428f-a1a8-ca069986834e	2176c676-7041-4976-8eca-cf85e355fffd	categories	SUCCESS	2026-10-17 12:55:09.658	pulled 0 rows	2026-10-17 12:55:09.661124	2026-10-17 12:55:09.661124	0	\N
6d6a0223-e4b8-4c95-a6f1-4b7c80e632fb	1a4fe417-1e51-4a25-8dd0-61fc50ed25cb	6188e054-1867-4fca-8118-30184d9e87c3	purchases	SUCCESS	2026-10-17 12:55:09.729	pulled 0 rows	2026-10-17 12:55:09.729477	2026-10-17 12:55:09.729477	0	\N
574b92cf-2c00-4e84-b0c3-4cdef0490abe	53163ee4-f5a1-4601-aa93-ee51728cf8f4	32ce7db2-7e96-4a3f-b932-df5d7dd2ac35	suppliers	SUCCESS	2026-10-17 12:55:09.791	pulled 0 rows	2026-10-17 12:55:09.792182	2026-10-17 12:55:09.792182	0	\N
a4b79d73-7010-4eb7-a08b-5042697dcd2e	afadd0a6-f523-475a-88db-79727f0fcfdf	9ea8e9fc-386a-44c0-9a3f-9e3ec6902de0	branches	SUCCESS	2026-10-17 12:55:09.804	pulled 0 rows	2026-10-17 12:55:09.806843	2026-10-17 12:55:09.806843	0	\N
de8f95cb-b6ad-4841-98d2-d9c672f766df	bec1e138-a233-4289-9ee7-b14b50472282	293c652f-681c-4f2d-90f0-b7995dbb6db0	roles	SUCCESS	2026-10-17 12:55:09.856	pulled 0 rows	2026-10-17 12:55:09.857161	2026-10-17 12:55:09.857161	0	\N
27146bfb-9c96-42eb-bbb5-df0f1697a6ec	ed90c759-a8b6-4422-bd4f-314a2c2710eb	dd756e96-e9f7-4466-b9c3-26b9b2df8d8c	users	SUCCESS	2026-10-17 12:55:09.886	pulled 0 rows	2026-10-17 12:55:09.886708	2026-10-17 12:55:09.886708	0	\N
d180b516-1e54-4ff9-b63b-3e4f4aca0d1a	8254faf7-5cb6-4390-b1df-d3eb0341719c	2773cb24-65d4-4231-a641-35b569f08238	sales	SUCCESS	2026-10-17 12:55:09.896	pulled 0 rows	2026-10-17 12:55:09.897467	2026-10-17 12:55:09.897467	0	\N
5c68da49-c628-4e45-96ce-38ad1e7f773b	240aa469-acce-4fae-8560-68427096fffa	8c9a38dd-7b6c-40e0-8cfe-69757f2c95ff	products	SUCCESS	2026-10-17 12:55:30.299	pulled 6 rows	2026-10-17 12:55:30.30027	2026-10-17 12:55:30.30027	0	\N
30b21848-1494-49eb-aa6e-6deeb015efa2	94572923-4241-41c1-abfa-c89ae698d772	f95ea600-f01d-47fd-a974-83caccb3c5c3	categories	SUCCESS	2026-10-17 12:55:30.326	pulled 1 rows	2026-10-17 12:55:30.327427	2026-10-17 12:55:30.327427	0	\N
22f58d12-93c1-4be7-8723-a1e80ae0e234	388cf5d6-d364-43fb-90f9-c619c7501618	912f171a-c86d-41f2-a316-ffa5e81e9290	suppliers	SUCCESS	2026-10-17 12:55:30.355	pulled 1 rows	2026-10-17 12:55:30.355804	2026-10-17 12:55:30.355804	0	\N
c36f0697-b98e-4961-9ea3-ac1f83d63d85	6f10a118-3d88-4996-8eb2-116698bb1dab	2cd24a1c-3d7b-4b50-a38c-ffcb32949d2b	units-of-measure	SUCCESS	2026-10-17 12:55:30.359	pulled 1 rows	2026-10-17 12:55:30.371664	2026-10-17 12:55:30.371664	0	\N
2cbafa9d-1615-43cd-af2c-a153c7c5b9e0	362761cf-36ad-437e-b40b-e572d5327a36	279e286f-f9e8-44e6-8069-33e11657007b	branches	SUCCESS	2026-10-17 12:55:30.479	pulled 2 rows	2026-10-17 12:55:30.479335	2026-10-17 12:55:30.479335	0	\N
b9cd816a-d55d-4a94-ad48-c07985a1346c	0408b08a-731f-4f1f-8454-07f27156bd33	fad20100-74eb-4ba9-9113-75331a676871	customers	SUCCESS	2026-10-17 12:55:30.538	pulled 0 rows	2026-10-17 12:55:30.539064	2026-10-17 12:55:30.539064	0	\N
5ba0c1d1-60a4-454a-be31-fe94aebee1e7	a0cb66c7-545a-4cc5-878d-7c10fc6b5dd5	d962dfeb-ddcc-4930-92f6-79b7b6e097ca	sales	SUCCESS	2026-10-17 12:55:30.541	pulled 3 rows	2026-10-17 12:55:30.541823	2026-10-17 12:55:30.541823	0	\N
7258b623-27af-465b-a1ff-9816adabe8d8	ee833968-aa39-4fc3-a406-f648f94bab88	6d546a7e-e40e-4e61-9eaf-41564bade61b	expenses	SUCCESS	2026-10-17 12:55:30.555	pulled 0 rows	2026-10-17 12:55:30.555394	2026-10-17 12:55:30.555394	0	\N
86624b2a-bf2a-4467-b153-1899beee74e5	ed80d1e4-4b23-4552-940c-a9acddb6ecf4	5d1201ef-4311-459c-b729-aef482525c97	purchases	SUCCESS	2026-10-17 12:55:30.574	pulled 1 rows	2026-10-17 12:55:30.574825	2026-10-17 12:55:30.574825	0	\N
a883bdd1-192f-4b08-9003-800daaf6d09e	ae3c863f-151c-43b5-a768-d15f02cb1d81	4618f162-9dd3-4116-a65f-237d275ede3e	roles	SUCCESS	2026-10-17 12:55:30.618	pulled 7 rows	2026-10-17 12:55:30.618792	2026-10-17 12:55:30.618792	0	\N
7d8d1a6d-4309-4991-acb9-0ef75cc734ce	52a83b03-b13a-4f8a-a744-80a81a9ce3da	01408c61-4436-4ed0-89b7-9053ad93c133	notifications	SUCCESS	2026-10-17 12:55:30.677	pulled 33 rows	2026-10-17 12:55:30.678485	2026-10-17 12:55:30.678485	0	\N
9bd10b4a-2699-4263-bcbb-7b13ddd4042e	4fb7c7af-e0cb-4694-b2c8-a39f76ab2d65	5f14776b-ccb0-47b4-a86d-f91c054eb3ae	inventories	SUCCESS	2026-10-17 12:55:30.695	pulled 6 rows	2026-10-17 12:55:30.698694	2026-10-17 12:55:30.698694	0	\N
f86a18d1-e7cc-4f88-80ed-cc2d0880c5f4	e8544c44-c9f1-4565-8be1-56c6edffe3dc	cc5520b6-3199-49b9-b226-608b5b23c533	product-batches	SUCCESS	2026-10-17 12:55:30.696	pulled 3 rows	2026-10-17 12:55:30.700263	2026-10-17 12:55:30.700263	0	\N
bb1a9366-116d-4680-9236-aa6b79f7235e	ff37f0a2-73aa-4f90-bfd7-61e70bbeaf01	8fb72308-3e84-4882-86df-408d062996d6	users	SUCCESS	2026-10-17 12:55:30.679	pulled 1 rows	2026-10-17 12:55:30.679818	2026-10-17 12:55:30.679818	0	\N
c85b5da9-4275-46c7-9dd1-40e25f39564c	894f235e-ddc4-4900-812d-556083c259dc	753bea98-93cd-4ea9-b0b8-35ecdedb092c	inventory-transfers	SUCCESS	2026-10-17 12:55:30.74	pulled 0 rows	2026-10-17 12:55:30.741267	2026-10-17 12:55:30.741267	0	\N
cef45ad1-c12f-4c18-b50f-77166e02886b	dev-mvceeibs-b5gtwdm47m	mut-mvcehi3d-757kc68pr4	products	SUCCESS	2026-10-17 12:57:22.310364	\N	2026-10-17 12:57:22.173896	2026-10-17 12:57:22.310364	0	\N
ea661999-a680-4d35-abad-05ab622fba71	dev-mvceeibs-b5gtwdm47m	mut-mvcei5sd-nb9sycro66	inventory-transactions	SUCCESS	2026-10-17 12:57:22.550631	\N	2026-10-17 12:57:22.504766	2026-10-17 12:57:22.550631	0	\N
1b3aff91-40ac-4548-bbb7-e68d40f13824	103c3892-009a-46e4-bd0d-79b0f13def77	04c81647-f3fd-4580-a7b1-997e76597622	products	SUCCESS	2026-10-17 12:57:23.307	pulled 7 rows	2026-10-17 12:57:23.307675	2026-10-17 12:57:23.307675	0	\N
9cc6e965-ad6d-42f7-8496-6b04e528184a	52323dcd-d56c-490e-a0ce-c3b378ad031e	4ada2108-e459-46c8-a0f5-dae89923cf38	inventories	SUCCESS	2026-10-17 12:57:23.416	pulled 7 rows	2026-10-17 12:57:23.417308	2026-10-17 12:57:23.417308	0	\N
94f3218e-40fc-450b-9ae7-0f1e991df78d	7435e7f6-04ff-4c0c-bc58-18832bf85cfa	41ae692b-33e5-4328-aca7-dc407d3fe89d	product-batches	SUCCESS	2026-10-17 12:57:23.459	pulled 4 rows	2026-10-17 12:57:23.460244	2026-10-17 12:57:23.460244	0	\N
fd9930fa-2f48-4cce-80a2-6eee2882eb8c	778eed70-3010-465f-91bc-376631cbe249	0883eeb8-9acf-4579-8f81-2881da2608e3	customers	SUCCESS	2026-10-17 12:57:23.618	pulled 0 rows	2026-10-17 12:57:23.619005	2026-10-17 12:57:23.619005	0	\N
d14f7a80-1137-4dd4-8128-cceb1074a191	1beb36d1-d773-4d1c-b641-8e6acebcc423	18da74bb-0a23-4f7f-a092-947f8dc5c1a2	inventory-transfers	SUCCESS	2026-10-17 12:57:23.805	pulled 0 rows	2026-10-17 12:57:23.806088	2026-10-17 12:57:23.806088	0	\N
a63e929e-b279-4d14-8baa-ca86ec72f125	fdbbbc8a-e4a4-4199-8814-6308ae1e8b7d	a173d938-6ba0-49aa-8ba0-cebb0d1cce41	expenses	SUCCESS	2026-10-17 12:57:23.804	pulled 0 rows	2026-10-17 12:57:23.804849	2026-10-17 12:57:23.804849	0	\N
2cd9ac9a-ca65-4c10-a200-2639ab8c3eaa	dafced32-5c87-4a70-8822-eb06849001fd	6c09b47c-a5ce-430e-a070-ed3a2a26f5bd	products	SUCCESS	2026-10-17 12:57:23.908	pulled 7 rows	2026-10-17 12:57:23.909019	2026-10-17 12:57:23.909019	0	\N
74e925b8-ffa0-47bb-823a-a0fc87d11b82	38490f31-2599-48fb-8e96-eaee465353e3	7652513c-6adb-4562-b46f-808a455653ae	inventories	SUCCESS	2026-10-17 12:57:23.96	pulled 7 rows	2026-10-17 12:57:23.961283	2026-10-17 12:57:23.961283	0	\N
233bfbf3-9020-4369-93ab-bf98d805f56a	00681311-475c-4032-b9a7-fc909daeb3f3	62992df3-3a03-4c4f-a83c-ee739474786f	units-of-measure	SUCCESS	2026-10-17 12:57:24.219	pulled 0 rows	2026-10-17 12:57:24.223947	2026-10-17 12:57:24.223947	0	\N
24a5038c-3d00-4d0f-b33f-69699cdd511c	c59ab96f-f4f1-4a40-8b73-d99060f05b62	50f02f19-6753-4263-b82c-a5500366df03	categories	SUCCESS	2026-10-17 12:57:24.253	pulled 0 rows	2026-10-17 12:57:24.257681	2026-10-17 12:57:24.257681	0	\N
23867af5-9f02-468a-83dd-e59372e5e44d	914a02fa-883c-46a8-be56-543e4dbdba66	2fdc3499-d0b2-4856-ada0-a2105f5b13d4	product-batches	SUCCESS	2026-10-17 12:57:24.265	pulled 4 rows	2026-10-17 12:57:24.266652	2026-10-17 12:57:24.266652	0	\N
47f5bc33-cbc2-47cb-80d8-76e284e41c34	a1f4be56-3c2d-4f8b-a680-b6aa200bc590	3d2b6735-e1b1-434f-9559-641b80e25fde	suppliers	SUCCESS	2026-10-17 12:57:24.273	pulled 0 rows	2026-10-17 12:57:24.276298	2026-10-17 12:57:24.276298	0	\N
0618b51e-6424-4180-8261-5808a1a10537	220d3e81-b303-4f33-a147-bc69f8995db4	2866515e-92c2-4bc5-bb31-2c2550061e15	purchases	SUCCESS	2026-10-17 12:57:24.321	pulled 0 rows	2026-10-17 12:57:24.321625	2026-10-17 12:57:24.321625	0	\N
6a86b4da-153f-41cf-97d1-f064060082f2	345b0aa3-0ef0-4e45-97b5-a63f4560e093	2635ea7f-f344-4ded-8416-a9ba8425026e	sales	SUCCESS	2026-10-17 12:57:24.316	pulled 0 rows	2026-10-17 12:57:24.329531	2026-10-17 12:57:24.329531	0	\N
dde1d72b-58b0-43bc-9416-bc5aaf9b04f2	5b9684e7-e07b-45d1-88ca-dd3676573338	8aab61d6-3a16-4627-9a56-606aba5734f4	users	SUCCESS	2026-10-17 12:57:24.354	pulled 0 rows	2026-10-17 12:57:24.354706	2026-10-17 12:57:24.354706	0	\N
909c48f5-1f31-477b-a616-c6e58187aeb2	ed3520e4-c4ae-4600-96e5-103196bafb91	ed628469-89a7-4e2c-99b4-e1b8d2322bcd	branches	SUCCESS	2026-10-17 12:57:24.386	pulled 0 rows	2026-10-17 12:57:24.386626	2026-10-17 12:57:24.386626	0	\N
fba4617e-fc4d-42da-9035-a95bfe813c86	99192e5a-20b0-4c93-876f-7e993d202510	0224272d-3498-4471-adff-6d4380dea5d4	roles	SUCCESS	2026-10-17 12:57:24.4	pulled 0 rows	2026-10-17 12:57:24.401106	2026-10-17 12:57:24.401106	0	\N
5dc2a757-0fb2-4289-9ed7-9d65dc9545cb	b4356076-8872-4466-b249-38f36b23b579	5fe5c8a8-c2d6-4a8a-b0b1-3754017d60a2	notifications	SUCCESS	2026-10-17 12:57:24.457	pulled 0 rows	2026-10-17 12:57:24.457422	2026-10-17 12:57:24.457422	0	\N
745f43f3-b0f2-4a9f-bb87-c48b59549a9c	b7aad38e-5725-4724-816e-f8340fdc89a7	710a60bb-8d5f-461c-b759-f0755222d1c3	customers	SUCCESS	2026-10-17 12:57:24.456	pulled 0 rows	2026-10-17 12:57:24.460473	2026-10-17 12:57:24.460473	0	\N
8dcd18a7-41b4-43b6-bba6-e05f142e4b45	18afa38e-ac4d-40d3-85d7-5d04daea9337	8df37d6a-2625-4655-9945-8f56fa6ef566	expenses	SUCCESS	2026-10-17 12:57:24.546	pulled 0 rows	2026-10-17 12:57:24.546673	2026-10-17 12:57:24.546673	0	\N
50e4740c-4acd-48df-99c0-db8cc847444b	aa77723f-97f7-45ae-b59f-8542710ac5a6	2647a13f-298d-4c63-b3ef-0de38d94e5d8	categories	SUCCESS	2026-10-17 12:57:24.623	pulled 0 rows	2026-10-17 12:57:24.623489	2026-10-17 12:57:24.623489	0	\N
d1451346-2c2e-4235-b699-a403ad57cc24	1270f1f4-4200-4f8f-b9ec-0b9f5598bbcc	ac4a1023-978d-454b-8e60-2ccf766a43fb	inventory-transfers	SUCCESS	2026-10-17 12:57:24.632	pulled 0 rows	2026-10-17 12:57:24.633091	2026-10-17 12:57:24.633091	0	\N
5253bfdf-b478-45cf-9b57-ce549ad18c40	cc68b230-110e-4ed1-abed-79aee2750b42	0a2a31b2-daf2-484c-942a-0666b30a118f	purchases	SUCCESS	2026-10-17 12:57:24.66	pulled 0 rows	2026-10-17 12:57:24.661284	2026-10-17 12:57:24.661284	0	\N
2e90dd3f-cad8-4cfa-b84d-585f4b3f7c5e	4ee93a20-6161-487f-a3d3-67af0909efcc	7e622a89-5f4b-4b63-ad1f-da597e90645e	suppliers	SUCCESS	2026-10-17 12:57:24.664	pulled 0 rows	2026-10-17 12:57:24.665204	2026-10-17 12:57:24.665204	0	\N
95521203-c75b-49dc-a4fd-19ce3bb49e41	4742f275-a964-4f93-a3e6-8449fee03def	bacf267d-b48a-4f71-837c-a1bb60313ecf	users	SUCCESS	2026-10-17 12:57:24.721	pulled 0 rows	2026-10-17 12:57:24.722004	2026-10-17 12:57:24.722004	0	\N
1b751447-5189-4a0c-be6b-9f737052a12b	831400d9-7c32-410a-80a2-8697dd2ee5f3	b57b346e-176f-4ceb-8e3e-928da0a06352	units-of-measure	SUCCESS	2026-10-17 12:57:24.731	pulled 0 rows	2026-10-17 12:57:24.732277	2026-10-17 12:57:24.732277	0	\N
6825231b-6427-4e8a-a0ff-ce63e31ed36f	57605600-0924-4ace-b65a-46fd2f6c0041	8b37e77e-e27e-400c-bfc2-d194339fd13c	notifications	SUCCESS	2026-10-17 12:57:24.765	pulled 0 rows	2026-10-17 12:57:24.765412	2026-10-17 12:57:24.765412	0	\N
5fb668b1-a88a-40c4-81f5-6eb3fea05845	80cfd022-41ad-4186-b28f-b15fe2c4575c	acf13339-92a8-4edd-9935-e797abc898ab	sales	SUCCESS	2026-10-17 12:57:24.805	pulled 0 rows	2026-10-17 12:57:24.805955	2026-10-17 12:57:24.805955	0	\N
084d4051-3289-4d75-9802-f792d25ae9e9	4e0cc694-eba1-4a3d-a7cb-57a4c0454668	3f3621eb-5b9e-463a-b049-75fc3a937b58	roles	SUCCESS	2026-10-17 12:57:24.73	pulled 0 rows	2026-10-17 12:57:24.731054	2026-10-17 12:57:24.731054	0	\N
317e26c6-cd20-43f8-a68e-390c97f6af20	bb671e2d-db4d-4d17-9518-f02eb7b717f0	6ea99913-88d0-494b-8050-5dbefbff8d13	branches	SUCCESS	2026-10-17 12:57:24.804	pulled 0 rows	2026-10-17 12:57:24.804871	2026-10-17 12:57:24.804871	0	\N
5712d6d5-c125-4901-8149-a83c34fd0544	0b29c301-4b02-461a-b087-dcef93340706	409fb0b6-4762-40ee-aff5-b9c6278ebf46	product-batches	SUCCESS	2026-10-17 12:57:43.71	pulled 4 rows	2026-10-17 12:57:43.711556	2026-10-17 12:57:43.711556	0	\N
6af3ebd5-768f-4964-933b-adae2bfe6bee	8a3a95a7-25e6-426e-9e16-2a9472385c6b	c7eb2f49-70a2-4d74-861a-da67746e1461	products	SUCCESS	2026-10-17 12:57:43.714	pulled 7 rows	2026-10-17 12:57:43.715116	2026-10-17 12:57:43.715116	0	\N
b09666e8-9af5-4773-870d-f66b3b93f680	a0f8e360-3030-40ee-9993-71c2830da763	bc6cb51b-df86-4d82-94ad-30b8d56bac28	inventories	SUCCESS	2026-10-17 12:57:43.713	pulled 7 rows	2026-10-17 12:57:43.714216	2026-10-17 12:57:43.714216	0	\N
44d57bb3-977b-4621-a5a5-a1168226ff82	2397f9ee-241f-4538-818e-ddfe8abc139e	c8c22217-87f6-4344-9bbc-7e00c363bbcd	categories	SUCCESS	2026-10-17 12:57:44.027	pulled 0 rows	2026-10-17 12:57:44.027601	2026-10-17 12:57:44.027601	0	\N
6d787ee8-546c-4310-b1f7-609fa442889c	c8d63335-1d0c-422c-8b27-a8193a919791	7839d7bf-59f1-4455-beb9-5f68e0a16969	expenses	SUCCESS	2026-10-17 12:57:44.032	pulled 0 rows	2026-10-17 12:57:44.036055	2026-10-17 12:57:44.036055	0	\N
e92df7bf-bfa1-4465-9f71-a8adddd9489b	f8666121-cf61-4db6-9bca-f084fb4943da	8f55de9d-11a3-4456-b9d3-4ba08cc92c72	inventory-transfers	SUCCESS	2026-10-17 12:57:44.044	pulled 0 rows	2026-10-17 12:57:44.04532	2026-10-17 12:57:44.04532	0	\N
94b78552-4858-4f7c-a0e3-f8e2e730e444	4bf6444f-e858-4674-a1c4-71f6fb814543	a0082a67-d044-49b9-83f9-1202954863e8	customers	SUCCESS	2026-10-17 12:57:44.046	pulled 0 rows	2026-10-17 12:57:44.047811	2026-10-17 12:57:44.047811	0	\N
bcc49d86-b711-4cce-8f4d-1f42561b67a7	716bd930-9915-4d56-898d-b1b42e6b4ce8	ad1fb3cf-dd49-4fc7-b6e5-0b5c527a3811	units-of-measure	SUCCESS	2026-10-17 12:57:44.091	pulled 0 rows	2026-10-17 12:57:44.091835	2026-10-17 12:57:44.091835	0	\N
d4a6895f-0497-4311-a4df-dd50b025ef3b	1a3d42b9-f035-4222-9e1a-6e73ff54c8c7	6016adce-45a9-428e-96af-207d2e48bc8a	suppliers	SUCCESS	2026-10-17 12:57:44.106	pulled 0 rows	2026-10-17 12:57:44.106583	2026-10-17 12:57:44.106583	0	\N
8fca231a-4895-4a30-a819-cecbb4f2fa37	942aa8d4-4b38-4277-a4de-bc706be98ea7	148c03c8-8caa-402f-a4ad-7d6d7b13d8fd	purchases	SUCCESS	2026-10-17 12:57:44.122	pulled 0 rows	2026-10-17 12:57:44.122941	2026-10-17 12:57:44.122941	0	\N
c2bed9fa-2a5e-4c66-a88f-a91f26a0bdce	b7cd6e24-705c-4785-b8f0-5e0f154a7bd4	706f4cc9-56d1-48db-9ee9-112dcaed13cc	users	SUCCESS	2026-10-17 12:57:44.123	pulled 0 rows	2026-10-17 12:57:44.123559	2026-10-17 12:57:44.123559	0	\N
ed23b5d2-0650-4978-a3b7-b11a16c06f5b	f6c00e0a-d0bc-4659-91a9-d28738a7b45c	b26e9f36-0351-4962-9473-f4f4e6567f63	branches	SUCCESS	2026-10-17 12:57:44.138	pulled 0 rows	2026-10-17 12:57:44.138809	2026-10-17 12:57:44.138809	0	\N
7c23c30f-33c9-4b1b-b24c-cb0d4232f56c	bea1bd25-f1c7-482d-a890-250c59d6551b	31d3a177-4aba-40b7-b89e-e3e0a9ee4075	roles	SUCCESS	2026-10-17 12:57:44.158	pulled 0 rows	2026-10-17 12:57:44.159577	2026-10-17 12:57:44.159577	0	\N
a2ffe5a3-c245-4173-8bef-5a69f8672575	88fec054-4bd4-4ab0-a945-ef1583fe072f	e131f091-8b64-4ffa-bd4c-9bfca9b15831	sales	SUCCESS	2026-10-17 12:57:44.169	pulled 0 rows	2026-10-17 12:57:44.174582	2026-10-17 12:57:44.174582	0	\N
22a2954b-876f-4341-9f12-43101d615e9f	b6ec200b-7430-403b-bf07-f8d9a3f6317d	7749742e-df4c-43fd-8b9b-286b075791da	notifications	SUCCESS	2026-10-17 12:57:44.197	pulled 0 rows	2026-10-17 12:57:44.197878	2026-10-17 12:57:44.197878	0	\N
b1fc58df-e86b-428c-af43-173ac9589d61	c3bbfa5c-798c-4f7c-873f-0f7394d7e38d	a3bc70b9-9298-4a32-a11b-d389b1b87b5c	products	SUCCESS	2026-10-17 12:57:51.524	pulled 7 rows	2026-10-17 12:57:51.525197	2026-10-17 12:57:51.525197	0	\N
c37ab59a-e95b-497e-b882-6b9bdabc0111	7453314e-2136-44ef-b6bc-6108be5f707b	764ceded-f826-4e36-8f0e-e5dd41a338fe	inventories	SUCCESS	2026-10-17 12:57:51.545	pulled 7 rows	2026-10-17 12:57:51.545477	2026-10-17 12:57:51.545477	0	\N
92598fc8-7d47-4c20-b1f8-e815902e0adb	5f00caab-f5aa-464d-a55c-5207e942416a	c03f1e20-f1cc-4d11-8941-a7c2d41b2b95	product-batches	SUCCESS	2026-10-17 12:57:51.571	pulled 4 rows	2026-10-17 12:57:51.571987	2026-10-17 12:57:51.571987	0	\N
11d638b8-1e6b-48bb-b4f0-39ac7edb45f4	54ad7bff-3a9b-4f93-8d88-58e81049a2c1	d5339887-3d7a-469f-94de-9067970c29a8	customers	SUCCESS	2026-10-17 12:57:51.662	pulled 0 rows	2026-10-17 12:57:51.662335	2026-10-17 12:57:51.662335	0	\N
40f79902-17ad-4dc5-ba8d-b39574dd6c15	61e4a3d9-55c2-4aa5-9fcc-9e64c0003c47	87f2dd1a-416e-419d-8415-2155eba63401	expenses	SUCCESS	2026-10-17 12:57:51.825	pulled 0 rows	2026-10-17 12:57:51.825868	2026-10-17 12:57:51.825868	0	\N
40efaac5-9c3c-40f6-b964-172fecabb196	8a01156d-7cf1-4d5a-8681-ed0430cbada7	0b84f4c7-59a3-4073-8bb2-088cbcf2f051	inventory-transfers	SUCCESS	2026-10-17 12:57:51.869	pulled 0 rows	2026-10-17 12:57:51.870195	2026-10-17 12:57:51.870195	0	\N
7c8ba660-9f24-485f-a6e3-28c735f75066	3e118c45-27bb-4fa2-be43-626a32d42942	d9c5dde5-d38b-4402-8faa-b19ab2b306ad	categories	SUCCESS	2026-10-17 12:57:51.937	pulled 0 rows	2026-10-17 12:57:51.937367	2026-10-17 12:57:51.937367	0	\N
c05bb405-101e-42e4-9d4c-c1e81a93a2c1	2dad180e-38bd-4301-9fca-5e9c86adc93e	ebf9b53b-7032-4388-a8c9-708068fb0e31	units-of-measure	SUCCESS	2026-10-17 12:57:51.947	pulled 0 rows	2026-10-17 12:57:51.957934	2026-10-17 12:57:51.957934	0	\N
65c584e5-a54c-4511-9c6a-7d741a66df15	e72c2365-de29-4ec8-9134-925c6a3cc5b4	5a28a843-2986-46ae-af85-ba897cbedf80	suppliers	SUCCESS	2026-10-17 12:57:51.952	pulled 0 rows	2026-10-17 12:57:51.95915	2026-10-17 12:57:51.95915	0	\N
5b5d24b4-b57f-4be4-824f-51eecf820e74	e3920675-6a31-41c4-935a-09b36ef71cfb	adaa4507-c004-4bba-8548-c3344062e202	purchases	SUCCESS	2026-10-17 12:57:51.975	pulled 0 rows	2026-10-17 12:57:51.976465	2026-10-17 12:57:51.976465	0	\N
8bb81386-d147-4fad-bb4a-f1a79935b310	0628eec1-b09b-465d-9744-47d6009f30ab	e439b188-ec23-4c0b-8023-8d1c282bfe87	branches	SUCCESS	2026-10-17 12:57:51.978	pulled 0 rows	2026-10-17 12:57:51.979085	2026-10-17 12:57:51.979085	0	\N
01ce903c-cfb5-4b53-aecb-0d8095422459	aa77fb83-9e57-4794-bf88-c48c073aa77a	ec29158d-1efe-43f5-9081-640fa6952995	sales	SUCCESS	2026-10-17 12:57:52.022	pulled 0 rows	2026-10-17 12:57:52.022468	2026-10-17 12:57:52.022468	0	\N
03d04fd9-084b-4543-adb8-d9bd195ea083	1d3f6930-db80-4cf0-a1a9-91bacb9ad585	db7a33b5-b12e-4376-8340-944c3febeb2e	users	SUCCESS	2026-10-17 12:57:52.03	pulled 0 rows	2026-10-17 12:57:52.030577	2026-10-17 12:57:52.030577	0	\N
7c0a782c-a919-455d-b555-07129ed0d29e	bb07e04c-67d8-4727-b8f4-a72e97752653	b439c49a-7142-4bd7-bf44-39daff7836e4	notifications	SUCCESS	2026-10-17 12:57:52.045	pulled 0 rows	2026-10-17 12:57:52.048431	2026-10-17 12:57:52.048431	0	\N
480f0d0d-90b5-4d48-b7e0-93c9f327ad50	e24c1ecf-927b-4cee-8c44-8a78c56927a5	c87c394d-7665-4569-af4b-135ba0d6862c	roles	SUCCESS	2026-10-17 12:57:52.076	pulled 0 rows	2026-10-17 12:57:52.076605	2026-10-17 12:57:52.076605	0	\N
4389f15e-3f1c-4143-b1a1-a2dea5550f00	8e09e62e-96b8-422a-83b6-b1ea980f05ff	3adb8ef3-417c-4ad1-a6f5-5e57238f0fde	products	SUCCESS	2026-10-17 12:58:31.647	pulled 7 rows	2026-10-17 12:58:31.650467	2026-10-17 12:58:31.650467	0	\N
370489bb-dfc8-4cfb-933b-2cc31897873a	55c78ab3-0705-4ec3-9af8-a74ac601768e	97b8e4b5-6a3d-4e84-9b8f-41773b559ffe	inventories	SUCCESS	2026-10-17 12:58:31.687	pulled 7 rows	2026-10-17 12:58:31.688366	2026-10-17 12:58:31.688366	0	\N
034c1515-6c9c-4004-b3bb-aee5307c2f16	b4e6b082-b7bb-4ade-8306-2b8c1ded33af	5aa256a9-bcc1-437e-9caf-4b64d0d84bad	product-batches	SUCCESS	2026-10-17 12:58:31.742	pulled 4 rows	2026-10-17 12:58:31.742442	2026-10-17 12:58:31.742442	0	\N
0e471d21-54c0-4325-b9b0-c98cdeac68e3	78d507c2-3582-4a7d-b5bd-cd665bd29350	31c424f2-6492-4606-952f-0b67e2b4d5e7	customers	SUCCESS	2026-10-17 12:58:31.808	pulled 0 rows	2026-10-17 12:58:31.808471	2026-10-17 12:58:31.808471	0	\N
bb07936c-20f5-4f1b-94a6-8473d7e3cc26	c02eae34-0762-4278-9dab-c9b93c77af30	c531bd11-a5d8-42a4-9aec-a56e7c26e07d	expenses	SUCCESS	2026-10-17 12:58:32	pulled 0 rows	2026-10-17 12:58:32.000761	2026-10-17 12:58:32.000761	0	\N
c1ea14af-937d-428e-afe1-7ccb78ba42f6	cf1905f8-7164-4628-890a-15abbb6c0a26	8a6c3123-829d-442e-8233-5207d2dd6861	inventory-transfers	SUCCESS	2026-10-17 12:58:32.006	pulled 0 rows	2026-10-17 12:58:32.006587	2026-10-17 12:58:32.006587	0	\N
6daf1dd0-ca51-4ca6-9753-e3c4e93b8e1d	3837e91a-d4cf-40c0-a7eb-34675021a50d	bfca06e0-db49-49dc-aadf-c7b2da807516	categories	SUCCESS	2026-10-17 12:58:32.082	pulled 0 rows	2026-10-17 12:58:32.082778	2026-10-17 12:58:32.082778	0	\N
1a335223-0396-46c9-9509-efedfff96cc8	51ea7090-06b1-4603-8812-1c60e031ab70	5d1e53e7-7f2a-4867-9586-abf2e6520532	suppliers	SUCCESS	2026-10-17 12:58:32.085	pulled 0 rows	2026-10-17 12:58:32.085833	2026-10-17 12:58:32.085833	0	\N
a5af1f6a-4ef3-4cb8-b940-2c4c701cc7c9	30e60d25-c327-4921-a725-80c656a8cc7d	1908b1fc-29e5-49bb-a140-129fd9dfa472	branches	SUCCESS	2026-10-17 12:58:32.099	pulled 0 rows	2026-10-17 12:58:32.099905	2026-10-17 12:58:32.099905	0	\N
1435e79c-e7d1-4943-bed1-cec10f10fde6	e3b6ac8e-56a7-4d1f-ad2a-1e980cd1fd88	d87b3d6a-ca4e-48f8-ad97-6c8f452697c5	units-of-measure	SUCCESS	2026-10-17 12:58:32.106	pulled 0 rows	2026-10-17 12:58:32.106409	2026-10-17 12:58:32.106409	0	\N
93e764b2-4e62-4168-a7d4-fba6db442364	01b9c88c-960b-4b1c-8974-5b521613f3e8	21294d30-2aae-4703-bb8a-ae7b54a3f899	purchases	SUCCESS	2026-10-17 12:58:32.243	pulled 0 rows	2026-10-17 12:58:32.24382	2026-10-17 12:58:32.24382	0	\N
bd002882-23fc-4ed3-ad55-357938adabb8	55d07453-aa6e-4246-aa11-f715fa48b6ed	67eb0bdc-4675-44a3-9035-b243c5cf6466	users	SUCCESS	2026-10-17 12:58:32.263	pulled 0 rows	2026-10-17 12:58:32.264258	2026-10-17 12:58:32.264258	0	\N
f89302af-91b9-4953-ac35-50df486fc925	c4de12d2-c6d5-4f95-a687-e09e0818fa82	89a7650a-5993-42a8-a771-8a5b7e5ac608	sales	SUCCESS	2026-10-17 12:58:32.253	pulled 0 rows	2026-10-17 12:58:32.256332	2026-10-17 12:58:32.256332	0	\N
d26d4057-0587-4298-b7ba-c345beef86a7	73e9c159-a1e3-4037-834f-70dadb9fb861	cb3d1bb7-dac8-4b87-9526-9e56455ecb95	roles	SUCCESS	2026-10-17 12:58:32.263	pulled 0 rows	2026-10-17 12:58:32.263575	2026-10-17 12:58:32.263575	0	\N
4e563880-de09-4038-a7a3-512db386bb1b	efa25451-e23b-4935-b885-feb728043808	172bbd3f-f885-4713-961d-9176b1619d29	notifications	SUCCESS	2026-10-17 12:58:32.266	pulled 0 rows	2026-10-17 12:58:32.267008	2026-10-17 12:58:32.267008	0	\N
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (setting_id, setting_key, setting_value, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: units_of_measure; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.units_of_measure (uom_id, uom_name, description, created_at, updated_at, symbol, conversion_factor, is_active) FROM stdin;
dd1cd0e9-2fbf-4418-987b-99a9b97017e8	Kilogram	\N	2026-10-14 17:43:10.943196	2026-10-14 17:43:10.943196	kg	1.0000	t
\.


--
-- Data for Name: user_branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_branches (user_id, branch_id, created_at, updated_at) FROM stdin;
2d513fdd-6742-4d0f-bdaa-35f33753956f	134daca6-ec0c-40bb-b6e2-9bae4bf67443	2026-10-14 17:15:22.651077	2026-10-14 17:15:22.651077
2d513fdd-6742-4d0f-bdaa-35f33753956f	77ee81be-60d4-4465-ad02-e3bc04db998a	2026-10-17 06:11:18.507896	2026-10-17 06:11:18.507896
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_sessions (session_id, user_id, token_identifier, issued_at, expires_at, last_activity_at, revoked, created_at, updated_at) FROM stdin;
c972f5e4-6e75-4c69-b00f-5171a3b6ab8e	2d513fdd-6742-4d0f-bdaa-35f33753956f	aeb0defb-120e-41d2-9139-a687a5210f20	2026-10-16 05:09:13.830668	2026-11-15 05:09:13.83	2026-10-16 05:09:13.830668	f	2026-10-16 05:09:13.830668	2026-10-16 05:09:13.830668
ed468320-802c-40f8-b5f6-9905d1f046bb	2d513fdd-6742-4d0f-bdaa-35f33753956f	e1e6a61b-b2c3-459f-8052-400d16a9e949	2026-10-17 12:55:26.573014	2026-11-16 12:55:26.571	2026-10-17 12:55:29.523681	f	2026-10-17 12:55:26.573014	2026-10-17 12:55:26.573014
ea7f8978-dbdb-4400-82db-e422298f0dfb	2d513fdd-6742-4d0f-bdaa-35f33753956f	f6089a63-0c5f-4800-acec-30ac3a5f6fef	2026-10-15 00:07:25.488741	2026-11-14 00:07:25.488	2026-10-15 00:07:26.292575	f	2026-10-15 00:07:25.488741	2026-10-15 00:07:25.488741
2ce6f316-017a-4bc5-a396-9261bb3bb6ee	2d513fdd-6742-4d0f-bdaa-35f33753956f	58e7d84e-c15c-472a-b3cc-204d5735717c	2026-10-15 00:16:04.194203	2026-11-14 00:16:04.192	2026-10-15 00:16:05.1255	f	2026-10-15 00:16:04.194203	2026-10-15 00:16:04.194203
9355c895-a186-4b08-86b8-6564704fab0e	2d513fdd-6742-4d0f-bdaa-35f33753956f	fce8bc76-9c06-433e-912c-3f848be09641	2026-10-15 00:16:36.025915	2026-11-14 00:16:36.024	2026-10-15 00:50:55.198949	f	2026-10-15 00:16:36.025915	2026-10-15 00:16:36.025915
c9d89e5b-acf8-4b40-a666-97e840c0900e	2d513fdd-6742-4d0f-bdaa-35f33753956f	1c6fab7e-5daf-46e7-8dac-cf1f12d9fdb9	2026-10-15 18:22:42.975372	2026-11-14 18:22:42.973	2026-10-15 18:22:43.889419	f	2026-10-15 18:22:42.975372	2026-10-15 18:22:42.975372
3a958ede-4700-47ff-918a-d58f2d2b7dc9	2d513fdd-6742-4d0f-bdaa-35f33753956f	e2d37cdc-0d5c-4e1f-9714-09954b858a8c	2026-10-15 18:23:19.87761	2026-11-14 18:23:19.876	2026-10-15 18:38:26.283368	f	2026-10-15 18:23:19.87761	2026-10-15 18:23:19.87761
8419ed5f-26f5-4cc0-9010-eca74d8aa206	2d513fdd-6742-4d0f-bdaa-35f33753956f	29410de4-5ec1-473f-af0f-fbc72286d669	2026-10-17 02:59:29.224006	2026-11-16 02:59:29.221	2026-10-17 05:03:56.969877	f	2026-10-17 02:59:29.224006	2026-10-17 02:59:29.224006
75ced618-c032-41aa-ab7c-481619eaa523	2d513fdd-6742-4d0f-bdaa-35f33753956f	4c698b48-9fb4-4ceb-9c8f-4e51d59659ec	2026-10-16 05:05:19.219028	2026-11-15 05:05:19.216	2026-10-16 05:05:20.080943	f	2026-10-16 05:05:19.219028	2026-10-16 05:05:19.219028
2f433054-6c27-4709-a79e-379c40dbe5e7	2d513fdd-6742-4d0f-bdaa-35f33753956f	aea6f4e4-3398-4225-8287-d9853ed5aca7	2026-10-16 05:08:43.902126	2026-11-15 05:08:43.897	2026-10-16 05:08:43.902126	f	2026-10-16 05:08:43.902126	2026-10-16 05:08:43.902126
fcd1add2-b321-4180-968a-678a8986ed69	2d513fdd-6742-4d0f-bdaa-35f33753956f	c0dbb229-7bee-47fa-87c1-6e9a65b4d2ac	2026-10-17 05:41:39.193614	2026-11-16 05:41:39.192	2026-10-17 06:11:58.560998	t	2026-10-17 05:41:39.193614	2026-10-17 05:41:39.193614
7d876d91-6785-48e0-9d77-cf6686054f29	2d513fdd-6742-4d0f-bdaa-35f33753956f	9f98d781-a14c-4369-aa00-503a50b1933c	2026-10-17 12:44:29.438325	2026-11-16 12:44:29.436	2026-10-17 12:44:31.451378	f	2026-10-17 12:44:29.438325	2026-10-17 12:44:29.438325
da2d2be3-c2a3-471f-bb76-922f3660930e	2d513fdd-6742-4d0f-bdaa-35f33753956f	ea196090-5d04-4ecf-a953-38925a3e069d	2026-10-17 12:54:53.43583	2026-11-16 12:54:53.434	2026-10-17 12:54:57.645101	f	2026-10-17 12:54:53.43583	2026-10-17 12:54:53.43583
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, branch_id, role_id, full_name, username, email, phone, password_hash, is_active, last_login_at, created_at, updated_at, password_changed_at, last_login_ip, deleted_at, failed_login_attempts, account_locked, locked_until, profile_photo, two_factor_enabled) FROM stdin;
2d513fdd-6742-4d0f-bdaa-35f33753956f	134daca6-ec0c-40bb-b6e2-9bae4bf67443	9a48f15f-1166-4bf0-bc42-4c02de7c94f3	System Administrator	admin	admin@example.com	\N	$2b$10$OzC.3KA6jND1fAl7OyOYQ.juZA/YyzURbhj6gCqsAok6n9zjiqX0W	t	2026-10-17 12:55:26.579095	2026-10-14 17:15:22.507604	2026-10-17 12:55:29.480344	\N	\N	\N	0	f	\N	\N	f
\.


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (activity_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_id);


--
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (backup_id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (branch_id);


--
-- Name: business_settings business_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_settings
    ADD CONSTRAINT business_settings_pkey PRIMARY KEY (setting_id);


--
-- Name: categories categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_category_name_key UNIQUE (category_name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);


--
-- Name: customer_payments customer_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_payments
    ADD CONSTRAINT customer_payments_pkey PRIMARY KEY (payment_id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- Name: expense_categories expense_categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_category_name_key UNIQUE (category_name);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (category_id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (expense_id);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: inventory_transfers inventory_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_pkey PRIMARY KEY (transfer_id);


--
-- Name: inventory_transfers inventory_transfers_transfer_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_transfer_number_key UNIQUE (transfer_number);


--
-- Name: login_history login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (login_id);


--
-- Name: message_queue message_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_queue
    ADD CONSTRAINT message_queue_pkey PRIMARY KEY (id);


--
-- Name: notification_recipients notification_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_pkey PRIMARY KEY (notification_recipient_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: permissions permissions_permission_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_permission_name_key UNIQUE (permission_name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (permission_id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (history_id);


--
-- Name: product_batches product_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_batches
    ADD CONSTRAINT product_batches_pkey PRIMARY KEY (batch_id);


--
-- Name: product_branch_inventory product_branch_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_branch_inventory
    ADD CONSTRAINT product_branch_inventory_pkey PRIMARY KEY (inventory_id);


--
-- Name: product_branch_inventory product_branch_inventory_product_id_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_branch_inventory
    ADD CONSTRAINT product_branch_inventory_product_id_branch_id_key UNIQUE (product_id, branch_id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (image_id);


--
-- Name: products products_barcode_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_barcode_key UNIQUE (barcode);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (po_item_id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (po_id);


--
-- Name: purchase_orders purchase_orders_po_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (receipt_id);


--
-- Name: receipts receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_receipt_number_key UNIQUE (receipt_number);


--
-- Name: receipts receipts_sale_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_sale_id_key UNIQUE (sale_id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (refresh_token_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: sale_item_batches sale_item_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_item_batches
    ADD CONSTRAINT sale_item_batches_pkey PRIMARY KEY (sale_item_id, batch_id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (sale_item_id);


--
-- Name: sales sales_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_invoice_number_key UNIQUE (invoice_number);


--
-- Name: sales sales_local_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_local_transaction_id_key UNIQUE (local_transaction_id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (sale_id);


--
-- Name: stock_adjustment_items stock_adjustment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_pkey PRIMARY KEY (item_id);


--
-- Name: stock_adjustments stock_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_pkey PRIMARY KEY (adjustment_id);


--
-- Name: stock_count_items stock_count_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_count_items
    ADD CONSTRAINT stock_count_items_pkey PRIMARY KEY (id);


--
-- Name: stock_counts stock_counts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_pkey PRIMARY KEY (count_id);


--
-- Name: supplier_payments supplier_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_pkey PRIMARY KEY (payment_id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_id);


--
-- Name: sync_logs sync_logs_device_id_local_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_device_id_local_transaction_id_key UNIQUE (device_id, local_transaction_id);


--
-- Name: sync_logs sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_pkey PRIMARY KEY (sync_id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (setting_id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: units_of_measure units_of_measure_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units_of_measure
    ADD CONSTRAINT units_of_measure_pkey PRIMARY KEY (uom_id);


--
-- Name: units_of_measure units_of_measure_uom_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units_of_measure
    ADD CONSTRAINT units_of_measure_uom_name_key UNIQUE (uom_name);


--
-- Name: notification_recipients uq_notification_user; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT uq_notification_user UNIQUE (notification_id, user_id);


--
-- Name: user_branches user_branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT user_branches_pkey PRIMARY KEY (user_id, branch_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_inv_txn_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_txn_created_at ON public.inventory_transactions USING btree (created_at);


--
-- Name: idx_inv_txn_product_branch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_txn_product_branch ON public.inventory_transactions USING btree (product_id, branch_id);


--
-- Name: idx_inventory_branch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_branch ON public.product_branch_inventory USING btree (branch_id);


--
-- Name: idx_inventory_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_product ON public.product_branch_inventory USING btree (product_id);


--
-- Name: idx_login_history_ip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_ip ON public.login_history USING btree (ip_address);


--
-- Name: idx_login_history_login_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_login_time ON public.login_history USING btree (login_time DESC);


--
-- Name: idx_login_history_successful; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_successful ON public.login_history USING btree (successful);


--
-- Name: idx_login_history_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_user ON public.login_history USING btree (user_id);


--
-- Name: idx_message_queue_status_next_try; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_queue_status_next_try ON public.message_queue USING btree (status, next_try);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id) WHERE (is_read = false);


--
-- Name: idx_po_branch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_po_branch ON public.purchase_orders USING btree (branch_id);


--
-- Name: idx_po_supplier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_po_supplier ON public.purchase_orders USING btree (supplier_id);


--
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_active ON public.products USING btree (is_active);


--
-- Name: idx_products_barcode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_barcode ON public.products USING btree (barcode);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- Name: idx_sale_items_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sale_items_product ON public.sale_items USING btree (product_id);


--
-- Name: idx_sale_items_sale; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sale_items_sale ON public.sale_items USING btree (sale_id);


--
-- Name: idx_sales_branch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_branch ON public.sales USING btree (branch_id);


--
-- Name: idx_sales_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_customer ON public.sales USING btree (customer_id);


--
-- Name: idx_sales_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_date ON public.sales USING btree (sale_date);


--
-- Name: idx_sales_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_type ON public.sales USING btree (sale_type);


--
-- Name: ix_product_batches_expiry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_product_batches_expiry ON public.product_batches USING btree (expiry_date) WHERE ((status)::text = 'ACTIVE'::text);


--
-- Name: ix_product_batches_fefo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_product_batches_fefo ON public.product_batches USING btree (branch_id, product_id, expiry_date, batch_id) WHERE (((status)::text = 'ACTIVE'::text) AND (quantity_on_hand > (0)::numeric));


--
-- Name: roles_role_name_active_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX roles_role_name_active_unique ON public.roles USING btree (role_name) WHERE (deleted_at IS NULL);


--
-- Name: uq_product_batches_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_product_batches_active ON public.product_batches USING btree (product_id, branch_id, COALESCE(batch_number, ''::character varying), COALESCE(expiry_date, '9999-12-31'::date)) WHERE ((status)::text = 'ACTIVE'::text);


--
-- Name: branches trg_branches_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: business_settings trg_business_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_business_settings_updated_at BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: customers trg_customers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: products trg_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: purchase_orders trg_purchase_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: suppliers trg_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: branches branches_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(user_id);


--
-- Name: categories categories_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.categories(category_id);


--
-- Name: customer_payments customer_payments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_payments
    ADD CONSTRAINT customer_payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: customer_payments customer_payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_payments
    ADD CONSTRAINT customer_payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id);


--
-- Name: expenses expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);


--
-- Name: expenses expenses_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(user_id);


--
-- Name: notification_recipients fk_notification; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT fk_notification FOREIGN KEY (notification_id) REFERENCES public.notifications(notification_id) ON DELETE CASCADE;


--
-- Name: notification_recipients fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- Name: inventory_transactions inventory_transactions_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: inventory_transactions inventory_transactions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- Name: inventory_transfers inventory_transfers_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: inventory_transfers inventory_transfers_from_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_from_branch_id_fkey FOREIGN KEY (from_branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- Name: inventory_transfers inventory_transfers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- Name: inventory_transfers inventory_transfers_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(user_id);


--
-- Name: inventory_transfers inventory_transfers_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: inventory_transfers inventory_transfers_to_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_to_branch_id_fkey FOREIGN KEY (to_branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- Name: login_history login_history_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.user_sessions(session_id) ON DELETE SET NULL;


--
-- Name: login_history login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: notifications notifications_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE SET NULL;


--
-- Name: notifications notifications_createdby_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_createdby_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: payments payments_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(user_id);


--
-- Name: payments payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id) ON DELETE CASCADE;


--
-- Name: price_history price_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(user_id);


--
-- Name: price_history price_history_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: product_batches product_batches_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_batches
    ADD CONSTRAINT product_batches_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);


--
-- Name: product_batches product_batches_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_batches
    ADD CONSTRAINT product_batches_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(po_id);


--
-- Name: product_batches product_batches_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_batches
    ADD CONSTRAINT product_batches_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: product_batches product_batches_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_batches
    ADD CONSTRAINT product_batches_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: product_branch_inventory product_branch_inventory_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_branch_inventory
    ADD CONSTRAINT product_branch_inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- Name: product_branch_inventory product_branch_inventory_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_branch_inventory
    ADD CONSTRAINT product_branch_inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;


--
-- Name: products products_base_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_base_uom_id_fkey FOREIGN KEY (base_uom_id) REFERENCES public.units_of_measure(uom_id);


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE SET NULL;


--
-- Name: products products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id) ON DELETE SET NULL;


--
-- Name: products products_wholesale_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_wholesale_uom_id_fkey FOREIGN KEY (wholesale_uom_id) REFERENCES public.units_of_measure(uom_id);


--
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(po_id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- Name: purchase_order_items purchase_order_items_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.units_of_measure(uom_id);


--
-- Name: purchase_orders purchase_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(user_id);


--
-- Name: purchase_orders purchase_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id) ON DELETE RESTRICT;


--
-- Name: receipts receipts_printed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_printed_by_fkey FOREIGN KEY (printed_by) REFERENCES public.users(user_id);


--
-- Name: receipts receipts_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(permission_id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE CASCADE;


--
-- Name: sale_item_batches sale_item_batches_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_item_batches
    ADD CONSTRAINT sale_item_batches_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.product_batches(batch_id);


--
-- Name: sale_items sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.units_of_measure(uom_id);


--
-- Name: sales sales_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- Name: sales sales_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE SET NULL;


--
-- Name: stock_adjustment_items stock_adjustment_items_adjustment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_adjustment_id_fkey FOREIGN KEY (adjustment_id) REFERENCES public.stock_adjustments(adjustment_id) ON DELETE CASCADE;


--
-- Name: stock_adjustment_items stock_adjustment_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: stock_adjustments stock_adjustments_adjusted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES public.users(user_id);


--
-- Name: stock_adjustments stock_adjustments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);


--
-- Name: stock_count_items stock_count_items_count_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_count_items
    ADD CONSTRAINT stock_count_items_count_id_fkey FOREIGN KEY (count_id) REFERENCES public.stock_counts(count_id) ON DELETE CASCADE;


--
-- Name: stock_count_items stock_count_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_count_items
    ADD CONSTRAINT stock_count_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: stock_counts stock_counts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);


--
-- Name: stock_counts stock_counts_counted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES public.users(user_id);


--
-- Name: supplier_payments supplier_payments_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(po_id);


--
-- Name: supplier_payments supplier_payments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: user_branches user_branches_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT user_branches_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE CASCADE;


--
-- Name: user_branches user_branches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT user_branches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: users users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE SET NULL;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict sDuiiIDMwphcXhiegRaEQfFZZCvAb1Uw6NgMb79DmPgyNICqWdRB5XLp8IKg5GP

