const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
    tableNumber: { type: String, required: true },
    capacity: { type: Number, required: true, min: 1 },
    isAvailable: { type: Boolean, default: true },
    location: {
        type: String,
        enum: ['indoor', 'outdoor', 'rooftop', 'private'],
        default: 'indoor',
    },
});

const menuItemSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: {
        type: String,
        enum: ['starter', 'main', 'dessert', 'beverage', 'special'],
        required: true,
    },
    isVeg: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    image: { type: String, default: null },
    allergens: [String],
});

const operatingHoursSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true,
    },
    open: { type: String, required: true },
    close: { type: String, required: true },
    isClosed: { type: Boolean, default: false },
});

const restaurantSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Restaurant name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        slug: { type: String, unique: true, lowercase: true },
        description: { type: String, trim: true, maxlength: [1000, 'Description cannot exceed 1000 characters'] },
        cuisine: [{ type: String, trim: true }],

        // ─── Recommendation fields ─────────────────────────────────────────
        /**
         * Normalised cuisine list used for recommendation matching.
         * Separate from legacy `cuisine` to avoid breaking existing queries.
         * e.g. ['North Indian', 'Mughlai', 'Biryani']
         */
        cuisines: [{ type: String, trim: true }],
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        captains: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        address: {
            street: { type: String, required: [true, 'Street address is required'], trim: true },
            area: { type: String, required: [true, 'Area / locality is required'], trim: true },
            city: { type: String, required: [true, 'City is required'], default: 'Pune', trim: true },
            state: { type: String, default: 'Maharashtra', trim: true },
            pincode: { type: String, required: [true, 'Pincode is required'], trim: true },
            country: { type: String, default: 'India', trim: true },
        },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: {
                type: [Number],
                required: [true, 'Restaurant location (latitude & longitude) is required'],
                validate: {
                    validator: function(v) {
                        // Must have exactly 2 elements and not be the [0,0] null-island default
                        return Array.isArray(v) && v.length === 2 && !(v[0] === 0 && v[1] === 0);
                    },
                    message: 'Valid latitude and longitude are required for the restaurant location.',
                },
            },
        },
        phone: { type: String, trim: true },
        email: { type: String, required: [true, 'Restaurant email is required'], trim: true, lowercase: true },
        website: { type: String, trim: true },
        // ── Photos (Cloudinary) ──────────────────────────────────────────────────
        coverImage: {
            url:      { type: String, default: null },
            publicId: { type: String, default: null },
        },
        gallery: [
            {
                url:      { type: String, required: true },
                publicId: { type: String, required: true },
            },
        ],
        priceRange: {
            type: String,
            /**
             * Dual enum: legacy text values kept for backward compat;
             * new rupee-symbol values added for recommendation matching
             * against User.preferredPriceRange.
             */
            enum: ['budget', 'moderate', 'expensive', 'luxury', '₹', '₹₹', '₹₹₹', '₹₹₹₹', 'Up to ₹500', '₹500 - ₹1000', 'Up to ₹1000', '₹1000 - ₹2000', '₹2000 - ₹3000', '₹2000+', '₹3000+'],
            required: [true, 'Price range is required'],
            default: 'moderate',
        },
        features: [{ type: String, trim: true }],
        dietaryOptions: [{
            type: String,
            enum: ['Vegetarian', 'Vegan Options', 'Gluten-Free Available', 'Halal', 'Jain'],
        }],
        specialties: [{ type: String, trim: true }],

        /**
         * Ambience descriptors for content-based filtering.
         * e.g. ['romantic', 'casual', 'vibrant', 'quiet', 'business']
         */
        ambience: [{ type: String, trim: true, lowercase: true }],

        /**
         * Profile completion percentage (0–100) for the restaurant listing.
         * Starts at 30 (basic details always present); grows as owner enriches
         * cuisines, ambience, features, menu items, operating hours, etc.
         */
        profileCompletedPercentage: { type: Number, default: 30, min: 0, max: 100 },
        operatingHours: [operatingHoursSchema],
        tables: [tableSchema],
        menu: [menuItemSchema],
        reservationFee: { type: Number, default: 0, min: 0 },
        instantBookingEnabled: { type: Boolean, default: true },
        maxAdvanceBookingDays: { type: Number, default: 30 },
        minNoticeMinutes: { type: Number, default: 30 },
        avgRating: {
            type: Number, default: 0, min: 0, max: 5,
            set: (val) => Math.round(val * 10) / 10,
        },
        totalReviews: { type: Number, default: 0 },
        isActive: { type: Boolean, default: false },
        isFeatured: { type: Boolean, default: false },
        verificationStatus: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending',
        },
        verificationOtp: { type: String, default: null, select: false },
        verificationOtpExpires: { type: Date, default: null },
        verifiedAt: { type: Date, default: null },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        tags: [{ type: String, lowercase: true, trim: true }],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ owner: 1 });
restaurantSchema.index({ avgRating: -1 });
restaurantSchema.index({ isActive: 1, isFeatured: -1 });
restaurantSchema.index({ cuisine: 1 });
restaurantSchema.index({ tags: 1 });
restaurantSchema.index(
    { name: 'text', description: 'text', 'address.area': 'text', cuisine: 'text', tags: 'text' },
    { weights: { name: 10, cuisine: 5, tags: 3, description: 1 } }
);

// ─── Virtual: total available seats ──────────────────────────────────────────
// ✅ FIXED: guard against undefined — happens when .select() excludes the tables field
restaurantSchema.virtual('totalSeats').get(function () {
    if (!this.tables || this.tables.length === 0) return 0;
    return this.tables.reduce((sum, t) => sum + (t.isAvailable ? t.capacity : 0), 0);
});

// ─── Pre-save: auto-generate slug ────────────────────────────────────────────
restaurantSchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 80);
    }
    next();
});

module.exports = mongoose.model('Restaurant', restaurantSchema);