// Biome 7：Enchanted Kingdom（小朋友 2026-10-17）
// Biome 6 座山頂條橋 → 閘門 → 皇家大樓梯落去 → 魔法王國：水晶樹、魔法符文、水晶蝴蝶、浮喺天上嘅島、
// 遠處嘅皇宮、天上有隻好大嘅 Royal Skywhale 游嚟游去；障礙物係火同 essence（hazards.js），Boss 係 Enchanted Royal Guardian
// 閘門未開（NEW_BIOME_DATE 未到）嗰陣成個王國收埋（kingdomView.visible），等開門動畫先俾人見到

import * as THREE from 'three';
import { addPlatform, addCollider, bakeStatic, kingdom } from './world.js';
import { buildSkywhaleModel, buildCrystalButterfly, buildRune } from './enchantedModels.js';

export const kingdomView = { group: null, reveal: false }; // reveal：開門動畫俾人睇住先
export const KINGDOM_STAIRS = { top: 13, z: -372, len: 13.5, w: 7 };

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

// 皇家大樓梯：由閘門（橋嘅高度）一級級落去地面；白雲石 + 金邊
function royalStairs(root) {
  const { top, z, len, w } = KINGDOM_STAIRS;
  const STEPS = 30;
  const rise = top / STEPS;
  const run = len / STEPS;
  const marble = mat(0xf5f5f5);
  const marble2 = mat(0xe8eaf6);
  const gold = mat(0xffd54f, { metalness: 0.7, roughness: 0.3 });
  // 頂嗰度：接住閘門嘅平台
  addPlatform({ minX: -w / 2, maxX: w / 2, minZ: z - 1.2, maxZ: z + 0.6 }, top);
  add(root, new THREE.BoxGeometry(w, 0.3, 1.8), marble, 0, top - 0.15, z - 0.3);
  for (let i = 0; i < STEPS; i++) {
    const t = top - rise * (i + 1);
    const z1 = z - 1.2 - run * i;
    const z2 = z1 - run;
    if (t > 0.01) addPlatform({ minX: -w / 2, maxX: w / 2, minZ: z2, maxZ: z1 }, t);
    add(root, new THREE.BoxGeometry(w, Math.max(0.05, t), run + 0.01), i % 2 ? marble : marble2, 0, Math.max(0.05, t) / 2, (z1 + z2) / 2);
    add(root, new THREE.BoxGeometry(w, 0.05, 0.06), gold, 0, t + 0.03, z1 - 0.03, false);
  }
  // 兩邊欄杆（金色）
  for (const s of [-1, 1]) {
    for (let i = 0; i <= STEPS; i += 3) {
      const t = top - rise * i;
      add(root, new THREE.BoxGeometry(0.25, 1.4, 0.25), gold, s * (w / 2), t + 0.7, z - 1.2 - run * i);
    }
    const rail = add(root, new THREE.BoxGeometry(0.15, 0.15, Math.hypot(len, top)), gold, s * (w / 2), top / 2 + 1.4, z - 1.2 - len / 2);
    rail.rotation.x = -Math.atan2(top, len);
  }
}

export function enchanted(staticRoot, rect, rand, live) {
  // 自己一個 group，自己焊；閘門未開就收埋
  const view = new THREE.Group();
  view.visible = false;
  live.add(view);
  kingdomView.group = view;
  const root = new THREE.Group();
  const cz = (rect.minZ + rect.maxZ) / 2;

  royalStairs(root);
  castle(root, rect);
  // 水晶樹（兩邊）
  for (let n = 0; n < 26; n++) {
    const side = n % 2 ? 1 : -1;
    const x = side * (6 + rand() * 13);
    const z = rect.minZ + 14 + rand() * (rect.maxZ - rect.minZ - 32);
    crystalTree(root, x, z, 0.8 + rand() * 0.6, rand);
    addCollider(x, z, 0.5);
  }
  // 奇怪嘅發光樹 + 蘑菇 + 邊界嘅藤
  for (let n = 0; n < 18; n++) {
    const side = n % 2 ? 1 : -1;
    const x = side * (5 + rand() * 14);
    const z = rect.minZ + 14 + rand() * (rect.maxZ - rect.minZ - 32);
    strangeTree(root, x, z, 0.9 + rand() * 0.6, rand);
    addCollider(x, z, 0.6);
  }
  for (let n = 0; n < 50; n++) glowShroom(root, (rand() < 0.5 ? -1 : 1) * (3 + rand() * 17), rect.minZ + 10 + rand() * 40, 0.7 + rand() * 1.2, rand);
  vines(root, rect, rand);
  // 魔法花（發光細方塊）同小路
  add(root, new THREE.BoxGeometry(5, 0.04, rect.maxZ - rect.minZ - 30), mat(0xfff8e1), 0, 0.02, cz - 2, false);
  for (let n = 0; n < 120; n++) {
    const c = [0xea80fc, 0x80d8ff, 0xffe57f, 0xb9f6ca][n % 4];
    add(root, new THREE.BoxGeometry(0.18, 0.18, 0.18), glow(c, 1), (rand() < 0.5 ? -1 : 1) * (3 + rand() * 17), 0.12, rect.minZ + 12 + rand() * 36, false);
  }
  bakeStatic(root, view);
  const floorMat = magicFloor(view, rect);

  // ---- 會郁嘅嘢 ----
  // 地上嘅魔法符文（慢慢轉）
  const runes = [[-11, cz + 4, 0xb388ff], [11, cz - 4, 0x80d8ff], [-10, cz - 14, 0xffe57f], [10, cz + 14, 0xea80fc], [0, cz - 20, 0xffd54f]].map(([x, z, c]) => {
    const r = buildRune(c);
    r.position.set(x, 0.05, z);
    view.add(r);
    return r;
  });
  // 浮喺天上嘅島
  const islands = [[-14, 24, cz + 6, 1], [16, 30, cz - 8, 1.3], [-6, 36, cz - 20, 0.9], [8, 22, cz + 16, 0.8]].map(([x, y, z, s], i) => {
    const g = new THREE.Group();
    add(g, new THREE.ConeGeometry(4 * s, 6 * s, 7), mat(0x6d4c41, { flatShading: true }), 0, -3 * s, 0).rotation.x = Math.PI;
    add(g, new THREE.CylinderGeometry(4.1 * s, 4.1 * s, 0.8 * s, 7), mat(0x7e57c2), 0, 0.4 * s, 0);
    crystalTree(g, 0, 0, 0.7 * s, rand);
    g.position.set(x, y, z);
    view.add(g);
    return { g, y, i };
  });
  // 天上嘅 Royal Skywhale（好大隻，喺王國上面游圈）
  const whale = buildSkywhaleModel();
  const wsize = new THREE.Box3().setFromObject(whale).getSize(new THREE.Vector3());
  whale.scale.multiplyScalar(22 / Math.max(wsize.x, wsize.y, wsize.z));
  if (whale.userData) whale.userData.flying = true;
  const whaleG = new THREE.Group();
  whaleG.add(whale);
  view.add(whaleG);
  // 水晶蝴蝶
  const butterflies = Array.from({ length: 40 }, (_, i) => {
    const b = buildCrystalButterfly([0xea80fc, 0x80d8ff, 0xffe57f, 0xb9f6ca, 0xb388ff][i % 5]);
    view.add(b);
    return { b, x: (rand() - 0.5) * 36, z: rect.minZ + 10 + rand() * 46, h: 1.5 + rand() * 6, r: 1 + rand() * 3, s: 0.5 + rand(), p: rand() * 6 };
  });
  // 魔法閃粉
  const SP = 150;
  const sp = new Float32Array(SP * 3);
  const spSeeds = Array.from({ length: SP }, () => ({ x: (rand() - 0.5) * 40, z: rect.minZ + 4 + rand() * 56, k: rand(), s: 0.3 + rand() * 0.5 }));
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparkles = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xfff59d, size: 0.18, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparkles.frustumCulled = false;
  view.add(sparkles);

  return (dt, t) => {
    view.visible = kingdom.open || kingdomView.reveal;
    if (!view.visible) return;
    runes.forEach((r, i) => r.userData.spin?.(t + i));
    floorMat.emissiveIntensity = 0.45 + Math.sin(t * 1.5) * 0.2; // 地板條縫一閃一閃
    strangeMats.forEach((m, i) => (m.emissiveIntensity = 0.9 + Math.sin(t * 2 + i) * 0.4)); // 啲樹一明一暗
    for (const isl of islands) isl.g.position.y = isl.y + Math.sin(t * 0.5 + isl.i) * 1.2;
    const a = t * 0.08;
    whaleG.position.set(Math.cos(a) * 26, 42 + Math.sin(t * 0.4) * 3, cz + Math.sin(a) * 34);
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
      sp[i * 3 + 1] = k * 14;
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
      [5, 10, { p: V(0, 15, Z + 2), l: V(0, 12, Z - 20) }, { p: V(0, 20, Z - 14), l: V(0, 6, Z - 40) }], // 飛過閘門，望到成個王國
      [10, 15, { p: V(-10, 8, Z - 26), l: V(0, 40, Z - 31) }, { p: V(-12, 10, Z - 30), l: V(8, 44, Z - 31) }], // 望上天：Royal Skywhale！
      [15, 21, { p: V(8, 4, Z - 20), l: V(-4, 2, Z - 34) }, { p: V(4, 3, Z - 24), l: V(-6, 2.5, Z - 38) }], // 水晶蝴蝶、符文
    ],
    captions: [
      [0.3, 'The countdown is over... the gate is OPENING! 🔓'],
      [5, '✨ Welcome to the ENCHANTED KINGDOM! ✨'],
      [10, 'Look! The ROYAL SKYWHALE, the best pet of all! 🐋👑'],
      [15, 'Crystal butterflies, magic runes... but watch out for the fire and essence! 🔥'],
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
