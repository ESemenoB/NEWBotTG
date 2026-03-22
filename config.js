// require('dotenv').config()

// module.exports = {
//   BOT_TOKEN: process.env.BOT_TOKEN,
//   // ADMIN_ID: Number(process.env.ADMIN_ID),
//   ADMIN_ID: process.env.ADMIN_ID,
//   MONGO_URI: process.env.MONGO_URI

// }

import 'dotenv/config';

const config = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  ADMIN_ID: process.env.ADMIN_ID,
  MONGO_URI: process.env.MONGO_URI
};

export default config;