/**
 * printing/index.ts
 *
 * Public entry point for receipt printing on mobile.
 *
 * Screens should only import from here — never from `adapters.ts` or the
 * native library directly.
 */

import type { ReceiptView } from '@/lib/receiptModel'
import { readJson, removeKey, writeJson } from '@/services/secureTokens'
import { connectDiscovered, isPrintingSupported, printerSupportError, scanPrinters, sendBill } from './adapters'
import { buildReceiptText } from './escpos'
import {
  KIND_LABELS,
  type DiscoveredPrinter,
  type PrintOutcome,
  type PrinterKind,
  type ReceiptLayout,
} from './types'

export { KIND_LABELS, isPrintingSupported, printerSupportError, buildReceiptText }
export type { DiscoveredPrinter, PrintOutcome, PrinterKind, ReceiptLayout }

const STORAGE_KEY = 'printerConfig' as const

// ---------------------------------------------------------------------------
// Persistence — the chosen printer is a small JSON blob in SecureStore.
// ---------------------------------------------------------------------------

export function getSavedPrinter(): Promise<DiscoveredPrinter | null> {
  return readJson<DiscoveredPrinter>(STORAGE_KEY)
}

export function savePrinter(printer: DiscoveredPrinter): Promise<void> {
  return writeJson(STORAGE_KEY, printer)
}

export function forgetPrinter(): Promise<void> {
  return removeKey(STORAGE_KEY)
}

// ---------------------------------------------------------------------------
// Discovery / connection
// ---------------------------------------------------------------------------

export function listPrinters(kind: PrinterKind): Promise<DiscoveredPrinter[]> {
  return scanPrinters(kind)
}

/** Verify the printer is reachable, then remember it for later receipts. */
export async function connectAndSave(printer: DiscoveredPrinter): Promise<void> {
  await connectDiscovered(printer)
  await savePrinter(printer)
}

/** Connect to a network printer from a manually entered host/port. */
export async function connectNetworkPrinter(host: string, port = 9100): Promise<DiscoveredPrinter> {
  const printer: DiscoveredPrinter = {
    id: `net:${host}:${port}`,
    kind: 'net',
    name: `${host}:${port}`,
    host,
    port,
  }
  await connectAndSave(printer)
  return printer
}

// ---------------------------------------------------------------------------
// Printing
// ---------------------------------------------------------------------------

/**
 * Print a receipt on the saved printer.
 *
 * Never throws: callers get a `{ ok, message }` outcome so they can surface a
 * friendly Alert without a try/catch dance.
 */
export async function printSaleReceipt(view: ReceiptView): Promise<PrintOutcome> {
  const supportError = printerSupportError()
  if (supportError) return { ok: false, message: supportError }

  const printer = await getSavedPrinter()
  if (!printer) {
    return { ok: false, message: 'No printer selected. Open Printers and choose one first.' }
  }

  try {
    const text = buildReceiptText(view)
    await sendBill(printer, text)
    return { ok: true, message: 'Receipt sent to the printer.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, message }
  }
}
