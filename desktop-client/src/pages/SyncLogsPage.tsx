import { useEffect, useState, useCallback } from 'react'
import { getSyncLogs } from '../services/api'

interface SyncLog {
  sync_id: string
  device_id: string
  local_transaction_id: string | null
  entity_type: string
  sync_status: string
  synced_at: string | null
  error_message: string | null
  retry_count: number
  sync_duration_ms: number | null
  created_at: string
}

const STATUS_VARIANTS: Record<string, string> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
}

export default function SyncLogsPage() {
  const [items, setItems] = useState<SyncLog[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const limit = 50

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit }
      if (entityFilter) params.entity = entityFilter
      if (statusFilter) params.status = statusFilter
      const res = await getSyncLogs(params)
      setItems(Array.isArray(res?.data) ? res.data : [])
    } catch {
      setItems([])
    }
    setLoading(false)
  }, [page, entityFilter, statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => { setPage(1) }, [entityFilter, statusFilter])

  const isLastPage = items.length < limit

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Sync Logs</h1>
          <p className="page-subtitle">Device synchronization history</p>
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" className="input" placeholder="Filter by entity..." value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} style={{ width: 200 }} />
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 150 }}>
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Device ID</th>
                <th>Entity</th>
                <th>Status</th>
                <th>Synced At</th>
                <th>Error</th>
                <th style={{ textAlign: 'right' }}>Retries</th>
                <th style={{ textAlign: 'right' }}>Duration (ms)</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading"><td colSpan={8}><div className="empty-state"><div className="skeleton skeleton--row" /><div className="skeleton skeleton--row" /></div></td></tr>
              ) : items.length === 0 ? (
                <tr key="empty"><td colSpan={8}><div className="empty-state"><p>No sync logs found.</p></div></td></tr>
              ) : items.map((s) => (
                <tr key={s.sync_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.device_id?.slice(0, 8) || '—'}</td>
                  <td>{s.entity_type}</td>
                  <td><span className={`badge badge--${STATUS_VARIANTS[s.sync_status] || 'info'}`}>{s.sync_status}</span></td>
                  <td>{s.synced_at ? new Date(s.synced_at).toLocaleString() : '—'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: s.error_message ? 'var(--danger)' : undefined }}>{s.error_message || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{s.retry_count}</td>
                  <td style={{ textAlign: 'right' }}>{s.sync_duration_ms != null ? s.sync_duration_ms : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(s.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLastPage || page > 1 ? (
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 'var(--space-4)' }}>
            <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>Page {page}</span>
            <button type="button" className="btn btn--ghost" disabled={isLastPage} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
