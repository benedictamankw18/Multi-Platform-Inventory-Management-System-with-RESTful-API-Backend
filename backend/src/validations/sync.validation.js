const { body, query } = require('express-validator');

const pullValidation = [
  body('entity').optional().isString().withMessage('entity must be a string'),
  body('since').optional().isISO8601().withMessage('since must be an ISO date'),
  query('branchId').optional().isUUID(),
];

const pushValidation = [
  body('sync_payload').isArray().withMessage('sync_payload array is required'),
  body('sync_payload.*.entity').optional().isString().withMessage('each payload item must include entity'),
  body('source').optional().isString().withMessage('source must be a string'),
  body('target').optional().isString().withMessage('target must be a string'),
  body('batch_id').optional().isUUID().withMessage('batch_id must be a UUID'),
];

const logsValidation = [
  query('entity').optional().isString(),
  query('status').optional().isIn(['PENDING','SUCCESS','FAILED']),
  query('deviceId').optional().isString(),
  query('since').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
];

const retryValidation = [
  body('sync_id').isUUID().withMessage('sync_id is required and must be a UUID'),
];

const pushEntityValidation = [
  body('items').isArray().withMessage('items array is required'),
];



module.exports = {
  pushValidation,
  pullValidation,
  logsValidation,
  retryValidation,
  pushEntityValidation
};
