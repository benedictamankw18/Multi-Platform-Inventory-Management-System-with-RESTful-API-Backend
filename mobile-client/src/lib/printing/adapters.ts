/**
 * printing/adapters.ts
 *
 * Thin, defensive wrappers around `react-native-thermal-receipt-printer`.
 *
 * Why lazy: the library's `index.js` runs `new NativeEventEmitter(RNNetPrinter)`
 * at import time, which THROWS when the native module is missing (Expo Go, web).
 * A normal top-level import would therefore crash the whole bundle. Instead we
 * resolve the module on first use, inside a try/catch, and degrade to a clear
 * "requires a development build" message everywhere else.
 */

import type { DiscoveredPrinter, PrinterKind } from './types'

type ThermalModule = typeof import('react-native-thermal-receipt-printer')

let moduleLoaded = false
let thermalModule: ThermalModule | null = null
let loadFailure: string | null = null

const DEV_BUILD_MESSAGE =
  'Printing needs a development build. Expo Go cannot load Bluetooth/USB printer modules.'

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Resolve the native printing module once; returns null when unavailable. */
export function loadThermal(): ThermalModule | null {
  if (moduleLoaded) return thermalModule
  moduleLoaded = true
  try {
    const req = (globalThis as unknown as { require?: (id: string) => unknown }).require
    if (!req) {
      loadFailure = DEV_BUILD_MESSAGE
      return null
    }
    thermalModule = req('react-native-thermal-receipt-printer') as ThermalModule
  } catch (error) {
    thermalModule = null
    loadFailure = DEV_BUILD_MESSAGE
    if (__DEV__) console.warn('[printing] native module unavailable:', messageOf(error))
  }
  return thermalModule
}

/** Human-readable reason printing is unavailable, or null when it is available. */
export function printerSupportError(): string | null {
  loadThermal()
  return thermalModule ? null : (loadFailure ?? DEV_BUILD_MESSAGE)
}

export function isPrintingSupported(): boolean {
  return loadThermal() !== null
}

/** Discover printers of a given transport. */
export async function scanPrinters(kind: PrinterKind): Promise<DiscoveredPrinter[]> {
  const mod = loadThermal()
  if (!mod) throw new Error(loadFailure ?? DEV_BUILD_MESSAGE)

  if (kind === 'ble') {
    await mod.BLEPrinter.init()
    const devices = await mod.BLEPrinter.getDeviceList()
    return (devices ?? []).map((d) => ({
      id: `ble:${d.inner_mac_address}`,
      kind: 'ble' as const,
      name: d.device_name || d.inner_mac_address,
      address: d.inner_mac_address,
    }))
  }

  if (kind === 'usb') {
    await mod.USBPrinter.init()
    const devices = await mod.USBPrinter.getDeviceList()
    return (devices ?? []).map((d) => ({
      id: `usb:${d.vendor_id}:${d.product_id}`,
      kind: 'usb' as const,
      name: d.device_name || `${d.vendor_id}:${d.product_id}`,
      vendorId: d.vendor_id,
      productId: d.product_id,
    }))
  }

  // Network printers are not auto-scanned: the library's scan relies on a
  // native event emitter that is unreliable across vendors. The UI asks for a
  // host/port instead.
  return []
}

/** Open the native connection to a discovered printer. */
export async function connectDiscovered(printer: DiscoveredPrinter): Promise<void> {
  const mod = loadThermal()
  if (!mod) throw new Error(loadFailure ?? DEV_BUILD_MESSAGE)

  if (printer.kind === 'ble') {
    if (!printer.address) throw new Error('Bluetooth printer is missing its address.')
    await mod.BLEPrinter.init()
    await mod.BLEPrinter.connectPrinter(printer.address)
    return
  }
  if (printer.kind === 'net') {
    if (!printer.host) throw new Error('Network printer is missing its host.')
    await mod.NetPrinter.init()
    await mod.NetPrinter.connectPrinter(printer.host, printer.port ?? 9100)
    return
  }
  if (!printer.vendorId || !printer.productId) {
    throw new Error('USB printer is missing its vendor/product id.')
  }
  await mod.USBPrinter.init()
  await mod.USBPrinter.connectPrinter(printer.vendorId, printer.productId)
}

/**
 * Send a preformatted receipt to the printer.
 *
 * The library's `printBill` is fire-and-forget (it only `console.warn`s on
 * failure), so we await the connection first and then dispatch. A successful
 * promise means the bytes were handed to the native transport.
 */
export async function sendBill(printer: DiscoveredPrinter, text: string): Promise<void> {
  const mod = loadThermal()
  if (!mod) throw new Error(loadFailure ?? DEV_BUILD_MESSAGE)

  await connectDiscovered(printer)

  if (printer.kind === 'ble') {
    mod.BLEPrinter.printBill(text)
  } else if (printer.kind === 'net') {
    mod.NetPrinter.printBill(text)
  } else {
    mod.USBPrinter.printBill(text)
  }
}
