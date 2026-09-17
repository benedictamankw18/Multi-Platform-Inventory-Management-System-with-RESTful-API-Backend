import { useEffect, useState, useCallback, useRef } from 'react'
import { getBusinessSettings, updateBusinessSettings, uploadBusinessLogo, resolveImageUrl } from '../services/api'

interface BusinessSettings {
  business_name: string
  business_type: string | null
  address: string | null
  phone: string | null
  business_email: string | null
  website: string | null
  tax_number: string | null
  currency: string | null
  timezone: string | null
  date_format: string | null
  registration_number: string | null
  receipt_footer: string | null
  logo: string | null
  language: string | null
  allow_negative_stock: boolean
  enable_offline_mode: boolean
}

const BUSINESS_TYPES = ['RETAIL', 'WHOLESALE', 'BOTH']
const CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'PHP', 'INR', 'JPY', 'CAD', 'AUD', 'SGD', 'MYR', 'THB', 'VND', 'IDR', 'KRW', 'CNY', 'BRL', 'MXN', 'CHF', 'NZD', 'TWD', 'HKD', 'SAR', 'AED', 'NGN', 'ZAR', 'KES', 'EGP']
const TIMEZONES = Intl.supportedValuesOf?.('timeZone') ?? ['UTC', 'Asia/Manila', 'America/New_York', 'Europe/London', 'Asia/Kolkata']
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'ru', label: 'Русский' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'sw', label: 'Kiswahili' },
]

export default function BusinessSettingsPage() {
  const [form, setForm] = useState<Partial<BusinessSettings>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getBusinessSettings()
      if (data) setForm(data)
    } catch {
      setMessage({ type: 'error', text: 'Failed to load business settings.' })
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value || null }))
  const setBool = (key: 'allow_negative_stock' | 'enable_offline_mode', value: boolean) => setForm((prev) => ({ ...prev, [key]: value }))

  const notifySettingsUpdated = () => window.dispatchEvent(new CustomEvent('business-settings-updated'))

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await updateBusinessSettings(form)
      setMessage({ type: 'success', text: 'Business settings saved successfully.' })
      notifySettingsUpdated()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save business settings.'
      setMessage({ type: 'error', text: msg })
    }
    setSaving(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadBusinessLogo(file)
      if (result?.data?.logo) setForm((prev) => ({ ...prev, logo: result.data.logo }))
      setMessage({ type: 'success', text: 'Logo uploaded successfully.' })
      notifySettingsUpdated()
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload logo.' })
    }
    setUploading(false)
  }

  const logoUrl = form.logo ? resolveImageUrl(form.logo) : null

  if (loading) {
    return (
      <div className="page">
        <div className="page-header"><div><h1>Business Settings</h1><p className="page-subtitle">Manage your business profile and regional preferences</p></div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="glass-card">
            <div className="skeleton skeleton--row" style={{ marginBottom: 'var(--space-4)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton--row" />)}
            </div>
          </div>
          <div className="glass-card">
            <div className="skeleton skeleton--row" style={{ marginBottom: 'var(--space-4)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton skeleton--row" />)}
            </div>
          </div>
          <div className="glass-card">
            <div className="skeleton skeleton--row" style={{ marginBottom: 'var(--space-4)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton--row" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const label = (text: string) => <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>{text}</label>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Business Settings</h1>
          <p className="page-subtitle">Manage your business profile and regional preferences</p>
        </div>
      </div>

      {message && <div className={`alert alert--${message.type}`} style={{ marginBottom: 'var(--space-4)' }}>{message.text}</div>}

      <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} ref={fileInputRef} onChange={handleLogoUpload} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="glass-card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-4)' }}>Business Info</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ width: 80, height: 80, borderRadius: 8, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 28, color: 'var(--text-tertiary)', fontWeight: 600 }}>{form.business_name?.[0] || 'B'}</span>
                )}
              </div>
              <div>
                <button type="button" className="btn btn--secondary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload Logo'}
                </button>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>JPG, PNG or WEBP. Max 5MB.</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Business Name')}
              <input type="text" className="input" value={form.business_name || ''} onChange={(e) => set('business_name', e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Business Type')}
              <select className="input" value={form.business_type || ''} onChange={(e) => set('business_type', e.target.value)}>
                <option value="">Select type</option>
                {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Website')}
              <input type="text" className="input" value={form.website || ''} onChange={(e) => set('website', e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Tax Number')}
              <input type="text" className="input" value={form.tax_number || ''} onChange={(e) => set('tax_number', e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Registration Number')}
              <input type="text" className="input" value={form.registration_number || ''} onChange={(e) => set('registration_number', e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Receipt Footer')}
              <input type="text" className="input" value={form.receipt_footer || ''} onChange={(e) => set('receipt_footer', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-4)' }}>Contact</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Phone')}
              <input type="text" className="input" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Email')}
              <input type="email" className="input" value={form.business_email || ''} onChange={(e) => set('business_email', e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Address')}
              <input type="text" className="input" value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-4)' }}>Regional</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Currency')}
              <select className="input" value={form.currency || ''} onChange={(e) => set('currency', e.target.value)}>
                <option value="">Select currency</option>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Timezone')}
              <select className="input" value={form.timezone || ''} onChange={(e) => set('timezone', e.target.value)}>
                <option value="">Select timezone</option>
                {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Date Format')}
              <input type="text" className="input" value={form.date_format || ''} onChange={(e) => set('date_format', e.target.value)} placeholder="e.g. YYYY-MM-DD" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {label('Language')}
              <select className="input" value={form.language || ''} onChange={(e) => set('language', e.target.value)}>
                <option value="">Select language</option>
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label className="branch-toggle">
                <input type="checkbox" checked={!!form.allow_negative_stock} onChange={(e) => setBool('allow_negative_stock', e.target.checked)} />
                <span className="branch-toggle__track"><span className="branch-toggle__thumb" /></span>
                <span className="branch-toggle__label">Allow negative stock</span>
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label className="branch-toggle">
                <input type="checkbox" checked={!!form.enable_offline_mode} onChange={(e) => setBool('enable_offline_mode', e.target.checked)} />
                <span className="branch-toggle__track"><span className="branch-toggle__thumb" /></span>
                <span className="branch-toggle__label">Enable offline mode</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}