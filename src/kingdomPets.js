// Biome 7 Enchanted Kingdom 嘅新寵物（小朋友 Issue #5 有圖；之後話「好醜、要型啲」→ 全部重做）：方塊（Roblox）風格
// Kitsune Of Runes（Rare）、Gem Dragon（Rare，識飛）、Dreadscale（Common）、Uncoiled Armadillo（Epic）、Citadel Snail（Epic）
// 全部面向 -z。每個回傳 Group：userData.animate(time, moving)、userData.height、userData.move

import * as THREE from 'three';
import { box, pivot, material } from './modelKit.js';

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
// 跟張圖：深藍色方塊狐狸、7 條大尾好似扇咁打開、身同尾有粉紅色發光符文、發光粉紅眼、尖耳（入面粉紅光）
export function buildKitsuneModel() {
  const g = new THREE.Group();
  const root = pivot(g);
  const NAVY = 0x27338f;
  const NAVY2 = 0x3343b0;
  const DARK = 0x161c4f;
  const rune = glowMat(0xff3dbe, 1.2);
  const runeSoft = glowMat(0xff80d8, 0.8);
  const BODY_Y = 1.0;
  // 四隻幼腳（深色襪 + 粉紅發光腳尖）
  const legs = [[-0.28, -0.55], [0.28, -0.55], [-0.28, 0.6], [0.28, 0.6]].map(([x, z]) => {
    const hip = pivot(root, x, BODY_Y - 0.15, z);
    box(hip, 0.24, 0.5, 0.26, NAVY, 0, -0.22, 0, 0.3);
    box(hip, 0.2, 0.42, 0.22, DARK, 0, -0.62, 0, 0.3);
    glowBox(hip, 0.24, 0.08, 0.3, runeSoft, 0, -0.86, -0.03, 0.3);
    return hip;
  });
  // 身 + 胸口毛
  const body = pivot(root, 0, BODY_Y, 0);
  box(body, 0.78, 0.7, 1.55, NAVY, 0, 0.1, 0.05, 0.35);
  box(body, 0.66, 0.25, 1.4, NAVY2, 0, 0.47, 0.05, 0.35);
  box(body, 0.6, 0.55, 0.45, 0x5c6bc0, 0, 0.0, -0.72, 0.35); // 胸口淺色毛
  // 身上符文：一行行粉紅色記號
  for (const s of [-1, 1]) {
    glowBox(body, 0.04, 0.32, 0.06, rune, s * 0.4, 0.15, -0.35, 0.2);
    glowBox(body, 0.04, 0.06, 0.32, rune, s * 0.4, 0.3, -0.2, 0.2);
    glowBox(body, 0.04, 0.2, 0.06, rune, s * 0.4, 0.2, 0.25, 0.2);
    glowBox(body, 0.04, 0.06, 0.25, rune, s * 0.4, 0.05, 0.4, 0.2);
    glowBox(body, 0.04, 0.12, 0.12, runeSoft, s * 0.4, 0.3, 0.6, 0.2).rotation.x = PI / 4;
  }
  // 頸 + 頭
  const head = pivot(root, 0, BODY_Y + 0.6, -0.85);
  box(head, 0.7, 0.6, 0.62, NAVY, 0, 0, 0, 0.35);
  box(head, 0.64, 0.2, 0.55, NAVY2, 0, 0.3, 0, 0.35);
  box(head, 0.36, 0.28, 0.5, NAVY, 0, -0.08, -0.48, 0.35); // 長嘴
  box(head, 0.3, 0.14, 0.45, 0x7986cb, 0, -0.2, -0.45, 0.35); // 下巴淺色
  box(head, 0.12, 0.1, 0.08, 0x0b0b1a, 0, -0.02, -0.74, 0.35); // 鼻
  for (const s of [-1, 1]) {
    // 斜斜嘅發光粉紅眼
    glowBox(head, 0.2, 0.08, 0.05, rune, s * 0.18, 0.08, -0.32, 0.3).rotation.z = s * 0.3;
    // 尖耳（入面粉紅）
    const ear = pivot(head, s * 0.22, 0.35, 0.05);
    box(ear, 0.24, 0.5, 0.14, NAVY, 0, 0.22, 0, 0.25).rotation.z = s * -0.15;
    glowBox(ear, 0.12, 0.34, 0.04, runeSoft, -s * 0.01, 0.2, -0.08, 0.25).rotation.z = s * -0.15;
  }
  glowBox(head, 0.12, 0.12, 0.04, rune, 0, 0.22, -0.32, 0.2).rotation.z = PI / 4; // 額頭符文
  // 7 條大尾：一節節收細，向上向外打開成扇；尾尖粉紅發光
  const tails = [];
  const N = 7;
  for (let k = 0; k < N; k++) {
    const fan = (k / (N - 1) - 0.5) * 2; // -1 … 1
    const base = pivot(root, 0, BODY_Y + 0.25, 0.75);
    base.rotation.order = 'ZXY';
    base.rotation.z = fan * 1.2; // 扇形向兩邊
    base.rotation.x = 0.85; // 向後斜上（正數 = 向 +z 後面）
    const segs = [];
    let parent = base;
    for (let i = 0; i < 6; i++) {
      const p = pivot(parent, 0, i === 0 ? 0 : 0.4, 0);
      const w = 0.28 + Math.sin((i / 5) * PI) * 0.2; // 中間最粗（毛茸茸）
      box(p, w, 0.46, w, i % 2 ? NAVY2 : NAVY, 0, 0.2, 0, 0.42);
      if (i === 3) glowBox(p, w + 0.03, 0.07, w + 0.03, rune, 0, 0.22, 0, 0.3); // 尾中間一圈符文
      segs.push(p);
      parent = p;
    }
    glowBox(parent, 0.22, 0.34, 0.22, rune, 0, 0.55, 0, 0.45); // 尾尖（粉紅火）
    tails.push({ base, segs, fan, k });
  }

  g.userData.animate = (t, moving) => {
    walkLegs(legs, t, moving, 9, 0.6);
    root.position.y = Math.abs(Math.sin(t * 9)) * 0.05 * moving;
    head.rotation.y = Math.sin(t * 0.9) * 0.25 * (1 - moving);
    head.rotation.x = Math.sin(t * 1.3) * 0.05;
    for (const tl of tails) {
      tl.base.rotation.z = tl.fan * (1.1 + Math.sin(t * 1.4) * 0.08);
      tl.segs.forEach((p, i) => (p.rotation.x = Math.sin(t * 2.2 - i * 0.7 + tl.k * 0.6) * 0.12 - 0.12)); // 尾向前彎少少（似問號）
    }
    rune.emissiveIntensity = 1.0 + Math.sin(t * 3) * 0.4;
    runeSoft.emissiveIntensity = 0.7 + Math.sin(t * 3 + 1) * 0.25;
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
  // 身（打橫）：白色身 + 冰藍鱗片 + 深藍胸甲 + 藍色發光 V
  box(body, 1.05, 0.95, 1.6, WHITE, 0, 0, 0, 0.35);
  box(body, 0.95, 0.3, 1.5, ICE, 0, 0.45, 0.05, 0.35);
  box(body, 0.8, 0.5, 1.2, NAVY, 0, -0.32, -0.15, 0.35); // 胸甲
  for (const s of [-1, 1]) glowBox(body, 0.1, 0.06, 0.6, blue, s * 0.2, -0.45, -0.45, 0.3).rotation.y = s * 0.5; // V
  for (const s of [-1, 1]) {
    glowBox(body, 0.04, 0.08, 0.7, blue, s * 0.53, 0.05, 0.1, 0.3); // 身側藍線
    box(body, 0.04, 0.3, 0.3, ICE, s * 0.53, -0.1, 0.5, 0.3);
  }
  // 背脊水晶刺
  for (let i = 0; i < 5; i++) shard(body, 0, 0.62, -0.6 + i * 0.32, 0.1, 0.24 - i * 0.02, crystal, -0.45);
  // 頸（三節，向前向上）+ 頭
  const neck = pivot(body, 0, 0.25, -0.8);
  let np = neck;
  const necks = [];
  for (let i = 0; i < 3; i++) {
    const p = pivot(np, 0, i === 0 ? 0 : 0.18, i === 0 ? 0 : -0.3);
    box(p, 0.5 - i * 0.04, 0.48 - i * 0.04, 0.42, i % 2 ? ICE : WHITE, 0, 0.05, -0.15, 0.35);
    shard(p, 0, 0.32, -0.12, 0.07, 0.15, crystal, -0.5);
    necks.push(p);
    np = p;
  }
  const head = pivot(np, 0, 0.2, -0.45);
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
  const tailBase = pivot(body, 0, 0.1, 0.8);
  const tail = [];
  let tp = tailBase;
  for (let i = 0; i < 6; i++) {
    const p = pivot(tp, 0, 0, i === 0 ? 0 : 0.36);
    const w = 0.42 - i * 0.055;
    box(p, w, w, 0.4, i % 2 ? ICE : WHITE, 0, 0, 0.18, 0.35);
    shard(p, 0, w / 2 + 0.06, 0.18, 0.06, 0.14, crystal, 0.5);
    tail.push(p);
    tp = p;
  }
  shard(tp, 0, 0, 0.62, 0.18, 0.42, crystal, PI / 2);
  // 四隻腳（飛嗰陣收埋）
  const legs = [[-0.35, -0.45], [0.35, -0.45], [-0.35, 0.5], [0.35, 0.5]].map(([x, z]) => {
    const hip = pivot(body, x, -0.35, z);
    box(hip, 0.26, 0.5, 0.28, WHITE, 0, -0.22, 0, 0.3);
    box(hip, 0.24, 0.12, 0.34, NAVY, 0, -0.5, -0.04, 0.3);
    for (let c = -1; c <= 1; c++) shard(hip, c * 0.08, -0.55, -0.24, 0.035, 0.07, crystal, -PI / 2);
    return hip;
  });
  // 一對大水晶翼：骨（白）+ 半透明冰藍膜 + 翼邊水晶
  const wings = [-1, 1].map((s) => {
    const w = pivot(body, s * 0.45, 0.4, -0.25);
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
  g.userData.height = FLY_Y + 1.6;
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
// 跟張圖：犰狳，背上一圈圈深色盔甲（有橙色發光尖刺），米色頭同腳，背上有座燈塔（發光窗、會轉嘅燈）
export function buildArmadilloModel() {
  const g = new THREE.Group();
  const root = pivot(g);
  const TAN = 0xd9b98a;
  const TAN2 = 0xc29e6a;
  const ARMOR = 0x2c2c35;
  const ARMOR2 = 0x45454f;
  const spikeM = glowMat(0xff8f00, 1.1, { flatShading: true });
  const windowM = glowMat(0xffb300, 1.4);
  const BODY_Y = 0.95;
  const legs = [[-0.5, -0.65], [0.5, -0.65], [-0.5, 0.65], [0.5, 0.65]].map(([x, z]) => {
    const hip = pivot(root, x, BODY_Y - 0.25, z);
    box(hip, 0.36, 0.45, 0.4, TAN2, 0, -0.18, 0, 0.3);
    box(hip, 0.4, 0.16, 0.48, ARMOR, 0, -0.42, -0.03, 0.3);
    for (let c = -1; c <= 1; c++) cone(hip, 0.05, 0.16, 0x3e2723, c * 0.11, -0.45, -0.28, -PI / 2.3);
    return hip;
  });
  // 身：米色肚 + 七圈盔甲（拱形），每圈頂有一行橙色發光尖刺
  const body = pivot(root, 0, BODY_Y, 0);
  box(body, 1.15, 0.6, 1.9, TAN, 0, -0.15, 0, 0.35);
  const bands = [];
  for (let i = 0; i < 7; i++) {
    const z = -0.85 + i * 0.28;
    const h = 0.85 + Math.sin((i / 6) * PI) * 0.25;
    const band = pivot(body, 0, 0, z);
    // 拱形：頂一塊 + 兩邊斜斜兩塊 + 淺色邊
    const col = i % 2 ? ARMOR2 : ARMOR;
    box(band, 0.72, 0.22, 0.27, col, 0, 0.32 + h * 0.4, 0, 0.35);
    for (const s of [-1, 1]) {
      box(band, 0.24, h * 0.75, 0.27, col, s * 0.52, 0.12 + h * 0.12, 0, 0.35).rotation.z = s * 0.35;
      box(band, 0.06, h * 0.7, 0.29, 0x6b6b78, s * 0.64, 0.1 + h * 0.1, 0, 0.3).rotation.z = s * 0.35;
    }
    for (let k = -1; k <= 1; k++) cone(band, 0.09, 0.32, spikeM, k * 0.42, 0.42 + h * 0.4 - Math.abs(k) * 0.12, 0, 0, -k * 0.55);
    bands.push(band);
  }
  // 頭：長鼻 + 細耳 + 頭甲
  const head = pivot(root, 0, BODY_Y + 0.05, -1.1);
  box(head, 0.55, 0.45, 0.55, TAN, 0, 0, 0, 0.32);
  box(head, 0.5, 0.18, 0.5, ARMOR, 0, 0.25, 0.02, 0.3); // 頭甲
  box(head, 0.3, 0.26, 0.5, TAN, 0, -0.06, -0.45, 0.32); // 長鼻
  box(head, 0.16, 0.12, 0.08, 0x4e342e, 0, -0.02, -0.72, 0.3);
  for (const s of [-1, 1]) {
    box(head, 0.12, 0.2, 0.1, TAN2, s * 0.2, 0.36, 0.15, 0.3); // 耳
    box(head, 0.1, 0.1, 0.05, 0x1a1a1a, s * 0.17, 0.08, -0.28, 0.35); // 眼
    box(head, 0.04, 0.04, 0.02, 0xffffff, s * 0.19, 0.11, -0.31, 0.35);
  }
  // 尾：一節節盔甲 + 橙色尖
  const tail = pivot(root, 0, BODY_Y - 0.05, 1.0);
  for (let i = 0; i < 5; i++) {
    box(tail, 0.28 - i * 0.04, 0.24 - i * 0.03, 0.3, i % 2 ? ARMOR2 : ARMOR, 0, -i * 0.04, 0.16 + i * 0.27, 0.3);
    cone(tail, 0.04, 0.12, spikeM, 0, 0.13 - i * 0.04, 0.16 + i * 0.27, 0);
  }
  // 背上嘅燈塔（高度同個身差唔多，唔好太大）
  const tower = pivot(body, 0, 0.95, 0.05);
  box(tower, 0.62, 0.3, 0.62, ARMOR2, 0, 0.15, 0, 0.25);
  for (let i = 0; i < 3; i++) {
    const w = 0.5 - i * 0.07;
    box(tower, w, 0.36, w, i % 2 ? 0x37373f : 0x2a2a31, 0, 0.48 + i * 0.36, 0, 0.2);
    for (const s of [-1, 1]) glowBox(tower, 0.05, 0.16, 0.1, windowM, s * (w / 2 + 0.01), 0.48 + i * 0.36, 0, 0.2);
    glowBox(tower, 0.1, 0.16, 0.05, windowM, 0, 0.48 + i * 0.36, -(w / 2 + 0.01), 0.2);
  }
  box(tower, 0.56, 0.06, 0.56, 0xffc107, 0, 1.45, 0, 0.3, { metalness: 0.7, roughness: 0.3 }); // 金色欄杆
  const lamp = glowBox(tower, 0.32, 0.3, 0.32, glowMat(0xffe082, 1.6), 0, 1.65, 0, 0.3); // 燈房
  cone(tower, 0.28, 0.35, ARMOR, 0, 1.97, 0, 0, 0, 6);
  cone(tower, 0.05, 0.18, 0xffc107, 0, 2.22, 0, 0, 0, 6);
  // 會轉嘅燈光（兩條淡黃色光束）
  const beam = pivot(tower, 0, 1.65, 0);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 10, 1, true), beamMat);
    c.rotation.z = s * PI / 2;
    c.position.x = s * 1.25;
    beam.add(c);
  }

  g.userData.animate = (t, moving) => {
    walkLegs(legs, t, moving, 10, 0.5);
    root.position.y = Math.abs(Math.sin(t * 10)) * 0.04 * moving;
    head.rotation.y = Math.sin(t * 1.1) * 0.25;
    head.rotation.x = Math.sin(t * 2.3) * 0.06; // 嗅嗅
    bands.forEach((b, i) => (b.position.y = Math.sin(t * 6 - i * 0.6) * 0.015 * moving));
    tail.rotation.y = Math.sin(t * 3) * 0.3;
    beam.rotation.y = t * 1.6;
    windowM.emissiveIntensity = 1.2 + Math.sin(t * 9) * 0.15 + Math.sin(t * 23) * 0.1; // 燈火閃
    lamp.material.emissiveIntensity = 1.4 + Math.sin(t * 4) * 0.3;
    spikeM.emissiveIntensity = 0.9 + Math.sin(t * 2.5) * 0.25;
  };
  g.userData.move = 'walk';
  g.userData.height = 3.2;
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
