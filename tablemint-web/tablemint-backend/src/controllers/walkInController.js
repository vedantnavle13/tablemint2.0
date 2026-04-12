const WalkInOrder = require('../models/WalkInOrder');
const Restaurant  = require('../models/Restaurant');
const AppError    = require('../utils/AppError');
const catchAsync  = require('../utils/catchAsync');

// ── Helpers ───────────────────────────────────────────────────────────────────
const TAX_RATE = 0.18; // 18% GST

// ── @POST /api/captain/walk-in ────────────────────────────────────────────────
// Captain submits a walk-in order — no user account created.
exports.createWalkIn = catchAsync(async (req, res, next) => {
  const { items, tableNumber, customerName } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0)
    return next(new AppError('Please provide at least one item.', 400));

  const restaurantId = req.user.assignedRestaurant;
  if (!restaurantId)
    return next(new AppError('You are not assigned to any restaurant.', 403));

  const restaurant = await Restaurant.findById(restaurantId).select('name menu');
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));

  // Resolve items against the restaurant's menu
  const menu = restaurant.menu || [];
  const resolvedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const menuItem = menu.find(m => m._id.toString() === item.menuItemId);
    if (!menuItem) continue;
    const qty = Math.max(1, item.quantity || 1);
    resolvedItems.push({
      name:     menuItem.name,
      price:    menuItem.price,
      quantity: qty,
    });
    subtotal += menuItem.price * qty;
  }

  if (resolvedItems.length === 0)
    return next(new AppError('No valid menu items found.', 400));

  const tax       = parseFloat((subtotal * TAX_RATE).toFixed(2));
  const grandTotal= parseFloat((subtotal + tax).toFixed(2));

  const order = await WalkInOrder.create({
    restaurant:   restaurantId,
    createdBy:    req.user._id,
    customerName: customerName?.trim() || 'Walk-in Customer',
    tableNumber:  tableNumber?.trim()  || 'N/A',
    items:        resolvedItems,
    subtotal,
    tax,
    grandTotal,
  });

  res.status(201).json({
    status:  'success',
    message: 'Walk-in order created. Visible in admin panel.',
    data: {
      orderId:       order._id,
      walkInId:      order.walkInId,
      transactionId: order.transactionId,
      customerName:  order.customerName,
      tableNumber:   order.tableNumber,
      items:         order.items,
      subtotal:      order.subtotal,
      tax:           order.tax,
      grandTotal:    order.grandTotal,
      paymentStatus: order.paymentStatus,
    },
  });
});

// ── @PATCH /api/captain/walk-in/:id/pay ───────────────────────────────────────
// Captain or admin marks walk-in order as paid.
exports.markWalkInPaid = catchAsync(async (req, res, next) => {
  const order = await WalkInOrder.findById(req.params.id);
  if (!order) return next(new AppError('Walk-in order not found.', 404));

  // Scope check — captain must belong to same restaurant
  const restaurantId = req.user.assignedRestaurant || req.user.restaurant;
  if (restaurantId && order.restaurant.toString() !== restaurantId.toString())
    return next(new AppError('Not authorized for this order.', 403));

  if (order.paymentStatus === 'paid')
    return next(new AppError('Order is already marked as paid.', 400));

  order.paymentStatus = 'paid';
  order.paidAt        = new Date();
  await order.save();

  res.status(200).json({
    status:  'success',
    message: `Walk-in order ${order.walkInId} marked as PAID.`,
    data: {
      orderId:       order._id,
      walkInId:      order.walkInId,
      transactionId: order.transactionId,
      paymentStatus: order.paymentStatus,
      paidAt:        order.paidAt,
      grandTotal:    order.grandTotal,
    },
  });
});

// ── @GET /api/admin/walk-ins ──────────────────────────────────────────────────
// Admin gets all walk-in orders for their restaurant, newest first.
exports.getWalkIns = catchAsync(async (req, res, next) => {
  const restaurantId = req.user.assignedRestaurant;
  if (!restaurantId)
    return next(new AppError('You are not assigned to any restaurant.', 403));

  const orders = await WalkInOrder.find({ restaurant: restaurantId })
    .sort('-createdAt')
    .lean();

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: { walkIns: orders },
  });
});

// ── @POST /api/admin/walk-in/:id/bill ────────────────────────────────────────
// Admin generates/stamps the bill for a walk-in order, returns full data for printing.
exports.generateWalkInBill = catchAsync(async (req, res, next) => {
  const restaurantId = req.user.assignedRestaurant;
  const order = await WalkInOrder.findById(req.params.id).populate('restaurant', 'name address');

  if (!order) return next(new AppError('Walk-in order not found.', 404));
  if (order.restaurant._id.toString() !== restaurantId.toString())
    return next(new AppError('Not authorized.', 403));

  if (!order.billGeneratedAt) {
    order.billGeneratedAt = new Date();
    await order.save();
  }

  res.status(200).json({
    status: 'success',
    data: { walkIn: order },
  });
});
