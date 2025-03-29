/**
 * Role Model for UITH Physiotherapy Scheduling System
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../middleware/logger');

/**
 * Get all roles
 * @returns {Promise<Array>} - Array of roles
 */
async function getAll() {
    try {
        const [roles] = await db.query(
            `SELECT BIN_TO_UUID(id) as id, name, created_at
             FROM Roles
             ORDER BY name`
        );
        
        return roles;
    } catch (error) {
        logger.error('Get all roles error:', error);
        throw error;
    }
}

/**
 * Get role by ID
 * @param {string} id - Role ID
 * @returns {Promise<Object|null>} - Role object or null if not found
 */
async function getById(id) {
    try {
        const [roles] = await db.query(
            `SELECT BIN_TO_UUID(id) as id, name, created_at
             FROM Roles
             WHERE id = UUID_TO_BIN(?)`,
            [id]
        );
        
        return roles.length ? roles[0] : null;
    } catch (error) {
        logger.error('Get role by ID error:', error);
        throw error;
    }
}

/**
 * Get role by name
 * @param {string} name - Role name
 * @returns {Promise<Object|null>} - Role object or null if not found
 */
async function getByName(name) {
    try {
        const [roles] = await db.query(
            `SELECT BIN_TO_UUID(id) as id, name, created_at
             FROM Roles
             WHERE name = ?`,
            [name]
        );
        
        return roles.length ? roles[0] : null;
    } catch (error) {
        logger.error('Get role by name error:', error);
        throw error;
    }
}

/**
 * Create a new role
 * @param {Object} roleData - Role data
 * @returns {Promise<Object>} - Created role
 */
async function create(roleData) {
    try {
        const { name } = roleData;
        
        const roleId = uuidv4();
        await db.query(
            `INSERT INTO Roles (id, name) 
             VALUES (UUID_TO_BIN(?), ?)`,
            [roleId, name]
        );
        
        return getById(roleId);
    } catch (error) {
        logger.error('Create role error:', error);
        throw error;
    }
}

/**
 * Update role
 * @param {string} id - Role ID
 * @param {Object} roleData - Role data to update
 * @returns {Promise<Object>} - Updated role
 */
async function update(id, roleData) {
    try {
        const { name } = roleData;
        
        await db.query(
            `UPDATE Roles 
             SET name = ? 
             WHERE id = UUID_TO_BIN(?)`,
            [name, id]
        );
        
        return getById(id);
    } catch (error) {
        logger.error('Update role error:', error);
        throw error;
    }
}

/**
 * Delete role
 * @param {string} id - Role ID
 * @returns {Promise<boolean>} - True if role was deleted
 */
async function deleteRole(id) {
    try {
        // Check if role is being used by any users
        const [usersWithRole] = await db.query(
            `SELECT COUNT(*) as count 
             FROM Users 
             WHERE role_id = UUID_TO_BIN(?)`,
            [id]
        );
        
        if (usersWithRole[0].count > 0) {
            throw new Error('Cannot delete role that is assigned to users');
        }
        
        const [result] = await db.query(
            `DELETE FROM Roles WHERE id = UUID_TO_BIN(?)`,
            [id]
        );
        
        return result.affectedRows > 0;
    } catch (error) {
        logger.error('Delete role error:', error);
        throw error;
    }
}

module.exports = {
    getAll,
    getById,
    getByName,
    create,
    update,
    delete: deleteRole
};
