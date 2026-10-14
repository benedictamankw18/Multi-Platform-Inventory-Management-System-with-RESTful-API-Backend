import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import * as api from '@/services/api'
import type { Product } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/config/permissions'
import { PermissionGate } from '@/components/PermissionGate'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

const PAGE_SIZE = 25

export default function ProductsRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.productsPage}>
      <ProductsList />
    </PermissionGate>
  )
}

function ProductsList() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission(PERMISSIONS.createProduct)
  const canManageCatalog = hasPermission(PERMISSIONS.categories)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(handle)
  }, [search])

  const hasMore = products.length < total

  const fetchPage = useCallback(
    async (targetPage: number) => {
      const params: Record<string, unknown> = {
        page: targetPage,
        limit: PAGE_SIZE,
        includeInactive: showInactive,
      }
      if (debouncedSearch) params.q = debouncedSearch
      return api.searchProducts(params)
    },
    [debouncedSearch, showInactive],
  )

  // Reload page 1 whenever the screen regains focus (e.g. returning from the
  // New Product screen) as well as when the search / filter changes. Without
  // the focus refetch a product created on the next screen would not appear
  // until the user pulled to refresh.
  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        try {
          const res = await fetchPage(1)
          if (!active) return
          setProducts(res.products ?? [])
          setTotal(res.total ?? 0)
          setPage(1)
          setError(null)
        } catch {
          if (!active) return
          setProducts([])
          setTotal(0)
          setError('Failed to load products.')
        } finally {
          if (active) setLoading(false)
        }
      })()
      return () => {
        active = false
      }
    }, [fetchPage]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetchPage(1)
      setProducts(res.products ?? [])
      setTotal(res.total ?? 0)
      setPage(1)
      setError(null)
    } catch {
      setError('Failed to refresh products.')
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
      setProducts((prev) => [...prev, ...(res.products ?? [])])
      setTotal(res.total ?? 0)
      setPage(nextPage)
    } catch {
      setError('Failed to load more products.')
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, loading, hasMore, page, fetchPage])

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, SKU or barcode"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          returnKeyType="search"
        />
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.chip, showInactive && styles.chipActive]}
            onPress={() => setShowInactive((v) => !v)}
          >
            <Text style={[styles.chipText, showInactive && styles.chipTextActive]}>
              Show inactive
            </Text>
          </Pressable>
          {canCreate ? (
            <Pressable
              style={[styles.chip, styles.newChip]}
              onPress={() => router.push('/products/new')}
            >
              <Text style={styles.newChipText}>+ New product</Text>
            </Pressable>
          ) : null}
        </View>
        {canManageCatalog ? (
          <View style={styles.linkRow}>
            <Pressable style={styles.link} onPress={() => router.push('/products/categories')}>
              <Text style={styles.linkText}>Categories</Text>
            </Pressable>
            <Pressable style={styles.link} onPress={() => router.push('/products/units-of-measure')}>
              <Text style={styles.linkText}>Units of measure</Text>
            </Pressable>
            <Pressable style={styles.link} onPress={() => router.push('/products/price-history')}>
              <Text style={styles.linkText}>Price history</Text>
            </Pressable>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.product_id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={styles.empty}>No products found.</Text>}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.footerLoader} color={colors.primary} />
            ) : hasMore ? (
              <Pressable style={styles.loadMore} onPress={loadMore}>
                <Text style={styles.loadMoreText}>Load more</Text>
              </Pressable>
            ) : products.length > 0 ? (
              <Text style={styles.footerNote}>
                {total} product{total === 1 ? '' : 's'}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const primary = api.resolveImageUrl(item.primary_image_url)
            return (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({ pathname: '/products/[productId]', params: { productId: item.product_id } })
                }
              >
                <View style={styles.row}>
                  <View style={styles.thumbWrap}>
                    {primary ? (
                      <Image source={{ uri: primary }} style={styles.thumb} />
                    ) : (
                      <View style={styles.thumbPlaceholder}>
                        <Text style={styles.thumbText}>IMG</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.info}>
                    <View style={styles.cardTop}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.product_name}
                      </Text>
                      {item.is_active ? null : (
                        <View style={styles.inactiveBadge}>
                          <Text style={styles.inactiveText}>Inactive</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.meta}>
                      {item.sku}
                      {item.barcode ? ` • ${item.barcode}` : ''}
                    </Text>
                    <Text style={styles.price}>{Number(item.retail_price ?? 0).toFixed(2)}</Text>
                  </View>
                </View>
              </Pressable>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, gap: spacing.sm },
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
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
  newChip: { borderColor: colors.primary },
  newChipText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  link: { paddingVertical: spacing.xs },
  linkText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
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
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  thumbWrap: { width: 60, height: 60, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbText: { fontSize: 10, color: colors.textMuted },
  info: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
  inactiveBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.textMuted,
    marginLeft: spacing.sm,
  },
  inactiveText: { fontSize: 11, color: colors.surface, fontWeight: '700' },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  price: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary, marginTop: spacing.sm },
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
  footerNote: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
})
