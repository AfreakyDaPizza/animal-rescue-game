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

export const GATE_LANE = { minX: -3.3, maxX: 3.3, minZ: 50, maxZ: 64 };
export const YARD = { minX: -24, maxX: 24, minZ: 61, maxZ: 100.5 };
export const LAB_DOOR = { minX: -4.5, maxX: 4.5, minZ: 97, maxZ: 104 };
export const LAB = { minX: -30, maxX: 30, minZ: 100, maxZ: 150, wallH: 9 };
export const LAB_DOOR_Z = 100; // 實驗室前牆
export const BOSS_HOME = { x: 0, z: 134 };
export const PORTAL = { x: 0, z: 147.5, y: 4.2 };
// 4 個 Solar Energy Capsule（小朋友：實驗室周圍有 4 個）
export const CAPSULES = [
  { x: -18, z: 112 },
  { x: 18, z: 112 },
  { x: -18, z: 138 },
  { x: 18, z: 138 },
];
// 被捉嚟嘅瀕危動物瞓喺玻璃艙入面（結局會醒，走返去你個地塊）
export const PODS = [
  { x: -27, z: 110 }, { x: -27, z: 122 }, { x: -27, z: 134 },
  { x: 27, z: 110 }, { x: 27, z: 122 }, { x: 27, z: 134 },
];
// 被彈飛：落返實驗室門口外面（唔使由 Hub 行返嚟，對小朋友公平啲）
export const LAB_RESPAWN = { x: 0, z: 92 };

export const inRect = (r, x, z, m = 0) => x >= r.minX + m && x <= r.maxX - m && z >= r.minZ + m && z <= r.maxZ - m;
export const inLab = (x, z) => inRect(LAB, x, z) && z > LAB_DOOR_Z + 0.5;
