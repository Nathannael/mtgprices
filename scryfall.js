const request = require('request-promise')
const scryfallUrl = 'https://api.scryfall.com/cards/search?include_multilingual=true&'


exports.findCards = (query) => {
  query = scryfallUrl + `q=${encodeURI(query)}`

  return new Promise((resolve, reject) => {
    request(query)
      .then((response) => {
        let possibleCards = JSON.parse(response)["data"]
        let cardNames = getCardNamesFromLanguages(possibleCards)
        resolve(cardNames)
      })
      .catch((err) => {
        if(err.statusCode == 404) {
          reject ({
            success: false,
            message: 'Não foram encontradas cartas com esse nome no banco de dados do Scryfall. Por favor, tente novamente com outros termos.'
          })
        } else {
          console.log(err)
          reject({
            success: false
          })
        }
      })
    })
}

let getCardNamesFromLanguages = (cards, languages = ['en', 'pt', 'es']) =>
  filterCardsFromLanguages(cards, languages).map(card =>
    [{ "text": (card.printed_name || card.name), "callback_data": card.name }]
  )

let filterCardsFromLanguages = (cards, languages) =>
  cards.filter((card) => languages.includes(card.lang))
