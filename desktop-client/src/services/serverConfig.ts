/**
 * serverConfig.ts
 *
 * The "Connect to Your Server" flow: validate/normalize a server host URL,
 * probe its health, and persist the choice so it is reused on next launch.
 *
 * The URL is *not* a secret, so it is stored in `localStorage` beside the other
 * desktop session values (deviceId). Tokens remain the sensitive values and are
 * wiped whenever the server changes — a token minted by one server must never
 * be sent to another.
 */

import axios from 'axios'
import { SERVER_URL_STORAGE_KEY, setApiBaseUrl } from './api'
import { cacheClear, outboxClear } from './offlineStore'

/**
 * Suggested default. Prefer an absolute build-time env URL; otherwise fall back
 * to the dev server (Vite proxies /api to :8040). A *relative* env value is
 * unusable as a suggestion because packaged builds load over file://.
 */
const ENV_BASE_URL = import.meta.env.VITE_API_BASE_URL
export const DEFAULT_SERVER_URL =
  ENV_BASE_URL && /^https?:\/\//i.test(ENV_BASE_URL)
    ? ENV_BASE_URL
    : 'http://localhost:8040/api/v1'

export type NormalizeResult =
  | { ok: true; url: string; warning: string | null }
  | { ok: false; error: string }

export type HealthResult = {
  ok: boolean
  message: string
  ms?: number
  /** Normalized URL the result refers to (present when normalization succeeded). */
  url?: string
  warning?: string | null
}

// localhost / loopback / Android-emulator host: plaintext http is expected here.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '10.0.2.2', '::1'])

/**
 * Validate and normalize a host URL typed by the user.
 *  - Assumes `http://` when no scheme is given (private/LAN hosts are common).
 *  - Trims whitespace and trailing slashes.
 *  - Appends `/api/v1` when missing (the API is mounted under that prefix).
 */
export function normalizeServerUrl(raw: string): NormalizeResult {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return { ok: false, error: 'Enter the server host URL.' }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withScheme)
  } catch {
    return { ok: false, error: 'That does not look like a valid URL.' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http:// and https:// URLs are supported.' }
  }
  if (!parsed.hostname) {
    return { ok: false, error: 'Enter a host, e.g. 192.168.1.10 or inventory.example.com.' }
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Do not include credentials in the URL.' }
  }

  let path = parsed.pathname.replace(/\/+$/, '')
  if (!/\/api\/v1$/i.test(path)) path = `${path}/api/v1`

  const url = `${parsed.protocol}//${parsed.host}${path}`

  const warning =
    parsed.protocol === 'http:' && !LOCAL_HOSTS.has(parsed.hostname.toLowerCase())
      ? 'This connection is not encrypted (http). Use https on untrusted networks.'
      : null

  return { ok: true, url, warning }
}

function describeHealthError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNABORTED') return 'Timed out. Check the host, port, and network.'
    if (err.response) return `The server responded with HTTP ${err.response.status}.`
    return 'Could not reach the server. Check the URL and that the API is running.'
  }
  return 'Could not reach the server.'
}

/**
 * Probe `GET /health` on an arbitrary base URL. Uses a raw axios call (not the
 * shared instance) so no bearer token or device header is attached before the
 * user has committed to a server.
 */
export async function checkServerHealth(baseUrl: string): Promise<HealthResult> {
  const started = Date.now()
  try {
    const { data } = await axios.get(`${baseUrl}/health`, {
      timeout: 6000,
      headers: { Accept: 'application/json' },
    })
    if (data && data.success === true) {
      return {
        ok: true,
        message: typeof data.message === 'string' ? data.message : 'Server is reachable.',
        ms: Date.now() - started,
      }
    }
    return { ok: false, message: 'The server responded, but it is not the inventory API.' }
  } catch (err) {
    return { ok: false, message: describeHealthError(err) }
  }
}

/** Normalize then health-check in one step (used by the Connect screen). */
export async function verifyServerUrl(raw: string): Promise<HealthResult> {
  const normalized = normalizeServerUrl(raw)
  if (!normalized.ok) return { ok: false, message: normalized.error }
  const health = await checkServerHealth(normalized.url)
  return { ...health, url: normalized.url, warning: normalized.warning }
}

// ---- Persistence -----------------------------------------------------------

export function getStoredServerUrl(): string | null {
  try {
    return localStorage.getItem(SERVER_URL_STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Commit to a chosen server: persist it, repoint the API client, and clear any
 * session (tokens, branch, offline cache) belonging to a different server.
 */
export function connectToServer(url: string): void {
  try {
    localStorage.setItem(SERVER_URL_STORAGE_KEY, url)
  } catch {
    /* ignore quota/security errors */
  }
  setApiBaseUrl(url)

  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('authUser')
  localStorage.removeItem('selectedBranch')

  // Drop cached/pending data from the previous server so it can't be shown or
  // pushed to the new one.
  void cacheClear().catch(() => {})
  void outboxClear().catch(() => {})

  // Let AuthContext reset its in-memory state.
  window.dispatchEvent(new Event('auth:expired'))
}
