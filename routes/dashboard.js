/**
 * Dashboard Analytics Routes
 * Provides high-level KPIs and summaries for Admin and Employee dashboards.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/dashboard/admin
 * Aggregated statistics and live widgets for Admin
 */
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Employee headcount breakdown
    const empStats = await db.query(`
      SELECT 
        COUNT(*) AS total_employees,
        SUM(CASE WHEN employment_status = 'Active' THEN 1 ELSE 0 END) AS active_employees,
        SUM(CASE WHEN employment_status = 'Inactive' THEN 1 ELSE 0 END) AS inactive_employees
      FROM employees
    `);

    // 2. Today's attendance counts
    const todayAtt = await db.query(`
      SELECT 
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_today,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late_today,
        SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) AS half_day_today,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent_today
      FROM attendance
      WHERE attendance_date = ?
    `, [today]);

    // 3. Pending leave requests count
    const pendingLeaves = await db.query(`
      SELECT COUNT(*) AS pending_count 
      FROM leave_requests 
      WHERE leave_status = 'Pending'
    `);

    // 4. Monthly payroll total (current or most recent)
    const payrollStats = await db.query(`
      SELECT 
        COALESCE(SUM(net_salary), 0) AS total_payroll_paid,
        COUNT(payroll_id) AS total_slips_generated
      FROM payroll
      WHERE month = ? AND year = ?
    `, [currentMonth, currentYear]);

    // If no payroll for current month, check previous month
    let payrollSum = payrollStats[0].total_payroll_paid;
    let payrollMonth = currentMonth;
    let payrollYear = currentYear;
    if (payrollSum === 0) {
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const prevStats = await db.query(`
        SELECT COALESCE(SUM(net_salary), 0) AS total_payroll_paid 
        FROM payroll 
        WHERE month = ? AND year = ?
      `, [prevMonth, prevYear]);
      if (prevStats[0]?.total_payroll_paid > 0) {
        payrollSum = prevStats[0].total_payroll_paid;
        payrollMonth = prevMonth;
        payrollYear = prevYear;
      }
    }

    // 5. Department wise distribution
    const deptDistribution = await db.query(`
      SELECT 
        d.department_name,
        COUNT(e.employee_id) AS count
      FROM departments d
      LEFT JOIN employees e ON d.department_id = e.department_id AND e.employment_status = 'Active'
      GROUP BY d.department_id, d.department_name
      ORDER BY count DESC
    `);

    // 6. Recent leave requests (last 5)
    const recentLeaves = await db.query(`
      SELECT 
        l.leave_id,
        e.employee_name,
        d.department_name,
        l.leave_type,
        DATE_FORMAT(l.start_date, '%d %b') AS start_date,
        DATE_FORMAT(l.end_date, '%d %b') AS end_date,
        l.leave_status
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      ORDER BY l.leave_id DESC
      LIMIT 5
    `);

    // 7. Recent attendance swipes today (last 5)
    const recentPunches = await db.query(`
      SELECT 
        a.attendance_id,
        e.employee_name,
        d.department_name,
        TIME_FORMAT(a.check_in, '%H:%i') AS check_in,
        TIME_FORMAT(a.check_out, '%H:%i') AS check_out,
        a.status
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE a.attendance_date = ?
      ORDER BY a.attendance_id DESC
      LIMIT 5
    `, [today]);

    res.json({
      success: true,
      metrics: {
        total_employees: empStats[0]?.total_employees || 0,
        active_employees: empStats[0]?.active_employees || 0,
        inactive_employees: empStats[0]?.inactive_employees || 0,
        present_today: (todayAtt[0]?.present_today || 0) + (todayAtt[0]?.late_today || 0),
        late_today: todayAtt[0]?.late_today || 0,
        half_day_today: todayAtt[0]?.half_day_today || 0,
        absent_today: todayAtt[0]?.absent_today || 0,
        pending_leaves: pendingLeaves[0]?.pending_count || 0,
        monthly_payroll_total: payrollSum,
        payroll_month: payrollMonth,
        payroll_year: payrollYear
      },
      deptDistribution,
      recentLeaves,
      recentPunches
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/dashboard/employee
 * Personalized statistics and punch status for the logged-in Employee
 */
router.get('/employee', authenticateToken, async (req, res) => {
  try {
    const empId = req.user.employee_id;
    if (!empId) {
      return res.status(400).json({ success: false, message: 'No associated employee record found.' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Employee profile summary
    const profileRows = await db.query(
      `SELECT * FROM vw_employee_details WHERE employee_id = ?`,
      [empId]
    );

    // 2. Today's attendance status
    const todaySwipe = await db.query(
      `SELECT 
        TIME_FORMAT(check_in, '%H:%i') AS check_in,
        TIME_FORMAT(check_out, '%H:%i') AS check_out,
        status
       FROM attendance
       WHERE employee_id = ? AND attendance_date = ?`,
      [empId, today]
    );

    // 3. Current month attendance metrics using UDF fn_total_present_days
    const attMonthRows = await db.query(
      `SELECT 
        fn_total_present_days(?, ?, ?) AS effective_present_days,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_days,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late_days,
        SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) AS half_days,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent_days
       FROM attendance
       WHERE employee_id = ? 
         AND MONTH(attendance_date) = ? 
         AND YEAR(attendance_date) = ?`,
      [empId, currentMonth, currentYear, empId, currentMonth, currentYear]
    );

    // 4. Total working days in month via UDF fn_working_days
    const workDaysRes = await db.query(
      `SELECT fn_working_days(?, ?) AS working_days`,
      [currentMonth, currentYear]
    );

    // 5. Recent leave requests (last 3)
    const myLeaves = await db.query(
      `SELECT 
        leave_id,
        leave_type,
        DATE_FORMAT(start_date, '%d %b %Y') AS start_date,
        DATE_FORMAT(end_date, '%d %b %Y') AS end_date,
        leave_status,
        reason,
        action_comment
       FROM leave_requests
       WHERE employee_id = ?
       ORDER BY leave_id DESC
       LIMIT 4`,
      [empId]
    );

    // 6. Latest salary slip
    const latestPayroll = await db.query(
      `SELECT 
        payroll_id,
        month,
        year,
        basic_salary,
        allowances,
        deductions,
        net_salary,
        payment_status,
        DATE_FORMAT(generated_date, '%d %b %Y') AS generated_date
       FROM payroll
       WHERE employee_id = ?
       ORDER BY year DESC, month DESC
       LIMIT 1`,
      [empId]
    );

    res.json({
      success: true,
      profile: profileRows[0] || {},
      todayAttendance: todaySwipe[0] || null,
      monthlyAttendance: {
        month: currentMonth,
        year: currentYear,
        working_days: workDaysRes[0]?.working_days || 26,
        effective_present_days: parseFloat(attMonthRows[0]?.effective_present_days || 0),
        present_days: parseInt(attMonthRows[0]?.present_days || 0, 10),
        late_days: parseInt(attMonthRows[0]?.late_days || 0, 10),
        half_days: parseInt(attMonthRows[0]?.half_days || 0, 10),
        absent_days: parseInt(attMonthRows[0]?.absent_days || 0, 10)
      },
      recentLeaves: myLeaves,
      latestPayroll: latestPayroll[0] || null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

