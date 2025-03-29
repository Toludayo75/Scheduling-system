/**
 * Schedule Controller for UITH Physiotherapy Scheduling System
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../middleware/logger');
const Schedule = require('../models/scheduleModel');
const Notification = require('../models/notificationModel');
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;

/**
 * Get all schedules
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllSchedules(req, res) {
    try {
        const schedules = await Schedule.getAll();
        res.status(200).json(schedules);
    } catch (error) {
        logger.error('Get all schedules error:', error);
        res.status(500).json({ error: 'Failed to get schedules' });
    }
}

/**
 * Get schedule by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getScheduleById(req, res) {
    try {
        const { id } = req.params;
        const schedule = await Schedule.getById(id);
        
        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        
        res.status(200).json(schedule);
    } catch (error) {
        logger.error('Get schedule by ID error:', error);
        res.status(500).json({ error: 'Failed to get schedule' });
    }
}

/**
 * Get schedules for current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getCurrentUserSchedules(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const schedules = await Schedule.getByPhysiotherapistId(req.session.user.id);
        res.status(200).json(schedules);
    } catch (error) {
        logger.error('Get current user schedules error:', error);
        res.status(500).json({ error: 'Failed to get schedules' });
    }
}

/**
 * Get count of schedules for current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getCurrentUserSchedulesCount(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const count = await Schedule.getCountByPhysiotherapistId(req.session.user.id);
        res.status(200).json({ count });
    } catch (error) {
        logger.error('Get current user schedules count error:', error);
        res.status(500).json({ error: 'Failed to get schedules count' });
    }
}

/**
 * Get schedules for specific user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserSchedules(req, res) {
    try {
        const { userId } = req.params;
        const schedules = await Schedule.getByPhysiotherapistId(userId);
        res.status(200).json(schedules);
    } catch (error) {
        logger.error('Get user schedules error:', error);
        res.status(500).json({ error: 'Failed to get schedules' });
    }
}

/**
 * Get schedules for current user for a specific month
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getCurrentUserSchedulesByMonth(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { year, month } = req.params;
        
        // Validate year and month
        if (!year || !month || isNaN(parseInt(year)) || isNaN(parseInt(month))) {
            return res.status(400).json({ error: 'Invalid year or month' });
        }
        
        const schedules = await Schedule.getByPhysiotherapistIdAndMonth(
            req.session.user.id,
            parseInt(year),
            parseInt(month)
        );
        
        res.status(200).json(schedules);
    } catch (error) {
        logger.error('Get current user schedules by month error:', error);
        res.status(500).json({ error: 'Failed to get schedules' });
    }
}

/**
 * Get schedules in date range
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSchedulesByDateRange(req, res) {
    try {
        const { startDate, endDate } = req.params;
        const isExport = req.query.export === 'true';
        
        // Validate dates
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }
        
        const schedules = await Schedule.getByDateRange(startDate, endDate);
        
        // If export requested, return CSV
        if (isExport) {
            // Format schedules for CSV
            const formattedSchedules = schedules.map(schedule => ({
                Physiotherapist: `${schedule.physiotherapist.firstname} ${schedule.physiotherapist.lastname}`,
                Date: schedule.shift_date,
                'Start Time': schedule.start_time,
                'End Time': schedule.end_time,
                Status: schedule.status
            }));
            
            // Create CSV
            const csvStringifier = createCsvStringifier({
                header: [
                    { id: 'Physiotherapist', title: 'Physiotherapist' },
                    { id: 'Date', title: 'Date' },
                    { id: 'Start Time', title: 'Start Time' },
                    { id: 'End Time', title: 'End Time' },
                    { id: 'Status', title: 'Status' }
                ]
            });
            
            const csvHeader = csvStringifier.getHeaderString();
            const csvBody = csvStringifier.stringifyRecords(formattedSchedules);
            const csvContent = csvHeader + csvBody;
            
            // Set response headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=schedule_${startDate}_to_${endDate}.csv`);
            
            return res.send(csvContent);
        }
        
        res.status(200).json(schedules);
    } catch (error) {
        logger.error('Get schedules by date range error:', error);
        res.status(500).json({ error: 'Failed to get schedules' });
    }
}

/**
 * Create a new schedule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createSchedule(req, res) {
    try {
        const { physiotherapist_id, shift_date, start_time, end_time, status } = req.body;
        
        // Validate required fields
        if (!physiotherapist_id || !shift_date || !start_time || !end_time || !status) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Validate status
        if (!['Scheduled', 'Completed', 'Cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        // Check for scheduling conflicts
        const conflicts = await Schedule.checkConflicts(physiotherapist_id, shift_date, start_time, end_time);
        if (conflicts.length > 0) {
            return res.status(400).json({ 
                error: 'Scheduling conflict detected',
                conflicts
            });
        }
        
        // Create schedule
        const schedule = await Schedule.create({
            physiotherapist_id,
            shift_date,
            start_time,
            end_time,
            status
        });
        
        // Create notification for the physiotherapist
        await Notification.create({
            user_id: physiotherapist_id,
            message: `You have been assigned a new shift on ${shift_date} from ${start_time} to ${end_time}.`
        });
        
        // Log schedule creation
        logger.info(`Schedule created for physiotherapist ${physiotherapist_id} on ${shift_date}`);
        
        // Create audit log entry
        await db.query(
            `INSERT INTO AuditLogs (id, user_id, action, details, ip_address)
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)`,
            [uuidv4(), req.session.user.id, 'Schedule Created', 
             `Created schedule for physiotherapist ${physiotherapist_id} on ${shift_date}`, req.ip]
        );
        
        res.status(201).json(schedule);
    } catch (error) {
        logger.error('Create schedule error:', error);
        res.status(500).json({ error: 'Failed to create schedule' });
    }
}

/**
 * Update a schedule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateSchedule(req, res) {
    try {
        const { id } = req.params;
        const { shift_date, start_time, end_time, status } = req.body;
        
        // Validate required fields
        if (!shift_date || !start_time || !end_time || !status) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Validate status
        if (!['Scheduled', 'Completed', 'Cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        // Get existing schedule
        const existingSchedule = await Schedule.getById(id);
        
        if (!existingSchedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        
        // Check for scheduling conflicts (excluding this schedule)
        const conflicts = await Schedule.checkConflicts(
            existingSchedule.physiotherapist_id,
            shift_date,
            start_time,
            end_time,
            id
        );
        
        if (conflicts.length > 0) {
            return res.status(400).json({ 
                error: 'Scheduling conflict detected',
                conflicts
            });
        }
        
        // Update schedule
        await Schedule.update(id, {
            shift_date,
            start_time,
            end_time,
            status
        });
        
        // Create notification for the physiotherapist if details changed
        if (shift_date !== existingSchedule.shift_date || 
            start_time !== existingSchedule.start_time || 
            end_time !== existingSchedule.end_time ||
            status !== existingSchedule.status) {
            
            await Notification.create({
                user_id: existingSchedule.physiotherapist_id,
                message: `Your shift on ${shift_date} has been updated. New time: ${start_time} to ${end_time}. Status: ${status}.`
            });
        }
        
        // Log schedule update
        logger.info(`Schedule ${id} updated`);
        
        // Create audit log entry
        await db.query(
            `INSERT INTO AuditLogs (id, user_id, action, details, ip_address)
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)`,
            [uuidv4(), req.session.user.id, 'Schedule Updated', 
             `Updated schedule ${id} for physiotherapist ${existingSchedule.physiotherapist_id}`, req.ip]
        );
        
        // Get updated schedule
        const updatedSchedule = await Schedule.getById(id);
        
        res.status(200).json(updatedSchedule);
    } catch (error) {
        logger.error('Update schedule error:', error);
        res.status(500).json({ error: 'Failed to update schedule' });
    }
}

/**
 * Delete a schedule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function deleteSchedule(req, res) {
    try {
        const { id } = req.params;
        
        // Get existing schedule
        const existingSchedule = await Schedule.getById(id);
        
        if (!existingSchedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        
        // Delete schedule
        await Schedule.delete(id);
        
        // Create notification for the physiotherapist
        await Notification.create({
            user_id: existingSchedule.physiotherapist_id,
            message: `Your shift on ${existingSchedule.shift_date} from ${existingSchedule.start_time} to ${existingSchedule.end_time} has been cancelled.`
        });
        
        // Log schedule deletion
        logger.info(`Schedule ${id} deleted`);
        
        // Create audit log entry
        await db.query(
            `INSERT INTO AuditLogs (id, user_id, action, details, ip_address)
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)`,
            [uuidv4(), req.session.user.id, 'Schedule Deleted', 
             `Deleted schedule ${id} for physiotherapist ${existingSchedule.physiotherapist_id}`, req.ip]
        );
        
        res.status(200).json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        logger.error('Delete schedule error:', error);
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
}

module.exports = {
    getAllSchedules,
    getScheduleById,
    getCurrentUserSchedules,
    getCurrentUserSchedulesCount,
    getUserSchedules,
    getCurrentUserSchedulesByMonth,
    getSchedulesByDateRange,
    createSchedule,
    updateSchedule,
    deleteSchedule
};
