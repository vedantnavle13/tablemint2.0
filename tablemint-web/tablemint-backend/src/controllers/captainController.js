const User = require('../models/User');
const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ── @GET /api/captain/lookup/:customerId ──────────────────────────────────────
// Captain enters 9-digit ID → get customer's active reservation at their restaurant
exports.lookupCustomer = catchAsync(async (req, res, next) => {
  const { customerId } = req.params;

  // Find the customer by their 9-digit ID
  const customer = await User.findOne({ customerId, role: 'customer' });
  if (!customer) {
    return next(new AppError('No customer found with this ID.', 404));
  }

  // Get the captain's assigned restaurant
  const restaurantId = req.user.assignedRestaurant;
  if (!restaurantId) {
    return next(new AppError('You are not assigned to any restaurant.', 403));
  }

  // Find active reservation for this customer at this restaurant
  const reservation = await Reservation.findOne({
    customer: customer._id,
    restaurant: restaurantId,
    status: { $in: ['pending', 'confirmed', 'seated'] },
  })
    .populate('restaurant', 'name address menu')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    data: {
      customer: {
        id: customer._id,
        customerId: customer.customerId,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      reservation: reservation || null,
    },
  });
});

// ── @POST /api/captain/reservations/:id/add-items ─────────────────────────────
// Captain adds food items to an existing reservation's pre-order
exports.addItemsToOrder = catchAsync(async (req, res, next) => {
  const { items } = req.body; // [{ menuItemId, quantity }]

  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError('Please provide items to add.', 400));
  }

  const reservation = await Reservation.findById(req.params.id)
    .populate('restaurant', 'name menu');

  if (!reservation) {
    return next(new AppError('Reservation not found.', 404));
  }

  // Make sure captain belongs to this restaurant
  if (reservation.restaurant._id.toString() !== req.user.assignedRestaurant?.toString()) {
    return next(new AppError('You are not authorized to update this reservation.', 403));
  }

  if (['completed', 'cancelled', 'no_show'].includes(reservation.status)) {
    return next(new AppError(`Cannot add items to a ${reservation.status} reservation.`, 400));
  }

  // Match each item to the restaurant menu
  const menu = reservation.restaurant.menu || [];
  const addedItems = [];

  for (const item of items) {
    const menuItem = menu.find(m => m._id.toString() === item.menuItemId);
    if (!menuItem) continue; // skip unknown items

    // Check if item already exists in pre-order — if so, increase quantity
    const existing = reservation.preOrderItems.find(
      p => p.menuItem?.toString() === menuItem._id.toString()
    );

    if (existing) {
      existing.quantity += (item.quantity || 1);
    } else {
      reservation.preOrderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity || 1,
      });
    }

    addedItems.push({ name: menuItem.name, quantity: item.quantity || 1, price: menuItem.price });
  }

  await reservation.save(); // pre-save hook recalculates preOrderTotal + totalAmount

  res.status(200).json({
    status: 'success',
    message: `${addedItems.length} item(s) added to the order.`,
    data: {
      addedItems,
      reservation: {
        id: reservation._id,
        preOrderItems: reservation.preOrderItems,
        preOrderTotal: reservation.preOrderTotal,
        totalAmount: reservation.totalAmount,
      },
    },
  });
});

// ── @GET /api/captain/restaurant/menu ─────────────────────────────────────────
// Captain gets menu of their assigned restaurant
exports.getRestaurantMenu = catchAsync(async (req, res, next) => {
  const restaurantId = req.user.assignedRestaurant;
  if (!restaurantId) {
    return next(new AppError('You are not assigned to any restaurant.', 403));
  }

  const restaurant = await Restaurant.findById(restaurantId).select('name menu');
  if (!restaurant) {
    return next(new AppError('Restaurant not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      restaurant: { id: restaurant._id, name: restaurant.name },
      menu: restaurant.menu,
    },
  });
});

// ── @POST /api/captain/offline-order ─────────────────────────────────────────
// Captain adds offline walk-in customer order — shows up in admin dashboard
exports.createOfflineOrder = catchAsync(async (req, res, next) => {
  const { items, tableNumber, customerName } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0)
    return next(new AppError('Please provide at least one item.', 400));

  const restaurantId = req.user.assignedRestaurant;
  if (!restaurantId)
    return next(new AppError('You are not assigned to any restaurant.', 403));

  const Restaurant = require('../models/Restaurant');
  const Reservation = require('../models/Reservation');

  const restaurant = await Restaurant.findById(restaurantId).select('name menu reservationFee');
  if (!restaurant) return next(new AppError('Restaurant not found.', 404));

  // Resolve items against menu
  const menu = restaurant.menu || [];
  const resolvedItems = [];
  let total = 0;

  for (const item of items) {
    const menuItem = menu.find(m => m._id.toString() === item.menuItemId);
    if (!menuItem) continue;
    const qty = item.quantity || 1;
    resolvedItems.push({
      menuItem: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: qty,
    });
    total += menuItem.price * qty;
  }

  if (resolvedItems.length === 0)
    return next(new AppError('No valid menu items found.', 400));

  // Create a walk-in reservation (scheduled now, type instant, no customer account)
  const reservation = await Reservation.create({
    restaurant: restaurantId,
    customer: req.user._id, // captain creates it
    type: 'instant',
    scheduledAt: new Date(),
    numberOfGuests: 1,
    status: 'seated',
    reservationFee: 0,
    preOrderItems: resolvedItems,
    specialRequests: `WALK-IN | Table: ${tableNumber || 'N/A'} | Name: ${customerName || 'Walk-in Customer'}`,
  });

  res.status(201).json({
    status: 'success',
    message: 'Offline order created and sent to admin dashboard.',
    data: {
      orderId: reservation._id,
      customerName: customerName || 'Walk-in Customer',
      tableNumber: tableNumber || 'N/A',
      items: resolvedItems,
      total,
    },
  });
});
