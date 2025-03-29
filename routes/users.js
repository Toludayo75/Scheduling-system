/**
 * User Routes for UITH Physiotherapy Scheduling System
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin, isSystemAdmin, isOwnResource } = require('../middleware/roleCheck');

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
router.get('/', isAuthenticated, isAdmin, userController.getAllUsers);

/**
 * @route   GET /api/users/roles
 * @desc    Get user roles
 * @access  Private (Admin only)
 */
router.get('/roles', isAuthenticated, isAdmin, userController.getRoles);

/**
 * @route   GET /api/users/physiotherapists
 * @desc    Get all physiotherapists
 * @access  Private (Admin only)
 */
router.get('/physiotherapists', isAuthenticated, isAdmin, userController.getPhysiotherapists);

/**
 * @route   GET /api/users/physiotherapists/count
 * @desc    Get count of physiotherapists
 * @access  Private (Admin only)
 */
router.get('/physiotherapists/count', isAuthenticated, isAdmin, userController.getPhysiotherapistsCount);

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (Admin only)
 */
router.post('/', isAuthenticated, isAdmin, userController.createUser);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin or own profile)
 */
router.get('/:id', isAuthenticated, isOwnResource(req => req.params.id), userController.getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin or own profile)
 */
router.put('/:id', isAuthenticated, isOwnResource(req => req.params.id), userController.updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (System Admin only)
 */
router.delete('/:id', isAuthenticated, isSystemAdmin, userController.deleteUser);

module.exports = router;
