import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  userId: Number,
  type: { type: String, enum: ['text', 'admin'], default: 'text' },
  content: String,
  date: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

export default Message; // <-- ОБЯЗАТЕЛЬНО default