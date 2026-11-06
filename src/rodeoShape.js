// 🤠 Catch & Tame 地圖喺邊（獨立一個細檔，world.js 都 import 得，唔會兜圈）
// 喺好遠嘅東邊（x = 4000），一直向 -z 跑（無限）；正常世界喺 x≈0，Halloween 喺西邊（x < 0）
export const RODEO_ORIGIN = { x: 4000, z: 0 };
export const inRodeo = (x) => x > 3600 && x < 4400; // 成條 z 都係
