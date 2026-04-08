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
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    // Sub-ratings
    foodRating: { type: Number, min: 1, max: 5 },
    serviceRating: { type: Number, min: 1, max: 5 },
    ambienceRating: { type: Number, min: 1, max: 5 },
    valueRating: { type: Number, min: 1, max: 5 },

    // Restaurant response
    restaurantResponse: {
      text: String,
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
// One review per customer per restaurant
reviewSchema.index({ customer: 1, restaurant: 1 }, { unique: true });

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
      avgRating: Math.round(stats[0].avgRating * 10) / 10,
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
