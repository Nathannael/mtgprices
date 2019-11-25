const $ = require('cheerio')
const request = require('request-promise')
const utils = require('./utils.js')

exports.findAndFetchPrice = (cardName) => {
  const url = process.env.QUERY_URL + encodeURI(cardName) + process.env.QUERY_OPTIONS
  console.log(url)

  return new Promise((resolve, reject) => {
    request(url)
      .then((html_page) => {
        resolve(getCardsFromPage(html_page, cardName))
      })
      .catch((err) => {
        console.log(err)
        reject({
          error: err
        })
      })
    })
}

let getCardsFromPage = (html, cardName) => {
  let cards = []
  // let tableRows = $('.deckdbbody_row,.deckdbbody2_row', html)

  let tableRows = $('tr', html)
  

  for (let i = 0; i < tableRows.length; i++) {
    if (tableRowContainsCardWithMintCondition(tableRows[i])) {
      let card = getCardFromTableRow(tableRows[i])
      if (isNotSupply(card)) {
        cards.push(card)
      }
    }
  }

  return cards
}

//SCG has this thing where the price is sometimes strikethrough.
//That functions checks if td content is a number.
//If it is, parse it. If it isn't, get the number, then parse it.
let getPriceFromTableData = (tdContent) => {
  if (!tdContent.children[0].hasOwnProperty("data")) {
    tdContent = tdContent.children[2]
  }
  return parseFloat(tdContent.children[0].data.substring(1)).toFixed(2)
}

let fetchTableData = (tdClass) =>
  (x) => x.attribs !== undefined && x.attribs.class.includes(tdClass)

let tableRowContainsCardWithMintCondition = (tableRow) =>
  tableRow.children.filter(
    fetchTableData('--Condition')
  )[0].children[0].children[0].data == "Near Mint"

let isNotSupply = (card) =>
  !card['set'].startsWith('Supplies')

let getCardFromTableRow = (tableRow) => {
  let tdName = tableRow.children.filter(fetchTableData('search_results_1'))[0] // Card name is in this column
  let tdSet = tableRow.children.filter(fetchTableData('search_results_2'))[0] // Card set is in this column
  let tdStock = tableRow.children.filter(fetchTableData('search_results_8'))[0] // Card stock is in this column
  let tdPrice = tableRow.children.filter(fetchTableData('search_results_9'))[0] // Card price is in this column
  let tdCondition = tableRow.children.filter(fetchTableData('search_results_7'))[0] // Card condition is in this column

  // Each td has a tree of HTML until we get to the info that we think is important.
  // That's why we go through a bunch of children
  let scgLink = tdName.children[0].children[0].attribs["href"]
  let name = tdName.children[0].children[0].children[0].data
  let set = tdSet.children[1].children[0].data
  let price = getPriceFromTableData(tdPrice)
  let condition = tdCondition.children[0].children[0].data
  let stock = tdStock.children[0].data != 'Out of Stock'

  return {
    scgLink: scgLink,
    name: name,
    set: set,
    price: `$ ${price}`,
    convertedPrice: `R$ ${utils.convertPrice(price)}`,
    stock: stock,
    condition: condition
  }
}
