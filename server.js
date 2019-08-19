const url = `https://${process.env.HEROKU_APP_NAME}.herokuapp.com:443`;
const token = process.env.TOKEN;

const TelegramBot = require( 'node-telegram-bot-api' );
const request = require('request-promise');
const $ = require('cheerio');
const mtg = require('mtgsdk')
require('dotenv').config();

const options = {
  webHook: {
    port: process.env.PORT
  }
};

const scryfallUrl = 'https://api.scryfall.com/cards/search?include_multilingual=true&'

const bot = new TelegramBot(token, options);
bot.setWebHook(`${url}/bot${token}`);

// const bot = new TelegramBot( , { polling: true } )

Array.prototype.groupBy = function(prop) {
  return this.reduce(function(groups, item) {
    const val = item[prop]
    groups[val] = groups[val] || []
    groups[val].push(item)
    return groups
  }, {})
}

var sendErrorMessage = (chatId) => {
  bot.sendMessage(chatId, `Ocorreu um erro! Tente novamente mais tarde.`)
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

var fetch_table_data = (td_class) => {
  return (x) => { return x.attribs !== undefined && x.attribs.class.includes(td_class) }
}

var table_row_contains_card_with_mint_condition = (table_row) => {
  return table_row.children.filter(
    fetch_table_data('search_results_7')
  )[0].children[0].children[0].data == "NM/M"
}

var append_card_info_onto_message_string = (message_string, card_info) => {
  return `${message_string}${card_info["set"]}: ${card_info["price"]} → * ${card_info["converted_price"]}*\n`;
}

var assemble_message_from_grouped_cards = (grouped_cards) => {
  let message = ""
  for (const card_name of Object.keys(grouped_cards)) {
    message += `*${card_name.trim()}*\n`
    message += grouped_cards[card_name].reduce(append_card_info_onto_message_string, "")
    message += "\n"
  }
  return message
}

var get_card_from_table_row = (table_row) => {
  let td_name = table_row.children.filter(fetch_table_data('search_results_1'))[0]; // Card name is in this column
  let td_set = table_row.children.filter(fetch_table_data('search_results_2'))[0]; // Card set is in this column
  let td_price = table_row.children.filter(fetch_table_data('search_results_9'))[0]; // Card price is in this column

  // Each td has a tree of HTML until we get to the info that we think is important.
  // That's why we go through a bunch of children
  let scg_link = td_name.children[0].children[0].attribs["href"];
  let name = td_name.children[0].children[0].children[0].data;
  let set = td_set.children[1].children[0].data;
  let price = get_price_from_table_data(td_price);

  return {
    scg_link: scg_link,
    name: name,
    set: set,
    price: `$ ${price}`,
    converted_price: `R$ ${convert_price(price)}`
  }
}

var find_and_fetch_price = (msg, cardName) => {
  const chatId = msg.chat.id;
  const url = 'http://www.starcitygames.com/results?name='+encodeURI(cardName)+'&go.x=0&go.y=0';

  console.log(`User ${msg.chat.first_name} searched for: ${cardName}. URL: ${url}`);

  request(url)
    .then(function(html){
      let message = "";
      let cards = [];
      let table_rows = $('.deckdbbody_row,.deckdbbody2_row', html);

      for(let i = 0; i < table_rows.length; i++) {
        if (table_row_contains_card_with_mint_condition(table_rows[i])) {
          cards.push(get_card_from_table_row(table_rows[i]));
        }
      }

      if (cards.length > 0) {
        let grouped_cards = cards.groupBy("name");
        message = assemble_message_from_grouped_cards(grouped_cards);
      } else {
        message = `Não foram encontrados resultados para "${cardName}"`
      }

      bot.sendMessage(chatId, message, {parse_mode : "markdown"});

    })
    .catch(function(err){
      console.log(err);
      sendErrorMessage(chatId);
    });
}

var filter_cards_from_languages = (cards, languages) => {
  return cards.filter((card) => { return languages.includes(card.lang); });
}

var get_card_names_from_languages = (cards, languages = ['en', 'pt']) => {
  filtered_cards = filter_cards_from_languages(cards, languages);
  return filtered_cards.map((card) =>
    {
      text = card.printed_name || card.name
      return [{"text": text, "callback_data": card.name }]
    }
  )
}

var create_keyboard = (card_names) => {
  return {
    "reply_markup": {
    "inline_keyboard": card_names
    }
  }
}

var find_cards_on_scryfall = (msg) => {
  query = scryfallUrl+`q=${encodeURI(msg.text)}`
  console.log("Query Executada pelo usuário:");
  console.log(query);
  request(query)
    .then(function(response){
      possible_cards = JSON.parse(response)["data"];
      card_names = get_card_names_from_languages(possible_cards);
      if (card_names.length == 1) {
        find_and_fetch_price(msg, card_names[0][0].callback_data)
      } else {
        let txt = "";
        let options = "";
        if (card_names.length > 1) {
          options = create_keyboard(card_names);
          txt = 'Foram encontradas algumas possibilidades. Por favor, escolha a carta correta: ';
        } else {
          txt = 'Não foram encontradas cartas com esse nome no banco de dados do Scryfall';
        }
        bot.sendMessage(msg.chat.id, txt, options);
      }
    })
    .catch(function(err){
      console.log(err);
      sendErrorMessage(msg.chat.id)
    });
}

bot.on('message', (msg) => {
  if(msg.text.match(/\/card (.+)/)) {
    bot.sendMessage(msg.chat.id, "Agora você não precisa mais do comando */card <nome da carta>* para pesquisar! Ah, você também pode pesquisar em português :)", {parse_mode : "markdown"})
  } else {
    find_cards_on_scryfall(msg);
  }
})

bot.on('callback_query', function onCallbackQuery(choice){
  console.log(choice);
  const chosen_card = choice.data // This is responsible for checking the content of callback_data
  const msg = choice.message

  find_and_fetch_price(msg, chosen_card)
});
