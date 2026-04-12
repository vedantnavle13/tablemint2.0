'use strict';
const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendEmail, emailTemplates } = require('../utils/email');
const logger = require('../utils/logger');

// ─── Helper: Auto-generate a bill from existing pre-order + reservation fee ───
// Called internally when a reservation transitions to "completed" and no bill
// exists yet. Captains/admin can still call /generate-bill manually to add extras.
async function _autoGenerateBill(reservation, actorId) {
  // Build system items from reservation fee + pre-order
  const systemItems = [];
  if (reservation.reservationFee > 0) {
    systemItems.push({ description: 'Reservation Fee', amount: reservation.reservationFee, quantity: 1 });
  }
  (reservation.preOrderItems || []).forEach(item => {
    systemItems.push({ description: item.name, amount: item.price, quantity: item.quantity });
  });

  const subTotal = systemItems.reduce((s, i) => s + i.amount * i.quantity, 0);
  // Default 5% GST; admin can regenerate with custom tax via /generate-bill
  const taxAmount = Math.round(subTotal * 0.05 * 100) / 100;
  const grandTotal = subTotal + taxAmount;

  reservation.billItems = systemItems;
  reservation.billTax = taxAmount;
  reservation.billTotal = grandTotal;
  reservation.billGeneratedAt = new Date();
  reservation.billGeneratedBy = actorId;
  reservation.billNotes = 'Auto-generated on completion. Contact restaurant to update.';
}

// ── @POST /api/reservations ───────────────────────────────────────────────────
exports.createReservation = catchAsync(async (req, res, next) => {
  const { restaurantId, type, scheduledAt, arrivalInMinutes, numberOfGuests, specialRequests, preOrderItems } = req.body;

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));
  if (!restaurant.isActive) return next(new AppError('This restaurant is not currently accepting reservations.', 400));

  if (type === 'instant' && !restaurant.instantBookingEnabled)
    return next(new AppError('This restaurant does not support instant booking.', 400));

  let bookingTime = scheduledAt;
  if (type === 'instant') bookingTime = new Date(Date.now() + (arrivalInMinutes || 30) * 60 * 1000);

  const tables = Array.isArray(restaurant.tables) ? restaurant.tables : [];
  const totalSeats = tables.filter(t => t.isAvailable).reduce((s, t) => s + t.capacity, 0);

  if (totalSeats === 0)
    return next(new AppError('This restaurant has not set up any tables yet. Bookings are not available.', 400));

  if (numberOfGuests > totalSeats)
    return next(new AppError(`Not enough seats. Maximum capacity is ${totalSeats}.`, 400));

  const slotStart = new Date(new Date(bookingTime).getTime() - 2 * 60 * 60 * 1000);
  const slotEnd = new Date(new Date(bookingTime).getTime() + 2 * 60 * 60 * 1000);

  const overlapping = await Reservation.find({
    restaurant: restaurantId,
    scheduledAt: { $gte: slotStart, $lte: slotEnd },
    status: { $in: ['pending', 'confirmed', 'seated'] },
  });

  const bookedGuests = overlapping.reduce((sum, r) => sum + r.numberOfGuests, 0);
  const availableSeats = totalSeats - bookedGuests;

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
  } catch (err) { logger.error('Reservation confirmation email failed:', err.message); }

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
    .populate('assignedCaptain', 'name')
    .populate('billGeneratedBy', 'name');
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
// Customer can cancel pending or confirmed bookings.
// Seated, completed, cancelled, and no_show bookings CANNOT be cancelled by the customer.
exports.cancelReservation = catchAsync(async (req, res, next) => {
  const reservation = await Reservation.findById(req.params.id).populate('restaurant', 'name');
  if (!reservation) return next(new AppError('Reservation not found.', 404));
  if (reservation.customer.toString() !== req.user.id)
    return next(new AppError('You are not authorized to cancel this reservation.', 403));

  // ── FIXED: also block cancellation when already seated ──────────────────────
  if (['seated', 'completed', 'cancelled', 'no_show'].includes(reservation.status))
    return next(new AppError(`Cannot cancel a reservation with status: ${reservation.status}.`, 400));

  reservation.status = 'cancelled';
  reservation.cancelledBy = 'customer';
  reservation.cancellationReason = req.body.reason || 'Cancelled by customer';
  reservation.cancelledAt = new Date();
  await reservation.save();

  try {
    const template = emailTemplates.reservationCancellation(reservation, reservation.restaurant, req.user);
    await sendEmail({ to: req.user.email, ...template });
  } catch (err) { logger.error('Cancellation email failed:', err.message); }

  res.status(200).json({ status: 'success', data: { reservation } });
});

// ── @GET /api/reservations/restaurant/:restaurantId ───────────────────────────
exports.getRestaurantReservations = catchAsync(async (req, res, next) => {
  const { restaurantId } = req.params;
  const { status, date, page = 1, limit = 20 } = req.query;

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
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    query.scheduledAt = { $gte: start, $lte: end };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [reservations, total] = await Promise.all([
    Reservation.find(query)
      .populate('customer', 'name phone')
      .populate('assignedCaptain', 'name')
      .sort('scheduledAt')
      .skip(skip)
      .limit(parseInt(limit)),
    Reservation.countDocuments(query),
  ]);

  res.status(200).json({ status: 'success', total, totalPages: Math.ceil(total / parseInt(limit)), data: { reservations } });
});

// ── @PATCH /api/reservations/:id/status ──────────────────────────────────────
// Business rules (strictly enforced):
//   pending   → confirmed               (admin/owner)
//   confirmed → seated                  (admin/owner/captain) — only if now ≥ scheduledAt − 30 min
//   confirmed → no_show                 (admin/owner)         — only if now ≥ scheduledAt + 45 min
//   confirmed → cancelled               (admin/owner)
//   seated    → completed               (admin/owner/captain) — auto-generates bill if none exists
exports.updateReservationStatus = catchAsync(async (req, res, next) => {
  const { status, captainNotes, cancellationReason, tableId } = req.body;

  const reservation = await Reservation.findById(req.params.id)
    .populate('restaurant', 'owner name')
    .populate('customer', 'name email');
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  // ── Role-based ownership check ────────────────────────────────────────────
  if (req.user.role === 'captain' &&
    reservation.restaurant._id.toString() !== req.user.assignedRestaurant?.toString())
    return next(new AppError('You are not authorized to manage this reservation.', 403));

  if (req.user.role === 'owner' &&
    reservation.restaurant.owner?.toString() !== req.user.id)
    return next(new AppError('You are not authorized to manage this reservation.', 403));

  // ── Valid status transitions ──────────────────────────────────────────────
  const validTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['seated', 'cancelled', 'no_show'],
    seated: ['completed'],
    completed: [], cancelled: [], no_show: [],
  };

  if (!validTransitions[reservation.status]?.includes(status))
    return next(new AppError(`Cannot transition from "${reservation.status}" to "${status}".`, 400));

  const now = new Date();

  // ── Time-gate: confirmed → seated (30 min before booking time) ───────────
  if (status === 'seated') {
    const thirtyMinBefore = new Date(reservation.scheduledAt.getTime() - 30 * 60 * 1000);
    if (now < thirtyMinBefore) {
      const minutesLeft = Math.ceil((thirtyMinBefore - now) / 60000);
      return next(new AppError(
        `Cannot seat before ${minutesLeft} more minute${minutesLeft !== 1 ? 's' : ''}. Seating opens 30 minutes before the scheduled time.`,
        400
      ));
    }
  }

  // ── Time-gate: confirmed → no_show (45 min after booking time) ───────────
  if (status === 'no_show') {
    const fortyFiveMinAfter = new Date(reservation.scheduledAt.getTime() + 45 * 60 * 1000);
    if (now < fortyFiveMinAfter) {
      const minutesLeft = Math.ceil((fortyFiveMinAfter - now) / 60000);
      return next(new AppError(
        `Cannot mark as No Show yet. This option becomes available ${minutesLeft} more minute${minutesLeft !== 1 ? 's' : ''} after the scheduled booking time.`,
        400
      ));
    }
  }

  // ── Apply the status change ───────────────────────────────────────────────
  const prevStatus = reservation.status;
  reservation.status = status;
  if (captainNotes) reservation.captainNotes = captainNotes;
  if (tableId) reservation.table = tableId;

  if (status === 'cancelled') {
    reservation.cancelledBy = req.user.role === 'admin' ? 'admin' : 'restaurant';
    reservation.cancellationReason = cancellationReason || 'Cancelled by restaurant';
    reservation.cancelledAt = new Date();
  }

  if (status === 'seated') {
    // Record which captain/staff seated the customer
    reservation.assignedCaptain = req.user.id;
  }

  // ── AUTO-BILL: seated → completed ────────────────────────────────────────
  // When any role marks a reservation as completed, automatically generate a
  // basic bill (pre-order items + reservation fee + 5% GST) if no bill exists.
  // Admin/owner can regenerate a more detailed bill via POST /generate-bill.
  if (status === 'completed' && !reservation.billGeneratedAt) {
    await _autoGenerateBill(reservation, req.user.id);
    logger.info(`[AutoBill] Generated for reservation ${reservation._id} by ${req.user.id}`);
  }

  await reservation.save();

  // ── Send status update email to customer ──────────────────────────────────
  try {
    const customerEmail = reservation.customer?.email;
    if (customerEmail) {
      const template = emailTemplates.reservationStatusUpdate(
        reservation,
        reservation.restaurant,
        reservation.customer,
        prevStatus,
        status
      );
      await sendEmail({ to: customerEmail, ...template });
    }
  } catch (err) { logger.error('Status update email failed:', err.message); }

  res.status(200).json({ status: 'success', data: { reservation } });
});

// ── @PATCH /api/reservations/:id/customer-message ───────────────────────────
// Customer sends a special message/request AFTER their booking is confirmed.
exports.sendCustomerMessage = catchAsync(async (req, res, next) => {
  const { message } = req.body;
  if (!message || !message.trim())
    return next(new AppError('Message cannot be empty.', 400));
  if (message.trim().length > 600)
    return next(new AppError('Message cannot exceed 600 characters.', 400));

  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  // Only the owner of the reservation can send a message
  if (reservation.customer.toString() !== req.user.id)
    return next(new AppError('You are not authorized to message on this reservation.', 403));

  // Only allowed when status is 'confirmed'
  if (reservation.status !== 'confirmed')
    return next(new AppError('You can only send a special message for confirmed reservations.', 400));

  reservation.customerMessage = message.trim();
  reservation.customerMessageSentAt = new Date();
  await reservation.save();

  res.status(200).json({
    status: 'success',
    message: 'Your message has been sent to the restaurant.',
    data: { customerMessage: reservation.customerMessage, sentAt: reservation.customerMessageSentAt },
  });
});

// ── @POST /api/reservations/:id/notify-customer ──────────────────────────────
// Admin/owner sends a custom notification to the customer WITHOUT exposing
// the customer's email address to the frontend caller.
exports.notifyCustomer = catchAsync(async (req, res, next) => {
  const { message } = req.body;
  if (!message || !message.trim())
    return next(new AppError('Notification message cannot be empty.', 400));

  const reservation = await Reservation.findById(req.params.id)
    .populate('customer', 'name email')
    .populate('restaurant', 'name owner');
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  // Only admin or the restaurant owner can send notifications
  if (req.user.role === 'owner' && reservation.restaurant.owner?.toString() !== req.user.id)
    return next(new AppError('You are not authorized to notify customers for this reservation.', 403));

  const customerEmail = reservation.customer?.email;
  if (!customerEmail) return next(new AppError('Customer email not found.', 500));

  // Send the email — email address is never returned in the response
  await sendEmail({
    to: customerEmail,
    ...emailTemplates.customerNotification(reservation, reservation.restaurant, reservation.customer, message.trim()),
  });

  // Log the notification
  reservation.notificationLog.push({
    sentBy: req.user.id,
    message: message.trim(),
    channel: 'email',
  });
  await reservation.save();

  logger.info(`[Notification] Admin ${req.user.id} notified customer for reservation ${reservation._id}`);

  // ✅ Never return the customer email to the frontend
  res.status(200).json({
    status: 'success',
    message: 'Customer has been notified successfully.',
    data: {
      notificationSentAt: new Date(),
      reservationId: reservation._id,
    },
  });
});

// ── @POST /api/reservations/:id/generate-bill ────────────────────────────────
// Admin/owner/captain generates (or regenerates) the bill after a reservation
// is seated or completed. Supports adding extra items beyond the pre-order.
exports.generateBill = catchAsync(async (req, res, next) => {
  const { billItems, taxPercent = 5, billNotes } = req.body;

  const reservation = await Reservation.findById(req.params.id)
    .populate('restaurant', 'owner name')
    .populate('customer', 'name');
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  // Only admin, restaurant owner, or assigned captain can generate a bill
  if (req.user.role === 'owner' && reservation.restaurant.owner?.toString() !== req.user.id)
    return next(new AppError('You are not authorized to generate bills for this restaurant.', 403));

  if (req.user.role === 'captain' &&
    reservation.restaurant._id.toString() !== req.user.assignedRestaurant?.toString())
    return next(new AppError('You are not authorized to generate bills for this reservation.', 403));

  // Bill can only be generated for seated or completed reservations
  if (!['seated', 'completed'].includes(reservation.status))
    return next(new AppError('Bill can only be generated for seated or completed reservations.', 400));

  // ── Build bill items ──────────────────────────────────────────────────────
  // Start with system-generated items (reservation fee + pre-order)
  const systemItems = [];
  if (reservation.reservationFee > 0) {
    systemItems.push({ description: 'Reservation Fee', amount: reservation.reservationFee, quantity: 1 });
  }
  if (reservation.preOrderItems?.length > 0) {
    reservation.preOrderItems.forEach(item => {
      systemItems.push({ description: item.name, amount: item.price, quantity: item.quantity });
    });
  }

  // Admin/captain can also pass additional bill items (e.g. in-house orders)
  const extraItems = Array.isArray(billItems)
    ? billItems.map(i => ({ description: i.description, amount: Number(i.amount), quantity: Number(i.quantity) || 1 }))
    : [];

  const allItems = [...systemItems, ...extraItems];
  const subTotal = allItems.reduce((s, i) => s + i.amount * i.quantity, 0);
  const taxAmount = Math.round(subTotal * (Number(taxPercent) / 100) * 100) / 100;
  const grandTotal = subTotal + taxAmount;

  reservation.billItems = allItems;
  reservation.billTax = taxAmount;
  reservation.billTotal = grandTotal;
  reservation.billGeneratedAt = new Date();
  reservation.billGeneratedBy = req.user.id;
  reservation.billNotes = billNotes || null;

  // If the reservation is still "seated", mark it completed when the bill is generated
  if (reservation.status === 'seated') {
    reservation.status = 'completed';
  }

  await reservation.save();

  res.status(200).json({
    status: 'success',
    message: 'Bill generated successfully.',
    data: { reservation },
  });
});

// ── @GET /api/reservations/:id/bill ──────────────────────────────────────────
// Retrieve bill details — visible to customer (own booking), admin, owner, captain.
exports.getBill = catchAsync(async (req, res, next) => {
  const reservation = await Reservation.findById(req.params.id)
    .populate('restaurant', 'name address phone email')
    .populate('customer', 'name email phone')
    .populate('billGeneratedBy', 'name');
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  // Access control: customer (own booking), owner, admin, captain
  const isCustomer = req.user.role === 'customer' && reservation.customer._id.toString() === req.user.id;
  const isOwner = req.user.role === 'owner';
  const isAdminOrCaptain = ['admin', 'captain'].includes(req.user.role);

  if (!isCustomer && !isOwner && !isAdminOrCaptain)
    return next(new AppError('You are not authorized to view this bill.', 403));

  if (!reservation.billGeneratedAt)
    return next(new AppError('No bill has been generated for this reservation yet.', 404));

  res.status(200).json({ status: 'success', data: { reservation } });
});

// ── @PATCH /api/reservations/:id/payment ─────────────────────────────────────
// Mark payment status for a completed reservation.
// Customer can set paymentStatus to 'paid' (simulate online payment).
// Admin can set to any valid status: 'paid', 'refunded', 'waived'.
exports.markPayment = catchAsync(async (req, res, next) => {
  const { paymentStatus, paymentReference } = req.body;

  const validStatuses = ['unpaid', 'paid', 'refunded', 'waived'];
  if (!paymentStatus || !validStatuses.includes(paymentStatus))
    return next(new AppError(`Invalid payment status. Must be one of: ${validStatuses.join(', ')}.`, 400));

  const reservation = await Reservation.findById(req.params.id)
    .populate('restaurant', 'owner name')
    .populate('customer', 'name email');
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  // ── Authorization ─────────────────────────────────────────────────────────
  const isCustomer = req.user.role === 'customer' && reservation.customer._id.toString() === req.user.id;
  const isOwner = req.user.role === 'owner' && reservation.restaurant.owner?.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isCustomer && !isOwner && !isAdmin)
    return next(new AppError('You are not authorized to update the payment status.', 403));

  // ── Customers can only mark as 'paid' ─────────────────────────────────────
  if (isCustomer && paymentStatus !== 'paid')
    return next(new AppError('Customers can only mark a bill as paid.', 403));

  // ── Only completed reservations can have payment marked ───────────────────
  if (reservation.status !== 'completed')
    return next(new AppError('Payment can only be recorded for completed reservations.', 400));

  if (!reservation.billGeneratedAt)
    return next(new AppError('No bill has been generated for this reservation.', 400));

  reservation.paymentStatus = paymentStatus;
  reservation.paymentReference = paymentReference || `TM-${Date.now()}`;
  await reservation.save();

  logger.info(`[Payment] Reservation ${reservation._id} marked as "${paymentStatus}" by ${req.user.id}`);

  res.status(200).json({
    status: 'success',
    message: `Payment status updated to "${paymentStatus}".`,
    data: {
      reservationId: reservation._id,
      paymentStatus: reservation.paymentStatus,
      paymentReference: reservation.paymentReference,
      billTotal: reservation.billTotal,
    },
  });
});

// ── Admin only ────────────────────────────────────────────────────────────────
exports.getAllReservations = catchAsync(async (req, res, next) => {
  const { status, restaurant, page = 1, limit = 20, dateFrom, dateTo } = req.query;
  const query = {};
  if (status) query.status = { $in: status.split(',') };
  if (restaurant) query.restaurant = restaurant;
  if (dateFrom || dateTo) {
    query.scheduledAt = {};
    if (dateFrom) query.scheduledAt.$gte = new Date(dateFrom);
    if (dateTo) query.scheduledAt.$lte = new Date(dateTo);
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
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayCount = await Reservation.countDocuments({ scheduledAt: { $gte: today } });
  res.status(200).json({ status: 'success', data: { stats, todayCount } });
});
