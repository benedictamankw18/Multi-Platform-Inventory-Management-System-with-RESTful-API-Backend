const expenseService = require('../services/expense.service');

async function createExpense(req, res, next) {
  try {
    const created = await expenseService.createExpense(req.body, req.user);
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
}

async function listExpenses(req, res, next) {
  try {
    const data = await expenseService.listExpenses(req.query);
    res.json({ data });
  } catch (err) { next(err); }
}

async function getExpenseById(req, res, next) {
  try {
    const data = await expenseService.getExpenseById(req.params.expenseId);
    res.json({ data });
  } catch (err) { next(err); }
}

async function updateExpense(req, res, next) {
  try {
    const data = await expenseService.updateExpense(req.params.expenseId, req.body, req.user);
    res.json({ data });
  } catch (err) { next(err); }
}

async function deleteExpense(req, res, next) {
  try {
    const data = await expenseService.deleteExpense(req.params.expenseId, req.user);
    res.json({ data });
  } catch (err) { next(err); }
}

async function exportExpenses(req, res, next) {
  try {
    // Placeholder: export not implemented
    res.status(501).json({ message: 'Export not implemented' });
  } catch (err) { next(err); }
}

module.exports = {
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  exportExpenses,
};
