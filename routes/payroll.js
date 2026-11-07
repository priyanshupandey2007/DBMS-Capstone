/**
 * Payroll Management Routes
 * Handles monthly payroll calculations, stored procedure batch generation,
 * live payroll calculator preview, and printable salary slip metadata.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const config = require('../config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/payroll
 * Admin: List payroll records filtered by month and year
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    const month = req.query.month || (today.getMonth() + 1);
    const year = req.query.year || today.getFullYear();
    const { department_id, payment_status } = req.query;

    let sql = `
      SELECT 
        p.payroll_id,
        p.employee_id,
        e.employee_name,
        e.designation,
        d.department_name,
        p.month,
        p.year,
        p.basic_salary,
        p.allowances,
        (p.basic_salary + p.allowances) AS gross_salary,
        p.deductions,
        p.working_days,
        p.present_days,
        p.net_salary,
        p.payment_status,
        DATE_FORMAT(p.generated_date, '%Y-%m-%d %H:%i') AS generated_date
      FROM payroll p
      JOIN employees e ON p.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE p.month = ? AND p.year = ?
    `;
    const params = [month, year];

    if (department_id) {
      sql += ` AND e.department_id = ?`;
      params.push(department_id);
    }
    if (payment_status) {
      sql += ` AND p.payment_status = ?`;
      params.push(payment_status);
    }

    sql += ` ORDER BY p.payroll_id DESC`;

    const records = await db.query(sql, params);

    // Summary calculations
    const totals = records.reduce(
      (acc, curr) => {
        acc.totalGross += parseFloat(curr.gross_salary || 0);
        acc.totalDeductions += parseFloat(curr.deductions || 0);
        acc.totalNet += parseFloat(curr.net_salary || 0);
        return acc;
      },
      { totalGross: 0, totalDeductions: 0, totalNet: 0 }
    );

    res.json({
      success: true,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      count: records.length,
      totals,
      data: records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/payroll/my
 * Employee: Get own payroll history and salary slips
 */
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const empId = req.user.employee_id;
    if (!empId) {
      return res.status(400).json({ success: false, message: 'No associated employee profile.' });
    }

    const records = await db.query(
      `SELECT 
        p.payroll_id,
        p.month,
        p.year,
        p.basic_salary,
        p.allowances,
        (p.basic_salary + p.allowances) AS gross_salary,
        p.deductions,
        p.working_days,
        p.present_days,
        p.net_salary,
        p.payment_status,
        DATE_FORMAT(p.generated_date, '%Y-%m-%d') AS generated_date
       FROM payroll p
       WHERE p.employee_id = ?
       ORDER BY p.year DESC, p.month DESC`,
      [empId]
    );

    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/payroll/:id
 * Get single printable salary slip details (Admin or Owner Employee)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const records = await db.query(
      `SELECT 
        p.payroll_id,
        p.employee_id,
        e.employee_name,
        e.email,
        e.phone,
        e.address,
        e.designation,
        DATE_FORMAT(e.joining_date, '%d %b %Y') AS joining_date,
        COALESCE(d.department_name, 'General') AS department_name,
        p.month,
        p.year,
        p.basic_salary,
        p.allowances,
        (p.basic_salary + p.allowances) AS gross_salary,
        p.deductions,
        p.working_days,
        p.present_days,
        p.net_salary,
        p.payment_status,
        DATE_FORMAT(p.generated_date, '%d %b %Y') AS generated_date
       FROM payroll p
       JOIN employees e ON p.employee_id = e.employee_id
       LEFT JOIN departments d ON e.department_id = d.department_id
       WHERE p.payroll_id = ?`,
      [id]
    );

    if (records.length === 0) {
      return res.status(404).json({ success: false, message: 'Salary slip not found.' });
    }

    const slip = records[0];

    // RBAC Data Isolation Check
    if (req.user.role !== 'Admin' && req.user.employee_id !== slip.employee_id) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You cannot view another employee\'s salary slip.'
      });
    }

    // Month names array
    const monthNames = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    res.json({
      success: true,
      company: {
        name: config.COMPANY_NAME,
        address: config.COMPANY_ADDRESS,
        email: config.COMPANY_EMAIL,
        phone: config.COMPANY_PHONE
      },
      slip: {
        ...slip,
        month_name: monthNames[slip.month] || `Month ${slip.month}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/payroll/generate
 * Admin: Batch-generate payroll using Stored Procedure `sp_calculate_monthly_payroll`
 */
router.post('/generate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    const month = parseInt(req.body.month || (today.getMonth() + 1), 10);
    const year = parseInt(req.body.year || today.getFullYear(), 10);

    // Call stored procedure
    await db.query(`CALL sp_calculate_monthly_payroll(?, ?)`, [month, year]);

    res.json({
      success: true,
      message: `Payroll for ${month}/${year} generated successfully using Stored Procedure sp_calculate_monthly_payroll.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/payroll/calculator/preview
 * Live Calculator Preview for an employee with custom allowances & deductions
 */
router.get('/calculator/preview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { employee_id, month, year, allowances, deductions } = req.query;

    if (!employee_id || !month || !year) {
      return res.status(400).json({ success: false, message: 'Employee ID, month, and year are required.' });
    }

    // Fetch employee basic salary
    const empRows = await db.query(
      `SELECT employee_name, basic_salary FROM employees WHERE employee_id = ?`,
      [employee_id]
    );

    if (empRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const { employee_name, basic_salary } = empRows[0];

    // Compute working days via SQL UDF fn_working_days
    const workDaysRes = await db.query(
      `SELECT fn_working_days(?, ?) AS working_days`,
      [month, year]
    );
    const workingDays = workDaysRes[0]?.working_days || 26;

    // Compute present days via SQL UDF fn_total_present_days
    const presentDaysRes = await db.query(
      `SELECT fn_total_present_days(?, ?, ?) AS present_days`,
      [employee_id, month, year]
    );
    const presentDays = parseFloat(presentDaysRes[0]?.present_days || workingDays);

    const allowVal = parseFloat(allowances !== undefined ? allowances : (basic_salary * 0.10));
    const deductVal = parseFloat(deductions !== undefined ? deductions : (basic_salary * 0.05));

    // Prorated Basic = (basic / workingDays) * presentDays
    const proratedBasic = Math.round(((basic_salary / workingDays) * presentDays) * 100) / 100;
    const gross = Math.round((proratedBasic + allowVal) * 100) / 100;

    // Call fn_net_salary UDF
    const netRes = await db.query(
      `SELECT fn_net_salary(?, ?, ?) AS net_salary`,
      [proratedBasic, allowVal, deductVal]
    );
    const netSalary = netRes[0]?.net_salary || Math.max(0, gross - deductVal);

    res.json({
      success: true,
      data: {
        employee_id: parseInt(employee_id, 10),
        employee_name,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        basic_salary: parseFloat(basic_salary),
        working_days: workingDays,
        present_days: presentDays,
        prorated_basic: proratedBasic,
        allowances: allowVal,
        gross_salary: gross,
        deductions: deductVal,
        net_salary: parseFloat(netSalary)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/payroll/:id
 * Admin: Update allowances, deductions, or payment status
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { allowances, deductions, payment_status } = req.body;

    // Get current record to recalculate net salary
    const rows = await db.query(`SELECT * FROM payroll WHERE payroll_id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }

    const current = rows[0];
    const newAllowances = allowances !== undefined ? parseFloat(allowances) : current.allowances;
    const newDeductions = deductions !== undefined ? parseFloat(deductions) : current.deductions;
    const newStatus = payment_status || current.payment_status;

    // Recompute prorated basic
    const prorated = (current.basic_salary / current.working_days) * current.present_days;
    const newNetRes = await db.query(
      `SELECT fn_net_salary(?, ?, ?) AS net_salary`,
      [prorated, newAllowances, newDeductions]
    );
    const newNet = newNetRes[0]?.net_salary || Math.max(0, prorated + newAllowances - newDeductions);

    await db.query(
      `UPDATE payroll SET 
        allowances = ?, 
        deductions = ?, 
        net_salary = ?, 
        payment_status = ? 
       WHERE payroll_id = ?`,
      [newAllowances, newDeductions, newNet, newStatus, id]
    );

    res.json({
      success: true,
      message: 'Payroll updated successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/payroll/:id/pay
 * Admin: Mark a salary slip as 'Paid'
 */
router.patch('/:id/pay', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`UPDATE payroll SET payment_status = 'Paid' WHERE payroll_id = ?`, [id]);
    res.json({ success: true, message: 'Payment marked as Paid.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

