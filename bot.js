const tmi = require('tmi.js');
const fetch = require('node-fetch');

const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: 'YourBotName',
    password: process.env.TWITCH_OAUTH_TOKEN
  },
  channels: ['YourTwitchChannel']
});

const TWITCH_CHANNEL = 'YourTwitchChannel';
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
let isLive = false;

const cytubeRoom = 'your-room-name';
const cytubeBaseUrl = 'https://cytu.be';

client.connect().catch(console.error);

async function checkLiveStatus() {
  try {
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${TWITCH_CHANNEL}`, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${TWITCH_TOKEN}`
      }
    });
    const data = await response.json();
    const wasLive = isLive;
    isLive = data.data && data.data.length > 0;

    if (isLive && !wasLive) {
      console.log('Channel went live, bot disconnecting.');
      client.disconnect().catch(console.error);
    } else if (!isLive && wasLive) {
      console.log('Channel offline, bot reconnecting.');
      client.connect().catch(console.error);
    }
  } catch (error) {
    console.error('Error checking live status:', error);
  }
}

setInterval(checkLiveStatus, 30000);
checkLiveStatus();

client.on('message', (channel, tags, message, self) => {
  if (self || isLive) return;

  if (message.startsWith('!addtrack')) {
    const trackUrl = message.split(' ')[1];
    if (!trackUrl || (!trackUrl.includes('youtube.com') && !trackUrl.includes('youtu.be'))) {
      client.say(channel, 'Please provide a valid YouTube URL!');
      return;
    }
    addToCytubePlaylist(trackUrl, channel);
  }
});

async function addToCytubePlaylist(url, channel) {
  try {
    const response = await fetch(`${cytubeBaseUrl}/socket.io/?room=${cytubeRoom}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'queue',
        data: { url: url, temp: true }
      })
    });

    if (response.ok) {
      client.say(channel, `Added ${url} to the CyTube playlist!`);
    } else {
      client.say(channel, 'Failed to add track. Check URL or room!');
    }
  } catch (error) {
    console.error(error);
    client.say(channel, 'Something went wrong!');
  }
}
