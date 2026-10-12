import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/BusinessSettingsContext'
import { useToast } from '../contexts/ToastContext'
import {
  getExpiryReport,
  getBranches,
  type ExpiryReportItem,
  type ExpiryReconciliation,
  type ExpiryStatus,
} from '../services/api'

const WITHIN_OPTIONS = [7, 14, 30, 60, 90]

type BranchOption = { branch_id: string; branch_name?: string | null }

function expiryBadgeClass(status: ExpiryStatus): string {
  switch (status) {
    case 'EXPIRED':
      return 'badge--danger'
    case 'CRITICAL':
      return 'badge--warning'
    case 'WARNING':
      return 'badge--info'
    default:
      return 'badge--success'
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function errText(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { message?: string } } }).response
    return resp?.data?.message ?? fallback
  }
  return fallback
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="glass-card" style={{ padding: 'var(--space-5)' }}>
      <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 'var(--text-h3)', fontWeight: 700, fontFamily: 'monospace', color: accent || 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function ExpiryReportPage() {
  const { selectedBranch } = useAuth()
  const { formatCurrency } = useCurrency()
  const { toast } = useToast()

  const [branches, setBranches] = useState<BranchOption[]>([])
  const [branchId, setBranchId] = useState(selectedBranch?.branch_id ?? '')
  const [withinDays, setWithinDays] = useState(30)
  const [includeExpired, setIncludeExpired] = useState(true)

  const [rows, setRows] = useState<ExpiryReportItem[]>([])
  const [recon, setRecon] = useState<ExpiryReconciliation | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getExpiryReport({ branchId: branchId || undefined, withinDays, includeExpired })
      setRows(Array.isArray(res?.data) ? res.data : [])
      setRecon(res?.reconciliation ?? null)
    } catch (err) {
      setRows([])
      setRecon(null)
      toast(errText(err, 'Failed to load expiry report.'), 'error')
    }
    setLoading(false)
  }, [branchId, withinDays, includeExpired, toast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    getBranches()
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data ?? res?.branches ?? []
        setBranches(list)
      })
      .catch(() => setBranches([]))
  }, [])

  const summary = useMemo(() => {
    const expired = rows.filter((r) => r.expiry_status === 'EXPIRED').length
    const value = rows.reduce((s, r) => s + Number(r.value_at_cost || 0), 0)
    const units = rows.reduce((s, r) => s + Number(r.quantity_on_hand || 0), 0)
    return { lots: rows.length, expired, value, units }
  }, [rows])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Expiry Report</h1>
          <p className="page-subtitle">Batches approaching or past their expiry date</p>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="input" style={{ width: 'auto' }} value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label="Branch">
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.branch_id} value={b.branch_id}>{b.branch_name || b.branch_id.slice(0, 8)}</option>
            ))}
          </select>

          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Expiring within</span>
          <select className="input" style={{ width: 'auto' }} value={withinDays} onChange={(e) => setWithinDays(Number(e.target.value))}>
            {WITHIN_OPTIONS.map((n) => <option key={n} value={n}>{n} days</option>)}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={includeExpired} onChange={(e) => setIncludeExpired(e.target.checked)} />
            Include already expired
          </label>
        </div>
      </div>

      {recon && recon.drift_rows > 0 && (
        <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)' }}>
          Batch ledger drift detected: {recon.drift_rows} product/branch entr{recon.drift_rows === 1 ? 'y' : 'ies'} differ from aggregate stock by {Number(recon.drift_quantity)} units.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 'var(--space-4)' }}>
        <KpiCard label="Lots in window" value={`${summary.lots}`} />
        <KpiCard label="Already expired" value={`${summary.expired}`} accent={summary.expired > 0 ? 'var(--danger, #ef4444)' : 'var(--success, #16a34a)'} />
        <KpiCard label="Units at risk" value={`${summary.units}`} />
        <KpiCard label="Value at cost" value={formatCurrency(summary.value)} />
      </div>

      <div className="glass-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Branch</th>
                <th>Batch</th>
                <th>Expiry</th>
                <th style={{ textAlign: 'right' }}>Days</th>
                <th style={{ textAlign: 'right' }}>On Hand</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading"><td colSpan={9}><div className="empty-state"><div className="skeleton skeleton--row" /><div className="skeleton skeleton--row" /></div></td></tr>
              ) : rows.length === 0 ? (
                <tr key="empty"><td colSpan={9}><div className="empty-state"><p>No batches match this expiry window.</p></div></td></tr>
              ) : rows.map((r) => (
                <tr key={r.batch_id}>
                  <td>{r.product_name || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{r.sku || ''}</td>
                  <td>{r.branch_name || '—'}</td>
                  <td>{r.batch_number || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.expiry_date)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(r.days_to_expiry) < 0 ? 'var(--danger, #ef4444)' : 'inherit' }}>{Number(r.days_to_expiry)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{Number(r.quantity_on_hand)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(r.value_at_cost)}</td>
                  <td><span className={`badge ${expiryBadgeClass(r.expiry_status)}`}>{r.expiry_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}