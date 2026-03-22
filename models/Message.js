// const mongoose = require('mongoose')

// const messageSchema = new mongoose.Schema({
//   userId: Number,
//   type: String,
//   content: String,
//   fileId: String,
//   date: Date
// })

// module.exports = mongoose.model('Message', messageSchema)

import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'admin'],
    default: 'text'
  },
  content: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

export default Message; // ✅ Default экспорт