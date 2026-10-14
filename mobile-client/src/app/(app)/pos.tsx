import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Crypto from 'expo-crypto'
import * as api from '@/services/api'
import type { PaymentMethod, Product, Sale } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/config/permissions'
import { PermissionGate } from '@/components/PermissionGate'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { getDeviceId } from '@/services/secureTokens'
import { useCurrency } from '@/hooks/useCurrency'
import { useReceiptView } from '@/hooks/useReceiptView'
import { ReceiptCard } from '@/components/ReceiptCard'
import { printReceipt, shareReceiptPdf } from '@/lib/printReceipt'
import { printSaleReceipt } from '@/lib/printing'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

type CartLine = {
  product: Product
  quantity: number
  unit_price: number
  line_discount: number
  tax_amount: number
}

type PaymentEntry = { method: PaymentMethod; amount: number }

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT', label: 'Credit' },
]

const MAX_QUANTITY = 1000000

/** Wholesale price when the quantity crosses the product's threshold, else retail. */
function getEffectivePrice(product: Product, quantity: number): number {
  const wholesalePrice = Number(product.wholesale_price) || 0
  const wholesaleMinQty = Number(product.wholesale_min_qty) || 0
  const retailPrice = Number(product.retail_price) || 0
  if (wholesalePrice > 0 && wholesaleMinQty > 0 && quantity >= wholesaleMinQty) {
    return wholesalePrice
  }
  return retailPrice || wholesalePrice
}

/** Line discount from `discount_percentage`, then tax from `tax_rate` — matches web/desktop. */
function computeLine(product: Product, quantity: number, unitPrice: number) {
  const discountPct = Number(product.discount_percentage) || 0
  const taxRate = Number(product.tax_rate) || 0
  const gross = quantity * unitPrice
  const lineDiscount = gross * (discountPct / 100)
  const afterDiscount = gross - lineDiscount
  const taxAmount = afterDiscount * (taxRate / 100)
  return { unit_price: unitPrice, line_discount: lineDiscount, tax_amount: taxAmount }
}

function toMessage(err: unknown, fallback: string): string {
  return api.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback
}

/** Message for a non-API error (e.g. from expo-print / expo-sharing). */
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

export default function PosRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.createSale}>
      <PosView />
    </PermissionGate>
  )
}

function PosView() {
  const { user, selectedBranch } = useAuth()

  const { formatMoney: money } = useCurrency()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [newPaymentAmount, setNewPaymentAmount] = useState('')
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>('CASH')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const [pendingTxnId, setPendingTxnId] = useState<string | null>(null)

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const totalDiscount = cart.reduce((sum, item) => sum + item.line_discount, 0)
  const totalTax = cart.reduce((sum, item) => sum + item.tax_amount, 0)
  const total = subtotal - totalDiscount + totalTax
  const paid = payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = Math.max(total - paid, 0)
  const change = paid > total ? paid - total : 0
  const canComplete = cart.length > 0 && paid >= total && !submitting

  const saleType: 'RETAIL' | 'WHOLESALE' = cart.some((item) => {
    const price = Number(item.product.wholesale_price) || 0
    const minQty = Number(item.product.wholesale_min_qty) || 0
    return price > 0 && minQty > 0 && item.quantity >= minQty
  })
    ? 'WHOLESALE'
    : 'RETAIL'

  function resetSale() {
    setCart([])
    setPayments([])
    setNewPaymentAmount('')
    setCustomerName('')
    setQuery('')
    setResults([])
    setError(null)
    setPendingTxnId(null)
    setLastSale(null)
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.product_id === product.product_id)
      if (existing) {
        const quantity = Math.min(existing.quantity + 1, MAX_QUANTITY)
        const unitPrice = getEffectivePrice(product, quantity)
        return prev.map((item) =>
          item.product.product_id === product.product_id
            ? { product, quantity, ...computeLine(product, quantity, unitPrice) }
            : item,
        )
      }
      const unitPrice = getEffectivePrice(product, 1)
      return [...prev, { product, quantity: 1, ...computeLine(product, 1, unitPrice) }]
    })
    setQuery('')
    setResults([])
    setError(null)
  }

  function changeQuantity(productId: string, next: number) {
    setCart((prev) => {
      if (next <= 0) return prev.filter((item) => item.product.product_id !== productId)
      const quantity = Math.min(Math.round(next), MAX_QUANTITY)
      return prev.map((item) => {
        if (item.product.product_id !== productId) return item
        const unitPrice = getEffectivePrice(item.product, quantity)
        return { ...item, quantity, ...computeLine(item.product, quantity, unitPrice) }
      })
    })
    setError(null)
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.product_id !== productId))
  }

  async function runSearch(raw: string) {
    const q = raw.trim()
    if (!q || !selectedBranch) return
    setSearching(true)
    setError(null)
    try {
      const res = await api.searchProducts({ q, limit: 20, branchId: selectedBranch.branch_id })
      const list = res.products ?? []
      const lower = q.toLowerCase()
      const exact = list.find((product) => product.barcode?.toLowerCase() === lower)
      if (exact) {
        addToCart(exact)
      } else if (list.length === 0) {
        setResults([])
        setError('No products matched that search.')
      } else {
        setResults(list)
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

  function addPayment() {
    const amount = Math.round((parseFloat(newPaymentAmount) || 0) * 100) / 100
    if (amount <= 0) return
    setPayments((prev) => [...prev, { method: newPaymentMethod, amount }])
    setNewPaymentAmount('')
  }

  function addRemaining(method: PaymentMethod) {
    if (remaining <= 0) return
    setPayments((prev) => [...prev, { method, amount: remaining }])
  }

  function removePayment(index: number) {
    setPayments((prev) => prev.filter((_, i) => i !== index))
  }

  async function completeSale() {
    setError(null)
    if (!selectedBranch) {
      setError('No branch selected.')
      return
    }
    if (cart.length === 0) {
      setError('Add at least one product.')
      return
    }
    if (paid < total) {
      setError('Payments do not cover the total.')
      return
    }

    // One idempotency key per cart: reused if the cashier retries after a failure.
    let txnId = pendingTxnId
    if (!txnId) {
      txnId = Crypto.randomUUID()
      setPendingTxnId(txnId)
    }

    setSubmitting(true)
    try {
      const deviceId = await getDeviceId()
      const sale = await api.createSale({
        branch_id: selectedBranch.branch_id,
        customer_name: customerName.trim() || undefined,
        cashier_id: user?.userId,
        cashier_name: user?.fullName,
        sale_type: saleType,
        discount_amount: totalDiscount,
        tax_amount: totalTax,
        device_id: deviceId,
        local_transaction_id: txnId,
        items: cart.map((item) => ({
          product_id: item.product.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          uom_id:
            Number(item.product.wholesale_min_qty) > 0 &&
            item.quantity >= Number(item.product.wholesale_min_qty) &&
            item.product.wholesale_uom_id
              ? item.product.wholesale_uom_id
              : item.product.base_uom_id,
          cost_price: item.product.cost_price,
          line_discount: item.line_discount,
          tax_amount: item.tax_amount,
        })),
        payments: payments.map((p) => ({ amount: p.amount, payment_method: p.method })),
      })
      setLastSale(sale)
      setCart([])
      setPayments([])
      setNewPaymentAmount('')
      setCustomerName('')
      setPendingTxnId(null)
    } catch (err) {
      setError(toMessage(err, 'Failed to complete the sale.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (lastSale) {
    return <Receipt sale={lastSale} onNewSale={resetSale} />
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Add product</Text>
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
                onPress={() => addToCart(product)}
              >
                <View style={styles.flex}>
                  <Text style={styles.resultName}>{product.product_name}</Text>
                  <Text style={styles.resultMeta}>
                    {product.sku}
                    {product.barcode ? ` • ${product.barcode}` : ''}
                  </Text>
                </View>
                <Text style={styles.resultPrice}>{money(getEffectivePrice(product, 1))}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>Cart</Text>
        {cart.length === 0 ? (
          <Text style={styles.empty}>No items yet. Search or scan to add products.</Text>
        ) : (
          cart.map((item) => (
            <View key={item.product.product_id} style={styles.cartRow}>
              <View style={styles.flex}>
                <Text style={styles.cartName}>{item.product.product_name}</Text>
                <Text style={styles.cartMeta}>
                  {money(item.unit_price)} each
                  {item.line_discount > 0 ? ` • -${money(item.line_discount)} disc` : ''}
                  {item.tax_amount > 0 ? ` • ${money(item.tax_amount)} tax` : ''}
                </Text>
                <View style={styles.qtyRow}>
                  <Pressable
                    style={styles.qtyButton}
                    onPress={() => changeQuantity(item.product.product_id, item.quantity - 1)}
                  >
                    <Text style={styles.qtyButtonText}>−</Text>
                  </Pressable>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                  <Pressable
                    style={styles.qtyButton}
                    onPress={() => changeQuantity(item.product.product_id, item.quantity + 1)}
                  >
                    <Text style={styles.qtyButtonText}>+</Text>
                  </Pressable>
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => removeFromCart(item.product.product_id)}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.cartTotal}>
                {money(item.quantity * item.unit_price - item.line_discount + item.tax_amount)}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.label}>Customer (optional)</Text>
        <TextInput
          style={styles.input}
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Walk-in"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Totals</Text>
        <View style={styles.totalsCard}>
          <TotalRow label="Subtotal" value={money(subtotal)} />
          <TotalRow label="Discount" value={`-${money(totalDiscount)}`} />
          <TotalRow label="Tax" value={money(totalTax)} />
          <TotalRow label="Total" value={money(total)} emphasis />
          <TotalRow label="Paid" value={money(paid)} />
          <TotalRow label="Remaining" value={money(remaining)} />
          {change > 0 ? <TotalRow label="Change" value={money(change)} success /> : null}
        </View>

        <Text style={styles.label}>Payments</Text>
        {payments.map((payment, index) => (
          <View key={`${payment.method}-${index}`} style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>{labelForMethod(payment.method)}</Text>
            <Text style={styles.paymentAmount}>{money(payment.amount)}</Text>
            <Pressable onPress={() => removePayment(index)}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, styles.searchInput]}
            value={newPaymentAmount}
            onChangeText={setNewPaymentAmount}
            placeholder="Amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <Pressable style={styles.secondaryButton} onPress={addPayment}>
            <Text style={styles.secondaryButtonText}>Add</Text>
          </Pressable>
        </View>
        <View style={styles.methodRow}>
          {PAYMENT_METHODS.map((method) => {
            const active = newPaymentMethod === method.value
            return (
              <Pressable
                key={method.value}
                style={[styles.methodChip, active && styles.methodChipActive]}
                onPress={() => setNewPaymentMethod(method.value)}
              >
                <Text style={[styles.methodChipText, active && styles.methodChipTextActive]}>
                  {method.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        {remaining > 0 ? (
          <Pressable style={styles.remainingButton} onPress={() => addRemaining(newPaymentMethod)}>
            <Text style={styles.remainingButtonText}>
              Add remaining {money(remaining)} ({labelForMethod(newPaymentMethod)})
            </Text>
          </Pressable>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.submit, !canComplete && styles.submitDisabled]}
          onPress={() => void completeSale()}
          disabled={!canComplete}
        >
          {submitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.submitText}>Complete Sale</Text>
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

function labelForMethod(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((entry) => entry.value === method)?.label ?? method
}

function TotalRow({
  label,
  value,
  emphasis,
  success,
}: {
  label: string
  value: string
  emphasis?: boolean
  success?: boolean
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={emphasis ? styles.grandLabel : styles.totalLabel}>{label}</Text>
      <Text
        style={[
          styles.totalValue,
          emphasis && styles.grandValue,
          success && styles.changeValue,
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

function Receipt({ sale, onNewSale }: { sale: Sale; onNewSale: () => void }) {
  const [layout, setLayout] = useState<'58mm' | '80mm'>('80mm')
  const [printing, setPrinting] = useState(false)
  const view = useReceiptView({ sale, payments: sale.payments ?? [], layout })

  async function handlePrint() {
    if (!view) return
    setPrinting(true)
    const outcome = await printSaleReceipt(view)
    setPrinting(false)
    if (!outcome.ok) {
      Alert.alert(
        'Print failed',
        `${outcome.message}\n\nOpen "Printer settings" from the More tab to choose a printer.`,
      )
    }
  }

  async function handleShare() {
    if (!view) return
    try {
      setPrinting(true)
      await shareReceiptPdf(view)
    } catch (err) {
      Alert.alert('Share failed', errorMessage(err, 'Could not share the receipt PDF.'))
    } finally {
      setPrinting(false)
    }
  }

  async function handleSystemPrint() {
    if (!view) return
    try {
      setPrinting(true)
      await printReceipt(view)
    } catch (err) {
      Alert.alert('Print failed', errorMessage(err, 'Could not open the system print dialog.'))
    } finally {
      setPrinting(false)
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {view ? <ReceiptCard view={view} /> : null}

      <View style={styles.methodRow}>
        {[
          { value: '58mm' as const, label: '58mm' },
          { value: '80mm' as const, label: '80mm' },
        ].map((opt) => {
          const active = layout === opt.value
          return (
            <Pressable
              key={opt.value}
              style={[styles.methodChip, active && styles.methodChipActive]}
              onPress={() => setLayout(opt.value)}
            >
              <Text style={[styles.methodChipText, active && styles.methodChipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <Pressable style={styles.submit} onPress={() => void handlePrint()} disabled={printing}>
        {printing ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.submitText}>Print receipt</Text>}
      </Pressable>
      <Pressable style={[styles.submit, { marginTop: spacing.sm }]} onPress={() => void handleShare()} disabled={printing}>
        {printing ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.submitText}>Share PDF</Text>}
      </Pressable>
      <Pressable
        style={[styles.submit, { marginTop: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
        onPress={() => void handleSystemPrint()}
        disabled={printing}
      >
        <Text style={[styles.submitText, { color: colors.text }]}>System print (PDF)</Text>
      </Pressable>
      <Pressable style={[styles.submit, { marginTop: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={onNewSale}>
        <Text style={[styles.submitText, { color: colors.text }]}>New Sale</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  flex: { flex: 1 },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  resultName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  resultMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  resultPrice: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  empty: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.sm },
  cartRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  cartName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  cartMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: { fontSize: fontSize.lg, color: colors.text, lineHeight: fontSize.lg },
  qtyValue: { minWidth: 28, textAlign: 'center', fontSize: fontSize.md, color: colors.text },
  removeButton: { marginLeft: spacing.sm },
  removeText: { fontSize: fontSize.sm, color: colors.danger, fontWeight: '600' },
  cartTotal: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  totalsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  totalLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  totalValue: { fontSize: fontSize.sm, color: colors.text },
  grandLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  grandValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  changeValue: { color: colors.success, fontWeight: '700' },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  paymentLabel: { flex: 1, fontSize: fontSize.md, color: colors.text },
  paymentAmount: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  methodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  methodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodChipText: { fontSize: fontSize.sm, color: colors.text },
  methodChipTextActive: { color: colors.surface, fontWeight: '600' },
  remainingButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  remainingButtonText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.md },
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
