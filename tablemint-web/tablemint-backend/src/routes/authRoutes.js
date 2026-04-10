const express = require('express');
const router = express.Router();

const {
  register, sendOTP, verifyOTP, login, logout, getMe,
  forgotPassword, resetPassword, updateProfile, changePassword,
  createAdmin,
} = require('../controllers/authController');

const { protect, restrictTo } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// ── Public routes ─────────────────────────────────────────────────────────────

// Normal user registration (customer / owner only — no isAdmin field accepted)
router.post('/register',   validate(schemas.registerSchema),       register);
router.post('/send-otp',   sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/login',      validate(schemas.loginSchema),          login);
router.post('/logout',     logout);

// Forgot / Reset password flow
router.post('/forgot-password',          validate(schemas.forgotPasswordSchema), forgotPassword);
router.patch('/reset-password/:token',   validate(schemas.resetPasswordSchema),  resetPassword);

// ── Protected routes ──────────────────────────────────────────────────────────

router.get('/me',                         protect,                                          getMe);
router.patch('/update-profile',           protect, validate(schemas.updateProfileSchema),   updateProfile);
router.patch('/change-password',          protect, validate(schemas.changePasswordSchema),  changePassword);

// ── Admin creation (superadmin only) ─────────────────────────────────────────
// Restricted to superadmin so random users cannot create admin accounts.
// The separate "create-admin" endpoint keeps admin creation out of the normal signup flow.
router.post(
  '/create-admin',
  protect,
  restrictTo('superadmin'),
  validate(schemas.createAdminSchema),
  createAdmin
);

module.exports = router;
