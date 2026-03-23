import 'dotenv/config';
import { Telegraf, Markup, session } from 'telegraf';
import connectDB from './database/db.js';
import User from './models/User.js';
import Message from './models/Message.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new Telegraf(BOT_TOKEN);

await connectDB();
bot.use(session());
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

// --- Вспомогательные функции ---

// Отправка или обновление кнопки "Входящие" с маркером 🔴
async function updateInboxButton(ctx) {
  const unreadCount = await Message.countDocuments({ type: 'text', readByAdmin: { $ne: true } });
  const text = `📥 Входящие${unreadCount ? ` 🔴 (${unreadCount})` : ''}`;

  if (ctx.session.inboxMessageId) {
    try {
      await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.inboxMessageId, undefined, text, {
        reply_markup: { inline_keyboard: [[{ text, callback_data: 'inbox' }]] }
      });
      return;
    } catch {
      // Если редактировать нельзя, просто отправляем новое
    }
  }

  const message = await ctx.reply(text, {
    reply_markup: { inline_keyboard: [[{ text, callback_data: 'inbox' }]] }
  });
  ctx.session.inboxMessageId = message.message_id;
}

// Главная клавиатура пользователя
function getMainKeyboard(ctx) {
  const buttons = [
    ['👤 Профиль', '💰 Баланс'],
    ['⚙️ Настройки', 'ℹ️ Помощь']
  ];

  if (ctx.from.id.toString() === ADMIN_ID) {
    buttons.push(['📊 Статистика', '👥 Пользователи']);
  }

  return Markup.keyboard(buttons).resize();
}

// --- Команды ---

bot.start(async (ctx) => {
  let user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    user = await User.create({ telegramId: ctx.from.id, username: ctx.from.username });
  }

  if (ctx.from.id.toString() === ADMIN_ID) {
    await updateInboxButton(ctx);
  }

  await ctx.reply('Выберите действие:', getMainKeyboard(ctx));
});

// Профиль
bot.hears('👤 Профиль', async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply('Нажми /start');

  ctx.reply(`
👤 Профиль
ID: ${user.telegramId}
Username: @${user.username || 'нет'}
Premium: ${user.isPremium ? 'Да ⭐' : 'Нет'}
`);
});

// Баланс
bot.hears('💰 Баланс', async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply('Нажми /start');
  ctx.reply(`💰 Баланс: ${user.balance || 0} ₽`);
});

// Настройки и помощь
bot.hears('⚙️ Настройки', (ctx) => ctx.reply('⚙️ Пока пусто'));
bot.hears('ℹ️ Помощь', (ctx) => ctx.reply('ℹ️ Это тестовый бот'));

// Статистика (для админа)
bot.hears('📊 Статистика', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const count = await User.countDocuments();
  ctx.reply(`📊 Пользователей: ${count}`);
});

// Список пользователей (для админа)
bot.hears('👥 Пользователи', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;

  const users = await User.find().limit(20);
  const buttons = users.map(u => [
    Markup.button.callback(
      `${u.username ? '@' + u.username : 'без username'} | ${u.telegramId}`,
      `user_${u.telegramId}`
    )
  ]);

  await ctx.reply('👥 Пользователи:', Markup.inlineKeyboard(buttons));
});

// --- Inline кнопки админа ---

// Клик на "Входящие"
bot.action('inbox', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const messages = await Message.find({ type: 'text', readByAdmin: { $ne: true } }).distinct('userId');

  if (!messages.length) return ctx.answerCbQuery('Нет новых сообщений');

  const buttons = messages.map(userId => [
    Markup.button.callback(
      `User ${userId}`,
      `user_${userId}`
    )
  ]);

  await ctx.reply('Выберите пользователя:', Markup.inlineKeyboard(buttons));
  ctx.answerCbQuery();
});

// Клик на конкретного пользователя
bot.action(/user_(\d+)/, async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;

  const userId = Number(ctx.match[1]);
  ctx.session.currentUserId = userId;

  // Отмечаем все сообщения как прочитанные
  await Message.updateMany({ userId, type: 'text', readByAdmin: { $ne: true } }, { $set: { readByAdmin: true } });
  await updateInboxButton(ctx);

  const messages = await Message.find({ userId }).sort({ date: 1 });
  if (!messages.length) return ctx.reply('Нет сообщений.');

  for (const msg of messages) {
    await ctx.reply(`${msg.type === 'admin' ? '🛠 Админ: ' : '👤 Пользователь: '}${msg.content}`);
  }

  await ctx.reply('❌ Завершить диалог', Markup.keyboard([['❌ Завершить диалог']]));
  ctx.answerCbQuery();
});

// Завершить диалог
bot.hears('❌ Завершить диалог', async (ctx) => {
  ctx.session.currentUserId = null;
  await ctx.reply('Диалог закрыт.', getMainKeyboard(ctx));
  if (ctx.from.id.toString() === ADMIN_ID) {
    await updateInboxButton(ctx);
  }
});

// --- Основной обработчик сообщений ---

bot.on('text', async (ctx) => {
  const isAdmin = ctx.from.id.toString() === ADMIN_ID;

  // Админ отвечает пользователю
  if (isAdmin && ctx.session.currentUserId) {
    const targetId = ctx.session.currentUserId;
    await bot.telegram.sendMessage(targetId, `💬 ${ctx.message.text}`);
    await Message.create({ userId: targetId, type: 'admin', content: ctx.message.text, date: new Date() });
    return;
  }

  // Пользователь пишет
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return;

  await Message.create({ userId: ctx.from.id, type: 'text', content: ctx.message.text, date: new Date(), readByAdmin: false });

  // Уведомление админу
  if (!isAdmin) {
    try {
      await updateInboxButton({ chat: { id: ADMIN_ID }, session: {} });
    } catch {}
  }
});

// --- Запуск бота ---
await bot.launch({ dropPendingUpdates: true });
console.log('✅ Bot started');