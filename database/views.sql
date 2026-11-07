-- =============================================================================
-- SMART EMPLOYEE MANAGEMENT SYSTEM – PAYROLL & ATTENDANCE
-- Database Views: database/views.sql
-- =============================================================================

USE `smart_employee_db`;

DROP VIEW IF EXISTS `vw_employee_payroll_summary`;
DROP VIEW IF EXISTS `vw_monthly_attendance_summary`;
DROP VIEW IF EXISTS `vw_employee_details`;

-- -----------------------------------------------------------------------------
-- View 1: vw_employee_details
-- Purpose: Denormalized employee profile with department details and account status.
-- -----------------------------------------------------------------------------
CREATE VIEW `vw_employee_details` AS
SELECT 
    e.employee_id,
    e.employee_name,
    e.email,
    e.phone,
    e.address,
    e.gender,
    e.date_of_birth,
    e.joining_date,
    e.department_id,
    COALESCE(d.department_name, 'Unassigned') AS department_name,
    e.designation,
    e.basic_salary,
    e.employment_status,
    u.user_id,
    u.username,
    u.role,
    e.created_at
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
LEFT JOIN users u ON e.employee_id = u.employee_id;

-- -----------------------------------------------------------------------------
-- View 2: vw_monthly_attendance_summary
-- Purpose: Aggregates daily swipes per employee per month into attendance units.
-- -----------------------------------------------------------------------------
CREATE VIEW `vw_monthly_attendance_summary` AS
SELECT 
    a.employee_id,
    e.employee_name,
    d.department_name,
    MONTH(a.attendance_date) AS attendance_month,
    YEAR(a.attendance_date) AS attendance_year,
    COUNT(a.attendance_id) AS total_logged_days,
    SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present_count,
    SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) AS late_count,
    SUM(CASE WHEN a.status = 'Half Day' THEN 1 ELSE 0 END) AS half_day_count,
    SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent_count,
    ROUND(
        SUM(
            CASE 
                WHEN a.status = 'Present' THEN 1.0
                WHEN a.status = 'Late' THEN 1.0
                WHEN a.status = 'Half Day' THEN 0.5
                ELSE 0.0
            END
        ), 1
    ) AS effective_present_days
FROM attendance a
JOIN employees e ON a.employee_id = e.employee_id
LEFT JOIN departments d ON e.department_id = d.department_id
GROUP BY 
    a.employee_id, 
    e.employee_name, 
    d.department_name, 
    MONTH(a.attendance_date), 
    YEAR(a.attendance_date);

-- -----------------------------------------------------------------------------
-- View 3: vw_employee_payroll_summary
-- Purpose: Complete financial view joining payroll records with employee profile.
-- Gross Salary = basic_salary + allowances
-- Net Salary = Gross Salary - deductions
-- -----------------------------------------------------------------------------
CREATE VIEW `vw_employee_payroll_summary` AS
SELECT 
    p.payroll_id,
    p.employee_id,
    e.employee_name,
    e.email,
    e.phone,
    e.address,
    e.joining_date,
    COALESCE(d.department_name, 'Unassigned') AS department_name,
    e.designation,
    p.month,
    p.year,
    p.basic_salary,
    p.allowances,
    (p.basic_salary + p.allowances) AS gross_salary,
    p.deductions,
    p.working_days,
    p.present_days,
    p.net_salary,
    p.payment_status,
    p.generated_date
FROM payroll p
JOIN employees e ON p.employee_id = e.employee_id
LEFT JOIN departments d ON e.department_id = d.department_id;
