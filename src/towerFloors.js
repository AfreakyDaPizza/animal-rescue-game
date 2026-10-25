// 🧩 Witch Tower 擴充（Issue #15）—— API 見 witchTower.js「擴充 API」
// 🏚️ 每層唔同嘅地圖主題（2026-10-25 小朋友：「make the floor completely different each time you enter,
//    more scarier and more different each floor」）
//
// 9 個主題（每個有自己嘅地板、牆、燈光、霧、道具、飄浮粒子、出場聲）：
//   🔮 Haunted Library（原本個樣）· 🎃 Pumpkin Patch · ❄️ Frozen Ghost Hall      ← 第 1 層起
//   🕷️ Spider Lair · 🪦 Creepy Crypt                                              ← 第 6 層起
//   ⛓️ Prison of Chains · 🌋 Lava Dungeon · 🌕 Blood-Moon Rooftop                  ← 第 16 層起
//   🌌 Shadow Void（浮石、成個天都係眼）                                            ← 第 31 層起
//   可愛嘅三個去到第 30 層之後唔再出
//
// 「每次入嚟都唔同」：每次入塔有新嘅隨機種子（seed）→ 第 1 層唔一定係同一個主題；連續兩層一定唔同主題；
//   細道具（細南瓜、墓碑、蜘蛛網、鐵鏈…）每層隨機擺過
// 「越上越恐怖」：scare = (層數 - 1) / 40（最多 1）+ 四級 tier：1–5 可愛、6–15 有啲恐怖、16–30 恐怖、31+ 惡夢
//   越高：燈越暗、霧越濃、牆上越多發光眼仔眨眼、火把閃、窗外行雷（tier 3+）、細細聲嘅悄悄話、蝙蝠、
//   惡夢級有影子人喺牆邊望住你（一陣就消失）。保持 Halloween 可愛恐怖，冇血腥
//
// 公平：中間升降魔法陣（r 3.4）+ 周圍、8 個出怪魔法陣（r 16.5）、南邊出口全部留空；
//   撞到嘅道具只喺牆邊（原本大鍋／書架嗰 9 個位，每個主題換做自己嘅嘢，撞到範圍同以前一樣）
//   + 牆邊隨機嘅額外道具（墓碑、木桶…）用 setTowerFloorProps 加入撞到嘅清單；中間只有行得穿嘅細裝飾
// 效能：每個主題第一次用先起（之後 cache 住、轉層只係開／關）；唔郁嘅嘢 bakeStatic 焊埋；
//   細道具用 InstancedMesh（一種一個 draw call）；唔加新嘅燈（用返原本大鍋嗰 3 盞燈轉顏色）
// 測試（console）：game.tower.floor(20) 跳層；game.towerFloors.theme('lava') 即刻換主題；game.towerFloors.list()
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bakeStatic } from './world.js';
import { seeded } from './halloweenArt.js';
import { bx, cyl, sph, cone, flame } from './halloweenKit.js';
import { towerGlowTex } from './towerModels.js';
import { addSounds } from './sound.js';
import { TOWER_ARENA, TOWER_CAULDRONS, TOWER_SHELVES, TOWER_PROPS, setTowerFloorProps } from './towerShape.js';
import { FLOOR_TEX, WALL_TEX, WALL_GLOW, LAVA_GLOW, VOID_GLOW, webTex, eyesTex, jackTex, moonTex, mistTex, ripTex, shadowTex } from './towerFloorArt.js';

const PI = Math.PI;
const RR = TOWER_ARENA.r; // 24
const H = TOWER_ARENA.wallH; // 22
const AMB = 0.9; // Halloween 世界嘅環境光（halloweenWorld.js applyHalloweenSky 塔入面用 0.9）
const lerp = THREE.MathUtils.lerp;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// 本地座標（相對塔中心）：0° = 北（-z），順時針
const polarL = (deg, r) => ({ x: Math.sin((deg * PI) / 180) * r, z: -Math.cos((deg * PI) / 180) * r });
const faceIn = (x, z) => Math.atan2(-x, -z); // 個 +z 面向中間
const PORTALS = Array.from({ length: 8 }, (_, i) => {
  const a = PI / 8 + (i * PI) / 4;
  return { x: Math.cos(a) * 16.5, z: Math.sin(a) * 16.5 };
});
const SLOT_C = TOWER_CAULDRONS.map((c) => ({ deg: c.deg, x: c.x - TOWER_ARENA.x, z: c.z - TOWER_ARENA.z }));
const SLOT_S = TOWER_SHELVES.map((s) => ({ deg: s.deg, x: s.x - TOWER_ARENA.x, z: s.z - TOWER_ARENA.z }));
const degOf = (x, z) => ((Math.atan2(x, -z) * 180) / PI + 360) % 360;
const degDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

// 呢個位擺唔擺得細裝飾（唔阻住魔法陣、出怪位、出口、牆邊道具）
function freeSpot(x, z, rad, { minR = 6, maxR = 22.5 } = {}) {
  const d = Math.hypot(x, z);
  if (d < minR || d > maxR) return false;
  if (z > 8 && Math.abs(x) < 3.4 + rad) return false; // 南邊：入口企位 + 出口通道
  if (PORTALS.some((p) => Math.hypot(x - p.x, z - p.z) < 2.2 + rad)) return false;
  if (SLOT_C.some((p) => Math.hypot(x - p.x, z - p.z) < 2.0 + rad)) return false;
  if (SLOT_S.some((p) => Math.hypot(x - p.x, z - p.z) < 2.8 + rad)) return false;
  return true;
}

// ---------- 聲效（全部即場合成）----------
addSounds({
  tfWhisper: (t, { noise }) => { // 細細聲嘅悄悄話（左右飄）
    for (let i = 0; i < 5; i++) noise(t + i * 0.16, 0.22, { vol: 0.05, freq: 2600 + Math.random() * 1800, q: 6, type: 'bandpass' });
  },
  tfFlap: (t, { noise }) => {
    for (let i = 0; i < 6; i++) noise(t + i * 0.07, 0.05, { vol: 0.08, freq: 900, q: 1.5, type: 'bandpass' });
  },
  tfChain: (t, { tone }) => {
    for (let i = 0; i < 3; i++) tone(1800 + Math.random() * 900, t + i * 0.09, 0.12, { type: 'square', vol: 0.025 });
  },
  tfDrip: (t, { tone }) => tone(1400, t, 0.12, { type: 'sine', vol: 0.06, slide: 0.45 }),
  tfWind: (t, { noise }) => noise(t, 2.4, { vol: 0.12, freq: 380, q: 2.5, type: 'bandpass' }),
  tfHeart: (t, { tone }) => {
    tone(55, t, 0.18, { type: 'sine', vol: 0.3, slide: 0.7 });
    tone(50, t + 0.26, 0.2, { type: 'sine', vol: 0.24, slide: 0.7 });
  },
  tfLibrary: (t, { arp }) => arp(t, [523, 622, 784, 932], 0.12, { type: 'triangle', vol: 0.06 }),
  tfPumpkin: (t, { arp }) => arp(t, [392, 466, 392, 311], 0.13, { type: 'square', vol: 0.04 }),
  tfFrost: (t, { arp }) => arp(t, [1319, 1568, 1976, 2349], 0.09, { type: 'sine', vol: 0.06 }),
  tfSpider: (t, { noise, tone }) => {
    noise(t, 0.6, { vol: 0.1, freq: 3500, q: 3, type: 'bandpass' });
    tone(110, t, 0.8, { type: 'sawtooth', vol: 0.03, slide: 0.8 });
  },
  tfCrypt: (t, { tone }) => {
    tone(220, t, 1.4, { type: 'sine', vol: 0.08, slide: 0.75 });
    tone(233, t + 0.05, 1.4, { type: 'sine', vol: 0.06, slide: 0.75 });
  },
  tfChains: (t, { tone, noise }) => {
    noise(t, 0.4, { vol: 0.12, freq: 300 });
    for (let i = 0; i < 5; i++) tone(1500 + i * 220, t + 0.1 + i * 0.08, 0.15, { type: 'square', vol: 0.02 });
  },
  tfLava: (t, { noise, tone }) => {
    noise(t, 1.6, { vol: 0.25, freq: 160 });
    tone(48, t, 1.6, { type: 'sine', vol: 0.25, slide: 0.8 });
  },
  tfMoon: (t, { tone }) => {
    tone(196, t, 1.6, { type: 'triangle', vol: 0.07, slide: 1.02 });
    tone(277, t + 0.4, 1.4, { type: 'triangle', vol: 0.06, slide: 0.98 });
  },
  tfVoid: (t, { tone }) => {
    tone(70, t, 2.4, { type: 'sine', vol: 0.25, slide: 0.6 });
    tone(105, t + 0.2, 2.2, { type: 'sine', vol: 0.1, slide: 1.4 });
  },
});

// ---------- 細道具：InstancedMesh（一個模型 → 每種材質一個 InstancedMesh）----------
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
function instanced(parent, build, max) {
  const root = new THREE.Group();
  build(root);
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (!buckets.has(o.material.uuid)) buckets.set(o.material.uuid, { material: o.material, geos: [] });
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(o.matrixWorld);
    buckets.get(o.material.uuid).geos.push(g);
  });
  const meshes = [...buckets.values()].map(({ material, geos }) => {
    const m = new THREE.InstancedMesh(mergeGeometries(geos), material, max);
    m.count = 0;
    m.frustumCulled = false;
    parent.add(m);
    return m;
  });
  return {
    meshes, max, n: 0,
    set(i, matrix) { for (const m of meshes) m.setMatrixAt(i, matrix); },
    color(i, c) { for (const m of meshes) m.setColorAt(i, c); },
    done(n = this.n) {
      this.n = n;
      for (const m of meshes) {
        m.count = n;
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
    },
  };
}
const compose = (x, y, z, rx, ry, rz, sx, sy = sx, sz = sx) => _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));

// 隨機撒細道具：spec = { inst, count:[a,b], minR, maxR, rad, y, scale:[a,b], face?, tilt?, solid?（撞到嘅半徑）}
function scatter(rng, spec, solids) {
  const [a, b] = spec.count;
  const want = Math.min(spec.inst.max, Math.round(a + rng() * (b - a)));
  const placed = [];
  for (let i = 0, tries = 0; placed.length < want && tries < want * 30; tries++) {
    const ang = rng() * PI * 2;
    const r = lerp(spec.minR ?? 6, spec.maxR ?? 21, Math.sqrt(rng()));
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    const sc = lerp(spec.scale?.[0] ?? 1, spec.scale?.[1] ?? 1, rng());
    const rad = (spec.rad ?? 0.6) * sc;
    if (!freeSpot(x, z, rad, { minR: spec.minR ?? 6, maxR: spec.maxR ?? 22.5 })) continue;
    if (degDiff(degOf(x, z), 180) < (spec.doorDeg ?? 14)) continue;
    if (placed.some((p) => Math.hypot(x - p.x, z - p.z) < p.rad + rad + (spec.gap ?? 0.3))) continue;
    if (spec.solid) {
      const wx = x + TOWER_ARENA.x;
      const wz = z + TOWER_ARENA.z;
      if (TOWER_PROPS.some((p) => Math.hypot(wx - p.x, wz - p.z) < p.r + rad + 0.8)) continue;
      if (solids.some((p) => Math.hypot(wx - p.x, wz - p.z) < p.r + rad + 0.8)) continue;
    }
    const yaw = spec.face ? faceIn(x, z) + (rng() - 0.5) * (spec.faceJit ?? 0.5) : rng() * PI * 2;
    const tilt = spec.tilt ? (rng() - 0.5) * spec.tilt : 0;
    const y = typeof spec.y === 'function' ? spec.y(rng) : spec.y ?? 0;
    spec.inst.set(placed.length, compose(x, y, z, tilt, yaw, tilt * 0.6, sc));
    placed.push({ x, z, rad, y, sc, yaw });
    if (spec.solid) solids.push({ x: x + TOWER_ARENA.x, z: z + TOWER_ARENA.z, r: spec.solid * sc });
    i++;
  }
  spec.inst.done(placed.length);
  return placed;
}

// ---------- 飄浮粒子（一個 THREE.Points）----------
// kind: rise（火星）、fall（雪／灰／葉）、drift（塵／孢子／鬼火）
function particles(parent, { n = 120, color = 0xffffff, size = 0.25, kind = 'drift', add = true, top = 18, speed = 1, opacity = 0.9 }) {
  const pos = new Float32Array(n * 3);
  const ph = new Float32Array(n);
  const sp = new Float32Array(n);
  const r = seeded(n + Math.round(size * 100));
  for (let i = 0; i < n; i++) {
    const a = r() * PI * 2;
    const d = Math.sqrt(r()) * (RR - 1.5);
    pos[i * 3] = Math.cos(a) * d;
    pos[i * 3 + 1] = r() * top;
    pos[i * 3 + 2] = Math.sin(a) * d;
    ph[i] = r() * 10;
    sp[i] = (0.5 + r()) * speed;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: towerGlowTex(), color, size, transparent: true, opacity, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  parent.add(pts);
  return {
    pts,
    update(dt, time) {
      for (let i = 0; i < n; i++) {
        const k = i * 3;
        const w = Math.sin(time * 0.8 + ph[i]);
        if (kind === 'rise') {
          pos[k + 1] += sp[i] * dt * 1.6;
          pos[k] += w * dt * 0.4;
          if (pos[k + 1] > top) pos[k + 1] = 0;
        } else if (kind === 'fall') {
          pos[k + 1] -= sp[i] * dt * 1.1;
          pos[k] += w * dt * 0.6;
          pos[k + 2] += Math.cos(time * 0.6 + ph[i]) * dt * 0.4;
          if (pos[k + 1] < 0) pos[k + 1] = top;
        } else {
          pos[k] += w * dt * 0.35 * sp[i];
          pos[k + 1] += Math.cos(time * 0.5 + ph[i]) * dt * 0.25 * sp[i];
          pos[k + 2] += Math.sin(time * 0.6 + ph[i] * 1.3) * dt * 0.35 * sp[i];
          if (pos[k + 1] < 0.2) pos[k + 1] = 0.2;
        }
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// ---------- 材質 ----------
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const glowM = (color, k = 1.6, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4, ...extra });
const addM = (color, opacity = 0.6, map = null) => new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });

// 喺牆邊（書架位）起嘢：fn(group) 用本地座標，+z 向中間
function atShelf(stat, s, fn) {
  const g = new THREE.Group();
  g.position.set(s.x, 0, s.z);
  g.rotation.y = faceIn(s.x, s.z);
  stat.add(g);
  fn(g, s);
  return g;
}
function atSlot(parent, c, fn) {
  const g = new THREE.Group();
  g.position.set(c.x, 0, c.z);
  g.rotation.y = faceIn(c.x, c.z);
  parent.add(g);
  fn(g, c);
  return g;
}

// ================= 9 個主題 =================
// 每個：look（顏色、燈、霧）+ build(T) → { place(rng, n, sc, solids), update(dt, time, sc) }
const THEMES = [
  {
    id: 'library', name: '🔮 Haunted Library', color: '#ea80fc', tier: 0, min: 1, max: 30, sting: 'tfLibrary',
    base: true, // 用返原本嘅地板、牆、書架、大鍋、蠟燭
    fire: [0xf3c5ff, 0xd500f9, 0x6a1b9a], circle: 0xd500f9, light: 0xb04dff, fog: 0x1c0a2c, fogNear: 26, fogFar: 120,
    bright: 1, slot: [0x76ff03, 10],
    build(T) {
      // 📖 飄浮嘅打開咗嘅書（慢慢轉）
      const cover = std(0x6a1b9a);
      const page = std(0xfff8e1, { emissive: 0xfff3c4, emissiveIntensity: 0.25 });
      const books = instanced(T.g, (g) => {
        for (const sx of [-1, 1]) {
          const c = bx(g, 0.5, 0.04, 0.7, cover, sx * 0.24, 0, 0, 0.1);
          c.rotation.z = sx * 0.35;
          const p = bx(g, 0.44, 0.05, 0.62, page, sx * 0.22, 0.04, 0, 0.1);
          p.rotation.z = sx * 0.3;
        }
      }, 10);
      const bk = [];
      // 📚 地上一疊疊書（行得穿）
      const pileM = [0x8e24aa, 0x3949ab, 0xc62828, 0xf9a825].map((c) => std(c));
      const pile = instanced(T.g, (g) => {
        for (let i = 0; i < 4; i++) bx(g, 0.62 - i * 0.05, 0.13, 0.46, pileM[i], (i % 2) * 0.05, 0.07 + i * 0.14, 0, 0.1).rotation.y = i * 0.3;
      }, 14);
      const dust = particles(T.g, { n: 90, color: 0xffe0b2, size: 0.12, kind: 'drift', top: 12, opacity: 0.7 });
      return {
        place(rng, n, sc, solids) {
          scatter(rng, { inst: pile, count: [7, 12], minR: 7, maxR: 21, rad: 0.5, scale: [0.8, 1.3] }, solids);
          bk.length = 0;
          for (let i = 0; i < books.max; i++) bk.push({ a: rng() * PI * 2, r: 6 + rng() * 14, y: 3.5 + rng() * 6, s: 0.3 + rng() * 0.4, ph: rng() * 10 });
        },
        update(dt, time) {
          bk.forEach((b, i) => {
            const a = b.a + time * 0.12 * b.s;
            const flap = Math.sin(time * 5 + b.ph) * 0.25;
            books.set(i, compose(Math.cos(a) * b.r, b.y + Math.sin(time + b.ph) * 0.4, Math.sin(a) * b.r, flap, -a, 0, 1.3));
          });
          books.done(bk.length);
          dust.update(dt, time);
        },
      };
    },
  },
  {
    id: 'pumpkin', name: '🎃 Pumpkin Patch', color: '#ffab40', tier: 0, min: 1, max: 30, sting: 'tfPumpkin',
    floor: 'pumpkin', floorRep: 7, wall: 'pumpkin', wallRep: [40, 6], win: 0xffa040, winK: 0.9, edge: 0x2a1a0c, trim: 0x3b2414,
    fire: [0xfff3c4, 0xff9100, 0xbf360c], circle: 0xff9100, light: 0xff9e40, fog: 0x1f0f05, fogNear: 24, fogFar: 115,
    hemi: [0xffb36b, 0x4a2a10], bright: 1, slot: [0xff8f00, 16],
    build(T) {
      const orange = std(0xf57c00, { roughness: 0.65 });
      const orange2 = std(0xef6c00, { roughness: 0.65 });
      const stemM = std(0x4e6b20);
      const faceM = addM(0xffc94d, 0.95, jackTex());
      const hay = std(0xd4a646, { roughness: 1 });
      const hay2 = std(0xb8892f, { roughness: 1 });
      const wood = std(0x5d3a1e);
      const cloth = std(0x7b5a9e);
      const corn = std(0x8d7a3a);
      // 3 個大鍋位：大南瓜燈
      for (const c of SLOT_C) atSlot(T.stat, c, (g) => {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * PI * 2;
          sph(g, 0.95, 1.15, 0.95, i % 2 ? orange : orange2, Math.cos(a) * 0.55, 1.2, Math.sin(a) * 0.55);
        }
        cyl(g, 0.16, 0.7, stemM, 0, 2.5, 0, 0.2, 0.1);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), faceM);
        face.position.set(0, 1.25, 1.52);
        g.add(face);
      });
      // 6 個書架位：禾草堆 + 粟米 + 稻草人
      SLOT_S.forEach((s, i) => atShelf(T.stat, s, (g) => {
        bx(g, 3.4, 1.1, 1.3, hay, 0, 0.55, -0.1, 0.12);
        bx(g, 2.2, 1.0, 1.2, hay2, 0.3, 1.6, -0.2, 0.12);
        for (let k = 0; k < 5; k++) { // 粟米
          const x = -1.6 + k * 0.8;
          cyl(g, 0.06, 3.4 + (k % 2) * 0.6, corn, x, 1.7, -0.9);
          cone(g, 0.25, 1.2, stemM, x + 0.2, 2.4, -0.8, 0, 0.9);
        }
        if (i % 3 === 1) { // 🧑‍🌾 稻草人（南瓜頭）
          cyl(g, 0.1, 3.6, wood, 0, 1.8, 0.4);
          cyl(g, 0.08, 2.6, wood, 0, 2.8, 0.4, 0, PI / 2);
          bx(g, 1.0, 1.1, 0.5, cloth, 0, 2.5, 0.45, 0.2);
          sph(g, 0.55, 0.48, 0.55, orange, 0, 3.6, 0.45);
          const f = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), faceM);
          f.position.set(0, 3.6, 1.01);
          g.add(f);
          cone(g, 0.6, 0.6, std(0x3e2723), 0, 4.2, 0.45, 0, 0, 8);
        }
      }));
      // 地上：細南瓜（行得穿）
      const small = instanced(T.g, (g) => {
        sph(g, 0.42, 0.34, 0.42, orange, 0, 0.32, 0, true);
        sph(g, 0.3, 0.3, 0.3, orange2, 0.18, 0.3, 0.1, true);
        cyl(g, 0.05, 0.25, stemM, 0, 0.7, 0);
      }, 26);
      const glowSmall = instanced(T.g, (g) => { // 幾個細南瓜燈
        sph(g, 0.5, 0.42, 0.5, orange, 0, 0.4, 0, true);
        const f = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), faceM);
        f.position.set(0, 0.42, 0.5);
        g.add(f);
      }, 10);
      const vines = std(0x2e5a1c);
      const vine = instanced(T.g, (g) => {
        for (let i = 0; i < 4; i++) cyl(g, 0.06, 1.4, vines, (i - 1.5) * 0.4, 0.06, Math.sin(i) * 0.3, PI / 2, 0.4 * i);
        cone(g, 0.22, 0.1, vines, 0.2, 0.08, 0.4, 0, 0, 5);
      }, 16);
      const flies = particles(T.g, { n: 70, color: 0xd4ff6a, size: 0.22, kind: 'drift', top: 7, speed: 1.6 });
      const leaves = particles(T.g, { n: 50, color: 0xff8f00, size: 0.3, kind: 'fall', add: false, top: 18, speed: 0.6, opacity: 0.85 });
      return {
        place(rng, n, sc, solids) {
          scatter(rng, { inst: small, count: [14, 24], minR: 6, maxR: 22, rad: 0.5, scale: [0.7, 1.4] }, solids);
          scatter(rng, { inst: glowSmall, count: [5, 9], minR: 7, maxR: 22, rad: 0.5, scale: [0.8, 1.2], face: true }, solids);
          scatter(rng, { inst: vine, count: [8, 14], minR: 6, maxR: 22, rad: 0.8, scale: [0.8, 1.6] }, solids);
        },
        update(dt, time) {
          flies.update(dt, time);
          leaves.update(dt, time);
          faceM.opacity = 0.8 + Math.sin(time * 9) * 0.06 + Math.sin(time * 23) * 0.04;
        },
      };
    },
  },
  {
    id: 'frost', name: '❄️ Frozen Ghost Hall', color: '#80d8ff', tier: 0, min: 1, max: 30, sting: 'tfFrost',
    floor: 'frost', floorRep: 8, wall: 'frost', wallRep: [26, 7], win: 0x9fe8ff, winK: 1.4, edge: 0x6d90b8, trim: 0x88a8cc,
    fire: [0xe1f5fe, 0x40c4ff, 0x01579b], circle: 0x40c4ff, light: 0x80d8ff, fog: 0x0b1e33, fogNear: 22, fogFar: 110,
    hemi: [0xb3e5fc, 0x2a4a6a], bright: 1.05, slot: [0x40c4ff, 12],
    build(T) {
      const ice = new THREE.MeshStandardMaterial({ color: 0xb3e5fc, emissive: 0x4fc3f7, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 });
      const iceDeep = new THREE.MeshStandardMaterial({ color: 0x81d4fa, emissive: 0x0288d1, emissiveIntensity: 0.4, roughness: 0.2, transparent: true, opacity: 0.8 });
      const snow = std(0xf5fbff, { roughness: 1 });
      // 大鍋位：冰水晶
      for (const c of SLOT_C) atSlot(T.stat, c, (g) => {
        cone(g, 0.6, 3.6, ice, 0, 1.8, 0, 0, 0, 6);
        cone(g, 0.45, 2.4, iceDeep, 0.7, 1.1, 0.2, 0.2, -0.35, 6);
        cone(g, 0.42, 2.2, ice, -0.6, 1.0, -0.3, -0.2, 0.4, 6);
        cone(g, 0.3, 1.5, iceDeep, 0.1, 0.7, 0.8, 0.5, 0.1, 6);
        sph(g, 1.5, 0.3, 1.5, snow, 0, 0.05, 0, true);
      });
      // 書架位：結咗冰嘅書架（冰塊入面）
      const wood = std(0x3b4a5a);
      SLOT_S.forEach((s) => atShelf(T.stat, s, (g) => {
        bx(g, 3.6, 4.4, 0.8, wood, 0, 2.2, -0.2, 0.05);
        bx(g, 4.0, 4.8, 1.4, ice, 0, 2.4, 0, 0.15);
        sph(g, 2.2, 0.5, 1.0, snow, 0, 4.9, 0, true);
        for (let k = 0; k < 4; k++) cone(g, 0.12, 0.9, iceDeep, -1.5 + k, 4.3, 0.65, PI, 0, 5);
      }));
      // 天花：冰柱（行得穿，好高）
      const icicle = instanced(T.g, (g) => {
        cone(g, 0.3, 2.2, ice, 0, -1.1, 0, PI, 0, 6);
        cone(g, 0.18, 1.3, ice, 0.4, -0.65, 0.1, PI, 0, 5);
      }, 40);
      const pile = instanced(T.g, (g) => {
        sph(g, 0.9, 0.35, 0.7, snow, 0, 0.05, 0, true);
        sph(g, 0.5, 0.25, 0.5, snow, 0.6, 0.05, 0.3, true);
      }, 18);
      // 👻 友善嘅鬼仔（飄嚟飄去）
      const ghostM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xb3e5fc, emissiveIntensity: 0.7, transparent: true, opacity: 0.72, roughness: 0.5, depthWrite: false });
      const eyeM = new THREE.MeshBasicMaterial({ color: 0x0b1e33 });
      const ghosts = instanced(T.g, (g) => {
        sph(g, 0.6, 0.65, 0.6, ghostM, 0, 0.6, 0);
        cyl(g, 0.6, 0.9, ghostM, 0, -0.1, 0, 0, 0, 0.62);
        cone(g, 0.62, 0.5, ghostM, 0, -0.8, 0, PI, 0, 8);
        sph(g, 0.1, 0.16, 0.06, eyeM, -0.2, 0.7, 0.55, true);
        sph(g, 0.1, 0.16, 0.06, eyeM, 0.2, 0.7, 0.55, true);
        sph(g, 0.12, 0.09, 0.06, eyeM, 0, 0.42, 0.57, true);
      }, 8);
      const gh = [];
      const snowP = particles(T.g, { n: 160, color: 0xffffff, size: 0.16, kind: 'fall', add: false, top: 20, speed: 0.7, opacity: 0.85 });
      return {
        place(rng, n, sc, solids) {
          // 冰柱：沿住牆頂
          let k = 0;
          for (let i = 0; i < icicle.max; i++) {
            const deg = rng() * 360;
            const p = polarL(deg, RR - 0.4 - rng() * 1.2);
            icicle.set(k++, compose(p.x, H - 0.2 - rng() * 1.5, p.z, 0, rng() * 6, 0, 0.6 + rng() * 0.9));
          }
          icicle.done(k);
          scatter(rng, { inst: pile, count: [10, 16], minR: 6, maxR: 22.5, rad: 0.8, scale: [0.7, 1.6] }, solids);
          gh.length = 0;
          const count = 4 + Math.floor(rng() * 4);
          for (let i = 0; i < count; i++) gh.push({ a: rng() * PI * 2, r: 7 + rng() * 13, y: 4 + rng() * 6, sp: (rng() < 0.5 ? -1 : 1) * (0.1 + rng() * 0.15), ph: rng() * 10 });
        },
        update(dt, time, sc) {
          gh.forEach((o, i) => {
            const a = o.a + time * o.sp;
            const x = Math.cos(a) * o.r;
            const z = Math.sin(a) * o.r;
            const yaw = Math.atan2(-Math.sin(a) * o.sp, Math.cos(a) * o.sp) ;
            ghosts.set(i, compose(x, o.y + Math.sin(time * 1.4 + o.ph) * 0.6, z, 0, yaw + (o.sp > 0 ? 0 : PI) - PI / 2, Math.sin(time * 2 + o.ph) * 0.12, 1.1));
          });
          ghosts.done(gh.length);
          ghostM.opacity = 0.72 - sc * 0.3 + Math.sin(time * 3) * 0.05;
          snowP.update(dt, time);
        },
      };
    },
  },
  {
    id: 'spider', name: '🕷️ Spider Lair', color: '#b2ff59', tier: 1, min: 6, sting: 'tfSpider',
    floor: 'spider', floorRep: 7, wall: 'spider', wallRep: [22, 6], win: 0x000000, winK: 0, edge: 0x14150e, trim: 0x1d1e16,
    fire: [0xe6ffb0, 0x76ff03, 0x1b5e20], circle: 0x76ff03, light: 0x8bc34a, fog: 0x070a04, fogNear: 18, fogFar: 95,
    hemi: [0x9ccc65, 0x1a2410], bright: 0.75, slot: [0x9eff3a, 9], eyes: 10, eyeCol: 0xff1744, noWindows: true,
    build(T) {
      const sac = new THREE.MeshStandardMaterial({ color: 0xe8f5c8, emissive: 0x9eff3a, emissiveIntensity: 0.5, roughness: 0.6, transparent: true, opacity: 0.88 });
      const rock = std(0x2b2c22, { roughness: 1 });
      const webM = new THREE.MeshBasicMaterial({ map: webTex(), color: 0xd8dccf, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
      // 大鍋位：一堆蜘蛛蛋（會發光、一跳一跳）
      for (const c of SLOT_C) atSlot(T.stat, c, (g) => {
        sph(g, 1.6, 0.5, 1.6, rock, 0, 0.1, 0, true);
        const r = seeded(c.deg + 3);
        for (let i = 0; i < 9; i++) {
          const a = r() * PI * 2;
          const d = r() * 0.9;
          const s = 0.35 + r() * 0.3;
          sph(g, s, s * 1.3, s, sac, Math.cos(a) * d, 0.5 + r() * 1.2, Math.sin(a) * d);
        }
        const w = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), webM);
        w.position.set(0, 1.6, -0.4);
        g.add(w);
      });
      // 書架位：大石 + 好大個蜘蛛網
      SLOT_S.forEach((s) => atShelf(T.stat, s, (g) => {
        sph(g, 1.9, 1.6, 1.0, rock, 0, 0.9, -0.2, true);
        sph(g, 1.1, 1.0, 0.8, rock, 1.3, 0.6, 0.2, true);
        const w = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), webM);
        w.position.set(0, 4.4, -0.3);
        g.add(w);
      }));
      // 牆上／地上嘅蜘蛛網
      const webs = instanced(T.g, (g) => g.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), webM)), 18);
      const floorWeb = instanced(T.g, (g) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), webM);
        m.rotation.x = -PI / 2;
        m.position.y = 0.04;
        g.add(m);
      }, 8);
      // 🕷️ 吊住嘅蜘蛛（上上落落）
      const black = std(0x111111, { roughness: 0.5 });
      const redEye = glowM(0xff1744, 2.2);
      const legs = (g) => {
        for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
          const l = bx(g, 0.75, 0.06, 0.06, black, sx * 0.42, 0.05, -0.18 + k * 0.13, 0.3);
          l.rotation.z = sx * -0.6;
          l.rotation.y = sx * (k - 1.5) * 0.35;
        }
      };
      const spiders = instanced(T.g, (g) => {
        sph(g, 0.32, 0.28, 0.4, black, 0, 0, -0.25);
        sph(g, 0.22, 0.2, 0.24, black, 0, 0, 0.2);
        legs(g);
        sph(g, 0.05, 0.05, 0.05, redEye, -0.08, 0.06, 0.42, true);
        sph(g, 0.05, 0.05, 0.05, redEye, 0.08, 0.06, 0.42, true);
      }, 10);
      const threadM = new THREE.MeshBasicMaterial({ color: 0xcfd8c0, transparent: true, opacity: 0.5 });
      const threads = instanced(T.g, (g) => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 3), threadM);
        c.position.y = -0.5;
        g.add(c);
      }, 10);
      const sp = [];
      const spores = particles(T.g, { n: 80, color: 0xc6ff8a, size: 0.14, kind: 'drift', top: 10, opacity: 0.6 });
      return {
        place(rng, n, sc, solids) {
          let k = 0;
          for (let i = 0; i < webs.max; i++) {
            const deg = rng() * 360;
            if (degDiff(deg, 180) < 14 || degDiff(deg, 0) < 12) continue;
            const p = polarL(deg, RR - 0.9);
            webs.set(k++, compose(p.x, 3 + rng() * 14, p.z, (rng() - 0.5) * 0.3, faceIn(p.x, p.z), rng() * PI, 2.5 + rng() * 4.5));
          }
          webs.done(k);
          scatter(rng, { inst: floorWeb, count: [4, 8], minR: 6, maxR: 21, rad: 1.2, scale: [1.6, 3.2] }, solids);
          sp.length = 0;
          const count = 5 + Math.floor(rng() * 5);
          for (let i = 0, t = 0; sp.length < count && t < 60; t++, i++) {
            const a = rng() * PI * 2;
            const r = 5 + rng() * 15;
            const x = Math.cos(a) * r;
            const z = Math.sin(a) * r;
            if (!freeSpot(x, z, 0.5, { minR: 5 })) continue;
            sp.push({ x, z, len: 6 + rng() * 7, ph: rng() * 10, yaw: rng() * 6 });
          }
        },
        update(dt, time, sc) {
          sp.forEach((s, i) => {
            const L = s.len + Math.sin(time * 0.7 + s.ph) * 1.6 * (0.6 + sc);
            threads.set(i, compose(s.x, H, s.z, 0, 0, 0, 1, H - (H - L), 1));
            spiders.set(i, compose(s.x, H - L - 0.1, s.z, PI / 2.4, s.yaw + Math.sin(time + s.ph) * 0.4, 0, 1.4));
          });
          threads.done(sp.length);
          spiders.done(sp.length);
          sac.emissiveIntensity = 0.45 + Math.sin(time * 2.2) * 0.25;
          spores.update(dt, time);
        },
      };
    },
  },
  {
    id: 'crypt', name: '🪦 Creepy Crypt', color: '#69f0ae', tier: 1, min: 6, sting: 'tfCrypt',
    floor: 'crypt', floorRep: 7, wall: 'crypt', wallRep: [20, 5], win: 0x8bffb0, winK: 1.0, edge: 0x1a1e15, trim: 0x30342c,
    fire: [0xd0fff0, 0x1de9b6, 0x00695c], circle: 0x1de9b6, light: 0x4dd0a0, fog: 0x0a1410, fogNear: 16, fogFar: 100,
    hemi: [0x80cbc4, 0x1a2a20], bright: 0.85, slot: [0x64ffda, 9], eyes: 4, eyeCol: 0x76ff03,
    build(T) {
      const stone = std(0x6d7178, { roughness: 0.95 });
      const stoneD = std(0x4a4e55, { roughness: 0.95 });
      const coffinM = std(0x3e2a1e, { roughness: 0.8 });
      const coffinD = std(0x23170f);
      const brass = std(0xc9a227, { metalness: 0.7, roughness: 0.35 });
      const wax = std(0xfff3e0, { emissive: 0x332211, emissiveIntensity: 0.3 });
      const candleFl = new THREE.SpriteMaterial({ map: towerGlowTex(), color: 0x9effc8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const ripM = std(0xffffff, { map: ripTex(), roughness: 0.95 });
      const eyes = glowM(0x76ff03, 3);
      // 大鍋位：石棺 + 蠟燭
      for (const c of SLOT_C) atSlot(T.stat, c, (g) => {
        bx(g, 2.6, 1.0, 1.5, stoneD, 0, 0.5, 0, 0.08);
        const lid = bx(g, 2.8, 0.25, 1.7, stone, 0.15, 1.12, 0.05, 0.1);
        lid.rotation.y = 0.18; // 個蓋推開咗少少……
        const gap = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), addM(0x76ff03, 0.55, towerGlowTex()));
        gap.rotation.x = -PI / 2;
        gap.position.set(-1.0, 1.02, -0.1);
        g.add(gap);
        for (const [x, z] of [[-1.1, 0.8], [1.2, 0.85], [0.9, -0.85]]) {
          cyl(g, 0.08, 0.5, wax, x, 1.5, z);
          const f = new THREE.Sprite(candleFl);
          f.scale.set(0.45, 0.6, 1);
          f.position.set(x, 1.9, z);
          T.g.add(f);
          f.position.applyMatrix4(new THREE.Matrix4().makeRotationY(g.rotation.y)).add(g.position);
        }
      });
      // 書架位：企起嘅棺材（其中幾個開咗少少門，入面有對眼）
      SLOT_S.forEach((s, i) => atShelf(T.stat, s, (g) => {
        for (const ox of [-1.0, 1.0]) {
          const c = new THREE.Group();
          c.position.set(ox, 0, -0.1);
          c.rotation.z = ox * 0.04;
          g.add(c);
          bx(c, 1.3, 3.6, 0.6, coffinD, 0, 1.8, -0.1, 0.06);
          const door = bx(c, 1.25, 3.5, 0.18, coffinM, 0, 1.8, 0.28, 0.08);
          bx(c, 0.6, 0.12, 0.05, brass, 0, 2.6, 0.4, 0.3);
          bx(c, 0.12, 0.9, 0.05, brass, 0, 2.4, 0.4, 0.3);
          if ((i + (ox > 0 ? 1 : 0)) % 3 === 0) {
            door.rotation.y = -0.5;
            door.position.x = 0.35;
            door.position.z = 0.45;
            sph(c, 0.07, 0.05, 0.03, eyes, -0.16, 2.9, 0.15, true);
            sph(c, 0.07, 0.05, 0.03, eyes, 0.06, 2.9, 0.15, true);
          }
        }
      }));
      // 墓碑（撞到，淨係喺牆邊）
      const tomb = instanced(T.g, (g) => {
        bx(g, 1.1, 1.3, 0.25, ripM, 0, 0.75, 0, 0.12);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.25, 12, 1, false, 0, PI), ripM);
        top.rotation.z = PI / 2;
        top.rotation.y = PI / 2;
        top.position.y = 1.4;
        g.add(top);
        bx(g, 1.5, 0.25, 0.8, stoneD, 0, 0.12, 0.15, 0.2);
      }, 10);
      // 卡通骷髏頭（行得穿）
      const bone = std(0xf5f0e1, { roughness: 0.7 });
      const hole = new THREE.MeshBasicMaterial({ color: 0x101010 });
      const skull = instanced(T.g, (g) => {
        sph(g, 0.3, 0.27, 0.3, bone, 0, 0.27, 0);
        bx(g, 0.32, 0.14, 0.2, bone, 0, 0.1, 0.12, 0.3);
        sph(g, 0.08, 0.09, 0.04, hole, -0.11, 0.3, 0.27, true);
        sph(g, 0.08, 0.09, 0.04, hole, 0.11, 0.3, 0.27, true);
      }, 10);
      const flowers = instanced(T.g, (g) => { // 枯萎咗嘅花 + 細蠟燭
        cyl(g, 0.07, 0.3, wax, 0, 0.15, 0);
        cyl(g, 0.07, 0.22, wax, 0.2, 0.11, 0.1);
        sph(g, 0.06, 0.1, 0.06, glowM(0xb9f6ca, 3), 0, 0.36, 0, true);
      }, 14);
      // 🌫️ 地上嘅霧（慢慢轉）
      const mistM = addM(0xb2dfdb, 0.12, mistTex());
      mistM.fog = true;
      const mist = instanced(T.g, (g) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mistM);
        m.rotation.x = -PI / 2;
        g.add(m);
      }, 14);
      const ms = [];
      const wisps = particles(T.g, { n: 40, color: 0x64ffda, size: 0.45, kind: 'drift', top: 6, speed: 1.4 });
      return {
        place(rng, n, sc, solids) {
          scatter(rng, { inst: tomb, count: [5, 9], minR: 20, maxR: 21.8, rad: 0.8, scale: [0.85, 1.15], face: true, faceJit: 0.6, tilt: 0.25, solid: 0.75, doorDeg: 18 }, solids);
          scatter(rng, { inst: skull, count: [4, 8], minR: 7, maxR: 22, rad: 0.4, scale: [0.9, 1.3], tilt: 0.6 }, solids);
          scatter(rng, { inst: flowers, count: [6, 12], minR: 6, maxR: 22, rad: 0.3 }, solids);
          ms.length = 0;
          for (let i = 0; i < mist.max; i++) ms.push({ a: rng() * PI * 2, r: 5 + rng() * 17, s: 6 + rng() * 6, ph: rng() * 10 });
        },
        update(dt, time, sc) {
          ms.forEach((o, i) => {
            const a = o.a + time * 0.03;
            mist.set(i, compose(Math.cos(a) * o.r, 0.25 + i * 0.01, Math.sin(a) * o.r, 0, time * 0.05 + o.ph, 0, o.s));
          });
          mist.done(ms.length);
          mistM.opacity = 0.1 + sc * 0.1;
          wisps.update(dt, time);
        },
      };
    },
  },
  {
    id: 'chains', name: '⛓️ Prison of Chains', color: '#ffab91', tier: 2, min: 16, sting: 'tfChains',
    floor: 'chains', floorRep: 9, wall: 'chains', wallRep: [24, 6], win: 0xff8a50, winK: 0.45, edge: 0x141215, trim: 0x2b282e,
    fire: [0xffe0b2, 0xff6d00, 0x8d2b00], circle: 0xff6d00, light: 0xff7043, fog: 0x0c0606, fogNear: 16, fogFar: 92,
    hemi: [0xbcaaa4, 0x1a1010], bright: 0.78, slot: [0xff6d00, 16], eyes: 2, eyeCol: 0xffab00,
    build(T) {
      const iron = std(0x3a3a40, { metalness: 0.7, roughness: 0.45 });
      const rust = std(0x5d3a28, { metalness: 0.4, roughness: 0.7 });
      const coal = glowM(0xff5722, 2.4);
      const flames = [];
      // 大鍋位：鐵火盆
      for (const c of SLOT_C) atSlot(T.g, c, (g) => {
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * PI * 2;
          const l = cyl(g, 0.08, 1.6, iron, Math.cos(a) * 0.7, 0.75, Math.sin(a) * 0.7);
          l.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
        }
        const bowl = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 8, 0, PI * 2, PI / 2, PI / 2), iron);
        bowl.position.y = 2.0;
        g.add(bowl);
        sph(g, 0.9, 0.2, 0.9, coal, 0, 1.95, 0, true);
        flames.push(flame(g, 0, 1.9, 0, 2.2, [0xffecb3, 0xff9100, 0xd84315]));
      });
      // 書架位：空嘅籠（門開咗：入面嘅動物已經走咗）
      SLOT_S.forEach((s, i) => atShelf(T.stat, s, (g) => {
        bx(g, 3.6, 0.2, 1.4, iron, 0, 0.1, 0, 0.1);
        bx(g, 3.6, 0.2, 1.4, iron, 0, 4.2, 0, 0.1);
        for (let k = 0; k < 9; k++) cyl(g, 0.05, 4.1, rust, -1.7 + k * 0.425, 2.15, -0.65);
        for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) cyl(g, 0.05, 4.1, rust, sx * 1.75, 2.15, -0.45 + k * 0.45);
        const door = new THREE.Group();
        door.position.set(-1.75, 0, 0.65);
        door.rotation.y = -1.1 - (i % 2) * 0.4; // 開咗
        g.add(door);
        for (let k = 0; k < 8; k++) cyl(door, 0.05, 4.0, rust, 0.2 + k * 0.43, 2.15, 0);
        bx(door, 3.5, 0.12, 0.1, iron, 1.75, 1.2, 0, 0.2);
        bx(door, 3.5, 0.12, 0.1, iron, 1.75, 3.2, 0, 0.2);
        if (i % 2) sph(g, 0.5, 0.35, 0.5, std(0xc9a46a, { roughness: 1 }), 0.4, 0.45, -0.2, true); // 禾草
      }));
      // ⛓️ 天花吊落嚟嘅鐵鏈（郁嚟郁去，好高，唔阻）
      const LINKS = 26;
      const chainGeo = (() => {
        const geos = [];
        const t = new THREE.TorusGeometry(0.16, 0.045, 5, 10);
        for (let i = 0; i < LINKS; i++) {
          const g = t.clone();
          g.rotateY(i % 2 ? PI / 2 : 0);
          g.translate(0, -i * 0.26, 0);
          geos.push(g.index ? g.toNonIndexed() : g);
        }
        const hook = new THREE.TorusGeometry(0.3, 0.07, 6, 12, PI * 1.4).rotateZ(PI * 0.8).translate(0, -LINKS * 0.26 - 0.2, 0);
        geos.push(hook.toNonIndexed());
        return mergeGeometries(geos);
      })();
      const chainLen = LINKS * 0.26 + 0.5;
      const chainMesh = new THREE.InstancedMesh(chainGeo, std(0x8a8790, { metalness: 0.6, roughness: 0.35, emissive: 0x3a2018, emissiveIntensity: 0.6 }), 16);
      chainMesh.count = 0;
      chainMesh.frustumCulled = false;
      T.g.add(chainMesh);
      const ch = [];
      const barrel = instanced(T.g, (g) => {
        cyl(g, 0.6, 1.3, std(0x5d4037), 0, 0.65, 0, 0, 0, 0.6);
        for (const y of [0.2, 0.65, 1.1]) cyl(g, 0.63, 0.08, iron, 0, y, 0);
      }, 6);
      const dust = particles(T.g, { n: 70, color: 0xd7ccc8, size: 0.12, kind: 'drift', top: 14, opacity: 0.5 });
      const sparks = particles(T.g, { n: 40, color: 0xff9100, size: 0.15, kind: 'rise', top: 8, speed: 0.9 });
      return {
        place(rng, n, sc, solids) {
          scatter(rng, { inst: barrel, count: [3, 6], minR: 20.2, maxR: 21.6, rad: 0.7, scale: [0.9, 1.15], solid: 0.7, doorDeg: 18 }, solids);
          ch.length = 0;
          const count = 9 + Math.floor(rng() * 6);
          for (let t = 0; ch.length < count && t < 80; t++) {
            const a = rng() * PI * 2;
            const r = 4.5 + rng() * 17;
            const x = Math.cos(a) * r;
            const z = Math.sin(a) * r;
            const len = 7 + rng() * 5; // 下面最低 ~10 米：唔阻視線
            if (ch.some((c) => Math.hypot(c.x - x, c.z - z) < 2)) continue;
            ch.push({ x, z, s: len / chainLen, ph: rng() * 10, amp: 0.05 + rng() * 0.06 });
          }
        },
        update(dt, time, sc) {
          ch.forEach((c, i) => {
            const sw = Math.sin(time * 0.9 + c.ph) * c.amp * (1 + sc);
            chainMesh.setMatrixAt(i, compose(c.x, H + 0.5, c.z, sw, c.ph, Math.cos(time * 0.7 + c.ph) * c.amp, 1, c.s, 1));
          });
          chainMesh.count = ch.length;
          chainMesh.instanceMatrix.needsUpdate = true;
          for (const f of flames) f.userData.flicker(time);
          dust.update(dt, time);
          sparks.update(dt, time);
          coal.emissiveIntensity = 2 + Math.sin(time * 5) * 0.4;
        },
        cue: 'tfChain',
      };
    },
  },
  {
    id: 'lava', name: '🌋 Lava Dungeon', color: '#ff6e40', tier: 2, min: 16, sting: 'tfLava',
    floor: 'lava', floorGlow: LAVA_GLOW, floorGlowCol: 0xff5a1a, floorGlowK: 1.1, floorRep: 4,
    wall: 'lava', wallRep: [16, 4], wallGlow: 'self', win: 0xff4a10, winK: 0.55, edge: 0x1a0a06, trim: 0x2a120c,
    fire: [0xffecb3, 0xff3d00, 0x8d0000], circle: 0xff3d00, light: 0xff5722, fog: 0x1a0502, fogNear: 18, fogFar: 96,
    hemi: [0xff8a65, 0x401008], bright: 0.85, slot: [0xff3d00, 20], noWindows: true,
    build(T) {
      const basalt = std(0x2a1d1b, { roughness: 0.95 });
      const basalt2 = std(0x3a2724, { roughness: 0.95 });
      const lavaM = new THREE.MeshStandardMaterial({ color: 0xff6d00, emissive: 0xff3d00, emissiveIntensity: 2.2, roughness: 0.4 });
      const crackM = glowM(0xff5a1a, 2.4);
      // 大鍋位：熔岩池（四圍石，唔可以行入去）
      for (const c of SLOT_C) atSlot(T.stat, c, (g) => {
        const pool = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), lavaM);
        pool.rotation.x = -PI / 2;
        pool.position.y = 0.35;
        g.add(pool);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * PI * 2;
          sph(g, 0.55, 0.45, 0.5, i % 2 ? basalt : basalt2, Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5, true);
        }
      });
      // 書架位：玄武岩柱（有發光裂紋）
      SLOT_S.forEach((s, i) => atShelf(T.stat, s, (g) => {
        const r = seeded(s.deg);
        for (let k = 0; k < 4; k++) {
          const h = 2.5 + r() * 4;
          const x = -1.4 + k * 0.95;
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, h, 6), k % 2 ? basalt : basalt2);
          col.position.set(x, h / 2, -0.2 + r() * 0.3);
          col.castShadow = true;
          g.add(col);
          bx(g, 0.08, h * 0.7, 0.05, crackM, x + 0.1, h * 0.4, 0.3, 0.2);
        }
      }));
      // 牆上流落嚟嘅熔岩（向下流嘅貼圖）
      const fallTex = LAVA_GLOW().clone();
      fallTex.wrapS = fallTex.wrapT = THREE.RepeatWrapping;
      fallTex.repeat.set(0.4, 2);
      fallTex.needsUpdate = true;
      const fallM = new THREE.MeshBasicMaterial({ map: fallTex, color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const falls = instanced(T.g, (g) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, H), fallM);
        m.position.y = H / 2;
        g.add(m);
        const pool = new THREE.Mesh(new THREE.CircleGeometry(1.3, 16), lavaM);
        pool.rotation.x = -PI / 2;
        pool.position.set(0, 0.05, 0.6);
        g.add(pool);
      }, 5);
      const rocks = instanced(T.g, (g) => { // 細黑石 + 發光（行得穿）
        sph(g, 0.4, 0.3, 0.35, basalt2, 0, 0.12, 0, true);
        sph(g, 0.12, 0.1, 0.12, crackM, 0.2, 0.25, 0.1, true);
      }, 16);
      const spikes = instanced(T.g, (g) => { // 牆邊嘅黑曜石尖（撞到）
        cone(g, 0.5, 2.4, std(0x150b14, { roughness: 0.25, metalness: 0.4 }), 0, 1.2, 0, 0, 0, 5);
        cone(g, 0.35, 1.5, std(0x150b14, { roughness: 0.25, metalness: 0.4 }), 0.45, 0.75, 0.2, 0.2, -0.3, 5);
      }, 6);
      const embers = particles(T.g, { n: 120, color: 0xff7a1a, size: 0.18, kind: 'rise', top: 20, speed: 1.1 });
      return {
        place(rng, n, sc, solids) {
          let k = 0;
          for (let t = 0; k < 3 + Math.floor(rng() * 3) && t < 40; t++) {
            const deg = rng() * 360;
            if (degDiff(deg, 180) < 18 || degDiff(deg, 0) < 14 || SLOT_S.some((s) => degDiff(deg, s.deg) < 8)) continue;
            const p = polarL(deg, RR - 0.5);
            falls.set(k++, compose(p.x, 0, p.z, 0, faceIn(p.x, p.z), 0, 1));
          }
          falls.done(k);
          scatter(rng, { inst: rocks, count: [8, 16], minR: 6, maxR: 22, rad: 0.4, scale: [0.8, 1.6] }, solids);
          scatter(rng, { inst: spikes, count: [2, 5], minR: 20.3, maxR: 21.6, rad: 0.7, solid: 0.7, doorDeg: 18 }, solids);
        },
        update(dt, time) {
          fallTex.offset.y += dt * 0.35;
          lavaM.emissiveIntensity = 2 + Math.sin(time * 1.7) * 0.4;
          embers.update(dt, time);
        },
        cue: 'tfDrip',
      };
    },
  },
  {
    id: 'bloodmoon', name: '🌕 Blood-Moon Rooftop', color: '#ff5252', tier: 2, min: 16, sting: 'tfMoon',
    floor: 'bloodmoon', floorRep: 8, wall: 'bloodmoon', wallRep: [26, 2.6], wallScale: 0.36, win: 0xff1744, winK: 0, edge: 0x1a0c10, trim: 0x2e1a20,
    fire: [0xffcdd2, 0xff1744, 0x7f0000], circle: 0xff1744, light: 0xff5252, fog: 0x1c0408, fogNear: 22, fogFar: 110,
    hemi: [0xff6e6e, 0x2a0a10], bright: 0.85, slot: [0xff1744, 10], bats: 8, storm: true, noSky: true, eyes: 0,
    build(T) {
      const stone = std(0x5a5560, { roughness: 0.95 });
      const stoneD = std(0x3e3a44, { roughness: 0.95 });
      const brick = std(0x5a2e34, { roughness: 0.95 });
      const redEye = glowM(0xff1744, 3);
      // 🌕 大血月（喺天上，北面）
      const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex(), color: 0xffffff, transparent: true, depthWrite: false, fog: false }));
      moon.scale.set(70, 70, 1);
      moon.position.set(-20, 95, -90);
      T.g.add(moon);
      // 大鍋位：石像鬼（紅眼）
      for (const c of SLOT_C) atSlot(T.stat, c, (g) => {
        bx(g, 2.0, 1.2, 2.0, stoneD, 0, 0.6, 0, 0.08);
        bx(g, 1.1, 1.3, 1.0, stone, 0, 1.9, 0, 0.3); // 身
        bx(g, 0.8, 0.7, 0.75, stone, 0, 2.85, 0.2, 0.3); // 頭
        cone(g, 0.15, 0.5, stone, -0.28, 3.35, 0.2, 0, 0.3, 4);
        cone(g, 0.15, 0.5, stone, 0.28, 3.35, 0.2, 0, -0.3, 4);
        sph(g, 0.09, 0.07, 0.05, redEye, -0.18, 2.95, 0.58, true);
        sph(g, 0.09, 0.07, 0.05, redEye, 0.18, 2.95, 0.58, true);
        for (const sx of [-1, 1]) { // 翼
          const w = cone(g, 0.9, 1.8, stoneD, sx * 0.9, 2.4, -0.3, 0, sx * 1.1, 3);
          w.scale.z = 0.25;
        }
        bx(g, 0.35, 0.5, 0.35, stone, -0.35, 1.45, 0.55, 0.3);
        bx(g, 0.35, 0.5, 0.35, stone, 0.35, 1.45, 0.55, 0.3);
      });
      // 書架位：煙囪 + 爛磚
      SLOT_S.forEach((s, i) => atShelf(T.stat, s, (g) => {
        bx(g, 1.6, 5 + (i % 3), 1.4, brick, -0.6, (5 + (i % 3)) / 2, -0.2, 0.05);
        bx(g, 1.9, 0.35, 1.7, stoneD, -0.6, 5 + (i % 3), -0.2, 0.1);
        const r = seeded(s.deg + 9);
        for (let k = 0; k < 6; k++) bx(g, 0.5, 0.3, 0.35, brick, 0.6 + r() * 1.2, 0.15 + (k > 3 ? 0.3 : 0), r() * 0.8, 0.1).rotation.y = r() * 3;
      }));
      // 天上：斷咗嘅屋頂木樑
      const beamM = std(0x2a1a14);
      const beams = new THREE.Group();
      T.stat.add(beams);
      const r = seeded(808);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI + r() * 0.3;
        const len = 10 + r() * 14;
        const off = (r() - 0.5) * 30;
        const b = bx(beams, len, 0.6, 0.6, beamM, 0, 0, 0, 0.05);
        const nx = Math.cos(a);
        const nz = Math.sin(a);
        const sx = (r() < 0.5 ? -1 : 1) * (RR - len / 2 + 1);
        b.position.set(nx * sx - nz * off * 0.3, H * 0.36 + 0.2 + r() * 0.2, nz * sx + nx * off * 0.3);
        b.rotation.y = -a;
        b.rotation.z = (sx > 0 ? -1 : 1) * (0.12 + r() * 0.15); // 塌咗落嚟
      }
      const rubble = instanced(T.g, (g) => {
        bx(g, 0.5, 0.25, 0.35, brick, 0, 0.12, 0, 0.1);
        bx(g, 0.35, 0.2, 0.3, stoneD, 0.4, 0.1, 0.2, 0.1).rotation.y = 0.7;
      }, 18);
      const ash = particles(T.g, { n: 110, color: 0xff8a80, size: 0.14, kind: 'fall', top: 24, speed: 0.5, opacity: 0.7 });
      return {
        place(rng, n, sc, solids) {
          scatter(rng, { inst: rubble, count: [10, 18], minR: 6, maxR: 22, rad: 0.5, scale: [0.7, 1.5] }, solids);
          moon.position.x = -30 + rng() * 60;
        },
        update(dt, time) {
          ash.update(dt, time);
          redEye.emissiveIntensity = 2.4 + Math.sin(time * 3) * 0.8;
        },
        cue: 'tfWind',
      };
    },
  },
  {
    id: 'void', name: '🌌 Shadow Void', color: '#b388ff', tier: 3, min: 31, sting: 'tfVoid',
    floor: 'void', floorGlow: VOID_GLOW, floorGlowCol: 0xb388ff, floorGlowK: 1.1, floorRep: 6,
    wall: 'void', wallRep: [14, 4], wallGlow: 'void', win: 0xffffff, winK: 1.3, edge: 0x0a0614, trim: 0x1a1030,
    fire: [0xf3e5ff, 0x7c4dff, 0x1a0040], circle: 0x7c4dff, light: 0x7c4dff, fog: 0x05020c, fogNear: 14, fogFar: 90,
    hemi: [0x7e57c2, 0x0a0418], bright: 0.7, slot: [0x7c4dff, 14], eyes: 12, eyeCol: 0xea80fc, shadows: true, noWindows: true,
    build(T) {
      const obsidian = std(0x140c22, { roughness: 0.2, metalness: 0.5 });
      const rune = glowM(0xb388ff, 2.5);
      const stone = std(0x2a2238, { roughness: 0.9 });
      // 大鍋位：浮喺半空嘅黑水晶（會轉）
      const obelisks = SLOT_C.map((c) => atSlot(T.g, c, (g) => {
        const cr = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), obsidian);
        cr.scale.set(0.9, 2.2, 0.9);
        cr.position.y = 3;
        cr.castShadow = true;
        g.add(cr);
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), rune);
        core.scale.set(0.7, 1.6, 0.7);
        core.position.y = 3;
        g.add(core);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.06, 6, 32), rune);
        ring.rotation.x = PI / 2;
        ring.position.y = 0.15;
        g.add(ring);
        g.userData = { cr, core };
      }));
      // 書架位：浮住嘅爛石拱門
      SLOT_S.forEach((s) => atShelf(T.stat, s, (g) => {
        const r = seeded(s.deg + 77);
        for (let k = 0; k < 5; k++) {
          const a = (k / 4) * PI;
          bx(g, 0.9, 0.9, 0.9, stone, Math.cos(a) * 1.7, 1.2 + Math.sin(a) * 3 + r() * 0.4, -0.2, 0.2).rotation.set(r(), r(), r());
        }
        bx(g, 0.5, 2.2, 0.08, rune, 0, 2.6, 0.2, 0.3);
      }));
      // 天上：一嚿嚿浮石（圍住轉）
      const floaters = instanced(T.g, (g) => {
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), stone);
        g.add(m);
        const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0), rune);
        c.position.y = -0.75;
        g.add(c);
      }, 22);
      const fl = [];
      const wisps = particles(T.g, { n: 120, color: 0xb388ff, size: 0.3, kind: 'rise', top: 18, speed: 0.5 });
      return {
        place(rng) {
          fl.length = 0;
          const count = 14 + Math.floor(rng() * 8);
          for (let i = 0; i < count; i++) fl.push({ a: rng() * PI * 2, r: 6 + rng() * 15, y: 7 + rng() * 12, s: 0.5 + rng() * 1.4, sp: (rng() - 0.5) * 0.2, ph: rng() * 10 });
        },
        update(dt, time) {
          fl.forEach((o, i) => {
            const a = o.a + time * o.sp;
            floaters.set(i, compose(Math.cos(a) * o.r, o.y + Math.sin(time * 0.8 + o.ph) * 0.8, Math.sin(a) * o.r, time * 0.2 + o.ph, time * 0.3, 0, o.s));
          });
          floaters.done(fl.length);
          for (const g of obelisks) {
            g.userData.cr.rotation.y += dt * 0.6;
            g.userData.cr.position.y = 3 + Math.sin(time * 1.3 + g.position.x) * 0.35;
            g.userData.core.position.y = g.userData.cr.position.y;
          }
          rune.emissiveIntensity = 2 + Math.sin(time * 2.5) * 0.8;
          wisps.update(dt, time);
        },
        cue: 'tfHeart',
      };
    },
  },
];
const BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));

// 層數 → 恐怖程度
export const towerScare = (n) => clamp01((n - 1) / 40);
export const towerTier = (n) => (n <= 5 ? 0 : n <= 15 ? 1 : n <= 30 ? 2 : 3);
// 揀主題：同 tier 嘅機會大啲、啱啱解鎖嘅都有份；連續兩層一定唔同
function pickTheme(rng, n, prev) {
  const tier = towerTier(n);
  const pool = THEMES.filter((t) => t.min <= n && (t.max ?? Infinity) >= n && t.id !== prev);
  const w = pool.map((t) => (t.tier === tier ? 3 : t.tier === tier - 1 ? 1.5 : 0.7));
  let x = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) if ((x -= w[i]) <= 0) return pool[i];
  return pool[pool.length - 1];
}

export function installTowerFloors(K) {
  let def = null; // 原本個樣（reset 用）
  let cur = null; // 而家個主題
  let curFloor = 0;
  let scare = 0;
  let tier = 0;
  let runRef = null;
  let seed = 1;
  const history = {}; // 層數 → 主題 id（呢次入塔）
  const built = {}; // 主題 id → { g, api }
  let lights = null; // 場景嘅半球光、太陽、環境光
  const last = { hemi: -1, sun: -1, baseHemi: 0, baseSun: 0 };
  const fx = { flash: 0, nextFlash: 10, nextWhisper: 12, nextCue: 6, nextShadow: 14, blackout: 0, nextFlicker: 3 };
  const solids = [];
  let common = null;

  const arena = () => K.arena;
  function saveDefault() {
    if (def || !arena()) return;
    const a = arena();
    def = {
      fMap: a.floorM.map, wMap: a.wallM.map, winMap: a.wallM.emissiveMap, wTex: a.wTex, winTex: a.winTex,
      emissive: a.wallM.emissive.getHex(), eK: a.wallM.emissiveIntensity, edge: a.edgeM.color.getHex(), trim: a.trimM.color.getHex(),
      center: a.center.intensity, cl: a.cauldronLights.map((l) => [l.color.getHex(), l.intensity]), wallY: a.wall.position.y, topY: a.top.position.y, signY: a.sign.position.y,
    };
  }
  function findLights() {
    if (lights) return lights;
    const scene = arena()?.g.parent;
    if (!scene) return null;
    lights = { hemi: null, sun: null, amb: [] };
    for (const o of scene.children) {
      if (o.isHemisphereLight) lights.hemi = o;
      else if (o.isDirectionalLight && o.castShadow) lights.sun = o;
      else if (o.isAmbientLight) lights.amb.push(o);
    }
    return lights;
  }

  // ---------- 共用嘅恐怖嘢：牆上發光眼、蝙蝠、影子人 ----------
  function buildCommon() {
    if (common) return common;
    const g = new THREE.Group();
    arena().g.add(g);
    const eyeM = new THREE.MeshBasicMaterial({ map: eyesTex(), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    const eyes = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.5), eyeM, 30);
    eyes.count = 0;
    eyes.frustumCulled = false;
    eyes.setColorAt(0, new THREE.Color());
    g.add(eyes);
    const batM = std(0x121014, { roughness: 0.6 });
    const body = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 8, 6).scale(1, 0.85, 1.4), batM, 16);
    const wl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 0.03, 0.4).translate(-0.375, 0, 0), batM, 16);
    const wr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 0.03, 0.4).translate(0.375, 0, 0), batM, 16);
    for (const m of [body, wl, wr]) {
      m.count = 0;
      m.frustumCulled = false;
      g.add(m);
    }
    const shadow = new THREE.Sprite(new THREE.SpriteMaterial({ map: shadowTex(), transparent: true, opacity: 0, depthWrite: false }));
    shadow.scale.set(3.2, 3.2, 1);
    shadow.visible = false;
    g.add(shadow);
    common = { g, eyes, eyeM, body, wl, wr, shadow, eyeList: [], bats: [], sh: { t: 0, on: false } };
    return common;
  }
  function placeCommon(rng) {
    const c = buildCommon();
    // 👀 眼
    const want = Math.min(30, (cur.eyes || 0) + [0, 4, 8, 14][tier]);
    c.eyeList.length = 0;
    for (let t = 0; c.eyeList.length < want && t < want * 20; t++) {
      const deg = rng() * 360;
      if (degDiff(deg, 180) < 16) continue;
      const y = 1.2 + rng() * (cur.wallScale ? H * cur.wallScale - 2 : 13);
      if (degDiff(deg, 0) < 16 && y > 8) continue; // 層數牌
      if (c.eyeList.some((e) => degDiff(e.deg, deg) < 4 && Math.abs(e.y - y) < 1)) continue;
      const p = polarL(deg, RR - 0.95);
      c.eyeList.push({ deg, x: p.x, z: p.z, y, s: 1.1 + rng() * 0.9, ph: rng() * 10, blink: rng() * 4, vis: rng(), want: 1, next: 2 + rng() * 6 });
    }
    c.eyes.count = c.eyeList.length;
    _c.setHex(cur.eyeCol ?? 0xffea00);
    c.eyeCol = _c.clone();
    // 🦇 蝙蝠
    const bats = Math.min(16, (cur.bats || 0) + [0, 2, 4, 7][tier]);
    c.bats.length = 0;
    for (let i = 0; i < bats; i++) c.bats.push({ a: rng() * PI * 2, r: 6 + rng() * 15, y: 11 + rng() * 8, sp: (rng() < 0.5 ? -1 : 1) * (0.35 + rng() * 0.4), ph: rng() * 10 });
    c.shadow.visible = false;
    c.sh.on = false;
  }
  const _o = new THREE.Object3D();
  const _w = new THREE.Object3D();
  _o.add(_w);
  function updateCommon(dt, time) {
    const c = common;
    if (!c) return;
    c.eyeList.forEach((e, i) => {
      e.next -= dt;
      if (e.next <= 0) { // 有時收埋、有時出返嚟
        e.want = Math.random() < 0.75 ? 1 : 0;
        e.next = 2 + Math.random() * 6;
      }
      e.vis += Math.sign(e.want - e.vis) * Math.min(Math.abs(e.want - e.vis), dt * 1.5);
      e.blink -= dt;
      if (e.blink < -0.15) e.blink = 1.5 + Math.random() * 4;
      const open = e.blink < 0 ? 0.08 : 1;
      c.eyes.setMatrixAt(i, compose(e.x, e.y, e.z, 0, faceIn(e.x, e.z), 0, e.s, e.s * open, 1));
      _c.copy(c.eyeCol).multiplyScalar(e.vis * (0.75 + Math.sin(time * 2 + e.ph) * 0.25));
      c.eyes.setColorAt(i, _c);
    });
    c.eyes.instanceMatrix.needsUpdate = true;
    if (c.eyes.instanceColor) c.eyes.instanceColor.needsUpdate = true;
    c.bats.forEach((b, i) => {
      const a = b.a + time * b.sp;
      _o.position.set(Math.cos(a) * b.r, b.y + Math.sin(time * 2 + b.ph) * 0.8, Math.sin(a) * b.r);
      _o.rotation.set(0, -a + (b.sp > 0 ? PI : 0), 0);
      _o.updateMatrixWorld(true);
      c.body.setMatrixAt(i, _o.matrixWorld);
      const flap = Math.sin(time * 16 + b.ph) * 0.8;
      _w.position.set(-0.12, 0, 0);
      _w.rotation.set(0, 0, flap);
      _w.updateMatrixWorld(true);
      c.wl.setMatrixAt(i, _w.matrixWorld);
      _w.position.set(0.12, 0, 0);
      _w.rotation.set(0, 0, -flap);
      _w.updateMatrixWorld(true);
      c.wr.setMatrixAt(i, _w.matrixWorld);
    });
    for (const m of [c.body, c.wl, c.wr]) {
      m.count = c.bats.length;
      m.instanceMatrix.needsUpdate = true;
    }
    // 👤 影子人（惡夢級／虛空）：喺牆邊出現，望住你，慢慢消失
    if (tier >= 3 || cur?.shadows) {
      fx.nextShadow -= dt;
      if (fx.nextShadow <= 0 && !c.sh.on) {
        fx.nextShadow = 10 + Math.random() * 12;
        let deg = Math.random() * 360;
        if (degDiff(deg, 180) < 20) deg += 60;
        const p = polarL(deg, RR - 1.6);
        c.shadow.position.set(p.x, 1.6, p.z);
        c.shadow.visible = true;
        c.sh.on = true;
        c.sh.t = 0;
        if (Math.random() < 0.6) K.play('tfWhisper');
      }
      if (c.sh.on) {
        c.sh.t += dt;
        const k = c.sh.t;
        c.shadow.material.opacity = k < 0.8 ? k / 0.8 : k < 2.4 ? 1 : Math.max(0, 1 - (k - 2.4) / 0.8);
        if (k > 3.2) {
          c.sh.on = false;
          c.shadow.visible = false;
        }
      }
    }
  }

  // ---------- 主題起 + 套用 ----------
  function themeData(t) {
    if (built[t.id]) return built[t.id];
    const g = new THREE.Group();
    g.visible = false;
    arena().g.add(g);
    const stat = new THREE.Group();
    const api = t.build({ g, stat }) || {};
    bakeStatic(stat, g);
    // 貼圖嘅 repeat（每張主題貼圖淨係一個主題用）
    if (t.floor) FLOOR_TEX[t.floor]().repeat.set(t.floorRep || 8, t.floorRep || 8);
    if (t.floorGlow) t.floorGlow().repeat.set(t.floorRep || 8, t.floorRep || 8);
    if (t.wall) WALL_TEX[t.wall]().repeat.set(...(t.wallRep || [26, 7]));
    if (t.wallGlow && t.wallGlow !== 'self') WALL_GLOW[t.wallGlow]().repeat.set(...(t.wallRep || [26, 7]));
    built[t.id] = { g, api };
    return built[t.id];
  }
  function themeFor(n) {
    if (history[n]) return BY_ID[history[n]];
    const prev = history[n - 1] || (cur && curFloor === n - 1 ? cur.id : null);
    const t = pickTheme(seeded(seed + n * 7919), n, prev);
    history[n] = t.id;
    return t;
  }
  function newRunIfNeeded() {
    if (K.R.run && K.R.run === runRef) return;
    runRef = K.R.run;
    seed = 1 + Math.floor(Math.random() * 1e6);
    for (const k of Object.keys(history)) delete history[k];
  }
  function apply(n, force = null) {
    const a = arena();
    if (!a) return;
    saveDefault();
    newRunIfNeeded();
    const t = force || themeFor(n);
    if (force) history[n] = t.id;
    cur = t;
    curFloor = n;
    scare = towerScare(n);
    tier = towerTier(n);
    for (const b of Object.values(built)) b.g.visible = false;
    const d = themeData(t);
    d.g.visible = true;
    // 地板
    a.floorM.map = t.floor ? FLOOR_TEX[t.floor]() : def.fMap;
    a.floorM.emissiveMap = t.floorGlow ? t.floorGlow() : null;
    a.floorM.emissive.setHex(t.floorGlow ? t.floorGlowCol : 0x000000);
    a.floorM.emissiveIntensity = t.floorGlowK ?? 1;
    a.floorM.needsUpdate = true;
    const shade = 1 - 0.4 * scare; // 越高越暗
    a.floorM.color.setScalar(shade);
    a.wallM.color.setScalar(shade);
    a.edgeM.color.setHex(t.edge ?? def.edge);
    a.trimM.color.setHex(t.trim ?? def.trim);
    // 牆（升降機會郁 a.wTex／a.winTex 嘅 offset：換埋佢哋）
    const wMap = t.wall ? WALL_TEX[t.wall]() : def.wMap;
    const glow = t.wallGlow === 'self' ? wMap : t.wallGlow ? WALL_GLOW[t.wallGlow]() : def.winMap;
    a.wallM.map = wMap;
    a.wallM.emissiveMap = glow;
    a.wallM.emissive.setHex(t.win ?? def.emissive);
    a.wallM.emissiveIntensity = t.winK ?? def.eK;
    a.wallM.needsUpdate = true;
    a.wTex = wMap;
    a.winTex = glow;
    // 天台：牆矮咗（望到個天同血月）
    const ws = t.wallScale || 1;
    a.wall.scale.y = ws;
    a.wall.position.y = (H * ws) / 2;
    a.top.position.y = H * ws;
    a.sign.position.y = ws < 1 ? H * ws - 2.6 : def.signY;
    // 原本嘅傢俬
    a.shelfG.visible = !!t.base;
    for (const c of a.cauldrons) c.g.visible = !!t.base;
    for (const c of a.candles) c.c.visible = !!t.base;
    a.sky.visible = !t.noSky;
    a.broom.visible = !!t.base || t.id === 'pumpkin';
    applyColours();
    // 隨機擺道具（每層唔同）
    const rng = seeded(seed + n * 131 + 7);
    solids.length = 0;
    d.api.place?.(rng, n, scare, solids);
    setTowerFloorProps(solids.slice());
    placeCommon(rng);
    fx.flash = 0;
    fx.blackout = 0;
    fx.nextFlash = 4 + Math.random() * 6;
    fx.nextWhisper = 6 + Math.random() * 8;
    fx.nextShadow = 6 + Math.random() * 6;
    fx.nextCue = 3 + Math.random() * 5;
  }
  // 顏色：火把、魔法陣、中間盞燈（witchTower.js 嘅 applyTheme 每層開始都會用返 THEMES 嘅顏色 → start() 再塗過）
  function applyColours() {
    const a = arena();
    const t = cur;
    if (!a || !t) return;
    a.fireMats.forEach((m, k) => m.color.setHex(t.fire[k]));
    for (const tr of a.torches) tr.halo.material.color.setHex(t.light);
    a.liftMat.color.setHex(t.circle);
    a.beamMat.color.setHex(t.circle);
    a.center.color.setHex(t.light);
    a.cauldronLights.forEach((l) => l.color.setHex(t.slot[0]));
  }
  function restore() {
    const a = arena();
    if (!a || !def) return;
    for (const b of Object.values(built)) b.g.visible = false;
    if (common) {
      common.eyes.count = 0;
      for (const m of [common.body, common.wl, common.wr]) m.count = 0;
      common.shadow.visible = false;
      common.eyeList.length = 0;
      common.bats.length = 0;
    }
    a.floorM.map = def.fMap;
    a.floorM.emissiveMap = null;
    a.floorM.emissive.setHex(0);
    a.floorM.color.setHex(0xffffff);
    a.wallM.color.setHex(0xffffff);
    a.floorM.needsUpdate = true;
    a.wallM.map = def.wMap;
    a.wallM.emissiveMap = def.winMap;
    a.wallM.emissive.setHex(def.emissive);
    a.wallM.emissiveIntensity = def.eK;
    a.wallM.needsUpdate = true;
    a.wTex = def.wTex;
    a.winTex = def.winTex;
    a.edgeM.color.setHex(def.edge);
    a.trimM.color.setHex(def.trim);
    a.wall.scale.y = 1;
    a.wall.position.y = def.wallY;
    a.top.position.y = def.topY;
    a.sign.position.y = def.signY;
    a.shelfG.visible = true;
    for (const c of a.cauldrons) c.g.visible = true;
    for (const c of a.candles) c.c.visible = true;
    a.sky.visible = true;
    a.broom.visible = true;
    a.center.intensity = def.center;
    a.cauldronLights.forEach((l, i) => {
      l.color.setHex(def.cl[i][0]);
      l.intensity = def.cl[i][1];
    });
    for (const tr of a.torches) tr.f.parent.visible = true;
    setTowerFloorProps([]);
    cur = null;
    curFloor = 0;
    runRef = null;
  }

  // ---------- 每格：燈光（暫停都做）----------
  function look(dt) {
    const a = arena();
    if (!a || !cur) return;
    const L = findLights();
    // 閃電 / 熄燈
    fx.flash = Math.max(0, fx.flash - dt * 2.2);
    fx.blackout = Math.max(0, fx.blackout - dt);
    const fl = fx.flash > 0.75 ? 1 : fx.flash > 0.6 ? 0.15 : fx.flash > 0.45 ? 0.8 : fx.flash * 0.5;
    const dark = fx.blackout > 0 ? 0.35 : 1;
    const s = cur.bright * (1 - 0.55 * scare) * dark + fl * 0.9;
    if (L?.hemi) {
      // applyHalloweenSky 每格都會重新設定強度：見到唔係自己上次寫嘅數 = 新嘅底數
      if (Math.abs(L.hemi.intensity - last.hemi) > 1e-4) last.baseHemi = L.hemi.intensity;
      L.hemi.intensity = last.baseHemi * s;
      last.hemi = L.hemi.intensity;
      if (cur.hemi) {
        L.hemi.color.lerp(_c.setHex(cur.hemi[0]), 0.65);
        L.hemi.groundColor.lerp(_c.setHex(cur.hemi[1]), 0.65);
      }
    }
    if (L?.sun) {
      if (Math.abs(L.sun.intensity - last.sun) > 1e-4) last.baseSun = L.sun.intensity;
      L.sun.intensity = last.baseSun * s * (cur.noWindows ? 0.7 : 1);
      last.sun = L.sun.intensity;
      if (cur.hemi) L.sun.color.lerp(_c.setHex(cur.hemi[0]), 0.4);
    }
    for (const am of L?.amb || []) am.intensity = Math.min(am.intensity, AMB * s);
    // 中間盞燈 + 牆邊 3 盞
    const flick = tier >= 1 ? 1 - (Math.sin(performance.now() * 0.013) > 0.97 - tier * 0.02 ? 0.4 : 0) : 1;
    a.center.intensity = def.center * (cur.centerK ?? 1) * (1 - 0.35 * scare) * dark * flick + fl * 25;
    a.cauldronLights.forEach((l) => (l.intensity = cur.slot[1] * dark * (0.85 + Math.random() * 0.15 * (tier ? 1 : 0))));
    a.wallM.emissiveIntensity = (cur.winK ?? def.eK) * (1 - 0.55 * scare) * dark + (cur.noWindows ? 0 : fl * 4);
  }

  // ---------- 每格：動畫 + 恐怖事件（暫停唔做）----------
  function update(dt, time) {
    if (!cur || !K.R.inside) return;
    const d = built[cur.id];
    d?.api.update?.(dt, time, scare);
    updateCommon(dt, time);
    const a = arena();
    // 火把閃（tier 1+）：有時熄一熄
    if (tier >= 1) {
      fx.nextFlicker -= dt;
      for (const tr of a.torches) {
        tr.dim = Math.max(0, (tr.dim || 0) - dt);
        if (tr.dim > 0) tr.halo.material.opacity *= 0.15;
      }
      if (fx.nextFlicker <= 0) {
        fx.nextFlicker = (tier >= 3 ? 0.6 : tier === 2 ? 1.5 : 3) + Math.random() * 2;
        const tr = a.torches[Math.floor(Math.random() * a.torches.length)];
        tr.dim = 0.2 + Math.random() * 0.5;
      }
    }
    // ⚡ 窗外行雷（tier 3+ 或者暴風主題）；冇窗嘅主題 = 一下熄晒燈
    if (tier >= 3 || cur.storm) {
      fx.nextFlash -= dt;
      if (fx.nextFlash <= 0) {
        fx.nextFlash = (cur.storm ? 7 : 10) + Math.random() * (tier >= 3 ? 6 : 9);
        if (cur.noWindows) {
          fx.blackout = 0.5 + Math.random() * 0.6;
          if (Math.random() < 0.5) K.play('tfWhisper');
        } else {
          fx.flash = 1;
          setTimeout(() => K.play('thunder'), 200 + Math.random() * 500);
        }
      }
    }
    // 🤫 悄悄話（tier 2+）
    if (tier >= 2) {
      fx.nextWhisper -= dt;
      if (fx.nextWhisper <= 0) {
        fx.nextWhisper = (tier >= 3 ? 8 : 14) + Math.random() * 8;
        K.play('tfWhisper');
      }
    }
    // 主題自己嘅背景聲（鐵鏈、滴水、風、心跳）
    if (d?.api.cue) {
      fx.nextCue -= dt;
      if (fx.nextCue <= 0) {
        fx.nextCue = 6 + Math.random() * 9;
        K.play(d.api.cue);
      }
    }
    if (common?.bats.length && Math.random() < dt * 0.05) K.play('tfFlap');
  }

  const floor = {
    // 升降機閃光嗰下：先換好下一層（唔會見到「彈」一下）
    prepare(n) {
      apply(n);
    },
    start(n) {
      hookDebug();
      if (!cur || curFloor !== n || (K.R.run && K.R.run !== runRef)) apply(n);
      else applyColours();
      if (cur.sting) setTimeout(() => K.play(cur?.sting), 350);
      return { name: cur.name, color: cur.color };
    },
    update,
    look,
    reset() {
      restore();
    },
    get fog() {
      if (!cur) return undefined;
      return _c.setHex(cur.fog).lerp(_fogDark, scare * 0.45).getHex();
    },
    get fogNear() {
      return cur ? lerp(cur.fogNear ?? 26, 8, scare) : undefined;
    },
    get fogFar() {
      return cur ? lerp(cur.fogFar ?? 120, 66, scare) : undefined;
    },
  };
  // 測試（console）：game.towerFloors.theme('lava')
  const debug = {
    list: () => THEMES.map((t) => `${t.id} (${t.name}, from floor ${t.min}${t.max ? `–${t.max}` : '+'})`),
    theme(id, n = curFloor || K.R.floor) {
      if (!BY_ID[id]) return `no theme "${id}" — try: ${THEMES.map((t) => t.id).join(', ')}`;
      apply(n, BY_ID[id]); // 再叫 game.tower.floor(n) = 用呢個主題開始嗰層（有埋牌同大字）
      return cur.name;
    },
    get current() {
      return cur ? { id: cur.id, floor: curFloor, scare, tier, history: { ...history } } : null;
    },
  };
  // （window.game 喺 main.js 遲啲先起：入塔先掛上去）
  const hookDebug = () => {
    if (typeof window !== 'undefined' && window.game && !window.game.towerFloors) window.game.towerFloors = debug;
  };
  setTimeout(hookDebug, 0);
  return { floor };
}
const _fogDark = new THREE.Color(0x000000);
