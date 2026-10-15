// 新嘅圓形 Hub 裝飾（小朋友 2026-10-15 Issue #1）：
// 中間會噴水嘅噴水池、石像、樹、雀仔、吊床（Owner 瞓喺度）、「Coming Soon」機器、遊樂場、大門口
// 唔會郁嘅放 staticRoot（之後焊埋）；會郁嘅放 live（每格畫面 update）

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HUB } from './hubShape.js';
import { addCollider } from './world.js';
import { buildAnimalModel } from './animalModels.js';
import { findAnimal } from './data/animals.js';
import { applyPetSkin } from './skins.js';
import { makeSign, makeLabel, THEMES } from './signs.js';
import { buildOwner } from './owner.js';

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
function tree(root, x, z, s = 1, kind = 0) {
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

// 平面嘅路（圓環／長條），貼地
const pathMat = mat(0xcfc3a8);
const pathEdge = mat(0xa1957c);
function pathStrip(root, x1, z1, x2, z2, width) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const m = add(root, new THREE.BoxGeometry(width, 0.05, len), pathMat, (x1 + x2) / 2, 0.025, (z1 + z2) / 2, false);
  m.rotation.y = Math.atan2(x2 - x1, z2 - z1);
}
function pathRing(root, x, z, r1, r2) {
  const ring = add(root, new THREE.RingGeometry(r1, r2, 48), pathMat, x, 0.03, z, false);
  ring.rotation.x = -Math.PI / 2;
  const edge = add(root, new THREE.RingGeometry(r2, r2 + 0.25, 48), pathEdge, x, 0.035, z, false);
  edge.rotation.x = -Math.PI / 2;
}

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
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, emissive: 0x0288d1, emissiveIntensity: 0.25, transparent: true, opacity: 0.85, roughness: 0.05, metalness: 0.2 });
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
    ['Giant Panda', 'golden', -12, 19.5, 0.5],
    ['African Savanna Elephant', 'marble', 12, 19.5, -0.5],
    ['Black Rhinoceros', 'golden', -9, 33, 2.4],
    ['Sumatran Tiger', 'marble', 9, 33, -2.4],
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
  owner.g.rotation.set(0, Math.PI / 2, 0); // 頭向 -x
  owner.root.rotation.set(-Math.PI / 2 + 0.22, 0, 0); // 瞓低，個頭少少抬高
  owner.root.position.set(0, 0, 0);
  for (const p of [...owner.legs, ...owner.arms]) p.rotation.set(0, 0, 0);
  owner.arms[0].rotation.x = -0.4;
  owner.head.rotation.set(0, 0, 0);
  owner.alert.visible = false;
  owner.phone.visible = false;
  owner.label.position.set(0, 1.9, -1.6);
}

// 企起身（開場動畫用）
export function standUp(owner, x, z, faceAngle) {
  owner.g.position.set(x, 0, z);
  owner.g.rotation.set(0, faceAngle, 0);
  owner.root.rotation.set(0, 0, 0);
  owner.label.position.set(0, 4.1, 0);
}

// ---------- 「COMING SOON」機器（用帆布冚住、圍住黃色膠帶） ----------
function buildComingSoon(root, live) {
  const x = 23;
  const z = 44;
  const metal = mat(0x78909c, { metalness: 0.6, roughness: 0.4 });
  add(root, rbox(4.2, 0.6, 3.4), mat(0x546e7a), x, 0.3, z);
  add(root, rbox(3.4, 2.8, 2.6), metal, x, 2.0, z);
  // 帆布（藍色、少少皺）
  const tarp = mat(0x1e88e5);
  add(root, rbox(3.7, 2.2, 2.9), tarp, x, 2.4, z);
  add(root, rbox(3.0, 0.8, 2.3), tarp, x - 0.2, 3.8, z + 0.1).rotation.z = 0.08;
  for (const s of [-1, 1]) add(root, new THREE.CylinderGeometry(0.15, 0.15, 1.6, 8), metal, x + s * 1.3, 4.6, z);
  // 膠帶圍欄
  const cone = mat(0xff6d00);
  const tape = mat(0xffd600, { emissive: 0x332b00 });
  const pts = [[-2.8, -2.4], [2.8, -2.4], [2.8, 2.4], [-2.8, 2.4]];
  pts.forEach(([ax, az], i) => {
    add(root, new THREE.ConeGeometry(0.3, 0.8, 8), cone, x + ax, 0.4, z + az);
    const [bx, bz] = pts[(i + 1) % 4];
    const len = Math.hypot(bx - ax, bz - az);
    const t = add(root, new THREE.BoxGeometry(0.04, 0.12, len), tape, x + (ax + bx) / 2, 0.7, z + (az + bz) / 2);
    t.rotation.y = Math.atan2(bx - ax, bz - az);
  });
  // 一粒閃下閃下嘅燈
  const lamp = add(live, new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 2 }), x, 5.1, z, false);
  const sign = makeSign([{ text: 'COMING SOON', size: 0.42 }, { text: 'A new machine is being built...', size: 0.2 }], 3.6, 1.2, THEMES.orange);
  sign.position.set(x, 3.0, z - 1.75);
  sign.rotation.y = Math.PI;
  live.add(sign);
  addCollider(x, z, 2.8);
  return (dt, time) => {
    lamp.material.emissiveIntensity = Math.sin(time * 5) > 0 ? 2.5 : 0.2;
  };
}

// ---------- 遊樂場（滑梯、韆鞦、蹺蹺板） ----------
function buildPlayground(root) {
  const x = 10;
  const z = 52;
  const red = mat(0xe53935);
  const blue = mat(0x1e88e5);
  const yellow = mat(0xfdd835);
  const sand = add(root, new THREE.CylinderGeometry(6, 6, 0.06, 32), mat(0xf3d9a4), x, 0.03, z, false);
  sand.receiveShadow = true;
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
  for (const s of [-1, 1]) {
    add(root, rbox(1.4, 6.5, 1.4), pillar, x + s * 3.6, 3.25, z);
    add(root, rbox(1.7, 0.5, 1.7), cap, x + s * 3.6, 6.7, z);
  }
  add(root, rbox(8.6, 0.7, 0.8), cap, x, 6.0, z);
  const sign = makeSign([{ text: 'ANIMAL RESCUE PARK', size: 0.4 }], 6.6, 1.1, THEMES.green);
  sign.position.set(x, 7.1, z - 0.45);
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
  // 門外：一條路 + 草地（開場動畫架車喺呢度行）
  add(root, new THREE.BoxGeometry(6, 0.05, 60), mat(0x616161), x, 0.02, z + 30, false);
  const outside = add(root, new THREE.BoxGeometry(70, 0.5, 60), mat(0x689f38), x, -0.27, z + 30, false);
  outside.receiveShadow = true;
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    tree(root, x + side * (7 + (i * 7) % 18), z + 6 + i * 3.8, 0.9 + (i % 3) * 0.15, i % 3 === 0 ? 1 : 0);
  }
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

// ---------- 燈柱、長櫈、花圃 ----------
const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff8e1, emissive: 0xffe082, emissiveIntensity: 1.2 });
function lamp(root, x, z) {
  const iron = mat(0x37474f, { metalness: 0.5 });
  add(root, new THREE.CylinderGeometry(0.1, 0.16, 3.4, 8), iron, x, 1.7, z);
  add(root, new THREE.BoxGeometry(0.5, 0.1, 0.5), iron, x, 3.45, z);
  add(root, new THREE.SphereGeometry(0.26, 12, 8), bulbMat, x, 3.75, z, false);
}
function bench(root, x, z, rot) {
  const g = new THREE.Group();
  const wood = mat(0xa1887f);
  const iron = mat(0x424242);
  add(g, new THREE.BoxGeometry(2.2, 0.1, 0.6), wood, 0, 0.55, 0);
  add(g, new THREE.BoxGeometry(2.2, 0.5, 0.08), wood, 0, 0.9, 0.28);
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.08, 0.55, 0.6), iron, s * 0.95, 0.28, 0);
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  root.add(g);
}
const flowerColors = [0xff6b6b, 0xffd93d, 0xff9ff3, 0xffffff, 0x74b9ff, 0xba68c8];
function flowerBed(root, x, z, r, n) {
  const soil = add(root, new THREE.CylinderGeometry(r, r, 0.12, 20), mat(0x6d4c41), x, 0.06, z, false);
  soil.receiveShadow = true;
  for (let i = 0; i < n; i++) {
    const a = i * 2.4;
    const rr = r * Math.sqrt((i + 0.5) / n) * 0.9;
    const fx = x + Math.cos(a) * rr;
    const fz = z + Math.sin(a) * rr;
    add(root, new THREE.BoxGeometry(0.05, 0.4, 0.05), leafB, fx, 0.3, fz, false);
    add(root, new THREE.BoxGeometry(0.2, 0.2, 0.2), mat(flowerColors[i % flowerColors.length]), fx, 0.55, fz, false);
  }
}

// ================= 起晒成個 Hub =================
export function buildHubPark(root, live) {
  const { cx, cz, r } = HUB;
  const updates = [];

  // 路：入口 → 噴水池 → 繁殖機 → 大門；噴水池外面一圈；去跑步機同地塊嘅橫路
  pathStrip(root, 0, 0, 0, cz - 7, 5);
  pathRing(root, cx, cz, 6.2, 9);
  pathStrip(root, 0, cz + 7, 0, cz + r, 5);
  pathStrip(root, -28, 10.5, 12, 10.5, 3);
  pathStrip(root, -24, cz, 24, cz, 3);
  pathStrip(root, -24, 40, 24, 40, 3);

  updates.push(buildFountain(root, live));
  buildStatues(root);
  buildHammock(root, live);
  updates.push(buildComingSoon(root, live));
  buildPlayground(root);
  buildGate(root, live);
  updates.push(buildBirds(live));

  // 噴水池周圍嘅花圃、長櫈、燈
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    lamp(root, cx + Math.cos(a) * 9.6, cz + Math.sin(a) * 9.6);
  }
  for (const a of [0.55, 2.6, 3.7, 5.75]) bench(root, cx + Math.cos(a) * 10.2, cz + Math.sin(a) * 10.2, -a - Math.PI / 2);
  for (const [x, z] of [[-17, 30], [17, 30], [-5, 45], [5, 45], [-26, 33], [26, 33]]) flowerBed(root, x, z, 1.6, 22);
  for (const x of [-24, -12, 12, 24]) lamp(root, x, 41.8);
  for (const z of [6, 14]) {
    lamp(root, -3.2, z);
    lamp(root, 3.2, z);
  }

  // 圍牆內邊種一圈樹（避開入口、大門、地塊、跑步機、皮膚商店）
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const tx = cx + Math.cos(a) * (r - 2.6);
    const tz = cz + Math.sin(a) * (r - 2.6);
    if (tz < 26) continue; // 上半部分有攤位
    if (Math.abs(tx) < 7) continue; // 大門
    if (Math.hypot(tx - HAMMOCK.x, tz - HAMMOCK.z) < 7) continue;
    if (Math.hypot(tx - 23, tz - 44) < 5) continue; // Coming Soon
    tree(root, tx, tz, 0.85 + ((i * 37) % 10) / 25, i % 3 === 0 ? 1 : i % 5 === 0 ? 2 : 0);
  }
  // 草地上嘅細花（隨機但固定）
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) {
    const a = rand() * Math.PI * 2;
    const rr = 10 + rand() * (r - 13);
    const fx = cx + Math.cos(a) * rr;
    const fz = cz + Math.sin(a) * rr;
    if (fz < 26 || Math.abs(fx) < 3.5) continue;
    add(root, new THREE.BoxGeometry(0.16, 0.16, 0.16), mat(flowerColors[i % flowerColors.length]), fx, 0.12, fz, false);
  }

  return (dt, time) => updates.forEach((u) => u(dt, time));
}
