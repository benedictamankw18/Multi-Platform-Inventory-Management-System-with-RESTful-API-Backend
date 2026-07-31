import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import '../components/Layout.css'
import './BranchSelection.css'

export default function BranchSelectionPage() {
  const { user, branches, branchesLoading, error, fetchBranches, selectBranch, logout } = useAuth()

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  return (
    <div className="branch-select">
      <div className="branch-select__card">
        <div className="branch-select__header">
          <div className="brand-lockup">
            <div className="brand-mark brand-mark--small" aria-hidden="true">
              <span className="brand-mark__layer brand-mark__layer--top" />
              <span className="brand-mark__layer brand-mark__layer--base" />
            </div>
            <div>
              <span className="branch-select__eyebrow">Inventory Suite</span>
              <h1>Select a Branch</h1>
            </div>
          </div>
          <p className="branch-select__intro">
            Welcome back{user?.fullName ? `, ${user.fullName}` : ''}. Choose a branch to continue.
          </p>
        </div>

        {error && (
          <div className="branch-select__error">{error}</div>
        )}

        {branches.length === 0 && !error && branchesLoading && (
          <div className="branch-select__empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p>Loading branches...</p>
          </div>
        )}

        {branches.length === 0 && !error && !branchesLoading && (
          <div className="branch-select__empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>No branch assigned.</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
              Contact the Manager or Administrator.
            </p>
          </div>
        )}

        {branches.length > 0 && (
          <div className="branch-select__grid">
            {branches.map((branch) => (
              <button
                key={branch.branch_id}
                type="button"
                className="branch-card"
                onClick={() => selectBranch(branch.branch_id)}
                disabled={!branch.is_active}
              >
                <div className="branch-card__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="branch-card__info">
                  <strong>{branch.branch_name}</strong>
                  {branch.address && <span>{branch.address}</span>}
                  {branch.city && <span>{branch.city}{branch.country ? `, ${branch.country}` : ''}</span>}
                </div>
                {!branch.is_active && (
                  <span className="badge badge--danger">Inactive</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="branch-select__footer">
          <button type="button" className="btn btn--ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
