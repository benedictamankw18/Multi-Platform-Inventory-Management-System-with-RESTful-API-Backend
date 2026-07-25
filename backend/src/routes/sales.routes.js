const express = require('express');
const router = express.Router();

const salesController = require('../controllers/sales.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const {
  createSaleValidation,
  saleIdValidation,
  listSalesQueryValidation,
  listSalesValidation,
  refundSaleValidation,
} = require('../validations/sales.validation');

router.get('/', authenticate, checkPermission('VIEW_SALES'), listSalesQueryValidation, validate, salesController.listSales);
router.post('/', authenticate, checkPermission('CREATE_SALE'), createSaleValidation, validate, salesController.createSale);
router.post('/search', authenticate, checkPermission('VIEW_SALES'), listSalesValidation, validate, salesController.searchSales);
router.get('/:saleId/items', authenticate, checkPermission('VIEW_SALES'), saleIdValidation, validate, salesController.getSaleItems);
router.get('/:saleId/receipt', authenticate, checkPermission('VIEW_SALES'), saleIdValidation, validate, salesController.getSaleReceipt);
router.post('/:saleId/void', authenticate, checkPermission('VOID_SALE'), saleIdValidation, validate, salesController.voidSale);
router.post('/:saleId/refund', authenticate, checkPermission('VOID_SALE'), saleIdValidation, refundSaleValidation, validate, salesController.refundSale);
router.get('/:saleId', authenticate, checkPermission('VIEW_SALES'), saleIdValidation, validate, salesController.getSaleById);

module.exports = router;
