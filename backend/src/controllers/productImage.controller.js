const productImageService = require('../services/productImage.service');

function handleError(res, err) {
  console.error('[productImage.controller]', err);
  return res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred.' });
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

    return res.status(201).json({ image });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getProductImages = async (req, res) => {
  try {
    const images = await productImageService.getProductImages(req.params.id);
    return res.status(200).json({ images });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.deleteProductImage = async (req, res) => {
  try {
    const image = await productImageService.deleteProductImage(req.params.id, req.user && req.user.sub);
    return res.status(200).json({ image });
  } catch (err) {
    return handleError(res, err);
  }
};
