const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendEmail, emailTemplates } = require('../utils/email');
const logger = require('../utils/logger');
const { calculateProfileCompletion } = require('../utils/profileCompletion');

// ─── Password complexity validator ──────────────────────────────────────────
// At least 8 chars, 1 uppercase, 1 lowercase, 1 digit
const isStrongPassword = (pwd) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pwd);

// ─── Helper: generate a random 6-digit OTP string ──────────────────────────
const generateOTP = () => {
  // cryptographically random 6-digit number, zero-padded
  return String(Math.floor(100000 + crypto.randomInt(900000))).padStart(6, '0');
};

// ─── Helper: send JWT response ──────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.generateJWT();

  res.cookie('jwt', token, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user: user.toPublicJSON() },
  });
};

// ─── @POST /api/auth/register ───────────────────────────────────────────────
// Creates an unverified user and emails a 6-digit OTP.
// Does NOT return a JWT — users must verify OTP first.
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !password) {
    return next(new AppError('Name, email and password are required.', 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    // If the account was soft-deleted (isActive: false), permanently remove it so the email is free
    if (!existingUser.isActive) {
      await User.findByIdAndDelete(existingUser._id);
    } else if (existingUser.isVerified) {
      return next(new AppError('An account with this email already exists.', 400));
    } else {
      // Unverified duplicate — resend a fresh OTP instead of blocking
      const otp = generateOTP();
      existingUser.otp = await bcrypt.hash(otp, 10);
      existingUser.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await existingUser.save({ validateBeforeSave: false });

      const tpl = emailTemplates.otpVerification(existingUser, otp);
      await sendEmail({ to: existingUser.email, ...tpl });

      return res.status(200).json({
        status: 'success',
        message: 'A new verification code has been sent to your email.',
        data: { email: existingUser.email },
      });
    }
  }

  // Only customer and owner can self-register
  const allowedRoles = ['customer', 'owner'];
  const userRole = allowedRoles.includes(role) ? role : 'customer';

  const otp = generateOTP();
  const hashedOtp = await bcrypt.hash(otp, 10);

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: userRole,
    isVerified: false,
    otp: hashedOtp,
    otpExpires: new Date(Date.now() + 10 * 60 * 1000),
  });

  // Send the OTP email
  const tpl = emailTemplates.otpVerification(user, otp);
  await sendEmail({ to: user.email, ...tpl });

  res.status(201).json({
    status: 'success',
    message: 'Account created! Please check your email for the 6-digit verification code.',
    data: { email: user.email, role: user.role },
  });
});

// ─── @POST /api/auth/send-otp ───────────────────────────────────────────────
// Resend a fresh OTP to an existing unverified account.
exports.sendOTP = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError('Email is required.', 400));

  const user = await User.findOne({ email });
  if (!user) return next(new AppError('No account found with this email.', 404));
  if (user.isVerified) return next(new AppError('This account is already verified. Please log in.', 400));

  const otp = generateOTP();
  user.otp = await bcrypt.hash(otp, 10);
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const tpl = emailTemplates.otpVerification(user, otp);
  await sendEmail({ to: user.email, ...tpl });

  res.status(200).json({
    status: 'success',
    message: 'A new verification code has been sent to your email.',
    data: { email: user.email },
  });
});

// ─── @POST /api/auth/verify-otp ────────────────────────────────────────────
// Verify the OTP; mark user as verified; return JWT token.
exports.verifyOTP = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError('Email and OTP are required.', 400));
  }

  // Must select otp+otpExpires since they are select:false
  const user = await User.findOne({ email }).select('+otp +otpExpires');
  if (!user) return next(new AppError('No account found with this email.', 404));
  if (user.isVerified) return next(new AppError('Account is already verified. Please log in.', 400));

  // Check expiry
  if (!user.otp || !user.otpExpires || user.otpExpires < new Date()) {
    return next(new AppError('Your verification code has expired. Please request a new one.', 400));
  }

  // Compare OTP against hash
  const isMatch = await bcrypt.compare(String(otp), user.otp);
  if (!isMatch) {
    return next(new AppError('Incorrect verification code. Please try again.', 400));
  }

  // Mark verified and clear OTP fields
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res);
});

// ─── @POST /api/auth/login ──────────────────────────────────────────────────
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password.', 400));
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password.', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Account is deactivated. Please contact support.', 401));
  }

  // Block login until email is verified (superadmin is exempt — created from terminal)
  if (!user.isVerified && user.role !== 'superadmin') {
    return next(new AppError(
      'Your email address has not been verified. Please check your inbox for the verification code.',
      403
    ));
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res);
});

// ─── @POST /api/auth/logout ─────────────────────────────────────────────────
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
};

// ─── @GET /api/auth/me ──────────────────────────────────────────────────────
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate('assignedRestaurant', 'name slug')
    .populate('restaurants', 'name address isActive avgRating');

  res.status(200).json({ status: 'success', data: { user: user.toPublicJSON() } });
});

// ─── @PATCH /api/auth/update-profile ────────────────────────────────────────
// Updates basic profile fields and recalculates completion percentage.
exports.updateProfile = catchAsync(async (req, res, next) => {
  const { name, phone } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found.', 404));

  if (name  !== undefined) user.name  = name;
  if (phone !== undefined) user.phone = phone;

  // Recalculate completion — phone carries a 5% weight
  const { percentage, completedSteps } = calculateProfileCompletion(user);
  user.profileCompletedPercentage = percentage;
  user.completedProfileSteps      = completedSteps;

  await user.save({ validateBeforeSave: true });
  res.status(200).json({ status: 'success', data: { user: user.toPublicJSON() } });
});

// ─── @PATCH /api/auth/update-preferences ────────────────────────────────────
// Updates recommendation / personalisation fields for the logged-in customer.
// Automatically recalculates profileCompletedPercentage after each update.
exports.updatePreferences = catchAsync(async (req, res, next) => {
  const {
    preferredCuisines,
    preferredPriceRange,
    dietaryPreferences,
    city,
    location,          // expects { lat: Number, lng: Number }
  } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found.', 404));

  // Only patch fields that were explicitly sent
  if (preferredCuisines   !== undefined) user.preferredCuisines   = preferredCuisines;
  if (preferredPriceRange  !== undefined) user.preferredPriceRange  = preferredPriceRange;
  if (dietaryPreferences   !== undefined) user.dietaryPreferences   = dietaryPreferences;
  if (city                !== undefined) user.city                = city;
  if (location            !== undefined) user.location            = location;

  // Auto-recalculate profile completion
  const { percentage, completedSteps, missingSteps } = calculateProfileCompletion(user);
  user.profileCompletedPercentage = percentage;
  user.completedProfileSteps      = completedSteps;

  await user.save({ validateBeforeSave: true });

  res.status(200).json({
    status: 'success',
    message: 'Preferences updated successfully.',
    data: {
      user: user.toPublicJSON(),
      profileCompletion: { percentage, completedSteps, missingSteps },
    },
  });
});

// ─── @PATCH /api/auth/change-password ───────────────────────────────────────
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return next(new AppError('Current password and new password are required.', 400));
  }
  if (!isStrongPassword(newPassword)) {
    return next(new AppError(
      'New password must be at least 8 characters with at least 1 uppercase letter, 1 lowercase letter, and 1 number.',
      400
    ));
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect.', 401));
  }

  user.password = newPassword;
  await user.save();
  res.status(200).json({ status: 'success', message: 'Password changed successfully.' });
});

// ─── @POST /api/auth/forgot-password ────────────────────────────────────────
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError('Email is required.', 400));

  const user = await User.findOne({ email: email.toLowerCase().trim(), isActive: true });

  // Always return the same response to prevent user enumeration attacks
  if (!user) {
    return res.status(200).json({
      status: 'success',
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }

  const resetToken = user.generatePasswordResetToken(); // sets 15-min expiry
  await user.save({ validateBeforeSave: false });

  const frontendURL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const resetURL = `${frontendURL}/reset-password/${resetToken}`;

  try {
    const tpl = emailTemplates.forgotPassword(resetURL, user);
    await sendEmail({ to: user.email, ...tpl });
    logger.info(`Password reset email sent to ${user.email}`);
  } catch (e) {
    // Rollback token if email fails so user can retry
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    logger.error(`Password reset email failed for ${user.email}:`, e.message);
    return next(new AppError('Failed to send reset email. Please try again later.', 500));
  }

  res.status(200).json({
    status: 'success',
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
});

// ─── @PATCH /api/auth/reset-password/:token ─────────────────────────────────
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { password } = req.body;

  // Validate new password complexity
  if (!password) {
    return next(new AppError('New password is required.', 400));
  }
  if (!isStrongPassword(password)) {
    return next(new AppError(
      'Password must be at least 8 characters with at least 1 uppercase letter, 1 lowercase letter, and 1 number.',
      400
    ));
  }

  // Hash the raw token from URL and compare with the stored hash
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('This reset link is invalid or has expired. Please request a new one.', 400));
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.isVerified = true; // ensure account is verified so they can immediately log in
  user.tokenVersion += 1;  // invalidate any existing sessions
  await user.save();

  logger.info(`Password reset successful for user ${user.email}`);
  sendTokenResponse(user, 200, res);
});

// ─── @POST /api/auth/create-admin ────────────────────────────────────────────
// Secure admin creation: restricted to superadmin only.
// Creates an admin account for a specific restaurant, emails credentials.
exports.createAdmin = catchAsync(async (req, res, next) => {
  const { name, email, restaurantId } = req.body;

  if (!name || !email) {
    return next(new AppError('Name and email are required to create an admin.', 400));
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Please provide a valid email address.', 400));
  }

  // Check for existing active account with this email
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    if (!existing.isActive) {
      // Reuse the slot by removing the soft-deleted user
      await User.findByIdAndDelete(existing._id);
    } else {
      return next(new AppError('An active account with this email already exists.', 400));
    }
  }

  // Generate a cryptographically secure password that satisfies complexity rules
  const generateSecurePassword = () => {
    const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower   = 'abcdefghijkmnopqrstuvwxyz';
    const digits  = '23456789';
    const special = '!@#$%^&*';
    const all     = upper + lower + digits + special;
    // Guarantee at least 1 of each required character class
    const mandatory = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
    ];
    const rest = Array.from({ length: 9 }, () => all[Math.floor(Math.random() * all.length)]);
    // Shuffle so mandatory chars aren't always at the start
    return [...mandatory, ...rest].sort(() => 0.5 - Math.random()).join('');
  };

  const rawPassword = generateSecurePassword();

  const newAdmin = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: rawPassword,        // pre-save hook hashes this
    role: 'admin',
    isActive: true,
    isVerified: true,             // admin accounts are pre-verified
    ...(restaurantId && { assignedRestaurant: restaurantId }),
  });

  // Send welcome email with credentials
  try {
    const Restaurant = require('../models/Restaurant');
    const restaurant = restaurantId ? await Restaurant.findById(restaurantId) : null;

    if (restaurant) {
      // Link admin into restaurant's captains array
      if (!restaurant.captains.includes(newAdmin._id)) {
        restaurant.captains.push(newAdmin._id);
        await restaurant.save({ validateBeforeSave: false });
      }
      const tpl = emailTemplates.adminWelcome(newAdmin, restaurant, rawPassword);
      await sendEmail({ to: newAdmin.email, ...tpl });
    } else {
      // Generic welcome with credentials
      await sendEmail({
        to: newAdmin.email,
        subject: 'Welcome to TableMint – Your Admin Credentials',
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff8f0;border-radius:16px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#2C2416,#6B5B45);padding:36px 40px;text-align:center;">
              <h1 style="color:#fff;font-size:26px;margin:0;">Table<span style="color:#D4883A;">Mint</span></h1>
              <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">Admin Portal</p>
            </div>
            <div style="padding:40px;">
              <h2 style="color:#2C2416;">Hi ${newAdmin.name}, welcome aboard! 👋</h2>
              <p style="color:#6B5B45;line-height:1.7;">Your admin account has been created. Use the credentials below to sign in.</p>
              <div style="background:#2C2416;border-radius:14px;padding:24px;margin:20px 0;">
                <p style="color:#A0907A;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Your Login Credentials</p>
                <p style="color:#fff;margin:0 0 8px;"><span style="color:#A0907A;">Email:</span> <strong>${newAdmin.email}</strong></p>
                <p style="color:#fff;margin:0;"><span style="color:#A0907A;">Password:</span> <strong style="color:#D4883A;font-size:18px;letter-spacing:2px;">${rawPassword}</strong></p>
              </div>
              <p style="color:#A0907A;font-size:13px;">⚠️ Please change your password after first login.</p>
            </div>
          </div>
        `,
      });
    }
    logger.info(`Admin account created and credentials emailed to ${newAdmin.email}`);
  } catch (e) {
    // Don't fail the creation — credentials can be shared manually
    logger.error(`Failed to email admin credentials to ${newAdmin.email}:`, e.message);
  }

  res.status(201).json({
    status: 'success',
    message: `Admin account created successfully. Login credentials have been emailed to ${newAdmin.email}.`,
    data: {
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        assignedRestaurant: newAdmin.assignedRestaurant,
      },
    },
  });
});
