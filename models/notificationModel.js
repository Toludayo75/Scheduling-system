/**
 * Notification Model for UITH Physiotherapy Scheduling System
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../middleware/logger');

/**
 * Get all notifications
 * @returns {Promise<Array>} - Array of notifications
 */
async function getAll() {
    try {
        const [notifications] = await db.query(
            `SELECT 
                BIN_TO_UUID(n.id) as id, 
                BIN_TO_UUID(n.user_id) as user_id, 
                n.message, 
                n.is_read, 
                n.created_at,
                u.firstname as user_firstname,
                u.lastname as user_lastname
             FROM 
                Notifications n
             JOIN 
                Users u ON n.user_id = u.id
             ORDER BY 
                n.created_at DESC`
        );
        
        return notifications;
    } catch (error) {
        logger.error('Get all notifications error:', error);
        throw error;
    }
}

/**
 * Get notification by ID
 * @param {string} id - Notification ID
 * @returns {Promise<Object|null>} - Notification object or null if not found
 */
async function getById(id) {
    try {
        const [notifications] = await db.query(
            `SELECT 
                BIN_TO_UUID(n.id) as id, 
                BIN_TO_UUID(n.user_id) as user_id, 
                n.message, 
                n.is_read, 
                n.created_at,
                u.firstname as user_firstname,
                u.lastname as user_lastname
             FROM 
                Notifications n
             JOIN 
                Users u ON n.user_id = u.id
             WHERE 
                n.id = UUID_TO_BIN(?)`,
            [id]
        );
        
        return notifications.length ? notifications[0] : null;
    } catch (error) {
        logger.error('Get notification by ID error:', error);
        throw error;
    }
}

/**
 * Get notifications by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of notifications
 */
async function getByUserId(userId) {
    try {
        const [notifications] = await db.query(
            `SELECT 
                BIN_TO_UUID(id) as id, 
                BIN_TO_UUID(user_id) as user_id, 
                message, 
                is_read, 
                created_at
             FROM 
                Notifications
             WHERE 
                user_id = UUID_TO_BIN(?)
             ORDER BY 
                created_at DESC`,
            [userId]
        );
        
        return notifications;
    } catch (error) {
        logger.error('Get notifications by user ID error:', error);
        throw error;
    }
}

/**
 * Get unread notifications count by user ID
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Count of unread notifications
 */
async function getUnreadCountByUserId(userId) {
    try {
        const [result] = await db.query(
            `SELECT COUNT(*) as count 
             FROM Notifications 
             WHERE user_id = UUID_TO_BIN(?) AND is_read = FALSE`,
            [userId]
        );
        
        return result[0].count;
    } catch (error) {
        logger.error('Get unread count by user ID error:', error);
        throw error;
    }
}

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} - Created notification
 */
async function create(notificationData) {
    try {
        const { user_id, message } = notificationData;
        
        const notificationId = uuidv4();
        await db.query(
            `INSERT INTO Notifications (id, user_id, message, is_read) 
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, FALSE)`,
            [notificationId, user_id, message]
        );
        
        return getById(notificationId);
    } catch (error) {
        logger.error('Create notification error:', error);
        throw error;
    }
}

/**
 * Update notification
 * @param {string} id - Notification ID
 * @param {Object} notificationData - Notification data to update
 * @returns {Promise<Object>} - Updated notification
 */
async function update(id, notificationData) {
    try {
        const { message, is_read } = notificationData;
        const updateFields = [];
        const updateValues = [];
        
        if (message !== undefined) {
            updateFields.push('message = ?');
            updateValues.push(message);
        }
        
        if (is_read !== undefined) {
            updateFields.push('is_read = ?');
            updateValues.push(is_read);
        }
        
        if (updateFields.length === 0) {
            return getById(id);
        }
        
        await db.query(
            `UPDATE Notifications 
             SET ${updateFields.join(', ')} 
             WHERE id = UUID_TO_BIN(?)`,
            [...updateValues, id]
        );
        
        return getById(id);
    } catch (error) {
        logger.error('Update notification error:', error);
        throw error;
    }
}

/**
 * Mark notification as read
 * @param {string} id - Notification ID
 * @returns {Promise<Object>} - Updated notification
 */
async function markAsRead(id) {
    try {
        await db.query(
            `UPDATE Notifications 
             SET is_read = TRUE 
             WHERE id = UUID_TO_BIN(?)`,
            [id]
        );
        
        return getById(id);
    } catch (error) {
        logger.error('Mark as read error:', error);
        throw error;
    }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if notifications were marked as read
 */
async function markAllAsRead(userId) {
    try {
        await db.query(
            `UPDATE Notifications 
             SET is_read = TRUE 
             WHERE user_id = UUID_TO_BIN(?)`,
            [userId]
        );
        
        return true;
    } catch (error) {
        logger.error('Mark all as read error:', error);
        throw error;
    }
}

/**
 * Delete notification
 * @param {string} id - Notification ID
 * @returns {Promise<boolean>} - True if notification was deleted
 */
async function deleteNotification(id) {
    try {
        const [result] = await db.query(
            `DELETE FROM Notifications WHERE id = UUID_TO_BIN(?)`,
            [id]
        );
        
        return result.affectedRows > 0;
    } catch (error) {
        logger.error('Delete notification error:', error);
        throw error;
    }
}

module.exports = {
    getAll,
    getById,
    getByUserId,
    getUnreadCountByUserId,
    create,
    update,
    markAsRead,
    markAllAsRead,
    delete: deleteNotification
};
