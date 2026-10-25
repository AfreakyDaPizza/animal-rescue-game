// 🗼 Endless Witch Tower 入面（小朋友 Issue #11）：圓形石地板嘅魔法塔層
// 獨立一個檔（冇 THREE、冇 import），halloweenShape.js（行得嘅範圍）同 witchTower.js 都用
// 位置喺好遠嘅西邊（x -3200），唔撞 Ghost World（-2000）、Hell（-2600 ±150）、Manor Hall（-1400, -1100）
// 仍然算 Halloween 世界（x < -1250）：恐怖天空、Halloween 音樂照用
// 只可以經 Witch Castle 嗰道塔門入（或者控制台）
//
//   由上面望落去（-z 係「上」）
//            📖  🕯️  📖
//        🔥              🔥
//     🧪      ( ✨ 升降魔法陣 )     🧪      ← 中間：打完一層企上去 = 上下一層
//        🔥              🔥
//            📖  🚪  📖              ← 南邊：出口（打完一層可以安全離開）

export const TOWER_ARENA = { x: -3200, z: 0, r: 24, wallH: 22 };
export const TOWER_ZONE = '🗼 Witch Tower'; // 位置牌顯示嘅名
const A = TOWER_ARENA;
export const TOWER_LIFT = { x: A.x, z: A.z, r: 3.4 }; // ✨ 中間嘅升降魔法陣
export const TOWER_ARRIVE = { x: A.x, z: A.z + 15, rotY: 0 }; // 入嚟企喺度，望住中間（北）
export const TOWER_EXIT = { x: A.x, z: A.z + A.r - 1.4 }; // 🚪 南牆嘅門：企喺度撳 E 離開

// 撞到嘅道具（大鍋、書架）：{ x, z, r }
const polar = (deg, r) => ({ x: A.x + Math.sin((deg * Math.PI) / 180) * r, z: A.z - Math.cos((deg * Math.PI) / 180) * r }); // 0° = 北（-z），順時針
export const TOWER_CAULDRONS = [0, 75, 285].map((deg) => ({ deg, ...polar(deg, 19.5), r: 1.5 }));
export const TOWER_SHELVES = [32, 112, 146, 214, 248, 328].map((deg) => ({ deg, ...polar(deg, A.r - 1.1) }));
export const TOWER_PROPS = [
  ...TOWER_CAULDRONS.map((c) => ({ x: c.x, z: c.z, r: c.r })),
  // 書架打橫：用兩個圓擋住
  ...TOWER_SHELVES.flatMap((s) => [-1, 1].map((k) => ({ ...polar(s.deg + k * 3.6, A.r - 1.2), r: 1.1 }))),
];
export { polar as towerPolar };
// 🧩 每層主題（towerFloors.js）自己加嘅撞到嘅道具（世界座標 { x, z, r }）；離開塔 = 清走
let ACTIVE_PROPS = TOWER_PROPS;
export function setTowerFloorProps(list = []) {
  ACTIVE_PROPS = list.length ? TOWER_PROPS.concat(list) : TOWER_PROPS;
}

export const inTowerArena = (x, z) => Math.hypot(x - A.x, z - A.z) < A.r + 6;
// 喺塔入面行得嘅地方：唔出牆、唔撞道具
export function towerWalkable(x, z, radius) {
  if (Math.hypot(x - A.x, z - A.z) > A.r - radius - 0.6) return false;
  return !ACTIVE_PROPS.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + radius);
}
// 將一個位擺返入塔入面（敵人用）：m = 離牆幾遠
export function clampTower(p, m = 1.2) {
  const dx = p.x - A.x;
  const dz = p.z - A.z;
  const d = Math.hypot(dx, dz);
  const max = A.r - m;
  if (d > max) {
    p.x = A.x + (dx / d) * max;
    p.z = A.z + (dz / d) * max;
  }
  for (const o of ACTIVE_PROPS) {
    const ox = p.x - o.x;
    const oz = p.z - o.z;
    const od = Math.hypot(ox, oz);
    const min = o.r + m * 0.6;
    if (od < min && od > 0.001) {
      p.x = o.x + (ox / od) * min;
      p.z = o.z + (oz / od) * min;
    }
  }
  return p;
}
