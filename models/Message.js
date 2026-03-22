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
  userId: { type: String, required: true },
  type: { type: String, enum: ['text', 'admin'], default: 'text' },
  content: { type: String, default: '' },
  date: { type: Date, default: Date.now }
});

export default mongoose.model('Message', messageSchema);