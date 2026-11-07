/**
 * Authentication and Role-Based Access Control (RBAC) Middleware
 * Verifies JWT token and enforces Admin vs Employee permission boundaries.
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware: Verify that user is authenticated via Bearer token or cookie
 */
function authenticateToken(req, res, next) {
  let token = null;

  // Check Authorization Header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No token provided.'
    });
  }

  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired session token. Please log in again.'
      });
    }

    req.user = user;
    next();
  });
}

/**
 * Middleware: Enforce Admin Role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Administrator privileges required.'
    });
  }
  next();
}

/**
 * Middleware: Enforce Data Isolation
 * Employees can only access their own data. Admin can access anyone's data.
 * @param {string} paramName - Name of the route param containing employee_id (default: 'employee_id')
 */
function enforceDataIsolation(paramName = 'id') {
  return (req, res, next) => {
    if (req.user.role === 'Admin') {
      return next();
    }

    const targetEmpId = parseInt(req.params[paramName] || req.query.employee_id || req.body.employee_id, 10);
    if (!targetEmpId || targetEmpId !== req.user.employee_id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access another employee\'s data.'
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireAdmin,
  enforceDataIsolation
};

