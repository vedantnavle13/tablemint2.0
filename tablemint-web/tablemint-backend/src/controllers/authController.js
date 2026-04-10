const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendEmail, emailTemplates } = require('../utils/email');

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
    if (existingUser.isVerified) {
      return next(new AppError('An account with this email already exists.', 400));
    }
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
