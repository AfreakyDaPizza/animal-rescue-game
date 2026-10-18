// Biome 7 Enchanted Kingdom 嘅新寵物（小朋友 Issue #5 有圖；之後話「好醜、要型啲」→ 全部重做）：方塊（Roblox）風格
// Kitsune Of Runes（Rare）、Gem Dragon（Rare，識飛）、Dreadscale（Common）、Uncoiled Armadillo（Epic）、Citadel Snail（Epic）
// 全部面向 -z。每個回傳 Group：userData.animate(time, moving)、userData.height、userData.move

import * as THREE from 'three';
import { box, pivot, material, slab } from './modelKit.js';

const PI = Math.PI;
// 會閃嘅發光物料：每隻寵物自己一份（咁先可以自己一閃一閃）
const glowMat = (color, k = 1.2, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.35, ...extra });
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
// 水晶碎片（拉長嘅八面體）
const shardGeo = new THREE.OctahedronGeometry(1, 0);
function shard(parent, x, y, z, w, len, m, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(shardGeo, m);
  mesh.scale.set(w, len, w * 0.75);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
// 兩點之間一條方塊（骨、線用）
function bar(parent, a, b, w, color, extra) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const m = box(parent, w, w, len + w * 0.5, color, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, 0.3, extra);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2])), Math.atan2(b[0] - a[0], b[2] - a[2]), 0);
  if (extra?.mat) m.material = extra.mat;
  return m;
}
// 四隻腳行路（左前同右後一齊）
function walkLegs(legs, t, moving, speed = 7, amp = 0.5) {
  const sw = Math.sin(t * speed) * amp * moving;
  legs.forEach((l, i) => (l.rotation.x = i === 0 || i === 3 ? sw : -sw));
}

// ================= Kitsune Of Runes（Rare） =================
// 小朋友張圖：深藍色狐狸、粉紅發光符文、7 條大尾。2026-10-18 小朋友話「太亂」→ 重做：
// 修長嘅狐狸身（淺藍心口同嘴）、高高三角耳、杏仁形粉紅發光眼；7 條蓬鬆大尾喺身後打開成一把扇（由前面、側面都見到），
// 尾尖淺色 + 發光粉紅；符文整齊：額頭一粒、身兩邊各一個方形符文、腳上一條線
export function buildKitsuneModel() {
  const g = new THREE.Group();
  const root = pivot(g);
  const NAVY = 0x2a3596;
  const NAVY2 = 0x3949ab;
  const PALE = 0xb3bdf0;
  const DARK = 0x1a2063;
  const rune = glowMat(0xff3dbe, 1.0);
  const runeSoft = glowMat(0xff80d8, 0.7);
  const BODY_Y = 1.25;
  const ballG = new THREE.SphereGeometry(1, 18, 12);
  const blob = (p, sx, sy, sz, col, x, y, z) => {
    const m = new THREE.Mesh(ballG, col.isMaterial ? col : material(col));
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    m.castShadow = true;
    p.add(m);
    return m;
  };
  // 方形符文（一個框 + 中間一粒）
  const runeSquare = (p, x, y, z, sz, ry = 0) => {
    const q = pivot(p, x, y, z);
    q.rotation.y = ry;
    for (const [w, h, dx, dy] of [[sz, sz * 0.18, 0, sz * 0.41], [sz, sz * 0.18, 0, -sz * 0.41], [sz * 0.18, sz, sz * 0.41, 0], [sz * 0.18, sz, -sz * 0.41, 0]]) glowBox(q, w, h, 0.04, rune, dx, dy, 0, 0.2);
    glowBox(q, sz * 0.35, sz * 0.35, 0.05, runeSoft, 0, 0, 0, 0.2);
    return q;
  };

  // ---- 修長嘅腳（深色襪） ----
  const legs = [[-0.24, -0.55], [0.24, -0.55], [-0.24, 0.55], [0.24, 0.55]].map(([x, z]) => {
    const hip = pivot(root, x, BODY_Y - 0.1, z);
    blob(hip, 0.15, 0.36, 0.17, NAVY, 0, -0.25, 0);
    blob(hip, 0.1, 0.36, 0.11, DARK, 0, -0.75, 0.02);
    blob(hip, 0.12, 0.07, 0.17, DARK, 0, -1.1, -0.05);
    glowBox(hip, 0.03, 0.22, 0.03, rune, (x < 0 ? -1 : 1) * 0.15, -0.3, -0.06, 0.2); // 腳上符文線
    return hip;
  });

  // ---- 身：修長、淺色心口同肚 ----
  const body = pivot(root, 0, BODY_Y, 0);
  blob(body, 0.4, 0.36, 0.85, NAVY, 0, 0.05, 0.05);
  blob(body, 0.3, 0.2, 0.7, PALE, 0, -0.18, -0.05); // 肚
  blob(body, 0.34, 0.38, 0.32, PALE, 0, 0.0, -0.68); // 心口毛
  for (const s of [-1, 1]) runeSquare(body, s * 0.385, 0.1, 0.15, 0.3, s * PI / 2);

  // ---- 頭：狐狸臉、長嘴、高三角耳、杏仁粉紅眼 ----
  const head = pivot(root, 0, BODY_Y + 0.62, -0.98);
  blob(head, 0.32, 0.28, 0.3, NAVY, 0, 0, 0);
  for (const s of [-1, 1]) blob(head, 0.18, 0.14, 0.16, PALE, s * 0.2, -0.12, -0.08); // 白面頰
  blob(head, 0.15, 0.12, 0.3, NAVY2, 0, -0.06, -0.3); // 長嘴
  blob(head, 0.13, 0.07, 0.26, PALE, 0, -0.13, -0.3); // 嘴底淺色
  blob(head, 0.06, 0.05, 0.05, 0x0b0b1a, 0, -0.03, -0.6); // 鼻
  for (const s of [-1, 1]) {
    const eye = blob(head, 0.09, 0.04, 0.03, rune, s * 0.14, 0.06, -0.24);
    eye.rotation.z = s * 0.35; // 杏仁形、斜斜
    const ear = pivot(head, s * 0.17, 0.2, 0.02);
    ear.rotation.z = s * -0.2;
    slab(ear, [[-0.13, 0], [0.13, 0], [0, 0.5]], 0.08, NAVY, { key: 'kit-ear', bevel: 0.03, smooth: false });
    slab(ear, [[-0.07, 0.04], [0.07, 0.04], [0, 0.34]], 0.03, 0, { key: 'kit-ear-in', bevel: 0.01, smooth: false, z: -0.05, extra: runeSoft });
  }
  glowBox(head, 0.1, 0.1, 0.04, rune, 0, 0.17, -0.27, 0.2).rotation.z = PI / 4; // 額頭符文

  // ---- 7 條蓬鬆大尾：喺身後打開成扇（每條一節節由幼變粗再收尖），尾尖淺色 + 粉紅火 ----
  const tails = [];
  const N = 7;
  for (let k = 0; k < N; k++) {
    const f = k / (N - 1) - 0.5; // -0.5 … 0.5
    const fan = pivot(root, 0, BODY_Y + 0.2, 0.8);
    fan.rotation.z = f * 2.6; // 左右散開成扇
    const tilt = pivot(fan);
    tilt.rotation.x = 0.75 - Math.abs(f) * 0.3; // 向後瞓
    const segs = [];
    let parent = tilt;
    const R = [0.13, 0.2, 0.25, 0.23, 0.16];
    for (let i = 0; i < 5; i++) {
      const p = pivot(parent, 0, i === 0 ? 0 : 0.3, 0);
      blob(p, R[i], 0.24, R[i] * 0.85, i === 4 ? PALE : i % 2 ? NAVY2 : NAVY, 0, 0.15, 0);
      segs.push(p);
      parent = p;
    }
    blob(parent, 0.09, 0.14, 0.08, runeSoft, 0, 0.42, 0); // 尾尖粉紅火
    tails.push({ fan, segs, f, k });
  }

  g.userData.animate = (t, moving) => {
    walkLegs(legs, t, moving, 9, 0.6);
    root.position.y = Math.abs(Math.sin(t * 9)) * 0.05 * moving;
    head.rotation.y = Math.sin(t * 0.9) * 0.22 * (1 - moving);
    head.rotation.x = Math.sin(t * 1.3) * 0.05;
    for (const tl of tails) {
      tl.fan.rotation.z = tl.f * (2.6 + Math.sin(t * 1.3) * 0.15);
      tl.segs.forEach((p, i) => (p.rotation.x = Math.sin(t * 2 - i * 0.7 + tl.k * 0.6) * 0.07 - (i > 1 ? 0.12 : 0))); // 尾尖向上彎返
    }
    rune.emissiveIntensity = 0.9 + Math.sin(t * 3) * 0.3;
    runeSoft.emissiveIntensity = 0.6 + Math.sin(t * 3 + 1) * 0.2;
  };
  g.userData.move = 'walk';
  g.userData.height = 3.0;
  return g;
}

// ================= Gem Dragon（Rare，識飛） =================
// 跟張圖：白色冰晶龍、深藍胸甲 + 發光藍色 V、藍色發光眼同花紋、水晶角、背脊同尾有水晶刺；
// 小朋友：「the dragon should be flying」→ 加咗一對好大嘅水晶翼，喺天上飛、拍翼
export function buildGemDragonModel() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const WHITE = 0xeef6ff;
  const ICE = 0xc5e3fb;
  const NAVY = 0x1b2a6b;
  const blue = glowMat(0x29b6f6, 1.3);
  const crystal = glowMat(0x9fe3ff, 0.55, { transparent: true, opacity: 0.85, flatShading: true, metalness: 0.2 });
  const membrane = new THREE.MeshStandardMaterial({ color: 0xb3e5fc, emissive: 0x4fc3f7, emissiveIntensity: 0.45, transparent: true, opacity: 0.6, side: THREE.DoubleSide, roughness: 0.15 });
  const body = pivot(root, 0, 0, 0);
  // 身（打橫）：前面一個又大又厚嘅胸（似獅子咁威），後面收窄到盤骨
  box(body, 1.2, 1.05, 1.7, WHITE, 0, 0, 0.05, 0.38);
  box(body, 1.45, 1.3, 1.0, WHITE, 0, 0.08, -0.5, 0.42); // 大胸
  box(body, 1.1, 0.3, 1.6, ICE, 0, 0.55, 0.0, 0.38);
  for (const s of [-1, 1]) {
    box(body, 0.42, 0.75, 0.8, WHITE, s * 0.62, 0.2, -0.55, 0.42); // 膊頭肌肉
    box(body, 0.36, 0.62, 0.7, WHITE, s * 0.52, -0.05, 0.55, 0.42); // 大髀
  }
  // 深藍胸甲：一層層由頸到肚，似龍鱗
  [[1.0, 0.36, 0.5, -0.3, -0.95], [1.05, 0.34, 0.55, -0.5, -0.6], [0.9, 0.3, 0.55, -0.55, -0.15], [0.78, 0.26, 0.5, -0.52, 0.3]].forEach(([w, h, d, y, z]) => box(body, w, h, d, NAVY, 0, y, z, 0.4));
  for (const s of [-1, 1]) glowBox(body, 0.1, 0.06, 0.6, blue, s * 0.22, -0.5, -0.75, 0.3).rotation.y = s * 0.5; // V
  for (const s of [-1, 1]) {
    glowBox(body, 0.04, 0.08, 0.8, blue, s * 0.61, 0.05, 0.15, 0.3); // 身側藍線
    box(body, 0.04, 0.3, 0.3, ICE, s * 0.6, -0.1, 0.6, 0.3);
  }
  // 背脊水晶刺
  for (let i = 0; i < 5; i++) shard(body, 0, 0.74, -0.6 + i * 0.32, 0.11, 0.26 - i * 0.02, crystal, -0.45);
  // 頸（四節，又粗又壯，一節疊一節，下面有冰藍喉甲）+ 頭
  const neck = pivot(body, 0, 0.35, -0.95);
  let np = neck;
  const necks = [];
  [0.82, 0.72, 0.64, 0.58].forEach((w, i) => {
    const p = pivot(np, 0, i === 0 ? 0 : 0.16, i === 0 ? 0 : -0.28);
    box(p, w, w * 0.95, 0.56, i % 2 ? ICE : WHITE, 0, 0.05, -0.15, 0.28);
    box(p, w * 0.62, 0.14, 0.46, NAVY, 0, 0.05 - w * 0.45, -0.17, 0.4); // 喉甲
    shard(p, 0, w * 0.5 + 0.1, -0.12, 0.08, 0.17, crystal, -0.5);
    necks.push(p);
    np = p;
  });
  const head = pivot(np, 0, 0.2, -0.45);
  head.scale.setScalar(1.12);
  box(head, 0.6, 0.48, 0.62, WHITE, 0, 0, 0, 0.35);
  box(head, 0.46, 0.28, 0.5, WHITE, 0, -0.06, -0.48, 0.35); // 嘴
  box(head, 0.4, 0.1, 0.45, NAVY, 0, -0.2, -0.45, 0.3); // 口
  for (const s of [-1, 1]) {
    glowBox(head, 0.05, 0.1, 0.2, blue, s * 0.31, 0.08, -0.12, 0.3); // 發光藍眼
    box(head, 0.06, 0.04, 0.05, 0xffffff, s * 0.32, 0.1, -0.16, 0.3);
    shard(head, s * 0.2, 0.42, 0.22, 0.08, 0.32, crystal, -0.9, 0, s * -0.3); // 水晶角
    shard(head, s * 0.28, 0.25, 0.3, 0.06, 0.22, crystal, -1.2, 0, s * -0.6);
    for (let i = 0; i < 2; i++) box(head, 0.04, 0.1, 0.04, 0xffffff, s * (0.08 + i * 0.1), -0.3, -0.65, 0.3); // 牙
  }
  const jaw = pivot(head, 0, -0.18, -0.15);
  box(jaw, 0.4, 0.12, 0.5, WHITE, 0, -0.06, -0.3, 0.3);
  // 尾（六節）+ 水晶刺 + 尾尖水晶刀
  // 尾：七節，頭粗（同盤骨一樣闊）慢慢收幼，一節疊一節冇罅
  const tailBase = pivot(body, 0, 0.12, 0.85);
  const tail = [];
  let tp = tailBase;
  for (let i = 0; i < 7; i++) {
    const p = pivot(tp, 0, 0, i === 0 ? 0 : 0.36);
    const w = 0.78 - i * 0.09;
    box(p, w, w * 0.88, 0.56, i % 2 ? ICE : WHITE, 0, 0, 0.18, 0.26);
    box(p, w * 0.6, 0.1, 0.42, NAVY, 0, -w * 0.42, 0.18, 0.4); // 尾底鱗
    shard(p, 0, w * 0.44 + 0.07, 0.18, 0.07, 0.16, crystal, 0.5);
    tail.push(p);
    tp = p;
  }
  shard(tp, 0, 0, 0.62, 0.2, 0.46, crystal, PI / 2);
  // 四隻腳（飛嗰陣收埋）
  const legs = [[-0.45, -0.5], [0.45, -0.5], [-0.42, 0.55], [0.42, 0.55]].map(([x, z]) => {
    const hip = pivot(body, x, -0.35, z);
    box(hip, 0.36, 0.55, 0.38, WHITE, 0, -0.22, 0, 0.35);
    box(hip, 0.34, 0.12, 0.44, NAVY, 0, -0.5, -0.05, 0.3);
    for (let c = -1; c <= 1; c++) shard(hip, c * 0.1, -0.55, -0.28, 0.035, 0.07, crystal, -PI / 2);
    return hip;
  });
  // 一對大水晶翼：骨（白）+ 半透明冰藍膜 + 翼邊水晶
  const wings = [-1, 1].map((s) => {
    const w = pivot(body, s * 0.6, 0.55, -0.35);
    bar(w, [0, 0, 0], [s * 1.2, 0.45, 0.2], 0.12, WHITE);
    bar(w, [s * 1.2, 0.45, 0.2], [s * 2.6, 0.2, 0.55], 0.09, WHITE);
    const tips = [[s * 2.6, 0.2, 0.55], [s * 2.2, -0.05, 1.15], [s * 1.5, -0.1, 1.45], [s * 0.7, -0.05, 1.2]];
    for (const tip of tips.slice(1)) bar(w, [s * 1.2, 0.45, 0.2], tip, 0.05, ICE);
    // 膜：用三角形砌
    const pts = [[0, 0, 0], [s * 1.2, 0.45, 0.2], ...tips, [0.0, -0.05, 0.9]];
    const verts = [];
    for (let i = 1; i < pts.length - 1; i++) verts.push(...pts[0], ...pts[i], ...pts[i + 1]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    const mem = new THREE.Mesh(geo, membrane);
    w.add(mem);
    for (let i = 0; i < 4; i++) shard(w, s * (0.4 + i * 0.6), 0.35 + (i < 2 ? i * 0.15 : 0.3 - (i - 2) * 0.12) + 0.1, 0.1 + i * 0.12, 0.07, 0.2, crystal, 0, 0, s * -0.4);
    return { w, s };
  });

  const FLY_Y = 1.7;
  g.userData.animate = (t, moving) => {
    const flying = g.userData.flying !== false;
    if (flying) {
      root.position.y = FLY_Y + Math.sin(t * 2.4) * 0.18;
      body.rotation.x = -0.08 + Math.sin(t * 2.4) * 0.04;
      wings.forEach(({ w, s }) => (w.rotation.z = s * Math.sin(t * 5.5) * 0.65));
      legs.forEach((l, i) => (l.rotation.x = i < 2 ? 0.9 : 1.1));
    } else {
      root.position.y = 0.95 + Math.abs(Math.sin(t * 7)) * 0.05 * moving;
      body.rotation.x = 0;
      wings.forEach(({ w, s }) => (w.rotation.z = s * (0.9 + Math.sin(t * 1.5) * 0.08))); // 收埋翼
      walkLegs(legs, t, moving, 7, 0.5);
    }
    necks.forEach((p, i) => (p.rotation.x = Math.sin(t * 1.6 - i * 0.5) * 0.08));
    head.rotation.y = Math.sin(t * 0.8) * 0.2;
    jaw.rotation.x = Math.max(0, Math.sin(t * 0.7)) ** 8 * 0.5; // 間中開口
    tail.forEach((p, i) => (p.rotation.y = Math.sin(t * 2.4 - i * 0.6) * 0.16));
    blue.emissiveIntensity = 1.1 + Math.sin(t * 3) * 0.3;
  };
  g.userData.move = 'fly';
  g.userData.flying = true;
  g.userData.height = FLY_Y + 1.75;
  return g;
}

// ================= Dreadscale（Common） =================
// 跟張圖：深紅色尖刺怪獸（似龍又似獅）、好大嘅尖刺頭冠、深色盔甲帶、霓虹綠色發光花紋、粉紅發光眼、米色肚
export function buildDreadscaleModel() {
  const g = new THREE.Group();
  const root = pivot(g);
  const RED = 0xc2185b;
  const RED2 = 0xe91e63;
  const TAN = 0xd8c39a;
  const ARMOR = 0x22262e;
  const neon = glowMat(0x76ff03, 1.1);
  const eyeM = glowMat(0xff4fd8, 1.4);
  const BODY_Y = 1.05;
  // 四隻粗腳（深色盔甲帶 + 爪）
  const legs = [[-0.5, -0.6], [0.5, -0.6], [-0.48, 0.65], [0.48, 0.65]].map(([x, z]) => {
    const hip = pivot(root, x, BODY_Y - 0.1, z);
    box(hip, 0.45, 0.55, 0.5, RED, 0, -0.2, 0, 0.3);
    box(hip, 0.48, 0.14, 0.52, ARMOR, 0, -0.45, 0, 0.3);
    glowBox(hip, 0.5, 0.04, 0.54, neon, 0, -0.38, 0, 0.3);
    box(hip, 0.4, 0.35, 0.44, TAN, 0, -0.68, 0, 0.3);
    for (let c = -1; c <= 1; c++) cone(hip, 0.06, 0.18, ARMOR, c * 0.13, -0.88, -0.25, -PI / 2.4);
    return hip;
  });
  // 身
  const body = pivot(root, 0, BODY_Y, 0);
  box(body, 1.2, 0.85, 1.75, RED, 0, 0.1, 0, 0.32);
  box(body, 1.0, 0.4, 1.55, TAN, 0, -0.3, 0, 0.35); // 米色肚
  for (const z of [-0.45, 0.15, 0.7]) {
    box(body, 1.24, 0.5, 0.18, ARMOR, 0, 0.25, z, 0.25); // 盔甲帶
    glowBox(body, 1.26, 0.05, 0.2, neon, 0, 0.0, z, 0.25);
  }
  for (const s of [-1, 1]) {
    // 膊頭盔甲 + 綠色閃電紋
    box(body, 0.2, 0.5, 0.6, ARMOR, s * 0.62, 0.2, -0.55, 0.3);
    glowBox(body, 0.04, 0.32, 0.06, neon, s * 0.73, 0.25, -0.65, 0.2).rotation.x = 0.5;
    glowBox(body, 0.04, 0.06, 0.28, neon, s * 0.73, 0.38, -0.45, 0.2);
  }
  // 背脊大尖刺（紅色）
  for (let i = 0; i < 6; i++) cone(body, 0.13, 0.55 - i * 0.04, i % 2 ? RED2 : RED, 0, 0.75, -0.6 + i * 0.28, -0.55);
  // 頭：大、尖刺頭冠
  const head = pivot(root, 0, BODY_Y + 0.45, -1.05);
  box(head, 0.8, 0.65, 0.75, RED, 0, 0, 0, 0.3);
  box(head, 0.6, 0.3, 0.45, RED2, 0, -0.08, -0.5, 0.3); // 嘴
  box(head, 0.56, 0.08, 0.4, ARMOR, 0, -0.22, -0.5, 0.3);
  for (const s of [-1, 1]) {
    glowBox(head, 0.2, 0.1, 0.05, eyeM, s * 0.22, 0.12, -0.39, 0.3).rotation.z = s * -0.35;
    box(head, 0.26, 0.07, 0.07, ARMOR, s * 0.22, 0.24, -0.39, 0.3).rotation.z = s * -0.4; // 嬲嬲眉
    for (let i = 0; i < 2; i++) cone(head, 0.035, 0.12, 0xffffff, s * (0.08 + i * 0.12), -0.31, -0.68, PI);
  }
  // 頭冠：一束向後嘅紅色大尖刺
  const crest = pivot(head, 0, 0.3, 0.1);
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * 1.4;
    cone(crest, 0.12, 0.75 - Math.abs(a) * 0.25, i % 2 ? RED2 : RED, Math.sin(a) * 0.3, 0.15, 0.1, -1.05, -a * 0.7);
  }
  glowBox(head, 0.5, 0.05, 0.05, neon, 0, 0.33, -0.38, 0.2); // 額頭綠線
  const jaw = pivot(head, 0, -0.28, -0.1);
  box(jaw, 0.52, 0.14, 0.5, TAN, 0, -0.04, -0.35, 0.3);
  // 尾 + 尖刺
  const tail = pivot(root, 0, BODY_Y + 0.15, 0.9);
  for (let i = 0; i < 4; i++) {
    box(tail, 0.36 - i * 0.07, 0.32 - i * 0.06, 0.36, i % 2 ? RED2 : RED, 0, -i * 0.05, 0.18 + i * 0.32, 0.3);
    cone(tail, 0.07, 0.25, ARMOR, 0, 0.18 - i * 0.05, 0.18 + i * 0.32, -0.6);
  }

  g.userData.animate = (t, moving) => {
    walkLegs(legs, t, moving, 8, 0.55);
    root.position.y = Math.abs(Math.sin(t * 8)) * 0.06 * moving;
    head.rotation.y = Math.sin(t * 0.9) * 0.22 * (1 - moving);
    jaw.rotation.x = 0.1 + Math.max(0, Math.sin(t * 1.1)) ** 6 * 0.45; // 間中咆哮
    crest.rotation.x = Math.sin(t * 2) * 0.05;
    tail.rotation.y = Math.sin(t * 2.6) * 0.35;
    neon.emissiveIntensity = 0.9 + Math.sin(t * 4) * 0.35;
  };
  g.userData.move = 'walk';
  g.userData.height = 2.4;
  return g;
}

// ================= Uncoiled Armadillo（Epic） =================
// 小朋友：舊款好醜 → 跟張圖重新設計：長長、矮矮、好似坦克嘅犰狳（似甲龍）：
// 一圈圈深灰色厚盔甲（淺灰邊）、背脊同兩邊一行行橙色發光尖刺、米色粗腳（有深色箍、灰色大爪）、
// 長長嘅三角形盔甲頭（中間一條骨脊）、背中間一座粗身燈塔（橙色發光窗條、燈房、尖頂）、長尾一節節收細
export function buildArmadilloModel() {
  const g = new THREE.Group();
  const root = pivot(g);
  const TAN = 0xd8c09a;
  const TAN2 = 0xbfa47a;
  const ARMOR = 0x2b2f38;
  const ARMOR2 = 0x3b414c;
  const TRIM = 0x8a919c;
  const CLAW = 0x7d8590;
  const spikeM = glowMat(0xff6d00, 0.8, { flatShading: true });
  const windowM = glowMat(0xff8f00, 1.1);
  const BODY_Y = 1.05;
  const L = 2.9; // 身長

  // ---- 腳：粗、矮、米色 + 深色箍 + 灰色大爪 ----
  const legs = [[-0.72, -0.95], [0.72, -0.95], [-0.72, 0.95], [0.72, 0.95]].map(([x, z]) => {
    const hip = pivot(root, x, BODY_Y - 0.2, z);
    box(hip, 0.5, 0.55, 0.55, TAN, 0, -0.2, 0, 0.3);
    box(hip, 0.54, 0.14, 0.58, ARMOR, 0, -0.38, 0, 0.3); // 腳箍
    box(hip, 0.46, 0.3, 0.52, TAN2, 0, -0.58, -0.02, 0.3);
    box(hip, 0.58, 0.14, 0.66, ARMOR, 0, -0.76, -0.05, 0.3); // 腳底
    for (let c = -1; c <= 1; c++) {
      const cl = box(hip, 0.13, 0.12, 0.24, CLAW, c * 0.19, -0.78, -0.4, 0.3);
      cl.rotation.x = 0.35;
    }
    return hip;
  });

  // ---- 身：米色底 + 9 圈拱形盔甲（中間高、兩頭低），每圈頂同兩邊有橙刺 ----
  const body = pivot(root, 0, BODY_Y, 0);
  box(body, 1.55, 0.55, L, TAN, 0, -0.2, 0, 0.3); // 肚
  const bands = [];
  const N = 9;
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1);
    const z = -L / 2 + 0.15 + k * (L - 0.3);
    const h = 0.75 + Math.sin(k * PI) * 0.35; // 中間高
    const band = pivot(body, 0, 0, z);
    const col = i % 2 ? ARMOR2 : ARMOR;
    const d = (L - 0.3) / (N - 1) + 0.04;
    box(band, 1.2, 0.3, d, col, 0, 0.18 + h * 0.55, 0, 0.3); // 頂
    for (const s of [-1, 1]) {
      box(band, 0.32, h * 0.9, d, col, s * 0.72, 0.05 + h * 0.2, 0, 0.3).rotation.z = s * 0.3; // 兩邊斜
      box(band, 0.08, h * 0.8, d + 0.02, TRIM, s * 0.88, 0.0 + h * 0.15, 0, 0.3).rotation.z = s * 0.3; // 淺灰邊
      cone(band, 0.14, 0.46, spikeM, s * 0.98, 0.25 + h * 0.2, 0, 0, -s * 1.2); // 兩邊尖刺
    }
    box(band, 1.22, 0.05, d * 0.5, TRIM, 0, 0.34 + h * 0.55, 0, 0.3); // 頂中間淺線
    if (i !== 4) cone(band, 0.2, 0.6 + Math.sin(k * PI) * 0.2, spikeM, 0, 0.58 + h * 0.55, 0, -0.25, 0); // 背脊尖刺（燈塔位唔使）
    for (const s of [-1, 1]) cone(band, 0.13, 0.38, spikeM, s * 0.42, 0.5 + h * 0.52, 0, -0.2, -s * 0.5);
    bands.push(band);
  }

  // ---- 頭：長長三角形盔甲頭（米色一節節收窄，每節頂有深色甲片，中間一條骨脊），橙色發光細眼 ----
  const head = pivot(root, 0, BODY_Y + 0.05, -L / 2 - 0.2);
  box(head, 1.0, 0.65, 0.6, TAN2, 0, 0, -0.05, 0.3); // 頸
  box(head, 1.05, 0.16, 0.62, ARMOR, 0, 0.36, -0.05, 0.3);
  const snout = pivot(head, 0, 0, -0.35);
  for (let i = 0; i < 4; i++) {
    const w = 0.9 - i * 0.17;
    const hh = 0.55 - i * 0.08;
    const z = -0.2 - i * 0.32;
    box(snout, w, hh, 0.38, i % 2 ? TAN : 0xe6d3b0, 0, -0.04 - i * 0.03, z, 0.3);
    box(snout, w * 0.8, 0.1, 0.34, i % 2 ? ARMOR2 : ARMOR, 0, hh / 2 - 0.02 - i * 0.03, z, 0.3); // 甲片
    box(snout, 0.12, 0.12, 0.36, TRIM, 0, hh / 2 + 0.06 - i * 0.03, z, 0.3); // 骨脊
  }
  for (const s of [-1, 1]) glowBox(head, 0.06, 0.1, 0.18, windowM, s * 0.48, 0.12, -0.32, 0.3); // 眼（兩邊）
  box(snout, 0.24, 0.14, 0.1, 0x3e2723, 0, -0.14, -1.25, 0.3); // 鼻
  // 身兩邊嘅米色大甲（似張圖）
  for (const s of [-1, 1]) {
    box(body, 0.16, 0.42, L - 0.3, TAN2, s * 0.8, -0.18, 0, 0.3);
    box(body, 0.18, 0.08, L - 0.3, TRIM, s * 0.82, 0.05, 0, 0.3);
  }

  // ---- 背中間嘅燈塔：粗身、深色、橙色窗條、燈房、尖頂 ----
  const tower = pivot(body, 0, 0.9, 0.05);
  box(tower, 0.95, 0.3, 0.95, TAN2, 0, 0.12, 0, 0.25); // 米色底座
  box(tower, 0.8, 1.1, 0.8, ARMOR, 0, 0.8, 0, 0.2);
  for (const s of [-1, 1]) {
    glowBox(tower, 0.05, 0.85, 0.16, windowM, s * 0.41, 0.82, 0, 0.2); // 兩邊長窗條
    glowBox(tower, 0.16, 0.85, 0.05, windowM, 0, 0.82, s * 0.41, 0.2); // 前後窗條
  }
  box(tower, 0.95, 0.12, 0.95, TRIM, 0, 1.4, 0, 0.3);
  const lamp = glowBox(tower, 0.55, 0.42, 0.55, glowMat(0xffb74d, 1.1), 0, 1.68, 0, 0.3); // 燈房
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) box(tower, 0.08, 0.45, 0.08, ARMOR, x, 1.68, z, 0.3); // 燈房框
  box(tower, 0.72, 0.12, 0.72, ARMOR, 0, 1.94, 0, 0.3);
  cone(tower, 0.36, 0.45, ARMOR2, 0, 2.22, 0, 0, 0, 4);
  cone(tower, 0.06, 0.2, spikeM, 0, 2.52, 0, 0, 0, 4);

  // ---- 尾：一節節盔甲收細 + 橙刺 ----
  const tail = pivot(root, 0, BODY_Y - 0.05, L / 2);
  const tsegs = [];
  let tp = tail;
  for (let i = 0; i < 5; i++) {
    const seg = pivot(tp, 0, 0, i === 0 ? 0 : 0.34);
    seg.rotation.x = 0.06;
    const w = 0.55 - i * 0.09;
    box(seg, w, w * 0.8, 0.36, i % 2 ? ARMOR2 : ARMOR, 0, 0, 0.17, 0.3);
    cone(seg, 0.06, 0.2, spikeM, 0, w * 0.45, 0.17, -0.3, 0);
    tsegs.push(seg);
    tp = seg;
  }

  g.userData.animate = (t, moving) => {
    walkLegs(legs, t, moving, 9, 0.45);
    root.position.y = Math.abs(Math.sin(t * 9)) * 0.04 * moving;
    head.rotation.y = Math.sin(t * 1.1) * 0.2;
    snout.rotation.x = Math.sin(t * 2.3) * 0.05; // 嗅嗅
    bands.forEach((b, i) => (b.position.y = Math.sin(t * 6 - i * 0.6) * 0.012 * moving));
    tsegs.forEach((sg, i) => (sg.rotation.y = Math.sin(t * 2.5 - i * 0.5) * 0.12));
    windowM.emissiveIntensity = 1.0 + Math.sin(t * 9) * 0.12;
    lamp.material.emissiveIntensity = 1.0 + Math.sin(t * 3) * 0.25;
  };
  g.userData.move = 'walk';
  g.userData.height = 3.6;
  return g;
}

// ================= Citadel Snail（Epic） =================
// 跟張圖：蝸牛殼上面有座城堡（深色石塔、粉紅尖頂、發光窗）、殼兩邊有隻發光紫色大眼、青苔、
// 眼柄、粉紅色黏液滴落嚟；行過留低粉紅痕
export function buildCitadelSnailModel() {
  const g = new THREE.Group();
  const root = pivot(g);
  const SKIN = 0xdcbf8e;
  const SKIN2 = 0xc9a874;
  const SHELL = 0x8a7653;
  const SHELL2 = 0x6d5c40;
  const STONE = 0x3a3a46;
  const STONE2 = 0x4b4b58;
  const MOSS = 0x7cb342;
  const pink = glowMat(0xff4fb1, 0.6, { roughness: 0.15, metalness: 0.1 });
  const pinkRoof = material(0xff3fa4, { emissive: 0xc2185b, emissiveIntensity: 0.35, flatShading: true });
  const eyeM = glowMat(0xb388ff, 1.4);
  const windowM = glowMat(0xff80d8, 1.3);
  // 身（長長嘅腳）+ 底下粉紅黏液
  const foot = pivot(root, 0, 0, 0);
  box(foot, 1.0, 0.5, 2.4, SKIN, 0, 0.3, 0.15, 0.4);
  box(foot, 0.9, 0.14, 2.3, SKIN2, 0, 0.6, 0.2, 0.4);
  glowBox(foot, 1.12, 0.08, 2.5, pink, 0, 0.05, 0.15, 0.4); // 底下黏液
  // 頭 + 眼柄（兩長兩短）
  const head = pivot(root, 0, 0.75, -1.05);
  box(head, 0.8, 0.7, 0.6, SKIN, 0, 0, 0, 0.4);
  box(head, 0.4, 0.08, 0.06, 0x6d4c41, 0, -0.12, -0.31, 0.3); // 笑口
  const stalks = [[-0.2, 0.75, 0.13], [0.2, 0.75, 0.13], [-0.32, 0.35, 0.08], [0.32, 0.35, 0.08]].map(([x, len, r], i) => {
    const p = pivot(head, x, 0.3, -0.05);
    box(p, 0.09, len, 0.09, SKIN2, 0, len / 2, 0, 0.4);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), i < 2 ? eyeM : material(SKIN2));
    eye.position.y = len + 0.02;
    p.add(eye);
    if (i < 2) box(p, 0.05, 0.06, 0.03, 0x1a1a1a, 0, len + 0.02, -r + 0.01, 0.3);
    p.rotation.z = x * 0.8;
    return p;
  });
  // 殼：大大個圓殼（一層層），有深色螺紋同青苔
  const shell = pivot(root, 0, 1.45, 0.35);
  box(shell, 1.25, 1.55, 1.7, SHELL, 0, 0, 0, 0.45);
  box(shell, 1.32, 1.1, 1.25, SHELL2, 0, -0.05, 0.05, 0.45);
  box(shell, 1.38, 0.65, 0.75, SHELL, 0, -0.08, 0.1, 0.45);
  for (const s of [-1, 1]) {
    // 殼兩邊嘅發光紫色大眼（金邊）
    box(shell, 0.08, 0.62, 0.62, 0x2a2440, s * 0.7, -0.05, 0.1, 0.4);
    glowBox(shell, 0.06, 0.44, 0.44, eyeM, s * 0.73, -0.05, 0.1, 0.4);
    box(shell, 0.06, 0.2, 0.2, 0x12001f, s * 0.76, -0.05, 0.1, 0.4);
    box(shell, 0.04, 0.07, 0.07, 0xffffff, s * 0.78, 0.04, 0.03, 0.4);
  }
  const rand = ((sd) => () => ((sd = (sd * 16807) % 2147483647) / 2147483647))(33);
  for (let i = 0; i < 9; i++) box(shell, 0.3 + rand() * 0.2, 0.12, 0.3 + rand() * 0.2, i % 2 ? MOSS : 0x558b2f, (rand() - 0.5) * 1.1, 0.72 + rand() * 0.05, (rand() - 0.5) * 1.4, 0.3); // 青苔
  // 城堡（喺殼頂，唔好太高）：城牆 + 4 座塔（粉紅尖頂、發光窗）
  const castle = pivot(shell, 0, 0.8, 0);
  box(castle, 1.0, 0.35, 1.1, STONE, 0, 0.17, 0, 0.15);
  for (let i = -2; i <= 2; i++) for (const zz of [-0.55, 0.55]) box(castle, 0.12, 0.14, 0.12, STONE2, i * 0.22, 0.42, zz, 0.15); // 城垛
  const towers = [[0, 0, 0.95, 0.38], [-0.38, -0.38, 0.6, 0.26], [0.38, -0.38, 0.7, 0.26], [0.36, 0.42, 0.55, 0.24], [-0.36, 0.42, 0.5, 0.22]];
  for (const [x, z, h, w] of towers) {
    box(castle, w, h, w, STONE2, x, 0.35 + h / 2, z, 0.15);
    glowBox(castle, 0.07, 0.14, 0.03, windowM, x, 0.35 + h * 0.65, z - w / 2 - 0.005, 0.2);
    cone(castle, w * 0.75, w * 1.5, pinkRoof, x, 0.35 + h + w * 0.75, z, 0, 0, 6);
    cone(castle, 0.025, 0.2, 0xffc107, x, 0.35 + h + w * 1.6, z, 0, 0, 4);
  }
  // 粉紅黏液滴（喺身邊慢慢滴落）
  const drips = [];
  for (let i = 0; i < 6; i++) {
    const d = glowBox(foot, 0.1, 0.18, 0.1, pink, (i % 2 ? 1 : -1) * 0.52, 0.2, -0.8 + i * 0.35, 0.45);
    drips.push({ d, ph: i * 0.37 });
  }
  // 行過留低嘅粉紅痕
  const trail = glowBox(root, 0.7, 0.03, 1.4, pink, 0, 0.02, 2.05, 0.4);

  g.userData.animate = (t, moving) => {
    const wob = Math.sin(t * 3) * 0.03 * (0.4 + moving);
    foot.scale.z = 1 + wob; // 蠕動
    shell.position.y = 1.45 + Math.abs(Math.sin(t * 3)) * 0.04 * moving;
    shell.rotation.z = Math.sin(t * 1.2) * 0.03;
    head.rotation.x = Math.sin(t * 1.5) * 0.05;
    stalks.forEach((p, i) => {
      p.rotation.x = Math.sin(t * 2 + i) * 0.18;
      p.rotation.z = (i % 2 ? 1 : -1) * (0.15 + Math.sin(t * 1.7 + i * 2) * 0.12);
    });
    drips.forEach(({ d, ph }) => {
      const k = (t * 0.5 + ph) % 1;
      d.position.y = 0.2 - k * 0.2;
      d.scale.set(1, 1 + k * 0.8, 1);
    });
    trail.visible = moving > 0.1;
    eyeM.emissiveIntensity = 1.2 + Math.sin(t * 2.2) * 0.3;
    windowM.emissiveIntensity = 1.1 + Math.sin(t * 5) * 0.2;
  };
  g.userData.move = 'walk';
  g.userData.height = 3.3;
  return g;
}
