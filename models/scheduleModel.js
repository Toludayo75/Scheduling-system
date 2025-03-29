/**
 * Schedule Model for UITH Physiotherapy Scheduling System
 */
const db = require('../config/database');
const logger = require('../middleware/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all schedules
 * @returns {Promise<Array>} - Array of schedules
 */
async function getAll() {
    try {
        const [schedules] = await db.query(
            `SELECT s.*, 
                    u.firstname as physiotherapist_firstname,
                    u.lastname as physiotherapist_lastname
             FROM \`Schedules\` s
             JOIN \`Users\` u ON s.physiotherapist_id = u.id
             ORDER BY s.shift_date DESC, s.start_time ASC`
        );
        
        return schedules;
    } catch (error) {
        logger.error('Get all schedules error:', error);
        throw error;
    }
}

/**
 * Get schedule by ID
 * @param {string} id - Schedule ID
 * @returns {Promise<Object|null>} - Schedule object or null if not found
 */
async function getById(id) {
    try {
        const [schedules] = await db.query(
            `SELECT s.*, 
                    u.firstname as physiotherapist_firstname,
                    u.lastname as physiotherapist_lastname
             FROM \`Schedules\` s
             JOIN \`Users\` u ON s.physiotherapist_id = u.id
             WHERE s.id = ?`, 
            [id]
        );
        
        return schedules.length > 0 ? schedules[0] : null;
    } catch (error) {
        logger.error('Get schedule by ID error:', error);
        throw error;
    }
}

/**
 * Get schedules by physiotherapist ID
 * @param {string} physiotherapistId - Physiotherapist ID
 * @returns {Promise<Array>} - Array of schedules
 */
async function getByPhysiotherapistId(physiotherapistId) {
    try {
        const [schedules] = await db.query(
            `SELECT s.*, 
                    u.firstname as physiotherapist_firstname,
                    u.lastname as physiotherapist_lastname
             FROM \`Schedules\` s
             JOIN \`Users\` u ON s.physiotherapist_id = u.id
             WHERE s.physiotherapist_id = ?
             ORDER BY s.shift_date DESC, s.start_time ASC`, 
            [physiotherapistId]
        );
        
        return schedules;
    } catch (error) {
        logger.error('Get schedules by physiotherapist ID error:', error);
        throw error;
    }
}

/**
 * Get count of schedules by physiotherapist ID
 * @param {string} physiotherapistId - Physiotherapist ID
 * @returns {Promise<number>} - Count of schedules
 */
async function getCountByPhysiotherapistId(physiotherapistId) {
    try {
        const [result] = await db.query(
            `SELECT COUNT(*) as count 
             FROM \`Schedules\` 
             WHERE physiotherapist_id = ?`, 
            [physiotherapistId]
        );
        
        return parseInt(result[0].count);
    } catch (error) {
        logger.error('Get count of schedules by physiotherapist ID error:', error);
        throw error;
    }
}

/**
 * Get schedules by physiotherapist ID and month
 * @param {string} physiotherapistId - Physiotherapist ID
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Promise<Array>} - Array of schedules
 */
async function getByPhysiotherapistIdAndMonth(physiotherapistId, year, month) {
    try {
        // Calculate start and end dates for the month
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = month === 12 
            ? `${year + 1}-01-01` 
            : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
        
        const [schedules] = await db.query(
            `SELECT s.*, 
                    u.firstname as physiotherapist_firstname,
                    u.lastname as physiotherapist_lastname
             FROM \`Schedules\` s
             JOIN \`Users\` u ON s.physiotherapist_id = u.id
             WHERE s.physiotherapist_id = ?
             AND s.shift_date >= ?
             AND s.shift_date < ?
             ORDER BY s.shift_date ASC, s.start_time ASC`, 
            [physiotherapistId, startDate, endDate]
        );
        
        return schedules;
    } catch (error) {
        logger.error('Get schedules by physiotherapist ID and month error:', error);
        throw error;
    }
}

/**
 * Get schedules by date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} - Array of schedules
 */
async function getByDateRange(startDate, endDate) {
    try {
        const [schedules] = await db.query(
            `SELECT s.*, 
                    u.firstname as physiotherapist_firstname,
                    u.lastname as physiotherapist_lastname
             FROM \`Schedules\` s
             JOIN \`Users\` u ON s.physiotherapist_id = u.id
             WHERE s.shift_date >= ?
             AND s.shift_date <= ?
             ORDER BY s.shift_date ASC, s.start_time ASC`, 
            [startDate, endDate]
        );
        
        return schedules;
    } catch (error) {
        logger.error('Get schedules by date range error:', error);
        throw error;
    }
}

/**
 * Check for scheduling conflicts
 * @param {string} physiotherapistId - Physiotherapist ID
 * @param {string} shiftDate - Shift date (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM:SS)
 * @param {string} endTime - End time (HH:MM:SS)
 * @param {string} [excludeId] - Schedule ID to exclude from conflict check
 * @returns {Promise<Array>} - Array of conflicting schedules
 */
async function checkConflicts(physiotherapistId, shiftDate, startTime, endTime, excludeId = null) {
    try {
        let query = `
            SELECT * FROM \`Schedules\`
            WHERE physiotherapist_id = ?
            AND shift_date = ?
            AND (
                (start_time <= ? AND end_time > ?) OR
                (start_time < ? AND end_time >= ?) OR
                (start_time >= ? AND end_time <= ?)
            )
        `;
        
        let params = [
            physiotherapistId, shiftDate,
            endTime, startTime,
            endTime, startTime,
            startTime, endTime
        ];
        
        // Exclude the schedule with given ID
        if (excludeId) {
            query += ` AND id != ?`;
            params.push(excludeId);
        }
        
        const [conflicts] = await db.query(query, params);
        return conflicts;
    } catch (error) {
        logger.error('Check conflicts error:', error);
        throw error;
    }
}

/**
 * Create a new schedule
 * @param {Object} scheduleData - Schedule data
 * @returns {Promise<Object>} - Created schedule
 */
async function create(scheduleData) {
    try {
        // Generate UUID
        const scheduleId = uuidv4();
        
        // Insert schedule
        await db.query(
            `INSERT INTO \`Schedules\` (
                id, physiotherapist_id, shift_date, 
                start_time, end_time, status, shift_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [
                scheduleId,
                scheduleData.physiotherapist_id,
                scheduleData.shift_date,
                scheduleData.start_time,
                scheduleData.end_time,
                scheduleData.status || 'Scheduled',
                scheduleData.shift_type || 'Regular'
            ]
        );
        
        // Get created schedule
        const schedule = await getById(scheduleId);
        return schedule;
    } catch (error) {
        logger.error('Create schedule error:', error);
        throw error;
    }
}

/**
 * Update schedule
 * @param {string} id - Schedule ID
 * @param {Object} scheduleData - Schedule data to update
 * @returns {Promise<Object>} - Updated schedule
 */
async function update(id, scheduleData) {
    try {
        const fieldsToUpdate = {};
        
        // Only update provided fields
        if (scheduleData.physiotherapist_id) fieldsToUpdate.physiotherapist_id = scheduleData.physiotherapist_id;
        if (scheduleData.shift_date) fieldsToUpdate.shift_date = scheduleData.shift_date;
        if (scheduleData.start_time) fieldsToUpdate.start_time = scheduleData.start_time;
        if (scheduleData.end_time) fieldsToUpdate.end_time = scheduleData.end_time;
        if (scheduleData.status) fieldsToUpdate.status = scheduleData.status;
        if (scheduleData.shift_type) fieldsToUpdate.shift_type = scheduleData.shift_type;
        
        // If no fields to update, return existing schedule
        if (Object.keys(fieldsToUpdate).length === 0) {
            return await getById(id);
        }
        
        // Build SET clause and values array
        const setClause = Object.keys(fieldsToUpdate)
            .map(key => `${key} = ?`)
            .join(', ');
        
        const values = [...Object.values(fieldsToUpdate), id];
        
        // Update schedule
        await db.query(
            `UPDATE \`Schedules\` SET ${setClause} WHERE id = ?`,
            values
        );
        
        // Get updated schedule
        const updatedSchedule = await getById(id);
        return updatedSchedule;
    } catch (error) {
        logger.error('Update schedule error:', error);
        throw error;
    }
}

/**
 * Delete schedule
 * @param {string} id - Schedule ID
 * @returns {Promise<boolean>} - True if schedule was deleted
 */
async function deleteSchedule(id) {
    try {
        // Check for related shift requests
        const [requests] = await db.query(
            `SELECT COUNT(*) as count FROM \`ShiftRequests\` WHERE schedule_id = ?`,
            [id]
        );
        
        // If schedule has related shift requests, delete them first
        if (parseInt(requests[0].count) > 0) {
            await db.query(
                `DELETE FROM \`ShiftRequests\` WHERE schedule_id = ?`,
                [id]
            );
        }
        
        // Delete schedule
        const [result] = await db.query(
            `DELETE FROM \`Schedules\` WHERE id = ?`,
            [id]
        );
        
        return result.affectedRows > 0;
    } catch (error) {
        logger.error('Delete schedule error:', error);
        throw error;
    }
}

module.exports = {
    getAll,
    getById,
    getByPhysiotherapistId,
    getCountByPhysiotherapistId,
    getByPhysiotherapistIdAndMonth,
    getByDateRange,
    checkConflicts,
    create,
    update,
    delete: deleteSchedule
};