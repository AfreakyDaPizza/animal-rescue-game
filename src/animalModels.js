// 50 隻動物嘅 3D 模型：方塊（Roblox）風格，有動畫
// 全部面向 -z。buildAnimalModel(animal) 回傳一個 Group：
//   group.userData.animate(time, moving)  ← 每格畫面叫，moving = 0（企定）到 1（行緊）
//   group.userData.height                 ← 幾高（頭頂名牌放喺上面）
//   group.userData.move                   ← 'walk'（行）、'swim'（游水）或者 'fly'（飛）
//   group.userData.flying                 ← 設做 true，雀仔就會一路拍翼飛

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ANIMALS_20 } from './animals20.js'; // 頭 20 隻嘅新設計
import { ANIMALS_30 } from './animals30.js'; // 其餘 30 隻嘅新設計
import { FUSE_MODELS } from './fusePets.js'; // Fuse Machine 寵物（Issue #4）
import { buildSkywhaleModel, buildSunlionModel, buildOctophantModel } from './enchantedModels.js'; // Biome 7 魔法動物
import { buildKitsuneModel, buildGemDragonModel, buildDreadscaleModel, buildArmadilloModel, buildCitadelSnailModel } from './kingdomPets.js';
const ENCHANTED_MODELS = {
  'Royal Skywhale': buildSkywhaleModel,
  'Celestial Sunlion': buildSunlionModel,
  'Enchanted Sunlion': buildSunlionModel, // 舊名
  'Octophant': buildOctophantModel,
  'Kitsune Of Runes': buildKitsuneModel,
  'Gem Dragon': buildGemDragonModel,
  'Dreadscale': buildDreadscaleModel,
  'Uncoiled Armadillo': buildArmadilloModel,
  'Citadel Snail': buildCitadelSnailModel,
};

// ---- 方塊工具 ----
const geometries = new Map();
const materials = new Map();

function material(color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  return materials.get(color);
}

// 圓角方塊（parent 入面，中心喺 x,y,z）
function box(parent, w, h, d, color, x = 0, y = 0, z = 0) {
  const key = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  if (!geometries.has(key)) geometries.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.18));
  const mesh = new THREE.Mesh(geometries.get(key), material(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// 一個轉軸（腳、翼、尾由呢度轉）
function pivot(parent, x, y, z) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  parent.add(p);
  return p;
}

// 一對眼：黑色方塊 + 白色反光（喺 head 嘅前面 z）
function eyes(head, dx, y, z, size = 0.1, color = 0x111111) {
  for (const x of [-dx, dx]) {
    box(head, size, size * 1.2, 0.04, color, x, y, z);
    box(head, size * 0.35, size * 0.35, 0.02, 0xffffff, x + size * 0.18, y + size * 0.25, z - 0.025);
  }
}

// 四方尖角（用 4 邊錐，似方塊）
function spike(parent, radius, length, color, x, y, z, rotX = 0, rotZ = 0) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 4), material(color));
  m.position.set(x, y, z);
  m.rotation.set(rotX, Math.PI / 4, rotZ);
  m.castShadow = true;
  parent.add(m);
  return m;
}

const BLACK = 0x1a1a1a;
const WHITE = 0xf7f7f2;

// ================= 四隻腳嘅動物 =================
// o.body {w,h,d,y,color}  o.head {w,h,d,y,z,color}  o.legs {w,h,x,zf,zb,color}
function quadruped(o) {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0); // 成個身（行路時上下彈）
  const legs = [];
  const L = o.legs;
  for (const [x, z, phase] of [[-L.x, L.zf, 0], [L.x, L.zf, Math.PI], [-L.x, L.zb, Math.PI], [L.x, L.zb, 0]]) {
    const hip = pivot(root, x, L.h, z);
    box(hip, L.w, L.h, L.w, L.color, 0, -L.h / 2, 0);
    if (L.foot) box(hip, L.w * 1.05, L.h * 0.18, L.w * 1.05, L.foot, 0, -L.h + L.h * 0.09, 0);
    legs.push({ hip, phase });
  }
  const B = o.body;
  const body = box(root, B.w, B.h, B.d, B.color, 0, B.y, 0);
  const H = o.head;
  const head = pivot(root, 0, H.y, H.z);
  box(head, H.w, H.h, H.d, H.color, 0, 0, 0);
  if (o.eyes !== false) eyes(head, H.w * 0.28, H.h * 0.15, -H.d / 2 - 0.01, Math.max(0.06, H.w * 0.13));
  let tail = null;
  if (o.tail) {
    const T = o.tail;
    tail = pivot(root, 0, T.y, B.d / 2);
    const t = box(tail, T.w, T.h, T.d, T.color, 0, 0, T.d / 2);
    tail.rotation.x = T.angle || 0;
    t.position.z = T.d / 2;
  }
  const parts = { g, root, head, body, tail, legs };
  if (o.extras) o.extras(parts);

  const swing = o.swing ?? 0.55;
  g.userData.animate = (t, moving) => {
    const speed = o.walkSpeed ?? 9;
    for (const l of legs) l.hip.rotation.x = Math.sin(t * speed + l.phase) * swing * moving;
    root.position.y = Math.abs(Math.sin(t * speed)) * 0.05 * moving;
    head.rotation.x = Math.sin(t * 2) * 0.05 + Math.sin(t * speed * 2) * 0.03 * moving; // 輕輕點頭
    head.rotation.y = Math.sin(t * 0.7) * 0.25 * (1 - moving); // 企定時四圍望
    if (tail) tail.rotation.y = Math.sin(t * 6) * 0.35;
    if (parts.animateExtra) parts.animateExtra(t, moving);
  };
  g.userData.height = Math.max(B.y + B.h / 2, H.y + H.h / 2) + (o.extraHeight || 0);
  return g;
}

function panda() {
  return quadruped({
    body: { w: 1.1, h: 0.9, d: 1.5, y: 1.05, color: WHITE },
    head: { w: 0.85, h: 0.75, d: 0.7, y: 1.45, z: -0.95, color: WHITE },
    legs: { w: 0.36, h: 0.65, x: 0.32, zf: -0.5, zb: 0.5, color: BLACK },
    tail: { w: 0.2, h: 0.2, d: 0.15, y: 1.15, color: WHITE },
    eyes: false,
    extras({ root, head }) {
      box(root, 1.14, 0.94, 0.45, BLACK, 0, 1.05, -0.4); // 膊頭黑帶
      for (const s of [-1, 1]) {
        box(head, 0.24, 0.24, 0.16, BLACK, s * 0.32, 0.42, 0); // 耳
        box(head, 0.22, 0.26, 0.04, BLACK, s * 0.2, 0.08, -0.36); // 黑眼圈
        box(head, 0.08, 0.08, 0.02, WHITE, s * 0.2, 0.12, -0.385); // 眼
      }
      box(head, 0.4, 0.28, 0.2, WHITE, 0, -0.18, -0.4); // 嘴
      box(head, 0.14, 0.09, 0.05, BLACK, 0, -0.08, -0.51); // 鼻
    },
  });
}

function elephant(forest) {
  const skin = forest ? 0x6f6b66 : 0x9a958f;
  const g = quadruped({
    body: { w: 1.8, h: 1.6, d: 2.4, y: 2.1, color: skin },
    head: { w: 1.1, h: 1.1, d: 0.9, y: 2.55, z: -1.5, color: skin },
    legs: { w: 0.55, h: 1.35, x: 0.55, zf: -0.75, zb: 0.75, color: skin, foot: 0xd7ccc8 },
    tail: { w: 0.1, h: 0.6, d: 0.1, y: 2.3, color: skin, angle: 0.3 },
    walkSpeed: 6,
    swing: 0.4,
    extras(p) {
      const earW = forest ? 0.75 : 1.25;
      const ears = [-1, 1].map((s) => {
        const ear = pivot(p.head, s * 0.55, 0.05, 0.1);
        box(ear, 0.1, earW, earW * 0.85, skin, s * 0.05, -earW * 0.1, earW * 0.4);
        box(ear, 0.04, earW * 0.75, earW * 0.6, 0xc9a9a6, s * -0.04, -earW * 0.1, earW * 0.4); // 耳仔入面粉紅
        return { ear, s };
      });
      // 象鼻：三節，會擺
      let parent = p.head;
      const trunk = [];
      for (let i = 0; i < 3; i++) {
        const seg = pivot(parent, 0, i === 0 ? -0.25 : -0.45, i === 0 ? -0.5 : 0);
        box(seg, 0.3 - i * 0.04, 0.5, 0.3 - i * 0.04, skin, 0, -0.22, 0);
        trunk.push(seg);
        parent = seg;
      }
      for (const s of [-1, 1]) {
        const tusk = box(p.head, 0.12, 0.12, forest ? 0.75 : 0.65, 0xfff8e1, s * 0.3, -0.4, -0.65);
        tusk.rotation.x = forest ? 0.6 : 0.25;
      }
      p.animateExtra = (t) => {
        trunk.forEach((seg, i) => (seg.rotation.x = Math.sin(t * 1.5 + i) * 0.15 + (i ? 0.15 : 0)));
        ears.forEach(({ ear, s }) => (ear.rotation.y = s * (0.15 + Math.sin(t * 2) * 0.15)));
      };
    },
  });
  if (forest) g.scale.setScalar(0.8);
  return g;
}

function rhino({ skin = 0x7a736b, horns = 2, size = 1, hairy = false } = {}) {
  const g = quadruped({
    body: { w: 1.3, h: 1.1, d: 2.0, y: 1.3, color: skin },
    head: { w: 0.7, h: 0.65, d: 1.0, y: 1.2, z: -1.4, color: skin },
    legs: { w: 0.4, h: 0.8, x: 0.4, zf: -0.6, zb: 0.6, color: skin },
    tail: { w: 0.08, h: 0.4, d: 0.08, y: 1.5, color: skin, angle: 0.3 },
    walkSpeed: 7,
    extras({ root, head }) {
      spike(head, 0.18, 0.7, 0xb8a98f, 0, 0.6, -0.4, -0.25);
      if (horns === 2) spike(head, 0.13, 0.35, 0xb8a98f, 0, 0.45, -0.05, -0.15);
      for (const s of [-1, 1]) box(head, 0.12, 0.25, 0.08, skin, s * 0.28, 0.42, 0.4); // 耳
      box(root, 1.34, 0.12, 0.12, 0x5d5750, 0, 1.3, -0.4); // 皮摺
      box(root, 1.34, 0.12, 0.12, 0x5d5750, 0, 1.3, 0.5);
      if (hairy) for (let i = 0; i < 10; i++) box(root, 0.08, 0.15, 0.08, 0x4e342e, (Math.random() - 0.5) * 1.2, 1.86, (Math.random() - 0.5) * 1.8);
    },
  });
  g.scale.setScalar(size);
  return g;
}

function polarBear() {
  const fur = 0xf3efe2;
  return quadruped({
    body: { w: 1.2, h: 1.1, d: 2.0, y: 1.25, color: fur },
    head: { w: 0.7, h: 0.65, d: 0.75, y: 1.45, z: -1.3, color: fur },
    legs: { w: 0.42, h: 0.75, x: 0.36, zf: -0.6, zb: 0.6, color: fur },
    tail: { w: 0.2, h: 0.2, d: 0.15, y: 1.4, color: fur },
    extras({ head }) {
      box(head, 0.42, 0.35, 0.35, fur, 0, -0.12, -0.45); // 嘴
      box(head, 0.16, 0.1, 0.06, BLACK, 0, -0.02, -0.63);
      for (const s of [-1, 1]) box(head, 0.18, 0.18, 0.12, fur, s * 0.28, 0.36, 0.05);
    },
  });
}

function arcticFox() {
  const fur = 0xfafafa;
  return quadruped({
    body: { w: 0.45, h: 0.42, d: 0.9, y: 0.62, color: fur },
    head: { w: 0.45, h: 0.4, d: 0.4, y: 0.9, z: -0.6, color: fur },
    legs: { w: 0.13, h: 0.42, x: 0.14, zf: -0.3, zb: 0.3, color: fur, foot: 0xd7ccc8 },
    tail: { w: 0.3, h: 0.3, d: 0.75, y: 0.72, color: fur, angle: -0.4 },
    walkSpeed: 12,
    extras({ head }) {
      box(head, 0.2, 0.18, 0.25, fur, 0, -0.08, -0.3);
      box(head, 0.07, 0.06, 0.04, BLACK, 0, -0.02, -0.43);
      for (const s of [-1, 1]) spike(head, 0.1, 0.22, fur, s * 0.14, 0.3, 0);
    },
  });
}

function caribou() {
  const fur = 0x8b6b4a;
  const antler = 0xd7c8a8;
  return quadruped({
    body: { w: 0.8, h: 0.8, d: 1.6, y: 1.55, color: fur },
    head: { w: 0.4, h: 0.4, d: 0.75, y: 2.15, z: -1.05, color: fur },
    legs: { w: 0.18, h: 1.15, x: 0.25, zf: -0.6, zb: 0.6, color: 0x5d4632, foot: 0x3e2b1a },
    tail: { w: 0.2, h: 0.2, d: 0.15, y: 1.7, color: 0xf5f5f5 },
    walkSpeed: 7,
    extraHeight: 0.9,
    extras({ root, head }) {
      const neck = box(root, 0.42, 0.7, 0.4, 0xe8e0d0, 0, 1.85, -0.8);
      neck.rotation.x = -0.5;
      box(head, 0.12, 0.08, 0.04, BLACK, 0, -0.05, -0.39);
      for (const s of [-1, 1]) {
        const a = box(head, 0.07, 0.7, 0.07, antler, s * 0.18, 0.5, 0.1);
        a.rotation.z = s * -0.4;
        const b = box(head, 0.06, 0.35, 0.06, antler, s * 0.38, 0.7, -0.05);
        b.rotation.x = 0.6;
        const c = box(head, 0.06, 0.45, 0.06, antler, s * 0.42, 0.85, 0.25);
        c.rotation.z = s * -0.2;
      }
    },
  });
}

function amurLeopard() {
  const fur = 0xe0a85a;
  return quadruped({
    body: { w: 0.6, h: 0.6, d: 1.5, y: 0.95, color: fur },
    head: { w: 0.55, h: 0.5, d: 0.5, y: 1.2, z: -0.95, color: fur },
    legs: { w: 0.18, h: 0.65, x: 0.2, zf: -0.5, zb: 0.5, color: fur },
    tail: { w: 0.12, h: 0.12, d: 1.1, y: 1.05, color: fur, angle: -0.3 },
    walkSpeed: 10,
    extras({ root, head }) {
      box(head, 0.3, 0.2, 0.15, 0xfff3e0, 0, -0.12, -0.27);
      box(head, 0.1, 0.07, 0.04, 0x4e342e, 0, -0.04, -0.33);
      for (const s of [-1, 1]) box(head, 0.14, 0.14, 0.08, fur, s * 0.2, 0.3, 0.05);
      // 方格斑點
      for (let i = 0; i < 26; i++) {
        const side = i % 3 === 0 ? 0 : i % 3 === 1 ? -1 : 1;
        const z = -0.6 + ((i * 7) % 13) * 0.1;
        if (side === 0) box(root, 0.1, 0.03, 0.1, 0x2b1d14, ((i * 5) % 5 - 2) * 0.1, 1.26, z);
        else box(root, 0.03, 0.1, 0.1, 0x2b1d14, side * 0.31, 0.8 + ((i * 3) % 4) * 0.1, z);
      }
    },
  });
}

function saola() {
  const fur = 0x6b4a2e;
  return quadruped({
    body: { w: 0.65, h: 0.7, d: 1.3, y: 1.25, color: fur },
    head: { w: 0.4, h: 0.45, d: 0.6, y: 1.65, z: -0.85, color: fur },
    legs: { w: 0.14, h: 0.9, x: 0.22, zf: -0.48, zb: 0.48, color: 0x3e2b1a },
    tail: { w: 0.1, h: 0.3, d: 0.1, y: 1.4, color: fur, angle: 0.3 },
    walkSpeed: 8,
    extraHeight: 0.6,
    extras({ head }) {
      for (const s of [-1, 1]) {
        box(head, 0.05, 0.1, 0.3, 0xffffff, s * 0.12, -0.1, -0.2); // 面上白紋
        const horn = box(head, 0.06, 0.06, 0.9, 0x2b2b2b, s * 0.1, 0.35, 0.35);
        horn.rotation.x = -0.6;
      }
    },
  });
}

function pangolin() {
  const scale = 0x9c7a52;
  const edge = 0xc8a777;
  const g = quadruped({
    body: { w: 0.55, h: 0.45, d: 1.1, y: 0.5, color: scale },
    head: { w: 0.28, h: 0.25, d: 0.45, y: 0.45, z: -0.7, color: 0xd9b48f },
    legs: { w: 0.12, h: 0.3, x: 0.2, zf: -0.35, zb: 0.35, color: 0xd9b48f },
    tail: { w: 0.35, h: 0.25, d: 0.9, y: 0.45, color: scale, angle: 0.25 },
    walkSpeed: 8,
    extras({ root, tail }) {
      for (let i = 0; i < 5; i++) { // 一排排鱗片
        box(root, 0.62 - Math.abs(i - 2) * 0.04, 0.12, 0.22, edge, 0, 0.78, -0.45 + i * 0.22);
      }
      for (let i = 0; i < 3; i++) box(tail, 0.36 - i * 0.06, 0.1, 0.2, edge, 0, 0.16, 0.15 + i * 0.25);
    },
  });
  return g;
}

// ================= 猿 =================
function ape({ fur, face, size = 1, silverBack = false, cheeks = false, beard = false }) {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.25, 0.75, 0.15);
    box(hip, 0.3, 0.75, 0.3, fur, 0, -0.37, 0);
    return hip;
  });
  const torso = box(root, 0.9, 1.0, 0.6, fur, 0, 1.35, 0);
  torso.rotation.x = 0.25;
  if (silverBack) box(root, 0.8, 0.5, 0.1, 0xb0b0b0, 0, 1.45, 0.32).rotation.x = 0.25;
  const head = pivot(root, 0, 2.0, -0.3);
  box(head, 0.55, 0.55, 0.5, fur, 0, 0, 0);
  box(head, 0.4, 0.35, 0.06, face, 0, -0.05, -0.26);
  eyes(head, 0.1, 0.05, -0.3, 0.07);
  if (cheeks) for (const s of [-1, 1]) box(head, 0.18, 0.4, 0.08, face, s * 0.36, -0.05, -0.2);
  if (beard) box(head, 0.3, 0.25, 0.1, fur, 0, -0.35, -0.22);
  const arms = [-1, 1].map((s) => {
    const shoulder = pivot(root, s * 0.6, 1.75, -0.15);
    box(shoulder, 0.26, 1.4, 0.26, fur, 0, -0.65, 0);
    box(shoulder, 0.28, 0.2, 0.3, face, 0, -1.35, 0); // 手
    shoulder.rotation.x = -0.2;
    return shoulder;
  });
  g.scale.setScalar(size);
  g.userData.animate = (t, moving) => {
    legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 7 + i * Math.PI) * 0.5 * moving));
    arms.forEach((a, i) => (a.rotation.x = -0.2 + Math.sin(t * 7 + i * Math.PI + Math.PI) * 0.5 * moving));
    head.rotation.y = Math.sin(t * 0.8) * 0.3 * (1 - moving);
    root.position.y = Math.abs(Math.sin(t * 7)) * 0.05 * moving;
    torso.scale.y = 1 + Math.sin(t * 2) * 0.02; // 呼吸
  };
  g.userData.height = 2.3 * size;
  return g;
}

// ================= 雀 =================
function bird({ body: b, belly = b, head: h = b, wing = b, beak = 0x333333, size = 1, tail = 0.6, crest = null, eyeRing = null, beakLong = false, flightless = false }) {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.12, 0.42, 0);
    box(hip, 0.06, 0.4, 0.06, 0x616161, 0, -0.2, 0);
    box(hip, 0.14, 0.04, 0.18, 0x616161, 0, -0.4, -0.04);
    return hip;
  });
  box(root, 0.5, 0.6, 0.55, b, 0, 0.75, 0.05);
  box(root, 0.36, 0.4, 0.1, belly, 0, 0.7, -0.24);
  const head = pivot(root, 0, 1.2, -0.08);
  box(head, 0.42, 0.4, 0.4, h, 0, 0, 0);
  box(head, 0.14, beakLong ? 0.12 : 0.16, beakLong ? 0.25 : 0.16, beak, 0, -0.04, -0.27); // 上嘴
  box(head, 0.1, 0.07, 0.1, beak, 0, -0.14, -0.22); // 下嘴
  eyes(head, 0.12, 0.06, -0.205, 0.07);
  if (eyeRing) for (const s of [-1, 1]) box(head, 0.12, 0.12, 0.02, eyeRing, s * 0.12, 0.06, -0.2);
  if (crest) for (let i = 0; i < 3; i++) box(head, 0.06, 0.25, 0.06, crest, (i - 1) * 0.1, 0.25, 0.12).rotation.x = 0.5;
  const wings = [-1, 1].map((s) => {
    const shoulder = pivot(root, s * 0.27, 1.0, 0.05);
    box(shoulder, 0.07, 0.55, 0.45, wing, s * 0.03, -0.25, 0);
    return { shoulder, s };
  });
  if (tail > 0) {
    const t = box(root, 0.18, 0.06, tail, wing, 0, 0.5, 0.3 + tail / 2);
    t.rotation.x = 0.6;
  }
  g.scale.setScalar(size);
  g.userData.move = flightless ? 'walk' : 'fly';
  g.userData.animate = (t, moving) => {
    if (g.userData.flying) {
      // 飛緊：一路拍翼、對腳收埋、身向前傾
      legs.forEach((l) => (l.rotation.x = 0.9));
      root.rotation.x = 0.35;
      root.position.y = 0;
      wings.forEach(({ shoulder, s }) => (shoulder.rotation.z = s * (0.3 + Math.sin(t * 14) * 0.9)));
      head.rotation.set(-0.3, 0, 0);
      return;
    }
    legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 12 + i * Math.PI) * 0.6 * moving));
    root.position.y = Math.abs(Math.sin(t * 12)) * 0.06 * moving;
    // 拍翼：每隔一陣拍幾下
    const flap = Math.max(0, Math.sin(t * 1.3)) > 0.85 ? Math.sin(t * 25) * 0.9 : 0.05;
    wings.forEach(({ shoulder, s }) => (shoulder.rotation.z = s * Math.abs(flap)));
    head.rotation.y = Math.sin(t * 1.7) * 0.4 * (1 - moving);
    head.rotation.z = Math.sin(t * 0.9) * 0.15;
  };
  g.userData.height = 1.45 * size;
  return g;
}

function penguin() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  box(root, 0.7, 1.05, 0.6, 0x1c1f26, 0, 0.75, 0);
  box(root, 0.5, 0.85, 0.08, WHITE, 0, 0.7, -0.3);
  const head = pivot(root, 0, 1.5, 0);
  box(head, 0.52, 0.48, 0.5, 0x1c1f26, 0, 0, 0);
  for (const s of [-1, 1]) box(head, 0.06, 0.25, 0.2, 0xffb300, s * 0.26, -0.05, -0.05);
  box(head, 0.12, 0.1, 0.25, 0xff8f00, 0, -0.08, -0.32);
  eyes(head, 0.13, 0.06, -0.255, 0.07, 0x111111);
  const flippers = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.37, 1.15, 0);
    box(p, 0.07, 0.65, 0.25, 0x1c1f26, 0, -0.3, 0);
    return { p, s };
  });
  const feet = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.16, 0.2, 0);
    box(p, 0.18, 0.06, 0.28, 0xff8f00, 0, -0.17, -0.08);
    return p;
  });
  g.scale.setScalar(1.1);
  g.userData.animate = (t, moving) => {
    root.rotation.z = Math.sin(t * 8) * 0.15 * moving; // 搖搖擺擺咁行
    feet.forEach((f, i) => (f.position.y = 0.2 + Math.max(0, Math.sin(t * 8 + i * Math.PI)) * 0.1 * moving));
    flippers.forEach(({ p, s }) => (p.rotation.z = s * (0.2 + Math.sin(t * 3) * 0.15)));
    head.rotation.y = Math.sin(t * 1.1) * 0.3;
  };
  g.userData.height = 1.95;
  return g;
}

function snowyOwl() {
  const g = bird({ body: WHITE, head: WHITE, wing: 0xeeeeee, beak: 0x333333, size: 1.15, tail: 0.25 });
  // 黑色斑點 + 大黃眼
  const root = g.children[0];
  for (let i = 0; i < 16; i++) box(root, 0.06, 0.06, 0.02, 0x333333, ((i * 7) % 5 - 2) * 0.09, 0.55 + ((i * 3) % 5) * 0.09, 0.33);
  const head = root.children.find((c) => c.isGroup && c.position.y > 1.1);
  for (const s of [-1, 1]) box(head, 0.13, 0.13, 0.02, 0xffd600, s * 0.12, 0.06, -0.205);
  for (const s of [-1, 1]) box(head, 0.07, 0.07, 0.02, BLACK, s * 0.12, 0.06, -0.215);
  return g;
}

// ================= 游水嘅動物 =================
// 身分前後兩節，尾巴會擺；whale = 上下擺（鯨、海豚），否則左右擺（魚、鯊）
function swimmer({ skin, belly, length, width, height, whale = true, dorsal = false, extras }) {
  const g = new THREE.Group();
  const swimY = height / 2 + 0.35;
  const root = pivot(g, 0, swimY, 0);
  const frontLen = length * 0.6;
  box(root, width, height, frontLen, skin, 0, 0, -length * 0.1);
  box(root, width * 0.85, height * 0.35, frontLen * 0.9, belly, 0, -height * 0.4, -length * 0.1);
  eyes(root, width * 0.42, 0, -length * 0.35, Math.max(0.06, width * 0.08));
  const rear = pivot(root, 0, 0, length * 0.2);
  box(rear, width * 0.7, height * 0.75, length * 0.35, skin, 0, 0, length * 0.15);
  const fluke = pivot(rear, 0, 0, length * 0.33);
  if (whale) box(fluke, width * 1.4, 0.08, length * 0.14, skin, 0, 0, length * 0.05);
  else box(fluke, 0.08, height * 1.2, length * 0.14, skin, 0, height * 0.15, length * 0.05);
  const fins = [-1, 1].map((s) => {
    const p = pivot(root, s * width / 2, -height * 0.25, -length * 0.15);
    box(p, width * 0.5, 0.06, length * 0.12, skin, s * width * 0.25, 0, 0);
    return { p, s };
  });
  if (dorsal) {
    const d = box(root, 0.08, height * 0.5, length * 0.1, skin, 0, height * 0.6, length * 0.05);
    d.rotation.x = 0.4;
  }
  const parts = { root, rear, fluke };
  if (extras) extras(parts);
  g.userData.animate = (t, moving) => {
    const sp = 2.5 + moving * 2;
    if (whale) {
      rear.rotation.x = Math.sin(t * sp) * 0.15;
      fluke.rotation.x = Math.sin(t * sp - 0.8) * 0.35;
    } else {
      rear.rotation.y = Math.sin(t * sp * 1.5) * 0.25;
      fluke.rotation.y = Math.sin(t * sp * 1.5 - 0.8) * 0.4;
    }
    fins.forEach(({ p, s }) => (p.rotation.z = s * Math.sin(t * 2) * 0.25));
    root.position.y = swimY + Math.sin(t * 1.5) * 0.12; // 浮上浮落
  };
  g.userData.height = swimY + height;
  g.userData.move = 'swim';
  return g;
}

function hammerhead() {
  return swimmer({
    skin: 0x7a8691, belly: 0xe8e8e8, length: 2.6, width: 0.55, height: 0.55, whale: false,
    extras({ root }) {
      box(root, 1.3, 0.18, 0.35, 0x7a8691, 0, 0.05, -1.1); // 錘頭
      for (const s of [-1, 1]) box(root, 0.06, 0.1, 0.1, BLACK, s * 0.66, 0.05, -1.1);
      const fin = box(root, 0.08, 0.7, 0.35, 0x7a8691, 0, 0.55, -0.1);
      fin.rotation.x = 0.4;
    },
  });
}

function manta() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0.9, 0);
  box(root, 0.9, 0.25, 1.1, 0x1f2328, 0, 0, 0);
  box(root, 0.8, 0.06, 1.0, WHITE, 0, -0.14, 0);
  const wings = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.45, 0, 0);
    box(p, 1.2, 0.12, 0.8, 0x1f2328, s * 0.6, 0, 0.05);
    box(p, 0.6, 0.1, 0.4, 0x1f2328, s * 1.3, 0, 0.2);
    return { p, s };
  });
  for (const s of [-1, 1]) {
    box(root, 0.12, 0.1, 0.4, 0x1f2328, s * 0.32, 0, -0.7); // 頭鰭
    box(root, 0.07, 0.07, 0.02, 0xffffff, s * 0.38, 0.06, -0.5);
  }
  box(root, 0.05, 0.05, 1.3, 0x1f2328, 0, 0, 1.2);
  g.userData.animate = (t) => {
    wings.forEach(({ p, s }) => (p.rotation.z = s * Math.sin(t * 2.5) * 0.4));
    root.position.y = 0.9 + Math.sin(t * 2.5 - 1) * 0.12;
  };
  g.userData.height = 1.2;
  g.userData.move = 'swim';
  return g;
}

function seaTurtle() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0.55, 0);
  box(root, 1.2, 0.45, 1.4, 0x5d7b3a, 0, 0.1, 0);
  for (let i = 0; i < 6; i++) box(root, 0.3, 0.05, 0.35, 0x8d9b52, ((i % 2) - 0.5) * 0.4, 0.34, -0.4 + Math.floor(i / 2) * 0.4); // 殼花紋
  box(root, 1.0, 0.12, 1.2, 0xe6d9a6, 0, -0.15, 0);
  const head = pivot(root, 0, 0.05, -0.75);
  box(head, 0.4, 0.32, 0.45, 0x8a9a5a, 0, 0, -0.15);
  eyes(head, 0.14, 0.05, -0.38, 0.07);
  const flippers = [[-1, -0.35, 0.9], [1, -0.35, 0.9], [-1, 0.5, 0.4], [1, 0.5, 0.4]].map(([s, z, len], i) => {
    const p = pivot(root, s * 0.55, -0.05, z);
    box(p, len, 0.07, 0.3, 0x8a9a5a, s * len / 2, 0, 0);
    return { p, s, i };
  });
  g.userData.animate = (t, moving) => {
    flippers.forEach(({ p, s, i }) => (p.rotation.y = s * Math.sin(t * 2.5 + (i < 2 ? 0 : 1)) * (0.25 + moving * 0.2)));
    head.rotation.y = Math.sin(t * 0.8) * 0.3;
    root.position.y = 0.55 + Math.sin(t * 1.5) * 0.08;
  };
  g.userData.height = 1.0;
  g.userData.move = 'swim';
  return g;
}

function ringedSeal() {
  return seal({ skin: 0x6e7378, rings: true });
}

function seal({ skin, rings = false, size = 1, tusks = false }) {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  box(root, 0.7, 0.55, 0.8, skin, 0, 0.32, -0.3);
  const back = pivot(root, 0, 0.3, 0.1);
  box(back, 0.6, 0.45, 0.7, skin, 0, -0.02, 0.3);
  const tail = pivot(back, 0, -0.05, 0.65);
  for (const s of [-1, 1]) box(tail, 0.18, 0.06, 0.35, skin, s * 0.12, -0.1, 0.15);
  if (rings) for (let i = 0; i < 8; i++) box(root, 0.1, 0.02, 0.1, 0xb8bcc0, ((i * 3) % 5 - 2) * 0.12, 0.6, -0.6 + (i % 4) * 0.18);
  const head = pivot(root, 0, 0.55, -0.75);
  box(head, 0.45, 0.42, 0.45, skin, 0, 0, 0);
  box(head, 0.25, 0.18, 0.15, 0x8a8f94, 0, -0.08, -0.25);
  box(head, 0.08, 0.06, 0.03, BLACK, 0, -0.03, -0.33);
  eyes(head, 0.12, 0.07, -0.23, 0.09);
  if (tusks) for (const s of [-1, 1]) box(head, 0.06, 0.45, 0.06, 0xfff8e1, s * 0.08, -0.35, -0.28);
  const flippers = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.36, 0.12, -0.35);
    box(p, 0.3, 0.06, 0.18, skin, s * 0.15, 0, 0);
    return { p, s };
  });
  g.userData.animate = (t, moving) => {
    const sp = 3 + moving * 5;
    back.rotation.x = Math.sin(t * sp) * 0.15;
    tail.rotation.x = Math.sin(t * sp - 1) * 0.3;
    head.rotation.x = Math.sin(t * sp + 1) * 0.1;
    flippers.forEach(({ p, s }) => (p.rotation.y = s * Math.sin(t * sp) * 0.4 * moving));
  };
  g.scale.setScalar(size);
  g.userData.height = 0.9;
  return g;
}

// ================= 小朋友加嘅新動物 =================

function redPanda() {
  const fur = 0xb5491b;
  return quadruped({
    body: { w: 0.5, h: 0.45, d: 0.9, y: 0.62, color: fur },
    head: { w: 0.5, h: 0.42, d: 0.42, y: 0.88, z: -0.6, color: 0xc0562a },
    legs: { w: 0.15, h: 0.42, x: 0.16, zf: -0.3, zb: 0.3, color: BLACK },
    tail: { w: 0.26, h: 0.26, d: 0.9, y: 0.72, color: fur, angle: -0.2 },
    walkSpeed: 10,
    extras({ head, tail }) {
      for (const s of [-1, 1]) {
        box(head, 0.14, 0.12, 0.04, WHITE, s * 0.14, 0.12, -0.22); // 白眉
        box(head, 0.16, 0.16, 0.1, WHITE, s * 0.2, 0.26, 0); // 白耳
      }
      box(head, 0.24, 0.16, 0.12, WHITE, 0, -0.1, -0.24);
      box(head, 0.08, 0.06, 0.04, BLACK, 0, -0.06, -0.31);
      for (let i = 0; i < 3; i++) box(tail, 0.28, 0.28, 0.1, 0xe8b07a, 0, 0, 0.2 + i * 0.25); // 尾巴間條
    },
  });
}

function okapi() {
  const fur = 0x4e2a1e;
  return quadruped({
    body: { w: 0.7, h: 0.8, d: 1.4, y: 1.5, color: fur },
    head: { w: 0.38, h: 0.42, d: 0.6, y: 2.2, z: -1.0, color: 0xc8a77e },
    legs: { w: 0.17, h: 1.1, x: 0.22, zf: -0.5, zb: 0.5, color: 0xf5f5f5 },
    tail: { w: 0.08, h: 0.4, d: 0.08, y: 1.6, color: fur, angle: 0.3 },
    walkSpeed: 7,
    extras({ root, head }) {
      const neck = box(root, 0.3, 0.8, 0.3, fur, 0, 1.95, -0.8);
      neck.rotation.x = -0.35;
      for (const s of [-1, 1]) {
        for (let i = 0; i < 4; i++) box(root, 0.05, 0.08, 0.5, i % 2 ? WHITE : BLACK, s * 0.36, 1.3 - i * 0.12, 0.45); // 屁股斑馬紋
        box(head, 0.06, 0.26, 0.22, fur, s * 0.24, 0.25, 0.1); // 大耳
      }
      box(head, 0.4, 0.18, 0.3, fur, 0, 0.12, 0.05);
    },
  });
}

function sumatranTiger() {
  const fur = 0xe07b28;
  return quadruped({
    body: { w: 0.7, h: 0.65, d: 1.6, y: 1.0, color: fur },
    head: { w: 0.6, h: 0.55, d: 0.55, y: 1.25, z: -1.0, color: fur },
    legs: { w: 0.2, h: 0.7, x: 0.22, zf: -0.55, zb: 0.55, color: fur },
    tail: { w: 0.12, h: 0.12, d: 1.0, y: 1.1, color: fur, angle: -0.3 },
    walkSpeed: 9,
    extras({ root, head }) {
      box(root, 0.6, 0.15, 1.4, WHITE, 0, 0.68, 0); // 白肚
      box(head, 0.34, 0.2, 0.15, WHITE, 0, -0.14, -0.28);
      box(head, 0.1, 0.07, 0.04, 0x4e342e, 0, -0.05, -0.36);
      for (const s of [-1, 1]) {
        box(head, 0.15, 0.15, 0.08, fur, s * 0.22, 0.32, 0.05);
        for (let i = 0; i < 6; i++) box(root, 0.03, 0.45, 0.07, BLACK, s * 0.36, 1.05, -0.6 + i * 0.24); // 黑間
      }
      for (let i = 0; i < 4; i++) box(root, 0.5, 0.03, 0.07, BLACK, 0, 1.33, -0.5 + i * 0.3);
    },
  });
}

function slowLoris() {
  const fur = 0x9e8a78;
  const g = quadruped({
    body: { w: 0.35, h: 0.3, d: 0.55, y: 0.4, color: fur },
    head: { w: 0.36, h: 0.34, d: 0.32, y: 0.58, z: -0.38, color: fur },
    legs: { w: 0.1, h: 0.3, x: 0.12, zf: -0.18, zb: 0.18, color: 0x7a6656 },
    eyes: false,
    walkSpeed: 3, // 好慢好慢
    swing: 0.3,
    extras({ head }) {
      for (const s of [-1, 1]) {
        box(head, 0.14, 0.16, 0.03, 0x4e342e, s * 0.09, 0.03, -0.165); // 黑眼圈
        box(head, 0.1, 0.1, 0.02, 0xffb300, s * 0.09, 0.03, -0.18); // 大大對眼
        box(head, 0.05, 0.05, 0.02, BLACK, s * 0.09, 0.03, -0.19);
      }
      box(head, 0.04, 0.2, 0.02, WHITE, 0, 0.08, -0.17);
    },
  });
  return g;
}

// ================= Biome 6：採礦山 =================

function snowLeopard() {
  const fur = 0xdcd8cc;
  return quadruped({
    body: { w: 0.6, h: 0.55, d: 1.4, y: 0.9, color: fur },
    head: { w: 0.5, h: 0.45, d: 0.45, y: 1.12, z: -0.9, color: fur },
    legs: { w: 0.2, h: 0.62, x: 0.2, zf: -0.5, zb: 0.5, color: fur },
    tail: { w: 0.22, h: 0.22, d: 1.4, y: 1.0, color: fur, angle: -0.1 },
    walkSpeed: 9,
    extras({ root, head, tail }) {
      box(head, 0.28, 0.16, 0.12, WHITE, 0, -0.12, -0.24);
      box(head, 0.09, 0.06, 0.04, 0x8d6e63, 0, -0.05, -0.31);
      for (const s of [-1, 1]) box(head, 0.12, 0.1, 0.06, fur, s * 0.18, 0.26, 0.05);
      for (let i = 0; i < 18; i++) {
        const side = i % 2 ? 1 : -1;
        box(root, 0.03, 0.1, 0.1, 0x4e4a46, side * 0.31, 0.8 + ((i * 3) % 4) * 0.08, -0.55 + (i % 9) * 0.13);
      }
      for (let i = 0; i < 4; i++) box(tail, 0.24, 0.24, 0.08, 0x4e4a46, 0, 0, 0.25 + i * 0.3);
    },
  });
}

function andeanBear() {
  const fur = 0x2b2622;
  return quadruped({
    body: { w: 0.9, h: 0.85, d: 1.5, y: 1.0, color: fur },
    head: { w: 0.6, h: 0.55, d: 0.6, y: 1.25, z: -1.0, color: fur },
    legs: { w: 0.3, h: 0.6, x: 0.28, zf: -0.48, zb: 0.48, color: fur },
    tail: { w: 0.15, h: 0.15, d: 0.1, y: 1.1, color: fur },
    eyes: false,
    extras({ head }) {
      for (const s of [-1, 1]) {
        box(head, 0.2, 0.2, 0.03, 0xf3e2b8, s * 0.15, 0.06, -0.31); // 「眼鏡」
        box(head, 0.08, 0.1, 0.03, BLACK, s * 0.15, 0.06, -0.33);
        box(head, 0.14, 0.14, 0.1, fur, s * 0.22, 0.32, 0.05);
      }
      box(head, 0.3, 0.22, 0.2, 0xd8c49a, 0, -0.14, -0.34);
      box(head, 0.1, 0.06, 0.04, BLACK, 0, -0.08, -0.45);
    },
  });
}

function ethiopianWolf() {
  const fur = 0xc8642a;
  return quadruped({
    body: { w: 0.42, h: 0.42, d: 1.0, y: 0.85, color: fur },
    head: { w: 0.36, h: 0.34, d: 0.36, y: 1.1, z: -0.65, color: fur },
    legs: { w: 0.12, h: 0.65, x: 0.14, zf: -0.36, zb: 0.36, color: fur, foot: WHITE },
    tail: { w: 0.16, h: 0.16, d: 0.6, y: 0.9, color: fur, angle: 0.4 },
    walkSpeed: 11,
    extras({ root, head, tail }) {
      box(root, 0.3, 0.3, 0.15, WHITE, 0, 0.85, -0.5); // 白頸
      box(head, 0.16, 0.14, 0.3, fur, 0, -0.06, -0.28);
      box(head, 0.07, 0.05, 0.04, BLACK, 0, -0.03, -0.44);
      for (const s of [-1, 1]) spike(head, 0.08, 0.24, fur, s * 0.12, 0.27, 0);
      box(tail, 0.17, 0.17, 0.15, BLACK, 0, 0, 0.6);
    },
  });
}

function pygmyPossum() {
  const fur = 0x8d8178;
  return quadruped({
    body: { w: 0.28, h: 0.24, d: 0.4, y: 0.24, color: fur },
    head: { w: 0.26, h: 0.24, d: 0.24, y: 0.3, z: -0.28, color: fur },
    legs: { w: 0.07, h: 0.13, x: 0.1, zf: -0.12, zb: 0.12, color: 0xd7ccc8 },
    tail: { w: 0.05, h: 0.05, d: 0.45, y: 0.22, color: 0xbcaaa4, angle: -0.3 },
    walkSpeed: 14,
    extras({ head }) {
      for (const s of [-1, 1]) box(head, 0.1, 0.1, 0.04, fur, s * 0.12, 0.14, 0.02);
      box(head, 0.04, 0.03, 0.02, 0xf48fb1, 0, -0.04, -0.13);
    },
  });
}

function takin() {
  const fur = 0xc9a24a;
  return quadruped({
    body: { w: 1.0, h: 0.95, d: 1.6, y: 1.2, color: fur },
    head: { w: 0.55, h: 0.55, d: 0.75, y: 1.25, z: -1.05, color: 0x6d4c41 },
    legs: { w: 0.26, h: 0.75, x: 0.32, zf: -0.55, zb: 0.55, color: 0x5d4037 },
    tail: { w: 0.12, h: 0.12, d: 0.1, y: 1.4, color: fur },
    walkSpeed: 6,
    extras({ head }) {
      for (const s of [-1, 1]) {
        const h1 = box(head, 0.4, 0.1, 0.1, 0x3e2723, s * 0.38, 0.3, 0); // 彎角
        h1.rotation.z = s * -0.3;
        box(head, 0.1, 0.25, 0.1, 0x3e2723, s * 0.55, 0.45, 0.05);
      }
      box(head, 0.5, 0.2, 0.4, 0x4e342e, 0, -0.12, -0.25); // 大鼻
    },
  });
}

function desman() {
  const fur = 0x6d5a4b;
  return quadruped({
    body: { w: 0.24, h: 0.2, d: 0.42, y: 0.2, color: fur },
    head: { w: 0.18, h: 0.16, d: 0.18, y: 0.22, z: -0.28, color: fur },
    legs: { w: 0.07, h: 0.1, x: 0.09, zf: -0.12, zb: 0.12, color: 0x3e2b1a },
    tail: { w: 0.05, h: 0.05, d: 0.35, y: 0.18, color: 0x3e2b1a },
    walkSpeed: 14,
    extras({ head }) {
      const nose = pivot(head, 0, -0.02, -0.09);
      box(nose, 0.05, 0.05, 0.2, 0x4e342e, 0, 0, -0.1); // 長長嘅鼻
      box(nose, 0.06, 0.05, 0.04, 0xf48fb1, 0, 0, -0.21);
      head.userData.nose = nose;
    },
  });
}

function muskDeer() {
  const fur = 0x7b5a3c;
  return quadruped({
    body: { w: 0.4, h: 0.45, d: 0.85, y: 0.75, color: fur },
    head: { w: 0.3, h: 0.32, d: 0.4, y: 1.02, z: -0.58, color: fur },
    legs: { w: 0.1, h: 0.58, x: 0.14, zf: -0.3, zb: 0.3, color: 0x4e342e },
    tail: { w: 0.08, h: 0.08, d: 0.06, y: 0.85, color: fur },
    walkSpeed: 10,
    extras({ head }) {
      for (const s of [-1, 1]) {
        box(head, 0.06, 0.24, 0.16, fur, s * 0.17, 0.24, 0.06); // 大耳
        box(head, 0.03, 0.16, 0.03, WHITE, s * 0.05, -0.2, -0.17); // 尖牙
      }
      box(head, 0.06, 0.05, 0.04, BLACK, 0, -0.04, -0.21);
    },
  });
}

function andeanCat() {
  const fur = 0xb5aa98;
  return quadruped({
    body: { w: 0.32, h: 0.3, d: 0.65, y: 0.45, color: fur },
    head: { w: 0.3, h: 0.28, d: 0.28, y: 0.6, z: -0.45, color: fur },
    legs: { w: 0.1, h: 0.32, x: 0.11, zf: -0.22, zb: 0.22, color: fur },
    tail: { w: 0.16, h: 0.16, d: 0.6, y: 0.5, color: fur, angle: -0.3 },
    walkSpeed: 10,
    extras({ root, head, tail }) {
      for (const s of [-1, 1]) {
        box(head, 0.08, 0.1, 0.05, fur, s * 0.1, 0.18, 0.03);
        for (let i = 0; i < 4; i++) box(root, 0.02, 0.18, 0.05, 0x8d6e63, s * 0.165, 0.48, -0.22 + i * 0.15);
      }
      for (let i = 0; i < 4; i++) box(tail, 0.17, 0.17, 0.06, 0x6d4c41, 0, 0, 0.1 + i * 0.14);
    },
  });
}

function volcanoRabbit() {
  const fur = 0x6b5444;
  return quadruped({
    body: { w: 0.25, h: 0.24, d: 0.35, y: 0.22, color: fur },
    head: { w: 0.22, h: 0.2, d: 0.2, y: 0.32, z: -0.22, color: fur },
    legs: { w: 0.07, h: 0.12, x: 0.08, zf: -0.1, zb: 0.1, color: fur },
    walkSpeed: 16,
    swing: 0.9,
    extras({ head }) {
      for (const s of [-1, 1]) box(head, 0.07, 0.1, 0.04, fur, s * 0.07, 0.14, 0.02); // 細細圓耳
      box(head, 0.04, 0.03, 0.02, 0xf48fb1, 0, -0.03, -0.11);
    },
  });
}

// 冇模型嘅後備
function fallback() {
  const g = new THREE.Group();
  box(g, 0.8, 0.8, 0.8, 0xffcc80, 0, 0.4, 0);
  g.userData.animate = () => {};
  g.userData.height = 0.8;
  return g;
}

const MODELS = {
  'Giant Panda': panda,
  'African Savanna Elephant': () => elephant(false),
  'African Forest Elephant': () => elephant(true),
  'Black Rhinoceros': () => rhino(),

  'Manta Ray': manta,
  'Scalloped Hammerhead Shark': hammerhead,
  'Blue Whale': () => swimmer({ skin: 0x4a6b8a, belly: 0xa9bccd, length: 5.5, width: 1.1, height: 1.0, dorsal: true }),
  Vaquita: () => swimmer({
    skin: 0x7d8790, belly: 0xd8dde0, length: 1.6, width: 0.45, height: 0.45, dorsal: true,
    extras: ({ root }) => { for (const s of [-1, 1]) box(root, 0.02, 0.14, 0.14, BLACK, s * 0.23, 0, -0.56); }, // 黑眼圈
  }),
  'Sea Turtle': seaTurtle,

  "Spix's Macaw": () => bird({ body: 0x3d7cc9, head: 0x9bbbe0, wing: 0x2f62a8, tail: 0.8 }),
  'Philippine Eagle': () => bird({ body: 0x6b4a2e, belly: 0xf0ece0, head: 0xe0cfae, wing: 0x5a3d24, beak: 0x6a7a8a, size: 1.5, tail: 0.45, crest: 0xc8ac7c, beakLong: true }),
  Kakapo: () => bird({ body: 0x7a9a3a, belly: 0xb8b058, head: 0xa8a050, wing: 0x6b8a30, beak: 0xd8d0b8, size: 1.2, tail: 0.25, flightless: true }), // 唔識飛！
  'Hyacinth Macaw': () => bird({ body: 0x2346a8, wing: 0x1c3a90, size: 1.3, tail: 1.0, eyeRing: 0xffd600, beak: 0x222222 }),
  'Sun Conure': () => bird({ body: 0xffb300, belly: 0xffa000, head: 0xff7a00, wing: 0x43a047, size: 0.8, tail: 0.55 }),

  'Polar Bear': polarBear,
  Narwhal: () => swimmer({
    skin: 0x8a9099, belly: 0xd0d4d8, length: 2.6, width: 0.7, height: 0.65,
    extras: ({ root }) => box(root, 0.06, 0.06, 1.6, 0xfff8e1, -0.1, 0, -1.7), // 長牙
  }),
  'Beluga Whale': () => swimmer({
    skin: 0xf0f4f5, belly: 0xe2e8ea, length: 2.8, width: 0.8, height: 0.75,
    extras: ({ root }) => box(root, 0.7, 0.4, 0.5, 0xf0f4f5, 0, 0.35, -0.85), // 大額頭
  }),
  'Ringed Seal': ringedSeal,
  'Emperor Penguin': penguin,
  'Arctic Fox': arcticFox,
  Caribou: caribou,
  'Snowy Owl': snowyOwl,

  'Amur Leopard': amurLeopard,
  'Sumatran Orangutan': () => ape({ fur: 0xd2772f, face: 0x8a6a58, beard: true }),
  'Bornean Orangutan': () => ape({ fur: 0x9a4318, face: 0x5a4034, cheeks: true }),
  'Mountain Gorilla': () => ape({ fur: 0x2b2b2b, face: 0x1a1a1a, size: 1.2, silverBack: true }),
  'Javan Rhino': () => rhino({ skin: 0x80796f, horns: 1 }),
  'Sumatran Rhino': () => rhino({ skin: 0x7a5a45, size: 0.8, hairy: true }),
  Saola: saola,
  Pangolin: pangolin,

  'Red Panda': redPanda,
  Okapi: okapi,
  'Whale Shark': () => swimmer({
    skin: 0x3e5466, belly: 0xe0e0e0, length: 4, width: 1.0, height: 0.7, whale: false, dorsal: true,
    extras: ({ root, rear }) => {
      for (let i = 0; i < 14; i++) box(root, 0.1, 0.03, 0.1, WHITE, ((i * 5) % 7 - 3) * 0.12, 0.36, -1.1 + (i % 7) * 0.22); // 白點
      for (let i = 0; i < 4; i++) box(rear, 0.08, 0.03, 0.08, WHITE, ((i % 2) - 0.5) * 0.3, 0.27, 0.3 + i * 0.25);
    },
  }),
  Dugong: () => swimmer({
    skin: 0x9e9a94, belly: 0xbdb7ae, length: 2.4, width: 0.8, height: 0.7,
    extras: ({ root }) => box(root, 0.45, 0.35, 0.3, 0xb5afa6, 0, -0.15, -0.95), // 大鼻
  }),
  'California Condor': () => bird({ body: 0x1a1a1a, head: 0xf08060, wing: 0x111111, beak: 0xe0c8a0, size: 1.5, tail: 0.4, beakLong: true }),
  'Bali Myna': () => bird({ body: 0xf5f5f5, head: 0xf5f5f5, wing: 0xeeeeee, beak: 0xf9d55a, size: 0.75, tail: 0.45, crest: 0xffffff, eyeRing: 0x1e88e5 }),
  Walrus: () => seal({ skin: 0x9c6b4e, size: 1.8, tusks: true }),
  'Atlantic Puffin': () => bird({ body: 0x1c1c1c, belly: 0xf5f5f5, head: 0xf5f5f5, wing: 0x1c1c1c, beak: 0xff6f00, size: 0.8, tail: 0.2 }),
  'Sumatran Tiger': sumatranTiger,
  'Slow Loris': slowLoris,

  'Snow Leopard': snowLeopard,
  'Andean Bear': andeanBear,
  'Ethiopian Wolf': ethiopianWolf,
  'Mountain Pygmy Possum': pygmyPossum,
  'Golden Snub-nosed Monkey': () => ape({ fur: 0xe8a33c, face: 0x7fb3d5, size: 0.6 }),
  Takin: takin,
  'Pyrenean Desman': desman,
  'Himalayan Musk Deer': muskDeer,
  'Andean Cat': andeanCat,
  'Volcano Rabbit': volcanoRabbit,
};

export function buildAnimalModel(animal) {
  const g = (ANIMALS_20[animal.name] || ANIMALS_30[animal.name] || FUSE_MODELS[animal.name] || ENCHANTED_MODELS[animal.name] || MODELS[animal.name] || fallback)();
  g.userData.height *= g.scale.y;
  g.userData.move ??= 'walk';
  return g;
}
