-- =============================================================================
-- SMART EMPLOYEE MANAGEMENT SYSTEM – PAYROLL & ATTENDANCE
-- Database: smart_employee_db
-- 3NF Relational Schema with Constraints, Foreign Keys & Cascade Actions
-- Compatible with MySQL 8.0+ and MariaDB 10.4+ (InnoDB Engine, utf8mb4)
-- =============================================================================
-- VIVA NOTE ON 3NF (Third Normal Form):
-- 1. 1NF: All column values are atomic; no repeating groups.
-- 2. 2NF: In 1NF and every non-key attribute is fully functionally dependent on the Primary Key.
-- 3. 3NF: In 2NF and no transitive dependency exists (no non-key determines another non-key).
--    Example: Department name and description are in 'departments', not repeated in 'employees'.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `smart_employee_db`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `smart_employee_db`;

-- Drop existing tables in reverse dependency order for clean reinstalls
DROP TABLE IF EXISTS `salary_audit`;
DROP TABLE IF EXISTS `payroll`;
DROP TABLE IF EXISTS `leave_requests`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `departments`;

-- -----------------------------------------------------------------------------
-- Table 1: DEPARTMENTS
-- Purpose: Normalizes organizational departments to avoid transitive redundancy.
-- -----------------------------------------------------------------------------
CREATE TABLE `departments` (
    `department_id` INT AUTO_INCREMENT PRIMARY KEY,
    `department_name` VARCHAR(100) NOT NULL UNIQUE,
    `description` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 2: EMPLOYEES
-- Purpose: Core employee profile information with check and foreign key constraints.
-- -----------------------------------------------------------------------------
CREATE TABLE `employees` (
    `employee_id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `phone` VARCHAR(20) NULL,
    `address` VARCHAR(255) NULL,
    `gender` VARCHAR(10) NULL,
    `date_of_birth` DATE NULL,
    `joining_date` DATE NOT NULL,
    `department_id` INT NULL,
    `designation` VARCHAR(100) NOT NULL,
    `basic_salary` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `employment_status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraint
    CONSTRAINT `fk_emp_department` 
        FOREIGN KEY (`department_id`) 
        REFERENCES `departments`(`department_id`) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,

    -- CHECK Constraints (Enforced in MySQL 8.x and MariaDB 10.4+)
    CONSTRAINT `chk_emp_gender` 
        CHECK (`gender` IN ('Male', 'Female', 'Other')),
    CONSTRAINT `chk_emp_salary_positive` 
        CHECK (`basic_salary` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for frequent searches
CREATE INDEX `idx_emp_department` ON `employees`(`department_id`);
CREATE INDEX `idx_emp_email` ON `employees`(`email`);
CREATE INDEX `idx_emp_status` ON `employees`(`employment_status`);
CREATE INDEX `idx_emp_name` ON `employees`(`employee_name`);

-- -----------------------------------------------------------------------------
-- Table 3: USERS
-- Purpose: Authentication and Role-Based Access Control (RBAC: Admin vs Employee).
-- Password stored strictly as secure hash (Werkzeug/Scrypt/Bcrypt).
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'Employee',
    `employee_id` INT UNIQUE NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT `fk_user_employee` 
        FOREIGN KEY (`employee_id`) 
        REFERENCES `employees`(`employee_id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,

    CONSTRAINT `chk_user_role` 
        CHECK (`role` IN ('Admin', 'Employee'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_users_username` ON `users`(`username`);

-- -----------------------------------------------------------------------------
-- Table 4: ATTENDANCE
-- Purpose: Daily employee swipe logs and calculated attendance statuses.
-- -----------------------------------------------------------------------------
CREATE TABLE `attendance` (
    `attendance_id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `attendance_date` DATE NOT NULL,
    `check_in` TIME NULL,
    `check_out` TIME NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Present',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT `fk_att_employee` 
        FOREIGN KEY (`employee_id`) 
        REFERENCES `employees`(`employee_id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,

    -- Business logic: Exactly 1 record per employee per calendar date
    CONSTRAINT `uq_emp_date` 
        UNIQUE (`employee_id`, `attendance_date`),

    -- Check constraint for valid statuses
    CONSTRAINT `chk_att_status` 
        CHECK (`status` IN ('Present', 'Absent', 'Half Day', 'Late')),

    -- Check constraint ensuring check_out is later than check_in when both exist
    CONSTRAINT `chk_att_time_order` 
        CHECK (`check_out` IS NULL OR `check_in` IS NULL OR `check_out` > `check_in`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_att_emp_date` ON `attendance`(`employee_id`, `attendance_date`);
CREATE INDEX `idx_att_date` ON `attendance`(`attendance_date`);

-- -----------------------------------------------------------------------------
-- Table 5: LEAVE_REQUESTS
-- Purpose: Formal employee leave applications and admin approval lifecycle.
-- Note: Named 'leave_requests' because LEAVE is a reserved keyword in MySQL.
-- -----------------------------------------------------------------------------
CREATE TABLE `leave_requests` (
    `leave_id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `leave_type` VARCHAR(50) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `reason` TEXT NULL,
    `leave_status` VARCHAR(20) NOT NULL DEFAULT 'Pending',
    `applied_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
    `action_by` VARCHAR(50) NULL,
    `action_comment` TEXT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT `fk_leave_employee` 
        FOREIGN KEY (`employee_id`) 
        REFERENCES `employees`(`employee_id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,

    CONSTRAINT `chk_leave_status` 
        CHECK (`leave_status` IN ('Pending', 'Approved', 'Rejected')),

    -- Check constraint: end date must not be earlier than start date
    CONSTRAINT `chk_leave_dates` 
        CHECK (`end_date` >= `start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_leave_emp_status` ON `leave_requests`(`employee_id`, `leave_status`);

-- -----------------------------------------------------------------------------
-- Table 6: PAYROLL
-- Purpose: Monthly calculated payroll slips with earnings, deductions, and net pay.
-- -----------------------------------------------------------------------------
CREATE TABLE `payroll` (
    `payroll_id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `month` INT NOT NULL,
    `year` INT NOT NULL,
    `basic_salary` DECIMAL(10,2) NOT NULL,
    `allowances` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `deductions` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `working_days` INT NOT NULL,
    `present_days` DECIMAL(4,1) NOT NULL,
    `net_salary` DECIMAL(10,2) NOT NULL,
    `payment_status` VARCHAR(20) NOT NULL DEFAULT 'Pending',
    `generated_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT `fk_payroll_employee` 
        FOREIGN KEY (`employee_id`) 
        REFERENCES `employees`(`employee_id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,

    -- Month must be between 1 and 12
    CONSTRAINT `chk_payroll_month` 
        CHECK (`month` BETWEEN 1 AND 12),

    -- Status check constraint
    CONSTRAINT `chk_payroll_status` 
        CHECK (`payment_status` IN ('Pending', 'Paid')),

    -- Unique constraint: A single payroll per employee per month/year
    CONSTRAINT `uq_emp_month_year` 
        UNIQUE (`employee_id`, `month`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_payroll_period` ON `payroll`(`month`, `year`);
CREATE INDEX `idx_payroll_emp_year_month` ON `payroll`(`employee_id`, `year`, `month`);

-- -----------------------------------------------------------------------------
-- Table 7: SALARY_AUDIT
-- Purpose: Automatic history tracking table populated by the AFTER UPDATE trigger.
-- -----------------------------------------------------------------------------
CREATE TABLE `salary_audit` (
    `audit_id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `old_salary` DECIMAL(10,2) NOT NULL,
    `new_salary` DECIMAL(10,2) NOT NULL,
    `changed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `changed_by` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_audit_emp` ON `salary_audit`(`employee_id`);
