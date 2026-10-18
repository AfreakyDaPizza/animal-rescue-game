// 簡單版（唔使開 bot、唔使部機長開）：GitHub Actions 每 5 分鐘行一次，用 Discord Webhook 出 post
//   node webhook.js        → 有新嘅 Legendary／Mythic／Eternal 就 post（同 ping RARE_ROLE_ID）
//   node webhook.js joke   → post 一個笑話
//   node webhook.js guide  → post 玩法教學（post 一次再 pin 住就得）
// Webhook 網址係秘密：放喺 GitHub 嘅 Secrets（DISCORD_WEBHOOK_URL），唔好寫入 code
import { randomJoke } from './jokes.js';
import { howToPlayEmbed, newRareSpawns, rareMessage } from './messages.js';
import { predictSpawns } from '../src/spawnPredict.js';

const { DISCORD_WEBHOOK_URL, RARE_ROLE_ID } = process.env;
const WINDOW_MS = 5 * 60 * 1000; // 同 GitHub Actions 嘅 cron 一樣

async function post(body) {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('No DISCORD_WEBHOOK_URL - would post:\n' + JSON.stringify(body, null, 2));
    return;
  }
  const res = await fetch(DISCORD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Discord said ${res.status}: ${await res.text()}`);
}

const mode = process.argv[2] || 'rare';
if (mode === 'joke') {
  const [q, a] = randomJoke();
  await post({ content: `😂 **Joke time!**\n${q}\n||${a}||` });
} else if (mode === 'guide') {
  await post({ embeds: [howToPlayEmbed()] });
} else {
  // 5 分鐘前已經喺度嘅唔再講，只講新出嘅
  const now = Date.now();
  const before = new Set(predictSpawns(now - WINDOW_MS).biomes.flatMap((b) => b.animals).map((a) => a.seed));
  const list = newRareSpawns(before, now);
  if (list.length) await post(rareMessage(list, RARE_ROLE_ID, now));
  else console.log('No new rare animals right now.');
}
