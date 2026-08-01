import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  activateCustomer,
  getCustomerPaymentsByCustomer,
  type Customer,
  type CustomerPayment,
} from '../services/api'

type ModalMode = 'import' | 'view' | null

const CUSTOMER_TYPES = ['WALK_IN', 'RETAIL', 'WHOLESALE'] as const
const GENDERS = ['Male', 'Female', 'Other'] as const

const TEMPLATE_HEADERS = ['Business Name', 'Contact Name', 'Phone', 'Email', 'Address', 'Customer Type', 'Credit Limit', 'Tax Number', 'Gender', 'Notes']

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
    'business name': 'Business Name', name: 'Business Name', 'customer name': 'Business Name',
    'contact name': 'Contact Name', contact: 'Contact Name',
    phone: 'Phone', telephone: 'Phone', mobile: 'Phone',
    email: 'Email',
    address: 'Address',
    'customer type': 'Customer Type', type: 'Customer Type',
    'credit limit': 'Credit Limit', credit: 'Credit Limit',
    'tax number': 'Tax Number', tax: 'Tax Number',
    gender: 'Gender',
    notes: 'Notes', note: 'Notes',
  }
  return map[lower] || name.trim()
}

export default function CustomersPage() {
  const { toast } = useToast()
  const { hasPermission } = useAuth()
  const [items, setItems] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [formError, setFormError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [modal, setModal] = useState<ModalMode>(null)
  const [viewing, setViewing] = useState<Customer | null>(null)
  const [viewPayments, setViewPayments] = useState<CustomerPayment[]>([])
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

  const [form, setForm] = useState({
    customer_type: 'WALK_IN',
    business_name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: '',
    tax_number: '',
    date_of_birth: '',
    gender: '',
    notes: '',
    loyalty_points: '',
  })

  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { page, limit }
      if (search) body.q = search
      const res = await getCustomers(body)
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

  const totalPages = Math.max(1, Math.ceil(total / limit))

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm({ customer_type: 'WALK_IN', business_name: '', contact_name: '', phone: '', email: '', address: '', credit_limit: '', tax_number: '', date_of_birth: '', gender: '', notes: '', loyalty_points: '' })
    setFormError('')
  }

  function openCreate() {
    setEditing(null)
    resetForm()
    setShowForm(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({
      customer_type: c.customer_type || 'WALK_IN',
      business_name: c.business_name ?? '',
      contact_name: c.contact_name ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      credit_limit: c.credit_limit != null ? String(c.credit_limit) : '',
      tax_number: c.tax_number ?? '',
      date_of_birth: c.date_of_birth ? c.date_of_birth.slice(0, 10) : '',
      gender: c.gender ?? '',
      notes: c.notes ?? '',
      loyalty_points: c.loyalty_points != null ? String(c.loyalty_points) : '',
    })
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    resetForm()
  }

  function openView(c: Customer) {
    setViewing(c)
    setModal('view')
    setViewPaymentsLoading(true)
    getCustomerPaymentsByCustomer(c.customer_id)
      .then((res) => setViewPayments(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []))
      .catch(() => setViewPayments([]))
      .finally(() => setViewPaymentsLoading(false))
  }

  function closeView() {
    setViewing(null)
    setModal(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.business_name.trim()) {
      setFormError('Business name is required.')
      return
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError('Please enter a valid email address.')
      return
    }
    if (form.date_of_birth && new Date(form.date_of_birth) > new Date()) {
      setFormError('Date of Birth cannot be in the future.')
      return
    }
    setFormError('')
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          customer_type: form.customer_type,
          business_name: form.business_name.trim(),
          contact_name: form.contact_name.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          credit_limit: form.credit_limit ? Number(form.credit_limit) : 0,
          tax_number: form.tax_number.trim() || null,
          date_of_birth: form.date_of_birth || null,
          gender: form.gender || null,
          notes: form.notes.trim() || null,
        }
        await updateCustomer(editing.customer_id, body)
        toast('Customer updated', 'success')
      } else {
        const body: Record<string, unknown> = {
          customer_name: form.business_name.trim(),
          contact_person: form.contact_name.trim() || undefined,
          phone: form.phone.trim() || undefined,
          contact_email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
        }
        await createCustomer(body)
        toast('Customer created', 'success')
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

  async function handleToggle(c: Customer) {
    setActionLoading(c.customer_id)
    try {
      if (c.is_active) {
        await deleteCustomer(c.customer_id)
        toast('Customer deactivated', 'success')
      } else {
        await activateCustomer(c.customer_id)
        toast('Customer activated', 'success')
      }
      load()
    } catch {
      toast('Failed to update customer status', 'error')
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
      const name = String(row['Business Name'] ?? '').trim()
      if (!name) {
        failures.push({ row: i + 2, name: '(empty)', reason: 'Business name is required' })
        done++
        setImportProgress({ done, total: importRows.length })
        continue
      }

      try {
        const body: Record<string, unknown> = { customer_name: name }
        const contact = String(row['Contact Name'] ?? '').trim()
        if (contact) body.contact_person = contact
        const ph = String(row['Phone'] ?? '').trim()
        if (ph) body.phone = ph
        const em = String(row['Email'] ?? '').trim()
        if (em) body.contact_email = em
        const addr = String(row['Address'] ?? '').trim()
        if (addr) body.address = addr

        await createCustomer(body)
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
      toast(`Imported ${importRows.length} customer${importRows.length !== 1 ? 's' : ''}`, 'success')
      setModal(null)
      load()
    }
  }

  // ---- Export ----

  async function fetchAllForExport(): Promise<Customer[]> {
    const res = await getCustomers({ limit: 10000, page: 1 })
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
  }

  function exportXLSX() {
    fetchAllForExport().then((data) => {
      const rows = data.map((c) => ({
        'Business Name': c.business_name ?? '',
        'Contact Name': c.contact_name ?? '',
        Phone: c.phone ?? '',
        Email: c.email ?? '',
        Address: c.address ?? '',
        Type: c.customer_type,
        'Credit Limit': c.credit_limit ?? 0,
        'Tax Number': c.tax_number ?? '',
        Gender: c.gender ?? '',
        'Loyalty Points': c.loyalty_points ?? 0,
        Notes: c.notes ?? '',
        Status: c.is_active ? 'Active' : 'Inactive',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Customers')
      XLSX.writeFile(wb, `customers-${new Date().toISOString().slice(0, 10)}.xlsx`)
      setShowExportMenu(false)
      toast('Exported XLSX', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  function exportCSV() {
    fetchAllForExport().then((data) => {
      const rows = data.map((c) => ({
        'Business Name': c.business_name ?? '',
        'Contact Name': c.contact_name ?? '',
        Phone: c.phone ?? '',
        Email: c.email ?? '',
        Address: c.address ?? '',
        Type: c.customer_type,
        'Credit Limit': c.credit_limit ?? 0,
        'Tax Number': c.tax_number ?? '',
        Gender: c.gender ?? '',
        Notes: c.notes ?? '',
        Status: c.is_active ? 'Active' : 'Inactive',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`
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
      doc.text('Customers Report', 14, 20)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)
      autoTable(doc, {
        startY: 34,
        head: [['Business Name', 'Contact', 'Phone', 'Email', 'Type', 'Credit Limit', 'Status']],
        body: data.map((c) => [
          c.business_name ?? '',
          c.contact_name ?? '',
          c.phone ?? '',
          c.email ?? '',
          c.customer_type,
          String(c.credit_limit ?? 0),
          c.is_active ? 'Active' : 'Inactive',
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      })
      doc.save(`customers-${new Date().toISOString().slice(0, 10)}.pdf`)
      setShowExportMenu(false)
      toast('Exported PDF', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([], { header: TEMPLATE_HEADERS })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Customers Template')
    XLSX.writeFile(wb, 'customers-template.xlsx')
    setShowExportMenu(false)
  }

  const TYPE_BADGE: Record<string, string> = { WALK_IN: 'info', RETAIL: 'success', WHOLESALE: 'warning' }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p className="page-subtitle">{total} customer{total !== 1 ? 's' : ''} total</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {hasPermission('MANAGE_CUSTOMERS') && (
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
          {hasPermission('VIEW_CUSTOMERS') && (
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
          {hasPermission('MANAGE_CUSTOMERS') && (
          <button type="button" className="btn btn--primary" onClick={openCreate}>+ Add Customer</button>
          )}
        </div>
      </div>

      <div className="glass-card">
        <div className="search-input" style={{ marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" placeholder="Search by business name or contact..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>

        {loading ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Business Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Type</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody><tr key="loading"><td colSpan={7}><div className="skeleton skeleton--row" /></td></tr></tbody>
            </table>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.35, marginBottom: 8 }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
            <p>No customers yet.</p>
            <button type="button" className="btn btn--primary" style={{ marginTop: 8 }} onClick={openCreate}>Add Customer</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.customer_id} style={{ opacity: c.is_active ? 1 : 0.5 }}>
                    <td><strong>{c.business_name || '—'}</strong></td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.contact_name || '—'}</td>
                    <td>{c.phone ? <a href={`tel:${c.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{c.phone}</a> : '—'}</td>
                    <td>{c.email ? <a href={`mailto:${c.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{c.email}</a> : '—'}</td>
                    <td><span className={`badge badge--${TYPE_BADGE[c.customer_type] || 'info'}`}>{c.customer_type}</span></td>
                    <td><span className={`badge ${c.is_active ? 'badge--success' : 'badge--danger'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openView(c)}>View</button>
                        {hasPermission('MANAGE_CUSTOMERS') && (
                          <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openEdit(c)}>Edit</button>
                        )}
                        {hasPermission('MANAGE_CUSTOMERS') && (
                          <label className="branch-toggle" title={c.is_active ? 'Deactivate' : 'Activate'}>
                            <input type="checkbox" checked={c.is_active} disabled={actionLoading === c.customer_id} onChange={() => handleToggle(c)} />
                            <span className="branch-toggle__track"><span className="branch-toggle__thumb" /></span>
                          </label>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ color: 'var(--secondary)', fontSize: 'var(--text-caption)' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button type="button" className="btn btn--ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Create / Edit Form Modal ---- */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" style={{ maxWidth: 560, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{editing ? 'Edit Customer' : 'Add Customer'}</h3>

            {formError && <div className="auth-feedback auth-feedback--error" style={{ marginBottom: 12 }}>{formError}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', maxHeight: '500px'}}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                <div className="field">
                  <span>Customer Type *</span>
                  <select value={form.customer_type} onChange={(e) => set('customer_type', e.target.value)}>
                    {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="field">
                  <span>Gender</span>
                  <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                    <option value="">—</option>
                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <span>Business Name *</span>
                <input value={form.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="e.g. Acme Corp" autoFocus />
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
                  <span>Credit Limit</span>
                  <input type="number" step="0.01" min="0" value={form.credit_limit} onChange={(e) => set('credit_limit', e.target.value)} placeholder="0.00" />
                </div>
                <div className="field">
                  <span>Tax Number</span>
                  <input value={form.tax_number} onChange={(e) => set('tax_number', e.target.value)} placeholder="Optional" />
                </div>
                <div className="field">
                  <span>Date of Birth</span>
                  <input type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
                </div>
              </div>
              <div className="field">
                <span>Notes</span>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Additional notes" rows={2} style={{ resize: 'vertical' }} />
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
            <h3 style={{ marginBottom: 16 }}>Import Customers — {importFileName}</h3>

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
                    <thead><tr><th>#</th><th>Business Name</th><th>Contact</th><th>Phone</th><th>Email</th></tr></thead>
                    <tbody>{importRows.map((r, i) => (
                      <tr key={i}><td>{i + 1}</td><td>{String(r['Business Name'] ?? '')}</td><td>{String(r['Contact Name'] ?? '')}</td><td>{String(r['Phone'] ?? '')}</td><td>{String(r['Email'] ?? '')}</td></tr>
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
        const c = viewing
        return (
          <div className="modal-overlay" onClick={closeView}>
            <div className="modal" style={{ maxWidth: 600, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{c.business_name || 'Customer'}</h3>
                  <span className={`badge badge--${TYPE_BADGE[c.customer_type] || 'info'}`}>{c.customer_type?.replace('_', ' ')}</span>
                  <span className={`badge ${c.is_active ? 'badge--success' : 'badge--danger'}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <button type="button" className="btn btn--ghost" onClick={closeView} style={{ flexShrink: 0, padding: '4px 8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: 'var(--space-6)', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
                {/* Contact info card */}
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 'var(--space-5)', border: '1px solid var(--border)', marginBottom: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-body)' }}>
                    {c.contact_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        <span style={{ color: 'var(--text-primary)' }}>{c.contact_name}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                        <a href={`tel:${c.phone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{c.phone}</a>
                      </div>
                    )}
                    {c.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                        <a href={`mailto:${c.email}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{c.email}</a>
                      </div>
                    )}
                    {c.address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span style={{ color: 'var(--text-primary)' }}>{c.address}</span>
                      </div>
                    )}
                    {!c.contact_name && !c.phone && !c.email && !c.address && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-caption)' }}>No contact information available</span>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Credit Limit</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{c.credit_limit ?? 0}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Loyalty Points</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{c.loyalty_points ?? 0}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Tax Number</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{c.tax_number || '—'}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Date of Birth</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{c.date_of_birth ? new Date(c.date_of_birth).toLocaleDateString() : '—'}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Gender</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{c.gender || '—'}</div>
                  </div>
                </div>

                {/* Notes */}
                {c.notes && (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 'var(--space-4)', border: '1px solid var(--border)', marginBottom: 'var(--space-5)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)', display: 'block', marginBottom: 4 }}>Notes</span>
                    <div style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.notes}</div>
                  </div>
                )}

                {/* Payment History */}
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 'var(--space-4)', border: '1px solid var(--border)', marginBottom: 'var(--space-5)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)', display: 'block', marginBottom: 8 }}>Payment History</span>
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
                          </tr>
                        </thead>
                        <tbody>
                          {viewPayments.map((p) => (
                            <tr key={p.payment_id}>
                              <td style={{ whiteSpace: 'nowrap' }}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.amount != null ? Number(p.amount).toFixed(2) : '—'}</td>
                              <td>{p.payment_method || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                {c.created_at && (
                  <div style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)', fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>
                    Created: {new Date(c.created_at).toLocaleDateString()}
                    {c.updated_at && <span> &middot; Updated: {new Date(c.updated_at).toLocaleDateString()}</span>}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border)' }}>
                {hasPermission('MANAGE_CUSTOMERS') && (
                  <button type="button" className="btn btn--ghost" onClick={() => { closeView(); openEdit(c) }}>Edit</button>
                )}
                <button type="button" className="btn btn--ghost" onClick={closeView}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
