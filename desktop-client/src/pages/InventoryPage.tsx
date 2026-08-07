import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getInventory,
  searchProducts,
  getBranches,
  createInventoryEntry,
  resolveImageUrl,
  type InventoryItem,
  type Product,
  type BranchInfo,
} from '../services/api'

type ModalMode = 'import' | null

const TEMPLATE_HEADERS = ['Product SKU', 'Quantity on Hand', 'Reorder Level', 'Branch']

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function normalizeHeader(name: string): string {
  const lower = name.trim().toLowerCase()
  const map: Record<string, string> = {
    'product sku': 'Product SKU', sku: 'Product SKU', 'product id': 'Product SKU', product: 'Product SKU',
    'quantity on hand': 'Quantity on Hand', quantity: 'Quantity on Hand', qty: 'Quantity on Hand',
    'reorder level': 'Reorder Level', reorder: 'Reorder Level', 'reorder_level': 'Reorder Level',
    branch: 'Branch', 'branch name': 'Branch', 'branch_name': 'Branch',
  }
  return map[lower] || name.trim()
}

export default function InventoryPage() {
  const { toast } = useToast()
  const { selectedBranch } = useAuth()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [allBranches, setAllBranches] = useState<BranchInfo[]>([])

  const [modal, setModal] = useState<ModalMode>(null)
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)
  const [importFailures, setImportFailures] = useState<{ row: number; sku: string; reason: string }[]>([])
  const [importDone, setImportDone] = useState(0)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const [showImportMenu, setShowImportMenu] = useState(false)
  const importMenuRef = useRef<HTMLDivElement>(null)

  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { page, limit }
      if (search) body.q = search
      if (selectedBranch) body.branch_id = selectedBranch.branch_id
      const res = await getInventory(body)
      setItems(res.data ?? [])
      setTotal(res.total ?? 0)
    } catch {
      setItems([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, search, selectedBranch])

  const loadAll = useCallback(async () => {
    try {
      const [prodRes, branchRes] = await Promise.all([
        searchProducts({ limit: 1000 }),
        getBranches(),
      ])
      setAllProducts(prodRes?.products ?? [])
      const bData = Array.isArray(branchRes) ? branchRes : branchRes?.branches ?? branchRes?.data ?? []
      setAllBranches(bData)
    } catch {
      setAllProducts([])
      setAllBranches([])
    }
  }, [])

  useEffect(() => { load(); loadAll() }, [load, loadAll])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false)
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) setShowImportMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  // ---- Import ----

  async function handleFileImport(file: File) {
    setImportFileName(file.name)
    try {
      const buf = await readFileAsArrayBuffer(file)
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (!raw.length) {
        toast('File is empty', 'error')
        return
      }
      const normalized = raw.map((row) => {
        const out: Record<string, unknown> = {}
        for (const key of Object.keys(row)) {
          out[normalizeHeader(key)] = row[key]
        }
        return out
      })
      setImportRows(normalized)
      setImportFailures([])
      setImportDone(0)
      setModal('import')
    } catch {
      toast('Failed to parse file. Use XLSX or CSV.', 'error')
    }
  }

  async function confirmImport() {
    setImporting(true)
    setImportProgress({ done: 0, total: importRows.length })
    const failures: { row: number; sku: string; reason: string }[] = []
    let done = 0

    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i]
      const sku = String(row['Product SKU'] ?? '').trim()
      if (!sku) {
        failures.push({ row: i + 2, sku: '(empty)', reason: 'Product SKU is required' })
        done++
        setImportProgress({ done, total: importRows.length })
        continue
      }

      try {
        const product = allProducts.find((p) => p.sku.toLowerCase() === sku.toLowerCase())
        if (!product) {
          failures.push({ row: i + 2, sku, reason: `Product with SKU "${sku}" not found` })
          done++
          setImportProgress({ done, total: importRows.length })
          continue
        }

        const branchName = String(row['Branch'] ?? '').trim()
        let branchId = selectedBranch?.branch_id
        if (branchName) {
          const branch = allBranches.find((b) => b.branch_name.toLowerCase() === branchName.toLowerCase())
          if (branch) {
            branchId = branch.branch_id
          } else {
            failures.push({ row: i + 2, sku, reason: `Branch "${branchName}" not found` })
            done++
            setImportProgress({ done, total: importRows.length })
            continue
          }
        }
        if (!branchId) {
          failures.push({ row: i + 2, sku, reason: 'No branch specified and no branch selected' })
          done++
          setImportProgress({ done, total: importRows.length })
          continue
        }

        const qty = Number(row['Quantity on Hand'] ?? 0)
        if (isNaN(qty) || qty < 0) {
          failures.push({ row: i + 2, sku, reason: `Invalid quantity: "${row['Quantity on Hand']}"` })
          done++
          setImportProgress({ done, total: importRows.length })
          continue
        }

        await createInventoryEntry({
          product_id: product.product_id,
          branch_id: branchId,
          quantity: qty,
        })
        done++
        setImportDone(done)
      } catch (err: unknown) {
        const msg = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Create failed'
          : 'Create failed'
        failures.push({ row: i + 2, sku, reason: msg })
        done++
      }
      setImportProgress({ done, total: importRows.length })
    }

    setImportFailures(failures)
    setImporting(false)
    setImportProgress(null)
    load()
    toast(`Import complete: ${importRows.length - failures.length} created, ${failures.length} failed`, failures.length ? 'warning' : 'success')
  }

  function downloadTemplate() {
    const example: Record<string, unknown> = {}
    for (const h of TEMPLATE_HEADERS) example[h] = ''
    example['Product SKU'] = 'PRD-001'
    example['Quantity on Hand'] = 100
    example['Reorder Level'] = 10
    example['Branch'] = selectedBranch?.branch_name ?? ''
    const ws = XLSX.utils.json_to_sheet([example])
    XLSX.utils.sheet_add_aoa(ws, [TEMPLATE_HEADERS], { origin: 'A1' })
    XLSX.utils.sheet_add_json(ws, [example], { origin: 'A2', skipHeader: true })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'inventory_import_template.xlsx')
    toast('Template downloaded', 'success')
  }

  // ---- Export ----

  async function getExportData(): Promise<Record<string, unknown>[]> {
    try {
      const body: Record<string, unknown> = { page: 1, limit: 10000 }
      if (search) body.q = search
      if (selectedBranch) body.branch_id = selectedBranch.branch_id
      const res = await getInventory(body)
      const allItems = res.data ?? []
      return allItems.map((item) => ({
        'SKU': item.sku,
        'Product Name': item.product_name,
        'Branch': item.branch_name ?? '',
        'Qty on Hand': item.quantity_on_hand,
        'Available': item.available_quantity,
        'Reserved': item.reserved_quantity,
        'Reorder Level': item.reorder_level,
        'Damaged': item.damaged_quantity,
        'Expired': item.expired_quantity,
        'Status': item.reorder_level >= item.available_quantity ? 'Low Stock' : item.available_quantity > 0 ? 'In Stock' :  'Out of Stock',
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
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory')
    XLSX.writeFile(wb, `inventory_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
    setShowExportMenu(false)
    toast(`${data.length} inventory records exported as XLSX`, 'success')
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
    a.download = `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
    toast(`${data.length} inventory records exported as CSV`, 'success')
  }

  async function exportPDF() {
    const data = await getExportData()
    if (!data.length) { toast('No data to export', 'error'); return }
    const headers = Object.keys(data[0])
    const rows = data.map((r) => headers.map((h) => String(r[h] ?? '')))
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFontSize(10)
    doc.text('Inventory Export', 14, 12)
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 18,
      styles: { fontSize: 6 },
      headStyles: { fillColor: [37, 99, 235] },
    })
    doc.save(`inventory_export_${new Date().toISOString().slice(0, 10)}.pdf`)
    setShowExportMenu(false)
    toast(`${data.length} inventory records exported as PDF`, 'success')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p className="page-subtitle">{total} record{total !== 1 ? 's' : ''} total</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div ref={importMenuRef} style={{ position: 'relative' }}>
            <button type="button" className="btn btn--ghost" onClick={() => setShowImportMenu(!showImportMenu)}>Import</button>
            {showImportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-lg)', zIndex: 20, minWidth: 180, overflow: 'hidden' }}>
                <label style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
                  Import XLSX / CSV
                  <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setShowImportMenu(false); handleFileImport(f) }; e.target.value = '' }} />
                </label>
              </div>
            )}
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
                <div style={{ borderTop: '1px solid var(--border)' }} />
                <button type="button" style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-4)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-body)', color: 'var(--text-primary)', alignItems: 'center' }} onClick={() => { downloadTemplate(); setShowExportMenu(false) }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Download Template
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div className="search-input" style={{ marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" data-scan="true" placeholder="Search by product name, SKU, or barcode..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product</th>
                <th>Branch</th>
                <th style={{ textAlign: 'right' }}>On Hand</th>
                <th style={{ textAlign: 'right' }}>Available</th>
                <th style={{ textAlign: 'right' }}>Reserved</th>
                <th style={{ textAlign: 'right' }}>Reorder</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading"><td colSpan={8}><div className="empty-state"><div className="skeleton skeleton--row" /></div></td></tr>
              ) : items.length === 0 ? (
                <tr key="empty"><td colSpan={8}><div className="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.35, marginBottom: 8 }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12h6m-3-3v6" /><path d="M3 9h18M3 15h18" /></svg><p>No inventory records found.</p></div></td></tr>
              ) : items.map((item) => (
                <tr key={item.inventory_id}>
                  <td>
                    {item.primary_image_url ? (
                      <img src={resolveImageUrl(item.primary_image_url) ?? undefined} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 'var(--radius-button)', border: '1px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-button)', border: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                      </div>
                    )}
                  </td>
                  <td>
                    <div>
                      <div style={{ fontWeight: 500 }}>{item.product_name}</div>
                      <div style={{ fontSize: 'var(--text-caption)', color: 'var(--secondary)' }}>{item.sku}</div>
                    </div>
                  </td>
                  <td>{item.branch_name ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>{Number(item.quantity_on_hand).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{Number(item.available_quantity).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{Number(item.reserved_quantity || 0).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{Number(item.reorder_level).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${item.reorder_level >= item.available_quantity ? 'badge--warning' :item.available_quantity > 0 ? 'badge--success' : 'badge--danger'}`}>
                      {item.reorder_level >= item.available_quantity ? 'Low Stock' : item.available_quantity > 0 ? 'In Stock' :  'Out of Stock'}
                    </span>
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

      {/* ---- Import Modal ---- */}
      {modal === 'import' && (
        <div className="modal-overlay" onClick={() => { if (!importing) setModal(null) }}>
          <div className="modal" style={{ maxWidth: 600, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Import Inventory — {importFileName}</h3>

            {importing ? (
              <div>
                <p style={{ marginBottom: 8, fontSize: 'var(--text-body)' }}>Importing… {importProgress?.done ?? 0} of {importProgress?.total ?? 0}</p>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 999, transition: 'width 0.2s', width: `${importProgress ? (importProgress.done / importProgress.total) * 100 : 0}%` }} />
                </div>
              </div>
            ) : importFailures.length > 0 ? (
              <div>
                <p style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 'var(--text-body)' }}>
                  {importDone - importFailures.length} created, {importFailures.length} failed
                </p>
                <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 12 }}>
                  <table className="data-table" style={{ fontSize: 13 }}>
                    <thead><tr><th>Row</th><th>SKU</th><th>Reason</th></tr></thead>
                    <tbody>
                      {importFailures.map((f, i) => (
                        <tr key={i}><td>{f.row}</td><td>{f.sku}</td><td style={{ color: 'var(--danger)' }}>{f.reason}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn--primary" onClick={() => setModal(null)}>Close</button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 'var(--text-body)' }}>
                  {importRows.length} row{importRows.length !== 1 ? 's' : ''} ready to import. Preview (first 5 rows):
                </p>
                <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 12 }}>
                  <table className="data-table" style={{ fontSize: 13 }}>
                    <thead><tr>{Object.keys(importRows[0] || {}).slice(0, 4).map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {importRows.slice(0, 5).map((row, i) => (
                        <tr key={i}>{Object.values(row).slice(0, 4).map((v, j) => <td key={j}>{String(v ?? '')}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button type="button" className="btn btn--primary" onClick={confirmImport}>Import {importRows.length} Records</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
