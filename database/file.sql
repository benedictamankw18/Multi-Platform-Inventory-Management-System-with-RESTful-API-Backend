--
-- PostgreSQL database dump
--

\restrict 4UU6ZjeDBD3IWkrkDCVG7ERgtvtq1XcVuOzGBkVxaX15bbOdoutEdWsG3xhpotB

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-07-05 04:37:37

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
-- TOC entry 2 (class 3079 OID 24580)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5609 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 298 (class 1255 OID 25274)
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


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 247 (class 1259 OID 25484)
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    activity_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    activity text,
    ip_address inet,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 25216)
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


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 25320)
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


ALTER TABLE public.backups OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 24688)
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


ALTER TABLE public.branches OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 24618)
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
    CONSTRAINT business_settings_business_type_check CHECK (((business_type)::text = ANY ((ARRAY['RETAIL'::character varying, 'WHOLESALE'::character varying, 'BOTH'::character varying])::text[])))
);


ALTER TABLE public.business_settings OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 24762)
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


ALTER TABLE public.categories OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 25530)
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


ALTER TABLE public.customer_payments OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 24967)
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
    CONSTRAINT customers_customer_type_check CHECK (((customer_type)::text = ANY ((ARRAY['WALK_IN'::character varying, 'RETAIL'::character varying, 'WHOLESALE'::character varying])::text[])))
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 25499)
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_categories (
    category_id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_name character varying(100),
    description text
);


ALTER TABLE public.expense_categories OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 25510)
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
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 24886)
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
    CONSTRAINT inventory_transactions_transaction_type_check CHECK (((transaction_type)::text = ANY ((ARRAY['STOCK_IN'::character varying, 'STOCK_OUT'::character varying, 'ADJUSTMENT'::character varying, 'TRANSFER_IN'::character varying, 'TRANSFER_OUT'::character varying, 'SALE'::character varying])::text[])))
);


ALTER TABLE public.inventory_transactions OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 24919)
-- Name: inventory_transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_transfers (
    transfer_id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    from_branch_id uuid NOT NULL,
    to_branch_id uuid NOT NULL,
    quantity numeric(12,2) NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
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
    CONSTRAINT inventory_transfers_check CHECK ((from_branch_id <> to_branch_id)),
    CONSTRAINT inventory_transfers_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'COMPLETED'::character varying])::text[])))
);


ALTER TABLE public.inventory_transfers OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 25788)
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


ALTER TABLE public.login_history OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 25187)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    notification_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    branch_id uuid,
    notification_type character varying(30) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone, 
    title character varying(200),
    priority character varying(20) DEFAULT 'NORMAL'::character varying,
    expires_at timestamp without time zone,
    CONSTRAINT notifications_notification_type_check CHECK (((notification_type)::text = ANY ((ARRAY['LOW_STOCK'::character varying, 'SYNC_FAILURE'::character varying, 'BRANCH_SHORTAGE'::character varying, 'TRANSFER_REQUEST'::character varying, 'OTHER'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 25283)
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


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 25072)
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
    CONSTRAINT payments_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['CASH'::character varying, 'CARD'::character varying, 'MOBILE_MONEY'::character varying, 'BANK_TRANSFER'::character varying, 'CREDIT'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 24651)
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    permission_id uuid DEFAULT gen_random_uuid() NOT NULL,
    permission_name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 25566)
-- Name: price_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_history (
    history_id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    old_price numeric(12,2),
    new_price numeric(12,2),
    changed_by uuid,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.price_history OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 24853)
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
    last_stock_take timestamp without time zone
);


ALTER TABLE public.product_branch_inventory OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 25584)
-- Name: product_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_images (
    image_id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    image_url text NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.product_images OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 24810)
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


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 25153)
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


ALTER TABLE public.purchase_order_items OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 25116)
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
    CONSTRAINT purchase_orders_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'APPROVED'::character varying, 'RECEIVED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 25094)
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


ALTER TABLE public.receipts OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 25770)
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


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 24667)
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 24635)
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


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 25038)
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


ALTER TABLE public.sale_items OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 24987)
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
    CONSTRAINT sales_sale_type_check CHECK (((sale_type)::text = ANY ((ARRAY['RETAIL'::character varying, 'WHOLESALE'::character varying])::text[]))),
    CONSTRAINT sales_status_check CHECK (((status)::text = ANY ((ARRAY['COMPLETED'::character varying, 'PARTIALLY_PAID'::character varying, 'VOID'::character varying, 'REFUNDED'::character varying])::text[])))
);


ALTER TABLE public.sales OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 25658)
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


ALTER TABLE public.stock_adjustment_items OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 25637)
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


ALTER TABLE public.stock_adjustments OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 25620)
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


ALTER TABLE public.stock_count_items OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 25601)
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


ALTER TABLE public.stock_counts OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 25548)
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


ALTER TABLE public.supplier_payments OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 24794)
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


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 25235)
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
    CONSTRAINT sync_logs_sync_status_check CHECK (((sync_status)::text = ANY ((ARRAY['PENDING'::character varying, 'SUCCESS'::character varying, 'FAILED'::character varying, 'DUPLICATE'::character varying])::text[])))
);


ALTER TABLE public.sync_logs OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 25306)
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


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 24778)
-- Name: units_of_measure; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units_of_measure (
    uom_id uuid DEFAULT gen_random_uuid() NOT NULL,
    uom_name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    symbol character varying(20),
    conversion_factor numeric(12,4) DEFAULT 1
);


ALTER TABLE public.units_of_measure OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 25833)
-- Name: user_branches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_branches (
    user_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_branches OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 24737)
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


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 24704)
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


ALTER TABLE public.users OWNER TO postgres;


-- Migration: create message_queue table
CREATE TABLE IF NOT EXISTS message_queue (
  id uuid PRIMARY KEY,
  type text NOT NULL,
  payload jsonb,
  attempts integer DEFAULT 0,
  status text DEFAULT 'PENDING',
  next_try timestamptz NULL,
  last_error text NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_queue_status_next_try ON message_queue(status, next_try);

--
-- TOC entry 5351 (class 2606 OID 25493)
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (activity_id);


--
-- TOC entry 5333 (class 2606 OID 25229)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_id);


--
-- TOC entry 5349 (class 2606 OID 25329)
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (backup_id);


--
-- TOC entry 5255 (class 2606 OID 24703)
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (branch_id);


--
-- TOC entry 5244 (class 2606 OID 24634)
-- Name: business_settings business_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_settings
    ADD CONSTRAINT business_settings_pkey PRIMARY KEY (setting_id);


--
-- TOC entry 5265 (class 2606 OID 24777)
-- Name: categories categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_category_name_key UNIQUE (category_name);


--
-- TOC entry 5267 (class 2606 OID 24775)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);


--
-- TOC entry 5359 (class 2606 OID 25537)
-- Name: customer_payments customer_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_payments
    ADD CONSTRAINT customer_payments_pkey PRIMARY KEY (payment_id);


--
-- TOC entry 5298 (class 2606 OID 24986)
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- TOC entry 5353 (class 2606 OID 25509)
-- Name: expense_categories expense_categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_category_name_key UNIQUE (category_name);


--
-- TOC entry 5355 (class 2606 OID 25507)
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (category_id);


--
-- TOC entry 5357 (class 2606 OID 25519)
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (expense_id);


--
-- TOC entry 5292 (class 2606 OID 24903)
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (transaction_id);


--
-- TOC entry 5294 (class 2606 OID 24941)
-- Name: inventory_transfers inventory_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_pkey PRIMARY KEY (transfer_id);


--
-- TOC entry 5296 (class 2606 OID 25704)
-- Name: inventory_transfers inventory_transfers_transfer_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_transfer_number_key UNIQUE (transfer_number);


--
-- TOC entry 5381 (class 2606 OID 25801)
-- Name: login_history login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (login_id);


--
-- TOC entry 5331 (class 2606 OID 25205)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- TOC entry 5341 (class 2606 OID 25296)
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 5343 (class 2606 OID 25298)
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- TOC entry 5314 (class 2606 OID 25088)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- TOC entry 5249 (class 2606 OID 24666)
-- Name: permissions permissions_permission_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_permission_name_key UNIQUE (permission_name);


--
-- TOC entry 5251 (class 2606 OID 24664)
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 5363 (class 2606 OID 25573)
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (history_id);


--
-- TOC entry 5286 (class 2606 OID 24873)
-- Name: product_branch_inventory product_branch_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_branch_inventory
    ADD CONSTRAINT product_branch_inventory_pkey PRIMARY KEY (inventory_id);


--
-- TOC entry 5288 (class 2606 OID 24875)
-- Name: product_branch_inventory product_branch_inventory_product_id_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_branch_inventory
    ADD CONSTRAINT product_branch_inventory_product_id_branch_id_key UNIQUE (product_id, branch_id);


--
-- TOC entry 5365 (class 2606 OID 25595)
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (image_id);


--
-- TOC entry 5278 (class 2606 OID 24832)
-- Name: products products_barcode_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_barcode_key UNIQUE (barcode);


--
-- TOC entry 5280 (class 2606 OID 24828)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);


--
-- TOC entry 5282 (class 2606 OID 24830)
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- TOC entry 5328 (class 2606 OID 25171)
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (po_item_id);


--
-- TOC entry 5324 (class 2606 OID 25137)
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (po_id);


--
-- TOC entry 5326 (class 2606 OID 25715)
-- Name: purchase_orders purchase_orders_po_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number);


--
-- TOC entry 5316 (class 2606 OID 25106)
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (receipt_id);


--
-- TOC entry 5318 (class 2606 OID 25110)
-- Name: receipts receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_receipt_number_key UNIQUE (receipt_number);


--
-- TOC entry 5320 (class 2606 OID 25108)
-- Name: receipts receipts_sale_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_sale_id_key UNIQUE (sale_id);


--
-- TOC entry 5375 (class 2606 OID 25782)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (refresh_token_id);


--
-- TOC entry 5253 (class 2606 OID 24677)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- TOC entry 5246 (class 2606 OID 24648)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- TOC entry 5312 (class 2606 OID 25056)
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (sale_item_id);


--
-- TOC entry 5304 (class 2606 OID 25725)
-- Name: sales sales_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_invoice_number_key UNIQUE (invoice_number);


--
-- TOC entry 5306 (class 2606 OID 25022)
-- Name: sales sales_local_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_local_transaction_id_key UNIQUE (local_transaction_id);


--
-- TOC entry 5308 (class 2606 OID 25020)
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (sale_id);


--
-- TOC entry 5373 (class 2606 OID 25664)
-- Name: stock_adjustment_items stock_adjustment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_pkey PRIMARY KEY (item_id);


--
-- TOC entry 5371 (class 2606 OID 25647)
-- Name: stock_adjustments stock_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_pkey PRIMARY KEY (adjustment_id);


--
-- TOC entry 5369 (class 2606 OID 25626)
-- Name: stock_count_items stock_count_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_count_items
    ADD CONSTRAINT stock_count_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5367 (class 2606 OID 25609)
-- Name: stock_counts stock_counts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_pkey PRIMARY KEY (count_id);


--
-- TOC entry 5361 (class 2606 OID 25555)
-- Name: supplier_payments supplier_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_pkey PRIMARY KEY (payment_id);


--
-- TOC entry 5273 (class 2606 OID 24809)
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_id);


--
-- TOC entry 5337 (class 2606 OID 25255)
-- Name: sync_logs sync_logs_device_id_local_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_device_id_local_transaction_id_key UNIQUE (device_id, local_transaction_id);


--
-- TOC entry 5339 (class 2606 OID 25253)
-- Name: sync_logs sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_pkey PRIMARY KEY (sync_id);


--
-- TOC entry 5345 (class 2606 OID 25317)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (setting_id);


--
-- TOC entry 5347 (class 2606 OID 25319)
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- TOC entry 5269 (class 2606 OID 24791)
-- Name: units_of_measure units_of_measure_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units_of_measure
    ADD CONSTRAINT units_of_measure_pkey PRIMARY KEY (uom_id);


--
-- TOC entry 5271 (class 2606 OID 24793)
-- Name: units_of_measure units_of_measure_uom_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units_of_measure
    ADD CONSTRAINT units_of_measure_uom_name_key UNIQUE (uom_name);


--
-- TOC entry 5383 (class 2606 OID 25843)
-- Name: user_branches user_branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT user_branches_pkey PRIMARY KEY (user_id, branch_id);


--
-- TOC entry 5263 (class 2606 OID 24756)
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (session_id);


--
-- TOC entry 5257 (class 2606 OID 24726)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5259 (class 2606 OID 24722)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 5261 (class 2606 OID 24724)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 5334 (class 1259 OID 25273)
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at);


--
-- TOC entry 5335 (class 1259 OID 25272)
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- TOC entry 5289 (class 1259 OID 25262)
-- Name: idx_inv_txn_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_txn_created_at ON public.inventory_transactions USING btree (created_at);


--
-- TOC entry 5290 (class 1259 OID 25261)
-- Name: idx_inv_txn_product_branch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_txn_product_branch ON public.inventory_transactions USING btree (product_id, branch_id);


--
-- TOC entry 5283 (class 1259 OID 25259)
-- Name: idx_inventory_branch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_branch ON public.product_branch_inventory USING btree (branch_id);


--
-- TOC entry 5284 (class 1259 OID 25260)
-- Name: idx_inventory_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_product ON public.product_branch_inventory USING btree (product_id);


--
-- TOC entry 5376 (class 1259 OID 25815)
-- Name: idx_login_history_ip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_ip ON public.login_history USING btree (ip_address);


--
-- TOC entry 5377 (class 1259 OID 25813)
-- Name: idx_login_history_login_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_login_time ON public.login_history USING btree (login_time DESC);


--
-- TOC entry 5378 (class 1259 OID 25814)
-- Name: idx_login_history_successful; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_successful ON public.login_history USING btree (successful);


--
-- TOC entry 5379 (class 1259 OID 25812)
-- Name: idx_login_history_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_user ON public.login_history USING btree (user_id);


--
-- TOC entry 5329 (class 1259 OID 25271)
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id) WHERE (is_read = false);


--
-- TOC entry 5321 (class 1259 OID 25270)
-- Name: idx_po_branch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_po_branch ON public.purchase_orders USING btree (branch_id);


--
-- TOC entry 5322 (class 1259 OID 25269)
-- Name: idx_po_supplier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_po_supplier ON public.purchase_orders USING btree (supplier_id);


--
-- TOC entry 5274 (class 1259 OID 25258)
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_active ON public.products USING btree (is_active);


--
-- TOC entry 5275 (class 1259 OID 25256)
-- Name: idx_products_barcode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_barcode ON public.products USING btree (barcode);


--
-- TOC entry 5276 (class 1259 OID 25257)
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- TOC entry 5309 (class 1259 OID 25268)
-- Name: idx_sale_items_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sale_items_product ON public.sale_items USING btree (product_id);


--
-- TOC entry 5310 (class 1259 OID 25267)
-- Name: idx_sale_items_sale; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sale_items_sale ON public.sale_items USING btree (sale_id);


--
-- TOC entry 5299 (class 1259 OID 25263)
-- Name: idx_sales_branch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_branch ON public.sales USING btree (branch_id);


--
-- TOC entry 5300 (class 1259 OID 25265)
-- Name: idx_sales_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_customer ON public.sales USING btree (customer_id);


--
-- TOC entry 5301 (class 1259 OID 25264)
-- Name: idx_sales_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_date ON public.sales USING btree (sale_date);


--
-- TOC entry 5302 (class 1259 OID 25266)
-- Name: idx_sales_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_type ON public.sales USING btree (sale_type);


--
-- TOC entry 5247 (class 1259 OID 25816)
-- Name: roles_role_name_active_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX roles_role_name_active_unique ON public.roles USING btree (role_name) WHERE (deleted_at IS NULL);


--
-- TOC entry 5451 (class 2620 OID 25275)
-- Name: branches trg_branches_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5450 (class 2620 OID 25281)
-- Name: business_settings trg_business_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_business_settings_updated_at BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5455 (class 2620 OID 25279)
-- Name: customers trg_customers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5454 (class 2620 OID 25277)
-- Name: products trg_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5456 (class 2620 OID 25280)
-- Name: purchase_orders trg_purchase_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5453 (class 2620 OID 25278)
-- Name: suppliers trg_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5452 (class 2620 OID 25276)
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5427 (class 2606 OID 25494)
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 5425 (class 2606 OID 25230)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 5386 (class 2606 OID 25678)
-- Name: branches branches_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(user_id);


--
-- TOC entry 5390 (class 2606 OID 25693)
-- Name: categories categories_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.categories(category_id);


--
-- TOC entry 5430 (class 2606 OID 25538)
-- Name: customer_payments customer_payments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_payments
    ADD CONSTRAINT customer_payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- TOC entry 5431 (class 2606 OID 25543)
-- Name: customer_payments customer_payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_payments
    ADD CONSTRAINT customer_payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id);


--
-- TOC entry 5428 (class 2606 OID 25520)
-- Name: expenses expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);


--
-- TOC entry 5429 (class 2606 OID 25525)
-- Name: expenses expenses_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(user_id);


--
-- TOC entry 5397 (class 2606 OID 24909)
-- Name: inventory_transactions inventory_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- TOC entry 5398 (class 2606 OID 24914)
-- Name: inventory_transactions inventory_transactions_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 5399 (class 2606 OID 24904)
-- Name: inventory_transactions inventory_transactions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- TOC entry 5400 (class 2606 OID 24962)
-- Name: inventory_transfers inventory_transfers_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 5401 (class 2606 OID 24947)
-- Name: inventory_transfers inventory_transfers_from_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_from_branch_id_fkey FOREIGN KEY (from_branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- TOC entry 5402 (class 2606 OID 24942)
-- Name: inventory_transfers inventory_transfers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- TOC entry 5403 (class 2606 OID 25705)
-- Name: inventory_transfers inventory_transfers_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(user_id);


--
-- TOC entry 5404 (class 2606 OID 24957)
-- Name: inventory_transfers inventory_transfers_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 5405 (class 2606 OID 24952)
-- Name: inventory_transfers inventory_transfers_to_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_to_branch_id_fkey FOREIGN KEY (to_branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- TOC entry 5446 (class 2606 OID 25807)
-- Name: login_history login_history_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.user_sessions(session_id) ON DELETE SET NULL;


--
-- TOC entry 5447 (class 2606 OID 25802)
-- Name: login_history login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 5423 (class 2606 OID 25211)
-- Name: notifications notifications_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE SET NULL;


--
-- TOC entry 5424 (class 2606 OID 25206)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 5426 (class 2606 OID 25299)
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 5412 (class 2606 OID 25731)
-- Name: payments payments_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(user_id);


--
-- TOC entry 5413 (class 2606 OID 25089)
-- Name: payments payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id) ON DELETE CASCADE;


--
-- TOC entry 5434 (class 2606 OID 25579)
-- Name: price_history price_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(user_id);


--
-- TOC entry 5435 (class 2606 OID 25574)
-- Name: price_history price_history_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- TOC entry 5395 (class 2606 OID 24881)
-- Name: product_branch_inventory product_branch_inventory_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_branch_inventory
    ADD CONSTRAINT product_branch_inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- TOC entry 5396 (class 2606 OID 24876)
-- Name: product_branch_inventory product_branch_inventory_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_branch_inventory
    ADD CONSTRAINT product_branch_inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- TOC entry 5436 (class 2606 OID 25596)
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;


--
-- TOC entry 5391 (class 2606 OID 24843)
-- Name: products products_base_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_base_uom_id_fkey FOREIGN KEY (base_uom_id) REFERENCES public.units_of_measure(uom_id);


--
-- TOC entry 5392 (class 2606 OID 24833)
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE SET NULL;


--
-- TOC entry 5393 (class 2606 OID 24838)
-- Name: products products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id) ON DELETE SET NULL;


--
-- TOC entry 5394 (class 2606 OID 24848)
-- Name: products products_wholesale_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_wholesale_uom_id_fkey FOREIGN KEY (wholesale_uom_id) REFERENCES public.units_of_measure(uom_id);


--
-- TOC entry 5420 (class 2606 OID 25172)
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(po_id) ON DELETE CASCADE;


--
-- TOC entry 5421 (class 2606 OID 25177)
-- Name: purchase_order_items purchase_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- TOC entry 5422 (class 2606 OID 25182)
-- Name: purchase_order_items purchase_order_items_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.units_of_measure(uom_id);


--
-- TOC entry 5416 (class 2606 OID 25716)
-- Name: purchase_orders purchase_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(user_id);


--
-- TOC entry 5417 (class 2606 OID 25143)
-- Name: purchase_orders purchase_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- TOC entry 5418 (class 2606 OID 25148)
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 5419 (class 2606 OID 25138)
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id) ON DELETE RESTRICT;


--
-- TOC entry 5414 (class 2606 OID 25739)
-- Name: receipts receipts_printed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_printed_by_fkey FOREIGN KEY (printed_by) REFERENCES public.users(user_id);


--
-- TOC entry 5415 (class 2606 OID 25111)
-- Name: receipts receipts_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id) ON DELETE CASCADE;


--
-- TOC entry 5445 (class 2606 OID 25783)
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 5384 (class 2606 OID 24683)
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(permission_id) ON DELETE CASCADE;


--
-- TOC entry 5385 (class 2606 OID 24678)
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE CASCADE;


--
-- TOC entry 5409 (class 2606 OID 25062)
-- Name: sale_items sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- TOC entry 5410 (class 2606 OID 25057)
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id) ON DELETE CASCADE;


--
-- TOC entry 5411 (class 2606 OID 25067)
-- Name: sale_items sale_items_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.units_of_measure(uom_id);


--
-- TOC entry 5406 (class 2606 OID 25023)
-- Name: sales sales_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE RESTRICT;


--
-- TOC entry 5407 (class 2606 OID 25033)
-- Name: sales sales_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 5408 (class 2606 OID 25028)
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE SET NULL;


--
-- TOC entry 5443 (class 2606 OID 25665)
-- Name: stock_adjustment_items stock_adjustment_items_adjustment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_adjustment_id_fkey FOREIGN KEY (adjustment_id) REFERENCES public.stock_adjustments(adjustment_id) ON DELETE CASCADE;


--
-- TOC entry 5444 (class 2606 OID 25670)
-- Name: stock_adjustment_items stock_adjustment_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- TOC entry 5441 (class 2606 OID 25653)
-- Name: stock_adjustments stock_adjustments_adjusted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES public.users(user_id);


--
-- TOC entry 5442 (class 2606 OID 25648)
-- Name: stock_adjustments stock_adjustments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);


--
-- TOC entry 5439 (class 2606 OID 25627)
-- Name: stock_count_items stock_count_items_count_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_count_items
    ADD CONSTRAINT stock_count_items_count_id_fkey FOREIGN KEY (count_id) REFERENCES public.stock_counts(count_id) ON DELETE CASCADE;


--
-- TOC entry 5440 (class 2606 OID 25632)
-- Name: stock_count_items stock_count_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_count_items
    ADD CONSTRAINT stock_count_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- TOC entry 5437 (class 2606 OID 25610)
-- Name: stock_counts stock_counts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);


--
-- TOC entry 5438 (class 2606 OID 25615)
-- Name: stock_counts stock_counts_counted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES public.users(user_id);


--
-- TOC entry 5432 (class 2606 OID 25561)
-- Name: supplier_payments supplier_payments_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(po_id);


--
-- TOC entry 5433 (class 2606 OID 25556)
-- Name: supplier_payments supplier_payments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- TOC entry 5448 (class 2606 OID 25844)
-- Name: user_branches user_branches_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT user_branches_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE CASCADE;


--
-- TOC entry 5449 (class 2606 OID 25849)
-- Name: user_branches user_branches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT user_branches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 5389 (class 2606 OID 24757)
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 5387 (class 2606 OID 24727)
-- Name: users users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE SET NULL;


--
-- TOC entry 5388 (class 2606 OID 24732)
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE RESTRICT;


-- Completed on 2026-07-05 04:37:37

--
-- PostgreSQL database dump complete
--

\unrestrict 4UU6ZjeDBD3IWkrkDCVG7ERgtvtq1XcVuOzGBkVxaX15bbOdoutEdWsG3xhpotB

