// 啲訊息點樣寫（/howtoplay、/spawns、稀有動物 ping）：純函數，冇 Discord 連線，用 `npm run preview` 睇到
import { predictSpawns, NIGHT_LENGTH } from '../src/spawnPredict.js';
import { formatKg } from '../src/data/animals.js';
import { petMoney, rarityInfo, NEW_BIOME_DATE } from '../src/data/balance.js';
import { BIOMES } from '../src/data/biomeList.js';

export const GAME_URL = 'https://afreakydapizza.github.io/animal-rescue-game/';
const RARITY_EMOJI = { Common: '⚪', Rare: '🔵', Epic: '🟣', Legendary: '🟡', Mythic: '🔴', Eternal: '💠' };
const hex = (c) => parseInt(String(c).replace('#', ''), 16);
const ts = (ms, style = 'R') => `<t:${Math.floor(ms / 1000)}:${style}>`; // Discord 會用每個人自己嘅時區顯示

// 魔法王國（Biome 7）開咗未：到咗 NEW_BIOME_DATE，或者玩家撳咗紅色掣（每個人唔同，bot 唔知）
export function kingdomOpen(now = new Date()) {
  const [y, m, d] = NEW_BIOME_DATE.split('-').map(Number);
  return now >= new Date(y, m - 1, d);
}
const kingdomNote = () => (kingdomOpen() ? '' : ` *(opens ${NEW_BIOME_DATE}, or after you find the secret red button)*`);

const line = (a) => {
  const giant = a.sizeMul ? ` · 🔥 GIANT x${a.sizeMul}` : '';
  return `${RARITY_EMOJI[a.rarity] ?? '⚪'} **${a.animal.emoji ?? ''} ${a.animal.name}** · ${a.rarity} · ${formatKg(a.kg)} · $${petMoney(a.kg, a.biome, a.rarity).toLocaleString('en-US')}/s${giant}`;
};

export function howToPlayEmbed() {
  return {
    color: 0x43a047,
    title: '🐾 How to play Animal Rescue',
    url: GAME_URL,
    description: 'You are a Ranger. Rescue endangered animals from danger, care for them, and fill your Index!',
    fields: [
      { name: '1. Move', value: '**W A S D** to walk, mouse to look, **Space** to jump. On a phone, use the joystick and buttons.' },
      { name: '2. Train ⚡ Speed and 🧠 IQ', value: 'Stand on the **Treadmill** for Speed. Sit at the **Student Table** for IQ. Upgrade them with money to train faster.' },
      { name: '3. Borrow an animal', value: 'Walk into a Biome, find the animal in the **glowing circle** and press **E**. Jump over obstacles. If you touch one, answer the wildlife question!' },
      { name: '4. Run back to the Hub! 🏃', value: 'The Biome\'s **Boss** chases you (you get a 3-second head start). If he catches you, you fly back to the Hub and the animal runs away. Every Boss sign shows the Speed and IQ you need.' },
      { name: '5. Reproduce Machine 🧬', value: 'Put your rescued animal in a pink **Reproduce Machine** (press **E**). When it says READY, collect your pet.' },
      { name: '6. Your Plot 💰', value: 'Put pets on your **Plot**. They earn money every second. Heavier and rarer pets earn more!' },
      { name: '7. Night 🌙', value: 'Every 5 minutes it turns night for 20 seconds. The Biomes lock and **new animals spawn**. Machines are 10x faster at night.' },
      { name: '8. Events 🎉', value: 'Every :00 and :30 an event starts: Giant Pets, Rare Rush, Pet Frenzy, Training No Mercy, Troll Frenzy or Eclipse.' },
      { name: '9. Ranger Gym 💪', value: 'After the Laboratory explodes, a **Gym** appears next to the yard (opens Saturday 31 October). **4X Treadmill** = Speed x4, **Trampoline** = Jump Power, **Brain Bench** = Speed + IQ, **Climbing Wall of Wisdom** = IQ x4. The portal outside goes to the Secret Beach!' },
      { name: 'Keys', value: '**P** stats · **I** Index · **Q** quests · **1-0** hotbar · mouse wheel = zoom' },
    ],
    footer: { text: 'Type /spawns to see which animals are out right now!' },
  };
}

export function spawnsEmbed(now = Date.now()) {
  const p = predictSpawns(now);
  const ev = p.event;
  const nightLeft = NIGHT_LENGTH - ((now / 1000) % (5 * 60));
  const top = p.biomes.flatMap((b) => b.animals).sort((a, b) => rarityInfo(b.rarity).money - rarityInfo(a.rarity).money)[0];
  return {
    color: hex(rarityInfo(top.rarity).color),
    title: '🗺️ Wild animals right now',
    url: GAME_URL,
    description: [
      ev.active ? `${ev.ev.emoji} **${ev.ev.name}** is on! Ends ${ts(now + ev.left * 1000)}.` : `🎉 Next event ${ts(now + ev.next * 1000)}.`,
      nightLeft > 0 ? `🌙 It's night: the Biomes open ${ts(now + nightLeft * 1000)}.` : `🔄 New animals ${ts(p.nextRefresh)} (at ${ts(p.nextRefresh, 't')}).`,
    ].join('\n'),
    fields: p.biomes.map((b) => ({ name: b.name + (b.biome === 6 ? kingdomNote() : ''), value: b.animals.map(line).join('\n') || '—' })),
    footer: { text: 'Already rescued one? Then it\'s gone from your game until the next night.' },
  };
}

// 新出嘅 Legendary／Mythic／Eternal（未講過嘅 seed）
export function newRareSpawns(announced, now = Date.now()) {
  return predictSpawns(now).biomes.flatMap((b) => b.animals).filter((a) => a.special && !announced.has(a.seed));
}

export function rareMessage(list, roleId, now = Date.now()) {
  const ev = predictSpawns(now).event;
  const eternal = list.some((a) => a.rarity === 'Eternal');
  const lines = list.map((a) => `${line(a)}\n  in **${BIOMES[a.biome].name}**${a.biome === 6 ? kingdomNote() : ''}`);
  return {
    content: `${roleId ? `<@&${roleId}> ` : ''}${eternal ? '🥁✨ **ETERNAL ALERT!** ✨🥁' : '✨ **Rare animal alert!**'}`,
    allowedMentions: { roles: roleId ? [roleId] : [] },
    embeds: [{
      color: hex(rarityInfo(list[0].rarity).color),
      title: list.length > 1 ? `${list.length} rare animals just spawned!` : 'A rare animal just spawned!',
      url: GAME_URL,
      description: lines.join('\n') + (ev.active && ev.ev.id === 'troll' ? '\n\n🤡 **TROLL FRENZY:** the Bosses are 1,000,000x faster. Good luck!' : '') + `\n\n🏃 Gone ${ts(predictSpawns(now).nextRefresh)} - hurry!`,
      footer: { text: 'Follow the coloured light beam in the game!' },
    }],
  };
}
