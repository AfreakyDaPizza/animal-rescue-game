// Hub 入面嘅設施：跑步機、學生桌（可以升級，越升越型）、升級牌、
// 5 部繁殖機、有圍欄嘅地塊（Plot）、動物圖鑑檯

import * as THREE from 'three';
import { short } from './format.js';
import { PLOT } from './hubShape.js';
import { addCollider, bakeStatic } from './world.js';
import { fencePost, fenceRails, archX } from './fences.js'; // 🪵 靚啲嘅圍欄
import { makeSign, dynamicSign, signOnPosts, makeLabel, THEMES } from './signs.js';
import { createVideoScreen } from './videos.js';
import { buildMagicLibrary, buildSellStall, buildSaveStall } from './hubBuildings.js';
import { addFireAura } from './fireAura.js';
import { buildInferno, animateInferno, infernoTexture } from './inferno.js';
import { fuseMachine } from './hubPark.js';
import { isFuseOpen, daysUntilOpen, openDateText } from './fuse.js';
import { boost } from './events.js';
import { applyPetSkin } from './skins.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { state } from './state.js';
import { buildAnimalModel, flipUpsideDown } from './animalModels.js';
import { kgOf, formatKg, itemMoney, kgScale, findAnimal, mutationList, mutationText, mutationInfo, sizeText, addMutation } from './data/animals.js';
import { trainingGain, trainingGainLabel, upgradeCost, REPRODUCE_SECONDS, rarityInfo, MACHINE_LEVELS, MAX_TRAINING_LEVEL, plotSlots, plotUpgradeCost, PLOT_MAX_UPGRADES, SELL_SECONDS, plotMoneyMulti, PLOT_ROYAL_LEVEL, PLOT_ROYAL_SLOTS, PLOT_ROYAL_MONEY } from './data/balance.js';
import { plotGroundTexture } from './hubFloor.js'; // 🐾 地塊地面紋理（Issue #8）

const INTERACT_DISTANCE = 2.8;
const fmt = short; // K／M／B／T（src/format.js）

function add(group, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

// ================= 升級外觀（越升越型） =================

const rbox = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2);

// 升級外觀：15 級，每級一個款（名係小朋友改嘅；Lv14 Mountain Magic、Lv15 Astral）
// base = 機身、trim = 扶手／邊、glow = 燈條顏色、extra = 嗰級獨有嘅裝飾（見 addFancyBits）
export const TIERS = [
  { name: 'Basic', base: 0x546e7a, trim: 0xb0bec5, metal: 0.3, glow: null },
  { name: 'Starters', base: 0x2e7d32, trim: 0xf1f8e9, metal: 0.2, glow: 0x76ff03, extra: 'starters' },
  { name: 'Iron Steel', base: 0x37474f, trim: 0x90a4ae, metal: 0.9, glow: 0xb0bec5, extra: 'iron' },
  { name: 'Golden Steel', base: 0x455a64, trim: 0xffc107, metal: 0.95, glow: 0xffd54f, extra: 'iron' },
  { name: 'Neon', base: 0x121212, trim: 0x2b2b2b, metal: 0.5, glow: 0xff2bd6, extra: 'neon' },
  { name: 'Frozen', base: 0xb3e5fc, trim: 0xe1f5fe, metal: 0.3, glow: 0x80d8ff, extra: 'frozen' },
  { name: 'Molten', base: 0x2b1b17, trim: 0x4e342e, metal: 0.3, glow: 0xff6d00, emissive: 0x3e0d00, extra: 'molten' },
  { name: 'Diamond', base: 0xeceff1, trim: 0xb2ebf2, metal: 0.8, glow: 0xe0f7fa, extra: 'diamond' },
  { name: 'Sci-Fi', base: 0xf5f5f5, trim: 0x263238, metal: 0.6, glow: 0x00e5ff, extra: 'scifi' },
  { name: 'Hacker', base: 0x0a0a0a, trim: 0x1b5e20, metal: 0.4, glow: 0x00ff41, extra: 'hacker' },
  { name: 'Celebrity', base: 0x880e4f, trim: 0xffd700, metal: 0.9, glow: 0xffd700, extra: 'celebrity' },
  { name: 'Heavenly', base: 0xfdfdfd, trim: 0xffe082, metal: 0.6, glow: 0xfff8e1, extra: 'heavenly' },
  { name: 'Luminous', base: 0x0d1b2a, trim: 0x80deea, metal: 0.3, glow: 0x18ffff, emissive: 0x0a3d4a, extra: 'luminous' },
  { name: 'Mountain Magic', base: 0x5d4e6d, trim: 0xb39ddb, metal: 0.4, glow: 0xb388ff, extra: 'mountain' },
  { name: 'Astral', base: 0x1a0b3d, trim: 0xb388ff, metal: 0.5, glow: 0xea80fc, emissive: 0x12052e, extra: 'astral' },
  // Lv16（小朋友 2026-10-17）：宇宙皇國 —— 星空機身 + 金色城堡塔、皇冠、礦石、星星
  { name: "Astral King's Kingdom", base: 0x1a0b3d, trim: 0xffd54f, metal: 0.9, glow: 0xffd740, emissive: 0x12052e, extra: 'kingdom' },
  // Lv17（小朋友 2026-10-18）：Inferno Sanctuary —— 黑曜石機身 + 熔岩、四條火柱、火球、火花
  { name: 'Inferno Sanctuary', base: 0x1a0d0a, trim: 0xff6d00, metal: 0.5, glow: 0xff3d00, emissive: 0x4a0e00, extra: 'inferno' },
].map((t, i) => ({ ...t, minLevel: i + 1 }));
export const tierOf = (level) => Math.min(TIERS.length, Math.max(1, level)) - 1;

// 星空紋理（Astral 機身用）：深紫色 + 一粒粒發光嘅星
let starTex = null;
function starTexture() {
  if (starTex) return starTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, '#1a0640');
  g.addColorStop(0.5, '#2d0b63');
  g.addColorStop(1, '#0b1a4a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = ['#ffffff', '#e1bee7', '#80d8ff', '#fff59d'][i % 4];
    const r = Math.random() < 0.1 ? 2.2 : 1;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, r, r);
  }
  starTex = new THREE.CanvasTexture(c);
  starTex.colorSpace = THREE.SRGBColorSpace;
  starTex.wrapS = starTex.wrapT = THREE.RepeatWrapping;
  return starTex;
}

function applyTier(station, level = state[station.levelKey]) {
  const index = tierOf(level);
  const tier = TIERS[index];
  station.baseMat.color.setHex(tier.base);
  station.baseMat.metalness = tier.metal * 0.5;
  station.baseMat.roughness = 0.35;
  station.baseMat.emissive.setHex(tier.emissive || 0x000000);
  station.trimMat.color.setHex(tier.trim);
  station.trimMat.metalness = tier.metal;
  station.trimMat.roughness = 0.25;
  station.ledMat.color.setHex(tier.glow || 0x333333);
  station.ledMat.emissive.setHex(tier.glow || 0x000000);
  station.ringMat.color.setHex(tier.glow || 0xffffff);
  station.sparkles.material.color.setHex(tier.glow || 0xffffff);
  station.ring.visible = index >= 4; // Neon 起：地上有圈光
  station.sparkles.visible = index >= 3; // Golden Steel 起：有閃粉
  for (const [name, group] of Object.entries(station.extras)) group.visible = name === tier.extra || (tier.extra === 'kingdom' && name === 'astral'); // 皇國：連埋 Astral 嘅宇宙特效
  // Astral：機身變星空；Inferno：機身變火山石 + 發光熔岩裂紋，金屬邊發橙光
  const starry = tier.extra === 'astral' || tier.extra === 'kingdom' ? starTexture() : null;
  const fiery = tier.extra === 'inferno' ? infernoTexture() : null;
  const skin = starry || fiery;
  if (station.baseMat.map !== skin) {
    station.baseMat.map = skin;
    station.baseMat.emissiveMap = skin;
    station.baseMat.needsUpdate = true;
  }
  if (skin) {
    station.baseMat.color.setHex(0xffffff);
    station.baseMat.emissive.setHex(0xffffff);
    station.baseMat.emissiveIntensity = fiery ? 0.9 : 0.6;
  } else station.baseMat.emissiveIntensity = 1;
  station.trimMat.emissive.setHex(fiery ? 0xff5a00 : 0x000000);
  station.trimMat.emissiveIntensity = fiery ? 0.7 : 1;
  station.stageGlow.color.setHex(tier.glow || 0x90a4ae);
  station.stageGlow.emissive.setHex(tier.glow || 0x000000);
  station.tierLabel.userData.setLines([{ text: `★ ${tier.name} ★`, color: `#${new THREE.Color(tier.glow || 0xffffff).getHexString()}` }]);
}

// 地上光圈 + 閃粉 + 每級獨有嘅裝飾
function addFancyBits(station, group, y) {
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  station.ring = add(group, new THREE.RingGeometry(2.4, 3.0, 48), ringMat, 0, y + 0.02, 0);
  station.ring.rotation.x = -Math.PI / 2;
  station.ring.castShadow = false;
  station.ringMat = ringMat;
  const count = 50;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 4;
    positions[i * 3 + 1] = Math.random() * 3.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  station.sparkles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xfff59d, size: 0.09, transparent: true, opacity: 0.9 }));
  group.add(station.sparkles);

  const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...extra });
  const glowMat = (color, intensity = 2) => M(color, { emissive: color, emissiveIntensity: intensity });
  const extras = {};
  const make = (name) => {
    const g = new THREE.Group();
    g.visible = false;
    group.add(g);
    extras[name] = g;
    return g;
  };
  // 四個角（機身四邊）
  const corners = [[-1.9, -2.4], [1.9, -2.4], [-1.9, 2.5], [1.9, 2.5]];

  // ---- Starters：細綠旗 + 新手星星貼紙 ----
  const starters = make('starters');
  for (const [x, z] of corners.slice(2)) {
    add(starters, rbox(0.08, 1.6, 0.08), M(0xffffff), x, 0.8, z);
    add(starters, rbox(0.6, 0.4, 0.04), M(0x76ff03), x + 0.3, 1.4, z);
  }
  for (const s of [-1, 1]) add(starters, new THREE.OctahedronGeometry(0.22), glowMat(0xffeb3b, 1), s * 1.62, 0.6, 0.2);

  // ---- Iron Steel／Golden Steel：螺絲釘 + 鋼樑 ----
  const iron = make('iron');
  const bolt = M(0xcfd8dc, { metalness: 0.9, roughness: 0.2 });
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) add(iron, new THREE.CylinderGeometry(0.07, 0.07, 0.06, 6), bolt, s * 1.62, 0.42, -2.4 + i * 0.95).rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) add(iron, rbox(0.18, 0.18, 5.6), station.trimMat, s * 1.75, 0.9, 0.1);

  // ---- Neon：一條條發光霓虹管圍住部機 ----
  const neon = make('neon');
  const tube = (color, x, y, z, w, h, d) => add(neon, rbox(w, h, d), glowMat(color, 3), x, y, z);
  for (const s of [-1, 1]) {
    tube(0xff2bd6, s * 1.8, 0.15, 0.1, 0.06, 0.06, 5.8);
    tube(0x00e5ff, s * 1.8, 2.4, -2.6, 0.06, 2.2, 0.06);
  }
  tube(0x00e5ff, 0, 3.55, -2.6, 3.6, 0.06, 0.06);

  // ---- Frozen：冰柱、雪帽、冰塊 ----
  const frozen = make('frozen');
  const ice = M(0xb3e5fc, { transparent: true, opacity: 0.8, roughness: 0.05, emissive: 0x01579b, emissiveIntensity: 0.3 });
  for (let i = 0; i < 8; i++) {
    const cone = add(frozen, new THREE.ConeGeometry(0.1, 0.5 + (i % 3) * 0.2, 5), ice, -1.4 + i * 0.4, 3.0, -2.6);
    cone.rotation.x = Math.PI; // 倒吊嘅冰柱
  }
  add(frozen, rbox(3.5, 0.2, 0.5), M(0xffffff), 0, 3.6, -2.7); // 屏幕頂嘅雪
  for (const [x, z] of corners) add(frozen, new THREE.DodecahedronGeometry(0.45, 0), ice, x, 0.35, z);
  frozen.userData.flakes = [];
  for (let i = 0; i < 14; i++) {
    const f = add(frozen, new THREE.OctahedronGeometry(0.06), M(0xffffff), 0, 0, 0);
    f.castShadow = false;
    frozen.userData.flakes.push(f);
  }

  // ---- Molten：熔岩池、發光裂紋、火花向上飄 ----
  const molten = make('molten');
  const lava = glowMat(0xff6d00, 2.5);
  for (const [x, z] of corners) add(molten, new THREE.CylinderGeometry(0.5, 0.6, 0.12, 8), lava, x, 0.06, z);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) add(molten, rbox(0.04, 0.05, 0.5), lava, s * 1.61, 0.2, -2 + i * 1.0).rotation.y = (i % 2 ? 0.4 : -0.4);
  molten.userData.embers = [];
  for (let i = 0; i < 12; i++) {
    const e = add(molten, new THREE.BoxGeometry(0.08, 0.08, 0.08), glowMat(0xffab00, 3), 0, 0, 0);
    e.castShadow = false;
    molten.userData.embers.push(e);
  }

  // ---- Diamond：浮喺上面轉嘅大鑽石 ----
  const diamond = make('diamond');
  const gem = M(0xe0f7fa, { metalness: 0.2, roughness: 0.02, transparent: true, opacity: 0.85, emissive: 0x80deea, emissiveIntensity: 0.5, flatShading: true });
  diamond.userData.gems = corners.map(([x, z], i) => {
    const d = add(diamond, new THREE.OctahedronGeometry(0.4), gem, x, 2.2 + (i % 2) * 0.5, z);
    d.scale.y = 1.4;
    return d;
  });
  const bigGem = add(diamond, new THREE.OctahedronGeometry(0.5), gem, 0, 4.4, -2.6);
  bigGem.scale.y = 1.4;
  diamond.userData.gems.push(bigGem);

  // ---- Sci-Fi：全息光環（企住轉）、浮動面板 ----
  const scifi = make('scifi');
  const holo = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  scifi.userData.rings = [0, 1].map((i) => {
    const r = add(scifi, new THREE.TorusGeometry(1.9 - i * 0.4, 0.04, 6, 48), holo, 0, 1.6, 0.4);
    r.castShadow = false;
    return r;
  });
  for (const s of [-1, 1]) {
    const panel = add(scifi, new THREE.PlaneGeometry(1.0, 0.7), holo, s * 2.3, 2.2, -1.4);
    panel.rotation.y = -s * 0.6;
    panel.castShadow = false;
  }
  for (const s of [-1, 1]) add(scifi, rbox(0.25, 3.2, 0.25), M(0xf5f5f5, { metalness: 0.6 }), s * 2.0, 1.6, -2.7);

  // ---- Hacker：綠色「Matrix」代碼雨 + 幾部細電腦 ----
  const hacker = make('hacker');
  const green = glowMat(0x00ff41, 2.5);
  hacker.userData.drops = [];
  for (let i = 0; i < 18; i++) {
    const d = add(hacker, new THREE.BoxGeometry(0.06, 0.25, 0.06), green, 0, 0, 0);
    d.castShadow = false;
    d.userData.x = -2.1 + (i % 6) * 0.84;
    d.userData.z = -2.8 + Math.floor(i / 6) * 2.6;
    d.userData.speed = 1.5 + Math.random() * 2;
    d.userData.offset = Math.random() * 4;
    hacker.userData.drops.push(d);
  }
  for (const s of [-1, 1]) {
    add(hacker, rbox(0.8, 0.55, 0.08), M(0x111111), s * 2.3, 1.2, -1.5).rotation.y = -s * 0.5;
    add(hacker, new THREE.PlaneGeometry(0.7, 0.45), green, s * 2.27, 1.2, -1.44).rotation.y = -s * 0.5;
  }

  // ---- Celebrity：紅地氈、金星星、射燈掃嚟掃去 ----
  const celebrity = make('celebrity');
  add(celebrity, new THREE.BoxGeometry(2.4, 0.03, 4), M(0xc62828), 0, 0.015, 4.6); // 紅地氈
  for (const s of [-1, 1]) {
    add(celebrity, rbox(0.12, 1.0, 0.12), M(0xffd700, { metalness: 0.9 }), s * 1.4, 0.5, 3.0); // 金柱
    add(celebrity, rbox(0.12, 1.0, 0.12), M(0xffd700, { metalness: 0.9 }), s * 1.4, 0.5, 6.0);
    add(celebrity, rbox(0.06, 0.06, 3.0), M(0xb71c1c), s * 1.4, 0.85, 4.5); // 紅絨繩
  }
  for (let i = 0; i < 3; i++) {
    const star = add(celebrity, new THREE.OctahedronGeometry(0.22), glowMat(0xffd700, 1.5), (i - 1) * 0.7, 0.05, 3.5 + i);
    star.scale.y = 0.2;
  }
  celebrity.userData.lights = [-1, 1].map((s) => {
    const pivotGroup = new THREE.Group();
    pivotGroup.position.set(s * 2.4, 0.3, -2.6);
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 6, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    );
    beam.position.y = 3;
    beam.rotation.x = Math.PI;
    pivotGroup.add(beam);
    add(pivotGroup, rbox(0.4, 0.4, 0.4), M(0x212121), 0, 0, 0);
    celebrity.add(pivotGroup);
    return { pivotGroup, s };
  });

  // ---- Heavenly：天使翼、金光環、底下浮雲 ----
  const heavenly = make('heavenly');
  const white = M(0xffffff);
  const gold = M(0xffd54f, { emissive: 0xffb300, emissiveIntensity: 0.8, metalness: 0.8, roughness: 0.2 });
  for (const s of [-1, 1]) {
    // 一隻翼 = 6 條羽毛好似扇咁散開（由屏幕兩邊伸出去）
    const wing = new THREE.Group();
    wing.position.set(s * 1.7, 3.3, -2.5);
    for (let i = 0; i < 6; i++) {
      const length = 1.0 + i * 0.28;
      const feather = new THREE.Group();
      feather.rotation.z = -s * (0.35 + i * 0.2);
      add(feather, rbox(0.32, length, 0.1), white, 0, length / 2, 0);
      add(feather, rbox(0.2, 0.3, 0.12), gold, 0, length - 0.1, 0); // 金色羽毛尖
      wing.add(feather);
    }
    heavenly.add(wing);
    heavenly.userData[`wing${s}`] = wing;
  }
  const halo = add(heavenly, new THREE.TorusGeometry(0.8, 0.09, 8, 32), gold, 0, 5.3, -2.2);
  halo.rotation.x = Math.PI / 2.3;
  heavenly.userData.halo = halo;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(heavenly, rbox(1.2, 0.5, 0.9), M(0xffffff, { transparent: true, opacity: 0.85 }), Math.cos(a) * 2.2, 0.15, Math.sin(a) * 2.6).castShadow = false;
  }

  // ---- Luminous：發光水晶柱 + 圍住轉嘅光波 ----
  const luminous = make('luminous');
  const glass = M(0x84ffff, { emissive: 0x00e5ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.75, roughness: 0.05 });
  for (const [x, z, h] of [[-1.9, -2.2, 2.2], [1.9, -2.2, 2.6], [-1.9, 2.4, 1.6], [1.9, 2.4, 1.9]]) {
    const c = add(luminous, new THREE.OctahedronGeometry(0.35), glass, x, h / 2, z);
    c.scale.set(1, h, 1);
  }
  luminous.userData.orbs = [];
  for (let i = 0; i < 6; i++) {
    const orb = add(luminous, new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshBasicMaterial({ color: 0xe0ffff }), 0, 2, 0);
    orb.castShadow = false;
    luminous.userData.orbs.push(orb);
  }

  // ---- Astral（最高級）：好多宇宙特效（小朋友話舊款好醜，要好型、好多特效）----
  const astral = make('astral');
  const additive = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  // 1. 旋轉銀河：幾百粒彩色星，螺旋形
  {
    const count = 420;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const arm = i % 3;
      const r = 0.4 + Math.random() * 3.4;
      const a = arm * ((Math.PI * 2) / 3) + r * 1.1 + (Math.random() - 0.5) * 0.5;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.25;
      pos[i * 3 + 2] = Math.sin(a) * r;
      c.setHSL(0.72 + Math.random() * 0.25, 1, 0.6 + Math.random() * 0.3);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const galaxy = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    galaxy.position.y = 0.25;
    astral.add(galaxy);
    astral.userData.galaxy = galaxy;
  }
  // 2. 機後面好大嘅宇宙傳送門：幾層光環 + 中間旋渦
  {
    const portal = new THREE.Group();
    portal.position.set(0, 3.6, -3.3);
    add(portal, new THREE.TorusGeometry(2.1, 0.12, 10, 64), glowMat(0xea80fc, 3), 0, 0, 0);
    add(portal, new THREE.TorusGeometry(1.85, 0.05, 8, 64), glowMat(0x40c4ff, 3), 0, 0, 0);
    const swirl = [];
    for (let i = 0; i < 4; i++) {
      const disc = new THREE.Mesh(new THREE.RingGeometry(0.2 + i * 0.4, 0.5 + i * 0.4, 6 + i, 1, 0, Math.PI * 1.4), additive([0xd500f9, 0x651fff, 0x00e5ff, 0xff4081][i], 0.45));
      portal.add(disc);
      swirl.push(disc);
    }
    astral.add(portal);
    astral.userData.portal = { portal, swirl };
  }
  // 3. 星球 + 軌道線
  const planetColors = [0xff8a65, 0x4fc3f7, 0xffd54f, 0x81c784];
  astral.userData.planets = planetColors.map((c, i) => {
    const pl = add(astral, new THREE.SphereGeometry(0.22 + (i % 2) * 0.12, 16, 12), glowMat(c, 0.8), 0, 0, 0);
    if (i === 2) {
      const ringP = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 32), glowMat(0xffe082, 1.5));
      ringP.rotation.x = 1.2;
      pl.add(ringP); // 有光環嘅土星
    }
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.2 + i * 0.35, 0.012, 4, 96), additive(c, 0.35));
    orbit.rotation.x = Math.PI / 2;
    orbit.position.y = 2.2 + i * 0.3;
    astral.add(orbit);
    return pl;
  });
  // 4. 流星：由天飛落嚟，有條尾
  astral.userData.meteors = [];
  for (let i = 0; i < 5; i++) {
    const meteor = new THREE.Group();
    add(meteor, new THREE.SphereGeometry(0.08, 8, 6), glowMat(0xffffff, 4), 0, 0, 0);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 1.4, 6, 1, true), additive(0x80d8ff, 0.6));
    tail.position.y = 0.7;
    meteor.add(tail);
    meteor.rotation.z = -0.7;
    astral.add(meteor);
    astral.userData.meteors.push({ meteor, offset: i / 5, x: -3 + i * 1.5 });
  }
  // 5. 星雲光團（一閃一閃）
  astral.userData.nebulae = [[-2.4, 2.6, -1.5, 0xd500f9], [2.4, 3.2, -1.2, 0x00e5ff], [0, 5.6, -2.2, 0xff4081], [-1.8, 1.4, 2.6, 0x651fff], [2, 1.8, 2.4, 0x2979ff]].map(([x, y, z, c], i) => {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), additive(c, 0.18));
    n.position.set(x, y, z);
    astral.add(n);
    return { n, i };
  });
  // 6. 四角光柱射上天
  astral.userData.pillars = corners.map(([x, z], i) => {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 9, 12, 1, true), additive(i % 2 ? 0xea80fc : 0x40c4ff, 0.35));
    beam.position.set(x, 4.5, z);
    astral.add(beam);
    add(astral, new THREE.OctahedronGeometry(0.3), glowMat(i % 2 ? 0xea80fc : 0x40c4ff, 3), x, 0.4, z).scale.y = 1.6;
    return beam;
  });
  // 7. 頭頂嘅太陽（有光暈）
  const sun = add(astral, new THREE.SphereGeometry(0.45, 20, 14), glowMat(0xfff59d, 4), 0, 6.6, -2.6);
  sun.castShadow = false;
  const corona = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), additive(0xffab40, 0.25));
  corona.position.copy(sun.position);
  astral.add(corona);
  astral.userData.corona = corona;

  // ---- Astral King's Kingdom（Lv16）：四座金色城堡塔、浮喺頭頂嘅皇冠、發光礦石、圍住轉嘅星星 ----
  const kingdom = make('kingdom');
  {
    const gold = M(0xffc107, { metalness: 0.95, roughness: 0.2, emissive: 0x5d3a00, emissiveIntensity: 0.4 });
    const stone = M(0x2a1b4d, { metalness: 0.3, roughness: 0.5 });
    const flags = [];
    for (const [x, z] of corners) {
      add(kingdom, new THREE.CylinderGeometry(0.32, 0.38, 2.6, 8), stone, x * 1.12, 1.3, z * 1.08);
      add(kingdom, new THREE.CylinderGeometry(0.42, 0.42, 0.3, 8), gold, x * 1.12, 2.7, z * 1.08);
      for (let k = 0; k < 4; k++) add(kingdom, new THREE.BoxGeometry(0.16, 0.22, 0.16), gold, x * 1.12 + Math.cos((k / 4) * Math.PI * 2) * 0.34, 2.95, z * 1.08 + Math.sin((k / 4) * Math.PI * 2) * 0.34); // 城垛
      add(kingdom, new THREE.ConeGeometry(0.36, 0.9, 8), M(0x6a1b9a, { emissive: 0x4a148c, emissiveIntensity: 0.6 }), x * 1.12, 3.5, z * 1.08);
      add(kingdom, new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4), gold, x * 1.12, 4.3, z * 1.08);
      const flag = add(kingdom, new THREE.BoxGeometry(0.5, 0.3, 0.03), glowMat(0xffd740, 1.2), x * 1.12 + 0.26, 4.55, z * 1.08);
      flags.push(flag);
    }
    // 礦石：黑石 + 金礦、鑽石、紫水晶
    const oreColors = [0xffd740, 0x80deea, 0xea80fc, 0x69f0ae];
    const ores = [];
    [[-2.6, 0], [2.6, 0.4], [0, -3.3], [-1.2, 3.4], [1.3, 3.3]].forEach(([x, z], i) => {
      add(kingdom, new THREE.DodecahedronGeometry(0.45, 0), M(0x37474f, { flatShading: true }), x, 0.3, z);
      for (let k = 0; k < 3; k++) {
        const c = oreColors[(i + k) % oreColors.length];
        const gem = add(kingdom, new THREE.OctahedronGeometry(0.16 + k * 0.03), glowMat(c, 1.8), x + (k - 1) * 0.22, 0.55 + (k % 2) * 0.15, z + 0.15);
        gem.scale.y = 1.7;
        ores.push(gem);
      }
    });
    // 浮喺頭頂嘅大皇冠（有寶石）
    const crown = new THREE.Group();
    const band = add(crown, new THREE.CylinderGeometry(0.8, 0.8, 0.35, 16, 1, true), gold, 0, 0, 0);
    band.material.side = THREE.DoubleSide;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      add(crown, new THREE.ConeGeometry(0.13, 0.45, 4), gold, Math.cos(a) * 0.8, 0.38, Math.sin(a) * 0.8);
      add(crown, new THREE.SphereGeometry(0.08, 8, 6), glowMat(oreColors[k % 4], 2), Math.cos(a) * 0.82, 0.02, Math.sin(a) * 0.82);
    }
    crown.position.set(0, 6.2, 0);
    kingdom.add(crown);
    // 圍住轉嘅金色星星
    const stars = [];
    for (let k = 0; k < 10; k++) {
      const st = add(kingdom, new THREE.OctahedronGeometry(0.14), glowMat(k % 2 ? 0xfff59d : 0xffd740, 2.5), 0, 0, 0);
      st.castShadow = false;
      stars.push(st);
    }
    kingdom.userData = { crown, stars, flags, ores };
  }

  // ---- Inferno Sanctuary（Lv17）：見 inferno.js（火山石門、熔岩瀑布、火龍捲、火焰圈、BB 火龍……）----
  buildInferno(make('inferno'));

  // ---- Mountain Magic：細雪山、魔法水晶、紫色魔法陣 ----
  const mountain = make('mountain');
  const rock = M(0x6d6359, { flatShading: true });
  const snowCap = M(0xffffff, { flatShading: true });
  const magic = M(0xd1c4e9, { emissive: 0x7c4dff, emissiveIntensity: 1.6, flatShading: true });
  for (const [x, z, h] of [[-2.1, -2.4, 2.4], [2.1, -2.4, 3], [-2.2, 2.3, 1.6], [2.2, 2.4, 2]]) {
    add(mountain, new THREE.ConeGeometry(0.9, h, 5), rock, x, h / 2, z);
    add(mountain, new THREE.ConeGeometry(0.38, h * 0.3, 5), snowCap, x, h * 0.86, z);
    const crystal = add(mountain, new THREE.OctahedronGeometry(0.25), magic, x + 0.6, 0.4, z + 0.3);
    crystal.scale.y = 1.8;
  }
  const rune = add(mountain, new THREE.RingGeometry(2.0, 2.2, 6), new THREE.MeshBasicMaterial({ color: 0xb388ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }), 0, 0.12, 0);
  rune.rotation.x = -Math.PI / 2;
  mountain.userData.rune = rune;

  // ================= 加料：Frozen／Molten／Sci-Fi／Celebrity 更多特效 =================
  const addBlend = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const cool = {};

  // ---- Frozen：極光、冰拱門、冰刺圈、霜霧 ----
  {
    const g = extras.frozen;
    cool.aurora = [0x69f0ae, 0x18ffff, 0xb388ff].map((c, i) => {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(6, 3, 24, 1), addBlend(c, 0.22));
      plane.position.set(0, 5.4 + i * 0.5, -3.6 - i * 0.3);
      plane.userData.base = plane.geometry.attributes.position.array.slice();
      g.add(plane);
      return plane;
    });
    const iceMat = M(0xb3e5fc, { transparent: true, opacity: 0.85, roughness: 0.02, emissive: 0x4fc3f7, emissiveIntensity: 0.6, flatShading: true });
    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.22, 6, 20, Math.PI), iceMat);
    arch.position.set(0, 0.1, 3.2);
    g.add(arch);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const spikeM = add(g, new THREE.ConeGeometry(0.16, 0.7 + (i % 3) * 0.4, 5), iceMat, Math.cos(a) * 3.1, 0.4, Math.sin(a) * 3.6);
      spikeM.rotation.z = Math.cos(a) * -0.3;
      spikeM.rotation.x = Math.sin(a) * 0.3;
    }
    const count = 160;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) pos.set([(Math.random() - 0.5) * 6, Math.random() * 0.8, (Math.random() - 0.5) * 7], i * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    cool.mist = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe1f5fe, size: 0.18, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(cool.mist);
  }

  // ---- Molten：火山噴火球、火焰、熔岩河、黑煙 ----
  {
    const g = extras.molten;
    const rockM = M(0x2b1b17, { flatShading: true });
    const lavaGlow = glowMat(0xff3d00, 3);
    cool.fireballs = [];
    for (const s of [-1, 1]) {
      const vx = s * 2.6;
      add(g, new THREE.ConeGeometry(1.0, 2.2, 7), rockM, vx, 1.1, -2.9);
      add(g, new THREE.CylinderGeometry(0.32, 0.32, 0.1, 10), lavaGlow, vx, 2.2, -2.9);
      for (let i = 0; i < 3; i++) {
        const ball = add(g, new THREE.SphereGeometry(0.16, 10, 8), glowMat(0xffab00, 4), vx, 2.2, -2.9);
        ball.castShadow = false;
        cool.fireballs.push({ ball, vx, phase: i / 3 + (s > 0 ? 0.5 : 0), dir: s });
      }
    }
    cool.flames = [];
    for (const [x, z] of [[-1.9, 2.6], [1.9, 2.6], [-1.9, 0], [1.9, 0]]) {
      const flame = new THREE.Group();
      flame.position.set(x, 0.1, z);
      [[0xff6d00, 0.35, 1.2], [0xffab00, 0.24, 0.9], [0xffff8d, 0.12, 0.6]].forEach(([c, r, h]) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), addBlend(c, 0.75));
        cone.position.y = h / 2;
        flame.add(cone);
      });
      g.add(flame);
      cool.flames.push(flame);
    }
    cool.lavaRiver = [-1, 1].map((s) => add(g, new THREE.BoxGeometry(0.35, 0.05, 6.2), glowMat(0xff6d00, 2), s * 2.0, 0.07, 0.1));
    cool.smoke = [];
    for (let i = 0; i < 8; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: 0x3e2723, transparent: true, opacity: 0.4, depthWrite: false }));
      g.add(puff);
      cool.smoke.push(puff);
    }
  }

  // ---- Sci-Fi：掃描光板、無人機、激光格、能量柱 ----
  {
    const g = extras.scifi;
    cool.scanner = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 6), addBlend(0x00e5ff, 0.25));
    cool.scanner.rotation.x = -Math.PI / 2;
    g.add(cool.scanner);
    cool.scanEdge = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.03, 0.03), glowMat(0x18ffff, 4));
    g.add(cool.scanEdge);
    for (let i = -3; i <= 3; i++) {
      add(g, new THREE.BoxGeometry(0.03, 0.02, 7), glowMat(0x00b0ff, 2), i * 0.7, 0.11, 0.1); // 激光格
      add(g, new THREE.BoxGeometry(4.4, 0.02, 0.03), glowMat(0x00b0ff, 2), 0, 0.11, i * 1.0 + 0.1);
    }
    cool.drones = [0, 1, 2].map((i) => {
      const d = new THREE.Group();
      add(d, rbox(0.5, 0.18, 0.5), M(0xeceff1, { metalness: 0.7 }), 0, 0, 0);
      add(d, new THREE.SphereGeometry(0.08, 8, 6), glowMat(0x00e5ff, 4), 0, -0.05, -0.26);
      for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) add(d, new THREE.CylinderGeometry(0.14, 0.14, 0.02, 10), addBlend(0xb2ebf2, 0.6), x, 0.12, z);
      g.add(d);
      return d;
    });
    cool.pylons = [];
    for (const [x, z] of [[-2.1, 2.7], [2.1, 2.7]]) {
      add(g, rbox(0.3, 2.4, 0.3), M(0xf5f5f5, { metalness: 0.6 }), x, 1.2, z);
      const orb = add(g, new THREE.SphereGeometry(0.25, 14, 10), glowMat(0x00e5ff, 4), x, 2.7, z);
      orb.castShadow = false;
      cool.pylons.push(orb);
    }
    cool.zap = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.04, 0.04), glowMat(0xe0f7fa, 5)); // 兩支柱之間嘅電流
    cool.zap.position.set(0, 2.7, 2.7);
    g.add(cool.zap);
  }

  // ---- Celebrity：閃光燈、彩紙、大金星燈牌、迪士高波 ----
  {
    const g = extras.celebrity;
    cool.flashes = [];
    for (let i = 0; i < 8; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), addBlend(0xffffff, 0));
      f.position.set((i % 2 ? 1 : -1) * (2.6 + Math.random()), 0.8 + Math.random() * 1.5, 2 + Math.random() * 4);
      g.add(f);
      cool.flashes.push({ f, phase: Math.random() * 10 });
    }
    const confettiCount = 140;
    const cpos = new Float32Array(confettiCount * 3);
    const ccol = new Float32Array(confettiCount * 3);
    const cc = new THREE.Color();
    for (let i = 0; i < confettiCount; i++) {
      cpos.set([(Math.random() - 0.5) * 5, Math.random() * 6, (Math.random() - 0.5) * 6], i * 3);
      cc.setHSL(Math.random(), 1, 0.6);
      ccol.set([cc.r, cc.g, cc.b], i * 3);
    }
    const cgeo = new THREE.BufferGeometry();
    cgeo.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
    cgeo.setAttribute('color', new THREE.BufferAttribute(ccol, 3));
    cool.confetti = new THREE.Points(cgeo, new THREE.PointsMaterial({ size: 0.13, vertexColors: true }));
    g.add(cool.confetti);
    // 大金星燈牌：一粒大星 + 一圈燈泡
    const marquee = new THREE.Group();
    marquee.position.set(0, 5.6, -3.0);
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.55 : 1.3;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const bigStar = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape, { depth: 0.2, bevelEnabled: false }), M(0xffd700, { metalness: 0.9, roughness: 0.2, emissive: 0xffa000, emissiveIntensity: 0.8 }));
    marquee.add(bigStar);
    cool.bulbs = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const bulb = add(marquee, new THREE.SphereGeometry(0.09, 8, 6), glowMat(0xfff9c4, 4), Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0.15);
      bulb.castShadow = false;
      cool.bulbs.push(bulb);
    }
    g.add(marquee);
    cool.marquee = marquee;
    // 迪士高波（轉）+ 光點
    const disco = add(g, new THREE.IcosahedronGeometry(0.45, 1), M(0xffffff, { metalness: 0.3, roughness: 0.1, flatShading: true, emissive: 0xb0bec5, emissiveIntensity: 0.9 }), 0, 4.0, 1.2);
    cool.disco = disco;
    cool.discoSpots = [0xff4081, 0x40c4ff, 0xffeb3b, 0x69f0ae, 0xe040fb].map((c) => {
      const spot = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12), addBlend(c, 0.55));
      spot.rotation.x = -Math.PI / 2;
      g.add(spot);
      return spot;
    });
  }
  station.cool = cool;

  // ---- 每部機都有：舞台底座（邊有燈條）+ 頭頂浮住嘅款式名 ----
  add(group, rbox(4.4, 0.1, 6.6), M(0x37474f, { roughness: 0.3, metalness: 0.4 }), 0, 0.05, 0.1);
  station.stageGlow = M(0xffffff, { emissive: 0x000000, emissiveIntensity: 2.5 });
  for (const s of [-1, 1]) {
    add(group, rbox(0.08, 0.06, 6.5), station.stageGlow, s * 2.2, 0.08, 0.1);
    add(group, rbox(4.3, 0.06, 0.08), station.stageGlow, 0, 0.08, 0.1 + s * 3.27);
  }
  station.tierLabel = makeLabel([{ text: '★ Basic ★' }], 0.9);
  station.tierLabel.position.y = 6.1;
  group.add(station.tierLabel);

  station.extras = extras;
}

// 加料特效嘅動畫
function animateCool(station, time) {
  const e = station.extras;
  const c = station.cool;
  if (e.frozen.visible) {
    c.aurora.forEach((plane, i) => {
      const arr = plane.geometry.attributes.position.array;
      const base = plane.userData.base;
      for (let k = 0; k < arr.length; k += 3) arr[k + 2] = base[k + 2] + Math.sin(base[k] * 1.2 + time * 1.5 + i) * 0.4;
      plane.geometry.attributes.position.needsUpdate = true;
      plane.material.opacity = 0.16 + Math.sin(time + i * 2) * 0.08;
    });
    c.mist.rotation.y = time * 0.15;
  }
  if (e.molten.visible) {
    c.fireballs.forEach(({ ball, vx, phase, dir }) => {
      const k = (time * 0.6 + phase) % 1;
      ball.position.set(vx + dir * k * 1.6, 2.2 + Math.sin(k * Math.PI) * 2.6 - k * 1.5, -2.9 + k * 1.8);
      ball.visible = k < 0.95;
    });
    c.flames.forEach((f, i) => f.scale.set(1, 0.8 + Math.abs(Math.sin(time * 9 + i * 1.7)) * 0.5, 1));
    c.lavaRiver.forEach((r, i) => (r.material.emissiveIntensity = 1.6 + Math.sin(time * 3 + i) * 0.8));
    c.smoke.forEach((p, i) => {
      const k = (time * 0.25 + i / 8) % 1;
      p.position.set((i % 2 ? 2.6 : -2.6) + Math.sin(time + i) * 0.3, 2.4 + k * 4, -2.9);
      p.scale.setScalar(0.6 + k * 1.6);
      p.material.opacity = 0.4 * (1 - k);
    });
  }
  if (e.scifi.visible) {
    const y = 0.2 + ((Math.sin(time * 1.2) + 1) / 2) * 3.2;
    c.scanner.position.set(0, y, 0.1);
    c.scanEdge.position.set(0, y, 3.1);
    c.drones.forEach((d, i) => {
      const a = time * 0.9 + (i / 3) * Math.PI * 2;
      d.position.set(Math.cos(a) * 3, 3 + Math.sin(time * 2 + i) * 0.4, Math.sin(a) * 3.4);
      d.rotation.y = -a;
    });
    c.pylons.forEach((o, i) => o.scale.setScalar(1 + Math.sin(time * 6 + i) * 0.2));
    c.zap.visible = Math.sin(time * 17) > 0.2;
    c.zap.position.y = 2.7 + (Math.random() - 0.5) * 0.08;
  }
  if (e.celebrity.visible) {
    c.flashes.forEach(({ f, phase }) => (f.material.opacity = Math.sin(time * 1.7 + phase) > 0.96 ? 0.95 : 0));
    const arr = c.confetti.geometry.attributes.position.array;
    for (let k = 0; k < arr.length; k += 3) {
      arr[k + 1] -= 0.02;
      arr[k] += Math.sin(time * 3 + k) * 0.005;
      if (arr[k + 1] < 0) arr[k + 1] = 6;
    }
    c.confetti.geometry.attributes.position.needsUpdate = true;
    c.bulbs.forEach((b, i) => (b.visible = (Math.floor(time * 6) + i) % 2 === 0)); // 燈泡追住閃
    c.marquee.rotation.y = Math.sin(time * 0.8) * 0.25;
    c.disco.rotation.y = time * 1.5;
    c.discoSpots.forEach((spot, i) => {
      const a = time * 0.8 + (i / 5) * Math.PI * 2;
      spot.position.set(Math.cos(a) * 2.4, 0.12, 1.2 + Math.sin(a) * 2.6);
    });
  }
}

// 每級裝飾嘅動畫
function animateExtras(station, time) {
  const e = station.extras;
  animateCool(station, time);
  if (e.frozen.visible) e.frozen.userData.flakes.forEach((f, i) => {
    const k = (time * 0.25 + i / 14) % 1;
    f.position.set(-1.8 + ((i * 7) % 14) * 0.27, 4 - k * 4, -2.5 + ((i * 5) % 14) * 0.38);
    f.rotation.y = time * 2 + i;
  });
  if (e.molten.visible) e.molten.userData.embers.forEach((m, i) => {
    const k = (time * 0.4 + i / 12) % 1;
    m.position.set(Math.sin(i * 2.3) * 1.8 + Math.sin(time * 2 + i) * 0.2, k * 4, Math.cos(i * 1.7) * 2.5);
    m.scale.setScalar(1 - k);
  });
  if (e.diamond.visible) e.diamond.userData.gems.forEach((d, i) => {
    d.rotation.y = time * 1.5 + i;
    d.position.y += Math.sin(time * 2 + i) * 0.003;
  });
  if (e.scifi.visible) e.scifi.userData.rings.forEach((r, i) => {
    r.rotation.y = time * (i ? -1.2 : 0.8);
    r.position.y = 1.6 + Math.sin(time * 1.5 + i * 2) * 0.6;
  });
  if (e.hacker.visible) e.hacker.userData.drops.forEach((d) => {
    const y = 4 - ((time * d.userData.speed + d.userData.offset) % 4);
    d.position.set(d.userData.x, y, d.userData.z);
  });
  if (e.celebrity.visible) e.celebrity.userData.lights.forEach(({ pivotGroup, s }) => {
    pivotGroup.rotation.z = s * (0.3 + Math.sin(time * 1.2 + s) * 0.35);
  });
  if (e.heavenly.visible) {
    e.heavenly.userData['wing-1'].rotation.y = 0.35 + Math.sin(time * 3) * 0.3; // 拍翼
    e.heavenly.userData.wing1.rotation.y = -0.35 - Math.sin(time * 3) * 0.3;
    e.heavenly.userData.halo.position.y = 5.3 + Math.sin(time * 2) * 0.12;
  }
  if (e.luminous.visible) e.luminous.userData.orbs.forEach((orb, i) => {
    const a = time * 1.2 + (i / 6) * Math.PI * 2;
    orb.position.set(Math.cos(a) * 2.6, 1.2 + Math.sin(time * 2 + i) * 0.8, Math.sin(a) * 3);
  });
  if (e.mountain.visible) e.mountain.userData.rune.rotation.z = time * 0.5;
  if (e.inferno?.visible) animateInferno(e.inferno, station, time);
  if (e.kingdom.visible) {
    const u = e.kingdom.userData;
    u.crown.rotation.y = time * 0.6;
    u.crown.position.y = 6.2 + Math.sin(time * 1.5) * 0.2;
    u.stars.forEach((st, i) => {
      const a = time * 0.9 + (i / u.stars.length) * Math.PI * 2;
      st.position.set(Math.cos(a) * 3.2, 3.5 + Math.sin(time * 2 + i) * 0.6, Math.sin(a) * 3.6);
      st.rotation.y = time * 3;
    });
    u.flags.forEach((f, i) => (f.rotation.y = Math.sin(time * 4 + i) * 0.4));
    u.ores.forEach((g, i) => (g.material.emissiveIntensity = 1.4 + Math.sin(time * 3 + i) * 0.6));
  }
  if (e.astral.visible) {
    const u = e.astral.userData;
    u.galaxy.rotation.y = time * 0.35;
    u.portal.swirl.forEach((d, i) => (d.rotation.z = time * (i % 2 ? -1.5 : 1.2) * (1 + i * 0.3)));
    u.portal.portal.scale.setScalar(1 + Math.sin(time * 2) * 0.04);
    u.planets.forEach((pl, i) => {
      const a = time * (0.7 - i * 0.12) + i * 1.6;
      const r = 2.2 + i * 0.35;
      pl.position.set(Math.cos(a) * r, 2.2 + i * 0.3, Math.sin(a) * r);
      pl.rotation.y = time;
    });
    u.meteors.forEach(({ meteor, offset, x }) => {
      const k = (time * 0.45 + offset) % 1;
      meteor.position.set(x + k * 3, 8 - k * 7.5, -1 + offset * 3);
      meteor.visible = k < 0.9;
    });
    u.nebulae.forEach(({ n, i }) => {
      n.material.opacity = 0.12 + Math.sin(time * 1.5 + i) * 0.08;
      n.scale.setScalar(1 + Math.sin(time + i) * 0.15);
    });
    u.pillars.forEach((beam, i) => (beam.material.opacity = 0.25 + Math.sin(time * 3 + i) * 0.15));
    u.corona.scale.setScalar(1 + Math.sin(time * 3) * 0.2);
  }
}

// ================= 跑步機 =================
// 方塊健身室款：長長嘅跑步帶、兩邊扶手、控制台、仲有個大屏幕播短片

function buildTreadmill(scene, x, z) {
  const station = {
    kind: 'treadmill', name: 'Treadmill', stat: 'Speed', statKey: 'speed', levelKey: 'treadmillLevel', x, z,
  };
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  station.baseMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
  station.trimMat = new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.3 });
  station.ledMat = new THREE.MeshStandardMaterial({ emissiveIntensity: 3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6 });

  // 底座 + 兩邊踏腳位
  add(g, rbox(3.2, 0.35, 5.8), station.baseMat, 0, 0.18, 0.1);
  for (const s of [-1, 1]) add(g, rbox(0.45, 0.12, 5.6), station.trimMat, s * 1.38, 0.38, 0.1);
  // 會郁嘅跑步帶
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, 64, 12);
  station.beltTexture = new THREE.CanvasTexture(canvas);
  station.beltTexture.wrapS = station.beltTexture.wrapT = THREE.RepeatWrapping;
  station.beltTexture.repeat.set(1, 10);
  const belt = add(g, new THREE.PlaneGeometry(2.2, 5.4), new THREE.MeshStandardMaterial({ map: station.beltTexture, roughness: 0.9 }), 0, 0.36, 0.1);
  belt.rotation.x = -Math.PI / 2;
  // 兩邊 LED 燈條
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.07, 0.07, 5.6), station.ledMat, s * 1.62, 0.3, 0.1);
  // 前面摩打蓋
  add(g, rbox(3.2, 0.7, 1.0), station.baseMat, 0, 0.5, -2.8);
  add(g, rbox(3.25, 0.12, 1.05), station.trimMat, 0, 0.9, -2.8);
  // 兩支柱 + 扶手
  for (const s of [-1, 1]) {
    const post = add(g, rbox(0.22, 1.8, 0.22), station.trimMat, s * 1.35, 1.65, -2.6);
    post.rotation.x = 0.15;
    add(g, rbox(0.16, 0.16, 1.6), dark, s * 1.35, 1.75, -1.75); // 手柄（黑色膠）
  }
  add(g, rbox(2.9, 0.18, 0.18), station.trimMat, 0, 1.75, -2.55);
  // 控制台（斜斜）+ 速度燈
  const console_ = add(g, rbox(2.6, 0.25, 0.8), dark, 0, 2.05, -2.45);
  console_.rotation.x = 0.5;
  add(g, new THREE.BoxGeometry(1.4, 0.05, 0.35), station.ledMat, 0, 2.17, -2.42).rotation.x = 0.5;
  // 杯架 + 水樽
  add(g, rbox(0.3, 0.2, 0.3), dark, 1.0, 2.15, -2.2);
  add(g, new THREE.CylinderGeometry(0.09, 0.09, 0.35, 10), new THREE.MeshStandardMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.8 }), 1.0, 2.35, -2.2);
  // 大屏幕：播短片
  add(g, rbox(3.4, 2.15, 0.2), dark, 0, 3.35, -2.75);
  station.video = createVideoScreen(3.15, 1.83);
  station.video.mesh.position.set(0, 3.35, -2.64);
  g.add(station.video.mesh);
  for (const s of [-1, 1]) add(g, rbox(0.18, 1.2, 0.18), station.trimMat, s * 1.4, 2.4, -2.8);

  addCollider(x - 1.0, z - 2.8, 0.7);
  addCollider(x + 1.0, z - 2.8, 0.7);
  addFancyBits(station, g, 0.05);

  const title = makeSign('TREADMILL - Train Speed', 3.4, 0.6, THEMES.orange);
  title.position.set(x, 4.75, z - 2.8);
  scene.add(title);

  station.inZone = (px, pz) => Math.abs(px - x) < 1.2 && pz > z - 2.2 && pz < z + 2.8;
  station.standHeight = 0.36;
  return station;
}

// ================= 學生桌 =================
// 木書枱有櫃桶、電腦、書、枱燈、地球儀，後面有塊畫滿動物知識嘅黑板

function chalkboardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2e5d3a';
  ctx.fillRect(0, 0, 512, 300);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * 512, Math.random() * 300, 60, 2);
  ctx.fillStyle = '#f5f5f5';
  ctx.font = '700 40px "Comic Sans MS", "Chalkboard", cursive';
  ctx.textAlign = 'center';
  ctx.fillText('Study Time!', 256, 50);
  ctx.font = '600 24px "Comic Sans MS", "Chalkboard", cursive';
  ctx.textAlign = 'left';
  ['🐼 Pandas eat bamboo', '🐋 Whales breathe air', '🌳 Trees = homes', '♻️ Recycle plastic'].forEach((t, i) => ctx.fillText(t, 30, 100 + i * 42));
  ctx.fillStyle = '#ffeb3b';
  ctx.font = '700 64px "Comic Sans MS", cursive';
  ctx.fillText('IQ ↑', 360, 200);
  ctx.strokeStyle = '#f5f5f5';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(420, 120, 30, 0, Math.PI * 2);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildStudentTable(scene, x, z) {
  const station = {
    kind: 'table', name: 'Student Table', stat: 'IQ', statKey: 'iq', levelKey: 'tableLevel', x, z,
  };
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  station.baseMat = new THREE.MeshStandardMaterial({ roughness: 0.6 });
  station.trimMat = new THREE.MeshStandardMaterial({ roughness: 0.4 });
  station.ledMat = new THREE.MeshStandardMaterial({ emissiveIntensity: 3 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xb98a5e, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x37474f });
  const knob = new THREE.MeshStandardMaterial({ color: 0xffd54f, metalness: 0.6 });

  // 書枱：枱面 + 兩邊櫃桶
  add(g, rbox(3.0, 0.16, 1.4), wood, 0, 0.95, 0);
  add(g, rbox(3.04, 0.06, 1.44), station.trimMat, 0, 1.04, 0);
  for (const s of [-1, 1]) {
    add(g, rbox(0.85, 0.88, 1.3), station.baseMat, s * 1.0, 0.44, 0);
    for (const y of [0.25, 0.62]) {
      add(g, rbox(0.7, 0.3, 0.05), wood, s * 1.0, y, 0.66);
      add(g, rbox(0.2, 0.06, 0.06), knob, s * 1.0, y, 0.7);
    }
  }
  // 手提電腦（屏幕會發光）
  add(g, rbox(0.9, 0.05, 0.6), dark, 0, 1.08, 0.05);
  const screen = add(g, rbox(0.9, 0.6, 0.04), station.ledMat, 0, 1.38, -0.25);
  screen.rotation.x = -0.25;
  // 書（疊住）
  [[0xe53935, 0.12], [0x1e88e5, 0.1], [0x43a047, 0.14], [0xfdd835, 0.09]].forEach(([c, h], i) => {
    const book = add(g, rbox(0.5, h, 0.7), new THREE.MeshStandardMaterial({ color: c }), -1.05, 1.1 + i * 0.12, 0.05);
    book.rotation.y = (i - 1.5) * 0.15;
  });
  // 枱燈
  add(g, new THREE.CylinderGeometry(0.18, 0.2, 0.06, 12), dark, 1.1, 1.08, -0.35);
  add(g, rbox(0.06, 0.7, 0.06), dark, 1.1, 1.42, -0.35).rotation.z = -0.3;
  const shade = add(g, new THREE.ConeGeometry(0.22, 0.3, 4), station.baseMat, 0.95, 1.8, -0.35);
  shade.rotation.z = 0.6;
  add(g, new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({ color: 0xfff59d, emissive: 0xfff176 }), 0.9, 1.68, -0.35);
  // 地球儀
  add(g, rbox(0.25, 0.05, 0.25), dark, 1.05, 1.07, 0.35);
  const globe = add(g, new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshStandardMaterial({ color: 0x4fc3f7, flatShading: true }), 1.05, 1.38, 0.35);
  station.globe = globe;
  // 櫈（有靠背）
  add(g, rbox(0.9, 0.14, 0.85), station.baseMat, 0, 0.55, 1.3);
  add(g, rbox(0.9, 0.9, 0.12), station.baseMat, 0, 1.05, 1.72);
  add(g, rbox(0.12, 0.5, 0.12), dark, 0, 0.27, 1.3);
  add(g, rbox(0.7, 0.06, 0.7), dark, 0, 0.04, 1.3);
  // 黑板
  add(g, rbox(3.8, 2.3, 0.16), station.baseMat, 0, 2.35, -1.5);
  add(g, new THREE.PlaneGeometry(3.5, 2.0), new THREE.MeshStandardMaterial({ map: chalkboardTexture(), roughness: 0.9 }), 0, 2.35, -1.41);
  add(g, rbox(3.6, 0.08, 0.12), station.ledMat, 0, 3.54, -1.42);
  add(g, rbox(3.2, 0.08, 0.2), station.trimMat, 0, 1.2, -1.35); // 粉筆槽
  for (const s of [-1, 1]) add(g, rbox(0.15, 1.3, 0.15), station.trimMat, s * 1.8, 0.65, -1.5); // 黑板腳

  addCollider(x - 1.0, z, 0.8);
  addCollider(x + 1.0, z, 0.8);
  addCollider(x, z - 1.5, 0.7);
  addFancyBits(station, g, 0.05);

  const title = makeSign('STUDENT TABLE - Train IQ', 3.6, 0.6, THEMES.blue);
  title.position.set(x, 4.05, z - 1.5);
  scene.add(title);

  // 坐喺櫈附近就練緊 IQ
  station.inZone = (px, pz) => Math.abs(px - x) < 1.5 && pz > z + 0.7 && pz < z + 2.6;
  station.standHeight = 0;
  return station;
}

// 升級牌
function addUpgradeSign(scene, station, x, z) {
  const sign = dynamicSign(2.8, 1.9);
  const group = signOnPosts(sign.mesh, 2.8, 1.9, 2.3);
  group.position.set(x, 0, z);
  scene.add(group);
  station.sign = { x, z, ...sign };
  addCollider(x, z, 0.3);
}

function drawUpgradeSign(station) {
  const level = state[station.levelKey];
  const cost = upgradeCost(level);
  const canAfford = state.money >= cost;
  const maxed = level >= MAX_TRAINING_LEVEL;
  station.sign.draw(THEMES.dark, [
    { text: `UPGRADE ${station.name.toUpperCase()}`, size: 0.13, color: '#ffd54f' },
    { text: `Level ${level} · ${TIERS[tierOf(level)].name}`, size: 0.1 },
    { text: `+${trainingGainLabel(level, station.statKey, fmt)} ${station.stat} / sec`, size: 0.1, color: '#80deea' },
    maxed
      ? { text: '★ MAX LEVEL ★', size: 0.12, color: '#ffd54f' }
      : { text: `Next level: $${fmt(cost)}`, size: 0.12, color: canAfford ? '#69f0ae' : '#ff8a80' },
    { text: maxed ? 'You did it!' : 'Press E', size: 0.085, color: '#cfd8dc' },
  ]);
}

// ================= 繁殖機 =================

// ================= Dragon's Lair（繁殖機 Lv5）=================
// 小朋友 2026-10-17：「redesign the dragons lair」→ 成部機變做一個龍穴：
// 後面一道火山石拱門（有熔岩裂縫）、一條大紅龍圍住部機捲埋一圈（頭擱喺前面、尾巴捲到後面）、
// 一對蝙蝠翼慢慢張開又拍、前面一堆金幣同寶石、玻璃罩入面一隻發光龍蛋（冇動物喺入面先見到）、
// 鼻孔出煙、火星飄、火光一閃一閃
// 5 部機共用同一套物料同幾何體
const DL = {};
const dlMat = (key, make) => (DL[key] ??= make());
const STD = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
function dragonMats() {
  return {
    scale: dlMat('scale', () => STD(0x8e0e0e, { roughness: 0.35, metalness: 0.25 })),
    belly: dlMat('belly', () => STD(0xffb74d, { roughness: 0.5 })),
    dark: dlMat('dark', () => STD(0x3b0a0a)),
    horn: dlMat('horn', () => STD(0xfff3e0, { roughness: 0.35 })),
    rock: dlMat('rock', () => STD(0x2b2522, { roughness: 0.95, flatShading: true })),
    rock2: dlMat('rock2', () => STD(0x403632, { roughness: 0.95, flatShading: true })),
    lava: dlMat('lava', () => STD(0xff6d00, { emissive: 0xff3d00, emissiveIntensity: 1.8 })),
    eye: dlMat('eye', () => STD(0xffee58, { emissive: 0xffd600, emissiveIntensity: 2.6 })),
    pupil: dlMat('pupil', () => STD(0x111111)),
    wing: dlMat('wing', () => STD(0xc62828, { emissive: 0x4a0000, emissiveIntensity: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.93 })),
    gold: dlMat('gold', () => STD(0xffc107, { metalness: 0.9, roughness: 0.25, emissive: 0x6d4c00, emissiveIntensity: 0.35 })),
    gemR: dlMat('gemR', () => STD(0xff1744, { emissive: 0xd50000, emissiveIntensity: 1.2, flatShading: true })),
    gemB: dlMat('gemB', () => STD(0x40c4ff, { emissive: 0x0091ea, emissiveIntensity: 1.2, flatShading: true })),
    gemG: dlMat('gemG', () => STD(0x69f0ae, { emissive: 0x00c853, emissiveIntensity: 1.2, flatShading: true })),
    egg: dlMat('egg', () => STD(0x7f1d0c, { emissive: 0xb71c1c, emissiveIntensity: 0.5, roughness: 0.3 })),
    eggSpot: dlMat('eggSpot', () => STD(0xffab40, { emissive: 0xffab00, emissiveIntensity: 2 })),
    smoke: dlMat('smoke', () => STD(0x616161, { transparent: true, opacity: 0.6 })),
  };
}
const dlBox = (w, h, d) => (DL[`b${w},${h},${d}`] ??= new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2));
const dlGeo = (key, make) => (DL[`g${key}`] ??= make());

function buildDragonLair() {
  const M = dragonMats();
  const dragon = new THREE.Group();
  const put = (parent, geo, m, x, y, z) => add(parent, geo, m, x, y, z);

  // ---- 後面嘅火山石拱門（頂唔好高過 3 米，唔會遮住機頂個牌）----
  const arch = new THREE.Group();
  arch.position.set(0, 0, 1.55);
  dragon.add(arch);
  const rocks = [[-2.0, 0.55, 1.1], [-2.05, 1.5, 0.95], [-1.85, 2.25, 0.8], [-1.2, 2.7, 0.75], [-0.4, 2.85, 0.7], [0.4, 2.85, 0.7], [1.2, 2.7, 0.75], [1.85, 2.25, 0.8], [2.05, 1.5, 0.95], [2.0, 0.55, 1.1]];
  rocks.forEach(([x, y, r], i) => {
    const rk = put(arch, dlGeo(`rock${i % 3}`, () => new THREE.DodecahedronGeometry(1, 0)), i % 2 ? M.rock : M.rock2, x, y, 0);
    rk.scale.set(r, r * 0.95, r * 0.8);
    rk.rotation.set(i, i * 0.7, 0);
  });
  // 熔岩裂縫（發光細條）
  for (const [x, y, rz] of [[-2.0, 0.8, 0.4], [-1.9, 1.7, -0.3], [-0.8, 2.75, 1.4], [0.6, 2.9, 1.2], [1.95, 1.3, 0.5], [2.0, 0.5, -0.4]]) {
    put(arch, dlGeo('crack', () => new THREE.BoxGeometry(0.08, 0.7, 0.06)), M.lava, x, y, -0.62).rotation.z = rz;
  }

  // ---- 大紅龍：身一節節圍住部機捲一圈 ----
  // 由前面（-z，頭）沿住右邊轉去後面再返去左邊（尾）
  const R = 1.78;
  const SEG = 15;
  const segs = [];
  for (let i = 0; i < SEG; i++) {
    const k = i / (SEG - 1);
    const a = -Math.PI / 2 + 0.35 + k * Math.PI * 1.75;
    const size = 0.62 - k * 0.38; // 越近尾越幼
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * R, 0.32 + size * 0.45, Math.sin(a) * R);
    g.rotation.y = -a;
    put(g, dlBox(size * 1.25, size, size * 1.1), M.scale, 0, 0, 0);
    put(g, dlBox(size * 1.1, size * 0.35, size * 1.0), M.belly, 0, -size * 0.38, 0); // 肚
    if (i % 2 === 0) put(g, dlGeo('spike', () => new THREE.ConeGeometry(0.1, 0.32, 4)), M.horn, 0, size * 0.6, 0); // 背脊尖刺
    dragon.add(g);
    segs.push({ g, a, base: g.position.y });
  }
  // 尾巴尖（箭頭形）
  const TAIL_A = -Math.PI / 2 + 0.35 + Math.PI * 1.75 + 0.18;
  const tail = new THREE.Group();
  tail.position.set(Math.cos(TAIL_A) * R, 0.42, Math.sin(TAIL_A) * R);
  tail.rotation.y = -TAIL_A;
  const tip = put(tail, dlGeo('tailtip', () => new THREE.OctahedronGeometry(0.28, 0)), M.dark, 0, 0, 0.1);
  tip.scale.set(0.5, 0.35, 1.2);
  dragon.add(tail);

  // ---- 龍頭：擱喺前面左手邊，望住你（-z）----
  const neck = put(dragon, dlBox(0.55, 0.5, 0.7), M.scale, -0.55, 0.85, -1.62);
  neck.rotation.y = 0.3;
  const head = new THREE.Group();
  head.position.set(-0.75, 1.05, -2.0);
  dragon.add(head);
  put(head, dlBox(0.78, 0.55, 0.8), M.scale, 0, 0.05, 0); // 頭殼
  put(head, dlBox(0.6, 0.3, 0.6), M.scale, 0, 0.02, -0.6); // 上顎（鼻）
  const jaw = new THREE.Group(); // 下顎（會郁）
  jaw.position.set(0, -0.15, -0.15);
  head.add(jaw);
  put(jaw, dlBox(0.55, 0.16, 0.7), M.belly, 0, -0.06, -0.38);
  for (let t = 0; t < 4; t++) put(jaw, dlGeo('tooth', () => new THREE.ConeGeometry(0.04, 0.12, 4)), M.horn, -0.18 + t * 0.12, 0.06, -0.66);
  for (const sx of [-1, 1]) {
    const h1 = put(head, dlGeo('horn', () => new THREE.ConeGeometry(0.09, 0.62, 6)), M.horn, sx * 0.26, 0.48, 0.28);
    h1.rotation.set(0.9, 0, sx * -0.25); // 角向後
    put(head, dlBox(0.16, 0.12, 0.05), M.eye, sx * 0.22, 0.17, -0.41); // 發光眼
    put(head, dlBox(0.05, 0.11, 0.03), M.pupil, sx * 0.22, 0.17, -0.44); // 直瞳孔
    put(head, dlBox(0.07, 0.06, 0.04), M.dark, sx * 0.13, 0.08, -0.91); // 鼻孔
    put(head, dlGeo('frill', () => new THREE.ConeGeometry(0.12, 0.4, 4)), M.dark, sx * 0.42, 0.05, 0.2).rotation.z = sx * 1.2; // 腮邊尖
  }

  // ---- 蝙蝠翼（由背脊伸出嚟，慢慢張開又拍）----
  const wings = [-1, 1].map((sx) => {
    const p = new THREE.Group();
    p.position.set(sx * 1.25, 1.05, 0.9);
    p.scale.setScalar(0.72); // 唔好撞到隔籬部機
    dragon.add(p);
    put(p, dlGeo('wingbone', () => new THREE.BoxGeometry(1.7, 0.12, 0.12)), M.dark, sx * 0.78, 0.53, 0).rotation.z = sx * 0.6;
    // 三支「手指」骨 + 中間膜
    const elbow = new THREE.Vector3(sx * 1.55, 1.05, 0);
    const tips = [[1.35, 1.25], [1.6, 0.6], [1.45, -0.05]].map(([len, dy]) => new THREE.Vector3(elbow.x + sx * len, elbow.y + dy, 0));
    for (const end of tips) {
      const bone = put(p, dlGeo('finger', () => new THREE.BoxGeometry(1, 0.07, 0.07)), M.dark, (elbow.x + end.x) / 2, (elbow.y + end.y) / 2, 0);
      bone.scale.x = elbow.distanceTo(end);
      bone.rotation.z = Math.atan2(end.y - elbow.y, end.x - elbow.x);
      put(p, dlGeo('claw', () => new THREE.ConeGeometry(0.06, 0.2, 4)), M.horn, end.x, end.y, 0).rotation.z = -sx * Math.PI / 2;
    }
    // 翼膜：膊頭 → 手肘 → 三隻指尖 → 返去身
    const pts = [[0, 0], [elbow.x, elbow.y], ...tips.map((v) => [v.x, v.y]), [sx * 0.6, -0.4]];
    const shape = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
    put(p, dlGeo(`mem${sx}`, () => new THREE.ShapeGeometry(shape)), M.wing, 0, 0, 0.01);
    return { p, sx };
  });

  // ---- 前面一堆金幣同寶石 ----
  const coin = dlGeo('coin', () => new THREE.CylinderGeometry(0.11, 0.11, 0.03, 10));
  for (let i = 0; i < 26; i++) {
    const a = (i * 2.4) % (Math.PI * 2);
    const r = (i % 7) * 0.09;
    const c = put(dragon, coin, M.gold, 0.85 + Math.cos(a) * r, 0.04 + Math.floor(i / 7) * 0.05, -1.75 + Math.sin(a) * r);
    c.rotation.set(i * 0.6, 0, i * 0.3);
  }
  put(dragon, dlGeo('chest', () => new THREE.BoxGeometry(0.5, 0.32, 0.36)), M.gold, 1.25, 0.18, -1.45).rotation.y = -0.4; // 金箱
  [M.gemR, M.gemB, M.gemG, M.gemR].forEach((m, i) => {
    const gem = put(dragon, dlGeo('gem', () => new THREE.OctahedronGeometry(0.11, 0)), m, 0.55 + i * 0.22, 0.16, -1.95 + (i % 2) * 0.2);
    gem.scale.y = 1.5;
  });

  // ---- 玻璃罩入面嘅龍蛋（冇動物喺入面先見到）----
  const egg = new THREE.Group();
  egg.position.set(0, 1.15, 0);
  const shell = put(egg, dlGeo('egg', () => new THREE.SphereGeometry(0.36, 16, 12)), M.egg, 0, 0, 0);
  shell.scale.y = 1.3;
  for (let i = 0; i < 7; i++) {
    const a = i * 2.1;
    put(egg, dlGeo('eggspot', () => new THREE.SphereGeometry(0.06, 8, 6)), M.eggSpot, Math.cos(a) * 0.33, ((i % 3) - 1) * 0.22, Math.sin(a) * 0.33);
  }
  dragon.add(egg);

  // ---- 地下火光圈 ----
  const ring = put(dragon, dlGeo('firering', () => new THREE.TorusGeometry(1.45, 0.08, 8, 40)), M.lava, 0, 0.66, 0);
  ring.rotation.x = Math.PI / 2;

  // ---- 火星 + 鼻孔煙 ----
  const N = 34;
  const pos = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const embers = new THREE.Points(geo, dlMat('emberMat', () => new THREE.PointsMaterial({ color: 0xffab40, size: 0.13, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  embers.frustumCulled = false;
  dragon.add(embers);
  const smoke = [0, 1, 2, 3].map((i) => {
    const m = new THREE.Mesh(dlBox(0.22, 0.22, 0.22), M.smoke.clone()); // 每粒煙自己透明度
    m.castShadow = false;
    dragon.add(m);
    return { m, phase: i / 4 };
  });

  dragon.userData = { wings, head, jaw, segs, tail, tailA: TAIL_A, egg, pos, geo, smoke, lava: M.lava, eggMat: M.eggSpot };
  return dragon;
}

// 每格畫面郁龍穴（updateHub 叫）
function animateDragonLair(m, time) {
  const u = m.dragon.userData;
  const t = time + m.index * 1.3;
  // 翼：慢慢扇，間中大力張開
  const open = 0.5 + Math.sin(t * 0.7) * 0.5; // 0 收埋 → 1 張開
  for (const { p, sx } of u.wings) {
    p.rotation.z = sx * (-0.55 + open * 0.75 + Math.sin(t * 3.2) * 0.12);
    p.rotation.y = sx * (0.6 - open * 0.5);
  }
  // 頭：慢慢左右望，下顎一開一合
  u.head.rotation.y = Math.sin(t * 0.6) * 0.3;
  u.head.position.y = 1.05 + Math.sin(t * 1.4) * 0.03;
  u.jaw.rotation.x = Math.max(0, Math.sin(t * 1.1)) * 0.35;
  // 身：好似呼吸咁輕輕起伏；尾巴擺
  u.segs.forEach((s, i) => (s.g.position.y = s.base + Math.sin(t * 1.4 - i * 0.4) * 0.025));
  u.tail.rotation.y = -u.tailA + Math.sin(t * 2) * 0.35;
  // 火光、蛋（冇動物喺入面先出）
  u.lava.emissiveIntensity = 1.4 + Math.sin(time * 5) * 0.5;
  u.egg.visible = !m.inside;
  u.egg.rotation.y = time * 0.5;
  u.egg.position.y = 1.15 + Math.sin(t * 2) * 0.05;
  u.eggMat.emissiveIntensity = 1.4 + Math.sin(time * 3) * 0.8;
  for (let i = 0; i < u.pos.length / 3; i++) {
    const k = (time * 0.45 + i / 34) % 1;
    const a = i * 2.4 + time * 0.6;
    u.pos[i * 3] = Math.cos(a) * (1.3 + k * 0.6);
    u.pos[i * 3 + 1] = 0.7 + k * 3.0;
    u.pos[i * 3 + 2] = Math.sin(a) * (1.3 + k * 0.6);
  }
  u.geo.attributes.position.needsUpdate = true;
  // 鼻孔出煙（由頭前面向上飄）
  for (const s of u.smoke) {
    const k = (time * 0.6 + s.phase) % 1;
    s.m.position.set(-0.75 + Math.sin(k * 6) * 0.1, 1.1 + k * 1.3, -2.95 + k * 0.4);
    s.m.scale.setScalar(0.6 + k * 1.6);
    s.m.material.opacity = 0.55 * (1 - k);
  }
}

function buildMachine(scene, index, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  const metal = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.7, roughness: 0.3 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xec407a });
  add(g, new THREE.CylinderGeometry(1.3, 1.5, 0.6, 24), metal, 0, 0.3, 0);
  add(g, new THREE.CylinderGeometry(1.32, 1.32, 0.12, 24), pink, 0, 0.62, 0);
  const glass = add(g, new THREE.SphereGeometry(1.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xb3e5fc, transparent: true, opacity: 0.3, roughness: 0.05 }), 0, 0.65, 0);
  glass.castShadow = false;
  // 兩條喉
  for (const side of [-1, 1]) {
    add(g, new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), metal, side * 1.45, 1.1, 0.4);
    add(g, new THREE.SphereGeometry(0.18, 12, 8), pink, side * 1.45, 2.25, 0.4);
  }
  // ---- 升級裝飾 ----
  const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
  // Nature Growth：葉、爬藤、花、綠色光
  const nature = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const leaf = add(nature, new THREE.BoxGeometry(0.45, 0.06, 0.25), M(i % 2 ? 0x43a047 : 0x66bb6a), Math.cos(a) * 1.45, 0.2 + (i % 3) * 0.12, Math.sin(a) * 1.45);
    leaf.rotation.set(0.4, -a, 0);
  }
  for (const side of [-1, 1]) for (let k = 0; k < 5; k++) {
    add(nature, new THREE.BoxGeometry(0.22, 0.12, 0.12), M(0x2e7d32), side * 1.45 + side * 0.08 * (k % 2), 0.3 + k * 0.42, 0.4); // 爬藤
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    add(nature, new THREE.BoxGeometry(0.16, 0.16, 0.16), M([0xff4081, 0xffeb3b, 0xffffff][i % 3]), Math.cos(a) * 0.85, 1.55, Math.sin(a) * 0.85);
  }
  nature.visible = false;
  g.add(nature);
  // Mountain Magic：細雪山、紫水晶、魔法陣
  const mountain = new THREE.Group();
  for (const [a, h] of [[0.6, 1.6], [2.4, 1.2], [3.8, 1.9], [5.2, 1.3]]) {
    const px = Math.cos(a) * 1.9;
    const pz = Math.sin(a) * 1.9;
    add(mountain, new THREE.ConeGeometry(0.5, h, 5), M(0x6d6359, { flatShading: true }), px, h / 2, pz);
    add(mountain, new THREE.ConeGeometry(0.22, h * 0.3, 5), M(0xffffff, { flatShading: true }), px, h * 0.86, pz);
    add(mountain, new THREE.OctahedronGeometry(0.18), M(0xd1c4e9, { emissive: 0x7c4dff, emissiveIntensity: 2.2, flatShading: true }), px * 0.8, 0.3, pz * 0.8).scale.y = 1.8;
  }
  const rune = add(mountain, new THREE.RingGeometry(1.9, 2.1, 6), new THREE.MeshBasicMaterial({ color: 0xb388ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }), 0, 0.04, 0);
  rune.rotation.x = -Math.PI / 2;
  const orb = add(mountain, new THREE.OctahedronGeometry(0.3), M(0xe1bee7, { emissive: 0xb388ff, emissiveIntensity: 3 }), 0, 2.6, 0);
  mountain.visible = false;
  g.add(mountain);
  // La Combination：金皇冠環、兩條彩色 DNA 螺旋、兩粒轉嘅愛心寶石
  const combo = new THREE.Group();
  const goldM = M(0xffd54f, { metalness: 0.9, roughness: 0.2, emissive: 0xffa000, emissiveIntensity: 0.6 });
  const crown = add(combo, new THREE.TorusGeometry(1.55, 0.1, 8, 40), goldM, 0, 0.75, 0);
  crown.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    add(combo, new THREE.ConeGeometry(0.12, 0.35, 4), goldM, Math.cos(a) * 1.55, 0.98, Math.sin(a) * 1.55);
  }
  const helix = [];
  for (const side of [-1, 1]) for (let k = 0; k < 10; k++) {
    const dot = add(combo, new THREE.SphereGeometry(0.09, 8, 6), M(side > 0 ? 0xff4081 : 0x40c4ff, { emissive: side > 0 ? 0xff4081 : 0x40c4ff, emissiveIntensity: 2 }), 0, 0, 0);
    dot.castShadow = false;
    helix.push({ dot, side, k });
  }
  const gems = [-1, 1].map((s) => {
    const gem = add(combo, new THREE.OctahedronGeometry(0.22), M(0xff80ab, { emissive: 0xff4081, emissiveIntensity: 2.5 }), s * 0.6, 2.9, 0);
    gem.scale.y = 1.5;
    return gem;
  });
  combo.userData = { helix, gems };
  combo.visible = false;
  g.add(combo);
  // Dragon's Lair（小朋友 2026-10-17；之後話要重新設計）：見 buildDragonLair
  const dragon = buildDragonLair();
  dragon.visible = false;
  g.add(dragon);

  // 進度燈（綠色光圈）
  const light = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x000000, emissiveIntensity: 1.5 });
  const ring = add(g, new THREE.TorusGeometry(1.35, 0.07, 8, 40), light, 0, 0.62, 0);
  ring.rotation.x = Math.PI / 2;
  addCollider(x, z, 1.5);

  const sign = dynamicSign(2.8, 1.1);
  sign.mesh.position.set(x, 3.2, z);
  sign.mesh.rotation.y = Math.PI; // 面向 Hub 中間（-z）
  scene.add(sign.mesh);

  // 心心（做緊嘢時飄上去）
  const heartMat = new THREE.MeshBasicMaterial({ color: 0xff4081, transparent: true });
  const hearts = [];
  for (let i = 0; i < 4; i++) {
    const heart = add(g, new THREE.SphereGeometry(0.1, 8, 6), heartMat, 0, 0, 0);
    heart.visible = false;
    hearts.push({ heart, phase: i / 4 });
  }
  return { index, x, z, group: g, glass, sign, light, hearts, inside: null, insideName: null, nature, mountain, combo, dragon, rune, orb, pink };
}

export function machineStatus(i) {
  const m = state.machines[i];
  if (!m) return { kind: 'empty' };
  const left = (m.endsAt - Date.now()) / 1000;
  const name = m.second ? `${m.name} + ${m.second.name}` : m.name;
  if (left > 0) return { kind: 'working', name, first: m.name, left, total: m.total ?? REPRODUCE_SECONDS[m.biome] * rarityInfo(m.rarity).reproduce };
  return { kind: 'ready', name, first: m.name };
}

export function formatLeft(s) {
  s = Math.ceil(s);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
}

// ================= 地塊（有圍欄） =================

// 地塊位置喺 hubShape.js（hubPark.js 都要用）
export { PLOT };

function buildPlot(realScene) {
  const scene = new THREE.Group(); // 圍欄同草地先放埋一齊，最後焊埋做幾件（畫得快啲）
  const { minX, maxX, minZ, maxZ, gateZ, gateWidth } = PLOT;
  // 草地
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x66bb6a, map: plotGroundTexture(maxX - minX, maxZ - minZ), roughness: 0.95 }); // 皮膚會改佢顏色（紋理係灰白色，跟住染色；Issue #8）
  const grass = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, 0.06, maxZ - minZ), grassMat);
  grass.position.set((minX + maxX) / 2, 0.03, (minZ + maxZ) / 2);
  grass.receiveShadow = true;
  scene.add(grass);

  // 圍欄（小朋友 2026-10-19：要型啲）：圓角柱 + 底座 + 尖頂，三條橫木，四個角有發光寶石，閘口有拱門
  // 碰撞位置同以前一樣（每 1 米一條柱），皮膚換 wood／trim／gem 三隻顏色
  const wood = new THREE.MeshStandardMaterial({ color: 0xa1887f, roughness: 0.7 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.6 });
  const gem = new THREE.MeshStandardMaterial({ color: 0xfff176, emissive: 0xffd54f, emissiveIntensity: 1.4, flatShading: true });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.8 });
  const style = { post: wood, rail: wood, trim, h: 1.3, w: 0.26, cap: 'ball', rails: [0.32, 0.72, 1.08], railW: 0.09, railH: 0.12, vines: 0.35, leaf };
  const corners = [[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ]];
  const inGate = (x, z) => x === minX && Math.abs(z - gateZ) < gateWidth / 2;
  corners.forEach(([x1, z1], i) => {
    const [x2, z2] = corners[(i + 1) % 4];
    const length = Math.hypot(x2 - x1, z2 - z1);
    const steps = Math.round(length / 1.0);
    for (let s = 0; s <= steps; s++) {
      const x = x1 + ((x2 - x1) * s) / steps;
      const z = z1 + ((z2 - z1) * s) / steps;
      if (inGate(x, z)) continue; // 閘口
      const corner = s === 0;
      fencePost(scene, x, z, corner ? { ...style, w: 0.38, h: 1.55, gem } : style);
      addCollider(x, z, 0.4);
      // 同下一條柱之間嘅橫木
      if (s < steps) {
        const nx = x1 + ((x2 - x1) * (s + 1)) / steps;
        const nz = z1 + ((z2 - z1) * (s + 1)) / steps;
        if (inGate(nx, nz)) continue;
        fenceRails(scene, x, z, nx, nz, style);
      }
    }
  });

  // 閘口：兩條粗柱 + 圓拱 + 頂上寶石
  for (const dz of [-gateWidth / 2 - 0.2, gateWidth / 2 + 0.2]) {
    fencePost(scene, minX, gateZ + dz, { ...style, w: 0.42, h: 4.3, cap: 'ball', capMat: trim, gem });
  }
  archX(scene, minX, gateZ - gateWidth / 2 - 0.2, gateZ + gateWidth / 2 + 0.2, 4.35, trim, 0.16);
  const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), gem);
  crest.position.set(minX, 4.35 + gateWidth / 2 + 0.6, gateZ);
  crest.scale.y = 1.5;
  scene.add(crest);
  const sign = dynamicSign(4.2, 1.2);
  sign.mesh.position.set(minX, 3.4, gateZ);
  sign.mesh.rotation.y = -Math.PI / 2; // 面向 Hub 中間
  realScene.add(sign.mesh); // 牌會變字，唔焊
  bakeStatic(scene, realScene);
  const skins = buildPlotSkins(realScene);
  return { sign, pets: [], grassMat, wood, trim, gem, skins };
}

// ================= 地塊皮膚：每升一級換一個 =================
// ground = 地面、fence = 圍欄、deco = 嗰款獨有嘅裝飾
export const PLOT_SKINS = [
  { name: 'Grass Field', ground: 0x66bb6a, fence: 0xa1887f },
  { name: 'Flower Meadow', ground: 0x7cb342, fence: 0xf8bbd0, deco: 'flowers' },
  { name: 'Sandy Beach', ground: 0xf3d9a4, fence: 0xd7ccc8, deco: 'beach' },
  { name: 'Bamboo Garden', ground: 0x8bc34a, fence: 0x9e9d24, deco: 'bamboo' },
  { name: 'Snowy Yard', ground: 0xf5f9fc, fence: 0x90caf9, deco: 'snow' },
  { name: 'Candy Land', ground: 0xf8bbd0, fence: 0xffffff, deco: 'candy' },
  { name: 'Jungle', ground: 0x388e3c, fence: 0x5d4037, deco: 'jungle' },
  { name: 'Lava Rock', ground: 0x3e2723, fence: 0x212121, deco: 'lava' },
  { name: 'Crystal Cave', ground: 0x4a148c, fence: 0x80deea, deco: 'crystal' },
  { name: 'Golden Palace', ground: 0xfff3c4, fence: 0xffc107, deco: 'gold' },
  { name: 'Rainbow Paradise', ground: 0xb2ebf2, fence: 0xff4081, deco: 'rainbow' },
  { name: 'Royal Kingdom', ground: 0x4a2c6e, fence: 0xffc107, deco: 'royal' }, // 小朋友 2026-10-17：+2 隻位、錢 x1.5
];

function buildPlotSkins(scene) {
  const { minX, maxX, minZ, maxZ } = PLOT;
  const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
  const glow = (color, k = 2) => M(color, { emissive: color, emissiveIntensity: k });
  const groups = {};
  // 沿住圍欄內邊平均揀 14 個位（唔阻住中間啲寵物，閘口嗰邊留空）
  const spots = [];
  const inset = 0.9;
  const w = maxX - minX - inset * 2;
  const d = maxZ - minZ - inset * 2;
  const perimeter = 2 * (w + d);
  for (let i = 0; i < 18; i++) {
    let t = ((i + 0.5) / 18) * perimeter;
    let x;
    let z;
    if (t < w) [x, z] = [minX + inset + t, minZ + inset];
    else if ((t -= w) < d) [x, z] = [maxX - inset, minZ + inset + t];
    else if ((t -= d) < w) [x, z] = [maxX - inset - t, maxZ - inset];
    else [x, z] = [minX + inset, maxZ - inset - (t - w)];
    if (x < minX + 2 && Math.abs(z - PLOT.gateZ) < 3) continue; // 閘口
    spots.push([x, z]);
  }
  const make = (name, fill) => {
    const g = new THREE.Group();
    g.visible = false;
    spots.forEach(([x, z], i) => {
      const item = new THREE.Group();
      item.position.set(x, 0, z);
      fill(item, i);
      g.add(item);
    });
    scene.add(g);
    groups[name] = g;
  };
  const piece = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const petal = [0xff4081, 0xffeb3b, 0xffffff, 0xba68c8].map((c) => M(c));
  make('flowers', (g, i) => {
    for (let k = 0; k < 3; k++) {
      piece(g, new THREE.BoxGeometry(0.05, 0.5, 0.05), M(0x388e3c), k * 0.3 - 0.3, 0.25, 0);
      piece(g, new THREE.BoxGeometry(0.22, 0.22, 0.22), petal[(i + k) % 4], k * 0.3 - 0.3, 0.55, 0);
    }
  });
  make('beach', (g, i) => {
    if (i % 3 === 0) {
      piece(g, new THREE.CylinderGeometry(0.12, 0.16, 2.6, 6), M(0x8d6e63), 0, 1.3, 0);
      for (let k = 0; k < 5; k++) piece(g, new THREE.BoxGeometry(1.4, 0.06, 0.35), M(0x43a047), 0, 2.6, 0).rotation.y = (k / 5) * Math.PI;
    } else piece(g, new THREE.OctahedronGeometry(0.2), M(i % 2 ? 0xff8a65 : 0xfff59d), 0, 0.15, 0).scale.y = 0.5; // 貝殼
  });
  make('bamboo', (g) => {
    for (let k = 0; k < 3; k++) piece(g, new THREE.BoxGeometry(0.14, 2 + k * 0.6, 0.14), M(0x9ccc65), k * 0.25 - 0.25, 1 + k * 0.3, 0);
  });
  make('snow', (g, i) => {
    if (i % 3 === 0) {
      piece(g, new THREE.BoxGeometry(0.7, 0.7, 0.7), M(0xffffff), 0, 0.35, 0); // 雪人
      piece(g, new THREE.BoxGeometry(0.5, 0.5, 0.5), M(0xffffff), 0, 0.95, 0);
      piece(g, new THREE.BoxGeometry(0.08, 0.08, 0.25), M(0xff9800), 0, 0.95, -0.3);
    } else piece(g, new THREE.ConeGeometry(0.4, 1.2, 5), M(0x2e7d32), 0, 0.6, 0);
  });
  make('candy', (g, i) => {
    piece(g, new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), M(0xffffff), 0, 0.6, 0);
    piece(g, new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16), M([0xff4081, 0x40c4ff, 0xffeb3b][i % 3]), 0, 1.25, 0).rotation.x = Math.PI / 2; // 波板糖
  });
  make('jungle', (g) => {
    for (let k = 0; k < 4; k++) piece(g, new THREE.BoxGeometry(0.9, 0.05, 0.4), M(0x2e7d32), 0, 0.4 + k * 0.15, 0).rotation.set(0.5, (k / 4) * Math.PI * 2, 0); // 大葉
  });
  make('lava', (g, i) => {
    if (i % 2) piece(g, new THREE.CylinderGeometry(0.5, 0.55, 0.06, 10), glow(0xff6d00, 2.5), 0, 0.07, 0);
    else piece(g, new THREE.DodecahedronGeometry(0.45, 0), M(0x212121, { flatShading: true }), 0, 0.3, 0);
  });
  make('crystal', (g, i) => {
    const c = piece(g, new THREE.OctahedronGeometry(0.35), glow([0x18ffff, 0xe040fb, 0x7c4dff][i % 3], 1.8), 0, 0.5, 0);
    c.scale.y = 2;
  });
  make('gold', (g, i) => {
    piece(g, new THREE.BoxGeometry(0.35, 1.8, 0.35), M(0xffc107, { metalness: 0.9, roughness: 0.2 }), 0, 0.9, 0);
    if (i % 2) piece(g, new THREE.SphereGeometry(0.25, 12, 8), glow(0xfff59d, 1.5), 0, 2.0, 0);
  });
  make('rainbow', (g, i) => {
    piece(g, new THREE.SphereGeometry(0.3, 12, 8), glow([0xff1744, 0xff9100, 0xffea00, 0x00e676, 0x2979ff, 0xd500f9][i % 6], 1.2), 0, 0.6, 0);
  });
  // Royal Kingdom：金柱 + 皇冠 + 紅色旗
  const royalGold = M(0xffc107, { metalness: 0.95, roughness: 0.2, emissive: 0x5d3a00, emissiveIntensity: 0.4 });
  make('royal', (g, i) => {
    piece(g, new THREE.CylinderGeometry(0.18, 0.24, 2.2, 8), royalGold, 0, 1.1, 0);
    piece(g, new THREE.CylinderGeometry(0.3, 0.3, 0.12, 8), royalGold, 0, 2.25, 0);
    if (i % 2) {
      for (let k = 0; k < 5; k++) piece(g, new THREE.ConeGeometry(0.06, 0.22, 4), royalGold, Math.cos((k / 5) * Math.PI * 2) * 0.22, 2.42, Math.sin((k / 5) * Math.PI * 2) * 0.22);
      piece(g, new THREE.SphereGeometry(0.1, 10, 8), glow(0xe040fb, 2), 0, 2.45, 0);
    } else piece(g, new THREE.BoxGeometry(0.04, 0.8, 0.5), M(0xc62828), 0, 1.6, 0.27); // 紅色旗
  });
  // 彩虹拱門（Rainbow Paradise 先有）
  const arch = new THREE.Group();
  [0xff1744, 0xff9100, 0xffea00, 0x00e676, 0x2979ff, 0xd500f9].forEach((c, i) => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(5 - i * 0.3, 0.15, 6, 32, Math.PI), glow(c, 1));
    arch.add(band);
  });
  arch.position.set((minX + maxX) / 2, 0, maxZ - 0.5);
  groups.rainbow.add(arch);
  return groups;
}

// 套用地塊皮膚（plotLevel 0–10）
export function applyPlotSkin(hub, level = state.plotLevel) {
  const skin = PLOT_SKINS[Math.min(level, PLOT_SKINS.length - 1)];
  hub.plot.grassMat.color.setHex(skin.ground);
  hub.plot.wood.color.setHex(skin.fence);
  // 飾邊：淺色圍欄配深色邊、深色圍欄配淺色邊；寶石跟每款皮膚
  const c = new THREE.Color(skin.fence);
  const hsl = c.getHSL({});
  hub.plot.trim.color.copy(c).offsetHSL(0, 0, hsl.l > 0.45 ? -0.28 : 0.22);
  const GEMS = { flowers: 0xff80ab, beach: 0x4dd0e1, bamboo: 0xc6ff00, snow: 0x80d8ff, candy: 0xff4081, jungle: 0x76ff03, lava: 0xff6d00, crystal: 0xea80fc, gold: 0xffd740, rainbow: 0x18ffff, royal: 0xffd740 };
  const g = GEMS[skin.deco] ?? 0xfff176;
  hub.plot.gem.color.setHex(g);
  hub.plot.gem.emissive.setHex(g);
  for (const [name, g] of Object.entries(hub.plot.skins)) g.visible = name === skin.deco;
  return skin;
}

// 寵物喺地塊入面：行路嘅喺草地行；識飛嘅雀同海洋動物喺上面飛圈（小朋友話魚都要飛！）
function addPetToPlot(plot, scene, pet) {
  const model = buildAnimalModel(findAnimal(pet.name));
  const move = model.userData.move === 'walk' ? 'walk' : 'fly'; // 游水嘅都飛
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  // 用返真實大細（之前縮到最多 2.4 米，大象變到好細），再跟重量放大縮細；
  // 只有超大嘅（例如藍鯨）先縮到地塊放得落
  applyPetSkin(model, state.petSkin); // 寵物皮膚
  const maxDim = Math.max(size.x, size.y, size.z);
  const giant = pet.sizeMul || 1; // La Combination 變大嘅寵物
  // 普通寵物最大 7 米；巨型寵物（GIANT／BIG PET FRENZY）可以大到 60 米（同野生動物一樣）
  model.scale.multiplyScalar(Math.min(kgScale(pet) * giant * Math.min(1, 7 / maxDim), (giant > 1 ? 60 : 20) / maxDim));
  if (model.userData.move === 'fly') model.userData.flying = true;
  const g = new THREE.Group();
  // 🙃 倒轉：包多層；火圈加喺外層，火焰照樣向上
  let body = model;
  if (pet.flipped) {
    body = new THREE.Group();
    body.add(flipUpsideDown(model));
    body.userData.noFireAura = model.userData.noFireAura; // Royal Skywhale 唔要火圈
  }
  for (const m of mutationList(pet)) addFireAura(body, m); // 🔥 Fire：一圈火；🌑 Eclipse：黑紫火 + 白光環（可以兩樣都有）
  g.add(body);
  const kg = kgOf(pet);
  const rarity = rarityInfo(pet.rarity);
  const label = makeLabel([
    { text: pet.name },
    { text: `${pet.flipped ? '🙃 ' : ''}${mutationList(pet).length ? `${mutationText(pet)} · ` : ''}${sizeText(pet.sizeMul) ? `${rarity.name} · ${sizeText(pet.sizeMul)}` : rarity.name}`, color: mutationList(pet).length ? mutationInfo(mutationList(pet)[0]).color : pet.sizeMul ? '#ff9100' : rarity.color },
    { text: `${formatKg(kg)} · $${fmt(itemMoney(pet))}/s`, color: '#76ff03' },
  ], 0.8);
  label.position.y = new THREE.Box3().setFromObject(model).max.y + 0.7;
  // 稀有度光圈（小朋友 2026-10-17 Issue #3：寵物要型啲）：Rare 藍、Epic 紫、Legendary 金、Mythic 粉紅；Legendary 以上仲有閃粉
  let aura = null;
  if (pet.rarity && pet.rarity !== 'Common') {
    const box = new THREE.Box3().setFromObject(model);
    const r = Math.max(0.8, Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.6);
    const color = new THREE.Color(rarity.color);
    aura = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.85, r, 40), ringMat);
    ring.rotation.x = -Math.PI / 2;
    aura.add(ring);
    const inner = new THREE.Mesh(new THREE.RingGeometry(r * 0.4, r * 0.48, 6), ringMat);
    inner.rotation.x = -Math.PI / 2;
    aura.add(inner);
    if (pet.rarity === 'Legendary' || pet.rarity === 'Mythic') {
      const n = 14;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        pos[i * 3] = Math.cos(a) * r * 0.9;
        pos[i * 3 + 1] = (i % 5) * 0.3 * (box.max.y - box.min.y) * 0.25;
        pos[i * 3 + 2] = Math.sin(a) * r * 0.9;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const sparkle = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.18, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sparkle.userData.rise = (box.max.y - box.min.y) * 1.1;
      aura.add(sparkle);
      aura.userData.sparkle = sparkle;
    }
    aura.position.y = 0.06;
    g.add(aura);
  }
  g.add(label);
  const spot = randomPlotSpot();
  g.position.set(spot.x, 0, spot.z);
  scene.add(g);
  plot.pets.push({
    pet, group: g, model, move, aura, target: randomPlotSpot(), wait: Math.random() * 3,
    // 飛圈用
    angle: Math.random() * Math.PI * 2, radius: 3 + Math.random() * 4, height: 4 + Math.random() * 3, speed: 0.4 + Math.random() * 0.4,
  });
}

function randomPlotSpot() {
  return {
    x: PLOT.minX + 2 + Math.random() * (PLOT.maxX - PLOT.minX - 4),
    z: PLOT.minZ + 2 + Math.random() * (PLOT.maxZ - PLOT.minZ - 4),
  };
}

export function moneyPerSecond() {
  // Pet Frenzy ×10；Royal Kingdom 地塊 ×1.5
  return state.pets.filter((p) => p.onPlot).reduce((sum, p) => sum + itemMoney(p), 0) * boost.money * plotMoneyMulti(state.plotLevel);
}

// ================= 圖鑑檯 =================

// ================= 起晒成個 Hub =================

export function createHub(scene) {
  const treadmill = buildTreadmill(scene, -25, 6.5);
  const table = buildStudentTable(scene, -14, 5.5);
  addUpgradeSign(scene, treadmill, -21, 11.5);
  addUpgradeSign(scene, table, -10, 11.5);
  const stations = [treadmill, table];
  for (const st of stations) state[st.levelKey] = Math.min(state[st.levelKey], MAX_TRAINING_LEVEL); // 舊存檔可能超過最高級
  stations.forEach((s) => applyTier(s));

  const machines = [-16, -8, 0, 8, 16].map((x, i) => buildMachine(scene, i, x, 40)); // 噴水池下面一排
  const plot = buildPlot(scene);
  // 舊存檔：地塊上面嘅寵物多過位數，就淨係留最好嗰啲
  const onPlot = state.pets.filter((p) => p.onPlot).sort((a, b) => itemMoney(b) - itemMoney(a));
  onPlot.slice(plotSlots(state.plotLevel)).forEach((p) => (p.onPlot = false));
  state.pets.filter((p) => p.onPlot).forEach((p) => addPetToPlot(plot, scene, p));
  // 魔法圖書館（Index）喺噴水池左邊，面向噴水池
  const library = buildMagicLibrary(scene, -25, 25, Math.PI / 2);
  const kiosk = library.spot;
  applyPlotSkin({ plot });

  // ---- 2026-10-18 Hub 重新排位（小朋友：rearrange everything）----
  //   上面：左 🏃 Training Zone、中 入口、右 🛍️ Shop Street（Skin Shop + Sell Stall）
  //   中間：左 ✨ Magic Library ── 噴水池 ── 右 🐾 Pets Zone（地塊 + MY PETS 牌 + 地塊升級牌）
  //   下面：💗 Breeding Lab（5 部繁殖機 + 升級牌）+ 🧪 Fuse Machine
  //   最底：Owner's Garden、Playground、大門
  // 地塊升級牌（閘口上面）
  const plotSign = dynamicSign(2.6, 1.6);
  const plotSignGroup = signOnPosts(plotSign.mesh, 2.6, 1.6, 2.0);
  plotSignGroup.position.set(PLOT.minX - 1.5, 0, PLOT.gateZ - 4.5);
  plotSignGroup.rotation.y = -Math.PI / 2;
  scene.add(plotSignGroup);
  addCollider(PLOT.minX - 1.5, PLOT.gateZ - 4.5, 0.4);
  const plotUpgradeSpot = { x: PLOT.minX - 3, z: PLOT.gateZ - 4.5, sign: plotSign };

  // 繁殖機升級牌（機嘅左邊）
  const machineSign = dynamicSign(2.6, 1.7);
  const machineSignGroup = signOnPosts(machineSign.mesh, 2.6, 1.7, 2.0);
  machineSignGroup.position.set(-23.5, 0, 40);
  machineSignGroup.rotation.y = Math.PI;
  scene.add(machineSignGroup);
  addCollider(-23.5, 40, 0.4);
  const machineUpgradeSpot = { x: -23.5, z: 38, sign: machineSign };

  // ---- 皮膚商店攤位（間條帳篷 + 櫃枱 + 公仔模特兒）----
  // 入口前面（小朋友 2026-10-15）：右邊皮膚商店、左邊賣寵物攤位，面向中間條路
  // 2026-10-18：搬去右上 🛍️ Shop Street，兩個攤位排排企、面向噴水池（+z）
  // 2026-10-21：加 💾 Save Stall（Issue #8），三個攤位排排企
  const shopSpot = buildSkinShop(scene, 10.6, 4.8, Math.PI);
  const sellStall = buildSellStall(scene, 17.3, 4.8, 0);
  const saveStall = buildSaveStall(scene, 24, 4.8, 0);

  // 「MY PETS」牌：2026-10-18 小朋友叫刪走（改用右邊 🐾 掣，入面有「All my pets」）
  const petsBoardSpot = null;

  const hub = { scene, stations, machines, plot, kiosk, sellSpot: sellStall.spot, saveSpot: saveStall.spot, animators: [library.update, sellStall.update, saveStall.update], petsBoardSpot, plotUpgradeSpot, machineUpgradeSpot, shopSpot, moneyTimer: 0, trainTimer: 0 };
  applyMachineLevel(hub);
  return hub;
}

// 玩家企喺邊個訓練區（冇就 null）
export function trainingStationAt(hub, px, pz) {
  return hub.stations.find((s) => s.inZone(px, pz)) || null;
}

// 每格畫面：訓練、賺錢、機器倒數、寵物行路、動畫
// 回傳 { trained: { station, amount } | null, earned: number }
export function updateHub(hub, dt, time, px, pz) {
  const result = { trained: null, earned: 0 };
  for (const update of hub.animators) update(dt, time); // 圖書館、攤位嘅小動畫

  // 訓練：每秒加一次
  const station = trainingStationAt(hub, px, pz);
  hub.trainTimer = station ? hub.trainTimer + dt : 0;
  if (station && hub.trainTimer >= 1) {
    hub.trainTimer -= 1;
    const amount = trainingGain(state[station.levelKey], station.statKey) * boost.train; // Training No Mercy ×100
    state[station.statKey] += amount;
    result.trained = { station, amount };
    station.infernoBurstAt = time; // Inferno：練到嘢就爆一圈火
  }

  // 地塊賺錢：每秒一次
  hub.moneyTimer += dt;
  if (hub.moneyTimer >= 1) {
    hub.moneyTimer -= 1;
    result.earned = moneyPerSecond();
    state.money += result.earned;
  }

  // 設施動畫
  for (const s of hub.stations) {
    if (s.beltTexture) s.beltTexture.offset.y -= dt * (1 + state[s.levelKey] * 0.3);
    if (s.video) s.video.update(dt, Math.hypot(px - s.x, pz - s.z) < 18);
    if (s.globe) s.globe.rotation.y = time * 0.5;
    s.ringMat.opacity = 0.3 + Math.sin(time * 2) * 0.15; // 光圈慢慢呼吸
    s.sparkles.rotation.y = time * 0.3;
    s.sparkles.position.y = Math.sin(time) * 0.2;
    s.playerLocal = { x: px - s.x, z: pz - s.z, on: s.inZone(px, pz) }; // Inferno BB 火龍要知你喺邊
    animateExtras(s, time);
    drawUpgradeSign(s);
  }

  // 夜晚：繁殖機 10 倍速（小朋友 2026-10-11）——每秒額外扣 9 秒
  if (hub.night && dt > 0) {
    for (const rec of state.machines) if (rec && rec.endsAt > Date.now()) rec.endsAt -= dt * 9000;
  }
  // Eclipse 活動：繁殖機 ×20（每秒額外扣 19 秒；夜晚會再疊埋）
  if (boost.machine > 1 && dt > 0) {
    for (const rec of state.machines) if (rec && rec.endsAt > Date.now()) rec.endsAt -= dt * 1000 * (boost.machine - 1);
  }

  // 繁殖機
  for (const m of hub.machines) {
    const status = machineStatus(m.index);
    // 入面放住嘅動物模型
    const name = status.kind === 'empty' ? null : status.first;
    if (name !== m.insideName) {
      if (m.inside) m.group.remove(m.inside);
      m.inside = null;
      m.insideName = name;
      if (name) {
        const model = buildAnimalModel(findAnimal(name));
        const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
        model.scale.multiplyScalar(1.3 / Math.max(size.x, size.y, size.z));
        model.position.y = 0.7;
        m.group.add(model);
        m.inside = model;
      }
    }
    if (m.inside) {
      m.inside.rotation.y = time * 0.8;
      m.inside.userData.animate(time, 0);
    }

    if (status.kind === 'empty') {
      m.light.color.setHex(0x333333);
      m.light.emissive.setHex(0x000000);
      m.sign.draw(THEMES.dark, [
        { text: `REPRODUCE MACHINE ${m.index + 1}`, size: 0.2, color: '#f8bbd0' },
        { text: 'Empty', size: 0.22 },
      ]);
    } else if (status.kind === 'working') {
      const progress = 1 - status.left / status.total;
      m.light.color.setHex(0xffeb3b);
      m.light.emissive.setHex(0xffc400);
      m.light.emissiveIntensity = 0.8 + Math.sin(time * 6) * 0.5;
      m.sign.draw(THEMES.pink, [
        { text: status.name, size: 0.2 },
        { text: `${formatLeft(status.left)} left · ${Math.floor(progress * 100)}%${hub.night ? ' · 🌙x10' : ''}${boost.machine > 1 ? ` · 🌑x${boost.machine}` : ''}`, size: 0.22, color: hub.night ? '#b388ff' : '#ffeb3b' },
      ]);
    } else {
      m.light.color.setHex(0x00e676);
      m.light.emissive.setHex(0x00e676);
      m.light.emissiveIntensity = 1.5;
      m.sign.draw(THEMES.green, [
        { text: `${status.name} is READY!`, size: 0.2 },
        { text: 'Press E to collect', size: 0.2, color: '#ffff8d' },
      ]);
    }
    m.hearts.forEach((h) => {
      h.heart.visible = status.kind === 'working';
      const t = (time * 0.5 + h.phase) % 1;
      h.heart.position.set(Math.sin(t * 9 + h.phase * 6) * 0.5, 0.9 + t * 1.8, Math.cos(h.phase * 6) * 0.5);
      h.heart.material.opacity = 1 - t;
    });
  }

  // 地塊：寵物行嚟行去 + 牌
  const plotCenterX = (PLOT.minX + PLOT.maxX) / 2;
  const plotCenterZ = (PLOT.minZ + PLOT.maxZ) / 2;
  for (const p of hub.plot.pets) {
    if (p.aura) {
      p.aura.rotation.y = time * 0.8;
      p.aura.visible = p.move !== 'fly' || p.group.position.y < 1; // 飛緊嘅唔使地上光圈
      const sp = p.aura.userData.sparkle;
      if (sp) {
        const arr = sp.geometry.attributes.position.array;
        for (let i = 0; i < arr.length / 3; i++) arr[i * 3 + 1] = ((time * 0.5 + i / 7) % 1) * sp.userData.rise;
        sp.geometry.attributes.position.needsUpdate = true;
      }
    }
    if (p.move === 'fly') {
      // 喺地塊上面飛圈圈
      p.angle += dt * p.speed;
      p.group.position.set(
        plotCenterX + Math.cos(p.angle) * p.radius,
        p.height + Math.sin(time * 1.3 + p.radius) * 0.5,
        plotCenterZ + Math.sin(p.angle) * p.radius,
      );
      p.group.rotation.y = Math.PI - p.angle; // 頭向住飛緊嘅方向
      p.model.userData.animate(time, 1);
      continue;
    }
    p.model.userData.animate(time, p.wait > 0 ? 0 : 1);
    if (p.wait > 0) {
      p.wait -= dt;
      continue;
    }
    const dx = p.target.x - p.group.position.x;
    const dz = p.target.z - p.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.2) {
      p.target = randomPlotSpot();
      p.wait = 1 + Math.random() * 4;
      continue;
    }
    p.group.position.x += (dx / dist) * dt * 1.2;
    p.group.position.z += (dz / dist) * dt * 1.2;
    p.group.rotation.y = Math.atan2(-dx, -dz);
  }
  const onPlot = petsOnPlot();
  hub.plot.sign.draw(THEMES.green, [
    { text: 'MY PLOT', size: 0.34, color: '#fff59d' },
    { text: `${onPlot}/${plotSlots(state.plotLevel)} pets · $${fmt(moneyPerSecond())} / sec`, size: 0.26 },
  ]);
  const lv = MACHINE_LEVELS[state.machineLevel - 1];
  const nextLv = MACHINE_LEVELS[state.machineLevel];
  hub.machineUpgradeSpot.sign.draw(THEMES.pink, [
    { text: 'MACHINE UPGRADE', size: 0.14, color: '#fff59d' },
    { text: `Lv ${state.machineLevel} · ${lv.name}`, size: 0.12 },
    { text: lv.timeFactor < 1 ? `${Math.round((1 - lv.timeFactor) * 100)}% faster` : 'Normal speed', size: 0.11, color: '#b9f6ca' },
    nextLv
      ? { text: `Next: ${nextLv.name} $${fmt(nextLv.cost)}`, size: 0.1, color: state.money >= nextLv.cost ? '#69f0ae' : '#ffcdd2' }
      : { text: '★ MAX ★', size: 0.13, color: '#ffd54f' },
    { text: nextLv ? 'Press E' : 'You did it!', size: 0.09, color: '#f8bbd0' },
  ]);
  for (const m of hub.machines) {
    if (m.dragon.visible) animateDragonLair(m, time);
    if (m.mountain.visible) {
      m.rune.rotation.z = time * 0.6;
      m.orb.position.y = 2.6 + Math.sin(time * 2 + m.index) * 0.2;
      m.orb.rotation.y = time * 2;
    }
    if (m.nature.visible) m.nature.rotation.y = Math.sin(time * 0.8 + m.index) * 0.05;
    if (m.combo.visible) {
      m.combo.userData.helix.forEach(({ dot, side, k }) => {
        const a = time * 2 + k * 0.6 + (side > 0 ? Math.PI : 0);
        dot.position.set(Math.cos(a) * 1.3, 0.8 + k * 0.22, Math.sin(a) * 1.3);
      });
      m.combo.userData.gems.forEach((gem, i) => {
        const a = time * 1.5 + i * Math.PI;
        gem.position.set(Math.cos(a) * 0.7, 2.9 + Math.sin(time * 3 + i) * 0.15, Math.sin(a) * 0.7);
        gem.rotation.y = time * 3;
      });
    }
  }

  const maxedPlot = state.plotLevel >= PLOT_MAX_UPGRADES;
  hub.plotUpgradeSpot.sign.draw(THEMES.dark, [
    { text: 'BIGGER PLOT', size: 0.15, color: '#ffd54f' },
    { text: `Skin: ${PLOT_SKINS[state.plotLevel].name}`, size: 0.11, color: '#80deea' },
    { text: `Pets: ${plotSlots(state.plotLevel)} (max ${plotSlots(PLOT_MAX_UPGRADES)})${plotMoneyMulti(state.plotLevel) > 1 ? ` · 👑 x${plotMoneyMulti(state.plotLevel)} money` : ''}`, size: 0.11 },
    maxedPlot
      ? { text: '★ MAX ★', size: 0.15, color: '#ffd54f' }
      : { text: `${state.plotLevel + 1 === PLOT_ROYAL_LEVEL ? `👑 +${PLOT_ROYAL_SLOTS} pets & x${PLOT_ROYAL_MONEY} money` : '+1 pet'}: $${fmt(plotUpgradeCost(state.plotLevel))}`, size: 0.14, color: state.money >= plotUpgradeCost(state.plotLevel) ? '#69f0ae' : '#ff8a80' },
    { text: maxedPlot ? 'Full size!' : 'Press E', size: 0.11, color: '#cfd8dc' },
  ]);

  return result;
}

// ================= 互動（E 掣） =================
// 回傳 { dist, prompt, action? } 或者 null。selected：快捷欄揀咗嘅嘢

export function hubInteraction(hub, px, pz, selected, actions) {
  const options = [];
  const near = (x, z) => Math.hypot(px - x, pz - z);

  // 升級牌
  for (const s of hub.stations) {
    const d = near(s.sign.x, s.sign.z);
    if (d > INTERACT_DISTANCE) continue;
    const level = state[s.levelKey];
    const cost = upgradeCost(level);
    if (level >= MAX_TRAINING_LEVEL) {
      options.push({ dist: d, prompt: `★ ${s.name} is MAX level: ${TIERS[tierOf(level)].name}!` });
    } else if (state.money >= cost) {
      options.push({ dist: d, prompt: `<kbd>E</kbd> Upgrade ${s.name} to Level ${level + 1} for $${fmt(cost)}`, action: () => actions.upgrade(s) });
    } else {
      options.push({ dist: d, prompt: `💰 Need $${fmt(cost)} to upgrade (you have $${fmt(state.money)}) - put pets on your Plot!` });
    }
  }

  // 繁殖機
  for (const m of hub.machines) {
    const d = near(m.x, m.z);
    if (d > INTERACT_DISTANCE + 0.8) continue;
    const status = machineStatus(m.index);
    if (status.kind === 'empty') {
      const item = selected?.kind === 'rescued' ? selected.item : state.borrowed[0];
      const second = item && secondFor(item);
      if (item) options.push({ dist: d, prompt: `<kbd>E</kbd> Put ${item.name}${second ? ` + ${second.name}` : ''} in the Reproduce Machine`, action: () => actions.fillMachine(m, item) });
      else options.push({ dist: d, prompt: 'This machine is empty - rescue an animal from a biome first!' });
    } else if (status.kind === 'working') {
      const rec = state.machines[m.index];
      const lv = MACHINE_LEVELS[state.machineLevel - 1];
      const wait = Math.ceil(((rec.quizReadyAt || 0) - Date.now()) / 1000);
      if (lv.quiz && wait <= 0) options.push({ dist: d, prompt: `🐉 ${status.name}: ${formatLeft(status.left)} left · <kbd>E</kbd> Answer a question to SPEED UP!`, action: () => actions.speedUpMachine(m) });
      else if (lv.quiz) options.push({ dist: d, prompt: `🐉 ${status.name}: ${formatLeft(status.left)} left · next question in ${wait}s` });
      else options.push({ dist: d, prompt: `💗 ${status.name}: ${formatLeft(status.left)} left` });
    } else {
      options.push({ dist: d, prompt: `<kbd>E</kbd> Collect your ${status.name}!`, action: () => actions.collect(m) });
    }
  }

  // 地塊閘口
  const gate = near(PLOT.minX, PLOT.gateZ);
  if (gate < INTERACT_DISTANCE + 1) {
    const pet = selected?.kind === 'pet' ? selected.item : state.pets.find((p) => !p.onPlot);
    const used = petsOnPlot();
    const slots = plotSlots(state.plotLevel);
    if (pet && used >= slots) options.push({ dist: gate, prompt: `🚫 Plot full (${used}/${slots})! Upgrade your Plot or unequip a pet with the 🐾 button (B)` });
    else if (pet) options.push({ dist: gate, prompt: `<kbd>E</kbd> Put ${pet.name} on your Plot (${used}/${slots})`, action: () => actions.placePet(pet) });
    else options.push({ dist: gate, prompt: `Plot: ${used}/${slots} pets. Get pets from the Reproduce Machines!` });
  }

  // 繁殖機升級牌
  const mu = near(hub.machineUpgradeSpot.x, hub.machineUpgradeSpot.z);
  if (mu < INTERACT_DISTANCE) {
    const next = MACHINE_LEVELS[state.machineLevel];
    if (!next) options.push({ dist: mu, prompt: `★ Reproduce Machines are MAX level: ${MACHINE_LEVELS[MACHINE_LEVELS.length - 1].name}!` });
    else if (state.money >= next.cost) options.push({ dist: mu, prompt: `<kbd>E</kbd> Upgrade all machines to ${next.name} (${Math.round((1 - next.timeFactor) * 100)}% faster) for $${fmt(next.cost)}`, action: actions.upgradeMachines });
    else options.push({ dist: mu, prompt: `💰 Need $${fmt(next.cost)} to upgrade the Reproduce Machines` });
  }

  // 地塊升級牌
  const pu = near(hub.plotUpgradeSpot.x, hub.plotUpgradeSpot.z);
  if (pu < INTERACT_DISTANCE) {
    const cost = plotUpgradeCost(state.plotLevel);
    if (state.plotLevel >= PLOT_MAX_UPGRADES) options.push({ dist: pu, prompt: `★ Your Plot is MAX size: ${plotSlots(state.plotLevel)} pets!` });
    else if (state.money >= cost) options.push({ dist: pu, prompt: state.plotLevel + 1 === PLOT_ROYAL_LEVEL ? `<kbd>E</kbd> 👑 Upgrade to the ROYAL KINGDOM: +${PLOT_ROYAL_SLOTS} pets & x${PLOT_ROYAL_MONEY} money for $${fmt(cost)}` : `<kbd>E</kbd> Upgrade Plot to ${plotSlots(state.plotLevel) + 1} pets for $${fmt(cost)}`, action: actions.upgradePlot });
    else options.push({ dist: pu, prompt: `💰 Need $${fmt(cost)} to make your Plot bigger` });
  }

  // 皮膚商店
  const sh = near(hub.shopSpot.x, hub.shopSpot.z);
  if (sh < INTERACT_DISTANCE + 0.8) options.push({ dist: sh, prompt: `<kbd>E</kbd> Open the Skin Shop (🎟️ ${state.tokens} tokens)`, action: actions.openShop });

  // Fuse Machine（Issue #4）
  const fu = near(fuseMachine.spot.x, fuseMachine.spot.z);
  if (fu < INTERACT_DISTANCE + 1) {
    if (isFuseOpen()) options.push({ dist: fu, prompt: '<kbd>E</kbd> Open the Fuse Machine 🧪 (fuse 3 pets into 1)', action: actions.openFuse });
    else options.push({ dist: fu, prompt: `🔒 The Fuse Machine opens on ${openDateText()} (in ${daysUntilOpen()} day${daysUntilOpen() === 1 ? '' : 's'}) - or find the secret 🔴 button under a bridge!` });
  }

  // 賣寵物攤位
  const se = near(hub.sellSpot.x, hub.sellSpot.z);
  if (se < INTERACT_DISTANCE + 0.8) options.push({ dist: se, prompt: '<kbd>E</kbd> Open the Sell Stall 💰', action: actions.openSell });

  // 💾 存檔攤位
  const sv = near(hub.saveSpot.x, hub.saveSpot.z);
  if (sv < INTERACT_DISTANCE + 0.8) options.push({ dist: sv, prompt: '<kbd>E</kbd> 💾 Save your progress', action: actions.saveProgress });

  // MY PETS 牌


  // 圖鑑檯
  const k = near(hub.kiosk.x, hub.kiosk.z);
  if (k < INTERACT_DISTANCE + 0.8) options.push({ dist: k, prompt: '<kbd>E</kbd> Open the Magic Library (Animal Index) 📖', action: actions.openIndex });

  options.sort((a, b) => a.dist - b.dist);
  return options[0] || null;
}

// ---- 動作 ----

export function upgradeStation(station) {
  const level = state[station.levelKey];
  const cost = upgradeCost(level);
  if (state.money < cost || level >= MAX_TRAINING_LEVEL) return null;
  const oldTier = tierOf(level);
  state.money -= cost;
  state[station.levelKey] = level + 1;
  applyTier(station);
  const newTier = tierOf(level + 1);
  return { level: level + 1, newTierName: newTier > oldTier ? TIERS[newTier].name : null };
}

// 繁殖要幾耐（秒）：生態區 × 稀有度 × 繁殖機等級
export const reproduceSeconds = (item) =>
  Math.round(REPRODUCE_SECONDS[item.biome] * rarityInfo(item.rarity).reproduce * MACHINE_LEVELS[state.machineLevel - 1].timeFactor);

function applyMachineLook(m, level) {
  m.nature.visible = level === 2;
  m.mountain.visible = level === 3;
  m.combo.visible = level === 4;
  m.dragon.visible = level === 5;
  m.pink.color.setHex([0xec407a, 0x66bb6a, 0x9575cd, 0xffc107, 0xd84315][level - 1]);
}

export function applyMachineLevel(hub) {
  for (const m of hub.machines) applyMachineLook(m, state.machineLevel);
}

export function upgradeMachines(hub) {
  const next = MACHINE_LEVELS[state.machineLevel];
  if (!next || state.money < next.cost) return null;
  state.money -= next.cost;
  state.machineLevel += 1;
  applyMachineLevel(hub);
  return next;
}

// La Combination：放第二隻（等緊機嘅下一隻）
export const secondFor = (item) => (MACHINE_LEVELS[state.machineLevel - 1].double ? state.borrowed.find((b) => b !== item) : null);

export function fillMachine(machine, item) {
  const second = secondFor(item);
  state.borrowed.splice(state.borrowed.indexOf(item), 1);
  if (second) state.borrowed.splice(state.borrowed.indexOf(second), 1);
  const total = Math.max(reproduceSeconds(item), second ? reproduceSeconds(second) : 0);
  const pick = (a) => ({ name: a.name, biome: a.biome, kg: a.kg, rarity: a.rarity, sizeMul: a.sizeMul, ...(a.mutation ? { mutation: a.mutation } : {}), ...(a.flipped ? { flipped: true } : {}) }); // 變異、倒轉都帶入機
  state.machines[machine.index] = { ...pick(item), second: second ? pick(second) : null, total, endsAt: Date.now() + total * 1000 };
  return second;
}

// 攞寵物：回傳一個 list（La Combination 可能有兩隻）；La Combination 有 20% 機會變大 1–10 倍
export function collectPet(machine) {
  const m = state.machines[machine.index];
  state.machines[machine.index] = null;
  const level = MACHINE_LEVELS[state.machineLevel - 1];
  return [m, m.second].filter(Boolean).map((a) => {
    const pet = { name: a.name, biome: a.biome, kg: a.kg, rarity: a.rarity, onPlot: false };
    if (a.sizeMul) pet.sizeMul = a.sizeMul; // 巨型入、巨型出（之前會變返細）
    if (a.mutation) pet.mutation = a.mutation;
    if (a.flipped) pet.flipped = true;
    if (level.fireChance && Math.random() < level.fireChance) pet.mutation = addMutation(pet, 'fire'); // Dragon's Lair：🔥 Fire 變異（疊落去）
    if (level.giantChance && Math.random() < level.giantChance) {
      const extra = Math.max(1.5, Math.round((1 + Math.random() * 9) * 10) / 10);
      pet.sizeMul = Math.round((pet.sizeMul || 1) * extra * 10) / 10;
      pet.kg = Math.round(kgOf(pet) * extra * 10) / 10; // 大咗，重咗，賺多啲
    }
    state.pets.push(pet);
    return pet;
  });
}

export const petsOnPlot = () => state.pets.filter((p) => p.onPlot).length;

export function placePet(hub, pet) {
  if (petsOnPlot() >= plotSlots(state.plotLevel)) return false;
  pet.onPlot = true;
  syncPlot(hub);
  return true;
}

// 收返入背包（唔再賺錢）
export function unequipPet(hub, pet) {
  pet.onPlot = false;
  syncPlot(hub);
}

// 自動揀賺得最多嘅寵物放上地塊（放到滿為止）
export function equipBest(hub) {
  const best = [...state.pets].sort((a, b) => itemMoney(b) - itemMoney(a)).slice(0, plotSlots(state.plotLevel));
  for (const p of state.pets) p.onPlot = best.includes(p);
  syncPlot(hub);
}

export const sellPrice = (pet) => itemMoney(pet) * SELL_SECONDS;

export function sellPet(hub, pet) {
  const price = sellPrice(pet);
  state.pets.splice(state.pets.indexOf(pet), 1);
  state.money += price;
  syncPlot(hub);
  return price;
}

export function upgradePlot(hub) {
  const cost = plotUpgradeCost(state.plotLevel);
  if (state.plotLevel >= PLOT_MAX_UPGRADES || state.money < cost) return null;
  state.money -= cost;
  state.plotLevel += 1;
  return applyPlotSkin(hub); // 回傳新皮膚
}

// 換咗寵物皮膚：成個地塊嘅寵物重新整過
export function refreshPlotPets(hub) {
  for (const e of hub.plot.pets) hub.scene.remove(e.group);
  hub.plot.pets = [];
  syncPlot(hub);
}

// 令地塊上面嘅 3D 寵物同 state 一致（加新嘅、拎走收咗／賣咗嘅）
function syncPlot(hub) {
  const plot = hub.plot;
  plot.pets = plot.pets.filter((entry) => {
    if (entry.pet.onPlot && state.pets.includes(entry.pet)) return true;
    hub.scene.remove(entry.group);
    return false;
  });
  for (const pet of state.pets) {
    if (pet.onPlot && !plot.pets.some((e) => e.pet === pet)) addPetToPlot(plot, hub.scene, pet);
  }
}

// 跑步機上面轆滑鼠：碌去下一條／上一條短片
export function scrollVideo(hub, direction) {
  const treadmill = hub.stations.find((s) => s.video);
  return treadmill.video.next(direction);
}

// ================= 繁殖機圖鑑：3 個等級各影一張相 =================
let machineThumbs = null;
export function getMachineThumbnails() {
  if (machineThumbs) return machineThumbs;
  const W = 320;
  const H = 220;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfde4ec);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 1.6));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(5, 10, 6);
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0x8bc34a }));
  floor.position.set(6000, -0.1, 6000);
  scene.add(floor);
  const m = buildMachine(scene, 0, 6000, 6000);
  m.sign.mesh.visible = false;
  // 入面放隻熊貓，睇落似做緊嘢
  const panda = buildAnimalModel(findAnimal('Giant Panda'));
  const size = new THREE.Box3().setFromObject(panda).getSize(new THREE.Vector3());
  panda.scale.multiplyScalar(1.3 / Math.max(size.x, size.y, size.z));
  panda.position.y = 0.7;
  panda.rotation.y = Math.PI * 0.8;
  m.group.add(panda);
  m.light.color.setHex(0xffeb3b);
  m.light.emissive.setHex(0xffc400);
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
  camera.position.set(6000 + 3.6, 3.4, 6000 - 5.2);
  camera.lookAt(6000, 1.1, 6000);
  machineThumbs = MACHINE_LEVELS.map((lv, i) => {
    applyMachineLook(m, i + 1);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  });
  renderer.dispose();
  renderer.forceContextLoss();
  return machineThumbs;
}

// ================= 跑步機／學生桌圖鑑：每個等級影一張相 =================
// 喺好遠嘅地方（玩家見唔到）起一部示範機，逐個等級套用外觀再影相；影一次就記住
const thumbnails = {};
export function getTierThumbnails(kind) {
  if (thumbnails[kind]) return thumbnails[kind];
  const W = 320;
  const H = 220;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfeefb);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 1.6));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(5, 10, 6);
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.2, 14), new THREE.MeshStandardMaterial({ color: 0x8bc34a }));
  floor.position.set(5000, -0.1, 5000);
  scene.add(floor);
  const station = kind === 'treadmill' ? buildTreadmill(scene, 5000, 5000) : buildStudentTable(scene, 5000, 5000);
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
  camera.position.set(5000 + 6.5, 5.2, 5000 + 8.5);
  camera.lookAt(5000, 1.8, 5000 - 0.8);
  thumbnails[kind] = TIERS.map((tier) => {
    applyTier(station, tier.minLevel);
    animateExtras(station, 0.6);
    if (station.video) station.video.update(0, true);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  });
  renderer.dispose();
  renderer.forceContextLoss();
  return thumbnails[kind];
}

// ================= 皮膚商店攤位 =================
function buildSkinShop(scene, x, z, rotY = Math.PI / 2) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY; // 櫃枱喺本地 -z；rotY = π 就面向 +z（噴水池）
  scene.add(g);
  const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
  const wood = M(0x8d6e63);
  add(g, rbox(4.2, 1.1, 1.2), M(0x6a1b9a), 0, 0.55, -0.6); // 紫色櫃枱
  add(g, rbox(4.3, 0.12, 1.3), M(0xffd54f), 0, 1.15, -0.6);
  for (const s of [-1, 1]) for (const zz of [-1.1, 1.4]) add(g, rbox(0.18, 3.2, 0.18), wood, s * 2.0, 1.6, zz);
  // 間條帳篷頂
  for (let i = 0; i < 7; i++) {
    const stripe = add(g, new THREE.BoxGeometry(0.62, 0.12, 2.9), M(i % 2 ? 0xffffff : 0xe91e63), -1.86 + i * 0.62, 3.25, 0.15);
    stripe.rotation.x = -0.18;
  }
  for (let i = 0; i < 7; i++) add(g, new THREE.ConeGeometry(0.3, 0.35, 3), M(i % 2 ? 0xffffff : 0xe91e63), -1.86 + i * 0.62, 2.95, -1.2).rotation.x = Math.PI; // 帳篷花邊
  // 櫃枱上面嘅皮膚樣板（細公仔）
  [[0x212121, 0xd50000], [0xeceff1, 0x80d8ff], [0xffc107, 0xffd600]].forEach(([body, accent], i) => {
    const px = -1.3 + i * 1.3;
    add(g, rbox(0.4, 0.5, 0.25), M(body, { metalness: i === 2 ? 0.9 : 0 }), px, 1.5, -0.6);
    add(g, rbox(0.32, 0.32, 0.32), M(i === 1 ? 0xeceff1 : 0xf5c99b), px, 1.92, -0.6);
    add(g, rbox(0.36, 0.08, 0.36), M(accent, { emissive: accent, emissiveIntensity: 0.4 }), px, 2.1, -0.6);
  });
  const sign = makeSign([{ text: 'SKIN SHOP', size: 0.5 }, { text: 'Spend your 🎟️ Skin Tokens!', size: 0.25 }], 3.6, 1.1, THEMES.purple);
  sign.position.set(0, 3.9, -1.25);
  sign.rotation.y = Math.PI;
  g.add(sign);
  addCollider(x, z, 2.2);
  return { x: x - 2.4 * Math.sin(rotY), z: z - 2.4 * Math.cos(rotY) }; // 櫃枱前面（本地 (0, -2.4)）
}
