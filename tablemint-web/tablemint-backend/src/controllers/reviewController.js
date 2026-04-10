'use strict';
const Review = require('../models/Review');
const Reservation = require('../models/Reservation');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { uploadManyToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');

// ── @GET /api/restaurants/:restaurantId/reviews ───────────────────────────────
exports.getRestaurantReviews = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reviews, total] = await Promise.all([
    Review.find({ restaurant: req.params.restaurantId, isVisible: true })
      .populate('customer', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Review.countDocuments({ restaurant: req.params.restaurantId, isVisible: true }),
  ]);

  res.status(200).json({
    status: 'success',
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    data: { reviews },
  });
});

// ── @POST /api/reviews ────────────────────────────────────────────────────────
// Rules:
//   1. User must have a confirmed OR completed reservation for this restaurant.
//   2. Files uploaded via multer field "media" (images or videos).
//   3. Media is uploaded to Cloudinary under tablemint/reviews/<restaurantId>.
//   4. Unique index on {customer, restaurant} — one review per customer per restaurant.
exports.createReview = catchAsync(async (req, res, next) => {
  const { restaurantId, rating, title, comment, foodRating, serviceRating, ambienceRating, valueRating } = req.body;

  // ── 1. Validate required fields ───────────────────────────────────────────
  if (!restaurantId) return next(new AppError('restaurantId is required.', 400));
  if (!rating)       return next(new AppError('rating is required.', 400));

  // ── 2. Confirm the user has a qualifying booking ──────────────────────────
  //    Accept both 'confirmed' and 'completed' statuses.
  const qualifyingReservation = await Reservation.findOne({
    customer:   req.user.id,
    restaurant: restaurantId,
    status:     { $in: ['confirmed', 'completed'] },
  }).select('_id status confirmationCode scheduledAt');

  if (!qualifyingReservation) {
    return next(
      new AppError(
        'You can only review a restaurant after you have a confirmed or completed booking there.',
        403
      )
    );
  }

  // ── 3. Check for duplicate review ─────────────────────────────────────────
  const existing = await Review.findOne({ customer: req.user.id, restaurant: restaurantId });
  if (existing) {
    return next(new AppError('You have already reviewed this restaurant. You can edit your existing review instead.', 409));
  }

  // ── 4. Upload media files to Cloudinary (if any) ──────────────────────────
  let mediaArray = [];
  if (req.files && req.files.length > 0) {
    const folder = `tablemint/reviews/${restaurantId}`;
    try {
      const uploaded = await uploadManyToCloudinary(
        req.files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype, originalname: f.originalname })),
        { folder }
      );
      mediaArray = uploaded.map((r) => ({
        url:          r.url,
        publicId:     r.publicId,
        resourceType: r.resourceType === 'video' ? 'video' : 'image',
      }));
    } catch (err) {
      logger.error('[Cloudinary] Review media upload failed:', err);
      return next(new AppError('Failed to upload media. Please try again.', 502));
    }
  }

  // ── 5. Create the review ──────────────────────────────────────────────────
  const review = await Review.create({
    customer:      req.user.id,
    restaurant:    restaurantId,
    reservation:   qualifyingReservation._id,
    rating:        Number(rating),
    title,
    comment,
    foodRating:    foodRating    ? Number(foodRating)    : undefined,
    serviceRating: serviceRating ? Number(serviceRating) : undefined,
    ambienceRating:ambienceRating? Number(ambienceRating): undefined,
    valueRating:   valueRating   ? Number(valueRating)   : undefined,
    media:         mediaArray,
  });

  logger.info(`[Review] Created by user ${req.user.id} for restaurant ${restaurantId} with ${mediaArray.length} media file(s).`);

  res.status(201).json({
    status: 'success',
    data: { review },
  });
});

// ── @PATCH /api/reviews/:id ───────────────────────────────────────────────────
// Allows updating text fields and adding/removing media items.
exports.updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('Review not found.', 404));

  if (review.customer.toString() !== req.user.id) {
    return next(new AppError('You can only edit your own reviews.', 403));
  }

  // Update text fields
  const textFields = ['rating', 'title', 'comment', 'foodRating', 'serviceRating', 'ambienceRating', 'valueRating'];
  textFields.forEach((field) => {
    if (req.body[field] !== undefined) review[field] = req.body[field];
  });

  // ── Add new media files if provided ──────────────────────────────────────
  if (req.files && req.files.length > 0) {
    const currentCount = review.media.length;
    const maxMedia = 5;
    const slotsLeft = maxMedia - currentCount;
    if (slotsLeft <= 0) {
      return next(new AppError(`Maximum of ${maxMedia} media items allowed per review. Delete some first.`, 400));
    }

    const filesToUpload = req.files.slice(0, slotsLeft);
    const folder = `tablemint/reviews/${review.restaurant}`;
    try {
      const uploaded = await uploadManyToCloudinary(
        filesToUpload.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype, originalname: f.originalname })),
        { folder }
      );
      for (const r of uploaded) {
        review.media.push({
          url:          r.url,
          publicId:     r.publicId,
          resourceType: r.resourceType === 'video' ? 'video' : 'image',
        });
      }
    } catch (err) {
      logger.error('[Cloudinary] Review media update upload failed:', err);
      return next(new AppError('Failed to upload new media. Please try again.', 502));
    }
  }

  // ── Remove specific media items by publicId ───────────────────────────────
  // Client sends: { removeMedia: ["publicId1", "publicId2"] }
  if (req.body.removeMedia && Array.isArray(req.body.removeMedia)) {
    for (const pid of req.body.removeMedia) {
      const idx = review.media.findIndex((m) => m.publicId === pid);
      if (idx !== -1) {
        const resourceType = review.media[idx].resourceType || 'image';
        await deleteFromCloudinary(pid, resourceType);
        review.media.splice(idx, 1);
      }
    }
  }

  await review.save();

  res.status(200).json({ status: 'success', data: { review } });
});

// ── @DELETE /api/reviews/:id ──────────────────────────────────────────────────
exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('Review not found.', 404));

  if (req.user.role !== 'admin' && review.customer.toString() !== req.user.id) {
    return next(new AppError('You are not authorized to delete this review.', 403));
  }

  // Clean up Cloudinary assets
  for (const item of review.media) {
    await deleteFromCloudinary(item.publicId, item.resourceType || 'image');
  }

  await Review.findByIdAndDelete(req.params.id);

  res.status(204).send();
});

// ── @POST /api/reviews/:id/respond (admin / restaurant owner) ─────────────────
exports.respondToReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id).populate('restaurant', 'owner');
  if (!review) return next(new AppError('Review not found.', 404));

  if (
    req.user.role !== 'admin' &&
    review.restaurant.owner.toString() !== req.user.id
  ) {
    return next(new AppError('You are not authorized to respond to this review.', 403));
  }

  review.restaurantResponse = {
    text:        req.body.text,
    respondedAt: new Date(),
  };
  await review.save();

  res.status(200).json({ status: 'success', data: { review } });
});

// ── @GET /api/reviews/check-eligibility?restaurantId= ────────────────────────
// Lets the frontend know whether the logged-in user is eligible to leave a review
// and whether they already have one, before showing the review form.
exports.checkReviewEligibility = catchAsync(async (req, res, next) => {
  const { restaurantId } = req.query;
  if (!restaurantId) return next(new AppError('restaurantId query param is required.', 400));

  const [reservation, existingReview] = await Promise.all([
    Reservation.findOne({
      customer:   req.user.id,
      restaurant: restaurantId,
      status:     { $in: ['confirmed', 'completed'] },
    }).select('_id status confirmationCode scheduledAt'),
    Review.findOne({ customer: req.user.id, restaurant: restaurantId }).select('_id rating createdAt'),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      hasQualifyingBooking: !!reservation,
      reservation:          reservation || null,
      hasExistingReview:    !!existingReview,
      existingReview:       existingReview || null,
    },
  });
});
