const TelegramBot = require( `node-telegram-bot-api` );
const rp = require('request-promise');
const $ = require('cheerio');
require('dotenv').config();

const bot = new TelegramBot( process.env.TOKEN, { polling: true } )

Array.prototype.groupBy = function(prop) {
  return this.reduce(function(groups, item) {
    const val = item[prop]
    groups[val] = groups[val] || []
    groups[val].push(item)
    return groups
  }, {})
}

var find_and_fetch_price = (msg, match) => {
  const chatId = msg.chat.id;
  const cardName = match[1];
  const url = 'http://www.starcitygames.com/results?name='+encodeURI(cardName)+'&auto=Y';
  console.log(url);
  rp(url)
    .then(function(html){
      cards = [];
      for(let i = 0; i < $('.deckdbbody_row,.deckdbbody2_row', html).length; i++) {
        if ($('.deckdbbody_row,.deckdbbody2_row', html)[i].children.filter(
          (x) => { return x.attribs !== undefined && x.attribs.class.includes('search_results_7') }
        )[0].children[0].children[0].data == "NM/M") {
          let td_name = $('.deckdbbody_row,.deckdbbody2_row', html)[i].children.filter(
            (x) => { return x.attribs !== undefined && x.attribs.class.includes('search_results_1') }
          );
          let td_set = $('.deckdbbody_row,.deckdbbody2_row', html)[i].children.filter(
            (x) => { return x.attribs !== undefined && x.attribs.class.includes('search_results_2') }
          );
          let td_value = $('.deckdbbody_row,.deckdbbody2_row', html)[i].children.filter(
            (x) => { return x.attribs !== undefined && x.attribs.class.includes('search_results_9') }
          )
          cards.push({
            scg_link: td_name[0].children[0].children[0].attribs["href"],
            name: td_name[0].children[0].children[0].children[0].data,
            set: td_set[0].children[1].children[0].data,
            value: "$" + (parseFloat(td_value[0].children[0].data.substring(1))).toFixed(2),
            converted_value: "R$ " + (parseFloat(td_value[0].children[0].data.substring(1))*2.5).toFixed(2)
          })

        }
      }

      let grouped_cards = cards.groupBy("name")
      let message = ""

      for (const card_name of Object.keys(grouped_cards)) {
          message += `*${card_name.trim()}*\n`
          message += grouped_cards[card_name].reduce((acc, current) => {
            return `${acc}${current["set"]}: ${current["value"]} -> * ${current["converted_value"]}*\n`;
          }, "")
          message += "\n"
      }

      bot.sendMessage(chatId, message, {parse_mode : "markdown"});
    })
    .catch(function(err){
      console.log(err);
    });
}

bot.onText(/\/card (.+)/, function(msg, match) { find_and_fetch_price(msg, match) });
