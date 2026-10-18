// Biome 7「Enchanted Kingdom」嘅 3D 模型（小朋友 2026-10-17）：方塊（Roblox）風格
//   buildSkywhaleModel()     ：Royal Skywhale（ETERNAL，最勁嘅寵物）：EXTREME 天空巨獸：深藍黑身 + 發光符文紋、兇眼、金戰冠、巨翼鰭、背上浮空森林遺跡 + 瀑布、符文環
//   buildSunlionModel()      ：Enchanted Sunlion（MYTHIC）：金獅子 + 紫水晶鬃毛
//   buildOctophantModel()    ：Octophant（LEGENDARY）：威武大笨象 + 八爪魚觸手（象鼻尾、下巴、肚底）（v4）
//   buildGuardianRig()       ：Boss「Enchanted Royal Guardian」：白金色水晶騎士，皇冠頭盔、水晶大劍、皇家盾、披風
//   buildCrystalButterfly(c) ：水晶蝴蝶（翼半透明發光），userData.flap(t) 拍翼
//   buildRune(c)             ：地上嘅魔法符文圈（canvas 畫），userData.spin(t) 轉
// 全部面向 -z（同其他動物、Boss 一樣）

import * as THREE from 'three';
import { box, pivot, cuteEyes, spike, material, ball, slab } from './modelKit.js';
import { elephant, sleek, noseIn, tailOut, smooth01 } from './animals20.js';

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
// 小朋友 2026-10-18：唔要方塊、唔要可愛 → 要「EXTREME」：天空巨獸（sky leviathan），順滑身（animals20.js 嘅 sleek）：
// 長長大隻身、好大個頭 + 粗眉骨、窄窄發光青眼（兇）、微微張開嘅口 + 鯨鬚（唔係牙）、
// 深海軍藍／黑藍身 + 發光青色符文紋路、金色戰冠（尖刺）+ 額頭金甲、翼咁大嘅尖鰭（金邊）、背脊一排尖刺；
// 背上一個史詩級浮空森林遺跡：大樹、水晶神殿 + 爛石柱、細瀑布由邊流落去；光暈 + 閃粉 + 兩圈大符文環；唔要身邊嗰圈火（noFireAura）
// 行（飛）嘅動畫：滑翔，隔一陣向下大俯衝再衝返上去（頭跟住向下／向上），條尾大力拍
export function buildSkywhaleModel() {
  const SKIN = 0x0e1638; // 深海軍藍（近黑）
  const BELLY = 0x4a5f9e; // 鋼藍肚
  const VEIN = 0x18ffff; // 發光符文紋（青）
  const EYE = 0x5cf6ff; // 發光眼（青）
  const GOLDC = 0xf2b632;
  const DARK = 0x070b1f;
  const BALEEN = 0xd9cfb4;
  const EYE_HOT = 0xe6ffff; // 眼中間白熱
  const EYE_RIM = 0x0097c7; // 眼珠外圈
  const PUPIL = 0x021a24; // 窄瞳孔
  const LID = 0x1a2552; // 眼皮（比身淺少少）
  const S = 1.45;
  const LEN = 9.6;
  const W = 3.2;
  const H = 3.0;
  const goldM = material(GOLDC, { metalness: 0.75, roughness: 0.28, emissive: 0x3d2500, emissiveIntensity: 0.35 });
  const darkSpikeM = material(0x1a2350, { metalness: 0.4, roughness: 0.35 });
  const crystalM = material(0x7ff6ff, { emissive: 0x18c8ff, emissiveIntensity: 1.6, roughness: 0.15, transparent: true, opacity: 0.9 });
  const cone = (parent, r, h, m, x, y, z, rx = 0, rz = 0, seg = 6) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m);
    c.position.set(x, y, z);
    c.rotation.set(rx, 0, rz);
    c.castShadow = true;
    parent.add(c);
    return c;
  };
  let tailRef = null;
  let fallRef = null;
  const inner = sleek({
    skin: SKIN, belly: BELLY, len: LEN, w: W, h: H, n: 2.2, belt: -0.35, rings: 46, around: 30,
    glow: { [VEIN]: 2.2 },
    // 好大個頭（前面高啲、鈍）、身長而有力、尾柄幼
    prof: (u) => [
      noseIn(u, 0.2) * tailOut(u, 0.5, 0.12) * (1 - 0.1 * smooth01(0.22, 0.5, u)),
      noseIn(u, 0.24) * tailOut(u, 0.46, 0.14) * (1.06 - 0.14 * smooth01(0.18, 0.5, u)),
      -0.02 + 0.04 * (1 - smooth01(0, 0.3, u)),
    ],
    extras(parts) {
      const { dot, fin, tail, seg, surf } = parts;
      tailRef = tail;
      // 身上 (u, ang) 嗰點：回傳要掛喺邊個轉軸 + 位置
      const at = (u, ang, lift = 0) => {
        const [pv, lz] = seg(u);
        const { p, n } = surf(u, ang, lift);
        return { pv, x: p.x, y: p.y, z: lz, n };
      };
      // 貼住身表面嘅一塊（按表面方向擺），用嚟做金甲、眉骨
      const plate = (u, ang, sx, sy, sz, mat, lift = 0, tilt = 0) => {
        const { pv, x, y, z, n } = at(u, ang, lift);
        const m = ball(pv, sx, sy, sz, 0, x, y, z, mat);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        if (tilt) m.rotateY(tilt);
        return m;
      };
      // ---- 兇兇嘅眼（小朋友 2026-10-18：之前個眼好核突 → 重做）----
      // 杏仁形、陷入個頭入面：深色眼窩 → 發光青色眼珠 → 白熱中心 → 直直嘅窄瞳孔 + 反光；
      // 上面一塊厚眼皮（凸出少少遮住眼頂，好兇）、下面一條細眼皮、金色細眉線、眼尾拖一條發光符文線
      const eyeSocketM = material(DARK, { roughness: 0.6 });
      const eyeRimM = glow(EYE_RIM, 1.6);
      const eyeM = glow(EYE, 2.4);
      const eyeHotM = glow(EYE_HOT, 3.0);
      const pupilM = material(PUPIL, { roughness: 0.2 });
      const shineM = glow(0xffffff, 2);
      const lidM = material(LID, { roughness: 0.45 });
      for (const side of [0, 1]) {
        const A = (a) => (side ? PI - a : a);
        const sl = side ? -0.32 : 0.32; // 眼斜斜（前低後高）
        const U = 0.172;
        const AN = 0.36;
        // 用順滑嘅波波（貼住頭表面）砌，近睇都唔會見到一格格
        plate(U, A(AN), 0.33, 0.07, 0.8, eyeSocketM, -0.05, sl); // 眼窩（陷入去）
        plate(U, A(AN), 0.21, 0.06, 0.63, eyeRimM, -0.03, sl); // 眼珠外圈（深啲嘅青）
        plate(U - 0.002, A(AN), 0.165, 0.06, 0.52, eyeM, -0.022, sl); // 發光眼珠（杏仁形）
        plate(U - 0.004, A(AN - 0.01), 0.075, 0.06, 0.22, eyeHotM, -0.016, sl); // 白熱中心
        plate(U - 0.004, A(AN - 0.01), 0.15, 0.05, 0.034, pupilM, -0.008, sl); // 直直窄瞳孔
        plate(U - 0.016, A(AN + 0.065), 0.035, 0.03, 0.05, shineM, 0.005, sl); // 反光
        plate(U + 0.002, A(AN + 0.16), 0.14, 0.13, 0.9, lidM, -0.05, sl); // 上眼皮（厚、凸出）
        plate(U + 0.004, A(AN - 0.15), 0.065, 0.07, 0.72, lidM, -0.04, sl); // 下眼皮
        plate(U + 0.004, A(AN + 0.27), 0.045, 0.05, 0.62, goldM, -0.02, sl * 1.3); // 金眉線（一條順滑嘅金邊）
        for (let k = 0; k < 16; k++) dot(U + 0.05 + k * 0.0065, A(AN + 0.02 - k * 0.012), 0.022, 0.02, 0.05, VEIN, 0.005); // 眼尾符文線
        dot(U + 0.16, A(AN - 0.17), 0.06, 0.02, 0.06, VEIN, 0.006); // 符文線尾嗰粒
      }
      // ---- 微微張開嘅口：深色口線 + 下面一排鯨鬚（唔係牙）----
      for (const side of [0, 1]) {
        const A = (a) => (side ? PI - a : a);
        for (let k = 0; k < 30; k++) {
          const u = 0.01 + k * 0.0105;
          const a = -0.08 - (k / 29) ** 2 * 0.42; // 口角向下（兇啲）
          dot(u, A(a), 0.11, 0.05, 0.08, DARK, 0.004);
          if (k > 1 && k < 27) dot(u, A(a - 0.13), 0.022, 0.03, 0.06, BALEEN, 0.002, 0); // 鯨鬚（微微張口見到）
        }
      }
      for (let i = -4; i <= 4; i++) for (let k = 0; k < 10; k++) dot(0.06 + k * 0.045, -PI / 2 + i * 0.13, 0.03, 0.015, 0.1, 0x6d80bd, 0.004); // 喉嚨坑紋
      // ---- 發光符文紋路：兩邊沿住身一條條波浪線 + 分叉 + 符文圈 ----
      for (const side of [0, 1]) {
        const A = (a) => (side ? PI - a : a);
        for (let k = 0; k < 110; k++) {
          const u = 0.2 + k * 0.0068;
          dot(u, A(0.08 + Math.sin(k * 0.15) * 0.16), 0.03, 0.02, 0.05, VEIN, 0.006);
          if (k % 14 === 7) for (let j = 1; j < 7; j++) dot(u + j * 0.006, A(0.08 + Math.sin(k * 0.15) * 0.16 + j * 0.06), 0.025, 0.02, 0.04, VEIN, 0.006); // 分叉向上
          if (k % 14 === 0 && k) for (let j = 1; j < 6; j++) dot(u + j * 0.005, A(0.08 + Math.sin(k * 0.15) * 0.16 - j * 0.06), 0.025, 0.02, 0.04, VEIN, 0.006); // 分叉向下
        }
        // 符文圈（每邊兩個）
        for (const [cu, ca] of [[0.36, 0.42], [0.62, 0.32]]) {
          for (let k = 0; k < 22; k++) {
            const t = (k / 22) * PI * 2;
            dot(cu + Math.cos(t) * 0.035, A(ca + Math.sin(t) * 0.17), 0.035, 0.02, 0.05, VEIN, 0.006);
          }
          for (let k = -3; k <= 3; k++) dot(cu + k * 0.009, A(ca + k * 0.035), 0.03, 0.02, 0.04, VEIN, 0.007); // 斜一劃
          for (let k = -3; k <= 3; k++) dot(cu - k * 0.009, A(ca + k * 0.035), 0.03, 0.02, 0.04, VEIN, 0.007); // 交叉一劃
        }
      }
      for (let k = 0; k < 60; k++) dot(0.28 + k * 0.009, PI / 2, 0.04, 0.02, 0.07, VEIN, 0.006); // 背脊中線
      // ---- 金色戰冠：額頭幾塊金甲 + 頭頂一排大尖刺（中間最高）+ 青寶石 ----
      // 額頭金頭盔：幾塊大大塊、貼住頭嘅金甲（重疊）
      plate(0.06, PI / 2, 0.95, 0.09, 0.55, goldM, 0.02);
      plate(0.11, PI / 2, 0.85, 0.09, 0.5, goldM, 0.05);
      for (const side of [0, 1]) plate(0.08, side ? PI - 0.95 : 0.95, 0.5, 0.08, 0.45, goldM, 0.02);
      {
        const { pv, x, y, z } = at(0.03, PI / 2.3, 0.02);
        ball(pv, 0.16, 0.16, 0.12, VEIN, x, y + 0.08, z, crystalM); // 額頭青寶石
        ball(pv, 0.16, 0.16, 0.12, VEIN, -x, y + 0.08, z, crystalM);
      }
      // 頭頂一圈大戰冠：9 枝高矮唔同、向後彎嘅尖刺 + 寶石
      {
        const { pv, y, z } = at(0.2, PI / 2, -0.12);
        const crown = pivot(pv, 0, y, z);
        crown.rotation.x = -0.28; // 向後斜
        const band = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.32, 24, 1, true), goldM);
        band.material.side = THREE.DoubleSide;
        band.scale.set(1, 1, 0.8);
        crown.add(band);
        for (let k = 0; k < 9; k++) {
          const a = PI + (k / 8) * PI; // 前面半圈（向住頭前面）
          const x = Math.cos(a) * 1.2;
          const zz = Math.sin(a) * 0.96 * 0.8;
          const h = [0.9, 1.2, 1.6, 1.9, 2.3, 1.9, 1.6, 1.2, 0.9][k];
          const sp = cone(crown, 0.18, h, goldM, x, h / 2 + 0.1, zz, 0.22, -x * 0.22);
          sp.position.z += 0.0;
          ball(crown, 0.13, 0.13, 0.1, 0, x * 1.03, 0.05, zz * 1.05, k === 4 ? crystalM : material(k % 2 ? 0xea80fc : 0x18ffff, { emissive: k % 2 ? 0xd500f9 : 0x00b8d4, emissiveIntensity: 1.5 }));
        }
        for (let k = 0; k < 5; k++) { // 後面半圈細啲
          const a = (k / 4) * PI;
          cone(crown, 0.13, 0.6, goldM, Math.cos(a) * 1.2, 0.4, Math.sin(a) * 0.77, -0.3, -Math.cos(a) * 0.3);
        }
      }
      // 兩隻由眉骨向後掃嘅大金角
      for (const side of [0, 1]) {
        const { pv, x, y, z } = at(0.15, side ? PI - 0.75 : 0.75, 0);
        const horn = pivot(pv, x, y, z);
        horn.rotation.set(1.05, 0, (side ? 1 : -1) * 0.55);
        for (let k = 0; k < 4; k++) {
          const c = cone(horn, 0.22 - k * 0.045, 0.55, goldM, 0, 0.25 + k * 0.42, -k * k * 0.03, -k * 0.12, 0, 8);
          c.castShadow = true;
        }
      }
      // 頭兩邊向後嘅金甲刺（好似頭盔）
      for (const side of [0, 1]) {
        const A = (a) => (side ? PI - a : a);
        for (let k = 0; k < 3; k++) {
          const { pv, x, y, z } = at(0.15 + k * 0.05, A(0.85), 0);
          cone(pv, 0.12, 0.8 - k * 0.15, goldM, x, y, z, 1.25, (side ? 1 : -1) * 0.5);
        }
      }
      // ---- 背脊一排尖刺（深色 + 金尖），越後越細 ----
      for (let k = 0; k < 13; k++) {
        const u = 0.3 + k * 0.045;
        if (u > 0.36 && u < 0.69) continue; // 背上個浮島嗰度唔放
        const { pv, y, z } = at(u, PI / 2, -0.05);
        const hgt = 0.9 * (1 - k / 16);
        cone(pv, 0.18 * (1 - k / 20), hgt, darkSpikeM, 0, y + hgt / 2 - 0.05, z, 0.45);
        cone(pv, 0.07, hgt * 0.35, goldM, 0, y + hgt * 0.95, z + hgt * 0.2, 0.45);
      }
      // ---- 背上：浮空聖地（小朋友 2026-10-18：之前個島好核突 → 重做）----
      // 一個貼住背脊弧度嘅圓圓青苔泥丘、一棵好靚嘅大樹（幾層圓樹冠 + 發光花）、幾嚿石、花同蕨、一道細細嘅古石拱門（中間青色符文）
      {
        const { pv, y, z } = at(0.5, PI / 2, -0.22);
        const isle = pivot(pv, 0, y, z);
        const moss = material(0x4f9a3a, { roughness: 0.85 });
        const mossDark = material(0x3b7d2c, { roughness: 0.9 });
        const earth = material(0x5b4033, { roughness: 0.95 });
        // 泥丘：一半埋入身（貼住背），上面一層青苔，邊邊有青苔垂落少少
        ball(isle, 1.3, 0.34, 1.5, 0, 0, 0.02, 0, earth);
        ball(isle, 1.24, 0.3, 1.44, 0, 0, 0.12, 0, moss);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * PI * 2 + 0.2;
          ball(isle, 0.34, 0.1, 0.34, 0, Math.cos(a) * 1.0, 0.18, Math.sin(a) * 1.18, i % 2 ? moss : mossDark);
        }
        // 石：幾嚿有棱角嘅灰藍石
        const rockM = material(0x7d8a9c, { roughness: 0.8, flatShading: true });
        const rockGeo = new THREE.DodecahedronGeometry(1, 0);
        for (const [x, yy, zz, k, ry] of [[0.75, 0.32, 0.55, 0.26, 0.4], [0.95, 0.28, 0.2, 0.16, 1.2], [-0.8, 0.3, -0.65, 0.22, 2.1], [-0.55, 0.26, 0.85, 0.14, 0.7]]) {
          const r = new THREE.Mesh(rockGeo, rockM);
          r.scale.set(k * 1.2, k * 0.85, k);
          r.position.set(x, yy, zz);
          r.rotation.set(0.3, ry, 0.2);
          r.castShadow = true;
          isle.add(r);
        }
        // 大樹：樹根 + 微微彎嘅樹幹 + 三層圓樹冠（下大上細）+ 發光花
        const trunkM = material(0x6b4a35, { roughness: 0.8 });
        const tree = pivot(isle, -0.15, 0.28, 0.15);
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * PI * 2 + 0.4;
          const root = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.09, 0.42, 6), trunkM);
          root.position.set(Math.cos(a) * 0.17, 0.06, Math.sin(a) * 0.17);
          root.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
          tree.add(root);
        }
        const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 0.9, 10), trunkM);
        t1.position.set(0, 0.45, 0);
        t1.rotation.z = 0.06;
        t1.castShadow = true;
        tree.add(t1);
        const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.75, 10), trunkM);
        t2.position.set(-0.04, 1.25, 0);
        t2.rotation.z = -0.08;
        t2.castShadow = true;
        tree.add(t2);
        const leafA = material(0x2f7d3a, { roughness: 0.7 });
        const leafB = material(0x3f9a45, { roughness: 0.7 });
        const leafC = material(0x5cb85a, { roughness: 0.7 });
        // 樹冠：一大嚿圓頂 + 一圈細啲嘅圓團（好似一朵朵雲）
        ball(tree, 0.78, 0.6, 0.78, 0, 0, 1.85, 0, leafB);
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * PI * 2;
          const r = 0.62;
          ball(tree, 0.42, 0.36, 0.42, 0, Math.cos(a) * r, 1.62 + (k % 2) * 0.12, Math.sin(a) * r, k % 3 === 0 ? leafA : k % 3 === 1 ? leafB : leafC);
        }
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * PI * 2 + 0.5;
          ball(tree, 0.36, 0.32, 0.36, 0, Math.cos(a) * 0.32, 2.2, Math.sin(a) * 0.32, k % 2 ? leafC : leafB);
        }
        ball(tree, 0.3, 0.26, 0.3, 0, 0, 2.48, 0, leafC);
        const bloomPink = material(0xff9ad5, { emissive: 0xff4fb3, emissiveIntensity: 1.1 });
        const bloomCyan = material(0x9ffcff, { emissive: 0x18e0ff, emissiveIntensity: 1.3 });
        [[0.98, 1.65, 0.25], [-0.7, 1.7, 0.75], [0.35, 1.68, -0.98], [-0.92, 1.6, -0.45], [0.6, 2.2, 0.42], [-0.5, 2.25, -0.38], [0.15, 2.3, 0.68], [0.2, 2.7, -0.2], [-0.2, 1.45, 0.98], [0.7, 1.5, -0.6]].forEach(([x, yy, zz], i) =>
          ball(tree, 0.075, 0.075, 0.075, 0, x, yy, zz, i % 3 ? bloomPink : bloomCyan));
        // 花同蕨
        const stemM = material(0x2e7d32);
        const fernM = material(0x66bb6a, { roughness: 0.8 });
        const petals = [0xfff176, 0xf48fb1, 0xb39ddb, 0xffffff];
        [[0.45, -0.75], [-0.95, 0.2], [0.2, 0.95], [-0.3, -1.05], [1.0, -0.35], [-0.9, 0.75]].forEach(([x, zz], i) => {
          const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 4), stemM);
          st.position.set(x, 0.38, zz);
          isle.add(st);
          ball(isle, 0.06, 0.04, 0.06, petals[i % 4], x, 0.5, zz);
          ball(isle, 0.025, 0.025, 0.025, 0xffb300, x, 0.53, zz);
        });
        for (const [x, zz, ry] of [[0.25, 0.55, 0.3], [-0.55, -0.15, 1.6], [0.6, -0.15, 2.6], [-0.2, -0.75, 4]]) {
          const fern = pivot(isle, x, 0.32, zz);
          fern.rotation.y = ry;
          for (let k = 0; k < 5; k++) {
            const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.42, 4), fernM);
            f.position.set(0, 0.14, 0);
            f.rotation.set(0.75, (k / 5) * PI * 2, 0, 'YXZ');
            f.scale.z = 0.35;
            fern.add(f);
          }
        }
        // 古石門（好似遺跡）：兩條方柱（有柱頭）+ 一條橫樑 + 橫樑中間一粒發光青色符文石 + 少少藤
        const sand = { roughness: 0.75 };
        const arch = pivot(isle, 0.66, 0.3, -0.6);
        arch.rotation.y = -0.55;
        for (const sx of [-0.28, 0.28]) {
          box(arch, 0.17, 0.08, 0.17, 0xbcaaa4, sx, 0.04, 0, 0.3, sand); // 柱腳
          box(arch, 0.12, 0.55, 0.12, 0xd7ccc8, sx, 0.355, 0, 0.25, sand); // 柱
          box(arch, 0.17, 0.07, 0.17, 0xbcaaa4, sx, 0.665, 0, 0.3, sand); // 柱頭
        }
        box(arch, 0.8, 0.12, 0.18, 0xd7ccc8, 0, 0.76, 0, 0.3, sand); // 橫樑
        box(arch, 0.62, 0.05, 0.14, 0xbcaaa4, 0, 0.845, 0, 0.3, sand);
        ball(arch, 0.07, 0.07, 0.03, 0, 0, 0.76, -0.095, crystalM); // 符文石
        for (const [x, yy] of [[-0.3, 0.6], [-0.27, 0.45], [-0.31, 0.3], [0.1, 0.7], [0.3, 0.52]]) ball(arch, 0.05, 0.05, 0.05, 0, x, yy, -0.07, mossDark); // 藤
      }
      // ---- 細背鰭（尖）----
      fin(0.66, PI / 2, [[0.5, 0], [0.1, 0.2], [-0.25, 0.62], [-0.32, 0.55], [-0.28, 0.12], [-0.4, 0]], { key: 'swx-dorsal', depth: 0.12 });
      // ---- 尾鰭：大大塊尖尖嘅新月形 + 金邊 ----
      const fluke = [[0, 0.3], [0.55, 0.12], [1.2, -0.25], [1.95, -0.95], [1.5, -0.8], [0.8, -0.6], [0.25, -0.68], [0, -0.5], [-0.25, -0.68], [-0.8, -0.6], [-1.5, -0.8], [-1.95, -0.95], [-1.2, -0.25], [-0.55, 0.12]];
      slab(tail, fluke, 0.13, SKIN, { plane: 'flat', key: 'swx-fluke', bevel: 0.05, z: -0.1 });
      slab(tail, fluke.map(([x, y]) => [x * 1.06, y * 1.07 + 0.01]), 0.05, GOLDC, { plane: 'flat', key: 'swx-fluke-gold', bevel: 0.02, z: -0.1, extra: { metalness: 0.75, roughness: 0.28 } });
      // ---- 好似巨翼咁嘅胸鰭：三個尖角（好似龍翼）+ 金邊 + 青紋 ----
      const wing = [[0, 0.38], [0.7, 0.42], [1.5, 0.3], [2.4, 0.05], [3.3, -0.3], [2.75, -0.42], [2.95, -0.75], [2.25, -0.68], [2.25, -1.05], [1.55, -0.85], [1.2, -1.05], [0.75, -0.62], [0, -0.32]];
      const pecs = fin(0.3, -0.28, wing, { plane: 'flat', key: 'swx-wing', mirror: true, rot: [0, -0.35, -0.2], depth: 0.12 });
      for (const { fp } of pecs) {
        slab(fp, wing.map(([x, y]) => [x * 1.05 - 0.03, y * 1.08]), 0.05, GOLDC, { plane: 'flat', key: 'swx-wing-gold', bevel: 0.015, extra: { metalness: 0.75, roughness: 0.28 } });
        // 翼骨青紋（三條）
        for (const [ex, ey] of [[3.1, -0.32], [2.8, -0.72], [2.1, -1.0]]) bar(fp, [0.2, 0.09, 0], [ex * 0.88, 0.09, -ey * 0.88], 0.05, VEIN, { emissive: VEIN, emissiveIntensity: 2 });
      }
      return pecs;
    },
  });
  // 外層：俯衝（上下）同頭向上／向下
  const g = new THREE.Group();
  const flyer = pivot(g, 0, 0, 0);
  flyer.add(inner);
  flyer.scale.setScalar(S);
  const baseY = 4.7; // 平時離地幾高（大俯衝都唔會撞落地）
  const DIP = 2.2; // 俯衝落幾多（大俯衝）
  const innerAnim = inner.userData.animate;
  let swoopT = 0;
  let lastT = null;
  // ---- 光暈（青藍色，喺身後面）----
  const haloTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: 0x4dd0ff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(LEN * 1.6, H * 3, 1);
  halo.position.y = H / 2 + 0.35;
  flyer.add(halo);
  // ---- 閃粉 ----
  const sparkles = sparkleAura(flyer, { n: 60, rx: W * 1.3, rz: LEN * 0.65, y0: -0.5, h: H * 2.2, color: 0xfff59d, size: 0.16 });
  // ---- 符文：兩大圈（一圈打橫圍住身、一圈斜斜圍住頭）----
  const ring1 = [0x18ffff, 0xea80fc, 0xffd740, 0x18ffff, 0xea80fc, 0xffd740].map((c, i) => {
    const r = buildRune(c);
    r.scale.setScalar(0.85);
    flyer.add(r);
    return { r, a: (i / 6) * PI * 2 };
  });
  const ring2 = [0xffd740, 0x18ffff, 0xffd740, 0x18ffff].map((c, i) => {
    const r = buildRune(c);
    r.scale.setScalar(0.6);
    flyer.add(r);
    return { r, a: (i / 4) * PI * 2 };
  });
  const cy = H / 2 + 0.35;
  const headZ = -LEN * 0.32;
  g.userData.animate = (t, moving) => {
    innerAnim(t, moving);
    sparkles(t);
    halo.material.opacity = 0.22 + Math.sin(t * 1.6) * 0.06;
    for (const q of ring1) {
      const a = q.a + t * 0.35;
      q.r.position.set(Math.cos(a) * W * 1.55, cy + Math.sin(t * 1.1 + q.a) * 0.35, Math.sin(a) * LEN * 0.7);
      q.r.rotation.set(PI / 2 * 0.85, PI / 2 - a, 0, 'YXZ'); // 企直、面向出面
      q.r.userData.spin(t + q.a);
    }
    for (const q of ring2) {
      const a = q.a - t * 0.6;
      // 斜斜嘅直圈圍住個頭
      q.r.position.set(Math.cos(a) * W * 1.05, cy + 0.6 + Math.sin(a) * H * 0.95, headZ + Math.sin(a) * 0.6);
      q.r.rotation.set(0, PI / 2, a);
      q.r.userData.spin(t * 1.5 + q.a);
    }
    if (fallRef) fallRef.forEach((d, i) => {
      const k = (t * 0.9 + i / fallRef.length) % 1;
      d.position.set(Math.sin(k * 6 + i) * 0.03 + k * 0.35, -k * 1.6, 0);
      d.scale.set(0.13 * (1 - k * 0.4), 0.22, 0.09);
    });
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    if (moving) {
      // 每 4 秒一個循環：滑翔 → 大俯衝落 → 衝返上去（順滑），條尾跟住大力拍
      swoopT += dt;
      const P = 4;
      const k = (swoopT % P) / P;
      const w = k < 0.2 ? 0 : (k - 0.2) / 0.8;
      const y = -DIP * (1 - Math.cos(w * PI * 2)) / 2;
      const dy = (DIP * PI * Math.sin(w * PI * 2)) / (0.8 * P); // dy/dt（正數 = 落緊）
      flyer.position.y = baseY + y + Math.sin(t * 1.1) * 0.1;
      const want = Math.max(-0.3, Math.min(0.3, Math.atan(-dy / 3.5) * 1.4)); // 落：頭向下；升：頭向上
      flyer.rotation.x += (want - flyer.rotation.x) * Math.min(1, dt * 6 || 1);
      if (tailRef) tailRef.rotation.x -= Math.sin(t * 5.5) * (0.25 + 0.35 * Math.abs(Math.sin(w * PI))); // 衝嗰陣尾拍得最大力
    } else {
      flyer.position.y = baseY + Math.sin(t * 1.1) * 0.3; // 浮下浮下
      flyer.rotation.x *= 0.92;
      if (tailRef) tailRef.rotation.x -= Math.sin(t * 2) * 0.12;
    }
    flyer.rotation.z = Math.sin(t * 0.7) * 0.05;
  };
  g.userData.move = 'fly';
  g.userData.flying = true;
  g.userData.noFireAura = true; // 唔要身邊嗰圈火（Fire 變異嘅錢照計）
  g.userData.height = baseY + (H + 0.35 + 2.6) * S;
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
    // 上獠牙：細細隻，收喺口入面（小朋友 2026-10-18：牙大過個口）
    box(head, 0.07, 0.15, 0.07, 0xffffff, s * 0.3, -0.5, -0.86, 0.3);
    for (let i = 0; i < 2; i++) box(head, 0.05, 0.07, 0.05, 0xffffff, s * (0.07 + i * 0.1), -0.48, -0.9, 0.3);
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
  for (const s of [-1, 1]) box(jaw, 0.06, 0.13, 0.06, 0xffffff, s * 0.28, 0.08, -0.58, 0.3); // 下獠牙（細）
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
// v4（2026-10-18 小朋友：v3 個八爪魚圓頭「SOOO UGLY」）：一眼睇落係隻威武嘅大笨象（同新版非洲象一樣嘅身同彎彎大耳），
//   深海藍 → 藍綠色漸變皮膚 + 發光斑點；象鼻尾分開做 4 條捲捲嘅八爪魚觸手（底有吸盤）；
//   下巴同肚底有一圈觸手好似鬚／裙；細細彎象牙；額頭有發光符文；背上長咗珊瑚同水晶
const OCTO_SKIN = 0x2a6fb0; // 用嚟認邊啲係「皮膚」，之後換做漸變色
const OCTO_DARK = 0x1b4d8c;
const OCTO_TOP = new THREE.Color(0x0f2f6b); // 背：深海藍
const OCTO_BOTTOM = new THREE.Color(0x1fb8a6); // 肚／腳：藍綠
const OCTO_TENT = 0x23a7b5; // 觸手
const OCTO_SUCKER = 0xffc1e3; // 吸盤（淺粉紅）
let octoSkinMat = null;
let octoDarkMat = null;

// 一條觸手：一節節收細嘅波波，向住 curl 嗰邊捲；底（-z 面）有吸盤。回傳每節 pivot（郁嘅時候用）
function tentacle(parent, { n = 6, r = 0.12, len = 0.16, curl = 0.35, taper = 0.13, sucker = true } = {}) {
  const segs = [];
  let p = parent;
  for (let i = 0; i < n; i++) {
    const seg = pivot(p, 0, i ? -len : 0, 0);
    seg.rotation.x = i ? curl : 0;
    const k = Math.max(0.25, 1 - i * taper);
    ball(seg, r * k, len * 0.75, r * k, OCTO_TENT, 0, -len / 2, 0);
    if (sucker && i > 0) ball(seg, r * k * 0.45, r * k * 0.45, r * k * 0.3, OCTO_SUCKER, 0, -len / 2, -r * k * 0.85);
    segs.push(seg);
    p = seg;
  }
  return segs;
}

export function buildOctophantModel() {
  const tents = []; // { segs, base, phase, amp }
  let rune = null;
  const spots = [];
  const g = elephant(false, {
    skin: OCTO_SKIN,
    dark: OCTO_DARK,
    pinkIn: 0xf06292,
    toes: 0x7fe7ff,
    tailTip: OCTO_TENT,
    tusk: 0.55,
    tuskColor: 0xe0f7fa,
    eyes: false, // 自己畫圓圓嘅大眼（下面）
    rim: 0x40e0ff,
    more(p, { trunk }) {
      // ---- 象鼻尾：分開 4 條捲捲觸手 ----
      const tip = trunk[trunk.length - 1];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI * 2 + PI / 4;
        const base = pivot(tip, Math.cos(a) * 0.07, -0.36, Math.sin(a) * 0.07);
        base.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); // 散開
        tents.push({ segs: tentacle(base, { n: 7, r: 0.11, len: 0.17, curl: 0.38, taper: 0.11 }), base, phase: i * 1.3, amp: 0.25 });
      }
      // 象鼻底嘅吸盤
      trunk.forEach((seg, i) => i > 0 && ball(seg, 0.07, 0.07, 0.04, OCTO_SUCKER, 0, -0.18, -(0.27 - i * 0.025)));
      // ---- 下巴觸手鬚：5 條短短 ----
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.2;
        const base = pivot(p.head, x, -0.62, -0.25 + Math.abs(i - 2) * 0.08);
        base.rotation.x = -0.15;
        base.rotation.z = (i - 2) * 0.12;
        tents.push({ segs: tentacle(base, { n: 4, r: 0.08, len: 0.15, curl: -0.35, sucker: false }), base, phase: i * 0.9, amp: 0.15 });
      }
      // ---- 肚底一圈觸手（好似裙）----
      const BY = 2.2 - 0.875 + 0.05;
      const ring = [[-0.85, -0.9], [-0.95, -0.2], [-0.95, 0.5], [-0.8, 1.1], [0, 1.2], [0.8, 1.1], [0.95, 0.5], [0.95, -0.2], [0.85, -0.9], [-0.3, -1.1], [0.3, -1.1], [0, 0]];
      ring.forEach(([x, z], i) => {
        const base = pivot(p.root, x, BY, z);
        base.rotation.x = z * 0.2;
        base.rotation.z = -x * 0.3; // 向外散
        const n = i === ring.length - 1 ? 5 : 4;
        tents.push({ segs: tentacle(base, { n: n + 1, r: 0.14, len: 0.2, curl: 0.22, taper: 0.14 }), base, phase: i * 0.7, amp: 0.18 });
      });
      // ---- 眼：圓圓、溫柔（白 → 發光藍綠眼珠 → 黑瞳 → 兩點反光），上面有眼皮 ----
      for (const sx of [-1, 1]) {
        const e = pivot(p.head, sx * 0.43, 0.08, -0.5);
        e.rotation.y = sx * -0.5;
        ball(e, 0.15, 0.16, 0.06, 0xffffff, 0, 0, 0);
        ball(e, 0.105, 0.115, 0.04, 0x1de9b6, 0, -0.01, -0.035, { emissive: 0x1de9b6, emissiveIntensity: 0.9 });
        ball(e, 0.06, 0.07, 0.03, 0x06121f, 0, -0.015, -0.06);
        ball(e, 0.03, 0.03, 0.015, 0xffffff, -sx * 0.035, 0.04, -0.085);
        ball(e, 0.015, 0.015, 0.01, 0xffffff, sx * 0.03, -0.045, -0.085);
        const lid = box(e, 0.34, 0.07, 0.1, OCTO_DARK, 0, 0.15, -0.01, 0.45); // 眼皮（微微向下 = 溫柔）
        lid.rotation.z = sx * -0.06; // 外邊微微向上 = 開心
      }
      // ---- 額頭：金色菱形牌 + 發光符文 ----
      const plate = pivot(p.head, 0, 0.42, -0.565);
      slab(plate, [[0, 0.32], [0.26, 0], [0, -0.3], [-0.26, 0]], 0.04, 0xffc107, { key: 'octo-plate', bevel: 0.015, extra: GOLD_X });
      rune = pivot(p.head, 0, 0.42, -0.61);
      const runeMat = glow(0x18ffff, 2.2);
      const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 24), runeMat);
      rune.add(ringM);
      const dia = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), glow(0xea80fc, 2.4));
      dia.scale.set(1, 1.5, 0.4);
      rune.add(dia);
      for (let k = 0; k < 4; k++) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.03), runeMat);
        d.position.set(Math.cos((k * PI) / 2) * 0.25, Math.sin((k * PI) / 2) * 0.25, 0);
        rune.add(d);
      }
      // ---- 背脊：珊瑚 + 水晶 ----
      const coral = (x, z, color, h) => {
        const c = pivot(p.root, x, 2.2 + 0.86, z);
        const m = glow(color, 0.55, { roughness: 0.5 });
        bar(c, [0, 0, 0], [0, h, 0], 0.07, color, { emissive: color, emissiveIntensity: 0.55 });
        bar(c, [0, h * 0.45, 0], [0.18, h * 0.85, 0.05], 0.05, color, { emissive: color, emissiveIntensity: 0.55 });
        bar(c, [0, h * 0.6, 0], [-0.16, h * 1.05, -0.04], 0.05, color, { emissive: color, emissiveIntensity: 0.55 });
        for (const [bx, by] of [[0, h], [0.18, h * 0.85], [-0.16, h * 1.05]]) ball(c, 0.07, 0.07, 0.07, color, bx, by, 0, { emissive: color, emissiveIntensity: 0.9 });
        return m;
      };
      coral(-0.55, 0.55, 0xff7aa8, 0.85);
      coral(0.55, -0.15, 0xff9e6d, 0.7);
      coral(-0.4, -0.7, 0xff7aa8, 0.6);
      coral(0.45, 0.95, 0xffab91, 0.55);
      const cm = crystal(0x80deea, 1.1);
      shard(p.root, 0.05, 3.3, 0.15, 0.22, 0.95, cm, 0.25, 0, 0.1);
      shard(p.root, 0.2, 3.2, 0.6, 0.16, 0.7, cm, 0.4, 0, -0.35);
      shard(p.root, -0.15, 3.2, -0.35, 0.16, 0.68, crystal(0xb388ff, 1.1), -0.2, 0, 0.35);
      shard(p.root, -0.1, 3.15, 1.0, 0.13, 0.5, crystal(0xb388ff, 1.1), 0.5, 0, 0.2);
      // ---- 發光斑點（身兩邊、塊面、耳）----
      const spotCols = [0x18ffff, 0x00e5ff, 0xff4fd8];
      for (const sx of [-1, 1]) {
        [[1.0, 2.65, -0.6], [1.0, 2.35, 0.1], [1.0, 2.75, 0.7], [1.0, 2.0, -0.2], [1.0, 2.2, 0.95], [1.0, 1.75, 0.5], [1.0, 2.55, 1.15]].forEach(([x, y, z], i) => {
          const r = 0.055 + (i % 3) * 0.022;
          const sp = ball(p.root, 0.03, r, r * 1.15, spotCols[i % 3], sx * x, y, z, { emissive: spotCols[i % 3], emissiveIntensity: 1.6 });
          spots.push(sp);
        });
        for (const [y, z] of [[0.15, -0.5], [-0.12, -0.45]]) spots.push(ball(p.head, 0.03, 0.06, 0.06, 0x18ffff, sx * 0.68, y, z, { emissive: 0x18ffff, emissiveIntensity: 1.6 }));
      }
    },
    animate(t, moving) {
      for (const tn of tents) tn.segs.forEach((seg, i) => {
        seg.rotation.y = Math.sin(t * (2 + moving * 3) + tn.phase + i * 0.7) * tn.amp;
      });
      if (rune) rune.rotation.z = t * 0.8;
      spots.forEach((sp, i) => sp.material && (sp.material.emissiveIntensity = 1.2 + Math.sin(t * 2.5 + i) * 0.6));
    },
  });
  // 皮膚改做上深下淺嘅漸變（每粒頂點按高度揀色）
  g.updateMatrixWorld(true);
  const top = 3.4;
  octoSkinMat ??= material(0xffffff, { vertexColors: true, roughness: 0.42 });
  octoDarkMat ??= material(0xffffff, { vertexColors: true, roughness: 0.45 });
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  g.traverse((m) => {
    if (!m.isMesh || !m.material?.color) return;
    const hex = m.material.color.getHex();
    if (hex !== OCTO_SKIN && hex !== OCTO_DARK) return;
    const geo = m.geometry.clone();
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      const k = Math.min(1, Math.max(0, (top - v.y) / (top - 0.6)));
      c.copy(OCTO_TOP).lerp(OCTO_BOTTOM, k ** 1.3);
      if (hex === OCTO_DARK) c.multiplyScalar(0.72);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    m.geometry = geo;
    m.material = hex === OCTO_SKIN ? octoSkinMat : octoDarkMat;
  });
  // 耳窩粉紅色微微發光、耳邊青色發光
  g.traverse((m) => {
    if (!m.isMesh || !m.material?.color) return;
    const hex = m.material.color.getHex();
    if (hex === 0xf06292) m.material = glow(0xf06292, 0.3, { roughness: 0.4 });
    if (hex === 0x40e0ff) m.material = glow(0x40e0ff, 0.45, { roughness: 0.3 });
  });
  g.scale.setScalar(1.15); // Legendary：大過普通大笨象
  g.userData.height *= 1.15;
  g.userData.move = 'walk';
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
