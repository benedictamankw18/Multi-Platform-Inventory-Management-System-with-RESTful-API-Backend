import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <h1 style={{ fontSize: 72, fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>404</h1>
      <p style={{ fontSize: 18, color: 'var(--text-secondary)', margin: '12px 0 24px' }}>Page not found</p>
      <Link to="/" className="btn btn--primary">Back to Dashboard</Link>
    </div>
  )
}
