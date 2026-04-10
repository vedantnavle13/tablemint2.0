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
    password: { type: String, required: [true, 'Password is required'], minlength: [6, 'Password must be at least 6 characters'], select: false },
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
  this.password = await bcrypt.hash(this.password, 12);
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
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
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
  };
};

module.exports = mongoose.model('User', userSchema);
