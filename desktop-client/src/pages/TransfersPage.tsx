import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import ConfirmModal from '../components/ConfirmModal'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getInventoryTransfers, createInventoryTransfer, approveInventoryTransfer,
  rejectInventoryTransfer, shipInventoryTransfer, receiveInventoryTransfer,
  getBranches, searchProducts, getInventory,
  type InventoryTransfer, type Product, type BranchInfo,
} from '../services/api'

type Tab = 'all' | 'pending' | 'shipped' | 'received' | 'mine'

type TransferItem = {
  product: Product
  quantity: string
  availableStock: number
}

const STATUS_VARIANTS: Record<string, string> = {
  DRAFT: 'info',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  SHIPPED: 'info',
  RECEIVED: 'success',
}

export default function TransfersPage() {
  const { toast } = useToast()
  const { user, selectedBranch, hasPermission } = useAuth()
  const canManage = hasPermission('MANAGE_INVENTORY')

  const [tab, setTab] = useState<Tab>('all')
  const [items, setItems] = useState<InventoryTransfer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [viewTransfer, setViewTransfer] = useState<InventoryTransfer | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'ship' | 'receive' | 'reject'; transferId: string } | null>(null)
  const limit = 25
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchAllForExport(): Promise<InventoryTransfer[]> {
    try {
      const params: Record<string, unknown> = { page: 1, limit: 10000 }
      if (selectedBranch?.branch_id) params.branchId = selectedBranch.branch_id
      if (tab !== 'all') { if (tab === 'mine') params.requestedBy = user?.userId; else params.status = tab.toUpperCase() }
      const res = await getInventoryTransfers(params)
      return Array.isArray(res?.data) ? res.data : Array.isArray(res?.transfers) ? res.transfers : []
    } catch { return [] }
  }

  function exportXLSX() {
    fetchAllForExport().then((data) => {
      const rows = data.map((t) => ({
        'Transfer #': t.transfer_number || t.transfer_id.slice(0, 8),
        Product: t.product_name || '',
        'From Branch': t.from_branch_name || t.from_branch_id,
        'To Branch': t.to_branch_name || t.to_branch_id,
        Quantity: Number(t.quantity),
        Status: t.status,
        'Requested By': t.requested_by_name || '',
        'Approved By': t.approved_by_name || '',
        Date: t.requested_at ? new Date(t.requested_at).toLocaleDateString() : '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Transfers')
      XLSX.writeFile(wb, `transfers-${new Date().toISOString().slice(0, 10)}.xlsx`)
      setShowExportMenu(false)
      toast('Exported XLSX', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  function exportCSV() {
    fetchAllForExport().then((data) => {
      const rows = data.map((t) => ({
        'Transfer #': t.transfer_number || t.transfer_id.slice(0, 8),
        Product: t.product_name || '',
        'From Branch': t.from_branch_name || t.from_branch_id,
        'To Branch': t.to_branch_name || t.to_branch_id,
        Quantity: Number(t.quantity),
        Status: t.status,
        'Requested By': t.requested_by_name || '',
        'Approved By': t.approved_by_name || '',
        Date: t.requested_at ? new Date(t.requested_at).toLocaleDateString() : '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transfers-${new Date().toISOString().slice(0, 10)}.csv`
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
      doc.text('Inventory Transfers Report', 14, 20)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)
      autoTable(doc, {
        startY: 34,
        head: [['Transfer #', 'Product', 'From', 'To', 'Qty', 'Status', 'Requested By', 'Approved By', 'Date']],
        body: data.map((t) => [
          t.transfer_number || t.transfer_id.slice(0, 8),
          t.product_name || '',
          t.from_branch_name || t.from_branch_id,
          t.to_branch_name || t.to_branch_id,
          String(Number(t.quantity)),
          t.status,
          t.requested_by_name || '',
          t.approved_by_name || '',
          t.requested_at ? new Date(t.requested_at).toLocaleDateString() : '',
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      })
      doc.save(`transfers-${new Date().toISOString().slice(0, 10)}.pdf`)
      setShowExportMenu(false)
      toast('Exported PDF', 'success')
    }).catch(() => toast('Export failed', 'error'))
  }

  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [transferItems, setTransferItems] = useState<TransferItem[]>([])
  const [toBranch, setToBranch] = useState('')
  const [notes, setNotes] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)

  const fromBranch = selectedBranch?.branch_id || ''

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit }
      if (selectedBranch?.branch_id) params.branchId = selectedBranch.branch_id
      if (tab === 'pending') params.status = 'PENDING'
      if (tab === 'shipped') params.status = 'SHIPPED'
      if (tab === 'received') params.status = 'RECEIVED'
      if (tab === 'mine' && user?.userId) params.requestedBy = user.userId
      const res = await getInventoryTransfers(params)
      setItems(res.data ?? [])
      setTotal(res.total ?? 0)
    } catch {
      setItems([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, tab, user, selectedBranch])

  useEffect(() => { load() }, [load])

  const loadBranches = async () => {
    try {
      const res = await getBranches()
      setBranches(res.data ?? res ?? [])
    } catch { /* ignore */ }
  }

  const handleOpenCreate = () => {
    setShowCreate(true)
    setProductSearch('')
    setProducts([])
    setTransferItems([])
    setToBranch('')
    setNotes('')
    loadBranches()
  }

  const handleProductSearch = async () => {
    if (!productSearch.trim()) return
    try {
      const res = await searchProducts({ q: productSearch.trim(), limit: 10 })
      setProducts(res.products ?? [])
    } catch { /* ignore */ }
  }

  const handleAddProduct = async (product: Product) => {
    if (transferItems.some(item => item.product.product_id === product.product_id)) {
      toast('Product already added', 'warning')
      return
    }
    setAddingProduct(true)
    let availableStock = 0
    try {
      if (fromBranch) {
        const res = await getInventory({ productId: product.product_id, branchId: fromBranch, limit: 1 })
        const stockItems = res.data ?? []
        availableStock = stockItems.length > 0 ? Number(stockItems[0].quantity_on_hand || 0) : 0
      }
    } catch { /* use 0 */ }
    setTransferItems(prev => [...prev, { product, quantity: '1', availableStock }])
    setProductSearch('')
    setProducts([])
    setAddingProduct(false)
  }

  const handleRemoveProduct = (productId: string) => {
    setTransferItems(prev => prev.filter(item => item.product.product_id !== productId))
  }

  const handleItemQuantityChange = (productId: string, value: string) => {
    setTransferItems(prev => prev.map(item =>
      item.product.product_id === productId ? { ...item, quantity: value } : item
    ))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (transferItems.length === 0) { toast('Add at least one product', 'warning'); return }
    if (!toBranch) { toast('Select destination branch', 'warning'); return }
    if (fromBranch === toBranch) { toast('Source and destination must be different', 'warning'); return }

    for (const item of transferItems) {
      const qty = Number(item.quantity)
      if (!qty || qty <= 0) { toast(`Invalid quantity for "${item.product.product_name}"`, 'warning'); return }
      if (qty > item.availableStock) { toast(`Quantity for "${item.product.product_name}" exceeds available stock (${item.availableStock})`, 'warning'); return }
    }

    setSubmitting(true)
    let created = 0
    let errors = 0
    for (const item of transferItems) {
      try {
        await createInventoryTransfer({
          product_id: item.product.product_id,
          from_branch_id: fromBranch,
          to_branch_id: toBranch,
          quantity: Number(item.quantity),
          notes: notes || undefined,
        })
        created++
      } catch {
        errors++
      }
    }
    if (created > 0) {
      toast(`${created} transfer(s) created${errors > 0 ? ` (${errors} failed)` : ''}`, created > 0 && errors === 0 ? 'success' : 'warning')
      setShowCreate(false)
      load()
    } else {
      toast('Failed to create transfers', 'error')
    }
    setSubmitting(false)
  }

  const handleApprove = (id: string) => setConfirmAction({ type: 'approve', transferId: id })
  const handleShip = (id: string) => setConfirmAction({ type: 'ship', transferId: id })
  const handleReceive = (id: string) => setConfirmAction({ type: 'receive', transferId: id })
  const handleReject = (id: string) => setConfirmAction({ type: 'reject', transferId: id })

  async function executeAction() {
    if (!confirmAction) return
    const { type, transferId } = confirmAction
    setConfirmAction(null)
    try {
      if (type === 'approve') await approveInventoryTransfer(transferId)
      else if (type === 'ship') await shipInventoryTransfer(transferId)
      else if (type === 'receive') await receiveInventoryTransfer(transferId)
      else if (type === 'reject') await rejectInventoryTransfer(transferId)
      toast(`Transfer ${type === 'approve' ? 'approved' : type === 'ship' ? 'shipped' : type === 'receive' ? 'received' : 'rejected'}`, 'success')
      load()
    } catch (err: any) {
      toast(err.response?.data?.message || `Failed to ${type} transfer`, 'error')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All Transfers' },
    { key: 'pending', label: 'Pending Approval' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'received', label: 'Received' },
    { key: 'mine', label: 'My Requests' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h1>Inventory Transfers</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              className={`btn ${tab === t.key ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => { setTab(t.key); setPage(1) }}
            >
              {t.label}
            </button>
          ))}
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
            <button className="btn btn--primary" onClick={handleOpenCreate} style={{ marginLeft: 'auto' }}>
              New Transfer
            </button>
          )}
        </div>
      </div>

      <div className="glass-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transfer #</th>
                <th>Product</th>
                <th>From</th>
                <th>To</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th>Status</th>
                <th>Requested By</th>
                <th>Approved By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading">
                  <td colSpan={10}>
                    <div className="empty-state">
                      <div className="skeleton skeleton--row" />
                      <div className="skeleton skeleton--row" />
                      <div className="skeleton skeleton--row" />
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr key="empty">
                  <td colSpan={10}>
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                        <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <p>No transfers found.</p>
                    </div>
                  </td>
                </tr>
              ) : items.map((t) => (
                <tr key={t.transfer_id}>
                  <td style={{ fontWeight: 500, fontFamily: 'monospace' }}>{t.transfer_number || t.transfer_id.slice(0, 8)}</td>
                  <td>{t.product_name || t.product_id}</td>
                  <td>{t.from_branch_name || t.from_branch_id}</td>
                  <td>{t.to_branch_name || t.to_branch_id}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(t.quantity)}</td>
                  <td>
                    <span className={`badge badge--${STATUS_VARIANTS[t.status] || 'info'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>{t.requested_by_name || '-'}</td>
                  <td>{t.approved_by_name || '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(t.requested_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn--ghost" style={{ fontSize: 'var(--text-caption)', padding: '4px 8px' }} onClick={() => setViewTransfer(t)}>
                        View
                      </button>
                      {canManage && t.status === 'PENDING' && t.to_branch_id === selectedBranch?.branch_id && t.requested_by !== user?.userId && (
                        <>
                          <button className="btn btn--primary" style={{ fontSize: 'var(--text-caption)', padding: '4px 8px' }} onClick={() => handleApprove(t.transfer_id)}>
                            Approve
                          </button>
                          <button className="btn btn--danger" style={{ fontSize: 'var(--text-caption)', padding: '4px 8px' }} onClick={() => handleReject(t.transfer_id)}>
                            Reject
                          </button>
                        </>
                      )}
                      {canManage && t.status === 'APPROVED' && t.from_branch_id === selectedBranch?.branch_id && (
                        <button className="btn btn--primary" style={{ fontSize: 'var(--text-caption)', padding: '4px 8px' }} onClick={() => handleShip(t.transfer_id)}>
                          Ship
                        </button>
                      )}
                      {canManage && t.status === 'SHIPPED' && t.to_branch_id === selectedBranch?.branch_id && (
                        <button className="btn btn--primary" style={{ fontSize: 'var(--text-caption)', padding: '4px 8px' }} onClick={() => handleReceive(t.transfer_id)}>
                          Receive
                        </button>
                      )}
                    </div>
                  </td>
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

      {showCreate && (
        <div className="modal-overlay" onClick={() => !submitting && setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <h3>New Transfer Request</h3>
            <form onSubmit={handleCreate}>
              <div className="field">
                <span>From Branch</span>
                <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, fontSize: 'var(--text-body)' }}>
                  <strong>{selectedBranch?.branch_name || 'No branch selected'}</strong>
                </div>
              </div>

              <div className="field">
                <span>To Branch *</span>
                <select value={toBranch} onChange={(e) => setToBranch(e.target.value)} required>
                  <option value="">-- Select destination --</option>
                  {branches.filter(b => b.branch_id !== fromBranch).map(b => (
                    <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <span>Add Products *</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by name, SKU, or barcode"
                    data-scan="true"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleProductSearch() } }}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn--ghost" onClick={handleProductSearch} disabled={addingProduct}>
                    {addingProduct ? 'Loading...' : 'Search'}
                  </button>
                </div>
                {products.length > 0 && (
                  <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 6, maxHeight: 150, overflow: 'auto' }}>
                    {products.map(p => (
                      <div
                        key={p.product_id}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onClick={() => handleAddProduct(p)}
                      >
                        <div>
                          <strong style={{ fontSize: 'var(--text-body)' }}>{p.product_name}</strong>
                          <span style={{ color: 'var(--text-secondary)', marginLeft: 8, fontSize: 'var(--text-caption)' }}>{p.sku}</span>
                        </div>
                        <button type="button" className="btn btn--ghost" style={{ fontSize: 'var(--text-caption)', padding: '2px 8px' }}>+ Add</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {transferItems.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                    {transferItems.length} product(s) selected
                  </span>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th style={{ textAlign: 'right' }}>Available</th>
                          <th style={{ textAlign: 'right', width: 100 }}>Qty</th>
                          <th style={{ width: 50 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {transferItems.map(item => (
                          <tr key={item.product.product_id}>
                            <td>
                              <span style={{ fontWeight: 500 }}>{item.product.product_name}</span>
                              <span style={{ color: 'var(--text-secondary)', marginLeft: 6, fontSize: 'var(--text-caption)' }}>{item.product.sku}</span>
                            </td>
                            <td style={{ textAlign: 'right', color: item.availableStock <= 0 ? 'var(--error)' : 'var(--text-secondary)' }}>
                              {item.availableStock}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <input
                                type="number"
                                min="1"
                                max={item.availableStock}
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => handleItemQuantityChange(item.product.product_id, e.target.value)}
                                style={{ width: 80, textAlign: 'right', padding: '4px 8px' }}
                              />
                            </td>
                            <td>
                              <button type="button" className="btn btn--ghost" style={{ fontSize: 'var(--text-caption)', padding: '2px 6px', color: 'var(--error)' }} onClick={() => handleRemoveProduct(item.product.product_id)}>
                                &times;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="field">
                <span>Notes (optional)</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for transfer" rows={2} style={{ resize: 'vertical' }} />
              </div>

              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setShowCreate(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={submitting || transferItems.length === 0}>
                  {submitting ? 'Creating...' : `Create ${transferItems.length} Transfer(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewTransfer && (() => {
        const t = viewTransfer
        const isRejected = t.status === 'REJECTED'
        const stepApproved = ['APPROVED', 'SHIPPED', 'RECEIVED'].includes(t.status) || isRejected
        const stepShipped = ['SHIPPED', 'RECEIVED'].includes(t.status)
        const stepReceived = t.status === 'RECEIVED'
        const activeStep = isRejected ? -1 : stepReceived ? 3 : stepShipped ? 2 : stepApproved ? 1 : 0

        const steps = [
          { label: 'Requested', person: t.requested_by_name, date: t.requested_at, done: true },
          { label: 'Approved', person: t.approved_by_name, date: t.approved_at, done: stepApproved && !isRejected },
          { label: 'Shipped', person: t.shipped_by_name, date: t.shipped_at, done: stepShipped },
          { label: 'Received', person: t.received_by_name, date: t.received_at, done: stepReceived },
        ]

        function fmtDate(iso: string | null | undefined) {
          if (!iso) return null
          try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return null }
        }
        function fmtTime(iso: string | null | undefined) {
          if (!iso) return null
          try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) } catch { return null }
        }

        return (
          <div className="modal-overlay" onClick={() => setViewTransfer(null)}>
            <div className="modal" onClick={(e => e.stopPropagation())} style={{ maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-h4)' }}>{t.transfer_number || 'Transfer'}</h3>
                  <span className={`badge badge--${STATUS_VARIANTS[t.status] || 'info'}`}>{t.status}</span>
                </div>
                <button type="button" onClick={() => setViewTransfer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, lineHeight: 1 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Action Buttons */}
              {canManage && (
                <div style={{ display: 'flex', gap: 8, padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
                  {t.status === 'PENDING' && t.to_branch_id === selectedBranch?.branch_id && t.requested_by !== user?.userId && (
                    <>
                      <button type="button" className="btn btn--primary" style={{ fontSize: 13 }} onClick={() => { setViewTransfer(null); handleApprove(t.transfer_id) }}>Approve</button>
                      <button type="button" className="btn btn--danger" style={{ fontSize: 13 }} onClick={() => { setViewTransfer(null); handleReject(t.transfer_id) }}>Reject</button>
                    </>
                  )}
                  {t.status === 'APPROVED' && t.from_branch_id === selectedBranch?.branch_id && (
                    <button type="button" className="btn btn--primary" style={{ fontSize: 13 }} onClick={() => { setViewTransfer(null); handleShip(t.transfer_id) }}>Ship</button>
                  )}
                  {t.status === 'SHIPPED' && t.to_branch_id === selectedBranch?.branch_id && (
                    <button type="button" className="btn btn--primary" style={{ fontSize: 13 }} onClick={() => { setViewTransfer(null); handleReceive(t.transfer_id) }}>Receive</button>
                  )}
                  {t.status === 'PENDING' || t.status === 'APPROVED' || t.status === 'SHIPPED' || t.status === 'RECEIVED' || t.status === 'REJECTED' ? null : null}
                </div>
              )}

              {/* Scrollable content */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: 'var(--space-5)' }}>

                {/* Product Summary Card */}
                <div style={{ background: 'var(--bg-secondary, var(--bg))', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{t.product_name || 'Product'}</div>
                      {t.sku && <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t.sku}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{Number(t.quantity)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Units</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-primary)' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', fontWeight: 500 }}>{t.from_branch_name || 'Source'}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" width="18" height="18" style={{ flexShrink: 0 }}><path d="M5 12h14m-4-4l4 4-4 4" /></svg>
                    <span style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', fontWeight: 500 }}>{t.to_branch_name || 'Destination'}</span>
                  </div>
                </div>

                {/* Progress Timeline */}
                <div style={{ background: 'var(--bg-secondary, var(--bg))', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Progress</div>
                  {isRejected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" width="18" height="18"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--danger)', fontSize: 14 }}>Transfer Rejected</div>
                        {t.approved_by_name && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>by {t.approved_by_name} {t.approved_at ? `· ${fmtDate(t.approved_at)} ${fmtTime(t.approved_at)}` : ''}</div>}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                      {steps.map((step, i) => {
                        const isDone = step.done
                        const isActive = i === activeStep
                        return (
                          <div key={step.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                            {/* Connector line */}
                            {i > 0 && (
                              <div style={{ position: 'absolute', top: 14, right: '50%', width: '100%', height: 2, background: steps[i - 1].done && isDone ? 'var(--success, #16a34a)' : 'var(--border)', zIndex: 0 }} />
                            )}
                            {/* Circle */}
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', zIndex: 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: isDone ? 'var(--success, #16a34a)' : isActive ? 'var(--primary)' : 'var(--bg)',
                              border: isDone ? 'none' : isActive ? '2px solid var(--primary)' : '2px solid var(--border)',
                              transition: 'all 0.2s',
                            }}>
                              {isDone ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" width="14" height="14"><path d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? '#fff' : 'var(--border)' }} />
                              )}
                            </div>
                            {/* Label */}
                            <div style={{ marginTop: 8, textAlign: 'center' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: isDone ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{step.label}</div>
                              {step.person && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, maxWidth: 90 }}>{step.person}</div>}
                              {step.date && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fmtDate(step.date)}</div>}
                              {step.date && fmtTime(step.date) && <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{fmtTime(step.date)}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {t.notes && (
                  <div style={{ background: 'var(--bg-secondary, var(--bg))', borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Notes</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{t.notes}</div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <button type="button" className="btn btn--ghost" onClick={() => setViewTransfer(null)}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.type === 'approve' ? 'Approve Transfer' : confirmAction?.type === 'ship' ? 'Ship Transfer' : confirmAction?.type === 'receive' ? 'Receive Transfer' : 'Reject Transfer'}
        message={
          confirmAction?.type === 'approve' ? 'Approve this transfer?' :
          confirmAction?.type === 'ship' ? 'Ship this transfer? Stock will be deducted from the source branch.' :
          confirmAction?.type === 'receive' ? 'Receive this transfer? Stock will be added to the destination branch.' :
          'Reject this transfer?'
        }
        confirmLabel={confirmAction?.type === 'approve' ? 'Approve' : confirmAction?.type === 'ship' ? 'Ship' : confirmAction?.type === 'receive' ? 'Receive' : 'Reject'}
        variant={confirmAction?.type === 'reject' ? 'danger' : 'primary'}
        onConfirm={executeAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
