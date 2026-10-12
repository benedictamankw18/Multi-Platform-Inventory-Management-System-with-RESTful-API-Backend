import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/BusinessSettingsContext'
import { useToast } from '../contexts/ToastContext'
import { getBatches, getBranches, searchProducts, type ProductBatchRow } from '../services/api'

const STATUS_OPTIONS = ['ACTIVE', 'DEPLETED', 'EXPIRED', 'DISPOSED'] as const
const EXPIRING_OPTIONS = [7, 14, 30, 60, 90]
const LIMIT = 25

type BranchOption = { branch_id: string; branch_name?: string | null }
type ProductOption = { product_id: string; product_name: string }

function batchBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'badge--success'
    case 'EXPIRED':
      return 'badge--danger'
    case 'DEPLETED':
      return 'badge--warning'
    case 'DISPOSED':
      return 'badge--info'
    default:
      return ''
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

export default function BatchesPage() {
  const { selectedBranch } = useAuth()
  const { formatCurrency } = useCurrency()
  const { toast } = useToast()

  const [rows, setRows] = useState<ProductBatchRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [branches, setBranches] = useState<BranchOption[]>([])
  const [branchId, setBranchId] = useState(selectedBranch?.branch_id ?? '')
  const [status, setStatus] = useState('')
  const [expiringWithin, setExpiringWithin] = useState<number | ''>('')
  const [includeEmpty, setIncludeEmpty] = useState(false)

  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<ProductOption[]>([])
  const [productId, setProductId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: LIMIT }
      if (branchId) params.branch_id = branchId
      if (productId) params.product_id = productId
      if (status) params.status = status
      if (expiringWithin !== '') params.expiringWithinDays = Number(expiringWithin)
      // DEPLETED/DISPOSED lots hold no stock, so the default "in stock only"
      // filter would hide them; include zero-quantity lots for those statuses.
      if (includeEmpty || status === 'DEPLETED' || status === 'DISPOSED') params.includeEmpty = true
      const res = await getBatches(params)
      setRows(Array.isArray(res?.items) ? res.items : [])
      setTotal(Number(res?.total ?? 0))
    } catch (err) {
      setRows([])
      setTotal(0)
      toast(errText(err, 'Failed to load batches.'), 'error')
    }
    setLoading(false)
  }, [page, branchId, productId, status, expiringWithin, includeEmpty, toast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    getBranches()
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data ?? res?.branches ?? []
        setBranches(list)
      })
      .catch(() => setBranches([]))
  }, [])

  useEffect(() => { setPage(1) }, [branchId, productId, status, expiringWithin, includeEmpty])

  const handleProductSearch = useCallback(async (q: string) => {
    setProductSearch(q)
    if (q.trim().length < 2) { setProductResults([]); return }
    try {
      const res = await searchProducts({ q, limit: 20 })
      setProductResults(res?.products ?? [])
    } catch { setProductResults([]) }
  }, [])

  function clearFilters() {
    setBranchId('')
    setProductId('')
    setProductSearch('')
    setProductResults([])
    setStatus('')
    setExpiringWithin('')
    setIncludeEmpty(false)
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const hasFilters = Boolean(branchId || productId || status || expiringWithin !== '' || includeEmpty)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Batches</h1>
          <p className="page-subtitle">{total} batch{total !== 1 ? 'es' : ''} tracked</p>
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="input" style={{ width: 'auto' }} value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label="Branch">
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.branch_id} value={b.branch_id}>{b.branch_name || b.branch_id.slice(0, 8)}</option>
            ))}
          </select>

          <div style={{ position: 'relative', minWidth: 220 }}>
            <input
              type="text"
              className="input"
              placeholder="Search product..."
              value={productSearch}
              onChange={(e) => handleProductSearch(e.target.value)}
              style={{ width: '100%' }}
            />
            {productResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                {productResults.map((p) => (
                  <div key={p.product_id} onClick={() => { setProductId(p.product_id); setProductSearch(p.product_name); setProductResults([]) }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid var(--border)' }}>{p.product_name}</div>
                ))}
              </div>
            )}
          </div>

          <select className="input" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select className="input" style={{ width: 'auto' }} value={expiringWithin} onChange={(e) => setExpiringWithin(e.target.value === '' ? '' : Number(e.target.value))} aria-label="Expiring within">
            <option value="">Any expiry</option>
            {EXPIRING_OPTIONS.map((n) => <option key={n} value={n}>Expiring within {n} days</option>)}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={includeEmpty} onChange={(e) => setIncludeEmpty(e.target.checked)} />
            Include zero-quantity
          </label>

          {hasFilters && (
            <button type="button" className="btn btn--ghost" onClick={clearFilters}>Clear filters</button>
          )}
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Branch</th>
                <th>Batch</th>
                <th>Expiry</th>
                <th style={{ textAlign: 'right' }}>Days</th>
                <th style={{ textAlign: 'right' }}>On Hand</th>
                <th style={{ textAlign: 'right' }}>Reserved</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading"><td colSpan={9}><div className="empty-state"><div className="skeleton skeleton--row" /><div className="skeleton skeleton--row" /></div></td></tr>
              ) : rows.length === 0 ? (
                <tr key="empty"><td colSpan={9}><div className="empty-state"><p>No batches match these filters.</p></div></td></tr>
              ) : rows.map((b) => {
                const days = b.days_to_expiry == null ? null : Number(b.days_to_expiry)
                return (
                  <tr key={b.batch_id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{b.product_name || b.product_id.slice(0, 8)}</span>
                        {b.sku && <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{b.sku}</span>}
                      </div>
                    </td>
                    <td>{b.branch_name || '—'}</td>
                    <td>{b.batch_number || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(b.expiry_date)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: days != null && days < 0 ? 'var(--danger, #ef4444)' : 'inherit' }}>{days == null ? '—' : days}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{Number(b.quantity_on_hand)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{Number(b.quantity_reserved)}</td>
                    <td><span className={`badge ${batchBadgeClass(b.status)}`}>{b.status}</span></td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(b.cost_price)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-caption)' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button type="button" className="btn btn--ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}