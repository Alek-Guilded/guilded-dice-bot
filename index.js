const http = require('http');
const WebSocket = require('ws');
const fetch = require('node-fetch');

/**
 * Server
 */
const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Test Server');
});

server.listen(port, hostname, () => {
  console.log(`  Server running at http://${hostname}:${port}/`);
});

/**
 * Dice roll bot
 */
const token = 'QT4zH6wkJfzITgPofGoBSwN8TKGCjJVlO/AWAKAA8ImzN2AFvsYprvZlkO8c7uofWPPzcla8zzys1aPpJUs6kA==';
const WS_URL = 'wss://api.guilded.gg/v1/websocket';
const GUILDED_BASE_URL = 'https://www.guilded.gg/api/v1';

const socket = new WebSocket(WS_URL, {
  headers: {
    Authorization: `Bearer ${token}`
  },
});

console.log(`  Websocket connecting to ${WS_URL}...`);

socket.on('open', function() {
  console.log('  Connected to Guilded!');
  console.log(`  Using base URL: ${GUILDED_BASE_URL}`);
});

// Dice rolling options
const HELP_MESSAGES = [
  'Hello there! I am a dice rolling bot. 🎲 \n' +  
  'I can roll dice for you!  Just let me know which dice to roll by using **!d** followed by the number of sides the dice should have. \n',

  'Dice bot here! 👋  Need some help?'
];

const COMMON_CMDS =
  '\nHere are some common commands you can use: \n' +
  '**!d6** - roll a 6 sided dice \n' +
  '**!d20** - roll a 20 sided dice \n' +
  '**!d100** - roll a 100 sided dice \n' +
  '**!3d6** - roll three 6 sided dice (I can only roll up to 10 dice at a time)';

const D_ZERO_MESSAGES = [
  `Rolling a d0... uhhh... wait how do I roll this thing? 🤔`,
  'You want me to roll a how many sided dice?  **Zero**?  Show me how to do this.',
  'Signs point to **zero**.',
  'Anyone have a spare d0 I can borrow? ...asking for a friend. 👀',
  'Did you mean to roll a d10?',
  'Did you mean to roll a d20?'
];

// Web socket that listens for new messages
socket.on('message', function incoming(data) {
  const {t: eventType, d: eventData} = JSON.parse(data);

  if (eventType === 'ChatMessageCreated') {
    const {message: {id: messageId, content, channelId}} = eventData;
    let input = content;
    let messageContent = input.toLowerCase();
    const regex = /,/ig;
    input = input.replace(regex, '');
    messageContent = messageContent.replace(regex, '');
    const replyMessageIds = [messageId];

    // Check for ! command... should we add other commands aside from !d commands?
    if (messageContent.indexOf('!') === 0) {
      if (messageContent === '!dhelp' || messageContent === '!d?') {
        const index = Math.floor(Math.random() * HELP_MESSAGES.length);
        const helpMessage = HELP_MESSAGES[index].concat(COMMON_CMDS);

        // Creates a new channel message
        fetch(`${GUILDED_BASE_URL}/channels/${channelId}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            "content": helpMessage,
            "replyMessageIds" : replyMessageIds
          }),
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })
          .then((response) => {
            // console.log('response: ', response);
          });
      } if (messageContent === '!d0') {
        const index = Math.floor(Math.random() * D_ZERO_MESSAGES.length);

        // Creates a new channel message
        fetch(`${GUILDED_BASE_URL}/channels/${channelId}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            "content": `${D_ZERO_MESSAGES[index]}`,
            "replyMessageIds" : replyMessageIds
          }),
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
      } else if (messageContent.indexOf('d') === 1 && input.length > 2) {
        let diceType = input.slice(1, input.length);
        let diceMax = messageContent.slice(2, messageContent.length);

        if (diceMax.toLowerCase() == 'pi') {
          diceMax = '3.14';
          diceType = '3.14';
        }

        let diceRoll;
        // Negative numbers we should round down, positive numbers round up
        if (messageContent.indexOf('d-') === 1) {
          diceRoll = Math.floor(Math.random() * diceMax);
        } else {
          diceRoll = Math.ceil(Math.random() * diceMax);
        }

        if (diceRoll && !isNaN(diceRoll)) {
          // Default message styling
          let diceRollMessage = `Rolling 1 ${diceType}`;
          let resultMessage = ` You rolled a **${diceRoll}**!`;
          if (diceMax.length > 3 && diceMax == Math.PI.toFixed(diceMax.length - 1).toString().slice(0, -1)) {
            diceRollMessage = `🥧 Rolling 1 ${diceType}`;
            resultMessage = `You rolled a **${diceRoll}**! 🥧`;
          }

          const messageArray = ['.', '.', '.', resultMessage];

          // Post new channel message
          createDiceRollMessage(diceRollMessage, messageArray, channelId, replyMessageIds, token);
        }
      } else if (
          (messageContent.indexOf('d') > 1)
          && messageContent.length > 3
        ) {
          let inputDiceAmount = messageContent.slice(1, messageContent.indexOf('d'));
          if (inputDiceAmount.toLowerCase() == 'pi') {
            inputDiceAmount = '3.14';
          }
          let diceAmount = parseInt(inputDiceAmount);

        if (diceAmount && !isNaN(diceAmount)) {
          let diceType = input.slice(messageContent.indexOf('d'), input.length);
          let diceMax = messageContent.slice((messageContent.indexOf('d') + 1), messageContent.length);
          if (diceMax.toLowerCase() == 'pi') {
            diceMax = '3.14';
            diceType = '3.14';
          }

          let diceRollMessage = `Rolling ${diceAmount} ${diceType}s`;

          if ((diceMax.length > 3 && diceMax == Math.PI.toFixed(diceMax.length - 1).toString().slice(0, -1)) || (inputDiceAmount.length > 3 && inputDiceAmount == Math.PI.toFixed(inputDiceAmount.length - 1).toString().slice(0, -1))) {
            diceRollMessage = `🥧 Rolling ${inputDiceAmount} ${diceType}s`;
          }
          if (diceAmount === 1) {
            diceRollMessage = diceRollMessage.slice(0, -1);
          }

         

          // Only allow max of 10 dice and only positive numbers
          if (diceAmount > 10) {
            diceRollMessage = `Sorry, I only have 10 magic dice to roll at a time. \n Rolling ${10} ${diceType}s`
          } else if (diceAmount < -10) {
            diceRollMessage = `Sorry, I only have -10 magic *negative* dice to roll at a time. \n Rolling ${-10} ${diceType}s`
          }
          diceAmount = Math.min(Math.abs(diceAmount), 10);
          
          if (diceMax && !isNaN(diceMax)) {
            let diceRoll;
            let resultMessage = ['You rolled '];
            for (let i = 0; i < diceAmount; i++) {
              // Negative numbers we should round down, positive numbers round up
              if (messageContent.indexOf('d-') != -1) {
                diceRoll = Math.floor(Math.random() * diceMax);
              } else {
                diceRoll = Math.ceil(Math.random() * diceMax);
              }
              if (i === (diceAmount - 1)) {
                resultMessage.push(`${diceRoll}!`);
                if ((diceMax.length > 3 && diceMax == Math.PI.toFixed(diceMax.length - 1).toString().slice(0, -1)) || (inputDiceAmount.length > 3 && inputDiceAmount == Math.PI.toFixed(inputDiceAmount.length - 1).toString().slice(0, -1))) {
                  resultMessage.push(` 🥧`);
                }
              } else {
                resultMessage.push(`${diceRoll} | `);
              }
            }

            let messageArray = ['.', '.', '.'];

            for (let i = 0; i < resultMessage.length; i++) {
              messageArray.push(resultMessage[i]);
            }

            // Post new channel message
            createDiceRollMessage(diceRollMessage, messageArray, channelId, replyMessageIds, token);
          }
        }
      }
    }
  }
});

async function createDiceRollMessage(startMessage, messageArray, channelId, replyMessageIds, token) {
  let messageId;
  await fetch(`${GUILDED_BASE_URL}/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      "content":`${startMessage}`,
      "replyMessageIds" : replyMessageIds
    }),
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  })
    .then((response) => {
      // console.log('response: ', response);
      return response.json();
    })
      .then((json) => {
        messageId = json.message.id;
        iterateUpdateMessages(messageArray, channelId, messageId, startMessage, token, 0);
      });
}

async function updateChannelMessage(channelId, messageId, newMessage, token) {
  await fetch(`${GUILDED_BASE_URL}/channels/${channelId}/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify({"content":`${newMessage}`}),
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  })
    .then((response) => {
      return response.json();
    })
}

async function iterateUpdateMessages(messageArray, channelId, messageId, startMessage, token, i) {
  let newMessage = startMessage;
  newMessage = newMessage.concat(messageArray[i]);

  await updateChannelMessage(channelId, messageId, newMessage, token)
    .then(() => {
      const next = i + 1;
      if (next < messageArray.length) {
        iterateUpdateMessages(messageArray, channelId, messageId, newMessage, token, next);
      }
    })
}
