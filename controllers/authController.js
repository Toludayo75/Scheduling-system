/**
 * Authentication Controller for UITH Physiotherapy Scheduling System
 */
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../middleware/logger');
const User = require('../models/userModel');

/**
 * Register a new user - Only accessible to Admin and System Admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function register(req, res) {
    try {
        // Check if user is authenticated and has admin privileges
        if (!req.session.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Get role name for the authenticated user
        const [creatorRole] = await db.query(
            'SELECT name FROM "Roles" WHERE id = $1::uuid',
            [req.session.user.role_id]
        );
        
        // Only Admin or System Admin can create new users
        if (!['Admin', 'System Admin'].includes(creatorRole[0]?.name)) {
            return res.status(403).json({ error: 'Only administrators can create new users' });
        }
        
        const { firstname, lastname, email, password, contract_type, role_id } = req.body;
        
        // Validate required fields
        if (!firstname || !lastname || !email || !password || !contract_type) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        
        // Validate contract type
        if (contract_type !== 'Full-time' && contract_type !== 'Part-time') {
            return res.status(400).json({ error: 'Contract type must be Full-time or Part-time' });
        }
        
        // Check if user already exists
        const [existingUsers] = await db.query(
            'SELECT * FROM "Users" WHERE email = $1',
            [email]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Determine role based on input
        let userRoleId = role_id;
        
        // If role_id is not provided, default to Physiotherapist
        if (!userRoleId) {
            const [physioRole] = await db.query(
                'SELECT id FROM "Roles" WHERE name = $1',
                ['Physiotherapist']
            );
            userRoleId = physioRole[0].id;
        }
        
        // Create new user
        const userId = uuidv4();
        await db.query(
            `INSERT INTO "Users" (id, firstname, lastname, email, password_hash, contract_type, role_id) 
             VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::uuid)`,
            [userId, firstname, lastname, email, hashedPassword, contract_type, userRoleId]
        );
        
        // Get created user (without password)
        const [users] = await db.query(
            `SELECT id, firstname, lastname, email, contract_type, 
             role_id, created_at
             FROM "Users" WHERE id = $1::uuid`,
            [userId]
        );
        
        // Get role name for audit log
        const [roleInfo] = await db.query(
            'SELECT name FROM "Roles" WHERE id = $1::uuid',
            [userRoleId]
        );
        const roleName = roleInfo[0]?.name || 'Physiotherapist';
        
        // Log user creation with admin info
        logger.info(`New user created by admin ${req.session.user.email}: ${email} (${roleName})`);
        
        // Create audit log entry
        await db.query(
            `INSERT INTO "AuditLogs" (id, user_id, action, details, ip_address)
             VALUES ($1::uuid, $2::uuid, $3, $4, $5)`,
            [
                uuidv4(), 
                req.session.user.id, 
                'User Created', 
                `Created user ${email} with role ${roleName}`,
                req.ip
            ]
        );
        
        // Return user
        res.status(201).json(users[0]);
    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
}

/**
 * Login a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;
        
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Get user by email
        const [users] = await db.query(
            `SELECT u.id, u.firstname, u.lastname, u.email, u.password_hash, 
             u.contract_type, u.role_id, r.name as role_name, u.created_at
             FROM "Users" u
             JOIN "Roles" r ON u.role_id = r.id
             WHERE u.email = $1`,
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Set session
        req.session.user = {
            id: user.id,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            role_id: user.role_id,
            role_name: user.role_name
        };
        
        // Log login
        logger.info(`User logged in: ${email}`);
        
        // Create audit log entry
        await db.query(
            `INSERT INTO "AuditLogs" (id, user_id, action, ip_address)
             VALUES ($1::uuid, $2::uuid, $3, $4)`,
            [uuidv4(), user.id, 'User Login', req.ip]
        );
        
        // Return user without password
        const userResponse = { ...user };
        delete userResponse.password_hash;
        
        res.status(200).json(userResponse);
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Failed to log in' });
    }
}

/**
 * Logout a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function logout(req, res) {
    try {
        if (req.session.user) {
            const userId = req.session.user.id;
            
            // Create audit log entry
            await db.query(
                `INSERT INTO "AuditLogs" (id, user_id, action, ip_address)
                 VALUES ($1::uuid, $2::uuid, $3, $4)`,
                [uuidv4(), userId, 'User Logout', req.ip]
            );
            
            // Log logout
            logger.info(`User logged out: ${req.session.user.email}`);
        }
        
        // Destroy session
        req.session.destroy(err => {
            if (err) {
                logger.error('Session destruction error:', err);
                return res.status(500).json({ error: 'Failed to log out' });
            }
            
            res.clearCookie('uith_session');
            res.status(200).json({ message: 'Logged out successfully' });
        });
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to log out' });
    }
}

/**
 * Get current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getCurrentUser(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        // Get user from database to ensure latest data
        const user = await User.getById(req.session.user.id);
        
        if (!user) {
            // User not found (might have been deleted)
            req.session.destroy();
            return res.status(401).json({ error: 'User not found' });
        }
        
        res.status(200).json(user);
    } catch (error) {
        logger.error('Get current user error:', error);
        res.status(500).json({ error: 'Failed to get current user' });
    }
}

/**
 * Change password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function changePassword(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { currentPassword, newPassword } = req.body;
        
        // Validate required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        
        // Get user from database
        const [users] = await db.query(
            `SELECT password_hash FROM "Users" WHERE id = $1::uuid`,
            [req.session.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Compare current password
        const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
        
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update password
        await db.query(
            `UPDATE "Users" SET password_hash = $1 WHERE id = $2::uuid`,
            [hashedPassword, req.session.user.id]
        );
        
        // Log password change
        logger.info(`Password changed for user: ${req.session.user.email}`);
        
        // Create audit log entry
        await db.query(
            `INSERT INTO "AuditLogs" (id, user_id, action, ip_address)
             VALUES ($1::uuid, $2::uuid, $3, $4)`,
            [uuidv4(), req.session.user.id, 'Password Change', req.ip]
        );
        
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        logger.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
}

module.exports = {
    register,
    login,
    logout,
    getCurrentUser,
    changePassword
};
