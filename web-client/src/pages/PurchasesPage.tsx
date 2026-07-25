export default function PurchasesPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Purchase Orders</h1>
          <p className="page-subtitle">Manage purchase orders with suppliers</p>
        </div>
        <button type="button" className="btn btn--primary">+ New Purchase Order</button>
      </div>
      <div className="glass-card">
        <div className="search-input" style={{ marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" placeholder="Search purchase orders..." />
        </div>
        <table className="data-table">
          <thead>
            <tr><th>PO #</th><th>Supplier</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr><td colSpan={6} className="empty-state">No purchase orders found.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
