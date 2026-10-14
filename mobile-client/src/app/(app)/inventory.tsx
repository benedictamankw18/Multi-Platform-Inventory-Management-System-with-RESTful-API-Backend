import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as api from '@/services/api'
import type { InventoryItem } from '@/services/api'
import { PERMISSIONS } from '@/config/permissions'
import { PermissionGate } from '@/components/PermissionGate'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

function toMessage(err: unknown, fallback: string): string {
  return api.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback
}

export default function InventoryRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.inventory}>
      <InventoryView />
    </PermissionGate>
  )
}

function InventoryView() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInventory = useCallback(async (q: string) => {
    const res = await api.getInventory({ q: q.trim() || undefined, limit: 50 })
    return res.data ?? []
  }, [])

  // Initial load. setState only runs in promise callbacks, never synchronously
  // inside the effect body (keeps `react-hooks/set-state-in-effect` happy).
  useEffect(() => {
    let active = true
    fetchInventory('')
      .then((list) => {
        if (active) setItems(list)
      })
      .catch((err) => {
        if (active) setError(toMessage(err, 'Unable to load inventory.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [fetchInventory])

  async function onSearch() {
    setLoading(true)
    setError(null)
    try {
      setItems(await fetchInventory(query))
    } catch (err) {
      setError(toMessage(err, 'Unable to load inventory.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search stock by product or SKU"
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        onSubmitEditing={() => void onSearch()}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.inventory_id}
          contentContainerStyle={{ paddingVertical: spacing.sm }}
          ListEmptyComponent={<Text style={styles.empty}>No inventory records found.</Text>}
          renderItem={({ item }) => {
            const low = Number(item.quantity_on_hand) <= Number(item.reorder_level)
            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.product_name}</Text>
                  <Text style={styles.rowMeta}>{item.sku}</Text>
                </View>
                <View style={styles.qtyBox}>
                  <Text style={[styles.qty, low && styles.qtyLow]}>
                    {Number(item.quantity_on_hand ?? 0)}
                  </Text>
                  <Text style={styles.qtyLabel}>on hand</Text>
                </View>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.sm },
  empty: { color: colors.textMuted, fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  rowTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  qtyBox: { alignItems: 'flex-end' },
  qty: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  qtyLow: { color: colors.danger },
  qtyLabel: { fontSize: fontSize.sm, color: colors.textMuted },
})
