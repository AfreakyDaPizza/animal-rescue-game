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
export const MAP_LOOK = {
  savanna: {
    sky: [0xffc27a, 0x8e6fc4], sunDir: [0.25, 0.07, -1], sunColor: 0xffa860, sunAmt: 1.5,
    fog: [0xf2b07c, 55, 250], hemi: [0xffd2a0, 0x8a6a3a, 1.55], light: [0xffc890, 2.5],
    particles: { color: 0xffe082, size: 0.12, count: 260, fall: -0.2, drift: 0.6 }, // 金色塵
  },
  desert: {
    sky: [0xfbe3b0, 0x3d8fe0], sunDir: [-0.35, 0.55, -1], sunColor: 0xfff3c0, sunAmt: 1.1,
    fog: [0xf3dcae, 70, 300], hemi: [0xfff3e0, 0xc9a46a, 1.6], light: [0xfff0d0, 2.9],
    particles: { color: 0xf5deb3, size: 0.09, count: 220, fall: 0.1, drift: 2.4 }, // 風吹沙
    haze: true,
  },
  taiga: {
    sky: [0xd5dee6, 0x7891a8], sunDir: [0.4, 0.3, -1], sunColor: 0xe0ecff, sunAmt: 0.5,
    fog: [0xc9d3dc, 22, 165], hemi: [0xdbe8f5, 0x56634f, 1.7], light: [0xe6f0ff, 1.7],
    particles: { color: 0xffffff, size: 0.16, count: 900, fall: 2.2, drift: 0.7 }, // 落雪
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
      // 松針 + 一笪笪雪
      for (let i = 0; i < 600; i++) {
        ctx.fillStyle = ['#3b4d2e', '#5b6e45', '#6a5a3e', '#2f3f26'][Math.floor(r() * 4)];
        ctx.fillRect(Math.floor(r() * S), Math.floor(r() * S), 3, 3);
      }
      for (let i = 0; i < 22; i++) {
        ctx.fillStyle = `rgba(245, 250, 255, ${0.55 + r() * 0.4})`;
        ctx.beginPath();
        ctx.ellipse(r() * S, r() * S, 8 + r() * 20, 6 + r() * 14, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, { nearest: false });
}

// 好大塊地板，跟住玩家行（紋理反方向郁，所以睇落係唔郁）
const GROUND_SIZE = 700;
const GROUND_TILE = 14;
export function buildGround(mapId) {
  const tex = groundTexture(mapId);
  const rep = GROUND_SIZE / GROUND_TILE;
  tex.repeat.set(rep, rep);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  mesh.position.set(RODEO_ORIGIN.x, 0, 0);
  return {
    mesh,
    follow(z) {
      mesh.position.z = z;
      tex.offset.y = (-z * rep) / GROUND_SIZE;
    },
    dispose() {
      mesh.geometry.dispose();
      mesh.material.dispose();
      tex.dispose();
    },
  };
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
const LAYOUT = {
  savanna: {
    obstacles: [['termite', 3], ['boulder', 3], ['thorn', 3], ['logH', 1.4], ['acacia', 1.2]],
    side: [['acacia', 5], ['termite', 1.5], ['boulder', 1.2], ['baobab', 0.8], ['thorn', 1.5]],
    small: (p, x, z, r) => DECO.grass(p, x, z, r, 1 + r() * 0.6),
    smallCount: 26,
  },
  desert: {
    obstacles: [['saguaro', 3.5], ['barrel', 2], ['redRock', 3]],
    side: [['saguaro', 3], ['redRock', 2], ['barrel', 1.5], ['bones', 0.6]],
    big: [['dune', 2.2], ['mesa', 0.35]],
    small: (p, x, z, r) => (r() < 0.1 ? DECO.bones(p, x, z, r) : DECO.grass(p, x, z, r, 0.6, [0xa89a5a, 0xbfae6a, 0x8f8a4a])),
    smallCount: 10,
  },
  taiga: {
    obstacles: [['logH', 2.5], ['stump', 2.5], ['boulder', 2.5], ['pine', 2]],
    side: [['pine', 8], ['birch', 1.4], ['boulder', 1.0], ['stump', 0.8]],
    small: (p, x, z, r) => (r() < 0.55 ? DECO.snowPatch(p, x, z, r) : r() < 0.5 ? DECO.mushroom(p, x, z, r) : DECO.ice(p, x, z, r)),
    smallCount: 14,
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
  // 路上障礙物
  if (!safe) {
    const n = Math.round(2 + difficulty * 5 + r() * 2);
    for (let i = 0; i < n; i++) {
      const lx = (r() * 2 - 1) * (RODEO_LANE - 0.5);
      const z = z0 - (i + r() * 0.8) * (CHUNK_LEN / n);
      const kind = pickW(L.obstacles, r);
      const s = kind === 'acacia' || kind === 'pine' ? 0.8 + r() * 0.3 : 0.8 + r() * 0.45;
      const hit = DECO[kind](raw, X + lx, z, r, s, ...(mapId === 'taiga' ? [undefined, true] : []));
      if (hit) obstacles.push(hit);
    }
  }
  // 兩邊
  for (let i = 0; i < 22; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const ax = RODEO_LANE + 2.5 + Math.pow(r(), 1.6) * 110;
    const z = z0 - r() * CHUNK_LEN;
    const kind = pickW(L.side, r);
    DECO[kind](raw, X + side * ax, z, r, 0.9 + r() * 0.6, ...(mapId === 'taiga' ? [undefined, true] : []));
  }
  if (L.big) for (let i = 0; i < 3; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const ax = RODEO_LANE + 30 + r() * 120;
    DECO[pickW(L.big, r)](raw, X + side * ax, z0 - r() * CHUNK_LEN, r, 0.7 + r() * 0.6);
  }
  // 地上細嘢（草、雪、骨頭）：路上都有（唔撞）
  for (let i = 0; i < L.smallCount; i++) L.small(raw, X + (r() * 2 - 1) * 70, z0 - r() * CHUNK_LEN, r);
  const group = bake(raw);
  return { index, group, obstacles };
}

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
