const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ── @GET /api/superadmin/restaurants ─────────────────────────────────────────
// Get ALL restaurants regardless of status (pending, verified, rejected)
exports.getAllRestaurants = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.verificationStatus = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [restaurants, total] = await Promise.all([
    Restaurant.find(query)
      .populate('owner', 'name email phone')
      .select('name address cuisine verificationStatus isActive avgRating totalReviews coverImage reservationFee owner createdAt verificationOtp')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    Restaurant.countDocuments(query),
  ]);

  res.status(200).json({
    status: 'success',
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    data: { restaurants },
  });
});

// ── @GET /api/superadmin/restaurants/:id ─────────────────────────────────────
// Get single restaurant with OTP (for verification)
exports.getRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id)
    .select('+verificationOtp +verificationOtpExpires')
    .populate('owner', 'name email phone')
    .populate('captains', 'name email');

  if (!restaurant) return next(new AppError('Restaurant not found.', 404));

  res.status(200).json({
    status: 'success',
    data: { restaurant },
  });
});

// ── @POST /api/superadmin/restaurants/:id/verify ──────────────────────────────
// Verify restaurant using OTP shared by owner
exports.verifyRestaurant = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  if (!otp) return next(new AppError('OTP is required.', 400));

  const restaurant = await Restaurant.findById(req.params.id)
    .select('+verificationOtp +verificationOtpExpires');

  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  if (restaurant.verificationStatus === 'verified')
    return next(new AppError('This restaurant is already verified.', 400));

  if (!restaurant.verificationOtp || restaurant.verificationOtp !== otp)
    return next(new AppError('Invalid OTP. Please check and try again.', 400));

  if (restaurant.verificationOtpExpires < new Date())
    return next(new AppError('OTP has expired. Ask the owner to regenerate it.', 400));

  restaurant.verificationStatus = 'verified';
  restaurant.isActive = true;
  restaurant.verifiedAt = new Date();
  restaurant.verifiedBy = req.user.id;
  restaurant.verificationOtp = null;
  restaurant.verificationOtpExpires = null;
  await restaurant.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: `"${restaurant.name}" has been verified and is now live on TableMint!`,
    data: { restaurant },
  });
});

// ── @POST /api/superadmin/restaurants/:id/reject ──────────────────────────────
exports.rejectRestaurant = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));

  restaurant.verificationStatus = 'rejected';
  restaurant.isActive = false;
  await restaurant.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: `"${restaurant.name}" has been rejected.`,
    data: { restaurant },
  });
});

// ── @GET /api/superadmin/stats ────────────────────────────────────────────────
exports.getStats = catchAsync(async (req, res, next) => {
  const [total, pending, verified, rejected, totalUsers, totalOwners] = await Promise.all([
    Restaurant.countDocuments(),
    Restaurant.countDocuments({ verificationStatus: 'pending' }),
    Restaurant.countDocuments({ verificationStatus: 'verified' }),
    Restaurant.countDocuments({ verificationStatus: 'rejected' }),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'owner', isActive: true }),
  ]);

  res.status(200).json({
    status: 'success',
    data: { restaurants: { total, pending, verified, rejected }, users: { total: totalUsers, owners: totalOwners } },
  });
});
