// 🐕 Echo 隻狗 + 🧟 Zombified Chest 舖（小朋友 Issue #8）
// 「Spawn Ruins 開頭有隻叫 ECHO 嘅狗，用 Candy Corn 賣新嘅 ZOMBIFIED CHEST，500 Candy Corn 一個」
//
// - Echo：方塊風格、有少少殭屍味（縫線、發光綠眼、包紮）但好可愛嘅狗，企喺自己個小舖頭度，搖尾、歪頭、望住你
// - 撳 E → 面板：見到你有幾多 🌽 Candy Corn、箱嘅價錢、開到乜嘢（機會率）
// - 買 → 開箱動畫：箱由天跌落嚟 → 震 → 按稀有度發光 → 爆開 → 大字講你開到乜；Mythic 有特別大嘅動畫
// - 開到寵物：直接入背囊（state.pets），同蛋墳場孵出嚟嘅一樣（唔使再孵）；開到 Candy Corn：加返落 state.candyCorn
//
// main.js 用法：
//   const echo = createEchoShop({ scene, camera, openShop, teleport, resume, popup, announce }) // 第一次入 Halloween 世界先起
//   echo.update(dt, time, camera.position)  // 每格畫面（搖尾、望住你）
//   echo.interaction(pos) → { prompt, action } | null
//   giveCandyCorn(n)                        // 測試用（window.game.candy）

import * as THREE from 'three';
import { state, save } from './state.js';
import { ZOMBIE_CHEST_COST, ZOMBIE_CHEST_CANDY, ZOMBIE_CHEST_DROPS, INDEX_NEW_SPECIES_REWARD, rarityInfo } from './data/balance.js';
import { rollZombieChest } from './data/echoChest.js';
import { findAnimal, randomKg } from './data/animals.js';
import { buildAnimalModel } from './animalModels.js';
import { HW_X, RUINS } from './halloweenShape.js';
import { halloween } from './halloweenWorld.js';
import { extraPanels, closePanel, panelKind } from './hud.js';
import { petPic } from './animalPics.js';
import { makeLabel, makeSign, THEMES } from './signs.js';
import { playMovie, once, shake } from './movie.js';
import { short } from './format.js';
import { play } from './sound.js';
import { V, M, GLOW, B, S, pivot, cone, cyl, torus, tube, limb, bigEyes, smile, stitches, blinkAt, pumpkin, carvedFace, candyCorn, outline } from './echoPetModels.js';

const PI = Math.PI;
const WHITE = new THREE.Color(0xffffff);
const $ = (id) => document.getElementById(id);

// 📍 舖頭位置：出生點東北面，面向你一到埗企嘅位（HW_ARRIVE）
export const ECHO_STALL = { x: HW_X + 10, z: RUINS.z - 9 };
const STALL_ROT = Math.atan2(HW_X - ECHO_STALL.x, 4 - ECHO_STALL.z); // 舖頭前面（local +z）望住出生點
const FRONT = V(Math.sin(STALL_ROT), 0, Math.cos(STALL_ROT));
const SIDE = V(Math.cos(STALL_ROT), 0, -Math.sin(STALL_ROT)); // 舖頭嘅右手面（由客人望過去係左）
const SHOP_SPOT = { x: ECHO_STALL.x + FRONT.x * 2.6, z: ECHO_STALL.z + FRONT.z * 2.6 }; // 企喺度撳 E
const CANDY = '🌽'; // 同釣魚一致

export const candyCornOf = () => state.candyCorn || 0;
export function giveCandyCorn(n = 5000) {
  state.candyCorn = candyCornOf() + n;
  save();
  return state.candyCorn;
}

// ======================== 🐕 Echo ========================
// 面向 -z；回傳 { g, head, tail, animate(t, look) }
function buildEcho() {
  const g = new THREE.Group();
  const root = pivot(g);
  const fur = 0x7cab66; // 殭屍綠
  const fur2 = 0x557d45;
  const belly = 0xc5dcaa;
  const patch = 0xc9a77c; // 補咗嘅一塊（唔同色）
  const stitchC = 0xb388ff;
  const stitchM = M(stitchC, GLOW(stitchC, 1.6));
  const eyeC = 0x76ff03;
  // 身
  const body = pivot(root, 0, 0.62, 0.05);
  B(body, 0.6, 0.48, 0.86, fur, 0, 0, 0, {}, { line: 0.07, r: 0.35 });
  B(body, 0.42, 0.2, 0.6, belly, 0, -0.18, -0.04, {}, { r: 0.4 });
  // 補丁（右邊身，唔同色）+ 發光縫線
  const side = pivot(body, 0.3, 0.04, 0.12);
  side.rotation.y = -PI / 2; // local -z = 向外（+x）
  B(side, 0.3, 0.24, 0.04, patch, 0, 0, 0, {}, { r: 0.3 });
  stitches(side, V(-0.15, 0.12, -0.025), V(0.15, 0.12, -0.025), 5, stitchC, stitchM, 0.06, 0.014);
  stitches(side, V(-0.15, -0.12, -0.025), V(0.15, -0.12, -0.025), 5, stitchC, stitchM, 0.06, 0.014);
  B(body, 0.2, 0.1, 0.3, fur2, -0.12, 0.24, 0.15, {}, { r: 0.4 }); // 背上深色斑
  // 4 隻腳（前左腳包咗繃帶）
  const legs = [[-0.18, -0.28, 0], [0.18, -0.28, PI], [-0.18, 0.32, PI], [0.18, 0.32, 0]].map(([x, z, phase], i) => {
    const hip = pivot(body, x, -0.16, z);
    B(hip, 0.17, 0.42, 0.18, fur, 0, -0.2, 0, {}, { line: 0.08 });
    B(hip, 0.2, 0.1, 0.24, belly, 0, -0.42, -0.03, {}, { line: 0.08 });
    if (i === 0) for (let k = 0; k < 3; k++) B(hip, 0.185, 0.04, 0.195, 0xf5f0e1, 0, -0.12 - k * 0.07, 0, {}, { r: 0.3 }).rotation.z = (k - 1) * 0.12;
    return { hip, phase };
  });
  // 頸圈 + 糖果粟米牌
  const neck = pivot(body, 0, 0.18, -0.38);
  torus(neck, 0.2, 0.035, 0x6a1b9a, 0, 0, 0, {}).rotation.x = PI / 2 - 0.4;
  const tag = candyCorn(neck, 0.075, 0, -0.14, -0.19);
  tag.rotation.x = PI;
  // 頭
  const head = pivot(body, 0, 0.36, -0.46);
  B(head, 0.58, 0.5, 0.5, fur, 0, 0, 0, {}, { line: 0.07, r: 0.38 });
  B(head, 0.34, 0.22, 0.24, belly, 0, -0.13, -0.29, {}, { line: 0.07, r: 0.4 }); // 嘴
  S(head, 0.085, 0.06, 0.06, 0x1a1420, 0, -0.04, -0.42, { roughness: 0.15 }); // 鼻
  S(head, 0.025, 0.016, 0.012, 0xffffff, -0.025, -0.02, -0.475, GLOW(0xffffff, 0.6), { lo: true });
  smile(head, -0.05, -0.17, -0.41, 0.05, 0x2a1220, {}, 2.3);
  smile(head, 0.05, -0.17, -0.41, 0.05, 0x2a1220, {}, 2.3);
  const tongue = B(head, 0.09, 0.03, 0.12, 0xff6f91, 0, -0.24, -0.38, {}, { r: 0.45 });
  tongue.rotation.x = 0.5;
  const eyes = bigEyes(head, 0.14, 0.07, -0.25, 0.1, eyeC, { glow: true, glowI: 1.4 });
  // 額頭縫線（發光紫）+ 一邊眼有補丁圈
  stitches(head, V(-0.2, 0.2, -0.255), V(0.06, 0.24, -0.255), 5, stitchC, stitchM, 0.07, 0.016);
  torus(head, 0.125, 0.018, 0x6d8466, 0.14, 0.07, -0.26, {});
  // 耳：一隻企、一隻垂（垂嗰隻包咗膠布）
  const earUp = pivot(head, -0.2, 0.22, 0.02);
  earUp.rotation.z = 0.25;
  B(earUp, 0.14, 0.26, 0.08, fur2, 0, 0.12, 0, {}, { line: 0.08 });
  B(earUp, 0.08, 0.16, 0.02, 0xffa4b8, 0, 0.11, -0.045, {}, { r: 0.4 });
  const earFlop = pivot(head, 0.24, 0.18, 0.02);
  earFlop.rotation.z = -1.9;
  B(earFlop, 0.14, 0.26, 0.08, fur2, 0, 0.12, 0, {}, { line: 0.08 });
  const tape = B(earFlop, 0.16, 0.05, 0.1, 0xf5f0e1, 0, 0.1, 0, {}, { r: 0.3 });
  tape.rotation.z = 0.4;
  // 尾（一節節，搖得好快）
  const tail = pivot(body, 0, 0.14, 0.42);
  tail.rotation.x = -0.7;
  const tailSegs = [];
  let parent = tail;
  for (let i = 0; i < 4; i++) {
    const seg = pivot(parent, 0, i ? 0.1 : 0, 0);
    B(seg, 0.1 - i * 0.012, 0.13, 0.1 - i * 0.012, i === 3 ? belly : fur, 0, 0.06, 0, {}, { line: 0.1 });
    tailSegs.push(seg);
    parent = seg;
  }
  S(tailSegs[3], 0.035, 0.035, 0.035, eyeC, 0, 0.14, 0, GLOW(eyeC, 2.4), { lo: true }); // 尾尖發光
  const seed = 1.3;
  const tmp = new THREE.Vector3();
  let lookYaw = 0;
  let lookPitch = 0;
  return {
    g, head,
    // look：玩家喺 local 座標（Echo 面向 -z）
    animate(t, look, dt = 0.016, excited = 0) {
      const b = blinkAt(t, seed);
      for (const e of eyes) e.scale.y = b;
      const wag = Math.sin(t * (12 + excited * 8)) * (0.55 + excited * 0.25);
      tail.rotation.z = wag;
      tailSegs.forEach((s, i) => (s.rotation.z = Math.sin(t * (12 + excited * 8) - i * 0.6) * 0.25));
      body.position.y = 0.62 + Math.sin(t * 2.2) * 0.012; // 呼吸
      body.scale.set(1, 1 + Math.sin(t * 2.2) * 0.015, 1);
      // 間唔中開心跳一跳（「汪！」）
      const hop = Math.max(0, Math.sin(t * 0.9)) ** 30;
      root.position.y = hop * 0.18 + excited * Math.abs(Math.sin(t * 9)) * 0.08;
      tongue.scale.z = 1 + hop * 0.6;
      // 望住你（頭轉，唔轉身）
      let wantYaw = Math.sin(t * 0.5) * 0.25;
      let wantPitch = 0;
      if (look) {
        tmp.copy(look);
        wantYaw = THREE.MathUtils.clamp(Math.atan2(-tmp.x, -tmp.z), -0.9, 0.9);
        wantPitch = THREE.MathUtils.clamp(Math.atan2(tmp.y - 1, Math.hypot(tmp.x, tmp.z)) * 0.5, -0.3, 0.3);
      }
      const k = Math.min(1, dt * 4);
      lookYaw += (wantYaw - lookYaw) * k;
      lookPitch += (wantPitch - lookPitch) * k;
      head.rotation.set(lookPitch, lookYaw, Math.sin(t * 1.3) * 0.12 + hop * 0.15); // 歪頭
      earFlop.rotation.z = -1.9 + Math.sin(t * 3.1) * 0.12 + hop * 0.4;
      earUp.rotation.z = 0.25 + Math.sin(t * 2.3) * 0.05;
      legs.forEach((l) => (l.hip.rotation.x = excited ? Math.sin(t * 14 + l.phase) * 0.15 : 0));
    },
  };
}

// ======================== 🧟 Zombified Chest ========================
// 爛咗嘅綠色木箱 + 鐵箍 + 發光綠色裂紋 + 紫色縫線 + 骷髏仔鎖 + 黏液滴；蓋（lid）可以打開
export function buildZombieChest() {
  const g = new THREE.Group();
  const wood = 0x51703f;
  const wood2 = 0x3d5730;
  const iron = 0x3a3f4a;
  const slime = 0x76ff03;
  const glowMat = new THREE.MeshStandardMaterial({ color: slime, emissive: slime, emissiveIntensity: 2.2, roughness: 0.3 });
  const stitchM = M(0xb388ff, GLOW(0xb388ff, 1.8));
  const base = pivot(g, 0, 0.32, 0);
  B(base, 1.0, 0.6, 0.7, wood, 0, 0, 0, {}, { line: 0.05, r: 0.1 });
  for (const y of [-0.15, 0.05]) B(base, 1.01, 0.03, 0.71, wood2, 0, y, 0, {}, { r: 0.3 }); // 木板坑
  for (const x of [-0.38, 0.38]) B(base, 0.1, 0.62, 0.72, iron, x, 0, 0, { metalness: 0.6, roughness: 0.4 }, { r: 0.2 });
  for (const x of [-0.38, 0.38]) for (const y of [-0.2, 0.2]) S(base, 0.025, 0.025, 0.015, 0x90a4ae, x, y, -0.365, { metalness: 0.8, roughness: 0.3 }, { lo: true }); // 釘
  // 發光裂紋
  const cracks = [];
  for (const [x, y, rz, l] of [[-0.18, -0.08, 0.7, 0.2], [0.14, -0.14, -0.4, 0.16], [0.2, 0.12, 0.3, 0.12]]) cracks.push(B(base, 0.025, l, 0.02, slime, x, y, -0.355, glowMat, { r: 0.4 }));
  cracks.forEach((c, i) => (c.rotation.z = [0.7, -0.4, 0.3][i]));
  // 黏液喺側邊流落嚟
  for (const [x, l] of [[-0.25, 0.14], [0.05, 0.22], [0.27, 0.1]]) limb(base, V(x, 0.3, -0.36), V(x, 0.3 - l, -0.36), 0.025, slime, glowMat);
  // 蓋（pivot 喺後面頂）
  const lid = pivot(g, 0, 0.62, 0.35);
  const lidBody = pivot(lid, 0, 0, -0.35);
  B(lidBody, 1.04, 0.22, 0.74, wood, 0, 0.11, 0, {}, { line: 0.05, r: 0.2 });
  const arch = cyl(lidBody, 0.37, 0.37, 1.03, wood, 0, 0.2, 0, {}, 24);
  arch.rotation.z = PI / 2;
  arch.scale.set(0.45, 1, 1);
  outline(arch, 0.03);
  for (const x of [-0.38, 0.38]) {
    const band = cyl(lidBody, 0.38, 0.38, 0.11, iron, x, 0.2, 0, { metalness: 0.6, roughness: 0.4 }, 24);
    band.rotation.z = PI / 2;
    band.scale.set(0.47, 1, 1.02);
  }
  stitches(lidBody, V(-0.25, 0.33, -0.12), V(0.25, 0.33, -0.12), 6, 0xb388ff, stitchM, 0.08, 0.018);
  // 骷髏仔鎖（可愛）
  const lock = pivot(lidBody, 0, 0.02, -0.38);
  S(lock, 0.11, 0.1, 0.06, 0xf5f0e1, 0, 0, 0, {}, { line: 0.08 });
  B(lock, 0.1, 0.05, 0.05, 0xf5f0e1, 0, -0.08, 0, {}, { r: 0.4 });
  for (const s of [-1, 1]) S(lock, 0.03, 0.035, 0.02, 0x76ff03, s * 0.042, 0.005, -0.055, glowMat, { lo: true });
  // 裏面嘅光（開蓋先見到）
  const innerGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ color: slime, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  innerGlow.rotation.x = -PI / 2;
  innerGlow.position.y = 0.61;
  g.add(innerGlow);
  return { g, lid, base, glowMat, innerGlow, cracks };
}

// ======================== 🏪 舖頭 ========================
function buildStall(scene) {
  const g = new THREE.Group();
  g.position.set(ECHO_STALL.x, 0, ECHO_STALL.z);
  g.rotation.y = STALL_ROT;
  scene.add(g);
  const woodD = 0x4e342e;
  const woodL = 0x795548;
  // 地台
  B(g, 4.4, 0.18, 2.6, 0x3e3346, 0, 0.09, 0, {}, { r: 0.2 });
  // 櫃位（前面紫色 + 橙邊）
  B(g, 3.4, 1.0, 0.9, woodD, 0, 0.68, 0.4, {}, { line: 0.02, r: 0.08 });
  B(g, 3.2, 0.7, 0.04, 0x5e2a84, 0, 0.66, 0.86, {}, { r: 0.2 });
  B(g, 3.5, 0.12, 1.0, woodL, 0, 1.22, 0.4, {}, { r: 0.3 });
  for (const x of [-1.2, 0, 1.2]) {
    const p = pumpkin(g, 0.13, 0xff8f00, x, 0.68, 0.92, {}, { line: 0.05 });
    carvedFace(p, 0.13, 0, -0.12, 0xffe082, { inten: 2.4 });
    p.rotation.y = PI; // 面向 +z（客人嗰邊）
  }
  // 柱 + 條紋簷篷
  for (const x of [-1.9, 1.9]) for (const z of [-0.9, 0.9]) B(g, 0.16, 3.1, 0.16, woodL, x, 1.6, z, {}, { line: 0.05 });
  const awning = pivot(g, 0, 3.15, 0.1);
  awning.rotation.x = 0.28;
  for (let i = 0; i < 8; i++) B(awning, 0.52, 0.08, 2.5, i % 2 ? 0x6a1b9a : 0xff8f00, -1.82 + i * 0.52, 0, 0, i % 2 ? {} : GLOW(0xff6d00, 0.25), { r: 0.3 });
  for (let i = 0; i < 8; i++) { // 簷篷前面一條條三角
    const c = cone(awning, 0.26, 0.3, i % 2 ? 0x6a1b9a : 0xff8f00, -1.82 + i * 0.52, -0.15, 1.25, {}, 3);
    c.rotation.x = PI;
  }
  // 吊住嘅南瓜燈 + 一盞暖光
  const lanterns = [-1.5, 1.5].map((x) => {
    const h = pivot(g, x, 2.95, 1.1);
    limb(h, V(0, 0, 0), V(0, -0.35, 0), 0.01, 0x212121, {});
    const p = pumpkin(h, 0.17, 0xff9100, 0, -0.5, 0, {}, { line: 0.05 });
    carvedFace(p, 0.17, 0, -0.15, 0xffe082, { inten: 3 });
    p.rotation.y = PI;
    return h;
  });
  const lamp = new THREE.PointLight(0xffa040, 10, 14, 1.6);
  lamp.position.set(0, 2.4, 1.4);
  g.add(lamp);
  const lamp2 = new THREE.PointLight(0x76ff03, 4, 6, 1.6); // 箱嘅綠光
  lamp2.position.set(1.0, 1.9, 0.6);
  g.add(lamp2);
  // 櫃面：展示用嘅 Zombified Chest + 一樽 Candy Corn
  const display = buildZombieChest();
  display.g.scale.setScalar(0.85);
  display.g.position.set(0.95, 1.28, 0.35);
  display.g.rotation.y = PI;
  g.add(display.g);
  const jar = pivot(g, -1.3, 1.28, 0.45);
  cyl(jar, 0.2, 0.2, 0.42, 0xe0f7fa, 0, 0.21, 0, { transparent: true, opacity: 0.35, roughness: 0.05 }, 20);
  cyl(jar, 0.17, 0.17, 0.08, 0x6a1b9a, 0, 0.46, 0, {}, 20);
  for (let i = 0; i < 9; i++) {
    const c = candyCorn(jar, 0.06, Math.cos(i * 2.1) * 0.09, 0.08 + (i % 3) * 0.1, Math.sin(i * 2.1) * 0.09);
    c.rotation.set(i, i * 2, 0);
  }
  // 招牌
  const sign = makeSign([{ text: "🐕 ECHO'S CHEST SHOP", size: 0.34 }, { text: `🧟 Zombified Chest · ${ZOMBIE_CHEST_COST} ${CANDY} Candy Corn`, size: 0.2 }], 3.8, 1.0, THEMES.purple);
  sign.material.fog = false;
  sign.position.set(0, 3.9, 1.0); // 面向 +z（客人嗰邊）
  g.add(sign);
  const signBack = sign.clone();
  signBack.rotation.y = PI;
  signBack.position.z = 0.98;
  g.add(signBack);
  // 地上發光圈（企喺度撳 E）
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 40), new THREE.MeshBasicMaterial({ color: 0x76ff03, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -PI / 2;
  ring.position.set(0, 0.2, 2.6);
  g.add(ring);
  // 🐕 Echo 企喺櫃面左邊（望住客人）
  const echo = buildEcho();
  echo.g.position.set(-0.35, 1.28, 0.35);
  echo.g.rotation.y = PI;
  echo.g.scale.setScalar(1.05);
  g.add(echo.g);
  const label = makeLabel([{ text: '🐕 ECHO', color: '#b9f6ca' }, { text: `Zombified Chest · ${ZOMBIE_CHEST_COST} ${CANDY}`, color: '#ffd54f' }], 0.7);
  label.material.fog = false;
  label.material.depthTest = false; // 唔好俾簷篷遮住
  label.position.set(-0.35, 3.0, 0.6);
  g.add(label);
  return { g, echo, display, lanterns, ring, label };
}

// ======================== 🛒 面板 ========================
let chestPic = null;
function chestPicture() {
  if (chestPic) return chestPic;
  try {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(240, 200, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.setClearColor(0, 0);
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.4));
    const d = new THREE.DirectionalLight(0xffffff, 2);
    d.position.set(2, 4, -4);
    s.add(d);
    const c = buildZombieChest();
    c.g.rotation.y = 0.5;
    s.add(c.g);
    const cam = new THREE.PerspectiveCamera(32, 240 / 200, 0.1, 50);
    cam.position.set(-1.1, 1.5, -2.4);
    cam.lookAt(0, 0.45, 0);
    r.render(s, cam);
    chestPic = r.domElement.toDataURL();
    r.dispose();
    r.forceContextLoss();
  } catch {
    chestPic = '';
  }
  return chestPic;
}

const pct = (n) => `${n}%`;
function shopHtml() {
  const cc = candyCornOf();
  const can = cc >= ZOMBIE_CHEST_COST;
  const pic = chestPicture();
  const rows = ZOMBIE_CHEST_DROPS.map((d) => {
    const r = rarityInfo(d.rarity);
    const color = r.color === '#cfd8dc' ? '#90a4ae' : r.color;
    const isCandy = d.name === 'Candy Corn';
    const art = isCandy ? `<div class="pet-pic" style="--pic-bg:${r.color}"><span class="emoji">${CANDY}</span></div>` : petPic(d.name, { rarity: d.rarity });
    const what = isCandy ? `${ZOMBIE_CHEST_CANDY[0]}–${ZOMBIE_CHEST_CANDY[1]} Candy Corn` : `${findAnimal(d.name)?.emoji || ''} ${d.name}`;
    const owned = !isCandy && state.indexFound.includes(d.name) ? ' ✅' : '';
    return `<div class="echo-drop" style="--c:${color}">${art}
      <div class="echo-drop-text"><b>${what}${owned}</b><small style="color:${color}">${d.rarity.toUpperCase()}</small>
      <div class="echo-bar"><div style="width:${Math.max(2, d.chance)}%"></div></div></div>
      <span class="echo-pct" style="color:${color}">${pct(d.chance)}</span></div>`;
  }).join('');
  return `<p class="index-summary">${CANDY} You have <b>${short(cc)} Candy Corn</b></p>
    <div class="echo-shop">
      <div class="card-animal echo-chest-card">
        ${pic ? `<img class="echo-chest-img" src="${pic}" alt="">` : '<div class="emoji">🧰</div>'}
        <b>🧟 ZOMBIFIED CHEST</b>
        <span class="kg">${CANDY} ${ZOMBIE_CHEST_COST} Candy Corn</span>
        <p>Open it to find Candy Corn or a NEW spooky pet!</p>
        <div class="pet-actions"><button data-echo="buy" ${can ? '' : 'disabled class="grey"'}>${can ? `🧟 Open a chest (${ZOMBIE_CHEST_COST} ${CANDY})` : `Need ${short(ZOMBIE_CHEST_COST - cc)} more ${CANDY}`}</button></div>
      </div>
      <div class="echo-drops"><h3>What's inside?</h3>${rows}</div>
    </div>
    <p class="hint">🐕 Echo says: "Woof! I found these chests in the old manor. ${can ? 'Want to open one? Woof woof!' : 'Bring me Candy Corn - you can get it by fishing at the lake!'}"</p>`;
}
extraPanels.echo = ["🐕 Echo's Zombified Chest Shop", shopHtml, 'E'];

const CSS = `
.echo-shop { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-start; }
.echo-chest-card { flex: 0 0 220px; border-color: #76ff03 !important; box-shadow: 0 0 18px rgba(118,255,3,0.35); }
.echo-chest-img { width: 100%; height: auto; display: block; filter: drop-shadow(0 0 10px rgba(118,255,3,0.6)); }
.echo-drops { flex: 1 1 280px; min-width: 0; }
.echo-drops h3 { margin: 0 0 6px; }
.echo-drop { display: flex; align-items: center; gap: 10px; padding: 6px 8px; margin-bottom: 6px; border-radius: 12px; border: 2px solid var(--c); background: color-mix(in srgb, var(--c) 14%, #ffffff); }
.echo-drop .pet-pic { width: 64px; height: 52px; flex: 0 0 64px; }
.echo-drop .pet-pic .emoji { font-size: 30px; }
.echo-drop-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.echo-drop-text small { font-weight: 900; letter-spacing: 1px; }
.echo-bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.15); overflow: hidden; }
.echo-bar div { height: 100%; background: var(--c); box-shadow: 0 0 8px var(--c); }
.echo-pct { font-size: 22px; font-weight: 900; min-width: 52px; text-align: right; }
#echo-reveal { position: fixed; left: 0; right: 0; top: 13vh; z-index: 40; text-align: center; pointer-events: none; font-family: "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif; opacity: 0; }
#echo-reveal.show { animation: echo-pop 0.7s cubic-bezier(.2,1.6,.4,1) forwards; }
#echo-reveal .er-rarity { font-size: clamp(24px, 4.6vw, 50px); font-weight: 900; color: var(--c); letter-spacing: 6px; -webkit-text-stroke: 2px rgba(0,0,0,0.6); text-shadow: 0 0 24px var(--c), 0 0 48px var(--c); }
#echo-reveal .er-name { font-size: clamp(30px, 6.4vw, 70px); font-weight: 900; color: #fff; -webkit-text-stroke: 3px rgba(0,0,0,0.7); text-shadow: 0 6px 0 rgba(0,0,0,0.5), 0 0 30px var(--c); line-height: 1.05; }
#echo-reveal .er-sub { margin-top: 8px; font-size: clamp(16px, 2.6vw, 26px); font-weight: 800; color: #fff; text-shadow: 0 2px 6px #000; }
#echo-reveal.mythic .er-rarity { background: linear-gradient(90deg, #ff4081, #ffd740, #69f0ae, #40c4ff, #b388ff, #ff4081); background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-stroke: 0; text-shadow: none; filter: drop-shadow(0 0 6px #fff) drop-shadow(0 0 18px #ff4081); animation: echo-rainbow 1.2s linear infinite, echo-throb 0.5s ease-in-out infinite alternate; display: inline-block; }
#echo-reveal.mythic .er-name { animation: echo-throb 0.6s ease-in-out infinite alternate; }
#echo-flash { position: fixed; inset: 0; z-index: 39; pointer-events: none; background: #fff; opacity: 0; }
#echo-flash.on { animation: echo-flash 0.9s ease-out; }
#echo-dark { position: fixed; inset: 0; z-index: 30; pointer-events: none; background: radial-gradient(circle, transparent 30%, rgba(30,0,40,0.85) 100%); opacity: 0; transition: opacity 0.8s; }
@keyframes echo-pop { 0% { opacity: 0; transform: scale(0.3); } 100% { opacity: 1; transform: scale(1); } }
@keyframes echo-rainbow { to { background-position: 300% 0; } }
@keyframes echo-throb { from { transform: scale(1); } to { transform: scale(1.08); } }
@keyframes echo-flash { 0% { opacity: 0.95; } 100% { opacity: 0; } }
`;
function ensureDom() {
  if ($('echo-reveal')) return;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  for (const id of ['echo-reveal', 'echo-flash', 'echo-dark']) {
    const d = document.createElement('div');
    d.id = id;
    document.body.appendChild(d);
  }
}

// ======================== 主程式 ========================
export function createEchoShop({ scene, camera, openShop, teleport, resume, popup, announce }) {
  ensureDom();
  const stall = buildStall(scene);
  const api = { busy: false };
  const local = new THREE.Vector3();
  let excited = 0;

  api.update = (dt, t, camPos) => {
    const show = halloween.sky > 0.02;
    stall.g.visible = show;
    if (!show) return;
    const near = Math.hypot(camPos.x - ECHO_STALL.x, camPos.z - ECHO_STALL.z) < 12;
    local.copy(camPos);
    stall.echo.g.worldToLocal(local);
    excited = Math.max(0, excited - dt * 0.5);
    stall.echo.animate(t, near ? local : null, dt, Math.min(1, excited));
    stall.lanterns.forEach((l, i) => (l.rotation.z = Math.sin(t * 1.4 + i * 2) * 0.08));
    stall.ring.material.opacity = 0.4 + Math.sin(t * 3) * 0.2;
    stall.label.visible = !api.busy; // 開箱動畫：收埋名牌（佢永遠喺最前面，會遮住寵物）
    // 展示箱：輕輕搖 + 綠光閃
    const d = stall.display;
    const w = Math.max(0, Math.sin(t * 1.6)) ** 6;
    d.g.rotation.z = Math.sin(t * 20) * 0.04 * w;
    d.lid.rotation.x = w * 0.12;
    d.glowMat.emissiveIntensity = 1.8 + Math.sin(t * 3) * 0.6;
    d.innerGlow.material.opacity = w * 0.9;
  };

  api.interaction = (pos) => {
    if (api.busy) return null;
    if (Math.hypot(pos.x - SHOP_SPOT.x, pos.z - SHOP_SPOT.z) > 2.6 && Math.hypot(pos.x - ECHO_STALL.x, pos.z - ECHO_STALL.z) > 2.8) return null;
    return { prompt: `<kbd>E</kbd> 🐕 Talk to Echo: buy a 🧟 Zombified Chest (${ZOMBIE_CHEST_COST} ${CANDY})`, action: () => { excited = 2; play('boing'); openShop(); } };
  };

  // 買箱（forced = 測試用：直接指定開到乜，例如 'Soul Phantom'）
  function buy(forced = null) {
    if (api.busy) return;
    if (!forced && candyCornOf() < ZOMBIE_CHEST_COST) return popup(`${CANDY} You need ${ZOMBIE_CHEST_COST} Candy Corn for a Zombified Chest!`);
    if (!forced) state.candyCorn = candyCornOf() - ZOMBIE_CHEST_COST;
    const drop = forced ? { ...ZOMBIE_CHEST_DROPS.find((d) => d.name === forced) } : rollZombieChest();
    if (drop.name === 'Candy Corn' && !drop.candy) drop.candy = Math.round((ZOMBIE_CHEST_CANDY[0] + ZOMBIE_CHEST_CANDY[1]) / 2);
    // 先俾獎（就算跳過動畫都唔會唔見）
    let reward = 0;
    if (drop.candy) {
      state.candyCorn = candyCornOf() + drop.candy;
    } else {
      const info = findAnimal(drop.name);
      state.pets.push({ name: drop.name, biome: info?.biome ?? 9, kg: info ? randomKg(info) : 1, rarity: drop.rarity, onPlot: false });
      if (!state.indexFound.includes(drop.name)) {
        state.indexFound.push(drop.name);
        reward = INDEX_NEW_SPECIES_REWARD[info?.biome ?? 9] || 0;
        state.money += reward;
      }
    }
    save();
    if (panelKind() === 'echo') closePanel();
    excited = 3;
    openAnimation(drop, reward);
  }
  api.buy = buy;
  $('panel-body').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-echo="buy"]');
    if (!b || panelKind() !== 'echo') return;
    buy();
  });

  // ---------- 🎬 開箱動畫 ----------
  function openAnimation(drop, reward) {
    api.busy = true;
    const back = { x: camera.position.x, z: camera.position.z, rot: camera.rotation.clone() };
    const mythic = drop.rarity === 'Mythic';
    const legendary = drop.rarity === 'Legendary';
    const big = mythic || legendary;
    const colorHex = drop.candy ? 0xffa000 : new THREE.Color(rarityInfo(drop.rarity).color).getHex();
    const rc = new THREE.Color(colorHex);
    const slime = new THREE.Color(0x76ff03);
    const T = mythic ? 11 : legendary ? 9 : 7.5; // 全長
    const TB = mythic ? 5.2 : legendary ? 3.8 : 3.0; // 幾時爆開
    // 位置：舖頭前面空地
    const P = V(ECHO_STALL.x + FRONT.x * 4.8, 0, ECHO_STALL.z + FRONT.z * 4.8);
    const fx = new THREE.Group();
    fx.position.copy(P);
    fx.rotation.y = STALL_ROT + PI; // 箱前面（-z）望住舖頭外面（鏡頭嗰邊）
    scene.add(fx);
    const chest = buildZombieChest();
    chest.g.scale.setScalar(1.4);
    fx.add(chest.g);
    const glow = new THREE.PointLight(0x76ff03, 0, 12, 1.5);
    glow.position.set(0, 1.4, -0.8);
    fx.add(glow);
    // 地上光圈
    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.8, 48), ringMat);
    ring.rotation.x = -PI / 2;
    ring.position.y = 0.05;
    fx.add(ring);
    // 光柱
    const beamMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.9, 40, 24, 1, true), beamMat);
    beam.position.y = 20;
    fx.add(beam);
    // 爆開嘅閃光波波
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), flashMat);
    flash.position.y = 1;
    fx.add(flash);
    // Mythic：幾個彩虹圈
    const halos = mythic ? [0xff4081, 0xffd740, 0x40c4ff, 0xb388ff].map((c, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(2.0 + i * 0.4, 0.05, 8, 64), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.y = 1.4;
      fx.add(m);
      return m;
    }) : [];
    // 粒子
    const parts = [];
    const partGeo = new THREE.OctahedronGeometry(0.09);
    function burst(n, speed, colors, up = 4) {
      for (let i = 0; i < n; i++) {
        const c = colors[i % colors.length];
        const m = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
        m.position.set(0, 1.0, 0);
        fx.add(m);
        const a = Math.random() * PI * 2;
        const sp = speed * (0.4 + Math.random() * 0.8);
        parts.push({ m, v: V(Math.cos(a) * sp, up * (0.5 + Math.random()), Math.sin(a) * sp), life: 1.4 + Math.random() * 0.8, t: 0, spin: Math.random() * 10 });
      }
    }
    // 開出嚟嘅嘢（寵物模型／一堆 Candy Corn）
    const prizeH = drop.candy ? 0.9 : mythic ? 2.4 : legendary ? 2.2 : 1.7; // 幾高（米）
    const prize = new THREE.Group();
    prize.visible = false;
    fx.add(prize);
    api.last = { fx, prize, chest }; // 測試用（console 睇得到）
    let prizeAnim = null;
    if (drop.candy) {
      candyCorn(prize, 0.8, 0, 0.1, 0); // 底喺 0，頂大概 0.85 米
      const small = [];
      for (let i = 0; i < 14; i++) {
        const c = candyCorn(fx, 0.12, 0, 0, 0);
        c.visible = false;
        const a = (i / 14) * PI * 2;
        small.push({ c, v: V(Math.cos(a) * (1.2 + Math.random()), 4 + Math.random() * 2.5, Math.sin(a) * (1.2 + Math.random())), r: Math.random() * 6 });
      }
      prizeAnim = (k, dt) => {
        for (const s of small) {
          s.c.visible = true;
          if (s.c.position.y <= 0.1 && s.v.y < 0) continue;
          s.v.y -= 9.8 * dt;
          s.c.position.addScaledVector(s.v, dt);
          if (s.c.position.y < 0.1) s.c.position.y = 0.1;
          s.c.rotation.set(s.r * k * 3, s.r, 0);
        }
      };
    } else {
      try {
        const m = buildAnimalModel(findAnimal(drop.name));
        const box = new THREE.Box3().setFromObject(m);
        const h = prizeH;
        m.scale.multiplyScalar(h / Math.max(0.01, box.max.y - box.min.y));
        prize.add(m);
        prizeAnim = (k, dt, t) => m.userData.animate?.(t, 0);
      } catch (e) {
        console.warn('chest prize model failed', e);
        // 模型出錯：淨係顯示大字
      }
    }
    // 大字
    const reveal = $('echo-reveal');
    const dark = $('echo-dark');
    reveal.className = '';
    reveal.style.setProperty('--c', drop.candy ? '#ffb300' : rarityInfo(drop.rarity).color);
    const info = findAnimal(drop.name);
    reveal.innerHTML = drop.candy
      ? `<div class="er-rarity">COMMON</div><div class="er-name">+${short(drop.candy)} ${CANDY} CANDY CORN</div><div class="er-sub">Echo wags his tail. Try again for a pet!</div>`
      : `<div class="er-rarity">${mythic ? '✨ MYTHIC ✨' : drop.rarity.toUpperCase()}</div><div class="er-name">${info?.emoji || ''} ${drop.name.toUpperCase()}!</div><div class="er-sub">${reward ? `NEW in your Index! +$${short(reward)} · ` : ''}It's in your backpack 🎒</div>`;
    // 鏡頭：舖頭外面望住個箱，慢慢推近；Mythic 爆開之後圍住轉
    const camAt = (dist, h, side = 0) => V(P.x + FRONT.x * dist + SIDE.x * side, h, P.z + FRONT.z * dist + SIDE.z * side); // 箱再出去（舖頭前面方向）
    const cam = { p: camAt(7, 3.2, 1.4), l: V(P.x, 1.0, P.z) }; // 每格自己計（shots 用同一個）
    const smooth = (k) => k * k * (3 - 2 * k);
    const startY = 9;
    let landed = false;
    let burstDone = false;
    play('swoosh');
    if (mythic || legendary) setTimeout(() => play('drumroll'), 900);
    playMovie(camera, {
      length: T,
      skipText: 'Click or press any key to skip ▶',
      shots: [[0, T, cam, cam]],
      captions: [
        [0.2, '🧟 The Zombified Chest is coming...'],
        [1.2, mythic ? '😱 The chest is going CRAZY...' : legendary ? '✨ Something shiny is inside...' : '🫨 It is shaking...'],
        [TB + 0.3, ''],
      ],
      update(t, dt) {
        // 1) 跌落嚟
        const fall = Math.min(1, t / 0.7);
        chest.g.position.y = startY * (1 - fall * fall);
        if (!landed && fall >= 1) {
          landed = true;
          shake(0.35);
          play('slam');
          burst(12, 3, [0x76ff03, 0xb388ff], 1.5);
        }
        // 2) 震 + 發光（越嚟越勁，顏色由綠變稀有度色）
        if (!burstDone) {
          const k = THREE.MathUtils.clamp((t - 0.8) / (TB - 0.8), 0, 1);
          const amp = 0.02 + k * k * (mythic ? 0.28 : 0.18);
          const fr = 18 + k * 30;
          chest.g.rotation.z = Math.sin(t * fr) * amp;
          chest.g.rotation.x = Math.cos(t * fr * 0.8) * amp * 0.5;
          if (mythic) chest.g.position.y += k * k * 1.2; // Mythic：浮上半空
          chest.lid.rotation.x = Math.max(0, Math.sin(t * fr * 0.5)) * k * 0.25;
          const c = slime.clone().lerp(rc, k);
          chest.glowMat.color.copy(c);
          chest.glowMat.emissive.copy(c);
          chest.glowMat.emissiveIntensity = 2 + k * 4;
          chest.innerGlow.material.color.copy(c);
          chest.innerGlow.material.opacity = k;
          glow.color.copy(c);
          glow.intensity = k * (big ? 30 : 18);
          ringMat.color.copy(c);
          ringMat.opacity = k * 0.8;
          ring.rotation.z = t * 2;
          if (k > 0 && Math.random() < dt * (6 + k * 30)) burst(1, 1.5, [c.getHex()], 2.5);
          if (mythic) {
            dark.style.opacity = String(Math.min(1, k * 1.4));
            halos.forEach((h, i) => {
              h.material.opacity = k * 0.8;
              h.rotation.set(t * (1 + i * 0.4), t * (0.7 + i * 0.3), 0);
            });
          }
          if (t > 1 && once('rumble')) play('rumble');
        }
        // 3) 爆開！
        if (!burstDone && t >= TB) {
          burstDone = true;
          shake(mythic ? 0.9 : big ? 0.6 : 0.4);
          play('boom');
          setTimeout(() => play(drop.candy ? 'coin' : big ? 'magic' : 'crystal'), 250);
          setTimeout(() => play('rescue'), 700);
          const f = $('echo-flash');
          f.classList.remove('on');
          void f.offsetWidth;
          f.classList.add('on');
          burst(mythic ? 70 : big ? 45 : 30, mythic ? 7 : 5, mythic ? [0xff4081, 0xffd740, 0x69f0ae, 0x40c4ff, 0xb388ff] : [colorHex, 0xffffff, 0x76ff03], 6);
          prize.visible = true;
          reveal.className = mythic ? 'show mythic' : 'show';
          chest.g.rotation.set(0, 0, 0);
        }
        if (burstDone) {
          const k = t - TB; // 爆咗幾耐
          // 蓋飛走
          chest.lid.rotation.x = Math.min(2.0, k * 9);
          chest.lid.position.y = 0.62 + Math.min(1, k * 2) * 0.1;
          flash.scale.setScalar(0.5 + k * (mythic ? 9 : 6));
          flashMat.opacity = Math.max(0, 0.9 - k * 1.6);
          beamMat.opacity = Math.max(0.05, Math.min(0.22, k * 2) - Math.max(0, k - 1) * 0.1) * (big ? 1 : 0.7);
          beam.rotation.y = t;
          ringMat.color.setHex(colorHex);
          ringMat.opacity = 0.8;
          // 爆完：燈變白啲、移去寵物前面（寵物照返自己嘅顏色，唔會俾稀有度色蓋晒）
          glow.color.copy(rc).lerp(WHITE, 0.7);
          glow.position.set(0, prize.position.y + prizeH * 0.6, -2.6);
          glow.intensity = Math.max(5, 16 - k * 10) * (mythic ? 0.6 : 1);
          chest.innerGlow.material.color.setHex(colorHex);
          chest.glowMat.color.setHex(colorHex);
          chest.glowMat.emissive.setHex(colorHex);
          chest.glowMat.emissiveIntensity = 2;
          // 寵物／Candy Corn 由箱度升上嚟、轉圈
          if (mythic) chest.g.position.y = 1.2; // Mythic：箱繼續浮喺半空
          const rise = Math.min(1, k / 0.8);
          const ease = 1 - (1 - rise) ** 3;
          const baseY = chest.g.position.y + 0.62 * chest.g.scale.y; // 箱頂
          prize.position.y = baseY + ease * (drop.candy ? 0.6 : 0.3);
          prize.scale.setScalar(Math.max(0.01, ease));
          prize.rotation.y = rise < 1 ? (1 - ease) * PI * 4 : Math.sin(k * 1.4) * 0.4;
          prizeAnim?.(k, dt, t);
          if (mythic) {
            dark.style.opacity = String(Math.max(0, 1 - k * 0.3));
            halos.forEach((h, i) => {
              h.material.opacity = 0.5;
              h.scale.setScalar(1 + Math.min(1, k) * 0.4 + Math.sin(t * 3 + i) * 0.05);
              h.position.y = prize.position.y + 1;
              h.rotation.set(t * (1 + i * 0.4), t * (0.7 + i * 0.3), 0);
            });
            if (Math.random() < dt * 12) burst(2, 4, [0xff4081, 0xffd740, 0x69f0ae, 0x40c4ff, 0xb388ff], 5);
          } else if (big && Math.random() < dt * 6) burst(1, 3, [colorHex, 0xffffff], 4);
        }
        // 🎥 鏡頭：爆開之前慢慢推近個箱；爆開之後退後少少，影晒成隻寵物（大字喺上面，寵物喺下半）
        if (!burstDone) {
          const s = smooth(Math.min(1, t / TB));
          cam.p.copy(camAt(7 - 2.6 * s, 3.2 - 1.0 * s, 1.4 - 0.9 * s));
          cam.l.set(P.x, chest.g.position.y + 0.9 + (1 - s) * 0.3, P.z);
        } else {
          const e = smooth(Math.min(1, (t - TB) / 1.2));
          const center = prize.position.y + prizeH * 0.5;
          const dist = 4.4 + (Math.max(3.8, prizeH * 1.3 + 1.4) - 4.4) * e;
          const a = mythic ? Math.sin((t - TB) * 0.45) * 0.55 : 0.12 * e; // Mythic：左右慢慢擺
          const dir = V(FRONT.x * Math.cos(a) + SIDE.x * Math.sin(a), 0, FRONT.z * Math.cos(a) + SIDE.z * Math.sin(a));
          const want = V(P.x + dir.x * dist, 2.2 + (center + 0.4 - 2.2) * e, P.z + dir.z * dist);
          cam.p.lerp(want, Math.min(1, dt * 6));
          cam.l.lerp(V(P.x, center + 0.3 + prizeH * 0.2, P.z), Math.min(1, dt * 6)); // 望高少少：寵物喺畫面下半，上面留位俾大字
        }
        // 粒子
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.t += dt;
          p.v.y -= 6 * dt;
          p.m.position.addScaledVector(p.v, dt);
          p.m.rotation.set(p.t * p.spin, p.t * p.spin * 0.7, 0);
          p.m.material.opacity = Math.max(0, 1 - p.t / p.life);
          if (p.t > p.life) {
            fx.remove(p.m);
            p.m.material.dispose();
            parts.splice(i, 1);
          }
        }
        return null;
      },
      onDone() {
        scene.remove(fx);
        for (const o of [ring, beam, flash, ...halos]) { // 共用（cache）嘅形狀唔好 dispose；淨係 dispose 動畫自己整嘅
          o.geometry.dispose();
          o.material.dispose();
        }
        for (const p of parts) p.m.material.dispose();
        partGeo.dispose();
        reveal.className = '';
        dark.style.opacity = '0';
        api.busy = false;
        teleport(back.x, back.z);
        camera.rotation.copy(back.rot);
        resume();
        if (drop.candy) announce(`🧟 Zombified Chest: +${short(drop.candy)} ${CANDY} Candy Corn! (You have ${short(candyCornOf())})`);
        else {
          announce(`🧟 Zombified Chest: you got a ${drop.rarity.toUpperCase()} ${drop.name}! It's in your backpack - put it on your Plot in the Hub!`);
          if (reward) setTimeout(() => popup(`📖 New Halloween pet in your Index! +$${short(reward)}`), 1200);
        }
      },
    });
  }
  api.open = (name) => buy(name); // 測試：game.echo.open('Soul Phantom')
  return api;
}
