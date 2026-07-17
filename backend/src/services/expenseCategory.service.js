const { v4: uuidv4 } = require('uuid');
const expenseCategoryRepo = require('../repositories/expenseCategory.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');

async function createExpenseCategory(payload, actor = null) {
  const { name, description } = payload;
  if (!name || !name.trim()) throw new AppError('name is required', { status: 400 });
  const existing = await expenseCategoryRepo.getExpenseCategoryByName(name.trim());
  if (existing) throw new AppError('Expense category already exists', { status: 409 });
  const created = await expenseCategoryRepo.createExpenseCategory({ category_id: uuidv4(), category_name: name.trim(), description });
  try { auditRepo.writeLog(actor ? actor.id || actor.user_id : null, 'CREATE_EXPENSE_CATEGORY', 'EXPENSE_CATEGORY', created.category_id, { name: created.category_name }); } catch (e) { console.error(e.message); }
  return created;
}

async function listExpenseCategories(query) {
  return expenseCategoryRepo.listExpenseCategories(query || {});
}

async function getExpenseCategoryById(id) {
  const cat = await expenseCategoryRepo.getExpenseCategoryById(id);
  if (!cat) throw new AppError('Expense category not found', { status: 404 });
  return cat;
}

async function updateExpenseCategory(id, payload, actor = null) {
  await getExpenseCategoryById(id);
  const patch = {};
  if (payload.name !== undefined) patch.category_name = payload.name;
  if (payload.description !== undefined) patch.description = payload.description;
  const updated = await expenseCategoryRepo.updateExpenseCategory(id, patch);
  try { auditRepo.writeLog(actor ? actor.id || actor.user_id : null, 'UPDATE_EXPENSE_CATEGORY', 'EXPENSE_CATEGORY', id, patch); } catch (e) { console.error(e.message); }
  return updated;
}

async function deleteExpenseCategory(id, actor = null) {
  await getExpenseCategoryById(id);
  const deleted = await expenseCategoryRepo.deleteExpenseCategory(id);
  try { auditRepo.writeLog(actor ? actor.id || actor.user_id : null, 'DELETE_EXPENSE_CATEGORY', 'EXPENSE_CATEGORY', id); } catch (e) { console.error(e.message); }
  return deleted;
}

module.exports = {
  createExpenseCategory,
  listExpenseCategories,
  getExpenseCategoryById,
  updateExpenseCategory,
  deleteExpenseCategory,
};
