// 圓形 Hub 嘅大細（獨立一個檔，等 world.js 同 hubPark.js 都 import 得，唔會兜圈）
// 圓心 (cx, cz)、半徑 r；z < 0 嗰截切走（嗰度係生態區通道），所以頂係一條直線
// minX…maxZ 係包住成個 Hub 嘅長方形（舊代碼用）
const R = 38;
const CZ = 24;
export const HUB = { cx: 0, cz: CZ, r: R, minX: -R, maxX: R, minZ: 0, maxZ: CZ + R };
// 圍牆有幾高（小朋友 2026-10-22：「make the borders at Hub higher」→ 3.5 → 7）；world.js 起牆、meteorDecor.js 放牆頂水晶都用
export const HUB_WALL_H = 7;

// ---- 2026-11-06 Issue #16 Hub 重新排位（小朋友：「THE PLOT IN THE MIDDLE AND STALLS HAPPY MACHINE AND LIBRARY ON THE SIDES AND ON THE RIGHT WILL BE A NEW AREA」）----
// 由上面望（-z 係生態區）：
//   最上：左 🏃 Training Zone ── 入口（出世點）── 右 🛍️ Shop Street（Skin／Sell／Save）
//   中間：🐾 Animal Shelter Safety Zoo（地塊，閘口向北）；四邊一圈石路
//   左邊：😊 Happy Machines（一行 5 部，面向地塊）+ 貼住圍牆嘅 ✨ Magic Library
//   右邊：🤠 Catch & Tame 新區（木欄牧場：傳送門 + Lasso Sam + Tamer Ayden + Special's Stall；tameStalls.js）
//   最底：左 Owner's Garden（吊床）、大門
// 噴水池、遊樂場、Fuse Machine 已經冇咗

// 🐾 地塊：Hub 正中間；閘口喺北邊（minZ），對住入口條路
// Issue #17 小朋友：「make the plot into a circle」→ 圓形：圓心 (cx, cz)、半徑 r；minX…maxZ 係包住個圓嘅正方形（舊代碼用）
const PLOT_R = 8.5;
const PLOT_CZ = 23.5;
export const PLOT = { cx: 0, cz: PLOT_CZ, r: PLOT_R, minX: -PLOT_R, maxX: PLOT_R, minZ: PLOT_CZ - PLOT_R, maxZ: PLOT_CZ + PLOT_R, gateX: 0, gateZ: PLOT_CZ - PLOT_R, gateWidth: 3 };
// 喺地塊個圓入面？（m = 留幾多邊）
export const inPlotCircle = (x, z, m = 0) => Math.hypot(x - PLOT.cx, z - PLOT.cz) <= PLOT.r - m;
// 圓形圍欄喺某個 x 嘅北邊（z 細嗰邊）係幾多
export const plotNorthZ = (x) => PLOT.cz - Math.sqrt(Math.max(0, PLOT.r ** 2 - (x - PLOT.cx) ** 2));
export const PLOT_RING = 2.6; // 地塊四邊條石路有幾闊

// 😊 Happy Machines：左邊一行（x 固定），面向 +x（地塊）
export const MACHINE_ROW = { x: -17, zs: [17.5, 23, 28.5, 34, 39.5] };
export const MACHINE_SIGN = { x: -17, z: 45 }; // 繁殖機升級牌（一行機嘅尾）

// ✨ Magic Library（Issue #10：貼住圍牆）+ ☄️ Meteoric Shop（喺圖書館隔籬；METEOR_SHOP_ON 收埋咗）
// 兩間都喺 Hub 左邊、背脊貼住圍牆、面向 +x（Hub 中間）；前面有條直路連住兩個門口
export const LIBRARY = { x: -31.2, z: 21 };
export const METEOR_SHOP = { x: -31.0, z: 33.5 };
export const LUCK_MACHINE = { x: -31.0, z: 33.5, rot: Math.PI / 2 }; // 🍀 Issue #21：以前 Meteoric Shop 個位（收埋咗），面向 +x（圖書館門口條路）
export const LIBRARY_WALK_X = -25.6; // 兩間門口前面嗰條直路（x）

// 🤠 Catch & Tame 新區（Hub 右邊）：西邊木欄有入口（gateZ），東邊係圍牆
export const TAME_AREA = { minX: 14, minZ: 13.5, maxZ: 45, gateZ: 28 };
export const TAME_PORTAL = { x: 32.4, z: 28 }; // 大傳送門（面向 -x）
export const LASSO_STALL = { x: 20, z: 18 }; // 🪢 Lasso Sam（面向 +z）
export const FLUTE_STALL = { x: 28, z: 18.6 }; // 🎵 Tamer Ayden（面向 +z）
export const SPECIAL_STALL_POS = { x: 23.5, z: 39 }; // ⭐ Special's Stall（面向 -z）
export const BUCKING_BULL = { x: 31.5, z: 36.5 }; // 🐂 機械牛（Issue #21 2026-11-13，傳送門同 Special's Stall 中間）

// 出世／傳送返 Hub 嘅位（入口同地塊閘口中間）；🎃 Halloween 傳送門（HALLOWEEN_ON）放喺地塊下面條路
export const HUB_SPAWN = { x: 0, z: 9 }; // 2026-11-07：退後啲，第三身鏡頭唔會撞落地塊閘口塊牌
export const HW_PORTAL_SPOT = { x: 0, z: 44 };
