import { Redirect } from 'expo-router'
import { Tabs } from 'expo-router/js-tabs'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/config/permissions'
import { LoadingScreen } from '@/components/LoadingScreen'
import { TabBar, type TabBarItem } from '@/components/TabBar'

/**
 * Authenticated shell. Guards every nested route:
 *  - Not signed in      -> /login
 *  - No branch selected -> /select-branch
 *  - Permissions pending -> spinner
 *
 * The visible tabs are computed here (this is where the permission checks live)
 * and handed to the custom `TabBar`. The two inventory screens are intentionally
 * not in that list: they remain routable but are reached from the More screen.
 * Order matters: the auth redirects must run before the permissions wait,
 * otherwise an unauthenticated user would spin forever.
 */
export default function AppLayout() {
  const { isAuthenticated, isLoading, needsBranchSelection, permissionsLoaded, hasPermission } =
    useAuth()

  if (isLoading) return <LoadingScreen />

  if (!isAuthenticated) return <Redirect href="/login" />
  if (needsBranchSelection) return <Redirect href="/select-branch" />

  if (!permissionsLoaded) return <LoadingScreen />

  const items: TabBarItem[] = [
    { name: 'index', label: 'Dashboard', icon: 'home' },
    ...(hasPermission(PERMISSIONS.productsPage)
      ? [{ name: 'products', label: 'Products', icon: 'package' } as const]
      : []),
    ...(hasPermission(PERMISSIONS.createSale)
      ? [{ name: 'pos', label: 'POS', icon: 'monitor', primary: true } as const]
      : []),
    ...(hasPermission(PERMISSIONS.sales)
      ? [{ name: 'sales', label: 'Sales', icon: 'shopping-cart' } as const]
      : []),
    { name: 'more', label: 'More', icon: 'menu' },
  ]

  return (
    <Tabs
      screenOptions={{ headerShown: true }}
      tabBar={(props) => <TabBar {...props} items={items} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="pos" options={{ title: 'POS' }} />
      <Tabs.Screen name="products" options={{ title: 'Products', headerShown: false }} />
      <Tabs.Screen name="sales" options={{ title: 'Sales', headerShown: false }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      {/*
        Routable but hidden from the tab bar. `href: null` only hides the default
        React Navigation bar; the custom `TabBar` above ignores these entries
        because they are absent from `items`. They stay reachable from More.
      */}
      <Tabs.Screen name="inventory" options={{ title: 'Inventory', href: null }} />
      <Tabs.Screen name="stock-movements" options={{ title: 'Stock', href: null }} />
      <Tabs.Screen name="printers" options={{ title: 'Printers', href: null }} />
    </Tabs>
  )
}
