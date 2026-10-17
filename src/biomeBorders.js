// 生態區嘅邊界（小朋友 2026-10-17）：唔再係矮石牆，改做好高嘅「山丘」，每個生態區唔同樣
// 山丘喺行得到嘅範圍外面（內邊貼住本來幅牆嘅位），由牆邊一級級向外升高；淨係睇，唔使撞（撞嘢照用 STEM 個長方形）
// 全部放入 staticRoot，最後焊埋（畫得快）

import * as THREE from 'three';
import { STEM, biomeRect } from './world.js';

function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const materials = new Map();
const mat = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...extra }));
  return materials.get(key);
};
const BOX = new THREE.BoxGeometry(1, 1, 1);
function block(root, material, x, y, z, w, h, d, ry = 0) {
  const m = new THREE.Mesh(BOX, material);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = false; // 好大嘅嘢唔使影（快啲）
  m.receiveShadow = true;
  root.add(m);
  return m;
}

// 每個生態區嘅樣：side 係山身顏色、top 係頂顏色、h 係幾高、steep = 1 就似懸崖（唔分級）
const STYLES = [
  { side: 0x6d8f3a, top: 0x7cb342, h: [10, 15], deco: 'forest' }, // 1 砍伐森林：青草山 + 松樹 + 樹頭
  { side: 0xd9c38f, top: 0xe6d3a3, h: [8, 12], deco: 'dunes', left: { side: 0x7a7066, top: 0x8d8478, h: [12, 17], steep: true, deco: 'cliff' } }, // 2 沙灘：右邊沙丘、左邊（海）懸崖
  { side: 0x33691e, top: 0x43a047, h: [12, 17], deco: 'jungle' }, // 3 雀鳥森林：熱帶山 + 大樹 + 藤
  { side: 0xb3d4e6, top: 0xf5f9fc, h: [11, 18], deco: 'ice' }, // 4 北極：雪山 + 冰
  { side: 0x8d5a3b, top: 0xa1704f, h: [12, 16], steep: true, deco: 'canyon' }, // 5 走私營地：峽谷石牆 + 鐵絲網
  { side: 0x3e3a3f, top: 0x524c55, h: [14, 18], steep: true, deco: 'crystal' }, // 6 礦山：黑石懸崖 + 水晶
];

const DEPTH = 13; // 山丘向外有幾闊
const STEP_Z = 5.2; // 每一嚿山沿住通道有幾長

export function buildBiomeBorders(root) {
  for (let i = 0; i < STYLES.length; i++) {
    const rect = biomeRect(i);
    const rand = seededRandom(900 + i);
    for (const side of [-1, 1]) {
      const style = side < 0 && STYLES[i].left ? STYLES[i].left : STYLES[i];
      const wallX = side < 0 ? STEM.minX : STEM.maxX;
      for (let z = rect.maxZ; z > rect.minZ - 0.01; z -= STEP_Z) {
        const len = Math.min(STEP_Z + 0.6, z - rect.minZ + 0.6);
        const cz = z - len / 2 + 0.3;
        hill(root, style, wallX, side, cz, len, rand);
      }
    }
  }
  // 最尾（Biome 6 後面）：橫住嘅黑石懸崖（喺倒數牆後面，唔會遮住個牌）
  const end = STYLES[5];
  const rand = seededRandom(999);
  for (let x = STEM.minX - DEPTH; x < STEM.maxX + DEPTH; x += STEP_Z) {
    const h = end.h[0] + rand() * (end.h[1] - end.h[0]);
    const w = STEP_Z + 0.6;
    block(root, mat(end.side), x + w / 2, h / 2, STEM.minZ - DEPTH / 2 - 0.5, w, h, DEPTH);
    block(root, mat(end.top), x + w / 2, h + 0.3, STEM.minZ - DEPTH / 2 - 0.5, w * 0.9, 0.6, DEPTH * 0.9);
    if (rand() < 0.6) crystal(root, x + w / 2, h + 0.6, STEM.minZ - 2 - rand() * 6, rand);
  }
}

// 一嚿山：由牆邊向外一級級升高（steep 就直上直落似懸崖），頂有裝飾
function hill(root, style, wallX, side, cz, len, rand) {
  const H = style.h[0] + rand() * (style.h[1] - style.h[0]);
  const sideM = mat(style.side);
  const topM = mat(style.top);
  const levels = style.steep ? [[0, 1]] : [[0, 0.45], [0.3, 0.75], [0.55, 1]]; // [由牆外幾遠開始（0–1）, 高幾成]
  let topY = 0;
  let topX = 0;
  for (const [start, k] of levels) {
    const x1 = wallX + side * (0.4 + start * DEPTH);
    const x2 = wallX + side * (DEPTH + 0.4);
    const w = Math.abs(x2 - x1);
    const h = H * k * (0.92 + rand() * 0.16);
    const x = (x1 + x2) / 2;
    block(root, sideM, x, h / 2, cz, w, h, len);
    block(root, topM, x, h + 0.25, cz, w + 0.2, 0.5, len + 0.2); // 頂嗰層（草／雪／沙）
    topY = h + 0.5;
    topX = x1 + side * Math.min(w * 0.3, 2.5);
  }
  // 懸崖面嘅凹凸（等佢唔會死板一塊）
  if (style.steep) {
    for (let k = 0; k < 2; k++) {
      const bh = 2 + rand() * 4;
      block(root, sideM, wallX + side * 0.6, 1 + rand() * (H - 4) + bh / 2, cz + (rand() - 0.5) * len * 0.6, 1.4, bh, 1.5 + rand() * 2);
    }
  }
  decorate(root, style.deco, topX, topY, cz, len, side, H, wallX, rand);
}

function pine(root, x, y, z, s) {
  block(root, mat(0x5d4037), x, y + 0.8 * s, z, 0.5 * s, 1.6 * s, 0.5 * s);
  [[2.4, 1.0, 2.0], [1.8, 0.9, 2.8], [1.1, 0.8, 3.5]].forEach(([w, h, yy], i) => block(root, mat(i % 2 ? 0x43a047 : 0x2e7d32), x, y + yy * s, z, w * s, h * s, w * s, i * 0.4));
}
function crystal(root, x, y, z, rand) {
  const c = [0x7c4dff, 0x00e5ff, 0xff4081][Math.floor(rand() * 3)];
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.6 + rand() * 0.6), mat(c, { emissive: c, emissiveIntensity: 1.2, roughness: 0.3 }));
  m.scale.y = 2;
  m.position.set(x, y + 0.5, z);
  root.add(m);
}

function decorate(root, deco, x, y, z, len, side, H, wallX, rand) {
  const along = () => z + (rand() - 0.5) * len * 0.8;
  if (deco === 'forest') {
    for (let k = 0; k < 2; k++) {
      if (rand() < 0.65) pine(root, x + side * rand() * 6, y, along(), 0.9 + rand() * 0.6);
      else {
        block(root, mat(0x8b5a2b), x + side * rand() * 5, y + 0.3, along(), 0.8, 0.6, 0.8); // 樹頭
        block(root, mat(0xd2a76a), x + side * rand() * 5, y + 0.62, along(), 0.7, 0.04, 0.7);
      }
    }
  } else if (deco === 'dunes') {
    for (let k = 0; k < 3; k++) block(root, mat(0x9ccc65), x + side * rand() * 7, y + 0.4, along(), 0.15, 0.8, 0.15, rand()); // 沙丘草
  } else if (deco === 'cliff') {
    block(root, mat(0xeceff1), wallX + side * 0.5, 0.4, z, 1.2, 0.8, len); // 撞上懸崖嘅浪花
    if (rand() < 0.4) block(root, mat(0xffffff), x + side * 2, y + 0.4, along(), 0.6, 0.5, 0.9); // 海鷗巢（白色）
  } else if (deco === 'jungle') {
    const tx = x + side * (1 + rand() * 4);
    const tz = along();
    const s = 1.2 + rand() * 0.8;
    block(root, mat(0x6b4423), tx, y + 2 * s, tz, 0.7 * s, 4 * s, 0.7 * s);
    block(root, mat(0x2e7d32), tx, y + 4.6 * s, tz, 4 * s, 2.2 * s, 4 * s);
    block(root, mat(0x66bb6a), tx + side * 0.8, y + 5.9 * s, tz + 0.4, 2.6 * s, 1.5 * s, 2.6 * s);
    for (let k = 0; k < 3; k++) {
      const vh = 2 + rand() * (H * 0.4);
      block(root, mat(0x558b2f), wallX + side * 0.45, H * 0.45 - vh / 2, along(), 0.12, vh, 0.12); // 藤（吊落嚟）
    }
    if (rand() < 0.5) block(root, mat([0xff4081, 0xffeb3b, 0xff7043][Math.floor(rand() * 3)]), x + side * rand() * 3, y + 0.3, along(), 0.4, 0.4, 0.4); // 花
  } else if (deco === 'ice') {
    for (let k = 0; k < 2; k++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.6 + rand() * 0.8, 2 + rand() * 3, 5), mat(0xb3e5fc, { emissive: 0x4fc3f7, emissiveIntensity: 0.25, roughness: 0.2 }));
      m.position.set(x + side * rand() * 6, y + 1.2, along());
      root.add(m);
    }
    block(root, mat(0xe1f5fe), wallX + side * 0.5, H * 0.3, z, 0.9, H * 0.6, len * 0.9); // 冰川面
  } else if (deco === 'canyon') {
    // 頂有鐵絲網：柱 + 兩條線
    const fx = wallX + side * 1.2;
    for (let k = 0; k < 2; k++) block(root, mat(0x616161), fx, y + 0.9, z - len / 2 + k * len, 0.15, 1.8, 0.15);
    for (const yy of [1.2, 1.7]) block(root, mat(0x9e9e9e, { metalness: 0.6 }), fx, y + yy, z, 0.05, 0.05, len);
    if (rand() < 0.4) block(root, mat(0x795548), x + side * rand() * 5, y + 0.5, along(), 1, 1, 1); // 木箱
  } else if (deco === 'crystal') {
    if (rand() < 0.7) crystal(root, wallX + side * 0.7, 1 + rand() * (H - 3), along(), rand); // 懸崖面嘅水晶
    if (rand() < 0.6) crystal(root, x + side * rand() * 5, y, along(), rand);
  }
}

