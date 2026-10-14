/**
 * secureTokens.ts
 *
 * Persistent, encrypted storage for auth tokens and small session values.
 *
 * - Native (Android / iOS): uses `expo-secure-store` (Android Keystore /
 *   iOS Keychain).
 * - Web (dev convenience only): falls back to `localStorage`. The production
 *   targets are Android and iOS.
 *
 * IMPORTANT: `expo-secure-store` on iOS has historically rejected values larger
 * than ~2048 bytes, so the access and refresh tokens are stored under SEPARATE
 * keys — never concatenated into one JSON blob.
 *
 * Docs: https://docs.expo.dev/versions/v57.0.0/sdk/securestore/
 */

import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

export const STORAGE_KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  authUser: 'authUser',
  selectedBranch: 'selectedBranch',
  deviceId: 'deviceId',
  /** Selected receipt printer (non-secret, but kept beside the other session data). */
  printerConfig: 'printerConfig',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

const isWeb = Platform.OS === 'web'

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value)
    return
  }
  await SecureStore.setItemAsync(key, value)
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return globalThis.localStorage?.getItem(key) ?? null
  }
  return SecureStore.getItemAsync(key)
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key)
    return
  }
  await SecureStore.deleteItemAsync(key)
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export function getAccessToken(): Promise<string | null> {
  return getItem(STORAGE_KEYS.accessToken)
}

export function getRefreshToken(): Promise<string | null> {
  return getItem(STORAGE_KEYS.refreshToken)
}

export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    setItem(STORAGE_KEYS.accessToken, accessToken),
    setItem(STORAGE_KEYS.refreshToken, refreshToken),
  ])
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    removeItem(STORAGE_KEYS.accessToken),
    removeItem(STORAGE_KEYS.refreshToken),
  ])
}

// ---------------------------------------------------------------------------
// Session blobs (small, non-token) — user profile and selected branch
// ---------------------------------------------------------------------------

export async function readJson<T>(key: StorageKey): Promise<T | null> {
  const raw = await getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function writeJson(key: StorageKey, value: unknown): Promise<void> {
  await setItem(key, JSON.stringify(value))
}

export function removeKey(key: StorageKey): Promise<void> {
  return removeItem(key)
}

// ---------------------------------------------------------------------------
// Device identity
// ---------------------------------------------------------------------------

/**
 * A persistent UUID identifying this install, sent on every request as
 * `X-Device-Id` (matches the web client's contract).
 */
export async function getDeviceId(): Promise<string> {
  const existing = await getItem(STORAGE_KEYS.deviceId)
  if (existing) return existing

  const id = generateUuid()
  await setItem(STORAGE_KEYS.deviceId, id)
  return id
}

function generateUuid(): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID()
  }
  // Fallback (RN/Hermes without crypto.randomUUID)
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}
