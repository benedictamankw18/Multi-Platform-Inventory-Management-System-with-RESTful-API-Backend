/**
 * receipt.ts
 *
 * Renders a `ReceiptView` to the standalone HTML document that `expo-print`
 * turns into a PDF (share) or hands to the OS print dialog.
 *
 * The markup and CSS mirror the canonical web/desktop receipt
 * (`web-client`/`desktop-client` `#receipt-print` + `Layout.css`) so the mobile
 * PDF looks like what the browser prints: same blocks, same 58 mm / 80 mm
 * layouts (stacked items vs. table).
 */

import type { ReceiptView } from './receiptModel'
import { receiptMoney } from './receiptModel'

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function row(label: string, value: string, className = ''): string {
  return `<div class="receipt-row ${className}"><span>${esc(label)}</span><span>${esc(value)}</span></div>`
}

export function renderReceiptHtml(view: ReceiptView): string {
  const paper = view.layout === '58mm' ? '58mm' : '80mm'
  // Page width minus the 2mm margins. Caps the receipt so a platform that
  // ignores the `@page` size (Android derives it from PrintAttributes) does not
  // stretch the monospace layout across a full A4/Legal page.
  const inner = view.layout === '58mm' ? '54mm' : '76mm'
  const cls = view.layout === '58mm' ? 'receipt-58' : 'receipt-80'
  const cur = view.business.currency
  const money = (v: unknown): string => receiptMoney(v, cur)

  // ---- Header -------------------------------------------------------------
  const header: string[] = []
  if (view.business.logo) {
    header.push(`<img class="receipt-logo" src="${esc(view.business.logo)}" alt="" />`)
  }
  header.push(`<div class="receipt-business-name">${esc(view.business.name)}</div>`)
  if (view.business.address) header.push(`<div class="receipt-meta">${esc(view.business.address)}</div>`)
  if (view.business.phone) header.push(`<div class="receipt-meta">${esc(view.business.phone)}</div>`)
  if (view.business.taxNumber) header.push(`<div class="receipt-meta">TIN: ${esc(view.business.taxNumber)}</div>`)
  if (view.business.registrationNumber) {
    header.push(`<div class="receipt-meta">Reg: ${esc(view.business.registrationNumber)}</div>`)
  }

  // ---- Sale info ----------------------------------------------------------
  const info: string[] = [row('Invoice', view.invoiceNumber)]
  if (view.receiptNumber) info.push(row('Receipt', view.receiptNumber))
  if (view.date) info.push(row('Date', view.date))
  if (view.cashier) info.push(row('Cashier', view.cashier))
  if (view.customer) info.push(row('Customer', view.customer))
  if (view.paymentStatus) info.push(row('Payment', view.paymentStatus))

  // ---- Items --------------------------------------------------------------
  let items: string
  if (view.lines.length === 0) {
    items = '<div class="receipt-empty">(no items)</div>'
  } else if (view.layout === '58mm') {
    items = view.lines
      .map((line) => {
        const qty = `${line.quantity}${line.uom ? ` ${line.uom}` : ''}`
        return `<div class="receipt-item">
          <div class="receipt-item-name">${esc(line.name)}</div>
          <div class="receipt-item-line"><span>${esc(qty)} &times; ${esc(money(line.unitPrice))}</span><span>${esc(money(line.lineTotal))}</span></div>
        </div>`
      })
      .join('')
  } else {
    const rows = view.lines
      .map(
        (line) => `<tr>
          <td>${esc(line.name)}</td>
          <td>${esc(line.quantity)}</td>
          <td>${esc(money(line.unitPrice))}</td>
          <td>${esc(line.uom ?? '')}</td>
          <td>${esc(money(line.lineTotal))}</td>
        </tr>`,
      )
      .join('')
    items = `<table class="receipt-items">
      <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>UoM</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  }

  // ---- Totals -------------------------------------------------------------
  const totals: string[] = [row('Subtotal', money(view.subtotal))]
  if (view.discount > 0) totals.push(row('Discount', `-${money(view.discount)}`, 'r-discount'))
  if (view.tax > 0) totals.push(row('Tax', money(view.tax)))
  totals.push(row('TOTAL', money(view.total), 'receipt-total-row'))
  if (view.refunded > 0) totals.push(row('Refunded', money(view.refunded)))

  // ---- Payment ------------------------------------------------------------
  const payment: string[] = view.payments.map((p) => row(p.method, money(p.amount)))
  payment.push(row('Total Paid', money(view.totalPaid), 'receipt-paid-row'))
  if (view.balanceDue > 0) payment.push(row('Balance Due', money(view.balanceDue), 'r-remain'))
  if (view.change > 0) payment.push(row('Change', money(view.change)))

  // ---- Footer -------------------------------------------------------------
  const footer = view.business.footer
    ? `<div class="receipt-footer">${esc(view.business.footer)}</div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Receipt ${esc(view.invoiceNumber)}</title>
<style>
  @page { size: ${paper} 297mm; margin: 2mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    color: #000;
    background: #fff;
    font-size: 12px;
    line-height: 1.4;
    width: 100%;
  }
  .receipt { width: 100%; max-width: ${inner}; margin: 0 auto; }
  .receipt-header { text-align: center; }
  .receipt-logo { max-width: 120px; max-height: 60px; object-fit: contain; }
  .receipt-business-name { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .receipt-meta { font-size: 11px; line-height: 1.4; }
  .receipt-section { padding: 4px 0; border-top: 1px solid #000; }
  .receipt-row { display: flex; justify-content: space-between; font-size: 12px; line-height: 1.6; }
  .receipt-items { width: 100%; table-layout: fixed; border-collapse: collapse; }
  .receipt-items th, .receipt-items td { padding: 2px 0; font-size: 11px; vertical-align: top; overflow: hidden; text-overflow: ellipsis; }
  .receipt-items th { font-weight: 600; text-align: left; border-bottom: 1px solid #000; }
  .receipt-items th:not(:first-child), .receipt-items td:not(:first-child) { text-align: right; white-space: nowrap; }
  .receipt-item { margin-bottom: 4px; }
  .receipt-item-name { font-size: 11px; font-weight: 600; word-break: break-word; overflow-wrap: anywhere; }
  .receipt-item-line { display: flex; justify-content: space-between; font-size: 10px; margin-top: 1px; }
  .receipt-totals { border-top: 1px dashed #000; }
  .receipt-total-row { font-size: 15px; font-weight: 700; border-top: 1px solid #000; }
  .receipt-payment { border-top: 1px dashed #000; }
  .receipt-paid-row { font-weight: 600; border-top: 1px dashed #888; padding-top: 4px; margin-top: 4px; }
  .receipt-footer { text-align: center; font-size: 11px; border-top: 1px solid #000; padding: 4px 0; }
  .receipt-empty { font-size: 11px; }
  .receipt-58 .receipt-row { font-size: 10px; }
  .receipt-58 .receipt-meta { font-size: 9px; }
  .receipt-58 .receipt-business-name { font-size: 13px; }
  .receipt-58 .receipt-items th, .receipt-58 .receipt-items td { padding: 1px 2px; font-size: 9px; }
  .receipt-58 .receipt-item-name { font-size: 10px; }
  .receipt-58 .receipt-item-line { font-size: 9px; }
  .receipt-58 .receipt-total-row { font-size: 12px; }
</style>
</head>
<body>
  <div class="receipt ${cls}">
    <div class="receipt-header">${header.join('')}</div>
    <div class="receipt-section">${info.join('')}</div>
    <div class="receipt-section">${items}</div>
    <div class="receipt-section receipt-totals">${totals.join('')}</div>
    <div class="receipt-section receipt-payment">${payment.join('')}</div>
    ${footer}
  </div>
</body>
</html>`
}
