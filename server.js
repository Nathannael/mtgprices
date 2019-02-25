const TelegramBot = require( `node-telegram-bot-api` );
const request = require('request-promise');
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

var fetch_table_data = (td_class) => {
  return (x) => { return x.attribs !== undefined && x.attribs.class.includes(td_class) }
}

var convert_price = (price, rate=2.5) => {
  return (parseFloat(price)*rate).toFixed(2)
}

//SCG has this thing where the price is sometimes strikethrough.
//That functions checks if td content is a number.
//If it is, parse it. If it isn't, get the number, then parse it.
var get_price_from_table_data = (td_content) => {
  if(!td_content.children[0].hasOwnProperty("data")) {
    td_content = td_content.children[2];
  }
  return parseFloat(td_content.children[0].data.substring(1)).toFixed(2);
}

var find_and_fetch_price = (msg, match) => {
  const chatId = msg.chat.id;
  const cardName = match[1];
  const url = 'http://www.starcitygames.com/results?name='+encodeURI(cardName)+'&go.x=0&go.y=0';

  console.log(`${msg.chat.username} searched for: ${cardName}. URL: ${url}`);
  request(url)
    .then(function(html){
      let cards = [];
      let table_rows = $('.deckdbbody_row,.deckdbbody2_row', html);

      for(let i = 0; i < table_rows.length; i++) {
        if (table_rows[i].children.filter(
          fetch_table_data('search_results_7') // Card condition is in this column
        )[0].children[0].children[0].data == "NM/M") {

          let td_name = table_rows[i].children.filter(fetch_table_data('search_results_1'))[0]; // Card name is in this column
          let td_set = table_rows[i].children.filter(fetch_table_data('search_results_2'))[0]; // Card set is in this column
          let td_price = table_rows[i].children.filter(fetch_table_data('search_results_9'))[0]; // Card price is in this column

          // Each td has a tree of HTML until we get to the info that we think is important.
          // That's why we go through a bunch of children
          let scg_link = td_name.children[0].children[0].attribs["href"];
          let name = td_name.children[0].children[0].children[0].data;
          let set = td_set.children[1].children[0].data;
          let price = get_price_from_table_data(td_price);

          cards.push({
            scg_link: scg_link,
            name: name,
            set: set,
            price: `$ ${price}`,
            converted_price: `R$ ${convert_price(price)}`
          })

        }
      }

      if (cards.length > 0) {
        let grouped_cards = cards.groupBy("name")
        let message = ""

        for (const card_name of Object.keys(grouped_cards)) {
          message += `*${card_name.trim()}*\n`
          message += grouped_cards[card_name].reduce(
            (full_string, current_card) => {
              return `${full_string}${current_card["set"]}: ${current_card["price"]} → * ${current_card["converted_price"]}*\n`;
            }, "")
          message += "\n"
        }

        bot.sendMessage(chatId, message, {parse_mode : "markdown"});
      } else {
        bot.sendMessage(chatId, `Não foram encontrados resultados para "${cardName}"`, {parse_mode : "markdown"});
      }

    })
    .catch(function(err){
      console.log(err);
      bot.sendMessage(chatId, `Ocorreu um erro! Tente novamente mais tarde.`)
    });
}

bot.onText(/\/card (.+)/, function(msg, match) {
  find_and_fetch_price(msg, match)

});
bot.onText(/\/start/, function(msg, match) {
  bot.sendMessage(msg.chat.id, `Bem vindo! Utilize o comando */card <nome da carta>* para começar a verificar preços de cartas! A conversão segue a conversão x2,5.`, {parse_mode : "markdown"});
});
