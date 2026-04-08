const express = require('express');
const router = express.Router();

const reviewController = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.use(protect);

router.post('/', restrictTo('customer'), validate(schemas.createReviewSchema), reviewController.createReview);
router.patch('/:id', restrictTo('customer'), reviewController.updateReview);
router.delete('/:id', restrictTo('customer', 'admin'), reviewController.deleteReview);
router.post('/:id/respond', restrictTo('admin'), reviewController.respondToReview);

module.exports = router;
