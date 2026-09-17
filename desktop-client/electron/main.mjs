import { app, BrowserWindow, shell, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { createHidScanner } = require('./hid-scanner.cjs')

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
const isDev = !app.isPackaged

// ---------------------------------------------------------------------------
// Barcode scanner support (FR-030)
// ---------------------------------------------------------------------------
// Two mutually exclusive sources, both emitting the same `scanner:barcode`
// message to the renderer:
//   1. Keyboard "burst" scanner — captures wedge-scanner input app-wide via
//      `before-input-event`, even when no field is focused. Gated by the
//      renderer (`scanner:set-active`) so normal typing is never eaten.
//   2. Raw HID scanner (node-hid) — for readers that do not emulate a
//      keyboard. Selecting an HID device disables the burst scanner to avoid
//      double-reads. Optional: if node-hid cannot load, it degrades silently.
// ---------------------------------------------------------------------------

function attachBurstScanner(win, scannerState) {
  let buffer = ''
  let lastKeyAt = 0
  let burst = false

  win.webContents.on('before-input-event', (event, input) => {
    if (!scannerState.active) {
      burst = false
      buffer = ''
      return
    }
    if (input.type !== 'keyDown') return

    const now = performance.now()

    if (input.key === 'Enter') {
      if (burst && buffer.length >= 2) {
        event.preventDefault()
        const code = buffer
        buffer = ''
        burst = false
        win.webContents.send('scanner:barcode', code)
      } else {
        burst = false
        buffer = ''
      }
      return
    }

    // Printable key.
    if (input.key.length === 1) {
      const delta = lastKeyAt === 0 ? 0 : now - lastKeyAt
      lastKeyAt = now
      if (buffer && delta > 0 && delta <= 40) {
        burst = true
        event.preventDefault()
        buffer += input.key
      } else if (delta === 0 && buffer.length === 0) {
        buffer = input.key // tentative first key of a potential scan
      } else {
        // Slow keystroke (human typing) — restart the tentative buffer.
        burst = false
        buffer = input.key
      }
      return
    }

    // Modifier/control keys — ignore, keep the burst intact.
    if (input.key === 'Shift' || input.key === 'Control' || input.key === 'Alt' || input.key === 'Meta') {
      return
    }
    if (input.key === 'Backspace' && burst) {
      event.preventDefault()
      buffer = buffer.slice(0, -1)
    } else if (input.key === 'Escape') {
      burst = false
      buffer = ''
    }
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    title: 'Inventory Manager',
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.once('ready-to-show', () => win.show())

  // Open external links in the system browser instead of the app window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  attachBurstScanner(win, scannerState)

  if (isDev) {
    win.loadURL(DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

// Per-window scanner state + HID scanner.
const scannerState = { active: false }

let hidScanner = null
let hidStatus = 'disabled'

function initHidScanner() {
  const configFile = path.join(app.getPath('userData'), 'scanner-config.json')
  hidScanner = createHidScanner({
    configFile,
    onScan: (code) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('scanner:barcode', code)
      }
    },
    onStatusChange: (status) => { hidStatus = status },
  })
  if (hidScanner.supported && hidScanner.getConfig()) {
    hidStatus = 'connecting'
    hidScanner.connect()
  }
}

app.whenReady().then(() => {
  loadPrinterConfig()
  initHidScanner()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ---- Scanner IPC -----------------------------------------------------------

ipcMain.on('scanner:set-active', (_event, active) => {
  // Enabling burst capture while an HID device is configured would double-read.
  scannerState.active = !!active && !(hidScanner && hidScanner.getConfig())
})

ipcMain.handle('scanner:get-hid-state', () => ({
  supported: !!hidScanner && hidScanner.supported,
  connected: !!hidScanner && hidScanner.isConnected(),
  status: hidStatus,
  device: hidScanner ? hidScanner.getConfig() : null,
}))

ipcMain.handle('scanner:list-hid-devices', () => {
  if (!hidScanner || !hidScanner.supported) return []
  return hidScanner.listDevices()
})

ipcMain.handle('scanner:set-hid-device', (_event, device) => {
  if (!hidScanner || !hidScanner.supported || !device) return false
  hidScanner.setConfig(device.vendorId, device.productId)
  // HID mode and burst mode are mutually exclusive.
  scannerState.active = false
  hidStatus = 'connecting'
  hidScanner.connect()
  return true
})

ipcMain.handle('scanner:clear-hid-device', () => {
  if (!hidScanner) return false
  hidScanner.clearConfig()
  hidStatus = 'disabled'
  return true
})

// ---------------------------------------------------------------------------
// Receipt / label printing (FR-031)
// ---------------------------------------------------------------------------
// Native silent printing through Chromium's print pipeline
// (`webContents.print`). Zero native dependencies. The renderer renders the
// receipt/label HTML in a hidden print container and the current page's
// `@media print` CSS already hides the rest of the UI, so printing the live
// window's webContents is equivalent to `window.print()` but silent and
// targetable to a chosen printer. Falls back to the system dialog when the
// bridge is unavailable.
// ---------------------------------------------------------------------------

let printerConfig = { deviceName: null, silent: true }
const PRINTER_CONFIG_FILE = () => path.join(app.getPath('userData'), 'printer-config.json')

function loadPrinterConfig() {
  try {
    const { readFileSync, existsSync } = require('node:fs')
    if (existsSync(PRINTER_CONFIG_FILE())) {
      const parsed = JSON.parse(readFileSync(PRINTER_CONFIG_FILE(), 'utf8'))
      printerConfig = {
        deviceName: typeof parsed.deviceName === 'string' ? parsed.deviceName : null,
        silent: typeof parsed.silent === 'boolean' ? parsed.silent : true,
      }
    }
  } catch { /* ignore */ }
}

function savePrinterConfig() {
  try {
    const { mkdirSync, writeFileSync } = require('node:fs')
    mkdirSync(path.dirname(PRINTER_CONFIG_FILE()), { recursive: true })
    writeFileSync(PRINTER_CONFIG_FILE(), JSON.stringify(printerConfig, null, 2))
  } catch { /* non-fatal */ }
}

ipcMain.handle('printer:get-printers', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return []
  try {
    const printers = await win.webContents.getPrintersAsync()
    return printers.map((p) => ({
      name: p.name ?? p.deviceName ?? '',
      deviceName: p.deviceName ?? '',
      isDefault: !!p.isDefault,
    }))
  } catch {
    return []
  }
})

ipcMain.handle('printer:get-config', () => printerConfig)

ipcMain.handle('printer:set-config', (_event, config) => {
  const next = config || {}
  printerConfig = {
    deviceName: typeof next.deviceName === 'string' ? next.deviceName : null,
    silent: typeof next.silent === 'boolean' ? next.silent : true,
  }
  savePrinterConfig()
  return printerConfig
})

ipcMain.handle('printer:print', (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return { success: false, message: 'No window available for printing.' }

  const opts = options || {}
  const silent = typeof opts.silent === 'boolean' ? opts.silent : printerConfig.silent
  const deviceName = typeof opts.deviceName === 'string' && opts.deviceName
    ? opts.deviceName
    : (printerConfig.deviceName || undefined)

  return new Promise((resolve) => {
    win.webContents.print(
      { silent, deviceName, printBackground: true },
      (success, failureReason) => {
        resolve({
          success: Boolean(success),
          message: success ? '' : (failureReason || 'Print job failed.'),
        })
      }
    )
  })
})
