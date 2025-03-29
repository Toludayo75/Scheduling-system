CREATE DATABASE IF NOT EXISTS uith_physiotherapy;
USE uith_physiotherapy;

-- Roles Table
CREATE TABLE IF NOT EXISTS `Roles` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE
);

-- Users Table
CREATE TABLE IF NOT EXISTS `Users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `firstname` VARCHAR(100) NOT NULL,
  `lastname` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` TEXT NOT NULL,
  `contract_type` VARCHAR(20),
  `role_id` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `Roles`(`id`)
);

-- Schedules Table
CREATE TABLE IF NOT EXISTS `Schedules` (
  `id` VARCHAR(36) PRIMARY KEY,
  `physiotherapist_id` VARCHAR(36) NOT NULL,
  `shift_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `status` VARCHAR(20) DEFAULT 'Scheduled',
  `shift_type` VARCHAR(20) DEFAULT 'Regular',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`physiotherapist_id`) REFERENCES `Users`(`id`)
);

-- ShiftRequests Table
CREATE TABLE IF NOT EXISTS `ShiftRequests` (
  `id` VARCHAR(36) PRIMARY KEY,
  `physiotherapist_id` VARCHAR(36) NOT NULL,
  `schedule_id` VARCHAR(36) NOT NULL,
  `swap_staff_id` VARCHAR(36),
  `request_type` VARCHAR(20) DEFAULT 'Cover',
  `reason` TEXT,
  `status` VARCHAR(20) DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`physiotherapist_id`) REFERENCES `Users`(`id`),
  FOREIGN KEY (`schedule_id`) REFERENCES `Schedules`(`id`),
  FOREIGN KEY (`swap_staff_id`) REFERENCES `Users`(`id`)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS `Notifications` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`)
);

-- Sessions Table (for express-mysql-session)
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` mediumtext COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
);