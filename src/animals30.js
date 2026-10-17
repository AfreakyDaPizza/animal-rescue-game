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

// 動物 21–35 嘅新靚版本（本來用共用嘅 bird／bigCat／ape／rhino；而家覆蓋返佢哋自己嘅）
Object.assign(ANIMALS_30, {
  'Atlantic Puffin': a1_puffin,
  'Amur Leopard': a1_leopard,
  'Sumatran Orangutan': () => a1_greatApe({ fur: 0xd2783a, furLight: 0xe8964f, face: 0x8a6a58, beard: true }),
  'Bornean Orangutan': () => a1_greatApe({ fur: 0x9a4318, furLight: 0xb75a26, face: 0x5a4034, flanges: true }),
  'Mountain Gorilla': () => a1_greatApe({ fur: 0x26262a, furLight: 0x3a3a3e, face: 0x3d3536, size: 1.15, gorilla: true }),
  'Javan Rhino': a1_javanRhino,
});
