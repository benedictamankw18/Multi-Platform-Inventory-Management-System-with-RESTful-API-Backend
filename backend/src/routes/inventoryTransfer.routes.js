const express = require('express');
const router = express.Router();

const transferController = require('../controllers/inventoryTransfer.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const { createTransferValidation, updateTransferValidation, transferIdValidation, listTransfersValidation } = require('../validations/inventoryTransfer.validation');

router.post('/', authenticate, checkPermission('MANAGE_INVENTORY'), createTransferValidation, validate, transferController.createTransfer);
router.post('/search', authenticate, checkPermission('VIEW_INVENTORY'), listTransfersValidation, validate, transferController.listTransfers);
router.get('/:transferId', authenticate, checkPermission('VIEW_INVENTORY'), transferIdValidation, validate, transferController.getTransferById);
router.patch('/:transferId', authenticate, checkPermission('MANAGE_INVENTORY'), transferIdValidation, updateTransferValidation, validate, transferController.updateTransfer);
router.post('/:transferId/deactivate', authenticate, checkPermission('MANAGE_INVENTORY'), transferIdValidation, validate, transferController.deactivateTransfer);
router.post('/:transferId/activate', authenticate, checkPermission('MANAGE_INVENTORY'), transferIdValidation, validate, transferController.activateTransfer);
router.post('/:transferId/approve', authenticate, checkPermission('MANAGE_INVENTORY'), transferIdValidation, validate, transferController.approveTransfer);
router.post('/:transferId/ship', authenticate, checkPermission('MANAGE_INVENTORY'), transferIdValidation, validate, transferController.shipTransfer);
router.post('/:transferId/receive', authenticate, checkPermission('MANAGE_INVENTORY'), transferIdValidation, validate, transferController.receiveTransfer);
router.post('/:transferId/reject', authenticate, checkPermission('MANAGE_INVENTORY'), transferIdValidation, validate, transferController.rejectTransfer);

module.exports = router;
