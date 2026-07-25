const { body, param } = require('express-validator');

const categoryIdValidation = [
  param('categoryId').isUUID().withMessage('Invalid category ID.'),
];

const createCategoryValidation = [
  // accept either `name` or `category_name` for compatibility
  body('name').optional().trim().isLength({ max: 100 }),
  body('category_name').optional().trim().isLength({ max: 100 }),
  body('image_url').optional({ values: 'null' }).isString().withMessage('image_url must be a string'),
  body('parent_id').optional().isUUID().withMessage('parent_id must be a UUID'),
  body('description').optional().isLength({ max: 400 }),
  body('is_active').optional().isBoolean(),
  body().custom((value, { req }) => {
    if (!req.body.name && !req.body.category_name) throw new Error('name or category_name is required.');
    return true;
  }),
];

const updateCategoryValidation = [
  ...categoryIdValidation,
  body('name').optional().trim().isLength({ max: 100 }),
  body('category_name').optional().trim().isLength({ max: 100 }),
  body('image_url').optional({ values: 'null' }).isString().withMessage('image_url must be a string'),
  body('parent_id').optional().isUUID().withMessage('parent_id must be a UUID'),
  body('description').optional().isLength({ max: 400 }),
  body('is_active').optional().isBoolean(),
];

const listCategoriesValidation = [
  body('q').optional().trim().isLength({ max: 100 }),
  body('isActive').optional().isIn(['true','false']).withMessage('isActive must be true or false.'),
  body('page').optional().isInt({ min: 1 }),
  body('limit').optional().isInt({ min: 1, max: 10000 }),
];

module.exports = {
  categoryIdValidation,
  createCategoryValidation,
  updateCategoryValidation,
  listCategoriesValidation,
};
