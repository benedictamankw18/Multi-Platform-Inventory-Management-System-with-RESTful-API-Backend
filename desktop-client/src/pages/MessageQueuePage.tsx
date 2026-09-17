import { useEffect, useState, useCallback } from 'react'
import { getMessageQueue, resendQueueMessage } from '../services/api'
import { useToast } from '../contexts/ToastContext'

interface QueueMessage {
  id: string
  type: string
  status: string
  payload: string | null
  attempts: number
  max_attempts: number
  last_error: string | null
  created_at: string
  updated_at: string
}

const STATUS_VARIANTS: Record<string, string> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',
  CANCELLED: 'secondary',
}

export default function MessageQueuePage() {
  const [messages, setMessages] = useState<QueueMessage[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const limit = 50
  const { toast } = useToast()
  const [resendingId, setResendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit }
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      const res = await getMessageQueue(params)
      setMessages(Array.isArray(res?.data) ? res.data : [])
    } catch {
      setMessages([])
    }
    setLoading(false)
  }, [page, statusFilter, typeFilter])

  const handleResend = useCallback(async (m: QueueMessage) => {
    setResendingId(m.id)
    try {
      await resendQueueMessage(m.id)
      toast('Message requeued for sending', 'success')
      await load()
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; errors?: Array<{ msg: string }> } } }).response?.data
        : undefined
      const msg = data?.errors?.length ? data.errors.map(e => e.msg).join('; ') : data?.message ?? 'Failed to resend message'
      toast(msg, 'error')
    }
    setResendingId(null)
  }, [load, toast])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [statusFilter, typeFilter])

  const isLastPage = messages.length < limit

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Message Queue</h1>
          <p className="page-subtitle">Background job processing queue</p>
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 150 }}>
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <input type="text" className="input" placeholder="Filter by type..." value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: 200 }} />
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Last Error</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading"><td colSpan={7}><div className="empty-state"><div className="skeleton skeleton--row" /><div className="skeleton skeleton--row" /></div></td></tr>
              ) : messages.length === 0 ? (
                <tr key="empty"><td colSpan={7}><div className="empty-state"><p>No queue messages found.</p></div></td></tr>
              ) : messages.map((m) => (
                <tr key={m.id}>
                  <td>{m.type}</td>
                  <td><span className={`badge badge--${STATUS_VARIANTS[m.status] || 'info'}`}>{m.status}</span></td>
                  <td>{m.attempts}/{m.max_attempts}</td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', color: m.last_error ? 'var(--danger)' : undefined }}>{m.last_error || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(m.created_at).toLocaleString()}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(m.updated_at).toLocaleString()}</td>
                  <td>
                    {(m.status === 'PROCESSING' || m.status === 'FAILED') && (
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={{ padding: '2px 10px', fontSize: 12 }}
                        disabled={resendingId === m.id}
                        onClick={() => handleResend(m)}
                      >
                        {resendingId === m.id ? 'Resending…' : 'Resend'}
                      </button>
                    )}
                  </td>
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
