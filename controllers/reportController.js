/**
 * Report Controller for UITH Physiotherapy Scheduling System
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../middleware/logger');
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;

/**
 * Get staff workload report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getStaffWorkloadReport(req, res) {
    try {
        const { start, end } = req.query;
        
        // Validate required parameters
        if (!start || !end) {
            return res.status(400).json({ error: 'Start and end dates are required' });
        }
        
        // Format dates to validate
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }
        
        // Get staff workload for the specified date range
        const [workload] = await db.query(
            `SELECT 
                BIN_TO_UUID(u.id) as id,
                u.firstname,
                u.lastname,
                u.contract_type,
                COUNT(s.id) as total_shifts,
                SUM(TIMESTAMPDIFF(HOUR, CONCAT(s.shift_date, ' ', s.start_time), CONCAT(s.shift_date, ' ', s.end_time))) as total_hours
             FROM 
                Users u
             LEFT JOIN 
                Schedules s ON u.id = s.physiotherapist_id
             WHERE 
                s.shift_date BETWEEN ? AND ?
                AND s.status IN ('Scheduled', 'Completed')
                AND u.role_id = (SELECT id FROM Roles WHERE name = 'Physiotherapist')
             GROUP BY 
                u.id, u.firstname, u.lastname, u.contract_type
             ORDER BY 
                total_hours DESC`,
            [start, end]
        );
        
        // Get target hours based on contract type
        const dateRange = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const workDays = Math.floor(dateRange * 5 / 7); // Approximating work days (excluding weekends)
        
        // Add target hours and completion percentage
        const report = workload.map(staff => {
            const targetHours = staff.contract_type === 'Full-time' ? workDays * 8 : workDays * 4;
            const completionPercentage = targetHours > 0 ? Math.round((staff.total_hours / targetHours) * 100) : 0;
            
            return {
                ...staff,
                target_hours: targetHours,
                completion_percentage: completionPercentage
            };
        });
        
        // Create audit log entry
        await db.query(
            `INSERT INTO AuditLogs (id, user_id, action, details, ip_address)
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)`,
            [uuidv4(), req.session.user.id, 'Report Generated', 
             `Generated staff workload report for ${start} to ${end}`, req.ip]
        );
        
        res.status(200).json(report);
    } catch (error) {
        logger.error('Get staff workload report error:', error);
        res.status(500).json({ error: 'Failed to generate staff workload report' });
    }
}

/**
 * Get shift requests report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getShiftRequestsReport(req, res) {
    try {
        const { start, end } = req.query;
        
        // Validate required parameters
        if (!start || !end) {
            return res.status(400).json({ error: 'Start and end dates are required' });
        }
        
        // Format dates to validate
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }
        
        // Get shift requests statistics for the specified date range
        const [requests] = await db.query(
            `SELECT 
                BIN_TO_UUID(u.id) as id,
                u.firstname,
                u.lastname,
                COUNT(sr.id) as total_requests,
                SUM(CASE WHEN sr.status = 'Approved' THEN 1 ELSE 0 END) as approved_requests,
                SUM(CASE WHEN sr.status = 'Rejected' THEN 1 ELSE 0 END) as rejected_requests,
                SUM(CASE WHEN sr.status = 'Pending' THEN 1 ELSE 0 END) as pending_requests
             FROM 
                Users u
             LEFT JOIN 
                ShiftRequests sr ON u.id = sr.physiotherapist_id
             WHERE 
                sr.created_at BETWEEN ? AND ?
                AND u.role_id = (SELECT id FROM Roles WHERE name = 'Physiotherapist')
             GROUP BY 
                u.id, u.firstname, u.lastname
             ORDER BY 
                total_requests DESC`,
            [start, end]
        );
        
        // Calculate approval rate
        const report = requests.map(staff => {
            const approvalRate = staff.total_requests > 0 
                ? Math.round((staff.approved_requests / staff.total_requests) * 100) 
                : 0;
            
            return {
                ...staff,
                approval_rate: approvalRate
            };
        });
        
        // Create audit log entry
        await db.query(
            `INSERT INTO AuditLogs (id, user_id, action, details, ip_address)
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)`,
            [uuidv4(), req.session.user.id, 'Report Generated', 
             `Generated shift requests report for ${start} to ${end}`, req.ip]
        );
        
        res.status(200).json(report);
    } catch (error) {
        logger.error('Get shift requests report error:', error);
        res.status(500).json({ error: 'Failed to generate shift requests report' });
    }
}

/**
 * Get system usage report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSystemUsageReport(req, res) {
    try {
        const { start, end } = req.query;
        
        // Validate required parameters
        if (!start || !end) {
            return res.status(400).json({ error: 'Start and end dates are required' });
        }
        
        // Format dates to validate
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }
        
        // Get audit logs for the specified date range
        const [logs] = await db.query(
            `SELECT 
                DATE(al.created_at) as date,
                COUNT(al.id) as total_actions,
                COUNT(DISTINCT al.user_id) as unique_users,
                SUM(CASE WHEN al.action = 'User Login' THEN 1 ELSE 0 END) as logins,
                SUM(CASE WHEN al.action = 'Schedule Created' THEN 1 ELSE 0 END) as schedules_created,
                SUM(CASE WHEN al.action = 'Shift Request Created' THEN 1 ELSE 0 END) as requests_created
             FROM 
                AuditLogs al
             WHERE 
                al.created_at BETWEEN ? AND ?
             GROUP BY 
                DATE(al.created_at)
             ORDER BY 
                date`,
            [start, end]
        );
        
        // Get most active users
        const [activeUsers] = await db.query(
            `SELECT 
                BIN_TO_UUID(u.id) as id,
                u.firstname,
                u.lastname,
                COUNT(al.id) as action_count
             FROM 
                Users u
             JOIN 
                AuditLogs al ON u.id = al.user_id
             WHERE 
                al.created_at BETWEEN ? AND ?
             GROUP BY 
                u.id, u.firstname, u.lastname
             ORDER BY 
                action_count DESC
             LIMIT 5`,
            [start, end]
        );
        
        // Get most common actions
        const [commonActions] = await db.query(
            `SELECT 
                al.action,
                COUNT(al.id) as count
             FROM 
                AuditLogs al
             WHERE 
                al.created_at BETWEEN ? AND ?
             GROUP BY 
                al.action
             ORDER BY 
                count DESC
             LIMIT 5`,
            [start, end]
        );
        
        // Compile report
        const report = {
            daily_activity: logs,
            most_active_users: activeUsers,
            most_common_actions: commonActions,
            summary: {
                total_actions: logs.reduce((sum, day) => sum + day.total_actions, 0),
                total_logins: logs.reduce((sum, day) => sum + day.logins, 0),
                total_schedules_created: logs.reduce((sum, day) => sum + day.schedules_created, 0),
                total_requests_created: logs.reduce((sum, day) => sum + day.requests_created, 0),
                date_range: {
                    start,
                    end
                }
            }
        };
        
        // Create audit log entry
        await db.query(
            `INSERT INTO AuditLogs (id, user_id, action, details, ip_address)
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)`,
            [uuidv4(), req.session.user.id, 'Report Generated', 
             `Generated system usage report for ${start} to ${end}`, req.ip]
        );
        
        res.status(200).json(report);
    } catch (error) {
        logger.error('Get system usage report error:', error);
        res.status(500).json({ error: 'Failed to generate system usage report' });
    }
}

/**
 * Get system statistics (for system admin dashboard)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSystemStats(req, res) {
    try {
        // Get users count by role
        const [userCounts] = await db.query(
            `SELECT 
                r.name as role_name,
                COUNT(u.id) as count
             FROM 
                Roles r
             LEFT JOIN 
                Users u ON r.id = u.role_id
             GROUP BY 
                r.name`
        );
        
        // Get total schedules count
        const [scheduleCount] = await db.query('SELECT COUNT(*) as count FROM Schedules');
        
        // Get total shift requests count
        const [requestCount] = await db.query('SELECT COUNT(*) as count FROM ShiftRequests');
        
        // Get error logs count (last 30 days)
        const [errorLogCount] = await db.query(
            `SELECT COUNT(*) as count FROM AuditLogs 
             WHERE action LIKE '%Error%' AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`
        );
        
        // Get active users count (last 7 days)
        const [activeUsersCount] = await db.query(
            `SELECT COUNT(DISTINCT user_id) as count FROM AuditLogs 
             WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`
        );
        
        // Compile statistics
        const stats = {
            users: userCounts.reduce((sum, role) => sum + role.count, 0),
            adminUsers: userCounts.find(r => r.role_name === 'Admin')?.count || 0,
            physioUsers: userCounts.find(r => r.role_name === 'Physiotherapist')?.count || 0,
            sysadminUsers: userCounts.find(r => r.role_name === 'System Admin')?.count || 0,
            schedules: scheduleCount[0].count,
            requests: requestCount[0].count,
            errorLogs: errorLogCount[0].count,
            activeUsers: activeUsersCount[0].count
        };
        
        res.status(200).json(stats);
    } catch (error) {
        logger.error('Get system stats error:', error);
        res.status(500).json({ error: 'Failed to get system statistics' });
    }
}

/**
 * Export data to CSV
 * @param {Array} data - Array of objects to export
 * @param {Array} headers - Array of header objects with id and title properties
 * @param {Object} res - Express response object
 * @param {string} filename - Filename for the CSV
 */
function exportToCsv(data, headers, res, filename) {
    try {
        // Create CSV
        const csvStringifier = createCsvStringifier({ header: headers });
        
        const csvHeader = csvStringifier.getHeaderString();
        const csvBody = csvStringifier.stringifyRecords(data);
        const csvContent = csvHeader + csvBody;
        
        // Set response headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        return res.send(csvContent);
    } catch (error) {
        logger.error('Export to CSV error:', error);
        throw error;
    }
}

module.exports = {
    getStaffWorkloadReport,
    getShiftRequestsReport,
    getSystemUsageReport,
    getSystemStats,
    exportToCsv
};
