const express = require('express');
const router  = express.Router();
const rc      = require('../controllers/reservationController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, schemas }   = require('../middleware/validate');

router.use(protect);

// ── Customer ──────────────────────────────────────────────────────────────────
router.post('/',            restrictTo('customer'), validate(schemas.createReservation), rc.createReservation);
router.get('/my',           restrictTo('customer'), rc.getMyReservations);
router.patch('/:id/cancel', restrictTo('customer'), rc.cancelReservation);

// Customer sends a special message/request to the restaurant after confirmation
router.patch('/:id/customer-message', restrictTo('customer'), rc.sendCustomerMessage);

// Customer or admin can update payment status (simulate online payment)
router.patch('/:id/payment', restrictTo('customer', 'admin', 'owner'), rc.markPayment);

// ── Admin only ────────────────────────────────────────────────────────────────
router.get('/admin/all',   restrictTo('admin'), rc.getAllReservations);
router.get('/admin/stats', restrictTo('admin'), rc.getReservationStats);

// ── Owner + Captain + Admin ───────────────────────────────────────────────────
router.get('/restaurant/:restaurantId', restrictTo('admin', 'owner', 'captain'), rc.getRestaurantReservations);
router.patch('/:id/status',             restrictTo('admin', 'owner', 'captain'), rc.updateReservationStatus);

// Admin / Owner: notify the customer via email (email address is NOT exposed to frontend)
router.post('/:id/notify-customer', restrictTo('admin', 'owner'), rc.notifyCustomer);

// Admin / Owner / Captain: generate bill (marks seated → completed, stores itemized breakdown)
// Captain added here so they can complete bookings and generate bills during service.
router.post('/:id/generate-bill', restrictTo('admin', 'owner', 'captain'), rc.generateBill);

// Admin / Owner / Customer: view bill
router.get('/:id/bill', rc.getBill);

// ── Single reservation (any authenticated user, controller handles access) ────
router.get('/:id', rc.getReservation);

module.exports = router;
