/**
 * Logger Middleware for UITH Physiotherapy Scheduling System
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Create logger with console and file transports
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'uith-physio' },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(
                    info => `${info.timestamp} ${info.level}: ${info.message}`
                )
            )
        }),
        // File transport for all logs
        new winston.transports.File({ 
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // File transport for error logs
        new winston.transports.File({ 
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

/**
 * Middleware to log HTTP requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requestLogger(req, res, next) {
    // Original end function
    const originalEnd = res.end;
    const startTime = Date.now();
    
    // Override end function to log request after response is sent
    res.end = function(...args) {
        // Restore original end function
        res.end = originalEnd;
        
        // Call original end function
        res.end(...args);
        
        // Calculate response time
        const responseTime = Date.now() - startTime;
        
        // Log request details
        const userId = req.session?.user?.id || 'anonymous';
        const method = req.method;
        const url = req.originalUrl || req.url;
        const status = res.statusCode;
        const userAgent = req.get('user-agent') || '-';
        const ip = req.ip || req.connection.remoteAddress;
        
        logger.info(`[${method}] ${url} ${status} ${responseTime}ms - ${userId} - ${ip} - ${userAgent}`);
    };
    
    next();
}

module.exports = {
    info: logger.info.bind(logger),
    error: logger.error.bind(logger),
    warn: logger.warn.bind(logger),
    debug: logger.debug.bind(logger),
    requestLogger
};
