// Animal Rescue Discord bot：/joke、/howtoplay、/spawns，仲有稀有動物出現就 ping
// 動物係用遊戲嘅「固定隨機」計出嚟（src/spawnPredict.js），所以 bot 唔使連去遊戲都知邊隻會出
import { readFileSync, writeFileSync } from 'node:fs';
import { Client, Events, GatewayIntentBits, Routes } from 'discord.js';
import { randomJoke } from './jokes.js';
import { howToPlayEmbed, spawnsEmbed, sharedFrenzy, newRareSpawns, rareMessage, GAME_URL } from './messages.js';

const { DISCORD_TOKEN, CHANNEL_ID, RARE_ROLE_ID } = process.env;
if (!DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN in .env (see .env.example)');
  process.exit(1);
}

// 講過嘅稀有動物（seed）：存落檔，bot 重開都唔會再 ping 一次
const SAVE = new URL('./announced.json', import.meta.url);
let announced = new Set();
try {
  announced = new Set(JSON.parse(readFileSync(SAVE, 'utf8')));
} catch {}
const remember = (list) => {
  list.forEach((a) => announced.add(a.seed));
  announced = new Set([...announced].slice(-300));
  try {
    writeFileSync(SAVE, JSON.stringify([...announced]));
  } catch (e) {
    console.warn('Could not save announced.json:', e.message);
  }
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  if (!CHANNEL_ID) return console.log('No CHANNEL_ID: rare-animal pings are off.');
  remember(newRareSpawns(announced)); // 啱啱開機：而家已經出咗嘅唔 ping（避免一開就嘈）
  setInterval(async () => {
    const list = newRareSpawns(announced);
    if (!list.length) return;
    remember(list);
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);
      await channel.send(rareMessage(list, RARE_ROLE_ID));
    } catch (e) {
      console.error('Could not post rare-animal ping:', e.message);
    }
  }, 5000);
});

// /play：開遊戲嘅 Discord Activity（要喺 Developer Portal 開咗 Activities）；開唔到就俾條網址
async function play(i) {
  try {
    if (typeof i.launchActivity === 'function') await i.launchActivity();
    else await client.rest.post(Routes.interactionCallback(i.id, i.token), { body: { type: 12 } }); // 12 = LAUNCH_ACTIVITY
  } catch (e) {
    console.warn('Could not launch the Activity (are Activities turned on?):', e.message);
    await i.reply(`🎮 Play Animal Rescue here: ${GAME_URL}\n(Or join a voice channel, click the 🚀 Activities button and pick **Animal Rescue**!)`);
  }
}

client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand()) return;
  try {
    if (i.commandName === 'joke') {
      const [q, a] = randomJoke();
      await i.reply(`😂 ${q}\n||${a}||`); // 答案用 spoiler 遮住，撳先睇到
    } else if (i.commandName === 'howtoplay') {
      await i.reply({ embeds: [howToPlayEmbed()] });
    } else if (i.commandName === 'play') {
      await play(i);
    } else if (i.commandName === 'spawns') {
      await i.reply({ embeds: [spawnsEmbed(Date.now(), await sharedFrenzy())] });
    }
  } catch (e) {
    console.error(`/${i.commandName} failed:`, e);
    if (!i.replied) await i.reply({ content: 'Oops, something went wrong. Try again!', ephemeral: true }).catch(() => {});
  }
});

client.login(DISCORD_TOKEN);
