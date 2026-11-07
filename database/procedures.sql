-- =============================================================================
-- SMART EMPLOYEE MANAGEMENT SYSTEM – PAYROLL & ATTENDANCE
-- Database Stored Procedures: database/procedures.sql
-- =============================================================================

USE `smart_employee_db`;

DROP PROCEDURE IF EXISTS `sp_add_employee`;
DROP PROCEDURE IF EXISTS `sp_calculate_monthly_payroll`;
DROP PROCEDURE IF EXISTS `sp_attendance_summary`;

DELIMITER //

-- -----------------------------------------------------------------------------
-- Procedure 1: sp_add_employee
-- Purpose: Atomically creates an employee record and corresponding login user.
-- Demonstrates: Transactions (START TRANSACTION, COMMIT, ROLLBACK) and Error Handling.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE `sp_add_employee`(
    IN p_employee_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_address VARCHAR(255),
    IN p_gender VARCHAR(10),
    IN p_date_of_birth DATE,
    IN p_joining_date DATE,
    IN p_department_id INT,
    IN p_designation VARCHAR(100),
    IN p_basic_salary DECIMAL(10,2),
    IN p_username VARCHAR(50),
    IN p_password_hash VARCHAR(255),
    OUT p_employee_id INT
)
proc_block: BEGIN
    DECLARE v_new_emp_id INT;
    
    -- Error Handler: If any SQLEXCEPTION occurs, rollback and exit
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_employee_id = -1;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Insert into employees table
    INSERT INTO `employees` (
        `employee_name`, `email`, `phone`, `address`, `gender`, 
        `date_of_birth`, `joining_date`, `department_id`, `designation`, 
        `basic_salary`, `employment_status`
    ) VALUES (
        p_employee_name, p_email, p_phone, p_address, p_gender, 
        p_date_of_birth, p_joining_date, p_department_id, p_designation, 
        p_basic_salary, 'Active'
    );

    SET v_new_emp_id = LAST_INSERT_ID();

    -- 2. Insert into users table linked by employee_id
    INSERT INTO `users` (
        `username`, `password_hash`, `role`, `employee_id`
    ) VALUES (
        p_username, p_password_hash, 'Employee', v_new_emp_id
    );

    COMMIT;
    SET p_employee_id = v_new_emp_id;
END //

-- -----------------------------------------------------------------------------
-- Procedure 2: sp_calculate_monthly_payroll
-- Signature: sp_calculate_monthly_payroll(emp_id, month, year, allowances, deductions)
-- Purpose: Generates payroll for a single employee using specified allowances/deductions.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE `sp_calculate_monthly_payroll`(
    IN p_employee_id INT,
    IN p_month INT,
    IN p_year INT,
    IN p_allowances DECIMAL(10,2),
    IN p_deductions DECIMAL(10,2)
)
BEGIN
    DECLARE v_basic DECIMAL(10,2);
    DECLARE v_status ENUM('Active', 'Inactive');
    DECLARE v_working_days INT;
    DECLARE v_present_days DECIMAL(4,1);
    DECLARE v_prorated_basic DECIMAL(10,2);
    DECLARE v_net_salary DECIMAL(10,2);

    -- Retrieve employee salary & status
    SELECT basic_salary, employment_status
    INTO v_basic, v_status
    FROM employees
    WHERE employee_id = p_employee_id;

    IF v_basic IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Employee record does not exist.';
    END IF;

    -- Get working days using UDF fn_working_days
    SET v_working_days = fn_working_days(p_month, p_year);
    IF v_working_days <= 0 THEN
        SET v_working_days = 26;
    END IF;

    -- Get effective attendance days using UDF fn_total_present_days
    SET v_present_days = fn_total_present_days(p_employee_id, p_month, p_year);

    -- If no swipes marked for month, default to full working days
    IF v_present_days = 0.0 THEN
        IF NOT EXISTS (
            SELECT 1 FROM attendance
            WHERE employee_id = p_employee_id
              AND MONTH(attendance_date) = p_month
              AND YEAR(attendance_date) = p_year
        ) THEN
            SET v_present_days = v_working_days;
        END IF;
    END IF;

    -- Prorate basic salary based on attendance
    SET v_prorated_basic = ROUND((v_basic / v_working_days) * v_present_days, 2);

    -- Fallback default allowances and deductions if null
    IF p_allowances IS NULL THEN
        SET p_allowances = ROUND(v_basic * 0.10, 2);
    END IF;
    IF p_deductions IS NULL THEN
        SET p_deductions = ROUND(v_basic * 0.05, 2);
    END IF;

    -- Calculate net salary via UDF fn_net_salary
    SET v_net_salary = fn_net_salary(v_prorated_basic, p_allowances, p_deductions);

    -- Insert payroll record (Trigger trg_payroll_before_insert enforces business checks)
    INSERT INTO `payroll` (
        `employee_id`, `month`, `year`, `basic_salary`,
        `allowances`, `deductions`, `working_days`, `present_days`,
        `net_salary`, `payment_status`
    ) VALUES (
        p_employee_id, p_month, p_year, v_basic,
        p_allowances, p_deductions, v_working_days, v_present_days,
        v_net_salary, 'Pending'
    )
    ON DUPLICATE KEY UPDATE
        `basic_salary` = VALUES(`basic_salary`),
        `allowances` = VALUES(`allowances`),
        `deductions` = VALUES(`deductions`),
        `working_days` = VALUES(`working_days`),
        `present_days` = VALUES(`present_days`),
        `net_salary` = VALUES(`net_salary`);

    -- Return the inserted/updated record
    SELECT * FROM vw_employee_payroll_summary
    WHERE employee_id = p_employee_id AND month = p_month AND year = p_year;
END //

-- -----------------------------------------------------------------------------
-- Procedure 3: sp_attendance_summary
-- Purpose: Summary metrics for employee attendance with OUT parameters.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE `sp_attendance_summary`(
    IN p_employee_id INT,
    IN p_month INT,
    IN p_year INT,
    OUT p_present DECIMAL(4,1),
    OUT p_absent INT,
    OUT p_late INT,
    OUT p_half_day INT
)
BEGIN
    SELECT 
        COALESCE(SUM(CASE 
            WHEN status = 'Present' THEN 1.0 
            WHEN status = 'Late' THEN 1.0 
            WHEN status = 'Half Day' THEN 0.5 
            ELSE 0.0 
        END), 0.0),
        COALESCE(SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END), 0)
    INTO 
        p_present, p_absent, p_late, p_half_day
    FROM attendance
    WHERE employee_id = p_employee_id
      AND MONTH(attendance_date) = p_month
      AND YEAR(attendance_date) = p_year;
      
    -- Also output result set for direct consumption
    SELECT 
        p_employee_id AS employee_id,
        p_month AS month,
        p_year AS year,
        p_present AS effective_present_days,
        p_absent AS absent_days,
        p_late AS late_days,
        p_half_day AS half_days;
END //

DELIMITER ;
