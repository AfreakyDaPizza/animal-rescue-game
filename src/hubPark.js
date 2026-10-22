// 新嘅圓形 Hub 裝飾（小朋友 2026-10-15 Issue #1）：
// 中間會噴水嘅噴水池、石像、樹、雀仔、吊床（Owner 瞓喺度）、「Coming Soon」機器、遊樂場、大門口
// 唔會郁嘅放 staticRoot（之後焊埋）；會郁嘅放 live（每格畫面 update）

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HUB, PLOT, LIBRARY, METEOR_SHOP, LIBRARY_WALK_X } from './hubShape.js';
import { GYM_PORTAL } from './labShape.js';
import { addCollider } from './world.js';
import { buildAnimalModel } from './animalModels.js';
import { findAnimal } from './data/animals.js';
import { applyPetSkin } from './skins.js';
import { makeSign, makeLabel, dynamicSign, THEMES } from './signs.js';
import { isFuseOpen, daysUntilOpen, openDateText } from './fuse.js';
import { buildOwner } from './owner.js';
import { shimmerTexture } from './ambience.js';
import { fenceLine } from './fences.js'; // 🪵 前院白色木欄
import { pathStrip, centralPlaza, tilePad, roundPad } from './hubFloor.js';

// 位置（開場動畫都會用）
export const FOUNTAIN = { x: HUB.cx, z: HUB.cz };
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

// ---------- 噴水池（會噴水） ----------
function buildFountain(root, live) {
  const { x, z } = FOUNTAIN;
  const stone = mat(0xd7d2c8);
  const stoneDark = mat(0xb0a99c);
  add(root, new THREE.CylinderGeometry(4.6, 4.9, 0.8, 32), stoneDark, x, 0.4, z);
  add(root, new THREE.TorusGeometry(4.55, 0.28, 8, 40), stone, x, 0.82, z).rotation.x = Math.PI / 2;
  add(root, new THREE.CylinderGeometry(0.6, 0.9, 2.6, 16), stone, x, 1.5, z);
  add(root, new THREE.CylinderGeometry(2.0, 1.2, 0.4, 24), stone, x, 2.8, z);
  add(root, new THREE.CylinderGeometry(0.3, 0.4, 1.2, 12), stone, x, 3.5, z);
  add(root, new THREE.CylinderGeometry(0.9, 0.5, 0.3, 16), stone, x, 4.15, z);
  // 4 隻細細嘅金魚石像噴水口
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const fish = add(root, rbox(0.5, 0.5, 0.9), mat(0xffb74d), x + Math.cos(a) * 3.9, 1.15, z + Math.sin(a) * 3.9);
    fish.rotation.y = -a + Math.PI / 2;
  }

  // 水面（會閃）
  const shimmer = shimmerTexture(2, 2); // 水面閃光（ambience.js 會郁）
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, map: shimmer, emissive: 0x29b6f6, emissiveMap: shimmer, emissiveIntensity: 0.3, transparent: true, opacity: 0.88, roughness: 0.05, metalness: 0.2 });
  const pool = add(live, new THREE.CylinderGeometry(4.35, 4.35, 0.08, 32), waterMat, x, 0.72, z, false);
  const bowl = add(live, new THREE.CylinderGeometry(1.85, 1.85, 0.06, 24), waterMat, x, 2.99, z, false);
  // 水波紋（一圈圈向外擴散）
  const ripples = [0, 1, 2].map((i) => {
    const r = add(live, new THREE.RingGeometry(0.9, 1.0, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }), x, 0.77, z, false);
    r.rotation.x = -Math.PI / 2;
    return { r, phase: i / 3 };
  });

  // 噴出嚟嘅水點
  const COUNT = 420;
  const pos = new Float32Array(COUNT * 3);
  const drops = [];
  for (let i = 0; i < COUNT; i++) {
    const top = i < COUNT * 0.45; // 頂嘅水柱
    drops.push({ phase: Math.random(), a: Math.random() * Math.PI * 2, speed: top ? 2.2 + Math.random() * 0.6 : 2 + Math.random() * 0.5, top, fish: i % 4 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const spray = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe1f5fe, size: 0.14, transparent: true, opacity: 0.85, depthWrite: false }));
  spray.frustumCulled = false;
  live.add(spray);
  addCollider(x, z, 5.0);

  return (dt, time) => {
    for (let i = 0; i < COUNT; i++) {
      const d = drops[i];
      const k = (time * 0.55 * d.speed + d.phase) % 1;
      let px;
      let py;
      let pz;
      if (d.top) {
        // 由頂向上噴再跌落中間個碗
        const r = k * 1.7;
        px = x + Math.cos(d.a) * r;
        pz = z + Math.sin(d.a) * r;
        py = 4.3 + k * 3.2 - k * k * 4.4;
      } else {
        // 金魚口噴落大池
        const fa = (d.fish / 4) * Math.PI * 2 + Math.PI / 4;
        const r = 3.9 - k * 2.4;
        px = x + Math.cos(fa) * r + Math.cos(d.a) * 0.08;
        pz = z + Math.sin(fa) * r + Math.sin(d.a) * 0.08;
        py = 1.25 + k * 1.6 - k * k * 2.1;
      }
      pos[i * 3] = px;
      pos[i * 3 + 1] = Math.max(0.75, py);
      pos[i * 3 + 2] = pz;
    }
    geo.attributes.position.needsUpdate = true;
    for (const { r, phase } of ripples) {
      const k = (time * 0.35 + phase) % 1;
      r.scale.setScalar(1 + k * 3.2);
      r.material.opacity = 0.5 * (1 - k);
    }
    waterMat.emissiveIntensity = 0.25 + Math.sin(time * 2) * 0.08;
    pool.position.y = 0.72 + Math.sin(time * 3) * 0.01;
    bowl.position.y = 2.99 + Math.sin(time * 3.5) * 0.01;
  };
}

// ---------- 石像（金熊貓、銀象、銅犀牛、金老虎） ----------
function buildStatues(root) {
  const plinth = mat(0x9e9e9e);
  const plinthTop = mat(0xbdbdbd);
  const list = [
    ['Giant Panda', 'golden', -9.5, 32.8, 2.4],
    ['African Savanna Elephant', 'marble', 9.5, 32.8, -2.4],
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

// ---------- Fuse Machine（Issue #4）：未開（FUSE_OPEN_DATE 之前）用帆布冚住 + 倒數；開咗就係發光嘅溶合機 ----
// 3 個入料艙（後面）+ 1 個出貨艙（前面，面向噴水池）；fuseMachine.showResult(名) 播溶合動畫
// 2026-10-18 Hub 重新排位：搬咗去 Breeding Lab 右邊（同繁殖機一齊做 Machine 區），前面面向繁殖機（-x）
export const FUSE_MACHINE = { x: 26, z: 40 };
// Issue #10（小朋友：Fuse Machine 要醒目啲）：部機大 1.3 倍、頂有光柱 + 轉圈光環、高高嘅大牌、地台四角有燈柱
const FUSE_SCALE = 1.3;
export const fuseMachine = { spot: { x: FUSE_MACHINE.x - 3.6 * FUSE_SCALE, z: FUSE_MACHINE.z }, showResult: null };
function buildComingSoon(rootScene, liveScene) {
  // 喺噴水池右邊，面向噴水池（本地 -z → 世界 -x）
  const x = 0;
  const z = 0;
  const root = new THREE.Group();
  const live = new THREE.Group();
  for (const g of [root, live]) {
    g.position.set(FUSE_MACHINE.x, 0, FUSE_MACHINE.z);
    g.rotation.y = Math.PI / 2;
    g.scale.setScalar(FUSE_SCALE);
  }
  rootScene.add(root);
  liveScene.add(live);
  const metal = mat(0x78909c, { metalness: 0.6, roughness: 0.4 });
  add(root, rbox(4.6, 0.6, 3.8), mat(0x546e7a), x, 0.3, z);

  // ===== 未開：帆布、膠帶、閃燈 =====
  const closed = new THREE.Group();
  live.add(closed);
  add(closed, rbox(3.4, 2.8, 2.6), metal, x, 2.0, z);
  const tarp = mat(0x1e88e5);
  add(closed, rbox(3.7, 2.2, 2.9), tarp, x, 2.4, z);
  add(closed, rbox(3.0, 0.8, 2.3), tarp, x - 0.2, 3.8, z + 0.1).rotation.z = 0.08;
  for (const s of [-1, 1]) add(closed, new THREE.CylinderGeometry(0.15, 0.15, 1.6, 8), metal, x + s * 1.3, 4.6, z);
  const cone = mat(0xff6d00);
  const tape = mat(0xffd600, { emissive: 0x332b00 });
  const pts = [[-2.8, -2.4], [2.8, -2.4], [2.8, 2.4], [-2.8, 2.4]];
  pts.forEach(([ax, az], i) => {
    add(closed, new THREE.ConeGeometry(0.3, 0.8, 8), cone, x + ax, 0.4, z + az);
    const [bx, bz] = pts[(i + 1) % 4];
    const len = Math.hypot(bx - ax, bz - az);
    add(closed, new THREE.BoxGeometry(0.04, 0.12, len), tape, x + (ax + bx) / 2, 0.7, z + (az + bz) / 2).rotation.y = Math.atan2(bx - ax, bz - az);
  });
  const lamp = add(closed, new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 2 }), x, 5.1, z, false);

  // ===== 開咗：溶合機 =====
  const open = new THREE.Group();
  live.add(open);
  const dark = mat(0x263238, { metalness: 0.6, roughness: 0.35 });
  const neon = new THREE.MeshStandardMaterial({ color: 0x76ff03, emissive: 0x76ff03, emissiveIntensity: 2 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xb2ff59, transparent: true, opacity: 0.25, roughness: 0.05 });
  // 中間：能量核心（會轉）
  add(open, rbox(2.2, 3.2, 2.0), dark, x, 2.2, z + 0.6);
  const core = add(open, new THREE.OctahedronGeometry(0.55), new THREE.MeshStandardMaterial({ color: 0xccff90, emissive: 0x76ff03, emissiveIntensity: 2.5 }), x, 4.4, z + 0.6, false);
  const coreRing = add(open, new THREE.TorusGeometry(0.85, 0.07, 8, 32), neon, x, 4.4, z + 0.6, false);
  // 3 個入料艙（後面一排）
  const inputs = [-1.5, 0, 1.5].map((dx) => {
    add(open, new THREE.CylinderGeometry(0.6, 0.7, 0.4, 16), dark, x + dx, 0.8, z + 1.6);
    add(open, new THREE.CylinderGeometry(0.55, 0.55, 1.4, 16, 1, true), glassMat, x + dx, 1.7, z + 1.6, false);
    const light = add(open, new THREE.CylinderGeometry(0.5, 0.5, 0.06, 16), neon.clone(), x + dx, 1.02, z + 1.6, false);
    add(open, new THREE.CylinderGeometry(0.62, 0.62, 0.12, 16), dark, x + dx, 2.45, z + 1.6);
    // 喉管去核心
    const pipe = add(open, new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8), neon, x + dx * 0.5, 3.2, z + 1.1, false);
    pipe.rotation.x = 0.8;
    pipe.rotation.z = -dx * 0.3;
    return light;
  });
  // 出貨艙（前面，大啲）
  add(open, new THREE.CylinderGeometry(1.0, 1.15, 0.5, 20), dark, x, 0.85, z - 1.3);
  const outRing = add(open, new THREE.TorusGeometry(1.0, 0.08, 8, 32), neon, x, 1.12, z - 1.3, false);
  outRing.rotation.x = Math.PI / 2;
  const beam = add(open, new THREE.CylinderGeometry(0.9, 0.9, 3, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xb2ff59, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), x, 2.6, z - 1.3, false);
  const resultSlot = new THREE.Group();
  resultSlot.position.set(x, 1.15, z - 1.3);
  open.add(resultSlot);
  for (const s of [-1, 1]) add(open, rbox(0.3, 3.4, 0.3), dark, x + s * 1.25, 1.7, z - 1.3);

  // 牌（會變：倒數／FUSE MACHINE）
  const sign = dynamicSign(3.8, 1.3);
  sign.mesh.position.set(x, 3.2, z - 2.05);
  sign.mesh.rotation.y = Math.PI;
  live.add(sign.mesh);
  addCollider(FUSE_MACHINE.x, FUSE_MACHINE.z + 0, 2.6 * FUSE_SCALE);
  const beacon = buildFuseBeacon(rootScene, liveScene);

  // 溶合動畫：入料艙閃、光柱、新寵物喺出貨艙轉
  let fx = null;
  fuseMachine.showResult = (name) => {
    resultSlot.clear();
    const model = buildAnimalModel(findAnimal(name));
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.scale.multiplyScalar(1.8 / Math.max(size.x, size.y, size.z));
    if (model.userData.move === 'fly') model.userData.flying = false;
    resultSlot.add(model);
    fx = { t: 0, model };
  };

  return (dt, time) => {
    const isOpen = isFuseOpen();
    closed.visible = !isOpen;
    open.visible = isOpen;
    beacon(time, isOpen, fx ? fx.t : -1);
    if (!isOpen) {
      lamp.material.emissiveIntensity = Math.sin(time * 5) > 0 ? 2.5 : 0.2;
      const days = daysUntilOpen();
      sign.draw(THEMES.orange, [
        { text: '🧪 FUSE MACHINE', size: 0.36 },
        { text: `Opens ${openDateText()}`, size: 0.24 },
        { text: days > 1 ? `in ${days} days` : 'TOMORROW!', size: 0.22, color: '#fff59d' },
      ]);
      return;
    }
    sign.draw(THEMES.green, [{ text: '🧪 FUSE MACHINE', size: 0.4 }, { text: 'Press E: fuse 3 pets into 1!', size: 0.2 }]);
    core.rotation.y = time * 1.5;
    core.position.y = 4.4 + Math.sin(time * 2) * 0.12;
    coreRing.rotation.x = time;
    coreRing.rotation.y = time * 0.7;
    inputs.forEach((l, i) => (l.material.emissiveIntensity = 1.2 + Math.sin(time * 3 + i * 2) * 0.8));
    if (fx) {
      fx.t += dt;
      const k = fx.t;
      inputs.forEach((l) => (l.material.emissiveIntensity = k < 1.5 ? 4 + Math.sin(k * 40) * 2 : l.material.emissiveIntensity));
      beam.material.opacity = k < 1.5 ? Math.min(0.7, k) : Math.max(0, 0.7 - (k - 1.5));
      fx.model.visible = k > 1.2;
      fx.model.rotation.y = k * 2;
      fx.model.userData.animate?.(time, 0);
      if (k > 9) {
        resultSlot.clear();
        fx = null;
        beam.material.opacity = 0;
      }
    }
  };
}

// 🧪 Fuse Machine 嘅「醒目」裝飾（Issue #10）：成個 Hub 都望到
//   - 頂上一條光柱 + 兩個轉圈光環（開咗 = 綠色；未開 = 橙色）
//   - 高高嘅大牌（雙面，面向 Hub 中間）
//   - 地台四角四支燈柱（頂有發光波波）+ 一盞綠燈照住部機
// 回傳 update(time, isOpen, fuseT)：fuseT ≥ 0 = 播緊溶合動畫（光柱閃到最勁）
function buildFuseBeacon(rootScene, liveScene) {
  const { x, z } = FUSE_MACHINE;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  liveScene.add(g);
  const additive = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  // 光柱（由部機頂一直射上天）
  const beamMat = additive(0x76ff03, 0.22);
  const beam = add(g, new THREE.CylinderGeometry(0.55, 0.9, 26, 20, 1, true), beamMat, 0, 6.8 + 13, 0, false);
  const coreMat = additive(0xccff90, 0.5);
  const core = add(g, new THREE.CylinderGeometry(0.16, 0.16, 26, 10, 1, true), coreMat, 0, 6.8 + 13, 0, false);
  // 兩個光環（上下郁）
  const rings = [0, 1].map(() => {
    const r = add(g, new THREE.TorusGeometry(1.5, 0.07, 8, 40), additive(0x76ff03, 0.8), 0, 8, 0, false);
    r.rotation.x = Math.PI / 2;
    return r;
  });
  // 四支燈柱
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xb2ff59, emissive: 0x76ff03, emissiveIntensity: 2.5 });
  const pole = mat(0x37474f, { metalness: 0.6, roughness: 0.4 });
  const stripe = mat(0xffd600, { emissive: 0x332b00 });
  const bulbs = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const px = Math.cos(a) * 4.3;
    const pz = Math.sin(a) * 4.3;
    add(rootScene, new THREE.CylinderGeometry(0.16, 0.2, 2.2, 10), pole, x + px, 1.1, z + pz);
    add(rootScene, new THREE.CylinderGeometry(0.21, 0.21, 0.25, 10), stripe, x + px, 0.6, z + pz);
    add(rootScene, new THREE.CylinderGeometry(0.21, 0.21, 0.25, 10), stripe, x + px, 1.5, z + pz);
    bulbs.push(add(g, new THREE.SphereGeometry(0.3, 14, 10), bulbMat, px, 2.45, pz, false));
    addCollider(x + px, z + pz, 0.3);
  }
  const lamp = new THREE.PointLight(0x76ff03, 14, 13, 1.5);
  lamp.position.set(-2.5, 4, 0);
  g.add(lamp);
  // 高高嘅大牌：兩條柱 + 牌，喺部機後面（離 Hub 中間遠嗰邊），面向 Hub 中間
  const signTheme = { top: '#76ff03', bottom: '#2e7d32', border: '#0b3d0b', text: '#ffffff' };
  const big = dynamicSign(6.2, 1.9);
  const signG = new THREE.Group();
  const away = Math.atan2(x - HUB.cx, z - HUB.cz); // 由 Hub 中間望過嚟：牌喺部機後面
  signG.position.set(x + Math.sin(away) * 4.2, 0, z + Math.cos(away) * 4.2);
  signG.rotation.y = Math.atan2(HUB.cx - signG.position.x, HUB.cz - signG.position.z);
  liveScene.add(signG);
  big.mesh.position.y = 9.6;
  signG.add(big.mesh);
  for (const sx of [-2.9, 2.9]) add(signG, rbox(0.3, 10.6, 0.3), pole, sx, 5.3, -0.06);
  add(signG, rbox(6.6, 0.3, 0.4), stripe, 0, 10.7, -0.06);
  addCollider(signG.position.x + Math.cos(signG.rotation.y) * 2.9, signG.position.z - Math.sin(signG.rotation.y) * 2.9, 0.3);
  addCollider(signG.position.x - Math.cos(signG.rotation.y) * 2.9, signG.position.z + Math.sin(signG.rotation.y) * 2.9, 0.3);
  const GREEN = new THREE.Color(0x76ff03);
  const ORANGE = new THREE.Color(0xff9100);
  return (time, isOpen, fuseT) => {
    const c = isOpen ? GREEN : ORANGE;
    beamMat.color.copy(c);
    rings.forEach((r) => r.material.color.copy(c));
    bulbMat.color.copy(c);
    bulbMat.emissive.copy(c);
    lamp.color.copy(c);
    const fusing = fuseT >= 0 && fuseT < 2;
    beamMat.opacity = fusing ? 0.5 + Math.sin(fuseT * 30) * 0.15 : 0.16 + Math.sin(time * 2) * 0.06;
    coreMat.opacity = fusing ? 0.9 : 0.35 + Math.sin(time * 3) * 0.12;
    beam.rotation.y = time * 0.5;
    rings.forEach((r, i) => {
      const k = (time * 0.25 + i * 0.5) % 1;
      r.position.y = 6.5 + k * 12;
      r.scale.setScalar(1 + k * 0.6);
      r.material.opacity = 0.8 * (1 - k);
    });
    bulbs.forEach((b, i) => (b.scale.setScalar(1 + Math.max(0, Math.sin(time * 4 - i * 1.57)) * 0.25)));
    bulbMat.emissiveIntensity = 2 + Math.sin(time * 4) * 0.8;
    big.draw(isOpen ? signTheme : THEMES.orange, isOpen
      ? [{ text: '🧪 FUSE MACHINE', size: 0.5 }, { text: 'Fuse 3 pets into 1 NEW pet!', size: 0.24, color: '#f4ff81' }]
      : [{ text: '🧪 FUSE MACHINE', size: 0.5 }, { text: `Opens ${openDateText()}`, size: 0.24, color: '#fff59d' }]);
  };
}

// ---------- 遊樂場（滑梯、韆鞦、蹺蹺板） ----------
function buildPlayground(root) {
  const x = 14;
  const z = 51.5;
  const red = mat(0xe53935);
  const blue = mat(0x1e88e5);
  const yellow = mat(0xfdd835);
  roundPad(root, x, z, 5.2, 'sand'); // 沙池（有紋理 + 石框）
  add(root, rbox(1.6, 2.4, 1.6), blue, x - 3.5, 1.2, z - 1); // 滑梯台
  add(root, new THREE.BoxGeometry(1.2, 0.12, 4), yellow, x - 3.5, 1.3, z + 1.4).rotation.x = -0.55;
  for (const s of [-1, 1]) add(root, rbox(0.15, 3, 0.15), red, x + 1.5 + s * 1.6, 1.5, z - 2);
  add(root, rbox(3.5, 0.15, 0.15), red, x + 1.5, 3, z - 2);
  for (const s of [-0.6, 0.6]) {
    add(root, new THREE.BoxGeometry(0.03, 2, 0.03), mat(0x9e9e9e), x + 1.5 + s, 2, z - 2);
    add(root, rbox(0.5, 0.08, 0.35), blue, x + 1.5 + s, 1, z - 2);
  }
  add(root, rbox(4, 0.15, 0.5), yellow, x + 2, 0.6, z + 2.5).rotation.z = 0.2;
  add(root, new THREE.ConeGeometry(0.4, 0.6, 4), red, x + 2, 0.3, z + 2.5);
  addCollider(x - 3.5, z - 1, 1.3);
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
      b.g.position.set(FOUNTAIN.x + Math.cos(a) * b.r, b.h + Math.sin(time * 1.3 + b.phase) * 0.6, FOUNTAIN.z + Math.sin(a) * b.r);
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
    beds.push([s * 4.2, s * 8.4, 12.6, 14.8]); // 出世點旁邊（噴水池樹籬前面）
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
// 圓弧樹籬（a1 → a2）
function hedgeArc(root, cx, cz, r, a1, a2) {
  const steps = Math.max(2, Math.round(((a2 - a1) * r) / 1.5));
  for (let i = 0; i < steps; i++) {
    const p = a1 + ((a2 - a1) * i) / steps;
    const q = a1 + ((a2 - a1) * (i + 1)) / steps;
    hedge(root, cx + Math.cos(p) * r, cz + Math.sin(p) * r, cx + Math.cos(q) * r, cz + Math.sin(q) * r);
  }
}

// ================= 起晒成個 Hub =================
// 排位（2026-10-18 小朋友叫成個 Hub 重新排；由上面望，-z 係生態區）：
//   最上：左 🏃 Training Zone ── 入口（出世點）── 右 🛍️ Shop Street（Skin Shop + Sell Stall）
//   中間：左 ✨ Magic Library ── 噴水池 ── 右 🐾 Pets Zone（地塊 + MY PETS + 地塊升級）
//   下面：💗 Breeding Lab（5 部繁殖機 + 升級牌）+ 右邊 🧪 Fuse Machine
//   最底：左 Owner's Garden（吊床）、右 Playground、大門
export function buildHubPark(root, live) {
  const { cx, cz, r } = HUB;
  const updates = [];

  // 路：十字形 + 噴水池圓環 + 去跑步機／地塊嘅橫路 + 繁殖機前面嘅橫路
  pathStrip(root, 0, 0, 0, cz - 7, 5);
  centralPlaza(root, cx, cz, 9.4); // 傳送門周圍嘅圓形石板廣場
  pathStrip(root, 0, cz + 7, 0, cz + r, 5);
  pathStrip(root, -29, 10.5, 27, 10.5, 3); // 上面一條：Training Zone ── 入口 ── Shop Street
  pathStrip(root, LIBRARY_WALK_X, cz, -7, cz, 3.5); // 去 Magic Library + ☄️ Meteoric Shop（Issue #10：兩間都貼住左邊圍牆）
  pathStrip(root, LIBRARY_WALK_X, LIBRARY.z - 4.5, LIBRARY_WALK_X, METEOR_SHOP.z + 3.5, 3.2); // 兩間門口前面嘅直路
  pathStrip(root, 7, cz, PLOT.minX, cz, 3.5); // 去地塊閘口
  pathStrip(root, -27, 36, 27, 36, 3); // 繁殖機 + Fuse Machine 前面

  // 區域地磚
  tilePad(root, -19.5, 7.5, 20, 12, 'training'); // Training Zone（膠地）
  tilePad(root, 0, 4.2, 10, 7.4, 'entrance'); // 入口廣場（雲石）
  tilePad(root, 17.3, 5.2, 18, 7.6, 'shop'); // Shop Street（藍白格仔）
  roundPad(root, LIBRARY.x, LIBRARY.z, 6.0, 'library'); // Magic Library（紫色星星）
  roundPad(root, METEOR_SHOP.x, METEOR_SHOP.z, 5.6, 'meteor'); // ☄️ Meteoric Shop（深藍星空 + 隕石水晶）
  tilePad(root, 0, 40, 40, 6, 'breeding'); // Breeding Lab（粉紅菱形）
  roundPad(root, FUSE_MACHINE.x, FUSE_MACHINE.z, 4.8, 'fuse'); // Fuse Machine（鋼板 + 黃黑警告邊 + 綠色化學圈；Issue #10 要醒目啲）

  // 區域牌
  zoneSign(live, -19.5, 14.6, '🏃 TRAINING ZONE', THEMES.orange);
  zoneSign(live, 17.3, 13.2, '🛍️ SHOP STREET', THEMES.blue, 17.3, 40);
  zoneSign(live, PLOT.maxX + 1.6, PLOT.gateZ, '🐾 PETS ZONE', THEMES.green); // 地塊後面，由噴水池望過去見到
  zoneSign(live, -20, 33, '🌴 OWNER\'S GARDEN', THEMES.green, -20, 0);
  zoneSign(live, 14, 44.8, '🛝 PLAYGROUND', THEMES.blue, 14, 0);

  // Breeding Lab 拱門（喺繁殖機上面）
  const pink = mat(0xec407a);
  for (const s of [-1, 1]) {
    add(root, rbox(0.8, 6, 0.8), mat(0xf8bbd0), s * 20.5, 3, 40);
    add(root, rbox(1.1, 0.4, 1.1), pink, s * 20.5, 6.2, 40);
    addCollider(s * 20.5, 40, 0.6);
  }
  add(root, rbox(42, 0.5, 0.6), pink, 0, 6.0, 40);
  const lab = makeSign([{ text: '💗 BREEDING LAB', size: 0.5 }], 7, 1.2, THEMES.pink);
  lab.position.set(0, 6.9, 39.6);
  lab.rotation.y = Math.PI;
  live.add(lab);

  // 噴水池：2026-10-19 小朋友叫 Halloween 傳送門取代佢（halloweenWorld.js buildHubPortal，main.js 起）
  flowerBeds(live);
  buildStatues(root);
  buildHammock(root, live);
  updates.push(buildComingSoon(root, live));
  buildPlayground(root);
  buildGate(root, live);
  updates.push(buildBirds(live));

  // 噴水池外面一圈樹籬（十字路口留位）
  for (let q = 0; q < 4; q++) {
    const gap = 0.32;
    hedgeArc(root, cx, cz, 10, (q * Math.PI) / 2 + gap, ((q + 1) * Math.PI) / 2 - gap);
  }
  // 路兩邊嘅樹籬
  for (const s of [-1, 1]) {
    hedge(root, s * 3.2, 12, s * 3.2, 14.5, true);
    hedge(root, s * 3.2, 44, s * 3.2, 58, true);
  }

  // 圍牆內邊種一圈樹（只喺下半部分，避開大門、吊床、遊樂場）
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const tx = cx + Math.cos(a) * (r - 2.6);
    const tz = cz + Math.sin(a) * (r - 2.6);
    if (tz < 33) continue;
    if (Math.abs(tx) < 7) continue; // 大門
    if (Math.hypot(tx - HAMMOCK.x, tz - HAMMOCK.z) < 6) continue;
    if (Math.hypot(tx - 14, tz - 51.5) < 7) continue; // 遊樂場
    if (Math.hypot(tx - METEOR_SHOP.x, tz - METEOR_SHOP.z) < 7) continue; // ☄️ Meteoric Shop
    if (Math.hypot(tx - FUSE_MACHINE.x, tz - FUSE_MACHINE.z) < 7) continue; // 🧪 Fuse Machine（留位俾光柱同大牌）
    tree(root, tx, tz, 0.85 + ((i * 37) % 10) / 25, i % 3 === 0 ? 1 : i % 5 === 0 ? 2 : 0);
  }

  return (dt, time) => updates.forEach((u) => u(dt, time));
}
