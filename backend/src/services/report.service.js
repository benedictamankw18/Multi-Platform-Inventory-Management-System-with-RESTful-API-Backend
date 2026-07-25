const expenseRepo = require('../repositories/expense.repository');

async function generateReport({ report_type, from, to, filters = {}, page = 1, limit = 100 } = {}) {
  // Support expenses report via existing repository; other report types return empty dataset for now.
  if (report_type === 'expenses') {
    const query = {
      branchId: filters.branchId || filters.branch_id || null,
      fromDate: from || null,
      toDate: to || null,
      category: filters.category || null,
      limit: Number(limit) || 100,
      offset: (Number(page) - 1) * Number(limit || 100),
    };
    const rows = await expenseRepo.listExpenses(query);
    // normalize rows to objects with consistent keys
    return {
      columns: rows.length ? Object.keys(rows[0]) : [],
      rows,
    };
  }

  // Generic empty response for unsupported types
  return { columns: [], rows: [] };
}

function objectArrayToCsv(rows) {
  if (!rows || !rows.length) return '';
  const cols = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || typeof v === 'undefined') return '';
    const s = String(v);
    if (s.includes(',') || s.includes('\n') || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const header = cols.join(',');
  const lines = rows.map(r => cols.map(c => escape(r[c])).join(','));
  return [header, ...lines].join('\n');
}


const reportRepo = require('../repositories/report.repository');
const cache = require('../utils/cache.utils');

const DEFAULT_TTL = Number(process.env.REPORT_CACHE_TTL) || 300; // seconds

async function cacheWrap(key, fn, ttl = DEFAULT_TTL) {
  try {
    const cached = await cache.get(key);
    if (cached) return cached;
    const result = await fn();
    await cache.set(key, result, ttl);
    return result;
  } catch (err) {
    // On cache errors, still return live data
    return fn();
  }
}

async function dailySales(date, branchId) {
  const key = `reports:dailySales:${branchId || 'all'}:${date || 'all'}`;
  return cacheWrap(key, () => reportRepo.dailySales(date, branchId), 60);
}

async function monthlySales(year, month, branchId) {
  const key = `reports:monthlySales:${branchId || 'all'}:${year || 'all'}:${month || 'all'}`;
  return cacheWrap(key, () => reportRepo.monthlySales(year, month, branchId), 120);
}
async function annualSales(year, branchId) {
  const key = `reports:annualSales:${branchId || 'all'}:${year || 'all'}`;
  return cacheWrap(key, () => reportRepo.annualSales(year, branchId), 300);
}
async function profitReport(startDate, endDate, branchId) {
  const key = `reports:profit:${branchId || 'all'}:${startDate || 'any'}:${endDate || 'any'}`;
  return cacheWrap(key, () => reportRepo.profitReport(startDate, endDate, branchId));
}

async function inventoryReport(branchId) {
  const key = `reports:inventory:${branchId || 'all'}`;
  return cacheWrap(key, () => reportRepo.inventoryReport(branchId), 300);
}

async function lowStock(branchId) {
  const key = `reports:lowStock:${branchId || 'all'}`;
  return cacheWrap(key, () => reportRepo.lowStock(branchId), 300);
}

async function purchasesReport(startDate, endDate, branchId) {
  const key = `reports:purchases:${branchId || 'all'}:${startDate || 'any'}:${endDate || 'any'}`;
  return cacheWrap(key, () => reportRepo.purchasesReport(startDate, endDate, branchId));
}

async function bestSellingProducts(limit = 10, startDate, endDate, branchId) {
  const key = `reports:bestSelling:${branchId || 'all'}:${limit}:${startDate || 'any'}:${endDate || 'any'}`;
  return cacheWrap(key, () => reportRepo.bestSellingProducts(limit, startDate, endDate, branchId), 300);
}

async function branchPerformance(startDate, endDate) {
  const key = `reports:branchPerformance:${startDate || 'any'}:${endDate || 'any'}`;
  return cacheWrap(key, () => reportRepo.branchPerformance(startDate, endDate), 300);
}

module.exports = {
  dailySales,
  monthlySales,
  annualSales,
  profitReport,
  inventoryReport,
  lowStock,
  purchasesReport,
  bestSellingProducts,
  branchPerformance,
  generateReport,
  objectArrayToCsv,
};
