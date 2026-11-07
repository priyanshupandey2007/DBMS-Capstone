/**
 * Attendance Management Routes
 * Handles daily punch logs, monthly summaries, and status overrides.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/attendance
 * Admin: Search and filter attendance logs
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date, month, year, department_id, employee_id, status } = req.query;

    let sql = `
      SELECT 
        a.attendance_id,
        a.employee_id,
        e.employee_name,
        d.department_name,
        DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS attendance_date,
        TIME_FORMAT(a.check_in, '%H:%i') AS check_in,
        TIME_FORMAT(a.check_out, '%H:%i') AS check_out,
        a.status
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      sql += ` AND a.attendance_date = ?`;
      params.push(date);
    }
    if (month) {
      sql += ` AND MONTH(a.attendance_date) = ?`;
      params.push(month);
    }
    if (year) {
      sql += ` AND YEAR(a.attendance_date) = ?`;
      params.push(year);
    }
    if (department_id) {
      sql += ` AND e.department_id = ?`;
      params.push(department_id);
    }
    if (employee_id) {
      sql += ` AND a.employee_id = ?`;
      params.push(employee_id);
    }
    if (status) {
      sql += ` AND a.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY a.attendance_date DESC, a.employee_id ASC`;

    const records = await db.query(sql, params);
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/attendance/my
 * Employee: Get own attendance records for a specified month/year
 */
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const empId = req.user.employee_id;
    if (!empId) {
      return res.status(400).json({ success: false, message: 'No associated employee record found.' });
    }

    const today = new Date();
    const month = req.query.month || (today.getMonth() + 1);
    const year = req.query.year || today.getFullYear();

    const records = await db.query(
      `SELECT 
        attendance_id,
        DATE_FORMAT(attendance_date, '%Y-%m-%d') AS attendance_date,
        TIME_FORMAT(check_in, '%H:%i') AS check_in,
        TIME_FORMAT(check_out, '%H:%i') AS check_out,
        status
       FROM attendance
       WHERE employee_id = ? 
         AND MONTH(attendance_date) = ? 
         AND YEAR(attendance_date) = ?
       ORDER BY attendance_date ASC`,
      [empId, month, year]
    );

    // Call stored procedure sp_attendance_summary for aggregation
    const summary = await db.query(
      `SELECT fn_total_present_days(?, ?, ?) AS effective_present_days`,
      [empId, month, year]
    );

    res.json({
      success: true,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      effective_present_days: summary[0]?.effective_present_days || 0,
      data: records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/attendance
 * Admin: Mark or override attendance for an employee
 * (Protected by trigger trg_attendance_before_insert for future dates, joining date, etc.)
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { employee_id, attendance_date, check_in, check_out, status } = req.body;

    if (!employee_id || !attendance_date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, attendance date, and status are required.'
      });
    }

    // Insert or update on duplicate key (employee_id + attendance_date)
    await db.query(
      `INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         check_in = VALUES(check_in),
         check_out = VALUES(check_out),
         status = VALUES(status)`,
      [
        employee_id,
        attendance_date,
        check_in || null,
        check_out || null,
        status
      ]
    );

    res.json({ success: true, message: 'Attendance record saved successfully.' });
  } catch (error) {
    // Check if error comes from database trigger
    if (error.sqlState === '45000') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/attendance/checkin
 * Employee or Admin: Self punch in for today
 */
router.post('/checkin', authenticateToken, async (req, res) => {
  try {
    const empId = req.user.role === 'Admin' && req.body.employee_id 
      ? req.body.employee_id 
      : req.user.employee_id;

    if (!empId) {
      return res.status(400).json({ success: false, message: 'No employee account linked.' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 8);

    // Determine status (If after 09:30 AM, mark as Late, else Present)
    const hours = new Date().getHours();
    const minutes = new Date().getMinutes();
    const isLate = hours > 9 || (hours === 9 && minutes > 30);
    const initialStatus = isLate ? 'Late' : 'Present';

    await db.query(
      `INSERT INTO attendance (employee_id, attendance_date, check_in, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         check_in = COALESCE(check_in, VALUES(check_in)),
         status = COALESCE(status, VALUES(status))`,
      [empId, today, nowTime, initialStatus]
    );

    res.json({
      success: true,
      message: `Punch-in recorded at ${nowTime.slice(0, 5)} (${initialStatus}).`,
      status: initialStatus,
      check_in: nowTime.slice(0, 5)
    });
  } catch (error) {
    if (error.sqlState === '45000') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/attendance/checkout
 * Employee or Admin: Self punch out for today
 */
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const empId = req.user.role === 'Admin' && req.body.employee_id 
      ? req.body.employee_id 
      : req.user.employee_id;

    if (!empId) {
      return res.status(400).json({ success: false, message: 'No employee account linked.' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 8);

    const result = await db.query(
      `UPDATE attendance 
       SET check_out = ? 
       WHERE employee_id = ? AND attendance_date = ?`,
      [nowTime, empId, today]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'No punch-in found for today. Please punch in first.'
      });
    }

    res.json({
      success: true,
      message: `Punch-out recorded at ${nowTime.slice(0, 5)}.`,
      check_out: nowTime.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

