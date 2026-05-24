const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded;

    // Fetch fresh roles, permissions, and intercom_number from DB
    try {
      const [rolesResult, permsResult, userResult] = await Promise.all([
        db.query(
          `SELECT r.name FROM roles r
           INNER JOIN user_roles ur ON r.id = ur.role_id
           WHERE ur.user_id = $1`,
          [req.user.id]
        ),
        db.query(
          `SELECT DISTINCT p.name FROM permissions p
           INNER JOIN role_permissions rp ON p.id = rp.permission_id
           INNER JOIN user_roles ur ON rp.role_id = ur.role_id
           WHERE ur.user_id = $1`,
          [req.user.id]
        ),
        db.query(
          `SELECT intercom_number, department, is_active FROM users WHERE id = $1`,
          [req.user.id]
        ),
      ]);

      req.user.roles = rolesResult.rows.map(r => r.name);
      req.user.permissions = permsResult.rows.map(r => r.name);

      if (userResult.rows.length > 0) {
        req.user.intercom_number = userResult.rows[0].intercom_number;
        req.user.department = userResult.rows[0].department;
        req.user.is_active = userResult.rows[0].is_active;
      }
    } catch (dbErr) {
      // Fall back to JWT data if DB query fails
      if (!req.user.roles) req.user.roles = [req.user.role];
      if (!req.user.permissions) req.user.permissions = [];
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired. Please login again.',
      });
    }
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token.',
    });
  }
};

const authorize = (...args) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required.',
      });
    }

    // Super_admin always has access
    const userRoles = req.user.roles || [req.user.role];
    if (userRoles.includes('super_admin')) {
      return next();
    }

    // Detect if args are permission names (contain ':') or role names
    const hasColon = args.some(a => a.includes(':'));

    if (hasColon) {
      // Permission-based check
      const userPerms = req.user.permissions || [];
      const hasPermission = args.some(perm => userPerms.includes(perm));
      if (!hasPermission) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions.',
        });
      }
    } else {
      // Legacy role-based check
      const hasRole = args.some(role => userRoles.includes(role));
      if (!hasRole) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions.',
        });
      }
    }

    next();
  };
};

module.exports = { authenticate, authorize };
