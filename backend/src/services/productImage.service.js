const { v4: uuidv4 } = require('uuid');

const productRepo = require('../repositories/product.repository');
const productImageRepo = require('../repositories/productImage.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');

exports.addProductImage = async ({ productId, imageUrl, isPrimary = false }, actorId = null) => {
  const product = await productRepo.getProductById(productId);
  if (!product) throw new AppError('Product not found.', { status: 404 });

  const existingPrimary = await productImageRepo.getPrimaryImage(productId);
  const image = await productImageRepo.createProductImage({
    image_id: uuidv4(),
    product_id: productId,
    image_url: imageUrl,
    is_primary: Boolean(isPrimary) || !existingPrimary,
  });

  await auditRepo.writeLog(actorId, 'ADD_PRODUCT_IMAGE', 'PRODUCT_IMAGE', image.image_id, {
    product_id: productId,
    image_url: imageUrl,
  });

  return image;
};

exports.updateProductImage = async ({ productId, imageUrl, isPrimary = false }, actorId = null) => {
  const product = await productRepo.getProductById(productId);
  if (!product) throw new AppError('Product not found.', { status: 404 });

  const existingPrimary = await productImageRepo.getPrimaryImage(productId);
  const image = await productImageRepo.updateProductImage({
    image_id: uuidv4(),
    product_id: productId,
    image_url: imageUrl,
    is_primary: Boolean(isPrimary) || !existingPrimary,
  });

  await auditRepo.writeLog(actorId, 'UPDATE_PRODUCT_IMAGE', 'PRODUCT_IMAGE', image.image_id, {
    product_id: productId,
    image_url: imageUrl,
  });

  return image;
};

exports.getProductImages = async (productId) => {
  const product = await productRepo.getProductById(productId);
  if (!product) throw new AppError('Product not found.', { status: 404 });

  return productImageRepo.getImagesByProductId(productId);
};

exports.getImageById = async (imageId) => {
  return productImageRepo.getImageById(imageId);
};

exports.getPrimaryImage = async (productId) => {
  return productImageRepo.getPrimaryImage(productId);
};

exports.updateProductImageNoFile = async (imageId, patch, actorId = null) => {
  const updated = await productImageRepo.updateProductImage(imageId, patch);
  if (actorId) {
    await auditRepo.writeLog(actorId, 'UPDATE_PRODUCT_IMAGE', 'PRODUCT_IMAGE', imageId, patch);
  }
  return updated;
};

exports.deleteProductImage = async (imageId, actorId = null) => {
  const existing = await productImageRepo.getImageById(imageId);
  if (!existing) throw new AppError('Product image not found.', { status: 404 });

  const deleted = await productImageRepo.deleteProductImage(imageId);
  await auditRepo.writeLog(actorId, 'DELETE_PRODUCT_IMAGE', 'PRODUCT_IMAGE', imageId, {
    product_id: existing.product_id,
    image_url: existing.image_url,
  });

  return deleted;
};
