/**
 * code128.ts
 *
 * Minimal, dependency-free CODE128 (subset B) encoder.
 *
 * The three receipt renderers (PDF/HTML in `lib/receipt.ts`, the on-screen
 * `components/ReceiptCard.tsx`, and — where the transport allows — the ESC/POS
 * thermal path) all need the same bars, so the encoding lives here and nowhere
 * else. The output matches what `jsbarcode`'s CODE128 produces in
 * `web-client` / `desktop-client`, which keeps the mobile receipt visually
 * consistent with the browser-printed one.
 *
 * Subset B covers printable ASCII (0x20–0x7E), which is all an invoice number
 * or payment reference contains. Characters outside that range are dropped
 * before encoding; callers must treat a `null` return as "print no barcode".
 */

/**
 * CODE128 symbol patterns. The array index is the symbol value and each digit
 * is a bar/space width in modules, starting with a bar and alternating.
 * Indices 0–102 are data symbols, 103–105 are the start characters (A, B, C)
 * and 106 is the stop pattern (13 modules, one longer than the rest).
 */
const PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]

const START_B = 104
const STOP = 106

export type BarcodeBars = {
  /** Bar/space widths in modules, alternating bar (even index) then space. */
  widths: number[]
  /** Total width of the symbol in modules. */
  modules: number
  /** The sanitized value that was actually encoded. */
  value: string
}

/**
 * Encode `raw` as CODE128-B and return its bar widths.
 *
 * Returns `null` when there is nothing encodable (empty, or every character
 * outside printable ASCII) so callers can skip the barcode entirely.
 */
export function code128Bars(raw: string): BarcodeBars | null {
  // Subset B encodes 0x20–0x7E as (charCode − 32). Drop anything else rather
  // than emit a symbol the scanner cannot decode.
  const value = String(raw ?? '').replace(/[^\x20-\x7E]/g, '')
  if (!value) return null

  const values: number[] = []
  for (let i = 0; i < value.length; i++) {
    values.push(value.charCodeAt(i) - 32)
  }

  // Start B, the data symbols, the mod-103 check symbol, then stop.
  const codes: number[] = [START_B, ...values]
  let checksum = START_B
  for (let i = 0; i < values.length; i++) {
    checksum += values[i] * (i + 1)
  }
  codes.push(checksum % 103, STOP)

  const widths: number[] = []
  for (const code of codes) {
    const pattern = PATTERNS[code]
    for (const digit of pattern) {
      widths.push(Number(digit))
    }
  }

  return {
    widths,
    modules: widths.reduce((sum, w) => sum + w, 0),
    value,
  }
}
