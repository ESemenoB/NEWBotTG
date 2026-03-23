// import 'dotenv/config';
// import { Telegraf, Markup, session } from 'telegraf';
// import connectDB from './database/db.js';
// import User from './models/User.js';
// import Message from './models/Message.js';

// const BOT_TOKEN = process.env.BOT_TOKEN;
// const ADMIN_ID = parseInt(process.env.ADMIN_ID);

// const bot = new Telegraf(BOT_TOKEN);

// await connectDB();

// bot.use(session());
// bot.use((ctx, next) => {
//   if (!ctx.session) ctx.session = {};
//   return next();
// });


// async function updateInboxButton(ctx) {
//   const chatId = ADMIN_ID;

//   const usersWithUnread = await Message.aggregate([
//     { $match: { type: 'text', readByAdmin: { $ne: true } } },
//     { $group: { _id: '$userId', count: { $sum: 1 } } }
//   ]);

//   const users = await User.find().limit(20);

//   // Кнопки в столбик
//   const buttons = users.map(u => {
//     const unread = usersWithUnread.find(x => x._id === u.telegramId);
//     const label = `${u.username || u.firstName || 'User ' + u.telegramId}${unread ? ` 🔴 (${unread.count})` : ''}`;
//     return [Markup.button.callback(label, `user_${u.telegramId}`)]; // <-- каждая кнопка в отдельном массиве = столбик
//   });

//   if (ctx?.session?.inboxMessageId) {
//     try {
//       await bot.telegram.editMessageReplyMarkup(
//         chatId,
//         ctx.session.inboxMessageId,
//         undefined,
//         { inline_keyboard: buttons }
//       );
//     } catch {
//       // если нельзя редактировать, игнорируем
//     }
//   } else {
//     const sent = await bot.telegram.sendMessage(
//       chatId,
//       '📥 Входящие\n(нажми на пользователя)',
//       { reply_markup: { inline_keyboard: buttons } }
//     );
//     if (ctx?.session) ctx.session.inboxMessageId = sent.message_id;
//   }
// }

// // /start
// bot.start(async (ctx) => {
//   let user = await User.findOne({ telegramId: ctx.from.id });
//   if (!user) {
//     user = await User.create({
//       telegramId: ctx.from.id,
//       username: ctx.from.username,
//       firstName: ctx.from.first_name
//     });
//   }

//   const buttons = [
//     ['👤 Профиль', '💰 Баланс'],
//     ['⚙️ Настройки', 'ℹ️ Помощь']
//   ];

//   if (ctx.from.id === ADMIN_ID) {
//     buttons.push(['📥 Входящие']);
//   }

//   await ctx.reply('Выберите действие:', Markup.keyboard(buttons).resize());
// });

// // Кнопки обычного пользователя
// bot.hears('👤 Профиль', async (ctx) => {
//   const user = await User.findOne({ telegramId: ctx.from.id });
//   if (!user) return ctx.reply('Нажми /start');

//   ctx.reply(`
// 👤 Профиль
// ID: ${user.telegramId}
// Username: @${user.username || 'нет'}
// Premium: ${user.isPremium ? 'Да ⭐' : 'Нет'}
//   `);
// });

// bot.hears('💰 Баланс', async (ctx) => {
//   const user = await User.findOne({ telegramId: ctx.from.id });
//   if (!user) return ctx.reply('Нажми /start');
//   ctx.reply(`💰 Баланс: ${user.balance || 0} ₽`);
// });

// bot.hears('⚙️ Настройки', (ctx) => ctx.reply('⚙️ Пока пусто'));
// bot.hears('ℹ️ Помощь', (ctx) => ctx.reply('ℹ️ Это тестовый бот'));

// // Админский функционал
// bot.hears('📥 Входящие', async (ctx) => {
//   if (ctx.from.id !== ADMIN_ID) return;
//   await updateInboxButton(ctx);
// });

// // Открыть диалог с пользователем
// bot.action(/user_(\d+)/, async (ctx) => {
//   if (ctx.from.id !== ADMIN_ID) return;

//   const userId = parseInt(ctx.match[1]);
//   ctx.session.currentUserId = userId;

//   // Отметить сообщения прочитанными
//   await Message.updateMany(
//     { userId, type: 'text', readByAdmin: { $ne: true } },
//     { $set: { readByAdmin: true } }
//   );

//   const user = await User.findOne({ telegramId: userId });

//   // Получаем последние 10 сообщений
//   const messages = await Message.find({ userId }).sort({ date: -1 }).limit(10);

//   let text = `💬 Диалог с ${user.username || user.firstName || 'User ' + userId}:\n\n`;
//   text += messages.reverse().map(m => `${m.type === 'admin' ? '🛠 ' : '👤 '}${m.content}`).join('\n');

//   await bot.telegram.sendMessage(
//     ADMIN_ID,
//     text || '(нет сообщений)',
//     Markup.keyboard([['❌ Завершить диалог']]).resize()
//   );

//   await updateInboxButton(ctx);
// });

// // Завершить диалог
// bot.hears('❌ Завершить диалог', async (ctx) => {
//   ctx.session.currentUserId = null;

//   const buttons = [
//     ['👤 Профиль', '💰 Баланс'],
//     ['⚙️ Настройки', 'ℹ️ Помощь']
//   ];
//   buttons.push(['📥 Входящие']);

//   await ctx.reply('Выберите действие:', Markup.keyboard(buttons).resize());
//   await updateInboxButton(ctx);
// });

// // Основной обработчик сообщений
// bot.on('text', async (ctx) => {
//   const isAdmin = ctx.from.id === ADMIN_ID;

//   if (isAdmin && ctx.session.currentUserId) {
//     // Админ отвечает пользователю
//     const targetId = ctx.session.currentUserId;

//     await bot.telegram.sendMessage(targetId, `💬 ${ctx.message.text}`);
//     await Message.create({
//       userId: targetId,
//       type: 'admin',
//       content: ctx.message.text,
//       date: new Date()
//     });

//     await updateInboxButton(ctx);
//     return;
//   }

//   // Пользователь пишет
//   const user = await User.findOne({ telegramId: ctx.from.id });
//   if (!user) return;

//   await Message.create({
//     userId: ctx.from.id,
//     type: 'text',
//     content: ctx.message.text,
//     date: new Date(),
//     readByAdmin: false
//   });

//   // Уведомление админа
//   if (!isAdmin) {
//     await bot.telegram.sendMessage(
//       ADMIN_ID,
//       `📩 Новое сообщение от ${user.username || user.firstName || 'User ' + ctx.from.id}\nID: ${ctx.from.id}\n\n${ctx.message.text}`
//     );
//     await updateInboxButton();
//   }
// });

// await bot.launch({ dropPendingUpdates: true });
// console.log('✅ Bot started');

import 'dotenv/config';
import { Telegraf, Markup, session } from 'telegraf';
import connectDB from './database/db.js';
import User from './models/User.js';
import Message from './models/Message.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);

const bot = new Telegraf(BOT_TOKEN);

await connectDB();

bot.use(session());
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

// ------------------ Функция обновления входящих ------------------
async function updateInboxButton(ctx) {
  const chatId = ADMIN_ID;

  // Находим пользователей с непрочитанными сообщениями
  const usersWithUnread = await Message.aggregate([
    { $match: { type: 'text', readByAdmin: { $ne: true } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]);

  if (usersWithUnread.length === 0) {
    await bot.telegram.sendMessage(chatId, '📥 Входящие пусты');
    return;
  }

  // Получаем данные пользователей
  const users = await User.find({ telegramId: { $in: usersWithUnread.map(u => u._id) } });

  // Формируем кнопки в столбик
  const buttons = users.map(u => {
    const unread = usersWithUnread.find(x => x._id === u.telegramId);
    const label = `${u.username || u.firstName || 'User ' + u.telegramId} 🔴 (${unread.count})`;
    return [Markup.button.callback(label, `user_${u.telegramId}`)]; // столбик
  });

  await bot.telegram.sendMessage(chatId, '📥 Входящие\n(нажми на пользователя)', 
    Markup.inlineKeyboard(buttons)
  );
}

// ------------------ /start ------------------
bot.start(async (ctx) => {
  let user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    user = await User.create({
      telegramId: ctx.from.id,
      username: ctx.from.username,
      firstName: ctx.from.first_name
    });
  }

  const buttons = [
    ['👤 Профиль', '💰 Баланс'],
    ['⚙️ Настройки', 'ℹ️ Помощь']
  ];

  if (ctx.from.id === ADMIN_ID) buttons.push(['📥 Входящие']);

  await ctx.reply('Выберите действие:', Markup.keyboard(buttons).resize());
});

// ------------------ Кнопки пользователя ------------------
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

bot.hears('💰 Баланс', async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply('Нажми /start');
  ctx.reply(`💰 Баланс: ${user.balance || 0} ₽`);
});

bot.hears('⚙️ Настройки', (ctx) => ctx.reply('⚙️ Пока пусто'));
bot.hears('ℹ️ Помощь', (ctx) => ctx.reply('ℹ️ Это тестовый бот'));

// ------------------ Админский функционал ------------------
bot.hears('📥 Входящие', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  await updateInboxButton(ctx);
});

// ------------------ Открыть диалог с пользователем ------------------
bot.action(/user_(\d+)/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const userId = parseInt(ctx.match[1]);
  ctx.session.currentUserId = userId;

  // Отмечаем сообщения прочитанными
  await Message.updateMany(
    { userId, type: 'text', readByAdmin: { $ne: true } },
    { $set: { readByAdmin: true } }
  );

  const user = await User.findOne({ telegramId: userId });

  const messages = await Message.find({ userId }).sort({ date: -1 }).limit(10);
  let text = `💬 Диалог с ${user.username || user.firstName || 'User ' + userId}:\n\n`;
  text += messages.reverse().map(m => `${m.type === 'admin' ? '🛠 ' : '👤 '}${m.content}`).join('\n');

  await bot.telegram.sendMessage(
    ADMIN_ID,
    text || '(нет сообщений)',
    Markup.keyboard([['❌ Завершить диалог']]).resize()
  );

  await updateInboxButton(ctx);
});

// ------------------ Завершить диалог ------------------
bot.hears('❌ Завершить диалог', async (ctx) => {
  ctx.session.currentUserId = null;

  const buttons = [
    ['👤 Профиль', '💰 Баланс'],
    ['⚙️ Настройки', 'ℹ️ Помощь']
  ];
  buttons.push(['📥 Входящие']);

  await ctx.reply('Выберите действие:', Markup.keyboard(buttons).resize());
  await updateInboxButton(ctx);
});

// ------------------ Основной обработчик сообщений ------------------
bot.on('text', async (ctx) => {
  const isAdmin = ctx.from.id === ADMIN_ID;

  if (isAdmin && ctx.session.currentUserId) {
    const targetId = ctx.session.currentUserId;
    await bot.telegram.sendMessage(targetId, `💬 ${ctx.message.text}`);
    await Message.create({
      userId: targetId,
      type: 'admin',
      content: ctx.message.text,
      date: new Date()
    });
    await updateInboxButton(ctx);
    return;
  }

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return;

  await Message.create({
    userId: ctx.from.id,
    type: 'text',
    content: ctx.message.text,
    date: new Date(),
    readByAdmin: false
  });

  // Уведомление админа
  if (!isAdmin) {
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `📩 Новое сообщение от ${user.username || user.firstName || 'User ' + ctx.from.id}\nID: ${ctx.from.id}\n\n${ctx.message.text}`
    );
    await updateInboxButton(ctx);
  }
});

await bot.launch({ dropPendingUpdates: true });
console.log('✅ Bot started');