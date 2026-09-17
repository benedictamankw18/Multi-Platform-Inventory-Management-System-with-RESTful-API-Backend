import { useEffect, useState, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import ConfirmModal from '../components/ConfirmModal'
import {
  getRoles,
  getRoleById,
  getRoleSummary,
  canDeleteRole,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  getRoleUsers,
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  canDeletePermission,
} from '../services/api'

type TabMode = 'roles' | 'permissions'

type RoleRecord = {
  role_id: string
  role_name: string
  description: string | null
  is_system: boolean
  created_at: string
  updated_at: string
}

type RoleSummary = {
  role_id: string
  role_name: string
  description: string | null
  is_system: boolean
  user_count: number
  permission_count: number
}

type PermissionRecord = {
  permission_id: string
  permission_name: string
  description: string | null
  created_at: string
  updated_at: string
}

export default function RolesPage() {
  const { toast } = useToast()

  const [tab, setTab] = useState<TabMode>('roles')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  // ---- Roles state ----
  const [roles, setRoles] = useState<RoleSummary[]>([])
  const [rolesTotal, setRolesTotal] = useState(0)

  // ---- Permissions state ----
  const [permissions, setPermissions] = useState<PermissionRecord[]>([])
  const [permissionsTotal, setPermissionsTotal] = useState(0)

  // ---- Role form modal ----
  const [roleFormOpen, setRoleFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null)
  const [roleName, setRoleName] = useState('')
  const [roleDesc, setRoleDesc] = useState('')
  const [rolePerms, setRolePerms] = useState<string[]>([])
  const [allPermissions, setAllPermissions] = useState<PermissionRecord[]>([])
  const [roleFormError, setRoleFormError] = useState('')
  const [roleFormSaving, setRoleFormSaving] = useState(false)

  // ---- Role view modal ----
  const [viewingRole, setViewingRole] = useState<RoleSummary | null>(null)
  const [viewPerms, setViewPerms] = useState<PermissionRecord[]>([])
  const [viewUsers, setViewUsers] = useState<Array<{ user_id: string; full_name: string; email: string | null }>>([])
  const [viewLoading, setViewLoading] = useState(false)

  // ---- Role delete confirm ----
  const [deletingRole, setDeletingRole] = useState<RoleSummary | null>(null)
  const [deleteCheck, setDeleteCheck] = useState<{ canDelete: boolean; isSystem: boolean; inUse: boolean } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ---- Permission form modal ----
  const [permFormOpen, setPermFormOpen] = useState(false)
  const [editingPerm, setEditingPerm] = useState<PermissionRecord | null>(null)
  const [permName, setPermName] = useState('')
  const [permDesc, setPermDesc] = useState('')
  const [permFormError, setPermFormError] = useState('')
  const [permFormSaving, setPermFormSaving] = useState(false)


  // ---- Permission delete confirm ----
  const [deletingPerm, setDeletingPerm] = useState<PermissionRecord | null>(null)
  const [permDeleteCheck, setPermDeleteCheck] = useState<{ canDelete: boolean; rolesAffected: Array<{ role_id: string; role_name: string }> } | null>(null)
  const [permDeleteLoading, setPermDeleteLoading] = useState(false)

  const limit = 25

  // ---- Data loading ----

  const loadRoles = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit }
      if (search) params.q = search
      const res = await getRoles(params)
      const data = res?.data?.roles ?? res?.roles ?? res?.data ?? []
      const summaries: RoleSummary[] = []
      for (const r of data) {
        try {
          const s = await getRoleSummary(r.role_id)
          const summary = s?.data?.summary ?? s?.summary ?? s?.data ?? s
          summaries.push(summary ?? { ...r, user_count: 0, permission_count: 0 })
        } catch {
          summaries.push({ ...r, user_count: 0, permission_count: 0 })
        }
      }
      setRoles(summaries)
      setRolesTotal(res?.data?.total ?? res?.total ?? data.length)
    } catch {
      setRoles([])
      setRolesTotal(0)
    }
    setLoading(false)
  }, [page, search])

  const loadPermissions = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit }
      if (search) params.q = search
      const res = await getPermissions(params)
      const data = res?.data?.permissions ?? res?.permissions ?? res?.data ?? []
      setPermissions(data)
      setPermissionsTotal(res?.data?.total ?? res?.total ?? data.length)
    } catch {
      setPermissions([])
      setPermissionsTotal(0)
    }
    setLoading(false)
  }, [page, search])

  useEffect(() => {
    if (tab === 'roles') loadRoles()
    else loadPermissions()
  }, [tab, loadRoles, loadPermissions])

  useEffect(() => {
    getPermissions({ limit: 1000 }).then((res) => {
      const data = res?.data?.permissions ?? res?.permissions ?? res?.data ?? []
      setAllPermissions(data)
    }).catch(() => {})
  }, [])

  const totalPages = Math.max(1, Math.ceil((tab === 'roles' ? rolesTotal : permissionsTotal) / limit))

  // ---- Role CRUD ----

  function openCreateRole() {
    setEditingRole(null)
    setRoleName('')
    setRoleDesc('')
    setRolePerms([])
    setRoleFormError('')
    setRoleFormOpen(true)
  }

  async function openEditRole(r: RoleSummary) {
    try {
      const res = await getRoleById(r.role_id)
      const full = res?.data ?? res
      setEditingRole(full.role)
      setRoleName(full.role.role_name)
      setRoleDesc(full.role.description ?? '')
      const permRes = await getRolePermissions(r.role_id)
      const permData = permRes?.data?.permissions ?? permRes?.data ?? permRes?.permissions ?? permRes ?? []
      setRolePerms((Array.isArray(permData) ? permData : []).map((p: PermissionRecord) => p.permission_id))
      setRoleFormError('')
      setRoleFormOpen(true)
    } catch {
      toast('Failed to load role', 'error')
    }
  }

  async function handleRoleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roleName.trim()) { setRoleFormError('Role name is required.'); return }
    if (roleName.trim().length < 2) { setRoleFormError('Role name must be at least 2 characters.'); return }
    setRoleFormError('')
    setRoleFormSaving(true)
    try {
      const body: Record<string, unknown> = { name: roleName.trim(), description: roleDesc.trim() || null, permissions: rolePerms }
      if (editingRole) {
        await updateRole(editingRole.role_id, body)
        toast('Role updated', 'success')
      } else {
        await createRole(body)
        toast('Role created', 'success')
      }
      setRoleFormOpen(false)
      loadRoles()
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; errors?: Array<{ msg: string }> } } }).response?.data
        : undefined
      const msg = data?.errors?.length ? data.errors.map(e => e.msg).join('; ') : data?.message ?? 'Save failed'
      setRoleFormError(msg)
    }
    setRoleFormSaving(false)
  }

  async function handleDeleteRole() {
    if (!deletingRole) return
    setDeleteLoading(true)
    try {
      await deleteRole(deletingRole.role_id)
      toast('Role deleted', 'success')
      setDeletingRole(null)
      setDeleteCheck(null)
      loadRoles()
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data
        : undefined
      toast(data?.message ?? 'Delete failed', 'error')
    }
    setDeleteLoading(false)
  }

  // ---- Role View ----

  async function openViewRole(r: RoleSummary) {
    setViewingRole(r)
    setViewLoading(true)
    try {
      const [permRes, userRes] = await Promise.all([
        getRolePermissions(r.role_id).catch(() => null),
        getRoleUsers(r.role_id).catch(() => null),
      ])
      const pd = permRes?.data?.permissions ?? permRes?.data ?? permRes?.permissions ?? permRes ?? []
      setViewPerms(Array.isArray(pd) ? pd : [])
      const ud = userRes?.data?.users ?? userRes?.data ?? userRes?.users ?? userRes ?? []
      setViewUsers(Array.isArray(ud) ? ud : [])
    } catch {
      setViewPerms([])
      setViewUsers([])
    }
    setViewLoading(false)
  }

  // ---- Permission CRUD ----

  function openCreatePerm() {
    setEditingPerm(null)
    setPermName('')
    setPermDesc('')
    setPermFormError('')
    setPermFormOpen(true)
  }

  function openEditPerm(p: PermissionRecord) {
    setEditingPerm(p)
    setPermName(p.permission_name)
    setPermDesc(p.description ?? '')
    setPermFormError('')
    setPermFormOpen(true)
  }

  async function handlePermSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!permName.trim()) { setPermFormError('Permission name is required.'); return }
    setPermFormError('')
    setPermFormSaving(true)
    try {
      const body: Record<string, unknown> = { name: permName.trim().toUpperCase(), description: permDesc.trim() || null }
      if (editingPerm) {
        await updatePermission(editingPerm.permission_id, body)
        toast('Permission updated', 'success')
      } else {
        await createPermission(body)
        toast('Permission created', 'success')
      }
      setPermFormOpen(false)
      loadPermissions()
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; errors?: Array<{ msg: string }> } } }).response?.data
        : undefined
      const msg = data?.errors?.length ? data.errors.map(e => e.msg).join('; ') : data?.message ?? 'Save failed'
      setPermFormError(msg)
    }
    setPermFormSaving(false)
  }

  async function handleDeletePerm() {
    if (!deletingPerm) return
    setPermDeleteLoading(true)
    try {
      await deletePermission(deletingPerm.permission_id)
      toast('Permission deleted', 'success')
      setDeletingPerm(null)
      setPermDeleteCheck(null)
      loadPermissions()
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data
        : undefined
      toast(data?.message ?? 'Delete failed', 'error')
    }
    setPermDeleteLoading(false)
  }

  // ---- Toggle role permission checkbox ----

  function togglePerm(permId: string) {
    setRolePerms(prev => prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId])
  }

  function selectAllPerms() {
    setRolePerms(allPermissions.map(p => p.permission_id))
  }

  function clearAllPerms() {
    setRolePerms([])
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Roles & Permissions</h1>
          <p className="page-subtitle">Manage roles and their permission sets</p>
        </div>
        {tab === 'roles' ? (
          <button type="button" className="btn btn--primary" onClick={openCreateRole}>+ Add Role</button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={openCreatePerm}>+ Add Permission</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {(['roles', 'permissions'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setPage(1); setSearch('') }}
            style={{
              padding: 'var(--space-3) var(--space-5)',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--primary)' : 'var(--text-secondary)',
              fontSize: 'var(--text-body)',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {t === 'roles' ? `Roles (${rolesTotal})` : `Permissions (${permissionsTotal})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="glass-card">
        <div className="search-input" style={{ marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input
            type="text"
            placeholder={tab === 'roles' ? 'Search roles...' : 'Search permissions...'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        {loading ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr key="loading-header"><th colSpan={6}><div className="skeleton skeleton--row" /></th></tr></thead>
              <tbody><tr key="loading"><td colSpan={6}><div className="skeleton skeleton--row" /></td></tr></tbody>
            </table>
          </div>
        ) : tab === 'roles' ? (
          /* ===== Roles Tab ===== */
          roles.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.35, marginBottom: 8 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <p>No roles found.</p>
              <button type="button" className="btn btn--primary" style={{ marginTop: 8 }} onClick={openCreateRole}>Add Role</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'center' }}>Users</th>
                    <th style={{ textAlign: 'center' }}>Permissions</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(r => (
                    <tr key={r.role_id}>
                      <td><strong>{r.role_name}</strong></td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || '—'}</td>
                      <td style={{ textAlign: 'center' }}>{r.user_count}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge--info" style={{ cursor: 'default' }}>{r.permission_count}</span>
                      </td>
                      <td>
                        {r.is_system ? (
                          <span className="badge badge--warning">System</span>
                        ) : (
                          <span className="badge badge--success">Custom</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openViewRole(r)}>View</button>
                          {!r.is_system && (
                            <>
                              <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openEditRole(r)}>Edit</button>
                              <button
                                type="button"
                                className="btn btn--ghost"
                                style={{ padding: '4px 10px', fontSize: 13, color: 'var(--danger)' }}
                                onClick={async () => {
                                  setDeletingRole(r)
                                  try {
                                    const res = await canDeleteRole(r.role_id)
                                    setDeleteCheck(res?.data ?? res)
                                  } catch {
                                    setDeleteCheck({ canDelete: false, isSystem: false, inUse: true })
                                  }
                                }}
                              >Delete</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ===== Permissions Tab ===== */
          permissions.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.35, marginBottom: 8 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              <p>No permissions found.</p>
              <button type="button" className="btn btn--primary" style={{ marginTop: 8 }} onClick={openCreatePerm}>Add Permission</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Permission</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map(p => (
                    <tr key={p.permission_id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, padding: '2px 8px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}>{p.permission_name}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => openEditPerm(p)}>Edit</button>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            style={{ padding: '4px 10px', fontSize: 13, color: 'var(--danger)' }}
                            onClick={async () => {
                              setDeletingPerm(p)
                              try {
                                const res = await canDeletePermission(p.permission_id)
                                setPermDeleteCheck(res?.data ?? res)
                              } catch {
                                setPermDeleteCheck({ canDelete: true, rolesAffected: [] })
                              }
                            }}
                          >Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Pagination */}
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

      {/* ======== Role Create/Edit Modal ======== */}
      {roleFormOpen && (
        <div className="modal-overlay" onClick={() => setRoleFormOpen(false)}>
          <div className="modal" style={{ maxWidth: 560, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{editingRole ? 'Edit Role' : 'Add Role'}</h3>
              <button type="button" className="btn btn--ghost" onClick={() => setRoleFormOpen(false)} style={{ padding: '4px 8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} style={{ padding: 'var(--space-5)', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
              {roleFormError && <div className="auth-feedback auth-feedback--error" style={{ marginBottom: 12 }}>{roleFormError}</div>}

              <div className="field">
                <span>Role Name *</span>
                <input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. Warehouse Manager" autoFocus />
              </div>
              <div className="field">
                <span>Description</span>
                <input value={roleDesc} onChange={(e) => setRoleDesc(e.target.value)} placeholder="Brief description of this role" />
              </div>

              {/* Permission assignment */}
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-body)' }}>Permissions</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn--ghost" style={{ padding: '2px 8px', fontSize: 12 }} onClick={selectAllPerms}>Select All</button>
                    <button type="button" className="btn btn--ghost" style={{ padding: '2px 8px', fontSize: 12 }} onClick={clearAllPerms}>Clear</button>
                  </div>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {allPermissions.length === 0 ? (
                    <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No permissions available</div>
                  ) : (
                    allPermissions.map(p => (
                      <label key={p.permission_id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '8px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 'var(--text-body)' }}>
                        <input type="checkbox" checked={rolePerms.includes(p.permission_id)} onChange={() => togglePerm(p.permission_id)} />
                        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{p.permission_name}</span>
                        {p.description && <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginLeft: 'auto' }}>{p.description}</span>}
                      </label>
                    ))
                  )}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>{rolePerms.length} selected</div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-5)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                <button type="button" className="btn btn--ghost" onClick={() => setRoleFormOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={roleFormSaving}>{roleFormSaving ? 'Saving...' : editingRole ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======== Role View Modal ======== */}
      {viewingRole && (
        <div className="modal-overlay" onClick={() => setViewingRole(null)}>
          <div className="modal" style={{ maxWidth: 600, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{viewingRole.role_name}</h3>
                {viewingRole.is_system ? <span className="badge badge--warning">System</span> : <span className="badge badge--success">Custom</span>}
              </div>
              <button type="button" className="btn btn--ghost" onClick={() => setViewingRole(null)} style={{ padding: '4px 8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div style={{ padding: 'var(--space-5)', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
              {viewLoading ? (
                <div className="skeleton skeleton--row" />
              ) : (
                <>
                  {/* Description */}
                  {viewingRole.description && (
                    <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-body)' }}>
                      {viewingRole.description}
                    </div>
                  )}

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                    <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Users</span>
                      <div style={{ fontSize: 'var(--text-h4)', marginTop: 2, color: 'var(--text-primary)' }}>{viewingRole.user_count}</div>
                    </div>
                    <div style={{ padding: 'var(--space-3)', background: 'var(--bg)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>Permissions</span>
                      <div style={{ fontSize: 'var(--text-h4)', marginTop: 2, color: 'var(--text-primary)' }}>{viewPerms.length}</div>
                    </div>
                  </div>

                  {/* Permissions list */}
                  <label style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Permissions</label>
                  {viewPerms.length === 0 ? (
                    <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, background: 'var(--bg)', borderRadius: 8, marginTop: 8, border: '1px dashed var(--border)' }}>
                      No permissions assigned
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {viewPerms.map(p => (
                        <span key={p.permission_id} style={{ fontFamily: 'monospace', fontSize: 12, padding: '3px 10px', background: 'var(--bg)', borderRadius: 999, border: '1px solid var(--border)' }}>{p.permission_name}</span>
                      ))}
                    </div>
                  )}

                  {/* Users list */}
                  {viewUsers.length > 0 && (
                    <div style={{ marginTop: 'var(--space-5)' }}>
                      <label style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Users with this Role</label>
                      <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 8, maxHeight: 150, overflowY: 'auto' }}>
                        {viewUsers.map(u => (
                          <div key={u.user_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 'var(--text-body)' }}>
                            <span>{u.full_name}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{u.email || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--border)' }}>
              {!viewingRole.is_system && (
                <button type="button" className="btn btn--ghost" onClick={() => { const r = viewingRole; setViewingRole(null); openEditRole(r) }}>Edit</button>
              )}
              <button type="button" className="btn btn--ghost" onClick={() => setViewingRole(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ======== Role Delete Confirm ======== */}
      <ConfirmModal
        open={!!deletingRole}
        title="Delete Role"
        message={!deleteCheck ? undefined : !deleteCheck.canDelete
          ? (deleteCheck.isSystem ? 'System roles cannot be deleted.' : 'This role is assigned to users and cannot be deleted. Reassign users first.')
          : `Are you sure you want to delete ${deletingRole?.role_name}? This action cannot be undone.`
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteRole}
        onCancel={() => { setDeletingRole(null); setDeleteCheck(null) }}
      />

      {/* ======== Permission Create/Edit Modal ======== */}
      {permFormOpen && (
        <div className="modal-overlay" onClick={() => setPermFormOpen(false)}>
          <div className="modal" style={{ maxWidth: 480, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{editingPerm ? 'Edit Permission' : 'Add Permission'}</h3>
              <button type="button" className="btn btn--ghost" onClick={() => setPermFormOpen(false)} style={{ padding: '4px 8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handlePermSubmit} style={{ padding: 'var(--space-5)' }}>
              {permFormError && <div className="auth-feedback auth-feedback--error" style={{ marginBottom: 12 }}>{permFormError}</div>}

              <div className="field">
                <span>Permission Name *</span>
                <input
                  value={permName}
                  onChange={(e) => setPermName(e.target.value.toUpperCase())}
                  placeholder="e.g. VIEW_REPORTS"
                  autoFocus
                  style={{ fontFamily: 'monospace' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'block' }}>Use UPPER_SNAKE_CASE format</span>
              </div>
              <div className="field">
                <span>Description</span>
                <input value={permDesc} onChange={(e) => setPermDesc(e.target.value)} placeholder="What does this permission allow?" />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-5)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                <button type="button" className="btn btn--ghost" onClick={() => setPermFormOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={permFormSaving}>{permFormSaving ? 'Saving...' : editingPerm ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======== Permission Delete Confirm ======== */}
      <ConfirmModal
        open={!!deletingPerm}
        title="Delete Permission"
        confirmLabel="Delete"
        variant="danger"
        loading={permDeleteLoading}
        onConfirm={handleDeletePerm}
        onCancel={() => { setDeletingPerm(null); setPermDeleteCheck(null) }}
      >
        <p style={{ color: 'var(--text-secondary)', marginBottom: permDeleteCheck?.rolesAffected?.length ? 12 : 0, fontSize: 14 }}>
          Are you sure you want to delete <strong style={{ fontFamily: 'monospace' }}>{deletingPerm?.permission_name}</strong>?
        </p>
        {permDeleteCheck && permDeleteCheck.rolesAffected.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>This permission will be removed from {permDeleteCheck.rolesAffected.length} role(s):</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {permDeleteCheck.rolesAffected.map(r => (
                <span key={r.role_id} className="badge badge--info">{r.role_name}</span>
              ))}
            </div>
          </div>
        )}
      </ConfirmModal>
    </div>
  )
}
