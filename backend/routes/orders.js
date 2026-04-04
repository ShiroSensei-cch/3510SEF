const express = require('express');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Menu = require('../models/Menu');
const auth = require('../middleware/auth');
const router = express.Router();

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { restaurant, items, totalAmount, deliveryAddress } = req.body;

    // Validate required fields
    if (!restaurant || !items || !totalAmount || !deliveryAddress) {
      return res.status(400).json({ 
        message: 'Please provide restaurant, items, totalAmount, and deliveryAddress' 
      });
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        message: 'Items must be a non-empty array' 
      });
    }

    // Verify restaurant exists
    const restaurantExists = await Restaurant.findById(restaurant);
    if (!restaurantExists) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Verify menu items exist and calculate total
    let calculatedTotal = 0;
    for (let item of items) {
      const menuItem = await Menu.findById(item.menuItem);
      if (!menuItem) {
        return res.status(404).json({ 
          message: `Menu item ${item.menuItem} not found` 
        });
      }
      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({ 
          message: 'Invalid quantity for menu item' 
        });
      }
      calculatedTotal += menuItem.price * item.quantity;
      
      // Add current price to item for record keeping
      item.price = menuItem.price;
    }

    // Validate total amount
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return res.status(400).json({ 
        message: 'Total amount does not match calculated total' 
      });
    }

    // Create new order
    const order = new Order({
      user: req.user.id,
      restaurant,
      items,
      totalAmount,
      deliveryAddress,
      status: 'placed'
    });

    await order.save();
    
    // Populate order details before sending response
    await order.populate('restaurant', 'name address phone');
    await order.populate('items.menuItem', 'name description price');

    // Emit real-time order creation event
    const io = req.app.get('io');
    io.to(order._id.toString()).emit('order_created', {
      orderId: order._id,
      status: order.status,
      message: 'New order has been placed'
    });

    res.status(201).json(order);
  } catch (err) {
    console.error('Error creating order:', err.message);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid ID format' 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

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
    console.error('Error fetching user orders:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/restaurant/:restaurantId
// @desc    Get orders for a specific restaurant (for restaurant owners)
// @access  Private
router.get('/restaurant/:restaurantId', auth, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Verify the restaurant exists and user is the owner
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Check if user is the restaurant owner or has admin role
    if (restaurant.owner && restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. Not the restaurant owner.' 
      });
    }

    const orders = await Order.find({ restaurant: restaurantId })
      .populate('user', 'name email phone')
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error('Error fetching restaurant orders:', err.message);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid restaurant ID format' 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurant', 'name address phone image cuisine')
      .populate('user', 'name email phone')
      .populate('items.menuItem', 'name description price category')
      .populate('assignedTo', 'name phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the order belongs to the user or user is restaurant owner/delivery person
    const isOwner = order.user._id.toString() === req.user.id;
    const isRestaurantOwner = order.restaurant.owner && order.restaurant.owner.toString() === req.user.id;
    const isDeliveryPerson = order.assignedTo && order.assignedTo._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isRestaurantOwner && !isDeliveryPerson && !isAdmin) {
      return res.status(403).json({ 
        message: 'Access denied. You can only view your own orders.' 
      });
    }

    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err.message);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid order ID format' 
      });
    }
    
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

    // Validate status
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const order = await Order.findById(req.params.id)
      .populate('restaurant', 'name owner')
      .populate('user', 'name email')
      .populate('assignedTo', 'name');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check permissions
    const isOwner = order.user._id.toString() === req.user.id;
    const isRestaurantOwner = order.restaurant.owner && order.restaurant.owner.toString() === req.user.id;
    const isDeliveryPerson = order.assignedTo && order.assignedTo._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isRestaurantOwner && !isDeliveryPerson && !isAdmin) {
      return res.status(403).json({ 
        message: 'Access denied. You are not authorized to update this order.' 
      });
    }

    // Restaurant staff can only update from placed to confirmed, preparing, out_for_delivery
    if (isRestaurantOwner && ['placed', 'confirmed', 'preparing', 'out_for_delivery'].includes(status)) {
      // Allow update
    } 
    // Delivery person can only update to out_for_delivery and delivered
    else if (isDeliveryPerson && ['out_for_delivery', 'delivered'].includes(status)) {
      // Allow update
    }
    // Customer can only view, not update status
    else if (isOwner) {
      return res.status(403).json({ 
        message: 'Customers cannot update order status. Please contact the restaurant.' 
      });
    }
    // Admin can do anything
    else if (!isAdmin) {
      return res.status(403).json({ 
        message: 'You are not authorized to perform this status update.' 
      });
    }

    // Update order status
    order.status = status;
    
    // If delivered, set deliveredAt timestamp
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Emit real-time status update
    const io = req.app.get('io');
    io.to(order._id.toString()).emit('order_status_updated', {
      orderId: order._id,
      status: order.status,
      updatedAt: order.updatedAt,
      message: `Order status updated to: ${status}`
    });

    // Also notify restaurant room if status changed by delivery person
    if (isDeliveryPerson) {
      io.to(`restaurant_${order.restaurant._id}`).emit('order_status_updated', {
        orderId: order._id,
        status: order.status,
        updatedBy: req.user.name,
        message: `Delivery person updated status to: ${status}`
      });
    }

    res.json(order);
  } catch (err) {
    console.error('Error updating order status:', err.message);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid order ID format' 
      });
    }
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/orders/:id/assign
// @desc    Assign order to delivery person
// @access  Private
router.patch('/:id/assign', auth, async (req, res) => {
  try {
    const { deliveryPersonId } = req.body;

    if (!deliveryPersonId) {
      return res.status(400).json({ 
        message: 'Delivery person ID is required' 
      });
    }

    const order = await Order.findById(req.params.id)
      .populate('restaurant', 'name owner');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is restaurant owner or admin
    const isRestaurantOwner = order.restaurant.owner && order.restaurant.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isRestaurantOwner && !isAdmin) {
      return res.status(403).json({ 
        message: 'Access denied. Only restaurant owners or admins can assign orders.' 
      });
    }

    // Update assigned delivery person
    order.assignedTo = deliveryPersonId;
    await order.save();

    // Populate assignedTo for response
    await order.populate('assignedTo', 'name phone');

    // Emit assignment event
    const io = req.app.get('io');
    io.to(order._id.toString()).emit('order_assigned', {
      orderId: order._id,
      assignedTo: order.assignedTo,
      message: `Order assigned to delivery person: ${order.assignedTo.name}`
    });

    res.json(order);
  } catch (err) {
    console.error('Error assigning order:', err.message);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid ID format' 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/delivery/my-assignments
// @desc    Get orders assigned to current delivery person
// @access  Private
router.get('/delivery/my-assignments', auth, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_person') {
      return res.status(403).json({ 
        message: 'Access denied. Only delivery personnel can view assigned orders.' 
      });
    }

    const orders = await Order.find({ assignedTo: req.user.id })
      .populate('restaurant', 'name address phone')
      .populate('user', 'name phone deliveryAddress')
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error('Error fetching delivery assignments:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders
// @desc    Get all orders (admin only)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. Admin role required.' 
      });
    }

    const { page = 1, limit = 10, status } = req.query;
    
    // Build filter object
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .populate('restaurant', 'name')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error('Error fetching all orders:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Cancel an order
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is the order owner or admin
    const isOwner = order.user.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        message: 'Access denied. You can only cancel your own orders.' 
      });
    }

    // Check if order can be cancelled (only placed or confirmed orders)
    if (!['placed', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ 
        message: 'Order cannot be cancelled at this stage. Please contact support.' 
      });
    }

    // Update status to cancelled instead of deleting
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = req.user.id;
    
    await order.save();

    // Emit cancellation event
    const io = req.app.get('io');
    io.to(order._id.toString()).emit('order_cancelled', {
      orderId: order._id,
      status: order.status,
      cancelledBy: req.user.name,
      message: 'Order has been cancelled'
    });

    res.json({ 
      message: 'Order cancelled successfully', 
      order 
    });
  } catch (err) {
    console.error('Error cancelling order:', err.message);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid order ID format' 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;