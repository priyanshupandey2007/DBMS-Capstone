-- =============================================================================
-- SMART EMPLOYEE MANAGEMENT SYSTEM – PAYROLL & ATTENDANCE
-- Database Triggers: database/triggers.sql
-- =============================================================================
-- VIVA NOTE ON TRIGGERS:
-- A Trigger is a specialized stored program that automatically executes (fires)
-- in response to an event (INSERT, UPDATE, DELETE) on a particular table.
-- Why use Triggers?
-- 1. Declarative Business Integrity: Cannot be bypassed even by raw SQL queries.
-- 2. Audit Logging: Automatically tracks historical changes without app-side code.
-- 3. Complex Validations: Enforce constraints spanning multiple tables before committing.
-- =============================================================================

USE `smart_employee_db`;

DROP TRIGGER IF EXISTS `trg_attendance_before_insert`;
DROP TRIGGER IF EXISTS `trg_attendance_before_update`;
DROP TRIGGER IF EXISTS `trg_payroll_before_insert`;
DROP TRIGGER IF EXISTS `trg_employees_after_salary_update`;

DELIMITER //

-- -----------------------------------------------------------------------------
-- Trigger 1: trg_attendance_before_insert
-- Purpose: Validates attendance business rules BEFORE writing into table:
--   Rule A: Attendance date cannot be in the future (greater than CURRENT_DATE).
--   Rule B: Attendance date cannot precede the employee's joining date.
--   Rule C: Inactive employees cannot have attendance marked.
-- -----------------------------------------------------------------------------
CREATE TRIGGER `trg_attendance_before_insert`
BEFORE INSERT ON `attendance`
FOR EACH ROW
BEGIN
    DECLARE v_joining_date DATE;
    DECLARE v_status ENUM('Active', 'Inactive');

    -- Rule A: Check for future date
    IF NEW.attendance_date > CURRENT_DATE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Attendance cannot be marked for a future date.';
    END IF;

    -- Query employee details
    SELECT joining_date, employment_status 
    INTO v_joining_date, v_status
    FROM employees 
    WHERE employee_id = NEW.employee_id;

    -- Rule B: Check if date precedes employee's official joining date
    IF NEW.attendance_date < v_joining_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Attendance date cannot be prior to employee joining date.';
    END IF;

    -- Rule C: Check if employee is Active
    IF v_status = 'Inactive' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Cannot record attendance for an Inactive employee.';
    END IF;
END //

-- -----------------------------------------------------------------------------
-- Trigger 2: trg_attendance_before_update
-- Purpose: Validates future date and joining date when attendance is modified.
-- -----------------------------------------------------------------------------
CREATE TRIGGER `trg_attendance_before_update`
BEFORE UPDATE ON `attendance`
FOR EACH ROW
BEGIN
    DECLARE v_joining_date DATE;
    DECLARE v_status ENUM('Active', 'Inactive');

    IF NEW.attendance_date > CURRENT_DATE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Attendance cannot be marked for a future date.';
    END IF;

    SELECT joining_date, employment_status 
    INTO v_joining_date, v_status
    FROM employees 
    WHERE employee_id = NEW.employee_id;

    IF NEW.attendance_date < v_joining_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Attendance date cannot be prior to employee joining date.';
    END IF;
END //

-- -----------------------------------------------------------------------------
-- Trigger 3: trg_payroll_before_insert
-- Purpose: 
--   1. Block duplicate payroll for same employee, month, year with clear error.
--   2. Block payroll generation for periods prior to the employee's joining month/year.
-- -----------------------------------------------------------------------------
CREATE TRIGGER `trg_payroll_before_insert`
BEFORE INSERT ON `payroll`
FOR EACH ROW
BEGIN
    DECLARE v_join_year INT;
    DECLARE v_join_month INT;
    DECLARE v_exists INT;

    -- Rule 1: Check duplicate payroll
    SELECT COUNT(*) INTO v_exists
    FROM payroll
    WHERE employee_id = NEW.employee_id
      AND month = NEW.month
      AND year = NEW.year;

    IF v_exists > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Business Logic Error: Payroll has already been generated for this employee in the specified month/year.';
    END IF;

    -- Rule 2: Check employee joining date
    SELECT YEAR(joining_date), MONTH(joining_date)
    INTO v_join_year, v_join_month
    FROM employees
    WHERE employee_id = NEW.employee_id;

    IF (NEW.year < v_join_year) OR (NEW.year = v_join_year AND NEW.month < v_join_month) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Business Logic Error: Cannot generate payroll for period prior to employee official joining date.';
    END IF;
END //

-- -----------------------------------------------------------------------------
-- Trigger 4: trg_employees_after_salary_update
-- Purpose: Automatic Audit Log. Fires AFTER an update on the employees table.
-- Whenever basic_salary is altered, records old & new values into salary_audit.
-- -----------------------------------------------------------------------------
CREATE TRIGGER `trg_employees_after_salary_update`
AFTER UPDATE ON `employees`
FOR EACH ROW
BEGIN
    -- Only log if the basic_salary actually changed
    IF OLD.basic_salary <> NEW.basic_salary THEN
        INSERT INTO `salary_audit` (
            `employee_id`, 
            `old_salary`, 
            `new_salary`, 
            `changed_at`, 
            `changed_by`
        ) VALUES (
            NEW.employee_id, 
            OLD.basic_salary, 
            NEW.basic_salary, 
            CURRENT_TIMESTAMP, 
            COALESCE(CURRENT_USER(), 'SYSTEM_ADMIN')
        );
    END IF;
END //

DELIMITER ;
