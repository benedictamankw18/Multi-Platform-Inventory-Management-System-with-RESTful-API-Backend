import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getInventoryTransactions, type InventoryItem } from '../services/api'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

type Transaction = {
  transaction_id: string
  product_id: string
  branch_id: string
  transaction_type: string
  quantity: number
  previous_quantity: number | null
  new_quantity: number | null
  notes: string | null
  performed_by: string | null
  created_at: string
  product_name?: string
  sku?: string
  branch_name?: string
}

const TYPE_LABELS: Record<string, string> = {
  STOCK_IN: 'Stock In',
  STOCK_OUT: 'Stock Out',
  ADJUSTMENT: 'Adjustment',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
  SALE: 'Sale',
}

const TYPE_VARIANTS: Record<string, string> = {
  STOCK_IN: 'success',
  STOCK_OUT: 'danger',
  ADJUSTMENT: 'info',
  TRANSFER_IN: 'success',
  TRANSFER_OUT: 'warning',
  SALE: 'info',
}

export default function InventoryHistoryPage() {
  const { selectedBranch, hasPermission } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const limit = 25

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
      const params: Record<string, unknown> = { page, limit }
      if (selectedBranch?.branch_id) params.branch_id = selectedBranch.branch_id
      if (typeFilter) params.transaction_type = typeFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const res = await getInventoryTransactions(params)
      setItems(res.data ?? [])
      setTotal(res.total ?? 0)
    } catch {
      setItems([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, selectedBranch, typeFilter, startDate, endDate])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  async function getExportData(): Promise<Record<string, unknown>[]> {
    try {
      const params: Record<string, unknown> = { page: 1, limit: 10000 }
      if (selectedBranch?.branch_id) params.branch_id = selectedBranch.branch_id
      if (typeFilter) params.transaction_type = typeFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const res = await getInventoryTransactions(params)
      const allItems = (res.data ?? []) as Transaction[]
      return allItems.map((t) => ({
        'Date': new Date(t.created_at).toLocaleString(),
        'Type': TYPE_LABELS[t.transaction_type] || t.transaction_type,
        'Product': t.product_name || '',
        'SKU': t.sku || '',
        'Branch': t.branch_name || '',
        'Quantity': Number(t.quantity),
        'Previous Qty': t.previous_quantity != null ? Number(t.previous_quantity) : '',
        'New Qty': t.new_quantity != null ? Number(t.new_quantity) : '',
        'Notes': t.notes || '',
      }))
    } catch {
      return []
    }
  }

  async function exportXLSX() {
    const data = await getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory History')
    XLSX.writeFile(wb, `inventory_history_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
    setShowExportMenu(false)
    toast(`${data.length} transactions exported as XLSX`, 'success')
  }

  async function exportCSV() {
    const data = await getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory_history_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
    toast(`${data.length} transactions exported as CSV`, 'success')
  }

  async function exportPDF() {
    const data = await getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const headers = Object.keys(data[0])
    const rows = data.map((r) => headers.map((h) => String(r[h] ?? '')))
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFontSize(10)
    doc.text('Inventory History Export', 14, 12)
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 18,
      styles: { fontSize: 6 },
      headStyles: { fillColor: [37, 99, 235] },
    })
    doc.save(`inventory_history_export_${new Date().toISOString().slice(0, 10)}.pdf`)
    setShowExportMenu(false)
    toast(`${data.length} transactions exported as PDF`, 'success')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Inventory History</h1>
          <p className="page-subtitle">View all stock movements and transactions</p>
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
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0, flex: '0 0 auto' }}>
            <span>Type</span>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}>
              <option value="">All Types</option>
              <option value="in">Stock In</option>
              <option value="out">Stock Out</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, flex: '0 0 auto' }}>
            <span>From</span>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} />
          </div>
          <div className="field" style={{ marginBottom: 0, flex: '0 0 auto' }}>
            <span>To</span>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} />
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Previous</th>
                <th>New</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading">
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="skeleton skeleton--row" />
                      <div className="skeleton skeleton--row" />
                      <div className="skeleton skeleton--row" />
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr key="empty">
                  <td colSpan={7}>
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p>No transactions found.</p>
                    </div>
                  </td>
                </tr>
              ) : items.map((t) => (
                <tr key={t.transaction_id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(t.created_at).toLocaleString()}</td>
                  <td>
                    <span className={`badge badge--${TYPE_VARIANTS[t.transaction_type] || 'info'}`}>
                      {TYPE_LABELS[t.transaction_type] || t.transaction_type}
                    </span>
                  </td>
                  <td>{t.product_name || t.product_id}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(t.quantity)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{t.previous_quantity != null ? Number(t.previous_quantity) : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{t.new_quantity != null ? Number(t.new_quantity) : '-'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{t.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-caption)' }}>
              Page {page} of {totalPages} ({total} total)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button className="btn btn--ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
