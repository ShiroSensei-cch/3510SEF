const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function resetPassword() {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = 'pizza.owner@example.com';
  const newPassword = 'owner123';
  const hashed = await bcrypt.hash(newPassword, 10);
  const result = await User.updateOne({ email }, { $set: { password: hashed } });
  console.log(result.modifiedCount > 0 ? 'Password updated' : 'User not found');
  process.exit();
}
resetPassword();