const Review = require('../models/Review');
const Reservation = require('../models/Reservation');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

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
exports.createReview = catchAsync(async (req, res, next) => {
  const { restaurantId, reservationId, ...reviewData } = req.body;

  // Optionally verify the reservation belongs to this customer
  if (reservationId) {
    const reservation = await Reservation.findOne({
      _id: reservationId,
      customer: req.user.id,
      restaurant: restaurantId,
      status: 'completed',
    });
    if (!reservation) {
      return next(new AppError('You can only review restaurants where you have completed a reservation.', 403));
    }
  }

  const review = await Review.create({
    customer: req.user.id,
    restaurant: restaurantId,
    reservation: reservationId || null,
    ...reviewData,
  });

  res.status(201).json({
    status: 'success',
    data: { review },
  });
});

// ── @PATCH /api/reviews/:id ───────────────────────────────────────────────────
exports.updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('Review not found.', 404));

  if (review.customer.toString() !== req.user.id) {
    return next(new AppError('You can only edit your own reviews.', 403));
  }

  const allowed = ['rating', 'title', 'comment', 'foodRating', 'serviceRating', 'ambienceRating', 'valueRating'];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) review[field] = req.body[field];
  });

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

  await Review.findByIdAndDelete(req.params.id);

  res.status(204).json({ status: 'success', data: null });
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
    text: req.body.text,
    respondedAt: new Date(),
  };
  await review.save();

  res.status(200).json({ status: 'success', data: { review } });
});
