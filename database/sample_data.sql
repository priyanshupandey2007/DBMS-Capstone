-- =============================================================================
-- SMART EMPLOYEE MANAGEMENT SYSTEM – PAYROLL & ATTENDANCE
-- Database Sample Data: database/sample_data.sql
-- Hashed Passwords generated with werkzeug.security:
-- Admin:    admin   / Admin@123  -> scrypt:32768:8:1$VFBIFB7ikDPZ1FMu$597edfb5c9a7acb75b465b4a0e45196596ceab9cbdea820ba6317e93f73412dacf496374cb505bac50bec824b5ccee668e9f7ac3836fe11f0379777e5754839f
-- Employee: emp101  / Emp@123    -> scrypt:32768:8:1$XCQnG6JxfEKuGpNU$e2aedf143d287428e66591590a55113ef5b1e95e23317238bdf53ed5d606aade81918b5b20ebf160271ed40f8ebcf8f33941d4c6104fb562490b0511c8cdbe95
-- =============================================================================

USE `smart_employee_db`;

-- -----------------------------------------------------------------------------
-- 1. INSERT DEPARTMENTS (5 Core Departments)
-- -----------------------------------------------------------------------------
INSERT INTO `departments` (`department_id`, `department_name`, `description`) VALUES
(1, 'Engineering & IT', 'Core software development, cloud infrastructure, and enterprise architecture.'),
(2, 'Human Resources', 'Talent acquisition, employee welfare, performance management, and HR compliance.'),
(3, 'Finance & Accounts', 'Corporate accounting, financial planning, taxation, and statutory audits.'),
(4, 'Marketing & Sales', 'Brand strategy, digital campaigns, business development, and client relations.'),
(5, 'Operations & Support', 'Workplace operations, IT helpdesk, system administration, and facility management')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- -----------------------------------------------------------------------------
-- 2. INSERT EMPLOYEES (12 Diverse Employees)
-- -----------------------------------------------------------------------------
INSERT INTO `employees` (
    `employee_id`, `employee_name`, `email`, `phone`, `address`, `gender`, 
    `date_of_birth`, `joining_date`, `department_id`, `designation`, 
    `basic_salary`, `employment_status`
) VALUES
(1, 'Aarav Sharma', 'aarav.sharma@technova.com', '+91 98765 43210', '42 MG Road, Bengaluru, KA', 'Male', '1992-04-15', '2021-03-10', 1, 'Lead Full Stack Architect', 95000.00, 'Active'),
(2, 'Priya Nair', 'priya.nair@technova.com', '+91 98765 43211', '108 Indiranagar, Bengaluru, KA', 'Female', '1994-08-22', '2022-01-15', 1, 'Senior Backend Engineer', 78000.00, 'Active'),
(3, 'Rohan Verma', 'rohan.verma@technova.com', '+91 98765 43212', '77 Koramangala, Bengaluru, KA', 'Male', '1996-11-05', '2023-06-01', 1, 'Frontend UI/UX Specialist', 62000.00, 'Active'),
(4, 'Ananya Deshmukh', 'ananya.deshmukh@technova.com', '+91 98765 43213', '15 Baner, Pune, MH', 'Female', '1990-02-18', '2020-07-20', 2, 'Senior HR Business Partner', 70000.00, 'Active'),
(5, 'Vikram Malhotra', 'vikram.malhotra@technova.com', '+91 98765 43214', '302 Bandra West, Mumbai, MH', 'Male', '1988-12-30', '2019-11-01', 3, 'Chief Financial Controller', 110000.00, 'Active'),
(6, 'Neha Kulkarni', 'neha.kulkarni@technova.com', '+91 98765 43215', '56 Shivaji Nagar, Pune, MH', 'Female', '1995-05-14', '2022-09-12', 3, 'Senior Corporate Accountant', 58000.00, 'Active'),
(7, 'Aditya Sen', 'aditya.sen@technova.com', '+91 98765 43216', '12 Salt Lake, Kolkata, WB', 'Male', '1993-09-09', '2021-08-16', 4, 'Growth Marketing Lead', 67000.00, 'Active'),
(8, 'Tanvi Patel', 'tanvi.patel@technova.com', '+91 98765 43217', '89 SG Highway, Ahmedabad, GJ', 'Female', '1997-03-27', '2023-02-01', 4, 'Digital Sales Strategist', 52000.00, 'Active'),
(9, 'Rahul Joshi', 'rahul.joshi@technova.com', '+91 98765 43218', '23 Whitefield, Bengaluru, KA', 'Male', '1991-07-19', '2020-02-10', 5, 'DevOps & IT Admin', 72000.00, 'Active'),
(10, 'Meera Iyer', 'meera.iyer@technova.com', '+91 98765 43219', '64 Anna Nagar, Chennai, TN', 'Female', '1998-10-12', '2024-01-10', 1, 'QA Automation Engineer', 48000.00, 'Active'),
(11, 'Karan Singhania', 'karan.singhania@technova.com', '+91 98765 43220', '18 Cyber City, Gurugram, HR', 'Male', '1992-06-25', '2022-04-18', 2, 'Talent Acquisition Associate', 45000.00, 'Active'),
(12, 'Suresh Menon', 'suresh.menon@technova.com', '+91 98765 43221', '91 Kakkanad, Kochi, KL', 'Male', '1985-01-08', '2018-05-14', 5, 'Senior Facilities Manager', 60000.00, 'Inactive')
ON DUPLICATE KEY UPDATE `basic_salary` = VALUES(`basic_salary`), `employment_status` = VALUES(`employment_status`);

-- -----------------------------------------------------------------------------
-- 3. INSERT USERS (Admin + Employee Accounts)
-- Admin:    admin / Admin@123
-- Employee: emp101 -> emp112 / Emp@123
-- -----------------------------------------------------------------------------
INSERT INTO `users` (`username`, `password_hash`, `role`, `employee_id`) VALUES
('admin', 'scrypt:32768:8:1$VFBIFB7ikDPZ1FMu$597edfb5c9a7acb75b465b4a0e45196596ceab9cbdea820ba6317e93f73412dacf496374cb505bac50bec824b5ccee668e9f7ac3836fe11f0379777e5754839f', 'Admin', NULL),
('emp101', 'scrypt:32768:8:1$XCQnG6JxfEKuGpNU$e2aedf143d287428e66591590a55113ef5b1e95e23317238bdf53ed5d606aade81918b5b20ebf160271ed40f8ebcf8f33941d4c6104fb562490b0511c8cdbe95', 'Employee', 1),
('emp102', 'scrypt:32768:8:1$XCQnG6JxfEKuGpNU$e2aedf143d287428e66591590a55113ef5b1e95e23317238bdf53ed5d606aade81918b5b20ebf160271ed40f8ebcf8f33941d4c6104fb562490b0511c8cdbe95', 'Employee', 2),
('emp103', 'scrypt:32768:8:1$XCQnG6JxfEKuGpNU$e2aedf143d287428e66591590a55113ef5b1e95e23317238bdf53ed5d606aade81918b5b20ebf160271ed40f8ebcf8f33941d4c6104fb562490b0511c8cdbe95', 'Employee', 3),
('emp104', 'scrypt:32768:8:1$XCQnG6JxfEKuGpNU$e2aedf143d287428e66591590a55113ef5b1e95e23317238bdf53ed5d606aade81918b5b20ebf160271ed40f8ebcf8f33941d4c6104fb562490b0511c8cdbe95', 'Employee', 4),
('emp105', 'scrypt:32768:8:1$XCQnG6JxfEKuGpNU$e2aedf143d287428e66591590a55113ef5b1e95e23317238bdf53ed5d606aade81918b5b20ebf160271ed40f8ebcf8f33941d4c6104fb562490b0511c8cdbe95', 'Employee', 5),
('emp106', 'scrypt:32768:8:1$XCQnG6JxfEKuGpNU$e2aedf143d287428e66591590a55113ef5b1e95e23317238bdf53ed5d606aade81918b5b20ebf160271ed40f8ebcf8f33941d4c6104fb562490b0511c8cdbe95', 'Employee', 6),
('emp107', 'scrypt:32768:8:1$XCQnG6JxfEKuGpNU$e2aedf143d287428e66591590a55113ef5b1e95e23317238bdf53ed5d606aade81918b5b20ebf160271ed40f8ebcf8f33941d4c6104fb562490b0511c8cdbe95', 'Employee', 7),
('emp108', 'scrypt:32768:8:1$XCQnG6JxfEKuGpNU$e2aedf143d287428e66591590a55113ef5b1e95e23317238bdf53ed5d606aade81918b5b20ebf160271ed40f8ebcf8f33941d4c6104fb562490b0511c8cdbe95', 'Employee', 8),
('emp109', 'scrypt:32768:8:1$XCQnG6JxfEKuGpNU$e2aedf143d287428e66591590a55113ef5b1e95e23317238bdf53ed5d606aade81918b5b20ebf160271ed40f8ebcf8f33941d4c6104fb562490b0511c8cdbe95', 'Employee', 9),
('emp110', 'scrypt:32768:8:1$XCQnG6JxfEKuGpNU$e2aedf143d287428e66591590a55113ef5b1e95e23317238bdf53ed5d606aade81918b5b20ebf160271ed40f8ebcf8f33941d4c6104fb562490b0511c8cdbe95', 'Employee', 10),
('emp111', 'scrypt:32768:8:1$XCQnG6JxfEKuGpNU$e2aedf143d287428e66591590a55113ef5b1e95e23317238bdf53ed5d606aade81918b5b20ebf160271ed40f8ebcf8f33941d4c6104fb562490b0511c8cdbe95', 'Employee', 11),
('emp112', 'scrypt:32768:8:1$XCQnG6JxfEKuGpNU$e2aedf143d287428e66591590a55113ef5b1e95e23317238bdf53ed5d606aade81918b5b20ebf160271ed40f8ebcf8f33941d4c6104fb562490b0511c8cdbe95', 'Employee', 12)
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`);

-- -----------------------------------------------------------------------------
-- 4. INSERT ATTENDANCE (~30 representative logs including Late, Half Day, Absent)
-- -----------------------------------------------------------------------------
INSERT INTO `attendance` (`employee_id`, `attendance_date`, `check_in`, `check_out`, `status`) VALUES
-- Aarav Sharma (emp 1)
(1, '2026-11-02', '09:05:00', '18:10:00', 'Present'),
(1, '2026-11-03', '09:00:00', '18:15:00', 'Present'),
(1, '2026-11-04', '09:45:00', '18:30:00', 'Late'),
(1, '2026-11-05', '09:10:00', '14:00:00', 'Half Day'),
(1, '2026-11-06', '08:55:00', '18:00:00', 'Present'),

-- Priya Nair (emp 2)
(2, '2026-11-02', '09:15:00', '18:05:00', 'Present'),
(2, '2026-11-03', '09:20:00', '18:10:00', 'Present'),
(2, '2026-11-04', NULL, NULL, 'Absent'),
(2, '2026-11-05', '09:10:00', '18:15:00', 'Present'),
(2, '2026-11-06', '09:00:00', '18:00:00', 'Present'),

-- Rohan Verma (emp 3)
(3, '2026-11-02', '09:50:00', '18:45:00', 'Late'),
(3, '2026-11-03', '09:10:00', '18:00:00', 'Present'),
(3, '2026-11-04', '09:05:00', '18:20:00', 'Present'),
(3, '2026-11-05', '09:12:00', '18:15:00', 'Present'),
(3, '2026-11-06', '09:00:00', '13:30:00', 'Half Day'),

-- Ananya Deshmukh (emp 4)
(4, '2026-11-02', '09:00:00', '18:00:00', 'Present'),
(4, '2026-11-03', '09:05:00', '18:10:00', 'Present'),
(4, '2026-11-04', '09:00:00', '18:00:00', 'Present'),
(4, '2026-11-05', '09:00:00', '18:00:00', 'Present'),
(4, '2026-11-06', '09:05:00', '18:00:00', 'Present'),

-- Vikram Malhotra (emp 5)
(5, '2026-11-02', '08:45:00', '18:00:00', 'Present'),
(5, '2026-11-03', '08:50:00', '18:30:00', 'Present'),
(5, '2026-11-04', '09:00:00', '18:00:00', 'Present'),
(5, '2026-11-05', '08:55:00', '18:15:00', 'Present'),
(5, '2026-11-06', '08:45:00', '18:00:00', 'Present'),

-- Neha Kulkarni (emp 6)
(6, '2026-11-02', '09:00:00', '18:00:00', 'Present'),
(6, '2026-11-03', '09:35:00', '18:15:00', 'Late'),
(6, '2026-11-04', '09:00:00', '18:00:00', 'Present'),
(6, '2026-11-05', NULL, NULL, 'Absent'),
(6, '2026-11-06', '09:00:00', '18:00:00', 'Present'),

-- Tanvi Patel (emp 8)
(8, '2026-11-02', '09:10:00', '18:00:00', 'Present'),
(8, '2026-11-03', '09:15:00', '18:00:00', 'Present'),
(8, '2026-11-04', '09:00:00', '14:00:00', 'Half Day'),
(8, '2026-11-05', '09:10:00', '18:00:00', 'Present'),
(8, '2026-11-06', '09:00:00', '18:00:00', 'Present'),

-- Meera Iyer (emp 10)
(10, '2026-11-02', '09:00:00', '18:00:00', 'Present'),
(10, '2026-11-03', '09:00:00', '18:00:00', 'Present'),
(10, '2026-11-04', '09:00:00', '18:00:00', 'Present'),
(10, '2026-11-05', '09:00:00', '18:00:00', 'Present'),
(10, '2026-11-06', '09:00:00', '18:00:00', 'Present')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `check_in` = VALUES(`check_in`), `check_out` = VALUES(`check_out`);

-- -----------------------------------------------------------------------------
-- 5. INSERT LEAVE REQUESTS (Pending, Approved, Rejected)
-- -----------------------------------------------------------------------------
INSERT INTO `leave_requests` (
    `leave_id`, `employee_id`, `leave_type`, `start_date`, `end_date`, 
    `reason`, `leave_status`, `applied_date`, `action_by`, `action_comment`
) VALUES
(1, 2, 'Medical Leave', '2026-11-04', '2026-11-04', 'Fever and viral throat infection.', 'Approved', '2026-11-03', 'admin', 'Get well soon. Approved.'),
(2, 6, 'Casual Leave', '2026-11-05', '2026-11-05', 'Personal family function.', 'Approved', '2026-11-01', 'admin', 'Approved as per casual quota.'),
(3, 3, 'Vacation Leave', '2026-11-16', '2026-11-18', 'Annual family trip to Himachal.', 'Pending', '2026-11-05', NULL, NULL),
(4, 7, 'Casual Leave', '2026-11-20', '2026-11-21', 'Relocation to new apartment.', 'Pending', '2026-11-06', NULL, NULL),
(5, 1, 'Conference Leave', '2026-11-25', '2026-11-26', 'Speaker at National Web Dev Summit.', 'Approved', '2026-10-28', 'admin', 'Approved. Sponsored attendance.'),
(6, 8, 'Sick Leave', '2026-10-15', '2026-10-16', 'Migraine attack.', 'Approved', '2026-10-14', 'admin', 'Approved.'),
(7, 10, 'Personal Leave', '2026-10-20', '2026-10-22', 'Wedding preparation.', 'Rejected', '2026-10-10', 'admin', 'Sprint release blackout period.')
ON DUPLICATE KEY UPDATE `leave_status` = VALUES(`leave_status`);

-- -----------------------------------------------------------------------------
-- 6. INSERT PAYROLL RECORDS (3 Previous Months: August, September, October 2026)
-- -----------------------------------------------------------------------------
-- August 2026
INSERT INTO `payroll` (`employee_id`, `month`, `year`, `basic_salary`, `allowances`, `deductions`, `working_days`, `present_days`, `net_salary`, `payment_status`) VALUES
(1, 8, 2026, 95000.00, 9500.00, 4750.00, 26, 26.0, 99750.00, 'Paid'),
(2, 8, 2026, 78000.00, 7800.00, 3900.00, 26, 26.0, 81900.00, 'Paid'),
(3, 8, 2026, 62000.00, 6200.00, 3100.00, 26, 26.0, 65100.00, 'Paid'),
(4, 8, 2026, 70000.00, 7000.00, 3500.00, 26, 26.0, 73500.00, 'Paid'),
(5, 8, 2026, 110000.00, 11000.00, 5500.00, 26, 26.0, 115500.00, 'Paid')
ON DUPLICATE KEY UPDATE `payment_status` = VALUES(`payment_status`);

-- September 2026
INSERT INTO `payroll` (`employee_id`, `month`, `year`, `basic_salary`, `allowances`, `deductions`, `working_days`, `present_days`, `net_salary`, `payment_status`) VALUES
(1, 9, 2026, 95000.00, 9500.00, 4750.00, 26, 26.0, 99750.00, 'Paid'),
(2, 9, 2026, 78000.00, 7800.00, 3900.00, 26, 25.0, 78900.00, 'Paid'),
(3, 9, 2026, 62000.00, 6200.00, 3100.00, 26, 26.0, 65100.00, 'Paid'),
(4, 9, 2026, 70000.00, 7000.00, 3500.00, 26, 26.0, 73500.00, 'Paid'),
(5, 9, 2026, 110000.00, 11000.00, 5500.00, 26, 26.0, 115500.00, 'Paid')
ON DUPLICATE KEY UPDATE `payment_status` = VALUES(`payment_status`);

-- October 2026
INSERT INTO `payroll` (`employee_id`, `month`, `year`, `basic_salary`, `allowances`, `deductions`, `working_days`, `present_days`, `net_salary`, `payment_status`) VALUES
(1, 10, 2026, 95000.00, 9500.00, 4750.00, 26, 26.0, 99750.00, 'Paid'),
(2, 10, 2026, 78000.00, 7800.00, 3900.00, 26, 25.5, 80400.00, 'Paid'),
(3, 10, 2026, 62000.00, 6200.00, 3100.00, 26, 26.0, 65100.00, 'Paid'),
(4, 10, 2026, 70000.00, 7000.00, 3500.00, 26, 26.0, 73500.00, 'Paid'),
(5, 10, 2026, 110000.00, 11000.00, 5500.00, 26, 26.0, 115500.00, 'Paid'),
(6, 10, 2026, 58000.00, 5800.00, 2900.00, 26, 24.0, 56453.85, 'Paid'),
(7, 10, 2026, 67000.00, 6700.00, 3350.00, 26, 26.0, 70350.00, 'Paid'),
(8, 10, 2026, 52000.00, 5200.00, 2600.00, 26, 25.0, 52600.00, 'Paid'),
(9, 10, 2026, 72000.00, 7200.00, 3600.00, 26, 26.0, 75600.00, 'Paid'),
(10, 10, 2026, 48000.00, 4800.00, 2400.00, 26, 26.0, 50400.00, 'Paid'),
(11, 10, 2026, 45000.00, 4500.00, 2250.00, 26, 26.0, 47250.00, 'Paid')
ON DUPLICATE KEY UPDATE `payment_status` = VALUES(`payment_status`);

-- -----------------------------------------------------------------------------
-- 7. INSERT SAMPLE AUDIT LOGS
-- -----------------------------------------------------------------------------
INSERT INTO `salary_audit` (`employee_id`, `old_salary`, `new_salary`, `changed_at`, `changed_by`) VALUES
(1, 85000.00, 95000.00, '2026-04-01 10:00:00', 'Annual Appraisal Committee'),
(2, 70000.00, 78000.00, '2026-04-01 10:00:00', 'Annual Appraisal Committee'),
(5, 100000.00, 110000.00, '2026-01-15 11:30:00', 'Board Resolution');
