/**
 * Main server file for UITH Physiotherapy Scheduling System
 */
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const logger = require('./middleware/logger');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('./config/database');
const { seedDummyData } = require('./scripts/seed-dummy-data');

// Import routes
const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedules');
const shiftRequestRoutes = require('./routes/shiftRequests');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create session store
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    port: 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'uith_physiotherapy',
    createDatabaseTable: true
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger.requestLogger);
app.use(express.static(path.join(__dirname)));

// Session configuration
app.use(session({
    key: 'uith_session',
    secret: process.env.SESSION_SECRET || 'uith_physio_secret_key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// API routes
app.use('/api', authRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/shift-requests', shiftRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);

// Initialize database and create default admin user if none exists
async function initializeDatabase() {
    try {
        // Insert default roles if none exist
        const [roles] = await db.query('SELECT COUNT(*) as count FROM `Roles`');
        if (parseInt(roles[0].count) === 0) {
            logger.info('Initializing roles');
            
            // Insert default roles using MySQL syntax
            await db.query(`
                INSERT INTO \`Roles\` (id, name) VALUES 
                (?, ?),
                (?, ?),
                (?, ?)
            `, [
                uuidv4(), 'Admin',
                uuidv4(), 'Physiotherapist',
                uuidv4(), 'System Admin'
            ]);
        }
        
        // Check if admin user exists, if not create default admin
        const [admins] = await db.query(`
            SELECT COUNT(*) as count FROM \`Users\` 
            WHERE role_id = (SELECT id FROM \`Roles\` WHERE name = 'Admin')
        `);
        
        if (parseInt(admins[0].count) === 0) {
            logger.info('Creating default admin user');
            
            // Generate password hash
            const password = 'admin123';
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Get admin role ID
            const [adminRole] = await db.query('SELECT id FROM `Roles` WHERE name = ?', ['Admin']);
            
            // Insert default admin user
            await db.query(`
                INSERT INTO \`Users\` (id, firstname, lastname, email, password_hash, contract_type, role_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                uuidv4(), 'Admin', 'User', 'admin@uith.org', 
                hashedPassword, 'Full-time', adminRole[0].id
            ]);
            
            logger.info('Default admin user created. Email: admin@uith.org, Password: admin123');
        }
    } catch (error) {
        logger.error('Database initialization error:', error);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', reason);
});

module.exports = app;
