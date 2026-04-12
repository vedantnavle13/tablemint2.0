const express = require('express');
const router = express.Router();
const rc = require('../controllers/restaurantController');
const reviewController = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { restaurantPhotosUpload, handleMulterError } = require('../middleware/upload');

// ─── Public routes ─────────────────────────────────────────────────────────
router.get('/', rc.getAllRestaurants);

// Near-me endpoint — must come before /:id to avoid being caught by param
router.get('/nearby', rc.getNearbyRestaurants);

// ✅ CRITICAL: Static paths MUST come before /:id — "my" would match as :id otherwise
router.get('/my/all', protect, restrictTo('admin', 'owner'), rc.getMyRestaurants);

router.get('/:id/menu', rc.getMenu);
router.get('/:restaurantId/reviews',   reviewController.getRestaurantReviews);
router.get('/:restaurantId/insights',  reviewController.getRestaurantInsights);
router.get('/:id', rc.getRestaurant); // ← parameterized — always last among GETs

// ─── Protected routes ──────────────────────────────────────────────────────
router.use(protect);

// Create restaurant
router.post('/', restrictTo('admin', 'owner'), validate(schemas.createRestaurantSchema), rc.createRestaurant);

// Update / delete
router.patch('/:id',  restrictTo('admin', 'owner'), rc.updateRestaurant);
router.delete('/:id', restrictTo('admin', 'owner'), rc.deleteRestaurant);

// Menu management
router.post('/:id/menu',           restrictTo('admin', 'owner', 'captain'), rc.addMenuItem);
router.patch('/:id/menu/:itemId',  restrictTo('admin', 'owner', 'captain'), rc.updateMenuItem);
router.delete('/:id/menu/:itemId', restrictTo('admin', 'owner', 'captain'), rc.removeMenuItem);

// Table management
router.get('/:id/tables',            restrictTo('admin', 'owner', 'captain'), rc.getTables);
router.post('/:id/tables',           restrictTo('admin', 'owner'), rc.addTable);
router.patch('/:id/tables/:tableId', restrictTo('admin', 'owner'), rc.updateTable);

// Captain/admin management
router.get('/:id/admins',              restrictTo('admin', 'owner'), rc.getRestaurantAdmins);
router.delete('/:id/admins/:adminId',  restrictTo('admin', 'owner'), rc.removeRestaurantAdmin);
router.post('/:id/captains',           restrictTo('admin', 'owner'), rc.assignCaptain);

// Verification
router.post('/:id/verify',         restrictTo('admin'),          rc.verifyRestaurant);
router.post('/:id/regenerate-otp', restrictTo('admin', 'owner'), rc.regenerateOtp);
router.get('/:id/my-otp',          restrictTo('owner'), rc.getRestaurantOtp);
router.post('/:id/create-admin',   restrictTo('admin', 'owner'), rc.createRestaurantAdmin);

// ── Photo upload / management ─────────────────────────────────────────────────
// POST  /api/restaurants/:id/photos            — upload 1-10 images
// DELETE /api/restaurants/:id/photos/:publicId  — remove one photo (publicId URL-encoded)
router.post(
  '/:id/photos',
  restrictTo('admin', 'owner'),
  restaurantPhotosUpload,
  handleMulterError,
  rc.uploadRestaurantPhotos
);
router.delete(
  '/:id/photos/:publicId',
  restrictTo('admin', 'owner'),
  rc.deleteRestaurantPhoto
);

module.exports = router;
