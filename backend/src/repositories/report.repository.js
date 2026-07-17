const client = require('../config/db');

async function dailySales(date) {
  const q = `
    SELECT
      DATE(s.sale_date) as date,
      COUNT(*) as transactions,
      COALESCE(SUM(s.total_amount),0) as total_sales
    FROM sales s
    WHERE DATE(s.sale_date) = $1::date
    GROUP BY DATE(s.sale_date)
  `;
  const { rows } = await client.query(q, [date]);
  return rows[0] || { date, transactions: 0, total_sales: 0 };
}

async function monthlySales(year, month) {
  const q = `
    SELECT
      DATE_TRUNC('day', s.sale_date) as day,
      COUNT(*) as transactions,
      COALESCE(SUM(s.total_amount),0) as total_sales
    FROM sales s
    WHERE EXTRACT(YEAR FROM s.sale_date) = $1 AND EXTRACT(MONTH FROM s.sale_date) = $2
    GROUP BY DATE_TRUNC('day', s.sale_date)
    ORDER BY day
  `;
  const { rows } = await client.query(q, [year, month]);
  return rows || { day, transactions: 0, total_sales: 0 };
}

async function annualSales(date) {
  const q = `
    SELECT
      DATE_TRUNC('year', s.sale_date) as year,
      COUNT(*) as transactions,
      COALESCE(SUM(s.total_amount),0) as total_sales
    FROM sales s
    WHERE EXTRACT(YEAR FROM s.sale_date) = $1
    GROUP BY DATE_TRUNC('year', s.sale_date)
    ORDER BY year
  `;
  const { rows } = await client.query(q, [date]);
  return rows || { year, transactions: 0, total_sales: 0 };
}

async function profitReport(startDate, endDate) {
  const q = `
    SELECT
      COALESCE(SUM(si.quantity * (si.unit_price - COALESCE(p.cost_price,0))),0) as profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.sale_id
    LEFT JOIN products p ON si.product_id = p.product_id
    WHERE s.sale_date BETWEEN $1 AND $2
  `;
  const { rows } = await client.query(q, [startDate, endDate]);
  return rows[0] || { profit: 0 };
}

async function inventoryReport() {
  const q = `
    SELECT i.transaction_id, i.product_id, i.quantity, p.product_name, u.uom_name
    FROM inventory_transactions i
    LEFT JOIN products p ON i.product_id = p.product_id
    LEFT JOIN units_of_measure u ON p.base_uom_id = u.uom_id
    ORDER BY p.product_name NULLS LAST
  `;
  const { rows } = await client.query(q);
  return rows || [];
}

async function lowStock() {
  const q = `
    SELECT i.transaction_id, i.product_id, i.quantity, p.product_name
    FROM inventory_transactions i
    LEFT JOIN products p ON i.product_id = p.product_id
    WHERE i.quantity <= p.minimum_stock
    ORDER BY i.quantity ASC
  `;
  const { rows } = await client.query(q);
  return rows || [];
}

async function purchasesReport(startDate, endDate) {
  const q = `
    SELECT DATE(p.created_at) as date, COUNT(*) as purchases, COALESCE(SUM(p.total_amount),0) as total_purchased
    FROM purchase_orders p
    WHERE p.created_at BETWEEN $1 AND $2
    GROUP BY DATE(p.created_at)
    ORDER BY DATE(p.created_at)
  `;
  const { rows } = await client.query(q, [startDate, endDate]);
  return rows || [];
}

async function bestSellingProducts(limit = 10, startDate, endDate) {
  const q = `
    SELECT si.product_id, p.product_name, COALESCE(SUM(si.quantity),0) as qty_sold
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.sale_id
    LEFT JOIN products p ON si.product_id = p.product_id
    WHERE s.sale_date BETWEEN $2 AND $3
    GROUP BY si.product_id, p.product_name
    ORDER BY qty_sold DESC
    LIMIT $1
  `;
  const { rows } = await client.query(q, [limit, startDate, endDate]);
  return rows || [];
}

async function branchPerformance(startDate, endDate) {
  const q = `
    SELECT b.branch_id as branch_id, COALESCE(b.branch_name,'Unknown') as branch_name,
      COUNT(s.sale_id) as transactions, COALESCE(SUM(s.total_amount),0) as total_sales
    FROM sales s
    LEFT JOIN branches b ON s.branch_id = b.branch_id
    WHERE s.sale_date BETWEEN $1 AND $2
    GROUP BY b.branch_id, b.branch_name
    ORDER BY total_sales DESC
  `;
  const { rows } = await client.query(q, [startDate, endDate]);
  return rows || [];
}

async function profit({ startDate, endDate }) {
  const salesQ = `SELECT COALESCE(SUM(si.quantity * COALESCE(si.unit_price,0)),0) as revenue
    FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id WHERE s.sale_date BETWEEN $1 AND $2`;
  const purchasesQ = `SELECT COALESCE(SUM(total_amount),0) as cost FROM purchase_orders WHERE created_at BETWEEN $1 AND $2`;
  const salesRes = await client.query(salesQ, [startDate, endDate]);
  const purchasesRes = await client.query(purchasesQ, [startDate, endDate]);
  return { revenue: Number(salesRes.rows[0].revenue || 0), cost: Number(purchasesRes.rows[0].cost || 0), profit: Number((salesRes.rows[0].revenue || 0) - (purchasesRes.rows[0].cost || 0)) };
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
};
