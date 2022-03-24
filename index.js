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
  console.log(`Server running at http://${hostname}:${port}/`);
});

/**
 * Dice roll bot
 */
const token = 'YOUR_BOT_ACCESS_TOKEN';
const socket = new WebSocket('wss://api.guilded.gg/v1/websocket', {
  headers: {
    Authorization: `Bearer ${token}`
  },
});
socket.on('open', function() {
  console.log('Connected to Guilded!');
});

// Dice rolling options
const INCLUDE_EMOJIS = false;
const D_ZERO_MESSAGES = [
  `Rolling a d0... uhhh... wait how do I roll this thing? 🤔`,
  'You want me to roll a how many sided dice?  **Zero**?  Show me how to do this.',
  'Signs point to **zero**',
  'Anyone have a spare d0 I can borrow? ...asking for a friend 👀',
  'Did you mean to roll a d10?',
  'Did you mean to roll a d20?'
]

// Web socket that listens for new messages
socket.on('message', function incoming(data) {
  const {t: eventType, d: eventData} = JSON.parse(data);

  if (eventType === 'ChatMessageCreated') {
    const {message: {id: messageId, content, channelId}} = eventData;
    messageContent = content.toLowerCase();

    // Check for ! command... should we add other commands aside from !d commands?
    if (messageContent.indexOf('!') === 0) {
      if (messageContent === '!d0') {
        const index = Math.round(Math.random() * D_ZERO_MESSAGES.length)

        // Creates a new channel message
        fetch(`https://www.guilded.gg/api/v1/channels/${channelId}/messages`, {
          method: 'POST',
          body: JSON.stringify({"content": `${D_ZERO_MESSAGES[index]}`}),
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
      } else if (messageContent.indexOf('d') === 1 && content.length > 2) {
        const diceType = content.slice(1, content.length);
        const diceMax = content.slice(2, content.length);
        const diceRoll = Math.ceil(Math.random() * diceMax);


        if (diceRoll && !isNaN(diceRoll)) {
          // Default message styling
          let diceRollMessage = `Rolling 1 ${diceType}`;
          let resultMessage = ` You rolled a **${diceRoll}**!`

          // If INCLUDE_EMOJIS is set to true, the posted message will 
          // include emojis to influence the tone of the resulting roll.
          // These emojis assume the max is good and the min is bad.
          if (INCLUDE_EMOJIS) {
            if (diceRoll === diceMax) {
              resultMessage = ` You rolled a **${diceRoll}**! 🤩`
            }
    
            if (diceRoll > (diceMax / 2)) {
              resultMessage = ` You rolled a **${diceRoll}**! 😄`
            }
    
            if (diceRoll <= (diceMax / 2)) {
              resultMessage = ` You rolled a **${diceRoll}**! 😕`
            }
    
            if (diceRoll === 1) {
              resultMessage = ` You rolled a **${diceRoll}**! 😦`
            }
          }

          // Post new channel message
          createDiceRollMessage(diceRollMessage, resultMessage, channelId, token);
        }
      }
    }
  }
});

async function createDiceRollMessage(startMessage, endMessage, channelId, token) {
  let updateMessage = startMessage;
  let messageId;
  await fetch(`https://www.guilded.gg/api/v1/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({"content":`${startMessage}`}),
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  })
    .then((response) => {
      return response.json();
    })
      .then((json) => {
        messageId = json.message.id;
        updateMessage = updateMessage.concat('.');
        updateChannelMessage(channelId, messageId, updateMessage, token)
          .then(() => {
            updateMessage = updateMessage.concat('.');
            updateChannelMessage(channelId, messageId, updateMessage, token)
              .then(() => {
                updateMessage = updateMessage.concat('.');
                updateChannelMessage(channelId. messageId, updateMessage, token)
                  .then(() => {
                    updateMessage = updateMessage.concat(endMessage);
                    updateChannelMessage(channelId, messageId, updateMessage, token)
                  })
              })
          })
          .catch((error) => {
            console.log('Error updating channel message: ', error);
          });;
      });
}

async function updateChannelMessage(channelId, messageId, newMessage, token) {
  await fetch(`https://www.guilded.gg/api/v1/channels/${channelId}/messages/${messageId}`, {
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
