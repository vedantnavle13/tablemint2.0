const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const crypto = require('crypto');
const { sendEmail, emailTemplates } = require('../utils/email');
const logger = require('../utils/logger');

// ── @GET /api/restaurants ─────────────────────────────────────────────────────
exports.getAllRestaurants = catchAsync(async (req, res, next) => {
  const {
    page = 1, limit = 12, sort, search, cuisine,
    priceRange, features, lat, lng, radius = 10,
    instantBook, minRating,
  } = req.query;

  let query = { isActive: true };

  if (search) query.$text = { $search: search };
  if (cuisine) query.cuisine = { $in: cuisine.split(',').map((c) => new RegExp(c, 'i')) };
  if (priceRange) query.priceRange = { $in: priceRange.split(',') };
  if (features) query.features = { $all: features.split(',') };
  if (instantBook === 'true') query.instantBookingEnabled = true;
  if (minRating) query.avgRating = { $gte: parseFloat(minRating) };

  if (lat && lng) {
    query.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseFloat(radius) * 1000,
      },
    };
  }

  let sortBy = '-isFeatured -avgRating';
  if (sort) {
    const sortMap = {
      rating: '-avgRating', newest: '-createdAt',
      priceAsc: 'reservationFee', priceDesc: '-reservationFee',
    };
    sortBy = sortMap[sort] || sort.replace(',', ' ');
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [restaurants, total] = await Promise.all([
    Restaurant.find(query).select('-menu -operatingHours -__v').sort(sortBy).skip(skip).limit(parseInt(limit)),
    Restaurant.countDocuments(query),
  ]);

  res.status(200).json({
    status: 'success', results: restaurants.length, total,
    totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page),
    data: { restaurants },
  });
});

// ── @GET /api/restaurants/:id ─────────────────────────────────────────────────
// ✅ Falls back to inactive lookup so owner dashboard works for pending restaurants
exports.getRestaurant = catchAsync(async (req, res, next) => {
  const isMongoId = req.params.id.match(/^[a-f\d]{24}$/i);

  let restaurant = await Restaurant.findOne({
    $or: [
      { _id: isMongoId ? req.params.id : null },
      { slug: req.params.id },
    ],
    isActive: true,
  }).populate('owner', 'name email').populate('captains', 'name email');

  // If not found as active, try inactive (for owner viewing pending/deactivated)
  if (!restaurant && isMongoId) {
    restaurant = await Restaurant.findById(req.params.id)
        .populate('owner', 'name email').populate('captains', 'name email');
  }

  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  res.status(200).json({ status: 'success', data: { restaurant } });
});

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── @POST /api/restaurants ────────────────────────────────────────────────────
exports.createRestaurant = catchAsync(async (req, res, next) => {
  const otp = generateOtp();
  const otpExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const restaurant = await Restaurant.create({
    ...req.body, owner: req.user.id,
    verificationOtp: otp, verificationOtpExpires: otpExpires,
    verificationStatus: 'pending', isActive: false,
  });

  if (req.user.role === 'owner') {
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { restaurants: restaurant._id } });
  }

  try {
    const owner = await User.findById(req.user.id);
    const template = emailTemplates.restaurantVerificationOtp(restaurant, otp, owner.name);
    await sendEmail({ to: owner.email, ...template });
    logger.info(`OTP email sent to ${owner.email} for: ${restaurant.name}`);
  } catch (e) {
    logger.error(`Failed to send OTP email:`, e);
  }

  res.status(201).json({
    status: 'success',
    data: { restaurant, verificationOtp: otp, message: 'Restaurant created. OTP sent to your email.' },
  });
});

// ── @PATCH /api/restaurants/:id ───────────────────────────────────────────────
exports.updateRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));

  if (req.user.role !== 'admin' && restaurant.owner.toString() !== req.user.id) {
    return next(new AppError('Not authorized to update this restaurant.', 403));
  }

  delete req.body.owner;
  const updated = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.status(200).json({ status: 'success', data: { restaurant: updated } });
});

// ── @DELETE /api/restaurants/:id ──────────────────────────────────────────────
// ✅ FIXED: ownership check added before deleting
exports.deleteRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));

  if (req.user.role !== 'admin' && restaurant.owner.toString() !== req.user.id) {
    return next(new AppError('Not authorized to delete this restaurant.', 403));
  }

  await Restaurant.findByIdAndUpdate(req.params.id, { isActive: false });
  res.status(204).send(); // ✅ .send() not .json() — 204 must have empty body
});

// ── MENU ──────────────────────────────────────────────────────────────────────
exports.getMenu = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id).select('name menu');
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  res.status(200).json({ status: 'success', results: restaurant.menu.length, data: { menu: restaurant.menu } });
});

exports.addMenuItem = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  restaurant.menu.push(req.body);
  await restaurant.save();
  res.status(201).json({ status: 'success', data: { menuItem: restaurant.menu[restaurant.menu.length - 1] } });
});

exports.updateMenuItem = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  const item = restaurant.menu.id(req.params.itemId);
  if (!item) return next(new AppError('Menu item not found.', 404));
  Object.assign(item, req.body);
  await restaurant.save();
  res.status(200).json({ status: 'success', data: { menuItem: item } });
});

exports.removeMenuItem = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  restaurant.menu.pull(req.params.itemId);
  await restaurant.save();
  res.status(204).send();
});

// ── TABLES ────────────────────────────────────────────────────────────────────
exports.getTables = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id).select('tables');
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  res.status(200).json({ status: 'success', data: { tables: restaurant.tables } });
});

exports.addTable = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  restaurant.tables.push(req.body);
  await restaurant.save();
  res.status(201).json({ status: 'success', data: { table: restaurant.tables[restaurant.tables.length - 1] } });
});

exports.updateTable = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  const table = restaurant.tables.id(req.params.tableId);
  if (!table) return next(new AppError('Table not found.', 404));
  Object.assign(table, req.body);
  await restaurant.save();
  res.status(200).json({ status: 'success', data: { table } });
});

// ── CAPTAINS ──────────────────────────────────────────────────────────────────
exports.assignCaptain = catchAsync(async (req, res, next) => {
  const { captainId } = req.body;
  const [restaurant, captain] = await Promise.all([Restaurant.findById(req.params.id), User.findById(captainId)]);
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  if (!captain || captain.role !== 'captain') return next(new AppError('Captain not found or user is not a captain.', 404));
  if (!restaurant.captains.includes(captainId)) { restaurant.captains.push(captainId); await restaurant.save(); }
  captain.assignedRestaurant = restaurant._id;
  await captain.save({ validateBeforeSave: false });
  res.status(200).json({ status: 'success', message: `Captain ${captain.name} assigned to ${restaurant.name}.` });
});

// ── @GET /api/restaurants/my/all ─────────────────────────────────────────────
exports.getMyRestaurants = catchAsync(async (req, res, next) => {
  const restaurants = await Restaurant.find({ owner: req.user.id })
      .select('name address verificationStatus isActive avgRating totalReviews coverImage createdAt')
      .sort('-createdAt').lean();

  res.status(200).json({ status: 'success', results: restaurants.length, data: { restaurants } });
});

// ── @GET /api/restaurants/:id/admins ─────────────────────────────────────────
exports.getRestaurantAdmins = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id)
      .populate('captains', 'name email role createdAt isActive');
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  if (req.user.role !== 'admin' && restaurant.owner.toString() !== req.user.id)
    return next(new AppError('Not authorized.', 403));
  res.status(200).json({ status: 'success', results: restaurant.captains.length, data: { admins: restaurant.captains } });
});

// ── @DELETE /api/restaurants/:id/admins/:adminId ──────────────────────────────
exports.removeRestaurantAdmin = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  if (req.user.role !== 'admin' && restaurant.owner.toString() !== req.user.id)
    return next(new AppError('Not authorized.', 403));
  restaurant.captains.pull(req.params.adminId);
  await restaurant.save({ validateBeforeSave: false });
  await User.findByIdAndUpdate(req.params.adminId, { isActive: false, assignedRestaurant: null });
  res.status(200).json({ status: 'success', message: 'Admin removed successfully.' });
});

// ── @POST /api/restaurants/:id/verify ────────────────────────────────────────
exports.verifyRestaurant = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  if (!otp) return next(new AppError('OTP is required.', 400));
  const restaurant = await Restaurant.findById(req.params.id).select('+verificationOtp +verificationOtpExpires');
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  if (restaurant.verificationStatus === 'verified') return next(new AppError('Already verified.', 400));
  if (!restaurant.verificationOtp || restaurant.verificationOtp !== otp) return next(new AppError('Invalid OTP.', 400));
  if (restaurant.verificationOtpExpires < new Date()) return next(new AppError('OTP expired. Please regenerate.', 400));

  restaurant.verificationStatus = 'verified';
  restaurant.isActive = true;
  restaurant.verifiedAt = new Date();
  restaurant.verifiedBy = req.user.id;
  restaurant.verificationOtp = null;
  restaurant.verificationOtpExpires = null;
  await restaurant.save({ validateBeforeSave: false });
  res.status(200).json({ status: 'success', message: `"${restaurant.name}" verified and now live!`, data: { restaurant } });
});

// ── @POST /api/restaurants/:id/regenerate-otp ────────────────────────────────
exports.regenerateOtp = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  if (restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin')
    return next(new AppError('Not authorized.', 403));
  if (restaurant.verificationStatus === 'verified') return next(new AppError('Already verified.', 400));

  const otp = generateOtp();
  restaurant.verificationOtp = otp;
  restaurant.verificationOtpExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await restaurant.save({ validateBeforeSave: false });

  try {
    const owner = await User.findById(restaurant.owner);
    const template = emailTemplates.restaurantOtpRegenerated(restaurant, otp, owner.name);
    await sendEmail({ to: owner.email, ...template });
  } catch (e) { logger.error(`Failed to send regenerated OTP email:`, e); }

  res.status(200).json({ status: 'success', data: { verificationOtp: otp }, message: 'New OTP sent to your email.' });
});

// ── @POST /api/restaurants/:id/create-admin ───────────────────────────────────
exports.createRestaurantAdmin = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  if (req.user.role !== 'admin' && restaurant.owner.toString() !== req.user.id)
    return next(new AppError('Not authorized.', 403));

  const { name, email, password } = req.body;
  if (!name || !email) return next(new AppError('Name and email are required.', 400));
  if (!password || password.length < 6) return next(new AppError('Password must be at least 6 characters.', 400));

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError('An account with this email already exists.', 400));

  const admin = await User.create({ name, email, password, role: 'admin', assignedRestaurant: restaurant._id, isActive: true });

  if (!restaurant.captains.includes(admin._id)) {
    restaurant.captains.push(admin._id);
    await restaurant.save({ validateBeforeSave: false });
  }

  res.status(201).json({
    status: 'success',
    message: `Admin created successfully for ${restaurant.name}.`,
    data: { admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } },
  });
});