/**
 * batchNumber.js
 *
 * Auto-assign a lot/batch number when a receipt leaves it blank. The number is
 * derived from the purchase order so every receipt is traceable back to its
 * source document while staying within `product_batches.batch_number`
 * (character varying(100)).
 *
 * A user-supplied batch number is always preserved by callers; this helper is
 * only used as a fallback.
 */

function generateBatchNumber({ po_number, po_id } = {}) {
  const number = po_number != null ? String(po_number).trim() : '';
  if (number) {
    // Avoid double-prefixing an order number that already looks like "PO-...".
    const base = /^PO-/i.test(number) ? number : `PO-${number}`;
    return base.slice(0, 100);
  }

  if (po_id) {
    const short = String(po_id).replace(/-/g, '').slice(0, 8).toUpperCase();
    if (short) return `PO-${short}`.slice(0, 100);
  }

  return `PO-${Date.now().toString(36).toUpperCase()}`.slice(0, 100);
}

module.exports = { generateBatchNumber };
