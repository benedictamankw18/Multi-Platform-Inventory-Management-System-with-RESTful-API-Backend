const { v4: uuidv4 } = require('uuid');

const pool = require('../config/db');
const salesRepo = require('../repositories/sales.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');
const cache = require('../utils/cache.utils');

const PAYMENT_METHODS = new Set(['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CREDIT']);

function asNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  return Number(value);
}

function getActorId(actor) {
  return actor && (actor.sub || actor.id || actor.user_id);
}

function normalizePayments(payload) {
  if (Array.isArray(payload.payments)) return payload.payments;
  if (payload.payment) return [payload.payment];
  if (payload.payment_amount !== undefined || payload.payment_method !== undefined) {
    return [{
      amount: payload.payment_amount,
      payment_method: payload.payment_method,
      reference_number: payload.payment_reference,
      notes: payload.payment_notes,
    }];
  }
  return [];
}

async function getProduct(productId, client) {
  const { rows } = await client.query(
    'SELECT product_id, product_name, base_uom_id, cost_price FROM products WHERE product_id = $1 LIMIT 1',
    [productId]
  );
  return rows[0];
}

async function insertPayment(saleId, payment, actorId, client) {
  const paymentMethod = payment.payment_method || 'CASH';
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    throw new AppError('Invalid payment_method.', { status: 400 });
  }

  const { rows } = await client.query(
    `INSERT INTO payments (
      payment_id, sale_id, payment_method, amount, reference_number, received_by, payment_status, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`,
    [
      uuidv4(),
      saleId,
      paymentMethod,
      asNumber(payment.amount),
      payment.reference_number || null,
      actorId || null,
      payment.payment_status || 'SUCCESS',
      payment.notes || null,
    ]
  );
  return rows[0];
}

async function createSale(payload, actor = null) {
  const client = await pool.connect();
  const actorId = getActorId(actor);
  const branchId = payload.branch_id || (actor && actor.branchId);
  const saleId = uuidv4();
  const items = payload.items || [];
  const payments = normalizePayments(payload);

  if (!branchId) {
    throw new AppError('branch_id is required.', { status: 400 });
  }

  try {
    await client.query('BEGIN');

    const preparedItems = [];
    let subtotal = 0;
    let itemDiscountTotal = 0;
    let itemTaxTotal = 0;

    for (const item of items) {
      const product = await getProduct(item.product_id, client);
      if (!product) throw new AppError(`Product not found: ${item.product_id}`, { status: 404 });

      const quantity = asNumber(item.quantity);
      const unitPrice = asNumber(item.unit_price);
      const lineDiscount = asNumber(item.line_discount);
      const taxAmount = asNumber(item.tax_amount);
      const gross = quantity * unitPrice;
      const lineTotal = gross - lineDiscount + taxAmount;

      const inventoryResult = await client.query(
        `UPDATE product_branch_inventory
         SET quantity_on_hand = quantity_on_hand - $1,
             available_quantity = GREATEST(COALESCE(available_quantity, quantity_on_hand) - $1, 0),
             last_updated = now(),
             updated_at = now()
         WHERE product_id = $2
           AND branch_id = $3
           AND quantity_on_hand >= $1
         RETURNING *`,
        [quantity, item.product_id, branchId]
      );

      if (!inventoryResult.rows.length) {
        throw new AppError(`Insufficient stock for "${product.product_name}".`, { status: 409 });
      }

      preparedItems.push({
        sale_item_id: uuidv4(),
        product_id: item.product_id,
        product_name: product.product_name,
        uom_id: item.uom_id || product.base_uom_id,
        quantity,
        unit_price: unitPrice,
        line_discount: lineDiscount,
        line_total: lineTotal,
        cost_price: item.cost_price !== undefined ? asNumber(item.cost_price) : product.cost_price,
        tax_amount: taxAmount,
        batch_number: item.batch_number || null,
        expiry_date: item.expiry_date || null,
      });

      subtotal += gross;
      itemDiscountTotal += lineDiscount;
      itemTaxTotal += taxAmount;
    }

    const discountAmount = payload.discount_amount !== undefined ? asNumber(payload.discount_amount) : itemDiscountTotal;
    const taxAmount = payload.tax_amount !== undefined ? asNumber(payload.tax_amount) : itemTaxTotal;
    const totalAmount = payload.total_amount !== undefined
      ? asNumber(payload.total_amount)
      : subtotal - discountAmount + taxAmount;
    const paidFromPayments = payments.reduce((sum, payment) => sum + asNumber(payment.amount), 0);
    const amountPaid = payload.amount_paid !== undefined ? asNumber(payload.amount_paid) : paidFromPayments;
    const balanceDue = Math.max(totalAmount - amountPaid, 0);
    const paymentStatus = payload.payment_status || (balanceDue === 0 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'UNPAID');
    const status = payload.status || (balanceDue > 0 ? 'PARTIALLY_PAID' : 'COMPLETED');

    const { rows: saleRows } = await client.query(
      `INSERT INTO sales (
        sale_id, branch_id, customer_id, cashier_id, sale_type, sale_date, subtotal,
        discount_amount, tax_amount, total_amount, amount_paid, balance_due, status,
        local_transaction_id, synced, invoice_number, cashier_name, customer_name,
        remarks, device_id, payment_status, due_date, created_offline
      ) VALUES ($1,$2,$3,$4,$5,COALESCE($6, now()),$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      RETURNING *`,
      [
        saleId,
        branchId,
        payload.customer_id || null,
        payload.cashier_id || actorId || null,
        payload.sale_type || 'RETAIL',
        payload.sale_date || null,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        amountPaid,
        balanceDue,
        status,
        payload.local_transaction_id || null,
        payload.synced !== undefined ? payload.synced : true,
        payload.invoice_number || `INV-${Date.now()}`,
        payload.cashier_name || null,
        payload.customer_name || null,
        payload.remarks || null,
        payload.device_id || null,
        paymentStatus,
        payload.due_date || null,
        payload.created_offline || false,
      ]
    );

    for (const item of preparedItems) {
      await client.query(
        `INSERT INTO sale_items (
          sale_item_id, sale_id, product_id, uom_id, quantity, unit_price,
          line_discount, line_total, cost_price, tax_amount, batch_number, expiry_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          item.sale_item_id,
          saleId,
          item.product_id,
          item.uom_id,
          item.quantity,
          item.unit_price,
          item.line_discount,
          item.line_total,
          item.cost_price,
          item.tax_amount,
          item.batch_number,
          item.expiry_date,
        ]
      );
    }

    const createdPayments = [];
    for (const payment of payments) {
      createdPayments.push(await insertPayment(saleId, payment, actorId, client));
    }

    await auditRepo.writeLog(actorId, 'CREATE_SALE', 'SALE', saleId, {
      invoice_number: saleRows[0].invoice_number,
      total_amount: totalAmount,
      item_count: preparedItems.length,
    }, client);

    await client.query('COMMIT');
    cache.delByPattern('reports:*').catch(() => {});

    return {
      ...saleRows[0],
      items: preparedItems,
      payments: createdPayments,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getSaleById(id) {
  const sale = await salesRepo.getSaleById(id);
  if (!sale) throw new AppError('Sale not found.', { status: 404 });
  return sale;
}

async function getSaleItems(id) {
  const sale = await getSaleById(id);
  return sale.items || [];
}

async function listSales(query) {
  const { q, customerId, branchId, status, page = 1, limit = 25 } = query || {};
  const filters = { q, customerId, branchId, status };
  const lim = Number(limit);
  const offset = (Number(page) - 1) * lim;
  const [sales, total] = await Promise.all([
    salesRepo.listSales({ ...filters, limit: lim, offset }),
    salesRepo.countSales(filters),
  ]);
  return { sales, total };
}

async function getSaleReceipt(id, actor = null) {
  const client = await pool.connect();
  const actorId = getActorId(actor);

  try {
    const sale = await getSaleById(id);
    const { rows: existingReceipts } = await client.query('SELECT * FROM receipts WHERE sale_id = $1 LIMIT 1', [id]);

    let receipt = existingReceipts[0];
    if (!receipt) {
      const { rows } = await client.query(
        `INSERT INTO receipts (receipt_id, sale_id, receipt_number, printed_at, printed_by)
         VALUES ($1,$2,$3,now(),$4)
         RETURNING *`,
        [uuidv4(), id, `RCPT-${Date.now()}`, actorId || null]
      );
      receipt = rows[0];
    }

    const { rows: payments } = await client.query(
      'SELECT payment_method, amount, reference_number FROM payments WHERE sale_id = $1 ORDER BY payment_date',
      [id]
    );

    return { receipt, sale: { ...sale, payments } };
  } finally {
    client.release();
  }
}

async function restoreSaleInventory(saleId, branchId, client) {
  const { rows: items } = await client.query(
    'SELECT product_id, quantity FROM sale_items WHERE sale_id = $1',
    [saleId]
  );

  for (const item of items) {
    await client.query(
      `UPDATE product_branch_inventory
       SET quantity_on_hand = quantity_on_hand + $1,
           available_quantity = COALESCE(available_quantity, 0) + $1,
           last_updated = now(),
           updated_at = now()
       WHERE product_id = $2
         AND branch_id = $3`,
      [item.quantity, item.product_id, branchId]
    );
  }
}

async function voidSale(id, actor = null) {
  const actorId = getActorId(actor);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM sales WHERE sale_id = $1 LIMIT 1', [id]);
    const sale = rows[0];
    if (!sale) throw new AppError('Sale not found.', { status: 404 });
    if (sale.status === 'VOID') {
      await client.query('COMMIT');
      return sale;
    }
    if (sale.status === 'REFUNDED') throw new AppError('Refunded sales cannot be voided.', { status: 409 });

    await restoreSaleInventory(id, sale.branch_id, client);

    const { rows: updatedRows } = await client.query(
      `UPDATE sales
       SET status = 'VOID',
           payment_status = 'VOID',
           updated_at = now()
       WHERE sale_id = $1
       RETURNING *`,
      [id]
    );

    await auditRepo.writeLog(actorId, 'VOID_SALE', 'SALE', id, { previous_status: sale.status }, client);
    await client.query('COMMIT');
    cache.delByPattern('reports:*').catch(() => {});
    return updatedRows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function refundSale(id, payload = {}, actor = null) {
  const actorId = getActorId(actor);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM sales WHERE sale_id = $1 LIMIT 1', [id]);
    const sale = rows[0];
    if (!sale) throw new AppError('Sale not found.', { status: 404 });
    if (sale.status === 'VOID') throw new AppError('Voided sales cannot be refunded.', { status: 409 });
    if (sale.status === 'REFUNDED') throw new AppError('Sale is already fully refunded.', { status: 409 });

    const alreadyRefunded = Number(sale.refunded_amount) || 0;
    const maxRefundable = Number(sale.total_amount) - alreadyRefunded;
    if (maxRefundable <= 0) throw new AppError('No amount left to refund.', { status: 409 });

    const refundAmount = payload.amount ? Math.min(Number(payload.amount), maxRefundable) : maxRefundable;
    if (refundAmount <= 0) throw new AppError('Refund amount must be greater than 0.', { status: 400 });

    const totalRefunded = alreadyRefunded + refundAmount;
    const isPartial = totalRefunded < Number(sale.total_amount);
    const newStatus = isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED';

    await restoreSaleInventory(id, sale.branch_id, client);

    const { rows: updatedRows } = await client.query(
      `UPDATE sales
       SET status = $2,
           payment_status = $2,
           refunded_amount = $3,
           remarks = COALESCE($4, remarks),
           updated_at = now()
       WHERE sale_id = $1
       RETURNING *`,
      [id, newStatus, totalRefunded, payload.reason || null]
    );

    await auditRepo.writeLog(actorId, 'REFUND_SALE', 'SALE', id, {
      amount: refundAmount,
      total_refunded: totalRefunded,
      is_partial: isPartial,
      reason: payload.reason || null,
    }, client);

    await client.query('COMMIT');
    cache.delByPattern('reports:*').catch(() => {});
    return updatedRows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createSale,
  getSaleById,
  getSaleItems,
  listSales,
  getSaleReceipt,
  voidSale,
  refundSale,
};
