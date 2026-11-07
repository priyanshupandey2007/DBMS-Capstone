/**
 * Leave Management Routes
 * Handles leave applications, overlapping date validation, and admin approvals.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/leaves
 * Admin: Get all leave requests with optional status filter
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, employee_id } = req.query;

    let sql = `
      SELECT 
        l.leave_id,
        l.employee_id,
        e.employee_name,
        d.department_name,
        l.leave_type,
        DATE_FORMAT(l.start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(l.end_date, '%Y-%m-%d') AS end_date,
        DATEDIFF(l.end_date, l.start_date) + 1 AS duration_days,
        l.reason,
        l.leave_status,
        DATE_FORMAT(l.applied_date, '%Y-%m-%d') AS applied_date,
        l.action_by,
        l.action_comment
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ` AND l.leave_status = ?`;
      params.push(status);
    }
    if (employee_id) {
      sql += ` AND l.employee_id = ?`;
      params.push(employee_id);
    }

    sql += ` ORDER BY l.leave_id DESC`;

    const leaves = await db.query(sql, params);
    res.json({ success: true, count: leaves.length, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/leaves/my
 * Employee: Get own leave applications
 */
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const empId = req.user.employee_id;
    if (!empId) {
      return res.status(400).json({ success: false, message: 'No associated employee record found.' });
    }

    const leaves = await db.query(
      `SELECT 
        leave_id,
        leave_type,
        DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date,
        DATEDIFF(end_date, start_date) + 1 AS duration_days,
        reason,
        leave_status,
        DATE_FORMAT(applied_date, '%Y-%m-%d') AS applied_date,
        action_comment
       FROM leave_requests
       WHERE employee_id = ?
       ORDER BY leave_id DESC`,
      [empId]
    );

    res.json({ success: true, count: leaves.length, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/leaves
 * Employee/Admin: Submit a leave application
 * Validates end_date >= start_date, and checks for overlapping leave requests.
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const empId = req.user.role === 'Admin' && req.body.employee_id 
      ? req.body.employee_id 
      : req.user.employee_id;

    const { leave_type, start_date, end_date, reason } = req.body;

    if (!empId || !leave_type || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Leave type, start date, and end date are required.'
      });
    }

    // 1. Business Logic Check: end_date cannot be earlier than start_date
    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date.'
      });
    }

    // 2. Business Logic Check: Overlapping leave requests
    // An overlap occurs if (start_date <= existing.end_date) AND (end_date >= existing.start_date)
    const overlapping = await db.query(
      `SELECT leave_id, leave_type, start_date, end_date, leave_status
       FROM leave_requests
       WHERE employee_id = ?
         AND leave_status IN ('Pending', 'Approved')
         AND (? <= end_date AND ? >= start_date)`,
      [empId, start_date, end_date]
    );

    if (overlapping.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Overlapping leave request detected! You already have an existing ${overlapping[0].leave_status.toLowerCase()} ${overlapping[0].leave_type} between ${new Date(overlapping[0].start_date).toLocaleDateString()} and ${new Date(overlapping[0].end_date).toLocaleDateString()}.`
      });
    }

    // 3. Insert leave request
    const result = await db.query(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, leave_status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [empId, leave_type, start_date, end_date, reason || null]
    );

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully. Awaiting HR approval.',
      leave_id: result.insertId
    });
  } catch (error) {
    if (error.sqlState === '38100' || error.message.includes('chk_leave_dates')) {
      return res.status(400).json({
        success: false,
        message: 'Database Check Constraint Violation: End date must be greater than or equal to start date.'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/leaves/:id/status
 * Admin: Approve or Reject a leave application
 */
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Approved or Rejected.'
      });
    }

    const result = await db.query(
      `UPDATE leave_requests 
       SET leave_status = ?, 
           action_by = ?, 
           action_comment = ?
       WHERE leave_id = ?`,
      [status, req.user.username, comment || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    res.json({
      success: true,
      message: `Leave request has been ${status.toLowerCase()}.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

