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

// =============== 🎃 Pumpkin Graveyard ===============

// Whiskers：黑貓 + 南瓜頸圈 + 綠色發光眼 + 彎尾
function whiskers() {
  const g = new THREE.Group();
  const root = pivot(g);
  const fur = 0x241c2e;
  ball(root, 0.3, 0.26, 0.42, fur, 0, 0.42, 0.05);
  const head = pivot(root, 0, 0.62, -0.38);
  ball(head, 0.27, 0.24, 0.24, fur, 0, 0, 0);
  ball(head, 0.13, 0.08, 0.08, 0x3a2f45, 0, -0.08, -0.2);
  ball(head, 0.035, 0.03, 0.03, 0xf48fb1, 0, -0.04, -0.27);
  for (const s of [-1, 1]) {
    spike(head, 0.1, 0.22, fur, s * 0.16, 0.24, 0.02, 0, s * -0.3);
    spike(head, 0.05, 0.12, 0xf48fb1, s * 0.16, 0.22, -0.04, 0, s * -0.3);
    for (const k of [-1, 1]) rod(head, V(s * 0.1, -0.08 + k * 0.02, -0.22), V(s * 0.34, -0.06 + k * 0.05, -0.2), 0.012, 0xdddddd);
  }
  glowEyes(head, 0.11, 0.04, -0.2, 0.075, SLIME, { slant: 0.3 });
  // 南瓜頸圈
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 20), material(PURPLE));
  collar.position.set(0, 0.5, -0.3);
  collar.rotation.x = PI / 2 - 0.4;
  root.add(collar);
  pumpkinBall(root, 0.08, PUMPKIN, 0, 0.38, -0.42, { ribs: 6 });
  const legs = legs4(root, { x: 0.15, zf: -0.2, zb: 0.3, h: 0.3, w: 0.1, color: fur });
  const tail = pivot(root, 0, 0.5, 0.42);
  beads(tail, [V(0, 0, 0), V(0, 0.2, 0.15), V(0, 0.45, 0.12), V(0.08, 0.55, -0.02)], 0.06, 0.04, fur, 10);
  walkAnim(g, root, legs, {
    speed: 10,
    swing: 0.55,
    extra: (t, m) => {
      tail.rotation.z = Math.sin(t * 2.5) * 0.25;
      head.rotation.y = Math.sin(t * 0.8) * 0.3 * (1 - m);
    },
  });
  g.userData.height = 0.95;
  return g;
}

// Jesterpop：彈彈小丑波波 + 兩角小丑帽（有鈴）+ 大笑口
function jesterpop() {
  const g = new THREE.Group();
  const root = pivot(g);
  const body = pivot(root, 0, 0.45, 0);
  // 菱形花紋身
  ball(body, 0.36, 0.36, 0.34, PURPLE, 0, 0, 0);
  const r = seeded(31);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    const d = new THREE.Vector3(Math.cos(a) * 0.9, (r() - 0.5) * 0.6, Math.sin(a) * 0.9).normalize();
    const m = box(body, 0.13, 0.13, 0.03, i % 2 ? ORANGE : SLIME, d.x * 0.35, d.y * 0.35, d.z * 0.33, 0.1);
    m.lookAt(d.x * 2, d.y * 2, d.z * 2);
    m.rotateZ(PI / 4);
  }
  // 大面
  const face = pivot(body, 0, 0.05, -0.3);
  ball(face, 0.22, 0.2, 0.1, 0xfff3e0, 0, 0, 0);
  glowEyes(face, 0.08, 0.06, -0.08, 0.05, 0xff4081);
  slab(face, [[-0.12, 0], [0.12, 0], [0.09, -0.07], [0, -0.1], [-0.09, -0.07]], 0.03, 0xc62828, { y: -0.06, z: -0.09, key: 'hw-jest-mouth' });
  ball(face, 0.04, 0.04, 0.04, 0xff1744, 0, 0.0, -0.11);
  // 小丑帽（兩條彎角 + 鈴）
  const hat = pivot(body, 0, 0.3, 0);
  ball(hat, 0.3, 0.12, 0.28, ORANGE, 0, 0, 0);
  const bells = [];
  for (const s of [-1, 1]) {
    const c = s < 0 ? ORANGE : PURPLE;
    beads(hat, [V(s * 0.05, 0.05, 0), V(s * 0.25, 0.25, 0), V(s * 0.45, 0.22, 0), V(s * 0.55, 0.05, 0)], 0.11, 0.05, c, 10);
    bells.push(ball(hat, 0.07, 0.07, 0.07, 0xffd600, s * 0.57, -0.02, 0, { metalness: 0.7, roughness: 0.25, ...glow(0xffd600, 0.4) }));
  }
  // 細腳
  for (const s of [-1, 1]) {
    box(root, 0.1, 0.16, 0.1, s < 0 ? ORANGE : PURPLE, s * 0.14, 0.08, 0, 0.4);
    ball(root, 0.09, 0.06, 0.13, 0x212121, s * 0.14, 0.02, -0.04);
  }
  hopAnim(g, root, {
    speed: 6,
    height: 0.3,
    extra: (t) => {
      bells.forEach((b, i) => (b.position.y = -0.02 + Math.sin(t * 12 + i) * 0.02));
      hat.rotation.z = Math.sin(t * 6) * 0.08;
    },
  });
  g.userData.height = 1.25;
  return g;
}

// Candlefang：蝙蝠狼 + 頭頂蠟燭（火）+ 細翼 + 小獠牙
function candlefang() {
  const g = new THREE.Group();
  const root = pivot(g);
  const fur = 0x37323e;
  ball(root, 0.34, 0.3, 0.5, fur, 0, 0.55, 0.05);
  ball(root, 0.28, 0.2, 0.36, 0x5d5466, 0, 0.42, -0.02);
  const head = pivot(root, 0, 0.82, -0.45);
  ball(head, 0.26, 0.24, 0.26, fur, 0, 0, 0);
  ball(head, 0.13, 0.1, 0.16, 0x4a4352, 0, -0.07, -0.22);
  ball(head, 0.05, 0.04, 0.04, BLACK, 0, -0.04, -0.36);
  for (const s of [-1, 1]) {
    spike(head, 0.11, 0.3, fur, s * 0.17, 0.26, 0.04, 0.1, s * -0.35);
    spike(head, 0.022, 0.08, 0xffffff, s * 0.05, -0.15, -0.3, PI, 0);
  }
  glowEyes(head, 0.1, 0.05, -0.22, 0.06, 0xffab00);
  // 蠟燭
  box(head, 0.11, 0.24, 0.11, 0xfff8e1, 0, 0.32, 0.02, 0.3);
  ball(head, 0.08, 0.04, 0.08, 0xfff8e1, 0.04, 0.2, -0.05);
  const fl = flame(head, 0, 0.44, 0.02, 1.0);
  // 蝙蝠翼
  const wing = [[0, 0], [0.25, 0.18], [0.5, 0.22], [0.62, 0.05], [0.5, 0.0], [0.42, -0.1], [0.3, -0.02], [0.18, -0.12], [0.06, -0.04]];
  const wings = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.26, 0.78, 0);
    const w = slab(p, wing, 0.03, 0x4a148c, { plane: 'front', key: 'hw-batwing', smooth: false, bevel: 0.01 });
    w.rotation.y = s < 0 ? PI : 0;
    w.rotation.x = -0.4;
    return { p, s };
  });
  const legs = legs4(root, { x: 0.18, zf: -0.25, zb: 0.32, h: 0.38, w: 0.13, color: fur, paw: 0x2a2530 });
  const tail = pivot(root, 0, 0.6, 0.5);
  beads(tail, [V(0, 0, 0), V(0, 0.08, 0.22), V(0, 0.2, 0.36)], 0.08, 0.05, fur, 7);
  walkAnim(g, root, legs, {
    speed: 9,
    extra: (t, m) => {
      wings.forEach(({ p, s }) => (p.rotation.z = s * (0.2 + Math.sin(t * 7) * 0.35)));
      fl.scale.set(1, 1 + Math.sin(t * 15) * 0.15, 1);
      tail.rotation.y = Math.sin(t * 5) * 0.4;
      head.rotation.y = Math.sin(t * 0.9) * 0.25 * (1 - m);
    },
  });
  g.userData.height = 1.55;
  return g;
}

// Spirit Knight：空心盔甲 + 入面一個發光藍色靈魂（頭盔縫發光）+ 盾 + 劍
function spiritKnight() {
  const g = new THREE.Group();
  const root = pivot(g);
  const steel = 0x8e99a6;
  const metal = { metalness: 0.75, roughness: 0.3 };
  const soul = 0x40c4ff;
  box(root, 0.56, 0.6, 0.36, steel, 0, 1.0, 0, 0.25, metal);
  box(root, 0.62, 0.14, 0.4, 0x5d6a78, 0, 0.72, 0, 0.3, metal);
  ball(root, 0.16, 0.16, 0.05, soul, 0, 1.05, -0.19, glow(soul, 2.2)); // 胸口靈魂
  for (const s of [-1, 1]) ball(root, 0.16, 0.12, 0.16, 0x6b7785, s * 0.36, 1.27, 0, metal);
  const head = pivot(root, 0, 1.48, 0);
  box(head, 0.36, 0.38, 0.38, steel, 0, 0, 0, 0.35, metal);
  box(head, 0.26, 0.05, 0.03, soul, 0, 0.03, -0.2, 0.3, glow(soul, 2.6));
  box(head, 0.04, 0.16, 0.03, soul, 0, -0.06, -0.2, 0.3, glow(soul, 2.2));
  spike(head, 0.06, 0.3, 0xd32f2f, 0, 0.32, 0.05, -0.3, 0); // 頭盔羽毛
  // 飄出嚟嘅靈魂煙
  const wisps = [];
  for (let i = 0; i < 4; i++) wisps.push(ball(head, 0.05, 0.05, 0.05, soul, (i - 1.5) * 0.08, 0.22, 0.05, ghostly(soul, 0.6)));
  const parts = biped(root, { hipY: 0.7, legX: 0.15, legH: 0.68, legW: 0.18, legColor: steel, foot: 0x5d6a78, armY: 1.24, armX: 0.38, armH: 0.5, armW: 0.15, armColor: steel, hand: 0x5d6a78 });
  // 盾 + 劍
  const shield = slab(parts.arms[0], [[-0.18, 0.2], [0.18, 0.2], [0.18, -0.05], [0, -0.26], [-0.18, -0.05]], 0.05, 0x1565c0, { x: -0.06, y: -0.4, z: -0.12, smooth: false, key: 'hw-shield', extra: metal });
  shield.rotation.y = PI / 2 - 0.3;
  box(parts.arms[0], 0.04, 0.3, 0.03, soul, -0.09, -0.4, -0.12, 0.2, glow(soul, 1.6)).rotation.y = PI / 2 - 0.3;
  const sword = pivot(parts.arms[1], 0, -0.5, 0);
  box(sword, 0.05, 0.75, 0.02, 0xdde6ee, 0, 0.0, -0.4, 0.2, { ...metal, ...glow(0x80d8ff, 0.4) }).rotation.x = -PI / 2;
  box(sword, 0.22, 0.04, 0.05, 0xffc107, 0, 0, -0.05, 0.3, metal);
  bipedAnim(g, root, parts, {
    speed: 6,
    swing: 0.5,
    extra: (t) => wisps.forEach((w, i) => {
      const k = (t * 0.6 + i * 0.25) % 1;
      w.position.y = 0.2 + k * 0.4;
      w.scale.setScalar(0.05 * (1 - k) + 0.02);
    }),
  });
  g.userData.height = 1.9;
  return g;
}

// Graveyard Brute：墓碑石巨人（身係一塊塊墓碑、有青苔、綠色發光眼）
function graveyardBrute() {
  const g = new THREE.Group();
  const root = pivot(g);
  const stone = 0x7d8085;
  const dark = 0x5a5d62;
  const moss = 0x558b2f;
  const tomb = (p, w, h, x, y, z, c = stone, ry = 0) => {
    const t = pivot(p, x, y, z);
    t.rotation.y = ry;
    box(t, w, h, w * 0.4, c, 0, 0, 0, 0.12);
    ball(t, w * 0.5, w * 0.32, w * 0.2, c, 0, h / 2, 0);
    box(t, w * 0.12, h * 0.4, 0.02, 0x3d4045, 0, h * 0.08, -w * 0.21, 0.2); // 十字
    box(t, w * 0.36, w * 0.1, 0.02, 0x3d4045, 0, h * 0.16, -w * 0.21, 0.2);
    return t;
  };
  // 身：大墓碑 + 側面細墓碑
  tomb(root, 0.9, 0.85, 0, 1.25, 0);
  tomb(root, 0.5, 0.45, -0.42, 1.45, 0.12, dark, 0.4);
  tomb(root, 0.5, 0.45, 0.42, 1.45, 0.12, dark, -0.4);
  ball(root, 0.55, 0.3, 0.38, dark, 0, 0.82, 0);
  for (let i = 0; i < 7; i++) ball(root, 0.12, 0.07, 0.1, moss, -0.4 + i * 0.13, 1.66 + Math.sin(i) * 0.04, 0.05);
  const head = pivot(root, 0, 1.85, -0.05);
  box(head, 0.5, 0.36, 0.42, stone, 0, 0.0, 0, 0.25);
  box(head, 0.56, 0.1, 0.46, dark, 0, 0.2, 0, 0.3); // 眉骨
  glowEyes(head, 0.13, 0.02, -0.22, 0.07, SLIME);
  box(head, 0.28, 0.06, 0.03, 0x2b2d30, 0, -0.1, -0.22, 0.3);
  ball(head, 0.14, 0.06, 0.12, moss, 0.12, 0.25, 0);
  const parts = biped(root, { hipY: 0.72, legX: 0.25, legH: 0.7, legW: 0.3, legColor: dark, foot: stone, armY: 1.55, armX: 0.66, armH: 0.95, armW: 0.3, armColor: stone, hand: dark });
  for (const a of parts.arms) ball(a, 0.26, 0.22, 0.26, moss, 0, -0.1, 0);
  bipedAnim(g, root, parts, { speed: 4.5, swing: 0.35, bob: 0.06, extra: (t, m) => (head.rotation.y = Math.sin(t * 0.6) * 0.2 * (1 - m)) });
  g.userData.height = 2.4;
  return g;
}

// Ghost Reaper（Mythic）：浮喺度嘅連帽斗篷 + 黑洞面 + 綠色發光鐮刀 + 靈魂波波圍住轉
function ghostReaper() {
  const g = new THREE.Group();
  const root = pivot(g);
  const robe = 0x1e2a24;
  const glowG = 0x00e676;
  // 斗篷（錐形，下面一條條碎布）
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.3, 14, 1, true), material(robe, { side: THREE.DoubleSide }));
  cloak.position.y = 0.75;
  root.add(cloak);
  const rags = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * PI * 2;
    const r = spike(root, 0.1, 0.35, robe, Math.cos(a) * 0.43, 0.06, Math.sin(a) * 0.43, PI, 0);
    rags.push(r);
  }
  box(root, 0.5, 0.08, 0.3, 0x0d4d2b, 0, 0.85, -0.05, 0.4, glow(glowG, 0.4)); // 腰帶
  // 頭罩
  const head = pivot(root, 0, 1.55, 0);
  ball(head, 0.32, 0.36, 0.32, robe, 0, 0, 0.02);
  spike(head, 0.18, 0.32, robe, 0, 0.3, 0.12, -0.6, 0);
  ball(head, 0.22, 0.24, 0.1, 0x050806, 0, -0.04, -0.24); // 黑洞面
  glowEyes(head, 0.08, 0.0, -0.31, 0.06, glowG, { slant: -0.25 });
  // 手 + 鐮刀
  const arm = pivot(root, 0.4, 1.2, -0.05);
  ball(arm, 0.12, 0.12, 0.12, robe, 0, 0, 0);
  const scythe = pivot(arm, 0.05, 0, -0.12);
  box(scythe, 0.05, 1.7, 0.05, 0x3e2723, 0, 0.15, 0, 0.4);
  slab(scythe, [[0, 0], [0.15, 0.08], [0.45, 0.02], [0.68, -0.18], [0.5, -0.06], [0.2, -0.06], [0, -0.1]], 0.03, glowG, { x: -0.02, y: 0.95, z: 0, plane: 'side', key: 'hw-scythe', extra: { ...glow(glowG, 2), metalness: 0.4 } });
  // 靈魂波波
  const orbs = [];
  for (let i = 0; i < 3; i++) orbs.push(ball(root, 0.08, 0.08, 0.08, 0x9cffd0, 0, 1, 0, glow(0x9cffd0, 2.4)));
  floatAnim(g, root, {
    height: 0.35,
    extra: (t) => {
      rags.forEach((r, i) => (r.rotation.z = Math.sin(t * 4 + i) * 0.25));
      orbs.forEach((o, i) => {
        const a = t * 1.5 + (i / 3) * PI * 2;
        o.position.set(Math.cos(a) * 0.75, 1 + Math.sin(t * 2 + i) * 0.25, Math.sin(a) * 0.75);
      });
      scythe.rotation.z = Math.sin(t * 1.2) * 0.1;
    },
  });
  g.userData.height = 2.3;
  return g;
}

// =============== 👻 Hollow Sprites ===============

// Hooded Gerbil：細細隻 + 紫色斗篷（耳仔穿出嚟）+ 抱住粒糖
function hoodedGerbil() {
  const g = new THREE.Group();
  const root = pivot(g);
  const fur = 0xd7a46b;
  ball(root, 0.24, 0.22, 0.3, fur, 0, 0.27, 0.05);
  ball(root, 0.17, 0.14, 0.2, 0xf6e3c6, 0, 0.22, -0.1);
  // 斗篷
  const cape = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.42, 12, 1, true), material(PURPLE, { side: THREE.DoubleSide }));
  cape.position.set(0, 0.3, 0.12);
  root.add(cape);
  const head = pivot(root, 0, 0.48, -0.2);
  ball(head, 0.2, 0.18, 0.18, fur, 0, 0, 0);
  ball(head, 0.25, 0.2, 0.22, PURPLE, 0, 0.06, 0.05); // 帽
  ball(head, 0.06, 0.05, 0.05, 0xf8bbd0, 0, -0.05, -0.18);
  for (const s of [-1, 1]) {
    ball(head, 0.07, 0.11, 0.03, fur, s * 0.14, 0.22, 0.02);
    ball(head, 0.045, 0.08, 0.02, 0xf8bbd0, s * 0.14, 0.22, -0.005);
    ball(head, 0.055, 0.06, 0.04, BLACK, s * 0.09, 0.02, -0.15);
    ball(head, 0.018, 0.018, 0.01, 0xffffff, s * 0.1 + 0.015, 0.04, -0.19);
  }
  // 粒糖（間條包裝）
  const candy = pivot(root, 0, 0.2, -0.33);
  ball(candy, 0.07, 0.07, 0.07, 0xff7043, 0, 0, 0, glow(0xff7043, 0.3));
  for (const s of [-1, 1]) spike(candy, 0.05, 0.08, 0xffd54f, s * 0.1, 0, 0, 0, s * PI / 2);
  const legs = legs4(root, { x: 0.12, zf: -0.12, zb: 0.18, h: 0.12, w: 0.07, color: fur });
  const tail = pivot(root, 0, 0.18, 0.32);
  beads(tail, [V(0, 0, 0), V(0, -0.05, 0.15), V(0.05, 0.0, 0.3)], 0.03, 0.02, fur, 6);
  walkAnim(g, root, legs, { speed: 14, swing: 0.6, bob: 0.03, extra: (t, m) => (head.rotation.z = Math.sin(t * 3) * 0.08 * (1 - m)) });
  g.userData.height = 0.7;
  return g;
}

// Toadstool：蛤乸 + 大大個發光菇帽
function toadstool() {
  const g = new THREE.Group();
  const root = pivot(g);
  const skin = 0x7cb342;
  ball(root, 0.36, 0.26, 0.36, skin, 0, 0.26, 0);
  ball(root, 0.3, 0.16, 0.3, 0xdce775, 0, 0.17, -0.06);
  // 眼（凸起）
  for (const s of [-1, 1]) {
    ball(root, 0.11, 0.11, 0.1, skin, s * 0.17, 0.42, -0.24);
    ball(root, 0.08, 0.08, 0.05, 0xfff59d, s * 0.17, 0.43, -0.32, glow(0xfff59d, 0.8));
    ball(root, 0.035, 0.06, 0.03, BLACK, s * 0.17, 0.43, -0.36);
    ball(root, 0.05, 0.03, 0.03, 0xf48fb1, s * 0.22, 0.27, -0.3); // 面紅紅
  }
  box(root, 0.3, 0.025, 0.02, 0x33691e, 0, 0.27, -0.355, 0.4); // 笑口
  // 菇帽（喺頭頂，唔好遮住眼）
  const cap = pivot(root, 0, 0.6, 0.08);
  ball(cap, 0.42, 0.2, 0.42, 0x8e24aa, 0, 0.08, 0);
  ball(cap, 0.36, 0.05, 0.36, 0xf3e5f5, 0, -0.03, 0);
  box(cap, 0.14, 0.14, 0.14, 0xf3e5f5, 0, -0.1, 0, 0.45); // 菇柄
  const spots = [];
  const r = seeded(17);
  for (let i = 0; i < 8; i++) {
    const a = r() * PI * 2;
    const d = 0.15 + r() * 0.2;
    spots.push(ball(cap, 0.06, 0.03, 0.06, 0x84ffff, Math.cos(a) * d, 0.24 - d * 0.35, Math.sin(a) * d, glow(0x84ffff, 2)));
  }
  // 腳
  for (const s of [-1, 1]) {
    ball(root, 0.12, 0.08, 0.16, skin, s * 0.28, 0.07, 0.15);
    ball(root, 0.08, 0.05, 0.1, skin, s * 0.2, 0.05, -0.22);
  }
  hopAnim(g, root, {
    speed: 5,
    height: 0.32,
    extra: (t) => spots.forEach((s, i) => (s.material.emissiveIntensity = 1.4 + Math.sin(t * 3 + i) * 0.8)),
  });
  g.userData.height = 0.95;
  return g;
}

// Patchwork Imp：一塊塊舊布縫埋 + 一隻鈕扣眼一隻發光眼 + 小角 + 縫線
function patchworkImp() {
  const g = new THREE.Group();
  const root = pivot(g);
  const patches = [0xa1887f, 0x7986cb, 0xe57373, 0x81c784];
  const body = pivot(root, 0, 0.55, 0);
  ball(body, 0.3, 0.32, 0.26, patches[0], 0, 0, 0);
  const r = seeded(77);
  for (let i = 0; i < 6; i++) {
    const d = new THREE.Vector3(r() - 0.5, r() - 0.5, -0.4 - r() * 0.6).normalize();
    const p = box(body, 0.16, 0.14, 0.02, patches[(i % 3) + 1], d.x * 0.29, d.y * 0.31, d.z * 0.25, 0.1);
    p.lookAt(d.x * 3, d.y * 3, d.z * 3);
  }
  for (let i = 0; i < 5; i++) box(body, 0.015, 0.06, 0.015, 0xfafafa, -0.08 + i * 0.04, 0.05, -0.26, 0.3).rotation.z = 0.6; // 縫線
  const head = pivot(root, 0, 1.0, -0.02);
  ball(head, 0.27, 0.24, 0.24, patches[1], 0, 0, 0);
  box(head, 0.14, 0.12, 0.02, patches[2], 0.1, 0.08, -0.22, 0.1);
  // 鈕扣眼 + 發光眼
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 14), material(0x212121));
  button.rotation.x = PI / 2;
  button.position.set(-0.1, 0.03, -0.23);
  head.add(button);
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ball(head, 0.012, 0.012, 0.01, 0xbdbdbd, -0.1 + dx * 0.02, 0.03 + dy * 0.02, -0.25);
  ball(head, 0.06, 0.055, 0.03, 0xffea00, 0.1, 0.04, -0.22, glow(0xffea00, 2.4));
  slab(head, [[-0.13, 0], [-0.06, -0.04], [0, 0], [0.06, -0.04], [0.13, 0], [0.06, -0.07], [-0.06, -0.07]], 0.02, 0x3e2723, { y: -0.09, z: -0.23, smooth: false, key: 'hw-imp-mouth' });
  for (const s of [-1, 1]) {
    spike(head, 0.05, 0.2, 0x5d4037, s * 0.14, 0.24, 0, 0, s * -0.4);
    ball(head, 0.06, 0.1, 0.03, patches[3], s * 0.27, 0.02, 0); // 耳
  }
  // 細翼（布做）
  const wings = [-1, 1].map((s) => {
    const p = pivot(body, s * 0.18, 0.15, 0.22);
    const w = slab(p, [[0, 0], [0.22, 0.18], [0.3, 0.02], [0.18, -0.06]], 0.02, patches[2], { plane: 'front', key: 'hw-impwing', smooth: false });
    w.rotation.y = s < 0 ? PI : 0;
    return { p, s };
  });
  const parts = biped(root, { hipY: 0.3, legX: 0.12, legH: 0.3, legW: 0.11, legColor: patches[3], foot: 0x4e342e, armY: 0.7, armX: 0.3, armH: 0.3, armW: 0.09, armColor: patches[2] });
  const tail = pivot(root, 0, 0.4, 0.22);
  beads(tail, [V(0, 0, 0), V(0, -0.05, 0.2), V(0.1, 0.1, 0.32)], 0.04, 0.025, patches[0], 7);
  spike(tail, 0.05, 0.1, 0xe53935, 0.1, 0.14, 0.33, -0.5, 0);
  bipedAnim(g, root, parts, {
    speed: 9,
    swing: 0.7,
    extra: (t, m) => {
      wings.forEach(({ p, s }) => (p.rotation.y = s * (0.3 + Math.sin(t * 10) * 0.3)));
      head.rotation.z = Math.sin(t * 2.2) * 0.1 * (1 - m);
    },
  });
  g.userData.height = 1.35;
  return g;
}

// Haunted Scorpio：半透明綠色鬼蠍 + 8 隻腳 + 兩隻鉗 + 捲起嘅發光尾針
function hauntedScorpio() {
  const g = new THREE.Group();
  const root = pivot(g);
  const ghostG = 0x69f0ae;
  const shell = ghostly(ghostG, 0.72);
  const shellMat = material(0x2e7d5b, shell);
  const segs = [];
  for (let i = 0; i < 4; i++) segs.push(ball(root, 0.32 - i * 0.03, 0.16, 0.2, 0x2e7d5b, 0, 0.32, -0.25 + i * 0.22, shellMat));
  const head = pivot(root, 0, 0.34, -0.45);
  ball(head, 0.24, 0.13, 0.18, 0x2e7d5b, 0, 0, 0, shellMat);
  glowEyes(head, 0.06, 0.08, -0.14, 0.04, 0xb9f6ca);
  glowEyes(head, 0.13, 0.05, -0.1, 0.03, 0xb9f6ca);
  // 鉗
  const claws = [-1, 1].map((s) => {
    const p = pivot(head, s * 0.2, -0.02, -0.08);
    rod(p, V(0, 0, 0), V(s * 0.18, 0.02, -0.25), 0.08, 0x2e7d5b, 0.45, shell);
    ball(p, 0.11, 0.08, 0.14, 0x2e7d5b, s * 0.2, 0.03, -0.38, shellMat);
    spike(p, 0.04, 0.16, 0xb9f6ca, s * 0.15, 0.04, -0.5, -PI / 2, 0);
    spike(p, 0.04, 0.16, 0xb9f6ca, s * 0.25, 0.04, -0.5, -PI / 2, 0);
    return p;
  });
  // 腳
  const legs = [];
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const p = pivot(root, s * 0.22, 0.3, -0.2 + i * 0.16);
    rod(p, V(0, 0, 0), V(s * 0.25, 0.08, 0), 0.05, 0x2e7d5b, 0.45, shell);
    rod(p, V(s * 0.25, 0.08, 0), V(s * 0.38, -0.3, 0), 0.045, 0x2e7d5b, 0.45, shell);
    legs.push({ hip: p, phase: i * 1.3 + (s > 0 ? PI : 0) });
  }
  // 尾（捲上嚟）
  const tail = pivot(root, 0, 0.36, 0.5);
  beads(tail, [V(0, 0, 0), V(0, 0.25, 0.18), V(0, 0.55, 0.12), V(0, 0.7, -0.12), V(0, 0.62, -0.3)], 0.1, 0.07, 0x2e7d5b, 10, shellMat);
  const sting = spike(tail, 0.07, 0.22, ghostG, 0, 0.56, -0.4, -PI * 0.75, 0);
  sting.material = material(ghostG, glow(ghostG, 2.5));
  g.userData.animate = (t, moving) => {
    for (const l of legs) l.hip.rotation.y = Math.sin(t * 12 + l.phase) * 0.35 * moving;
    claws.forEach((c, i) => (c.rotation.y = Math.sin(t * 2 + i * PI) * 0.15));
    tail.rotation.x = Math.sin(t * 1.6) * 0.12;
    root.position.y = 0.04 + Math.sin(t * 2) * 0.04;
    segs.forEach((s, i) => (s.material.opacity = 0.65 + Math.sin(t * 2 + i) * 0.08));
  };
  g.userData.move = 'walk';
  g.userData.height = 1.25;
  return g;
}

// BloodBloom（Mythic）：好大朵行路玫瑰 + 帶刺藤腳 + 發光心 + 葉
function bloodBloom() {
  const g = new THREE.Group();
  const root = pivot(g);
  const red = 0xc2185b;
  const deep = 0x880e4f;
  const vine = 0x2e5d2b;
  const bloom = pivot(root, 0, 1.45, 0);
  bloom.rotation.x = -0.35; // 朵花向前
  // 一層層花瓣
  const petals = [];
  [[7, 0.62, 0.32, deep], [6, 0.46, 0.36, red], [5, 0.3, 0.4, 0xe91e63]].forEach(([n, r, h, c], layer) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + layer * 0.4;
      const p = pivot(bloom, Math.cos(a) * r * 0.55, layer * 0.08, Math.sin(a) * r * 0.55);
      p.rotation.y = -a + PI / 2;
      const pm = ball(p, r * 0.42, h, 0.07, c, 0, h * 0.5, 0);
      pm.rotation.x = -0.35 + layer * 0.15;
      petals.push(p);
    }
  });
  const heart = ball(bloom, 0.16, 0.16, 0.16, 0xff1744, 0, 0.28, 0, glow(0xff1744, 2.6)); // 發光心
  glowEyes(bloom, 0.09, 0.32, -0.15, 0.045, 0xffeb3b);
  // 莖 + 葉 + 刺
  beads(root, [V(0, 0.45, 0.05), V(0.05, 0.9, 0.02), V(0, 1.3, 0)], 0.1, 0.08, vine, 8);
  for (const s of [-1, 1]) {
    const leaf = slab(root, [[0, 0], [0.2, 0.08], [0.42, 0], [0.2, -0.07]], 0.02, 0x43a047, { x: s * 0.06, y: 1.0, z: 0, key: 'hw-leaf' });
    leaf.rotation.y = s < 0 ? PI : 0;
    leaf.rotation.z = s * 0.4;
  }
  // 4 條藤腳
  const legs = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    const p = pivot(root, Math.cos(a) * 0.12, 0.5, Math.sin(a) * 0.12);
    beads(p, [V(0, 0, 0), V(Math.cos(a) * 0.3, -0.15, Math.sin(a) * 0.3), V(Math.cos(a) * 0.45, -0.5, Math.sin(a) * 0.45)], 0.08, 0.05, vine, 8);
    for (let k = 0; k < 3; k++) spike(p, 0.025, 0.1, 0x1b3d1a, Math.cos(a) * (0.12 + k * 0.12), -0.05 - k * 0.14, Math.sin(a) * (0.12 + k * 0.12), 0, Math.cos(a) * 1.2);
    legs.push({ hip: p, phase: i * PI / 2 });
  }
  // 浮喺周圍嘅花瓣
  const drift = [];
  for (let i = 0; i < 5; i++) drift.push(ball(root, 0.05, 0.02, 0.035, red, 0, 1, 0));
  g.userData.animate = (t, moving) => {
    for (const l of legs) l.hip.rotation.x = Math.sin(t * 6 + l.phase) * 0.35 * moving;
    root.position.y = Math.abs(Math.sin(t * 6)) * 0.05 * moving;
    bloom.rotation.z = Math.sin(t * 1.4) * 0.08;
    petals.forEach((p, i) => (p.rotation.z = Math.sin(t * 2 + i) * 0.05));
    heart.scale.setScalar(0.16 * (1 + Math.max(0, Math.sin(t * 4)) * 0.18));
    drift.forEach((d, i) => {
      const k = (t * 0.25 + i / 5) % 1;
      const a = i * 1.7 + t * 0.4;
      d.position.set(Math.cos(a) * (0.6 + k * 0.3), 1.8 - k * 1.6, Math.sin(a) * (0.6 + k * 0.3));
      d.rotation.set(t + i, t * 1.3, 0);
    });
  };
  g.userData.move = 'walk';
  g.userData.height = 2.2;
  return g;
}

// =============== 🏚️ Abandoned Manor ===============

// Mimic Chest：寶箱怪（蓋會咬 + 牙 + 條脷 + 蓋上面有眼）
function mimicChest() {
  const g = new THREE.Group();
  const root = pivot(g);
  const wood = 0x6d4c41;
  const gold = { metalness: 0.8, roughness: 0.3 };
  box(root, 0.8, 0.42, 0.55, wood, 0, 0.42, 0, 0.12);
  for (const x of [-0.3, 0, 0.3]) box(root, 0.07, 0.44, 0.57, 0xc9a227, x, 0.42, 0, 0.2, gold);
  // 下面一排牙
  for (let i = 0; i < 7; i++) spike(root, 0.04, 0.1, 0xfff8e1, -0.3 + i * 0.1, 0.67, -0.24, 0, 0);
  // 脷
  const tongue = pivot(root, 0, 0.62, -0.1);
  beads(tongue, [V(0, 0, 0), V(0, 0.02, -0.2), V(0, -0.1, -0.38), V(0, -0.22, -0.42)], 0.09, 0.07, 0xec407a, 7);
  // 蓋（由後面轉）
  const lid = pivot(root, 0, 0.63, 0.27);
  const lidBody = pivot(lid, 0, 0, -0.27);
  box(lidBody, 0.82, 0.12, 0.57, wood, 0, 0.06, 0, 0.12);
  ball(lidBody, 0.41, 0.14, 0.28, wood, 0, 0.12, 0);
  for (const x of [-0.3, 0, 0.3]) box(lidBody, 0.07, 0.2, 0.58, 0xc9a227, x, 0.12, 0, 0.2, gold);
  for (let i = 0; i < 7; i++) spike(lidBody, 0.04, 0.1, 0xfff8e1, -0.3 + i * 0.1, -0.04, -0.24, PI, 0);
  box(lidBody, 0.12, 0.14, 0.04, 0xffd54f, 0, 0.02, -0.29, 0.3, gold); // 鎖
  glowEyes(lidBody, 0.18, 0.2, -0.22, 0.06, 0xffd600);
  const legs = legs4(root, { x: 0.3, zf: -0.18, zb: 0.18, h: 0.22, w: 0.1, color: 0x4e342e });
  g.userData.animate = (t, moving) => {
    for (const l of legs) l.hip.rotation.x = Math.sin(t * 12 + l.phase) * 0.5 * moving;
    const snap = Math.max(0, Math.sin(t * 2.2)) ** 6; // 間唔中咬一下
    lid.rotation.x = 0.12 + Math.sin(t * 3) * 0.05 + snap * 0.6;
    tongue.rotation.x = -snap * 0.4 + Math.sin(t * 4) * 0.05;
    root.position.y = Math.abs(Math.sin(t * 12)) * 0.04 * moving;
  };
  g.userData.move = 'walk';
  g.userData.height = 1.0;
  return g;
}

// Crowshade：影子烏鴉 + 紫色發光眼 + 會拍翼（飛）
function crowshade() {
  const g = new THREE.Group();
  const root = pivot(g);
  const ink = 0x15121c;
  ball(root, 0.24, 0.24, 0.34, ink, 0, 0.42, 0.02);
  const head = pivot(root, 0, 0.68, -0.22);
  ball(head, 0.17, 0.16, 0.17, ink, 0, 0, 0);
  spike(head, 0.05, 0.22, 0x37343f, 0, -0.02, -0.25, -PI / 2, 0);
  glowEyes(head, 0.09, 0.04, -0.13, 0.05, 0xd500f9, { slant: 0.3 });
  for (let i = 0; i < 3; i++) spike(head, 0.03, 0.12, ink, 0, 0.15, 0.05 + i * 0.05, -0.6, 0);
  // 翼：由膊頭向外，摺埋就貼住身（rotation.z 0 = 摺埋）
  const wings = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.2, 0.55, -0.05);
    ball(p, 0.04, 0.16, 0.3, ink, s * 0.03, -0.06, 0.12);
    ball(p, 0.035, 0.12, 0.22, 0x2b2733, s * 0.05, -0.14, 0.28);
    for (let i = 0; i < 3; i++) ball(p, 0.02, 0.05, 0.1, 0x7c4dff, s * 0.06, -0.2 - i * 0.02, 0.36 + i * 0.05, glow(0x7c4dff, 1.2)); // 紫色羽尖
    return { p, s };
  });
  const tail = pivot(root, 0, 0.42, 0.32);
  slab(tail, [[-0.12, 0], [0.12, 0], [0.16, 0.3], [0, 0.24], [-0.16, 0.3]], 0.02, ink, { plane: 'flat', key: 'hw-crowtail', smooth: false });
  const feet = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.08, 0.22, 0);
    box(p, 0.04, 0.2, 0.04, 0x424242, 0, -0.1, 0, 0.4);
    return p;
  });
  // 黑煙
  const smoke = [];
  for (let i = 0; i < 5; i++) smoke.push(ball(root, 0.07, 0.07, 0.07, 0x4a148c, 0, 0.4, 0.3, ghostly(0x4a148c, 0.4)));
  g.userData.animate = (t, moving) => {
    const flying = g.userData.flying;
    const flap = flying ? Math.sin(t * 12) * 0.9 : Math.max(0, Math.sin(t * 1.3)) > 0.85 ? Math.sin(t * 25) * 0.7 : 0.05;
    wings.forEach(({ p, s }) => (p.rotation.z = -s * (flying ? 1.1 + flap : Math.abs(flap))));
    root.rotation.x = flying ? 0.3 : 0;
    feet.forEach((f, i) => (f.rotation.x = flying ? 0.9 : Math.sin(t * 12 + i * PI) * 0.6 * moving));
    head.rotation.y = Math.sin(t * 1.7) * 0.4 * (1 - moving);
    smoke.forEach((m, i) => {
      const k = (t * 0.7 + i / 5) % 1;
      m.position.set(Math.sin(i * 2) * 0.1, 0.4 + k * 0.15, 0.3 + k * 0.4);
      m.scale.setScalar(0.07 * (1 - k) + 0.01);
    });
  };
  g.userData.move = 'fly';
  g.userData.height = 0.9;
  return g;
}

// Hexed Pumpkin：魔法南瓜 + 巫師帽 + 綠火刻面 + 藤手 + 綠色火焰（會浮）
function hexedPumpkin() {
  const g = new THREE.Group();
  const root = pivot(g);
  const body = pumpkinBall(root, 0.5, PUMPKIN, 0, 0.45, 0, { ribs: 9 });
  carvedFace(body, 0.5, 0.0, -0.47, SLIME);
  const hat = witchHat(body, 0.32, 0x311b92, SLIME, 0.05, 0.38, 0.02);
  hat.rotation.z = -0.15;
  // 藤手
  const arms = [-1, 1].map((s) => {
    const p = pivot(body, s * 0.45, -0.05, 0);
    beads(p, [V(0, 0, 0), V(s * 0.2, -0.05, -0.05), V(s * 0.3, -0.2, -0.1), V(s * 0.22, -0.3, -0.16)], 0.05, 0.03, 0x4e7d2b, 8);
    return p;
  });
  // 綠色魔法火
  const fires = [];
  for (let i = 0; i < 4; i++) fires.push(flame(root, 0, 0.05, 0, 0.8, [0xccff90, SLIME, 0x1b5e20]));
  floatAnim(g, root, {
    height: 0.25,
    extra: (t) => {
      arms.forEach((a, i) => (a.rotation.z = Math.sin(t * 2 + i * PI) * 0.3));
      hat.rotation.z = -0.15 + Math.sin(t * 1.5) * 0.06;
      fires.forEach((f, i) => {
        const a = t * 1.2 + (i / 4) * PI * 2;
        f.position.set(Math.cos(a) * 0.55, -0.05, Math.sin(a) * 0.55);
        f.scale.set(1, 1 + Math.sin(t * 12 + i) * 0.2, 1);
      });
    },
  });
  g.userData.height = 1.6;
  return g;
}

// Werewolf：企起身嘅鬆毛狼人 + 金色眼 + 爪
function werewolf() {
  const g = new THREE.Group();
  const root = pivot(g);
  const fur = 0x6d6464;
  const light = 0xb0a8a0;
  const body = pivot(root, 0, 1.15, 0);
  ball(body, 0.42, 0.45, 0.32, fur, 0, 0, 0);
  ball(body, 0.3, 0.32, 0.12, light, 0, -0.05, -0.22);
  const r = seeded(9);
  for (let i = 0; i < 10; i++) {
    const a = r() * PI * 2;
    ball(body, 0.13, 0.11, 0.13, fur, Math.cos(a) * 0.36, 0.25 + r() * 0.15, Math.sin(a) * 0.26); // 頸毛
  }
  const head = pivot(root, 0, 1.75, -0.08);
  ball(head, 0.28, 0.26, 0.27, fur, 0, 0, 0);
  ball(head, 0.15, 0.12, 0.22, light, 0, -0.07, -0.25); // 口鼻
  ball(head, 0.06, 0.05, 0.05, BLACK, 0, -0.02, -0.46);
  for (const s of [-1, 1]) {
    spike(head, 0.1, 0.3, fur, s * 0.17, 0.28, 0.02, 0, s * -0.3);
    spike(head, 0.02, 0.07, 0xffffff, s * 0.06, -0.17, -0.38, PI, 0);
  }
  glowEyes(head, 0.11, 0.07, -0.22, 0.06, 0xffc400, { slant: 0.35 });
  const parts = biped(root, { hipY: 0.72, legX: 0.18, legH: 0.7, legW: 0.2, legColor: fur, foot: 0x4e4545, armY: 1.42, armX: 0.48, armH: 0.7, armW: 0.17, armColor: fur });
  for (const a of parts.arms) for (const k of [-1, 0, 1]) spike(a, 0.025, 0.12, 0xfff8e1, k * 0.05, -0.82, -0.05, PI, 0);
  const tail = pivot(root, 0, 0.85, 0.28);
  beads(tail, [V(0, 0, 0), V(0, -0.15, 0.22), V(0, -0.3, 0.3)], 0.12, 0.08, fur, 7);
  bipedAnim(g, root, parts, {
    speed: 7,
    swing: 0.55,
    extra: (t, m) => {
      tail.rotation.y = Math.sin(t * 4) * 0.4;
      // 間唔中望天嚎叫
      const howl = Math.max(0, Math.sin(t * 0.5)) ** 12 * (1 - m);
      head.rotation.x = -howl * 0.8;
    },
  });
  g.userData.height = 2.15;
  return g;
}

// Abomination Kong（Mythic）：巨型縫補大猩猩 + 紫色發光縫線 + 螺絲 + 撐手行
function abominationKong() {
  const g = new THREE.Group();
  const root = pivot(g);
  const skin = 0x4a4258;
  const patch = [0x6b5f7d, 0x3b6b5a, 0x7b4a5a];
  const stitch = 0xd500f9;
  const body = pivot(root, 0, 1.15, 0.05);
  ball(body, 0.62, 0.55, 0.48, skin, 0, 0, 0);
  ball(body, 0.42, 0.38, 0.2, 0x8a7f99, 0, -0.08, -0.34);
  const r = seeded(41);
  for (let i = 0; i < 5; i++) {
    const d = new THREE.Vector3(r() - 0.5, r() - 0.3, -0.3 - r() * 0.5).normalize();
    const p = box(body, 0.22, 0.2, 0.03, patch[i % 3], d.x * 0.6, d.y * 0.52, d.z * 0.46, 0.15);
    p.lookAt(d.x * 3, d.y * 3, d.z * 3);
  }
  // 發光縫線
  const stitches = [];
  for (let i = 0; i < 8; i++) stitches.push(box(body, 0.02, 0.1, 0.02, stitch, -0.25 + i * 0.07, 0.25, -0.43, 0.3, glow(stitch, 2.4)));
  for (let i = 0; i < 6; i++) stitches.push(box(body, 0.1, 0.02, 0.02, stitch, 0.38, -0.2 + i * 0.07, -0.33, 0.3, glow(stitch, 2.4)));
  for (const s of [-1, 1]) {
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8), material(0x9e9e9e, { metalness: 0.8, roughness: 0.3 }));
    bolt.rotation.z = PI / 2;
    bolt.position.set(s * 0.62, 0.28, 0);
    body.add(bolt);
  }
  const head = pivot(root, 0, 1.6, -0.42);
  ball(head, 0.32, 0.3, 0.3, skin, 0, 0, 0);
  ball(head, 0.24, 0.16, 0.14, 0x8a7f99, 0, -0.09, -0.22);
  box(head, 0.5, 0.1, 0.18, 0x3a3346, 0, 0.12, -0.18, 0.4); // 眉骨
  glowEyes(head, 0.11, 0.03, -0.27, 0.05, stitch);
  for (let i = 0; i < 4; i++) box(head, 0.015, 0.06, 0.015, stitch, 0.15, 0.25 - i * 0.05, -0.2, 0.3, glow(stitch, 2)).rotation.z = 0.8;
  // 大手（撐地）+ 短腳
  const arms = [-1, 1].map((s) => {
    const sh = pivot(root, s * 0.62, 1.4, -0.15);
    rod(sh, V(0, 0, 0), V(s * 0.12, -0.6, -0.15), 0.3, skin);
    rod(sh, V(s * 0.12, -0.6, -0.15), V(s * 0.1, -1.25, -0.25), 0.26, patch[(s + 1) / 2]);
    ball(sh, 0.2, 0.15, 0.24, 0x3a3346, s * 0.1, -1.32, -0.28);
    return sh;
  });
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.3, 0.7, 0.3);
    rod(hip, V(0, 0, 0), V(0, -0.6, 0.05), 0.28, skin);
    ball(hip, 0.18, 0.1, 0.25, 0x3a3346, 0, -0.66, -0.05);
    return hip;
  });
  g.userData.animate = (t, moving) => {
    const s = Math.sin(t * 5) * moving;
    arms[0].rotation.x = s * 0.45;
    arms[1].rotation.x = -s * 0.45;
    legs[0].rotation.x = -s * 0.35;
    legs[1].rotation.x = s * 0.35;
    root.position.y = Math.abs(Math.sin(t * 5)) * 0.06 * moving;
    // 間唔中捶心口
    const beat = (1 - moving) * Math.max(0, Math.sin(t * 0.7)) ** 10;
    if (beat > 0.05) {
      arms[0].rotation.x = -1.2 * beat + Math.sin(t * 20) * 0.2 * beat;
      arms[1].rotation.x = -1.2 * beat - Math.sin(t * 20) * 0.2 * beat;
    }
    stitches.forEach((m, i) => (m.material.emissiveIntensity = 1.8 + Math.sin(t * 3 + i * 0.5) * 0.8));
  };
  g.userData.move = 'walk';
  g.userData.height = 2.3;
  return g;
}

// Voidseer Pumpkin（Eternal）：宇宙南瓜 + 一隻大眼（入面有星）+ 光環 + 水晶 + 浮喺度
function voidseerPumpkin() {
  const g = new THREE.Group();
  const root = pivot(g);
  const voidC = 0x2a0f4a;
  const body = pumpkinBall(root, 0.62, voidC, 0, 0.62, 0, { ribs: 10, stem: 0x7c4dff, extra: { metalness: 0.3, roughness: 0.35, emissive: 0x1a0633, emissiveIntensity: 0.6 } });
  // 星星點點
  const r = seeded(99);
  for (let i = 0; i < 26; i++) {
    const a = r() * PI * 2;
    const b = (r() - 0.5) * 1.3;
    const d = new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b) * 0.82, Math.sin(a) * Math.cos(b));
    ball(body, 0.018, 0.018, 0.018, i % 3 ? 0xffffff : 0x84ffff, d.x * 0.64, d.y * 0.62, d.z * 0.64, glow(i % 3 ? 0xffffff : 0x84ffff, 3));
  }
  // 大眼
  const eye = pivot(body, 0, 0.02, -0.5);
  eye.scale.setScalar(1.35);
  ball(eye, 0.3, 0.26, 0.14, 0xf3e5f5, 0, 0, 0, glow(0xe1bee7, 0.6));
  const iris = ball(eye, 0.19, 0.19, 0.08, 0x00e5ff, 0, 0, -0.08, glow(0x00e5ff, 2.4));
  ball(eye, 0.1, 0.12, 0.06, 0x0a0014, 0, 0, -0.13);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2;
    ball(eye, 0.012, 0.012, 0.01, 0xffffff, Math.cos(a) * 0.05, Math.sin(a) * 0.06, -0.19, glow(0xffffff, 3));
  }
  ball(eye, 0.04, 0.04, 0.02, 0xffffff, 0.08, 0.08, -0.17, glow(0xffffff, 2));
  // 眼皮（會眨）
  const lid = ball(eye, 0.31, 0.27, 0.15, voidC, 0, 0, 0.01);
  lid.scale.set(0.31, 0.01, 0.15);
  // 光環 + 星環
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 8, 32), material(0xffd740, glow(0xffd740, 2.4)));
  halo.rotation.x = PI / 2;
  halo.position.y = 1.55;
  root.add(halo);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.025, 6, 48), material(0xb388ff, { ...glow(0xb388ff, 2), transparent: true, opacity: 0.85 }));
  ring.position.y = 0.62;
  ring.rotation.x = PI / 2 - 0.4;
  root.add(ring);
  // 水晶圍住轉
  const crystals = [];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), material(i % 2 ? 0x84ffff : 0xea80fc, glow(i % 2 ? 0x84ffff : 0xea80fc, 2.2)));
    c.scale.y = 1.8;
    root.add(c);
    crystals.push(c);
  }
  // 藤（垂落）
  for (const s of [-1, 1]) beads(body, [V(s * 0.5, -0.3, 0), V(s * 0.65, -0.55, -0.05), V(s * 0.55, -0.75, -0.12)], 0.05, 0.03, 0x4527a0, 7, glow(0x7c4dff, 0.5));
  floatAnim(g, root, {
    height: 0.35,
    extra: (t) => {
      ring.rotation.z = t * 0.6;
      halo.position.y = 1.55 + Math.sin(t * 2) * 0.05;
      crystals.forEach((c, i) => {
        const a = -t * 0.9 + (i / 4) * PI * 2;
        c.position.set(Math.cos(a) * 0.95, 0.62 + Math.sin(t * 2 + i) * 0.25, Math.sin(a) * 0.95);
        c.rotation.y = t * 2;
      });
      iris.position.x = Math.sin(t * 0.7) * 0.05;
      const blink = Math.max(0, Math.sin(t * 0.9)) ** 40;
      lid.scale.y = 0.01 + blink * 0.26;
    },
  });
  g.userData.height = 2.1;
  return g;
}

export const HALLOWEEN_MODELS = {
  Whiskers: whiskers,
  Jesterpop: jesterpop,
  Candlefang: candlefang,
  'Spirit Knight': spiritKnight,
  'Graveyard Brute': graveyardBrute,
  'Ghost Reaper': ghostReaper,
  'Hooded Gerbil': hoodedGerbil,
  Toadstool: toadstool,
  'Patchwork Imp': patchworkImp,
  'Haunted Scorpio': hauntedScorpio,
  BloodBloom: bloodBloom,
  'Mimic Chest': mimicChest,
  Crowshade: crowshade,
  'Hexed Pumpkin': hexedPumpkin,
  Werewolf: werewolf,
  'Abomination Kong': abominationKong,
  'Voidseer Pumpkin': voidseerPumpkin,
};

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
