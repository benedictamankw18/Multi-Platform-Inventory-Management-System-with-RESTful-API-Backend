const express = require('express');
const router = express.Router();

const priceHistoryController = require('../controllers/priceHistory.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createPriceHistoryValidation, listPriceHistoryValidation } = require('../validations/priceHistory.validation');

router.get('/', authenticate, listPriceHistoryValidation, validate, priceHistoryController.listPriceHistory);
router.post('/', authenticate, createPriceHistoryValidation, validate, priceHistoryController.createPriceHistory);

module.exports = router;
