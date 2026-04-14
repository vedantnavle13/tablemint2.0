'use strict';
const axios       = require('axios');
const Review      = require('../models/Review');
const Reservation = require('../models/Reservation');
const AppError    = require('../utils/AppError');
const catchAsync  = require('../utils/catchAsync');
const { uploadManyToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * triggerSentimentAnalysis
 * Fire-and-forget: calls the Python ML service and patches the review.
 * Errors are caught and logged — they never propagate to the caller.
 */
const triggerSentimentAnalysis = (reviewId, text) => {
  if (!text || text.trim().length === 0) return; // no comment to analyse

  axios
    .post(`${ML_SERVICE_URL}/analyze-single`, { text }, { timeout: 60000 })
    .then(async ({ data }) => {
      // Python service returns snake_case: sentiment_label, sentiment_score, aspects
      await Review.findByIdAndUpdate(reviewId, {
        sentimentLabel: data.sentiment_label || null,
        sentimentScore: data.sentiment_score ?? null,
        aspects:        Array.isArray(data.aspects) ? data.aspects : [],
        isProcessed:    true,
      });
      logger.info(`[ML] Sentiment saved for review ${reviewId}: ${data.sentiment_label}`);
    })
    .catch((err) => {
      logger.warn(`[ML] Sentiment analysis failed for review ${reviewId}: ${err.message}`);
    });
};

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

// ── @GET /api/reviews/my ──────────────────────────────────────────────────────
// Returns all reviews submitted by the current customer.
// Used by AccountPage to pre-seed reviewedIds (so Write Review is hidden
// for bookings that already have a review, even after a page refresh).
exports.getMyReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ customer: req.user.id })
    .select('reservation restaurant rating createdAt sentimentLabel')
    .lean();

  res.status(200).json({
    status: 'success',
    data: { reviews },
  });
});

// ── @POST /api/reviews ────────────────────────────────────────────────────────
// Rules (strictly enforced):
//   1. The reservation must exist, belong to this customer, and be 'completed'.
//   2. The reservation's scheduledAt must be in the past.
//   3. One review per completed booking (unique on {customer, reservation}).
//   4. rating (1–5) is compulsory.
//   5. comment is optional but if provided must be ≥10 characters.
//   6. Up to 5 image files (no videos).
exports.createReview = catchAsync(async (req, res, next) => {
  const { reservationId, restaurantId, rating, comment, foodRating, serviceRating, ambienceRating } = req.body;

  // ── 1. Require both IDs ───────────────────────────────────────────────────
  if (!reservationId) return next(new AppError('reservationId is required.', 400));
  if (!restaurantId)  return next(new AppError('restaurantId is required.', 400));
  if (!rating)        return next(new AppError('Overall rating is required.', 400));

  const ratingNum = Number(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5)
    return next(new AppError('Rating must be a number between 1 and 5.', 400));

  // ── 2. Comment min-length check (client copies this, but enforce server-side) ─
  if (comment && comment.trim().length > 0 && comment.trim().length < 10)
    return next(new AppError('Comment must be at least 10 characters if provided.', 400));

  // ── 3. Look up the specific completed reservation ─────────────────────────
  const reservation = await Reservation.findOne({
    _id:        reservationId,
    customer:   req.user.id,
    restaurant: restaurantId,
    status:     'completed',   // ONLY completed bookings — not confirmed/seated
  }).select('_id status scheduledAt confirmationCode');

  if (!reservation) {
    return next(new AppError(
      'You can only review a restaurant after your visit is marked as Completed. Please ensure the booking exists, belongs to you, and has been completed.',
      403
    ));
  }

  // ── 4. Visit date must be in the past ────────────────────────────────────
  if (new Date(reservation.scheduledAt) > new Date()) {
    return next(new AppError('You cannot review a future booking.', 400));
  }

  // ── 5. One review per booking ─────────────────────────────────────────────
  const existing = await Review.findOne({ customer: req.user.id, reservation: reservationId });
  if (existing) {
    return next(new AppError('You have already submitted a review for this visit.', 409));
  }

  // ── 6. Upload images to Cloudinary (images only, max 5) ──────────────────
  let reviewImages = [];
  if (req.files && req.files.length > 0) {
    if (req.files.length > 5)
      return next(new AppError('Maximum 5 photos allowed per review.', 400));

    // Reject non-image files
    const nonImage = req.files.find(f => !f.mimetype.startsWith('image/'));
    if (nonImage)
      return next(new AppError('Only image files (JPEG, PNG, WebP, etc.) are allowed.', 400));

    const folder = `tablemint/reviews/${restaurantId}`;
    try {
      const uploaded = await uploadManyToCloudinary(
        req.files.map(f => ({ buffer: f.buffer, mimetype: f.mimetype, originalname: f.originalname })),
        { folder }
      );
      reviewImages = uploaded.map(r => ({ url: r.url, publicId: r.publicId }));
    } catch (err) {
      logger.error('[Cloudinary] Review image upload failed:', err);
      return next(new AppError('Failed to upload photos. Please try again.', 502));
    }
  }

  // ── 7. Create the review ──────────────────────────────────────────────────
  let review;
  try {
    review = await Review.create({
      customer:      req.user.id,
      restaurant:    restaurantId,
      reservation:   reservationId,
      rating:        ratingNum,
      comment:       comment?.trim() || undefined,
      foodRating:    foodRating    ? Number(foodRating)    : undefined,
      serviceRating: serviceRating ? Number(serviceRating) : undefined,
      ambienceRating:ambienceRating? Number(ambienceRating): undefined,
      reviewImages,
      visitDate:     reservation.scheduledAt,
    });
  } catch (createErr) {
    // E11000 = MongoDB duplicate key — surface a meaningful message
    if (createErr.code === 11000) {
      return next(new AppError('You have already submitted a review for this visit.', 409));
    }
    throw createErr; // re-throw anything else to the global error handler
  }

  logger.info(`[Review] Created by user ${req.user.id} for restaurant ${restaurantId} | booking ${reservationId} | ${reviewImages.length} image(s).`);

  // ── Fire-and-forget ML sentiment analysis — customer does NOT wait for this ──
  if (review.comment) {
    triggerSentimentAnalysis(review._id.toString(), review.comment);
  }

  res.status(201).json({
    status: 'success',
    data: { review },
  });
});

// ── @PATCH /api/reviews/:id ───────────────────────────────────────────────────
exports.updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('Review not found.', 404));

  if (review.customer.toString() !== req.user.id)
    return next(new AppError('You can only edit your own reviews.', 403));

  // Comment min-length validation
  if (req.body.comment !== undefined && req.body.comment.trim().length > 0 && req.body.comment.trim().length < 10)
    return next(new AppError('Comment must be at least 10 characters if provided.', 400));

  const textFields = ['rating', 'comment', 'foodRating', 'serviceRating', 'ambienceRating'];
  textFields.forEach(field => {
    if (req.body[field] !== undefined) review[field] = req.body[field];
  });

  // ── Add new image files ───────────────────────────────────────────────────
  if (req.files && req.files.length > 0) {
    const currentCount = review.reviewImages.length;
    const maxImages    = 5;
    const slotsLeft    = maxImages - currentCount;
    if (slotsLeft <= 0)
      return next(new AppError(`Maximum of ${maxImages} photos allowed per review. Remove some first.`, 400));

    const filesToUpload = req.files.slice(0, slotsLeft);
    const nonImage      = filesToUpload.find(f => !f.mimetype.startsWith('image/'));
    if (nonImage) return next(new AppError('Only image files are allowed.', 400));

    const folder = `tablemint/reviews/${review.restaurant}`;
    try {
      const uploaded = await uploadManyToCloudinary(
        filesToUpload.map(f => ({ buffer: f.buffer, mimetype: f.mimetype, originalname: f.originalname })),
        { folder }
      );
      for (const r of uploaded) {
        review.reviewImages.push({ url: r.url, publicId: r.publicId });
      }
    } catch (err) {
      logger.error('[Cloudinary] Review image update failed:', err);
      return next(new AppError('Failed to upload photos. Please try again.', 502));
    }
  }

  // ── Remove specific images by publicId ───────────────────────────────────
  if (req.body.removeImages && Array.isArray(req.body.removeImages)) {
    for (const pid of req.body.removeImages) {
      const idx = review.reviewImages.findIndex(m => m.publicId === pid);
      if (idx !== -1) {
        await deleteFromCloudinary(pid, 'image');
        review.reviewImages.splice(idx, 1);
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

  if (req.user.role !== 'admin' && review.customer.toString() !== req.user.id)
    return next(new AppError('You are not authorized to delete this review.', 403));

  for (const item of review.reviewImages) {
    await deleteFromCloudinary(item.publicId, 'image');
  }

  await Review.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

// ── @POST /api/reviews/:id/respond ───────────────────────────────────────────
exports.respondToReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id).populate('restaurant', 'owner');
  if (!review) return next(new AppError('Review not found.', 404));

  if (req.user.role !== 'admin' && review.restaurant.owner.toString() !== req.user.id)
    return next(new AppError('You are not authorized to respond to this review.', 403));

  review.restaurantResponse = { text: req.body.text, respondedAt: new Date() };
  await review.save();

  res.status(200).json({ status: 'success', data: { review } });
});

// ── @GET /api/reviews/check-eligibility ──────────────────────────────────────
// Returns all completed bookings for a restaurant, each indicating whether a
// review has already been submitted for that specific booking.
exports.checkReviewEligibility = catchAsync(async (req, res, next) => {
  const { restaurantId } = req.query;
  if (!restaurantId) return next(new AppError('restaurantId query param is required.', 400));

  const now = new Date();

  // All completed, past-dated bookings for this customer at this restaurant
  const completedBookings = await Reservation.find({
    customer:   req.user.id,
    restaurant: restaurantId,
    status:     'completed',
    scheduledAt: { $lt: now },
  }).select('_id scheduledAt confirmationCode status');

  // Check which bookings already have a review
  const reviewedReservationIds = await Review.find({
    customer:    req.user.id,
    restaurant:  restaurantId,
    reservation: { $in: completedBookings.map(b => b._id) },
  }).distinct('reservation');

  const reviewedSet = new Set(reviewedReservationIds.map(id => id.toString()));

  const bookingsWithEligibility = completedBookings.map(b => ({
    reservationId:    b._id,
    confirmationCode: b.confirmationCode,
    scheduledAt:      b.scheduledAt,
    status:           b.status,
    hasReview:        reviewedSet.has(b._id.toString()),
  }));

  res.status(200).json({
    status: 'success',
    data: {
      hasAnyEligibleBooking: bookingsWithEligibility.some(b => !b.hasReview),
      bookings: bookingsWithEligibility,
    },
  });
});

// ── @GET /api/restaurants/:restaurantId/insights ──────────────────────────────
// Returns aggregated sentiment stats, star averages, aspect chips, and recent
// negative reviews. No auth required (public).
exports.getRestaurantInsights = catchAsync(async (req, res, next) => {
  const { restaurantId } = req.params;

  // 1. Parallel fetch: total review count + processed reviews + star averages
  const [totalAll, processedReviews, starAgg] = await Promise.all([
    // All reviews (processed + not) — for the Total Reviews stat
    Review.countDocuments({ restaurant: restaurantId, isVisible: true }),

    // Only ML-processed reviews — for sentiment stats / aspects
    Review.find({ restaurant: restaurantId, isVisible: true, isProcessed: true })
      .populate('customer', 'name')
      .lean(),

    // Star averages across ALL reviews (not just processed)
    Review.aggregate([
      { $match: { restaurant: require('mongoose').Types.ObjectId.createFromHexString(restaurantId) } },
      { $group: {
        _id: null,
        avgFood:     { $avg: '$foodRating' },
        avgService:  { $avg: '$serviceRating' },
        avgAmbience: { $avg: '$ambienceRating' },
        avgOverall:  { $avg: '$rating' },
      }},
    ]),
  ]);

  const processedTotal = processedReviews.length;

  // 2. Star averages (round to 1 decimal)
  const agg = starAgg[0] || {};
  const starAverages = {
    food:     agg.avgFood     ? +agg.avgFood.toFixed(1)     : null,
    service:  agg.avgService  ? +agg.avgService.toFixed(1)  : null,
    ambience: agg.avgAmbience ? +agg.avgAmbience.toFixed(1) : null,
    overall:  agg.avgOverall  ? +agg.avgOverall.toFixed(1)  : null,
  };

  // 3. Early return if no processed reviews yet
  if (processedTotal === 0) {
    return res.status(200).json({
      status: 'success',
      data: {
        total:           totalAll,
        processedTotal:  0,
        positivePercent: 0,
        negativePercent: 0,
        neutralPercent:  0,
        starAverages,
        topAspects:      [],
        negativeReviews: [],
      },
    });
  }

  // 4. Count sentiment labels
  let positive = 0, negative = 0, neutral = 0;
  for (const r of processedReviews) {
    if      (r.sentimentLabel === 'POSITIVE') positive++;
    else if (r.sentimentLabel === 'NEGATIVE') negative++;
    else                                      neutral++;
  }

  const positivePercent = Math.round((positive / processedTotal) * 100);
  const negativePercent = Math.round((negative / processedTotal) * 100);
  const neutralPercent  = Math.round((neutral  / processedTotal) * 100);

  // 5. Aggregate aspects across all processed reviews
  const aspectMap = {};
  for (const r of processedReviews) {
    if (Array.isArray(r.aspects)) {
      for (const a of r.aspects) {
        const key = (a.aspect || '').toLowerCase().trim();
        if (!key) continue;
        if (!aspectMap[key]) aspectMap[key] = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0, total: 0 };
        aspectMap[key][a.sentiment] = (aspectMap[key][a.sentiment] || 0) + 1;
        aspectMap[key].total += 1;
      }
    }
  }
  const topAspects = Object.entries(aspectMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([aspect, data]) => ({
      aspect,
      total:           data.total,
      positivePercent: Math.round((data.POSITIVE / data.total) * 100),
      negativePercent: Math.round((data.NEGATIVE / data.total) * 100),
    }));

  // 6. 5 most recent NEGATIVE reviews
  const negativeReviews = processedReviews
    .filter(r => r.sentimentLabel === 'NEGATIVE')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map(r => ({
      text:           r.comment || '',
      createdAt:      r.createdAt,
      sentimentScore: r.sentimentScore ?? null,
      userName:       r.customer?.name || 'Anonymous',
    }));

  res.status(200).json({
    status: 'success',
    data: {
      total:           totalAll,
      processedTotal,
      positivePercent,
      negativePercent,
      neutralPercent,
      starAverages,
      topAspects,
      negativeReviews,
    },
  });
});

