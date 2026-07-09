const expenseCategoryService = require('../services/expenseCategory.service');

async function createExpenseCategory(req, res, next) {
  try {
    const created = await expenseCategoryService.createExpenseCategory(req.body, req.user);
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
}

async function listExpenseCategories(req, res, next) {
  try {
    const data = await expenseCategoryService.listExpenseCategories(req.query);
    res.json({ data });
  } catch (err) { next(err); }
}

async function getExpenseCategoryById(req, res, next) {
  try {
    const data = await expenseCategoryService.getExpenseCategoryById(req.params.categoryId);
    res.json({ data });
  } catch (err) { next(err); }
}

async function updateExpenseCategory(req, res, next) {
  try {
    const data = await expenseCategoryService.updateExpenseCategory(req.params.categoryId, req.body, req.user);
    res.json({ data });
  } catch (err) { next(err); }
}

async function deleteExpenseCategory(req, res, next) {
  try {
    const data = await expenseCategoryService.deleteExpenseCategory(req.params.categoryId, req.user);
    res.json({ data });
  } catch (err) { next(err); }
}

module.exports = {
  createExpenseCategory,
  listExpenseCategories,
  getExpenseCategoryById,
  updateExpenseCategory,
  deleteExpenseCategory,
};
