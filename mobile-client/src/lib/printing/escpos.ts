/**
 * printing/escpos.ts
 *
 * Turns a `ReceiptView` into the tagged-text payload that
 * `react-native-thermal-receipt-printer` sends to an ESC/POS printer.
 *
 * This file is intentionally pure (no native imports) so it can be unit-tested
 * and type-checked anywhere. Tags such as `<C>` centre text on Android; the
 * library strips them on iOS, where the printer layout is left-aligned.
 *
 * Column widths follow the common ESC/POS fonts: 32 columns at 58 mm and
 * 48 columns at 80 mm.
 */

import type { ReceiptView } from '@/lib/receiptModel'
import { receiptMoney } from '@/lib/receiptModel'
import type { ReceiptLayout } from './types'

const COLUMNS: Record<ReceiptLayout, number> = { '58mm': 32, '80mm': 48 }

const money = (value: unknown, currency: string | null): string => receiptMoney(value, currency)

function repeat(char: string, cols: number): string {
  return char.repeat(cols)
}

function padRight(value: string, width: number): string {
  const s = String(value)
  if (s.length >= width) return s.slice(0, width)
  return s + ' '.repeat(width - s.length)
}

/** `left` padded so `right` sits flush against the right column. */
function twoCols(left: string, right: string, cols: number): string {
  const r = String(right)
  const leftWidth = Math.max(cols - r.length - 1, 1)
  return padRight(left, leftWidth) + ' ' + r
}

const center = (text: string): string => `<C>${text}</C>`

export function buildReceiptText(view: ReceiptView): string {
  const cols = COLUMNS[view.layout]
  const currency = view.business.currency
  const lines: string[] = []

  // Header
  lines.push(center(view.business.name.toUpperCase()))
  if (view.business.address) lines.push(center(view.business.address))
  if (view.business.phone) lines.push(center(view.business.phone))
  if (view.business.taxNumber) lines.push(center(`TIN: ${view.business.taxNumber}`))
  if (view.business.registrationNumber) lines.push(center(`Reg: ${view.business.registrationNumber}`))

  lines.push(repeat('-', cols))

  // Sale info
  lines.push(twoCols('Invoice:', view.invoiceNumber, cols))
  if (view.receiptNumber) lines.push(twoCols('Receipt:', view.receiptNumber, cols))
  if (view.date) lines.push(twoCols('Date:', view.date, cols))
  if (view.cashier) lines.push(twoCols('Cashier:', view.cashier, cols))
  if (view.customer) lines.push(twoCols('Customer:', view.customer, cols))
  if (view.paymentStatus) lines.push(twoCols('Payment:', view.paymentStatus, cols))

  lines.push(repeat('-', cols))

  // Items
  if (view.lines.length === 0) {
    lines.push('(no items)')
  } else {
    for (const line of view.lines) {
      lines.push(padRight(line.name, cols))
      const qty = `${line.quantity}${line.uom ? ` ${line.uom}` : ''}`
      lines.push(twoCols(`  ${qty} x ${money(line.unitPrice, currency)}`, money(line.lineTotal, currency), cols))
    }
  }

  lines.push(repeat('-', cols))

  // Totals
  lines.push(twoCols('Subtotal', money(view.subtotal, currency), cols))
  if (view.discount > 0) lines.push(twoCols('Discount', `-${money(view.discount, currency)}`, cols))
  if (view.tax > 0) lines.push(twoCols('Tax', money(view.tax, currency), cols))
  lines.push(twoCols('TOTAL', money(view.total, currency), cols))
  if (view.refunded > 0) lines.push(twoCols('Refunded', money(view.refunded, currency), cols))

  lines.push(repeat('-', cols))

  // Payment
  for (const payment of view.payments) {
    lines.push(twoCols(payment.method, money(payment.amount, currency), cols))
  }
  lines.push(twoCols('Total Paid', money(view.totalPaid, currency), cols))
  if (view.balanceDue > 0) lines.push(twoCols('Balance Due', money(view.balanceDue, currency), cols))
  if (view.change > 0) lines.push(twoCols('Change', money(view.change, currency), cols))

  lines.push(repeat('-', cols))
  lines.push(center(view.business.footer?.trim() || 'Thank you!'))

  // Trailing blank line so the paper feeds past the cut.
  lines.push('')

  return lines.join('\n')
}
