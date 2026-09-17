import { useEffect, useState, useCallback, useRef } from 'react'
import { getMyProfile, updateMyProfile, changeMyPassword, uploadProfilePhoto, resolveImageUrl, getSessions, getLoginHistory, revokeSession } from '../services/api'
import type { UserProfile } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

type UserSession = {
  session_id: string
  user_id: string
  token_identifier: string
  issued_at: string
  expires_at: string
  last_activity_at: string
  revoked: boolean
  created_at: string
  updated_at: string
}

type LoginHistoryItem = {
  login_id: string
  user_id: string | null
  username: string | null
  session_id: string | null
  login_time: string
  logout_time: string | null
  ip_address: string | null
  user_agent: string | null
  device: string | null
  operating_system: string | null
  browser: string | null
  successful: boolean
  failure_reason: string | null
  location: string | null
  created_at: string
}

function getCurrentSessionId(): string | null {
  const raw = localStorage.getItem('accessToken')
  if (!raw) return null
  try {
    const part = raw.split('.')[1]
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as { sid?: string }
    return payload.sid ?? null
  } catch {
    return null
  }
}

export default function UserProfilePage() {
  const { updateUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPwd, setShowCurrentPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sessions, setSessions] = useState<UserSession[]>([])
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([])

  const SESSION_PAGE_SIZE = 10
  const [sessionPage, setSessionPage] = useState(1)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [sessionLoading, setSessionLoading] = useState(false)

  const fmt = (v: string | null | undefined) => (v ? new Date(v).toLocaleString() : '-')

  const loadSessions = useCallback(async (page: number) => {
    setSessionLoading(true)
    try {
      const res = await getSessions({ page, limit: SESSION_PAGE_SIZE })
      setSessions(res?.sessions ?? [])
      setSessionTotal(Number(res?.total ?? 0))
      setSessionPage(page)
    } catch {
      setSessions([])
      setSessionTotal(0)
    } finally {
      setSessionLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMyProfile()
      setProfile(data)
      setFullName(data.fullName || '')
      setEmail(data.email || '')
      setPhone(data.phone || '')
    } catch {
      setMessage({ type: 'error', text: 'Failed to load profile.' })
    }
    await loadSessions(1)
    try {
      const res = await getLoginHistory()
      setLoginHistory(res?.loginHistory ?? [])
    } catch {
      setLoginHistory([])
    }
    setLoading(false)
  }, [loadSessions])

  useEffect(() => { load() }, [load])

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const updated = await updateMyProfile({
        fullName: fullName || undefined,
        email: email || undefined,
        phone: phone || null,
      })
      setProfile(updated)
      updateUser(updated)
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update profile.'
      setMessage({ type: 'error', text: msg })
    }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    setChangingPwd(true)
    setMessage(null)
    try {
      await changeMyPassword({ currentPassword, newPassword })
      setMessage({ type: 'success', text: 'Password changed successfully. Please log in again.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to change password.'
      setMessage({ type: 'error', text: msg })
    }
    setChangingPwd(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const updated = await uploadProfilePhoto(file)
      setProfile(updated)
      updateUser(updated)
      setMessage({ type: 'success', text: 'Profile photo updated.' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to upload photo.'
      setMessage({ type: 'error', text: msg })
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const currentSessionId = getCurrentSessionId()

  const handleRevoke = async (sessionId: string) => {
    try {
      await revokeSession(sessionId)
      await loadSessions(sessionPage)
      setMessage({ type: 'success', text: 'Session revoked.' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to revoke session.'
      setMessage({ type: 'error', text: msg })
    }
  }

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

  const label = (text: string) => (
    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{text}</label>
  )

  const EyeToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <span
      onClick={onToggle}
      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex', color: 'var(--text-secondary)' }}
      tabIndex={-1}
    >
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </span>
  )

  const photoUrl = profile?.profilePhoto ? resolveImageUrl(profile.profilePhoto) : null

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p className="page-subtitle">Manage your account settings</p>
        </div>
      </div>

      {message && (
        <div className={`alert alert--${message.type}`} style={{ marginBottom: 'var(--space-4)' }}>
          {message.text}
        </div>
      )}

      {/* Profile Information */}
      <div className="glass-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ color: '#0119b4', margin: '0 0 20px', fontSize: '0.95rem' }}>Profile Information</h3>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-gradient, linear-gradient(135deg, #667eea, #764ba2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 28, fontWeight: 700, overflow: 'hidden',
              }}
            >
              {photoUrl ? (
                <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                profile?.fullName?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleFileChange} />
            <button type="button" className="btn btn--secondary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>
          <div style={{ flex: 1, minWidth: 280, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Username')}
              <input type="text" className="input" value={profile?.username || ''} disabled />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Full Name')}
              <input type="text" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Email')}
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Phone')}
              <input type="text" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Role')}
              <input type="text" className="input" value={profile?.role || ''} disabled />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Branch')}
              <input type="text" className="input" value={profile?.branchName || 'None'} disabled />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <button type="button" className="btn btn--primary" onClick={handleSaveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="glass-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ color: '#0119b4', margin: '0 0 20px', fontSize: '0.95rem' }}>Change Password</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--space-4)', maxWidth: 600 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {label('Current Password')}
            <div style={{ position: 'relative' }}>
              <input type={showCurrentPwd ? 'text' : 'password'} className="input" style={{ paddingRight: 36 }} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              <EyeToggle show={showCurrentPwd} onToggle={() => setShowCurrentPwd(!showCurrentPwd)} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {label('New Password')}
            <div style={{ position: 'relative' }}>
              <input type={showNewPwd ? 'text' : 'password'} className="input" style={{ paddingRight: 36 }} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <EyeToggle show={showNewPwd} onToggle={() => setShowNewPwd(!showNewPwd)} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {label('Confirm New Password')}
            <div style={{ position: 'relative' }}>
              <input type={showConfirmPwd ? 'text' : 'password'} className="input" style={{ paddingRight: 36 }} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <EyeToggle show={showConfirmPwd} onToggle={() => setShowConfirmPwd(!showConfirmPwd)} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <button type="button" className="btn btn--primary" onClick={handleChangePassword} disabled={changingPwd || !currentPassword || !newPassword || !confirmPassword}>
            {changingPwd ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* Account Details */}
      <div className="glass-card">
        <h3 style={{ color: '#0119b4', margin: '0 0 20px', fontSize: '0.95rem' }}>Account Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--space-4)', maxWidth: 600 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {label('Member Since')}
            <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {label('Last Login')}
            <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>
              {profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Never'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {label('Account Status')}
            <span style={{ color: profile?.isActive ? '#4ade80' : '#f87171', fontSize: 14, fontWeight: 600 }}>
              {profile?.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="glass-card" style={{ marginTop: 'var(--space-4)' }}>
        <h3 style={{ color: '#0119b4', margin: '0 0 20px', fontSize: '0.95rem' }}>Active Sessions</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Issued</th>
                <th>Last Active</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state"><p>No sessions found.</p></div>
                  </td>
                </tr>
              ) : sessions.map((s) => {
                const isCurrent = s.session_id === currentSessionId
                return (
                  <tr key={s.session_id}>
                    <td>{fmt(s.issued_at)}</td>
                    <td>{fmt(s.last_activity_at)}</td>
                    <td>{fmt(s.expires_at)}</td>
                    <td>
                      <span className={`badge badge--${s.revoked ? 'danger' : 'success'}`}>
                        {s.revoked ? 'Revoked' : isCurrent ? 'Active (current)' : 'Active'}
                      </span>
                    </td>
                    <td>{fmt(s.created_at)}</td>
                    <td>{fmt(s.updated_at)}</td>
                    <td>
                      {!s.revoked && !isCurrent && (
                        <button type="button" className="btn btn--secondary" style={{ fontSize: 12, padding: '2px 10px' }} onClick={() => handleRevoke(s.session_id)}>
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-3)', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {sessionTotal} session{sessionTotal === 1 ? '' : 's'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="btn btn--secondary" style={{ fontSize: 12, padding: '4px 12px' }} disabled={sessionPage <= 1 || sessionLoading} onClick={() => loadSessions(sessionPage - 1)}>
              Previous
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Page {sessionPage} of {Math.max(1, Math.ceil(sessionTotal / SESSION_PAGE_SIZE))}
            </span>
            <button type="button" className="btn btn--secondary" style={{ fontSize: 12, padding: '4px 12px' }} disabled={sessionPage >= Math.max(1, Math.ceil(sessionTotal / SESSION_PAGE_SIZE)) || sessionLoading} onClick={() => loadSessions(sessionPage + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Login History */}
      <div className="glass-card" style={{ marginTop: 'var(--space-4)' }}>
        <h3 style={{ color: '#0119b4', margin: '0 0 20px', fontSize: '0.95rem' }}>Login History</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Device</th>
                <th>OS</th>
                <th>Browser</th>
                <th>IP</th>
                <th>Location</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {loginHistory.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state"><p>No login history found.</p></div>
                  </td>
                </tr>
              ) : loginHistory.map((h) => (
                <tr key={h.login_id}>
                  <td>{fmt(h.login_time)}</td>
                  <td>{h.device || '-'}</td>
                  <td>{h.operating_system || '-'}</td>
                  <td>{h.browser || '-'}</td>
                  <td>{h.ip_address || '-'}</td>
                  <td>{h.location || '-'}</td>
                  <td>
                    <span className={`badge badge--${h.successful ? 'success' : 'danger'}`}>
                      {h.successful ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td>{h.failure_reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
