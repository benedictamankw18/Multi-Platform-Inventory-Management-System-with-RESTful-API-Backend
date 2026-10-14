import { Platform } from 'react-native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import type { ReceiptView } from './receiptModel'
import { renderReceiptHtml } from './receipt'

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Open the **OS print dialog** (AirPrint / Android print service) for a receipt.
 *
 * This is the PDF/AirPrint fallback — it is not thermal-printer output. For
 * ESC/POS thermal printing use `@/lib/printing` instead.
 *
 * Uses `Print.printAsync` on native: `printToFileAsync` only writes a PDF to the
 * app cache and never shows a dialog, which is why the old button looked dead.
 * On web it is `printToFileAsync` that opens the browser print dialog.
 */
export async function printReceipt(view: ReceiptView) {
  const html = renderReceiptHtml(view)
  if (Platform.OS === 'web') {
    const { uri } = await Print.printToFileAsync({ html })
    return { uri }
  }
  await Print.printAsync({ html })
  return {}
}

/**
 * Render the receipt to a PDF in the app cache.
 *
 * Failures here are attributed explicitly: on Android the native throw gives no
 * clue about which step died, so we wrap it to make the two stages tell apart.
 */
async function createReceiptPdf(html: string): Promise<string> {
  try {
    const result = await Print.printToFileAsync({ html })
    return result.uri
  } catch (error) {
    console.warn('[receipt] PDF generation failed', error)
    throw new Error(`Could not create the receipt PDF: ${messageOf(error)}`)
  }
}

/**
 * Hand the cached PDF to the OS share sheet.
 *
 * `expo-sharing` only accepts a local `file://` URL, and on Android the native
 * module rejects immediately (before any sheet appears) if a previous share is
 * still pending, if the file is outside the permitted paths, or if the
 * FileProvider cannot expose it. Surfacing the native message is the only way
 * to tell those apart.
 */
/**
 * Android's `expo-sharing` refuses any file whose path is outside the paths the
 * runtime is allowed to read. Expo Go scopes file access to the experience
 * directory, but `expo-print` writes to the app-wide cache dir, so the share is
 * rejected before any sheet appears. A development/production build has no such
 * restriction, so we translate the raw native message into actionable guidance.
 */
const SHARE_PATH_DENIED = 'Not allowed to read file under given URL'

async function sharePdf(uri: string): Promise<void> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Sharing is not available on this device.')
    }
    await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' })
  } catch (error) {
    const message = messageOf(error)
    console.warn('[receipt] share failed', error)
    if (message.includes(SHARE_PATH_DENIED)) {
      throw new Error(
        'PDF sharing is not available in Expo Go. Use "System print (PDF)" to save or share it, or run a development build.',
      )
    }
    throw new Error(`Could not share the receipt PDF: ${message}`)
  }
}

export async function shareReceiptPdf(view: ReceiptView) {
  const html = renderReceiptHtml(view)
  const uri = await createReceiptPdf(html)
  await sharePdf(uri)
  return { uri }
}
