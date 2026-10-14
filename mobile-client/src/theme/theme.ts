/**
 * theme.ts
 *
 * Minimal design tokens for the mobile client. Mirrors the intent of the web
 * client's branding without importing any web-only code.
 */

export const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
} as const

export const fontSize = {
  sm: 13,
  md: 15,
  lg: 18,
  xl: 24,
} as const
