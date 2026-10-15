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
];

// ---- 圖鑑獎勵：第一次登記一種動物、集齊一個生態區 ----
export const INDEX_NEW_SPECIES_REWARD = [20, 100, 500, 3000, 20000, 150000];
export const INDEX_BIOME_COMPLETE_REWARD = [200, 1500, 10000, 75000, 500000, 4000000];

// ---- 跑步機／學生桌升級 ----
// 第 L 級：每秒加 5 × 2^(L-1)；升去下一級要 50 × 2.4^(L-1) 蚊（小朋友 2026-10-11 話要貴啲）
// 例：Lv1→2 $50、Lv5→6 $1,659、Lv10→11 $132,000、Lv13→14 $1,826,000
// 跑步機再慢 10%（小朋友要求）：stat = 'speed' 就 × 0.9
// 15 級，每級一個款：Basic → … → Mountain Magic（14）→ Astral（15，MAX）
export const MAX_TRAINING_LEVEL = 15;
// 小朋友 2026-10-11 加強：Lv14 Mountain Magic ×1.5、Lv15 Astral ×2
const TOP_LEVEL_BUFF = { 14: 1.5, 15: 2 };
export const trainingGain = (level, stat = 'iq') =>
  Math.round(5 * 2 ** (level - 1) * (stat === 'speed' ? 0.9 : 1) * (TOP_LEVEL_BUFF[level] ?? 1));
// 升去 Lv2–13 貴 10%（小朋友 2026-10-11），升去 Lv14／15 價錢唔變
export const upgradeCost = (level) => Math.round(50 * 2.4 ** (level - 1) * (level + 1 <= 13 ? 1.1 : 1));

// ---- 障礙物：每個生態區幾多個、郁得幾快 ----
export const HAZARD_COUNT = [4, 5, 6, 7, 8, 9];
export const HAZARD_SPEED = [3, 4, 5, 6, 7.5, 9];

// ---- 地塊：一開始放到 8 隻，可以升級 10 次（每次 +1），最多 18 隻 ----
export const PLOT_START_SLOTS = 8;
export const PLOT_MAX_UPGRADES = 10;
export const plotSlots = (plotLevel) => PLOT_START_SLOTS + plotLevel;
export const plotUpgradeCost = (plotLevel) => Math.round(200 * 2.2 ** plotLevel * 1.1); // 貴 10%

// ---- 賣寵物：賣得幾錢 = 佢 1 分鐘賺到嘅錢 ----
export const SELL_SECONDS = 60;

// ---- Biome 2 沙灘執垃圾：執一件有幾錢 ----
export const TRASH_REWARD = 20;
