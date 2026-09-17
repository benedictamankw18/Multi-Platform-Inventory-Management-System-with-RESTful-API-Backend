export default function SettingsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-subtitle">Business and system settings</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        <div className="glass-card">
          <h3 style={{ color: '#fff', margin: '0 0 12px', fontSize: '0.95rem' }}>Business Settings</h3>
          <p style={{ color: '#c4b5fd', margin: 0, fontSize: '0.78rem' }}>Coming soon</p>
        </div>
        <div className="glass-card">
          <h3 style={{ color: '#fff', margin: '0 0 12px', fontSize: '0.95rem' }}>System Settings</h3>
          <p style={{ color: '#c4b5fd', margin: 0, fontSize: '0.78rem' }}>Coming soon</p>
        </div>
      </div>
    </div>
  )
}
