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

// Подключаем базу
await connectDB();

// Подключаем сессию
bot.use(session());
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

// Генерация inline-клавиатуры админа с маркерами непрочитанных сообщений
async function getAdminKeyboard() {
  const users = await User.find().limit(50);
  const buttons = await Promise.all(
    users.map(async (u) => {
      const unreadCount = await Message.countDocuments({ userId: u.telegramId, read: false, type: 'text' });
      const label = `${u.username ? '@' + u.username : 'без username'}${unreadCount > 0 ? ` 🔴(${unreadCount})` : ''}`;
      return [Markup.button.callback(label, `user_${u.telegramId}`)];
    })
  );
  return Markup.inlineKeyboard(buttons);
}

// Кнопка главного меню для админа
function getAdminMainKeyboard(hasUnread = false) {
  return Markup.keyboard([
    ['👤 Профиль', '💰 Баланс'],
    ['⚙️ Настройки', 'ℹ️ Помощь'],
    [hasUnread ? `📥 Входящие 🔴` : '📥 Входящие']
  ]).resize();
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

  const isAdmin = ctx.from.id.toString() === ADMIN_ID;
  await ctx.reply('Выберите действие:', isAdmin ? getAdminMainKeyboard() : Markup.keyboard([
    ['👤 Профиль', '💰 Баланс'],
    ['⚙️ Настройки', 'ℹ️ Помощь']
  ]).resize());
});

// 📥 Входящие
bot.hears(/📥 Входящие/, async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  ctx.session.currentUserId = null;

  const keyboard = await getAdminKeyboard();
  await ctx.reply('Выберите пользователя для просмотра сообщений:', keyboard);
});

// Открыть диалог
bot.action(/user_(\d+)/, async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const userId = ctx.match[1];
  ctx.session.currentUserId = userId;

  await Message.updateMany({ userId, read: false, type: 'text' }, { read: true });

  const messages = await Message.find({ userId }).sort({ date: 1 }).limit(50);
  if (messages.length === 0) {
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

// ❌ Завершить диалог
bot.hears('❌ Завершить диалог', async (ctx) => {
  ctx.session.currentUserId = null;

  // Проверяем есть ли непрочитанные сообщения
  const hasUnread = await Message.exists({ read: false, type: 'text' });
  await ctx.reply('Диалог закрыт. Вернулись к главному меню:', getAdminMainKeyboard(hasUnread));
});

// Основной обработчик сообщений
bot.on('text', async (ctx) => {
  const isAdmin = ctx.from.id.toString() === ADMIN_ID;

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

    const keyboard = await getAdminKeyboard();
    await ctx.reply('Выберите пользователя:', keyboard);
    return;
  }

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

// Автообновление кнопки входящие каждые 10 секунд
setInterval(async () => {
  try {
    const hasUnread = await Message.exists({ read: false, type: 'text' });
    await bot.telegram.sendMessage(ADMIN_ID, ' ', getAdminMainKeyboard(hasUnread));
  } catch (e) {
    // Игнорируем пустое сообщение
  }
}, 10000);

await bot.launch({ dropPendingUpdates: true });
console.log('✅ Bot started');