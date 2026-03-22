const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const connectDB = require('./db');

// подключаем БД
connectDB();

// создаём бота
const bot = new TelegramBot(config.botToken, { polling: true });

console.log('🚀 Бот запущен');

// пример команды
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Бот работает ✅');
});