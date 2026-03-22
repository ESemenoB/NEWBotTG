const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
  userId: Number,
  type: String,
  content: String,
  fileId: String,
  date: Date
})

module.exports = mongoose.model('Message', messageSchema)