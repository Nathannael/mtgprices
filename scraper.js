const $ = require('cheerio')
const request = require('request-promise')

exports.findAndFetchPrice = (cardName) => {
    // eslint-disable-next-line no-undef
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
    let tableRows = $('tr', html)

    console.log(tableRows.length);
    

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

let fetchTableData = (tdClass) =>
    (x) => x.attribs !== undefined && x.attribs.class.includes(tdClass)

let tableRowContainsCardWithMintCondition = (tableRow) =>
    tableRow.children.filter(
        fetchTableData('--Condition')
    )[0].children[0].children[0].data == "Near Mint"
