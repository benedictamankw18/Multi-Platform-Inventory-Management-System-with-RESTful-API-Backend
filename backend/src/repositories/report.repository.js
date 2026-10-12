const client = require('../config/db');

async function dailySales(date, branchId) {
  const params = [date];
  const branchFilter = branchId ? `AND s.branch_id = $${params.push(branchId)}` : '';
  const q = `
    SELECT
      DATE(s.sale_date) as date,
      COUNT(*) as transactions,
      COALESCE(SUM(s.total_amount),0) as total_sales
    FROM sales s
    WHERE DATE(s.sale_date) = $1::date
    ${branchFilter}
    GROUP BY DATE(s.sale_date)
  `;
  const { rows } = await client.query(q, params);
  return rows[0] || { date, transactions: 0, total_sales: 0 };
}

async function monthlySales(year, month, branchId) {
  const params = [year, month];
  const branchFilter = branchId ? `AND s.branch_id = $${params.push(branchId)}` : '';
  const q = `
    SELECT
      DATE_TRUNC('day', s.sale_date) as day,
      COUNT(*) as transactions,
      COALESCE(SUM(s.total_amount),0) as total_sales
    FROM sales s
    WHERE EXTRACT(YEAR FROM s.sale_date) = $1 AND EXTRACT(MONTH FROM s.sale_date) = $2
    ${branchFilter}
    GROUP BY DATE_TRUNC('day', s.sale_date)
    ORDER BY day
  `;
  const { rows } = await client.query(q, params);
  return rows || [];
}

async function annualSales(date, branchId) {
  const params = [date];
  const branchFilter = branchId ? `AND s.branch_id = $${params.push(branchId)}` : '';
  const q = `
    SELECT
      DATE_TRUNC('year', s.sale_date) as year,
      COUNT(*) as transactions,
      COALESCE(SUM(s.total_amount),0) as total_sales
    FROM sales s
    WHERE EXTRACT(YEAR FROM s.sale_date) = $1
    ${branchFilter}
    GROUP BY DATE_TRUNC('year', s.sale_date)
    ORDER BY year
  `;
  const { rows } = await client.query(q, params);
  return rows || [];
}

async function profitReport(startDate, endDate, branchId) {
  const params = [startDate, endDate];
  const branchFilter = branchId ? `AND s.branch_id = $${params.push(branchId)}` : '';
  const q = `
    SELECT
      COALESCE(SUM(si.quantity * (si.unit_price - COALESCE(p.cost_price,0))),0) as profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.sale_id
    LEFT JOIN products p ON si.product_id = p.product_id
    WHERE s.sale_date >= $1 AND s.sale_date < ($2::date + interval '1 day')
    ${branchFilter}
  `;
  const { rows } = await client.query(q, params);
  return rows[0] || { profit: 0 };
}

async function inventoryReport(branchId) {
  const params = [];
  const branchFilter = branchId ? `WHERE i.branch_id = $${params.push(branchId)}` : '';
  const q = `
    SELECT i.inventory_id, i.product_id, i.quantity_on_hand, i.available_quantity, i.reorder_level, i.reorder_level, p.product_name, p.sku, b.branch_name, u.uom_name
    FROM product_branch_inventory i
    LEFT JOIN products p ON i.product_id = p.product_id
    LEFT JOIN units_of_measure u ON p.base_uom_id = u.uom_id
    LEFT JOIN branches b ON i.branch_id = b.branch_id
    ${branchFilter}
    ORDER BY p.product_name NULLS LAST
  `;
  const { rows } = await client.query(q, params);
  return rows || [];
}

async function lowStock(branchId) {
  const params = [];
  const branchFilter = branchId ? `AND i.branch_id = $${params.push(branchId)}` : '';
  const threshold = 'COALESCE(NULLIF(i.reorder_level, 0), p.minimum_stock)';
  const q = `
    SELECT i.inventory_id, i.product_id, i.quantity_on_hand, i.available_quantity, i.reorder_level, p.product_name, p.sku, b.branch_name
    FROM product_branch_inventory i
    LEFT JOIN products p ON i.product_id = p.product_id
    LEFT JOIN branches b ON i.branch_id = b.branch_id
    WHERE (i.quantity_on_hand <= ${threshold} OR i.available_quantity <= ${threshold})
    ${branchFilter}
    ORDER BY i.available_quantity ASC
  `;
  const { rows } = await client.query(q, params);
  return rows || [];
}

async function purchasesReport(startDate, endDate, branchId) {
  const params = [startDate, endDate];
  const branchFilter = branchId ? `AND p.branch_id = $${params.push(branchId)}` : '';
  const q = `
    SELECT DATE(p.created_at) as date, COUNT(*) as purchases, COALESCE(SUM(p.total_amount),0) as total_purchased
    FROM purchase_orders p
    WHERE p.created_at >= $1 AND p.created_at < ($2::date + interval '1 day')
    ${branchFilter}
    GROUP BY DATE(p.created_at)
    ORDER BY DATE(p.created_at)
  `;
  const { rows } = await client.query(q, params);
  return rows || [];
}

async function bestSellingProducts(limit = 10, startDate, endDate, branchId) {
  const params = [limit, startDate, endDate];
  const branchFilter = branchId ? `AND s.branch_id = $${params.push(branchId)}` : '';
  const q = `
    SELECT si.product_id, p.product_name, COALESCE(SUM(si.quantity),0) as qty_sold
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.sale_id
    LEFT JOIN products p ON si.product_id = p.product_id
    WHERE s.sale_date >= $2 AND s.sale_date < ($3::date + interval '1 day')
    ${branchFilter}
    GROUP BY si.product_id, p.product_name
    ORDER BY qty_sold DESC
    LIMIT $1
  `;
  const { rows } = await client.query(q, params);
  return rows || [];
}

async function branchPerformance(startDate, endDate) {
  const q = `
    SELECT b.branch_id as branch_id, COALESCE(b.branch_name,'Unknown') as branch_name,
      COUNT(s.sale_id) as transactions, COALESCE(SUM(s.total_amount),0) as total_sales
    FROM sales s
    LEFT JOIN branches b ON s.branch_id = b.branch_id
    WHERE s.sale_date >= $1 AND s.sale_date < ($2::date + interval '1 day')
    GROUP BY b.branch_id, b.branch_name
    ORDER BY total_sales DESC
  `;
  const { rows } = await client.query(q, [startDate, endDate]);
  return rows || [];
}

async function profit({ startDate, endDate }, branchId) {
  const salesParams = [startDate, endDate];
  const purchasesParams = [startDate, endDate];
  const salesBranchFilter = branchId ? `AND s.branch_id = $${salesParams.push(branchId)}` : '';
  const purchasesBranchFilter = branchId ? `AND p.branch_id = $${purchasesParams.push(branchId)}` : '';
  const salesQ = `SELECT COALESCE(SUM(si.quantity * COALESCE(si.unit_price,0)),0) as revenue
    FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id WHERE s.sale_date >= $1 AND s.sale_date < ($2::date + interval '1 day')${salesBranchFilter}`;
  const purchasesQ = `SELECT COALESCE(SUM(total_amount),0) as cost FROM purchase_orders p WHERE p.created_at >= $1 AND p.created_at < ($2::date + interval '1 day')${purchasesBranchFilter}`;
  const salesRes = await client.query(salesQ, salesParams);
  const purchasesRes = await client.query(purchasesQ, purchasesParams);
  return { revenue: Number(salesRes.rows[0].revenue || 0), cost: Number(purchasesRes.rows[0].cost || 0), profit: Number((salesRes.rows[0].revenue || 0) - (purchasesRes.rows[0].cost || 0)) };
}

async function stockMovements({ startDate, endDate, branchId, productId, transactionType, groupBy = 'product' } = {}) {
  const params = [startDate, endDate];
  const where = [`it.created_at >= $1 AND it.created_at < ($2::date + interval '1 day')`];
  if (branchId) where.push(`it.branch_id = $${params.push(branchId)}`);
  if (productId) where.push(`it.product_id = $${params.push(productId)}`);
  if (transactionType) where.push(`it.transaction_type = $${params.push(transactionType)}`);
  const whereSql = ` WHERE ${where.join(' AND ')}`;

  if (groupBy === 'day') {
    const q = `
      SELECT DATE(it.created_at) as date,
        COALESCE(SUM(CASE WHEN it.transaction_type IN ('STOCK_IN','TRANSFER_IN','ADJUSTMENT') THEN it.quantity ELSE 0 END),0) as total_in,
        COALESCE(SUM(CASE WHEN it.transaction_type IN ('STOCK_OUT','TRANSFER_OUT','SALE') THEN it.quantity ELSE 0 END),0) as total_out,
        COALESCE(SUM(CASE WHEN it.transaction_type IN ('STOCK_IN','TRANSFER_IN','ADJUSTMENT') THEN it.quantity ELSE -it.quantity END),0) as net,
        COUNT(*) as transactions
      FROM inventory_transactions it
      ${whereSql}
      GROUP BY DATE(it.created_at)
      ORDER BY DATE(it.created_at)
    `;
    const { rows } = await client.query(q, params);
    return rows || [];
  }

  const q = `
    SELECT it.product_id, p.product_name, p.sku,
      COALESCE(SUM(CASE WHEN it.transaction_type = 'STOCK_IN' THEN it.quantity ELSE 0 END),0) as stock_in,
      COALESCE(SUM(CASE WHEN it.transaction_type = 'STOCK_OUT' THEN it.quantity ELSE 0 END),0) as stock_out,
      COALESCE(SUM(CASE WHEN it.transaction_type = 'ADJUSTMENT' THEN it.quantity ELSE 0 END),0) as adjustment,
      COALESCE(SUM(CASE WHEN it.transaction_type = 'TRANSFER_IN' THEN it.quantity ELSE 0 END),0) as transfer_in,
      COALESCE(SUM(CASE WHEN it.transaction_type = 'TRANSFER_OUT' THEN it.quantity ELSE 0 END),0) as transfer_out,
      COALESCE(SUM(CASE WHEN it.transaction_type = 'SALE' THEN it.quantity ELSE 0 END),0) as sale,
      COALESCE(SUM(CASE WHEN it.transaction_type IN ('STOCK_IN','TRANSFER_IN','ADJUSTMENT') THEN it.quantity ELSE -it.quantity END),0) as net
    FROM inventory_transactions it
    LEFT JOIN products p ON p.product_id = it.product_id
    ${whereSql}
    GROUP BY it.product_id, p.product_name, p.sku
    ORDER BY net DESC, p.product_name ASC NULLS LAST
  `;
  const { rows } = await client.query(q, params);
  return rows || [];
}

// Batches expiring within `withinDays` for expiry-tracked products. When
// `includeExpired` is false, already-expired batches are excluded. The
// sentinel backfill date (9999-12-31) never appears.
async function expiryReport(branchId, withinDays = 30, includeExpired = false) {
  const params = [];
  const branchFilter = branchId ? `AND b.branch_id = $${params.push(branchId)}` : '';
  const days = Number.isFinite(Number(withinDays)) ? Number(withinDays) : 30;
  const daysParam = `$${params.push(days)}`;
  const horizon = `(current_date + ${daysParam} * INTERVAL '1 day')`;
  const expiryFilter = includeExpired
    ? `b.expiry_date < ${horizon}`
    : `b.expiry_date >= current_date AND b.expiry_date < ${horizon}`;

  const q = `
    SELECT
      b.batch_id,
      b.product_id,
      p.product_name,
      p.sku,
      b.branch_id,
      br.branch_name,
      b.batch_number,
      b.expiry_date,
      (b.expiry_date - current_date) AS days_to_expiry,
      b.quantity_on_hand,
      b.quantity_reserved,
      b.cost_price,
      (b.quantity_on_hand * COALESCE(b.cost_price, 0)) AS value_at_cost,
      CASE
        WHEN b.expiry_date < current_date THEN 'EXPIRED'
        WHEN b.expiry_date <= current_date + 7 THEN 'CRITICAL'
        WHEN b.expiry_date <= current_date + 30 THEN 'WARNING'
        ELSE 'OK'
      END AS expiry_status
    FROM product_batches b
    JOIN products p ON p.product_id = b.product_id
    LEFT JOIN branches br ON br.branch_id = b.branch_id
    WHERE b.status = 'ACTIVE'
      AND b.quantity_on_hand > 0
      AND b.expiry_date < DATE '9999-12-31'
      AND ${expiryFilter}
      ${branchFilter}
    ORDER BY b.expiry_date ASC, p.product_name ASC NULLS LAST
  `;
  const { rows } = await client.query(q, params);
  return rows || [];
}

// Reconciliation check: rows where the aggregate cache disagrees with the sum
// of the batch ledger for expiry-tracked products. Report only, never auto-fix.
async function expiryReconciliation(branchId) {
  const params = [];
  const where = [
    'p.expiry_required = TRUE',
    'agg.quantity_on_hand <> COALESCE(batch.batch_qty, 0)',
  ];
  if (branchId) where.push(`agg.branch_id = $${params.push(branchId)}`);

  const q = `
    SELECT
      COUNT(*) AS drift_rows,
      COALESCE(SUM(ABS(agg.quantity_on_hand - COALESCE(batch.batch_qty, 0))), 0) AS drift_quantity
    FROM product_branch_inventory agg
    JOIN products p ON p.product_id = agg.product_id
    LEFT JOIN (
      SELECT product_id, branch_id, SUM(quantity_on_hand) AS batch_qty
      FROM product_batches
      WHERE status IN ('ACTIVE', 'EXPIRED')
      GROUP BY product_id, branch_id
    ) batch ON batch.product_id = agg.product_id AND batch.branch_id = agg.branch_id
    WHERE ${where.join(' AND ')}
  `;
  const { rows } = await client.query(q, params);
  return rows[0] || { drift_rows: 0, drift_quantity: 0 };
}

// ---------------------------------------------------------------------------
// Sales trend
//
// Bucketed revenue / profit / orders across an arbitrary date range, plus the
// totals for the immediately preceding equal-length window (so the UI can show
// a period-over-period delta). VOID sales are excluded so the trend reflects
// real trading. Buckets are returned as plain 'YYYY-MM-DD' text (via TO_CHAR)
// so the caller never has to reason about the driver's timezone handling, and
// every bucket in the range is present (gaps filled with zeroes).
// ---------------------------------------------------------------------------

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

function daysBetween(a, b) {
  return Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
}

// Bucket start dates (inclusive) covering the range for a granularity.
function bucketStartDates(startDate, endDate, unit) {
  const last = new Date(`${endDate}T00:00:00Z`);
  const starts = [];

  if (unit === 'week') {
    const cur = new Date(`${startDate}T00:00:00Z`);
    // DATE_TRUNC('week') starts on Monday.
    cur.setUTCDate(cur.getUTCDate() - ((cur.getUTCDay() + 6) % 7));
    while (cur <= last) {
      starts.push(toISODate(cur));
      cur.setUTCDate(cur.getUTCDate() + 7);
    }
    return starts;
  }

  if (unit === 'month') {
    const cur = new Date(`${startDate}T00:00:00Z`);
    cur.setUTCDate(1);
    while (cur <= last) {
      starts.push(toISODate(cur));
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    return starts;
  }

  const cur = new Date(`${startDate}T00:00:00Z`);
  while (cur <= last) {
    starts.push(toISODate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return starts;
}

async function rangeSummary(startDate, endDate, branchId) {
  const params = [startDate, endDate];
  const branchFilter = branchId ? `AND s.branch_id = $${params.push(branchId)}` : '';
  const salesQ = `
    SELECT COUNT(*)::int AS orders, COALESCE(SUM(s.total_amount), 0) AS revenue
    FROM sales s
    WHERE s.sale_date >= $1 AND s.sale_date < ($2::date + interval '1 day')
      AND s.status <> 'VOID'
      ${branchFilter}
  `;
  const itemsQ = `
    SELECT COALESCE(SUM(si.quantity * (si.unit_price - COALESCE(si.cost_price, p.cost_price, 0))), 0) AS profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.sale_id
    LEFT JOIN products p ON si.product_id = p.product_id
    WHERE s.sale_date >= $1 AND s.sale_date < ($2::date + interval '1 day')
      AND s.status <> 'VOID'
      ${branchFilter}
  `;
  const [salesRes, itemsRes] = await Promise.all([
    client.query(salesQ, params),
    client.query(itemsQ, params),
  ]);
  return {
    revenue: Number(salesRes.rows[0].revenue || 0),
    orders: Number(salesRes.rows[0].orders || 0),
    profit: Number(itemsRes.rows[0].profit || 0),
  };
}

async function salesTrend({ startDate, endDate, branchId = null, granularity = 'day' } = {}) {
  const unit = ['day', 'week', 'month'].includes(granularity) ? granularity : 'day';
  const params = [startDate, endDate];
  const branchFilter = branchId ? `AND s.branch_id = $${params.push(branchId)}` : '';

  // Sales totals and item-level profit are aggregated in separate queries so the
  // sale_items join cannot fan out the SUM(sales.total_amount).
  const salesQ = `
    SELECT TO_CHAR(DATE_TRUNC('${unit}', s.sale_date), 'YYYY-MM-DD') AS bucket,
           COUNT(*)::int AS orders,
           COALESCE(SUM(s.total_amount), 0) AS revenue
    FROM sales s
    WHERE s.sale_date >= $1 AND s.sale_date < ($2::date + interval '1 day')
      AND s.status <> 'VOID'
      ${branchFilter}
    GROUP BY 1
    ORDER BY 1
  `;
  const itemsQ = `
    SELECT TO_CHAR(DATE_TRUNC('${unit}', s.sale_date), 'YYYY-MM-DD') AS bucket,
           COALESCE(SUM(si.quantity * (si.unit_price - COALESCE(si.cost_price, p.cost_price, 0))), 0) AS profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.sale_id
    LEFT JOIN products p ON si.product_id = p.product_id
    WHERE s.sale_date >= $1 AND s.sale_date < ($2::date + interval '1 day')
      AND s.status <> 'VOID'
      ${branchFilter}
    GROUP BY 1
    ORDER BY 1
  `;

  const [salesRes, itemsRes] = await Promise.all([
    client.query(salesQ, params),
    client.query(itemsQ, params),
  ]);

  const salesByBucket = new Map(salesRes.rows.map((r) => [r.bucket, r]));
  const profitByBucket = new Map(itemsRes.rows.map((r) => [r.bucket, Number(r.profit || 0)]));

  const points = bucketStartDates(startDate, endDate, unit).map((bucket) => {
    const s = salesByBucket.get(bucket);
    return {
      bucket,
      revenue: Number(s ? s.revenue : 0),
      orders: Number(s ? s.orders : 0),
      profit: profitByBucket.get(bucket) || 0,
    };
  });

  const totals = points.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.revenue,
      orders: acc.orders + p.orders,
      profit: acc.profit + p.profit,
    }),
    { revenue: 0, orders: 0, profit: 0 },
  );

  // Previous equal-length window, ending the day before the range starts.
  const spanDays = daysBetween(startDate, endDate) + 1;
  const prevEnd = addDays(startDate, -1);
  const prevStart = addDays(prevEnd, -(spanDays - 1));
  const previous = await rangeSummary(prevStart, prevEnd, branchId);

  return { granularity: unit, startDate, endDate, points, totals, previous };
}

module.exports = {
  dailySales,
  monthlySales,
  profit,
  profitReport,
  annualSales,
  inventoryReport,
  lowStock,
  purchasesReport,
  bestSellingProducts,
  branchPerformance,
  stockMovements,
  expiryReport,
  expiryReconciliation,
  salesTrend,
};
