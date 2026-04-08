const express = require('express');
const router = express.Router();
const cc = require('../controllers/captainController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.use(restrictTo('captain', 'admin'));

router.get('/lookup/:customerId',          cc.lookupCustomer);
router.get('/restaurant/menu',             cc.getRestaurantMenu);
router.post('/reservations/:id/add-items', cc.addItemsToOrder);
router.post('/offline-order',              cc.createOfflineOrder);

module.exports = router;
