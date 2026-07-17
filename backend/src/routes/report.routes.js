const express = require('express');
const router = express.Router();

const reportController = require('../controllers/report.controller');
const validate = require('../middleware/validation.middleware');
const authenticate = require('../middleware/auth.middleware');
const { 
    dailySalesValidation,
    monthlySalesValidation,
    annualSalesValidation,
    rangeValidation,
    paginationValidation,
    reportQueryValidation, 
} = require('../validations/report.validation');

router.get('/daily-sales', authenticate, dailySalesValidation, validate, reportController.dailySales);
router.get('/monthly-sales', authenticate, monthlySalesValidation, validate, reportController.monthlySales);
router.get('/annual-sales', authenticate, annualSalesValidation, validate, reportController.annualSales);
router.get('/profit', authenticate, rangeValidation, validate, reportController.profitReport);
router.get('/inventory', authenticate, rangeValidation, validate, reportController.inventoryReport);
router.get('/low-stock', authenticate, rangeValidation, validate, reportController.lowStock);
router.get('/purchases', authenticate, rangeValidation, validate, reportController.purchasesReport);
router.get('/best-selling', authenticate, rangeValidation, validate, reportController.bestSellingProducts);
router.get('/branch-performance', authenticate,rangeValidation, validate,  reportController.branchPerformance);
router.get('/', authenticate, reportQueryValidation, validate, reportController.listReports);
router.get('/export', authenticate, reportQueryValidation, validate, reportController.exportReport);

module.exports = router;
