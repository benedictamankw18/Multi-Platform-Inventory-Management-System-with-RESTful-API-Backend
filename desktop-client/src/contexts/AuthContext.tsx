import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from '../services/api'
import type { AuthUser, BranchInfo } from '../services/api'
import apiClient from '../services/api'
import { hydrateOfflineCache } from '../services/offline'

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  // Permissions
  permissions: string[]
  hasPermission: (code: string) => boolean
  // Branch selection
  selectedBranch: BranchInfo | null
  branches: BranchInfo[]
  needsBranchSelection: boolean
  branchesLoading: boolean
  fetchBranches: () => Promise<void>
  selectBranch: (branchId: string) => Promise<void>
  clearBranch: () => void
  // Auth actions
  login: (usernameOrEmail: string, password: string) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<string>
  resetPassword: (token: string, password: string) => Promise<string>
  clearError: () => void
  updateUser: (user: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<BranchInfo | null>(null)
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    const accessToken = localStorage.getItem('accessToken')
    const storedBranch = localStorage.getItem('selectedBranch')

    if (storedUser && accessToken) {
      try {
        setUser(JSON.parse(storedUser))
        // Refresh user in background so profile changes (e.g. profile photo) apply
        api.getMyProfile()
          .then((profile) => {
            localStorage.setItem('authUser', JSON.stringify(profile))
            setUser(profile)
          })
          .catch(() => {})
        // Fetch permissions in background on session restore
        api.getMyPermissions()
          .then((res) => setPermissions(res.permissions ?? []))
          .catch(() => setPermissions([]))
      } catch {
        localStorage.removeItem('authUser')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      }
    }

    if (storedBranch) {
      try {
        setSelectedBranch(JSON.parse(storedBranch))
      } catch {
        localStorage.removeItem('selectedBranch')
      }
    }

    setIsLoading(false)
  }, [])

  const loadPermissions = useCallback(async () => {
    try {
      const res = await api.getMyPermissions()
      setPermissions(res.permissions ?? [])
    } catch {
      setPermissions([])
    }
  }, [])

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    setError(null)
    try {
      const result = await api.login(usernameOrEmail, password)
      localStorage.setItem('accessToken', result.accessToken)
      localStorage.setItem('refreshToken', result.refreshToken)
      localStorage.setItem('authUser', JSON.stringify(result.user))
      setUser(result.user)
      // Clear any previous branch selection on new login
      setSelectedBranch(null)
      setBranches([])
      localStorage.removeItem('selectedBranch')
      // Fetch permissions
      loadPermissions()
    } catch (err) {
      const message =
        api.isAxiosError(err)
          ? err.response?.data?.message ?? 'Unable to sign in.'
          : 'Unable to sign in.'
      setError(message)
      throw new Error(message)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      setUser(null)
      setSelectedBranch(null)
      setBranches([])
      setPermissions([])
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('authUser')
      localStorage.removeItem('selectedBranch')
    }
  }, [])

  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true)
    try {
      const result = await api.getMyBranches()
      const branchList = result.branches
      setBranches(branchList)
      // Auto-select if only one branch
      if (branchList.length === 1 && !selectedBranch) {
        try {
          const selectResult = await api.selectBranch(branchList[0].branch_id)
          if (selectResult.accessToken) localStorage.setItem('accessToken', selectResult.accessToken)
          if (selectResult.refreshToken) localStorage.setItem('refreshToken', selectResult.refreshToken)
          if (selectResult.user) {
            localStorage.setItem('authUser', JSON.stringify(selectResult.user))
            setUser(selectResult.user)
          }
          localStorage.setItem('selectedBranch', JSON.stringify(selectResult.branch))
          setSelectedBranch(selectResult.branch)
        } catch {
          // If auto-select fails, user will pick manually
        }
      }
    } catch (err) {
      const message =
        api.isAxiosError(err)
          ? err.response?.data?.message ?? 'Unable to load branches.'
          : 'Unable to load branches.'
      setError(message)
    } finally {
      setBranchesLoading(false)
    }
  }, [selectedBranch])

  const selectBranch = useCallback(async (branchId: string) => {
    setError(null)
    try {
      const result = await api.selectBranch(branchId)
      // Update tokens (the backend re-signs with new branchId)
      if (result.accessToken) {
        localStorage.setItem('accessToken', result.accessToken)
      }
      if (result.refreshToken) {
        localStorage.setItem('refreshToken', result.refreshToken)
      }
      // Update user with new branchId
      if (result.user) {
        localStorage.setItem('authUser', JSON.stringify(result.user))
        setUser(result.user)
      }
      // Store selected branch
      localStorage.setItem('selectedBranch', JSON.stringify(result.branch))
      setSelectedBranch(result.branch)
      // Re-hydrate the offline cache so branch-scoped pulls swap to the newly
      // selected branch's data (getSelectedBranchId reads this localStorage key).
      void hydrateOfflineCache(apiClient).catch(() => {})
    } catch (err) {
      const message =
        api.isAxiosError(err)
          ? err.response?.data?.message ?? 'Unable to select branch.'
          : 'Unable to select branch.'
      setError(message)
      throw new Error(message)
    }
  }, [])

  const forgotPassword = useCallback(async (email: string) => {
    setError(null)
    try {
      const result = await api.forgotPassword(email)
      return result.message
    } catch (err) {
      const message =
        api.isAxiosError(err)
          ? err.response?.data?.message ?? 'Unable to send reset instructions.'
          : 'Unable to send reset instructions.'
      setError(message)
      throw new Error(message)
    }
  }, [])

  const resetPassword = useCallback(async (token: string, password: string) => {
    setError(null)
    try {
      const result = await api.resetPassword(token, password)
      return result.message
    } catch (err) {
      const message =
        api.isAxiosError(err)
          ? err.response?.data?.message ?? 'Unable to reset password.'
          : 'Unable to reset password.'
      setError(message)
      throw new Error(message)
    }
  }, [])

  const updateUser = useCallback((updated: AuthUser) => {
    localStorage.setItem('authUser', JSON.stringify(updated))
    setUser(updated)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const hasPermission = useCallback((code: string) => {
    if (!user) return false
    if (user.role === 'Administrator' || user.role === 'Business Owner') return true
    return permissions.includes(code)
  }, [user, permissions])

  const clearBranch = useCallback(() => {
    setSelectedBranch(null)
    localStorage.removeItem('selectedBranch')
  }, [])

  // A user needs branch selection if they are authenticated but haven't
  // picked a branch yet. If the user object already has a branchId from
  // login and we have a stored branch, skip selection.
  const needsBranchSelection = useMemo(() => {
    if (!user) return false
    // If user has no branchId assigned at all, we still need them to pick
    // one (the branch list might be empty — that's a valid state to show)
    return !selectedBranch
  }, [user, selectedBranch])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      error,
      permissions,
      hasPermission,
      selectedBranch,
      branches,
      branchesLoading,
      needsBranchSelection,
      fetchBranches,
      selectBranch,
      clearBranch,
      login,
      logout,
      forgotPassword,
      resetPassword,
      clearError,
      updateUser,
    }),
    [
      user, isLoading, error, permissions, hasPermission,
      selectedBranch, branches, branchesLoading, needsBranchSelection,
      fetchBranches, selectBranch, clearBranch,
      login, logout, forgotPassword, resetPassword, clearError, updateUser,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
