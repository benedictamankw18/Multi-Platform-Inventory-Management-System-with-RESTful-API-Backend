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
  return rows;
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
  return rows;
}

async function profitReport(startDate, endDate) {
  const q = `
    SELECT
      COALESCE(SUM(si.quantity * (si.unit_price - COALESCE(p.cost_price,0))),0) as profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN products p ON si.product_id = p.id
    WHERE s.sale_date BETWEEN $1 AND $2
  `;
  const { rows } = await client.query(q, [startDate, endDate]);
  return rows[0] || { profit: 0 };
}

async function inventoryReport() {
  const q = `
    SELECT i.id, i.product_id, i.quantity, p.product_name, u.uom_name
    FROM inventories i
    LEFT JOIN products p ON i.product_id = p.id
    LEFT JOIN units_of_measure u ON i.uom_id = u.id
    ORDER BY p.product_name NULLS LAST
  `;
  const { rows } = await client.query(q);
  return rows;
}

async function lowStock(threshold) {
  const q = `
    SELECT i.id, i.product_id, i.quantity, p.product_name
    FROM inventories i
    LEFT JOIN products p ON i.product_id = p.id
    WHERE i.quantity <= $1
    ORDER BY i.quantity ASC
  `;
  const { rows } = await client.query(q, [threshold]);
  return rows;
}

async function purchasesReport(startDate, endDate) {
  const q = `
    SELECT DATE(p.sale_date) as date, COUNT(*) as purchases, COALESCE(SUM(p.total_amount),0) as total_purchased
    FROM purchases p
    WHERE p.sale_date BETWEEN $1 AND $2
    GROUP BY DATE(p.sale_date)
    ORDER BY DATE(p.sale_date)
  `;
  const { rows } = await client.query(q, [startDate, endDate]);
  return rows;
}

async function bestSellingProducts(limit = 10, startDate, endDate) {
  const q = `
    SELECT si.product_id, p.product_name, COALESCE(SUM(si.quantity),0) as qty_sold
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN products p ON si.product_id = p.id
    WHERE s.sale_date BETWEEN $2 AND $3
    GROUP BY si.product_id, p.product_name
    ORDER BY qty_sold DESC
    LIMIT $1
  `;
  const { rows } = await client.query(q, [limit, startDate, endDate]);
  return rows;
}

async function branchPerformance(startDate, endDate) {
  const q = `
    SELECT COALESCE(b.id, 'unknown') as branch_id, COALESCE(b.name,'Unknown') as branch_name,
      COUNT(s.id) as transactions, COALESCE(SUM(s.total_amount),0) as total_sales
    FROM sales s
    LEFT JOIN branches b ON s.branch_id = b.id
    WHERE s.sale_date BETWEEN $1 AND $2
    GROUP BY b.id, b.name
    ORDER BY total_sales DESC
  `;
  const { rows } = await client.query(q, [startDate, endDate]);
  return rows;
}

module.exports = {
  dailySales,
  monthlySales,
  profitReport,
  inventoryReport,
  lowStock,
  purchasesReport,
  bestSellingProducts,
  branchPerformance,
};

async function dailySales({ date }) {
  const q = `SELECT date_trunc('day', sale_date) as day, COUNT(*) as orders, SUM(total_amount) as total_sales
    FROM sales WHERE date_trunc('day', sale_date) = $1 GROUP BY day ORDER BY day`;
  const { rows } = await client.query(q, [date]);
  return rows;
}

async function monthlySales({ year, month }) {
  const q = `SELECT date_trunc('month', sale_date) as month, COUNT(*) as orders, SUM(total_amount) as total_sales
    FROM sales WHERE EXTRACT(YEAR FROM sale_date) = $1 AND EXTRACT(MONTH FROM sale_date) = $2 GROUP BY month ORDER BY month`;
  const { rows } = await client.query(q, [year, month]);
  return rows;
}

async function annualSales({ year }) {
  const q = `SELECT date_trunc('year', sale_date) as year, COUNT(*) as orders, SUM(total_amount) as total_sales
    FROM sales WHERE EXTRACT(YEAR FROM sale_date) = $1 GROUP BY year ORDER BY year`;
  const { rows } = await client.query(q, [year]);
  return rows;
}

async function profit({ startDate, endDate }) {
  const salesQ = `SELECT COALESCE(SUM(si.quantity * COALESCE(si.unit_price,0)),0) as revenue
    FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.sale_date BETWEEN $1 AND $2`;
  const purchasesQ = `SELECT COALESCE(SUM(total_amount),0) as cost FROM purchases WHERE purchase_date BETWEEN $1 AND $2`;
  const salesRes = await client.query(salesQ, [startDate, endDate]);
  const purchasesRes = await client.query(purchasesQ, [startDate, endDate]);
  return { revenue: Number(salesRes.rows[0].revenue || 0), cost: Number(purchasesRes.rows[0].cost || 0), profit: Number((salesRes.rows[0].revenue || 0) - (purchasesRes.rows[0].cost || 0)) };
}

async function inventoryReport() {
  const q = `SELECT i.id, p.product_name, i.quantity, i.location, i.is_active, u.uom_name
    FROM inventories i LEFT JOIN products p ON p.id = i.product_id LEFT JOIN units_of_measure u ON u.id = i.uom_id ORDER BY p.product_name`;
  const { rows } = await client.query(q);
  return rows;
}

async function lowStock({ threshold = 5 }) {
  const q = `SELECT i.id, p.product_name, i.quantity, i.location FROM inventories i LEFT JOIN products p ON p.id = i.product_id WHERE i.quantity <= $1 ORDER BY i.quantity ASC`;
  const { rows } = await client.query(q, [threshold]);
  return rows;
}

async function purchasesReport({ startDate, endDate }) {
  const q = `SELECT DATE(purchase_date) as date, supplier_id, COUNT(*) as orders, SUM(total_amount) as total FROM purchases WHERE purchase_date BETWEEN $1 AND $2 GROUP BY DATE(purchase_date), supplier_id ORDER BY DATE(purchase_date)`;
  const { rows } = await client.query(q, [startDate, endDate]);
  return rows;
}

async function bestSellingProducts({ startDate, endDate, limit = 10 }) {
  const q = `SELECT si.product_id, p.product_name, SUM(si.quantity) as total_sold, SUM(si.quantity * COALESCE(si.unit_price,0)) as revenue
    FROM sale_items si JOIN sales s ON si.sale_id = s.id JOIN products p ON p.id = si.product_id
    WHERE s.sale_date BETWEEN $1 AND $2 GROUP BY si.product_id, p.product_name ORDER BY total_sold DESC LIMIT $3`;
  const { rows } = await client.query(q, [startDate, endDate, limit]);
  return rows;
}

async function branchPerformance({ startDate, endDate }) {
  const q = `SELECT s.branch_id, b.name as branch_name, COUNT(*) as orders, SUM(s.total_amount) as revenue
    FROM sales s LEFT JOIN branches b ON b.id = s.branch_id WHERE s.sale_date BETWEEN $1 AND $2 GROUP BY s.branch_id, b.name ORDER BY revenue DESC`;
  const { rows } = await client.query(q, [startDate, endDate]);
  return rows;
}

module.exports = {
  dailySales,
  monthlySales,
  profit,
  inventoryReport,
  lowStock,
  purchasesReport,
  bestSellingProducts,
  branchPerformance,
};
