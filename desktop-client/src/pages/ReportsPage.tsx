import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getDailySales,
  getMonthlySales,
  getAnnualSales,
  getProfitReport,
  getLowStock,
  getBestSelling,
  getBranchPerformance,
  getInventoryReport,
  getPurchasesReport,
  getStockMovements,
  type DailySalesData,
  type MonthlySalesDay,
  type AnnualSalesItem,
  type ProfitData,
  type LowStockItem,
  type BestSellingItem,
  type BranchPerfItem,
  type InventoryReportItem,
  type PurchasesReportItem,
  type StockMovementItem,
  type StockMovementDay,
} from '../services/api'

type Tab = 'overview' | 'sales' | 'profit' | 'inventory' | 'purchases' | 'best-selling' | 'branches' | 'stock-movements'

export default function ReportsPage() {
  const { selectedBranch } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const resolvedBranch = selectedBranch?.branch_id

  // Overview
  const [ovDaily, setOvDaily] = useState<DailySalesData | null>(null)
  const [ovMonthly, setOvMonthly] = useState<MonthlySalesDay[]>([])
  const [ovAnnual, setOvAnnual] = useState<AnnualSalesItem[]>([])
  const [ovProfit, setOvProfit] = useState<ProfitData | null>(null)
  const [ovLowStock, setOvLowStock] = useState<LowStockItem[]>([])
  const [ovInventory, setOvInventory] = useState<InventoryReportItem[]>([])
  const [ovLoading, setOvLoading] = useState(true)

  // Sales
  const [salesMode, setSalesMode] = useState<'daily' | 'monthly' | 'annual'>('daily')
  const [salesDate, setSalesDate] = useState(new Date().toISOString().slice(0, 10))
  const [salesYear, setSalesYear] = useState(new Date().getFullYear())
  const [salesMonth, setSalesMonth] = useState(new Date().getMonth() + 1)
  const [salesDaily, setSalesDaily] = useState<DailySalesData | null>(null)
  const [salesMonthly, setSalesMonthly] = useState<MonthlySalesDay[]>([])
  const [salesAnnual, setSalesAnnual] = useState<AnnualSalesItem[]>([])
  const [salesLoading, setSalesLoading] = useState(false)

  // Profit
  const [pStart, setPStart] = useState(`${new Date().getFullYear()}-01-01`)
  const [pEnd, setPEnd] = useState(new Date().toISOString().slice(0, 10))
  const [profitData, setProfitData] = useState<ProfitData | null>(null)
  const [profitLoading, setProfitLoading] = useState(false)

  // Inventory
  const [invData, setInvData] = useState<InventoryReportItem[]>([])
  const [invLoading, setInvLoading] = useState(false)

  // Purchases
  const [puStart, setPuStart] = useState(`${new Date().getFullYear()}-01-01`)
  const [puEnd, setPuEnd] = useState(new Date().toISOString().slice(0, 10))
  const [puData, setPuData] = useState<PurchasesReportItem[]>([])
  const [puLoading, setPuLoading] = useState(false)

  // Best Selling
  const [bsStart, setBsStart] = useState(`${new Date().getFullYear()}-01-01`)
  const [bsEnd, setBsEnd] = useState(new Date().toISOString().slice(0, 10))
  const [bsLimit, setBsLimit] = useState(10)
  const [bsData, setBsData] = useState<BestSellingItem[]>([])
  const [bsLoading, setBsLoading] = useState(false)

  // Branch Performance
  const [bpStart, setBpStart] = useState(`${new Date().getFullYear()}-01-01`)
  const [bpEnd, setBpEnd] = useState(new Date().toISOString().slice(0, 10))
  const [bpData, setBpData] = useState<BranchPerfItem[]>([])
  const [bpLoading, setBpLoading] = useState(false)
  const [showBpExport, setShowBpExport] = useState(false)
  const bpExportRef = useRef<HTMLDivElement>(null)

  // Stock Movements
  const [smStart, setSmStart] = useState(`${new Date().getFullYear()}-01-01`)
  const [smEnd, setSmEnd] = useState(new Date().toISOString().slice(0, 10))
  const [smGroupBy, setSmGroupBy] = useState<'product' | 'day'>('product')
  const [smData, setSmData] = useState<StockMovementItem[] | StockMovementDay[]>([])
  const [smLoading, setSmLoading] = useState(false)
  const [showSmExport, setShowSmExport] = useState(false)
  const smExportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bpExportRef.current && !bpExportRef.current.contains(e.target as Node)) setShowBpExport(false)
      if (smExportRef.current && !smExportRef.current.contains(e.target as Node)) setShowSmExport(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function exportBranchPerfXLSX() {
    const rows = bpData.map((r) => ({
      Branch: r.branch_name,
      Transactions: r.transactions,
      'Total Sales': Number(r.total_sales).toFixed(2),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Branch Performance')
    XLSX.writeFile(wb, `branch-performance-${new Date().toISOString().slice(0, 10)}.xlsx`)
    setShowBpExport(false)
  }

  function exportBranchPerfCSV() {
    const rows = bpData.map((r) => ({
      Branch: r.branch_name,
      Transactions: r.transactions,
      'Total Sales': Number(r.total_sales).toFixed(2),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `branch-performance-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowBpExport(false)
  }

  function exportBranchPerfPDF() {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text('Branch Performance Report', 14, 20)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)
    autoTable(doc, {
      startY: 34,
      head: [['Branch', 'Transactions', 'Total Sales']],
      body: bpData.map((r) => [
        r.branch_name,
        String(r.transactions),
        Number(r.total_sales).toFixed(2),
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [37, 99, 235] },
    })
    doc.save(`branch-performance-${new Date().toISOString().slice(0, 10)}.pdf`)
    setShowBpExport(false)
  }

  const today = new Date().toISOString().slice(0, 10)

  const smRows = smGroupBy === 'product'
    ? (smData as StockMovementItem[]).map((r) => ({
        Product: r.product_name || '—',
        SKU: r.sku || '',
        'Stock In': Number(r.stock_in),
        'Stock Out': Number(r.stock_out),
        Adjustment: Number(r.adjustment),
        'Transfer In': Number(r.transfer_in),
        'Transfer Out': Number(r.transfer_out),
        Sales: Number(r.sale),
        Net: Number(r.net),
      }))
    : (smData as StockMovementDay[]).map((r) => ({
        Date: new Date(r.date).toLocaleDateString(),
        Transactions: r.transactions,
        'Total In': Number(r.total_in),
        'Total Out': Number(r.total_out),
        Net: Number(r.net),
      }))

  function exportSmXLSX() {
    const ws = XLSX.utils.json_to_sheet(smRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Movements')
    XLSX.writeFile(wb, `stock-movements-${new Date().toISOString().slice(0, 10)}.xlsx`)
    setShowSmExport(false)
  }

  function exportSmCSV() {
    const ws = XLSX.utils.json_to_sheet(smRows)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowSmExport(false)
  }

  function exportSmPDF() {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text('Stock Movements Report', 14, 20)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)
    const head = smGroupBy === 'product'
      ? [['Product', 'SKU', 'Stock In', 'Stock Out', 'Adjustment', 'Transfer In', 'Transfer Out', 'Sales', 'Net']]
      : [['Date', 'Transactions', 'Total In', 'Total Out', 'Net']]
    const body = smGroupBy === 'product'
      ? (smData as StockMovementItem[]).map((r) => [
          r.product_name || '—', r.sku || '',
          String(Number(r.stock_in)), String(Number(r.stock_out)), String(Number(r.adjustment)),
          String(Number(r.transfer_in)), String(Number(r.transfer_out)), String(Number(r.sale)), String(Number(r.net)),
        ])
      : (smData as StockMovementDay[]).map((r) => [
          new Date(r.date).toLocaleDateString(), String(r.transactions),
          String(Number(r.total_in)), String(Number(r.total_out)), String(Number(r.net)),
        ])
    autoTable(doc, {
      startY: 34,
      head,
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    })
    doc.save(`stock-movements-${new Date().toISOString().slice(0, 10)}.pdf`)
    setShowSmExport(false)
  }

  // ---- Overview ----
  const loadOverview = useCallback(async () => {
    setOvLoading(true)
    try {
      const [d, m, a, p, ls, inv] = await Promise.all([
        getDailySales(today, resolvedBranch),
        getMonthlySales(new Date().getFullYear(), new Date().getMonth() + 1, resolvedBranch),
        getAnnualSales(new Date().getFullYear(), resolvedBranch),
        getProfitReport({ startDate: `${new Date().getFullYear()}-01-01`, endDate: today, branchId: resolvedBranch }),
        getLowStock(resolvedBranch),
        getInventoryReport(resolvedBranch),
      ])
      setOvDaily(d)
      setOvMonthly(m)
      setOvAnnual(a)
      setOvProfit(p)
      setOvLowStock(ls)
      setOvInventory(inv)
    } catch {
      setOvDaily(null); setOvMonthly([]); setOvAnnual([]); setOvProfit(null); setOvLowStock([]); setOvInventory([])
    }
    setOvLoading(false)
  }, [resolvedBranch])

  useEffect(() => { if (tab === 'overview') loadOverview() }, [tab, loadOverview])

  // ---- Sales ----
  const loadSales = useCallback(async () => {
    setSalesLoading(true)
    try {
      if (salesMode === 'daily') {
        const d = await getDailySales(salesDate, resolvedBranch)
        setSalesDaily(d)
      } else if (salesMode === 'monthly') {
        const m = await getMonthlySales(salesYear, salesMonth, resolvedBranch)
        setSalesMonthly(m)
      } else {
        const a = await getAnnualSales(salesYear, resolvedBranch)
        setSalesAnnual(a)
      }
    } catch {
      setSalesDaily(null); setSalesMonthly([]); setSalesAnnual([])
    }
    setSalesLoading(false)
  }, [salesMode, salesDate, salesYear, salesMonth, resolvedBranch])

  useEffect(() => { if (tab === 'sales') loadSales() }, [tab, salesMode, salesDate, salesYear, salesMonth, loadSales])

  // ---- Profit ----
  const loadProfit = useCallback(async () => {
    setProfitLoading(true)
    if (pStart > pEnd) { setProfitData(null); setProfitLoading(false); return }
    try {
      const p = await getProfitReport({ startDate: pStart, endDate: pEnd, branchId: resolvedBranch })
      setProfitData(p)
    } catch { setProfitData(null) }
    setProfitLoading(false)
  }, [pStart, pEnd, resolvedBranch])

  useEffect(() => { if (tab === 'profit') loadProfit() }, [tab, pStart, pEnd, loadProfit])

  // ---- Inventory ----
  const loadInventory = useCallback(async () => {
    setInvLoading(true)
    try {
      const d = await getInventoryReport(resolvedBranch)
      setInvData(d)
    } catch { setInvData([]) }
    setInvLoading(false)
  }, [resolvedBranch])

  useEffect(() => { if (tab === 'inventory') loadInventory() }, [tab, loadInventory])

  // ---- Purchases ----
  const loadPurchases = useCallback(async () => {
    setPuLoading(true)
    if (puStart > puEnd) { setPuData([]); setPuLoading(false); return }
    try {
      const d = await getPurchasesReport({ startDate: puStart, endDate: puEnd, branchId: resolvedBranch })
      setPuData(d)
    } catch { setPuData([]) }
    setPuLoading(false)
  }, [puStart, puEnd, resolvedBranch])

  useEffect(() => { if (tab === 'purchases') loadPurchases() }, [tab, puStart, puEnd, loadPurchases])

  // ---- Best Selling ----
  const loadBestSelling = useCallback(async () => {
    setBsLoading(true)
    if (bsStart > bsEnd) { setBsData([]); setBsLoading(false); return }
    try {
      const d = await getBestSelling({ limit: bsLimit, startDate: bsStart, endDate: bsEnd, branchId: resolvedBranch })
      setBsData(d)
    } catch { setBsData([]) }
    setBsLoading(false)
  }, [bsStart, bsEnd, bsLimit, resolvedBranch])

  useEffect(() => { if (tab === 'best-selling') loadBestSelling() }, [tab, bsStart, bsEnd, bsLimit, loadBestSelling])

  // ---- Branch Performance ----
  const loadBranchPerf = useCallback(async () => {
    setBpLoading(true)
    if (bpStart > bpEnd) { setBpData([]); setBpLoading(false); return }
    try {
      const d = await getBranchPerformance({ startDate: bpStart, endDate: bpEnd })
      setBpData(d)
    } catch { setBpData([]) }
    setBpLoading(false)
  }, [bpStart, bpEnd])

  useEffect(() => { if (tab === 'branches') loadBranchPerf() }, [tab, bpStart, bpEnd, loadBranchPerf])

  // ---- Stock Movements ----
  const loadStockMovements = useCallback(async () => {
    setSmLoading(true)
    if (smStart > smEnd) { setSmData([]); setSmLoading(false); return }
    try {
      const d = await getStockMovements({ startDate: smStart, endDate: smEnd, branchId: resolvedBranch, groupBy: smGroupBy })
      setSmData(d)
    } catch { setSmData([]) }
    setSmLoading(false)
  }, [smStart, smEnd, smGroupBy, resolvedBranch])

  useEffect(() => { if (tab === 'stock-movements') loadStockMovements() }, [tab, smStart, smEnd, smGroupBy, loadStockMovements])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'sales', label: 'Sales' },
    { key: 'profit', label: 'Profit' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'purchases', label: 'Purchases' },
    { key: 'best-selling', label: 'Best Selling' },
    { key: 'branches', label: 'Branches' },
    { key: 'stock-movements', label: 'Stock Movements' },
  ]

  function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
    return (
      <div className="glass-card" style={{ padding: 'var(--space-5)' }}>
        <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 'var(--text-h3)', fontWeight: 700, fontFamily: 'monospace', color: accent || 'var(--text-primary)' }}>{value}</div>
        {sub && <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
      </div>
    )
  }

  function SkeletonRows({ cols }: { cols: number }) {
    return <tr key="loading"><td colSpan={cols}><div className="skeleton skeleton--row" /></td></tr>
  }

  function EmptyRow({ cols, msg }: { cols: number; msg?: string }) {
    return <tr key="empty"><td colSpan={cols} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>{msg || 'No data found.'}</td></tr>
  }

  function FilterBar({ children }: { children: React.ReactNode }) {
    return <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="page-subtitle">View business analytics and reports</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-4)', borderBottom: '2px solid var(--border)', flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button key={t.key} type="button"
            style={{ padding: 'var(--space-2) var(--space-4)', border: 'none', background: tab === t.key ? 'var(--primary)' : 'transparent', color: tab === t.key ? '#fff' : 'var(--text-secondary)', borderRadius: 'var(--radius-button) var(--radius-button) 0 0', cursor: 'pointer', fontSize: 'var(--text-body)', fontWeight: 500, whiteSpace: 'nowrap' }}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ============================== OVERVIEW ============================== */}
      {tab === 'overview' && (
        ovLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass-card" style={{ padding: 'var(--space-5)' }}><div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 8 }} /><div className="skeleton" style={{ height: 32, width: '40%' }} /></div>)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            <KpiCard label="Today's Sales" value={`${ovDaily?.total_sales ? Number(ovDaily.total_sales).toFixed(2) : '0.00'}`} sub={`${ovDaily?.transactions ?? 0} transactions`} accent="var(--primary)" />
            <KpiCard label="Monthly Sales" value={`${ovMonthly.reduce((s, r) => s + Number(r.total_sales), 0).toFixed(2)}`} sub={`${ovMonthly.reduce((s, r) => s + r.transactions, 0)} transactions`} />
            <KpiCard label="Annual Sales" value={`${ovAnnual.reduce((s, r) => s + Number(r.total_sales), 0).toFixed(2)}`} sub={`${ovAnnual.reduce((s, r) => s + r.transactions, 0)} transactions`} />
            <KpiCard label="Profit (YTD)" value={`${ovProfit?.profit ? Number(ovProfit.profit).toFixed(2) : '0.00'}`} accent={ovProfit?.profit != null && Number(ovProfit.profit) < 0 ? 'var(--danger)' : 'var(--success, #16a34a)'} />
            <KpiCard label="Low Stock Items" value={`${ovLowStock.length}`} accent={ovLowStock.length > 0 ? 'var(--danger)' : 'var(--success, #16a34a)'} />
            <KpiCard label="Products Tracked" value={`${ovInventory.length}`} />
          </div>
        )
      )}

      {/* ============================== SALES ============================== */}
      {tab === 'sales' && (
        <div className="glass-card">
          <FilterBar>
            <select className="input" style={{ width: 'auto' }} value={salesMode} onChange={(e) => setSalesMode(e.target.value as 'daily' | 'monthly' | 'annual')}>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
            {salesMode === 'daily' && (
              <input type="date" className="input" style={{ width: 'auto' }} value={salesDate} onChange={(e) => setSalesDate(e.target.value)} />
            )}
            {salesMode === 'monthly' && (
              <>
                <input type="number" className="input" style={{ width: 80 }} value={salesYear} onChange={(e) => setSalesYear(Number(e.target.value))} min={2000} max={2100} />
                <select className="input" style={{ width: 'auto' }} value={salesMonth} onChange={(e) => setSalesMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
                </select>
              </>
            )}
            {salesMode === 'annual' && (
              <input type="number" className="input" style={{ width: 80 }} value={salesYear} onChange={(e) => setSalesYear(Number(e.target.value))} min={2000} max={2100} />
            )}
          </FilterBar>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {salesMode === 'daily' && <th>Date</th>}
                  {salesMode === 'monthly' && <th>Day</th>}
                  {salesMode === 'annual' && <th>Year</th>}
                  <th>Transactions</th>
                  <th style={{ textAlign: 'right' }}>Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {salesLoading ? (
                  <SkeletonRows cols={3} />
                ) : salesMode === 'daily' ? (
                  !salesDaily ? <EmptyRow cols={3} /> : (
                    <tr key="daily">
                      <td>{new Date(salesDate).toLocaleDateString()}</td>
                      <td>{salesDaily.transactions}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{Number(salesDaily.total_sales).toFixed(2)}</td>
                    </tr>
                  )
                ) : salesMode === 'monthly' ? (
                  salesMonthly.length === 0 ? <EmptyRow cols={3} /> : salesMonthly.map((r) => (
                    <tr key={r.day}>
                      <td>{new Date(r.day).toLocaleDateString()}</td>
                      <td>{r.transactions}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{Number(r.total_sales).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  salesAnnual.length === 0 ? <EmptyRow cols={3} /> : salesAnnual.map((r) => (
                    <tr key={r.year}>
                      <td>{r.year}</td>
                      <td>{r.transactions}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{Number(r.total_sales).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================== PROFIT ============================== */}
      {tab === 'profit' && (
        <div className="glass-card">
          <FilterBar>
            <input type="date" className="input" style={{ width: 'auto' }} value={pStart} onChange={(e) => setPStart(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>to</span>
            <input type="date" className="input" style={{ width: 'auto' }} value={pEnd} onChange={(e) => setPEnd(e.target.value)} />
          </FilterBar>

          {pStart > pEnd && <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)', color: 'var(--error)' }}>Start date must be before end date.</div>}

          {profitLoading ? (
            <div style={{ maxWidth: 300 }}><div className="skeleton skeleton--row" /></div>
          ) : !profitData ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>No profit data available for this period.</p>
          ) : (
            <KpiCard label="Net Profit" value={Number(profitData.profit).toFixed(2)} accent={profitData.profit < 0 ? 'var(--danger)' : 'var(--success, #16a34a)'} />
          )}
        </div>
      )}

      {/* ============================== INVENTORY ============================== */}
      {tab === 'inventory' && (
        <div className="glass-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>UoM</th>
                  <th style={{ textAlign: 'right' }}>On Hand</th>
                  <th style={{ textAlign: 'right' }}>Available</th>
                  <th style={{ textAlign: 'right' }}>Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                {invLoading ? (
                  <SkeletonRows cols={5} />
                ) : invData.length === 0 ? (
                  <EmptyRow cols={5} />
                ) : invData.map((r) => (
                  <tr key={r.inventory_id}>
                    <td>{r.product_name || '—'}</td>
                    <td>{r.uom_name || '—'}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{r.quantity_on_hand}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: r.available_quantity <= r.reorder_level ? 'var(--danger)' : 'inherit' }}>{r.available_quantity}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{r.reorder_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================== PURCHASES ============================== */}
      {tab === 'purchases' && (
        <div className="glass-card">
          <FilterBar>
            <input type="date" className="input" style={{ width: 'auto' }} value={puStart} onChange={(e) => setPuStart(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>to</span>
            <input type="date" className="input" style={{ width: 'auto' }} value={puEnd} onChange={(e) => setPuEnd(e.target.value)} />
          </FilterBar>

          {puStart > puEnd && <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)', color: 'var(--error)' }}>Start date must be before end date.</div>}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Orders</th>
                  <th style={{ textAlign: 'right' }}>Total Purchased</th>
                </tr>
              </thead>
              <tbody>
                {puLoading ? (
                  <SkeletonRows cols={3} />
                ) : puData.length === 0 ? (
                  <EmptyRow cols={3} />
                ) : puData.map((r, i) => (
                  <tr key={r.date + i}>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
                    <td>{r.purchases}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{Number(r.total_purchased).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================== BEST SELLING ============================== */}
      {tab === 'best-selling' && (
        <div className="glass-card">
          <FilterBar>
            <input type="date" className="input" style={{ width: 'auto' }} value={bsStart} onChange={(e) => setBsStart(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>to</span>
            <input type="date" className="input" style={{ width: 'auto' }} value={bsEnd} onChange={(e) => setBsEnd(e.target.value)} />
            <select className="input" style={{ width: 'auto' }} value={bsLimit} onChange={(e) => setBsLimit(Number(e.target.value))}>
              {[5, 10, 20, 50].map((n) => <option key={n} value={n}>Top {n}</option>)}
            </select>
          </FilterBar>

          {bsStart > bsEnd && <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)', color: 'var(--error)' }}>Start date must be before end date.</div>}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Qty Sold</th>
                  <th style={{ width: '30%' }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {bsLoading ? (
                  <SkeletonRows cols={4} />
                ) : bsData.length === 0 ? (
                  <EmptyRow cols={4} />
                ) : (
                  (() => {
                    const maxQty = Math.max(...bsData.map((r) => r.qty_sold), 1)
                    return bsData.map((r, i) => (
                      <tr key={r.product_id}>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{i + 1}</td>
                        <td>{r.product_name || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{r.qty_sold}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${(r.qty_sold / maxQty) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 4, transition: 'width 300ms' }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{maxQty > 0 ? Math.round((r.qty_sold / maxQty) * 100) : 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  })()
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================== BRANCHES ============================== */}
      {tab === 'branches' && (
        <div className="glass-card">
          <FilterBar>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>From</span>
            <input type="date" className="input" style={{ width: 'auto' }} value={bpStart} onChange={(e) => setBpStart(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>To</span>
            <input type="date" className="input" style={{ width: 'auto' }} value={bpEnd} onChange={(e) => setBpEnd(e.target.value)} />
          </FilterBar>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
            <div ref={bpExportRef} style={{ position: 'relative' }}>
              <button type="button" className="btn btn--ghost" style={{ fontSize: 12 }} onClick={() => setShowBpExport(!showBpExport)} disabled={bpData.length === 0}>Export</button>
              {showBpExport && (
                <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 160, padding: 'var(--space-1)' }}>
                  <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, borderRadius: 4 }} onClick={exportBranchPerfXLSX}>Export XLSX</button>
                  <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, borderRadius: 4 }} onClick={exportBranchPerfCSV}>Export CSV</button>
                  <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, borderRadius: 4 }} onClick={exportBranchPerfPDF}>Export PDF</button>
                </div>
              )}
            </div>
          </div>

          {bpStart > bpEnd && <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)', color: 'var(--error)' }}>Start date must be before end date.</div>}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Transactions</th>
                  <th style={{ textAlign: 'right' }}>Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {bpLoading ? (
                  <SkeletonRows cols={3} />
                ) : bpData.length === 0 ? (
                  <EmptyRow cols={3} />
                ) : bpData.map((r) => (
                  <tr key={r.branch_id}>
                    <td>{r.branch_name || '—'}</td>
                    <td>{r.transactions}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{Number(r.total_sales).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================== STOCK MOVEMENTS ============================== */}
      {tab === 'stock-movements' && (
        <div className="glass-card">
          <FilterBar>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>From</span>
            <input type="date" className="input" style={{ width: 'auto' }} value={smStart} onChange={(e) => setSmStart(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>To</span>
            <input type="date" className="input" style={{ width: 'auto' }} value={smEnd} onChange={(e) => setSmEnd(e.target.value)} />
            <select className="input" style={{ width: 'auto' }} value={smGroupBy} onChange={(e) => setSmGroupBy(e.target.value as 'product' | 'day')}>
              <option value="product">By Product</option>
              <option value="day">By Day</option>
            </select>
          </FilterBar>

          {smStart > smEnd && <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)', color: 'var(--error)' }}>Start date must be before end date.</div>}

          {smGroupBy === 'product' && smData.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 'var(--space-4)' }}>
              <KpiCard label="Total Stock In" value={Number((smData as StockMovementItem[]).reduce((s, r) => s + Number(r.stock_in) + Number(r.transfer_in) + Number(r.adjustment), 0)).toFixed(2)} accent="var(--success, #16a34a)" />
              <KpiCard label="Total Stock Out" value={Number((smData as StockMovementItem[]).reduce((s, r) => s + Number(r.stock_out) + Number(r.transfer_out) + Number(r.sale), 0)).toFixed(2)} accent="var(--danger, #ef4444)" />
              <KpiCard label="Net Movement" value={Number((smData as StockMovementItem[]).reduce((s, r) => s + Number(r.net), 0)).toFixed(2)} accent="var(--primary)" />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
            <div ref={smExportRef} style={{ position: 'relative' }}>
              <button type="button" className="btn btn--ghost" style={{ fontSize: 12 }} onClick={() => setShowSmExport(!showSmExport)} disabled={smData.length === 0}>Export</button>
              {showSmExport && (
                <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 160, padding: 'var(--space-1)' }}>
                  <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, borderRadius: 4 }} onClick={exportSmXLSX}>Export XLSX</button>
                  <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, borderRadius: 4 }} onClick={exportSmCSV}>Export CSV</button>
                  <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, borderRadius: 4 }} onClick={exportSmPDF}>Export PDF</button>
                </div>
              )}
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {smGroupBy === 'product' ? (
                    <>
                      <th>Product</th>
                      <th>SKU</th>
                      <th style={{ textAlign: 'right' }}>Stock In</th>
                      <th style={{ textAlign: 'right' }}>Stock Out</th>
                      <th style={{ textAlign: 'right' }}>Adjustment</th>
                      <th style={{ textAlign: 'right' }}>Transfer In</th>
                      <th style={{ textAlign: 'right' }}>Transfer Out</th>
                      <th style={{ textAlign: 'right' }}>Sales</th>
                      <th style={{ textAlign: 'right' }}>Net</th>
                    </>
                  ) : (
                    <>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Transactions</th>
                      <th style={{ textAlign: 'right' }}>Total In</th>
                      <th style={{ textAlign: 'right' }}>Total Out</th>
                      <th style={{ textAlign: 'right' }}>Net</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {smLoading ? (
                  <SkeletonRows cols={smGroupBy === 'product' ? 9 : 5} />
                ) : smData.length === 0 ? (
                  <EmptyRow cols={smGroupBy === 'product' ? 9 : 5} />
                ) : smGroupBy === 'product' ? (
                  (smData as StockMovementItem[]).map((r) => (
                    <tr key={r.product_id}>
                      <td>{r.product_name || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{r.sku || ''}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{Number(r.stock_in)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{Number(r.stock_out)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{Number(r.adjustment)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{Number(r.transfer_in)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{Number(r.transfer_out)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{Number(r.sale)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', color: Number(r.net) >= 0 ? 'var(--success, #16a34a)' : 'var(--danger, #ef4444)' }}>{Number(r.net)}</td>
                    </tr>
                  ))
                ) : (
                  (smData as StockMovementDay[]).map((r) => (
                    <tr key={r.date}>
                      <td>{new Date(r.date).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{r.transactions}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--success, #16a34a)' }}>{Number(r.total_in)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--danger, #ef4444)' }}>{Number(r.total_out)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{Number(r.net)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
