-- =============================================================================
-- SMART EMPLOYEE MANAGEMENT SYSTEM – PAYROLL & ATTENDANCE
-- College DBMS Laboratory & Viva Master SQL Queries
-- File: database/dbms_lab_queries.sql
-- =============================================================================
-- Comprehensive reference of real, working SQL statements with technical
-- explanations for 3rd-semester viva questions, external examiners, and lab demos.
-- =============================================================================

USE `smart_employee_db`;

-- =============================================================================
-- SECTION 1: DATA DEFINITION LANGUAGE (DDL)
-- Concepts: Schema manipulation, adding columns, modifying datatypes, constraints.
-- =============================================================================

-- 1.1 Add a new column to employees table
-- Viva Question: How do you alter a table structure in MySQL?
ALTER TABLE `employees` 
ADD COLUMN `emergency_contact` VARCHAR(20) NULL AFTER `phone`;

-- 1.2 Modify existing column definition (e.g., increase address length)
ALTER TABLE `employees` 
MODIFY COLUMN `address` VARCHAR(300) NULL;

-- 1.3 Add a new check constraint
-- ALTER TABLE `employees` ADD CONSTRAINT `chk_phone_length` CHECK (CHAR_LENGTH(`phone`) >= 10);

-- Clean up lab column so schema remains canonical
ALTER TABLE `employees` DROP COLUMN `emergency_contact`;


-- =============================================================================
-- SECTION 2: DATA MANIPULATION LANGUAGE (DML)
-- Concepts: INSERT, UPDATE, DELETE with CASCADE demonstration.
-- =============================================================================

-- 2.1 Inserting a record with parameterized values
INSERT INTO `departments` (`department_name`, `description`) 
VALUES ('Research & Innovation', 'Core R&D laboratory for generative AI.');

-- 2.2 Updating specific fields using WHERE clause (prevents accidental table-wide updates)
UPDATE `employees`
SET `phone` = '+91 98765 99999'
WHERE `employee_id` = 1;

-- 2.3 Demonstrate ON DELETE CASCADE:
-- Deleting an employee automatically cascades and purges their linked records
-- in `users`, `attendance`, `leave_requests`, and `payroll`.
-- Example demonstration:
-- DELETE FROM `employees` WHERE `employee_id` = 12;


-- =============================================================================
-- SECTION 3: OPERATORS, PATTERN MATCHING & NULL HANDLING
-- Concepts: LIKE (wildcards % and _), BETWEEN, IN, IS NULL, CASE expression.
-- =============================================================================

-- 3.1 Pattern Matching with LIKE
-- Find all employees whose names start with 'A' or have 'Sharma' anywhere
SELECT employee_id, employee_name, email, designation 
FROM employees 
WHERE employee_name LIKE 'A%' OR employee_name LIKE '%Sharma%';

-- 3.2 BETWEEN and IN Operators
-- Find employees joining between 2021 and 2023 with specific designations
SELECT employee_id, employee_name, designation, joining_date, basic_salary
FROM employees
WHERE joining_date BETWEEN '2021-01-01' AND '2023-12-31'
  AND designation IN ('Lead Full Stack Architect', 'Senior Backend Engineer', 'Frontend UI/UX Specialist');

-- 3.3 Handling NULLs with COALESCE / IFNULL
SELECT 
    e.employee_name,
    COALESCE(e.phone, 'Phone not provided') AS contact_phone,
    COALESCE(d.department_name, 'No Department Assigned') AS dept_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id;


-- =============================================================================
-- SECTION 4: AGGREGATE FUNCTIONS & MATHEMATICAL CALCULATIONS
-- Concepts: COUNT(), SUM(), AVG(), MIN(), MAX(), ROUND().
-- =============================================================================

-- 4.1 Company-wide Salary Statistics
SELECT 
    COUNT(employee_id) AS total_employees,
    MIN(basic_salary) AS minimum_salary,
    MAX(basic_salary) AS maximum_salary,
    ROUND(AVG(basic_salary), 2) AS average_salary,
    SUM(basic_salary) AS total_monthly_salary_budget
FROM employees
WHERE employment_status = 'Active';

-- 4.2 Attendance Metric Counts
SELECT 
    COUNT(*) AS total_records,
    SUM(status = 'Present') AS present_count,
    SUM(status = 'Late') AS late_count,
    SUM(status = 'Half Day') AS half_day_count,
    SUM(status = 'Absent') AS absent_count
FROM attendance;


-- =============================================================================
-- SECTION 5: JOINS (RELATIONAL ALGEBRA IMPLEMENTATION)
-- Concepts: INNER JOIN, LEFT OUTER JOIN, RIGHT OUTER JOIN, FULL OUTER JOIN.
-- =============================================================================

-- 5.1 INNER JOIN: Returns matching rows present in BOTH tables
-- Question: Which employees are actively mapped to an existing department?
SELECT 
    e.employee_id,
    e.employee_name,
    e.designation,
    d.department_name
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id;

-- 5.2 LEFT OUTER JOIN: Returns ALL rows from left table (employees),
-- even if there is no corresponding row in right table (departments/users).
SELECT 
    e.employee_id,
    e.employee_name,
    COALESCE(d.department_name, 'Unassigned') AS department,
    u.username,
    COALESCE(u.role, 'No Login Account') AS system_role
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
LEFT JOIN users u ON e.employee_id = u.employee_id;

-- 5.3 RIGHT OUTER JOIN: Returns ALL rows from right table (departments),
-- including departments that have ZERO employees currently assigned.
SELECT 
    d.department_id,
    d.department_name,
    e.employee_name,
    e.designation
FROM employees e
RIGHT JOIN departments d ON e.department_id = d.department_id;

-- 5.4 FULL OUTER JOIN (Simulated in MySQL via UNION of LEFT & RIGHT JOINS)
-- Viva Note: MySQL does not natively have 'FULL OUTER JOIN' keyword, so UNION
-- of LEFT and RIGHT joins is standard relational algebra solution!
SELECT 
    e.employee_id,
    e.employee_name,
    d.department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
UNION
SELECT 
    e.employee_id,
    e.employee_name,
    d.department_name
FROM employees e
RIGHT JOIN departments d ON e.department_id = d.department_id;


-- =============================================================================
-- SECTION 6: GROUP BY & HAVING CLAUSES
-- Concepts: Partitioning rows into aggregation groups and filtering aggregated results.
-- =============================================================================

-- 6.1 Department-wise Employee Headcount and Average Salary
SELECT 
    COALESCE(d.department_name, 'Unassigned') AS department_name,
    COUNT(e.employee_id) AS total_staff,
    ROUND(AVG(e.basic_salary), 2) AS avg_salary,
    MIN(e.basic_salary) AS lowest_salary,
    MAX(e.basic_salary) AS highest_salary
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
GROUP BY d.department_name;

-- 6.2 Filter Grouped Data using HAVING
-- Viva Question: What is the difference between WHERE and HAVING?
-- Answer: WHERE filters individual rows BEFORE grouping; HAVING filters aggregated groups AFTER GROUP BY!
SELECT 
    d.department_name,
    COUNT(e.employee_id) AS total_staff,
    ROUND(AVG(e.basic_salary), 2) AS avg_salary
FROM departments d
INNER JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_name
HAVING avg_salary >= 65000.00;


-- =============================================================================
-- SECTION 7: SUBQUERIES (NESTED & CORRELATED)
-- Concepts: Single-row, multi-row, correlated subqueries, and EXISTS/NOT EXISTS.
-- =============================================================================

-- 7.1 Single-Row Subquery: Find employees earning ABOVE overall company average
SELECT 
    employee_id,
    employee_name,
    designation,
    basic_salary
FROM employees
WHERE basic_salary > (
    SELECT AVG(basic_salary) 
    FROM employees 
    WHERE employment_status = 'Active'
)
ORDER BY basic_salary DESC;

-- 7.2 Multi-Row Subquery with IN: Employees who currently have PENDING leave requests
SELECT 
    employee_id,
    employee_name,
    email,
    designation
FROM employees
WHERE employee_id IN (
    SELECT DISTINCT employee_id 
    FROM leave_requests 
    WHERE leave_status = 'Pending'
);

-- 7.3 Correlated Subquery: Highest-paid employee in EACH department
-- Viva Note: The inner query executes once for every row processed by the outer query!
SELECT 
    e.employee_id,
    e.employee_name,
    e.department_id,
    d.department_name,
    e.basic_salary
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.basic_salary = (
    SELECT MAX(sub_e.basic_salary)
    FROM employees sub_e
    WHERE sub_e.department_id = e.department_id
)
ORDER BY e.basic_salary DESC;

-- 7.4 Subquery with NOT EXISTS: Find all employees who were NEVER absent
SELECT 
    e.employee_id,
    e.employee_name,
    e.designation
FROM employees e
WHERE NOT EXISTS (
    SELECT 1 
    FROM attendance a 
    WHERE a.employee_id = e.employee_id 
      AND a.status = 'Absent'
);


-- =============================================================================
-- SECTION 8: DATABASE TRANSACTIONS & ACID PROPERTIES
-- Concepts: Atomicity, Consistency, Isolation, Durability.
-- =============================================================================

-- Demonstration of Transaction with SAVEPOINT & ROLLBACK:
/*
START TRANSACTION;

-- Step 1: Update salary
UPDATE employees SET basic_salary = basic_salary + 5000 WHERE employee_id = 3;

-- Set a checkpoint
SAVEPOINT salary_boost;

-- Step 2: Tentative deduction
UPDATE employees SET basic_salary = basic_salary - 2000 WHERE employee_id = 3;

-- Undo step 2 back to checkpoint
ROLLBACK TO SAVEPOINT salary_boost;

-- Persist changes permanently
COMMIT;
*/

