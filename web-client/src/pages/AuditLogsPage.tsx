export default function AuditLogsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Audit Logs</h1>
          <p className="page-subtitle">Track all system activity</p>
        </div>
      </div>
      <div className="glass-card">
        <div className="search-input" style={{ marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" placeholder="Search audit logs..." />
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr>
          </thead>
          <tbody>
            <tr><td colSpan={5} className="empty-state">No audit logs found.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
