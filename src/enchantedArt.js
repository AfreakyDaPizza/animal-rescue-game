// Biome 7 Enchanted Kingdom 新美術（Issue #19，2026-11-09）
// 小朋友：「The enchanted forest needs to be redesigned. the map not animals and boss」「Make it look good」
// 舊版：霓虹格仔地板（好似的士高）、平平哋嘅紫色方塊牆 → 而家變做真係「魔法森林」：
//   青苔草地（有會發光嘅細花）、石仔路 + 發金光嘅縫、發光小溪 + 石橋欄、長滿青苔嘅分層石崖、
//   方塊魔法大樹（吊住發光果）、崖後面一排巨型樹（有深度）、草叢同發光花、螢火蟲（enchanted.js）
// 動物、Boss、跳菇 Parkour、皇宮、Skywhale 全部唔郁；中間動物範圍一樣清清楚楚

import * as THREE from 'three';
import { canvasTex, shade, pixelNoise, tiledBox } from './biomeArt.js';

const cache = new Map();
const mat = (key, make) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
};
const std = (color, extra = {}) => mat('s' + color + JSON.stringify(extra), () => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra }));
const glowMat = (color, k = 1.2) => mat('g' + color + k, () => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4 }));
function add(parent, geo, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// 固定 seed 嘅亂數（紋理每次都一樣）
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// 會發光嘅細花顏色（地板、草叢共用）
const FLOWERS = ['#ff80ab', '#84ffff', '#ffe57f', '#b388ff', '#ccff90'];
// 會一閃一閃嘅物料（enchanted.js 每格調 emissiveIntensity）
export const pulseMats = [];

// ---------- 地板：青苔草地 ----------
// 兩張 canvas：顏色 + 發光（淨係細花會發光，夜晚好似星星咁）
export function forestFloor(view, rect) {
  const w = rect.maxX - rect.minX;
  const d = rect.maxZ - rect.minZ;
  const rep = [w / 8, d / 8];
  const flowers = [];
  const r = seeded(19);
  const map = canvasTex(128, (ctx, n) => {
    pixelNoise(ctx, n, 0x2f7a4f, 0.09, 4, r);
    // 一撮撮淺色草
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = shade(0x4caf50, (r() - 0.3) * 0.12);
      ctx.fillRect(Math.floor(r() * 32) * 4, Math.floor(r() * 32) * 4, 4, 8);
    }
    // 深色青苔
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = shade(0x1b5e3a, r() * 0.05);
      ctx.fillRect(Math.floor(r() * 32) * 4, Math.floor(r() * 32) * 4, 8, 4);
    }
    // 細花
    for (let i = 0; i < 9; i++) {
      const f = { x: Math.floor(r() * 31) * 4, y: Math.floor(r() * 31) * 4, c: FLOWERS[i % FLOWERS.length] };
      flowers.push(f);
      ctx.fillStyle = f.c;
      ctx.fillRect(f.x, f.y, 4, 4);
    }
  });
  const emap = canvasTex(128, (ctx, n) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, n, n);
    for (const f of flowers) {
      ctx.fillStyle = f.c;
      ctx.fillRect(f.x, f.y, 4, 4);
    }
  });
  for (const t of [map, emap]) t.repeat.set(rep[0], rep[1]);
  const floorMat = new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: emap, emissiveIntensity: 0.8, roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((rect.minX + rect.maxX) / 2, 0.012, (rect.minZ + rect.maxZ) / 2);
  floor.receiveShadow = true;
  view.add(floor);
  return floorMat;
}

// ---------- 石仔路（縫發金光） ----------
function cobbleMats() {
  return mat('cobble', () => {
    const r = seeded(7);
    const stones = [];
    const map = canvasTex(64, (ctx, n) => {
      ctx.fillStyle = '#3d3550';
      ctx.fillRect(0, 0, n, n);
      // 一嚿嚿石（錯開排）
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 3; col++) {
          const x = col * 22 + (row % 2) * 11 - 4;
          const s = { x, y: row * 16 + 2, w: 18, h: 12, c: shade(0xb8a9c9, (r() - 0.5) * 0.14) };
          stones.push(s);
          for (const dx of [0, n]) {
            ctx.fillStyle = s.c;
            ctx.fillRect(s.x + 2 - dx, s.y, s.w, s.h);
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(s.x + 3 - dx, s.y + 1, s.w - 6, 3);
          }
        }
    });
    const emap = canvasTex(64, (ctx, n) => {
      ctx.fillStyle = '#5c4300'; // 縫：暗金光
      ctx.fillRect(0, 0, n, n);
      for (const s of stones) for (const dx of [0, n]) {
        ctx.fillStyle = '#000';
        ctx.fillRect(s.x + 2 - dx, s.y, s.w, s.h);
      }
    });
    const m = new THREE.MeshStandardMaterial({ map, emissive: 0xffd740, emissiveMap: emap, emissiveIntensity: 1, roughness: 0.7 });
    pulseMats.push({ m, base: 1, amp: 0.35, speed: 1.2 });
    return { map, emap, m };
  });
}
// 平面路（rotY：轉幾多）；UV 跟尺寸，每 4 米一格
function pathStrip(view, x, z, w, len, rotY = 0) {
  const { map, emap } = cobbleMats();
  const m = mat('cobbleStrip' + w + 'x' + len, () => {
    const base = cobbleMats().m;
    const mm = base.clone();
    mm.map = map.clone();
    mm.emissiveMap = emap.clone();
    for (const t of [mm.map, mm.emissiveMap]) {
      t.needsUpdate = true;
      t.repeat.set(w / 4, len / 4);
    }
    pulseMats.push({ m: mm, base: 1, amp: 0.35, speed: 1.2 });
    return mm;
  });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, len), m);
  p.rotation.set(-Math.PI / 2, 0, rotY);
  p.position.set(x, 0.03, z);
  p.receiveShadow = true;
  view.add(p);
  return p;
}
// 圓形廣場（中間噴泉）
function plaza(view, x, z, r) {
  const { map, emap } = cobbleMats();
  const mm = cobbleMats().m.clone();
  mm.map = map.clone();
  mm.emissiveMap = emap.clone();
  for (const t of [mm.map, mm.emissiveMap]) {
    t.needsUpdate = true;
    t.repeat.set(r / 2, r / 2);
  }
  pulseMats.push({ m: mm, base: 1, amp: 0.35, speed: 1.2 });
  const p = new THREE.Mesh(new THREE.CircleGeometry(r, 32), mm);
  p.rotation.x = -Math.PI / 2;
  p.position.set(x, 0.035, z);
  p.receiveShadow = true;
  view.add(p);
}
// 路邊嘅石（行得穿，矮矮哋）+ 每隔一段一支發光燈柱
function pathEdge(root, x0, z0, x1, z1, rand, skip = () => false) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const stone = std(0x7e6f96, { flatShading: true });
  const lampPost = std(0x4e342e);
  let n = 0;
  for (let t = 0; t <= len; t += 1.6) {
    const k = t / len;
    const x = x0 + (x1 - x0) * k;
    const z = z0 + (z1 - z0) * k;
    if (skip(x, z)) continue; // 廣場、溪嗰度唔放
    const s = 0.35 + rand() * 0.25;
    add(root, new THREE.BoxGeometry(s * 1.4, s, s), stone, x + (rand() - 0.5) * 0.2, s / 2, z, false).rotation.y = rand();
    if (n++ % 8 === 4) {
      add(root, new THREE.BoxGeometry(0.22, 2.4, 0.22), lampPost, x, 1.2, z);
      add(root, new THREE.BoxGeometry(0.5, 0.5, 0.5), glowMat(0xfff59d, 0.9), x, 2.6, z, false);
      add(root, new THREE.BoxGeometry(0.7, 0.12, 0.7), lampPost, x, 2.9, z, false);
    }
  }
}

export function forestPaths(view, root, rect, cz, rand) {
  const top = rect.maxZ - 2;
  const end = rect.minZ + 14;
  pathStrip(view, 0, (top + end) / 2, 6.5, top - end);
  const skip = (x, z) => Math.hypot(x, z - (cz + 8)) < 11.5 || Math.abs(z - (rect.maxZ - 42)) < 6; // 中間廣場、小溪石橋
  pathEdge(root, -3.6, top, -3.6, end, rand, skip);
  pathEdge(root, 3.6, top, 3.6, end, rand, skip);
  plaza(view, 0, cz + 8, 11);
  // 去兩邊噴泉嘅細路（斜）
  for (const side of [-1, 1]) {
    const x0 = side * 3;
    const z0 = cz - 20;
    const x1 = side * 40;
    const z1 = cz - 40;
    const len = Math.hypot(x1 - x0, z1 - z0);
    pathStrip(view, (x0 + x1) / 2, (z0 + z1) / 2, 3.5, len, Math.atan2(x1 - x0, z1 - z0));
    plaza(view, x1, z1, 8.5);
  }
}

// ---------- 發光小溪（橫過成個王國，行得過；條大路上面有石橋欄） ----------
export function glowStream(view, root, rect, z0, rand) {
  const water = mat('stream', () => new THREE.MeshStandardMaterial({ color: 0x4dd0e1, emissive: 0x00b8d4, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.88 }));
  pulseMats.push({ m: water, base: 0.8, amp: 0.3, speed: 2 });
  const bank = std(0x9a8cb4, { flatShading: true });
  const pad = std(0x43a047);
  const zAt = (x) => z0 + Math.sin(x * 0.07) * 6 + Math.sin(x * 0.19) * 1.5;
  for (let x = rect.minX; x < rect.maxX; x += 1.5) {
    const z = zAt(x + 0.75);
    const zN = zAt(x + 2.25);
    const seg = add(view, new THREE.BoxGeometry(1.7, 0.04, 4.2), water, x + 0.75, 0.045, z, false);
    seg.rotation.y = -Math.atan2(zN - z, 1.5);
    seg.receiveShadow = false;
    if (Math.abs(x) < 5) continue; // 條大路上面唔放石
    for (const side of [-1, 1]) {
      if (rand() < 0.4) continue; // 唔好成排都係石
      const s = 0.2 + rand() * 0.25;
      add(root, new THREE.BoxGeometry(s * 1.5, s, s * 1.2), bank, x + rand(), s / 2, z + side * (2.2 + rand() * 0.4), false).rotation.y = rand() * 3;
    }
    // 荷葉 + 發光花
    if (rand() < 0.22) {
      const px = x + rand();
      const pz = z + (rand() - 0.5) * 2.4;
      add(root, new THREE.CylinderGeometry(0.5, 0.5, 0.04, 8), pad, px, 0.08, pz, false);
      if (rand() < 0.6) add(root, new THREE.OctahedronGeometry(0.18), glowMat(new THREE.Color(FLOWERS[Math.floor(rand() * FLOWERS.length)]).getHex(), 1.6), px, 0.25, pz, false);
    }
  }
  // 石橋欄（大路兩邊；矮，行得穿）
  const rail = std(0xd1c4e9, { flatShading: true });
  const zb = zAt(0);
  for (const side of [-1, 1]) {
    add(root, new THREE.BoxGeometry(0.5, 0.9, 6), rail, side * 3.6, 0.45, zb);
    for (const dz of [-3, 3]) {
      add(root, new THREE.BoxGeometry(0.8, 1.4, 0.8), rail, side * 3.6, 0.7, zb + dz);
      add(root, new THREE.BoxGeometry(0.4, 0.4, 0.4), glowMat(0x84ffff, 1.8), side * 3.6, 1.6, zb + dz, false);
    }
  }
  return zAt;
}

// ---------- 青苔石崖（邊界）----------
function rockMat() {
  return mat('rock', () => {
    const r = seeded(3);
    const map = canvasTex(64, (ctx, n) => {
      pixelNoise(ctx, n, 0x5a4e6e, 0.1, 4, r);
      // 石層紋
      for (let y = 8; y < n; y += 16) {
        ctx.fillStyle = 'rgba(20,10,40,0.35)';
        ctx.fillRect(0, y, n, 2);
      }
      // 青苔點
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = shade(0x3f8f5a, (r() - 0.5) * 0.1);
        ctx.fillRect(Math.floor(r() * 16) * 4, Math.floor(r() * 16) * 4, 4, 4);
      }
    });
    return new THREE.MeshStandardMaterial({ map, roughness: 0.95, flatShading: true });
  });
}
export function rockBase(w, h, d) {
  const g = tiledBox(w, h, d, 4);
  return new THREE.Mesh(g, rockMat());
}
const grassTop = () => std(0x3f9a5c, { flatShading: true });
const CRYSTAL_C = [0xea80fc, 0x18ffff, 0xffd740, 0xb388ff];
export function mossyCliff(root, x, z, w, d, rand) {
  const rock = rockMat();
  const h = 9 + rand() * 12;
  const tiers = 2 + Math.floor(rand() * 2);
  let y = -13;
  let tw = w;
  let td = d;
  for (let t = 0; t < tiers; t++) {
    const th = (t === 0 ? 13 : 0) + h / tiers;
    add(root, tiledBox(tw, th, td, 4), rock, x + (t ? (rand() - 0.5) * 1.2 : 0), y + th / 2, z + (t ? (rand() - 0.5) * 1.2 : 0));
    y += th;
    // 每層頂一塊草 + 吊落嚟嘅青苔
    add(root, new THREE.BoxGeometry(tw + 0.3, 0.5, td + 0.3), grassTop(), x, y + 0.1, z, false);
    for (let k = 0; k < 3; k++) {
      const len = 0.8 + rand() * 2.2;
      const side = rand() < 0.5 ? -1 : 1;
      const alongX = rand() < 0.5;
      add(root, new THREE.BoxGeometry(alongX ? 0.4 : 0.15, len, alongX ? 0.15 : 0.4), grassTop(), x + (alongX ? (rand() - 0.5) * tw : side * (tw / 2 + 0.1)), y - len / 2, z + (alongX ? side * (td / 2 + 0.1) : (rand() - 0.5) * td), false);
    }
    tw *= 0.72;
    td *= 0.72;
  }
  // 頂上嘅水晶叢 / 發光蘑菇
  if (rand() < 0.55) {
    for (let k = 0; k < 3; k++) {
      const c = CRYSTAL_C[Math.floor(rand() * CRYSTAL_C.length)];
      const cr = add(root, new THREE.OctahedronGeometry(0.6 + rand() * 1), glowMat(c, 1.1), x + (rand() - 0.5) * tw, y + 1 + rand(), z + (rand() - 0.5) * td, false);
      cr.scale.y = 2;
      cr.rotation.z = (rand() - 0.5) * 0.6;
    }
  } else {
    forestTree(root, x, z, 0.7 + rand() * 0.4, rand, y + 0.3);
  }
}

// ---------- 方塊魔法大樹 ----------
const CANOPY = [
  [0x2e8b57, 0x43a047, 0x66bb6a], // 綠
  [0x00897b, 0x26a69a, 0x4db6ac], // 青
  [0xc2185b, 0xec407a, 0xf48fb1], // 粉紅花樹
  [0x5e35b1, 0x7e57c2, 0x9575cd], // 紫
];
const FRUIT = [0xfff59d, 0x84ffff, 0xff80ab, 0xccff90];
export function forestTree(root, x, z, s, rand, y0 = 0) {
  const pal = CANOPY[Math.floor(rand() * CANOPY.length)];
  const bark = std(rand() < 0.5 ? 0x5d4037 : 0x4e3b5c, { flatShading: true });
  const th = (4.5 + rand() * 1.5) * s;
  add(root, new THREE.BoxGeometry(1.1 * s, th, 1.1 * s), bark, x, y0 + th / 2, z);
  // 樹根
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + rand() * 0.4;
    const rt = add(root, new THREE.BoxGeometry(1.4 * s, 0.45 * s, 0.4 * s), bark, x + Math.cos(a) * 0.7 * s, y0 + 0.2 * s, z + Math.sin(a) * 0.7 * s, false);
    rt.rotation.y = -a;
  }
  // 一條橫枝
  add(root, new THREE.BoxGeometry(2 * s, 0.4 * s, 0.4 * s), bark, x + 0.9 * s, y0 + th * 0.65, z, false).rotation.z = 0.5;
  // 三層樹冠
  const layers = [[5.2, 2.2], [4, 1.8], [2.6, 1.4]];
  let y = y0 + th - 0.3 * s;
  layers.forEach(([w, h], i) => {
    const c = add(root, new THREE.BoxGeometry(w * s, h * s, w * s), std(pal[i], { flatShading: true }), x + (rand() - 0.5) * 0.6 * s, y + (h * s) / 2, z + (rand() - 0.5) * 0.6 * s);
    c.rotation.y = rand() * 0.6;
    y += h * s * 0.85;
  });
  // 吊住嘅發光果
  const fruit = glowMat(FRUIT[Math.floor(rand() * FRUIT.length)], 1.6);
  for (let k = 0; k < 4; k++) {
    const a = rand() * Math.PI * 2;
    const r = 2.1 * s;
    const fx = x + Math.cos(a) * r;
    const fz = z + Math.sin(a) * r;
    const fy = y0 + th - 0.6 * s;
    add(root, new THREE.BoxGeometry(0.05, 0.7 * s, 0.05), std(0x33691e), fx, fy, fz, false);
    add(root, new THREE.BoxGeometry(0.32 * s, 0.32 * s, 0.32 * s), fruit, fx, fy - 0.45 * s, fz, false);
  }
}

// ---------- 草叢 + 發光花 ----------
export function grassTuft(root, x, z, rand) {
  const g = std(rand() < 0.5 ? 0x4caf50 : 0x66bb6a);
  for (let k = 0; k < 3; k++) {
    const h = 0.35 + rand() * 0.4;
    const b = add(root, new THREE.BoxGeometry(0.08, h, 0.08), g, x + (rand() - 0.5) * 0.3, h / 2, z + (rand() - 0.5) * 0.3, false);
    b.rotation.z = (rand() - 0.5) * 0.6;
    b.rotation.x = (rand() - 0.5) * 0.6;
  }
}
export function glowFlower(root, x, z, rand) {
  const h = 0.4 + rand() * 0.5;
  add(root, new THREE.BoxGeometry(0.06, h, 0.06), std(0x2e7d32), x, h / 2, z, false);
  const c = new THREE.Color(FLOWERS[Math.floor(rand() * FLOWERS.length)]).getHex();
  add(root, new THREE.BoxGeometry(0.22, 0.12, 0.22), glowMat(c, 1.5), x, h, z, false).rotation.y = 0.78;
}
