import { useEffect, useMemo, useState } from 'react'
import type { Sale, SalePayment } from '@/services/api'
import {
  buildReceiptView,
  type ReceiptBusinessInput,
  type ReceiptLayout,
  type ReceiptView,
} from '@/lib/receiptModel'
import { loadReceiptBusiness, loadReceiptData } from '@/lib/receiptData'

type UseReceiptViewArgs = {
  sale: Sale | null
  /** Cart/POS payments to use until the authoritative receipt is loaded. */
  payments?: SalePayment[]
  layout?: ReceiptLayout
  /**
   * Receipt number the caller already loaded (e.g. the sale-detail screen, which
   * calls `/sales/:id/receipt` itself). Used verbatim when supplied.
   */
  receiptNumber?: string | null
  /**
   * Fetch `/sales/:id/receipt` for the receipt number and the authoritative sale
   * (UoM-joined items + payment rows). Disable when the caller already loaded it
   * — the endpoint inserts a receipt row on first access, so it should not be
   * called twice in a row.
   */
  fetchReceipt?: boolean
}

/**
 * Builds the normalized `ReceiptView` every renderer consumes, resolving the
 * two things a bare `Sale` is missing: business branding and the receipt
 * number. The receipt endpoint is preferred when available; offline/unknown
 * sales fall back to the sale the screen already has.
 */
export function useReceiptView({
  sale,
  payments,
  layout = '80mm',
  receiptNumber: receiptNumberProp,
  fetchReceipt = true,
}: UseReceiptViewArgs): ReceiptView | null {
  const saleId = sale?.sale_id ?? null

  const [business, setBusiness] = useState<ReceiptBusinessInput>({})
  const [remoteSale, setRemoteSale] = useState<Sale | null>(null)
  const [remoteReceiptNumber, setRemoteReceiptNumber] = useState<string | null>(null)

  // Branding is shared by every screen; `loadReceiptBusiness` caches it.
  useEffect(() => {
    let active = true
    void loadReceiptBusiness().then((biz) => {
      if (active) setBusiness(biz)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!fetchReceipt || !saleId) return
    let active = true
    void loadReceiptData(saleId).then((data) => {
      if (!active) return
      setRemoteSale(data.sale)
      setRemoteReceiptNumber(data.receiptNumber)
    })
    return () => {
      active = false
    }
  }, [fetchReceipt, saleId])

  return useMemo(() => {
    const effectiveSale = remoteSale ?? sale
    if (!effectiveSale) return null
    const effectivePayments = remoteSale?.payments?.length ? remoteSale.payments : payments
    return buildReceiptView({
      sale: effectiveSale,
      payments: effectivePayments,
      business,
      receiptNumber: receiptNumberProp !== undefined ? receiptNumberProp : remoteReceiptNumber,
      layout,
    })
  }, [sale, remoteSale, payments, business, receiptNumberProp, remoteReceiptNumber, layout])
}
