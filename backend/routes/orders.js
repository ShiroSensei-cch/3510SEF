const express = require('express');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Menu = require('../models/Menu');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { geocodeAddress } = require('../utils/geocode');
const router = express.Router();

// ========== CREATE ORDER ==========
// @route   POST /api/orders
// @desc    Create a new order (with geocoding)
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { restaurant, items, totalAmount, deliveryAddress } = req.body;

    if (!restaurant || !items || !totalAmount || !deliveryAddress) {
      return res.status(400).json({ message: 'Please provide restaurant, items, totalAmount, and deliveryAddress' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items must be a non-empty array' });
    }

    const restaurantExists = await Restaurant.findById(restaurant);
    if (!restaurantExists) return res.status(404).json({ message: 'Restaurant not found' });

    let calculatedTotal = 0;
    for (let item of items) {
      const menuItem = await Menu.findById(item.menuItem);
      if (!menuItem) return res.status(404).json({ message: `Menu item ${item.menuItem} not found` });
      if (!item.quantity || item.quantity < 1) return res.status(400).json({ message: 'Invalid quantity' });
      calculatedTotal += menuItem.price * item.quantity;
      item.price = menuItem.price;
    }
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return res.status(400).json({ message: 'Total amount mismatch' });
    }

    let deliveryCoordinates = null;
    const geoResult = await geocodeAddress(deliveryAddress);
    if (geoResult) deliveryCoordinates = [geoResult.lng, geoResult.lat];

    const order = new Order({
      user: req.user.id,
      restaurant,
      items,
      totalAmount,
      deliveryAddress,
      deliveryCoordinates,
      status: 'placed'
    });
    await order.save();
    await order.populate('restaurant', 'name address phone');
    await order.populate('items.menuItem', 'name description price');

    const io = req.app.get('io');
    io.to(order._id.toString()).emit('order_created', { orderId: order._id, status: order.status });
    res.status(201).json(order);
  } catch (err) {
    console.error(err.message);
    if (err.name === 'ValidationError') return res.status(400).json({ message: 'Validation error' });
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID format' });
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== STATIC ROUTES (must come before /:id) ==========
// @route   GET /api/orders/my-orders
// @desc    Get current user's orders
// @access  Private
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('restaurant', 'name address phone image')
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/restaurant/:restaurantId
// @desc    Get orders for a specific restaurant (owner only)
// @access  Private
router.get('/restaurant/:restaurantId', auth, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    if (restaurant.owner && restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Not the restaurant owner.' });
    }
    const orders = await Order.find({ restaurant: restaurantId })
      .populate('user', 'name email phone')
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid restaurant ID format' });
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/delivery/my-assignments
// @desc    Get orders assigned to the logged-in delivery person
// @access  Private (delivery_person only)
router.get('/delivery/my-assignments', auth, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_person') {
      return res.status(403).json({ message: 'Access denied. Only delivery personnel can view assigned orders.' });
    }
    const orders = await Order.find({ assignedDeliveryPerson: req.user.id })
      .populate('restaurant', 'name address phone')
      .populate('user', 'name phone')
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/available
// @desc    Get orders ready for delivery (status 'out_for_delivery' and no assigned delivery person)
// @access  Private (delivery_person only)
router.get('/available', auth, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_person') {
      return res.status(403).json({ message: 'Access denied. Only delivery personnel can view available orders.' });
    }
    const availableOrders = await Order.find({
      status: 'out_for_delivery',
      assignedDeliveryPerson: { $exists: false, $eq: null }
    })
      .populate('restaurant', 'name address phone')
      .populate('user', 'name phone')
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: 1 });
    res.json(availableOrders);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/orders/:id/accept
// @desc    Delivery person accepts an available order
// @access  Private (delivery_person only)
router.post('/:id/accept', auth, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_person') {
      return res.status(403).json({ message: 'Access denied. Only delivery personnel can accept orders.' });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'out_for_delivery' || order.assignedDeliveryPerson) {
      return res.status(400).json({ message: 'Order is no longer available.' });
    }
    order.assignedDeliveryPerson = req.user.id;
    await order.save();
    const io = req.app.get('io');
    io.emit('order_taken', { orderId: order._id, takenBy: req.user.id });
    res.json({ message: 'Order accepted successfully', order });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/orders/:id/assign
// @desc    Assign a delivery person to an order (restaurant owner or admin)
// @access  Private
router.patch('/:id/assign', auth, async (req, res) => {
  try {
    const { deliveryPersonId } = req.body;
    if (!deliveryPersonId) return res.status(400).json({ message: 'Delivery person ID is required' });
    const order = await Order.findById(req.params.id).populate('restaurant', 'owner');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const isRestaurantOwner = order.restaurant.owner && order.restaurant.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isRestaurantOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only restaurant owner or admin can assign delivery' });
    }
    const deliveryPerson = await User.findById(deliveryPersonId);
    if (!deliveryPerson || deliveryPerson.role !== 'delivery_person') {
      return res.status(400).json({ message: 'Invalid delivery person (must have role delivery_person)' });
    }
    order.assignedDeliveryPerson = deliveryPersonId;
    await order.save();
    await order.populate('assignedDeliveryPerson', 'name phone');
    const io = req.app.get('io');
    io.to(order._id.toString()).emit('order_assigned', {
      orderId: order._id,
      assignedTo: order.assignedDeliveryPerson,
      message: `Order assigned to delivery person: ${order.assignedDeliveryPerson.name}`
    });
    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID format' });
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/orders/:id/status
// @desc    Update order status
// @access  Private
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
    if (!status || !validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const order = await Order.findById(req.params.id)
      .populate('restaurant', 'name owner')
      .populate('user', 'name email')
      .populate('assignedDeliveryPerson', 'name');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const isRestaurantOwner = order.restaurant.owner && order.restaurant.owner.toString() === req.user.id;
    const isDeliveryPerson = order.assignedDeliveryPerson && order.assignedDeliveryPerson._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (isRestaurantOwner && ['placed', 'confirmed', 'preparing', 'out_for_delivery'].includes(status)) {
      // allowed
    } else if (isDeliveryPerson && ['out_for_delivery', 'delivered'].includes(status)) {
      // allowed
    } else if (isAdmin) {
      // allowed
    } else {
      return res.status(403).json({ message: 'Not authorized to update this order status' });
    }
    order.status = status;
    if (status === 'delivered') order.deliveredAt = new Date();
    await order.save();
    const io = req.app.get('io');
    io.to(order._id.toString()).emit('order_status_updated', {
      orderId: order._id,
      status: order.status,
      updatedAt: order.updatedAt
    });
    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid order ID format' });
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Cancel an order (only if placed or confirmed)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const isOwner = order.user.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'You can only cancel your own orders.' });
    if (!['placed', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage.' });
    }
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = req.user.id;
    await order.save();
    const io = req.app.get('io');
    io.to(order._id.toString()).emit('order_cancelled', {
      orderId: order._id,
      status: order.status,
      cancelledBy: req.user.name,
      message: 'Order has been cancelled'
    });
    res.json({ message: 'Order cancelled successfully', order });
  } catch (err) {
    console.error(err.message);
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid order ID format' });
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== DYNAMIC ROUTE (MUST BE LAST) ==========
// @route   GET /api/orders/:id
// @desc    Get single order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurant', 'name address phone image cuisine')
      .populate('user', 'name email phone')
      .populate('items.menuItem', 'name description price category')
      .populate('assignedDeliveryPerson', 'name phone');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const isOwner = order.user._id.toString() === req.user.id;
    const isRestaurantOwner = order.restaurant.owner && order.restaurant.owner.toString() === req.user.id;
    const isDeliveryPerson = order.assignedDeliveryPerson && order.assignedDeliveryPerson._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isRestaurantOwner && !isDeliveryPerson && !isAdmin) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid order ID format' });
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== ADMIN ROUTES ==========
// @route   GET /api/orders
// @desc    Get all orders (admin only)
// @access  Private (admin)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    const { page = 1, limit = 10, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .populate('restaurant', 'name')
      .populate('assignedDeliveryPerson', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Order.countDocuments(filter);
    res.json({ orders, totalPages: Math.ceil(total / limit), currentPage: page, total });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;