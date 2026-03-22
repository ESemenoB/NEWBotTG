// const { Telegraf, Markup, session } = require('telegraf')

// const connectDB = require('./database/db')
// const startCommand = require('./commands/start')
// const User = require('./models/User')
// const Message = require('./models/Message')
// const { BOT_TOKEN, ADMIN_ID } = require('./config')

// // 🤖 бот
// const bot = new Telegraf(BOT_TOKEN)

// // session
// bot.use(session())

// // защита от undefined session
// bot.use((ctx, next) => {
//   if (!ctx.session) ctx.session = {}
//   return next()
// })

// async function startBot() {
//   await connectDB()
//   console.log('MongoDB connected')

//   // =========================
//   // /start
//   // =========================
//   bot.start(async (ctx) => {
//     console.log('USER ID:', ctx.from.id)

//     await startCommand(ctx)

//     const buttons = [
//       ['👤 Профиль', '💰 Баланс'],
//       ['⚙️ Настройки', 'ℹ️ Помощь']
//     ]

//     // if (ctx.from.id === ADMIN_ID) {
//     //   buttons.push(['📊 Статистика', '👥 Пользователи'])
//     // }

//     if (ctx.from.id.toString() === ADMIN_ID) {
//   buttons.push(['📊 Статистика', '👥 Пользователи'])
// }

//     await ctx.reply('Выберите действие:', Markup.keyboard(buttons).resize())
//   })

//   // =========================
//   // 📊 Статистика
//   // =========================
//   bot.hears('📊 Статистика', async (ctx) => {
//     if (ctx.from.id !== ADMIN_ID) return

//     const total = await User.countDocuments()
//     const inWork = await User.countDocuments({ status: 'work' })
//     const done = await User.countDocuments({ status: 'done' })

//     ctx.reply(`
// 📊 CRM статистика

// Всего: ${total}
// В работе: ${inWork}
// Закрыто: ${done}
// `)
//   })

//   // =========================
//   // 👥 Пользователи
//   // =========================
//   bot.hears('👥 Пользователи', async (ctx) => {
//     if (ctx.from.id !== ADMIN_ID) return

//     const users = await User.find().sort({ _id: -1 }).limit(20)

//     if (!users.length) return ctx.reply('❌ Нет пользователей')

//     const buttons = users.map(u => [
//       Markup.button.callback(
//         `${u.username ? '@' + u.username : 'без username'} | ${u.telegramId}`,
//         `user_${u.telegramId}`
//       )
//     ])

//     await ctx.reply(
//       '👥 Пользователи:',
//       Markup.inlineKeyboard(buttons)
//     )
//   })

//   // =========================
//   // 👤 Карточка пользователя
//   // =========================
//   bot.action(/user_(\d+)/, async (ctx) => {
//     if (ctx.from.id !== ADMIN_ID) return

//     const userId = ctx.match[1]
//     const user = await User.findOne({ telegramId: userId })

//     if (!user) return ctx.answerCbQuery('❌ Не найден')

//     await ctx.answerCbQuery()

//     await ctx.reply(
//       `👤 Пользователь
// ID: ${user.telegramId}
// Username: @${user.username || 'нет'}
// Статус: ${user.status || 'new'}
// `,
//       Markup.inlineKeyboard([
//         [
//           Markup.button.callback('🆕 Новый', `status_new_${user.telegramId}`),
//           Markup.button.callback('🔥 В работе', `status_work_${user.telegramId}`)
//         ],
//         [
//           Markup.button.callback('💰 Закрыт', `status_done_${user.telegramId}`),
//           Markup.button.callback('❌ Отказ', `status_cancel_${user.telegramId}`)
//         ],
//         [
//           Markup.button.callback('💬 Чат', `chat_${user.telegramId}`)
//         ]
//       ])
//     )
//   })

//   // =========================
//   // 🔄 Смена статуса
//   // =========================
//   bot.action(/status_(\w+)_(\d+)/, async (ctx) => {
//     if (ctx.from.id !== ADMIN_ID) return

//     const status = ctx.match[1]
//     const userId = ctx.match[2]

//     await User.updateOne({ telegramId: userId }, { status })

//     await ctx.answerCbQuery('✅ Статус обновлен')
//   })

//   // =========================
//   // 💬 Открыть чат
//   // =========================
//   bot.action(/chat_(\d+)/, async (ctx) => {
//     if (ctx.from.id !== ADMIN_ID) return

//     const userId = ctx.match[1]
//     ctx.session.currentUserId = userId

//     await ctx.answerCbQuery()

//     await ctx.reply(
//       `💬 Чат с ${userId}`,
//       Markup.keyboard([['❌ Закрыть диалог']]).resize()
//     )

//     const messages = await Message.find({ userId })
//       .sort({ date: -1 })
//       .limit(10)

//     if (!messages.length) return ctx.reply('❌ Нет сообщений')

//     for (const msg of messages.reverse()) {
//       try {
//         if (msg.type === 'text') {
//           await ctx.reply(
//             msg.type === 'admin'
//               ? `🛠 ${msg.content}`
//               : `👤 ${msg.content}`
//           )
//         }

//         if (msg.type === 'photo') {
//           await ctx.replyWithPhoto(msg.fileId, {
//             caption: msg.type === 'admin' ? '🛠 Фото' : '👤 Фото'
//           })
//         }

//         if (msg.type === 'voice') {
//           await ctx.replyWithVoice(msg.fileId)
//         }

//         if (msg.type === 'document') {
//           await ctx.replyWithDocument(msg.fileId)
//         }
//       } catch (e) {
//         console.log('Ошибка вывода:', e)
//       }
//     }
//   })

//   // =========================
//   // ❌ Закрыть диалог
//   // =========================
//   bot.hears('❌ Закрыть диалог', (ctx) => {
//     ctx.session.currentUserId = null
//     ctx.reply('Диалог закрыт')
//   })

//   // =========================
//   // 🔥 ОСНОВНОЙ ЧАТ
//   // =========================
//   bot.on(['text', 'photo', 'voice', 'document'], async (ctx) => {
//     const isAdmin = ctx.from.id === ADMIN_ID

//     // 🛠 админ пишет клиенту
//     if (isAdmin && ctx.session.currentUserId) {
//       const targetId = ctx.session.currentUserId

//       try {
//         if (ctx.message.text) {
//           await bot.telegram.sendMessage(targetId, `💬 ${ctx.message.text}`)
//         } else if (ctx.message.photo) {
//           await bot.telegram.sendPhoto(
//             targetId,
//             ctx.message.photo[0].file_id,
//             { caption: '💬 Ответ админа' }
//           )
//         } else if (ctx.message.voice) {
//           await bot.telegram.sendVoice(
//             targetId,
//             ctx.message.voice.file_id
//           )
//         } else if (ctx.message.document) {
//           await bot.telegram.sendDocument(
//             targetId,
//             ctx.message.document.file_id
//           )
//         }

//         await Message.create({
//           userId: targetId,
//           type: 'admin',
//           content: ctx.message.text || 'media',
//           fileId:
//             ctx.message.photo?.[0]?.file_id ||
//             ctx.message.voice?.file_id ||
//             ctx.message.document?.file_id ||
//             null,
//           date: new Date()
//         })

//         return
//       } catch (e) {
//         console.log('Ошибка отправки:', e)
//       }
//     }

//     // 👤 пользователь пишет
//     const user = await User.findOne({ telegramId: ctx.from.id })
//     if (!user) return

//     try {
//       await Message.create({
//         userId: ctx.from.id,
//         type: ctx.message.photo
//           ? 'photo'
//           : ctx.message.voice
//           ? 'voice'
//           : ctx.message.document
//           ? 'document'
//           : 'text',
//         content: ctx.message.text || null,
//         fileId:
//           ctx.message.photo?.[0]?.file_id ||
//           ctx.message.voice?.file_id ||
//           ctx.message.document?.file_id ||
//           null,
//         date: new Date(ctx.message.date * 1000)
//       })
//     } catch (e) {
//       console.log('Ошибка БД:', e)
//     }

//     // 📩 админу
//     if (!isAdmin) {
//       const text = ctx.message.text || '📎 медиа'

//       await bot.telegram.sendMessage(
//         ADMIN_ID,
//         `📩 Сообщение от @${ctx.from.username || 'нет'}
// ID: ${ctx.from.id}

// ${text}`
//       )
//     }
//   })

//   console.log('🚀 Запуск бота...')
//   await bot.launch({ dropPendingUpdates: true })
//   console.log('✅ Bot started')
// }

// startBot()

import 'dotenv/config';
import { Telegraf, Markup, session } from 'telegraf';
import connectDB from './db.js';
import startCommand from './commands/start.js';
import User from './models/User.js';
import Message from './models/Message.js';

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);

// подключаем сессию
bot.use(session());

// подстраховка: гарантируем ctx.session
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

async function startBot() {
  await connectDB();
  console.log('MongoDB connected');

  // =========================
  // /start
  // =========================
  bot.start(async (ctx) => {
    await startCommand(ctx);

    const buttons = [
      ['👤 Профиль', '💰 Баланс'],
      ['⚙️ Настройки', 'ℹ️ Помощь']
    ];

    if (ctx.from.id === ADMIN_ID) {
      buttons.push(['📊 Статистика', '👥 Пользователи']);
    }

    await ctx.reply('Выберите действие:', Markup.keyboard(buttons).resize());
  });

  // =========================
  // 👤 Профиль
  // =========================
  bot.hears('👤 Профиль', async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return ctx.reply('Нажми /start');

    await ctx.reply(`
👤 Профиль
ID: ${user.telegramId}
Username: @${user.username || 'нет'}
Premium: ${user.isPremium ? 'Да ⭐' : 'Нет'}
`);
  });

  // =========================
  // 💰 Баланс
  // =========================
  bot.hears('💰 Баланс', async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return ctx.reply('Нажми /start');

    await ctx.reply(`💰 Баланс: ${user.balance} ₽`);
  });

  // =========================
  // ⚙️ Настройки
  // =========================
  bot.hears('⚙️ Настройки', (ctx) => ctx.reply('⚙️ Пока пусто'));

  // =========================
  // ℹ️ Помощь
  // =========================
  bot.hears('ℹ️ Помощь', (ctx) => ctx.reply('ℹ️ Это тестовый бот'));

  // =========================
  // 📊 Статистика (админ)
  // =========================
  bot.hears('📊 Статистика', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const usersCount = await User.countDocuments();
    await ctx.reply(`📊 Пользователей: ${usersCount}`);
  });

  // =========================
  // 👥 Пользователи (админ)
  // =========================
  bot.hears('👥 Пользователи', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const users = await User.find().sort({ _id: -1 }).limit(30);
    if (!users.length) return ctx.reply('❌ Пользователей нет');

    const buttons = users.map(u => [
      Markup.button.callback(
        `${u.username ? '@' + u.username : 'без username'} | ${u.telegramId}`,
        `user_${u.telegramId}`
      )
    ]);

    await ctx.reply('👥 Пользователи:', Markup.inlineKeyboard(buttons));
  });

  // =========================
  // Открыть чат с пользователем (админ)
  // =========================
  bot.action(/user_(\d+)/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const userId = Number(ctx.match[1]);
    ctx.session.currentUserId = userId;
    await ctx.answerCbQuery();

    await ctx.reply(
      `💬 Открыт чат с ID: ${userId}`,
      Markup.keyboard([['❌ Закрыть диалог']]).resize()
    );

    const messages = await Message.find({ userId }).sort({ date: -1 }).limit(15);
    for (const msg of messages.reverse()) {
      try {
        if (msg.type === 'text') await ctx.reply(msg.type === 'admin' ? `🛠 ${msg.content}` : `👤 ${msg.content}`);
        if (msg.type === 'photo') await ctx.replyWithPhoto(msg.fileId, { caption: '🖼 Фото' });
        if (msg.type === 'voice') await ctx.replyWithVoice(msg.fileId);
        if (msg.type === 'document') await ctx.replyWithDocument(msg.fileId);
      } catch (e) {
        console.log('Ошибка вывода сообщения:', e);
      }
    }
  });

  // =========================
  // ❌ Закрыть диалог
  // =========================
  bot.hears('❌ Закрыть диалог', (ctx) => {
    ctx.session.currentUserId = null;
    ctx.reply('Диалог закрыт');
  });

  // =========================
  // Основной обработчик сообщений
  // =========================
  bot.on(['text', 'photo', 'voice', 'document'], async (ctx) => {
    const isAdmin = ctx.from.id === ADMIN_ID;

    // ⚠️ Ответ админа
    if (isAdmin && ctx.session.currentUserId) {
      const targetId = Number(ctx.session.currentUserId);
      if (!targetId || isNaN(targetId)) return ctx.reply('❌ Не выбран пользователь для ответа');

      try {
        if (ctx.message.text) await bot.telegram.sendMessage(targetId, `💬 ${ctx.message.text}`);
        if (ctx.message.photo) await bot.telegram.sendPhoto(targetId, ctx.message.photo[0].file_id, { caption: '💬 Фото' });
        if (ctx.message.voice) await bot.telegram.sendVoice(targetId, ctx.message.voice.file_id);
        if (ctx.message.document) await bot.telegram.sendDocument(targetId, ctx.message.document.file_id);

        await Message.create({
          userId: targetId,
          type: 'admin',
          content: ctx.message.text || 'media',
          date: new Date()
        });

        return ctx.reply('✅ Ответ отправлен');
      } catch (e) {
        console.log(e);
        return ctx.reply('❌ Ошибка отправки');
      }
    }

    // ⚡ Сообщение пользователя
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return;

    try {
      await Message.create({
        userId: ctx.from.id,
        type: ctx.message.photo ? 'photo' :
              ctx.message.voice ? 'voice' :
              ctx.message.document ? 'document' : 'text',
        content: ctx.message.text || null,
        fileId: ctx.message.photo?.[0]?.file_id || ctx.message.voice?.file_id || ctx.message.document?.file_id || null,
        date: new Date(ctx.message.date * 1000)
      });
    } catch (e) {
      console.log('Ошибка записи в БД:', e);
    }

    if (!isAdmin) {
      try {
        await bot.telegram.sendMessage(
          ADMIN_ID,
          `📩 Сообщение от @${ctx.from.username || 'нет'}\nID: ${ctx.from.id}\n\n${ctx.message.text || '📎 медиа'}`
        );
      } catch (e) {
        console.log('Ошибка отправки администратору:', e);
      }
    }
  });

  // =========================
  console.log('🚀 Запуск бота...');
  await bot.launch({ dropPendingUpdates: true });
  console.log('✅ Bot started');
}

startBot();