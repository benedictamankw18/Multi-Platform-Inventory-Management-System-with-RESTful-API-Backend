const { v4: uuidv4 } = require('uuid');
const expenseRepo = require('../repositories/expense.repository');
const expenseCategoryRepo = require('../repositories/expenseCategory.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');

async function createExpense(payload, actor = null) {
  const { category_id, amount, date, notes, branch_id } = payload;
  if (!category_id) throw new AppError('category_id is required', { status: 400 });
  if (!amount || Number(amount) <= 0) throw new AppError('amount must be a positive number', { status: 400 });
  const category = await expenseCategoryRepo.getExpenseCategoryById(category_id);
  if (!category) throw new AppError('Expense category not found', { status: 404 });
  const expense_id = uuidv4();
  const created = await expenseRepo.createExpense({ expense_id, branch_id, recorded_by: actor ? actor.id || actor.user_id : null, category: category_id, description: notes || null, amount, expense_date: date || null });
  try { auditRepo.writeLog(actor ? actor.id || actor.user_id : null, 'CREATE_EXPENSE', 'EXPENSE', expense_id, { category: category_id, amount }); } catch (e) { console.error(e.message); }
  return created;
}

async function listExpenses(query) {
  return expenseRepo.listExpenses(query || {});
}

async function getExpenseById(id) {
  const e = await expenseRepo.getExpenseById(id);
  if (!e) throw new AppError('Expense not found', { status: 404 });
  return e;
}

async function updateExpense(id, payload, actor = null) {
  await getExpenseById(id);
  const patch = {};
  if (payload.category_id !== undefined) patch.category = payload.category_id;
  if (payload.amount !== undefined) patch.amount = payload.amount;
  if (payload.date !== undefined) patch.expense_date = payload.date;
  if (payload.notes !== undefined) patch.description = payload.notes;
  const updated = await expenseRepo.updateExpense(id, patch);
  try { auditRepo.writeLog(actor ? actor.id || actor.user_id : null, 'UPDATE_EXPENSE', 'EXPENSE', id, patch); } catch (e) { console.error(e.message); }
  return updated;
}

async function deleteExpense(id, actor = null) {
  await getExpenseById(id);
  const deleted = await expenseRepo.deleteExpense(id);
  try { auditRepo.writeLog(actor ? actor.id || actor.user_id : null, 'DELETE_EXPENSE', 'EXPENSE', id); } catch (e) { console.error(e.message); }
  return deleted;
}

module.exports = {
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
