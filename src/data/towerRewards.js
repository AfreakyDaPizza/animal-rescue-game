// 🗼 Endless Witch Tower rewards (kid, Issue #11) — change the numbers here!
// "The more floors + zombies you beat, the rarer and cooler stuff you get."
//
// How it works:
// - 🎒 After every floor you win ONE reward (TWO on deep floors) from the list for that floor. It goes in your TOWER BAG.
//   Every 🧟 zombie you poof and every 💚 animal you cure also puts a little bit in the bag.
//   Leave by the 🚪 door = you get the WHOLE bag. Knocked out = you keep TOWER_KO_KEEP of it (balance.js, 0.5 = half).
// - 🏆 MILESTONE floors (5, 10, 15, 20, 25...) give a BIG prize straight away (safe, even if you get knocked out later).
//
// Each reward: { type, amount, weight }
//   type   = what you get (list below)
//   amount = how many: a number, or [min, max] for a random number in between
//   grow   = true: the amount gets bigger on higher floors (× (1 + TOWER_REWARD_GROWTH × (floor − 1)))
//   weight = how often it is picked compared to the others in the same list (bigger = more often)
//
// Types: candyCorn 🌽 · souls 💀 · skeleTokens ☠️ · money 💰 · speed ⚡ · iq 🧠 · jump 🦘 · soulCandy 🍬
//        zombieChest 🧟 · demonicChest 😈 · halloweenEgg 🥚 (random Halloween egg) · lavaBloomEgg 🌋 (Legendary egg)
//        pumpkgrimEgg 🎃 (Mythic egg) · demonicShard 😈 (DEMONIC x10 mutation) · demonicSkin (Demonic Ranger skin)
//        demonicBossSkin (Demonic Boss Skin) — a skin you already have turns into 25 ☠️ Skele Tokens

export const TOWER_REWARD_GROWTH = 0.12;

// 🎚️ Modes (kid, Issue #12): pick one at the tower door. Your best floor is kept for each mode.
//   hp      = enemy HP × this          speed = enemy speed × this
//   damage  = how hard enemies hit: hits take 2 ❤️ from floor TOWER_DOUBLE_DAMAGE_FLOOR ÷ damage (Easy: never)
//   rewards = reward amounts × this    rare  = rare stuff (TOWER_RARE_TYPES) is picked this many times more often
export const TOWER_MODES = {
  easy: { name: 'Easy', emoji: '🟢', hp: 0.6, speed: 0.85, damage: 0.6, rewards: 0.6, rare: 0.7, color: '#69f0ae', desc: 'Weaker, slower enemies. Smaller rewards.' },
  medium: { name: 'Medium', emoji: '🟡', hp: 1, speed: 1, damage: 1, rewards: 1, rare: 1, color: '#ffd740', desc: 'The normal tower.' },
  hard: { name: 'Hard', emoji: '🔴', hp: 1.6, speed: 1.15, damage: 1.6, rewards: 2, rare: 2.5, color: '#ff5252', desc: 'Tough, fast enemies that hit hard. DOUBLE rewards and rarer drops!' },
};
export const TOWER_MODE_ORDER = ['easy', 'medium', 'hard'];

// After each floor: the LAST list whose "from" floor you have reached is used
export const TOWER_FLOOR_TIERS = [
  {
    from: 1, name: 'Early floors', picks: 1,
    rewards: [
      { type: 'candyCorn', amount: [40, 120], grow: true, weight: 30 },
      { type: 'souls', amount: [20, 60], grow: true, weight: 25 },
      { type: 'skeleTokens', amount: [2, 5], grow: true, weight: 20 },
      { type: 'money', amount: [5000, 20000], grow: true, weight: 15 },
      { type: 'speed', amount: [5, 15], weight: 5 },
      { type: 'iq', amount: [5, 15], weight: 5 },
      { type: 'jump', amount: [1, 3], weight: 3 },
    ],
  },
  {
    from: 6, name: 'Middle floors', picks: 1,
    rewards: [
      { type: 'candyCorn', amount: [100, 250], grow: true, weight: 18 },
      { type: 'souls', amount: [50, 120], grow: true, weight: 16 },
      { type: 'skeleTokens', amount: [5, 10], grow: true, weight: 18 },
      { type: 'money', amount: [20000, 60000], grow: true, weight: 10 },
      { type: 'zombieChest', amount: 1, weight: 12 },
      { type: 'halloweenEgg', amount: 1, weight: 10 },
      { type: 'demonicChest', amount: 1, weight: 6 },
      { type: 'soulCandy', amount: 1, weight: 4 },
      { type: 'speed', amount: [15, 30], weight: 3 },
      { type: 'iq', amount: [15, 30], weight: 3 },
    ],
  },
  {
    from: 16, name: 'Deep floors', picks: 2,
    rewards: [
      { type: 'skeleTokens', amount: [10, 20], grow: true, weight: 20 },
      { type: 'candyCorn', amount: [200, 500], grow: true, weight: 12 },
      { type: 'souls', amount: [100, 250], grow: true, weight: 10 },
      { type: 'demonicChest', amount: 1, weight: 14 },
      { type: 'zombieChest', amount: [1, 2], weight: 10 },
      { type: 'halloweenEgg', amount: 1, weight: 10 },
      { type: 'soulCandy', amount: [1, 2], weight: 6 },
      { type: 'lavaBloomEgg', amount: 1, weight: 4 },
      { type: 'pumpkgrimEgg', amount: 1, weight: 1.5 },
      { type: 'demonicShard', amount: 1, weight: 1.5 },
      { type: 'demonicSkin', amount: 1, weight: 0.6 },
      { type: 'demonicBossSkin', amount: 1, weight: 0.3 }, // super rare!
    ],
  },
  {
    from: 26, name: 'Super deep floors', picks: 2,
    rewards: [
      { type: 'skeleTokens', amount: [20, 40], grow: true, weight: 20 },
      { type: 'demonicChest', amount: [1, 2], weight: 16 },
      { type: 'halloweenEgg', amount: [1, 2], weight: 10 },
      { type: 'soulCandy', amount: [1, 3], weight: 8 },
      { type: 'lavaBloomEgg', amount: 1, weight: 7 },
      { type: 'pumpkgrimEgg', amount: 1, weight: 3 },
      { type: 'demonicShard', amount: 1, weight: 3 },
      { type: 'demonicSkin', amount: 1, weight: 1 },
      { type: 'demonicBossSkin', amount: 1, weight: 0.6 },
    ],
  },
];

// Little extras for every enemy (they go in the 🎒 bag)
export const TOWER_PER_ZOMBIE = { type: 'candyCorn', amount: 5, grow: true }; // 🧟 each zombie you poof
export const TOWER_PER_CURE = { type: 'souls', amount: 8, grow: true }; // 💚 each animal you cure
export const TOWER_PER_BOSS = { type: 'skeleTokens', amount: 10, grow: true }; // 👑 each mini-boss

// 🏆 Milestone floors: you get ALL of these straight away
export const TOWER_MILESTONES = {
  5: [{ type: 'skeleTokens', amount: 25 }, { type: 'zombieChest', amount: 1 }, { type: 'candyCorn', amount: 500 }],
  10: [{ type: 'skeleTokens', amount: 50 }, { type: 'demonicChest', amount: 1 }, { type: 'halloweenEgg', amount: 1 }],
  15: [{ type: 'skeleTokens', amount: 75 }, { type: 'demonicChest', amount: 2 }, { type: 'soulCandy', amount: 1 }, { type: 'lavaBloomEgg', amount: 1 }],
  20: [{ type: 'skeleTokens', amount: 100 }, { type: 'demonicChest', amount: 2 }, { type: 'pumpkgrimEgg', amount: 1 }, { type: 'demonicShard', amount: 1 }],
  25: [{ type: 'skeleTokens', amount: 150 }, { type: 'demonicChest', amount: 3 }, { type: 'demonicSkin', amount: 1 }],
  30: [{ type: 'skeleTokens', amount: 200 }, { type: 'demonicChest', amount: 3 }, { type: 'demonicBossSkin', amount: 1 }],
};
// Milestones after floor 30 (35, 40, 45...): these, plus ONE random pick from TOWER_MILESTONE_BONUS
export const TOWER_MILESTONE_LATER = [{ type: 'skeleTokens', amount: 200 }, { type: 'demonicChest', amount: 3 }];
export const TOWER_MILESTONE_BONUS = [
  { type: 'pumpkgrimEgg', amount: 1, weight: 3 },
  { type: 'lavaBloomEgg', amount: 2, weight: 3 },
  { type: 'demonicShard', amount: 1, weight: 3 },
  { type: 'soulCandy', amount: 3, weight: 2 },
  { type: 'demonicBossSkin', amount: 1, weight: 1 },
];

// How each type looks in the 🎒 bag and on the results card
export const TOWER_REWARD_LOOK = {
  candyCorn: ['🌽', 'Candy Corn'], souls: ['💀', 'Souls'], skeleTokens: ['☠️', 'Skele Tokens'], money: ['💰', 'Money'],
  speed: ['⚡', 'Speed'], iq: ['🧠', 'IQ'], jump: ['🦘', 'Jump Power'], soulCandy: ['🍬', 'Soul Candy'],
  zombieChest: ['🧟', 'Zombified Chest'], demonicChest: ['😈', 'Demonic Chest'], halloweenEgg: ['🥚', 'Halloween Egg'],
  lavaBloomEgg: ['🌋', 'Lava Bloom Egg'], pumpkgrimEgg: ['🎃', 'Pumpkgrim Egg'], demonicShard: ['🔻', 'Demonic Shard'],
  demonicSkin: ['😈', 'Demonic Ranger Skin'], demonicBossSkin: ['👹', 'Demonic Boss Skin'],
};
// Rare stuff gets a gold glow on the reward card
export const TOWER_RARE_TYPES = ['demonicChest', 'lavaBloomEgg', 'pumpkgrimEgg', 'demonicShard', 'demonicSkin', 'demonicBossSkin', 'soulCandy'];

// ---------- （下面係程式：計數，唔使改）----------
const pickAmount = (a) => (Array.isArray(a) ? a[0] + Math.random() * (a[1] - a[0]) : a);
const COUNT_TYPES = ['zombieChest', 'demonicChest', 'halloweenEgg', 'lavaBloomEgg', 'pumpkgrimEgg', 'demonicShard', 'demonicSkin', 'demonicBossSkin', 'soulCandy', 'speed', 'iq', 'jump'];
const ONE_ONLY = ['demonicSkin', 'demonicBossSkin']; // 皮膚：唔會因為 Hard 變兩個
const modeOf = (mode) => TOWER_MODES[mode] || TOWER_MODES.medium;
// 一樣獎 → { type, amount }（amount 計埋層數同難度）
export function rollAmount(r, floor, mode = 'medium') {
  let n = pickAmount(r.amount ?? 1);
  if (r.grow) n *= 1 + TOWER_REWARD_GROWTH * Math.max(0, floor - 1);
  if (!ONE_ONLY.includes(r.type)) n *= modeOf(mode).rewards;
  n = COUNT_TYPES.includes(r.type) || n < 10 ? Math.max(1, Math.round(n)) : Math.round(n / 5) * 5;
  return { type: r.type, amount: n };
}
function weighted(list, rare = 1) {
  const w = (r) => (r.weight || 0) * (TOWER_RARE_TYPES.includes(r.type) ? rare : 1);
  const total = list.reduce((s, r) => s + w(r), 0);
  let x = Math.random() * total;
  return list.find((r) => (x -= w(r)) < 0) || list[0];
}
export const tierFor = (floor) => [...TOWER_FLOOR_TIERS].reverse().find((t) => floor >= t.from) || TOWER_FLOOR_TIERS[0];
// 打完第 floor 層：抽幾樣（入袋）
export function rollFloorRewards(floor, mode = 'medium') {
  const tier = tierFor(floor);
  return Array.from({ length: tier.picks || 1 }, () => rollAmount(weighted(tier.rewards, modeOf(mode).rare), floor, mode));
}
// 里程碑（5、10、15…）：即刻俾；唔係里程碑 = null
export function milestoneRewards(floor, mode = 'medium', every = 5) {
  if (floor % every) return null;
  if (TOWER_MILESTONES[floor]) return TOWER_MILESTONES[floor].map((r) => rollAmount(r, floor, mode));
  const last = Math.max(...Object.keys(TOWER_MILESTONES).map(Number));
  if (floor < last) return null;
  return [...TOWER_MILESTONE_LATER, weighted(TOWER_MILESTONE_BONUS, modeOf(mode).rare)].map((r) => rollAmount(r, floor, mode));
}
