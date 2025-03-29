/**
 * Notification Routes for UITH Physiotherapy Scheduling System
 */
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin, isOwnResource } = require('../middleware/roleCheck');

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for current user
 * @access  Private
 */
router.get('/', isAuthenticated, notificationController.getUserNotifications);

/**
 * @route   GET /api/notifications/unread/count
 * @desc    Get count of unread notifications for current user
 * @access  Private
 */
router.get('/unread/count', isAuthenticated, notificationController.getUnreadNotificationsCount);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', isAuthenticated, isOwnResource(async (req) => {
    const notification = await require('../models/notificationModel').getById(req.params.id);
    return notification ? notification.user_id : null;
}), notificationController.markNotificationAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read for current user
 * @access  Private
 */
router.put('/read-all', isAuthenticated, notificationController.markAllNotificationsAsRead);

/**
 * @route   POST /api/notifications
 * @desc    Create a notification
 * @access  Private (Admin only)
 */
router.post('/', isAuthenticated, isAdmin, notificationController.createNotification);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', isAuthenticated, isOwnResource(async (req) => {
    const notification = await require('../models/notificationModel').getById(req.params.id);
    return notification ? notification.user_id : null;
}), notificationController.deleteNotification);

module.exports = router;
