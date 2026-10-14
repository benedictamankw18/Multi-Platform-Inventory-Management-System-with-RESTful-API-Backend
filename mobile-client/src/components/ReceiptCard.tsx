import { Image, Platform, StyleSheet, Text, View } from 'react-native'
import type { ReceiptView } from '@/lib/receiptModel'
import { receiptMoney } from '@/lib/receiptModel'
import { code128Bars } from '@/lib/code128'
import { colors, fontSize, spacing } from '@/theme/theme'

/**
 * On-screen preview of a receipt.
 *
 * Renders the same blocks as the PDF share and the thermal print output (see
 * `lib/receipt.ts` and `lib/printing/escpos.ts`), so what the cashier sees is
 * what comes out of the printer. The 58 mm layout simply narrows the card.
 */

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })

function Row({
  label,
  value,
  muted,
  emphasis,
  bordered,
}: {
  label: string
  value: string
  muted?: boolean
  emphasis?: boolean
  bordered?: boolean
}) {
  return (
    <View style={[styles.row, bordered && styles.rowBordered]}>
      <Text style={[styles.rowLabel, muted && styles.rowMuted, emphasis && styles.rowEmphasis]}>
        {label}
      </Text>
      <Text style={[styles.rowValue, muted && styles.rowMuted, emphasis && styles.rowEmphasis]}>
        {value}
      </Text>
    </View>
  )
}

/**
 * 1D CODE128 barcode for the invoice number, drawn as flex-sized bars so it
 * fills the card width. Same symbol as the PDF share and the web/desktop
 * receipt, with the value printed beneath.
 */
function Barcode({ value }: { value: string }) {
  const barcode = code128Bars(value)
  if (!barcode) return null
  return (
    <View style={styles.barcode}>
      <View style={styles.barcodeBars}>
        {barcode.widths.map((width, index) => (
          <View
            key={index}
            style={[styles.barcodeBar, { flexGrow: width }, index % 2 !== 0 && styles.barcodeSpace]}
          />
        ))}
      </View>
      <Text style={styles.barcodeValue}>{barcode.value}</Text>
    </View>
  )
}

export function ReceiptCard({ view }: { view: ReceiptView }) {
  const cur = view.business.currency
  const money = (value: unknown) => receiptMoney(value, cur)

  const info = [
    { label: 'Invoice', value: view.invoiceNumber },
    ...(view.receiptNumber ? [{ label: 'Receipt', value: view.receiptNumber }] : []),
    ...(view.date ? [{ label: 'Date', value: view.date }] : []),
    ...(view.cashier ? [{ label: 'Cashier', value: view.cashier }] : []),
    ...(view.customer ? [{ label: 'Customer', value: view.customer }] : []),
    ...(view.paymentStatus ? [{ label: 'Payment', value: view.paymentStatus }] : []),
  ]

  return (
    <View style={[styles.card, view.layout === '58mm' && styles.card58]}>
      <View style={styles.header}>
        {view.business.logo ? (
          <Image source={{ uri: view.business.logo }} style={styles.logo} resizeMode="contain" />
        ) : null}
        <Text style={styles.businessName}>{view.business.name.toUpperCase()}</Text>
        {view.business.address ? <Text style={styles.meta}>{view.business.address}</Text> : null}
        {view.business.phone ? <Text style={styles.meta}>{view.business.phone}</Text> : null}
        {view.business.taxNumber ? <Text style={styles.meta}>TIN: {view.business.taxNumber}</Text> : null}
        {view.business.registrationNumber ? (
          <Text style={styles.meta}>Reg: {view.business.registrationNumber}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        {info.map((entry) => (
          <Row key={entry.label} label={entry.label} value={entry.value} />
        ))}
      </View>

      <View style={styles.section}>
        {view.lines.length === 0 ? (
          <Text style={styles.empty}>(no items)</Text>
        ) : (
          view.lines.map((line, index) => (
            <View key={`${line.name}-${index}`} style={styles.item}>
              <Text style={styles.itemName}>{line.name}</Text>
              <Row
                muted
                label={`${line.quantity}${line.uom ? ` ${line.uom}` : ''} × ${money(line.unitPrice)}`}
                value={money(line.lineTotal)}
              />
            </View>
          ))
        )}
      </View>

      <View style={styles.sectionDash}>
        <Row label="Subtotal" value={money(view.subtotal)} />
        {view.discount > 0 ? <Row label="Discount" value={`-${money(view.discount)}`} /> : null}
        {view.tax > 0 ? <Row label="Tax" value={money(view.tax)} /> : null}
        <Row label="TOTAL" value={money(view.total)} emphasis bordered />
        {view.refunded > 0 ? <Row label="Refunded" value={money(view.refunded)} /> : null}
      </View>

      <View style={styles.sectionDash}>
        {view.payments.map((payment, index) => (
          <Row key={`${payment.method}-${index}`} label={payment.method} value={money(payment.amount)} />
        ))}
        <Row label="Total Paid" value={money(view.totalPaid)} emphasis bordered />
        {view.balanceDue > 0 ? <Row label="Balance Due" value={money(view.balanceDue)} /> : null}
        {view.change > 0 ? <Row label="Change" value={money(view.change)} /> : null}
      </View>

      <Barcode value={view.invoiceNumber} />

      {view.business.footer ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>{view.business.footer}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  card58: { maxWidth: 260, alignSelf: 'center', width: '100%' },
  header: { alignItems: 'center', marginBottom: spacing.xs },
  logo: { width: 96, height: 48, marginBottom: 2 },
  businessName: {
    fontFamily: mono,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  meta: { fontFamily: mono, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
  section: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.xs },
  sectionDash: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
    paddingVertical: spacing.xs,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 1 },
  rowBordered: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xs, marginTop: spacing.xs },
  rowLabel: { fontFamily: mono, fontSize: fontSize.sm, color: colors.text, flexShrink: 1, paddingRight: spacing.sm },
  rowValue: { fontFamily: mono, fontSize: fontSize.sm, color: colors.text },
  rowMuted: { color: colors.textMuted },
  rowEmphasis: { fontWeight: '700', fontSize: fontSize.md },
  item: { marginBottom: spacing.xs },
  itemName: { fontFamily: mono, fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  empty: { fontFamily: mono, fontSize: fontSize.sm, color: colors.textMuted },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    alignItems: 'center',
  },
  footerText: { fontFamily: mono, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
  barcode: { paddingVertical: spacing.xs },
  barcodeBars: { flexDirection: 'row', alignItems: 'flex-end', height: 40 },
  barcodeBar: { flexBasis: 0, height: '100%', backgroundColor: '#000' },
  barcodeSpace: { backgroundColor: 'transparent' },
  barcodeValue: { fontFamily: mono, fontSize: 12, color: colors.text, textAlign: 'center', marginTop: 2 },
})
