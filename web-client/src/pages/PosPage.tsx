import { useEffect, useState, useCallback, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import ConfirmModal from '../components/ConfirmModal'
import {
  searchProducts,
  createSale,
  getSaleReceipt,
  getBusinessSettings,
  getCustomers,
  resolveImageUrl,
  type Product,
  type Customer,
  type Sale,
} from '../services/api'

type CartItem = {
  product: Product
  quantity: number
  unit_price: number
  line_discount: number
  tax_amount: number
}

type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CREDIT'

type ReceiptItem = {
  product_name: string
  quantity: number
  unit_price: number
  line_discount: number
  tax_amount: number
  uom_name: string | null
  symbol: string | null
}

type ReceiptData = {
  receipt: { receipt_number: string; printed_at: string }
  sale: Sale & { items: ReceiptItem[]; payments: { payment_method: string; amount: number }[] }
}

type BusinessInfo = {
  business_name?: string
  address?: string
  phone?: string
  tax_number?: string
  registration_number?: string
  receipt_footer?: string
  logo?: string
  currency?: string
}

type PaymentEntry = { method: PaymentMethod; amount: number }

type SavedCart = {
  id: string
  cart: CartItem[]
  customerName: string
  payments: PaymentEntry[]
  note: string
  savedAt: string
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT', label: 'Credit' },
]

function getEffectivePrice(product: Product, quantity: number): number {
  const wholesalePrice = Number(product.wholesale_price) || 0
  const wholesaleMinQty = Number(product.wholesale_min_qty) || 0
  const retailPrice = Number(product.retail_price) || 0
  if (wholesalePrice > 0 && wholesaleMinQty > 0 && quantity >= wholesaleMinQty) {
    return wholesalePrice
  }
  return retailPrice || wholesalePrice
}

function computeLineItem(product: Product, quantity: number, unitPrice: number) {
  const discountPct = Number(product.discount_percentage) || 0
  const taxRate = Number(product.tax_rate) || 0
  const gross = quantity * unitPrice
  const lineDiscount = gross * (discountPct / 100)
  const afterDiscount = gross - lineDiscount
  const taxAmount = afterDiscount * (taxRate / 100)
  return { unit_price: unitPrice, line_discount: lineDiscount, tax_amount: taxAmount }
}

function formatPrice(n: number, currency = 'GHS'): string {
  return `${currency} ${n.toFixed(2)}`
}

export default function PosPage() {
  const { toast } = useToast()
  const { selectedBranch, user } = useAuth()
  const searchRef = useRef<HTMLInputElement>(null)
  const barcodeRef = useRef<SVGSVGElement>(null)

  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>('CASH')
  const [newPaymentAmount, setNewPaymentAmount] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [customerSearching, setCustomerSearching] = useState(false)
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const customerSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const customerInputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [lastSale, setLastSale] = useState<Sale & { items: unknown[]; payments: unknown[] } | null>(null)
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({})
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({})
  const [autoPrinting, setAutoPrinting] = useState(false)
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>(() => {
    try { return JSON.parse(localStorage.getItem('pos_saved_carts') || '[]') } catch { return [] }
  })
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveNote, setSaveNote] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [showSavedCartsModal, setShowSavedCartsModal] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [lastSale])

  useEffect(() => {
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [])

  useEffect(() => {
    return () => { if (customerSearchTimeout.current) clearTimeout(customerSearchTimeout.current) }
  }, [])

  useEffect(() => {
    localStorage.setItem('pos_saved_carts', JSON.stringify(savedCarts))
  }, [savedCarts])

  // Render barcode when receipt data + invoice number are ready
  useEffect(() => {
    if (!receiptData || !barcodeRef.current) return
    const invoiceNum = receiptData.sale?.invoice_number || receiptData.receipt?.receipt_number || ''
    if (!invoiceNum) return
    try {
      JsBarcode(barcodeRef.current, invoiceNum, {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: false,
        margin: 0,
      })
      // Auto-print after barcode renders
      if (!autoPrinting) {
        setAutoPrinting(true)
        setTimeout(() => window.print(), 400)
      }
    } catch { /* invalid value for barcode — skip */ }
  }, [receiptData, autoPrinting])

  // Generate QR code from receipt data
  useEffect(() => {
    if (!receiptData) { setQrDataUrl(null); return }
    const saleData = receiptData.sale
    const receiptNum = receiptData.receipt?.receipt_number || ''
    const invoiceNum = saleData?.invoice_number || ''
    const total = Number(saleData?.total_amount ?? 0)
    const currency = businessInfo.currency || 'GHS'
    const text = `Invoice: ${invoiceNum}\nReceipt: ${receiptNum}\nTotal: ${currency} ${total.toFixed(2)}\nDate: ${saleData?.sale_date || ''}`
    QRCode.toDataURL(text, { width: 200, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null))
  }, [receiptData, businessInfo.currency])

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (!value.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchProducts({ q: value.trim(), limit: 20, isActive: true })
        const products = res?.products ?? []

        const trimmed = value.trim().toLowerCase()
        const exactMatch = products.find(
          (p) => p.barcode && p.barcode.toLowerCase() === trimmed
        )

        if (exactMatch) {
          addToCart(exactMatch)
          setSearchQuery('')
          setSearchResults([])
          setShowDropdown(false)
        } else {
          setSearchResults(products)
          setShowDropdown(products.length > 0)
        }
      } catch {
        setSearchResults([])
        setShowDropdown(false)
      }
      setSearching(false)
    }, 200)
  }, [])

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  function handleCustomerSearch(value: string) {
    setCustomerSearchQuery(value)
    setCustomerDropdownOpen(true)
    if (customerSearchTimeout.current) clearTimeout(customerSearchTimeout.current)

    if (!value.trim()) {
      setCustomerResults([])
      return
    }

    customerSearchTimeout.current = setTimeout(async () => {
      setCustomerSearching(true)
      try {
        const res = await getCustomers({ search: value.trim(), limit: 10, page: 1 })
        const customers = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        setCustomerResults(customers.filter((c: Customer) => c.is_active !== false))
      } catch {
        setCustomerResults([])
      }
      setCustomerSearching(false)
    }, 250)
  }

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer)
    setCustomerName(customer.business_name || customer.contact_name || customer.phone || '')
    setCustomerSearchQuery('')
    setCustomerResults([])
    setCustomerDropdownOpen(false)
    customerInputRef.current?.blur()
  }

  function selectCustomCustomer() {
    const name = customerSearchQuery.trim()
    if (!name) return
    setSelectedCustomer(null)
    setCustomerName(name)
    setCustomerSearchQuery('')
    setCustomerResults([])
    setCustomerDropdownOpen(false)
    customerInputRef.current?.blur()
  }

  function clearCustomer() {
    setSelectedCustomer(null)
    setCustomerName('')
    setCustomerSearchQuery('')
    setCustomerResults([])
    setCustomerDropdownOpen(false)
  }

  function handleCustomerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setCustomerDropdownOpen(false)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (customerResults.length > 0) {
        selectCustomer(customerResults[0])
      } else {
        selectCustomCustomer()
      }
    } else if (e.key === 'Backspace' && !customerSearchQuery && customerName) {
      clearCustomer()
    }
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.product_id === product.product_id)
      if (existing) {
        const newQty = existing.quantity + 1
        const newUnitPrice = getEffectivePrice(product, newQty)
        const line = computeLineItem(product, newQty, newUnitPrice)
        return prev.map((item) =>
          item.product.product_id === product.product_id
            ? { ...item, quantity: newQty, ...line }
            : item
        )
      }
      const unitPrice = getEffectivePrice(product, 1)
      const line = computeLineItem(product, 1, unitPrice)
      return [...prev, { product, quantity: 1, ...line }]
    })
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
    searchRef.current?.focus()
  }

  function updateQuantity(productId: string, qty: number) {
    if (qty <= 0) {
      removeFromCart(productId)
      return
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.product_id !== productId) return item
        const unitPrice = getEffectivePrice(item.product, qty)
        const line = computeLineItem(item.product, qty, unitPrice)
        return { ...item, quantity: qty, ...line }
      })
    )
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.product_id !== productId))
  }

  const saleType = cart.some(
    (item) =>
      Number(item.product.wholesale_price) > 0 &&
      Number(item.product.wholesale_min_qty) > 0 &&
      item.quantity >= Number(item.product.wholesale_min_qty)
  ) ? 'WHOLESALE' : 'RETAIL'

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const totalDiscount = cart.reduce((sum, item) => sum + item.line_discount, 0)
  const totalTax = cart.reduce((sum, item) => sum + item.tax_amount, 0)
  const total = subtotal - totalDiscount + totalTax
  const totalPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = Math.max(total - totalPaidAmount, 0)
  const change = totalPaidAmount > total ? totalPaidAmount - total : 0
  const canComplete = cart.length > 0 && totalPaidAmount >= total && !processing

  function addPayment() {
    const amt = parseFloat(newPaymentAmount) || 0
    if (amt <= 0) return
    setPayments((prev) => [...prev, { method: newPaymentMethod, amount: amt }])
    setNewPaymentAmount('')
  }

  function addPaymentWithMethod(method: PaymentMethod) {
    if (remaining <= 0) return
    setPayments((prev) => [...prev, { method, amount: remaining }])
  }

  function removePayment(index: number) {
    setPayments((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleCompleteSale() {
    if (!selectedBranch) {
      toast('Please select a branch first', 'error')
      return
    }
    if (!canComplete) return

    setProcessing(true)
    try {
      const salePayload = {
        branch_id: selectedBranch.branch_id,
        customer_id: selectedCustomer?.customer_id || undefined,
        customer_name: customerName.trim() || undefined,
        cashier_id: user?.userId || undefined,
        cashier_name: user?.fullName || undefined,
        sale_type: saleType,
        discount_amount: totalDiscount,
        tax_amount: totalTax,
        items: cart.map((item) => ({
          product_id: item.product.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          uom_id: item.quantity >= (Number(item.product.wholesale_min_qty) || Infinity) && item.product.wholesale_uom_id
            ? item.product.wholesale_uom_id
            : item.product.base_uom_id,
          cost_price: item.product.cost_price,
          line_discount: item.line_discount,
          tax_amount: item.tax_amount,
        })),
        payments: payments.map((p) => ({
          amount: p.amount,
          payment_method: p.method,
        })),
      }

      const res = await createSale(salePayload)
      const sale = res?.data ?? res

      setLastSale(sale)
      toast('Sale completed successfully', 'success')

      setCart([])
      setPayments([])
      setNewPaymentAmount('')
      setCustomerName('')
      setSelectedCustomer(null)
      setSearchQuery('')

      // Fetch receipt data + business settings in parallel
      const saleId = sale?.sale_id
      if (saleId) {
        const [receipt, bizSettings] = await Promise.all([
          getSaleReceipt(saleId).catch(() => null),
          getBusinessSettings().catch(() => null),
        ])
        if (receipt) setReceiptData(receipt)
        // Fix: API returns { data: [...] } — extract first row
        const bizRows = bizSettings?.data ?? bizSettings
        const biz = Array.isArray(bizRows) ? bizRows[0] : bizRows
        if (biz) setBusinessInfo(biz)
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Sale failed'
        : 'Sale failed'
      toast(msg, 'error')
    }
    setProcessing(false)
  }

  function startNewSale() {
    setLastSale(null)
    setReceiptData(null)
    setAutoPrinting(false)
    searchRef.current?.focus()
  }

  function openSaveCart() {
    if (cart.length === 0) return
    setSaveNote('')
    setShowSaveModal(true)
  }

  function confirmSaveCart() {
    if (cart.length === 0) return
    const saved: SavedCart = {
      id: String(Date.now()),
      cart: [...cart],
      customerName: customerName || 'Walk-in',
      payments: [...payments],
      note: saveNote.trim(),
      savedAt: new Date().toISOString(),
    }
    setSavedCarts((prev) => [saved, ...prev])
    setCart([])
    setPayments([])
    setNewPaymentAmount('')
    setCustomerName('')
    setSelectedCustomer(null)
    setSearchQuery('')
    setNewPaymentMethod('CASH')
    setQtyDrafts({})
    setShowSaveModal(false)
    searchRef.current?.focus()
    toast('Cart saved to storage', 'success')
  }

  function loadSavedCart(id: string) {
    const saved = savedCarts.find((s) => s.id === id)
    if (!saved) return
    if (cart.length > 0) {
      setConfirmDialog({
        message: 'Current cart has items. Save it first, then load?',
        onConfirm: () => {
          setConfirmDialog(null)
          confirmSaveCart()
          setCart(saved.cart)
          setCustomerName(saved.customerName === 'Walk-in' ? '' : saved.customerName)
          setSelectedCustomer(null)
          setPayments(saved.payments ?? [])
          setNewPaymentAmount('')
          setSavedCarts((prev) => prev.filter((s) => s.id !== id))
          searchRef.current?.focus()
          toast('Saved cart loaded', 'success')
        },
      })
      return
    }
    setCart(saved.cart)
    setCustomerName(saved.customerName === 'Walk-in' ? '' : saved.customerName)
    setSelectedCustomer(null)
    setPayments(saved.payments ?? [])
    setNewPaymentAmount('')
    setSavedCarts((prev) => prev.filter((s) => s.id !== id))
    searchRef.current?.focus()
    toast('Saved cart loaded', 'success')
  }

  function removeSavedCart(id: string) {
    setSavedCarts((prev) => prev.filter((s) => s.id !== id))
  }

  function handlePrint() {
    window.print()
  }

  const receiptItems: ReceiptItem[] = receiptData?.sale?.items ?? []
  const sale = receiptData?.sale ?? lastSale
  const currency = businessInfo.currency || 'GHS'
  const fmt = (n: number) => formatPrice(n, currency)
  const totalPaid = receiptData?.sale?.payments?.reduce((sum, p) => sum + Number(p.amount), 0)
    ?? Number(sale?.amount_paid ?? 0)

  return (
    <>
      {/* ── Main POS UI (hidden when printing) ── */}
      <div className="pos-main" style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        {/* Left: Search + Cart */}
        <div className="pos-cart" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search Bar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ position: 'relative' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => { if (searchResults.length) setShowDropdown(true) }}
                placeholder="Scan barcode or search product..."
                style={{ width: '100%', padding: '12px 16px 12px 42px', fontSize: 16, borderRadius: 'var(--radius-card)', border: '2px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none' }}
                autoFocus
              />
              {searching && (
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  Searching…
                </div>
              )}

              {/* Search Results Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className='dropdown-results' style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-lg)', zIndex: 50, maxHeight: 320, overflowY: 'auto' }}>
                  {searchResults.map((p) => {
                    const retail = Number(p.retail_price) || 0
                    const wholesale = Number(p.wholesale_price) || 0
                    const wholesaleMin = Number(p.wholesale_min_qty) || 0
                    const hasWholesale = wholesale > 0 && wholesaleMin > 0
                    return (
                      <button
                        key={p.product_id}
                        type="button"
                        onClick={() => addToCart(p)}
                        style={{ display: 'flex', gap: 12, width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', alignItems: 'center', borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-secondary)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                      >
                        {p.primary_image_url ? (
                          <img src={resolveImageUrl(p.primary_image_url)} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.product_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.sku}{p.barcode ? ` · ${p.barcode}` : ''}</div>
                          {hasWholesale && (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.7 }}>
                              Wholesale: {formatPrice(wholesale)} (min {wholesaleMin})
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{formatPrice(retail)}</div>
                          {hasWholesale && (
                            <div style={{ fontSize: 11, color: 'var(--secondary)', fontWeight: 500 }}>{formatPrice(wholesale)} ea @{wholesaleMin}+</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cart Table */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
            {savedCarts.length > 0 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 0', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                {savedCarts.slice(0, 5).map((s) => (
                  <div key={s.id}
                    onClick={() => loadSavedCart(s.id)}
                    style={{ flex: '0 0 auto', padding: '8px 12px', borderRadius: 8, border: '1px solid #d97706', background: 'rgba(217,119,6,0.05)', cursor: 'pointer', minWidth: 150, transition: 'border-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#b45309')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#d97706')}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#d97706' }}>{s.customerName}</div>
                    {s.note && <div style={{ fontSize: 11, color: '#92400e', fontStyle: 'italic', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{s.note}"</div>}
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {s.cart.length} item{s.cart.length !== 1 ? 's' : ''} · {formatPrice(s.cart.reduce((sum, i) => sum + i.quantity * i.unit_price - i.line_discount + i.tax_amount, 0))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{new Date(s.savedAt).toLocaleDateString()}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeSavedCart(s.id) }}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, padding: 0 }}>Remove</button>
                    </div>
                  </div>
                ))}
                {savedCarts.length > 5 && (
                  <div onClick={() => setShowSavedCartsModal(true)}
                    style={{ flex: '0 0 auto', padding: '8px 16px', borderRadius: 8, border: '1px dashed var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 100, transition: 'border-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--text-secondary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" width="16" height="16" style={{ marginBottom: 4 }}>
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>View All</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.6 }}>({savedCarts.length - 5} more)</span>
                  </div>
                )}
              </div>
            )}
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', opacity: 0.5 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ marginBottom: 12 }}>
                  <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                <p style={{ fontSize: 16 }}>Scan a barcode or search for products</p>
              </div>
            ) : (
              <table className="data-table" style={{ marginTop: 16 }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'right', width: 110 }}>Unit Price</th>
                    <th style={{ textAlign: 'center', width: 120 }}>Qty</th>
                    <th style={{ textAlign: 'right', width: 100 }}>Total</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => {
                    const isWholesale =
                      Number(item.product.wholesale_price) > 0 &&
                      Number(item.product.wholesale_min_qty) > 0 &&
                      item.quantity >= Number(item.product.wholesale_min_qty)
                    const retailPrice = Number(item.product.retail_price) || 0
                    const wholesalePrice = Number(item.product.wholesale_price) || 0
                    const wholesaleMin = Number(item.product.wholesale_min_qty) || 0
                    const hasBothPrices = retailPrice > 0 && wholesalePrice > 0 && wholesaleMin > 0
                    return (
                      <tr key={item.product.product_id}>
                        <td>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            {item.product.primary_image_url ? (
                              <img src={resolveImageUrl(item.product.primary_image_url)} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                            ) : null}
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 14 }}>{item.product.product_name}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.product.sku}</div>
                              {hasBothPrices && (
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.7, marginTop: 1 }}>
                                  Retail: {formatPrice(retailPrice)} · Wholesale: {formatPrice(wholesalePrice)} ({wholesaleMin}+)
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: isWholesale ? 'var(--secondary)' : 'var(--text-primary)' }}>
                            {formatPrice(item.unit_price)}
                          </div>
                          {isWholesale && (
                            <div style={{ fontSize: 11, color: 'var(--secondary)', fontWeight: 500 }}>WHOLESALE</div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <button type="button" onClick={() => updateQuantity(item.product.product_id, item.quantity - 1)} style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>-</button>
                            <input
                              type="number"
                              value={qtyDrafts[item.product.product_id] ?? String(item.quantity)}
                              onChange={(e) => {
                                const raw = e.target.value
                                setQtyDrafts((d) => ({ ...d, [item.product.product_id]: raw }))
                                const v = parseInt(raw, 10)
                                if (!isNaN(v) && v > 0) updateQuantity(item.product.product_id, v)
                              }}
                              onBlur={() => {
                                const v = parseInt(qtyDrafts[item.product.product_id] ?? '', 10)
                                if (!v || v <= 0) {
                                  setQtyDrafts((d) => {
                                    const next = { ...d }
                                    delete next[item.product.product_id]
                                    return next
                                  })
                                }
                              }}
                              style={{ width: 50, textAlign: 'center', padding: '4px 0', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 13 }}
                            />
                            <button type="button" onClick={() => updateQuantity(item.product.product_id, item.quantity + 1)} style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>+</button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{(item.quantity * item.unit_price - item.line_discount + item.tax_amount).toFixed(2)}</td>
                        <td>
                          <button type="button" onClick={() => removeFromCart(item.product.product_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Payment Panel */}
        <div className="pos-payment" style={{ width: 360, borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Customer */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Customer</span>
                {(selectedCustomer || customerName) && (
                  <button type="button" onClick={clearCustomer} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, padding: 0, fontWeight: 500, textTransform: 'none', letterSpacing: 'normal' }}>Clear</button>
                )}
              </label>
              <input
                ref={customerInputRef}
                type="text"
                value={customerDropdownOpen ? customerSearchQuery : (selectedCustomer ? (selectedCustomer.business_name || selectedCustomer.contact_name || selectedCustomer.phone || '') : customerName)}
                onChange={(e) => { if (!customerDropdownOpen) setCustomerName(''); handleCustomerSearch(e.target.value) }}
                onFocus={() => { setCustomerDropdownOpen(true); setCustomerSearchQuery(''); if (!selectedCustomer && !customerName) setCustomerSearchQuery('') }}
                onBlur={() => setTimeout(() => {
                  setCustomerDropdownOpen(false)
                  if (!selectedCustomer && customerSearchQuery.trim() && !customerName) {
                    setCustomerName(customerSearchQuery.trim())
                    setCustomerSearchQuery('')
                  }
                }, 200)}
                onKeyDown={handleCustomerKeyDown}
                placeholder="Walk-in customer"
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${selectedCustomer ? 'var(--success)' : 'var(--border)'}`, borderRadius: 6, background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 14 }}
              />
              {selectedCustomer && (
                <div style={{ position: 'absolute', right: 10, top: 32, fontSize: 11, color: 'var(--success)', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12"><path d="M20 6L9 17l-5-5" /></svg>
                  Linked
                </div>
              )}

              {customerDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: 'var(--shadow-lg)', zIndex: 50, maxHeight: 240, overflowY: 'auto' }}>
                  {/* Walk-in option */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { clearCustomer(); setCustomerName(''); customerInputRef.current?.blur() }}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: (!selectedCustomer && !customerName) ? 'rgba(34,197,94,0.08)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}
                  >
                    Walk-in Customer
                  </button>

                  {customerSearching && (
                    <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>Searching…</div>
                  )}

                  {!customerSearching && customerResults.length > 0 && customerResults.map((c) => (
                    <button
                      type="button"
                      key={c.customer_id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCustomer(c)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '8px 12px', textAlign: 'left', background: selectedCustomer?.customer_id === c.customer_id ? 'rgba(37,99,235,0.08)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', gap: 8 }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{c.business_name || c.contact_name || 'Unnamed'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.phone || ''}{c.contact_name && c.business_name ? ` · ${c.contact_name}` : ''}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{c.customer_type || 'INDIVIDUAL'}</span>
                    </button>
                  ))}

                  {!customerSearching && customerResults.length === 0 && customerSearchQuery.trim() && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={selectCustomCustomer}
                      style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'rgba(37,99,235,0.05)', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--primary)' }}
                    >
                      Use "{customerSearchQuery}" as name
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sale Type Indicator */}
            {saleType === 'WHOLESALE' && (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                Wholesale pricing applied
              </div>
            )}

            {/* Totals */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Items</span>
                <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: '#16a34a' }}>
                  <span>Discount</span>
                  <span>-{formatPrice(totalDiscount)}</span>
                </div>
              )}
              {totalTax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tax</span>
                  <span>{formatPrice(totalTax)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '2px solid var(--border)', fontSize: 20, fontWeight: 700 }}>
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Payments */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payments</label>

              {/* Payment list */}
              {payments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {payments.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {PAYMENT_METHODS.find((m) => m.value === p.method)?.label || p.method}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{formatPrice(p.amount)}</span>
                      </div>
                      <button type="button" onClick={() => removePayment(i)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 2, lineHeight: 1 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add payment row */}
              {remaining > 0 && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  <select value={newPaymentMethod} onChange={(e) => setNewPaymentMethod(e.target.value as PaymentMethod)}
                    style={{ flex: '0 0 45%', padding: '6px 4px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 12 }}>
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.value} value={pm.value}>{pm.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={newPaymentAmount}
                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                    placeholder={remaining.toFixed(2)}
                    min={0}
                    max={remaining}
                    step={0.01}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPayment() } }}
                    style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 13, minWidth: 0 }}
                  />
                  <button type="button" onClick={addPayment}
                    style={{ flex: '0 0 32px', borderRadius: 6, border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </button>
                </div>
              )}

              {/* Quick pay buttons */}
              {remaining > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {PAYMENT_METHODS.filter((pm) => pm.value === 'CASH' || pm.value === 'MOBILE_MONEY').map((pm) => (
                    <button key={pm.value} type="button" onClick={() => addPaymentWithMethod(pm.value)}
                      style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Pay {remaining.toFixed(2)} w/ {pm.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Balance Summary */}
            {remaining > 0 ? (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remaining</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>{formatPrice(remaining)}</div>
              </div>
            ) : payments.length > 0 && (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: change > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)', border: `1px solid ${change > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.15)'}` }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {change > 0 ? 'Change Due' : 'Fully Paid'}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>
                  {change > 0 ? formatPrice(change) : formatPrice(total)}
                </div>
              </div>
            )}
          </div>

          {/* Complete Sale Button */}
          <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={handleCompleteSale}
              disabled={!canComplete}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 8,
                border: 'none',
                background: canComplete ? 'var(--primary)' : 'var(--border)',
                color: canComplete ? '#fff' : 'var(--text-secondary)',
                fontSize: 16,
                fontWeight: 600,
                cursor: canComplete ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              {processing ? 'Processing…' : 'Complete Sale'}
            </button>
            {cart.length > 0 && !lastSale && (
              <button type="button" onClick={openSaveCart}
                style={{ width: '100%', marginTop: 8, padding: '10px 0', borderRadius: 8, border: '1px dashed #d97706', background: 'transparent', color: '#d97706', fontSize: 14, cursor: 'pointer' }}>
                Save Cart ({cart.length} item{cart.length !== 1 ? 's' : ''})
              </button>
            )}
            <button type="button" onClick={() => setShowSavedCartsModal(true)}
              style={{ width: '100%', marginTop: 8, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}>
              Saved Carts ({savedCarts.length})
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDialog}
        title="Load Saved Cart"
        message={confirmDialog?.message}
        confirmLabel="Confirm"
        onConfirm={() => { if (confirmDialog) { const fn = confirmDialog.onConfirm; setConfirmDialog(null); fn() } }}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* ── Save Cart Modal ── */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h3 style={{ margin: '0 0 8px' }}>Save Cart</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px', fontSize: 14 }}>
              {cart.length} item{cart.length !== 1 ? 's' : ''} · {fmt(total)}
            </p>
            <input
              type="text"
              placeholder="Add a note (optional)"
              value={saveNote}
              onChange={(e) => setSaveNote(e.target.value)}
              maxLength={200}
              autoFocus
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowSaveModal(false)} className="btn btn--ghost">Cancel</button>
              <button type="button" onClick={confirmSaveCart} className="btn btn--primary">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Saved Carts Modal ── */}
      {showSavedCartsModal && (
        <div className="modal-overlay" onClick={() => setShowSavedCartsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 'min(520px, 100%)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Saved Carts</h3>
              <button type="button" onClick={() => setShowSavedCartsModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, lineHeight: 1 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            {savedCarts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ margin: '0 auto 12px', opacity: 0.4 }}>
                  <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                <p style={{ fontSize: 14 }}>No saved carts yet</p>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {savedCarts.map((s) => {
                  const total = s.cart.reduce((sum, i) => sum + i.quantity * i.unit_price - i.line_discount + i.tax_amount, 0)
                  return (
                    <div key={s.id}
                      style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{s.customerName}</div>
                          {s.note && <div style={{ fontSize: 12, color: '#92400e', fontStyle: 'italic', marginTop: 2 }}>"{s.note}"</div>}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {new Date(s.savedAt).toLocaleDateString()} {new Date(s.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {s.cart.length} item{s.cart.length !== 1 ? 's' : ''}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                            {formatPrice(total)}
                          </span>
                          <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            {(s.payments ?? []).map((p) => PAYMENT_METHODS.find((m) => m.value === p.method)?.label || p.method).join(', ') || '—'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button"
                            onClick={() => { setShowSavedCartsModal(false); loadSavedCart(s.id) }}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', fontSize: 12, cursor: 'pointer' }}>
                            Load
                          </button>
                          <button type="button"
                            onClick={() => removeSavedCart(s.id)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sale Complete Modal ── */}
      {lastSale && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" width="28" height="28"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: 20 }}>Sale Complete!</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px', fontSize: 14 }}>{lastSale.invoice_number ?? '—'}</p>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total</span>
                <span style={{ fontWeight: 600 }}>{Number(lastSale.total_amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Paid</span>
                <span>{Number(lastSale.amount_paid).toFixed(2)}</span>
              </div>
              {lastSale.balance_due > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Balance Due</span>
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{Number(lastSale.balance_due).toFixed(2)}</span>
                </div>
              )}
              {Number(lastSale.balance_due) <= 0 && change > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 14 }}>
                  <span style={{ color: '#16a34a' }}>Change</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>{change.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
              {(['80mm', '58mm'] as const).map(s => (
                <button key={s} type="button"
                  onClick={() => setPaperSize(s)}
                  style={{
                    padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
                    background: paperSize === s ? 'var(--primary)' : 'transparent',
                    color: paperSize === s ? '#fff' : 'var(--text)',
                    fontSize: 12, cursor: 'pointer'
                  }}
                >{s}</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handlePrint}
                className="btn btn--ghost"
                style={{ textAlign: 'center', flex: 1, padding: '12px 0', fontSize: 15, border: '1px solid var(--border)' }}
              >
                Print Receipt
              </button>
              <button
                type="button"
                onClick={startNewSale}
                className="btn btn--primary"
                style={{ textAlign: 'center', flex: 1, padding: '12px 0', fontSize: 15 }}
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden Receipt (printed via window.print) ── */}
      <div id="receipt-print">
        <div className={`receipt receipt-${paperSize === '58mm' ? '58' : '80'}`}>
          {/* Header */}
          <div className="receipt-header">
            {businessInfo.logo && (
              <img src={resolveImageUrl(businessInfo.logo)} alt="" className="receipt-logo" />
            )}
            <div className="receipt-business-name">{businessInfo.business_name || 'Your Store'}</div>
            {selectedBranch?.branch_name && (
              <div className="receipt-branch">{selectedBranch.branch_name}</div>
            )}
            {businessInfo.address && <div className="receipt-meta">{businessInfo.address}</div>}
            {businessInfo.phone && <div className="receipt-meta">{businessInfo.phone}</div>}
            {businessInfo.tax_number && <div className="receipt-meta">TIN: {businessInfo.tax_number}</div>}
            {businessInfo.registration_number && <div className="receipt-meta">Reg: {businessInfo.registration_number}</div>}
          </div>

          {/* Sale Info */}
          <div className="receipt-section">
            <div className="receipt-row">
              <span>Invoice</span>
              <span>{sale?.invoice_number ?? '—'}</span>
            </div>
            {receiptData?.receipt?.receipt_number && (
              <div className="receipt-row">
                <span>Receipt</span>
                <span>{receiptData.receipt.receipt_number}</span>
              </div>
            )}
            <div className="receipt-row">
              <span>Date</span>
              <span>{sale?.sale_date ? new Date(sale.sale_date).toLocaleString() : new Date().toLocaleString()}</span>
            </div>
            {(sale as Sale & { cashier_name?: string })?.cashier_name && (
              <div className="receipt-row">
                <span>Cashier</span>
                <span>{(sale as Sale & { cashier_name?: string }).cashier_name}</span>
              </div>
            )}
            {sale && 'customer_name' in sale && (sale as Sale & { customer_name?: string }).customer_name && (
              <div className="receipt-row">
                <span>Customer</span>
                <span>{(sale as Sale & { customer_name?: string }).customer_name}</span>
              </div>
            )}
            {sale?.payment_status && (
              <div className="receipt-row">
                <span>Payment</span>
                <span>{sale.payment_status}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="receipt-section receipt-items-section">
            {paperSize === '58mm' ? (
              /* 58mm: stacked flex layout — fits narrow paper */
              (receiptItems.length > 0 ? receiptItems : (lastSale?.items ?? []) as ReceiptItem[]).map((item, i) => {
                const lineTotal = Number(item.quantity) * Number(item.unit_price) - Number(item.line_discount || 0) + Number(item.tax_amount || 0)
                return (
                  <div className="receipt-item" key={i}>
                    <div className="receipt-item-name">{item.product_name}</div>
                    <div className="receipt-item-line">
                      <span>{Number(item.quantity)} {item.symbol || item.uom_name || ''} × {fmt(Number(item.unit_price))}</span>
                      <span>{fmt(lineTotal)}</span>
                    </div>
                  </div>
                )
              })
            ) : (
              /* 80mm: table layout with columns */
              <table className="receipt-items">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>UoM</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(receiptItems.length > 0 ? receiptItems : (lastSale?.items ?? []) as ReceiptItem[]).map((item, i) => {
                    const lineTotal = Number(item.quantity) * Number(item.unit_price) - Number(item.line_discount || 0) + Number(item.tax_amount || 0)
                    return (
                      <tr key={i}>
                        <td>{item.product_name}</td>
                        <td>{Number(item.quantity)}</td>
                        <td>{fmt(Number(item.unit_price))}</td>
                        <td>{item.symbol || item.uom_name || ''}</td>
                        <td>{fmt(lineTotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals */}
          <div className="receipt-section receipt-totals">
            <div className="receipt-row">
              <span>Subtotal</span>
              <span>{fmt(Number(sale?.subtotal ?? total))}</span>
            </div>
            {Number(sale?.discount_amount ?? totalDiscount) > 0 && (
              <div className="receipt-row r-discount">
                <span>Discount</span>
                <span>-{fmt(Number(sale?.discount_amount ?? totalDiscount))}</span>
              </div>
            )}
            {Number(sale?.tax_amount ?? totalTax) > 0 && (
              <div className="receipt-row">
                <span>Tax</span>
                <span>{fmt(Number(sale?.tax_amount ?? totalTax))}</span>
              </div>
            )}
            <div className="receipt-row receipt-total-row">
              <span>TOTAL</span>
              <span>{fmt(Number(sale?.total_amount ?? total))}</span>
            </div>
            {Number(sale?.refunded_amount ?? 0) > 0 && (
              <div className="receipt-row" style={{ color: '#000000' }}>
                <span>Refunded</span>
                <span>{fmt(Number(sale.refunded_amount))}</span>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="receipt-section receipt-payment">
            {(receiptData?.sale?.payments?.length
              ? receiptData.sale.payments
              : payments.map((p) => ({ payment_method: p.method, amount: p.amount }))
            ).map((p, i) => (
              <div className="receipt-row" key={i}>
                <span>{p.payment_method}</span>
                <span>{fmt(Number(p.amount))}</span>
              </div>
            ))}
            <div className="receipt-row" style={{ fontWeight: 600, borderTop: '1px dashed #888', paddingTop: 4, marginTop: 4 }}>
              <span>Total Paid</span>
              <span>{fmt(totalPaid)}</span>
            </div>
            {Number(sale?.balance_due ?? 0) > 0 && (
              <div className="receipt-row r-remain">
                <span>Balance Due</span>
                <span>{fmt(Number(sale.balance_due))}</span>
              </div>
            )}
            {change > 0 && (
              <div className="receipt-row">
                <span>Change</span>
                <span>{fmt(change)}</span>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="receipt-barcode">
            {qrDataUrl ? (
              <img src={qrDataUrl} style={{ width: paperSize === '58mm' ? 80 : 120, height: 'auto' }} />
            ) : (
              <svg ref={barcodeRef} />
            )}
          </div>

          {/* Footer */}
          {businessInfo.receipt_footer && (
            <div className="receipt-footer">{businessInfo.receipt_footer || 'Thank you for your business!'}</div>
          )}
        </div>
      </div>
    </>
  )
}
