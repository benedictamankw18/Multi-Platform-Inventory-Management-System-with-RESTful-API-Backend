// Central helpers for rendering monetary values.
//
// The active currency comes from Business Settings (`business_settings.currency`,
// a 3-letter ISO code such as GHS/USD). UI code should obtain it through the
// BusinessSettingsContext (`useCurrency()`), which keeps it in sync with the
// `business-settings-updated` window event. These helpers only do the string
// formatting so they can also be used from non-React code (e.g. exports).

export const DEFAULT_CURRENCY = 'GHS'

/**
 * Format a numeric value as a currency string using the given 3-letter code.
 * Falls back to DEFAULT_CURRENCY when no currency is configured.
 *
 * Example: formatCurrency(1234.5, 'GHS') -> "GHS 1,234.50"
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency?: string | null,
): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '—'
  const code = (currency && String(currency).trim()) || DEFAULT_CURRENCY
  const amount = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${code} ${amount}`
}
