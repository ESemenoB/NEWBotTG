const User = require('../models/User')

module.exports = async (ctx) => {
  const telegramId = ctx.from.id

  let user = await User.findOne({ telegramId })

  if (!user) {
    user = await User.create({
      telegramId,
      username: ctx.from.username
    })
  }

  ctx.reply('Добро пожаловать 🚀')
}