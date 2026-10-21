// ☄️ METEORIC SHOP（小朋友 Issue #10）：喺 Hub 嘅 Magic Library 隔籬，用 💎 Meteor Crystals 買嘢
// 🎮 GAME NUMBERS — you can change these yourself! Only change the NUMBERS.
//
// 寵物：淨係 Meteoric Chest（同 Cosmic Arcadragon 直接買）先有，唔喺生態區／蛋度出
// biome 9 = 同 Abandoned Manor 一樣嘅底價（俾錢用，同 Zombified Chest 寵物一樣）

// ---- 💎 Prices (Meteor Crystals) ----
export const METEORIC_SHARD_COST = 250; // ☄️ Meteoric Shard: gives a pet a bluey METEORIC look and x5 money
export const METEOR_CHEST_COST = 100; // 🧰 Meteoric Chest
export const METEOR_BOSS_SKIN_COST = 500; // 🦹 Meteoric Boss Skin (buy once, then press E at any boss)
export const ARCADRAGON_COST = 1000; // 🐉 Cosmic Arcadragon (Eternal)

// ---- ✖️ Meteoric Crystals Multiplier ----
// Every time you buy it, the crystals you pick up are multiplied by 0.5 more: x1 → x1.5 → x2 → x2.5 ...
// Price: MULTIPLIER_BASE_COST x MULTIPLIER_COST_GROWTH for every one you already bought
//   (50, 80, 128, 205, 328, 524 ...). MULTIPLIER_MAX = the biggest it can go.
export const MULTIPLIER_STEP = 0.5;
export const MULTIPLIER_BASE_COST = 50;
export const MULTIPLIER_COST_GROWTH = 1.6;
export const MULTIPLIER_MAX = 10;
export const multiplierBought = (mult = 1) => Math.round(((mult || 1) - 1) / MULTIPLIER_STEP);
export const multiplierCost = (mult = 1) => Math.round(MULTIPLIER_BASE_COST * MULTIPLIER_COST_GROWTH ** multiplierBought(mult));

// ---- 🐉 Cosmic Arcadragon money ----
// Each Cosmic Arcadragon gets its own random money per second between these 2 numbers (it keeps it forever)
export const ARCADRAGON_MONEY = [500000000, 1000000000];

// ---- 🧰 What's inside the Meteoric Chest ----
// The kid's numbers add up to 101%, so the game shares them out fairly (each one ÷ 101 × 100):
// 60 → 59.4%, 25 → 24.8%, 10 → 9.9%, 4.5 → 4.5%, 0.5 → 0.5%, 1 → 1.0%
export const METEOR_CHEST_DROPS = [
  { name: 'Meteoric Soul', rarity: 'Common', chance: 60 },
  { name: 'Meteor Elephant', rarity: 'Rare', chance: 25 },
  { name: 'Meteoric Walrus', rarity: 'Epic', chance: 10 },
  { name: 'Meteor Golem Bros', rarity: 'Legendary', chance: 4.5 },
  { name: 'Meteor Dragon', rarity: 'Mythic', chance: 0.5 },
  { name: 'Astral Reroll', rarity: 'Eternal', chance: 1, gear: 'astralReroll', emoji: '🌌' }, // 🌌 Astral mutation reroll（入 state.gears）
];
const TOTAL = METEOR_CHEST_DROPS.reduce((n, d) => n + d.chance, 0);
export const chestPercent = (d) => Math.round((d.chance / TOTAL) * 1000) / 10; // 真正機會率（%，一個小數位）

export function rollMeteorChest(rand = Math.random()) {
  let roll = rand * TOTAL;
  return { ...(METEOR_CHEST_DROPS.find((d) => (roll -= d.chance) < 0) || METEOR_CHEST_DROPS[0]) };
}

const COSMIC = 'Meteoric pet (not a real animal!)';
export const METEOR_PETS = [
  { name: 'Meteoric Soul', rarity: 'Common', kg: [3, 8], emoji: '☄️',
    fact: 'A tiny shooting star that turned into a friendly spirit. Real meteors are space rocks that glow when they zoom into our sky!' },
  { name: 'Meteor Elephant', rarity: 'Rare', kg: [2500, 5000], emoji: '🐘',
    fact: 'An elephant made of blue space rock with crystal tusks. Real elephants are Endangered because people hunt them for ivory tusks.' },
  { name: 'Meteoric Walrus', rarity: 'Epic', kg: [800, 1500], emoji: '🦭',
    fact: 'A chubby walrus with glowing crystal tusks. Real walruses need sea ice to rest on, and the ice is melting.' },
  { name: 'Meteor Golem Bros', rarity: 'Legendary', kg: [600, 1200], emoji: '🗿',
    fact: 'Two little golem brothers made from the same meteor. They never go anywhere without each other!' },
  { name: 'Meteor Dragon', rarity: 'Mythic', kg: [400, 800], emoji: '🐉',
    fact: 'A dragon born inside a falling star. Its wings sparkle like the night sky. The real Komodo Dragon is Endangered.' },
  { name: 'Cosmic Arcadragon', rarity: 'Eternal', kg: [2000, 4000], emoji: '🌌', bought: true,
    fact: 'The king of the cosmos! Magic rings spin around it and it makes $500M to $1B every second.' },
].map((p) => ({ ...p, biome: 9, meteoric: true, status: COSMIC, magical: true }));
