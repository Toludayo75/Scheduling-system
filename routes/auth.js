/**
 * Authentication Routes for UITH Physiotherapy Scheduling System
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated, isNotAuthenticated } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');

/**
 * @route   POST /api/register
 * @desc    Register a new user
 * @access  Private (Admin only)
 */
router.post('/register', isAuthenticated, isAdmin, authController.register);

/**
 * @route   POST /api/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', isAuthenticated, authController.logout);

/**
 * @route   GET /api/user
 * @desc    Get current user
 * @access  Private
 */
router.get('/user', isAuthenticated, authController.getCurrentUser);

/**
 * @route   POST /api/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', isAuthenticated, authController.changePassword);

module.exports = router;
