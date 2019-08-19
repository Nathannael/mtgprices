const $ = require('cheerio')
const mtg = require('mtgsdk')
const request = require('request-promise')
const utils = require('./utils.js')

exports.findAndFetchPrice = (cardName) => {
  const url = 'http://www.starcitygames.com/results?name=' + encodeURI(cardName) + '&go.x=0&go.y=0'
  console.log(url)

  return new Promise(function(resolve, reject) {
    request(url)
      .then(function (html_page) {
        resolve(getCardsFromPage(html_page))
      })
      .catch((err) => {
        console.log(err)
        reject({
          error: err
        })
      })
    })
}

let getCardsFromPage = (html) => {
  let cards = []
  let tableRows = $('.deckdbbody_row,.deckdbbody2_row', html)

  for (let i = 0; i < tableRows.length; i++) {
    if (tableRowContainsCardWithMintCondition(tableRows[i])) {
      cards.push(getCardFromTableRow(tableRows[i]))
    }
  }

  return cards
}

//SCG has this thing where the price is sometimes strikethrough.
//That functions checks if td content is a number.
//If it is, parse it. If it isn't, get the number, then parse it.
let getPriceFromTableData = (tdContent) => {
  if (!tdContent.children[0].hasOwnProperty("data")) {
    let tdContent = tdContent.children[2]
  }
  return parseFloat(tdContent.children[0].data.substring(1)).toFixed(2)
}

let fetchTableData = (tdClass) =>
  (x) => x.attribs !== undefined && x.attribs.class.includes(tdClass)

let tableRowContainsCardWithMintCondition = (tableRow) =>
  tableRow.children.filter(
    fetchTableData('search_results_7')
  )[0].children[0].children[0].data == "NM/M"

let getCardFromTableRow = (tableRow) => {
  let td_name = tableRow.children.filter(fetchTableData('search_results_1'))[0] // Card name is in this column
  let td_set = tableRow.children.filter(fetchTableData('search_results_2'))[0] // Card set is in this column
  let td_stock = tableRow.children.filter(fetchTableData('search_results_8'))[0] // Card stock is in this column
  let td_price = tableRow.children.filter(fetchTableData('search_results_9'))[0] // Card price is in this column

  // Each td has a tree of HTML until we get to the info that we think is important.
  // That's why we go through a bunch of children
  let scgLink = td_name.children[0].children[0].attribs["href"]
  let name = td_name.children[0].children[0].children[0].data
  let set = td_set.children[1].children[0].data
  let price = getPriceFromTableData(td_price)
  let stock = td_stock.children[0].data != 'Out of Stock'

  return {
    scgLink: scgLink,
    name: name,
    set: set,
    price: `$ ${price}`,
    convertedPrice: `R$ ${utils.convertPrice(price)}`,
    stock: stock
  }
}
