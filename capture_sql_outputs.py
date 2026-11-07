"""
Execution script to run all DBMS Lab Queries and record formatted outputs
into docs/sql_outputs.md for the capstone viva portfolio.
"""
import os
import db

def capture_sql_outputs():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    sql_path = os.path.join(base_dir, 'database', 'dbms_lab_queries.sql')
    output_path = os.path.join(base_dir, 'docs', 'sql_outputs.md')

    with open(sql_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = [
        "# Smart Employee Management System – DBMS Lab SQL Execution Outputs",
        "**Database Engine:** MySQL 8.x / MariaDB 10.4+ (InnoDB Engine, utf8mb4)",
        "**Target Schema:** `smart_employee_db` in Third Normal Form (3NF)",
        "**Document Purpose:** Academic reference of real executed outputs for 3rd-semester DBMS laboratory examination and viva presentation.\n",
        "---"
    ]

    # Queries to execute and format
    lab_queries = [
        {
            'section': '1. DDL: Practice Table Creation, Alteration, Truncation & Drop',
            'desc': 'Demonstrates DDL operations (CREATE, ALTER, TRUNCATE, DROP) on temporary practice entity.',
            'sql': """CREATE TABLE IF NOT EXISTS demo_practice_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sample_text VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE demo_practice_table ADD COLUMN notes VARCHAR(100) NULL;
TRUNCATE TABLE demo_practice_table;
DROP TABLE IF EXISTS demo_practice_table;"""
        },
        {
            'section': '2. DML: Aggregates & Salary Summary Statistics',
            'desc': 'Demonstrates COUNT, SUM, AVG, MIN, MAX over company employees.',
            'sql': """SELECT 
    COUNT(employee_id) AS total_employees,
    MIN(basic_salary) AS minimum_salary,
    MAX(basic_salary) AS maximum_salary,
    ROUND(AVG(basic_salary), 2) AS average_salary,
    SUM(basic_salary) AS total_monthly_salary_budget
FROM employees
WHERE employment_status = 'Active';"""
        },
        {
            'section': '3. RELATIONAL ALGEBRA: INNER JOIN (Employees & Departments)',
            'desc': 'Returns matching records present in both employees and departments.',
            'sql': """SELECT 
    e.employee_id,
    e.employee_name,
    e.designation,
    d.department_name
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id
LIMIT 5;"""
        },
        {
            'section': '4. RELATIONAL ALGEBRA: LEFT OUTER JOIN',
            'desc': 'Returns all employees even if unassigned or without user login accounts.',
            'sql': """SELECT 
    e.employee_id,
    e.employee_name,
    COALESCE(d.department_name, 'Unassigned') AS department,
    COALESCE(u.username, 'No Login') AS username,
    COALESCE(u.role, 'None') AS role
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
LEFT JOIN users u ON e.employee_id = u.employee_id
LIMIT 5;"""
        },
        {
            'section': '5. RELATIONAL ALGEBRA: Simulated FULL OUTER JOIN (LEFT JOIN UNION RIGHT JOIN)',
            'desc': 'Standard relational algebra emulation of FULL OUTER JOIN in MySQL.',
            'sql': """SELECT e.employee_name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
UNION
SELECT e.employee_name, d.department_name
FROM employees e
RIGHT JOIN departments d ON e.department_id = d.department_id
LIMIT 6;"""
        },
        {
            'section': '6. GROUP BY & HAVING Filter',
            'desc': 'Filters post-aggregated department groups with average salary >= 65,000.',
            'sql': """SELECT 
    d.department_name,
    COUNT(e.employee_id) AS total_staff,
    ROUND(AVG(e.basic_salary), 2) AS avg_salary
FROM departments d
INNER JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_name
HAVING avg_salary >= 65000.00;"""
        },
        {
            'section': '7. SINGLE-ROW SUBQUERY: Above Company Average Earners',
            'desc': 'Inner query returns scalar average; outer query filters candidates exceeding it.',
            'sql': """SELECT employee_id, employee_name, designation, basic_salary
FROM employees
WHERE basic_salary > (
    SELECT AVG(basic_salary) FROM employees WHERE employment_status = 'Active'
)
ORDER BY basic_salary DESC
LIMIT 5;"""
        },
        {
            'section': '8. CORRELATED SUBQUERY: Highest-Paid Employee per Department',
            'desc': 'Inner query references outer query (sub_e.department_id = e.department_id).',
            'sql': """SELECT e.employee_id, e.employee_name, d.department_name, e.basic_salary
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.basic_salary = (
    SELECT MAX(sub_e.basic_salary)
    FROM employees sub_e
    WHERE sub_e.department_id = e.department_id
)
ORDER BY e.basic_salary DESC;"""
        },
        {
            'section': '9. SUBQUERY WITH NOT EXISTS: Perfect Attendance Staff',
            'desc': 'Correlated existence test retrieving active staff with zero absence records.',
            'sql': """SELECT e.employee_id, e.employee_name, d.department_name, e.designation
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
WHERE e.employment_status = 'Active'
  AND NOT EXISTS (
      SELECT 1 FROM attendance a 
      WHERE a.employee_id = e.employee_id AND a.status = 'Absent'
  )
LIMIT 5;"""
        },
        {
            'section': '10. DATABASE STORED PROCEDURES & USER-DEFINED FUNCTIONS',
            'desc': 'Invocation of fn_working_days(11, 2026) and fn_net_salary(50000, 5000, 2500).',
            'sql': """SELECT 
    fn_working_days(11, 2026) AS working_days_nov_2026,
    fn_net_salary(50000.00, 5000.00, 2500.00) AS calculated_net_salary;"""
        }
    ]

    for item in lab_queries:
        lines.append(f"\n## {item['section']}")
        lines.append(f"**Concept:** {item['desc']}\n")
        lines.append("```sql")
        lines.append(item['sql'])
        lines.append("```\n")

        # Execute
        try:
            if "CREATE TABLE" in item['sql']:
                for s in item['sql'].split(';'):
                    if s.strip():
                        db.execute_query(s.strip(), commit=True)
                lines.append("**Execution Result:** `Query OK, 0 rows affected (DDL sequence passed)`\n")
            else:
                rows = db.execute_query(item['sql'], fetchall=True)
                lines.append(f"**Query Output ({len(rows)} rows):**\n")
                if rows:
                    headers = list(rows[0].keys())
                    lines.append("| " + " | ".join(headers) + " |")
                    lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
                    for r in rows:
                        row_vals = [str(r[h]) if r[h] is not None else "NULL" for h in headers]
                        lines.append("| " + " | ".join(row_vals) + " |")
                lines.append("")
        except Exception as err:
            lines.append(f"**Execution Error:** `{err}`\n")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))

    print(f"Recorded verified SQL outputs in: {output_path}")

if __name__ == '__main__':
    capture_sql_outputs()

