import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getLowStock } from '../services/api'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

type LowStockItem = {
  inventory_id: string
  product_id: string
  product_name: string
  sku?: string
  quantity_on_hand: number
  available_quantity: number
  reorder_level: number
  minimum_stock?: number
  branch_name?: string
}

export default function LowStockAlertsPage() {
  const { selectedBranch, hasPermission } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getLowStock(selectedBranch?.branch_id)
      setItems(data ?? [])
    } catch {
      setItems([])
    }
    setLoading(false)
  }, [selectedBranch])

  useEffect(() => { load() }, [load])

  function getExportData(): Record<string, unknown>[] {
    return items.map((item) => {
      const stock = Number(item.available_quantity ?? item.quantity_on_hand)
      const minStock = Number(item.minimum_stock ?? item.reorder_level)
      return {
        'Product Name': item.product_name,
        'SKU': item.sku || '',
        'Branch': item.branch_name || '',
        'Current Stock': stock,
        'Minimum Stock': minStock,
        'Status': stock <= 0 ? 'Out of Stock' : 'Low Stock',
      }
    })
  }

  function exportXLSX() {
    const data = getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Low Stock Alerts')
    XLSX.writeFile(wb, `low_stock_alerts_${new Date().toISOString().slice(0, 10)}.xlsx`)
    setShowExportMenu(false)
    toast(`${data.length} items exported as XLSX`, 'success')
  }

  function exportCSV() {
    const data = getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `low_stock_alerts_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
    toast(`${data.length} items exported as CSV`, 'success')
  }

  function exportPDF() {
    const data = getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const headers = Object.keys(data[0])
    const rows = data.map((r) => headers.map((h) => String(r[h] ?? '')))
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFontSize(10)
    doc.text('Low Stock Alerts', 14, 12)
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 18,
      styles: { fontSize: 6 },
      headStyles: { fillColor: [37, 99, 235] },
    })
    doc.save(`low_stock_alerts_${new Date().toISOString().slice(0, 10)}.pdf`)
    setShowExportMenu(false)
    toast(`${data.length} items exported as PDF`, 'success')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Low Stock Alerts</h1>
          <p className="page-subtitle">Products below minimum stock level{selectedBranch?.branch_name ? ` at ${selectedBranch.branch_name}` : ''}</p>
        </div>
        {hasPermission('VIEW_INVENTORY') && (
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button type="button" className="btn btn--ghost" onClick={() => setShowExportMenu(!showExportMenu)}>Export</button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-lg)', zIndex: 20, minWidth: 180, overflow: 'hidden' }}>
                <button type="button" style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-4)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }} onClick={exportXLSX}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  Export XLSX
                </button>
                <button type="button" style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-4)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }} onClick={exportCSV}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                  Export CSV
                </button>
                <button type="button" style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-4)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }} onClick={exportPDF}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  Export PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Branch</th>
                <th style={{ textAlign: 'right' }}>Current Stock</th>
                <th style={{ textAlign: 'right' }}>Minimum Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading">
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="skeleton skeleton--row" />
                      <div className="skeleton skeleton--row" />
                      <div className="skeleton skeleton--row" />
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr key="empty">
                  <td colSpan={6}>
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>No low stock items. All products are well stocked.</p>
                    </div>
                  </td>
                </tr>
              ) : items.map((item) => {
                const stock = Number(item.available_quantity ?? item.quantity_on_hand)
                const minStock = Number(item.minimum_stock ?? item.reorder_level)
                const isOut = stock <= 0
                return (
                  <tr key={item.inventory_id}>
                    <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.sku || '-'}</td>
                    <td>{item.branch_name || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: isOut ? 'var(--error)' : 'var(--warning)' }}>{stock}</td>
                    <td style={{ textAlign: 'right' }}>{minStock}</td>
                    <td>
                      <span className={`badge badge--${isOut ? 'danger' : 'warning'}`}>
                        {isOut ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {items.length > 0 && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg)', borderRadius: 'var(--radius-button)', fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>
            {items.length} product{items.length !== 1 ? 's' : ''} below minimum stock level.
          </div>
        )}
      </div>
    </div>
  )
}
