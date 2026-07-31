import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import QRCode from 'qrcode'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  activateSupplier,
  getSupplierPayments,
  createSupplierPayment,
  getBusinessSettings,
  resolveImageUrl,
  type Supplier,
} from '../services/api'

type SupplierPayment = {
  payment_id: string
  supplier_id: string | null
  po_id: string | null
  amount: number | null
  payment_method: string | null
  payment_date: string | null
  reference_number: string | null
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

type ModalMode = 'import' | 'view' | null

const TEMPLATE_HEADERS = ['Supplier Name', 'Contact Name', 'Phone', 'Email', 'Address', 'Tax Number', 'Website', 'Company Registration No', 'Bank Name', 'Account Name', 'Account Number', 'Payment Terms']

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function normalizeHeader(name: string): string {
  const lower = name.trim().toLowerCase()
  const map: Record<string, string> = {
    'supplier name': 'Supplier Name', name: 'Supplier Name', company: 'Supplier Name',
    'contact name': 'Contact Name', contact: 'Contact Name',
    phone: 'Phone', telephone: 'Phone', mobile: 'Phone',
    email: 'Email',
    address: 'Address',
    'tax number': 'Tax Number', tax: 'Tax Number',
    website: 'Website', 'company registration': 'Company Registration No', 'registration no': 'Company Registration No',
    'bank name': 'Bank Name', bank: 'Bank Name',
    'account name': 'Account Name', 'account holder': 'Account Name',
    'account number': 'Account Number', account: 'Account Number',
    'payment terms': 'Payment Terms', terms: 'Payment Terms',
  }
  return map[lower] || name.trim()
}

export default function SuppliersPage() {
  const { toast } = useToast()
  const { hasPermission } = useAuth()
  const [items, setItems] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [formError, setFormError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const [modal, setModal] = useState<ModalMode>(null)
  const [viewing, setViewing] = useState<Supplier | null>(null)
  const [viewPayments, setViewPayments] = useState<SupplierPayment[]>([])
  const [viewPaymentsLoading, setViewPaymentsLoading] = useState(false)
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)
  const [importFailures, setImportFailures] = useState<{ row: number; name: string; reason: string }[]>([])
  const [importDone, setImportDone] = useState(0)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const [showImportMenu, setShowImportMenu] = useState(false)
  const importMenuRef = useRef<HTMLDivElement>(null)

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'Cash', payment_date: new Date().toISOString().slice(0, 10), reference_number: '' })
  const [paymentError, setPaymentError] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentFocused, setPaymentFocused] = useState(false)

  const [showPaymentReceipt, setShowPaymentReceipt] = useState(false)
  const [lastPayment, setLastPayment] = useState<SupplierPayment | null>(null)
  const [receiptBusinessInfo, setReceiptBusinessInfo] = useState<BusinessInfo>({})
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm')

  const [form, setForm] = useState({
    supplier_name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    company_registration_no: '',
    tax_number: '',
    website: '',
    bank_name: '',
    account_name: '',
    account_number: '',
    payment_terms: '',
  })

  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { page, limit }
      if (search) body.q = search
      const res = await getSuppliers(body)
      const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      setItems(data)
      setTotal(res?.total ?? data.length)
    } catch {
      setItems([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false)
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) setShowImportMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!lastPayment) { setQrDataUrl(null); return }
    const cur = receiptBusinessInfo.currency || 'GHS'
    const text = `Supplier Payment\nSupplier: ${viewing?.supplier_name ?? ''}\nAmount: ${cur} ${Number(lastPayment.amount ?? 0).toFixed(2)}\nMethod: ${lastPayment.payment_method ?? ''}\nDate: ${lastPayment.payment_date ?? ''}\nRef: ${lastPayment.reference_number ?? ''}`
    QRCode.toDataURL(text, { width: 200, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null))
  }, [lastPayment, receiptBusinessInfo.currency])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm({ supplier_name: '', contact_name: '', phone: '', email: '', address: '', company_registration_no: '', tax_number: '', website: '', bank_name: '', account_name: '', account_number: '', payment_terms: '' })
    setFormError('')
  }

  function openCreate() {
    setEditing(null)
    resetForm()
    setShowForm(true)
  }

  function openEdit(s: Supplier) {
    setEditing(s)
    setForm({
      supplier_name: s.supplier_name ?? '',
      contact_name: s.contact_name ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      address: s.address ?? '',
      company_registration_no: s.company_registration_no ?? '',
      tax_number: s.tax_number ?? '',
      website: s.website ?? '',
      bank_name: s.bank_name ?? '',
      account_name: s.account_name ?? '',
      account_number: s.account_number ?? '',
      payment_terms: s.payment_terms ?? '',
    })
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    resetForm()
  }

  function openView(s: Supplier) {
    setViewing(s)
    setModal('view')
    setViewPaymentsLoading(true)
    getSupplierPayments(s.supplier_id)
      .then((res) => setViewPayments(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []))
      .catch(() => setViewPayments([]))
      .finally(() => setViewPaymentsLoading(false))
  }

  function closeView() {
    setViewing(null)
    setModal(null)
    setShowPaymentModal(false)
    setShowPaymentReceipt(false)
    setLastPayment(null)
    setQrDataUrl(null)
  }

  async function handleRecordPayment() {
    if (!viewing) return
    const amt = parseFloat(paymentForm.amount)
    if (!amt || amt <= 0) {
      setPaymentError('Amount must be a positive number.')
      return
    }
    if (paymentForm.payment_date && new Date(paymentForm.payment_date) > new Date()) {
      setPaymentError('Payment date cannot be in the future.')
      return
    }
    setPaymentError('')
    setPaymentLoading(true)
    try {
      const res = await createSupplierPayment({
        supplier_id: viewing.supplier_id,
        amount: amt,
        payment_method: paymentForm.payment_method || null,
        payment_date: paymentForm.payment_date ? new Date(paymentForm.payment_date).toISOString() : undefined,
        reference_number: paymentForm.reference_number.trim() || null,
      })
      const created: SupplierPayment = res?.data ?? res
      toast('Payment recorded', 'success')
      setLastPayment(created)
      setShowPaymentModal(false)
      setPaymentForm({ amount: '', payment_method: 'Cash', payment_date: new Date().toISOString().slice(0, 10), reference_number: '' })
      setShowPaymentReceipt(true)
      getBusinessSettings().then((s) => {
        const rows = s?.data
        if (Array.isArray(rows) && rows.length > 0) setReceiptBusinessInfo(rows[0])
      }).catch(() => {})
      setViewPaymentsLoading(true)
      getSupplierPayments(viewing.supplier_id)
        .then((res) => setViewPayments(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []))
        .catch(() => setViewPayments([]))
        .finally(() => setViewPaymentsLoading(false))
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data
        : undefined
      const msg = data?.message ?? 'Failed to record payment'
      setPaymentError(msg)
      toast(msg, 'error')
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.supplier_name.trim()) {
      setFormError('Supplier name is required.')
      return
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError('Please enter a valid email address.')
      return
    }
    setFormError('')
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          supplier_name: form.supplier_name.trim(),
          contact_name: form.contact_name.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          company_registration_no: form.company_registration_no.trim() || null,
          tax_number: form.tax_number.trim() || null,
          website: form.website.trim() || null,
          bank_name: form.bank_name.trim() || null,
          account_name: form.account_name.trim() || null,
          account_number: form.account_number.trim() || null,
          payment_terms: form.payment_terms.trim() || null,
        }
        await updateSupplier(editing.supplier_id, body)
        toast('Supplier updated', 'success')
      } else {
        const body: Record<string, unknown> = {
          supplier_name: form.supplier_name.trim(),
          contact_name: form.contact_name.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          company_registration_no: form.company_registration_no.trim() || undefined,
          tax_number: form.tax_number.trim() || undefined,
          website: form.website.trim() || undefined,
          bank_name: form.bank_name.trim() || undefined,
          account_name: form.account_name.trim() || undefined,
          account_number: form.account_number.trim() || undefined,
          payment_terms: form.payment_terms.trim() || undefined,
        }
        await createSupplier(body)
        toast('Supplier created', 'success')
      }
      closeForm()
      load()
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; errors?: Array<{ msg: string }> } } }).response?.data
        : undefined
      const msg = data?.errors?.length
        ? data.errors.map((e) => e.msg).join('; ')
        : data?.message ?? 'Save failed'
      setFormError(msg)
      toast(msg, 'error')
    }
  }

  async function handleToggle(s: Supplier) {
    setActionLoading(s.supplier_id)
    try {
      if (s.is_active) {
        await deleteSupplier(s.supplier_id)
        toast('Supplier deactivated', 'success')
      } else {
        await activateSupplier(s.supplier_id)
        toast('Supplier activated', 'success')
      }
      load()
    } catch {
      toast('Failed to update supplier status', 'error')
    }
    setActionLoading(null)
  }

  // ---- Import ----

  async function handleFileImport(file: File) {
    setImportFileName(file.name)
    try {
      const buf = await readFileAsArrayBuffer(file)
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (!raw.length) {
        toast('File is empty', 'error')
        return
      }
      const normalized = raw.map((row) => {
        const out: Record<string, unknown> = {}
        for (const key of Object.keys(row)) {
          out[normalizeHeader(key)] = row[key]
        }
        return out
      })
      setImportRows(normalized)
      setImportFailures([])
      setImportDone(0)
      setModal('import')
    } catch {
      toast('Failed to parse file. Use XLSX or CSV.', 'error')
    }
  }

  async function confirmImport() {
    setImporting(true)
    setImportProgress({ done: 0, total: importRows.length })
    const failures: { row: number; name: string; reason: string }[] = []
    let done = 0

    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i]
      const name = String(row['Supplier Name'] ?? '').trim()
      if (!name) {
        failures.push({ row: i + 2, name: '(empty)', reason: 'Supplier name is required' })
        done++
        setImportProgress({ done, total: importRows.length })
        continue
      }

      try {
        const body: Record<string, unknown> = { supplier_name: name }
        const contact = String(row['Contact Name'] ?? '').trim()
        if (contact) body.contact_name = contact
        const ph = String(row['Phone'] ?? '').trim()
        if (ph) body.phone = ph
        const em = String(row['Email'] ?? '').trim()
        if (em) body.email = em
        const addr = String(row['Address'] ?? '').trim()
        if (addr) body.address = addr
        const taxNum = String(row['Tax Number'] ?? '').trim()
        if (taxNum) body.tax_number = taxNum
        const web = String(row['Website'] ?? '').trim()
        if (web) body.website = web
        const regNum = String(row['Company Registration No'] ?? '').trim()
        if (regNum) body.company_registration_no = regNum
        const bank = String(row['Bank Name'] ?? '').trim()
        if (bank) body.bank_name = bank
        const acctName = String(row['Account Name'] ?? '').trim()
        if (acctName) body.account_name = acctName
        const acctNum = String(row['Account Number'] ?? '').trim()
        if (acctNum) body.account_number = acctNum
        const terms = String(row['Payment Terms'] ?? '').trim()
        if (terms) body.payment_terms = terms

        await createSupplier(body)
        done++
        setImportDone(done)
      } catch (err: unknown) {
        const msg = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Create failed'
          : 'Create failed'
        failures.push({ row: i + 2, name, reason: msg })
        done++
      }
      setImportProgress({ done, total: importRows.length })
    }

    setImportFailures(failures)
    setImporting(false)
    if (failures.length === 0) {
      toast(`Imported ${importRows.length} supplier${importRows.length !== 1 ? 's' : ''}`, 'success')
      setModal(null)
      load()
    }
  }

  // ---- Export ----

  async function fetchAllForExport(): Promise<Supplier[]> {
    const res = await getSuppliers({ limit: 10000, page: 1 })
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
  }

  function exportXLSX() {
    fetchAllForExport().then((data) => {
      const rows = data.map((s) => ({
        'Supplier Name': s.supplier_name ?? '',
        'Contact Name': s.contact_name ?? '',
        Phone: s.phone ?? '',
        Email: s.email ?? '',
        Address: s.address ?? '',
        'Company Registration No': s.company_registration_no ?? '',
        'Tax Number': s.tax_number ?? '',
        Website: s.website ?? '',
        'Bank Name': s.bank_name ?? '',
        'Account Name': s.account_name ?? '',
        'Account Number': s.account_number ?? '',
        'Payment Terms': s.payment_terms ?? '',
        Status: s.is_active ? 'Active' : 'Inactive',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Suppliers')
      XLSX.writeFile(wb, `suppliers-${new Date().toISOString().slice(0, 10)}.xlsx`)
      setShowExportMenu(false)
      toast('Exported XLSX', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  function exportCSV() {
    fetchAllForExport().then((data) => {
      const rows = data.map((s) => ({
        'Supplier Name': s.supplier_name ?? '',
        'Contact Name': s.contact_name ?? '',
        Phone: s.phone ?? '',
        Email: s.email ?? '',
        Address: s.address ?? '',
        'Tax Number': s.tax_number ?? '',
        Website: s.website ?? '',
        'Bank Name': s.bank_name ?? '',
        'Account Name': s.account_name ?? '',
        'Account Number': s.account_number ?? '',
        'Payment Terms': s.payment_terms ?? '',
        Status: s.is_active ? 'Active' : 'Inactive',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setShowExportMenu(false)
      toast('Exported CSV', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  function exportPDF() {
    fetchAllForExport().then((data) => {
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(16)
      doc.text('Suppliers Report', 14, 20)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)
      autoTable(doc, {
        startY: 34,
        head: [['Supplier Name', 'Contact', 'Phone', 'Email', 'Payment Terms', 'Status']],
        body: data.map((s) => [
          s.supplier_name ?? '',
          s.contact_name ?? '',
          s.phone ?? '',
          s.email ?? '',
          s.payment_terms ?? '',
          s.is_active ? 'Active' : 'Inactive',
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      })
      doc.save(`suppliers-${new Date().toISOString().slice(0, 10)}.pdf`)
      setShowExportMenu(false)
      toast('Exported PDF', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([], { header: TEMPLATE_HEADERS })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Suppliers Template')
    XLSX.writeFile(wb, 'suppliers-template.xlsx')
    setShowExportMenu(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Suppliers</h1>
          <p className="page-subtitle">{total} supplier{total !== 1 ? 's' : ''} total</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {hasPermission('MANAGE_SUPPLIERS') && (
          <div ref={importMenuRef} style={{ position: 'relative' }}>
            <button type="button" className="btn btn--ghost" onClick={() => setShowImportMenu(!showImportMenu)}>Import</button>
            {showImportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-lg)', zIndex: 20, minWidth: 180, overflow: 'hidden' }}>
                <label style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
                  Import XLSX / CSV
                  <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setShowImportMenu(false); handleFileImport(f) }; e.target.value = '' }} />
                </label>
              </div>
            )}
          </div>
          )}
          {hasPermission('VIEW_SUPPLIERS') && (
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button type="button" className="btn btn--ghost" onClick={() => setShowExportMenu(!showExportMenu)}>Export</button>
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
                <button type="button" style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-4)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }} onClick={() => { downloadTemplate(); setShowExportMenu(false) }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Download Template
                </button>
              </div>
            )}
          </div>
          )}
          {hasPermission('MANAGE_SUPPLIERS') && (
          <button type="button" className="btn btn--primary" onClick={openCreate}>+ Add Supplier</button>
          )}
        </div>
      </div>

      <div className="glass-card">
        <div className="search-input" style={{ marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>

        {loading ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Supplier Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody><tr key="loading"><td colSpan={6}><div className="skeleton skeleton--row" /></td></tr></tbody>
            </table>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.35, marginBottom: 8 }}><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>
            <p>No suppliers yet.</p>
            <button type="button" className="btn btn--primary" style={{ marginTop: 8 }} onClick={openCreate}>Add Supplier</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.supplier_id} style={{ opacity: s.is_active ? 1 : 0.5 }}>
                    <td><strong>{s.supplier_name || '—'}</strong></td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.contact_name || '—'}</td>
                    <td>{s.phone ? <a href={`tel:${s.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{s.phone}</a> : '—'}</td>
                    <td>{s.email ? <a href={`mailto:${s.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{s.email}</a> : '—'}</td>
                    <td><span className={`badge ${s.is_active ? 'badge--success' : 'badge--danger'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button type="button" onClick={() => openView(s)}
                          className="btn btn--ghost" style={{ padding: '2px 8px', fontSize: 12 }}>
                          View
                        </button>
                        {hasPermission('MANAGE_SUPPLIERS') && (
                        <>
                          <button type="button" onClick={() => openEdit(s)}
                            className="btn btn--ghost" style={{ padding: '2px 8px', fontSize: 12 }}>
                            Edit
                          </button>
                          <label className="branch-toggle" title={s.is_active ? 'Deactivate' : 'Activate'}>
                            <input type="checkbox" checked={s.is_active} disabled={actionLoading === s.supplier_id} onChange={() => setConfirmAction({
                              message: s.is_active ? `Deactivate "${s.supplier_name}"?` : `Activate "${s.supplier_name}"?`,
                              onConfirm: () => { setConfirmAction(null); handleToggle(s) },
                            })} />
                            <span className="branch-toggle__track"><span className="branch-toggle__thumb" /></span>
                          </label>
                        </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
            <button type="button" className="btn btn--ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      {/* ---- Create / Edit Form Modal ---- */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" style={{ maxWidth: 600, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{editing ? 'Edit Supplier' : 'Add Supplier'}</h3>

            {formError && <div className="auth-feedback auth-feedback--error" style={{ marginBottom: 12 }}>{formError}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', maxHeight: '500px' }}>
              <div className="field">
                <span>Supplier Name *</span>
                <input value={form.supplier_name} onChange={(e) => set('supplier_name', e.target.value)} placeholder="e.g. Acme Supplies Ltd" autoFocus />
              </div>
              <div className="field">
                <span>Contact Name</span>
                <input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} placeholder="Primary contact person" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                <div className="field">
                  <span>Phone</span>
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Phone number" />
                </div>
                <div className="field">
                  <span>Email</span>
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Email address" />
                </div>
              </div>
              <div className="field">
                <span>Address</span>
                <input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Full address" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                <div className="field">
                  <span>Company Registration No</span>
                  <input value={form.company_registration_no} onChange={(e) => set('company_registration_no', e.target.value)} placeholder="Optional" />
                </div>
                <div className="field">
                  <span>Tax Number</span>
                  <input value={form.tax_number} onChange={(e) => set('tax_number', e.target.value)} placeholder="Optional" />
                </div>
                <div className="field">
                  <span>Website</span>
                  <input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>Banking Details</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                  <div className="field">
                    <span>Bank Name</span>
                    <input value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="field">
                    <span>Account Name</span>
                    <input value={form.account_name} onChange={(e) => set('account_name', e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="field">
                    <span>Account Number</span>
                    <input value={form.account_number} onChange={(e) => set('account_number', e.target.value)} placeholder="Optional" />
                  </div>
                </div>
              </div>
              <div className="field">
                <span>Payment Terms</span>
                <input value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} placeholder="e.g. Net 30, COD" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <button type="button" className="btn btn--ghost" onClick={closeForm}>Cancel</button>
                <button type="submit" className="btn btn--primary">{editing ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Import Modal ---- */}
      {modal === 'import' && (
        <div className="modal-overlay" onClick={() => { if (!importing) setModal(null) }}>
          <div className="modal" style={{ maxWidth: 600, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Import Suppliers — {importFileName}</h3>

            {importing ? (
              <div>
                <p style={{ marginBottom: 8, fontSize: 'var(--text-body)' }}>Importing… {importProgress?.done ?? 0} of {importProgress?.total ?? 0}</p>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 999, transition: 'width 200ms', width: `${importProgress ? (importProgress.done / importProgress.total) * 100 : 0}%` }} />
                </div>
              </div>
            ) : importFailures.length > 0 ? (
              <div>
                <p style={{ marginBottom: 8 }}>Imported {importDone - importFailures.length} of {importRows.length}. {importFailures.length} failed:</p>
                <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <table className="data-table" style={{ fontSize: 13 }}>
                    <thead><tr><th>Row</th><th>Name</th><th>Reason</th></tr></thead>
                    <tbody>{importFailures.map((f) => <tr key={f.row}><td>{f.row}</td><td>{f.name}</td><td style={{ color: 'var(--danger)' }}>{f.reason}</td></tr>)}</tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Close</button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: 12 }}>Preview {importRows.length} rows to import:</p>
                <div style={{ maxHeight: 250, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <table className="data-table" style={{ fontSize: 13 }}>
                    <thead><tr><th>#</th><th>Supplier Name</th><th>Contact</th><th>Phone</th><th>Email</th></tr></thead>
                    <tbody>{importRows.map((r, i) => (
                      <tr key={i}><td>{i + 1}</td><td>{String(r['Supplier Name'] ?? '')}</td><td>{String(r['Contact Name'] ?? '')}</td><td>{String(r['Phone'] ?? '')}</td><td>{String(r['Email'] ?? '')}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button type="button" className="btn btn--primary" onClick={confirmImport}>Import {importRows.length} Rows</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- View Modal ---- */}
      {modal === 'view' && viewing && (() => {
        const s = viewing
        return (
          <div className="modal-overlay" onClick={closeView}>
            <div className="modal" style={{ maxWidth: 600, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{s.supplier_name || 'Supplier'}</h3>
                  <span className={`badge ${s.is_active ? 'badge--success' : 'badge--danger'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <button type="button" className="btn btn--ghost" onClick={closeView} style={{ flexShrink: 0, padding: '4px 8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>

              <div style={{ padding: 'var(--space-6)', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 'var(--space-5)', border: '1px solid var(--border)', marginBottom: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-body)' }}>
                    {s.contact_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        <span style={{ color: 'var(--text-primary)' }}>{s.contact_name}</span>
                      </div>
                    )}
                    {s.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                        <a href={`tel:${s.phone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{s.phone}</a>
                      </div>
                    )}
                    {s.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                        <a href={`mailto:${s.email}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{s.email}</a>
                      </div>
                    )}
                    {s.address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span style={{ color: 'var(--text-primary)' }}>{s.address}</span>
                      </div>
                    )}
                    {s.website && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                        <a href={s.website.startsWith('http') ? s.website : `https://${s.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{s.website}</a>
                      </div>
                    )}
                    {!s.contact_name && !s.phone && !s.email && !s.address && !s.website && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-caption)' }}>No contact information available</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Reg. Number</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{s.company_registration_no || '—'}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Tax Number</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{s.tax_number || '—'}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Payment Terms</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{s.payment_terms || '—'}</div>
                  </div>
                </div>

                {(s.bank_name || s.account_name || s.account_number) && (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 'var(--space-4)', border: '1px solid var(--border)', marginBottom: 'var(--space-5)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)', display: 'block', marginBottom: 8 }}>Banking Details</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)', fontSize: 13 }}>
                      <div><span style={{ color: 'var(--text-secondary)' }}>Bank</span><div style={{ marginTop: 2 }}>{s.bank_name || '—'}</div></div>
                      <div><span style={{ color: 'var(--text-secondary)' }}>Account Name</span><div style={{ marginTop: 2 }}>{s.account_name || '—'}</div></div>
                      <div><span style={{ color: 'var(--text-secondary)' }}>Account Number</span><div style={{ marginTop: 2 }}>{s.account_number || '—'}</div></div>
                    </div>
                  </div>
                )}

                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 'var(--space-4)', border: '1px solid var(--border)', marginBottom: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Payment History</span>
                    {hasPermission('MANAGE_SUPPLIERS') && (
                      <button type="button" className="btn btn--primary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setShowPaymentModal(true)}>Record Payment</button>
                    )}
                  </div>
                  {viewPaymentsLoading ? (
                    <div className="skeleton skeleton--row" />
                  ) : viewPayments.length === 0 ? (
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>No payments yet.</span>
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
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.amount != null ? Number(p.amount).toFixed(2) : '—'}</td>
                              <td>{p.payment_method || '—'}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{p.reference_number || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {s.created_at && (
                  <div style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)', fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>
                    Created: {new Date(s.created_at).toLocaleDateString()}
                    {s.updated_at && <span> &middot; Updated: {new Date(s.updated_at).toLocaleDateString()}</span>}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border)' }}>
                {hasPermission('MANAGE_SUPPLIERS') && (
                  <button type="button" className="btn btn--ghost" onClick={() => { closeView(); openEdit(s) }}>Edit</button>
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
          <div className="modal" style={{ maxWidth: 480, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>Record Payment</h3>
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>to {viewing.supplier_name}</div>
                </div>
              </div>
            </div>

            <div style={{ padding: 'var(--space-5) var(--space-6)' }}>
              {paymentError && <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)' }}>{paymentError}</div>}

                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Amount *</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: paymentFocused ? 'var(--primary)' : 'var(--border)', borderRadius: 'var(--radius-input)', background: 'var(--bg)', overflow: 'hidden', boxShadow: paymentFocused ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none', transition: 'border-color 150ms ease, box-shadow 150ms ease' }}>
                    <span style={{ padding: '0 12px', fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)', borderRight: '1px solid var(--border)' }}>{receiptBusinessInfo.currency || 'GHS'}</span>
                    <input type="number" step="0.01" min="0" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" autoFocus
                      onFocus={() => setPaymentFocused(true)} onBlur={() => setPaymentFocused(false)}
                      style={{ flex: 1, border: 'none', background: 'transparent', padding: '14px 16px', fontSize: 22, fontWeight: 700, outline: 'none', fontFamily: 'monospace', textAlign: 'right' }} />
                  </div>
                </div>

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Payment Method</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['Cash', 'Bank Transfer', 'Check', 'Mobile Money', 'Credit Card', 'Other'].map((m) => (
                    <button key={m} type="button"
                      onClick={() => setPaymentForm((p) => ({ ...p, payment_method: m }))}
                      style={{
                        padding: '6px 14px', borderRadius: 20, border: '1px solid',
                        borderColor: paymentForm.payment_method === m ? 'var(--primary)' : 'var(--border)',
                        background: paymentForm.payment_method === m ? 'var(--primary)' : 'transparent',
                        color: paymentForm.payment_method === m ? '#fff' : 'var(--text-primary)',
                        fontSize: 13, cursor: 'pointer', fontWeight: paymentForm.payment_method === m ? 600 : 400,
                        transition: 'all 0.15s',
                      }}
                    >{m}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div>
                  <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Date</label>
                  <input type="date" className="input" value={paymentForm.payment_date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Reference Number</label>
                  <input type="text" className="input" value={paymentForm.reference_number} onChange={(e) => setPaymentForm((p) => ({ ...p, reference_number: e.target.value }))} placeholder="Optional" />
                </div>
              </div>

              {paymentForm.amount && parseFloat(paymentForm.amount) > 0 && (
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Paying</span>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>{receiptBusinessInfo.currency || 'GHS'} {parseFloat(paymentForm.amount).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setShowPaymentModal(false)}>Cancel</button>
              <button type="button" className="btn btn--primary" disabled={paymentLoading || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0} onClick={handleRecordPayment}>{paymentLoading ? 'Saving...' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Payment Receipt Modal ---- */}
      {showPaymentReceipt && lastPayment && (
        <div className="modal-overlay" onClick={() => { setShowPaymentReceipt(false); setLastPayment(null); setQrDataUrl(null) }}>
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" width="28" height="28"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: 20 }}>Payment Recorded!</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px', fontSize: 14 }}>to {viewing?.supplier_name}</p>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
                <span style={{ fontWeight: 600 }}>{Number(lastPayment.amount ?? 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Method</span>
                <span>{lastPayment.payment_method ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Date</span>
                <span>{lastPayment.payment_date ? new Date(lastPayment.payment_date).toLocaleDateString() : '—'}</span>
              </div>
              {lastPayment.reference_number && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Reference</span>
                  <span>{lastPayment.reference_number}</span>
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
                onClick={() => window.print()}
                className="btn btn--ghost"
                style={{ textAlign: 'center', flex: 1, padding: '12px 0', fontSize: 15, border: '1px solid var(--border)' }}
              >
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => { setShowPaymentReceipt(false); setLastPayment(null); setQrDataUrl(null) }}
                className="btn btn--primary"
                style={{ textAlign: 'center', flex: 1, padding: '12px 0', fontSize: 15 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Hidden Receipt (printed via window.print) ---- */}
      <div id="receipt-print">
        <div className={`receipt receipt-${paperSize === '58mm' ? '58' : '80'}`}>
          <div className="receipt-header">
            {receiptBusinessInfo.logo && (
              <img src={resolveImageUrl(receiptBusinessInfo.logo)} alt="" className="receipt-logo" />
            )}
            <div className="receipt-business-name">{receiptBusinessInfo.business_name || 'Your Store'}</div>
            {receiptBusinessInfo.address && <div className="receipt-meta">{receiptBusinessInfo.address}</div>}
            {receiptBusinessInfo.phone && <div className="receipt-meta">{receiptBusinessInfo.phone}</div>}
            {receiptBusinessInfo.tax_number && <div className="receipt-meta">TIN: {receiptBusinessInfo.tax_number}</div>}
            {receiptBusinessInfo.registration_number && <div className="receipt-meta">Reg: {receiptBusinessInfo.registration_number}</div>}
          </div>

          <div className="receipt-section" style={{ textAlign: 'center', borderTop: 'none', paddingBottom: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supplier Payment Receipt</div>
          </div>

          {lastPayment && (
            <div className="receipt-section">
              <div className="receipt-row">
                <span>Supplier</span>
                <span>{viewing?.supplier_name ?? '—'}</span>
              </div>
              <div className="receipt-row">
                <span>Date</span>
                <span>{lastPayment.payment_date ? new Date(lastPayment.payment_date).toLocaleDateString() : '—'}</span>
              </div>
              <div className="receipt-row">
                <span>Method</span>
                <span>{lastPayment.payment_method ?? '—'}</span>
              </div>
              {lastPayment.reference_number && (
                <div className="receipt-row">
                  <span>Reference</span>
                  <span>{lastPayment.reference_number}</span>
                </div>
              )}
            </div>
          )}

          {lastPayment && (
            <div className="receipt-section receipt-totals">
              <div className="receipt-row receipt-total-row">
                <span>Amount Paid</span>
                <span>{(receiptBusinessInfo.currency || 'GHS')} {Number(lastPayment.amount ?? 0).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="receipt-barcode">
            {qrDataUrl ? (
              <img src={qrDataUrl} style={{ width: paperSize === '58mm' ? 80 : 120, height: 'auto' }} />
            ) : null}
          </div>

          {receiptBusinessInfo.receipt_footer && (
            <div className="receipt-footer">{receiptBusinessInfo.receipt_footer}</div>
          )}
          <div className="receipt-thankyou">Thank you!</div>
        </div>
      </div>

      {confirmAction && (
        <ConfirmModal
          open
          title="Confirm"
          message={confirmAction.message}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
