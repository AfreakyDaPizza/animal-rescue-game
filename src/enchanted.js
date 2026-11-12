// Biome 7：Enchanted Kingdom（小朋友 2026-10-17）
// Biome 6 座山頂條橋 → 閘門 → 天空王國（同閘門一樣高）：水晶樹、魔法符文、水晶蝴蝶、浮喺天上嘅島、
// 遠處嘅皇宮、天上有隻好大嘅 Royal Skywhale 游嚟游去；障礙物係火同 essence（hazards.js），Boss 係 Enchanted Royal Guardian
// 閘門未開（NEW_BIOME_DATE 未到）嗰陣成個王國收埋（kingdomView.visible），等開門動畫先俾人見到

import * as THREE from 'three';
import { BIOME_LENGTH } from './data/biomeList.js';
import { addPlatform, addCollider, bakeStatic, kingdom, KINGDOM_Y, KINGDOM_PET_HALF_X } from './world.js';
import { buildSkywhaleModel, buildCrystalButterfly, buildRune } from './enchantedModels.js';
import { buildParkour, inParkourZone } from './kingdomParkour.js'; // 🍄 Issue #18：跳菇上浮島 → 👼 Isotope Angel
import { forestFloor, forestPaths, glowStream, forestTree, grassTuft, glowFlower, rockBase, pulseMats, castleWalls, royalCarpet, flowerBed, hedgeRing, crownStatue, bannerPole } from './enchantedArt.js'; // 🌳 Issue #19：魔法森林新美術

export const kingdomView = { group: null, reveal: false }; // reveal：開門動畫俾人睇住先
// 閘門嘅位同高度（開門動畫用）
export const KINGDOM_STAIRS = { get top() { return KINGDOM_Y; }, z: -6 * BIOME_LENGTH }; // top 用 getter：world.js 同呢個檔互相 import，開機時 KINGDOM_Y 未有

const materials = new Map();
const mat = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }));
  return materials.get(key);
};
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


// 邊界（Issue #23 小朋友：「Make the kingdom border look like kingdom again ... with trees」）：
// 城牆 + 塔 + 掛旗（castleWalls），牆外一圈巨型魔法樹（行唔到去，淨係睇）
function kingdomBorder(root, rect, rand) {
  castleWalls(root, rect, rand);
  for (let z = rect.maxZ - 6; z > rect.minZ - 10; z -= 11) {
    forestTree(root, rect.minX - 12 - rand() * 4, z - rand() * 4, 2.6 + rand() * 1.2, rand, 4);
    forestTree(root, rect.maxX + 12 + rand() * 4, z - rand() * 4, 2.6 + rand() * 1.2, rand, 4);
  }
  for (let x = rect.minX - 6; x < rect.maxX + 6; x += 12) forestTree(root, x + rand() * 4, rect.minZ - 14 - rand() * 4, 2.6 + rand() * 1.2, rand, 4);
}

// 中間嘅水晶噴泉（發光水）；小朋友：要行得穿（冇撞嘢圈）
function crystalFountain(root, x, z) {
  add(root, new THREE.CylinderGeometry(6, 6.6, 1.2, 12), mat(0xede7f6), x, 0.6, z);
  add(root, new THREE.CylinderGeometry(5.4, 5.4, 0.2, 12), mat(0x40c4ff, { emissive: 0x00b0ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 }), x, 1.15, z, false);
  add(root, new THREE.CylinderGeometry(0.8, 1.2, 5, 8), mat(0xede7f6), x, 3.2, z);
  const c = add(root, new THREE.OctahedronGeometry(2), mat(0xea80fc, { emissive: 0xd500f9, emissiveIntensity: 1.3, flatShading: true }), x, 7.4, z, false);
  c.scale.y = 1.6;
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
  const base = rockBase(w, KINGDOM_Y, d); // Issue #19：下面係石（以前紫色）
  base.position.set(0, -KINGDOM_Y / 2 - 0.01, cz);
  root.add(base);
  kingdomBorder(root, rect, rand);
  castle(root, rect);
  crystalFountain(root, 0, cz + 8);
  crystalFountain(root, -40, cz - 40);
  crystalFountain(root, 40, cz - 40);
  rainbowArch(root, rect.maxZ - 22);
  // 中間大道（由閘門去皇宮）：Issue #19 改做石仔路（縫發金光）+ 路邊石 + 燈柱，中間廣場 + 去兩邊噴泉嘅細路
  forestPaths(view, root, rect, cz, rand);
  // 發光小溪：彩虹拱門後面橫過成個王國（行得過）
  const streamZ = glowStream(view, root, rect, rect.maxZ - 42, rand);
  // 水晶樹、奇怪發光樹、蘑菇（避開中間條路同噴泉）
  const spot = () => {
    for (;;) {
      const x = (rand() * 2 - 1) * (half - 7);
      const z = rect.minZ + 16 + rand() * (d - 28);
      if (Math.abs(x) > 6 && Math.hypot(x, z - (cz + 8)) > 9) return [x, z];
    }
  };
  // 樹（Issue #22 小朋友：「the trees stuffed inside is pretty messy」）：唔再一叢叢亂種 → 整整齊齊一行行
  // 動物範圍（KINGDOM_PET_HALF_X）、大道、噴泉、跳菇路線、小溪都唔種
  const petZone = (x, z, m) => Math.abs(x) < KINGDOM_PET_HALF_X + 4 + m && z > rect.minZ + 64 - m && z < rect.minZ + 156 + m;
  const fountains = [[0, cz + 8, 13], [-40, cz - 40, 10], [40, cz - 40, 10]];
  const trees = [];
  const plant = (x, z, kind, s) => {
    if (petZone(x, z, 2) || inParkourZone(x, z, 7) || Math.abs(z - streamZ(x)) < 4.5) return;
    if (fountains.some(([fx, fz, r]) => Math.hypot(x - fx, z - fz) < r)) return;
    trees.push([x, z]);
    if (kind === 'crystal') crystalTree(root, x, z, s, rand);
    else if (kind === 'strange') strangeTree(root, x, z, s, rand);
    else forestTree(root, x, z, s, rand, 0, kind);
    addCollider(x, z, 0.8);
  };
  // 閘門入嚟：大道兩邊一行粉紅花樹（彩虹拱門嗰度留空）
  for (let z = rect.maxZ - 8; z > rect.maxZ - 38; z -= 7) if (Math.abs(z - (rect.maxZ - 22)) > 2.5) for (const x of [-10, 10]) plant(x, z, 2, 0.9);
  // 兩邊果園：三行，每行同一款（綠樹 / 水晶樹 / 青樹），每 10 米一棵
  for (let z = rect.maxZ - 10; z > rect.minZ + 12; z -= 10) {
    for (const side of [-1, 1]) {
      plant(side * 54, z, 0, 1);
      plant(side * 63, z - 5, 'crystal', 1.3);
      plant(side * 71, z, 1, 1);
    }
  }
  // 皇宮前面：一行奇怪發光蘑菇樹（細細棵）
  for (const x of [-40, -30, -20, 20, 30, 40]) plant(x, rect.minZ + 20, 'strange', 1);
  kingdomView.trees = trees.length;

  // 中間（Issue #22：「add some stuff in the middle」）：全部矮矮哋，唔會遮住動物
  royalCarpet(view, 0, rect.maxZ - 2, cz + 8 + 11); // 👑 紅地氈（金邊）
  royalCarpet(view, 0, cz + 8 - 11, rect.minZ + 14);
  hedgeRing(root, 0, cz + 8, 13.5); // 噴泉廣場外面一圈矮樹籬
  for (const [x, z] of [[-9, cz - 1], [9, cz - 1], [-9, cz + 17], [9, cz + 17]]) bannerPole(root, x, z, x < 0 ? 0x6a1b9a : 0xc62828);
  for (const sx of [-1, 1]) {
    for (const z of [cz + 8 - 12, cz + 8 + 12]) flowerBed(root, sx * 21, z, 8, 4, rand); // 廣場兩邊
    for (const z of [rect.minZ + 72, rect.minZ + 146]) flowerBed(root, sx * 26, z, 10, 4, rand); // 動物範圍前後
  }
  // 金皇冠雕像：大道兩邊每 22 米一對
  for (let z = rect.maxZ - 54; z > rect.minZ + 24; z -= 22) {
    if (Math.abs(z - (cz + 8)) < 16) continue;
    for (const x of [-6, 6]) {
      crownStatue(root, x, z);
      addCollider(x, z, 0.8);
    }
  }
  // 草叢 + 發光花：淨係牆腳一條（以前周圍都係，好亂）
  const edgeSpot = () => [(rand() < 0.5 ? -1 : 1) * (half - 1 - rand() * 3), rect.minZ + 6 + rand() * (d - 12)];
  for (let n = 0; n < 140; n++) {
    const [x, z] = edgeSpot();
    if (n % 3) grassTuft(root, x, z, rand);
    else glowFlower(root, x, z, rand);
  }
  bakeStatic(root, view);
  const floorMat = forestFloor(view, rect); // Issue #19：青苔草地（以前霓虹格仔）

  // ---- 會郁嘅嘢 ----
  // 地上嘅魔法符文（慢慢轉，大大個）
  const runes = Array.from({ length: 18 }, (_, i) => {
    const r = buildRune([0xb388ff, 0x80d8ff, 0xffe57f, 0xea80fc, 0xffd54f][i % 5]);
    const [x, z] = spot();
    r.position.set(x, 0.06, z);
    r.scale.setScalar(2.2 + rand() * 1.5);
    view.add(r);
    return r;
  });
  // 浮喺天上嘅島（大啲、多啲）
  const islands = Array.from({ length: 16 }, (_, i) => {
    const s = 1 + rand() * 1.4;
    const g = new THREE.Group();
    add(g, new THREE.ConeGeometry(4 * s, 6 * s, 7), mat(0x6d4c41, { flatShading: true }), 0, -3 * s, 0).rotation.x = Math.PI;
    add(g, new THREE.CylinderGeometry(4.1 * s, 4.1 * s, 0.8 * s, 7), mat(0x7e57c2), 0, 0.4 * s, 0);
    if (i % 2) strangeTree(g, 0, 0, 0.8 * s, rand);
    else crystalTree(g, 0, 0, 0.8 * s, rand);
    const y = 18 + rand() * 26;
    let x = (rand() * 2 - 1) * (half - 8);
    const z = rect.minZ + 10 + rand() * (d - 20);
    if (inParkourZone(x, z, 10)) x = -x; // 🍄 唔好擋住跳菇路線：搬去另一邊
    g.position.set(x, y, z);
    view.add(g);
    return { g, y, i };
  });
  // 🍄 跳菇 Parkour（Issue #18）：企得嘅浮島 + 彈彈蘑菇 + 光點路線；島上面種棵細樹（行得穿）
  const parkour = buildParkour(view, (g, x, z, s) => crystalTree(g, x, z, s * 0.85, rand));
  // 天上嘅 Royal Skywhale（好大隻，喺王國上面游圈）
  const whale = buildSkywhaleModel();
  const wsize = new THREE.Box3().setFromObject(whale).getSize(new THREE.Vector3());
  whale.scale.multiplyScalar(26 / Math.max(wsize.x, wsize.y, wsize.z));
  if (whale.userData) whale.userData.flying = true;
  // 放大咗 2.7 倍：個光暈 sprite 會變成 40 米闊、疊加發光，飛過鏡頭前面成個畫面白晒（bloom 再放大）→ 收埋佢
  if (whale.userData?.halo) whale.userData.halo.visible = false;
  const whaleG = new THREE.Group();
  whaleG.add(whale);
  view.add(whaleG);
  // 水晶蝴蝶（多啲）
  const butterflies = Array.from({ length: 50 }, (_, i) => { // 少啲（唔好遮住動物）
    const b = buildCrystalButterfly([0xea80fc, 0x80d8ff, 0xffe57f, 0xb9f6ca, 0xb388ff][i % 5]);
    b.scale.setScalar(1.6);
    view.add(b);
    const [x, z] = spot();
    return { b, x, z, h: 1.5 + rand() * 8, r: 1 + rand() * 4, s: 0.5 + rand(), p: rand() * 6 };
  });
  // 魔法閃粉 → 螢火蟲（Issue #19）
  const SP = 500;
  const sp = new Float32Array(SP * 3);
  const spSeeds = Array.from({ length: SP }, () => ({ x: (rand() * 2 - 1) * (half - 2), z: rect.minZ + 2 + rand() * (d - 4), k: rand(), s: 0.3 + rand() * 0.5 }));
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparkles = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xe6ff8a, size: 0.32, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparkles.frustumCulled = false;
  view.add(sparkles);

  // 未開嘅時候：成個王國俾一大團魔法霧遮住（小朋友：未 unlock 就要好大霧）
  const fogTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const fog = new THREE.Group();
  const fogMat = [0xede7f6, 0xd1c4e9, 0xe1f5fe].map((color) => new THREE.SpriteMaterial({ map: fogTex, color, transparent: true, opacity: 0.95, depthWrite: false, fog: false }));
  const puffs = [];
  for (let i = 0; i < 500; i++) {
    const front = i >= 420; // 最尾 80 嚿：閘門後面一排（由橋望過去最易見到）
    const edge = i < 140; // 頭 140 嚿貼住王國邊（由外面望入嚟最密）
    const x = front || !edge ? (rand() * 2 - 1) * half : (i % 2 ? 1 : -1) * (half - rand() * 10);
    const z = front ? rect.maxZ - 4 - rand() * 22 : edge && i % 4 < 2 ? rect.maxZ - rand() * 12 : rect.minZ + rand() * d;
    const s = new THREE.Sprite(fogMat[i % 3]);
    const size = 30 + rand() * 30;
    s.scale.set(size, size * 0.8, 1);
    const y = KINGDOM_Y + 2 + rand() * 46;
    s.position.set(x, y, z);
    fog.add(s);
    puffs.push({ s, x, y, p: rand() * 6 });
  }
  live.add(fog);
  let fogK = 1;

  return (dt, t) => {
    // 開門動畫時先慢慢散；其他時候即刻跟住開唔開（以前一入遊戲都要 3 秒先散，成個王國白濛濛）
    if (kingdomView.reveal) fogK = Math.max(0, fogK - dt / 3);
    else fogK = kingdom.open ? 0 : 1;
    fog.visible = fogK > 0;
    if (fog.visible) {
      fogMat.forEach((m) => (m.opacity = 0.95 * fogK));
      for (const f of puffs) f.s.position.set(f.x + Math.sin(t * 0.1 + f.p) * 3, f.y + Math.sin(t * 0.2 + f.p) * 1.5, f.s.position.z);
    }
    view.visible = kingdom.open || kingdomView.reveal;
    if (!view.visible) return;
    runes.forEach((r, i) => r.userData.spin?.(t + i));
    parkour(dt, t);
    floorMat.emissiveIntensity = 0.7 + Math.sin(t * 1.5) * 0.3; // 地上啲細花一閃一閃
    for (const p of pulseMats) p.m.emissiveIntensity = p.base + Math.sin(t * p.speed) * p.amp; // 石仔路縫、小溪
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
      // Issue #19：螢火蟲：喺低空飄嚟飄去（以前一直升上天）
      sp[i * 3] = s.x + Math.sin(t * 0.3 * s.s + i) * 2.5;
      sp[i * 3 + 1] = 0.6 + s.k * 6 + Math.sin(t * 0.8 * s.s + i * 1.7) * 0.8;
      sp[i * 3 + 2] = s.z + Math.cos(t * 0.25 * s.s + i * 0.7) * 2.5;
    }
    spGeo.attributes.position.needsUpdate = true;
  };
}

// ================= 開門動畫（小朋友：上到山頂有段 cutscene，之後見到新生態區） =================
// 鐵枝慢慢升起、漩渦消失 → 鏡頭飛過閘門、沿住樓梯落去 → 望上天見到 Royal Skywhale → 水晶蝴蝶同符文
export function playKingdomReveal({ camera, playMovie, once, shake, play, gate, onDone }) {
  const V = (x, y, z) => new THREE.Vector3(x, y + KINGDOM_Y - 13, z); // 鏡頭高度係王國喺 13 米嗰陣度嘅，而家跟住 KINGDOM_Y 升
  const Z = KINGDOM_STAIRS.z;
  kingdomView.reveal = true;
  playMovie(camera, {
    length: 21,
    skipText: 'Click or press any key to keep playing ▶',
    shots: [
      [0, 5, { p: V(4, 15.5, Z + 12), l: V(0, 18, Z) }, { p: V(2, 15, Z + 8), l: V(0, 17, Z) }], // 喺山頂／橋上面望住閘門打開
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
