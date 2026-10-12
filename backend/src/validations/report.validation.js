

const { query } = require('express-validator');

const dailySalesValidation = [
  query('date').optional().isISO8601(),
];

const monthlySalesValidation = [
  query('year').optional().isInt({ min: 2000 }),
  query('month').optional().isInt({ min: 1, max: 12 }),
];

const annualSalesValidation = [
  query('year').optional().isInt({ min: 2000 }),
];

const rangeValidation = [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
];

const salesTrendValidation = [
  query('startDate').optional().isISO8601().withMessage('startDate must be an ISO date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be an ISO date'),
  query('granularity').optional().isIn(['day', 'week', 'month']).withMessage('granularity must be day, week or month'),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
];

const expiryValidation = [
  query('withinDays').optional().isInt({ min: 0, max: 3650 }).withMessage('withinDays must be between 0 and 3650'),
  query('includeExpired').optional().isBoolean().withMessage('includeExpired must be a boolean'),
  query('format').optional().isIn(['csv', 'xlsx']).withMessage('format must be csv or xlsx'),
];

const ALLOWED_TYPES = ['sales', 'purchases', 'inventory', 'expenses', 'customers', 'suppliers', 'movement'];

const reportQueryValidation = [
  query('report_type')
    .trim()
    .notEmpty()
    .withMessage('report_type is required')
    .isIn(ALLOWED_TYPES)
    .withMessage(`report_type must be one of: ${ALLOWED_TYPES.join(',')}`),
  query('from').optional().isISO8601().withMessage('from must be an ISO date'),
  query('to').optional().isISO8601().withMessage('to must be an ISO date'),
  query('format').optional().isIn(['csv', 'xlsx']).withMessage('format must be csv or xlsx'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('limit must be between 1 and 10000'),
];


module.exports = {
  dailySalesValidation,
  monthlySalesValidation,
  annualSalesValidation,
  rangeValidation,
  paginationValidation,
  reportQueryValidation,
  expiryValidation,
  salesTrendValidation,
};
