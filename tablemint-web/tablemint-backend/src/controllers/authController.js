const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Helper: send JWT response
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

// @POST /api/auth/register
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 400));
  }

  // Only customer and owner can self-register
  const allowedRoles = ['customer', 'owner'];
  const userRole = allowedRoles.includes(role) ? role : 'customer';

  const user = await User.create({ name, email, phone, password, role: userRole });
  sendTokenResponse(user, 201, res);
});

// @POST /api/auth/login
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

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res);
});

// @POST /api/auth/logout
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
};

// @GET /api/auth/me
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate('assignedRestaurant', 'name slug')
    .populate('restaurants', 'name address isActive avgRating');

  res.status(200).json({ status: 'success', data: { user: user.toPublicJSON() } });
});
