/**
 * User Controller for UITH Physiotherapy Scheduling System
 */
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const logger = require('../middleware/logger');
const User = require('../models/userModel');
const Role = require('../models/roleModel');

/**
 * Get all users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllUsers(req, res) {
    try {
        const users = await User.getAll();
        res.status(200).json(users);
    } catch (error) {
        logger.error('Get all users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
}

/**
 * Get user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserById(req, res) {
    try {
        const { id } = req.params;
        const user = await User.getById(id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.status(200).json(user);
    } catch (error) {
        logger.error('Get user by ID error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
}

/**
 * Get all physiotherapists
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getPhysiotherapists(req, res) {
    try {
        const physiotherapists = await User.getByRole('Physiotherapist');
        res.status(200).json(physiotherapists);
    } catch (error) {
        logger.error('Get physiotherapists error:', error);
        res.status(500).json({ error: 'Failed to get physiotherapists' });
    }
}

/**
 * Get count of physiotherapists
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getPhysiotherapistsCount(req, res) {
    try {
        const count = await User.getCountByRole('Physiotherapist');
        res.status(200).json({ count });
    } catch (error) {
        logger.error('Get physiotherapists count error:', error);
        res.status(500).json({ error: 'Failed to get physiotherapists count' });
    }
}

/**
 * Create a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createUser(req, res) {
    try {
        const { firstname, lastname, email, password, contract_type, role_id } = req.body;
        
        // Validate required fields
        if (!firstname || !lastname || !email || !password || !contract_type || !role_id) {
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
            'SELECT * FROM Users WHERE email = ?',
            [email]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create user
        const userId = uuidv4();
        await db.query(
            `INSERT INTO Users (id, firstname, lastname, email, password_hash, contract_type, role_id) 
             VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, UUID_TO_BIN(?))`,
            [userId, firstname, lastname, email, hashedPassword, contract_type, role_id]
        );
        
        // Get created user (without password)
        const [users] = await db.query(
            `SELECT BIN_TO_UUID(id) as id, firstname, lastname, email, contract_type, 
             BIN_TO_UUID(role_id) as role_id, created_at
             FROM Users WHERE id = UUID_TO_BIN(?)`,
            [userId]
        );
        
        // Log user creation
        logger.info(`User ${email} created by ${req.session.user.email}`);
        
        // Create audit log entry
        await db.query(
            `INSERT INTO AuditLogs (id, user_id, action, details, ip_address)
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)`,
            [uuidv4(), req.session.user.id, 'User Created', 
             `Created user ${firstname} ${lastname} (${email})`, req.ip]
        );
        
        res.status(201).json(users[0]);
    } catch (error) {
        logger.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
}

/**
 * Update user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { firstname, lastname, email, password, contract_type, role_id } = req.body;
        
        // Get existing user
        const user = await User.getById(id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if email is being changed and if it already exists
        if (email && email !== user.email) {
            const [existingUsers] = await db.query(
                'SELECT * FROM Users WHERE email = ? AND id != UUID_TO_BIN(?)',
                [email, id]
            );
            
            if (existingUsers.length > 0) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }
        }
        
        // Prepare update data
        const updateData = {};
        
        if (firstname) updateData.firstname = firstname;
        if (lastname) updateData.lastname = lastname;
        if (email) updateData.email = email;
        if (contract_type) {
            // Validate contract type
            if (contract_type !== 'Full-time' && contract_type !== 'Part-time') {
                return res.status(400).json({ error: 'Contract type must be Full-time or Part-time' });
            }
            updateData.contract_type = contract_type;
        }
        if (role_id) updateData.role_id = db.pool.raw(`UUID_TO_BIN('${role_id}')`);
        
        // Hash password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updateData.password_hash = hashedPassword;
        }
        
        // Update user
        if (Object.keys(updateData).length > 0) {
            // Handle role_id specially because of the UUID conversion
            let roleIdValue = null;
            if (updateData.role_id) {
                roleIdValue = role_id;
                delete updateData.role_id;
            }
            
            let query = 'UPDATE Users SET ';
            const queryParams = [];
            
            // Add regular fields to query
            Object.entries(updateData).forEach(([key, value], index) => {
                query += `${key} = ?`;
                queryParams.push(value);
                if (index < Object.keys(updateData).length - 1 || roleIdValue) {
                    query += ', ';
                }
            });
            
            // Add role_id to query if it exists
            if (roleIdValue) {
                query += 'role_id = UUID_TO_BIN(?)';
                queryParams.push(roleIdValue);
            }
            
            // Add WHERE clause
            query += ' WHERE id = UUID_TO_BIN(?)';
            queryParams.push(id);
            
            // Execute update query
            await db.query(query, queryParams);
        }
        
        // Get updated user
        const updatedUser = await User.getById(id);
        
        // Log user update
        logger.info(`User ${id} updated by ${req.session.user.email}`);
        
        // Create audit log entry
        await db.query(
            `INSERT INTO AuditLogs (id, user_id, action, details, ip_address)
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)`,
            [uuidv4(), req.session.user.id, 'User Updated', 
             `Updated user ${id}`, req.ip]
        );
        
        res.status(200).json(updatedUser);
    } catch (error) {
        logger.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
}

/**
 * Delete user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        
        // Get existing user
        const user = await User.getById(id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if trying to delete self
        if (id === req.session.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own account' });
        }
        
        // Delete user
        await User.delete(id);
        
        // Log user deletion
        logger.info(`User ${id} deleted by ${req.session.user.email}`);
        
        // Create audit log entry
        await db.query(
            `INSERT INTO AuditLogs (id, user_id, action, details, ip_address)
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)`,
            [uuidv4(), req.session.user.id, 'User Deleted', 
             `Deleted user ${id} (${user.email})`, req.ip]
        );
        
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        logger.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
}

/**
 * Get user roles
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getRoles(req, res) {
    try {
        const roles = await Role.getAll();
        res.status(200).json(roles);
    } catch (error) {
        logger.error('Get roles error:', error);
        res.status(500).json({ error: 'Failed to get roles' });
    }
}

module.exports = {
    getAllUsers,
    getUserById,
    getPhysiotherapists,
    getPhysiotherapistsCount,
    createUser,
    updateUser,
    deleteUser,
    getRoles
};
