// import 'dotenv/config';
// import { Telegraf, Markup, session } from 'telegraf';
// import connectDB from './database/db.js';
// import User from './models/User.js';
// import Message from './models/Message.js';

// const BOT_TOKEN = process.env.BOT_TOKEN;
// const ADMIN_ID = process.env.ADMIN_ID;

// const bot = new Telegraf(BOT_TOKEN);

// await connectDB();

// // 🔥 глобальные переменные
// let inboxMessageId = null;
// let lastActiveChat = null;

// // session
// bot.use(session());
// bot.use((ctx, next) => {
//   if (!ctx.session) ctx.session = {};
//   return next();
// });

// // 🔹 клавиатуры
// function mainKeyboard(ctx) {
//   const buttons = [
//     ['👤 Профиль', '💰 Баланс'],
//     ['⚙️ Настройки', 'ℹ️ Помощь']
//   ];

//   if (ctx.from.id.toString() === ADMIN_ID) {
//     buttons.push(['📊 Статистика', '📥 Входящие']);
//   }

//   return Markup.keyboard(buttons).resize();
// }

// function dialogKeyboard() {
//   return Markup.keyboard([['❌ Закрыть диалог']]).resize();
// }

// // 🔥 получить пользователей с unread
// async function getUsersWithUnread() {
//   const users = await User.find();
//   const result = [];

//   for (const user of users) {
//     const unread = await Message.countDocuments({
//       userId: user.telegramId,
//       type: 'text',
//       readByAdmin: false
//     });

//     result.push({ user, unread });
//   }

//   return result.sort((a, b) => b.unread - a.unread);
// }

// // 🔥 inbox (real-time)
// async function showInbox() {
//   const users = await getUsersWithUnread();

//   if (!users.length) return;

//   const buttons = users.map(({ user, unread }) => {
//     const status = unread > 0 ? '🔴' : '⚪';
//     const text = `${status} ${user.username ? '@' + user.username : 'ID:' + user.telegramId} (${unread})`;

//     return [Markup.button.callback(text, `user_${user.telegramId}`)];
//   });

//   const text = '📥 Входящие (нажми для ответа):';

//   try {
//     if (inboxMessageId) {
//       await bot.telegram.editMessageText(
//         ADMIN_ID,
//         inboxMessageId,
//         null,
//         text,
//         Markup.inlineKeyboard(buttons)
//       );
//     } else {
//       const msg = await bot.telegram.sendMessage(
//         ADMIN_ID,
//         text,
//         Markup.inlineKeyboard(buttons)
//       );

//       inboxMessageId = msg.message_id;

//       // 📌 закрепляем
//       await bot.telegram.pinChatMessage(ADMIN_ID, inboxMessageId);
//     }
//   } catch (e) {
//     const msg = await bot.telegram.sendMessage(
//       ADMIN_ID,
//       text,
//       Markup.inlineKeyboard(buttons)
//     );
//     inboxMessageId = msg.message_id;
//   }
// }

// // 🚀 START
// bot.start(async (ctx) => {
//   let user = await User.findOne({ telegramId: ctx.from.id });

//   if (!user) {
//     user = await User.create({
//       telegramId: ctx.from.id,
//       username: ctx.from.username
//     });
//   }

//   await ctx.reply('Выберите действие:', mainKeyboard(ctx));
// });

// // 📥 открыть inbox
// bot.hears('📥 Входящие', async (ctx) => {
//   if (ctx.from.id.toString() !== ADMIN_ID) return;
//   await showInbox();
// });

// // 💬 открыть диалог
// bot.action(/user_(\d+)/, async (ctx) => {
//   if (ctx.from.id.toString() !== ADMIN_ID) return;

//   const userId = ctx.match[1];
//   ctx.session.currentUserId = userId;
//   lastActiveChat = userId;

//   await ctx.answerCbQuery();
//   await ctx.reply(`💬 Диалог с ${userId}`, dialogKeyboard());

//   const messages = await Message.find({ userId })
//     .sort({ date: -1 })
//     .limit(10);

//   for (const msg of messages.reverse()) {
//     await ctx.reply(`${msg.type === 'admin' ? '🛠 ' : '👤 '}${msg.content}`);
//   }

//   // ✅ прочитано
//   await Message.updateMany(
//     { userId, type: 'text' },
//     { readByAdmin: true }
//   );

//   await showInbox();
// });

// // ❌ закрыть диалог
// bot.hears('❌ Закрыть диалог', async (ctx) => {
//   ctx.session.currentUserId = null;

//   await ctx.reply('Диалог закрыт', mainKeyboard(ctx));
//   await showInbox();
// });

// // ⚡ быстрый возврат
// bot.command('last', async (ctx) => {
//   if (ctx.from.id.toString() !== ADMIN_ID) return;

//   if (!lastActiveChat) {
//     return ctx.reply('Нет активного диалога');
//   }

//   ctx.session.currentUserId = lastActiveChat;
//   ctx.reply(`💬 Возврат к ${lastActiveChat}`, dialogKeyboard());
// });

// // 📊 статистика
// bot.hears('📊 Статистика', async (ctx) => {
//   if (ctx.from.id.toString() !== ADMIN_ID) return;

//   const count = await User.countDocuments();
//   ctx.reply(`📊 Пользователей: ${count}`);
// });

// // 👤 профиль
// bot.hears('👤 Профиль', async (ctx) => {
//   const user = await User.findOne({ telegramId: ctx.from.id });
//   if (!user) return ctx.reply('Нажми /start');

//   ctx.reply(`
// 👤 Профиль
// ID: ${user.telegramId}
// Username: @${user.username || 'нет'}
// `);
// });

// // 💰 баланс
// bot.hears('💰 Баланс', async (ctx) => {
//   const user = await User.findOne({ telegramId: ctx.from.id });
//   if (!user) return ctx.reply('Нажми /start');

//   ctx.reply(`💰 Баланс: ${user.balance || 0} ₽`);
// });

// // 🔥 основной обработчик
// bot.on('text', async (ctx) => {
//   const isAdmin = ctx.from.id.toString() === ADMIN_ID;

//   // админ отвечает
//   if (isAdmin && ctx.session.currentUserId) {
//     const targetId = ctx.session.currentUserId;

//     await bot.telegram.sendMessage(targetId, `💬 ${ctx.message.text}`);

//     await Message.create({
//       userId: targetId,
//       type: 'admin',
//       content: ctx.message.text,
//       date: new Date()
//     });

//     return;
//   }

//   // пользователь пишет
//   const user = await User.findOne({ telegramId: ctx.from.id });
//   if (!user) return;

//   await Message.create({
//     userId: ctx.from.id,
//     type: 'text',
//     content: ctx.message.text,
//     date: new Date(),
//     readByAdmin: false
//   });

//   // 🔔 уведомление админу
//   if (!isAdmin) {
//     const unread = await Message.countDocuments({
//       userId: ctx.from.id,
//       readByAdmin: false
//     });

//     await bot.telegram.sendMessage(
//       ADMIN_ID,
//       `🔔 Новое сообщение\n@${ctx.from.username || 'нет'} (${ctx.from.id})\nНовых: ${unread}\n\n${ctx.message.text}`
//     );

//     await showInbox();
//   }

//   // вернуть клавиатуру пользователю
//   if (!isAdmin) {
//     await ctx.reply('Выберите действие:', mainKeyboard(ctx));
//   }
// });

// // 🚀 запуск
// await bot.launch({ dropPendingUpdates: true });
// console.log('✅ Bot started');


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

// ----- Функция для обновления клавиатуры администратора -----
async function updateAdminKeyboard() {
  const adminId = ADMIN_ID;

  // Получаем всех пользователей с непрочитанными сообщениями
  const usersWithUnread = await Message.aggregate([
    { $match: { type: 'text', read: { $ne: true } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]);

  // Формируем кнопки
  const keyboard = [
    [
      Markup.button.callback(
        `📥 Входящие${usersWithUnread.length ? ` (${usersWithUnread.length})` : ''}`,
        'inbox'
      ),
      '👤 Профиль'
    ],
    ['💰 Баланс', '⚙️ Настройки'],
    ['ℹ️ Помощь']
  ];

  // Админские кнопки
  keyboard.push(['📊 Статистика', '👥 Пользователи']);

  await bot.telegram.sendMessage(adminId, 'Выберите действие:', Markup.keyboard(keyboard).resize());
}

// ----- Старт бота -----
async function startBot() {
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

  // ----- Входящие -----
  bot.action('inbox', async (ctx) => {
    const usersWithUnread = await Message.aggregate([
      { $match: { type: 'text', read: { $ne: true } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);

    const buttons = usersWithUnread.map(u => [
      Markup.button.callback(`ID: ${u._id} (${u.count})`, `user_${u._id}`)
    ]);

    if (buttons.length === 0) {
      buttons.push([Markup.button.callback('Нет новых сообщений', 'empty')]);
    }

    await ctx.editMessageText('📥 Входящие сообщения:', Markup.inlineKeyboard(buttons));
  });

  // ----- Открытие диалога с пользователем -----
  bot.action(/user_(\d+)/, async (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    const userId = ctx.match[1];
    ctx.session.currentUserId = userId;
    await ctx.answerCbQuery();

    // Получаем последние 10 сообщений
    const messages = await Message.find({ userId }).sort({ date: -1 }).limit(10);
    for (const msg of messages.reverse()) {
      await ctx.reply(`${msg.type === 'admin' ? '🛠 ' : '👤 '}${msg.content}`);
    }

    // Помечаем все сообщения как прочитанные
    await Message.updateMany({ userId, type: 'text', read: false }, { $set: { read: true } });
    await updateAdminKeyboard();
  });

  // ❌ Закрыть диалог
  bot.hears('❌ Закрыть диалог', async (ctx) => {
    ctx.session.currentUserId = null;
    await updateAdminKeyboard();
    ctx.reply('Диалог закрыт');
  });

  // ----- Обработка текста -----
  bot.on('text', async (ctx) => {
    const isAdmin = ctx.from.id.toString() === ADMIN_ID;

    if (isAdmin && ctx.session.currentUserId) {
      const targetId = ctx.session.currentUserId;
      await bot.telegram.sendMessage(targetId, `💬 ${ctx.message.text}`);
      await Message.create({
        userId: targetId,
        type: 'admin',
        content: ctx.message.text,
        date: new Date(),
        read: true
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
      date: new Date(),
      read: false
    });

    // Уведомляем админа и обновляем кнопку
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `📩 Новое сообщение от @${ctx.from.username || 'нет'} (ID: ${ctx.from.id})\n${ctx.message.text || ''}`
    );

    await updateAdminKeyboard();
  });

  await bot.launch({ dropPendingUpdates: true });
  console.log('✅ Bot started');
}

startBot();