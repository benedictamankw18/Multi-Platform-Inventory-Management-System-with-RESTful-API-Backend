import type { ReactNode } from 'react'
import { Redirect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingScreen } from './LoadingScreen'

/**
 * Route-level permission guard, mirroring the web client's `PermissionRoute`.
 *
 * Hiding a tab with `href: null` does not stop a deep link, so every protected
 * screen renders its content inside this gate. Unauthorized users are
 * redirected to the dashboard rather than shown an error.
 */
export function PermissionGate({
  permission,
  children,
}: {
  permission: string
  children: ReactNode
}) {
  const { hasPermission, isLoading, permissionsLoaded } = useAuth()

  // Wait for the permission set so we don't redirect a permitted user while it
  // is still loading.
  if (isLoading || !permissionsLoaded) {
    return <LoadingScreen />
  }

  if (!hasPermission(permission)) {
    return <Redirect href="/" />
  }

  return <>{children}</>
}
