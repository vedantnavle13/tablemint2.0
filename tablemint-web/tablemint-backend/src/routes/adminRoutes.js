const express = require('express');
const router = express.Router();

const ac  = require('../controllers/adminController');
const wic = require('../controllers/walkInController');
const { protect, restrictTo } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(protect, restrictTo('admin', 'owner'));

// ─── Platform dashboard ───────────────────────────────────────────────────────
router.get('/dashboard', restrictTo('admin', 'owner'), ac.getDashboardStats);

// ─── User management (admin only) ─────────────────────────────────────────────
router.get('/users',        restrictTo('admin'), ac.getAllUsers);
router.get('/users/:id',    restrictTo('admin'), ac.getUser);
router.patch('/users/:id',  restrictTo('admin'), ac.updateUser);
router.delete('/users/:id', restrictTo('admin'), ac.deactivateUser);

// ─── Admin's assigned restaurant ──────────────────────────────────────────────
router.get('/my-restaurant', restrictTo('admin'), ac.getMyRestaurant);

// ─── Reservations (scoped to admin's restaurant) ──────────────────────────────
router.get('/reservations',                        restrictTo('admin'), ac.getAdminReservations);
router.patch('/reservations/:id/status',           restrictTo('admin'), ac.updateAdminReservationStatus);
router.post('/reservations/:id/notify',            restrictTo('admin'), ac.notifyCustomer);

// ─── Menu management (admin's restaurant only) ────────────────────────────────
router.get('/menu',              restrictTo('admin'), ac.getAdminMenu);
router.post('/menu',             restrictTo('admin'), ac.addMenuItem);
router.patch('/menu/:itemId',    restrictTo('admin'), ac.updateMenuItem);
router.delete('/menu/:itemId',   restrictTo('admin'), ac.deleteMenuItem);

// ─── Table management (admin's restaurant only) ───────────────────────────────
router.get('/tables',               restrictTo('admin'), ac.getAdminTables);
router.post('/tables',              restrictTo('admin'), ac.addTable);
router.patch('/tables/:tableId',    restrictTo('admin'), ac.updateTable);
router.delete('/tables/:tableId',   restrictTo('admin'), ac.deleteTable);

// ─── Analytics (scoped to admin's restaurant) ────────────────────────────────
router.get('/analytics', restrictTo('admin'), ac.getAdminAnalytics);

// ─── Owner: revenue across ALL owned restaurants ──────────────────────────────
router.get('/owner/revenue', restrictTo('owner'), ac.getOwnerRevenue);

// ─── Walk-in orders ───────────────────────────────────────────────────────────
router.get('/walk-ins',             restrictTo('admin'), wic.getWalkIns);
router.post('/walk-in/:id/bill',    restrictTo('admin'), wic.generateWalkInBill);
router.patch('/walk-in/:id/pay',    restrictTo('admin'), wic.markWalkInPaid);

module.exports = router;
