-- =============================================================================
-- SMART EMPLOYEE MANAGEMENT SYSTEM – DYNAMIC AUDIT & ACTIVITY LOG
-- Tracks additions, removals (hard deletes), and deactivations (soft deletes)
-- =============================================================================

USE `smart_employee_db`;

CREATE TABLE IF NOT EXISTS `employee_activity_log` (
    `log_id` INT AUTO_INCREMENT PRIMARY KEY,
    `action_type` VARCHAR(50) NOT NULL, -- 'USER_ADDED', 'USER_REMOVED', 'USER_DEACTIVATED', 'USER_ACTIVATED', 'USER_UPDATED'
    `employee_id` INT NULL,
    `employee_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NULL,
    `department_id` INT NULL,
    `department_name` VARCHAR(100) NULL,
    `designation` VARCHAR(100) NULL,
    `basic_salary` DECIMAL(10,2) NULL,
    `details` TEXT NULL,
    `performed_by` VARCHAR(100) DEFAULT 'Admin',
    `logged_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trigger for Add Employee
DROP TRIGGER IF EXISTS `trg_employees_after_insert`;
DELIMITER //
CREATE TRIGGER `trg_employees_after_insert`
AFTER INSERT ON `employees`
FOR EACH ROW
BEGIN
    DECLARE v_dept_name VARCHAR(100);
    SELECT department_name INTO v_dept_name FROM departments WHERE department_id = NEW.department_id;
    INSERT INTO `employee_activity_log` (
        `action_type`, `employee_id`, `employee_name`, `email`,
        `department_id`, `department_name`, `designation`, `basic_salary`,
        `details`, `performed_by`, `logged_at`
    ) VALUES (
        'USER_ADDED', NEW.employee_id, NEW.employee_name, NEW.email,
        NEW.department_id, COALESCE(v_dept_name, 'Unassigned'), NEW.designation, NEW.basic_salary,
        CONCAT('New employee onboarded with designation "', NEW.designation, '" and basic salary ₹', FORMAT(NEW.basic_salary, 2)),
        'Admin', CURRENT_TIMESTAMP
    );
END //
DELIMITER ;

-- Trigger for Remove Employee (Hard Delete)
DROP TRIGGER IF EXISTS `trg_employees_before_delete`;
DELIMITER //
CREATE TRIGGER `trg_employees_before_delete`
BEFORE DELETE ON `employees`
FOR EACH ROW
BEGIN
    DECLARE v_dept_name VARCHAR(100);
    SELECT department_name INTO v_dept_name FROM departments WHERE department_id = OLD.department_id;
    INSERT INTO `employee_activity_log` (
        `action_type`, `employee_id`, `employee_name`, `email`,
        `department_id`, `department_name`, `designation`, `basic_salary`,
        `details`, `performed_by`, `logged_at`
    ) VALUES (
        'USER_REMOVED', OLD.employee_id, OLD.employee_name, OLD.email,
        OLD.department_id, COALESCE(v_dept_name, 'Unassigned'), OLD.designation, OLD.basic_salary,
        CONCAT('Employee permanently removed from system via ON DELETE CASCADE. Prior status: ', OLD.employment_status),
        'Admin', CURRENT_TIMESTAMP
    );
END //
DELIMITER ;

-- Trigger for Status Toggle (Soft Delete / Reactivation)
DROP TRIGGER IF EXISTS `trg_employees_after_status_update`;
DELIMITER //
CREATE TRIGGER `trg_employees_after_status_update`
AFTER UPDATE ON `employees`
FOR EACH ROW
BEGIN
    DECLARE v_dept_name VARCHAR(100);
    IF OLD.employment_status <> NEW.employment_status THEN
        SELECT department_name INTO v_dept_name FROM departments WHERE department_id = NEW.department_id;
        INSERT INTO `employee_activity_log` (
            `action_type`, `employee_id`, `employee_name`, `email`,
            `department_id`, `department_name`, `designation`, `basic_salary`,
            `details`, `performed_by`, `logged_at`
        ) VALUES (
            CASE WHEN NEW.employment_status = 'Inactive' THEN 'USER_DEACTIVATED' ELSE 'USER_ACTIVATED' END,
            NEW.employee_id, NEW.employee_name, NEW.email,
            NEW.department_id, COALESCE(v_dept_name, 'Unassigned'), NEW.designation, NEW.basic_salary,
            CONCAT('Employment status changed from ', OLD.employment_status, ' to ', NEW.employment_status, ' (Soft-delete / Reactivation)'),
            'Admin', CURRENT_TIMESTAMP
        );
    END IF;
END //
DELIMITER ;

-- Populate initial onboarding log for existing employees if table is empty
INSERT INTO `employee_activity_log` (`action_type`, `employee_id`, `employee_name`, `email`, `department_id`, `department_name`, `designation`, `basic_salary`, `details`, `performed_by`, `logged_at`)
SELECT 
    'USER_ADDED',
    e.employee_id,
    e.employee_name,
    e.email,
    e.department_id,
    COALESCE(d.department_name, 'Unassigned'),
    e.designation,
    e.basic_salary,
    CONCAT('Initial corporate roster onboarding. Designation: ', e.designation),
    'SYSTEM',
    CONCAT(e.joining_date, ' 09:00:00')
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
WHERE NOT EXISTS (SELECT 1 FROM employee_activity_log LIMIT 1);
