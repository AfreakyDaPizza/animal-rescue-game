// Biome 7「Enchanted Kingdom」嘅 3D 模型（小朋友 2026-10-17）：方塊（Roblox）風格
//   buildSkywhaleModel()     ：Royal Skywhale（ETERNAL，最勁嘅寵物）：寶藍鯨魚、金月亮星星花紋，背上有浮島同大樹（跟小朋友張圖）
//   buildSunlionModel()      ：Enchanted Sunlion（MYTHIC）：金獅子 + 紫水晶鬃毛
//   buildOctophantModel()    ：Octophant（LEGENDARY）：藍大笨象 + 八爪魚觸手
//   buildGuardianRig()       ：Boss「Enchanted Royal Guardian」：白金色水晶騎士，皇冠頭盔、水晶大劍、皇家盾、披風
//   buildCrystalButterfly(c) ：水晶蝴蝶（翼半透明發光），userData.flap(t) 拍翼
//   buildRune(c)             ：地上嘅魔法符文圈（canvas 畫），userData.spin(t) 轉
// 全部面向 -z（同其他動物、Boss 一樣）

import * as THREE from 'three';
import { box, pivot, cuteEyes, spike, material } from './modelKit.js';

const PI = Math.PI;

// 發光／半透明物料（同一款共用一份）
const glowCache = new Map();
function glow(color, k = 1.2, extra = {}) {
  const key = `${color}|${k}|${JSON.stringify(extra)}`;
  if (!glowCache.has(key)) glowCache.set(key, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.3, ...extra }));
  return glowCache.get(key);
}
const crystal = (color, k = 0.8) => glow(color, k, { transparent: true, opacity: 0.75, metalness: 0.2 });
const gold = () => material(0xffc107, { metalness: 0.85, roughness: 0.25, emissive: 0x6d4c00, emissiveIntensity: 0.35 });

// ================= 細零件（金色花紋、星、月、吸盤） =================
const GOLD_X = { metalness: 0.8, roughness: 0.3, emissive: 0x8d6200, emissiveIntensity: 0.45 };
// 金色四角星（兩條交叉嘅扁方塊 + 中間一粒菱形）
function goldStar(parent, x, y, z, s = 0.18, rotY = 0) {
  const g = pivot(parent, x, y, z);
  g.rotation.y = rotY;
  box(g, s, s * 0.25, 0.04, 0xffca28, 0, 0, 0, 0.3, GOLD_X);
  box(g, s * 0.25, s, 0.04, 0xffca28, 0, 0, 0, 0.3, GOLD_X);
  box(g, s * 0.5, s * 0.5, 0.035, 0xffca28, 0, 0, 0, 0.2, GOLD_X).rotation.z = PI / 4;
  return g;
}
// 金色彎月：一串細方塊排成一條弧線（中間粗、兩頭尖）
function goldMoon(parent, x, y, z, r = 0.3, rotY = 0, rotZ = 0) {
  const g = pivot(parent, x, y, z);
  g.rotation.set(0, rotY, rotZ);
  for (let i = 0; i <= 8; i++) {
    const a = -1.2 + (i / 8) * 2.4;
    const th = 0.06 + Math.sin((i / 8) * PI) * 0.09;
    box(g, th, 0.1, 0.04, 0xffca28, Math.cos(a) * r, Math.sin(a) * r, 0, 0.3, GOLD_X).rotation.z = a;
  }
  return g;
}
// 金色曲線：沿住幾個點砌一條條細金條
function goldLine(parent, pts, w = 0.06) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1, z1] = pts[i];
    const [x2, y2, z2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    const m = box(parent, w, w, len + 0.02, 0xffca28, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, 0.3, GOLD_X);
    m.rotation.order = 'YXZ';
    m.rotation.set(-Math.atan2(y2 - y1, Math.hypot(x2 - x1, z2 - z1)), Math.atan2(x2 - x1, z2 - z1), 0);
  }
}
// 方塊樹冠（一嚿嚿綠色方塊砌成）
function blockCanopy(parent, x, y, z, s, rand) {
  const greens = [0x43a047, 0x66bb6a, 0x2e7d32, 0x7cb342];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * PI * 2;
    const r = i === 0 ? 0 : s * (0.5 + rand() * 0.45);
    const k = s * (0.55 + rand() * 0.35);
    box(parent, k, k * 0.8, k, greens[i % 4], x + Math.cos(a) * r, y + (rand() - 0.3) * s * 0.5 + (i === 0 ? s * 0.25 : 0), z + Math.sin(a) * r, 0.25);
  }
}
const seeded = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ================= Royal Skywhale（ETERNAL，最勁嘅寵物） =================
// 跟小朋友張圖：寶藍色鯨魚、淺色肚、金色月亮同星星花紋、發光青色眼；
// 背脊上面有個浮島（草地、石、一棵大樹），用金啡色繩綁住；長長嘅胸鰭同大尾鰭；喺天上游
export function buildSkywhaleModel() {
  const BODY = 0x3d35e0; // 寶藍（帶少少紫）
  const BODY2 = 0x4c43f0;
  const BELLY = 0x8c9eff; // 淺藍紫肚
  const CYAN = 0x18ffff;
  const rand = seeded(77);
  const g = new THREE.Group();
  const flyY = 1.8;
  const root = pivot(g, 0, flyY, 0);

  // ---- 頭（前面 -z，圓圓扁扁）----
  const head = pivot(root, 0, 0, -1.6);
  box(head, 1.9, 1.35, 2.2, BODY, 0, 0, -0.2, 0.42);
  box(head, 1.6, 1.0, 0.5, BODY2, 0, -0.05, -1.35, 0.45); // 鼻頭
  box(head, 1.75, 0.45, 2.3, BELLY, 0, -0.55, -0.2, 0.42); // 下巴（淺色）
  box(head, 1.82, 0.06, 2.0, 0x283593, 0, -0.3, -0.35, 0.3); // 口線
  for (const s of [-1, 1]) {
    // 發光青色眼（側面）
    box(head, 0.08, 0.22, 0.34, CYAN, s * 0.95, 0.12, -0.75, 0.4, { emissive: CYAN, emissiveIntensity: 2.2 });
    box(head, 0.09, 0.08, 0.12, 0xffffff, s * 0.97, 0.18, -0.8, 0.4, { emissive: 0xffffff, emissiveIntensity: 1 });
    goldMoon(head, s * 0.96, 0.25, 0.1, 0.32, s * PI / 2, 0.4);
    goldStar(head, s * 0.96, -0.05, 0.55, 0.16, s * PI / 2);
  }

  // ---- 身（中間大截，有浮島）----
  const mid = pivot(root, 0, 0, -0.3);
  box(mid, 2.0, 1.45, 2.8, BODY, 0, 0, 1.2, 0.4);
  box(mid, 1.85, 0.5, 2.7, BELLY, 0, -0.62, 1.2, 0.42);
  for (let i = 0; i < 6; i++) box(mid, 1.9, 0.05, 0.12, 0x7986cb, 0, -0.88, 0.1 + i * 0.42, 0.3); // 肚坑紋
  for (const s of [-1, 1]) {
    // 兩邊金色花紋：月亮、星、菱形
    goldMoon(mid, s * 1.01, 0.1, 0.6, 0.38, s * PI / 2, -0.5);
    goldMoon(mid, s * 1.01, -0.05, 1.9, 0.3, s * PI / 2, 2.3);
    goldStar(mid, s * 1.01, 0.42, 1.2, 0.2, s * PI / 2);
    goldStar(mid, s * 1.01, -0.3, 1.25, 0.14, s * PI / 2);
    const dia = pivot(mid, s * 1.02, 0.15, 2.45);
    dia.rotation.y = s * PI / 2;
    box(dia, 0.34, 0.34, 0.04, 0xffca28, 0, 0, 0, 0.15, GOLD_X).rotation.z = PI / 4;
    box(dia, 0.18, 0.18, 0.05, BODY, 0, 0, -0.01, 0.15).rotation.z = PI / 4;
    box(dia, 0.08, 0.08, 0.06, 0xffca28, 0, 0, -0.02, 0.15, GOLD_X).rotation.z = PI / 4;
    goldLine(mid, [[s * 1.02, -0.35, 0.0], [s * 1.02, -0.2, 0.5], [s * 1.02, -0.25, 1.0], [s * 1.02, -0.45, 1.6]]);
  }
  // ---- 背上嘅浮島 ----
  const island = pivot(mid, 0, 0.72, 1.1);
  island.scale.set(1.15, 1.25, 1.2); // 浮島大啲（似張圖）
  box(island, 1.9, 0.35, 2.2, 0x5d4037, 0, 0.05, 0, 0.3); // 泥
  box(island, 2.0, 0.22, 2.3, 0x4caf50, 0, 0.3, 0, 0.3); // 草
  for (let i = 0; i < 6; i++) box(island, 0.45 + rand() * 0.3, 0.12, 0.45 + rand() * 0.3, i % 2 ? 0x66bb6a : 0x388e3c, (rand() - 0.5) * 1.6, 0.44, (rand() - 0.5) * 1.8, 0.3);
  for (let i = 0; i < 3; i++) box(island, 0.3, 0.22, 0.28, 0x9e9e9e, (rand() - 0.5) * 1.6, 0.48, (rand() - 0.5) * 1.8, 0.4); // 石
  // 浮島下面嘅青色發光（似魔法水）
  const islandGlow = box(island, 1.95, 0.12, 2.25, CYAN, 0, -0.15, 0, 0.3, { emissive: CYAN, emissiveIntensity: 1.8, transparent: true, opacity: 0.8 });
  // 大樹：扭紋樹幹 + 方塊樹冠
  const tree = pivot(island, 0.1, 0.4, 0.1);
  tree.scale.setScalar(1.6); // 大樹（張圖入面好大棵）
  for (let i = 0; i < 5; i++) {
    const seg = box(tree, 0.42 - i * 0.04, 0.5, 0.42 - i * 0.04, i % 2 ? 0x6d4c41 : 0x795548, Math.sin(i * 1.3) * 0.12, 0.25 + i * 0.45, Math.cos(i * 1.1) * 0.08, 0.35);
    seg.rotation.y = i * 0.5;
  }
  for (const s of [-1, 1]) box(tree, 0.18, 0.8, 0.18, 0x6d4c41, s * 0.35, 2.0, 0, 0.35).rotation.z = s * -0.7;
  const crown = pivot(tree, 0, 2.6, 0);
  blockCanopy(crown, 0, 0, 0, 1.0, rand);
  blockCanopy(crown, -0.8, -0.2, 0.2, 0.6, rand);
  blockCanopy(crown, 0.8, -0.1, -0.2, 0.6, rand);
  for (let i = 0; i < 4; i++) box(island, 0.12, 0.12, 0.12, 0xea80fc, (rand() - 0.5) * 1.5, 0.5, (rand() - 0.5) * 1.7, 0.4, { emissive: 0xd500f9, emissiveIntensity: 1 }); // 紫色細花
  // 金啡色繩：一圈圈綁住浮島同個身
  for (const dz of [-0.55, 0.65]) {
    const rope = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.09, 6, 24), material(0x8d6e63, { roughness: 0.8 }));
    rope.position.set(0, 0.25, 1.1 + dz);
    rope.scale.set(1, 0.9, 1);
    mid.add(rope);
    const rope2 = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.04, 6, 24), material(0xffc107, GOLD_X));
    rope2.position.set(0, 0.25, 1.2 + dz);
    rope2.scale.set(1, 0.9, 1);
    mid.add(rope2);
  }

  // ---- 長長嘅胸鰭（向後斜）----
  const fins = [-1, 1].map((s) => {
    const f = pivot(mid, s * 0.95, -0.35, 0.6);
    f.scale.setScalar(1.45); // 長長嘅大鰭
    box(f, 1.4, 0.12, 0.75, BODY2, s * 0.7, 0, 0.25, 0.4).rotation.y = s * -0.45;
    box(f, 1.1, 0.1, 0.5, BODY, s * 1.7, -0.05, 0.75, 0.4).rotation.y = s * -0.6;
    box(f, 0.9, 0.04, 0.06, 0xffca28, s * 1.2, 0.07, 0.48, 0.3, GOLD_X).rotation.y = s * -0.5;
    goldStar(f, s * 1.75, 0.08, 0.72, 0.14);
    return { f, s };
  });

  // ---- 後身 + 大尾鰭 ----
  const rear = pivot(mid, 0, 0, 2.6);
  box(rear, 1.5, 1.1, 1.8, BODY, 0, 0.05, 0.85, 0.4);
  box(rear, 1.35, 0.35, 1.7, BELLY, 0, -0.42, 0.85, 0.42);
  for (const s of [-1, 1]) {
    goldLine(rear, [[s * 0.76, 0.3, 0.1], [s * 0.76, 0.1, 0.7], [s * 0.76, 0.25, 1.3], [s * 0.7, 0.0, 1.7]]);
    goldStar(rear, s * 0.77, -0.1, 0.9, 0.14, s * PI / 2);
  }
  const tail = pivot(rear, 0, 0.05, 1.75);
  box(tail, 0.9, 0.7, 1.2, BODY2, 0, 0, 0.5, 0.4);
  const fluke = pivot(tail, 0, 0, 1.1);
  for (const s of [-1, 1]) {
    box(fluke, 1.7, 0.14, 0.8, BODY, s * 0.85, 0, 0.45, 0.4).rotation.y = s * -0.5;
    box(fluke, 1.2, 0.12, 0.35, 0x7c4dff, s * 1.35, 0, 0.85, 0.4, { emissive: 0x651fff, emissiveIntensity: 0.6 }).rotation.y = s * -0.5;
    box(fluke, 1.2, 0.04, 0.06, 0xffca28, s * 0.9, 0.08, 0.45, 0.3, GOLD_X).rotation.y = s * -0.5;
    goldStar(fluke, s * 1.2, 0.1, 0.55, 0.13);
  }

  // 淡淡嘅魔法光暈
  const auraMat = new THREE.MeshBasicMaterial({ color: 0x8c9eff, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide });
  const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), auraMat);
  aura.scale.set(1.5, 1.2, 4.2);
  aura.position.set(0, 0.2, 0.9);
  root.add(aura);

  // 閃粉尾巴
  const SPARK = 30;
  const pos = new Float32Array(SPARK * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xfff59d, size: 0.2, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparks.frustumCulled = false;
  g.add(sparks);

  g.userData.animate = (t, moving) => {
    const sp = 1.6 + moving * 1.2;
    head.rotation.x = Math.sin(t * sp + 0.9) * 0.04;
    mid.rotation.x = Math.sin(t * sp) * 0.04;
    rear.rotation.x = Math.sin(t * sp - 0.9) * 0.1;
    tail.rotation.x = Math.sin(t * sp - 1.6) * 0.18;
    fluke.rotation.x = Math.sin(t * sp - 2.2) * 0.32;
    fins.forEach(({ f, s }) => (f.rotation.z = s * (0.1 + Math.sin(t * sp) * 0.35)));
    crown.rotation.z = Math.sin(t * 1.3) * 0.05; // 樹喺風度擺
    crown.rotation.x = Math.sin(t * 1.1 + 1) * 0.04;
    root.position.y = flyY + Math.sin(t * 1.1) * 0.25;
    islandGlow.material.emissiveIntensity = 1.4 + Math.sin(t * 2.5) * 0.6;
    auraMat.opacity = 0.1 + Math.sin(t * 2) * 0.04;
    for (let i = 0; i < SPARK; i++) {
      const p = (t * 0.45 + i / SPARK) % 1;
      pos[i * 3] = Math.sin(i * 2.4 + t) * (0.3 + p * 1.2);
      pos[i * 3 + 1] = root.position.y + Math.cos(i * 1.7) * 0.3 + p * 0.9;
      pos[i * 3 + 2] = 4.6 + p * 3.5;
    }
    sparkGeo.attributes.position.needsUpdate = true;
  };
  g.userData.move = 'fly';
  g.userData.flying = true;
  g.userData.height = flyY + 2.6;
  return g;
}

// ================= Enchanted Sunlion（MYTHIC） =================
// 跟張圖：金色獅子身、好大嘅紫色水晶碎片鬃毛（有金星同金線）、張大口吼（有牙）、發光眼、尾巴尖有紫水晶、金色腳爪
export function buildSunlionModel() {
  const FUR = 0xf2c680;
  const FUR2 = 0xe0a85a;
  const PURPLE = 0x6a1bdb;
  const PURPLE2 = 0x9c4dff;
  const g = new THREE.Group();
  const root = pivot(g);
  // ---- 四隻腳 + 金爪 ----
  const legs = [];
  for (const [x, z, ph] of [[-0.45, -0.75, 0], [0.45, -0.75, PI], [-0.45, 0.8, PI], [0.45, 0.8, 0]]) {
    const hip = pivot(root, x, 1.15, z);
    box(hip, 0.48, 0.8, 0.52, FUR, 0, -0.35, 0, 0.3);
    box(hip, 0.42, 0.45, 0.46, FUR2, 0, -0.85, -0.02, 0.3);
    box(hip, 0.56, 0.2, 0.62, 0xffd54f, 0, -1.07, -0.06, 0.35, GOLD_X); // 金色腳掌
    for (const tx of [-1, 0, 1]) box(hip, 0.1, 0.1, 0.16, 0xfffde7, tx * 0.16, -1.1, -0.4, 0.4); // 爪
    legs.push({ hip, ph });
  }
  // ---- 身 ----
  box(root, 1.25, 1.0, 2.0, FUR, 0, 1.45, 0.1, 0.32);
  box(root, 1.0, 0.3, 1.8, 0xf8dca8, 0, 1.0, 0.1, 0.35); // 淺肚
  // 背脊上面嘅紫水晶 + 身兩邊嘅金星金線
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), crystal(i % 2 ? PURPLE2 : PURPLE, 0.7));
    c.position.set(i % 2 ? 0.25 : -0.25, 2.0, 0.3 + i * 0.32);
    c.scale.y = 1.8;
    c.rotation.z = i % 2 ? -0.4 : 0.4;
    root.add(c);
  }
  for (const s of [-1, 1]) {
    goldStar(root, s * 0.64, 1.5, 0.6, 0.22, s * PI / 2);
    goldStar(root, s * 0.64, 1.25, 1.0, 0.14, s * PI / 2);
    goldLine(root, [[s * 0.64, 1.75, -0.5], [s * 0.64, 1.55, 0.1], [s * 0.64, 1.7, 0.7], [s * 0.64, 1.45, 1.05]]);
  }
  // ---- 頭（有水晶鬃毛）----
  const neck = pivot(root, 0, 1.95, -0.95);
  const head = pivot(neck, 0, 0, -0.15);
  // 鬃毛：三圈紫色水晶碎片向外射出去，夾住金星同金線
  const mane = pivot(head, 0, 0.05, 0.25);
  const shardMats = [];
  for (let ring = 0; ring < 3; ring++) {
    const n = 12 + ring * 4;
    const rr = 0.75 + ring * 0.32;
    const m = crystal(ring === 1 ? PURPLE2 : PURPLE, 0.55 + ring * 0.15);
    shardMats.push(m);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + ring * 0.2;
      const len = 0.55 + ((i * 7 + ring * 3) % 5) * 0.08;
      const sh = new THREE.Mesh(new THREE.ConeGeometry(0.17 - ring * 0.02, len, 4), m);
      sh.position.set(Math.cos(a) * rr, Math.sin(a) * rr, ring * 0.25);
      sh.rotation.z = a - PI / 2;
      sh.rotation.x = -0.35;
      mane.add(sh);
      if (i % 4 === 0 && ring < 2) goldStar(mane, Math.cos(a) * (rr + 0.25), Math.sin(a) * (rr + 0.25), -0.18 + ring * 0.25, 0.2);
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + 0.2;
    goldLine(mane, [[Math.cos(a) * 0.6, Math.sin(a) * 0.6, -0.15], [Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0.05]], 0.05);
  }
  // 額頭寶石 + 金帶（似皇冠）
  const browGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), glow(0xd500f9, 1.6));
  browGem.position.set(0, 0.42, -0.52);
  browGem.scale.y = 1.5;
  head.add(browGem);
  box(head, 0.6, 0.1, 0.1, 0xffca28, 0, 0.3, -0.5, 0.3, GOLD_X);
  // 面
  box(head, 0.95, 0.8, 0.85, FUR, 0, 0.05, -0.15, 0.35);
  box(head, 0.6, 0.35, 0.4, 0xf8dca8, 0, -0.1, -0.68, 0.35); // 口鼻
  box(head, 0.24, 0.16, 0.1, 0x4e342e, 0, 0.06, -0.9, 0.4); // 鼻
  for (const s of [-1, 1]) {
    box(head, 0.2, 0.12, 0.05, 0xff6d00, s * 0.24, 0.2, -0.58, 0.4, { emissive: 0xffab00, emissiveIntensity: 2.2 }); // 發光眼
    box(head, 0.06, 0.1, 0.03, 0x1a1a1a, s * 0.24, 0.2, -0.61, 0.4);
    box(head, 0.26, 0.07, 0.06, 0x8d5a2b, s * 0.24, 0.32, -0.6, 0.3).rotation.z = s * 0.35; // 嬲嬲眉
    box(head, 0.2, 0.2, 0.12, FUR2, s * 0.38, 0.5, 0.05, 0.4); // 耳
  }
  // 張大口：上排牙 + 會郁嘅下顎、紅色口、舌、下排牙
  box(head, 0.5, 0.06, 0.3, 0xc62828, 0, -0.28, -0.7, 0.3);
  for (const s of [-1, 1]) spike(head, 0.05, 0.18, 0xffffff, s * 0.17, -0.33, -0.8, PI, 0);
  const jaw = pivot(head, 0, -0.3, -0.45);
  box(jaw, 0.52, 0.15, 0.5, FUR, 0, -0.08, -0.25, 0.35);
  box(jaw, 0.42, 0.04, 0.4, 0xb71c1c, 0, 0.01, -0.25, 0.3);
  for (const s of [-1, 1]) spike(jaw, 0.045, 0.16, 0xffffff, s * 0.16, 0.08, -0.43, 0, 0);
  // ---- 尾巴（尖有紫水晶 + 金帶）----
  const tail = pivot(root, 0, 1.75, 1.1);
  box(tail, 0.18, 0.18, 0.9, FUR, 0, 0.2, 0.4, 0.4).rotation.x = -0.5;
  box(tail, 0.2, 0.08, 0.08, 0xffca28, 0, 0.42, 0.76, 0.3, GOLD_X);
  const tip = pivot(tail, 0, 0.5, 0.95);
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), crystal(i % 2 ? PURPLE2 : PURPLE, 0.8));
    c.position.set(Math.cos(i * 1.25) * 0.12, Math.sin(i * 1.25) * 0.12 + 0.1, 0.05);
    c.scale.y = 1.7;
    c.rotation.z = i * 1.25;
    tip.add(c);
  }
  goldStar(tip, 0, 0.12, 0.2, 0.16);

  g.userData.animate = (t, moving) => {
    const sp = 9;
    for (const l of legs) l.hip.rotation.x = Math.sin(t * sp + l.ph) * 0.55 * moving;
    root.position.y = Math.abs(Math.sin(t * sp)) * 0.06 * moving;
    neck.rotation.x = Math.sin(t * 2) * 0.05;
    neck.rotation.y = Math.sin(t * 0.7) * 0.25 * (1 - moving);
    const roar = Math.max(0, Math.sin(t * 0.9)) ** 3; // 隔一陣張大口吼
    jaw.rotation.x = 0.25 + roar * 0.5;
    mane.scale.setScalar(1 + roar * 0.08 + Math.sin(t * 4) * 0.02); // 鬃毛豎起
    const k = 0.5 + Math.sin(t * 3) * 0.25 + roar * 0.4;
    shardMats.forEach((m) => (m.emissiveIntensity = k));
    browGem.rotation.y = t * 2;
    tail.rotation.y = Math.sin(t * 5) * 0.35;
    tip.rotation.z = t;
  };
  g.userData.move = 'walk';
  g.userData.height = 3.3;
  return g;
}

// ================= Octophant（LEGENDARY） =================
// 跟張圖：藍紫色大笨象（皮膚有啲小凸點）、大耳（內面粉紫）、白色象牙、
// 冇象鼻：變咗粉紫色八爪魚觸手（有一粒粒吸盤），頭頂同面兩邊都有；橙色發光眼；淡紫色光暈
export function buildOctophantModel() {
  const SKIN = 0x5b6ef0;
  const SKIN2 = 0x7a6cf0;
  const PINK = 0xd98cf0;
  const SUCK = 0xf3b2ff;
  const g = new THREE.Group();
  const root = pivot(g);
  const bumps = (parent, w, h, d, x, y, z, n, seed) => {
    const r = seeded(seed);
    for (let i = 0; i < n; i++) box(parent, 0.07, 0.07, 0.07, 0x4253d6, x + (r() - 0.5) * w, y + (r() - 0.5) * h, z + (r() - 0.5) * d, 0.2);
  };
  // 一粒吸盤：粉色六角圈 + 深紫色窿（向 -z）
  const ringGeo = new THREE.CylinderGeometry(1, 1.05, 0.08, 6).rotateX(PI / 2);
  const holeGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.09, 6).rotateX(PI / 2);
  const sucker = (parent, x, y, z, r = 0.16) => {
    const holder = pivot(parent, x, y, z);
    const ring = new THREE.Mesh(ringGeo, material(SUCK));
    ring.scale.setScalar(r);
    holder.add(ring);
    const hole = new THREE.Mesh(holeGeo, material(0x4a148c));
    hole.scale.setScalar(r);
    hole.position.z = -0.01;
    holder.add(hole);
    return holder;
  };
  // ---- 腳（粗、白色腳甲）----
  const legs = [];
  for (const [x, z, ph] of [[-0.62, -0.85, 0], [0.62, -0.85, PI], [-0.62, 0.95, PI], [0.62, 0.95, 0]]) {
    const hip = pivot(root, x, 1.4, z);
    box(hip, 0.72, 1.35, 0.72, SKIN, 0, -0.65, 0, 0.25);
    for (const tx of [-1, 0, 1]) box(hip, 0.2, 0.16, 0.12, 0xeceff1, tx * 0.22, -1.32, -0.36, 0.4);
    legs.push({ hip, ph });
  }
  // ---- 身 ----
  box(root, 1.9, 1.6, 2.6, SKIN, 0, 2.0, 0.1, 0.3);
  box(root, 1.7, 0.5, 2.3, SKIN2, 0, 2.75, 0.15, 0.35); // 背
  bumps(root, 1.9, 1.4, 2.4, 0, 2.0, 0.1, 40, 5);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const sk = sucker(root, s * 0.97, 2.1 - i * 0.3, -0.7 + i * 0.35, 0.16);
    sk.rotation.y = s * PI / 2; // 身側嘅觸手吸盤
  }
  // ---- 頭 ----
  const neck = pivot(root, 0, 2.3, -1.25);
  const head = pivot(neck);
  box(head, 1.5, 1.45, 1.1, SKIN2, 0, 0.15, -0.2, 0.3);
  box(head, 0.55, 0.9, 0.3, 0x8f7cf5, 0, 0.0, -0.72, 0.35); // 額頭中間
  bumps(head, 1.3, 1.2, 0.2, 0, 0.1, -0.71, 18, 9);
  for (const s of [-1, 1]) {
    box(head, 0.2, 0.13, 0.05, 0xffab00, s * 0.36, 0.2, -0.72, 0.4, { emissive: 0xff8f00, emissiveIntensity: 2 }); // 橙色發光眼
    box(head, 0.05, 0.11, 0.03, 0x1a1a1a, s * 0.36, 0.2, -0.75, 0.4);
    box(head, 0.26, 0.06, 0.06, 0x3949ab, s * 0.36, 0.33, -0.74, 0.3).rotation.z = s * 0.4; // 嬲嬲眉
    // 大耳（外面藍、內面粉紫）
    const ear = pivot(head, s * 0.65, 0.25, 0.0);
    box(ear, 0.14, 1.85, 1.6, SKIN, s * 0.5, -0.15, 0.35, 0.3);
    box(ear, 0.06, 1.5, 1.25, PINK, s * 0.42, -0.15, 0.3, 0.3);
    for (let k = 0; k < 4; k++) box(ear, 0.16, 0.08, 0.08, 0x4253d6, s * 0.5, 0.5 - k * 0.35, -0.3, 0.3); // 耳邊紋
    ear.rotation.y = s * -0.35;
    // 白色象牙（向前彎）
    const tusk = pivot(head, s * 0.42, -0.45, -0.55);
    for (let i = 0; i < 6; i++) box(tusk, 0.2 - i * 0.025, 0.2 - i * 0.025, 0.32, 0xf5f5f5, s * i * 0.06, -0.12 - i * 0.12 + i * i * 0.035, -0.15 - i * 0.27, 0.4); // 長長嘅白象牙（落咗再向上彎）
  }
  // 頭頂一圈吸盤（向上）
  for (let i = 0; i < 5; i++) sucker(head, -0.4 + i * 0.2, 0.8, -0.25 + (i % 2) * 0.1, 0.12).rotation.x = PI / 2;
  // ---- 觸手（中間一條代替象鼻 + 兩邊各一條），一節節由上面吊落嚟 ----
  const tentacles = [];
  const makeTentacle = (x, y, z, segs, r0, side) => {
    let parent = pivot(head, x, y, z);
    const joints = [];
    for (let i = 0; i < segs; i++) {
      const j = pivot(parent, 0, i === 0 ? 0 : -0.3, 0);
      const r = r0 * (1 - i / (segs + 2));
      box(j, r * 2, 0.32, r * 2, i % 2 ? PINK : 0xc77de8, 0, -0.16, 0, 0.4);
      sucker(j, 0, -0.16, -r - 0.02, r * 0.95);
      joints.push(j);
      parent = j;
    }
    tentacles.push({ joints, side, phase: side * 1.7 + 2 });
  };
  makeTentacle(0, -0.25, -0.7, 8, 0.24, 0);
  makeTentacle(-0.62, -0.1, -0.55, 6, 0.17, -1);
  makeTentacle(0.62, -0.1, -0.55, 6, 0.17, 1);
  // 條尾都係細觸手
  const tail = pivot(root, 0, 2.4, 1.4);
  box(tail, 0.18, 0.7, 0.18, PINK, 0, -0.3, 0.1, 0.4);
  // ---- 紫色光暈 ----
  const auraMat = new THREE.MeshBasicMaterial({ color: 0xd500f9, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide });
  const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), auraMat);
  aura.scale.set(1.6, 1.8, 2.3);
  aura.position.set(0, 2.0, -0.1);
  root.add(aura);

  g.userData.animate = (t, moving) => {
    const sp = 6;
    for (const l of legs) l.hip.rotation.x = Math.sin(t * sp + l.ph) * 0.38 * moving;
    root.position.y = Math.abs(Math.sin(t * sp)) * 0.05 * moving;
    neck.rotation.x = Math.sin(t * 1.6) * 0.04;
    neck.rotation.y = Math.sin(t * 0.6) * 0.2 * (1 - moving);
    for (const tn of tentacles) {
      tn.joints.forEach((j, i) => {
        j.rotation.x = Math.sin(t * 2.2 + tn.phase + i * 0.6) * 0.18 - (tn.side === 0 ? 0.04 : 0);
        j.rotation.z = Math.sin(t * 1.7 + tn.phase + i * 0.5) * 0.12 + tn.side * 0.05;
      });
    }
    tail.rotation.z = Math.sin(t * 4) * 0.3;
    auraMat.opacity = 0.04 + Math.sin(t * 2) * 0.02;
  };
  g.userData.move = 'walk';
  g.userData.height = 3.4;
  return g;
}

// ================= Enchanted Royal Guardian（Boss） =================
// 骨架同 bosses.js 嘅 blockPerson 一樣：root、legs、arms、head、torso（animateRig 用）
export function buildGuardianRig() {
  const ARMOUR = 0xf5f5f0; // 白色盔甲
  const TRIM = 0xffc107; // 金邊
  const CRYSTAL = 0x80deea; // 水晶藍
  const RUNE = 0x18ffff;
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const goldM = gold();
  const glowing = [];
  const runeBox = (parent, w, h, d, x, y, z) => {
    const m = box(parent, w, h, d, RUNE, x, y, z, 0.3, { emissive: RUNE, emissiveIntensity: 1.8 });
    glowing.push(m);
    return m;
  };

  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.3, 1.2, 0);
    box(hip, 0.55, 0.55, 0.55, ARMOUR, 0, -0.25, 0, 0.25, { metalness: 0.4, roughness: 0.35 });
    box(hip, 0.6, 0.18, 0.6, TRIM, 0, -0.52, 0, 0.3, { metalness: 0.85, roughness: 0.25 }); // 金色膝甲
    box(hip, 0.5, 0.45, 0.5, ARMOUR, 0, -0.8, 0, 0.25, { metalness: 0.4, roughness: 0.35 });
    box(hip, 0.58, 0.22, 0.72, 0xb0bec5, 0, -1.08, -0.06, 0.3, { metalness: 0.6, roughness: 0.3 }); // 鐵靴
    runeBox(hip, 0.16, 0.16, 0.04, 0, -0.75, -0.26);
    return hip;
  });
  // 身：白色胸甲 + 金邊 + 中間一粒大水晶
  const torso = box(root, 1.2, 1.2, 0.65, ARMOUR, 0, 1.8, 0, 0.22, { metalness: 0.4, roughness: 0.35 });
  box(root, 1.24, 0.14, 0.69, TRIM, 0, 1.25, 0, 0.3, { metalness: 0.85, roughness: 0.25 }); // 腰帶
  box(root, 1.24, 0.1, 0.69, TRIM, 0, 2.35, 0, 0.3, { metalness: 0.85, roughness: 0.25 });
  const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), glow(CRYSTAL, 1.8));
  heart.position.set(0, 1.85, -0.38);
  heart.scale.y = 1.4;
  root.add(heart);
  glowing.push(heart);
  for (const s of [-1, 1]) runeBox(root, 0.08, 0.5, 0.04, s * 0.38, 1.8, -0.34); // 胸前符文線
  // 披風（背後，深紫有金邊）
  const cape = pivot(root, 0, 2.3, 0.34);
  box(cape, 1.3, 1.9, 0.08, 0x4a148c, 0, -0.95, 0.05, 0.15);
  box(cape, 1.34, 0.12, 0.1, TRIM, 0, -1.88, 0.05, 0.2);
  // 手：膊甲 + 白手臂 + 金手套
  const arms = [-1, 1].map((s) => {
    const shoulder = pivot(root, s * 0.85, 2.25, 0);
    box(shoulder, 0.65, 0.4, 0.65, TRIM, 0, 0.05, 0, 0.3, { metalness: 0.85, roughness: 0.25 }); // 金膊甲
    spike(shoulder, 0.1, 0.35, CRYSTAL, s * 0.18, 0.35, 0);
    box(shoulder, 0.45, 0.95, 0.45, ARMOUR, 0, -0.45, 0, 0.25, { metalness: 0.4, roughness: 0.35 });
    box(shoulder, 0.48, 0.28, 0.48, TRIM, 0, -1.0, 0, 0.3, { metalness: 0.85, roughness: 0.25 });
    return shoulder;
  });
  // 右手（+x）：水晶大劍（劍尖向前）
  const sword = pivot(arms[1], 0, -1.08, 0);
  box(sword, 0.14, 0.32, 0.14, 0x5d4037, 0, 0, 0, 0.3); // 手柄
  box(sword, 0.7, 0.1, 0.16, TRIM, 0, -0.05, -0.15, 0.3, { metalness: 0.85, roughness: 0.25 }); // 護手
  const blade = box(sword, 0.22, 0.08, 1.9, crystal(CRYSTAL, 1.2), 0, -0.05, -1.2, 0.2);
  glowing.push(blade);
  spike(sword, 0.12, 0.35, CRYSTAL, 0, -0.05, -2.3, -PI / 2);
  // 左手（-x）：皇家盾（金邊、藍底、中間符文）
  const shield = pivot(arms[0], -0.28, -0.8, -0.05);
  box(shield, 0.12, 1.2, 0.95, 0x1565c0, 0, 0, 0, 0.25);
  box(shield, 0.14, 1.28, 0.1, TRIM, 0, 0, -0.5, 0.2, { metalness: 0.85, roughness: 0.25 });
  box(shield, 0.14, 1.28, 0.1, TRIM, 0, 0, 0.5, 0.2, { metalness: 0.85, roughness: 0.25 });
  const shieldRune = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 6, 20), glow(RUNE, 1.8));
  shieldRune.position.set(-0.08, 0, 0);
  shieldRune.rotation.y = PI / 2;
  shield.add(shieldRune);
  glowing.push(shieldRune);
  // 頭：頭盔 + 發光眼罩 + 皇冠
  const head = pivot(root, 0, 2.75, 0);
  box(head, 0.82, 0.82, 0.82, ARMOUR, 0, 0, 0, 0.3, { metalness: 0.4, roughness: 0.35 });
  const visor = box(head, 0.66, 0.16, 0.06, RUNE, 0, 0.04, -0.42, 0.3, { emissive: RUNE, emissiveIntensity: 2.4 });
  glowing.push(visor);
  box(head, 0.06, 0.5, 0.06, TRIM, 0, -0.1, -0.42, 0.3); // 鼻甲
  const crown = pivot(head, 0, 0.46, 0);
  box(crown, 0.88, 0.16, 0.88, TRIM, 0, 0, 0, 0.25, { metalness: 0.85, roughness: 0.25 });
  for (const [x, z] of [[-0.34, -0.34], [0.34, -0.34], [-0.34, 0.34], [0.34, 0.34], [0, -0.4]]) spike(crown, 0.08, 0.32, 0xffd54f, x, 0.22, z);
  const crownGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), glow(0xe040fb, 2));
  crownGem.position.set(0, 0.08, -0.46);
  crown.add(crownGem);
  // 頭盔頂嘅羽毛（水晶色）
  box(head, 0.12, 0.45, 0.6, crystal(CRYSTAL, 1), 0, 0.85, 0.15, 0.3);
  // 身邊浮住嘅水晶碎（會轉）
  const orbit = pivot(root, 0, 1.9, 0);
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), crystal(CRYSTAL, 1.4));
    const a = (i / 4) * PI * 2;
    c.position.set(Math.cos(a) * 1.3, Math.sin(i) * 0.3, Math.sin(a) * 1.3);
    c.scale.y = 1.6;
    orbit.add(c);
  }
  g.userData.extra = (t) => {
    const k = 1.4 + Math.sin(t * 3) * 0.7;
    for (const m of glowing) m.material.emissiveIntensity = k;
    orbit.rotation.y = t * 1.2;
    cape.rotation.x = 0.1 + Math.sin(t * 2.2) * 0.08;
    crownGem.rotation.y = t * 2;
  };
  return { g, root, legs, arms, head, torso };
}

// ================= 水晶蝴蝶 =================
// 兩邊各有上下兩塊翼（半透明發光），由身中間嘅 pivot 拍
const butterflyGeo = {
  body: new THREE.BoxGeometry(0.05, 0.05, 0.3),
  upper: new THREE.PlaneGeometry(0.32, 0.26).translate(0.17, 0, -0.04),
  lower: new THREE.PlaneGeometry(0.24, 0.2).translate(0.13, 0, 0.12),
};
const wingMats = new Map();
function wingMat(color) {
  if (!wingMats.has(color)) wingMats.set(color, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false, metalness: 0.3, roughness: 0.2 }));
  return wingMats.get(color);
}
export function buildCrystalButterfly(color = 0x80d8ff) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(butterflyGeo.body, material(0x37474f)));
  const m = wingMat(color);
  const wings = [-1, 1].map((s) => {
    const p = new THREE.Group();
    p.scale.x = s;
    for (const geo of [butterflyGeo.upper, butterflyGeo.lower]) {
      const w = new THREE.Mesh(geo, m);
      w.rotation.x = -PI / 2; // 平放
      p.add(w);
    }
    g.add(p);
    return { p, s };
  });
  const phase = Math.random() * 6;
  g.userData.flap = (t) => {
    const a = 0.25 + Math.abs(Math.sin(t * 9 + phase)) * 1.1;
    for (const { p, s } of wings) p.rotation.z = s * a;
  };
  return g;
}

// ================= 魔法符文圈 =================
// 一塊平放喺地上嘅發光圈：外圈、內圈、六芒星、一圈符號（canvas 畫）
const runeTex = new Map();
function runeTexture(color) {
  if (runeTex.has(color)) return runeTex.get(color);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const hex = `#${new THREE.Color(color).getHexString()}`;
  ctx.strokeStyle = hex;
  ctx.fillStyle = hex;
  ctx.shadowColor = hex;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(128, 128, 92, 0, PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(128, 128, 40, 0, PI * 2);
  ctx.stroke();
  // 六芒星（兩個三角形）
  for (const off of [0, PI / 3]) {
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = off + (i / 3) * PI * 2 - PI / 2;
      const x = 128 + Math.cos(a) * 88;
      const y = 128 + Math.sin(a) * 88;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // 外圈之間嘅符號
  ctx.font = 'bold 20px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyphs = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ'];
  glyphs.forEach((ch, i) => {
    const a = (i / glyphs.length) * PI * 2;
    ctx.save();
    ctx.translate(128 + Math.cos(a) * 105, 128 + Math.sin(a) * 105);
    ctx.rotate(a + PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  runeTex.set(color, tex);
  return tex;
}
export function buildRune(color = 0x18ffff) {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ map: runeTexture(color), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  disc.rotation.x = -PI / 2;
  disc.position.y = 0.04;
  g.add(disc);
  // 中間浮住一粒水晶
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), glow(color, 1.6));
  gem.position.y = 0.6;
  gem.scale.y = 1.5;
  g.add(gem);
  g.userData.spin = (t) => {
    disc.rotation.z = t * 0.5;
    m.opacity = 0.65 + Math.sin(t * 2.5) * 0.25;
    gem.position.y = 0.6 + Math.sin(t * 2) * 0.12;
    gem.rotation.y = t * 1.5;
  };
  return g;
}
