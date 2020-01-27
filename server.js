require('dotenv').config()

const url = `https://${process.env.HEROKU_APP_NAME}.herokuapp.com:443`
const token = process.env.TOKEN

const TelegramBot = require('node-telegram-bot-api')
const scryfall = require('./scryfall.js')
const scraper = require('./scraper.js')
const utils = require('./utils.js')

// const options = {
//   webHook: {
//     port: process.env.PORT
//   }
// }

// const bot = new TelegramBot(token, options)
// bot.setWebHook(`${url}/bot${token}`)

const bot = new TelegramBot(token, { polling: true } )

let sendMessage = (chatId) => {
  return (message) => {
    bot.sendMessage(chatId, message.message, message.options)
  }
}

let sendErrorMessage = (chatId) =>
  // (err) => bot.sendMessage(chatId, `Ocorreu um erro! Tente novamente mais tarde.`)
  (err) => bot.sendMessage(chatId, err.message)


bot.on('message', (msg) => {
  console.log(`User ${msg.chat.first_name} searched for: ${msg.text}.`)
  scryfall.findCards(msg.text)
    .then(utils.getResponseMessage)
    .then(sendMessage(msg.chat.id))
    .catch(sendErrorMessage(msg.chat.id))
})

bot.on("inline_query", (msg) => {
  scryfall.findCards(msg.query)
    .then(utils.getInlineOptions)
    .then((options) => bot.answerInlineQuery(msg.id, options))
});

bot.on('chosen_inline_result', (chosenResult) => {
  console.log(chosenResult)
})

bot.on('callback_query', function onCallbackQuery(choice){
  const chosenCard = choice.data // returns which button the user clicked
  console.log(choice);
  
  if(choice.inline_message_id) {
    scraper.findAndFetchPrice(chosenCard)
      .then(utils.craftMessageFromCards)
      .then((message) =>  {
        bot.editMessageText(
          message.message, 
          { inline_message_id: choice.inline_message_id, parse_mode: 'Markdown' }
        )
      })
      .catch(sendErrorMessage(choice.inline_message_id))
  } else {
    const chatId = choice.message.chat.id
  
    scraper.findAndFetchPrice(chosenCard)
      .then(utils.craftMessageFromCards)
      .then(sendMessage(chatId))
      .catch(sendErrorMessage(chatId))
  }
})
