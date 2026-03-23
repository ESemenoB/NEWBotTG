import 'dotenv/config';
import { Telegraf, Markup, session } from 'telegraf';
import connectDB from './database/db.js';
import User from './models/User.js';
import Message from './models/Message.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new Telegraf(BOT_TOKEN);

// Подключение к БД
await connectDB();

// Сессии
bot.use(session());
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

// Получение клавиатуры выбора пользователя для админа
async function getAdminUsersKeyboard() {
  const users = await User.find().limit(50);
  const buttons = await Promise.all(
    users.map(async (u) => {
      const unread = await Message.countDocuments({ userId: u.telegramId, read: false, type: 'text' });
      const label = `${u.username ? '@' + u.username : 'без username'}${unread ? ` 🔴(${unread})` : ''}`;
      return [Markup.button.callback(label, `user_${u.telegramId}`)];
    })
  );
  return Markup.inlineKeyboard(buttons);
}

// Клавиатура главного меню для админа
async function getAdminMainKeyboard() {
  const hasUnread = await Message.exists({ read: false, type: 'text' });
  return Markup.keyboard([
    ['👤 Профиль', '💰 Баланс'],
    ['⚙️ Настройки', 'ℹ️ Помощь'],
    [hasUnread ? `📥 Входящие 🔴` : '📥 Входящие']
  ]).resize();
}

// Старт
bot.start(async (ctx) => {
  let user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    user = await User.create({
      telegramId: ctx.from.id,
      username: ctx.from.username
    });
  }

  if (ctx.from.id.toString() === ADMIN_ID) {
    await ctx.reply('Выберите действие:', await getAdminMainKeyboard());
  } else {
    await ctx.reply('Выберите действие:', Markup.keyboard([
      ['👤 Профиль', '💰 Баланс'],
      ['⚙️ Настройки', 'ℹ️ Помощь']
    ]).resize());
  }
});

// Админ нажимает "Входящие"
bot.hears(/📥 Входящие/, async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  ctx.session.currentUserId = null;

  const keyboard = await getAdminUsersKeyboard();
  await ctx.reply('Выберите пользователя:', keyboard);
});

// Открыть диалог с пользователем
bot.action(/user_(\d+)/, async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;

  const userId = ctx.match[1];
  ctx.session.currentUserId = userId;

  // Пометить все сообщения этого пользователя как прочитанные
  await Message.updateMany({ userId, read: false, type: 'text' }, { read: true });

  const messages = await Message.find({ userId }).sort({ date: 1 }).limit(50);
  if (!messages.length) {
    await ctx.reply('📭 Сообщений нет');
  } else {
    for (const msg of messages) {
      const text = msg.content?.trim() || '(пустое сообщение)';
      await ctx.reply(`${msg.type === 'admin' ? '🛠 ' : '👤 '}${text}`);
    }
  }

  await ctx.reply('❌ Завершить диалог');
  await ctx.answerCbQuery();
});

// Завершить диалог
bot.hears('❌ Завершить диалог', async (ctx) => {
  ctx.session.currentUserId = null;
  await ctx.reply('Диалог закрыт. Вернулись в главное меню:', await getAdminMainKeyboard());
});

// Обработка сообщений
bot.on('text', async (ctx) => {
  const isAdmin = ctx.from.id.toString() === ADMIN_ID;

  // Админ пишет в открытый диалог
  if (isAdmin && ctx.session.currentUserId) {
    const targetId = ctx.session.currentUserId;
    const textContent = ctx.message.text?.trim();
    if (textContent) {
      await bot.telegram.sendMessage(targetId, `💬 ${textContent}`);
      await Message.create({
        userId: targetId,
        type: 'admin',
        content: textContent,
        date: new Date()
      });
    }

    const keyboard = await getAdminUsersKeyboard();
    await ctx.reply('Выберите пользователя:', keyboard);
    return;
  }

  // Пользователь пишет
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return;

  const textContent = ctx.message.text?.trim() || '(пустое сообщение)';
  await Message.create({
    userId: ctx.from.id,
    type: 'text',
    content: textContent,
    date: new Date(),
    read: false
  });

  if (!isAdmin) {
    const unreadCount = await Message.countDocuments({ userId: ctx.from.id, read: false, type: 'text' });
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `📩 Новое сообщение от @${ctx.from.username || 'нет'}\nID: ${ctx.from.id}\nНепрочитанных сообщений: ${unreadCount}\n\n${textContent}`
    );
  }
});

// Автообновление кнопки "📥 Входящие" без спама
setInterval(async () => {
  if (!bot) return;
  try {
    const hasUnread = await Message.exists({ read: false, type: 'text' });
    await bot.telegram.sendMessage(
      ADMIN_ID,
      ' ', // пустой текст просто для обновления клавиатуры
      await getAdminMainKeyboard()
    );
  } catch (e) {
    // Игнорируем ошибки
  }
}, 10000);

// Запуск бота
await bot.launch({ dropPendingUpdates: true });
console.log('✅ Bot started');