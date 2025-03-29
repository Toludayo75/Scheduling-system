/**
 * User Model for UITH Physiotherapy Scheduling System
 */
const db = require('../config/database');
const logger = require('../middleware/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all users
 * @returns {Promise<Array>} - Array of users
 */
async function getAll() {
    try {
        const [users] = await db.query(
            `SELECT u.*, r.name as role_name 
             FROM \`Users\` u
             JOIN \`Roles\` r ON u.role_id = r.id
             ORDER BY u.created_at DESC`
        );
        return users;
    } catch (error) {
        logger.error('Get all users error:', error);
        throw error;
    }
}

/**
 * Get user by ID
 * @param {string} id - User ID
 * @returns {Promise<Object|null>} - User object or null if not found
 */
async function getById(id) {
    try {
        const [users] = await db.query(
            `SELECT u.*, r.name as role_name 
             FROM \`Users\` u
             JOIN \`Roles\` r ON u.role_id = r.id
             WHERE u.id = ?`, 
            [id]
        );
        
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        logger.error('Get user by ID error:', error);
        throw error;
    }
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} - User object or null if not found
 */
async function getByEmail(email) {
    try {
        const [users] = await db.query(
            `SELECT u.*, r.name as role_name 
             FROM \`Users\` u
             JOIN \`Roles\` r ON u.role_id = r.id
             WHERE u.email = ?`, 
            [email]
        );
        
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        logger.error('Get user by email error:', error);
        throw error;
    }
}

/**
 * Get users by role
 * @param {string} roleName - Role name
 * @returns {Promise<Array>} - Array of users
 */
async function getByRole(roleName) {
    try {
        const [users] = await db.query(
            `SELECT u.*, r.name as role_name 
             FROM \`Users\` u
             JOIN \`Roles\` r ON u.role_id = r.id
             WHERE r.name = ?
             ORDER BY u.firstname, u.lastname`, 
            [roleName]
        );
        
        return users;
    } catch (error) {
        logger.error('Get users by role error:', error);
        throw error;
    }
}

/**
 * Get count of users by role
 * @param {string} roleName - Role name
 * @returns {Promise<number>} - Count of users
 */
async function getCountByRole(roleName) {
    try {
        const [result] = await db.query(
            `SELECT COUNT(*) as count 
             FROM \`Users\` u
             JOIN \`Roles\` r ON u.role_id = r.id
             WHERE r.name = ?`, 
            [roleName]
        );
        
        return parseInt(result[0].count);
    } catch (error) {
        logger.error('Get count of users by role error:', error);
        throw error;
    }
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Created user
 */
async function create(userData) {
    try {
        // Generate UUID
        const userId = uuidv4();
        
        // Insert user
        const [result] = await db.query(
            `INSERT INTO \`Users\` (
                id, firstname, lastname, email, password_hash, 
                contract_type, role_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [
                userId,
                userData.firstname,
                userData.lastname,
                userData.email,
                userData.password_hash,
                userData.contract_type,
                userData.role_id
            ]
        );
        
        // Get created user with role
        const user = await getById(userId);
        return user;
    } catch (error) {
        logger.error('Create user error:', error);
        throw error;
    }
}

/**
 * Update user
 * @param {string} id - User ID
 * @param {Object} userData - User data to update
 * @returns {Promise<Object>} - Updated user
 */
async function update(id, userData) {
    try {
        const fieldsToUpdate = {};
        
        // Only update provided fields
        if (userData.firstname) fieldsToUpdate.firstname = userData.firstname;
        if (userData.lastname) fieldsToUpdate.lastname = userData.lastname;
        if (userData.email) fieldsToUpdate.email = userData.email;
        if (userData.password_hash) fieldsToUpdate.password_hash = userData.password_hash;
        if (userData.contract_type) fieldsToUpdate.contract_type = userData.contract_type;
        if (userData.role_id) fieldsToUpdate.role_id = userData.role_id;
        
        // If no fields to update, return existing user
        if (Object.keys(fieldsToUpdate).length === 0) {
            return await getById(id);
        }
        
        // Build SET clause and values array
        const setClause = Object.keys(fieldsToUpdate)
            .map(key => `${key} = ?`)
            .join(', ');
        
        const values = [...Object.values(fieldsToUpdate), id];
        
        // Update user
        await db.query(
            `UPDATE \`Users\` SET ${setClause} WHERE id = ?`,
            values
        );
        
        // Get updated user
        const updatedUser = await getById(id);
        return updatedUser;
    } catch (error) {
        logger.error('Update user error:', error);
        throw error;
    }
}

/**
 * Delete user
 * @param {string} id - User ID
 * @returns {Promise<boolean>} - True if user was deleted
 */
async function deleteUser(id) {
    try {
        // Check for related records
        const [schedules] = await db.query(
            `SELECT COUNT(*) as count FROM \`Schedules\` WHERE physiotherapist_id = ?`,
            [id]
        );
        
        const [shiftRequests] = await db.query(
            `SELECT COUNT(*) as count FROM \`ShiftRequests\` WHERE physiotherapist_id = ?`,
            [id]
        );
        
        // If user has related records, don't delete but mark as inactive (not implemented yet)
        if (parseInt(schedules[0].count) > 0 || parseInt(shiftRequests[0].count) > 0) {
            throw new Error('Cannot delete user with related records');
        }
        
        // Delete user's notifications
        await db.query(
            `DELETE FROM \`Notifications\` WHERE user_id = ?`,
            [id]
        );
        
        // Delete user
        const [result] = await db.query(
            `DELETE FROM \`Users\` WHERE id = ?`,
            [id]
        );
        
        return result.affectedRows > 0;
    } catch (error) {
        logger.error('Delete user error:', error);
        throw error;
    }
}

module.exports = {
    getAll,
    getById,
    getByEmail,
    getByRole,
    getCountByRole,
    create,
    update,
    delete: deleteUser
};