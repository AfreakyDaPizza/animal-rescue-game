// ☄️ METEORIC 活動（Issue #10，小朋友 2026-10-21）
// 開始：幾粒好大、發藍光嘅隕石（有拖尾）由天上劃過，撞落 Hub 同每個生態區
//   → 閃光、衝擊波、地震（畫面震）、轟一聲、塵；之後地上有隕石坑：發光藍石、水晶碎、裂縫、周圍好多碎石
// 活動期間（5 分鐘）：生態區（同 Hub）周圍有發光嘅 ☄️ Meteoric Crystals，行過去就執到
//   每粒 +1（× state.crystalMultiplier），HUD 有 ☄️ Crystals: N 同倒數；執咗嘅過一陣喺第二度再跌落嚟
// 完咗：未執嘅水晶、隕石坑、碎石全部消失；Boss 變返正常
// 用法（main.js）：createMeteorEvent(scene)；每格 updateMeteor(...)；updateDayNight 之後 applyMeteorSky(...)；
//   render 之前／之後 meteorShake(me) 震鏡頭
// 唔撞嘢：隕石坑、碎石、水晶全部行得穿，唔會擋路

import * as THREE from 'three';
import { eventStatus } from './events.js';
import { HUB, PLOT } from './hubShape.js';
import { colliders, platforms, groundAt, isWalkable, bakeStatic, kingdom, biomeRect, KINGDOM_Y } from './world.js';
import { state, save } from './state.js';
import { popup, announce } from './hud.js';
import { play } from './sound.js';
import { formatTime } from './daynight.js';
import { updateMeteorLook } from './meteorBoss.js';
import { createShootingStars, updateShootingStars } from './meteorDecor.js';
import {
  seeded, crystalCluster, meteorRock, makeTrail, orientTrail, glowTexture, particlePool,
  CRYSTAL_COLORS, GEO, rockMat,
} from './meteorKit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const FLIGHT = 2.3; // 每粒隕石飛幾耐（秒）
const SKY_IN = V(1, 0.7, -0.35).normalize(); // 隕石由東邊天上斜斜飛落嚟（全部差唔多，好似一場流星雨；喺 Hub 望住生態區就見到佢哋由右劃去左）
const CRYSTALS_PER_REGION = { hub: 8, biome: 6, kingdom: 6 };

// ---- 搵位：唔撞到建築物、樹、石台；Hub 唔好喺地塊入面 ----
function clearAt(x, z, r, baseY = 0) {
  for (const c of colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + r) return false;
  for (const p of platforms) if (p.bottom === null && p.top > baseY + 0.05 && x > p.minX - r && x < p.maxX + r && z > p.minZ - r && z < p.maxZ + r) return false;
  return true;
}
const inPlot = (x, z, m) => x > PLOT.minX - m && x < PLOT.maxX + m && z > PLOT.minZ - m && z < PLOT.maxZ + m;
function inHubAt(x, z, m) {
  return z > m + 2 && Math.hypot(x - HUB.cx, z - HUB.cz) < HUB.r - m - 1.5 && !inPlot(x, z, m);
}
// 區域：0 = Hub，1–6 = Biome 1–6，7 = Biome 7 王國
function regionRect(region) {
  if (region === 0) return { minX: -HUB.r, maxX: HUB.r, minZ: 0, maxZ: HUB.cz + HUB.r };
  const r = biomeRect(region - 1);
  return region === 7 ? { minX: r.minX + 8, maxX: r.maxX - 8, minZ: r.minZ + 12, maxZ: r.maxZ - 14 } : { minX: r.minX + 2, maxX: r.maxX - 2, minZ: r.minZ + 2, maxZ: r.maxZ - 6 };
}
// 隕石坑位（平地、四周夠空）
// Hub：先試呢幾個草地位（唔喺路上面、唔喺建築物旁邊）；俾人起咗嘢（有 collider）就自己再搵
const HUB_CRATERS = [V(31, 0, 12), V(34, 0, 25.5)]; // 右上角草地、地塊右邊（圍牆前面）
const onHubPath = (x, z, m) => Math.abs(x) < 4 + m || Math.abs(z - 24) < 3 + m || (z > 33 && z < 38 && Math.abs(x) < 26);
function craterSpot(region, rand, radius, avoid) {
  if (region === 0) {
    const p = HUB_CRATERS.find((c) => inHubAt(c.x, c.z, radius * 0.6) && clearAt(c.x, c.z, radius * 0.7) && !avoid.some((a) => Math.hypot(a.x - c.x, a.z - c.z) < radius * 3));
    if (p) return p.clone();
  }
  const rect = regionRect(region);
  const baseY = region === 7 ? KINGDOM_Y : 0;
  for (let tries = 0; tries < 400; tries++) {
    const x = rect.minX + radius + rand() * (rect.maxX - rect.minX - radius * 2);
    const z = rect.minZ + radius + rand() * (rect.maxZ - rect.minZ - radius * 2);
    if (region === 0 && (!inHubAt(x, z, radius) || Math.hypot(x - HUB.cx, z - HUB.cz) < 9 || onHubPath(x, z, radius))) continue; // 唔好喺正中間（噴水池）同大路
    if (region > 0 && region < 7 && (z > rect.maxZ - 6 || Math.abs(x) > 15)) continue;
    if (region === 7 && Math.abs(groundAt(x, z, baseY + 0.1) - baseY) > 0.01) continue;
    if (region > 0 && region < 7 && groundAt(x, z, 60) > 0.01) continue; // 唔好喺山／石台上面
    if (!clearAt(x, z, radius * (region === 7 ? 0.8 : 0.7), baseY)) continue;
    if (avoid.some((a) => Math.hypot(a.x - x, a.z - z) < radius * 4)) continue;
    return V(x, baseY, z);
  }
  return null;
}
// 水晶位：行得到嘅地方（Biome 6 座山上面都得）
function crystalSpot(region, rand) {
  const rect = regionRect(region);
  for (let tries = 0; tries < 200; tries++) {
    const x = rect.minX + 1 + rand() * (rect.maxX - rect.minX - 2);
    const z = rect.minZ + 1 + rand() * (rect.maxZ - rect.minZ - 2);
    if (region === 0) {
      if (!inHubAt(x, z, 1) || groundAt(x, z, 60) > 0.01 || !clearAt(x, z, 1.4)) continue;
      return V(x, 0, z);
    }
    const y = groundAt(x, z, region === 7 ? KINGDOM_Y + 30 : 60);
    if (region === 7 ? Math.abs(y - KINGDOM_Y) > 0.6 : y > 20) continue;
    let ok = true;
    for (const c of colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + 1.2) ok = false;
    if (!ok) continue;
    if (region === 7 && !isWalkable(x, z, 0.8, y)) continue;
    if (region === 6 && z > rect.maxZ - 2) continue;
    return V(x, y, z);
  }
  return null;
}

// ---- 隕石坑（每個坑焊埋做幾件，好快）----
const scorchMat = new THREE.MeshBasicMaterial({ color: 0x0d1220, transparent: true, opacity: 0.82, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const poolMat = new THREE.MeshBasicMaterial({ color: 0x00b0ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
const crackMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const crackMat2 = new THREE.MeshBasicMaterial({ color: 0xea80fc, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
function buildCrater(spot, R, rand) {
  const tmp = new THREE.Group();
  const flat = (geo, mat, y) => {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    tmp.add(m);
    return m;
  };
  flat(new THREE.CircleGeometry(R, 28), scorchMat, 0.05);
  flat(new THREE.RingGeometry(R * 0.12, R * 0.55, 24), poolMat, 0.07);
  // 裂縫：由中間向外射，一截截之字形；藍色為主，間中粉紫色（好多顏色）
  const arms = 9;
  for (let i = 0; i < arms; i++) {
    let a = (i / arms) * Math.PI * 2 + rand() * 0.4;
    let r = R * 0.3;
    const mat = i % 3 === 2 ? crackMat2 : crackMat;
    const steps = 3 + Math.floor(rand() * 2);
    for (let s = 0; s < steps; s++) {
      const len = R * (0.28 + rand() * 0.2);
      const x0 = Math.cos(a) * r;
      const z0 = Math.sin(a) * r;
      a += (rand() - 0.5) * 0.5;
      const x1 = x0 + Math.cos(a) * len;
      const z1 = z0 + Math.sin(a) * len;
      const bar = new THREE.Mesh(GEO.box, mat);
      bar.scale.set(Math.hypot(x1 - x0, z1 - z0), 0.03, 0.16 * (1 - s / (steps + 1)));
      bar.position.set((x0 + x1) / 2, 0.08, (z0 + z1) / 2);
      bar.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      tmp.add(bar);
      r += len;
    }
  }
  // 坑邊一圈碎石
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + rand() * 0.3;
    const rr = R * (0.8 + rand() * 0.25);
    meteorRock(tmp, Math.cos(a) * rr, -0.15, Math.sin(a) * rr, 0.6 + rand() * 0.7, rand);
  }
  // 中間：隕石本身（半埋喺地底）+ 一叢好多顏色嘅水晶
  meteorRock(tmp, 0, -R * 0.12, 0, R * 0.42, rand);
  crystalCluster(tmp, rand() - 0.5, 0, rand() - 0.5, R * 0.33, rand, { colors: CRYSTAL_COLORS, glow: 1.3, count: 5 });
  // 周圍飛散嘅碎石同細水晶
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const rr = R * (1.1 + rand() * 1.6);
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    if (!clearAt(spot.x + x, spot.z + z, 0.4, spot.y)) continue;
    if (spot.region === 0 ? !inHubAt(spot.x + x, spot.z + z, 0.3) : spot.region < 7 && Math.abs(spot.x + x) > 20.5) continue; // 唔好飛出圍牆外（Hub 外面係天空）
    if (i % 3 === 0) crystalCluster(tmp, x, 0, z, 0.5 + rand() * 0.5, rand, { colors: CRYSTAL_COLORS, glow: 1.2, count: 2 });
    else meteorRock(tmp, x, -0.05, z, 0.25 + rand() * 0.35, rand);
  }
  const group = new THREE.Group();
  bakeStatic(tmp, group);
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.geometry.computeBoundingSphere();
    }
  });
  group.position.copy(spot);
  group.visible = false;
  return group;
}

// ---- 建立 ----
export function createMeteorEvent(scene) {
  const me = {
    scene, active: false, k: 0, shake: 0, flash: 0, built: false, quality: 3,
    meteors: [], craters: [], crystals: [], t: 0, collected: 0, rand: seeded(2026),
    soundCool: 0, rumbleCool: 0, wasActive: false, endFade: 0,
  };
  me.stars = createShootingStars(scene);
  me.dust = particlePool(scene, 260, { size: 3.2, texture: glowTexture([[0, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]) });
  me.sparks = particlePool(scene, 360, { size: 0.7 });
  me.bigSparks = particlePool(scene, 120, { size: 2.2 });

  // 隕石（飛緊嗰陣）：發光波 + 光暈 + 兩條拖尾
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xe1f5fe, fog: false });
  const coreGeo = new THREE.IcosahedronGeometry(2.8, 1);
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(coreGeo, coreMat);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x4fc3f7, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    glow.scale.setScalar(28);
    g.add(core, glow);
    g.visible = false;
    const trail = makeTrail(0x40c4ff, 1);
    const trail2 = makeTrail(0xffffff, 0.9);
    trail.visible = trail2.visible = false;
    scene.add(g, trail, trail2);
    me.meteors.push({ g, core, trail, trail2, state: 'idle', t: 0, delay: 0, from: V(0, 0, 0), to: V(0, 0, 0), crater: null, region: 0 });
  }
  // 撞落地：閃光 + 衝擊波（每粒隕石一套）
  for (const m of me.meteors) {
    m.flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xb3e5fc, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.flashSprite.visible = false;
    m.ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 64), new THREE.MeshBasicMaterial({ color: 0x40c4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    m.ring.rotation.x = -Math.PI / 2;
    m.ring.visible = false;
    scene.add(m.flashSprite, m.ring);
  }

  // ☄️ 可以執嘅水晶：一個 InstancedMesh（水晶）+ 一個（光柱）+ 一個 Points（光暈）
  const MAX = 60;
  me.crystalMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: 0x40c4ff, emissive: 0x0091ea, emissiveIntensity: 1.5, roughness: 0.2, flatShading: true }), MAX);
  me.beamMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.35, 1, 8, 1, true).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0x40c4ff, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), MAX);
  for (const im of [me.crystalMesh, me.beamMesh]) {
    im.count = 0;
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(im);
  }
  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
  me.halo = new THREE.Points(haloGeo, new THREE.PointsMaterial({ size: 2.6, map: glowTexture(), color: 0x40c4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  me.halo.frustumCulled = false;
  scene.add(me.halo);
  me.MAX = MAX;

  // HUD 同全畫面閃光（自己整，唔郁 hud.js）
  const style = document.createElement('style');
  style.textContent = `
#meteor-hud { position: fixed; left: 50%; top: calc(140px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); z-index: 6; pointer-events: none;
  text-align: center; font-weight: 800; color: #e1f5fe; padding: 6px 16px; border-radius: 16px; border: 3px solid #40c4ff; white-space: nowrap;
  background: linear-gradient(180deg, rgba(13, 40, 90, 0.92), rgba(20, 10, 60, 0.92)); box-shadow: 0 0 18px rgba(64, 196, 255, 0.7); }
#meteor-hud .mh-time { font-size: 14px; color: #80d8ff; letter-spacing: 0.5px; }
#meteor-hud .mh-count { font-size: 20px; }
#meteor-hud .mh-count b { color: #18ffff; }
#meteor-hud.bump .mh-count { animation: meteor-bump 0.45s ease-out; }
#meteor-hud.hurry .mh-time { color: #ff8a80; }
@keyframes meteor-bump { 0% { transform: scale(1.45); color: #fff; } 100% { transform: scale(1); } }
#meteor-flash { position: fixed; inset: 0; pointer-events: none; z-index: 5; opacity: 0;
  background: radial-gradient(circle at 50% 45%, rgba(225, 245, 255, 0.95), rgba(64, 196, 255, 0.55) 45%, rgba(48, 79, 254, 0.25)); }
body.in-movie #meteor-hud { visibility: hidden; }
body.mobile #meteor-hud { top: calc(84px + env(safe-area-inset-top, 0px)); padding: 3px 12px; }
body.mobile #meteor-hud .mh-count { font-size: 16px; }
@media (max-width: 1250px) { body:not(.mobile) #meteor-hud { top: calc(240px + env(safe-area-inset-top, 0px)); } }`;
  document.head.appendChild(style);
  me.hud = document.createElement('div');
  me.hud.id = 'meteor-hud';
  me.hud.hidden = true;
  me.hud.innerHTML = '<div class="mh-time"></div><div class="mh-count"></div>';
  me.flashEl = document.createElement('div');
  me.flashEl.id = 'meteor-flash';
  document.body.append(me.hud, me.flashEl);
  return me;
}

// 第一次開始先起隕石坑（之後重用）
function buildOnce(me) {
  if (me.built) return;
  me.built = true;
  const rand = seeded(4242);
  me.spots = [];
  const regions = [0, 0, 1, 2, 3, 4, 5, 6, 7];
  for (const region of regions) {
    const R = region === 0 ? 3.6 : region === 7 ? 7 : 5.2;
    const spot = craterSpot(region, rand, R, me.spots);
    if (!spot) continue;
    spot.region = region;
    me.spots.push(spot);
    const crater = buildCrater(spot, R, rand);
    crater.userData.R = R;
    me.scene.add(crater);
    me.craters.push(crater);
    spot.crater = crater;
  }
  // 周圍散落嘅碎石同水晶碎（成個地圖都係）：兩個 InstancedMesh
  const n = me.quality >= 3 ? 340 : me.quality === 2 ? 220 : 110;
  me.rubble = new THREE.InstancedMesh(GEO.rock, rockMat, n);
  me.shardBits = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), Math.ceil(n * 0.6));
  me.rubbleItems = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const color = new THREE.Color();
  const put = (im, list, i, region) => {
    if (region === 7 && !kingdom.open) return; // 王國未開：唔使搵位（搵唔到，浪費時間）
    const p = crystalSpot(region, rand);
    if (!p) return;
    const shard = im === me.shardBits;
    const s = shard ? 0.25 + rand() * 0.35 : 0.2 + rand() * 0.5;
    e.set(shard ? (rand() - 0.5) * 0.8 : rand() * 3, rand() * 3, shard ? (rand() - 0.5) * 0.8 : rand() * 3);
    q.setFromEuler(e);
    const sc = shard ? V(s * 0.5, s * 1.8, s * 0.5) : V(s, s * 0.7, s);
    m.compose(V(p.x, p.y + (shard ? s * 0.6 : s * 0.15), p.z), q, sc);
    list.push({ im, i, region, matrix: m.clone() });
    if (shard) im.setColorAt(i, color.set(CRYSTAL_COLORS[Math.floor(rand() * CRYSTAL_COLORS.length)]));
  };
  const regionOf = (i) => (i % 9 < 2 ? 0 : 1 + ((i % 9) - 2) % 7); // Hub 多啲
  for (let i = 0; i < n; i++) put(me.rubble, me.rubbleItems, i, regionOf(i));
  for (let i = 0; i < me.shardBits.count; i++) put(me.shardBits, me.rubbleItems, i, regionOf(i + 3));
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const im of [me.rubble, me.shardBits]) {
    for (let i = 0; i < im.count; i++) im.setMatrixAt(i, zero);
    im.frustumCulled = false;
    im.visible = false;
    me.scene.add(im);
  }
}

function showRegion(me, region, on) {
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const it of me.rubbleItems) if (it.region === region) it.im.setMatrixAt(it.i, on ? it.matrix : zero);
  me.rubble.instanceMatrix.needsUpdate = true;
  me.shardBits.instanceMatrix.needsUpdate = true;
  if (me.shardBits.instanceColor) me.shardBits.instanceColor.needsUpdate = true;
  if (on) me.rubble.visible = me.shardBits.visible = true;
}

// ---- 開始／完 ----
function start(me, into, ctx) {
  me.quality = ctx.quality ?? 3;
  buildOnce(me);
  me.active = true;
  me.t = 0;
  me.collected = 0;
  me.endFade = 0;
  me.crystals = [];
  me.kingdomOpen = kingdom.open;
  for (const c of me.craters) {
    c.visible = false;
    c.scale.setScalar(1);
  }
  for (let r = 0; r <= 7; r++) showRegion(me, r, false);
  const skip = into > 12; // 遲咗入嚟（例如活動中途開遊戲）：唔播撞落嚟，直接見到隕石坑
  const spots = me.spots.filter((s) => s.region !== 7 || me.kingdomOpen);
  // 由近至遠撞：Hub 先，跟住 Biome 1、2…（一路向北）
  spots.forEach((spot, j) => {
    const m = me.meteors[j];
    m.spot = spot;
    m.region = spot.region;
    m.to.copy(spot).setY(spot.y + 0.3);
    const dir = SKY_IN.clone().add(V((me.rand() - 0.5) * 0.25, 0, (me.rand() - 0.5) * 0.25)).normalize();
    m.from.copy(m.to).addScaledVector(dir, 240);
    m.delay = 1.2 + j * 0.55 + me.rand() * 0.25;
    m.t = 0;
    m.state = skip ? 'done' : 'wait';
    if (skip) landed(me, m, ctx, true);
  });
  if (!skip) setTimeout(() => play('meteorWhoosh'), 300);
}

function finish(me, quiet = false) {
  me.active = false;
  me.endFade = 1;
  for (const m of me.meteors) {
    m.state = 'idle';
    m.g.visible = m.trail.visible = m.trail2.visible = false;
  }
  for (const c of me.crystals) if (c.alive) c.vanish = 1;
  if (me.collected > 0 && !quiet) setTimeout(() => announce(`☄️ METEORIC is over! You collected ${me.collected} Meteoric Crystals!`), 600);
}

// 隕石撞落地
function landed(me, m, ctx, quiet) {
  const spot = m.spot;
  const crater = spot.crater;
  crater.visible = true;
  crater.userData.grow = quiet ? 1 : 0;
  crater.scale.setScalar(quiet ? 1 : 0.2);
  showRegion(me, spot.region, true);
  // 第二粒落 Hub 嗰粒先放水晶（Hub 有兩個坑，唔使放兩次）
  if (!me.crystals.some((c) => c.region === spot.region)) spawnRegionCrystals(me, spot.region);
  if (quiet) return;
  const cam = ctx.camPos;
  const dist = Math.hypot(cam.x - spot.x, cam.z - spot.z);
  // 閃光、衝擊波
  m.flashT = 0;
  m.flashSprite.visible = true;
  m.flashSprite.position.copy(spot).setY(spot.y + 3);
  m.ring.visible = true;
  m.ring.position.copy(spot).setY(spot.y + 0.25);
  m.ringT = 0;
  // 塵、火花（低畫質少啲）
  const q = me.quality;
  const dustN = q >= 3 ? 46 : q === 2 ? 30 : q === 1 ? 16 : 8;
  const v = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i < dustN; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 4 + Math.random() * 9;
    v.set(Math.cos(a) * s, 2 + Math.random() * 6, Math.sin(a) * s);
    p.copy(spot).add(V(Math.cos(a) * 1.5, 0.8 + Math.random(), Math.sin(a) * 1.5));
    me.dust.spawn(p, v, 2.2 + Math.random() * 1.6, i % 4 === 0 ? 0x5c6bc0 : 0x6f7f99);
  }
  for (let i = 0; i < dustN; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 6 + Math.random() * 16;
    v.set(Math.cos(a) * s, 6 + Math.random() * 14, Math.sin(a) * s);
    me.bigSparks.spawn(p.copy(spot).setY(spot.y + 1), v, 0.8 + Math.random() * 0.8, CRYSTAL_COLORS[i % CRYSTAL_COLORS.length]);
  }
  // 震 + 閃（越近越勁）
  me.shake = Math.max(me.shake, 1.1 * Math.exp(-dist / 38));
  me.flash = Math.max(me.flash, dist < 120 ? 0.75 * Math.exp(-dist / 45) : 0);
  if (dist < 140 && me.soundCool <= 0) {
    play('meteorBoom');
    me.soundCool = 0.35;
  } else if (me.rumbleCool <= 0) {
    play('meteorRumble');
    me.rumbleCool = 0.7;
  }
}

function spawnRegionCrystals(me, region) {
  if (region === 7 && !me.kingdomOpen) return;
  const n = region === 0 ? CRYSTALS_PER_REGION.hub : region === 7 ? CRYSTALS_PER_REGION.kingdom : CRYSTALS_PER_REGION.biome;
  for (let i = 0; i < n; i++) {
    const p = crystalSpot(region, me.rand);
    if (!p || me.crystals.length >= me.MAX) continue;
    me.crystals.push({ region, p, alive: true, drop: 1 + Math.random() * 1.2, ph: Math.random() * 10, vanish: 0, respawn: 0 });
  }
}

// 執到一粒
function collect(me, c) {
  c.alive = false;
  c.respawn = 12 + Math.random() * 10; // 過一陣喺同一區第二度再跌一粒落嚟
  const mult = state.crystalMultiplier || 1;
  state.meteorCrystals = (state.meteorCrystals || 0) + mult;
  me.collected += mult;
  save();
  play('crystal');
  popup(`+${mult} ☄️ Meteoric Crystal${mult > 1 ? 's' : ''}!`);
  const v = new THREE.Vector3();
  const p = c.p.clone().setY(c.p.y + 1);
  for (let i = 0; i < 26; i++) {
    v.set(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(3 + Math.random() * 4);
    me.sparks.spawn(p, v, 0.6 + Math.random() * 0.6, CRYSTAL_COLORS[i % CRYSTAL_COLORS.length]);
  }
  me.hud.classList.remove('bump');
  void me.hud.offsetWidth;
  me.hud.classList.add('bump');
}

// ---- 每格 ----
// ctx：{ camPos（玩家位置）, feetY, quality, playing（冇暫停）, bosses }
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _back = new THREE.Vector3();
const UP = V(0, 1, 0);
export function updateMeteor(me, dt, time, ctx) {
  const s = eventStatus();
  const on = s.active && s.ev.id === 'meteor';
  if (on && (!me.active || me.key !== s.key)) {
    if (me.active) finish(me, true); // 換咗另一場（例如 game.forceEvent）：由頭嚟過
    me.key = s.key;
    start(me, s.into, ctx);
  }
  if (!on && me.active) finish(me);
  me.k += ((on ? 1 : 0) - me.k) * Math.min(1, dt * 0.8);
  me.soundCool -= dt;
  me.rumbleCool -= dt;
  const cam = ctx.camPos;

  // 天上流星：平時間中一條；活動期間係流星雨
  updateShootingStars(me.stars, dt, cam, { rate: on ? 14 : 1, quality: ctx.quality });
  if (ctx.bosses) updateMeteorLook(ctx.bosses, on || me.k > 0.5, time);

  // 隕石飛落嚟
  for (const m of me.meteors) {
    if (m.state === 'wait') {
      m.delay -= dt;
      if (m.delay <= 0) {
        m.state = 'fly';
        m.t = 0;
        m.g.visible = m.trail.visible = m.trail2.visible = true;
      }
    }
    if (m.state === 'fly') {
      m.t += dt;
      const k = Math.min(1, m.t / FLIGHT);
      const e = k ** 1.7; // 越飛越快
      m.g.position.lerpVectors(m.from, m.to, e);
      m.core.rotation.set(time * 3, time * 2, 0);
      _back.subVectors(m.from, m.to).normalize();
      orientTrail(m.trail, m.g.position, _back, 80 * Math.min(1, k * 4), 12, cam);
      orientTrail(m.trail2, m.g.position, _back, 45 * Math.min(1, k * 4), 4, cam);
      if (ctx.quality >= 1) for (let i = 0; i < 2; i++) {
        _p.copy(m.g.position).addScaledVector(_back, Math.random() * 12);
        me.sparks.spawn(_p, V((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6), 0.7, 0x80d8ff);
      }
      if (k >= 1) {
        m.state = 'done';
        m.g.visible = m.trail.visible = m.trail2.visible = false;
        landed(me, m, ctx, false);
      }
    }
    // 閃光同衝擊波
    if (m.flashSprite.visible) {
      m.flashT += dt;
      const f = m.flashT;
      m.flashSprite.scale.setScalar(f < 0.15 ? (f / 0.15) * 55 : 55 + f * 20);
      m.flashSprite.material.opacity = f < 0.15 ? 1 : Math.max(0, 1 - (f - 0.15) / 0.9);
      if (f > 1.1) m.flashSprite.visible = false;
    }
    if (m.ring.visible) {
      m.ringT += dt;
      const r = m.ringT / 1.4;
      m.ring.scale.setScalar(1 + r * 34);
      m.ring.material.opacity = Math.max(0, 1 - r);
      if (r >= 1) m.ring.visible = false;
    }
  }
  // 隕石坑由細變大（撞落嗰下）；完咗就縮細消失
  for (const c of me.craters) {
    if (!c.visible) continue;
    if (me.active) {
      if (c.userData.grow < 1) {
        c.userData.grow = Math.min(1, c.userData.grow + dt * 2.2);
        const g = 1 - (1 - c.userData.grow) ** 3;
        c.scale.set(0.2 + 0.8 * g, 0.2 + 0.8 * g, 0.2 + 0.8 * g);
      }
    } else {
      c.scale.multiplyScalar(Math.max(0, 1 - dt * 2.5));
      if (c.scale.x < 0.05) c.visible = false;
    }
  }
  if (!me.active && me.rubble?.visible && me.endFade > 0) {
    me.endFade -= dt;
    if (me.endFade <= 0) {
      for (let r = 0; r <= 7; r++) showRegion(me, r, false);
      me.rubble.visible = me.shardBits.visible = false;
    }
  }

  // ☄️ 水晶：跌落嚟、轉、上下浮；行過去就執到
  let n = 0;
  const halo = me.halo.geometry.attributes.position.array;
  for (const c of me.crystals) {
    if (!c.alive && me.active && c.respawn > 0) {
      c.respawn -= dt;
      if (c.respawn <= 0) {
        const p = crystalSpot(c.region, me.rand);
        if (p) {
          c.p = p;
          c.alive = true;
          c.drop = 1;
        } else c.respawn = 5;
      }
    }
    if (!c.alive && !(c.vanish > 0)) continue;
    let scale = 1;
    let y = c.p.y + 1 + Math.sin(time * 2.2 + c.ph) * 0.18;
    if (c.drop > 0) { // 由天上跌落嚟（有閃閃拖尾）
      c.drop = Math.max(0, c.drop - dt * 1.4);
      y += c.drop * c.drop * 30;
      if (ctx.quality >= 1 && Math.random() < 0.6) me.sparks.spawn(_p.set(c.p.x, y + 0.5, c.p.z), V(0, 2, 0), 0.5, 0x80d8ff);
      if (c.drop === 0) for (let i = 0; i < 10; i++) me.sparks.spawn(_p.set(c.p.x, c.p.y + 0.3, c.p.z), V((Math.random() - 0.5) * 5, Math.random() * 4, (Math.random() - 0.5) * 5), 0.6, 0x18ffff);
    }
    if (c.vanish > 0) { // 活動完：縮細消失
      c.vanish = Math.max(0, c.vanish - dt * 1.5);
      scale = c.vanish;
      if (c.vanish === 0) c.alive = false;
    }
    if (n >= me.MAX) break;
    _q.setFromAxisAngle(UP, time * 1.6 + c.ph);
    _s.set(scale, scale * 1.7, scale);
    _m.compose(_p.set(c.p.x, y, c.p.z), _q, _s);
    me.crystalMesh.setMatrixAt(n, _m);
    _q.identity();
    _s.set(scale * (1 + Math.sin(time * 3 + c.ph) * 0.15), 9 * scale, scale);
    _m.compose(_p.set(c.p.x, c.p.y, c.p.z), _q, _s);
    me.beamMesh.setMatrixAt(n, _m);
    halo[n * 3] = c.p.x;
    halo[n * 3 + 1] = y;
    halo[n * 3 + 2] = c.p.z;
    n++;
    // 執
    if (me.active && ctx.playing && c.alive && c.drop === 0 && c.vanish === 0) {
      const d = Math.hypot(cam.x - c.p.x, cam.z - c.p.z);
      const fy = ctx.feetY ?? 0;
      if (d < 1.6 && fy > c.p.y - 1.5 && fy < c.p.y + 2.5) collect(me, c);
    }
  }
  me.crystalMesh.count = me.beamMesh.count = n;
  me.crystalMesh.instanceMatrix.needsUpdate = me.beamMesh.instanceMatrix.needsUpdate = true;
  me.halo.geometry.setDrawRange(0, n);
  me.halo.geometry.attributes.position.needsUpdate = true;
  me.halo.visible = n > 0;
  if (!me.active && n === 0) me.crystals = [];

  // 粒子
  me.dust.update(dt, 1.2, 1.4);
  me.sparks.update(dt, 4, 0.8);
  me.bigSparks.update(dt, 18, 0.4);

  // 震同閃
  me.shake = Math.max(0, me.shake - dt * 1.1);
  me.flash = Math.max(0, me.flash - dt * 1.6);
  me.flashEl.style.opacity = me.flash.toFixed(3);

  // HUD
  me.hud.hidden = !me.active;
  if (me.active) {
    me.hud.classList.toggle('hurry', s.left < 30);
    const time1 = `☄️ METEOR SHOWER · ${formatTime(s.left)} left`;
    const count = `☄️ Crystals: <b>${state.meteorCrystals || 0}</b>`;
    if (me.lastTime !== time1) me.hud.firstChild.textContent = me.lastTime = time1;
    if (me.lastCount !== count) me.hud.lastChild.innerHTML = me.lastCount = count;
  }
}

// render 之前叫：回傳一個震動位移（冇震就 null）；render 之後記得減返
const _shake = new THREE.Vector3();
export function meteorShake(me) {
  if (me.shake <= 0.002) return null;
  const a = me.shake;
  return _shake.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a * 0.8, (Math.random() - 0.5) * a);
}

// 活動期間：天空同霧帶少少藍紫色（好多顏色、好夢幻）；要喺 updateDayNight 之後叫
const SKY_TOP = new THREE.Color(0x3d1a8f);
const SKY_LOW = new THREE.Color(0x4f8fd8);
export function applyMeteorSky(me, scene, skyUniforms) {
  const k = me.k;
  if (k <= 0.001) return;
  scene.background.lerp(SKY_LOW, k * 0.35);
  scene.fog.color.copy(scene.background);
  skyUniforms.bottom.value.copy(scene.background);
  skyUniforms.top.value.lerp(SKY_TOP, k * 0.55);
}
