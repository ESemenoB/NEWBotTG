import 'dotenv/config';
import { Telegraf, Markup, session } from 'telegraf';
import connectDB from './database/db.js';
import User from './models/User.js';
import Message from './models/Message.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new Telegraf(BOT_TOKEN);

// Подключаем БД
await connectDB();

// Сессия
bot.use(session());
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

// Вспомогательная функция для клавиатуры админа
async function updateInboxButton(ctx) {
  const unreadCounts = await Message.aggregate([
    { $match: { type: 'text', readByAdmin: { $ne: true } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]);

  const usersWithUnread = unreadCounts.map(u => u._id.toString());

  const users = await User.find().limit(20);
  const buttons = users.map(u => {
    const hasUnread = usersWithUnread.includes(u.telegramId.toString());
    const label = `${hasUnread ? '🔴 ' : ''}${u.username || 'User ' + u.telegramId}`;
    return [Markup.button.callback(label, `user_${u.telegramId}`)];
  });

  if (ctx && ctx.chat && ctx.chat.id) {
    try {
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(buttons));
    } catch (e) {
      // Игнорируем ошибки редактирования, если сообщение старое
    }
  }
}

// /start
bot.start(async (ctx) => {
  let user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    user = await User.create({
      telegramId: ctx.from.id,
      username: ctx.from.username
    });
  }

  const buttons = [
    ['👤 Профиль', '💰 Баланс'],
    ['⚙️ Настройки', 'ℹ️ Помощь']
  ];

  if (ctx.from.id.toString() === ADMIN_ID) {
    buttons.push(['📥 Входящие', '👥 Пользователи', '📊 Статистика']);
  }

  await ctx.reply('Выберите действие:', Markup.keyboard(buttons).resize());
});

// Кнопка «Входящие»
bot.hears('📥 Входящие', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;

  const unreadCounts = await Message.aggregate([
    { $match: { type: 'text', readByAdmin: { $ne: true } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]);

  const usersWithUnread = unreadCounts.map(u => u._id.toString());
  const users = await User.find().limit(20);

  const buttons = users.map(u => {
    const hasUnread = usersWithUnread.includes(u.telegramId.toString());
    const label = `${hasUnread ? '🔴 ' : ''}${u.username || 'User ' + u.telegramId}`;
    return [Markup.button.callback(label, `user_${u.telegramId}`)];
  });

  await ctx.reply('Выберите пользователя:', Markup.inlineKeyboard(buttons));
});

// Выбор пользователя
bot.action(/user_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery(); // важно сразу

  const userId = ctx.match[1];
  ctx.session.currentUserId = userId;

  const user = await User.findOne({ telegramId: userId });

  // Отмечаем все сообщения как прочитанные
  await Message.updateMany(
    { userId, type: 'text', readByAdmin: { $ne: true } },
    { $set: { readByAdmin: true } }
  );

  const messages = await Message.find({ userId }).sort({ date: 1 });

  if (!messages.length) {
    await ctx.reply(`💬 Диалог с ${user.username || 'User ' + userId} пуст`);
  } else {
    for (const msg of messages) {
      await ctx.reply(`${msg.type === 'admin' ? '🛠 Админ: ' : '👤 Пользователь: '}${msg.content}`);
    }
  }

  // Добавляем кнопку «Закрыть диалог»
  await ctx.reply('❌ Закрыть диалог', Markup.keyboard([['❌ Закрыть диалог']]).resize());
  await updateInboxButton(ctx);
});

// Закрыть диалог
bot.hears('❌ Закрыть диалог', async (ctx) => {
  ctx.session.currentUserId = null;

  const buttons = [
    ['👤 Профиль', '💰 Баланс'],
    ['⚙️ Настройки', 'ℹ️ Помощь']
  ];

  if (ctx.from.id.toString() === ADMIN_ID) {
    buttons.push(['📥 Входящие', '👥 Пользователи', '📊 Статистика']);
  }

  await ctx.reply('Выберите действие:', Markup.keyboard(buttons).resize());
});

// Текстовые сообщения
bot.on('text', async (ctx) => {
  const isAdmin = ctx.from.id.toString() === ADMIN_ID;

  if (isAdmin && ctx.session.currentUserId) {
    const targetId = ctx.session.currentUserId;

    await bot.telegram.sendMessage(targetId, `💬 ${ctx.message.text}`);

    await Message.create({
      userId: targetId,
      type: 'admin',
      content: ctx.message.text,
      date: new Date()
    });

    // Обновляем маркеры входящих
    await updateInboxButton(ctx);
    return;
  }

  // Сообщение от пользователя
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return;

  await Message.create({
    userId: ctx.from.id,
    type: 'text',
    content: ctx.message.text || '',
    date: new Date(),
    readByAdmin: false
  });

  // Уведомление админу
  await bot.telegram.sendMessage(
    ADMIN_ID,
    `📩 Сообщение от @${ctx.from.username || 'нет'}\nID: ${ctx.from.id}\n\n${ctx.message.text || ''}`
  );

  await updateInboxButton(ctx);
});

await bot.launch({ dropPendingUpdates: true });
console.log('✅ Bot started');