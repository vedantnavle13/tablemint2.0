const Reservation = require('../models/Reservation');
const Restaurant  = require('../models/Restaurant');
const AppError    = require('../utils/AppError');
const catchAsync  = require('../utils/catchAsync');
const { sendEmail, emailTemplates } = require('../utils/email');

// ── @POST /api/reservations ───────────────────────────────────────────────────
exports.createReservation = catchAsync(async (req, res, next) => {
  const { restaurantId, type, scheduledAt, arrivalInMinutes, numberOfGuests, specialRequests, preOrderItems } = req.body;

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant)        return next(new AppError('Restaurant not found.', 404));
  if (!restaurant.isActive) return next(new AppError('This restaurant is not currently accepting reservations.', 400));

  if (type === 'instant' && !restaurant.instantBookingEnabled)
    return next(new AppError('This restaurant does not support instant booking.', 400));

  let bookingTime = scheduledAt;
  if (type === 'instant') bookingTime = new Date(Date.now() + (arrivalInMinutes || 30) * 60 * 1000);

  const tables     = Array.isArray(restaurant.tables) ? restaurant.tables : [];
  const totalSeats = tables.filter(t => t.isAvailable).reduce((s, t) => s + t.capacity, 0);

  // Block booking if restaurant has no tables set up
  if (totalSeats === 0)
    return next(new AppError('This restaurant has not set up any tables yet. Bookings are not available.', 400));

  // Check total capacity (safety check)
  if (numberOfGuests > totalSeats)
    return next(new AppError(`Not enough seats. Maximum capacity is ${totalSeats}.`, 400));

  // ✅ CRITICAL FIX: Check time-slot availability BEFORE creating reservation
  // Look for overlapping reservations in ±2 hour window
  const slotStart = new Date(new Date(bookingTime).getTime() - 2 * 60 * 60 * 1000);
  const slotEnd   = new Date(new Date(bookingTime).getTime() + 2 * 60 * 60 * 1000);

  const overlapping = await Reservation.find({
    restaurant: restaurantId,
    scheduledAt: { $gte: slotStart, $lte: slotEnd },
    status: { $in: ['pending', 'confirmed', 'seated'] },
  });

  const bookedGuests = overlapping.reduce((sum, r) => sum + r.numberOfGuests, 0);
  const availableSeats = totalSeats - bookedGuests;

  // ✅ CRITICAL: Must validate available seats for this time slot
  if (availableSeats < numberOfGuests) {
    return next(new AppError(
      `Not enough seats available for this time slot. Only ${availableSeats} seat${availableSeats !== 1 ? 's' : ''} available. Please choose a different time.`, 
      400
    ));
  }

  const rawItems = preOrderItems || req.body.preOrder?.items || [];
  const safePreOrderItems = (Array.isArray(rawItems) ? rawItems : []).reduce((acc, item) => {
    const menuItem = (Array.isArray(restaurant.menu) ? restaurant.menu : [])
        .find(m => m._id.toString() === (item.menuItem || item._id || item.id)?.toString());
    if (menuItem) acc.push({ menuItem: menuItem._id, name: menuItem.name, price: menuItem.price, quantity: item.quantity || 1 });
    return acc;
  }, []);

  const reservation = await Reservation.create({
    customer: req.user.id,
    restaurant: restaurantId,
    type,
    scheduledAt: bookingTime,
    arrivalInMinutes,
    numberOfGuests,
    specialRequests,
    preOrderItems: safePreOrderItems,
    reservationFee: restaurant.reservationFee,
    status: type === 'instant' ? 'confirmed' : 'pending',
  });

  try {
    const populated = await reservation.populate([
      { path: 'customer', select: 'name email' },
      { path: 'restaurant', select: 'name' },
    ]);
    const template = emailTemplates.reservationConfirmation(populated, populated.restaurant, populated.customer);
    await sendEmail({ to: req.user.email, ...template });
  } catch (err) { console.error('Email send failed:', err.message); }

  res.status(201).json({ status: 'success', data: { reservation } });
});

// ── @GET /api/reservations/my ─────────────────────────────────────────────────
exports.getMyReservations = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 10 } = req.query;
  const query = { customer: req.user.id };
  if (status) query.status = status;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [reservations, total] = await Promise.all([
    Reservation.find(query).populate('restaurant', 'name coverImage address').sort('-scheduledAt').skip(skip).limit(parseInt(limit)),
    Reservation.countDocuments(query),
  ]);
  res.status(200).json({ status: 'success', total, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page), data: { reservations } });
});

// ── @GET /api/reservations/:id ────────────────────────────────────────────────
exports.getReservation = catchAsync(async (req, res, next) => {
  const reservation = await Reservation.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('restaurant', 'name address phone owner')
      .populate('assignedCaptain', 'name');
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  const isCustomerOwner = req.user.role === 'customer' && reservation.customer._id.toString() === req.user.id;
  const isRestaurantOwner = req.user.role === 'owner' && reservation.restaurant.owner?.toString() === req.user.id;
  const isCaptain = req.user.role === 'captain' && reservation.restaurant._id.toString() === req.user.assignedRestaurant?.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isCustomerOwner && !isRestaurantOwner && !isCaptain && !isAdmin)
    return next(new AppError('You are not authorized to view this reservation.', 403));

  res.status(200).json({ status: 'success', data: { reservation } });
});

// ── @PATCH /api/reservations/:id/cancel ──────────────────────────────────────
exports.cancelReservation = catchAsync(async (req, res, next) => {
  const reservation = await Reservation.findById(req.params.id).populate('restaurant', 'name');
  if (!reservation) return next(new AppError('Reservation not found.', 404));
  if (reservation.customer.toString() !== req.user.id)
    return next(new AppError('You are not authorized to cancel this reservation.', 403));
  if (['completed', 'cancelled', 'no_show'].includes(reservation.status))
    return next(new AppError(`Cannot cancel a reservation with status: ${reservation.status}.`, 400));

  reservation.status = 'cancelled';
  reservation.cancelledBy = 'customer';
  reservation.cancellationReason = req.body.reason || 'Cancelled by customer';
  reservation.cancelledAt = new Date();
  await reservation.save();

  try {
    const template = emailTemplates.reservationCancellation(reservation, reservation.restaurant, req.user);
    await sendEmail({ to: req.user.email, ...template });
  } catch (err) { console.error('Email send failed:', err.message); }

  res.status(200).json({ status: 'success', data: { reservation } });
});

// ── @GET /api/reservations/restaurant/:restaurantId ───────────────────────────
// Owner + Captain + Admin
exports.getRestaurantReservations = catchAsync(async (req, res, next) => {
  const { restaurantId } = req.params;
  const { status, date, page = 1, limit = 20 } = req.query;

  // Ownership checks
  if (req.user.role === 'owner') {
    const restaurant = await Restaurant.findById(restaurantId).select('owner');
    if (!restaurant) return next(new AppError('Restaurant not found.', 404));
    if (restaurant.owner.toString() !== req.user.id)
      return next(new AppError('You are not authorized to view these reservations.', 403));
  }
  if (req.user.role === 'captain') {
    if (req.user.assignedRestaurant?.toString() !== restaurantId)
      return next(new AppError('You are not authorized to view these reservations.', 403));
  }

  const query = { restaurant: restaurantId };
  if (status) query.status = { $in: status.split(',') };
  if (date) {
    const start = new Date(date); start.setHours(0,0,0,0);
    const end   = new Date(date); end.setHours(23,59,59,999);
    query.scheduledAt = { $gte: start, $lte: end };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [reservations, total] = await Promise.all([
    Reservation.find(query)
        .populate('customer', 'name email phone')
        .populate('assignedCaptain', 'name')
        .sort('scheduledAt')
        .skip(skip)
        .limit(parseInt(limit)),
    Reservation.countDocuments(query),
  ]);

  res.status(200).json({ status: 'success', total, totalPages: Math.ceil(total / parseInt(limit)), data: { reservations } });
});

// ── @PATCH /api/reservations/:id/status ──────────────────────────────────────
// Owner + Captain + Admin
exports.updateReservationStatus = catchAsync(async (req, res, next) => {
  const { status, captainNotes, cancellationReason, tableId } = req.body;

  const reservation = await Reservation.findById(req.params.id).populate('restaurant', 'owner');
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  // Role-based ownership check
  if (req.user.role === 'captain' &&
      reservation.restaurant._id.toString() !== req.user.assignedRestaurant?.toString())
    return next(new AppError('You are not authorized to manage this reservation.', 403));

  if (req.user.role === 'owner' &&
      reservation.restaurant.owner?.toString() !== req.user.id)
    return next(new AppError('You are not authorized to manage this reservation.', 403));

  const validTransitions = {
    pending:   ['confirmed', 'cancelled'],
    confirmed: ['seated', 'cancelled', 'no_show'],
    seated:    ['completed'],
    completed: [], cancelled: [], no_show: [],
  };

  if (!validTransitions[reservation.status]?.includes(status))
    return next(new AppError(`Cannot transition from "${reservation.status}" to "${status}".`, 400));

  reservation.status = status;
  if (captainNotes) reservation.captainNotes = captainNotes;
  if (tableId)      reservation.table = tableId;
  if (status === 'cancelled') {
    reservation.cancelledBy = req.user.role === 'admin' ? 'admin' : 'restaurant';
    reservation.cancellationReason = cancellationReason || 'Cancelled by restaurant';
    reservation.cancelledAt = new Date();
  }
  if (status === 'seated') reservation.assignedCaptain = req.user.id;

  await reservation.save();
  res.status(200).json({ status: 'success', data: { reservation } });
});

// ── Admin only ────────────────────────────────────────────────────────────────
exports.getAllReservations = catchAsync(async (req, res, next) => {
  const { status, restaurant, page = 1, limit = 20, dateFrom, dateTo } = req.query;
  const query = {};
  if (status)     query.status = { $in: status.split(',') };
  if (restaurant) query.restaurant = restaurant;
  if (dateFrom || dateTo) {
    query.scheduledAt = {};
    if (dateFrom) query.scheduledAt.$gte = new Date(dateFrom);
    if (dateTo)   query.scheduledAt.$lte = new Date(dateTo);
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [reservations, total] = await Promise.all([
    Reservation.find(query).populate('customer', 'name email').populate('restaurant', 'name').sort('-createdAt').skip(skip).limit(parseInt(limit)),
    Reservation.countDocuments(query),
  ]);
  res.status(200).json({ status: 'success', total, totalPages: Math.ceil(total / parseInt(limit)), data: { reservations } });
});

exports.getReservationStats = catchAsync(async (req, res, next) => {
  const stats = await Reservation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, totalRevenue: { $sum: '$totalAmount' } } }]);
  const today = new Date(); today.setHours(0,0,0,0);
  const todayCount = await Reservation.countDocuments({ scheduledAt: { $gte: today } });
  res.status(200).json({ status: 'success', data: { stats, todayCount } });
});
