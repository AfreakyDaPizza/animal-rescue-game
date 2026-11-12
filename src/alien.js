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
export function buildAlienTier(group) {
  const hull = M(0xffffff, { map: alienTexture(), emissiveMap: alienTexture(), emissive: 0xffffff, emissiveIntensity: 0.3, metalness: 0.4, roughness: 0.35 });
  const light = M(0xd1c4e9, { metalness: 0.5, roughness: 0.3 });
  const green = glowMat(GREEN, 2);
  const GZ = -3.6;
  // 外星大門：兩邊彎彎嘅尖角（一嚿嚿疊上去，越高越向內彎）+ 頂部綠色核心
  const horns = [];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 9; k++) {
      const t = k / 8;
      const x = s * (3.1 - t * t * 1.6);
      const y = 0.5 + t * 7;
      const seg = add(group, new THREE.BoxGeometry(0.9 - t * 0.45, 0.95, 0.9 - t * 0.3), k % 3 === 2 ? light : hull, x, y, GZ);
      seg.rotation.z = s * t * 0.7;
    }
    // 外面三條彎刺
    for (let k = 0; k < 3; k++) {
      const spike = add(group, new THREE.ConeGeometry(0.28, 2.2, 5), hull, s * (3.7 + k * 0.1), 2.2 + k * 1.8, GZ + 0.2, true);
      spike.rotation.z = -s * (1.0 - k * 0.15);
      horns.push(spike);
    }
    // 綠色燈條沿住門柱
    add(group, new THREE.BoxGeometry(0.12, 5.5, 0.12), green, s * 2.55, 3.1, GZ + 0.48, false);
    // 側面板：兩粒綠方燈
    for (let k = 0; k < 2; k++) add(group, new THREE.BoxGeometry(0.35, 0.35, 0.06), green, s * 2.3, 5.6 + k * 0.5, GZ + 0.5, false);
  }
  // 門頂綠色蛋形核心（發光、會呼吸）
  const core = add(group, new THREE.SphereGeometry(0.85, 24, 16), glowMat(GREEN, 2.2), 0, 7.3, GZ + 0.1, false);
  core.scale.set(0.8, 1.15, 0.4);
  const coreFrame = add(group, new THREE.TorusGeometry(0.95, 0.18, 8, 28), hull, 0, 7.3, GZ + 0.15);
  coreFrame.scale.set(0.85, 1.2, 1);
  // 地上：紫色台 + 綠光圈（同參考圖底部紫色光一樣）
  const pad = add(group, new THREE.CylinderGeometry(3.4, 3.6, 0.12, 40), hull, 0, 0.06, -0.5);
  pad.receiveShadow = true;
  const ring = add(group, new THREE.RingGeometry(3.1, 3.45, 48), additive(GREEN, 0.45), 0, 0.14, -0.5, false);
  ring.rotation.x = -Math.PI / 2;
  const swirl = add(group, new THREE.CircleGeometry(2.9, 40), additive(0xb388ff, 0.2), 0, 0.13, -0.5, false);
  swirl.rotation.x = -Math.PI / 2;
  // 後面兩邊外星柱（矮，唔擋第三身鏡頭）+ 浮住嘅綠水晶
  const crystals = [];
  for (const s of [-1, 1]) {
    add(group, new THREE.CylinderGeometry(0.22, 0.4, 1.6, 6), hull, s * 3.8, 0.8, -1.8);
    add(group, new THREE.TorusGeometry(0.32, 0.06, 6, 20), green, s * 3.8, 1.65, -1.8, false).rotation.x = Math.PI / 2;
    const c = add(group, new THREE.OctahedronGeometry(0.32), glowMat(GREEN, 2.5), s * 3.8, 2.2, -1.8, false);
    c.scale.y = 1.6;
    crystals.push(c);
  }
  // 頭頂細飛碟（照綠光落部機）
  const ufo = buildSaucer(0.55);
  ufo.position.set(0, 9.2, -1.2);
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
  group.userData = { core, ring, swirl, crystals, ufo, motes, seeds, horns };
}

export function animateAlienTier(group, station, time) {
  const u = group.userData;
  station.baseMat.emissiveIntensity = 0.3 + Math.sin(time * 2) * 0.12; // 電路一閃一閃
  station.trimMat.emissiveIntensity = 0.25 + Math.sin(time * 3) * 0.12;
  const k = 1 + Math.sin(time * 2.4) * 0.08;
  u.core.scale.set(0.8 * k, 1.15 * k, 0.4);
  u.core.material.emissiveIntensity = 0.9 + Math.sin(time * 2.4) * 0.3;
  u.ring.material.opacity = 0.35 + Math.sin(time * 3) * 0.15;
  u.swirl.rotation.z = time * 0.6;
  u.crystals.forEach((c, i) => {
    c.position.y = 2.2 + Math.sin(time * 2 + i * 2) * 0.15;
    c.rotation.y = time * 1.5;
  });
  u.ufo.position.x = Math.sin(time * 0.5) * 1.2;
  u.ufo.position.y = 9.2 + Math.sin(time * 1.3) * 0.25;
  animateSaucer(u.ufo, time, 7.5);
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
export function buildMothership() {
  const g = new THREE.Group();
  const ship = buildSaucer(1.05);
  ship.position.set(0, 5.6, 0);
  g.add(ship);
  // 下面嘅炮塔／天線
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    add(ship, new THREE.CylinderGeometry(0.12, 0.2, 0.6, 8), M(0x9e9eb8, { metalness: 0.9 }), Math.cos(a) * 1.2, -0.6, Math.sin(a) * 1.2, false);
    add(ship, new THREE.SphereGeometry(0.14, 8, 6), glowMat(GREEN, 2.5), Math.cos(a) * 1.2, -0.95, Math.sin(a) * 1.2, false);
  }
  // 地上：外星符號光圈 + 四條細燈柱
  const ring = add(g, new THREE.RingGeometry(1.75, 2.0, 6), additive(GREEN, 0.7), 0, 0.04, 0, false);
  ring.rotation.x = -Math.PI / 2;
  const ring2 = add(g, new THREE.RingGeometry(2.2, 2.3, 48), additive(0xb388ff, 0.6), 0, 0.04, 0, false);
  ring2.rotation.x = -Math.PI / 2;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    add(g, new THREE.BoxGeometry(0.16, 1.2, 0.16), M(PURPLE, { metalness: 0.6 }), Math.cos(a) * 1.85, 0.6, Math.sin(a) * 1.85);
    add(g, new THREE.BoxGeometry(0.22, 0.22, 0.22), glowMat(GREEN, 2.2), Math.cos(a) * 1.85, 1.3, Math.sin(a) * 1.85, false);
  }
  // 玻璃罩外面一層綠色六角格（好型嘅外星玻璃）+ 入面嘅光柱
  const hex = new THREE.Mesh(new THREE.SphereGeometry(1.24, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: GREEN, wireframe: true, transparent: true, opacity: 0.55 }));
  hex.position.y = 0.65;
  g.add(hex);
  const inner = add(g, new THREE.CylinderGeometry(0.25, 0.6, 1.1, 16, 1, true), additive(GREEN, 0.35), 0, 1.2, 0, false);
  // 兩隻細無人機圍住部機飛
  const drones = [0, 1].map(() => {
    const d = buildSaucer(0.16);
    g.add(d);
    return d;
  });
  g.userData = { ship, ring, ring2, hex, inner, drones };
  return g;
}
export function animateMothership(g, time) {
  const u = g.userData;
  u.ship.position.y = 5.6 + Math.sin(time * 1.2) * 0.2;
  u.ship.rotation.z = Math.sin(time * 0.7) * 0.05;
  animateSaucer(u.ship, time, u.ship.position.y - 1.9);
  u.ring.rotation.z = time * 0.8;
  u.ring2.material.opacity = 0.4 + Math.sin(time * 3) * 0.2;
  u.hex.rotation.y = -time * 0.3;
  u.inner.material.opacity = 0.25 + Math.sin(time * 4) * 0.12;
  u.drones.forEach((d, i) => {
    const a = time * 1.4 + i * Math.PI;
    d.position.set(Math.cos(a) * 2.4, 2.4 + Math.sin(time * 2 + i) * 0.3, Math.sin(a) * 2.4);
    animateSaucer(d, time + i, 0.01);
  });
}

// ================= 3. 地塊 Lv12 Futuristic =================
// piece(g, geo, mat, x, y, z)：hub.js buildPlotSkins 嘅工具；i = 第幾個位
export function futurePlotPiece(piece, g, i) {
  const metal = M(0xeceff1, { metalness: 0.9, roughness: 0.15 });
  piece(g, new THREE.CylinderGeometry(0.16, 0.22, 2.4, 8), metal, 0, 1.2, 0);
  piece(g, new THREE.BoxGeometry(0.06, 2.0, 0.06), glowMat(i % 2 ? 0x18ffff : GREEN, 2.2), 0.17, 1.2, 0);
  piece(g, new THREE.TorusGeometry(0.28, 0.05, 6, 18), glowMat(0x18ffff, 2), 0, 2.45, 0).rotation.x = Math.PI / 2;
  if (i % 3 === 0) piece(g, new THREE.OctahedronGeometry(0.2), glowMat(0xea80fc, 2.5), 0, 2.8, 0).scale.y = 1.6;
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
export function animateFutureHalo(g, time) {
  g.userData.rings.forEach((r, k) => {
    r.position.y = 0.25 + k * 0.12 + Math.sin(time * 1.5 + k) * 0.08;
    r.material.opacity = 0.4 + Math.sin(time * 2 + k) * 0.2;
  });
}
