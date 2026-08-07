// Sandboxed preload (CommonJS — ESM preloads are unsupported when `sandbox: true`).
// Exposes a narrow, typed barcode-scanner API to the renderer via contextBridge.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('inventoryScanner', {
  onBarcode(callback) {
    const listener = (_event, code) => {
      if (typeof callback === 'function' && typeof code === 'string') callback(code)
    }
    ipcRenderer.on('scanner:barcode', listener)
    return () => ipcRenderer.removeListener('scanner:barcode', listener)
  },

  setActive(active) {
    ipcRenderer.send('scanner:set-active', !!active)
  },

  getHidState() {
    return ipcRenderer.invoke('scanner:get-hid-state')
  },

  listHidDevices() {
    return ipcRenderer.invoke('scanner:list-hid-devices')
  },

  setHidDevice(device) {
    return ipcRenderer.invoke('scanner:set-hid-device', device)
  },

  clearHidDevice() {
    return ipcRenderer.invoke('scanner:clear-hid-device')
  },
})

contextBridge.exposeInMainWorld('inventoryPrinter', {
  getPrinters() {
    return ipcRenderer.invoke('printer:get-printers')
  },

  getConfig() {
    return ipcRenderer.invoke('printer:get-config')
  },

  setConfig(config) {
    return ipcRenderer.invoke('printer:set-config', config)
  },

  print(options) {
    return ipcRenderer.invoke('printer:print', options)
  },
})
