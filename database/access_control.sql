-- =============================================================================
-- SMART EMPLOYEE MANAGEMENT SYSTEM – PAYROLL & ATTENDANCE
-- Database Access Control & Privilege Management
-- File: database/access_control.sql
-- =============================================================================
-- VIVA NOTE ON ACCESS CONTROL & PRIVILEGES:
-- Database security relies on Principle of Least Privilege (PoLP):
-- Users should be granted only the minimum database permissions necessary
-- to execute their specific job duties.
--
-- Roles Defined:
-- 1. hr_admin_user: Full DML & Execute privileges on operational tables and routines.
-- 2. employee_viewer: Read-only access restricted strictly to secure views (no base table access).
-- 3. report_user: Read-only access (SELECT) on all analytical reporting tables.
-- =============================================================================

USE `smart_employee_db`;

-- -----------------------------------------------------------------------------
-- 1. CLEANUP EXISTING DEMO USERS (Idempotency)
-- -----------------------------------------------------------------------------
DROP USER IF EXISTS 'hr_admin_user'@'localhost';
DROP USER IF EXISTS 'employee_viewer'@'localhost';
DROP USER IF EXISTS 'report_user'@'localhost';

-- -----------------------------------------------------------------------------
-- 2. CREATE DATABASE USERS WITH PASSWORDS
-- -----------------------------------------------------------------------------
CREATE USER 'hr_admin_user'@'localhost' IDENTIFIED BY 'HRAdmin@Secure2026';
CREATE USER 'employee_viewer'@'localhost' IDENTIFIED BY 'EmpViewer@2026';
CREATE USER 'report_user'@'localhost' IDENTIFIED BY 'ReportUser@2026';

-- -----------------------------------------------------------------------------
-- 3. GRANT PRIVILEGES
-- -----------------------------------------------------------------------------

-- 3.1 hr_admin_user: Full CRUD (SELECT, INSERT, UPDATE, DELETE) & Routine Execution
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_employee_db.employees TO 'hr_admin_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_employee_db.departments TO 'hr_admin_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_employee_db.attendance TO 'hr_admin_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_employee_db.leave_requests TO 'hr_admin_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_employee_db.payroll TO 'hr_admin_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_employee_db.users TO 'hr_admin_user'@'localhost';
GRANT SELECT ON smart_employee_db.salary_audit TO 'hr_admin_user'@'localhost';
GRANT EXECUTE ON smart_employee_db.* TO 'hr_admin_user'@'localhost';

-- 3.2 employee_viewer: Restricted View-Only Access
-- Security Principle: Users query abstract Views rather than underlying salary tables!
GRANT SELECT ON smart_employee_db.vw_employee_details TO 'employee_viewer'@'localhost';
GRANT SELECT ON smart_employee_db.vw_monthly_attendance_summary TO 'employee_viewer'@'localhost';
GRANT SELECT ON smart_employee_db.vw_employee_payroll_summary TO 'employee_viewer'@'localhost';

-- 3.3 report_user: Read-Only access for BI / Analytical Queries
GRANT SELECT ON smart_employee_db.* TO 'report_user'@'localhost';

-- Apply privilege updates immediately
FLUSH PRIVILEGES;

-- -----------------------------------------------------------------------------
-- 4. VERIFY GRANTS (For Viva Demonstration)
-- -----------------------------------------------------------------------------
SHOW GRANTS FOR 'hr_admin_user'@'localhost';
SHOW GRANTS FOR 'employee_viewer'@'localhost';
SHOW GRANTS FOR 'report_user'@'localhost';

-- -----------------------------------------------------------------------------
-- 5. REVOKE DEMONSTRATION (Example for examiner)
-- -----------------------------------------------------------------------------
-- REVOKE DELETE ON smart_employee_db.payroll FROM 'hr_admin_user'@'localhost';
-- FLUSH PRIVILEGES;

