// 🎃 Halloween 世界嘅地圖（小朋友 Issue #6；佢叫我哋自己設計地圖）
// 獨立一個檔（冇 THREE），world.js、main.js、之後嘅蛋／Boss／火車／釣魚系統都 import 得
// 全部係世界座標；成個 Halloween 世界喺好遠嘅西邊（x ≈ -1400），同普通世界唔會撞
//
//   由上面望落去（-z 係「上」，同普通世界一樣）
//
//                 ┌──────────────────────┐ z -350
//                 │  🏚️ ABANDONED MANOR   │  hw3（Boss：Bone Drake）
//                 │      (大屋 + 蛋)       │
//                 ├──────────────────────┤ z -240
//                 │  👻 HOLLOW SPRITES    │  hw2（Boss：Hollow Wraith）
//                 │   (黑森林 + 發光菇)     │
//                 ├──────────────────────┤ z -130
//                 │  🎃 PUMPKIN GRAVEYARD │  hw1（Boss：Pumpkin Tyrant）
//                 │   (南瓜田 + 墓碑)       │
//    ┌────────┐   └─────────╮  ╭─────────┘ z -20
//    │🎣 FISH- │   ╭─────────╯  ╰────────╮   ┌──────────────┐
//    │ ING     ├───┤  ⭕ SPAWN RUINS     ├───┤ 🚂 TRAIN      │══ 路軌 ══
//    │ LAKE    │   │  (安全區 + 返 Hub 傳送門) │   │   STATION    │
//    └────────┘   ╰─────────╮  ╭────────╯   └──────────────┘
//      x -1490…-1420        │🪦 EGG  │  z 20…66                 x -1378…-1322
//                           │GRAVEYARD│
//                           └────────┘
//
//   🚂 Phantom Express 會載你去好遠嘅 👻 GHOST WORLD（x ≈ -2000）：
//        一個紫綠色霧島，中間有 Statue of Halloween，旁邊有吸塵機舖
//
// 安全區：Spawn Ruins 圓圈入面（RUINS_SAFE_R），Boss 唔會入嚟

import { inHell, hellWalkable, hellZoneAt } from './hellShape.js'; // 🔥 Halloween World 2：Hell（x ≈ -2600，Issue #11）

export const HW_X = -1400; // 成個 Halloween 世界嘅中線
export const HW_EDGE_X = -1250; // x 細過呢個就係 Halloween 世界（包埋 Ghost World）

// ⭕ 出生點：一圈爛咗嘅石柱
export const RUINS = { x: HW_X, z: 0, r: 24 };
export const RUINS_SAFE_R = 21; // 安全區半徑（Boss 唔追入嚟、紅色箭咀帶你返嚟呢度）
export const HW_PORTAL = { x: HW_X, z: 12 }; // 返 Hub 嘅傳送門（面向 -z）
export const HW_ARRIVE = { x: HW_X, z: 4, rotY: 0 }; // 由 Hub 去到企喺邊（rotY 0 = 望住 -z，即係 Biome 1）

// 3 個 Halloween 生態區：一直向北（-z），要逐個穿過
const W = 84; // 闊度
const L = 110; // 每個生態區長度
const biome = (id, name, short, i, boss, extra = {}) => {
  const maxZ = -20 - i * L;
  const minZ = maxZ - L;
  return {
    id, name, short, index: i, boss,
    rect: { minX: HW_X - W / 2, maxX: HW_X + W / 2, minZ, maxZ },
    bossHome: { x: HW_X, z: minZ + 22 }, // Boss 企喺生態區後半
    eggZone: { minX: HW_X - 30, maxX: HW_X + 30, minZ: minZ + 8, maxZ: minZ + 46 }, // 蛋喺生態區最入面（要行過 Boss 先攞到）
    entrance: { x: HW_X, z: maxZ - 3 }, // 由前一區行入嚟嘅位
    ...extra,
  };
};
// 🏚️ 大屋（Abandoned Manor 最北，擋住唔行得入）：前門向 +z（南）
export const MANOR = { x: HW_X, z: -20 - 3 * L + 14, w: 34, d: 20 };
const MANOR_FRONT = MANOR.z + MANOR.d / 2; // 大屋前面嘅牆
export const MANOR_GATE_Z = MANOR_FRONT + 12; // 前院鐵閘
export const HW_BIOMES = [
  biome('hw1', 'Pumpkin Graveyard', '🎃 Pumpkin Graveyard', 0, 'Pumpkin Tyrant'),
  biome('hw2', 'Hollow Sprites', '👻 Hollow Sprites', 1, 'Hollow Wraith'),
  biome('hw3', 'Abandoned Manor', '🏚️ Abandoned Manor', 2, 'Bone Drake', {
    bossHome: { x: HW_X, z: MANOR_GATE_Z + 8 }, // Bone Drake 守住大屋鐵閘外面
    eggZone: { minX: HW_X - 34, maxX: HW_X + 34, minZ: MANOR_FRONT + 4, maxZ: MANOR_GATE_Z + 16 }, // 蛋喺大屋前院（大屋本身行唔入）
  }),
];
export const HW_NORTH_Z = HW_BIOMES[2].rect.minZ; // 地圖最北


// 🪦 蛋墳場：喺出生點南邊，8 個墓碑台放蛋孵
export const EGG_GRAVEYARD = { minX: HW_X - 20, maxX: HW_X + 20, minZ: 18, maxZ: 66 };
export const EGG_SLOTS = [38, 52].flatMap((z) => [-12, -4, 4, 12].map((dx) => ({ x: HW_X + dx, z })));
export const EGG_GRAVEYARD_GATE = { x: HW_X, z: 24 }; // 入口（接住出生點）

// 🚂 火車站（Phantom Express）：出生點東邊
export const STATION = { minX: HW_X + 22, maxX: HW_X + 78, minZ: -14, maxZ: 14 };
export const STATION_PLATFORM = { minX: HW_X + 40, maxX: HW_X + 66, minZ: -10, maxZ: 10, top: 0.4 }; // 月台（高少少，自動踏得上）
export const TRACK_X = HW_X + 71; // 路軌喺月台東邊，打直（z 方向）
export const TRAIN_STOP = { x: TRACK_X, z: 0 }; // 火車停喺度
export const TRAIN_BOARD = { x: HW_X + 63, z: 0 }; // 企喺度撳 E 上車
export const STATION_SIGN = { x: HW_X + 48, z: -9 }; // 時間表牌（下一班車幾時到）

// 👻 Ghost World：坐火車去，好遠（自己一個圓形霧島）
export const GHOST_WORLD = { x: -2000, z: 0, r: 56 };
export const GHOST_ARRIVE = { x: -2000, z: 40, rotY: 0 }; // 落車企喺度，望住雕像
export const GHOST_TRAIN_STOP = { x: -2000, z: 50 }; // Ghost World 嗰邊個火車站（返程）
export const STATUE_OF_HALLOWEEN = { x: -2000, z: 0 }; // 用 400 Soul Dust 換 Halloween Shard
export const VACUUM_SHOP = { x: -1982, z: 32 }; // 吸塵機舖（升級 Lv1–5）
export const GHOST_SPAWN_R = 48; // 鬼魂喺呢個半徑入面出現

// 🏚️ 鬼鎮（小朋友 2026-10-22：「make the ghost town more abandoned town vibe」）
// 一條南北大街（火車站 → 雕像廣場 → 北面鐘樓教堂）+ 一條東西橫街；兩邊係荒廢咗嘅屋／舖
// 每間屋係一個長方形（行唔入），鬼魂只會喺街、廣場、後巷呢啲空地出現同飄（ghostOpen）
// face：屋嘅正門向邊（'+x' 即係向東）；kind／sign 俾 ghostTown.js 起樣
const gx = GHOST_WORLD.x, gz = GHOST_WORLD.z;
const blk = (minX, maxX, minZ, maxZ, face, kind, sign = '') => ({ minX: gx + minX, maxX: gx + maxX, minZ: gz + minZ, maxZ: gz + maxZ, face, kind, sign });
export const GHOST_TOWN = {
  street: { halfW: 7, minZ: -44, maxZ: 46 }, // 大街（相對 GHOST_WORLD）
  cross: { halfW: 6, minX: -52, maxX: 52 }, // 橫街（z = 0）
  plazaR: 14, // 雕像廣場
  blocks: [
    blk(-21, -9, 13, 25, '+x', 'shop', 'SALOON'),
    blk(-21, -9, -27, -15, '+x', 'tall', 'HOTEL'),
    blk(-20, -9, -42, -31, '+x', 'shop', 'GENERAL STORE'),
    blk(9, 19, 13, 23, '-x', 'house', 'BARBER'),
    blk(9, 21, -27, -15, '-x', 'shop', 'BANK'),
    blk(9, 18, -42, -32, '-x', 'house'),
    blk(-7, 7, -54, -44, '+z', 'chapel'), // 斜斜嘅鐘樓（鐘停咗）
    blk(-42, -28, -20, -8, '+z', 'house'),
    blk(-42, -28, 8, 20, '-z', 'shop', 'BLACKSMITH'),
    blk(28, 42, -20, -8, '+z', 'tall'),
    blk(28, 42, 8, 20, '-z', 'shop', 'POST OFFICE'),
    blk(-15, -10, 45, 51, '+x', 'shed', 'DEPOT'),
  ],
};
const inBlock = (b, x, z, m) => x > b.minX - m && x < b.maxX + m && z > b.minZ - m && z < b.maxZ + m;
// 呢個位係唔係鎮入面嘅空地（鬼魂可以喺度出現／飄）：喺島入面、唔喺屋入面、唔撞雕像
export function ghostOpen(x, z, m = 1.5) {
  if (Math.hypot(x - GHOST_WORLD.x, z - GHOST_WORLD.z) > GHOST_WORLD.r - 5) return false;
  if (Math.hypot(x - STATUE_OF_HALLOWEEN.x, z - STATUE_OF_HALLOWEEN.z) < 6) return false;
  return !GHOST_TOWN.blocks.some((b) => inBlock(b, x, z, m));
}
// 由 (x1, z1) 直飄去 (x2, z2) 會唔會穿過屋（揀鬼魂下一個目的地用）
export function ghostPathClear(x1, z1, x2, z2) {
  for (let i = 1; i <= 8; i++) {
    const k = i / 8;
    if (!ghostOpen(x1 + (x2 - x1) * k, z1 + (z2 - z1) * k, 1)) return false;
  }
  return true;
}

// 🎣 釣魚湖：出生點西邊
export const LAKE = { minX: HW_X - 92, maxX: HW_X - 20, minZ: -36, maxZ: 36 }; // 成個湖區（包水）
export const LAKE_WATER = { minX: HW_X - 90, maxX: HW_X - 44, minZ: -34, maxZ: 34 }; // 水（唔行得）
export const LAKE_SHORE = { minX: HW_X - 44, maxX: HW_X - 20, minZ: -30, maxZ: 30 }; // 岸邊（行得）
export const DOCK = { minX: HW_X - 68, maxX: HW_X - 43, minZ: -2.2, maxZ: 2.2, top: 0.4 }; // 木碼頭（行出水面）
export const FISH_SPOT = { x: HW_X - 66, z: 0 }; // 碼頭尾：釣魚位
export const ROD_SHOP = { x: HW_X - 32, z: 10 }; // 魚竿舖（15 支）：碼頭南邊。以前喺 z -20，啱啱好埋咗喺 Biome 1 南邊嘅懸崖石入面（Issue #9 "fishing stall not here"）

// ---------- 行得嘅範圍（world.js isWalkable 用）----------
// 普通世界嘅 Boss／障礙物／夜晚閘都唔理 Halloween 世界
const RECTS = [
  // 3 個生態區連埋一條（分開計嘅話，兩區交界會有一條隱形牆）
  { minX: HW_BIOMES[0].rect.minX, maxX: HW_BIOMES[0].rect.maxX, minZ: HW_BIOMES[2].rect.minZ, maxZ: HW_BIOMES[0].rect.maxZ },
  EGG_GRAVEYARD,
  STATION,
  LAKE_SHORE,
  DOCK,
  { minX: HW_X - 7, maxX: HW_X + 7, minZ: -28, maxZ: -18 }, // 出生點去 Biome 1 嘅路口
];
const inR = (r, x, z, m) => x >= r.minX + m && x <= r.maxX - m && z >= r.minZ + m && z <= r.maxZ - m;

export const inHalloween = (x, z) => x < HW_EDGE_X;
export const inGhostWorld = (x, z) => Math.hypot(x - GHOST_WORLD.x, z - GHOST_WORLD.z) < GHOST_WORLD.r + 10;
export const inSafeZone = (x, z) => Math.hypot(x - RUINS.x, z - RUINS.z) <= RUINS_SAFE_R;

// 呢個點（連埋公仔闊度 radius）喺唔喺 Halloween 世界行得嘅地方？（撞嘢圈另外計）
export function hwWalkable(x, z, radius) {
  if (inHell(x, z)) return hellWalkable(x, z, radius); // 🔥
  if (inGhostWorld(x, z)) return Math.hypot(x - GHOST_WORLD.x, z - GHOST_WORLD.z) <= GHOST_WORLD.r - radius && !GHOST_TOWN.blocks.some((b) => inBlock(b, x, z, radius)); // 鬼鎮啲屋行唔入
  if (Math.hypot(x - RUINS.x, z - RUINS.z) <= RUINS.r - radius) return true;
  if (!inR(LAKE_SHORE, x, z, radius) && !inR(DOCK, x, z, 0) && x > LAKE_WATER.minX && x < LAKE_WATER.maxX && z > LAKE_WATER.minZ && z < LAKE_WATER.maxZ) return false; // 水
  return RECTS.some((r) => inR(r, x, z, r === DOCK ? 0.2 : radius));
}

// 你喺邊個 Halloween 地方？（whereIs 用；唔喺 Halloween 世界就 null）
export function hwZoneAt(x, z) {
  if (!inHalloween(x, z)) return null;
  if (inGhostWorld(x, z)) return 'Ghost World';
  if (inHell(x, z)) return hellZoneAt(x, z); // 🔥 'Hell' 或者 'Witch Castle'
  if (Math.hypot(x - RUINS.x, z - RUINS.z) <= RUINS.r + 1) return '🎃 Spawn Ruins';
  for (const b of HW_BIOMES) if (inR(b.rect, x, z, -1)) return b.name;
  if (inR(EGG_GRAVEYARD, x, z, -1)) return 'Egg Graveyard';
  if (inR(STATION, x, z, -1)) return 'Train Station';
  if (inR(LAKE, x, z, -1)) return 'Fishing Lake';
  return '🎃 Spawn Ruins';
}
// 第幾個 Halloween 生態區（0–2），唔喺生態區就 -1（Boss 追人用）
export function hwBiomeIndexAt(x, z) {
  return HW_BIOMES.findIndex((b) => inR(b.rect, x, z, 0));
}
export const HW_ZONES = ['🎃 Spawn Ruins', ...HW_BIOMES.map((b) => b.name), 'Egg Graveyard', 'Train Station', 'Fishing Lake', 'Ghost World', 'Hell', 'Witch Castle'];
