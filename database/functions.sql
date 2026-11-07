-- =============================================================================
-- SMART EMPLOYEE MANAGEMENT SYSTEM – PAYROLL & ATTENDANCE
-- Database User-Defined Functions (UDFs): database/functions.sql
-- =============================================================================
-- VIVA NOTE ON FUNCTIONS:
-- Stored Functions return a single scalar value and can be called directly inside
-- SQL expressions (e.g., SELECT fn_net_salary(50000, 5000, 2000);).
-- Unlike procedures, functions must declare DETERMINISTIC or READS SQL DATA.
-- =============================================================================

USE `smart_employee_db`;

DROP FUNCTION IF EXISTS `fn_net_salary`;
DROP FUNCTION IF EXISTS `fn_working_days`;
DROP FUNCTION IF EXISTS `fn_total_present_days`;

DELIMITER //

-- -----------------------------------------------------------------------------
-- Function 1: fn_net_salary
-- Formula: Gross Salary (Basic + Allowances) - Deductions
-- Parameter:
--   p_basic: Basic base pay
--   p_allowances: Sum of HRA, DA, bonus, travel allowances
--   p_deductions: Sum of PF, tax, unpaid leave penalty
-- Returns: DECIMAL(10,2) Net payable salary
-- -----------------------------------------------------------------------------
CREATE FUNCTION `fn_net_salary`(
    p_basic DECIMAL(10,2),
    p_allowances DECIMAL(10,2),
    p_deductions DECIMAL(10,2)
) 
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_gross DECIMAL(10,2);
    DECLARE v_net DECIMAL(10,2);
    
    -- Ensure non-null values
    SET p_basic = COALESCE(p_basic, 0.00);
    SET p_allowances = COALESCE(p_allowances, 0.00);
    SET p_deductions = COALESCE(p_deductions, 0.00);
    
    SET v_gross = p_basic + p_allowances;
    SET v_net = v_gross - p_deductions;
    
    -- Salary cannot be negative
    IF v_net < 0.00 THEN
        SET v_net = 0.00;
    END IF;
    
    RETURN v_net;
END //

-- -----------------------------------------------------------------------------
-- Function 2: fn_working_days
-- Purpose: Calculates total eligible working days in a given month/year
-- Rule: All calendar days in the month EXCEPT Sundays (Day of week = 1).
-- -----------------------------------------------------------------------------
CREATE FUNCTION `fn_working_days`(
    p_month INT,
    p_year INT
)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE v_days_in_month INT;
    DECLARE v_day_counter INT DEFAULT 1;
    DECLARE v_working_count INT DEFAULT 0;
    DECLARE v_current_date DATE;
    DECLARE v_first_of_month DATE;
    
    -- Build first date of month
    SET v_first_of_month = STR_TO_DATE(CONCAT(p_year, '-', LPAD(p_month, 2, '0'), '-01'), '%Y-%m-%d');
    SET v_days_in_month = DAY(LAST_DAY(v_first_of_month));
    
    -- Loop through all days in the month
    WHILE v_day_counter <= v_days_in_month DO
        SET v_current_date = STR_TO_DATE(CONCAT(p_year, '-', LPAD(p_month, 2, '0'), '-', LPAD(v_day_counter, 2, '0')), '%Y-%m-%d');
        -- In MySQL DAYOFWEEK: 1 = Sunday, 2 = Monday, ..., 7 = Saturday
        IF DAYOFWEEK(v_current_date) <> 1 THEN
            SET v_working_count = v_working_count + 1;
        END IF;
        SET v_day_counter = v_day_counter + 1;
    END WHILE;
    
    RETURN v_working_count;
END //

-- -----------------------------------------------------------------------------
-- Function 3: fn_total_present_days
-- Purpose: Computes effective attendance units for an employee in a given month
-- Formula:
--   Present: 1.0 day
--   Late:    1.0 day
--   Half Day: 0.5 day
--   Absent:  0.0 day
-- -----------------------------------------------------------------------------
CREATE FUNCTION `fn_total_present_days`(
    p_employee_id INT,
    p_month INT,
    p_year INT
)
RETURNS DECIMAL(4,1)
READS SQL DATA
BEGIN
    DECLARE v_effective_days DECIMAL(4,1) DEFAULT 0.0;
    
    SELECT COALESCE(
        SUM(
            CASE 
                WHEN status = 'Present' THEN 1.0
                WHEN status = 'Late' THEN 1.0
                WHEN status = 'Half Day' THEN 0.5
                ELSE 0.0
            END
        ), 0.0
    ) INTO v_effective_days
    FROM attendance
    WHERE employee_id = p_employee_id
      AND MONTH(attendance_date) = p_month
      AND YEAR(attendance_date) = p_year;
      
    RETURN v_effective_days;
END //

DELIMITER ;

