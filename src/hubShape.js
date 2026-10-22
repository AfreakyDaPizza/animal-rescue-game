// 圓形 Hub 嘅大細（獨立一個檔，等 world.js 同 hubPark.js 都 import 得，唔會兜圈）
// 圓心 (cx, cz)、半徑 r；z < 0 嗰截切走（嗰度係生態區通道），所以頂係一條直線
// minX…maxZ 係包住成個 Hub 嘅長方形（舊代碼用）
const R = 38;
const CZ = 24;
export const HUB = { cx: 0, cz: CZ, r: R, minX: -R, maxX: R, minZ: 0, maxZ: CZ + R };
// 圍牆有幾高（小朋友 2026-10-22：「make the borders at Hub higher」→ 3.5 → 7）；world.js 起牆、meteorDecor.js 放牆頂水晶都用
export const HUB_WALL_H = 7;

// 🐾 地塊（2026-10-18 Hub 重新排位：搬咗去噴水池右邊 Pets Zone；閘口喺 minX 嗰邊、面向噴水池條路）
export const PLOT = { minX: 14, maxX: 30, minZ: 16.5, maxZ: 31.5, gateZ: 24, gateWidth: 3 };

// ✨ Magic Library（Issue #10：小朋友叫佢貼住圍牆，慳位）+ ☄️ Meteoric Shop（喺圖書館隔籬）
// 兩間都喺 Hub 左邊、背脊貼住圍牆、面向 +x（Hub 中間）；前面有條直路連住兩個門口
export const LIBRARY = { x: -31.2, z: 19.5 };
export const METEOR_SHOP = { x: -31.0, z: 32.0 };
export const LIBRARY_WALK_X = -25.6; // 兩間門口前面嗰條直路（x）
