/**
 * category.service.js
 *
 * Business logic for categories.
 */

const categoryRepo = require('../repositories/category.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');
const { v4: uuidv4 } = require('uuid');

exports.createCategory = async (payload, actorId = null) => {
  // support both `name` and `category_name` in payload
  const categoryName = payload.name || payload.category_name;
  if (!categoryName) throw new AppError('name is required.', { status: 400 });

  const existing = await categoryRepo.getCategoryByName(categoryName);
  if (existing) throw new AppError('A category with this name already exists.', { status: 409 });

  const categoryId = uuidv4();
  const created = await categoryRepo.createCategory({ categoryId, categoryName, description: payload.description, isActive: payload.is_active !== undefined ? payload.is_active : true, parent_category_id: payload.parent_id || null, image_url: payload.image_url || null });
  await auditRepo.writeLog(actorId, 'CREATE_CATEGORY', 'CATEGORY', created.category_id, { name: created.category_name });
  return created;
};

exports.getCategoryById = async (categoryId) => {
  const c = await categoryRepo.getCategoryById(categoryId);
  if (!c) throw new AppError('Category not found.', { status: 404 });
  return c;
};

exports.listCategories = async (filters = {}) => {
  const categories = await categoryRepo.getAllCategories(filters);
  const total = await categoryRepo.countCategories(filters);
  return { categories, total };
};

exports.updateCategory = async (categoryId, fields, actorId = null) => {
  const existing = await categoryRepo.getCategoryById(categoryId);
  if (!existing) throw new AppError('Category not found.', { status: 404 });
  // map incoming `name` to `category_name` and `parent_id` to `parent_category_id`
  const patch = { ...fields };
  if (patch.name) patch.category_name = patch.name;
  if (patch.parent_id) patch.parent_category_id = patch.parent_id;

  if (patch.category_name && patch.category_name !== existing.category_name) {
    const dup = await categoryRepo.getCategoryByName(patch.category_name);
    if (dup) throw new AppError('Another category already uses this name.', { status: 409 });
  }

  const updated = await categoryRepo.updateCategory(categoryId, patch);
  await auditRepo.writeLog(actorId, 'UPDATE_CATEGORY', 'CATEGORY', categoryId, fields);
  return updated;
};

exports.activateCategory = async (categoryId, actorId = null) => {
  const existing = await categoryRepo.getCategoryById(categoryId);
  if (!existing) throw new AppError('Category not found.', { status: 404 });
  if (existing.is_active) return { alreadyInState: true, category: existing };
  const activated = await categoryRepo.activateCategory(categoryId);
  await auditRepo.writeLog(actorId, 'ACTIVATE_CATEGORY', 'CATEGORY', categoryId);
  return { alreadyInState: false, category: activated };
};

exports.deactivateCategory = async (categoryId, actorId = null) => {
  const existing = await categoryRepo.getCategoryById(categoryId);
  if (!existing) throw new AppError('Category not found.', { status: 404 });
  if (!existing.is_active) return { alreadyInState: true, category: existing };

  const deactivated = await categoryRepo.deactivateCategory(categoryId);
  await auditRepo.writeLog(actorId, 'DEACTIVATE_CATEGORY', 'CATEGORY', categoryId);
  return { alreadyInState: false, category: deactivated };
};
