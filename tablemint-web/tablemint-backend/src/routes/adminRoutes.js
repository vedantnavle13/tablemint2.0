const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(protect, restrictTo('admin'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUser);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deactivateUser);

module.exports = router;
