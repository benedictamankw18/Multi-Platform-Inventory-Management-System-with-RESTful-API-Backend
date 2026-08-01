import { useEffect, useState, useCallback, useRef } from 'react'
import { getMyProfile, updateMyProfile, changeMyPassword, uploadProfilePhoto, resolveImageUrl } from '../services/api'
import type { UserProfile } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

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
    setLoading(false)
  }, [])

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
    </div>
  )
}
