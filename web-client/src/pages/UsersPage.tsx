import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  getRoles,
  getBranches,
  getUserBranches,
  assignUserBranch,
  removeUserBranch,
  type AuthUser,
} from '../services/api'

type ModalMode = 'import' | 'view' | null

type UserRecord = {
  user_id: string
  branch_id: string | null
  role_id: string
  full_name: string
  username: string
  email: string | null
  phone: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
  role_name: string | null
  branch_name: string | null
}

const TEMPLATE_HEADERS = ['First Name', 'Last Name', 'Email', 'Phone', 'Username', 'Password', 'Role', 'Branch']

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
    'first name': 'First Name', firstname: 'First Name', first: 'First Name',
    'last name': 'Last Name', lastname: 'Last Name', last: 'Last Name',
    email: 'Email',
    phone: 'Phone', telephone: 'Phone', mobile: 'Phone',
    username: 'Username', user: 'Username',
    password: 'Password', pwd: 'Password',
    role: 'Role',
    branch: 'Branch',
  }
  return map[lower] || name.trim()
}

export default function UsersPage() {
  const { toast } = useToast()
  const { hasPermission } = useAuth()
  const [items, setItems] = useState<UserRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<UserRecord | null>(null)
  const [formError, setFormError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [modal, setModal] = useState<ModalMode>(null)
  const [viewing, setViewing] = useState<UserRecord | null>(null)
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

  const [branchesModalUser, setBranchesModalUser] = useState<UserRecord | null>(null)
  const [userBranches, setUserBranches] = useState<Array<{ branch_id: string; branch_name: string }>>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [addBranchId, setAddBranchId] = useState('')
  const [branchAction, setBranchAction] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [roleId, setRoleId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [roles, setRoles] = useState<Array<{ role_id: string; role_name: string }>>([])
  const [branches, setBranches] = useState<Array<{ branch_id: string; branch_name: string }>>([])

  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { page, limit }
      if (search) body.q = search
      const res = await getUsers(body)
      const data = res?.data?.users ?? res?.users ?? res?.data ?? []
      setItems(data)
      setTotal(res?.data?.total ?? res?.total ?? data.length)
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
    getRoles({ limit: 1000 }).then((res) => {
      const data = res?.data?.roles ?? res?.roles ?? res?.data ?? []
      setRoles(data)
    }).catch(() => {})
    getBranches({ limit: 1000 }).then((res) => {
      const data = Array.isArray(res) ? res : res?.data ?? res?.branches ?? []
      setBranches(data)
    }).catch(() => {})
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  function resetForm() {
    setFirstName('')
    setLastName('')
    setUsername('')
    setEmail('')
    setPassword('')
    setPhone('')
    setRoleId('')
    setBranchId('')
    setFormError('')
  }

  function openCreate() {
    setEditing(null)
    resetForm()
    setShowForm(true)
  }

  function openEdit(u: UserRecord) {
    setEditing(u)
    const parts = u.full_name?.split(/\s+/) || []
    setFirstName(parts[0] || '')
    setLastName(parts.slice(1).join(' ') || '')
    setUsername(u.username || '')
    setEmail(u.email || '')
    setPassword('')
    setPhone(u.phone || '')
    setRoleId(u.role_id || '')
    setBranchId(u.branch_id || '')
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    resetForm()
  }

  function openView(u: UserRecord) {
    setViewing(u)
    setModal('view')
  }

  function closeView() {
    setViewing(null)
    setModal(null)
  }

  async function openBranches(u: UserRecord) {
    setBranchesModalUser(u)
    setAddBranchId('')
    setLoadingBranches(true)
    try {
      const res = await getUserBranches(u.user_id)
      const data = res?.data?.branches ?? res?.data ?? res?.branches ?? res ?? []
      setUserBranches(Array.isArray(data) ? data : [])
    } catch { setUserBranches([]) }
    setLoadingBranches(false)
  }

  function closeBranches() {
    setBranchesModalUser(null)
    setUserBranches([])
    setAddBranchId('')
  }

  async function handleAssignBranch() {
    if (!branchesModalUser || !addBranchId) return
    setBranchAction(true)
    try {
      await assignUserBranch(branchesModalUser.user_id, addBranchId)
      setAddBranchId('')
      const res = await getUserBranches(branchesModalUser.user_id)
      const data = res?.data?.branches ?? res?.data ?? res?.branches ?? res ?? []
      setUserBranches(Array.isArray(data) ? data : [])
      toast('Branch assigned', 'success')
      load()
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; errors?: Array<{ msg: string }> } } }).response?.data
        : undefined
      const msg = data?.errors?.length ? data.errors.map(e => e.msg).join('; ') : data?.message ?? 'Failed to assign branch'
      toast(msg, 'error')
    }
    setBranchAction(false)
  }

  async function handleRemoveBranch(branchId: string) {
    if (!branchesModalUser) return
    setBranchAction(true)
    try {
      await removeUserBranch(branchesModalUser.user_id, branchId)
      setUserBranches(prev => prev.filter(b => b.branch_id !== branchId))
      toast('Branch removed', 'success')
      load()
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; errors?: Array<{ msg: string }> } } }).response?.data
        : undefined
      const msg = data?.errors?.length ? data.errors.map(e => e.msg).join('; ') : data?.message ?? 'Failed to remove branch'
      toast(msg, 'error')
    }
    setBranchAction(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim()) { setFormError('First name is required.'); return }
    if (!lastName.trim()) { setFormError('Last name is required.'); return }
    if (!email.trim()) { setFormError('Email is required.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setFormError('Please enter a valid email address.'); return }
    if (!editing && !password) { setFormError('Password is required.'); return }
    if (!roleId) { setFormError('Role is required.'); return }
    if (!editing && password && password.length < 8) { setFormError('Password must be at least 8 characters.'); return }

    setFormError('')
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          role_id: roleId,
          roles: [roleId],
        }
        if (phone.trim()) body.phone = phone.trim()
        if (branchId) body.branch_id = branchId
        else body.branch_id = null
        await updateUser(editing.user_id, body)
        toast('User updated', 'success')
      } else {
        const body: Record<string, unknown> = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          password,
          roles: [roleId],
        }
        if (username.trim()) body.username = username.trim()
        if (phone.trim()) body.phone = phone.trim()
        if (branchId) body.branch_id = branchId
        await createUser(body)
        toast('User created', 'success')
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

  async function handleToggle(u: UserRecord) {
    setActionLoading(u.user_id)
    try {
      if (u.is_active) {
        await deactivateUser(u.user_id)
        toast('User deactivated', 'success')
      } else {
        await activateUser(u.user_id)
        toast('User activated', 'success')
      }
      load()
    } catch {
      toast('Failed to update user status', 'error')
    }
    setActionLoading(null)
  }

  async function handleDelete(u: UserRecord) {
    if (!window.confirm(`Delete "${u.full_name}"? This cannot be undone.`)) return
    setActionLoading(u.user_id)
    try {
      await deleteUser(u.user_id)
      toast('User deleted', 'success')
      load()
    } catch {
      toast('Failed to delete user', 'error')
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
      if (!raw.length) { toast('File is empty', 'error'); return }
      const normalized = raw.map((row) => {
        const out: Record<string, unknown> = {}
        for (const key of Object.keys(row)) { out[normalizeHeader(key)] = row[key] }
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
      const fn = String(row['First Name'] ?? '').trim()
      const ln = String(row['Last Name'] ?? '').trim()
      const em = String(row['Email'] ?? '').trim()
      const pw = String(row['Password'] ?? '').trim()
      const name = `${fn} ${ln}`.trim() || em || '(empty)'

      if (!fn || !em || !pw) {
        failures.push({ row: i + 2, name, reason: 'First name, email, and password are required' })
        done++; setImportProgress({ done, total: importRows.length }); continue
      }
      if (pw.length < 8) {
        failures.push({ row: i + 2, name, reason: 'Password must be at least 8 characters' })
        done++; setImportProgress({ done, total: importRows.length }); continue
      }

      try {
        const body: Record<string, unknown> = { first_name: fn, last_name: ln, email: em, password: pw }
        const un = String(row['Username'] ?? '').trim()
        if (un) body.username = un
        const ph = String(row['Phone'] ?? '').trim()
        if (ph) body.phone = ph
        const roleName = String(row['Role'] ?? '').trim()
        if (roleName) {
          const match = roles.find(r => r.role_name.toLowerCase() === roleName.toLowerCase())
          if (!match) {
            const available = roles.map(r => r.role_name).join(', ')
            failures.push({ row: i + 2, name, reason: `Role "${roleName}" not found. Available: ${available || '(none)'}` })
            done++; setImportProgress({ done, total: importRows.length }); continue
          }
          body.roles = [match.role_id]
        } else {
          failures.push({ row: i + 2, name, reason: 'Role is required.' })
          done++; setImportProgress({ done, total: importRows.length }); continue
        }
        const branchName = String(row['Branch'] ?? '').trim()
        if (branchName) {
          const match = branches.find(b => b.branch_name.toLowerCase() === branchName.toLowerCase())
          if (!match) {
            const available = branches.map(b => b.branch_name).join(', ')
            failures.push({ row: i + 2, name, reason: `Branch "${branchName}" not found. Available: ${available || '(none)'}` })
            done++; setImportProgress({ done, total: importRows.length }); continue
          }
          body.branch_id = match.branch_id
        }
        await createUser(body)
        done++; setImportDone(done)
      } catch (err: unknown) {
        const data = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string; errors?: Array<{ msg: string }> } } }).response?.data
          : undefined
        const msg = data?.errors?.length
          ? data.errors.map((e) => e.msg).join('; ')
          : data?.message ?? 'Create failed'
        failures.push({ row: i + 2, name, reason: msg })
        done++
      }
      setImportProgress({ done, total: importRows.length })
    }

    setImportFailures(failures)
    setImporting(false)
    if (failures.length === 0) {
      toast(`Imported ${importRows.length} user${importRows.length !== 1 ? 's' : ''}`, 'success')
      setModal(null); load()
    }
  }

  // ---- Export ----

  async function fetchAllForExport(): Promise<UserRecord[]> {
    const res = await getUsers({ limit: 10000, page: 1 })
    return res?.data?.users ?? res?.users ?? res?.data ?? []
  }

  function exportXLSX() {
    fetchAllForExport().then((data) => {
      const rows = data.map((u) => ({
        'Full Name': u.full_name, Username: u.username, Email: u.email ?? '', Phone: u.phone ?? '',
        Role: u.role_name ?? '', Branch: u.branch_name ?? '', Status: u.is_active ? 'Active' : 'Inactive',
        'Last Login': u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '',
        Created: u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Users')
      XLSX.writeFile(wb, `users-${new Date().toISOString().slice(0, 10)}.xlsx`)
      setShowExportMenu(false); toast('Exported XLSX', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  function exportCSV() {
    fetchAllForExport().then((data) => {
      const rows = data.map((u) => ({
        'Full Name': u.full_name, Username: u.username, Email: u.email ?? '', Phone: u.phone ?? '',
        Role: u.role_name ?? '', Branch: u.branch_name ?? '', Status: u.is_active ? 'Active' : 'Inactive',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
      URL.revokeObjectURL(url); setShowExportMenu(false); toast('Exported CSV', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  function exportPDF() {
    fetchAllForExport().then((data) => {
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(16); doc.text('Users Report', 14, 20)
      doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)
      autoTable(doc, {
        startY: 34,
        head: [['Name', 'Username', 'Email', 'Phone', 'Role', 'Branch', 'Status']],
        body: data.map((u) => [u.full_name, u.username, u.email ?? '', u.phone ?? '', u.role_name ?? '', u.branch_name ?? '', u.is_active ? 'Active' : 'Inactive']),
        styles: { fontSize: 8 }, headStyles: { fillColor: [37, 99, 235] },
      })
      doc.save(`users-${new Date().toISOString().slice(0, 10)}.pdf`)
      setShowExportMenu(false); toast('Exported PDF', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  function downloadTemplate() {
    const sample = [{ 'First Name': 'John', 'Last Name': 'Doe', Email: 'john@example.com', Phone: '+1234567890', Username: 'johndoe', Password: 'password123', Role: roles[0]?.role_name ?? 'Admin', Branch: branches[0]?.branch_name ?? '' }]
    const ws = XLSX.utils.json_to_sheet(sample, { header: TEMPLATE_HEADERS })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Users Template')
    XLSX.writeFile(wb, 'users-template.xlsx')
    setShowExportMenu(false)
  }

  const showFormState = showForm

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p className="page-subtitle">{total} user{total !== 1 ? 's' : ''} total</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {hasPermission('MANAGE_USERS') && (
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
          {hasPermission('MANAGE_USERS') && (
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
          {hasPermission('MANAGE_USERS') && (
          <button type="button" className="btn btn--primary" onClick={openCreate}>+ Add User</button>
          )}
        </div>
      </div>

      <div className="glass-card">
        <div className="search-input" style={{ marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" placeholder="Search by name, email, or username..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>

        {loading ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Branch</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody><tr key="loading"><td colSpan={8}><div className="skeleton skeleton--row" /></td></tr></tbody>
            </table>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.35, marginBottom: 8 }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
            <p>No users yet.</p>
            <button type="button" className="btn btn--primary" style={{ marginTop: 8 }} onClick={openCreate}>Add User</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.user_id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                    <td><strong>{u.full_name || '—'}</strong></td>
                    <td>{u.username}</td>
                    <td>{u.email ? <a href={`mailto:${u.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{u.email}</a> : '—'}</td>
                    <td>{u.phone ? <a href={`tel:${u.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{u.phone}</a> : '—'}</td>
                    <td>{u.role_name ? <span className="badge badge--info">{u.role_name}</span> : '—'}</td>
                    <td>{u.branch_name || '—'}</td>
                    <td><span className={`badge ${u.is_active ? 'badge--success' : 'badge--danger'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openView(u)}>View</button>
                        <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openBranches(u)}>Branches</button>
                        <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openEdit(u)}>Edit</button>
                        <label className="branch-toggle" title={u.is_active ? 'Deactivate' : 'Activate'}>
                          <input type="checkbox" checked={u.is_active} disabled={actionLoading === u.user_id} onChange={() => handleToggle(u)} />
                          <span className="branch-toggle__track"><span className="branch-toggle__thumb" /></span>
                        </label>
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
      {showFormState && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" style={{ maxWidth: 520, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{editing ? 'Edit User' : 'Add User'}</h3>

            {formError && <div className="auth-feedback auth-feedback--error" style={{ marginBottom: 12 }}>{formError}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <span>First Name *</span>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" autoFocus />
                </div>
                <div className="field">
                  <span>Last Name *</span>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                </div>
              </div>
              <div className="field">
                <span>Username</span>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Auto-generated from email if blank" disabled={!!editing} />
              </div>
              <div className="field">
                <span>Email *</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <div className="field">
                <span>Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" />
              </div>
              {!editing && (
                <div className="field">
                  <span>Password *</span>
                  <div className="password-row">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /><path d="M14.12 14.12a3 3 0 11-4.24-4.24" /></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
              <div className="field">
                <span>Role *</span>
                <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  <option value="">— Select Role —</option>
                  {roles.map((r) => (<option key={r.role_id} value={r.role_id}>{r.role_name}</option>))}
                </select>
              </div>
              <div className="field">
                <span>Branch</span>
                <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  <option value="">— None —</option>
                  {branches.map((b) => (<option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>))}
                </select>
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
            <h3 style={{ marginBottom: 16 }}>Import Users — {importFileName}</h3>

            {importing ? (
              <div>
                <p style={{ marginBottom: 8, fontSize: 'var(--text-body)' }}>Importing… {importProgress?.done ?? 0} of {importProgress?.total ?? 0}</p>
                <div style={{ background: 'var(--bg-secondary, var(--bg))', borderRadius: 999, height: 8, overflow: 'hidden' }}>
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
                    <thead><tr><th>#</th><th>First Name</th><th>Last Name</th><th>Email</th><th>Phone</th></tr></thead>
                    <tbody>{importRows.map((r, i) => (
                      <tr key={i}><td>{i + 1}</td><td>{String(r['First Name'] ?? '')}</td><td>{String(r['Last Name'] ?? '')}</td><td>{String(r['Email'] ?? '')}</td><td>{String(r['Phone'] ?? '')}</td></tr>
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
        const u = viewing
        return (
          <div className="modal-overlay" onClick={closeView}>
            <div className="modal" style={{ maxWidth: 600, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{u.full_name}</h3>
                  {u.role_name && <span className="badge badge--info">{u.role_name}</span>}
                  <span className={`badge ${u.is_active ? 'badge--success' : 'badge--danger'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      <span style={{ color: 'var(--text-primary)' }}>@{u.username}</span>
                    </div>
                    {u.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                        <a href={`mailto:${u.email}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{u.email}</a>
                      </div>
                    )}
                    {u.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                        <a href={`tel:${u.phone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{u.phone}</a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Role</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{u.role_name || '—'}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Branch</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{u.branch_name || '—'}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Last Login</span>
                    <div style={{ fontSize: 'var(--text-body)', marginTop: 2, color: 'var(--text-primary)' }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Status</span>
                    <div style={{ marginTop: 2 }}><span className={`badge ${u.is_active ? 'badge--success' : 'badge--danger'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></div>
                  </div>
                </div>

                {/* Timestamps */}
                {u.created_at && (
                  <div style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)', fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>
                    Created: {new Date(u.created_at).toLocaleDateString()}
                    {u.updated_at && <span> &middot; Updated: {new Date(u.updated_at).toLocaleDateString()}</span>}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn--ghost" onClick={() => { closeView(); openEdit(u) }}>Edit</button>
                <button type="button" className="btn btn--ghost" onClick={closeView}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ---- Manage Branches Modal ---- */}
      {branchesModalUser && (
        <div className="modal-overlay" onClick={closeBranches}>
          <div className="modal" style={{ maxWidth: 500, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>Manage Branches — {branchesModalUser.full_name}</h3>
              <button type="button" className="btn btn--ghost" onClick={closeBranches} style={{ padding: '4px 8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div style={{ padding: 'var(--space-5)', maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
              {loadingBranches ? (
                <div className="skeleton skeleton--row" />
              ) : (
                <>
                  {/* Assigned branches */}
                  <label style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Branches</label>
                  {userBranches.length === 0 ? (
                    <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--text-body)', background: 'var(--bg)', borderRadius: 8, marginTop: 8, border: '1px dashed var(--border)' }}>
                      No branches assigned
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      {userBranches.map(b => (
                        <div key={b.branch_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) var(--space-4)', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>{b.branch_name}</span>
                          </div>
                          <button type="button" className="btn btn--ghost" style={{ padding: '2px 6px', color: 'var(--danger)' }} disabled={branchAction} onClick={() => handleRemoveBranch(b.branch_id)} title="Remove">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add branch */}
                  <div style={{ marginTop: 'var(--space-5)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                    <label style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add Branch</label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <select value={addBranchId} onChange={(e) => setAddBranchId(e.target.value)} style={{ flex: 1 }}>
                        <option value="">— Select Branch —</option>
                        {branches.filter(b => !userBranches.some(ub => ub.branch_id === b.branch_id)).map(b => (
                          <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn--primary" disabled={!addBranchId || branchAction} onClick={handleAssignBranch}>Assign</button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--border)' }}>
              <button type="button" className="btn btn--ghost" onClick={closeBranches}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
