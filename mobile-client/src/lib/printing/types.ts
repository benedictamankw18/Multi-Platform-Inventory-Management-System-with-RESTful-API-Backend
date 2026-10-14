/**
 * printing/types.ts
 *
 * Shared types for the mobile receipt-printing layer.
 *
 * Printing is a native capability: the ESC/POS transports (BLE, USB, TCP)
 * come from `react-native-thermal-receipt-printer`, which only exists in a
 * development/production build — never in Expo Go. See `adapters.ts`.
 */

export type ReceiptLayout = '58mm' | '80mm'

/**
 * Transport a printer is reached over.
 *
 * NOTE: Bluetooth **Classic / SPP** is intentionally absent. iOS gives apps no
 * access to Classic SPP at all, and the bundled library only speaks BLE/USB/TCP,
 * so a Classic-only printer cannot be supported on either platform here.
 */
export type PrinterKind = 'ble' | 'net' | 'usb'

export type DiscoveredPrinter = {
  /** Stable id used for persistence and list keys. */
  id: string
  kind: PrinterKind
  name: string
  /** BLE inner MAC address. */
  address?: string
  /** TCP host. */
  host?: string
  /** TCP port (default 9100). */
  port?: number
  /** USB vendor / product ids (Android only). */
  vendorId?: string
  productId?: string
}

export type PrintOutcome = { ok: boolean; message: string }

export const KIND_LABELS: Record<PrinterKind, string> = {
  ble: 'Bluetooth (BLE)',
  net: 'Network (TCP/IP)',
  usb: 'USB',
}
