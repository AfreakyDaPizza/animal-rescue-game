// 🎃 Halloween 寵物 v2（小朋友 2026-10-19：舊款「醜過 KreekCraft 光頭」，全部重新整）
// 風格：好似 Roblox 寵物模擬器嘅展示寵物：圓碌碌、大頭（約成隻高度 45%）、大大對有光澤嘅眼
// （眼白 + 有色眼珠 + 瞳孔 + 兩粒反光）、每隻得幾隻主色 + 一個發光重點色、深色描邊令輪廓清楚
// 全部面向 -z；回傳 Group：userData.animate(time, moving)、userData.height、userData.move（'walk' 或者 'fly'）

import * as THREE from 'three';

const PI = Math.PI;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- 共用形狀 ----------
const SPH = new THREE.SphereGeometry(1, 32, 24);
const SPH_LO = new THREE.SphereGeometry(1, 16, 12);
const geoCache = new Map();
const cached = (key, make) => {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
};
const matCache = new Map();
// 有少少光澤嘅材質；o 可以係 { emissive, emissiveIntensity, transparent, opacity, ... }
function M(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0, ...o }));
  return matCache.get(key);
}
const GLOW = (c, i = 1.8) => ({ emissive: c, emissiveIntensity: i });
const GHOST = (c, o = 0.6, i = 0.8) => ({ transparent: true, opacity: o, emissive: c, emissiveIntensity: i, depthWrite: false });

// 描邊（卡通黑邊）：背面、放大少少
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x140b1c, side: THREE.BackSide });
function outline(mesh, t = 0.05) {
  const o = new THREE.Mesh(mesh.geometry, OUTLINE);
  o.scale.setScalar(1 + t);
  o.castShadow = false;
  o.userData.outline = true;
  mesh.add(o);
  return mesh;
}

function add(parent, geo, color, o, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, o?.isMaterial ? o : M(color, o));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// 拉扁／拉長嘅球
function S(parent, sx, sy, sz, color, x = 0, y = 0, z = 0, o, { line = 0, lo = false } = {}) {
  const m = add(parent, lo ? SPH_LO : SPH, color, o, x, y, z);
  m.scale.set(sx, sy, sz);
  if (line) outline(m, line);
  return m;
}
// 膠囊（由 a 去 b）
function limb(parent, a, b, r, color, o, line = 0) {
  const len = a.distanceTo(b);
  const geo = cached(`cap${r.toFixed(3)}|${len.toFixed(3)}`, () => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 16));
  const m = add(parent, geo, color, o);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  if (line) outline(m, line);
  return m;
}
function cone(parent, r, h, color, x, y, z, o, seg = 24) {
  return add(parent, cached(`cone${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg)), color, o, x, y, z);
}
function cyl(parent, r0, r1, h, color, x, y, z, o, seg = 24) {
  return add(parent, cached(`cyl${r0}|${r1}|${h}|${seg}`, () => new THREE.CylinderGeometry(r0, r1, h, seg)), color, o, x, y, z);
}
function torus(parent, r, tube, color, x, y, z, o, arc = PI * 2) {
  return add(parent, cached(`tor${r}|${tube}|${arc}`, () => new THREE.TorusGeometry(r, tube, 10, 40, arc)), color, o, x, y, z);
}
function pivot(parent, x = 0, y = 0, z = 0) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  parent.add(p);
  return p;
}
// 一串波波（尾、藤）：沿住 pts 曲線
function chain(parent, pts, r0, r1, color, n = 14, o, line = 0) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const p = curve.getPoint(k);
    const r = r0 + (r1 - r0) * k;
    out.push(S(parent, r, r, r, color, p.x, p.y, p.z, o, { line }));
  }
  return out;
}
// 管（順滑尾／藤／鐮刀柄）
function tube(parent, pts, r, color, o, seg = 24) {
  const curve = new THREE.CatmullRomCurve3(pts);
  return add(parent, new THREE.TubeGeometry(curve, seg, r, 10, false), color, o);
}
// 平面形狀（翼、葉、刀）：pts 喺 xy；extrude 薄薄
function shape(parent, pts, depth, color, o, { x = 0, y = 0, z = 0, smooth = true, key } = {}) {
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

// 大大對有光澤嘅眼：眼白 + 眼珠 + 瞳孔 + 兩粒反光；回傳 [左, 右]（眨眼用 scale.y）
function bigEyes(parent, dx, y, z, r, iris, { glow = false, slant = 0, pupil = 0x120a18, white = 0xffffff, tilt = 0.18, irisK = 0.74 } = {}) {
  return [-1, 1].map((s) => {
    const e = pivot(parent, s * dx, y, z);
    e.rotation.set(0, s * tilt, s * slant);
    S(e, r, r * 1.12, r * 0.5, white, 0, 0, 0, { roughness: 0.12 }, { line: 0.07 });
    S(e, r * irisK, r * irisK * 1.08, r * 0.3, iris, 0, -r * 0.08, -r * 0.3, glow ? { roughness: 0.15, ...GLOW(iris, 0.5) } : { roughness: 0.15 });
    S(e, r * irisK * 0.58, r * irisK * 0.66, r * 0.2, pupil, 0, -r * 0.1, -r * 0.43, { roughness: 0.08 });
    S(e, r * 0.24, r * 0.24, r * 0.1, 0xffffff, r * 0.24, r * 0.3, -r * 0.5, GLOW(0xffffff, 0.8), { lo: true });
    S(e, r * 0.11, r * 0.11, r * 0.06, 0xffffff, -r * 0.24, -r * 0.32, -r * 0.5, GLOW(0xffffff, 0.8), { lo: true });
    return e;
  });
}
// 細細個嘅笑口（彎彎）
function smile(parent, x, y, z, w, color = 0x2a1220, o, arc = 2.2, rot = 0) {
  const m = torus(parent, w, w * 0.16, color, x, y, z, o, arc);
  m.rotation.set(0, 0, PI + (PI - arc) / 2 + rot);
  return m;
}
// 眨眼：每 3–5 秒眨一次
const blinkAt = (t, seed = 0) => {
  const p = (t + seed * 1.7) % 4.2;
  return p < 0.12 ? 0.12 + Math.abs(p - 0.06) * 14 : 1;
};

// 巫師帽（尖頂向後彎）
function witchHat(parent, r, color, band, x, y, z) {
  const h = pivot(parent, x, y, z);
  const brim = cyl(h, r * 1.3, r * 1.3, r * 0.08, color, 0, 0, 0, {}, 32);
  outline(brim, 0.04);
  outline(cyl(h, r * 0.62, r * 0.7, r * 0.6, color, 0, r * 0.32, 0, {}), 0.05);
  cyl(h, r * 0.66, r * 0.72, r * 0.16, band, 0, r * 0.1, 0, GLOW(band, 0.9));
  const mid = pivot(h, 0, r * 0.6, 0);
  mid.rotation.x = 0.35;
  outline(cone(mid, r * 0.62, r * 0.8, color, 0, r * 0.4, 0, {}), 0.05);
  const tip = pivot(mid, 0, r * 0.75, 0.02);
  tip.rotation.x = 0.6;
  cone(tip, r * 0.28, r * 0.5, color, 0, r * 0.2, 0, {});
  S(h, r * 0.16, r * 0.16, r * 0.06, 0xffd54f, 0, r * 0.12, -r * 0.7, { metalness: 0.6, roughness: 0.3 });
  return h;
}

// 南瓜：一個順滑波波，車咗 8 條坑（向量位移），唔再係一嚿嚿
function pumpkinGeo(ribs = 8, groove = 0.09) {
  return cached(`pumpkin${ribs}|${groove}`, () => {
    const g = new THREE.SphereGeometry(1, 64, 40);
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
function pumpkin(parent, r, color, x, y, z, o = {}, { stem = 0x4e7d2b, line = 0.04 } = {}) {
  const p = pivot(parent, x, y, z);
  const body = add(p, pumpkinGeo(), color, o);
  body.scale.setScalar(r);
  if (line) outline(body, line);
  const st = tube(p, [V(0, r * 0.7, 0), V(0.02 * r, r * 0.95, 0.02 * r), V(0.12 * r, r * 1.08, 0.06 * r)], r * 0.09, stem, {});
  st.castShadow = true;
  return p;
}
// 刻出嚟嘅發光樣（三角眼 + 鋸齒笑口）：貼喺南瓜前面
function carvedFace(parent, r, y, z, color = 0xffc400, { eyes = true, inten = 2.6 } = {}) {
  const o = GLOW(color, inten);
  if (eyes) for (const s of [-1, 1]) {
    const e = shape(parent, [[-0.5, -0.38], [0.5, -0.38], [0.05, 0.5]], 0.05, color, o, { x: s * r * 0.36, y: y + r * 0.2, z, smooth: false, key: 'cvEye' });
    e.scale.setScalar(r * 0.36);
    e.rotation.z = s * -0.25;
  }
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
  const m = shape(parent, pts, 0.05, color, o, { y: y - r * 0.22, z, smooth: false, key: 'cvMouth' });
  m.scale.setScalar(r * 0.75);
}

// 翼／葉形
const BAT_WING = [[0, 0], [0.45, 0.32], [0.95, 0.38], [0.85, 0.1], [0.68, 0.0], [0.6, -0.16], [0.42, -0.06], [0.3, -0.2], [0.14, -0.06]];
const LEAF = [[0, 0], [0.18, 0.12], [0.42, 0.1], [0.62, 0], [0.42, -0.1], [0.18, -0.12]];
const FLAME_WING = [[0, 0], [0.3, 0.3], [0.55, 0.62], [0.62, 0.32], [0.85, 0.5], [0.82, 0.18], [1.02, 0.18], [0.75, -0.08], [0.4, -0.14]];

// 4 隻短腳（圓膠囊 + 腳掌）
function stubLegs(root, { x, zf, zb, y, len, r, color, paw = color }) {
  return [[-x, zf, 0], [x, zf, PI], [-x, zb, PI], [x, zb, 0]].map(([lx, lz, phase]) => {
    const hip = pivot(root, lx, y, lz);
    limb(hip, V(0, 0, 0), V(0, -len, 0), r, color, {}, 0.06);
    S(hip, r * 1.25, r * 0.8, r * 1.45, paw, 0, -len - r * 0.3, -r * 0.25, {}, { line: 0.06 });
    return { hip, phase };
  });
}
// 動畫骨架：眨眼 + 呼吸 + 自己嘅 tick
function rig(g, root, { eyes = [], move = 'walk', height = 1, tick }) {
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
const legSwing = (legs, t, moving, speed = 10, amp = 0.6) => {
  for (const l of legs) l.hip.rotation.x = Math.sin(t * speed + l.phase) * amp * moving;
};

// 星空紋理（Voidseer 用）
let galaxyTex = null;
function galaxy() {
  if (galaxyTex) return galaxyTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#120634');
  gr.addColorStop(0.5, '#3b0f6e');
  gr.addColorStop(1, '#0b1a4a');
  x.fillStyle = gr;
  x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 26; i++) {
    const rg = x.createRadialGradient(Math.random() * 512, Math.random() * 256, 0, Math.random() * 512, Math.random() * 256, 40 + Math.random() * 60);
    rg.addColorStop(0, ['rgba(255,64,200,0.35)', 'rgba(0,229,255,0.3)', 'rgba(124,77,255,0.35)'][i % 3]);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg;
    x.fillRect(0, 0, 512, 256);
  }
  for (let i = 0; i < 260; i++) {
    x.fillStyle = i % 9 ? '#ffffff' : '#80d8ff';
    const s = Math.random() < 0.08 ? 2.4 : 1.2;
    x.fillRect(Math.random() * 512, Math.random() * 256, s, s);
  }
  galaxyTex = new THREE.CanvasTexture(c);
  galaxyTex.colorSpace = THREE.SRGBColorSpace;
  return galaxyTex;
}

// =============== 🎃 Pumpkin Graveyard ===============

// Whiskers：黑貓 + 巫師帽 + 綠色發光眼 + 捲捲尾
function whiskers() {
  const g = new THREE.Group();
  const root = pivot(g);
  const fur = 0x2a2236;
  const fur2 = 0x3d3150;
  S(root, 0.3, 0.27, 0.36, fur, 0, 0.36, 0.06, {}, { line: 0.05 });
  S(root, 0.2, 0.18, 0.2, fur2, 0, 0.32, -0.16);
  const legs = stubLegs(root, { x: 0.15, zf: -0.12, zb: 0.24, y: 0.26, len: 0.12, r: 0.075, color: fur, paw: fur2 });
  const head = pivot(root, 0, 0.74, -0.14);
  S(head, 0.36, 0.32, 0.31, fur, 0, 0, 0, {}, { line: 0.045 });
  S(head, 0.17, 0.11, 0.1, fur2, 0, -0.12, -0.25);
  S(head, 0.035, 0.028, 0.025, 0xff80ab, 0, -0.08, -0.34);
  smile(head, -0.035, -0.14, -0.33, 0.035, 0xff80ab, {}, 2.4);
  smile(head, 0.035, -0.14, -0.33, 0.035, 0xff80ab, {}, 2.4);
  for (const s of [-1, 1]) {
    const ear = pivot(head, s * 0.2, 0.24, -0.02);
    ear.rotation.z = s * -0.35;
    outline(cone(ear, 0.12, 0.26, fur, 0, 0.1, 0, {}), 0.06);
    cone(ear, 0.07, 0.16, 0xff80ab, 0, 0.07, -0.05, {});
    S(head, 0.06, 0.05, 0.04, 0xff80ab, s * 0.2, -0.11, -0.24, { transparent: true, opacity: 0.55 });
    for (const k of [-1, 1]) limb(head, V(s * 0.16, -0.1 + k * 0.025, -0.25), V(s * 0.38, -0.07 + k * 0.06, -0.2), 0.006, 0xeeeeee, GLOW(0xffffff, 0.3));
  }
  const eyes = bigEyes(head, 0.13, 0.03, -0.25, 0.11, 0x76ff03, { glow: true, slant: -0.12 });
  const hat = witchHat(head, 0.22, 0x4a148c, 0xff9100, 0.04, 0.27, 0.02);
  hat.rotation.z = -0.22;
  // 頸圈 + 鈴
  torus(root, 0.19, 0.03, 0xff9100, 0, 0.56, -0.12, GLOW(0xff6d00, 0.4)).rotation.x = PI / 2 - 0.3;
  S(root, 0.05, 0.05, 0.05, 0xffd54f, 0, 0.5, -0.31, { metalness: 0.7, roughness: 0.25 });
  // 捲捲尾
  const tail = pivot(root, 0, 0.42, 0.38);
  const tp = [];
  for (let i = 0; i <= 10; i++) {
    const k = i / 10;
    tp.push(V(Math.sin(k * 5) * 0.1 * k, k * 0.55, 0.05 + k * 0.12 - Math.sin(k * PI) * 0.05));
  }
  tp.push(V(0.1, 0.62, 0.05), V(0.02, 0.6, -0.02));
  tube(tail, tp, 0.05, fur, {});
  S(tail, 0.07, 0.07, 0.07, 0x76ff03, 0.02, 0.6, -0.02, GLOW(0x76ff03, 1.2));
  return rig(g, root, {
    eyes, height: 1.0,
    tick(t, m) {
      legSwing(legs, t, m, 11, 0.6);
      root.position.y = Math.abs(Math.sin(t * 11)) * 0.035 * m;
      tail.rotation.z = Math.sin(t * 2.4) * 0.3;
      head.rotation.z = Math.sin(t * 1.2) * 0.06 * (1 - m);
      hat.rotation.x = Math.sin(t * 2) * 0.05;
    },
  });
}

// Jesterpop：由禮物盒彈出嚟嘅小丑小鬼
function jesterpop() {
  const g = new THREE.Group();
  const root = pivot(g);
  // 盒（間條）
  const boxG = pivot(root, 0, 0.24, 0);
  const bx = add(boxG, cached('jbox', () => new THREE.BoxGeometry(0.62, 0.48, 0.62, 2, 2, 2)), 0x7b1fa2, {});
  outline(bx, 0.04);
  for (const x of [-0.18, 0.18]) add(boxG, cached('jstripe', () => new THREE.BoxGeometry(0.1, 0.49, 0.63)), 0xff9100, {}, x, 0, 0);
  add(boxG, cached('jrib', () => new THREE.BoxGeometry(0.64, 0.5, 0.08)), 0x76ff03, GLOW(0x76ff03, 0.5), 0, 0, 0);
  add(boxG, cached('jlid', () => new THREE.BoxGeometry(0.68, 0.08, 0.68)), 0x9c27b0, {}, 0, 0.27, 0);
  // 彈弓 + 身
  const spring = pivot(root, 0, 0.5, 0);
  for (let i = 0; i < 4; i++) torus(spring, 0.09, 0.022, 0xbdbdbd, 0, 0.04 + i * 0.07, 0, { metalness: 0.8, roughness: 0.25 }).rotation.x = PI / 2;
  const imp = pivot(spring, 0, 0.34, 0);
  S(imp, 0.2, 0.18, 0.18, 0xff9100, 0, 0.02, 0, {}, { line: 0.05 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    S(imp, 0.09, 0.05, 0.09, i % 2 ? 0xffffff : 0x7b1fa2, Math.cos(a) * 0.17, 0.14, Math.sin(a) * 0.17);
  }
  const head = pivot(imp, 0, 0.4, 0);
  S(head, 0.3, 0.28, 0.27, 0xfde7f3, 0, 0, 0, {}, { line: 0.045 });
  S(head, 0.07, 0.07, 0.06, 0xff1744, 0, -0.04, -0.27, GLOW(0xff1744, 0.4));
  for (const s of [-1, 1]) S(head, 0.06, 0.05, 0.03, 0xff80ab, s * 0.18, -0.08, -0.22, { transparent: true, opacity: 0.6 });
  smile(head, 0, -0.1, -0.26, 0.11, 0x6a1b9a, {}, 2.6);
  const eyes = bigEyes(head, 0.11, 0.06, -0.22, 0.09, 0xab47bc, {});
  // 小丑帽：3 條垂落嚟嘅角 + 金鈴
  const hat = pivot(head, 0, 0.18, 0);
  S(hat, 0.3, 0.12, 0.28, 0x7b1fa2, 0, 0.02, 0, {}, { line: 0.05 });
  const bells = [];
  [[-1, 0x7b1fa2], [0, 0xff9100], [1, 0x76ff03]].forEach(([s, c], i) => {
    const p = pivot(hat, s * 0.16, 0.08, i === 1 ? 0.05 : 0);
    const end = V(s * 0.32, 0.12 + (i === 1 ? 0.3 : 0.05), i === 1 ? 0.05 : 0);
    tube(p, [V(0, 0, 0), V(s * 0.12, 0.28, 0), V(s * 0.28, 0.3 + (i === 1 ? 0.12 : 0), 0), end], 0.065, c, {});
    S(p, 0.06, 0.06, 0.06, 0xffd600, end.x, end.y - 0.04, end.z, { metalness: 0.75, roughness: 0.2 });
    bells.push(p);
  });
  // 細手
  for (const s of [-1, 1]) limb(imp, V(s * 0.17, 0.08, 0), V(s * 0.32, 0.24, -0.05), 0.045, 0xfde7f3, {}, 0.08);
  return rig(g, root, {
    eyes, height: 1.4,
    tick(t, m) {
      const h = Math.abs(Math.sin(t * 6));
      root.position.y = h * 0.18 * (m + (1 - m) * 0.25);
      const pop = Math.sin(t * 3) * 0.06 + (m ? h * 0.08 : 0);
      spring.scale.y = 1 + pop * 2;
      imp.rotation.z = Math.sin(t * 2.6) * 0.15;
      bells.forEach((b, i) => (b.rotation.z = Math.sin(t * 5 + i) * 0.15));
    },
  });
}

// Candlefang：有蝙蝠翼嘅小狗，頭頂一支溶緊嘅蠟燭
function candlefang() {
  const g = new THREE.Group();
  const root = pivot(g);
  const fur = 0x4a4458;
  const belly = 0x8d84a3;
  S(root, 0.27, 0.24, 0.34, fur, 0, 0.36, 0.06, {}, { line: 0.05 });
  S(root, 0.18, 0.16, 0.22, belly, 0, 0.3, -0.12);
  const legs = stubLegs(root, { x: 0.14, zf: -0.1, zb: 0.22, y: 0.26, len: 0.12, r: 0.07, color: fur, paw: belly });
  const head = pivot(root, 0, 0.72, -0.14);
  S(head, 0.33, 0.29, 0.29, fur, 0, 0, 0, {}, { line: 0.045 });
  S(head, 0.17, 0.12, 0.12, belly, 0, -0.1, -0.22);
  S(head, 0.06, 0.045, 0.04, 0x1a1020, 0, -0.04, -0.33);
  for (const s of [-1, 1]) {
    cone(head, 0.022, 0.06, 0xffffff, s * 0.05, -0.19, -0.3, {}).rotation.x = PI;
    const ear = pivot(head, s * 0.26, 0.1, 0);
    ear.rotation.z = s * -1.0;
    outline(S(ear, 0.07, 0.17, 0.05, fur, 0, -0.12, 0), 0.08);
    S(ear, 0.04, 0.11, 0.02, 0xb39ddb, 0, -0.12, -0.035);
  }
  smile(head, 0, -0.15, -0.31, 0.06, 0x1a1020, {}, 2.2);
  const eyes = bigEyes(head, 0.12, 0.04, -0.23, 0.095, 0xffab00, { glow: true });
  // 蠟燭 + 蠟滴 + 火
  const candle = pivot(head, 0, 0.26, 0.02);
  outline(cyl(candle, 0.08, 0.09, 0.26, 0xfff3e0, 0, 0.13, 0, { roughness: 0.6 }), 0.05);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2 + 0.3;
    const len = 0.06 + (i % 3) * 0.04;
    limb(candle, V(Math.cos(a) * 0.085, 0.24, Math.sin(a) * 0.085), V(Math.cos(a) * 0.09, 0.24 - len, Math.sin(a) * 0.09), 0.022, 0xfff3e0, { roughness: 0.6 });
  }
  S(candle, 0.12, 0.04, 0.12, 0xfff3e0, 0, 0.02, 0, { roughness: 0.6 });
  const flame = pivot(candle, 0, 0.3, 0);
  S(flame, 0.06, 0.12, 0.06, 0xff9100, 0, 0.08, 0, GHOST(0xff6d00, 0.9, 2.4));
  S(flame, 0.035, 0.08, 0.035, 0xfff59d, 0, 0.06, 0, GLOW(0xfff59d, 3));
  // 蝙蝠翼
  const wings = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.2, 0.52, 0.1);
    const w = shape(p, BAT_WING, 0.03, 0x6a1b9a, { emissive: 0x4a148c, emissiveIntensity: 0.5, side: THREE.DoubleSide }, { key: 'batwing' });
    w.scale.set(s * 0.55, 0.55, 0.55);
    w.rotation.y = s * -0.3;
    return p;
  });
  return rig(g, root, {
    eyes, height: 1.25,
    tick(t, m) {
      legSwing(legs, t, m, 10, 0.6);
      root.position.y = Math.abs(Math.sin(t * 10)) * 0.04 * m;
      wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * (m ? 14 : 4)) * (m ? 0.5 : 0.18))));
      flame.scale.set(1 + Math.sin(t * 17) * 0.1, 1 + Math.sin(t * 13) * 0.18, 1);
      flame.rotation.z = Math.sin(t * 7) * 0.12;
    },
  });
}

// Spirit Knight：鬼魂騎士頭盔 + 半透明靈體 + 發光劍
function spiritKnight() {
  const g = new THREE.Group();
  const root = pivot(g);
  const steel = 0xb0bec5;
  const metal = { metalness: 0.75, roughness: 0.28 };
  // 靈體（漏斗形向下變幼，飄）
  const body = add(root, cached('knightWisp', () => {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      pts.push(new THREE.Vector2(0.02 + Math.sin(k * PI * 0.92) * 0.36 + k * 0.04, k * 0.85));
    }
    return new THREE.LatheGeometry(pts, 32);
  }), 0x40c4ff, GHOST(0x00b0ff, 0.55, 1.1), 0, 0.2, 0);
  const tailT = S(root, 0.06, 0.12, 0.06, 0x40c4ff, 0, 0.16, 0, GHOST(0x00b0ff, 0.5, 1.2));
  // 肩甲 + 胸甲
  S(root, 0.27, 0.16, 0.22, steel, 0, 0.9, 0, metal, { line: 0.04 });
  for (const s of [-1, 1]) S(root, 0.14, 0.1, 0.14, steel, s * 0.27, 0.95, 0, metal, { line: 0.05 });
  S(root, 0.07, 0.07, 0.03, 0x00e5ff, 0, 0.88, -0.22, GLOW(0x00e5ff, 2));
  // 披風（後面，藍色鬼火）
  const cape = pivot(root, 0, 0.98, 0.14);
  const capeM = shape(cape, [[-0.3, 0], [0.3, 0], [0.36, -0.55], [0.18, -0.68], [0, -0.6], [-0.18, -0.7], [-0.36, -0.55]], 0.03, 0x1565c0, { ...GHOST(0x2979ff, 0.85, 0.6), side: THREE.DoubleSide }, { key: 'kcape', smooth: false });
  outline(capeM, 0.04);
  // 盾（左手，有發光徽號）
  const shield = pivot(root, -0.36, 0.7, -0.12);
  shield.rotation.y = 0.5;
  const sh = shape(shield, [[0, 0.22], [0.18, 0.16], [0.16, -0.06], [0, -0.24], [-0.16, -0.06], [-0.18, 0.16]], 0.05, 0x90a4ae, { metalness: 0.7, roughness: 0.3 }, { key: 'kshield', smooth: false });
  outline(sh, 0.06);
  S(shield, 0.07, 0.09, 0.03, 0x00e5ff, 0, 0.02, -0.04, GLOW(0x00e5ff, 1.4));
  // 頭盔（大）
  const head = pivot(root, 0, 1.28, 0);
  add(head, cached('crest', () => new THREE.BoxGeometry(0.06, 0.12, 0.5)), 0xffd54f, { metalness: 0.75, roughness: 0.28 }, 0, 0.28, 0.02);
  S(head, 0.31, 0.33, 0.31, steel, 0, 0, 0, metal, { line: 0.04 });
  add(head, cached('visor', () => new THREE.BoxGeometry(0.4, 0.07, 0.1)), 0x0b1020, {}, 0, 0.02, -0.29);
  const eyes = [-1, 1].map((s) => S(head, 0.07, 0.035, 0.03, 0x00e5ff, s * 0.1, 0.02, -0.34, GLOW(0x00e5ff, 2.4)));
  for (let i = 0; i < 4; i++) add(head, cached('breath', () => new THREE.BoxGeometry(0.02, 0.1, 0.03)), 0x37474f, {}, -0.09 + i * 0.06, -0.12, -0.3);
  cyl(head, 0.02, 0.02, 0.62, 0xffd54f, 0, 0.0, 0, { ...metal, color: 0xffd54f }).rotation.x = PI / 2;
  // 羽毛
  const plume = pivot(head, 0, 0.3, 0.05);
  chain(plume, [V(0, 0, 0), V(0, 0.12, 0.08), V(0, 0.16, 0.22), V(0, 0.06, 0.34)], 0.07, 0.04, 0x00e5ff, 9, GHOST(0x00e5ff, 0.85, 1.6));
  // 手 + 劍
  const arms = [-1, 1].map((s) => {
    const sh = pivot(root, s * 0.3, 0.92, 0);
    limb(sh, V(0, 0, 0), V(s * 0.06, -0.26, -0.06), 0.06, 0x40c4ff, GHOST(0x00b0ff, 0.6, 1));
    S(sh, 0.075, 0.075, 0.075, steel, s * 0.06, -0.3, -0.07, metal, { line: 0.06 });
    return sh;
  });
  const sword = pivot(arms[1], 0.06, -0.3, -0.07);
  sword.rotation.x = -1.25;
  outline(add(sword, cached('blade', () => new THREE.BoxGeometry(0.07, 0.46, 0.025)), 0x4fc3f7, GLOW(0x0091ea, 1.3), 0, 0.3, 0), 0.08);
  cone(sword, 0.05, 0.1, 0x4fc3f7, 0, 0.58, 0, GLOW(0x0091ea, 1.3), 4).rotation.y = PI / 4;
  add(sword, cached('guard', () => new THREE.BoxGeometry(0.24, 0.04, 0.05)), 0xffd54f, metal, 0, 0.06, 0);
  add(sword, cached('hilt', () => new THREE.BoxGeometry(0.04, 0.14, 0.04)), 0x4e342e, {}, 0, -0.02, 0);
  return rig(g, root, {
    eyes: [], height: 1.75,
    tick(t, m) {
      root.position.y = 0.12 + Math.sin(t * 2) * 0.06;
      root.rotation.x = m * 0.12;
      body.scale.set(1 + Math.sin(t * 3) * 0.04, 1, 1 + Math.cos(t * 3) * 0.04);
      tailT.position.x = Math.sin(t * 3) * 0.05;
      plume.rotation.x = Math.sin(t * 3) * 0.1;
      cape.rotation.x = 0.15 + Math.sin(t * 2.5) * 0.08 + m * 0.25;
      shield.position.y = 0.7 + Math.sin(t * 2) * 0.02;
      arms[0].rotation.x = Math.sin(t * 2) * 0.12;
      arms[1].rotation.x = 0.1 + Math.sin(t * 2 + 1) * 0.08;
      const flick = (t * 0.7) % 3 < 0.08 ? 0.3 : 1;
      eyes.forEach((e) => (e.scale.y = 0.035 * flick));
    },
  });
}

// Graveyard Brute：友善嘅墓碑石人 + 青苔
function graveyardBrute() {
  const g = new THREE.Group();
  const root = pivot(g);
  const stone = 0x9ea4ab;
  const dark = 0x6f757c;
  const moss = 0x7cb342;
  // 墓碑身（圓頂）
  const torso = pivot(root, 0, 0.62, 0);
  const slabGeo = cached('tomb', () => {
    const s = new THREE.Shape();
    s.moveTo(-0.42, -0.5);
    s.lineTo(0.42, -0.5);
    s.lineTo(0.42, 0.3);
    s.absarc(0, 0.3, 0.42, 0, PI, false);
    s.lineTo(-0.42, -0.5);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4, curveSegments: 24 });
    geo.translate(0, 0, -0.18);
    return geo;
  });
  const tomb = add(torso, slabGeo, stone, { roughness: 0.75 }, 0, 0.15, 0);
  outline(tomb, 0.035);
  // 刻字「RIP」用十字代替
  add(torso, cached('crossV', () => new THREE.BoxGeometry(0.06, 0.22, 0.03)), dark, {}, 0, 0.6, -0.27);
  add(torso, cached('crossH', () => new THREE.BoxGeometry(0.16, 0.05, 0.03)), dark, {}, 0, 0.64, -0.27);
  // 樣：大眼 + 笑
  const eyes = bigEyes(torso, 0.16, 0.32, -0.27, 0.11, 0xc6ff00, { glow: true, white: 0xf5f5dc });
  smile(torso, 0, 0.1, -0.28, 0.1, 0x37474f, {}, 2.4);
  for (const s of [-1, 1]) S(torso, 0.05, 0.035, 0.02, 0xff8a80, s * 0.27, 0.15, -0.27, { transparent: true, opacity: 0.55 });
  // 青苔
  [[0.2, 0.8, -0.1], [-0.25, 0.7, 0.05], [0.33, 0.25, -0.15], [-0.3, -0.15, -0.16], [0, 0.88, 0.06]].forEach(([x, y, z], i) => S(torso, 0.13 - i * 0.012, 0.06, 0.1, i % 2 ? moss : 0x9ccc65, x, y, z, { roughness: 0.9 }));
  // 粗手粗腳
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.2, 0.34, 0);
    limb(hip, V(0, 0, 0), V(0, -0.2, 0), 0.11, dark, { roughness: 0.75 }, 0.05);
    S(hip, 0.15, 0.09, 0.18, stone, 0, -0.3, -0.03, { roughness: 0.75 }, { line: 0.05 });
    return hip;
  });
  const arms = [-1, 1].map((s) => {
    const sh = pivot(root, s * 0.52, 0.82, 0);
    limb(sh, V(0, 0, 0), V(s * 0.05, -0.32, 0), 0.1, dark, { roughness: 0.75 }, 0.05);
    S(sh, 0.15, 0.14, 0.15, stone, s * 0.05, -0.42, 0, { roughness: 0.75 }, { line: 0.05 });
    S(sh, 0.07, 0.03, 0.06, moss, 0, 0.02, 0, { roughness: 0.9 });
    return sh;
  });
  // 頭頂一朵細花
  const flower = pivot(torso, 0.18, 0.98, 0);
  limb(flower, V(0, -0.04, 0), V(0, 0.12, 0), 0.015, 0x558b2f, {});
  for (let i = 0; i < 5; i++) S(flower, 0.04, 0.02, 0.04, 0xce93d8, Math.cos(i * 1.256) * 0.04, 0.14, Math.sin(i * 1.256) * 0.04);
  S(flower, 0.025, 0.025, 0.025, 0xffeb3b, 0, 0.15, 0);
  return rig(g, root, {
    eyes, height: 1.95,
    tick(t, m) {
      const s = Math.sin(t * 5) * 0.4 * m;
      legs[0].rotation.x = s;
      legs[1].rotation.x = -s;
      arms[0].rotation.x = -s * 0.8;
      arms[1].rotation.x = s * 0.8 + (1 - m) * Math.max(0, Math.sin(t * 1.5)) * -0.6; // 揮手
      torso.rotation.z = Math.sin(t * 5) * 0.05 * m + Math.sin(t * 1.2) * 0.02;
      root.position.y = Math.abs(Math.sin(t * 5)) * 0.05 * m;
      flower.rotation.z = Math.sin(t * 2) * 0.2;
    },
  });
}

// Ghost Reaper：可愛嘅浮空小死神 + 大頭罩 + 發光眼 + 鐮刀
function ghostReaper() {
  const g = new THREE.Group();
  const root = pivot(g);
  const cloth = 0x1f2b27;
  const cloth2 = 0x2e3f38;
  // 長袍（下面一條條飄）
  const robe = add(root, cached('reaperRobe', () => {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      pts.push(new THREE.Vector2(0.36 - k * 0.2 + Math.sin(k * PI) * 0.04, k * 0.62));
    }
    const geo = new THREE.LatheGeometry(pts, 40);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y < 0.05) {
        const a = Math.atan2(p.getZ(i), p.getX(i));
        p.setY(i, y - 0.08 * (0.5 + 0.5 * Math.sin(a * 7)));
      }
    }
    geo.computeVertexNormals();
    return geo;
  }), cloth, { side: THREE.DoubleSide }, 0, 0.18, 0);
  outline(robe, 0.04);
  // 大頭罩
  const head = pivot(root, 0, 0.98, 0);
  S(head, 0.38, 0.4, 0.36, cloth2, 0, 0, 0.02, {}, { line: 0.045 });
  cone(head, 0.18, 0.3, cloth2, 0, 0.32, 0.12, {}).rotation.x = -0.9;
  // 黑面 + 綠眼
  S(head, 0.27, 0.27, 0.12, 0x05080a, 0, -0.04, -0.27, { roughness: 1 });
  const eyes = [-1, 1].map((s) => {
    const e = S(head, 0.075, 0.095, 0.04, 0x00e676, s * 0.1, -0.02, -0.37, GLOW(0x00e676, 3));
    S(e, 0.35, 0.35, 0.3, 0xffffff, 0.3, 0.35, -0.8, GLOW(0xffffff, 1));
    return e;
  });
  torus(head, 0.3, 0.035, 0x00e676, 0, -0.04, -0.24, GLOW(0x00e676, 1.2)).scale.set(1, 1.05, 0.6);
  // 細手 + 鐮刀
  const hand = pivot(root, 0.3, 0.62, -0.1);
  S(hand, 0.07, 0.07, 0.07, 0xe0f2f1, 0, 0, 0, {}, { line: 0.07 });
  S(root, 0.07, 0.07, 0.07, 0xe0f2f1, -0.3, 0.6, -0.12, {}, { line: 0.07 });
  const scythe = pivot(hand, 0, 0, 0);
  scythe.rotation.z = -0.15;
  tube(scythe, [V(0, -0.55, 0), V(0.02, 0, 0), V(0, 0.75, 0.02)], 0.025, 0x5d4037, { roughness: 0.6 }, 12);
  const blade = tube(scythe, [V(0, 0.72, 0), V(-0.18, 0.82, -0.02), V(-0.38, 0.7, -0.03), V(-0.46, 0.5, -0.03)], 0.035, 0xb9f6ca, GLOW(0x00e676, 1.8), 20);
  blade.scale.z = 0.5;
  // 鬼火
  const wisps = [0, 1, 2].map((i) => S(root, 0.05, 0.05, 0.05, 0x69f0ae, 0, 0, 0, GHOST(0x00e676, 0.8, 2.5), { lo: true }));
  return rig(g, root, {
    eyes: [], height: 1.85, move: 'walk',
    tick(t, m) {
      root.position.y = 0.25 + Math.sin(t * 2) * 0.08;
      root.rotation.x = m * 0.15;
      root.rotation.z = Math.sin(t * 1.3) * 0.05;
      robe.scale.set(1 + Math.sin(t * 4) * 0.03, 1, 1 + Math.cos(t * 4) * 0.03);
      scythe.rotation.x = Math.sin(t * 1.6) * 0.1;
      const b = blinkAt(t, 3);
      eyes.forEach((e) => (e.scale.y = 0.095 * b));
      wisps.forEach((w, i) => {
        const a = t * 1.2 + (i / 3) * PI * 2;
        w.position.set(Math.cos(a) * 0.55, 0.8 + Math.sin(t * 2 + i) * 0.15, Math.sin(a) * 0.55);
      });
    },
  });
}

// =============== 👻 Hollow Sprites ===============

// Hooded Gerbil：着紫色斗篷嘅沙鼠
function hoodedGerbil() {
  const g = new THREE.Group();
  const root = pivot(g);
  const fur = 0xe0a96d;
  const cream = 0xfff3e0;
  const cloak = 0x6a1b9a;
  S(root, 0.24, 0.22, 0.28, fur, 0, 0.26, 0.04, {}, { line: 0.05 });
  S(root, 0.16, 0.15, 0.14, cream, 0, 0.23, -0.14);
  const legs = stubLegs(root, { x: 0.12, zf: -0.08, zb: 0.16, y: 0.16, len: 0.05, r: 0.05, color: fur, paw: 0xffab91 });
  // 斗篷（背後半個殼 + 金扣）
  const cape = S(root, 0.28, 0.26, 0.3, cloak, 0, 0.32, 0.1, { side: THREE.DoubleSide }, { line: 0.04 });
  cape.scale.z = 0.3;
  cape.position.z = 0.17;
  S(root, 0.05, 0.05, 0.03, 0xffd54f, 0, 0.42, -0.18, { metalness: 0.7, roughness: 0.25 });
  const head = pivot(root, 0, 0.56, -0.06);
  S(head, 0.27, 0.25, 0.25, fur, 0, 0, 0, {}, { line: 0.045 });
  S(head, 0.14, 0.1, 0.1, cream, 0, -0.08, -0.19);
  S(head, 0.04, 0.03, 0.03, 0xff80ab, 0, -0.04, -0.28);
  for (const s of [-1, 1]) add(head, cached('tooth', () => new THREE.BoxGeometry(0.03, 0.045, 0.015)), 0xffffff, {}, s * 0.017, -0.16, -0.26);
  // 頭罩（蓋住頭頂，耳仔窿伸出嚟）
  const hood = S(head, 0.29, 0.27, 0.27, cloak, 0, 0.06, 0.08, {}, { line: 0.04 });
  cone(head, 0.1, 0.2, cloak, 0, 0.18, 0.28, {}).rotation.x = 1.9;
  const ears = [-1, 1].map((s) => {
    const ear = pivot(head, s * 0.19, 0.22, -0.02);
    ear.rotation.z = s * -0.4;
    outline(S(ear, 0.09, 0.11, 0.035, fur, 0, 0.07, 0), 0.07);
    S(ear, 0.055, 0.075, 0.02, 0xffab91, 0, 0.07, -0.02);
    return ear;
  });
  const eyes = bigEyes(head, 0.1, 0.0, -0.18, 0.085, 0x5d4037, {});
  for (const s of [-1, 1]) for (const k of [-1, 1]) limb(head, V(s * 0.08, -0.06 + k * 0.015, -0.24), V(s * 0.25, -0.04 + k * 0.04, -0.2), 0.005, 0xffffff, {});
  // 長尾 + 毛毛尾尖
  const tail = pivot(root, 0, 0.18, 0.28);
  tube(tail, [V(0, 0, 0), V(0, 0.02, 0.18), V(0.04, 0.1, 0.36), V(0.02, 0.22, 0.44)], 0.025, 0xc68e57, {});
  S(tail, 0.06, 0.08, 0.06, 0x8d6e63, 0.02, 0.25, 0.45);
  return rig(g, root, {
    eyes, height: 0.85,
    tick(t, m) {
      legSwing(legs, t, m, 15, 0.6);
      root.position.y = Math.abs(Math.sin(t * 15)) * 0.03 * m;
      ears.forEach((e, i) => (e.rotation.x = Math.sin(t * 3 + i) * 0.12));
      head.rotation.z = Math.sin(t * 2.2) * 0.07 * (1 - m);
      tail.rotation.y = Math.sin(t * 4) * 0.3;
    },
  });
}

// Toadstool：頂住大菇帽嘅青蛙（紫菇白點）
function toadstool() {
  const g = new THREE.Group();
  const root = pivot(g);
  const skin = 0x7cb342;
  const belly = 0xdcedc8;
  const body = S(root, 0.38, 0.28, 0.34, skin, 0, 0.3, 0.02, {}, { line: 0.045 });
  S(root, 0.27, 0.18, 0.2, belly, 0, 0.24, -0.17);
  // 大嘴 + 腮紅
  smile(root, 0, 0.3, -0.31, 0.2, 0x33691e, {}, 2.3);
  for (const s of [-1, 1]) S(root, 0.06, 0.04, 0.03, 0xff80ab, s * 0.26, 0.3, -0.26, { transparent: true, opacity: 0.6 });
  // 頭頂兩粒凸眼
  const eyeBumps = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.17, 0.52, -0.12);
    S(p, 0.13, 0.12, 0.13, skin, 0, 0, 0, {}, { line: 0.06 });
    return p;
  });
  const eyes = [];
  eyeBumps.forEach((p, i) => {
    const [e] = bigEyes(p, 0, 0.02, -0.08, 0.1, 0xffc107, { tilt: 0 });
    e.position.x = 0;
    eyes.push(e);
  });
  // 前後腳
  const feet = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.28, 0.14, 0.12);
    S(hip, 0.14, 0.08, 0.2, skin, s * 0.04, -0.06, 0.04, {}, { line: 0.06 });
    return hip;
  });
  for (const s of [-1, 1]) S(root, 0.07, 0.04, 0.09, skin, s * 0.18, 0.04, -0.22, {}, { line: 0.06 });
  // 菇帽
  const cap = pivot(root, 0, 0.72, 0.04);
  cap.rotation.z = 0.12;
  const capM = add(cap, cached('mushCap', () => {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * (PI / 2);
      pts.push(new THREE.Vector2(Math.sin(a) * 0.5, Math.cos(a) * 0.3));
    }
    pts.push(new THREE.Vector2(0.46, -0.04), new THREE.Vector2(0.0, -0.02));
    return new THREE.LatheGeometry(pts.reverse(), 40);
  }), 0x9c27b0, {});
  outline(capM, 0.03);
  [[0, 0.3, 0], [0.26, 0.2, -0.18], [-0.24, 0.2, -0.2], [0.28, 0.18, 0.18], [-0.22, 0.2, 0.22], [0.02, 0.22, -0.32], [-0.36, 0.1, 0.0], [0.36, 0.1, -0.02]].forEach(([x, y, z], i) =>
    S(cap, 0.07 - (i % 3) * 0.01, 0.025, 0.07 - (i % 3) * 0.01, 0xffffff, x, y, z, GLOW(0xe1f5fe, 0.6)));
  cyl(cap, 0.1, 0.13, 0.14, 0xfff8e1, 0, -0.06, 0, {});
  return rig(g, root, {
    eyes, height: 1.0,
    tick(t, m) {
      const h = Math.abs(Math.sin(t * 5));
      const k = m + (1 - m) * 0.3;
      root.position.y = h * 0.22 * k;
      const sq = 1 - (1 - h) * 0.12 * k;
      body.scale.set(0.38 * (2 - sq), 0.28 * sq, 0.34 * (2 - sq));
      feet.forEach((f, i) => (f.rotation.x = -h * 0.6 * k));
      cap.rotation.z = 0.12 + Math.sin(t * 5) * 0.06 * k;
      eyeBumps.forEach((p, i) => (p.position.y = 0.52 + 0.02 * Math.sin(t * 3 + i)));
    },
  });
}

// Patchwork Imp：補丁布公仔小鬼 + 鈕扣眼
function patchworkImp() {
  const g = new THREE.Group();
  const root = pivot(g);
  const cols = [0xef9a9a, 0x90caf9, 0xa5d6a7, 0xffcc80, 0xce93d8];
  const cloth = 0xd7b899;
  const torso = pivot(root, 0, 0.42, 0);
  S(torso, 0.24, 0.24, 0.2, cloth, 0, 0, 0, { roughness: 0.85 }, { line: 0.05 });
  const patch = (parent, x, y, z, c, s = 0.1) => {
    const p = S(parent, s, s * 0.9, 0.02, c, x, y, z, { roughness: 0.9 });
    p.lookAt(p.position.clone().multiplyScalar(4).add(parent.position));
    return p;
  };
  patch(torso, 0.08, 0.06, -0.19, cols[1]);
  patch(torso, -0.1, -0.08, -0.18, cols[3], 0.08);
  // 線步
  const stitch = (parent, a, b, n = 5) => {
    for (let i = 0; i < n; i++) {
      const p = a.clone().lerp(b, (i + 0.5) / n);
      const s = add(parent, cached('stitch', () => new THREE.BoxGeometry(0.05, 0.012, 0.012)), 0x3e2723, {});
      s.position.copy(p);
      s.rotation.z = PI / 2 + 0.2;
    }
  };
  stitch(torso, V(0, 0.2, -0.2), V(0, -0.2, -0.2));
  const head = pivot(root, 0, 0.88, 0);
  S(head, 0.33, 0.3, 0.29, cols[0], 0, 0, 0, { roughness: 0.85 }, { line: 0.045 });
  patch(head, 0.18, 0.14, -0.2, cols[2], 0.11);
  stitch(head, V(-0.3, 0.05, -0.12), V(-0.05, 0.27, -0.16), 5);
  // 鈕扣眼（一粒大一粒細）
  const eyes = [[-0.12, 0.09, 0.085, 0x7c4dff], [0.12, 0.06, 0.07, 0x00bfa5]].map(([x, r, rr, c]) => {
    const e = pivot(head, x, 0.03, -0.27);
    const b = cyl(e, rr, rr, 0.04, c, 0, 0, 0, { roughness: 0.3 });
    b.rotation.x = PI / 2;
    outline(b, 0.1);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S(e, 0.012, 0.012, 0.01, 0x1a1020, dx * rr * 0.3, dy * rr * 0.3, -0.025, {}, { lo: true });
    S(e, rr * 0.25, rr * 0.25, 0.01, 0xffffff, rr * 0.45, rr * 0.45, -0.025, GLOW(0xffffff, 0.6), { lo: true });
    return e;
  });
  // 縫埋嘅笑口
  smile(head, 0, -0.13, -0.27, 0.12, 0x3e2723, {}, 2.4);
  for (let i = 0; i < 5; i++) {
    const a = PI + 0.5 + i * 0.53;
    add(head, cached('mstitch', () => new THREE.BoxGeometry(0.012, 0.05, 0.012)), 0x3e2723, {}, Math.cos(a) * 0.12, -0.13 + Math.sin(a) * 0.12, -0.28);
  }
  // 細角 + 布耳
  for (const s of [-1, 1]) {
    const h = cone(head, 0.05, 0.16, 0x8d6e63, s * 0.16, 0.3, 0, {});
    h.rotation.z = s * -0.4;
    outline(h, 0.08);
  }
  // 手腳（布）
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.1, 0.22, 0);
    limb(hip, V(0, 0, 0), V(0, -0.14, 0), 0.06, s < 0 ? cols[4] : cols[1], { roughness: 0.85 }, 0.06);
    S(hip, 0.08, 0.05, 0.1, 0x6d4c41, 0, -0.2, -0.02, {}, { line: 0.06 });
    return hip;
  });
  const arms = [-1, 1].map((s) => {
    const sh = pivot(root, s * 0.24, 0.52, 0);
    limb(sh, V(0, 0, 0), V(s * 0.08, -0.22, 0), 0.05, s < 0 ? cols[3] : cols[2], { roughness: 0.85 }, 0.06);
    S(sh, 0.06, 0.06, 0.06, cloth, s * 0.08, -0.27, 0, {}, { line: 0.06 });
    return sh;
  });
  // 尾（尖）
  const tail = pivot(root, 0, 0.3, 0.18);
  tube(tail, [V(0, 0, 0), V(0, -0.05, 0.15), V(0.08, 0.05, 0.28), V(0.06, 0.18, 0.32)], 0.025, 0x8d6e63, {});
  cone(tail, 0.06, 0.1, 0xff5252, 0.06, 0.22, 0.32, {}, 4);
  return rig(g, root, {
    eyes, height: 1.25,
    tick(t, m) {
      const s = Math.sin(t * 8) * 0.55 * m;
      legs[0].rotation.x = s;
      legs[1].rotation.x = -s;
      arms[0].rotation.x = -s + Math.sin(t * 2) * 0.1 * (1 - m);
      arms[1].rotation.x = s - Math.sin(t * 2) * 0.1 * (1 - m);
      root.position.y = Math.abs(Math.sin(t * 8)) * 0.05 * m;
      head.rotation.z = Math.sin(t * 1.7) * 0.12; // 布公仔歪頭
      tail.rotation.y = Math.sin(t * 3) * 0.4;
    },
  });
}

// Haunted Scorpio：半透明鬼蠍 + 發光尾針
function hauntedScorpio() {
  const g = new THREE.Group();
  const root = pivot(g);
  const ghost = GHOST(0x00bfa5, 0.8, 0.7);
  const core = 0x26a69a;
  const body = S(root, 0.3, 0.17, 0.36, core, 0, 0.26, 0.05, ghost, { line: 0.05 });
  S(root, 0.18, 0.09, 0.2, 0x00bfa5, 0, 0.27, 0.06, GLOW(0x00bfa5, 1.6));
  const head = pivot(root, 0, 0.32, -0.3);
  S(head, 0.24, 0.17, 0.2, core, 0, 0, 0, ghost, { line: 0.05 });
  const eyes = bigEyes(head, 0.1, 0.06, -0.15, 0.08, 0x00e5ff, { glow: true });
  smile(head, 0, -0.04, -0.19, 0.06, 0x004d40, {}, 2.2);
  // 鉗
  const claws = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.22, 0.26, -0.32);
    chain(p, [V(0, 0, 0), V(s * 0.15, 0.02, -0.12), V(s * 0.2, 0.04, -0.26)], 0.06, 0.05, core, 5, ghost);
    const pin = pivot(p, s * 0.2, 0.05, -0.32);
    S(pin, 0.1, 0.07, 0.12, core, 0, 0, 0, ghost);
    const top = pivot(pin, 0, 0.02, -0.06);
    cone(top, 0.045, 0.16, core, 0, 0, -0.06, GLOW(0x1de9b6, 1.4), 12).rotation.x = -PI / 2;
    cone(pin, 0.04, 0.14, core, s * -0.03, -0.03, -0.12, GLOW(0x1de9b6, 1.4), 12).rotation.x = -PI / 2;
    return { p, top };
  });
  // 腳（每邊 3 隻）
  const legs = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const hip = pivot(root, s * 0.24, 0.24, -0.1 + i * 0.14);
    tube(hip, [V(0, 0, 0), V(s * 0.14, 0.06, 0), V(s * 0.24, -0.14, 0)], 0.022, core, ghost, 8);
    legs.push({ hip, phase: i * 1.6 + (s > 0 ? PI : 0) });
  }
  // 尾（彎上嚟）+ 發光針
  const tail = pivot(root, 0, 0.3, 0.36);
  const segs = chain(tail, [V(0, 0, 0), V(0, 0.15, 0.14), V(0, 0.42, 0.14), V(0, 0.6, -0.02), V(0, 0.58, -0.18)], 0.09, 0.06, core, 7, ghost);
  const sting = pivot(tail, 0, 0.56, -0.2);
  S(sting, 0.08, 0.08, 0.08, 0xeeff41, 0, 0, 0, GLOW(0xc6ff00, 2.6));
  cone(sting, 0.04, 0.16, 0xeeff41, 0, -0.04, -0.08, GLOW(0xc6ff00, 2.6), 12).rotation.x = -2.2;
  return rig(g, root, {
    eyes, height: 1.15,
    tick(t, m) {
      for (const l of legs) l.hip.rotation.y = Math.sin(t * 12 + l.phase) * 0.35 * m;
      tail.rotation.x = Math.sin(t * 2) * 0.12;
      sting.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
      claws.forEach((c, i) => {
        c.top.rotation.x = -0.25 + Math.abs(Math.sin(t * 3 + i)) * 0.35;
        c.p.rotation.y = Math.sin(t * 1.5 + i) * 0.15;
      });
      body.material.opacity = 0.72 + Math.sin(t * 2) * 0.08;
    },
  });
}

// BloodBloom：食肉花怪（花瓣口 + 葉手 + 藤身），鬼鬼哋但唔恐怖
function bloodBloom() {
  const g = new THREE.Group();
  const root = pivot(g);
  const vine = 0x2e7d32;
  const petal = 0xc2185b;
  const petal2 = 0x880e4f;
  // 根做腳
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2;
    tube(root, [V(0, 0.18, 0), V(Math.cos(a) * 0.16, 0.06, Math.sin(a) * 0.16), V(Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3)], 0.04, 0x4e342e, {}, 8);
  }
  S(root, 0.2, 0.12, 0.2, 0x388e3c, 0, 0.18, 0, {}, { line: 0.05 });
  // 藤身（彎彎）
  const stem = pivot(root, 0, 0.2, 0);
  tube(stem, [V(0, 0, 0), V(0.06, 0.3, 0), V(-0.05, 0.6, 0), V(0, 0.85, 0)], 0.075, vine, {}, 20);
  // 葉手
  const arms = [-1, 1].map((s) => {
    const p = pivot(stem, s * 0.06, 0.45, 0);
    const lf = shape(p, LEAF, 0.025, 0x43a047, { side: THREE.DoubleSide }, { key: 'leaf' });
    lf.scale.set(s * 0.75, 0.75, 0.75);
    lf.rotation.y = s * -0.4;
    outline(lf, 0.06);
    return p;
  });
  // 花頭
  const head = pivot(stem, 0, 0.98, 0);
  const petals = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    const p = pivot(head, 0, 0, 0);
    p.rotation.z = a;
    const pt = S(p, 0.14, 0.24, 0.07, i % 2 ? petal : petal2, 0, 0.3, 0.05, {}, { line: 0.05 });
    pt.rotation.x = -0.35;
    petals.push(p);
  }
  S(head, 0.28, 0.27, 0.22, 0xe91e63, 0, 0, 0, {}, { line: 0.045 });
  // 花瓣口（張開、入面深紅 + 卡通牙）
  const jaw = pivot(head, 0, -0.08, -0.16);
  S(jaw, 0.17, 0.08, 0.05, 0x4a0016, 0, 0, 0);
  for (let i = 0; i < 5; i++) cone(jaw, 0.022, 0.05, 0xfffde7, -0.1 + i * 0.05, 0.06, -0.02, {}, 8).rotation.x = PI;
  for (let i = 0; i < 4; i++) cone(jaw, 0.02, 0.045, 0xfffde7, -0.075 + i * 0.05, -0.06, -0.02, {}, 8);
  const eyes = bigEyes(head, 0.1, 0.1, -0.18, 0.085, 0x76ff03, { glow: true });
  for (const s of [-1, 1]) S(head, 0.05, 0.03, 0.02, 0xff80ab, s * 0.19, 0.0, -0.17, { transparent: true, opacity: 0.6 });
  // 頭頂露珠
  const dew = S(head, 0.05, 0.06, 0.05, 0xff1744, 0, 0.3, -0.02, GLOW(0xff1744, 2));
  return rig(g, root, {
    eyes, height: 1.85,
    tick(t, m) {
      stem.rotation.z = Math.sin(t * 1.6) * 0.08 + Math.sin(t * 8) * 0.03 * m;
      head.rotation.z = -Math.sin(t * 1.6) * 0.06;
      arms[0].rotation.z = 0.3 + Math.sin(t * 2.2) * 0.25;
      arms[1].rotation.z = -0.3 - Math.sin(t * 2.2 + 1) * 0.25;
      jaw.scale.y = 1 + Math.max(0, Math.sin(t * 2.5)) * 0.6;
      petals.forEach((p, i) => (p.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.04)));
      dew.position.y = 0.3 + Math.sin(t * 3) * 0.02;
      root.position.y = Math.abs(Math.sin(t * 6)) * 0.04 * m;
    },
  });
}

// =============== 🏚️ Abandoned Manor ===============

// Mimic Chest：寶箱怪（眼 + 舌頭 + 蓋入面卡通牙 + 金邊）
function mimicChest() {
  const g = new THREE.Group();
  const root = pivot(g);
  const wood = 0x8d5a3b;
  const wood2 = 0x6d4430;
  const gold = 0xffc107;
  const metal = { metalness: 0.75, roughness: 0.25 };
  const W = 0.78;
  const D = 0.54;
  // 箱身
  const base = add(root, cached('chestBase', () => new THREE.BoxGeometry(W, 0.36, D, 2, 2, 2)), wood, { roughness: 0.6 }, 0, 0.32, 0);
  outline(base, 0.035);
  add(root, cached('chestIn', () => new THREE.BoxGeometry(W - 0.08, 0.02, D - 0.08)), 0x4a0e1c, {}, 0, 0.505, 0);
  for (const x of [-0.26, 0.26]) add(root, cached('band', () => new THREE.BoxGeometry(0.08, 0.38, D + 0.02)), gold, metal, x, 0.32, 0);
  // 下排牙
  for (let i = 0; i < 6; i++) cone(root, 0.035, 0.08, 0xfffde7, -0.28 + i * 0.112, 0.53, -D / 2 + 0.05, {}, 10);
  // 舌頭
  const tongue = pivot(root, 0, 0.5, -0.1);
  tube(tongue, [V(0, 0, 0.1), V(0, 0.02, -0.15), V(0, -0.08, -0.36), V(0, -0.22, -0.42)], 0.06, 0xff4f8b, {}, 14).scale.x = 1.6;
  // 蓋（圓頂）
  const lid = pivot(root, 0, 0.5, D / 2);
  const lidG = add(lid, cached('lid', () => {
    const geo = new THREE.CylinderGeometry(D / 2, D / 2, W, 24, 1, false, 0, PI);
    geo.rotateZ(PI / 2);
    return geo;
  }), wood2, { roughness: 0.6 }, 0, 0, -D / 2);
  outline(lidG, 0.035);
  for (const x of [-0.26, 0.26]) {
    const b = torus(lid, D / 2 + 0.01, 0.035, gold, x, 0, -D / 2, metal, PI);
    b.rotation.y = PI / 2;
  }
  for (let i = 0; i < 6; i++) cone(lid, 0.035, 0.08, 0xfffde7, -0.28 + i * 0.112, -0.03, -D + 0.05, {}, 10).rotation.x = PI;
  // 鎖 + 大眼（喺蓋前面）
  add(lid, cached('lock', () => new THREE.BoxGeometry(0.12, 0.13, 0.05)), gold, metal, 0, -0.03, -D - 0.01);
  const eyes = bigEyes(lid, 0.17, 0.17, -D + 0.02, 0.1, 0xffd600, { glow: true, slant: -0.15 });
  // 細腳
  const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => {
    const hip = pivot(root, sx * 0.28, 0.16, sz * 0.18);
    limb(hip, V(0, 0, 0), V(0, -0.08, 0), 0.045, wood2, {}, 0.06);
    S(hip, 0.06, 0.04, 0.07, gold, 0, -0.13, -0.01, metal);
    return { hip, phase: i % 3 ? PI : 0 };
  });
  return rig(g, root, {
    eyes, height: 1.0,
    tick(t, m) {
      const chomp = Math.max(0, Math.sin(t * (m ? 9 : 2.5)));
      lid.rotation.x = chomp * 0.65 + 0.1;
      tongue.rotation.x = -chomp * 0.3 + Math.sin(t * 6) * 0.1;
      root.position.y = Math.abs(Math.sin(t * 9)) * 0.08 * m;
      legSwing(legs, t, m, 12, 0.5);
      root.rotation.z = Math.sin(t * 9) * 0.04 * m;
    },
  });
}

// Crowshade：影子烏鴉 + 紫火翼（會飛）
function crowshade() {
  const g = new THREE.Group();
  const root = pivot(g);
  const ink = 0x1f1a2b;
  const ink2 = 0x2f2742;
  S(root, 0.26, 0.24, 0.3, ink, 0, 0.42, 0.05, {}, { line: 0.05 });
  S(root, 0.16, 0.16, 0.14, ink2, 0, 0.37, -0.15);
  const head = pivot(root, 0, 0.78, -0.1);
  S(head, 0.3, 0.28, 0.28, ink, 0, 0, 0, {}, { line: 0.045 });
  // 頭頂毛
  for (let i = 0; i < 3; i++) {
    const f = cone(head, 0.05, 0.18, ink2, -0.06 + i * 0.06, 0.28, 0.04 + i * 0.02, {}, 8);
    f.rotation.x = 0.5 + i * 0.15;
  }
  // 嘴（黃，兩片）
  const beak = pivot(head, 0, -0.06, -0.26);
  cone(beak, 0.07, 0.2, 0xffb300, 0, 0, -0.08, {}, 16).rotation.x = -PI / 2;
  const eyes = bigEyes(head, 0.12, 0.06, -0.2, 0.1, 0xd500f9, { glow: true, slant: -0.1 });
  // 紫火翼
  const wings = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.22, 0.5, 0.06);
    const w = shape(p, FLAME_WING, 0.03, 0xaa00ff, GHOST(0xd500f9, 0.85, 1.6), { key: 'flamewing' });
    w.scale.set(s * 0.6, 0.6, 0.6);
    const w2 = shape(p, FLAME_WING, 0.03, 0x311b92, {}, { key: 'flamewing' });
    w2.scale.set(s * 0.42, 0.42, 0.42);
    w2.position.z = 0.02;
    return p;
  });
  // 尾毛
  const tail = pivot(root, 0, 0.36, 0.32);
  for (let i = 0; i < 3; i++) {
    const f = S(tail, 0.07, 0.03, 0.2, i === 1 ? 0xaa00ff : ink2, (i - 1) * 0.08, 0, 0.12, i === 1 ? GLOW(0xaa00ff, 1) : {});
    f.rotation.y = (i - 1) * 0.3;
  }
  // 腳（收埋）
  for (const s of [-1, 1]) limb(root, V(s * 0.08, 0.2, 0), V(s * 0.09, 0.05, -0.02), 0.025, 0xffb300, {});
  return rig(g, root, {
    eyes, height: 1.0, move: 'fly',
    tick(t, m) {
      const f = Math.sin(t * (m ? 13 : 5));
      wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.25 + f * (m ? 0.6 : 0.3))));
      root.position.y = Math.sin(t * 2.4) * 0.05 + (m ? Math.abs(f) * 0.04 : 0);
      head.rotation.y = Math.sin(t * 0.9) * 0.3 * (1 - m);
      tail.rotation.x = Math.sin(t * 3) * 0.15;
      beak.rotation.x = Math.max(0, Math.sin(t * 1.3)) ** 8 * -0.3;
    },
  });
}

// Hexed Pumpkin：戴巫師帽、藤做腳嘅南瓜燈
function hexedPumpkin() {
  const g = new THREE.Group();
  const root = pivot(g);
  const body = pumpkin(root, 0.42, 0xff8f00, 0, 0.62, 0, GLOW(0xff6d00, 0.12), { line: 0.035 });
  carvedFace(body, 0.42, 0.04, -0.4, 0xffd740);
  const hat = witchHat(body, 0.28, 0x311b92, 0x76ff03, -0.04, 0.3, 0.02);
  hat.rotation.z = 0.2;
  // 藤腳（4 條捲捲）
  const legs = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    const hip = pivot(root, Math.cos(a) * 0.2, 0.32, Math.sin(a) * 0.2);
    tube(hip, [V(0, 0, 0), V(Math.cos(a) * 0.1, -0.14, Math.sin(a) * 0.1), V(Math.cos(a) * 0.14, -0.3, Math.sin(a) * 0.14), V(Math.cos(a) * 0.24, -0.3, Math.sin(a) * 0.24)], 0.035, 0x558b2f, {}, 12);
    S(hip, 0.06, 0.03, 0.06, 0x7cb342, Math.cos(a) * 0.26, -0.3, Math.sin(a) * 0.26);
    legs.push({ hip, phase: i * PI * 0.5 });
  }
  // 葉手
  const arms = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.36, 0.55, 0);
    tube(p, [V(0, 0, 0), V(s * 0.12, -0.04, -0.04), V(s * 0.2, 0.05, -0.06)], 0.025, 0x558b2f, {}, 8);
    const lf = shape(p, LEAF, 0.02, 0x7cb342, { side: THREE.DoubleSide }, { key: 'leaf' });
    lf.scale.set(s * 0.3, 0.3, 0.3);
    lf.position.set(s * 0.2, 0.05, -0.06);
    return p;
  });
  // 綠色魔法火花
  const sparks = [0, 1, 2, 3].map(() => S(root, 0.03, 0.03, 0.03, 0x76ff03, 0, 0, 0, GLOW(0x76ff03, 3), { lo: true }));
  return rig(g, root, {
    eyes: [], height: 1.35,
    tick(t, m) {
      for (const l of legs) l.hip.rotation.z = Math.sin(t * 9 + l.phase) * 0.3 * m;
      body.position.y = 0.62 + Math.abs(Math.sin(t * 9)) * 0.05 * m + Math.sin(t * 2) * 0.02;
      body.rotation.z = Math.sin(t * 1.4) * 0.06;
      arms[0].rotation.z = Math.sin(t * 3) * 0.3;
      arms[1].rotation.z = -Math.sin(t * 3 + 1) * 0.3;
      hat.rotation.x = Math.sin(t * 2) * 0.06;
      sparks.forEach((s, i) => {
        const a = t * 1.5 + (i / 4) * PI * 2;
        s.position.set(Math.cos(a) * 0.55, 0.7 + Math.sin(t * 3 + i) * 0.2, Math.sin(a) * 0.55);
      });
    },
  });
}

// Werewolf：Q 版狼人 + 大大個月光銀鬃毛
function werewolf() {
  const g = new THREE.Group();
  const root = pivot(g);
  const fur = 0x6d5f73;
  const fur2 = 0x9a8aa0;
  const silver = 0xe3e8f5;
  const torso = pivot(root, 0, 0.62, 0);
  S(torso, 0.28, 0.3, 0.24, fur, 0, 0, 0, {}, { line: 0.045 });
  S(torso, 0.18, 0.2, 0.1, fur2, 0, -0.04, -0.18);
  // 銀鬃毛（一圈）
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * PI * 2;
    const s = S(torso, 0.15, 0.13, 0.12, silver, Math.cos(a) * 0.24, 0.27 + Math.sin(a * 2) * 0.02, Math.sin(a) * 0.2 + 0.03, GLOW(0xb3e5fc, 0.25), { line: 0.06 });
    s.rotation.y = -a;
  }
  const head = pivot(root, 0, 1.12, -0.04);
  S(head, 0.31, 0.29, 0.28, fur, 0, 0, 0, {}, { line: 0.045 });
  const snout = S(head, 0.15, 0.11, 0.15, fur2, 0, -0.08, -0.24, {}, { line: 0.06 });
  S(head, 0.06, 0.045, 0.04, 0x1a1020, 0, -0.03, -0.38);
  const jaw = pivot(head, 0, -0.16, -0.22);
  S(jaw, 0.11, 0.04, 0.1, fur2, 0, 0, -0.02);
  for (const s of [-1, 1]) cone(head, 0.02, 0.06, 0xffffff, s * 0.06, -0.17, -0.33, {}, 8).rotation.x = PI;
  for (const s of [-1, 1]) {
    const ear = pivot(head, s * 0.18, 0.24, 0.02);
    ear.rotation.z = s * -0.3;
    outline(cone(ear, 0.1, 0.26, fur, 0, 0.1, 0, {}), 0.06);
    cone(ear, 0.055, 0.15, 0xf8bbd0, 0, 0.07, -0.04, {});
  }
  const eyes = bigEyes(head, 0.12, 0.06, -0.2, 0.09, 0xffc400, { glow: true, slant: -0.18 });
  // 額頭銀毛
  S(head, 0.13, 0.07, 0.1, silver, 0, 0.22, -0.12, GLOW(0xb3e5fc, 0.25));
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.14, 0.34, 0);
    limb(hip, V(0, 0, 0), V(0, -0.18, 0.02), 0.085, fur, {}, 0.05);
    S(hip, 0.1, 0.06, 0.14, fur2, 0, -0.27, -0.04, {}, { line: 0.06 });
    return hip;
  });
  const arms = [-1, 1].map((s) => {
    const sh = pivot(root, s * 0.32, 0.8, 0);
    limb(sh, V(0, 0, 0), V(s * 0.04, -0.28, -0.02), 0.08, fur, {}, 0.05);
    S(sh, 0.09, 0.09, 0.09, fur2, s * 0.04, -0.35, -0.02, {}, { line: 0.06 });
    for (let k = 0; k < 3; k++) cone(sh, 0.018, 0.06, 0xfafafa, s * 0.04 + (k - 1) * 0.04, -0.43, -0.07, {}, 8).rotation.x = PI + 0.4;
    return sh;
  });
  // 尾（蓬鬆）
  const tail = pivot(root, 0, 0.5, 0.22);
  chain(tail, [V(0, 0, 0), V(0, 0.06, 0.15), V(0.02, 0.2, 0.26)], 0.08, 0.11, fur2, 6);
  S(tail, 0.08, 0.08, 0.08, silver, 0.02, 0.28, 0.28, GLOW(0xb3e5fc, 0.25));
  return rig(g, root, {
    eyes, height: 1.75,
    tick(t, m) {
      const s = Math.sin(t * 8) * 0.55 * m;
      legs[0].rotation.x = s;
      legs[1].rotation.x = -s;
      const howl = Math.max(0, Math.sin(t * 0.5)) ** 12 * (1 - m); // 間唔中仰頭嚎
      arms[0].rotation.x = -s * 0.8 - howl * 0.5;
      arms[1].rotation.x = s * 0.8 - howl * 0.5;
      head.rotation.x = -howl * 0.7;
      jaw.rotation.x = howl * 0.6;
      root.position.y = Math.abs(Math.sin(t * 8)) * 0.05 * m;
      tail.rotation.y = Math.sin(t * 4) * 0.35;
    },
  });
}

// Abomination Kong：縫補大猩猩 + 發光綠色心
function abominationKong() {
  const g = new THREE.Group();
  const root = pivot(g);
  const fur = 0x4e4560;
  const skin = 0x8a7f9c;
  const torso = pivot(root, 0, 0.72, 0);
  S(torso, 0.4, 0.36, 0.32, fur, 0, 0, 0, {}, { line: 0.04 });
  S(torso, 0.28, 0.26, 0.12, skin, 0, -0.02, -0.24);
  // 發光心 + 縫線
  const heart = pivot(torso, 0.05, 0.05, -0.36);
  for (const s of [-1, 1]) S(heart, 0.07, 0.07, 0.05, 0x00c853, s * 0.05, 0.02, 0, GLOW(0x00c853, 1.3));
  const ht = cone(heart, 0.098, 0.12, 0x00c853, 0, -0.06, 0, GLOW(0x00c853, 1.3), 16);
  ht.rotation.x = PI;
  ht.scale.z = 0.5;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    const st = add(torso, cached('kStitch', () => new THREE.BoxGeometry(0.06, 0.015, 0.015)), 0x1a1020, {});
    st.position.set(0.05 + Math.cos(a) * 0.15, 0.03 + Math.sin(a) * 0.15, -0.35);
    st.rotation.z = a + PI / 2;
  }
  const head = pivot(root, 0, 1.22, -0.08);
  S(head, 0.3, 0.27, 0.27, fur, 0, 0, 0, {}, { line: 0.045 });
  S(head, 0.22, 0.15, 0.12, skin, 0, -0.06, -0.21);
  S(head, 0.26, 0.06, 0.1, fur, 0, 0.12, -0.2); // 眉骨
  S(head, 0.04, 0.025, 0.02, 0x1a1020, -0.04, -0.03, -0.32);
  S(head, 0.04, 0.025, 0.02, 0x1a1020, 0.04, -0.03, -0.32);
  smile(head, 0, -0.12, -0.31, 0.07, 0x1a1020, {}, 2.2);
  // 一隻大眼一隻細眼
  const eyes = [
    ...bigEyes(head, 0.11, 0.04, -0.27, 0.09, 0xd500f9, { glow: true }).slice(0, 1),
    ...bigEyes(head, 0.11, 0.05, -0.27, 0.065, 0x00e676, { glow: true }).slice(1),
  ];
  // 頭頂縫線 + 頸螺絲
  for (let i = 0; i < 5; i++) {
    const st = add(head, cached('kStitch2', () => new THREE.BoxGeometry(0.015, 0.06, 0.015)), 0x1a1020, {});
    st.position.set(-0.15 + i * 0.07, 0.24, -0.08);
  }
  for (const s of [-1, 1]) {
    const b = cyl(root, 0.035, 0.035, 0.16, 0xbdbdbd, s * 0.24, 1.08, 0, { metalness: 0.8, roughness: 0.25 }, 12);
    b.rotation.z = PI / 2;
    S(root, 0.045, 0.045, 0.045, 0x9e9e9e, s * 0.32, 1.08, 0, { metalness: 0.8, roughness: 0.25 });
  }
  // 大手（落地）+ 短腳
  const arms = [-1, 1].map((s) => {
    const sh = pivot(root, s * 0.44, 0.96, 0);
    limb(sh, V(0, 0, 0), V(s * 0.08, -0.5, -0.06), 0.13, fur, {}, 0.04);
    S(sh, 0.16, 0.13, 0.17, skin, s * 0.08, -0.66, -0.07, {}, { line: 0.05 });
    if (s > 0) limb(sh, V(s * 0.05, -0.2, -0.1), V(s * 0.12, -0.28, -0.12), 0.012, 0x1a1020, {});
    return sh;
  });
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.18, 0.36, 0.05);
    limb(hip, V(0, 0, 0), V(0, -0.18, 0), 0.1, fur, {}, 0.05);
    S(hip, 0.12, 0.07, 0.16, skin, 0, -0.29, -0.03, {}, { line: 0.05 });
    return hip;
  });
  return rig(g, root, {
    eyes, height: 2.0,
    tick(t, m) {
      const s = Math.sin(t * 6) * 0.4 * m;
      legs[0].rotation.x = s;
      legs[1].rotation.x = -s;
      const beat = (1 - m) * (Math.max(0, Math.sin(t * 0.8)) ** 6);
      const drum = Math.sin(t * 22) * beat;
      arms[0].rotation.x = -s + -1.2 * beat + drum * 0.3;
      arms[1].rotation.x = s + -1.2 * beat - drum * 0.3;
      arms[0].rotation.z = beat * 0.6;
      arms[1].rotation.z = -beat * 0.6;
      heart.scale.setScalar(1 + Math.max(0, Math.sin(t * 6)) ** 4 * 0.25);
      root.position.y = Math.abs(Math.sin(t * 6)) * 0.05 * m;
      torso.rotation.x = 0.1 * m;
    },
  });
}

// Voidseer Pumpkin（Eternal）：宇宙南瓜 + 一隻巨眼 + 浮空水晶皇冠 + 光環 + 星環
function voidseerPumpkin() {
  const g = new THREE.Group();
  const root = pivot(g);
  const tex = galaxy();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.95, roughness: 0.25, metalness: 0.1 });
  const body = pivot(root, 0, 1.0, 0);
  const pk = add(body, pumpkinGeo(10, 0.1), 0, skinMat);
  pk.scale.setScalar(0.78);
  outline(pk, 0.03);
  // 一隻巨眼
  const eye = pivot(body, 0, 0.02, -0.62);
  eye.scale.setScalar(1.25);
  S(eye, 0.3, 0.3, 0.14, 0x05010d, 0, 0, 0.02, { roughness: 1 });
  S(eye, 0.26, 0.26, 0.15, 0xffffff, 0, 0, 0, { roughness: 0.1 }, { line: 0.05 });
  const iris = S(eye, 0.18, 0.18, 0.08, 0x00e5ff, 0, -0.01, -0.09, { roughness: 0.1, ...GLOW(0x00b8d4, 1.6) });
  S(eye, 0.09, 0.12, 0.05, 0x0a0018, 0, -0.01, -0.15, { roughness: 0.05 });
  torus(eye, 0.15, 0.012, 0xea80fc, 0, -0.01, -0.13, GLOW(0xea80fc, 2.4));
  S(eye, 0.06, 0.06, 0.02, 0xffffff, 0.08, 0.09, -0.17, GLOW(0xffffff, 1.2));
  S(eye, 0.03, 0.03, 0.02, 0xffffff, -0.08, -0.08, -0.17, GLOW(0xffffff, 1.2));
  // 莖 + 發光葉
  const stem = tube(body, [V(0, 0.48, 0), V(0.03, 0.62, 0.02), V(0.14, 0.7, 0.05)], 0.06, 0x4a148c, GLOW(0x7c4dff, 0.5));
  const leaf = shape(body, LEAF, 0.02, 0x00e5ff, GLOW(0x00e5ff, 1.6), { x: 0.07, y: 0.6, z: 0.02, key: 'leaf' });
  leaf.scale.setScalar(0.45);
  leaf.rotation.set(0.4, 0.3, 0.4);
  // 浮空水晶皇冠
  const crown = pivot(body, 0, 0.95, 0);
  const crystals = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2;
    const c = add(crown, cached('crystal', () => new THREE.OctahedronGeometry(1, 0)), 0, { color: i % 2 ? 0xea80fc : 0x80d8ff, ...GLOW(i % 2 ? 0xd500f9 : 0x00b8d4, 1.4), roughness: 0.15, metalness: 0.2, flatShading: true });
    c.scale.set(0.06, i === 0 ? 0.2 : 0.13, 0.06);
    c.position.set(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24);
    crystals.push(c);
  }
  const halo = torus(body, 0.3, 0.025, 0xffd740, 0, 1.22, 0, GLOW(0xffd740, 2.4));
  halo.rotation.x = PI / 2;
  // 兩個星環
  const rings = [0.98, 1.1].map((r, i) => {
    const p = pivot(body, 0, 0, 0);
    p.rotation.set(1.25 + i * 0.35, 0.3 - i * 0.6, 0);
    torus(p, r, 0.016, i ? 0xea80fc : 0x80d8ff, 0, 0, 0, GHOST(i ? 0xd500f9 : 0x00e5ff, 0.75, 2));
    S(p, 0.04, 0.04, 0.04, 0xffffff, r, 0, 0, GLOW(0xffffff, 2.5), { lo: true });
    return p;
  });
  // 閃粉
  const motes = Array.from({ length: 10 }, (_, i) => S(root, 0.025, 0.025, 0.025, i % 2 ? 0xea80fc : 0x80d8ff, 0, 0, 0, GLOW(i % 2 ? 0xea80fc : 0x80d8ff, 3), { lo: true }));
  // 細細團星雲做「身」托住
  const mist = S(root, 0.32, 0.12, 0.32, 0x7c4dff, 0, 0.32, 0, GHOST(0x7c4dff, 0.35, 1.4));
  return rig(g, root, {
    eyes: [], height: 2.15,
    tick(t, m) {
      body.position.y = 1.0 + Math.sin(t * 1.6) * 0.07;
      body.rotation.y = Math.sin(t * 0.5) * 0.15;
      body.rotation.x = m * 0.12;
      crown.rotation.y = t * 0.8;
      crystals.forEach((c, i) => (c.position.y = Math.sin(t * 2 + i) * 0.04));
      halo.position.y = 1.22 + Math.sin(t * 2) * 0.02;
      rings[0].rotation.z = t * 0.6;
      rings[1].rotation.z = -t * 0.45;
      const b = blinkAt(t, 5);
      eye.scale.y = 1.25 * b;
      iris.position.x = Math.sin(t * 0.7) * 0.04;
      motes.forEach((s, i) => {
        const a = t * (0.5 + i * 0.05) + i * 1.3;
        s.position.set(Math.cos(a) * (0.7 + (i % 3) * 0.12), 0.6 + ((t * 0.3 + i * 0.17) % 1) * 1.1, Math.sin(a) * (0.7 + (i % 3) * 0.12));
      });
      mist.scale.set(0.32 + Math.sin(t * 2) * 0.03, 0.12, 0.32 + Math.cos(t * 2) * 0.03);
      stem.rotation.z = Math.sin(t * 1.5) * 0.05;
    },
  });
}

export const HALLOWEEN_MODELS = {
  Whiskers: whiskers,
  Jesterpop: jesterpop,
  Candlefang: candlefang,
  'Spirit Knight': spiritKnight,
  'Graveyard Brute': graveyardBrute,
  'Ghost Reaper': ghostReaper,
  'Hooded Gerbil': hoodedGerbil,
  Toadstool: toadstool,
  'Patchwork Imp': patchworkImp,
  'Haunted Scorpio': hauntedScorpio,
  BloodBloom: bloodBloom,
  'Mimic Chest': mimicChest,
  Crowshade: crowshade,
  'Hexed Pumpkin': hexedPumpkin,
  Werewolf: werewolf,
  'Abomination Kong': abominationKong,
  'Voidseer Pumpkin': voidseerPumpkin,
};
