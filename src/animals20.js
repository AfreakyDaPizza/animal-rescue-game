// 頭 20 隻動物（Biome 1–3）嘅新設計：小朋友話舊嘅好醜，重新砌過
// 方塊（Roblox）風格，但係大頭、大眼（有眼白同反光）、腳掌、花紋、羽毛層次、一節節識擺嘅身
// 全部面向 -z。每個回傳 Group：userData.animate(time, moving)、userData.height、userData.move

import * as THREE from 'three';
import { box, pivot, cuteEyes, spike, BLACK, WHITE } from './modelKit.js';

const PI = Math.PI;

// 側面嘅眼（魚、鯨用）：喺 (±x, y, z) 兩邊各一隻，面向外面
export function sideEyes(parent, x, y, z, size, { pupil = BLACK } = {}) {
  for (const s of [-1, 1]) {
    const p = pivot(parent, s * x, y, z);
    p.rotation.y = s * PI / 2 + PI; // 塊面向外
    box(p, size * 1.05, size * 1.15, 0.03, 0xffffff, 0, 0, 0, 0.35);
    box(p, size * 0.55, size * 0.65, 0.03, pupil, 0, -size * 0.08, -0.02, 0.4);
    box(p, size * 0.22, size * 0.22, 0.02, 0xffffff, size * 0.15, size * 0.18, -0.035, 0.4);
  }
}

// ================= 四隻腳嘅動物 =================
// o.body {w,h,d,y,color}  o.head {w,h,d,y,z,color}  o.legs {w,h,x,zf,zb,color,paw?,toes?}
export function beast(o) {
  const g = new THREE.Group();
  const root = pivot(g);
  const L = o.legs;
  const legs = [];
  for (const [x, z, phase] of [[-L.x, L.zf, 0], [L.x, L.zf, PI], [-L.x, L.zb, PI], [L.x, L.zb, 0]]) {
    const hip = pivot(root, x, L.h, z);
    box(hip, L.w, L.h, L.w, L.color, 0, -L.h / 2, 0, 0.3);
    if (L.paw) box(hip, L.w * 1.1, L.h * 0.2, L.w * 1.15, L.paw, 0, -L.h * 0.9, -L.w * 0.04, 0.35);
    if (L.toes) for (const tx of [-1, 0, 1]) box(hip, L.w * 0.24, L.w * 0.18, 0.07, L.toes, tx * L.w * 0.3, -L.h + L.w * 0.1, -L.w * 0.56, 0.4);
    legs.push({ hip, phase });
  }
  const B = o.body;
  box(root, B.w, B.h, B.d, B.color, 0, B.y, 0, 0.3);
  if (o.belly) box(root, B.w * 0.82, B.h * 0.3, B.d * 0.82, o.belly, 0, B.y - B.h * 0.4, 0, 0.35);
  const H = o.head;
  const neck = pivot(root, 0, H.y, H.z);
  const head = pivot(neck);
  box(head, H.w, H.h, H.d, H.color, 0, 0, 0, 0.32);
  if (o.eyes !== false) cuteEyes(head, H.w * 0.24, H.h * 0.12, -H.d / 2 - 0.015, o.eyeSize ?? H.w * 0.19, o.eyeOpts);
  let tail = null;
  if (o.tail) {
    const T = o.tail;
    tail = pivot(root, 0, T.y, B.d / 2 - 0.05);
    box(tail, T.w, T.h, T.d, T.color, 0, 0, T.d / 2, 0.35);
    if (T.tip) box(tail, T.w * 1.3, T.w * 1.3, T.w * 1.6, T.tip, 0, 0, T.d, 0.4);
    tail.rotation.x = T.angle ?? 0;
  }
  const parts = { g, root, head, neck, tail, legs, ears: [] };
  o.extras?.(parts);

  const speed = o.walkSpeed ?? 9;
  const swing = o.swing ?? 0.55;
  g.userData.animate = (t, moving) => {
    for (const l of legs) l.hip.rotation.x = Math.sin(t * speed + l.phase) * swing * moving;
    root.position.y = Math.abs(Math.sin(t * speed)) * 0.05 * moving;
    neck.rotation.x = Math.sin(t * 2) * 0.05 + Math.sin(t * speed * 2) * 0.03 * moving; // 點頭
    neck.rotation.y = Math.sin(t * 0.7) * 0.28 * (1 - moving); // 企定時四圍望
    if (tail) tail.rotation.y = Math.sin(t * 6) * 0.35;
    parts.ears.forEach((e, i) => (e.rotation.z = Math.max(0, Math.sin(t * 1.3 + i)) > 0.95 ? Math.sin(t * 30) * 0.3 : 0)); // 耳仔郁一郁
    parts.animate?.(t, moving);
  };
  g.userData.height = Math.max(B.y + B.h / 2, H.y + H.h / 2) + (o.extraHeight || 0);
  g.userData.move = 'walk';
  return g;
}

function panda() {
  const black = 0x1d1d1d;
  return beast({
    body: { w: 1.15, h: 1.0, d: 1.5, y: 1.05, color: WHITE },
    head: { w: 0.98, h: 0.86, d: 0.82, y: 1.5, z: -1.0, color: WHITE },
    legs: { w: 0.4, h: 0.68, x: 0.33, zf: -0.48, zb: 0.48, color: black, paw: 0x2b2b2b },
    tail: { w: 0.22, h: 0.2, d: 0.16, y: 1.2, color: WHITE },
    eyes: false,
    extras(p) {
      box(p.root, 1.19, 1.04, 0.55, black, 0, 1.05, -0.38, 0.3); // 膊頭黑帶
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.36, 0.4, 0.05);
        box(ear, 0.3, 0.28, 0.18, black, 0, 0.08, 0, 0.45);
        p.ears.push(ear);
        const patch = box(p.head, 0.27, 0.33, 0.05, black, s * 0.21, 0.04, -0.41, 0.45); // 黑眼圈（斜斜）
        patch.rotation.z = s * -0.35;
      }
      cuteEyes(p.head, 0.21, 0.06, -0.44, 0.12);
      box(p.head, 0.46, 0.3, 0.2, WHITE, 0, -0.2, -0.46, 0.4); // 嘴
      box(p.head, 0.17, 0.11, 0.06, black, 0, -0.1, -0.57, 0.45); // 鼻
      box(p.head, 0.12, 0.03, 0.03, 0x5d4037, 0, -0.26, -0.565); // 口
      // 咬住竹
      const bamboo = pivot(p.head, 0, -0.27, -0.6);
      box(bamboo, 1.0, 0.07, 0.07, 0x7cb342, 0.15, 0, 0, 0.3);
      for (const x of [-0.15, 0.25, 0.55]) box(bamboo, 0.09, 0.09, 0.09, 0x558b2f, x, 0, 0, 0.3);
      box(bamboo, 0.22, 0.04, 0.12, 0x9ccc65, 0.62, 0.06, 0.05, 0.3).rotation.y = 0.5; // 葉
    },
  });
}

function elephant(forest) {
  const skin = forest ? 0x726d68 : 0x9c968f;
  const dark = forest ? 0x5e5955 : 0x857f78;
  const g = beast({
    body: { w: 1.9, h: 1.7, d: 2.5, y: 2.15, color: skin },
    head: { w: 1.25, h: 1.2, d: 1.0, y: 2.6, z: -1.55, color: skin },
    legs: { w: 0.6, h: 1.4, x: 0.58, zf: -0.78, zb: 0.78, color: skin, paw: dark, toes: 0xf1e8d8 },
    tail: { w: 0.09, h: 0.09, d: 0.7, y: 2.4, color: skin, angle: 0.9, tip: 0x3e3a36 },
    eyeSize: 0.13,
    walkSpeed: 6,
    swing: 0.4,
    extras(p) {
      box(p.head, 1.0, 0.35, 0.7, skin, 0, 0.62, 0.05, 0.45); // 額頭
      for (const y of [1.6, 2.0, 2.4]) box(p.root, 1.94, 0.05, 2.0, dark, 0, y, 0, 0.3); // 皺紋
      const earH = forest ? 0.85 : 1.35;
      const earD = forest ? 0.8 : 1.15;
      const ears = [-1, 1].map((s) => {
        const ear = pivot(p.head, s * 0.6, 0.15, 0.1);
        box(ear, 0.1, earH, earD, skin, s * 0.06, -earH * 0.12, earD * 0.38, 0.35);
        box(ear, 0.04, earH * 0.75, earD * 0.7, 0xd7a9a3, s * -0.0, -earH * 0.12, earD * 0.4, 0.35); // 粉紅耳仔入面
        return { ear, s };
      });
      // 象鼻：四節，越嚟越幼，尾有粉紅
      let parent = p.head;
      const trunk = [];
      [0.4, 0.34, 0.28, 0.22].forEach((w, i) => {
        const seg = pivot(parent, 0, i === 0 ? -0.3 : -0.42, i === 0 ? -0.5 : 0);
        box(seg, w, 0.48, w, skin, 0, -0.22, 0, 0.4);
        if (i === 3) box(seg, w * 1.05, 0.08, w * 1.05, 0xd7a9a3, 0, -0.46, 0, 0.4);
        trunk.push(seg);
        parent = seg;
      });
      // 象牙：兩節，彎彎向前
      for (const s of [-1, 1]) {
        const tusk = pivot(p.head, s * 0.32, -0.42, -0.42);
        box(tusk, 0.13, 0.13, forest ? 0.7 : 0.55, 0xfff8e1, 0, 0, -0.25, 0.45).rotation.x = forest ? 0.75 : 0.35;
        if (!forest) box(tusk, 0.11, 0.11, 0.35, 0xfff8e1, 0, 0.12, -0.6, 0.45).rotation.x = -0.4;
      }
      p.animate = (t) => {
        trunk.forEach((seg, i) => (seg.rotation.x = Math.sin(t * 1.4 + i * 0.6) * 0.18 + (i ? 0.12 : 0)));
        ears.forEach(({ ear, s }) => (ear.rotation.y = s * (0.2 + Math.sin(t * 2) * 0.18)));
      };
    },
  });
  if (forest) g.scale.setScalar(0.82);
  return g;
}

function blackRhino() {
  const skin = 0x7a736b;
  const dark = 0x625c55;
  return beast({
    body: { w: 1.4, h: 1.15, d: 2.1, y: 1.32, color: skin },
    head: { w: 0.78, h: 0.7, d: 1.05, y: 1.25, z: -1.48, color: skin },
    legs: { w: 0.44, h: 0.82, x: 0.42, zf: -0.6, zb: 0.6, color: skin, paw: dark, toes: 0xd7ccc8 },
    tail: { w: 0.08, h: 0.08, d: 0.45, y: 1.6, color: skin, angle: 0.9, tip: 0x3e3a36 },
    eyeSize: 0.1,
    walkSpeed: 7,
    extras(p) {
      p.head.rotation.x = 0.22;
      spike(p.head, 0.2, 0.85, 0xbcae96, 0, 0.6, -0.38, -0.32); // 大角
      spike(p.head, 0.14, 0.42, 0xbcae96, 0, 0.48, -0.02, -0.18); // 細角
      box(p.head, 0.22, 0.17, 0.16, dark, 0, -0.27, -0.58, 0.45); // 尖尖嘅上唇（黑犀牛特徵）
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.3, 0.38, 0.38);
        box(ear, 0.14, 0.32, 0.1, skin, 0, 0.12, 0, 0.45);
        box(ear, 0.1, 0.08, 0.08, 0x3e3a36, 0, 0.3, 0, 0.45); // 耳仔毛
        p.ears.push(ear);
      }
      for (const z of [-0.45, 0.5]) box(p.root, 1.44, 0.14, 0.14, dark, 0, 1.3, z, 0.4); // 皮摺
    },
  });
}

function redPanda() {
  const fur = 0xc4461a;
  const dark = 0x3e2723;
  return beast({
    body: { w: 0.56, h: 0.5, d: 0.95, y: 0.64, color: fur },
    head: { w: 0.62, h: 0.52, d: 0.5, y: 0.92, z: -0.62, color: 0xcf5321 },
    legs: { w: 0.17, h: 0.44, x: 0.17, zf: -0.3, zb: 0.3, color: dark, paw: 0x261410 },
    tail: { w: 0.3, h: 0.3, d: 1.05, y: 0.74, color: fur, angle: -0.25 },
    belly: dark,
    eyeSize: 0.12,
    walkSpeed: 10,
    extras(p) {
      box(p.head, 0.54, 0.22, 0.05, WHITE, 0, -0.1, -0.24, 0.45); // 白色面罩
      for (const s of [-1, 1]) {
        box(p.head, 0.12, 0.08, 0.04, WHITE, s * 0.15, 0.16, -0.255, 0.45); // 白眉
        box(p.head, 0.06, 0.14, 0.04, 0x8d2b0b, s * 0.15, -0.12, -0.27, 0.45); // 淚痕
        const ear = pivot(p.head, s * 0.22, 0.3, 0.02);
        box(ear, 0.2, 0.2, 0.08, WHITE, 0, 0.06, 0, 0.45);
        box(ear, 0.12, 0.12, 0.06, 0x8d2b0b, 0, 0.05, -0.02, 0.45);
        p.ears.push(ear);
      }
      box(p.head, 0.1, 0.07, 0.05, BLACK, 0, -0.04, -0.285, 0.45);
      for (let i = 0; i < 4; i++) box(p.tail, 0.32, 0.32, 0.1, 0xe8a77a, 0, 0, 0.2 + i * 0.24, 0.4); // 尾巴圈
    },
  });
}

function okapi() {
  const fur = 0x3b1f17;
  const cream = 0xe0cba8;
  return beast({
    body: { w: 0.76, h: 0.85, d: 1.45, y: 1.55, color: fur },
    head: { w: 0.42, h: 0.46, d: 0.72, y: 2.3, z: -1.08, color: fur },
    legs: { w: 0.18, h: 1.15, x: 0.24, zf: -0.5, zb: 0.5, color: WHITE, paw: 0x3b1f17 },
    tail: { w: 0.08, h: 0.08, d: 0.45, y: 1.75, color: fur, angle: 0.9, tip: BLACK },
    eyeSize: 0.09,
    walkSpeed: 7,
    extraHeight: 0.3,
    extras(p) {
      const neck = box(p.root, 0.34, 0.95, 0.36, fur, 0, 2.0, -0.8, 0.35);
      neck.rotation.x = -0.4;
      // 腳上面嘅斑馬紋（黑白間）
      for (const leg of p.legs) for (let i = 0; i < 4; i++) box(leg.hip, 0.19, 0.06, 0.19, BLACK, 0, -0.15 - i * 0.17, 0, 0.3);
      // 屁股嘅斑馬紋
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) box(p.root, 0.04, 0.07, 0.55, i % 2 ? WHITE : BLACK, s * 0.385, 1.5 - i * 0.13, 0.45, 0.3);
      box(p.head, 0.44, 0.3, 0.42, cream, 0, -0.08, -0.18, 0.4); // 淺色面
      box(p.head, 0.14, 0.08, 0.05, BLACK, 0, -0.04, -0.37, 0.45);
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.24, 0.24, 0.15);
        box(ear, 0.08, 0.34, 0.24, fur, s * 0.04, 0.08, 0, 0.4);
        box(ear, 0.04, 0.24, 0.16, cream, s * 0.01, 0.08, -0.02, 0.4);
        p.ears.push(ear);
        box(p.head, 0.07, 0.16, 0.07, fur, s * 0.1, 0.3, 0.1, 0.4); // 細角
      }
    },
  });
}

// ================= 游水嘅動物（一節節，擺起嚟好似波浪）=================
// whale = 上下擺（鯨、海豚、儒艮）；否則左右擺（魚、鯊）
export function swimmer({ skin, belly, len, w, h, whale = true, dorsal = 0, eyeSize, eyeZ = 0.3, extras }) {
  const g = new THREE.Group();
  const swimY = h / 2 + 0.35;
  const root = pivot(g, 0, swimY, 0);
  const headLen = len * 0.4;
  // 頭 + 前身
  box(root, w, h, headLen, skin, 0, 0, -len / 2 + headLen / 2, 0.38);
  box(root, w * 0.86, h * 0.4, headLen * 0.9, belly, 0, -h * 0.32, -len / 2 + headLen / 2, 0.4);
  sideEyes(root, w / 2 + 0.01, h * 0.08, -len / 2 + headLen * eyeZ, eyeSize ?? Math.max(0.08, w * 0.14));
  // 中身
  const mid = pivot(root, 0, 0, -len / 2 + headLen);
  box(mid, w * 0.9, h * 0.88, len * 0.32, skin, 0, 0, len * 0.16, 0.38);
  box(mid, w * 0.76, h * 0.36, len * 0.3, belly, 0, -h * 0.3, len * 0.16, 0.4);
  if (dorsal) {
    const fin = box(mid, 0.08, h * dorsal, len * 0.1, skin, 0, h * 0.4 + h * dorsal * 0.3, len * 0.18, 0.3);
    fin.rotation.x = 0.45;
  }
  // 尾段
  const rear = pivot(mid, 0, 0, len * 0.32);
  box(rear, w * 0.6, h * 0.58, len * 0.22, skin, 0, 0, len * 0.11, 0.38);
  const fluke = pivot(rear, 0, 0, len * 0.22);
  if (whale) {
    for (const s of [-1, 1]) {
      const lobe = box(fluke, w * 0.8, 0.08, len * 0.12, skin, s * w * 0.35, 0, len * 0.05, 0.4);
      lobe.rotation.y = s * 0.35;
    }
  } else {
    box(fluke, 0.08, h * 1.1, len * 0.1, skin, 0, h * 0.28, len * 0.06, 0.35).rotation.x = 0.35; // 上尾鰭大啲
    box(fluke, 0.08, h * 0.6, len * 0.08, skin, 0, -h * 0.2, len * 0.04, 0.35).rotation.x = -0.4;
  }
  // 胸鰭
  const fins = [-1, 1].map((s) => {
    const fp = pivot(root, s * w * 0.45, -h * 0.25, -len / 2 + headLen * 0.75);
    box(fp, w * 0.55, 0.06, len * 0.1, skin, s * w * 0.27, 0, 0.04, 0.35).rotation.y = s * -0.35;
    return { fp, s };
  });
  const parts = { g, root, mid, rear, fluke, headLen };
  extras?.(parts);
  g.userData.animate = (t, moving) => {
    const sp = 2.6 + moving * 2;
    const axis = whale ? 'x' : 'y';
    const a = whale ? 0.1 : 0.16;
    mid.rotation[axis] = Math.sin(t * sp) * a;
    rear.rotation[axis] = Math.sin(t * sp - 0.9) * a * 1.5;
    fluke.rotation[axis] = Math.sin(t * sp - 1.8) * a * 2.2;
    fins.forEach(({ fp, s }) => (fp.rotation.z = s * Math.sin(t * 2) * 0.25));
    root.position.y = swimY + Math.sin(t * 1.5) * 0.12;
  };
  g.userData.height = swimY + h;
  g.userData.move = 'swim';
  return g;
}

function blueWhale() {
  return swimmer({
    skin: 0x4f7394, belly: 0xb7c7d6, len: 5.6, w: 1.15, h: 1.0, dorsal: 0.25, eyeZ: 0.75,
    extras({ root, mid }) {
      for (let i = 0; i < 5; i++) box(root, 0.06, 0.02, 1.8, 0x93a9bd, -0.36 + i * 0.18, -0.52, -1.6, 0.3); // 喉嚨嘅坑紋
      for (let i = 0; i < 10; i++) box(i < 5 ? root : mid, 0.16, 0.02, 0.2, 0x6f8fab, ((i * 3) % 5 - 2) * 0.18, 0.51, (i % 5) * 0.35 - (i < 5 ? 2.2 : -0.3), 0.4); // 背上斑點
      box(root, 1.0, 0.04, 0.04, 0x2f4a62, 0, -0.12, -2.79, 0.3); // 口
    },
  });
}

function vaquita() {
  return swimmer({
    skin: 0x8a949c, belly: 0xdfe4e7, len: 1.6, w: 0.48, h: 0.46, dorsal: 0.55, eyeSize: 0.08,
    extras({ root }) {
      for (const s of [-1, 1]) box(root, 0.02, 0.16, 0.18, 0x1d1d1d, s * 0.245, 0.03, -0.5, 0.4); // 招牌黑眼圈
      box(root, 0.3, 0.05, 0.05, 0x1d1d1d, 0, -0.1, -0.81, 0.3); // 黑嘴唇
      box(root, 0.2, 0.06, 0.04, 0xff8a80, 0, -0.15, -0.8, 0.3); // 笑口
    },
  });
}

function dugong() {
  return swimmer({
    skin: 0x9b958e, belly: 0xbeb7ae, len: 2.5, w: 0.85, h: 0.75, eyeSize: 0.08, eyeZ: 0.45,
    extras({ root }) {
      const snout = pivot(root, 0, -0.15, -1.25);
      box(snout, 0.55, 0.4, 0.32, 0xb3aca2, 0, -0.08, -0.08, 0.45); // 向下彎嘅大鼻
      for (let i = 0; i < 6; i++) box(snout, 0.04, 0.04, 0.02, 0x5d5853, ((i % 3) - 1) * 0.14, -0.1 - Math.floor(i / 3) * 0.1, -0.25, 0.4); // 鬚
    },
  });
}

function hammerhead() {
  return swimmer({
    skin: 0x7c8894, belly: 0xeceff1, len: 2.7, w: 0.56, h: 0.56, whale: false, dorsal: 1.2, eyeSize: 0.001,
    extras({ root }) {
      const hammer = box(root, 1.45, 0.2, 0.42, 0x7c8894, 0, 0.04, -1.32, 0.35); // 錘頭
      hammer.castShadow = true;
      sideEyes(root, 0.73, 0.04, -1.32, 0.11); // 眼喺錘頭兩邊
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) box(root, 0.02, 0.2, 0.03, 0x5f6a74, s * 0.285, 0, -0.7 + i * 0.08, 0.3); // 鰓
    },
  });
}

function whaleShark() {
  return swimmer({
    skin: 0x3d5a73, belly: 0xe6eaed, len: 4.2, w: 1.15, h: 0.75, whale: false, dorsal: 0.9, eyeSize: 0.09, eyeZ: 0.4,
    extras({ root, mid }) {
      box(root, 1.2, 0.35, 0.4, 0x3d5a73, 0, -0.1, -1.95, 0.35); // 又闊又扁嘅頭
      box(root, 1.0, 0.05, 0.05, 0x22313f, 0, -0.18, -2.16, 0.3); // 大大個口
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) box(r < 2 ? root : mid, 0.11, 0.02, 0.11, WHITE, (c - 1.5) * 0.24, 0.385, (r < 2 ? -1.7 + r * 0.5 : 0.3) + (c % 2) * 0.12, 0.4); // 白點
      for (const s of [-1, 1]) box(root, 0.04, 0.03, 1.4, 0x56738c, s * 0.3, 0.38, -1.2, 0.3); // 背脊
    },
  });
}

function manta() {
  const top = 0x23282e;
  const g = new THREE.Group();
  const root = pivot(g, 0, 0.95, 0);
  box(root, 0.95, 0.3, 1.1, top, 0, 0, 0, 0.4);
  box(root, 0.85, 0.08, 1.0, WHITE, 0, -0.15, 0, 0.4);
  const wings = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.45, 0, 0);
    box(p, 1.0, 0.16, 0.95, top, s * 0.5, 0, 0.05, 0.4);
    box(p, 0.7, 0.12, 0.6, top, s * 1.2, 0, 0.18, 0.4);
    box(p, 0.4, 0.08, 0.3, top, s * 1.68, 0, 0.3, 0.4); // 翼尖
    box(p, 0.95, 0.04, 0.8, WHITE, s * 0.5, -0.09, 0.05, 0.4);
    return { p, s };
  });
  for (const s of [-1, 1]) {
    const horn = box(root, 0.14, 0.12, 0.45, top, s * 0.33, 0, -0.72, 0.4); // 頭鰭
    horn.rotation.y = s * -0.15;
  }
  sideEyes(root, 0.48, 0.05, -0.42, 0.1);
  box(root, 0.5, 0.05, 0.05, 0x111111, 0, -0.06, -0.56, 0.3); // 闊口
  for (let i = 0; i < 4; i++) box(root, 0.08, 0.02, 0.08, 0x37474f, ((i % 2) - 0.5) * 0.3, -0.2, -0.1 + Math.floor(i / 2) * 0.3, 0.4); // 肚底斑點
  box(root, 0.05, 0.05, 1.4, top, 0, 0, 1.25, 0.3); // 尾
  g.userData.animate = (t) => {
    wings.forEach(({ p, s }) => (p.rotation.z = s * Math.sin(t * 2.5) * 0.42));
    root.position.y = 0.95 + Math.sin(t * 2.5 - 1) * 0.12;
  };
  g.userData.height = 1.25;
  g.userData.move = 'swim';
  return g;
}

function seaTurtle() {
  const shell = 0x5b7a3a;
  const scute = 0x8b9d52;
  const skin = 0x8aa05f;
  const g = new THREE.Group();
  const root = pivot(g, 0, 0.55, 0);
  box(root, 1.25, 0.32, 1.45, shell, 0, 0.05, 0, 0.4); // 殼（兩層，似個圓頂）
  box(root, 0.95, 0.24, 1.15, shell, 0, 0.3, 0, 0.45);
  for (let i = 0; i < 5; i++) box(root, 0.32, 0.04, 0.32, scute, i === 2 ? 0 : ((i % 2) - 0.5) * 0.44, 0.43, -0.4 + Math.floor(i / 2) * 0.4, 0.4); // 殼花紋
  box(root, 1.05, 0.12, 1.25, 0xead9a6, 0, -0.14, 0, 0.4); // 肚殼
  const head = pivot(root, 0, 0.08, -0.78);
  box(head, 0.42, 0.34, 0.48, skin, 0, 0, -0.14, 0.42);
  box(head, 0.2, 0.1, 0.1, 0x5d6b3a, 0, -0.06, -0.39, 0.4); // 鳥咀咁嘅口
  cuteEyes(head, 0.13, 0.06, -0.385, 0.1);
  for (let i = 0; i < 3; i++) box(head, 0.08, 0.02, 0.08, 0x6b8a3a, ((i % 2) - 0.5) * 0.2, 0.17, -0.1 - i * 0.1, 0.4); // 頭頂花紋
  const flippers = [[-1, -0.35, 1.0], [1, -0.35, 1.0], [-1, 0.5, 0.45], [1, 0.5, 0.45]].map(([s, z, len], i) => {
    const p = pivot(root, s * 0.6, -0.04, z);
    box(p, len, 0.08, 0.34, skin, s * len / 2, 0, i < 2 ? 0.08 : 0, 0.4);
    if (i < 2) box(p, 0.12, 0.03, 0.12, 0x6b8a3a, s * len * 0.6, 0.05, 0.05, 0.4);
    return { p, s, i };
  });
  g.userData.animate = (t, moving) => {
    flippers.forEach(({ p, s, i }) => (p.rotation.y = s * Math.sin(t * 2.5 + (i < 2 ? 0 : 1)) * (0.28 + moving * 0.2)));
    head.rotation.y = Math.sin(t * 0.8) * 0.3;
    root.position.y = 0.55 + Math.sin(t * 1.5) * 0.08;
  };
  g.userData.height = 1.05;
  g.userData.move = 'swim';
  return g;
}

// ================= 雀 =================
// 身有兩層（羽毛同心口）、勾嘴、翼有翼尖色、尾巴三條羽毛扇開、腳有腳趾
export function bird(o) {
  const {
    body, belly = body, head: headColor = body, wing = body, wingTip = wing, tail: tailColor = wing, tailTip = tailColor,
    beak = 0x2b2b2b, beakLower = beak, face = null, crest = null, eyeRing = null, legColor = 0x6d6d6d,
    size = 1, tailLen = 0.7, chunky = false, flightless = false, bald = false, eyeOpts,
  } = o;
  const g = new THREE.Group();
  const root = pivot(g);
  const bw = chunky ? 0.66 : 0.52;
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.13, chunky ? 0.32 : 0.44, 0);
    box(hip, 0.07, chunky ? 0.28 : 0.4, 0.07, legColor, 0, chunky ? -0.14 : -0.2, 0, 0.3);
    for (const tx of [-1, 0, 1]) box(hip, 0.05, 0.04, 0.16, legColor, tx * 0.06, chunky ? -0.3 : -0.42, -0.07, 0.3); // 腳趾
    return hip;
  });
  const bodyY = chunky ? 0.7 : 0.8;
  const torso = box(root, bw, chunky ? 0.66 : 0.6, 0.6, body, 0, bodyY, 0.02, 0.38);
  torso.rotation.x = 0.25;
  box(root, bw * 0.75, 0.45, 0.12, belly, 0, bodyY - 0.05, -0.24, 0.4).rotation.x = 0.25; // 心口
  const head = pivot(root, 0, bodyY + 0.47, -0.12);
  box(head, 0.48, 0.44, 0.44, bald ? headColor : headColor, 0, 0, 0, 0.4);
  if (face) box(head, 0.4, 0.26, 0.05, face, 0, -0.04, -0.215, 0.4);
  if (eyeRing) for (const s of [-1, 1]) box(head, 0.15, 0.17, 0.03, eyeRing, s * 0.12, 0.06, -0.225, 0.4);
  cuteEyes(head, 0.12, 0.06, -0.24, 0.1, eyeOpts);
  // 勾嘴：上嘴 + 勾尖 + 下嘴
  box(head, 0.17, 0.14, 0.17, beak, 0, -0.02, -0.3, 0.35);
  box(head, 0.11, 0.13, 0.08, beak, 0, -0.12, -0.37, 0.35);
  box(head, 0.12, 0.07, 0.11, beakLower, 0, -0.13, -0.28, 0.35);
  if (crest) for (let i = 0; i < 4; i++) {
    const c = box(head, 0.07, 0.3 - i * 0.03, 0.07, crest, (i - 1.5) * 0.09, 0.27, 0.12, 0.3);
    c.rotation.x = 0.7;
    c.rotation.z = (i - 1.5) * 0.15;
  }
  const wings = [-1, 1].map((s) => {
    const shoulder = pivot(root, s * (bw / 2 + 0.02), bodyY + 0.2, 0.02);
    box(shoulder, 0.08, 0.5, 0.46, wing, s * 0.03, -0.22, 0.04, 0.38);
    box(shoulder, 0.08, 0.24, 0.38, wingTip, s * 0.03, -0.55, 0.12, 0.38);
    return { shoulder, s };
  });
  const tail = pivot(root, 0, bodyY - 0.2, 0.3);
  tail.rotation.x = 0.6;
  for (const i of [-1, 0, 1]) {
    const f = pivot(tail, i * 0.07, 0, 0);
    f.rotation.y = i * 0.12;
    box(f, 0.08, 0.04, tailLen, tailColor, 0, 0, tailLen / 2, 0.3);
    box(f, 0.08, 0.04, tailLen * 0.25, tailTip, 0, 0, tailLen * 0.9, 0.3);
  }
  g.scale.setScalar(size);
  g.userData.move = flightless ? 'walk' : 'fly';
  g.userData.animate = (t, moving) => {
    if (g.userData.flying) {
      // 飛緊：一路拍翼、對腳收埋、身向前傾
      legs.forEach((l) => (l.rotation.x = 0.9));
      root.rotation.x = 0.35;
      root.position.y = 0;
      wings.forEach(({ shoulder, s }) => (shoulder.rotation.z = s * (0.35 + Math.sin(t * 14) * 0.95)));
      head.rotation.set(-0.3, 0, 0);
      return;
    }
    legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 12 + i * PI) * 0.6 * moving));
    root.position.y = Math.abs(Math.sin(t * 12)) * 0.06 * moving;
    const flap = Math.max(0, Math.sin(t * 1.3)) > 0.85 ? Math.sin(t * 25) * 0.9 : 0.05; // 間中拍下翼
    wings.forEach(({ shoulder, s }) => (shoulder.rotation.z = s * Math.abs(flap)));
    head.rotation.y = Math.sin(t * 1.7) * 0.4 * (1 - moving);
    head.rotation.z = Math.sin(t * 0.9) * 0.15; // 側頭睇你
    tail.rotation.x = 0.6 + Math.sin(t * 3) * 0.05;
  };
  g.userData.height = 1.55 * size;
  return g;
}

export const ANIMALS_20 = {
  'Giant Panda': panda,
  'African Savanna Elephant': () => elephant(false),
  'African Forest Elephant': () => elephant(true),
  'Black Rhinoceros': blackRhino,
  'Red Panda': redPanda,
  Okapi: okapi,

  'Manta Ray': manta,
  'Scalloped Hammerhead Shark': hammerhead,
  'Blue Whale': blueWhale,
  Vaquita: vaquita,
  'Sea Turtle': seaTurtle,
  'Whale Shark': whaleShark,
  Dugong: dugong,

  "Spix's Macaw": () => bird({ body: 0x3a7bd5, head: 0xa9c4e8, face: 0x6f7b88, wing: 0x2c63b8, wingTip: 0x1e4a8f, tail: 0x2c63b8, tailLen: 0.95 }),
  'Philippine Eagle': () => bird({
    body: 0x6b4a2e, belly: 0xf5f0e4, head: 0xe9dcc0, wing: 0x5a3d24, wingTip: 0x3e2a18, tail: 0x5a3d24, tailTip: 0x3e2a18,
    beak: 0x5f7184, beakLower: 0x6f8296, crest: 0xc8a876, size: 1.5, tailLen: 0.5, legColor: 0xf2c94c,
    eyeOpts: { iris: 0x90a4ae },
  }),
  Kakapo: () => bird({
    body: 0x7b9a35, belly: 0xc2b85a, head: 0x9aa94c, face: 0xd1c27a, wing: 0x6a8a2c, wingTip: 0x4e6a1f, tail: 0x6a8a2c,
    beak: 0xe0d6bd, chunky: true, flightless: true, size: 1.15, tailLen: 0.3, legColor: 0x9e9e9e,
  }),
  'Hyacinth Macaw': () => bird({
    body: 0x2547b0, wing: 0x1e3c99, wingTip: 0x172f7a, tail: 0x1e3c99, beak: 0x1f1f1f, beakLower: 0xffd600,
    eyeRing: 0xffd600, size: 1.3, tailLen: 1.1, legColor: 0x424242,
  }),
  'Sun Conure': () => bird({
    body: 0xffc107, belly: 0xff9800, head: 0xffb300, face: 0xff6d00, wing: 0x8bc34a, wingTip: 0x1e88e5, tail: 0x8bc34a, tailTip: 0x1e88e5,
    beak: 0x2b2b2b, size: 0.8, tailLen: 0.6,
  }),
  'California Condor': () => bird({
    body: 0x1b1b1b, belly: 0x262626, head: 0xf08a6a, face: 0xe57373, wing: 0x151515, wingTip: 0xf5f5f5, tail: 0x151515,
    beak: 0xe8d8b8, size: 1.55, tailLen: 0.45, bald: true, legColor: 0x9e9e9e, crest: 0x111111,
  }),
  'Bali Myna': () => bird({
    body: WHITE, head: WHITE, wing: 0xf0f0ea, wingTip: 0x1d1d1d, tail: 0xf0f0ea, tailTip: 0x1d1d1d, beak: 0xf9d55a,
    eyeRing: 0x1e88e5, crest: 0xffffff, size: 0.75, tailLen: 0.5, legColor: 0x90a4ae,
  }),
};
