import { useEffect, useState, useCallback } from 'react'
import { searchProducts, getPriceHistory } from '../services/api'

interface PriceRecord {
  price_history_id: string
  product_id: string
  product_name: string | null
  image_url: string | null
  old_price: number
  new_price: number
  changed_by: string | null
  changed_by_name: string | null
  created_at: string
}

export default function PriceHistoryPage() {
  const [records, setRecords] = useState<PriceRecord[]>([])
  const [products, setProducts] = useState<Array<{ product_id: string; product_name: string }>>([])
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const limit = 50

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit }
      if (selectedProductId) params.product_id = selectedProductId
      const res = await getPriceHistory(params)
      setRecords(Array.isArray(res?.data) ? res.data : [])
    } catch {
      setRecords([])
    }
    setLoading(false)
  }, [page, selectedProductId])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [selectedProductId])

  const handleProductSearch = useCallback(async (q: string) => {
    setProductSearch(q)
    if (q.trim().length < 2) { setProducts([]); return }
    try {
      const res = await searchProducts({ q, limit: 20 })
      setProducts(res?.products ?? [])
    } catch { setProducts([]) }
  }, [])

  const isLastPage = records.length < limit

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Price History</h1>
          <p className="page-subtitle">Track product price changes over time</p>
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
            <input type="text" className="input" placeholder="Search product..." value={productSearch} onChange={(e) => handleProductSearch(e.target.value)} style={{ width: '100%' }} />
            {products.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                {products.map((p) => (
                  <div key={p.product_id} onClick={() => { setSelectedProductId(p.product_id); setProductSearch(p.product_name); setProducts([]) }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid var(--border)' }}>{p.product_name}</div>
                ))}
              </div>
            )}
          </div>
          {selectedProductId && (
            <button type="button" className="btn btn--ghost" onClick={() => { setSelectedProductId(''); setProductSearch('') }}>Clear filter</button>
          )}
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Old Price</th>
                <th style={{ textAlign: 'right' }}>New Price</th>
                <th style={{ textAlign: 'right' }}>Difference</th>
                <th>Changed By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading"><td colSpan={6}><div className="empty-state"><div className="skeleton skeleton--row" /><div className="skeleton skeleton--row" /></div></td></tr>
              ) : records.length === 0 ? (
                <tr key="empty"><td colSpan={6}><div className="empty-state"><p>No price history found.</p></div></td></tr>
              ) : records.map((r) => (
                <tr key={r.price_history_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {r.image_url ? (
                        <img src={r.image_url} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--bg-tertiary)' }} />
                      )}
                      <span>{r.product_name || r.product_id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{Number(r.old_price).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{Number(r.new_price).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', color: r.new_price > r.old_price ? 'var(--danger)' : r.new_price < r.old_price ? 'var(--success)' : undefined }}>
                    {(r.new_price - r.old_price) > 0 ? '+' : ''}{(r.new_price - r.old_price).toFixed(2)}
                  </td>
                  <td>{r.changed_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLastPage || page > 1 ? (
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 'var(--space-4)' }}>
            <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>Page {page}</span>
            <button type="button" className="btn btn--ghost" disabled={isLastPage} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
