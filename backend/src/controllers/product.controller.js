/**
 * product.controller.js  (thin)
 *
 * Maps HTTP requests to product.service functions and handles responses/errors.
 */

const productService = require('../services/product.service');

function handleError(res, err) {
  console.error('[product.controller]', err);
  return res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred.' });
}

exports.createProduct = async (req, res) => {
  try {
    const created = await productService.createProduct(req.body, req.user && req.user.sub);
    return res.status(201).json({ product: created });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.listProducts = async (req, res) => {
  try {
    const { q, categoryId, supplierId, isActive, page, limit } = req.body;
    const result = await productService.listProducts({ q, categoryId, supplierId, isActive, page, limit });
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.productId);
    return res.status(200).json({ product });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const updated = await productService.updateProduct(req.params.productId, req.body, req.user && req.user.sub);
    return res.status(200).json({ product: updated });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.deactivateProduct = async (req, res) => {
  try {
    const result = await productService.deactivateProduct(req.params.productId, req.user && req.user.sub);
    if (result.alreadyInState) {
      return res.status(200).json({ message: 'Product already deactivated.', product: result.product });
    }
    return res.status(200).json({ product: result.product });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.activateProduct = async (req, res) => {
  try {
    const result = await productService.activateProduct(req.params.productId, req.user && req.user.sub);
    if (result.alreadyInState) {
      return res.status(200).json({ message: 'Product already activated.', product: result.product });
    }
    return res.status(200).json({ product: result.product });
  } catch (err) {
    return handleError(res, err);
  }
};