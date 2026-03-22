// const mongoose = require('mongoose')

// const userSchema = new mongoose.Schema({
//   telegramId: Number,
//   username: String,

//   balance: { type: Number, default: 0 },
//   isPremium: { type: Boolean, default: false },

//   // 🔥 CRM
//   status: { type: String, default: 'new' },
//   tags: [String],
//   dealAmount: { type: Number, default: 0 }

// }, { timestamps: true })

// module.exports = mongoose.model('User', userSchema)

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  username: { type: String },
  balance: { type: Number, default: 0 },
  isPremium: { type: Boolean, default: false }
});

export default mongoose.model('User', userSchema);