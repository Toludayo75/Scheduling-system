/**
 * Role Check Middleware for UITH Physiotherapy Scheduling System
 */
const db = require('../config/database');
const logger = require('./logger');

/**
 * Middleware to check if user has specified role
 * @param {string|string[]} roles - Role name(s) to check
 * @returns {Function} - Express middleware function
 */
function hasRole(roles) {
    return async (req, res, next) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            
            // Convert single role to array
            const allowedRoles = Array.isArray(roles) ? roles : [roles];
            
            // Get user's role from database
            const [userRoles] = await db.query(
                `SELECT r.name 
                 FROM "Roles" r 
                 JOIN "Users" u ON r.id = u.role_id 
                 WHERE u.id = $1::uuid`,
                [req.session.user.id]
            );
            
            if (userRoles.length === 0) {
                logger.warn(`Role check failed: User ${req.session.user.id} has no role`);
                return res.status(403).json({ error: 'Access denied' });
            }
            
            const userRole = userRoles[0].name;
            
            if (allowedRoles.includes(userRole)) {
                return next();
            } else {
                logger.warn(`Role check failed: User ${req.session.user.id} with role ${userRole} attempted to access resource requiring ${roles}`);
                return res.status(403).json({ error: 'Access denied' });
            }
        } catch (error) {
            logger.error('Role check middleware error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
}

/**
 * Middleware to check if user is an administrator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function isAdmin(req, res, next) {
    return hasRole(['Admin', 'System Admin'])(req, res, next);
}

/**
 * Middleware to check if user is a system administrator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function isSystemAdmin(req, res, next) {
    return hasRole('System Admin')(req, res, next);
}

/**
 * Middleware to check if user is a physiotherapist
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function isPhysiotherapist(req, res, next) {
    return hasRole('Physiotherapist')(req, res, next);
}

/**
 * Middleware to check if user is accessing their own resource
 * @param {Function} getResourceUserId - Function to extract the resource user ID from the request
 * @returns {Function} - Express middleware function
 */
function isOwnResource(getResourceUserId) {
    return async (req, res, next) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            
            const resourceUserId = await getResourceUserId(req);
            
            // If no resource user ID is found, proceed
            if (!resourceUserId) {
                return next();
            }
            
            // Check if user is admin or system admin
            const [userRoles] = await db.query(
                `SELECT r.name 
                 FROM "Roles" r 
                 JOIN "Users" u ON r.id = u.role_id 
                 WHERE u.id = $1::uuid`,
                [req.session.user.id]
            );
            
            const userRole = userRoles[0]?.name;
            
            // Admins and system admins can access any resource
            if (['Admin', 'System Admin'].includes(userRole)) {
                return next();
            }
            
            // Otherwise, check if the resource belongs to the user
            if (req.session.user.id === resourceUserId) {
                return next();
            } else {
                logger.warn(`Own resource check failed: User ${req.session.user.id} attempted to access resource ${resourceUserId}`);
                return res.status(403).json({ error: 'Access denied' });
            }
        } catch (error) {
            logger.error('Own resource middleware error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
}

module.exports = {
    hasRole,
    isAdmin,
    isSystemAdmin,
    isPhysiotherapist,
    isOwnResource
};
