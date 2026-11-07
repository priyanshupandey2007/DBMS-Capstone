/**
 * Department Routes
 * Lists and manages company departments with active employee count aggregations.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/departments
 * Accessible to all authenticated users
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const departments = await db.query(`
      SELECT 
        d.department_id,
        d.department_name,
        d.description,
        COUNT(e.employee_id) AS total_employees,
        SUM(CASE WHEN e.employment_status = 'Active' THEN 1 ELSE 0 END) AS active_employees
      FROM departments d
      LEFT JOIN employees e ON d.department_id = e.department_id
      GROUP BY d.department_id, d.department_name, d.description
      ORDER BY d.department_name ASC
    `);

    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/departments (Admin only)
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { department_name, description } = req.body;
    if (!department_name) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    const result = await db.query(
      `INSERT INTO departments (department_name, description) VALUES (?, ?)`,
      [department_name.trim(), description || null]
    );

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department_id: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Department name already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/departments/:id (Admin only)
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { department_name, description } = req.body;

    await db.query(
      `UPDATE departments SET department_name = ?, description = ? WHERE department_id = ?`,
      [department_name.trim(), description || null, id]
    );

    res.json({ success: true, message: 'Department updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/departments/:id (Admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM departments WHERE department_id = ?`, [id]);
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

