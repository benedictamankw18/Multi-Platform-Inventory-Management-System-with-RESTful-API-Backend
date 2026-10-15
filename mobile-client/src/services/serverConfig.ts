/**
 * serverConfig.ts
 *
 * The "Connect to Your Server" flow for the mobile client: validate/normalize a
 * server host URL, probe its health, and persist the choice in `expo-secure-store`
 * (via `secureTokens`) so it is reused on next launch.
 *
 * Unlike the web/desktop client, the running base URL cannot be read
 * synchronously at import time (SecureStore is async), so callers must load the
 * stored value once at boot — see `ServerConfigProvider`.
 */

import axios, { isAxiosError } from 'axios'
import { getApiBaseUrl, setApiBaseUrl } from './api'
import { emitSessionReset } from './authEvents'
import { cacheClear, outboxClear } from './offlineStore'
import {
  STORAGE_KEYS,
  clearTokens,
  readJson,
  removeKey,
  writeJson,
} from './secureTokens'

/**
 * Suggested default — the effective build-time base URL (env var, with the
 * Android-emulator localhost mapping applied). Captured once, before any user
 * choice, so it stays the "factory default" even after connecting elsewhere.
 */
export const DEFAULT_SERVER_URL = getApiBaseUrl()

export type NormalizeResult =
  | { ok: true; url: string; warning: string | null }
  | { ok: false; error: string }

export type HealthResult = {
  ok: boolean
  message: string
  ms?: number
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

  // scheme://authority/path — parsed by hand because Hermes' `URL` is partial.
  const match = /^(https?):\/\/([^/?#]+)([^?#]*)/i.exec(withScheme)
  if (!match) return { ok: false, error: 'That does not look like a valid URL.' }

  const protocol = `${match[1].toLowerCase()}:`
  const authority = match[2]
  const rawPath = match[3] ?? ''

  if (/\s/.test(authority)) {
    return { ok: false, error: 'That does not look like a valid URL.' }
  }
  if (authority.includes('@')) {
    return { ok: false, error: 'Do not include credentials in the URL.' }
  }

  // Strip an optional :port (and unwrap [ipv6] literals) to get the hostname.
  let hostname = authority
  if (authority.startsWith('[')) {
    const end = authority.indexOf(']')
    if (end === -1) return { ok: false, error: 'That does not look like a valid URL.' }
    hostname = authority.slice(1, end)
  } else {
    const colon = authority.indexOf(':')
    if (colon !== -1) hostname = authority.slice(0, colon)
  }
  if (!hostname) {
    return { ok: false, error: 'Enter a host, e.g. 192.168.1.10 or inventory.example.com.' }
  }

  let path = rawPath.replace(/\/+$/, '')
  if (!/\/api\/v1$/i.test(path)) path = `${path}/api/v1`

  const url = `${protocol}//${authority}${path}`

  const warning =
    protocol === 'http:' && !LOCAL_HOSTS.has(hostname.toLowerCase())
      ? 'This connection is not encrypted (http). Use https on untrusted networks.'
      : null

  return { ok: true, url, warning }
}

function describeHealthError(err: unknown): string {
  if (isAxiosError(err)) {
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

export async function getStoredServerUrl(): Promise<string | null> {
  return readJson<string>(STORAGE_KEYS.serverUrl)
}

/**
 * Commit to a chosen server: persist it, repoint the API client, and clear any
 * session (tokens, branch, offline cache) belonging to a different server.
 * Emits `session-reset` so AuthProvider drops its in-memory state.
 */
export async function connectToServer(url: string): Promise<void> {
  await writeJson(STORAGE_KEYS.serverUrl, url)
  setApiBaseUrl(url)

  await clearTokens()
  await removeKey(STORAGE_KEYS.authUser)
  await removeKey(STORAGE_KEYS.selectedBranch)

  // Drop cached/pending data from the previous server so it can't be shown or
  // pushed to the new one.
  await cacheClear().catch(() => {})
  await outboxClear().catch(() => {})

  emitSessionReset()
}
