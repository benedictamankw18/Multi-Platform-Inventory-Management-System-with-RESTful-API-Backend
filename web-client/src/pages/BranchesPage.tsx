import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getBranches,
  createBranch,
  updateBranch,
  activateBranch,
  deactivateBranch,
  getUsers,
  type BranchInfo,
} from '../services/api'

type ModalMode = 'import' | 'view' | null

const TEMPLATE_HEADERS = ['Branch Name', 'Address', 'City', 'Country', 'Postal Code', 'Phone', 'Email']

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
    'branch name': 'Branch Name', name: 'Branch Name', branch: 'Branch Name',
    address: 'Address',
    city: 'City',
    country: 'Country',
    'postal code': 'Postal Code', zipcode: 'Postal Code', zip: 'Postal Code',
    phone: 'Phone', telephone: 'Phone', mobile: 'Phone',
    email: 'Email',
  }
  return map[lower] || name.trim()
}

export default function BranchesPage() {
  const { toast } = useToast()
  const { hasPermission } = useAuth()
  const [items, setItems] = useState<BranchInfo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BranchInfo | null>(null)
  const [formError, setFormError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [modal, setModal] = useState<ModalMode>(null)
  const [viewing, setViewing] = useState<BranchInfo | null>(null)
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

  // Form fields
  const [branchName, setBranchName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [managerId, setManagerId] = useState('')
  const [users, setUsers] = useState<Array<{ user_id: string; full_name: string }>>([])

  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { page, limit }
      if (search) body.q = search
      const res = await getBranches(body)
      const data = Array.isArray(res) ? res : res?.data ?? res?.branches ?? []
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
    getUsers({ limit: 1000 }).then((res) => {
      const data = Array.isArray(res) ? res : res?.data ?? res?.users ?? []
      setUsers(data)
    }).catch(() => {})
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  function resetForm() {
    setBranchName('')
    setAddress('')
    setCity('')
    setCountry('')
    setPostalCode('')
    setPhone('')
    setEmail('')
    setLatitude('')
    setLongitude('')
    setManagerId('')
    setFormError('')
  }

  function handleGetLocation() {
    if (!navigator.geolocation) {
      toast('Geolocation is not supported by your browser', 'error')
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(7))
        setLongitude(pos.coords.longitude.toFixed(7))
        setGeoLoading(false)
        toast('Location captured', 'success')
      },
      () => {
        setGeoLoading(false)
        toast('Unable to get location. Please enter manually.', 'error')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  function openCreate() {
    setEditing(null)
    resetForm()
    setShowForm(true)
  }

  function openEdit(b: BranchInfo) {
    setEditing(b)
    setBranchName(b.branch_name)
    setAddress(b.address ?? '')
    setCity(b.city ?? '')
    setCountry(b.country ?? '')
    setPostalCode(b.postal_code ?? '')
    setPhone(b.phone ?? '')
    setEmail(b.email ?? '')
    setLatitude(b.latitude != null ? String(b.latitude) : '')
    setLongitude(b.longitude != null ? String(b.longitude) : '')
    setManagerId(b.manager_id ?? '')
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    resetForm()
  }

  function openView(b: BranchInfo) {
    setViewing(b)
    setModal('view')
  }

  function closeView() {
    setViewing(null)
    setModal(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!branchName.trim()) {
      setFormError('Branch name is required.')
      return
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid email address.')
      return
    }
    setFormError('')
    try {
      const body: Record<string, unknown> = { branch_name: branchName.trim() }
      if (address.trim()) body.address = address.trim()
      if (city.trim()) body.city = city.trim()
      if (country.trim()) body.country = country.trim()
      if (postalCode.trim()) body.postal_code = postalCode.trim()
      if (phone.trim()) body.phone = phone.trim()
      if (email.trim()) body.email = email.trim()
      if (latitude.trim()) { const v = parseFloat(latitude); if (!isNaN(v)) body.latitude = v }
      if (longitude.trim()) { const v = parseFloat(longitude); if (!isNaN(v)) body.longitude = v }
      if (managerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(managerId)) body.manager_id = managerId

      if (editing) {
        await updateBranch(editing.branch_id, body)
        toast('Branch updated', 'success')
      } else {
        await createBranch(body)
        toast('Branch created', 'success')
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

  async function handleToggle(b: BranchInfo) {
    setActionLoading(b.branch_id)
    try {
      if (b.is_active) {
        await deactivateBranch(b.branch_id)
        toast('Branch deactivated', 'success')
      } else {
        await activateBranch(b.branch_id)
        toast('Branch activated', 'success')
      }
      load()
    } catch {
      toast('Failed to update branch status', 'error')
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
      const name = String(row['Branch Name'] ?? '').trim()
      if (!name) {
        failures.push({ row: i + 2, name: '(empty)', reason: 'Branch name is required' })
        done++
        setImportProgress({ done, total: importRows.length })
        continue
      }

      try {
        const body: Record<string, unknown> = { branch_name: name }
        const addr = String(row['Address'] ?? '').trim()
        if (addr) body.address = addr
        const c = String(row['City'] ?? '').trim()
        if (c) body.city = c
        const co = String(row['Country'] ?? '').trim()
        if (co) body.country = co
        const pc = String(row['Postal Code'] ?? '').trim()
        if (pc) body.postal_code = pc
        const ph = String(row['Phone'] ?? '').trim()
        if (ph) body.phone = ph
        const em = String(row['Email'] ?? '').trim()
        if (em) body.email = em

        await createBranch(body)
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
      toast(`Imported ${importRows.length} branch${importRows.length !== 1 ? 'es' : ''}`, 'success')
      setModal(null)
      load()
    }
  }

  // ---- Export ----

  async function fetchAllForExport(): Promise<BranchInfo[]> {
    const res = await getBranches({ limit: 10000, page: 1 })
    return Array.isArray(res) ? res : res?.data ?? res?.branches ?? []
  }

  function exportXLSX() {
    fetchAllForExport().then((data) => {
      const rows = data.map((b) => ({
        'Branch Name': b.branch_name,
        Address: b.address ?? '',
        City: b.city ?? '',
        Country: b.country ?? '',
        'Postal Code': b.postal_code ?? '',
        Phone: b.phone ?? '',
        Email: b.email ?? '',
        Latitude: b.latitude ?? '',
        Longitude: b.longitude ?? '',
        Status: b.is_active ? 'Active' : 'Inactive',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Branches')
      XLSX.writeFile(wb, `branches-${new Date().toISOString().slice(0, 10)}.xlsx`)
      setShowExportMenu(false)
      toast('Exported XLSX', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  function exportCSV() {
    fetchAllForExport().then((data) => {
      const rows = data.map((b) => ({
        'Branch Name': b.branch_name,
        Address: b.address ?? '',
        City: b.city ?? '',
        Country: b.country ?? '',
        'Postal Code': b.postal_code ?? '',
        Phone: b.phone ?? '',
        Email: b.email ?? '',
        Latitude: b.latitude ?? '',
        Longitude: b.longitude ?? '',
        Status: b.is_active ? 'Active' : 'Inactive',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `branches-${new Date().toISOString().slice(0, 10)}.csv`
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
      doc.text('Branches Report', 14, 20)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)
      autoTable(doc, {
        startY: 34,
        head: [['Name', 'Address', 'City', 'Country', 'Phone', 'Email', 'Status']],
        body: data.map((b) => [
          b.branch_name,
          b.address ?? '',
          b.city ?? '',
          b.country ?? '',
          b.phone ?? '',
          b.email ?? '',
          b.is_active ? 'Active' : 'Inactive',
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      })
      doc.save(`branches-${new Date().toISOString().slice(0, 10)}.pdf`)
      setShowExportMenu(false)
      toast('Exported PDF', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([], { header: TEMPLATE_HEADERS })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Branches Template')
    XLSX.writeFile(wb, 'branches-template.xlsx')
    setShowExportMenu(false)
  }

  const showFormState = showForm

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Branches</h1>
          <p className="page-subtitle">{total} branch{total !== 1 ? 'es' : ''} total</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {hasPermission('MANAGE_BRANCHES') && (
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
          {hasPermission('MANAGE_BRANCHES') && (
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
          {hasPermission('MANAGE_BRANCHES') && (
          <button type="button" className="btn btn--primary" onClick={openCreate}>+ Add Branch</button>
          )}
        </div>
      </div>

      <div className="glass-card">
        <div className="search-input" style={{ marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" placeholder="Search by name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>

        {loading ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Address / City</th><th>Phone</th><th>Email</th><th>Manager</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody><tr key="loading"><td colSpan={7}><div className="skeleton skeleton--row" /></td></tr></tbody>
            </table>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.35, marginBottom: 8 }}><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <p>No branches yet.</p>
            <button type="button" className="btn btn--primary" style={{ marginTop: 8 }} onClick={openCreate}>Add Branch</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address / City</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => {
                  const mgr = users.find((u) => u.user_id === b.manager_id)
                  const fullAddr = [b.address, b.city, b.country].filter(Boolean).join(', ')
                  return (
                    <tr key={b.branch_id} style={{ opacity: b.is_active ? 1 : 0.5 }}>
                      <td><strong>{b.branch_name}</strong></td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fullAddr || '—'}</td>
                      <td>{b.phone ? <a href={`tel:${b.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{b.phone}</a> : '—'}</td>
                      <td>{b.email ? <a href={`mailto:${b.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{b.email}</a> : '—'}</td>
                      <td>{mgr?.full_name || '—'}</td>
                      <td><span className={`badge ${b.is_active ? 'badge--success' : 'badge--danger'}`}>{b.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openView(b)}>View</button>
                          <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openEdit(b)}>Edit</button>
                          <label className="branch-toggle" title={b.is_active ? 'Deactivate' : 'Activate'}>
                            <input type="checkbox" checked={b.is_active} disabled={actionLoading === b.branch_id} onChange={() => handleToggle(b)} />
                            <span className="branch-toggle__track"><span className="branch-toggle__thumb" /></span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
      {showFormState && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" style={{ maxWidth: 500, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{editing ? 'Edit Branch' : 'Add Branch'}</h3>

            {formError && <div className="auth-feedback auth-feedback--error" style={{ marginBottom: 12 }}>{formError}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="field">
                <span>Branch Name *</span>
                <input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="e.g. Main Store" autoFocus />
              </div>
              <div className="field">
                <span>Address</span>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <span>City</span>
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                </div>
                <div className="field">
                  <span>Country</span>
                  <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
                </div>
              </div>
              <div className="field">
                <span>Postal Code</span>
                <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postal code" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <span>Phone</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
                </div>
                <div className="field">
                  <span>Email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
                </div>
              </div>
              <div className="field">
                <span>Manager</span>
                <select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
                  <option value="">— None —</option>
                  {users.map((u) => (<option key={u.user_id} value={u.user_id}>{u.full_name}</option>))}
                </select>
              </div>
              <div>
                <button type="button" className="btn btn--secondary" onClick={handleGetLocation} disabled={geoLoading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                  {geoLoading ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" /></svg>
                  )}
                  {geoLoading ? 'Getting location…' : 'Get Current Location'}
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <span>Latitude</span>
                    <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 5.6037" />
                  </div>
                  <div className="field">
                    <span>Longitude</span>
                    <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. -0.1870" />
                  </div>
                </div>
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
            <h3 style={{ marginBottom: 16 }}>Import Branches — {importFileName}</h3>

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
                    <thead><tr><th>#</th><th>Branch Name</th><th>Address</th><th>City</th><th>Country</th></tr></thead>
                    <tbody>{importRows.map((r, i) => (
                      <tr key={i}><td>{i + 1}</td><td>{String(r['Branch Name'] ?? '')}</td><td>{String(r['Address'] ?? '')}</td><td>{String(r['City'] ?? '')}</td><td>{String(r['Country'] ?? '')}</td></tr>
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
        const v = viewing
        const mgr = users.find((u) => u.user_id === v.manager_id)
        const fullAddr = [v.address, v.city, v.country].filter(Boolean).join(', ')
        const mapHref = v.latitude != null && v.longitude != null
          ? `https://www.google.com/maps?q=${v.latitude},${v.longitude}`
          : fullAddr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddr)}` : null
        return (
          <div className="modal-overlay" onClick={closeView}>
            <div className="modal" style={{ maxWidth: 600, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{v.branch_name}</h3>
                  <span className={`badge ${v.is_active ? 'badge--success' : 'badge--danger'}`}>{v.is_active ? 'Active' : 'Inactive'}</span>
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
                    {fullAddr && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {mapHref ? (
                          <a href={mapHref} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{fullAddr}</a>
                        ) : (
                          <span style={{ color: 'var(--text-primary)' }}>{fullAddr}</span>
                        )}
                      </div>
                    )}
                    {v.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                        <a href={`tel:${v.phone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{v.phone}</a>
                      </div>
                    )}
                    {v.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                        <a href={`mailto:${v.email}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{v.email}</a>
                      </div>
                    )}
                    {mgr && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        <span style={{ color: 'var(--text-primary)' }}>{mgr.full_name}</span>
                      </div>
                    )}
                    {!fullAddr && !v.phone && !v.email && !mgr && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-caption)' }}>No contact information available</span>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>City</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{v.city || '—'}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Country</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{v.country || '—'}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Postal Code</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{v.postal_code || '—'}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Coordinates</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>
                      {v.latitude != null && v.longitude != null ? `${v.latitude}, ${v.longitude}` : '—'}
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                {v.created_at && (
                  <div style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)', fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>
                    Created: {new Date(v.created_at).toLocaleDateString()}
                    {v.updated_at && <span> &middot; Updated: {new Date(v.updated_at).toLocaleDateString()}</span>}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn--ghost" onClick={() => { closeView(); openEdit(v) }}>Edit</button>
                <button type="button" className="btn btn--ghost" onClick={closeView}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
