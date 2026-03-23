import 'dotenv/config';
import { Telegraf, Markup, session } from 'telegraf';
import connectDB from './database/db.js';
import User from './models/User.js';
import Message from './models/Message.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new Telegraf(BOT_TOKEN);

// Подключаемся к БД
await connectDB();

// Подключаем сессию
bot.use(session());
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

// Формируем клавиатуру админа
async function getAdminKeyboard(currentUserId = null) {
  // Список пользователей с непрочитанными сообщениями
  const unreadAggregation = await Message.aggregate([
    { $match: { type: 'text', readByAdmin: { $ne: true } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]);

  const unreadMap = {};
  for (const u of unreadAggregation) unreadMap[u._id] = u.count;

  // Получаем всех пользователей
  const users = await User.find().sort({ telegramId: 1 });
  const buttons = users.map(u => {
    const count = unreadMap[u.telegramId] || 0;
    const label = `${u.username ? '@' + u.username : 'User ' + u.telegramId}` + (count ? ` 🔴(${count})` : '');
    return [Markup.button.callback(label, `user_${u.telegramId}`)];
  });

  // Основная клавиатура
  const mainButtons = [
    ['👤 Профиль', '💰 Баланс'],
    ['⚙️ Настройки', 'ℹ️ Помощь']
  ];

  return currentUserId ? Markup.inlineKeyboard(buttons.concat([[Markup.button.callback('❌ Завершить диалог', 'close_dialog')]])) :
    Markup.keyboard(mainButtons).resize();
}

// Обновляем кнопку “Входящие” с маркером
async function updateInboxButton(ctx) {
  try {
    const keyboard = await getAdminKeyboard(ctx.session.currentUserId);
    if (ctx.session.lastMessageId) {
      await ctx.telegram.editMessageReplyMarkup(
        ADMIN_ID,
        ctx.session.lastMessageId,
        undefined,
        keyboard.reply_markup
      );
    } else {
      const sent = await ctx.reply('📥 Входящие (нажми на пользователя)', keyboard);
      ctx.session.lastMessageId = sent.message_id;
    }
  } catch (err) {
    console.error('Ошибка обновления клавиатуры:', err.description || err.message);
  }
}

// /start
bot.start(async (ctx) => {
  if (ctx.from.id.toString() === ADMIN_ID) {
    ctx.session.currentUserId = null;
    await updateInboxButton(ctx);
    return;
  }

  let user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    user = await User.create({ telegramId: ctx.from.id, username: ctx.from.username });
  }

  const buttons = [
    ['👤 Профиль', '💰 Баланс'],
    ['⚙️ Настройки', 'ℹ️ Помощь']
  ];
  await ctx.reply('Выберите действие:', Markup.keyboard(buttons).resize());
});

// Админ выбирает пользователя
bot.action(/user_(\d+)/, async (ctx) => {
  const userId = ctx.match[1];
  ctx.session.currentUserId = userId;

  // Отмечаем все сообщения как прочитанные
  await Message.updateMany({ userId, type: 'text', readByAdmin: { $ne: true } }, { $set: { readByAdmin: true } });

  const user = await User.findOne({ telegramId: userId });
  const messages = await Message.find({ userId }).sort({ date: 1 });

  if (!messages.length) {
    await ctx.reply(`💬 Диалог с ${user.username || 'User ' + userId} пуст`);
  } else {
    for (const msg of messages) {
      await ctx.reply(`${msg.type === 'admin' ? '🛠 Админ: ' : '👤 Пользователь: '}${msg.content}`);
    }
  }

  await updateInboxButton(ctx);
});

// Закрыть диалог
bot.action('close_dialog', async (ctx) => {
  ctx.session.currentUserId = null;
  await updateInboxButton(ctx);
});

// Пользователь пишет сообщение
bot.on('text', async (ctx) => {
  if (ctx.from.id.toString() === ADMIN_ID) {
    // Админ пишет
    const targetId = ctx.session.currentUserId;
    if (!targetId) return;
    await bot.telegram.sendMessage(targetId, `💬 ${ctx.message.text}`);
    await Message.create({ userId: targetId, type: 'admin', content: ctx.message.text, date: new Date() });
    await updateInboxButton(ctx);
    return;
  }

  // Пользователь пишет
  let user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return;
  await Message.create({ userId: ctx.from.id, type: 'text', content: ctx.message.text, date: new Date(), readByAdmin: false });

  // Уведомление админу
  await updateInboxButton({ session: { lastMessageId: null, currentUserId: null } });
  await bot.telegram.sendMessage(
    ADMIN_ID,
    `📩 Сообщение от @${ctx.from.username || 'User ' + ctx.from.id}:\n${ctx.message.text}`
  );
});

// Основная клавиатура для профиля/баланса
bot.hears('👤 Профиль', async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply('Нажми /start');

  ctx.reply(`👤 Профиль\nID: ${user.telegramId}\nUsername: @${user.username || 'нет'}\nPremium: ${user.isPremium ? 'Да ⭐' : 'Нет'}`);
});

bot.hears('💰 Баланс', async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply('Нажми /start');
  ctx.reply(`💰 Баланс: ${user.balance} ₽`);
});

bot.hears('⚙️ Настройки', (ctx) => ctx.reply('⚙️ Пока пусто'));
bot.hears('ℹ️ Помощь', (ctx) => ctx.reply('ℹ️ Это тестовый бот'));

await bot.launch({ dropPendingUpdates: true });
console.log('✅ Bot started');