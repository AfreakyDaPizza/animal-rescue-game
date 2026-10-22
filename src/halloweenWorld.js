// 🎃 Halloween 世界：樣（小朋友 Issue #6）—— 地圖喺 halloweenShape.js
// 第一次入去先起（buildHalloween，配合載入畫面），唔郁嘅嘢每區 bakeStatic 焊埋
// 仲有：Hub 中間嘅 Halloween 傳送門（取代噴水池）、恐怖天空（深紫夜空、大月光、行雷、霧）
// Issue #9 美術重做：地形、路、燈、道具嘅樣喺 halloweenArt.js

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { addCollider, addPlatform, bakeStatic } from './world.js';
import { makeSign, dynamicSign, THEMES } from './signs.js';
import { seededRandom } from './spawnRoll.js';
import { state } from './state.js';
import { HALLOWEEN_OPEN_DATE, HALLOWEEN_FOG_NEAR, HALLOWEEN_FOG_FAR } from './data/balance.js';
import {
  HW_X, RUINS, RUINS_SAFE_R, HW_PORTAL, HW_BIOMES, MANOR, MANOR_GATE_Z, EGG_GRAVEYARD, EGG_SLOTS, STATION, STATION_PLATFORM, TRACK_X,
  GHOST_WORLD, GHOST_TRAIN_STOP, STATUE_OF_HALLOWEEN, VACUUM_SHOP, LAKE_WATER, LAKE_SHORE, DOCK, FISH_SPOT, ROD_SHOP,
  hwZoneAt, inHalloween,
} from './halloweenShape.js';
import {
  M, cone, grp, tiledBox, canvasTex, seeded, plankTex, shingleTex, brickTex, pathTex, glowTex,
  buildTerrain, flatSdf, terrainHeight, path, nearPath, lightPool, halo, instanced, tuftGeo, tuftMat, rockGeo,
  pumpkin as artPumpkin, vine, tombstone, ironFence, lanternPost, deadTree, crypt, scarecrow, twistedTree, shroomCluster, giantShroom,
  mistLayer, wispCloud,
} from './halloweenArt.js';
import { buildGhostTown } from './ghostTown.js';
import { inHell } from './hellShape.js'; // 🔥 Halloween World 2


// ---------- 狀態 ----------
// inside：玩家喺唔喺 Halloween 世界；sky：恐怖天空 0→1（慢慢變）；built：起咗未
export const halloween = { inside: false, built: false, sky: 0, flash: 0, nextFlash: 6 };

const openDate = () => {
  const [y, m, d] = HALLOWEEN_OPEN_DATE.split('-').map(Number);
  return new Date(y, m - 1, d);
};
// 開咗未：到咗日期，或者秘密控制台提早開（state.halloweenEarly）
export const isHalloweenOpen = (now = new Date()) => !!state.halloweenEarly || now >= openDate();
export const halloweenOpenText = () => openDate().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
export function halloweenCountdown(now = new Date()) {
  const ms = Math.max(0, openDate() - now);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

// ---------- 材質／形狀 ----------
const materials = new Map();

// ---------- 材質／形狀 ----------
const mat = (color, extra = {}) => M(color, { roughness: 0.85, ...extra });
const glow = (color, intensity = 2) => mat(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.5 });
const geos = new Map();
const geo = (key, make) => {
  if (!geos.has(key)) geos.set(key, make());
  return geos.get(key);
};
const box = (w, h, d) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
const rbox = (w, h, d) => geo(`r${w}|${h}|${d}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2));
const ball = (r, w = 12, h = 9) => geo(`s${r}|${w}`, () => new THREE.SphereGeometry(r, w, h));
const cyl = (rt, rb, h, n = 10) => geo(`c${rt}|${rb}|${h}|${n}`, () => new THREE.CylinderGeometry(rt, rb, h, n));
function add(parent, g, m, x, y, z, shadow = true) {
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// 南瓜（新樣喺 halloweenArt.js；保留舊嘅參數次序俾傳送門用）
function pumpkin(root, _live, x, z, s = 1, lantern = false, rot = 0, y = 0) {
  return artPumpkin(root, x, z, s, lantern, rot, y);
}

// 蠟燭（放喺 live，閃下閃下）
function candle(live, flames, x, y, z, s = 1) {
  add(live, cyl(0.08 * s, 0.09 * s, 0.4 * s, 8), mat(0xf3ecd8), x, y + 0.2 * s, z, false);
  const f = add(live, geo('flame', () => new THREE.ConeGeometry(0.07, 0.2, 6)), new THREE.MeshBasicMaterial({ color: 0xffb74d }), x, y + 0.5 * s, z, false);
  f.scale.setScalar(s);
  flames.push(f);
}

// 漩渦紋理（傳送門）
function swirlTexture(c1, c2, c3) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.25, c1);
  grad.addColorStop(0.65, c2);
  grad.addColorStop(1, c3);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.lineWidth = 5;
  for (let k = 0; k < 5; k++) {
    g.strokeStyle = k % 2 ? 'rgba(255,170,60,0.55)' : 'rgba(255,255,255,0.35)';
    g.beginPath();
    for (let a = 0; a < 10; a += 0.08) {
      const r = a * 12;
      const x = 128 + Math.cos(a + (k * Math.PI * 2) / 5) * r;
      const y = 128 + Math.sin(a + (k * Math.PI * 2) / 5) * r;
      if (a === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 一道 Halloween 傳送門（拱門 + 漩渦 + 南瓜 + 烏鴉 + 向上飄嘅火花）；Hub 同出生點都用
function buildPortalArch(parent, live, x, z, rotY, { plinth = true } = {}) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  const lg = new THREE.Group();
  lg.position.copy(g.position);
  lg.rotation.y = rotY;
  live.add(lg);
  const stone = mat(0x2d2638);
  const trim = mat(0x4a3d5c);
  if (plinth) {
    add(g, cyl(4.6, 4.9, 0.5, 28), mat(0x221d2b), 0, 0.25, 0);
    add(g, cyl(4.0, 4.2, 0.2, 28), mat(0x3b2f4a), 0, 0.55, 0);
  }
  const base = plinth ? 0.65 : 0;
  for (const s of [-1, 1]) {
    add(g, rbox(1.1, 6.2, 1.1), stone, s * 3.1, base + 3.1, 0);
    add(g, rbox(1.4, 0.5, 1.4), trim, s * 3.1, base + 0.25, 0);
    add(g, rbox(1.4, 0.5, 1.4), trim, s * 3.1, base + 6.2, 0);
    add(g, geo('spire', () => new THREE.ConeGeometry(0.6, 1.4, 4)), trim, s * 3.1, base + 7.1, 0).rotation.y = Math.PI / 4;
    pumpkin(g, null, s * 3.9, plinth ? 3.4 : 1.2, 0.9, true, Math.PI); // 拱門兩邊南瓜燈（面向前）
    pumpkin(g, null, s * 2.6, plinth ? -3.4 : -1.2, 0.7, true, 0);
  }
  // 頂嘅半圓拱
  const arc = add(g, geo('arc', () => new THREE.TorusGeometry(3.1, 0.5, 8, 24, Math.PI)), stone, 0, base + 6.2, 0);
  arc.scale.z = 1.4;
  add(g, geo('arcGlow', () => new THREE.TorusGeometry(2.55, 0.12, 8, 40)), glow(0xff8f00, 2.2), 0, base + 3.4, -0.1, false);
  // 烏鴉企喺柱頂
  for (const s of [-1, 1]) {
    const crow = new THREE.Group();
    crow.position.set(s * 3.1, base + 6.6, 0);
    add(crow, rbox(0.5, 0.45, 0.8), mat(0x0d0b10), 0, 0.25, 0);
    add(crow, rbox(0.38, 0.36, 0.36), mat(0x0d0b10), 0, 0.6, -0.35);
    add(crow, geo('beak', () => new THREE.ConeGeometry(0.08, 0.3, 4)), mat(0xffb300), 0, 0.58, -0.62).rotation.x = -Math.PI / 2;
    for (const e of [-1, 1]) add(crow, box(0.06, 0.06, 0.04), glow(0xff1744, 2.5), e * 0.12, 0.66, -0.53, false);
    crow.rotation.y = s * 0.4;
    g.add(crow);
  }
  // 漩渦（live：會轉）
  const swirl = add(lg, new THREE.CircleGeometry(2.45, 40), new THREE.MeshBasicMaterial({ map: swirlTexture('#ff9a3c', '#7b1fa2', '#12001f'), transparent: true, opacity: 0.95, side: THREE.DoubleSide, fog: false }), 0, base + 3.4, 0, false);
  const swirl2 = add(lg, new THREE.CircleGeometry(2.45, 40), new THREE.MeshBasicMaterial({ map: swirlTexture('#b2ff59', '#4a148c', '#000000'), transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 0, base + 3.4, -0.02, false);
  // 火花（向上飄）
  const N = 70;
  const pos = new Float32Array(N * 3);
  const seeds = Array.from({ length: N }, () => [Math.random() * Math.PI * 2, Math.random() * 2.5, Math.random(), 0.4 + Math.random()]);
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparks = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffa040, size: 0.16, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sparks.frustumCulled = false;
  lg.add(sparks);
  return {
    g, lg, swirl, swirl2, base,
    update(t) {
      swirl.rotation.z = -t * 0.9;
      swirl2.rotation.z = t * 1.4;
      swirl.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
      seeds.forEach(([a, r, ph, sp], i) => {
        const k = (t * 0.25 * sp + ph) % 1;
        pos[i * 3] = Math.cos(a + t * 0.5) * r * (1 - k * 0.4);
        pos[i * 3 + 1] = base + 0.5 + k * 7;
        pos[i * 3 + 2] = Math.sin(a + t * 0.5) * 0.6;
      });
      pg.attributes.position.needsUpdate = true;
    },
  };
}

// ================= Hub 中間嘅 Halloween 傳送門（取代噴水池）=================
// 未開：發光嘅紅色屏障 + 鎖鏈 + 倒數牌；開咗：漩渦轉、可以撳 E 入去
export function buildHubPortal(scene, x, z) {
  const root = new THREE.Group();
  const live = new THREE.Group();
  scene.add(live);
  const portal = buildPortalArch(root, live, x, z, Math.PI); // 面向 -z（由 Hub 入口行過嚟就見到）
  // 地上一圈南瓜同蠟燭
  const flames = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.3 && Math.cos(a) < 0) continue; // 前面留位
    if (i % 2) pumpkin(root, null, x + Math.cos(a) * 5.6, z + Math.sin(a) * 5.6, 0.75, true, -a + Math.PI / 2);
    else candle(live, flames, x + Math.cos(a) * 5.4, 0, z + Math.sin(a) * 5.4, 1.4);
  }
  bakeStatic(root, scene);
  addCollider(x, z, 4.4);
  // 未開：屏障 + 鎖鏈
  const barrier = new THREE.Group();
  barrier.position.copy(portal.lg.position);
  barrier.rotation.y = Math.PI;
  live.add(barrier);
  const wall = add(barrier, new THREE.CircleGeometry(2.5, 40), new THREE.MeshBasicMaterial({ color: 0xff3d00, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }), 0, portal.base + 3.4, -0.25, false);
  const chain = mat(0x9e9e9e, { metalness: 0.8, roughness: 0.3 });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const k = i / 8 - 0.5;
      const link = add(barrier, geo('link', () => new THREE.TorusGeometry(0.18, 0.05, 6, 10)), chain, k * 5.2, portal.base + 3.4 + s * k * 3.6, -0.35, false);
      link.rotation.y = i % 2 ? Math.PI / 2 : 0;
    }
  }
  add(barrier, rbox(0.9, 1.1, 0.4), mat(0x8d6e63, { metalness: 0.4 }), 0, portal.base + 3.4, -0.45, false); // 鎖頭
  const sign = dynamicSign(5.6, 1.6);
  sign.mesh.position.set(x, 1.6, z - 5.2);
  sign.mesh.rotation.y = Math.PI; // 牌面向 -z（Hub 入口嗰邊）
  live.add(sign.mesh);
  return {
    near: (pos) => Math.hypot(pos.x - x, pos.z - z) < 6.6,
    update(t, open) {
      portal.update(t);
      barrier.visible = !open;
      wall.material.opacity = 0.28 + Math.sin(t * 3) * 0.1;
      portal.swirl.material.opacity = open ? 0.95 : 0.4;
      flames.forEach((f, i) => f.scale.setScalar(1.4 * (0.85 + Math.sin(t * 13 + i * 2.1) * 0.15)));
      sign.mesh.visible = !open;
      if (!open && Math.floor(t * 2) % 2 === 0) sign.draw(THEMES.orange, [{ text: '🎃 HALLOWEEN WORLD', size: 0.36 }, { text: `Opens ${halloweenOpenText()}`, size: 0.2 }, { text: `⏳ ${halloweenCountdown()}`, size: 0.26 }]);
    },
  };
}

// ================= 起成個 Halloween 世界（第一次入去先起）=================
// Issue #9（小朋友：「Halloween map is very ugly」）→ 成個重新設計：
// - 地形一大塊：行得嘅地方平，出面變山（以前係一嚿嚿方塊懸崖）；每區自己地色，邊界慢慢溝
// - 彎彎曲曲嘅石仔路連住每個地方；路邊燈柱 + 地上一圈光（加亮，配合 Bloom）
// - 每區有自己嘅地標：🎃 墓穴、鐵欄墓園、大南瓜燈、稻草人；👻 發光扭曲樹、大發光菇、霧池、鬼火；
//   🏚️ 歪歪斜斜嘅大屋（窗會發光）、枯樹大道、死咗嘅花園、鐵閘
// - 每一區自己 bakeStatic（望唔到嗰區會被 cull），細嘢用 InstancedMesh／Points
// progress(0–1) 俾載入畫面；每起完一區就等一格畫面，唔會成個畫面凍住
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const X = HW_X;
// 路（每條都係 [x, z] 點；彎嘅位置避開閘柱、Boss 台、蛋墳場墓碑台）
export const PATHS = {
  spine1: [[X, -15], [X, -24], [X + 5, -36], [X + 8, -48], [X + 2, -62], [X - 7, -76], [X - 7, -92], [X, -104], [X + 2, -118], [X, -131]],
  spine2: [[X, -129], [X - 6, -144], [X - 9, -160], [X - 3, -176], [X + 6, -190], [X + 6, -205], [X, -220], [X, -241]],
  spine3: [[X, -239], [X + 4, -252], [X + 5, -266], [X + 1, -282], [X, -298], [X, -314], [X, -323]],
  east: [[X + 17, 0], [X + 26, 1.5], [X + 34, -0.5], [X + 41, 0]],
  west: [[X - 17, 0], [X - 26, 2], [X - 35, 0.5], [X - 43.5, 0]],
  rod: [[X - 27, 1.5], [X - 28.5, 6], [X - 29.5, 10]], // 魚竿舖 2026-10-21 搬咗去碼頭南邊（ROD_SHOP z = 10）
  south: [[X, 16], [X, 26], [X + 0.6, 38], [X - 0.6, 48], [X, 62]],
};

export async function buildHalloween(scene, progress = () => {}) {
  const live = new THREE.Group(); // 會郁嘅嘢
  scene.add(live);
  const rand = seededRandom('halloween-world-v2');
  const flameSpots = []; // 蠟燭火（最後變一個 InstancedMesh）
  const steps = [];
  const mists = [];
  const clouds = [];
  // 每一區自己一個 root，起完即刻焊（每區一舊 → 望唔到就 cull）
  const region = (fn) => steps.push(() => {
    const root = new THREE.Group();
    fn(root);
    bakeStatic(root, scene);
  });
  const candle = (root, x, y, z, s = 1) => {
    add(root, cyl(0.08 * s, 0.09 * s, 0.4 * s, 6), mat(0xf3ecd8), x, y + 0.2 * s, z, false);
    flameSpots.push([x, y + 0.5 * s, z, s]);
  };
  const [b1, b2, b3] = HW_BIOMES;
  // 揀一個位：唔近路、唔近其他嘢（避開 avoid 入面每個 [x, z, r]）
  const avoid = [];
  const free = (x, z, r) => !nearPath(x, z, r) && avoid.every(([ax, az, ar]) => (ax - x) ** 2 + (az - z) ** 2 > (ar + r) ** 2);
  const inEggZone = (b, x, z, r = 0) => x > b.eggZone.minX - r - 1 && x < b.eggZone.maxX + r + 1 && z > b.eggZone.minZ - r - 1 && z < b.eggZone.maxZ + r + 1;
  // 會擋路嘅大嘢唔好放喺蛋出嘅範圍（蛋會出喺入面，攞唔到）
  const solidOk = (x, z, r) => free(x, z, r) && !HW_BIOMES.some((b) => inEggZone(b, x, z, r));
  const tufts = []; // [x, y, z, s, ry, color]
  const rocks = [];

  // ---- 地形 + 所有路（路要最先畫，等道具識得避開）----
  steps.push(() => {
    buildTerrain(scene);
    const root = new THREE.Group();
    path(root, PATHS.spine1, { width: 4.4, kind: 'warm' });
    path(root, PATHS.spine2, { width: 4, kind: 'moss' });
    path(root, PATHS.spine3, { width: 4.4, kind: 'slate' });
    path(root, PATHS.east, { width: 4, kind: 'warm' });
    path(root, PATHS.west, { width: 3.8, kind: 'sand' });
    path(root, PATHS.rod, { width: 2.8, kind: 'sand' });
    path(root, PATHS.south, { width: 3.2, kind: 'warm' });
    bakeStatic(root, scene);
    // 唔好放嘢嘅位：閘、Boss 台、傳送門、出生點入面（留俾攤位／Echo）
    for (const b of HW_BIOMES) {
      avoid.push([X, b.rect.maxZ, 12], [b.bossHome.x, b.bossHome.z, 7]);
    }
    avoid.push([RUINS.x, RUINS.z, RUINS.r + 1], [X, MANOR_GATE_Z, 7], [ROD_SHOP.x, ROD_SHOP.z, 5]);
  });

  // ---- ⭕ 出生點：石圈廢墟（安全區）----
  region((root) => {
    const disc = add(root, new THREE.CylinderGeometry(RUINS.r - 0.6, RUINS.r - 0.6, 0.06, 72), new THREE.MeshStandardMaterial({ map: ruinsFloorTex(), roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), RUINS.x, 0.03, RUINS.z, false);
    disc.receiveShadow = true;
    add(root, geo('rune', () => new THREE.RingGeometry(2.2, 2.55, 48)), glow(0xc9a6ff, 1.6), RUINS.x, 0.08, RUINS.z, false).rotation.x = -Math.PI / 2; // 中間魔法陣
    add(root, geo('rune2', () => new THREE.RingGeometry(1.2, 1.32, 6)), glow(0xc9a6ff, 1.6), RUINS.x, 0.08, RUINS.z, false).rotation.x = -Math.PI / 2;
    lightPool(root, RUINS.x, RUINS.z, 6, 0xb388ff, 0.35);
    // 一圈哥德式爛石柱（4 個方向留路，同以前一樣嘅位）
    const pillars = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
      const gapDir = [0, Math.PI / 2, Math.PI, Math.PI * 1.5].some((d) => Math.abs(Math.atan2(Math.sin(a - d), Math.cos(a - d))) < 0.35);
      if (gapDir) continue;
      const px = RUINS.x + Math.cos(a) * (RUINS.r - 1.5);
      const pz = RUINS.z + Math.sin(a) * (RUINS.r - 1.5);
      const tall = pillars.length % 4 !== 3; // 每 4 條有一條斷咗
      const h = tall ? 5.6 + rand() * 0.8 : 2 + rand();
      ruinPillar(root, px, pz, h, tall, rand);
      pillars.push({ x: px, z: pz, h, tall, a });
    }
    // 同一個角落嘅兩條高柱頂架一條爛橫樑（拱門）＋ 掛燈
    for (let i = 0; i + 1 < pillars.length; i += 2) {
      const p = pillars[i], q = pillars[i + 1];
      if (!p.tall || !q.tall) continue;
      const y = Math.min(p.h, q.h) + 0.9;
      const len = Math.hypot(q.x - p.x, q.z - p.z);
      const beam = add(root, tiledBox(len + 1.2, 0.8, 1.2, 1.5), stoneM(0x8f8a9c), (p.x + q.x) / 2, y, (p.z + q.z) / 2);
      beam.rotation.y = -Math.atan2(q.z - p.z, q.x - p.x);
      const mx = (p.x + q.x) / 2, mz = (p.z + q.z) / 2;
      add(root, box(0.05, 1.2, 0.05), mat(0x1f1b26), mx, y - 1, mz, false);
      add(root, box(0.36, 0.5, 0.36), glow(0xffb74d, 2.4), mx, y - 1.8, mz, false);
      halo(root, mx, y - 1.8, mz, 1.2, 0xffb74d, 0.35);
      lightPool(root, mx, mz, 4, 0xffa040, 0.3);
    }
    // 柱與柱之間矮爛石牆（喺圈邊，唔會擋到 4 條路）
    for (let i = 0; i + 1 < pillars.length; i += 2) {
      const p = pillars[i], q = pillars[i + 1];
      for (let k = 1; k < 4; k++) {
        const t = k / 4;
        const a = p.a + (q.a - p.a) * t;
        const wx = RUINS.x + Math.cos(a) * (RUINS.r - 1.2), wz = RUINS.z + Math.sin(a) * (RUINS.r - 1.2);
        const h = 0.6 + rand() * 1.2;
        add(root, tiledBox(2.3, h, 0.9, 1.5), stoneM(0x7f7a8c), wx, h / 2, wz).rotation.y = -a + Math.PI / 2;
        addCollider(wx, wz, 0.9);
      }
    }
    // 4 個入口兩邊：燈柱
    for (const d of [0, Math.PI / 2, Math.PI, Math.PI * 1.5])
      for (const s of [-1, 1]) {
        const a = d + s * 0.24;
        const lx = RUINS.x + Math.cos(a) * (RUINS.r - 2.2), lz = RUINS.z + Math.sin(a) * (RUINS.r - 2.2);
        lanternPost(root, lx, lz, 0xffb74d, rand, 3.2);
        addCollider(lx, lz, 0.3);
      }
    // 蠟燭圍住魔法陣
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      candle(root, RUINS.x + Math.cos(a) * 3.2, 0.06, RUINS.z + Math.sin(a) * 3.2, 1);
    }
    // 安全區光圈（地上淡淡一圈綠光）
    const safe = add(live, new THREE.RingGeometry(RUINS_SAFE_R - 0.25, RUINS_SAFE_R, 96), new THREE.MeshBasicMaterial({ color: 0x69f0ae, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }), RUINS.x, 0.1, RUINS.z, false);
    safe.rotation.x = -Math.PI / 2;
    // 歡迎牌
    for (const ry of [0, Math.PI]) {
      const sign = makeSign([{ text: '🎃 SPAWN RUINS', size: 0.4 }, { text: 'Safe zone - Bosses cannot enter!', size: 0.2 }], 5, 1.4, THEMES.purple);
      sign.position.set(RUINS.x, 3.2, RUINS.z - 6 - (ry ? 0.05 : 0));
      sign.rotation.y = ry;
      live.add(sign);
    }
    for (const s of [-1, 1]) add(root, box(0.2, 3.2, 0.2), mat(0x2b2433), RUINS.x + s * 2.3, 1.6, RUINS.z - 6.03); // 牌柱
    addCollider(RUINS.x - 2.3, RUINS.z - 6, 0.25);
    addCollider(RUINS.x + 2.3, RUINS.z - 6, 0.25);
    // 指路牌（4 個方向）
    const way = [
      ['⬆ 🎃 Pumpkin Graveyard', RUINS.x, RUINS.z - RUINS.r + 3, 0],
      ['🚂 Train Station ➡', RUINS.x + RUINS.r - 3, RUINS.z - 3, -Math.PI / 2],
      ['⬅ 🎣 Fishing Lake', RUINS.x - RUINS.r + 3, RUINS.z - 3, Math.PI / 2],
      ['🪦 Egg Graveyard ⬇', RUINS.x + 4, RUINS.z + RUINS.r - 3, Math.PI],
    ];
    for (const [text, sx, sz, ry] of way) {
      const s = makeSign([{ text, size: 0.3 }], 4.4, 0.8, THEMES.orange);
      s.position.set(sx, 2.4, sz);
      s.rotation.y = ry;
      live.add(s);
    }
    for (let i = 0; i < 60; i++) { // 石縫草
      const a = rand() * Math.PI * 2, r = 6 + rand() * 16;
      tufts.push([RUINS.x + Math.cos(a) * r, 0.02, RUINS.z + Math.sin(a) * r, 0.6 + rand() * 0.5, rand() * 3, 0x6f8a4c]);
    }
  });
  // ---- 返 Hub 嘅傳送門 ----
  let backPortal = null;
  region((root) => {
    backPortal = buildPortalArch(root, live, HW_PORTAL.x, HW_PORTAL.z, Math.PI, { plinth: false }); // 面向 -z（出生點中間）
    for (const s of [-1, 1]) addCollider(HW_PORTAL.x + s * 3.1, HW_PORTAL.z, 0.9);
    lightPool(root, HW_PORTAL.x, HW_PORTAL.z - 2, 5, 0xff9a3c, 0.35);
    const lab = makeSign([{ text: '🌀 Back to the Hub', size: 0.32 }], 3.6, 0.7, THEMES.purple);
    lab.position.set(HW_PORTAL.x, 7.9, HW_PORTAL.z - 0.4);
    lab.rotation.y = Math.PI;
    live.add(lab);
  });

  // ---- 🎃 Pumpkin Graveyard ----
  region((root) => {
    const r = b1.rect;
    biomeGate(root, live, r.maxZ, '🎃 PUMPKIN GRAVEYARD', THEMES.orange, 'pumpkin');
    addBossHomeMark(root, b1, 0xff6d00);
    // 墓穴（地標）：兩邊，門向住條路
    for (const [x, z, ry] of [[X - 32, -48, -Math.PI / 2], [X + 32, -74, Math.PI / 2], [X - 33, -112, -Math.PI / 2]]) {
      crypt(root, x, z, ry, 0x7dffb0);
      addCollider(x, z, 3.6);
      addCollider(x + (ry < 0 ? -1 : 1) * 1.5, z, 3.2);
      avoid.push([x, z, 6]);
    }
    // 巨型南瓜燈（以前嘅位）
    for (const [x, z] of [[X - 26, r.minZ + 30], [X + 28, r.maxZ - 30], [X - 20, r.maxZ - 18]]) {
      pumpkin(root, null, x, z, 3.2, true, Math.atan2(X - x, -5));
      lightPool(root, x, z, 7, 0xff9a3c, 0.4);
      halo(root, x, 1.6, z, 4, 0xff9a3c, 0.16);
      addCollider(x, z, 2.4);
      avoid.push([x, z, 4]);
    }
    // 有鐵欄圍住嘅墓地（一排排墓碑）
    const plots = [
      { minX: X + 15, maxX: X + 34, minZ: -44, maxZ: -27 },
      { minX: X - 36, maxX: X - 15, minZ: -76, maxZ: -60 },
      { minX: X + 13, maxX: X + 35, minZ: -116, maxZ: -96 },
    ];
    for (const p of plots) {
      const gateX = p.minX < X ? p.maxX : p.minX; // 近路嗰邊開個口
      ironFence(root, p.minX, p.minZ, p.maxX, p.minZ);
      ironFence(root, p.minX, p.maxZ, p.maxX, p.maxZ);
      const other = gateX === p.maxX ? p.minX : p.maxX;
      ironFence(root, other, p.minZ, other, p.maxZ);
      const mid = (p.minZ + p.maxZ) / 2;
      ironFence(root, gateX, p.minZ, gateX, mid - 2, 1.9);
      ironFence(root, gateX, mid + 2, gateX, p.maxZ, 1.9);
      for (let z = p.minZ + 3; z < p.maxZ - 1.5; z += 3.6)
        for (let x = p.minX + 2.5; x < p.maxX - 1.5; x += 2.8) if (rand() < 0.85) tombstone(root, x + (rand() - 0.5) * 0.6, z, 0.85 + rand() * 0.35, rand, Math.PI + (rand() - 0.5) * 0.3);
      avoid.push([(p.minX + p.maxX) / 2, mid, Math.max(p.maxX - p.minX, p.maxZ - p.minZ) / 2 + 1]);
      // 墓地入面一棵枯樹 + 燈
      lanternPost(root, gateX + (gateX > X ? 1.2 : -1.2), mid + 3, 0xffa040, rand, 3);
    }
    // 南瓜田：一行行藤 + 大大細細南瓜 + 稻草人
    const patches = [
      { minX: X + 13, maxX: X + 36, minZ: -70, maxZ: -52, crow: [X + 24, -61] },
      { minX: X - 37, maxX: X - 14, minZ: -100, maxZ: -84, crow: [X - 25, -92] },
      { minX: X - 36, maxX: X - 16, minZ: -40, maxZ: -26, crow: null },
    ];
    for (const p of patches) {
      for (let z = p.minZ + 1.5; z < p.maxZ; z += 3) {
        add(root, box(p.maxX - p.minX, 0.08, 1.4), mat(0x3a2b1c), (p.minX + p.maxX) / 2, 0.035, z, false); // 泥行
        vine(root, p.minX + 0.5, z, p.maxX - 0.5, z, rand);
        for (let x = p.minX + 1 + rand() * 2; x < p.maxX - 1; x += 1.8 + rand() * 2.2) {
          if (p.crow && Math.hypot(x - p.crow[0], z - p.crow[1]) < 2) continue;
          pumpkin(root, null, x, z + (rand() - 0.5) * 0.6, 0.45 + rand() * 0.6, rand() < 0.18, rand() * 6);
        }
      }
      if (p.crow) {
        scarecrow(root, p.crow[0], p.crow[1], Math.atan2(X - p.crow[0], 0) + Math.PI);
        addCollider(p.crow[0], p.crow[1], 0.4);
      }
      avoid.push([(p.minX + p.maxX) / 2, (p.minZ + p.maxZ) / 2, Math.max(p.maxX - p.minX, p.maxZ - p.minZ) / 2]);
    }
    // 散落嘅墓碑同南瓜（唔擋路）
    for (let i = 0; i < 90; i++) {
      const x = r.minX + 3 + rand() * (r.maxX - r.minX - 6);
      const z = r.minZ + 4 + rand() * (r.maxZ - r.minZ - 8);
      if (!free(x, z, 1.2)) continue;
      if (rand() < 0.55) tombstone(root, x, z, 0.8 + rand() * 0.45, rand, Math.PI + (rand() - 0.5) * 0.8);
      else pumpkin(root, null, x, z, 0.4 + rand() * 0.6, rand() < 0.3, rand() * 6);
    }
    // 枯樹（邊位多啲，唔放喺蛋區）
    for (let i = 0; i < 40; i++) {
      const side = rand() < 0.5 ? -1 : 1;
      const x = X + side * (12 + rand() * 28);
      const z = r.minZ + 4 + rand() * (r.maxZ - r.minZ - 8);
      if (!solidOk(x, z, 1.5)) continue;
      const t = deadTree(root, x, z, 0.9 + rand() * 0.6, rand);
      addCollider(x, z, 0.55);
      avoid.push([x, z, 2]);
      if (rand() < 0.3) { // 樹枝掛住南瓜燈
        add(root, box(0.04, 1, 0.04), mat(0x1f1b26), x + 0.9, t.h * 0.62, z, false);
        pumpkin(root, null, x + 0.9, z, 0.35, true, rand() * 6, t.h * 0.62 - 0.85);
      }
    }
    // 路邊燈柱（橙色）
    lampsAlong(root, PATHS.spine1, 14, 3.4, 0xffa040, rand);
    for (let i = 0; i < 260; i++) {
      const x = r.minX + rand() * (r.maxX - r.minX), z = r.minZ + rand() * (r.maxZ - r.minZ);
      if (!nearPath(x, z, 0.3)) tufts.push([x, 0, z, 0.7 + rand() * 0.7, rand() * 3, rand() < 0.5 ? 0x9a8550 : 0x7a7a40]);
    }
  });

  // ---- 👻 Hollow Sprites ----
  region((root) => {
    const r = b2.rect;
    biomeGate(root, live, r.maxZ, '👻 HOLLOW SPRITES', THEMES.green, 'orb');
    addBossHomeMark(root, b2, 0x00e676);
    // 🌫️ 霧池（地標）：發光水、石圈、蓮葉、發光蘆葦
    const pond = { x: X + 25, z: -156, r: 7.5 };
    {
      const water = add(root, new THREE.CircleGeometry(pond.r, 40), new THREE.MeshStandardMaterial({ color: 0x1d5a5a, emissive: 0x0e6a5a, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), pond.x, 0.05, pond.z, false);
      water.rotation.x = -Math.PI / 2;
      water.scale.set(1, 0.75, 1);
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const rr = pond.r + 0.3 + rand() * 0.5;
        const s = 0.5 + rand() * 0.5;
        add(root, rockGeo(), mat(0x6c6880, { flatShading: true }), pond.x + Math.cos(a) * rr, 0.15, pond.z + Math.sin(a) * rr * 0.75).scale.set(s, s * 0.6, s);
      }
      for (let i = 0; i < 7; i++) {
        const a = rand() * Math.PI * 2, rr = rand() * pond.r * 0.7;
        add(root, cyl(0.6, 0.6, 0.04, 10), mat(0x3f7a3a), pond.x + Math.cos(a) * rr, 0.09, pond.z + Math.sin(a) * rr * 0.75, false);
        if (i % 2) add(root, ball(0.16, 8, 6), glow(0xff8af5, 2), pond.x + Math.cos(a) * rr, 0.22, pond.z + Math.sin(a) * rr * 0.75, false);
      }
      for (let i = 0; i < 18; i++) { // 發光蘆葦
        const a = rand() * Math.PI * 2;
        const rx = pond.x + Math.cos(a) * (pond.r - 0.4), rz = pond.z + Math.sin(a) * (pond.r - 0.4) * 0.75;
        add(root, box(0.06, 1.4, 0.06), mat(0x2f5a3a), rx, 0.7, rz, false).rotation.z = (rand() - 0.5) * 0.3;
        add(root, box(0.12, 0.3, 0.12), glow(0x9dff6a, 1.8), rx, 1.45, rz, false);
      }
      lightPool(root, pond.x, pond.z, pond.r + 3, 0x3dffd0, 0.35);
      addCollider(pond.x, pond.z, pond.r - 1.2);
      avoid.push([pond.x, pond.z, pond.r + 2]);
    }
    // 大發光菇（地標）
    for (const [x, z, s, c] of [[X - 24, -142, 1.6, 0x18ffff], [X + 30, -184, 1.3, 0xea80fc], [X - 32, -188, 1.8, 0x76ff03], [X - 30, -236, 1.4, 0x18ffff], [X + 33, -236, 1.5, 0xea80fc], [X + 12, -137, 1.0, 0x76ff03]]) {
      if (!free(x, z, 1)) continue;
      giantShroom(root, x, z, s, c);
      addCollider(x, z, 0.6 * s);
      avoid.push([x, z, 3 * s]);
    }
    // 發光扭曲大樹
    const veins = [0x5dfcff, 0x9dff6a, 0xea80fc];
    let trees = 0;
    for (let i = 0; i < 220 && trees < 34; i++) {
      const x = r.minX + 3 + rand() * (r.maxX - r.minX - 6);
      const z = r.minZ + 4 + rand() * (r.maxZ - r.minZ - 8);
      const s = 0.95 + rand() * 0.6;
      if (!solidOk(x, z, 1.4 * s + 1)) continue;
      twistedTree(root, x, z, s, rand, { vein: veins[trees % 3], fruit: [0xff8af5, 0x5dfcff, 0xffe066][trees % 3], face: trees % 3 === 0 });
      addCollider(x, z, 0.8 * s);
      avoid.push([x, z, 2.2 * s]);
      trees++;
    }
    // 一叢叢發光菇
    const cols = [0x18ffff, 0x76ff03, 0xd500f9, 0x00e5ff, 0xffe066];
    for (let i = 0; i < 110; i++) {
      const x = r.minX + 2 + rand() * (r.maxX - r.minX - 4);
      const z = r.minZ + 2 + rand() * (r.maxZ - r.minZ - 4);
      if (!free(x, z, 0.3)) continue;
      shroomCluster(root, x, z, 0.6 + rand() * 0.9, cols[i % cols.length], rand);
    }
    // 樹樁同倒咗嘅樹
    for (let i = 0; i < 8; i++) {
      const x = r.minX + 4 + rand() * (r.maxX - r.minX - 8), z = r.minZ + 4 + rand() * (r.maxZ - r.minZ - 8);
      if (!free(x, z, 2)) continue;
      add(root, cyl(0.6, 0.75, 0.8, 7), mat(0x3b2b4c), x, 0.4, z);
      add(root, cyl(0.55, 0.55, 0.05, 7), mat(0x8a7a6a), x, 0.82, z, false);
      shroomCluster(root, x + 0.8, z + 0.3, 0.5, 0x18ffff, rand);
    }
    lampsAlong(root, PATHS.spine2, 13, 3.3, 0x5dffc8, rand);
    for (let i = 0; i < 260; i++) {
      const x = r.minX + rand() * (r.maxX - r.minX), z = r.minZ + rand() * (r.maxZ - r.minZ);
      if (!nearPath(x, z, 0.3)) tufts.push([x, 0, z, 0.6 + rand() * 0.6, rand() * 3, rand() < 0.5 ? 0x3f8a6a : 0x4f7a7a]);
    }
    mists.push(mistLayer(live, [r], rand, { color: 0x6fd8c0, opacity: 0.14, count: 12, y: [0.3, 1.3] }));
    mists.push(mistLayer(live, [{ minX: pond.x - 6, maxX: pond.x + 6, minZ: pond.z - 4, maxZ: pond.z + 4 }], rand, { color: 0xa8fff0, opacity: 0.35, count: 4, y: [0.4, 0.9], size: [10, 14] }));
  });

  // ---- 🏚️ Abandoned Manor ----
  region((root) => {
    const r = b3.rect;
    biomeGate(root, live, r.maxZ, '🏚️ ABANDONED MANOR', THEMES.purple, 'skull');
    addBossHomeMark(root, b3, 0xd500f9);
    buildManor(root, live, rand);
    avoid.push([MANOR.x, MANOR.z, 26]);
    // 枯樹大道（閘外，蛋區以南）+ 紫色燈
    for (let z = -296; z > -248; z -= 9) {
      for (const s of [-1, 1]) {
        const x = X + s * 12 + (rand() - 0.5) * 2;
        if (!solidOk(x, z, 1.5)) continue;
        deadTree(root, x, z, 1.25 + rand() * 0.3, rand, 0x2e2530);
        addCollider(x, z, 0.6);
        avoid.push([x, z, 2]);
      }
    }
    lampsAlong(root, PATHS.spine3, 12, 3.6, 0xc58cff, rand);
    // 爛涼亭（右）同古井（左）
    gazebo(root, X + 28, -266, rand);
    addCollider(X + 28, -266, 3.6);
    avoid.push([X + 28, -266, 6]);
    well(root, X - 27, -262);
    addCollider(X - 27, -262, 1.6);
    avoid.push([X - 27, -262, 3]);
    // 天使石像（壞咗翼）
    for (const [x, z] of [[X - 26, -285], [X + 25, -290]]) {
      angelStatue(root, x, z, Math.atan2(X - x, 0));
      addCollider(x, z, 1.2);
      avoid.push([x, z, 2.5]);
    }
    // 墓碑 + 枯樹（兩邊）
    for (let i = 0; i < 45; i++) {
      const x = r.minX + 3 + rand() * (r.maxX - r.minX - 6);
      const z = -246 - rand() * 50;
      if (!free(x, z, 1.2)) continue;
      if (rand() < 0.7) tombstone(root, x, z, 0.9 + rand() * 0.4, rand, Math.PI + (rand() - 0.5) * 0.6);
      else if (solidOk(x, z, 1.5)) {
        deadTree(root, x, z, 0.9 + rand() * 0.6, rand, 0x2e2530);
        addCollider(x, z, 0.55);
        avoid.push([x, z, 2]);
      }
    }
    for (let i = 0; i < 200; i++) {
      const x = r.minX + rand() * (r.maxX - r.minX), z = r.minZ + rand() * (r.maxZ - r.minZ);
      if (!nearPath(x, z, 0.3) && Math.abs(z - MANOR.z) > MANOR.d / 2 + 1.5) tufts.push([x, 0, z, 0.7 + rand() * 0.6, rand() * 3, rand() < 0.5 ? 0x8a7a8a : 0x7a6a5a]);
    }
    mists.push(mistLayer(live, [{ minX: r.minX, maxX: r.maxX, minZ: -330, maxZ: -250 }], rand, { color: 0xa898d8, opacity: 0.1, count: 8, y: [0.3, 1.0] }));
  });

  // ---- 山（地圖邊）：石頭、山上枯樹剪影 ----
  region((root) => {
    for (let i = 0; i < 2400 && rocks.length < 340; i++) {
      const x = X - 130 + rand() * 245, z = -410 + rand() * 600;
      const d = flatSdf(x, z);
      if (d < 1.6 || d > 9) continue;
      if (Math.abs(x - TRACK_X) < 5) continue;
      const s = 0.8 + rand() * 1.8;
      rocks.push([x, terrainHeight(x, z) + s * 0.2, z, s, rand() * 6, s * (0.55 + rand() * 0.4)]);
    }
    let n = 0;
    for (let i = 0; i < 1600 && n < 55; i++) {
      const x = X - 125 + rand() * 235, z = -400 + rand() * 520;
      const d = flatSdf(x, z);
      if (d < 4 || d > 34 || Math.abs(x - TRACK_X) < 6) continue;
      const t = deadTree(root, x, z, 1.1 + rand() * 0.9, rand, 0x241c26);
      t.g.position.y = terrainHeight(x, z) - 0.3;
      t.g.traverse((o) => (o.castShadow = false));
      n++;
    }
  });

  // ---- 🪦 蛋墳場 ----
  region((root) => {
    const r = EGG_GRAVEYARD;
    ironFence(root, r.minX, r.maxZ, r.maxX, r.maxZ, 2.2);
    ironFence(root, r.minX, r.minZ + 6, r.minX, r.maxZ, 2.2);
    ironFence(root, r.maxX, r.minZ + 6, r.maxX, r.maxZ, 2.2);
    ironFence(root, r.minX, r.minZ + 6, X - 3.5, r.minZ + 6, 2.2);
    ironFence(root, X + 3.5, r.minZ + 6, r.maxX, r.minZ + 6, 2.2);
    // 入口拱門：兩條石柱 + 鐵拱 + 兩盞燈
    const iron = mat(0x221e2a, { metalness: 0.5, roughness: 0.45 });
    for (const s of [-1, 1]) {
      add(root, tiledBox(0.9, 4.2, 0.9, 1.5), stoneM(0x8d889a), X + s * 3.6, 2.1, r.minZ + 6);
      add(root, box(1.1, 0.25, 1.1), stoneM(0x5f596e), X + s * 3.6, 4.3, r.minZ + 6);
      add(root, box(0.5, 0.6, 0.5), glow(0xc58cff, 2.4), X + s * 3.6, 4.75, r.minZ + 6, false);
      halo(root, X + s * 3.6, 4.75, r.minZ + 6, 1.3, 0xc58cff, 0.4);
      lightPool(root, X + s * 3.6, r.minZ + 5, 3.5, 0xc58cff, 0.3);
    }
    const arc = add(root, geo('gateArc', () => new THREE.TorusGeometry(3.6, 0.13, 6, 24, Math.PI)), iron, X, 4.3, r.minZ + 6, false);
    arc.scale.y = 0.55;
    const sign = makeSign([{ text: '🪦 EGG GRAVEYARD', size: 0.36 }, { text: 'Hatch your Halloween eggs here', size: 0.2 }], 4.6, 1.2, THEMES.purple);
    sign.position.set(X, 5.6, r.minZ + 5.8);
    sign.rotation.y = Math.PI;
    live.add(sign);
    // 8 個墓碑台（放蛋）：同以前一樣嘅位同高度
    for (const s of EGG_SLOTS) {
      add(root, tiledBox(2.4, 0.5, 2.4, 1.2), stoneM(0x6f6a7e), s.x, 0.25, s.z);
      add(root, tiledBox(1.8, 0.3, 1.8, 1.2), stoneM(0x8d889a), s.x, 0.6, s.z);
      add(root, tiledBox(1.2, 1.5, 0.35, 1), stoneM(0x9a95a6), s.x, 1.1, s.z + 1.2); // 後面個墓碑
      add(root, cyl(0.6, 0.6, 0.35, 12), stoneM(0x9a95a6), s.x, 1.85, s.z + 1.2).rotation.x = Math.PI / 2;
      const ring = add(root, geo('slotRing', () => new THREE.RingGeometry(0.55, 0.7, 24)), glow(0xb388ff, 1.8), s.x, 0.77, s.z, false);
      ring.rotation.x = -Math.PI / 2;
      candle(root, s.x - 0.9, 0.75, s.z + 0.9, 0.9);
      lightPool(root, s.x, s.z, 2.6, 0xb388ff, 0.25);
    }
    // 兩邊枯樹（同以前一樣有撞嘢）+ 燈柱
    for (let i = 0; i < 10; i++) {
      const x = r.minX + 2 + (i % 2) * (r.maxX - r.minX - 4), z = r.minZ + 12 + i * 5;
      deadTree(root, x, z, 0.8, rand);
      addCollider(x, z, 0.5);
    }
    for (const [x, z] of [[X - 17, 30], [X + 17, 30], [X - 17, 60], [X + 17, 60]]) lanternPost(root, x, z, 0xc58cff, rand, 3.2);
    // 後面一座墓穴做背景（喺欄外，行唔到）
    crypt(root, X, r.maxZ + 6.5, 0, 0xc58cff);
    for (let i = 0; i < 80; i++) {
      const x = r.minX + rand() * (r.maxX - r.minX), z = r.minZ + 6 + rand() * (r.maxZ - r.minZ - 6);
      if (!nearPath(x, z, 0.3) && EGG_SLOTS.every((s) => Math.hypot(s.x - x, s.z - z) > 2)) tufts.push([x, 0, z, 0.6 + rand() * 0.5, rand() * 3, 0x6f8a4c]);
    }
  });

  // ---- 🚂 火車站 ----
  region((root) => {
    const r = STATION;
    const p = STATION_PLATFORM;
    const plank = mat(0xffffff, { map: plankTex(0x6a5040) });
    const deck = add(root, tiledBox(p.maxX - p.minX, p.top, p.maxZ - p.minZ, 2), plank, (p.minX + p.maxX) / 2, p.top / 2, 0);
    deck.rotation.y = 0;
    add(root, tiledBox(p.maxX - p.minX + 0.4, 0.3, 0.4, 1), stoneM(0x6f6a7e), (p.minX + p.maxX) / 2, 0.15, p.minZ - 0.2); // 石邊
    add(root, tiledBox(p.maxX - p.minX + 0.4, 0.3, 0.4, 1), stoneM(0x6f6a7e), (p.minX + p.maxX) / 2, 0.15, p.maxZ + 0.2);
    add(root, box(0.3, 0.1, p.maxZ - p.minZ), glow(0xffd54f, 0.6), p.maxX - 0.3, p.top + 0.05, 0, false); // 黃線
    addPlatform(p, p.top);
    // 路軌（碎石床 + 枕木 + 鐵軌，一路伸出去霧入面）
    add(root, tiledBox(4.2, 0.12, 400, 2), mat(0xffffff, { map: pathTex('slate') }), TRACK_X, 0.06, 0, false);
    const rail = mat(0x8d8d98, { metalness: 0.7, roughness: 0.35 });
    for (const dx of [-0.75, 0.75]) add(root, box(0.15, 0.18, 400), rail, TRACK_X + dx, 0.24, 0, false);
    const sleepers = [];
    for (let z = -200; z <= 200; z += 1.6) sleepers.push([TRACK_X, 0.13, z, 1]);
    instanced(scene, box(2.4, 0.12, 0.35), mat(0x4a3424), sleepers);
    // 頂棚 + 柱 + 燈（以前嘅位）
    const iron = mat(0x221e2a, { metalness: 0.5, roughness: 0.45 });
    for (const z of [-8, -2.7, 2.7, 8]) {
      for (const x of [p.minX + 3, p.maxX - 2]) {
        add(root, box(0.3, 4.6, 0.3), iron, x, p.top + 2.3, z);
        add(root, box(0.6, 0.3, 0.6), iron, x, p.top + 0.15, z);
      }
      add(root, box(0.42, 0.55, 0.42), glow(0x9dff6a, 2.2), p.maxX - 2, p.top + 3.7, z + 0.45, false);
      halo(root, p.maxX - 2, p.top + 3.7, z + 0.45, 1.1, 0x9dff6a, 0.35);
      lightPool(root, p.maxX - 2.5, z + 0.4, 3.2, 0x9dff6a, 0.25, p.top + 0.06);
    }
    const roof = mat(0xffffff, { map: shingleTex(0x4a3e5c) });
    for (const s of [-1, 1]) {
      const rf = add(root, tiledBox(p.maxX - p.minX - 1, 0.3, (p.maxZ - p.minZ) / 2 + 1.6, 2), roof, (p.minX + p.maxX) / 2 + 0.5, p.top + 5.15, s * 5.2);
      rf.rotation.x = s * 0.18;
    }
    add(root, box(p.maxX - p.minX - 1, 0.4, 0.4), iron, (p.minX + p.maxX) / 2 + 0.5, p.top + 5.6, 0);
    // 售票亭（以前嘅位）
    add(root, tiledBox(4, 3.4, 3.4, 1.5), mat(0xffffff, { map: plankTex(0x5a4670) }), p.minX + 3, p.top + 1.7, p.maxZ - 2.6);
    const boothRoof = add(root, cone(3.4, 1.6, 4), mat(0xffffff, { map: shingleTex(0x3a2d4d) }), p.minX + 3, p.top + 4.2, p.maxZ - 2.6);
    boothRoof.rotation.y = Math.PI / 4;
    add(root, box(2, 1, 0.1), glow(0xffb74d, 1.6), p.minX + 3, p.top + 2.1, p.maxZ - 4.35, false);
    addCollider(p.minX + 3, p.maxZ - 2.6, 2);
    // 長櫈
    for (const z of [-5.4, 5.4]) bench(root, p.minX + 10, p.top, z);
    for (const z of [-5.4, 5.4]) bench(root, p.minX + 18, p.top, z);
    // 月台上嘅大鐘
    add(root, box(0.25, 3.8, 0.25), iron, p.minX + 14, p.top + 1.9, 0);
    const clock = add(root, cyl(0.7, 0.7, 0.25, 16), glow(0xfff3d6, 1.2), p.minX + 14, p.top + 4.1, 0);
    clock.rotation.z = Math.PI / 2;
    add(root, box(0.3, 0.06, 0.04), mat(0x1a1420), p.minX + 13.85, p.top + 4.2, 0, false).rotation.x = 0.6;
    add(root, box(0.3, 0.06, 0.04), mat(0x1a1420), p.minX + 14.15, p.top + 4.2, 0, false).rotation.x = -0.9;
    halo(root, p.minX + 14, p.top + 4.1, 0, 1.4, 0xfff3d6, 0.25);
    // 大牌：PHANTOM EXPRESS
    const big = makeSign([{ text: '🚂 PHANTOM EXPRESS', size: 0.44 }, { text: 'Arrives every hour · ghost hunting for 30 minutes', size: 0.18 }], 7, 1.5, THEMES.purple);
    big.position.set((p.minX + p.maxX) / 2, p.top + 6.4, 0);
    big.rotation.y = -Math.PI / 2;
    live.add(big);
    ironFence(root, r.minX + 4, r.minZ + 0.5, p.maxX, r.minZ + 0.5, 1.6, false);
    ironFence(root, r.minX + 4, r.maxZ - 0.5, p.maxX, r.maxZ - 0.5, 1.6, false);
    for (const [x, z] of [[r.minX + 6, -11], [r.minX + 6, 11], [r.minX + 16, -11], [r.minX + 16, 11]]) lanternPost(root, x, z, 0x9dff6a, rand, 3.4);
  });

  // ---- 🎣 釣魚湖 ----
  let waterMat = null;
  region((root) => {
    const w = LAKE_WATER;
    waterMat = new THREE.MeshStandardMaterial({ color: 0x14303f, emissive: 0x0a2430, emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.92 });
    const water = add(live, new THREE.PlaneGeometry(w.maxX - w.minX + 8, w.maxZ - w.minZ + 8).rotateX(-Math.PI / 2), waterMat, (w.minX + w.maxX) / 2, -0.15, (w.minZ + w.maxZ) / 2, false);
    water.receiveShadow = false;
    // 月光反射（水面一條光）
    const streak = add(live, new THREE.PlaneGeometry(4, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe8c0, map: glowTex(), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }), w.minX + 18, -0.1, -6, false);
    streak.rotation.y = 0.5;
    // 碼頭（木板 + 柱 + 燈）
    const d = DOCK;
    add(root, tiledBox(d.maxX - d.minX, 0.25, d.maxZ - d.minZ, 2), mat(0xffffff, { map: plankTex(0x6a5040) }), (d.minX + d.maxX) / 2, d.top - 0.12, 0).rotation.y = 0;
    addPlatform(d, d.top);
    for (let x = d.minX + 1; x < d.maxX; x += 3.2) for (const s of [-1, 1]) add(root, cyl(0.16, 0.16, 2.2, 6), mat(0x3a2a1e), x, -0.4, s * 2.1);
    for (const x of [d.minX + 2, (d.minX + d.maxX) / 2]) for (const s of [-1, 1]) {
      add(root, box(0.16, 1.6, 0.16), mat(0x3a2a1e), x, d.top + 0.8, s * 2.05, false);
      add(root, box(0.3, 0.38, 0.3), glow(0xffb74d, 2.4), x, d.top + 1.75, s * 2.05, false);
      halo(root, x, d.top + 1.75, s * 2.05, 0.9, 0xffb74d, 0.4);
      lightPool(root, x, s * 2, 3, 0xffb74d, 0.3, 0.02);
    }
    // 碼頭尾：燈籠 + 繩（以前嘅位）
    add(root, box(0.15, 2.2, 0.15), mat(0x3a2a1e), FISH_SPOT.x - 1, d.top + 1.1, 1.8, false);
    add(root, box(0.4, 0.5, 0.4), glow(0xffab40, 2.4), FISH_SPOT.x - 1, d.top + 2.3, 1.8, false);
    halo(root, FISH_SPOT.x - 1, d.top + 2.3, 1.8, 1.2, 0xffab40, 0.4);
    // 綁喺碼頭嘅小木船
    rowBoat(root, d.minX + 8, 4.2, 0.2);
    // 魚竿舖（同以前一樣大、一樣位）
    const shop = grp(root, ROD_SHOP.x, 0, ROD_SHOP.z, Math.PI / 2); // 面向 +x（出生點嗰邊）
    add(shop, tiledBox(4.6, 1.2, 2.2, 1.5), mat(0xffffff, { map: plankTex(0x6a5040) }), 0, 0.6, 0);
    for (const s of [-1, 1]) add(shop, box(0.25, 3.6, 0.25), mat(0x3a2a1e), s * 2.1, 1.8, 0.9);
    for (let i = 0; i < 6; i++) { // 綠白間條帳篷
      const st = add(shop, box(0.87, 0.2, 3.2), mat(i % 2 ? 0x2e7d32 : 0xe8f5e9), -2.18 + i * 0.87, 3.6, 0.4);
      st.rotation.x = -0.15;
    }
    for (let i = 0; i < 4; i++) add(shop, box(0.06, 2.6, 0.06), mat(0x8d6e63), -1.6 + i * 1.05, 1.9, 1.05).rotation.z = 0.25; // 掛住嘅魚竿
    add(shop, box(0.36, 0.45, 0.36), glow(0xffd54f, 2.2), 0, 3.15, 1.3, false);
    lightPool(root, ROD_SHOP.x + 2, ROD_SHOP.z, 4, 0xffd54f, 0.3);
    addCollider(ROD_SHOP.x, ROD_SHOP.z, 2.4);
    // 招牌由 fishing.js 起（發光嗰個），呢度唔再起多個
    // 蘆葦（水邊）+ 水上蓮葉蠟燭
    for (let i = 0; i < 90; i++) {
      const z = w.minZ + rand() * (w.maxZ - w.minZ);
      if (Math.abs(z) < 3.5) continue;
      const x = w.maxX - rand() * 3;
      const h = 1 + rand() * 1.1;
      add(root, box(0.07, h, 0.07), mat(0x4a6a3a), x, h / 2 - 0.3, z, false).rotation.z = (rand() - 0.5) * 0.3;
      if (rand() < 0.4) add(root, box(0.13, 0.36, 0.13), mat(0x5a3a22), x, h - 0.2, z, false);
    }
    for (let i = 0; i < 16; i++) {
      const x = w.minX + 6 + rand() * (w.maxX - w.minX - 14);
      const z = w.minZ + 4 + rand() * (w.maxZ - w.minZ - 8);
      if (Math.abs(z) < 4) continue;
      add(root, cyl(0.7, 0.7, 0.05, 10), mat(0x3f7a3a), x, -0.1, z, false);
      candle(root, x, -0.08, z, 0.8);
      lightPool(root, x, z, 1.6, 0xffb74d, 0.35, -0.08);
    }
    // 岸邊石同枯柳
    for (let i = 0; i < 16; i++) {
      const z = LAKE_SHORE.minZ + rand() * (LAKE_SHORE.maxZ - LAKE_SHORE.minZ);
      const x = LAKE_SHORE.minX + rand() * 4;
      if (Math.abs(z) < 4 || !free(x, z, 0.8)) continue;
      rocks.push([x, 0.1, z, 0.5 + rand() * 0.6, rand() * 6, 0.4]);
    }
    for (const [x, z] of [[X - 39, -24], [X - 38, 25], [X - 24, 26]]) {
      if (!free(x, z, 1)) continue;
      const t = deadTree(root, x, z, 1.2, rand, 0x34302a);
      addCollider(x, z, 0.6);
      for (let k = 0; k < 6; k++) { // 垂低嘅苔蘚（似柳樹）
        const a = (k / 6) * Math.PI * 2;
        add(root, box(0.08, 2 + rand(), 0.08), mat(0x5a7a4a), x + Math.cos(a) * 1.6, t.h * 0.75 - 1, z + Math.sin(a) * 1.6, false);
      }
    }
    for (let i = 0; i < 120; i++) {
      const x = LAKE_SHORE.minX + rand() * (LAKE_SHORE.maxX - LAKE_SHORE.minX), z = LAKE_SHORE.minZ + rand() * (LAKE_SHORE.maxZ - LAKE_SHORE.minZ);
      if (!nearPath(x, z, 0.3) && Math.hypot(x - ROD_SHOP.x, z - ROD_SHOP.z) > 4) tufts.push([x, 0, z, 0.7 + rand() * 0.6, rand() * 3, 0x5a8a4a]);
    }
    mists.push(mistLayer(live, [w], rand, { color: 0x8aa8c8, opacity: 0.1, count: 7, y: [0.05, 0.3], size: [16, 24] }));
  });

  // ---- 👻 Ghost World（坐火車先去到）----
  // 2026-10-22 小朋友：「make the ghost town more abandoned town vibe」→ 成個鬼鎮喺 ghostTown.js 起
  // （泥地、裂石仔街、爛屋、鐘樓、水塔、街燈、柵欄、枯樹……）；呢度淨係留返島嘅底、雕像、吸塵機舖、火車站
  let ghostTown = null;
  region((root) => {
    const G = GHOST_WORLD;
    add(root, cyl(G.r, G.r - 4, 3, 48), mat(0x2a1f3d, { flatShading: true }), G.x, -1.5, G.z, false);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      add(root, box(10, 8 + rand() * 10, 10), mat(0x1c1529, { flatShading: true }), G.x + Math.cos(a) * (G.r - 8), -8, G.z + Math.sin(a) * (G.r - 8)).rotation.y = a;
    }
    ghostTown = buildGhostTown(root, live);
    const S = STATUE_OF_HALLOWEEN;
    const stone = mat(0x5a5068);
    add(root, cyl(4.4, 5, 1, 8), mat(0x3a3048), S.x, 0.5, S.z);
    add(root, cyl(3.2, 3.6, 1.2, 8), stone, S.x, 1.6, S.z);
    add(root, rbox(2.6, 4.4, 1.8), stone, S.x, 4.4, S.z);
    add(root, geo('statueRobe', () => new THREE.ConeGeometry(2.2, 3.4, 8)), stone, S.x, 3.4, S.z);
    add(root, rbox(1.6, 1.6, 1.6), stone, S.x, 7.3, S.z);
    add(root, geo('witchHat', () => new THREE.ConeGeometry(1.4, 3, 8)), mat(0x2a2236), S.x, 9.6, S.z);
    add(root, cyl(2, 2, 0.15, 16), mat(0x2a2236), S.x, 8.1, S.z);
    for (const s of [-1, 1]) add(root, box(0.3, 0.2, 0.1), glow(0x69f0ae, 3), S.x + s * 0.35, 7.45, S.z - 0.82, false);
    pumpkin(root, null, S.x, S.z - 1.4, 1.3, true, 0, 4.6);
    addCollider(S.x, S.z, 4.6);
    const sign = makeSign([{ text: '🗿 STATUE OF HALLOWEEN', size: 0.36 }, { text: 'Trade 400 Soul Dust for a Halloween Shard', size: 0.18 }], 5.6, 1.2, THEMES.purple);
    sign.position.set(S.x, 2.4, S.z + 5.3);
    live.add(sign);
    const V = VACUUM_SHOP;
    add(root, rbox(4.4, 1.2, 2.2), mat(0x37474f), V.x, 0.6, V.z);
    for (const s of [-1, 1]) add(root, box(0.25, 3.4, 0.25), mat(0x263238), V.x + s * 2, 1.7, V.z + 0.9);
    add(root, box(5, 0.25, 3), mat(0x6a1b9a), V.x, 3.5, V.z + 0.3);
    add(root, cyl(0.5, 0.5, 1.4, 12), mat(0x00bcd4, { metalness: 0.5 }), V.x - 1.2, 1.9, V.z, false);
    add(root, box(0.15, 0.15, 1.6), mat(0x90a4ae), V.x - 1.2, 2.3, V.z - 0.8, false);
    addCollider(V.x, V.z, 2.4);
    const vs = makeSign([{ text: '🧹 GHOST VACUUMS', size: 0.36 }, { text: 'Upgrade with Soul Dust (Lv 1-5)', size: 0.19 }], 4.4, 1.1, THEMES.blue);
    vs.position.set(V.x, 4.3, V.z + 1.6);
    live.add(vs);
    const P = GHOST_TRAIN_STOP;
    add(root, box(16, 0.4, 5), mat(0x3e3227), P.x, 0.2, P.z + 2);
    for (const dx of [-0.75, 0.75]) add(root, box(60, 0.18, 0.15), mat(0x6d6d78, { metalness: 0.7 }), P.x, 0.2, P.z + 6.5 + dx, false);
  });

  // ---- 細嘢：草、石（InstancedMesh）----
  steps.push(() => {
    const byColor = new Map();
    for (const t of tufts) {
      if (!byColor.has(t[5])) byColor.set(t[5], []);
      byColor.get(t[5]).push(t);
    }
    for (const [c, list] of byColor) instanced(scene, tuftGeo(), tuftMat(c), list.map(([x, y, z, sc, ry]) => [x, y, z, sc, ry]));
    instanced(scene, rockGeo(), mat(0x4a4458, { flatShading: true }), rocks, { shadow: true });
  });

  // 遠處嘅大月光 + 雲 + 恐怖星（跟住鏡頭）
  const moon = new THREE.Group();
  steps.push(() => {
    add(moon, new THREE.CircleGeometry(24, 48), new THREE.MeshBasicMaterial({ map: moonTex(), fog: false, transparent: true }), 0, 0, 0, false);
    add(moon, new THREE.PlaneGeometry(130, 130), new THREE.MeshBasicMaterial({ color: 0xffd9a8, map: glowTex(), transparent: true, opacity: 0.4, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 0, -1, false);
    add(moon, new THREE.PlaneGeometry(260, 260), new THREE.MeshBasicMaterial({ color: 0xb48cff, map: glowTex(), transparent: true, opacity: 0.22, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 0, -2, false);
    // 幾朵深紫色雲飄過個月
    for (let i = 0; i < 4; i++) {
      const c = add(moon, new THREE.PlaneGeometry(80 + rand() * 40, 30 + rand() * 10), new THREE.MeshBasicMaterial({ color: 0x2a1a3e, map: cloudTex(), transparent: true, opacity: 0.7, fog: false, depthWrite: false }), 0, -22 + i * 14, 4 + i, false);
      clouds.push({ m: c, sp: 3 + rand() * 4, off: rand() * 200 });
    }
    moon.visible = false;
    scene.add(moon);
  });
  const stars = (() => {
    const p = [];
    for (let i = 0; i < 600; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(380);
      v.y = Math.abs(v.y) + 30;
      p.push(v.x, v.y, v.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe6cc, size: 1.4, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    pts.frustumCulled = false;
    pts.visible = false;
    scene.add(pts);
    return pts;
  })();

  // 一步步起（每步之後等一格，俾載入畫面郁）
  for (let i = 0; i < steps.length; i++) {
    steps[i]();
    progress((i + 1) / (steps.length + 1));
    await nextFrame();
  }
  progress(1);
  await nextFrame();

  // 會郁嘅嘢
  // 蠟燭火：一個 InstancedMesh
  const flameMesh = new THREE.InstancedMesh(geo('flame', () => new THREE.ConeGeometry(0.07, 0.2, 6)), new THREE.MeshBasicMaterial({ color: 0xffc46b }), flameSpots.length);
  flameMesh.frustumCulled = false;
  live.add(flameMesh);
  const fo = new THREE.Object3D();
  const wisps = [
    wispCloud(live, [b2.rect], 70, [0x5dfcff, 0x9dff6a, 0xea80fc, 0xffe066], rand, { size: 0.8, y: [0.6, 4.5] }),
    wispCloud(live, [b1.rect], 34, [0xffb74d, 0xffd54f], rand, { size: 0.5, y: [0.5, 3] }),
    wispCloud(live, [b3.rect], 22, [0xc58cff, 0xb388ff], rand, { size: 0.6, y: [1, 5] }),
    wispCloud(live, [LAKE_WATER, EGG_GRAVEYARD], 30, [0x9de8ff, 0xc58cff], rand, { size: 0.45, y: [0.3, 2.5] }),
    wispCloud(live, [{ minX: GHOST_WORLD.x - 40, maxX: GHOST_WORLD.x + 40, minZ: GHOST_WORLD.z - 40, maxZ: GHOST_WORLD.z + 40 }], 22, [0x9de8ff, 0xc8b8ff], rand, { size: 0.7 }), // 鬼鎮：少啲、淡啲（似塵埃／鬼火）
  ];
  const bats = makeBats(live, [
    [MANOR.x, MANOR.z, 8, 26, 9, 20, 16],
    [RUINS.x, RUINS.z, 10, 20, 10, 15, 6],
    [X, b1.rect.minZ + 50, 10, 30, 8, 14, 6],
  ], rand);
  halloween.built = true;
  const tmp = new THREE.Vector3();
  return {
    backPortal,
    nearBackPortal: (pos) => Math.hypot(pos.x - HW_PORTAL.x, pos.z - HW_PORTAL.z) < 3.4,
    update(dt, t, camPos, quality = 3) {
      const show = halloween.sky > 0.02;
      const hell = inHell(camPos.x, camPos.z); // 🔥 Hell：冇月亮、冇星（Hell 自己有灰燼同火星）
      live.visible = show && !hell;
      moon.visible = show && !hell;
      stars.visible = show && !hell;
      if (!show) return;
      backPortal.update(t);
      flameSpots.forEach(([x, y, z, s], i) => {
        fo.position.set(x, y, z);
        const k = 0.8 + Math.sin(t * 14 + i * 1.7) * 0.25;
        fo.scale.set(s, s * k, s);
        fo.updateMatrix();
        flameMesh.setMatrixAt(i, fo.matrix);
      });
      flameMesh.instanceMatrix.needsUpdate = true;
      for (const w of wisps) w.update(t);
      bats.update(t);
      for (const m of mists) m.update(t);
      if (waterMat) waterMat.emissiveIntensity = 0.55 + Math.sin(t * 1.3) * 0.12;
      ghostTown?.update(dt, t, camPos, quality);
      // 月亮：喺北邊天上（大屋後面），跟住鏡頭
      tmp.set(0.25, 0.36, -0.9).normalize().multiplyScalar(330);
      moon.position.copy(camPos).add(tmp);
      moon.lookAt(camPos);
      for (const c of clouds) c.m.position.x = ((t * c.sp + c.off) % 200) - 100;
      stars.position.copy(camPos);
      stars.material.opacity = 0.75 * halloween.sky;
    },
  };
}

// ---------- 美術小工具（只係呢個檔用）----------
const stoneM = (c) => mat(0xffffff, { map: brickTex(c) });
// 出生點地台：一圈圈石板（放射形），有裂紋同青苔
function ruinsFloorTex() {
  return canvasTex(512, (ctx, s) => {
    const rand = seeded(42);
    const img = ctx.createImageData(s, s);
    const rings = [[0, 0.16, 1], [0.16, 0.34, 12], [0.34, 0.4, 24, true], [0.4, 0.56, 20], [0.56, 0.72, 28], [0.72, 0.86, 34], [0.86, 1, 42]];
    const tones = [0x857b74, 0x79706d, 0x8e8378, 0x726a74, 0x7e746c, 0x716c7a];
    const col = new THREE.Color();
    const cache = new Map();
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const o = (y * s + x) * 4;
        const dx = (x - s / 2) / (s / 2), dy = (y - s / 2) / (s / 2);
        const r = Math.hypot(dx, dy);
        if (r > 1) {
          img.data[o + 3] = 255;
          continue;
        }
        const ri = rings.findIndex(([a, b]) => r >= a && r < b);
        const [r1, r2, n, mosaic] = rings[Math.max(0, ri)];
        let a = (Math.atan2(dy, dx) / (Math.PI * 2) + 0.5) * n + (ri % 2) * 0.5;
        const idx = Math.floor(a) % n;
        const fa = a - Math.floor(a);
        const fr = (r - r1) / (r2 - r1);
        const arc = n === 1 ? 99 : Math.min(fa, 1 - fa) * ((Math.PI * 2 * r) / n) * s * 0.5;
        const rad = Math.min(fr, 1 - fr) * (r2 - r1) * s * 0.5;
        const key = ri * 100 + idx;
        if (!cache.has(key)) cache.set(key, { c: mosaic ? (idx % 2 ? 0xd9822b : 0x7a52b8) : tones[Math.floor(rand() * tones.length)], l: (rand() - 0.5) * 0.08, moss: !mosaic && rand() < 0.25, gone: !mosaic && rand() < 0.035 && ri > 2 }); // 一圈橙紫馬賽克
        const st = cache.get(key);
        if (arc < 1.6 || rad < 1.6) col.setHex(0x4a4452);
        else if (st.gone) col.setHex(0x4a5a3a).offsetHSL(0, 0, (hashN(x, y) - 0.5) * 0.08); // 爛咗一嚿：見到草
        else {
          col.setHex(st.c).offsetHSL(0, 0, st.l + (hashN(x >> 1, y >> 1) - 0.5) * 0.04);
          if (arc < 4 || rad < 4) col.offsetHSL(0, 0, 0.04);
          if (st.moss && hashN(x >> 2, y >> 2) > 0.55 && rad < 10) col.lerp(new THREE.Color(0x5f7d3a), 0.6);
        }
        col.getRGB(_rgb, THREE.SRGBColorSpace); // canvas 要 sRGB
        img.data[o] = _rgb.r * 255;
        img.data[o + 1] = _rgb.g * 255;
        img.data[o + 2] = _rgb.b * 255;
        img.data[o + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  }, { wrap: false });
}
const _rgb = { r: 0, g: 0, b: 0 };
function hashN(x, y) {
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h);
}
// 月亮（淡黃、柔和坑紋）
function moonTex() {
  return canvasTex(256, (ctx, s) => {
    const rand = seeded(3);
    const g = ctx.createRadialGradient(s * 0.45, s * 0.42, s * 0.05, s / 2, s / 2, s / 2);
    g.addColorStop(0, '#fff8e4');
    g.addColorStop(0.8, '#f4dcae');
    g.addColorStop(1, '#e8c890');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 14; i++) {
      const a = rand() * Math.PI * 2, r = rand() * s * 0.38, cr = 6 + rand() * 22;
      ctx.fillStyle = 'rgba(190,150,110,0.22)';
      ctx.beginPath();
      ctx.arc(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r, cr, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { nearest: false, wrap: false });
}
// 雲（軟邊、一團團）
function cloudTex() {
  return canvasTex(256, (ctx, s) => {
    const rand = seeded(8);
    for (let i = 0; i < 22; i++) {
      const x = s * 0.15 + rand() * s * 0.7, y = s * 0.5 + (rand() - 0.5) * s * 0.3, r = 26 + rand() * 34;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.8)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, { nearest: false, wrap: false });
}
// 沿住路每隔 every 米擺一支燈柱（左右交替）
function lampsAlong(root, pts, every, off, color, rand) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const len = curve.getLength();
  const tan = new THREE.Vector3();
  let side = 1;
  for (let d = every * 0.6; d < len - 4; d += every) {
    const t = d / len;
    const p = curve.getPointAt(t);
    curve.getTangentAt(t, tan);
    const x = p.x - tan.z * off * side, z = p.z + tan.x * off * side;
    lanternPost(root, x, z, color, rand);
    addCollider(x, z, 0.3);
    side = -side;
  }
}
// 生態區入口：兩條石柱（以前嘅位）+ 頂飾 + 鐵拱 + 發光名牌
function biomeGate(root, live, z, title, theme, kind) {
  const color = { pumpkin: 0xffa040, orb: 0x5dffc8, skull: 0xc58cff }[kind];
  for (const s of [-1, 1]) {
    const x = X + s * 9;
    add(root, tiledBox(2.2, 0.8, 2.2, 1.5), stoneM(0x5f596e), x, 0.4, z);
    add(root, tiledBox(1.6, 7, 1.6, 1.5), stoneM(0x8d889a), x, 4.3, z);
    add(root, tiledBox(2.0, 0.5, 2.0, 1.5), stoneM(0x5f596e), x, 8, z);
    if (kind === 'pumpkin') pumpkin(root, null, x, z, 1.1, true, Math.PI, 8.25);
    else if (kind === 'orb') {
      add(root, ball(0.7, 12, 8), glow(color, 2.2), x, 9, z, false);
      halo(root, x, 9, z, 2, color, 0.35);
    } else {
      add(root, geo('gateSkull', () => new THREE.DodecahedronGeometry(0.7)), mat(0xe8e0d0), x, 8.85, z);
      for (const e of [-1, 1]) add(root, box(0.2, 0.18, 0.1), glow(0xc58cff, 2.6), x + e * 0.25, 8.95, z + 0.62, false);
      for (const e of [-1, 1]) add(root, box(0.2, 0.18, 0.1), glow(0xc58cff, 2.6), x + e * 0.25, 8.95, z - 0.62, false);
    }
    // 柱兩邊吊燈
    for (const fz of [-1, 1]) {
      add(root, box(0.36, 0.45, 0.36), glow(color, 2.2), x - s * 1.05, 5.2, z + fz * 0.4, false);
      lightPool(root, x - s * 1.3, z + fz * 1.6, 3.4, color, 0.3);
    }
    addCollider(x, z, 1.1);
  }
  // 兩塊牌中間一塊木板（由下面望唔會見到後面塊牌嘅反字）
  add(root, box(10.3, 1.5, 1.05), mat(0x2a2232), X, 7.0, z);
  // 鐵拱
  const arc = add(root, geo('bigArc', () => new THREE.TorusGeometry(9, 0.16, 6, 36, Math.PI)), mat(0x221e2a, { metalness: 0.5, roughness: 0.45 }), X, 7.4, z, false);
  arc.scale.y = 0.22;
  for (const fz of [0.6, -0.6]) {
    const sign = makeSign([{ text: title, size: 0.46 }], 10, 1.3, theme);
    sign.position.set(X, 7.0, z + fz);
    if (fz < 0) sign.rotation.y = Math.PI;
    live.add(sign);
  }
}
// Boss 屋企嘅記號（地上一圈發光符號 + 爛石台）
function addBossHomeMark(root, b, color) {
  const { x, z } = b.bossHome;
  add(root, cyl(5, 5.4, 0.3, 24), stoneM(0x5f596e), x, 0.15, z, false);
  const ring = add(root, geo('bossRing', () => new THREE.RingGeometry(4.2, 4.6, 24)), glow(color, 1.5), x, 0.32, z, false);
  ring.rotation.x = -Math.PI / 2;
  lightPool(root, x, z, 6.5, color, 0.22, 0.34);
}
// 出生點嘅哥德式石柱：地台 + 柱身（8 邊）+ 柱頭；斷咗嗰啲頂爛咗、地上有碎石
function ruinPillar(root, x, z, h, tall, rand) {
  const stone = stoneM(0x8f8a9c);
  const dark = stoneM(0x6a6478);
  add(root, tiledBox(2, 0.6, 2, 1.5), dark, x, 0.3, z);
  add(root, cyl(0.62, 0.7, h, 8), stone, x, 0.6 + h / 2, z);
  if (tall) {
    add(root, tiledBox(1.7, 0.45, 1.7, 1.5), dark, x, 0.6 + h + 0.22, z);
  } else {
    add(root, cone(0.66, 0.6, 5), stone, x, 0.6 + h + 0.25, z).rotation.y = rand() * 3; // 爛頂
    const chunk = add(root, cyl(0.6, 0.6, 1.4, 8), stone, x + 1.6, 0.6, z + 0.6);
    chunk.rotation.set(Math.PI / 2, rand() * 2, 0.3);
  }
  // 長春藤
  const ivy = mat(0x4a7a34);
  for (let k = 0; k < 3; k++) add(root, box(0.16, h * (0.3 + rand() * 0.4), 0.45), ivy, x + Math.cos(k * 2) * 0.62, 0.6 + h * 0.3, z + Math.sin(k * 2) * 0.62, false).rotation.y = k * 2;
  addCollider(x, z, 0.95);
}
// 長櫈（月台）
function bench(root, x, y, z) {
  const wood = mat(0xffffff, { map: plankTex(0x6a5040) });
  const iron = mat(0x221e2a, { metalness: 0.5, roughness: 0.45 });
  add(root, box(2.4, 0.12, 0.6), wood, x, y + 0.55, z);
  add(root, box(2.4, 0.5, 0.1), wood, x, y + 0.9, z + (z > 0 ? 0.3 : -0.3));
  for (const s of [-1, 1]) add(root, box(0.1, 0.55, 0.6), iron, x + s * 1.05, y + 0.27, z);
  addCollider(x, z, 0.8);
}
// 小木船
function rowBoat(root, x, z, ry) {
  const g = grp(root, x, -0.12, z, ry);
  const wood = mat(0x5a3e2a);
  add(g, box(1.4, 0.3, 4), wood, 0, 0.05, 0);
  for (const s of [-1, 1]) add(g, box(0.14, 0.5, 4), wood, s * 0.72, 0.3, 0).rotation.z = s * 0.2;
  for (const s of [-1, 1]) add(g, box(1.5, 0.5, 0.14), wood, 0, 0.3, s * 2);
  add(g, box(1.3, 0.1, 0.4), mat(0x6a5040), 0, 0.4, 0.3);
  add(g, box(0.1, 0.06, 2.6), mat(0x8d6e63), 0.5, 0.5, -0.3).rotation.y = 0.3; // 槳
  add(g, box(0.3, 0.38, 0.3), glow(0xffb74d, 2.2), 0, 0.6, -1.4, false);
}
// 爛涼亭（八角，屋頂爛咗一角）
function gazebo(root, x, z, rand) {
  const wood = mat(0xffffff, { map: plankTex(0x5a4a5e) });
  add(root, cyl(3.6, 3.8, 0.5, 8), stoneM(0x6f6a7e), x, 0.25, z);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    if (i === 5) continue; // 斷咗一條
    add(root, box(0.26, 3.4, 0.26), wood, x + Math.cos(a) * 3.2, 2.2, z + Math.sin(a) * 3.2);
  }
  const roof = add(root, cone(4.4, 2.6, 8), mat(0xffffff, { map: shingleTex(0x3a2d4d) }), x, 5.2, z);
  roof.rotation.z = 0.08;
  add(root, box(0.36, 0.5, 0.36), glow(0xc58cff, 2.4), x, 3.3, z, false);
  add(root, box(0.04, 0.6, 0.04), mat(0x1a1420), x, 3.85, z, false);
  halo(root, x, 3.3, z, 1.6, 0xc58cff, 0.4);
  lightPool(root, x, z, 5, 0xc58cff, 0.35, 0.52);
  void rand;
}
// 古井（石圈 + 木架 + 吊桶）
function well(root, x, z) {
  add(root, cyl(1.4, 1.5, 1.1, 12), stoneM(0x7d7889), x, 0.55, z);
  add(root, cyl(1.05, 1.05, 0.05, 12), glow(0x5dffc8, 1.2), x, 0.9, z, false); // 井水（發光）
  for (const s of [-1, 1]) add(root, box(0.2, 2.6, 0.2), mat(0x4a3424), x + s * 1.3, 1.3, z);
  add(root, box(2.9, 0.2, 0.2), mat(0x4a3424), x, 2.6, z);
  const rf = add(root, cone(2, 1, 4), mat(0xffffff, { map: shingleTex(0x3a2d4d) }), x, 3.2, z);
  rf.rotation.y = Math.PI / 4;
  add(root, box(0.03, 1, 0.03), mat(0x8d6e63), x, 2.05, z, false);
  add(root, cyl(0.25, 0.2, 0.35, 8), mat(0x6a5040), x, 1.4, z, false);
  lightPool(root, x, z, 3.2, 0x5dffc8, 0.28);
}
// 天使石像（翼斷咗一隻），面向條路
function angelStatue(root, x, z, ry) {
  const g = grp(root, x, 0, z, ry);
  const st = stoneM(0xa8a3b4);
  add(g, tiledBox(1.8, 1.2, 1.8, 1), stoneM(0x6f6a7e), 0, 0.6, 0);
  add(g, cone(0.75, 2.2, 8), st, 0, 2.3, 0);
  add(g, ball(0.32, 10, 8), st, 0, 3.6, 0);
  add(g, box(0.9, 1.2, 0.12), st, -0.55, 2.9, 0.35).rotation.set(0.3, 0.4, 0.4); // 翼
  add(g, box(0.5, 0.5, 0.12), st, 0.45, 2.8, 0.35).rotation.set(0.3, -0.4, -0.5); // 斷咗嗰隻
  add(g, cyl(0.4, 0.4, 0.04, 14), glow(0xfff3c4, 1.2), 0, 4.05, 0, false); // 光環
  for (const s of [-1, 1]) add(g, box(0.15, 0.7, 0.15), st, s * 0.35, 2.7, -0.4).rotation.x = -0.6;
}

// 🏚️ 恐怖大屋：歪歪斜斜、兩層、中間高塔、兩座圓塔（一座歪咗）、好多發光窗、門廊、煙囪、天窗
// 撞嘢同以前一樣（成座行唔入）
function buildManor(root, live, rand) {
  const { x, z, w, d } = MANOR;
  const front = z + d / 2;
  const siding = mat(0xffffff, { map: plankTex(0x6a5a80) });
  const siding2 = mat(0xffffff, { map: plankTex(0x5a4a70) });
  const trim = mat(0xd8cfe0);
  const dark = mat(0x2a2236);
  const roofM = mat(0xffffff, { map: shingleTex(0x3e3054) });
  const found = stoneM(0x6f6a7e);
  // 窗：外框 + 發光玻璃（有啲綠、有啲黑咗）+ 十字窗框 + 窗簾邊；有啲有歪咗嘅窗板
  const winColors = [0xffcf6b, 0xffcf6b, 0xffb84d, 0x9dff7a, 0xffcf6b];
  const windowAt = (parent, wx, wy, wz, ww = 1.6, wh = 2.6, ry = 0) => {
    const g = grp(parent, wx, wy, wz, ry);
    const lit = rand() < 0.8;
    const c = winColors[Math.floor(rand() * winColors.length)];
    add(g, box(ww + 0.4, wh + 0.4, 0.22), trim, 0, 0, 0, false);
    add(g, box(ww, wh, 0.26), lit ? glow(c, 2.2) : mat(0x15111b), 0, 0, 0.02, false);
    add(g, cone((ww + 0.4) / 2 + 0.15, 0.9, 3), trim, 0, wh / 2 + 0.55, 0, false).scale.z = 0.15; // 尖頂窗楣
    add(g, box(0.12, wh, 0.3), dark, 0, 0, 0.05, false);
    add(g, box(ww, 0.12, 0.3), dark, 0, wh * 0.1, 0.05, false);
    add(g, box(ww + 0.7, 0.18, 0.5), trim, 0, -wh / 2 - 0.2, 0.15, false); // 窗台
    if (rand() < 0.35) { // 歪咗嘅窗板
      const sh = add(g, box(ww * 0.55, wh * 0.95, 0.1), mat(0x3e2f50), -ww * 0.8, -0.2, 0.2, false);
      sh.rotation.z = 0.25;
    }
    if (lit) halo(g, 0, 0, 0.4, ww * 1.2, c, 0.18);
    return { lit, c };
  };
  // 地基
  add(root, tiledBox(w + 1.4, 1.4, d + 1.4, 2), found, x, 0.7, z);
  // 一樓
  add(root, tiledBox(w, 6.6, d, 2), siding, x, 1.4 + 3.3, z);
  add(root, box(w + 0.8, 0.5, d + 0.8), trim, x, 8.0, z);
  // 一樓窗（避開中間塔）
  for (const wx of [-14.5, -10.5, -6.6, 6.6, 10.5, 14.5]) {
    const info = windowAt(root, x + wx, 4.8, front + 0.05);
    if (info.lit) lightPool(root, x + wx, front + 3, 3.4, info.c, 0.28);
  }
  // 二樓（歪少少 → 似舊屋）
  const up = grp(root, x + 0.4, 8.25, z - 0.3, 0.02);
  up.rotation.z = 0.025;
  add(up, tiledBox(w - 3, 5.6, d - 2, 2), siding2, 0, 2.8, 0);
  add(up, box(w - 2.2, 0.4, d - 1.2), trim, 0, 5.7, 0);
  for (const wx of [-12.5, -8.3, 8.3, 12.5]) windowAt(up, wx, 2.8, (d - 2) / 2 + 0.05, 1.4, 2.2);
  // 屋頂（兩塊斜瓦 + 兩邊三角山牆）
  const D2 = (d - 2) / 2 + 0.6;
  const th = 0.62;
  for (const s of [-1, 1]) {
    const slab = add(up, tiledBox(w - 1.6, 0.4, D2 / Math.cos(th) + 0.8, 2), roofM, 0, 5.9 + (D2 / 2) * Math.tan(th), s * D2 / 2);
    slab.rotation.x = s * th;
  }
  const gable = geo('manorGable', () => {
    const sh = new THREE.Shape();
    sh.moveTo(-D2 + 0.6, 0);
    sh.lineTo(D2 - 0.6, 0);
    sh.lineTo(0, (D2 - 0.6) * Math.tan(th));
    sh.closePath();
    return new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false });
  });
  for (const s of [-1, 1]) add(up, gable, siding2, s * ((w - 3) / 2 - 0.2), 5.9, 0).rotation.y = Math.PI / 2;
  // 天窗（屋頂上兩個細屋仔，圓窗發光）
  for (const s of [-1, 1]) {
    const dm = grp(up, s * 8, 6.6, D2 * 0.45);
    add(dm, tiledBox(2.4, 2.2, 2.4, 1), siding2, 0, 0.6, 0);
    add(dm, cone(2, 1.6, 4), roofM, 0, 2.5, 0).rotation.y = Math.PI / 4;
    const rw = add(dm, cyl(0.55, 0.55, 0.2, 14), glow(0xffcf6b, 2.2), 0, 0.8, 1.22, false);
    rw.rotation.x = Math.PI / 2;
  }
  // 煙囪
  for (const s of [-1, 1]) {
    add(up, tiledBox(1.6, 7, 1.6, 1.5), stoneM(0x7a5a5a), s * 11, 8.5, -3);
    add(up, box(2, 0.4, 2), dark, s * 11, 12.1, -3);
  }
  // 中間高塔（前面凸出），尖頂 + 玫瑰圓窗
  const ctr = grp(root, x, 0, front - 2.2);
  add(ctr, tiledBox(9, 19, 6.4, 2), siding, 0, 1.4 + 9.5, 0);
  add(ctr, box(9.8, 0.5, 7.2), trim, 0, 8.0, 0);
  add(ctr, box(9.8, 0.5, 7.2), trim, 0, 20.6, 0);
  const spire = add(ctr, cone(7, 10, 4), roofM, 0, 25.9, 0);
  spire.rotation.y = Math.PI / 4;
  spire.rotation.z = -0.04;
  add(ctr, box(0.2, 3, 0.2), dark, 0.4, 32, 0); // 避雷針
  add(ctr, box(1.2, 0.2, 0.2), dark, 0.4, 32.5, 0);
  const rose = add(ctr, cyl(1.5, 1.5, 0.3, 20), glow(0xff8af5, 2.2), 0, 16.5, 3.25, false);
  rose.rotation.x = Math.PI / 2;
  add(ctr, geo('roseRing', () => new THREE.TorusGeometry(1.6, 0.18, 6, 24)), trim, 0, 16.5, 3.35, false);
  for (let i = 0; i < 4; i++) add(ctr, box(0.1, 3, 0.36), dark, 0, 16.5, 3.4, false).rotation.z = (i / 4) * Math.PI;
  halo(ctr, 0, 16.5, 3.8, 3, 0xff8af5, 0.2);
  windowAt(ctr, 0, 11.5, 3.25, 1.8, 2.8);
  // 大門 + 門廊
  add(ctr, box(3.6, 5.4, 0.3), mat(0x3a2418), 0, 1.4 + 2.7, 3.25);
  add(ctr, box(0.15, 5.0, 0.36), glow(0xffa040, 2.4), 0, 1.4 + 2.6, 3.3, false); // 門縫光
  add(ctr, cone(2.3, 1.4, 3), trim, 0, 7.4, 3.3, false).scale.z = 0.12;
  for (const s of [-1, 1]) {
    add(ctr, cyl(0.28, 0.32, 5.6, 10), trim, s * 3.4, 1.4 + 2.8, 5.4); // 門廊柱
    add(ctr, box(0.45, 0.6, 0.45), glow(0xc58cff, 2.4), s * 2.4, 5.2, 3.6, false); // 門燈
    halo(ctr, s * 2.4, 5.2, 3.9, 1.3, 0xc58cff, 0.4);
  }
  const porch = add(ctr, tiledBox(8, 0.35, 3.6, 2), roofM, 0, 7.3, 5.2);
  porch.rotation.x = 0.18;
  for (let i = 0; i < 3; i++) add(root, tiledBox(8 - i, 0.4, 1.4, 1.5), found, x, 0.2 + i * 0.4, front + 2.6 - i * 0.8); // 樓梯（同以前一樣）
  lightPool(root, x, front + 4, 6, 0xffa040, 0.35);
  // 兩座圓塔（以前嘅位），右邊嗰座歪咗
  for (const s of [-1, 1]) {
    const tx = x + s * (w / 2 + 2);
    const tower = grp(root, tx, 0, z + 2);
    tower.rotation.z = s > 0 ? -0.05 : 0;
    add(tower, cyl(3.6, 3.8, 20, 12), mat(0xffffff, { map: brickTex(0x7a7088) }), 0, 10, 0);
    add(tower, cyl(4.2, 4.2, 0.6, 12), trim, 0, 20.2, 0);
    add(tower, cone(4.5, 8, 12), roofM, 0, 24.5, 0);
    add(tower, box(0.15, 2.2, 0.15), dark, 0, 29.4, 0);
    add(tower, box(0.9, 0.5, 0.06), mat(0x6a1b9a), 0.45, 29.9, 0, false); // 爛旗
    for (const wy of [7, 14]) windowAt(tower, 0, wy, 3.62, 1.3, 2.4);
    addCollider(tx, z + 2, 4);
  }
  // 長春藤（一笪笪爬上牆）
  for (let i = 0; i < 10; i++) {
    const vx = x + (rand() - 0.5) * (w - 4);
    if (Math.abs(vx - x) < 5) continue;
    add(root, box(1.2 + rand(), 2 + rand() * 4, 0.12), mat(0x3a5a2e), vx, 2 + rand() * 2, front + 0.1, false);
  }
  // 撞嘢：大屋成座行唔入（同以前一樣）
  for (let ix = -w / 2 + 2; ix <= w / 2 - 2; ix += 4) for (let iz = -d / 2 + 2; iz <= d / 2 - 2; iz += 4) addCollider(x + ix, z + iz, 2.9);
  // ---- 前院：鐵閘 + 鐵欄（中間開咗，以前嘅位）+ 死咗嘅花園 ----
  const fz = MANOR_GATE_Z;
  ironFence(root, x - 36, fz, x - 5.8, fz, 2.8);
  ironFence(root, x + 5.8, fz, x + 36, fz, 2.8);
  const iron = mat(0x221e2a, { metalness: 0.5, roughness: 0.45 });
  for (const s of [-1, 1]) {
    const gx = x + s * 5;
    add(root, tiledBox(1.6, 5.2, 1.6, 1.5), stoneM(0x8d889a), gx, 2.6, fz);
    add(root, box(2, 0.4, 2), stoneM(0x5f596e), gx, 5.4, fz);
    // 石像鬼（蹲喺閘柱頂，友善啲：大眼）
    const gm = mat(0x7a7586);
    add(root, box(1.2, 1, 1.4), gm, gx, 6.1, fz);
    add(root, box(0.9, 0.8, 0.8), gm, gx, 6.9, fz + 0.6);
    for (const e of [-1, 1]) {
      add(root, box(0.18, 0.18, 0.05), glow(0xc58cff, 2.6), gx + e * 0.2, 7.0, fz + 1.02, false);
      add(root, cone(0.12, 0.5, 4), gm, gx + e * 0.3, 7.5, fz + 0.6, false);
      const wing = add(root, box(1.4, 0.9, 0.1), gm, gx + e * 0.9, 6.6, fz - 0.2, false);
      wing.rotation.y = e * 0.5;
    }
    addCollider(gx, fz, 1);
    // 打開咗嘅鐵閘門（向外）
    const gate = grp(root, x + s * 4.2, 0, fz, -s * 1.15);
    for (let k = 0; k < 7; k++) {
      add(gate, box(0.07, 3.2, 0.07), iron, -s * (0.3 + k * 0.55), 1.7, 0, false);
      add(gate, cone(0.08, 0.26, 4), iron, -s * (0.3 + k * 0.55), 3.4, 0, false);
    }
    for (const y of [0.5, 1.7, 3]) add(gate, box(3.8, 0.08, 0.06), iron, -s * 1.95, y, 0, false);
    // 閘柱頂燈
    lightPool(root, gx, fz + 2.5, 3.6, 0xc58cff, 0.3);
  }
  const garc = add(root, geo('manorArc', () => new THREE.TorusGeometry(5, 0.14, 6, 30, Math.PI)), iron, x, 5.6, fz, false);
  garc.scale.y = 0.35;
  // 死咗嘅花園：矮枯樹籬（沿住欄同屋前面）、枯玫瑰叢
  const hedge = mat(0x4a4632, { flatShading: true });
  for (const s of [-1, 1]) {
    for (let hx = 8; hx < 34; hx += 2.6) {
      const hh = 0.7 + rand() * 0.4;
      add(root, box(2.6, hh, 1.1), hedge, x + s * hx, hh / 2, fz - 1.4, false);
      if (rand() < 0.4) add(root, ball(0.16, 6, 5), glow(0xff4d8a, 1.4), x + s * hx + (rand() - 0.5), hh + 0.05, fz - 1.4, false); // 一朵玫瑰仲着緊
    }
    for (let hz = fz - 4; hz > front + 1.5; hz -= 2.6) add(root, box(1.1, 0.8, 2.6), hedge, x + s * 36.5, 0.4, hz, false);
  }
}

// 蝙蝠（InstancedMesh：身、左翼、右翼三個 draw call）；groups：[cx, cz, rMin, rMax, yMin, yMax, n]
function makeBats(live, groups, rand) {
  const list = [];
  for (const [cx, cz, rMin, rMax, yMin, yMax, n] of groups)
    for (let i = 0; i < n; i++) list.push({ cx, cz, r: rMin + rand() * (rMax - rMin), y: yMin + rand() * (yMax - yMin), sp: (0.4 + rand() * 0.5) * (rand() < 0.5 ? -1 : 1), p: rand() * 6 });
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.3, 0.45), mat(0x14101a), list.length);
  const wingG = (s) => new THREE.BoxGeometry(0.8, 0.04, 0.4).translate(s * 0.4, 0, 0);
  const wl = new THREE.InstancedMesh(wingG(-1), mat(0x2a2034), list.length);
  const wr = new THREE.InstancedMesh(wingG(1), mat(0x2a2034), list.length);
  for (const m of [body, wl, wr]) {
    m.frustumCulled = false;
    live.add(m);
  }
  const o = new THREE.Object3D();
  const w = new THREE.Object3D();
  return {
    update(t) {
      list.forEach((b, i) => {
        const a = t * b.sp + b.p;
        o.position.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(t * 2 + b.p) * 1.2, b.cz + Math.sin(a) * b.r);
        o.rotation.set(0, -a + (b.sp > 0 ? Math.PI : 0), 0);
        o.updateMatrix();
        body.setMatrixAt(i, o.matrix);
        const flap = Math.sin(t * 18 + b.p) * 0.9;
        for (const [m, s] of [[wl, -1], [wr, 1]]) {
          w.position.set(s * 0.15, 0.05, 0);
          w.rotation.set(0, 0, s * flap);
          w.updateMatrix();
          w.matrix.premultiply(o.matrix);
          m.setMatrixAt(i, w.matrix);
        }
      });
      for (const m of [body, wl, wr]) m.instanceMatrix.needsUpdate = true;
    },
  };
}

// ================= 恐怖天空（main.js 喺 updateAmbience 之後叫）=================
// Issue #9：以前成個天血紅色好核突 → 改做深紫藍夜空、地平線紫紅色光、大月光；霧跟天色夾
// 每個地方嘅霧唔同（Hollow Sprites 最大霧，但都睇到前面）；間中行雷（天上有閃電）
const C = (h) => new THREE.Color(h);
const ZONE_FOG = {
  '🎃 Spawn Ruins': [0x3a2a58, 22, 125],
  'Pumpkin Graveyard': [0x4a2f4a, 16, 95],
  'Hollow Sprites': [0x1f4048, 10, 70],
  'Abandoned Manor': [0x34285a, 16, 95],
  'Egg Graveyard': [0x352a55, 20, 110],
  'Train Station': [0x30285a, 22, 125],
  'Fishing Lake': [0x2c2c56, 20, 115],
  'Ghost World': [0x221637, 14, 95], // 鬼鎮：遠少少都睇到啲屋（霧仍然好大）
  Hell: [0x4a0c04, 40, 250], // 🔥 Halloween World 2：暗紅煙霧（要睇到遠處嘅城堡）
  'Witch Castle': [0x3f0a10, 34, 230],
};
// 🔥 Hell 嘅天：暗紅天頂、地平線熔岩橙光；冇月亮、冇閃電（熔岩光代替）
const HELL_SKY_TOP = C(0x1a0204);
const HELL_SKY_BOTTOM = C(0x7a1a06);
const HELL_HEMI_SKY = C(0xff7a4a);
const HELL_HEMI_GROUND = C(0xff3d00);
const HELL_LIGHT = C(0xffa060);
const HELL_AMBIENT = C(0xffb090);
const HW_AMBIENT = C(0xcdbcff);
const SKY_TOP = C(0x0a0820);
const SKY_BOTTOM = C(0x40295c);
const _fog = new THREE.Color();
const _bg = new THREE.Color();
const _flashC = C(0xd8ccff);
const _bloodFog = C(0x2a0006); // 拎住蛋嘅暗紅霧
const MOON_LIGHT = C(0xb8c0ff); // 月光：淡藍紫
const HEMI_SKY = C(0x9a88ff);
const HEMI_GROUND = C(0x4a3226);
let fogNear = 70;
let fogFar = 220;
let hwAmbient = null;
let hemiOrig = null; // 普通世界嘅半球光顏色（返去要還返）
let bolt = null;
// 閃電：一條彎彎曲曲、有分叉嘅光（每次行雷重新畫）
function makeBolt(scene) {
  const m = new THREE.MeshBasicMaterial({ color: 0xe8e0ff, transparent: true, opacity: 0, fog: false, depthWrite: false, blending: THREE.AdditiveBlending });
  bolt = new THREE.Mesh(new THREE.BufferGeometry(), m);
  bolt.frustumCulled = false;
  bolt.visible = false;
  scene.add(bolt);
}
function strike(camPos) {
  const parts = [];
  const seg = (a, b, w) => {
    const dir = b.clone().sub(a);
    const len = dir.length();
    const g = new THREE.BoxGeometry(w, len, w);
    g.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    g.applyQuaternion(q);
    g.translate(a.x, a.y, a.z);
    parts.push(g);
  };
  const ang = Math.random() * Math.PI * 2;
  const dist = 160 + Math.random() * 80;
  let p = new THREE.Vector3(camPos.x + Math.cos(ang) * dist, 140, camPos.z + Math.sin(ang) * dist);
  for (let i = 0; i < 9; i++) {
    const q = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 22, -14 - Math.random() * 6, (Math.random() - 0.5) * 22));
    seg(p, q, 1.4);
    if (Math.random() < 0.35) seg(q, q.clone().add(new THREE.Vector3((Math.random() - 0.5) * 30, -16, (Math.random() - 0.5) * 30)), 0.7); // 分叉
    p = q;
  }
  bolt.geometry.dispose();
  bolt.geometry = mergeGeometries(parts.map((g) => g.toNonIndexed()));
}
export function applyHalloweenSky({ scene, skyUniforms, hemi, sun, dt, camPos, playSound }) {
  const inside = inHalloween(camPos.x, camPos.z);
  halloween.inside = inside;
  halloween.sky += ((inside ? 1 : 0) - halloween.sky) * Math.min(1, dt * 2.5);
  if (inside && halloween.sky > 0.97) halloween.sky = 1;
  const k = halloween.sky;
  if (!scene.fog) return;
  if (!hemiOrig) hemiOrig = { sky: hemi.color.clone(), ground: hemi.groundColor.clone() };
  if (k < 0.002) {
    if (hwAmbient) hwAmbient.intensity = 0; // 返到正常世界：熄咗佢
    if (bolt) bolt.visible = false;
    hemi.color.copy(hemiOrig.sky);
    hemi.groundColor.copy(hemiOrig.ground);
    fogNear = scene.fog.near;
    fogFar = scene.fog.far;
    return;
  }
  const zone = ZONE_FOG[hwZoneAt(camPos.x, camPos.z)] || ZONE_FOG['🎃 Spawn Ruins'];
  const hell = inside && inHell(camPos.x, camPos.z); // 🔥 Halloween World 2
  // 行雷：每 7–16 秒一次，閃兩下
  if (!bolt) makeBolt(scene);
  if (inside && !hell) {
    halloween.nextFlash -= dt;
    if (halloween.nextFlash <= 0) {
      halloween.nextFlash = 7 + Math.random() * 9;
      halloween.flash = 1;
      halloween.flashT = 0;
      strike(camPos); // Ghost World 都有（遠處嘅閃電，照亮成個鬼鎮）
      setTimeout(() => playSound?.('thunder'), 250 + Math.random() * 500);
    }
  }
  halloween.flashT = (halloween.flashT ?? 1) + dt;
  const ft = halloween.flashT;
  const flash = ft < 0.12 ? 1 : ft < 0.2 ? 0.2 : ft < 0.3 ? 0.8 : Math.max(0, 1 - (ft - 0.3) * 3) * 0.5;
  bolt.visible = ft < 0.4 && k > 0.5;
  bolt.material.opacity = ft < 0.12 ? 1 : ft < 0.2 ? 0.15 : ft < 0.3 ? 0.9 : Math.max(0, 1 - (ft - 0.3) * 10);
  // 天色
  _bg.copy(hell ? HELL_SKY_BOTTOM : SKY_BOTTOM).lerp(_flashC, flash * 0.45);
  scene.background.lerp(_bg, k);
  skyUniforms.bottom.value.lerp(_bg, k);
  skyUniforms.top.value.lerp(hell ? HELL_SKY_TOP : SKY_TOP, k);
  skyUniforms.sunAmt.value *= 1 - k;
  skyUniforms.moonAmt.value *= 1 - k;
  // 霧：顏色 + 距離（慢慢變）
  // 🥚 拎住蛋：霧收埋（halloween.closeFog 0–1，由 halloweenEggs.js 控制），變暗紅色
  const cf = halloween.closeFog || 0;
  const wantNear = THREE.MathUtils.lerp(zone[1], HALLOWEEN_FOG_NEAR, cf);
  const wantFar = THREE.MathUtils.lerp(zone[2], HALLOWEEN_FOG_FAR, cf);
  fogNear += (wantNear - fogNear) * Math.min(1, dt * (cf > 0.05 ? 4 : 1.2));
  fogFar += (wantFar - fogFar) * Math.min(1, dt * (cf > 0.05 ? 4 : 1.2));
  _fog.setHex(zone[0]).lerp(_bloodFog, cf * 0.85).lerp(_flashC, flash * 0.3);
  scene.fog.color.lerp(_fog, k);
  if (!halloween.noFog) { // （noFog：測試影相用）
    scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, fogNear, k);
    scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, fogFar, k);
  }
  // 額外環境光（小朋友：太暗睇唔到攤位）：只喺 Halloween 世界入面著
  // Issue #9：環境光太強會「平」晒（冇陰影、冇立體感）→ 少咗啲，改用半球光（天紫、地暖）+ 月光
  if (!hwAmbient) {
    hwAmbient = new THREE.AmbientLight(0xcdbcff, 0);
    scene.add(hwAmbient);
  }
  hwAmbient.intensity = THREE.MathUtils.lerp(hwAmbient.intensity, (hell ? 0.75 : 0.9) * k, Math.min(1, dt * 3));
  hwAmbient.color.copy(hell ? HELL_AMBIENT : HW_AMBIENT);
  hemi.color.copy(hemiOrig.sky).lerp(hell ? HELL_HEMI_SKY : HEMI_SKY, k);
  hemi.groundColor.copy(hemiOrig.ground).lerp(hell ? HELL_HEMI_GROUND : HEMI_GROUND, k);
  hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, 2.3 + flash * 1.4, k);
  sun.intensity = THREE.MathUtils.lerp(sun.intensity, 2.4 + flash * 1.4, k);
  sun.color.lerp(hell ? HELL_LIGHT : MOON_LIGHT, k);
}

// 🎃 載入畫面搬咗去 src/loading.js（Issue #8）
