/**
 * Schedule Routes for UITH Physiotherapy Scheduling System
 */
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin, isOwnResource } = require('../middleware/roleCheck');

/**
 * @route   GET /api/schedules
 * @desc    Get all schedules
 * @access  Private (Admin only)
 */
router.get('/', isAuthenticated, isAdmin, scheduleController.getAllSchedules);

/**
 * @route   GET /api/schedules/user/count
 * @desc    Get count of schedules for current user
 * @access  Private
 */
router.get('/user/count', isAuthenticated, scheduleController.getCurrentUserSchedulesCount);

/**
 * @route   GET /api/schedules/user/month/:year/:month
 * @desc    Get schedules for current user for a specific month
 * @access  Private
 */
router.get('/user/month/:year/:month', isAuthenticated, scheduleController.getCurrentUserSchedulesByMonth);

/**
 * @route   GET /api/schedules/user/:userId
 * @desc    Get schedules for specific user
 * @access  Private (Admin or own schedules)
 */
router.get('/user/:userId', isAuthenticated, isOwnResource(req => req.params.userId), scheduleController.getUserSchedules);

/**
 * @route   GET /api/schedules/user
 * @desc    Get schedules for current user
 * @access  Private
 */
router.get('/user', isAuthenticated, scheduleController.getCurrentUserSchedules);

/**
 * @route   GET /api/schedules/range/:startDate/:endDate
 * @desc    Get schedules in date range
 * @access  Private (Admin only)
 */
router.get('/range/:startDate/:endDate', isAuthenticated, isAdmin, scheduleController.getSchedulesByDateRange);

/**
 * @route   GET /api/schedules/:id
 * @desc    Get schedule by ID
 * @access  Private
 */
router.get('/:id', isAuthenticated, scheduleController.getScheduleById);

/**
 * @route   POST /api/schedules
 * @desc    Create a new schedule
 * @access  Private (Admin only)
 */
router.post('/', isAuthenticated, isAdmin, scheduleController.createSchedule);

/**
 * @route   PUT /api/schedules/:id
 * @desc    Update a schedule
 * @access  Private (Admin only)
 */
router.put('/:id', isAuthenticated, isAdmin, scheduleController.updateSchedule);

/**
 * @route   DELETE /api/schedules/:id
 * @desc    Delete a schedule
 * @access  Private (Admin only)
 */
router.delete('/:id', isAuthenticated, isAdmin, scheduleController.deleteSchedule);

module.exports = router;
