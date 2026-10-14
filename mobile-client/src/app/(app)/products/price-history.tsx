import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import * as api from '@/services/api'
import type { PriceHistoryEntry } from '@/services/api'
import { PERMISSIONS } from '@/config/permissions'
import { PermissionGate } from '@/components/PermissionGate'
import { useCurrency } from '@/hooks/useCurrency'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

const PAGE_SIZE = 50

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export default function PriceHistoryRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.productsPage}>
      <PriceHistoryScreen />
    </PermissionGate>
  )
}

function PriceHistoryScreen() {
  const params = useLocalSearchParams<{ product_id?: string | string[] }>()
  const initialProductId = Array.isArray(params.product_id) ? params.product_id[0] : params.product_id
  const { formatMoney } = useCurrency()

  const [records, setRecords] = useState<PriceHistoryEntry[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Product filter.
  const [productSearch, setProductSearch] = useState('')
  const [suggestions, setSuggestions] = useState<{ product_id: string; product_name: string }[]>([])
  const [selectedProductId, setSelectedProductId] = useState(initialProductId ?? '')

  // Debounced product lookup for the filter. Suggestions are cleared in the
  // input handler (not here) so the effect body never calls setState directly.
  useEffect(() => {
    const q = productSearch.trim()
    if (q.length < 2) return
    let active = true
    const handle = setTimeout(() => {
      void (async () => {
        const res = await api.searchProducts({ q, limit: 20 }).catch(() => null)
        if (active) setSuggestions(res?.products ?? [])
      })()
    }, 300)
    return () => {
      active = false
      clearTimeout(handle)
    }
  }, [productSearch])

  const load = useCallback(async () => {
    const query: Record<string, unknown> = { page, limit: PAGE_SIZE }
    if (selectedProductId) query.product_id = selectedProductId
    return api.getPriceHistory(query)
  }, [page, selectedProductId])

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      try {
        const list = await load()
        if (!active) return
        setRecords(list)
        setError(null)
      } catch {
        if (!active) return
        setRecords([])
        setError('Failed to load price history.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [load])

  function selectProduct(productId: string, productName: string) {
    // Reset to the first page in the handler (not an effect) to keep the hook
    // lint rules happy.
    setPage(1)
    setSelectedProductId(productId)
    setProductSearch(productName)
    setSuggestions([])
  }

  function clearFilter() {
    setPage(1)
    setSelectedProductId('')
    setProductSearch('')
    setSuggestions([])
  }

  const isLastPage = records.length < PAGE_SIZE

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TextInput
          style={styles.input}
          value={productSearch}
          onChangeText={(v) => {
            setProductSearch(v)
            setSuggestions([])
            if (selectedProductId) setSelectedProductId('')
          }}
          placeholder="Filter by product…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />
        {suggestions.length > 0 ? (
          <View style={styles.suggestions}>
            {suggestions.map((s) => (
              <Pressable
                key={s.product_id}
                style={styles.suggestion}
                onPress={() => selectProduct(s.product_id, s.product_name)}
              >
                <Text style={styles.suggestionText}>{s.product_name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {selectedProductId ? (
          <Pressable style={styles.clearFilter} onPress={clearFilter}>
            <Text style={styles.clearFilterText}>Clear filter</Text>
          </Pressable>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.history_id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>No price history found.</Text>}
          ListFooterComponent={
            records.length > 0 ? (
              <View style={styles.pager}>
                <Pressable
                  style={[styles.pagerButton, page <= 1 && styles.pagerDisabled]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <Text style={styles.pagerText}>Prev</Text>
                </Pressable>
                <Text style={styles.pagerLabel}>Page {page}</Text>
                <Pressable
                  style={[styles.pagerButton, isLastPage && styles.pagerDisabled]}
                  onPress={() => setPage((p) => p + 1)}
                  disabled={isLastPage}
                >
                  <Text style={styles.pagerText}>Next</Text>
                </Pressable>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const oldPrice = Number(item.old_price ?? 0)
            const newPrice = Number(item.new_price ?? 0)
            const diff = newPrice - oldPrice
            const diffColor = diff > 0 ? colors.danger : diff < 0 ? colors.success : colors.textMuted
            return (
              <View style={styles.card}>
                <Text style={styles.product} numberOfLines={1}>
                  {item.product_name || item.product_id.slice(0, 8)}
                </Text>
                <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceMuted}>{formatMoney(oldPrice)}</Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.price}>{formatMoney(newPrice)}</Text>
                  <Text style={[styles.diff, { color: diffColor }]}>
                    {diff > 0 ? '+' : ''}
                    {formatMoney(diff)}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  {[item.price_type, item.source, item.changed_by_name].filter(Boolean).join(' • ') ||
                    '—'}
                </Text>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, gap: spacing.sm, zIndex: 1 },
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
  suggestions: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  suggestion: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionText: { fontSize: fontSize.sm, color: colors.text },
  clearFilter: { paddingVertical: spacing.xs },
  clearFilterText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
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
  product: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  date: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  priceMuted: { fontSize: fontSize.sm, color: colors.textMuted },
  arrow: { fontSize: fontSize.sm, color: colors.textMuted },
  price: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  diff: { fontSize: fontSize.sm, fontWeight: '600', marginLeft: 'auto' },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  pagerButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pagerDisabled: { opacity: 0.4 },
  pagerText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  pagerLabel: { fontSize: fontSize.sm, color: colors.textMuted },
})
