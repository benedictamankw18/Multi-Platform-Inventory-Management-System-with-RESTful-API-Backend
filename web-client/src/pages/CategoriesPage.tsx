import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  activateCategory,
  uploadCategoryImage,
  resolveImageUrl,
  type Category,
} from '../services/api'

type ModalMode = 'import' | 'view' | null

const TEMPLATE_HEADERS = ['Category Name', 'Description', 'Parent Category']

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
    'category name': 'Category Name', name: 'Category Name', category: 'Category Name',
    description: 'Description',
    'parent category': 'Parent Category', parent: 'Parent Category',
  }
  return map[lower] || name.trim()
}

export default function CategoriesPage() {
  const { toast } = useToast()
  const { hasPermission } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [parentId, setParentId] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [formError, setFormError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [modal, setModal] = useState<ModalMode>(null)
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null)
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
      const body: Record<string, unknown> = { page, limit }
      if (search) body.q = search
      const res = await getCategories(body)
      const data = Array.isArray(res) ? res : res?.categories ?? res?.data ?? []
      setCategories(data)
      setTotal(res?.total ?? data.length)
    } catch {
      setCategories([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, search])

  const loadAll = useCallback(async () => {
    try {
      const res = await getCategories({ limit: 100 })
      setAllCategories(Array.isArray(res) ? res : res?.categories ?? [])
    } catch {
      setAllCategories([])
    }
  }, [])

  useEffect(() => { load(); loadAll() }, [load, loadAll])

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
    setDesc('')
    setParentId('')
    setImageUrl('')
    setFormError('')
    setShowForm(true)
  }

  function openEdit(c: Category) {
    setEditing(c)
    setName(c.category_name)
    setDesc(c.description ?? '')
    setParentId(c.parent_category_id ?? '')
    setImageUrl(c.image_url ?? '')
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setName('')
    setDesc('')
    setParentId('')
    setImageUrl('')
    setFormError('')
  }

  function openView(c: Category) {
    setViewingCategory(c)
    setModal('view')
  }

  function closeView() {
    setViewingCategory(null)
    setModal(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Category name is required.')
      return
    }
    setFormError('')
    try {
      if (editing) {
        const body: Record<string, unknown> = { category_name: name.trim() }
        if (desc) body.description = desc.trim()
        if (parentId) body.parent_id = parentId
        if (imageUrl.trim()) body.image_url = imageUrl.trim()
        await updateCategory(editing.category_id, body)
        toast('Category updated', 'success')
      } else {
        await createCategory({
          category_name: name.trim(),
          description: desc.trim() || undefined,
          parent_id: parentId || undefined,
          image_url: imageUrl.trim() || undefined,
        })
        toast('Category created', 'success')
      }
      closeForm()
      load()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Save failed'
        : 'Save failed'
      setFormError(msg)
      toast(msg, 'error')
    }
  }

  async function handleToggle(c: Category) {
    setActionLoading(c.category_id)
    try {
      if (c.is_active) {
        await deleteCategory(c.category_id)
        toast('Category deactivated', 'success')
      } else {
        await activateCategory(c.category_id)
        toast('Category activated', 'success')
      }
      load()
    } catch {
      toast('Failed to update category status', 'error')
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
      const categoryName = String(row['Category Name'] ?? '').trim()
      if (!categoryName) {
        failures.push({ row: i + 2, name: '(empty)', reason: 'Category name is required' })
        done++
        setImportProgress({ done, total: importRows.length })
        continue
      }

      try {
        const body: Record<string, unknown> = { category_name: categoryName }
        const desc = String(row['Description'] ?? '').trim()
        if (desc) body.description = desc

        const parentName = String(row['Parent Category'] ?? '').trim()
        if (parentName) {
          const parent = allCategories.find((c) => c.category_name.toLowerCase() === parentName.toLowerCase())
          if (parent) {
            body.parent_id = parent.category_id
          } else {
            failures.push({ row: i + 2, name: categoryName, reason: `Parent "${parentName}" not found` })
            done++
            setImportProgress({ done, total: importRows.length })
            continue
          }
        }

        await createCategory(body)
        done++
        setImportDone(done)
      } catch (err: unknown) {
        const msg = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Create failed'
          : 'Create failed'
        failures.push({ row: i + 2, name: categoryName, reason: msg })
        done++
      }
      setImportProgress({ done, total: importRows.length })
    }

    setImportFailures(failures)
    setImporting(false)
    setImportProgress(null)
    load()
    loadAll()
    toast(`Import complete: ${importRows.length - failures.length} created, ${failures.length} failed`, failures.length ? 'warning' : 'success')
  }

  function downloadTemplate() {
    const example: Record<string, unknown> = {}
    for (const h of TEMPLATE_HEADERS) example[h] = ''
    example['Category Name'] = 'Electronics'
    example['Description'] = 'Electronic devices and gadgets'
    example['Parent Category'] = ''
    const ws = XLSX.utils.json_to_sheet([example])
    XLSX.utils.sheet_add_aoa(ws, [TEMPLATE_HEADERS], { origin: 'A1' })
    XLSX.utils.sheet_add_json(ws, [example], { origin: 'A2', skipHeader: true })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'category_import_template.xlsx')
    toast('Template downloaded', 'success')
  }

  // ---- Export ----

  async function getExportData(): Promise<Record<string, unknown>[]> {
    try {
      const body: Record<string, unknown> = { page: 1, limit: 10000 }
      if (search) body.q = search
      const res = await getCategories(body)
      const allCategories = Array.isArray(res) ? res : res?.categories ?? res?.data ?? []
      const parentMap = Object.fromEntries(allCategories.map((c) => [c.category_id, c.category_name]))
      return allCategories.map((c) => ({
        'Category Name': c.category_name,
        'Description': c.description ?? '',
        'Parent Category': c.parent_category_id ? (parentMap[c.parent_category_id] ?? '') : '',
        'Status': c.is_active ? 'Active' : 'Inactive',
        'Image URL': c.image_url ?? '',
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
    XLSX.utils.book_append_sheet(wb, ws, 'Categories')
    XLSX.writeFile(wb, `categories_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
    setShowExportMenu(false)
    toast(`${data.length} categories exported as XLSX`, 'success')
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
    a.download = `categories_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
    toast(`${data.length} categories exported as CSV`, 'success')
  }

  async function exportPDF() {
    const data = await getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const headers = Object.keys(data[0])
    const rows = data.map((r) => headers.map((h) => String(r[h] ?? '')))
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFontSize(10)
    doc.text('Categories Export', 14, 12)
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 18,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [37, 99, 235] },
    })
    doc.save(`categories_export_${new Date().toISOString().slice(0, 10)}.pdf`)
    setShowExportMenu(false)
    toast(`${data.length} categories exported as PDF`, 'success')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Categories</h1>
          <p className="page-subtitle">{total} categor{total !== 1 ? 'ies' : 'y'} total</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
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
          <button type="button" className="btn btn--primary" onClick={openCreate}>+ Add Category</button>
          )}
        </div>
      </div>

      <div className="glass-card">
        <div className="search-input" style={{ marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" placeholder="Search by name or description..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>Image</th>
                <th>Name</th>
                <th>Parent</th>
                <th>Description</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}><div className="empty-state"><div className="skeleton skeleton--row" /></div></td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.35, marginBottom: 8 }}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                  <p>No categories yet.</p>
                  <button type="button" className="btn btn--primary" style={{ marginTop: 8 }} onClick={openCreate}>Add Category</button>
                </div></td></tr>
              ) : categories.map((c) => {
                const parent = allCategories.find((p) => p.category_id === c.parent_category_id)
                return (<tr key={c.category_id} style={{ opacity: c.is_active ? 1 : 0.5 }}>
                  <td>
                    {c.image_url ? (
                      <img src={resolveImageUrl(c.image_url)} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, opacity: 0.3 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" width="20" height="20"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                      </div>
                    )}
                  </td>
                  <td><strong>{c.category_name}</strong></td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{parent ? parent.category_name : '—'}</td>
                  <td>{c.description || '—'}</td>
                  <td><span className={`badge ${c.is_active ? 'badge--success' : 'badge--danger'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openView(c)}>View</button>
                      <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openEdit(c)}>Edit</button>
                      <button type="button" className={`btn ${c.is_active ? 'btn--danger' : 'btn--primary'}`} style={{ padding: '4px 10px', fontSize: 13 }} disabled={actionLoading === c.category_id} onClick={() => handleToggle(c)}>
                        {actionLoading === c.category_id ? '...' : c.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
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
            <h3 style={{ marginBottom: 16 }}>{editing ? 'Edit Category' : 'Add Category'}</h3>

            {formError && <div className="auth-feedback auth-feedback--error" style={{ marginBottom: 12 }}>{formError}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <span>Category Name *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Electronics" autoFocus />
              </div>
              <div className="field">
                <span>Description</span>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional description" rows={3} />
              </div>
              <div className="field">
                <span>Parent Category</span>
                <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                  <option value="">— None —</option>
                  {allCategories
                    .filter((p) => p.is_active && p.category_id !== editing?.category_id)
                    .map((p) => (<option key={p.category_id} value={p.category_id}>{p.category_name}</option>))}
                </select>
              </div>
              <div className="field">
                <span>Image URL</span>
                {imageUrl && (
                  <div style={{ marginBottom: 8, position: 'relative', display: 'inline-block' }}>
                    <img src={resolveImageUrl(imageUrl) ?? ''} alt="Preview" style={{ maxWidth: 200, maxHeight: 120, borderRadius: 8, objectFit: 'contain', border: '1px solid var(--border)' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    {editing && (
                      <button type="button" className="btn btn--danger" style={{ position: 'absolute', top: 4, right: 4, padding: '2px 8px', fontSize: 12, lineHeight: '18px' }} onClick={async () => {
                        try {
                          await updateCategory(editing.category_id, { image_url: null })
                          setImageUrl('')
                          toast('Image removed', 'success')
                          load()
                        } catch { toast('Failed to remove image', 'error') }
                      }}>Remove</button>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/image.png" style={{ flex: 1 }} />
                  <label className={`btn ${editing ? 'btn--secondary' : 'btn--ghost'}`} style={{ cursor: editing ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', padding: '8px 12px', opacity: editing ? 1 : 0.5 }} title={editing ? 'Upload local image' : 'Save first to upload'}>
                    Browse
                    <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} disabled={!editing} onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file || !editing) return
                      setUploading(true)
                      try {
                        const res = await uploadCategoryImage(editing.category_id, file)
                        setImageUrl(res.imageUrl)
                      } catch {
                        toast('Image upload failed', 'error')
                      }
                      setUploading(false)
                      e.target.value = ''
                    }} />
                  </label>
                  {uploading && <span style={{ lineHeight: '36px', fontSize: 13, color: 'var(--text-secondary)' }}>Uploading…</span>}
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
            <h3 style={{ marginBottom: 16 }}>Import Categories — {importFileName}</h3>

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
                    <thead><tr><th>Row</th><th>Category Name</th><th>Reason</th></tr></thead>
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
                  <button type="button" className="btn btn--primary" onClick={confirmImport}>Import {importRows.length} Categories</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- View Category Modal ---- */}
      {modal === 'view' && viewingCategory && (() => {
        const parent = allCategories.find((p) => p.category_id === viewingCategory.parent_category_id)
        const childCount = allCategories.filter((c) => c.parent_category_id === viewingCategory.category_id).length
        return (
          <div className="modal-overlay" onClick={closeView}>
            <div className="modal" style={{ maxWidth: 560, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)', fontWeight: 500 }}>Category</span>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{viewingCategory.category_name}</h3>
                </div>
                <button type="button" className="btn btn--ghost" onClick={closeView} style={{ flexShrink: 0 }}>✕</button>
              </div>

              {/* Body */}
              <div style={{ padding: 'var(--space-6)', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
                {/* Image + Key Info */}
                <div style={{ display: 'grid', gridTemplateColumns: viewingCategory.image_url ? '180px 1fr' : '1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
                  {/* Image */}
                  {viewingCategory.image_url && (
                    <div>
                      <img
                        src={resolveImageUrl(viewingCategory.image_url) ?? ''}
                        alt={viewingCategory.category_name}
                        style={{ width: 180, height: 180, borderRadius: 'var(--radius-card)', objectFit: 'cover', border: '1px solid var(--border)' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}

                  {/* Key info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3) var(--space-4)', alignContent: 'start' }}>
                    <div>
                      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Status</span>
                      <div><span className={`badge ${viewingCategory.is_active ? 'badge--success' : 'badge--danger'}`}>{viewingCategory.is_active ? 'Active' : 'Inactive'}</span></div>
                    </div>
                    <div>
                      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Parent Category</span>
                      <div style={{ fontWeight: 500 }}>{parent ? parent.category_name : '— None —'}</div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                  <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginTop: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Category ID</span>
                    <div style={{ fontSize: 13, marginTop: 2, fontFamily: 'monospace', wordBreak: 'break-all' }}>{viewingCategory.category_id}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Subcategories</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{childCount}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Image</span>
                    <div style={{ marginTop: 2 }}><span className={`badge ${viewingCategory.image_url ? 'badge--success' : 'badge--warning'}`}>{viewingCategory.image_url ? 'Set' : 'None'}</span></div>
                  </div>
                </div>

                {/* Description */}
                {viewingCategory.description && (
                  <>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                      <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</span>
                    </div>
                    <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-body)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{viewingCategory.description}</p>
                  </>
                )}

                {/* Timestamps */}
                {(viewingCategory.created_at || viewingCategory.updated_at) && (
                  <>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 16 }}>
                      <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamps</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                      {viewingCategory.created_at && (
                        <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Created</span>
                          <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{new Date(viewingCategory.created_at).toLocaleString()}</div>
                        </div>
                      )}
                      {viewingCategory.updated_at && (
                        <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Updated</span>
                          <div style={{ fontSize: 'var(--text-body)', marginTop: 2 }}>{new Date(viewingCategory.updated_at).toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-6)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <button type="button" className="btn btn--ghost" onClick={closeView}>Close</button>
                  <button type="button" className="btn btn--primary" onClick={() => { closeView(); openEdit(viewingCategory) }}>Edit Category</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
