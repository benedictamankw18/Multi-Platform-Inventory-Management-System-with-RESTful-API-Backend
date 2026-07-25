export default function ExpensesPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p className="page-subtitle">Track and manage business expenses</p>
        </div>
        <button type="button" className="btn btn--primary">+ Add Expense</button>
      </div>
      <div className="glass-card">
        <div className="search-input" style={{ marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" placeholder="Search expenses..." />
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Branch</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr><td colSpan={6} className="empty-state">No expenses found.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
