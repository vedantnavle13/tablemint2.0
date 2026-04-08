const Joi = require('joi');
const AppError = require('../utils/AppError');

// ─── Validation middleware factory ────────────────────────────────────────────
exports.validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
  if (error) {
    const message = error.details.map((d) => d.message).join('. ');
    return next(new AppError(message, 400));
  }
  next();
};

// ─── Schemas ──────────────────────────────────────────────────────────────────
exports.schemas = {

  // ── Auth — names match authRoutes.js exactly ───────────────────────────────

  // ✅ FIXED: was named 'register', routes use 'registerSchema'
  registerSchema: Joi.object({
    name: Joi.string().min(2).max(60).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().optional().allow(''),
    password: Joi.string().min(8).required(),
    // ✅ FIXED: allow 'owner' on public registration
    role: Joi.string().valid('customer', 'owner').default('customer'),
  }),

  loginSchema: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  forgotPasswordSchema: Joi.object({
    email: Joi.string().email().required(),
  }),

  resetPasswordSchema: Joi.object({
    password: Joi.string().min(8).required(),
  }),

  changePasswordSchema: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(60).optional(),
    phone: Joi.string().optional().allow(''),
  }),

  // ── Restaurant ─────────────────────────────────────────────────────────────

  createRestaurantSchema: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(1000).optional().allow(''),
    phone: Joi.string().optional().allow(''),
    email: Joi.string().email().optional().allow(''),
    website: Joi.string().optional().allow(''),
    priceRange: Joi.string().valid('budget', 'moderate', 'expensive', 'luxury').default('moderate'),
    reservationFee: Joi.number().min(0).default(0),
    instantBookingEnabled: Joi.boolean().default(true),
    cuisine: Joi.array().items(Joi.string()).optional(),
    features: Joi.array().items(Joi.string()).optional(),
    dietaryOptions: Joi.array().items(Joi.string()).optional(),
    specialties: Joi.array().items(Joi.string()).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    address: Joi.object({
      street: Joi.string().optional().allow(''),
      area: Joi.string().optional().allow(''),
      city: Joi.string().optional().allow(''),
      state: Joi.string().optional().allow(''),
      pincode: Joi.string().optional().allow(''),
      country: Joi.string().optional().allow(''),
    }).optional(),
    operatingHours: Joi.array().items(
        Joi.object({
          day: Joi.string().valid('monday','tuesday','wednesday','thursday','friday','saturday','sunday').required(),
          open: Joi.string().required(),
          close: Joi.string().required(),
          isClosed: Joi.boolean().default(false),
        })
    ).optional(),
    location: Joi.object({
      type: Joi.string().valid('Point').default('Point'),
      coordinates: Joi.array().items(Joi.number()).length(2).optional(),
    }).optional(),
  }),

  // ── Reservation ────────────────────────────────────────────────────────────

  createReservation: Joi.object({
    restaurantId: Joi.string().required(),
    type: Joi.string().valid('instant', 'scheduled').required(),
    scheduledAt: Joi.date().required(),
    arrivalInMinutes: Joi.number().optional().allow(null),
    numberOfGuests: Joi.number().min(1).required(),
    specialRequests: Joi.string().optional().allow(''),
    preOrderItems: Joi.array().optional(),
  }),
};