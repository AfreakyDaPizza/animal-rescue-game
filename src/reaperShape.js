// 🐉 Pumpkin Reaper Dragon 嘅大廳（Issue #11）：Abandoned Manor 入面爛咗嘅大廳
// 獨立一個檔（冇 THREE、冇 import），halloweenShape.js（行得嘅範圍）同 reaperBoss.js 都用
// 大廳喺好遠嘅北邊（只可以經大屋前門入去），仍然算 Halloween 世界（x < -1250）
//
//   由上面望落去（-z 係「上」）
//   ┌───────────────────────────┐ z -1125
//   │   ▲ 爛咗嘅窗、燭台、畫     │
//   │         ( 🐉 )            │  中間：地板爆咗個大窿，Boss 由度鑽出嚟（行唔入）
//   │  柱                    柱  │
//   │          🚪 出口           │ z -1075（南牆中間，企喺度撳 E = 離開）
//   └───────────────────────────┘

export const REAPER_HALL = { x: -1400, z: -1100, w: 60, d: 50, wallH: 16 };
export const REAPER_ZONE = '🏚️ Manor Hall'; // 位置牌顯示嘅名
export const REAPER_HOLE_R = 6.5; // 中間個窿（Boss）幾大：行唔入
const H = REAPER_HALL;
export const REAPER_ARRIVE = { x: H.x, z: H.z + H.d / 2 - 6, rotY: 0 }; // 入嚟企喺度，望住 Boss（北）
export const REAPER_EXIT = { x: H.x, z: H.z + H.d / 2 - 1.2 }; // 南牆中間嘅門：企喺度撳 E 出返去
// 爛咗嘅石柱（撞到）
export const REAPER_PILLARS = [[-20, -14], [20, -14], [-20, 12], [20, 12]].map(([dx, dz]) => ({ x: H.x + dx, z: H.z + dz, r: 1.5 }));

export const inReaperHall = (x, z) => x > H.x - H.w / 2 - 4 && x < H.x + H.w / 2 + 4 && z > H.z - H.d / 2 - 4 && z < H.z + H.d / 2 + 4;
// 喺大廳入面行得嘅地方：唔出牆、唔跌落中間個窿、唔撞柱
export function reaperHallWalkable(x, z, radius) {
  if (x < H.x - H.w / 2 + radius + 0.6 || x > H.x + H.w / 2 - radius - 0.6) return false;
  if (z < H.z - H.d / 2 + radius + 0.6 || z > H.z + H.d / 2 - radius - 0.4) return false;
  if (Math.hypot(x - H.x, z - H.z) < REAPER_HOLE_R + radius) return false;
  return !REAPER_PILLARS.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + radius);
}
// 將一個位擺返入大廳（唔喺牆外、唔喺窿入面）
export function clampHall(p, m = 2) {
  p.x = Math.max(H.x - H.w / 2 + m, Math.min(H.x + H.w / 2 - m, p.x));
  p.z = Math.max(H.z - H.d / 2 + m, Math.min(H.z + H.d / 2 - m, p.z));
  const dx = p.x - H.x;
  const dz = p.z - H.z;
  const d = Math.hypot(dx, dz);
  const min = REAPER_HOLE_R + m * 0.5;
  if (d < min) {
    const k = d > 0.01 ? min / d : 0;
    p.x = H.x + (d > 0.01 ? dx * k : min);
    p.z = H.z + dz * k;
  }
  return p;
}
