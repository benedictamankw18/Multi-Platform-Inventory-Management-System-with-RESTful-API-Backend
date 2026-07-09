const auditService = require('../services/audit.service');
const fastCsv = require('fast-csv');
const ExcelJS = require('exceljs');

const { format } = require('fast-csv');

async function getAudits (req, res, next)  {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      startDate: req.query.from,
      endDate: req.query.to,
      userId: req.query.user_id,
    };
    const result = await auditService.listAudits(filters);
    return res.json({ data: result.items, total: result.total });
  } catch (err) {
    next(err);
  }
}

async function getAuditById (req, res, next)  {
  try {
    const audit = await auditService.getAuditById(req.params.id);
    if (!audit) return res.status(404).json({ message: 'Not found' });
    return res.json(audit);
  } catch (err) {
    next(err);
  }
}

async function exportAudits (req, res, next) {
  try {
    const format = (req.query.format || 'csv').toLowerCase();
    const fields = req.query.fields ? (Array.isArray(req.query.fields) ? req.query.fields : String(req.query.fields).split(',')) : null;
    const filters = {
      startDate: req.query.from,
      endDate: req.query.to,
      userId: req.query.user_id,
      limit: req.query.limit,
      page: req.query.page,
    };

    const rows = await auditService.findForExport(filters);

    if (format === 'xlsx') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('audits');

      // determine columns
      const headerKeys = fields || ['audit_id','user_id','action','entity_type','entity_id','details','ip_address','created_at','username'];
      ws.columns = headerKeys.map(h => ({ header: h, key: h }));

      rows.forEach(r => {
        // ensure details is string
        if (r.details && typeof r.details !== 'string') {
          try { r.details = JSON.parse(r.details); } catch(e) {}
        }
        ws.addRow(r);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="audits.xlsx"`);
      await wb.xlsx.write(res);
      res.end();
      return;
    }

    // default CSV stream
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audits.csv"`);

    const csvStream = fastCsv.format({ headers: true });
    csvStream.pipe(res);

    const headerKeys = fields || ['audit_id','user_id','action','entity_type','entity_id','details','ip_address','created_at','username'];
    rows.forEach(r => {
      // normalize details (string)
      if (r.details && typeof r.details !== 'string') {
        try { r.details = JSON.stringify(r.details); } catch (e) { r.details = String(r.details); }
      }
      const out = {};
      headerKeys.forEach(k => { out[k] = r[k]; });
      csvStream.write(out);
    });
    csvStream.end();
  } catch (err) {
    next(err);
  }
}
/**
 * audit.controller.js  (thin)
 *
 * HTTP mapping only — Request → Service → Response.
 * All query logic lives in audit.service.js.
 *
 * Routes (wired in audit.routes.js):
 *   GET /api/v1/audit                              getLogs
 *   GET /api/v1/audit/:auditId                     getLogById
 *   GET /api/v1/audit/users/:userId                getLogsByUser
 *   GET /api/v1/audit/entity/:entityType/:entityId getLogsByEntity
 */

function extractRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [payload];
}

async function sendExport(res, data, nameBase = 'audit', format = 'csv') {
  const rows = extractRows(data);
  const filename = `${nameBase}-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}`;
  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Audit');
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
    res.setHeader('Content-Type', 'application/json');
    return res.send({ data });
  }
}

async function getById(req, res, next) {
  try {
    const { auditId } = req.params;
    const row = await auditService.findById(auditId);
    if (!row) return res.status(404).json({ message: 'Audit log not found' });
    if (req.query.format) return sendExport(res, row, `audit-${auditId}`, req.query.format);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      entityType: req.query.entityType,
      entityId: req.query.entityId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit,
    };
    const rows = await auditService.findAll(filters);
    if (req.query.format) return sendExport(res, rows, 'audit-list', req.query.format);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function count(req, res, next) {
  try {
    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      entityType: req.query.entityType,
      entityId: req.query.entityId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const total = await auditService.count(filters);
    res.json({ total });
  } catch (err) {
    next(err);
  }
}

function handleError(res, err) {
  console.error('[audit.controller]', err.message);
  return res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred.' });
}

// ---------------------------------------------------------------------------
// GET /api/v1/audit
// Query: ?userId=&action=&entityType=&entityId=&startDate=&endDate=&page=&limit=
// ---------------------------------------------------------------------------

async function getLogs(req, res) {
  try {
    const result = await auditService.getLogs(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/audit/:auditId
// ---------------------------------------------------------------------------

async function getLogById(req, res) {
  try {
    const log = await auditService.getLogById(req.params.auditId);
    return res.status(200).json({ log });
  } catch (err) {
    return handleError(res, err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/audit/users/:userId
// Query: ?action=&startDate=&endDate=&page=&limit=
// ---------------------------------------------------------------------------

async function getLogsByUser(req, res) {
  try {
    const result = await auditService.getLogsByUser(req.params.userId, req.query);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/audit/entity/:entityType/:entityId
// Query: ?action=&startDate=&endDate=&page=&limit=
// ---------------------------------------------------------------------------

async function getLogsByEntity(req, res) {
  try {
    const result = await auditService.getLogsByEntity(
      req.params.entityType,
      req.params.entityId,
      req.query
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  getById,
  list,
  count,
  getLogs,
  getLogById,
  getLogsByUser,
  getLogsByEntity,
  getAudits,
  getAuditById,
  exportAudits,
};
