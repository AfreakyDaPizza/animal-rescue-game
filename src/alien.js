// 🛸 Alien Mothership（Issue #21，小朋友 2026-11-09）
// 1. 跑步機／學生桌 Lv18：紫色外星機身 + 螢光綠電路、前面一道有尖角嘅外星大門（綠色發光核心）、
//    兩邊外星柱、頭頂一隻細飛碟照綠光落嚟（參考小朋友貼嘅圖：紫色 + 螢光綠）
// 2. 繁殖機 Lv7：部機上面浮住一隻大母艦（轉緊嘅燈、綠色牽引光照落玻璃罩），玻璃罩變綠色六角格 + 入面有光
// 3. 地塊 Lv12 Futuristic：未來感圍欄柱（發光燈條）、全息光環（plotFuture）

import * as THREE from 'three';

const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...extra });
const glowMat = (color, intensity = 2) => M(color, { emissive: color, emissiveIntensity: intensity * 0.5 }); // bloom 好勁：一半就夠
const additive = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const PURPLE = 0x6a1b9a;
const GREEN = 0x76ff03;

function add(group, geometry, material, x, y, z, shadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  group.add(mesh);
  return mesh;
}

// ---- 紋理：紫色機身 + 螢光綠電路線 ----
let alienTex = null;
export function alienTexture() {
  if (alienTex) return alienTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3a0f5c';
  g.fillRect(0, 0, 128, 128);
  // 面板
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = (x + y) % 2 ? '#4a1572' : '#3f1265';
    g.fillRect(x * 32 + 2, y * 32 + 2, 28, 28);
  }
  // 電路線（發光）
  g.strokeStyle = '#76ff03';
  g.lineWidth = 3;
  let s = 5;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 9; i++) {
    let x = Math.floor(r() * 8) * 16 + 8;
    let y = Math.floor(r() * 8) * 16 + 8;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      if (k % 2) x += (r() < 0.5 ? -1 : 1) * 16;
      else y += (r() < 0.5 ? -1 : 1) * 16;
      g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#ccff90';
    g.fillRect(x - 3, y - 3, 6, 6);
  }
  alienTex = new THREE.CanvasTexture(c);
  alienTex.colorSpace = THREE.SRGBColorSpace;
  alienTex.wrapS = alienTex.wrapT = THREE.RepeatWrapping;
  alienTex.magFilter = THREE.NearestFilter;
  return alienTex;
}

// 細飛碟（跑步機頭頂、繁殖機上面嘅大母艦都用；s = 大細）
export function buildSaucer(s = 1) {
  const g = new THREE.Group();
  const hull = M(0x9e9eb8, { metalness: 0.9, roughness: 0.25 });
  const purple = M(PURPLE, { metalness: 0.6, roughness: 0.3, emissive: 0x2a0845, emissiveIntensity: 0.6 });
  const body = add(g, new THREE.SphereGeometry(2.2 * s, 32, 12), hull, 0, 0, 0);
  body.scale.y = 0.26;
  add(g, new THREE.CylinderGeometry(1.5 * s, 2.25 * s, 0.35 * s, 32), purple, 0, -0.32 * s, 0);
  const rim = add(g, new THREE.TorusGeometry(2.2 * s, 0.1 * s, 8, 48), glowMat(GREEN, 1.6), 0, 0, 0, false);
  rim.rotation.x = Math.PI / 2;
  // 玻璃頂 + 入面一個細細嘅綠色外星人頭（友善款）
  const dome = add(g, new THREE.SphereGeometry(0.95 * s, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(0xb2ff59, { transparent: true, opacity: 0.45, roughness: 0.05, emissive: 0x33691e, emissiveIntensity: 0.6 }), 0, 0.3 * s, 0, false);
  dome.renderOrder = 2;
  add(g, new THREE.SphereGeometry(0.32 * s, 16, 12), M(0x8bc34a), 0, 0.55 * s, 0, false).scale.set(1, 1.2, 1);
  for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.09 * s, 8, 6), M(0x111111), sx * 0.13 * s, 0.62 * s, -0.27 * s, false).scale.set(1, 1.5, 0.6);
  // 一圈閃燈
  const lights = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    lights.push(add(g, new THREE.SphereGeometry(0.13 * s, 8, 6), glowMat(k % 2 ? GREEN : 0xea80fc, 2.5), Math.cos(a) * 1.85 * s, -0.12 * s, Math.sin(a) * 1.85 * s, false));
  }
  // 牽引光（圓錐，頂喺飛碟底）
  const beam = add(g, new THREE.CylinderGeometry(0.6 * s, 1.6 * s, 1, 24, 1, true), additive(GREEN, 0.18), 0, 0, 0, false);
  g.userData = { lights, beam, s };
  return g;
}
// 飛碟郁：轉、閃燈、牽引光（beamLen：照落幾長）
export function animateSaucer(saucer, time, beamLen) {
  const { lights, beam, s } = saucer.userData;
  saucer.rotation.y = time * 0.8;
  lights.forEach((l, k) => l.scale.setScalar(0.6 + 0.7 * Math.abs(Math.sin(time * 5 + k * 0.7))));
  beam.scale.y = beamLen;
  beam.position.y = -0.4 * s - beamLen / 2;
  beam.material.opacity = 0.14 + 0.07 * Math.sin(time * 4);
}

// ================= 1. 跑步機／學生桌 Lv18 =================
// 2026-11-13 小朋友話舊款（方塊疊嘅尖角門）「very ugly」，叫我哋改形狀 + 加裝飾：
//  - 後面大門：兩條順滑彎曲嘅外星骨（Tube）+ 綠色發光接縫 + 一圈圈光環，向外仲有彎角
//  - 螢幕／黑板：外星尖角框（上下有尖、兩邊尖耳）+ 綠色霓虹外框 + 兩支天線
//  - 跑步機前面摩打蓋：變成太空艙（圓殼 + 三粒發光眼 + 後掠尾翼）；兩邊有太空船尾翼
//  - 學生桌：枱兩邊尾翼、櫈背變外星盾形
// kind：'treadmill' 或 'table'（螢幕位置唔同）

const tube = (pts, r, seg = 48) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 10);
const Z = new THREE.Vector3(0, 0, 1);

// 外星螢幕框形狀（w × h，中間開個洞；上下有尖、兩邊尖耳）
function bezelShape(w, h, peak = 0.38) {
  const W = w / 2;
  const H = h / 2;
  const sh = new THREE.Shape();
  sh.moveTo(-W - 0.45, 0);
  sh.lineTo(-W, H);
  sh.lineTo(-0.7, H);
  sh.lineTo(0, H + peak);
  sh.lineTo(0.7, H);
  sh.lineTo(W, H);
  sh.lineTo(W + 0.45, 0);
  sh.lineTo(W, -H);
  sh.lineTo(0.55, -H);
  sh.lineTo(0, -H - peak * 0.8);
  sh.lineTo(-0.55, -H);
  sh.lineTo(-W, -H);
  sh.closePath();
  return sh;
}
function holePath(w, h, r = 0.12) {
  const W = w / 2;
  const H = h / 2;
  const p = new THREE.Path();
  p.moveTo(-W + r, -H);
  p.lineTo(W - r, -H);
  p.absarc(W - r, -H + r, r, -Math.PI / 2, 0, false);
  p.lineTo(W, H - r);
  p.absarc(W - r, H - r, r, 0, Math.PI / 2, false);
  p.lineTo(-W + r, H);
  p.absarc(-W + r, H - r, r, Math.PI / 2, Math.PI, false);
  p.lineTo(-W, -H + r);
  p.absarc(-W + r, -H + r, r, Math.PI, Math.PI * 1.5, false);
  return p;
}

// 螢幕框：cx, cy, z（框背面）；w/h 外框；hw/hh 個洞
function buildBezel(group, mats, { cy, z, w, h, hw, hh }) {
  const sh = bezelShape(w, h);
  sh.holes.push(holePath(hw, hh));
  const frame = add(group, new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 6 }), mats.chrome, 0, cy, z);
  // 霓虹外框：大少少嘅同一個形，擺喺後面 → 外圍一條綠光
  const glowSh = bezelShape(w + 0.22, h + 0.22, 0.5);
  glowSh.holes.push(holePath(w - 0.3, h - 0.3));
  add(group, new THREE.ExtrudeGeometry(glowSh, { depth: 0.06, bevelEnabled: false }), mats.green, 0, cy, z + 0.02, false);
  // 洞邊一圈幼紫光
  const inner = new THREE.Shape(holePath(hw + 0.12, hh + 0.12).getPoints(24));
  inner.holes.push(holePath(hw, hh));
  add(group, new THREE.ExtrudeGeometry(inner, { depth: 0.02, bevelEnabled: false }), mats.pink, 0, cy, z + 0.26, false);
  // 頂尖一粒綠寶石 + 兩支彎天線（頭有發光波波）
  const gem = add(group, new THREE.OctahedronGeometry(0.2), mats.green, 0, cy + h / 2 + 0.2, z + 0.2, false);
  gem.scale.set(1, 1.5, 0.6);
  const tips = [];
  for (const s of [-1, 1]) {
    const x0 = s * (w / 2 - 0.35);
    add(group, tube([[x0, cy + h / 2, z + 0.1], [x0 + s * 0.15, cy + h / 2 + 0.55, z + 0.1], [x0 + s * 0.55, cy + h / 2 + 0.95, z + 0.05]], 0.05, 16), mats.chrome, 0, 0, 0);
    tips.push(add(group, new THREE.SphereGeometry(0.12, 12, 8), mats.green, x0 + s * 0.55, cy + h / 2 + 0.98, z + 0.05, false));
    // 兩邊尖耳上面三條發光坑
    for (let k = 0; k < 3; k++) add(group, new THREE.BoxGeometry(0.28 - k * 0.06, 0.05, 0.04), mats.green, s * (w / 2 + 0.05 - k * 0.04), cy + 0.22 - k * 0.22, z + 0.25, false);
  }
  return { frame, gem, tips };
}

// 太空船尾翼（喺 YZ 平面）：x 位置、底部 y、由 z 開始向後（+z）伸 len
function buildFin(group, mats, x, y, z, len = 1.4, hgt = 1.0) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.lineTo(len, 0);
  sh.quadraticCurveTo(len * 0.55, hgt * 0.35, len * 0.15, hgt);
  sh.lineTo(0, hgt * 0.4);
  sh.closePath();
  const fin = add(group, new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }), mats.hull, x - 0.04, y, z);
  fin.rotation.y = -Math.PI / 2; // shape 嘅 x → 世界 +z
  // 尾翼邊一條綠光
  const edge = add(group, tube([[x, y + 0.05, z + len], [x, y + hgt * 0.4, z + len * 0.55], [x, y + hgt, z + len * 0.15]], 0.035, 12), mats.green, 0, 0, 0, false);
  return [fin, edge];
}

export function buildAlienTier(group, kind = 'treadmill') {
  const hull = M(0xffffff, { map: alienTexture(), emissiveMap: alienTexture(), emissive: 0xffffff, emissiveIntensity: 0.25, metalness: 0.4, roughness: 0.35 });
  const chrome = M(0x8e24aa, { metalness: 0.6, roughness: 0.25, emissive: 0x4a148c, emissiveIntensity: 0.55 });
  const silver = M(0xcfd8dc, { metalness: 0.95, roughness: 0.15 });
  const green = glowMat(GREEN, 2);
  const pink = glowMat(0xea80fc, 1.6);
  const mats = { hull, chrome, silver, green, pink };
  const GZ = -3.6;

  // ---- 後面大門：兩條順滑外星骨 ----
  const rings = [];
  for (const s of [-1, 1]) {
    const main = [[s * 3.2, 0, GZ], [s * 3.55, 2.4, GZ], [s * 3.05, 5.0, GZ], [s * 1.75, 6.9, GZ], [s * 0.7, 7.45, GZ]];
    add(group, tube(main, 0.3), chrome, 0, 0, 0);
    // 內側綠色接縫
    add(group, tube(main.map(([x, y, z]) => [x * 0.9, y - 0.05, z + 0.24]), 0.06), green, 0, 0, 0, false);
    // 一圈圈光環（跟住條骨嘅方向）
    const curve = new THREE.CatmullRomCurve3(main.map((p) => new THREE.Vector3(...p)));
    for (const t of [0.18, 0.4, 0.62, 0.82]) {
      const r = add(group, new THREE.TorusGeometry(0.38, 0.06, 8, 20), t === 0.4 ? pink : green, 0, 0, 0, false);
      r.position.copy(curve.getPointAt(t));
      r.quaternion.setFromUnitVectors(Z, curve.getTangentAt(t));
      rings.push(r);
    }
    // 外面彎角（似甲蟲角），頭有銀色尖
    const horn = [[s * 3.45, 3.0, GZ - 0.05], [s * 4.4, 4.2, GZ - 0.15], [s * 4.75, 5.9, GZ - 0.25], [s * 4.3, 7.1, GZ - 0.3]];
    add(group, tube(horn, 0.17), chrome, 0, 0, 0);
    const tip = add(group, new THREE.ConeGeometry(0.17, 0.7, 10), silver, s * 4.1, 7.5, GZ - 0.3);
    tip.rotation.z = s * 0.5;
    // 腳：銀色爪
    const foot = add(group, new THREE.CylinderGeometry(0.42, 0.6, 0.35, 8), silver, s * 3.2, 0.17, GZ);
    foot.castShadow = false;
  }
  // 門頂綠色蛋形核心 + 銀框 + 兩邊細翼
  const core = add(group, new THREE.SphereGeometry(0.85, 24, 16), glowMat(GREEN, 2.2), 0, 7.6, GZ + 0.1, false);
  core.scale.set(0.8, 1.15, 0.4);
  const coreFrame = add(group, new THREE.TorusGeometry(0.95, 0.16, 10, 32), silver, 0, 7.6, GZ + 0.15);
  coreFrame.scale.set(0.85, 1.2, 1);
  for (const s of [-1, 1]) {
    const w = add(group, new THREE.ConeGeometry(0.22, 1.3, 4), chrome, s * 1.15, 8.3, GZ + 0.1);
    w.rotation.z = -s * 0.9;
  }

  // ---- 螢幕框（跑步機：短片；學生桌：黑板）----
  const bezel = kind === 'table'
    ? buildBezel(group, mats, { cy: 2.35, z: -1.64, w: 4.1, h: 2.6, hw: 3.56, hh: 2.06 })
    : buildBezel(group, mats, { cy: 3.35, z: -2.86, w: 3.75, h: 2.45, hw: 3.24, hh: 1.9 });

  // ---- 機身裝飾 ----
  const eyes = [];
  if (kind === 'table') {
    // 枱兩邊尾翼（向前伸）+ 櫈背外星盾
    // 書枱兩邊：細細嘅銀色尾翼（喺櫃桶外面，唔擋張枱）
    for (const s of [-1, 1]) buildFin(group, mats, s * 1.5, 0.05, -0.55, 0.9, 0.7);
    const shield = new THREE.Shape();
    shield.moveTo(-0.55, 0);
    shield.lineTo(0.55, 0);
    shield.lineTo(0.6, 0.75);
    shield.lineTo(0, 1.35);
    shield.lineTo(-0.6, 0.75);
    shield.closePath();
    add(group, new THREE.ExtrudeGeometry(shield, { depth: 0.1, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1 }), chrome, 0, 0.6, 1.8);
    eyes.push(add(group, new THREE.SphereGeometry(0.13, 12, 8), green, 0, 1.45, 1.94, false));
    // 枱面前邊一條綠光
    add(group, new THREE.BoxGeometry(2.9, 0.05, 0.05), green, 0, 1.0, 0.73, false);
  } else {
    // 摩打蓋 → 太空艙：圓殼 + 三粒發光眼 + 銀色護邊 + 後掠尾翼
    const pod = add(group, new THREE.SphereGeometry(1, 32, 16), hull, 0, 0.42, -2.85);
    pod.scale.set(1.78, 0.68, 0.72);
    const band = add(group, new THREE.TorusGeometry(1, 0.06, 8, 40), silver, 0, 0.42, -2.85, false);
    band.scale.set(1.8, 0.74, 1);
    band.rotation.x = Math.PI / 2;
    for (let k = -1; k <= 1; k++) {
      const e = add(group, new THREE.SphereGeometry(0.16, 14, 10), green, k * 0.62, 0.62, -2.2, false);
      e.scale.set(1.4, 0.75, 0.5);
      eyes.push(e);
    }
    for (const s of [-1, 1]) {
      const w = add(group, new THREE.ConeGeometry(0.2, 1.2, 4), chrome, s * 1.95, 0.55, -2.9);
      w.rotation.z = -s * 1.25;
    }
    // 兩邊太空船尾翼（喺跑步帶尾）
    for (const s of [-1, 1]) buildFin(group, mats, s * 1.72, 0.2, 1.9, 1.2, 0.8);
    // 跑步帶兩邊一粒粒細燈
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) eyes.push(add(group, new THREE.SphereGeometry(0.07, 8, 6), i % 2 ? pink : green, s * 1.7, 0.42, -1.9 + i * 0.75, false));
  }

  // ---- 地上：紫色台 + 綠光圈 ----
  const pad = add(group, new THREE.CylinderGeometry(3.4, 3.6, 0.12, 40), hull, 0, 0.06, -0.5);
  pad.receiveShadow = true;
  const ring = add(group, new THREE.RingGeometry(3.1, 3.45, 48), additive(GREEN, 0.4), 0, 0.14, -0.5, false);
  ring.rotation.x = -Math.PI / 2;
  const swirl = add(group, new THREE.CircleGeometry(2.9, 40), additive(0xb388ff, 0.18), 0, 0.13, -0.5, false);
  swirl.rotation.x = -Math.PI / 2;
  // 後面兩邊細燈塔（銀色 + 浮住嘅綠水晶）
  const crystals = [];
  for (const s of [-1, 1]) {
    add(group, new THREE.CylinderGeometry(0.16, 0.36, 1.6, 8), chrome, s * 3.8, 0.8, -1.8);
    add(group, new THREE.TorusGeometry(0.32, 0.05, 6, 20), silver, s * 3.8, 1.65, -1.8, false).rotation.x = Math.PI / 2;
    const c = add(group, new THREE.OctahedronGeometry(0.32), glowMat(GREEN, 2.5), s * 3.8, 2.2, -1.8, false);
    c.scale.y = 1.6;
    crystals.push(c);
  }
  // 頭頂細飛碟（照綠光落部機）
  const ufo = buildSaucer(0.55);
  ufo.position.set(0, 9.6, -1.2);
  group.add(ufo);
  // 浮上去嘅綠色光點
  const N = 40;
  const pos = new Float32Array(N * 3);
  const seeds = Array.from({ length: N }, () => [Math.random() * Math.PI * 2, Math.random() * 2.8, Math.random()]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xb2ff59, size: 0.12, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  motes.frustumCulled = false;
  group.add(motes);
  group.userData = { core, ring, swirl, crystals, ufo, motes, seeds, rings, bezel, eyes };
}

export function animateAlienTier(group, station, time) {
  const u = group.userData;
  station.baseMat.emissiveIntensity = 0.3 + Math.sin(time * 2) * 0.12; // 電路一閃一閃
  station.trimMat.emissiveIntensity = 0.25 + Math.sin(time * 3) * 0.12;
  const k = 1 + Math.sin(time * 2.4) * 0.08;
  u.core.scale.set(0.8 * k, 1.15 * k, 0.4);
  u.core.material.emissiveIntensity = 0.9 + Math.sin(time * 2.4) * 0.3;
  u.ring.material.opacity = 0.3 + Math.sin(time * 3) * 0.12;
  u.swirl.rotation.z = time * 0.6;
  u.rings.forEach((r, i) => r.scale.setScalar(1 + 0.15 * Math.max(0, Math.sin(time * 3 - i * 0.8)))); // 能量一路行上去
  u.bezel.gem.rotation.y = time * 1.6;
  u.bezel.tips.forEach((t, i) => t.scale.setScalar(0.8 + 0.4 * Math.abs(Math.sin(time * 3 + i * 1.5))));
  u.eyes.forEach((e, i) => (e.visible = Math.sin(time * 2.5 + i * 0.9) > -0.6)); // 眨眨下
  u.crystals.forEach((c, i) => {
    c.position.y = 2.2 + Math.sin(time * 2 + i * 2) * 0.15;
    c.rotation.y = time * 1.5;
  });
  u.ufo.position.x = Math.sin(time * 0.5) * 1.2;
  u.ufo.position.y = 9.6 + Math.sin(time * 1.3) * 0.25;
  animateSaucer(u.ufo, time, 7.9);
  u.ufo.userData.beam.material.opacity *= 0.45; // 光柱淡啲，唔好成部機變晒綠
  const pos = u.motes.geometry.attributes.position.array;
  u.seeds.forEach(([a, r, p], i) => {
    const h = ((p + time * 0.25) % 1) * 8;
    pos[i * 3] = Math.cos(a + time) * r + u.ufo.position.x * (h / 8);
    pos[i * 3 + 1] = h;
    pos[i * 3 + 2] = -1.2 + Math.sin(a + time) * r * 0.8;
  });
  u.motes.geometry.attributes.position.needsUpdate = true;
}

// ================= 2. 繁殖機 Lv7 母艦 =================
// 2026-11-13 重做（小朋友話舊款醜）：以前係一隻放大咗嘅細飛碟 + 好闊嘅綠光，遠睇成嚿綠色。
// 而家：銀色分層機殼（Lathe）+ 深紫機腹 + 一圈會轉嘅彩色窗燈 + 四塊尾翼 + 三個引擎艙 + 外圈浮環，光柱幼同淡好多
const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
export function buildMothership() {
  const g = new THREE.Group();
  const ship = new THREE.Group();
  ship.position.set(0, 5.6, 0);
  g.add(ship);
  const silver = M(0xe1e5ee, { metalness: 0.45, roughness: 0.3 });
  const belly = M(0x4a148c, { metalness: 0.6, roughness: 0.3, emissive: 0x2a0845, emissiveIntensity: 0.5 });
  const chrome = M(0x8e24aa, { metalness: 0.6, roughness: 0.25, emissive: 0x4a148c, emissiveIntensity: 0.5 });
  // 上殼（分三層）+ 機腹
  add(ship, lathe([[0.01, 0.62], [0.95, 0.55], [1.1, 0.42], [1.65, 0.3], [1.8, 0.2], [2.35, 0.08], [2.5, 0]]), silver, 0, 0, 0);
  add(ship, lathe([[2.5, 0], [2.35, -0.12], [1.7, -0.3], [1.0, -0.45], [0.01, -0.5]]), belly, 0, 0, 0);
  // 邊一條銀色厚邊
  add(ship, new THREE.TorusGeometry(2.48, 0.07, 8, 64), silver, 0, 0, 0, false).rotation.x = Math.PI / 2;
  // 一圈窗燈（綠／粉紅／青，會轉）
  const lightRing = new THREE.Group();
  ship.add(lightRing);
  const lights = [];
  const COLS = [GREEN, 0xea80fc, 0x18ffff];
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    const l = add(lightRing, new THREE.BoxGeometry(0.22, 0.09, 0.08), glowMat(COLS[k % 3], 2.4), Math.cos(a) * 2.0, 0.15, Math.sin(a) * 2.0, false);
    l.rotation.y = -a + Math.PI / 2;
    lights.push(l);
  }
  // 玻璃頂 + 友善外星人
  const dome = add(ship, new THREE.SphereGeometry(0.85, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M(0xb2ff59, { transparent: true, opacity: 0.4, roughness: 0.05, emissive: 0x33691e, emissiveIntensity: 0.5 }), 0, 0.58, 0, false);
  dome.renderOrder = 2;
  add(ship, new THREE.SphereGeometry(0.3, 16, 12), M(0x8bc34a), 0, 0.85, 0, false).scale.set(1, 1.2, 1);
  for (const sx of [-1, 1]) add(ship, new THREE.SphereGeometry(0.085, 8, 6), M(0x111111), sx * 0.12, 0.92, 0.25, false).scale.set(1, 1.5, 0.6);
  // 四塊後掠尾翼（紫色）+ 頭有燈
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const fin = add(ship, new THREE.BoxGeometry(0.9, 0.5, 0.08), chrome, Math.cos(a) * 1.6, 0.42, Math.sin(a) * 1.6);
    fin.rotation.y = -a;
    fin.rotation.z = 0.35;
    add(ship, new THREE.SphereGeometry(0.09, 8, 6), glowMat(0xea80fc, 2.5), Math.cos(a) * 2.0, 0.6, Math.sin(a) * 2.0, false);
  }
  // 三個引擎艙（機腹下面，底發綠光）
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const pod = add(ship, new THREE.SphereGeometry(0.32, 14, 10), chrome, Math.cos(a) * 1.25, -0.42, Math.sin(a) * 1.25);
    pod.scale.y = 0.7;
    add(ship, new THREE.CircleGeometry(0.22, 16), glowMat(GREEN, 2.5), Math.cos(a) * 1.25, -0.63, Math.sin(a) * 1.25, false).rotation.x = Math.PI / 2;
  }
  // 外圈浮環（同機身分開，慢慢反方向轉）
  const halo = add(g, new THREE.TorusGeometry(2.85, 0.05, 6, 72), glowMat(0x18ffff, 1.6), 0, 5.55, 0, false);
  halo.rotation.x = Math.PI / 2;
  // 牽引光：幼、淡
  const beam = add(g, new THREE.CylinderGeometry(0.35, 1.1, 1, 24, 1, true), additive(GREEN, 0.08), 0, 0, 0, false);
  // 地上：外星符號光圈 + 四條細燈柱
  const ring = add(g, new THREE.RingGeometry(1.75, 2.0, 6), additive(GREEN, 0.6), 0, 0.04, 0, false);
  ring.rotation.x = -Math.PI / 2;
  const ring2 = add(g, new THREE.RingGeometry(2.2, 2.3, 48), additive(0xb388ff, 0.6), 0, 0.04, 0, false);
  ring2.rotation.x = -Math.PI / 2;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    add(g, new THREE.CylinderGeometry(0.08, 0.14, 1.2, 8), chrome, Math.cos(a) * 1.85, 0.6, Math.sin(a) * 1.85);
    add(g, new THREE.OctahedronGeometry(0.16), glowMat(COLS[k % 3], 2.2), Math.cos(a) * 1.85, 1.35, Math.sin(a) * 1.85, false).scale.y = 1.5;
  }
  // 玻璃罩外面一層六角格（淡啲）+ 入面嘅光柱
  const hex = new THREE.Mesh(new THREE.SphereGeometry(1.24, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: GREEN, wireframe: true, transparent: true, opacity: 0.35 }));
  hex.position.y = 0.65;
  g.add(hex);
  const inner = add(g, new THREE.CylinderGeometry(0.25, 0.6, 1.1, 16, 1, true), additive(GREEN, 0.3), 0, 1.2, 0, false);
  // 兩隻細無人機圍住部機飛
  const drones = [0, 1].map(() => {
    const d = buildSaucer(0.16);
    g.add(d);
    return d;
  });
  g.userData = { ship, lightRing, lights, halo, beam, ring, ring2, hex, inner, drones };
  return g;
}
export function animateMothership(g, time) {
  const u = g.userData;
  u.ship.position.y = 5.6 + Math.sin(time * 1.2) * 0.2;
  u.ship.rotation.z = Math.sin(time * 0.7) * 0.05;
  u.ship.rotation.y = time * 0.25;
  u.lightRing.rotation.y = time * 0.9;
  u.lights.forEach((l, k) => (l.visible = Math.sin(time * 4 + k * 0.7) > -0.5));
  u.halo.position.y = u.ship.position.y - 0.05;
  u.halo.rotation.z = -time * 0.6;
  u.halo.rotation.y = Math.sin(time * 0.8) * 0.08;
  const len = u.ship.position.y - 1.3;
  u.beam.scale.y = len;
  u.beam.position.y = u.ship.position.y - 0.6 - len / 2;
  u.beam.material.opacity = 0.06 + 0.04 * Math.sin(time * 4);
  u.ring.rotation.z = time * 0.8;
  u.ring2.material.opacity = 0.4 + Math.sin(time * 3) * 0.2;
  u.hex.rotation.y = -time * 0.3;
  u.inner.material.opacity = 0.22 + Math.sin(time * 4) * 0.1;
  u.drones.forEach((d, i) => {
    const a = time * 1.4 + i * Math.PI;
    d.position.set(Math.cos(a) * 2.4, 2.4 + Math.sin(time * 2 + i) * 0.3, Math.sin(a) * 2.4);
    animateSaucer(d, time + i, 0.01);
  });
}

// ================= 3. 地塊 Lv12 Futuristic =================
// 2026-11-13 重做：原本嘅白色木圍欄收埋（hub.js applyPlotSkin 將 wood／trim／gem 材質 visible = false），
// 換成未來感圍欄：銀色六角柱 + 青色玻璃能量牆 + 上下兩條發光環 + 閘口兩座光塔同全息拱門
export function futurePlotPiece(piece, g, i) {
  // 圍欄入面嘅細全息台（矮，唔阻住寵物）
  const metal = M(0xeceff1, { metalness: 0.9, roughness: 0.15 });
  piece(g, new THREE.CylinderGeometry(0.32, 0.4, 0.18, 6), metal, 0, 0.09, 0);
  piece(g, new THREE.TorusGeometry(0.26, 0.03, 6, 18), glowMat(i % 2 ? 0x18ffff : 0xea80fc, 2), 0, 0.2, 0).rotation.x = Math.PI / 2;
  if (i % 2 === 0) piece(g, new THREE.OctahedronGeometry(0.16), glowMat(i % 4 ? GREEN : 0x18ffff, 2.5), 0, 0.7, 0).scale.y = 1.6;
}
// gateA：閘口方向（atan2(z, x)）；gateHalf：閘口半闊（米）
export function buildFutureFence(cx, cz, r, gateA, gateHalf) {
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  const metal = M(0xe3e8f0, { metalness: 0.9, roughness: 0.18 });
  const dark = M(0x263238, { metalness: 0.7, roughness: 0.3 });
  const cyan = glowMat(0x18ffff, 2);
  const pink = glowMat(0xea80fc, 2);
  const gap = gateHalf / r;
  const arc = Math.PI * 2 - gap * 2;
  // 玻璃能量牆（圓柱開口，閘口留空）：CylinderGeometry 嘅 theta 由 +z 起計 → θ = π/2 − a
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.0, 128, 1, true, Math.PI / 2 - gateA + gap, arc), new THREE.MeshStandardMaterial({ color: 0x80deea, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.2, emissive: 0x006064, emissiveIntensity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.y = 0.75;
  g.add(glass);
  // 底座（深色）+ 上下發光環
  const ringAt = (y, rad, mat, tubeR) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, tubeR, 6, 160, arc), mat);
    t.rotation.x = Math.PI / 2;
    t.rotation.z = gateA + gap;
    t.position.y = y;
    g.add(t);
    return t;
  };
  ringAt(0.12, r, dark, 0.14);
  const low = ringAt(0.27, r, cyan, 0.035);
  const top = ringAt(1.28, r, cyan, 0.05);
  // 柱：每 ~2.5 米一條銀色六角柱，頂有發光帽，每隔一條有粉紅水晶
  const n = Math.round((r * arc) / 2.5);
  const caps = [];
  for (let k = 0; k <= n; k++) {
    const a = gateA + gap + (k / n) * arc;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    add(g, new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6), metal, x, 0.75, z);
    add(g, new THREE.BoxGeometry(0.05, 1.1, 0.05), k % 2 ? pink : cyan, x * (1 - 0.2 / r), 0.75, z * (1 - 0.2 / r), false);
    caps.push(add(g, new THREE.CylinderGeometry(0.2, 0.15, 0.1, 6), cyan, x, 1.55, z, false));
    if (k % 2 === 0) add(g, new THREE.OctahedronGeometry(0.14), pink, x, 1.82, z, false).scale.y = 1.6;
  }
  // 閘口：兩座光塔 + 全息拱門
  const gx = Math.cos(gateA) * r;
  const gz = Math.sin(gateA) * r;
  const side = new THREE.Vector3(-Math.sin(gateA), 0, Math.cos(gateA)); // 沿住圍欄方向
  for (const s of [-1, 1]) {
    const x = gx + side.x * s * (gateHalf + 0.25);
    const z = gz + side.z * s * (gateHalf + 0.25);
    add(g, new THREE.CylinderGeometry(0.22, 0.42, 4.4, 6), metal, x, 2.2, z);
    for (const y of [1.2, 2.4, 3.6]) add(g, new THREE.TorusGeometry(0.36, 0.05, 6, 18), cyan, x, y, z, false).rotation.x = Math.PI / 2;
    add(g, new THREE.OctahedronGeometry(0.28), pink, x, 4.75, z, false).scale.y = 1.5;
  }
  const holo = new THREE.Mesh(new THREE.TorusGeometry(gateHalf + 0.25, 0.08, 8, 40, Math.PI), cyan);
  holo.position.set(gx, 4.4, gz);
  holo.rotation.y = -gateA + Math.PI / 2; // 拱門平面對住閘口方向
  g.add(holo);
  g.userData = { glass, low, top, caps };
  return g;
}
// 全息光環（地塊中間上面，慢慢轉）
export function buildFutureHalo(cx, cz, r) {
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  const rings = [0, 1, 2].map((k) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r - 0.6 - k * 0.15, 0.04, 6, 96), additive(k === 1 ? GREEN : 0x18ffff, 0.6));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25 + k * 0.12;
    g.add(ring);
    return ring;
  });
  const grid = new THREE.Mesh(new THREE.RingGeometry(r - 1.2, r - 0.4, 64, 1), additive(0x18ffff, 0.12));
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = 0.08;
  g.add(grid);
  g.userData = { rings };
  return g;
}
export function animateFutureFence(g, time) {
  const u = g.userData;
  u.glass.material.opacity = 0.18 + Math.sin(time * 2) * 0.06;
  u.top.material.emissiveIntensity = 0.8 + Math.sin(time * 3) * 0.3;
  u.caps.forEach((c, i) => (c.visible = Math.sin(time * 3 - i * 0.6) > -0.7)); // 一粒粒燈行一圈
}
export function animateFutureHalo(g, time) {
  g.userData.rings.forEach((r, k) => {
    r.position.y = 0.25 + k * 0.12 + Math.sin(time * 1.5 + k) * 0.08;
    r.material.opacity = 0.4 + Math.sin(time * 2 + k) * 0.2;
  });
}
