import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useOffline } from '../contexts/OfflineContext'
import { useUnreadNotifications } from '../hooks/useUnreadNotifications'
import { getBusinessSettings, resolveImageUrl } from '../services/api'
import ConfirmModal from './ConfirmModal'
import './Layout.css'

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'home', permission: 'VIEW_DASHBOARD' },
  { to: '/sync', label: 'Sync & Offline', icon: 'refresh-cw', permission: '' },
  { to: '/products', label: 'Products', icon: 'package', permission: 'VIEW_PRODUCTS' },
  { to: '/categories', label: 'Categories', icon: 'layers', permission: 'VIEW_CATEGORIES' },
  { to: '/inventory', label: 'Inventory', icon: 'box', permission: 'VIEW_INVENTORY' },
  { to: '/inventory/movements', label: 'Stock Movements', icon: 'repeat', permission: 'MANAGE_INVENTORY' },
  { to: '/inventory/history', label: 'Stock History', icon: 'clock', permission: 'VIEW_INVENTORY' },
  { to: '/inventory/low-stock', label: 'Low Stock Alerts', icon: 'alert-triangle', permission: 'VIEW_INVENTORY' },
  { to: '/transfers', label: 'Transfers', icon: 'repeat', permission: 'VIEW_INVENTORY' },
  { to: '/sales', label: 'Sales', icon: 'shopping-cart', permission: 'VIEW_SALES' },
  { to: '/pos', label: 'POS', icon: 'monitor', permission: 'CREATE_SALE' },
  { to: '/purchases', label: 'Purchase Orders', icon: 'truck', permission: 'VIEW_PURCHASES' },
  { to: '/suppliers', label: 'Suppliers', icon: 'users', permission: 'VIEW_SUPPLIERS' },
  { to: '/customers', label: 'Customers', icon: 'user', permission: 'VIEW_CUSTOMERS' },
  { to: '/branches', label: 'Branches', icon: 'map-pin', permission: 'MANAGE_BRANCHES' },
  { to: '/expenses', label: 'Expenses', icon: 'credit-card', permission: 'VIEW_EXPENSES' },
  { to: '/reports', label: 'Reports', icon: 'bar-chart', permission: 'VIEW_REPORTS' },
  { to: '/users', label: 'Users', icon: 'users', permission: 'MANAGE_USERS' },
  { to: '/roles', label: 'Roles', icon: 'shield', permission: 'MANAGE_USERS' },
  { to: '/notifications', label: 'Notifications', icon: 'bell', permission: '' },
  { to: '/notifications/create', label: 'Create Notification', icon: 'send', permission: 'MANAGE_NOTIFICATIONS' },
  { to: '/profile', label: 'My Profile', icon: 'user-circle', permission: '' },
  { to: '/audit', label: 'Audit Logs', icon: 'file-text', permission: 'VIEW_AUDIT_LOGS' },
  { to: '/sync/logs', label: 'Sync Logs', icon: 'refresh-cw', permission: 'VIEW_AUDIT_LOGS' },
  { to: '/price-history', label: 'Price History', icon: 'trending-up', permission: 'VIEW_PRODUCTS' },
  { to: '/admin/queue', label: 'Message Queue', icon: 'inbox', permission: 'MANAGE_SETTINGS' },
  { to: '/admin/sms-balance', label: 'SMS Balance', icon: 'message-square', permission: 'MANAGE_SETTINGS' },
  { to: '/business-settings', label: 'Business Settings', icon: 'briefcase', permission: 'MANAGE_SETTINGS' },
  { to: '/system-settings', label: 'System Settings', icon: 'sliders', permission: 'MANAGE_SETTINGS' },
] as const

const iconMap: Record<string, string> = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
  package: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  box: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  'shopping-cart': 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
  monitor: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  truck: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  'map-pin': 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  'credit-card': 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  'bar-chart': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  'file-text': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  'arrow-down': 'M12 5v14m0 0l-6-6m6 6l6-6',
  'arrow-up': 'M12 19V5m0 0l-6 6m6-6l6 6',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  'alert-triangle': 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  repeat: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  'refresh-cw': 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  'trending-up': 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  inbox: 'M22 12H16l-2 3H10l-2-3H2M22 12v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6M22 12l-3-9H5l-3 9',
  briefcase: 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  'user-circle': 'M5.121 17.804A9 9 0 1118.88 6.196M15 11a3 3 0 11-6 0 3 3 0 016 0zm-3 5c-2.21 0-4.21.895-5.657 2.343m11.314 0A7.962 7.962 0 0112 19c-1.48 0-2.86.402-4.043 1.104M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'message-square': 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
}

function Icon({ name }: { name: string }) {
  const d = iconMap[name]
  if (!d) return null
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export default function Layout() {
  const { user, logout, selectedBranch, clearBranch, hasPermission } = useAuth()
  const { isOnline, pendingCount } = useOffline()
  const { unreadCount } = useUnreadNotifications()
  const navigate = useNavigate()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [biz, setBiz] = useState<{ business_name?: string; logo?: string | null }>({})

  useEffect(() => {
    const loadBiz = () => getBusinessSettings().then(setBiz).catch(() => {})
    loadBiz()
    window.addEventListener('business-settings-updated', loadBiz)
    return () => window.removeEventListener('business-settings-updated', loadBiz)
  }, [])

  const filteredNavItems = navItems.filter(item =>
    !item.permission || hasPermission(item.permission)
  )

  return (
    <div className="layout">
      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          {biz?.logo ? (
            <img src={resolveImageUrl(biz.logo) ?? undefined} alt="" className="sidebar__logo" />
          ) : (
            <div className="brand-mark brand-mark--small" aria-hidden="true">
              <span className="brand-mark__layer brand-mark__layer--top" />
              <span className="brand-mark__layer brand-mark__layer--base" />
            </div>
          )}
          <div className="sidebar__brand-text">
            <strong>{biz?.business_name || 'Inventory'}</strong>
            {!biz?.business_name && <span>Management</span>}
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          <ul className="sidebar__list">
            {filteredNavItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
                  }
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.to === '/notifications' && unreadCount > 0 && (
                    <span className="sidebar__badge">{unreadCount >= 50 ? '50+' : unreadCount}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="layout__main">
        <header className="layout__topbar">
          <button type="button" className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M18 6L6 18M6 6l12 12" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            )}
          </button>
          <div className="layout__topbar-right">
            <button
              type="button"
              className={`sync-pill${isOnline ? ' sync-pill--online' : ' sync-pill--offline'}`}
              onClick={() => navigate('/sync')}
              title={isOnline ? 'Online — sync is up to date' : `Offline — ${pendingCount} change(s) pending sync`}
            >
              <span className="sync-pill__dot" />
              {isOnline ? 'Online' : `Offline${pendingCount ? ` · ${pendingCount}` : ''}`}
            </button>
            {selectedBranch && (
              <button type="button" className="layout__topbar-branch" onClick={() => { clearBranch(); navigate('/select-branch') }} title="Switch branch">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M19 12H5m7-7l-7 7 7 7" /></svg>
                {selectedBranch.branch_name}
              </button>
            )}
            <button type="button" className="layout__topbar-bell" onClick={() => navigate('/notifications')} title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={iconMap.bell} />
              </svg>
              {unreadCount > 0 && (
                <span className="layout__topbar-bell__badge">{unreadCount >= 50 ? '50+' : unreadCount}</span>
              )}
            </button>
            <div className="layout__topbar-user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
              <div className="layout__topbar-avatar">
                {user?.profilePhoto ? (
                  <img src={resolveImageUrl(user.profilePhoto) ?? undefined} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  user?.username?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
              <div className="layout__topbar-user-info">
                <strong>{user?.username || 'User'}</strong>
                <span>{user?.role || 'Role'}</span>
              </div>
            </div>
            <button type="button" className="layout__topbar-logout" onClick={() => setShowLogoutModal(true)} title="Sign out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>
        <Outlet />
      </div>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <ConfirmModal
        open={showLogoutModal}
        title="Sign out"
        message="Are you sure you want to sign out of your account?"
        confirmLabel="Sign out"
        variant="danger"
        onConfirm={() => { setShowLogoutModal(false); logout() }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  )
}
