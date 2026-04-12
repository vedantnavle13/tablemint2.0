const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Interaction Schema
 * ─────────────────
 * Captures every meaningful signal between a user and a restaurant.
 * This raw event log is the primary data source for training a
 * hybrid recommendation model (collaborative + content-based filtering).
 *
 * Collection strategy:
 *   • Emit an Interaction document from controllers whenever a user:
 *       views a restaurant page, searches, adds to favourite,
 *       makes a booking, places an order, or writes a review.
 *   • Keep the schema lightweight and append-only.
 *   • Run a nightly aggregation job (later) to derive implicit ratings.
 */
const interactionSchema = new Schema(
  {
    // ── Who ──────────────────────────────────────────────────────────────────
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },

    // ── Where ─────────────────────────────────────────────────────────────────
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant reference is required'],
      index: true,
    },

    // ── What ──────────────────────────────────────────────────────────────────
    /**
     * Interaction type is a discrete signal.
     * Implicit signals (view, click_menu, search) carry a lower weight
     * than explicit signals (add_to_favorite, booking_made, review_given).
     *
     * Approximate weight mapping for ML feature engineering:
     *   view             → 1
     *   click_menu       → 2
     *   search           → 1
     *   add_to_favorite  → 4
     *   booking_made     → 5
     *   order_placed     → 5
     *   review_given     → 10
     */
    interactionType: {
      type: String,
      enum: {
        values: [
          'view',
          'click_menu',
          'search',
          'add_to_favorite',
          'booking_made',
          'order_placed',
          'review_given',
        ],
        message: '{VALUE} is not a valid interaction type.',
      },
      required: [true, 'Interaction type is required'],
    },

    // ── Explicit feedback ─────────────────────────────────────────────────────
    /**
     * Numeric rating (1–5) — only populated when interactionType === 'review_given'.
     * Serves as the explicit feedback signal for collaborative filtering.
     */
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      default: null,
    },

    // ── When / session context ────────────────────────────────────────────────
    /** ISO timestamp of the interaction; used for recency weighting in ranking. */
    timestamp: { type: Date, default: Date.now },

    /**
     * Browser / app session identifier.
     * Groups multiple interactions in a single visit to detect "session depth".
     * Can be a UUID generated on the frontend or from Express session.
     */
    sessionId: { type: String, default: null },

    /**
     * Time spent on the restaurant page (seconds).
     * A proxy for interest intensity — longer dwell time → stronger signal.
     * Only relevant for interactionType === 'view' or 'click_menu'.
     */
    timeSpent: {
      type: Number,
      min: [0, 'timeSpent cannot be negative'],
      default: null,
    },
  },
  {
    timestamps: false, // We manage `timestamp` ourselves for ML precision
    versionKey: false, // Removes __v — keeps documents lean for bulk inserts
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

/**
 * Compound index: (user, restaurant, timestamp DESC)
 * ✔ Powers "most recent interactions for user X with restaurant Y" queries.
 * ✔ Supports user-specific interaction history with chronological ordering.
 */
interactionSchema.index({ user: 1, restaurant: 1, timestamp: -1 });

/**
 * Single-field index on interactionType.
 * ✔ Efficiently filters all 'booking_made' events for popularity scoring.
 * ✔ Supports analytics dashboards that group by event type.
 */
interactionSchema.index({ interactionType: 1 });

/**
 * Timestamp index for time-windowed batch jobs.
 * ✔ Nightly aggregation: "all interactions in the last 24 h"
 */
interactionSchema.index({ timestamp: -1 });

// ─── Static helper: log an interaction ────────────────────────────────────────
/**
 * Convenience factory to safely record an interaction without throwing.
 * Usage in controllers:
 *   await Interaction.log({ user, restaurant, interactionType, sessionId });
 *
 * @param {Object} payload
 * @returns {Promise<void>}
 */
interactionSchema.statics.log = async function (payload) {
  try {
    await this.create(payload);
  } catch (err) {
    // Never let interaction tracking crash the main request flow
    console.error('[Interaction.log] Failed to record interaction:', err.message);
  }
};

module.exports = mongoose.model('Interaction', interactionSchema);
