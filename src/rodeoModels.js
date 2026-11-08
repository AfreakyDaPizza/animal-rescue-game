// 🤠 Catch & Tame 動物模型（小朋友 Issue #16）：方塊（Roblox）風格，同 animals20.js 一樣用 beast()
// 全部面向 -z。每個回傳 Group：userData.animate(time, moving)、userData.height
// RODEO_MODELS 俾 animalModels.js 嘅 buildAnimalModel 用（地塊、圖鑑、手上都係呢啲樣）
// 有啲直接用返遊戲本身嘅（大象、犀牛、老虎、馴鹿）；🐎 馬（buildHorse）係你一開始騎嗰隻

import * as THREE from 'three';
import { box, pivot, cuteEyes, spike, ball, BLACK, WHITE } from './modelKit.js';
import { beast } from './animals20.js';
import { ANIMALS_20 } from './animals20v3.js';
import { ANIMALS_30 } from './animals30.js';

const PI = Math.PI;

// 長頸（長頸鹿、駝鳥、駱駝）：喺 root 由 (0,y0,z0) 斜上去到 (0,y1,z1) 嘅一條方塊
function neckBox(root, w, d, color, y0, z0, y1, z1) {
  const len = Math.hypot(y1 - y0, z1 - z0);
  const n = box(root, w, len, d, color, 0, (y0 + y1) / 2, (z0 + z1) / 2, 0.35);
  n.rotation.x = -Math.atan2(z1 - z0, y1 - y0);
  return n;
}
// 兩隻耳（尖耳／圓耳）
function ears(p, x, y, z, w, h, color, inner = null, tiltZ = 0.25) {
  for (const s of [-1, 1]) {
    const e = pivot(p.head, s * x, y, z);
    e.rotation.z = s * -tiltZ;
    box(e, w, h, w * 0.5, color, 0, h / 2, 0, 0.4);
    if (inner) box(e, w * 0.55, h * 0.7, 0.03, inner, 0, h * 0.42, -w * 0.26, 0.4);
    p.ears.push(e);
  }
}
// 鼻 + 嘴
function snout(p, w, h, d, color, y, z, nose = BLACK) {
  box(p.head, w, h, d, color, 0, y, z, 0.4);
  box(p.head, w * 0.45, h * 0.35, 0.05, nose, 0, y + h * 0.25, z - d / 2, 0.45);
}

// ================= 🐎 馬（Catch & Tame 開場騎嗰隻）=================
const COATS = [
  { fur: 0x8d5a34, mane: 0x2b1a10, sock: 0xf2ebe0 },
  { fur: 0x3a2a20, mane: 0x15100c, sock: 0x3a2a20 },
  { fur: 0xd8c3a0, mane: 0xf5f0e6, sock: 0xf5f0e6 },
  { fur: 0xb06a32, mane: 0xf1e3c6, sock: 0xb06a32 },
];
export function buildHorse(coat = 0) {
  const c = COATS[coat % COATS.length];
  const g = beast({
    body: { w: 0.82, h: 0.86, d: 1.95, y: 1.68, color: c.fur },
    head: { w: 0.42, h: 0.5, d: 0.9, y: 2.75, z: -1.42, color: c.fur },
    legs: { w: 0.22, h: 1.32, x: 0.27, zf: -0.7, zb: 0.7, color: c.fur, paw: 0x2a1d14 },
    eyeSize: 0.1,
    eyeOpts: { iris: 0x4e342e },
    walkSpeed: 11,
    swing: 0.75,
    extras(p) {
      neckBox(p.root, 0.42, 0.55, c.fur, 1.85, -0.85, 2.6, -1.25);
      for (let i = 0; i < 5; i++) box(p.root, 0.16, 0.34, 0.2, c.mane, 0, 2.1 + i * 0.14, -0.78 - i * 0.12, 0.4).rotation.x = 0.5; // 鬃毛
      box(p.head, 0.36, 0.3, 0.42, c.fur, 0, -0.12, -0.38, 0.4); // 長面
      box(p.head, 0.2, 0.08, 0.05, 0x1a1a1a, 0, -0.1, -0.6, 0.45);
      box(p.head, 0.18, 0.2, 0.3, c.mane, 0, 0.3, 0.12, 0.4); // 額毛
      ears(p, 0.14, 0.22, 0.25, 0.1, 0.24, c.fur, 0xe0c0a0, 0.1);
      for (const l of p.legs) box(l.hip, 0.24, 0.3, 0.24, c.sock, 0, -1.05, 0, 0.35); // 白襪
      // 🐴 馬鞍 + 腳踏 + 韁繩
      box(p.root, 0.9, 0.12, 0.8, 0x6d3b1c, 0, 2.15, -0.05, 0.3);
      box(p.root, 0.95, 0.06, 0.95, 0xc62828, 0, 2.08, -0.05, 0.2); // 鞍墊
      box(p.root, 0.5, 0.2, 0.12, 0x6d3b1c, 0, 2.28, -0.4, 0.3); // 鞍頭
      for (const s of [-1, 1]) {
        box(p.root, 0.04, 0.6, 0.04, 0x3e2310, s * 0.47, 1.82, -0.05, 0.2);
        box(p.root, 0.14, 0.05, 0.16, 0x9e9e9e, s * 0.47, 1.5, -0.05, 0.2);
        box(p.head, 0.03, 0.03, 0.75, 0x3e2310, s * 0.21, -0.1, 0.15, 0.2);
      }
    },
  });
  // 長尾（掛落嚟，跑起上嚟飄）
  const tail = pivot(g.children[0], 0, 1.95, 0.98);
  box(tail, 0.2, 1.0, 0.2, c.mane, 0, -0.45, 0.12, 0.4);
  const old = g.userData.animate;
  g.userData.animate = (t, moving) => {
    old(t, moving);
    tail.rotation.x = 0.35 + moving * 0.6 + Math.sin(t * 9) * 0.12 * moving;
  };
  g.userData.height = 3.0;
  return g;
}

// ================= 🦒 Savanna =================
function zebra() {
  const fur = 0xf6f6f2;
  return beast({
    body: { w: 0.8, h: 0.82, d: 1.7, y: 1.5, color: fur },
    head: { w: 0.4, h: 0.48, d: 0.82, y: 2.35, z: -1.25, color: fur },
    legs: { w: 0.2, h: 1.16, x: 0.26, zf: -0.6, zb: 0.6, color: fur, paw: BLACK },
    tail: { w: 0.08, h: 0.08, d: 0.6, y: 1.65, color: fur, tip: BLACK, angle: 1.1 },
    eyeSize: 0.1,
    walkSpeed: 11,
    swing: 0.7,
    extras(p) {
      neckBox(p.root, 0.38, 0.5, fur, 1.7, -0.75, 2.25, -1.1);
      for (let i = 0; i < 7; i++) {
        for (const s of [-1, 1]) box(p.root, 0.03, 0.78, 0.09, BLACK, s * 0.405, 1.5, -0.7 + i * 0.23, 0.2); // 身上間條
        box(p.root, 0.82, 0.04, 0.09, BLACK, 0, 1.92, -0.7 + i * 0.23, 0.2);
      }
      for (let i = 0; i < 4; i++) box(p.root, 0.4, 0.07, 0.52, BLACK, 0, 1.85 + i * 0.13, -0.85 - i * 0.07, 0.2).rotation.x = -0.6;
      for (const l of p.legs) for (let i = 0; i < 4; i++) box(l.hip, 0.21, 0.05, 0.21, BLACK, 0, -0.25 - i * 0.2, 0, 0.2);
      for (let i = 0; i < 5; i++) box(p.root, 0.12, 0.3, 0.16, i % 2 ? BLACK : WHITE, 0, 2.0 + i * 0.12, -0.72 - i * 0.1, 0.4); // 企企嘅鬃
      box(p.head, 0.34, 0.28, 0.36, 0x2b2b2b, 0, -0.12, -0.32, 0.4); // 黑口鼻
      for (let i = 0; i < 3; i++) box(p.head, 0.42, 0.04, 0.08, BLACK, 0, 0.12 - i * 0.1, 0.05 + i * 0.12, 0.2);
      ears(p, 0.14, 0.22, 0.2, 0.1, 0.26, fur, 0x2b2b2b, 0.15);
    },
  });
}
function wildebeest() {
  const fur = 0x6f7480;
  const dark = 0x3a3d45;
  return beast({
    body: { w: 0.85, h: 0.95, d: 1.6, y: 1.5, color: fur },
    head: { w: 0.44, h: 0.52, d: 0.85, y: 1.95, z: -1.1, color: dark },
    legs: { w: 0.18, h: 1.05, x: 0.26, zf: -0.55, zb: 0.55, color: dark, paw: BLACK },
    tail: { w: 0.08, h: 0.08, d: 0.7, y: 1.7, color: dark, tip: BLACK, angle: 1.0 },
    eyeSize: 0.09,
    walkSpeed: 10,
    extras(p) {
      box(p.root, 0.95, 0.5, 0.7, fur, 0, 1.95, -0.45, 0.4); // 高膊頭
      for (let i = 0; i < 4; i++) box(p.root, 0.08, 0.6, 0.08, dark, (i % 2 ? 1 : -1) * 0.39, 1.5, -0.4 + i * 0.25, 0.3); // 黑間條
      for (let i = 0; i < 5; i++) box(p.root, 0.12, 0.28, 0.2, BLACK, 0, 2.2, -0.75 + i * 0.13, 0.4); // 鬃
      box(p.head, 0.3, 0.4, 0.2, BLACK, 0, -0.35, 0.05, 0.4); // 鬚
      box(p.head, 0.4, 0.3, 0.32, 0x2b2d33, 0, -0.1, -0.4, 0.4);
      for (const s of [-1, 1]) { // 彎角
        const h = pivot(p.head, s * 0.2, 0.25, 0.1);
        box(h, 0.42, 0.1, 0.1, 0xd7ccc8, s * 0.2, 0, 0, 0.4);
        box(h, 0.1, 0.32, 0.1, 0xd7ccc8, s * 0.38, 0.15, 0, 0.4).rotation.z = s * 0.3;
      }
      ears(p, 0.24, 0.1, 0.2, 0.1, 0.2, dark, null, 1.1);
    },
  });
}
function warthog() {
  const skin = 0x7d6b63;
  const mane = 0x3e2a20;
  return beast({
    body: { w: 0.7, h: 0.66, d: 1.15, y: 0.75, color: skin },
    head: { w: 0.55, h: 0.5, d: 0.6, y: 0.75, z: -0.75, color: skin },
    legs: { w: 0.15, h: 0.48, x: 0.22, zf: -0.38, zb: 0.38, color: skin, paw: BLACK },
    eyeSize: 0.08,
    walkSpeed: 15,
    extras(p) {
      for (let i = 0; i < 6; i++) box(p.root, 0.1, 0.24, 0.12, mane, 0, 1.12 - i * 0.02, -0.55 + i * 0.18, 0.4);
      box(p.head, 0.4, 0.3, 0.3, 0x8d7a70, 0, -0.1, -0.36, 0.4); // 豬鼻
      box(p.head, 0.3, 0.16, 0.04, 0x4e342e, 0, -0.05, -0.52, 0.4);
      for (const s of [-1, 1]) {
        spike(p.head, 0.05, 0.36, 0xfff8e1, s * 0.22, -0.02, -0.42, -0.3, s * -0.6); // 獠牙
        box(p.head, 0.12, 0.08, 0.12, 0x5d4a42, s * 0.3, 0.02, -0.15, 0.4); // 肉疣
      }
      ears(p, 0.2, 0.2, 0.1, 0.12, 0.18, skin, 0xd7a29a, 0.6);
      const t = pivot(p.root, 0, 0.95, 0.58); // 企直嘅尾（跑嗰陣好似支旗）
      box(t, 0.05, 0.55, 0.05, skin, 0, 0.27, 0, 0.3);
      box(t, 0.1, 0.14, 0.1, BLACK, 0, 0.58, 0, 0.4);
    },
  });
}
// 兩隻腳嘅雀（駝鳥、走鵑）
function biped({ body, wing, neck, head, leg, beak, neckLen, legLen, size = 1, tailColor = null, crest = null, long = 0.6 }) {
  const g = new THREE.Group();
  const root = pivot(g);
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.2, legLen, 0.05);
    box(hip, 0.12, legLen * 0.55, 0.14, leg, 0, -legLen * 0.27, 0, 0.3);
    box(hip, 0.08, legLen * 0.5, 0.08, leg, 0, -legLen * 0.75, 0.04, 0.3);
    box(hip, 0.16, 0.06, 0.26, leg, 0, -legLen + 0.03, -0.08, 0.3);
    return hip;
  });
  const bodyY = legLen + 0.32;
  const torso = box(root, 0.8, 0.7, long + 0.6, body, 0, bodyY, 0.05, 0.42);
  torso.rotation.x = 0.12;
  for (const s of [-1, 1]) box(root, 0.08, 0.5, long + 0.3, wing, s * 0.42, bodyY + 0.05, 0.15, 0.4);
  if (tailColor) {
    box(root, 0.6, 0.45, 0.35, tailColor, 0, bodyY + 0.2, long * 0.5 + 0.45, 0.45);
  }
  neckBox(root, 0.16, 0.16, neck, bodyY + 0.2, -0.3, bodyY + neckLen, -0.55);
  const headP = pivot(root, 0, bodyY + neckLen + 0.05, -0.58);
  box(headP, 0.26, 0.24, 0.32, head, 0, 0, 0, 0.4);
  cuteEyes(headP, 0.07, 0.04, -0.165, 0.08);
  box(headP, 0.12, 0.08, 0.24, beak, 0, -0.04, -0.24, 0.4);
  if (crest) for (let i = 0; i < 3; i++) box(headP, 0.06, 0.2, 0.06, crest, 0, 0.18, 0.04 + i * 0.07, 0.3).rotation.x = 0.5 + i * 0.2;
  g.scale.setScalar(size);
  g.userData.animate = (t, moving) => {
    legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 13 + i * PI) * 0.8 * moving));
    root.position.y = Math.abs(Math.sin(t * 13)) * 0.08 * moving;
    headP.position.z = -0.58 + Math.sin(t * 13) * 0.05 * moving;
    headP.rotation.y = Math.sin(t * 1.4) * 0.4 * (1 - moving);
  };
  g.userData.height = (bodyY + neckLen + 0.2) * size;
  g.userData.move = 'walk';
  return g;
}
const ostrich = () => biped({ body: 0x1f1b1b, wing: 0x262222, tailColor: 0xf5f5f0, neck: 0xf0b9a8, head: 0xe8b0a0, leg: 0xe5a796, beak: 0xd7a07a, neckLen: 1.3, legLen: 1.2 });
const roadrunner = () => biped({ body: 0x7b6650, wing: 0x5d4a38, tailColor: null, neck: 0x8d7660, head: 0x6e5a46, leg: 0x90a4ae, beak: 0x37474f, neckLen: 0.35, legLen: 0.5, crest: 0x3e2f22, long: 1.1 });
function giraffe() {
  const fur = 0xf1c27a;
  const spot = 0x9a5a2a;
  return beast({
    body: { w: 0.85, h: 0.9, d: 1.5, y: 2.2, color: fur },
    head: { w: 0.4, h: 0.45, d: 0.75, y: 4.6, z: -1.35, color: fur },
    legs: { w: 0.2, h: 1.8, x: 0.27, zf: -0.52, zb: 0.52, color: fur, paw: 0x3e2a1a },
    tail: { w: 0.07, h: 0.07, d: 0.8, y: 2.4, color: fur, tip: BLACK, angle: 1.3 },
    eyeSize: 0.1,
    walkSpeed: 6,
    swing: 0.45,
    extras(p) {
      neckBox(p.root, 0.36, 0.42, fur, 2.4, -0.6, 4.45, -1.2);
      for (let i = 0; i < 8; i++) box(p.root, 0.1, 0.26, 0.14, 0x8a4f22, 0, 2.55 + i * 0.24, -0.58 - i * 0.07, 0.4); // 鬃
      const r = [[-0.4, 0.3], [0.1, 0.32], [0.45, 0.25], [-0.15, -0.1], [0.3, -0.12], [-0.45, -0.2]];
      for (const s of [-1, 1]) for (const [z, y] of r) box(p.root, 0.04, 0.22, 0.24, spot, s * 0.43, 2.2 + y, z, 0.3);
      for (const [z, y] of r) box(p.root, 0.24, 0.04, 0.24, spot, y * 0.6, 2.66, z, 0.3);
      for (let i = 0; i < 6; i++) for (const s of [-1, 1]) box(p.root, 0.05, 0.18, 0.16, spot, s * 0.18, 2.7 + i * 0.3, -0.68 - i * 0.09, 0.3);
      box(p.head, 0.32, 0.28, 0.32, 0xe0ae66, 0, -0.1, -0.35, 0.4);
      for (const s of [-1, 1]) {
        box(p.head, 0.08, 0.26, 0.08, fur, s * 0.1, 0.32, 0.12, 0.4); // 角（ossicone）
        box(p.head, 0.1, 0.08, 0.1, 0x3e2a1a, s * 0.1, 0.46, 0.12, 0.4);
      }
      ears(p, 0.24, 0.12, 0.2, 0.1, 0.22, fur, null, 1.2);
    },
  });
}
function hippo() {
  const skin = 0x8c7b8e;
  return beast({
    body: { w: 1.3, h: 1.1, d: 2.1, y: 1.05, color: skin },
    head: { w: 0.9, h: 0.7, d: 0.9, y: 1.2, z: -1.35, color: skin },
    legs: { w: 0.32, h: 0.55, x: 0.42, zf: -0.7, zb: 0.7, color: skin, paw: 0x5d4f60 },
    tail: { w: 0.1, h: 0.08, d: 0.3, y: 1.2, color: skin, angle: 0.8 },
    belly: 0xd9a6a6,
    eyeSize: 0.12,
    walkSpeed: 8,
    extras(p) {
      box(p.head, 1.0, 0.5, 0.55, 0xa78fa4, 0, -0.2, -0.55, 0.4); // 大口
      box(p.head, 0.9, 0.08, 0.04, 0xd98c8c, 0, -0.32, -0.83, 0.3);
      for (const s of [-1, 1]) {
        box(p.head, 0.12, 0.08, 0.05, 0x3e2e40, s * 0.22, -0.05, -0.83, 0.4); // 鼻孔
        box(p.head, 0.08, 0.16, 0.06, 0xffffff, s * 0.3, -0.42, -0.8, 0.3); // 牙
      }
      ears(p, 0.32, 0.32, 0.25, 0.12, 0.12, skin, 0xd9a6a6, 0.3);
    },
  });
}
function rhino() {
  const g = ANIMALS_20['Black Rhinoceros']();
  return g;
}
function lion() {
  const fur = 0xd9a45b;
  const mane = 0x7a3f17;
  return beast({
    body: { w: 0.75, h: 0.75, d: 1.6, y: 1.0, color: fur },
    head: { w: 0.6, h: 0.58, d: 0.6, y: 1.45, z: -1.0, color: fur },
    legs: { w: 0.22, h: 0.75, x: 0.24, zf: -0.55, zb: 0.55, color: fur, paw: 0xc78e48, toes: 0xb07a38 },
    tail: { w: 0.08, h: 0.08, d: 0.9, y: 1.15, color: fur, tip: mane, angle: 0.6 },
    belly: 0xf0d3a0,
    eyeSize: 0.12,
    eyeOpts: { iris: 0xc77800 },
    walkSpeed: 12,
    swing: 0.7,
    extras(p) {
      box(p.head, 1.0, 1.0, 0.45, mane, 0, 0, 0.2, 0.45); // 大鬃毛
      box(p.root, 0.9, 0.85, 0.5, mane, 0, 1.25, -0.72, 0.45);
      snout(p, 0.34, 0.26, 0.2, 0xf0d3a0, -0.12, -0.36, 0x5d3a28);
      ears(p, 0.3, 0.26, 0.05, 0.14, 0.14, fur, 0x5d3a28, 0.2);
    },
  });
}
const elephantA = () => ANIMALS_20['African Savanna Elephant']();
function cheetah() {
  const fur = 0xe8b552;
  return beast({
    body: { w: 0.55, h: 0.55, d: 1.5, y: 0.98, color: fur },
    head: { w: 0.42, h: 0.38, d: 0.42, y: 1.25, z: -0.95, color: fur },
    legs: { w: 0.14, h: 0.82, x: 0.18, zf: -0.55, zb: 0.55, color: fur, paw: 0xd9a443 },
    tail: { w: 0.07, h: 0.07, d: 1.0, y: 1.1, color: fur, tip: WHITE, angle: 0.4 },
    belly: 0xfff3dc,
    eyeSize: 0.1,
    eyeOpts: { iris: 0xc77800 },
    walkSpeed: 15,
    swing: 0.85,
    extras(p) {
      for (let i = 0; i < 14; i++) {
        const z = -0.6 + (i % 7) * 0.2;
        const s = i < 7 ? -1 : 1;
        box(p.root, 0.03, 0.08, 0.08, BLACK, s * 0.28, 0.95 + ((i * 37) % 5) * 0.06 - 0.1, z, 0.4);
        box(p.root, 0.08, 0.03, 0.08, BLACK, ((i * 13) % 5) * 0.1 - 0.2, 1.26, z + 0.1, 0.4);
      }
      for (const s of [-1, 1]) box(p.head, 0.04, 0.2, 0.03, BLACK, s * 0.1, -0.06, -0.22, 0.3); // 淚痕
      snout(p, 0.24, 0.16, 0.12, 0xfff3dc, -0.1, -0.24, 0x2b2b2b);
      ears(p, 0.15, 0.17, 0.05, 0.1, 0.1, fur, BLACK, 0.3);
      for (let i = 0; i < 3; i++) box(p.tail, 0.09, 0.09, 0.05, BLACK, 0, 0, 0.5 + i * 0.15, 0.3);
    },
  });
}

// ================= 🐪 Desert =================
function meerkat() {
  const fur = 0xc9a77c;
  const g = beast({
    body: { w: 0.32, h: 0.34, d: 0.7, y: 0.42, color: fur },
    head: { w: 0.28, h: 0.26, d: 0.32, y: 0.62, z: -0.42, color: fur },
    legs: { w: 0.09, h: 0.26, x: 0.11, zf: -0.24, zb: 0.24, color: 0xb59266, paw: 0x3e2a1a },
    tail: { w: 0.06, h: 0.06, d: 0.5, y: 0.45, color: fur, tip: 0x2b1d14, angle: 0.3 },
    belly: 0xe8d5b5,
    eyeSize: 0.075,
    walkSpeed: 16,
    extras(p) {
      for (const s of [-1, 1]) box(p.head, 0.1, 0.1, 0.03, 0x2b1d14, s * 0.07, 0.03, -0.155, 0.4); // 黑眼圈
      snout(p, 0.14, 0.1, 0.12, 0xd9bf98, -0.06, -0.2, 0x2b1d14);
      for (let i = 0; i < 4; i++) box(p.root, 0.33, 0.03, 0.05, 0x8a6d4a, 0, 0.6, -0.15 + i * 0.12, 0.2);
      ears(p, 0.14, 0.04, 0.05, 0.06, 0.06, 0x3e2a1a, null, 1.2);
    },
  });
  g.userData.height = 0.8;
  return g;
}
function camel(humps) {
  const fur = humps === 2 ? 0xa8794a : 0xd2a86e;
  return () => beast({
    body: { w: 0.85, h: 0.85, d: 1.8, y: 1.8, color: fur },
    head: { w: 0.4, h: 0.4, d: 0.75, y: 2.2, z: -1.6, color: fur },
    legs: { w: 0.2, h: 1.45, x: 0.27, zf: -0.6, zb: 0.6, color: fur, paw: 0x8a6a48 },
    tail: { w: 0.07, h: 0.07, d: 0.5, y: 1.95, color: fur, tip: 0x5d4330, angle: 1.3 },
    eyeSize: 0.09,
    eyeOpts: { iris: 0x4e342e },
    walkSpeed: 8,
    extras(p) {
      neckBox(p.root, 0.34, 0.4, fur, 1.85, -0.9, 1.75, -1.35); // 彎頸（先落再上）
      neckBox(p.root, 0.32, 0.36, fur, 1.75, -1.35, 2.15, -1.55);
      const hz = humps === 2 ? [-0.38, 0.38] : [0];
      for (const z of hz) {
        box(p.root, 0.62, 0.55, 0.62, fur, 0, 2.4, z, 0.45);
        if (humps === 2) box(p.root, 0.4, 0.2, 0.4, 0x6d4c2e, 0, 2.7, z, 0.45); // 頂嘅深色毛
      }
      box(p.head, 0.32, 0.26, 0.32, 0xc8a070, 0, -0.08, -0.32, 0.4);
      box(p.head, 0.24, 0.05, 0.04, 0x4e342e, 0, -0.15, -0.49, 0.3); // 口
      for (const s of [-1, 1]) box(p.head, 0.16, 0.06, 0.04, 0x4e342e, s * 0.1, 0.12, -0.21, 0.3); // 長眼睫毛
      ears(p, 0.16, 0.18, 0.15, 0.07, 0.12, fur, null, 0.5);
      for (const l of p.legs) box(l.hip, 0.24, 0.14, 0.24, fur, 0, -0.75, 0, 0.4); // 膝頭
    },
  });
}
function fennec() {
  const fur = 0xf1d9a8;
  const g = beast({
    body: { w: 0.32, h: 0.32, d: 0.65, y: 0.42, color: fur },
    head: { w: 0.32, h: 0.28, d: 0.3, y: 0.62, z: -0.42, color: fur },
    legs: { w: 0.08, h: 0.28, x: 0.1, zf: -0.22, zb: 0.22, color: fur, paw: 0xe8c890 },
    tail: { w: 0.14, h: 0.14, d: 0.42, y: 0.48, color: 0xe8c890, tip: 0x3e2a1a, angle: 0.7 },
    belly: 0xfffaf0,
    eyeSize: 0.08,
    walkSpeed: 16,
    extras(p) {
      snout(p, 0.14, 0.1, 0.14, 0xfffaf0, -0.07, -0.2);
      ears(p, 0.12, 0.08, 0.04, 0.16, 0.38, fur, 0xf8bbd0, 0.45); // 超大耳
    },
  });
  g.userData.height = 0.95;
  return g;
}
function sandCat() {
  const fur = 0xdcc49a;
  const g = beast({
    body: { w: 0.34, h: 0.32, d: 0.66, y: 0.42, color: fur },
    head: { w: 0.4, h: 0.32, d: 0.32, y: 0.6, z: -0.42, color: fur },
    legs: { w: 0.1, h: 0.28, x: 0.11, zf: -0.22, zb: 0.22, color: fur, paw: 0xe8d8b8 },
    tail: { w: 0.08, h: 0.08, d: 0.45, y: 0.5, color: fur, tip: BLACK, angle: 0.5 },
    belly: 0xf5ecd8,
    eyeSize: 0.1,
    eyeOpts: { iris: 0x9ccc65 },
    walkSpeed: 15,
    extras(p) {
      snout(p, 0.16, 0.1, 0.1, 0xf5ecd8, -0.08, -0.18, 0xd7a29a);
      for (let i = 0; i < 2; i++) box(p.tail, 0.09, 0.09, 0.04, BLACK, 0, 0, 0.2 + i * 0.1, 0.3);
      ears(p, 0.17, 0.1, 0.04, 0.14, 0.14, fur, 0xc89b7a, 0.75); // 打橫嘅闊耳
    },
  });
  g.userData.height = 0.8;
  return g;
}
function tortoise() {
  const g = new THREE.Group();
  const root = pivot(g);
  const shell = 0x8d6e3f;
  const skin = 0x9e8a6a;
  box(root, 1.0, 0.5, 1.2, shell, 0, 0.55, 0, 0.45);
  box(root, 0.8, 0.25, 0.95, 0xa7834c, 0, 0.85, 0, 0.45);
  for (const [x, z] of [[-0.25, -0.3], [0.25, -0.3], [0, 0], [-0.25, 0.3], [0.25, 0.3]]) box(root, 0.3, 0.06, 0.3, 0x6b5130, x, 0.98, z, 0.3); // 殼紋
  box(root, 1.05, 0.1, 1.25, 0x6b5130, 0, 0.35, 0, 0.3);
  const legs = [];
  for (const [x, z, ph] of [[-0.42, -0.4, 0], [0.42, -0.4, PI], [-0.42, 0.4, PI], [0.42, 0.4, 0]]) {
    const hip = pivot(root, x, 0.38, z);
    box(hip, 0.22, 0.38, 0.22, skin, 0, -0.19, 0, 0.4);
    legs.push({ hip, ph });
  }
  const head = pivot(root, 0, 0.55, -0.7);
  box(head, 0.32, 0.28, 0.38, skin, 0, 0, -0.1, 0.45);
  cuteEyes(head, 0.08, 0.04, -0.295, 0.08);
  box(head, 0.18, 0.03, 0.03, 0x4e3e2a, 0, -0.08, -0.3, 0.3);
  g.userData.animate = (t, moving) => {
    for (const l of legs) l.hip.rotation.x = Math.sin(t * 6 + l.ph) * 0.4 * moving;
    head.position.z = -0.7 + Math.sin(t * 1.3) * 0.04;
    root.rotation.z = Math.sin(t * 6) * 0.03 * moving;
  };
  g.userData.height = 1.05;
  g.userData.move = 'walk';
  return g;
}
function gila() {
  const g = new THREE.Group();
  const root = pivot(g);
  const orange = 0xf28b55;
  const black = 0x2b1d1d;
  const segs = [];
  let parent = root;
  for (let i = 0; i < 6; i++) { // 一節節身 + 尾
    const s = pivot(parent, 0, 0, i === 0 ? -0.4 : 0.3);
    if (i === 0) s.position.y = 0.32;
    const w = i < 3 ? 0.5 : 0.45 - (i - 2) * 0.09;
    box(s, w, 0.26 - i * 0.02, 0.34, i % 2 ? black : orange, 0, 0, 0.15, 0.4);
    box(s, w * 0.5, 0.05, 0.12, i % 2 ? orange : black, 0, 0.13, 0.15, 0.3);
    segs.push(s);
    parent = s;
  }
  const head = pivot(segs[0], 0, 0.02, -0.12);
  box(head, 0.36, 0.22, 0.34, black, 0, 0, -0.1, 0.45);
  box(head, 0.2, 0.06, 0.16, orange, 0, 0.11, -0.1, 0.3);
  cuteEyes(head, 0.1, 0.05, -0.275, 0.08, { iris: 0xffb74d });
  const legs = [];
  for (const [i, x, ph] of [[0, -1, 0], [0, 1, PI], [2, -1, PI], [2, 1, 0]]) {
    const hip = pivot(segs[i], x * 0.27, -0.02, 0.15);
    hip.rotation.z = x * 0.5;
    box(hip, 0.12, 0.28, 0.12, black, 0, -0.12, 0, 0.4);
    legs.push({ hip, ph, x });
  }
  g.userData.animate = (t, moving) => {
    segs.forEach((s, i) => (s.rotation.y = Math.sin(t * 9 - i * 0.8) * (0.12 + moving * 0.15)));
    for (const l of legs) l.hip.rotation.x = Math.sin(t * 12 + l.ph) * 0.6 * moving;
    head.rotation.y = -segs[0].rotation.y;
  };
  g.userData.height = 0.95; // 好扁好長：當佢高啲，放大嗰陣唔會變成 5 米長
  g.userData.move = 'walk';
  return g;
}
function oryx({ fur, face, horns, mask, twist = false }) {
  return () => beast({
    body: { w: 0.62, h: 0.66, d: 1.35, y: 1.15, color: fur },
    head: { w: 0.34, h: 0.4, d: 0.62, y: 1.65, z: -0.95, color: fur },
    legs: { w: 0.15, h: 0.86, x: 0.2, zf: -0.48, zb: 0.48, color: fur, paw: 0x3e2a1a },
    tail: { w: 0.06, h: 0.06, d: 0.45, y: 1.3, color: fur, tip: BLACK, angle: 1.0 },
    eyeSize: 0.09,
    walkSpeed: 12,
    extras(p) {
      neckBox(p.root, 0.28, 0.36, fur, 1.35, -0.6, 1.6, -0.85);
      box(p.head, 0.36, 0.2, 0.5, face, 0, 0.12, -0.06, 0.4);
      if (mask) for (const s of [-1, 1]) box(p.head, 0.05, 0.36, 0.2, mask, s * 0.16, -0.02, -0.15, 0.3);
      if (mask) for (const l of p.legs) box(l.hip, 0.16, 0.3, 0.16, mask, 0, -0.35, 0, 0.3);
      for (const s of [-1, 1]) { // 長角
        const h = pivot(p.head, s * 0.1, 0.18, 0.1);
        h.rotation.x = 0.75;
        h.rotation.z = s * -0.12;
        for (let i = 0; i < 5; i++) {
          const seg = box(h, 0.07 - i * 0.008, 0.26, 0.07 - i * 0.008, horns, twist ? s * Math.sin(i * 1.3) * 0.08 : 0, 0.13 + i * 0.24, twist ? Math.cos(i * 1.3) * 0.06 : 0, 0.3);
          if (twist) seg.rotation.z = s * 0.25;
        }
      }
      ears(p, 0.18, 0.12, 0.18, 0.08, 0.2, fur, null, 1.0);
    },
  });
}
const arabianOryx = oryx({ fur: 0xf5f3ee, face: 0xf5f3ee, horns: 0x2b2b2b, mask: 0x3a2f2a });
const addax = oryx({ fur: 0xece4d4, face: 0x7a5a42, horns: 0xd8c8a8, twist: true });

// ================= 🌲 Taiga =================
function snowshoeHare() {
  const fur = 0xf7f7f5;
  const g = beast({
    body: { w: 0.4, h: 0.42, d: 0.62, y: 0.42, color: fur },
    head: { w: 0.34, h: 0.32, d: 0.32, y: 0.7, z: -0.36, color: fur },
    legs: { w: 0.12, h: 0.24, x: 0.13, zf: -0.2, zb: 0.24, color: fur, paw: 0xeceff1 },
    tail: { w: 0.14, h: 0.14, d: 0.12, y: 0.5, color: fur },
    eyeSize: 0.085,
    walkSpeed: 10,
    extras(p) {
      for (const l of p.legs.slice(2)) box(l.hip, 0.16, 0.06, 0.34, 0xe0e0e0, 0, -0.22, -0.08, 0.4); // 大腳板
      snout(p, 0.14, 0.1, 0.08, 0xffffff, -0.08, -0.17, 0xf48fb1);
      ears(p, 0.08, 0.14, 0.05, 0.1, 0.42, fur, 0xf8bbd0, 0.1);
      for (const e of p.ears) box(e, 0.1, 0.06, 0.06, 0x3e3e3e, 0, 0.42, 0, 0.3); // 黑耳尖
    },
  });
  const old = g.userData.animate;
  g.userData.animate = (t, moving) => {
    old(t, moving);
    g.children[0].position.y = Math.abs(Math.sin(t * 8)) * 0.25 * moving; // 彈彈跳
  };
  g.userData.height = 0.95;
  return g;
}
function fox({ fur, belly, sock, tip }) {
  return () => {
    const g = beast({
      body: { w: 0.38, h: 0.36, d: 0.8, y: 0.5, color: fur },
      head: { w: 0.38, h: 0.32, d: 0.34, y: 0.68, z: -0.5, color: fur },
      legs: { w: 0.1, h: 0.34, x: 0.12, zf: -0.28, zb: 0.28, color: sock, paw: sock },
      tail: { w: 0.18, h: 0.18, d: 0.62, y: 0.55, color: fur, tip, angle: 0.5 },
      belly,
      eyeSize: 0.085,
      eyeOpts: { iris: 0xffa000 },
      walkSpeed: 14,
      extras(p) {
        snout(p, 0.16, 0.12, 0.2, belly, -0.08, -0.24);
        box(p.head, 0.3, 0.12, 0.06, belly, 0, -0.1, -0.16, 0.4);
        ears(p, 0.12, 0.12, 0.04, 0.12, 0.18, fur, BLACK, 0.2);
      },
    });
    g.userData.height = 0.95;
    return g;
  };
}
const redFox = fox({ fur: 0xe2672a, belly: 0xfaf3e8, sock: 0x2b1d14, tip: 0xffffff });
const reindeer = () => {
  const g = ANIMALS_30.Caribou();
  return g;
};
function greyWolf() {
  const fur = 0x8c8f96;
  return beast({
    body: { w: 0.5, h: 0.55, d: 1.25, y: 0.95, color: fur },
    head: { w: 0.42, h: 0.4, d: 0.45, y: 1.25, z: -0.85, color: fur },
    legs: { w: 0.14, h: 0.72, x: 0.17, zf: -0.42, zb: 0.42, color: 0xb0b3b8, paw: 0x9a9da3 },
    tail: { w: 0.16, h: 0.16, d: 0.75, y: 1.0, color: fur, tip: 0x3a3a3a, angle: 0.7 },
    belly: 0xe6e6e6,
    eyeSize: 0.09,
    eyeOpts: { iris: 0xffc107 },
    walkSpeed: 13,
    swing: 0.7,
    extras(p) {
      box(p.root, 0.56, 0.4, 0.5, 0x6e7178, 0, 1.15, -0.4, 0.45); // 頸毛
      snout(p, 0.2, 0.16, 0.26, 0xd5d5d5, -0.08, -0.32);
      ears(p, 0.14, 0.18, 0.05, 0.12, 0.2, fur, 0x4a4a4a, 0.15);
    },
  });
}
function lynx() {
  const fur = 0xb9a083;
  return beast({
    body: { w: 0.48, h: 0.5, d: 1.0, y: 0.82, color: fur },
    head: { w: 0.44, h: 0.4, d: 0.4, y: 1.08, z: -0.66, color: fur },
    legs: { w: 0.16, h: 0.6, x: 0.16, zf: -0.34, zb: 0.34, color: fur, paw: 0xd9c8b0 },
    tail: { w: 0.1, h: 0.1, d: 0.22, y: 0.98, color: fur, tip: BLACK, angle: 0.4 },
    belly: 0xf0e6d8,
    eyeSize: 0.1,
    eyeOpts: { iris: 0xc0ca33 },
    walkSpeed: 12,
    extras(p) {
      for (let i = 0; i < 10; i++) box(p.root, 0.06, 0.06, 0.06, 0x6d5640, (i % 2 ? 1 : -1) * 0.245, 0.75 + (i % 3) * 0.1, -0.35 + Math.floor(i / 2) * 0.17, 0.4);
      for (const s of [-1, 1]) box(p.head, 0.14, 0.24, 0.16, 0xece2d2, s * 0.25, -0.12, 0.02, 0.4); // 鬍鬚毛
      snout(p, 0.18, 0.12, 0.1, 0xf0e6d8, -0.1, -0.22, 0x8d6e63);
      ears(p, 0.15, 0.17, 0.05, 0.12, 0.18, fur, BLACK, 0.2);
      for (const e of p.ears) box(e, 0.03, 0.14, 0.03, BLACK, 0, 0.26, 0, 0.3); // 黑耳毛
    },
  });
}
function moose() {
  const fur = 0x4a3326;
  const antler = 0xd8c39a;
  return beast({
    body: { w: 0.95, h: 1.0, d: 1.9, y: 1.85, color: fur },
    head: { w: 0.44, h: 0.5, d: 0.95, y: 2.3, z: -1.35, color: fur },
    legs: { w: 0.22, h: 1.4, x: 0.3, zf: -0.65, zb: 0.65, color: 0x8d7a66, paw: 0x2b1d14 },
    tail: { w: 0.14, h: 0.1, d: 0.14, y: 2.0, color: fur },
    eyeSize: 0.09,
    walkSpeed: 8,
    extras(p) {
      box(p.root, 1.0, 0.55, 0.8, 0x3a281d, 0, 2.4, -0.5, 0.45); // 膊頭隆起
      neckBox(p.root, 0.42, 0.5, fur, 2.1, -0.95, 2.3, -1.2);
      box(p.head, 0.46, 0.38, 0.42, 0x5a4030, 0, -0.08, -0.4, 0.45); // 大鼻
      box(p.head, 0.14, 0.38, 0.12, fur, 0, -0.4, 0.05, 0.4); // 頸鈴（dewlap）
      for (const s of [-1, 1]) { // 掌形鹿角
        const a = pivot(p.head, s * 0.22, 0.26, 0.2);
        box(a, 0.4, 0.1, 0.12, antler, s * 0.2, 0.05, 0, 0.3);
        const palm = box(a, 0.7, 0.08, 0.5, antler, s * 0.55, 0.22, -0.05, 0.3);
        palm.rotation.z = s * 0.35;
        for (let i = 0; i < 4; i++) box(a, 0.06, 0.2, 0.06, antler, s * (0.35 + i * 0.13), 0.34 + i * 0.05, -0.25 + i * 0.12, 0.3);
      }
      ears(p, 0.22, 0.2, 0.25, 0.1, 0.22, fur, null, 1.0);
    },
  });
}
function wolverine() {
  const fur = 0x3e2c22;
  const g = beast({
    body: { w: 0.48, h: 0.42, d: 0.85, y: 0.5, color: fur },
    head: { w: 0.4, h: 0.34, d: 0.36, y: 0.6, z: -0.55, color: fur },
    legs: { w: 0.14, h: 0.32, x: 0.16, zf: -0.28, zb: 0.28, color: 0x2a1d16, paw: 0x1a120e },
    tail: { w: 0.14, h: 0.14, d: 0.35, y: 0.58, color: fur, angle: 0.6 },
    eyeSize: 0.08,
    walkSpeed: 14,
    extras(p) {
      for (const s of [-1, 1]) box(p.root, 0.04, 0.14, 0.8, 0xc9a26b, s * 0.245, 0.58, 0.05, 0.3); // 兩邊淺色帶
      box(p.head, 0.42, 0.1, 0.3, 0x8d7a66, 0, 0.12, 0.0, 0.4);
      snout(p, 0.18, 0.12, 0.12, 0x5a4030, -0.06, -0.22);
      ears(p, 0.16, 0.13, 0.08, 0.1, 0.08, fur, null, 0.4);
    },
  });
  g.userData.height = 0.85;
  return g;
}
function brownBear() {
  const fur = 0x6b4426;
  return beast({
    body: { w: 1.0, h: 0.95, d: 1.7, y: 1.15, color: fur },
    head: { w: 0.66, h: 0.6, d: 0.6, y: 1.5, z: -1.15, color: fur },
    legs: { w: 0.32, h: 0.75, x: 0.32, zf: -0.55, zb: 0.55, color: 0x5a3820, paw: 0x3e2614 },
    tail: { w: 0.16, h: 0.14, d: 0.14, y: 1.35, color: fur },
    eyeSize: 0.1,
    walkSpeed: 9,
    extras(p) {
      box(p.root, 0.85, 0.45, 0.6, 0x7a5030, 0, 1.75, -0.55, 0.45); // 膊頭隆起
      snout(p, 0.3, 0.22, 0.22, 0x9a7050, -0.1, -0.38);
      ears(p, 0.24, 0.26, 0.05, 0.16, 0.14, fur, 0x4a2e18, 0.2);
    },
  });
}
function bison() {
  const fur = 0x4a3020;
  const shag = 0x6b4a2e;
  return beast({
    body: { w: 1.05, h: 1.05, d: 1.9, y: 1.4, color: fur },
    head: { w: 0.6, h: 0.62, d: 0.6, y: 1.35, z: -1.3, color: 0x2e1d14 },
    legs: { w: 0.26, h: 0.95, x: 0.32, zf: -0.6, zb: 0.65, color: 0x3a2618, paw: 0x1a120e },
    tail: { w: 0.08, h: 0.08, d: 0.55, y: 1.6, color: fur, tip: 0x2e1d14, angle: 1.2 },
    eyeSize: 0.09,
    walkSpeed: 9,
    extras(p) {
      box(p.root, 1.2, 1.2, 1.0, shag, 0, 1.75, -0.6, 0.45); // 大隆起 + 長毛
      box(p.root, 0.9, 0.5, 0.5, shag, 0, 1.0, -0.8, 0.45);
      box(p.head, 0.66, 0.5, 0.3, shag, 0, 0.2, 0.12, 0.45);
      box(p.head, 0.3, 0.4, 0.2, 0x2a1a10, 0, -0.42, -0.1, 0.4); // 鬚
      box(p.head, 0.34, 0.22, 0.12, 0x1f1510, 0, -0.12, -0.33, 0.4);
      for (const s of [-1, 1]) {
        const h = pivot(p.head, s * 0.32, 0.12, 0.0);
        box(h, 0.22, 0.09, 0.09, 0x1a1a1a, s * 0.1, 0, 0, 0.4);
        box(h, 0.08, 0.2, 0.08, 0x1a1a1a, s * 0.2, 0.1, 0, 0.4);
      }
    },
  });
}
function siberianTiger() {
  const g = ANIMALS_30['Sumatran Tiger']();
  g.scale.multiplyScalar(1.12);
  return g;
}

// ================= 名 → 模型 =================
export const RODEO_MODELS = {
  Zebra: zebra,
  Wildebeest: wildebeest,
  Warthog: warthog,
  Ostrich: ostrich,
  Giraffe: giraffe,
  Hippo: hippo,
  Rhino: rhino,
  Lion: lion,
  'African Elephant': elephantA,
  Cheetah: cheetah,
  Meerkat: meerkat,
  Roadrunner: roadrunner,
  Dromedary: camel(1),
  'Fennec Fox': fennec,
  'Sand Cat': sandCat,
  'Desert Tortoise': tortoise,
  'Gila Monster': gila,
  'Arabian Oryx': arabianOryx,
  Camel: camel(2),
  Addax: addax,
  'Snowshoe Hare': snowshoeHare,
  'Red Fox': redFox,
  Reindeer: reindeer,
  'Grey Wolf': greyWolf,
  Lynx: lynx,
  Moose: moose,
  Wolverine: wolverine,
  'Brown Bear': brownBear,
  Bison: bison,
  'Siberian Tiger': siberianTiger,
};
