// ☄️ Meteoric Shop 寵物模型（小朋友 Issue #10）：Meteoric Soul、Meteor Elephant、Meteoric Walrus、
// Meteor Golem Bros、Meteor Dragon、Cosmic Arcadragon（Eternal）
// 風格：同 echoPetModels.js 一樣（圓角方塊 + 大眼 + 深色描邊），主題係「深藍隕石 + 發光藍水晶 + 星空」
// 全部面向 -z；回傳 Group：userData.animate(time, moving)、userData.height、userData.move
// meteorShop.js 都用呢度嘅 kit 整舖頭同 Meteoric Chest

import * as THREE from 'three';
import { V, M, GLOW, B, S, pivot, cone, cyl, torus, tube, limb, bigEyes, smile, shape, rig, outline } from './echoPetModels.js';

const PI = Math.PI;
// 顏色
export const ROCK = 0x2c3d73; // 深藍隕石
export const ROCK2 = 0x1f2a52; // 再深啲
export const ROCK3 = 0x4a63ad; // 淺啲（高光面）
export const CYAN = 0x40c4ff; // 水晶藍
export const ICE = 0xb3e5fc; // 冰白
export const AQUA = 0x18ffff;
export const VIOLET = 0x7c4dff;
export const PINK = 0xff80ab;

// 每隻寵物自己一份會郁嘅發光材質（cache 嗰啲係共用，唔可以逐隻閃）
export const glowMat = (c, i = 2.2, extra = {}) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.25, ...extra });
const ghostMat = (c, o = 0.35) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });

// 💎 水晶（拉長嘅八面體，有描邊）
const OCTA = new THREE.OctahedronGeometry(1, 0);
export function crystal(parent, r, h, x, y, z, material, { rx = 0, rz = 0, line = 0.08 } = {}) {
  const m = new THREE.Mesh(OCTA, material);
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  m.rotation.set(rx, PI / 4, rz);
  m.castShadow = true;
  parent.add(m);
  if (line) outline(m, line);
  return m;
}
// 一撮水晶（中間大、兩邊細）
export function crystalCluster(parent, s, x, y, z, material, tilt = 0) {
  const p = pivot(parent, x, y, z);
  p.rotation.z = tilt;
  crystal(p, 0.09 * s, 0.26 * s, 0, 0.2 * s, 0, material);
  crystal(p, 0.06 * s, 0.17 * s, -0.11 * s, 0.12 * s, 0.03 * s, material, { rz: 0.5 });
  crystal(p, 0.055 * s, 0.15 * s, 0.1 * s, 0.1 * s, -0.04 * s, material, { rz: -0.55 });
  return p;
}
// 發光裂紋（一條細方條）
export function crack(parent, x, y, z, len, rz, material, thick = 0.022) {
  const m = B(parent, thick, len, thick, CYAN, x, y, z, material, { r: 0.45 });
  m.rotation.z = rz;
  return m;
}
// 細星星（四角星：兩粒拉扁嘅八面體）
export function starBit(parent, s, x, y, z, material) {
  const p = pivot(parent, x, y, z);
  for (const r of [0, PI / 2]) {
    const m = new THREE.Mesh(OCTA, material);
    m.scale.set(s * 0.35, s, s * 0.2);
    m.rotation.z = r;
    p.add(m);
  }
  return p;
}
// 彗星尾（一串越嚟越細、越嚟越透明嘅光波波）
function cometTail(parent, n, r0, dir, color) {
  const balls = [];
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), ghostMat(color, 0.55 * (1 - k)));
    m.scale.setScalar(r0 * (1 - k * 0.8));
    m.position.copy(dir.clone().multiplyScalar(i * r0 * 0.9));
    parent.add(m);
    balls.push(m);
  }
  return balls;
}
// 面（大眼 + 笑口 + 面紅）
function cuteFace(head, { dx, y, z, r, iris = CYAN, mouthY, mouthW = 0.05, blush = PINK, blushX }) {
  const eyes = bigEyes(head, dx, y, z, r, iris, { glow: true, glowI: 0.9 });
  smile(head, 0, mouthY, z - 0.005, mouthW, 0x0d1030, {}, 2.2);
  for (const s of [-1, 1]) S(head, r * 0.55, r * 0.32, r * 0.15, blush, s * (blushX ?? dx * 1.45), y - r * 1.15, z + r * 0.1, { transparent: true, opacity: 0.75, emissive: blush, emissiveIntensity: 0.4 }, { lo: true });
  return eyes;
}

// =============== ☄️ Meteoric Soul（Common）===============
// 細細粒隕石仔：圓角石頭身 + 藍色裂紋 + 大眼，頭頂一撮藍火，後面拖住彗星尾
function meteoricSoul() {
  const g = new THREE.Group();
  const root = pivot(g);
  const crackM = glowMat(CYAN, 2.4);
  const fireM = glowMat(AQUA, 3);
  const fireM2 = glowMat(ICE, 3.5);
  const body = pivot(root, 0, 0.5, 0);
  B(body, 0.66, 0.58, 0.58, ROCK, 0, 0, 0, {}, { line: 0.07, r: 0.32 });
  B(body, 0.5, 0.12, 0.45, ROCK3, 0, 0.27, 0.0, {}, { r: 0.4 }); // 頂嘅高光
  // 石坑
  for (const [x, y, s] of [[0.22, -0.12, 0.07], [-0.24, 0.1, 0.05], [0.25, 0.14, 0.04]]) S(body, s, s, s * 0.4, ROCK2, x, y, -0.29, {}, { lo: true });
  crack(body, -0.2, -0.13, -0.295, 0.16, 0.6, crackM);
  crack(body, 0.33, 0.02, 0.05, 0.2, -0.3, crackM).rotation.y = PI / 2;
  crack(body, -0.33, -0.05, 0.08, 0.18, 0.4, crackM).rotation.y = PI / 2;
  const eyes = cuteFace(body, { dx: 0.13, y: 0.02, z: -0.27, r: 0.095, mouthY: -0.12, mouthW: 0.045 });
  // 細手
  const arms = [-1, 1].map((s) => {
    const a = pivot(body, s * 0.34, -0.08, -0.02);
    S(a, 0.08, 0.1, 0.08, ROCK3, s * 0.03, -0.06, 0, {}, { line: 0.08 });
    return a;
  });
  // 頭頂藍火（3 條火舌）
  const flames = [[-0.12, 0.8], [0, 1.15], [0.12, 0.85]].map(([x, h], i) => {
    const f = pivot(body, x, 0.3, 0.04);
    S(f, 0.1 * h, 0.1 * h, 0.1 * h, AQUA, 0, 0.05, 0, fireM, { lo: true });
    cone(f, 0.095 * h, 0.3 * h, AQUA, 0, 0.2 * h, 0, fireM, 14);
    S(f, 0.05 * h, 0.05 * h, 0.05 * h, ICE, 0, 0.08, -0.02, fireM2, { lo: true });
    f.rotation.z = (1 - i) * 0.25;
    return f;
  });
  // 彗星尾（向後面 +z、向上少少）
  const tail = pivot(body, 0, 0.1, 0.3);
  const balls = cometTail(tail, 7, 0.17, V(0, 0.35, 1).normalize(), CYAN);
  // 光暈
  const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), ghostMat(CYAN, 0.08));
  aura.scale.setScalar(0.62);
  body.add(aura);
  return rig(g, root, {
    eyes, height: 1.15,
    tick(t, m) {
      body.position.y = 0.55 + Math.sin(t * 2.4) * 0.07 + Math.abs(Math.sin(t * 9)) * 0.05 * m;
      body.rotation.z = Math.sin(t * 1.6) * 0.06;
      body.rotation.x = m * 0.12;
      arms.forEach((a, i) => (a.rotation.z = (i ? 1 : -1) * (0.3 + Math.sin(t * 3 + i) * 0.3)));
      flames.forEach((f, i) => f.scale.set(1, 0.85 + Math.sin(t * 10 + i * 2.1) * 0.2, 1));
      fireM.emissiveIntensity = 2.6 + Math.sin(t * 7) * 0.6;
      crackM.emissiveIntensity = 1.8 + Math.sin(t * 2.5) * 0.8;
      tail.rotation.y = Math.sin(t * 2) * 0.25;
      balls.forEach((b, i) => (b.position.x = Math.sin(t * 4 - i * 0.7) * 0.03 * i));
      aura.material.opacity = 0.06 + Math.sin(t * 2.2) * 0.03;
    },
  });
}

// =============== 🐘 Meteor Elephant（Rare）===============
// 深藍隕石大象：發光藍裂紋、水晶象牙、大耳仔入面有發光紋、背上一撮水晶、鼻會捲
function meteorElephant() {
  const g = new THREE.Group();
  const root = pivot(g);
  const crackM = glowMat(CYAN, 2.2);
  const crystM = glowMat(CYAN, 1.4, { roughness: 0.1, metalness: 0.1 });
  const tuskM = glowMat(ICE, 1.2, { roughness: 0.1 });
  // 腳
  const legs = [[-0.32, -0.42], [0.32, -0.42], [-0.32, 0.42], [0.32, 0.42]].map(([x, z]) => {
    const hip = pivot(root, x, 0.58, z);
    B(hip, 0.3, 0.52, 0.3, ROCK2, 0, -0.27, 0, {}, { line: 0.07 });
    B(hip, 0.34, 0.1, 0.34, ROCK3, 0, -0.52, 0, {}, { r: 0.35 });
    for (let i = 0; i < 3; i++) S(hip, 0.035, 0.03, 0.02, ICE, (i - 1) * 0.08, -0.5, -0.17, {}, { lo: true }); // 腳甲
    return hip;
  });
  // 身
  const body = pivot(root, 0, 0.92, 0.05);
  B(body, 0.96, 0.72, 1.3, ROCK, 0, 0, 0, {}, { line: 0.05, r: 0.3 });
  B(body, 0.8, 0.14, 1.1, ROCK3, 0, 0.34, 0, {}, { r: 0.4 });
  crack(body, 0.485, 0.05, -0.2, 0.36, 0.5, crackM).rotation.y = PI / 2;
  crack(body, 0.485, -0.05, 0.3, 0.3, -0.6, crackM).rotation.y = PI / 2;
  crack(body, -0.485, 0.0, 0.0, 0.4, 0.4, crackM).rotation.y = PI / 2;
  crack(body, -0.485, -0.1, 0.4, 0.22, -0.3, crackM).rotation.y = PI / 2;
  // 背上水晶
  crystalCluster(body, 1.3, 0, 0.38, 0.1, crystM);
  crystalCluster(body, 0.8, -0.25, 0.36, 0.45, crystM, 0.3);
  crystalCluster(body, 0.75, 0.25, 0.36, -0.3, crystM, -0.3);
  // 尾
  const tail = pivot(body, 0, 0.1, 0.66);
  limb(tail, V(0, 0, 0), V(0, -0.3, 0.1), 0.035, ROCK2, {});
  crystal(tail, 0.05, 0.08, 0, -0.34, 0.12, crystM, { line: 0 });
  // 頭
  const head = pivot(body, 0, 0.18, -0.72);
  B(head, 0.66, 0.62, 0.52, ROCK, 0, 0, 0, {}, { line: 0.06, r: 0.32 });
  B(head, 0.5, 0.1, 0.4, ROCK3, 0, 0.3, 0.02, {}, { r: 0.4 });
  crack(head, 0.18, 0.15, -0.265, 0.12, 0.6, crackM);
  const eyes = cuteFace(head, { dx: 0.16, y: 0.06, z: -0.25, r: 0.085, mouthY: -0.2, mouthW: 0.04, blushX: 0.24 });
  // 耳仔（大塊扁方塊，入面發光藍紋）
  const ears = [-1, 1].map((s) => {
    const e = pivot(head, s * 0.33, 0.05, 0.02);
    e.rotation.y = s * 0.5;
    B(e, 0.07, 0.56, 0.46, ROCK, s * 0.03, -0.04, 0.2, {}, { line: 0.1, r: 0.35 });
    B(e, 0.02, 0.4, 0.32, ROCK2, s * -0.01, -0.04, 0.2, {}, { r: 0.4 });
    crack(e, s * -0.022, 0.02, 0.18, 0.2, 0.7, crackM, 0.018);
    crack(e, s * -0.022, -0.1, 0.24, 0.14, -0.5, crackM, 0.018);
    return e;
  });
  // 象牙（水晶）
  for (const s of [-1, 1]) {
    const tk = pivot(head, s * 0.17, -0.2, -0.2);
    const c = cone(tk, 0.05, 0.3, ICE, 0, 0, 0, tuskM, 10);
    c.rotation.x = -2.2;
    c.position.set(0, -0.04, -0.1);
  }
  // 鼻（4 節，會捲）
  const trunk = [];
  let parent = pivot(head, 0, -0.08, -0.26);
  for (let i = 0; i < 4; i++) {
    const w = 0.17 - i * 0.025;
    B(parent, w, 0.17, w, i % 2 ? ROCK3 : ROCK, 0, -0.08, 0, {}, { line: 0.08, r: 0.4 });
    trunk.push(parent);
    parent = pivot(parent, 0, -0.15, 0);
  }
  S(parent, 0.06, 0.035, 0.06, CYAN, 0, 0.0, 0, crackM, { lo: true }); // 鼻尖發光
  return rig(g, root, {
    eyes, height: 1.55,
    tick(t, m) {
      const sw = Math.sin(t * 6) * 0.45 * m;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      body.position.y = 0.92 + Math.abs(Math.sin(t * 6)) * 0.04 * m + Math.sin(t * 1.5) * 0.012;
      ears.forEach((e, i) => (e.rotation.y = (i ? 1 : -1) * (0.5 + Math.sin(t * 2.2) * 0.2)));
      trunk.forEach((p, i) => (p.rotation.x = -0.25 - Math.sin(t * 1.6) * 0.14 * (i + 1) * 0.6 - (i === 0 ? 0.1 : 0)));
      head.rotation.z = Math.sin(t * 1.1) * 0.04;
      tail.rotation.z = Math.sin(t * 3) * 0.4;
      crackM.emissiveIntensity = 1.8 + Math.sin(t * 2.4) * 0.8;
      crystM.emissiveIntensity = 1.2 + Math.sin(t * 3.1) * 0.5;
    },
  });
}

// =============== 🦭 Meteoric Walrus（Epic）===============
// 肥嘟嘟藍灰色海象：好長嘅發光水晶牙、胖面珠 + 鬚、背上一排水晶、身上有發光星星點
function meteoricWalrus() {
  const g = new THREE.Group();
  const root = pivot(g);
  const skin = 0x5865a8;
  const skin2 = 0x434e8c;
  const belly = 0x8fa3e0;
  const crystM = glowMat(CYAN, 1.5, { roughness: 0.1 });
  const tuskM = glowMat(ICE, 1.6, { roughness: 0.08 });
  const starM = glowMat(ICE, 2.5);
  const body = pivot(root, 0, 0.5, 0.1);
  B(body, 1.0, 0.82, 1.3, skin, 0, 0, 0, {}, { line: 0.05, r: 0.45 });
  B(body, 0.78, 0.5, 0.9, belly, 0, -0.18, -0.12, {}, { r: 0.45 });
  B(body, 0.62, 0.42, 0.5, skin2, 0, -0.05, 0.75, {}, { line: 0.07, r: 0.45 }); // 屁股
  // 背上一排水晶
  [[0, 0.42, -0.25, 1.0], [0, 0.42, 0.1, 1.2], [0, 0.38, 0.42, 0.9]].forEach(([x, y, z, s], i) => crystalCluster(body, s, x, y, z, crystM, (i - 1) * 0.15));
  // 星星點
  const stars = [[0.5, 0.15, -0.2], [0.5, -0.05, 0.25], [-0.5, 0.1, 0.0], [-0.5, -0.1, 0.35], [0.3, 0.38, 0.35]].map(([x, y, z]) => {
    const st = starBit(body, 0.07, x, y, z, starM);
    st.rotation.y = x > 0 ? PI / 2 : -PI / 2;
    return st;
  });
  // 前鰭
  const flips = [-1, 1].map((s) => {
    const f = pivot(body, s * 0.45, -0.3, -0.3);
    B(f, 0.42, 0.08, 0.26, skin2, s * 0.18, -0.06, 0, {}, { line: 0.12, r: 0.45 });
    return f;
  });
  // 尾鰭
  const tail = pivot(body, 0, -0.18, 1.0);
  for (const s of [-1, 1]) B(tail, 0.36, 0.07, 0.24, skin2, s * 0.17, 0, 0.08, {}, { line: 0.12, r: 0.45 }).rotation.y = s * 0.4;
  // 頭
  const head = pivot(body, 0, 0.38, -0.62);
  B(head, 0.72, 0.6, 0.6, skin, 0, 0, 0, {}, { line: 0.06, r: 0.42 });
  const eyes = cuteFace(head, { dx: 0.16, y: 0.1, z: -0.28, r: 0.075, mouthY: -0.24, mouthW: 0.035, blushX: 0.27 });
  // 胖面珠（兩粒）+ 鬚點 + 鼻
  for (const s of [-1, 1]) {
    S(head, 0.15, 0.12, 0.1, belly, s * 0.11, -0.1, -0.3, {}, { line: 0.06 });
    for (let i = 0; i < 3; i++) S(head, 0.012, 0.012, 0.01, 0x1a237e, s * (0.07 + (i % 2) * 0.06), -0.07 - Math.floor(i / 2) * 0.05, -0.395, {}, { lo: true });
  }
  S(head, 0.06, 0.045, 0.04, 0x1a1f3d, 0, -0.02, -0.38, { roughness: 0.15 });
  // 水晶長牙（向下）
  const tusks = [-1, 1].map((s) => {
    const tk = pivot(head, s * 0.1, -0.18, -0.3);
    const c = cone(tk, 0.045, 0.42, ICE, 0, -0.21, 0, tuskM, 8);
    c.rotation.x = PI;
    outline(c, 0.08);
    return tk;
  });
  return rig(g, root, {
    eyes, height: 1.3,
    tick(t, m) {
      const hop = Math.abs(Math.sin(t * 5)) * m;
      body.position.y = 0.5 + hop * 0.1 + Math.sin(t * 1.4) * 0.015;
      body.scale.set(1 + hop * 0.04, 1 - hop * 0.05, 1);
      body.rotation.x = Math.sin(t * 5) * 0.05 * m;
      flips.forEach((f, i) => (f.rotation.z = (i ? 1 : -1) * (-0.2 + Math.sin(t * (m ? 5 : 2) + i * PI) * (m ? 0.35 : 0.15))));
      tail.rotation.y = Math.sin(t * 2.5) * 0.25;
      head.rotation.z = Math.sin(t * 1.2) * 0.06;
      head.rotation.x = Math.sin(t * 0.8) * 0.05;
      tusks.forEach((tk) => (tk.rotation.x = Math.sin(t * 1.2) * 0.03));
      crystM.emissiveIntensity = 1.2 + Math.sin(t * 2.6) * 0.6;
      tuskM.emissiveIntensity = 1.3 + Math.sin(t * 3.2) * 0.5;
      stars.forEach((s, i) => s.scale.setScalar(0.8 + Math.max(0, Math.sin(t * 3 + i * 1.7)) * 0.5));
    },
  });
}

// =============== 🗿 Meteor Golem Bros（Legendary）===============
// 兩隻細隕石石人（一隻藍、一隻紫）手拖手：大頭、發光心核、頭頂水晶；行路一齊擺，間中擊掌
function golem(parent, x, { body: col, body2, light, core, scale }) {
  const p = pivot(parent, x, 0, 0);
  p.scale.setScalar(scale);
  const coreM = glowMat(core, 2.8);
  const crackM = glowMat(core, 2);
  const crystM = glowMat(core, 1.4, { roughness: 0.1 });
  const legs = [-1, 1].map((s) => {
    const hip = pivot(p, s * 0.15, 0.32, 0);
    B(hip, 0.2, 0.28, 0.22, body2, 0, -0.14, 0, {}, { line: 0.08 });
    B(hip, 0.24, 0.09, 0.27, col, 0, -0.29, -0.02, {}, { r: 0.35 });
    return hip;
  });
  const torso = pivot(p, 0, 0.6, 0);
  B(torso, 0.6, 0.46, 0.42, col, 0, 0, 0, {}, { line: 0.06, r: 0.3 });
  B(torso, 0.44, 0.1, 0.36, light, 0, 0.22, 0, {}, { r: 0.4 });
  const coreBall = S(torso, 0.07, 0.07, 0.04, 0xffffff, 0, 0.0, -0.215, coreM);
  torus(torso, 0.1, 0.018, core, 0, 0, -0.212, coreM);
  crack(torso, -0.2, -0.08, -0.213, 0.12, 0.5, crackM);
  crack(torso, 0.22, 0.1, -0.213, 0.1, -0.4, crackM);
  const arms = [-1, 1].map((s) => {
    const sh = pivot(torso, s * 0.36, 0.12, 0);
    B(sh, 0.2, 0.2, 0.22, body2, 0, 0, 0, {}, { line: 0.08 });
    B(sh, 0.16, 0.22, 0.18, col, 0, -0.2, 0, {}, { line: 0.08 });
    B(sh, 0.22, 0.18, 0.22, body2, 0, -0.38, -0.01, {}, { line: 0.08 });
    return sh;
  });
  const head = pivot(torso, 0, 0.47, -0.02);
  B(head, 0.56, 0.48, 0.46, col, 0, 0, 0, {}, { line: 0.06, r: 0.32 });
  B(head, 0.4, 0.08, 0.36, light, 0, 0.23, 0, {}, { r: 0.4 });
  const eyes = cuteFace(head, { dx: 0.12, y: 0.02, z: -0.225, r: 0.075, iris: core, mouthY: -0.13, mouthW: 0.04, blushX: 0.19 });
  crystalCluster(head, 0.9, 0.05, 0.22, 0.02, crystM, -0.2);
  return { p, legs, arms, torso, head, eyes, coreM, coreBall, crystM };
}
function meteorGolemBros() {
  const g = new THREE.Group();
  const root = pivot(g);
  const big = golem(root, -0.36, { body: ROCK, body2: ROCK2, light: ROCK3, core: CYAN, scale: 1.12 });
  const small = golem(root, 0.4, { body: 0x3d2f78, body2: 0x2b2056, light: 0x6650b8, core: 0xb388ff, scale: 0.95 });
  small.p.rotation.y = -0.15;
  big.p.rotation.y = 0.15;
  // 兩兄弟之間一粒浮住嘅細隕石（佢哋嘅「寵物」）
  const pebble = pivot(root, 0.02, 1.25, -0.05);
  B(pebble, 0.14, 0.12, 0.13, ROCK3, 0, 0, 0, {}, { line: 0.1, r: 0.35 });
  const pebbleTail = cometTail(pebble, 4, 0.07, V(0.3, 0.4, 1).normalize(), CYAN);
  return rig(g, root, {
    eyes: [...big.eyes, ...small.eyes], height: 1.55,
    tick(t, m) {
      const five = (t % 6) > 5 && m < 0.5; // 間中擊掌
      [big, small].forEach((b, i) => {
        const ph = t * 6 + i * PI;
        const sw = Math.sin(ph) * 0.5 * m;
        b.legs[0].rotation.x = sw;
        b.legs[1].rotation.x = -sw;
        b.arms[0].rotation.x = -sw * 0.8 + Math.sin(t * 1.3 + i) * 0.06;
        b.arms[1].rotation.x = sw * 0.8 - Math.sin(t * 1.3 + i) * 0.06;
        b.p.position.y = Math.abs(Math.sin(ph)) * 0.05 * m + (five ? Math.sin((t % 1) * PI) * 0.08 : 0);
        b.torso.rotation.z = Math.sin(ph) * 0.06 * m + Math.sin(t * 0.9 + i) * 0.03;
        b.head.rotation.z = Math.sin(t * 1.4 + i * 2) * 0.08;
        b.coreM.emissiveIntensity = 2.2 + Math.sin(t * 3 + i) * 0.8;
        b.crystM.emissiveIntensity = 1.1 + Math.sin(t * 2.4 + i) * 0.5;
      });
      // 擊掌：大佬右手、細佬左手舉高
      if (five) {
        big.arms[1].rotation.set(0, 0, 2.4);
        small.arms[0].rotation.set(0, 0, -2.4);
      } else {
        big.arms[1].rotation.z = 0.12;
        small.arms[0].rotation.z = -0.12;
      }
      pebble.position.y = 1.25 + Math.sin(t * 2) * 0.08;
      pebble.rotation.set(t * 0.8, t * 1.2, 0);
      pebbleTail.forEach((b, i) => (b.material.opacity = 0.4 * (1 - i / 4) * (0.7 + Math.sin(t * 5) * 0.3)));
    },
  });
}

// =============== 🐉 龍嘅共用骨架 ===============
const WING = [[0, 0], [0.35, 0.3], [0.8, 0.5], [1.1, 0.42], [0.95, 0.12], [0.78, -0.02], [0.62, -0.14], [0.42, -0.04], [0.26, -0.18], [0.1, -0.06]];
function dragonRig(g, { body: col, body2, belly, wingCol, wingGlow, horn, crystal: crystC, s = 1, sparkles = 0 }) {
  const root = pivot(g);
  const bellyM = glowMat(belly, 0.9);
  const crystM = glowMat(crystC, 1.6, { roughness: 0.1 });
  const wingM = new THREE.MeshStandardMaterial({ color: wingCol, emissive: wingGlow, emissiveIntensity: 1.1, roughness: 0.35, side: THREE.DoubleSide });
  const starM = glowMat(0xffffff, 3);
  // 腳
  const legs = [[-0.24, -0.3], [0.24, -0.3], [-0.24, 0.32], [0.24, 0.32]].map(([x, z]) => {
    const hip = pivot(root, x * s, 0.45 * s, z * s);
    B(hip, 0.2 * s, 0.4 * s, 0.22 * s, body2, 0, -0.2 * s, 0, {}, { line: 0.08 });
    B(hip, 0.24 * s, 0.08 * s, 0.28 * s, col, 0, -0.4 * s, -0.03 * s, {}, { r: 0.35 });
    for (let i = 0; i < 3; i++) cone(hip, 0.025 * s, 0.07 * s, 0xe1f5fe, (i - 1) * 0.07 * s, -0.42 * s, -0.17 * s, {}, 6).rotation.x = -PI / 2; // 爪
    return hip;
  });
  // 身
  const body = pivot(root, 0, 0.72 * s, 0);
  B(body, 0.62 * s, 0.52 * s, 1.0 * s, col, 0, 0, 0, {}, { line: 0.05, r: 0.35 });
  for (let i = 0; i < 4; i++) B(body, 0.42 * s, 0.05 * s, 0.17 * s, belly, 0, -0.26 * s, (-0.32 + i * 0.21) * s, bellyM, { r: 0.4 }); // 肚皮發光鱗
  // 背脊水晶
  const spikes = [];
  for (let i = 0; i < 4; i++) spikes.push(crystal(body, 0.07 * s, (0.16 - i * 0.02) * s, 0, 0.3 * s, (-0.3 + i * 0.22) * s, crystM));
  // 星星（Arcadragon：成身閃）
  const twinkles = [];
  for (let i = 0; i < sparkles; i++) {
    const side = i % 2 ? 1 : -1;
    const st = starBit(body, 0.05 * s, side * 0.315 * s, (-0.1 + ((i * 37) % 10) / 40) * s, (-0.4 + ((i * 53) % 10) / 12) * s, starM);
    st.rotation.y = side * PI / 2;
    twinkles.push(st);
  }
  // 翼
  const wings = [-1, 1].map((sd) => {
    const w = pivot(body, sd * 0.28 * s, 0.22 * s, -0.08 * s);
    w.rotation.x = -0.65; // 翼面向後向上斜：前面望都見到塊翼
    const arm = pivot(w);
    limb(arm, V(0, 0, 0), V(sd * 0.85 * s, 0, -0.02 * s), 0.04 * s, body2, {}, 0.1); // 翼骨（沿住翼前邊）
    const m = shape(arm, WING, 0.02, wingCol, wingM, { key: 'mtWing' });
    m.scale.set(sd * 0.95 * s, 0.95 * s, 1);
    m.rotation.x = PI / 2;
    m.position.set(0, 0.02 * s, 0.02 * s);
    // 翼上嘅細星
    for (const [x, z] of [[0.45, 0.25], [0.75, 0.3], [0.6, 0.05]]) {
      const st = starBit(arm, 0.045 * s, sd * x * s, 0.04 * s, z * s * -1 + 0.15 * s, starM);
      st.rotation.x = -PI / 2;
    }
    return w;
  });
  // 頸 + 頭
  const neck = pivot(body, 0, 0.18 * s, -0.48 * s);
  B(neck, 0.3 * s, 0.38 * s, 0.3 * s, col, 0, 0.14 * s, -0.04 * s, {}, { line: 0.08 });
  B(neck, 0.2 * s, 0.3 * s, 0.05 * s, belly, 0, 0.12 * s, -0.19 * s, bellyM, { r: 0.4 });
  const head = pivot(neck, 0, 0.42 * s, -0.12 * s);
  B(head, 0.5 * s, 0.42 * s, 0.44 * s, col, 0, 0, 0, {}, { line: 0.06, r: 0.32 });
  B(head, 0.36 * s, 0.22 * s, 0.26 * s, body2, 0, -0.08 * s, -0.3 * s, {}, { line: 0.08, r: 0.35 }); // 口鼻
  for (const sd of [-1, 1]) S(head, 0.025 * s, 0.02 * s, 0.015 * s, crystC, sd * 0.08 * s, -0.02 * s, -0.43 * s, glowMat(crystC, 2), { lo: true }); // 鼻孔發光
  const eyes = bigEyes(head, 0.12 * s, 0.06 * s, -0.2 * s, 0.075 * s, crystC, { glow: true, glowI: 1 });
  smile(head, 0, -0.16 * s, -0.43 * s, 0.05 * s, 0x0d1030, {}, 2.0);
  for (const sd of [-1, 1]) {
    const h = pivot(head, sd * 0.15 * s, 0.2 * s, 0.1 * s);
    h.rotation.set(-0.6, 0, sd * -0.35);
    crystal(h, 0.06 * s, 0.2 * s, 0, 0.15 * s, 0, glowMat(horn, 1.4, { roughness: 0.1 }));
  }
  // 尾（5 節）+ 尾尖彗星火
  const tail = [];
  let p = pivot(body, 0, 0.0, 0.5 * s);
  for (let i = 0; i < 5; i++) {
    const w = (0.24 - i * 0.04) * s;
    B(p, w, w, 0.24 * s, i % 2 ? body2 : col, 0, 0, 0.1 * s, {}, { line: 0.08, r: 0.4 });
    tail.push(p);
    p = pivot(p, 0, 0, 0.2 * s);
  }
  const fireM = glowMat(crystC, 3);
  const flame = pivot(p, 0, 0, 0.05 * s);
  const fl = cone(flame, 0.09 * s, 0.32 * s, crystC, 0, 0, 0.12 * s, fireM, 12);
  fl.rotation.x = PI / 2;
  S(flame, 0.08 * s, 0.08 * s, 0.08 * s, ICE, 0, 0, 0, fireM, { lo: true });
  return { root, legs, body, wings, neck, head, tail, flame, eyes, bellyM, crystM, twinkles, fireM, spikes };
}
function animateDragon(d, t, m, { fly = false, hover = 0 } = {}) {
  const sw = Math.sin(t * 6) * 0.4 * m;
  d.legs[0].rotation.x = fly ? 0.5 : sw;
  d.legs[3].rotation.x = fly ? 0.7 : sw;
  d.legs[1].rotation.x = fly ? 0.5 : -sw;
  d.legs[2].rotation.x = fly ? 0.7 : -sw;
  const flap = Math.sin(t * (fly ? 5 : 2.4));
  d.wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * -(fly ? 0.45 + flap * 0.5 : 0.75 + flap * 0.15))); // 翼向上斜，前面望都見到
  d.root.position.y = hover + (fly ? Math.sin(t * 2.5) * 0.12 : Math.abs(Math.sin(t * 6)) * 0.04 * m);
  d.neck.rotation.x = Math.sin(t * 1.3) * 0.08;
  d.head.rotation.z = Math.sin(t * 1.1) * 0.07;
  d.tail.forEach((p, i) => (p.rotation.y = Math.sin(t * 2.2 - i * 0.6) * 0.18));
  d.flame.scale.set(1, 1, 0.85 + Math.sin(t * 12) * 0.2);
  d.fireM.emissiveIntensity = 2.6 + Math.sin(t * 9) * 0.6;
  d.bellyM.emissiveIntensity = 0.7 + Math.sin(t * 2) * 0.35;
  d.crystM.emissiveIntensity = 1.3 + Math.sin(t * 2.8) * 0.6;
  d.twinkles.forEach((s, i) => s.scale.setScalar(0.6 + Math.max(0, Math.sin(t * 3.5 + i * 1.3)) * 0.8));
}

// =============== 🐉 Meteor Dragon（Mythic）===============
function meteorDragon() {
  const g = new THREE.Group();
  const d = dragonRig(g, { body: 0x34509a, body2: ROCK, belly: CYAN, wingCol: 0x2a4bb0, wingGlow: 0x2979ff, horn: ICE, crystal: CYAN, s: 1.15, sparkles: 4 });
  // 身邊兩粒細隕石圍住轉
  const rocks = [0, 1].map((i) => {
    const p = pivot(d.root, 0, 1.1, 0);
    const r = B(p, 0.12, 0.1, 0.11, ROCK3, 0.9, 0, 0, {}, { line: 0.1, r: 0.35 });
    cometTail(r, 4, 0.06, V(0, 0, 1), CYAN);
    p.rotation.y = i * PI;
    return p;
  });
  return rig(g, d.root, {
    eyes: d.eyes, height: 1.8,
    tick(t, m) {
      animateDragon(d, t, m);
      rocks.forEach((p, i) => {
        p.rotation.y = t * 1.2 + i * PI;
        p.position.y = 1.1 + Math.sin(t * 2 + i) * 0.15;
      });
    },
  });
}

// =============== 🌌 Cosmic Arcadragon（Eternal）===============
// 宇宙魔龍：星空紫藍色身（周身閃星）、水晶皇冠、大翼（紫 + 青光）、三個魔法符文圈圍住轉、兩粒細星球、光暈
function cosmicArcadragon() {
  const g = new THREE.Group();
  const d = dragonRig(g, { body: 0x4630b8, body2: 0x2c1d80, belly: 0x18ffff, wingCol: 0x5a2fd0, wingGlow: 0x7c4dff, horn: 0xffd740, crystal: 0x18ffff, s: 1.35, sparkles: 10 });
  const gold = glowMat(0xffd740, 1.6, { metalness: 0.6, roughness: 0.25 });
  // 水晶皇冠
  const crown = pivot(d.head, 0, 0.3 * 1.35, 0.02);
  torus(crown, 0.16, 0.025, 0xffd740, 0, 0, 0, gold).rotation.x = PI / 2;
  const crownM = glowMat(0x18ffff, 2, { roughness: 0.1 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2;
    crystal(crown, 0.04, i === 0 ? 0.14 : 0.09, Math.sin(a) * 0.16, 0.08, -Math.cos(a) * 0.16, i === 0 ? glowMat(PINK, 2.4) : crownM, { line: 0.1 });
  }
  // 魔法符文圈（三個，唔同角度轉）
  const runeM = [0x18ffff, 0xb388ff, 0xffd740].map((c) => ghostMat(c, 0.75));
  const rings = runeM.map((rm, i) => {
    const p = pivot(d.root, 0, 1.15, 0.05);
    const r = new THREE.Mesh(new THREE.TorusGeometry(1.15 + i * 0.12, 0.022, 8, 64), rm);
    p.add(r);
    // 符文（一粒粒細方塊）
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * PI * 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), rm);
      b.position.set(Math.cos(a) * (1.15 + i * 0.12), Math.sin(a) * (1.15 + i * 0.12), 0);
      b.rotation.z = a + PI / 4;
      p.add(b);
    }
    p.rotation.set(PI / 2 + (i - 1) * 0.5, i * 0.7, 0);
    return p;
  });
  // 兩粒細星球
  const planets = [[0x40c4ff, 0.11, true], [0xff80ab, 0.08, false]].map(([c, r, ring], i) => {
    const p = pivot(d.root, 0, 1.2, 0);
    const ball = S(p, r, r, r, c, 1.5, 0, 0, glowMat(c, 1.2), { line: 0.08 });
    if (ring) torus(ball, 1.6, 0.12, 0xffd740, 0, 0, 0, gold).rotation.x = 1.2;
    p.rotation.y = i * PI;
    return p;
  });
  // 光暈
  const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), ghostMat(0x7c4dff, 0.08));
  aura.scale.set(1.3, 1.1, 1.6);
  aura.position.y = 1.1;
  d.root.add(aura);
  return rig(g, d.root, {
    eyes: d.eyes, height: 2.3, move: 'fly',
    tick(t, m) {
      animateDragon(d, t, m, { fly: true, hover: 0.25 });
      rings.forEach((p, i) => (p.rotation.z = t * (0.4 + i * 0.25) * (i % 2 ? -1 : 1)));
      runeM.forEach((rm, i) => (rm.opacity = 0.5 + Math.sin(t * 2 + i * 2) * 0.25));
      planets.forEach((p, i) => {
        p.rotation.y = t * (0.8 + i * 0.5) + i * PI;
        p.position.y = 1.2 + Math.sin(t * 1.5 + i * 2) * 0.25;
      });
      crown.rotation.y = Math.sin(t * 0.8) * 0.15;
      aura.material.opacity = 0.06 + Math.sin(t * 1.8) * 0.03;
      aura.scale.set(1.3 + Math.sin(t * 2) * 0.05, 1.1, 1.6);
    },
  });
}

export const METEOR_MODELS = {
  'Meteoric Soul': meteoricSoul,
  'Meteor Elephant': meteorElephant,
  'Meteoric Walrus': meteoricWalrus,
  'Meteor Golem Bros': meteorGolemBros,
  'Meteor Dragon': meteorDragon,
  'Cosmic Arcadragon': cosmicArcadragon,
};
