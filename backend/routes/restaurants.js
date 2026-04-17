const express = require('express');
const Restaurant = require('../models/Restaurant');
const Menu = require('../models/Menu');
const auth = require('../middleware/auth');
const router = express.Router();

// ========== STATIC ROUTES (must come before dynamic /:id) ==========

// @route   GET /api/restaurants/my-restaurant
// @desc    Get the restaurant owned by the logged-in user
// @access  Private (restaurant_owner only)
router.get('/my-restaurant', auth, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant_owner') {
      return res.status(403).json({ message: 'Access denied. Restaurant owner role required.' });
    }
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (!restaurant) {
      return res.status(404).json({ message: 'You don’t own any restaurant yet' });
    }
    res.json(restaurant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/restaurants
// @desc    Get all active restaurants (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ isActive: true });
    res.json(restaurants);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/restaurants
// @desc    Create a new restaurant (restaurant_owner only)
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant_owner') {
      return res.status(403).json({ message: 'Access denied. Only restaurant owners can create restaurants.' });
    }
    const { name, description, address, phone, cuisine, deliveryTime, rating, image } = req.body;
    const restaurant = new Restaurant({
      name,
      description,
      address,
      phone,
      cuisine,
      deliveryTime,
      rating,
      image,
      owner: req.user.id
    });
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== DYNAMIC ROUTES (must come after static routes) ==========

// @route   GET /api/restaurants/:id
// @desc    Get single restaurant with its menu
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    const menu = await Menu.find({ restaurant: req.params.id, isAvailable: true });
    res.json({ restaurant, menu });
  } catch (err) {
    console.error(err.message);
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid restaurant ID format' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/restaurants/:id
// @desc    Update a restaurant (owner only)
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    
    // Check ownership
    if (restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Not your restaurant.' });
    }
    
    const updated = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/restaurants/:id
// @desc    Delete a restaurant (owner only)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    
    if (restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Not your restaurant.' });
    }
    
    // Soft delete (set isActive = false) instead of actual removal
    restaurant.isActive = false;
    await restaurant.save();
    res.json({ message: 'Restaurant deactivated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;