/**
 * Shift Request Controller for UITH Physiotherapy Scheduling System
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../middleware/logger');
const ShiftRequest = require('../models/shiftRequestModel');
const Notification = require('../models/notificationModel');

/**
 * Get all shift requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllShiftRequests(req, res) {
    try {
        const shiftRequests = await ShiftRequest.getAll();
        res.status(200).json(shiftRequests);
    } catch (error) {
        logger.error('Get all shift requests error:', error);
        res.status(500).json({ error: 'Failed to get shift requests' });
    }
}

/**
 * Get shift request by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getShiftRequestById(req, res) {
    try {
        const { id } = req.params;
        const shiftRequest = await ShiftRequest.getById(id);
        
        if (!shiftRequest) {
            return res.status(404).json({ error: 'Shift request not found' });
        }
        
        res.status(200).json(shiftRequest);
    } catch (error) {
        logger.error('Get shift request by ID error:', error);
        res.status(500).json({ error: 'Failed to get shift request' });
    }
}

/**
 * Get shift requests for current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getCurrentUserShiftRequests(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const shiftRequests = await ShiftRequest.getByPhysiotherapistId(req.session.user.id);
        res.status(200).json(shiftRequests);
    } catch (error) {
        logger.error('Get current user shift requests error:', error);
        res.status(500).json({ error: 'Failed to get shift requests' });
    }
}

/**
 * Get count of pending shift requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getPendingShiftRequestsCount(req, res) {
    try {
        const count = await ShiftRequest.getCountByStatus('Pending');
        res.status(200).json({ count });
    } catch (error) {
        logger.error('Get pending shift requests count error:', error);
        res.status(500).json({ error: 'Failed to get pending shift requests count' });
    }
}

/**
 * Create a new shift request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createShiftRequest(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { schedule_id, reason, request_type, swap_staff_id } = req.body;
        
        // Validate required fields
        if (!schedule_id) {
            return res.status(400).json({ error: 'Schedule ID is required' });
        }
        
        if (!reason) {
            return res.status(400).json({ error: 'Reason is required' });
        }
        
        // Check if schedule exists
        const [schedules] = await db.query(
            `SELECT BIN_TO_UUID(id) as id, BIN_TO_UUID(physiotherapist_id) as physiotherapist_id, 
             shift_date, start_time, end_time, shift_type 
             FROM Schedules WHERE id = UUID_TO_BIN(?)`,
            [schedule_id]
        );
        
        if (schedules.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        
        // Ensure user is requesting change for their own schedule
        if (schedules[0].physiotherapist_id !== req.session.user.id) {
            return res.status(403).json({ error: 'You can only request changes for your own schedules' });
        }
        
        // Check if there's already a pending request for this schedule
        const [existingRequests] = await db.query(
            `SELECT BIN_TO_UUID(id) as id FROM ShiftRequests 
             WHERE schedule_id = UUID_TO_BIN(?) AND status = 'Pending'`,
            [schedule_id]
        );
        
        if (existingRequests.length > 0) {
            return res.status(400).json({ error: 'There is already a pending request for this shift' });
        }
        
        // Create shift request
        const shiftRequestId = uuidv4();
        
        // For swap requests, validate the swap staff
        let swapStaffDetails = null;
        
        if (request_type === 'swap' && swap_staff_id) {
            // Validate that the swap staff exists and is a physiotherapist
            const [staffResults] = await db.query(
                `SELECT BIN_TO_UUID(id) as id, firstname, lastname 
                 FROM Users WHERE id = UUID_TO_BIN(?) AND 
                 role_id = (SELECT id FROM Roles WHERE name = 'Physiotherapist')`,
                [swap_staff_id]
            );
            
            if (staffResults.length === 0) {
                return res.status(404).json({ error: 'Selected staff member not found or is not a physiotherapist' });
            }
            
            swapStaffDetails = staffResults[0];
            
            // Insert shift request with swap details
            await db.query(
                `INSERT INTO ShiftRequests (id, physiotherapist_id, schedule_id, reason, status, request_type, swap_staff_id) 
                 VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, UUID_TO_BIN(?))`,
                [shiftRequestId, req.session.user.id, schedule_id, reason, 'Pending', 'swap', swap_staff_id]
            );
            
            // Notify the selected staff member about the swap request
            await Notification.create({
                user_id: swap_staff_id,
                message: `${req.session.user.firstname} ${req.session.user.lastname} has requested to swap shifts with you on ${new Date(schedules[0].shift_date).toLocaleDateString()}`
            });
        } else {
            // Insert shift request without swap details (standard cover request)
            await db.query(
                `INSERT INTO ShiftRequests (id, physiotherapist_id, schedule_id, reason, status, request_type) 
                 VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)`,
                [shiftRequestId, req.session.user.id, schedule_id, reason, 'Pending', request_type || 'cover']
            );
        }
        
        // Get created shift request with details
        const shiftRequest = await ShiftRequest.getById(shiftRequestId);
        
        // Notify admins about the new shift request
        // Get all admin users
        const [admins] = await db.query(
            `SELECT BIN_TO_UUID(id) as id FROM Users 
             WHERE role_id = (SELECT id FROM Roles WHERE name = 'Admin')`,
            []
        );
        
        // Create notification for each admin
        for (const admin of admins) {
            const requestTypeText = request_type === 'swap' ? 'shift swap' : 'shift cover';
            const additionalInfo = swapStaffDetails ? 
                ` with ${swapStaffDetails.firstname} ${swapStaffDetails.lastname}` : '';
            
            await Notification.create({
                user_id: admin.id,
                message: `New ${requestTypeText} request from ${req.session.user.firstname} ${req.session.user.lastname}${additionalInfo} for ${new Date(schedules[0].shift_date).toLocaleDateString()}`
            });
        }
        
        // Log shift request creation
        logger.info(`${request_type || 'Cover'} request created for schedule ${schedule_id} by user ${req.session.user.id}`);
        
        // Create audit log entry
        await db.query(
            `INSERT INTO AuditLogs (id, user_id, action, details, ip_address)
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)`,
            [uuidv4(), req.session.user.id, 'Shift Request Created', 
             `Created ${request_type || 'cover'} request for schedule ${schedule_id}${swapStaffDetails ? ` with staff ${swap_staff_id}` : ''}`, req.ip]
        );
        
        res.status(201).json(shiftRequest);
    } catch (error) {
        logger.error('Create shift request error:', error);
        res.status(500).json({ error: 'Failed to create shift request' });
    }
}

/**
 * Update shift request status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateShiftRequestStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validate status
        if (!status || !['Pending', 'Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        // Get existing shift request
        const shiftRequest = await ShiftRequest.getById(id);
        
        if (!shiftRequest) {
            return res.status(404).json({ error: 'Shift request not found' });
        }
        
        // Update status
        await db.query(
            `UPDATE ShiftRequests SET status = ? WHERE id = UUID_TO_BIN(?)`,
            [status, id]
        );
        
        // Handle approved status actions
        if (status === 'Approved') {
            if (shiftRequest.request_type === 'swap' && shiftRequest.swap_staff_id) {
                // For swap requests, handle the staff swap
                
                // First, get the swap staff details
                const [swapStaff] = await db.query(
                    `SELECT BIN_TO_UUID(id) as id, firstname, lastname
                     FROM Users WHERE id = UUID_TO_BIN(?)`,
                    [shiftRequest.swap_staff_id]
                );
                
                if (swapStaff.length > 0) {
                    // Update the schedule to assign it to the swap staff
                    await db.query(
                        `UPDATE Schedules SET physiotherapist_id = UUID_TO_BIN(?),
                         comments = CONCAT(IFNULL(comments, ''), ' [Swapped with ${swapStaff[0].firstname} ${swapStaff[0].lastname}]')
                         WHERE id = UUID_TO_BIN(?)`,
                        [shiftRequest.swap_staff_id, shiftRequest.schedule_id]
                    );
                    
                    // Notify the swap staff member
                    await Notification.create({
                        user_id: shiftRequest.swap_staff_id,
                        message: `You have been assigned to a shift on ${new Date(shiftRequest.schedule.shift_date).toLocaleDateString()} (${shiftRequest.schedule.start_time} - ${shiftRequest.schedule.end_time}) as part of a swap request`
                    });
                }
            } else {
                // For non-swap requests (cover), update the schedule status to Cancelled
                if (shiftRequest.schedule.status === 'Scheduled') {
                    await db.query(
                        `UPDATE Schedules SET status = 'Cancelled' WHERE id = UUID_TO_BIN(?)`,
                        [shiftRequest.schedule_id]
                    );
                }
            }
        }
        
        // Create appropriate notification messages
        let notificationMessage = '';
        
        if (shiftRequest.request_type === 'swap') {
            notificationMessage = `Your shift swap request for ${new Date(shiftRequest.schedule.shift_date).toLocaleDateString()} has been ${status.toLowerCase()}.`;
        } else {
            notificationMessage = `Your shift cover request for ${new Date(shiftRequest.schedule.shift_date).toLocaleDateString()} has been ${status.toLowerCase()}.`;
        }
        
        // Notify the physiotherapist about the status update
        await Notification.create({
            user_id: shiftRequest.physiotherapist_id,
            message: notificationMessage
        });
        
        // Log shift request status update
        logger.info(`Shift request ${id} updated to status ${status} by user ${req.session.user.id}`);
        
        // Create audit log entry
        await db.query(
            `INSERT INTO AuditLogs (id, user_id, action, details, ip_address)
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)`,
            [uuidv4(), req.session.user.id, 'Shift Request Updated', 
             `Updated ${shiftRequest.request_type || 'cover'} request ${id} status to ${status}`, req.ip]
        );
        
        // Get updated shift request
        const updatedShiftRequest = await ShiftRequest.getById(id);
        
        res.status(200).json(updatedShiftRequest);
    } catch (error) {
        logger.error('Update shift request status error:', error);
        res.status(500).json({ error: 'Failed to update shift request status' });
    }
}

/**
 * Delete a shift request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function deleteShiftRequest(req, res) {
    try {
        const { id } = req.params;
        
        // Get existing shift request
        const shiftRequest = await ShiftRequest.getById(id);
        
        if (!shiftRequest) {
            return res.status(404).json({ error: 'Shift request not found' });
        }
        
        // Check if user has permission to delete this request
        // Only the physiotherapist who created it or an admin/system admin can delete
        if (req.session.user.id !== shiftRequest.physiotherapist_id) {
            // Check if user is admin or system admin
            const [userRole] = await db.query(
                `SELECT name FROM Roles WHERE id = (
                    SELECT role_id FROM Users WHERE id = UUID_TO_BIN(?)
                )`,
                [req.session.user.id]
            );
            
            if (!['Admin', 'System Admin'].includes(userRole[0]?.name)) {
                return res.status(403).json({ error: 'You do not have permission to delete this shift request' });
            }
        }
        
        // Delete shift request
        await ShiftRequest.delete(id);
        
        // Log shift request deletion
        logger.info(`Shift request ${id} deleted by user ${req.session.user.id}`);
        
        // Create audit log entry
        await db.query(
            `INSERT INTO AuditLogs (id, user_id, action, details, ip_address)
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)`,
            [uuidv4(), req.session.user.id, 'Shift Request Deleted', 
             `Deleted shift request ${id}`, req.ip]
        );
        
        res.status(200).json({ message: 'Shift request deleted successfully' });
    } catch (error) {
        logger.error('Delete shift request error:', error);
        res.status(500).json({ error: 'Failed to delete shift request' });
    }
}

module.exports = {
    getAllShiftRequests,
    getShiftRequestById,
    getCurrentUserShiftRequests,
    getPendingShiftRequestsCount,
    createShiftRequest,
    updateShiftRequestStatus,
    deleteShiftRequest
};
