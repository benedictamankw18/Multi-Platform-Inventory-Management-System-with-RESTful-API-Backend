const categoryService = require('../services/category.service');

function handleError(res, err) {
  console.error('[category.controller]', err);
  return res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred.' });
}

exports.createCategory = async (req, res) => {
  try {
    const created = await categoryService.createCategory(req.body, req.user && req.user.sub);
    return res.status(201).json({ category: created });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.listCategories = async (req, res) => {
  try {
    const { q, isActive, page, limit } = req.body;
    const result = await categoryService.listCategories({ q, isActive, page, limit });
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(req.params.categoryId);
    return res.status(200).json({ category });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const updated = await categoryService.updateCategory(req.params.categoryId, req.body, req.user && req.user.sub);
    return res.status(200).json({ category: updated });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.deactivateCategory = async (req, res) => {
  try {
    const result = await categoryService.deactivateCategory(req.params.categoryId, req.user && req.user.sub);
    if (result.alreadyInState) return res.status(200).json({ message: 'Category already inactive.', category: result.category });
    return res.status(200).json({ category: result.category });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.activateCategory = async (req, res) => {
  try {
    const result = await categoryService.activateCategory(req.params.categoryId, req.user && req.user.sub);
    if (result.alreadyInState) return res.status(200).json({ message: 'Category already active.', category: result.category });
    return res.status(200).json({ category: result.category });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.uploadCategoryImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided.' });
    const imageUrl = `/uploads/${req.file.filename}`;
    const updated = await categoryService.updateCategory(req.params.categoryId, { image_url: imageUrl }, req.user && req.user.sub);
    return res.status(200).json({ category: updated, imageUrl });
  } catch (err) {
    return handleError(res, err);
  }
};
