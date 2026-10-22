// ☄️ METEORIC SHOP（小朋友 Issue #10）：Hub 入面、Magic Library 隔籬（背脊貼住左邊圍牆）
// 用 💎 Meteor Crystals（state.meteorCrystals，Meteoric 活動度執）買：
//   - ☄️ Meteoric Shard（250）：入 state.gears（{ type: 'meteoricShard' }），喺背包用 → 寵物變藍色 METEORIC、x5 錢
//   - ✖️ Meteoric Crystals Multiplier：每買一次 state.crystalMultiplier +0.5（x1 → x1.5 → x2…），越買越貴
//   - 🧰 Meteoric Chest（100）：開箱動畫 → 5 隻新寵物之一，或者 🌌 Astral Reroll（入 state.gears：{ type: 'astralReroll' }）
//   - 🦹 Meteoric Boss Skin（500）：買一次；之後喺任何生態區 Boss 隔籬撳 E 換皮膚（meteorBossSkin.js）
//   - 🌌 Cosmic Arcadragon（1000）：Eternal 寵物，每隻 $500M–$1B/秒（data/animals.js fixedMoney）
// 數值全部喺 data/meteorShop.js
//
// main.js 用法：
//   const meteorShop = createMeteorShop({ scene, camera, openShop, teleport, resume, popup, announce })
//   meteorShop.update(dt, time, camera.position)
//   meteorShop.interaction(pos) → { prompt, action } | null
//   giveCrystals(n)  // 測試用（window.game.crystals）

import * as THREE from 'three';
import { state, save } from './state.js';
import { INDEX_NEW_SPECIES_REWARD, rarityInfo, METEOR_OPEN_DATE } from './data/balance.js';

// ☄️ 開放日（小朋友 2026-10-22：同 METEORIC 活動一齊，10 月 24 號開）；控制面板可以提早開（state.meteorEarly）
const today = () => new Date().toLocaleDateString('en-CA');
export const isMeteorOpen = () => today() >= METEOR_OPEN_DATE || !!state.meteorEarly;
export function meteorOpenText() {
  const [y, m, d] = METEOR_OPEN_DATE.split('-').map(Number);
  const open = new Date(y, m - 1, d);
  const days = Math.max(0, Math.ceil((open - Date.now()) / 86400000));
  return `${open.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (in ${days} day${days === 1 ? '' : 's'})`;
}
import {
  METEORIC_SHARD_COST, METEOR_CHEST_COST, METEOR_BOSS_SKIN_COST, ARCADRAGON_COST, ARCADRAGON_MONEY,
  MULTIPLIER_STEP, MULTIPLIER_MAX, multiplierCost, METEOR_CHEST_DROPS, chestPercent, rollMeteorChest,
} from './data/meteorShop.js';
import { findAnimal, randomKg, itemMoney } from './data/animals.js';
import { buildAnimalModel } from './animalModels.js';
import { METEOR_SHOP } from './hubShape.js';
import { addCollider } from './world.js';
import { extraPanels, closePanel, panelKind, openPanel } from './hud.js';
import { petPic } from './animalPics.js';
import { makeSign } from './signs.js';
import { playMovie, once, shake } from './movie.js';
import { short } from './format.js';
import { play } from './sound.js';
import { V, M, GLOW, B, S, pivot, cyl, torus } from './echoPetModels.js';
import { ROCK, ROCK2, ROCK3, CYAN, ICE, AQUA, glowMat, crystal, crystalCluster, crack, starBit } from './meteorPetModels.js';

const PI = Math.PI;
const WHITE = new THREE.Color(0xffffff);
const $ = (id) => document.getElementById(id);
const GEM = '💎';
export const crystalsOf = () => state.meteorCrystals || 0;
export const crystalMultiplier = () => state.crystalMultiplier || 1;
export function giveCrystals(n = 5000) {
  state.meteorCrystals = crystalsOf() + n;
  save();
  if (panelKind() === 'meteor') openPanel('meteor');
  return state.meteorCrystals;
}

// 📍 舖頭：面向 +x（Hub 中間）；本地 +z = 前面
const ROT = PI / 2;
const FRONT = V(Math.sin(ROT), 0, Math.cos(ROT)); // (1, 0, 0)
const SIDE = V(Math.cos(ROT), 0, -Math.sin(ROT)); // (0, 0, -1)
const SCALE = 1.2; // 間舖成個放大少少（同隔籬個圖書館襯啲）
const SHOP_SPOT = { x: METEOR_SHOP.x + FRONT.x * 3.2 * SCALE, z: METEOR_SHOP.z + FRONT.z * 3.2 * SCALE };
const THEME = { top: '#3d5afe', bottom: '#1a237e', border: '#00e5ff', text: '#e1f5fe' };
const additive = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });

// ======================== 🧰 Meteoric Chest ========================
// 深藍金屬箱 + 發光藍間條 + 角落水晶 + 星星鎖 + 藍色裂紋；蓋（lid）可以打開
export function buildMeteorChest() {
  const g = new THREE.Group();
  const metal = 0x1a2a6c;
  const metal2 = 0x121c4a;
  const glowM = glowMat(CYAN, 2.2);
  const crystM = glowMat(AQUA, 1.6, { roughness: 0.1 });
  const base = pivot(g, 0, 0.32, 0);
  B(base, 1.0, 0.6, 0.7, metal, 0, 0, 0, {}, { line: 0.05, r: 0.1 });
  B(base, 1.01, 0.04, 0.71, metal2, 0, -0.12, 0, {}, { r: 0.3 });
  for (const x of [-0.38, 0.38]) B(base, 0.1, 0.62, 0.72, CYAN, x, 0, 0, glowM, { r: 0.2 }); // 發光間條
  // 星空點點（前面）
  for (const [x, y] of [[-0.2, 0.12], [0.18, -0.15], [0.05, 0.18], [-0.12, -0.18], [0.25, 0.1]]) S(base, 0.018, 0.018, 0.01, 0xffffff, x, y, -0.355, GLOW(0xffffff, 2), { lo: true });
  const cracks = [crack(base, -0.2, -0.04, -0.356, 0.16, 0.7, glowM, 0.02), crack(base, 0.2, -0.02, -0.356, 0.14, -0.5, glowM, 0.02)];
  // 角落水晶
  for (const x of [-0.5, 0.5]) for (const z of [-0.35, 0.35]) crystal(base, 0.05, 0.1, x, -0.28, z, crystM, { line: 0 });
  // 蓋（pivot 喺後面頂）
  const lid = pivot(g, 0, 0.62, 0.35);
  const lidBody = pivot(lid, 0, 0, -0.35);
  B(lidBody, 1.04, 0.22, 0.74, metal, 0, 0.11, 0, {}, { line: 0.05, r: 0.2 });
  const arch = cyl(lidBody, 0.37, 0.37, 1.03, metal, 0, 0.2, 0, {}, 24);
  arch.rotation.z = PI / 2;
  arch.scale.set(0.45, 1, 1);
  for (const x of [-0.38, 0.38]) {
    const band = cyl(lidBody, 0.38, 0.38, 0.11, CYAN, x, 0.2, 0, glowM, 24);
    band.rotation.z = PI / 2;
    band.scale.set(0.47, 1, 1.02);
  }
  // 蓋頂一撮水晶 + 前面星星鎖
  crystalCluster(lidBody, 0.9, 0, 0.32, 0, crystM);
  const lock = pivot(lidBody, 0, 0.02, -0.39);
  B(lock, 0.16, 0.16, 0.06, 0xffd740, 0, 0, 0, { metalness: 0.7, roughness: 0.25 }, { line: 0.08, r: 0.3 });
  starBit(lock, 0.08, 0, 0, -0.04, glowM);
  // 裏面嘅光（開蓋先見到）
  const innerGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), additive(CYAN, 0.9));
  innerGlow.rotation.x = -PI / 2;
  innerGlow.position.y = 0.61;
  g.add(innerGlow);
  return { g, lid, base, glowMat: glowM, innerGlow, cracks };
}

// ☄️ Meteoric Shard（小水晶碎）
function buildShard() {
  const g = new THREE.Group();
  const m = glowMat(CYAN, 1.8, { roughness: 0.08 });
  crystal(g, 0.18, 0.5, 0, 0.5, 0, m);
  crystal(g, 0.1, 0.28, -0.2, 0.3, 0.05, m, { rz: 0.5 });
  crystal(g, 0.09, 0.24, 0.19, 0.27, -0.03, m, { rz: -0.5 });
  B(g, 0.6, 0.12, 0.4, ROCK, 0, 0.06, 0, {}, { line: 0.08, r: 0.4 });
  return g;
}
// ✖️ 倍數：一粒水晶 + 「x」字
function buildMultiplier() {
  const g = buildShard();
  const gold = M(0xffd740, { metalness: 0.6, roughness: 0.25, ...GLOW(0xffab00, 0.6) });
  for (const r of [PI / 4, -PI / 4]) B(g, 0.5, 0.1, 0.1, 0xffd740, 0.38, 0.75, 0, gold, { r: 0.4 }).rotation.z = r;
  return g;
}
// 🦹 Boss 皮膚：藍色隕石頭盔仔
function buildHelmet() {
  const g = new THREE.Group();
  B(g, 0.7, 0.7, 0.7, ROCK, 0, 0.4, 0, {}, { line: 0.06, r: 0.25 });
  for (const s of [-1, 1]) B(g, 0.14, 0.17, 0.04, CYAN, s * 0.16, 0.45, -0.36, glowMat(CYAN, 3), { r: 0.3 });
  crystalCluster(g, 1.3, 0, 0.72, 0, glowMat(CYAN, 1.6));
  crack(g, -0.36, 0.3, 0, 0.2, 0.5, glowMat(CYAN, 2)).rotation.y = PI / 2;
  return g;
}

// ======================== 🏪 舖頭 ========================
function buildBuilding(scene) {
  const g = new THREE.Group();
  g.position.set(METEOR_SHOP.x, 0, METEOR_SHOP.z);
  g.rotation.y = ROT;
  g.scale.setScalar(SCALE);
  scene.add(g);
  const rimM = glowMat(CYAN, 1.6);
  const crystM = glowMat(CYAN, 1.5, { roughness: 0.1 });
  const crystV = glowMat(0xb388ff, 1.5, { roughness: 0.1 });
  const crackM = glowMat(AQUA, 2.4);
  // 地台：深藍石 + 發光邊
  cyl(g, 4.2, 4.4, 0.3, ROCK2, 0, 0.15, 0, {}, 8);
  const rim = torus(g, 4.25, 0.06, CYAN, 0, 0.31, 0, rimM);
  rim.rotation.x = PI / 2;
  rim.scale.set(1, 1, 1);
  // 間舖：後牆 + 兩邊牆 + 屋頂（隕石藍）
  B(g, 4.8, 3.6, 0.4, ROCK, 0, 2.1, -1.5, {}, { line: 0.01, r: 0.08 });
  for (const s of [-1, 1]) B(g, 0.45, 3.6, 2.6, ROCK, s * 2.2, 2.1, -0.4, {}, { line: 0.01, r: 0.1 });
  // 後牆入面：星空牆紙（深色 + 星星）
  B(g, 4.0, 2.8, 0.05, 0x0d1240, 0, 2.2, -1.27, {}, { r: 0.3 });
  const starM = glowMat(0xffffff, 2.5);
  for (let i = 0; i < 14; i++) S(g, 0.03, 0.03, 0.02, 0xffffff, -1.8 + ((i * 37) % 36) / 10, 1.0 + ((i * 53) % 24) / 10, -1.23, starM, { lo: true });
  // 牆上嘅發光裂紋
  for (const [x, y, rz] of [[-2.43, 1.4, 0.5], [-2.43, 2.6, -0.4], [2.43, 1.8, 0.6], [2.43, 3.0, -0.3]]) crack(g, x, y, 0.4, 0.5, rz, crackM, 0.04).rotation.y = PI / 2;
  // 屋頂 + 發光邊
  B(g, 5.4, 0.35, 3.4, ROCK2, 0, 4.05, -0.2, {}, { line: 0.02, r: 0.2 });
  B(g, 5.5, 0.1, 3.5, CYAN, 0, 3.86, -0.2, rimM, { r: 0.3 });
  // 屋頂：一粒撞咗落嚟嘅大隕石（插住水晶），後面仲有藍火尾
  const meteor = pivot(g, 0.4, 5.4, -0.6);
  B(meteor, 1.7, 1.4, 1.5, ROCK, 0, 0, 0, {}, { line: 0.04, r: 0.38 });
  B(meteor, 1.2, 0.3, 1.1, ROCK3, 0, 0.62, 0, {}, { r: 0.4 });
  crack(meteor, -0.4, 0, -0.76, 0.6, 0.6, crackM, 0.05);
  crack(meteor, 0.4, 0.2, -0.76, 0.5, -0.5, crackM, 0.05);
  crack(meteor, 0.86, 0, 0, 0.6, 0.3, crackM, 0.05).rotation.y = PI / 2;
  crystalCluster(meteor, 2.6, -0.2, 0.6, 0.1, crystM, 0.2);
  crystalCluster(meteor, 1.8, 0.55, 0.5, -0.3, crystV, -0.4);
  crystalCluster(meteor, 1.5, -0.7, 0.3, -0.5, crystM, 0.6);
  meteor.rotation.set(0.2, 0.3, -0.25);
  const trail = [];
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.7 - i * 0.1, 2.2, 16, 1, true), additive(i % 2 ? AQUA : CYAN, 0.4 - i * 0.06));
    c.position.set(1.2 + i * 0.45, 0.9 + i * 0.45, 0.2);
    c.rotation.z = 2.2;
    meteor.add(c);
    trail.push(c);
  }
  // 前面兩條柱，頂有發光水晶燈
  const lamps = [];
  for (const s of [-1, 1]) {
    B(g, 0.4, 3.6, 0.4, ROCK3, s * 2.2, 2.1, 1.0, {}, { line: 0.05 });
    lamps.push(crystal(g, 0.22, 0.45, s * 2.2, 4.55, 1.0, crystM));
  }
  // 櫃位
  B(g, 4.0, 1.05, 0.85, ROCK, 0, 0.82, 0.75, {}, { line: 0.02, r: 0.08 });
  B(g, 3.8, 0.7, 0.04, 0x283593, 0, 0.8, 1.19, {}, { r: 0.2 });
  for (const x of [-1.2, 0, 1.2]) starBit(g, 0.16, x, 0.82, 1.22, rimM);
  B(g, 4.1, 0.12, 0.95, ROCK3, 0, 1.4, 0.75, {}, { r: 0.3 });
  B(g, 4.12, 0.04, 0.97, CYAN, 0, 1.33, 0.75, rimM, { r: 0.3 });
  // 櫃面：展示用嘅 Meteoric Chest + 一樽水晶 + 吉祥物 Meteoric Soul
  const display = buildMeteorChest();
  display.g.scale.setScalar(0.8);
  display.g.position.set(1.05, 1.46, 0.7);
  display.g.rotation.y = PI;
  g.add(display.g);
  const jar = pivot(g, -1.35, 1.46, 0.75);
  cyl(jar, 0.22, 0.22, 0.48, 0xe1f5fe, 0, 0.24, 0, { transparent: true, opacity: 0.3, roughness: 0.05 }, 20);
  cyl(jar, 0.19, 0.19, 0.08, 0x1a237e, 0, 0.52, 0, {}, 20);
  for (let i = 0; i < 7; i++) crystal(jar, 0.05, 0.09, Math.cos(i * 2.3) * 0.1, 0.1 + (i % 3) * 0.11, Math.sin(i * 2.3) * 0.1, i % 2 ? crystV : crystM, { line: 0 });
  let mascot = null;
  try {
    mascot = buildAnimalModel(findAnimal('Meteoric Soul'));
    mascot.scale.setScalar(0.85);
    mascot.position.set(-0.2, 1.4, 0.7);
    mascot.rotation.y = PI; // 面向客人（+z）
    g.add(mascot);
  } catch (e) {
    console.warn('meteor mascot failed', e);
  }
  // 地上水晶（地台周圍）
  for (const [x, z, s, v] of [[-3.4, -1.6, 1.6, 0], [3.3, -1.9, 1.3, 1], [-3.6, 1.4, 1.1, 1], [3.5, 1.5, 1.4, 0], [-2.9, -3.0, 1.2, 0], [2.6, -3.1, 1.0, 1]]) crystalCluster(g, s, x, 0.25, z, v ? crystV : crystM, (x > 0 ? -1 : 1) * 0.2);
  // 浮喺舖頭前面嘅細水晶（轉圈）
  const floaters = [];
  for (let i = 0; i < 6; i++) floaters.push(crystal(g, 0.07, 0.16, 0, 0, 0, i % 2 ? crystV : crystM, { line: 0 }));
  // 招牌（雙面，屋頂前面）
  const sign = makeSign([{ text: '☄️ METEORIC SHOP', size: 0.42 }, { text: `${GEM} Spend your Meteor Crystals here!`, size: 0.2 }], 5.0, 1.15, THEME);
  sign.position.set(0, 4.75, 1.45);
  g.add(sign);
  // 燈
  const lamp = new THREE.PointLight(0x40c4ff, 16, 14, 1.5);
  lamp.position.set(0, 3.0, 2.2);
  g.add(lamp);
  // 地上發光圈（企喺度撳 E）
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 40), additive(CYAN, 0.6));
  ring.rotation.x = -PI / 2;
  ring.position.set(0, 0.32, 3.2);
  g.add(ring);
  addCollider(METEOR_SHOP.x - FRONT.x * 0.3 * SCALE, METEOR_SHOP.z - FRONT.z * 0.3 * SCALE, 2.6 * SCALE);
  return { g, display, mascot, ring, floaters, trail, lamps, crystM, crystV, crackM, rimM, lamp };
}

// ======================== 🛒 面板 ========================
const pics = {};
function picture(key, build, cam = [-1.2, 1.4, -2.4], look = [0, 0.45, 0]) {
  if (pics[key] !== undefined) return pics[key];
  try {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(240, 200, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.setClearColor(0, 0);
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.4));
    const d = new THREE.DirectionalLight(0xffffff, 2);
    d.position.set(2, 4, -4);
    s.add(d);
    const obj = build();
    obj.rotation.y = 0.5;
    s.add(obj);
    const c = new THREE.PerspectiveCamera(32, 240 / 200, 0.1, 50);
    c.position.set(...cam);
    c.lookAt(...look);
    r.render(s, c);
    pics[key] = r.domElement.toDataURL();
    r.dispose();
    r.forceContextLoss();
  } catch {
    pics[key] = '';
  }
  return pics[key];
}
const img = (src, emoji) => (src ? `<img class="met-img" src="${src}" alt="">` : `<div class="emoji">${emoji}</div>`);

function card({ id, pic, title, price, text, owned = false, extra = '' }) {
  const cc = crystalsOf();
  const can = cc >= price;
  const button = owned
    ? `<span class="tag">✔ ${owned === true ? 'Owned' : owned}</span>`
    : `<button data-meteor="${id}" ${can ? '' : 'disabled class="grey"'}>${can ? `Buy ${GEM} ${short(price)}` : `Need ${short(price - cc)} more ${GEM}`}</button>`;
  return `<div class="card-animal met-card">${pic}<b>${title}</b><span class="kg">${GEM} ${short(price)} crystals</span><p>${text}</p>${extra}<div class="pet-actions">${button}</div></div>`;
}

function shopHtml() {
  const mult = crystalMultiplier();
  const maxed = mult >= MULTIPLIER_MAX;
  const shards = (state.gears || []).filter((g) => g.type === 'meteoricShard').length;
  const dragons = state.pets.filter((p) => p.name === 'Cosmic Arcadragon').length;
  const chestPic = picture('chest', () => buildMeteorChest().g);
  const rows = METEOR_CHEST_DROPS.map((d) => {
    const r = rarityInfo(d.rarity);
    const art = d.gear ? `<div class="pet-pic" style="--pic-bg:${r.color}"><span class="emoji">${d.emoji}</span></div>` : petPic(d.name, { rarity: d.rarity });
    const what = d.gear ? `${d.emoji} Astral Mutation Reroll` : `${findAnimal(d.name)?.emoji || ''} ${d.name}`;
    const owned = !d.gear && state.indexFound.includes(d.name) ? ' ✅' : '';
    const p = chestPercent(d);
    return `<div class="echo-drop met-drop" style="--c:${r.color === '#cfd8dc' ? '#90a4ae' : r.color}">${art}
      <div class="echo-drop-text"><b>${what}${owned}</b><small style="color:${r.color === '#cfd8dc' ? '#90a4ae' : r.color}">${d.gear ? 'SUPER RARE ITEM' : d.rarity.toUpperCase()}</small>
      <div class="echo-bar"><div style="width:${Math.max(2, p)}%"></div></div></div>
      <span class="echo-pct" style="color:${r.color === '#cfd8dc' ? '#90a4ae' : r.color}">${p}%</span></div>`;
  }).join('');
  const [lo, hi] = ARCADRAGON_MONEY;
  return `<p class="index-summary met-balance">${GEM} You have <b>${short(crystalsOf())} Meteor Crystals</b> · ✖️ Crystal Multiplier <b>x${mult}</b></p>
    <div class="cards met-cards">
      ${card({ id: 'shard', pic: img(picture('shard', buildShard), '☄️'), title: '☄️ Meteoric Shard', price: METEORIC_SHARD_COST,
        text: 'Use it on a pet to give it a bluey <b>METEORIC</b> look and <b>x5 money</b>!', extra: shards ? `<small>🎒 You have ${shards}</small>` : '' })}
      ${card({ id: 'mult', pic: img(picture('mult', buildMultiplier), '✖️'), title: `✖️ Crystals Multiplier`, price: multiplierCost(mult), owned: maxed ? `MAX x${MULTIPLIER_MAX}` : false,
        text: maxed ? 'You have the biggest multiplier!' : `Pick up more crystals: <b>x${mult} → x${mult + MULTIPLIER_STEP}</b>. It costs more every time you buy it!` })}
      ${card({ id: 'chest', pic: img(chestPic, '🧰'), title: '🧰 Meteoric Chest', price: METEOR_CHEST_COST,
        text: 'Open it to get a NEW Meteoric pet (or a super rare 🌌 Astral Reroll)!' })}
      ${card({ id: 'skin', pic: img(picture('skin', buildHelmet), '🦹'), title: '🦹 Meteoric Boss Skin', price: METEOR_BOSS_SKIN_COST, owned: state.meteorBossSkin ? 'Unlocked' : false,
        text: state.meteorBossSkin ? 'Go to any Boss and press <kbd>E</kbd> to change its skin!' : 'Then go to any Boss and press <kbd>E</kbd> to give it a cool meteor look!' })}
      ${card({ id: 'dragon', pic: petPic('Cosmic Arcadragon', { rarity: 'Eternal' }), title: '🌌 Cosmic Arcadragon', price: ARCADRAGON_COST,
        text: `<b style="color:${rarityInfo('Eternal').color}">ETERNAL</b> pet! Makes <b>$${short(lo)}–$${short(hi)}</b> every second on your Plot!`, extra: dragons ? `<small>🐉 You have ${dragons}</small>` : '' })}
    </div>
    <div class="echo-drops met-drops"><h3>🧰 What's inside the Meteoric Chest?</h3>${rows}</div>
    <p class="hint">☄️ Get Meteor Crystals when meteors fall! The Crystals Multiplier makes every crystal you pick up worth more.</p>`;
}
extraPanels.meteor = ['☄️ Meteoric Shop', shopHtml, 'E'];

const CSS = `
.met-balance { background: linear-gradient(90deg, #1a237e, #283593); color: #e1f5fe; border-radius: 12px; padding: 8px 12px; box-shadow: 0 0 14px rgba(64,196,255,0.45); }
.met-balance b { color: #80d8ff; }
.met-cards .met-card { border-color: #40c4ff !important; box-shadow: 0 0 14px rgba(64,196,255,0.3); }
.met-card .met-img { width: 100%; max-width: 160px; height: auto; display: block; margin: 0 auto; filter: drop-shadow(0 0 8px rgba(64,196,255,0.7)); }
.met-card small { display: block; font-weight: 800; color: #0277bd; }
.met-drops { margin-top: 12px; }
.echo-drop { display: flex; align-items: center; gap: 10px; padding: 6px 8px; margin-bottom: 6px; border-radius: 12px; border: 2px solid var(--c); background: color-mix(in srgb, var(--c) 14%, #ffffff); }
.echo-drop .pet-pic { width: 64px; height: 52px; flex: 0 0 64px; }
.echo-drop .pet-pic .emoji { font-size: 30px; }
.echo-drop-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.echo-drop-text small { font-weight: 900; letter-spacing: 1px; }
.echo-bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.15); overflow: hidden; }
.echo-bar div { height: 100%; background: var(--c); box-shadow: 0 0 8px var(--c); }
.echo-pct { font-size: 22px; font-weight: 900; min-width: 52px; text-align: right; }
#met-reveal { position: fixed; left: 0; right: 0; top: 13vh; z-index: 40; text-align: center; pointer-events: none; font-family: "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif; opacity: 0; }
#met-reveal.show { animation: met-pop 0.7s cubic-bezier(.2,1.6,.4,1) forwards; }
#met-reveal .er-rarity { font-size: clamp(24px, 4.6vw, 50px); font-weight: 900; color: var(--c); letter-spacing: 6px; -webkit-text-stroke: 2px rgba(0,0,0,0.6); text-shadow: 0 0 24px var(--c), 0 0 48px var(--c); }
#met-reveal .er-name { font-size: clamp(30px, 6.4vw, 70px); font-weight: 900; color: #fff; -webkit-text-stroke: 3px rgba(0,0,0,0.7); text-shadow: 0 6px 0 rgba(0,0,0,0.5), 0 0 30px var(--c); line-height: 1.05; }
#met-reveal .er-sub { margin-top: 8px; font-size: clamp(16px, 2.6vw, 26px); font-weight: 800; color: #fff; text-shadow: 0 2px 6px #000; }
#met-reveal.big .er-rarity { background: linear-gradient(90deg, #40c4ff, #b388ff, #18ffff, #e1f5fe, #7c4dff, #40c4ff); background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-stroke: 0; text-shadow: none; filter: drop-shadow(0 0 6px #fff) drop-shadow(0 0 18px #40c4ff); animation: met-rainbow 1.2s linear infinite, met-throb 0.5s ease-in-out infinite alternate; display: inline-block; }
#met-reveal.big .er-name { animation: met-throb 0.6s ease-in-out infinite alternate; }
#met-flash { position: fixed; inset: 0; z-index: 39; pointer-events: none; background: #e1f5fe; opacity: 0; }
#met-flash.on { animation: met-flash 0.9s ease-out; }
#met-dark { position: fixed; inset: 0; z-index: 30; pointer-events: none; background: radial-gradient(circle, transparent 30%, rgba(5,10,45,0.88) 100%); opacity: 0; transition: opacity 0.8s; }
@keyframes met-pop { 0% { opacity: 0; transform: scale(0.3); } 100% { opacity: 1; transform: scale(1); } }
@keyframes met-rainbow { to { background-position: 300% 0; } }
@keyframes met-throb { from { transform: scale(1); } to { transform: scale(1.08); } }
@keyframes met-flash { 0% { opacity: 0.95; } 100% { opacity: 0; } }
`;
function ensureDom() {
  if ($('met-reveal')) return;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  for (const id of ['met-reveal', 'met-flash', 'met-dark']) {
    const d = document.createElement('div');
    d.id = id;
    document.body.appendChild(d);
  }
}

// ======================== 主程式 ========================
export function createMeteorShop({ scene, camera, openShop, teleport, resume, popup, announce }) {
  ensureDom();
  const shop = buildBuilding(scene);
  const api = { busy: false };

  api.update = (dt, t) => {
    const s = shop;
    s.ring.material.opacity = 0.4 + Math.sin(t * 3) * 0.2;
    s.crystM.emissiveIntensity = 1.2 + Math.sin(t * 2.2) * 0.5;
    s.crystV.emissiveIntensity = 1.2 + Math.sin(t * 2.2 + 2) * 0.5;
    s.crackM.emissiveIntensity = 2 + Math.sin(t * 3.3) * 0.8;
    s.rimM.emissiveIntensity = 1.3 + Math.sin(t * 1.7) * 0.4;
    s.lamp.intensity = 14 + Math.sin(t * 2) * 3;
    s.trail.forEach((c, i) => (c.scale.set(1, 0.85 + Math.sin(t * 9 + i) * 0.15, 1)));
    s.lamps.forEach((l, i) => (l.rotation.y = t * (i ? 1 : -1)));
    s.floaters.forEach((f, i) => {
      const a = t * 0.8 + (i / s.floaters.length) * PI * 2;
      f.position.set(Math.cos(a) * 1.0 + 0.4, 6.4 + Math.sin(t * 2 + i) * 0.25, Math.sin(a) * 1.0 - 0.5);
      f.rotation.y = t * 2;
    });
    if (s.mascot) {
      s.mascot.userData.animate?.(t, 0);
      s.mascot.visible = !api.busy;
    }
    const d = s.display;
    const w = Math.max(0, Math.sin(t * 1.6)) ** 6;
    d.g.rotation.z = Math.sin(t * 20) * 0.04 * w;
    d.lid.rotation.x = w * 0.12;
    d.glowMat.emissiveIntensity = 1.8 + Math.sin(t * 3) * 0.6;
    d.innerGlow.material.opacity = w * 0.9;
  };

  api.interaction = (pos) => {
    if (api.busy) return null;
    if (Math.hypot(pos.x - SHOP_SPOT.x, pos.z - SHOP_SPOT.z) > 2.6) return null;
    if (!isMeteorOpen()) return { prompt: `🔒 The Meteoric Shop opens on ${meteorOpenText()}, together with the ☄️ METEORIC event!` };
    return { prompt: `<kbd>E</kbd> ☄️ Open the Meteoric Shop (${GEM} ${short(crystalsOf())} crystals)`, action: () => { play('crystal'); openShop(); } };
  };

  const spend = (n) => {
    if (crystalsOf() < n) {
      popup(`${GEM} You need ${short(n)} Meteor Crystals for that!`);
      return false;
    }
    state.meteorCrystals = crystalsOf() - n;
    return true;
  };
  const refresh = () => panelKind() === 'meteor' && openPanel('meteor');

  function addPet(name, rarity) {
    const info = findAnimal(name);
    const pet = { name, biome: info?.biome ?? 9, kg: info ? randomKg(info) : 1, rarity, onPlot: false };
    state.pets.push(pet);
    let reward = 0;
    if (!state.indexFound.includes(name)) {
      state.indexFound.push(name);
      reward = INDEX_NEW_SPECIES_REWARD[info?.biome ?? 9] || 0;
      state.money += reward;
    }
    return { pet, reward };
  }

  // 買嘢（forced = 測試用：直接開某樣嘢，唔使水晶，例如 api.buy('chest', 'Meteor Dragon')）
  function buy(id, forced = null) {
    if (api.busy) return;
    if (id === 'shard') {
      if (!spend(METEORIC_SHARD_COST)) return;
      state.gears = state.gears || [];
      state.gears.push({ type: 'meteoricShard' });
      save();
      play('crystal');
      popup('☄️ You got a METEORIC SHARD! Use it on a pet in your 🎒 backpack: bluey look + x5 money!');
      return refresh();
    }
    if (id === 'mult') {
      const mult = crystalMultiplier();
      if (mult >= MULTIPLIER_MAX || !spend(multiplierCost(mult))) return;
      state.crystalMultiplier = mult + MULTIPLIER_STEP;
      save();
      play('upgrade');
      popup(`✖️ Crystal Multiplier is now x${state.crystalMultiplier}! Every crystal you pick up is worth more.`);
      return refresh();
    }
    if (id === 'skin') {
      if (state.meteorBossSkin || !spend(METEOR_BOSS_SKIN_COST)) return;
      state.meteorBossSkin = true;
      save();
      play('upgrade');
      popup('🦹 Meteoric Boss Skin unlocked! Walk up to any Boss and press E to change its look.');
      return refresh();
    }
    if (id === 'chest') {
      if (!forced && !spend(METEOR_CHEST_COST)) return;
      const drop = forced ? { ...METEOR_CHEST_DROPS.find((d) => d.name === forced) } : rollMeteorChest();
      let reward = 0;
      let pet = null;
      if (drop.gear) {
        state.gears = state.gears || [];
        state.gears.push({ type: drop.gear });
      } else ({ pet, reward } = addPet(drop.name, drop.rarity));
      save();
      if (panelKind() === 'meteor') closePanel();
      return openAnimation(drop, reward, pet);
    }
    if (id === 'dragon') {
      if (!forced && !spend(ARCADRAGON_COST)) return;
      const { pet, reward } = addPet('Cosmic Arcadragon', 'Eternal');
      itemMoney(pet); // 即刻抽佢嘅 $/秒（存喺 pet.money）
      save();
      if (panelKind() === 'meteor') closePanel();
      return openAnimation({ name: 'Cosmic Arcadragon', rarity: 'Eternal', dragon: true }, reward, pet);
    }
  }
  api.buy = buy;
  $('panel-body').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-meteor]');
    if (!b || panelKind() !== 'meteor') return;
    buy(b.dataset.meteor);
  });

  // ---------- 🎬 開箱動畫（Meteoric Chest／Cosmic Arcadragon）----------
  // 箱好似隕石咁拖住藍火由天斜斜跌落嚟 → 撞地（地上一圈衝擊波 + 石仔）→ 震 + 發光 → 爆開 → 寵物升上嚟
  function openAnimation(drop, reward, pet) {
    api.busy = true;
    const back = { x: camera.position.x, z: camera.position.z, rot: camera.rotation.clone() };
    const eternal = drop.rarity === 'Eternal' && !drop.gear;
    const mythic = drop.rarity === 'Mythic' || eternal;
    const legendary = drop.rarity === 'Legendary' || !!drop.gear;
    const big = mythic || legendary;
    const colorHex = new THREE.Color(rarityInfo(drop.rarity).color).getHex();
    const rc = new THREE.Color(colorHex);
    const blue = new THREE.Color(CYAN);
    const T = eternal ? 12 : mythic ? 11 : legendary ? 9 : 7.5;
    const TB = eternal ? 5.6 : mythic ? 5.2 : legendary ? 3.8 : 3.0;
    const FALL = 1.0; // 跌落嚟要幾耐
    const P = V(METEOR_SHOP.x + FRONT.x * 7.5, 0, METEOR_SHOP.z + FRONT.z * 7.5);
    // 鏡頭喺箱嘅斜前面（向 Hub 中間嗰邊轉 YAW），背景係舖頭，唔會俾 Owner's Garden 個牌遮住
    const YAW = 0.75;
    const fx = new THREE.Group();
    fx.position.copy(P);
    fx.rotation.y = ROT + PI + YAW; // 箱前面（-z）望住鏡頭
    scene.add(fx);
    const chest = buildMeteorChest();
    chest.g.scale.setScalar(1.4);
    fx.add(chest.g);
    // 跌落嚟嘅藍火尾
    const fireMats = [];
    const fire = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const m = additive(i % 2 ? AQUA : CYAN, 0.6 - i * 0.08);
      fireMats.push(m);
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.9 - i * 0.1, 3.2, 16, 1, true), m);
      c.position.y = 1.6 + i * 0.7;
      fire.add(c);
    }
    fx.add(fire);
    const from = V(-5, 14, -4); // 跌落嚟嘅方向：由天上、舖頭嗰邊斜斜飛過嚟（fx 本地座標）
    fire.quaternion.setFromUnitVectors(V(0, 1, 0), from.clone().normalize()); // 火尾指返去天上
    const glow = new THREE.PointLight(CYAN, 0, 14, 1.5);
    glow.position.set(0, 1.4, -0.8);
    fx.add(glow);
    const fill = new THREE.PointLight(0xffffff, 0, 16, 1.2); // 爆開之後喺鏡頭嗰邊打白光，等深藍色寵物睇得清楚
    scene.add(fill);
    const ringMat = additive(colorHex, 0);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.8, 48), ringMat);
    ring.rotation.x = -PI / 2;
    ring.position.y = 0.05;
    fx.add(ring);
    // 撞地衝擊波 + 隕石坑
    const waveMat = additive(CYAN, 0);
    const wave = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.1, 48), waveMat);
    wave.rotation.x = -PI / 2;
    wave.position.y = 0.07;
    fx.add(wave);
    const craterMat = new THREE.MeshBasicMaterial({ color: 0x0d1240, transparent: true, opacity: 0, depthWrite: false });
    const crater = new THREE.Mesh(new THREE.CircleGeometry(1.9, 32), craterMat);
    crater.rotation.x = -PI / 2;
    crater.position.y = 0.04;
    fx.add(crater);
    const beamMat = additive(colorHex, 0);
    beamMat.fog = false;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.9, 40, 24, 1, true), beamMat);
    beam.position.y = 20;
    fx.add(beam);
    const flashMat = additive(0xffffff, 0);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), flashMat);
    flash.position.y = 1;
    fx.add(flash);
    // 大獎：幾個藍紫色光環
    const halos = mythic ? [0x40c4ff, 0xb388ff, 0x18ffff, 0x7c4dff].map((c, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(2.0 + i * 0.4, 0.05, 8, 64), additive(c, 0));
      m.position.y = 1.4;
      fx.add(m);
      return m;
    }) : [];
    // 粒子（水晶碎 + 石仔）
    const parts = [];
    const partGeo = new THREE.OctahedronGeometry(0.09);
    const rockGeo = new THREE.BoxGeometry(0.16, 0.14, 0.15);
    function burst(n, speed, colors, up = 4, rocks = false) {
      for (let i = 0; i < n; i++) {
        const isRock = rocks && i % 2 === 0;
        const m = new THREE.Mesh(isRock ? rockGeo : partGeo, isRock ? new THREE.MeshStandardMaterial({ color: ROCK3, transparent: true }) : additive(colors[i % colors.length], 1));
        m.position.set(0, isRock ? 0.3 : 1.0, 0);
        fx.add(m);
        const a = Math.random() * PI * 2;
        const sp = speed * (0.4 + Math.random() * 0.8);
        parts.push({ m, v: V(Math.cos(a) * sp, up * (0.5 + Math.random()), Math.sin(a) * sp), life: 1.4 + Math.random() * 0.8, t: 0, spin: Math.random() * 10 });
      }
    }
    // 開出嚟嘅嘢
    const prizeH = drop.gear ? 1.4 : eternal ? 3.4 : mythic ? 2.4 : legendary ? 2.2 : 1.7;
    const prize = new THREE.Group();
    prize.visible = false;
    fx.add(prize);
    api.last = { fx, prize, chest };
    let prizeAnim = null;
    if (drop.gear) {
      // 🌌 Astral Reroll：一粒星系波波（入面有星、外面兩個圈）
      const orbM = glowMat(0x7c4dff, 1.6, { transparent: true, opacity: 0.85 });
      const orb = S(prize, 0.5, 0.5, 0.5, 0x7c4dff, 0, 0.7, 0, orbM, { line: 0.04 });
      const twinkle = glowMat(0xffffff, 3);
      for (let i = 0; i < 9; i++) starBit(prize, 0.09, Math.cos(i * 2.4) * 0.3, 0.7 + Math.sin(i * 1.7) * 0.3, Math.sin(i * 2.4) * 0.3, twinkle);
      const orbitR = [0x18ffff, 0xffd740].map((c, i) => {
        const r = torus(prize, 0.75 + i * 0.15, 0.03, c, 0, 0.7, 0, glowMat(c, 2.5));
        r.rotation.x = 1.2 + i * 0.6;
        return r;
      });
      prizeAnim = (k, dt, t) => {
        orb.rotation.y = t;
        orbitR.forEach((r, i) => (r.rotation.z = t * (1 + i)));
      };
    } else {
      try {
        const m = buildAnimalModel(findAnimal(drop.name));
        if (m.userData.move === 'fly') m.userData.flying = false;
        const box = new THREE.Box3().setFromObject(m);
        m.scale.multiplyScalar(prizeH / Math.max(0.01, box.max.y - box.min.y));
        prize.add(m);
        prizeAnim = (k, dt, t) => m.userData.animate?.(t, 0);
      } catch (e) {
        console.warn('meteor prize model failed', e);
      }
    }
    // 大字
    const reveal = $('met-reveal');
    const dark = $('met-dark');
    reveal.className = '';
    reveal.style.setProperty('--c', rarityInfo(drop.rarity).color);
    const info = findAnimal(drop.name);
    const money = pet && drop.dragon ? ` · $${short(itemMoney(pet))}/s!` : '';
    reveal.innerHTML = drop.gear
      ? `<div class="er-rarity">🌌 SUPER RARE 🌌</div><div class="er-name">ASTRAL REROLL!</div><div class="er-sub">Use it on a pet in your 🎒 backpack for the ASTRAL mutation!</div>`
      : `<div class="er-rarity">${mythic ? `✨ ${drop.rarity.toUpperCase()} ✨` : drop.rarity.toUpperCase()}</div><div class="er-name">${info?.emoji || ''} ${drop.name.toUpperCase()}!</div><div class="er-sub">${reward ? `NEW in your Index! +$${short(reward)} · ` : ''}It's in your backpack 🎒${money}</div>`;
    const dirAt = (a) => V(FRONT.x * Math.cos(a) + SIDE.x * Math.sin(a), 0, FRONT.z * Math.cos(a) + SIDE.z * Math.sin(a));
    const camAt = (dist, h, side = 0) => {
      const d = dirAt(YAW);
      const sd = dirAt(YAW + PI / 2);
      return V(P.x + d.x * dist + sd.x * side, h, P.z + d.z * dist + sd.z * side);
    };
    const cam = { p: camAt(7.5, 3.4, 1.4), l: V(P.x, 1.0, P.z) };
    const smooth = (k) => k * k * (3 - 2 * k);
    let landed = false;
    let burstDone = false;
    play('swoosh');
    if (big) setTimeout(() => play('drumroll'), 1100);
    playMovie(camera, {
      length: T,
      skipText: 'Click or press any key to skip ▶',
      shots: [[0, T, cam, cam]],
      captions: [
        [0.1, drop.dragon ? '🌌 Something HUGE is falling from space...' : '☄️ A Meteoric Chest is falling from the sky...'],
        [FALL + 0.3, eternal ? '🌌 The whole sky is glowing...' : mythic ? '😱 The chest is going CRAZY...' : legendary ? '✨ Something shiny is inside...' : '🫨 It is shaking...'],
        [TB + 0.3, ''],
      ],
      update(t, dt) {
        // 1) 好似隕石咁跌落嚟（拖住藍火）
        const fall = Math.min(1, t / FALL);
        const e = fall * fall;
        chest.g.position.set(from.x * (1 - e), from.y * (1 - e), from.z * (1 - e));
        chest.g.rotation.set((1 - e) * 2.5, (1 - e) * 4, 0);
        fire.visible = !landed;
        fire.position.copy(chest.g.position);
        fireMats.forEach((m, i) => (m.opacity = (0.6 - i * 0.08) * (0.8 + Math.sin(t * 30 + i) * 0.2)));
        if (!landed && fall >= 1) {
          landed = true;
          shake(0.6);
          play('slam');
          setTimeout(() => play('boom'), 60);
          burst(18, 4, [CYAN, ICE], 2, true);
        }
        if (landed) {
          const k = t - FALL;
          wave.scale.setScalar(1 + k * 9);
          waveMat.opacity = Math.max(0, 0.9 - k * 1.2);
          craterMat.opacity = Math.min(0.55, k * 3);
        }
        // 2) 震 + 發光（越嚟越勁，藍色變稀有度色）
        if (!burstDone && landed) {
          const k = THREE.MathUtils.clamp((t - FALL - 0.1) / (TB - FALL - 0.1), 0, 1);
          const amp = 0.02 + k * k * (mythic ? 0.28 : 0.18);
          const fr = 18 + k * 30;
          chest.g.rotation.z = Math.sin(t * fr) * amp;
          chest.g.rotation.x = Math.cos(t * fr * 0.8) * amp * 0.5;
          if (mythic) chest.g.position.y = k * k * 1.2;
          chest.lid.rotation.x = Math.max(0, Math.sin(t * fr * 0.5)) * k * 0.25;
          const c = blue.clone().lerp(rc, k);
          chest.glowMat.color.copy(c);
          chest.glowMat.emissive.copy(c);
          chest.glowMat.emissiveIntensity = 2 + k * 4;
          chest.innerGlow.material.color.copy(c);
          chest.innerGlow.material.opacity = k;
          glow.color.copy(c);
          glow.intensity = k * (big ? 30 : 18);
          ringMat.color.copy(c);
          ringMat.opacity = k * 0.8;
          ring.rotation.z = t * 2;
          if (k > 0 && Math.random() < dt * (6 + k * 30)) burst(1, 1.5, [c.getHex()], 2.5);
          if (mythic) {
            dark.style.opacity = String(Math.min(1, k * 1.4));
            halos.forEach((h, i) => {
              h.material.opacity = k * 0.8;
              h.rotation.set(t * (1 + i * 0.4), t * (0.7 + i * 0.3), 0);
            });
          }
          if (once('rumble')) play('rumble');
        }
        // 3) 爆開！
        if (!burstDone && t >= TB) {
          burstDone = true;
          shake(mythic ? 0.9 : big ? 0.6 : 0.4);
          play('boom');
          setTimeout(() => play(big ? 'magic' : 'crystal'), 250);
          setTimeout(() => play('rescue'), 700);
          const f = $('met-flash');
          f.classList.remove('on');
          void f.offsetWidth;
          f.classList.add('on');
          burst(mythic ? 70 : big ? 45 : 30, mythic ? 7 : 5, mythic ? [0x40c4ff, 0xb388ff, 0x18ffff, 0xe1f5fe, 0x7c4dff] : [colorHex, 0xffffff, CYAN], 6);
          prize.visible = true;
          reveal.className = mythic || drop.gear ? 'show big' : 'show';
          chest.g.rotation.set(0, 0, 0);
        }
        if (burstDone) {
          const k = t - TB;
          chest.lid.rotation.x = Math.min(2.0, k * 9);
          chest.lid.position.y = 0.62 + Math.min(1, k * 2) * 0.1;
          flash.scale.setScalar(0.5 + k * (mythic ? 9 : 6));
          flashMat.opacity = Math.max(0, 0.9 - k * 1.6);
          beamMat.opacity = Math.max(0.04, Math.min(0.22, k * 2) - Math.max(0, k - 0.6) * 0.2) * (big ? 1 : 0.7); // 光柱慢慢淡，唔好遮住寵物
          beam.rotation.y = t;
          ringMat.color.setHex(colorHex);
          ringMat.opacity = 0.8;
          glow.color.copy(rc).lerp(WHITE, 0.7);
          glow.position.set(0, prize.position.y + prizeH * 0.6, -2.6);
          glow.intensity = Math.max(5, 16 - k * 10) * (mythic ? 0.6 : 1);
          chest.innerGlow.material.color.setHex(colorHex);
          chest.glowMat.color.setHex(colorHex);
          chest.glowMat.emissive.setHex(colorHex);
          chest.glowMat.emissiveIntensity = 2;
          if (mythic) chest.g.position.y = 1.2;
          const rise = Math.min(1, k / 0.8);
          const ease = 1 - (1 - rise) ** 3;
          const baseY = chest.g.position.y + 0.62 * chest.g.scale.y;
          prize.position.y = baseY + ease * 0.3;
          prize.scale.setScalar(Math.max(0.01, ease));
          prize.rotation.y = rise < 1 ? (1 - ease) * PI * 4 : Math.sin(k * 1.4) * 0.4;
          prizeAnim?.(k, dt, t);
          fill.position.copy(cam.p).lerp(V(P.x, prize.position.y + prizeH * 0.6, P.z), 0.2);
          fill.intensity = Math.min(1, k * 2) * 14;
          if (mythic) {
            dark.style.opacity = String(Math.max(0, 1 - k * 0.3));
            halos.forEach((h, i) => {
              h.material.opacity = 0.3;
              h.scale.setScalar(1 + Math.min(1, k) * 0.4 + Math.sin(t * 3 + i) * 0.05);
              h.position.y = prize.position.y + 1;
              h.rotation.set(t * (1 + i * 0.4), t * (0.7 + i * 0.3), 0);
            });
            if (Math.random() < dt * 12) burst(2, 4, [0x40c4ff, 0xb388ff, 0x18ffff, 0xe1f5fe], 5);
          } else if (big && Math.random() < dt * 6) burst(1, 3, [colorHex, 0xffffff], 4);
        }
        // 🎥 鏡頭：跌落嚟嗰陣望高少少；之後慢慢推近；爆開之後退後影晒成隻寵物
        if (!landed) {
          cam.p.copy(camAt(7.5, 3.4, 1.4));
          cam.l.copy(chest.g.position).applyMatrix4(fx.matrixWorld);
          cam.l.y = Math.max(1, cam.l.y * 0.8);
        } else if (!burstDone) {
          const s = smooth(Math.min(1, (t - FALL) / (TB - FALL)));
          cam.p.lerp(camAt(7.5 - 2.8 * s, 3.4 - 1.1 * s, 1.4 - 0.9 * s), Math.min(1, dt * 5));
          cam.l.lerp(V(P.x, chest.g.position.y + 0.9 + (1 - s) * 0.3, P.z), Math.min(1, dt * 5));
        } else {
          const e2 = smooth(Math.min(1, (t - TB) / 1.2));
          const center = prize.position.y + prizeH * 0.5;
          const dist = 4.4 + (Math.max(3.8, prizeH * 1.15 + 1.3) - 4.4) * e2;
          const a = mythic ? Math.sin((t - TB) * 0.45) * 0.55 : 0.12 * e2;
          const dir = dirAt(YAW + a);
          const want = V(P.x + dir.x * dist, 2.2 + (center + 0.4 - 2.2) * e2, P.z + dir.z * dist);
          cam.p.lerp(want, Math.min(1, dt * 6));
          cam.l.lerp(V(P.x, center + 0.3 + prizeH * 0.2, P.z), Math.min(1, dt * 6));
        }
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.t += dt;
          p.v.y -= 6 * dt;
          p.m.position.addScaledVector(p.v, dt);
          p.m.rotation.set(p.t * p.spin, p.t * p.spin * 0.7, 0);
          p.m.material.opacity = Math.max(0, 1 - p.t / p.life);
          if (p.t > p.life) {
            fx.remove(p.m);
            p.m.material.dispose();
            parts.splice(i, 1);
          }
        }
        return null;
      },
      onDone() {
        scene.remove(fx);
        scene.remove(fill);
        for (const o of [ring, beam, flash, wave, crater, ...halos, ...fire.children]) {
          o.geometry.dispose();
          o.material.dispose();
        }
        for (const p of parts) p.m.material.dispose();
        partGeo.dispose();
        rockGeo.dispose();
        reveal.className = '';
        dark.style.opacity = '0';
        api.busy = false;
        teleport(back.x, back.z);
        camera.rotation.copy(back.rot);
        resume();
        if (drop.gear) announce('🌌 Meteoric Chest: you got an ASTRAL REROLL! Use it on a pet in your 🎒 backpack.');
        else {
          announce(`☄️ ${drop.dragon ? 'You got' : 'Meteoric Chest: you got'} a ${drop.rarity.toUpperCase()} ${drop.name}!${money} It's in your backpack - put it on your Plot in the Hub!`);
          if (reward) setTimeout(() => popup(`📖 New Meteoric pet in your Index! +$${short(reward)}`), 1200);
        }
      },
    });
  }
  api.open = (name) => (name === 'Cosmic Arcadragon' ? buy('dragon', true) : buy('chest', name || 'Meteoric Soul')); // 測試：game.meteorShop.open('Meteor Dragon')
  return api;
}
