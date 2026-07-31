import { useEffect, useState, useCallback, useRef } from 'react'
import { getAuditLogs } from '../services/api'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface AuditLog {
  audit_id: string
  user_id: string | null
  username: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

const ENTITY_TYPES = ['', 'PRODUCT', 'USER', 'ROLE', 'HTTP', 'SALE', 'PURCHASE', 'TRANSFER', 'INVENTORY', 'CATEGORY', 'SUPPLIER', 'CUSTOMER', 'EXPENSE', 'BRANCH', 'SETTING', 'NOTIFICATION']

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [showExport, setShowExport] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const limit = 25

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit }
      if (startDate) params.startDate = new Date(startDate).toISOString()
      if (endDate) params.endDate = new Date(endDate + 'T23:59:59').toISOString()
      if (actionFilter.trim()) params.action = actionFilter.trim()
      if (entityFilter) params.entityType = entityFilter
      if (userFilter.trim()) params.userSearch = userFilter.trim()
      const res = await getAuditLogs(params)
      setLogs(Array.isArray(res?.logs) ? res.logs : [])
      setTotal(res?.pagination?.total ?? 0)
    } catch {
      setLogs([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, startDate, endDate, actionFilter, entityFilter, userFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [startDate, endDate, actionFilter, entityFilter, userFilter])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  function exportXLSX() {
    const rows = logs.map((l) => ({
      Timestamp: new Date(l.created_at).toLocaleString(),
      User: l.username || '—',
      Action: l.action,
      'Entity Type': l.entity_type || '—',
      'Entity ID': l.entity_id || '—',
      Details: l.details ? JSON.stringify(l.details) : '—',
      'IP Address': l.ip_address || '—',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs')
    XLSX.writeFile(wb, `audit-logs-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function exportCSV() {
    const rows = logs.map((l) => ({
      Timestamp: new Date(l.created_at).toISOString(),
      User: l.username || '',
      Action: l.action,
      EntityType: l.entity_type || '',
      EntityId: l.entity_id || '',
      Details: l.details ? JSON.stringify(l.details) : '',
      IpAddress: l.ip_address || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function exportPDF() {
    const doc = new jsPDF()
    doc.text('Audit Logs', 14, 20)
    autoTable(doc, {
      startY: 28,
      head: [['Timestamp', 'User', 'Action', 'Entity', 'IP Address']],
      body: logs.map((l) => [
        new Date(l.created_at).toLocaleString(),
        l.username || '—',
        l.action,
        [l.entity_type, l.entity_id].filter(Boolean).join(' / ') || '—',
        l.ip_address || '—',
      ]),
    })
    doc.save(`audit-logs-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Audit Logs</h1>
          <p className="page-subtitle">Track all system activity</p>
        </div>
        <div className="page-header-actions">
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button type="button" className="btn btn--ghost" style={{ fontSize: 12 }} onClick={() => setShowExport(!showExport)} disabled={logs.length === 0}>
              Export
            </button>
            {showExport && (
              <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 160, padding: 'var(--space-1)' }}>
                <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, borderRadius: 4 }} onClick={exportXLSX}>Export XLSX</button>
                <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, borderRadius: 4 }} onClick={exportCSV}>Export CSV</button>
                <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, borderRadius: 4 }} onClick={exportPDF}>Export PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>From</span>
          <input type="date" className="input" style={{ width: 'auto' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>To</span>
          <input type="date" className="input" style={{ width: 'auto' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <input type="text" className="input" placeholder="Action..." value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ width: 140 }} />
          <select className="input" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} style={{ width: 140 }}>
            <option value="">All Entities</option>
            {ENTITY_TYPES.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="text" className="input" placeholder="Search user..." value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={{ width: 160 }} />
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, width: j === 5 ? '100%' : `${60 + Math.random() * 30}%` }} /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr key="empty"><td colSpan={7}><div className="empty-state"><p>No audit logs found.</p></div></td></tr>
              ) : logs.map((l) => (
                <tr key={l.audit_id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.username || <span style={{ color: 'var(--text-secondary)' }}>—</span>}</td>
                  <td><code style={{ fontSize: 12, background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: 4 }}>{l.action}</code></td>
                  <td>{l.entity_type || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{l.entity_id ? l.entity_id.slice(0, 8) + '…' : '—'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {l.details ? JSON.stringify(l.details).slice(0, 60) + (JSON.stringify(l.details).length > 60 ? '…' : '') : '—'}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{l.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center', marginTop: 'var(--space-4)' }}>
            <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages} ({total} total)
            </span>
            <button type="button" className="btn btn--ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  )
}
