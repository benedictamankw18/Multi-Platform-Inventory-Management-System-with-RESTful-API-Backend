const productBatchService = require('../services/productBatch.service');

const { describeError } = require('../utils/httpError');

function handleError(res, err) {
  console.error('[productBatch.controller]', err);
  const { status, message } = describeError(err);
  return res.status(status).json({ message });
}

exports.listBatches = async (req, res) => {
  try {
    const { items, total } = await productBatchService.listBatches(req.query);
    return res.status(200).json({ items, total });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getBatchById = async (req, res) => {
  try {
    const batch = await productBatchService.getBatchById(req.params.batch_id);
    return res.status(200).json({ batch });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.listBatchesByProductAndBranch = async (req, res) => {
  try {
    const { product_id: productId, branch_id: branchId } = req.params;
    const batches = await productBatchService.listByProductAndBranch(productId, branchId);
    return res.status(200).json({ batches });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.disposeBatch = async (req, res) => {
  try {
    const actorId = req.user && req.user.sub;
    const disposed = await productBatchService.disposeBatch(req.params.batch_id, {
      disposedBy: actorId,
      notes: req.body && req.body.notes,
    });
    return res.status(200).json({ batch: disposed });
  } catch (err) {
    return handleError(res, err);
  }
};
