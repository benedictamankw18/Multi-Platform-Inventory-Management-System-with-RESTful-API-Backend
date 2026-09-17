import { useEffect } from 'react'

export type ScanHandler = (code: string) => void

const scanHandlers = new Set<ScanHandler>()
let subscribed = false

function fillFocusedScanInput(code: string): void {
  const el = document.activeElement
  if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return
  const input = el as HTMLInputElement | HTMLTextAreaElement
  if (input.dataset.scan === undefined) return
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (!setter) return
  setter.call(input, code)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  input.focus()
}

function dispatch(code: string): void {
  if (scanHandlers.size > 0) {
    for (const handler of [...scanHandlers]) handler(code)
  } else {
    fillFocusedScanInput(code)
  }
}

function subscribe(): void {
  if (subscribed) return
  const bridge = typeof window !== 'undefined' ? window.inventoryScanner : undefined
  if (!bridge) return
  subscribed = true
  bridge.onBarcode(dispatch)
}

/** Subscribe app-wide (call once at startup) so scans reach any [data-scan] input. */
export function initScanner(): void {
  subscribe()
}

/** Toggle the Electron main-process burst capture while a scan-aware page is mounted. */
export function setScannerActive(active: boolean): void {
  if (typeof window !== 'undefined' && window.inventoryScanner) {
    window.inventoryScanner.setActive(active)
  }
}

/** Register a page-level scan handler (runs while the component is mounted). */
export function useScanner(handler: ScanHandler): void {
  useEffect(() => {
    scanHandlers.add(handler)
    setScannerActive(true)
    return () => {
      scanHandlers.delete(handler)
      setScannerActive(false)
    }
  }, [handler])
}
