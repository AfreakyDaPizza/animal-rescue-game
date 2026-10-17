// Biome 7：Enchanted Kingdom（小朋友 2026-10-17）
// Biome 6 座山頂條橋 → 閘門 → 天空王國（同閘門一樣高）：水晶樹、魔法符文、水晶蝴蝶、浮喺天上嘅島、
// 遠處嘅皇宮、天上有隻好大嘅 Royal Skywhale 游嚟游去；障礙物係火同 essence（hazards.js），Boss 係 Enchanted Royal Guardian
// 閘門未開（NEW_BIOME_DATE 未到）嗰陣成個王國收埋（kingdomView.visible），等開門動畫先俾人見到

import * as THREE from 'three';
import { addPlatform, addCollider, bakeStatic, kingdom, KINGDOM_Y } from './world.js';
import { buildSkywhaleModel, buildCrystalButterfly, buildRune } from './enchantedModels.js';

export const kingdomView = { group: null, reveal: false }; // reveal：開門動畫俾人睇住先
export const KINGDOM_STAIRS = { top: 13, z: -372 }; // 閘門嘅位同高度（開門動畫用）

const materials = new Map();
const mat = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }));
  return materials.get(key);
};
const glow = (color, k = 1.4) => mat(color, { emissive: color, emissiveIntensity: k });
function add(parent, geo, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// 水晶樹：白色樹幹 + 一嚿嚿發光水晶樹冠
function crystalTree(root, x, z, s, rand) {
  add(root, new THREE.BoxGeometry(0.6 * s, 4 * s, 0.6 * s), mat(0xf3e5f5), x, 2 * s, z);
  const colors = [0xea80fc, 0x80d8ff, 0xb388ff, 0xf8bbd0];
  for (let i = 0; i < 5; i++) {
    const c = colors[Math.floor(rand() * colors.length)];
    const g = add(root, new THREE.OctahedronGeometry((0.9 + rand() * 0.7) * s), mat(c, { emissive: c, emissiveIntensity: 0.6, flatShading: true, roughness: 0.2 }), x + (rand() - 0.5) * 2.4 * s, (4 + rand() * 2.4) * s, z + (rand() - 0.5) * 2.4 * s);
    g.scale.y = 1.4;
  }
}

// 奇怪又發光嘅彩色樹（小朋友：glowing colourful strange trees）：扭嚟扭去嘅樹幹、好大嘅發光蘑菇頂、吊住嘅光球
const STRANGE = [0xff4081, 0x18ffff, 0x76ff03, 0xffab00, 0xd500f9, 0xffea00];
const strangeMats = STRANGE.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.1, roughness: 0.4 }));
function strangeTree(root, x, z, s, rand) {
  const c = Math.floor(rand() * STRANGE.length);
  const trunk = mat([0x4a148c, 0x1a237e, 0x004d40][Math.floor(rand() * 3)]);
  let px = x;
  let pz = z;
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    // 扭下扭下咁升高
    px += Math.sin(i * 1.3 + x) * 0.35 * s;
    pz += Math.cos(i * 1.1 + z) * 0.35 * s;
    const seg = add(root, new THREE.BoxGeometry(0.7 * s * (1 - i * 0.08), 1.1 * s, 0.7 * s * (1 - i * 0.08)), trunk, px, (0.55 + i * 1.0) * s, pz);
    seg.rotation.y = i * 0.5;
    seg.rotation.z = Math.sin(i + x) * 0.15;
  }
  const topY = (segs + 0.4) * s;
  // 發光蘑菇頂（兩層）
  add(root, new THREE.CylinderGeometry(0.4 * s, 3.2 * s, 1.4 * s, 8), strangeMats[c], px, topY, pz);
  add(root, new THREE.CylinderGeometry(0.2 * s, 1.8 * s, 1.0 * s, 8), strangeMats[(c + 2) % STRANGE.length], px, topY + 1.1 * s, pz);
  // 頂底吊住嘅發光球
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    add(root, new THREE.BoxGeometry(0.05, 0.9 * s, 0.05), mat(0x7cb342), px + Math.cos(a) * 2.2 * s, topY - 0.9 * s, pz + Math.sin(a) * 2.2 * s, false);
    add(root, new THREE.SphereGeometry(0.22 * s, 8, 6), strangeMats[(c + k) % STRANGE.length], px + Math.cos(a) * 2.2 * s, topY - 1.45 * s, pz + Math.sin(a) * 2.2 * s, false);
  }
}
// 發光蘑菇（地上）
function glowShroom(root, x, z, s, rand) {
  const c = strangeMats[Math.floor(rand() * STRANGE.length)];
  add(root, new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 0.6 * s, 6), mat(0xf3e5f5), x, 0.3 * s, z, false);
  add(root, new THREE.SphereGeometry(0.45 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), c, x, 0.6 * s, z, false);
}
// 邊界嘅藤（小朋友：vines around the border）：由山頂吊落嚟，有發光花同葉
function vines(root, rect, rand) {
  const leaf = mat(0x2e7d32);
  const leaf2 = mat(0x66bb6a);
  const put = (x, z, side, axis) => {
    const len = 6 + rand() * 9;
    const top = 11 + rand() * 6;
    for (let y = top; y > top - len; y -= 0.55) {
      const wob = Math.sin(y * 1.7 + x + z) * 0.25;
      const vx = axis === 'x' ? x + side * 0.2 : x + wob;
      const vz = axis === 'x' ? z + wob : z + side * 0.2;
      add(root, new THREE.BoxGeometry(0.16, 0.6, 0.16), y % 1.1 < 0.55 ? leaf : leaf2, vx, y, vz, false);
      if (rand() < 0.35) add(root, new THREE.BoxGeometry(0.38, 0.06, 0.24), leaf2, vx, y, vz, false).rotation.y = rand() * 3;
      if (rand() < 0.12) add(root, new THREE.OctahedronGeometry(0.2), strangeMats[Math.floor(rand() * STRANGE.length)], vx, y, vz, false); // 發光花
    }
  };
  for (let z = rect.maxZ - 18; z > rect.minZ + 1; z -= 1.6) {
    put(rect.minX - 0.1, z + rand() * 0.8, 1, 'x');
    put(rect.maxX + 0.1, z + rand() * 0.8, -1, 'x');
  }
  for (let x = rect.minX + 1; x < rect.maxX - 1; x += 1.6) put(x + rand() * 0.8, rect.minZ - 0.1, 1, 'z');
}
// 魔法地板（小朋友：cool looking floors）：一塊塊彩色寶石磚 + 發光縫
function magicFloor(view, rect) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const e = document.createElement('canvas');
  e.width = e.height = 256;
  const ex = e.getContext('2d');
  ex.fillStyle = '#000';
  ex.fillRect(0, 0, 256, 256);
  const tiles = ['#5e35b1', '#3949ab', '#6a1b9a', '#283593', '#4527a0'];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    ctx.fillStyle = tiles[(x * 3 + y * 5) % tiles.length];
    ctx.fillRect(x * 32, y * 32, 32, 32);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x * 32 + 3, y * 32 + 3, 12, 12);
  }
  // 發光縫（青色）+ 中間發光符文點
  for (const g of [ctx, ex]) {
    g.strokeStyle = g === ctx ? '#80deea' : '#18ffff';
    g.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      g.beginPath();
      g.moveTo(i * 32, 0);
      g.lineTo(i * 32, 256);
      g.moveTo(0, i * 32);
      g.lineTo(256, i * 32);
      g.stroke();
    }
    g.fillStyle = g === ctx ? '#ffe57f' : '#ffd740';
    for (let i = 0; i < 6; i++) g.fillRect(((i * 97) % 8) * 32 + 14, ((i * 53) % 8) * 32 + 14, 5, 5);
  }
  const map = new THREE.CanvasTexture(c);
  const emap = new THREE.CanvasTexture(e);
  for (const t of [map, emap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set((rect.maxX - rect.minX) / 8, (rect.maxZ - rect.minZ) / 8);
    t.colorSpace = THREE.SRGBColorSpace;
  }
  const floorMat = new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: emap, emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.2 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(rect.maxX - rect.minX, rect.maxZ - rect.minZ), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.012, (rect.minZ + rect.maxZ) / 2);
  floor.receiveShadow = true;
  view.add(floor);
  return floorMat;
}

// 遠處嘅皇宮（王國盡頭）
function castle(root, rect) {
  const z = rect.minZ + 6;
  const white = mat(0xf5f5f5);
  const roof = mat(0x3949ab);
  const gold = mat(0xffd54f, { metalness: 0.7, roughness: 0.3 });
  add(root, new THREE.BoxGeometry(30, 12, 6), white, 0, 6, z - 2);
  for (let x = -14; x <= 14; x += 2) add(root, new THREE.BoxGeometry(1, 1.4, 6.2), white, x, 12.7, z - 2); // 城垛
  add(root, new THREE.BoxGeometry(6, 8, 0.4), mat(0x4a148c, { emissive: 0x7c4dff, emissiveIntensity: 0.6 }), 0, 4, z + 1.05); // 大門（紫光）
  add(root, new THREE.TorusGeometry(3, 0.35, 8, 24, Math.PI), gold, 0, 8, z + 1.1);
  for (const [x, h, r] of [[-15, 22, 2.6], [15, 22, 2.6], [-7, 18, 2], [7, 18, 2], [0, 28, 3.2]]) {
    add(root, new THREE.CylinderGeometry(r, r, h, 12), white, x, h / 2, z - 3);
    add(root, new THREE.ConeGeometry(r * 1.3, r * 2.6, 12), roof, x, h + r * 1.3, z - 3);
    add(root, new THREE.CylinderGeometry(0.06, 0.06, 3, 6), gold, x, h + r * 2.6 + 1.5, z - 3);
    add(root, new THREE.BoxGeometry(1.6, 0.9, 0.05), mat(0xd50000), x + 0.8, h + r * 2.6 + 2.4, z - 3, false); // 旗
  }
}


// 邊界：好高嘅水晶懸崖（每段唔同高度，頂有發光水晶）+ 巨型發光奇怪樹 + 吊落嚟嘅藤
function crystalCliffs(root, rect, rand) {
  const rock = [mat(0x4527a0, { flatShading: true }), mat(0x5e35b1, { flatShading: true }), mat(0x311b92, { flatShading: true })];
  const crystalC = [0xea80fc, 0x18ffff, 0xffd740, 0x76ff03];
  const cliff = (x, z, w, d) => {
    const h = 10 + rand() * 14;
    add(root, new THREE.BoxGeometry(w, h + 13, d), rock[Math.floor(rand() * 3)], x, (h - 13) / 2, z);
    add(root, new THREE.BoxGeometry(w * 0.7, 2, d * 0.7), rock[Math.floor(rand() * 3)], x + (rand() - 0.5) * 1.5, h + 1, z + (rand() - 0.5) * 1.5);
    for (let k = 0; k < 3; k++) {
      const c = crystalC[Math.floor(rand() * crystalC.length)];
      const cr = add(root, new THREE.OctahedronGeometry(0.8 + rand() * 1.4), mat(c, { emissive: c, emissiveIntensity: 1.1, flatShading: true }), x + (rand() - 0.5) * w, h + 2 + rand() * 2, z + (rand() - 0.5) * d, false);
      cr.scale.y = 2;
      cr.rotation.z = (rand() - 0.5) * 0.6;
    }
  };
  const S = 7;
  for (let z = rect.maxZ - 2; z > rect.minZ; z -= S) {
    cliff(rect.minX - 3.5, z - S / 2, 7, S + 0.5);
    cliff(rect.maxX + 3.5, z - S / 2, 7, S + 0.5);
  }
  for (let x = rect.minX - 7; x < rect.maxX + 7; x += S) cliff(x + S / 2, rect.minZ - 3.5, S + 0.5, 7);
  // 閘門兩邊（王國嘅入口嗰幅）
  for (let x = rect.minX - 7; x < rect.maxX + 7; x += S) if (Math.abs(x + S / 2) > 15) cliff(x + S / 2, rect.maxZ - 0.7, S + 0.5, 1.2); // 薄啲：唔好伸入 Biome 6 山後面條路
  // 巨型發光奇怪樹沿住邊界
  for (let z = rect.maxZ - 8; z > rect.minZ + 8; z -= 13) {
    strangeTree(root, rect.minX + 4, z, 2.2 + rand() * 0.6, rand);
    strangeTree(root, rect.maxX - 4, z - 6, 2.2 + rand() * 0.6, rand);
  }
  for (let x = rect.minX + 12; x < rect.maxX - 8; x += 15) strangeTree(root, x, rect.minZ + 5, 2.4 + rand() * 0.5, rand);
}

// 中間嘅水晶噴泉（發光水）
function crystalFountain(root, x, z) {
  add(root, new THREE.CylinderGeometry(6, 6.6, 1.2, 12), mat(0xede7f6), x, 0.6, z);
  add(root, new THREE.CylinderGeometry(5.4, 5.4, 0.2, 12), mat(0x40c4ff, { emissive: 0x00b0ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 }), x, 1.15, z, false);
  add(root, new THREE.CylinderGeometry(0.8, 1.2, 5, 8), mat(0xede7f6), x, 3.2, z);
  const c = add(root, new THREE.OctahedronGeometry(2), mat(0xea80fc, { emissive: 0xd500f9, emissiveIntensity: 1.3, flatShading: true }), x, 7.4, z, false);
  c.scale.y = 1.6;
  addCollider(x, z, 6.4);
}

// 彩虹拱門（跨過中間條路）
function rainbowArch(root, z) {
  [0xff1744, 0xff9100, 0xffea00, 0x00e676, 0x2979ff, 0xd500f9].forEach((c, i) => {
    add(root, new THREE.TorusGeometry(11 - i * 0.6, 0.3, 6, 40, Math.PI), mat(c, { emissive: c, emissiveIntensity: 0.9 }), 0, 0, z, false);
  });
}

export function enchanted(staticRoot, rect, rand, live) {
  // 天空王國（小朋友：入咗閘門地面要同閘門一樣高、要大啲、要型啲）：成個 view 放喺 KINGDOM_Y 高
  const view = new THREE.Group();
  view.visible = false;
  view.position.y = KINGDOM_Y;
  live.add(view);
  kingdomView.group = view;
  addPlatform(rect, KINGDOM_Y); // 成塊地都企得
  const root = new THREE.Group();
  const cz = (rect.minZ + rect.maxZ) / 2;
  const half = (rect.maxX - rect.minX) / 2;
  const w = rect.maxX - rect.minX;
  const d = rect.maxZ - rect.minZ;

  // 浮喺天上嘅大地台（下面係紫色水晶石）
  add(root, new THREE.BoxGeometry(w, KINGDOM_Y, d), mat(0x4a148c, { flatShading: true }), 0, -KINGDOM_Y / 2 - 0.01, cz);
  crystalCliffs(root, rect, rand);
  castle(root, rect);
  crystalFountain(root, 0, cz + 8);
  rainbowArch(root, rect.maxZ - 22);
  // 中間金色大道（由閘門去皇宮）
  add(root, new THREE.BoxGeometry(6, 0.05, d - 14), mat(0xfff59d, { emissive: 0xffd740, emissiveIntensity: 0.25 }), 0, 0.03, cz + 4, false);
  // 水晶樹、奇怪發光樹、蘑菇（避開中間條路同噴泉）
  const spot = () => {
    for (;;) {
      const x = (rand() * 2 - 1) * (half - 7);
      const z = rect.minZ + 16 + rand() * (d - 28);
      if (Math.abs(x) > 6 && Math.hypot(x, z - (cz + 8)) > 9) return [x, z];
    }
  };
  for (let n = 0; n < 40; n++) {
    const [x, z] = spot();
    crystalTree(root, x, z, 1.1 + rand() * 0.9, rand);
    addCollider(x, z, 0.7);
  }
  for (let n = 0; n < 34; n++) {
    const [x, z] = spot();
    strangeTree(root, x, z, 1.2 + rand() * 1.0, rand);
    addCollider(x, z, 0.8);
  }
  for (let n = 0; n < 120; n++) {
    const [x, z] = spot();
    glowShroom(root, x, z, 0.8 + rand() * 1.6, rand);
  }
  vines(root, rect, rand);
  for (let n = 0; n < 260; n++) {
    const c = [0xea80fc, 0x80d8ff, 0xffe57f, 0xb9f6ca][n % 4];
    const [x, z] = spot();
    add(root, new THREE.BoxGeometry(0.2, 0.2, 0.2), glow(c, 1), x, 0.12, z, false);
  }
  bakeStatic(root, view);
  const floorMat = magicFloor(view, rect);

  // ---- 會郁嘅嘢 ----
  // 地上嘅魔法符文（慢慢轉，大大個）
  const runes = Array.from({ length: 10 }, (_, i) => {
    const r = buildRune([0xb388ff, 0x80d8ff, 0xffe57f, 0xea80fc, 0xffd54f][i % 5]);
    const [x, z] = spot();
    r.position.set(x, 0.06, z);
    r.scale.setScalar(2.2 + rand() * 1.5);
    view.add(r);
    return r;
  });
  // 浮喺天上嘅島（大啲、多啲）
  const islands = Array.from({ length: 9 }, (_, i) => {
    const s = 1 + rand() * 1.4;
    const g = new THREE.Group();
    add(g, new THREE.ConeGeometry(4 * s, 6 * s, 7), mat(0x6d4c41, { flatShading: true }), 0, -3 * s, 0).rotation.x = Math.PI;
    add(g, new THREE.CylinderGeometry(4.1 * s, 4.1 * s, 0.8 * s, 7), mat(0x7e57c2), 0, 0.4 * s, 0);
    if (i % 2) strangeTree(g, 0, 0, 0.8 * s, rand);
    else crystalTree(g, 0, 0, 0.8 * s, rand);
    const y = 18 + rand() * 26;
    g.position.set((rand() * 2 - 1) * (half - 8), y, rect.minZ + 10 + rand() * (d - 20));
    view.add(g);
    return { g, y, i };
  });
  // 天上嘅 Royal Skywhale（好大隻，喺王國上面游圈）
  const whale = buildSkywhaleModel();
  const wsize = new THREE.Box3().setFromObject(whale).getSize(new THREE.Vector3());
  whale.scale.multiplyScalar(26 / Math.max(wsize.x, wsize.y, wsize.z));
  if (whale.userData) whale.userData.flying = true;
  const whaleG = new THREE.Group();
  whaleG.add(whale);
  view.add(whaleG);
  // 水晶蝴蝶（多啲）
  const butterflies = Array.from({ length: 70 }, (_, i) => {
    const b = buildCrystalButterfly([0xea80fc, 0x80d8ff, 0xffe57f, 0xb9f6ca, 0xb388ff][i % 5]);
    b.scale.setScalar(1.6);
    view.add(b);
    const [x, z] = spot();
    return { b, x, z, h: 1.5 + rand() * 8, r: 1 + rand() * 4, s: 0.5 + rand(), p: rand() * 6 };
  });
  // 魔法閃粉
  const SP = 320;
  const sp = new Float32Array(SP * 3);
  const spSeeds = Array.from({ length: SP }, () => ({ x: (rand() * 2 - 1) * (half - 2), z: rect.minZ + 2 + rand() * (d - 4), k: rand(), s: 0.3 + rand() * 0.5 }));
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparkles = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xfff59d, size: 0.24, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparkles.frustumCulled = false;
  view.add(sparkles);

  return (dt, t) => {
    view.visible = kingdom.open || kingdomView.reveal;
    if (!view.visible) return;
    runes.forEach((r, i) => r.userData.spin?.(t + i));
    floorMat.emissiveIntensity = 0.45 + Math.sin(t * 1.5) * 0.2; // 地板條縫一閃一閃
    strangeMats.forEach((m, i) => (m.emissiveIntensity = 0.9 + Math.sin(t * 2 + i) * 0.4)); // 啲樹一明一暗
    for (const isl of islands) isl.g.position.y = isl.y + Math.sin(t * 0.5 + isl.i) * 1.2;
    const a = t * 0.06;
    whaleG.position.set(Math.cos(a) * (half - 12), 34 + Math.sin(t * 0.4) * 3, cz + Math.sin(a) * (d / 2 - 14));
    whaleG.rotation.y = -a + Math.PI; // 頭向住游緊嘅方向
    whale.userData.animate?.(t, 1);
    for (const f of butterflies) {
      const k = t * f.s + f.p;
      f.b.position.set(f.x + Math.cos(k) * f.r, f.h + Math.sin(k * 1.7) * 0.8, f.z + Math.sin(k) * f.r);
      f.b.rotation.y = -k;
      f.b.userData.flap?.(t + f.p);
    }
    for (let i = 0; i < SP; i++) {
      const s = spSeeds[i];
      const k = (s.k + t * 0.05 * s.s) % 1;
      sp[i * 3] = s.x + Math.sin(t * s.s + i) * 0.6;
      sp[i * 3 + 1] = k * 16;
      sp[i * 3 + 2] = s.z;
    }
    spGeo.attributes.position.needsUpdate = true;
  };
}

// ================= 開門動畫（小朋友：上到山頂有段 cutscene，之後見到新生態區） =================
// 鐵枝慢慢升起、漩渦消失 → 鏡頭飛過閘門、沿住樓梯落去 → 望上天見到 Royal Skywhale → 水晶蝴蝶同符文
export function playKingdomReveal({ camera, playMovie, once, shake, play, gate, onDone }) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const Z = KINGDOM_STAIRS.z;
  kingdomView.reveal = true;
  playMovie(camera, {
    length: 21,
    skipText: 'Click or press any key to keep playing ▶',
    shots: [
      [0, 5, { p: V(4, 15.5, Z + 12), l: V(0, 18, Z) }, { p: V(2, 15, Z + 8), l: V(0, 17, Z) }], // 喺橋上面望住閘門打開
      [5, 10, { p: V(0, 15, Z + 2), l: V(0, 14, Z - 30) }, { p: V(0, 26, Z - 20), l: V(0, 14, Z - 80) }], // 飛過閘門，望到成個王國
      [10, 15, { p: V(-14, 21, Z - 34), l: V(0, 48, Z - 50) }, { p: V(-16, 23, Z - 40), l: V(8, 50, Z - 55) }], // 望上天：Royal Skywhale！
      [15, 21, { p: V(10, 17, Z - 24), l: V(-6, 15, Z - 44) }, { p: V(6, 16.5, Z - 30), l: V(-8, 15.5, Z - 50) }], // 水晶蝴蝶、符文
    ],
    captions: [
      [0.3, 'The countdown is over... the gate is OPENING! 🔓'],
      [5, '✨ Welcome to the ENCHANTED KINGDOM! ✨'],
      [10, 'Look! The ROYAL SKYWHALE, the best pet of all! 🐋👑'],
      [15, 'Crystal butterflies, magic runes... and the ROYAL GUARDIAN! Watch out for fire and essence! 🔥'],
    ],
    update(t) {
      if (once('open')) {
        gate.fast = true;
        play('magic');
        shake(0.15);
      }
      if (t > 4.5 && once('flash')) play('upgrade');
      return null;
    },
    onDone() {
      kingdomView.reveal = false;
      gate.fast = false;
      onDone?.();
    },
  });
}
