// 唔使 Discord 都試到：印出 /spawns、/howtoplay、/joke 同下一個稀有動物 ping 會係點（npm run preview）
import { randomJoke } from './jokes.js';
import { howToPlayEmbed, spawnsEmbed, newRareSpawns, rareMessage } from './messages.js';

const show = (title, obj) => console.log(`\n===== ${title} =====\n` + JSON.stringify(obj, null, 2));
show('/joke', randomJoke());
show('/howtoplay', howToPlayEmbed());
show('/spawns', spawnsEmbed());

// 搵下一個稀有動物（每 5 秒試一次，最多 3 個鐘）
const seen = new Set(newRareSpawns(new Set()).map((a) => a.seed));
for (let t = Date.now(); t < Date.now() + 3 * 3600e3; t += 5000) {
  const list = newRareSpawns(seen, t);
  if (list.length) {
    show(`next rare ping (${new Date(t).toLocaleString()})`, rareMessage(list, '123456789', t));
    break;
  }
}
