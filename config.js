require('dotenv').config();

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN is missing');
}

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is missing');
}

module.exports = {
  botToken: process.env.BOT_TOKEN,
  mongoUri: process.env.MONGO_URI,
};