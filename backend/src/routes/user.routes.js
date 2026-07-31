/**
 * user.routes.js
 *
 * Mounted at /api/users in the main app.
 * Wires exactly the seven handlers that exist on user.controller.js
 * (FR-003, FR-004). No /search, /me, /change-password, or /unlock routes —
 * those handlers don't exist on user.service.js/user.controller.js yet;
 * add them there first, then wire the route, rather than the other way
 * around.
 *
 * All routes require Administrator (or Business Owner, per the stakeholder
 * table) — FR-004 frames user management as an administrative function.
 * Loosen listUsers/getUserById to just `authenticate` if you want any
 * logged-in user to browse the directory.
 */

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');

const {
  createUserValidation,
  updateUserValidation,
  userIdValidation,
  assignRoleValidation,
  listUsersValidation,
} = require('../validations/user.validation');

const ADMIN_ROLES = ['Administrator', 'Business Owner'];

/**
 * @openapi
 * /users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a new user
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               full_name:
 *                 type: string
 *             required: [username, email, password]
 *     responses:
 *       '201':
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '400':
 *         description: Validation error
 */
router.post('/', authenticate, checkPermission('MANAGE_USERS'), createUserValidation, validate, userController.createUser);
/**
 * @openapi
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List users (paginated)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
router.get('/', authenticate, checkPermission('MANAGE_USERS'), listUsersValidation, validate, userController.listUsers);
router.get('/lookup', authenticate, checkPermission('MANAGE_NOTIFICATIONS'), userController.lookupUsers);
/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: User object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '404':
 *         description: Not found
 */
router.get('/:id/sessions', authenticate, checkPermission('MANAGE_USERS'), userIdValidation, validate, userController.listUserSessions);
router.get('/:id/branches', authenticate, checkPermission('MANAGE_USERS'), userIdValidation, validate, userController.listUserBranches);
router.get('/:id', authenticate, checkPermission('MANAGE_USERS'), userIdValidation, validate, userController.getUserById);
/**
 * @openapi
 * /users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user fields
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               full_name:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put('/:id', authenticate, checkPermission('MANAGE_USERS'), updateUserValidation, validate, userController.updateUser);
router.patch('/:id', authenticate, checkPermission('MANAGE_USERS'), updateUserValidation, validate, userController.updateUser);
router.delete('/:id', authenticate, checkPermission('MANAGE_USERS'), userIdValidation, validate, userController.deleteUser);
/**
 * @openapi
 * /users/{id}/role:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Assign role(s) to a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       '200':
 *         description: Roles assigned
 */
router.patch('/:id/role', authenticate, checkPermission('MANAGE_USERS'), assignRoleValidation, validate, userController.assignRole);
/**
 * @openapi
 * /users/{id}/deactivate:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Deactivate a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: User deactivated
 */
router.patch('/:id/deactivate', authenticate, checkPermission('MANAGE_USERS'), userIdValidation, validate, userController.deactivateUser);
/**
 * @openapi
 * /users/{id}/reactivate:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Reactivate a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: User reactivated
 */
router.patch('/:id/reactivate', authenticate, checkPermission('MANAGE_USERS'), userIdValidation, validate, userController.reactivateUser);

module.exports = router;
