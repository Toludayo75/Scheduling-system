/**
 * Authentication Middleware for UITH Physiotherapy Scheduling System
 */
const logger = require('./logger');

/**
 * Middleware to check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function isAuthenticated(req, res, next) {
    try {
        if (req.session && req.session.user) {
            return next();
        } else {
            return res.status(401).json({ error: 'Authentication required' });
        }
    } catch (error) {
        logger.error('Authentication middleware error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Middleware to check if user is not authenticated (for login/register routes)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function isNotAuthenticated(req, res, next) {
    try {
        if (req.session && req.session.user) {
            return res.status(400).json({ error: 'Already authenticated' });
        } else {
            return next();
        }
    } catch (error) {
        logger.error('Not authenticated middleware error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Middleware to log user activity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function logUserActivity(req, res, next) {
    try {
        // Only log activity for authenticated users
        if (req.session && req.session.user) {
            // Original end function
            const originalEnd = res.end;
            
            // Override end function to log activity after response is sent
            res.end = function(...args) {
                // Restore original end function
                res.end = originalEnd;
                
                // Call original end function
                res.end(...args);
                
                // Log activity based on method and status code
                const { method, originalUrl } = req;
                const { statusCode } = res;
                
                // Don't log GET requests to avoid excessive logging
                if (method !== 'GET') {
                    logger.info(`User Activity: ${req.session.user.email} - ${method} ${originalUrl} - Status: ${statusCode}`);
                }
            };
        }
        
        next();
    } catch (error) {
        logger.error('Log user activity middleware error:', error);
        next();
    }
}

module.exports = {
    isAuthenticated,
    isNotAuthenticated,
    logUserActivity
};
