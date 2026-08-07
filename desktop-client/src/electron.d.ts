export {}

declare global {
  interface HidDeviceInfo {
    path?: string
    vendorId: number
    productId: number
    product: string
    manufacturer: string
    usagePage?: number
    usage?: number
  }

  interface HidScannerState {
    supported: boolean
    connected: boolean
    status: string
    device: { vid: number; pid: number } | null
  }

  interface InventoryScannerBridge {
    onBarcode(cb: (code: string) => void): () => void
    setActive(active: boolean): void
    getHidState(): Promise<HidScannerState>
    listHidDevices(): Promise<HidDeviceInfo[]>
    setHidDevice(device: { vendorId: number; productId: number }): Promise<boolean>
    clearHidDevice(): Promise<boolean>
  }

  interface PrinterInfo {
    name: string
    deviceName: string
    isDefault: boolean
  }

  interface PrinterConfig {
    deviceName: string | null
    silent: boolean
  }

  interface PrintResult {
    success: boolean
    message: string
  }

  interface InventoryPrinterBridge {
    getPrinters(): Promise<PrinterInfo[]>
    getConfig(): Promise<PrinterConfig>
    setConfig(config: Partial<PrinterConfig>): Promise<PrinterConfig>
    print(options?: { deviceName?: string; silent?: boolean }): Promise<PrintResult>
  }

  interface Window {
    inventoryScanner?: InventoryScannerBridge
    inventoryPrinter?: InventoryPrinterBridge
  }
}
