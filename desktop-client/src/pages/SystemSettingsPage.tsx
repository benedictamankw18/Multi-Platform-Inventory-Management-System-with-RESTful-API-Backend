import { useEffect, useState, useCallback } from 'react'
import { getSystemSettings, updateSystemSettings } from '../services/api'

interface SystemSetting {
  id: string
  key: string
  value: string | number | boolean
  type: string
  description: string | null
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<{ key: string; type: 'string' | 'number' | 'boolean'; value: string; description: string }>({ key: '', type: 'string', value: '', description: '' })
  const [keyError, setKeyError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getSystemSettings()
      setSettings(Array.isArray(res?.data) ? res.data : [])
    } catch {
      setMessage({ type: 'error', text: 'Failed to load system settings.' })
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const startEdit = (s: SystemSetting) => {
    setEditId(s.id)
    setEditValue(String(s.value))
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditValue('')
  }

  const saveEdit = async (s: SystemSetting) => {
    setSaving(s.id)
    setMessage(null)
    try {
      const parsedValue = s.type === 'number' ? Number(editValue) : s.type === 'boolean' ? editValue === 'true' : editValue
      await updateSystemSettings({ key: s.key, value: parsedValue })
      setSettings((prev) => prev.map((p) => p.id === s.id ? { ...p, value: parsedValue } : p))
      setEditId(null)
      setMessage({ type: 'success', text: `"${s.key}" updated.` })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update setting.'
      setMessage({ type: 'error', text: msg })
    }
    setSaving(null)
  }

  const handleCreate = async () => {
    if (!/^[a-zA-Z][a-zA-Z0-9_.:-]{1,99}$/.test(createForm.key)) {
      setKeyError('Key must start with a letter and contain only letters, numbers, _, ., :, or -.')
      return
    }
    setKeyError('')
    setSaving('__create__')
    setMessage(null)
    try {
      const parsedValue = createForm.type === 'number' ? Number(createForm.value) : createForm.type === 'boolean' ? createForm.value === 'true' : createForm.value
      await updateSystemSettings({ key: createForm.key, value: parsedValue, type: createForm.type, description: createForm.description || null })
      setShowCreate(false)
      setCreateForm({ key: '', type: 'string', value: '', description: '' })
      await load()
      setMessage({ type: 'success', text: `"${createForm.key}" created.` })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create setting.'
      setMessage({ type: 'error', text: msg })
    }
    setSaving(null)
  }

  const toggleBool = async (s: SystemSetting) => {
    setSaving(s.id)
    setMessage(null)
    try {
      const newValue = !s.value
      await updateSystemSettings({ key: s.key, value: newValue })
      setSettings((prev) => prev.map((p) => p.id === s.id ? { ...p, value: newValue } : p))
      setMessage({ type: 'success', text: `"${s.key}" updated.` })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update setting.'
      setMessage({ type: 'error', text: msg })
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header"><div><h1>System Settings</h1><p className="page-subtitle">Application-wide configuration values</p></div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="glass-card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton--row" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>System Settings</h1>
          <p className="page-subtitle">Application-wide configuration values</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setShowCreate(true)}>Add Setting</button>
      </div>

      {message && <div className={`alert alert--${message.type}`} style={{ marginBottom: 'var(--space-4)' }}>{message.text}</div>}

      <div className="glass-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th>Type</th>
                <th>Description</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {settings.length === 0 ? (
                <tr key="empty"><td colSpan={5}><div className="empty-state"><p>No settings found.</p></div></td></tr>
              ) : settings.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{s.key}</td>
                  <td>
                    {s.type === 'boolean' ? (
                      <label className="branch-toggle" style={{ margin: 0 }}>
                        <input type="checkbox" checked={!!s.value} disabled={saving === s.id} onChange={() => toggleBool(s)} />
                        <span className="branch-toggle__track"><span className="branch-toggle__thumb" /></span>
                      </label>
                    ) : editId === s.id ? (
                      <input
                        type={s.type === 'number' ? 'number' : 'text'}
                        className="input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{ width: '100%' }}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(s); if (e.key === 'Escape') cancelEdit() }}
                      />
                    ) : (
                      <span>{String(s.value)}</span>
                    )}
                  </td>
                  <td><span className="badge badge--info">{s.type}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.description || '—'}</td>
                  <td>
                    {s.type === 'boolean' ? (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Toggle</span>
                    ) : editId === s.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => saveEdit(s)} disabled={saving === s.id}>
                          {saving === s.id ? '...' : 'Save'}
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={cancelEdit}>Cancel</button>
                      </div>
                    ) : (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => startEdit(s)} disabled={saving === s.id}>Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => { if (saving !== '__create__') { setShowCreate(false); setKeyError('') }}}>
          <div className="modal" style={{ maxWidth: 480, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Create Setting</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Key *</label>
                <input type="text" className="input" value={createForm.key} onChange={(e) => { setCreateForm((p) => ({ ...p, key: e.target.value })); setKeyError('') }} placeholder="e.g. my_custom_setting" />
                {keyError && <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 2 }}>{keyError}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Type *</label>
                <select className="input" value={createForm.type} onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value as 'string' | 'number' | 'boolean', value: '' }))}>
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Value *</label>
                {createForm.type === 'boolean' ? (
                  <select className="input" value={createForm.value} onChange={(e) => setCreateForm((p) => ({ ...p, value: e.target.value }))}>
                    <option value="">Select value</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input type={createForm.type === 'number' ? 'number' : 'text'} className="input" value={createForm.value} onChange={(e) => setCreateForm((p) => ({ ...p, value: e.target.value }))} placeholder={createForm.type === 'number' ? '0' : ''} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Description</label>
                <textarea className="input" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Optional description" maxLength={500} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--ghost" onClick={() => { setShowCreate(false); setKeyError('') }} disabled={saving === '__create__'}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={handleCreate} disabled={saving === '__create__' || !createForm.key || !createForm.value}>
                {saving === '__create__' ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}