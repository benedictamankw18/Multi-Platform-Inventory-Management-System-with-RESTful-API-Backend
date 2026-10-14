/**
 * receiptData.ts
 *
 * Loads the two pieces of data a receipt needs beyond the `Sale` itself:
 *
 *   • business branding/contact/footer — from the unauthenticated
 *     `GET /business/public` (cached for the app session);
 *   • the receipt number and the authoritative sale/payments — from
 *     `GET /sales/:id/receipt`, which returns items joined with UoM names and
 *     the payment rows, and creates the receipt row on first access (the same
 *     call the web client makes).
 *
 * Both are best-effort: a failure (e.g. an offline sale that has not reached the
 * server yet) simply falls back to what the screen already has.
 */

import * as api from '@/services/api'
import type { PublicBusinessSettings, Sale } from '@/services/api'
import type { ReceiptBusinessInput } from './receiptModel'

function toBusiness(settings: PublicBusinessSettings | null): ReceiptBusinessInput {
  if (!settings) return {}
  return {
    name: settings.business_name ?? null,
    address: settings.address ?? null,
    phone: settings.phone ?? null,
    taxNumber: settings.tax_number ?? null,
    registrationNumber: settings.registration_number ?? null,
    logo: api.resolveImageUrl(settings.logo),
    footer: settings.receipt_footer ?? null,
    currency: settings.currency ?? null,
  }
}

let businessPromise: Promise<ReceiptBusinessInput> | null = null

/** Branding for the receipt header/footer. Cached — settings rarely change. */
export function loadReceiptBusiness(): Promise<ReceiptBusinessInput> {
  if (!businessPromise) {
    businessPromise = api
      .getPublicBusinessSettings()
      .then(toBusiness)
      .catch(() => ({}))
  }
  return businessPromise
}

export type ReceiptData = {
  receiptNumber: string | null
  /** Sale as returned by the receipt endpoint (has UoM names + payments), or null. */
  sale: Sale | null
}

/** Receipt number plus the authoritative sale record. Never throws. */
export async function loadReceiptData(saleId: string): Promise<ReceiptData> {
  try {
    const { receipt, sale } = await api.getSaleReceipt(saleId)
    return { receiptNumber: receipt?.receipt_number ?? null, sale: sale ?? null }
  } catch {
    return { receiptNumber: null, sale: null }
  }
}
