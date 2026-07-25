export default function NotificationsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p className="page-subtitle">System notifications and alerts</p>
        </div>
      </div>
      <div className="glass-card">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p style={{ margin: '8px 0 0', fontSize: '0.88rem' }}>No notifications yet.</p>
        </div>
      </div>
    </div>
  )
}
