/**
 * Shift Request Model for UITH Physiotherapy Scheduling System
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../middleware/logger');

/**
 * Get all shift requests
 * @returns {Promise<Array>} - Array of shift requests
 */
async function getAll() {
    try {
        const [requests] = await db.query(
            `SELECT 
                BIN_TO_UUID(sr.id) as id, 
                BIN_TO_UUID(sr.physiotherapist_id) as physiotherapist_id, 
                BIN_TO_UUID(sr.schedule_id) as schedule_id, 
                sr.reason, 
                sr.status, 
                sr.created_at,
                sr.request_type,
                BIN_TO_UUID(sr.swap_staff_id) as swap_staff_id,
                u.firstname as physiotherapist_firstname,
                u.lastname as physiotherapist_lastname,
                s.shift_date as schedule_shift_date,
                s.start_time as schedule_start_time,
                s.end_time as schedule_end_time,
                s.shift_type as schedule_shift_type,
                s.status as schedule_status
             FROM 
                ShiftRequests sr
             JOIN 
                Users u ON sr.physiotherapist_id = u.id
             JOIN 
                Schedules s ON sr.schedule_id = s.id
             ORDER BY 
                sr.created_at DESC`
        );
        
        // Format the response
        return requests.map(request => ({
            id: request.id,
            physiotherapist_id: request.physiotherapist_id,
            schedule_id: request.schedule_id,
            reason: request.reason,
            status: request.status,
            created_at: request.created_at,
            request_type: request.request_type || 'cover',
            swap_staff_id: request.swap_staff_id,
            physiotherapist: {
                id: request.physiotherapist_id,
                firstname: request.physiotherapist_firstname,
                lastname: request.physiotherapist_lastname
            },
            schedule: {
                id: request.schedule_id,
                shift_date: request.schedule_shift_date,
                start_time: request.schedule_start_time,
                end_time: request.schedule_end_time,
                shift_type: request.schedule_shift_type,
                status: request.schedule_status
            }
        }));
    } catch (error) {
        logger.error('Get all shift requests error:', error);
        throw error;
    }
}

/**
 * Get shift request by ID
 * @param {string} id - Shift request ID
 * @returns {Promise<Object|null>} - Shift request object or null if not found
 */
async function getById(id) {
    try {
        const [requests] = await db.query(
            `SELECT 
                BIN_TO_UUID(sr.id) as id, 
                BIN_TO_UUID(sr.physiotherapist_id) as physiotherapist_id, 
                BIN_TO_UUID(sr.schedule_id) as schedule_id, 
                sr.reason, 
                sr.status, 
                sr.created_at,
                sr.request_type,
                BIN_TO_UUID(sr.swap_staff_id) as swap_staff_id,
                u.firstname as physiotherapist_firstname,
                u.lastname as physiotherapist_lastname,
                s.shift_date as schedule_shift_date,
                s.start_time as schedule_start_time,
                s.end_time as schedule_end_time,
                s.shift_type as schedule_shift_type,
                s.status as schedule_status
             FROM 
                ShiftRequests sr
             JOIN 
                Users u ON sr.physiotherapist_id = u.id
             JOIN 
                Schedules s ON sr.schedule_id = s.id
             WHERE 
                sr.id = UUID_TO_BIN(?)`,
            [id]
        );
        
        if (requests.length === 0) {
            return null;
        }
        
        const request = requests[0];
        
        // Format the response
        return {
            id: request.id,
            physiotherapist_id: request.physiotherapist_id,
            schedule_id: request.schedule_id,
            reason: request.reason,
            status: request.status,
            created_at: request.created_at,
            request_type: request.request_type || 'cover',
            swap_staff_id: request.swap_staff_id,
            physiotherapist: {
                id: request.physiotherapist_id,
                firstname: request.physiotherapist_firstname,
                lastname: request.physiotherapist_lastname
            },
            schedule: {
                id: request.schedule_id,
                shift_date: request.schedule_shift_date,
                start_time: request.schedule_start_time,
                end_time: request.schedule_end_time,
                shift_type: request.schedule_shift_type,
                status: request.schedule_status
            }
        };
    } catch (error) {
        logger.error('Get shift request by ID error:', error);
        throw error;
    }
}

/**
 * Get shift requests by physiotherapist ID
 * @param {string} physiotherapistId - Physiotherapist ID
 * @returns {Promise<Array>} - Array of shift requests
 */
async function getByPhysiotherapistId(physiotherapistId) {
    try {
        const [requests] = await db.query(
            `SELECT 
                BIN_TO_UUID(sr.id) as id, 
                BIN_TO_UUID(sr.physiotherapist_id) as physiotherapist_id, 
                BIN_TO_UUID(sr.schedule_id) as schedule_id, 
                sr.reason, 
                sr.status, 
                sr.created_at,
                sr.request_type,
                BIN_TO_UUID(sr.swap_staff_id) as swap_staff_id,
                u.firstname as physiotherapist_firstname,
                u.lastname as physiotherapist_lastname,
                s.shift_date as schedule_shift_date,
                s.start_time as schedule_start_time,
                s.end_time as schedule_end_time,
                s.shift_type as schedule_shift_type,
                s.status as schedule_status
             FROM 
                ShiftRequests sr
             JOIN 
                Users u ON sr.physiotherapist_id = u.id
             JOIN 
                Schedules s ON sr.schedule_id = s.id
             WHERE 
                sr.physiotherapist_id = UUID_TO_BIN(?)
             ORDER BY 
                sr.created_at DESC`,
            [physiotherapistId]
        );
        
        // Format the response
        return requests.map(request => ({
            id: request.id,
            physiotherapist_id: request.physiotherapist_id,
            schedule_id: request.schedule_id,
            reason: request.reason,
            status: request.status,
            created_at: request.created_at,
            request_type: request.request_type || 'cover',
            swap_staff_id: request.swap_staff_id,
            physiotherapist: {
                id: request.physiotherapist_id,
                firstname: request.physiotherapist_firstname,
                lastname: request.physiotherapist_lastname
            },
            schedule: {
                id: request.schedule_id,
                shift_date: request.schedule_shift_date,
                start_time: request.schedule_start_time,
                end_time: request.schedule_end_time,
                shift_type: request.schedule_shift_type,
                status: request.schedule_status
            }
        }));
    } catch (error) {
        logger.error('Get shift requests by physiotherapist ID error:', error);
        throw error;
    }
}

/**
 * Get count of shift requests by status
 * @param {string} status - Status to filter by
 * @returns {Promise<number>} - Count of shift requests
 */
async function getCountByStatus(status) {
    try {
        const [result] = await db.query(
            `SELECT COUNT(*) as count 
             FROM ShiftRequests 
             WHERE status = ?`,
            [status]
        );
        
        return result[0].count;
    } catch (error) {
        logger.error('Get count by status error:', error);
        throw error;
    }
}

/**
 * Create a new shift request
 * @param {Object} requestData - Shift request data
 * @returns {Promise<Object>} - Created shift request
 */
async function create(requestData) {
    try {
        const { 
            physiotherapist_id, 
            schedule_id, 
            reason, 
            status = 'Pending',
            request_type = 'cover',
            swap_staff_id = null
        } = requestData;
        
        const requestId = uuidv4();
        await db.query(
            `INSERT INTO ShiftRequests 
              (id, physiotherapist_id, schedule_id, reason, status, request_type, swap_staff_id) 
             VALUES (
                UUID_TO_BIN(?), 
                UUID_TO_BIN(?), 
                UUID_TO_BIN(?), 
                ?, 
                ?, 
                ?,
                ${swap_staff_id ? 'UUID_TO_BIN(?)' : 'NULL'}
             )`,
            swap_staff_id 
                ? [requestId, physiotherapist_id, schedule_id, reason || null, status, request_type, swap_staff_id]
                : [requestId, physiotherapist_id, schedule_id, reason || null, status, request_type]
        );
        
        return getById(requestId);
    } catch (error) {
        logger.error('Create shift request error:', error);
        throw error;
    }
}

/**
 * Update shift request
 * @param {string} id - Shift request ID
 * @param {Object} requestData - Shift request data to update
 * @returns {Promise<Object>} - Updated shift request
 */
async function update(id, requestData) {
    try {
        const { reason, status, request_type, swap_staff_id } = requestData;
        const updateFields = [];
        const updateValues = [];
        
        if (reason !== undefined) {
            updateFields.push('reason = ?');
            updateValues.push(reason);
        }
        
        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }
        
        if (request_type !== undefined) {
            updateFields.push('request_type = ?');
            updateValues.push(request_type);
        }
        
        if (swap_staff_id !== undefined) {
            if (swap_staff_id === null) {
                updateFields.push('swap_staff_id = NULL');
            } else {
                updateFields.push('swap_staff_id = UUID_TO_BIN(?)');
                updateValues.push(swap_staff_id);
            }
        }
        
        if (updateFields.length === 0) {
            return getById(id);
        }
        
        await db.query(
            `UPDATE ShiftRequests 
             SET ${updateFields.join(', ')} 
             WHERE id = UUID_TO_BIN(?)`,
            [...updateValues, id]
        );
        
        return getById(id);
    } catch (error) {
        logger.error('Update shift request error:', error);
        throw error;
    }
}

/**
 * Delete shift request
 * @param {string} id - Shift request ID
 * @returns {Promise<boolean>} - True if shift request was deleted
 */
async function deleteShiftRequest(id) {
    try {
        const [result] = await db.query(
            `DELETE FROM ShiftRequests WHERE id = UUID_TO_BIN(?)`,
            [id]
        );
        
        return result.affectedRows > 0;
    } catch (error) {
        logger.error('Delete shift request error:', error);
        throw error;
    }
}

module.exports = {
    getAll,
    getById,
    getByPhysiotherapistId,
    getCountByStatus,
    create,
    update,
    delete: deleteShiftRequest
};