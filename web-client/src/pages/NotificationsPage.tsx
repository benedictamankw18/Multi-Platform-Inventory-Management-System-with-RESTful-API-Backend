import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import {
  getMyNotifications,
  markNotificationRead,
  deleteNotification,
  type NotificationItem,
} from '../services/api'
import { notifyNotificationsChanged } from '../hooks/useUnreadNotifications'

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#64748b',
  NORMAL: '#3b82f6',
  HIGH: '#f97316',
  URGENT: '#ef4444',
}

const TYPE_COLORS: Record<string, string> = {
  INFO: '#3b82f6',
  WARNING: '#f97316',
  ERROR: '#ef4444',
  SUCCESS: '#16a34a',
  LOW_STOCK: '#ef4444',
  TRANSFER_REQUEST: '#8b5cf6',
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { hasPermission } = useAuth()

  const [items, setItems] = useState<NotificationItem[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [viewFilter, setViewFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const limit = 25

  const NOTIFICATION_TYPES = ['LOW_STOCK', 'SYNC_FAILURE', 'BRANCH_SHORTAGE', 'TRANSFER_REQUEST', 'OTHER', 'INFO', 'WARNING', 'ERROR', 'SUCCESS']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit }
      if (viewFilter === 'unread') params.isRead = 'false'
      else if (viewFilter === 'read') params.isRead = 'true'
      if (typeFilter) params.type = typeFilter
      const res = await getMyNotifications(params)
      const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      setItems(arr)
    } catch {
      setItems([])
    }
    setLoading(false)
  }, [page, viewFilter, typeFilter])

  useEffect(() => { load() }, [load])

  const isLastPage = items.length < limit

  function handleFilterChange(filter: 'all' | 'unread' | 'read') {
    setViewFilter(filter)
    setPage(1)
  }

  function handleTypeFilterChange(type: string) {
    setTypeFilter(type)
    setPage(1)
  }

  async function handleMarkRead(id: string) {
    setActionLoading(id)
    try {
      await markNotificationRead(id)
      toast('Marked as read', 'success')
      load()
      notifyNotificationsChanged()
    } catch {
      toast('Failed to mark as read', 'error')
    }
    setActionLoading(null)
  }

  async function handleDelete(id: string) {
    setActionLoading(id)
    try {
      await deleteNotification(id)
      toast('Notification deleted', 'success')
      load()
      notifyNotificationsChanged()
    } catch {
      toast('Failed to delete notification', 'error')
    }
    setActionLoading(null)
  }

  async function handleMarkAllRead() {
    const unread = items.filter((n) => !n.is_read)
    if (unread.length === 0) return
    setActionLoading('all')
    try {
      await Promise.all(unread.map((n) => markNotificationRead(n.notification_id)))
      toast(`${unread.length} marked as read`, 'success')
      load()
      notifyNotificationsChanged()
    } catch {
      toast('Failed to mark all as read', 'error')
    }
    setActionLoading(null)
  }

  const unreadCount = items.filter((n) => !n.is_read).length

  const filters: { key: 'all' | 'unread' | 'read'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'read', label: 'Read' },
  ]

  function SkeletonCard() {
    return (
      <div className="glass-card" style={{ padding: 'var(--space-5)', marginBottom: 12, borderLeft: '3px solid var(--border)', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="skeleton" style={{ height: 14, width: 100 }} />
          <div className="skeleton" style={{ height: 14, width: 60 }} />
        </div>
        <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 14, width: '80%' }} />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p className="page-subtitle">System notifications and alerts</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasPermission('MANAGE_NOTIFICATIONS') && (
            <button type="button" className="btn btn--primary" onClick={() => navigate('/notifications/create')}>
              + Create
            </button>
          )}
          {unreadCount > 0 && (
            <button type="button" className="btn btn--ghost" onClick={handleMarkAllRead} disabled={actionLoading === 'all'}>
              Mark All Read
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-4)', borderBottom: '2px solid var(--border)' }}>
        {filters.map((f) => (
          <button key={f.key} type="button"
            style={{ padding: 'var(--space-2) var(--space-4)', border: 'none', background: viewFilter === f.key ? 'var(--primary)' : 'transparent', color: viewFilter === f.key ? '#fff' : 'var(--text-secondary)', borderRadius: 'var(--radius-button) var(--radius-button) 0 0', cursor: 'pointer', fontSize: 'var(--text-body)', fontWeight: 500, whiteSpace: 'nowrap' }}
            onClick={() => handleFilterChange(f.key)}>
            {f.label}{f.key === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <button type="button"
          style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-button)', background: !typeFilter ? 'var(--primary)' : 'transparent', color: !typeFilter ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}
          onClick={() => handleTypeFilterChange('')}>
          All Types
        </button>
        {NOTIFICATION_TYPES.map((t) => (
          <button key={t} type="button"
            style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-button)', background: typeFilter === t ? 'var(--primary)' : 'transparent', color: typeFilter === t ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}
            onClick={() => handleTypeFilterChange(t)}>
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p style={{ margin: 'var(--space-3) 0 0', fontSize: 'var(--text-body)', color: 'var(--text-secondary)' }}>
              {viewFilter === 'all' ? 'No notifications yet.' : `No ${viewFilter} notifications.`}
            </p>
          </div>
        </div>
      ) : (
        <div>
          {items.map((n) => {
            const isUnread = !n.is_read
            const priorityColor = PRIORITY_COLORS[n.priority ?? ''] || '#64748b'
            const typeColor = TYPE_COLORS[n.notification_type ?? ''] || '#64748b'
            return (
              <div key={n.notification_id} className="glass-card"
                style={{ padding: 'var(--space-5)', marginBottom: 12, borderLeft: `3px solid ${isUnread ? 'var(--primary)' : 'transparent'}`, transition: 'border-color 200ms', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {n.notification_type && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-badge)', background: `${typeColor}20`, color: typeColor, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        {n.notification_type.replace(/_/g, ' ')}
                      </span>
                    )}
                    {n.priority && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-badge)', background: `${priorityColor}20`, color: priorityColor, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        {n.priority}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                    {n.created_at ? relativeTime(n.created_at) : ''}
                  </span>
                </div>
                <div style={{ fontSize: 'var(--text-body)', fontWeight: isUnread ? 600 : 400, marginBottom: 4, color: 'var(--text-primary)' }}>
                  {n.title || 'Notification'}
                </div>
                {n.message && (
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
                    {n.message}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-2)' }}>
                  {isUnread && (
                    <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => handleMarkRead(n.notification_id)} disabled={actionLoading === n.notification_id}>
                      Mark Read
                    </button>
                  )}
                  <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--danger)' }}
                    onClick={() => handleDelete(n.notification_id)} disabled={actionLoading === n.notification_id}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!isLastPage || page > 1 ? (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 'var(--space-4)' }}>
          <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>Page {page}</span>
          <button type="button" className="btn btn--ghost" disabled={isLastPage} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      ) : null}
    </div>
  )
}
