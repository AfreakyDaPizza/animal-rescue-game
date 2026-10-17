// 其餘 30 隻動物（Biome 4–6）嘅新設計：同頭 20 隻一樣嘅靚款
// 大眼（眼白 + 反光）、腳掌腳趾、花紋、識郁嘅耳／尾／翼
// 全部面向 -z。每個回傳 Group：userData.animate(time, moving)、userData.height、userData.move

import * as THREE from 'three';
import { box, pivot, cuteEyes, spike, BLACK, WHITE } from './modelKit.js';
import { beast, swimmer, bird, sideEyes } from './animals20.js';

const PI = Math.PI;

// ================= 北極 =================

// （2026-10-17 小朋友：「make all pets look good」）動物 21–35 重新整靚：輪廓清楚啲、顏色似真嘅、多啲細節

// 一撮撮毛（令身體唔再平滑一舊）
function a1_tufts(parent, n, color, cx, cy, cz, sx, sy, sz, size = 0.12, seed = 1) {
  let s = seed * 9301;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) box(parent, size, size * 0.8, size, color, cx + (r() - 0.5) * sx, cy + (r() - 0.5) * sy, cz + (r() - 0.5) * sz, 0.45);
}

function polarBear() {
  const fur = 0xf6f3ea;
  const shade = 0xe4ddcc;
  const cream = 0xefe6cf;
  return beast({
    body: { w: 1.36, h: 1.18, d: 2.1, y: 1.32, color: fur },
    head: { w: 0.72, h: 0.64, d: 0.74, y: 1.62, z: -1.55, color: fur },
    legs: { w: 0.5, h: 0.86, x: 0.42, zf: -0.64, zb: 0.64, color: fur, paw: cream, toes: 0x2b2622 },
    tail: { w: 0.22, h: 0.2, d: 0.16, y: 1.55, color: fur },
    belly: shade,
    eyeSize: 0.09,
    eyeOpts: { iris: 0x3e2723 },
    walkSpeed: 7,
    swing: 0.45,
    extras(p) {
      // 長頸 + 膊頭隆起 + 屁股：北極熊個身係「頭細、頸長、屁股高」
      const neck = box(p.root, 0.82, 0.78, 0.7, fur, 0, 1.5, -1.05, 0.42);
      neck.rotation.x = 0.35;
      box(p.root, 1.25, 0.32, 0.8, fur, 0, 1.9, -0.45, 0.45);
      box(p.root, 1.28, 0.34, 0.75, shade, 0, 1.86, 0.55, 0.45);
      a1_tufts(p.root, 10, cream, 0, 0.78, 0, 1.0, 0.08, 1.6, 0.16, 3); // 肚底毛
      // 個頭：長長嘅嘴、黑鼻、細眼、細圓耳
      box(p.head, 0.44, 0.34, 0.44, cream, 0, -0.12, -0.5, 0.42);
      box(p.head, 0.22, 0.14, 0.08, 0x111111, 0, -0.01, -0.73, 0.45);
      box(p.head, 0.16, 0.03, 0.03, 0x4e342e, 0, -0.24, -0.72, 0.3);
      box(p.head, 0.03, 0.08, 0.03, 0x4e342e, 0, -0.19, -0.725, 0.3);
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.28, 0.34, 0.12);
        box(ear, 0.18, 0.17, 0.1, fur, 0, 0.05, 0, 0.5);
        box(ear, 0.1, 0.09, 0.04, 0xbdb4a8, 0, 0.05, -0.05, 0.5);
        p.ears.push(ear);
      }
      for (const leg of p.legs) a1_tufts(leg.hip, 3, cream, 0, -0.55, 0, 0.4, 0.3, 0.4, 0.14, 7);
    },
  });
}

function arcticFox() {
  const fur = 0xfbfbf8;
  const shade = 0xe8e8e2;
  return beast({
    body: { w: 0.6, h: 0.54, d: 0.98, y: 0.62, color: fur },
    head: { w: 0.56, h: 0.46, d: 0.46, y: 0.92, z: -0.64, color: fur },
    legs: { w: 0.16, h: 0.4, x: 0.17, zf: -0.32, zb: 0.32, color: shade, paw: fur },
    tail: { w: 0.4, h: 0.4, d: 0.95, y: 0.7, color: fur, angle: -0.3, tip: 0xffffff },
    eyeSize: 0.11,
    eyeOpts: { iris: 0x8d6e63 },
    walkSpeed: 11,
    extras(p) {
      // 好鬆嘅毛：頸圈、心口、條尾一嚿嚿
      box(p.root, 0.66, 0.5, 0.4, fur, 0, 0.72, -0.48, 0.48);
      a1_tufts(p.root, 12, shade, 0, 0.88, 0, 0.5, 0.06, 0.8, 0.12, 4);
      for (let i = 0; i < 3; i++) box(p.tail, 0.46 - i * 0.05, 0.46 - i * 0.05, 0.26, i % 2 ? shade : fur, 0, 0, 0.18 + i * 0.28, 0.48);
      // 面：短嘴、黑鼻、兩邊面毛、細細圓耳（北極狐耳仔細，保暖）
      box(p.head, 0.26, 0.2, 0.28, fur, 0, -0.1, -0.3, 0.45);
      box(p.head, 0.1, 0.07, 0.05, 0x111111, 0, -0.04, -0.45, 0.45);
      box(p.head, 0.1, 0.02, 0.02, 0x5d4037, 0, -0.17, -0.44, 0.3);
      for (const s of [-1, 1]) {
        box(p.head, 0.14, 0.24, 0.24, fur, s * 0.3, -0.1, -0.05, 0.5); // 面毛
        const ear = pivot(p.head, s * 0.17, 0.25, 0.05);
        box(ear, 0.15, 0.16, 0.08, fur, 0, 0.06, 0, 0.5);
        box(ear, 0.08, 0.09, 0.03, 0xf8bbd0, 0, 0.05, -0.045, 0.5);
        p.ears.push(ear);
      }
    },
  });
}

function caribou() {
  const fur = 0x7b5b3e;
  const dark = 0x4e3826;
  const mane = 0xf1ebe0;
  const antler = 0xe6d5ae;
  return beast({
    body: { w: 0.88, h: 0.86, d: 1.7, y: 1.62, color: fur },
    head: { w: 0.42, h: 0.44, d: 0.82, y: 2.3, z: -1.15, color: dark },
    legs: { w: 0.2, h: 1.22, x: 0.28, zf: -0.62, zb: 0.62, color: dark, paw: 0x1b1410 },
    tail: { w: 0.24, h: 0.2, d: 0.14, y: 1.85, color: WHITE },
    belly: 0x5d4632,
    eyeSize: 0.09,
    eyeOpts: { iris: 0x3e2723 },
    walkSpeed: 7,
    extraHeight: 1.2,
    extras(p) {
      // 白色頸毛（好長，垂落嚟）+ 白屁股
      const neck = box(p.root, 0.5, 0.8, 0.5, mane, 0, 1.98, -0.88, 0.38);
      neck.rotation.x = -0.45;
      a1_tufts(p.root, 8, mane, 0, 1.5, -0.95, 0.4, 0.3, 0.3, 0.16, 5);
      box(p.root, 0.8, 0.5, 0.1, WHITE, 0, 1.6, 0.85, 0.4);
      box(p.root, 0.9, 0.3, 1.2, 0x8f6c4b, 0, 1.95, 0.1, 0.45); // 背淺啲
      for (const leg of p.legs) box(leg.hip, 0.22, 0.12, 0.22, mane, 0, -1.0, 0, 0.4); // 白襪
      // 面：淺色嘴、黑鼻
      box(p.head, 0.34, 0.26, 0.3, 0x6d5238, 0, -0.08, -0.42, 0.4);
      box(p.head, 0.18, 0.1, 0.05, 0x111111, 0, -0.02, -0.58, 0.45);
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.24, 0.16, 0.22);
        box(ear, 0.2, 0.09, 0.12, fur, s * 0.07, 0, 0, 0.45);
        p.ears.push(ear);
        // 大鹿角：主枝向後再向前彎、上面分叉、前面一塊鏟（brow tine）
        const a = pivot(p.head, s * 0.14, 0.22, 0.14);
        a.rotation.z = s * -0.3;
        const main = box(a, 0.1, 0.8, 0.1, antler, 0, 0.4, 0.06, 0.45);
        main.rotation.x = 0.25;
        const upper = pivot(a, 0, 0.78, 0.18);
        box(upper, 0.09, 0.7, 0.09, antler, 0, 0.32, -0.12, 0.45).rotation.x = -0.4;
        for (const [y, z, l, rx] of [[0.2, -0.16, 0.34, -0.9], [0.5, -0.25, 0.3, -1.0], [0.68, 0.05, 0.28, 0.7]]) box(upper, 0.07, l, 0.07, antler, 0, y, z, 0.45).rotation.x = rx;
        box(upper, 0.05, 0.3, 0.26, antler, 0, 0.75, -0.3, 0.45); // 頂嘅掌
        box(a, 0.05, 0.28, 0.26, antler, 0, 0.18, -0.2, 0.45).rotation.x = -0.6; // 前鏟
      }
    },
  });
}

function walrus() {
  const skin = 0xb0775a;
  const pink = 0xc98f74;
  const dark = 0x8d5e48;
  const g = new THREE.Group();
  const root = pivot(g);
  // 前身好大（似一個大梨）
  box(root, 1.5, 1.15, 1.5, skin, 0, 0.7, -0.25, 0.45);
  box(root, 1.3, 0.35, 1.3, pink, 0, 0.18, -0.25, 0.45); // 肚
  for (let i = 0; i < 4; i++) box(root, 1.52, 0.05, 0.08, dark, 0, 0.5 + i * 0.2, 0.2 - i * 0.05, 0.3); // 皺紋
  const back = pivot(root, 0, 0.55, 0.45);
  box(back, 1.18, 0.86, 1.15, skin, 0, -0.08, 0.45, 0.45);
  box(back, 1.0, 0.25, 1.0, pink, 0, -0.42, 0.45, 0.45);
  const tail = pivot(back, 0, -0.3, 1.05);
  for (const s of [-1, 1]) {
    const f = box(tail, 0.42, 0.08, 0.6, dark, s * 0.25, -0.12, 0.22, 0.4);
    f.rotation.y = s * 0.3;
  }
  // 頭：圓圓、粗鬚墊、細眼、長長嘅象牙
  const head = pivot(root, 0, 1.28, -1.0);
  box(head, 0.9, 0.72, 0.75, skin, 0, 0, 0, 0.45);
  box(head, 0.82, 0.42, 0.32, pink, 0, -0.2, -0.4, 0.48); // 鬚墊
  for (const s of [-1, 1]) box(head, 0.36, 0.36, 0.3, pink, s * 0.2, -0.24, -0.45, 0.5);
  for (let i = 0; i < 12; i++) box(head, 0.025, 0.025, 0.08, 0xf5e6c8, ((i % 6) - 2.5) * 0.12, -0.14 - Math.floor(i / 6) * 0.11, -0.62, 0.3);
  cuteEyes(head, 0.24, 0.15, -0.38, 0.08, { iris: 0x3e2723 });
  for (const s of [-1, 1]) {
    const tusk = pivot(head, s * 0.17, -0.38, -0.5);
    box(tusk, 0.12, 0.5, 0.12, 0xfff8e1, 0, -0.25, 0, 0.45);
    box(tusk, 0.1, 0.4, 0.1, 0xf3e5c0, 0, -0.65, 0.05, 0.45).rotation.x = 0.15;
  }
  const flippers = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.72, 0.18, -0.55);
    box(p, 0.62, 0.1, 0.38, dark, s * 0.3, 0, 0, 0.4);
    for (let k = 0; k < 4; k++) box(p, 0.06, 0.06, 0.08, 0x5d3e30, s * 0.55, 0.04, -0.12 + k * 0.08, 0.3);
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
  g.userData.height = 1.75;
  g.userData.move = 'walk';
  return g;
}

function ringedSeal() {
  const skin = 0x5f676e;
  const light = 0xa9b0b5;
  const g = new THREE.Group();
  const root = pivot(g);
  box(root, 0.8, 0.62, 0.9, skin, 0, 0.36, -0.3, 0.45);
  box(root, 0.66, 0.24, 0.76, light, 0, 0.1, -0.3, 0.45);
  const back = pivot(root, 0, 0.32, 0.12);
  box(back, 0.66, 0.5, 0.8, skin, 0, -0.02, 0.34, 0.45);
  box(back, 0.54, 0.2, 0.7, light, 0, -0.22, 0.34, 0.45);
  const tail = pivot(back, 0, -0.1, 0.74);
  for (const s of [-1, 1]) box(tail, 0.22, 0.06, 0.4, 0x4a5157, s * 0.13, -0.1, 0.16, 0.4).rotation.y = s * 0.25;
  // 招牌：背上一個個淺色圈（ring）
  const rings = [[-0.2, 0.67, -0.55, root], [0.18, 0.67, -0.3, root], [-0.1, 0.67, -0.05, root], [0.22, 0.67, -0.7, root], [0.1, 0.24, 0.15, back], [-0.18, 0.24, 0.4, back], [0.16, 0.24, 0.6, back]];
  for (const [x, y, z, par] of rings) {
    box(par, 0.16, 0.02, 0.16, light, x, y, z, 0.5);
    box(par, 0.08, 0.025, 0.08, skin, x, y + 0.002, z, 0.5);
  }
  const head = pivot(root, 0, 0.62, -0.82);
  box(head, 0.54, 0.48, 0.5, skin, 0, 0, 0, 0.48);
  box(head, 0.34, 0.22, 0.18, 0x7c848a, 0, -0.1, -0.28, 0.48);
  box(head, 0.1, 0.06, 0.03, 0x111111, 0, -0.03, -0.37, 0.45);
  box(head, 0.12, 0.02, 0.02, 0x3e3a36, 0, -0.16, -0.37, 0.3);
  cuteEyes(head, 0.14, 0.08, -0.26, 0.15, { iris: 0x2b1d14 }); // 海豹大眼
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) box(head, 0.2, 0.012, 0.012, 0xf5f5f5, s * 0.22, -0.11 + k * 0.035, -0.35, 0.3);
  const flippers = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.4, 0.14, -0.4);
    box(p, 0.32, 0.06, 0.2, 0x4a5157, s * 0.15, 0, 0, 0.4);
    for (let k = 0; k < 3; k++) box(p, 0.05, 0.04, 0.05, 0x2b2f33, s * 0.3, 0.02, -0.06 + k * 0.06, 0.3); // 爪
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
  g.userData.height = 1.0;
  g.userData.move = 'walk';
  return g;
}

function penguin() {
  const g = new THREE.Group();
  const root = pivot(g);
  const black = 0x1c2430;
  const back = 0x3b4a5c; // 背：深藍灰
  // 身：高高、上窄下闊
  box(root, 0.82, 0.9, 0.7, black, 0, 0.62, 0.03, 0.45);
  box(root, 0.7, 0.6, 0.6, black, 0, 1.25, 0.02, 0.45);
  box(root, 0.6, 0.85, 0.2, back, 0, 0.9, 0.3, 0.45);
  box(root, 0.64, 0.82, 0.12, WHITE, 0, 0.62, -0.31, 0.45); // 白肚
  box(root, 0.5, 0.42, 0.1, 0xfff3c4, 0, 1.15, -0.28, 0.45); // 心口淡黃
  box(root, 0.36, 0.18, 0.08, 0xffd54f, 0, 1.36, -0.27, 0.45);
  const head = pivot(root, 0, 1.72, -0.02);
  box(head, 0.5, 0.46, 0.5, black, 0, 0, 0, 0.45);
  for (const s of [-1, 1]) {
    // 耳邊招牌橙黃斑（由頭邊落到頸）
    box(head, 0.06, 0.24, 0.2, 0xffa726, s * 0.25, -0.04, 0.0, 0.45);
    box(head, 0.06, 0.18, 0.12, 0xffd54f, s * 0.25, -0.2, -0.08, 0.45);
  }
  // 長長嘅嘴，向下彎，下嘴有橙色間
  const beak = pivot(head, 0, -0.06, -0.25);
  beak.rotation.x = 0.2;
  box(beak, 0.12, 0.1, 0.36, black, 0, 0.02, -0.16, 0.4);
  box(beak, 0.09, 0.05, 0.26, 0xff8f00, 0, -0.04, -0.14, 0.4);
  cuteEyes(head, 0.13, 0.07, -0.255, 0.1, { iris: 0x3e2723 });
  const flippers = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.43, 1.32, 0);
    box(p, 0.09, 0.72, 0.3, black, 0, -0.34, 0, 0.45);
    box(p, 0.04, 0.52, 0.22, WHITE, -s * 0.035, -0.36, 0, 0.45);
    return { p, s };
  });
  const feet = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.18, 0.2, 0);
    box(p, 0.22, 0.06, 0.32, 0x37474f, 0, -0.17, -0.1, 0.4);
    return p;
  });
  g.scale.setScalar(1.1);
  g.userData.animate = (t, moving) => {
    root.rotation.z = Math.sin(t * 8) * 0.15 * moving; // 搖搖擺擺咁行
    feet.forEach((f, i) => (f.position.y = 0.2 + Math.max(0, Math.sin(t * 8 + i * PI)) * 0.1 * moving));
    flippers.forEach(({ p, s }) => (p.rotation.z = s * (0.2 + Math.sin(t * 3) * 0.15 + moving * Math.abs(Math.sin(t * 8)) * 0.3)));
    head.rotation.y = Math.sin(t * 1.1) * 0.3;
    head.rotation.x = Math.sin(t * 0.7) * 0.1;
  };
  g.userData.height = 2.25;
  g.userData.move = 'walk';
  return g;
}

function narwhal() {
  return swimmer({
    skin: 0x6e7c88, belly: 0xe2e6e9, len: 3.0, w: 0.9, h: 0.82, eyeSize: 0.1, eyeZ: 0.5,
    extras({ root, mid, rear }) {
      // 長牙：一節節越嚟越幼，有螺旋紋（其實係一隻好長嘅牙）
      const tusk = pivot(root, -0.1, 0.06, -1.5);
      const segs = [0.16, 0.14, 0.12, 0.1, 0.08, 0.06];
      segs.forEach((w, i) => {
        box(tusk, w, w, 0.42, 0xfff8e1, 0, 0, -0.2 - i * 0.4, 0.45);
        box(tusk, w + 0.02, 0.025, 0.06, 0xd7c9a8, 0, 0, -0.1 - i * 0.4, 0.3).rotation.z = 0.7;
      });
      // 斑駁嘅背（深灰點點）
      let s = 11;
      const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 22; i++) {
        const par = i < 10 ? root : i < 18 ? mid : rear;
        const z = par === root ? -1.4 + r() * 1.1 : r() * 0.8;
        box(par, 0.1 + r() * 0.08, 0.02, 0.1 + r() * 0.08, 0x3f4a54, (r() - 0.5) * 0.6, par === root ? 0.42 : par === mid ? 0.37 : 0.24, z, 0.45);
      }
      box(root, 0.5, 0.03, 0.03, 0x3f4a54, 0, -0.16, -1.5, 0.3); // 笑口
      box(mid, 0.14, 0.04, 0.8, 0x5f6b76, 0, 0.385, 0.45, 0.45); // 背脊（冇背鰭，只有一條矮脊）
    },
  });
}

function beluga() {
  return swimmer({
    skin: 0xf8fbfc, belly: 0xedf2f4, len: 3.0, w: 0.9, h: 0.84, eyeSize: 0.1, eyeZ: 0.45,
    extras({ root, mid }) {
      box(root, 0.82, 0.56, 0.62, 0xf8fbfc, 0, 0.3, -0.95, 0.5); // 圓圓大額頭（melon）
      box(root, 0.5, 0.26, 0.3, 0xeef3f5, 0, -0.12, -1.38, 0.5); // 短嘴
      box(root, 0.42, 0.04, 0.04, 0xb0bec5, 0, -0.18, -1.53, 0.3); // 笑口
      box(root, 0.26, 0.05, 0.04, 0xf48fb1, 0, -0.22, -1.52, 0.3);
      for (const s of [-1, 1]) box(root, 0.05, 0.12, 0.12, 0xffc1cc, s * 0.36, -0.06, -1.3, 0.45); // 粉紅面珠
      box(root, 0.8, 0.04, 0.05, 0xe3eaee, 0, 0.12, -0.55, 0.3); // 頸摺（白鯨識轉頭）
      box(mid, 0.16, 0.05, 0.8, 0xe3eaee, 0, 0.38, 0.45, 0.45); // 背脊
    },
  });
}

function snowyOwl() {
  const g = bird({
    body: WHITE, belly: 0xffffff, head: WHITE, wing: 0xf2f2ee, wingTip: 0xdedede, tail: 0xf2f2ee, beak: 0x37474f,
    size: 1.25, tailLen: 0.25, chunky: true, legColor: 0xf5f5f5, eyeOpts: { iris: 0xffd600 },
  });
  const root = g.children[0];
  const head = root.children.find((c) => c.isGroup && c.position.y > 1);
  // 圓圓嘅面盤 + 金黃大眼 + 黑色細勾嘴
  box(head, 0.44, 0.36, 0.05, 0xfafafa, 0, 0.0, -0.225, 0.5);
  cuteEyes(head, 0.12, 0.06, -0.255, 0.14, { iris: 0xffc400 });
  box(head, 0.06, 0.08, 0.04, 0x263238, 0, -0.06, -0.26, 0.4);
  for (const s of [-1, 1]) box(head, 0.12, 0.06, 0.08, 0xf5f5f5, s * 0.17, 0.24, 0.0, 0.45); // 細細嘅耳毛
  // 黑色斑點（身、翼）
  for (let i = 0; i < 12; i++) box(root, 0.05, 0.03, 0.02, 0x546e7a, ((i * 7) % 5 - 2) * 0.12 + (i % 2) * 0.04, 0.5 + ((i * 3) % 7) * 0.09, 0.34, 0.3);
  for (const wing of root.children.filter((c) => c.isGroup && Math.abs(c.position.x) > 0.2 && c.position.y > 0.8)) {
    for (let k = 0; k < 4; k++) box(wing, 0.07, 0.04, 0.05, 0x546e7a, Math.sign(wing.position.x) * 0.055, -0.18 - k * 0.11, (k % 2) * 0.14, 0.3);
  }
  // 毛毛腳
  for (const s of [-1, 1]) box(root, 0.14, 0.16, 0.18, WHITE, s * 0.13, 0.12, -0.04, 0.45);
  return g;
}

// ---- 以下幾隻本來用共用嘅 bird／bigCat／ape／rhino，而家有自己嘅靚版本（喺檔案尾 Object.assign 登記）----

function a1_puffin() {
  const g = bird({
    body: 0x1c1c1c, belly: 0xffffff, head: 0x1c1c1c, face: 0xf2f2f2, wing: 0x1c1c1c, wingTip: 0x111111, tail: 0x1c1c1c,
    beak: 0xff5722, beakLower: 0xffb300, size: 0.85, tailLen: 0.2, legColor: 0xff7043, chunky: true, eyeOpts: { iris: 0x3e2723 },
  });
  const root = g.children[0];
  const head = root.children.find((c) => c.isGroup && c.position.y > 1);
  // 招牌三色大嘴：灰藍底 + 黃間 + 橙紅尖，嘴角有黃色
  box(head, 0.2, 0.26, 0.08, 0x546e7a, 0, -0.04, -0.27, 0.35);
  box(head, 0.18, 0.06, 0.06, 0xffd600, 0, 0.06, -0.31, 0.3);
  box(head, 0.17, 0.2, 0.14, 0xff5722, 0, -0.05, -0.36, 0.35);
  box(head, 0.1, 0.16, 0.08, 0xff7043, 0, -0.09, -0.44, 0.35);
  for (const s of [-1, 1]) {
    box(head, 0.06, 0.06, 0.04, 0xffd600, s * 0.11, -0.12, -0.24, 0.4); // 嘴角
    box(head, 0.1, 0.03, 0.02, 0x37474f, s * 0.15, 0.02, -0.235, 0.3); // 眼後灰線
    box(head, 0.05, 0.05, 0.02, 0xff7043, s * 0.12, 0.13, -0.235, 0.4); // 眼上紅點
  }
  box(root, 0.5, 0.08, 0.14, 0x1c1c1c, 0, 1.0, -0.28, 0.4); // 黑頸圈
  return g;
}

// 遠東豹：粗壯啲、梅花斑（一圈黑點包住淺啡）、好長好粗嘅尾
function a1_leopard() {
  const fur = 0xe5ae62;
  const pale = 0xf2c98a;
  const belly = 0xfff3e0;
  const spot = 0x2b1d14;
  const g = beast({
    body: { w: 0.7, h: 0.64, d: 1.6, y: 1.0, color: fur },
    head: { w: 0.64, h: 0.56, d: 0.56, y: 1.28, z: -1.0, color: fur },
    legs: { w: 0.22, h: 0.7, x: 0.23, zf: -0.54, zb: 0.54, color: fur, paw: belly, toes: belly },
    tail: { w: 0.22, h: 0.22, d: 1.35, y: 1.12, color: fur, angle: -0.25, tip: spot },
    belly,
    eyeSize: 0.12,
    eyeOpts: { iris: 0xc0ca33 },
    walkSpeed: 9,
    extras(p) {
      box(p.head, 0.38, 0.24, 0.2, belly, 0, -0.14, -0.3, 0.45); // 白嘴
      box(p.head, 0.12, 0.08, 0.05, 0xc2185b, 0, -0.05, -0.4, 0.45); // 粉紅鼻
      box(p.head, 0.03, 0.08, 0.03, 0x3e2723, 0, -0.14, -0.4, 0.3);
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.23, 0.3, 0.06);
        box(ear, 0.17, 0.16, 0.08, fur, 0, 0.05, 0, 0.5);
        box(ear, 0.1, 0.09, 0.04, 0x1a1a1a, 0, 0.05, 0.04, 0.5);
        box(ear, 0.05, 0.05, 0.02, WHITE, 0, 0.05, 0.065, 0.5); // 耳背白點
        p.ears.push(ear);
        for (let k = 0; k < 3; k++) box(p.head, 0.22, 0.012, 0.012, WHITE, s * 0.28, -0.15 + k * 0.04, -0.4, 0.3);
        box(p.head, 0.04, 0.16, 0.03, spot, s * 0.18, 0.08, -0.285, 0.3); // 眼角黑線
        for (let k = 0; k < 3; k++) box(p.head, 0.05, 0.05, 0.02, spot, s * (0.08 + k * 0.08), 0.24, -0.285 + k * 0.08, 0.3); // 額頭細點
      }
      // 梅花斑：每朵 4 粒黑點圍住一粒淺啡
      const rosette = (x, y, z, side) => {
        if (side) {
          box(p.root, 0.02, 0.1, 0.1, pale, x, y, z, 0.4);
          for (const [dy, dz] of [[0.07, 0], [-0.07, 0], [0, 0.07], [0, -0.07]]) box(p.root, 0.025, 0.05, 0.05, spot, x + Math.sign(x) * 0.003, y + dy, z + dz, 0.4);
        } else {
          box(p.root, 0.1, 0.02, 0.1, pale, x, y, z, 0.4);
          for (const [dx, dz] of [[0.07, 0], [-0.07, 0], [0, 0.07], [0, -0.07]]) box(p.root, 0.05, 0.025, 0.05, spot, x + dx, y + 0.003, z + dz, 0.4);
        }
      };
      for (let i = 0; i < 7; i++) for (const s of [-1, 1]) rosette(s * 0.355, 0.9 + ((i * 5) % 3) * 0.13, -0.62 + i * 0.21, true);
      for (let i = 0; i < 6; i++) rosette(((i * 3) % 3 - 1) * 0.18, 1.33, -0.55 + i * 0.22, false);
      for (const leg of p.legs) for (let k = 0; k < 3; k++) box(leg.hip, 0.23, 0.05, 0.05, spot, 0, -0.15 - k * 0.15, -0.09 + (k % 2) * 0.18, 0.3);
      for (let k = 0; k < 5; k++) box(p.tail, 0.24, 0.04, 0.08, spot, 0, 0.1, 0.2 + k * 0.24, 0.3); // 尾間
    },
  });
  return g;
}

// 猩猩／大猩猩共用：長手、毛茸茸、面有細節
function a1_greatApe({ fur, furLight, face, size = 1, gorilla = false, flanges = false, beard = false }) {
  const g = new THREE.Group();
  const root = pivot(g);
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.28, gorilla ? 0.7 : 0.75, 0.2);
    box(hip, 0.36, gorilla ? 0.7 : 0.72, 0.36, fur, 0, -0.35, 0, 0.4);
    box(hip, 0.38, 0.12, 0.46, face, 0, -0.68, -0.06, 0.45);
    return hip;
  });
  // 身：大猩猩胸闊膊頭高；猩猩圓肚
  const torso = box(root, gorilla ? 1.2 : 0.95, gorilla ? 1.15 : 1.05, gorilla ? 0.78 : 0.7, fur, 0, 1.4, 0.05, 0.42);
  torso.rotation.x = gorilla ? 0.45 : 0.25;
  box(root, gorilla ? 0.8 : 0.62, 0.62, 0.12, gorilla ? 0x3d3a3a : face, 0, 1.32, -0.33, 0.45).rotation.x = gorilla ? 0.45 : 0.25; // 心口
  if (gorilla) {
    box(root, 1.24, 0.6, 0.66, 0xa7acae, 0, 1.58, 0.27, 0.42).rotation.x = 0.45; // 銀背（背脊淺灰色，成年雄性先有）
    box(root, 1.3, 0.4, 0.7, fur, 0, 1.95, -0.1, 0.45); // 膊頭肌肉
  }
  // 長毛（猩猩：手臂同身邊有好多啡紅長毛垂落嚟）
  if (!gorilla) for (const s of [-1, 1]) box(root, 0.12, 0.7, 0.62, furLight, s * 0.5, 1.15, 0.05, 0.45); // 身兩邊長毛
  const head = pivot(root, 0, gorilla ? 2.15 : 2.08, gorilla ? -0.5 : -0.34);
  box(head, 0.62, 0.62, 0.56, fur, 0, 0, 0, 0.45);
  box(head, 0.48, 0.42, 0.06, face, 0, -0.06, -0.285, 0.45); // 面
  box(head, gorilla ? 0.5 : 0.42, 0.08, 0.08, gorilla ? 0x2b2b2b : fur, 0, 0.12, -0.31, 0.45); // 眉骨
  box(head, gorilla ? 0.32 : 0.34, 0.2, 0.14, face, 0, -0.2, -0.34, 0.48); // 嘴
  if (gorilla) for (const s of [-1, 1]) box(head, 0.08, 0.07, 0.04, 0x111111, s * 0.06, -0.05, -0.36, 0.45); // 鼻孔
  else box(head, 0.12, 0.05, 0.03, 0x3e2723, 0, -0.08, -0.33, 0.45);
  box(head, 0.2, 0.03, 0.02, 0x2b1d14, 0, -0.25, -0.415, 0.3);
  cuteEyes(head, 0.11, 0.03, -0.32, 0.1, { iris: 0x5d4037 });
  if (flanges) for (const s of [-1, 1]) box(head, 0.24, 0.52, 0.12, face, s * 0.42, -0.04, -0.16, 0.5); // 婆羅洲猩猩大面頰
  if (beard) box(head, 0.38, 0.3, 0.14, furLight, 0, -0.4, -0.24, 0.5);
  if (!gorilla) box(root, 0.5, 0.26, 0.3, face, 0, 1.78, -0.42, 0.5); // 喉囊
  for (const s of [-1, 1]) box(head, 0.09, 0.13, 0.08, face, s * 0.31, 0.02, 0.02, 0.45); // 耳
  // 手：好長（猩猩手長過身）
  const armLen = gorilla ? 1.3 : 1.55;
  const arms = [-1, 1].map((s) => {
    const shoulder = pivot(root, s * (gorilla ? 0.72 : 0.62), 1.85, -0.15);
    box(shoulder, gorilla ? 0.38 : 0.3, armLen, gorilla ? 0.38 : 0.3, fur, 0, -armLen / 2, 0, 0.42);
    if (!gorilla) box(shoulder, 0.36, armLen * 0.7, 0.36, furLight, 0, -armLen * 0.45, 0.04, 0.4); // 手臂長毛（淺色，垂落嚟）
    box(shoulder, gorilla ? 0.42 : 0.32, 0.24, 0.36, face, 0, -armLen - 0.05, 0, 0.45);
    shoulder.rotation.x = -0.2;
    return shoulder;
  });
  g.scale.setScalar(size);
  g.userData.animate = (t, moving) => {
    legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 6 + i * PI) * 0.5 * moving));
    arms.forEach((a, i) => (a.rotation.x = -0.2 + Math.sin(t * 6 + i * PI + PI) * 0.5 * moving));
    head.rotation.y = Math.sin(t * 0.8) * 0.3 * (1 - moving);
    head.rotation.z = Math.sin(t * 0.5) * 0.08;
    root.position.y = Math.abs(Math.sin(t * 6)) * 0.05 * moving;
    torso.scale.y = 1 + Math.sin(t * 2) * 0.02; // 呼吸
    if (!moving) {
      if (gorilla) arms.forEach((a, i) => (a.rotation.x = -0.2 - Math.max(0, Math.sin(t * 0.6)) * (Math.sin(t * 14 + i * PI) > 0 ? 1.1 : 0.9))); // 拍心口
      else arms[1].rotation.x = -0.2 - Math.max(0, Math.sin(t * 0.7)) * 0.6; // 搔頭
    }
  };
  g.userData.height = 2.5 * size;
  g.userData.move = 'walk';
  return g;
}

// 爪哇犀牛：一隻細角、似盔甲咁嘅大皮摺、尖尖上唇、皮膚有鱗咁嘅紋
function a1_javanRhino() {
  const skin = 0x8a857e;
  const dark = 0x6b6660;
  const light = 0xa29d95;
  return beast({
    body: { w: 1.45, h: 1.18, d: 2.15, y: 1.32, color: skin },
    head: { w: 0.76, h: 0.68, d: 1.05, y: 1.25, z: -1.5, color: skin },
    legs: { w: 0.46, h: 0.84, x: 0.44, zf: -0.62, zb: 0.62, color: skin, paw: dark, toes: 0xd7ccc8 },
    tail: { w: 0.08, h: 0.08, d: 0.45, y: 1.6, color: skin, angle: 0.9, tip: 0x3e3a36 },
    eyeSize: 0.09,
    eyeOpts: { iris: 0x3e2723 },
    walkSpeed: 7,
    extras(p) {
      p.head.rotation.x = 0.2;
      spike(p.head, 0.15, 0.36, 0x9e8f78, 0, 0.47, -0.35, -0.25); // 一隻細角
      box(p.head, 0.2, 0.18, 0.16, dark, 0, -0.27, -0.58, 0.45); // 尖上唇
      box(p.head, 0.6, 0.06, 0.06, dark, 0, -0.32, -0.45, 0.3); // 口
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.3, 0.38, 0.38);
        box(ear, 0.15, 0.32, 0.1, skin, 0, 0.12, 0, 0.5);
        box(ear, 0.12, 0.06, 0.1, 0x4e4a45, 0, 0.3, 0, 0.45); // 耳邊毛
        p.ears.push(ear);
        box(p.head, 0.04, 0.4, 0.5, dark, s * 0.39, -0.05, 0.05, 0.4); // 面皮摺
      }
      // 招牌：三條好似盔甲咁嘅大皮摺（頸、膊頭後面、屁股前面）
      box(p.root, 0.9, 0.7, 0.55, skin, 0, 1.25, -1.05, 0.45); // 粗頸
      for (const z of [-0.98, -0.42, 0.48]) box(p.root, 1.49, 1.21, 0.06, dark, 0, 1.33, z, 0.4); // 一圈圈皮摺（好似盔甲咁分開幾塊）
      box(p.root, 1.47, 0.45, 0.5, light, 0, 1.72, -0.7, 0.4); // 膊頭嗰塊皮（淺啲）
      box(p.root, 1.47, 0.45, 0.85, light, 0, 1.72, 0.95, 0.4); // 屁股嗰塊皮
      // 鱗咁嘅皮膚紋
      let sd = 5;
      const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 20; i++) {
        const side = r() < 0.5 ? -1 : 1;
        box(p.root, 0.02, 0.07, 0.07, 0x938e87, side * 0.73, 0.9 + r() * 0.75, -0.9 + r() * 1.9, 0.4);
      }
    },
  });
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

// 動物 21–35 嘅新靚版本（本來用共用嘅 bird／bigCat／ape／rhino；而家覆蓋返佢哋自己嘅）
Object.assign(ANIMALS_30, {
  'Atlantic Puffin': a1_puffin,
  'Amur Leopard': a1_leopard,
  'Sumatran Orangutan': () => a1_greatApe({ fur: 0xd2783a, furLight: 0xe8964f, face: 0x8a6a58, beard: true }),
  'Bornean Orangutan': () => a1_greatApe({ fur: 0x9a4318, furLight: 0xb75a26, face: 0x5a4034, flanges: true }),
  'Mountain Gorilla': () => a1_greatApe({ fur: 0x26262a, furLight: 0x3a3a3e, face: 0x3d3536, size: 1.15, gorilla: true }),
});
// 動物 36–50 新款（小朋友 2026-10-17）：用自己嘅新 builder，唔改上面共用嘅 bigCat／ape／rhino
Object.assign(ANIMALS_30, {
  'Javan Rhino': a2_javanRhino,
  'Sumatran Rhino': a2_sumatranRhino,
  'Snow Leopard': a2_snowLeopard,
  'Golden Snub-nosed Monkey': a2_snubMonkey,
  'Andean Cat': a2_andeanCat,
});
