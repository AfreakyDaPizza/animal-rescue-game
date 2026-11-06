// 新嘅圓形 Hub 裝飾（小朋友 2026-10-15 Issue #1）：
// 石像、樹、雀仔、吊床（Owner 瞓喺度）、大門口、路、區域牌
// Issue #16（2026-11-06）：噴水池、遊樂場、Fuse Machine 已經刪走；排位見 hubShape.js
// 唔會郁嘅放 staticRoot（之後焊埋）；會郁嘅放 live（每格畫面 update）

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HUB, PLOT, PLOT_RING, LIBRARY, METEOR_SHOP, LIBRARY_WALK_X, MACHINE_ROW, TAME_AREA } from './hubShape.js';
import { GYM_PORTAL } from './labShape.js';
import { addCollider } from './world.js';
import { buildAnimalModel } from './animalModels.js';
import { findAnimal } from './data/animals.js';
import { applyPetSkin } from './skins.js';
import { makeSign, makeLabel, dynamicSign, THEMES } from './signs.js';
import { buildOwner } from './owner.js';
import { shimmerTexture } from './ambience.js';
import { fenceLine } from './fences.js'; // 🪵 前院白色木欄
import { pathStrip, tilePad, roundPad } from './hubFloor.js';
import { METEOR_SHOP_ON } from './data/balance.js';

// 位置（開場動畫都會用）
export const HAMMOCK = { x: -20, z: 50 }; // 兩棵樹中間
export const DESK = { x: -14.2, z: 51 }; // 吊床隔籬張枱（有杯水同 pizza）
export const PARK_GATE = { x: 0, z: HUB.cz + HUB.r }; // Hub 底嘅大門口（開場動畫架車由呢度入）

// 開場動畫要郁嘅嘢
export const park = { owner: null, glass: null, water: null, gateDoors: [], gateOpen: 0, pizza: null };

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
const rbox = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.15);

// 方塊大樹（同 biomes.js 嗰款一樣，大細可以改）
const trunkMat = mat(0x6b4423);
const leafA = mat(0x2e7d32);
const leafB = mat(0x43a047);
const leafC = mat(0x66bb6a);
// 💪 Gym 門口（前院）嘅傳送門：唔好種樹（Gym 本身喺實驗室原位，嗰度本來冇樹）
const gymClearing = (x, z) => Math.hypot(x - GYM_PORTAL.x, z - GYM_PORTAL.z) < 5;
function tree(root, x, z, s = 1, kind = 0) {
  if (gymClearing(x, z)) return;
  add(root, new THREE.BoxGeometry(0.7 * s, 4.4 * s, 0.7 * s), trunkMat, x, 2.2 * s, z);
  if (kind === 1) {
    // 松樹
    [[3.2, 1.4, 3], [2.4, 1.2, 4.1], [1.5, 1.1, 5.1]].forEach(([w, h, y], i) => {
      add(root, new THREE.BoxGeometry(w * s, h * s, w * s), i % 2 ? leafB : leafA, x, y * s, z).rotation.y = i * 0.4;
    });
    return;
  }
  add(root, new THREE.BoxGeometry(3.4 * s, 2.2 * s, 3.4 * s), leafA, x, 4.9 * s, z);
  add(root, new THREE.BoxGeometry(2.4 * s, 1.6 * s, 2.4 * s), leafB, x + 0.7 * s, 6.2 * s, z + 0.3 * s);
  add(root, new THREE.BoxGeometry(1.8 * s, 1.3 * s, 1.8 * s), leafC, x - 0.9 * s, 5.6 * s, z - 0.8 * s);
  if (kind === 2) for (const [dx, dz] of [[1.2, 1.0], [-1.0, 1.3], [0.4, -1.4]]) add(root, new THREE.BoxGeometry(0.3 * s, 0.3 * s, 0.3 * s), mat(0xff7043), x + dx * s, 4.2 * s, z + dz * s); // 生果
}

// 路、中間廣場、區域地磚：Issue #8 重做咗，喺 hubFloor.js（有紋理、石邊、唔會閃）

// ---------- 石像（大門兩邊：銅犀牛、金老虎；Issue #16 刪咗噴水池嗰兩隻） ----------
function buildStatues(root) {
  const plinth = mat(0x9e9e9e);
  const plinthTop = mat(0xbdbdbd);
  const list = [
    ['Black Rhinoceros', 'golden', -6, 56, Math.PI],
    ['Sumatran Tiger', 'marble', 6, 56, Math.PI],
  ];
  for (const [name, skin, x, z, rot] of list) {
    add(root, rbox(2.6, 1.2, 2.6), plinth, x, 0.6, z);
    add(root, rbox(2.9, 0.2, 2.9), plinthTop, x, 1.25, z);
    const model = buildAnimalModel(findAnimal(name));
    if (skin === 'marble') model.traverse((o) => o.isMesh && !o.material.isMeshBasicMaterial && (o.material = mat(0xeceff1, { roughness: 0.35 })));
    else applyPetSkin(model, skin);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.scale.multiplyScalar(2.6 / Math.max(size.x, size.y, size.z));
    model.position.set(x, 1.35, z);
    model.rotation.y = rot;
    model.userData.animate?.(0.5, 0);
    root.add(model);
    addCollider(x, z, 1.8);
  }
}

// ---------- 吊床 + Owner + 枱（有杯水、pizza） ----------
function buildHammock(root, live) {
  const { x, z } = HAMMOCK;
  tree(root, x - 4, z, 1.0, 2);
  tree(root, x + 4, z, 1.0, 0);
  addCollider(x - 4, z, 0.7);
  addCollider(x + 4, z, 0.7);
  // 繩 + 布（彎彎嘅網）
  const rope = mat(0xd7ccc8);
  for (const s of [-1, 1]) {
    const r = add(root, new THREE.BoxGeometry(0.06, 0.06, 1.3), rope, x + s * 3.1, 1.85, z);
    r.rotation.y = Math.PI / 2;
    r.rotation.x = s * 0.5;
  }
  const cloth = new THREE.Group();
  const stripes = [0xff7043, 0xffee58, 0x29b6f6, 0x66bb6a];
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12 - 0.5;
    const seg = add(cloth, new THREE.BoxGeometry(0.46, 0.08, 1.3), mat(stripes[i % 4]), t * 5.4, 1.6 - (0.25 - t * t) * 2.4, 0);
    seg.rotation.z = t * 1.6;
  }
  cloth.position.set(x, 0, z);
  root.add(cloth);
  addCollider(x, z, 1.4);

  // Owner 瞓喺吊床（開場動畫會郁佢）
  const owner = buildOwner();
  live.add(owner.g);
  const label = makeLabel([{ text: 'OWNER', color: '#ffeb3b' }], 0.9);
  owner.g.add(label);
  owner.label = label;
  park.owner = owner;
  lieOnHammock(owner);

  // 細枱：一杯水、一盒 pizza
  const d = DESK;
  const wood = mat(0x8d6e63);
  add(root, rbox(1.4, 0.12, 1.0), wood, d.x, 1.0, d.z);
  for (const [sx, sz] of [[-0.55, -0.38], [0.55, -0.38], [-0.55, 0.38], [0.55, 0.38]]) add(root, new THREE.BoxGeometry(0.1, 1.0, 0.1), wood, d.x + sx, 0.5, d.z + sz);
  add(root, rbox(0.7, 0.08, 0.7), mat(0xfff3e0), d.x + 0.25, 1.1, d.z); // pizza 盒
  const pizza = add(live, new THREE.CylinderGeometry(0.28, 0.28, 0.04, 3), mat(0xffb300), d.x + 0.25, 1.17, d.z, false); // 一件 pizza
  for (let i = 0; i < 3; i++) add(pizza, new THREE.CylinderGeometry(0.04, 0.04, 0.02, 8), mat(0xd32f2f), (i - 1) * 0.08, 0.03, 0.03 * i);
  park.pizza = pizza;
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xe0f7fa, transparent: true, opacity: 0.35, roughness: 0.05 });
  const glass = add(live, new THREE.CylinderGeometry(0.11, 0.09, 0.32, 16, 1, true), glassMat, d.x - 0.35, 1.22, d.z, false);
  const water = add(live, new THREE.CylinderGeometry(0.1, 0.085, 0.22, 16), new THREE.MeshStandardMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.8, roughness: 0.05 }), d.x - 0.35, 1.17, d.z, false);
  park.glass = glass;
  park.water = water;
  addCollider(d.x, d.z, 0.8);
}

// Owner 瞓返落吊床（開場動畫完咗都會叫）
export function lieOnHammock(owner = park.owner) {
  owner.g.position.set(HAMMOCK.x + 1.5, 1.05, HAMMOCK.z);
  owner.g.rotation.set(0, -Math.PI / 2, 0); // 頭向 -x
  owner.root.rotation.set(Math.PI / 2 - 0.22, 0, 0); // 仰瞓（面向天），個頭少少抬高（Issue #2：之前反轉咗面向落）
  owner.root.position.set(0, 0, 0);
  for (const p of [...owner.legs, ...owner.arms]) p.rotation.set(0, 0, 0);
  owner.arms[0].rotation.x = -0.4;
  owner.head.rotation.set(0, 0, 0);
  owner.alert.visible = false;
  owner.phone.visible = false;
  owner.label.position.set(0, 1.9, 1.6);
}

// 企起身（開場動畫用）
export function standUp(owner, x, z, faceAngle) {
  owner.g.position.set(x, 0, z);
  owner.g.rotation.set(0, faceAngle, 0);
  owner.root.rotation.set(0, 0, 0);
  owner.label.position.set(0, 4.1, 0);
}

// ---------- 大門口（開場動畫：閘門打開，Ranger 揸車入嚟） ----------
function buildGate(root, live) {
  const { x, z } = PARK_GATE;
  const pillar = mat(0x8d6e63);
  const cap = mat(0x4e342e);
  // 小朋友 2026-10-22：圍牆高咗一倍（7 米）→ 門柱、橫樑、牌一齊升高 UP 米，大門仍然高過圍牆
  const UP = 3.2;
  for (const s of [-1, 1]) {
    add(root, rbox(1.4, 6.5 + UP, 1.4), pillar, x + s * 3.6, (6.5 + UP) / 2, z);
    add(root, rbox(1.7, 0.5, 1.7), cap, x + s * 3.6, 6.7 + UP, z);
  }
  add(root, rbox(8.6, 0.7, 0.8), cap, x, 6.0 + UP, z);
  // 柱頂金色球 + 柱身爬藤 + 底座（小朋友 2026-10-19：要型啲）
  const goldTop = mat(0xffc107, { metalness: 0.6, roughness: 0.35 });
  const ivy = mat(0x388e3c);
  for (const s of [-1, 1]) {
    add(root, new THREE.SphereGeometry(0.45, 14, 10), goldTop, x + s * 3.6, 7.4 + UP, z);
    add(root, rbox(2.0, 0.6, 2.0), cap, x + s * 3.6, 0.3, z);
    for (let k = 0; k < 7; k++) add(root, new THREE.BoxGeometry(0.5, 0.7 + (k % 2) * 0.5, 0.1), ivy, x + s * 3.6 + ((k % 4) - 1.5) * 0.3, 1.2 + k * 1.15, z - 0.74, false);
  }
  const crest = add(root, new THREE.OctahedronGeometry(0.5, 0), goldTop, x, 7.9 + UP, z);
  crest.scale.y = 1.4;
  const sign = makeSign([{ text: 'ANIMAL RESCUE PARK', size: 0.4 }], 6.6, 1.1, THEMES.green);
  sign.position.set(x, 7.1 + UP, z - 0.45);
  sign.rotation.y = Math.PI;
  live.add(sign);
  // 兩扇鐵閘（向兩邊趟開）
  const bars = new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.7, roughness: 0.4 });
  park.gateDoors = [-1, 1].map((s) => {
    const door = new THREE.Group();
    for (let i = 0; i < 6; i++) add(door, new THREE.BoxGeometry(0.12, 4.6, 0.12), bars, s * (0.3 + i * 0.5), 2.3, 0);
    for (const y of [0.6, 2.3, 4.4]) add(door, new THREE.BoxGeometry(3.0, 0.15, 0.15), bars, s * 1.5, y, 0);
    door.position.set(x, 0, z);
    door.userData.side = s;
    live.add(door);
    return door;
  });
  // 鐵閘上面（門頂到橫樑）：固定嘅鐵花窗，大門高咗都唔會穿窿
  const grille = mat(0x37474f, { metalness: 0.7, roughness: 0.4 });
  for (const y of [5.0, 8.6]) add(root, new THREE.BoxGeometry(5.8, 0.18, 0.18), grille, x, y, z, false);
  for (let i = 0; i < 11; i++) add(root, new THREE.BoxGeometry(0.12, 3.6, 0.12), grille, x - 2.75 + i * 0.55, 6.8, z, false);
  add(root, new THREE.TorusGeometry(1.1, 0.1, 6, 20), grille, x, 6.8, z, false);
  // 門外：一條路（去 Laboratory 門口）+ 大草地（開場動畫架車喺呢度行）
  add(root, new THREE.BoxGeometry(6, 0.05, 38), mat(0x616161), x, 0.02, z + 19, false);
  const outside = add(root, new THREE.BoxGeometry(150, 0.5, 130), mat(0x689f38), x, -0.27, z + 65, false);
  outside.receiveShadow = true;
  // 前院兩邊：白色尖頂木欄（小朋友 2026-10-19），每隔幾條柱有金色寶石；只係裝飾（前院本身已經行唔出去）
  const picket = { post: mat(0xfafafa), rail: mat(0xf5f5f5), trim: mat(0x90a4ae), h: 1.25, w: 0.24, cap: 'pyramid', rails: [0.35, 0.85], pickets: 0.32, pickH: 1.0, spacing: 2.4, gemEvery: 4, gem: mat(0xffd54f, { emissive: 0xffb300, emissiveIntensity: 0.9 }) };
  for (const s of [-1, 1]) fenceLine(root, [[x + s * 24.7, z + 1.2], [x + s * 24.7, z + 38]], picket);
  // 樹種喺前院同實驗室外面（Issue #2：中間留位俾實驗室）
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    tree(root, x + side * (34 + (i * 7) % 16), z + 4 + i * 4.4, 0.9 + (i % 3) * 0.15, i % 3 === 0 ? 1 : 0);
  }
  // 森林（小朋友：外面要有森林，最外面用巨型高樹做邊界）
  let seed = 21;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const tx = x + side * (36 + rnd() * 34);
    const tz = z + 4 + rnd() * 124;
    tree(root, tx, tz, 0.8 + rnd() * 0.6, rnd() < 0.5 ? 1 : 0);
  }
  for (let tz = z + 2; tz <= z + 128; tz += 9) for (const side of [-1, 1]) giantTree(root, x + side * 72, tz + (side > 0 ? 4 : 0), 1 + rnd() * 0.4);
  for (let tx = x - 63; tx <= x + 63; tx += 9) if (Math.abs(tx - x) > 6) giantTree(root, tx, z + 128, 1 + rnd() * 0.4);
}

// 巨型高樹（20–30 米）：森林邊界
function giantTree(root, x, z, s) {
  add(root, new THREE.BoxGeometry(2.2 * s, 22 * s, 2.2 * s), mat(0x4e342e), x, 11 * s, z);
  add(root, new THREE.BoxGeometry(11 * s, 6 * s, 11 * s), leafA, x, 23 * s, z);
  add(root, new THREE.BoxGeometry(8 * s, 4 * s, 8 * s), leafB, x + 1.5 * s, 27.5 * s, z - 1 * s);
  add(root, new THREE.BoxGeometry(5 * s, 3 * s, 5 * s), leafC, x - 1.5 * s, 30 * s, z + 1.2 * s);
}

// 閘門開幾多（0 關、1 開），開場動畫用
export function setGateOpen(k) {
  park.gateOpen = k;
  for (const d of park.gateDoors) d.position.x = PARK_GATE.x + d.userData.side * k * 3.2;
}

// ---------- 雀仔（喺 Hub 上面飛圈） ----------
function buildBirds(live) {
  const colors = [0xffffff, 0x90caf9, 0xffcc80, 0xef9a9a, 0xfff59d, 0xb39ddb, 0xffffff, 0xa5d6a7];
  const birds = colors.map((c, i) => {
    const g = new THREE.Group();
    add(g, rbox(0.35, 0.3, 0.7), mat(c), 0, 0, 0, false);
    add(g, new THREE.ConeGeometry(0.07, 0.2, 4), mat(0xffa000), 0, 0, -0.45, false).rotation.x = -Math.PI / 2;
    const wings = [-1, 1].map((s) => {
      const p = new THREE.Group();
      p.position.set(s * 0.15, 0.08, 0);
      add(p, new THREE.BoxGeometry(0.6, 0.05, 0.35), mat(c), s * 0.3, 0, 0, false);
      g.add(p);
      return p;
    });
    live.add(g);
    return { g, wings, r: 10 + (i % 4) * 5, h: 9 + (i % 3) * 2.5, speed: (0.25 + (i % 3) * 0.08) * (i % 2 ? 1 : -1), phase: i * 0.8 };
  });
  return (dt, time) => {
    for (const b of birds) {
      const a = time * b.speed + b.phase;
      b.g.position.set(PLOT_CX + Math.cos(a) * b.r, b.h + Math.sin(time * 1.3 + b.phase) * 0.6, PLOT_CZ + Math.sin(a) * b.r); // 喺地塊上面飛圈
      b.g.rotation.y = -a + (b.speed > 0 ? Math.PI : 0);
      const flap = Math.sin(time * 12 + b.phase) * 0.7;
      b.wings[0].rotation.z = flap;
      b.wings[1].rotation.z = -flap;
    }
  };
}

// ---------- 區域牌 + 矮樹籬（等 Hub 睇落整齊；地磚喺 hubFloor.js） ----------
// 區域牌：兩條柱 + 牌，面向 (fx, fz)
// 🌼 花圃（2026-10-18 present 前：出世點周圍靚啲）：兩個 InstancedMesh（莖 + 花），行得穿、唔加碰撞
function flowerBeds(live) {
  const beds = [];
  for (const s of [-1, 1]) {
    beds.push([s * 5.6, s * 8.0, 1.2, 7.6]); // 入口廣場兩邊
  }
  const spots = [];
  for (const [xa, xb, za, zb] of beds) {
    const x1 = Math.min(xa, xb);
    const x2 = Math.max(xa, xb);
    for (let x = x1; x <= x2; x += 0.55) for (let z = za; z <= zb; z += 0.55) spots.push([x + (Math.random() - 0.5) * 0.35, z + (Math.random() - 0.5) * 0.35]);
  }
  const stems = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), mat(0x43a047), spots.length);
  const heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 0), mat(0xffffff), spots.length);
  const leaves = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.04, 0.1), mat(0x66bb6a), spots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const c = new THREE.Color();
  spots.forEach(([x, z], i) => {
    const h = 0.25 + Math.random() * 0.2;
    m.compose(new THREE.Vector3(x, h / 2, z), q, new THREE.Vector3(1, h / 0.36, 1));
    stems.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(x, h + 0.05, z), q.setFromEuler(new THREE.Euler(0, Math.random() * 3, 0)), new THREE.Vector3(1, 0.7, 1));
    heads.setMatrixAt(i, m);
    heads.setColorAt(i, c.setHex(flowerColors[(i * 7) % flowerColors.length]));
    m.compose(new THREE.Vector3(x, 0.1, z), q.setFromEuler(new THREE.Euler(0, Math.random() * 3, 0.2)), new THREE.Vector3(1, 1, 1));
    leaves.setMatrixAt(i, m);
  });
  for (const im of [stems, heads, leaves]) {
    im.castShadow = false;
    im.receiveShadow = true;
    live.add(im);
  }
}

function zoneSign(live, x, z, text, theme, fx = HUB.cx, fz = HUB.cz) {
  const g = new THREE.Group();
  const sign = makeSign([{ text, size: 0.42 }], 4.2, 0.95, theme);
  sign.position.y = 3.1;
  g.add(sign);
  for (const s of [-1, 1]) add(g, rbox(0.25, 3.6, 0.25), mat(0x5d4037), s * 1.95, 1.8, -0.05);
  g.position.set(x, 0, z);
  g.rotation.y = Math.atan2(fx - x, fz - z);
  live.add(g);
}
const hedgeMat = mat(0x2e7d32);
const hedgeTop = mat(0x388e3c);
const flowerColors = [0xff6b6b, 0xffd93d, 0xff9ff3, 0xffffff, 0x74b9ff, 0xba68c8];
// 一段直嘅矮樹籬，上面有花
const planterMat = mat(0xd7ccc8);
const planterTrim = mat(0x8d6e63);
function hedge(root, x1, z1, x2, z2, ends = false) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const h = add(root, new THREE.BoxGeometry(0.8, 0.8, len), hedgeMat, (x1 + x2) / 2, 0.4, (z1 + z2) / 2);
  h.rotation.y = Math.atan2(x2 - x1, z2 - z1);
  // 石花槽（小朋友 2026-10-19：圍欄要型啲）：樹籬企喺一個淺色石槽入面，有深色邊
  add(root, new THREE.BoxGeometry(1.05, 0.32, len + 0.12), planterMat, (x1 + x2) / 2, 0.16, (z1 + z2) / 2, false).rotation.y = h.rotation.y;
  add(root, new THREE.BoxGeometry(1.12, 0.08, len + 0.18), planterTrim, (x1 + x2) / 2, 0.34, (z1 + z2) / 2, false).rotation.y = h.rotation.y;
  if (ends) {
    // 兩頭：圓圓嘅修剪樹球企喺石柱上面
    for (const [ex, ez] of [[x1, z1], [x2, z2]]) {
      add(root, rbox(0.9, 0.6, 0.9), planterMat, ex, 0.3, ez);
      add(root, new THREE.SphereGeometry(0.42, 12, 8), hedgeTop, ex, 0.98, ez);
    }
  }
  const top = add(root, new THREE.BoxGeometry(0.85, 0.12, len + 0.05), hedgeTop, (x1 + x2) / 2, 0.85, (z1 + z2) / 2, false);
  top.rotation.y = h.rotation.y;
  const n = Math.floor(len / 0.9);
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n;
    add(root, new THREE.BoxGeometry(0.18, 0.18, 0.18), mat(flowerColors[i % flowerColors.length]), x1 + (x2 - x1) * k, 0.98, z1 + (z2 - z1) * k, false);
  }
}
// ================= 起晒成個 Hub =================
// 排位（Issue #16，2026-11-06，詳細見 hubShape.js）：
//   最上：左 🏃 Training Zone ── 入口（出世點）── 右 🛍️ Shop Street
//   中間：🐾 Animal Shelter Safety Zoo（地塊）+ 一圈石路
//   左邊：😊 Happy Machines + ✨ Magic Library；右邊：🤠 Catch & Tame（tameStalls.js 起）
//   最底：左 Owner's Garden（吊床）、大門
const PLOT_CX = (PLOT.minX + PLOT.maxX) / 2;
const PLOT_CZ = (PLOT.minZ + PLOT.maxZ) / 2;
export function buildHubPark(root, live) {
  const { cx, cz, r } = HUB;
  const updates = [];
  const W = PLOT_RING;
  const ringW = PLOT.minX - W / 2 - 0.2; // 地塊四邊石路（中線）
  const ringE = PLOT.maxX + W / 2 + 0.2;
  const ringN = PLOT.minZ - W / 2 - 0.2;
  const ringS = PLOT.maxZ + W / 2 + 0.2;

  // ---- 路 ----
  pathStrip(root, 0, 0, 0, ringN, 5); // 入口 → 地塊閘口
  pathStrip(root, -29, 10.5, 29, 10.5, 3); // 上面一條：Training Zone ── 入口 ── Shop Street
  // 地塊四邊一圈
  pathStrip(root, ringW, ringN, ringE, ringN, W);
  pathStrip(root, ringW, ringS, ringE, ringS, W);
  pathStrip(root, ringW, 10.5, ringW, ringS, W);
  pathStrip(root, ringE, 10.5, ringE, ringS, W);
  pathStrip(root, 0, ringS, 0, cz + r, 5); // 地塊 → 大門
  pathStrip(root, LIBRARY_WALK_X, 10.5, LIBRARY_WALK_X, (METEOR_SHOP_ON ? METEOR_SHOP.z : LIBRARY.z) + 4, 3.2); // ✨ 圖書館門口條直路（由上面條路落）
  pathStrip(root, ringE, TAME_AREA.gateZ, TAME_AREA.minX + 1, TAME_AREA.gateZ, 3.4); // 去 🤠 Catch & Tame 入口

  // ---- 區域地磚 ----
  tilePad(root, -19.5, 7.5, 20, 12, 'training'); // Training Zone（膠地）
  tilePad(root, 0, 4.2, 10, 7.4, 'entrance'); // 入口廣場（雲石）
  tilePad(root, 17.3, 5.2, 18, 7.6, 'shop'); // Shop Street（藍白格仔）
  roundPad(root, LIBRARY.x, LIBRARY.z, 6.0, 'library'); // Magic Library（紫色星星）
  if (METEOR_SHOP_ON) roundPad(root, METEOR_SHOP.x, METEOR_SHOP.z, 5.6, 'meteor'); // ☄️ Meteoric Shop（收埋咗就唔使地磚）
  const mz = MACHINE_ROW.zs;
  const machineW = (ringW - W / 2) - (MACHINE_ROW.x - 4); // 由機後面一直鋪到地塊條石路
  tilePad(root, MACHINE_ROW.x - 4 + machineW / 2, (mz[0] + mz[mz.length - 1]) / 2 + 1.5, machineW, mz[mz.length - 1] - mz[0] + 11, 'breeding'); // Happy Machines（粉紅菱形）

  // ---- 區域牌 ----
  zoneSign(live, -19.5, 14.6, '🏃 TRAINING ZONE', THEMES.orange, -19.5, 40);
  zoneSign(live, 17.3, 13.2, '🛍️ SHOP STREET', THEMES.blue, 17.3, 40);
  zoneSign(live, -7.5, 46, '🌴 OWNER\'S GARDEN', THEMES.green, 0, 46);
  // 😊 Happy Machines 大牌：一行機後面，高高咁面向地塊
  const sx = MACHINE_ROW.x - 3.2;
  const szc = (mz[0] + mz[mz.length - 1]) / 2;
  for (const s of [-1, 1]) {
    add(root, rbox(0.5, 7.2, 0.5), mat(0xf8bbd0), sx, 3.6, szc + s * 4.4);
    add(root, rbox(0.8, 0.35, 0.8), mat(0xec407a), sx, 7.3, szc + s * 4.4);
    addCollider(sx, szc + s * 4.4, 0.45);
  }
  const lab = makeSign([{ text: '😊 HAPPY MACHINES', size: 0.5 }], 8.4, 1.4, THEMES.pink);
  lab.position.set(sx + 0.3, 6.3, szc);
  lab.rotation.y = Math.PI / 2; // 面向 +x（地塊）
  live.add(lab);

  flowerBeds(live);
  buildStatues(root);
  buildHammock(root, live);
  buildGate(root, live);
  updates.push(buildBirds(live));

  // 路兩邊嘅矮樹籬（去大門條路）
  for (const s of [-1, 1]) {
    hedge(root, s * 3.2, 44, s * 3.2, 58, true);
  }
  // 圍牆內邊種一圈樹（只喺下半部分，避開大門、吊床、右邊 Catch & Tame、左邊 Happy Machines／圖書館）
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const tx = cx + Math.cos(a) * (r - 2.6);
    const tz = cz + Math.sin(a) * (r - 2.6);
    if (tz < 44) continue;
    if (Math.abs(tx) < 7) continue; // 大門
    if (tx > TAME_AREA.minX - 1 && tz < TAME_AREA.maxZ + 2) continue; // 🤠 Catch & Tame
    if (Math.hypot(tx - HAMMOCK.x, tz - HAMMOCK.z) < 6) continue;
    tree(root, tx, tz, 0.85 + ((i * 37) % 10) / 25, i % 3 === 0 ? 1 : i % 5 === 0 ? 2 : 0);
  }

  return (dt, time) => updates.forEach((u) => u(dt, time));
}
