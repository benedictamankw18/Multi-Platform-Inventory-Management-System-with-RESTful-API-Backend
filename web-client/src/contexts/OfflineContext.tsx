import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import api, { healthCheck } from '../services/api'
import { drainOutbox, hydrateOfflineCache } from '../services/offline'
import { on } from '../services/offlineEvents'
import { getMeta, outboxAll } from '../services/offlineStore'

type OfflineContextValue = {
  isOnline: boolean
  pendingCount: number
  failedCount: number
  lastSyncAt: string | null
  syncing: boolean
  lastSyncResult: { processed: number; failed: number; remaining: number } | null
  syncNow: () => Promise<void>
}

const OfflineContext = createContext<OfflineContextValue | null>(null)

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [pendingCount, setPendingCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<{
    processed: number
    failed: number
    remaining: number
  } | null>(null)
  const syncingRef = useRef(false)

  const refreshCounts = useCallback(async () => {
    try {
      const all = await outboxAll()
      setPendingCount(all.filter((e) => e.status === 'pending').length)
      setFailedCount(all.filter((e) => e.status === 'failed').length)
    } catch {
      // indexdb unavailable — keep current counts
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    try {
      const result = await drainOutbox(api)
      setLastSyncResult(result)
      setLastSyncAt(new Date().toISOString())
      await refreshCounts()
    } finally {
      syncingRef.current = false
    }
  }, [refreshCounts])

  useEffect(() => {
    void refreshCounts()

    const unsubscribes = [
      on('online', () => setIsOnline(true)),
      on('offline', () => setIsOnline(false)),
      on('queue-changed', () => void refreshCounts()),
      on('sync-state', (s) => setSyncing(s.syncing)),
    ]

    const handleBrowserOnline = () => setIsOnline(true)
    const handleBrowserOffline = () => setIsOnline(false)
    window.addEventListener('online', handleBrowserOnline)
    window.addEventListener('offline', handleBrowserOffline)

    // Auto-sync whenever the backend comes back online
    const unsubOnline = on('online', () => {
      void syncNow()
      // Refresh the offline cache too — the catalog must be (re)populated even
      // when the outbox was empty (e.g. after login or a reconnect).
      if (localStorage.getItem('accessToken')) {
        void hydrateOfflineCache(api).catch(() => {})
      }
    })

    // Probe the backend periodically so idle windows notice it came back
    const probeId = window.setInterval(() => {
      healthCheck().catch(() => {})
    }, 10000)

    // Drain anything left over from a previous session
    void syncNow()

    // Warm the offline cache on boot so the POS catalog is available while
    // offline even when the outbox was empty (nothing to drain).
    if (localStorage.getItem('accessToken')) {
      void hydrateOfflineCache(api).catch(() => {})
    }

    return () => {
      unsubscribes.forEach((off) => off())
      unsubOnline()
      window.removeEventListener('online', handleBrowserOnline)
      window.removeEventListener('offline', handleBrowserOffline)
      window.clearInterval(probeId)
    }
  }, [refreshCounts, syncNow])

  // Load the last sync time from local metadata on mount
  useEffect(() => {
    void getMeta('lastSyncAt').then((v) => {
      if (typeof v === 'string') setLastSyncAt(v)
    })
  }, [])

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingCount,
        failedCount,
        lastSyncAt,
        syncing,
        lastSyncResult,
        syncNow,
      }}
    >
      {children}
    </OfflineContext.Provider>
  )
}

export function useOffline() {
  const ctx = useContext(OfflineContext)
  if (!ctx) throw new Error('useOffline must be used within an OfflineProvider')
  return ctx
}
