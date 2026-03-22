const mongoose = require('mongoose')
const { MONGO_URI } = require('../config')

module.exports = async () => {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('MongoDB connected')
  } catch (e) {
    console.log('MongoDB error:', e)
    process.exit(1)
  }
}