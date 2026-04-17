const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'placed'
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  // GPS coordinates for the delivery address (for map display)
  deliveryCoordinates: {
    type: [Number], // [longitude, latitude]
    default: null
  },
  // Delivery person assigned to this order
  assignedDeliveryPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Timestamps for delivery completion and cancellation
  deliveredAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries on status and restaurant
OrderSchema.index({ status: 1 });
OrderSchema.index({ restaurant: 1 });
OrderSchema.index({ user: 1 });
OrderSchema.index({ assignedDeliveryPerson: 1 });

module.exports = mongoose.model('Order', OrderSchema);