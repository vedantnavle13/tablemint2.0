const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateCustomerId = () =>
  Math.floor(100000000 + Math.random() * 900000000).toString();

const userSchema = new mongoose.Schema(
  {
    customerId: { type: String, unique: true, sparse: true },
    name:  { type: String, required: [true, 'Name is required'], trim: true },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: [true, 'Password is required'], minlength: [8, 'Password must be at least 8 characters'], select: false },
    role: {
      type: String,
      // ✅ superadmin added — has access to restaurant verification portal
      enum: ['customer', 'captain', 'admin', 'owner', 'superadmin'],
      default: 'customer',
    },
    assignedRestaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    restaurants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],
    avatar:   { type: String, default: null },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    otp: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    passwordResetToken: String,
    passwordResetExpires: Date,
    tokenVersion: { type: Number, default: 0 },
    lastLogin: Date,

    // ─── Recommendation / Personalisation fields ──────────────────────────────
    /** Cuisine types the user prefers. e.g. ['Italian', 'South Indian'] */
    preferredCuisines: [{ type: String, trim: true }],

    preferredPriceRange: {
      type: String,
      enum: ['Up to ₹500', '₹500 - ₹1000', 'Up to ₹1000', '₹1000 - ₹2000', '₹2000 - ₹3000', '₹2000+', '₹3000+'],
    },

    /** Dietary filters. e.g. ['Veg', 'Jain', 'Eggetarian'] */
    dietaryPreferences: [{ type: String, trim: true }],

    /** User's home city — used for geo-aware recommendations */
    city: { type: String, trim: true },

    /** Optional precise coordinates for distance-based ranking */
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },

    /**
     * Percentage (0–100) auto-calculated by calculateProfileCompletion().
     * Updated whenever the user edits their profile preferences.
     */
    profileCompletedPercentage: { type: Number, default: 0, min: 0, max: 100 },

    /**
     * Which onboarding steps the user has completed.
     * e.g. ['preferredCuisines', 'city', 'dietaryPreferences']
     */
    completedProfileSteps: [{ type: String }],
  },
  { timestamps: true }
);

// Auto-generate 9-digit customerId for customers
userSchema.pre('save', async function (next) {
  if (this.role === 'customer' && !this.customerId) {
    let id, exists = true;
    while (exists) {
      id = generateCustomerId();
      exists = !!(await mongoose.model('User').findOne({ customerId: id }));
    }
    this.customerId = id;
  }
  next();
});

// Hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10); // 10 rounds — secure + fast on Render free tier
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.generateJWT = function () {
  return jwt.sign(
    { id: this._id, role: this.role, version: this.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

userSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  // Token expires in 15 minutes for adequate time to complete reset
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000;
  return token;
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    customerId: this.customerId,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    avatar: this.avatar,
    assignedRestaurant: this.assignedRestaurant,
    restaurants: this.restaurants,
    isActive: this.isActive,
    isVerified: this.isVerified,
    createdAt: this.createdAt,
    // Recommendation / personalisation
    preferredCuisines: this.preferredCuisines,
    preferredPriceRange: this.preferredPriceRange,
    dietaryPreferences: this.dietaryPreferences,
    city: this.city,
    location: this.location,
    profileCompletedPercentage: this.profileCompletedPercentage,
    completedProfileSteps: this.completedProfileSteps,
  };
};

module.exports = mongoose.model('User', userSchema);
