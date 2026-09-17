const productImageService = require('../services/productImage.service');

function handleError(res, err) {
  console.error('[productImage.controller]', err);
  return res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred.' });
}

function resolveImageUrl(req, relativePath) {
  if (!relativePath) return relativePath;
  return `${req.protocol}://${req.get('host')}${relativePath}`;
}

exports.addProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Product image file is required.' });
    }

    const image = await productImageService.addProductImage(
      {
        productId: req.params.id,
        imageUrl: `/uploads/${req.file.filename}`,
        isPrimary: req.body.is_primary === true || req.body.is_primary === 'true',
      },
      req.user && req.user.sub
    );

    image.image_url = resolveImageUrl(req, image.image_url);

    return res.status(201).json({ image });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Product image file is required.' });
    }

    const image = await productImageService.updateProductImage(
      {
        productId: req.params.id,
        imageUrl: `/uploads/${req.file.filename}`,
        isPrimary: req.body.is_primary === true || req.body.is_primary === 'true',
      },
      req.user && req.user.sub
    );

    image.image_url = resolveImageUrl(req, image.image_url);

    return res.status(201).json({ image });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getProductImages = async (req, res) => {
  try {
    const images = await productImageService.getProductImages(req.params.id);
    for (const img of images) {
      img.image_url = resolveImageUrl(req, img.image_url);
    }
    return res.status(200).json({ images });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.setPrimaryImage = async (req, res) => {
  try {
    const { id: image_id } = req.params;
    const existing = await productImageService.getImageById(image_id);
    if (!existing) {
      return res.status(404).json({ message: 'Image not found.' });
    }
    const productId = existing.product_id;
    const currentPrimary = await productImageService.getPrimaryImage(productId);
    if (currentPrimary && currentPrimary.image_id !== image_id) {
      await productImageService.updateProductImageNoFile(currentPrimary.image_id, { is_primary: false });
    }
    const updated = await productImageService.updateProductImageNoFile(image_id, { is_primary: true });
    updated.image_url = resolveImageUrl(req, updated.image_url);
    return res.status(200).json({ image: updated });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.deleteProductImage = async (req, res) => {
  try {
    const image = await productImageService.deleteProductImage(req.params.id, req.user && req.user.sub);
    image.image_url = resolveImageUrl(req, image.image_url);
    return res.status(200).json({ image });
  } catch (err) {
    return handleError(res, err);
  }
};
