# Smart Employee Management System – DBMS Lab SQL Execution Outputs
**Database Engine:** MySQL 8.x / MariaDB 10.4+ (InnoDB Engine, utf8mb4)
**Target Schema:** `smart_employee_db` in Third Normal Form (3NF)
**Document Purpose:** Academic reference of real executed outputs for 3rd-semester DBMS laboratory examination and viva presentation.

---

## 1. DDL: Practice Table Creation, Alteration, Truncation & Drop
**Concept:** Demonstrates DDL operations (CREATE, ALTER, TRUNCATE, DROP) on temporary practice entity.

```sql
CREATE TABLE IF NOT EXISTS demo_practice_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sample_text VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE demo_practice_table ADD COLUMN notes VARCHAR(100) NULL;
TRUNCATE TABLE demo_practice_table;
DROP TABLE IF EXISTS demo_practice_table;
```

**Execution Result:** `Query OK, 0 rows affected (DDL sequence passed)`


## 2. DML: Aggregates & Salary Summary Statistics
**Concept:** Demonstrates COUNT, SUM, AVG, MIN, MAX over company employees.

```sql
SELECT 
    COUNT(employee_id) AS total_employees,
    MIN(basic_salary) AS minimum_salary,
    MAX(basic_salary) AS maximum_salary,
    ROUND(AVG(basic_salary), 2) AS average_salary,
    SUM(basic_salary) AS total_monthly_salary_budget
FROM employees
WHERE employment_status = 'Active';
```

**Query Output (1 rows):**

| total_employees | minimum_salary | maximum_salary | average_salary | total_monthly_salary_budget |
| --- | --- | --- | --- | --- |
| 11 | 45000.00 | 110000.00 | 68818.18 | 757000.00 |


## 3. RELATIONAL ALGEBRA: INNER JOIN (Employees & Departments)
**Concept:** Returns matching records present in both employees and departments.

```sql
SELECT 
    e.employee_id,
    e.employee_name,
    e.designation,
    d.department_name
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id
LIMIT 5;
```

**Query Output (5 rows):**

| employee_id | employee_name | designation | department_name |
| --- | --- | --- | --- |
| 1 | Aarav Sharma | Lead Full Stack Architect | Engineering & IT |
| 2 | Priya Nair | Senior Backend Engineer | Engineering & IT |
| 3 | Rohan Verma | Frontend UI/UX Specialist | Engineering & IT |
| 10 | Meera Iyer | QA Automation Engineer | Engineering & IT |
| 5 | Vikram Malhotra | Chief Financial Controller | Finance & Accounts |


## 4. RELATIONAL ALGEBRA: LEFT OUTER JOIN
**Concept:** Returns all employees even if unassigned or without user login accounts.

```sql
SELECT 
    e.employee_id,
    e.employee_name,
    COALESCE(d.department_name, 'Unassigned') AS department,
    COALESCE(u.username, 'No Login') AS username,
    COALESCE(u.role, 'None') AS role
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
LEFT JOIN users u ON e.employee_id = u.employee_id
LIMIT 5;
```

**Query Output (5 rows):**

| employee_id | employee_name | department | username | role |
| --- | --- | --- | --- | --- |
| 1 | Aarav Sharma | Engineering & IT | emp101 | Employee |
| 2 | Priya Nair | Engineering & IT | emp102 | Employee |
| 3 | Rohan Verma | Engineering & IT | emp103 | Employee |
| 4 | Ananya Deshmukh | Human Resources | emp104 | Employee |
| 5 | Vikram Malhotra | Finance & Accounts | emp105 | Employee |


## 5. RELATIONAL ALGEBRA: Simulated FULL OUTER JOIN (LEFT JOIN UNION RIGHT JOIN)
**Concept:** Standard relational algebra emulation of FULL OUTER JOIN in MySQL.

```sql
SELECT e.employee_name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
UNION
SELECT e.employee_name, d.department_name
FROM employees e
RIGHT JOIN departments d ON e.department_id = d.department_id
LIMIT 6;
```

**Query Output (6 rows):**

| employee_name | department_name |
| --- | --- |
| Aarav Sharma | Engineering & IT |
| Priya Nair | Engineering & IT |
| Rohan Verma | Engineering & IT |
| Ananya Deshmukh | Human Resources |
| Vikram Malhotra | Finance & Accounts |
| Neha Kulkarni | Finance & Accounts |


## 6. GROUP BY & HAVING Filter
**Concept:** Filters post-aggregated department groups with average salary >= 65,000.

```sql
SELECT 
    d.department_name,
    COUNT(e.employee_id) AS total_staff,
    ROUND(AVG(e.basic_salary), 2) AS avg_salary
FROM departments d
INNER JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_name
HAVING avg_salary >= 65000.00;
```

**Query Output (3 rows):**

| department_name | total_staff | avg_salary |
| --- | --- | --- |
| Engineering & IT | 4 | 70750.00 |
| Finance & Accounts | 2 | 84000.00 |
| Operations & Support | 2 | 66000.00 |


## 7. SINGLE-ROW SUBQUERY: Above Company Average Earners
**Concept:** Inner query returns scalar average; outer query filters candidates exceeding it.

```sql
SELECT employee_id, employee_name, designation, basic_salary
FROM employees
WHERE basic_salary > (
    SELECT AVG(basic_salary) FROM employees WHERE employment_status = 'Active'
)
ORDER BY basic_salary DESC
LIMIT 5;
```

**Query Output (5 rows):**

| employee_id | employee_name | designation | basic_salary |
| --- | --- | --- | --- |
| 5 | Vikram Malhotra | Chief Financial Controller | 110000.00 |
| 1 | Aarav Sharma | Lead Full Stack Architect | 95000.00 |
| 2 | Priya Nair | Senior Backend Engineer | 78000.00 |
| 9 | Rahul Joshi | DevOps & IT Admin | 72000.00 |
| 4 | Ananya Deshmukh | Senior HR Business Partner | 70000.00 |


## 8. CORRELATED SUBQUERY: Highest-Paid Employee per Department
**Concept:** Inner query references outer query (sub_e.department_id = e.department_id).

```sql
SELECT e.employee_id, e.employee_name, d.department_name, e.basic_salary
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.basic_salary = (
    SELECT MAX(sub_e.basic_salary)
    FROM employees sub_e
    WHERE sub_e.department_id = e.department_id
)
ORDER BY e.basic_salary DESC;
```

**Query Output (5 rows):**

| employee_id | employee_name | department_name | basic_salary |
| --- | --- | --- | --- |
| 5 | Vikram Malhotra | Finance & Accounts | 110000.00 |
| 1 | Aarav Sharma | Engineering & IT | 95000.00 |
| 9 | Rahul Joshi | Operations & Support | 72000.00 |
| 4 | Ananya Deshmukh | Human Resources | 70000.00 |
| 7 | Aditya Sen | Marketing & Sales | 67000.00 |


## 9. SUBQUERY WITH NOT EXISTS: Perfect Attendance Staff
**Concept:** Correlated existence test retrieving active staff with zero absence records.

```sql
SELECT e.employee_id, e.employee_name, d.department_name, e.designation
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
WHERE e.employment_status = 'Active'
  AND NOT EXISTS (
      SELECT 1 FROM attendance a 
      WHERE a.employee_id = e.employee_id AND a.status = 'Absent'
  )
LIMIT 5;
```

**Query Output (5 rows):**

| employee_id | employee_name | department_name | designation |
| --- | --- | --- | --- |
| 1 | Aarav Sharma | Engineering & IT | Lead Full Stack Architect |
| 3 | Rohan Verma | Engineering & IT | Frontend UI/UX Specialist |
| 4 | Ananya Deshmukh | Human Resources | Senior HR Business Partner |
| 5 | Vikram Malhotra | Finance & Accounts | Chief Financial Controller |
| 7 | Aditya Sen | Marketing & Sales | Growth Marketing Lead |


## 10. DATABASE STORED PROCEDURES & USER-DEFINED FUNCTIONS
**Concept:** Invocation of fn_working_days(11, 2026) and fn_net_salary(50000, 5000, 2500).

```sql
SELECT 
    fn_working_days(11, 2026) AS working_days_nov_2026,
    fn_net_salary(50000.00, 5000.00, 2500.00) AS calculated_net_salary;
```

**Query Output (1 rows):**

| working_days_nov_2026 | calculated_net_salary |
| --- | --- |
| 25 | 52500.00 |
