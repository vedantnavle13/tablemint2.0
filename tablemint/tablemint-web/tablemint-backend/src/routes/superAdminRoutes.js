const express = require('express');
const router = express.Router();
const sc = require('../controllers/superAdminController');
const { protect, restrictTo } = require('../middleware/auth');

// All superadmin routes require login + superadmin role
router.use(protect);
router.use(restrictTo('superadmin'));

router.get('/stats', sc.getStats);
router.get('/restaurants', sc.getAllRestaurants);
router.get('/restaurants/:id', sc.getRestaurant);
router.post('/restaurants/:id/verify', sc.verifyRestaurant);
router.post('/restaurants/:id/reject', sc.rejectRestaurant);

module.exports = router;
