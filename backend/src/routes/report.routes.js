const express = require('express');
const router = express.Router();

const reportController = require('../controllers/report.controller');
const validate = require('../middleware/validation.middleware');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const { 
    dailySalesValidation,
    monthlySalesValidation,
    annualSalesValidation,
    rangeValidation,
    paginationValidation,
    reportQueryValidation, 
} = require('../validations/report.validation');

router.get('/daily-sales', authenticate, checkPermission('VIEW_REPORTS'), dailySalesValidation, validate, reportController.dailySales);
router.get('/monthly-sales', authenticate, checkPermission('VIEW_REPORTS'), monthlySalesValidation, validate, reportController.monthlySales);
router.get('/annual-sales', authenticate, checkPermission('VIEW_REPORTS'), annualSalesValidation, validate, reportController.annualSales);
router.get('/profit', authenticate, checkPermission('VIEW_REPORTS'), rangeValidation, validate, reportController.profitReport);
router.get('/inventory', authenticate, checkPermission('VIEW_REPORTS'), rangeValidation, validate, reportController.inventoryReport);
router.get('/low-stock', authenticate, checkPermission('VIEW_REPORTS'), rangeValidation, validate, reportController.lowStock);
router.get('/purchases', authenticate, checkPermission('VIEW_REPORTS'), rangeValidation, validate, reportController.purchasesReport);
router.get('/best-selling', authenticate, checkPermission('VIEW_REPORTS'), rangeValidation, validate, reportController.bestSellingProducts);
router.get('/branch-performance', authenticate, checkPermission('VIEW_REPORTS'), rangeValidation, validate, reportController.branchPerformance);
router.get('/', authenticate, checkPermission('VIEW_REPORTS'), reportQueryValidation, validate, reportController.listReports);
router.get('/export', authenticate, checkPermission('VIEW_REPORTS'), reportQueryValidation, validate, reportController.exportReport);

module.exports = router;
