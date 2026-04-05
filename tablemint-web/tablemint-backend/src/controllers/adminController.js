const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Reservation = require('../models/Reservation');
const Review = require('../models/Review');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ── @GET /api/admin/dashboard ─────────────────────────────────────────────────
exports.getDashboardStats = catchAsync(async (req, res, next) => {
  const [
    totalUsers,
    totalRestaurants,
    totalReservations,
    reservationStats,
    recentReservations,
    topRestaurants,
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Restaurant.countDocuments({ isActive: true }),
    Reservation.countDocuments(),
    Reservation.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    ]),
    Reservation.find()
      .sort('-createdAt')
      .limit(5)
      .populate('customer', 'name')
      .populate('restaurant', 'name'),
    Restaurant.find({ isActive: true })
      .sort('-avgRating -totalReviews')
      .limit(5)
      .select('name avgRating totalReviews'),
  ]);

  const totalRevenue = reservationStats.reduce((sum, s) => sum + (s.revenue || 0), 0);

  res.status(200).json({
    status: 'success',
    data: {
      totals: { users: totalUsers, restaurants: totalRestaurants, reservations: totalReservations, revenue: totalRevenue },
      reservationStats,
      recentReservations,
      topRestaurants,
    },
  });
});

// ── USERS ─────────────────────────────────────────────────────────────────────

// @GET /api/admin/users
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { role, page = 1, limit = 20, search, isActive } = req.query;

  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find(query)
      .populate('assignedRestaurant', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    status: 'success',
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    data: { users: users.map((u) => u.toPublicJSON()) },
  });
});

// @GET /api/admin/users/:id
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate('assignedRestaurant', 'name');
  if (!user) return next(new AppError('User not found.', 404));

  res.status(200).json({ status: 'success', data: { user: user.toPublicJSON() } });
});

// @PATCH /api/admin/users/:id
exports.updateUser = catchAsync(async (req, res, next) => {
  const { name, email, phone, role, isActive, assignedRestaurant } = req.body;

  // Prevent self-demotion
  if (req.params.id === req.user.id && req.body.role && req.body.role !== 'admin') {
    return next(new AppError('You cannot change your own admin role.', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, email, phone, role, isActive, assignedRestaurant },
    { new: true, runValidators: true }
  );

  if (!user) return next(new AppError('User not found.', 404));

  res.status(200).json({ status: 'success', data: { user: user.toPublicJSON() } });
});

// @DELETE /api/admin/users/:id (soft delete)
exports.deactivateUser = catchAsync(async (req, res, next) => {
  if (req.params.id === req.user.id) {
    return next(new AppError('You cannot deactivate your own account.', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false, tokenVersion: { $inc: 1 } },
    { new: true }
  );

  if (!user) return next(new AppError('User not found.', 404));

  res.status(200).json({ status: 'success', message: 'User deactivated successfully.' });
});
