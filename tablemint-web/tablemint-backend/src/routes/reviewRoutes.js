'use strict';
const express = require('express');
const router = express.Router();

const reviewController = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/auth');
const { reviewMediaUpload, handleMulterError } = require('../middleware/upload');

// All review routes require authentication
router.use(protect);

// ── GET eligibility check (before showing the review form on the frontend) ────
// GET /api/reviews/check-eligibility?restaurantId=<id>
router.get('/check-eligibility', restrictTo('customer'), reviewController.checkReviewEligibility);

// ── Create a review (with optional media upload) ──────────────────────────────
// POST /api/reviews
// field name: "media" (multipart/form-data), max 5 files (images + videos)
// Also accepts regular JSON if no files are uploaded.
router.post(
  '/',
  restrictTo('customer'),
  reviewMediaUpload,
  handleMulterError,
  reviewController.createReview
);

// ── Update a review (can also add/remove media) ───────────────────────────────
// PATCH /api/reviews/:id
// Body: text fields + optional "removeMedia" array of publicIds
// Files: optional new "media" files
router.patch(
  '/:id',
  restrictTo('customer'),
  reviewMediaUpload,
  handleMulterError,
  reviewController.updateReview
);

// ── Delete a review ───────────────────────────────────────────────────────────
router.delete('/:id', restrictTo('customer', 'admin'), reviewController.deleteReview);

// ── Restaurant owner / admin responds to a review ────────────────────────────
router.post('/:id/respond', restrictTo('admin', 'owner'), reviewController.respondToReview);

module.exports = router;
