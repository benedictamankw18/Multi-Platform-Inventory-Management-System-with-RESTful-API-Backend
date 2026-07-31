import { useEffect, useState, useCallback } from 'react'
import { getSmsBalance, type SmsBalance } from '../services/api'

export default function SmsBalancePage() {
  const [balance, setBalance] = useState<SmsBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await getSmsBalance()
      if (res?.data) setBalance(res.data)
      setMessage(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to fetch SMS balance.'
      setMessage({ type: 'error', text: msg })
    }
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  const handleRefresh = async () => {
    setRefreshing(true)
    setMessage(null)
    try {
      const res = await getSmsBalance()
      if (res?.data) setBalance(res.data)
      setMessage({ type: 'success', text: 'Balance refreshed.' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to refresh SMS balance.'
      setMessage({ type: 'error', text: msg })
    }
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header"><div><h1>SMS Balance</h1><p className="page-subtitle">Agoo SMS account balance</p></div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="glass-card">
            <div className="skeleton skeleton--row" style={{ width: 160, marginBottom: 'var(--space-3)' }} />
            <div className="skeleton skeleton--row" style={{ width: 80 }} />
          </div>
        </div>
      </div>
    )
  }

  const hasBalance = balance?.balance != null

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>SMS Balance</h1>
          <p className="page-subtitle">Agoo SMS account balance</p>
        </div>
      </div>

      {message && <div className={`alert alert--${message.type}`} style={{ marginBottom: 'var(--space-4)' }}>{message.text}</div>}

      <div className="glass-card" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Available Balance</p>
            {hasBalance ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 40, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {Number(balance!.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
                <span className="badge badge--info">{balance!.currency || ''}</span>
              </div>
            ) : (
              <p style={{ color: 'var(--text-tertiary)' }}>No balance data available.</p>
            )}
          </div>
          <button type="button" className="btn btn--primary" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {balance?.checkedAt && (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 'var(--space-3)' }}>
            Last checked: {new Date(balance.checkedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}