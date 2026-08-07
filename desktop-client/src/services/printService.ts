export interface PrintOptions {
  deviceName?: string
  silent?: boolean
}

export interface PrintResult {
  success: boolean
  message: string
}

function hasBridge(): boolean {
  return typeof window !== 'undefined' && !!window.inventoryPrinter
}

/** Electron-native silent print through the preload bridge (FR-031). */
export async function printReceipt(options?: PrintOptions): Promise<PrintResult> {
  if (!hasBridge()) {
    // Web / dev-browser fallback: system print dialog.
    window.print()
    return { success: true, message: '' }
  }
  const bridge = window.inventoryPrinter!
  const config = await bridge.getConfig()
  return bridge.print({
    deviceName: options?.deviceName ?? config.deviceName ?? undefined,
    silent: options?.silent ?? config.silent,
  })
}

export async function getPrinters() {
  if (!hasBridge()) return []
  return window.inventoryPrinter!.getPrinters()
}

export async function getPrinterConfig() {
  if (!hasBridge()) return null
  return window.inventoryPrinter!.getConfig()
}

export async function setPrinterConfig(config: { deviceName?: string | null; silent?: boolean }) {
  if (!hasBridge()) return null
  return window.inventoryPrinter!.setConfig(config)
}
