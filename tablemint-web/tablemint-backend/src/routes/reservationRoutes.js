const express = require('express');
const router = express.Router();
const rc = require('../controllers/reservationController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.use(protect);

// Customer
router.post('/',            restrictTo('customer'), validate(schemas.createReservation), rc.createReservation);
router.get('/my',           restrictTo('customer'), rc.getMyReservations);
router.patch('/:id/cancel', restrictTo('customer'), rc.cancelReservation);

// Admin only
router.get('/admin/all',   restrictTo('admin'), rc.getAllReservations);
router.get('/admin/stats', restrictTo('admin'), rc.getReservationStats);

// Owner + Captain + Admin
router.get('/restaurant/:restaurantId', restrictTo('admin', 'owner', 'captain'), rc.getRestaurantReservations);
router.patch('/:id/status',             restrictTo('admin', 'owner', 'captain'), rc.updateReservationStatus);

// Single reservation
router.get('/:id', rc.getReservation);

module.exports = router;
