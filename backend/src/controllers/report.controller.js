const reportService = require('../services/report.service');
const { format } = require('fast-csv');
const ExcelJS = require('exceljs');

function extractRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.rows)) return payload.rows;
  // try to find first array value
  for (const k of Object.keys(payload)) {
    if (Array.isArray(payload[k])) return payload[k];
  }
  return [payload];
}

async function sendExport(res, data, nameBase = 'report', format = 'csv') {
  const rows = extractRows(data);
  const filename = `${nameBase}-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}`;
  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');
    const columns = [];
    const keys = Array.from(rows.reduce((set, r) => { Object.keys(r || {}).forEach(k=>set.add(k)); return set; }, new Set()));
    if (keys.length === 0) {
      sheet.addRow([JSON.stringify(rows)]);
    } else {
      sheet.columns = keys.map(k => ({ header: k, key: k }));
      rows.forEach(r => sheet.addRow(r));
    }
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    return res.send(buffer);
  }

  // default CSV — stream using fast-csv
  try {
    const keys = Array.from(rows.reduce((set, r) => { Object.keys(r || {}).forEach(k=>set.add(k)); return set; }, new Set()));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    const csvStream = format({ headers: keys.length > 0 ? keys : true });
    csvStream.pipe(res);
    if (keys.length === 0) {
      csvStream.write({ data: JSON.stringify(rows) });
    } else {
      rows.forEach(r => csvStream.write(r || {}));
    }
    csvStream.end();
    return;
  } catch (err) {
    // fallback to JSON
    res.setHeader('Content-Type', 'application/json');
    return res.send({ data });
  }
}

async function dailySales(req, res, next) {
  try {
    const date = req.query.date || req.body.date;
    const data = await reportService.dailySales(date);
    if (req.query.format) return sendExport(res, data, 'daily-sales', req.query.format);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function monthlySales(req, res, next) {
  try {
    const { year, month } = req.query;
    const data = await reportService.monthlySales(Number(year), Number(month));
    if (req.query.format) return sendExport(res, data, 'monthly-sales', req.query.format);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function annualSales(req, res, next) {
  try {
    const { year } = req.query;
    const data = await reportService.annualSales(Number(year));
    if (req.query.format) return sendExport(res, data, 'annual-sales', req.query.format);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function profitReport(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const data = await reportService.profitReport(startDate, endDate);
    if (req.query.format) return sendExport(res, data, 'profit-report', req.query.format);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function inventoryReport(req, res, next) {
  try {
    const data = await reportService.inventoryReport();
    if (req.query.format) return sendExport(res, data, 'inventory-report', req.query.format);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function lowStock(req, res, next) {
  try {
    const threshold = req.query.threshold || req.body.threshold || 10;
    const data = await reportService.lowStock(Number(threshold));
    if (req.query.format) return sendExport(res, data, 'low-stock', req.query.format);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function purchasesReport(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const data = await reportService.purchasesReport(startDate, endDate);
    if (req.query.format) return sendExport(res, data, 'purchases-report', req.query.format);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function bestSellingProducts(req, res, next) {
  try {
    const limit = req.query.limit || 10;
    const { startDate, endDate } = req.query;
    const data = await reportService.bestSellingProducts(Number(limit), startDate, endDate);
    if (req.query.format) return sendExport(res, data, 'best-selling', req.query.format);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function branchPerformance(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const data = await reportService.branchPerformance(startDate, endDate);
    if (req.query.format) return sendExport(res, data, 'branch-performance', req.query.format);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}


async function listReports(req, res, next) {
  try {
    const { report_type, from, to, page = 1, limit = 100 } = req.query;
    const filters = req.query.filters || {};
    const result = await reportService.generateReport({ report_type, from, to, filters, page, limit });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function exportReport(req, res, next) {
  try {
    const { report_type, from, to, format = 'csv', page = 1, limit = 100 } = req.query;
    const filters = req.query.filters || {};
    const result = await reportService.generateReport({ report_type, from, to, filters, page, limit });

    if (format === 'csv') {
      const csv = reportService.objectArrayToCsv(result.rows || []);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${report_type || 'report'}.csv"`);
      return res.send(csv);
    }

    // XLSX streaming not implemented yet
    res.status(501).json({ message: 'XLSX export not implemented yet' });
  } catch (err) {
    next(err);
  }
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
  listReports,
  exportReport,
};
