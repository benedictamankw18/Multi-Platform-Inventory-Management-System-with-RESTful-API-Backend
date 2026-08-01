import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { getBranches, lookupUsers, createNotification, type BranchInfo } from '../services/api'

const NOTIFICATION_TYPES = ['INFO', 'WARNING', 'ERROR', 'SUCCESS', 'OTHER', 'TRANSFER_REQUEST', 'BRANCH_SHORTAGE', 'SYNC_FAILURE', 'LOW_STOCK']
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
const CHANNELS = ['in_app', 'email', 'sms']

interface UserResult {
  user_id: string
  full_name: string
  email: string | null
  phone: string | null
}

export default function CreateNotificationPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('INFO')
  const [priority, setPriority] = useState('NORMAL')
  const [branchId, setBranchId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [channels, setChannels] = useState<string[]>(['in_app'])
  const [recipients, setRecipients] = useState<UserResult[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [showUserResults, setShowUserResults] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    setLoading(true)
    getBranches().then((res) => {
      const arr = Array.isArray(res) ? res : res?.data ?? res?.branches ?? []
      setBranches(arr)
      if (arr.length > 0 && !branchId) setBranchId(arr[0].branch_id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleUserSearch = useCallback(async (q: string) => {
    setUserSearch(q)
    if (q.trim().length < 2) { setUserResults([]); setShowUserResults(false); return }
    setSearching(true)
    try {
      const res = await lookupUsers(q)
      setUserResults(Array.isArray(res?.users) ? res.users : [])
      setShowUserResults(true)
    } catch { setUserResults([]) }
    setSearching(false)
  }, [])

  function addRecipient(user: UserResult) {
    if (recipients.some((r) => r.user_id === user.user_id)) return
    setRecipients((prev) => [...prev, user])
    setUserSearch('')
    setUserResults([])
    setShowUserResults(false)
  }

  function removeRecipient(userId: string) {
    setRecipients((prev) => prev.filter((r) => r.user_id !== userId))
  }

  function toggleChannel(ch: string) {
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch])
  }

  async function handleSubmit() {
    if (!title.trim()) { toast('Title is required.', 'error'); return }
    if (!message.trim()) { toast('Message is required.', 'error'); return }
    if (recipients.length === 0) { toast('At least one recipient is required.', 'error'); return }

    setSaving(true)
    try {
      await createNotification({
        title: title.trim(),
        message: message.trim(),
        branch_id: branchId,
        type,
        priority,
        recipients: recipients.map((r) => r.user_id),
        channels,
        expires_at: expiresAt || undefined,
      })
      toast('Notification sent successfully.', 'success')
      navigate('/notifications')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send notification.'
      toast(msg, 'error')
    }
    setSaving(false)
  }

  const label = (text: string) => <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{text}</label>

  if (loading) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="skeleton skeleton--row" />
          <div className="skeleton skeleton--row" />
          <div className="skeleton skeleton--row" />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Create Notification</h1>
          <p className="page-subtitle">Send a notification to users via in-app, email, or SMS</p>
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
            {label('Title')}
            <input type="text" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification headline" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
            {label('Message')}
            <textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Notification body text" rows={4} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {label('Type')}
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {NOTIFICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {label('Priority')}
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {label('Branch')}
            <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Select branch</option>
              {branches.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {label('Expires At (optional)')}
            <input type="datetime-local" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
            {label('Delivery Channels')}
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 4 }}>
              {CHANNELS.map((ch) => (
                <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={channels.includes(ch)} onChange={() => toggleChannel(ch)} />
                  {ch === 'in_app' ? 'In-App' : ch === 'email' ? 'Email' : 'SMS'}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
            {label('Recipients')}
            <div style={{ position: 'relative' }}>
              <input type="text" className="input" placeholder="Search by name, email, or phone..." value={userSearch} onChange={(e) => handleUserSearch(e.target.value)}
                onFocus={() => { if (userResults.length > 0) setShowUserResults(true) }}
                onBlur={() => setTimeout(() => setShowUserResults(false), 200)} />
              {showUserResults && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto', marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {searching ? (
                    <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Searching...</div>
                  ) : userResults.length === 0 ? (
                    <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No users found.</div>
                  ) : userResults.map((u) => (
                    <div key={u.user_id} onMouseDown={() => addRecipient(u)}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span><strong>{u.full_name}</strong> {u.email ? `<${u.email}>` : ''}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{u.phone || ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {recipients.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {recipients.map((r) => (
                  <span key={r.user_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'var(--primary-light, rgba(59,130,246,0.1))', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>
                    {r.full_name}
                    <button type="button" onClick={() => removeRecipient(r.user_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1, color: 'var(--text-secondary)' }} title="Remove">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <button type="button" className="btn btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Sending...' : 'Send Notification'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/notifications')} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
