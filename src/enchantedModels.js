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

// ================= 共用：魔法閃粉光環（Mythic／Eternal 先有） =================
// 一圈慢慢轉、上上落落嘅閃粉；回傳 update(t)
let dotTex = null;
// 圓圓、邊邊淡出嘅閃粉（唔係四方格）
export function sparkleTexture() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 32, 32);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}
function sparkleAura(parent, { n = 26, rx = 1.6, rz = 1.6, y0 = 0.5, h = 2.5, color = 0xfff59d, size = 0.16 } = {}) {
  const pos = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: sparkleTexture(), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false;
  parent.add(pts);
  const seeds = Array.from({ length: n }, (_, i) => ({ a: (i / n) * PI * 2, k: (i * 0.618) % 1, r: 0.8 + ((i * 0.37) % 0.4) }));
  return (t) => {
    for (let i = 0; i < n; i++) {
      const s = seeds[i];
      const a = s.a + t * 0.6;
      const k = (s.k + t * 0.18) % 1;
      pos[i * 3] = Math.cos(a) * rx * s.r;
      pos[i * 3 + 1] = y0 + k * h;
      pos[i * 3 + 2] = Math.sin(a) * rz * s.r;
    }
    geo.attributes.position.needsUpdate = true;
    pts.material.opacity = 0.65 + Math.sin(t * 3) * 0.25;
  };
}
// 兩點之間一條方塊（金線、骨架用）
function bar(parent, a, b, w, color, extra) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const m = box(parent, w, w, len + w * 0.6, color, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, 0.3, extra);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2])), Math.atan2(b[0] - a[0], b[2] - a[2]), 0);
  return m;
}
// 水晶碎片（尖尖嘅八面體，拉長）
const shardGeo = new THREE.OctahedronGeometry(1, 0);
function shard(parent, x, y, z, w, len, mat, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(shardGeo, mat);
  m.scale.set(w, len, w * 0.7);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// ================= Royal Skywhale（ETERNAL，最勁嘅寵物） =================
// 跟小朋友張圖：寶藍色大鯨魚（淺紫肚、肚坑紋）、金色月亮／星星／彎線花紋、發光青色眼；
// 背脊上面有個細細嘅浮島（草、石、紫花、一棵細細嘅扭紋樹），用金繩綁住；大胸鰭、大尾鰭（紫色邊）；喺天上游
export function buildSkywhaleModel() {
  const TOP = 0x2a36c9; // 背：深寶藍
  const SIDE = 0x3d4ff0; // 側：亮寶藍
  const BELLY = 0xc3c8ff; // 肚：淺紫藍
  const GROOVE = 0x8f99ff;
  const CYAN = 0x18ffff;
  const g = new THREE.Group();
  const flyY = 2.0;
  const root = pivot(g, 0, flyY, 0);
  const rand = seeded(91);

  // ---- 頭（-z 前面）：大大個、圓角、鼻頭扁扁 ----
  const head = pivot(root, 0, 0, -1.2);
  box(head, 2.3, 1.75, 2.6, SIDE, 0, 0, -0.4, 0.45);
  box(head, 2.1, 0.55, 2.4, TOP, 0, 0.62, -0.35, 0.45); // 頭頂深色
  box(head, 2.05, 1.2, 0.5, SIDE, 0, -0.1, -1.75, 0.5); // 鼻頭
  box(head, 2.15, 0.62, 2.7, BELLY, 0, -0.62, -0.4, 0.45); // 下巴
  for (let i = 0; i < 5; i++) box(head, 2.18, 0.05, 0.1, GROOVE, 0, -0.85, -1.4 + i * 0.42, 0.3); // 下巴坑紋
  box(head, 2.2, 0.06, 2.4, 0x1a237e, 0, -0.32, -0.55, 0.3); // 口線
  for (const s of [-1, 1]) {
    // 發光青色眼（金色眼框）
    box(head, 0.08, 0.34, 0.5, 0xffca28, s * 1.15, 0.12, -1.0, 0.4, GOLD_X);
    box(head, 0.1, 0.24, 0.38, CYAN, s * 1.16, 0.12, -1.0, 0.4, { emissive: CYAN, emissiveIntensity: 1.5 });
    box(head, 0.11, 0.08, 0.12, 0xffffff, s * 1.17, 0.18, -1.06, 0.4, { emissive: 0xffffff, emissiveIntensity: 0.8 });
    goldMoon(head, s * 1.16, 0.32, -0.15, 0.36, s * PI / 2, 0.5);
    goldStar(head, s * 1.16, -0.05, 0.45, 0.2, s * PI / 2);
    goldLine(head, [[s * 1.16, 0.55, -1.6], [s * 1.16, 0.62, -0.9], [s * 1.16, 0.5, -0.3]], 0.05);
  }
  // 頭頂一個細金冠（Royal！）
  const crown = pivot(head, 0, 0.92, -0.6);
  box(crown, 0.9, 0.16, 0.7, 0xffc107, 0, 0, 0, 0.3, GOLD_X);
  for (let i = 0; i < 5; i++) box(crown, 0.12, 0.3, 0.12, 0xffc107, -0.36 + i * 0.18, 0.2, -0.28, 0.3, GOLD_X);
  box(crown, 0.16, 0.16, 0.06, 0xe040fb, 0, 0.05, -0.37, 0.3, { emissive: 0xd500f9, emissiveIntensity: 1.2 });

  // ---- 身（中間大截）----
  const mid = pivot(root, 0, 0, 0);
  box(mid, 2.45, 1.95, 2.6, SIDE, 0, 0, 1.0, 0.42);
  box(mid, 2.25, 0.6, 2.5, TOP, 0, 0.72, 1.0, 0.45);
  box(mid, 2.3, 0.62, 2.55, BELLY, 0, -0.72, 1.0, 0.45);
  for (let i = 0; i < 5; i++) box(mid, 2.32, 0.05, 0.1, GROOVE, 0, -0.98, 0.0 + i * 0.5, 0.3);
  for (const s of [-1, 1]) {
    goldMoon(mid, s * 1.24, 0.2, 0.45, 0.42, s * PI / 2, -0.4);
    goldStar(mid, s * 1.24, 0.45, 1.5, 0.24, s * PI / 2);
    goldStar(mid, s * 1.24, -0.25, 1.3, 0.15, s * PI / 2);
    goldLine(mid, [[s * 1.24, -0.4, -0.2], [s * 1.24, -0.2, 0.6], [s * 1.24, -0.3, 1.4], [s * 1.24, -0.5, 2.2]], 0.06);
    const dia = pivot(mid, s * 1.25, 0.15, 2.0);
    dia.rotation.y = s * PI / 2;
    box(dia, 0.36, 0.36, 0.04, 0xffca28, 0, 0, 0, 0.15, GOLD_X).rotation.z = PI / 4;
    box(dia, 0.18, 0.18, 0.05, CYAN, 0, 0, -0.01, 0.15, { emissive: CYAN, emissiveIntensity: 1.1 }).rotation.z = PI / 4;
  }
  // ---- 背上嘅細浮島（大約身長 1/3）----
  const island = pivot(mid, 0, 1.05, 0.9);
  box(island, 1.5, 0.3, 1.7, 0x6d4c41, 0, 0, 0, 0.3); // 泥
  box(island, 1.1, 0.25, 1.2, 0x5d4037, 0, -0.22, 0, 0.3);
  box(island, 1.6, 0.16, 1.8, 0x4caf50, 0, 0.2, 0, 0.3); // 草
  for (let i = 0; i < 5; i++) box(island, 0.32 + rand() * 0.2, 0.1, 0.32 + rand() * 0.2, i % 2 ? 0x81c784 : 0x388e3c, (rand() - 0.5) * 1.2, 0.3, (rand() - 0.5) * 1.3, 0.3);
  for (let i = 0; i < 3; i++) box(island, 0.22, 0.16, 0.2, 0xb0bec5, (rand() - 0.5) * 1.2, 0.33, (rand() - 0.5) * 1.3, 0.4);
  for (let i = 0; i < 5; i++) box(island, 0.1, 0.1, 0.1, i % 2 ? 0xea80fc : 0xfff176, (rand() - 0.5) * 1.3, 0.34, (rand() - 0.5) * 1.4, 0.4, { emissive: i % 2 ? 0xd500f9 : 0xffd600, emissiveIntensity: 0.8 });
  // 細細棵扭紋樹
  const tree = pivot(island, -0.15, 0.25, 0.1);
  for (let i = 0; i < 3; i++) box(tree, 0.2 - i * 0.03, 0.32, 0.2 - i * 0.03, 0x6d4c41, Math.sin(i * 1.4) * 0.07, 0.16 + i * 0.28, 0, 0.35).rotation.y = i * 0.6;
  const canopy = pivot(tree, 0, 1.0, 0);
  blockCanopy(canopy, 0, 0, 0, 0.42, rand);
  // 金繩綁住
  for (const dz of [-0.55, 0.6]) {
    const rope = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.07, 6, 28), material(0xffc107, GOLD_X));
    rope.position.set(0, 0.15, 0.9 + dz);
    rope.scale.set(1, 0.85, 1);
    mid.add(rope);
  }
  const islandGlow = box(island, 1.2, 0.08, 1.35, CYAN, 0, -0.38, 0, 0.3, { emissive: CYAN, emissiveIntensity: 1.2, transparent: true, opacity: 0.7 });

  // ---- 大胸鰭（似翼咁，喺天上撥）----
  const fins = [-1, 1].map((s) => {
    const f = pivot(mid, s * 1.15, -0.45, 0.2);
    const a = box(f, 1.7, 0.16, 0.95, TOP, s * 0.85, 0, 0.3, 0.4);
    a.rotation.y = s * -0.35;
    const b = box(f, 1.3, 0.13, 0.7, SIDE, s * 2.1, -0.05, 0.85, 0.4);
    b.rotation.y = s * -0.55;
    box(f, 0.9, 0.1, 0.4, 0x7c4dff, s * 2.75, -0.06, 1.25, 0.4, { emissive: 0x651fff, emissiveIntensity: 0.6 }).rotation.y = s * -0.6;
    bar(f, [s * 0.4, 0.1, 0.15], [s * 2.6, 0.06, 1.1], 0.06, 0xffca28, GOLD_X);
    goldStar(f, s * 1.6, 0.1, 0.55, 0.18);
    return { f, s };
  });

  // ---- 後身、尾柄、大尾鰭 ----
  const rear = pivot(mid, 0, 0, 2.3);
  box(rear, 1.9, 1.5, 1.9, SIDE, 0, 0.05, 0.75, 0.42);
  box(rear, 1.7, 0.45, 1.8, TOP, 0, 0.6, 0.75, 0.45);
  box(rear, 1.7, 0.45, 1.8, BELLY, 0, -0.5, 0.75, 0.45);
  for (const s of [-1, 1]) {
    goldStar(rear, s * 0.96, 0.1, 0.8, 0.17, s * PI / 2);
    goldLine(rear, [[s * 0.96, -0.3, 0.1], [s * 0.96, -0.15, 0.8], [s * 0.96, 0.1, 1.5]], 0.05);
  }
  const tail = pivot(rear, 0, 0.05, 1.6);
  box(tail, 1.1, 0.85, 1.4, SIDE, 0, 0, 0.6, 0.42);
  box(tail, 1.0, 0.3, 1.3, TOP, 0, 0.32, 0.6, 0.45);
  const fluke = pivot(tail, 0, 0, 1.25);
  for (const s of [-1, 1]) {
    box(fluke, 2.0, 0.16, 0.95, TOP, s * 1.0, 0, 0.45, 0.4).rotation.y = s * -0.45;
    box(fluke, 1.5, 0.14, 0.45, 0x7c4dff, s * 1.6, 0, 0.95, 0.4, { emissive: 0x651fff, emissiveIntensity: 0.7 }).rotation.y = s * -0.45;
    bar(fluke, [s * 0.2, 0.1, 0.25], [s * 1.9, 0.1, 0.9], 0.06, 0xffca28, GOLD_X);
  }
  goldStar(fluke, 0, 0.12, 0.5, 0.2, 0);

  // ---- 魔法：一圈閃粉（Eternal）+ 淡淡光暈 ----
  const sparkle = sparkleAura(root, { n: 34, rx: 2.4, rz: 3.6, y0: -1.2, h: 3.4, color: 0xb9f6ff, size: 0.2 });
  const auraMat = new THREE.MeshBasicMaterial({ color: 0x8c9eff, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide });
  const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), auraMat);
  aura.scale.set(1.9, 1.5, 4.3);
  aura.position.set(0, 0.1, 1.0);
  root.add(aura);

  g.userData.animate = (t, moving) => {
    const sp = 1.4 + moving * 1.0;
    head.rotation.x = Math.sin(t * sp + 0.9) * 0.05;
    mid.rotation.x = Math.sin(t * sp) * 0.035;
    rear.rotation.x = Math.sin(t * sp - 0.9) * 0.1;
    tail.rotation.x = Math.sin(t * sp - 1.6) * 0.2;
    fluke.rotation.x = Math.sin(t * sp - 2.2) * 0.38;
    fins.forEach(({ f, s }) => (f.rotation.z = s * (0.15 + Math.sin(t * sp) * 0.4)));
    canopy.rotation.z = Math.sin(t * 1.3) * 0.08;
    root.position.y = flyY + Math.sin(t * 1.1) * 0.3;
    root.rotation.z = Math.sin(t * 0.7) * 0.05;
    islandGlow.material.emissiveIntensity = 1.0 + Math.sin(t * 2.5) * 0.4;
    auraMat.opacity = 0.08 + Math.sin(t * 2) * 0.03;
    sparkle(t);
  };
  g.userData.move = 'fly';
  g.userData.flying = true;
  g.userData.height = flyY + 2.3;
  return g;
}

// ================= Enchanted Sunlion（MYTHIC） =================
// 跟張圖：金色壯獅子（淺色口鼻胸口）、超大嘅紫水晶碎片鬃毛（三圈，有金星同金線）、
// 張大口吼（白牙、粉紅脷）、發光橙眼、嬲嬲眉、額頭金帶 + 紫寶石、金腳爪、尾巴尖有紫水晶；身邊有金色閃粉
export function buildSunlionModel() {
  const FUR = 0xf5b83d;
  const FUR2 = 0xe39a26;
  const PALE = 0xffe2a8;
  const g = new THREE.Group();
  const root = pivot(g);
  const mane1 = glow(0x6d28d9, 0.55, { flatShading: true, roughness: 0.25, metalness: 0.2 });
  const mane2 = glow(0xa855f7, 0.7, { flatShading: true, roughness: 0.25, metalness: 0.2 });
  const mane3 = glow(0xd8b4fe, 0.6, { flatShading: true, roughness: 0.25 });
  const maneMats = [mane1, mane2, mane3];
  const BODY_Y = 1.45;

  // ---- 四隻粗腳 + 金爪 ----
  const legs = [[-0.55, -0.85], [0.55, -0.85], [-0.55, 0.95], [0.55, 0.95]].map(([x, z], i) => {
    const hip = pivot(root, x, BODY_Y - 0.2, z);
    box(hip, 0.55, 0.75, 0.6, i < 2 ? FUR : FUR2, 0, -0.3, 0, 0.35);
    box(hip, 0.48, 0.5, 0.5, FUR, 0, -0.85, -0.02, 0.35);
    box(hip, 0.6, 0.22, 0.68, 0xffc107, 0, -1.12, -0.06, 0.35, GOLD_X); // 金腳掌
    for (let c = -1; c <= 1; c++) box(hip, 0.1, 0.1, 0.16, 0xfffde7, c * 0.17, -1.16, -0.42, 0.3);
    return hip;
  });
  // ---- 身 ----
  const body = pivot(root, 0, BODY_Y, 0);
  box(body, 1.45, 1.15, 2.4, FUR, 0, 0.1, 0.1, 0.38);
  box(body, 1.3, 0.5, 2.1, PALE, 0, -0.4, 0.05, 0.4); // 肚
  box(body, 1.2, 0.4, 2.2, FUR2, 0, 0.62, 0.15, 0.4); // 背
  // 背脊一行紫水晶（由鬃毛一路去到尾）
  for (let i = 0; i < 6; i++) shard(body, 0, 0.85, -0.4 + i * 0.38, 0.14, 0.32 - i * 0.03, i % 2 ? mane1 : mane2, -0.5);
  // 身上金線 + 金星
  for (const s of [-1, 1]) {
    goldLine(body, [[s * 0.73, 0.4, -0.7], [s * 0.73, 0.1, 0.0], [s * 0.73, 0.3, 0.7], [s * 0.73, 0.0, 1.2]], 0.05);
    goldStar(body, s * 0.74, 0.0, 0.35, 0.2, s * PI / 2);
  }

  // ---- 頭（大，張口吼）----
  const head = pivot(root, 0, BODY_Y + 0.6, -1.3);
  box(head, 1.25, 1.05, 1.0, FUR, 0, 0.05, 0, 0.3);
  box(head, 1.05, 0.35, 0.9, FUR2, 0, 0.5, 0.05, 0.3); // 額頭
  box(head, 0.95, 0.5, 0.62, PALE, 0, -0.16, -0.62, 0.3); // 闊闊嘅口鼻（獅子）
  box(head, 0.5, 0.3, 0.5, FUR, 0, 0.18, -0.68, 0.3); // 鼻樑
  box(head, 0.4, 0.2, 0.14, 0x4e342e, 0, 0.12, -0.96, 0.35); // 鼻
  for (const s of [-1, 1]) box(head, 0.28, 0.3, 0.14, FUR2, s * 0.5, 0.62, 0.15, 0.35); // 耳仔
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) box(head, 0.06, 0.2, 0.06, 0xffffff, s * (0.16 + i * 0.12), -0.34, -0.8, 0.3); // 上牙
    box(head, 0.09, 0.28, 0.08, 0xffffff, s * 0.3, -0.38, -0.78, 0.3); // 犬齒
    // 發光橙眼 + 嬲嬲眉
    box(head, 0.24, 0.16, 0.05, 0xffd54f, s * 0.27, 0.2, -0.53, 0.35, { emissive: 0xff9100, emissiveIntensity: 1.4 });
    box(head, 0.09, 0.12, 0.05, 0x3e2723, s * 0.24, 0.19, -0.56, 0.35);
    const brow = box(head, 0.32, 0.08, 0.08, 0x8d5a1e, s * 0.27, 0.34, -0.55, 0.35);
    brow.rotation.z = s * -0.35;
  }
  // 額頭金帶 + 紫寶石
  box(head, 0.95, 0.12, 0.1, 0xffc107, 0, 0.46, -0.5, 0.3, GOLD_X);
  shard(head, 0, 0.55, -0.56, 0.13, 0.22, mane2);
  const jaw = pivot(head, 0, -0.38, -0.25);
  box(jaw, 0.85, 0.24, 0.62, PALE, 0, -0.08, -0.32, 0.32);
  box(jaw, 0.52, 0.08, 0.45, 0xe57373, 0, 0.04, -0.3, 0.3); // 脷
  for (const s of [-1, 1]) box(jaw, 0.08, 0.2, 0.08, 0xffffff, s * 0.26, 0.1, -0.52, 0.3);
  // 鬃毛：三圈紫水晶碎片圍住個頭，有金星
  const mane = pivot(head, 0, 0.05, 0.2);
  const maneShards = [];
  [[1.0, 14, 0.5, 0.2], [1.3, 16, 0.65, 0.35], [1.55, 18, 0.55, 0.5]].forEach(([r, n, len, z], ring) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + ring * 0.2;
      const m = shard(mane, Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, z, 0.2, len, maneMats[(i + ring) % 3], 0, 0, a - PI / 2);
      maneShards.push(m);
    }
  });
  // 向後嘅鬃毛（側面都見到成個頸都係水晶）
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2 + ring * 0.26;
    const r = 0.62 + ring * 0.15;
    const m = shard(mane, Math.cos(a) * r, Math.sin(a) * r - 0.1, 0.55 + ring * 0.45, 0.2, 0.62, maneMats[(i + ring) % 3]);
    m.rotation.set(PI / 2 - 0.35, 0, a - PI / 2); // 斜斜向後、向外
    m.rotation.order = 'ZXY';
    maneShards.push(m);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + 0.3;
    goldStar(mane, Math.cos(a) * 0.95, Math.sin(a) * 0.95, -0.12, 0.22, 0);
  }

  // ---- 尾 + 紫水晶尾尖 ----
  const tail = pivot(root, 0, BODY_Y + 0.4, 1.3);
  box(tail, 0.18, 0.18, 0.9, FUR, 0, 0.2, 0.4, 0.3).rotation.x = -0.5;
  const tip = pivot(tail, 0, 0.45, 0.85);
  for (let i = 0; i < 5; i++) shard(tip, 0, 0, 0, 0.13, 0.32, maneMats[i % 3], (i / 5) * PI * 2, 0, 0.6);
  shard(tip, 0, 0.2, 0, 0.15, 0.35, mane2);

  const sparkle = sparkleAura(g, { n: 24, rx: 1.5, rz: 2.0, y0: 0.3, h: 3.0, color: 0xffe57f, size: 0.16 });

  g.userData.animate = (t, moving) => {
    legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 8 + (i % 2 ? PI : 0) + (i > 1 ? PI : 0)) * 0.55 * moving));
    root.position.y = Math.abs(Math.sin(t * 8)) * 0.07 * moving;
    head.rotation.y = Math.sin(t * 0.8) * 0.2 * (1 - moving);
    // 間中吼一下：開口、鬃毛漲大
    const roar = Math.max(0, Math.sin(t * 0.9)) ** 6;
    jaw.rotation.x = 0.15 + roar * 0.6;
    head.rotation.x = -roar * 0.18;
    mane.scale.setScalar(1 + roar * 0.12 + Math.sin(t * 3) * 0.02);
    mane1.emissiveIntensity = 0.5 + roar * 0.6 + Math.sin(t * 2) * 0.1;
    mane2.emissiveIntensity = 0.65 + roar * 0.7;
    tail.rotation.y = Math.sin(t * 2.2) * 0.4;
    tail.rotation.x = Math.sin(t * 1.7) * 0.15;
    sparkle(t);
  };
  g.userData.move = 'walk';
  g.userData.height = 3.4;
  return g;
}

// ================= Octophant（LEGENDARY） =================
// 跟張圖：藍紫色大笨象（皮有一粒粒）、超大耳（粉紅入面）、長長白色彎象牙、發光橙眼；
// 冇象鼻，換咗做 5 條粉紫色八爪魚觸手（有吸盤，識郁），頭頂同身都有吸盤；淡淡粉紫光
export function buildOctophantModel() {
  const SKIN = 0x6f8dff;
  const SKIN2 = 0x5672f0;
  const DARK = 0x3f55c9;
  const TENT = 0xd65db1;
  const TENT2 = 0xf3a6e0;
  const g = new THREE.Group();
  const root = pivot(g);
  const BODY_Y = 1.85;

  // ---- 四隻粗腳 + 白腳甲 ----
  const legs = [[-0.75, -0.95], [0.75, -0.95], [-0.75, 1.0], [0.75, 1.0]].map(([x, z]) => {
    const hip = pivot(root, x, BODY_Y - 0.3, z);
    box(hip, 0.75, 1.0, 0.75, SKIN2, 0, -0.45, 0, 0.3);
    box(hip, 0.8, 0.55, 0.8, SKIN, 0, -1.05, 0, 0.3);
    for (let c = -1; c <= 1; c++) box(hip, 0.16, 0.14, 0.08, 0xf5f5f5, c * 0.22, -1.25, -0.4, 0.3);
    return hip;
  });
  // ---- 身（大大舊，皮有凸粒）----
  const body = pivot(root, 0, BODY_Y, 0);
  box(body, 2.2, 1.8, 2.9, SKIN, 0, 0.1, 0.1, 0.35);
  box(body, 2.0, 0.5, 2.7, SKIN2, 0, 0.9, 0.1, 0.38);
  box(body, 1.9, 0.4, 2.6, DARK, 0, -0.75, 0.1, 0.38);
  const rand = seeded(17);
  for (let i = 0; i < 22; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    box(body, 0.06, 0.16, 0.16, SKIN2, side * 1.11, -0.5 + rand() * 1.3, -1.1 + rand() * 2.4, 0.4); // 皮凸粒
  }
  // 身上吸盤
  const sucker = (parent, x, y, z, r, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.35, 6, 12), material(TENT2, { emissive: 0xd500f9, emissiveIntensity: 0.25 }));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    parent.add(m);
    return m;
  };
  for (const s of [-1, 1]) {
    sucker(body, s * 1.12, 0.2, 0.6, 0.14, s * PI / 2);
    sucker(body, s * 1.12, -0.25, 1.05, 0.11, s * PI / 2);
  }
  // 背上一條細觸手（似條尾）
  const tail = pivot(root, 0, BODY_Y + 0.5, 1.6);
  for (let i = 0; i < 4; i++) box(tail, 0.24 - i * 0.04, 0.24 - i * 0.04, 0.4, i % 2 ? TENT2 : TENT, 0, -i * 0.15, 0.2 + i * 0.35, 0.4);

  // ---- 頭 ----
  const head = pivot(root, 0, BODY_Y + 0.55, -1.45);
  box(head, 1.6, 1.5, 1.3, SKIN, 0, 0, 0, 0.38);
  box(head, 1.45, 0.4, 1.2, SKIN2, 0, 0.6, 0.05, 0.4);
  for (let i = 0; i < 3; i++) sucker(head, -0.35 + i * 0.35, 0.78, 0.1, 0.12, 0, PI / 2); // 頭頂吸盤
  for (const s of [-1, 1]) {
    // 發光橙眼
    box(head, 0.3, 0.24, 0.06, 0xffd180, s * 0.45, 0.18, -0.66, 0.35, { emissive: 0xff9100, emissiveIntensity: 1.3 });
    box(head, 0.1, 0.18, 0.05, 0x1a1a1a, s * 0.42, 0.17, -0.7, 0.35);
    box(head, 0.36, 0.08, 0.08, DARK, s * 0.45, 0.36, -0.67, 0.35).rotation.z = s * -0.25;
  }
  // 大耳（識撥）
  const ears = [-1, 1].map((s) => {
    const e = pivot(head, s * 0.72, 0.2, 0.25);
    // 圓圓嘅大耳：大塊 + 下面細啲 + 粉紅入面（一層層砌到似圓形）
    box(e, 0.16, 1.5, 1.7, SKIN, 0, 0.05, 0.8, 0.45);
    box(e, 0.16, 1.1, 1.3, SKIN, 0, -0.75, 0.7, 0.45);
    box(e, 0.16, 0.5, 0.8, SKIN, 0, -1.25, 0.55, 0.45);
    box(e, 0.06, 1.2, 1.3, 0xf48fb1, -s * 0.07, -0.05, 0.75, 0.45);
    box(e, 0.06, 0.7, 0.85, 0xf48fb1, -s * 0.07, -0.75, 0.65, 0.45);
    box(e, 0.18, 0.1, 1.5, SKIN2, 0, 0.8, 0.8, 0.3); // 耳邊
    return { e, s };
  });
  // 長長白色彎象牙
  for (const s of [-1, 1]) {
    const t = pivot(head, s * 0.42, -0.55, -0.45);
    box(t, 0.18, 0.18, 0.6, 0xfafafa, 0, 0, -0.25, 0.4).rotation.x = 0.3;
    box(t, 0.15, 0.15, 0.55, 0xfafafa, 0, 0.2, -0.75, 0.4).rotation.x = -0.4;
    box(t, 0.11, 0.11, 0.35, 0xfafafa, 0, 0.45, -1.05, 0.4).rotation.x = -0.9;
  }
  // 5 條觸手（代替象鼻）：一節節收細，底面有吸盤
  const tentacles = [[0, -0.2, 1.25], [-0.32, -0.35, 1.0], [0.32, -0.35, 1.0], [-0.6, -0.2, 0.75], [0.6, -0.2, 0.75]].map(([x, y, sc], k) => {
    const base = pivot(head, x, y, -0.65);
    const segs = [];
    let parent = base;
    for (let i = 0; i < 6; i++) {
      const p = pivot(parent, 0, i === 0 ? 0 : -0.36 * sc, 0);
      const w = (0.34 - i * 0.045) * sc;
      box(p, w, 0.4 * sc, w, i % 2 ? TENT : 0xc2479e, 0, -0.18 * sc, 0, 0.45);
      sucker(p, 0, -0.18 * sc, -w / 2 - 0.01, w * 0.32, 0, 0);
      segs.push(p);
      parent = p;
    }
    base.rotation.x = -0.25;
    base.rotation.z = x * 0.6;
    return { segs, k, x };
  });

  // 淡淡粉紫光暈
  const auraMat = new THREE.MeshBasicMaterial({ color: 0xe040fb, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide });
  const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), auraMat);
  aura.scale.set(1.9, 1.9, 2.6);
  aura.position.set(0, BODY_Y + 0.1, -0.1);
  root.add(aura);

  g.userData.animate = (t, moving) => {
    legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 5 + (i % 2 ? PI : 0) + (i > 1 ? PI : 0)) * 0.35 * moving));
    root.position.y = Math.abs(Math.sin(t * 5)) * 0.06 * moving;
    head.rotation.x = Math.sin(t * 1.2) * 0.04;
    ears.forEach(({ e, s }) => (e.rotation.y = s * (0.75 + Math.sin(t * 2.2) * 0.2))); // 大耳向兩邊打開撥下撥下
    for (const tn of tentacles) {
      tn.segs.forEach((p, i) => {
        p.rotation.x = Math.sin(t * 2.2 - i * 0.6 + tn.k) * 0.22 - (i > 3 ? 0.25 : 0);
        p.rotation.z = Math.sin(t * 1.7 - i * 0.5 + tn.k * 1.3) * 0.18 + tn.x * 0.1;
      });
    }
    tail.rotation.y = Math.sin(t * 2) * 0.4;
    auraMat.opacity = 0.06 + Math.sin(t * 2) * 0.02;
  };
  g.userData.move = 'walk';
  g.userData.height = 3.6;
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
