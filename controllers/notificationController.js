/**
 * Notification Controller for UITH Physiotherapy Scheduling System
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../middleware/logger');
const Notification = require('../models/notificationModel');

/**
 * Get notifications for current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserNotifications(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const notifications = await Notification.getByUserId(req.session.user.id);
        res.status(200).json(notifications);
    } catch (error) {
        logger.error('Get user notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
}

/**
 * Get count of unread notifications for current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUnreadNotificationsCount(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const count = await Notification.getUnreadCountByUserId(req.session.user.id);
        res.status(200).json({ count });
    } catch (error) {
        logger.error('Get unread notifications count error:', error);
        res.status(500).json({ error: 'Failed to get unread notifications count' });
    }
}

/**
 * Mark notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function markNotificationAsRead(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { id } = req.params;
        
        // Get notification
        const notification = await Notification.getById(id);
        
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        // Check if notification belongs to current user
        if (notification.user_id !== req.session.user.id) {
            return res.status(403).json({ error: 'You can only mark your own notifications as read' });
        }
        
        // Update notification
        await db.query(
            `UPDATE Notifications SET is_read = TRUE WHERE id = UUID_TO_BIN(?)`,
            [id]
        );
        
        res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
        logger.error('Mark notification as read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
}

/**
 * Mark all notifications as read for current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function markAllNotificationsAsRead(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        // Update all notifications for current user
        await db.query(
            `UPDATE Notifications SET is_read = TRUE WHERE user_id = UUID_TO_BIN(?)`,
            [req.session.user.id]
        );
        
        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        logger.error('Mark all notifications as read error:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
}

/**
 * Create a notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createNotification(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        // Check if user has permission to create notifications
        const [userRole] = await db.query(
            `SELECT name FROM Roles WHERE id = (
                SELECT role_id FROM Users WHERE id = UUID_TO_BIN(?)
            )`,
            [req.session.user.id]
        );
        
        if (!['Admin', 'System Admin'].includes(userRole[0]?.name)) {
            return res.status(403).json({ error: 'You do not have permission to create notifications' });
        }
        
        const { user_id, message } = req.body;
        
        // Validate required fields
        if (!user_id || !message) {
            return res.status(400).json({ error: 'User ID and message are required' });
        }
        
        // Create notification
        const notification = await Notification.create({
            user_id,
            message
        });
        
        res.status(201).json(notification);
    } catch (error) {
        logger.error('Create notification error:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
}

/**
 * Delete a notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function deleteNotification(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { id } = req.params;
        
        // Get notification
        const notification = await Notification.getById(id);
        
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        // Check if notification belongs to current user or user is admin/system admin
        if (notification.user_id !== req.session.user.id) {
            // Check if user is admin or system admin
            const [userRole] = await db.query(
                `SELECT name FROM Roles WHERE id = (
                    SELECT role_id FROM Users WHERE id = UUID_TO_BIN(?)
                )`,
                [req.session.user.id]
            );
            
            if (!['Admin', 'System Admin'].includes(userRole[0]?.name)) {
                return res.status(403).json({ error: 'You do not have permission to delete this notification' });
            }
        }
        
        // Delete notification
        await Notification.delete(id);
        
        res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
        logger.error('Delete notification error:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
}

module.exports = {
    getUserNotifications,
    getUnreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    createNotification,
    deleteNotification
};
