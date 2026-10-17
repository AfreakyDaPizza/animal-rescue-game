// Laboratory（Issue #2）嘅位置同大細：喺 Hub 大門（ANIMAL RESCUE PARK）外面，向南（+z）
// 獨立一個檔，等 world.js、lab.js、labBoss.js 都 import 得，唔會兜圈
//
//        Hub 大門（z = 62）
//            ││  ← 閘口通道（GATE_LANE）
//     ┌──────┘└──────┐
//     │   前院 YARD   │  ← 以後可以喺兩邊再開新地方（例如海灘）
//     └─────┐  ┌─────┘
//           │門│        ← LAB_DOOR
//   ┌───────┘  └───────┐
//   │    LABORATORY    │  ← Boss 戰場（冇屋頂，鏡頭唔會俾天花擋住）
//   └──────────────────┘
//          ……（傳送門）……
//        ╭──────────╮
//        │  ARENA    │  ← 圓形 Boss 場（好遠，淨係可以經傳送門去）
//        ╰──────────╯

export const GATE_LANE = { minX: -3.3, maxX: 3.3, minZ: 50, maxZ: 64 };
export const YARD = { minX: -24, maxX: 24, minZ: 61, maxZ: 100.5 };
export const LAB_DOOR = { minX: -4.5, maxX: 4.5, minZ: 97, maxZ: 104 };
export const LAB = { minX: -30, maxX: 30, minZ: 100, maxZ: 150, wallH: 9 };
export const LAB_DOOR_Z = 100; // 實驗室前牆
export const PORTAL = { x: 0, z: 147.5, y: 4.2 }; // 實驗室後面嘅傳送門（打開咗就可以入去 Boss 場）
// 4 個玻璃艙：入面困住動物，用鎚仔打爛救佢哋（小朋友 2026-10-15）
export const PODS = [
  { x: -26.5, z: 113 }, { x: -26.5, z: 131 },
  { x: 26.5, z: 113 }, { x: 26.5, z: 131 },
];
// 冇 Boss 戰嗰陣由 Arena 返嚟：企喺實驗室傳送門前面
export const LAB_RETURN = { x: 0, z: 140 };

// ---- Boss Arena（小朋友：入咗傳送門去一個「圓形、未來感」嘅場）----
// 好遠（z = 320），只可以經傳送門去；四周有圓形力場牆，行唔出去、跌唔落去
export const ARENA = { x: 0, z: 320, r: 40 }; // 小朋友 2026-10-17（Issue #3）：大啲（本來 26）
export const ARENA_START = { x: 0, z: ARENA.z + ARENA.r - 8 }; // 入嚟／俾 Boss 打中之後企嘅位（南邊）
export const BOSS_HOME = { x: 0, z: 310 };
export const BOSS_PORTAL = { x: 0, z: ARENA.z - (ARENA.r - 2.5), y: 4.2 }; // Boss 叫生態區 Boss 出嚟嘅傳送門（北邊）
export const EXIT_PORTAL = { x: 0, z: ARENA.z + (ARENA.r - 2.5), y: 2.6 }; // 離開：返實驗室（南邊，任何時候都用得）
// 4 個 Solar Energy Capsule：圍住個場
export const CAPSULES = [45, 135, 225, 315].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { x: ARENA.x + Math.cos(a) * ARENA.r * 0.58, z: ARENA.z + Math.sin(a) * ARENA.r * 0.58 };
});
export const inArena = (x, z, margin = 0) => Math.hypot(x - ARENA.x, z - ARENA.z) <= ARENA.r - margin;
// 將一個位置拉返入 Arena 入面（Boss、手下、紅框用）
export function clampArena(v, margin = 1) {
  const dx = v.x - ARENA.x;
  const dz = v.z - ARENA.z;
  const d = Math.hypot(dx, dz);
  const max = ARENA.r - margin;
  if (d > max) {
    v.x = ARENA.x + (dx / d) * max;
    v.z = ARENA.z + (dz / d) * max;
  }
  return v;
}
// Hub 入面嘅秘密紅色掣（Magic Library 後面）
export const RED_BUTTON = { x: -34, z: 25 };

export const inRect = (r, x, z, m = 0) => x >= r.minX + m && x <= r.maxX - m && z >= r.minZ + m && z <= r.maxZ - m;
export const inLab = (x, z) => inRect(LAB, x, z) && z > LAB_DOOR_Z + 0.5;
// Biome 6 座山後面嘅鎚仔（經山兩邊窄路入去）
export const HAMMER_SPOT = { x: 0, z: -370.2 };

// ---- 秘密沙灘（Issue #2 最後一樣）：前院東邊，打贏 Boss 先開 ----
// 乾淨沙灘 + 大海，可以坐喺長櫈睇流星；遠處有個神秘人坐喺石上面，撳 E → 秘密結局「THE COLLAB」
export const BEACH = { minX: 24, maxX: 64, minZ: 63, maxZ: 100 };
export const BEACH_PASS = { minX: 19, maxX: 29, minZ: 77.5, maxZ: 86.5 }; // 前院去沙灘嘅入口
export const BENCH = { x: 50, z: 72 }; // 坐低睇流星（面向 +x 個海）
export const STRANGER = { x: 59.5, z: 94 }; // 神秘人
