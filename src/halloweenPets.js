// 🎃 Halloween 寵物模型（小朋友 2026-10-19 Issue #6）：17 隻蛋寵物 + 每隻一款蛋（buildHalloweenEgg）
// 方塊／圓波波風格，鬼鬼哋但可愛（適合小朋友）；全部面向 -z
// 每個回傳 Group：userData.animate(time, moving)、userData.height、userData.move（'walk' 或者 'fly'）
// animalModels.js 嘅 buildAnimalModel 會用呢度嘅款

import * as THREE from 'three';
import { box, ball, pivot, slab, spike, material, BLACK } from './modelKit.js';
import { seeded } from './animals20.js';

const PI = Math.PI;
const UP = new THREE.Vector3(0, 1, 0);
const glow = (c, i = 1.6) => ({ emissive: c, emissiveIntensity: i });
const ghostly = (c, o = 0.7) => ({ transparent: true, opacity: o, emissive: c, emissiveIntensity: 0.6, depthWrite: false });

const ORANGE = 0xff7a1a;
const PUMPKIN = 0xf57c00;
const PURPLE = 0x6a1b9a;
const SLIME = 0x76ff03;
const BONE = 0xece3cf;
const NIGHT = 0x1b1424;

// 發光眼（向 -z）
function glowEyes(parent, dx, y, z, size, color, { slant = 0 } = {}) {
  return [-1, 1].map((s) => {
    const e = ball(parent, size, size * 0.8, size * 0.45, color, s * dx, y, z, glow(color, 2.2));
    e.rotation.z = s * slant;
    ball(parent, size * 0.3, size * 0.3, size * 0.2, 0xffffff, s * dx + s * size * 0.25, y + size * 0.25, z - size * 0.3, glow(0xffffff, 1));
    return e;
  });
}

// 一條棍由 a 去 b
function rod(parent, a, b, w, color, round = 0.45, extra) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = box(parent, w, d.length() + w * 0.6, w, color, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, round, extra);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

// 一串越嚟越幼嘅波波（尾、藤、角）
function beads(parent, pts, r0, r1, color, n = 12, extra) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = curve.getPoint(t);
    const r = r0 + (r1 - r0) * t;
    out.push(ball(parent, r, r, r, color, p.x, p.y, p.z, extra));
  }
  return out;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// 火焰（3 層錐）
function flame(parent, x, y, z, s = 1, colors = [0xffeb3b, 0xff9100, 0xff3d00]) {
  const f = pivot(parent, x, y, z);
  colors.forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry((0.09 + i * 0.04) * s, (0.22 + i * 0.1) * s, 8), material(c, { ...glow(c, 2.4 - i * 0.5), transparent: true, opacity: 0.9 - i * 0.15 }));
    m.position.y = (0.11 + i * 0.05) * s;
    f.add(m);
  });
  return f;
}

// 四隻腳
function legs4(root, { x, zf, zb, h, w, color, paw = color }) {
  return [[-x, zf, 0], [x, zf, PI], [-x, zb, PI], [x, zb, 0]].map(([lx, lz, phase]) => {
    const hip = pivot(root, lx, h, lz);
    box(hip, w, h * 0.85, w, color, 0, -h * 0.45, 0, 0.45);
    box(hip, w * 1.12, h * 0.16, w * 1.25, paw, 0, -h + h * 0.08, -w * 0.1, 0.45);
    return { hip, phase };
  });
}

// 兩隻腳 + 兩隻手（企喺度嗰啲）
function biped(root, { hipY, legX, legH, legW, legColor, foot = legColor, armY, armX, armH, armW, armColor, hand = armColor }) {
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * legX, hipY, 0);
    box(hip, legW, legH, legW * 1.05, legColor, 0, -legH / 2, 0, 0.4);
    box(hip, legW * 1.15, legH * 0.18, legW * 1.4, foot, 0, -legH + legH * 0.09, -legW * 0.15, 0.4);
    return hip;
  });
  const arms = [-1, 1].map((s) => {
    const sh = pivot(root, s * armX, armY, 0);
    box(sh, armW, armH, armW, armColor, 0, -armH / 2, 0, 0.4);
    ball(sh, armW * 0.62, armW * 0.62, armW * 0.62, hand, 0, -armH, 0);
    return sh;
  });
  return { legs, arms };
}

function walkAnim(g, root, legs, { speed = 9, swing = 0.5, bob = 0.04, extra } = {}) {
  g.userData.animate = (t, moving) => {
    for (const l of legs) l.hip.rotation.x = Math.sin(t * speed + l.phase) * swing * moving;
    root.position.y = Math.abs(Math.sin(t * speed)) * bob * moving;
    extra?.(t, moving);
  };
  g.userData.move = 'walk';
}

function bipedAnim(g, root, { legs, arms }, { speed = 7, swing = 0.6, bob = 0.05, extra } = {}) {
  g.userData.animate = (t, moving) => {
    const s = Math.sin(t * speed) * swing * moving;
    legs[0].rotation.x = s;
    legs[1].rotation.x = -s;
    arms[0].rotation.x = -s * 0.8 + Math.sin(t * 1.4) * 0.04 * (1 - moving);
    arms[1].rotation.x = s * 0.8 - Math.sin(t * 1.4) * 0.04 * (1 - moving);
    root.position.y = Math.abs(Math.sin(t * speed)) * bob * moving;
    extra?.(t, moving);
  };
  g.userData.move = 'walk';
}

// 浮喺半空（鬼魂、南瓜）：上下飄 + 少少擺
function floatAnim(g, root, { height = 0.35, extra } = {}) {
  g.userData.animate = (t, moving) => {
    root.position.y = height + Math.sin(t * 2) * 0.08;
    root.rotation.z = Math.sin(t * 1.3) * 0.06;
    root.rotation.x = moving * 0.18;
    extra?.(t, moving);
  };
  g.userData.move = 'walk';
}

// 跳跳（蛤、小丑、南瓜）
function hopAnim(g, root, { speed = 6, height = 0.25, extra } = {}) {
  g.userData.animate = (t, moving) => {
    const h = Math.abs(Math.sin(t * speed));
    const idle = 1 - moving;
    root.position.y = h * height * (moving + idle * 0.25);
    const squash = 1 - (1 - h) * 0.12 * (moving + idle * 0.4);
    root.scale.set(2 - squash, squash, 2 - squash);
    extra?.(t, moving);
  };
  g.userData.move = 'walk';
}

// 南瓜（一瓣瓣）
function pumpkinBall(parent, r, color, x, y, z, { ribs = 8, stem = 0x4e7d2b, flat = 0.82, extra } = {}) {
  const p = pivot(parent, x, y, z);
  for (let i = 0; i < ribs; i++) {
    const a = (i / ribs) * PI * 2;
    ball(p, r * 0.46, r * flat, r * 0.62, color, Math.cos(a) * r * 0.55, 0, Math.sin(a) * r * 0.55, extra).rotation.y = -a;
  }
  ball(p, r * 0.9, r * flat * 0.98, r * 0.9, color, 0, 0, 0, extra);
  rod(p, V(0, r * flat * 0.8, 0), V(0.05 * r, r * flat * 1.25, 0.04 * r), r * 0.16, stem, 0.4);
  return p;
}

// 南瓜刻面（三角眼 + 鋸齒口），發光
function carvedFace(parent, r, y, z, color = 0xffd54f, { eyes = true } = {}) {
  const tri = [[-0.5, -0.4], [0.5, -0.4], [0, 0.5]];
  const g = { ...glow(color, 2.6) };
  if (eyes) for (const s of [-1, 1]) {
    const e = slab(parent, tri.map(([a, b]) => [a * r * 0.32, b * r * 0.3]), 0.04, color, { x: s * r * 0.36, y: y + r * 0.2, z, smooth: false, key: `hw-tri-${r.toFixed(2)}`, extra: g, bevel: 0.01 });
    e.rotation.z = s * 0.2;
  }
  const mouth = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    mouth.push([(t - 0.5) * r * 1.1, (i % 2 ? 0.06 : -0.06) * r - Math.sin(t * PI) * r * 0.12]);
  }
  for (let i = n; i >= 0; i--) mouth.push([mouth[i][0], mouth[i][1] - r * 0.16 - Math.sin((i / n) * PI) * r * 0.05]);
  slab(parent, mouth, 0.04, color, { y: y - r * 0.28, z, smooth: false, key: `hw-mouth-${r.toFixed(2)}`, extra: g, bevel: 0.01 });
}

// 巫師帽
function witchHat(parent, r, color, band, x, y, z) {
  const h = pivot(parent, x, y, z);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.25, r * 0.08, 20), material(color));
  h.add(brim);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 0.62, r * 1.5, 12), material(color));
  cone.position.set(0, r * 0.75, 0.06 * r);
  cone.rotation.x = 0.18;
  h.add(cone);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.63, r * 0.16, 16), material(band, glow(band, 0.8)));
  b.position.y = r * 0.1;
  h.add(b);
  return h;
}

// 17 隻寵物嘅模型：2026-10-19 全部重新整（小朋友話舊款好醜），而家喺 halloweenPetModels.js
export { HALLOWEEN_MODELS } from './halloweenPetModels.js';


// ======================== 🥚 Halloween 蛋 ========================
// 每隻寵物一款蛋（跟住寵物個樣）；稀有度光環；userData.animate(t) 會輕輕搖 + 閃
// 之後蛋墓園／孵蛋用：buildHalloweenEgg(name)

const RARITY_GLOW = { Common: 0xcfd8dc, Rare: 0x42a5f5, Epic: 0xce93d8, Legendary: 0xffca28, Mythic: 0xff4081, Eternal: 0x18ffff };

const EGG_STYLE = {
  Whiskers: { base: 0x241c2e, accent: SLIME, pattern: 'spots', top: 'ears' },
  Jesterpop: { base: PURPLE, accent: ORANGE, pattern: 'diamonds', top: 'bells' },
  Candlefang: { base: 0x37323e, accent: 0xffab00, pattern: 'drips', top: 'candle' },
  'Spirit Knight': { base: 0x8e99a6, accent: 0x40c4ff, pattern: 'bands', top: 'plume', metal: true },
  'Graveyard Brute': { base: 0x7d8085, accent: 0x558b2f, pattern: 'cracks', top: 'moss' },
  'Ghost Reaper': { base: 0x1e2a24, accent: 0x00e676, pattern: 'wisps', top: 'hood' },
  'Hooded Gerbil': { base: 0xd7a46b, accent: PURPLE, pattern: 'band', top: 'hood' },
  Toadstool: { base: 0x8e24aa, accent: 0x84ffff, pattern: 'spots', top: 'cap' },
  'Patchwork Imp': { base: 0xa1887f, accent: 0xfafafa, pattern: 'stitch', top: 'horns' },
  'Haunted Scorpio': { base: 0x2e7d5b, accent: 0x69f0ae, pattern: 'bands', top: 'sting', ghost: true },
  BloodBloom: { base: 0x880e4f, accent: 0xff1744, pattern: 'petals', top: 'rose' },
  'Mimic Chest': { base: 0x6d4c41, accent: 0xc9a227, pattern: 'chest', top: 'teeth' },
  Crowshade: { base: 0x15121c, accent: 0xd500f9, pattern: 'feathers', top: 'feathers' },
  'Hexed Pumpkin': { base: PUMPKIN, accent: SLIME, pattern: 'pumpkin', top: 'hat' },
  Werewolf: { base: 0x6d6464, accent: 0xffc400, pattern: 'claws', top: 'ears' },
  'Abomination Kong': { base: 0x4a4258, accent: 0xd500f9, pattern: 'stitch', top: 'bolts' },
  'Voidseer Pumpkin': { base: 0x2a0f4a, accent: 0x00e5ff, pattern: 'stars', top: 'halo' },
};

export function buildHalloweenEgg(name, rarity) {
  const st = EGG_STYLE[name] || { base: PUMPKIN, accent: PURPLE, pattern: 'spots', top: null };
  const g = new THREE.Group();
  const egg = pivot(g, 0, 0.62, 0);
  const R = 0.42;
  const H = 0.6;
  const extra = st.metal ? { metalness: 0.7, roughness: 0.3 } : st.ghost ? ghostly(st.accent, 0.8) : {};
  ball(egg, R, H, R, st.base, 0, 0, 0, extra);
  const acc = (x, y, z, sx, sy, sz, c = st.accent, e = glow(c, 1.4)) => ball(egg, sx, sy, sz, c, x, y, z, e);
  // 喺蛋表面嘅點（a = 角度，h = -1..1 高度）
  const at = (a, h, push = 1) => {
    const k = Math.sqrt(Math.max(0, 1 - h * h));
    return [Math.sin(a) * R * k * push, h * H * push, -Math.cos(a) * R * k * push];
  };
  const r = seeded(name.length * 37 + 5);
  const p = st.pattern;
  if (p === 'spots' || p === 'stars') {
    const n = p === 'stars' ? 22 : 9;
    for (let i = 0; i < n; i++) {
      const [x, y, z] = at(r() * PI * 2, (r() * 2 - 1) * 0.85, 1.0);
      const s = p === 'stars' ? 0.02 : 0.05 + r() * 0.04;
      acc(x, y, z, s, s, s, p === 'stars' ? (i % 3 ? 0xffffff : st.accent) : st.accent, glow(p === 'stars' ? 0xffffff : st.accent, p === 'stars' ? 3 : 1.6));
    }
  }
  if (p === 'bands' || p === 'band') {
    for (const h of p === 'band' ? [0.05] : [-0.35, 0.05, 0.42]) {
      const k = Math.sqrt(1 - h * h);
      const t = new THREE.Mesh(new THREE.TorusGeometry(R * k * 1.01, 0.025, 6, 32), material(st.accent, glow(st.accent, 1.6)));
      t.rotation.x = PI / 2;
      t.position.y = h * H;
      egg.add(t);
    }
  }
  if (p === 'diamonds') for (let i = 0; i < 10; i++) {
    const [x, y, z] = at((i / 10) * PI * 2, i % 2 ? 0.25 : -0.2, 1.0);
    const m = box(egg, 0.1, 0.1, 0.02, i % 2 ? st.accent : SLIME, x, y, z, 0.1);
    m.lookAt(x * 3, y * 3, z * 3);
    m.rotateZ(PI / 4);
  }
  if (p === 'drips' || p === 'wisps') for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2;
    const [x, y, z] = at(a, 0.55, 1.0);
    const len = 0.1 + r() * 0.15;
    acc(x, y - len, z, 0.035, len, 0.035);
  }
  if (p === 'cracks') for (let i = 0; i < 6; i++) {
    const [x, y, z] = at(r() * PI * 2, (r() * 2 - 1) * 0.6, 1.0);
    const m = box(egg, 0.02, 0.18, 0.02, 0x2b2d30, x, y, z, 0.3);
    m.rotation.z = r() - 0.5;
    if (i % 2) acc(x, y + 0.12, z, 0.05, 0.025, 0.04, st.accent, {});
  }
  if (p === 'stitch') for (const a of [0, PI * 0.66, PI * 1.33]) for (let i = 0; i < 6; i++) {
    const h = -0.6 + i * 0.24;
    const [x, y, z] = at(a, h, 1.0);
    const m = box(egg, 0.07, 0.015, 0.015, st.accent, x, y, z, 0.3, glow(st.accent, name === 'Abomination Kong' ? 2.2 : 0.3));
    m.lookAt(x * 3, y * 3, z * 3);
  }
  if (p === 'petals') for (let i = 0; i < 8; i++) {
    const [x, y, z] = at((i / 8) * PI * 2, -0.45, 1.0);
    const m = ball(egg, 0.12, 0.2, 0.04, 0xc2185b, x, y, z);
    m.lookAt(x * 3, y * 3, z * 3);
  }
  if (p === 'chest') {
    for (const x of [-0.18, 0.18]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(R * 1.0, 0.03, 6, 32), material(st.accent, { metalness: 0.8, roughness: 0.3 }));
      t.position.x = x;
      t.rotation.y = PI / 2;
      t.scale.set(1, H / R, 1);
      egg.add(t);
    }
    box(egg, 0.12, 0.14, 0.05, 0xffd54f, 0, 0.05, -R * 1.0, 0.3, { metalness: 0.8, roughness: 0.3 });
    glowEyes(egg, 0.12, 0.25, -R * 0.92, 0.04, 0xffd600);
  }
  if (p === 'pumpkin') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      const m = ball(egg, R * 0.42, H * 0.99, R * 0.7, i % 2 ? 0xef6c00 : PUMPKIN, Math.sin(a) * R * 0.3, 0, -Math.cos(a) * R * 0.3);
      m.rotation.y = -a;
    }
    carvedFace(egg, 0.36, 0.05, -R * 1.02, st.accent);
  }
  if (p === 'feathers') for (let i = 0; i < 9; i++) {
    const [x, y, z] = at(r() * PI * 2, (r() * 2 - 1) * 0.7, 1.0);
    const m = spike(egg, 0.04, 0.16, 0x2b2733, x, y, z, 0, 0);
    m.lookAt(x * 3, y * 3, z * 3);
    if (i < 3) acc(x, y, z, 0.025, 0.025, 0.025);
  }
  if (p === 'claws') for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const [x, y, z] = at(s * 0.6 + (i - 1) * 0.15, 0.1, 1.0);
    box(egg, 0.03, 0.28, 0.02, 0x2b2626, x, y, z, 0.3).rotation.z = s * 0.3;
  }
  // 頂上嘅裝飾
  const top = pivot(egg, 0, H * 0.97, 0);
  const tp = st.top;
  if (tp === 'ears') for (const s of [-1, 1]) spike(top, 0.09, 0.22, st.base, s * 0.15, 0.02, 0, 0, s * -0.55);
  if (tp === 'bells') for (const s of [-1, 1]) {
    beads(top, [V(0, 0, 0), V(s * 0.15, 0.12, 0), V(s * 0.25, 0.04, 0)], 0.06, 0.04, s < 0 ? ORANGE : SLIME, 6);
    ball(top, 0.045, 0.045, 0.045, 0xffd600, s * 0.27, 0.0, 0, { metalness: 0.7, roughness: 0.3 });
  }
  if (tp === 'candle') {
    box(top, 0.08, 0.16, 0.08, 0xfff8e1, 0, 0.05, 0, 0.3);
    flame(top, 0, 0.13, 0, 0.7);
  }
  if (tp === 'plume') spike(top, 0.05, 0.22, 0xd32f2f, 0, 0.05, 0.05, -0.4, 0);
  if (tp === 'moss') for (let i = 0; i < 5; i++) ball(top, 0.08, 0.04, 0.07, st.accent, (i - 2) * 0.06, -0.02, (i % 2) * 0.04);
  if (tp === 'hood') spike(top, 0.14, 0.24, st.top === 'hood' && name === 'Hooded Gerbil' ? PURPLE : st.base, 0, 0.0, 0.06, -0.5, 0);
  if (tp === 'cap') {
    ball(top, 0.3, 0.12, 0.3, 0x8e24aa, 0, 0.02, 0);
    for (let i = 0; i < 4; i++) ball(top, 0.04, 0.02, 0.04, st.accent, Math.cos(i * 1.6) * 0.15, 0.1, Math.sin(i * 1.6) * 0.15, glow(st.accent, 2));
  }
  if (tp === 'horns') for (const s of [-1, 1]) spike(top, 0.05, 0.2, 0x5d4037, s * 0.12, 0.04, 0, 0, s * -0.5);
  if (tp === 'sting') {
    beads(top, [V(0, 0, 0.05), V(0, 0.15, 0.1), V(0, 0.22, -0.02)], 0.05, 0.035, st.base, 6, ghostly(st.accent, 0.8));
    spike(top, 0.04, 0.1, st.accent, 0, 0.22, -0.08, PI * 0.7, 0).material = material(st.accent, glow(st.accent, 2.5));
  }
  if (tp === 'rose') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      ball(top, 0.08, 0.1, 0.04, 0xe91e63, Math.cos(a) * 0.06, 0.04, Math.sin(a) * 0.06).rotation.y = -a;
    }
    ball(top, 0.05, 0.05, 0.05, 0xff1744, 0, 0.08, 0, glow(0xff1744, 2.4));
  }
  if (tp === 'teeth') for (let i = 0; i < 5; i++) spike(top, 0.03, 0.08, 0xfff8e1, -0.12 + i * 0.06, -0.12, -0.22, 0, 0);
  if (tp === 'hat') {
    const h = witchHat(top, 0.2, 0x311b92, SLIME, 0, 0, 0);
    h.rotation.z = -0.15;
  }
  if (tp === 'bolts') for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8), material(0x9e9e9e, { metalness: 0.8, roughness: 0.3 }));
    b.rotation.z = PI / 2;
    b.position.set(s * 0.42, -0.4, 0);
    top.add(b);
  }
  let halo = null;
  if (tp === 'halo') {
    halo = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 28), material(0xffd740, glow(0xffd740, 2.4)));
    halo.rotation.x = PI / 2;
    halo.position.y = 0.2;
    top.add(halo);
  }
  // 稀有度光環（地上一圈 + Legendary 以上有光暈）
  const rc = RARITY_GLOW[rarity] ?? 0xcfd8dc;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.5, 32), new THREE.MeshBasicMaterial({ color: rc, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -PI / 2;
  ring.position.y = 0.02;
  g.add(ring);
  let aura = null;
  if (['Legendary', 'Mythic', 'Eternal'].includes(rarity)) {
    aura = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: rc, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
    aura.scale.set(R * 1.35, H * 1.3, R * 1.35);
    egg.add(aura);
  }
  g.userData.animate = (t) => {
    const w = Math.max(0, Math.sin(t * 1.8)) ** 4; // 間唔中搖兩搖（就嚟孵）
    egg.rotation.z = Math.sin(t * 14) * 0.12 * w;
    egg.position.y = 0.62 + Math.sin(t * 2) * 0.015;
    ring.material.opacity = 0.45 + Math.sin(t * 3) * 0.25;
    if (aura) aura.material.opacity = 0.12 + Math.sin(t * 2.5) * 0.06;
    if (halo) halo.rotation.z = t;
  };
  g.userData.height = 1.35;
  g.userData.move = 'walk';
  return g;
}
