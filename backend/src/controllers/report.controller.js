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

        const { date, format, branchId: branchIdParam } = {
            ...req.query,
            ...req.body
        };
        const branchId = branchIdParam || (req.user && (req.user.branch_id || req.user.branchId)) || null;

        let targetDate = new Date();

        if (date) {
            targetDate = new Date(date);

            if (isNaN(targetDate.getTime())) {
                return res.status(400).json({
                    message: "Invalid date format."
                });
            }
        }

        const data = await reportService.dailySales(targetDate, branchId);

        if (format) {
            return sendExport(
                res,
                data,
                "daily-sales",
                format
            );
        }

        return res.json({ data });

    } catch (err) {
        next(err);
    }
}

async function monthlySales(req, res, next) {
    try {

        const today = new Date();

        const year = req.query.year
            ? Number(req.query.year)
            : today.getFullYear();

        const month = req.query.month
            ? Number(req.query.month)
            : today.getMonth() + 1;

        if (
            Number.isNaN(year) ||
            Number.isNaN(month) ||
            month < 1 ||
            month > 12
        ) {
            return res.status(400).json({
                message: "Invalid year or month."
            });
        }

        const branchId = req.query.branchId || (req.user && (req.user.branch_id || req.user.branchId)) || null;

        const data = await reportService.monthlySales(year, month, branchId);

        if (req.query.format) {
            return sendExport(
                res,
                data,
                "monthly-sales",
                req.query.format
            );
        }

        return res.json({ data });

    } catch (err) {
        next(err);
    }
}

async function annualSales(req, res, next) {
    try {

        const currentYear = new Date().getFullYear();

        const year = req.query.year
            ? Number(req.query.year)
            : currentYear;

        if (Number.isNaN(year) || year < 2000) {
            return res.status(400).json({
                message: "Invalid year."
            });
        }

        const branchId = req.query.branchId || (req.user && (req.user.branch_id || req.user.branchId)) || null;

        const data = await reportService.annualSales(year, branchId);

        if (req.query.format) {
            return sendExport(
                res,
                data,
                "annual-sales",
                req.query.format
            );
        }

        return res.json({ data });

    } catch (err) {
        next(err);
    }
}

async function profitReport(req, res, next) {
    try {

        const { startDate, endDate, format } = req.query;

        let start = null;
        let end = null;

        if (startDate) {
            start = new Date(startDate);

            if (isNaN(start.getTime())) {
                return res.status(400).json({
                    message: "Invalid startDate."
                });
            }
        }

        if (endDate) {
            end = new Date(endDate);

            if (isNaN(end.getTime())) {
                return res.status(400).json({
                    message: "Invalid endDate."
                });
            }
        }

        const currentYear = new Date().getFullYear();

        if (!start) {
            start = new Date(currentYear, 0, 1)
                .toISOString()
                .split("T")[0]; // YYYY-MM-DD
        }

        if (!end) {
            end = new Date(currentYear, 11, 31)
                .toISOString()
                .split("T")[0]; // YYYY-MM-DD
        }

        if (start && end && start > end) {
            return res.status(400).json({
                message: "startDate cannot be greater than endDate."
            });
        }

        const data = await reportService.profitReport(start, end, req.query.branchId || (req.user && (req.user.branch_id || req.user.branchId)) || null);

        if (format) {
            return sendExport(
                res,
                data,
                "profit-report",
                format
            );
        }

        return res.json({ data });

    } catch (err) {
        next(err);
    }
}

async function inventoryReport(req, res, next) {
    try {

        const { format } = req.query;
        const branchId = req.query.branchId || (req.user && (req.user.branch_id || req.user.branchId)) || null;

        const data = await reportService.inventoryReport(branchId);

        if (format) {
            return sendExport(
                res,
                data,
                "inventory-report",
                format
            );
        }

        return res.json({ data });

    } catch (err) {
        next(err);
    }
}

async function lowStock(req, res, next) {
    try {

        const branchId = req.query.branchId || (req.user && (req.user.branch_id || req.user.branchId)) || null;

        const data = await reportService.lowStock(branchId);

        if (req.query.format) {
            return sendExport(res, data, "low-stock", req.query.format);
        }

        return res.json({ data });

    } catch (err) {
        next(err);
    }
}

async function purchasesReport(req, res, next) {
    try {

        let { startDate, endDate, format } = req.query;

         const currentYear = new Date().getFullYear();

        if (!startDate) {
            startDate = new Date(currentYear, 0, 1)
                .toISOString()
                .split("T")[0]; // YYYY-MM-DD
        }

        if (!endDate) {
            endDate = new Date(currentYear, 11, 31)
                .toISOString()
                .split("T")[0]; // YYYY-MM-DD
        }

        const data = await reportService.purchasesReport(
            startDate,
            endDate,
            req.query.branchId || (req.user && (req.user.branch_id || req.user.branchId)) || null
        );

        if (format) {
            return sendExport(res, data, "purchases-report", format);
        }

        return res.json({ data });

    } catch (err) {
        next(err);
    }
}

async function bestSellingProducts(req, res, next) {
    try {
        let {
            startDate,
            endDate,
            format
        } = req.query;

        const currentYear = new Date().getFullYear();

        if (!startDate) {
            startDate = new Date(currentYear, 0, 1)
                .toISOString()
                .split("T")[0]; // YYYY-MM-DD
        }

        if (!endDate) {
            endDate = new Date(currentYear, 11, 31)
                .toISOString()
                .split("T")[0]; // YYYY-MM-DD
        }

        const limit = Number(req.query.limit ?? 10);

        if (Number.isNaN(limit) || limit <= 0) {
            return res.status(400).json({
                message: "Invalid limit."
            });
        }

        const data = await reportService.bestSellingProducts(
            limit,
            startDate,
            endDate,
            req.query.branchId || (req.user && (req.user.branch_id || req.user.branchId)) || null
        );

        if (format) {
            return sendExport(res, data, "best-selling-products", format);
        }

        return res.json({ data });

    } catch (err) {
        next(err);
    }
}

async function branchPerformance(req, res, next) {
    try {

        let {
            startDate,
            endDate,
            format
        } = req.query;

        const currentYear = new Date().getFullYear();

        if (!startDate) {
            startDate = new Date(currentYear, 0, 1)
                .toISOString()
                .split("T")[0]; // YYYY-MM-DD
        }

        if (!endDate) {
            endDate = new Date(currentYear, 11, 31)
                .toISOString()
                .split("T")[0]; // YYYY-MM-DD
        }

        const data = await reportService.branchPerformance(
            startDate || null,
            endDate || null
        );

        if (format) {
            return sendExport(res, data, "branch-performance", format);
        }

        return res.json({ data });

    } catch (err) {
        next(err);
    }
}


async function listReports(req, res, next) {
    try {

        const {
            report_type,
            from,
            to,
            page = 1,
            limit = 100,
            format
        } = req.query;

        const filters = req.query.filters || {};

        const data = await reportService.generateReport({
            report_type,
            from,
            to,
            filters,
            page: Number(page),
            limit: Number(limit)
        });

        if (format) {
            return sendExport(
                res,
                data,
                report_type || "reports",
                format
            );
        }

        return res.json({ data });

    } catch (err) {
        next(err);
    }
}

async function exportReport(req, res, next) {
    try {

        const {
            report_type,
            from,
            to,
            format = "csv",
            page = 1,
            limit = 100
        } = req.query;

        const filters = req.query.filters || {};

        const result = await reportService.generateReport({
            report_type,
            from,
            to,
            filters,
            page: Number(page),
            limit: Number(limit)
        });

        switch (format.toLowerCase()) {

            case "csv": {

                const csv = reportService.objectArrayToCsv(
                    result.rows || result
                );

                res.setHeader("Content-Type", "text/csv");
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename="${report_type || "report"}.csv"`
                );

                return res.send(csv);
            }

            case "json":
                return res.json({
                    data: result
                });

            case "xlsx":
                return res.status(501).json({
                    message: "XLSX export not implemented."
                });

            case "pdf":
                return res.status(501).json({
                    message: "PDF export not implemented."
                });

            default:
                return res.status(400).json({
                    message: "Unsupported export format."
                });
        }

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
