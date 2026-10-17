/**
 * AuthContext.tsx
 *
 * Port of `web-client/src/contexts/AuthContext.tsx`. Handles login, branch
 * selection, permissions, and session restore. Tokens are kept in
 * `expo-secure-store`; the user profile and selected branch are small JSON
 * blobs in the same store.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from '../services/api'
import type { AuthUser, BranchInfo } from '../services/api'
import { onSessionReset } from '../services/authEvents'
import { useServerConfig } from './ServerConfigContext'
import {
  STORAGE_KEYS,
  clearTokens,
  getAccessToken,
  readJson,
  removeKey,
  storeTokens,
  writeJson,
} from '../services/secureTokens'
import { hydrateOfflineCache, isBackendUnreachable, isQueuedOffline } from '../services/offline'
import apiClient from '../services/api'

export type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  permissions: string[]
  /** True once the permission set has been fetched (or failed) — lets the shell stop waiting. */
  permissionsLoaded: boolean
  hasPermission: (code: string) => boolean
  selectedBranch: BranchInfo | null
  branches: BranchInfo[]
  needsBranchSelection: boolean
  branchesLoading: boolean
  fetchBranches: () => Promise<void>
  selectBranch: (branchId: string) => Promise<void>
  login: (usernameOrEmail: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function errorMessage(err: unknown, fallback: string): string {
  return api.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<BranchInfo | null>(null)
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [permissionsLoaded, setPermissionsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // The server URL must be resolved before we restore a session, otherwise the
  // profile/permission requests would hit the default (unconfigured) base URL.
  const { ready: serverReady } = useServerConfig()

  // Restore session once the server config is ready.
  useEffect(() => {
    if (!serverReady) return
    let cancelled = false
    ;(async () => {
      try {
        const [storedUser, accessToken, storedBranch] = await Promise.all([
          readJson<AuthUser>(STORAGE_KEYS.authUser),
          getAccessToken(),
          readJson<BranchInfo>(STORAGE_KEYS.selectedBranch),
        ])
        if (cancelled) return
        if (storedUser && accessToken) setUser(storedUser)
        if (storedBranch) setSelectedBranch(storedBranch)
        if (storedUser && accessToken) {
          // Refresh profile + permissions in the background.
          api
            .getMyProfile()
            .then(async (profile) => {
              const next = profile as unknown as AuthUser
              await writeJson(STORAGE_KEYS.authUser, next)
              if (!cancelled) setUser(next)
            })
            .catch(() => {})
          api
            .getMyPermissions()
            .then((res) => !cancelled && setPermissions(res.permissions ?? []))
            .catch(() => {})
            .finally(() => {
              if (!cancelled) setPermissionsLoaded(true)
            })
        } else if (!cancelled) {
          // No stored session — nothing to load; the shell redirects to /login.
          setPermissionsLoaded(true)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [serverReady])

  // When the user connects to a different server, drop the in-memory session.
  // (serverConfig has already wiped the persisted tokens/branch/cache.)
  useEffect(() => {
    return onSessionReset(() => {
      setUser(null)
      setSelectedBranch(null)
      setBranches([])
      setPermissions([])
      setPermissionsLoaded(false)
    })
  }, [])

  const loadPermissions = useCallback(async () => {
    try {
      const res = await api.getMyPermissions()
      setPermissions(res.permissions ?? [])
    } catch {
      setPermissions([])
    } finally {
      setPermissionsLoaded(true)
    }
  }, [])

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    setError(null)
    try {
      const result = await api.login(usernameOrEmail, password)
      await storeTokens(result.accessToken, result.refreshToken)
      await writeJson(STORAGE_KEYS.authUser, result.user)
      await removeKey(STORAGE_KEYS.selectedBranch)
      setUser(result.user)
      setSelectedBranch(null)
      setBranches([])
      setPermissions([])
      setPermissionsLoaded(false)
      void loadPermissions()
    } catch (err) {
      const message = errorMessage(err, 'Unable to sign in.')
      setError(message)
      throw new Error(message)
    }
  }, [loadPermissions])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // Ignore network errors on logout — clear local state regardless.
    } finally {
      await clearTokens()
      await removeKey(STORAGE_KEYS.authUser)
      await removeKey(STORAGE_KEYS.selectedBranch)
      setUser(null)
      setSelectedBranch(null)
      setBranches([])
      setPermissions([])
      setPermissionsLoaded(false)
    }
  }, [])

  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true)
    try {
      const result = await api.getMyBranches()
      const list = result.branches
      setBranches(list)
      // No branch selected: auto-select when there is exactly one.
      if (list.length === 1) {
        try {
          const sel = await api.selectBranch(list[0].branch_id)
          if (sel.accessToken) {
            await storeTokens(sel.accessToken, sel.refreshToken)
          }
          if (sel.user) {
            await writeJson(STORAGE_KEYS.authUser, sel.user)
            setUser(sel.user)
          }
          await writeJson(STORAGE_KEYS.selectedBranch, sel.branch)
          setSelectedBranch(sel.branch)
          void hydrateOfflineCache(apiClient).catch(() => {})
        } catch {
          // Fall through to manual selection.
        }
      }
    } catch (err) {
      setError(errorMessage(err, 'Unable to load branches.'))
    } finally {
      setBranchesLoading(false)
    }
  }, [])

  const selectBranch = useCallback(async (branchId: string) => {
    setError(null)
    // Apply locally immediately by finding branch in branches list
    const branch = branches.find((b) => b.branch_id === branchId) || null
    if (branch) {
      setSelectedBranch(branch)
      try {
        await writeJson(STORAGE_KEYS.selectedBranch, branch)
      } catch {}
    }
    try {
      const result = await api.selectBranch(branchId)
      if (result.accessToken) await storeTokens(result.accessToken, result.refreshToken)
      if (result.user) {
        await writeJson(STORAGE_KEYS.authUser, result.user)
        setUser(result.user)
      }
      await writeJson(STORAGE_KEYS.selectedBranch, result.branch)
      setSelectedBranch(result.branch)
      // Warm the offline mirror for this branch as soon as we're online.
      void hydrateOfflineCache(apiClient).catch(() => {})
    } catch (err) {
      const e: any = err
      if (isBackendUnreachable(e) || isQueuedOffline(e)) {
        return
      }
      const message = errorMessage(err, 'Unable to select branch.')
      setError(message)
      throw new Error(message)
    }
  }, [branches])

  const clearError = useCallback(() => setError(null), [])

  const hasPermission = useCallback(
    (code: string) => {
      if (!user) return false
      if (user.role === 'Administrator' || user.role === 'Business Owner') return true
      return permissions.includes(code)
    },
    [user, permissions],
  )

  const needsBranchSelection = useMemo(() => Boolean(user) && !selectedBranch, [user, selectedBranch])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      error,
      permissions,
      permissionsLoaded,
      hasPermission,
      selectedBranch,
      branches,
      needsBranchSelection,
      branchesLoading,
      fetchBranches,
      selectBranch,
      login,
      logout,
      clearError,
    }),
    [
      user,
      isLoading,
      error,
      permissions,
      permissionsLoaded,
      hasPermission,
      selectedBranch,
      branches,
      needsBranchSelection,
      branchesLoading,
      fetchBranches,
      selectBranch,
      login,
      logout,
      clearError,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
