// 🔥 Halloween World 2：Hell 嘅地圖（小朋友 Issue #11）—— 冇 THREE，world.js／halloweenShape.js／測試 script 都 import 得
// 「You can teleport to the Hell, which looks sick, and then you have to parkour the flying lava rocks to the Witch Castle,
//   and you can see a witch and a tower, so you ask the witch and the witch guides you to enter the tower.」
//
//   由上面望落去（-z 係「上」，同其他世界一樣）；成個 Hell 喺好遠嘅西邊 x ≈ -2600（Ghost World 喺 -2000）
//
//        z -208 ┌──────────────────────────┐
//               │  🏰 WITCH CASTLE（大堡）   │  🗼 Witch Tower（城堡東邊）
//               │  ⛲ 庭園：🧙‍♀️ 女巫 + 大鍋 + 貓 │
//        z -143 └──────────┬───────────────┘
//                          │ 著陸台（Checkpoint 5）
//                          ⋮  🔥 飛天熔岩石（會郁、會轉、會浮）＋ 4 個 Checkpoint 石島
//                          │
//        z  +40       ⭕ 到埗石島（Checkpoint 0）+ 🌀 返 Halloween World 嘅傳送門
//
// 地面 y = 0 係熔岩（一跌落去就燒返去上一個 Checkpoint）；所有石都係 platforms（world.js 嘅 addPlatform／groundAt）
// 會郁嘅石：hellWorld.js 每格畫面改 platform 嘅位（同埋載住企喺上面嘅玩家）

export const HELL = { x: -2600, z: 0 }; // Hell 中心（離 Ghost World 600 米）
export const HELL_EDGE = 150; // 呢個半徑入面都當係 Hell（天空／霧）
const HX = HELL.x;
export const LAVA_Y = 0.35; // 熔岩面
export const LAVA_KILL = 1.0; // 腳低過呢個高度 = 跌咗落熔岩
export const HELL_RECT = { minX: HX - 90, maxX: HX + 90, minZ: -235, maxZ: 70 }; // 行得到嘅最大範圍（再出就係隱形牆）

// ⭕ 到埗石島 + 傳送門
export const HELL_START = { x: HX, z: 40, r: 12, top: 3 };
export const HELL_PORTAL = { x: HX, z: 49 }; // 返 Halloween World（面向 -z）
export const HELL_ARRIVE = { x: HX, z: 43, rotY: 0 }; // 到埗企喺度，望住 -z（城堡方向）

// 🏰 城堡島（最尾）
export const CASTLE_TOP = 10.4;
export const CASTLE_ISLAND = { minX: HX - 40, maxX: HX + 50, minZ: -208, maxZ: -143 };
export const CASTLE_LANDING = { minX: HX - 4, maxX: HX + 4, minZ: -144.2, maxZ: -138.2 }; // 跳完最後一塊石落嘅台
export const KEEP = { minX: HX - 18, maxX: HX + 18, minZ: -203, maxZ: -187 }; // 城堡主樓（行唔入）
export const COURTYARD = { minX: HX - 30, maxX: HX + 30, minZ: -187, maxZ: -150 };
export const CASTLE_GATE_Z = -149; // 前面城牆（有閘口 |dx| < 5）
export const WITCH = { x: HX - 7, z: -166 }; // 🧙‍♀️ 女巫（面向 +z，望住閘口）
export const CAULDRON = { x: HX - 7, z: -163.2 };
export const WITCH_CAT = { x: HX - 4.4, z: -165.4 };
export const TOWER = { x: HX + 41, z: -171, r: 6.5, h: 64 }; // 🗼 Witch Tower：城堡東邊（庭園東牆有缺口去）
export const TOWER_DOOR = { x: HX + 34.2, z: -171 }; // 門喺塔嘅西面（向住庭園）
// 🌀 城堡正門 = 返 Halloween World 嘅傳送門（Issue #14：「The castle door at the front should be the portal」）
//   漩渦喺閘口內面（z）；由庭園行出閘口穿過漩渦 = 返去，或者企喺閘口撳 E；由外面行入嚟就照常入城堡
export const CASTLE_PORTAL = { x: HX, z: CASTLE_GATE_Z - 1.6, w: 3.3 };
// 🌳 Witch's Skill Tree（女巫隔籬）同 🛒 Castle Shop（庭園東邊）—— Issue #14
export const SKILL_TREE = { x: HX - 15, z: -162.5, ry: 0.75 };
export const CASTLE_SHOP = { x: HX + 18.5, z: -158.5, ry: -1.0 };

// 行唔入嘅長方形（城堡、城牆）：只計喺城堡島上面（跌落熔岩已經燒走咗）
export const HELL_BLOCKS = [
  KEEP,
  { minX: HX - 32, maxX: HX - 30, minZ: -187, maxZ: -148 }, // 西牆
  { minX: HX + 30, maxX: HX + 32, minZ: -187, maxZ: -178 }, // 東牆（北段）
  { minX: HX + 30, maxX: HX + 32, minZ: -164, maxZ: -148 }, // 東牆（南段）—— 中間缺口去 Witch Tower
  { minX: HX - 32, maxX: HX - 5, minZ: -150, maxZ: -148 }, // 前牆（左）
  { minX: HX + 5, maxX: HX + 32, minZ: -150, maxZ: -148 }, // 前牆（右）
];

// ---------- 🔥 Parkour：飛天熔岩石 ----------
// shape 'rect'（w × d）或者 'circle'（r）；top = 石面高度；cp = Checkpoint 編號
// move：slide（沿 x／z 嚟回）、bob（上落）、spin（打圈轉，載住你轉）、orbit（兜圈飛）
// 設計：最慢嘅玩家（Speed 100 → 每秒 6 米，跳 0.75 秒）平地最遠跳 4.5 米；石與石之間最近時 ≤ 2.6 米、高低 ≤ 1.2 米
const R = (x, z, w, d, top, move) => ({ shape: 'rect', x: HX + x, z, w, d, top, move });
const C = (x, z, r, top, move, cp) => ({ shape: 'circle', x: HX + x, z, r, top, move, cp });
export const HELL_ROCKS = [
  { ...C(0, HELL_START.z, HELL_START.r, HELL_START.top, null, 0), island: true }, // ⭕ 到埗石島
  // 第 1 段：唔郁嘅石（熱身）
  R(0, 24, 3.6, 3.6, 3.4),
  R(2.6, 18.6, 3.2, 3.2, 3.8),
  R(-0.8, 13.2, 3.2, 3.2, 4.2),
  R(0.4, 7.8, 3.2, 3.2, 4.0),
  C(0, 0, 4.2, 4.5, null, 1), // 🚩 Checkpoint 1
  // 第 2 段：左右飄、上落浮
  R(0, -8.2, 3.6, 3.6, 4.6, { kind: 'slide', axis: 'x', amp: 3, period: 6 }),
  R(0, -14.4, 3.6, 3.6, 5.0, { kind: 'slide', axis: 'x', amp: 3, period: 6, phase: 0.5 }),
  R(0, -20.6, 3.6, 3.6, 5.2, { kind: 'bob', amp: 1, period: 4 }),
  R(0, -27, 3.6, 3.6, 5.4, { kind: 'slide', axis: 'z', amp: 1.4, period: 5 }),
  C(0, -36.5, 4.5, 5.6, null, 2), // 🚩 Checkpoint 2
  // 第 3 段：轉緊嘅圓石（企上去會載住你轉）
  C(0, -46.2, 3, 5.8, { kind: 'spin', speed: 0.8 }),
  C(3.2, -53.6, 3, 6.2, { kind: 'spin', speed: -1.0 }),
  C(-0.5, -61, 3, 6.6, { kind: 'spin', speed: 1.2 }),
  C(0, -70.5, 4.5, 7, null, 3), // 🚩 Checkpoint 3
  // 第 4 段：兩舊石兜圈飛（等佢哋靠埋先跳）
  R(0, -80.5, 3.2, 3.2, 7.2, { kind: 'orbit', r: 2.2, period: 7 }),
  R(0, -89, 3.2, 3.2, 7.6, { kind: 'orbit', r: 2.2, period: 7, phase: 0.5 }),
  R(0, -96.6, 3.4, 3.4, 8, { kind: 'bob', amp: 0.8, period: 3.5 }),
  C(0, -105, 4.5, 8.4, null, 4), // 🚩 Checkpoint 4
  // 第 5 段：咩都有（最後衝刺）
  R(0, -113.4, 3.6, 3.6, 8.8, { kind: 'slide', axis: 'x', amp: 3.5, period: 7 }),
  C(0, -120.4, 3, 9.2, { kind: 'spin', speed: 1.4 }),
  R(0, -127.6, 3.6, 3.6, 9.6, { kind: 'slide', axis: 'z', amp: 1.4, period: 4.5 }),
  R(2, -134, 3.6, 3.6, 10, { kind: 'bob', amp: 0.7, period: 3 }),
];
// 🚩 Checkpoint：企上去就記住（跌落熔岩就喺度重新出現）；5 = 城堡著陸台
export const HELL_CHECKPOINTS = [
  ...HELL_ROCKS.filter((r) => r.cp != null).map((r) => ({ x: r.x, z: r.cp === 0 ? HELL_ARRIVE.z : r.z, top: r.top, cp: r.cp })),
  { x: HX, z: (CASTLE_LANDING.minZ + CASTLE_LANDING.maxZ) / 2, top: CASTLE_TOP, cp: 5 },
];
export const HELL_LAST_CP = HELL_CHECKPOINTS.length - 1;

// 某一刻嘅石喺邊（t = 秒）：{ x, z, top, angle }（hellWorld.js 同測試 script 共用）
export function rockAt(rock, t) {
  const m = rock.move;
  let x = rock.x, z = rock.z, top = rock.top, angle = 0;
  if (m) {
    const ph = ((t / (m.period || 1)) + (m.phase || 0)) * Math.PI * 2;
    if (m.kind === 'slide') {
      if (m.axis === 'x') x += Math.sin(ph) * m.amp;
      else z += Math.sin(ph) * m.amp;
    } else if (m.kind === 'bob') top += Math.sin(ph) * m.amp;
    else if (m.kind === 'orbit') {
      x += Math.cos(ph) * m.r;
      z += Math.sin(ph) * m.r;
    } else if (m.kind === 'spin') angle = t * m.speed;
  }
  return { x, z, top, angle };
}

// ---------- 範圍 ----------
export const inHell = (x, z) => Math.abs(x - HX) < HELL_EDGE && z > HELL_RECT.minZ - 60 && z < HELL_RECT.maxZ + 60;
const inR = (r, x, z, m) => x > r.minX - m && x < r.maxX + m && z > r.minZ - m && z < r.maxZ + m;
// 行得嘅地方（halloweenShape.js 嘅 hwWalkable 叫）：大範圍入面都行得（跌落熔岩會燒返去），除咗城堡啲牆／塔
export function hellWalkable(x, z, radius) {
  if (!inR(HELL_RECT, x, z, -radius)) return false;
  if (HELL_BLOCKS.some((b) => inR(b, x, z, radius))) return false;
  if (Math.hypot(x - TOWER.x, z - TOWER.z) < TOWER.r + radius) return false;
  return true;
}
// 你喺邊（HUD 個地名、霧）
export function hellZoneAt(x, z) {
  if (inR(CASTLE_ISLAND, x, z, 2) || inR(CASTLE_LANDING, x, z, 1)) return 'Witch Castle';
  return 'Hell';
}
