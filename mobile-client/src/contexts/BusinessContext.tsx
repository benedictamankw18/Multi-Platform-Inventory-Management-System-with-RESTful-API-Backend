/**
 * BusinessContext.tsx
 *
 * Branding (business name + logo) for the login screen and the JS splash, read
 * from the unauthenticated `GET /business/public`. The mobile client only
 * *reads* Business Settings — the management page stays web/desktop-only.
 *
 * The last-seen values are cached in SecureStore so an offline cold start still
 * shows branding. Nothing here throws: on failure the cached values (or null)
 * are kept and the UI falls back to a default name.
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from '@/services/api'
import { STORAGE_KEYS, readJson, writeJson } from '@/services/secureTokens'

export type BusinessBranding = {
  /** Business name from Business Settings, or null when unset/unavailable. */
  name: string | null
  /** Absolute logo URL (already resolved against the API origin), or null. */
  logo: string | null
}

type BusinessContextValue = BusinessBranding & {
  /** True once the first API fetch has settled (success or failure). */
  ready: boolean
}

const EMPTY: BusinessBranding = { name: null, logo: null }

// No throwing consumer: a screen rendered outside the provider just gets the
// empty defaults and falls back to the app name.
const BusinessContext = createContext<BusinessContextValue>({ ...EMPTY, ready: false })

function toBranding(settings: api.PublicBusinessSettings | null): BusinessBranding {
  if (!settings) return EMPTY
  return {
    name: settings.business_name ?? null,
    // Business Settings stores the logo relative to the API origin.
    logo: api.resolveImageUrl(settings.logo),
  }
}

// One in-flight fetch per app session, shared by every consumer.
let fetchPromise: Promise<BusinessBranding> | null = null

function loadBranding(): Promise<BusinessBranding> {
  if (!fetchPromise) {
    fetchPromise = api
      .getPublicBusinessSettings()
      .then(toBranding)
      .catch(() => EMPTY)
  }
  return fetchPromise
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BusinessBranding>(EMPTY)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      // 1. Cache first, so an offline cold start still shows a logo/name.
      const cached = await readJson<BusinessBranding>(STORAGE_KEYS.businessBranding)
      if (cancelled) return
      if (cached) setBranding(cached)

      // 2. Refresh from the API; keep the cache when it fails.
      const fresh = await loadBranding()
      if (cancelled) return
      setBranding(fresh)
      setReady(true)
      if (fresh.name || fresh.logo) {
        void writeJson(STORAGE_KEYS.businessBranding, fresh)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<BusinessContextValue>(() => ({ ...branding, ready }), [branding, ready])

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness(): BusinessContextValue {
  return useContext(BusinessContext)
}
