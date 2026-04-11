const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    // Each review is tied to a SPECIFIC completed booking.
    // This allows the same customer to review the same restaurant
    // multiple times across different visits.
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: [true, 'A completed reservation is required to leave a review'],
    },

    // ── Overall rating (compulsory, 1–5) ─────────────────────────────────────
    rating: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },

    // ── Comment (optional, but min 10 chars if provided) ─────────────────────
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      validate: {
        validator: function (v) {
          // If comment is provided (non-empty string), it must be ≥10 chars
          if (v && v.trim().length > 0) return v.trim().length >= 10;
          return true; // empty / not provided → valid
        },
        message: 'Comment must be at least 10 characters if provided.',
      },
    },

    // ── Sub-ratings (all optional, 1–5) ──────────────────────────────────────
    foodRating:     { type: Number, min: 1, max: 5 },
    serviceRating:  { type: Number, min: 1, max: 5 },
    ambienceRating: { type: Number, min: 1, max: 5 },

    // ── Photo attachments (Cloudinary, images only, max 5) ───────────────────
    reviewImages: [
      {
        url:      { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    // ── Visit date (copied from reservation.scheduledAt for display) ──────────
    visitDate: {
      type: Date,
    },

    // ── Restaurant response ───────────────────────────────────────────────────
    restaurantResponse: {
      text:        String,
      respondedAt: Date,
    },

    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
reviewSchema.index({ restaurant: 1, createdAt: -1 });
reviewSchema.index({ customer: 1 });
// One review per completed booking (NOT per restaurant — same customer can review
// the same restaurant again via a different booking).
reviewSchema.index({ customer: 1, reservation: 1 }, { unique: true });

// ─── After save/delete: recalculate restaurant average rating ─────────────────
reviewSchema.statics.calcAverageRating = async function (restaurantId) {
  const stats = await this.aggregate([
    { $match: { restaurant: restaurantId, isVisible: true } },
    {
      $group: {
        _id: '$restaurant',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const Restaurant = require('./Restaurant');
  if (stats.length > 0) {
    await Restaurant.findByIdAndUpdate(restaurantId, {
      avgRating:    Math.round(stats[0].avgRating * 10) / 10,
      totalReviews: stats[0].count,
    });
  } else {
    await Restaurant.findByIdAndUpdate(restaurantId, {
      avgRating: 0,
      totalReviews: 0,
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.calcAverageRating(this.restaurant);
});

reviewSchema.post('findOneAndDelete', function (doc) {
  if (doc) doc.constructor.calcAverageRating(doc.restaurant);
});

module.exports = mongoose.model('Review', reviewSchema);
