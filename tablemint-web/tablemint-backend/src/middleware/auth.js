const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── protect: verify JWT and attach user to req ───────────────────────────────
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Not authorized. Please log in.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ status: 'error', message: 'Your session has expired. Please log in again.' });
      }
      return res.status(401).json({ status: 'error', message: 'Invalid token. Please log in again.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User no longer exists.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ status: 'error', message: 'Account is deactivated. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server error during authentication.' });
  }
};

// ─── restrictTo: allow only certain roles ─────────────────────────────────────
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access denied. This resource requires one of: ${roles.join(', ')}.`,
      });
    }
    next();
  };
};

// ─── optionalAuth: attach user if token present, don't block if not ───────────
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) req.user = user;
  } catch {
    // Invalid token — silently continue as unauthenticated
  }
  next();
};
