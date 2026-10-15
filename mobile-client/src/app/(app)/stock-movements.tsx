import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as api from '@/services/api'
import type { Product } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/config/permissions'
import { PermissionGate } from '@/components/PermissionGate'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

function toMessage(err: unknown, fallback: string): string {
  return api.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback
}

export default function StockMovementsRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.manageInventory}>
      <StockMovementsView />
    </PermissionGate>
  )
}

function StockMovementsView() {
  const { selectedBranch } = useAuth()

  const [mode, setMode] = useState<'in' | 'out'>('in')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [available, setAvailable] = useState<number | null>(null)
  const [searching, setSearching] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function loadAvailability(product: Product) {
    if (!selectedBranch) return
    try {
      const res = await api.getInventory({
        productId: product.product_id,
        branchId: selectedBranch.branch_id,
        limit: 1,
      })
      const items = res.data ?? []
      setAvailable(items.length > 0 ? Number(items[0].quantity_on_hand) : 0)
    } catch {
      setAvailable(null)
    }
  }

  async function chooseProduct(product: Product) {
    setSelected(product)
    setResults([])
    setAvailable(null)
    setError(null)
    setSuccess(null)
    if (mode === 'out') await loadAvailability(product)
  }

  async function changeMode(next: 'in' | 'out') {
    setMode(next)
    setError(null)
    setSuccess(null)
    if (next === 'out' && selected) await loadAvailability(selected)
    else setAvailable(null)
  }

  async function runSearch(raw: string) {
    const q = raw.trim()
    if (!q || !selectedBranch) return
    setSearching(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await api.searchProducts({
        q,
        limit: 20,
        branchId: selectedBranch.branch_id,
      })
      const list = res.products ?? []
      if (list.length === 1) {
        await chooseProduct(list[0])
      } else if (list.length === 0) {
        setResults([])
        setSelected(null)
        setAvailable(null)
        setError('No products matched that search.')
      } else {
        setResults(list)
        setSelected(null)
        setAvailable(null)
      }
    } catch (err) {
      setError(toMessage(err, 'Failed to search products.'))
    } finally {
      setSearching(false)
    }
  }

  function handleScanned(data: string) {
    setScannerOpen(false)
    setQuery(data)
    void runSearch(data)
  }

  async function onSubmit() {
    setError(null)
    setSuccess(null)
    if (!selectedBranch) {
      setError('No branch selected.')
      return
    }
    if (!selected) {
      setError('Select a product first.')
      return
    }
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Quantity must be greater than zero.')
      return
    }
    if (mode === 'out' && available !== null && qty > available) {
      setError(`Insufficient stock. Available: ${available}.`)
      return
    }
    const expiryRequired = mode === 'in' && selected.expiry_required === true
    if (expiryRequired && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate.trim())) {
      setError('Expiry date is required, in YYYY-MM-DD format.')
      return
    }

    setSubmitting(true)
    try {
      const created = await api.createInventoryTransaction({
        product_id: selected.product_id,
        branch_id: selectedBranch.branch_id,
        quantity: qty,
        type: mode,
        ...(mode === 'in' && unitCost.trim() ? { unit_cost: Number(unitCost) } : {}),
        ...(expiryRequired
          ? { expiry_date: expiryDate.trim(), batch_number: batchNumber.trim() || undefined }
          : {}),
        notes: notes.trim() || undefined,
      })
      const verb = mode === 'in' ? 'Stock in' : 'Stock out'
      setSuccess(`${verb} recorded. New on-hand: ${created?.new_quantity ?? '—'}.`)
      setQuery('')
      setResults([])
      setSelected(null)
      setAvailable(null)
      setQuantity('')
      setUnitCost('')
      setExpiryDate('')
      setBatchNumber('')
      setNotes('')
    } catch (err: any) {
      const queued = !!err && (err.queuedOffline === true || (err.message && /saved to the sync queue/i.test(err.message)))
      if (queued) {
        Alert.alert('Saved offline', 'This stock movement will be recorded when you reconnect.')
        setQuery('')
        setResults([])
        setSelected(null)
        setAvailable(null)
        setQuantity('')
        setUnitCost('')
        setExpiryDate('')
        setBatchNumber('')
        setNotes('')
        return
      }
      setError(toMessage(err, 'Failed to record the transaction.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.toggle}>
          {(['in', 'out'] as const).map((value) => {
            const active = mode === value
            return (
              <Pressable
                key={value}
                onPress={() => void changeMode(value)}
                style={[styles.toggleButton, active && styles.toggleButtonActive]}
              >
                <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                  {value === 'in' ? 'Stock In' : 'Stock Out'}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <Text style={styles.label}>Product</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, styles.searchInput]}
            value={query}
            onChangeText={setQuery}
            placeholder="Barcode, SKU or name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => void runSearch(query)}
          />
          <Pressable
            style={styles.secondaryButton}
            onPress={() => void runSearch(query)}
            disabled={searching}
          >
            <Text style={styles.secondaryButtonText}>{searching ? '…' : 'Search'}</Text>
          </Pressable>
          <Pressable style={styles.scanButton} onPress={() => setScannerOpen(true)}>
            <Text style={styles.scanButtonText}>Scan</Text>
          </Pressable>
        </View>

        {results.length > 0 ? (
          <View style={styles.resultList}>
            {results.map((product) => (
              <Pressable
                key={product.product_id}
                style={styles.resultRow}
                onPress={() => void chooseProduct(product)}
              >
                <Text style={styles.resultName}>{product.product_name}</Text>
                <Text style={styles.resultMeta}>
                  {product.sku}
                  {product.barcode ? ` • ${product.barcode}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {selected ? (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{selected.product_name}</Text>
                <Text style={styles.cardMeta}>
                  {selected.sku}
                  {selected.barcode ? ` • ${selected.barcode}` : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setSelected(null)
                  setResults([])
                  setAvailable(null)
                }}
              >
                <Text style={styles.changeText}>Change</Text>
              </Pressable>
            </View>
            {mode === 'out' ? (
              <Text style={styles.availableText}>
                Available:{' '}
                <Text
                  style={{
                    fontWeight: '700',
                    color:
                      available === null
                        ? colors.textMuted
                        : available <= 0
                          ? colors.danger
                          : colors.success,
                  }}
                >
                  {available === null ? '—' : available}
                </Text>
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.label}>Quantity *</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />

        {mode === 'in' ? (
          <>
            <Text style={styles.label}>Unit cost (optional)</Text>
            <TextInput
              style={styles.input}
              value={unitCost}
              onChangeText={setUnitCost}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
          </>
        ) : null}

        {mode === 'in' && selected?.expiry_required ? (
          <>
            <Text style={styles.label}>Expiry date * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="2026-12-31"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <Text style={styles.label}>Batch / lot number (optional)</Text>
            <TextInput
              style={styles.input}
              value={batchNumber}
              onChangeText={setBatchNumber}
              placeholder="e.g. LOT-2026-A"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />
          </>
        ) : null}

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          placeholder={mode === 'in' ? 'Supplier reference, reason…' : 'Reason (waste, damage, return)…'}
          placeholderTextColor={colors.textMuted}
          multiline
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <Pressable
          style={[styles.submit, (submitting || !selected) && styles.submitDisabled]}
          onPress={() => void onSubmit()}
          disabled={submitting || !selected}
        >
          {submitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.submitText}>
              {mode === 'in' ? 'Record Stock In' : 'Record Stock Out'}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      <BarcodeScanner
        visible={scannerOpen}
        onScanned={handleScanned}
        onClose={() => setScannerOpen(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  toggleButtonActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textMuted },
  toggleTextActive: { color: colors.surface },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
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
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  searchInput: { flex: 1 },
  secondaryButton: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: { fontSize: fontSize.md, color: colors.text },
  scanButton: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  scanButtonText: { fontSize: fontSize.md, color: colors.surface, fontWeight: '600' },
  resultList: { marginTop: spacing.sm },
  resultRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  resultName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  resultMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  changeText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  availableText: { fontSize: fontSize.md, color: colors.text, marginTop: spacing.sm },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.md },
  success: { color: colors.success, fontSize: fontSize.sm, marginTop: spacing.md },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.surface, fontSize: fontSize.md, fontWeight: '700' },
})
