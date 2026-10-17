import { useCallback, useEffect, useState } from 'react'
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
import { useLocalSearchParams } from 'expo-router'
import * as api from '@/services/api'
import type { Sale, SaleItem, SalePayment } from '@/services/api'
import { isQueuedOffline } from '@/services/offline'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/config/permissions'
import { PermissionGate } from '@/components/PermissionGate'
import { useCurrency } from '@/hooks/useCurrency'
import { useReceiptView } from '@/hooks/useReceiptView'
import { ReceiptCard } from '@/components/ReceiptCard'
import { printReceipt, shareReceiptPdf } from '@/lib/printReceipt'
import { printSaleReceipt } from '@/lib/printing'
import { colors, fontSize, radius, spacing } from '@/theme/theme'

function toMessage(err: unknown, fallback: string): string {
  return api.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback
}

/** Message for a non-API error (e.g. from expo-print / expo-sharing). */
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export default function SaleDetailRoute() {
  return (
    <PermissionGate permission={PERMISSIONS.sales}>
      <SaleDetail />
    </PermissionGate>
  )
}

function SaleDetail() {
  const params = useLocalSearchParams<{ saleId?: string | string[] }>()
  const saleId = Array.isArray(params.saleId) ? params.saleId[0] : params.saleId
  const { hasPermission } = useAuth()
  const { formatMoney } = useCurrency()

  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [payments, setPayments] = useState<SalePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [acting, setActing] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [printing, setPrinting] = useState(false)
  const [receiptLayout, setReceiptLayout] = useState<'58mm' | '80mm'>('80mm')
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null)

  // This screen already loads `/sales/:id/receipt` in `load()`, so reuse that
  // receipt number rather than calling the endpoint (which inserts a row) twice.
  const view = useReceiptView({
    sale,
    payments,
    layout: receiptLayout,
    receiptNumber,
    fetchReceipt: false,
  })

  const load = useCallback(async () => {
    if (!saleId) return
    try {
      // Payments are only exposed by the receipt endpoint (web does the same).
      const [detail, receipt] = await Promise.all([
        api.getSaleById(saleId).catch(() => null),
        api.getSaleReceipt(saleId).catch(() => null),
      ])
      const resolved = receipt?.sale ?? detail
      if (!resolved) {
        setSale(null)
        setItems([])
        setPayments([])
        setReceiptNumber(null)
        setError('Sale not found.')
      } else {
        setSale(resolved)
        setItems(resolved.items ?? [])
        setPayments(resolved.payments ?? [])
        setReceiptNumber(receipt?.receipt?.receipt_number ?? null)
        setError(null)
      }
    } catch (err) {
      setError(toMessage(err, 'Failed to load the sale.'))
    } finally {
      setLoading(false)
    }
  }, [saleId])

  useEffect(() => {
    void (async () => {
      await load()
    })()
  }, [load])

  const canVoid =
    hasPermission(PERMISSIONS.voidSale) &&
    !!sale &&
    sale.status !== 'VOID' &&
    sale.status !== 'REFUNDED'

  function confirmVoid() {
    Alert.alert('Void sale', 'This restores stock and marks the sale void. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Void', style: 'destructive', onPress: () => void doVoid() },
    ])
  }

  async function doVoid() {
    if (!saleId) return
    setActing(true)
    setError(null)
    setFeedback(null)
    try {
      await api.voidSale(saleId)
      setFeedback('Sale voided.')
      await load()
    } catch (err) {
      if (isQueuedOffline(err)) {
        setFeedback('Saved offline. This void will sync when you reconnect.')
      } else {
        setError(toMessage(err, 'Failed to void the sale.'))
      }
    } finally {
      setActing(false)
    }
  }

  async function doRefund() {
    if (!saleId) return
    setActing(true)
    setError(null)
    setFeedback(null)
    try {
      await api.refundSale(saleId, {
        amount: refundAmount ? parseFloat(refundAmount) : undefined,
        reason: refundReason.trim() || undefined,
      })
      setFeedback('Sale refunded.')
      setRefundOpen(false)
      setRefundAmount('')
      setRefundReason('')
      await load()
    } catch (err) {
      if (isQueuedOffline(err)) {
        setFeedback('Saved offline. This refund will sync when you reconnect.')
        setRefundOpen(false)
        setRefundAmount('')
        setRefundReason('')
      } else {
        setError(toMessage(err, 'Failed to refund the sale.'))
      }
    } finally {
      setActing(false)
    }
  }

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

  if (loading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      </View>
    )
  }

  if (!sale) {
    return (
      <View style={styles.screen}>
        <Text style={styles.error}>{error ?? 'Sale not found.'}</Text>
      </View>
    )
  }

  const change = Math.max(Number(sale.amount_paid) - Number(sale.total_amount), 0)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.invoice}>{sale.invoice_number ?? sale.sale_id.slice(0, 8)}</Text>
          <Text style={styles.status}>{sale.status}</Text>
        </View>
        <InfoRow label="Date" value={formatDate(sale.sale_date)} />
        <InfoRow label="Type" value={sale.sale_type} />
        <InfoRow label="Customer" value={sale.customer_name || 'Walk-in'} />
        <InfoRow label="Cashier" value={sale.cashier_name || '—'} />
        {sale.remarks ? <InfoRow label="Remarks" value={sale.remarks} /> : null}
      </View>

      <Text style={styles.sectionTitle}>Items</Text>
      <View style={styles.card}>
        {items.length === 0 ? (
          <Text style={styles.empty}>No items.</Text>
        ) : (
          items.map((item, index) => (
            <View key={item.sale_item_id ?? `${item.product_id}-${index}`} style={styles.itemRow}>
              <View style={styles.flex}>
                <Text style={styles.itemName}>{item.product_name ?? item.product_id}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} × {formatMoney(Number(item.unit_price))}
                  {Number(item.line_discount) > 0
                    ? ` • -${formatMoney(Number(item.line_discount))}`
                    : ''}
                  {Number(item.tax_amount) > 0
                    ? ` • tax ${formatMoney(Number(item.tax_amount))}`
                    : ''}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatMoney(Number(item.line_total ?? 0))}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>Totals</Text>
      <View style={styles.card}>
        <InfoRow label="Subtotal" value={formatMoney(Number(sale.subtotal))} />
        <InfoRow label="Discount" value={`-${formatMoney(Number(sale.discount_amount))}`} />
        <InfoRow label="Tax" value={formatMoney(Number(sale.tax_amount))} />
        <InfoRow label="Total" value={formatMoney(Number(sale.total_amount))} emphasis />
        <InfoRow label="Paid" value={formatMoney(Number(sale.amount_paid))} />
        {change > 0 ? <InfoRow label="Change" value={formatMoney(change)} /> : null}
        {Number(sale.refunded_amount) > 0 ? (
          <InfoRow label="Refunded" value={formatMoney(Number(sale.refunded_amount))} />
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Payments</Text>
      <View style={styles.card}>
        {payments.length === 0 ? (
          <Text style={styles.empty}>No payments recorded.</Text>
        ) : (
          payments.map((payment, index) => (
            <View key={payment.payment_id ?? index} style={styles.itemRow}>
              <Text style={styles.flex}>{payment.payment_method}</Text>
              <Text style={styles.itemTotal}>{formatMoney(Number(payment.amount))}</Text>
            </View>
          ))
        )}
      </View>

      {feedback ? <Text style={styles.success}>{feedback}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>Receipt</Text>
      <View style={styles.card}>
        {view ? (
          <View style={styles.receiptPreview}>
            <ReceiptCard view={view} />
          </View>
        ) : null}
        <View style={styles.layoutRow}>
          {(['58mm', '80mm'] as const).map((opt) => {
            const active = receiptLayout === opt
            return (
              <Pressable
                key={opt}
                style={[styles.layoutChip, active && styles.layoutChipActive]}
                onPress={() => setReceiptLayout(opt)}
              >
                <Text style={[styles.layoutChipText, active && styles.layoutChipTextActive]}>
                  {opt}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Pressable
          style={[styles.actionButton, styles.printButton, styles.receiptAction]}
          onPress={() => void handlePrint()}
          disabled={printing}
        >
          {printing ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.printText}>Print receipt</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.refundButton, styles.receiptAction]}
          onPress={() => void handleShare()}
          disabled={printing}
        >
          <Text style={styles.refundText}>Share PDF</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.refundButton, styles.receiptAction]}
          onPress={() => void handleSystemPrint()}
          disabled={printing}
        >
          <Text style={styles.refundText}>System print (PDF)</Text>
        </Pressable>
      </View>

      {canVoid ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.voidButton]}
            onPress={confirmVoid}
            disabled={acting}
          >
            <Text style={styles.voidText}>Void</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.refundButton]}
            onPress={() => setRefundOpen((open) => !open)}
            disabled={acting}
          >
            <Text style={styles.refundText}>{refundOpen ? 'Cancel refund' : 'Refund'}</Text>
          </Pressable>
        </View>
      ) : null}

      {canVoid && refundOpen ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Refund</Text>
          <TextInput
            style={styles.input}
            value={refundAmount}
            onChangeText={setRefundAmount}
            placeholder="Amount (blank = full)"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, styles.inputSpaced]}
            value={refundReason}
            onChangeText={setRefundReason}
            placeholder="Reason (optional)"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable
            style={[styles.actionButton, styles.refundButton, styles.refundSubmit]}
            onPress={() => void doRefund()}
            disabled={acting}
          >
            {acting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.refundSubmitText}>Submit refund</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  )
}

function InfoRow({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={emphasis ? styles.infoLabelEmphasis : styles.infoLabel}>{label}</Text>
      <Text style={emphasis ? styles.infoValueEmphasis : styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  flex: { flex: 1 },
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
  invoice: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  status: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  infoValue: { fontSize: fontSize.sm, color: colors.text },
  infoLabelEmphasis: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  infoValueEmphasis: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  sectionTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  empty: { fontSize: fontSize.sm, color: colors.textMuted },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  itemName: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  itemMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  itemTotal: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  success: { color: colors.success, fontSize: fontSize.sm, marginBottom: spacing.sm },
  error: { color: colors.danger, fontSize: fontSize.sm, margin: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  voidButton: { borderWidth: 1, borderColor: colors.danger },
  voidText: { color: colors.danger, fontSize: fontSize.md, fontWeight: '600' },
  refundButton: { borderWidth: 1, borderColor: colors.primary },
  refundText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
  refundSubmit: { backgroundColor: colors.primary, borderColor: colors.primary, marginTop: spacing.md },
  refundSubmitText: { color: colors.surface, fontSize: fontSize.md, fontWeight: '700' },
  layoutRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  receiptPreview: { marginBottom: spacing.md },
  layoutChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  layoutChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  layoutChipText: { fontSize: fontSize.sm, color: colors.text },
  layoutChipTextActive: { color: colors.surface, fontWeight: '700' },
  printButton: { backgroundColor: colors.primary, borderColor: colors.primary },
  printText: { color: colors.surface, fontSize: fontSize.md, fontWeight: '700' },
  receiptAction: { marginTop: spacing.sm },
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
  inputSpaced: { marginTop: spacing.sm },
})
