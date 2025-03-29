/**
 * Seed Script for UITH Physiotherapy Scheduling System
 * 
 * This script creates dummy data for demonstration purposes:
 * - Staff accounts (physiotherapists)
 * - Admin accounts
 * - Example schedules
 * - Example shift requests
 */
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../middleware/logger');

async function seedDummyData() {
    try {
        logger.info('Starting to seed dummy data...');
        
        // Get roles
        const [roles] = await db.query('SELECT id, name FROM "Roles"');
        const physiotherapistRoleId = roles.find(role => role.name === 'Physiotherapist')?.id;
        const adminRoleId = roles.find(role => role.name === 'Admin')?.id;
        
        if (!physiotherapistRoleId || !adminRoleId) {
            throw new Error('Could not find required roles');
        }
        
        // Check if dummy data already exists
        const [existingUsers] = await db.query(
            'SELECT COUNT(*) as count FROM "Users" WHERE email LIKE $1',
            ['%dummy%']
        );
        
        // If users already exist, continue with creating schedules and shift requests
        const skipUserCreation = existingUsers[0].count > 0;
        if (skipUserCreation) {
            logger.info('Dummy users already exist. Skipping user creation but continuing with schedules and shift requests.');
        }
        
        // Create dummy physiotherapists
        const physiotherapists = [
            { firstname: 'John', lastname: 'Smith', email: 'john.smith@dummy.uith.org', contract_type: 'Full-time' },
            { firstname: 'Mary', lastname: 'Johnson', email: 'mary.johnson@dummy.uith.org', contract_type: 'Part-time' },
            { firstname: 'David', lastname: 'Brown', email: 'david.brown@dummy.uith.org', contract_type: 'Full-time' },
            { firstname: 'Sarah', lastname: 'Wilson', email: 'sarah.wilson@dummy.uith.org', contract_type: 'Part-time' },
            { firstname: 'Michael', lastname: 'Taylor', email: 'michael.taylor@dummy.uith.org', contract_type: 'Full-time' }
        ];
        
        // Create dummy admin (in addition to the system admin)
        const admins = [
            { firstname: 'Jane', lastname: 'Admin', email: 'jane.admin@dummy.uith.org', contract_type: 'Full-time' }
        ];
        
        // Standard password for all dummy accounts
        const password = 'Password123!';
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Insert physiotherapists if they don't already exist
        if (!skipUserCreation) {
            for (const physio of physiotherapists) {
                const id = uuidv4();
                await db.query(
                    'INSERT INTO "Users" (id, firstname, lastname, email, password_hash, contract_type, role_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [id, physio.firstname, physio.lastname, physio.email, passwordHash, physio.contract_type, physiotherapistRoleId]
                );
                logger.info(`Created dummy physiotherapist: ${physio.firstname} ${physio.lastname}`);
            }
            
            // Insert admins
            for (const admin of admins) {
                const id = uuidv4();
                await db.query(
                    'INSERT INTO "Users" (id, firstname, lastname, email, password_hash, contract_type, role_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [id, admin.firstname, admin.lastname, admin.email, passwordHash, admin.contract_type, adminRoleId]
                );
                logger.info(`Created dummy admin: ${admin.firstname} ${admin.lastname}`);
            }
        }
        
        // Get the physiotherapist IDs
        const [physioIds] = await db.query(
            'SELECT id FROM "Users" WHERE role_id = $1 AND email LIKE $2',
            [physiotherapistRoleId, '%dummy%']
        );
        
        // Clear existing shift requests and schedules
        await db.query('DELETE FROM "ShiftRequests"');
        logger.info('Cleared existing shift requests');
        
        await db.query('DELETE FROM "Schedules"');
        logger.info('Cleared existing schedules');
        
        // Create dummy schedules for the next 30 days
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            // Create 2-3 schedules per day
            const schedulesPerDay = Math.floor(Math.random() * 2) + 2;
            
            for (let j = 0; j < schedulesPerDay; j++) {
                const scheduleDate = new Date(today);
                scheduleDate.setDate(today.getDate() + i);
                const formattedDate = scheduleDate.toISOString().split('T')[0];
                
                // Random physiotherapist
                const physiotherapistIndex = Math.floor(Math.random() * physioIds.length);
                const physiotherapistId = physioIds[physiotherapistIndex].id;
                
                // Random shift type
                const shiftTypes = ['Morning', 'Afternoon', 'Night'];
                const shiftType = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
                
                // Set start and end times based on shift type
                let startTime, endTime;
                switch (shiftType) {
                    case 'Morning':
                        startTime = '08:00:00';
                        endTime = '16:00:00';
                        break;
                    case 'Afternoon':
                        startTime = '16:00:00';
                        endTime = '00:00:00';
                        break;
                    case 'Night':
                        startTime = '00:00:00';
                        endTime = '08:00:00';
                        break;
                }
                
                // Create schedule
                const scheduleId = uuidv4();
                await db.query(
                    'INSERT INTO "Schedules" (id, physiotherapist_id, shift_date, start_time, end_time, shift_type, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [scheduleId, physiotherapistId, formattedDate, startTime, endTime, shiftType, 'Scheduled', adminRoleId]
                );
            }
        }
        
        // Create a few shift request examples
        const [schedules] = await db.query(
            'SELECT id, physiotherapist_id FROM "Schedules" LIMIT 10'
        );
        
        // Get all physiotherapist IDs for swap requests
        const [allPhysioIds] = await db.query(
            'SELECT id FROM "Users" WHERE role_id = $1 ORDER BY firstname',
            [physiotherapistRoleId]
        );
        
        // Create regular cover requests
        for (let i = 0; i < 3; i++) {
            if (schedules[i]) {
                const requestId = uuidv4();
                await db.query(
                    'INSERT INTO "ShiftRequests" (id, physiotherapist_id, schedule_id, reason, status, request_type, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                    [
                        requestId, 
                        schedules[i].physiotherapist_id, 
                        schedules[i].id, 
                        'Personal emergency, need time off', 
                        i === 0 ? 'Pending' : (i === 1 ? 'Approved' : 'Rejected'),
                        'cover'
                    ]
                );
                logger.info(`Created dummy cover request for schedule ${schedules[i].id}`);
            }
        }
        
        // Create swap requests
        for (let i = 3; i < 6; i++) {
            if (schedules[i] && allPhysioIds.length > 1) {
                const requestId = uuidv4();
                
                // Find a different physiotherapist for the swap
                let swapPhysioId = null;
                for (const physio of allPhysioIds) {
                    if (physio.id !== schedules[i].physiotherapist_id) {
                        swapPhysioId = physio.id;
                        break;
                    }
                }
                
                if (swapPhysioId) {
                    await db.query(
                        'INSERT INTO "ShiftRequests" (id, physiotherapist_id, schedule_id, reason, status, request_type, swap_staff_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
                        [
                            requestId, 
                            schedules[i].physiotherapist_id, 
                            schedules[i].id, 
                            'Need to swap shift with colleague', 
                            i === 3 ? 'Pending' : (i === 4 ? 'Approved' : 'Rejected'),
                            'swap',
                            swapPhysioId
                        ]
                    );
                    logger.info(`Created dummy swap request for schedule ${schedules[i].id} with staff ${swapPhysioId}`);
                }
            }
        }
        
        logger.info('Successfully seeded dummy data!');
    } catch (error) {
        logger.error('Error seeding dummy data:', error);
        throw error;
    }
}

// Execute if this file is run directly
if (require.main === module) {
    seedDummyData()
        .then(() => {
            console.log('Successfully seeded dummy data');
            process.exit(0);
        })
        .catch(error => {
            console.error('Error seeding dummy data:', error);
            process.exit(1);
        });
}

module.exports = { seedDummyData };