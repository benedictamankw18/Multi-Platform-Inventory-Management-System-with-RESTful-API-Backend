const express = require('express');
const router = express.Router();

const transferController = require('../controllers/inventoryTransfer.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createTransferValidation, updateTransferValidation, transferIdValidation, listTransfersValidation } = require('../validations/inventoryTransfer.validation');

router.post('/', authenticate, createTransferValidation, validate, transferController.createTransfer);
router.post('/search', authenticate, listTransfersValidation, validate, transferController.listTransfers);
router.get('/:transferId', authenticate, transferIdValidation, validate, transferController.getTransferById);
router.patch('/:transferId', authenticate, transferIdValidation, updateTransferValidation, validate, transferController.updateTransfer);
router.post('/:transferId/deactivate', authenticate, transferIdValidation, validate, transferController.deactivateTransfer);
router.post('/:transferId/activate', authenticate, transferIdValidation, validate, transferController.activateTransfer);
router.post('/:transferId/approve', authenticate, transferIdValidation, validate, transferController.approveTransfer);
router.post('/:transferId/reject', authenticate, transferIdValidation, validate, transferController.rejectTransfer);

module.exports = router;
