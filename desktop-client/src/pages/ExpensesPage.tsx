import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  getBranches,
  type Expense,
  type ExpenseCategory,
  type BranchInfo,
} from '../services/api'

type ExpenseForm = {
  category_id: string
  amount: string
  date: string
  notes: string
  branch_id: string
}

const EMPTY_FORM: ExpenseForm = {
  category_id: '', amount: '', date: new Date().toISOString().slice(0, 10), notes: '', branch_id: '',
}

const TEMPLATE_HEADERS = ['Category', 'Amount', 'Date', 'Notes']

export default function ExpensesPage() {
  const { toast } = useToast()
  const { hasPermission, selectedBranch } = useAuth()

  const [items, setItems] = useState<Expense[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(true)
  const limit = 25

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [catMap, setCatMap] = useState<Record<string, string>>({})
  const [branchMap, setBranchMap] = useState<Record<string, string>>({})

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState<ExpenseForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  const [viewing, setViewing] = useState<Expense | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const [showImportMenu, setShowImportMenu] = useState(false)
  const importMenuRef = useRef<HTMLDivElement>(null)
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importDone, setImportDone] = useState(0)
  const [importFailures, setImportFailures] = useState<{ row: number; name: string; reason: string }[]>([])

  const [tab, setTab] = useState<'expenses' | 'categories'>('expenses')

  const [showCatForm, setShowCatForm] = useState(false)
  const [catEditing, setCatEditing] = useState<ExpenseCategory | null>(null)
  const [catFormName, setCatFormName] = useState('')
  const [catFormDesc, setCatFormDesc] = useState('')
  const [catFormError, setCatFormError] = useState('')
  const [confirmCatDelete, setConfirmCatDelete] = useState<string | null>(null)
  const [catLoading, setCatLoading] = useState(false)

  useEffect(() => {
    getExpenseCategories().then((d) => {
      const arr = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []
      setCategories(arr)
      setCatMap(Object.fromEntries(arr.map((c: ExpenseCategory) => [c.category_id, c.category_name])))
    }).catch(() => {})
    getBranches().then((d) => {
      const arr = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []
      setBranches(arr)
      setBranchMap(Object.fromEntries(arr.map((b: BranchInfo) => [b.branch_id, b.branch_name])))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false)
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) setShowImportMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit }
      if (search) params.q = search
      if (categoryFilter) params.category = categoryFilter
      if (fromDate) params.fromDate = new Date(fromDate).toISOString()
      if (toDate) params.toDate = new Date(toDate).toISOString()
      const resolvedBranch = selectedBranch?.branch_id
      if (resolvedBranch) params.branchId = resolvedBranch
      const res = await getExpenses(params)
      const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      setItems(data)
      setTotal(res.total ?? 0)
    } catch {
      setItems([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, search, categoryFilter, fromDate, toDate, selectedBranch])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  function setFormVal(key: keyof ExpenseForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, branch_id: selectedBranch?.branch_id ?? '' })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(ex: Expense) {
    setEditing(ex)
    setForm({
      category_id: ex.category ?? '',
      amount: String(ex.amount ?? ''),
      date: ex.expense_date ? new Date(ex.expense_date).toISOString().slice(0, 10) : '',
      notes: ex.description ?? '',
      branch_id: ex.branch_id ?? '',
    })
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category_id) { setFormError('Category is required.'); return }
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { setFormError('Amount must be positive.'); return }
    setFormError('')
    try {
      const body: Record<string, unknown> = {
        category_id: form.category_id,
        amount: amt,
        date: form.date ? new Date(form.date).toISOString() : undefined,
        notes: form.notes.trim() || undefined,
        branch_id: form.branch_id || selectedBranch?.branch_id,
      }
      if (editing) {
        await updateExpense(editing.expense_id, body)
        toast('Expense updated', 'success')
      } else {
        await createExpense(body)
        toast('Expense created', 'success')
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

  async function handleDelete() {
    if (!confirmDelete) return
    setActionLoading(true)
    try {
      await deleteExpense(confirmDelete)
      toast('Expense deleted', 'success')
      setConfirmDelete(null)
      if (viewing?.expense_id === confirmDelete) setViewing(null)
      load()
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data
        : undefined
      toast(data?.message ?? 'Delete failed', 'error')
    }
    setActionLoading(false)
  }

  function loadCategories() {
    getExpenseCategories().then((d) => {
      const arr = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []
      setCategories(arr)
      setCatMap(Object.fromEntries(arr.map((c: ExpenseCategory) => [c.category_id, c.category_name])))
    }).catch(() => {})
  }

  function openCatForm(cat?: ExpenseCategory) {
    setCatEditing(cat ?? null)
    setCatFormName(cat?.category_name ?? '')
    setCatFormDesc(cat?.description ?? '')
    setCatFormError('')
    setShowCatForm(true)
  }

  async function handleCatSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!catFormName.trim()) { setCatFormError('Category name is required.'); return }
    setCatFormError('')
    setCatLoading(true)
    try {
      if (catEditing) {
        await updateExpenseCategory(catEditing.category_id, { name: catFormName.trim(), description: catFormDesc.trim() || undefined })
        toast('Category updated', 'success')
      } else {
        await createExpenseCategory({ name: catFormName.trim(), description: catFormDesc.trim() || undefined })
        toast('Category created', 'success')
      }
      setShowCatForm(false)
      loadCategories()
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data
        : undefined
      setCatFormError(data?.message ?? 'Save failed')
    }
    setCatLoading(false)
  }

  async function handleCatDelete() {
    if (!confirmCatDelete) return
    setCatLoading(true)
    try {
      await deleteExpenseCategory(confirmCatDelete)
      toast('Category deleted', 'success')
      setConfirmCatDelete(null)
      loadCategories()
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data
        : undefined
      toast(data?.message ?? 'Delete failed', 'error')
    }
    setCatLoading(false)
  }

  async function fetchAllForExport() {
    const params: Record<string, unknown> = { limit: 10000, page: 1 }
    const resolvedBranch = selectedBranch?.branch_id
    if (resolvedBranch) params.branchId = resolvedBranch
    const res = await getExpenses(params)
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
  }

  async function exportXLSX() {
    try {
      const data = await fetchAllForExport()
      const rows = data.map((ex: Expense) => ({
        Date: ex.expense_date ? new Date(ex.expense_date).toLocaleDateString() : '',
        Category: catMap[ex.category ?? ''] ?? ex.category,
        Description: ex.description ?? '',
        Amount: Number(ex.amount).toFixed(2),
        Branch: branchMap[ex.branch_id ?? ''] ?? ex.branch_id,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses')
      XLSX.writeFile(wb, `expenses-${new Date().toISOString().slice(0, 10)}.xlsx`)
      setShowExportMenu(false)
      toast('Exported XLSX', 'success')
    } catch { toast('Export failed', 'error') }
  }

  async function exportCSV() {
    try {
      const data = await fetchAllForExport()
      const rows = data.map((ex: Expense) => ({
        Date: ex.expense_date ? new Date(ex.expense_date).toLocaleDateString() : '',
        Category: catMap[ex.category ?? ''] ?? ex.category,
        Description: ex.description ?? '',
        Amount: Number(ex.amount).toFixed(2),
        Branch: branchMap[ex.branch_id ?? ''] ?? ex.branch_id,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
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
      doc.text('Expenses Report', 14, 20)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)
      autoTable(doc, {
        startY: 34,
        head: [['Date', 'Category', 'Description', 'Amount', 'Branch']],
        body: data.map((ex: Expense) => [
          ex.expense_date ? new Date(ex.expense_date).toLocaleDateString() : '',
          catMap[ex.category ?? ''] ?? ex.category,
          ex.description ?? '',
          Number(ex.amount).toFixed(2),
          branchMap[ex.branch_id ?? ''] ?? ex.branch_id,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      })
      doc.save(`expenses-${new Date().toISOString().slice(0, 10)}.pdf`)
      setShowExportMenu(false)
      toast('Exported PDF', 'success')
    } catch { toast('Export failed', 'error') }
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([], { header: TEMPLATE_HEADERS })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses Template')
    XLSX.writeFile(wb, 'expenses-template.xlsx')
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
    let done = 0
    const failures: { row: number; name: string; reason: string }[] = []
    for (const row of importRows) {
      try {
        const catName = String(row.Category ?? row.category ?? '').trim()
        const amt = Number(row.Amount ?? row.amount ?? 0)
        if (!catName || !amt) throw new Error('Missing category or amount')
        const matched = categories.find((c) => c.category_name.toLowerCase() === catName.toLowerCase())
        if (!matched) throw new Error(`Category "${catName}" not found`)
        const rawDate = String(row.Date ?? row.date ?? '')
        await createExpense({
          category_id: matched.category_id,
          amount: amt,
          date: rawDate ? new Date(rawDate).toISOString() : undefined,
          notes: String(row.Notes ?? row.notes ?? '').trim() || undefined,
          branch_id: selectedBranch?.branch_id,
        })
        done++
      } catch (err: unknown) {
        failures.push({ row: done + failures.length + 2, name: String(row.Category ?? ''), reason: err instanceof Error ? err.message : 'Import failed' })
      }
    }
    setImportDone(done)
    setImportFailures(failures)
    if (done > 0) load()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p className="page-subtitle">Track and manage business expenses</p>
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
          {hasPermission('MANAGE_EXPENSES') && (
            <button type="button" className="btn btn--primary" onClick={openCreate}>+ Add Expense</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-4)', borderBottom: '2px solid var(--border)' }}>
        <button type="button"
          style={{ padding: 'var(--space-2) var(--space-4)', border: 'none', background: tab === 'expenses' ? 'var(--primary)' : 'transparent', color: tab === 'expenses' ? '#fff' : 'var(--text-secondary)', borderRadius: 'var(--radius-button) var(--radius-button) 0 0', cursor: 'pointer', fontSize: 'var(--text-body)', fontWeight: 500 }}
          onClick={() => setTab('expenses')}>Expenses</button>
        <button type="button"
          style={{ padding: 'var(--space-2) var(--space-4)', border: 'none', background: tab === 'categories' ? 'var(--primary)' : 'transparent', color: tab === 'categories' ? '#fff' : 'var(--text-secondary)', borderRadius: 'var(--radius-button) var(--radius-button) 0 0', cursor: 'pointer', fontSize: 'var(--text-body)', fontWeight: 500 }}
          onClick={() => setTab('categories')}>Categories</button>
      </div>

      {tab === 'expenses' && (<>
      <div className="glass-card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-input" style={{ flex: 1, minWidth: 180 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input type="text" placeholder="Search expenses..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select className="input" style={{ width: 'auto', minWidth: 140 }} value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
          </select>
          <input type="date" className="input" style={{ width: 'auto' }} value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} placeholder="From" />
          <input type="date" className="input" style={{ width: 'auto' }} value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} placeholder="To" />
        </div>

        {importRows.length > 0 && importDone === 0 && (
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>{importRows.length} rows ready to import from "{importFileName}"</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--ghost" onClick={() => { setImportRows([]); setImportFileName('') }}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={confirmImport}>Import {importRows.length} Rows</button>
            </div>
          </div>
        )}
        {importDone > 0 && (
          <div style={{ marginBottom: 16, padding: 12, background: 'rgba(34,197,94,0.05)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.2)' }}>
            <div style={{ fontSize: 13, color: '#16a34a' }}>{importDone} expenses imported successfully.{importFailures.length > 0 ? ` ${importFailures.length} failed.` : ''}</div>
            {importFailures.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', maxHeight: 100, overflowY: 'auto' }}>
                {importFailures.map((f, i) => <div key={i}>Row {f.row}: {f.name} - {f.reason}</div>)}
              </div>
            )}
            <button type="button" className="btn btn--ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => { setImportDone(0); setImportFailures([]); setImportRows([]); setImportFileName('') }}>Dismiss</button>
          </div>
        )}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Branch</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading"><td colSpan={6}><div className="skeleton skeleton--row" /></td></tr>
              ) : items.length === 0 ? (
                <tr key="empty"><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>No expenses found.</td></tr>
              ) : items.map((ex) => (
                <tr key={ex.expense_id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{ex.expense_date ? new Date(ex.expense_date).toLocaleDateString() : '—'}</td>
                  <td><span className="badge badge--info">{catMap[ex.category ?? ''] ?? '—'}</span></td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.description || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{Number(ex.amount).toFixed(2)}</td>
                  <td>{branchMap[ex.branch_id ?? ''] ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => setViewing(ex)}>View</button>
                      {hasPermission('MANAGE_EXPENSES') && (
                        <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => openEdit(ex)}>Edit</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 'var(--space-4)' }}>
            <span style={{ color: 'var(--secondary)', fontSize: 'var(--text-caption)' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button type="button" className="btn btn--ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Create / Edit Modal ---- */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" style={{ maxWidth: 500, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{editing ? 'Edit Expense' : 'Add Expense'}</h3>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>{editing ? 'Update expense details' : 'Record a new business expense'}</div>
            </div>
            <div style={{ padding: 'var(--space-5) var(--space-6)', maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>
              {formError && <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)', color: 'var(--error)' }}>{formError}</div>}
              <form id="expense-form" onSubmit={handleSubmit}>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Category *</label>
                  <select className="input" value={form.category_id} onChange={(e) => setFormVal('category_id', e.target.value)}>
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Amount *</label>
                  <input type="number" step="0.01" min="0" className="input" value={form.amount} onChange={(e) => setFormVal('amount', e.target.value)} placeholder="0.00" style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }} />
                </div>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Date</label>
                  <input type="date" className="input" value={form.date} onChange={(e) => setFormVal('date', e.target.value)} />
                </div>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Notes</label>
                  <textarea className="input" rows={2} value={form.notes} onChange={(e) => setFormVal('notes', e.target.value)} placeholder="Optional notes..." style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Branch</label>
                  <select className="input" value={form.branch_id} onChange={(e) => setFormVal('branch_id', e.target.value)} disabled={!editing}>
                    {branches.filter((b) => editing || b.branch_id === selectedBranch?.branch_id).map((b) => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                  </select>
                </div>
              </form>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
              <button type="button" className="btn btn--ghost" onClick={closeForm}>Cancel</button>
              <button type="submit" form="expense-form" className="btn btn--primary">{editing ? 'Update' : 'Create'} Expense</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- View Modal ---- */}
      {viewing && (
        <div className="modal-overlay" onClick={() => setViewing(null)}>
          <div className="modal" style={{ maxWidth: 460, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>Expense Details</h3>
              <button type="button" className="btn btn--ghost" onClick={() => setViewing(null)} style={{ padding: '4px 8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              {[
                ['Date', viewing.expense_date ? new Date(viewing.expense_date).toLocaleDateString() : '—'],
                ['Category', catMap[viewing.category ?? ''] ?? '—'],
                ['Amount', `${Number(viewing.amount).toFixed(2)}`],
                ['Branch', branchMap[viewing.branch_id ?? ''] ?? '—'],
              ].map(([label, val]) => (
                <div key={label} style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>{label}</span>
                  <div style={{ fontSize: 'var(--text-body)', marginTop: 2, fontWeight: label === 'Amount' ? 700 : 400, fontFamily: label === 'Amount' ? 'monospace' : 'inherit' }}>{val}</div>
                </div>
              ))}
            </div>
            {viewing.description && (
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 'var(--space-4)', border: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)', display: 'block', marginBottom: 4 }}>Notes</span>
                <div style={{ fontSize: 'var(--text-body)' }}>{viewing.description}</div>
              </div>
            )}
            {viewing.created_at && (
              <div style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)', fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>
                Created: {new Date(viewing.created_at).toLocaleDateString()}
                {viewing.updated_at && <span> &middot; Updated: {new Date(viewing.updated_at).toLocaleDateString()}</span>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
              {hasPermission('MANAGE_EXPENSES') && (
                <>
                  <button type="button" className="btn btn--ghost" onClick={() => { const ex = viewing; setViewing(null); openEdit(ex) }}>Edit</button>
                  <button type="button" className="btn btn--danger" onClick={() => { setConfirmDelete(viewing.expense_id); setViewing(null) }}>Delete</button>
                </>
              )}
              <button type="button" className="btn btn--ghost" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal open title="Delete Expense" message="Are you sure you want to delete this expense? This action cannot be undone." confirmLabel="Delete" cancelLabel="Cancel" variant="danger" loading={actionLoading} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
      )}
      </>)}
      {tab === 'categories' && (
        <div className="glass-card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>Expense Categories</h3>
            {hasPermission('MANAGE_EXPENSES') && (
              <button type="button" className="btn btn--primary" onClick={() => openCatForm()}>+ Add Category</button>
            )}
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  {hasPermission('MANAGE_EXPENSES') && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr key="empty-categories"><td colSpan={hasPermission('MANAGE_EXPENSES') ? 3 : 2} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>No categories found.</td></tr>
                ) : categories.map((cat) => (
                  <tr key={cat.category_id}>
                    <td><span className="badge badge--info">{cat.category_name}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{cat.description || '—'}</td>
                    {hasPermission('MANAGE_EXPENSES') && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => openCatForm(cat)}>Edit</button>
                          <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 8px', color: 'var(--danger)' }} onClick={() => setConfirmCatDelete(cat.category_id)}>Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Category Modal ---- */}
      {showCatForm && (
        <div className="modal-overlay" onClick={() => setShowCatForm(false)}>
          <div className="modal" style={{ maxWidth: 480, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{catEditing ? 'Edit Category' : 'Add Category'}</h3>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>{catEditing ? 'Update expense category' : 'Create a new expense category'}</div>
            </div>
            <div style={{ padding: 'var(--space-5) var(--space-6)', maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>
              {catFormError && <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)', color: 'var(--error)' }}>{catFormError}</div>}
              <form id="cat-form" onSubmit={handleCatSubmit}>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Category Name *</label>
                  <input type="text" className="input" value={catFormName} onChange={(e) => setCatFormName(e.target.value)} placeholder="e.g. Utilities" />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Description</label>
                  <textarea className="input" rows={2} value={catFormDesc} onChange={(e) => setCatFormDesc(e.target.value)} placeholder="Optional description..." style={{ resize: 'vertical' }} />
                </div>
              </form>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setShowCatForm(false)}>Cancel</button>
              <button type="submit" form="cat-form" className="btn btn--primary" disabled={catLoading}>{catEditing ? 'Update' : 'Create'} Category</button>
            </div>
          </div>
        </div>
      )}

      {confirmCatDelete && (
        <ConfirmModal open title="Delete Category" message="Are you sure you want to delete this expense category?" confirmLabel="Delete" cancelLabel="Cancel" variant="danger" loading={catLoading} onConfirm={handleCatDelete} onCancel={() => setConfirmCatDelete(null)} />
      )}
    </div>
  )
}
