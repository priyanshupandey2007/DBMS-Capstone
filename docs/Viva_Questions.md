# College DBMS Viva Voce Master Guide (45+ Questions & Answers)
**Project Title:** Smart Employee Management System – Payroll & Attendance  
**Organization:** TechNova Solutions Pvt. Ltd.  
**Tech Stack:** Python 3.12, Flask, MySQL 8.x / MariaDB 10.4+, InnoDB, Jinja2  
**Target Examination:** 3rd Semester B.Tech / B.E. / BCA / MCA Database Management Systems  

---

## SECTION 1: CORE DBMS CONCEPTS & RELATIONAL MODEL

### Q1. What is a DBMS, and why did you choose MySQL 8 for this capstone?
**Answer:** A Database Management System (DBMS) is software that manages, manipulates, and secures structured data. We chose MySQL 8 with the InnoDB engine because:
1. It strictly enforces ACID properties.
2. It natively validates **CHECK constraints** (e.g., `basic_salary >= 0`, `end_date >= start_date`).
3. It supports foreign keys with cascade actions (`ON DELETE CASCADE`).
4. It provides advanced procedural SQL (Stored Procedures, Stored Functions, Triggers, Views).

### Q2. What are ACID properties? Show how your application implements them.
**Answer:**
- **Atomicity (All or Nothing):** Implemented in `admin_payroll_generate_all()` using `START TRANSACTION ... COMMIT` / `ROLLBACK`. If generating payroll for 12 employees fails on the 10th, all 9 previous records are rolled back.
- **Consistency:** Enforced by database schema constraints (Primary Keys, Foreign Keys, UNIQUE on `(employee_id, month, year)`, and CHECK constraints).
- **Isolation:** Handled by MySQL's default `REPEATABLE READ` transaction isolation level.
- **Durability:** Guaranteed by InnoDB Write-Ahead Logging (WAL redo log). Once committed, data survives power loss.

### Q3. Explain the difference between DDL, DML, DCL, and TCL.
**Answer:**
- **DDL (Data Definition Language):** Defines schema structure (`CREATE`, `ALTER`, `DROP`, `TRUNCATE`). Example: `CREATE TABLE employees...`
- **DML (Data Manipulation Language):** Manipulates rows (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). Example: `UPDATE employees SET basic_salary = 95000...`
- **DCL (Data Control Language):** Controls permissions (`GRANT`, `REVOKE`). Demonstrated in `database/access_control.sql`.
- **TCL (Transaction Control Language):** Controls transactions (`COMMIT`, `ROLLBACK`, `SAVEPOINT`). Demonstrated in bulk payroll generation.

### Q4. What is the difference between DROP and TRUNCATE?
**Answer:**
- `DROP` is DDL that deletes the entire table definition along with its data, indexes, and triggers from the database dictionary.
- `TRUNCATE` is DDL that quickly deallocates all table data pages and resets the `AUTO_INCREMENT` counter to 1, while preserving the table schema.

---

## SECTION 2: NORMALIZATION (1NF, 2NF, 3NF, BCNF)

### Q5. What is Normalization? Why is it crucial?
**Answer:** Normalization is the systematic technique of organizing relational database tables to minimize data redundancy and eliminate insertion, update, and deletion anomalies.

### Q6. Walk through the normalization of this application from Unnormalized (UNF) to 3NF.
**Answer:**
1. **UNF (Unnormalized Form):**
   A single flat spreadsheet table: `Emp_ID, Emp_Name, Department_Name, Dept_Description, Designation, Basic_Salary, Month, Year, Present_Days, Net_Salary`.
   *Problem:* Redundant department description stored on every employee row; multiple payroll records per employee.
2. **1NF (First Normal Form):**
   - Ensure every attribute contains atomic (single, indivisible) values.
   - Eliminate repeating groups and assign Primary Keys (`employee_id`, `payroll_id`).
3. **2NF (Second Normal Form):**
   - Must be in 1NF.
   - Eliminate Partial Dependencies (every non-prime attribute must depend on the whole Primary Key, not part of a composite key).
   - In `payroll`, attributes like `net_salary` depend on `(employee_id, month, year)`. Employee's personal details (`date_of_birth`, `phone`) depend solely on `employee_id`, so they are isolated in `employees`.
4. **3NF (Third Normal Form):**
   - Must be in 2NF.
   - Eliminate Transitive Dependencies (non-key attribute determining another non-key attribute: `X -> Y` and `Y -> Z`).
   - In `employees`: `employee_id -> department_id -> department_name, description`.
   - Solution: Extract `departments` into an independent table with `department_id` as Primary Key, leaving only a Foreign Key `department_id` inside `employees`.

### Q7. What functional dependencies exist in your database?
**Answer:**
- `departments`: `department_id -> department_name, description`
- `employees`: `employee_id -> employee_name, email, phone, gender, joining_date, department_id, designation, basic_salary, employment_status`
- `attendance`: `(employee_id, attendance_date) -> check_in, check_out, status`
- `payroll`: `(employee_id, month, year) -> basic_salary, allowances, deductions, working_days, present_days, net_salary, payment_status`

---

## SECTION 3: KEYS & CONSTRAINTS

### Q8. What keys are present in your database?
**Answer:**
- **Primary Key (PK):** `employee_id`, `department_id`, `payroll_id`, `leave_id`, `attendance_id`, `user_id`. Uniquely identifies each row, non-null.
- **Candidate Key:** `email` in `employees`, `username` in `users`, `department_name` in `departments`.
- **Foreign Key (FK):** `employees.department_id -> departments.department_id`, `users.employee_id -> employees.employee_id`.
- **Composite Unique Key:** `attendance(employee_id, attendance_date)` and `payroll(employee_id, month, year)`.

### Q9. What does `ON DELETE CASCADE` do, and where is it used?
**Answer:** `ON DELETE CASCADE` automatically deletes dependent child rows when the parent row is deleted. In our schema, deleting an employee from `employees` cascades to purge their linked records in `users`, `attendance`, `leave_requests`, and `payroll`.

### Q10. What is a Soft Delete vs Hard Delete?
**Answer:**
- **Hard Delete:** Executes `DELETE FROM employees WHERE employee_id = X`, which permanently purges the row via database cascade.
- **Soft Delete:** Executes `UPDATE employees SET employment_status = 'Inactive' WHERE employee_id = X`. The historical payroll and attendance remain intact, but the employee is blocked from logging in or marking attendance.

### Q11. Which CHECK constraints are enforced in your schema?
**Answer:**
1. `chk_emp_gender`: `gender IN ('Male', 'Female', 'Other')`
2. `chk_emp_salary_positive`: `basic_salary >= 0`
3. `chk_user_role`: `role IN ('Admin', 'Employee')`
4. `chk_att_status`: `status IN ('Present', 'Absent', 'Half Day', 'Late')`
5. `chk_att_time_order`: `check_out IS NULL OR check_in IS NULL OR check_out > check_in`
6. `chk_leave_dates`: `end_date >= start_date`
7. `chk_payroll_month`: `month BETWEEN 1 AND 12`

---

## SECTION 4: VIEWS, PROCEDURES, FUNCTIONS & TRIGGERS

### Q12. What is a Database View, and why did you create `vw_employee_payroll_summary`?
**Answer:** A View is a virtual table based on the stored result of an SQL statement. Benefits:
1. **Security:** Hides sensitive underlying tables from reporting users.
2. **Query Simplicity:** Pre-joins `payroll`, `employees`, and `departments` and calculates Gross Salary (`basic_salary + allowances`), so application queries remain clean (`SELECT * FROM vw_employee_payroll_summary WHERE month = 10`).

### Q13. What is the difference between a Stored Procedure and a Stored Function?
**Answer:**
| Feature | Stored Procedure (`PROCEDURE`) | Stored Function (`FUNCTION`) |
| :--- | :--- | :--- |
| **Return Value** | Returns zero, one, or multiple result sets via OUT parameters or SELECT | Must return exactly one scalar value using `RETURNS` |
| **SQL Invocation** | Called via `CALL proc_name(args)` | Called directly inside SQL queries (`SELECT fn_net_salary(...)`) |
| **Side Effects** | Can execute DML, DDL, and commit transactions | Typically restricted to deterministic read-only calculations |

### Q14. Explain your user-defined function `fn_working_days(month, year)`.
**Answer:** It loops through every calendar day from `1` to `DAY(LAST_DAY(date))` and checks `DAYOFWEEK(date) != 1` (where 1 = Sunday in MySQL). It returns the exact count of working days in that month, excluding all Sundays.

### Q15. Explain your stored procedure `sp_calculate_monthly_payroll`.
**Answer:** It accepts `(emp_id, month, year, allowances, deductions)`. It calculates working days via `fn_working_days()`, attendance units via `fn_total_present_days()`, prorates basic pay `(basic / working_days) * present_days`, evaluates net pay via `fn_net_salary()`, and inserts or updates the `payroll` record.

### Q16. What Triggers are implemented in this project?
**Answer:**
1. `trg_attendance_before_insert`: Validates BEFORE insert on `attendance`. Blocks future dates (`attendance_date > CURRENT_DATE`), dates before employee's `joining_date`, and attendance for inactive employees using `SIGNAL SQLSTATE '45000'`.
2. `trg_payroll_before_insert`: Blocks duplicate payroll generation and periods preceding joining date.
3. `trg_employees_after_salary_update`: Fires AFTER update on `employees`. Whenever `OLD.basic_salary <> NEW.basic_salary`, it automatically records `(employee_id, old_salary, new_salary, changed_at, changed_by)` into `salary_audit`.

---

## SECTION 5: JOINS & SUBQUERIES

### Q17. Explain the difference between INNER, LEFT, RIGHT, and FULL OUTER JOIN.
**Answer:**
- **INNER JOIN:** Returns rows with matching keys in BOTH tables.
- **LEFT OUTER JOIN:** Returns all rows from the left table; unmatched right-side columns return `NULL`.
- **RIGHT OUTER JOIN:** Returns all rows from the right table; unmatched left-side columns return `NULL`.
- **FULL OUTER JOIN:** Returns all rows from both tables. (Since MySQL lacks a native `FULL OUTER JOIN` keyword, we emulate it via `LEFT JOIN UNION RIGHT JOIN`).

### Q18. What is the difference between `WHERE` and `HAVING`?
**Answer:** `WHERE` filters individual rows **before** aggregation; `HAVING` filters aggregated groups **after** `GROUP BY`.
- Example from Report 9: `GROUP BY department_name HAVING AVG(basic_salary) >= 60000.00`.

### Q19. What is a Correlated Subquery?
**Answer:** A subquery where the inner query references attributes from the outer query. It evaluates once for every candidate row evaluated by the outer query.
- Example from Report 8 (Highest-paid employee per department): `WHERE e.basic_salary = (SELECT MAX(basic_salary) FROM employees sub WHERE sub.department_id = e.department_id)`.

### Q20. What is the performance difference between `EXISTS` and `IN`?
**Answer:** `EXISTS` terminates as soon as the first matching row is found (short-circuit boolean evaluation), whereas `IN` evaluates and gathers the entire result set before testing membership.

---

## SECTION 6: APPLICATION SECURITY & ARCHITECTURE

### Q21. How does your backend prevent SQL Injection?
**Answer:** Every SQL query uses raw parameterized placeholders (`%s`) passed to `cursor.execute(sql, params)`. String formatting (e.g. `f"SELECT ... {input}"`) is strictly prohibited. The database driver transmits query text and data values in separate protocol packets, making payload injection impossible.

### Q22. How are passwords stored and authenticated?
**Answer:** Passwords are never stored in plain text. They are hashed using `werkzeug.security.generate_password_hash` (Scrypt with salt) and authenticated via `check_password_hash`.

### Q23. How is Role-Based Access Control (RBAC) and Data Isolation enforced?
**Answer:**
- **RBAC:** `@admin_required` decorator inspects `session['role'] == 'Admin'`.
- **Data Isolation:** Employees can only ever query by `session['employee_id']`. If an employee tries to access `/payroll/<id>/slip` belonging to another employee ID, the route compares `session['employee_id'] != slip['employee_id']` and returns `403 Forbidden`.

### Q24. What is the purpose of database indexes, and where did you create them?
**Answer:** Indexes use B-Trees to avoid slow full-table scans. We created indexes on:
- `employees(department_id)`: speeds up foreign key joins.
- `employees(email)`: ensures fast unique lookups.
- `attendance(employee_id, attendance_date)`: speeds up swipe lookups and enforces uniqueness.
- `payroll(employee_id, year, month)`: speeds up monthly history queries.

