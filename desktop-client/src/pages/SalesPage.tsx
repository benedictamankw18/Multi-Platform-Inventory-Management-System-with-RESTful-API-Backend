import { useEffect, useState, useCallback, useRef } from 'react'
import QRCode from 'qrcode'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getSales, getSaleById, getSaleReceipt, getBusinessSettings,
  resolveImageUrl, voidSale, refundSale, type Sale,
} from '../services/api'

type ReceiptItem = {
  product_name: string
  quantity: number
  unit_price: number
  line_discount: number
  tax_amount: number
  subtotal?: number
  uom_name: string | null
  symbol: string | null
}

type ReceiptData = {
  receipt: { receipt_number: string; printed_at: string }
  sale: Sale & { items: ReceiptItem[]; payments: { payment_method: string; amount: number }[] }
}

type BusinessInfo = {
  business_name?: string
  address?: string
  phone?: string
  tax_number?: string
  registration_number?: string
  receipt_footer?: string
  logo?: string
  currency?: string
}

export default function SalesPage() {
  const { toast } = useToast()
  const { selectedBranch, hasPermission } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const [actionSale, setActionSale] = useState<Sale | null>(null)
  const [actionType, setActionType] = useState<'void' | 'refund' | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [acting, setActing] = useState(false)

  const [viewSale, setViewSale] = useState<Sale | null>(null)
  const [viewItems, setViewItems] = useState<ReceiptItem[]>([])
  const [viewPayments, setViewPayments] = useState<{ payment_method: string; amount: number }[]>([])
  const [viewLoading, setViewLoading] = useState(false)

  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm')
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({})
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit }
      if (search) params.q = search
      if (selectedBranch) params.branchId = selectedBranch.branch_id
      if (statusFilter) params.status = statusFilter
      const res = await getSales(params)
      setSales(res.data ?? [])
      setTotal(res.total ?? 0)
    } catch {
      setSales([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, search, selectedBranch, statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  function formatDate(iso: string) {
    try { return new Date(iso).toLocaleDateString() } catch { return iso }
  }

  function statusColor(status: string) {
    switch (status) {
      case 'COMPLETED': return 'badge--success'
      case 'PARTIALLY_PAID': return 'badge--warning'
      case 'VOID': return 'badge--danger'
      case 'REFUNDED': return 'badge--info'
      case 'PARTIALLY_REFUNDED': return 'badge--warning'
      default: return ''
    }
  }

  function closeAction() {
    setActionSale(null)
    setActionType(null)
    setRefundReason('')
    setRefundAmount('')
  }

  async function handleVoid() {
    if (!actionSale) return
    setActing(true)
    try {
      await voidSale(actionSale.sale_id)
      toast('Sale voided successfully', 'success')
      closeAction()
      load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to void sale'
      toast(msg, 'error')
    }
    setActing(false)
  }

  async function handleRefund() {
    if (!actionSale) return
    setActing(true)
    try {
      await refundSale(actionSale.sale_id, {
        amount: refundAmount ? parseFloat(refundAmount) : undefined,
        reason: refundReason.trim() || undefined,
      })
      toast('Sale refunded successfully', 'success')
      closeAction()
      load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to refund sale'
      toast(msg, 'error')
    }
    setActing(false)
  }

  // ---- View Sale / Items ----

  async function handleViewSale(sale: Sale) {
    setViewLoading(true)
    setViewSale(sale)
    try {
      const [saleDetail, receipt] = await Promise.all([
        getSaleById(sale.sale_id).catch(() => null),
        getSaleReceipt(sale.sale_id).catch(() => null),
      ])
      const items = (saleDetail?.data?.items ?? saleDetail?.items ?? []) as ReceiptItem[]
      const payments = (receipt?.sale?.payments ?? []) as { payment_method: string; amount: number }[]
      setViewItems(items)
      setViewPayments(payments)
    } catch {
      setViewItems([])
      setViewPayments([])
    }
    setViewLoading(false)
  }

  // ---- Print Receipt ----

  async function handlePrintReceipt(sale: Sale) {
    setReceiptLoading(true)
    setShowReceipt(true)
    try {
      // const [receipt, settings] = await Promise.all([
      //   getSaleReceipt(sale.sale_id),
      //   getBusinessSettings().catch(() => null),
      // ])
      const saleId = sale?.sale_id
      if (saleId) {
              const [receipt, settings] = await Promise.all([
                getSaleReceipt(saleId).catch(() => null),
                getBusinessSettings().catch(() => null),
        ])

      setReceiptData(receipt)
      const rows = settings?.data ?? settings
      const row = Array.isArray(rows) ? rows[0] : rows
      if (row) setBusinessInfo(row)
      }

    } catch {
      /* receipt load failed */
    }
    setReceiptLoading(false)
  }

  function closeView() {
    setViewSale(null)
    setViewItems([])
    setViewPayments([])
  }

  function closeReceipt() {
    setShowReceipt(false)
    setReceiptData(null)
    setQrDataUrl(null)
  }

  // QR code from receipt data
  useEffect(() => {
    if (!receiptData) { setQrDataUrl(null); return }
    const s = receiptData.sale
    const rn = receiptData.receipt?.receipt_number || ''
    const inv = s?.invoice_number || ''
    const total = Number(s?.total_amount ?? 0)
    const cur = businessInfo.currency || 'GHS'
    const text = `Invoice: ${inv}\nReceipt: ${rn}\nTotal: ${cur} ${total.toFixed(2)}\nDate: ${s?.sale_date || ''}`
    QRCode.toDataURL(text, { width: 200, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null))
  }, [receiptData, businessInfo.currency])

  // ---- Export ----

  async function getExportData(): Promise<Record<string, unknown>[]> {
    try {
      const params: Record<string, unknown> = { page: 1, limit: 10000 }
      if (search) params.q = search
      if (selectedBranch) params.branchId = selectedBranch.branch_id
      if (statusFilter) params.status = statusFilter
      const res = await getSales(params)
      const allSales = res.data ?? []
      return allSales.map((s) => ({
        'Invoice #': s.invoice_number ?? '',
        'Customer': s.customer_name ?? '',
        'Cashier': s.cashier_name ?? '',
        'Date': formatDate(s.sale_date),
        'Type': s.sale_type,
        'Subtotal': Number(s.subtotal).toFixed(2),
        'Tax': Number(s.tax_amount).toFixed(2),
        'Discount': Number(s.discount_amount).toFixed(2),
        'Total': Number(s.total_amount).toFixed(2),
        'Paid': Number(s.amount_paid).toFixed(2),
        'Balance': Number(s.balance_due).toFixed(2),
        'Status': s.status,
        'Payment Status': s.payment_status,
        'Refunded': Number(s.refunded_amount).toFixed(2),
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
    XLSX.utils.book_append_sheet(wb, ws, 'Sales')
    XLSX.writeFile(wb, `sales_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
    setShowExportMenu(false)
    toast(`${data.length} sales exported as XLSX`, 'success')
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
    a.download = `sales_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
    toast(`${data.length} sales exported as CSV`, 'success')
  }

  async function exportPDF() {
    const data = await getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const headers = Object.keys(data[0])
    const rows = data.map((r) => headers.map((h) => String(r[h] ?? '')))
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFontSize(10)
    doc.text('Sales Export', 14, 12)
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 18,
      styles: { fontSize: 5 },
      headStyles: { fillColor: [37, 99, 235] },
    })
    doc.save(`sales_export_${new Date().toISOString().slice(0, 10)}.pdf`)
    setShowExportMenu(false)
    toast(`${data.length} sales exported as PDF`, 'success')
  }

  return (
    <>
      <div className="page">
      <div className="page-header">
        <div>
          <h1>Sales</h1>
          <p className="page-subtitle">{total} sale{total !== 1 ? 's' : ''} total</p>
        </div>
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
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input" style={{ flex: 1, marginBottom: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input type="text" placeholder="Search by invoice #, customer, or cashier..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} style={{ padding: '8px 12px', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="VOID">Void</option>
            <option value="REFUNDED">Refunded</option>
            <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th>Status</th>
                <th>Payment</th>
                <th style={{ textAlign: 'right' }}>Refunded</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading"><td colSpan={11}><div className="empty-state"><div className="skeleton skeleton--row" /></div></td></tr>
              ) : sales.length === 0 ? (
                <tr key="empty"><td colSpan={11}><div className="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.35, marginBottom: 8 }}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14l2 2 4-4" /></svg><p>No sales found.</p></div></td></tr>
              ) : sales.map((s) => (
                <tr key={s.sale_id}>
                  <td><strong>{s.invoice_number ?? '—'}</strong></td>
                  <td>{s.customer_name || 'Walk-in'}</td>
                  <td style={{ fontSize: 13 }}>{formatDate(s.sale_date)}</td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.sale_type}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{Number(s.total_amount).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{Number(s.amount_paid).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', color: Number(s.balance_due) > 0 ? 'var(--danger)' : undefined }}>{Number(s.balance_due).toFixed(2)}</td>
                  <td><span className={`badge ${statusColor(s.status)}`}>{s.status}</span></td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.payment_status}</span></td>
                  <td style={{ textAlign: 'right', color: Number(s.refunded_amount) > 0 ? '#d97706' : undefined }}>{Number(s.refunded_amount).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button type="button" title="View sale details" onClick={() => handleViewSale(s)}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', marginRight: 4 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                    <button type="button" title="View items" onClick={() => handleViewSale(s)}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', marginRight: 4 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                    </button>
                    <button type="button" title="Print receipt" onClick={() => handlePrintReceipt(s)}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', marginRight: 4 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                    </button>
                    {s.status !== 'VOID' && s.status !== 'REFUNDED' && (
                      <>
                        {hasPermission('VOID_SALE') && (
                        <button type="button" onClick={() => { setActionSale(s); setActionType('void') }}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--danger)', fontSize: 12, cursor: 'pointer', marginRight: 4 }}>Void</button>
                        )}
                        <button type="button" onClick={() => { setActionSale(s); setActionType('refund') }}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: '#d97706', fontSize: 12, cursor: 'pointer' }}>Refund</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ color: 'var(--secondary)', fontSize: 'var(--text-caption)' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button type="button" className="btn btn--ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {actionSale && actionType && (
        <div className="modal-overlay" onClick={closeAction}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 8px' }}>{actionType === 'void' ? 'Void Sale' : 'Refund Sale'}</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px', fontSize: 14 }}>
              Invoice: <strong>{actionSale.invoice_number ?? '—'}</strong><br />
              Total: <strong>{Number(actionSale.total_amount).toFixed(2)}</strong>
            </p>
            {actionType === 'refund' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Refund Amount (max: {Number(actionSale.total_amount - (actionSale.refunded_amount || 0)).toFixed(2)})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={String(Number(actionSale.total_amount).toFixed(2))}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 14 }}
                  />
                </div>
                <textarea
                  placeholder="Reason for refund (optional)"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', marginBottom: 16, resize: 'vertical', fontSize: 14 }}
                />
              </>
            )}
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
              {actionType === 'void'
                ? 'This will void the sale and restore inventory. This action cannot be undone.'
                : 'This will refund the sale and restore inventory. This action cannot be undone.'}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeAction} className="btn btn--ghost" disabled={acting}>Cancel</button>
              <button type="button" onClick={actionType === 'void' ? handleVoid : handleRefund} disabled={acting} className="btn btn--danger">
                {acting ? 'Processing...' : actionType === 'void' ? 'Void Sale' : 'Refund Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewSale && (
        <div className="modal-overlay" onClick={closeView}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 750, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ margin: 0 }}>Sale Details</h3>
                <span className={`badge ${statusColor(viewSale.status)}`}>{viewSale.status}</span>
              </div>
              <button type="button" onClick={closeView}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, lineHeight: 1 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexShrink: 0, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => { closeView(); handlePrintReceipt(viewSale) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                Print Receipt
              </button>
              {viewSale.status !== 'VOID' && viewSale.status !== 'REFUNDED' && (
                <>
                  {hasPermission('VOID_SALE') && (
                  <button type="button" onClick={() => { closeView(); setActionSale(viewSale); setActionType('void') }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: 'var(--danger)', fontSize: 13, cursor: 'pointer' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                    Void
                  </button>
                  )}
                  <button type="button" onClick={() => { closeView(); setActionSale(viewSale); setActionType('refund') }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(217,119,6,0.3)', background: 'transparent', color: '#d97706', fontSize: 13, cursor: 'pointer' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></svg>
                    Refund
                  </button>
                </>
              )}
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Sale Info Card */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{viewSale.invoice_number ?? '—'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{formatDate(viewSale.sale_date)}</div>
                  </div>
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {viewSale.sale_type}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px 16px', fontSize: 13 }}>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Customer</span><div style={{ fontWeight: 500, marginTop: 2 }}>{viewSale.customer_name || 'Walk-in'}</div></div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Cashier</span><div style={{ fontWeight: 500, marginTop: 2 }}>{viewSale.cashier_name || '—'}</div></div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Payment</span><div style={{ fontWeight: 500, marginTop: 2 }}>{viewSale.payment_status}</div></div>
                </div>
              </div>

              {/* Financial Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)' }}>
                  <div style={{ fontSize: 11, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>Total</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{Number(viewSale.total_amount).toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Sub {Number(viewSale.subtotal).toFixed(2)} · Tax {Number(viewSale.tax_amount).toFixed(2)}
                    {Number(viewSale.discount_amount) > 0 && ` · Disc -${Number(viewSale.discount_amount).toFixed(2)}`}
                  </div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 8, background: Number(viewSale.balance_due) > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${Number(viewSale.balance_due) > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)'}` }}>
                  <div style={{ fontSize: 11, color: Number(viewSale.balance_due) > 0 ? '#d97706' : '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>Paid</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{Number(viewSale.amount_paid).toFixed(2)}</div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 8, background: Number(viewSale.balance_due) > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${Number(viewSale.balance_due) > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'}` }}>
                  <div style={{ fontSize: 11, color: Number(viewSale.balance_due) > 0 ? 'var(--danger)' : '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>{Number(viewSale.balance_due) > 0 ? 'Balance Due' : 'Settled'}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: Number(viewSale.balance_due) > 0 ? 'var(--danger)' : '#16a34a' }}>{Number(viewSale.balance_due).toFixed(2)}</div>
                </div>
                {Number(viewSale.refunded_amount) > 0 && (
                  <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.15)' }}>
                    <div style={{ fontSize: 11, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>Refunded</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#d97706' }}>{Number(viewSale.refunded_amount).toFixed(2)}</div>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Items</div>
                <div style={{ maxHeight: 280, overflow: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <table className="data-table" style={{ fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th>UoM</th>
                        <th style={{ textAlign: 'right' }}>Price</th>
                        <th style={{ textAlign: 'right' }}>Discount</th>
                        <th style={{ textAlign: 'right' }}>Tax</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewLoading ? (
                        <tr key="loading-items"><td colSpan={7}><div className="skeleton skeleton--row" /></td></tr>
                      ) : viewItems.length === 0 ? (
                        <tr key="empty-items"><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>No items found</td></tr>
                      ) : viewItems.map((item, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                          <td style={{ textAlign: 'right' }}>{Number(item.quantity)}</td>
                          <td>{item.symbol || item.uom_name || '—'}</td>
                          <td style={{ textAlign: 'right' }}>{Number(item.unit_price).toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>{Number(item.line_discount || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>{Number(item.tax_amount || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {Number(item.subtotal ?? (Number(item.quantity) * Number(item.unit_price) - Number(item.line_discount || 0) + Number(item.tax_amount || 0))).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments Section */}
              {viewPayments.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Payments</div>
                  <div style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                    {viewPayments.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: i % 2 === 0 ? 'var(--bg-secondary)' : 'transparent', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                          <span style={{ color: 'var(--text-secondary)' }}>{p.payment_method}</span>
                        </div>
                        <span style={{ fontWeight: 600 }}>{Number(p.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {showReceipt && (
        <div className="modal-overlay" onClick={closeReceipt}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Print Receipt</h3>
              <button type="button" onClick={closeReceipt} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 20 }}>✕</button>
            </div>

            {receiptLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading receipt...</div>
            ) : !receiptData ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Failed to load receipt</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
                  {(['80mm', '58mm'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setPaperSize(s)}
                      style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
                        background: paperSize === s ? 'var(--primary)' : 'transparent',
                        color: paperSize === s ? '#fff' : 'var(--text)', fontSize: 12, cursor: 'pointer' }}>{s}</button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={closeReceipt}>Close</button>
                  <button type="button" className="btn btn--primary" style={{ flex: 1 }} onClick={() => window.print()}>Print</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      </div>

      <div id="receipt-print">
        <div className={`receipt receipt-${paperSize === '58mm' ? '58' : '80'}`}>
          <div className="receipt-header">
            {businessInfo.logo && (
              <img src={resolveImageUrl(businessInfo.logo) ?? undefined} alt="" className="receipt-logo" />
            )}
            <div className="receipt-business-name">{businessInfo.business_name || 'Your Store'}</div>
            {businessInfo.address && <div className="receipt-meta">{businessInfo.address}</div>}
            {businessInfo.phone && <div className="receipt-meta">{businessInfo.phone}</div>}
            {businessInfo.tax_number && <div className="receipt-meta">TIN: {businessInfo.tax_number}</div>}
            {businessInfo.registration_number && <div className="receipt-meta">Reg: {businessInfo.registration_number}</div>}
          </div>

          <div className="receipt-section">
            <div className="receipt-row"><span>Invoice</span><span>{receiptData?.sale?.invoice_number ?? '—'}</span></div>
            {receiptData?.receipt?.receipt_number && (
              <div className="receipt-row"><span>Receipt</span><span>{receiptData.receipt.receipt_number}</span></div>
            )}
            <div className="receipt-row"><span>Date</span><span>{receiptData?.sale?.sale_date ? new Date(receiptData.sale.sale_date).toLocaleString() : '—'}</span></div>
            {receiptData?.sale?.cashier_name && (
              <div className="receipt-row"><span>Cashier</span><span>{receiptData.sale.cashier_name}</span></div>
            )}
            {receiptData?.sale?.customer_name && (
              <div className="receipt-row"><span>Customer</span><span>{receiptData.sale.customer_name}</span></div>
            )}
            {receiptData?.sale?.payment_status && (
              <div className="receipt-row"><span>Payment</span><span>{receiptData.sale.payment_status}</span></div>
            )}
          </div>

          <div className="receipt-section receipt-items-section">
            {paperSize === '58mm' ? (
              (receiptData?.sale?.items ?? []).map((item, i) => {
                const lt = Number(item.quantity) * Number(item.unit_price) - Number(item.line_discount || 0) + Number(item.tax_amount || 0)
                return (
                  <div className="receipt-item" key={i}>
                    <div className="receipt-item-name">{item.product_name}</div>
                    <div className="receipt-item-line">
                      <span>{Number(item.quantity)} {item.symbol || item.uom_name || ''} x {(businessInfo.currency || 'GHS') + ' ' + Number(item.unit_price).toFixed(2)}</span>
                      <span>{(businessInfo.currency || 'GHS') + ' ' + lt.toFixed(2)}</span>
                    </div>
                  </div>
                )
              })
            ) : (
              <table className="receipt-items">
                <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>UoM</th><th>Total</th></tr></thead>
                <tbody>
                  {(receiptData?.sale?.items ?? []).map((item, i) => {
                    const lt = Number(item.quantity) * Number(item.unit_price) - Number(item.line_discount || 0) + Number(item.tax_amount || 0)
                    return (
                      <tr key={i}>
                        <td>{item.product_name}</td>
                        <td>{Number(item.quantity)}</td>
                        <td>{(businessInfo.currency || 'GHS') + ' ' + Number(item.unit_price).toFixed(2)}</td>
                        <td>{item.symbol || item.uom_name || ''}</td>
                        <td>{(businessInfo.currency || 'GHS') + ' ' + lt.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="receipt-section receipt-totals">
            <div className="receipt-row"><span>Subtotal</span><span>{(businessInfo.currency || 'GHS') + ' ' + Number(receiptData?.sale?.subtotal ?? 0).toFixed(2)}</span></div>
            {Number(receiptData?.sale?.discount_amount ?? 0) > 0 && (
              <div className="receipt-row r-discount"><span>Discount</span><span>-{(businessInfo.currency || 'GHS') + ' ' + Number(receiptData?.sale?.discount_amount ?? 0).toFixed(2)}</span></div>
            )}
            {Number(receiptData?.sale?.tax_amount ?? 0) > 0 && (
              <div className="receipt-row"><span>Tax</span><span>{(businessInfo.currency || 'GHS') + ' ' + Number(receiptData?.sale?.tax_amount ?? 0).toFixed(2)}</span></div>
            )}
            <div className="receipt-row receipt-total-row"><span>TOTAL</span><span>{(businessInfo.currency || 'GHS') + ' ' + Number(receiptData?.sale?.total_amount ?? 0).toFixed(2)}</span></div>
            {Number(receiptData?.sale?.refunded_amount ?? 0) > 0 && (
              <div className="receipt-row" style={{ color: '#000000' }}><span>Refunded</span><span>{(businessInfo.currency || 'GHS') + ' ' + Number(receiptData?.sale?.refunded_amount ?? 0).toFixed(2)}</span></div>
            )}
          </div>

          <div className="receipt-section receipt-payment">
            {(receiptData?.sale?.payments ?? []).map((p, i) => (
              <div className="receipt-row" key={i}><span>{p.payment_method}</span><span>{(businessInfo.currency || 'GHS') + ' ' + Number(p.amount).toFixed(2)}</span></div>
            ))}
            <div className="receipt-row" style={{ fontWeight: 600, borderTop: '1px dashed #888', paddingTop: 4, marginTop: 4 }}>
              <span>Total Paid</span>
              <span>{(businessInfo.currency || 'GHS') + ' ' + (receiptData?.sale?.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}</span>
            </div>
            {Number(receiptData?.sale?.balance_due ?? 0) > 0 && (
              <div className="receipt-row r-remain"><span>Balance Due</span><span>{(businessInfo.currency || 'GHS') + ' ' + Number(receiptData?.sale?.balance_due ?? 0).toFixed(2)}</span></div>
            )}
          </div>

          {qrDataUrl && (
            <div className="receipt-barcode">
              <img src={qrDataUrl} style={{ width: paperSize === '58mm' ? 80 : 120, height: 'auto' }} />
            </div>
          )}

          {businessInfo.receipt_footer && (
            <div className="receipt-footer">{businessInfo.receipt_footer || 'Thank you for your business!'}</div>
          )}
        </div>
      </div>
    </>
  )
}
