// 🤠 Catch & Tame 三張地圖嘅樣（小朋友 Issue #16：「IN THE 3 MAP THEY LOOK COOL AND DIFFERENT」）
//   🦒 Savanna：金色草、平頂金合歡樹、白蟻丘、猴麵包樹、石堆、日落天
//   🐪 Desert：沙丘、仙人掌、紅石、平頂山（mesa）、骨頭、熱浪
//   🌲 Taiga：松樹林、雪地、倒咗嘅樹、樹樁、石、凍冰冰嘅霧天 + 落雪
// 地圖係「無限」嘅：rodeo.js 每 CHUNK_LEN 米叫一次 buildChunk() 起前面，後面嗰啲拆走
// 地圖喺好遠嘅東邊（RODEO_ORIGIN，x = 4000），一直向 -z 跑；同正常世界、Halloween（西邊）都唔撞
// 方塊風格：全部用 1×1×1 方塊／圓柱／錐縮放，最後每個 chunk 按材質焊埋（少啲 draw call）

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { canvasTex, seeded } from './halloweenArt.js';
import { RODEO_LANE } from './data/tameAnimals.js';

import { RODEO_ORIGIN } from './rodeoShape.js';
export { RODEO_ORIGIN };
export const CHUNK_LEN = 40;

// ---------- 天、霧、光（每張地圖唔同）----------
// sky: [地平線色, 天頂色]；sunDir：太陽喺邊（x, 高度, z；-z = 前面）；fog: [色, 近, 遠]
// Issue #17：霧色 = 地平線色（遠處嘅山、樹慢慢溶入天，唔會「啪」一聲出現）
export const MAP_LOOK = {
  savanna: {
    sky: [0xf9bb7c, 0x8e6fc4], sunDir: [0.25, 0.07, -1], sunColor: 0xffa860, sunAmt: 1.5,
    fog: [0xf9bb7c, 60, 260], hemi: [0xffd2a0, 0x8a6a3a, 1.55], light: [0xffc890, 2.5],
    particles: { color: 0xffe082, size: 0.12, count: 260, fall: -0.2, drift: 0.6 }, // 金色塵
    dust: 0xd8b47c, // 💨 動物跑過踢起嘅塵（Issue #17）
  },
  desert: {
    sky: [0xf6e0b2, 0x3d8fe0], sunDir: [-0.35, 0.55, -1], sunColor: 0xfff3c0, sunAmt: 1.1,
    fog: [0xf6e0b2, 80, 310], hemi: [0xfff3e0, 0xc9a46a, 1.6], light: [0xfff0d0, 2.9],
    particles: { color: 0xf5deb3, size: 0.09, count: 220, fall: 0.1, drift: 2.4 }, // 風吹沙
    dust: 0xf0d6a4,
    haze: true,
  },
  taiga: {
    sky: [0xd0d9e2, 0x7891a8], sunDir: [0.4, 0.3, -1], sunColor: 0xe0ecff, sunAmt: 0.5,
    fog: [0xd0d9e2, 28, 185], hemi: [0xdbe8f5, 0x56634f, 1.7], light: [0xe6f0ff, 1.7],
    particles: { color: 0xffffff, size: 0.16, count: 900, fall: 2.2, drift: 0.7 }, // 落雪
    dust: 0xf4f8ff, // 雪粉
  },
};

// ---------- 共用幾何 + 材質（縮放用）----------
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  cone: new THREE.ConeGeometry(0.5, 1, 6),
  cone4: new THREE.ConeGeometry(0.5, 1, 4),
  ball: new THREE.SphereGeometry(0.5, 10, 7),
  disc: new THREE.CylinderGeometry(0.5, 0.5, 0.04, 10),
};
const mats = new Map();
const M = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...extra }));
  return mats.get(key);
};
function put(parent, geo, color, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0, shadow = true) {
  const m = new THREE.Mesh(G[geo], typeof color === 'number' ? M(color) : color);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  m.castShadow = shadow;
  parent.add(m);
  return m;
}

// ---------- 地板紋理 ----------
const shadeHex = (c, l) => '#' + new THREE.Color(c).offsetHSL(0, 0, l).getHexString();
function groundTexture(mapId) {
  const r = seeded(mapId.length * 31 + 7);
  return canvasTex(256, (ctx, S) => {
    const base = { savanna: 0xcfa74e, desert: 0xe6c283, taiga: 0x4c5f3c }[mapId];
    for (let y = 0; y < S; y += 8) for (let x = 0; x < S; x += 8) {
      ctx.fillStyle = shadeHex(base, (r() - 0.5) * 0.06);
      ctx.fillRect(x, y, 8, 8);
    }
    if (mapId === 'savanna') {
      // 一撇撇草（金、啡、淡綠）
      for (let i = 0; i < 700; i++) {
        ctx.fillStyle = ['#e9c766', '#b88a3a', '#d7b85c', '#a9a14e', '#f3d985'][Math.floor(r() * 5)];
        ctx.fillRect(Math.floor(r() * S), Math.floor(r() * S), 2, 4 + Math.floor(r() * 6));
      }
      for (let i = 0; i < 10; i++) { // 乾泥地
        ctx.fillStyle = 'rgba(150, 100, 50, 0.22)';
        ctx.beginPath();
        ctx.ellipse(r() * S, r() * S, 10 + r() * 22, 6 + r() * 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (mapId === 'desert') {
      // 沙紋（一條條波浪）
      ctx.lineWidth = 2;
      for (let y = 4; y < S; y += 12) {
        ctx.strokeStyle = r() < 0.5 ? 'rgba(170, 120, 60, 0.28)' : 'rgba(255, 240, 200, 0.4)';
        ctx.beginPath();
        for (let x = 0; x <= S; x += 8) ctx.lineTo(x, y + Math.sin(x / 20 + y) * 3);
        ctx.stroke();
      }
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = r() < 0.5 ? '#c99a5b' : '#fff1cf';
        ctx.fillRect(Math.floor(r() * S), Math.floor(r() * S), 2, 2);
      }
    } else {
      // 雪地（白色帶淡藍），少少松針、樹枝；森林底嘅深色由地形 vertex color 畫（Issue #17）
      for (let y = 0; y < S; y += 8) for (let x = 0; x < S; x += 8) {
        ctx.fillStyle = shadeHex(0xeef3f8, (r() - 0.5) * 0.05);
        ctx.fillRect(x, y, 8, 8);
      }
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = `rgba(170, 195, 225, ${0.18 + r() * 0.2})`;
        ctx.beginPath();
        ctx.ellipse(r() * S, r() * S, 10 + r() * 22, 4 + r() * 8, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = ['#3b4d2e', '#5b6e45', '#6a5a3e', '#8a9aa8'][Math.floor(r() * 4)];
        ctx.fillRect(Math.floor(r() * S), Math.floor(r() * S), 2, 2 + Math.floor(r() * 3));
      }
    }
  }, { nearest: false });
}

// ---------- 🏔️ 起伏地形（小朋友 Issue #17：「make the terrain generation better for the catch and tame」）----------
// 跑道（|x| < RODEO_LANE）：好長好慢嘅起伏，馬同動物跟住上落（唔會太斜）
// 兩邊：山丘／沙丘脊／雪山，離跑道越遠越高；一條彎彎曲曲嘅乾河床（Savanna）／乾溪（Desert）／結冰河（Taiga）間中橫過跑道
// 每段地圖自己起一塊地（CHUNK_LEN 米長），高度用同一條公式計（同一個 seed），所以段同段之間冇罅、冇接縫
// The kid can change these numbers (English comments):
export const TERRAIN = {
  savanna: {
    laneHills: 2.0, // how high the gentle bumps on the riding path get (metres)
    sideHills: 18, // how tall the hills beside the path get (metres)
    hillSize: 65, // how wide each hill is (bigger = wider, smoother hills)
    river: { width: 7, depth: 0.7 }, // 🏜️ dry riverbed that winds across the path
  },
  desert: {
    laneHills: 2.4,
    sideHills: 22,
    hillSize: 50,
    dunes: true, // 🐪 long sand-dune ridges instead of round hills
    river: { width: 9, depth: 0.55 }, // dry wash (wadi) with pebbles
  },
  taiga: {
    laneHills: 1.6,
    sideHills: 26,
    hillSize: 60,
    river: { width: 8, depth: 0.45, ice: true }, // 🧊 frozen river
  },
};
export const LANDMARK_EVERY = 5; // 🗿 a big landmark (waterhole, mesa, frozen lake...) about every this many chunks (1 chunk = 40 m)

// 一個 run 一個 seed（每次地形唔同）
let TER = { mapId: 'savanna', seed: 1, p: [0, 0, 0, 0, 0, 0, 0, 0] };
const landmarkCache = new Map();
export function setTerrain(mapId, seed = Math.floor(Math.random() * 1e9)) {
  const r = seeded(seed);
  TER = { mapId, seed, p: Array.from({ length: 8 }, () => r() * 1000) };
  landmarkCache.clear();
}
// 2D value noise（0…1，平滑）
function hash2(ix, iz, k = 0) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(TER.seed + k * 7919, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h = Math.imul(h ^ (h >>> 16), 1274126177);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
function vnoise(x, z, k = 0) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, k);
  const b = hash2(ix + 1, iz, k);
  const c = hash2(ix, iz + 1, k);
  const d = hash2(ix + 1, iz + 1, k);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, z, k = 0) => vnoise(x, z, k) * 0.62 + vnoise(x * 2.1 + 17, z * 2.1 - 9, k + 1) * 0.28 + vnoise(x * 4.3 - 5, z * 4.3 + 3, k + 2) * 0.1;
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// 河／乾河床中線（x 偏移，跟住 z 慢慢彎）
export const riverX = (z) => 36 * Math.sin(z * 0.0046 + TER.p[2]) + 20 * Math.sin(z * 0.0117 + TER.p[3]);
// 🌲 森林密度 0…1：同一個 noise 畫地面深色 + 決定邊度種樹 → 有樹林、有空地
export const forestAt = (lx, z) => fbm(lx / 46 + 300, z / 46, 5);

// 地形高度（未計河、湖）；lx = 離跑道中間幾遠
function baseHeight(lx, z) {
  const C = TERRAIN[TER.mapId];
  const p = TER.p;
  const a = Math.abs(lx);
  // 跑道：長長嘅起伏（約 4% 斜度，騎得舒服）
  const lane = C.laneHills * (0.5 + 0.3 * Math.sin(z * 0.031 + p[0]) + 0.2 * Math.sin(z * 0.074 + p[1] + lx * 0.02));
  const k = smooth(RODEO_LANE + 3, RODEO_LANE + 26, a);
  let h = lane * (1 - 0.4 * k);
  if (k > 0) {
    const S = C.hillSize;
    let side;
    if (C.dunes) {
      // 沙丘脊：一條條打橫（跟風向）嘅脊，加少少彎
      const n = vnoise(lx / (S * 0.8) + 50, z / (S * 0.32) + Math.sin(lx / 40) * 0.6, 3);
      side = Math.pow(1 - Math.abs(2 * n - 1), 1.8) * 0.85 + fbm(lx / S, z / S, 4) * 0.25;
    } else side = Math.pow(fbm(lx / S, z / S, 3), 1.35) * 1.35;
    side *= 0.55 + 0.45 * smooth(30, 130, a);
    // 河谷：近條河嘅地方山變矮（條河喺山谷入面流）
    const rd = Math.abs(lx - riverX(z));
    side *= 0.25 + 0.75 * smooth(C.river.width, C.river.width * 5, rd);
    h += C.sideHills * side * k;
  }
  return h;
}
// 河床：k = 1 喺中間、0 喺岸邊外面
export function riverAt(lx, z) {
  const C = TERRAIN[TER.mapId].river;
  const d = Math.abs(lx - riverX(z));
  return { d, w: C.width, k: 1 - smooth(C.width * 0.45, C.width, d), ice: !!C.ice };
}

// 🗿 Landmark：每段（chunk）最多一個，用 seed 決定（地形公式都要知：湖要整平個地）
const LANDMARKS = {
  savanna: [['waterhole', 3], ['kopje', 3], ['giantBaobab', 2]],
  desert: [['oasis', 3], ['bigMesa', 3], ['duneRidge', 2]],
  taiga: [['frozenLake', 3], ['erratic', 3], ['giantLog', 2]],
};
const FLAT = { waterhole: 12, oasis: 14, frozenLake: 19 }; // 呢啲要一塊平地（半徑，米）
export function landmarkOf(index) {
  if (landmarkCache.has(index)) return landmarkCache.get(index);
  let lm = null;
  const cand = (i) => hash2(i, 77, 9) < 1.4 / LANDMARK_EVERY;
  if (index >= 3 && cand(index) && !cand(index - 1) && !cand(index - 2)) { // 唔好兩個 landmark 貼埋
    const list = LANDMARKS[TER.mapId];
    let tot = 0;
    for (const [, w] of list) tot += w;
    let x = hash2(index, 78, 9) * tot;
    let kind = list[0][0];
    for (const [k, w] of list) if ((x -= w) < 0) {
      kind = k;
      break;
    }
    const side = hash2(index, 79, 9) < 0.5 ? -1 : 1;
    const flat = FLAT[kind] || 0;
    const ax = flat ? RODEO_LANE + flat + 4 + hash2(index, 80, 9) * 10 : RODEO_LANE + 24 + hash2(index, 80, 9) * 40;
    lm = { kind, side, lx: side * ax, z: -index * CHUNK_LEN - CHUNK_LEN * (0.3 + hash2(index, 81, 9) * 0.4), flat, y: null };
  }
  landmarkCache.set(index, lm);
  return lm;
}
// 地面高度（世界 x、z）：rodeo.js 用嚟擺馬、動物、你、套索圈…
export function groundY(wx, z) {
  const lx = wx - RODEO_ORIGIN.x;
  let h = baseHeight(lx, z);
  const rv = riverAt(lx, z);
  if (rv.k > 0) h -= TERRAIN[TER.mapId].river.depth * rv.k;
  // 湖／水氹：整平個地 + 凹少少
  const i = Math.floor(-z / CHUNK_LEN);
  for (let j = i - 1; j <= i + 1; j++) {
    const lm = landmarkOf(j);
    if (!lm || !lm.flat) continue;
    const d = Math.hypot(lx - lm.lx, z - lm.z);
    if (d > lm.flat * 1.7) continue;
    lm.y ??= baseHeight(lm.lx, lm.z) * 0.5;
    const m = 1 - smooth(lm.flat * 0.95, lm.flat * 1.7, d);
    h += (lm.y - 0.35 * (1 - smooth(0, lm.flat * 0.9, d)) - h) * m;
  }
  return h;
}
// 斜度（馬、動物上落斜要傾少少）：沿 z 嘅角度（正數 = 前面高）
export const slopeZ = (wx, z) => Math.atan2(groundY(wx, z - 1.2) - groundY(wx, z + 1.2), 2.4);

// 每張地圖地面嘅顏色變化（乘落紋理度）：草地一笪笪、河床深色、山頂雪…
const _gc = new THREE.Color();
function groundColor(lx, z, h, out) {
  const id = TER.mapId;
  const rv = riverAt(lx, z);
  const patch = vnoise(lx / 26 + 90, z / 26, 6);
  out.setRGB(1, 1, 1);
  if (id === 'savanna') {
    if (patch > 0.6) out.lerp(_gc.setRGB(0.86, 1.02, 0.66), smooth(0.6, 0.8, patch)); // 綠啲嘅草
    if (patch < 0.32) out.lerp(_gc.setRGB(1.06, 0.82, 0.66), smooth(0.32, 0.15, patch)); // 紅泥地
    out.lerp(_gc.setRGB(0.92, 0.9, 0.72), smooth(4, 12, h) * 0.5); // 山上乾啲
    if (rv.k > 0) out.lerp(_gc.setRGB(0.78, 0.62, 0.46), rv.k); // 乾河床
  } else if (id === 'desert') {
    out.lerp(_gc.setRGB(1.08, 1.03, 0.94), smooth(5, 13, h) * 0.8); // 沙丘頂淺色
    out.lerp(_gc.setRGB(0.96, 0.82, 0.72), smooth(0.55, 0.8, patch) * 0.6); // 紅沙
    if (rv.k > 0) out.lerp(_gc.setRGB(0.8, 0.7, 0.6), rv.k * 0.9); // 乾溪
  } else {
    out.lerp(_gc.setRGB(0.36, 0.44, 0.33), smooth(0.45, 0.58, forestAt(lx, z)) * 0.85); // 松林底（松針、泥）
    out.lerp(_gc.setRGB(0.95, 0.97, 1.02), smooth(9, 16, h)); // 高山白雪
    if (rv.k > 0) out.lerp(_gc.setRGB(0.68, 0.86, 1.0), rv.k); // 冰河
  }
  return out;
}

// 地面材質（每張地圖一個，所有段共用）；一段段地面喺 buildChunk 入面起
const GROUND_TILE = 14; // the ground picture repeats every this many metres
const ROW_STEP = 2.5;
const COLS = (() => {
  const xs = [];
  for (let x = -380; x < -130; x += 25) xs.push(x);
  for (let x = -130; x < -44; x += 6) xs.push(x);
  for (let x = -44; x < 44; x += 2) xs.push(x);
  for (let x = 44; x < 130; x += 6) xs.push(x);
  for (let x = 130; x <= 380; x += 25) xs.push(x);
  return xs;
})();
let groundMat = null;
export function buildGround(mapId) {
  setTerrain(mapId);
  const tex = groundTexture(mapId);
  groundMat = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 1 });
  // 好大塊底（喺地形下面，遮住天邊嘅罅）
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshBasicMaterial({ color: MAP_LOOK[mapId].fog[0] }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(RODEO_ORIGIN.x, -4, 0);
  const mat = groundMat;
  return {
    mesh,
    follow(z) {
      mesh.position.z = z;
    },
    dispose() {
      mesh.geometry.dispose();
      mesh.material.dispose();
      mat.dispose();
      tex.dispose();
    },
  };
}
// 一段地面（同 buildChunk 一齊起）：高度、斜面（normal）、顏色都用世界座標計 → 段同段之間冇接縫
function buildGroundStrip(z0) {
  const X = RODEO_ORIGIN.x;
  const rows = Math.round(CHUNK_LEN / ROW_STEP) + 1;
  const cols = COLS.length;
  const pos = new Float32Array(rows * cols * 3);
  const nor = new Float32Array(rows * cols * 3);
  const uv = new Float32Array(rows * cols * 2);
  const col = new Float32Array(rows * cols * 3);
  const c = new THREE.Color();
  for (let r = 0; r < rows; r++) {
    const z = z0 - r * ROW_STEP;
    for (let i = 0; i < cols; i++) {
      const lx = COLS[i];
      const wx = X + lx;
      const h = groundY(wx, z);
      const v = r * cols + i;
      pos[v * 3] = wx;
      pos[v * 3 + 1] = h;
      pos[v * 3 + 2] = z;
      const e = Math.abs(lx) < 50 ? 1 : 4;
      const hx = (groundY(wx + e, z) - groundY(wx - e, z)) / (2 * e);
      const hz = (groundY(wx, z + e) - groundY(wx, z - e)) / (2 * e);
      const n = Math.hypot(hx, 1, hz);
      nor[v * 3] = -hx / n;
      nor[v * 3 + 1] = 1 / n;
      nor[v * 3 + 2] = -hz / n;
      uv[v * 2] = lx / GROUND_TILE;
      uv[v * 2 + 1] = -z / GROUND_TILE;
      groundColor(lx, z, h, c);
      col[v * 3] = c.r;
      col[v * 3 + 1] = c.g;
      col[v * 3 + 2] = c.b;
    }
  }
  const idx = [];
  for (let r = 0; r < rows - 1; r++) for (let i = 0; i < cols - 1; i++) {
    const a = r * cols + i;
    const d = a + cols;
    idx.push(a, a + 1, d, a + 1, d + 1, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, groundMat);
  mesh.receiveShadow = true;
  return mesh;
}

// ---------- 遠景（永遠喺地平線，跟住玩家）----------
export function buildHorizon(mapId) {
  const g = new THREE.Group();
  const look = MAP_LOOK[mapId];
  const tint = (c, k) => new THREE.Color(c).lerp(new THREE.Color(look.fog[0]), k).getHex();
  const far = (c, k) => new THREE.MeshBasicMaterial({ color: tint(c, k), fog: false });
  const r = seeded(mapId.length * 97);
  if (mapId === 'savanna') {
    // 遠處大山（好似乞力馬扎羅）+ 一排排平頂樹影
    const mtn = new THREE.Mesh(new THREE.ConeGeometry(160, 70, 7), far(0x7b5a8a, 0.35));
    mtn.position.set(-120, 20, -430);
    mtn.scale.y = 0.9;
    g.add(mtn);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(42, 20, 7), far(0xffffff, 0.3));
    cap.position.set(-120, 46, -430);
    g.add(cap);
    for (let i = 0; i < 26; i++) {
      const x = -420 + i * 33 + r() * 10;
      const m = far(0x4a3a40, 0.25);
      const tr = new THREE.Mesh(G.box, m);
      tr.scale.set(1.2, 9, 1.2);
      tr.position.set(x, 4.5, -400 - r() * 30);
      const top = new THREE.Mesh(G.box, m);
      top.scale.set(14 + r() * 8, 2.4, 6);
      top.position.set(x, 9.5, tr.position.z);
      g.add(tr, top);
    }
  } else if (mapId === 'desert') {
    // 遠處紅色平頂山（mesa）
    for (let i = 0; i < 9; i++) {
      const x = -420 + i * 105 + r() * 40;
      const w = 50 + r() * 70;
      const h = 30 + r() * 45;
      const base = new THREE.Mesh(G.box, far(0xb85a35, 0.4));
      base.scale.set(w, h, 40);
      base.position.set(x, h / 2 - 2, -430 - r() * 30);
      const band = new THREE.Mesh(G.box, far(0xd98250, 0.4));
      band.scale.set(w + 1, h * 0.18, 41);
      band.position.set(x, h * 0.7, base.position.z);
      g.add(base, band);
    }
  } else {
    // 遠處雪山 + 一排排深色松樹影
    for (let i = 0; i < 8; i++) {
      const x = -420 + i * 120 + r() * 40;
      const h = 80 + r() * 60;
      const m = new THREE.Mesh(new THREE.ConeGeometry(70 + r() * 30, h, 5), far(0x6a7d93, 0.35));
      m.position.set(x, h / 2 - 5, -440);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(28, h * 0.35, 5), far(0xffffff, 0.25));
      cap.position.set(x, h - 5 - h * 0.175, -440);
      g.add(m, cap);
    }
    for (let i = 0; i < 60; i++) {
      const p = new THREE.Mesh(G.cone, far(0x24382c, 0.45));
      const h = 14 + r() * 10;
      p.scale.set(6, h, 6);
      p.position.set(-420 + i * 14 + r() * 6, h / 2, -390 - r() * 20);
      g.add(p);
    }
  }
  g.position.x = RODEO_ORIGIN.x;
  return g;
}

// ---------- 一件件嘢 ----------
// 每個 builder：(parent, x, z, rand, scale) → 撞得到就回傳 { circles:[{x,z,r}], h, kind }
const DECO = {
  // 🦒 Savanna
  acacia(p, x, z, r, s = 1) {
    const trunk = 0x5d4030;
    put(p, 'box', trunk, x, 2 * s, z, 0.45 * s, 4 * s, 0.45 * s, 0, 0, 0.12);
    put(p, 'box', trunk, x + 0.9 * s, 4.3 * s, z, 0.3 * s, 2 * s, 0.3 * s, 0, 0, -0.7);
    put(p, 'box', trunk, x - 0.8 * s, 4.2 * s, z, 0.3 * s, 1.8 * s, 0.3 * s, 0, 0, 0.7);
    const green = [0x6f8f2a, 0x7f9c34, 0x5f7f24][Math.floor(r() * 3)];
    put(p, 'box', green, x, 5.2 * s, z, 7.5 * s, 0.9 * s, 5.5 * s, r() * 3);
    put(p, 'box', 0x8aa83e, x + 0.6 * s, 5.8 * s, z - 0.4 * s, 5 * s, 0.6 * s, 3.8 * s, r() * 3);
    return { circles: [{ x, z, r: 0.6 * s }], h: 6 * s, kind: 'tree' };
  },
  baobab(p, x, z, r, s = 1) {
    put(p, 'cyl', 0x9b8270, x, 3 * s, z, 3 * s, 6 * s, 3 * s);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      put(p, 'box', 0x8a7262, x + Math.cos(a) * 1.2 * s, 6.6 * s, z + Math.sin(a) * 1.2 * s, 0.4 * s, 1.8 * s, 0.4 * s, 0, Math.sin(a) * 0.6, -Math.cos(a) * 0.6);
      put(p, 'box', 0x6f8f2a, x + Math.cos(a) * 2 * s, 7.6 * s, z + Math.sin(a) * 2 * s, 1.8 * s, 0.8 * s, 1.8 * s);
    }
    return { circles: [{ x, z, r: 1.6 * s }], h: 8 * s, kind: 'tree' };
  },
  termite(p, x, z, r, s = 1) {
    const c = [0xb5653a, 0xa65a33, 0xc0703f][Math.floor(r() * 3)];
    put(p, 'box', c, x, 0.6 * s, z, 1.8 * s, 1.2 * s, 1.8 * s, r());
    put(p, 'box', c, x, 1.6 * s, z, 1.2 * s, 1.2 * s, 1.2 * s, r());
    put(p, 'box', c, x + 0.1, 2.5 * s, z, 0.7 * s, 1 * s, 0.7 * s, r());
    put(p, 'box', c, x + 0.6 * s, 1.3 * s, z + 0.3, 0.5 * s, 1.6 * s, 0.5 * s, r());
    put(p, 'box', c, x - 0.1, 3.15 * s, z, 0.35 * s, 0.5 * s, 0.35 * s);
    return { circles: [{ x, z, r: 1.05 * s }], h: 3.3 * s, kind: 'termite mound' };
  },
  boulder(p, x, z, r, s = 1, color = 0x8d8073, snow = false) {
    put(p, 'box', color, x, 0.55 * s, z, 2 * s, 1.2 * s, 1.7 * s, r() * 3, 0, 0.1);
    put(p, 'box', new THREE.Color(color).offsetHSL(0, 0, 0.05).getHex(), x + 0.6 * s, 0.4 * s, z + 0.5 * s, 1.1 * s, 0.8 * s, 1 * s, r() * 3);
    if (snow) put(p, 'box', 0xf5f9ff, x, 1.2 * s, z, 1.7 * s, 0.25 * s, 1.4 * s, 0);
    return { circles: [{ x, z, r: 1.15 * s }], h: 1.3 * s, kind: 'rock' };
  },
  thorn(p, x, z, r, s = 1) {
    put(p, 'box', 0x6a7a2a, x, 0.5 * s, z, 1.6 * s, 1 * s, 1.6 * s, r());
    put(p, 'box', 0x7c8c34, x + 0.2, 0.9 * s, z - 0.2, 1 * s, 0.6 * s, 1.1 * s, r());
    for (let i = 0; i < 4; i++) put(p, 'box', 0xd7c49a, x + (r() - 0.5) * 1.4 * s, 0.7 * s, z + (r() - 0.5) * 1.4 * s, 0.06, 0.5 * s, 0.06, 0, 0.5, 0.4);
    return { circles: [{ x, z, r: 0.85 * s }], h: 1.1 * s, kind: 'thorn bush' };
  },
  grass(p, x, z, r, s = 1, colors = [0xe9c766, 0xd7b85c, 0xc9a24a]) {
    for (let i = 0; i < 4; i++) put(p, 'box', colors[i % colors.length], x + (r() - 0.5) * 1.2, 0.35 * s, z + (r() - 0.5) * 1.2, 0.18, (0.5 + r() * 0.5) * s, 0.18, r(), (r() - 0.5) * 0.4, (r() - 0.5) * 0.4, false);
  },
  logH(p, x, z, r, s = 1, color = 0x6d4c33, snow = false) { // 打橫嘅樹幹（擋住 3 米闊）
    const len = 5 * s;
    put(p, 'cyl', color, x, 0.45 * s, z, 0.9 * s, len, 0.9 * s, 0, 0, Math.PI / 2);
    put(p, 'cyl', 0xc9a27a, x - len / 2 - 0.01, 0.45 * s, z, 0.8 * s, 0.04, 0.8 * s, 0, 0, Math.PI / 2, false);
    put(p, 'cyl', 0xc9a27a, x + len / 2 + 0.01, 0.45 * s, z, 0.8 * s, 0.04, 0.8 * s, 0, 0, Math.PI / 2, false);
    put(p, 'box', 0x4e3524, x + 0.8, 1.0 * s, z, 0.2, 0.8 * s, 0.2, 0, 0, 0.6);
    if (snow) put(p, 'box', 0xf5f9ff, x, 0.92 * s, z, len * 0.8, 0.14, 0.5 * s);
    const circles = [];
    for (let i = -2; i <= 2; i++) circles.push({ x: x + i * len * 0.2, z, r: 0.6 * s });
    return { circles, h: 0.9 * s, kind: 'fallen log' };
  },
  // 🐪 Desert
  saguaro(p, x, z, r, s = 1) {
    const green = [0x4f8a3c, 0x5a9444, 0x467d35][Math.floor(r() * 3)];
    put(p, 'box', green, x, 2 * s, z, 0.7 * s, 4 * s, 0.7 * s, r());
    for (const side of [-1, 1]) {
      if (r() < 0.25) continue;
      const hy = (1.4 + r() * 1.2) * s;
      put(p, 'box', green, x + side * 0.6 * s, hy, z, 0.6 * s, 0.4 * s, 0.4 * s);
      put(p, 'box', green, x + side * 0.85 * s, hy + 0.7 * s, z, 0.4 * s, 1.6 * s, 0.4 * s);
    }
    put(p, 'box', 0xf48fb1, x, 4.1 * s, z, 0.35 * s, 0.25 * s, 0.35 * s); // 花
    return { circles: [{ x, z, r: 0.6 * s }], h: 4 * s, kind: 'cactus' };
  },
  barrel(p, x, z, r, s = 1) {
    put(p, 'cyl', 0x5f9a48, x, 0.45 * s, z, 0.9 * s, 0.9 * s, 0.9 * s);
    put(p, 'box', 0xffd54f, x, 0.95 * s, z, 0.3 * s, 0.15 * s, 0.3 * s);
    return { circles: [{ x, z, r: 0.5 * s }], h: 1 * s, kind: 'cactus' };
  },
  redRock(p, x, z, r, s = 1) {
    const c = [0xb5603a, 0xc4703f, 0xa4532f][Math.floor(r() * 3)];
    put(p, 'box', c, x, 0.9 * s, z, 2.2 * s, 1.8 * s, 2 * s, r() * 3, 0, 0.08);
    put(p, 'box', 0xd98a5a, x, 1.85 * s, z, 1.7 * s, 0.3 * s, 1.6 * s, r() * 3);
    return { circles: [{ x, z, r: 1.2 * s }], h: 2 * s, kind: 'rock' };
  },
  dune(p, x, z, r, s = 1) {
    put(p, 'ball', [0xe8c27a, 0xedc988, 0xdfb46a][Math.floor(r() * 3)], x, -2 * s, z, 30 * s, 9 * s, 20 * s, r() * 3, 0, 0, false);
  },
  mesa(p, x, z, r, s = 1) {
    const h = (14 + r() * 14) * s;
    put(p, 'box', 0xb85a35, x, h / 2, z, 22 * s, h, 18 * s, r() * 0.5);
    put(p, 'box', 0xd98250, x, h * 0.72, z, 22.4 * s, h * 0.14, 18.4 * s, 0);
    put(p, 'box', 0x9a4a2c, x, h * 0.35, z, 22.4 * s, h * 0.1, 18.4 * s, 0);
    put(p, 'box', 0xc46a40, x, h + 0.5, z, 18 * s, 1, 14 * s, 0);
  },
  bones(p, x, z, r) {
    put(p, 'box', 0xf5f0e6, x, 0.15, z, 1.4, 0.18, 0.18, r() * 3, 0, 0, false);
    put(p, 'box', 0xf5f0e6, x + 0.3, 0.2, z + 0.3, 0.5, 0.35, 0.45, 0, 0, 0, false);
    for (let i = 0; i < 3; i++) put(p, 'box', 0xeee6d8, x - 0.3 + i * 0.3, 0.25, z - 0.3, 0.1, 0.5, 0.1, 0, 0, 0.8, false);
  },
  // 🌲 Taiga
  pine(p, x, z, r, s = 1) {
    put(p, 'box', 0x4e3524, x, 1.2 * s, z, 0.5 * s, 2.4 * s, 0.5 * s);
    const greens = [0x1f4d2b, 0x24563a, 0x2b5e33];
    const tiers = 4;
    for (let i = 0; i < tiers; i++) {
      const w = (3.6 - i * 0.75) * s;
      const y = (2.2 + i * 1.35) * s;
      put(p, 'cone', greens[i % 3], x, y + 0.8 * s, z, w, 2 * s, w, r() * 2);
      put(p, 'cone', 0xf5f9ff, x, y + 1.25 * s, z, w * 0.55, 0.9 * s, w * 0.55, r() * 2, 0, 0, false); // 雪蓋
    }
    return { circles: [{ x, z, r: 0.7 * s }], h: 8 * s, kind: 'tree' };
  },
  birch(p, x, z, r, s = 1) {
    put(p, 'box', 0xf1f1ec, x, 3 * s, z, 0.4 * s, 6 * s, 0.4 * s);
    for (let i = 0; i < 5; i++) put(p, 'box', 0x2b2b2b, x, (1 + i * 1.1) * s, z, 0.42 * s, 0.08, 0.2 * s, 0, 0, 0, false);
    put(p, 'box', 0xc6a73a, x, 6.4 * s, z, 2.6 * s, 2 * s, 2.6 * s, r());
    put(p, 'box', 0xd8b94a, x + 0.3, 7.3 * s, z, 1.6 * s, 1.2 * s, 1.6 * s, r());
    return { circles: [{ x, z, r: 0.4 * s }], h: 7 * s, kind: 'tree' };
  },
  stump(p, x, z, r, s = 1) {
    put(p, 'cyl', 0x5d4030, x, 0.5 * s, z, 1.1 * s, 1 * s, 1.1 * s);
    put(p, 'cyl', 0xc9a27a, x, 1.01 * s, z, 1 * s, 0.04, 1 * s, 0, 0, 0, false);
    put(p, 'box', 0xf5f9ff, x + 0.1, 1.06 * s, z, 0.6 * s, 0.1, 0.5 * s, 0, 0, 0, false);
    return { circles: [{ x, z, r: 0.6 * s }], h: 1 * s, kind: 'tree stump' };
  },
  snowPatch(p, x, z, r) {
    put(p, 'disc', 0xf5f9ff, x, 0.03, z, 3 + r() * 5, 1, 2 + r() * 4, r() * 3, 0, 0, false);
  },
  mushroom(p, x, z) {
    put(p, 'box', 0xf5f0e6, x, 0.2, z, 0.14, 0.4, 0.14, 0, 0, 0, false);
    put(p, 'box', 0xe53935, x, 0.45, z, 0.45, 0.18, 0.45, 0, 0, 0, false);
  },
};
const iceMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.15, metalness: 0.2 });
DECO.ice = (p, x, z, r) => put(p, 'disc', iceMat, x, 0.04, z, 4 + r() * 3, 1, 3 + r() * 2, r() * 3, 0, 0, false);

// 每張地圖：路上嘅障礙物（撞到扣心）、兩邊嘅裝飾、地上嘅細嘢
// 河床細嘢
const pebbles = (p, x, z, r, colors) => {
  for (let i = 0; i < 3; i++) put(p, 'box', colors[i % colors.length], x + (r() - 0.5) * 1.6, 0.08, z + (r() - 0.5) * 1.6, 0.25 + r() * 0.3, 0.16, 0.2 + r() * 0.3, r() * 3, 0, 0, false);
};
// ❄️ 雪堆（扁扁嘅白色饅頭，行得過）
DECO.drift = (p, x, z, r) => put(p, 'ball', 0xf5f9ff, x, -0.1, z, 3 + r() * 4, 0.7 + r() * 0.5, 1.6 + r() * 2, r() * 3, 0, 0, false);
// trees：會跟住森林密度種嘅嘢（樹林 + 空地）
const LAYOUT = {
  savanna: {
    obstacles: [['termite', 3], ['boulder', 3], ['thorn', 3], ['logH', 1.4], ['acacia', 1.2]],
    side: [['acacia', 6], ['termite', 1.5], ['boulder', 1.2], ['baobab', 0.8], ['thorn', 2]],
    trees: ['acacia', 'baobab', 'thorn'],
    small: (p, x, z, r) => DECO.grass(p, x, z, r, 1 + r() * 0.6),
    smallCount: 26,
    river: (p, x, z, r) => (r() < 0.75 ? pebbles(p, x, z, r, [0x9a8a78, 0xb5a48e, 0x7d6e5e]) : DECO.grass(p, x, z, r, 0.8, [0x8aa84e, 0x9ab65a])),
  },
  desert: {
    obstacles: [['saguaro', 3.5], ['barrel', 2], ['redRock', 3]],
    side: [['saguaro', 4], ['redRock', 2], ['barrel', 1.5], ['bones', 0.6]],
    trees: ['saguaro', 'barrel'],
    big: [['dune', 1], ['mesa', 0.5]],
    small: (p, x, z, r) => (r() < 0.1 ? DECO.bones(p, x, z, r) : DECO.grass(p, x, z, r, 0.6, [0xa89a5a, 0xbfae6a, 0x8f8a4a])),
    smallCount: 10,
    river: (p, x, z, r) => pebbles(p, x, z, r, [0xa0785a, 0xc49a72, 0x8a6a50]),
  },
  taiga: {
    obstacles: [['logH', 2.5], ['stump', 2.5], ['boulder', 2.5], ['pine', 2]],
    side: [['pine', 10], ['birch', 1.6], ['boulder', 1.0], ['stump', 0.8]],
    trees: ['pine', 'birch'],
    small: (p, x, z, r) => (r() < 0.6 ? DECO.drift(p, x, z, r) : DECO.mushroom(p, x, z, r)),
    smallCount: 12,
    river: (p, x, z, r) => (r() < 0.6 ? put(p, 'box', 0xe8f6ff, x, 0.04, z, 0.05, 0.02, 1.5 + r() * 2.5, r() * 3, 0, 0, false) : pebbles(p, x, z, r, [0x8a939b, 0xa5aeb5])),
  },
};
const pickW = (list, r) => {
  let tot = 0;
  for (const [, w] of list) tot += w;
  let x = r() * tot;
  for (const [k, w] of list) if ((x -= w) < 0) return k;
  return list[0][0];
};

// ---------- 起一段地圖 ----------
// z0 = 呢段嘅「後面」（大啲），一直去到 z0 - CHUNK_LEN；difficulty 0…1（越遠障礙物越多）
// safe = true：開頭嗰段唔放障礙物
export function buildChunk(mapId, index, difficulty, safe = false) {
  const r = seeded(index * 7919 + mapId.length * 131 + Math.floor(Math.random() * 1e6));
  const L = LAYOUT[mapId];
  const raw = new THREE.Group();
  const z0 = -index * CHUNK_LEN;
  const X = RODEO_ORIGIN.x;
  const obstacles = [];
  const snowy = mapId === 'taiga' ? [undefined, true] : [];
  // 每件嘢擺喺地面高度（Issue #17：起伏地形）：包一個 Group 升到 groundY
  const at = (x, z, sink = 0.08) => {
    const g = new THREE.Group();
    g.position.y = groundY(x, z) - sink;
    raw.add(g);
    return g;
  };
  const lm = landmarkOf(index);
  const nearLandmark = (lx, z, pad = 6) => lm && Math.hypot(lx - lm.lx, z - lm.z) < (lm.flat || 9) + pad;
  // 路上障礙物：一堆堆（同一種嘢 2–4 件擺埋一齊），中間有空位行；結冰河上面唔放
  if (!safe) {
    const n = Math.round(2 + difficulty * 5 + r() * 2);
    let made = 0;
    let guard = 0;
    while (made < n && guard++ < 40) {
      const kind = pickW(L.obstacles, r);
      const cz = z0 - (0.06 + r() * 0.88) * CHUNK_LEN;
      const cx = (r() * 2 - 1) * (RODEO_LANE - 2);
      const group = Math.min(n - made, kind === 'logH' || kind === 'acacia' || kind === 'pine' ? 1 : 1 + Math.floor(r() * 3));
      for (let k = 0; k < group; k++) {
        const lx = THREE.MathUtils.clamp(cx + (r() - 0.5) * 7, -(RODEO_LANE - 0.5), RODEO_LANE - 0.5);
        const z = cz + (r() - 0.5) * 5;
        const rv = riverAt(lx, z);
        if (rv.ice && rv.k > 0) continue;
        const s = kind === 'acacia' || kind === 'pine' ? 0.8 + r() * 0.3 : 0.8 + r() * 0.45;
        const hit = DECO[kind](at(X + lx, z), X + lx, z, r, s, ...snowy);
        if (hit) obstacles.push(hit);
        made++;
      }
    }
  }
  // 兩邊：樹跟住「森林密度」種（有樹林、有空地），其他嘢隨便擺；河入面唔種樹
  for (let i = 0; i < 46; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const ax = RODEO_LANE + 2.5 + Math.pow(r(), 1.5) * 120;
    const lx = side * ax;
    const z = z0 - r() * CHUNK_LEN;
    const kind = pickW(L.side, r);
    const tree = L.trees.includes(kind);
    if (tree && r() > smooth(0.4, 0.56, forestAt(lx, z)) * 0.95 + 0.05) continue;
    if (!tree && r() < 0.5) continue;
    if (riverAt(lx, z).k > 0.1 || nearLandmark(lx, z)) continue;
    DECO[kind](at(X + lx, z, 0.15), X + lx, z, r, 0.9 + r() * 0.6, ...snowy);
  }
  if (L.big) for (let i = 0; i < 2; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const lx = side * (RODEO_LANE + 40 + r() * 120);
    const z = z0 - r() * CHUNK_LEN;
    DECO[pickW(L.big, r)](at(X + lx, z, 1), X + lx, z, r, 0.7 + r() * 0.6);
  }
  // 河床／冰河嘅細嘢（石仔、蘆葦、冰裂）
  for (let i = 0; i < 10; i++) {
    const z = z0 - r() * CHUNK_LEN;
    const lx = riverX(z) + (r() - 0.5) * TERRAIN[mapId].river.width * 1.6;
    if (Math.abs(lx) > 150) continue;
    L.river(at(X + lx, z, 0.02), X + lx, z, r);
  }
  // 地上細嘢（草、雪堆、骨頭）：路上都有（唔撞）
  for (let i = 0; i < L.smallCount; i++) {
    const lx = (r() * 2 - 1) * 70;
    const z = z0 - r() * CHUNK_LEN;
    if (riverAt(lx, z).k > 0.3 && mapId === 'taiga') continue;
    L.small(at(X + lx, z, 0.02), X + lx, z, r);
  }
  // 🗿 Landmark（水氹、石山、大猴麵包樹、綠洲、大平頂山、沙丘脊、結冰湖、大石、大樹幹）
  if (lm) LANDMARK_BUILD[lm.kind](at(X + lm.lx, lm.z, lm.flat ? 0 : 0.5), X + lm.lx, lm.z, r, lm);
  const group = bake(raw);
  group.add(buildGroundStrip(z0)); // 呢段嘅地面
  return { index, group, obstacles };
}

// ---------- 🗿 Landmark（Issue #17：「landmark set pieces now and then」）----------
const waterMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.88 });
const WATER = { waterhole: waterMat(0x5b8fa3), oasis: waterMat(0x2fa3b5) };
function palm(p, x, z, r, s = 1) {
  const lean = (r() - 0.5) * 0.5;
  for (let i = 0; i < 6; i++) put(p, 'box', i % 2 ? 0x8a6a45 : 0x7a5a38, x + lean * i * 0.6 * s, (0.6 + i * 1.15) * s, z, 0.55 * s, 1.2 * s, 0.55 * s, 0, 0, -lean * 0.4);
  const tx = x + lean * 6 * 0.6 * s;
  const ty = 7.3 * s;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r();
    put(p, 'box', [0x3f8f3a, 0x4fa043, 0x37803a][i % 3], tx + Math.cos(a) * 1.6 * s, ty - 0.3 * s, z + Math.sin(a) * 1.6 * s, 3.4 * s, 0.18 * s, 0.9 * s, -a, 0, -0.35);
  }
  put(p, 'ball', 0x6d4c2a, tx, ty - 0.5 * s, z, 0.7 * s, 0.6 * s, 0.7 * s);
}
function reeds(p, x, z, r, n = 6) {
  for (let i = 0; i < n; i++) put(p, 'box', [0x6f8f3a, 0x7c9a45, 0x8aa84e][i % 3], x + (r() - 0.5) * 2, 0.7, z + (r() - 0.5) * 2, 0.1, 1.2 + r() * 0.8, 0.1, 0, (r() - 0.5) * 0.3, (r() - 0.5) * 0.3, false);
}
// 水面擺喺個凹位嘅邊高度（groundY 嘅湖中間凹低 0.35 米）；shore(q, x, z) 喺岸邊擺嘢
function pond(p, x, z, r, R, mat, rim, shore) {
  const q = new THREE.Group();
  q.position.y = 0.28;
  p.add(q);
  put(q, 'disc', rim, x, -0.03, z, R * 2.3, 1, R * 1.9, 0, 0, 0, false); // 濕泥／雪邊
  put(q, 'disc', mat, x, 0, z, R * 2, 1, R * 1.6, 0, 0, 0, false);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.4;
    shore(q, x + Math.cos(a) * R * 1.05, z + Math.sin(a) * R * 0.85);
  }
}
const LANDMARK_BUILD = {
  waterhole(p, x, z, r, lm) {
    const R = lm.flat * 0.62;
    pond(p, x, z, r, R, WATER.waterhole, 0x6b4a2e, (q, sx, sz) => (r() < 0.6 ? reeds(q, sx, sz, r, 4) : DECO.boulder(q, sx, sz, r, 0.5 + r() * 0.3)));
    DECO.acacia(p, x + R * 1.4, z - R * 0.3, r, 1.3);
    for (let i = 0; i < 6; i++) put(p, 'box', 0xe8e1d0, x + (r() - 0.5) * R * 2.4, 0.06, z + (r() - 0.5) * R * 2, 0.1, 0.05, 0.35, r() * 3, 0, 0, false); // 腳印
  },
  kopje(p, x, z, r) {
    // 一座圓碌碌嘅大石山（好似獅子王嗰塊 Pride Rock）
    const c = [0x9a8a78, 0x8a7b6a, 0xa89684];
    for (let i = 0; i < 9; i++) {
      const s = 3 + r() * 4;
      put(p, 'ball', c[i % 3], x + (r() - 0.5) * 12, s * 0.35 + (i > 5 ? 3.5 : 0), z + (r() - 0.5) * 10, s * 1.5, s, s * 1.3, r() * 3);
    }
    put(p, 'box', 0x8a7b6a, x + 2, 7.5, z, 9, 1.2, 4, 0.3, 0, 0.08); // 伸出嚟嗰塊石
    DECO.acacia(p, x - 4, z + 3, r, 0.9);
    for (let i = 0; i < 6; i++) DECO.grass(p, x + (r() - 0.5) * 16, z + (r() - 0.5) * 14, r, 1.3);
  },
  giantBaobab(p, x, z, r) {
    DECO.baobab(p, x, z, r, 2.6);
    for (let i = 0; i < 5; i++) DECO.grass(p, x + (r() - 0.5) * 12, z + (r() - 0.5) * 12, r, 1.4);
  },
  oasis(p, x, z, r, lm) {
    const R = lm.flat * 0.6;
    pond(p, x, z, r, R, WATER.oasis, 0x6f9a48, (q, sx, sz) => (r() < 0.45 ? palm(q, sx, sz, r, 0.8 + r() * 0.5) : reeds(q, sx, sz, r, 5)));
    put(p, 'disc', 0x7fae52, x, -0.04, z, R * 3.2, 1, R * 2.8, 0, 0, 0, false); // 綠草圈
    palm(p, x + R * 1.5, z + R * 0.6, r, 1.3);
    palm(p, x - R * 1.3, z - R * 0.7, r, 1.1);
  },
  bigMesa(p, x, z, r) {
    DECO.mesa(p, x, z, r, 1.25);
    for (let i = 0; i < 4; i++) DECO.redRock(p, x + (r() - 0.5) * 34, z + (r() - 0.5) * 30, r, 1.2 + r());
  },
  duneRidge(p, x, z, r) {
    put(p, 'ball', 0xedc988, x, -3, z, 80, 16, 26, 0.2 + r() * 0.3, 0, 0, false);
    put(p, 'ball', 0xf3d79b, x + 6, -1, z - 4, 40, 10, 12, 0.3, 0, 0, false);
    DECO.bones(p, x - 10, z + 9, r);
  },
  frozenLake(p, x, z, r, lm) {
    const R = lm.flat * 0.68;
    pond(p, x, z, r, R, iceMat, 0xf5f9ff, (q, sx, sz) => (r() < 0.5 ? DECO.boulder(q, sx, sz, r, 0.6 + r() * 0.5, 0x7d8790, true) : DECO.pine(q, sx + Math.sign(sx - x) * 2, sz, r, 0.8 + r() * 0.4)));
    for (let i = 0; i < 5; i++) put(p, 'box', 0xe8f6ff, x + (r() - 0.5) * R * 1.6, 0.05, z + (r() - 0.5) * R * 1.2, 0.05, 0.02, 2 + r() * 3, r() * 3, 0, 0, false); // 冰裂紋
  },
  erratic(p, x, z, r) {
    DECO.boulder(p, x, z, r, 4.2, 0x7d8790, true); // 冰川帶嚟嘅大石
    DECO.boulder(p, x + 7, z + 3, r, 2, 0x8a939b, true);
    DECO.pine(p, x - 6, z - 4, r, 1.2);
  },
  giantLog(p, x, z, r) {
    put(p, 'cyl', 0x5d4030, x, 1.8, z, 3.4, 26, 3.4, r() * 0.6, 0, Math.PI / 2);
    put(p, 'cyl', 0xc9a27a, x - 13.02, 1.8, z, 3.1, 0.06, 3.1, 0, 0, Math.PI / 2, false);
    put(p, 'box', 0xf5f9ff, x, 3.55, z, 22, 0.35, 1.6, r() * 0.6);
    for (let i = 0; i < 4; i++) DECO.mushroom(p, x + (r() - 0.5) * 20, z + 1.9, r);
  },
};

// 按材質焊埋（每段地圖淨係幾個 mesh）
function bake(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const key = `${o.material.uuid}|${o.castShadow}`;
    if (!buckets.has(key)) buckets.set(key, { material: o.material, castShadow: o.castShadow, list: [] });
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal'].includes(name)) g.deleteAttribute(name);
    g.applyMatrix4(o.matrixWorld);
    buckets.get(key).list.push(g);
  });
  const out = new THREE.Group();
  for (const { material, castShadow, list } of buckets.values()) {
    const merged = mergeGeometries(list);
    list.forEach((g) => g.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    out.add(mesh);
  }
  return out;
}
const SHARED = new Set(Object.values(G));
export function disposeHorizon(g) {
  g.traverse((o) => {
    if (!o.isMesh) return;
    if (!SHARED.has(o.geometry)) o.geometry.dispose();
    o.material.dispose();
  });
  g.removeFromParent();
}
export function disposeChunk(c) {
  c.group.traverse((o) => o.isMesh && o.geometry.dispose());
  c.group.removeFromParent();
}
