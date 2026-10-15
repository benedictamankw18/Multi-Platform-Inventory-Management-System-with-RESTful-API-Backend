/**
 * ServerConfigContext.tsx
 *
 * Loads the persisted "Connect to Your Server" URL once at boot and exposes the
 * check/connect actions. Sits ABOVE AuthProvider so it can seed the API client
 * before any authenticated request runs.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { setApiBaseUrl } from '@/services/api'
import {
  connectToServer,
  getStoredServerUrl,
  verifyServerUrl,
  type HealthResult,
} from '@/services/serverConfig'

export type ServerConfigContextValue = {
  /** The persisted, normalized server URL, or null when not yet configured. */
  serverUrl: string | null
  /** True once a server has been chosen. */
  configured: boolean
  /** True once the stored value has been loaded (avoids a first-render flash). */
  ready: boolean
  /** Validate + health-check a host URL without saving it. */
  check: (raw: string) => Promise<HealthResult>
  /** Persist a normalized URL, repoint the client, and clear old session data. */
  connect: (url: string) => Promise<void>
}

const ServerConfigContext = createContext<ServerConfigContextValue | null>(null)

export function ServerConfigProvider({ children }: { children: ReactNode }) {
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const stored = await getStoredServerUrl()
      if (cancelled) return
      if (stored) {
        setApiBaseUrl(stored)
        setServerUrl(stored)
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const check = useCallback((raw: string) => verifyServerUrl(raw), [])

  const connect = useCallback(async (url: string) => {
    await connectToServer(url)
    setServerUrl(url)
  }, [])

  const value = useMemo<ServerConfigContextValue>(
    () => ({ serverUrl, configured: Boolean(serverUrl), ready, check, connect }),
    [serverUrl, ready, check, connect],
  )

  return <ServerConfigContext.Provider value={value}>{children}</ServerConfigContext.Provider>
}

export function useServerConfig(): ServerConfigContextValue {
  const context = useContext(ServerConfigContext)
  if (!context) throw new Error('useServerConfig must be used within a ServerConfigProvider')
  return context
}
