import { useEffect, useState } from 'react'
import * as api from '@/services/api'

/**
 * Currency symbol for display, read once from the unauthenticated
 * `GET /business/public`. The mobile client only *reads* branding/settings —
 * the Business Settings management page stays web/desktop-only.
 *
 * Falls back to a bare number when the API is unreachable or has no currency.
 */
export function useCurrency() {
  const [currency, setCurrency] = useState('')

  useEffect(() => {
    let active = true
    api
      .getPublicBusinessSettings()
      .then((settings) => {
        if (active && settings?.currency) setCurrency(settings.currency)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const formatMoney = (n: number) => {
    const value = (Number.isFinite(n) ? n : 0).toFixed(2)
    return currency ? `${currency} ${value}` : value
  }

  return { currency, formatMoney }
}
