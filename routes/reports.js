/**
 * DBMS Laboratory & Viva Reports Routes
 * Implements 7+ advanced SQL queries with collapsible "View SQL" and DBMS viva notes.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Master catalogue of academic DBMS reports
const REPORTS = [
  {
    id: 'dept-salary-summary',
    title: 'Department Headcount & Salary Expenditure',
    category: 'Aggregation & GROUP BY',
    viva_concept: 'Demonstrates aggregate functions (COUNT, SUM, AVG, MIN, MAX) with GROUP BY and LEFT OUTER JOIN to include departments with or without staff.',
    sql: `SELECT 
    d.department_id,
    d.department_name,
    COUNT(e.employee_id) AS total_employees,
    SUM(CASE WHEN e.employment_status = 'Active' THEN 1 ELSE 0 END) AS active_employees,
    COALESCE(ROUND(AVG(e.basic_salary), 2), 0) AS average_salary,
    COALESCE(MIN(e.basic_salary), 0) AS lowest_salary,
    COALESCE(MAX(e.basic_salary), 0) AS highest_salary,
    COALESCE(SUM(e.basic_salary), 0) AS total_monthly_payroll
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_id, d.department_name
ORDER BY total_monthly_payroll DESC;`
  },
  {
    id: 'above-avg-earners',
    title: 'Employees Earning Above Company Average',
    category: 'Single-Row Nested Subquery',
    viva_concept: 'The inner query calculates the company-wide average salary as a single scalar value. The outer query retrieves employees whose salary exceeds that scalar value.',
    sql: `SELECT 
    e.employee_id,
    e.employee_name,
    d.department_name,
    e.designation,
    e.basic_salary,
    ROUND((SELECT AVG(basic_salary) FROM employees WHERE employment_status = 'Active'), 2) AS company_average_salary,
    ROUND(e.basic_salary - (SELECT AVG(basic_salary) FROM employees WHERE employment_status = 'Active'), 2) AS difference_from_avg
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
WHERE e.basic_salary > (
    SELECT AVG(basic_salary) 
    FROM employees 
    WHERE employment_status = 'Active'
)
ORDER BY e.basic_salary DESC;`
  },
  {
    id: 'highest-paid-per-dept',
    title: 'Highest-Paid Employee in Each Department',
    category: 'Correlated Subquery',
    viva_concept: 'In a correlated subquery, the inner query references columns from the outer query (e.department_id). The subquery evaluates once for each candidate row from the outer query.',
    sql: `SELECT 
    e.employee_id,
    e.employee_name,
    d.department_name,
    e.designation,
    e.basic_salary
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id
WHERE e.basic_salary = (
    SELECT MAX(sub_e.basic_salary)
    FROM employees sub_e
    WHERE sub_e.department_id = e.department_id
)
ORDER BY e.basic_salary DESC;`
  },
  {
    id: 'perfect-attendance',
    title: 'Employees with Perfect Attendance (Zero Absences)',
    category: 'Subquery with NOT EXISTS',
    viva_concept: 'Uses relational NOT EXISTS to filter employees for whom no attendance record with status "Absent" can be found. High performance correlated existence check.',
    sql: `SELECT 
    e.employee_id,
    e.employee_name,
    d.department_name,
    e.designation,
    DATE_FORMAT(e.joining_date, '%d %b %Y') AS joining_date,
    (SELECT COUNT(*) FROM attendance a WHERE a.employee_id = e.employee_id) AS total_logged_swipes
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
WHERE e.employment_status = 'Active'
  AND NOT EXISTS (
      SELECT 1 
      FROM attendance a 
      WHERE a.employee_id = e.employee_id 
        AND a.status = 'Absent'
  )
ORDER BY total_logged_swipes DESC;`
  },
  {
    id: 'monthly-attendance-view',
    title: 'Monthly Attendance Unit Summary (SQL View)',
    category: 'Database View & Calculated Units',
    viva_concept: 'Queries the permanent database view vw_monthly_attendance_summary. Computes fractional units: Present=1, Late=1, Half Day=0.5, Absent=0.',
    sql: `SELECT 
    employee_id,
    employee_name,
    department_name,
    attendance_month,
    attendance_year,
    total_logged_days,
    present_count,
    late_count,
    half_day_count,
    absent_count,
    effective_present_days
FROM vw_monthly_attendance_summary
ORDER BY attendance_year DESC, attendance_month DESC, effective_present_days DESC;`
  },
  {
    id: 'full-outer-join-simulation',
    title: 'Relational Full Outer Join Simulation',
    category: 'UNION of LEFT & RIGHT OUTER JOIN',
    viva_concept: 'MySQL does not have a native FULL OUTER JOIN keyword. In standard relational algebra, a Full Outer Join is implemented by taking the UNION of a LEFT OUTER JOIN and a RIGHT OUTER JOIN.',
    sql: `SELECT 
    e.employee_id,
    e.employee_name,
    e.designation,
    d.department_name,
    'Present in Employee Record' AS source_origin
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
UNION
SELECT 
    e.employee_id,
    e.employee_name,
    e.designation,
    d.department_name,
    'Present in Department Record' AS source_origin
FROM employees e
RIGHT JOIN departments d ON e.department_id = d.department_id
ORDER BY department_name, employee_name;`
  },
  {
    id: 'salary-audit-trail',
    title: 'Trigger-Generated Salary Audit History',
    category: 'Database Triggers & Audit Trail',
    viva_concept: 'Displays historical records automatically inserted by trg_employees_after_salary_update whenever an employee basic_salary is updated.',
    sql: `SELECT 
    a.audit_id,
    a.employee_id,
    e.employee_name,
    d.department_name,
    a.old_salary,
    a.new_salary,
    ROUND(a.new_salary - a.old_salary, 2) AS salary_hike_amount,
    ROUND(((a.new_salary - a.old_salary) / a.old_salary) * 100, 1) AS hike_percentage,
    DATE_FORMAT(a.changed_at, '%Y-%m-%d %H:%i:%s') AS changed_timestamp,
    a.changed_by
FROM salary_audit a
LEFT JOIN employees e ON a.employee_id = e.employee_id
LEFT JOIN departments d ON e.department_id = d.department_id
ORDER BY a.audit_id DESC;`
  },
  {
    id: 'high-earners-dept-having',
    title: 'Departments with High Average Salary (HAVING Clause)',
    category: 'GROUP BY with HAVING Filter',
    viva_concept: 'Illustrates the crucial DBMS distinction: WHERE filters rows prior to aggregation, while HAVING filters the post-aggregated groups (avg_salary >= 60,000).',
    sql: `SELECT 
    d.department_id,
    d.department_name,
    COUNT(e.employee_id) AS total_staff,
    ROUND(AVG(e.basic_salary), 2) AS avg_basic_salary,
    SUM(e.basic_salary) AS total_dept_budget
FROM departments d
INNER JOIN employees e ON d.department_id = e.department_id
WHERE e.employment_status = 'Active'
GROUP BY d.department_id, d.department_name
HAVING avg_basic_salary >= 60000.00
ORDER BY avg_basic_salary DESC;`
  }
];

/**
 * GET /api/reports/list
 * Admin: Returns metadata for all available academic DBMS reports
 */
router.get('/list', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    success: true,
    reports: REPORTS.map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      viva_concept: r.viva_concept
    }))
  });
});

/**
 * GET /api/reports/:id
 * Admin: Executes the report query and returns data + raw SQL statement
 */
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const report = REPORTS.find(r => r.id === id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report definition not found.' });
    }

    const data = await db.query(report.sql);

    res.json({
      success: true,
      report: {
        id: report.id,
        title: report.title,
        category: report.category,
        viva_concept: report.viva_concept,
        sql: report.sql,
        count: data.length,
        data
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

