import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId: Number,
  username: String,
  balance: { type: Number, default: 0 },
  isPremium: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

export default User; // <-- default