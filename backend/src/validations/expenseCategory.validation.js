const { body, param, query } = require('express-validator');

const createExpenseCategoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isString()
    .withMessage('name must be a string')
    .isLength({ max: 150 })
    .withMessage('name cannot exceed 150 characters'),
  body('description').optional({ nullable: true }).isString().withMessage('description must be a string'),
];

const updateExpenseCategoryValidation = [
  body('name').optional().trim().isString().withMessage('name must be a string').isLength({ max: 150 }).withMessage('name cannot exceed 150 characters'),
  body('description').optional({ nullable: true }).isString().withMessage('description must be a string'),
];

const categoryIdValidation = [
  param('categoryId').isUUID().withMessage('categoryId must be a UUID'),
];

const listExpenseCategoriesValidation = [
  query('q').optional().trim().isLength({ max: 100 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = {
  createExpenseCategoryValidation,
  updateExpenseCategoryValidation,
  categoryIdValidation,
  listExpenseCategoriesValidation,
};
