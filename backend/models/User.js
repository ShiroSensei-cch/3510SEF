const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['customer', 'restaurant_owner', 'delivery_person'],
    default: 'customer'
  },
  address: {
    type: String
  },
  phone: {
    type: String
  },

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], 
      default: [0, 0]
    }
  },
  lastLocationUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

UserSchema.index({ location: '2dsphere' });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);