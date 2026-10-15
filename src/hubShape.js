// 圓形 Hub 嘅大細（獨立一個檔，等 world.js 同 hubPark.js 都 import 得，唔會兜圈）
// 圓心 (cx, cz)、半徑 r；z < 0 嗰截切走（嗰度係生態區通道），所以頂係一條直線
// minX…maxZ 係包住成個 Hub 嘅長方形（舊代碼用）
const R = 38;
const CZ = 24;
export const HUB = { cx: 0, cz: CZ, r: R, minX: -R, maxX: R, minZ: 0, maxZ: CZ + R };
