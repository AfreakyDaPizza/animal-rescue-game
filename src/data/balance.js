// 🎮 GAME NUMBERS — you can change these yourself! (see CONTRIBUTING.md)
// Only change the NUMBERS. Keep every comma , and bracket [ ] { } exactly where it is.
// Lists with 6 numbers go in order: Biome 1, Biome 2, Biome 3, Biome 4, Biome 5, Biome 6.
//
// 遊戲數值：想遊戲易啲／難啲，改呢度就得
// 每個 array 有 6 格，順序係 Biome 1 → Biome 6

// ---- Boss（原稿數值）----
// speed：原稿數值再加 10%（小朋友 2026-10-10 要求）；Biome 6 係小朋友後加
export const BOSSES = [
  { name: 'Lumberjack', speed: 550, iq: 200 },
  { name: 'Captain Oil Spill', speed: 2200, iq: 1000 },
  { name: 'Hunter', speed: 33000, iq: 45000 },
  { name: 'Oil Driller', speed: 330000, iq: 450000 },
  { name: 'Smuggler King', speed: 2200000, iq: 3000000 },
  { name: 'Mega Digger', speed: 22000000, iq: 30000000 },
];

// ---- 寵物每秒賺幾多錢：生態區底價 × (1 + √重量 × 0.1) × 稀有度 ----
// 越遠嘅生態區底價越高（小朋友話遠嘅要賺多啲）；重啲都賺多啲，但唔會爆錶
// 例：100 kg 熊貓 ≈ $2/秒；6,000 kg 大象 ≈ $9/秒；150,000 kg 藍鯨 ≈ $199/秒；
//     6 kg 菲律賓鷹 ≈ $31/秒；450 kg 北極熊 ≈ $468/秒；160 kg 大猩猩 ≈ $2,265/秒
export const BIOME_BASE_MONEY = [1, 5, 25, 150, 1000, 6000];
export const WEIGHT_BONUS = 0.1;
export const petMoney = (kg, biome, rarity = 'Common') =>
  Math.max(1, Math.round(BIOME_BASE_MONEY[biome] * (1 + Math.sqrt(kg) * WEIGHT_BONUS) * rarityInfo(rarity).money));

// ---- 稀有度（原稿：Mythic 2%、Legendary 15%，其餘 83% 係 Common／Rare／Epic）----
// chance：出現機會（%）；money：賺錢倍數；reproduce：繁殖時間倍數（越稀有越耐）
export const RARITIES = [
  { name: 'Common', chance: 45, money: 1, reproduce: 1, color: '#cfd8dc' },
  { name: 'Rare', chance: 25, money: 1.5, reproduce: 1.2, color: '#42a5f5' },
  { name: 'Epic', chance: 13, money: 2.5, reproduce: 1.5, color: '#ce93d8' },
  { name: 'Legendary', chance: 15, money: 5, reproduce: 2, color: '#ffca28' },
  { name: 'Mythic', chance: 2, money: 15, reproduce: 3, color: '#ff4081' },
];
export const rarityInfo = (name) => RARITIES.find((r) => r.name === name) || RARITIES[0];
export function randomRarity() {
  let roll = Math.random() * 100;
  for (const r of RARITIES) {
    roll -= r.chance;
    if (roll < 0) return r.name;
  }
  return 'Common';
}

// ---- 繁殖機要幾耐（秒）：越遠嘅生態區越耐 ----
export const REPRODUCE_SECONDS = [30, 60, 120, 240, 480, 900];

// ---- 繁殖機升級（小朋友 2026-10-11）：一次升晒 5 部 ----
// timeFactor：繁殖時間 × 幾多（0.8 = 快 20%）；cost：升去呢級要幾錢
export const MACHINE_LEVELS = [
  { name: 'Basic', timeFactor: 1, cost: 0 },
  { name: 'Nature Growth', timeFactor: 0.8, cost: 5500 }, // 貴 10%
  { name: 'Mountain Magic', timeFactor: 0.65, cost: 75000 }, // 加強：快 35%（本來 25%）
  // La Combination（小朋友 2026-10-11）：再快 30%（0.65 × 0.7 ≈ 快 55%）、一次放 2 隻、20% 機會寵物變大 1–10 倍
  { name: 'La Combination', timeFactor: 0.455, cost: 1000000, double: true, giantChance: 0.2 },
  // Dragon's Lair (kid 2026-10-17): 60% faster than Basic, 2 animals at a time, answer questions to speed up,
  // and a chance that the pet comes out with the 🔥 FIRE mutation (fire aura + x4 money)
  { name: "Dragon's Lair", timeFactor: 0.4, cost: 15000000, double: true, giantChance: 0.2, quiz: true, fireChance: 0.15 },
];
export const MACHINE_QUIZ_CUT = 0.3; // Right answer: cut this much of the time that is left (0.3 = 30%)...
export const MACHINE_QUIZ_MIN_CUT = 20; // ...but always at least this many seconds
export const MACHINE_QUIZ_COOLDOWN = 10; // Seconds before the same machine can ask another question
export const FIRE_MONEY = 4; // 🔥 FIRE pets earn this many times more money

// ---- 圖鑑獎勵：第一次登記一種動物、集齊一個生態區 ----
export const INDEX_NEW_SPECIES_REWARD = [20, 100, 500, 3000, 20000, 150000];
export const INDEX_BIOME_COMPLETE_REWARD = [200, 1500, 10000, 75000, 500000, 4000000];

// ---- 跑步機／學生桌升級 ----
// 第 L 級：每秒加 5 × 2^(L-1)；升去下一級要 50 × 2.4^(L-1) 蚊（小朋友 2026-10-11 話要貴啲）
// 例：Lv1→2 $50、Lv5→6 $1,659、Lv10→11 $132,000、Lv13→14 $1,826,000
// 跑步機再慢 10%（小朋友要求）：stat = 'speed' 就 × 0.9
// 15 級，每級一個款：Basic → … → Mountain Magic（14）→ Astral（15，MAX）
export const MAX_TRAINING_LEVEL = 16; // Lv16 Astral King's Kingdom（小朋友 2026-10-17）
// 小朋友 2026-10-11 加強：Lv14 Mountain Magic ×1.5、Lv15 Astral ×2
const TOP_LEVEL_BUFF = { 14: 1.5, 15: 2, 16: 3 }; // Lv16 Astral King's Kingdom: x3
export const trainingGain = (level, stat = 'iq') =>
  Math.round(5 * 2 ** (level - 1) * (stat === 'speed' ? 0.9 : 1) * (TOP_LEVEL_BUFF[level] ?? 1));
// 升去 Lv2–13 貴 10%（小朋友 2026-10-11），升去 Lv14／15 價錢唔變
export const upgradeCost = (level) => Math.round(50 * 2.4 ** (level - 1) * (level + 1 <= 13 ? 1.1 : 1));

// ---- 障礙物：每個生態區幾多個、郁得幾快 ----
export const HAZARD_COUNT = [4, 5, 6, 7, 8, 9];
export const HAZARD_SPEED = [3, 4, 5, 6, 7.5, 9];

// ---- 地塊：一開始放到 8 隻，可以升級 10 次（每次 +1），最多 18 隻 ----
export const PLOT_START_SLOTS = 8;
// The last upgrade (number 11) is the ROYAL KINGDOM: +2 pets and x1.5 money for every pet on the plot
export const PLOT_ROYAL_LEVEL = 11; // 小朋友 2026-10-17：最後一級 +2 隻位 + 錢 x1.5
export const PLOT_ROYAL_SLOTS = 2; // Royal Kingdom gives this many extra pet slots
export const PLOT_ROYAL_MONEY = 1.5; // Royal Kingdom money multiplier for all plot pets
export const PLOT_ROYAL_COST_MULTI = 3; // Royal Kingdom costs this many times a normal upgrade
export const PLOT_MAX_UPGRADES = PLOT_ROYAL_LEVEL;
export const plotSlots = (plotLevel) => PLOT_START_SLOTS + Math.min(plotLevel, PLOT_ROYAL_LEVEL - 1) + (plotLevel >= PLOT_ROYAL_LEVEL ? PLOT_ROYAL_SLOTS : 0);
export const plotMoneyMulti = (plotLevel) => (plotLevel >= PLOT_ROYAL_LEVEL ? PLOT_ROYAL_MONEY : 1);
export const plotUpgradeCost = (plotLevel) => Math.round(200 * 2.2 ** plotLevel * 1.1 * (plotLevel + 1 === PLOT_ROYAL_LEVEL ? PLOT_ROYAL_COST_MULTI : 1)); // 貴 10%

// ---- 賣寵物：賣得幾錢 = 佢 1 分鐘賺到嘅錢 ----
export const SELL_SECONDS = 60;

// ---- New biome countdown (Issue #4): the wall at the end of the mountain bridge counts down to this day ----
export const NEW_BIOME_DATE = '2026-10-24';

// ---- 🧪 FUSE MACHINE (Issue #4): put in 3 pets, get 1 special fuse-only pet ----
// The day the Fuse Machine opens (year-month-day). Before this day it shows a countdown.
export const FUSE_OPEN_DATE = '2026-10-22';
// How good each rarity is when you put it IN (3 pets → score 0 to 12)
export const FUSE_RARITY_SCORE = { Common: 0, Rare: 1, Epic: 2, Legendary: 3, Mythic: 4 };
// Chance (%) of each result: Rhinoblade (Common), Spideron (Rare), Dunkleosteus (Epic), Puffaball (Legendary), Endangered Combination (Mythic)
// LOW = when you put in 3 Commons (score 0). HIGH = when you put in 3 Mythics (score 12). In between = a mix.
export const FUSE_CHANCES_LOW = [62, 28, 9, 1, 0];
export const FUSE_CHANCES_HIGH = [4, 10, 21, 35, 30];
// The new pet earns: (money/sec of the 3 pets you put in, added up) x this number (depends on what you get)
export const FUSE_MONEY_BONUS = { Common: 1.3, Rare: 1.6, Epic: 2.2, Legendary: 3.5, Mythic: 6 };

// ---- Biome 2 沙灘執垃圾：執一件有幾錢 ----
export const TRASH_REWARD = 20;

// ---- Laboratory + Mutated Scientist Poacher（小朋友 Issue #2）----
// 開實驗室：撳 Hub 入面（Magic Library 後面）嘅秘密紅色掣
// 實驗室傳送門：做到其中一樣就會開（true = 呢個方法用得；false = 唔用）
export const LAB_PORTAL_BY_PODS = true; // 方法 A：用鎚仔打爛晒啲玻璃艙
export const LAB_PODS = 4; // 有幾多個玻璃艙
export const LAB_PORTAL_BY_LEGENDARY = true; // 方法 B：交 Legendary 寵物俾傳送門（佢哋會由 Index 消失！）
export const LAB_LEGENDARY_NEEDED = 3; // 要交幾多隻 Legendary
// Boss 戰：每一輪佢會放無人機、叫腐化動物、開傳送門叫 Boss、用手拍你；之後佢會攰
// ---- Issue #4（2026-10-17）：三個 Phase，玩家唔會扣血（俾打中只係彈返起點）----
export const LAB_P1_HITS = 12; // Phase 1：用球棒打佢幾多下
export const LAB_P2_HITS = 24; // Phase 2：用球棒打佢幾多下
export const LAB_P3_CAPSULES = 1; // Phase 3：要帶佢隻手拍落幾多次 Solar Capsule
export const LAB_LAVA_EVERY = 5; // Phase 1：每幾秒佢腳底出一灘熔岩
export const LAB_LAVA_SECONDS = 7; // 熔岩留幾耐
export const LAB_P2_SPAWN_EVERY = 9; // Phase 2：每幾秒叫 1–2 個 Boss／動物
export const LAB_P2_MINION_SECONDS = 15; // Phase 2 叫出嚟嘅嘢追你幾耐
export const LAB_BAT_RANGE = 6.5; // 球棒：離佢幾近先打得中
export const LAB_BAT_COOLDOWN = 0.35; // 球棒：打完隔幾耐先打得再
export const LAB_LIVES = 5; // 你有幾多個心（俾打中就扣 1 個；扣晒就返實驗室，可以再挑戰）
export const LAB_DRONES = 3; // 每輪幾多部炸彈無人機（之後每輪多 1 部）
export const LAB_CORRUPTED_ANIMALS = 2; // 每輪叫幾多隻腐化動物（小朋友 2026-10-17：唔好咁多，本來 4）
export const LAB_CORRUPTED_SECONDS = 30; // 腐化動物追你幾多秒，之後變灰燼
export const LAB_PORTAL_BOSSES = 2; // 傳送門出幾多個生態區 Boss
export const LAB_PORTAL_SECONDS = 60; // 傳送門 Boss 追你幾多秒，之後返入傳送門
export const LAB_SQUASH_FOLLOW = 3; // 拍手：紅框跟住你幾多秒（小朋友 2026-10-15）
export const LAB_SQUASH_WARNING = 0.6; // 紅框停低之後，再過幾多秒隻手先拍落嚟（越大越易避）
export const LAB_TIRED_SECONDS = 30; // 佢攰咗幾多秒（呢段時間要帶佢隻手拍落 Solar Energy Capsule）
export const LAB_CAPSULE_HITS = 4; // 要拍中幾多次 Capsule 先打得低佢
export const LAB_REWARD = 1000; // 打贏 Owner 俾你幾多錢
