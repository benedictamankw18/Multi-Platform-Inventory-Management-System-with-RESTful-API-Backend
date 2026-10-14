/**
 * receiptModel.ts
 *
 * The single normalized description of a receipt, shared by every renderer:
 *
 *   • `renderReceiptHtml`  → PDF / OS print dialog      (lib/receipt.ts)
 *   • `buildReceiptText`   → ESC/POS thermal printer    (lib/printing/escpos.ts)
 *   • `<ReceiptCard>`      → on-screen preview          (components/ReceiptCard.tsx)
 *
 * Previously each surface read the `Sale` independently and had drifted apart
 * (different fields, different totals). They now differ only in presentation;
 * what a receipt contains is decided here and nowhere else.
 *
 * The block order mirrors the canonical web/desktop receipt:
 * header → sale info → items → totals → payment → footer.
 */

import type { Sale } from '@/services/api'
import type { ReceiptLayout } from '@/lib/printing/types'

export type { ReceiptLayout }

/** Branding/contact block printed at the top of the receipt. */
export type ReceiptBusiness = {
  name: string
  address: string | null
  phone: string | null
  taxNumber: string | null
  registrationNumber: string | null
  /** Absolute URL (already resolved), or null when there is no logo. */
  logo: string | null
  footer: string | null
  currency: string | null
}

/** The same fields before defaults are applied (from business settings). */
export type ReceiptBusinessInput = {
  name?: string | null
  address?: string | null
  phone?: string | null
  taxNumber?: string | null
  registrationNumber?: string | null
  logo?: string | null
  footer?: string | null
  currency?: string | null
}

/** One sale line, with the line total already computed for display. */
export type ReceiptLine = {
  name: string
  quantity: number
  unitPrice: number
  /** Unit of measure symbol/name, when the API knows it. */
  uom: string | null
  discount: number
  tax: number
  lineTotal: number
}

export type ReceiptPayment = { method: string; amount: number }

/** Payment as it arrives from the API (`payment_method`) or a POS cart (`method`). */
export type ReceiptPaymentInput = { amount: number; method?: string; payment_method?: string }

export type ReceiptView = {
  layout: ReceiptLayout
  business: ReceiptBusiness
  invoiceNumber: string
  receiptNumber: string | null
  date: string
  cashier: string | null
  customer: string | null
  paymentStatus: string | null
  lines: ReceiptLine[]
  subtotal: number
  discount: number
  tax: number
  total: number
  refunded: number
  payments: ReceiptPayment[]
  totalPaid: number
  balanceDue: number
  change: number
}

export type ReceiptViewInput = {
  sale: Sale
  payments?: ReceiptPaymentInput[]
  business?: ReceiptBusinessInput | null
  receiptNumber?: string | null
  layout?: ReceiptLayout
}

export function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** `USD 12.50`, or just `12.50` when no currency is configured. */
export function receiptMoney(value: unknown, currency?: string | null): string {
  const amount = toNumber(value).toFixed(2)
  return currency ? `${currency} ${amount}` : amount
}

/**
 * Line total, mirroring the web receipt exactly:
 *   qty × unit_price − line_discount + tax
 * The stored `line_total` is deliberately ignored so all three surfaces agree.
 */
export function lineTotalOf(
  item: Pick<ReceiptLine, 'quantity' | 'unitPrice' | 'discount' | 'tax'>,
): number {
  return item.quantity * item.unitPrice - item.discount + item.tax
}

export function buildReceiptView({
  sale,
  payments,
  business,
  receiptNumber,
  layout = '80mm',
}: ReceiptViewInput): ReceiptView {
  const lines: ReceiptLine[] = (sale.items ?? []).map((item) => {
    const quantity = toNumber(item.quantity)
    const unitPrice = toNumber(item.unit_price)
    const discount = toNumber(item.line_discount)
    const tax = toNumber(item.tax_amount)
    return {
      name: item.product_name ?? item.product_id,
      quantity,
      unitPrice,
      uom: item.symbol ?? item.uom_name ?? null,
      discount,
      tax,
      lineTotal: quantity * unitPrice - discount + tax,
    }
  })

  const paymentInputs: ReceiptPaymentInput[] =
    payments && payments.length > 0 ? payments : (sale.payments ?? [])

  const resolvedPayments: ReceiptPayment[] = paymentInputs.map((p) => ({
    method: p.payment_method ?? p.method ?? 'Payment',
    amount: toNumber(p.amount),
  }))

  const totalPaid =
    resolvedPayments.length > 0
      ? resolvedPayments.reduce((sum, p) => sum + p.amount, 0)
      : toNumber(sale.amount_paid)

  const total = toNumber(sale.total_amount)

  return {
    layout,
    business: {
      name: business?.name?.trim() || 'Receipt',
      address: business?.address ?? null,
      phone: business?.phone ?? null,
      taxNumber: business?.taxNumber ?? null,
      registrationNumber: business?.registrationNumber ?? null,
      logo: business?.logo ?? null,
      footer: business?.footer ?? null,
      currency: business?.currency ?? null,
    },
    invoiceNumber: sale.invoice_number ?? sale.sale_id,
    receiptNumber: receiptNumber ?? null,
    date: sale.sale_date ? new Date(sale.sale_date).toLocaleString() : '',
    cashier: sale.cashier_name,
    customer: sale.customer_name,
    paymentStatus: sale.payment_status ?? null,
    lines,
    subtotal: toNumber(sale.subtotal),
    discount: toNumber(sale.discount_amount),
    tax: toNumber(sale.tax_amount),
    total,
    refunded: toNumber(sale.refunded_amount),
    payments: resolvedPayments,
    totalPaid,
    balanceDue: toNumber(sale.balance_due),
    change: Math.max(toNumber(sale.amount_paid) - total, 0),
  }
}
