// Biome 7「Enchanted Kingdom」嘅 3D 模型（小朋友 2026-10-17）：方塊（Roblox）風格
//   buildSkywhaleModel()     ：Royal Skywhale（ETERNAL，最勁嘅寵物）：寶藍鯨魚、金月亮星星花紋，背上有浮島同大樹（跟小朋友張圖）
//   buildSunlionModel()      ：Enchanted Sunlion（MYTHIC）：金獅子 + 紫水晶鬃毛
//   buildOctophantModel()    ：Octophant（LEGENDARY）：藍大笨象 + 八爪魚觸手
//   buildGuardianRig()       ：Boss「Enchanted Royal Guardian」：白金色水晶騎士，皇冠頭盔、水晶大劍、皇家盾、披風
//   buildCrystalButterfly(c) ：水晶蝴蝶（翼半透明發光），userData.flap(t) 拍翼
//   buildRune(c)             ：地上嘅魔法符文圈（canvas 畫），userData.spin(t) 轉
// 全部面向 -z（同其他動物、Boss 一樣）

import * as THREE from 'three';
import { box, pivot, cuteEyes, spike, material, ball, slab } from './modelKit.js';

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
  const TOP = 0x2433b8; // 背：深寶藍
  const SIDE = 0x3b4cf2; // 側：亮寶藍
  const BELLY = 0xc6cbff; // 肚：淺紫藍
  const GROOVE = 0x8e98ff;
  const CYAN = 0x18ffff;
  const g = new THREE.Group();
  const S = 1.4; // 小朋友：大隻啲
  const flyY = 2.0 * S;
  const root = pivot(g, 0, flyY, 0);
  root.scale.setScalar(S);
  const rand = seeded(91);

  // 一節身：深色背 + 亮藍側 + 淺色肚（有坑紋）；w/h 由頭到尾慢慢收細
  const section = (parent, w, h, d, z, grooves = true) => {
    box(parent, w, h * 0.62, d, SIDE, 0, h * 0.05, z, 0.3);
    box(parent, w * 0.9, h * 0.32, d * 0.99, TOP, 0, h * 0.33, z, 0.35);
    box(parent, w * 0.94, h * 0.34, d * 0.99, BELLY, 0, -h * 0.3, z, 0.35);
    if (grooves) for (let i = 0; i < 3; i++) box(parent, w * 0.6, 0.05, d * 0.9, GROOVE, (i - 1) * w * 0.25, -h * 0.47, z, 0.3);
  };

  // ---- 頭（-z）：圓圓大頭、長長口線、發光青色眼 ----
  const head = pivot(root, 0, 0, -0.9);
  section(head, 2.4, 2.05, 1.6, -0.95);
  section(head, 2.15, 1.8, 1.0, -2.0);
  box(head, 1.7, 1.2, 0.5, SIDE, 0, -0.05, -2.45, 0.5); // 鼻頭
  box(head, 1.6, 0.5, 0.5, BELLY, 0, -0.55, -2.4, 0.45);
  for (const s of [-1, 1]) {
    bar(head, [s * 0.9, -0.25, -2.55], [s * 1.18, -0.3, -0.3], 0.07, 0x1a237e); // 長口線
    box(head, 0.08, 0.36, 0.52, 0xffca28, s * 1.21, 0.18, -1.35, 0.4, GOLD_X); // 金眼框
    box(head, 0.1, 0.26, 0.4, CYAN, s * 1.22, 0.18, -1.35, 0.4, { emissive: CYAN, emissiveIntensity: 0.8 });
    box(head, 0.11, 0.08, 0.12, 0xffffff, s * 1.23, 0.26, -1.42, 0.4, { emissive: 0xffffff, emissiveIntensity: 0.6 });
    goldLine(head, [[s * 1.16, 0.62, -2.1], [s * 1.17, 0.7, -1.3], [s * 1.16, 0.5, -0.5]], 0.06);
    goldMoon(head, s * 1.17, 0.2, -0.55, 0.32, s * PI / 2, 0.6);
  }
  // 細金冠
  const crown = pivot(head, 0, 1.02, -1.15);
  box(crown, 0.8, 0.14, 0.6, 0xffc107, 0, 0, 0, 0.3, GOLD_X);
  for (let i = 0; i < 5; i++) box(crown, 0.11, 0.26, 0.11, 0xffc107, -0.32 + i * 0.16, 0.18, -0.24, 0.3, GOLD_X);
  box(crown, 0.15, 0.15, 0.06, 0xe040fb, 0, 0.04, -0.33, 0.3, { emissive: 0xd500f9, emissiveIntensity: 0.9 });

  // ---- 身：最粗嗰截（浮島喺度）----
  const mid = pivot(root, 0, 0, 0);
  section(mid, 2.55, 2.15, 1.9, -0.05);
  section(mid, 2.45, 2.05, 1.7, 1.4);
  for (const s of [-1, 1]) {
    goldMoon(mid, s * 1.29, 0.25, -0.3, 0.45, s * PI / 2, -0.4);
    goldStar(mid, s * 1.29, 0.55, 0.7, 0.28, s * PI / 2);
    goldStar(mid, s * 1.28, -0.2, 0.45, 0.16, s * PI / 2);
    goldLine(mid, [[s * 1.28, -0.45, -0.9], [s * 1.29, -0.2, 0.0], [s * 1.28, -0.35, 1.0], [s * 1.25, -0.55, 2.0]], 0.07);
    const dia = pivot(mid, s * 1.3, 0.2, 1.7);
    dia.rotation.y = s * PI / 2;
    box(dia, 0.4, 0.4, 0.04, 0xffca28, 0, 0, 0, 0.15, GOLD_X).rotation.z = PI / 4;
    box(dia, 0.2, 0.2, 0.05, CYAN, 0, 0, -0.01, 0.15, { emissive: CYAN, emissiveIntensity: 0.9 }).rotation.z = PI / 4;
  }
  // 背上細浮島（大約身長 1/4）：泥 + 草 + 石 + 花 + 一棵細樹，下面一圈青色水晶光
  const island = pivot(mid, 0, 1.12, 0.2);
  island.scale.setScalar(1.2);
  box(island, 1.3, 0.28, 1.4, 0x6d4c41, 0, 0, 0, 0.3);
  box(island, 0.9, 0.24, 1.0, 0x5d4037, 0, -0.2, 0, 0.3);
  box(island, 1.4, 0.14, 1.5, 0x4caf50, 0, 0.18, 0, 0.3);
  for (let i = 0; i < 4; i++) box(island, 0.28 + rand() * 0.18, 0.09, 0.28 + rand() * 0.18, i % 2 ? 0x81c784 : 0x388e3c, (rand() - 0.5) * 1.0, 0.27, (rand() - 0.5) * 1.1, 0.3);
  for (let i = 0; i < 3; i++) box(island, 0.2, 0.15, 0.18, 0xb0bec5, (rand() - 0.5) * 1.0, 0.3, (rand() - 0.5) * 1.1, 0.4);
  for (let i = 0; i < 4; i++) box(island, 0.09, 0.09, 0.09, i % 2 ? 0xea80fc : 0xfff176, (rand() - 0.5) * 1.1, 0.31, (rand() - 0.5) * 1.2, 0.4);
  const islandGlow = box(island, 1.05, 0.08, 1.15, CYAN, 0, -0.36, 0, 0.3, { emissive: CYAN, emissiveIntensity: 0.9, transparent: true, opacity: 0.7 });
  const tree = pivot(island, -0.15, 0.22, 0.1);
  for (let i = 0; i < 3; i++) box(tree, 0.17 - i * 0.03, 0.28, 0.17 - i * 0.03, 0x6d4c41, Math.sin(i * 1.4) * 0.06, 0.14 + i * 0.24, 0, 0.35).rotation.y = i * 0.6;
  const canopy = pivot(tree, 0, 0.85, 0);
  blockCanopy(canopy, 0, 0, 0, 0.34, rand);
  // 啡色繩 + 金扣斜斜綁住浮島
  for (const dz of [-0.55, 0.55]) {
    const rope = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.08, 6, 28), material(0x8d6e63));
    rope.position.set(0, 0.1, 0.2 + dz);
    rope.rotation.y = 0.18;
    rope.scale.set(1, 0.88, 1);
    mid.add(rope);
    box(mid, 0.2, 0.22, 0.2, 0xffc107, 1.3, 0.1, 0.2 + dz, 0.3, GOLD_X);
  }

  // ---- 好長嘅胸鰭（向後掃，似翼）----
  const fins = [-1, 1].map((s) => {
    const f = pivot(mid, s * 1.2, -0.5, -0.2);
    const a = box(f, 1.8, 0.16, 1.0, TOP, s * 0.85, 0, 0.35, 0.45);
    a.rotation.y = s * -0.5;
    const b = box(f, 1.7, 0.13, 0.75, SIDE, s * 2.25, -0.06, 1.15, 0.45);
    b.rotation.y = s * -0.65;
    const c = box(f, 1.1, 0.1, 0.45, 0x6a3df5, s * 3.1, -0.1, 1.85, 0.45, { emissive: 0x4a1fd1, emissiveIntensity: 0.35 });
    c.rotation.y = s * -0.75;
    bar(f, [s * 0.4, 0.1, 0.15], [s * 3.0, 0.02, 1.75], 0.06, 0xffca28, GOLD_X);
    goldStar(f, s * 1.7, 0.1, 0.75, 0.2);
    return { f, s };
  });

  // ---- 後身 → 尾柄 → 闊尾鰭（越嚟越幼）----
  const rear = pivot(mid, 0, 0.05, 2.15);
  section(rear, 2.0, 1.65, 1.4, 0.6);
  for (const s of [-1, 1]) {
    goldStar(rear, s * 1.02, 0.25, 0.6, 0.2, s * PI / 2);
    goldMoon(rear, s * 1.02, -0.1, 0.9, 0.25, s * PI / 2, 1.2);
  }
  const tail = pivot(rear, 0, 0.05, 1.3);
  section(tail, 1.35, 1.1, 1.2, 0.5, false);
  const tail2 = pivot(tail, 0, 0, 1.05);
  section(tail2, 0.85, 0.7, 1.0, 0.4, false);
  const fluke = pivot(tail2, 0, 0, 0.85);
  for (const s of [-1, 1]) {
    box(fluke, 2.2, 0.16, 1.0, TOP, s * 1.05, 0, 0.45, 0.45).rotation.y = s * -0.5;
    box(fluke, 1.6, 0.13, 0.5, 0x6a3df5, s * 1.75, 0, 1.0, 0.45, { emissive: 0x4a1fd1, emissiveIntensity: 0.35 }).rotation.y = s * -0.5;
    bar(fluke, [s * 0.2, 0.1, 0.25], [s * 2.05, 0.1, 0.95], 0.06, 0xffca28, GOLD_X);
  }
  goldStar(fluke, 0, 0.12, 0.45, 0.2, 0);

  g.userData.animate = (t, moving) => {
    const sp = 1.3 + moving * 1.0;
    head.rotation.x = Math.sin(t * sp + 0.9) * 0.04;
    mid.rotation.x = Math.sin(t * sp) * 0.03;
    rear.rotation.x = Math.sin(t * sp - 0.9) * 0.08;
    tail.rotation.x = Math.sin(t * sp - 1.6) * 0.16;
    tail2.rotation.x = Math.sin(t * sp - 2.1) * 0.22;
    fluke.rotation.x = Math.sin(t * sp - 2.6) * 0.32;
    fins.forEach(({ f, s }) => (f.rotation.z = s * (0.12 + Math.sin(t * sp) * 0.32)));
    canopy.rotation.z = Math.sin(t * 1.3) * 0.06;
    root.position.y = flyY + Math.sin(t * 1.1) * 0.3;
    root.rotation.z = Math.sin(t * 0.7) * 0.04;
    islandGlow.material.emissiveIntensity = 0.8 + Math.sin(t * 2.5) * 0.3;
  };
  g.userData.move = 'fly';
  g.userData.flying = true;
  g.userData.height = flyY + 2.4 * S;
  return g;
}

// ================= Enchanted Sunlion（MYTHIC） =================
// 小朋友：要大啲、型啲（唔係加特效）→ 跟張圖重新設計：
// 金色壯獅子做「撲」嘅姿勢（前低後高）、成身披住紫水晶盔甲（金色花紋邊 + 大金星）、
// 好大好立體嘅紫水晶鬃毛（向外向後一圈圈）、額頭金框 + 紫寶石、張大口吼（獠牙）、發光橙眼、金色大腳掌、
// 尾巴 S 形，尾尖一嚿紫水晶 + 金星
const UP = new THREE.Vector3(0, 1, 0);
// 水晶碎片向住某個方向（由 base 點長出去）
function shardOut(parent, base, dir, w, len, mat) {
  const d = new THREE.Vector3(...dir).normalize();
  const m = new THREE.Mesh(shardGeo, mat);
  m.scale.set(w, len, w * 0.75);
  m.quaternion.setFromUnitVectors(UP, d);
  m.position.set(base[0] + d.x * len * 0.85, base[1] + d.y * len * 0.85, base[2] + d.z * len * 0.85);
  m.castShadow = true;
  parent.add(m);
  return m;
}
export function buildSunlionModel() {
  const FUR = 0xf2b33a;
  const FUR2 = 0xd99222;
  const PALE = 0xffe0a0;
  const g = new THREE.Group();
  const root = pivot(g);
  const S = 1.4; // 小朋友：大隻啲
  root.scale.setScalar(S);
  const c2 = glow(0x7c3aed, 0.45, { flatShading: true, roughness: 0.2, metalness: 0.3 }); // 紫
  const c3 = glow(0xa78bfa, 0.22, { flatShading: true, roughness: 0.2, metalness: 0.25 }); // 淺紫（反光）
  const BODY_Y = 1.92;

  // ---- 身：前胸低、後腰高（撲） ----
  const body = pivot(root, 0, BODY_Y, 0);
  body.rotation.x = -0.12;
  box(body, 1.7, 1.45, 1.5, FUR, 0, 0.05, -0.75, 0.38); // 胸
  box(body, 1.5, 1.25, 1.5, FUR, 0, 0.05, 0.7, 0.38); // 後腰
  box(body, 1.35, 0.5, 2.6, PALE, 0, -0.55, 0, 0.4); // 肚
  // 紫水晶盔甲：背同兩邊一塊塊（似張圖），每塊有金邊
  const armor = pivot(body, 0, 0, 0);
  // 背：整齊嘅紫水晶鞍（2026-10-18 小朋友話舊款一堆尖刺好亂）：圓角水晶板 + 金邊 + 一行細細整齊嘅水晶
  const saddle = glow(0x6d28d9, 0.4, { roughness: 0.2, metalness: 0.3 });
  const saddleTop = glow(0x8b5cf6, 0.5, { roughness: 0.15, metalness: 0.3 });
  box(armor, 1.25, 0.2, 2.3, 0xffffff, 0, 0.72, 0, 0.45).material = saddle;
  box(armor, 0.9, 0.12, 1.9, 0xffffff, 0, 0.84, 0, 0.45).material = saddleTop;
  for (const s of [-1, 1]) box(armor, 0.08, 0.08, 2.3, 0xffca28, s * 0.62, 0.74, 0, 0.3, GOLD_X); // 金邊
  for (let i = 0; i < 5; i++) {
    const z = -0.9 + i * 0.45;
    shardOut(armor, [0, 0.86, z], [0, 1, 0.35], 0.13, 0.26 - Math.abs(i - 2) * 0.03, c3); // 背脊一行細水晶
    goldStar(armor, 0, 0.91, z + 0.22, 0.12, 0).rotation.x = -PI / 2;
  }
  for (let row = 1; row < 3; row++) for (let i = 0; i < 5; i++) {
    const z = -1.2 + i * 0.55;
    {
      for (const s of [-1, 1]) {
        const y = row === 1 ? 0.35 : -0.05;
        const plate = box(armor, 0.14, 0.42, 0.5, row === 1 ? 0x6d28d9 : 0x5b21b6, s * (row === 1 ? 0.82 : 0.85), y, z, 0.25, { emissive: 0x4c1d95, emissiveIntensity: 0.3, metalness: 0.3, roughness: 0.25, flatShading: true });
        plate.rotation.z = s * (row === 1 ? 0.25 : 0.05);
        box(armor, 0.15, 0.06, 0.52, 0xffca28, s * (row === 1 ? 0.84 : 0.87), y + 0.23, z, 0.3, GOLD_X); // 金邊
      }
    }
  }
  // 兩邊大金星 + 金色彎彎花紋
  for (const s of [-1, 1]) {
    goldStar(armor, s * 0.95, 0.2, -0.75, 0.42, s * PI / 2);
    goldStar(armor, s * 0.93, 0.15, 0.75, 0.32, s * PI / 2);
    goldLine(armor, [[s * 0.9, -0.3, -1.4], [s * 0.94, 0.0, -1.0], [s * 0.93, 0.55, -0.5], [s * 0.9, 0.45, 0.2], [s * 0.92, 0.6, 0.9], [s * 0.88, 0.2, 1.4]], 0.07);
  }

  // ---- 四隻腳：前腳伸前（撲），金色大腳掌 + 白爪；腳都有紫水晶護甲 ----
  const legDef = [[-0.6, -1.05, 1], [0.6, -1.05, 1], [-0.55, 1.0, 0], [0.55, 1.0, 0]];
  const legs = legDef.map(([x, z, front]) => {
    const hip = pivot(root, x, BODY_Y - (front ? 0.25 : 0.05), z);
    hip.rotation.x = front ? 0.35 : -0.15;
    box(hip, 0.62, 0.85, 0.7, FUR, 0, -0.35, 0, 0.38); // 大髀
    box(hip, 0.5, 0.65, 0.55, FUR2, 0, -0.95, -0.05, 0.35); // 小腿
    box(hip, 0.4, 0.4, 0.12, 0x6d28d9, 0, -0.35, -0.38, 0.25, { emissive: 0x4c1d95, emissiveIntensity: 0.3, flatShading: true }); // 腳護甲
    box(hip, 0.42, 0.06, 0.14, 0xffca28, 0, -0.14, -0.4, 0.3, GOLD_X);
    const paw = box(hip, 0.74, 0.3, 0.82, 0xffc928, 0, -1.33, -0.12, 0.4, { emissive: 0xff8f00, emissiveIntensity: 0.25, metalness: 0.4, roughness: 0.3 });
    paw.rotation.x = front ? -0.35 : 0.15;
    for (let c = -1; c <= 1; c++) box(hip, 0.12, 0.13, 0.2, 0xfffde7, c * 0.22, -1.38, -0.58, 0.3);
    return hip;
  });

  // ---- 頭：大、低、向前；張大口吼 ----
  const head = pivot(root, 0, BODY_Y + 0.45, -1.75);
  head.rotation.x = 0.1;
  box(head, 1.35, 1.15, 1.05, FUR, 0, 0.1, 0, 0.32);
  box(head, 1.15, 0.4, 0.95, FUR2, 0, 0.6, 0.05, 0.3); // 額頭
  box(head, 1.05, 0.55, 0.7, PALE, 0, -0.18, -0.65, 0.32); // 口鼻
  box(head, 0.55, 0.35, 0.55, FUR, 0, 0.22, -0.72, 0.3); // 鼻樑
  box(head, 0.48, 0.24, 0.16, 0x3e2723, 0, 0.18, -1.02, 0.35); // 鼻
  for (const s of [-1, 1]) {
    box(head, 0.32, 0.36, 0.16, FUR2, s * 0.55, 0.72, 0.18, 0.35); // 耳
    box(head, 0.16, 0.2, 0.05, 0xffab91, s * 0.55, 0.7, 0.09, 0.35);
    // 眼：發光橙 + 黑瞳 + 嬲眉
    box(head, 0.36, 0.22, 0.06, 0xffb300, s * 0.31, 0.3, -0.56, 0.3, { emissive: 0xff6d00, emissiveIntensity: 1.4 });
    box(head, 0.09, 0.18, 0.04, 0x1a1a1a, s * 0.27, 0.29, -0.6, 0.3);
    const brow = box(head, 0.42, 0.1, 0.12, 0x8d5a1e, s * 0.31, 0.5, -0.58, 0.35);
    brow.rotation.z = s * -0.4;
    box(head, 0.08, 0.3, 0.1, 0xffffff, s * 0.33, -0.45, -0.88, 0.3); // 上獠牙
    for (let i = 0; i < 2; i++) box(head, 0.07, 0.14, 0.07, 0xffffff, s * (0.08 + i * 0.12), -0.42, -0.92, 0.3);
    box(head, 0.36, 0.26, 0.2, PALE, s * 0.32, -0.05, -0.92, 0.35); // 鬚墊
  }
  // 額頭金框 + 紫寶石（似張圖個菱形冠）
  const tiara = pivot(head, 0, 0.62, -0.5);
  bar(tiara, [-0.55, -0.1, 0], [0, 0.32, -0.05], 0.09, 0xffca28, GOLD_X);
  bar(tiara, [0.55, -0.1, 0], [0, 0.32, -0.05], 0.09, 0xffca28, GOLD_X);
  shardOut(tiara, [0, -0.12, -0.08], [0, 1, -0.25], 0.2, 0.32, c2);
  // 下顎（會開合）+ 脷 + 下獠牙
  const jaw = pivot(head, 0, -0.45, -0.3);
  box(jaw, 0.95, 0.26, 0.7, PALE, 0, -0.1, -0.35, 0.32);
  box(jaw, 0.55, 0.08, 0.5, 0xef5350, 0, 0.05, -0.33, 0.3);
  for (const s of [-1, 1]) box(jaw, 0.08, 0.24, 0.08, 0xffffff, s * 0.3, 0.12, -0.6, 0.3);
  box(head, 0.8, 0.3, 0.06, 0x8e1b1b, 0, -0.45, -0.7, 0.3); // 口入面

  // ---- 鬃毛（2026-10-18 重做）：三層整齊嘅水晶花瓣，好似太陽咁圍住塊面；外層深紫、入面淺紫 ----
  // 後面再有一圈金色太陽光芒 + 淡淡金光環（Celestial「Sun」lion）
  const mane = pivot(head, 0, 0.1, 0.2);
  const PETAL = [[0, 0], [0.24, 0.2], [0.22, 0.55], [0, 0.9], [-0.22, 0.55], [-0.24, 0.2]];
  const petalMats = [glow(0xc4b5fd, 0.35, { roughness: 0.2, metalness: 0.2 }), glow(0x8b5cf6, 0.45, { roughness: 0.2, metalness: 0.25 }), glow(0x5b21b6, 0.5, { roughness: 0.2, metalness: 0.3 })];
  const goldRay = material(0xffca28, GOLD_X);
  for (let ring = 2; ring >= 0; ring--) {
    const n = 12 + ring * 2;
    const R = 0.55 + ring * 0.22;
    const k = 0.72 + ring * 0.16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + (ring % 2) * (PI / n);
      const spoke = pivot(mane, 0, 0, 0.12 + ring * 0.16);
      spoke.rotation.z = a - PI / 2;
      const q = pivot(spoke, 0, R, 0);
      q.rotation.x = 0.3 + ring * 0.28; // 外層向後瞓
      slab(q, PETAL.map(([x, y]) => [x * k, y * k]), 0.1, 0, { key: `sunlion-petal${ring}`, bevel: 0.04, extra: petalMats[ring] });
    }
  }
  // 金色太陽光芒（尖尖三角，喺鬃毛後面）
  for (let i = 0; i < 18; i++) {
    const spoke = pivot(mane, 0, 0, 0.62);
    spoke.rotation.z = (i / 18) * PI * 2;
    const q = pivot(spoke, 0, 1.38, 0);
    q.rotation.x = 0.5;
    const len = i % 2 ? 0.42 : 0.62;
    slab(q, [[0.1, 0], [0, len], [-0.1, 0]], 0.05, 0, { key: `sunlion-ray${len}`, bevel: 0.015, smooth: false, extra: goldRay });
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.05, 8, 48), glow(0xffd54f, 1.1));
  halo.position.z = 0.75;
  mane.add(halo);
  head.scale.setScalar(1.15);

  // ---- 尾：S 形向上，尾尖紫水晶 + 金星 ----
  const tail = pivot(root, 0, BODY_Y + 0.55, 1.45);
  const tsegs = [];
  let tp = tail;
  for (let i = 0; i < 5; i++) {
    const seg = pivot(tp, 0, 0, i === 0 ? 0 : 0.36);
    seg.rotation.x = i < 2 ? -0.45 : 0.3;
    box(seg, 0.2, 0.2, 0.42, i % 2 ? FUR : FUR2, 0, 0, 0.18, 0.35);
    if (i === 2) box(seg, 0.24, 0.07, 0.1, 0xffca28, 0, 0, 0.18, 0.3, GOLD_X);
    tsegs.push(seg);
    tp = seg;
  }
  // 尾尖：一撮整齊嘅紫水晶毛（細版鬃毛）+ 發光金星
  const tip = pivot(tp, 0, 0.05, 0.42);
  for (let i = 0; i < 7; i++) {
    const spoke = pivot(tip, 0, 0, 0.05);
    spoke.rotation.z = (i / 7) * PI * 2;
    const q = pivot(spoke, 0, 0.08, 0);
    q.rotation.x = 1.0;
    slab(q, PETAL.map(([x, y]) => [x * 0.55, y * 0.55]), 0.06, 0, { key: 'sunlion-tailpetal', bevel: 0.02, extra: petalMats[1] });
  }
  goldStar(tip, 0, 0.0, 0.42, 0.24, 0).children.forEach((m) => (m.material = glow(0xffd54f, 1.2)));

  g.userData.animate = (t, moving) => {
    const w = Math.sin(t * 7) * 0.5 * moving;
    legs[0].rotation.x = 0.35 + w;
    legs[3].rotation.x = -0.15 + w;
    legs[1].rotation.x = 0.35 - w;
    legs[2].rotation.x = -0.15 - w;
    root.position.y = Math.abs(Math.sin(t * 7)) * 0.08 * moving;
    head.rotation.y = Math.sin(t * 0.7) * 0.18 * (1 - moving);
    // 間中吼：開口、頭向前推
    const roar = Math.max(0, Math.sin(t * 0.9)) ** 6;
    jaw.rotation.x = 0.25 + roar * 0.55;
    head.rotation.x = 0.1 - roar * 0.15;
    mane.scale.setScalar(1 + roar * 0.06);
    tsegs.forEach((sg, i) => (sg.rotation.y = Math.sin(t * 2 - i * 0.6) * 0.18));
  };
  g.userData.move = 'walk';
  g.userData.height = 3.4 * S;
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
  // 圓圓嘅大頭：圓頭殼 + 額頭兩嚿凸凸（似真大笨象）+ 面頰 + 前面一嚿口鼻（觸手由呢度出）
  const head = pivot(root, 0, BODY_Y + 0.55, -1.45);
  ball(head, 0.86, 0.8, 0.74, SKIN, 0, 0.05, 0.02);
  for (const s of [-1, 1]) {
    ball(head, 0.44, 0.38, 0.42, SKIN, s * 0.3, 0.52, -0.14); // 額頭凸凸
    ball(head, 0.34, 0.3, 0.32, SKIN, s * 0.52, -0.28, -0.36); // 面頰
  }
  ball(head, 0.36, 0.08, 0.3, SKIN2, 0, 0.8, 0.12); // 頭頂深色
  ball(head, 0.74, 0.56, 0.5, SKIN, 0, 0.06, -0.34); // 塊面
  ball(head, 0.56, 0.44, 0.42, SKIN2, 0, -0.42, -0.58); // 口鼻
  for (let i = 0; i < 3; i++) sucker(head, -0.35 + i * 0.35, 0.8, 0.22, 0.11, 0, PI / 2); // 頭頂吸盤
  // 又大又圓、發橙光嘅眼（眼白 + 橙色眼珠 + 黑瞳 + 兩點反光），眼眉微微向上 = 好友善
  const irisM = material(0xffb300, { emissive: 0xff8f00, emissiveIntensity: 0.9 });
  for (const s of [-1, 1]) {
    const eye = pivot(head, s * 0.36, 0.14, -0.74);
    eye.rotation.y = s * -0.4;
    ball(eye, 0.21, 0.25, 0.1, 0xffffff);
    ball(eye, 0.15, 0.18, 0.06, 0, 0, -0.02, -0.06, irisM);
    ball(eye, 0.08, 0.1, 0.04, 0x1a1a1a, 0, -0.03, -0.1);
    ball(eye, 0.045, 0.05, 0.02, 0xffffff, s * -0.05, 0.06, -0.12);
    ball(eye, 0.022, 0.025, 0.015, 0xffffff, s * 0.04, -0.07, -0.12);
    const brow = ball(eye, 0.18, 0.04, 0.06, DARK, 0, 0.32, -0.04);
    brow.rotation.z = s * 0.25;
    ball(head, 0.1, 0.07, 0.04, 0xf48fb1, s * 0.55, -0.12, -0.62); // 粉紅面珠
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
    const t = pivot(head, s * 0.4, -0.52, -0.62);
    box(t, 0.18, 0.18, 0.6, 0xfafafa, 0, 0, -0.25, 0.4).rotation.x = 0.3;
    box(t, 0.15, 0.15, 0.55, 0xfafafa, 0, 0.2, -0.75, 0.4).rotation.x = -0.4;
    box(t, 0.11, 0.11, 0.35, 0xfafafa, 0, 0.45, -1.05, 0.4).rotation.x = -0.9;
  }
  // 5 條觸手（代替象鼻）：一節節收細，底面有吸盤
  const tentacles = [[0, -0.2, 1.25], [-0.32, -0.35, 1.0], [0.32, -0.35, 1.0], [-0.6, -0.2, 0.75], [0.6, -0.2, 0.75]].map(([x, y, sc], k) => {
    const base = pivot(head, x * 0.85, y - 0.18, -0.82);
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
