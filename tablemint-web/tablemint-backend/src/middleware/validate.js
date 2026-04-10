const Joi = require('joi');
const AppError = require('../utils/AppError');

// ─── Validation middleware factory ────────────────────────────────────────────
// Validates req.body against the given Joi schema.
// Returns all errors at once (abortEarly: false) in a clean message.
exports.validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: true,    // allow unknown fields to pass through (don't error on them)
    stripUnknown: true,    // but strip unknown fields from the sanitized value
  });

  if (error) {
    const message = error.details.map((d) => d.message.replace(/['"]/g, '')).join('. ');
    return next(new AppError(message, 400));
  }

  // Replace req.body with the sanitized value (stripped + coerced)
  req.body = value;
  next();
};

// ─── Reusable field definitions ───────────────────────────────────────────────

/** Valid email: must have local-part, @, and domain with TLD */
const emailField = () =>
  Joi.string()
    .email({ tlds: { allow: false } }) // allow: false = don't validate TLD list (flexible)
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address (must include @ and a domain).',
      'any.required': 'Email is required.',
    });

/**
 * Strong password: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number.
 * This regex is kept intentionally simple and readable.
 */
const passwordField = (label = 'Password') =>
  Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
    .messages({
      'string.min': `${label} must be at least 8 characters.`,
      'string.pattern.base':
        `${label} must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number.`,
      'any.required': `${label} is required.`,
    });

/** Indian mobile number: exactly 10 digits */
const phoneField = () =>
  Joi.string()
    .pattern(/^\d{10}$/)
    .messages({
      'string.pattern.base': 'Phone number must be exactly 10 digits (Indian format).',
    });

/** Indian pincode: exactly 6 digits */
const pincodeField = () =>
  Joi.string()
    .pattern(/^\d{6}$/)
    .messages({
      'string.pattern.base': 'Pincode must be exactly 6 digits.',
    });

// ─── Schemas ──────────────────────────────────────────────────────────────────
exports.schemas = {

  // ── Auth ──────────────────────────────────────────────────────────────────

  /**
   * Public user registration (customer or owner).
   * NOTE: "isAdmin" is intentionally excluded — admin accounts can only be
   * created via the secure POST /api/auth/create-admin route (superadmin only).
   */
  registerSchema: Joi.object({
    name: Joi.string().min(2).max(60).trim().required().messages({
      'string.min': 'Name must be at least 2 characters.',
      'string.max': 'Name must not exceed 60 characters.',
      'any.required': 'Name is required.',
    }),
    email: emailField().required(),
    phone: phoneField().optional().allow(''),
    password: passwordField().required(),
    // Only customer or owner may self-register; any other value defaults to customer
    role: Joi.string().valid('customer', 'owner').default('customer'),
  }),

  loginSchema: Joi.object({
    email: emailField().required(),
    password: Joi.string().required().messages({ 'any.required': 'Password is required.' }),
  }),

  forgotPasswordSchema: Joi.object({
    email: emailField().required(),
  }),

  resetPasswordSchema: Joi.object({
    password: passwordField('New password').required(),
  }),

  changePasswordSchema: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required.',
    }),
    newPassword: passwordField('New password').required(),
  }),

  updateProfileSchema: Joi.object({
    name:  Joi.string().min(2).max(60).trim().optional(),
    phone: phoneField().optional().allow(''),
  }),

  /** Secure admin creation — used only by superadmin via POST /api/auth/create-admin */
  createAdminSchema: Joi.object({
    name:         Joi.string().min(2).max(60).trim().required(),
    email:        emailField().required(),
    restaurantId: Joi.string().optional().allow('', null),
  }),

  // ── Restaurant ────────────────────────────────────────────────────────────

  createRestaurantSchema: Joi.object({
    name:        Joi.string().min(2).max(100).trim().required(),
    description: Joi.string().max(1000).trim().optional().allow(''),
    phone:       phoneField().optional().allow(''),
    email:       emailField().optional().allow(''),
    website:     Joi.string().uri().optional().allow(''),
    priceRange:  Joi.string().valid('budget', 'moderate', 'expensive', 'luxury').default('moderate'),
    reservationFee:       Joi.number().min(0).default(0),
    instantBookingEnabled: Joi.boolean().default(true),
    cuisine:         Joi.array().items(Joi.string()).optional(),
    features:        Joi.array().items(Joi.string()).optional(),
    dietaryOptions:  Joi.array().items(Joi.string()).optional(),
    specialties:     Joi.array().items(Joi.string()).optional(),
    tags:            Joi.array().items(Joi.string()).optional(),
    address: Joi.object({
      street:  Joi.string().trim().optional().allow(''),
      area:    Joi.string().trim().optional().allow(''),
      city:    Joi.string().trim().optional().allow(''),
      state:   Joi.string().trim().optional().allow(''),
      pincode: pincodeField().optional().allow(''),
      country: Joi.string().trim().optional().allow(''),
    }).optional(),
    operatingHours: Joi.array().items(
      Joi.object({
        day:      Joi.string().valid('monday','tuesday','wednesday','thursday','friday','saturday','sunday').required(),
        open:     Joi.string().required(),
        close:    Joi.string().required(),
        isClosed: Joi.boolean().default(false),
      })
    ).optional(),
    location: Joi.object({
      type:        Joi.string().valid('Point').default('Point'),
      coordinates: Joi.array().items(Joi.number()).length(2).optional(),
    }).optional(),
  }),

  // ── Reservation ───────────────────────────────────────────────────────────

  createReservation: Joi.object({
    restaurantId:    Joi.string().required(),
    type:            Joi.string().valid('instant', 'scheduled').required(),
    scheduledAt:     Joi.date().required(),
    arrivalInMinutes: Joi.number().optional().allow(null),
    numberOfGuests:  Joi.number().min(1).required(),
    specialRequests: Joi.string().optional().allow(''),
    preOrderItems:   Joi.array().optional(),
  }),
};