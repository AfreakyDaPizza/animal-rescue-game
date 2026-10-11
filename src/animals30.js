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

function saola() {
  const fur = 0x6b4a2e;
  return beast({
    body: { w: 0.68, h: 0.72, d: 1.35, y: 1.28, color: fur },
    head: { w: 0.42, h: 0.46, d: 0.62, y: 1.68, z: -0.88, color: fur },
    legs: { w: 0.15, h: 0.92, x: 0.23, zf: -0.48, zb: 0.48, color: 0x3e2b1a, paw: 0x1d140c },
    tail: { w: 0.1, h: 0.32, d: 0.1, y: 1.45, color: fur, angle: 0.3, tip: BLACK },
    belly: 0x8d6e53,
    eyeSize: 0.09,
    walkSpeed: 8,
    extraHeight: 0.7,
    extras(p) {
      for (const s of [-1, 1]) {
        box(p.head, 0.05, 0.12, 0.32, WHITE, s * 0.13, -0.08, -0.18, 0.4); // 面上白紋
        const horn = pivot(p.head, s * 0.1, 0.24, 0.12);
        horn.rotation.x = -0.65;
        box(horn, 0.06, 0.06, 0.95, 0x2b2b2b, 0, 0, 0.47, 0.45); // 好長好直嘅角（亞洲獨角獸）
        const ear = pivot(p.head, s * 0.24, 0.12, 0.15);
        box(ear, 0.2, 0.08, 0.12, fur, s * 0.06, 0, 0, 0.4);
        p.ears.push(ear);
      }
      box(p.head, 0.12, 0.08, 0.04, BLACK, 0, -0.08, -0.32, 0.45);
    },
  });
}

function pangolin() {
  const scale = 0x9c7a52;
  const edge = 0xc8a777;
  const g = beast({
    body: { w: 0.6, h: 0.48, d: 1.15, y: 0.52, color: scale },
    head: { w: 0.32, h: 0.28, d: 0.5, y: 0.47, z: -0.74, color: 0xe0bc96 },
    legs: { w: 0.13, h: 0.32, x: 0.22, zf: -0.36, zb: 0.36, color: 0xe0bc96, paw: 0x8d6e53, toes: 0x5d4037 },
    tail: { w: 0.38, h: 0.28, d: 0.95, y: 0.47, color: scale, angle: 0.25 },
    eyeSize: 0.07,
    walkSpeed: 8,
    extras(p) {
      // 一塊塊重疊嘅鱗片（每塊微微翹起）
      for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
        const sc = box(p.root, 0.24, 0.07, 0.22, (r + c) % 2 ? edge : 0xb48c60, (c - 1) * 0.2, 0.79 - Math.abs(c - 1) * 0.08, -0.48 + r * 0.19, 0.35);
        sc.rotation.x = -0.25;
        sc.rotation.z = (c - 1) * -0.4;
      }
      for (let i = 0; i < 4; i++) box(p.tail, 0.4 - i * 0.07, 0.08, 0.2, edge, 0, 0.16, 0.15 + i * 0.22, 0.35).rotation.x = -0.2;
      box(p.head, 0.1, 0.08, 0.1, 0x5d4037, 0, -0.04, -0.27, 0.45); // 尖鼻
    },
  });
  return g;
}

function slowLoris() {
  const fur = 0xa8927e;
  return beast({
    body: { w: 0.38, h: 0.32, d: 0.58, y: 0.42, color: fur },
    head: { w: 0.42, h: 0.38, d: 0.34, y: 0.62, z: -0.4, color: fur },
    legs: { w: 0.11, h: 0.32, x: 0.13, zf: -0.18, zb: 0.18, color: 0x8d7764, paw: 0xd7ccc8 },
    eyes: false,
    walkSpeed: 3, // 好慢好慢
    swing: 0.3,
    extras(p) {
      for (const s of [-1, 1]) {
        box(p.head, 0.17, 0.2, 0.03, 0x4e342e, s * 0.1, 0.03, -0.175, 0.45); // 黑眼圈
        box(p.head, 0.06, 0.08, 0.06, fur, s * 0.17, 0.2, 0.05, 0.45); // 細耳
      }
      cuteEyes(p.head, 0.1, 0.03, -0.19, 0.14, { iris: 0xff8f00 }); // 超大圓眼
      box(p.head, 0.05, 0.24, 0.02, WHITE, 0, 0.08, -0.18, 0.4); // 中間白線
      box(p.head, 0.06, 0.04, 0.02, 0x3e2723, 0, -0.12, -0.18, 0.4);
      box(p.root, 0.08, 0.04, 0.5, 0x6d4c41, 0, 0.59, 0, 0.3); // 背脊深色線
    },
  });
}

// ================= 採礦山 =================

function andeanBear() {
  const fur = 0x2b2622;
  return beast({
    body: { w: 0.95, h: 0.9, d: 1.5, y: 1.02, color: fur },
    head: { w: 0.66, h: 0.6, d: 0.6, y: 1.32, z: -1.0, color: fur },
    legs: { w: 0.32, h: 0.62, x: 0.3, zf: -0.48, zb: 0.48, color: fur, paw: 0x1d1a17, toes: 0x6d6d6d },
    tail: { w: 0.15, h: 0.15, d: 0.1, y: 1.15, color: fur },
    eyes: false,
    extras(p) {
      for (const s of [-1, 1]) {
        const ring = box(p.head, 0.24, 0.24, 0.03, 0xf3e2b8, s * 0.15, 0.05, -0.31, 0.5); // 「眼鏡」
        ring.rotation.z = s * 0.2;
        const ear = pivot(p.head, s * 0.24, 0.32, 0.05);
        box(ear, 0.16, 0.16, 0.1, fur, 0, 0.05, 0, 0.45);
        p.ears.push(ear);
      }
      cuteEyes(p.head, 0.15, 0.05, -0.335, 0.09, { iris: 0x5d4037 });
      box(p.head, 0.32, 0.24, 0.22, 0xd8c49a, 0, -0.15, -0.36, 0.42);
      box(p.head, 0.11, 0.07, 0.05, BLACK, 0, -0.08, -0.47, 0.45);
      box(p.root, 0.6, 0.35, 0.06, 0xf3e2b8, 0, 1.0, -0.76, 0.45); // 心口淺色
    },
  });
}

function ethiopianWolf() {
  const fur = 0xcd6a2e;
  return beast({
    body: { w: 0.44, h: 0.44, d: 1.05, y: 0.88, color: fur },
    head: { w: 0.38, h: 0.36, d: 0.38, y: 1.14, z: -0.68, color: fur },
    legs: { w: 0.13, h: 0.68, x: 0.15, zf: -0.38, zb: 0.38, color: fur, paw: WHITE },
    tail: { w: 0.17, h: 0.17, d: 0.65, y: 0.95, color: fur, angle: 0.45, tip: BLACK },
    belly: WHITE,
    eyeSize: 0.08,
    eyeOpts: { iris: 0xffb300 },
    walkSpeed: 11,
    extras(p) {
      box(p.root, 0.32, 0.32, 0.16, WHITE, 0, 0.88, -0.52, 0.4); // 白頸
      box(p.head, 0.18, 0.15, 0.34, fur, 0, -0.07, -0.3, 0.4); // 長嘴
      box(p.head, 0.16, 0.06, 0.3, WHITE, 0, -0.13, -0.3, 0.4);
      box(p.head, 0.08, 0.06, 0.04, BLACK, 0, -0.03, -0.48, 0.45);
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.12, 0.28, 0);
        spike(ear, 0.09, 0.28, fur, 0, 0.1, 0);
        p.ears.push(ear);
      }
    },
  });
}

function pygmyPossum() {
  const fur = 0x8d8178;
  return beast({
    body: { w: 0.3, h: 0.26, d: 0.42, y: 0.26, color: fur },
    head: { w: 0.3, h: 0.26, d: 0.26, y: 0.34, z: -0.3, color: fur },
    legs: { w: 0.07, h: 0.14, x: 0.11, zf: -0.13, zb: 0.13, color: 0xf8bbd0 },
    tail: { w: 0.05, h: 0.05, d: 0.5, y: 0.24, color: 0xd7ccc8, angle: -0.4 },
    belly: 0xd7ccc8,
    eyeSize: 0.08,
    walkSpeed: 14,
    extras(p) {
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.13, 0.15, 0.02);
        box(ear, 0.12, 0.12, 0.03, fur, 0, 0.04, 0, 0.5);
        box(ear, 0.07, 0.07, 0.02, 0xf8bbd0, 0, 0.04, -0.02, 0.5);
        p.ears.push(ear);
      }
      box(p.head, 0.05, 0.04, 0.03, 0xf48fb1, 0, -0.05, -0.145, 0.45);
    },
  });
}

function takin() {
  const fur = 0xd4ab4f;
  return beast({
    body: { w: 1.05, h: 1.0, d: 1.65, y: 1.22, color: fur },
    head: { w: 0.6, h: 0.6, d: 0.78, y: 1.3, z: -1.08, color: 0x6d4c41 },
    legs: { w: 0.28, h: 0.75, x: 0.33, zf: -0.56, zb: 0.56, color: 0x5d4037, paw: 0x2b1d14 },
    tail: { w: 0.13, h: 0.13, d: 0.12, y: 1.45, color: fur },
    eyeSize: 0.08,
    walkSpeed: 6,
    extras(p) {
      box(p.root, 1.1, 0.35, 0.9, 0xe0bf6b, 0, 1.75, -0.35, 0.4); // 膊頭金毛
      for (const s of [-1, 1]) {
        const horn = pivot(p.head, s * 0.2, 0.28, 0.05);
        box(horn, 0.38, 0.1, 0.12, 0x3e2723, s * 0.17, 0, 0, 0.45); // 向外再向上彎嘅角
        box(horn, 0.1, 0.28, 0.1, 0x3e2723, s * 0.34, 0.14, 0.05, 0.45);
        const ear = pivot(p.head, s * 0.32, 0.05, 0.15);
        box(ear, 0.16, 0.08, 0.12, 0x6d4c41, s * 0.05, 0, 0, 0.4);
        p.ears.push(ear);
      }
      box(p.head, 0.52, 0.3, 0.32, 0x4e342e, 0, -0.14, -0.34, 0.45); // 大鼻（似駝鹿）
      for (const s of [-1, 1]) box(p.head, 0.07, 0.07, 0.03, BLACK, s * 0.1, -0.12, -0.51, 0.45);
    },
  });
}

function desman() {
  const fur = 0x6d5a4b;
  return beast({
    body: { w: 0.26, h: 0.22, d: 0.45, y: 0.22, color: fur },
    head: { w: 0.2, h: 0.18, d: 0.2, y: 0.24, z: -0.3, color: fur },
    legs: { w: 0.08, h: 0.12, x: 0.1, zf: -0.13, zb: 0.13, color: 0x3e2b1a, paw: 0x3e2b1a },
    tail: { w: 0.06, h: 0.06, d: 0.42, y: 0.2, color: 0x3e2b1a },
    belly: 0x9e8b7a,
    eyeSize: 0.05,
    walkSpeed: 14,
    extras(p) {
      const nose = pivot(p.head, 0, -0.02, -0.1);
      box(nose, 0.06, 0.06, 0.24, 0x4e342e, 0, 0, -0.12, 0.45); // 長長嘅「象鼻」
      box(nose, 0.07, 0.06, 0.04, 0xf48fb1, 0, 0, -0.25, 0.45);
      p.animate = (t) => (nose.rotation.y = Math.sin(t * 4) * 0.4); // 鼻郁嚟郁去聞嘢
    },
  });
}

function muskDeer() {
  const fur = 0x7b5a3c;
  return beast({
    body: { w: 0.42, h: 0.46, d: 0.88, y: 0.78, color: fur },
    head: { w: 0.32, h: 0.34, d: 0.42, y: 1.06, z: -0.6, color: fur },
    legs: { w: 0.11, h: 0.6, x: 0.15, zf: -0.31, zb: 0.31, color: 0x4e342e, paw: 0x2b1d14 },
    tail: { w: 0.08, h: 0.08, d: 0.06, y: 0.9, color: fur },
    belly: 0xb08d6a,
    eyeSize: 0.08,
    walkSpeed: 10,
    extras(p) {
      for (let i = 0; i < 6; i++) box(p.root, 0.08, 0.02, 0.08, 0xd7b98f, ((i % 3) - 1) * 0.12, 1.02, -0.2 + Math.floor(i / 3) * 0.3, 0.4); // 淺色斑
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.17, 0.2, 0.08);
        box(ear, 0.07, 0.28, 0.18, fur, 0, 0.1, 0, 0.45); // 大耳
        box(ear, 0.03, 0.2, 0.12, 0xd7b98f, -s * 0.02, 0.1, -0.02, 0.45);
        p.ears.push(ear);
        box(p.head, 0.035, 0.18, 0.035, WHITE, s * 0.05, -0.22, -0.18, 0.4); // 尖牙
      }
      box(p.head, 0.07, 0.06, 0.04, BLACK, 0, -0.06, -0.22, 0.45);
    },
  });
}

function volcanoRabbit() {
  const fur = 0x6b5444;
  return beast({
    body: { w: 0.28, h: 0.26, d: 0.38, y: 0.24, color: fur },
    head: { w: 0.26, h: 0.24, d: 0.24, y: 0.36, z: -0.24, color: fur },
    legs: { w: 0.08, h: 0.12, x: 0.09, zf: -0.11, zb: 0.11, color: fur, paw: 0x4e3a2e },
    tail: { w: 0.1, h: 0.1, d: 0.08, y: 0.28, color: 0xd7ccc8 },
    belly: 0x8d7564,
    eyeSize: 0.07,
    walkSpeed: 16,
    swing: 0.9,
    extras(p) {
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.08, 0.15, 0.02);
        box(ear, 0.09, 0.12, 0.04, fur, 0, 0.04, 0, 0.5); // 細細圓耳（火山兔耳仔短）
        box(ear, 0.05, 0.07, 0.02, 0xf8bbd0, 0, 0.04, -0.02, 0.5);
        p.ears.push(ear);
      }
      box(p.head, 0.05, 0.03, 0.02, 0xf48fb1, 0, -0.03, -0.125, 0.45);
      p.animate = (t, moving) => (p.root.position.y = Math.abs(Math.sin(t * 8)) * 0.1 * moving); // 跳下跳下
    },
  });
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
