// node-hid based raw HID barcode reader support. Entirely optional: if the
// native module is missing or fails to load, `supported` is false and the app
// silently falls back to the keyboard "burst" scanner (wedge devices).
const fs = require('node:fs')
const path = require('node:path')

// HID keyboard usage -> ASCII (US QWERTY layout).
const HID_KEY_TO_ASCII = {
  0x04: 'a', 0x05: 'b', 0x06: 'c', 0x07: 'd', 0x08: 'e', 0x09: 'f',
  0x0a: 'g', 0x0b: 'h', 0x0c: 'i', 0x0d: 'j', 0x0e: 'k', 0x0f: 'l',
  0x10: 'm', 0x11: 'n', 0x12: 'o', 0x13: 'p', 0x14: 'q', 0x15: 'r',
  0x16: 's', 0x17: 't', 0x18: 'u', 0x19: 'v', 0x1a: 'w', 0x1b: 'x',
  0x1c: 'y', 0x1d: 'z',
  0x1e: '1', 0x1f: '2', 0x20: '3', 0x21: '4', 0x22: '5', 0x23: '6',
  0x24: '7', 0x25: '8', 0x26: '9', 0x27: '0',
  0x2c: ' ', 0x2d: '-', 0x2e: '=', 0x2f: '[', 0x30: ']', 0x31: '\\',
  0x33: ';', 0x34: "'", 0x35: '`', 0x36: ',', 0x37: '.', 0x38: '/',
}

const HID_SHIFT_TO_ASCII = {
  '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&',
  '8': '*', '9': '(', '0': ')', '-': '_', '=': '+', '[': '{', ']': '}',
  '\\': '|', ';': ':', "'": '"', '`': '~', ',': '<', '.': '>', '/': '?',
}

function hidKeyToAscii(code, shifted) {
  const base = HID_KEY_TO_ASCII[code]
  if (!base) return ''
  if (shifted) {
    if (base.length === 1 && base >= 'a' && base <= 'z') return base.toUpperCase()
    return HID_SHIFT_TO_ASCII[base] || base
  }
  return base
}

// Decodes raw HID data reports into a barcode string. Supports two device
// shapes:
//   - "HID keyboard" reports (8 bytes: modifiers, reserved, 6 key codes)
//   - "HID ASCII / barcode-reader" reports (variable length, printable bytes)
// Returns { text, done } where `done` marks a committed scan (Enter / CR / LF).
function createDecoder() {
  let acc = ''
  let mode = null

  function detectMode(buf) {
    return buf.length === 8 && (buf[1] === 0) ? 'hid' : 'ascii'
  }

  function feed(buf) {
    if (!buf || buf.length === 0) return { text: acc, done: false }
    if (mode === null) mode = detectMode(buf)
    let done = false

    if (mode === 'hid') {
      const shifted = (buf[0] & 0x01) !== 0 || (buf[0] & 0x02) !== 0
      for (let i = 2; i < buf.length; i++) {
        const code = buf[i]
        if (code === 0) continue
        if (code === 0x28) { done = true; continue }
        if (code === 0x2a) { acc = acc.slice(0, -1); continue }
        const ch = hidKeyToAscii(code, shifted)
        if (ch) acc += ch
      }
    } else {
      for (const b of buf) {
        if (b === 0x00 || b === 0x09) continue
        if (b === 0x0d || b === 0x0a) { done = true; continue }
        acc += String.fromCharCode(b)
      }
    }
    return { text: acc, done }
  }

  function reset() {
    acc = ''
    mode = null
  }

  return { feed, reset }
}

function readJson(file) {
  try {
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function writeJson(file, value) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(value, null, 2))
  } catch { /* non-fatal */ }
}

function createHidScanner({ onScan, onStatusChange, configFile }) {
  let HID = null
  let supported = false
  try {
    // node-hid is optional; failing to load must never break the app.
    HID = require('node-hid')
    supported = true
  } catch { /* ignore */ }

  const config = readJson(configFile) || null
  const decoder = supported ? createDecoder() : null
  let device = null

  function listDevices() {
    if (!HID) return []
    try {
      return (HID.devices() || []).map((d) => ({
        path: d.path,
        vendorId: d.vendorId,
        productId: d.productId,
        product: d.product || 'Unknown device',
        manufacturer: d.manufacturer || '',
        usagePage: d.usagePage,
        usage: d.usage,
      }))
    } catch {
      return []
    }
  }

  function findDevice(vid, pid) {
    return listDevices().find(
      (d) => Number(d.vendorId) === Number(vid) && Number(d.productId) === Number(pid)
    )
  }

  function setStatus(status) {
    if (typeof onStatusChange === 'function') onStatusChange(status)
  }

  function connect() {
    if (!supported || !config || device) return
    const target = findDevice(config.vid, config.pid)
    if (!target) {
      setStatus('not-found')
      return
    }
    try {
      device = new HID.HID(target.path)
      device.on('data', (buf) => {
        if (!decoder) return
        const r = decoder.feed(buf)
        if (r.done) {
          const code = r.text.trim()
          decoder.reset()
          if (code) onScan(code)
        }
      })
      device.on('error', () => { disconnect(); setStatus('error') })
      setStatus('connected')
    } catch {
      device = null
      setStatus('error')
    }
  }

  function disconnect() {
    try { if (device) device.close() } catch { /* ignore */ }
    device = null
  }

  function setConfig(vid, pid) {
    const next = { vid: Number(vid), pid: Number(pid) }
    writeJson(configFile, next)
    config.vid = next.vid
    config.pid = next.pid
    disconnect()
    connect()
    return true
  }

  function clearConfig() {
    disconnect()
    writeJson(configFile, null)
    config.vid = undefined
    config.pid = undefined
    return true
  }

  return {
    supported,
    getConfig: () => (config && config.vid != null && config.pid != null ? config : null),
    listDevices,
    setConfig,
    clearConfig,
    connect,
    disconnect,
    isConnected: () => !!device,
  }
}

module.exports = { createHidScanner, createDecoder }
