// const mongoose = require('mongoose')
// const { MONGO_URI } = require('../config')

// module.exports = async () => {
//   try {
//     await mongoose.connect(MONGO_URI)
//     console.log('MongoDB connected')
//   } catch (e) {
//     console.log('MongoDB error:', e)
//     process.exit(1)
//   }
// }

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

export default async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
}