// 🤠 CATCH & TAME 區（小朋友 Issue #16，2026-11-06）：Hub 右邊嘅木欄牧場
//   - 大拱門「CATCH & TAME」（西邊入口，對住地塊）
//   - 🌀 大傳送門：撳 E → openRodeo()（rodeo.js 嘅 openMapSelect：揀 Savanna／Desert／Taiga）
//   - 🪢 Lasso Sam：用 💰 錢升套索 Lv 1→10（LASSO_LEVELS，越升越遠）
//   - 🎵 Tamer Ayden：用 💰 錢升馴服笛 Lv 1→10（FLUTE_LEVELS，越升越快）
//   - ⭐ Special's Stall：用 🤠 Tame Tokens 買 6 樣嘢（SPECIAL_STALL；效果全部喺 buySpecial）
// 數值全部喺 src/data/tame.js；位置喺 src/hubShape.js（TAME_AREA、TAME_PORTAL、LASSO_STALL…）
//
// 用法（main.js）：
//   const tameStalls = createTameStalls({ scene, play, popup, announce, openRodeo, equipRanger, blocked })
//   tameStalls.update(dt, time, camera.position)   // 每格畫面（NPC 動畫、傳送門轉）
//   tameStalls.interaction(pos)                     // E 掣：{ prompt, action } 或者 null
// 面板：extraPanels.lasso／flute／special（hud.js 嘅 openPanel）

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { state, save } from './state.js';
import { extraPanels } from './hud.js';
import { addCollider, bakeStatic } from './world.js';
import { makeSign, makeLabel, THEMES } from './signs.js';
import { fencePost, fenceRails } from './fences.js';
import { ranchGround, plankPath } from './hubFloor.js';
import { HUB, TAME_AREA, TAME_PORTAL, LASSO_STALL, FLUTE_STALL, SPECIAL_STALL_POS } from './hubShape.js';
import { LASSO_LEVELS, FLUTE_LEVELS, SPECIAL_STALL } from './data/tame.js';
import { addGear } from './data/gears.js';
import { findAnimal, randomKg } from './data/animals.js';
import { RANGER_SKINS } from './skins.js';
import { short as fmt } from './format.js';

const $ = (id) => document.getElementById(id);
const PI = Math.PI;
const DRAGON = 'Luminous God Dragon';
const tokens = () => state.tameTokens || 0;
const ACT = 3; // 行到幾近先撳得 E

// ======================== 🧱 細工具 ========================
const mats = new Map();
const M = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra }));
  return mats.get(key);
};
const GLOW = (color, k = 2) => M(color, { emissive: color, emissiveIntensity: k });
function add(parent, geo, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const rbox = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.18);
// 本地座標（正面 +z）→ 世界座標
const toWorld = (x, z, rotY, lx, lz) => ({ x: x + lx * Math.cos(rotY) + lz * Math.sin(rotY), z: z - lx * Math.sin(rotY) + lz * Math.cos(rotY) });

const WOOD = M(0x8d5a32);
const WOOD_DARK = M(0x5d3a1f);
const WOOD_LIGHT = M(0xb98454);
const ROPE = M(0xd7b98a);
const GOLD = M(0xffca28, { metalness: 0.7, roughness: 0.3, emissive: 0xffa000, emissiveIntensity: 0.25 });
const HAY = M(0xe9c46a);
const HAY_DARK = M(0xc9a227);

// ======================== 🧑 方塊公仔（NPC） ========================
// 正面 +z；回傳 { g, armL, armR, head }（手臂嘅 pivot 喺膊頭）
function buildNpc({ shirt, pants, skin = 0xf1c27d, hat = 'cowboy', hatColor = 0x6d4c41, vest = null, badge = false, bandana = null }) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    add(g, box(0.3, 0.85, 0.32), M(pants), s * 0.19, 0.43, 0);
    add(g, box(0.34, 0.16, 0.42), M(0x3e2723), s * 0.19, 0.08, 0.04); // 靴
  }
  add(g, box(0.8, 0.9, 0.45), M(shirt), 0, 1.3, 0);
  add(g, box(0.82, 0.1, 0.47), M(0x4e342e), 0, 0.9, 0); // 皮帶
  add(g, box(0.18, 0.12, 0.05), GOLD, 0, 0.9, 0.24, false); // 皮帶扣
  if (vest) for (const s of [-1, 1]) add(g, box(0.26, 0.8, 0.05), M(vest), s * 0.26, 1.33, 0.235, false);
  if (badge) {
    const star = add(g, new THREE.CylinderGeometry(0.12, 0.12, 0.04, 5), GOLD, 0.2, 1.48, 0.25, false);
    star.rotation.x = PI / 2;
  }
  const head = new THREE.Group();
  head.position.set(0, 2.05, 0);
  g.add(head);
  add(head, box(0.6, 0.6, 0.6), M(skin), 0, 0, 0);
  for (const s of [-1, 1]) add(head, box(0.09, 0.09, 0.03), M(0x212121), s * 0.13, 0.04, 0.31, false); // 眼
  add(head, box(0.22, 0.05, 0.03), M(0x8d4b3a), 0, -0.14, 0.31, false); // 笑口
  if (bandana) add(head, box(0.64, 0.14, 0.64), M(bandana), 0, -0.36, 0, false);
  if (hat === 'cowboy') {
    add(head, new THREE.CylinderGeometry(0.62, 0.62, 0.06, 20), M(hatColor), 0, 0.33, 0);
    add(head, rbox(0.5, 0.34, 0.5), M(hatColor), 0, 0.52, 0);
    add(head, box(0.52, 0.07, 0.52), M(0x3e2723), 0, 0.4, 0, false);
  } else if (hat === 'explorer') {
    add(head, new THREE.CylinderGeometry(0.5, 0.5, 0.05, 20), M(hatColor), 0, 0.32, 0);
    add(head, new THREE.SphereGeometry(0.33, 16, 8, 0, PI * 2, 0, PI / 2), M(hatColor), 0, 0.33, 0);
    add(head, box(0.1, 0.1, 0.02), GOLD, 0, 0.45, 0.31, false);
  } else if (hat === 'top') {
    add(head, new THREE.CylinderGeometry(0.46, 0.46, 0.05, 20), M(hatColor), 0, 0.33, 0);
    add(head, new THREE.CylinderGeometry(0.3, 0.3, 0.55, 20), M(hatColor), 0, 0.62, 0);
    add(head, new THREE.CylinderGeometry(0.305, 0.305, 0.1, 20), GOLD, 0, 0.42, 0, false);
  }
  const arm = (s) => {
    const p = new THREE.Group();
    p.position.set(s * 0.53, 1.7, 0);
    g.add(p);
    add(p, box(0.24, 0.8, 0.26), M(shirt), 0, -0.36, 0);
    add(p, box(0.22, 0.16, 0.24), M(skin), 0, -0.82, 0); // 手
    return p;
  };
  return { g, armL: arm(-1), armR: arm(1), head };
}

// ======================== 🏪 攤位（木屋 + 間條帆布頂） ========================
// 正面 +z；回傳攤位前面企嘅位（世界座標）
function buildStall(staticRoot, live, x, z, rotY, { stripes, title, sub, theme, npc }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  staticRoot.add(g);
  const lg = new THREE.Group();
  lg.position.copy(g.position);
  lg.rotation.y = rotY;
  live.add(lg);
  add(g, box(4.8, 0.16, 3.4), WOOD_LIGHT, 0, 0.08, -0.1); // 地台
  add(g, box(4.6, 2.7, 0.16), WOOD, 0, 1.4, -1.7); // 後牆
  for (let i = 0; i < 6; i++) add(g, box(0.04, 2.6, 0.02), WOOD_DARK, -2.0 + i * 0.8, 1.4, -1.61, false); // 板縫
  for (const sx of [-2.25, 2.25]) for (const sz of [-1.7, 1.35]) add(g, rbox(0.24, 3.2, 0.24), WOOD_DARK, sx, 1.6, sz);
  for (const s of [-1, 1]) add(g, box(0.12, 1.0, 3.0), WOOD, s * 2.25, 0.6, -0.2); // 兩邊矮牆
  add(g, box(4.3, 1.0, 0.62), WOOD, 0, 0.5, 0.95); // 櫃枱
  add(g, rbox(4.5, 0.14, 0.8), WOOD_LIGHT, 0, 1.06, 0.95);
  for (let i = 0; i < 5; i++) add(g, box(0.06, 0.9, 0.02), WOOD_DARK, -1.7 + i * 0.85, 0.5, 1.27, false);
  // 間條帆布頂（斜少少）+ 前面一排三角花邊
  const n = 7;
  for (let i = 0; i < n; i++) {
    const s = add(g, box(4.9 / n + 0.01, 0.08, 3.9), M(stripes[i % 2]), -2.45 + (i + 0.5) * (4.9 / n), 3.3, -0.2);
    s.rotation.x = 0.16;
  }
  for (let i = 0; i < 10; i++) {
    const c = add(g, new THREE.ConeGeometry(0.22, 0.34, 3), M(stripes[i % 2]), -2.2 + i * 0.49, 2.86, 1.62, false);
    c.rotation.x = PI;
  }
  // 大牌（帆布頂上面）
  const sign = makeSign([{ text: title, size: 0.42 }, { text: sub, size: 0.22, color: '#fff59d' }], 4.2, 1.15, theme);
  sign.position.set(0, 4.25, 0.5);
  lg.add(sign);
  for (const s of [-1, 1]) add(g, box(0.1, 0.9, 0.1), WOOD_DARK, s * 1.6, 3.65, 0.5, false);
  // NPC（企喺櫃枱後面；個名喺大牌度）
  const person = buildNpc(npc);
  person.g.position.set(0, 0.16, -0.45);
  lg.add(person.g);
  // 碰撞：成個攤位（前面櫃枱都計）
  for (const lx of [-1.5, 0, 1.5]) {
    const p = toWorld(x, z, rotY, lx, -0.3);
    addCollider(p.x, p.z, 1.35);
  }
  return { spot: toWorld(x, z, rotY, 0, 2.3), person, lg, g };
}

// ======================== 🌾 牧場裝飾 ========================
function hayBale(root, x, z, rot = 0, y = 0) {
  const b = add(root, rbox(1.4, 0.8, 0.9), HAY, x, y + 0.4, z);
  b.rotation.y = rot;
  for (const s of [-0.35, 0.35]) {
    const band = add(root, box(0.06, 0.82, 0.92), HAY_DARK, x + Math.cos(rot) * s, y + 0.4, z - Math.sin(rot) * s, false);
    band.rotation.y = rot;
  }
}
function barrel(root, x, z) {
  add(root, new THREE.CylinderGeometry(0.42, 0.42, 1.0, 14), WOOD, x, 0.5, z);
  for (const y of [0.18, 0.82]) add(root, new THREE.CylinderGeometry(0.44, 0.44, 0.07, 14), M(0x455a64, { metalness: 0.6 }), x, y, z, false);
  addCollider(x, z, 0.5);
}
function wagonWheel(root, x, z, rotY) {
  const w = new THREE.Group();
  w.position.set(x, 0.85, z);
  w.rotation.set(0, rotY, 0.12);
  root.add(w);
  add(w, new THREE.TorusGeometry(0.8, 0.07, 6, 20), WOOD_DARK, 0, 0, 0);
  add(w, new THREE.CylinderGeometry(0.14, 0.14, 0.2, 10), WOOD_DARK, 0, 0, 0).rotation.x = PI / 2;
  for (let i = 0; i < 6; i++) add(w, box(0.06, 1.55, 0.06), WOOD, 0, 0, 0).rotation.z = (i / 6) * PI;
}
function trough(root, x, z, rotY) {
  const t = new THREE.Group();
  t.position.set(x, 0, z);
  t.rotation.y = rotY;
  root.add(t);
  add(t, box(2.2, 0.6, 0.9), WOOD, 0, 0.42, 0);
  add(t, box(2.0, 0.05, 0.7), M(0x4fc3f7, { roughness: 0.15, metalness: 0.1 }), 0, 0.68, 0, false);
  for (const s of [-1, 1]) add(t, box(0.14, 0.4, 0.8), WOOD_DARK, s * 0.9, 0.2, 0);
  const a = toWorld(x, z, rotY, -0.55, 0);
  const b = toWorld(x, z, rotY, 0.55, 0);
  addCollider(a.x, a.z, 0.6);
  addCollider(b.x, b.z, 0.6);
}
function cactus(root, x, z, s = 1) {
  const green = M(0x558b2f);
  add(root, rbox(0.5 * s, 2.0 * s, 0.5 * s), green, x, s, z);
  add(root, rbox(0.3 * s, 0.7 * s, 0.3 * s), green, x + 0.45 * s, 1.25 * s, z);
  add(root, rbox(0.3 * s, 0.25 * s, 0.3 * s), green, x + 0.3 * s, 0.95 * s, z);
  add(root, rbox(0.3 * s, 0.6 * s, 0.3 * s), green, x - 0.45 * s, 1.0 * s, z);
  add(root, rbox(0.3 * s, 0.25 * s, 0.3 * s), green, x - 0.3 * s, 0.8 * s, z);
  add(root, new THREE.CylinderGeometry(0.5 * s, 0.4 * s, 0.4 * s, 10), M(0xbf6b3a), x, 0.2 * s, z); // 花盆
  addCollider(x, z, 0.55 * s);
}
function lantern(live, x, y, z) {
  add(live, box(0.22, 0.3, 0.22), GLOW(0xffcc66, 1.6), x, y, z, false);
  add(live, box(0.28, 0.05, 0.28), WOOD_DARK, x, y + 0.18, z, false);
}

// 木欄：柱 + 兩條橫木；每米一個 collider（skip(x, z) = 閘口）
const RANCH = { post: WOOD_DARK, rail: WOOD_LIGHT, trim: WOOD_DARK, h: 1.35, w: 0.28, cap: 'flat', rails: [0.5, 1.0], railW: 0.12, railH: 0.16 };
function ranchFence(root, x1, z1, x2, z2, skip = () => false) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const steps = Math.max(1, Math.round(len / 2));
  for (let k = 0; k <= steps; k++) {
    const x = x1 + ((x2 - x1) * k) / steps;
    const z = z1 + ((z2 - z1) * k) / steps;
    if (skip(x, z)) continue;
    fencePost(root, x, z, RANCH);
    if (k < steps) {
      const nx = x1 + ((x2 - x1) * (k + 1)) / steps;
      const nz = z1 + ((z2 - z1) * (k + 1)) / steps;
      if (!skip(nx, nz)) fenceRails(root, x, z, nx, nz, RANCH);
    }
  }
  const cs = Math.ceil(len / 0.9);
  for (let k = 0; k <= cs; k++) {
    const x = x1 + ((x2 - x1) * k) / cs;
    const z = z1 + ((z2 - z1) * k) / cs;
    if (!skip(x, z)) addCollider(x, z, 0.4);
  }
}
// 牧場右邊圍牆喺邊（x），少少入返啲
const wallX = (z, inset = 1.2) => HUB.cx + Math.sqrt(Math.max(0, (HUB.r - inset) ** 2 - (z - HUB.cz) ** 2));

// ======================== 🌀 傳送門 ========================
function swirlTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
  grd.addColorStop(0, '#fff8e1');
  grd.addColorStop(0.35, '#ffb74d');
  grd.addColorStop(0.7, '#e65100');
  grd.addColorStop(1, '#6d2c00');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, s, s);
  // 旋渦：幾條螺旋光帶
  ctx.translate(s / 2, s / 2);
  for (let arm = 0; arm < 5; arm++) {
    ctx.beginPath();
    for (let t = 0; t < 1; t += 0.01) {
      const a = arm * ((PI * 2) / 5) + t * PI * 2.6;
      const r = t * s * 0.5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.strokeStyle = arm % 2 ? 'rgba(255,241,118,0.75)' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 10;
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function buildPortal(staticRoot, live) {
  const { x, z } = TAME_PORTAL;
  const rotY = -PI / 2; // 正面（本地 +z）→ 世界 -x（對住牧場入口）
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  staticRoot.add(g);
  const lg = new THREE.Group();
  lg.position.copy(g.position);
  lg.rotation.y = rotY;
  live.add(lg);
  const CY = 3.4;
  add(g, box(8.2, 0.3, 3.6), WOOD_LIGHT, 0, 0.15, 0); // 木台
  for (let i = 0; i < 9; i++) add(g, box(0.05, 0.02, 3.6), WOOD_DARK, -3.6 + i * 0.9, 0.31, 0, false);
  add(g, box(3.4, 0.16, 1.2), WOOD_LIGHT, 0, 0.08, 2.2); // 前面一級
  // 木框圓環 + 金色釘
  add(g, new THREE.TorusGeometry(3.05, 0.42, 10, 40), WOOD, 0, CY, 0);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * PI * 2;
    add(g, new THREE.SphereGeometry(0.13, 8, 6), GOLD, Math.cos(a) * 3.05, CY + Math.sin(a) * 3.05, 0.4, false);
  }
  // 兩條大木柱 + 橫樑 + 頂上金色馬蹄鐵
  for (const s of [-1, 1]) {
    add(g, new THREE.CylinderGeometry(0.34, 0.4, 7.4, 10), WOOD_DARK, s * 3.75, 3.7, 0);
    add(g, rbox(1.0, 0.5, 1.0), WOOD_DARK, s * 3.75, 0.25, 0);
  }
  const beam = add(g, new THREE.CylinderGeometry(0.3, 0.3, 8.6, 10), WOOD_DARK, 0, 7.2, 0);
  beam.rotation.z = PI / 2;
  const shoe = add(g, new THREE.TorusGeometry(0.55, 0.13, 8, 20, PI * 1.35), GOLD, 0, 7.95, 0.1);
  shoe.rotation.z = PI * 0.825; // 開口向上（好運）
  const sign = makeSign([{ text: '🤠 CATCH & TAME', size: 0.46 }, { text: 'Press E · pick a map!', size: 0.22, color: '#fff59d' }], 5.0, 1.25, THEMES.orange);
  sign.position.set(0, 9.4, 0.1);
  lg.add(sign);
  // 旋渦（兩層反方向轉）
  const tex = swirlTexture();
  const disc = add(lg, new THREE.CircleGeometry(2.7, 48), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, side: THREE.DoubleSide }), 0, CY, 0, false);
  const disc2 = add(lg, new THREE.CircleGeometry(2.7, 48), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 0, CY, 0.05, false);
  // 閃粉
  const sparkles = [];
  for (let i = 0; i < 18; i++) {
    const sp = add(lg, box(0.12, 0.12, 0.12), GLOW(i % 2 ? 0xffd54f : 0xffffff, 3), 0, 0, 0.3, false);
    sparkles.push({ sp, a: (i / 18) * PI * 2, k: Math.random() });
  }
  // 碰撞：唔好行穿個門
  for (const lx of [-3.75, -2, 0, 2, 3.75]) {
    const p = toWorld(x, z, rotY, lx, 0);
    addCollider(p.x, p.z, lx === 0 ? 1.0 : 0.7);
  }
  return {
    spot: toWorld(x, z, rotY, 0, 2.6),
    update(dt, time) {
      disc.rotation.z -= dt * 1.4;
      disc2.rotation.z += dt * 0.8;
      disc2.scale.setScalar(1 + Math.sin(time * 2) * 0.03);
      for (const s of sparkles) {
        const k = (time * 0.25 + s.k) % 1;
        const r = 3.0 + Math.sin(time + s.a * 3) * 0.3;
        s.sp.position.set(Math.cos(s.a + time * 0.6) * r, CY + Math.sin(s.a + time * 0.6) * r, 0.3 + k * 1.2);
        s.sp.rotation.set(time * 2, time * 3, 0);
      }
    },
  };
}

// ======================== 🏗️ 起成個區 ========================
function buildArea(scene) {
  const staticRoot = new THREE.Group();
  const live = new THREE.Group();
  scene.add(live);
  const A = TAME_AREA;
  ranchGround(staticRoot, HUB, A);
  // 中間木板路：入口 → 傳送門
  plankPath(staticRoot, A.minX - 0.2, A.gateZ, TAME_PORTAL.x - 2.2, A.gateZ, 3.2);
  // 攤位前面兩條細木板路
  plankPath(staticRoot, (LASSO_STALL.x + FLUTE_STALL.x) / 2, A.gateZ - 1.6, (LASSO_STALL.x + FLUTE_STALL.x) / 2, LASSO_STALL.z + 2.4, 2.0);
  plankPath(staticRoot, SPECIAL_STALL_POS.x, A.gateZ + 1.6, SPECIAL_STALL_POS.x, SPECIAL_STALL_POS.z - 2.4, 2.4);
  // 木欄：西邊（中間留入口）、北邊、南邊；東邊係 Hub 圍牆
  const gateHalf = 2.4;
  ranchFence(staticRoot, A.minX, A.minZ, A.minX, A.maxZ, (x, z) => Math.abs(z - A.gateZ) < gateHalf);
  ranchFence(staticRoot, A.minX, A.minZ, wallX(A.minZ), A.minZ);
  ranchFence(staticRoot, A.minX, A.maxZ, wallX(A.maxZ), A.maxZ);
  // 入口大拱門（面向 -x：由地塊行過嚟見到）
  const arch = new THREE.Group();
  arch.position.set(A.minX, 0, A.gateZ);
  arch.rotation.y = -PI / 2;
  staticRoot.add(arch);
  const archLive = new THREE.Group();
  archLive.position.copy(arch.position);
  archLive.rotation.y = arch.rotation.y;
  live.add(archLive);
  for (const s of [-1, 1]) {
    add(arch, new THREE.CylinderGeometry(0.3, 0.36, 6.2, 10), WOOD_DARK, s * (gateHalf + 0.1), 3.1, 0);
    add(arch, rbox(0.9, 0.4, 0.9), WOOD_DARK, s * (gateHalf + 0.1), 0.2, 0);
    addCollider(A.minX, A.gateZ + s * (gateHalf + 0.1), 0.45);
  }
  const top = add(arch, new THREE.CylinderGeometry(0.26, 0.26, gateHalf * 2 + 1.4, 10), WOOD_DARK, 0, 6.0, 0);
  top.rotation.z = PI / 2;
  const archSign = makeSign([{ text: '🤠 CATCH & TAME', size: 0.5 }, { text: 'Lasso · Tame · Ride!', size: 0.24, color: '#fff59d' }], 4.4, 1.3, THEMES.wood);
  archSign.position.set(0, 4.85, 0.12);
  archLive.add(archSign);
  for (const s of [-1, 1]) add(arch, box(0.05, 0.5, 0.05), M(0x9e9e9e, { metalness: 0.7 }), s * 1.6, 5.65, 0.1, false); // 掛牌鏈
  const shoe = add(arch, new THREE.TorusGeometry(0.45, 0.11, 8, 18, PI * 1.35), GOLD, 0, 6.65, 0);
  shoe.rotation.z = PI * 0.825; // 開口向上
  for (const s of [-1, 1]) lantern(archLive, s * (gateHalf + 0.1), 4.6, 0.42);

  // 🌀 傳送門
  const portal = buildPortal(staticRoot, live);

  // 🪢 Lasso Sam（紅白帆布）
  const lasso = buildStall(staticRoot, live, LASSO_STALL.x, LASSO_STALL.z, 0, {
    stripes: [0xc62828, 0xfafafa], title: '🪢 LASSO SAM', sub: 'Longer lassos!', theme: THEMES.red,
    npc: { shirt: 0xb71c1c, pants: 0x1565c0, vest: 0x6d4c41, bandana: 0xffeb3b, hatColor: 0x795548 },
  });
  // 手上個套索圈（舉高右手轉圈）
  lasso.person.armR.rotation.x = -PI * 0.92;
  const loop = new THREE.Group();
  loop.position.set(0.53, 3.55, 0);
  lasso.person.g.add(loop);
  add(loop, new THREE.TorusGeometry(0.75, 0.045, 6, 28), ROPE, 0, 0, 0, false).rotation.x = PI / 2;
  add(loop, box(0.05, 0.05, 0.6), ROPE, 0.72, 0, 0, false);
  add(lasso.g, new THREE.TorusGeometry(0.3, 0.08, 6, 16), ROPE, -1.3, 1.2, 0.95).rotation.x = PI / 2; // 櫃枱上一卷繩
  add(lasso.g, new THREE.TorusGeometry(0.22, 0.07, 6, 16), ROPE, -1.3, 1.3, 0.95).rotation.x = PI / 2;

  // 🎵 Tamer Ayden（綠白帆布）
  const flute = buildStall(staticRoot, live, FLUTE_STALL.x, FLUTE_STALL.z, 0, {
    stripes: [0x2e7d32, 0xfff8e1], title: '🎵 TAMER AYDEN', sub: 'Faster taming!', theme: THEMES.green,
    npc: { shirt: 0x558b2f, pants: 0xa1887f, hat: 'explorer', hatColor: 0xd7b98a, skin: 0xc68642 },
  });
  for (const a of [flute.person.armL, flute.person.armR]) a.rotation.x = -1.25;
  flute.person.armL.rotation.z = -0.35;
  flute.person.armR.rotation.z = 0.35;
  const pipe = add(flute.person.head, new THREE.CylinderGeometry(0.045, 0.045, 0.8, 8), M(0x8d6e63), 0.2, -0.17, 0.42, false);
  pipe.rotation.z = PI / 2 - 0.25;
  const notes = [0, 1, 2].map((i) => {
    const n = makeLabel([{ text: i % 2 ? '♫' : '♪', color: '#fff59d' }], 0.55);
    flute.person.g.add(n);
    return { n, k: i / 3 };
  });

  // ⭐ Special's Stall（紫金帆布，大少少）
  const special = buildStall(staticRoot, live, SPECIAL_STALL_POS.x, SPECIAL_STALL_POS.z, PI, {
    stripes: [0x6a1b9a, 0xffc107], title: "⭐ SPECIAL'S STALL", sub: 'Spend 🤠 Tame Tokens!', theme: THEMES.purple,
    npc: { shirt: 0x4a148c, pants: 0x212121, hat: 'top', hatColor: 0x212121, badge: true, skin: 0xe0ac69 },
  });
  const star = add(special.lg, new THREE.OctahedronGeometry(0.45, 0), GLOW(0xffd54f, 2.4), 0, 5.6, 0.5, false);
  star.scale.set(1, 1.4, 0.5);
  // 櫃枱上面 6 粒細展示品（6 樣貨）
  const goods = [0x00e5ff, 0xff7043, 0xffd54f, 0x8bc34a, 0xf06292, 0xb388ff].map((c, i) => {
    const m = add(special.lg, new THREE.OctahedronGeometry(0.16, 0), GLOW(c, 1.8), -1.75 + i * 0.7, 1.45, 0.95, false);
    return m;
  });

  // 🌾 裝飾（貼邊，唔阻路）
  const deco = staticRoot;
  hayBale(deco, A.minX + 1.6, A.minZ + 1.4, 0.1);
  hayBale(deco, A.minX + 1.6, A.minZ + 1.4, -0.2, 0.8);
  hayBale(deco, A.minX + 3.1, A.minZ + 1.3, 0.05);
  addCollider(A.minX + 1.6, A.minZ + 1.4, 0.8);
  addCollider(A.minX + 3.1, A.minZ + 1.3, 0.8);
  hayBale(deco, A.minX + 1.5, A.maxZ - 1.4, PI / 2 + 0.1);
  hayBale(deco, A.minX + 2.6, A.maxZ - 1.3, PI / 2);
  hayBale(deco, A.minX + 2.0, A.maxZ - 1.35, PI / 2 - 0.1, 0.8);
  addCollider(A.minX + 1.5, A.maxZ - 1.4, 0.8);
  addCollider(A.minX + 2.6, A.maxZ - 1.3, 0.8);
  barrel(deco, SPECIAL_STALL_POS.x + 4.0, SPECIAL_STALL_POS.z + 0.6);
  barrel(deco, SPECIAL_STALL_POS.x + 4.8, SPECIAL_STALL_POS.z + 1.3);
  barrel(deco, LASSO_STALL.x - 3.4, LASSO_STALL.z - 0.6);
  wagonWheel(deco, A.minX + 0.5, A.gateZ + 5.5, PI / 2);
  wagonWheel(deco, A.minX + 0.5, A.gateZ - 6.5, PI / 2);
  trough(deco, A.minX + 4.2, A.gateZ + 5.8, 0);
  cactus(deco, wallX(A.minZ + 2.5, 2.6), A.minZ + 2.5, 0.9);
  cactus(deco, wallX(A.maxZ - 4, 3.0), A.maxZ - 4, 1.1);
  cactus(deco, SPECIAL_STALL_POS.x - 4.4, SPECIAL_STALL_POS.z + 0.8, 0.8);
  for (const z of [A.gateZ - 2.2, A.gateZ + 2.2]) lantern(live, TAME_PORTAL.x - 6.5, 0.3, z); // 傳送門路邊細燈

  bakeStatic(staticRoot, scene);
  return {
    portal, lasso, flute, special,
    update(dt, time) {
      portal.update(dt, time);
      loop.rotation.y = time * 5; // 套索轉圈
      lasso.person.head.rotation.y = Math.sin(time * 0.7) * 0.25;
      flute.person.head.rotation.z = Math.sin(time * 3) * 0.06;
      for (const nt of notes) {
        const k = (time * 0.35 + nt.k) % 1;
        nt.n.position.set(0.4 + Math.sin(k * 6 + nt.k * 9) * 0.35, 2.3 + k * 1.6, 0.4);
        nt.n.material.opacity = 1 - k;
      }
      special.person.armR.rotation.x = -0.4 + Math.sin(time * 2.2) * 0.35; // 招手
      special.person.armR.rotation.z = 0.5;
      star.rotation.y = time * 1.6;
      star.position.y = 5.6 + Math.sin(time * 2) * 0.12;
      goods.forEach((m, i) => {
        m.rotation.y = time * 2 + i;
        m.position.y = 1.45 + Math.sin(time * 3 + i) * 0.05;
      });
    },
  };
}

// ======================== 🛒 買嘢 ========================
// 🪢 套索／🎵 笛：用錢升一級。回傳新等級（買唔到就 null）
export function upgradeTameTool(kind) {
  const key = kind === 'lasso' ? 'lassoLevel' : 'fluteLevel';
  const list = kind === 'lasso' ? LASSO_LEVELS : FLUTE_LEVELS;
  const lv = state[key] || 1;
  const next = list[lv];
  if (!next || state.money < next.cost) return null;
  state.money -= next.cost;
  state[key] = lv + 1;
  save();
  return lv + 1;
}

// ⭐ Special's Stall 嘅效果全部喺度（其他幫手要改效果就改呢度）
// 回傳 { ok, msg, big? }：ok = 買到；msg = 彈出嘅字；big = 用大公告
export const specialOwned = (id) => {
  if (id === 'luminousDragon') return state.pets.some((p) => p.name === DRAGON);
  if (id === 'tamerRanger') return !!state.ownedRanger?.includes('tamer');
  if (id === 'cowboyBossSkin') return !!state.cowboyBossSkin;
  return false; // Shard／Leash 可以買好多
};
// 買得未（未有嘅嘢，例如另一個幫手未加嘅皮膚／寵物，就未賣住）
const specialReady = (id) => {
  if (id === 'luminousDragon') return !!findAnimal(DRAGON);
  if (id === 'tamerRanger') return RANGER_SKINS.some((s) => s.id === 'tamer');
  return true;
};
export function buySpecial(id, { equipRanger = () => {} } = {}) {
  const item = SPECIAL_STALL.find((x) => x.id === id);
  if (!item) return { ok: false, msg: 'Hmm, I don\'t sell that!' };
  if (specialOwned(id)) return { ok: false, msg: `You already have the ${item.name}!` };
  if (!specialReady(id)) return { ok: false, msg: `${item.emoji} ${item.name} is coming soon!` };
  if (tokens() < item.cost) return { ok: false, msg: `Need ${item.cost - tokens()} more 🤠 Tame Tokens - tame animals in the Catch & Tame portal!` };
  state.tameTokens = tokens() - item.cost;
  let msg = `${item.emoji} You got the ${item.name}!`;
  let big = false;
  if (id === 'tameShard') {
    addGear('shard_tame');
    msg = '🤠 +1 Tame Shard in your 🎒 Gears! Use it on a pet.';
  } else if (id === 'rideShard') {
    addGear('rideShard');
    msg = '🐎 +1 Ridable Shard in your 🎒 Gears! Use it on a pet to ride it.';
  } else if (id === 'leash') {
    addGear('leash');
    msg = '🪢 +1 Leash in your 🎒 Gears!';
  } else if (id === 'tamerRanger') {
    state.ownedRanger = [...(state.ownedRanger || ['ranger']), 'tamer'];
    state.rangerSkin = 'tamer';
    const skin = RANGER_SKINS.find((s) => s.id === 'tamer');
    if (skin) equipRanger(skin);
    msg = '🧢 New skin: Tamer Ranger! You are wearing it now.';
    big = true;
  } else if (id === 'cowboyBossSkin') {
    state.cowboyBossSkin = true;
    msg = '🤠 Cowboy Boss Skin unlocked! YEEHAW!';
    big = true;
  } else if (id === 'luminousDragon') {
    const info = findAnimal(DRAGON);
    state.pets.push({ name: DRAGON, rarity: 'Eternal', kg: info?.kg ? randomKg(info) : 5000, biome: info?.biome ?? 6, onPlot: false, fixedBest: true });
    msg = '🐉 The LUMINOUS GOD DRAGON is yours! Put it in your Safety Zoo!';
    big = true;
  }
  save();
  return { ok: true, msg, big };
}

// ======================== 🪟 面板 ========================
const CSS = `
#panel[data-kind="lasso"] #panel-title, #panel[data-kind="flute"] #panel-title { background: linear-gradient(180deg, #a1714f 0%, #6d4425 100%); border-bottom-color: #3e2410; }
#panel[data-kind="special"] #panel-title { background: linear-gradient(180deg, #8e24aa 0%, #4a148c 100%); border-bottom-color: #26063f; }
.ts-top { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
.ts-pill { background: #3e2410; color: #fff8e1; border: 2px solid #d7b98a; border-radius: 999px; padding: 5px 14px; font-weight: 800; }
.ts-pill.purple { background: #2a0b45; border-color: #ffd54f; }
.ts-say { background: #fff8e1; border: 2px solid #d7b98a; border-radius: 12px; padding: 8px 12px; margin: 6px 0 12px; color: #4e342e; }
.ts-ladder { display: grid; grid-template-columns: repeat(auto-fill, minmax(86px, 1fr)); gap: 6px; }
.ts-step { border: 2px solid #d7ccc8; border-radius: 10px; padding: 6px; text-align: center; background: #fafafa; color: #6d4c41; }
.ts-step b { display: block; }
.ts-step span { display: block; font-size: 15px; font-weight: 800; color: #3e2723; }
.ts-step small { color: #8d6e63; }
.ts-step.done { background: #e8f5e9; border-color: #81c784; }
.ts-step.now { background: #fff3c4; border-color: #ffb300; box-shadow: 0 0 10px rgba(255, 179, 0, 0.5); }
.ts-next { margin-top: 12px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: center; text-align: center; }
.ts-next .ts-big { font-size: 17px; padding: 10px 18px; }
.ts-max { font-size: 18px; font-weight: 800; color: #f57f17; }
.ts-cards .ts-card { border-color: #8e24aa !important; background: linear-gradient(180deg, #fdf6ff, #f3e5f5); }
.ts-card .ts-emoji { font-size: 52px; line-height: 1.1; margin: 4px 0; }
.ts-card .ts-price { display: block; font-weight: 800; color: #6a1b9a; }
.ts-card p { font-size: 13px; }
.ts-card.ts-gold { border-color: #ffb300 !important; box-shadow: 0 0 16px rgba(255, 193, 7, 0.55); }
`;
function ensureCss() {
  if ($('tame-stalls-css')) return;
  const st = document.createElement('style');
  st.id = 'tame-stalls-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

function toolHtml(kind) {
  const lasso = kind === 'lasso';
  const list = lasso ? LASSO_LEVELS : FLUTE_LEVELS;
  const lv = state[lasso ? 'lassoLevel' : 'fluteLevel'] || 1;
  const stat = (L) => (lasso ? `${L.range} m` : `x${L.speed}`);
  const next = list[lv];
  const say = lasso
    ? '🤠 <b>Lasso Sam:</b> "Howdy, partner! A longer lasso catches animals from further away. My best ropes ain\'t cheap!"'
    : '🎵 <b>Tamer Ayden:</b> "Animals love music! A better flute fills the tame bar faster, so they calm down quicker."';
  const steps = list.map((L, i) => `<div class="ts-step ${i < lv - 1 ? 'done' : ''} ${i === lv - 1 ? 'now' : ''}"><b>Lv ${i + 1}</b><span>${stat(L)}</span><small>${i === 0 ? 'Free' : i < lv ? '✔' : `$${fmt(L.cost)}`}</small></div>`).join('');
  const bottom = next
    ? `<div>Next: <b>Lv ${lv + 1}</b> → ${lasso ? `reach <b>${next.range} m</b> (now ${list[lv - 1].range} m)` : `tame <b>x${next.speed}</b> faster (now x${list[lv - 1].speed})`}</div>
       ${state.money >= next.cost ? `<button class="ts-big" data-tame="up" data-kind="${kind}">⬆️ Upgrade for $${fmt(next.cost)}</button>` : `<button class="ts-big grey" disabled>💰 Need $${fmt(next.cost - state.money)} more</button>`}`
    : '<div class="ts-max">★ MAX LEVEL ★ You have the best one in the West!</div>';
  return `<div class="ts-top"><span class="ts-pill">💰 $${fmt(state.money)}</span><span class="ts-pill">${lasso ? '🪢 Lasso' : '🎵 Flute'} Lv ${lv} · ${stat(list[lv - 1])}</span></div>
    <div class="ts-say">${say}</div>
    <div class="ts-ladder">${steps}</div>
    <div class="ts-next">${bottom}</div>`;
}

function specialHtml() {
  const t = tokens();
  const cards = SPECIAL_STALL.map((it) => {
    const owned = specialOwned(it.id);
    const ready = specialReady(it.id);
    const have = (state.gears || []).filter((g) => g.type === ({ tameShard: 'shard_tame', rideShard: 'rideShard', leash: 'leash' })[it.id]).length;
    const btn = owned
      ? '<span class="tag">✔ You have it</span>'
      : !ready
        ? '<button class="grey" disabled>Coming soon</button>'
        : t >= it.cost
          ? `<button data-tame="buy" data-id="${it.id}">Buy 🤠 ${it.cost}</button>`
          : `<button class="grey" disabled>Need ${it.cost - t} more 🤠</button>`;
    return `<div class="card-animal ts-card ${it.id === 'luminousDragon' ? 'ts-gold' : ''} ${owned ? 'equipped' : ''}">
      <div class="ts-emoji">${it.emoji}</div><b>${it.name}</b><span class="ts-price">🤠 ${it.cost} Tame Tokens</span>
      <p>${it.desc}</p>${have ? `<small>🎒 You have ${have}</small>` : ''}<div class="pet-actions">${btn}</div></div>`;
  }).join('');
  return `<div class="ts-top"><span class="ts-pill purple">🤠 ${t} Tame Tokens</span><span class="ts-pill purple">🐾 ${state.totalTames || 0} animals tamed</span></div>
    <div class="ts-say">⭐ <b>Special:</b> "Welcome, tamer! Every animal you tame in the 🌀 Catch & Tame portal gives you 🤠 Tame Tokens. Spend them here on my very special things!"</div>
    <div class="cards ts-cards">${cards}</div>`;
}

// ======================== 🚀 起晒 ========================
export function createTameStalls({ scene, play = () => {}, popup = () => {}, announce = () => {}, openRodeo = null, equipRanger = () => {}, blocked = () => null } = {}) {
  ensureCss();
  const area = buildArea(scene);
  extraPanels.lasso = ['🪢 Lasso Sam', () => toolHtml('lasso'), 'E'];
  extraPanels.flute = ['🎵 Tamer Ayden', () => toolHtml('flute'), 'E'];
  extraPanels.special = ["⭐ Special's Stall", specialHtml, 'E'];
  let toggle = () => {};

  const body = $('panel-body');
  body.addEventListener('click', (e) => {
    const kind = $('panel').dataset.kind;
    if (!['lasso', 'flute', 'special'].includes(kind)) return;
    const b = e.target.closest('button[data-tame]');
    if (!b) return;
    if (b.dataset.tame === 'up') {
      const k = b.dataset.kind;
      const lv = upgradeTameTool(k);
      if (!lv) {
        play('wrong');
        popup('💰 Not enough money yet!');
      } else {
        play('upgrade');
        const L = (k === 'lasso' ? LASSO_LEVELS : FLUTE_LEVELS)[lv - 1];
        announce(k === 'lasso' ? `🪢 Lasso Level ${lv}! It reaches ${L.range} m now!` : `🎵 Flute Level ${lv}! Taming is x${L.speed} faster!`);
      }
      body.innerHTML = toolHtml(k);
    } else if (b.dataset.tame === 'buy') {
      const r = buySpecial(b.dataset.id, { equipRanger });
      if (!r.ok) {
        play('wrong');
        popup(r.msg);
      } else {
        play(r.big ? 'magic' : 'upgrade');
        if (r.big) announce(r.msg);
        else popup(r.msg);
      }
      body.innerHTML = specialHtml();
    }
  });

  const startRodeo = () => {
    const why = blocked();
    if (why) return popup(why);
    // openRodeo 回傳 false = Catch & Tame 遊戲未有（rodeo.js 未起好）
    const fn = openRodeo || (() => (window.__rodeo?.openMapSelect ? (window.__rodeo.openMapSelect(), true) : false));
    if (fn() === false) {
      play('wrong');
      popup('🚧 The Catch & Tame portal is still being built. Come back soon, partner!');
    } else play('portal');
  };

  return {
    area,
    setToggle(fn) {
      toggle = fn;
    },
    update(dt, time) {
      area.update(dt, time);
    },
    // E 掣：回傳 { prompt, action } 或者 null
    interaction(pos) {
      const near = (p, d) => Math.hypot(pos.x - p.x, pos.z - p.z) < d;
      if (near(area.portal.spot, 3.6)) return { prompt: '<kbd>E</kbd> 🌀 Enter CATCH & TAME (pick a map!)', action: startRodeo };
      if (near(area.lasso.spot, ACT)) return { prompt: `<kbd>E</kbd> 🪢 Talk to Lasso Sam (Lasso Lv ${state.lassoLevel || 1})`, action: () => toggle('lasso') };
      if (near(area.flute.spot, ACT)) return { prompt: `<kbd>E</kbd> 🎵 Talk to Tamer Ayden (Flute Lv ${state.fluteLevel || 1})`, action: () => toggle('flute') };
      if (near(area.special.spot, ACT)) return { prompt: `<kbd>E</kbd> ⭐ Open Special's Stall (🤠 ${tokens()} Tame Tokens)`, action: () => toggle('special') };
      return null;
    },
  };
}
