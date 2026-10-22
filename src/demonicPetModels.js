// 😈 Witch Tower 獎品寵物模型（小朋友 Issue #11）
//   Demonic Chest：Imp（Common）、Toro（Rare）、Demonic Whale（Epic）、Skeleton Horseman（Legendary）、Lava Cerberus（Mythic）
//   新蛋：🌋 Lava Bloom（Legendary）、🎃 Pumpkgrim（Mythic，南瓜頭死神）+ 兩款蛋（buildDemonicEgg）
//   😈 Demonic Chest 個箱（buildDemonicChest，chests.js 用）
// 風格：同 echoPetModels.js／meteorPetModels.js 一樣（圓角方塊 + 大眼 + 深色描邊），主題係「可愛小惡魔」：
//   炭黑／深紅身 + 發光熔岩裂紋 + 細細對角 + 火，大眼、面紅、細牙仔；唔恐怖、唔血腥
// 全部面向 -z；回傳 Group：userData.animate(time, moving)、userData.height、userData.move

import * as THREE from 'three';
import { V, M, GLOW, B, S, pivot, cone, cyl, torus, limb, tube, bigEyes, smile, shape, rig, outline, pumpkin, carvedFace } from './echoPetModels.js';
import { glowMat, crack } from './meteorPetModels.js';
import { rarityInfo } from './data/balance.js';

const PI = Math.PI;
// 顏色
export const CHAR = 0x2b1a1d; // 炭黑（帶少少紅）
export const CHAR2 = 0x1a0f12;
export const RED = 0xd32f2f;
export const RED2 = 0x9a1b1b;
export const LAVA = 0xff6d00;
export const EMBER = 0xffc400;
export const FIRE = 0xff3d00;
const HORN = 0xffe0b2;
const BONE = 0xf5ecd7;
const PINK = 0xff8a80;
const GOLD = 0xffd740;

const additive = (c, o = 0.3) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
// 每隻寵物自己一套火材質（一齊閃）
const fireSet = () => [glowMat(FIRE, 2.2, { transparent: true, opacity: 0.9 }), glowMat(LAVA, 2.8, { transparent: true, opacity: 0.92 }), glowMat(EMBER, 3.4)];

// 😈 細細隻彎角（底淺色，尖發光橙）；side = -1 左 / 1 右
export function horn(parent, x, y, z, s, side, { color = HORN, tip = LAVA, tipMat = null } = {}) {
  const p = pivot(parent, x, y, z);
  p.rotation.z = side * -0.35;
  cone(p, 0.07 * s, 0.17 * s, color, 0, 0.08 * s, 0, { roughness: 0.4 }, 12);
  const t = pivot(p, 0, 0.15 * s, 0);
  t.rotation.z = side * -0.65;
  cone(t, 0.045 * s, 0.15 * s, tip, 0, 0.065 * s, 0, tipMat || { ...GLOW(tip, 1.5) }, 10);
  return p;
}
// 🔥 一撮火（3 層：外紅、中橙、芯黃），向 +y；回傳 pivot（animate 用 scale.y 閃）
export function fireTuft(parent, x, y, z, s, mats) {
  const p = pivot(parent, x, y, z);
  [[0.13, 0.34, 0], [0.09, 0.26, 0.015], [0.055, 0.17, 0.03]].forEach(([r, h, dy], i) => {
    const zz = -i * 0.012 * s;
    S(p, r * s, r * 1.25 * s, r * s, LAVA, 0, (dy + r * 1.1) * s, zz, mats[i], { lo: true }); // 圓肚
    cone(p, r * 0.82 * s, h * 0.75 * s, LAVA, 0, (dy + r * 1.3 + h * 0.3) * s, zz, mats[i], 12); // 火尖
  });
  const glow = new THREE.Mesh(GLOW_BALL, FIRE_GLOW);
  glow.scale.setScalar(0.24 * s);
  glow.position.y = 0.18 * s;
  p.add(glow);
  return p;
}
const GLOW_BALL = new THREE.SphereGeometry(1, 12, 10);
const FIRE_GLOW = new THREE.MeshBasicMaterial({ color: 0xff6d00, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
// 可愛惡魔面：發光琥珀色大眼 + 笑口 + 一隻細牙 + 面紅
function demonFace(head, { dx, y, z, r, mouthY, mouthW = 0.05, blushX, iris = EMBER, fang = true }) {
  const eyes = bigEyes(head, dx, y, z, r, iris, { glow: true, glowI: 1.1 });
  smile(head, 0, mouthY, z - 0.005, mouthW, 0x2a0a0a, {}, 2.2);
  if (fang) {
    const f = cone(head, mouthW * 0.28, mouthW * 0.7, 0xffffff, mouthW * 0.5, mouthY - mouthW * 0.82, z - 0.012, { roughness: 0.2 }, 8);
    f.rotation.x = PI;
  }
  for (const s of [-1, 1]) S(head, r * 0.55, r * 0.32, r * 0.15, PINK, s * (blushX ?? dx * 1.45), y - r * 1.15, z + r * 0.1, { transparent: true, opacity: 0.8, emissive: PINK, emissiveIntensity: 0.35 }, { lo: true });
  return eyes;
}
// 🦇 細細蝙蝠翼（喺 XY 平面，向外伸）；side = -1 左 / 1 右
const WING = [[0, 0], [0.32, 0.3], [0.72, 0.4], [0.66, 0.14], [0.54, 0.04], [0.47, -0.12], [0.32, -0.04], [0.22, -0.17], [0.1, -0.05]];
export function batWing(parent, x, y, z, s, side, color = CHAR2, boneColor = RED2, { membrane = {}, bone = {} } = {}) {
  const p = pivot(parent, x, y, z);
  const w = shape(p, WING, 0.03, color, { roughness: 0.55, side: THREE.DoubleSide, ...membrane }, { smooth: false, key: 'dWing' });
  w.scale.set(side * s, s, s);
  outline(w, 0.04);
  limb(p, V(0, 0, 0), V(side * 0.72 * s, 0.4 * s, 0), 0.025 * s, boneColor, bone);
  limb(p, V(side * 0.36 * s, 0.22 * s, 0), V(side * 0.47 * s, -0.12 * s, 0), 0.016 * s, boneColor, bone);
  limb(p, V(side * 0.3 * s, 0.18 * s, 0), V(side * 0.22 * s, -0.17 * s, 0), 0.014 * s, boneColor, bone);
  return p;
}
// 熔岩裂紋（身側，rotation.y = PI/2 貼住 x 面）
function sideCracks(parent, xFace, list, mat) {
  for (const [y, z, len, rz] of list) crack(parent, xFace, y, z, len, rz, mat, 0.026).rotation.y = PI / 2;
}
// 光暈
function auraBall(parent, sx, sy, sz, color, o = 0.08) {
  const a = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), additive(color, o));
  a.scale.set(sx, sy, sz);
  parent.add(a);
  return a;
}
// 飄上去嘅火星（細方粒）：回傳 tick(t)
function embers(parent, n, w, h, y0, mat) {
  const bits = [];
  for (let i = 0; i < n; i++) {
    const m = B(parent, 0.045, 0.045, 0.045, EMBER, 0, 0, 0, mat, { r: 0.3 });
    m.castShadow = false;
    bits.push({ m, a: (i / n) * PI * 2 + i, k: i / n, r: w * (0.5 + ((i * 7) % 5) / 10) });
  }
  return (t) => {
    for (const b of bits) {
      const k = (b.k + t * 0.35) % 1;
      b.m.position.set(Math.cos(b.a + t * 0.5) * b.r, y0 + k * h, Math.sin(b.a + t * 0.5) * b.r);
      b.m.scale.setScalar(Math.max(0.01, 1 - k));
      b.m.rotation.set(t * 3 + b.a, t * 2, 0);
    }
  };
}

// =============== 😈 Imp（Common）===============
// 紅色細小鬼：大頭、細角、尖耳、黑色蝙蝠翼仔、尾巴尖係發光箭咀、頭頂一撮細火
function imp() {
  const g = new THREE.Group();
  const root = pivot(g);
  const lavaM = glowMat(LAVA, 2.2);
  const fire = fireSet();
  const body = pivot(root, 0, 0.42, 0);
  B(body, 0.4, 0.34, 0.32, RED2, 0, 0, 0, {}, { line: 0.08, r: 0.4 });
  S(body, 0.12, 0.11, 0.04, 0xff8a65, 0, -0.02, -0.16, {}, { lo: true }); // 肚
  // 腳（黑色細蹄）
  const legs = [-1, 1].map((s) => {
    const l = pivot(body, s * 0.11, -0.14, 0);
    B(l, 0.13, 0.18, 0.14, RED2, 0, -0.08, 0, {}, { line: 0.08, r: 0.4 });
    B(l, 0.15, 0.07, 0.17, CHAR, 0, -0.18, -0.01, {}, { r: 0.35 });
    return l;
  });
  const arms = [-1, 1].map((s) => {
    const a = pivot(body, s * 0.24, 0.06, 0);
    S(a, 0.07, 0.11, 0.07, RED, s * 0.03, -0.07, 0, {}, { line: 0.08 });
    return a;
  });
  // 頭
  const head = pivot(body, 0, 0.36, 0);
  B(head, 0.64, 0.54, 0.54, RED, 0, 0, 0, {}, { line: 0.08, r: 0.38 });
  B(head, 0.5, 0.1, 0.44, 0xef5350, 0, 0.24, 0, {}, { r: 0.4 });
  const eyes = demonFace(head, { dx: 0.14, y: 0.02, z: -0.27, r: 0.1, mouthY: -0.13, mouthW: 0.05 });
  for (const s of [-1, 1]) {
    horn(head, s * 0.18, 0.24, 0.02, 0.9, s);
    const ear = cone(head, 0.06, 0.2, RED, s * 0.36, 0.02, 0.02, {}, 10);
    ear.rotation.z = s * -1.25;
  }
  const flame = fireTuft(head, 0, 0.27, 0.06, 0.55, fire);
  // 翼
  const wings = [-1, 1].map((s) => batWing(body, s * 0.1, 0.1, 0.17, 0.5, s));
  // 尾（彎彎 + 發光箭咀）
  const tail = pivot(body, 0, -0.08, 0.15);
  tube(tail, [V(0, 0, 0), V(0, -0.06, 0.18), V(0, 0.06, 0.34), V(0, 0.2, 0.36)], 0.025, RED2, {});
  const tip = pivot(tail, 0, 0.21, 0.36);
  cone(tip, 0.07, 0.12, LAVA, 0, 0.04, 0, lavaM, 4);
  return rig(g, root, {
    eyes, height: 1.15,
    tick(t, m) {
      const hop = Math.abs(Math.sin(t * 7)) * 0.08 * m;
      body.position.y = 0.42 + Math.sin(t * 2.2) * 0.03 + hop;
      body.rotation.z = Math.sin(t * 1.7) * 0.05;
      legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 7 + i * PI) * 0.5 * m));
      arms.forEach((a, i) => (a.rotation.z = (i ? 1 : -1) * (0.25 + Math.sin(t * 3 + i) * 0.25)));
      wings.forEach((w, i) => (w.rotation.y = (i ? -1 : 1) * (0.35 + Math.sin(t * 9) * 0.45)));
      tail.rotation.y = Math.sin(t * 2.5) * 0.4;
      head.rotation.z = Math.sin(t * 1.3) * 0.06;
      flame.scale.set(1, 0.85 + Math.sin(t * 11) * 0.18, 1);
      fire[1].emissiveIntensity = 2.5 + Math.sin(t * 8) * 0.5;
      lavaM.emissiveIntensity = 1.8 + Math.sin(t * 3) * 0.6;
    },
  });
}

// =============== 🐂 Toro（Rare）===============
// 熔岩公牛：炭黑身 + 熔岩裂紋、發光蹄、奶白色大角（尖發光）、金鼻環、背脊一排火、鼻孔噴火波波
function toro() {
  const g = new THREE.Group();
  const root = pivot(g);
  const lavaM = glowMat(LAVA, 2.2);
  const hoofM = glowMat(FIRE, 1.8);
  const fire = fireSet();
  const legs = [[-0.3, -0.45], [0.3, -0.45], [-0.3, 0.45], [0.3, 0.45]].map(([x, z]) => {
    const hip = pivot(root, x, 0.6, z);
    B(hip, 0.26, 0.5, 0.28, CHAR, 0, -0.25, 0, {}, { line: 0.07 });
    B(hip, 0.3, 0.12, 0.32, FIRE, 0, -0.52, 0, hoofM, { r: 0.3 });
    return hip;
  });
  const body = pivot(root, 0, 0.95, 0.05);
  B(body, 0.9, 0.72, 1.3, CHAR, 0, 0, 0, {}, { line: 0.05, r: 0.3 });
  B(body, 0.96, 0.6, 0.5, 0x3b2326, 0, 0.06, -0.38, {}, { r: 0.35 }); // 膊頭隆起
  B(body, 0.62, 0.12, 0.9, 0x4a2c30, 0, -0.32, 0.05, {}, { r: 0.4 }); // 肚
  sideCracks(body, 0.455, [[0.12, -0.25, 0.36, 0.5], [-0.08, 0.3, 0.3, -0.6], [0.18, 0.4, 0.2, 0.3]], lavaM);
  sideCracks(body, -0.455, [[0.05, -0.1, 0.4, -0.4], [-0.12, 0.42, 0.24, 0.5]], lavaM);
  crack(body, 0.1, 0.362, 0.1, 0.4, 0.3, lavaM, 0.026).rotation.x = PI / 2;
  // 背脊一排火
  const mane = [-0.45, -0.2, 0.05].map((z, i) => fireTuft(body, 0, 0.36, z, 0.8 - i * 0.12, fire));
  // 尾 + 火尾尖
  const tail = pivot(body, 0, 0.18, 0.66);
  limb(tail, V(0, 0, 0), V(0, -0.38, 0.12), 0.035, CHAR, {});
  const tailFire = fireTuft(tail, 0, -0.42, 0.13, 0.45, fire);
  tailFire.rotation.x = PI;
  // 頭
  const head = pivot(body, 0, 0.12, -0.78);
  B(head, 0.62, 0.56, 0.5, CHAR, 0, 0, 0, {}, { line: 0.06, r: 0.32 });
  B(head, 0.5, 0.3, 0.24, 0x5d4037, 0, -0.16, -0.25, {}, { line: 0.08, r: 0.4 }); // 鼻
  for (const s of [-1, 1]) S(head, 0.04, 0.03, 0.02, LAVA, s * 0.1, -0.13, -0.375, lavaM, { lo: true }); // 發光鼻孔
  const ring = torus(head, 0.07, 0.015, GOLD, 0, -0.26, -0.37, { metalness: 0.8, roughness: 0.25 });
  ring.rotation.x = 0.2;
  const eyes = demonFace(head, { dx: 0.16, y: 0.1, z: -0.255, r: 0.08, mouthY: -0.3, mouthW: 0.0001, blushX: 0.24, fang: false });
  // 大角（打橫向外再向上）
  for (const s of [-1, 1]) {
    const h = pivot(head, s * 0.3, 0.18, -0.05);
    h.rotation.z = s * -1.25;
    cone(h, 0.08, 0.26, HORN, 0, 0.12, 0, { roughness: 0.4 }, 12);
    const t2 = pivot(h, 0, 0.23, 0);
    t2.rotation.z = s * 1.0;
    cone(t2, 0.055, 0.22, HORN, 0, 0.1, 0, { roughness: 0.4 }, 12);
    cone(t2, 0.03, 0.09, LAVA, 0, 0.23, 0, lavaM, 10);
  }
  for (const s of [-1, 1]) B(head, 0.14, 0.08, 0.14, CHAR2, s * 0.36, 0.05, 0.08, {}, { line: 0.1, r: 0.4 }).rotation.z = s * 0.4; // 耳
  // 鼻孔噴出嚟嘅火波波（循環向前飛、變大、淡出）
  const puffs = [0, 1, 2, 3].map((i) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), additive(i % 2 ? LAVA : EMBER, 0.6));
    head.add(p);
    return { p, k: i / 4, s: i % 2 ? 1 : -1 };
  });
  return rig(g, root, {
    eyes, height: 1.75,
    tick(t, m) {
      const sw = Math.sin(t * 6) * 0.45 * m;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      body.position.y = 0.95 + Math.abs(Math.sin(t * 6)) * 0.04 * m + Math.sin(t * 1.4) * 0.012;
      head.rotation.x = Math.sin(t * 1.8) * 0.06 + 0.04;
      tail.rotation.z = Math.sin(t * 3) * 0.3;
      mane.forEach((f, i) => f.scale.set(1, 0.8 + Math.sin(t * 10 + i * 1.7) * 0.22, 1));
      tailFire.scale.set(1, 0.8 + Math.sin(t * 12) * 0.25, 1);
      lavaM.emissiveIntensity = 1.7 + Math.sin(t * 2.6) * 0.7;
      hoofM.emissiveIntensity = 1.5 + Math.sin(t * 4) * 0.4;
      for (const pf of puffs) {
        const k = (pf.k + t * 0.7) % 1;
        pf.p.position.set(pf.s * 0.1 + pf.s * k * 0.08, -0.15 - k * 0.12, -0.4 - k * 0.45);
        pf.p.scale.setScalar(0.4 + k * 1.6);
        pf.p.material.opacity = 0.65 * (1 - k);
      }
    },
  });
}

// =============== 🐋 Demonic Whale（Epic）===============
// 深紅鯨魚：肚有發光熔岩坑紋、頭頂細角、背上細刺、噴氣孔噴火柱、尾會擺
function demonicWhale() {
  const g = new THREE.Group();
  const root = pivot(g);
  const lavaM = glowMat(LAVA, 2.2);
  const fire = fireSet();
  const body = pivot(root, 0, 1.0, 0);
  S(body, 0.78, 0.66, 1.35, RED2, 0, 0, 0, {}, { line: 0.04 });
  S(body, 0.62, 0.42, 1.18, 0x3b1d20, 0, -0.26, -0.05, {}, {}); // 肚（深色）
  // 肚嘅熔岩坑紋
  for (let i = 0; i < 6; i++) {
    const z = -0.75 + i * 0.27;
    const w = 0.85 * Math.sqrt(Math.max(0.1, 1 - (z / 1.25) ** 2));
    const st = B(body, w, 0.035, 0.05, LAVA, 0, -0.6 + Math.abs(z) * 0.12, z, lavaM, { r: 0.45 });
    st.castShadow = false;
  }
  // 身側裂紋
  for (const s of [-1, 1]) for (const [y, z, len, rz] of [[0.18, 0.15, 0.4, 0.5], [-0.05, 0.55, 0.3, -0.5]]) {
    const c = crack(body, s * 0.73, y, z, len, rz, lavaM, 0.03);
    c.rotation.y = PI / 2;
    c.rotation.x = s * 0.25;
  }
  const eyes = demonFace(body, { dx: 0.3, y: 0.12, z: -1.2, r: 0.12, mouthY: -0.2, mouthW: 0.12, blushX: 0.42 });
  for (const s of [-1, 1]) horn(body, s * 0.26, 0.52, -0.62, 1.4, s);
  // 背刺
  for (let i = 0; i < 4; i++) cone(body, 0.06, 0.18, CHAR, 0, 0.66 - Math.abs(i - 1) * 0.03, -0.1 + i * 0.25, {}, 8).rotation.x = 0.4;
  // 噴氣孔：火柱
  const spout = fireTuft(body, 0, 0.6, -0.42, 1.1, fire);
  const spout2 = fireTuft(spout, 0, 0.35, 0, 0.55, fire);
  // 鰭
  const fins = [-1, 1].map((s) => {
    const f = pivot(body, s * 0.66, -0.25, -0.35);
    B(f, 0.5, 0.06, 0.26, RED2, s * 0.24, 0, 0.05, {}, { line: 0.1, r: 0.45 });
    crack(f, s * 0.24, 0.035, 0.05, 0.3, PI / 2, lavaM, 0.02).rotation.x = PI / 2;
    return f;
  });
  // 尾
  const tail = pivot(body, 0, 0.05, 1.18);
  S(tail, 0.24, 0.2, 0.4, RED2, 0, 0, 0.18, {}, { line: 0.06 });
  const fluke = pivot(tail, 0, 0, 0.5);
  for (const s of [-1, 1]) {
    const lobe = B(fluke, 0.55, 0.06, 0.3, RED2, s * 0.26, 0, 0.06, {}, { line: 0.1, r: 0.45 });
    lobe.rotation.y = s * -0.35;
    const e = B(fluke, 0.4, 0.07, 0.04, LAVA, s * 0.3, 0, 0.2, lavaM, { r: 0.45 });
    e.rotation.y = s * -0.35;
  }
  const aura = auraBall(body, 1.0, 0.85, 1.6, FIRE, 0.06);
  return rig(g, root, {
    eyes, height: 2.1, move: 'fly',
    tick(t, m) {
      body.position.y = 1.0 + Math.sin(t * 1.4) * 0.12;
      body.rotation.x = Math.sin(t * 1.4 + 1) * 0.05;
      tail.rotation.x = Math.sin(t * (2 + m * 2)) * 0.3;
      fluke.rotation.x = Math.sin(t * (2 + m * 2) - 0.8) * 0.3;
      fins.forEach((f, i) => (f.rotation.z = (i ? 1 : -1) * (-0.2 + Math.sin(t * 2.2) * 0.25)));
      spout.scale.set(1, 0.8 + Math.abs(Math.sin(t * 2.5)) * 0.5, 1);
      spout2.scale.set(1, 0.7 + Math.sin(t * 13) * 0.25, 1);
      lavaM.emissiveIntensity = 1.8 + Math.sin(t * 2.2) * 0.7;
      aura.material.opacity = 0.05 + Math.sin(t * 1.8) * 0.025;
    },
  });
}

// =============== 🏇 Skeleton Horseman（Legendary）===============
// 火焰馬（炭黑身、火鬃、火尾、發光蹄）+ 可愛骷髏騎士（大眼窩發光、細角頭盔、紅披風、旗）
function skeletonHorseman() {
  const g = new THREE.Group();
  const root = pivot(g);
  const lavaM = glowMat(LAVA, 2.2);
  const hoofM = glowMat(FIRE, 2);
  const eyeM = glowMat(EMBER, 3);
  const fire = fireSet();
  // ---- 馬 ----
  const legs = [[-0.22, -0.45], [0.22, -0.45], [-0.22, 0.42], [0.22, 0.42]].map(([x, z]) => {
    const hip = pivot(root, x, 0.72, z);
    B(hip, 0.18, 0.62, 0.2, CHAR, 0, -0.3, 0, {}, { line: 0.08 });
    B(hip, 0.22, 0.12, 0.24, FIRE, 0, -0.66, 0, hoofM, { r: 0.3 });
    return hip;
  });
  const horse = pivot(root, 0, 1.0, 0);
  B(horse, 0.62, 0.55, 1.2, CHAR, 0, 0, 0, {}, { line: 0.06, r: 0.32 });
  sideCracks(horse, 0.315, [[0.05, -0.2, 0.3, 0.6], [-0.08, 0.32, 0.26, -0.5]], lavaM);
  sideCracks(horse, -0.315, [[0.0, 0.0, 0.34, -0.5]], lavaM);
  // 頸 + 頭
  const neck = pivot(horse, 0, 0.18, -0.52);
  neck.rotation.x = -0.6;
  B(neck, 0.32, 0.6, 0.36, CHAR, 0, 0.26, 0, {}, { line: 0.08, r: 0.35 });
  const head = pivot(neck, 0, 0.58, -0.02);
  head.rotation.x = 0.6;
  B(head, 0.34, 0.36, 0.56, CHAR, 0, 0, -0.14, {}, { line: 0.08, r: 0.35 });
  B(head, 0.3, 0.2, 0.2, 0x3e2723, 0, -0.08, -0.42, {}, { r: 0.4 });
  for (const s of [-1, 1]) S(head, 0.03, 0.025, 0.02, LAVA, s * 0.07, -0.07, -0.525, lavaM, { lo: true });
  const horseEyes = bigEyes(head, 0.13, 0.06, -0.3, 0.06, EMBER, { glow: true, glowI: 1.2, tilt: 0.9 });
  for (const s of [-1, 1]) cone(head, 0.05, 0.14, CHAR, s * 0.1, 0.22, 0.05, {}, 8); // 耳
  // 火鬃 + 火尾
  const mane = [0.05, 0.25, 0.45].map((y, i) => fireTuft(neck, 0, y, 0.18, 0.6 - i * 0.05, fire));
  mane.forEach((f) => (f.rotation.x = -0.5));
  const tail = pivot(horse, 0, 0.15, 0.6);
  const tailFire = [fireTuft(tail, 0, 0, 0, 0.75, fire), fireTuft(tail, 0, -0.1, 0.12, 0.6, fire)];
  tailFire.forEach((f) => (f.rotation.x = 1.9));
  // 馬鞍
  B(horse, 0.66, 0.08, 0.42, RED2, 0, 0.3, 0.02, {}, { line: 0.1, r: 0.4 });
  B(horse, 0.68, 0.03, 0.44, GOLD, 0, 0.27, 0.02, { metalness: 0.7, roughness: 0.3 }, { r: 0.4 });
  // ---- 骷髏騎士 ----
  const rider = pivot(horse, 0, 0.36, 0.02);
  rider.scale.setScalar(1.3);
  const pelvis = B(rider, 0.3, 0.12, 0.2, BONE, 0, 0.04, 0, {}, { line: 0.1, r: 0.4 });
  pelvis.castShadow = true;
  for (const s of [-1, 1]) {
    limb(rider, V(s * 0.12, 0.02, -0.02), V(s * 0.34, -0.12, -0.1), 0.04, BONE, {}, 0.1);
    limb(rider, V(s * 0.34, -0.12, -0.1), V(s * 0.34, -0.42, -0.05), 0.035, BONE, {}, 0.1);
    B(rider, 0.1, 0.07, 0.16, CHAR2, s * 0.34, -0.46, -0.08, {}, { r: 0.3 }); // 靴
  }
  const torso = pivot(rider, 0, 0.12, 0);
  // 脊骨 + 肋骨（白色 + 深色隙）
  B(torso, 0.07, 0.42, 0.07, BONE, 0, 0.22, 0.04, {}, { r: 0.4 });
  for (let i = 0; i < 3; i++) B(torso, 0.34 - i * 0.04, 0.05, 0.18, BONE, 0, 0.18 + i * 0.1, -0.02, {}, { line: 0.12, r: 0.45 });
  // 胸甲（紅色 + 金邊）蓋住上半身，唔會太骨
  B(torso, 0.4, 0.2, 0.24, RED2, 0, 0.44, -0.01, {}, { line: 0.08, r: 0.3 });
  B(torso, 0.12, 0.12, 0.03, GOLD, 0, 0.45, -0.14, { metalness: 0.7, roughness: 0.3, ...GLOW(0xffab00, 0.4) }, { r: 0.4 });
  // 披風
  const cape = pivot(torso, 0, 0.52, 0.12);
  B(cape, 0.42, 0.62, 0.04, 0xb71c1c, 0, -0.3, 0, {}, { line: 0.1, r: 0.25 });
  B(cape, 0.44, 0.05, 0.06, LAVA, 0, -0.6, 0, lavaM, { r: 0.4 });
  // 手：一隻揸韁繩，一隻揸旗
  const armL = pivot(torso, -0.22, 0.48, 0);
  limb(armL, V(0, 0, 0), V(-0.05, -0.22, -0.18), 0.035, BONE, {}, 0.1);
  limb(armL, V(-0.05, -0.22, -0.18), V(0.1, -0.3, -0.36), 0.03, BONE, {}, 0.1);
  S(armL, 0.045, 0.045, 0.045, BONE, 0.1, -0.3, -0.38, {}, { line: 0.1 });
  const armR = pivot(torso, 0.22, 0.48, 0);
  limb(armR, V(0, 0, 0), V(0.08, -0.15, -0.16), 0.035, BONE, {}, 0.1);
  limb(armR, V(0.08, -0.15, -0.16), V(0.12, 0.0, -0.3), 0.03, BONE, {}, 0.1);
  const lance = pivot(armR, 0.12, 0.0, -0.3);
  cyl(lance, 0.03, 0.03, 1.0, 0x5d4037, 0, 0.25, 0, {}, 8);
  cone(lance, 0.06, 0.16, GOLD, 0, 0.82, 0, { metalness: 0.7, roughness: 0.3 }, 8);
  const flag = pivot(lance, 0, 0.62, 0);
  B(flag, 0.03, 0.22, 0.32, RED, 0, 0, 0.17, {}, { line: 0.1, r: 0.2 });
  const flagFire = fireTuft(flag, 0.02, -0.06, 0.17, 0.28, fire);
  flagFire.rotation.z = -PI / 2;
  flagFire.scale.setScalar(0.9);
  // 骷髏頭：圓圓大眼窩（入面發光）、細鼻、牙仔、細角頭盔
  const skull = pivot(torso, 0, 0.78, -0.02);
  B(skull, 0.42, 0.38, 0.4, BONE, 0, 0, 0, {}, { line: 0.08, r: 0.42 });
  B(skull, 0.28, 0.12, 0.3, BONE, 0, -0.2, -0.03, {}, { line: 0.1, r: 0.4 }); // 下巴
  const riderEyes = [-1, 1].map((s) => {
    S(skull, 0.085, 0.095, 0.04, 0x1a0a0e, s * 0.1, 0.02, -0.19, {}, { lo: true });
    const e = S(skull, 0.04, 0.045, 0.02, EMBER, s * 0.1, 0.01, -0.215, eyeM, { lo: true });
    S(skull, 0.014, 0.014, 0.01, 0xffffff, s * 0.1 + 0.018, 0.03, -0.225, GLOW(0xffffff, 1), { lo: true });
    return e;
  });
  cone(skull, 0.03, 0.05, 0x1a0a0e, 0, -0.08, -0.2, {}, 3).rotation.x = PI; // 鼻
  for (let i = 0; i < 4; i++) B(skull, 0.035, 0.04, 0.02, 0xffffff, -0.06 + i * 0.04, -0.2, -0.18, {}, { r: 0.3 });
  const helm = pivot(skull, 0, 0.12, 0);
  B(helm, 0.46, 0.18, 0.44, 0x4a1418, 0, 0.06, 0.01, { metalness: 0.4, roughness: 0.4 }, { line: 0.08, r: 0.4 });
  for (const s of [-1, 1]) horn(helm, s * 0.17, 0.12, 0, 0.8, s);
  const plume = fireTuft(helm, 0, 0.14, 0.05, 0.45, fire);
  const aura = auraBall(horse, 0.7, 0.9, 1.0, FIRE, 0.05);
  return rig(g, root, {
    eyes: horseEyes, height: 2.55,
    tick(t, m) {
      const sw = Math.sin(t * 7) * 0.5 * m;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      horse.position.y = 1.0 + Math.abs(Math.sin(t * 7)) * 0.06 * m + Math.sin(t * 1.5) * 0.015;
      neck.rotation.x = -0.6 + Math.sin(t * 1.6) * 0.05 + Math.sin(t * 7) * 0.05 * m;
      rider.position.y = 0.33 + Math.abs(Math.sin(t * 7 + 0.4)) * 0.05 * m;
      torso.rotation.z = Math.sin(t * 1.2) * 0.04;
      skull.rotation.y = Math.sin(t * 0.7) * 0.25;
      cape.rotation.x = -0.15 - m * 0.35 + Math.sin(t * 3) * 0.06;
      flag.rotation.y = Math.sin(t * 4) * 0.25;
      mane.forEach((f, i) => f.scale.set(1, 0.8 + Math.sin(t * 11 + i * 2) * 0.22, 1));
      tailFire.forEach((f, i) => f.scale.set(1, 0.8 + Math.sin(t * 9 + i) * 0.25, 1));
      plume.scale.set(1, 0.8 + Math.sin(t * 12) * 0.2, 1);
      flagFire.scale.set(0.9, 0.9 * (0.8 + Math.sin(t * 10) * 0.2), 0.9);
      eyeM.emissiveIntensity = 2.4 + Math.sin(t * 3) * 0.8;
      riderEyes.forEach((e) => (e.scale.y = 0.045 * (Math.sin(t * 0.5) > 0.97 ? 0.2 : 1)));
      lavaM.emissiveIntensity = 1.8 + Math.sin(t * 2.4) * 0.6;
      hoofM.emissiveIntensity = 1.6 + Math.sin(t * 5) * 0.4;
      aura.material.opacity = 0.04 + Math.sin(t * 2) * 0.02;
    },
  });
}

// =============== 🐕 Lava Cerberus（Mythic）===============
// 三個狗仔頭（開心伸脷）、一個熔岩身；金色刺刺頸圈、背上火鬃、火尾、發光爪
function lavaCerberus() {
  const g = new THREE.Group();
  const root = pivot(g);
  const lavaM = glowMat(LAVA, 2.2);
  const pawM = glowMat(FIRE, 1.9);
  const fire = fireSet();
  const gold = M(GOLD, { metalness: 0.75, roughness: 0.25, ...GLOW(0xffab00, 0.35) });
  const legs = [[-0.3, -0.38], [0.3, -0.38], [-0.3, 0.42], [0.3, 0.42]].map(([x, z]) => {
    const hip = pivot(root, x, 0.58, z);
    B(hip, 0.26, 0.5, 0.28, CHAR, 0, -0.25, 0, {}, { line: 0.07 });
    B(hip, 0.3, 0.12, 0.34, FIRE, 0, -0.52, -0.02, pawM, { r: 0.35 });
    for (let i = 0; i < 3; i++) S(hip, 0.03, 0.025, 0.02, 0xffffff, (i - 1) * 0.07, -0.52, -0.19, {}, { lo: true });
    return hip;
  });
  const body = pivot(root, 0, 0.92, 0.05);
  B(body, 0.95, 0.68, 1.15, CHAR, 0, 0, 0, {}, { line: 0.05, r: 0.32 });
  B(body, 0.7, 0.14, 0.85, 0x4a2c30, 0, -0.3, 0.05, {}, { r: 0.4 });
  sideCracks(body, 0.48, [[0.1, -0.2, 0.34, 0.6], [-0.1, 0.25, 0.3, -0.5], [0.18, 0.35, 0.2, 0.2]], lavaM);
  sideCracks(body, -0.48, [[0.05, -0.05, 0.38, -0.5], [-0.12, 0.38, 0.22, 0.6]], lavaM);
  const mane = [[-0.25, -0.4], [0.25, -0.4], [0, -0.2], [0, 0.1]].map(([x, z], i) => fireTuft(body, x, 0.33, z, 0.75 - i * 0.08, fire));
  const tail = pivot(body, 0, 0.18, 0.58);
  limb(tail, V(0, 0, 0), V(0, 0.32, 0.22), 0.05, CHAR, {});
  const tailFire = fireTuft(tail, 0, 0.36, 0.25, 0.6, fire);
  // 三個頭
  const heads = [[0, 0.42, -0.62, 0, 1], [-0.42, 0.32, -0.5, 0.45, 0.85], [0.42, 0.32, -0.5, -0.45, 0.85]].map(([x, y, z, ry, k], hi) => {
    const neck = pivot(body, x, y - 0.1, z + 0.12);
    neck.rotation.y = ry;
    B(neck, 0.3 * k, 0.34 * k, 0.3 * k, CHAR, 0, 0.06, -0.06, {}, { line: 0.08, r: 0.4 });
    const col = torus(neck, 0.19 * k, 0.04 * k, GOLD, 0, 0.0, -0.08, gold); // 頸圈
    col.rotation.x = PI / 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      const sp = cone(neck, 0.03 * k, 0.08 * k, 0xfff8e1, Math.cos(a) * 0.22 * k, 0, -0.08 + Math.sin(a) * 0.22 * k, gold, 6);
      sp.rotation.set(Math.sin(a) * PI / 2, 0, -Math.cos(a) * PI / 2);
    }
    const h = pivot(neck, 0, 0.2 * k, -0.18 * k);
    B(h, 0.52 * k, 0.46 * k, 0.48 * k, CHAR, 0, 0, 0, {}, { line: 0.06, r: 0.36 });
    B(h, 0.4 * k, 0.09 * k, 0.38 * k, 0x4a2c30, 0, 0.21 * k, 0, {}, { r: 0.4 });
    B(h, 0.28 * k, 0.2 * k, 0.2 * k, 0x5d4037, 0, -0.1 * k, -0.28 * k, {}, { line: 0.1, r: 0.4 }); // 嘴
    S(h, 0.06 * k, 0.045 * k, 0.04 * k, 0x1a0a0e, 0, -0.03 * k, -0.385 * k, {}, { lo: true }); // 鼻
    const tongue = B(h, 0.09 * k, 0.03 * k, 0.12 * k, 0xff5c8a, 0.03 * k, -0.2 * k, -0.33 * k, {}, { r: 0.45 });
    tongue.rotation.x = 0.7;
    const eyes = demonFace(h, { dx: 0.13 * k, y: 0.06 * k, z: -0.245 * k, r: 0.075 * k, mouthY: -0.17 * k, mouthW: 0.06 * k, blushX: 0.2 * k, fang: hi === 0 });
    for (const s of [-1, 1]) {
      horn(h, s * 0.15 * k, 0.21 * k, 0.04 * k, 0.75 * k, s);
      const ear = pivot(h, s * 0.27 * k, 0.12 * k, 0.04 * k);
      B(ear, 0.08 * k, 0.24 * k, 0.16 * k, RED2, s * 0.03 * k, -0.1 * k, 0, {}, { line: 0.1, r: 0.4 });
      ear.rotation.z = s * 0.35;
    }
    return { neck, h, tongue, eyes, ry, seed: hi * 2.1 };
  });
  const aura = auraBall(body, 1.1, 0.9, 1.25, FIRE, 0.07);
  const sparks = embers(body, 10, 0.5, 1.4, 0.2, glowMat(EMBER, 3));
  return rig(g, root, {
    eyes: heads.flatMap((x) => x.eyes), height: 1.85,
    tick(t, m) {
      const sw = Math.sin(t * 6.5) * 0.45 * m;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      body.position.y = 0.92 + Math.abs(Math.sin(t * 6.5)) * 0.045 * m + Math.sin(t * 1.6) * 0.012;
      for (const hd of heads) {
        hd.neck.rotation.x = Math.sin(t * 2 + hd.seed) * 0.1;
        hd.neck.rotation.y = hd.ry + Math.sin(t * 1.1 + hd.seed) * 0.15;
        hd.h.rotation.z = Math.sin(t * 1.7 + hd.seed) * 0.1;
        hd.tongue.rotation.x = 0.7 + Math.sin(t * 9 + hd.seed) * 0.15;
      }
      tail.rotation.z = Math.sin(t * 8) * 0.35;
      mane.forEach((f, i) => f.scale.set(1, 0.8 + Math.sin(t * 10 + i * 1.9) * 0.22, 1));
      tailFire.scale.set(1, 0.8 + Math.sin(t * 12) * 0.25, 1);
      lavaM.emissiveIntensity = 1.8 + Math.sin(t * 2.6) * 0.7;
      pawM.emissiveIntensity = 1.6 + Math.sin(t * 4.5) * 0.4;
      aura.material.opacity = 0.06 + Math.sin(t * 2) * 0.03;
      sparks(t);
    },
  });
}

// =============== 🌋 Lava Bloom（Legendary 蛋）===============
// 火山石盆仔（兩隻細腳）+ 一枝花：熔岩花瓣、中間係黃色笑臉；葉仔做手；火星飄上去
function lavaBloom() {
  const g = new THREE.Group();
  const root = pivot(g);
  const lavaM = glowMat(LAVA, 2.2);
  const petalM = [glowMat(FIRE, 1.1, { roughness: 0.35 }), glowMat(LAVA, 1.3, { roughness: 0.35 })];
  const tipM = glowMat(EMBER, 1.8, { roughness: 0.3 });
  const pot = pivot(root, 0, 0.32, 0);
  B(pot, 0.62, 0.42, 0.62, 0x3e2723, 0, 0, 0, {}, { line: 0.06, r: 0.3 });
  B(pot, 0.7, 0.1, 0.7, 0x4e342e, 0, 0.22, 0, {}, { line: 0.08, r: 0.4 });
  S(pot, 0.27, 0.04, 0.27, 0x1a0f0f, 0, 0.27, 0, {}, {}); // 泥
  for (const [x, z, l, rz] of [[-0.12, -0.315, 0.24, 0.5], [0.15, -0.315, 0.2, -0.6]]) crack(pot, x, -0.02, z, l, rz, lavaM, 0.024);
  sideCracks(pot, 0.315, [[0, 0.05, 0.22, 0.4]], lavaM);
  sideCracks(pot, -0.315, [[0.02, -0.08, 0.2, -0.5]], lavaM);
  const feet = [-1, 1].map((s) => {
    const f = pivot(pot, s * 0.16, -0.2, 0);
    B(f, 0.16, 0.12, 0.2, 0x2b1d1a, 0, -0.04, -0.02, {}, { line: 0.1, r: 0.4 });
    return f;
  });
  // 莖 + 葉手
  const stem = pivot(pot, 0, 0.26, 0);
  limb(stem, V(0, 0, 0), V(0, 0.62, 0), 0.05, 0x2e7d32, {}, 0.1);
  const leaves = [-1, 1].map((s) => {
    const l = pivot(stem, s * 0.04, 0.3, 0);
    const leaf = S(l, 0.17, 0.05, 0.09, 0x388e3c, s * 0.17, 0.04, 0, {}, { line: 0.08 });
    leaf.rotation.z = s * 0.35;
    crack(l, s * 0.17, 0.08, 0, 0.22, PI / 2 + s * 0.35, lavaM, 0.012);
    return l;
  });
  // 花頭（向 -z）
  const flower = pivot(stem, 0, 0.72, 0);
  const ringP = pivot(flower); // 花瓣圈（慢慢轉；笑臉唔轉）
  const petals = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    const p = pivot(ringP, 0, 0, 0.02);
    p.rotation.z = a;
    const big = i % 2 === 0;
    S(p, 0.11, big ? 0.24 : 0.2, 0.05, LAVA, 0, big ? 0.3 : 0.26, big ? 0.01 : 0.03, petalM[i % 2], { line: 0.06 });
    S(p, 0.05, 0.06, 0.04, EMBER, 0, big ? 0.49 : 0.42, 0, tipM, { lo: true });
    petals.push(p);
  }
  S(flower, 0.22, 0.22, 0.1, 0xffb300, 0, 0, -0.02, { ...GLOW(0xff8f00, 0.45) }, { line: 0.06 });
  const eyes = demonFace(flower, { dx: 0.08, y: 0.03, z: -0.1, r: 0.055, mouthY: -0.06, mouthW: 0.04, blushX: 0.13, iris: 0xff3d00, fang: false });
  for (const s of [-1, 1]) horn(flower, s * 0.1, 0.18, -0.02, 0.6, s, { color: 0x3e2723 });
  const sparks = embers(root, 9, 0.35, 1.4, 0.6, glowMat(EMBER, 3));
  const aura = auraBall(flower, 0.55, 0.55, 0.3, LAVA, 0.08);
  return rig(g, root, {
    eyes, height: 1.75,
    tick(t, m) {
      pot.position.y = 0.32 + Math.abs(Math.sin(t * 6)) * 0.05 * m;
      feet.forEach((f, i) => (f.rotation.x = Math.sin(t * 6 + i * PI) * 0.5 * m));
      stem.rotation.z = Math.sin(t * 1.3) * 0.08;
      stem.rotation.x = Math.sin(t * 1.7) * 0.05;
      ringP.rotation.z = t * 0.25;
      flower.rotation.x = Math.sin(t * 1.1) * 0.08;
      leaves.forEach((l, i) => (l.rotation.z = (i ? -1 : 1) * Math.sin(t * 2.4 + i) * 0.25));
      petals.forEach((p, i) => (p.scale.y = 1 + Math.sin(t * 3 + i) * 0.05));
      petalM[0].emissiveIntensity = 0.9 + Math.sin(t * 2) * 0.35;
      petalM[1].emissiveIntensity = 1.2 + Math.sin(t * 2 + 1.5) * 0.35;
      lavaM.emissiveIntensity = 1.8 + Math.sin(t * 2.6) * 0.6;
      aura.material.opacity = 0.07 + Math.sin(t * 2) * 0.03;
      sparks(t);
    },
  });
}

// =============== 🎃 Pumpkgrim（Mythic 蛋）===============
// 南瓜頭死神：飄喺半空嘅黑紫斗篷（爛爛衫腳）、帽兜入面係發光刻面南瓜頭、骨仔手、
// 糖果條紋手柄 + 發光紫橙鐮刀；身邊有鬼火
function pumpkgrim() {
  const g = new THREE.Group();
  const root = pivot(g);
  const CLOAK = 0x241433;
  const CLOAK2 = 0x160b22;
  const bladeM = glowMat(0xb388ff, 1.6, { roughness: 0.2, metalness: 0.3 });
  const edgeM = glowMat(LAVA, 2.6);
  const wispM = [additive(0xb388ff, 0.5), additive(LAVA, 0.5)];
  const body = pivot(root, 0, 0.75, 0);
  // 斗篷（上窄下闊）+ 爛爛衫腳
  cyl(body, 0.24, 0.5, 1.0, CLOAK, 0, 0.05, 0, {}, 10);
  const hem = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    const c = cone(body, 0.12, 0.3, CLOAK2, Math.cos(a) * 0.42, -0.55, Math.sin(a) * 0.42, {}, 6);
    c.rotation.x = PI;
    hem.push(c);
  }
  torus(body, 0.31, 0.04, LAVA, 0, 0.3, 0, edgeM).rotation.x = PI / 2; // 發光腰帶
  B(body, 0.12, 0.12, 0.05, GOLD, 0, 0.3, -0.27, { metalness: 0.7, roughness: 0.3 }, { r: 0.3 });
  // 帽兜
  const head = pivot(body, 0, 0.78, 0);
  S(head, 0.42, 0.44, 0.42, CLOAK, 0, 0.02, 0.06, {}, { line: 0.05 });
  cone(head, 0.2, 0.38, CLOAK, 0, 0.4, 0.2, {}, 10).rotation.x = 0.7;
  S(head, 0.34, 0.34, 0.06, 0x0b0612, 0, 0, -0.28, {}, {}); // 帽兜口（黑）
  const pk = pumpkin(head, 0.28, 0xff8f00, 0, -0.02, -0.22, { roughness: 0.45 }, { line: 0.04 });
  const face = carvedFace(pk, 0.27, 0, -0.25, EMBER, { inten: 3 });
  // 帽兜頂一對細角
  for (const s of [-1, 1]) horn(head, s * 0.22, 0.32, -0.05, 0.8, s, { color: 0x3a2350 });
  // 手：衫袖 + 骨仔手
  const armL = pivot(body, -0.3, 0.4, 0);
  limb(armL, V(0, 0, 0), V(-0.15, -0.3, -0.12), 0.09, CLOAK, {}, 0.06);
  S(armL, 0.06, 0.06, 0.06, BONE, -0.17, -0.36, -0.14, {}, { line: 0.1 });
  const armR = pivot(body, 0.3, 0.4, 0);
  limb(armR, V(0, 0, 0), V(0.18, -0.15, -0.2), 0.09, CLOAK, {}, 0.06);
  S(armR, 0.06, 0.06, 0.06, BONE, 0.2, -0.18, -0.24, {}, { line: 0.1 });
  // 鐮刀：糖果條紋手柄 + 紫色刀 + 橙色發光刀口
  const scythe = pivot(armR, 0.2, -0.18, -0.24);
  for (let i = 0; i < 8; i++) cyl(scythe, 0.03, 0.03, 0.2, i % 2 ? 0xffffff : 0xe53935, 0, -0.5 + i * 0.2, 0, { roughness: 0.3 }, 8);
  const top = pivot(scythe, 0, 1.08, 0);
  const blade = shape(top, [[0, 0], [-0.2, 0.12], [-0.5, 0.1], [-0.72, -0.08], [-0.52, -0.02], [-0.26, -0.04]], 0.03, 0xb388ff, bladeM, { smooth: true, key: 'pgBlade' });
  blade.rotation.y = PI / 2;
  outline(blade, 0.03);
  const edge = tube(top, [V(0, -0.02, 0.02), V(0, -0.04, 0.26), V(0, -0.02, 0.52), V(0, 0.08, 0.7)], 0.016, LAVA, edgeM, 16);
  edge.rotation.y = 0;
  S(top, 0.06, 0.06, 0.06, GOLD, 0, 0, 0, { metalness: 0.7, roughness: 0.3 }, { lo: true });
  // 鬼火（紫 + 橙）圍住轉
  const wisps = [0, 1, 2, 3].map((i) => {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), wispM[i % 2]);
    body.add(w);
    return w;
  });
  const aura = auraBall(body, 0.7, 1.1, 0.7, 0x7c4dff, 0.06);
  return rig(g, root, {
    eyes: [], height: 2.3, move: 'fly',
    tick(t, m) {
      body.position.y = 0.85 + Math.sin(t * 1.8) * 0.1;
      body.rotation.z = Math.sin(t * 1.2) * 0.05;
      body.rotation.x = m * 0.12;
      head.rotation.y = Math.sin(t * 0.8) * 0.2;
      hem.forEach((c, i) => (c.rotation.z = Math.sin(t * 3 + i) * 0.2));
      scythe.rotation.z = -0.15 + Math.sin(t * 1.4) * 0.08;
      armL.rotation.x = Math.sin(t * 1.6) * 0.2;
      face.eyes.forEach((e) => (e.material.emissiveIntensity = 2.6 + Math.sin(t * 4) * 0.6));
      edgeM.emissiveIntensity = 2.2 + Math.sin(t * 3) * 0.6;
      bladeM.emissiveIntensity = 1.3 + Math.sin(t * 2.2) * 0.4;
      wisps.forEach((w, i) => {
        const a = t * 1.3 + (i / 4) * PI * 2;
        w.position.set(Math.cos(a) * 0.7, -0.2 + Math.sin(t * 2 + i) * 0.25, Math.sin(a) * 0.7);
        w.scale.setScalar(0.8 + Math.sin(t * 5 + i) * 0.3);
      });
      aura.material.opacity = 0.05 + Math.sin(t * 2) * 0.025;
    },
  });
}

export const DEMONIC_MODELS = {
  Imp: imp,
  Toro: toro,
  'Demonic Whale': demonicWhale,
  'Skeleton Horseman': skeletonHorseman,
  'Lava Cerberus': lavaCerberus,
  'Lava Bloom': lavaBloom,
  Pumpkgrim: pumpkgrim,
};

// ======================== 🥚 Witch Tower 蛋（halloweenEggs.js 經 buildHalloweenEgg 用）========================
// 同 Halloween 蛋一樣嘅結構：蛋喺 y = 0.62（R 0.42、H 0.6）、地上一圈稀有度光環、Legendary 以上有光暈、animate(t) 搖一搖
function eggBase(rarity, baseColor, extra = {}) {
  const g = new THREE.Group();
  const egg = pivot(g, 0, 0.62, 0);
  S(egg, 0.42, 0.6, 0.42, baseColor, 0, 0, 0, extra, { line: 0.04 });
  const rc = new THREE.Color(rarityInfo(rarity).color);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.5, 32), new THREE.MeshBasicMaterial({ color: rc, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -PI / 2;
  ring.position.y = 0.02;
  g.add(ring);
  const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: rc, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
  aura.scale.set(0.57, 0.78, 0.57);
  egg.add(aura);
  return { g, egg, ring, aura };
}
// 貼住蛋面放（a = 角度，h = -1..1 高度）
const onEgg = (a, h, push = 1.0) => {
  const k = Math.sqrt(Math.max(0, 1 - h * h));
  return [Math.sin(a) * 0.42 * k * push, h * 0.6 * push, -Math.cos(a) * 0.42 * k * push];
};
function finishEgg(parts, tick) {
  const { g, egg, ring, aura } = parts;
  g.userData.animate = (t) => {
    const w = Math.max(0, Math.sin(t * 1.8)) ** 4;
    egg.rotation.z = Math.sin(t * 14) * 0.12 * w;
    egg.position.y = 0.62 + Math.sin(t * 2) * 0.015;
    ring.material.opacity = 0.45 + Math.sin(t * 3) * 0.25;
    aura.material.opacity = 0.12 + Math.sin(t * 2.5) * 0.06;
    tick?.(t);
  };
  g.userData.height = 1.35;
  g.userData.move = 'walk';
  return g;
}

// 🌋 Lava Bloom 蛋：黑色火山石蛋 + 發光熔岩裂紋 + 頂上一朵細熔岩花
function lavaBloomEgg(rarity) {
  const parts = eggBase(rarity, 0x2b1d1a, { roughness: 0.8 });
  const { egg } = parts;
  const lavaM = glowMat(LAVA, 2.4);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * PI * 2 + (i % 2) * 0.3;
    const h = ((i * 37) % 11) / 11 * 1.3 - 0.65;
    const [x, y, z] = onEgg(a, h, 1.01);
    const c = B(egg, 0.03, 0.2 + (i % 3) * 0.05, 0.02, LAVA, x, y, z, lavaM, { r: 0.45 });
    c.lookAt(x * 3, y * 3 + 0.62, z * 3);
    c.rotateZ((i % 2 ? 1 : -1) * 0.5);
  }
  const top = pivot(egg, 0, 0.58, 0);
  const petals = [];
  for (let i = 0; i < 6; i++) {
    const p = pivot(top, 0, 0, 0);
    p.rotation.y = (i / 6) * PI * 2;
    const pe = S(p, 0.06, 0.03, 0.14, LAVA, 0, 0.04, 0.1, glowMat(i % 2 ? FIRE : LAVA, 1.6), { lo: true });
    pe.rotation.x = -0.5;
    petals.push(p);
  }
  S(top, 0.06, 0.05, 0.06, EMBER, 0, 0.07, 0, glowMat(EMBER, 2.6), { lo: true });
  return finishEgg(parts, (t) => {
    lavaM.emissiveIntensity = 1.8 + Math.sin(t * 2.5) * 0.8;
    top.rotation.y = t * 0.6;
  });
}
// 🎃 Pumpkgrim 蛋：南瓜坑紋橙蛋 + 發光刻面 + 頂上黑色細帽兜 + 一把細鐮刀插住
function pumpkgrimEgg(rarity) {
  const parts = eggBase(rarity, 0xf57c00, { roughness: 0.45 });
  const { egg } = parts;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    const m = S(egg, 0.17, 0.59, 0.3, i % 2 ? 0xef6c00 : 0xfb8c00, Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14, { roughness: 0.45 });
    m.rotation.y = -a;
  }
  const face = carvedFace(egg, 0.34, 0.02, -0.43, EMBER, { inten: 3 });
  const hood = pivot(egg, 0, 0.42, 0.04);
  S(hood, 0.3, 0.18, 0.3, 0x241433, 0, 0, 0, {}, { line: 0.06 });
  cone(hood, 0.16, 0.3, 0x241433, 0, 0.2, 0.08, {}, 10).rotation.x = 0.6;
  const sc = pivot(egg, 0.32, 0.1, 0.1);
  sc.rotation.z = -0.4;
  for (let i = 0; i < 4; i++) cyl(sc, 0.018, 0.018, 0.12, i % 2 ? 0xffffff : 0xe53935, 0, i * 0.12, 0, {}, 6);
  const bl = B(sc, 0.3, 0.06, 0.02, 0xb388ff, -0.12, 0.48, 0, glowMat(0xb388ff, 1.6), { r: 0.45 });
  bl.rotation.z = 0.3;
  return finishEgg(parts, (t) => {
    face.eyes.forEach((e) => (e.material.emissiveIntensity = 2.4 + Math.sin(t * 4) * 0.6));
  });
}
export const DEMONIC_EGGS = { 'Lava Bloom': lavaBloomEgg, Pumpkgrim: pumpkgrimEgg };
export const buildDemonicEgg = (name, rarity) => DEMONIC_EGGS[name]?.(rarity) || null;

// ======================== 😈 Demonic Chest（chests.js 開箱動畫用）========================
// 黑曜石箱 + 紅色發光間條 + 熔岩裂紋 + 蓋上一對細角 + 前面可愛骷髏鎖；回傳 { g, lid, base, glowMat, innerGlow }
export function buildDemonicChest() {
  const g = new THREE.Group();
  const glowM = glowMat(FIRE, 2.2);
  const lavaM = glowMat(LAVA, 2.4);
  const base = pivot(g, 0, 0.32, 0);
  B(base, 1.0, 0.6, 0.7, CHAR2, 0, 0, 0, {}, { line: 0.05, r: 0.1 });
  B(base, 1.01, 0.05, 0.71, 0x4a1418, 0, -0.12, 0, {}, { r: 0.3 });
  for (const x of [-0.38, 0.38]) B(base, 0.1, 0.62, 0.72, FIRE, x, 0, 0, glowM, { r: 0.2 });
  crack(base, -0.18, -0.04, -0.356, 0.18, 0.7, lavaM, 0.022);
  crack(base, 0.17, 0.0, -0.356, 0.16, -0.5, lavaM, 0.022);
  crack(base, 0.0, -0.18, -0.356, 0.12, 1.2, lavaM, 0.02);
  for (const x of [-0.5, 0.5]) for (const z of [-0.35, 0.35]) B(base, 0.12, 0.12, 0.12, GOLD, x, -0.26, z, { metalness: 0.75, roughness: 0.25 }, { r: 0.35 });
  const lid = pivot(g, 0, 0.62, 0.35);
  const lidBody = pivot(lid, 0, 0, -0.35);
  B(lidBody, 1.04, 0.22, 0.74, CHAR2, 0, 0.11, 0, {}, { line: 0.05, r: 0.2 });
  const arch = cyl(lidBody, 0.37, 0.37, 1.03, CHAR2, 0, 0.2, 0, {}, 24);
  arch.rotation.z = PI / 2;
  arch.scale.set(0.45, 1, 1);
  for (const x of [-0.38, 0.38]) {
    const band = cyl(lidBody, 0.38, 0.38, 0.11, FIRE, x, 0.2, 0, glowM, 24);
    band.rotation.z = PI / 2;
    band.scale.set(0.47, 1, 1.02);
  }
  for (const s of [-1, 1]) horn(lidBody, s * 0.3, 0.33, 0, 1.6, s);
  // 骷髏鎖（可愛）
  const lock = pivot(lidBody, 0, 0.02, -0.39);
  B(lock, 0.2, 0.18, 0.06, BONE, 0, 0, 0, {}, { line: 0.08, r: 0.4 });
  for (const s of [-1, 1]) S(lock, 0.035, 0.04, 0.02, EMBER, s * 0.045, 0.02, -0.035, lavaM, { lo: true });
  for (let i = 0; i < 3; i++) B(lock, 0.025, 0.03, 0.02, 0x1a0a0e, -0.03 + i * 0.03, -0.06, -0.032, {}, { r: 0.3 });
  const innerGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), additive(LAVA, 0.9));
  innerGlow.rotation.x = -PI / 2;
  innerGlow.position.y = 0.61;
  g.add(innerGlow);
  return { g, lid, base, glowMat: glowM, innerGlow };
}
