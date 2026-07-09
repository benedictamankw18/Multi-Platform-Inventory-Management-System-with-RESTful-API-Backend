const express = require('express');
const router = express.Router();

const salesController = require('../controllers/sales.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const {
  createSaleValidation,
  saleIdValidation,
  listSalesQueryValidation,
  listSalesValidation,
  refundSaleValidation,
} = require('../validations/sales.validation');

router.get('/', authenticate, listSalesQueryValidation, validate, salesController.listSales);
router.post('/', authenticate, createSaleValidation, validate, salesController.createSale);
router.post('/search', authenticate, listSalesValidation, validate, salesController.searchSales);
router.get('/:saleId/items', authenticate, saleIdValidation, validate, salesController.getSaleItems);
router.get('/:saleId/receipt', authenticate, saleIdValidation, validate, salesController.getSaleReceipt);
router.post('/:saleId/void', authenticate, saleIdValidation, validate, salesController.voidSale);
router.post('/:saleId/refund', authenticate, saleIdValidation, refundSaleValidation, validate, salesController.refundSale);
router.get('/:saleId', authenticate, saleIdValidation, validate, salesController.getSaleById);

module.exports = router;
