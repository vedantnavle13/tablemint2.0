const mongoose = require('mongoose');

const preOrderItemSchema = new mongoose.Schema({
    menuItem: {
        type: mongoose.Schema.Types.ObjectId,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
});

const billItemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    amount:      { type: Number, required: true },
    quantity:    { type: Number, default: 1 },
});

const notificationLogSchema = new mongoose.Schema({
    sentAt:   { type: Date, default: Date.now },
    sentBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message:  { type: String, required: true },
    channel:  { type: String, enum: ['email', 'sms', 'push'], default: 'email' },
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
            default: null,
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
        // pending → confirmed → seated → completed | cancelled | no_show
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

        // ── Customer message (sent after confirmation) ───────────────────────────
        // Customer can send one special message/request to the restaurant after their
        // reservation is confirmed. Stored here, visible to restaurant staff.
        customerMessage: {
            type: String,
            maxlength: [600, 'Message cannot exceed 600 characters'],
            default: null,
        },
        customerMessageSentAt: {
            type: Date,
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

        // ── Admin notification log ───────────────────────────────────────────────
        // Tracks every "Notify Customer" action the admin/owner performs.
        notificationLog: [notificationLogSchema],

        // ── Bill fields ──────────────────────────────────────────────────────────
        // Populated when admin marks the visit as completed and generates a bill.
        billItems: [billItemSchema],
        billGeneratedAt: {
            type: Date,
            default: null,
        },
        billGeneratedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        // Grand total computed at bill generation (may differ from totalAmount
        // which is pre-computed from pre-order only).
        billTotal: {
            type: Number,
            default: 0,
        },
        // Tax (GST etc.) stored separately for transparency
        billTax: {
            type: Number,
            default: 0,
        },
        billNotes: {
            type: String,
            default: null,
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
reservationSchema.index({ assignedCaptain: 1, status: 1 });
reservationSchema.index({ scheduledAt: 1, status: 1 });

// ─── Pre-save: generate confirmation code & compute totals ───────────────────
reservationSchema.pre('save', function (next) {
    if (this.isNew && !this.confirmationCode) {
        this.confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
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

// ─── Virtual: can transition to "seated"? (≥30 min before booking time) ──────
// Admin/owner/captain can seat a customer starting 30 minutes before scheduled time.
reservationSchema.virtual('canSeat').get(function () {
    const thirtyMinBefore = new Date(this.scheduledAt.getTime() - 30 * 60 * 1000);
    return new Date() >= thirtyMinBefore && this.status === 'confirmed';
});

// ─── Virtual: can mark as "no_show"? (≥45 min after booking time) ─────────────
reservationSchema.virtual('canMarkNoShow').get(function () {
    const fortyFiveMinAfter = new Date(this.scheduledAt.getTime() + 45 * 60 * 1000);
    return new Date() >= fortyFiveMinAfter && this.status === 'confirmed';
});

module.exports = mongoose.model('Reservation', reservationSchema);
