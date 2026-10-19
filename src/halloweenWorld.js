// 🎃 Halloween 世界：樣（小朋友 Issue #6）—— 地圖喺 halloweenShape.js
// 第一次入去先起（buildHalloween，配合載入畫面），唔郁嘅嘢全部 bakeStatic 焊埋
// 仲有：Hub 中間嘅 Halloween 傳送門（取代噴水池）、恐怖天空（血紅紫色、大月光、行雷、好近嘅霧）

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { addCollider, addPlatform, bakeStatic, noiseTexture } from './world.js';
import { makeSign, dynamicSign, THEMES } from './signs.js';
import { seededRandom } from './spawnRoll.js';
import { state } from './state.js';
import { HALLOWEEN_OPEN_DATE, HALLOWEEN_FOG_NEAR, HALLOWEEN_FOG_FAR } from './data/balance.js';
import {
  HW_X, RUINS, RUINS_SAFE_R, HW_PORTAL, HW_BIOMES, MANOR, MANOR_GATE_Z, EGG_GRAVEYARD, EGG_SLOTS, STATION, STATION_PLATFORM, TRACK_X, TRAIN_BOARD,
  STATION_SIGN, GHOST_WORLD, GHOST_TRAIN_STOP, STATUE_OF_HALLOWEEN, VACUUM_SHOP, LAKE, LAKE_WATER, LAKE_SHORE, DOCK, FISH_SPOT, ROD_SHOP,
  hwZoneAt, inHalloween,
} from './halloweenShape.js';

// ---------- 狀態 ----------
// inside：玩家喺唔喺 Halloween 世界；sky：恐怖天空 0→1（慢慢變）；built：起咗未
export const halloween = { inside: false, built: false, sky: 0, flash: 0, nextFlash: 6 };

const openDate = () => {
  const [y, m, d] = HALLOWEEN_OPEN_DATE.split('-').map(Number);
  return new Date(y, m - 1, d);
};
// 開咗未：到咗日期，或者秘密控制台提早開（state.halloweenEarly）
export const isHalloweenOpen = (now = new Date()) => !!state.halloweenEarly || now >= openDate();
export const halloweenOpenText = () => openDate().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
export function halloweenCountdown(now = new Date()) {
  const ms = Math.max(0, openDate() - now);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

// ---------- 材質／形狀 ----------
const materials = new Map();
const mat = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra }));
  return materials.get(key);
};
const glow = (color, intensity = 2) => mat(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.5 });
const geos = new Map();
const geo = (key, make) => {
  if (!geos.has(key)) geos.set(key, make());
  return geos.get(key);
};
const box = (w, h, d) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
const rbox = (w, h, d) => geo(`r${w}|${h}|${d}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2));
const ball = (r, w = 12, h = 9) => geo(`s${r}|${w}`, () => new THREE.SphereGeometry(r, w, h));
const cyl = (rt, rb, h, n = 10) => geo(`c${rt}|${rb}|${h}|${n}`, () => new THREE.CylinderGeometry(rt, rb, h, n));
function add(parent, g, m, x, y, z, shadow = true) {
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// 地板（有斑點紋理）
function floor(root, rect, color, variation = 0.12, y = 0) {
  const w = rect.maxX - rect.minX;
  const d = rect.maxZ - rect.minZ;
  const m = new THREE.MeshStandardMaterial({ map: noiseTexture(color, variation, w / 6, d / 6), roughness: 0.95 });
  add(root, new THREE.BoxGeometry(w, 0.2, d), m, (rect.minX + rect.maxX) / 2, y - 0.1, (rect.minZ + rect.maxZ) / 2, false);
}

// ---------- 裝飾 ----------
// 南瓜（有坑紋）；lantern = 發光鬼臉
function pumpkin(root, live, x, z, s = 1, lantern = false, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const orange = mat(0xe8730c, { roughness: 0.6 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI;
    const seg = add(g, ball(0.55 * s, 10, 8), i % 2 ? orange : mat(0xd9620a, { roughness: 0.6 }), Math.cos(a) * 0.22 * s, 0.48 * s, Math.sin(a) * 0.08 * s);
    seg.scale.set(0.75, 0.82, 1);
    seg.rotation.y = a;
  }
  add(g, cyl(0.07 * s, 0.1 * s, 0.32 * s, 6), mat(0x4e6b1f), 0, 0.98 * s, 0).rotation.z = 0.25;
  if (lantern) {
    const face = glow(0xffc23d, 2.4);
    for (const sx of [-1, 1]) add(g, box(0.16 * s, 0.14 * s, 0.05), face, sx * 0.2 * s, 0.6 * s, -0.5 * s, false).rotation.z = sx * 0.5; // 眼
    add(g, box(0.46 * s, 0.1 * s, 0.05), face, 0, 0.36 * s, -0.5 * s, false); // 口
    for (const sx of [-1, 0, 1]) add(g, box(0.08 * s, 0.08 * s, 0.05), face, sx * 0.14 * s, 0.43 * s, -0.5 * s, false); // 牙
  }
  root.add(g);
  return g;
}
// 墓碑（有十字或者圓頂）
function tombstone(root, x, z, s, rand, rot) {
  const stone = mat(rand() < 0.5 ? 0x6f6b75 : 0x5b5862);
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.set(0, rot, (rand() - 0.5) * 0.25); // 歪咗
  if (rand() < 0.35) {
    add(g, box(0.25 * s, 1.5 * s, 0.25 * s), stone, 0, 0.75 * s, 0);
    add(g, box(0.9 * s, 0.25 * s, 0.25 * s), stone, 0, 1.05 * s, 0);
  } else {
    add(g, rbox(1 * s, 1.2 * s, 0.3 * s), stone, 0, 0.6 * s, 0);
    add(g, cyl(0.5 * s, 0.5 * s, 0.3 * s, 12), stone, 0, 1.2 * s, 0).rotation.x = Math.PI / 2;
    add(g, box(0.5 * s, 0.06 * s, 0.05), mat(0x3a3740), 0, 0.85 * s, -0.16 * s, false); // 刻字
  }
  add(g, box(1.3 * s, 0.12, 0.9 * s), mat(0x3b2f24), 0, 0.06, -0.6 * s, false); // 泥堆
  root.add(g);
}
// 枯樹（一枝枝彎彎嘅樹枝）
function deadTree(root, x, z, s, rand, bark = 0x2b2220) {
  const m = mat(bark);
  const h = (6 + rand() * 4) * s;
  add(root, box(0.7 * s, h, 0.7 * s), m, x, h / 2, z).rotation.y = rand() * 3;
  for (let i = 0; i < 5; i++) {
    const y = h * (0.45 + i * 0.12);
    const a = rand() * Math.PI * 2;
    const len = (1.6 + rand() * 1.8) * s;
    const b = add(root, box(0.28 * s, len, 0.28 * s), m, x + Math.cos(a) * len * 0.4, y, z + Math.sin(a) * len * 0.4);
    b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
  }
  addCollider(x, z, 0.6 * s);
}
// 扭曲大樹（Hollow Sprites）：深紫樹皮、樹窿發光
function twistedTree(root, x, z, s, rand) {
  const bark = mat(0x271a33);
  let px = x;
  let pz = z;
  for (let i = 0; i < 6; i++) {
    const seg = add(root, box((1.6 - i * 0.18) * s, 2.2 * s, (1.6 - i * 0.18) * s), bark, px, (1.1 + i * 2) * s, pz);
    seg.rotation.y = i * 0.4;
    px += (rand() - 0.5) * 0.6 * s;
    pz += (rand() - 0.5) * 0.6 * s;
  }
  add(root, box(0.5 * s, 0.7 * s, 0.1), glow(0x76ff03, 1.6), x, 3.2 * s, z - 0.81 * s, false); // 樹窿（發光）
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rand();
    add(root, box(2.2 * s, 1.6 * s, 2.2 * s), mat(i % 2 ? 0x1b1030 : 0x24143d), px + Math.cos(a) * 1.4 * s, 12.5 * s + rand() * s, pz + Math.sin(a) * 1.4 * s);
  }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) add(root, box(0.7 * s, 0.9 * s, 0.7 * s), bark, x + dx * 1.1 * s, 0.4 * s, z + dz * 1.1 * s); // 樹根
  addCollider(x, z, 1.1 * s);
}
// 發光菇
function glowShroom(root, x, z, s, color) {
  add(root, cyl(0.12 * s, 0.16 * s, 0.7 * s, 6), mat(0xe8e0d0), x, 0.35 * s, z);
  const cap = add(root, ball(0.45 * s, 10, 6), glow(color, 1.5), x, 0.75 * s, z);
  cap.scale.y = 0.55;
}
// 爛石柱（出生點）
function brokenPillar(root, x, z, h, rand) {
  const stone = mat(0x6b6676);
  const dark = mat(0x4d4957);
  add(root, rbox(1.8, 0.5, 1.8), dark, x, 0.25, z);
  add(root, rbox(1.3, h, 1.3), stone, x, 0.5 + h / 2, z).rotation.y = rand() * 0.4;
  if (h > 3) add(root, rbox(1.7, 0.45, 1.7), dark, x, 0.5 + h + 0.2, z);
  else add(root, box(0.9, 0.4, 0.7), stone, x + 1.6, 0.2, z + 0.4).rotation.y = rand() * 2; // 爛咗跌落地嗰嚿
  // 長春藤
  add(root, box(0.1, h * 0.7, 0.5), mat(0x2e4d1f), x + 0.66, 0.5 + h * 0.4, z);
  addCollider(x, z, 0.95);
}
// 鐵欄杆（一條直線）
function ironFence(root, x1, z1, x2, z2, h = 2.4) {
  const iron = mat(0x1d1b22, { metalness: 0.6, roughness: 0.4 });
  const len = Math.hypot(x2 - x1, z2 - z1);
  const a = Math.atan2(x2 - x1, z2 - z1);
  const n = Math.max(2, Math.round(len / 0.7));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const x = x1 + (x2 - x1) * k;
    const z = z1 + (z2 - z1) * k;
    add(root, box(0.1, h, 0.1), iron, x, h / 2, z, false);
    add(root, geo('spike', () => new THREE.ConeGeometry(0.1, 0.3, 4)), iron, x, h + 0.15, z, false);
  }
  for (const y of [0.35, h - 0.3]) {
    const r = add(root, box(0.08, 0.08, len), iron, (x1 + x2) / 2, y, (z1 + z2) / 2, false);
    r.rotation.y = a;
  }
}
// 懸崖牆（邊界）：一嚿嚿深色石，高低唔一
function cliffLine(root, x1, z1, x2, z2, rand, color = 0x2a2530, hMin = 8, hMax = 16) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const n = Math.max(1, Math.round(len / 5));
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n;
    const h = hMin + rand() * (hMax - hMin);
    const x = x1 + (x2 - x1) * k;
    const z = z1 + (z2 - z1) * k;
    add(root, box(6 + rand() * 2, h, 6 + rand() * 2), mat(color, { flatShading: true }), x, h / 2 - 0.5, z).rotation.y = rand() * 0.6;
    if (rand() < 0.4) add(root, box(2.5, 2, 2.5), mat(0x3a3442, { flatShading: true }), x + (rand() - 0.5) * 3, h + 0.5, z).rotation.y = rand();
  }
}
// 4 條邊包住一個長方形（gaps：[side, from, to]，side 'n'|'s'|'e'|'w'）
function wallRect(root, r, rand, gaps = [], opts = {}) {
  const pad = 3.5;
  const sides = {
    n: [r.minX - pad, r.minZ - pad, r.maxX + pad, r.minZ - pad],
    s: [r.minX - pad, r.maxZ + pad, r.maxX + pad, r.maxZ + pad],
    w: [r.minX - pad, r.minZ - pad, r.minX - pad, r.maxZ + pad],
    e: [r.maxX + pad, r.minZ - pad, r.maxX + pad, r.maxZ + pad],
  };
  for (const [side, [x1, z1, x2, z2]] of Object.entries(sides)) {
    if (opts.skip?.includes(side)) continue;
    const horizontal = side === 'n' || side === 's';
    const lo = horizontal ? x1 : z1;
    const hi = horizontal ? x2 : z2;
    const cuts = gaps.filter((g) => g[0] === side).map((g) => [g[1], g[2]]).sort((a, b) => a[0] - b[0]);
    let from = lo;
    for (const [a, b] of [...cuts, [hi, hi]]) {
      if (a > from + 1) {
        if (horizontal) cliffLine(root, from, z1, a, z2, rand, opts.color, opts.hMin, opts.hMax);
        else cliffLine(root, x1, from, x2, a, rand, opts.color, opts.hMin, opts.hMax);
      }
      from = Math.max(from, b);
    }
  }
}
// 蠟燭（放喺 live，閃下閃下）
function candle(live, flames, x, y, z, s = 1) {
  add(live, cyl(0.08 * s, 0.09 * s, 0.4 * s, 8), mat(0xf3ecd8), x, y + 0.2 * s, z, false);
  const f = add(live, geo('flame', () => new THREE.ConeGeometry(0.07, 0.2, 6)), new THREE.MeshBasicMaterial({ color: 0xffb74d }), x, y + 0.5 * s, z, false);
  f.scale.setScalar(s);
  flames.push(f);
}

// 鬼火（會飄嘅發光波）
function makeWisps(live, n, rect, rand, colors) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const c = colors[i % colors.length];
    const m = add(live, ball(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 }), 0, 0, 0, false);
    const halo = add(m, ball(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.18, depthWrite: false }), 0, 0, 0, false);
    halo.renderOrder = 2;
    list.push({ m, x: rect.minX + rand() * (rect.maxX - rect.minX), z: rect.minZ + rand() * (rect.maxZ - rect.minZ), y: 1.2 + rand() * 3, p: rand() * 6, r: 1 + rand() * 3 });
  }
  return list;
}
// 蝙蝠（拍翼、轉圈）
function makeBats(live, n, cx, cz, rMin, rMax, yMin, yMax, rand) {
  const body = mat(0x14101a);
  const wingM = mat(0x221a2a);
  const list = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    add(g, rbox(0.35, 0.3, 0.45), body, 0, 0, 0, false);
    for (const s of [-1, 1]) add(g, box(0.05, 0.08, 0.05), glow(0xff1744, 2), s * 0.08, 0.06, -0.23, false); // 紅眼
    const wings = [-1, 1].map((s) => {
      const w = new THREE.Group();
      w.position.set(s * 0.15, 0.05, 0);
      add(w, box(0.8, 0.04, 0.4), wingM, s * 0.4, 0, 0, false);
      g.add(w);
      return { w, s };
    });
    live.add(g);
    list.push({ g, wings, cx, cz, r: rMin + rand() * (rMax - rMin), y: yMin + rand() * (yMax - yMin), sp: (0.4 + rand() * 0.5) * (rand() < 0.5 ? -1 : 1), p: rand() * 6 });
  }
  return list;
}

// 漩渦紋理（傳送門）
function swirlTexture(c1, c2, c3) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.25, c1);
  grad.addColorStop(0.65, c2);
  grad.addColorStop(1, c3);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.lineWidth = 5;
  for (let k = 0; k < 5; k++) {
    g.strokeStyle = k % 2 ? 'rgba(255,170,60,0.55)' : 'rgba(255,255,255,0.35)';
    g.beginPath();
    for (let a = 0; a < 10; a += 0.08) {
      const r = a * 12;
      const x = 128 + Math.cos(a + (k * Math.PI * 2) / 5) * r;
      const y = 128 + Math.sin(a + (k * Math.PI * 2) / 5) * r;
      if (a === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 一道 Halloween 傳送門（拱門 + 漩渦 + 南瓜 + 烏鴉 + 向上飄嘅火花）；Hub 同出生點都用
function buildPortalArch(parent, live, x, z, rotY, { plinth = true } = {}) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  const lg = new THREE.Group();
  lg.position.copy(g.position);
  lg.rotation.y = rotY;
  live.add(lg);
  const stone = mat(0x2d2638);
  const trim = mat(0x4a3d5c);
  if (plinth) {
    add(g, cyl(4.6, 4.9, 0.5, 28), mat(0x221d2b), 0, 0.25, 0);
    add(g, cyl(4.0, 4.2, 0.2, 28), mat(0x3b2f4a), 0, 0.55, 0);
  }
  const base = plinth ? 0.65 : 0;
  for (const s of [-1, 1]) {
    add(g, rbox(1.1, 6.2, 1.1), stone, s * 3.1, base + 3.1, 0);
    add(g, rbox(1.4, 0.5, 1.4), trim, s * 3.1, base + 0.25, 0);
    add(g, rbox(1.4, 0.5, 1.4), trim, s * 3.1, base + 6.2, 0);
    add(g, geo('spire', () => new THREE.ConeGeometry(0.6, 1.4, 4)), trim, s * 3.1, base + 7.1, 0).rotation.y = Math.PI / 4;
    pumpkin(g, null, s * 3.9, plinth ? 3.4 : 1.2, 0.9, true, Math.PI); // 拱門兩邊南瓜燈（面向前）
    pumpkin(g, null, s * 2.6, plinth ? -3.4 : -1.2, 0.7, true, 0);
  }
  // 頂嘅半圓拱
  const arc = add(g, geo('arc', () => new THREE.TorusGeometry(3.1, 0.5, 8, 24, Math.PI)), stone, 0, base + 6.2, 0);
  arc.scale.z = 1.4;
  add(g, geo('arcGlow', () => new THREE.TorusGeometry(2.55, 0.12, 8, 40)), glow(0xff8f00, 2.2), 0, base + 3.4, -0.1, false);
  // 烏鴉企喺柱頂
  for (const s of [-1, 1]) {
    const crow = new THREE.Group();
    crow.position.set(s * 3.1, base + 6.6, 0);
    add(crow, rbox(0.5, 0.45, 0.8), mat(0x0d0b10), 0, 0.25, 0);
    add(crow, rbox(0.38, 0.36, 0.36), mat(0x0d0b10), 0, 0.6, -0.35);
    add(crow, geo('beak', () => new THREE.ConeGeometry(0.08, 0.3, 4)), mat(0xffb300), 0, 0.58, -0.62).rotation.x = -Math.PI / 2;
    for (const e of [-1, 1]) add(crow, box(0.06, 0.06, 0.04), glow(0xff1744, 2.5), e * 0.12, 0.66, -0.53, false);
    crow.rotation.y = s * 0.4;
    g.add(crow);
  }
  // 漩渦（live：會轉）
  const swirl = add(lg, new THREE.CircleGeometry(2.45, 40), new THREE.MeshBasicMaterial({ map: swirlTexture('#ff9a3c', '#7b1fa2', '#12001f'), transparent: true, opacity: 0.95, side: THREE.DoubleSide, fog: false }), 0, base + 3.4, 0, false);
  const swirl2 = add(lg, new THREE.CircleGeometry(2.45, 40), new THREE.MeshBasicMaterial({ map: swirlTexture('#b2ff59', '#4a148c', '#000000'), transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 0, base + 3.4, -0.02, false);
  // 火花（向上飄）
  const N = 70;
  const pos = new Float32Array(N * 3);
  const seeds = Array.from({ length: N }, () => [Math.random() * Math.PI * 2, Math.random() * 2.5, Math.random(), 0.4 + Math.random()]);
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparks = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffa040, size: 0.16, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sparks.frustumCulled = false;
  lg.add(sparks);
  return {
    g, lg, swirl, swirl2, base,
    update(t) {
      swirl.rotation.z = -t * 0.9;
      swirl2.rotation.z = t * 1.4;
      swirl.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
      seeds.forEach(([a, r, ph, sp], i) => {
        const k = (t * 0.25 * sp + ph) % 1;
        pos[i * 3] = Math.cos(a + t * 0.5) * r * (1 - k * 0.4);
        pos[i * 3 + 1] = base + 0.5 + k * 7;
        pos[i * 3 + 2] = Math.sin(a + t * 0.5) * 0.6;
      });
      pg.attributes.position.needsUpdate = true;
    },
  };
}

// ================= Hub 中間嘅 Halloween 傳送門（取代噴水池）=================
// 未開：發光嘅紅色屏障 + 鎖鏈 + 倒數牌；開咗：漩渦轉、可以撳 E 入去
export function buildHubPortal(scene, x, z) {
  const root = new THREE.Group();
  const live = new THREE.Group();
  scene.add(live);
  const portal = buildPortalArch(root, live, x, z, Math.PI); // 面向 -z（由 Hub 入口行過嚟就見到）
  // 地上一圈南瓜同蠟燭
  const flames = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.3 && Math.cos(a) < 0) continue; // 前面留位
    if (i % 2) pumpkin(root, null, x + Math.cos(a) * 5.6, z + Math.sin(a) * 5.6, 0.75, true, -a + Math.PI / 2);
    else candle(live, flames, x + Math.cos(a) * 5.4, 0, z + Math.sin(a) * 5.4, 1.4);
  }
  bakeStatic(root, scene);
  addCollider(x, z, 4.4);
  // 未開：屏障 + 鎖鏈
  const barrier = new THREE.Group();
  barrier.position.copy(portal.lg.position);
  barrier.rotation.y = Math.PI;
  live.add(barrier);
  const wall = add(barrier, new THREE.CircleGeometry(2.5, 40), new THREE.MeshBasicMaterial({ color: 0xff3d00, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }), 0, portal.base + 3.4, -0.25, false);
  const chain = mat(0x9e9e9e, { metalness: 0.8, roughness: 0.3 });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const k = i / 8 - 0.5;
      const link = add(barrier, geo('link', () => new THREE.TorusGeometry(0.18, 0.05, 6, 10)), chain, k * 5.2, portal.base + 3.4 + s * k * 3.6, -0.35, false);
      link.rotation.y = i % 2 ? Math.PI / 2 : 0;
    }
  }
  add(barrier, rbox(0.9, 1.1, 0.4), mat(0x8d6e63, { metalness: 0.4 }), 0, portal.base + 3.4, -0.45, false); // 鎖頭
  const sign = dynamicSign(5.6, 1.6);
  sign.mesh.position.set(x, 1.6, z - 5.2);
  sign.mesh.rotation.y = Math.PI; // 牌面向 -z（Hub 入口嗰邊）
  live.add(sign.mesh);
  return {
    near: (pos) => Math.hypot(pos.x - x, pos.z - z) < 6.6,
    update(t, open) {
      portal.update(t);
      barrier.visible = !open;
      wall.material.opacity = 0.28 + Math.sin(t * 3) * 0.1;
      portal.swirl.material.opacity = open ? 0.95 : 0.4;
      flames.forEach((f, i) => f.scale.setScalar(1.4 * (0.85 + Math.sin(t * 13 + i * 2.1) * 0.15)));
      sign.mesh.visible = !open;
      if (!open && Math.floor(t * 2) % 2 === 0) sign.draw(THEMES.orange, [{ text: '🎃 HALLOWEEN WORLD', size: 0.36 }, { text: `Opens ${halloweenOpenText()}`, size: 0.2 }, { text: `⏳ ${halloweenCountdown()}`, size: 0.26 }]);
    },
  };
}

// ================= 起成個 Halloween 世界（第一次入去先起）=================
// progress(0–1) 俾載入畫面；每起完一區就等一格畫面，唔會成個畫面凍住
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
export async function buildHalloween(scene, progress = () => {}) {
  const root = new THREE.Group(); // 唔郁嘅嘢 → bakeStatic
  const live = new THREE.Group(); // 會郁嘅嘢
  scene.add(live);
  const rand = seededRandom('halloween-world');
  const flames = [];
  const lanterns = []; // 南瓜燈（閃）
  const steps = [];

  // ---- ⭕ 出生點：爛石圈 ----
  steps.push(() => {
    floor(root, { minX: HW_X - 100, maxX: HW_X + 90, minZ: HW_BIOMES[2].rect.minZ - 8, maxZ: EGG_GRAVEYARD.maxZ + 10 }, 0x231b28, 0.08, -0.25); // 成個地圖底（區與區之間）
    floor(root, { minX: RUINS.x - RUINS.r - 4, maxX: RUINS.x + RUINS.r + 4, minZ: RUINS.z - RUINS.r - 4, maxZ: RUINS.z + RUINS.r + 4 }, 0x33402c, 0.18);
    // 裂咗嘅石地（一圈圈）
    const tile = mat(0x7a7486);
    const tile2 = mat(0x6a6476);
    for (let ring = 0; ring < 4; ring++) {
      const r = 3 + ring * 4.5;
      const n = 8 + ring * 6;
      for (let i = 0; i < n; i++) {
        if (rand() < 0.12) continue; // 爛咗一嚿
        const a = (i / n) * Math.PI * 2 + ring * 0.2;
        const t = add(root, box(3.6, 0.12, 3.0), (i + ring) % 2 ? tile : tile2, RUINS.x + Math.cos(a) * r, 0.05, RUINS.z + Math.sin(a) * r, false);
        t.rotation.y = -a + (rand() - 0.5) * 0.15;
      }
    }
    add(root, cyl(2.6, 2.6, 0.14, 20), mat(0x3d364a), RUINS.x, 0.07, RUINS.z, false);
    add(root, geo('rune', () => new THREE.RingGeometry(1.8, 2.2, 6)), glow(0xb388ff, 1.4), RUINS.x, 0.16, RUINS.z, false).rotation.x = -Math.PI / 2; // 中間個魔法陣
    // 一圈爛石柱（4 個方向留路）
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
      const px = RUINS.x + Math.cos(a) * (RUINS.r - 1.5);
      const pz = RUINS.z + Math.sin(a) * (RUINS.r - 1.5);
      const gapDir = [0, Math.PI / 2, Math.PI, Math.PI * 1.5].some((d) => Math.abs(Math.atan2(Math.sin(a - d), Math.cos(a - d))) < 0.35);
      if (gapDir) continue;
      brokenPillar(root, px, pz, 1.5 + rand() * 4.5, rand);
      if (i % 2) candle(live, flames, px + 0.4, 0.5 + 0.02, pz - 1.1, 1.2);
    }
    // 蠟燭圍住魔法陣
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      candle(live, flames, RUINS.x + Math.cos(a) * 3.2, 0.12, RUINS.z + Math.sin(a) * 3.2, 1);
    }
    // 安全區光圈（地上淡淡一圈綠光）
    const safe = add(live, new THREE.RingGeometry(RUINS_SAFE_R - 0.25, RUINS_SAFE_R, 64), new THREE.MeshBasicMaterial({ color: 0x69f0ae, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }), RUINS.x, 0.18, RUINS.z, false);
    safe.rotation.x = -Math.PI / 2;
    // 歡迎牌
    const sign = makeSign([{ text: '🎃 SPAWN RUINS', size: 0.4 }, { text: 'Safe zone - Bosses cannot enter!', size: 0.2 }], 5, 1.4, THEMES.purple);
    sign.position.set(RUINS.x, 3.2, RUINS.z - 6); // 面向 +z（一到埗就見到）
    live.add(sign);
    const sign2 = makeSign([{ text: '🎃 SPAWN RUINS', size: 0.4 }, { text: 'Safe zone - Bosses cannot enter!', size: 0.2 }], 5, 1.4, THEMES.purple);
    sign2.position.set(RUINS.x, 3.2, RUINS.z - 6.05);
    sign2.rotation.y = Math.PI;
    live.add(sign2);
    // 指路牌（4 個方向）
    const way = [
      ['⬆ 🎃 Pumpkin Graveyard', RUINS.x, RUINS.z - RUINS.r + 3, 0],
      ['🚂 Train Station ➡', RUINS.x + RUINS.r - 3, RUINS.z - 3, -Math.PI / 2],
      ['⬅ 🎣 Fishing Lake', RUINS.x - RUINS.r + 3, RUINS.z - 3, Math.PI / 2],
      ['🪦 Egg Graveyard ⬇', RUINS.x + 4, RUINS.z + RUINS.r - 3, Math.PI],
    ];
    for (const [text, sx, sz, ry] of way) {
      const s = makeSign([{ text, size: 0.3 }], 4.4, 0.8, THEMES.orange);
      s.position.set(sx, 2.4, sz);
      s.rotation.y = ry;
      live.add(s);
    }
  });
  // ---- 返 Hub 嘅傳送門 ----
  let backPortal = null;
  steps.push(() => {
    backPortal = buildPortalArch(root, live, HW_PORTAL.x, HW_PORTAL.z, Math.PI, { plinth: false }); // 面向 -z（出生點中間）
    for (const s of [-1, 1]) addCollider(HW_PORTAL.x + s * 3.1, HW_PORTAL.z, 0.9);
    const lab = makeSign([{ text: '🌀 Back to the Hub', size: 0.32 }], 3.6, 0.7, THEMES.purple);
    lab.position.set(HW_PORTAL.x, 7.9, HW_PORTAL.z - 0.4);
    lab.rotation.y = Math.PI;
    live.add(lab);
  });

  // ---- 3 個生態區 ----
  const [b1, b2, b3] = HW_BIOMES;
  steps.push(() => {
    // 🎃 Pumpkin Graveyard
    const r = b1.rect;
    floor(root, r, 0x4a3a22, 0.2);
    for (let i = 0; i < 130; i++) {
      const x = r.minX + 3 + rand() * (r.maxX - r.minX - 6);
      const z = r.minZ + 3 + rand() * (r.maxZ - r.minZ - 6);
      if (Math.abs(x - HW_X) < 5 && rand() < 0.8) continue; // 中間留條路
      const k = rand();
      if (k < 0.42) pumpkin(root, null, x, z, 0.6 + rand() * 0.9, rand() < 0.35, rand() * 6);
      else if (k < 0.82) tombstone(root, x, z, 0.8 + rand() * 0.5, rand, (rand() - 0.5) * 0.6);
      else deadTree(root, x, z, 0.9 + rand() * 0.5, rand);
    }
    // 巨型南瓜燈（地標）
    for (const [x, z] of [[HW_X - 26, r.minZ + 30], [HW_X + 28, r.maxZ - 30], [HW_X - 20, r.maxZ - 18]]) {
      lanterns.push(pumpkin(root, null, x, z, 3.2, true, rand() * 6));
      addCollider(x, z, 2.4);
    }
    // 南瓜田泥行
    for (let i = 0; i < 8; i++) add(root, box(16, 0.06, 1.2), mat(0x3d2b18), HW_X + (i % 2 ? 22 : -22), 0.03, r.minZ + 10 + i * 12, false);
    // 歪咗嘅木欄
    for (let i = 0; i < 16; i++) {
      const z = r.minZ + 4 + i * 6.6;
      for (const s of [-1, 1]) add(root, box(0.25, 1.4 + rand() * 0.5, 0.25), mat(0x4a3424), HW_X + s * (W2(r) - 1.5), 0.7, z).rotation.z = (rand() - 0.5) * 0.4;
    }
    addBiomeGate(root, live, r.maxZ, '🎃 PUMPKIN GRAVEYARD', THEMES.orange, rand);
    addBossHomeMark(root, b1, 0xff6d00);
  });
  steps.push(() => {
    // 👻 Hollow Sprites
    const r = b2.rect;
    floor(root, r, 0x223a30, 0.18);
    for (let i = 0; i < 48; i++) {
      const x = r.minX + 4 + rand() * (r.maxX - r.minX - 8);
      const z = r.minZ + 4 + rand() * (r.maxZ - r.minZ - 8);
      if (Math.abs(x - HW_X) < 6) continue;
      twistedTree(root, x, z, 0.8 + rand() * 0.6, rand);
    }
    const cols = [0x18ffff, 0x76ff03, 0xd500f9, 0x00e5ff];
    for (let i = 0; i < 160; i++) {
      const x = r.minX + 2 + rand() * (r.maxX - r.minX - 4);
      const z = r.minZ + 2 + rand() * (r.maxZ - r.minZ - 4);
      glowShroom(root, x, z, 0.5 + rand() * 1.2, cols[i % 4]);
    }
    // 發光苔蘚路
    for (let i = 0; i < 26; i++) add(root, box(1.2 + rand(), 0.04, 1.2 + rand()), glow(0x139e7e, 0.35), HW_X + (rand() - 0.5) * 6, 0.03, r.maxZ - 3 - i * 4.1, false).rotation.y = rand() * 2;
    addBiomeGate(root, live, r.maxZ, '👻 HOLLOW SPRITES', THEMES.green, rand);
    addBossHomeMark(root, b2, 0x00e676);
  });
  steps.push(() => {
    // 🏚️ Abandoned Manor
    const r = b3.rect;
    floor(root, r, 0x3a3242, 0.16);
    buildManor(root, live, rand, lanterns);
    for (let i = 0; i < 40; i++) {
      const x = r.minX + 3 + rand() * (r.maxX - r.minX - 6);
      const z = r.maxZ - 4 - rand() * (r.maxZ - r.minZ - 46);
      if (Math.abs(x - HW_X) < 6) continue;
      if (rand() < 0.5) deadTree(root, x, z, 1 + rand() * 0.6, rand, 0x1c1618);
      else tombstone(root, x, z, 1 + rand() * 0.4, rand, rand() * 0.5);
    }
    addBiomeGate(root, live, r.maxZ, '🏚️ ABANDONED MANOR', THEMES.purple, rand);
    addBossHomeMark(root, b3, 0xd500f9);
  });
  steps.push(() => {
    // 邊界：3 個生態區兩邊 + 最北；Biome 1 南邊（留出生點條路）
    const all = { minX: b1.rect.minX, maxX: b1.rect.maxX, minZ: b3.rect.minZ, maxZ: b1.rect.maxZ - 1.5 };
    wallRect(root, all, rand, [['s', HW_X - 18, HW_X + 18]], { color: 0x231e2a, hMin: 10, hMax: 20 }); // 南邊留位俾出生點圓圈
  });

  // ---- 🪦 蛋墳場 ----
  steps.push(() => {
    const r = EGG_GRAVEYARD;
    floor(root, r, 0x33402c, 0.2);
    ironFence(root, r.minX, r.maxZ, r.maxX, r.maxZ);
    ironFence(root, r.minX, r.minZ + 6, r.minX, r.maxZ);
    ironFence(root, r.maxX, r.minZ + 6, r.maxX, r.maxZ);
    ironFence(root, r.minX, r.minZ + 6, HW_X - 3.5, r.minZ + 6);
    ironFence(root, HW_X + 3.5, r.minZ + 6, r.maxX, r.minZ + 6);
    // 入口拱門
    const iron = mat(0x1d1b22, { metalness: 0.6, roughness: 0.4 });
    for (const s of [-1, 1]) add(root, box(0.4, 4, 0.4), iron, HW_X + s * 3.5, 2, r.minZ + 6);
    add(root, geo('gateArc', () => new THREE.TorusGeometry(3.5, 0.15, 6, 20, Math.PI)), iron, HW_X, 4, r.minZ + 6, false);
    const sign = makeSign([{ text: '🪦 EGG GRAVEYARD', size: 0.36 }, { text: 'Hatch your Halloween eggs here', size: 0.2 }], 4.6, 1.2, THEMES.purple);
    sign.position.set(HW_X, 5.2, r.minZ + 5.8);
    sign.rotation.y = Math.PI;
    live.add(sign);
    // 8 個墓碑台（放蛋）
    for (const s of EGG_SLOTS) {
      add(root, rbox(2.4, 0.5, 2.4), mat(0x4d4957), s.x, 0.25, s.z);
      add(root, rbox(1.8, 0.3, 1.8), mat(0x5f5a69), s.x, 0.6, s.z);
      add(root, rbox(1.2, 1.5, 0.35), mat(0x6f6b75), s.x, 1.1, s.z + 1.2); // 後面個墓碑
      const ring = add(root, geo('slotRing', () => new THREE.RingGeometry(0.55, 0.7, 24)), glow(0x9575cd, 1.6), s.x, 0.77, s.z, false);
      ring.rotation.x = -Math.PI / 2;
      candle(live, flames, s.x - 0.9, 0.75, s.z + 0.9, 0.9);
    }
    for (let i = 0; i < 10; i++) deadTree(root, r.minX + 2 + (i % 2) * (r.maxX - r.minX - 4), r.minZ + 12 + i * 5, 0.7, rand);
  });

  // ---- 🚂 火車站 ----
  steps.push(() => {
    const r = STATION;
    floor(root, r, 0x3d3846, 0.15);
    const p = STATION_PLATFORM;
    add(root, box(p.maxX - p.minX, p.top, p.maxZ - p.minZ), mat(0x3e3227), (p.minX + p.maxX) / 2, p.top / 2, 0);
    for (let i = 0; i < 13; i++) add(root, box(p.maxX - p.minX, 0.03, 0.08), mat(0x2a2119), (p.minX + p.maxX) / 2, p.top + 0.01, p.minZ + 0.8 + i * 1.5, false); // 木板縫
    add(root, box(0.3, 0.1, p.maxZ - p.minZ), mat(0xffd54f, { emissive: 0x332600 }), p.maxX - 0.3, p.top + 0.05, 0, false); // 黃線
    addPlatform(p, p.top);
    // 路軌（一路伸出去霧入面）
    const rail = mat(0x6d6d78, { metalness: 0.7, roughness: 0.35 });
    for (const dx of [-0.75, 0.75]) add(root, box(0.15, 0.18, 360), rail, TRACK_X + dx, 0.2, 0, false);
    for (let z = -180; z <= 180; z += 1.6) add(root, box(2.4, 0.12, 0.35), mat(0x3b2a1e), TRACK_X, 0.06, z, false);
    // 頂棚 + 柱 + 燈籠
    const iron = mat(0x1d1b22, { metalness: 0.6, roughness: 0.4 });
    for (const z of [-8, -2.7, 2.7, 8]) {
      add(root, box(0.3, 4.6, 0.3), iron, p.minX + 3, p.top + 2.3, z);
      add(root, box(0.3, 4.6, 0.3), iron, p.maxX - 2, p.top + 2.3, z);
      const lamp = add(root, rbox(0.5, 0.7, 0.5), glow(0x76ff03, 1.8), p.maxX - 2, p.top + 3.7, z + 0.4, false);
      lamp.castShadow = false;
    }
    add(root, box(p.maxX - p.minX - 2, 0.3, p.maxZ - p.minZ + 1), mat(0x2b2433), (p.minX + p.maxX) / 2 + 0.5, p.top + 4.75, 0);
    // 售票亭
    add(root, rbox(4, 3.4, 3.4), mat(0x3a2d45), p.minX + 3, p.top + 1.7, p.maxZ - 2.6);
    add(root, box(2, 1, 0.1), glow(0xffb74d, 1.2), p.minX + 3, p.top + 2.1, p.maxZ - 4.35, false);
    addCollider(p.minX + 3, p.maxZ - 2.6, 2);
    // 大牌：PHANTOM EXPRESS
    const big = makeSign([{ text: '🚂 PHANTOM EXPRESS', size: 0.44 }, { text: 'Arrives every hour · ghost hunting for 30 minutes', size: 0.18 }], 7, 1.5, THEMES.purple);
    big.position.set((p.minX + p.maxX) / 2, p.top + 5.9, 0);
    big.rotation.y = -Math.PI / 2;
    live.add(big);
    wallRect(root, r, rand, [], { color: 0x231e2a, hMin: 6, hMax: 12, skip: ['e', 'w'] });
    ironFence(root, r.minX + 4, r.minZ + 0.5, p.maxX, r.minZ + 0.5, 1.6);
    ironFence(root, r.minX + 4, r.maxZ - 0.5, p.maxX, r.maxZ - 0.5, 1.6);
  });

  // ---- 🎣 釣魚湖 ----
  let waterMat = null;
  steps.push(() => {
    const r = LAKE;
    floor(root, LAKE_SHORE, 0x33402c, 0.2);
    floor(root, { minX: r.minX - 6, maxX: LAKE_SHORE.minX, minZ: r.minZ - 6, maxZ: r.maxZ + 6 }, 0x151a14, 0.1, -0.6); // 湖底
    waterMat = new THREE.MeshStandardMaterial({ color: 0x1f5a5a, emissive: 0x0c3a30, emissiveIntensity: 0.7, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.92 });
    const w = LAKE_WATER;
    const water = add(live, new THREE.BoxGeometry(w.maxX - w.minX + 2, 0.1, w.maxZ - w.minZ + 2), waterMat, (w.minX + w.maxX) / 2, -0.15, (w.minZ + w.maxZ) / 2, false);
    water.receiveShadow = false;
    // 碼頭
    const d = DOCK;
    add(root, box(d.maxX - d.minX, 0.25, d.maxZ - d.minZ), mat(0x4e3a2a), (d.minX + d.maxX) / 2, d.top - 0.12, 0);
    addPlatform(d, d.top);
    for (let x = d.minX + 1; x < d.maxX; x += 3.2) for (const s of [-1, 1]) add(root, cyl(0.16, 0.16, 1.8, 6), mat(0x3a2a1e), x, -0.4, s * 2.1);
    // 碼頭尾：燈籠 + 一張櫈
    add(root, box(0.15, 2.2, 0.15), mat(0x3a2a1e), FISH_SPOT.x - 1, d.top + 1.1, 1.8, false);
    add(root, rbox(0.4, 0.5, 0.4), glow(0xffab40, 2), FISH_SPOT.x - 1, d.top + 2.3, 1.8, false);
    // 魚竿舖
    const shop = new THREE.Group();
    shop.position.set(ROD_SHOP.x, 0, ROD_SHOP.z);
    shop.rotation.y = Math.PI / 2; // 面向 +x（出生點嗰邊）
    add(shop, rbox(4.6, 1.2, 2.2), mat(0x4e3a2a), 0, 0.6, 0);
    for (const s of [-1, 1]) add(shop, box(0.25, 3.6, 0.25), mat(0x3a2a1e), s * 2.1, 1.8, 0.9);
    add(shop, box(5.2, 0.25, 3.2), mat(0x1b5e20), 0, 3.6, 0.4).rotation.x = -0.15;
    for (let i = 0; i < 4; i++) add(shop, box(0.06, 2.6, 0.06), mat(0x8d6e63), -1.6 + i * 1.05, 1.9, 1.05).rotation.z = 0.25; // 掛住嘅魚竿
    root.add(shop);
    addCollider(ROD_SHOP.x, ROD_SHOP.z, 2.4);
    const sign = makeSign([{ text: '🎣 ROD SHOP', size: 0.4 }, { text: 'Fish for Halloween eggs!', size: 0.2 }], 4, 1.1, THEMES.blue);
    sign.position.set(ROD_SHOP.x + 1.3, 4.4, ROD_SHOP.z);
    sign.rotation.y = Math.PI / 2;
    live.add(sign);
    // 蘆葦 + 浮喺水面嘅蓮葉蠟燭
    for (let i = 0; i < 60; i++) {
      const z = w.minZ + rand() * (w.maxZ - w.minZ);
      add(root, box(0.08, 1.2 + rand(), 0.08), mat(0x33402a), w.maxX - rand() * 2, 0.4, z, false).rotation.z = (rand() - 0.5) * 0.3;
    }
    for (let i = 0; i < 14; i++) {
      const x = w.minX + 6 + rand() * (w.maxX - w.minX - 14);
      const z = w.minZ + 4 + rand() * (w.maxZ - w.minZ - 8);
      if (Math.abs(z) < 4) continue;
      add(root, cyl(0.7, 0.7, 0.05, 10), mat(0x2e5d32), x, -0.08, z, false);
      candle(live, flames, x, -0.06, z, 0.8);
    }
    wallRect(root, { ...r, maxX: r.maxX - 6 }, rand, [], { color: 0x1f1b26, hMin: 9, hMax: 18, skip: ['e'] });
  });

  // ---- 👻 Ghost World（坐火車先去到）----
  let ghostRing = null;
  steps.push(() => {
    const G = GHOST_WORLD;
    add(root, cyl(G.r, G.r - 4, 3, 48), mat(0x2a1f3d, { flatShading: true }), G.x, -1.5, G.z, false);
    add(root, cyl(G.r - 1, G.r - 1, 0.2, 48), new THREE.MeshStandardMaterial({ map: noiseTexture(0x2f2448, 0.2, 12, 12), roughness: 0.95 }), G.x, -0.1, G.z, false);
    // 島底（一嚿嚿浮石向下）
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      add(root, box(10, 8 + rand() * 10, 10), mat(0x1c1529, { flatShading: true }), G.x + Math.cos(a) * (G.r - 8), -8, G.z + Math.sin(a) * (G.r - 8)).rotation.y = a;
    }
    // 邊沿：發光石 + 破爛柱
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const x = G.x + Math.cos(a) * (G.r - 1.5);
      const z = G.z + Math.sin(a) * (G.r - 1.5);
      if (Math.hypot(x - GHOST_TRAIN_STOP.x, z - GHOST_TRAIN_STOP.z) < 10) continue;
      add(root, box(2.2, 1.5 + rand() * 4, 2.2), mat(0x3b2d52, { flatShading: true }), x, 1, z).rotation.y = a;
      if (i % 3 === 0) add(root, geo('crystal', () => new THREE.OctahedronGeometry(0.6)), glow(i % 2 ? 0x69f0ae : 0xb388ff, 1.8), x, 3.6, z, false).scale.y = 1.8;
    }
    // Statue of Halloween：大台 + 戴帽嘅神秘人捧住發光南瓜
    const S = STATUE_OF_HALLOWEEN;
    const stone = mat(0x5a5068);
    add(root, cyl(4.4, 5, 1, 8), mat(0x3a3048), S.x, 0.5, S.z);
    add(root, cyl(3.2, 3.6, 1.2, 8), stone, S.x, 1.6, S.z);
    add(root, rbox(2.6, 4.4, 1.8), stone, S.x, 4.4, S.z); // 身（袍）
    add(root, geo('statueRobe', () => new THREE.ConeGeometry(2.2, 3.4, 8)), stone, S.x, 3.4, S.z);
    add(root, rbox(1.6, 1.6, 1.6), stone, S.x, 7.3, S.z); // 頭
    add(root, geo('witchHat', () => new THREE.ConeGeometry(1.4, 3, 8)), mat(0x2a2236), S.x, 9.6, S.z);
    add(root, cyl(2, 2, 0.15, 16), mat(0x2a2236), S.x, 8.1, S.z);
    for (const s of [-1, 1]) add(root, box(0.3, 0.2, 0.1), glow(0x69f0ae, 3), S.x + s * 0.35, 7.45, S.z - 0.82, false); // 眼
    lanterns.push(pumpkin(root, null, S.x, S.z - 1.4, 1.3, true, 0));
    lanterns[lanterns.length - 1].position.y = 4.6;
    addCollider(S.x, S.z, 4.6);
    const sign = makeSign([{ text: '🗿 STATUE OF HALLOWEEN', size: 0.36 }, { text: 'Trade 400 Soul Dust for a Halloween Shard', size: 0.18 }], 5.6, 1.2, THEMES.purple);
    sign.position.set(S.x, 2.4, S.z + 5.3); // 面向 +z（落車嗰邊）
    live.add(sign);
    // 吸塵機舖
    const V = VACUUM_SHOP;
    add(root, rbox(4.4, 1.2, 2.2), mat(0x37474f), V.x, 0.6, V.z);
    for (const s of [-1, 1]) add(root, box(0.25, 3.4, 0.25), mat(0x263238), V.x + s * 2, 1.7, V.z + 0.9);
    add(root, box(5, 0.25, 3), mat(0x6a1b9a), V.x, 3.5, V.z + 0.3);
    add(root, cyl(0.5, 0.5, 1.4, 12), mat(0x00bcd4, { metalness: 0.5 }), V.x - 1.2, 1.9, V.z, false); // 吸塵機模型
    add(root, box(0.15, 0.15, 1.6), mat(0x90a4ae), V.x - 1.2, 2.3, V.z - 0.8, false);
    addCollider(V.x, V.z, 2.4);
    const vs = makeSign([{ text: '🧹 GHOST VACUUMS', size: 0.36 }, { text: 'Upgrade with Soul Dust (Lv 1-5)', size: 0.19 }], 4.4, 1.1, THEMES.blue);
    vs.position.set(V.x, 4.3, V.z + 1.6);
    live.add(vs);
    // 返程月台
    const P = GHOST_TRAIN_STOP;
    add(root, box(16, 0.4, 5), mat(0x3e3227), P.x, 0.2, P.z + 2);
    for (const dx of [-0.75, 0.75]) add(root, box(60, 0.18, 0.15), mat(0x6d6d78, { metalness: 0.7 }), P.x, 0.2, P.z + 6.5 + dx, false);
    // 地上大魔法陣（會轉）
    ghostRing = add(live, geo('ghostRing', () => new THREE.RingGeometry(GHOST_WORLD.r * 0.55, GHOST_WORLD.r * 0.57, 6)), new THREE.MeshBasicMaterial({ color: 0xb388ff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }), G.x, 0.05, G.z, false);
    ghostRing.rotation.x = -Math.PI / 2;
  });
  // 遠處嘅大月光 + 恐怖星（跟住鏡頭）
  const moon = new THREE.Group();
  steps.push(() => {
    add(moon, ball(26, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffe0b2, fog: false }), 0, 0, 0, false);
    add(moon, ball(34, 24, 16), new THREE.MeshBasicMaterial({ color: 0xff6e40, transparent: true, opacity: 0.18, fog: false, depthWrite: false }), 0, 0, 0, false);
    for (let i = 0; i < 7; i++) add(moon, ball(2 + rand() * 4, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd7b98e, fog: false }), (rand() - 0.5) * 30, (rand() - 0.5) * 30, 18, false); // 月球坑
    moon.visible = false;
    scene.add(moon);
  });
  const stars = (() => {
    const p = [];
    for (let i = 0; i < 500; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(380);
      v.y = Math.abs(v.y) + 30;
      p.push(v.x, v.y, v.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffccbc, size: 1.6, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    pts.frustumCulled = false;
    pts.visible = false;
    scene.add(pts);
    return pts;
  })();

  // 一步步起（每步之後等一格，俾載入畫面郁）
  for (let i = 0; i < steps.length; i++) {
    steps[i]();
    progress((i + 1) / (steps.length + 1));
    await nextFrame();
  }
  bakeStatic(root, scene);
  progress(1);
  await nextFrame();

  // 會郁嘅嘢
  const wisps = [
    ...makeWisps(live, 26, HW_BIOMES[1].rect, rand, [0x18ffff, 0x76ff03, 0xea80fc]),
    ...makeWisps(live, 10, HW_BIOMES[0].rect, rand, [0xffab40]),
    ...makeWisps(live, 24, { minX: GHOST_WORLD.x - 40, maxX: GHOST_WORLD.x + 40, minZ: GHOST_WORLD.z - 40, maxZ: GHOST_WORLD.z + 40 }, rand, [0xb388ff, 0x69f0ae]),
  ];
  const bats = [
    ...makeBats(live, 14, MANOR.x, MANOR.z, 8, 26, 9, 18, rand),
    ...makeBats(live, 6, RUINS.x, RUINS.z, 10, 20, 10, 15, rand),
    ...makeBats(live, 6, HW_X, HW_BIOMES[0].rect.minZ + 50, 10, 30, 8, 14, rand),
  ];
  halloween.built = true;
  const tmp = new THREE.Vector3();
  return {
    backPortal,
    nearBackPortal: (pos) => Math.hypot(pos.x - HW_PORTAL.x, pos.z - HW_PORTAL.z) < 3.4,
    update(dt, t, camPos) {
      const show = halloween.sky > 0.02;
      live.visible = show;
      moon.visible = show;
      stars.visible = show;
      if (!show) return;
      backPortal.update(t);
      flames.forEach((f, i) => f.scale.y = 0.8 + Math.sin(t * 14 + i * 1.7) * 0.25);
      for (const w of wisps) {
        const k = t * 0.6 + w.p;
        w.m.position.set(w.x + Math.cos(k) * w.r, w.y + Math.sin(k * 1.7) * 0.6, w.z + Math.sin(k * 0.8) * w.r);
        w.m.material.opacity = 0.6 + Math.sin(t * 3 + w.p) * 0.3;
      }
      for (const b of bats) {
        const a = t * b.sp + b.p;
        b.g.position.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(t * 2 + b.p) * 1.2, b.cz + Math.sin(a) * b.r);
        b.g.rotation.y = -a + (b.sp > 0 ? Math.PI : 0);
        const flap = Math.sin(t * 18 + b.p) * 0.9;
        b.wings.forEach(({ w, s }) => (w.rotation.z = s * flap));
      }
      if (waterMat) waterMat.emissiveIntensity = 0.5 + Math.sin(t * 1.3) * 0.15;
      if (ghostRing) ghostRing.rotation.z = t * 0.15;
      // 月亮：喺東北邊天上，跟住鏡頭
      tmp.set(0.55, 0.42, -0.72).normalize().multiplyScalar(330);
      moon.position.copy(camPos).add(tmp);
      moon.lookAt(camPos);
      stars.position.copy(camPos);
      stars.material.opacity = 0.75 * halloween.sky;
    },
  };
}
const W2 = (r) => (r.maxX - r.minX) / 2;

// 生態區入口：兩條石柱 + 發光名牌（每區唔同色）
function addBiomeGate(root, live, z, title, theme, rand) {
  const stone = mat(0x3a3344);
  for (const s of [-1, 1]) {
    add(root, rbox(1.6, 7, 1.6), stone, HW_X + s * 9, 3.5, z);
    add(root, geo('gateSkull', () => new THREE.DodecahedronGeometry(0.7)), mat(0xe0d8c8), HW_X + s * 9, 7.6, z);
    for (const e of [-1, 1]) add(root, box(0.2, 0.18, 0.1), glow(0xff1744, 2.5), HW_X + s * 9 + e * 0.25, 7.7, z - 0.62, false);
    addCollider(HW_X + s * 9, z, 1.1);
  }
  add(root, box(19.6, 0.8, 1), stone, HW_X, 6.6, z);
  const sign = makeSign([{ text: title, size: 0.46 }], 10, 1.3, theme);
  sign.position.set(HW_X, 6.6, z + 0.6);
  live.add(sign);
  const back = makeSign([{ text: title, size: 0.46 }], 10, 1.3, theme);
  back.position.set(HW_X, 6.6, z - 0.6);
  back.rotation.y = Math.PI;
  live.add(back);
}
// Boss 屋企嘅記號（地上一圈發光符號 + 爛石台）
function addBossHomeMark(root, b, color) {
  const { x, z } = b.bossHome;
  add(root, cyl(5, 5.4, 0.3, 12), mat(0x2b2433), x, 0.15, z, false);
  const ring = add(root, geo('bossRing', () => new THREE.RingGeometry(4.2, 4.6, 12)), glow(color, 1.3), x, 0.32, z, false);
  ring.rotation.x = -Math.PI / 2;
}

// 🏚️ 恐怖大屋：主樓 + 兩座塔 + 尖屋頂 + 發光爛窗 + 鐵閘 + 石像鬼
function buildManor(root, live, rand, lanterns) {
  const { x, z, w, d } = MANOR;
  const wall = mat(0x574b5e);
  const wall2 = mat(0x433a4b);
  const roof = mat(0x1a1520);
  const wood = mat(0x2b1f1a);
  add(root, box(w, 12, d), wall, x, 6, z);
  add(root, box(w + 1, 0.6, d + 1), wall2, x, 12.3, z);
  // 尖屋頂（兩條斜板）
  for (const s of [-1, 1]) {
    const r = add(root, box(w + 2, 0.5, d * 0.62), roof, x, 15.2, z + s * d * 0.25);
    r.rotation.x = s * 0.78;
  }
  // 兩座塔
  for (const s of [-1, 1]) {
    const tx = x + s * (w / 2 + 2);
    add(root, cyl(3.6, 3.8, 20, 8), wall2, tx, 10, z + 2);
    add(root, geo('towerRoof', () => new THREE.ConeGeometry(4.4, 7, 8)), roof, tx, 23.5, z + 2);
    add(root, box(1.2, 2, 0.2), glow(0xc6ff00, 1.4), tx, 15, z + 2 + 3.65, false);
    addCollider(tx, z + 2, 4);
  }
  // 窗（發光，有啲爛咗冇光）
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 7; i++) {
      const wx = x - w / 2 + 2.6 + i * ((w - 5.2) / 6);
      const wy = 3.6 + row * 5;
      const lit = rand() < 0.7;
      add(root, box(2, 2.8, 0.2), lit ? glow(i % 3 ? 0xffd740 : 0xc6ff00, 1.3) : mat(0x0d0b10), wx, wy, z + d / 2 + 0.05, false);
      add(root, box(2.4, 0.3, 0.4), wood, wx, wy - 1.55, z + d / 2 + 0.15, false);
      if (!lit || rand() < 0.4) add(root, box(2.3, 0.2, 0.1), wood, wx, wy, z + d / 2 + 0.2, false).rotation.z = rand() < 0.5 ? 0.6 : -0.6; // 封窗木板
    }
  }
  // 大門 + 樓梯
  add(root, box(4, 6, 0.3), wood, x, 3, z + d / 2 + 0.15);
  add(root, box(0.4, 0.4, 0.2), glow(0xffd740, 2), x + 1.3, 3, z + d / 2 + 0.4, false);
  for (let i = 0; i < 3; i++) add(root, box(8 - i, 0.4, 1.4), wall2, x, 0.2 + i * 0.4, z + d / 2 + 2.6 - i * 0.8);
  // 撞嘢：大屋成座行唔入
  for (let ix = -w / 2 + 2; ix <= w / 2 - 2; ix += 4) for (let iz = -d / 2 + 2; iz <= d / 2 - 2; iz += 4) addCollider(x + ix, z + iz, 2.9);
  // 前院鐵閘 + 鐵欄（中間開咗）
  const fz = MANOR_GATE_Z;
  ironFence(root, x - 36, fz, x - 5, fz, 3);
  ironFence(root, x + 5, fz, x + 36, fz, 3);
  const iron = mat(0x1d1b22, { metalness: 0.6, roughness: 0.4 });
  for (const s of [-1, 1]) {
    add(root, box(1.4, 5, 1.4), mat(0x3a3344), x + s * 5, 2.5, fz);
    // 石像鬼（蹲喺閘柱頂）
    const gx = x + s * 5;
    add(root, rbox(1.2, 1, 1.4), mat(0x5a5560), gx, 5.5, fz);
    add(root, rbox(0.9, 0.8, 0.8), mat(0x5a5560), gx, 6.3, fz - 0.6);
    for (const e of [-1, 1]) {
      add(root, box(0.15, 0.12, 0.05), glow(0xff1744, 2.5), gx + e * 0.2, 6.4, fz - 1.02, false);
      add(root, geo('gHorn', () => new THREE.ConeGeometry(0.12, 0.5, 4)), mat(0x4a4550), gx + e * 0.3, 6.9, fz - 0.6, false);
      const wing = add(root, box(1.4, 0.9, 0.1), mat(0x4a4550), gx + e * 0.9, 6, fz + 0.2, false);
      wing.rotation.y = e * 0.5;
    }
    addCollider(gx, fz, 1);
    // 打開咗嘅鐵閘門
    const gate = add(root, box(4.5, 3.6, 0.12), iron, x + s * 2.6, 1.9, fz + 2);
    gate.rotation.y = s * 1.1;
  }
  lanterns.push(pumpkin(root, null, x - 4, z + d / 2 + 4, 1.4, true, 0));
  lanterns.push(pumpkin(root, null, x + 4, z + d / 2 + 4, 1.4, true, 0));
}

// ================= 恐怖天空（main.js 喺 updateAmbience 之後叫）=================
// 血紅紫色天、好近嘅霧、間中行雷閃電；每個地方嘅霧唔同（Hollow Sprites 最大霧）
const ZONE_FOG = {
  '🎃 Spawn Ruins': [0x3d1434, 16, 110],
  'Pumpkin Graveyard': [0x4a1e0a, 9, 66],
  'Hollow Sprites': [0x123a2c, 5, 44],
  'Abandoned Manor': [0x2c1844, 8, 60],
  'Egg Graveyard': [0x2a1530, 14, 95],
  'Train Station': [0x2a1838, 16, 110],
  'Fishing Lake': [0x16303c, 14, 95],
  'Ghost World': [0x1d0f33, 12, 85],
};
const C = (h) => new THREE.Color(h);
const SKY_TOP = C(0x12001c);
const SKY_BOTTOM = C(0x5a0d1e);
const _fog = new THREE.Color();
const _bg = new THREE.Color();
const _flashC = C(0xd1c4e9);
const _bloodFog = C(0x2a0006); // 拎住蛋嘅暗紅霧
const SUN_RED = C(0xff7a5c);
let fogNear = 70;
let fogFar = 220;
let hwAmbient = null;
export function applyHalloweenSky({ scene, skyUniforms, hemi, sun, dt, camPos, playSound }) {
  const inside = inHalloween(camPos.x, camPos.z);
  halloween.inside = inside;
  halloween.sky += ((inside ? 1 : 0) - halloween.sky) * Math.min(1, dt * 2.5);
  if (inside && halloween.sky > 0.97) halloween.sky = 1;
  const k = halloween.sky;
  if (!scene.fog) return;
  if (k < 0.002 && hwAmbient) hwAmbient.intensity = 0; // 返到正常世界：熄咗佢
  if (k < 0.002) {
    fogNear = scene.fog.near;
    fogFar = scene.fog.far;
    return;
  }
  const zone = ZONE_FOG[hwZoneAt(camPos.x, camPos.z)] || ZONE_FOG['🎃 Spawn Ruins'];
  // 行雷：每 7–16 秒一次，閃兩下
  if (inside) {
    halloween.nextFlash -= dt;
    if (halloween.nextFlash <= 0) {
      halloween.nextFlash = 7 + Math.random() * 9;
      halloween.flash = 1;
      halloween.flashT = 0;
      setTimeout(() => playSound?.('thunder'), 250 + Math.random() * 500);
    }
  }
  halloween.flashT = (halloween.flashT ?? 1) + dt;
  const ft = halloween.flashT;
  const flash = ft < 0.12 ? 1 : ft < 0.2 ? 0.2 : ft < 0.3 ? 0.8 : Math.max(0, 1 - (ft - 0.3) * 3) * 0.5;
  // 天色
  _bg.copy(SKY_BOTTOM).lerp(_flashC, flash * 0.55);
  scene.background.lerp(_bg, k);
  skyUniforms.bottom.value.lerp(_bg, k);
  skyUniforms.top.value.lerp(SKY_TOP, k);
  skyUniforms.sunAmt.value *= 1 - k;
  skyUniforms.moonAmt.value *= 1 - k;
  // 霧：顏色 + 好近（慢慢變）
  // 🥚 拎住蛋：霧收埋（halloween.closeFog 0–1，由 halloweenEggs.js 控制），變暗紅色
  const cf = halloween.closeFog || 0;
  const wantNear = THREE.MathUtils.lerp(zone[1], HALLOWEEN_FOG_NEAR, cf);
  const wantFar = THREE.MathUtils.lerp(zone[2], HALLOWEEN_FOG_FAR, cf);
  fogNear += (wantNear - fogNear) * Math.min(1, dt * (cf > 0.05 ? 4 : 1.2));
  fogFar += (wantFar - fogFar) * Math.min(1, dt * (cf > 0.05 ? 4 : 1.2));
  _fog.setHex(zone[0]).lerp(_bloodFog, cf * 0.85).lerp(_flashC, flash * 0.35);
  scene.fog.color.lerp(_fog, k);
  if (!halloween.noFog) { // （noFog：測試影相用）
    scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, fogNear, k);
    scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, fogFar, k);
  }
  // 額外環境光（小朋友：太暗睇唔到攤位）：只喺 Halloween 世界入面著
  if (!hwAmbient) {
    hwAmbient = new THREE.AmbientLight(0xd9c2ff, 0);
    scene.add(hwAmbient);
  }
  hwAmbient.intensity = THREE.MathUtils.lerp(hwAmbient.intensity, 1.6 * k, Math.min(1, dt * 3));
  // 光：暗紅月光 + 閃電一下好光
  hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, 2.1 + flash * 1.4, k); // 小朋友：太暗，睇唔到啲攤位（1.05 → 2.1）
  sun.intensity = THREE.MathUtils.lerp(sun.intensity, 2.0 + flash * 1.2, k);
  sun.color.lerp(SUN_RED, k);
}

// ================= 🎃 載入畫面（坐傳送門／火車）=================
// showLoading('Entering the Halloween World...', async (progress) => { ... }) → Promise
// 最少顯示 minSeconds 秒；task 可以係 async，攞 progress(0–1) 更新進度條
export const loading = { active: false };
const TIPS = [
  '🎃 Tip: The Spawn Ruins are a SAFE ZONE. Bosses cannot go inside!',
  '👻 Tip: When you grab an egg, the fog closes in... follow the red arrow back!',
  '🚂 Tip: The Phantom Express arrives every hour. Catch ghosts for 30 minutes!',
  '🧹 Tip: A better vacuum catches ghosts faster.',
  '🔮 Tip: Trade 400 Soul Dust at the Statue of Halloween for a Halloween Shard.',
  '🎣 Tip: Better fishing rods catch better Halloween eggs.',
  '🦇 Tip: Every biome boss chases you. NO MERCY!',
  '🪦 Tip: Put your eggs in the Egg Graveyard to hatch them.',
];
let el = null;
function ensureLoadingEl() {
  if (el) return el;
  el = document.createElement('div');
  el.id = 'hw-loading';
  el.innerHTML = `
    <style>
      #hw-loading { position: fixed; inset: 0; z-index: 9000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
        background: radial-gradient(circle at 50% 40%, #3a0d3a 0%, #14031c 55%, #050008 100%); color: #ffe0b2; font-family: 'Fredoka', 'Baloo 2', system-ui, sans-serif;
        opacity: 0; transition: opacity .35s; pointer-events: all; overflow: hidden; }
      #hw-loading.show { opacity: 1; }
      #hw-loading .hw-moon { position: absolute; top: 8%; right: 12%; width: 140px; height: 140px; border-radius: 50%; background: radial-gradient(circle at 40% 40%, #fff3e0, #ffab91 70%, #bf360c); box-shadow: 0 0 80px 30px rgba(255,110,64,.35); }
      #hw-loading .hw-stage { position: relative; width: 220px; height: 200px; }
      #hw-loading .hw-pumpkin { position: absolute; left: 50%; top: 50%; font-size: 120px; transform: translate(-50%, -50%); animation: hwBounce 1s ease-in-out infinite; filter: drop-shadow(0 0 24px rgba(255,145,0,.8)); }
      #hw-loading .hw-ghost { position: absolute; left: 50%; top: 50%; font-size: 54px; animation: hwOrbit 2.4s linear infinite; }
      #hw-loading .hw-bat { position: absolute; font-size: 34px; animation: hwFly 4s linear infinite; opacity: .85; }
      #hw-loading h1 { margin: 0; font-size: clamp(26px, 4.4vw, 52px); letter-spacing: .04em; color: #ff9800; -webkit-text-stroke: 2px #2a0a00; text-shadow: 0 4px 0 #4a0f00, 0 0 28px rgba(255,120,0,.6); text-align: center; }
      #hw-loading .hw-bar { width: min(460px, 80vw); height: 22px; border-radius: 99px; background: #250a2e; border: 3px solid #ff9800; overflow: hidden; box-shadow: 0 0 22px rgba(255,152,0,.35); }
      #hw-loading .hw-fill { height: 100%; width: 0%; background: repeating-linear-gradient(45deg, #ff9800 0 14px, #ffb74d 14px 28px); transition: width .2s; }
      #hw-loading .hw-tip { max-width: min(560px, 86vw); text-align: center; font-size: 18px; color: #e1bee7; min-height: 2.6em; }
      @keyframes hwBounce { 0%,100% { transform: translate(-50%, -50%) scale(1) rotate(-4deg); } 50% { transform: translate(-50%, -62%) scale(1.06) rotate(4deg); } }
      @keyframes hwOrbit { from { transform: rotate(0deg) translateX(105px) rotate(0deg); } to { transform: rotate(360deg) translateX(105px) rotate(-360deg); } }
      @keyframes hwFly { from { transform: translate(-60vw, 0) scaleX(-1); } to { transform: translate(60vw, -40px) scaleX(-1); } }
      @media (prefers-reduced-motion: reduce) { #hw-loading * { animation: none !important; } }
    </style>
    <div class="hw-moon"></div>
    <div class="hw-bat" style="top:18%;left:50%">🦇</div><div class="hw-bat" style="top:30%;left:50%;animation-delay:-1.5s">🦇</div><div class="hw-bat" style="top:72%;left:50%;animation-delay:-2.7s">🦇</div>
    <div class="hw-stage"><div class="hw-pumpkin">🎃</div><div class="hw-ghost" style="margin:-27px 0 0 -27px">👻</div></div>
    <h1 class="hw-title">Entering the Halloween World...</h1>
    <div class="hw-bar"><div class="hw-fill"></div></div>
    <div class="hw-tip"></div>`;
  document.body.appendChild(el);
  return el;
}
export async function showLoading(text, task, minSeconds = 1.8) {
  const e = ensureLoadingEl();
  loading.active = true;
  e.style.display = 'flex';
  e.querySelector('.hw-title').textContent = text;
  e.querySelector('.hw-tip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  const fill = e.querySelector('.hw-fill');
  fill.style.width = '0%';
  void e.offsetWidth;
  e.classList.add('show');
  const start = performance.now();
  let real = 0;
  const timer = setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / (minSeconds * 1000));
    fill.style.width = `${Math.round(Math.min(real, t) * 100)}%`;
  }, 60);
  await new Promise((r) => setTimeout(r, 350)); // 等個畫面淡入咗先開始起嘢
  try {
    await task?.((p) => (real = Math.max(real, p)));
  } finally {
    real = 1;
    const left = minSeconds * 1000 - (performance.now() - start);
    if (left > 0) await new Promise((r) => setTimeout(r, left));
    fill.style.width = '100%';
    clearInterval(timer);
    await new Promise((r) => setTimeout(r, 200));
    e.classList.remove('show');
    await new Promise((r) => setTimeout(r, 350));
    e.style.display = 'none';
    loading.active = false;
  }
}
