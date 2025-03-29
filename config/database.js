/**
 * Database configuration for UITH Physiotherapy Scheduling System
 */
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const logger = require('../middleware/logger');
require('dotenv').config();

// Database configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'uith_physiotherapy',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database with required tables
async function initializeDatabase() {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    logger.info('Database connection successful');
    logger.info('Database tables already created');
  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
}

// Call initialize database function
initializeDatabase();

// Helper functions for common database operations
async function query(sql, params = []) {
  try {
    logger.debug('Executing query:');
    const [results] = await pool.query(sql, params);
    return [results, null];
  } catch (error) {
    logger.error('Database query error:', error);
    return [null, error];
  }
}

async function getById(table, id) {
  try {
    const [results] = await pool.query(
      `SELECT * FROM \`${table}\` WHERE id = ?`,
      [id]
    );
    return [results.length > 0 ? results[0] : null, null];
  } catch (error) {
    logger.error(`Error getting ${table} by ID:`, error);
    return [null, error];
  }
}

async function create(table, data) {
  try {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    
    const [result] = await pool.query(
      `INSERT INTO \`${table}\` (id, ${columns}) VALUES (?, ${placeholders})`,
      [uuidv4(), ...Object.values(data)]
    );
    
    // Return the created object with ID
    return [{ id: result.insertId, ...data }, null];
  } catch (error) {
    logger.error(`Error creating ${table}:`, error);
    return [null, error];
  }
}

async function update(table, id, data) {
  try {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const [result] = await pool.query(
      `UPDATE \`${table}\` SET ${setClause} WHERE id = ?`,
      [...Object.values(data), id]
    );
    
    return [result.affectedRows > 0, null];
  } catch (error) {
    logger.error(`Error updating ${table}:`, error);
    return [null, error];
  }
}

async function remove(table, id) {
  try {
    const [result] = await pool.query(
      `DELETE FROM \`${table}\` WHERE id = ?`,
      [id]
    );
    
    return [result.affectedRows > 0, null];
  } catch (error) {
    logger.error(`Error deleting from ${table}:`, error);
    return [null, error];
  }
}

module.exports = {
  pool,
  query,
  getById,
  create,
  update,
  remove
};