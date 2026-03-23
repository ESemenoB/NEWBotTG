// import 'dotenv/config';
// import { Telegraf, Markup, session } from 'telegraf';
// import connectDB from './database/db.js';
// import User from './models/User.js';
// import Message from './models/Message.js';

// const BOT_TOKEN = process.env.BOT_TOKEN;
// const ADMIN_ID = process.env.ADMIN_ID;

// const bot = new Telegraf(BOT_TOKEN);
// await connectDB();

// // Подключаем сессию
// bot.use(session());
// bot.use((ctx, next) => {
//   if (!ctx.session) ctx.session = {};
//   return next();
// });

// // ----- Функция для обновления клавиатуры администратора -----
// async function updateAdminKeyboard() {
//   const adminId = ADMIN_ID;

//   // Получаем всех пользователей с непрочитанными сообщениями
//   const usersWithUnread = await Message.aggregate([
//     { $match: { type: 'text', read: { $ne: true } } },
//     { $group: { _id: '$userId', count: { $sum: 1 } } }
//   ]);

//   // Формируем кнопки
//   const keyboard = [
//     [
//       Markup.button.callback(
//         `📥 Входящие${usersWithUnread.length ? ` (${usersWithUnread.length})` : ''}`,
//         'inbox'
//       ),
//       '👤 Профиль'
//     ],
//     ['💰 Баланс', '⚙️ Настройки'],
//     ['ℹ️ Помощь']
//   ];

//   // Админские кнопки
//   keyboard.push(['📊 Статистика', '👥 Пользователи']);

//   await bot.telegram.sendMessage(adminId, 'Выберите действие:', Markup.keyboard(keyboard).resize());
// }

// // ----- Старт бота -----
// async function startBot() {
//   console.log('🚀 Запуск бота...');

//   // /start
//   bot.start(async (ctx) => {
//     let user = await User.findOne({ telegramId: ctx.from.id });
//     if (!user) {
//       user = await User.create({
//         telegramId: ctx.from.id,
//         username: ctx.from.username
//       });
//     }

//     const buttons = [
//       ['👤 Профиль', '💰 Баланс'],
//       ['⚙️ Настройки', 'ℹ️ Помощь']
//     ];

//     if (ctx.from.id.toString() === ADMIN_ID) {
//       buttons.push(['📊 Статистика', '👥 Пользователи']);
//     }

//     await ctx.reply('Выберите действие:', Markup.keyboard(buttons).resize());
//   });

//   // 👤 Профиль
//   bot.hears('👤 Профиль', async (ctx) => {
//     const user = await User.findOne({ telegramId: ctx.from.id });
//     if (!user) return ctx.reply('Нажми /start');

//     ctx.reply(`
// 👤 Профиль
// ID: ${user.telegramId}
// Username: @${user.username || 'нет'}
// Premium: ${user.isPremium ? 'Да ⭐' : 'Нет'}
// `);
//   });

//   // 💰 Баланс
//   bot.hears('💰 Баланс', async (ctx) => {
//     const user = await User.findOne({ telegramId: ctx.from.id });
//     if (!user) return ctx.reply('Нажми /start');
//     ctx.reply(`💰 Баланс: ${user.balance} ₽`);
//   });

//   // ⚙️ Настройки
//   bot.hears('⚙️ Настройки', (ctx) => ctx.reply('⚙️ Пока пусто'));

//   // ℹ️ Помощь
//   bot.hears('ℹ️ Помощь', (ctx) => ctx.reply('ℹ️ Это тестовый бот'));

//   // 📊 Статистика
//   bot.hears('📊 Статистика', async (ctx) => {
//     if (ctx.from.id.toString() !== ADMIN_ID) return;
//     const count = await User.countDocuments();
//     ctx.reply(`📊 Пользователей: ${count}`);
//   });

//   // 👥 Пользователи
//   bot.hears('👥 Пользователи', async (ctx) => {
//     if (ctx.from.id.toString() !== ADMIN_ID) return;
//     const users = await User.find().limit(20);

//     const buttons = users.map(u => [
//       Markup.button.callback(
//         `${u.username ? '@' + u.username : 'без username'} | ${u.telegramId}`,
//         `user_${u.telegramId}`
//       )
//     ]);

//     await ctx.reply('👥 Пользователи:', Markup.inlineKeyboard(buttons));
//   });

//   // ----- Входящие -----
//   bot.action('inbox', async (ctx) => {
//     const usersWithUnread = await Message.aggregate([
//       { $match: { type: 'text', read: { $ne: true } } },
//       { $group: { _id: '$userId', count: { $sum: 1 } } }
//     ]);

//     const buttons = usersWithUnread.map(u => [
//       Markup.button.callback(`ID: ${u._id} (${u.count})`, `user_${u._id}`)
//     ]);

//     if (buttons.length === 0) {
//       buttons.push([Markup.button.callback('Нет новых сообщений', 'empty')]);
//     }

//     await ctx.editMessageText('📥 Входящие сообщения:', Markup.inlineKeyboard(buttons));
//   });

//   // ----- Открытие диалога с пользователем -----
//   bot.action(/user_(\d+)/, async (ctx) => {
//     if (ctx.from.id.toString() !== ADMIN_ID) return;
//     const userId = ctx.match[1];
//     ctx.session.currentUserId = userId;
//     await ctx.answerCbQuery();

//     // Получаем последние 10 сообщений
//     const messages = await Message.find({ userId }).sort({ date: -1 }).limit(10);
//     for (const msg of messages.reverse()) {
//       await ctx.reply(`${msg.type === 'admin' ? '🛠 ' : '👤 '}${msg.content}`);
//     }

//     // Помечаем все сообщения как прочитанные
//     await Message.updateMany({ userId, type: 'text', read: false }, { $set: { read: true } });
//     await updateAdminKeyboard();
//   });

//   // ❌ Закрыть диалог
//   bot.hears('❌ Закрыть диалог', async (ctx) => {
//     ctx.session.currentUserId = null;
//     await updateAdminKeyboard();
//     ctx.reply('Диалог закрыт');
//   });

//   // ----- Обработка текста -----
//   bot.on('text', async (ctx) => {
//     const isAdmin = ctx.from.id.toString() === ADMIN_ID;

//     if (isAdmin && ctx.session.currentUserId) {
//       const targetId = ctx.session.currentUserId;
//       await bot.telegram.sendMessage(targetId, `💬 ${ctx.message.text}`);
//       await Message.create({
//         userId: targetId,
//         type: 'admin',
//         content: ctx.message.text,
//         date: new Date(),
//         read: true
//       });
//       return;
//     }

//     // Пользователь пишет
//     const user = await User.findOne({ telegramId: ctx.from.id });
//     if (!user) return;

//     await Message.create({
//       userId: ctx.from.id,
//       type: 'text',
//       content: ctx.message.text || '',
//       date: new Date(),
//       read: false
//     });

//     // Уведомляем админа и обновляем кнопку
//     await bot.telegram.sendMessage(
//       ADMIN_ID,
//       `📩 Новое сообщение от @${ctx.from.username || 'нет'} (ID: ${ctx.from.id})\n${ctx.message.text || ''}`
//     );

//     await updateAdminKeyboard();
//   });

//   await bot.launch({ dropPendingUpdates: true });
//   console.log('✅ Bot started');
// }

// startBot();

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

// Вспомогательная функция: обновление клавиатуры админа
async function updateAdminKeyboard(ctx = null) {
  const usersWithUnread = await Message.distinct('userId', { type: 'text', read: false });
  const users = await User.find().limit(20);

  const buttons = users.map(u => {
    const hasUnread = usersWithUnread.includes(u.telegramId);
    const text = `${u.username ? '@' + u.username : 'без username'}${hasUnread ? ' 🔴' : ''}`;
    return [Markup.button.callback(text, `user_${u.telegramId}`)];
  });

  const keyboard = Markup.inlineKeyboard(buttons);

  if (ctx) {
    // если вызван из callback_query, обновляем конкретное сообщение
    try {
      await ctx.editMessageReplyMarkup(keyboard.reply_markup);
    } catch {
      await ctx.reply('📥 Входящие', keyboard);
    }
  } else {
    // иначе просто возвращаем клавиатуру
    return keyboard;
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
    buttons.push(['📥 Входящие']); // кнопка входящие для админа
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

// 📥 Входящие (для админа)
bot.hears('📥 Входящие', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;

  const keyboard = await updateAdminKeyboard();
  await ctx.reply('📥 Входящие\n(нажми на пользователя)', keyboard);
});

// Обработка выбора пользователя админом
bot.action(/user_(\d+)/, async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const userId = ctx.match[1];
  ctx.session.currentUserId = userId;
  await ctx.answerCbQuery();

  const unreadMessages = await Message.find({ userId, type: 'text', read: false }).sort({ date: 1 });

  if (unreadMessages.length === 0) {
    await ctx.reply('📭 Новых сообщений нет');
  } else {
    for (const msg of unreadMessages) {
      await ctx.reply(`👤 ${msg.content}`);
    }

    // помечаем как прочитанные
    await Message.updateMany({ userId, type: 'text', read: false }, { $set: { read: true } });

    // обновляем клавиатуру
    await updateAdminKeyboard(ctx);
  }

  // добавляем кнопку "❌ Закрыть диалог"
  await ctx.reply('Вы находитесь в диалоге с пользователем', Markup.keyboard([['❌ Закрыть диалог']]).resize());
});

// // ❌ Закрыть диалог
// bot.hears('❌ Закрыть диалог', async (ctx) => {
//   ctx.session.currentUserId = null;

//   const buttons = [
//     ['👤 Профиль', '💰 Баланс'],
//     ['⚙️ Настройки', 'ℹ️ Помощь']
//   ];
//   if (ctx.from.id.toString() === ADMIN_ID) {
//     buttons.push(['📥 Входящие']);
//     const keyboard = await updateAdminKeyboard();
//     await ctx.reply('Диалог закрыт', keyboard);
//   } else {
//     await ctx.reply('Диалог закрыт', Markup.keyboard(buttons).resize());
//   }
// });

// ❌ Закрыть диалог
bot.hears('❌ Закрыть диалог', async (ctx) => {
  ctx.session.currentUserId = null;

  const baseButtons = [
    ['👤 Профиль', '💰 Баланс'],
    ['⚙️ Настройки', 'ℹ️ Помощь']
  ];

  if (ctx.from.id.toString() === ADMIN_ID) {
    // Проверяем наличие непрочитанных сообщений
    const usersWithUnread = await Message.distinct('userId', { type: 'text', read: false });
    const inboxButton = ['📥 Входящие' + (usersWithUnread.length ? ' 🔴' : '')];
    baseButtons.push(inboxButton);
  }

  await ctx.reply('Диалог закрыт', Markup.keyboard(baseButtons).resize());
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

    // обновляем клавиатуру админа
    await updateAdminKeyboard(ctx);
    return;
  }

  // Пользователь пишет
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return;

  await Message.create({
    userId: ctx.from.id,
    type: 'text',
    content: ctx.message.text || '',
    date: new Date(),
    read: false
  });

  // уведомление админа
  if (!isAdmin) {
    const unreadCount = await Message.countDocuments({ type: 'text', read: false });
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `📩 Новое сообщение от @${ctx.from.username || 'нет'}\nID: ${ctx.from.id}\nВсего непрочитанных: ${unreadCount}`
    );
  }
});

await bot.launch({ dropPendingUpdates: true });
console.log('✅ Bot started');