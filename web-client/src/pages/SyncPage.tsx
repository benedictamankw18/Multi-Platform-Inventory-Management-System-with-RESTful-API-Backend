import { useCallback, useEffect, useState } from 'react'
import { useOffline } from '../contexts/OfflineContext'
import api, { getSyncLogs, getEntityLastSync, retrySync } from '../services/api'
import { outboxAll, outboxRetry, outboxRemove, removeOfflineSale, type OutboxEntry } from '../services/offlineStore'
import { hydrateOfflineCache } from '../services/offline'

type SyncLogItem = {
  sync_id: string
  device_id: string | null
  entity_type: string | null
  sync_status: string
  synced_at: string | null
  error_message: string | null
  retry_count: number
  created_at: string
}

type EntitySync = {
  entity: string
  status: string | null
  syncedAt: string | null
  error: string | null
}

const STATUS_VARIANTS: Record<string, string> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
}

const ENTITIES = [
  'products',
  'categories',
  'suppliers',
  'customers',
  'branches',
  'expenses',
  'purchases',
  'sales',
  'users',
  'roles',
  'inventories',
  'inventory-transfers',
  'notifications',
]

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="glass-card" style={{ padding: 'var(--space-4)' }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export default function SyncPage() {
  const { isOnline, pendingCount, failedCount, lastSyncAt, syncing, lastSyncResult, syncNow } = useOffline()
  const [queue, setQueue] = useState<OutboxEntry[]>([])
  const [logs, setLogs] = useState<SyncLogItem[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logError, setLogError] = useState<string | null>(null)
  const [entitySyncs, setEntitySyncs] = useState<EntitySync[]>([])
  const [entitySyncsLoading, setEntitySyncsLoading] = useState(true)
  const [pulling, setPulling] = useState(false)

  const loadQueue = useCallback(async () => {
    try {
      setQueue(await outboxAll())
    } catch {
      setQueue([])
    }
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue, pendingCount, failedCount])

  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await getSyncLogs({ limit: 50 })
      setLogs(Array.isArray(res?.data) ? res.data : [])
      setLogError(null)
    } catch {
      setLogError('Could not load server sync logs.')
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const loadEntitySyncs = useCallback(async () => {
    setEntitySyncsLoading(true)
    const results = await Promise.allSettled(
      ENTITIES.map(async (entity) => {
        try {
          const res = await getEntityLastSync(entity)
          const row = (res as { data?: { sync_status?: string | null; synced_at?: string | null; error_message?: string | null } } | null | undefined)?.data
          return {
            entity,
            status: row?.sync_status ?? null,
            syncedAt: row?.synced_at ?? null,
            error: row?.error_message ?? null,
          }
        } catch {
          return { entity, status: 'UNREACHABLE', syncedAt: null, error: null }
        }
      }),
    )
    setEntitySyncs(
      results.map((r) =>
        r.status === 'fulfilled'
          ? r.value
          : { entity: '', status: 'ERROR', syncedAt: null, error: null },
      ),
    )
    setEntitySyncsLoading(false)
  }, [])

  useEffect(() => {
    loadEntitySyncs()
  }, [loadEntitySyncs])

  const retryEntry = async (id: number) => {
    await outboxRetry(id)
    await loadQueue()
    void syncNow()
  }

  const removeEntry = async (entry: OutboxEntry) => {
    if (!window.confirm(`Remove this ${entry.status} ${entry.method} ${entry.url} entry? This cannot be undone.`)) return
    if (entry.id !== undefined) {
      await outboxRemove(entry.id)
    }
    if (entry.entity === 'sales') {
      const data = entry.data as { local_transaction_id?: string } | null | undefined
      if (data?.local_transaction_id) {
        await removeOfflineSale(data.local_transaction_id).catch(() => {})
      }
    }
    await loadQueue()
  }

  const retryLog = async (syncId: string) => {
    try {
      await retrySync(syncId)
    } catch {
      // ignore — the logs refresh will surface the current state
    }
    await Promise.all([loadLogs(), loadEntitySyncs()])
  }

  const pullNow = async () => {
    if (pulling) return
    setPulling(true)
    try {
      await hydrateOfflineCache(api)
    } finally {
      setPulling(false)
    }
    await Promise.all([loadLogs(), loadEntitySyncs()])
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Sync &amp; Offline</h1>
          <p className="page-subtitle">Connection state and pending local changes</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => void syncNow()} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <Stat
          label="Connection"
          value={
            <span className={`badge badge--${isOnline ? 'success' : 'danger'}`} style={{ fontSize: 14 }}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          }
          hint={isOnline ? 'Backend reachable' : 'Using cached data — changes are queued'}
        />
        <Stat label="Pending changes" value={pendingCount} hint="Awaiting upload" />
        <Stat label="Failed changes" value={failedCount} hint="Need attention" />
        <Stat
          label="Last sync"
          value={lastSyncAt ? new Date(lastSyncAt).toLocaleString() : '—'}
          hint={lastSyncResult ? `${lastSyncResult.processed} uploaded, ${lastSyncResult.failed} failed` : undefined}
        />
      </div>

      <div className="glass-card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16 }}>Local queue</h2>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {queue.filter((e) => e.status === 'pending').length} pending · {queue.filter((e) => e.status === 'failed').length} failed
          </span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Method</th>
                <th>Endpoint</th>
                <th>Created</th>
                <th>Status</th>
                <th>Error</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr key="empty-queue"><td colSpan={7}><div className="empty-state"><p>No queued changes.</p></div></td></tr>
              ) : queue.map((entry, i) => (
                <tr key={entry.id ?? i}>
                  <td>{entry.entity || '—'}</td>
                  <td><span className="badge badge--info">{entry.method}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{entry.url}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(entry.createdAt).toLocaleString()}</td>
                  <td>
                    <span className={`badge badge--${entry.status === 'pending' ? 'warning' : 'danger'}`}>{entry.status.toUpperCase()}</span>
                  </td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--danger)' }}>{entry.lastError || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {entry.status === 'failed' && (
                      <>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void retryEntry(entry.id!)}>
                          Retry
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" style={{ color: 'var(--danger)' }} onClick={() => void removeEntry(entry)}>
                          Remove
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16 }}>Last sync per entity</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void loadEntitySyncs()} disabled={entitySyncsLoading}>
              Refresh
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void pullNow()} disabled={pulling || !isOnline}>
              {pulling ? 'Pulling…' : 'Pull now'}
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Status</th>
                <th>Last synced</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {entitySyncsLoading ? (
                <tr key="loading-entity-syncs"><td colSpan={4}><div className="empty-state"><div className="skeleton skeleton--row" /></div></td></tr>
              ) : entitySyncs.map((s) => (
                <tr key={s.entity}>
                  <td>{s.entity}</td>
                  <td><span className={`badge badge--${STATUS_VARIANTS[s.status ?? ''] ?? 'info'}`}>{s.status ?? '—'}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{s.syncedAt ? new Date(s.syncedAt).toLocaleString() : '—'}</td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', color: s.error ? 'var(--danger)' : undefined }}>{s.error || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16 }}>Server sync logs</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void loadLogs()} disabled={logsLoading}>
              Refresh
            </button>
            <a href="#/sync/logs" style={{ fontSize: 13, color: 'var(--accent)' }}>View all</a>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Status</th>
                <th>Synced At</th>
                <th>Error</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr key="loading-logs"><td colSpan={5}><div className="empty-state"><div className="skeleton skeleton--row" /></div></td></tr>
              ) : logError ? (
                <tr key="log-error"><td colSpan={5}><div className="empty-state"><p>{logError}</p></div></td></tr>
              ) : logs.length === 0 ? (
                <tr key="empty-logs"><td colSpan={5}><div className="empty-state"><p>No sync logs yet.</p></div></td></tr>
              ) : logs.map((l) => (
                <tr key={l.sync_id}>
                  <td>{l.entity_type || '—'}</td>
                  <td><span className={`badge badge--${STATUS_VARIANTS[l.sync_status] || 'info'}`}>{l.sync_status}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{l.synced_at ? new Date(l.synced_at).toLocaleString() : '—'}</td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', color: l.error_message ? 'var(--danger)' : undefined }}>{l.error_message || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {l.sync_status === 'FAILED' && (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => void retryLog(l.sync_id)}>
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
