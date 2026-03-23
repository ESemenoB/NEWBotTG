import 'dotenv/config';
import { Telegraf, Markup, session } from 'telegraf';
import connectDB from './database/db.js';
import User from './models/User.js';
import Message from './models/Message.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new Telegraf(BOT_TOKEN);

await connectDB();

// Подключаем сессию
bot.use(session());
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

// Функция для обновления кнопки "Входящие" с индикатором непрочитанных
async function updateInboxButton(ctx) {
  const unreadCounts = await Message.aggregate([
    { $match: { type: 'text', readByAdmin: { $ne: true } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]);
  const totalUnread = unreadCounts.reduce((acc, u) => acc + u.count, 0);
  const hasUnread = totalUnread > 0;

  // Обновляем клавиатуру главного меню админа
  const buttons = [
    [`👤 Профиль`, `💰 Баланс`],
    [`⚙️ Настройки`, `ℹ️ Помощь`],
    [`📥 Входящие${hasUnread ? ` 🔴 (${totalUnread})` : ''}`]
  ];

  await ctx.editMessageReplyMarkup(Markup.keyboard(buttons).resize());
}

// Главная клавиатура для всех
function getMainKeyboard(isAdmin) {
  const buttons = [
    ['👤 Профиль', '💰 Баланс'],
    ['⚙️ Настройки', 'ℹ️ Помощь']
  ];
  if (isAdmin) buttons.push(['📥 Входящие 🔴']);
  return Markup.keyboard(buttons).resize();
}

// /start
bot.start(async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    await User.create({ telegramId: ctx.from.id, username: ctx.from.username });
  }

  const isAdmin = ctx.from.id.toString() === ADMIN_ID;
  await ctx.reply('Выберите действие:', getMainKeyboard(isAdmin));
});

// Основной обработчик админа для входящих
bot.hears(/📥 Входящие/, async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const usersWithUnread = await Message.aggregate([
    { $match: { type: 'text', readByAdmin: { $ne: true } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]);

  if (!usersWithUnread.length) {
    await ctx.reply('📭 Нет новых сообщений', getMainKeyboard(true));
    return;
  }

  const users = await User.find({ telegramId: { $in: usersWithUnread.map(u => u._id) } });
  const buttons = users.map(u => {
    const unread = usersWithUnread.find(x => x._id === u.telegramId)?.count || 0;
    return [Markup.button.callback(`${u.username || 'без username'} (${u.telegramId}) ${unread ? `🔴 ${unread}` : ''}`, `user_${u.telegramId}`)];
  });

  await ctx.reply('📩 Выберите пользователя:', Markup.inlineKeyboard(buttons));
});

// Открыть диалог с пользователем
bot.action(/user_(\d+)/, async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const userId = parseInt(ctx.match[1]);
  ctx.session.currentUserId = userId;

  // Отмечаем все сообщения как прочитанные
  await Message.updateMany({ userId, type: 'text', readByAdmin: { $ne: true } }, { $set: { readByAdmin: true } });

  const messages = await Message.find({ userId }).sort({ date: -1 }).limit(20);
  if (!messages.length) {
    await ctx.reply('Сообщений нет', getMainKeyboard(true));
    return;
  }

  for (const msg of messages.reverse()) {
    await ctx.reply(`${msg.type === 'admin' ? '🛠 ' : '👤 '}${msg.content}`);
  }

  // Кнопка закрытия диалога
  await ctx.reply('Диалог открыт', Markup.keyboard([['❌ Завершить диалог']]).resize());
});

// Закрыть диалог
bot.hears('❌ Завершить диалог', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  ctx.session.currentUserId = null;
  await ctx.reply('Диалог закрыт', getMainKeyboard(true));
});

// Пользователь пишет сообщение
bot.on('text', async (ctx) => {
  const isAdmin = ctx.from.id.toString() === ADMIN_ID;
  const userId = ctx.from.id;

  if (!isAdmin) {
    await Message.create({ userId, type: 'text', content: ctx.message.text, date: new Date() });
    // Уведомление админу
    await bot.telegram.sendMessage(ADMIN_ID, `📩 Сообщение от @${ctx.from.username || 'нет'} (ID: ${userId})\n${ctx.message.text}`);
  } else {
    // Админ отвечает текущему пользователю
    if (ctx.session.currentUserId) {
      const targetId = ctx.session.currentUserId;
      await bot.telegram.sendMessage(targetId, `💬 ${ctx.message.text}`);
      await Message.create({ userId: targetId, type: 'admin', content: ctx.message.text, date: new Date() });
    }
  }

  // Обновляем кнопку входящие
  if (isAdmin) await updateInboxButton(ctx);
});

await bot.launch({ dropPendingUpdates: true });
console.log('✅ Bot started');