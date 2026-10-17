import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AppState } from 'react-native'
import * as Network from 'expo-network'
import api, { healthCheck } from '../services/api'
import { drainOutbox, hydrateOfflineCache } from '../services/offline'
import { on } from '../services/offlineEvents'
import { getMeta, outboxAll, outboxRetryFailed } from '../services/offlineStore'
import { getAccessToken } from '../services/secureTokens'

/** How often the app opportunistically syncs in the background. */
const AUTO_SYNC_INTERVAL_MS = 60000

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
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<{ processed: number; failed: number; remaining: number } | null>(null)
  const syncingRef = useRef(false)

  const refreshCounts = useCallback(async () => {
    try {
      const all = await outboxAll()
      setPendingCount(all.filter((e) => e.status === 'pending').length)
      setFailedCount(all.filter((e) => e.status === 'failed').length)
    } catch {}
  }, [])

  /**
   * Core sync: requeue previously-failed entries (only when `retryFailed`),
   * replay the outbox, then refresh the offline read mirror. Skipped when no
   * access token is stored (e.g. signed out), so it never marks entries failed
   * just because there is nothing to authenticate with.
   */
  const runSync = useCallback(
    async (retryFailed: boolean) => {
      if (syncingRef.current) return
      syncingRef.current = true
      try {
        const token = await getAccessToken()
        if (!token) return
        if (retryFailed) await outboxRetryFailed()
        const result = await drainOutbox(api)
        setLastSyncResult(result)
        setLastSyncAt(new Date().toISOString())
        await hydrateOfflineCache(api).catch(() => {})
        await refreshCounts()
      } finally {
        syncingRef.current = false
      }
    },
    [refreshCounts],
  )

  // User-initiated / reconnect sync retries failed entries as well.
  const syncNow = useCallback(() => runSync(true), [runSync])

  useEffect(() => {
    let mounted = true
    queueMicrotask(() => {
      if (mounted) void refreshCounts()
    })

    const unsub = [
      on('online', () => setIsOnline(true)),
      on('offline', () => setIsOnline(false)),
      on('queue-changed', () => void refreshCounts()),
      on('sync-state', (s) => setSyncing(s.syncing)),
    ]

    const netUnsub = Network.addNetworkStateListener((state) => {
      const connected = !!state.isConnected
      if (connected) {
        setIsOnline(true)
        // Reconnect is a natural retry point for entries that failed offline.
        void syncNow()
      } else {
        setIsOnline(false)
      }
    })

    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && mounted) void syncNow()
    })

    const probeId = setInterval(() => {
      healthCheck().catch(() => {})
    }, 10000)

    // Auto-sync without user interaction. Runs without requeueing failed
    // entries so a permanently-rejected mutation cannot loop every minute.
    const autoSyncId = setInterval(() => {
      void runSync(false)
    }, AUTO_SYNC_INTERVAL_MS)

    void syncNow()

    return () => {
      mounted = false
      unsub.forEach((off) => off())
      netUnsub.remove()
      appStateSub.remove()
      clearInterval(probeId)
      clearInterval(autoSyncId)
    }
  }, [refreshCounts, runSync, syncNow])

  useEffect(() => {
    void getMeta('lastSyncAt').then((v) => {
      if (typeof v === 'string') setLastSyncAt(v)
    })
  }, [])

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, failedCount, lastSyncAt, syncing, lastSyncResult, syncNow }}>
      {children}
    </OfflineContext.Provider>
  )
}

export function useOffline() {
  const ctx = useContext(OfflineContext)
  if (!ctx) throw new Error('useOffline must be used within an OfflineProvider')
  return ctx
}