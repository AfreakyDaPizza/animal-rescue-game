// 🐕 Echo 隻狗 + 🧟 Zombified Chest 舖（小朋友 Issue #8）
// 「Spawn Ruins 開頭有隻叫 ECHO 嘅狗，用 Candy Corn 賣新嘅 ZOMBIFIED CHEST，500 Candy Corn 一個」
//
// - Echo：方塊風格嘅鬼魂狗（2026-10-22 小朋友改：半透明發淡青光、後面係條鬼尾、浮喺半空），企喺自己個小舖頭度，搖尾、歪頭、望住你
// - 撳 E → 面板：見到你有幾多 🌽 Candy Corn、箱嘅價錢、開到乜嘢（機會率）
// - 買（小朋友 2026-10-22：可以一次過買 x1／x5／x10／x25／MAX）→ 箱入背包（Gear 'zombieChest'）
//   放上快捷欄撳滑鼠／E 開（chests.js：開箱動畫、俾獎都喺嗰度）
//
// main.js 用法：
//   const echo = createEchoShop({ scene, openShop, popup }) // 第一次入 Halloween 世界先起
//   echo.update(dt, time, camera.position)  // 每格畫面（搖尾、望住你）
//   echo.interaction(pos) → { prompt, action } | null
//   giveCandyCorn(n)                        // 測試用（window.game.candy）

import * as THREE from 'three';
import { state, save } from './state.js';
import { ZOMBIE_CHEST_COST, ZOMBIE_CHEST_CANDY, ZOMBIE_CHEST_DROPS, rarityInfo } from './data/balance.js';
import { findAnimal } from './data/animals.js';
import { addGear, gearCount } from './data/gears.js';
import { bulkButtons, bulkCount } from './bulkBuy.js';
import { HW_X, RUINS } from './halloweenShape.js';
import { halloween } from './halloweenWorld.js';
import { extraPanels, panelKind, openPanel, renderHotbar } from './hud.js';
import { petPic } from './animalPics.js';
import { makeLabel, makeSign, THEMES } from './signs.js';
import { short } from './format.js';
import { play } from './sound.js';
import { V, M, GLOW, B, S, pivot, cone, cyl, torus, tube, limb, bigEyes, smile, stitches, blinkAt, pumpkin, carvedFace, candyCorn, outline } from './echoPetModels.js';

const PI = Math.PI;
const $ = (id) => document.getElementById(id);

// 📍 舖頭位置：出生點東北面，面向你一到埗企嘅位（HW_ARRIVE）
export const ECHO_STALL = { x: HW_X + 10, z: RUINS.z - 9 };
const STALL_ROT = Math.atan2(HW_X - ECHO_STALL.x, 4 - ECHO_STALL.z); // 舖頭前面（local +z）望住出生點
const FRONT = V(Math.sin(STALL_ROT), 0, Math.cos(STALL_ROT));
const SHOP_SPOT = { x: ECHO_STALL.x + FRONT.x * 2.6, z: ECHO_STALL.z + FRONT.z * 2.6 }; // 企喺度撳 E
const CANDY = '🌽'; // 同釣魚一致

export const candyCornOf = () => state.candyCorn || 0;
export function giveCandyCorn(n = 5000) {
  state.candyCorn = candyCornOf() + n;
  save();
  return state.candyCorn;
}

// ======================== 👻🐕 Echo（鬼魂狗）========================
// 小朋友 2026-10-22：「Echo should be a ghost dog」
// 半透明、發淡青色光嘅狗仔：前面兩隻腳浮浮吓，後面冇腳，身慢慢收窄變成一條飄吓飄吓嘅「鬼尾」；
// 發光眼、頸圈 + 糖果粟米牌（保留）；成隻浮喺半空上上落落，尾搖嚟搖去，後面拖住啲細光點（Bloom 會令佢發光）
// 面向 -z；回傳 { g, head, animate(t, look, dt, excited) }（同以前一樣，舖頭／任務攤位都用）
let sparkTex = null;
function sparkTexture() {
  if (sparkTex) return sparkTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  sparkTex = new THREE.CanvasTexture(c);
  return sparkTex;
}
export function buildEcho() {
  const g = new THREE.Group();
  const root = pivot(g); // 成隻浮上浮落
  const spirit = 0x8cf2e6; // 淡青色鬼魂
  const glowC = 0x64ffda;
  const eyeC = 0x18ffff;
  // 鬼魂材質：半透明 + 自己發光（越後越透明）
  const ghostM = (o, i = 0.55, c = spirit) => new THREE.MeshStandardMaterial({ color: c, emissive: glowC, emissiveIntensity: i, transparent: true, opacity: o, roughness: 0.55, depthWrite: false });
  const addM = (c, o = 0.85) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
  const bodyM = ghostM(0.76, 0.22);
  const lightM = ghostM(0.86, 0.35, 0xd8fffa); // 嘴、肚（白啲）
  const earM = ghostM(0.84, 0.3, 0x80deea);
  // 身（前面圓碌碌，後面收窄）
  const body = pivot(root, 0, 0.62, 0.05);
  B(body, 0.6, 0.48, 0.66, spirit, 0, 0, -0.04, bodyM, { r: 0.42 });
  B(body, 0.46, 0.36, 0.3, spirit, 0, 0, 0.34, bodyM, { r: 0.45 }); // 後面細啲
  B(body, 0.42, 0.18, 0.5, 0xe8fffc, 0, -0.17, -0.08, lightM, { r: 0.45 });
  // 心口有團細光（好似鬼魂嘅「心」）
  const heart = S(body, 0.09, 0.09, 0.09, 0x84ffff, 0, 0.02, -0.08, addM(0x18ffff, 0.22), { lo: true });
  // 前面 2 隻浮浮吓嘅腳（腳尖淡出）
  const legs = [-0.17, 0.17].map((x, i) => {
    const hip = pivot(body, x, -0.16, -0.22);
    B(hip, 0.16, 0.3, 0.17, spirit, 0, -0.14, 0, bodyM, { r: 0.45 });
    B(hip, 0.18, 0.1, 0.2, 0xe8fffc, 0, -0.31, -0.02, ghostM(0.55, 0.8, 0xe8fffc), { r: 0.45 });
    return { hip, phase: i * PI };
  });
  // 後面：冇腳，變成一條鬼尾（一粒粒越嚟越細、越嚟越透明，尾尖發光）
  const tail = pivot(body, 0, -0.04, 0.46);
  const tailSegs = [];
  let parent = tail;
  for (let i = 0; i < 6; i++) {
    const seg = pivot(parent, 0, 0, i ? 0.13 - i * 0.006 : 0);
    const r = 0.2 - i * 0.03;
    S(seg, r, r * 0.85, r * 1.1, spirit, 0, 0, 0.04, ghostM(0.72 - i * 0.09, 0.35 + i * 0.15), { lo: i > 2 });
    tailSegs.push(seg);
    parent = seg;
  }
  S(tailSegs[5], 0.05, 0.05, 0.05, eyeC, 0, 0.03, 0.1, addM(eyeC, 0.9), { lo: true });
  // 頸圈 + 糖果粟米牌（保留）
  const neck = pivot(body, 0, 0.16, -0.36);
  torus(neck, 0.2, 0.035, 0x7c4dff, 0, 0, 0, GLOW(0x7c4dff, 0.6)).rotation.x = PI / 2 - 0.4;
  const tag = candyCorn(neck, 0.075, 0, -0.14, -0.19);
  tag.rotation.x = PI;
  // 頭
  const head = pivot(body, 0, 0.36, -0.44);
  B(head, 0.58, 0.5, 0.5, spirit, 0, 0, 0, bodyM, { r: 0.42 });
  B(head, 0.34, 0.22, 0.24, 0xe8fffc, 0, -0.13, -0.29, lightM, { r: 0.45 }); // 嘴
  S(head, 0.085, 0.06, 0.06, 0x1a2a40, 0, -0.04, -0.42, { roughness: 0.15 }); // 鼻
  S(head, 0.025, 0.016, 0.012, 0xffffff, -0.025, -0.02, -0.475, GLOW(0xffffff, 0.6), { lo: true });
  smile(head, -0.05, -0.17, -0.41, 0.05, 0x1a2a40, {}, 2.3);
  smile(head, 0.05, -0.17, -0.41, 0.05, 0x1a2a40, {}, 2.3);
  const tongue = B(head, 0.09, 0.03, 0.12, 0xff80ab, 0, -0.24, -0.38, GLOW(0xff4081, 0.3), { r: 0.45 });
  tongue.rotation.x = 0.5;
  const eyes = bigEyes(head, 0.14, 0.06, -0.25, 0.1, eyeC, { glow: true, glowI: 2.6, pupil: 0x003c4f });
  for (const s of [-1, 1]) S(head, 0.05, 0.03, 0.02, 0xff80ab, s * 0.21, -0.07, -0.25, ghostM(0.6, 0.6, 0xff80ab), { lo: true }); // 面珠
  // 耳：兩隻軟軟垂低（鬼魂狗仔好乖）
  const ears = [-1, 1].map((s) => {
    const ear = pivot(head, s * 0.24, 0.18, 0.02);
    ear.rotation.z = s * 1.75;
    B(ear, 0.14, 0.28, 0.08, 0x80deea, 0, 0.13, 0, earM, { r: 0.45 });
    return { ear, s };
  });
  // 頭頂一點鬼火（細細嘅藍色火苗）
  const wisp = pivot(head, 0, 0.36, 0.02);
  const flameM = addM(0x84ffff, 0.85);
  S(wisp, 0.06, 0.09, 0.06, 0x84ffff, 0, 0, 0, flameM, { lo: true });
  cone(wisp, 0.045, 0.12, 0x84ffff, 0, 0.1, 0, flameM, 10);
  // 地上淡淡一團光（浮得高，光圈細啲）
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), addM(glowC, 0.25));
  shadow.rotation.x = -PI / 2;
  shadow.position.y = 0.02;
  g.add(shadow);
  // ✨ 拖尾光點（喺尾尖出，慢慢飄上去淡出）
  const N = 26;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const life = new Float32Array(N).map((_, i) => i / N);
  const vel = Array.from({ length: N }, () => V(0, 0, 0));
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const sparks = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.11, map: sparkTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparks.frustumCulled = false;
  g.add(sparks);
  const sparkC = new THREE.Color(0x84ffff);
  const tipW = new THREE.Vector3();
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
      // 浮上浮落（間唔中開心跳一跳）
      const hop = Math.max(0, Math.sin(t * 0.9)) ** 30;
      root.position.y = 0.12 + Math.sin(t * 1.8) * 0.07 + hop * 0.18 + excited * Math.abs(Math.sin(t * 7)) * 0.1;
      root.rotation.z = Math.sin(t * 1.1) * 0.05;
      shadow.scale.setScalar(Math.max(0.4, 1 - (root.position.y - 0.12) * 1.5));
      body.scale.set(1, 1 + Math.sin(t * 2.2) * 0.02, 1);
      // 鬼尾：好似搖尾咁左右擺，一節跟一節（好似波浪）
      const sp = 7 + excited * 6;
      tail.rotation.y = Math.sin(t * sp) * (0.35 + excited * 0.2);
      tail.rotation.x = -0.45 + Math.sin(t * 1.8) * 0.08;
      tailSegs.forEach((s, i) => {
        s.rotation.y = Math.sin(t * sp - i * 0.7) * 0.22;
        s.rotation.x = -0.18 - Math.sin(t * 2 - i * 0.5) * 0.08;
      });
      heart.scale.setScalar(0.09 * (1 + Math.sin(t * 3) * 0.2));
      tongue.scale.z = 1 + hop * 0.6;
      wisp.scale.set(1 + Math.sin(t * 13) * 0.1, 1 + Math.sin(t * 9) * 0.18, 1);
      // 前腳好似喺空氣度扒吓扒吓（游水咁）
      legs.forEach((l) => (l.hip.rotation.x = Math.sin(t * (3 + excited * 6) + l.phase) * (0.25 + excited * 0.15)));
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
      for (const e of ears) e.ear.rotation.z = e.s * (1.75 + Math.sin(t * 2.6 + e.s) * 0.12 + hop * 0.3);
      // ✨ 光點：死咗就喺尾尖重生
      tipW.set(0, 0, 0.1);
      tailSegs[5].localToWorld(tipW);
      g.worldToLocal(tipW);
      for (let i = 0; i < N; i++) {
        life[i] += dt * 0.7;
        if (life[i] >= 1) {
          life[i] -= 1;
          pos[i * 3] = tipW.x + (Math.random() - 0.5) * 0.12;
          pos[i * 3 + 1] = tipW.y + (Math.random() - 0.5) * 0.12;
          pos[i * 3 + 2] = tipW.z + (Math.random() - 0.5) * 0.12;
          vel[i].set((Math.random() - 0.5) * 0.15, 0.2 + Math.random() * 0.25, 0.05 + Math.random() * 0.15);
        }
        pos[i * 3] += vel[i].x * dt;
        pos[i * 3 + 1] += vel[i].y * dt;
        pos[i * 3 + 2] += vel[i].z * dt;
        const f = Math.sin(life[i] * PI) * 0.9; // 淡入淡出
        col[i * 3] = sparkC.r * f;
        col[i * 3 + 1] = sparkC.g * f;
        col[i * 3 + 2] = sparkC.b * f;
      }
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.color.needsUpdate = true;
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
  const owned = gearCount('zombieChest');
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
        <p>Open it to find Candy Corn or a NEW spooky pet! Chests go in your 🎒 - put them in your hotbar and click to open.</p>
        ${owned ? `<span class="bulk-have">🎒 You have ${owned}</span>` : ''}
        ${bulkButtons({ attr: 'data-echo="buy"', cost: ZOMBIE_CHEST_COST, have: cc, icon: CANDY })}
      </div>
      <div class="echo-drops"><h3>What's inside?</h3>${rows}</div>
    </div>
    <p class="hint">🐕 Echo says: "Woof! I found these chests in the old manor. ${can ? 'Want some chests? Buy lots and open them all! Woof woof!' : 'Bring me Candy Corn - you can get it by fishing at the lake!'}"</p>`;
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
`;
let cssDone = false;
function ensureDom() {
  if (cssDone) return;
  cssDone = true;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
}

// ======================== 主程式 ========================
export function createEchoShop({ scene, openShop, popup }) {
  ensureDom();
  const stall = buildStall(scene);
  const api = {};
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
    // 展示箱：輕輕搖 + 綠光閃
    const d = stall.display;
    const w = Math.max(0, Math.sin(t * 1.6)) ** 6;
    d.g.rotation.z = Math.sin(t * 20) * 0.04 * w;
    d.lid.rotation.x = w * 0.12;
    d.glowMat.emissiveIntensity = 1.8 + Math.sin(t * 3) * 0.6;
    d.innerGlow.material.opacity = w * 0.9;
  };

  api.interaction = (pos) => {
    if (Math.hypot(pos.x - SHOP_SPOT.x, pos.z - SHOP_SPOT.z) > 2.6 && Math.hypot(pos.x - ECHO_STALL.x, pos.z - ECHO_STALL.z) > 2.8) return null;
    return { prompt: `<kbd>E</kbd> 🐕 Talk to Echo: buy a 🧟 Zombified Chest (${ZOMBIE_CHEST_COST} ${CANDY})`, action: () => { excited = 2; play('boing'); openShop(); } };
  };

  // 買箱（一次過買 n 個；n = 'max' = 買得起幾多就幾多）→ 入背包
  function buy(n = 1) {
    const count = bulkCount(n, ZOMBIE_CHEST_COST, candyCornOf());
    if (!count) return popup(`${CANDY} You need ${ZOMBIE_CHEST_COST} Candy Corn for a Zombified Chest!`);
    state.candyCorn = candyCornOf() - count * ZOMBIE_CHEST_COST;
    addGear('zombieChest', count);
    save();
    renderHotbar();
    excited = 3;
    play('coin');
    popup(`+${count} Zombified Chest${count === 1 ? '' : 's'} added to your 🎒`);
    if (panelKind() === 'echo') openPanel('echo'); // 更新數字
  }
  api.buy = buy;
  $('panel-body').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-echo="buy"]');
    if (!b || panelKind() !== 'echo') return;
    buy(b.dataset.n);
  });
  return api;
}
