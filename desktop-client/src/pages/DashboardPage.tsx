import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api, {
  getDailySales,
  getMonthlySales,
  getLowStock,
  getBestSelling,
  getBranchPerformance,
  getProfitReport,
  getAuditLogs,
  getNotifications,
  type MonthlySalesDay,
  type BestSellingItem,
  type BranchPerfItem,
} from '../services/api'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function monthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function DashboardPage() {
  const { user, selectedBranch } = useAuth()

  // KPI state
  const [totalProducts, setTotalProducts] = useState<number | null>(null)
  const [lowStockCount, setLowStockCount] = useState<number | null>(null)
  const [todaySales, setTodaySales] = useState<number | null>(null)
  const [todayTransactions, setTodayTransactions] = useState<number | null>(null)
  const [profit, setProfit] = useState<number | null>(null)

  // Chart data
  const [monthlyData, setMonthlyData] = useState<MonthlySalesDay[]>([])

  // Lists
  const [bestSelling, setBestSelling] = useState<BestSellingItem[]>([])
  const [branchPerf, setBranchPerf] = useState<BranchPerfItem[]>([])

  // Activity & alerts
  const [activity, setActivity] = useState<Array<{ audit_id: string; action: string; entity_type: string; entity_id: string; created_at: string }>>([])
  const [alerts, setAlerts] = useState<Array<{ notification_id: string; title: string; message: string; is_read: boolean; created_at: string }>>([])

  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const branchId = selectedBranch?.branch_id

    const results = await Promise.allSettled([
      getDailySales(todayISO(), branchId),
      getMonthlySales(year, month, branchId),
      getLowStock(branchId),
      getBestSelling({ limit: 5, branchId }),
      getBranchPerformance({ startDate: monthStart(), endDate: todayISO() }),
      getProfitReport({ startDate: monthStart(), endDate: todayISO(), branchId }),
      getAuditLogs({ limit: 8 }),
      getNotifications({ limit: 8, branchId }),
      api.post('/products/search', { limit: 1, branchId }),
    ])

    // Daily sales (returns a single object, not an array)
    if (results[0].status === 'fulfilled' && results[0].value) {
      const ds = results[0].value
      setTodaySales(ds.total_sales)
      setTodayTransactions(ds.transactions)
    }

    // Monthly chart
    if (results[1].status === 'fulfilled') {
      setMonthlyData(results[1].value ?? [])
    }

    // Low stock
    if (results[2].status === 'fulfilled') {
      setLowStockCount(results[2].value?.length ?? 0)
    }

    // Best selling
    if (results[3].status === 'fulfilled') {
      setBestSelling(results[3].value ?? [])
    }

    // Branch performance
    if (results[4].status === 'fulfilled') {
      setBranchPerf(results[4].value ?? [])
    }

    // Profit
    if (results[5].status === 'fulfilled') {
      setProfit(results[5].value?.profit ?? 0)
    }

    // Activity (audit logs)
    if (results[6].status === 'fulfilled') {
      // const logs = results[6].value
          const { logs = [] } = results[6].value;

      // console.log(Array.isArray(logs) ? logs.slice(0, 8) : logs?.rows?.slice(0, 8));
      // console.log(Array.isArray(logs)
      //         ? logs.slice(0, 8)
      //         : (logs?.rows ?? []).slice(0, 8));
      // console.log(logs);
      // setActivity(Array.isArray(logs) ? logs.slice(0, 8) : logs?.rows?.slice(0, 8) ?? [])
      // setActivity(
      //     Array.isArray(logs)
      //         ? logs.slice(0, 8)
      //         : (logs?.rows ?? []).slice(0, 8)
      // );

          setActivity(logs.slice(0, 8));

    }

    // Alerts (notifications)
    if (results[7].status === 'fulfilled') {
      const notifs = results[7].value
      setAlerts(Array.isArray(notifs) ? notifs.slice(0, 8) : notifs?.rows?.slice(0, 8) ?? [])
    }

    // Product count
    if (results[8].status === 'fulfilled') {
      const data = results[8].value?.data
      setTotalProducts(data?.total ?? data?.data?.length ?? 0)
    } else {
      setTotalProducts(0)
    }

    setLoading(false)
  }, [selectedBranch?.branch_id])

  useEffect(() => { load() }, [load])

  const maxSales = Math.max(...monthlyData.map((d) => d.total_sales), 1)

  const metrics = [
    { label: 'Total SKUs', value: totalProducts, icon: '📦' },
    { label: 'Low Stock', value: lowStockCount, icon: '⚠️' },
    { label: 'Profit (MTD)', value: profit != null ? formatCurrency(profit) : null, icon: '💰' },
    { label: "Today's Sales", value: todaySales != null ? formatCurrency(todaySales) : null, icon: '📈' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="dashboard-eyebrow">Inventory command center</span>

          <h1>Welcome{user?.username ? `, ${user.username}` : ''}</h1>
          <p className="page-subtitle">
            {user?.role ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}` : 'User'} &middot; {user?.email || user?.username || ''}
          </p>
        </div>
      </div>

      {/* ---- KPI cards ---- */}
      <section className="metrics-grid" style={{ marginBottom: 24 }}>
        {metrics.map((m) => (
          <article key={m.label} className="metric-card">
            <span>{m.label}</span>
            <strong>{loading ? <div className="skeleton skeleton--title" style={{ margin: 0 }} /> : m.value ?? 0}</strong>
            {m.label === 'Low Stock' && lowStockCount != null && lowStockCount > 0 && (
              <span className="status-pill status-pill--low" style={{ width: 'fit-content' }}>Needs attention</span>
            )}
            {m.label === "Today's Sales" && todayTransactions != null && (
              <span>{todayTransactions} transactions</span>
            )}
          </article>
        ))}
      </section>

      {/* ---- Chart + Best selling ---- */}
      <div className="content-grid" style={{ marginBottom: 24 }}>
        {/* Monthly sales chart */}
        <div className="panel panel--wide">
          <div className="panel-heading">
            <div>
              <span className="panel-label">Sales trend</span>
              <h2>Monthly overview</h2>
            </div>
            {todaySales != null && (
              <span className="status-pill status-pill--healthy">Today: {formatCurrency(todaySales)}</span>
            )}
          </div>
          {monthlyData.length > 0 ? (
            <div className="dashboard-hero__chart">
              {monthlyData.slice(-12).map((d) => {
                const label = d.day ? new Date(d.day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '?'
                return (
                  <div key={d.day} className="chart-bar">
                    <div
                      title={`${label}: ${formatCurrency(d.total_sales)} (${d.transactions} txns)`}
                      style={{
                        height: `${Math.max((d.total_sales / maxSales) * 100, 4)}%`,
                      }}
                    />
                    <span className="chart-bar__label">{label}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18" /><path d="M7 16l4-5 4 3 5-7" /></svg>
              <p>No sales data for this month yet.</p>
            </div>
          )}
        </div>

        {/* Best selling products */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-label">Top performers</span>
              <h2>Best selling</h2>
            </div>
          </div>
          {bestSelling.length > 0 ? (
            <ul className="activity-list">
              {bestSelling.map((item, i) => (
                <li key={item.product_id}>
                  <div>
                    <strong>{item.product_name}</strong>
                    <p>{item.qty_sold} units sold</p>
                  </div>
                  <span className="badge badge--info">#{i + 1}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 12a4 4 0 11-8 0 4 4 0 018 0z" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
              <p>No sales recorded yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ---- Activity + Alerts + Branch perf ---- */}
      <div className="content-grid">
        {/* Recent activity */}
        <div className="panel panel--wide action">
          <div className="panel-heading">
            <div>
              <span className="panel-label">Audit trail</span>
              <h2>Recent activity</h2>
            </div>
          </div>
          {activity.length > 0 ? (
            <ul className="activity-list">
              {activity.map((a) => (
                <li key={a.audit_id}>
                  <div>
                    <strong>{a.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</strong>
                    <p>{a.entity_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                  </div>
                  <span style={{ whiteSpace: 'nowrap', fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>
                    {relativeTime(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p>No recent activity.</p>
            </div>
          )}
        </div>

        {/* Alerts / Notifications */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-label">Notifications</span>
              <h2>Operational alerts</h2>
            </div>
          </div>
          {alerts.length > 0 ? (
            <ul className="alert-list">
              {alerts.map((a) => (
                <li key={a.notification_id} style={{ opacity: a.is_read ? 0.6 : 1 }}>
                  <strong style={{ display: 'block', marginBottom: 4, color: 'var(--text-primary)', fontSize: 'var(--text-body)', fontWeight: 'var(--weight-semibold)' }}>{a.title}</strong>
                  <p>{a.message}</p>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>{relativeTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <p>No alerts right now.</p>
            </div>
          )}
        </div>
      </div>

      {/* ---- Branch performance ---- */}
      {branchPerf.length > 0 && (
        <div className="panel" style={{ marginTop: 24 }}>
          <div className="panel-heading">
            <div>
              <span className="panel-label">Multi-branch</span>
              <h2>Branch performance (MTD)</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Branch</th>
                  <th style={{ textAlign: 'right' }}>Transactions</th>
                  <th style={{ textAlign: 'right' }}>Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {branchPerf.map((b) => (
                  <tr key={b.branch_id}>
                    <td>{b.branch_name}</td>
                    <td style={{ textAlign: 'right' }}>{b.transactions}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(b.total_sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
