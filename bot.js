import 'dotenv/config';
import { Telegraf, Markup, session } from 'telegraf';
import connectDB from './database/db.js';
import User from './models/User.js';
import Message from './models/Message.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new Telegraf(BOT_TOKEN);

// Подключаем сессию
bot.use(session());
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

async function startBot() {
  await connectDB();

  console.log('🚀 Запуск бота...');

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
      buttons.push(['📊 Статистика', '👥 Пользователи']);
    }

    await ctx.reply('Выберите действие:', Markup.keyboard(buttons).resize());
  });

  // 👤 Профиль
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

  // 💰 Баланс
  bot.hears('💰 Баланс', async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return ctx.reply('Нажми /start');
    ctx.reply(`💰 Баланс: ${user.balance} ₽`);
  });

  // ⚙️ Настройки
  bot.hears('⚙️ Настройки', (ctx) => ctx.reply('⚙️ Пока пусто'));

  // ℹ️ Помощь
  bot.hears('ℹ️ Помощь', (ctx) => ctx.reply('ℹ️ Это тестовый бот'));

  // 📊 Статистика
  bot.hears('📊 Статистика', async (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    const count = await User.countDocuments();
    ctx.reply(`📊 Пользователей: ${count}`);
  });

  // 👥 Пользователи
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

  // Открыть диалог
  bot.action(/user_(\d+)/, async (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    const userId = ctx.match[1];
    ctx.session.currentUserId = userId;
    await ctx.answerCbQuery();
    await ctx.reply(`💬 Открыт диалог с ID: ${userId}`, Markup.keyboard([['❌ Закрыть диалог']]).resize());

    const messages = await Message.find({ userId }).sort({ date: -1 }).limit(10);
    for (const msg of messages.reverse()) {
      await ctx.reply(`${msg.type === 'admin' ? '🛠 ' : '👤 '}${msg.content}`);
    }
  });

  // ❌ Закрыть диалог
  bot.hears('❌ Закрыть диалог', (ctx) => {
    ctx.session.currentUserId = null;
    ctx.reply('Диалог закрыт');
  });

  // Основной обработчик сообщений
  bot.on('text', async (ctx) => {
    const isAdmin = ctx.from.id.toString() === ADMIN_ID;

    // Админ отвечает пользователю
    if (isAdmin && ctx.session.currentUserId) {
      const targetId = ctx.session.currentUserId;
      await bot.telegram.sendMessage(targetId, `💬 ${ctx.message.text}`);
      await Message.create({
        userId: targetId,
        type: 'admin',
        content: ctx.message.text,
        date: new Date()
      });
      return;
    }

    // Пользователь пишет
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return;

    await Message.create({
      userId: ctx.from.id,
      type: 'text',
      content: ctx.message.text || '',
      date: new Date()
    });

    if (!isAdmin) {
      await bot.telegram.sendMessage(
        ADMIN_ID,
        `📩 Сообщение от @${ctx.from.username || 'нет'}\nID: ${ctx.from.id}\n\n${ctx.message.text || ''}`
      );
    }
  });

  await bot.launch({ dropPendingUpdates: true });
  console.log('✅ Bot started');
}

startBot();