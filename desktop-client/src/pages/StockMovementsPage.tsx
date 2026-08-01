import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import {
  getInventoryTransactions,
  searchProducts,
  createInventoryTransaction,
  getInventory,
  type Product,
  type InventoryItem,
} from '../services/api'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Transaction {
  transaction_id: string
  product_id: string
  branch_id: string
  transaction_type: string
  quantity: number
  previous_quantity: number | null
  new_quantity: number | null
  unit_cost: number | null
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
  'in': 'Stock In',
  'out': 'Stock Out',
}

const TYPE_VARIANTS: Record<string, string> = {
  STOCK_IN: 'success',
  STOCK_OUT: 'danger',
  ADJUSTMENT: 'warning',
  TRANSFER_IN: 'info',
  TRANSFER_OUT: 'info',
  SALE: 'info',
  'in': 'success',
  'out': 'danger',
}

const limit = 25

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function StockMovementsPage() {
  const { toast } = useToast()
  const { selectedBranch, hasPermission } = useAuth()

  const [items, setItems] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const totalPages = Math.ceil(total / limit)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit }
      if (selectedBranch?.branch_id) params.branch_id = selectedBranch.branch_id
      if (typeFilter) params.transaction_type = typeFilter
      const res = await getInventoryTransactions(params)
      let data: Transaction[] = res.data ?? res.transactions ?? []
      if (search) {
        const q = search.toLowerCase()
        data = data.filter((t: Transaction) =>
          (t.product_name ?? '').toLowerCase().includes(q) ||
          (t.sku ?? '').toLowerCase().includes(q)
        )
      }
      setItems(data)
      setTotal(res.total ?? data.length)
    } catch {
      setItems([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, search, typeFilter, selectedBranch])

  useEffect(() => { load() }, [load])

  useEffect(() => { setPage(1) }, [search, typeFilter])

  const canManage = hasPermission('MANAGE_INVENTORY')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchAllForExport(): Promise<Transaction[]> {
    try {
      const params: Record<string, unknown> = { page: 1, limit: 10000 }
      if (selectedBranch?.branch_id) params.branch_id = selectedBranch.branch_id
      if (typeFilter) params.transaction_type = typeFilter
      const res = await getInventoryTransactions(params)
      return res.data ?? res.transactions ?? []
    } catch { return [] }
  }

  function exportXLSX() {
    fetchAllForExport().then((data) => {
      const rows = data.map((t) => ({
        Date: formatDate(t.created_at),
        Type: t.transaction_type,
        Product: t.product_name || '',
        SKU: t.sku || '',
        Quantity: Number(t.quantity),
        'Previous Stock': t.previous_quantity ?? '',
        'New Stock': t.new_quantity ?? '',
        'Unit Cost': t.unit_cost ?? '',
        Notes: t.notes || '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Movements')
      XLSX.writeFile(wb, `stock-movements-${new Date().toISOString().slice(0, 10)}.xlsx`)
      setShowExportMenu(false)
      toast('Exported XLSX', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  function exportCSV() {
    fetchAllForExport().then((data) => {
      const rows = data.map((t) => ({
        Date: formatDate(t.created_at),
        Type: t.transaction_type,
        Product: t.product_name || '',
        SKU: t.sku || '',
        Quantity: Number(t.quantity),
        'Previous Stock': t.previous_quantity ?? '',
        'New Stock': t.new_quantity ?? '',
        'Unit Cost': t.unit_cost ?? '',
        Notes: t.notes || '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setShowExportMenu(false)
      toast('Exported CSV', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  function exportPDF() {
    fetchAllForExport().then((data) => {
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(16)
      doc.text('Stock Movements Report', 14, 20)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)
      autoTable(doc, {
        startY: 34,
        head: [['Date', 'Type', 'Product', 'SKU', 'Qty', 'Prev Stock', 'New Stock', 'Unit Cost', 'Notes']],
        body: data.map((t) => [
          formatDate(t.created_at),
          t.transaction_type,
          t.product_name || '',
          t.sku || '',
          String(Number(t.quantity)),
          t.previous_quantity != null ? String(t.previous_quantity) : '',
          t.new_quantity != null ? String(t.new_quantity) : '',
          t.unit_cost != null ? String(t.unit_cost) : '',
          t.notes || '',
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      })
      doc.save(`stock-movements-${new Date().toISOString().slice(0, 10)}.pdf`)
      setShowExportMenu(false)
      toast('Exported PDF', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  const [modal, setModal] = useState<'stock-in' | 'stock-out' | null>(null)
  const [modalSearch, setModalSearch] = useState('')
  const [modalProducts, setModalProducts] = useState<Product[]>([])
  const [modalSelected, setModalSelected] = useState<Product | null>(null)
  const [modalQty, setModalQty] = useState('')
  const [modalCost, setModalCost] = useState('')
  const [modalNotes, setModalNotes] = useState('')
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalSearching, setModalSearching] = useState(false)
  const [modalStock, setModalStock] = useState<number | null>(null)

  function openModal(type: 'stock-in' | 'stock-out') {
    setModal(type)
    setModalSearch('')
    setModalProducts([])
    setModalSelected(null)
    setModalQty('')
    setModalCost('')
    setModalNotes('')
    setModalStock(null)
  }

  function closeModal() { setModal(null) }

  const lookupProduct = useCallback(async (query: string) => {
    if (!query.trim()) return
    setModalSearching(true)
    try {
      const res = await searchProducts({ q: query, limit: 20, branch_id: selectedBranch?.branch_id })
      const list = res.products ?? []
      setModalProducts(list)
      if (list.length === 1) {
        setModalSelected(list[0])
        if (modal === 'stock-out') await fetchModalStock(list[0].product_id)
      } else if (list.length === 0) {
        setModalSelected(null)
        toast('No products found', 'warning')
      }
    } catch {
      toast('Failed to search products', 'error')
    }
    setModalSearching(false)
  }, [toast, modal, selectedBranch])

  async function fetchModalStock(productId: string) {
    if (!selectedBranch) return
    try {
      const res = await getInventory({ product_id: productId, branch_id: selectedBranch.branch_id, limit: 1 })
      const items: InventoryItem[] = res.data ?? []
      setModalStock(items.length > 0 ? Number(items[0].quantity_on_hand) : 0)
    } catch {
      setModalStock(null)
    }
  }

  async function handleModalProductSelect(productId: string) {
    const p = modalProducts.find(p => p.product_id === productId)
    if (p) {
      setModalSelected(p)
      if (modal === 'stock-out') await fetchModalStock(p.product_id)
    }
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!modalSelected) { toast('Please select a product', 'warning'); return }
    if (!selectedBranch) { toast('No branch selected', 'error'); return }
    const qty = Number(modalQty)
    if (!qty || qty <= 0) { toast('Quantity must be greater than zero', 'warning'); return }
    if (modal === 'stock-out' && modalStock !== null && qty > modalStock) {
      toast(`Insufficient stock. Available: ${modalStock}`, 'error'); return
    }

    setModalSubmitting(true)
    try {
      await createInventoryTransaction({
        product_id: modalSelected.product_id,
        branch_id: selectedBranch.branch_id,
        quantity: qty,
        type: modal === 'stock-in' ? 'in' : 'out',
        unit_cost: modal === 'stock-in' && modalCost ? Number(modalCost) : undefined,
        notes: modalNotes || undefined,
      })
      toast(modal === 'stock-in' ? 'Stock-in recorded successfully' : 'Stock-out recorded successfully', 'success')
      closeModal()
      load()
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to record transaction', 'error')
    }
    setModalSubmitting(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Stock Movements</h1>
          <p className="page-subtitle">{total} transaction{total !== 1 ? 's' : ''} total</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button className="btn btn--ghost" onClick={() => setShowExportMenu(!showExportMenu)}>Export</button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 160, padding: 'var(--space-1)' }}>
                <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, borderRadius: 4 }} onClick={exportXLSX}>Export XLSX</button>
                <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, borderRadius: 4 }} onClick={exportCSV}>Export CSV</button>
                <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, borderRadius: 4 }} onClick={exportPDF}>Export PDF</button>
              </div>
            )}
          </div>
          {canManage && (
            <button className="btn btn--ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => openModal('stock-out')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5m0 0l-6 6m6-6l6 6" /></svg>
              Stock Out
            </button>
          )}
          {canManage && (
            <button className="btn btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => openModal('stock-in')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m0 0l-6-6m6 6l6-6" /></svg>
              Stock In
            </button>
          )}
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input" style={{ flex: 1, marginBottom: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-input)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 'var(--text-body)', minWidth: 140 }}
          >
            <option value="">All Types</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Product</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th style={{ textAlign: 'right' }}>Previous</th>
                <th style={{ textAlign: 'right' }}>New</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7}><div className="skeleton skeleton--row" /></td></tr>
                ))
              ) : items.length === 0 ? (
                <tr key="empty"><td colSpan={7}>
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
                      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <p>No transactions found.</p>
                    {canManage && (
                      <button className="btn btn--primary" style={{ marginTop: 8 }} onClick={() => openModal('stock-in')}>Record Stock In</button>
                    )}
                  </div>
                </td></tr>
              ) : items.map(t => (
                <tr key={t.transaction_id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(t.created_at)}</td>
                  <td>
                    <span className={`badge badge--${TYPE_VARIANTS[t.transaction_type] ?? 'info'}`}>
                      {TYPE_LABELS[t.transaction_type] ?? t.transaction_type}
                    </span>
                  </td>
                  <td>
                    <div>{t.product_name || 'Unknown'}</div>
                    {t.sku && <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>{t.sku}</div>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: t.transaction_type === 'in' || t.transaction_type === 'STOCK_IN' ? 'var(--success)' : t.transaction_type === 'out' || t.transaction_type === 'STOCK_OUT' ? 'var(--error)' : 'var(--text-primary)' }}>
                    {t.transaction_type === 'in' || t.transaction_type === 'STOCK_IN' ? '+' : t.transaction_type === 'out' || t.transaction_type === 'STOCK_OUT' ? '-' : ''}{Number(t.quantity)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{t.previous_quantity != null ? Number(t.previous_quantity) : '—'}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{t.new_quantity != null ? Number(t.new_quantity) : '—'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{t.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ color: 'var(--secondary)', fontSize: 'var(--text-caption)' }}>Page {page} of {totalPages} ({total} total)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="btn btn--ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 600, textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)', fontWeight: 500 }}>INVENTORY</span>
                <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{modal === 'stock-in' ? 'Record Stock In' : 'Record Stock Out'}</h3>
              </div>
              <button className="btn btn--ghost" onClick={closeModal}>&times;</button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div style={{ padding: 'var(--space-6)', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
                <div className="field">
                  <span>Barcode / SKU Lookup</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Scan or type barcode/SKU"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (modalSearch.trim()) lookupProduct(modalSearch.trim()) } }}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn--ghost" onClick={() => { if (modalSearch.trim()) lookupProduct(modalSearch.trim()) }} disabled={modalSearching}>
                      {modalSearching ? 'Searching...' : 'Lookup'}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <span>Or Search Products</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="Search by name, SKU, or barcode"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (modalSearch.trim()) lookupProduct(modalSearch.trim()) } }}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn--ghost" onClick={() => { if (modalSearch.trim()) lookupProduct(modalSearch.trim()) }} disabled={modalSearching}>
                      Search
                    </button>
                  </div>
                </div>

                {modalProducts.length > 1 && !modalSelected && (
                  <div className="field">
                    <span>Select Product ({modalProducts.length} results)</span>
                    <select value="" onChange={(e) => handleModalProductSelect(e.target.value)}>
                      <option value="">-- Choose a product --</option>
                      {modalProducts.map(p => (
                        <option key={p.product_id} value={p.product_id}>{p.product_name} ({p.sku})</option>
                      ))}
                    </select>
                  </div>
                )}

                {modalSelected && (
                  <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: 'var(--radius-button)', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{modalSelected.product_name}</strong>
                        <span style={{ color: 'var(--text-secondary)', marginLeft: 8, fontSize: 'var(--text-caption)' }}>{modalSelected.sku}</span>
                      </div>
                      <button type="button" className="btn btn--ghost" style={{ fontSize: 'var(--text-caption)' }} onClick={() => { setModalSelected(null); setModalProducts([]); setModalStock(null) }}>
                        Change
                      </button>
                    </div>
                    {modal === 'stock-out' && modalStock !== null && (
                      <div style={{ marginTop: 8, fontSize: 'var(--text-body)' }}>
                        Available stock: <strong style={{ color: modalStock <= 0 ? 'var(--error)' : modalStock <= (modalSelected.minimum_stock || 0) ? 'var(--warning)' : 'var(--success)' }}>{modalStock}</strong>
                      </div>
                    )}
                  </div>
                )}

                <div className="field">
                  <span>Quantity *</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={modal === 'stock-out' && modalStock != null ? modalStock : undefined}
                    value={modalQty}
                    onChange={(e) => setModalQty(e.target.value)}
                    placeholder="Enter quantity"
                    required
                  />
                </div>

                {modal === 'stock-in' && (
                  <div className="field">
                    <span>Unit Cost (optional)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={modalCost}
                      onChange={(e) => setModalCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                )}

                <div className="field">
                  <span>Notes (optional)</span>
                  <textarea
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder={modal === 'stock-in' ? 'Reason for stock-in, supplier reference, etc.' : 'Reason for stock-out (waste, damage, return, etc.)'}
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={modalSubmitting || !modalSelected}>
                  {modalSubmitting ? 'Recording...' : modal === 'stock-in' ? 'Record Stock In' : 'Record Stock Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
