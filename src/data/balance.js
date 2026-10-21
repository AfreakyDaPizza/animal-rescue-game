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
  { name: 'Smuggler King', speed: 4400000, iq: 3000000 }, // 小朋友 2026-10-17：快啲（×2）
  { name: 'Mega Digger', speed: 44000000, iq: 30000000 }, // 小朋友 2026-10-17：快啲（×2）
  { name: 'Enchanted Royal Guardian', speed: 440000000, iq: 300000000 }, // Biome 7（小朋友 2026-10-17）；再快啲（×2）
];

// ---- 寵物每秒賺幾多錢：生態區底價 × (1 + √重量 × 0.1) × 稀有度 ----
// 越遠嘅生態區底價越高（小朋友話遠嘅要賺多啲）；重啲都賺多啲，但唔會爆錶
// 例：100 kg 熊貓 ≈ $2/秒；6,000 kg 大象 ≈ $9/秒；150,000 kg 藍鯨 ≈ $199/秒；
//     6 kg 菲律賓鷹 ≈ $31/秒；450 kg 北極熊 ≈ $468/秒；160 kg 大猩猩 ≈ $2,265/秒
// 🎃 Halloween pets (biome 7, 8, 9 = Pumpkin Graveyard, Hollow Sprites, Abandoned Manor): money per second base.
// Kid can change these! Biome 7 Enchanted Kingdom is 60000, so Halloween starts a bit higher and goes up.
export const HALLOWEEN_BASE_MONEY = [80000, 140000, 250000];
export const BIOME_BASE_MONEY = [1, 5, 25, 150, 1000, 6000, 60000, ...HALLOWEEN_BASE_MONEY];
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
  // Eternal（小朋友 Issue #5）：最高級，唔會隨機出，淨係 Royal Skywhale 有
  { name: 'Eternal', chance: 0, money: 40, reproduce: 4, color: '#18ffff' },
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
export const REPRODUCE_SECONDS = [30, 60, 120, 240, 480, 900, 1500, 1800, 2400, 3000]; // last 3 = Halloween pets

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
export const ECLIPSE_MONEY = 6; // 🌑 ECLIPSE pets (hit by an Eclipse laser) earn this many times more money
export const SPECTRAL_MONEY = 4; // 👻 SPECTRAL pets (from a Halloween Shard) earn this many times more money
export const PHANTOM_MONEY = 5; // 🟣 PHANTOM pets (from a Halloween Shard) earn this many times more money

// ---- 圖鑑獎勵：第一次登記一種動物、集齊一個生態區 ----
export const INDEX_NEW_SPECIES_REWARD = [20, 100, 500, 3000, 20000, 150000, 1500000, 2000000, 3000000, 5000000]; // last 3 = Halloween
export const INDEX_BIOME_COMPLETE_REWARD = [200, 1500, 10000, 75000, 500000, 4000000, 40000000, 60000000, 90000000, 150000000]; // last 3 = Halloween

// ---- 跑步機／學生桌升級 ----
// 第 L 級：每秒加 5 × 2^(L-1)；升去下一級要 50 × 2.4^(L-1) 蚊（小朋友 2026-10-11 話要貴啲）
// 例：Lv1→2 $50、Lv5→6 $1,659、Lv10→11 $132,000、Lv13→14 $1,826,000
// 跑步機再慢 10%（小朋友要求）：stat = 'speed' 就 × 0.9
// 15 級，每級一個款：Basic → … → Mountain Magic（14）→ Astral（15，MAX）
export const MAX_TRAINING_LEVEL = 17; // Lv17 Inferno Sanctuary（小朋友 2026-10-18）
// 小朋友 2026-10-11 加強：Lv14 Mountain Magic ×1.5、Lv15 Astral ×2
const TOP_LEVEL_BUFF = { 14: 1.5, 15: 2, 16: 6 }; // Lv16 Astral King's Kingdom: x6（小朋友 2026-10-17：再勁啲，本來 x3）
// Lv17 Inferno Sanctuary (kid 2026-10-18): gives a random amount between these 2 numbers every second
export const INFERNO_GAIN = [1000000, 1500000];
export const trainingRange = (level) => (level >= 17 ? INFERNO_GAIN : null);
export const trainingGain = (level, stat = 'iq', roll = Math.random()) =>
  trainingRange(level)
    ? Math.round(INFERNO_GAIN[0] + (INFERNO_GAIN[1] - INFERNO_GAIN[0]) * roll)
    : Math.round(5 * 2 ** (level - 1) * (stat === 'speed' ? 0.9 : 1) * (TOP_LEVEL_BUFF[level] ?? 1));
// 升去 Lv2–13 貴 10%（小朋友 2026-10-11），升去 Lv14／15 價錢唔變
// Lv13–16 cost 30% more (kid 2026-10-18). Lv17 Inferno Sanctuary costs INFERNO_COST.
export const LATE_LEVEL_EXTRA = 1.3;
export const INFERNO_COST = 1000000000;
// 顯示用：Lv17 係一個範圍（例如 "1M–1.5M"）
export const trainingGainLabel = (level, stat, fmt) => (trainingRange(level) ? trainingRange(level).map(fmt).join('–') : fmt(trainingGain(level, stat)));
export const upgradeCost = (level) =>
  level + 1 >= 17 ? INFERNO_COST : Math.round(50 * 2.4 ** (level - 1) * (level + 1 <= 13 ? 1.1 : 1) * (level + 1 >= 13 ? LATE_LEVEL_EXTRA : 1));

// ---- 🎣 HALLOWEEN FISHING (kid 2026-10-19): 15 rods, fish for Halloween eggs at the Fishing Lake ----
// price = money · bite = [fastest, slowest] seconds until a fish bites · luck = 0 to 1 (more = rarer eggs)
// eternal = 0 to 1: chance boost for the ETERNAL Voidseer Pumpkin egg (only the best rods have it!)
// ⚠️ Your rod BREAKS when you go back to the normal world, so you buy it again every visit.
export const FISHING_RODS = [
  { name: 'Twig Rod', price: 1000, bite: [14, 22], luck: 0, eternal: 0, color: '#8d6e63', glow: '#ffcc80' },
  { name: 'Bone Rod', price: 10000, bite: [12, 19], luck: 0.05, eternal: 0, color: '#eeeeee', glow: '#fff59d' },
  { name: 'Cobweb Caster', price: 50000, bite: [11, 17], luck: 0.1, eternal: 0, color: '#b0bec5', glow: '#e1f5fe' },
  { name: 'Pumpkin Pole', price: 250000, bite: [10, 15], luck: 0.16, eternal: 0, color: '#ff8f00', glow: '#ffd54f' },
  { name: 'Candy Corn Rod', price: 1000000, bite: [9, 14], luck: 0.22, eternal: 0, color: '#ffb300', glow: '#fff176' },
  { name: 'Bat Wing Rod', price: 5000000, bite: [8, 13], luck: 0.29, eternal: 0, color: '#4a148c', glow: '#ce93d8' },
  { name: "Witch's Broom Rod", price: 20000000, bite: [7, 11], luck: 0.36, eternal: 0, color: '#6d4c41', glow: '#b9f6ca' },
  { name: 'Graveyard Reel', price: 75000000, bite: [6, 10], luck: 0.43, eternal: 0, color: '#546e7a', glow: '#80cbc4' },
  { name: 'Spectral Rod', price: 250000000, bite: [5.5, 9], luck: 0.5, eternal: 0, color: '#80deea', glow: '#e0f7fa' },
  { name: 'Moonlight Rod', price: 750000000, bite: [5, 8], luck: 0.58, eternal: 0, color: '#c5cae9', glow: '#fffde7' },
  { name: 'Cauldron Caster', price: 2000000000, bite: [4.5, 7], luck: 0.66, eternal: 0, color: '#2e7d32', glow: '#76ff03' },
  { name: 'Phantom Rod', price: 6000000000, bite: [4, 6], luck: 0.74, eternal: 0.1, color: '#311b92', glow: '#b388ff' },
  { name: 'Wraith Reaper Rod', price: 15000000000, bite: [3.5, 5.5], luck: 0.82, eternal: 0.25, color: '#1b5e20', glow: '#69f0ae' },
  { name: 'Bone Drake Rod', price: 40000000000, bite: [3, 5], luck: 0.91, eternal: 0.5, color: '#4a148c', glow: '#ea80fc' },
  { name: "Voidseer's Reel", price: 100000000000, bite: [2, 4], luck: 1, eternal: 1, color: '#12002b', glow: '#18ffff' },
];
// How much the best luck multiplies each rarity (Common goes DOWN, rare stuff goes UP)
export const FISHING_RARITY_BOOST = { Common: -0.85, Rare: 0, Epic: 1.5, Legendary: 4, Mythic: 10, Eternal: 60 };
// Seconds you have to press E when the bobber dips ("!")
export const FISHING_BITE_WINDOW = 1.6;

// ---- 📚 Word Power: chance (0 to 1) that a quiz question is a school vocabulary question instead of an animal fact ----
export const VOCAB_CHANCE = 0.4;

// ---- 障礙物：每個生態區幾多個、郁得幾快 ----
// Kid 2026-10-18: "make obstacles harder to dodge" → +2 each, about 40% faster, sudden dashes, harder to jump over
export const HAZARD_COUNT = [6, 7, 8, 9, 10, 11, 12];
export const HAZARD_SPEED = [4.2, 5.6, 7, 8.4, 10.5, 12.6, 14];
// Every few seconds an obstacle may suddenly DASH (this many times faster for a moment) or turn around
export const HAZARD_DASH_SPEED = 2.2;
export const HAZARD_DASH_SECONDS = 0.7;
export const HAZARD_SURPRISE_EVERY = [2, 5]; // seconds between surprises (random between these 2)
export const HAZARD_TURN_CHANCE = 0.35; // chance a surprise is a quick U-turn instead of a dash
// How high your feet must be to jump OVER an obstacle (bigger = harder; train Jump Power at the Gym!)
export const HAZARD_JUMP_CLEAR = 1.35; // a normal jump peaks at about 1.5, so you need good timing (was 1.0)

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
// The new pet earns: (AVERAGE money/sec of the 3 pets you put in) x this number (depends on what you get)
// Nerfed (kid: "I got a 416mil/s Spideron"): it used to ADD UP all 3 pets and then multiply, so fusing again and again made pets crazy rich.
export const FUSE_MONEY_BONUS = { Common: 1, Rare: 1.2, Epic: 1.5, Legendary: 2, Mythic: 3 };

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
export const LAB_LIVES = 5;

// 借動物之後 Boss 等幾多秒先追你（頭先佢企得太近，一借就捉到你）
export const BORROW_HEAD_START = 3; // 你有幾多個心（俾打中就扣 1 個；扣晒就返實驗室，可以再挑戰）
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

// ---- 💪 GYM（小朋友 2026-10-18）：實驗室爆炸之後喺前院隔籬出現，到呢日先開門 ----
// 日子格式：'年-月-日'。想早啲試？改做今日嘅日子就得
export const GYM_OPEN_DATE = '2026-10-31';
// 4X Treadmill：每 2–4 秒加一次 Speed，每次 = 4 × 你 Hub 跑步機每秒加嘅
export const GYM_TREADMILL_MULTI = 4;
export const GYM_TREADMILL_EVERY = [2, 4]; // 最少幾秒、最多幾秒
// Trampoline：企上去自動彈，每 5 秒 +1 Jump Power（冇升級）
export const GYM_JUMP_GAIN = 1;
export const GYM_JUMP_EVERY = 5;
// Jump Power：每 1 點跳高多幾多米（普通跳大約 2 米高），最多計幾多點
export const JUMP_POWER_HEIGHT = 0.02;
export const JUMP_POWER_MAX = 300; // 300 點 = 跳高多 6 米
// Brain Bench：每 3 秒同時加 Speed 同 IQ，每次 = 2 × Hub 跑步機／學生桌每秒加嘅
export const GYM_BENCH_MULTI = 2;
export const GYM_BENCH_EVERY = 3;
// Climbing Wall of Wisdom：每 2–4 秒加一次 IQ，每次 = 4 × 你 Hub 學生桌每秒加嘅
export const GYM_WALL_MULTI = 4;
export const GYM_WALL_EVERY = [2, 4];
// 🥊 Punching Bag of Power: Speed every 1.5–2.5 sec, each = this x your Hub treadmill's per-second gain
export const GYM_BAG_MULTI = 2.5;
export const GYM_BAG_EVERY = [1.5, 2.5];
// 🚣 Rowing Machine of Wisdom: Speed + IQ every 2.5 sec, each = this x your Hub treadmill / student table per-second gain
export const GYM_ROW_MULTI = 1.5;
export const GYM_ROW_EVERY = 2.5;

// ---- 🤪 CRAZY PET FRENZY (kid 2026-10-18): a VERY hidden button on the Secret Beach ----
// Press it → for a while, every biome is full of crazy pets (only Legendary / Mythic, often GIANT, sometimes 🔥 Fire or 🌑 Eclipse)
export const CRAZY_FRENZY_SECONDS = 60; // how long the frenzy lasts
export const CRAZY_COOLDOWN_MINUTES = 15; // how long until you can press the button again
export const CRAZY_MYTHIC_CHANCE = 40; // % chance a crazy pet is Mythic (the rest are Legendary)
export const CRAZY_GIANT_CHANCE = 50; // % chance a crazy pet is GIANT (x3 size and kg)
export const CRAZY_MUTATION_CHANCE = 35; // % chance a crazy pet has 🔥 Fire or 🌑 Eclipse

// ---- 🎃 HALLOWEEN (Issue #6) ----
// The day the Halloween portal in the middle of the Hub opens (year-month-day). Before this day it shows a countdown.
// The Secret Ranger Control Panel can open it early.
export const HALLOWEEN_OPEN_DATE = '2026-10-21';
// 🥚 Halloween eggs + NO MERCY bosses
// How fast each Halloween boss is (Speed you need to escape). Order: Pumpkin Tyrant, Hollow Wraith, Bone Drake.
// The Enchanted Royal Guardian is 440,000,000, so these are much faster!
export const HALLOWEEN_BOSS_SPEED = [1000000000, 3000000000, 10000000000];
export const HALLOWEEN_BOSS_SIZE = 3; // how big the bosses are (3 = like the Royal Guardian)
export const HALLOWEEN_HEAD_START = 3; // seconds before the egg's boss starts chasing you
// Wild Halloween eggs in the 3 spooky biomes (kid, Issue #9): Legendary, Mythic and Eternal eggs are this many times as likely
// (0.5 = half as likely; the chance they lose goes to Common/Rare/Epic). Fishing odds don't use this.
export const HALLOWEEN_WILD_TOP_RARITY_MULT = 0.5;
export const HALLOWEEN_EGGS_PER_BIOME = 3; // how many eggs lie in each Halloween biome
export const HALLOWEEN_EGG_RESPAWN = 40; // seconds until a new egg appears after one is taken
export const HALLOWEEN_FOG_NEAR = 3; // when you carry an egg, the fog closes in to this (smaller = scarier)
export const HALLOWEEN_FOG_FAR = 22;
// The 6 souls you catch with the Ghost Vacuum.
// dust = [min, max] Soul Dust you get for catching it
// catchSeconds = how long you must hold the vacuum on it with a Lv1 vacuum (stronger souls take longer)
// weight = how often it appears (bigger = more common)
// attackEvery = seconds between its slow soul-orb attacks (0 = it never attacks). The orbs are slow, so you can dodge them!
export const HALLOWEEN_SOULS = [
  { id: 'small', name: 'Small Soul', dust: [20, 20], catchSeconds: 1.5, weight: 40, attackEvery: 0 },
  { id: 'wandering', name: 'Wandering Soul', dust: [25, 50], catchSeconds: 2.5, weight: 28, attackEvery: 0 },
  { id: 'phantom', name: 'Phantom Spirit', dust: [50, 150], catchSeconds: 4, weight: 16, attackEvery: 6 },
  { id: 'wraith', name: 'Wraith Soul', dust: [200, 300], catchSeconds: 7, weight: 9, attackEvery: 5 },
  { id: 'ghoul', name: 'Ghoul', dust: [400, 500], catchSeconds: 10, weight: 5, attackEvery: 4 },
  { id: 'poltergeist', name: 'Poltergeist Ghoul', dust: [500, 1000], catchSeconds: 14, weight: 2, attackEvery: 3.5 },
];
// Soul orb attacks: how fast they fly (smaller = easier to dodge) and how long the warning glow lasts before they fire
export const HALLOWEEN_SOUL_ORB_SPEED = 6;
export const HALLOWEEN_SOUL_ORB_WARNING = 0.9;
// When a soul orb hits you, you drop this much Soul Dust (never below 0)
export const SOUL_ORB_HIT_DUST = 10;
// How many ghosts float around the Ghost World at the same time
export const GHOST_MAX_SOULS = 12;

// ---- 🚂 PHANTOM EXPRESS ----
// The train comes every this many minutes (at :00 on the real clock) and waits this many minutes for you
export const PHANTOM_EXPRESS_EVERY_MINUTES = 60;
export const PHANTOM_EXPRESS_STAY_MINUTES = 30;

// ---- 🧹 GHOST VACUUM (buy and upgrade at the Vacuum Shop in the Ghost World, with Soul Dust) ----
// cost = Soul Dust to buy that level · power = how fast it catches (2 = twice as fast)
// range = how far it reaches (metres) · cone = how wide the beam is (degrees)
export const GHOST_VACUUM = [
  { name: 'Rusty Ghost Grabber', cost: 0, power: 1, range: 7, cone: 25, color: 0x9e9e9e },
  { name: 'Slime Sucker', cost: 600, power: 1.6, range: 9, cone: 30, color: 0x76ff03 },
  { name: 'Frost Phantom Vac', cost: 2500, power: 2.5, range: 11, cone: 34, color: 0x40c4ff },
  { name: 'Void Vortex', cost: 9000, power: 4, range: 13, cone: 38, color: 0xb388ff },
  { name: 'Golden Soul Reaper 5000', cost: 30000, power: 6.5, range: 16, cone: 42, color: 0xffd740 },
];

// ---- 🔮 HALLOWEEN SHARDS (Statue of Halloween) ----
// One shard costs this much Soul Dust
export const HALLOWEEN_SHARD_COST = 400;
// When you use a shard, each pet on your Plot has this % chance to get hit
export const SHARD_HIT_CHANCE = 25;
// A pet that gets hit becomes 🟣 PHANTOM this % of the time, otherwise 👻 SPECTRAL
export const SHARD_PHANTOM_CHANCE = 50;
