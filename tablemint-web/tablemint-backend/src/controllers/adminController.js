const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Reservation = require('../models/Reservation');
const Review = require('../models/Review');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendEmail } = require('../utils/email');
const mongoose = require('mongoose');

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

// ─────────────────────────────────────────────────────────────────────────────
// ── ADMIN PANEL – scoped to assigned restaurant ───────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// Helper: resolve the admin's assigned restaurant (enforces scoping)
async function getAssignedRestaurant(req, next) {
  const restId = req.user.assignedRestaurant;
  if (!restId) { next(new AppError('No restaurant assigned to this account.', 403)); return null; }
  const restaurant = await Restaurant.findById(restId);
  if (!restaurant) { next(new AppError('Assigned restaurant not found.', 404)); return null; }
  return restaurant;
}

// ── @GET /api/admin/my-restaurant ─────────────────────────────────────────────
exports.getMyRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await getAssignedRestaurant(req, next);
  if (!restaurant) return;
  await restaurant.populate('captains', 'name email');
  res.status(200).json({ status: 'success', data: { restaurant } });
});

// ── @GET /api/admin/reservations ──────────────────────────────────────────────
// Admin sees ONLY reservations for their assigned restaurant.
exports.getAdminReservations = catchAsync(async (req, res, next) => {
  const restId = req.user.assignedRestaurant;
  if (!restId) return next(new AppError('No restaurant assigned to this account.', 403));

  const reservations = await Reservation.find({ restaurant: restId })
    .sort('-scheduledAt')
    .limit(200)
    .populate('customer', 'name customerId')
    .populate('restaurant', 'name')
    .lean();

  res.status(200).json({ status: 'success', results: reservations.length, data: { reservations } });
});

// ── @PATCH /api/admin/reservations/:id/status ─────────────────────────────────
// Uses the same time-gate rules as the main reservationController.
exports.updateAdminReservationStatus = catchAsync(async (req, res, next) => {
  const restId = req.user.assignedRestaurant;
  if (!restId) return next(new AppError('No restaurant assigned to this account.', 403));

  const { status, cancellationReason } = req.body;
  const VALID = ['confirmed', 'seated', 'completed', 'cancelled', 'no_show'];
  if (!VALID.includes(status)) {
    return next(new AppError(`Invalid status. Must be one of: ${VALID.join(', ')}`, 400));
  }

  const reservation = await Reservation.findOne({ _id: req.params.id, restaurant: restId });
  if (!reservation) return next(new AppError('Reservation not found in your restaurant.', 404));

  // ── Valid status transitions ──────────────────────────────────────────────
  const validTransitions = {
    pending:   ['confirmed', 'cancelled'],
    confirmed: ['seated', 'cancelled', 'no_show'],
    seated:    ['completed'],
    completed: [], cancelled: [], no_show: [],
  };

  if (!validTransitions[reservation.status]?.includes(status))
    return next(new AppError(`Cannot transition from "${reservation.status}" to "${status}".`, 400));

  const now = new Date();

  // ── Time-gate: confirmed → seated (30 min before) ────────────────────────
  if (status === 'seated') {
    const thirtyMinBefore = new Date(reservation.scheduledAt.getTime() - 30 * 60 * 1000);
    if (now < thirtyMinBefore) {
      const minutesLeft = Math.ceil((thirtyMinBefore - now) / 60000);
      return next(new AppError(
        `Cannot seat yet. Seating opens in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} (30 min before scheduled time).`,
        400
      ));
    }
  }

  // ── Time-gate: confirmed → no_show (45 min after) ────────────────────────
  if (status === 'no_show') {
    const fortyFiveMinAfter = new Date(reservation.scheduledAt.getTime() + 45 * 60 * 1000);
    if (now < fortyFiveMinAfter) {
      const minutesLeft = Math.ceil((fortyFiveMinAfter - now) / 60000);
      return next(new AppError(
        `Cannot mark No Show yet. Available in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} (45 min after scheduled time).`,
        400
      ));
    }
  }

  reservation.status = status;

  if (status === 'cancelled') {
    reservation.cancelledAt = new Date();
    reservation.cancelledBy = 'restaurant';
    reservation.cancellationReason = cancellationReason || 'Cancelled by admin';
  }

  // ── Auto-bill on completed ───────────────────────────────────────────────
  if (status === 'completed' && !reservation.billGeneratedAt) {
    const systemItems = [];
    if (reservation.reservationFee > 0) {
      systemItems.push({ description: 'Reservation Fee', amount: reservation.reservationFee, quantity: 1 });
    }
    (reservation.preOrderItems || []).forEach(item => {
      systemItems.push({ description: item.name, amount: item.price, quantity: item.quantity });
    });
    const subTotal = systemItems.reduce((s, i) => s + i.amount * i.quantity, 0);
    const taxAmount = Math.round(subTotal * 0.05 * 100) / 100;
    reservation.billItems = systemItems;
    reservation.billTax = taxAmount;
    reservation.billTotal = subTotal + taxAmount;
    reservation.billGeneratedAt = new Date();
    reservation.billGeneratedBy = req.user.id;
    reservation.billNotes = 'Auto-generated on completion.';
  }

  await reservation.save();
  res.status(200).json({ status: 'success', data: { reservation } });
});

// ── @POST /api/admin/reservations/:id/notify ──────────────────────────────────
// Send a custom email notification to the customer for a specific reservation.
exports.notifyCustomer = catchAsync(async (req, res, next) => {
  const restId = req.user.assignedRestaurant;
  if (!restId) return next(new AppError('No restaurant assigned to this account.', 403));

  const { message } = req.body;
  if (!message || !message.trim()) return next(new AppError('Message is required.', 400));

  const reservation = await Reservation.findOne({ _id: req.params.id, restaurant: restId })
    .populate('customer', 'name email')
    .populate('restaurant', 'name');

  if (!reservation) return next(new AppError('Reservation not found in your restaurant.', 404));

  const customerEmail = reservation.customer?.email;
  if (!customerEmail) return next(new AppError('Customer email not available.', 400));

  const bookingId = `#${reservation._id.toString().slice(-8).toUpperCase()}`;
  const scheduledStr = new Date(reservation.scheduledAt).toLocaleString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  await sendEmail({
    to: customerEmail,
    subject: `Message from ${reservation.restaurant?.name || 'TableMint'} – Booking ${bookingId}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff8f0;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #C8793A;">
          <h1 style="color: #C8793A; font-size: 28px; margin: 0;">TableMint</h1>
          <p style="color: #666; font-style: italic;">A message regarding your reservation</p>
        </div>
        <div style="padding: 30px 0;">
          <h2 style="color: #1a1a1a;">Hi ${reservation.customer?.name || 'Guest'},</h2>
          <p style="color: #444; line-height: 1.6;">
            You have a message from <strong>${reservation.restaurant?.name}</strong>
            regarding your booking <strong>${bookingId}</strong> on ${scheduledStr}:
          </p>
          <div style="background: #fff; border-left: 4px solid #C8793A; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #333; line-height: 1.7; margin: 0; white-space: pre-line;">${message}</p>
          </div>
          <p style="color: #666; font-size: 13px;">If you have questions, reply to this email or contact the restaurant directly.</p>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e0d5c8; color: #999; font-size: 12px;">
          <p>© TableMint – Discover Pune's Finest Tables</p>
        </div>
      </div>
    `,
  });

  res.status(200).json({ status: 'success', message: 'Customer has been notified successfully.' });
});

// ── @GET  /api/admin/menu ─────────────────────────────────────────────────────
exports.getAdminMenu = catchAsync(async (req, res, next) => {
  const restaurant = await getAssignedRestaurant(req, next);
  if (!restaurant) return;

  const menuItems = (restaurant.menu || []).map(item => ({
    ...item.toObject(),
    restaurantId: restaurant._id,
    restaurantName: restaurant.name,
  }));

  res.status(200).json({ status: 'success', results: menuItems.length, data: { menuItems } });
});

// ── @POST /api/admin/menu ─────────────────────────────────────────────────────
exports.addMenuItem = catchAsync(async (req, res, next) => {
  const restaurant = await getAssignedRestaurant(req, next);
  if (!restaurant) return;
  restaurant.menu.push(req.body);
  await restaurant.save();
  const newItem = restaurant.menu[restaurant.menu.length - 1];
  res.status(201).json({ status: 'success', data: { menuItem: newItem } });
});

// ── @PATCH /api/admin/menu/:itemId ────────────────────────────────────────────
exports.updateMenuItem = catchAsync(async (req, res, next) => {
  const restaurant = await getAssignedRestaurant(req, next);
  if (!restaurant) return;
  const item = restaurant.menu.id(req.params.itemId);
  if (!item) return next(new AppError('Menu item not found.', 404));
  Object.assign(item, req.body);
  await restaurant.save();
  res.status(200).json({ status: 'success', data: { menuItem: item } });
});

// ── @DELETE /api/admin/menu/:itemId ───────────────────────────────────────────
exports.deleteMenuItem = catchAsync(async (req, res, next) => {
  const restaurant = await getAssignedRestaurant(req, next);
  if (!restaurant) return;
  restaurant.menu.pull(req.params.itemId);
  await restaurant.save();
  res.status(204).send();
});

// ── @GET  /api/admin/tables ───────────────────────────────────────────────────
exports.getAdminTables = catchAsync(async (req, res, next) => {
  const restaurant = await getAssignedRestaurant(req, next);
  if (!restaurant) return;
  res.status(200).json({ status: 'success', data: { tables: restaurant.tables } });
});

// ── @POST /api/admin/tables ───────────────────────────────────────────────────
exports.addTable = catchAsync(async (req, res, next) => {
  const restaurant = await getAssignedRestaurant(req, next);
  if (!restaurant) return;
  restaurant.tables.push(req.body);
  await restaurant.save();
  const newTable = restaurant.tables[restaurant.tables.length - 1];
  res.status(201).json({ status: 'success', data: { table: newTable } });
});

// ── @PATCH /api/admin/tables/:tableId ─────────────────────────────────────────
exports.updateTable = catchAsync(async (req, res, next) => {
  const restaurant = await getAssignedRestaurant(req, next);
  if (!restaurant) return;
  const table = restaurant.tables.id(req.params.tableId);
  if (!table) return next(new AppError('Table not found.', 404));
  Object.assign(table, req.body);
  await restaurant.save();
  res.status(200).json({ status: 'success', data: { table } });
});

// ── @DELETE /api/admin/tables/:tableId ────────────────────────────────────────
exports.deleteTable = catchAsync(async (req, res, next) => {
  const restaurant = await getAssignedRestaurant(req, next);
  if (!restaurant) return;
  restaurant.tables.pull(req.params.tableId);
  await restaurant.save();
  res.status(204).send();
});

// ── @GET /api/admin/analytics ─────────────────────────────────────────────────
// Stats scoped to admin's assigned restaurant only.
exports.getAdminAnalytics = catchAsync(async (req, res, next) => {
  const restId = req.user.assignedRestaurant;
  if (!restId) return next(new AppError('No restaurant assigned to this account.', 403));

  const WalkInOrder = require('../models/WalkInOrder');

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday   = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const endOfYesterday   = new Date(endOfToday);   endOfYesterday.setDate(endOfYesterday.getDate() - 1);

  const restObjId = mongoose.Types.ObjectId.isValid(restId) ? new mongoose.Types.ObjectId(restId) : restId;

  const [todayStats, yesterdayStats, totalReservations, restaurant, walkInTodayStats, walkInYesterdayStats] = await Promise.all([
    Reservation.aggregate([
      { $match: { restaurant: restObjId, scheduledAt: { $gte: startOfToday, $lte: endOfToday } } },
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$reservationFee' }, totalGuests: { $sum: '$numberOfGuests' }, noShows: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } } } },
    ]),
    Reservation.aggregate([
      { $match: { restaurant: restObjId, scheduledAt: { $gte: startOfYesterday, $lte: endOfYesterday } } },
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$reservationFee' }, totalGuests: { $sum: '$numberOfGuests' }, noShows: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } } } },
    ]),
    Reservation.countDocuments({ restaurant: restId }),
    Restaurant.findById(restId).select('name avgRating totalReviews'),
    // Walk-in revenue today (only paid orders)
    WalkInOrder.aggregate([
      { $match: { restaurant: restObjId, paymentStatus: 'paid', paidAt: { $gte: startOfToday, $lte: endOfToday } } },
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
    ]),
    // Walk-in revenue yesterday (only paid orders)
    WalkInOrder.aggregate([
      { $match: { restaurant: restObjId, paymentStatus: 'paid', paidAt: { $gte: startOfYesterday, $lte: endOfYesterday } } },
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
    ]),
  ]);

  const today          = todayStats[0]          || { count: 0, revenue: 0, totalGuests: 0, noShows: 0 };
  const yesterday      = yesterdayStats[0]      || { count: 0, revenue: 0, totalGuests: 0, noShows: 0 };
  const walkInToday    = walkInTodayStats[0]    || { count: 0, revenue: 0 };
  const walkInYesterday= walkInYesterdayStats[0]|| { count: 0, revenue: 0 };
  const pct = (a, b) => (b === 0 ? null : Math.round(((a - b) / b) * 100));

  res.status(200).json({
    status: 'success',
    data: {
      restaurantName: restaurant?.name,
      avgRating: restaurant?.avgRating,
      totalReviews: restaurant?.totalReviews,
      totalReservations,
      todayReservations: today.count,
      todayRevenue: today.revenue,           // online (reservation fee) revenue
      todayWalkInCount: walkInToday.count,
      todayWalkInRevenue: walkInToday.revenue, // walk-in (grand total) revenue
      avgPartySize: today.count > 0 ? Math.round((today.totalGuests / today.count) * 10) / 10 : 0,
      noShows: today.noShows,
      changes: {
        reservations: pct(today.count, yesterday.count),
        revenue:      pct(today.revenue, yesterday.revenue),
        noShows:      pct(today.noShows, yesterday.noShows),
        walkInRevenue:pct(walkInToday.revenue, walkInYesterday.revenue),
      },
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── OWNER: Revenue overview across ALL owned restaurants ──────────────────────
// ── @GET /api/admin/owner/revenue ─────────────────────────────────────────────
exports.getOwnerRevenue = catchAsync(async (req, res, next) => {
  const ownerId = req.user._id || req.user.id;
  const restaurants = await Restaurant.find({ owner: ownerId })
    .select('name isActive avgRating totalReviews')
    .lean();

  if (!restaurants.length) {
    return res.status(200).json({
      status: 'success',
      data: { restaurants: [], total: { revenue: 0, reservations: 0 } },
    });
  }

  const restIds = restaurants.map(r => r._id);

  const stats = await Reservation.aggregate([
    { $match: { restaurant: { $in: restIds } } },
    {
      $group: {
        _id: '$restaurant',
        revenue: { $sum: '$reservationFee' },
        count: { $sum: 1 },
        noShows: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
      },
    },
  ]);

  const statsMap = Object.fromEntries(stats.map(s => [s._id.toString(), s]));

  const result = restaurants.map(r => ({
    ...r,
    revenue: statsMap[r._id.toString()]?.revenue || 0,
    reservations: statsMap[r._id.toString()]?.count || 0,
    noShows: statsMap[r._id.toString()]?.noShows || 0,
  }));

  const totalRevenue       = result.reduce((s, r) => s + r.revenue, 0);
  const totalReservations  = result.reduce((s, r) => s + r.reservations, 0);

  res.status(200).json({
    status: 'success',
    data: {
      restaurants: result,
      total: { revenue: totalRevenue, reservations: totalReservations },
    },
  });
});
