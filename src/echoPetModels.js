// 🐕 Echo 嘅 Zombified Chest 寵物模型（小朋友 Issue #8）：Hollow Bat、Scarecrow、Pumpkin Golem、Soul Phantom
// 風格：跟 halloweenPetModels.js v2（圓碌碌、大眼、深色描邊），再加多啲「方塊」（圓角方塊）同發光細節
// 全部面向 -z；回傳 Group：userData.animate(time, moving)、userData.height、userData.move
// 下面嘅 kit 都俾 echoShop.js 用嚟整 Echo 隻狗同個箱

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const PI = Math.PI;
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- 共用形狀（同 halloweenPetModels.js 一樣嘅做法）----------
const SPH = new THREE.SphereGeometry(1, 32, 24);
const SPH_LO = new THREE.SphereGeometry(1, 16, 12);
const geoCache = new Map();
export const cached = (key, make) => {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
};
const matCache = new Map();
export function M(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0, ...o }));
  return matCache.get(key);
}
export const GLOW = (c, i = 1.8) => ({ emissive: c, emissiveIntensity: i });
export const GHOST = (c, o = 0.6, i = 0.8) => ({ transparent: true, opacity: o, emissive: c, emissiveIntensity: i, depthWrite: false });

const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x140b1c, side: THREE.BackSide });
export function outline(mesh, t = 0.05) {
  const o = new THREE.Mesh(mesh.geometry, OUTLINE);
  o.scale.setScalar(1 + t);
  o.castShadow = false;
  o.userData.outline = true;
  mesh.add(o);
  return mesh;
}
export function add(parent, geo, color, o, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, o?.isMaterial ? o : M(color, o));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// 球（可以拉扁／拉長）
export function S(parent, sx, sy, sz, color, x = 0, y = 0, z = 0, o, { line = 0, lo = false } = {}) {
  const m = add(parent, lo ? SPH_LO : SPH, color, o, x, y, z);
  m.scale.set(sx, sy, sz);
  if (line) outline(m, line);
  return m;
}
// 圓角方塊（方塊風格嘅主角）：w h d 係真尺寸；r = 圓角佔最短邊幾多
export function B(parent, w, h, d, color, x = 0, y = 0, z = 0, o, { line = 0, r = 0.28 } = {}) {
  const k = `rb${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r}`;
  const m = add(parent, cached(k, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * r)), color, o, x, y, z);
  if (line) {
    // 方塊用均勻放大會令細邊描邊太粗：按尺寸計
    const o2 = new THREE.Mesh(m.geometry, OUTLINE);
    const t = Math.min(w, h, d) * line;
    o2.scale.set(1 + t / w * 2, 1 + t / h * 2, 1 + t / d * 2);
    o2.castShadow = false;
    o2.userData.outline = true;
    m.add(o2);
  }
  return m;
}
export function limb(parent, a, b, r, color, o, line = 0) {
  const len = a.distanceTo(b);
  const geo = cached(`cap${r.toFixed(3)}|${len.toFixed(3)}`, () => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 16));
  const m = add(parent, geo, color, o);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  if (line) outline(m, line);
  return m;
}
export function cone(parent, r, h, color, x, y, z, o, seg = 24) {
  return add(parent, cached(`cone${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg)), color, o, x, y, z);
}
export function cyl(parent, r0, r1, h, color, x, y, z, o, seg = 24) {
  return add(parent, cached(`cyl${r0}|${r1}|${h}|${seg}`, () => new THREE.CylinderGeometry(r0, r1, h, seg)), color, o, x, y, z);
}
export function torus(parent, r, tubeR, color, x, y, z, o, arc = PI * 2) {
  return add(parent, cached(`tor${r}|${tubeR}|${arc}`, () => new THREE.TorusGeometry(r, tubeR, 10, 40, arc)), color, o, x, y, z);
}
export function pivot(parent, x = 0, y = 0, z = 0) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  parent.add(p);
  return p;
}
export function tube(parent, pts, r, color, o, seg = 24) {
  const curve = new THREE.CatmullRomCurve3(pts);
  return add(parent, new THREE.TubeGeometry(curve, seg, r, 10, false), color, o);
}
export function shape(parent, pts, depth, color, o, { x = 0, y = 0, z = 0, smooth = true, key } = {}) {
  const make = () => {
    const s = new THREE.Shape();
    const v = pts.map(([a, b]) => new THREE.Vector2(a, b));
    s.moveTo(v[0].x, v[0].y);
    if (smooth) s.splineThru([...v.slice(1), v[0]]);
    else v.slice(1).forEach((p) => s.lineTo(p.x, p.y));
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * 0.4, bevelSize: depth * 0.4, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -depth / 2);
    return g;
  };
  const geo = key ? cached(`shp${key}|${depth}`, make) : make();
  return add(parent, geo, color, o, x, y, z);
}
// 大大對有光澤嘅眼（眼白 + 眼珠 + 瞳孔 + 兩粒反光）
export function bigEyes(parent, dx, y, z, r, iris, { glow = false, slant = 0, pupil = 0x120a18, white = 0xffffff, tilt = 0.18, irisK = 0.74, glowI = 0.6 } = {}) {
  return [-1, 1].map((s) => {
    const e = pivot(parent, s * dx, y, z);
    e.rotation.set(0, s * tilt, s * slant);
    S(e, r, r * 1.12, r * 0.5, white, 0, 0, 0, { roughness: 0.12 }, { line: 0.07 });
    S(e, r * irisK, r * irisK * 1.08, r * 0.3, iris, 0, -r * 0.08, -r * 0.3, glow ? { roughness: 0.15, ...GLOW(iris, glowI) } : { roughness: 0.15 });
    S(e, r * irisK * 0.58, r * irisK * 0.66, r * 0.2, pupil, 0, -r * 0.1, -r * 0.43, { roughness: 0.08 });
    S(e, r * 0.24, r * 0.24, r * 0.1, 0xffffff, r * 0.24, r * 0.3, -r * 0.5, GLOW(0xffffff, 0.8), { lo: true });
    S(e, r * 0.11, r * 0.11, r * 0.06, 0xffffff, -r * 0.24, -r * 0.32, -r * 0.5, GLOW(0xffffff, 0.8), { lo: true });
    return e;
  });
}
export function smile(parent, x, y, z, w, color = 0x2a1220, o, arc = 2.2, rot = 0) {
  const m = torus(parent, w, w * 0.16, color, x, y, z, o, arc);
  m.rotation.set(0, 0, PI + (PI - arc) / 2 + rot);
  return m;
}
export const blinkAt = (t, seed = 0) => {
  const p = (t + seed * 1.7) % 4.2;
  return p < 0.12 ? 0.12 + Math.abs(p - 0.06) * 14 : 1;
};
// 縫線（一行細細嘅橫線，沿住 a → b）
export function stitches(parent, a, b, n, color, o, w = 0.07, thick = 0.016) {
  const out = [];
  const dir = b.clone().sub(a);
  const ang = Math.atan2(dir.y, dir.x);
  for (let i = 0; i < n; i++) {
    const p = a.clone().lerp(b, n === 1 ? 0.5 : i / (n - 1));
    const m = B(parent, thick, w, thick, color, p.x, p.y, p.z, o, { r: 0.45 });
    m.rotation.z = ang;
    out.push(m);
  }
  // 中間條線
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const line = B(parent, dir.length(), thick * 0.8, thick * 0.8, color, mid.x, mid.y, mid.z, o, { r: 0.45 });
  line.rotation.z = ang;
  return out;
}
// 南瓜（平滑 + 坑）
export function pumpkinGeo(ribs = 8, groove = 0.09) {
  return cached(`epumpkin${ribs}|${groove}`, () => {
    const g = new THREE.SphereGeometry(1, 48, 32);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const phi = Math.atan2(v.z, v.x);
      const s = Math.abs(Math.sin((phi * ribs) / 2));
      const k = 1 - groove * Math.pow(1 - s, 3) * Math.sqrt(1 - v.y * v.y);
      const pole = 1 - 0.18 * Math.pow(Math.abs(v.y), 6);
      p.setXYZ(i, v.x * k, v.y * 0.82 * pole, v.z * k);
    }
    g.computeVertexNormals();
    return g;
  });
}
export function pumpkin(parent, r, color, x, y, z, o = {}, { stem = 0x4e7d2b, line = 0.04 } = {}) {
  const p = pivot(parent, x, y, z);
  const body = add(p, pumpkinGeo(), color, o);
  body.scale.setScalar(r);
  if (line) outline(body, line);
  tube(p, [V(0, r * 0.7, 0), V(0.02 * r, r * 0.95, 0.02 * r), V(0.12 * r, r * 1.08, 0.06 * r)], r * 0.09, stem, {});
  return p;
}
// 刻出嚟嘅發光樣（三角眼 + 鋸齒笑口）
export function carvedFace(parent, r, y, z, color = 0xffc400, { inten = 2.6 } = {}) {
  const o = GLOW(color, inten);
  const eyes = [-1, 1].map((s) => {
    const e = shape(parent, [[-0.5, -0.38], [0.5, -0.38], [0.05, 0.5]], 0.05, color, o, { x: s * r * 0.36, y: y + r * 0.2, z, smooth: false, key: 'ecvEye' });
    e.scale.setScalar(r * 0.36);
    e.rotation.z = s * -0.25;
    return e;
  });
  const pts = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([(t - 0.5) * 1.2, (i % 2 ? 0.1 : -0.04) - Math.sin(t * PI) * 0.18]);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    pts.push([(t - 0.5) * 1.2, -0.18 - Math.sin(t * PI) * 0.3 + (i % 3 === 1 ? 0.1 : 0)]);
  }
  const m = shape(parent, pts, 0.05, color, o, { y: y - r * 0.22, z, smooth: false, key: 'ecvMouth' });
  m.scale.setScalar(r * 0.75);
  return { eyes, mouth: m };
}
// 糖果粟米（白尖 + 橙 + 黃底）：細細粒，做裝飾
export function candyCorn(parent, s, x, y, z) {
  const p = pivot(parent, x, y, z);
  cone(p, 0.5 * s, 0.4 * s, 0xffffff, 0, 0.75 * s, 0, { roughness: 0.3 }, 12);
  cyl(p, 0.5 * s, 0.75 * s, 0.5 * s, 0xff8f00, 0, 0.3 * s, 0, { roughness: 0.3, ...GLOW(0xff6d00, 0.35) }, 12);
  cyl(p, 0.75 * s, 0.85 * s, 0.25 * s, 0xffd54f, 0, -0.05 * s, 0, { roughness: 0.3 }, 12);
  return p;
}
export function rig(g, root, { eyes = [], move = 'walk', height = 1, tick }) {
  const seed = Math.random() * 10;
  g.userData.animate = (t, moving = 0) => {
    const b = blinkAt(t, seed);
    for (const e of eyes) e.scale.y = b;
    tick?.(t, moving);
  };
  g.userData.move = move;
  g.userData.height = height;
  return g;
}

const BAT_WING = [[0, 0], [0.45, 0.32], [0.95, 0.38], [0.85, 0.1], [0.68, 0.0], [0.6, -0.16], [0.42, -0.06], [0.3, -0.2], [0.14, -0.06]];
const HEART = (() => {
  const pts = [];
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * PI * 2;
    pts.push([16 * Math.sin(t) ** 3 / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]);
  }
  return pts;
})();

// =============== 🦇 Hollow Bat（Rare）===============
// 毛茸茸方波波蝙蝠：大耳仔、琥珀色發光大眼、細牙、心口一個發光嘅「空心」心形
function hollowBat() {
  const g = new THREE.Group();
  const root = pivot(g);
  const fur = 0x4a2d6e;
  const fur2 = 0x7a55a8;
  const glowC = 0x40c4ff;
  const body = pivot(root, 0, 0.5, 0);
  B(body, 0.62, 0.56, 0.52, fur, 0, 0, 0, {}, { line: 0.08, r: 0.42 });
  // 頭頂一撮毛
  for (let i = 0; i < 3; i++) S(body, 0.07, 0.09, 0.07, fur2, (i - 1) * 0.07, 0.3 + (i === 1 ? 0.03 : 0), 0.02, {}, { line: 0.06 });
  // 肚（淺色毛）+ 空心心形（發光邊、中間黑）
  S(body, 0.22, 0.13, 0.05, fur2, 0, -0.17, -0.245, {});
  const heart = pivot(body, 0, -0.17, -0.285);
  const hOut = shape(heart, HEART, 0.03, glowC, GLOW(glowC, 2.6), { key: 'hbHeart' });
  hOut.scale.setScalar(0.1);
  const hIn = shape(heart, HEART, 0.03, 0x0a0614, { roughness: 1 }, { z: -0.012, key: 'hbHeart' });
  hIn.scale.setScalar(0.045);
  hIn.position.y = 0.004;
  const sparkle = S(heart, 0.025, 0.025, 0.02, 0xffffff, 0, 0.005, -0.03, GLOW(glowC, 3), { lo: true });
  // 面
  const eyes = bigEyes(body, 0.14, 0.09, -0.25, 0.1, 0xffb300, { glow: true, glowI: 0.9, slant: -0.08 });
  S(body, 0.03, 0.02, 0.02, 0xff80ab, 0, 0.0, -0.275); // 鼻
  smile(body, 0, -0.02, -0.268, 0.04, 0x1a0b22, {}, 2.2);
  for (const s of [-1, 1]) {
    const f = cone(body, 0.014, 0.045, 0xffffff, s * 0.022, -0.07, -0.268, { roughness: 0.2 }, 8);
    f.rotation.x = PI;
    S(body, 0.05, 0.035, 0.02, 0xff80ab, s * 0.21, -0.02, -0.25, { transparent: true, opacity: 0.6 });
  }
  // 大耳仔
  const ears = [-1, 1].map((s) => {
    const ear = pivot(body, s * 0.2, 0.26, 0);
    ear.rotation.z = s * -0.32;
    outline(cone(ear, 0.13, 0.36, fur, 0, 0.16, 0, {}, 4), 0.06).rotation.y = PI / 4;
    cone(ear, 0.075, 0.24, 0xff80ab, 0, 0.12, -0.06, {}, 4).rotation.y = PI / 4;
    S(ear, 0.03, 0.03, 0.03, glowC, 0, 0.36, 0, GLOW(glowC, 2.4), { lo: true }); // 耳尖發光
    return ear;
  });
  // 翼：深紫膜 + 發光翼骨
  const wings = [-1, 1].map((s) => {
    const w = pivot(body, s * 0.28, 0.04, 0.06);
    const mem = shape(w, BAT_WING, 0.02, 0x24133a, { side: THREE.DoubleSide, roughness: 0.5 }, { key: 'hbWing' });
    mem.scale.set(s * 0.62, 0.62, 1);
    outline(mem, 0.03);
    for (const [px, py] of [[0.95, 0.38], [0.68, 0.0], [0.42, -0.06]]) limb(w, V(0, 0, 0), V(s * px * 0.62, py * 0.62, 0), 0.012, 0xb388ff, GLOW(0xb388ff, 1.6));
    return w;
  });
  // 細腳
  for (const s of [-1, 1]) S(body, 0.06, 0.05, 0.07, 0x24133a, s * 0.1, -0.3, -0.02, {}, { line: 0.06 });
  return rig(g, root, {
    eyes, height: 1.0,
    tick(t, m) {
      const flap = Math.sin(t * (9 + m * 6));
      wings.forEach((w, i) => {
        const s = i ? 1 : -1;
        w.rotation.y = s * (0.25 + flap * 0.55);
        w.rotation.z = s * flap * 0.15;
      });
      body.position.y = 0.55 + Math.sin(t * 2.4) * 0.07 + flap * 0.02;
      body.rotation.z = Math.sin(t * 1.3) * 0.06;
      body.rotation.x = m * 0.15;
      ears.forEach((e, i) => (e.rotation.x = Math.sin(t * 3 + i) * 0.08));
      const pulse = 1 + Math.sin(t * 4) * 0.08;
      heart.scale.setScalar(pulse);
      hOut.material.emissiveIntensity = 2.2 + Math.sin(t * 4) * 0.8;
      sparkle.visible = Math.sin(t * 1.7) > 0.3;
    },
  });
}

// =============== 🌾 Scarecrow（Epic）===============
// 麻包布頭 + 發光縫線笑口 + 草帽（有粒糖果粟米）+ 格仔恤衫 + 牛仔褲補丁 + 膊頭企住隻細烏鴉
function scarecrow() {
  const g = new THREE.Group();
  const root = pivot(g);
  const sack = 0xd2a868;
  const sack2 = 0xb98a4c;
  const straw = 0xffd54f;
  const shirt = 0xd84315;
  const shirtDark = 0x8e2a0b;
  const denim = 0x3f6fb5;
  const glowC = 0xff9100;
  // 腳（牛仔褲 + 啡色靴）
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.12, 0.5, 0);
    B(hip, 0.17, 0.36, 0.18, denim, 0, -0.2, 0, {}, { line: 0.07 });
    B(hip, 0.2, 0.12, 0.25, 0x5d4037, 0, -0.42, -0.03, {}, { line: 0.07 });
    if (s > 0) B(hip, 0.09, 0.09, 0.02, 0xffb74d, 0.01, -0.16, -0.095, {}, { r: 0.2 }); // 補丁
    for (let i = 0; i < 3; i++) cone(hip, 0.025, 0.1, straw, (i - 1) * 0.045, -0.33, -0.08, {}, 6).rotation.x = PI + 0.4;
    return hip;
  });
  // 身：格仔恤衫（直 + 橫深色條）
  const torso = pivot(root, 0, 0.72, 0);
  B(torso, 0.46, 0.44, 0.3, shirt, 0, 0, 0, {}, { line: 0.07 });
  for (const x of [-0.12, 0.12]) B(torso, 0.04, 0.445, 0.305, shirtDark, x, 0, 0, {}, { r: 0.2 });
  for (const y of [-0.1, 0.1]) B(torso, 0.465, 0.035, 0.305, shirtDark, 0, y, 0, {}, { r: 0.2 });
  // 吊帶褲
  B(torso, 0.4, 0.18, 0.32, denim, 0, -0.15, 0, {}, { r: 0.3 });
  for (const s of [-1, 1]) {
    B(torso, 0.05, 0.3, 0.02, denim, s * 0.12, 0.05, -0.16, {}, { r: 0.3 });
    S(torso, 0.025, 0.025, 0.015, 0xffd54f, s * 0.12, -0.04, -0.17, { metalness: 0.7, roughness: 0.3 });
  }
  // 繩腰帶
  torus(torso, 0.235, 0.02, 0xa1887f, 0, -0.06, 0, {}).rotation.x = PI / 2;
  // 手（打開少少，手係一撮草）
  const arms = [-1, 1].map((s) => {
    const sh = pivot(torso, s * 0.24, 0.14, 0);
    sh.rotation.z = s * 1.05;
    B(sh, 0.13, 0.34, 0.14, shirt, 0, -0.16, 0, {}, { line: 0.07 });
    B(sh, 0.135, 0.04, 0.145, shirtDark, 0, -0.1, 0, {}, { r: 0.2 });
    for (let i = 0; i < 5; i++) {
      const c = cone(sh, 0.022, 0.13, i % 2 ? straw : 0xffca28, (i - 2) * 0.025, -0.38, (i % 2) * 0.02, {}, 6);
      c.rotation.x = PI;
      c.rotation.z = (i - 2) * 0.15;
    }
    return sh;
  });
  // 頸嘅草
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    const c = cone(torso, 0.025, 0.12, straw, Math.cos(a) * 0.12, 0.24, Math.sin(a) * 0.1, {}, 6);
    c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
  }
  // 頭：麻包袋
  const head = pivot(torso, 0, 0.5, -0.02);
  B(head, 0.52, 0.46, 0.44, sack, 0, 0, 0, {}, { line: 0.07, r: 0.38 });
  B(head, 0.3, 0.06, 0.45, sack2, 0, 0.12, 0, { roughness: 0.9 }, { r: 0.3 }); // 布紋
  stitches(head, V(-0.25, 0.1, -0.2), V(-0.25, -0.12, -0.2), 4, 0x5d4037, {}, 0.05, 0.012); // 側邊補過嘅線
  // 眼：大大對，深色加橙光
  const eyes = bigEyes(head, 0.12, 0.04, -0.22, 0.085, 0x3e2723, { glow: false, slant: 0.05 });
  // 縫線笑口（發光）
  const mouthPts = [];
  for (let i = 0; i <= 6; i++) {
    const k = i / 6;
    mouthPts.push(V((k - 0.5) * 0.24, -0.1 - Math.sin(k * PI) * 0.05, -0.225));
  }
  const mouthGlow = M(glowC, GLOW(glowC, 2.4));
  tube(head, mouthPts, 0.012, glowC, mouthGlow, 16);
  for (let i = 0; i <= 6; i++) {
    const p = mouthPts[i];
    const st = B(head, 0.014, 0.06, 0.014, glowC, p.x, p.y, p.z, mouthGlow, { r: 0.45 });
    st.rotation.z = (i - 3) * 0.12;
  }
  for (const s of [-1, 1]) S(head, 0.05, 0.035, 0.02, 0xff8a80, s * 0.18, -0.07, -0.215, { transparent: true, opacity: 0.6 });
  // 頸繩
  torus(head, 0.17, 0.022, 0xa1887f, 0, -0.22, 0, {}).rotation.x = PI / 2;
  // 草帽
  const hat = pivot(head, 0, 0.21, 0);
  hat.rotation.z = 0.12;
  outline(cyl(hat, 0.42, 0.44, 0.04, straw, 0, 0, 0, { roughness: 0.7 }, 32), 0.03);
  outline(cyl(hat, 0.2, 0.25, 0.22, straw, 0, 0.12, 0, { roughness: 0.7 }), 0.04);
  cyl(hat, 0.252, 0.255, 0.06, 0x6a1b9a, 0, 0.04, 0, GLOW(0x7c4dff, 0.5));
  const cc = candyCorn(hat, 0.08, 0.12, 0.05, -0.22);
  cc.rotation.z = -0.4;
  // 細烏鴉（左膊頭）
  const crow = pivot(torso, -0.4, 0.15, 0.02); // 企喺左手臂上面
  const crowBody = S(crow, 0.08, 0.07, 0.1, 0x1c1626, 0, 0.05, 0, {}, { line: 0.06 });
  const crowHead = pivot(crow, 0, 0.13, -0.05);
  S(crowHead, 0.06, 0.06, 0.06, 0x1c1626, 0, 0, 0, {}, { line: 0.06 });
  cone(crowHead, 0.022, 0.07, 0xffb300, 0, -0.01, -0.07, {}, 8).rotation.x = -PI / 2;
  for (const s of [-1, 1]) S(crowHead, 0.014, 0.016, 0.01, 0xd500f9, s * 0.028, 0.015, -0.05, GLOW(0xd500f9, 2.5), { lo: true });
  crowBody.rotation.x = 0.3;
  return rig(g, root, {
    eyes, height: 1.5,
    tick(t, m) {
      const sw = Math.sin(t * 8) * 0.55 * m;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      arms[0].rotation.x = -sw * 0.6;
      arms[1].rotation.x = sw * 0.6;
      const idle = 1 - m;
      arms.forEach((a, i) => (a.rotation.z = (i ? 1 : -1) * (1.05 + Math.sin(t * 1.6 + i) * 0.08 * idle)));
      root.position.y = Math.abs(Math.sin(t * 8)) * 0.05 * m;
      torso.rotation.z = Math.sin(t * 1.1) * 0.05 * idle;
      head.rotation.z = Math.sin(t * 1.3) * 0.1 * idle;
      hat.rotation.x = Math.sin(t * 2.2) * 0.05;
      crowHead.rotation.y = Math.sin(t * 0.9) > 0.6 ? 0.6 : Math.sin(t * 0.9) < -0.6 ? -0.6 : 0;
      crowHead.position.y = 0.13 + Math.max(0, Math.sin(t * 5)) * 0.02 * (Math.sin(t * 0.7) > 0.5 ? 1 : 0);
      mouthGlow.emissiveIntensity = 2 + Math.sin(t * 3) * 0.6;
    },
  });
}

// =============== 🎃 Pumpkin Golem（Legendary）===============
// 石頭身 + 發光橙色裂紋同心口符文 + 南瓜燈頭 + 苔蘚 + 膊頭兩個細南瓜 + 藤纏住手
function pumpkinGolem() {
  const g = new THREE.Group();
  const root = pivot(g);
  const stone = 0x6b6577;
  const stone2 = 0x585264;
  const moss = 0x5a9e3a;
  const lava = 0xff8f00;
  const crack = M(lava, GLOW(lava, 2.6));
  // 腳（短短粗粗）
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.22, 0.42, 0.02);
    B(hip, 0.26, 0.34, 0.28, stone2, 0, -0.18, 0, {}, { line: 0.07 });
    B(hip, 0.3, 0.12, 0.34, stone, 0, -0.36, -0.03, {}, { line: 0.07 });
    B(hip, 0.02, 0.18, 0.02, lava, s * 0.05, -0.16, -0.145, crack, { r: 0.4 }).rotation.z = 0.3;
    return hip;
  });
  // 身
  const torso = pivot(root, 0, 0.82, 0);
  B(torso, 0.86, 0.66, 0.56, stone, 0, 0, 0, {}, { line: 0.06, r: 0.24 });
  B(torso, 0.6, 0.2, 0.5, stone2, 0, -0.3, 0.01, {}, { r: 0.3 });
  // 苔蘚（頂）
  for (let i = 0; i < 7; i++) S(torso, 0.1 + (i % 3) * 0.03, 0.04, 0.09, moss, -0.33 + i * 0.11, 0.33, -0.12 + (i % 2) * 0.2, {}, { lo: true });
  // 心口符文：發光圈 + 南瓜核
  const core = pivot(torso, 0, 0.02, -0.29);
  torus(core, 0.13, 0.025, lava, 0, 0, 0, crack);
  const coreBall = S(core, 0.075, 0.075, 0.04, 0xffe082, 0, 0, 0, GLOW(0xffb300, 3));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    const r = B(core, 0.13, 0.022, 0.02, lava, Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0, crack, { r: 0.4 });
    r.rotation.z = a;
  }
  // 裂紋
  for (const [x, y, rz] of [[-0.3, 0.15, 0.6], [0.32, -0.12, -0.5], [0.22, 0.2, 0.2]]) B(torso, 0.02, 0.16, 0.02, lava, x, y, -0.285, crack, { r: 0.4 }).rotation.z = rz;
  // 手（大石拳 + 藤）
  const arms = [-1, 1].map((s) => {
    const sh = pivot(torso, s * 0.5, 0.18, 0);
    sh.rotation.z = s * 0.12;
    B(sh, 0.3, 0.26, 0.32, stone2, 0, 0, 0, {}, { line: 0.07 });
    B(sh, 0.2, 0.32, 0.22, stone, s * 0.02, -0.28, 0, {}, { line: 0.07 });
    B(sh, 0.3, 0.26, 0.3, stone2, s * 0.03, -0.55, -0.02, {}, { line: 0.07 });
    for (let i = 0; i < 3; i++) B(sh, 0.06, 0.06, 0.04, stone, s * 0.03 + (i - 1) * 0.085, -0.55, -0.175, {}, { r: 0.4 }); // 手指節
    const vine = [];
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      const a = k * PI * 4;
      vine.push(V(s * 0.02 + Math.cos(a) * 0.125, -0.12 - k * 0.32, Math.sin(a) * 0.125));
    }
    tube(sh, vine, 0.018, 0x2e7d32, {}, 40);
    S(sh, 0.05, 0.02, 0.035, moss, s * 0.14, -0.2, -0.06, {}).rotation.z = 0.5;
    return sh;
  });
  // 膊頭兩個細南瓜（有樣）
  const minis = [-1, 1].map((s) => {
    const p = pumpkin(torso, 0.11, 0xff8f00, s * 0.5, 0.39, 0.02, {}, { line: 0.05 });
    carvedFace(p, 0.11, 0, -0.1, 0xffe082, { inten: 2.2 });
    p.rotation.y = s * -0.3;
    return p;
  });
  // 頭：南瓜燈
  const head = pivot(torso, 0, 0.56, -0.04);
  const pk = pumpkin(head, 0.34, 0xf57c00, 0, 0, 0, {}, { line: 0.035 });
  const face = carvedFace(pk, 0.34, 0.0, -0.3, 0xffd54f, { inten: 3 });
  // 南瓜入面嘅光（喺眼後面）
  const inner = S(pk, 0.2, 0.15, 0.1, 0xffb300, 0, 0.0, -0.17, GLOW(0xff9100, 2.5), { lo: true });
  // 頭頂一片葉 + 捲藤
  const leaf = shape(pk, [[0, 0], [0.18, 0.12], [0.42, 0.1], [0.62, 0], [0.42, -0.1], [0.18, -0.12]], 0.02, 0x66bb6a, {}, { x: 0.04, y: 0.32, z: 0.02, key: 'pgLeaf' });
  leaf.scale.setScalar(0.4);
  leaf.rotation.set(-0.4, 0.4, 0.3);
  tube(pk, [V(0.03, 0.3, 0), V(-0.08, 0.38, 0.04), V(-0.12, 0.33, 0.1), V(-0.06, 0.3, 0.12)], 0.01, 0x2e7d32, {}, 16);
  return rig(g, root, {
    eyes: [], height: 1.75,
    tick(t, m) {
      const sw = Math.sin(t * 5.5) * 0.45 * m;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      arms[0].rotation.x = -sw * 0.8 + Math.sin(t * 1.2) * 0.05 * (1 - m);
      arms[1].rotation.x = sw * 0.8 - Math.sin(t * 1.2) * 0.05 * (1 - m);
      root.position.y = Math.abs(Math.sin(t * 5.5)) * 0.05 * m;
      torso.rotation.z = Math.sin(t * 5.5) * 0.05 * m + Math.sin(t * 0.9) * 0.02;
      head.rotation.z = Math.sin(t * 1.4) * 0.07;
      head.position.y = 0.56 + Math.sin(t * 2) * 0.012;
      const flicker = 2.4 + Math.sin(t * 9) * 0.4 + Math.sin(t * 23) * 0.3;
      face.mouth.material.emissiveIntensity = flicker;
      inner.material.emissiveIntensity = flicker;
      crack.emissiveIntensity = 2.2 + Math.sin(t * 2.5) * 0.8;
      coreBall.scale.setScalar(0.075 * (1 + Math.sin(t * 3) * 0.12));
      minis.forEach((p, i) => (p.rotation.z = Math.sin(t * 2 + i * 2) * 0.12));
    },
  });
}

// =============== 👻 Soul Phantom（Mythic）===============
// 半透明青色靈魂：大頭 + 大眼 + 心口發光靈魂核 + 頭頂一圈靈火同金光環 + 幾粒靈魂波波圍住轉 + 光暈
function soulPhantom() {
  const g = new THREE.Group();
  const root = pivot(g);
  const spirit = 0x9ae8f5;
  const glowC = 0x18ffff;
  const violet = 0xb388ff;
  const bodyMat = M(spirit, { transparent: true, opacity: 0.8, emissive: glowC, emissiveIntensity: 0.3, roughness: 0.2 });
  // 身（鐘形，下面一條條飄）
  const bodyGeo = cached('spBody', () => {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      pts.push(new THREE.Vector2(0.34 - k * 0.16 + Math.sin(k * PI) * 0.06, k * 0.62));
    }
    const geo = new THREE.LatheGeometry(pts, 48);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y < 0.12) {
        const a = Math.atan2(p.getZ(i), p.getX(i));
        p.setY(i, y - (0.12 - y) * 0.9 * (0.5 + 0.5 * Math.sin(a * 6)));
      }
    }
    geo.computeVertexNormals();
    return geo;
  });
  const body = add(root, bodyGeo, spirit, bodyMat, 0, 0.2, 0);
  body.material.side = THREE.DoubleSide;
  // 心口靈魂核（喺身入面發光）
  const core = S(root, 0.09, 0.09, 0.09, 0xffffff, 0, 0.5, -0.02, GLOW(glowC, 3.2));
  const coreHalo = S(root, 0.16, 0.16, 0.16, glowC, 0, 0.5, -0.02, { transparent: true, opacity: 0.25, emissive: glowC, emissiveIntensity: 2, depthWrite: false }, { lo: true });
  // 細手
  const arms = [-1, 1].map((s) => {
    const a = pivot(root, s * 0.26, 0.6, -0.04);
    S(a, 0.08, 0.13, 0.08, spirit, s * 0.04, -0.08, 0, bodyMat);
    return a;
  });
  // 大頭
  const head = pivot(root, 0, 1.0, 0);
  S(head, 0.4, 0.37, 0.36, spirit, 0, 0, 0, M(spirit, { transparent: true, opacity: 0.95, emissive: glowC, emissiveIntensity: 0.25, roughness: 0.2 }), { line: 0.035 });
  const eyes = [-1, 1].map((s) => {
    const e = pivot(head, s * 0.14, 0.0, -0.3);
    e.rotation.y = s * 0.2;
    S(e, 0.095, 0.12, 0.05, 0x0d1b3a, 0, 0, 0, { roughness: 0.05 });
    S(e, 0.06, 0.075, 0.03, glowC, 0, -0.03, -0.025, GLOW(glowC, 1.6));
    S(e, 0.035, 0.035, 0.02, 0xffffff, 0.03, 0.045, -0.04, GLOW(0xffffff, 1.5), { lo: true });
    S(e, 0.016, 0.016, 0.01, 0xffffff, -0.03, -0.05, -0.04, GLOW(0xffffff, 1.5), { lo: true });
    return e;
  });
  smile(head, 0, -0.12, -0.33, 0.05, 0x0d1b3a, {}, 2.2);
  for (const s of [-1, 1]) S(head, 0.06, 0.035, 0.02, 0xff80ab, s * 0.24, -0.08, -0.29, { transparent: true, opacity: 0.7, emissive: 0xff4081, emissiveIntensity: 0.5 });
  // 頭頂：一圈靈火 + 金光環
  const flames = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    const f = pivot(head, Math.cos(a) * 0.2, 0.3, Math.sin(a) * 0.18);
    const c = i % 2 ? violet : glowC;
    S(f, 0.06, 0.07, 0.06, c, 0, 0.04, 0, GLOW(c, 3), { lo: true });
    cone(f, 0.058, 0.18, c, 0, 0.15, 0, GLOW(c, 3), 12);
    flames.push(f);
  }
  const halo = torus(head, 0.24, 0.022, 0xffd740, 0, 0.5, 0.02, GLOW(0xffd740, 2.6));
  halo.rotation.x = PI / 2 - 0.2;
  // 背後一條靈魂尾巴（向上飄）
  const tail = pivot(root, 0, 0.3, 0.2);
  const tailBalls = [];
  for (let i = 0; i < 7; i++) tailBalls.push(S(tail, 0.1 - i * 0.012, 0.1 - i * 0.012, 0.1 - i * 0.012, spirit, 0, -i * 0.02, i * 0.08, bodyMat, { lo: true }));
  // 靈魂波波（圍住轉）
  const orbs = [0, 1, 2, 3].map((i) => {
    const o = pivot(root, 0, 0, 0);
    const c = i % 2 ? violet : glowC;
    S(o, 0.055, 0.055, 0.055, 0xffffff, 0, 0, 0, GLOW(c, 3), { lo: true });
    S(o, 0.1, 0.1, 0.1, c, 0, 0, 0, { transparent: true, opacity: 0.3, emissive: c, emissiveIntensity: 2, depthWrite: false }, { lo: true });
    return o;
  });
  // 光暈
  const aura = new THREE.Mesh(SPH_LO, new THREE.MeshBasicMaterial({ color: glowC, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false }));
  aura.scale.set(0.8, 1.0, 0.8);
  aura.position.y = 0.75;
  aura.castShadow = false;
  root.add(aura);
  return rig(g, root, {
    eyes, height: 1.7,
    tick(t, m) {
      root.position.y = 0.2 + Math.sin(t * 2) * 0.08;
      root.rotation.x = m * 0.18;
      root.rotation.z = Math.sin(t * 1.3) * 0.05;
      body.scale.set(1 + Math.sin(t * 4) * 0.035, 1, 1 + Math.cos(t * 4) * 0.035);
      arms.forEach((a, i) => (a.rotation.z = (i ? 1 : -1) * (0.2 + Math.sin(t * 2.5 + i) * 0.25)));
      head.rotation.z = Math.sin(t * 1.1) * 0.06;
      flames.forEach((f, i) => f.scale.set(1, 0.8 + Math.sin(t * 11 + i * 1.9) * 0.3, 1));
      halo.rotation.z = t * 0.8;
      halo.position.y = 0.5 + Math.sin(t * 2.4) * 0.02;
      tail.rotation.y = Math.sin(t * 1.8) * 0.4;
      tailBalls.forEach((b, i) => (b.position.x = Math.sin(t * 3 - i * 0.6) * 0.04 * i));
      orbs.forEach((o, i) => {
        const a = t * 1.4 + (i / 4) * PI * 2;
        o.position.set(Math.cos(a) * 0.62, 0.7 + Math.sin(t * 2 + i * 1.5) * 0.25, Math.sin(a) * 0.62);
      });
      const p = Math.sin(t * 3);
      core.scale.setScalar(0.09 * (1 + p * 0.15));
      coreHalo.material.opacity = 0.2 + p * 0.1;
      aura.material.opacity = 0.05 + Math.sin(t * 2.2) * 0.025;
    },
  });
}

export const ECHO_MODELS = {
  'Hollow Bat': hollowBat,
  Scarecrow: scarecrow,
  'Pumpkin Golem': pumpkinGolem,
  'Soul Phantom': soulPhantom,
};
