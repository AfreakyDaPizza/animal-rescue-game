// 🤠 CATCH & TAME 活動（小朋友 Issue #16，2026-11-06）：所有數值同共用名都喺呢度（幾個幫手一齊做，大家跟呢份）
// The kid can change the numbers here (English comments). Keep it fair: upgrades are EXPENSIVE, nothing overpowered.
//
// ---- 共用 state（state.js DEFAULTS 已經加咗）----
//   state.tameTokens   🤠 Tame Tokens：Catch & Tame 每馴服一隻動物得到（Special's Stall 用）
//   state.lassoLevel   🪢 套索等級 1–10（Lasso Sam 用錢升）→ LASSO_LEVELS[lv-1]
//   state.fluteLevel   🎵 馴服笛等級 1–10（Tamer Ayden 用錢升）→ FLUTE_LEVELS[lv-1]
//   state.totalTames   總共馴服咗幾多隻（統計）
//   state.rodeoBest    { savanna, desert, taiga }：每張地圖最遠幾多米
//   state.ridePet      騎緊／裝備咗嘅坐騎寵物：state.pets 入面嗰隻嘅 index（null = 冇）
//   寵物 pet.rideable = true → 用過 🐎 Ridable Shard（有馬鞍，可以騎）
//   寵物 pet.mutation 可以有 'tame'（🤠 TAME 變異，MUTATIONS 入面）
//
// ---- 共用檔名（邊個幫手做邊樣）----
//   src/rodeo.js（+ rodeo*.js）  Catch & Tame 主遊戲：createRodeo(ctx) → { openMapSelect(), update(dt,time), active, ... }
//   src/tameStalls.js            Hub 右邊新區 3 個攤位 + 傳送門（入口叫 rodeo.openMapSelect()）
//   src/riding.js                騎寵物（Ridable Shard 動畫、快捷欄 1 = 騎／落坐騎）+ 🪢 Leash 狗帶
//   src/luminousDragon.js        🐉 Luminous God Dragon 模型
//
// ---- Gear id（src/data/gears.js）----
//   'shard_tame'  🤠 Tame Shard（自動由 MUTATIONS 生）
//   'rideShard'   🐎 Ridable Shard
//   'leash'       🪢 Leash

// 🗺️ 三張地圖（id 唔好改）
export const RODEO_MAPS = [
  { id: 'savanna', name: 'Savanna', emoji: '🦒', animals: ['Giraffe', 'Zebra', 'African Elephant', 'Lion', 'Cheetah', 'Rhino', 'Wildebeest', 'Ostrich', 'Hippo', 'Warthog'] },
  { id: 'desert', name: 'Desert', emoji: '🐪', animals: ['Camel', 'Fennec Fox', 'Addax', 'Desert Tortoise', 'Meerkat', 'Sand Cat', 'Arabian Oryx', 'Roadrunner', 'Gila Monster', 'Dromedary'] },
  { id: 'taiga', name: 'Taiga', emoji: '🌲', animals: ['Moose', 'Reindeer', 'Brown Bear', 'Grey Wolf', 'Lynx', 'Siberian Tiger', 'Wolverine', 'Snowshoe Hare', 'Red Fox', 'Bison'] },
];
export const RODEO_HEARTS = 3; // ❤️ hits from obstacles before you go back to the Hub
export const RODEO_TOKENS_PER_TAME = 1; // 🤠 Tame Tokens for each animal you tame (rarer animals give more, see rodeo.js)

// 🪢 Lasso Sam: 10 levels, paid with 💰 money. range = how far (metres) your lasso reaches
// SPACE jump-off (Issue #17): a better lasso flings you FURTHER and HIGHER
//   height = how high you fly above the animal's back (metres)
//   fling  = extra forward speed while you fly (metres per second, on top of the herd speed)
export const LASSO_LEVELS = [
  { range: 6, height: 2.2, fling: 4, cost: 0 },
  { range: 7, height: 2.8, fling: 5.5, cost: 50000 },
  { range: 8, height: 3.4, fling: 7, cost: 250000 },
  { range: 9, height: 4.0, fling: 8.5, cost: 1000000 },
  { range: 10, height: 4.7, fling: 10, cost: 5000000 },
  { range: 11, height: 5.4, fling: 11.5, cost: 25000000 },
  { range: 12, height: 6.1, fling: 13, cost: 100000000 },
  { range: 13.5, height: 6.9, fling: 14.5, cost: 500000000 },
  { range: 15, height: 7.8, fling: 16, cost: 2500000000 },
  { range: 17, height: 9, fling: 18, cost: 10000000000 },
];
export const FLING_SLOWMO = 0.4; // ⏱️ slow-motion at the top of a big jump (1 = no slow-mo, 0.4 = 40% speed)
export const FLING_SLOWMO_MIN_HEIGHT = 3.5; // only jumps at least this high (metres) get slow-mo
// 🎵 Tamer Ayden: 10 flute levels, paid with 💰 money. speed = how fast the tame bar fills (x1 = normal)
export const FLUTE_LEVELS = [
  { speed: 1, cost: 0 },
  { speed: 1.15, cost: 50000 },
  { speed: 1.3, cost: 250000 },
  { speed: 1.45, cost: 1000000 },
  { speed: 1.6, cost: 5000000 },
  { speed: 1.75, cost: 25000000 },
  { speed: 1.9, cost: 100000000 },
  { speed: 2.05, cost: 500000000 },
  { speed: 2.2, cost: 2500000000 },
  { speed: 2.4, cost: 10000000000 },
];

// ⭐ Special's Stall: costs in 🤠 Tame Tokens
export const SPECIAL_STALL = [
  { id: 'luminousDragon', name: 'Luminous God Dragon', emoji: '🐉', cost: 200, desc: 'Makes 120% of your BEST pet’s money!' },
  { id: 'tameShard', name: 'Tame Shard', emoji: '🤠', cost: 10, desc: 'A new 🤠 TAME mutation for one pet' },
  { id: 'cowboyBossSkin', name: 'Cowboy Boss Skin', emoji: '🤠', cost: 50, desc: 'Turn the Bosses into cowboys!' },
  { id: 'tamerRanger', name: 'Tamer Ranger Skin', emoji: '🧢', cost: 20, desc: 'A cool tamer outfit for you' },
  { id: 'rideShard', name: 'Ridable Shard', emoji: '🐎', cost: 30, desc: 'Put a saddle on a pet and RIDE it!' },
  { id: 'leash', name: 'Leash', emoji: '🪢', cost: 15, desc: 'Press E to leash an animal near you in the biomes' },
];
export const LUMINOUS_DRAGON_BEST_MULT = 1.2; // 🐉 Luminous God Dragon makes this × your best pet's money per second
export const RIDE_SPEED_PER_LOG10 = 0.06; // 🐎 riding speed boost: +6% for every ×10 of the pet's money per second
export const RIDE_SPEED_MAX = 1.8; // 🐎 riding speed boost can't go over ×1.8
