/**
 * Authentication Routes
 * Implements login, current user profile, and session verification.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    // Query user record using parameterized SQL
    const users = await db.query(
      `SELECT u.user_id, u.username, u.password_hash, u.role, u.employee_id,
              e.employee_name, e.email, e.designation, e.department_id, e.employment_status,
              d.department_name
       FROM users u
       LEFT JOIN employees e ON u.employee_id = e.employee_id
       LEFT JOIN departments d ON e.department_id = d.department_id
       WHERE u.username = ?`,
      [username.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    const user = users[0];

    // Check if employee account is inactive
    if (user.role === 'Employee' && user.employment_status === 'Inactive') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact HR Administrator.'
      });
    }

    // Compare bcrypt password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    // Build JWT payload
    const tokenPayload = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      employee_id: user.employee_id,
      employee_name: user.employee_name || 'System Administrator',
      designation: user.designation || 'Administrator',
      department_name: user.department_name || 'Management'
    };

    const token = jwt.sign(tokenPayload, config.JWT_SECRET, { expiresIn: '24h' });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Local demo
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: tokenPayload
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication: ' + error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Returns profile of currently authenticated user
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'Admin') {
      return res.json({
        success: true,
        user: req.user
      });
    }

    // Fetch fresh employee details from view
    const details = await db.query(
      `SELECT * FROM vw_employee_details WHERE employee_id = ?`,
      [req.user.employee_id]
    );

    if (details.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    res.json({
      success: true,
      user: {
        ...req.user,
        ...details[0]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;

