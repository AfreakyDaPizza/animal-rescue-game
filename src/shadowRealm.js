// 💀 SHADOW REALM（Issue #21 留言，小朋友 2026-11-14）：跑步機／學生桌 Lv19
//  「horrifying style」「no arch but spooky pirate claws will move」「change the treadmills tread colour and the handle」
//  「while running on track a phantom will spawn and it will give you a random boost for 1 min」
//  - 地上：黑色裂地 + 血紅裂紋、低低嘅紫黑霧、骷髏蠟燭、細墓碑
//  - 兩邊兩隻巨型骷髏海盜爪由地底伸出嚟（爛紅色海盜衫袖、金鈕、骨手指一節節會抓）；右手隻手指戴金戒指，左邊仲有個海盜鈎
//  - 螢幕／黑板：骨刺框 + 頂部戴三角海盜帽嘅骷髏頭（紅眼）+ 兩邊吊鐵鏈
//  - 跑步帶變血紅（會發光）、扶手變骨白 + 紅布（hub.js applyTier 用 SHADOW_LOOK）
//  - 👻 幽靈：企喺 Lv19 機度練緊，每 SHADOW_PHANTOM_EVERY 秒由霧入面飄一隻出嚟飛向你，掂到你 = 隨機 1 分鐘 boost
// 數值（價錢、每秒幾多、幾耐出一隻幽靈）喺 src/data/balance.js 嘅 SHADOW_*

import * as THREE from 'three';
import { SHADOW_PHANTOM_EVERY, SHADOW_PHANTOM_SECONDS } from './data/balance.js';
import { addBoostFor, findBoost } from './boosts.js';
import { popup } from './hud.js';
import { play } from './sound.js';

const PI = Math.PI;
const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const glowMat = (color, k = 1) => M(color, { emissive: color, emissiveIntensity: k });
const additive = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const RED = 0xff1744;
const BONE = 0xe8dcc0;

function add(group, geometry, material, x, y, z, shadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  group.add(mesh);
  return mesh;
}

// hub.js applyTier：Lv19 嘅跑步帶／扶手／書枱顏色
export const SHADOW_LOOK = { belt: 0x8b0000, beltGlow: 0x5a0000, grip: BONE, wood: 0x2a1a1a, board: 0x8a3a3a };

// ---- 紋理：黑色裂石 + 血紅裂紋 ----
let crackTex = null;
export function shadowTexture() {
  if (crackTex) return crackTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#141018';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(${40 + Math.random() * 30},${30 + Math.random() * 20},${45 + Math.random() * 30},0.6)`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 4 + Math.random() * 10, 4 + Math.random() * 10);
  }
  g.strokeStyle = '#ff1744';
  g.lineWidth = 2;
  let s = 11;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 6; i++) {
    let x = r() * 128;
    let y = r() * 128;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += (r() - 0.5) * 30;
      y += (r() - 0.5) * 30;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  crackTex = new THREE.CanvasTexture(c);
  crackTex.colorSpace = THREE.SRGBColorSpace;
  crackTex.wrapS = crackTex.wrapT = THREE.RepeatWrapping;
  crackTex.magFilter = THREE.NearestFilter;
  return crackTex;
}

// ---- 💀 骷髏頭（三角海盜帽、紅眼）----
function buildSkull(s = 1, hat = true) {
  const g = new THREE.Group();
  const bone = M(BONE, { roughness: 0.8 });
  const black = M(0x050505);
  add(g, new THREE.SphereGeometry(0.42 * s, 18, 14), bone, 0, 0, 0).scale.set(1, 0.95, 0.95);
  add(g, new THREE.BoxGeometry(0.5 * s, 0.26 * s, 0.4 * s), bone, 0, -0.32 * s, -0.08 * s); // 下巴
  const eyes = [];
  for (const sx of [-1, 1]) {
    add(g, new THREE.SphereGeometry(0.12 * s, 10, 8), black, sx * 0.15 * s, 0.02 * s, 0.33 * s, false).scale.z = 0.5;
    eyes.push(add(g, new THREE.SphereGeometry(0.05 * s, 8, 6), glowMat(RED, 3), sx * 0.15 * s, 0.02 * s, 0.38 * s, false));
  }
  add(g, new THREE.ConeGeometry(0.06 * s, 0.12 * s, 3), black, 0, -0.14 * s, 0.38 * s, false).rotation.x = PI; // 鼻
  for (let k = -2; k <= 2; k++) add(g, new THREE.BoxGeometry(0.06 * s, 0.09 * s, 0.03 * s), bone, k * 0.075 * s, -0.33 * s, 0.13 * s, false); // 牙
  if (hat) {
    const hatMat = M(0x161616);
    // 三角海盜帽：扁扁嘅帽頂 + 三邊向上摺嘅帽邊（一角向前）+ 金邊 + 白色細骷髏
    add(g, new THREE.SphereGeometry(0.4 * s, 16, 8, 0, PI * 2, 0, PI / 2), hatMat, 0, 0.3 * s, 0).scale.y = 0.6;
    const goldM = M(0xc9a227, { metalness: 0.8 });
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * PI * 2 + PI / 2; // 中間嗰邊喺後面，兩個角喺前面兩邊……
      const flap = new THREE.Group();
      flap.position.set(Math.cos(a) * 0.36 * s, 0.33 * s, Math.sin(a) * 0.36 * s);
      flap.rotation.y = -a + PI / 2;
      g.add(flap);
      const f = add(flap, new THREE.BoxGeometry(0.78 * s, 0.3 * s, 0.05 * s), hatMat, 0, 0.1 * s, 0);
      f.rotation.x = -0.35;
      add(flap, new THREE.BoxGeometry(0.8 * s, 0.035 * s, 0.06 * s), goldM, 0, 0.24 * s, -0.05 * s, false).rotation.x = -0.35;
    }
    add(g, new THREE.BoxGeometry(0.16 * s, 0.13 * s, 0.03 * s), bone, 0, 0.42 * s, 0.4 * s, false); // 帽上細骷髏
  }
  g.userData.eyes = eyes;
  return g;
}

// ---- 🦴 巨型骷髏海盜爪（由地底伸出嚟；正面 +z；s = 1 右手、-1 左手）----
function buildClaw(side, scale = 1) {
  const root = new THREE.Group();
  const bone = M(BONE, { roughness: 0.75 });
  const coat = M(0x5a0d12, { roughness: 0.9 });
  const gold = M(0xc9a227, { metalness: 0.8, roughness: 0.3 });
  const claw = M(0x1a1a1a, { roughness: 0.4 });
  // 爛海盜衫袖（由地底出嚟）+ 金鈕 + 白色花邊
  add(root, new THREE.CylinderGeometry(0.42, 0.6, 1.6, 9, 1, true), coat, 0, 1.5, 0).material.side = THREE.DoubleSide;
  add(root, new THREE.CylinderGeometry(0.5, 0.5, 0.26, 9), M(0x3d080b), 0, 2.2, 0);
  for (let k = 0; k < 2; k++) add(root, new THREE.SphereGeometry(0.09, 8, 6), gold, 0, 1.2 + k * 0.45, 0.66, false);
  for (let k = 0; k < 7; k++) { // 爛布邊（袖口垂落嚟）
    const a = (k / 7) * PI * 2;
    const rag = add(root, new THREE.BoxGeometry(0.2, 0.4, 0.04), coat, Math.cos(a) * 0.56, 2.0, Math.sin(a) * 0.56, false);
    rag.rotation.y = -a + PI / 2;
  }
  add(root, new THREE.CylinderGeometry(0.5, 0.45, 0.16, 10), M(0xeeeeee, { roughness: 1 }), 0, 2.4, 0); // 花邊
  // 手腕 + 手掌（pivot：手腕）
  const wrist = new THREE.Group();
  wrist.position.y = 2.45;
  root.add(wrist);
  add(wrist, new THREE.CylinderGeometry(0.16, 0.2, 0.6, 8), bone, -0.14, 0.25, 0);
  add(wrist, new THREE.CylinderGeometry(0.14, 0.18, 0.6, 8), bone, 0.14, 0.25, 0);
  add(wrist, new THREE.BoxGeometry(0.85, 0.75, 0.24), bone, 0, 0.85, 0);
  // 四隻手指（每隻 3 節，會抓）+ 黑色尖爪
  const fingers = [];
  for (let f = 0; f < 4; f++) {
    let parent = wrist;
    const segs = [];
    const fx = -0.3 + f * 0.2;
    for (let k = 0; k < 3; k++) {
      const seg = new THREE.Group();
      seg.position.set(k === 0 ? fx : 0, k === 0 ? 1.22 : 0.42 - k * 0.04, 0);
      if (k === 0) seg.userData.spread = (f - 1.5) * -0.22; // 手指張開
      parent.add(seg);
      const len = 0.42 - k * 0.06;
      add(seg, new THREE.CylinderGeometry(0.07 - k * 0.01, 0.08 - k * 0.01, len, 6), bone, 0, len / 2, 0);
      add(seg, new THREE.SphereGeometry(0.09 - k * 0.01, 8, 6), bone, 0, 0, 0, false); // 關節
      if (k === 2) add(seg, new THREE.ConeGeometry(0.06, 0.32, 6), claw, 0, len + 0.14, 0.03).rotation.x = 0.3;
      segs.push(seg);
      parent = seg;
    }
    if (f === 1 && side > 0) add(segs[0], new THREE.TorusGeometry(0.1, 0.035, 6, 14), gold, 0, 0.18, 0, false).rotation.x = PI / 2; // 金戒指
    fingers.push(segs);
  }
  // 拇指
  const thumb = new THREE.Group();
  thumb.position.set(side * -0.45, 0.75, 0.05);
  thumb.rotation.z = side * 0.9;
  wrist.add(thumb);
  add(thumb, new THREE.CylinderGeometry(0.08, 0.09, 0.5, 6), bone, 0, 0.25, 0);
  add(thumb, new THREE.ConeGeometry(0.06, 0.28, 6), claw, 0, 0.6, 0);
  root.scale.setScalar(scale);
  root.userData = { wrist, fingers, thumb };
  return root;
}

// 海盜鈎（細啲，插喺地上，左邊）
function buildHook() {
  const g = new THREE.Group();
  const coat = M(0x5a0d12, { roughness: 0.9 });
  add(g, new THREE.CylinderGeometry(0.3, 0.38, 1.4, 9), coat, 0, 0.7, 0);
  add(g, new THREE.CylinderGeometry(0.34, 0.34, 0.12, 12), M(0xc9a227, { metalness: 0.8 }), 0, 1.42, 0);
  const steel = M(0xb0bec5, { metalness: 0.95, roughness: 0.15 });
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), steel, 0, 1.8, 0);
  const hook = add(g, new THREE.TorusGeometry(0.32, 0.06, 8, 20, PI * 1.3), steel, 0.32, 2.2, 0);
  hook.rotation.z = PI * 0.15;
  add(g, new THREE.ConeGeometry(0.06, 0.18, 6), steel, 0.6, 1.98, 0).rotation.z = 2.4;
  return g;
}

// 骨刺螢幕框
function buildBoneFrame(group, { cy, z, w, h }) {
  const bone = M(BONE, { roughness: 0.75 });
  const dark = M(0x1a1016, { roughness: 0.6 });
  const W = w / 2;
  const H = h / 2;
  // 四條骨（上下左右）
  for (const [x, y, ww, hh] of [[0, H, w + 0.3, 0.22], [0, -H, w + 0.3, 0.22], [-W, 0, 0.22, h + 0.3], [W, 0, 0.22, h + 0.3]]) {
    add(group, new THREE.BoxGeometry(ww, hh, 0.22), dark, x, cy + y, z);
    add(group, new THREE.CylinderGeometry(0.09, 0.09, Math.max(ww, hh) - 0.1, 8), bone, x, cy + y, z + 0.14).rotation.z = ww > hh ? PI / 2 : 0;
  }
  // 骨尖刺一圈
  const spikes = [];
  const n = 7;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    const x = -W + t * w;
    const sz = 0.35 + ((k * 37) % 5) * 0.08;
    const up = add(group, new THREE.ConeGeometry(0.08, sz, 6), bone, x, cy + H + 0.1 + sz / 2, z, false);
    up.rotation.z = (t - 0.5) * -0.6;
    spikes.push(up);
    const dn = add(group, new THREE.ConeGeometry(0.06, sz * 0.7, 6), bone, x, cy - H - 0.1 - sz * 0.35, z, false);
    dn.rotation.z = PI;
  }
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const sp = add(group, new THREE.ConeGeometry(0.08, 0.5, 6), bone, s * (W + 0.32), cy - 0.5 + k * 0.5, z, false);
    sp.rotation.z = -s * PI / 2;
  }
  // 頂部骷髏 + 帽
  const skull = buildSkull(1.0);
  skull.position.set(0, cy + H + 0.55, z + 0.2);
  group.add(skull);
  // 兩邊吊鐵鏈
  const chainMat = M(0x5d5d5d, { metalness: 0.9, roughness: 0.4 });
  const chains = [];
  for (const s of [-1, 1]) {
    const chain = new THREE.Group();
    chain.position.set(s * (W - 0.1), cy + H, z + 0.22);
    group.add(chain);
    for (let k = 0; k < 7; k++) {
      const link = add(chain, new THREE.TorusGeometry(0.07, 0.022, 6, 10), chainMat, 0, -0.13 - k * 0.12, 0, false);
      link.rotation.y = k % 2 ? PI / 2 : 0;
    }
    chains.push(chain);
  }
  return { skull, chains, spikes };
}

// ---- 👻 幽靈（白色破布 + 紅眼 + 鐵鏈）----
export function buildPhantom() {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0xd9e4ff, transparent: true, opacity: 0.72, roughness: 0.9, emissive: 0x3a4a7a, emissiveIntensity: 0.6, side: THREE.DoubleSide, depthWrite: false });
  add(g, new THREE.SphereGeometry(0.38, 16, 12), cloth, 0, 0.55, 0, false);
  const robe = add(g, new THREE.ConeGeometry(0.5, 1.2, 14, 1, true), cloth, 0, -0.05, 0, false);
  robe.rotation.x = PI;
  robe.position.y = 0.05;
  robe.scale.y = -1;
  const rags = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * PI * 2;
    rags.push(add(g, new THREE.ConeGeometry(0.1, 0.4, 4), cloth, Math.cos(a) * 0.42, -0.72, Math.sin(a) * 0.42, false));
    rags[k].rotation.x = PI;
  }
  for (const s of [-1, 1]) {
    add(g, new THREE.SphereGeometry(0.075, 8, 6), M(0x000000), s * 0.13, 0.6, 0.32, false);
    add(g, new THREE.SphereGeometry(0.035, 8, 6), glowMat(RED, 3), s * 0.13, 0.6, 0.38, false);
    const arm = add(g, new THREE.ConeGeometry(0.1, 0.6, 6), cloth, s * 0.45, 0.25, 0.15, false);
    arm.rotation.set(-1.1, 0, -s * 0.6);
  }
  add(g, new THREE.TorusGeometry(0.16, 0.03, 6, 12), M(0x5d5d5d, { metalness: 0.9 }), 0, 0.12, 0.42, false);
  const halo = add(g, new THREE.SphereGeometry(0.9, 16, 12), additive(0x8c9eff, 0.12), 0, 0.2, 0, false);
  g.userData = { rags, halo };
  return g;
}

// ================= 跑步機／學生桌 Lv19 =================
export function buildShadowTier(group, kind = 'treadmill') {
  const crack = M(0xffffff, { map: shadowTexture(), emissiveMap: shadowTexture(), emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.9 });
  const GZ = kind === 'table' ? -2.6 : -3.3;
  // ---- 地上：裂地 + 紅光圈 + 霧 ----
  const pad = add(group, new THREE.CylinderGeometry(3.5, 3.7, 0.12, 40), crack, 0, 0.06, -0.5);
  pad.castShadow = false;
  const ring = add(group, new THREE.RingGeometry(3.25, 3.5, 48), additive(RED, 0.45), 0, 0.14, -0.5, false);
  ring.rotation.x = -PI / 2;
  const mists = [];
  for (let k = 0; k < 4; k++) {
    const m = add(group, new THREE.CircleGeometry(2.4 + k * 0.5, 32), additive(k % 2 ? 0x4a148c : 0x311b3a, 0.22), Math.sin(k) * 0.6, 0.2 + k * 0.12, -0.5 + Math.cos(k) * 0.5, false);
    m.rotation.x = -PI / 2;
    mists.push(m);
  }
  // ---- 兩隻巨型骷髏海盜爪（取代拱門）+ 海盜鈎 ----
  const claws = [-1, 1].map((s) => {
    const c = buildClaw(s, 1.55);
    c.position.set(s * 3.3, -0.2, GZ + 0.9);
    c.rotation.set(0.12, -s * 0.9, s * 0.28); // 隻手掌向住部機
    c.userData.baseRot = c.rotation.clone();
    group.add(c);
    return c;
  });
  const hook = buildHook();
  hook.position.set(-3.9, 0, 0.9);
  hook.rotation.y = 0.6;
  group.add(hook);
  // ---- 螢幕框（骨刺 + 骷髏海盜）----
  const frame = kind === 'table'
    ? buildBoneFrame(group, { cy: 2.35, z: -1.56, w: 3.9, h: 2.4 })
    : buildBoneFrame(group, { cy: 3.35, z: -2.82, w: 3.5, h: 2.2 });
  // ---- 骷髏蠟燭 + 細墓碑 ----
  const flames = [];
  const candle = M(0xe0d6b8);
  for (const [x, z] of [[-3.0, 1.9], [3.0, 1.9], [2.6, -2.3], [-2.6, -2.3]]) {
    add(group, new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8), candle, x, 0.37, z);
    const fl = add(group, new THREE.ConeGeometry(0.07, 0.22, 8), glowMat(0x76ff03, 2.5), x, 0.74, z, false);
    flames.push(fl);
    const sk = buildSkull(0.28, false);
    sk.position.set(x + 0.25, 0.22, z);
    sk.rotation.y = x > 0 ? -0.6 : 0.6;
    group.add(sk);
  }
  const stone = M(0x4a4a52, { roughness: 1 });
  for (const s of [-1, 1]) {
    const t = add(group, new THREE.BoxGeometry(0.7, 0.9, 0.18), stone, s * 3.6, 0.45, -1.0);
    t.rotation.set(0, s * 0.3, s * 0.12);
    add(group, new THREE.CylinderGeometry(0.35, 0.35, 0.18, 12, 1, false, 0, PI), stone, s * 3.6 - s * 0.05, 0.9, -1.0).rotation.set(PI / 2, s * 0.3, PI / 2);
  }
  // ---- 頭頂一嚿黑雲 + 紅色閃電 ----
  const cloud = new THREE.Group();
  cloud.position.set(0, 8.3, GZ + 1.2);
  group.add(cloud);
  const cloudMat = M(0x1c1622, { roughness: 1, emissive: 0x0a0010, emissiveIntensity: 1 });
  for (let k = 0; k < 14; k++) { // 扁扁、唔規則嘅雷雲
    const a = k * 2.4;
    const r = (k % 4) * 0.6;
    add(cloud, new THREE.SphereGeometry(0.6 + ((k * 7) % 5) * 0.12, 12, 8), cloudMat, Math.cos(a) * r * 1.5, Math.sin(k * 1.7) * 0.15, Math.sin(a) * r * 0.7, false);
  }
  cloud.scale.set(1, 0.5, 1);
  const bolt = new THREE.Group();
  cloud.add(bolt);
  let bx = 0;
  let by = -0.6;
  for (let k = 0; k < 5; k++) {
    const nx = bx + (k % 2 ? 0.45 : -0.4);
    const ny = by - 0.9;
    const seg = add(bolt, new THREE.BoxGeometry(0.08, Math.hypot(nx - bx, ny - by), 0.08), glowMat(RED, 4), (bx + nx) / 2, (by + ny) / 2, 0, false);
    seg.rotation.z = Math.atan2(nx - bx, -(ny - by));
    bx = nx;
    by = ny;
  }
  bolt.visible = false;

  // ---- 飄浮綠火鬼燈 ----
  const wisps = [0, 1, 2].map((i) => add(group, new THREE.SphereGeometry(0.14, 10, 8), glowMat(i === 1 ? 0xb388ff : 0x76ff03, 2.4), 0, 0, 0, false));
  group.userData = { ring, mists, claws, frame, flames, wisps, GZ, cloud, bolt, cloudMat };
}

export function animateShadowTier(group, station, time) {
  const u = group.userData;
  station.baseMat.emissiveIntensity = 0.35 + Math.max(0, Math.sin(time * 1.7)) * 0.35; // 紅裂紋一下下光
  u.ring.material.opacity = 0.3 + Math.sin(time * 2.2) * 0.15;
  u.mists.forEach((m, i) => {
    m.rotation.z = time * (i % 2 ? 0.15 : -0.12);
    m.material.opacity = 0.16 + Math.sin(time * 0.8 + i) * 0.06;
  });
  // 爪：手指慢慢抓埋、放開；每 ~6 秒「抓」一下快啲
  u.claws.forEach((c, ci) => {
    const { wrist, fingers, thumb } = c.userData;
    const t = time + ci * 1.7;
    const snap = Math.max(0, Math.sin(t * 1.05)) ** 6; // 突然抓
    const curl = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.7)) + snap * 0.6;
    fingers.forEach((segs, f) => segs.forEach((seg) => seg.rotation.set(curl * (0.9 + f * 0.05), 0, seg.userData.spread || 0)));
    thumb.rotation.x = curl * 0.6;
    wrist.rotation.set(Math.sin(t * 0.5) * 0.15 - snap * 0.25, Math.sin(t * 0.3) * 0.2, Math.sin(t * 0.6) * 0.08);
    c.position.y = -0.2 + Math.sin(t * 0.9) * 0.12;
    c.rotation.z = c.userData.baseRot.z + Math.sin(t * 0.45) * 0.06;
  });
  const eyes = u.frame.skull.userData.eyes;
  eyes.forEach((e) => (e.material.emissiveIntensity = 1.5 + Math.max(0, Math.sin(time * 3)) * 2.5));
  u.frame.skull.rotation.z = Math.sin(time * 0.8) * 0.06;
  u.frame.chains.forEach((ch, i) => (ch.rotation.z = Math.sin(time * 1.4 + i) * 0.12));
  u.flames.forEach((f, i) => f.scale.set(1, 0.8 + Math.abs(Math.sin(time * 9 + i * 2)) * 0.5, 1));
  // 紅閃電：每 ~4 秒閃兩下
  const flash = (time % 4.3) < 0.12 || ((time % 4.3) > 0.22 && (time % 4.3) < 0.3);
  u.bolt.visible = flash;
  u.bolt.rotation.y = Math.floor(time / 4.3) * 1.3;
  u.cloudMat.emissive.setHex(flash ? 0x2a0a30 : 0x0a0010);
  u.cloud.rotation.y = Math.sin(time * 0.2) * 0.2;
  u.wisps.forEach((w, i) => {
    const a = time * (0.6 + i * 0.15) + i * 2.1;
    w.position.set(Math.cos(a) * (2.6 + i * 0.3), 2.2 + Math.sin(time * 1.3 + i) * 0.7, -0.5 + Math.sin(a) * 2.2);
  });
}

// ================= 👻 幽靈：練緊就會飄過嚟俾 boost =================
// 每格：updatePhantoms(hub, dt, time, station, px, pz)（hub.js updateHub 叫）
const P = { timer: 0, ghost: null, t: 0, from: new THREE.Vector3(), scene: null };
export function updatePhantoms(scene, dt, time, station, px, pz) {
  if (!P.ghost) {
    P.ghost = buildPhantom();
    P.ghost.visible = false;
    scene.add(P.ghost);
  }
  const g = P.ghost;
  if (!g.visible) {
    P.timer = station ? P.timer + dt : 0;
    if (P.timer < SHADOW_PHANTOM_EVERY) return;
    // 出現：喺機後面霧入面升起
    P.timer = 0;
    P.t = 0;
    const side = Math.random() < 0.5 ? -1 : 1;
    P.from.set(station.x + side * 3.4, 0.2, station.z - 2.5);
    g.position.copy(P.from);
    g.visible = true;
    play('spooky');
    popup('👻 A PHANTOM rises from the Shadow Realm...');
    return;
  }
  P.t += dt;
  const target = new THREE.Vector3(px, 1.4, pz);
  if (P.t < 1.2) {
    g.position.y = P.from.y + (P.t / 1.2) * 2.2; // 升起
  } else {
    const k = Math.min(1, (P.t - 1.2) / 2.2);
    const start = P.from.clone().setY(P.from.y + 2.2);
    g.position.lerpVectors(start, target, k * k);
    g.position.y += Math.sin(k * PI) * 1.0;
    if (k >= 1) {
      // 掂到你：隨機 1 分鐘 boost
      g.visible = false;
      const ids = ['speed', 'money', 'treadmill', 'iq', 'table'];
      const id = ids[Math.floor(Math.random() * ids.length)];
      addBoostFor(id, SHADOW_PHANTOM_SECONDS);
      const b = findBoost(id);
      play('magic');
      popup(`👻 The Phantom gave you ${b.emoji} ${b.name} for ${Math.round(SHADOW_PHANTOM_SECONDS / 60) === 1 ? '1 minute' : `${SHADOW_PHANTOM_SECONDS} s`}!`);
      return;
    }
  }
  g.lookAt(px, g.position.y, pz);
  g.userData.rags.forEach((r, i) => (r.rotation.z = Math.sin(time * 8 + i) * 0.3));
  g.userData.halo.material.opacity = 0.1 + Math.sin(time * 5) * 0.05;
}
// 測試：import('/src/shadowRealm.js').then(m => m.phantomDebug.now())（要企喺 Lv19 跑步機／學生桌上面）
export const phantomDebug = { now: () => (P.timer = 1e9), get state() { return P; } };
