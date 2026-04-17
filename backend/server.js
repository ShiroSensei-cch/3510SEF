const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken'); // Add this for token verification
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/orders', require('./routes/orders'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'FoodApp API is running!' });
});

// ========== SOCKET.IO AUTHENTICATION MIDDLEWARE ==========
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: no token'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// ========== SOCKET.IO CONNECTION HANDLER ==========
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.userId}`);

  // Join order room for tracking
  socket.on('join_order', (orderId) => {
    socket.join(orderId);
    console.log(`Client ${socket.userId} joined order room: ${orderId}`);
  });

  // Update order status (restaurant/delivery person)
  socket.on('update_order_status', (data) => {
    io.to(data.orderId).emit('order_status_updated', data);
    console.log(`Order ${data.orderId} status updated to: ${data.status}`);
  });

  // ========== GPS LOCATION EVENTS ==========
  // Delivery person shares live location
  socket.on('update_location', async (data) => {
    const { orderId, lat, lng } = data;
    
    try {
      // Update user's location in database (optional)
      const User = require('./models/User');
      await User.findByIdAndUpdate(socket.userId, {
        'location.coordinates': [lng, lat],
        lastLocationUpdate: new Date()
      });
      
      // Broadcast location to customer tracking this order
      socket.to(orderId).emit('delivery_location_update', {
        orderId,
        lat,
        lng,
        timestamp: new Date()
      });
      
      console.log(`Location update for order ${orderId}: ${lat}, ${lng}`);
    } catch (err) {
      console.error('Error updating location:', err);
    }
  });

  // Delivery person starts tracking a specific order
  socket.on('start_delivery_tracking', (orderId) => {
    socket.join(`delivery_${orderId}`);
    console.log(`Delivery tracking started for order ${orderId} by user ${socket.userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.userId}`);
  });

  socket.on('order_taken', (data) => {
  socket.broadcast.emit('order_taken', data);
});
});

// Make io accessible to routes (for emitting from HTTP endpoints)
app.set('io', io);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.log('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend should connect to: http://localhost:${PORT}`);
});