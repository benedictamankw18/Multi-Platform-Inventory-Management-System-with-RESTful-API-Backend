import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase,
  submitPurchase,
  approvePurchase,
  receivePurchase,
  getPurchaseItems,
  addPurchaseItem,
  updatePurchaseItem,
  deletePurchaseItem,
  createPurchasePayment,
  listSupplierPayments,
  getSuppliers,
  getBranches,
  searchProducts,
  getUnitsOfMeasure,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type SupplierPayment,
  type Supplier,
  type BranchInfo,
  type Product,
  type UnitOfMeasure,
} from '../services/api'

type Tab = 'all' | 'draft' | 'submitted' | 'approved' | 'received'

const STATUS_VARIANTS: Record<string, string> = {
  DRAFT: 'info', SUBMITTED: 'warning', APPROVED: 'success', RECEIVED: 'success', CANCELLED: 'danger',
}

const PAYMENT_VARIANTS: Record<string, string> = {
  UNPAID: 'danger', PARTIAL: 'warning', PAID: 'success',
}

const TEMPLATE_HEADERS = ['PO Number', 'Supplier', 'Order Date', 'Expected Delivery', 'Total', 'Status', 'Payment Status', 'Notes']

type POForm = {
  supplier_id: string
  branch_id: string
  po_number: string
  order_date: string
  expected_delivery_date: string
  shipping_cost: string
  tax_amount: string
  discount_amount: string
  notes: string
}

type ItemForm = {
  product_id: string
  uom_id: string
  quantity: string
  unit_price: string
  discount: string
  expiry_date: string
  batch_number: string
  serial_number: string
}

const EMPTY_PO_FORM: POForm = {
  supplier_id: '', branch_id: '', po_number: '', order_date: new Date().toISOString().slice(0, 10),
  expected_delivery_date: '', shipping_cost: '0', tax_amount: '0', discount_amount: '0', notes: '',
}

const EMPTY_ITEM_FORM: ItemForm = {
  product_id: '', uom_id: '', quantity: '1', unit_price: '0', discount: '0',
  expiry_date: '', batch_number: '', serial_number: '',
}

export default function PurchasesPage() {
  const { toast } = useToast()
  const { hasPermission, selectedBranch } = useAuth()

  const [items, setItems] = useState<PurchaseOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([])
  const [supMap, setSupMap] = useState<Record<string, string>>({})
  const [branchMap, setBranchMap] = useState<Record<string, string>>({})
  const [uomMap, setUomMap] = useState<Record<string, string>>({})

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PurchaseOrder | null>(null)
  const [form, setForm] = useState<POForm>(EMPTY_PO_FORM)
  const [formError, setFormError] = useState('')

  const [viewing, setViewing] = useState<PurchaseOrder | null>(null)
  const [viewItems, setViewItems] = useState<PurchaseOrderItem[]>([])
  const [viewItemsLoading, setViewItemsLoading] = useState(false)
  const [productMap, setProductMap] = useState<Record<string, string>>({})

  const [viewPayments, setViewPayments] = useState<SupplierPayment[]>([])
  const [viewPaymentsLoading, setViewPaymentsLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'Cash', payment_date: new Date().toISOString().slice(0, 10), reference_number: '' })
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<PurchaseOrderItem | null>(null)
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM_FORM)
  const [itemFormError, setItemFormError] = useState('')
  const [itemLoading, setItemLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [productSearchLoading, setProductSearchLoading] = useState(false)

  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const [showImportMenu, setShowImportMenu] = useState(false)
  const importMenuRef = useRef<HTMLDivElement>(null)
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(0)
  const [importFailures, setImportFailures] = useState<{ row: number; name: string; reason: string }[]>([])
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)

  const limit = 25
  const totalPages = Math.max(1, Math.ceil(total / limit))

  useEffect(() => {
    getSuppliers({ limit: 1000 }).then((d) => {
      const arr = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []
      setSuppliers(arr)
      setSupMap(Object.fromEntries(arr.map((s: Supplier) => [s.supplier_id, s.supplier_name])))
    }).catch(() => {})
    getBranches().then((d) => {
      const arr = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []
      setBranches(arr)
      setBranchMap(Object.fromEntries(arr.map((b: BranchInfo) => [b.branch_id, b.branch_name])))
    }).catch(() => {})
    getUnitsOfMeasure().then((d) => {
      const arr = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []
      setUoms(arr)
      setUomMap(Object.fromEntries(arr.map((u: UnitOfMeasure) => [u.uom_id, u.abbreviation || u.uom_name])))
    }).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { page, limit }
      if (search) body.q = search
      if (tab !== 'all') body.status = tab.toUpperCase()
      if (selectedBranch) body.branchId = selectedBranch.branch_id
      const res = await getPurchases(body)
      const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      setItems(data)
      setTotal(res?.total ?? data.length)
    } catch {
      setItems([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, search, tab, selectedBranch])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false)
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) setShowImportMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function setFormVal(key: keyof POForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setItemFormVal(key: keyof ItemForm, value: string) {
    setItemForm((prev) => ({ ...prev, [key]: value }))
  }

  function generatePONumber() {
    const ts = Date.now().toString(36).toUpperCase()
    return `PO-${ts.slice(-6)}`
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_PO_FORM, branch_id: selectedBranch?.branch_id ?? '', po_number: generatePONumber() })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(po: PurchaseOrder) {
    setEditing(po)
    setForm({
      supplier_id: po.supplier_id,
      branch_id: po.branch_id,
      po_number: po.po_number ?? '',
      order_date: po.order_date ? new Date(po.order_date).toISOString().slice(0, 10) : '',
      expected_delivery_date: po.expected_delivery_date ? new Date(po.expected_delivery_date).toISOString().slice(0, 10) : '',
      shipping_cost: String(po.shipping_cost ?? 0),
      tax_amount: String(po.tax_amount ?? 0),
      discount_amount: String(po.discount_amount ?? 0),
      notes: po.notes ?? '',
    })
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  async function handleSubmitPO(e: React.FormEvent) {
    e.preventDefault()
    if (!form.supplier_id) { setFormError('Supplier is required.'); return }
    if (!form.po_number.trim()) { setFormError('PO number is required.'); return }
    if (form.expected_delivery_date && form.order_date && new Date(form.expected_delivery_date) <= new Date(form.order_date)) {
      setFormError('Expected delivery date must be after the order date.'); return
    }
    setFormError('')
    try {
      const body: Record<string, unknown> = {
        supplier_id: form.supplier_id,
        branch_id: form.branch_id || selectedBranch?.branch_id,
        po_number: form.po_number.trim(),
        order_date: form.order_date ? new Date(form.order_date).toISOString() : undefined,
        expected_delivery_date: form.expected_delivery_date || undefined,
        shipping_cost: Number(form.shipping_cost) || 0,
        tax_amount: Number(form.tax_amount) || 0,
        discount_amount: Number(form.discount_amount) || 0,
        notes: form.notes.trim() || null,
      }
      if (editing) {
        await updatePurchase(editing.po_id, body)
        toast('Purchase order updated', 'success')
      } else {
        await createPurchase(body)
        toast('Purchase order created', 'success')
      }
      closeForm()
      load()
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; errors?: Array<{ msg: string }> } } }).response?.data
        : undefined
      const msg = data?.errors?.length ? data.errors.map((e) => e.msg).join('; ') : data?.message ?? 'Save failed'
      setFormError(msg)
      toast(msg, 'error')
    }
  }

  async function openView(po: PurchaseOrder) {
    setViewing(po)
    setViewItemsLoading(true)
    setViewPaymentsLoading(true)
    try {
      const res = await getPurchaseItems(po.po_id)
      const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      setViewItems(rows)
      const pids = [...new Set(rows.map((r: PurchaseOrderItem) => r.product_id))]
      if (pids.length > 0) {
        const pRes = await searchProducts({ limit: 1000, includeInactive: true })
        const allP = pRes?.products ?? []
        setProductMap(Object.fromEntries(allP.filter((p: Product) => pids.includes(p.product_id)).map((p: Product) => [p.product_id, p.product_name])))
      }
    } catch {
      setViewItems([])
    }
    setViewItemsLoading(false)
    try {
      const pRes = await listSupplierPayments({ poId: po.po_id, limit: 100 })
      const pRows = Array.isArray(pRes?.data) ? pRes.data : Array.isArray(pRes) ? pRes : []
      setViewPayments(pRows)
    } catch {
      setViewPayments([])
    }
    setViewPaymentsLoading(false)
  }

  function closeView() {
    setViewing(null)
    setViewItems([])
    setViewPayments([])
  }

  function openPaymentModal() {
    setPaymentForm({ amount: '', payment_method: 'Cash', payment_date: new Date().toISOString().slice(0, 10), reference_number: '' })
    setPaymentError('')
    setShowPaymentModal(true)
  }

  async function handleRecordPayment() {
    if (!viewing) return
    const amt = parseFloat(paymentForm.amount)
    if (!amt || amt <= 0) { setPaymentError('Amount must be positive.'); return }
    setPaymentError('')
    setPaymentLoading(true)
    try {
      await createPurchasePayment(viewing.po_id, {
        amount: amt,
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date ? new Date(paymentForm.payment_date).toISOString() : undefined,
        reference_number: paymentForm.reference_number.trim() || undefined,
      })
      setShowPaymentModal(false)
      load()
      openView(viewing)
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data
        : undefined
      setPaymentError(data?.message ?? 'Payment failed')
    }
    setPaymentLoading(false)
  }

  async function handleStatusAction(action: string, po: PurchaseOrder) {
    const labels: Record<string, string> = { submit: 'Submit', approve: 'Approve', receive: 'Receive', delete: 'Deactivate' }
    setConfirmAction({
      message: `Are you sure you want to ${labels[action]} this purchase order?`,
      onConfirm: async () => {
        setConfirmAction(null)
        setActionLoading(po.po_id)
        try {
          if (action === 'submit') await submitPurchase(po.po_id)
          else if (action === 'approve') await approvePurchase(po.po_id)
          else if (action === 'receive') await receivePurchase(po.po_id)
          else if (action === 'delete') await deletePurchase(po.po_id)
          toast(`Purchase order ${action === 'delete' ? 'deactivated' : action + 'd'}`, 'success')
          load()
          if (viewing?.po_id === po.po_id) {
            const updated = await getPurchaseById(po.po_id)
            const d = updated?.data ?? updated
            if (d) setViewing(d)
          }
        } catch (err: unknown) {
          const data = err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data
            : undefined
          toast(data?.message ?? `Failed to ${action}`, 'error')
        }
        setActionLoading(null)
      },
    })
  }

  function openAddItem() {
    setEditingItem(null)
    setItemForm({ ...EMPTY_ITEM_FORM })
    setItemFormError('')
    setProductSearch('')
    setProductResults([])
    setShowItemModal(true)
  }

  function openEditItem(item: PurchaseOrderItem) {
    setEditingItem(item)
    setItemForm({
      product_id: item.product_id,
      uom_id: item.uom_id,
      quantity: String(item.quantity_ordered),
      unit_price: String(item.unit_cost),
      discount: String(item.discount ?? 0),
      expiry_date: item.expiry_date ? new Date(item.expiry_date).toISOString().slice(0, 10) : '',
      batch_number: item.batch_number ?? '',
      serial_number: item.serial_number ?? '',
    })
    setItemFormError('')
    setProductSearch('')
    setProductResults([])
    setShowItemModal(true)
  }

  async function handleSearchProducts() {
    if (!productSearch.trim()) return
    setProductSearchLoading(true)
    try {
      const res = await searchProducts({ q: productSearch.trim(), limit: 20 })
      setProductResults(res?.products ?? [])
    } catch {
      setProductResults([])
    }
    setProductSearchLoading(false)
  }

  function handleSelectProduct(p: Product) {
    setItemForm((prev) => ({
      ...prev,
      product_id: p.product_id,
      uom_id: p.base_uom_id,
      unit_price: String(p.cost_price ?? 0),
    }))
    setProductSearch(p.product_name)
    setProductResults([])
  }

  async function handleSaveItem() {
    if (!viewing) return
    if (!itemForm.product_id) { setItemFormError('Product is required.'); return }
    if (!itemForm.uom_id) { setItemFormError('UoM is required.'); return }
    const qty = parseFloat(itemForm.quantity)
    if (!qty || qty <= 0) { setItemFormError('Quantity must be positive.'); return }
    const price = parseFloat(itemForm.unit_price)
    if (price < 0) { setItemFormError('Unit cost cannot be negative.'); return }
    setItemFormError('')
    setItemLoading(true)
    try {
      const lineTotal = qty * price - (parseFloat(itemForm.discount) || 0)
      const body: Record<string, unknown> = {
        product_id: itemForm.product_id,
        uom_id: itemForm.uom_id,
        quantity: qty,
        unit_price: price,
        discount: parseFloat(itemForm.discount) || 0,
        expiry_date: itemForm.expiry_date || undefined,
        batch_number: itemForm.batch_number.trim() || undefined,
        serial_number: itemForm.serial_number.trim() || undefined,
      }
      if (editingItem) {
        await updatePurchaseItem(viewing.po_id, editingItem.po_item_id, { ...body, line_total: lineTotal })
        toast('Item updated', 'success')
      } else {
        await addPurchaseItem(viewing.po_id, body)
        toast('Item added', 'success')
      }
      setShowItemModal(false)
      openView(viewing)
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data
        : undefined
      setItemFormError(data?.message ?? 'Failed to save item')
    }
    setItemLoading(false)
  }

  async function handleDeleteItem(item: PurchaseOrderItem) {
    if (!viewing) return
    setConfirmAction({
      message: 'Remove this item from the purchase order?',
      onConfirm: async () => {
        setConfirmAction(null)
        try {
          await deletePurchaseItem(viewing.po_id, item.po_item_id)
          toast('Item removed', 'success')
          openView(viewing)
        } catch (err: unknown) {
          const data = err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data
            : undefined
          toast(data?.message ?? 'Failed to remove item', 'error')
        }
      },
    })
  }

  async function fetchAllForExport() {
    const res = await getPurchases({ limit: 10000, page: 1 })
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
  }

  async function exportXLSX() {
    try {
      const data = await fetchAllForExport()
      const rows = data.map((po: PurchaseOrder) => ({
        'PO Number': po.po_number,
        Supplier: supMap[po.supplier_id] ?? po.supplier_id,
        'Order Date': po.order_date ? new Date(po.order_date).toLocaleDateString() : '',
        'Expected Delivery': po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '',
        Total: Number(po.total_amount).toFixed(2),
        Status: po.status,
        'Payment Status': po.payment_status ?? '',
        Notes: po.notes ?? '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Purchase Orders')
      XLSX.writeFile(wb, `purchase-orders-${new Date().toISOString().slice(0, 10)}.xlsx`)
      setShowExportMenu(false)
      toast('Exported XLSX', 'success')
    } catch { toast('Export failed', 'error') }
  }

  async function exportCSV() {
    try {
      const data = await fetchAllForExport()
      const rows = data.map((po: PurchaseOrder) => ({
        'PO Number': po.po_number,
        Supplier: supMap[po.supplier_id] ?? po.supplier_id,
        'Order Date': po.order_date ? new Date(po.order_date).toLocaleDateString() : '',
        'Expected Delivery': po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '',
        Total: Number(po.total_amount).toFixed(2),
        Status: po.status,
        'Payment Status': po.payment_status ?? '',
        Notes: po.notes ?? '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
      URL.revokeObjectURL(url)
      setShowExportMenu(false)
      toast('Exported CSV', 'success')
    } catch { toast('Export failed', 'error') }
  }

  async function exportPDF() {
    try {
      const data = await fetchAllForExport()
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(16)
      doc.text('Purchase Orders Report', 14, 20)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)
      autoTable(doc, {
        startY: 34,
        head: [['PO #', 'Supplier', 'Date', 'Total', 'Status', 'Payment']],
        body: data.map((po: PurchaseOrder) => [
          po.po_number, supMap[po.supplier_id] ?? '', po.order_date ? new Date(po.order_date).toLocaleDateString() : '',
          Number(po.total_amount).toFixed(2), po.status, po.payment_status ?? '',
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      })
      doc.save(`purchase-orders-${new Date().toISOString().slice(0, 10)}.pdf`)
      setShowExportMenu(false)
      toast('Exported PDF', 'success')
    } catch { toast('Export failed', 'error') }
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([], { header: TEMPLATE_HEADERS })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Orders Template')
    XLSX.writeFile(wb, 'purchase-orders-template.xlsx')
    setShowExportMenu(false)
    toast('Template downloaded', 'success')
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFileName(file.name)
    setImportFailures([])
    setImportDone(0)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)
        setImportRows(data)
      } catch {
        toast('Failed to parse file', 'error')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  async function confirmImport() {
    if (importRows.length === 0) return
    setImporting(true)
    setImportProgress({ done: 0, total: importRows.length })
    let done = 0
    const failures: { row: number; name: string; reason: string }[] = []
    for (const row of importRows) {
      try {
        const supplierName = String(row['Supplier Name'] ?? row['supplier_name'] ?? '').trim()
        const poNumber = String(row['PO Number'] ?? row['po_number'] ?? '').trim()
        if (!supplierName || !poNumber) throw new Error('Missing supplier or PO number')
        const matchedSupplier = suppliers.find((s) => s.supplier_name.toLowerCase() === supplierName.toLowerCase())
        if (!matchedSupplier) throw new Error(`Supplier "${supplierName}" not found`)
        await createPurchase({
          supplier_id: matchedSupplier.supplier_id,
          branch_id: selectedBranch?.branch_id,
          po_number: poNumber,
          order_date: row['Order Date'] ? new Date(String(row['Order Date'])).toISOString() : undefined,
          total_amount: Number(row['Total'] ?? 0) || 0,
          notes: String(row['Notes'] ?? '').trim() || null,
        })
        done++
      } catch (err: unknown) {
        failures.push({ row: done + failures.length + 2, name: String(row['PO Number'] ?? ''), reason: err instanceof Error ? err.message : 'Import failed' })
      }
      setImportProgress({ done: done + failures.length, total: importRows.length })
    }
    setImportDone(done)
    setImportFailures(failures)
    setImporting(false)
    if (done > 0) load()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Purchase Orders</h1>
          <p className="page-subtitle">Manage purchase orders with suppliers</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div ref={importMenuRef} style={{ position: 'relative' }}>
            <button type="button" className="btn btn--ghost" onClick={() => setShowImportMenu((v) => !v)}>Import</button>
            {showImportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, zIndex: 50, minWidth: 180 }}>
                <label style={{ display: 'block', padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderRadius: 4 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  Import from Excel/CSV
                  <input type="file" accept=".xlsx,.csv" onChange={handleImportFile} style={{ display: 'none' }} />
                </label>
              </div>
            )}
          </div>
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button type="button" className="btn btn--ghost" onClick={() => setShowExportMenu((v) => !v)}>Export</button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-lg)', zIndex: 20, minWidth: 180, overflow: 'hidden' }}>
                <button type="button" style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-4)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }} onClick={exportXLSX}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  Export XLSX
                </button>
                <button type="button" style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-4)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }} onClick={exportCSV}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                  Export CSV
                </button>
                <button type="button" style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-4)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }} onClick={exportPDF}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  Export PDF
                </button>
                <div style={{ borderTop: '1px solid var(--border)' }} />
                <button type="button" style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-4)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }} onClick={downloadTemplate}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Download Template
                </button>
              </div>
            )}
          </div>
          {hasPermission('MANAGE_PURCHASES') && (
            <button type="button" className="btn btn--primary" onClick={openCreate}>+ New Purchase Order</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {([['all', 'All'], ['draft', 'Draft'], ['submitted', 'Submitted'], ['approved', 'Approved'], ['received', 'Received']] as const).map(([key, label]) => (
          <button key={key} type="button" className={`btn ${tab === key ? 'btn--primary' : 'btn--ghost'}`}
            style={{ fontSize: 13, padding: '6px 14px' }}
            onClick={() => { setTab(key); setPage(1) }}>{label}</button>
        ))}
      </div>

      <div className="glass-card">
        <div className="search-input" style={{ marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" placeholder="Search by PO number..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>

        {importRows.length > 0 && !importing && importDone === 0 && (
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>{importRows.length} rows ready to import from "{importFileName}"</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--ghost" onClick={() => { setImportRows([]); setImportFileName('') }}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={confirmImport}>Import {importRows.length} Rows</button>
            </div>
          </div>
        )}
        {importProgress && importing && (
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13 }}>Importing... {importProgress.done}/{importProgress.total}</div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(importProgress.done / importProgress.total) * 100}%`, background: 'var(--primary)', transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
        {importDone > 0 && !importing && (
          <div style={{ marginBottom: 16, padding: 12, background: 'rgba(34,197,94,0.05)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.2)' }}>
            <div style={{ fontSize: 13, color: '#16a34a' }}>{importDone} purchase orders imported successfully.{importFailures.length > 0 ? ` ${importFailures.length} failed.` : ''}</div>
            {importFailures.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', maxHeight: 100, overflowY: 'auto' }}>
                {importFailures.map((f, i) => <div key={i}>Row {f.row}: {f.name} - {f.reason}</div>)}
              </div>
            )}
            <button type="button" className="btn btn--ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => { setImportDone(0); setImportFailures([]); setImportRows([]); setImportFileName(''); setImportProgress(null) }}>Dismiss</button>
          </div>
        )}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO #</th>
                <th>Supplier</th>
                <th>Branch</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading"><td colSpan={8}><div className="skeleton skeleton--row" /></td></tr>
              ) : items.length === 0 ? (
                <tr key="empty"><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>No purchase orders found.</td></tr>
              ) : items.map((po) => (
                <tr key={po.po_id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{po.po_number}</td>
                  <td>{supMap[po.supplier_id] ?? '—'}</td>
                  <td>{branchMap[po.branch_id] ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{po.order_date ? new Date(po.order_date).toLocaleDateString() : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(po.total_amount).toFixed(2)}</td>
                  <td><span className={`badge badge--${STATUS_VARIANTS[po.status] ?? 'info'}`}>{po.status}</span></td>
                  <td><span className={`badge badge--${PAYMENT_VARIANTS[po.payment_status ?? 'UNPAID'] ?? 'danger'}`}>{po.payment_status ?? 'UNPAID'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => openView(po)}>View</button>
                      {po.status === 'DRAFT' && hasPermission('MANAGE_PURCHASES') && (
                        <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => openEdit(po)}>Edit</button>
                      )}
                      {po.status === 'DRAFT' && hasPermission('MANAGE_PURCHASES') && (
                        <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 8px', color: '#16a34a' }} disabled={actionLoading === po.po_id} onClick={() => handleStatusAction('submit', po)}>Submit</button>
                      )}
                      {po.status === 'SUBMITTED' && hasPermission('MANAGE_PURCHASES') && (
                        <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 8px', color: '#16a34a' }} disabled={actionLoading === po.po_id} onClick={() => handleStatusAction('approve', po)}>Approve</button>
                      )}
                      {po.status === 'APPROVED' && hasPermission('MANAGE_PURCHASES') && (
                        <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 8px', color: '#16a34a' }} disabled={actionLoading === po.po_id} onClick={() => handleStatusAction('receive', po)}>Receive</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 16 }}>
            <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
            <button type="button" className="btn btn--ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      {/* ---- Create / Edit PO Modal ---- */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" style={{ maxWidth: 600, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M9 14l2 2 4-4" /></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{editing ? 'Edit Purchase Order' : 'New Purchase Order'}</h3>
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>{editing ? 'Update order details' : 'Create a purchase order with a supplier'}</div>
                </div>
              </div>
            </div>

            <div style={{ padding: 'var(--space-5) var(--space-6)', maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>
              {formError && <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)' }}>{formError}</div>}

              <form id="po-form" onSubmit={handleSubmitPO}>
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <div style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>Order Details</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div>
                      <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Supplier *</label>
                      <select className="input" value={form.supplier_id} onChange={(e) => setFormVal('supplier_id', e.target.value)}>
                        <option value="">Select supplier</option>
                        {suppliers.filter((s) => s.is_active).map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                      <div>
                        <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>PO Number *</label>
                        <input type="text" className="input" value={form.po_number} onChange={(e) => setFormVal('po_number', e.target.value)} placeholder="PO-001" />
                      </div>
                      <div>
                        <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Branch</label>
                        <select className="input" value={form.branch_id} onChange={(e) => setFormVal('branch_id', e.target.value)} disabled={!editing}>
                          {branches.filter((b) => editing || b.branch_id === selectedBranch?.branch_id).map((b) => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                      <div>
                        <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Order Date</label>
                        <input type="date" className="input" value={form.order_date} onChange={(e) => setFormVal('order_date', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Expected Delivery</label>
                        <input type="date" className="input" value={form.expected_delivery_date} onChange={(e) => setFormVal('expected_delivery_date', e.target.value)} min={form.order_date || undefined} />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <div style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>Costs</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                    <div>
                      <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Shipping Cost</label>
                      <input type="number" step="0.01" min="0" className="input" value={form.shipping_cost} onChange={(e) => setFormVal('shipping_cost', e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tax Amount</label>
                      <input type="number" step="0.01" min="0" className="input" value={form.tax_amount} onChange={(e) => setFormVal('tax_amount', e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Discount</label>
                      <input type="number" step="0.01" min="0" className="input" value={form.discount_amount} onChange={(e) => setFormVal('discount_amount', e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Estimated Total (items added later)</span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>
                      {(Number(form.shipping_cost) || 0) + (Number(form.tax_amount) || 0) - (Number(form.discount_amount) || 0) === 0
                        ? '—'
                        : `${(Number(form.shipping_cost) || 0) + (Number(form.tax_amount) || 0) - (Number(form.discount_amount) || 0) > 0 ? '' : '-'}${Math.abs((Number(form.shipping_cost) || 0) + (Number(form.tax_amount) || 0) - (Number(form.discount_amount) || 0)).toFixed(2)}`}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>Notes</div>
                  <textarea className="input" rows={2} value={form.notes} onChange={(e) => setFormVal('notes', e.target.value)} placeholder="Optional notes about this order..." style={{ resize: 'vertical' }} />
                </div>
              </form>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
              <button type="button" className="btn btn--ghost" onClick={closeForm}>Cancel</button>
              <button type="submit" form="po-form" className="btn btn--primary">{editing ? 'Update' : 'Create'} Purchase Order</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- View PO Modal ---- */}
      {viewing && (() => {
        const po = viewing
        const subtotal = viewItems.reduce((sum, i) => sum + Number(i.line_total ?? 0), 0)
        const total = subtotal + Number(po.shipping_cost ?? 0) + Number(po.tax_amount ?? 0) - Number(po.discount_amount ?? 0)
        return (
          <div className="modal-overlay" onClick={closeView}>
            <div className="modal" style={{ maxWidth: 760, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{po.po_number}</h3>
                  <span className={`badge badge--${STATUS_VARIANTS[po.status] ?? 'info'}`}>{po.status}</span>
                  <span className={`badge badge--${PAYMENT_VARIANTS[po.payment_status ?? 'UNPAID'] ?? 'danger'}`}>{po.payment_status ?? 'UNPAID'}</span>
                </div>
                <button type="button" className="btn btn--ghost" onClick={closeView} style={{ padding: '4px 8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>

              <div style={{ padding: 'var(--space-6)', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                  {[
                    ['Supplier', supMap[po.supplier_id] ?? '—'],
                    ['Branch', branchMap[po.branch_id] ?? '—'],
                    ['Order Date', po.order_date ? new Date(po.order_date).toLocaleDateString() : '—'],
                    ['Expected Delivery', po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '—'],
                    ['Approved', po.approved_date ? new Date(po.approved_date).toLocaleDateString() : '—'],
                    ['Received', po.received_date ? new Date(po.received_date).toLocaleDateString() : '—'],
                  ].map(([label, val]) => (
                    <div key={label} style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>{label}</span>
                      <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Subtotal</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{subtotal.toFixed(2)}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Shipping</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{Number(po.shipping_cost ?? 0).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Tax</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{Number(po.tax_amount ?? 0).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Discount</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>-{Number(po.discount_amount ?? 0).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--primary)', borderRadius: 'var(--radius-button)', border: '1px solid var(--primary)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'rgba(255,255,255,0.8)' }}>Total</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: '#fff', fontWeight: 700 }}>{total.toFixed(2)}</div>
                  </div>
                </div>

                {po.notes && (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 'var(--space-4)', border: '1px solid var(--border)', marginBottom: 'var(--space-5)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)', display: 'block', marginBottom: 4 }}>Notes</span>
                    <div style={{ fontSize: 'var(--text-body)' }}>{po.notes}</div>
                  </div>
                )}

                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 'var(--space-4)', border: '1px solid var(--border)', marginBottom: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Items ({viewItems.length})</span>
                    {po.status === 'DRAFT' && hasPermission('MANAGE_PURCHASES') && (
                      <button type="button" className="btn btn--primary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={openAddItem}>+ Add Item</button>
                    )}
                  </div>
                  {viewItemsLoading ? (
                    <div className="skeleton skeleton--row" />
                  ) : viewItems.length === 0 ? (
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>No items added yet.</span>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table" style={{ fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th style={{ textAlign: 'right' }}>Qty</th>
                            <th>UoM</th>
                            <th style={{ textAlign: 'right' }}>Unit Cost</th>
                            <th style={{ textAlign: 'right' }}>Discount</th>
                            <th style={{ textAlign: 'right' }}>Line Total</th>
                            <th>Batch</th>
                            {hasPermission('MANAGE_PURCHASES') && <th style={{ textAlign: 'right' }}>Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {viewItems.map((item) => (
                            <tr key={item.po_item_id}>
                              <td>{productMap[item.product_id] ?? item.product_id.slice(0, 8)}</td>
                              <td style={{ textAlign: 'right' }}>{Number(item.quantity_ordered)}</td>
                              <td>{uomMap[item.uom_id] ?? '—'}</td>
                              <td style={{ textAlign: 'right' }}>{Number(item.unit_cost).toFixed(2)}</td>
                              <td style={{ textAlign: 'right' }}>{Number(item.discount ?? 0).toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(item.line_total).toFixed(2)}</td>
                              <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>{item.batch_number ?? '—'}</td>
                              {hasPermission('MANAGE_PURCHASES') && (
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                    {po.status === 'DRAFT' && (
                                      <>
                                        <button type="button" className="btn btn--ghost" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => openEditItem(item)}>Edit</button>
                                        <button type="button" className="btn btn--ghost" style={{ fontSize: 11, padding: '2px 6px', color: 'var(--danger)' }} onClick={() => handleDeleteItem(item)}>Remove</button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 'var(--space-4)', border: '1px solid var(--border)', marginBottom: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Payments ({viewPayments.length})</span>
                  </div>
                  {viewPaymentsLoading ? (
                    <div className="skeleton skeleton--row" />
                  ) : viewPayments.length === 0 ? (
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>No payments recorded yet.</span>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table" style={{ fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                            <th>Method</th>
                            <th>Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewPayments.map((p) => (
                            <tr key={p.payment_id}>
                              <td style={{ whiteSpace: 'nowrap' }}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(p.amount).toFixed(2)}</td>
                              <td>{p.payment_method || '—'}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.reference_number || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {po.created_at && (
                  <div style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)', fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>
                    Created: {new Date(po.created_at).toLocaleDateString()}
                    {po.updated_at && <span> &middot; Updated: {new Date(po.updated_at).toLocaleDateString()}</span>}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                {po.status === 'DRAFT' && hasPermission('MANAGE_PURCHASES') && (
                  <>
                    <button type="button" className="btn btn--ghost" onClick={() => { closeView(); openEdit(po) }}>Edit</button>
                    <button type="button" className="btn btn--primary" disabled={actionLoading === po.po_id} onClick={() => handleStatusAction('submit', po)}>Submit</button>
                  </>
                )}
                {po.status === 'SUBMITTED' && hasPermission('MANAGE_PURCHASES') && (
                  <button type="button" className="btn btn--primary" disabled={actionLoading === po.po_id} onClick={() => handleStatusAction('approve', po)}>Approve</button>
                )}
                {po.status === 'APPROVED' && hasPermission('MANAGE_PURCHASES') && (
                  <button type="button" className="btn btn--primary" disabled={actionLoading === po.po_id} onClick={() => handleStatusAction('receive', po)}>Receive</button>
                )}
                {po.status === 'RECEIVED' && po.payment_status !== 'PAID' && hasPermission('MANAGE_PURCHASES') && (
                  <button type="button" className="btn btn--primary" onClick={openPaymentModal}>Record Payment</button>
                )}
                <button type="button" className="btn btn--ghost" onClick={closeView}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ---- Record Payment Modal ---- */}
      {showPaymentModal && viewing && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" style={{ maxWidth: 420, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>Record Payment</h3>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>{viewing.po_number}</div>
            </div>
            <div style={{ padding: 'var(--space-5) var(--space-6)' }}>
              {paymentError && <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)', color: 'var(--error)' }}>{paymentError}</div>}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Amount *</label>
                <input type="number" step="0.01" min="0" className="input" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" autoFocus style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace' }} />
              </div>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Payment Method</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['Cash', 'Card', 'Mobile Money', 'Bank Transfer', 'Cheque'].map((m) => (
                    <button key={m} type="button" className={`btn ${paymentForm.payment_method === m ? 'btn--primary' : 'btn--ghost'}`} style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setPaymentForm((p) => ({ ...p, payment_method: m }))}>{m}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Payment Date</label>
                <input type="date" className="input" value={paymentForm.payment_date} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Reference #</label>
                <input type="text" className="input" value={paymentForm.reference_number} onChange={(e) => setPaymentForm((p) => ({ ...p, reference_number: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setShowPaymentModal(false)}>Cancel</button>
              <button type="button" className="btn btn--primary" disabled={paymentLoading} onClick={handleRecordPayment}>{paymentLoading ? 'Recording...' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Add / Edit Item Modal ---- */}
      {showItemModal && viewing && (
        <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
          <div className="modal" style={{ maxWidth: 520, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 'var(--text-h4)', marginBottom: 'var(--space-4)' }}>{editingItem ? 'Edit Item' : 'Add Item'}</h3>
            {itemFormError && <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)', color: 'var(--error)' }}>{itemFormError}</div>}

            {!editingItem && (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Search Product *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" className="input" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchProducts()} placeholder="Search by name or SKU..." />
                  <button type="button" className="btn btn--ghost" onClick={handleSearchProducts} disabled={productSearchLoading}>Search</button>
                </div>
                {productResults.length > 0 && (
                  <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, marginTop: 4 }}>
                    {productResults.map((p) => (
                      <button key={p.product_id} type="button" style={{ display: 'block', width: '100%', padding: '6px 10px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}
                        onClick={() => handleSelectProduct(p)}>
                        <div style={{ fontWeight: 600 }}>{p.product_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>SKU: {p.sku} | Cost: {Number(p.cost_price).toFixed(2)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(itemForm.product_id || editingItem) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>UoM *</label>
                    <select className="input" value={itemForm.uom_id} onChange={(e) => setItemFormVal('uom_id', e.target.value)}>
                      <option value="">Select UoM</option>
                      {uoms.map((u) => <option key={u.uom_id} value={u.uom_id}>{u.abbreviation || u.uom_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Quantity *</label>
                    <input type="number" step="0.01" min="0.01" className="input" value={itemForm.quantity} onChange={(e) => setItemFormVal('quantity', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Unit Cost *</label>
                    <input type="number" step="0.01" min="0" className="input" value={itemForm.unit_price} onChange={(e) => setItemFormVal('unit_price', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Discount</label>
                    <input type="number" step="0.01" min="0" className="input" value={itemForm.discount} onChange={(e) => setItemFormVal('discount', e.target.value)} />
                  </div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'right', fontWeight: 600 }}>
                  Line Total: {((parseFloat(itemForm.quantity) || 0) * (parseFloat(itemForm.unit_price) || 0) - (parseFloat(itemForm.discount) || 0)).toFixed(2)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Expiry Date</label>
                    <input type="date" className="input" value={itemForm.expiry_date} onChange={(e) => setItemFormVal('expiry_date', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Batch #</label>
                    <input type="text" className="input" value={itemForm.batch_number} onChange={(e) => setItemFormVal('batch_number', e.target.value)} placeholder="Optional" />
                  </div>
                  <div>
                    <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Serial #</label>
                    <input type="text" className="input" value={itemForm.serial_number} onChange={(e) => setItemFormVal('serial_number', e.target.value)} placeholder="Optional" />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setShowItemModal(false)}>Cancel</button>
              <button type="button" className="btn btn--primary" disabled={itemLoading || !itemForm.product_id} onClick={handleSaveItem}>{itemLoading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmModal open title="Confirm" message={confirmAction.message} confirmLabel="Confirm" cancelLabel="Cancel" variant="danger" onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />
      )}
    </div>
  )
}
