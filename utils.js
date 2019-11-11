const scraper = require('./scraper.js')

exports.getInlineOptions = (cards) => {

  return new Promise((resolve, reject) => {
    let response = cards.map(
      (card) => {
        console.log(card);
        
        return {
          type: "article",
          id: card[0].id,
          title: card[0].text,
          input_message_content: {
            message_text: `*${card[0].text}*\n_Por favor, clique no botão para ver o preço_`,
            parse_mode: 'Markdown'
          },
          reply_markup: {
            "inline_keyboard": [[{text: 'Ver Preço', callback_data: card[0].callback_data}]]
          },
          parse_mode: 'Markdown'
        }
      }
    )
    resolve(response)
  })
}

exports.getResponseMessage = (cardNames) => {

  let txt
  return new Promise((resolve, reject) => {
    if (cardNames.length == 1) {
      scraper.findAndFetchPrice(cardNames[0][0].callback_data).then(
        (cards) => {
          let response = exports.craftMessageFromCards(cards)
          resolve(response)
        }
      )
      .catch((err) => {
        console.log(err)
        reject({
          success: false
        })
      })
    } else {
      let options = {}
      if (cardNames.length > 1) {
        options = createKeyboard(cardNames)
        txt = 'Foram encontradas algumas possibilidades. Por favor, escolha a carta correta: '
      } else {
        txt = 'Não foram encontradas cartas com esse nome no banco de dados do Scryfall'
      }
      resolve({ message: txt, options: options })
    }
  })
}

exports.convertPrice = (price, rate = 2.5) => (parseFloat(price) * rate).toFixed(2)

exports.craftMessageFromCards = (cards) => {
  let options = {
    parse_mode: "markdown"
  }

  let message

  if (cards.length > 0) {
    let groupedCards = cards.groupBy("name")
    message = assembleMessageFromGroupedCards(groupedCards)
  } else {
    message = `Não foram encontrados resultados para essa pesquisa`
  }
  return { message: message, options: options }
}


let createKeyboard = (cardNames) =>
  ({
    "reply_markup": {
      "inline_keyboard": cardNames
    }
  })

let assembleMessageFromGroupedCards = (groupedCards) => {
  let message = ""
  for (const cardName of Object.keys(groupedCards)) {
    message += `*${cardName.trim()}*\n`
    message += groupedCards[cardName].reduce(appendCardInfoOntoMessageString, "")
    message += "\n"
  }
  return message
}

let appendCardInfoOntoMessageString =
  (messageString, cardInfo) => {
    let stock = cardInfo["stock"] ? '' : '(sem estoque)'
    return `${messageString}${cardInfo["set"]}: ${cardInfo["price"]} → * ${cardInfo["convertedPrice"]}* ${stock}\n`
  }

Array.prototype.groupBy = function (prop) {
  return this.reduce(function (groups, item) {
    const val = item[prop]
    groups[val] = groups[val] || []
    groups[val].push(item)
    return groups
  }, {})
}
