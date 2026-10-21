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
export const ARENA = { x: 0, z: 320, r: 52 }; // 小朋友 Issue #3、#4：再大啲（本來 26 → 40 → 52）
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
// 小朋友 Issue #5：搬咗去 Biome 6 條橋下面（山後面條窄路，鎚仔隔籬）；撳咗就開 Fuse Machine 同新生態區（仲有實驗室大閘）

export const inRect = (r, x, z, m = 0) => x >= r.minX + m && x <= r.maxX - m && z >= r.minZ + m && z <= r.maxZ - m;
export const inLab = (x, z) => inRect(LAB, x, z) && z > LAB_DOOR_Z + 0.5;
// Biome 6 座山後面嘅鎚仔（經山兩邊窄路入去）
export const HAMMER_SPOT = { x: 0, z: -370.2 };

// ---- 秘密沙灘（Issue #2；Issue #4 之後小朋友話：唔係喺實驗室隔籬，係打贏 Boss 之後先見到）----
// 喺好遠嘅地方（x 再加 BEACH_OFFSET，霧遮住，喺園入面望唔到），打贏 Boss 之後先去到；
// 秘密沙灘嘅模型用「本地」座標（BEACH_LOCAL 等）起，再成舊搬過去
export const BEACH_OFFSET = 300;
export const BEACH_LOCAL = { minX: 24, maxX: 64, minZ: 63, maxZ: 100 };
export const BENCH_LOCAL = { x: 50, z: 72 }; // 坐低睇流星（面向 +x 個海）
export const STRANGER_LOCAL = { x: 59.5, z: 94 }; // 神秘人
export const BEACH_PORTAL_LOCAL = { x: 28, z: 81.5 }; // 返去公園嘅傳送門
export const BEACH_PIER_LOCAL = { minX: 55, maxX: 83, minZ: 79.6, maxZ: 83.4 }; // Issue #9：木碼頭（行得出去海上面；塊板闊 2.8，兩邊留返公仔闊度）
const W = (p) => ({ ...p, x: p.x + BEACH_OFFSET });
export const BEACH = { ...BEACH_LOCAL, minX: BEACH_LOCAL.minX + BEACH_OFFSET, maxX: BEACH_LOCAL.maxX + BEACH_OFFSET };
export const BENCH = W(BENCH_LOCAL);
export const STRANGER = W(STRANGER_LOCAL);
export const BEACH_PORTAL = W(BEACH_PORTAL_LOCAL);
export const BEACH_PIER = { ...BEACH_PIER_LOCAL, minX: BEACH_PIER_LOCAL.minX + BEACH_OFFSET, maxX: BEACH_PIER_LOCAL.maxX + BEACH_OFFSET };
export const BEACH_ARRIVE = { x: BEACH.minX + 8, z: 81.5 }; // 去到沙灘企喺邊

// ---- 💪 GYM（小朋友 2026-10-18）：實驗室爆炸之後，實驗室冇咗，Gym 喺原位出現；GYM_OPEN_DATE 先開門 ----
// gym.js 用「設計座標」（_LOCAL：大門向 +x）起，成座再轉 90° 搬去實驗室個位（大門向 -z，對住前院）
export const GYM_LOCAL = { minX: -66, maxX: -30, minZ: 63, maxZ: 100, wallH: 8 };
export const GYM_DOOR_Z_LOCAL = 81.5; // 大門中間
export const GYM_DOOR_LOCAL = { minX: -34, maxX: -21, minZ: GYM_DOOR_Z_LOCAL - 3, maxZ: GYM_DOOR_Z_LOCAL + 3 };
export const GYM_PORTAL_LOCAL = { x: -20.6, z: 70, y: 2.7 }; // 門外去秘密沙灘嘅傳送門（面向 +x）
// 設計座標 → 世界：大門 (GYM_LOCAL.maxX, GYM_DOOR_Z_LOCAL) 去到實驗室門口 (0, LAB_DOOR_Z)；+x（出門）變 -z
export const GYM_TURN = Math.PI / 2;
export const GYM_SHIFT = { x: -GYM_DOOR_Z_LOCAL, z: LAB_DOOR_Z + GYM_LOCAL.maxX }; // rotation.y = GYM_TURN 之後再搬
export const gymToWorld = (x, z) => ({ x: z + GYM_SHIFT.x, z: -x + GYM_SHIFT.z });
export const gymToLocal = (x, z) => ({ x: GYM_SHIFT.z - z, z: x - GYM_SHIFT.x });
const rectToWorld = (r) => {
  const a = gymToWorld(r.minX, r.minZ);
  const b = gymToWorld(r.maxX, r.maxZ);
  return { ...r, minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z) };
};
export const gymRectToWorld = rectToWorld;
// 世界座標（main.js、world.js 用）
export const GYM = rectToWorld(GYM_LOCAL); // x -18.5…18.5，z 100…136
export const GYM_DOOR = rectToWorld(GYM_DOOR_LOCAL); // 門口條路（駁去前院）
export const GYM_DOOR_X = 0;
export const GYM_DOOR_Z = LAB_DOOR_Z; // 大門喺前牆（z = 100）
export const GYM_PORTAL = { ...gymToWorld(GYM_PORTAL_LOCAL.x, GYM_PORTAL_LOCAL.z), y: GYM_PORTAL_LOCAL.y }; // 前院入面，面向 Hub
export const GYM_FRONT = { x: 0, z: 86 }; // 爆炸動畫之後企喺度（望住 Gym 大門）
export const inGym = (x, z) => inRect(GYM, x, z);
// 企喺 Gym 大門前面（未開門嗰陣彈倒數）
export const nearGymDoor = (x, z) => Math.abs(x - GYM_DOOR_X) < 5 && z < GYM_DOOR_Z + 1 && z > GYM_DOOR_Z - 9;
// 實驗室爆咗冇咗（打贏 Boss 之後；main.js 設定）
export const labStatus = { gone: false };
