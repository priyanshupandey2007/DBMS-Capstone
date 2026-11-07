/**
 * Employee Management Routes
 * Implements CRUD, Department Filtering, Soft/Hard Delete, and Salary Audit History.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireAdmin, enforceDataIsolation } = require('../middleware/auth');

/**
 * GET /api/employees
 * List all employees with search, department, and status filters (Admin only)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { search, department_id, status } = req.query;

    let sql = `
      SELECT 
        e.employee_id,
        e.employee_name,
        e.email,
        e.phone,
        e.gender,
        DATE_FORMAT(e.date_of_birth, '%Y-%m-%d') AS date_of_birth,
        DATE_FORMAT(e.joining_date, '%Y-%m-%d') AS joining_date,
        e.department_id,
        COALESCE(d.department_name, 'Unassigned') AS department_name,
        e.designation,
        e.basic_salary,
        e.employment_status,
        u.username
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN users u ON e.employee_id = u.employee_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (e.employee_name LIKE ? OR e.email LIKE ? OR e.designation LIKE ?)`;
      const searchWildcard = `%${search}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard);
    }

    if (department_id) {
      sql += ` AND e.department_id = ?`;
      params.push(department_id);
    }

    if (status) {
      sql += ` AND e.employment_status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY e.employee_id DESC`;

    const employees = await db.query(sql, params);
    res.json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/employees/:id
 * Get single employee profile by ID (Admin or Self)
 */
router.get('/:id', authenticateToken, enforceDataIsolation('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const employees = await db.query(
      `SELECT 
        e.employee_id,
        e.employee_name,
        e.email,
        e.phone,
        e.address,
        e.gender,
        DATE_FORMAT(e.date_of_birth, '%Y-%m-%d') AS date_of_birth,
        DATE_FORMAT(e.joining_date, '%Y-%m-%d') AS joining_date,
        e.department_id,
        COALESCE(d.department_name, 'Unassigned') AS department_name,
        e.designation,
        e.basic_salary,
        e.employment_status,
        u.username,
        u.role
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.department_id
       LEFT JOIN users u ON e.employee_id = u.employee_id
       WHERE e.employee_id = ?`,
      [id]
    );

    if (employees.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, data: employees[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/employees
 * Create new employee and login account (Calls sp_add_employee or transaction)
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      employee_name,
      email,
      phone,
      address,
      gender,
      date_of_birth,
      joining_date,
      department_id,
      designation,
      basic_salary,
      username,
      password
    } = req.body;

    if (!employee_name || !email || !joining_date || !designation || basic_salary === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, joining date, designation, and basic salary are required.'
      });
    }

    // Default username and password if not specified
    const loginUser = username || email.split('@')[0];
    const plainPass = password || 'Emp@123';
    const passwordHash = await bcrypt.hash(plainPass, 10);

    // Call stored procedure: sp_add_employee
    const result = await db.withTransaction(async (conn) => {
      // 1. Insert into employees
      const [empRes] = await conn.query(
        `INSERT INTO employees (
          employee_name, email, phone, address, gender, 
          date_of_birth, joining_date, department_id, designation, 
          basic_salary, employment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
        [
          employee_name,
          email,
          phone || null,
          address || null,
          gender || 'Other',
          date_of_birth || null,
          joining_date,
          department_id || null,
          designation,
          basic_salary
        ]
      );

      const newEmpId = empRes.insertId;

      // 2. Insert into users
      await conn.query(
        `INSERT INTO users (username, password_hash, role, employee_id)
         VALUES (?, ?, 'Employee', ?)`,
        [loginUser, passwordHash, newEmpId]
      );

      return newEmpId;
    });

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      employee_id: result,
      credentials: {
        username: loginUser,
        initialPassword: plainPass
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'An employee with this email or username already exists.'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/employees/:id
 * Update employee profile and salary
 * (Salary update automatically fires database trigger trg_employees_after_salary_update)
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employee_name,
      email,
      phone,
      address,
      gender,
      date_of_birth,
      joining_date,
      department_id,
      designation,
      basic_salary,
      employment_status
    } = req.body;

    const result = await db.query(
      `UPDATE employees SET
        employee_name = ?,
        email = ?,
        phone = ?,
        address = ?,
        gender = ?,
        date_of_birth = ?,
        joining_date = ?,
        department_id = ?,
        designation = ?,
        basic_salary = ?,
        employment_status = ?
       WHERE employee_id = ?`,
      [
        employee_name,
        email,
        phone || null,
        address || null,
        gender || 'Other',
        date_of_birth || null,
        joining_date,
        department_id || null,
        designation,
        basic_salary,
        employment_status || 'Active',
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    res.json({
      success: true,
      message: 'Employee details updated successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/employees/:id/status
 * Soft delete: Toggle employment_status between 'Active' and 'Inactive'
 */
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Active or Inactive' });
    }

    await db.query(`UPDATE employees SET employment_status = ? WHERE employee_id = ?`, [status, id]);
    res.json({
      success: true,
      message: `Employee marked as ${status}.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/employees/:id
 * Hard delete: Removes employee and cascades to users, attendance, leaves, payroll.
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`DELETE FROM employees WHERE employee_id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({
      success: true,
      message: 'Employee and all associated records permanently removed via ON DELETE CASCADE.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/employees/:id/audit
 * View Salary Audit trail generated by the database trigger
 */
router.get('/:id/audit', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await db.query(
      `SELECT audit_id, employee_id, old_salary, new_salary, 
              DATE_FORMAT(changed_at, '%Y-%m-%d %H:%i:%s') AS changed_at, 
              changed_by
       FROM salary_audit
       WHERE employee_id = ?
       ORDER BY audit_id DESC`,
      [id]
    );

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

