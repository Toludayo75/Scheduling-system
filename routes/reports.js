/**
 * Report Routes for UITH Physiotherapy Scheduling System
 */
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin, isSystemAdmin } = require('../middleware/roleCheck');

/**
 * @route   GET /api/reports/staff-workload
 * @desc    Get staff workload report
 * @access  Private (Admin only)
 */
router.get('/staff-workload', isAuthenticated, isAdmin, reportController.getStaffWorkloadReport);

/**
 * @route   GET /api/reports/shift-requests
 * @desc    Get shift requests report
 * @access  Private (Admin only)
 */
router.get('/shift-requests', isAuthenticated, isAdmin, reportController.getShiftRequestsReport);

/**
 * @route   GET /api/reports/system-usage
 * @desc    Get system usage report
 * @access  Private (System Admin only)
 */
router.get('/system-usage', isAuthenticated, isSystemAdmin, reportController.getSystemUsageReport);

/**
 * @route   GET /api/reports/system-stats
 * @desc    Get system statistics
 * @access  Private (System Admin only)
 */
router.get('/system-stats', isAuthenticated, isSystemAdmin, reportController.getSystemStats);

module.exports = router;
