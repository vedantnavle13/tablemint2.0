const mongoose = require('mongoose');

const preOrderItemSchema = new mongoose.Schema({
    menuItem: {
        type: mongoose.Schema.Types.ObjectId,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
});

const reservationSchema = new mongoose.Schema(
    {
        // ── References ──────────────────────────────────────────────────────────
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
        table: {
            type: mongoose.Schema.Types.ObjectId,
            default: null, // Assigned by captain or system
        },
        assignedCaptain: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        // ── Booking type ─────────────────────────────────────────────────────────
        type: {
            type: String,
            enum: ['instant', 'scheduled'],
            required: true,
            default: 'scheduled',
        },

        // ── Timing ───────────────────────────────────────────────────────────────
        scheduledAt: {
            type: Date,
            required: true,
        },
        // For instant: arrival in X minutes from creation
        arrivalInMinutes: {
            type: Number,
            default: null,
        },
        duration: {
            type: Number,
            default: 90, // Estimated dining duration in minutes
        },

        // ── Guests ───────────────────────────────────────────────────────────────
        numberOfGuests: {
            type: Number,
            required: true,
            min: [1, 'At least 1 guest required'],
            max: [20, 'Max 20 guests per reservation'],
        },

        // ── Status lifecycle ─────────────────────────────────────────────────────
        // pending → confirmed → seated → completed | cancelled
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
            default: 'pending',
        },
        cancelledBy: {
            type: String,
            enum: ['customer', 'restaurant', 'admin', 'system'],
            default: null,
        },
        cancellationReason: {
            type: String,
            default: null,
        },
        cancelledAt: {
            type: Date,
            default: null,
        },

        // ── Pre-order ────────────────────────────────────────────────────────────
        preOrderItems: [preOrderItemSchema],
        preOrderTotal: {
            type: Number,
            default: 0,
        },

        // ── Fees & Payment ───────────────────────────────────────────────────────
        reservationFee: {
            type: Number,
            default: 0,
        },
        totalAmount: {
            type: Number,
            default: 0,
        },
        paymentStatus: {
            type: String,
            enum: ['unpaid', 'paid', 'refunded', 'waived'],
            default: 'unpaid',
        },
        paymentReference: {
            type: String,
            default: null,
        },

        // ── Special requests ─────────────────────────────────────────────────────
        specialRequests: {
            type: String,
            maxlength: [500, 'Special requests cannot exceed 500 characters'],
            default: null,
        },

        // ── Internal captain notes ────────────────────────────────────────────────
        captainNotes: {
            type: String,
            default: null,
        },

        // ── Confirmation code (6-char alphanumeric) ───────────────────────────────
        confirmationCode: {
            type: String,
            unique: true,
        },

        // ── Reminder sent flags ───────────────────────────────────────────────────
        reminderSent: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
reservationSchema.index({ customer: 1, createdAt: -1 });
reservationSchema.index({ restaurant: 1, scheduledAt: 1 });
reservationSchema.index({ restaurant: 1, status: 1 });
// Note: confirmationCode index already created by unique:true in the schema field above
reservationSchema.index({ assignedCaptain: 1, status: 1 });
reservationSchema.index({ scheduledAt: 1, status: 1 });

// ─── Pre-save: generate confirmation code & compute totals ───────────────────
reservationSchema.pre('save', function (next) {
    if (this.isNew && !this.confirmationCode) {
        this.confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Calculate totals
    this.preOrderTotal = this.preOrderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );
    this.totalAmount = this.reservationFee + this.preOrderTotal;

    next();
});

// ─── Virtual: is the reservation upcoming? ────────────────────────────────────
reservationSchema.virtual('isUpcoming').get(function () {
    return this.scheduledAt > new Date() && ['pending', 'confirmed'].includes(this.status);
});

module.exports = mongoose.model('Reservation', reservationSchema);
