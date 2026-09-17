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
};
