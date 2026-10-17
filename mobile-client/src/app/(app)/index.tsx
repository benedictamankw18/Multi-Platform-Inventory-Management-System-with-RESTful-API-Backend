import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { useOffline } from '@/contexts/OfflineContext'
import { PERMISSIONS } from '@/config/permissions'
import { useCurrency } from '@/hooks/useCurrency'
import {
  getDailySales,
  getLowStock,
  getMonthSalesTotal,
  getProductCount,
  getProfitRangeTotal,
  getSalesRangeTotal,
  getYearSalesTotal,
} from '@/services/api'
import { getMeta, setMeta } from '@/services/offlineStore'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

/**
 * Last successful dashboard KPI reading. Cached in the offline `meta` table so
 * the cards still render with the most recent values while offline (the report
 * endpoints are online-only and their query parameters are not part of the
 * generic GET cache key).
 */
type KpiSnapshot = {
  at: number
  todaySales: number
  todayTransactions: number
  weekSales: number
  monthSales: number
  yearSales: number
  profitMtd: number
  lowStock: number
  totalSkus: number
}

const KPI_META_KEY = 'dashboard:kpis'

/** Local (not UTC) `YYYY-MM-DD`, so "today" matches the user's calendar. */
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DashboardScreen() {
  const { user, selectedBranch, hasPermission } = useAuth()
  const { isOnline, syncing, pendingCount, failedCount, lastSyncAt, syncNow } = useOffline()
  const { formatMoney } = useCurrency()
  const canViewReports = hasPermission(PERMISSIONS.viewReports)

  const branchId = selectedBranch?.branch_id
  const [kpis, setKpis] = useState<KpiSnapshot | null>(null)

  // Restore the last snapshot immediately so the cards are populated offline.
  useEffect(() => {
    if (!canViewReports) return
    let active = true
    getMeta(KPI_META_KEY)
      .then((cached) => {
        if (active && cached && typeof cached === 'object') setKpis(cached as KpiSnapshot)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [canViewReports])

  // Refresh from the server when online, and again after every successful sync
  // (a drained offline sale changes today's/week's/month's totals).
  useEffect(() => {
    if (!canViewReports || !isOnline) return
    let active = true
    void (async () => {
      const now = new Date()
      const today = isoDate(now)
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      // Calendar week, Monday–Sunday.
      const monday = new Date(now)
      const dow = (now.getDay() + 6) % 7 // 0 = Monday
      monday.setDate(now.getDate() - dow)
      const weekStart = isoDate(monday)

      const [daily, weekSales, monthSales, yearSales, profitMtd, lowStock, totalSkus] =
        await Promise.all([
          getDailySales(today, branchId),
          getSalesRangeTotal(weekStart, today, branchId),
          getMonthSalesTotal(now.getFullYear(), now.getMonth() + 1, branchId),
          getYearSalesTotal(now.getFullYear(), branchId),
          getProfitRangeTotal(monthStart, today, branchId),
          getLowStock(branchId),
          getProductCount(branchId),
        ])
      if (!active) return

      const snapshot: KpiSnapshot = {
        at: Date.now(),
        todaySales: daily?.total_sales ?? 0,
        todayTransactions: daily?.transactions ?? 0,
        weekSales,
        monthSales,
        yearSales,
        profitMtd,
        lowStock: Array.isArray(lowStock) ? lowStock.length : 0,
        totalSkus,
      }
      setKpis(snapshot)
      void setMeta(KPI_META_KEY, snapshot).catch(() => {})
    })().catch(() => {})
    return () => {
      active = false
    }
  }, [canViewReports, isOnline, branchId, lastSyncAt])

  // Only surface modules the signed-in role can actually open, so the home
  // screen reflects the user's permissions rather than a fixed menu.
  const modules = [
    { label: 'POS', value: 'Ring up a sale', permission: PERMISSIONS.createSale },
    { label: 'Sales', value: 'Sales history', permission: PERMISSIONS.sales },
    { label: 'Products', value: 'Browse the catalog', permission: PERMISSIONS.productsPage },
    { label: 'Inventory', value: 'Stock on hand', permission: PERMISSIONS.inventory },
    { label: 'Stock', value: 'Record stock in / out', permission: PERMISSIONS.manageInventory },
  ].filter((module) => hasPermission(module.permission))

  type KpiCard = { label: string; value: string; sub?: string; danger?: boolean }

  const kpiCards: KpiCard[] = kpis
    ? [
        {
          label: "Today's Sales",
          value: formatMoney(kpis.todaySales),
          sub: `${kpis.todayTransactions} transactions`,
        },
        { label: 'Week Sales', value: formatMoney(kpis.weekSales) },
        { label: 'Month Sales', value: formatMoney(kpis.monthSales) },
        { label: 'Year Sales', value: formatMoney(kpis.yearSales) },
        { label: 'Profit (MTD)', value: formatMoney(kpis.profitMtd) },
        {
          label: 'Low Stock',
          value: String(kpis.lowStock),
          danger: kpis.lowStock > 0,
        },
        { label: 'Total SKUs', value: String(kpis.totalSkus) },
      ]
    : []

  const lastSyncText = lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : 'never'
  const queueSummary = `${pendingCount} pending${failedCount ? ` • ${failedCount} failed` : ''}`

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hello, {user?.fullName ?? 'there'}</Text>
      <Text style={styles.subtitle}>{user?.role}</Text>

      <View style={styles.branchCard}>
        <Text style={styles.branchLabel}>Active branch</Text>
        <Text style={styles.branchName}>{selectedBranch?.branch_name ?? 'Not selected'}</Text>
        <Text style={styles.branchMeta}>
          {[selectedBranch?.city, selectedBranch?.country].filter(Boolean).join(', ') || 'No location'}
        </Text>
        <View style={styles.branchActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change branch"
            accessibilityHint="Choose a different branch to work from"
            style={({ pressed }) => [styles.changeBranch, pressed && styles.changeBranchPressed]}
            onPress={() => router.push({ pathname: '/select-branch', params: { mode: 'switch' } })}
          >
            <Text style={styles.changeBranchText}>Change branch</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sync now"
            accessibilityHint="Send queued changes and refresh data from the server"
            accessibilityState={{ disabled: !isOnline || syncing }}
            disabled={!isOnline || syncing}
            style={({ pressed }) => [
              styles.syncButton,
              (!isOnline || syncing) && styles.syncButtonDisabled,
              pressed && styles.syncButtonPressed,
            ]}
            onPress={() => void syncNow()}
          >
            {syncing ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Text style={styles.syncButtonText}>{isOnline ? 'Sync now' : 'Offline'}</Text>
            )}
          </Pressable>
        </View>
        <Text style={styles.syncMeta}>
          {queueSummary} • Last sync {lastSyncText}
        </Text>
      </View>

      {canViewReports ? (
        kpis ? (
          <View style={styles.kpiSection}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.kpiGrid}>
              {kpiCards.map((kpi) => (
                <View key={kpi.label} style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>{kpi.label}</Text>
                  <Text style={[styles.kpiValue, kpi.danger && styles.kpiValueDanger]}>
                    {kpi.value}
                  </Text>
                  {kpi.sub ? <Text style={styles.kpiSub}>{kpi.sub}</Text> : null}
                </View>
              ))}
            </View>
            {!isOnline ? (
              <Text style={styles.kpiHint}>
                Offline — showing figures as of {new Date(kpis.at).toLocaleString()}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.kpiLoading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.kpiLoadingText}>Loading dashboard…</Text>
          </View>
        )
      ) : null}

      {modules.map((module) => {
        const route =
          module.label === 'POS'
            ? '/pos'
            : module.label === 'Sales'
              ? '/sales'
              : module.label === 'Products'
                ? '/products'
                : module.label === 'Inventory'
                  ? '/inventory'
                  : module.label === 'Stock'
                    ? '/stock-movements'
                    : null
        const content = (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{module.label}</Text>
            <Text style={styles.cardValue}>{module.value}</Text>
          </View>
        )
        return route ? (
          <Pressable
            key={module.label}
            onPress={() => router.push(route)}
            accessibilityRole="button"
          >
            {content}
          </Pressable>
        ) : (
          <View key={module.label}>{content}</View>
        )
      })}

      {modules.length === 0 ? (
        <Text style={styles.empty}>No feature modules are enabled for your role yet.</Text>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  greeting: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.xs },
  branchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  branchLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  branchName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginTop: spacing.xs },
  branchMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  branchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  changeBranch: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  changeBranchPressed: { backgroundColor: 'rgba(37, 99, 235, 0.08)' },
  changeBranchText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  syncButton: {
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  syncButtonPressed: { backgroundColor: colors.primaryDark },
  syncButtonDisabled: { opacity: 0.5 },
  syncButtonText: { color: colors.surface, fontSize: fontSize.sm, fontWeight: '700' },
  syncMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  kpiSection: { marginTop: spacing.lg },
  kpiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  kpiLoadingText: { fontSize: fontSize.sm, color: colors.textMuted },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  kpiLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  kpiValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  kpiValueDanger: { color: colors.danger },
  kpiSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  kpiHint: { fontSize: fontSize.sm, color: colors.warning },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  cardValue: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  empty: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.lg },
})
