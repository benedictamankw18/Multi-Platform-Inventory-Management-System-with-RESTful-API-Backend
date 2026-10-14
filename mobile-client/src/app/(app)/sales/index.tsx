import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import * as api from '@/services/api'
import type { Sale } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/config/permissions'
import { PermissionGate } from '@/components/PermissionGate'
import { useCurrency } from '@/hooks/useCurrency'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

const PAGE_SIZE = 25

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PARTIALLY_PAID', label: 'Part-paid' },
  { value: 'VOID', label: 'Void' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'PARTIALLY_REFUNDED', label: 'Part-refunded' },
]

function statusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return colors.success
    case 'PARTIALLY_PAID':
    case 'PARTIALLY_REFUNDED':
      return colors.warning
    case 'VOID':
      return colors.danger
    default:
      return colors.textMuted
  }
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export default function SalesRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.sales}>
      <SalesList />
    </PermissionGate>
  )
}

function SalesList() {
  const { selectedBranch } = useAuth()
  const { formatMoney } = useCurrency()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [sales, setSales] = useState<Sale[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce typing so each keystroke does not fire a request.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(handle)
  }, [search])

  const hasMore = sales.length < total

  const fetchPage = useCallback(
    async (targetPage: number) => {
      if (!selectedBranch) return null
      const params: Record<string, unknown> = {
        page: targetPage,
        limit: PAGE_SIZE,
        branchId: selectedBranch.branch_id,
      }
      if (debouncedSearch) params.q = debouncedSearch
      if (statusFilter) params.status = statusFilter
      return api.getSales(params)
    },
    [selectedBranch, debouncedSearch, statusFilter],
  )

  // Reset to page 1 whenever the filters change.
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const res = await fetchPage(1)
        if (!active || !res) return
        setSales(res.data ?? [])
        setTotal(res.total ?? 0)
        setPage(1)
        setError(null)
      } catch {
        if (!active) return
        setSales([])
        setTotal(0)
        setError('Failed to load sales.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [fetchPage])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetchPage(1)
      if (res) {
        setSales(res.data ?? [])
        setTotal(res.total ?? 0)
        setPage(1)
        setError(null)
      }
    } catch {
      setError('Failed to refresh sales.')
    } finally {
      setRefreshing(false)
    }
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await fetchPage(nextPage)
      if (res) {
        setSales((prev) => [...prev, ...(res.data ?? [])])
        setTotal(res.total ?? 0)
        setPage(nextPage)
      }
    } catch {
      setError('Failed to load more sales.')
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, loading, hasMore, page, fetchPage])

  return (
    <View style={styles.screen}>
      <View style={styles.filters}>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Invoice, customer or cashier"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          returnKeyType="search"
        />
        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.value
            return (
              <Pressable
                key={filter.value || 'all'}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setStatusFilter(filter.value)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {filter.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.sale_id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={styles.empty}>No sales found.</Text>}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.footerLoader} color={colors.primary} />
            ) : hasMore ? (
              <Pressable style={styles.loadMore} onPress={loadMore}>
                <Text style={styles.loadMoreText}>Load more</Text>
              </Pressable>
            ) : sales.length > 0 ? (
              <Text style={styles.footerNote}>{total} sale{total === 1 ? '' : 's'}</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/sales/[saleId]', params: { saleId: item.sale_id } })
              }
            >
              <View style={styles.cardTop}>
                <Text style={styles.invoice}>
                  {item.invoice_number ?? item.sale_id.slice(0, 8)}
                </Text>
                <View style={[styles.badge, { backgroundColor: statusColor(item.status) }]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.customer}>{item.customer_name || 'Walk-in'}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.date}>{formatDate(item.sale_date)}</Text>
                <Text style={styles.amount}>{formatMoney(Number(item.total_amount))}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  filters: { padding: spacing.md, gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.text,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text },
  chipTextActive: { color: colors.surface, fontWeight: '600' },
  error: { color: colors.danger, fontSize: fontSize.sm },
  loader: { marginTop: spacing.xl },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invoice: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  badge: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 11, color: colors.surface, fontWeight: '700' },
  customer: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  date: { fontSize: fontSize.sm, color: colors.textMuted },
  amount: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  footerLoader: { marginVertical: spacing.md },
  loadMore: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  loadMoreText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  footerNote: { textAlign: 'center', color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.md },
})
