// Biome 7 Enchanted Kingdom 嘅新寵物（小朋友 Issue #5 有圖）：方塊（Roblox）風格
// Kitsune Of Runes（Rare）、Gem Dragon（Rare）、Dreadscale（Common）、Uncoiled Armadillo（Epic）、Citadel Snail（Epic）
// 全部面向 -z。每個回傳 Group：userData.animate(time, moving)、userData.height、userData.move

import * as THREE from 'three';
import { box, pivot, material } from './modelKit.js';

// 會閃嘅發光物料：每隻寵物自己一份（咁先可以自己一閃一閃）
const glowMat = (color, k = 1.3) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4 });
// 發光方塊（用自己份物料）
function glowBox(parent, w, h, d, m, x, y, z, round = 0.2) {
  const mesh = box(parent, w, h, d, 0xffffff, x, y, z, round);
  mesh.material = m;
  return mesh;
}
// 圓錐尖刺（可以揀色、揀物料）
function cone(parent, r, h, mOrColor, x, y, z, rx = 0, rz = 0, seg = 5) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mOrColor.isMaterial ? mOrColor : material(mOrColor, { flatShading: true }));
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, rz);
  m.castShadow = true;
  parent.add(m);
  return m;
}
// 四隻腳行路
function walkLegs(legs, t, moving, speed = 7, amp = 0.5) {
  const sw = Math.sin(t * speed) * amp * moving;
  legs.forEach((l, i) => (l.rotation.x = (i === 0 || i === 3 ? sw : -sw)));
}

// ================= Kitsune Of Runes（Rare）：深藍色方塊狐狸、好多條尾打開似扇、粉紅色符文發光 =================
export function buildKitsuneModel() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const NAVY = 0x1f2a5c;
  const NAVY2 = 0x2c3a7a;
  const DARK = 0x141a3a;
  const rune = glowMat(0xff3dbe, 1.4);
  // 身
  const body = pivot(root, 0, 0.95, 0);
  box(body, 0.9, 0.7, 1.5, NAVY, 0, 0, 0);
  box(body, 0.92, 0.25, 1.2, NAVY2, 0, 0.32, 0.05); // 背脊
  for (let i = 0; i < 4; i++) box(body, 0.5, 0.18, 0.12, NAVY2, 0, 0.45, -0.5 + i * 0.32, 0.3); // 背上方塊毛
  for (const s of [-1, 1]) {
    glowBox(body, 0.04, 0.28, 0.28, rune, s * 0.46, 0.02, -0.25); // 身兩邊嘅符文
    glowBox(body, 0.04, 0.12, 0.5, rune, s * 0.46, -0.15, 0.3);
  }
  // 頭（尖嘴 + 大耳）
  const head = pivot(root, 0, 1.45, -0.85);
  box(head, 0.72, 0.6, 0.62, NAVY, 0, 0, 0);
  box(head, 0.4, 0.3, 0.45, NAVY2, 0, -0.12, -0.45); // 嘴
  box(head, 0.14, 0.1, 0.08, DARK, 0, -0.04, -0.7); // 鼻
  for (const s of [-1, 1]) {
    const ear = pivot(head, s * 0.24, 0.3, 0.05);
    cone(ear, 0.17, 0.55, NAVY, 0, 0.25, 0, 0, s * -0.2, 4);
    glowBox(ear, 0.06, 0.2, 0.03, rune, 0, 0.18, -0.1);
    glowBox(head, 0.16, 0.08, 0.03, rune, s * 0.18, 0.08, -0.32); // 發光眼
    glowBox(head, 0.03, 0.18, 0.02, rune, s * 0.3, -0.05, -0.32); // 面上符文
  }
  glowBox(head, 0.12, 0.12, 0.02, rune, 0, 0.22, -0.32, 0.1); // 額頭菱形
  // 四隻腳
  const legs = [[-0.3, -0.5], [0.3, -0.5], [-0.3, 0.5], [0.3, 0.5]].map(([x, z]) => {
    const p = pivot(root, x, 0.75, z);
    box(p, 0.24, 0.65, 0.26, NAVY, 0, -0.32, 0);
    box(p, 0.28, 0.12, 0.34, DARK, 0, -0.66, -0.04);
    glowBox(p, 0.03, 0.2, 0.08, rune, x > 0 ? 0.13 : -0.13, -0.35, 0);
    return p;
  });
  // 七條尾：由屁股向後向上打開似扇
  const tails = [];
  const N = 7;
  for (let i = 0; i < N; i++) {
    const a = ((i / (N - 1)) - 0.5) * 2.6; // -1.3 … 1.3（左右，打開似扇）
    const base = pivot(root, 0, 1.15, 0.72);
    base.rotation.set(-0.85 - (1 - Math.abs(a) / 1.3) * 0.35, a, 0); // 先向左右打開（y），再向上抬（x）→ 似把扇
    const s1 = pivot(base, 0, 0, 0);
    box(s1, 0.26, 0.26, 0.7, NAVY, 0, 0, 0.35);
    const s2 = pivot(s1, 0, 0, 0.68);
    box(s2, 0.38, 0.36, 0.75, NAVY2, 0, 0, 0.37);
    glowBox(s2, 0.4, 0.06, 0.2, rune, 0, 0.16, 0.35);
    glowBox(s2, 0.06, 0.2, 0.2, rune, 0.2, 0, 0.5);
    const s3 = pivot(s2, 0, 0, 0.72);
    box(s3, 0.3, 0.28, 0.6, NAVY, 0, 0, 0.3);
    glowBox(s3, 0.18, 0.18, 0.18, rune, 0, 0, 0.66, 0.15); // 尾尖發光
    tails.push({ base, s1, s2, s3, a, i });
  }
  g.userData.animate = (t, moving) => {
    walkLegs(legs, t, moving, 8, 0.55);
    for (const tl of tails) {
      const w = Math.sin(t * 2.2 + tl.i * 0.6);
      tl.base.rotation.y = tl.a + w * 0.08;
      tl.s2.rotation.x = -0.25 + w * 0.15;
      tl.s3.rotation.x = -0.3 + Math.sin(t * 2.2 + tl.i * 0.6 + 0.8) * 0.2;
    }
    head.rotation.y = Math.sin(t * 0.8) * 0.15;
    rune.emissiveIntensity = 1.1 + Math.sin(t * 3) * 0.6;
    body.position.y = 0.95 + Math.abs(Math.sin(t * 8)) * 0.04 * moving;
  };
  g.userData.height = 3.0;
  g.userData.move = 'walk';
  return g;
}

// ================= Gem Dragon（Rare）：白色水晶兩腳企嘅龍、心口藍色 V 字發光、藍色斑點 =================
export function buildGemDragonModel() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const CRYS = 0xe8f1ff;
  const CRYS2 = 0xc9d8f2;
  const DARK = 0x2b3d63;
  const blue = glowMat(0x2ec5ff, 1.5);
  const crysM = new THREE.MeshStandardMaterial({ color: CRYS, roughness: 0.15, metalness: 0.15, flatShading: true });
  // 兩隻粗腳
  const legs = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.38, 1.05, 0.15);
    box(p, 0.42, 0.6, 0.48, CRYS, 0, -0.25, 0);
    box(p, 0.34, 0.5, 0.36, CRYS2, 0, -0.7, 0.08);
    box(p, 0.5, 0.15, 0.62, DARK, 0, -0.98, -0.1);
    for (const x of [-0.15, 0, 0.15]) cone(p, 0.06, 0.18, 0x1a2a4a, x, -0.98, -0.44, -Math.PI / 2); // 爪
    glowBox(p, 0.06, 0.25, 0.04, blue, s * 0.12, -0.25, -0.25);
    return p;
  });
  // 身（企直少少向前傾）
  const torso = pivot(root, 0, 1.55, 0);
  torso.rotation.x = 0.15;
  box(torso, 0.95, 1.2, 0.7, CRYS, 0, 0, 0);
  box(torso, 0.7, 0.9, 0.08, DARK, 0, 0, -0.36); // 心口深色
  // 心口 V 字藍光
  for (const s of [-1, 1]) {
    const v = glowBox(torso, 0.1, 0.55, 0.05, blue, s * 0.14, 0.05, -0.41);
    v.rotation.z = s * 0.5;
  }
  glowBox(torso, 0.14, 0.14, 0.05, blue, 0, -0.3, -0.41);
  // 水晶背刺
  const spikes = [];
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.16 + (i % 2) * 0.05), crysM);
    c.scale.y = 2;
    c.position.set(0, 0.5 - i * 0.28, 0.38);
    c.rotation.x = 0.4;
    torso.add(c);
    spikes.push(c);
  }
  // 手（爪）
  const arms = [-1, 1].map((s) => {
    const p = pivot(torso, s * 0.55, 0.35, -0.05);
    box(p, 0.28, 0.6, 0.28, CRYS, 0, -0.25, -0.05);
    box(p, 0.24, 0.45, 0.24, CRYS2, 0, -0.62, -0.18);
    for (const x of [-0.08, 0.08]) cone(p, 0.05, 0.2, 0x1a2a4a, x, -0.9, -0.25, Math.PI);
    glowBox(p, 0.04, 0.2, 0.1, blue, s * 0.15, -0.2, -0.05);
    return p;
  });
  // 頭：長嘴 + 水晶冠 + 藍眼
  const neck = pivot(torso, 0, 0.6, -0.1);
  const head = pivot(neck, 0, 0.35, -0.2);
  box(head, 0.6, 0.5, 0.65, CRYS, 0, 0, 0);
  box(head, 0.45, 0.28, 0.5, CRYS2, 0, -0.08, -0.5); // 上嘴
  const jaw = pivot(head, 0, -0.22, -0.2);
  box(jaw, 0.4, 0.12, 0.6, DARK, 0, 0, -0.25); // 下嘴
  for (let i = 0; i < 4; i++) cone(head, 0.03, 0.08, 0xffffff, -0.15 + i * 0.1, -0.24, -0.6, Math.PI);
  for (const s of [-1, 1]) {
    glowBox(head, 0.16, 0.08, 0.04, blue, s * 0.18, 0.1, -0.33);
    const horn = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), crysM);
    horn.scale.set(0.7, 2.4, 0.7);
    horn.position.set(s * 0.22, 0.4, 0.15);
    horn.rotation.set(-0.6, 0, s * -0.4);
    head.add(horn);
  }
  // 尾（後面拖地）
  const tail = pivot(root, 0, 1.15, 0.45);
  const tsegs = [];
  let parent = tail;
  for (let i = 0; i < 4; i++) {
    const seg = pivot(parent, 0, 0, i ? 0.5 : 0);
    box(seg, 0.4 - i * 0.07, 0.36 - i * 0.06, 0.55, i % 2 ? CRYS2 : CRYS, 0, 0, 0.25);
    if (i % 2) glowBox(seg, 0.08, 0.08, 0.2, blue, 0, 0.18 - i * 0.03, 0.25);
    seg.rotation.x = 0.18;
    tsegs.push(seg);
    parent = seg;
  }
  const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), crysM);
  tip.scale.z = 2;
  tip.position.z = 0.65;
  parent.add(tip);
  g.userData.animate = (t, moving) => {
    const sw = Math.sin(t * 7) * 0.55 * moving;
    legs[0].rotation.x = sw;
    legs[1].rotation.x = -sw;
    arms[0].rotation.x = -sw * 0.5 - 0.2;
    arms[1].rotation.x = sw * 0.5 - 0.2;
    tsegs.forEach((s, i) => (s.rotation.y = Math.sin(t * 2 + i * 0.6) * 0.18));
    jaw.rotation.x = Math.max(0, Math.sin(t * 1.3)) * 0.35;
    head.rotation.y = Math.sin(t * 0.7) * 0.25;
    blue.emissiveIntensity = 1.3 + Math.sin(t * 4) * 0.5;
    spikes.forEach((c, i) => (c.rotation.y = t * 0.8 + i));
    root.position.y = Math.abs(Math.sin(t * 7)) * 0.05 * moving;
  };
  g.userData.height = 3.3;
  g.userData.move = 'walk';
  return g;
}

// ================= Dreadscale（Common）：深紅色好多尖刺嘅獸、黑色護甲帶、螢光綠花紋 =================
export function buildDreadscaleModel() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const RED = 0xc2185b;
  const RED2 = 0x9c1447;
  const TAN = 0xc9b28d;
  const DARK = 0x1c1c22;
  const green = glowMat(0x39ff14, 1.3);
  const pink = glowMat(0xff4fd8, 1.4);
  const body = pivot(root, 0, 1.0, 0);
  box(body, 1.25, 0.95, 1.7, TAN, 0, 0, 0);
  box(body, 1.3, 0.5, 1.5, RED, 0, 0.35, 0.05); // 背甲
  for (const z of [-0.45, 0.15, 0.6]) box(body, 1.32, 0.18, 0.2, DARK, 0, 0.2, z, 0.3); // 黑色護甲帶
  for (const s of [-1, 1]) {
    const l1 = glowBox(body, 0.04, 0.08, 0.7, green, s * 0.66, 0.38, -0.1);
    l1.rotation.x = 0.2;
    glowBox(body, 0.04, 0.35, 0.08, green, s * 0.66, 0.1, 0.35);
  }
  glowBox(body, 0.3, 0.05, 0.3, pink, 0, -0.48, -0.5); // 肚粉紅光
  // 背上尖刺
  const backSpikes = [];
  for (let i = 0; i < 7; i++) {
    const s = cone(body, 0.14, 0.55 + (i % 2) * 0.2, i % 3 === 0 ? RED2 : RED, ((i % 3) - 1) * 0.3, 0.75, -0.6 + i * 0.2, -0.3, ((i % 3) - 1) * 0.3, 4);
    backSpikes.push(s);
  }
  // 頭：大頭、尖刺冠、粉紅發光眼
  const head = pivot(root, 0, 1.45, -1.0);
  box(head, 0.95, 0.75, 0.8, RED, 0, 0, 0);
  box(head, 0.7, 0.4, 0.5, RED2, 0, -0.15, -0.5); // 嘴
  box(head, 0.62, 0.12, 0.4, TAN, 0, -0.38, -0.45); // 下巴
  for (let i = 0; i < 5; i++) cone(head, 0.04, 0.12, 0xffffff, -0.22 + i * 0.11, -0.3, -0.72, Math.PI);
  for (const s of [-1, 1]) {
    glowBox(head, 0.2, 0.09, 0.04, pink, s * 0.24, 0.12, -0.41);
    box(head, 0.28, 0.08, 0.06, DARK, s * 0.24, 0.24, -0.41).rotation.z = s * 0.4; // 嬲嬲眉
    for (let k = 0; k < 3; k++) cone(head, 0.12, 0.6 - k * 0.1, k % 2 ? RED2 : RED, s * (0.3 + k * 0.12), 0.45 + k * 0.05, 0.15 + k * 0.15, -0.8, s * -0.5, 4); // 冠
  }
  cone(head, 0.16, 0.8, RED, 0, 0.6, 0.1, -0.9, 0, 4);
  glowBox(head, 0.06, 0.06, 0.35, green, 0, 0.38, -0.2);
  // 四隻腳：黑色護甲
  const legs = [[-0.45, -0.55], [0.45, -0.55], [-0.45, 0.6], [0.45, 0.6]].map(([x, z]) => {
    const p = pivot(root, x, 0.8, z);
    box(p, 0.42, 0.55, 0.45, RED, 0, -0.22, 0);
    box(p, 0.46, 0.18, 0.5, DARK, 0, -0.5, 0, 0.3); // 護腕
    box(p, 0.5, 0.18, 0.58, DARK, 0, -0.72, -0.06);
    glowBox(p, 0.04, 0.12, 0.2, green, x > 0 ? 0.24 : -0.24, -0.5, 0);
    for (const cx of [-0.14, 0, 0.14]) cone(p, 0.05, 0.14, 0xeeeeee, cx, -0.75, -0.38, -Math.PI / 2);
    return p;
  });
  // 尾（有刺）
  const tail = pivot(root, 0, 1.15, 0.85);
  box(tail, 0.4, 0.35, 0.8, RED, 0, 0, 0.4);
  cone(tail, 0.15, 0.5, RED2, 0, 0.25, 0.6, -0.5, 0, 4);
  glowBox(tail, 0.05, 0.05, 0.5, green, 0, 0.19, 0.35);
  g.userData.animate = (t, moving) => {
    walkLegs(legs, t, moving, 6.5, 0.5);
    tail.rotation.y = Math.sin(t * 2.5) * 0.3;
    head.rotation.x = Math.sin(t * 1.1) * 0.06;
    green.emissiveIntensity = 1.0 + Math.sin(t * 3.5) * 0.6;
    pink.emissiveIntensity = 1.2 + Math.sin(t * 5) * 0.4;
    body.position.y = 1.0 + Math.sin(t * 2) * 0.02 + Math.abs(Math.sin(t * 6.5)) * 0.04 * moving;
    backSpikes.forEach((s, i) => (s.scale.y = 1 + Math.sin(t * 3 + i) * 0.05));
  };
  g.userData.height = 2.4;
  g.userData.move = 'walk';
  return g;
}

// ================= Uncoiled Armadillo（Epic）：一節節黑色護甲、橙色發光尖刺、背上有座燈塔 =================
export function buildArmadilloModel() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const TAN = 0xd2c19d;
  const TAN2 = 0xb9a67f;
  const ARM = 0x2a2a2f;
  const ARM2 = 0x3c3c44;
  const fire = glowMat(0xff9100, 1.6);
  const windowM = glowMat(0xffb300, 2);
  const body = pivot(root, 0, 0.95, 0);
  // 一節節護甲（似捲起嘅犰狳）
  const bands = 7;
  for (let i = 0; i < bands; i++) {
    const z = -0.9 + i * 0.3;
    const h = 0.9 - Math.abs(i - 3) * 0.06;
    box(body, 1.2, h, 0.3, i % 2 ? ARM : ARM2, 0, 0.05, z, 0.3);
    box(body, 1.24, 0.08, 0.06, TAN2, 0, 0.05 + h / 2 - 0.02, z + 0.14, 0.3); // 米色邊
    // 兩邊橙色發光尖刺
    for (const s of [-1, 1]) cone(body, 0.09, 0.32, fire, s * 0.62, 0.15, z, 0, s * -1.2, 4);
    if (i % 2 === 0) cone(body, 0.1, 0.38, fire, 0, 0.05 + h / 2 + 0.15, z, 0, 0, 4); // 背脊尖刺
  }
  box(body, 1.0, 0.25, 2.0, TAN, 0, -0.42, 0); // 肚
  // 頭：尖嘴、米色、有護甲片
  const head = pivot(root, 0, 0.95, -1.15);
  box(head, 0.6, 0.55, 0.5, TAN, 0, 0, 0);
  box(head, 0.36, 0.32, 0.55, TAN2, 0, -0.08, -0.45); // 長嘴
  box(head, 0.16, 0.12, 0.08, 0x3e2723, 0, -0.04, -0.74);
  box(head, 0.64, 0.2, 0.42, ARM, 0, 0.3, 0.02, 0.3); // 頭甲
  for (const s of [-1, 1]) {
    box(head, 0.1, 0.1, 0.04, 0x111111, s * 0.18, 0.08, -0.26);
    glowBox(head, 0.04, 0.04, 0.02, fire, s * 0.18 + 0.02, 0.1, -0.285);
    cone(head, 0.07, 0.25, fire, s * 0.22, 0.44, 0.05, 0, s * -0.3, 4);
  }
  // 四隻短腳（護甲）
  const legs = [[-0.4, -0.6], [0.4, -0.6], [-0.4, 0.6], [0.4, 0.6]].map(([x, z]) => {
    const p = pivot(root, x, 0.55, z);
    box(p, 0.3, 0.4, 0.32, TAN2, 0, -0.18, 0);
    box(p, 0.34, 0.14, 0.4, ARM, 0, -0.42, -0.04, 0.3);
    for (const cx of [-0.09, 0.09]) cone(p, 0.04, 0.12, 0x5d4037, cx, -0.45, -0.26, -Math.PI / 2);
    return p;
  });
  // 一節節尾
  const tail = pivot(root, 0, 0.8, 1.15);
  let tp = tail;
  const tsegs = [];
  for (let i = 0; i < 4; i++) {
    const seg = pivot(tp, 0, 0, i ? 0.3 : 0);
    box(seg, 0.3 - i * 0.05, 0.26 - i * 0.04, 0.32, i % 2 ? ARM : ARM2, 0, 0, 0.15, 0.3);
    if (i < 3) cone(seg, 0.05, 0.18, fire, 0, 0.18 - i * 0.03, 0.15, 0, 0, 4);
    seg.rotation.x = 0.12;
    tsegs.push(seg);
    tp = seg;
  }
  // 背上嘅燈塔：深色石塔 + 發光窗 + 頂燈
  const tower = pivot(body, 0, 0.55, 0.1);
  box(tower, 0.62, 0.15, 0.62, ARM, 0, 0.05, 0, 0.2);
  box(tower, 0.5, 1.2, 0.5, ARM2, 0, 0.7, 0, 0.12);
  for (const y of [0.45, 0.9]) {
    for (const [x, z] of [[0, -0.26], [0.26, 0], [-0.26, 0]]) glowBox(tower, x ? 0.03 : 0.16, 0.2, x ? 0.16 : 0.03, windowM, x, y, z, 0.1);
  }
  box(tower, 0.66, 0.12, 0.66, ARM, 0, 1.36, 0, 0.2);
  const lamp = glowBox(tower, 0.36, 0.36, 0.36, windowM, 0, 1.6, 0, 0.15);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) box(tower, 0.06, 0.4, 0.06, ARM, x, 1.6, z, 0.2);
  box(tower, 0.52, 0.1, 0.52, ARM, 0, 1.84, 0, 0.2);
  cone(tower, 0.3, 0.35, ARM2, 0, 2.05, 0, 0, 0, 4);
  g.userData.animate = (t, moving) => {
    walkLegs(legs, t, moving, 9, 0.45);
    tsegs.forEach((s, i) => (s.rotation.y = Math.sin(t * 2 + i * 0.7) * 0.15));
    head.rotation.x = Math.sin(t * 1.5) * 0.08;
    // 燈塔一閃一閃（似火咁跳）
    const flick = 1.6 + Math.sin(t * 13) * 0.3 + Math.sin(t * 7.3) * 0.3;
    windowM.emissiveIntensity = flick;
    lamp.rotation.y = t * 1.5;
    fire.emissiveIntensity = 1.4 + Math.sin(t * 4) * 0.4;
    body.position.y = 0.95 + Math.abs(Math.sin(t * 9)) * 0.03 * moving;
  };
  g.userData.height = 3.1;
  g.userData.move = 'walk';
  return g;
}

// ================= Citadel Snail（Epic）：殼上面有座城堡（深色石塔 + 粉紅尖頂）、殼上有隻紫色發光眼、粉紅色黏液 =================
export function buildCitadelSnailModel() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const SKIN = 0xd9b98a;
  const SKIN2 = 0xc4a172;
  const SHELL = 0xb59a6a;
  const MOSS = 0x7a8f3a;
  const STONE = 0x3a3a42;
  const STONE2 = 0x52525c;
  const PINK = 0xff4fb3;
  const purple = glowMat(0xb000ff, 1.8);
  const slimeM = new THREE.MeshStandardMaterial({ color: PINK, emissive: PINK, emissiveIntensity: 0.5, roughness: 0.1, metalness: 0.1 });
  // 身：長長一條貼地
  const body = pivot(root, 0, 0, 0);
  box(body, 0.85, 0.45, 2.2, SKIN, 0, 0.25, 0, 0.3);
  box(body, 0.95, 0.12, 2.3, SKIN2, 0, 0.06, 0, 0.3);
  // 頭 + 兩支眼柄
  const head = pivot(root, 0, 0.55, -1.0);
  box(head, 0.7, 0.55, 0.5, SKIN, 0, 0, 0, 0.35);
  box(head, 0.4, 0.1, 0.04, 0x6d4c41, 0, -0.1, -0.26); // 口
  const stalks = [-1, 1].map((s) => {
    const p = pivot(head, s * 0.18, 0.25, 0);
    box(p, 0.1, 0.6, 0.1, SKIN2, 0, 0.3, 0);
    box(p, 0.22, 0.22, 0.22, 0xfff3e0, 0, 0.65, 0, 0.45);
    box(p, 0.12, 0.12, 0.04, 0x4a148c, 0, 0.65, -0.11, 0.4);
    return p;
  });
  // 殼：一嚿圓圓（方塊疊）+ 深色紋 + 青苔
  const shell = pivot(root, 0, 0.5, 0.25);
  box(shell, 1.3, 1.25, 1.5, SHELL, 0, 0.62, 0, 0.35);
  box(shell, 1.36, 1.0, 1.0, SKIN2, 0, 0.62, 0, 0.35);
  box(shell, 1.4, 0.75, 0.6, STONE2, 0, 0.62, 0, 0.35); // 中間深色螺紋
  for (const [x, y, z] of [[0.5, 1.2, -0.5], [-0.55, 0.3, 0.55], [0.6, 0.2, 0.4], [-0.4, 1.25, 0.6]]) box(shell, 0.4, 0.15, 0.4, MOSS, x, y, z, 0.3);
  // 殼兩邊嘅紫色大眼（發光）
  for (const s of [-1, 1]) {
    box(shell, 0.06, 0.55, 0.55, STONE, s * 0.7, 0.62, 0, 0.3);
    glowBox(shell, 0.07, 0.38, 0.38, purple, s * 0.72, 0.62, 0, 0.4);
    box(shell, 0.08, 0.16, 0.16, 0x111111, s * 0.74, 0.62, 0, 0.4);
  }
  // 城堡：幾座深色石塔 + 粉紅尖頂 + 城垛
  const castle = pivot(shell, 0, 1.25, 0);
  box(castle, 0.9, 0.35, 0.9, STONE, 0, 0.18, 0, 0.15);
  for (let i = 0; i < 4; i++) box(castle, 0.16, 0.14, 0.16, STONE2, -0.36 + i * 0.24, 0.42, -0.4, 0.1); // 城垛
  const towers = [[0, 0, 1.0, 0.36], [-0.32, 0.25, 0.7, 0.26], [0.32, 0.25, 0.7, 0.26], [-0.3, -0.3, 0.55, 0.22], [0.3, -0.3, 0.55, 0.22]];
  for (const [x, z, h, w] of towers) {
    box(castle, w, h, w, STONE2, x, 0.35 + h / 2, z, 0.1);
    glowBox(castle, 0.07, 0.12, 0.02, purple, x, 0.35 + h * 0.6, z - w / 2 - 0.01, 0.1); // 窗
    cone(castle, w * 0.75, w * 1.3, PINK, x, 0.35 + h + w * 0.65, z, 0, 0, 6);
    box(castle, 0.03, 0.2, 0.03, 0x111111, x, 0.35 + h + w * 1.3 + 0.08, z, 0.1);
  }
  // 黏液：身下面同頭度滴落嚟
  const drips = [];
  for (const [x, z, h] of [[-0.3, -0.9, 0.3], [0.25, -0.7, 0.22], [0.42, -1.05, 0.18], [-0.45, 0.2, 0.25], [0.4, 0.6, 0.2]]) {
    const d = box(body, 0.12, h, 0.12, 0xffffff, x, 0.05, z, 0.45);
    d.material = slimeM;
    d.userData.h = h;
    drips.push(d);
  }
  const trail = box(body, 0.7, 0.03, 1.4, 0xffffff, 0, 0.015, 1.4, 0.3);
  trail.material = new THREE.MeshStandardMaterial({ color: PINK, transparent: true, opacity: 0.45, roughness: 0.05 });
  g.userData.animate = (t, moving) => {
    // 慢慢滑：身一伸一縮
    const k = Math.sin(t * 3) * 0.04 * (0.4 + moving);
    body.scale.z = 1 + k;
    head.position.z = -1.0 - k * 1.5;
    stalks.forEach((s, i) => {
      s.rotation.z = Math.sin(t * 2.4 + i * 1.5) * 0.25;
      s.rotation.x = Math.sin(t * 1.8 + i) * 0.15;
    });
    drips.forEach((d, i) => {
      const p = (t * 0.6 + i * 0.3) % 1;
      d.scale.y = 0.6 + p * 1.4;
      d.position.y = 0.05 - p * 0.04;
    });
    purple.emissiveIntensity = 1.4 + Math.sin(t * 2) * 0.6;
    shell.rotation.z = Math.sin(t * 1.2) * 0.03;
    trail.visible = moving > 0;
  };
  g.userData.height = 3.4;
  g.userData.move = 'walk';
  return g;
}
