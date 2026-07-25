export default function ReportsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="page-subtitle">View business analytics and reports</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {['Sales Report', 'Inventory Report', 'Purchase Report', 'Expense Report', 'Profit & Loss', 'Stock Movement'].map((name) => (
          <div key={name} className="glass-card" style={{ cursor: 'pointer' }}>
            <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: '0.95rem' }}>{name}</h3>
            <p style={{ color: '#c4b5fd', margin: 0, fontSize: '0.78rem' }}>Coming soon</p>
          </div>
        ))}
      </div>
    </div>
  )
}
