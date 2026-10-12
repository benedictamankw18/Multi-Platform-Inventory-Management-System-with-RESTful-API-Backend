import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ConfirmModal from '../components/ConfirmModal'
import {
  getUnitsOfMeasure,
  createUnitOfMeasure,
  updateUnitOfMeasure,
  deleteUnitOfMeasure,
  activateUnitOfMeasure,
  deactivateUnitOfMeasure,
  type UnitOfMeasure,
} from '../services/api'

type ModalMode = 'import' | 'view' | null

const TEMPLATE_HEADERS = ['Name', 'Symbol', 'Conversion Factor', 'Description']

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
    name: 'Name', unit: 'Name', 'unit name': 'Name', 'unit of measure': 'Name', uom: 'Name',
    symbol: 'Symbol', abbreviation: 'Symbol', 'short name': 'Symbol', code: 'Symbol',
    'conversion factor': 'Conversion Factor', conversion: 'Conversion Factor', factor: 'Conversion Factor',
    description: 'Description', desc: 'Description',
  }
  return map[lower] || name.trim()
}

function fmtFactor(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '1'
  const n = Number(value)
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(4)))
}

function errText(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { message?: string } } }).response
    return resp?.data?.message ?? fallback
  }
  return fallback
}

export default function UnitsOfMeasurePage() {
  const { toast } = useToast()
  const { hasPermission } = useAuth()
  const [units, setUnits] = useState<UnitOfMeasure[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<UnitOfMeasure | null>(null)
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [factor, setFactor] = useState('1')
  const [desc, setDesc] = useState('')
  const [formError, setFormError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<UnitOfMeasure | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [modal, setModal] = useState<ModalMode>(null)
  const [viewingUnit, setViewingUnit] = useState<UnitOfMeasure | null>(null)
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

  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit, includeInactive: true }
      if (search) params.q = search
      const res = await getUnitsOfMeasure(params)
      const data = Array.isArray(res) ? res : res?.data ?? res?.units ?? []
      setUnits(data)
      setTotal(res?.total ?? data.length)
    } catch {
      setUnits([])
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

  function openCreate() {
    setEditing(null)
    setName('')
    setSymbol('')
    setFactor('1')
    setDesc('')
    setFormError('')
    setShowForm(true)
  }

  function openEdit(u: UnitOfMeasure) {
    setEditing(u)
    setName(u.uom_name)
    setSymbol(u.symbol ?? '')
    setFactor(fmtFactor(u.conversion_factor))
    setDesc(u.description ?? '')
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setName('')
    setSymbol('')
    setFactor('1')
    setDesc('')
    setFormError('')
  }

  function openView(u: UnitOfMeasure) {
    setViewingUnit(u)
    setModal('view')
  }

  function closeView() {
    setViewingUnit(null)
    setModal(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setFormError('Unit name is required.')
      return
    }
    setFormError('')
    const body: Record<string, unknown> = {
      name: trimmedName,
      symbol: symbol.trim() || null,
      description: desc.trim() || null,
    }
    const parsedFactor = parseFloat(factor)
    if (!Number.isNaN(parsedFactor) && parsedFactor > 0) body.conversion_factor = parsedFactor

    try {
      if (editing) {
        await updateUnitOfMeasure(editing.uom_id, body)
        toast('Unit of measure updated', 'success')
      } else {
        await createUnitOfMeasure(body)
        toast('Unit of measure created', 'success')
      }
      closeForm()
      load()
    } catch (err) {
      const msg = errText(err, 'Save failed')
      setFormError(msg)
      toast(msg, 'error')
    }
  }

  async function handleToggle(u: UnitOfMeasure) {
    setActionLoading(u.uom_id)
    try {
      if (u.is_active) {
        await deactivateUnitOfMeasure(u.uom_id)
        toast('Unit of measure deactivated', 'success')
      } else {
        await activateUnitOfMeasure(u.uom_id)
        toast('Unit of measure activated', 'success')
      }
      load()
    } catch (err) {
      toast(errText(err, 'Failed to update status'), 'error')
    }
    setActionLoading(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteUnitOfMeasure(deleteTarget.uom_id)
      toast('Unit of measure deleted', 'success')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast(errText(err, 'Failed to delete unit of measure'), 'error')
    }
    setDeleting(false)
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
      const unitName = String(row['Name'] ?? '').trim()
      if (!unitName) {
        failures.push({ row: i + 2, name: '(empty)', reason: 'Name is required' })
        done++
        setImportProgress({ done, total: importRows.length })
        continue
      }

      try {
        const body: Record<string, unknown> = { name: unitName }
        const sym = String(row['Symbol'] ?? '').trim()
        if (sym) body.symbol = sym
        const factorValue = parseFloat(String(row['Conversion Factor'] ?? '').replace(/,/g, ''))
        if (!Number.isNaN(factorValue) && factorValue > 0) body.conversion_factor = factorValue
        const rowDesc = String(row['Description'] ?? '').trim()
        if (rowDesc) body.description = rowDesc

        await createUnitOfMeasure(body)
        done++
        setImportDone(done)
      } catch (err) {
        failures.push({ row: i + 2, name: unitName, reason: errText(err, 'Create failed') })
        done++
      }
      setImportProgress({ done, total: importRows.length })
    }

    setImportFailures(failures)
    setImporting(false)
    setImportProgress(null)
    load()
    toast(`Import complete: ${importRows.length - failures.length} created, ${failures.length} failed`, failures.length ? 'warning' : 'success')
  }

  function downloadTemplate() {
    const example: Record<string, unknown> = { Name: 'Kilogram', Symbol: 'kg', 'Conversion Factor': 1, Description: 'Metric unit of mass' }
    const ws = XLSX.utils.json_to_sheet([example])
    XLSX.utils.sheet_add_aoa(ws, [TEMPLATE_HEADERS], { origin: 'A1' })
    XLSX.utils.sheet_add_json(ws, [example], { origin: 'A2', skipHeader: true })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'unit_of_measure_import_template.xlsx')
    toast('Template downloaded', 'success')
  }

  // ---- Export ----

  async function getExportData(): Promise<Record<string, unknown>[]> {
    try {
      const params: Record<string, unknown> = { page: 1, limit: 10000, includeInactive: true }
      if (search) params.q = search
      const res = await getUnitsOfMeasure(params)
      const all: UnitOfMeasure[] = Array.isArray(res) ? res : res?.data ?? []
      return all.map((u) => ({
        Name: u.uom_name,
        Symbol: u.symbol ?? '',
        'Conversion Factor': fmtFactor(u.conversion_factor),
        Description: u.description ?? '',
        Status: u.is_active ? 'Active' : 'Inactive',
      }))
    } catch {
      return []
    }
  }

  async function exportXLSX() {
    const data = await getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Units')
    XLSX.writeFile(wb, `units_of_measure_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
    setShowExportMenu(false)
    toast(`${data.length} units exported as XLSX`, 'success')
  }

  async function exportCSV() {
    const data = await getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `units_of_measure_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
    toast(`${data.length} units exported as CSV`, 'success')
  }

  async function exportPDF() {
    const data = await getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const headers = Object.keys(data[0])
    const rows = data.map((r) => headers.map((h) => String(r[h] ?? '')))
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFontSize(10)
    doc.text('Units of Measure Export', 14, 12)
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 18,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    })
    doc.save(`units_of_measure_export_${new Date().toISOString().slice(0, 10)}.pdf`)
    setShowExportMenu(false)
    toast(`${data.length} units exported as PDF`, 'success')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Units of Measure</h1>
          <p className="page-subtitle">{total} unit{total !== 1 ? 's' : ''} total</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {hasPermission('MANAGE_CATEGORIES') && (
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
          {hasPermission('MANAGE_CATEGORIES') && (
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
          {hasPermission('MANAGE_CATEGORIES') && (
          <button type="button" className="btn btn--primary" onClick={openCreate}>+ Add Unit</button>
          )}
        </div>
      </div>

      <div className="glass-card">
        <div className="search-input" style={{ marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" placeholder="Search by name, symbol, or description..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Symbol</th>
                <th>Conversion Factor</th>
                <th>Description</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading"><td colSpan={6}><div className="empty-state"><div className="skeleton skeleton--row" /></div></td></tr>
              ) : units.length === 0 ? (
                <tr key="empty"><td colSpan={6}><div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.35, marginBottom: 8 }}><path d="M3 3h18v18H3z" /><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></svg>
                  <p>No units of measure yet.</p>
                  <button type="button" className="btn btn--primary" style={{ marginTop: 8 }} onClick={openCreate}>Add Unit</button>
                </div></td></tr>
              ) : units.map((u) => (
                <tr key={u.uom_id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                  <td><strong>{u.uom_name}</strong></td>
                  <td>{u.symbol || '—'}</td>
                  <td>{fmtFactor(u.conversion_factor)}</td>
                  <td>{u.description || '—'}</td>
                  <td><span className={`badge ${u.is_active ? 'badge--success' : 'badge--danger'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openView(u)}>View</button>
                      <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openEdit(u)}>Edit</button>
                      <button type="button" className={`btn ${u.is_active ? 'btn--ghost' : 'btn--primary'}`} style={{ padding: '4px 10px', fontSize: 13 }} disabled={actionLoading === u.uom_id} onClick={() => handleToggle(u)}>
                        {actionLoading === u.uom_id ? '...' : u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button type="button" className="btn btn--danger" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => setDeleteTarget(u)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
          <div className="modal" style={{ maxWidth: 440, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{editing ? 'Edit Unit of Measure' : 'Add Unit of Measure'}</h3>

            {formError && <div className="auth-feedback auth-feedback--error" style={{ marginBottom: 12 }}>{formError}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <span>Name *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kilogram" autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <span>Symbol</span>
                  <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. kg" />
                </div>
                <div className="field">
                  <span>Conversion Factor</span>
                  <input type="number" min="0" step="0.01" value={factor} onChange={(e) => setFactor(e.target.value)} placeholder="1" />
                </div>
              </div>
              <div className="field">
                <span>Description</span>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional description" rows={3} />
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
            <h3 style={{ marginBottom: 16 }}>Import Units of Measure — {importFileName}</h3>

            {importing ? (
              <div>
                <p style={{ marginBottom: 8, fontSize: 'var(--text-body)' }}>Importing… {importProgress?.done ?? 0} of {importProgress?.total ?? 0}</p>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 999, transition: 'width 0.2s', width: `${importProgress ? (importProgress.done / importProgress.total) * 100 : 0}%` }} />
                </div>
              </div>
            ) : importFailures.length > 0 ? (
              <div>
                <p style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 'var(--text-body)' }}>
                  {importDone - importFailures.length} created, {importFailures.length} failed
                </p>
                <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 12 }}>
                  <table className="data-table" style={{ fontSize: 13 }}>
                    <thead><tr><th>Row</th><th>Name</th><th>Reason</th></tr></thead>
                    <tbody>
                      {importFailures.map((f, i) => (
                        <tr key={i}><td>{f.row}</td><td>{f.name}</td><td style={{ color: 'var(--danger)' }}>{f.reason}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn--primary" onClick={() => setModal(null)}>Close</button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 'var(--text-body)' }}>
                  {importRows.length} row{importRows.length !== 1 ? 's' : ''} ready to import. Preview (first 5 rows):
                </p>
                <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 12 }}>
                  <table className="data-table" style={{ fontSize: 13 }}>
                    <thead><tr>{Object.keys(importRows[0] || {}).slice(0, 4).map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {importRows.slice(0, 5).map((row, i) => (
                        <tr key={i}>{Object.values(row).slice(0, 4).map((v, j) => <td key={j}>{String(v ?? '')}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button type="button" className="btn btn--primary" onClick={confirmImport}>Import {importRows.length} Units</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- View Unit Modal ---- */}
      {modal === 'view' && viewingUnit && (
        <div className="modal-overlay" onClick={closeView}>
          <div className="modal" style={{ maxWidth: 560, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)', fontWeight: 500 }}>Unit of Measure</span>
                <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{viewingUnit.uom_name}</h3>
              </div>
              <button type="button" className="btn btn--ghost" onClick={closeView} style={{ flexShrink: 0 }}>✕</button>
            </div>

            <div style={{ padding: 'var(--space-6)', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Status</span>
                  <div style={{ marginTop: 2 }}><span className={`badge ${viewingUnit.is_active ? 'badge--success' : 'badge--danger'}`}>{viewingUnit.is_active ? 'Active' : 'Inactive'}</span></div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Symbol</span>
                  <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{viewingUnit.symbol || '—'}</div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Conversion Factor</span>
                  <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{fmtFactor(viewingUnit.conversion_factor)}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-3)', marginTop: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Unit ID</span>
                  <div style={{ fontSize: 13, marginTop: 2, fontFamily: 'monospace', wordBreak: 'break-all' }}>{viewingUnit.uom_id}</div>
                </div>
              </div>

              {viewingUnit.description && (
                <>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</span>
                  </div>
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-body)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{viewingUnit.description}</p>
                </>
              )}

              {(viewingUnit.created_at || viewingUnit.updated_at) && (
                <>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 16 }}>
                    <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamps</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                    {viewingUnit.created_at && (
                      <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Created</span>
                        <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{new Date(viewingUnit.created_at).toLocaleString()}</div>
                      </div>
                    )}
                    {viewingUnit.updated_at && (
                      <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Updated</span>
                        <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{new Date(viewingUnit.updated_at).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-6)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <button type="button" className="btn btn--ghost" onClick={closeView}>Close</button>
                <button type="button" className="btn btn--primary" onClick={() => { closeView(); openEdit(viewingUnit) }}>Edit Unit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete unit of measure"
        message={deleteTarget ? `Delete "${deleteTarget.uom_name}"? This permanently removes it. Units already used by products cannot be deleted — deactivate them instead.` : undefined}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleting) setDeleteTarget(null) }}
      />
    </div>
  )
}
