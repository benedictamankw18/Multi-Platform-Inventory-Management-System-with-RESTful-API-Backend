import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getPublicBusinessSettings } from '../services/api'
import { DEFAULT_CURRENCY, formatCurrency as format } from '../services/currency'

// Shape of the fields we consume from the public business settings endpoint.
// `currency` is the value configured under Business Settings -> Currency.
export type BusinessSettings = {
  business_name?: string | null
  currency?: string | null
  logo?: string | null
  [key: string]: unknown
}

export type BusinessSettingsContextValue = {
  business: BusinessSettings
  /** Active 3-letter currency code (never empty; falls back to DEFAULT_CURRENCY). */
  currency: string
  /** Format a value with the active currency, e.g. "GHS 1,234.00". */
  formatCurrency: (value: number | string | null | undefined) => string
  /** Re-fetch settings (also fired automatically by `business-settings-updated`). */
  refresh: () => void
}

const BusinessSettingsContext = createContext<BusinessSettingsContextValue | null>(null)

export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<BusinessSettings>({})

  // `/business/public` is intentionally unauthenticated, so the currency (and
  // branding) are available on the login/splash screens too.
  const load = useCallback(() => {
    getPublicBusinessSettings()
      .then((settings) => setBusiness((settings as BusinessSettings) || {}))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    window.addEventListener('business-settings-updated', load)
    return () => window.removeEventListener('business-settings-updated', load)
  }, [load])

  const currency = (business.currency && String(business.currency).trim()) || DEFAULT_CURRENCY

  const value = useMemo<BusinessSettingsContextValue>(
    () => ({
      business,
      currency,
      formatCurrency: (v) => format(v, currency),
      refresh: load,
    }),
    [business, currency, load],
  )

  return (
    <BusinessSettingsContext.Provider value={value}>{children}</BusinessSettingsContext.Provider>
  )
}

export function useBusinessSettings(): BusinessSettingsContextValue {
  const context = useContext(BusinessSettingsContext)
  if (!context) {
    throw new Error('useBusinessSettings must be used within a BusinessSettingsProvider')
  }
  return context
}

/** Convenience hook when a component only needs the currency + formatter. */
export function useCurrency() {
  const { currency, formatCurrency } = useBusinessSettings()
  return { currency, formatCurrency }
}
