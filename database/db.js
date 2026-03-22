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

const MONGO_URI = process.env.MONGO_URI;

async function connectDB() {
  if (!MONGO_URI) throw new Error('MONGO_URI is undefined'); // <-- проверка
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }
}

export default connectDB;