import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as api from '@/services/api'
import type { Product, ProductInput } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/config/permissions'
import { PermissionGate } from '@/components/PermissionGate'
import { ProductForm } from '@/components/ProductForm'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

function toMessage(err: unknown, fallback: string): string {
  return api.isAxiosError(err)
    ? (err.response?.data?.errors?.[0]?.msg ?? err.response?.data?.message ?? fallback)
    : fallback
}

export default function ProductDetailRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.productsPage}>
      <ProductDetail />
    </PermissionGate>
  )
}

function ProductDetail() {
  const params = useLocalSearchParams<{ productId?: string | string[] }>()
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId
  const { hasPermission } = useAuth()
  const canEdit = hasPermission(PERMISSIONS.createProduct)

  const [product, setProduct] = useState<Product | null>(null)
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({})
  const [uomNames, setUomNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    if (!productId) return
    try {
      const found = await api.getProductById(productId)
      setProduct(found)
      setError(null)
    } catch (err) {
      setProduct(null)
      setError(toMessage(err, 'Could not load the product.'))
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    void (async () => {
      await load()
    })()
  }, [load])

  // Resolve category / UoM ids to names for display (best effort — the lookups
  // need VIEW_CATEGORIES, which a product editor may not hold).
  useEffect(() => {
    let active = true
    void (async () => {
      const [cats, units] = await Promise.all([
        api.getCategories({ includeInactive: true, limit: 1000 }).catch(() => null),
        api.getUnitsOfMeasure({ includeInactive: 'true', limit: 1000 }).catch(() => null),
      ])
      if (!active) return
      setCategoryNames(
        Object.fromEntries((cats?.categories ?? []).map((c) => [c.category_id, c.category_name])),
      )
      setUomNames(Object.fromEntries((units?.data ?? []).map((u) => [u.uom_id, u.uom_name])))
    })()
    return () => {
      active = false
    }
  }, [])

  function confirmToggle() {
    if (!product) return
    const action = product.is_active ? 'Deactivate' : 'Reactivate'
    Alert.alert(
      `${action} product`,
      product.is_active
        ? 'The product will be hidden from sale and product search.'
        : 'The product will become available again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: action, onPress: () => void doToggle() },
      ],
    )
  }

  async function doToggle() {
    if (!productId || !product) return
    setActing(true)
    setError(null)
    setFeedback(null)
    try {
      const updated = product.is_active
        ? await api.deactivateProduct(productId)
        : await api.reactivateProduct(productId)
      setProduct(updated)
      setFeedback(product.is_active ? 'Product deactivated.' : 'Product reactivated.')
    } catch (err) {
      setError(toMessage(err, 'Could not update the product.'))
    } finally {
      setActing(false)
    }
  }

  async function handleSave(input: ProductInput) {
    if (!productId) throw new Error('Product not found')
    return api.updateProduct(productId, input)
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      </View>
    )
  }

  if (!product) {
    return (
      <View style={styles.screen}>
        <Text style={styles.error}>{error ?? 'Product not found.'}</Text>
      </View>
    )
  }

  if (editing) {
    return (
      <ProductForm
        initial={product}
        productId={productId}
        submitLabel="Save changes"
        onSubmit={handleSave}
        onSaved={(p) => {
          setProduct(p)
          setEditing(false)
          setFeedback('Product saved.')
        }}
      />
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.name}>{product.product_name}</Text>
          <Text style={[styles.status, product.is_active ? styles.active : styles.inactive]}>
            {product.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <InfoRow label="SKU" value={product.sku} />
        <InfoRow label="Barcode" value={product.barcode || '—'} />
        <InfoRow
          label="Category"
          value={(product.category_id && categoryNames[product.category_id]) || '—'}
        />
        <InfoRow label="Unit of measure" value={uomNames[product.base_uom_id] || '—'} />
        {product.description ? <InfoRow label="Description" value={product.description} /> : null}
      </View>

      <Text style={styles.sectionTitle}>Pricing</Text>
      <View style={styles.card}>
        <InfoRow label="Cost price" value={Number(product.cost_price ?? 0).toFixed(2)} />
        <InfoRow label="Retail price" value={Number(product.retail_price ?? 0).toFixed(2)} />
        <InfoRow
          label="Wholesale price"
          value={product.wholesale_price != null ? Number(product.wholesale_price).toFixed(2) : '—'}
        />
        <InfoRow
          label="Wholesale min qty"
          value={product.wholesale_min_qty != null ? String(product.wholesale_min_qty) : '—'}
        />
        <InfoRow label="Tax rate" value={`${Number(product.tax_rate ?? 0)}%`} />
        <InfoRow label="Discount" value={`${Number(product.discount_percentage ?? 0)}%`} />
        <InfoRow label="Minimum stock" value={String(product.minimum_stock ?? 0)} />
      </View>

      <Pressable
        style={styles.priceHistory}
        onPress={() =>
          router.push({
            pathname: '/products/price-history',
            params: { product_id: product.product_id },
          })
        }
      >
        <Text style={styles.priceHistoryText}>View price history</Text>
      </Pressable>

      {feedback ? <Text style={styles.success}>{feedback}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {canEdit ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.editButton]}
            onPress={() => setEditing(true)}
            disabled={acting}
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, product.is_active ? styles.deactivateButton : styles.activateButton]}
            onPress={confirmToggle}
            disabled={acting}
          >
            {acting ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={product.is_active ? styles.deactivateText : styles.activateText}>
                {product.is_active ? 'Deactivate' : 'Reactivate'}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  loader: { marginTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  name: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, flex: 1 },
  status: { fontSize: fontSize.sm, fontWeight: '700', marginLeft: spacing.sm },
  active: { color: colors.success },
  inactive: { color: colors.textMuted },
  sectionTitle: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xs },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textMuted, flexShrink: 0, paddingRight: spacing.md },
  infoValue: { fontSize: fontSize.sm, color: colors.text, flexShrink: 1, textAlign: 'right' },
  priceHistory: { paddingVertical: spacing.sm },
  priceHistoryText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  success: { color: colors.success, fontSize: fontSize.sm, marginBottom: spacing.sm },
  error: { color: colors.danger, fontSize: fontSize.sm, margin: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  editButton: { borderWidth: 1, borderColor: colors.primary },
  editText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
  deactivateButton: { borderWidth: 1, borderColor: colors.danger },
  deactivateText: { color: colors.danger, fontSize: fontSize.md, fontWeight: '600' },
  activateButton: { borderWidth: 1, borderColor: colors.success },
  activateText: { color: colors.success, fontSize: fontSize.md, fontWeight: '600' },
})
