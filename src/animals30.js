// 其餘 30 隻動物（Biome 4–6）嘅新設計：同頭 20 隻一樣嘅靚款
// 大眼（眼白 + 反光）、腳掌腳趾、花紋、識郁嘅耳／尾／翼
// 全部面向 -z。每個回傳 Group：userData.animate(time, moving)、userData.height、userData.move

import * as THREE from 'three';
import { box, pivot, cuteEyes, spike, BLACK, WHITE } from './modelKit.js';
import { beast, swimmer, bird, sideEyes } from './animals20.js';

const PI = Math.PI;

// ================= 北極 =================

function polarBear() {
  const fur = 0xf4f1e6;
  const shade = 0xe3dccb;
  return beast({
    body: { w: 1.3, h: 1.15, d: 2.05, y: 1.3, color: fur },
    head: { w: 0.82, h: 0.72, d: 0.8, y: 1.55, z: -1.35, color: fur },
    legs: { w: 0.46, h: 0.8, x: 0.4, zf: -0.62, zb: 0.62, color: fur, paw: shade, toes: 0x3e3a36 },
    tail: { w: 0.24, h: 0.22, d: 0.18, y: 1.5, color: fur },
    eyeSize: 0.12,
    extras(p) {
      box(p.root, 1.2, 0.3, 0.6, shade, 0, 1.85, -0.6, 0.4); // 膊頭隆起
      box(p.head, 0.46, 0.36, 0.38, fur, 0, -0.14, -0.5, 0.4); // 長嘴
      box(p.head, 0.2, 0.13, 0.07, BLACK, 0, -0.04, -0.69, 0.45); // 黑鼻
      box(p.head, 0.18, 0.03, 0.03, 0x5d4037, 0, -0.26, -0.69); // 口
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.3, 0.38, 0.1);
        box(ear, 0.2, 0.2, 0.12, fur, 0, 0.06, 0, 0.45);
        box(ear, 0.11, 0.11, 0.04, 0x9e9e9e, 0, 0.06, -0.06, 0.45);
        p.ears.push(ear);
      }
    },
  });
}

function arcticFox() {
  const fur = 0xfbfbfb;
  return beast({
    body: { w: 0.5, h: 0.46, d: 0.95, y: 0.64, color: fur },
    head: { w: 0.52, h: 0.44, d: 0.44, y: 0.92, z: -0.62, color: fur },
    legs: { w: 0.15, h: 0.44, x: 0.15, zf: -0.32, zb: 0.32, color: fur, paw: 0xe0e0e0 },
    tail: { w: 0.34, h: 0.34, d: 0.95, y: 0.74, color: fur, angle: -0.35, tip: 0xffffff },
    eyeSize: 0.1,
    eyeOpts: { iris: 0xffb300 },
    walkSpeed: 12,
    extras(p) {
      box(p.head, 0.24, 0.2, 0.3, fur, 0, -0.08, -0.3, 0.4); // 尖嘴
      box(p.head, 0.09, 0.07, 0.05, BLACK, 0, -0.03, -0.46, 0.45);
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.16, 0.28, 0.02);
        spike(ear, 0.11, 0.26, fur, 0, 0.1, 0);
        spike(ear, 0.06, 0.14, 0xf8bbd0, 0, 0.08, -0.03);
        p.ears.push(ear);
      }
      for (let i = 0; i < 6; i++) box(p.root, 0.06, 0.08, 0.06, 0xeceff1, ((i % 3) - 1) * 0.15, 0.9, -0.2 + Math.floor(i / 3) * 0.3, 0.4); // 毛毛
    },
  });
}

function caribou() {
  const fur = 0x8b6b4a;
  const antler = 0xe0cfa8;
  return beast({
    body: { w: 0.85, h: 0.85, d: 1.65, y: 1.6, color: fur },
    head: { w: 0.44, h: 0.44, d: 0.8, y: 2.25, z: -1.1, color: fur },
    legs: { w: 0.19, h: 1.2, x: 0.27, zf: -0.6, zb: 0.6, color: 0x5d4632, paw: 0x2b1d14 },
    tail: { w: 0.22, h: 0.2, d: 0.15, y: 1.8, color: WHITE },
    belly: 0xe8e0d0,
    eyeSize: 0.09,
    walkSpeed: 7,
    extraHeight: 1,
    extras(p) {
      const neck = box(p.root, 0.46, 0.75, 0.44, 0xece4d4, 0, 1.95, -0.85, 0.35); // 白色頸毛
      neck.rotation.x = -0.45;
      box(p.head, 0.3, 0.24, 0.3, 0x6d5238, 0, -0.08, -0.4, 0.4);
      box(p.head, 0.14, 0.08, 0.05, BLACK, 0, -0.02, -0.56, 0.45);
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.24, 0.15, 0.2);
        box(ear, 0.18, 0.08, 0.1, fur, s * 0.06, 0, 0, 0.4);
        p.ears.push(ear);
        // 鹿角：主枝 + 三條分枝 + 前面一塊鏟形
        const a = pivot(p.head, s * 0.15, 0.22, 0.12);
        a.rotation.z = s * -0.35;
        box(a, 0.08, 0.9, 0.08, antler, 0, 0.45, 0, 0.4);
        for (const [y, z, l] of [[0.35, -0.12, 0.35], [0.6, 0.08, 0.3], [0.85, -0.05, 0.28]]) {
          const b = box(a, 0.06, l, 0.06, antler, 0, y, z, 0.4);
          b.rotation.x = z < 0 ? -0.8 : 0.7;
        }
        box(a, 0.05, 0.22, 0.18, antler, 0, 0.1, -0.15, 0.4);
      }
    },
  });
}

function walrus() {
  const skin = 0xa8735a;
  const g = new THREE.Group();
  const root = pivot(g);
  box(root, 1.3, 1.0, 1.4, skin, 0, 0.62, -0.25, 0.4);
  const back = pivot(root, 0, 0.55, 0.4);
  box(back, 1.1, 0.8, 1.1, skin, 0, -0.08, 0.45, 0.4);
  const tail = pivot(back, 0, -0.15, 1.0);
  for (const s of [-1, 1]) box(tail, 0.35, 0.08, 0.5, 0x8d5e48, s * 0.22, -0.18, 0.2, 0.4);
  for (let i = 0; i < 6; i++) box(root, 0.5, 0.04, 0.04, 0x8d5e48, 0, 0.5 + i * 0.12, 0.45, 0.3); // 皺紋
  const head = pivot(root, 0, 1.15, -0.95);
  box(head, 0.85, 0.7, 0.7, skin, 0, 0, 0, 0.42);
  box(head, 0.75, 0.38, 0.3, 0xc9967a, 0, -0.18, -0.38, 0.45); // 鬚墊
  for (let i = 0; i < 10; i++) box(head, 0.03, 0.03, 0.06, 0xf5e6c8, ((i % 5) - 2) * 0.14, -0.12 - Math.floor(i / 5) * 0.12, -0.55, 0.3); // 鬚
  cuteEyes(head, 0.2, 0.15, -0.36, 0.1);
  for (const s of [-1, 1]) box(head, 0.1, 0.75, 0.1, 0xfff8e1, s * 0.16, -0.65, -0.4, 0.45); // 長象牙
  const flippers = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.65, 0.2, -0.45);
    box(p, 0.55, 0.08, 0.3, 0x8d5e48, s * 0.27, 0, 0, 0.4);
    return { p, s };
  });
  g.userData.animate = (t, moving) => {
    const sp = 3 + moving * 4;
    back.rotation.x = Math.sin(t * sp) * 0.12;
    tail.rotation.x = Math.sin(t * sp - 1) * 0.3;
    head.rotation.x = Math.sin(t * sp + 1) * 0.08;
    head.rotation.y = Math.sin(t * 0.6) * 0.25 * (1 - moving);
    flippers.forEach(({ p, s }) => (p.rotation.y = s * Math.sin(t * sp) * 0.4 * moving));
  };
  g.userData.height = 1.6;
  g.userData.move = 'walk';
  return g;
}

function ringedSeal() {
  const skin = 0x6f767c;
  const g = new THREE.Group();
  const root = pivot(g);
  box(root, 0.75, 0.6, 0.85, skin, 0, 0.34, -0.3, 0.42);
  box(root, 0.6, 0.2, 0.7, 0xb0b5b9, 0, 0.1, -0.3, 0.42);
  const back = pivot(root, 0, 0.32, 0.1);
  box(back, 0.62, 0.48, 0.75, skin, 0, -0.02, 0.32, 0.42);
  const tail = pivot(back, 0, -0.08, 0.7);
  for (const s of [-1, 1]) box(tail, 0.2, 0.06, 0.38, 0x5a6066, s * 0.13, -0.1, 0.16, 0.4);
  for (let i = 0; i < 12; i++) {
    const ring = box(i < 6 ? root : back, 0.12, 0.02, 0.12, 0xc5cacd, ((i * 3) % 5 - 2) * 0.12, i < 6 ? 0.65 : 0.23, (i < 6 ? -0.6 : 0.1) + (i % 3) * 0.2, 0.5);
    ring.scale.set(1, 1, 1);
  }
  const head = pivot(root, 0, 0.6, -0.8);
  box(head, 0.5, 0.46, 0.48, skin, 0, 0, 0, 0.45);
  box(head, 0.3, 0.2, 0.15, 0x8a8f94, 0, -0.1, -0.27, 0.45);
  box(head, 0.09, 0.06, 0.03, BLACK, 0, -0.04, -0.35, 0.45);
  cuteEyes(head, 0.13, 0.08, -0.25, 0.13); // 海豹大眼
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) box(head, 0.18, 0.015, 0.015, 0xeeeeee, s * 0.2, -0.1 + k * 0.03, -0.34, 0.3); // 鬚
  const flippers = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.38, 0.14, -0.38);
    box(p, 0.3, 0.06, 0.18, 0x5a6066, s * 0.15, 0, 0, 0.4);
    return { p, s };
  });
  g.userData.animate = (t, moving) => {
    const sp = 3 + moving * 5;
    back.rotation.x = Math.sin(t * sp) * 0.15;
    tail.rotation.x = Math.sin(t * sp - 1) * 0.3;
    head.rotation.x = Math.sin(t * sp + 1) * 0.1;
    head.rotation.z = Math.sin(t * 0.8) * 0.15; // 側頭
    flippers.forEach(({ p, s }) => (p.rotation.y = s * Math.sin(t * sp) * 0.4 * moving));
  };
  g.userData.height = 0.95;
  g.userData.move = 'walk';
  return g;
}

function penguin() {
  const g = new THREE.Group();
  const root = pivot(g);
  const black = 0x1c2128;
  box(root, 0.78, 1.15, 0.66, black, 0, 0.8, 0.02, 0.42);
  box(root, 0.58, 0.95, 0.1, WHITE, 0, 0.74, -0.31, 0.42);
  box(root, 0.5, 0.25, 0.08, 0xffe082, 0, 1.2, -0.31, 0.45); // 胸前黃色
  const head = pivot(root, 0, 1.58, 0);
  box(head, 0.56, 0.52, 0.54, black, 0, 0, 0, 0.42);
  for (const s of [-1, 1]) box(head, 0.06, 0.28, 0.24, 0xffb300, s * 0.28, -0.06, -0.04, 0.4); // 耳邊黃斑
  box(head, 0.14, 0.1, 0.3, 0x37474f, 0, -0.08, -0.38, 0.4); // 嘴
  box(head, 0.1, 0.06, 0.16, 0xff8f00, 0, -0.12, -0.4, 0.4);
  cuteEyes(head, 0.14, 0.06, -0.275, 0.11);
  const flippers = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.41, 1.25, 0);
    box(p, 0.08, 0.7, 0.28, black, 0, -0.33, 0, 0.4);
    box(p, 0.04, 0.5, 0.2, WHITE, -s * 0.03, -0.35, 0, 0.4);
    return { p, s };
  });
  const feet = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.17, 0.22, 0);
    box(p, 0.2, 0.06, 0.3, 0xff8f00, 0, -0.19, -0.09, 0.4);
    return p;
  });
  // 企鵝 BB 企喺腳面？太細就唔加。加一個雪花氣泡
  g.scale.setScalar(1.1);
  g.userData.animate = (t, moving) => {
    root.rotation.z = Math.sin(t * 8) * 0.15 * moving; // 搖搖擺擺咁行
    feet.forEach((f, i) => (f.position.y = 0.22 + Math.max(0, Math.sin(t * 8 + i * PI)) * 0.1 * moving));
    flippers.forEach(({ p, s }) => (p.rotation.z = s * (0.2 + Math.sin(t * 3) * 0.15 + moving * Math.abs(Math.sin(t * 8)) * 0.3)));
    head.rotation.y = Math.sin(t * 1.1) * 0.3;
  };
  g.userData.height = 2.1;
  g.userData.move = 'walk';
  return g;
}

function narwhal() {
  return swimmer({
    skin: 0x8a929b, belly: 0xd5dade, len: 2.7, w: 0.75, h: 0.7, eyeSize: 0.09, eyeZ: 0.5,
    extras({ root, mid }) {
      // 長牙（有螺旋紋）
      const tusk = pivot(root, -0.1, 0.05, -1.35);
      box(tusk, 0.07, 0.07, 1.7, 0xfff8e1, 0, 0, -0.85, 0.4);
      for (let i = 0; i < 8; i++) box(tusk, 0.085, 0.02, 0.05, 0xd7ccc8, 0, 0, -0.15 - i * 0.2, 0.3).rotation.z = 0.6;
      for (let i = 0; i < 12; i++) box(i < 6 ? root : mid, 0.1, 0.02, 0.1, 0x5f666d, ((i * 3) % 5 - 2) * 0.12, 0.36, (i % 6) * 0.18 - (i < 6 ? 1.1 : -0.2), 0.4); // 斑點
    },
  });
}

function beluga() {
  return swimmer({
    skin: 0xf3f7f8, belly: 0xe6ecee, len: 2.9, w: 0.82, h: 0.78, eyeSize: 0.09, eyeZ: 0.45,
    extras({ root }) {
      box(root, 0.74, 0.46, 0.55, 0xf3f7f8, 0, 0.33, -0.9, 0.48); // 圓圓大額頭（melon）
      box(root, 0.36, 0.05, 0.05, 0xb0bec5, 0, -0.2, -1.44, 0.3); // 笑口
      box(root, 0.24, 0.04, 0.04, 0xf48fb1, 0, -0.24, -1.42, 0.3);
    },
  });
}

function snowyOwl() {
  const g = bird({
    body: WHITE, belly: 0xffffff, head: WHITE, wing: 0xf2f2ee, wingTip: 0xe0e0e0, tail: 0xf2f2ee, beak: 0x37474f,
    size: 1.2, tailLen: 0.25, chunky: true, legColor: 0xf5f5f5, eyeOpts: { iris: 0xffd600 },
  });
  // 黑色斑點
  const root = g.children[0];
  for (let i = 0; i < 18; i++) box(root, 0.07, 0.05, 0.02, 0x37474f, ((i * 7) % 5 - 2) * 0.11, 0.55 + ((i * 3) % 6) * 0.08, 0.33, 0.3);
  return g;
}

// ================= 走私營 =================

function bigCat({ fur, belly, spots = null, stripes = false, size = 1, tailLen = 1.1, eyeIris = 0x9ccc65, thickTail = false }) {
  const g = beast({
    body: { w: 0.64, h: 0.6, d: 1.55, y: 0.98, color: fur },
    head: { w: 0.62, h: 0.54, d: 0.54, y: 1.24, z: -0.98, color: fur },
    legs: { w: 0.2, h: 0.68, x: 0.21, zf: -0.52, zb: 0.52, color: fur, paw: belly, toes: belly },
    tail: { w: thickTail ? 0.22 : 0.13, h: thickTail ? 0.22 : 0.13, d: tailLen, y: 1.1, color: fur, angle: -0.35, tip: stripes ? BLACK : fur },
    belly,
    eyeSize: 0.11,
    eyeOpts: { iris: eyeIris },
    walkSpeed: 9,
    extras(p) {
      box(p.head, 0.36, 0.22, 0.18, belly, 0, -0.14, -0.29, 0.45); // 嘴
      box(p.head, 0.11, 0.08, 0.05, 0xd81b60, 0, -0.05, -0.38, 0.45); // 粉紅鼻
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.22, 0.3, 0.05);
        box(ear, 0.16, 0.16, 0.08, fur, 0, 0.05, 0, 0.45);
        box(ear, 0.09, 0.09, 0.04, BLACK, 0, 0.05, 0.04, 0.45);
        p.ears.push(ear);
        for (let k = 0; k < 3; k++) box(p.head, 0.2, 0.015, 0.015, WHITE, s * 0.26, -0.14 + k * 0.04, -0.37, 0.3); // 鬚
      }
      if (spots) for (let i = 0; i < 30; i++) {
        const side = i % 3 === 0 ? 0 : i % 3 === 1 ? -1 : 1;
        const z = -0.65 + ((i * 7) % 13) * 0.105;
        if (side === 0) box(p.root, 0.12, 0.03, 0.12, spots, ((i * 5) % 5 - 2) * 0.11, 1.285, z, 0.4);
        else box(p.root, 0.03, 0.11, 0.11, spots, side * 0.325, 0.82 + ((i * 3) % 4) * 0.11, z, 0.4);
      }
      if (stripes) {
        for (const s of [-1, 1]) for (let i = 0; i < 7; i++) box(p.root, 0.03, 0.45, 0.07, BLACK, s * 0.325, 1.0, -0.65 + i * 0.22, 0.3);
        for (let i = 0; i < 5; i++) box(p.root, 0.5, 0.03, 0.07, BLACK, 0, 1.285, -0.6 + i * 0.3, 0.3);
        for (const s of [-1, 1]) box(p.head, 0.04, 0.2, 0.04, BLACK, s * 0.2, 0.05, -0.275, 0.3);
      }
    },
  });
  g.scale.setScalar(size);
  return g;
}

function ape({ fur, face, size = 1, silverBack = false, cheeks = false, beard = false, noseUp = false }) {
  const g = new THREE.Group();
  const root = pivot(g);
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.26, 0.75, 0.15);
    box(hip, 0.32, 0.75, 0.32, fur, 0, -0.37, 0, 0.35);
    box(hip, 0.34, 0.12, 0.42, face, 0, -0.72, -0.05, 0.4);
    return hip;
  });
  const torso = box(root, 0.95, 1.05, 0.65, fur, 0, 1.38, 0, 0.38);
  torso.rotation.x = 0.25;
  box(root, 0.6, 0.6, 0.1, face, 0, 1.3, -0.33, 0.4).rotation.x = 0.25; // 心口
  if (silverBack) box(root, 0.85, 0.55, 0.12, 0xb0b0b0, 0, 1.5, 0.35, 0.38).rotation.x = 0.25;
  const head = pivot(root, 0, 2.05, -0.32);
  box(head, 0.6, 0.6, 0.55, fur, 0, 0, 0, 0.42);
  box(head, 0.46, 0.4, 0.06, face, 0, -0.06, -0.28, 0.42);
  box(head, 0.32, 0.18, 0.12, face, 0, -0.18, -0.33, 0.45); // 嘴
  box(head, 0.12, 0.06, 0.03, BLACK, 0, noseUp ? 0.02 : -0.08, -0.35, 0.45);
  box(head, 0.18, 0.03, 0.02, 0x3e2723, 0, -0.22, -0.395, 0.3);
  cuteEyes(head, 0.11, 0.08, -0.315, 0.1, { iris: 0x6d4c41 });
  if (cheeks) for (const s of [-1, 1]) box(head, 0.2, 0.46, 0.1, face, s * 0.4, -0.05, -0.18, 0.45);
  if (beard) box(head, 0.36, 0.28, 0.12, fur, 0, -0.38, -0.24, 0.45);
  for (const s of [-1, 1]) box(head, 0.1, 0.14, 0.08, face, s * 0.31, 0.02, 0, 0.45); // 耳
  const arms = [-1, 1].map((s) => {
    const shoulder = pivot(root, s * 0.62, 1.8, -0.15);
    box(shoulder, 0.28, 1.45, 0.28, fur, 0, -0.68, 0, 0.38);
    box(shoulder, 0.3, 0.22, 0.32, face, 0, -1.42, 0, 0.4);
    shoulder.rotation.x = -0.2;
    return shoulder;
  });
  g.scale.setScalar(size);
  g.userData.animate = (t, moving) => {
    legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 7 + i * PI) * 0.5 * moving));
    arms.forEach((a, i) => (a.rotation.x = -0.2 + Math.sin(t * 7 + i * PI + PI) * 0.5 * moving));
    head.rotation.y = Math.sin(t * 0.8) * 0.3 * (1 - moving);
    head.rotation.z = Math.sin(t * 0.5) * 0.08;
    root.position.y = Math.abs(Math.sin(t * 7)) * 0.05 * moving;
    torso.scale.y = 1 + Math.sin(t * 2) * 0.02; // 呼吸
    if (!moving) arms[1].rotation.x = -0.2 - Math.max(0, Math.sin(t * 0.7)) * 0.6; // 間中舉手搔頭
  };
  g.userData.height = 2.4 * size;
  g.userData.move = 'walk';
  return g;
}

function rhino({ skin, dark, horns = 2, size = 1, hairy = false, folds = false }) {
  const g = beast({
    body: { w: 1.4, h: 1.15, d: 2.1, y: 1.32, color: skin },
    head: { w: 0.78, h: 0.7, d: 1.05, y: 1.25, z: -1.48, color: skin },
    legs: { w: 0.44, h: 0.82, x: 0.42, zf: -0.6, zb: 0.6, color: skin, paw: dark, toes: 0xd7ccc8 },
    tail: { w: 0.08, h: 0.08, d: 0.45, y: 1.6, color: skin, angle: 0.9, tip: 0x3e3a36 },
    eyeSize: 0.1,
    walkSpeed: 7,
    extras(p) {
      p.head.rotation.x = 0.22;
      spike(p.head, 0.18, horns === 1 ? 0.5 : 0.7, 0xbcae96, 0, 0.55, -0.38, -0.32);
      if (horns === 2) spike(p.head, 0.12, 0.32, 0xbcae96, 0, 0.45, -0.02, -0.18);
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.3, 0.38, 0.38);
        box(ear, 0.14, 0.32, 0.1, skin, 0, 0.12, 0, 0.45);
        if (hairy) box(ear, 0.12, 0.12, 0.1, 0x3e2723, 0, 0.32, 0, 0.45); // 耳仔毛
        p.ears.push(ear);
      }
      if (folds) for (const z of [-0.5, 0.15, 0.7]) box(p.root, 1.46, 0.08, 0.12, dark, 0, 1.3, z, 0.4); // 爪哇犀牛：好似盔甲咁嘅皮摺
      if (hairy) for (let i = 0; i < 16; i++) box(p.root, 0.08, 0.16, 0.08, 0x4e342e, ((i * 5) % 7 - 3) * 0.18, 1.9, ((i * 3) % 9 - 4) * 0.2, 0.3);
    },
  });
  g.scale.setScalar(size);
  return g;
}

// ================= 動物 36–50 再靚啲（小朋友 2026-10-17：「make all pets look good」）=================
// 呢度啲 a2_ 工具淨係俾下面呢 15 隻用（唔郁上面共用嘅 beast／bigCat／ape）

// 一圈「梅花」斑（雪豹、安第斯貓）：深色外圈 + 中間淺少少
function a2_rosette(parent, x, y, z, s, dark, mid, side) {
  if (side) {
    // 喺身側（面向 ±x）
    box(parent, 0.025, s, s, dark, x, y, z, 0.45);
    box(parent, 0.03, s * 0.55, s * 0.55, mid, x + Math.sign(x) * 0.005, y, z, 0.45);
  } else {
    box(parent, s, 0.025, s, dark, x, y, z, 0.45);
    box(parent, s * 0.55, 0.03, s * 0.55, mid, x, y + 0.005, z, 0.45);
  }
}
// 鬚：每邊三條
function a2_whiskers(head, x, y, z, len = 0.22) {
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const w = box(head, len, 0.012, 0.012, WHITE, s * (x + len / 2), y + (k - 1) * 0.035, z, 0.3);
    w.rotation.z = s * (k - 1) * -0.15;
  }
}
// 一條一節節嘅尾（每節可以有唔同色，例如雪豹／安第斯貓嘅環紋尾）
function a2_ringTail(root, y, z, segs, w, len, colorFn, droop = 0.08) {
  const piv = [];
  let parent = root;
  for (let i = 0; i < segs; i++) {
    const p = pivot(parent, 0, i === 0 ? y : 0, i === 0 ? z : len);
    const ww = w * (1 - i * 0.03);
    box(p, ww, ww, len * 1.04, colorFn(i), 0, 0, len / 2, 0.42);
    p.rotation.x = i === 0 ? -0.5 : droop;
    piv.push(p);
    parent = p;
  }
  return piv;
}

// ---------- 犀牛（爪哇犀牛：一隻角、盔甲咁嘅皮摺；蘇門答臘犀牛：最細、紅啡色毛、兩隻角）----------
function a2_rhino({ skin, dark, light, horns, hairy, size }) {
  const g = beast({
    body: { w: 1.45, h: 1.2, d: 2.2, y: 1.3, color: skin },
    head: { w: 0.8, h: 0.72, d: 1.1, y: 1.22, z: -1.55, color: skin },
    legs: { w: 0.46, h: 0.8, x: 0.44, zf: -0.64, zb: 0.64, color: skin, paw: dark, toes: 0xd7ccc8 },
    tail: { w: 0.09, h: 0.09, d: 0.5, y: 1.62, color: skin, angle: 0.95, tip: 0x3e3a36 },
    belly: light,
    eyeSize: 0.1,
    eyeOpts: { iris: 0x4e342e },
    walkSpeed: 7,
    extras(p) {
      p.head.rotation.x = 0.25;
      // 尖尖嘅上唇（識執嘢食）+ 鼻孔 + 口
      box(p.head, 0.42, 0.3, 0.3, light, 0, -0.22, -0.55, 0.42);
      box(p.head, 0.16, 0.12, 0.12, light, 0, -0.33, -0.72, 0.45);
      for (const s of [-1, 1]) box(p.head, 0.07, 0.07, 0.03, 0x2b2622, s * 0.12, -0.12, -0.7, 0.45);
      box(p.head, 0.3, 0.025, 0.025, 0x3e2723, 0, -0.37, -0.66, 0.3);
      // 角（啡啡灰灰，有少少層次）
      const hornC = 0x9e8f7a;
      spike(p.head, 0.2, horns === 1 ? 0.42 : 0.62, hornC, 0, 0.5, -0.42, -0.3);
      box(p.head, 0.36, 0.08, 0.36, dark, 0, 0.36, -0.42, 0.45); // 角底
      if (horns === 2) spike(p.head, 0.13, 0.28, hornC, 0, 0.44, -0.08, -0.15);
      // 皺眉 + 眼下皺紋
      for (const s of [-1, 1]) {
        box(p.head, 0.2, 0.05, 0.05, dark, s * 0.28, 0.14, -0.53, 0.4);
        box(p.head, 0.05, 0.25, 0.05, dark, s * 0.41, -0.12, -0.25, 0.4);
        const ear = pivot(p.head, s * 0.3, 0.38, 0.4);
        box(ear, 0.16, 0.34, 0.12, skin, 0, 0.13, 0, 0.45);
        box(ear, 0.09, 0.22, 0.04, light, 0, 0.13, -0.06, 0.45);
        box(ear, 0.18, 0.08, 0.14, hairy ? 0x3e2723 : dark, 0, 0.32, 0, 0.45); // 耳尖毛
        p.ears.push(ear);
      }
      if (!hairy) {
        // 爪哇犀牛：三條好深嘅皮摺，好似着咗盔甲；身側有一粒粒「鱗片」咁嘅皮紋
        for (const z of [-0.62, 0.12, 0.78]) {
          box(p.root, 1.5, 0.14, 0.14, dark, 0, 1.4, z, 0.45);
          for (const s of [-1, 1]) box(p.root, 0.12, 0.85, 0.12, dark, s * 0.73, 1.2, z, 0.45);
        }
        box(p.root, 1.48, 0.2, 0.75, skin, 0, 1.9, -0.25, 0.4); // 膊頭隆起
        for (let i = 0; i < 24; i++) {
          const s = i % 2 ? 1 : -1;
          box(p.root, 0.03, 0.09, 0.09, light, s * 0.73, 0.95 + ((i * 3) % 5) * 0.12, -0.9 + ((i * 7) % 12) * 0.16, 0.45);
        }
        box(p.neck, 0.86, 0.12, 0.12, dark, 0, 0.2, 0.45, 0.45); // 頸摺
      } else {
        // 蘇門答臘犀牛：成身紅啡色長毛（一撮撮），身細細圓圓
        const hair = [0x7a4a2e, 0x6e4128, 0x84553a];
        for (let i = 0; i < 70; i++) {
          const s = i % 3 === 0 ? 0 : i % 3 === 1 ? -1 : 1;
          const z = -0.98 + ((i * 7) % 21) * 0.095;
          const c = hair[i % 3];
          if (s === 0) box(p.root, 0.05, 0.1, 0.05, c, ((i * 5) % 11 - 5) * 0.12, 1.93, z, 0.3).rotation.set(0.5, 0, ((i % 4) - 1.5) * 0.3);
          else box(p.root, 0.05, 0.13, 0.05, c, s * 0.735, 0.95 + ((i * 3) % 7) * 0.12, z, 0.3).rotation.set(0.5, 0, s * 0.2);
        }
        box(p.head, 0.5, 0.06, 0.4, 0x6e4128, 0, 0.37, 0.2, 0.4); // 頭頂毛
        for (const s of [-1, 1]) box(p.root, 0.1, 0.5, 0.12, dark, s * 0.73, 1.25, -0.62, 0.45); // 淺淺皮摺
      }
      // 尾擺下擺下
      p.animate = (t, moving) => {
        if (p.tail) p.tail.rotation.z = Math.sin(t * 3) * 0.3;
        p.head.rotation.x = 0.25 + Math.sin(t * 1.4) * 0.03 * (1 - moving);
      };
    },
  });
  g.scale.setScalar(size);
  return g;
}
const a2_javanRhino = () => a2_rhino({ skin: 0x8c8780, dark: 0x6a655f, light: 0xa8a39b, horns: 1, hairy: false, size: 1 });
const a2_sumatranRhino = () => a2_rhino({ skin: 0x8a5a3e, dark: 0x5d3a24, light: 0xa77a5c, horns: 2, hairy: true, size: 0.8 });

function saola() {
  // 亞洲獨角獸：深栗色、面上好搶眼嘅白斑、兩條好長好直嘅角、腳有白圈
  const fur = 0x7a4b2a;
  const dark = 0x3e2614;
  return beast({
    body: { w: 0.7, h: 0.74, d: 1.4, y: 1.3, color: fur },
    head: { w: 0.44, h: 0.48, d: 0.64, y: 1.7, z: -0.9, color: fur },
    legs: { w: 0.16, h: 0.94, x: 0.24, zf: -0.5, zb: 0.5, color: dark, paw: 0x1a120a },
    tail: { w: 0.1, h: 0.34, d: 0.1, y: 1.48, color: fur, angle: 0.3, tip: BLACK },
    belly: 0x9a6b46,
    eyeSize: 0.095,
    eyeOpts: { iris: 0x4e342e },
    walkSpeed: 8,
    extraHeight: 0.75,
    extras(p) {
      box(p.root, 0.12, 0.05, 1.36, dark, 0, 1.68, 0, 0.4); // 背脊深色線
      box(p.root, 0.5, 0.42, 0.1, 0xf3ece2, 0, 1.38, -0.72, 0.4); // 白頸
      for (const s of [-1, 1]) {
        // 面上白斑：眼上面一大塊 + 鼻兩邊
        box(p.head, 0.06, 0.14, 0.2, WHITE, s * 0.215, 0.12, -0.2, 0.45);
        box(p.head, 0.06, 0.12, 0.26, WHITE, s * 0.215, -0.13, -0.22, 0.45);
        box(p.head, 0.06, 0.08, 0.08, 0x2b1d14, s * 0.215, 0.0, -0.06, 0.45); // 臉腺
        // 好長好直、向後微彎嘅角
        const horn = pivot(p.head, s * 0.1, 0.25, 0.12);
        horn.rotation.x = -0.62;
        for (let k = 0; k < 5; k++) box(horn, 0.07 - k * 0.006, 0.07 - k * 0.006, 0.22, k % 2 ? 0x3a3a3a : 0x262626, 0, 0, 0.11 + k * 0.21, 0.45);
        const ear = pivot(p.head, s * 0.24, 0.14, 0.14);
        box(ear, 0.22, 0.09, 0.13, fur, s * 0.07, 0, 0, 0.42);
        box(ear, 0.16, 0.04, 0.08, 0xf3ece2, s * 0.07, -0.03, -0.02, 0.42);
        p.ears.push(ear);
      }
      box(p.head, 0.28, 0.22, 0.2, 0x5d3a20, 0, -0.14, -0.38, 0.42); // 嘴
      box(p.head, 0.14, 0.08, 0.04, BLACK, 0, -0.08, -0.49, 0.45);
      box(p.head, 0.2, 0.04, 0.04, WHITE, 0, -0.24, -0.47, 0.4); // 下巴白
      // 腳：白色「襪」
      for (const l of p.legs) box(l.hip, 0.17, 0.08, 0.17, WHITE, 0, -0.78, 0, 0.4);
    },
  });
}

function pangolin() {
  // 穿山甲：成身一塊塊重疊、邊淺色嘅鱗片；粉紅色面；大爪；長長嘅鱗片尾
  const scale = 0x9c7246;
  const scale2 = 0xb38653;
  const edge = 0xd8b07a;
  const skin = 0xe9c7a6;
  const g = beast({
    body: { w: 0.62, h: 0.5, d: 1.2, y: 0.54, color: scale },
    head: { w: 0.32, h: 0.28, d: 0.52, y: 0.47, z: -0.78, color: skin },
    legs: { w: 0.14, h: 0.32, x: 0.23, zf: -0.38, zb: 0.38, color: skin, paw: 0x8d6e53, toes: 0x3e2723 },
    eyeSize: 0.07,
    walkSpeed: 7,
    swing: 0.45,
    extras(p) {
      // 一行行重疊鱗片（每塊翹起少少，有淺色邊）
      const rows = 8;
      for (let r = 0; r < rows; r++) for (let c = -2; c <= 2; c++) {
        const z = -0.52 + r * 0.15;
        const x = c * 0.15;
        const y = 0.82 - Math.abs(c) * Math.abs(c) * 0.06;
        const sc = pivot(p.root, x, y, z);
        sc.rotation.set(-0.3, 0, c * -0.38);
        box(sc, 0.2, 0.06, 0.18, (r + c) % 2 ? scale2 : scale, 0, 0, 0, 0.35);
        box(sc, 0.21, 0.03, 0.04, edge, 0, -0.01, 0.08, 0.35);
      }
      // 頭頂都有鱗片
      for (let k = 0; k < 3; k++) box(p.head, 0.24 - k * 0.04, 0.05, 0.12, k % 2 ? scale2 : scale, 0, 0.15, 0.12 - k * 0.12, 0.35).rotation.x = -0.25;
      box(p.head, 0.12, 0.1, 0.14, skin, 0, -0.05, -0.3, 0.45);
      box(p.head, 0.08, 0.06, 0.04, 0x5d4037, 0, -0.04, -0.38, 0.45); // 尖鼻
      box(p.root, 0.5, 0.18, 0.95, skin, 0, 0.32, 0, 0.4); // 粉紅肚
      // 長長嘅鱗片尾（一節節，會擺）
      let parent = p.root;
      const tail = [];
      for (let i = 0; i < 6; i++) {
        const seg = pivot(parent, 0, i === 0 ? 0.5 : 0, i === 0 ? 0.6 : 0.2);
        const w = 0.42 - i * 0.055;
        box(seg, w, 0.22 - i * 0.02, 0.24, i % 2 ? scale2 : scale, 0, 0, 0.1, 0.38);
        box(seg, w + 0.02, 0.05, 0.06, edge, 0, 0.1 - i * 0.01, 0.2, 0.35);
        seg.rotation.x = 0.12;
        tail.push(seg);
        parent = seg;
      }
      // 前腳大爪（掘地用）
      for (const l of p.legs.slice(0, 2)) for (const tx of [-1, 1]) box(l.hip, 0.04, 0.04, 0.14, 0x3e2723, tx * 0.04, -0.32, -0.1, 0.4);
      p.animate = (t, moving) => tail.forEach((s, i) => (s.rotation.y = Math.sin(t * 3 - i * 0.6) * 0.12 * (0.5 + moving)));
    },
  });
  return g;
}

function slowLoris() {
  // 懶猴：圓碌碌、毛茸茸，超大橙色眼 + 黑眼圈，中間一條白線，背脊一條深色線
  const fur = 0xb39a82;
  const fur2 = 0xc9b39c;
  const g = beast({
    body: { w: 0.44, h: 0.38, d: 0.6, y: 0.44, color: fur },
    head: { w: 0.48, h: 0.42, d: 0.38, y: 0.68, z: -0.42, color: fur2 },
    legs: { w: 0.12, h: 0.34, x: 0.15, zf: -0.2, zb: 0.2, color: 0x8d7764, paw: 0xd7c4b0 },
    eyes: false,
    walkSpeed: 3, // 好慢好慢
    swing: 0.3,
    extras(p) {
      for (const s of [-1, 1]) {
        const ring = box(p.head, 0.2, 0.24, 0.03, 0x4e342e, s * 0.11, 0.03, -0.195, 0.48); // 黑眼圈
        ring.rotation.z = s * -0.25;
        const ear = pivot(p.head, s * 0.2, 0.2, 0.05);
        box(ear, 0.1, 0.1, 0.05, 0x8d7764, 0, 0, 0, 0.5);
        box(ear, 0.06, 0.06, 0.02, 0xd7a0a0, 0, 0, -0.03, 0.5);
        p.ears.push(ear);
        box(p.head, 0.12, 0.12, 0.1, WHITE, s * 0.15, -0.13, -0.15, 0.45); // 白面頰
      }
      cuteEyes(p.head, 0.11, 0.03, -0.215, 0.16, { iris: 0xff9800 }); // 超大圓眼
      box(p.head, 0.055, 0.3, 0.02, WHITE, 0, 0.08, -0.205, 0.4); // 中間白線
      box(p.head, 0.08, 0.06, 0.03, 0x3e2723, 0, -0.1, -0.205, 0.45); // 鼻
      box(p.root, 0.09, 0.045, 0.55, 0x6d4c41, 0, 0.635, 0, 0.3); // 背脊深色線
      box(p.head, 0.1, 0.035, 0.3, 0x6d4c41, 0, 0.215, 0.0, 0.3);
      // 毛茸茸
      for (let i = 0; i < 10; i++) box(p.root, 0.08, 0.08, 0.08, fur2, ((i % 5) - 2) * 0.09, 0.63, -0.2 + Math.floor(i / 5) * 0.32, 0.5);
      // 慢慢伸手捉嘢（前腳舉起放低）
      p.animate = (t, moving) => {
        if (!moving) p.legs[0].hip.rotation.x = -Math.max(0, Math.sin(t * 0.6)) * 0.9;
        p.head.rotation.z = Math.sin(t * 0.5) * 0.1;
      };
    },
  });
  return g;
}

// ---------- 雪豹 ----------
function a2_snowLeopard() {
  const fur = 0xe8e3d6;
  const fur2 = 0xd6cfbf;
  const dark = 0x4a4540;
  const mid = 0xc8bfae;
  const g = beast({
    body: { w: 0.66, h: 0.62, d: 1.6, y: 0.95, color: fur },
    head: { w: 0.64, h: 0.56, d: 0.56, y: 1.2, z: -1.0, color: fur },
    legs: { w: 0.24, h: 0.66, x: 0.22, zf: -0.54, zb: 0.54, color: fur, paw: WHITE, toes: fur2 },
    belly: WHITE,
    eyeSize: 0.115,
    eyeOpts: { iris: 0x80cbc4 },
    walkSpeed: 8,
    extras(p) {
      box(p.head, 0.38, 0.22, 0.2, WHITE, 0, -0.15, -0.3, 0.45); // 嘴
      box(p.head, 0.12, 0.08, 0.05, 0xc17a8a, 0, -0.06, -0.4, 0.45); // 粉紅鼻
      box(p.head, 0.16, 0.03, 0.03, 0x5d4037, 0, -0.24, -0.4, 0.3);
      a2_whiskers(p.head, 0.12, -0.14, -0.39);
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.22, 0.28, 0.08);
        box(ear, 0.15, 0.13, 0.07, fur, 0, 0.04, 0, 0.5); // 細細圓耳
        box(ear, 0.09, 0.08, 0.03, dark, 0, 0.04, 0.035, 0.5);
        p.ears.push(ear);
        box(p.head, 0.03, 0.12, 0.03, dark, s * 0.17, 0.2, -0.285, 0.4); // 額頭細斑
        box(p.head, 0.18, 0.2, 0.08, WHITE, s * 0.24, -0.14, -0.18, 0.45); // 面頰毛
      }
      // 梅花斑（身側 + 背）
      for (let i = 0; i < 26; i++) {
        const side = i % 3 === 0 ? 0 : i % 3 === 1 ? -1 : 1;
        const z = -0.68 + ((i * 7) % 13) * 0.11;
        if (side === 0) a2_rosette(p.root, ((i * 5) % 5 - 2) * 0.12, 1.27, z, 0.13, dark, mid, false);
        else a2_rosette(p.root, side * 0.335, 0.8 + ((i * 3) % 4) * 0.12, z, 0.13, dark, mid, true);
      }
      for (const l of p.legs) for (let k = 0; k < 2; k++) box(l.hip, 0.25, 0.06, 0.06, dark, 0, -0.2 - k * 0.18, -0.1, 0.4);
      box(p.root, 0.7, 0.3, 0.5, WHITE, 0, 0.82, -0.58, 0.45); // 心口白毛
      // 超長、超粗、毛茸茸嘅尾（有環紋，尾尖翹起）
      const tail = a2_ringTail(p.root, 1.08, 0.8, 7, 0.28, 0.26, (i) => (i % 2 ? dark : fur), 0.12);
      p.animate = (t, moving) => tail.forEach((s, i) => {
        s.rotation.y = Math.sin(t * 2.2 - i * 0.5) * 0.18;
        if (i > 3) s.rotation.x = -0.18 + Math.sin(t * 1.5 + i) * 0.05; // 尾尖向上
      });
    },
  });
  return g;
}

// ================= 採礦山 =================

function andeanBear() {
  // 眼鏡熊：黑色、面上有奶白色「眼鏡」花紋一路落到心口
  const fur = 0x241f1b;
  const cream = 0xf0dcae;
  const g = beast({
    body: { w: 1.0, h: 0.92, d: 1.55, y: 1.02, color: fur },
    head: { w: 0.7, h: 0.62, d: 0.62, y: 1.34, z: -1.02, color: fur },
    legs: { w: 0.34, h: 0.62, x: 0.31, zf: -0.5, zb: 0.5, color: fur, paw: 0x15120f, toes: 0x8d8d8d },
    tail: { w: 0.15, h: 0.15, d: 0.1, y: 1.15, color: fur },
    eyes: false,
    walkSpeed: 7,
    extras(p) {
      box(p.root, 0.98, 0.3, 0.6, 0x2e2823, 0, 1.52, -0.45, 0.45); // 膊頭
      for (const s of [-1, 1]) {
        // 眼鏡：眼周圍一圈奶白色 + 落去嘴邊嘅線
        const ring = box(p.head, 0.26, 0.26, 0.03, cream, s * 0.16, 0.06, -0.32, 0.5);
        ring.rotation.z = s * 0.2;
        box(p.head, 0.13, 0.13, 0.035, fur, s * 0.16, 0.06, -0.33, 0.5);
        box(p.head, 0.06, 0.2, 0.03, cream, s * 0.24, -0.12, -0.32, 0.45);
        const ear = pivot(p.head, s * 0.26, 0.34, 0.06);
        box(ear, 0.17, 0.17, 0.1, fur, 0, 0.05, 0, 0.5);
        box(ear, 0.09, 0.09, 0.03, 0x4a4039, 0, 0.05, -0.05, 0.5);
        p.ears.push(ear);
      }
      cuteEyes(p.head, 0.16, 0.05, -0.345, 0.09, { iris: 0x5d4037 });
      box(p.head, 0.34, 0.26, 0.22, 0xd8c49a, 0, -0.16, -0.37, 0.42); // 淺色嘴
      box(p.head, 0.13, 0.08, 0.05, BLACK, 0, -0.08, -0.485, 0.45);
      box(p.head, 0.16, 0.03, 0.03, 0x3e2723, 0, -0.25, -0.48, 0.3);
      // 心口一條「V」字奶白色紋
      for (const s of [-1, 1]) box(p.root, 0.12, 0.42, 0.06, cream, s * 0.16, 0.98, -0.785, 0.45).rotation.z = s * 0.45;
      box(p.root, 0.2, 0.12, 0.06, cream, 0, 0.78, -0.785, 0.45);
      // 毛：膊頭同背有幾撮
      for (let i = 0; i < 8; i++) box(p.root, 0.12, 0.1, 0.12, 0x332c26, ((i % 4) - 1.5) * 0.22, 1.5, -0.2 + Math.floor(i / 4) * 0.5, 0.5);
    },
  });
  return g;
}

function ethiopianWolf() {
  // 埃塞俄比亞狼：鐵鏽紅色、白色喉嚨同肚、長長幼幼嘅嘴、好大隻嘅尖耳、尾巴黑尖
  const fur = 0xc8612a;
  const fur2 = 0xdb7a3d;
  const g = beast({
    body: { w: 0.46, h: 0.46, d: 1.1, y: 0.9, color: fur },
    head: { w: 0.38, h: 0.36, d: 0.38, y: 1.17, z: -0.7, color: fur2 },
    legs: { w: 0.13, h: 0.7, x: 0.16, zf: -0.4, zb: 0.4, color: fur, paw: WHITE },
    tail: { w: 0.2, h: 0.2, d: 0.7, y: 0.97, color: fur, angle: 0.5, tip: BLACK },
    belly: WHITE,
    eyeSize: 0.08,
    eyeOpts: { iris: 0xffb300 },
    walkSpeed: 11,
    extras(p) {
      box(p.root, 0.34, 0.36, 0.18, WHITE, 0, 0.9, -0.55, 0.42); // 白頸
      box(p.root, 0.08, 0.04, 1.0, 0x9c4a1e, 0, 1.135, 0.05, 0.4); // 背脊深色
      box(p.head, 0.17, 0.15, 0.38, fur2, 0, -0.08, -0.33, 0.4); // 好長嘅嘴
      box(p.head, 0.15, 0.06, 0.34, WHITE, 0, -0.14, -0.33, 0.4);
      box(p.head, 0.08, 0.06, 0.04, BLACK, 0, -0.03, -0.52, 0.45);
      box(p.head, 0.24, 0.1, 0.1, WHITE, 0, -0.12, -0.15, 0.45); // 下巴白
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.12, 0.27, 0.02);
        spike(ear, 0.1, 0.34, fur, 0, 0.13, 0);
        spike(ear, 0.05, 0.22, WHITE, 0, 0.1, -0.03);
        p.ears.push(ear);
        box(p.head, 0.05, 0.05, 0.05, WHITE, s * 0.12, 0.13, -0.19, 0.45); // 眼上白點
      }
      for (const l of p.legs) box(l.hip, 0.14, 0.25, 0.14, 0xf3e4d6, 0, -0.55, 0, 0.4); // 白腳
      box(p.tail, 0.22, 0.22, 0.25, WHITE, 0, 0, 0.08, 0.4); // 尾巴底白
    },
  });
  return g;
}

function pygmyPossum() {
  // 山地侏儒負鼠：好細隻、灰啡色、大大對黑眼、粉紅細手、捲住嘅粉紅長尾
  const fur = 0x8e8074;
  const fur2 = 0xa89a8d;
  const g = beast({
    body: { w: 0.32, h: 0.28, d: 0.42, y: 0.27, color: fur },
    head: { w: 0.34, h: 0.3, d: 0.28, y: 0.38, z: -0.3, color: fur2 },
    legs: { w: 0.08, h: 0.14, x: 0.11, zf: -0.13, zb: 0.13, color: 0xf3b6c2, toes: 0xf48fb1 },
    belly: 0xe6ddd3,
    eyes: false,
    walkSpeed: 14,
    extras(p) {
      cuteEyes(p.head, 0.08, 0.03, -0.145, 0.11, { pupil: 0x111111 }); // 超大黑眼
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.15, 0.16, 0.02);
        box(ear, 0.14, 0.14, 0.03, fur, 0, 0.05, 0, 0.5);
        box(ear, 0.09, 0.09, 0.02, 0xf8bbd0, 0, 0.05, -0.02, 0.5);
        p.ears.push(ear);
        box(p.head, 0.1, 0.1, 0.08, 0xe6ddd3, s * 0.12, -0.08, -0.1, 0.5); // 胖胖面頰
        box(p.head, 0.06, 0.04, 0.03, 0x4e4038, s * 0.08, 0.03, -0.148, 0.4); // 眼周深色
      }
      box(p.head, 0.06, 0.05, 0.03, 0xf48fb1, 0, -0.06, -0.15, 0.45);
      a2_whiskers(p.head, 0.04, -0.06, -0.15, 0.1);
      box(p.root, 0.06, 0.03, 0.38, 0x6d6158, 0, 0.415, 0, 0.4); // 背脊深色線
      // 粉紅色長尾：一節節捲起
      let parent = p.root;
      const tail = [];
      for (let i = 0; i < 8; i++) {
        const seg = pivot(parent, 0, i === 0 ? 0.24 : 0, i === 0 ? 0.2 : 0.07);
        box(seg, 0.045, 0.045, 0.08, 0xe8b4bc, 0, 0, 0.035, 0.45);
        seg.rotation.x = i === 0 ? -0.3 : -0.32; // 越嚟越捲
        tail.push(seg);
        parent = seg;
      }
      p.animate = (t, moving) => tail.forEach((s, i) => (s.rotation.y = Math.sin(t * 3 + i * 0.4) * 0.08));
    },
  });
  return g;
}

// ---------- 金絲猴：金色長毛披肩、藍色面、朝天鼻、長尾 ----------
function a2_snubMonkey() {
  const gold = 0xf2a93b;
  const gold2 = 0xffc864;
  const back = 0x7a4e2a;
  const face = 0x8fc3e6;
  const g = new THREE.Group();
  const root = pivot(g);
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.2, 0.6, 0.15);
    box(hip, 0.26, 0.6, 0.26, gold, 0, -0.3, 0, 0.38);
    box(hip, 0.27, 0.1, 0.34, 0x5d4037, 0, -0.58, -0.04, 0.4);
    return hip;
  });
  const torso = box(root, 0.72, 0.85, 0.52, gold, 0, 1.08, 0, 0.4);
  torso.rotation.x = 0.2;
  box(root, 0.62, 0.55, 0.1, gold2, 0, 1.0, -0.27, 0.42).rotation.x = 0.2; // 心口淺金
  box(root, 0.6, 0.5, 0.14, back, 0, 1.28, 0.26, 0.4).rotation.x = 0.2; // 背深啡
  // 金色長毛披肩（一條條垂落嚟）
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    const strand = box(root, 0.12, 0.42, 0.12, i % 2 ? gold2 : gold, Math.cos(a) * 0.38, 1.32, Math.sin(a) * 0.3, 0.45);
    strand.rotation.z = Math.cos(a) * 0.35;
    strand.rotation.x = Math.sin(a) * 0.35;
  }
  const head = pivot(root, 0, 1.68, -0.18);
  box(head, 0.5, 0.48, 0.46, gold, 0, 0, 0, 0.42);
  box(head, 0.52, 0.18, 0.3, back, 0, 0.22, 0.08, 0.45); // 頭頂深啡毛
  box(head, 0.36, 0.34, 0.06, face, 0, -0.04, -0.235, 0.45); // 藍色面
  for (const s of [-1, 1]) {
    box(head, 0.1, 0.36, 0.14, gold2, s * 0.28, -0.02, -0.12, 0.45); // 面兩邊金毛
    box(head, 0.08, 0.1, 0.08, 0x6aa6cf, s * 0.07, 0.0, -0.27, 0.45); // 朝天鼻孔
  }
  cuteEyes(head, 0.1, 0.07, -0.27, 0.085, { iris: 0x6d4c41 });
  box(head, 0.12, 0.09, 0.08, 0x6aa6cf, 0, -0.02, -0.28, 0.45); // 鼻（向上）
  box(head, 0.22, 0.1, 0.06, 0xf4c7b8, 0, -0.16, -0.27, 0.45); // 粉紅嘴唇
  const arms = [-1, 1].map((s) => {
    const sh = pivot(root, s * 0.45, 1.38, -0.1);
    box(sh, 0.22, 1.0, 0.22, gold, 0, -0.48, 0, 0.4);
    box(sh, 0.24, 0.16, 0.26, 0x5d4037, 0, -0.98, 0, 0.4);
    sh.rotation.x = -0.25;
    return sh;
  });
  // 長尾（一節節）
  let parent = root;
  const tail = [];
  for (let i = 0; i < 7; i++) {
    const seg = pivot(parent, 0, i === 0 ? 0.75 : 0, i === 0 ? 0.3 : 0.22);
    box(seg, 0.12, 0.12, 0.24, i === 6 ? gold2 : gold, 0, 0, 0.11, 0.45);
    seg.rotation.x = i === 0 ? 0.5 : -0.12;
    tail.push(seg);
    parent = seg;
  }
  g.scale.setScalar(0.75);
  g.userData.animate = (t, moving) => {
    legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 7 + i * PI) * 0.5 * moving));
    arms.forEach((a, i) => (a.rotation.x = -0.25 + Math.sin(t * 7 + i * PI + PI) * 0.5 * moving));
    head.rotation.y = Math.sin(t * 0.8) * 0.35 * (1 - moving);
    head.rotation.z = Math.sin(t * 0.5) * 0.08;
    root.position.y = Math.abs(Math.sin(t * 7)) * 0.05 * moving;
    torso.scale.y = 1 + Math.sin(t * 2) * 0.02;
    tail.forEach((s, i) => (s.rotation.y = Math.sin(t * 2 - i * 0.5) * 0.15));
    if (!moving) arms[1].rotation.x = -0.25 - Math.max(0, Math.sin(t * 0.7)) * 0.7; // 間中舉手
  };
  g.userData.height = 2.0 * 0.75;
  g.userData.move = 'walk';
  return g;
}

function takin() {
  // 羚牛：金黃色長毛、大大個深色「駝鹿鼻」、粗粗向外再向後彎嘅角、背脊有駝峰
  const fur = 0xd9b04f;
  const fur2 = 0xe8c66a;
  const face = 0x5d4031;
  const g = beast({
    body: { w: 1.1, h: 1.02, d: 1.7, y: 1.22, color: fur },
    head: { w: 0.62, h: 0.62, d: 0.8, y: 1.32, z: -1.12, color: face },
    legs: { w: 0.3, h: 0.74, x: 0.34, zf: -0.58, zb: 0.58, color: 0x4e3526, paw: 0x22170f },
    tail: { w: 0.14, h: 0.14, d: 0.12, y: 1.45, color: fur },
    belly: 0xb88d3c,
    eyeSize: 0.085,
    eyeOpts: { iris: 0x4e342e },
    walkSpeed: 6,
    extras(p) {
      box(p.root, 1.14, 0.42, 0.95, fur2, 0, 1.78, -0.35, 0.42); // 膊頭駝峰金毛
      // 長毛（身兩邊垂落）
      for (let i = 0; i < 18; i++) {
        const s = i % 2 ? 1 : -1;
        box(p.root, 0.08, 0.32, 0.16, i % 3 ? fur2 : 0xc79a40, s * 0.56, 0.78, -0.75 + Math.floor(i / 2) * 0.19, 0.4);
      }
      // 粗角：由頭頂向兩邊出，再向後向上彎（好似角馬）
      for (const s of [-1, 1]) {
        const horn = pivot(p.head, s * 0.18, 0.3, 0.05);
        box(horn, 0.22, 0.16, 0.2, 0x2e211a, s * 0.1, 0, 0, 0.45);
        box(horn, 0.2, 0.13, 0.16, 0x3e2b20, s * 0.28, -0.05, 0.05, 0.45);
        const tip = box(horn, 0.11, 0.3, 0.11, 0x4a3628, s * 0.38, 0.1, 0.16, 0.45);
        tip.rotation.x = 0.5;
        tip.rotation.z = s * -0.3;
        const ear = pivot(p.head, s * 0.33, 0.06, 0.18);
        box(ear, 0.18, 0.08, 0.12, face, s * 0.06, 0, 0, 0.4);
        p.ears.push(ear);
      }
      // 大鼻（似駝鹿）+ 鼻孔
      box(p.head, 0.56, 0.36, 0.34, 0x3e2b20, 0, -0.14, -0.36, 0.45);
      box(p.head, 0.5, 0.12, 0.14, 0x4e3526, 0, 0.06, -0.48, 0.45);
      for (const s of [-1, 1]) box(p.head, 0.08, 0.08, 0.03, BLACK, s * 0.12, -0.12, -0.535, 0.45);
      box(p.head, 0.66, 0.2, 0.4, fur, 0, 0.25, 0.2, 0.45); // 後腦金毛
    },
  });
  return g;
}

function desman() {
  // 比利牛斯山水鼴：深啡色、長長識郁嘅「象鼻」、好大嘅蹼腳、扁長尾、銀色肚
  const fur = 0x5a4738;
  const fur2 = 0x6d5848;
  const g = beast({
    body: { w: 0.3, h: 0.24, d: 0.5, y: 0.24, color: fur },
    head: { w: 0.22, h: 0.2, d: 0.22, y: 0.26, z: -0.33, color: fur2 },
    legs: { w: 0.08, h: 0.12, x: 0.12, zf: -0.15, zb: 0.15, color: 0x3e2b1a, paw: 0x3e2b1a },
    belly: 0xb7aca2,
    eyeSize: 0.05,
    walkSpeed: 14,
    extras(p) {
      // 長鼻：三節，尾端粉紅
      let parent = p.head;
      const nose = [];
      for (let i = 0; i < 3; i++) {
        const seg = pivot(parent, 0, i === 0 ? -0.03 : 0, i === 0 ? -0.1 : -0.1);
        box(seg, 0.07 - i * 0.008, 0.06 - i * 0.006, 0.11, i === 2 ? 0xe57393 : 0x3e2b20, 0, 0, -0.05, 0.45);
        nose.push(seg);
        parent = seg;
      }
      a2_whiskers(p.head, 0.03, -0.05, -0.2, 0.12);
      // 好大嘅蹼腳（後腳）
      for (const l of p.legs.slice(2)) box(l.hip, 0.16, 0.03, 0.2, 0x2b1d14, 0, -0.12, -0.04, 0.4);
      // 扁長尾（有鱗紋）
      const tail = pivot(p.root, 0, 0.2, 0.25);
      for (let i = 0; i < 5; i++) box(tail, 0.07 - i * 0.008, 0.1, 0.1, i % 2 ? 0x2b1d14 : 0x3e2b1a, 0, 0, 0.05 + i * 0.1, 0.4);
      // 毛：濕濕地閃
      box(p.root, 0.32, 0.06, 0.5, 0x7a6555, 0, 0.36, 0, 0.45, { roughness: 0.25 });
      p.animate = (t) => {
        nose.forEach((s, i) => {
          s.rotation.y = Math.sin(t * 4 + i) * 0.35; // 鼻郁嚟郁去聞嘢
          s.rotation.x = Math.sin(t * 3 + i) * 0.15;
        });
        tail.rotation.y = Math.sin(t * 5) * 0.3;
      };
    },
  });
  return g;
}

function muskDeer() {
  // 喜馬拉雅麝：灰啡色有淺色斑點、大大對兔仔耳、長長獠牙、後腳長過前腳（屁股高高）
  const fur = 0x7d6248;
  const fur2 = 0x8f7458;
  const g = beast({
    body: { w: 0.44, h: 0.48, d: 0.92, y: 0.8, color: fur },
    head: { w: 0.34, h: 0.34, d: 0.44, y: 1.04, z: -0.62, color: fur2 },
    legs: { w: 0.11, h: 0.6, x: 0.15, zf: -0.32, zb: 0.32, color: 0x4e3a28, paw: 0x22170f },
    tail: { w: 0.08, h: 0.08, d: 0.06, y: 0.95, color: fur },
    belly: 0xc9ad8a,
    eyeSize: 0.085,
    eyeOpts: { iris: 0x3e2723 },
    walkSpeed: 10,
    extras(p) {
      p.root.rotation.x = -0.07; // 屁股高過膊頭
      for (const l of p.legs.slice(2)) l.hip.scale.y = 1.12;
      // 淺色斑點
      for (let i = 0; i < 14; i++) {
        const s = i % 2 ? 1 : -1;
        box(p.root, 0.03, 0.07, 0.07, 0xd9c19a, s * 0.225, 0.72 + ((i * 3) % 4) * 0.08, -0.35 + ((i * 5) % 7) * 0.12, 0.45);
      }
      box(p.root, 0.28, 0.24, 0.14, 0xe8d8bf, 0, 0.8, -0.45, 0.42); // 頸白紋
      for (const s of [-1, 1]) {
        box(p.root, 0.04, 0.3, 0.1, 0xe8d8bf, s * 0.11, 0.82, -0.46, 0.4);
        const ear = pivot(p.head, s * 0.17, 0.2, 0.08);
        box(ear, 0.07, 0.32, 0.2, fur2, 0, 0.12, 0, 0.45); // 大耳
        box(ear, 0.03, 0.24, 0.13, 0xe8c9b0, -s * 0.02, 0.12, -0.02, 0.45);
        p.ears.push(ear);
        // 長長尖獠牙（由上顎垂落）
        const fang = box(p.head, 0.035, 0.22, 0.035, 0xfffaf0, s * 0.055, -0.25, -0.18, 0.4);
        fang.rotation.x = 0.25;
      }
      box(p.head, 0.2, 0.16, 0.16, 0x5d4637, 0, -0.08, -0.26, 0.42); // 嘴
      box(p.head, 0.08, 0.06, 0.04, BLACK, 0, -0.04, -0.345, 0.45);
    },
  });
  return g;
}

// ---------- 安第斯貓：銀灰色、橙啡色斑同橫紋、超粗超長有環紋嘅尾 ----------
function a2_andeanCat() {
  const fur = 0xc6beb1;
  const fur2 = 0xd8d1c5;
  const spot = 0xa0673a;
  const ring = 0x5d4a3a;
  const g = beast({
    body: { w: 0.42, h: 0.4, d: 0.98, y: 0.6, color: fur },
    head: { w: 0.42, h: 0.38, d: 0.38, y: 0.78, z: -0.62, color: fur2 },
    legs: { w: 0.13, h: 0.42, x: 0.14, zf: -0.32, zb: 0.32, color: fur, paw: 0xeeeae2 },
    belly: 0xeeeae2,
    eyeSize: 0.085,
    eyeOpts: { iris: 0xc0ca33 },
    walkSpeed: 10,
    extras(p) {
      box(p.head, 0.24, 0.15, 0.14, 0xf3efe8, 0, -0.1, -0.2, 0.45);
      box(p.head, 0.08, 0.06, 0.04, 0xb56d7a, 0, -0.04, -0.27, 0.45);
      a2_whiskers(p.head, 0.08, -0.09, -0.27, 0.16);
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.15, 0.22, 0.04);
        box(ear, 0.13, 0.15, 0.05, fur, 0, 0.05, 0, 0.45); // 大圓耳
        box(ear, 0.08, 0.09, 0.02, 0x5d4a3a, 0, 0.05, 0.03, 0.45);
        p.ears.push(ear);
        box(p.head, 0.03, 0.12, 0.03, spot, s * 0.12, -0.04, -0.195, 0.4); // 面上兩條紋
      }
      // 身上橙啡色斑 + 橫紋
      for (let i = 0; i < 20; i++) {
        const s = i % 2 ? 1 : -1;
        box(p.root, 0.025, 0.08, 0.1, spot, s * 0.215, 0.52 + ((i * 3) % 4) * 0.07, -0.42 + ((i * 5) % 9) * 0.1, 0.45);
      }
      for (let i = 0; i < 4; i++) box(p.root, 0.36, 0.025, 0.06, spot, 0, 0.805, -0.3 + i * 0.2, 0.4);
      for (const l of p.legs) box(l.hip, 0.14, 0.04, 0.04, ring, 0, -0.18, -0.06, 0.4);
      // 超粗超長嘅尾，一圈圈深色環紋（佢最出名嘅特徵）
      const tail = a2_ringTail(p.root, 0.66, 0.5, 8, 0.2, 0.15, (i) => (i % 2 ? ring : fur2), 0.06);
      p.animate = (t, moving) => tail.forEach((s, i) => (s.rotation.y = Math.sin(t * 2.5 - i * 0.45) * 0.16));
    },
  });
  return g;
}

function volcanoRabbit() {
  // 火山兔：好細隻、深啡色、超短圓耳、睇唔到條尾，圓碌碌，跳下跳下
  const fur = 0x5f4a3b;
  const fur2 = 0x725a48;
  const g = beast({
    body: { w: 0.32, h: 0.3, d: 0.4, y: 0.26, color: fur },
    head: { w: 0.3, h: 0.27, d: 0.27, y: 0.4, z: -0.25, color: fur2 },
    legs: { w: 0.09, h: 0.12, x: 0.1, zf: -0.12, zb: 0.12, color: fur, paw: 0x4e3a2e },
    belly: 0xa08a77,
    eyeSize: 0.08,
    eyeOpts: { iris: 0x3e2723 },
    walkSpeed: 16,
    swing: 0.9,
    extras(p) {
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.09, 0.16, 0.03);
        box(ear, 0.1, 0.12, 0.04, fur, 0, 0.04, 0, 0.5); // 細細圓耳（火山兔耳仔短）
        box(ear, 0.06, 0.07, 0.02, 0xf2b0bd, 0, 0.04, -0.02, 0.5);
        p.ears.push(ear);
        box(p.head, 0.1, 0.1, 0.08, 0x8a7360, s * 0.1, -0.08, -0.09, 0.5); // 胖面頰
      }
      box(p.head, 0.06, 0.04, 0.02, 0xf48fb1, 0, -0.04, -0.14, 0.45);
      box(p.head, 0.1, 0.06, 0.03, 0xd7c8b8, 0, -0.08, -0.14, 0.45); // 白嘴
      a2_whiskers(p.head, 0.04, -0.06, -0.14, 0.12);
      // 黑色「頸巾」花紋 + 毛茸茸背
      box(p.root, 0.3, 0.06, 0.1, 0x3a2c22, 0, 0.36, -0.17, 0.45);
      for (let i = 0; i < 6; i++) box(p.root, 0.08, 0.06, 0.08, fur2, ((i % 3) - 1) * 0.09, 0.42, -0.08 + Math.floor(i / 3) * 0.16, 0.5);
      // 跳下跳下 + 鼻郁郁
      p.animate = (t, moving) => {
        p.root.position.y = Math.abs(Math.sin(t * 8)) * 0.12 * moving;
        p.head.position.y = Math.sin(t * 20) * 0.004 * (1 - moving);
      };
    },
  });
  return g;
}

export const ANIMALS_30 = {
  'Polar Bear': polarBear,
  Narwhal: narwhal,
  'Beluga Whale': beluga,
  'Ringed Seal': ringedSeal,
  'Emperor Penguin': penguin,
  'Arctic Fox': arcticFox,
  Caribou: caribou,
  'Snowy Owl': snowyOwl,
  Walrus: walrus,
  'Atlantic Puffin': () => bird({
    body: 0x1c1c1c, belly: 0xffffff, head: 0x1c1c1c, face: 0xf5f5f5, wing: 0x1c1c1c, wingTip: 0x111111, tail: 0x1c1c1c,
    beak: 0xff6f00, beakLower: 0xffd600, size: 0.8, tailLen: 0.2, legColor: 0xff8f00, chunky: true,
  }),

  'Amur Leopard': () => bigCat({ fur: 0xe8b46c, belly: 0xfff3e0, spots: 0x2b1d14, tailLen: 1.2, thickTail: true }),
  'Sumatran Tiger': () => bigCat({ fur: 0xe0712a, belly: 0xffffff, stripes: true, size: 1.1, eyeIris: 0xffb300 }),
  'Sumatran Orangutan': () => ape({ fur: 0xd97b35, face: 0x8a6a58, beard: true }),
  'Bornean Orangutan': () => ape({ fur: 0x9a4318, face: 0x5a4034, cheeks: true }),
  'Mountain Gorilla': () => ape({ fur: 0x2b2b2b, face: 0x1a1a1a, size: 1.2, silverBack: true }),
  'Javan Rhino': () => rhino({ skin: 0x84807a, dark: 0x6a6660, horns: 1, folds: true }),
  'Sumatran Rhino': () => rhino({ skin: 0x7a5a45, dark: 0x5d4433, size: 0.8, hairy: true }),
  Saola: saola,
  Pangolin: pangolin,
  'Slow Loris': slowLoris,

  'Snow Leopard': () => bigCat({ fur: 0xe2ded2, belly: 0xffffff, spots: 0x5a5550, tailLen: 1.5, thickTail: true, eyeIris: 0x80cbc4 }),
  'Andean Bear': andeanBear,
  'Ethiopian Wolf': ethiopianWolf,
  'Mountain Pygmy Possum': pygmyPossum,
  'Golden Snub-nosed Monkey': () => ape({ fur: 0xf0a83c, face: 0x7fb3d5, size: 0.6, noseUp: true }),
  Takin: takin,
  'Pyrenean Desman': desman,
  'Himalayan Musk Deer': muskDeer,
  'Andean Cat': () => bigCat({ fur: 0xbdb2a0, belly: 0xeeeeee, spots: 0x8d6e63, size: 0.55, tailLen: 0.9, thickTail: true }),
  'Volcano Rabbit': volcanoRabbit,
};

// 動物 36–50 新款（小朋友 2026-10-17）：用自己嘅新 builder，唔改上面共用嘅 bigCat／ape／rhino
Object.assign(ANIMALS_30, {
  'Javan Rhino': a2_javanRhino,
  'Sumatran Rhino': a2_sumatranRhino,
  'Snow Leopard': a2_snowLeopard,
  'Golden Snub-nosed Monkey': a2_snubMonkey,
  'Andean Cat': a2_andeanCat,
});
