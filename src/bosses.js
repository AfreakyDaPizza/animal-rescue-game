// Boss：每個生態區一個，方塊（Roblox）風格，跑起上嚟手腳會擺
// 只有你借咗佢生態區嘅動物，佢先會追你；佢唔可以走出自己嘅生態區

import * as THREE from 'three';
import { buildGuardianRig } from './enchantedModels.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { biomeRect, STEM, KINGDOM_Y } from './world.js';
import { makeLabel } from './signs.js';
import { BOSSES } from './data/balance.js';
import { walkSpeed } from './player.js';

const CATCH_DISTANCE = 1.5;
const RED = new THREE.Color(0xff1744);

const materials = new Map();
function mat(color, extra) {
  const key = color + JSON.stringify(extra || {});
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }));
  return materials.get(key);
}
function box(parent, w, h, d, color, x = 0, y = 0, z = 0, extra) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.15), mat(color, extra));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function pivot(parent, x, y, z) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  parent.add(p);
  return p;
}

// Roblox 款公仔：頭、身、兩隻手、兩隻腳（手腳由膊頭／髖關節轉）
function blockPerson({ shirt, pants, skin = 0xf5c99b, shoes = 0x3e2723, arms: armColor = shirt }) {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.27, 1.2, 0);
    box(hip, 0.5, 1.0, 0.5, pants, 0, -0.5, 0);
    box(hip, 0.52, 0.22, 0.6, shoes, 0, -1.08, -0.04);
    return hip;
  });
  const torso = box(root, 1.05, 1.15, 0.55, shirt, 0, 1.78, 0);
  const arms = [-1, 1].map((s) => {
    const shoulder = pivot(root, s * 0.78, 2.25, 0);
    box(shoulder, 0.45, 1.0, 0.45, armColor, 0, -0.45, 0);
    box(shoulder, 0.42, 0.25, 0.42, skin, 0, -1.05, 0); // 手
    return shoulder;
  });
  const head = pivot(root, 0, 2.72, 0);
  box(head, 0.8, 0.8, 0.8, skin, 0, 0, 0);
  // 嬲嬲樣
  for (const s of [-1, 1]) {
    box(head, 0.13, 0.17, 0.04, 0xff1744, s * 0.18, 0.05, -0.41, { emissive: 0xff1744, emissiveIntensity: 2.5 }); // 發紅光嘅眼
    box(head, 0.05, 0.05, 0.02, 0xffffff, s * 0.18 + 0.03, 0.09, -0.435);
    const brow = box(head, 0.24, 0.07, 0.05, 0x3e2723, s * 0.18, 0.21, -0.42);
    brow.rotation.z = s * 0.35;
  }
  box(head, 0.3, 0.06, 0.04, 0x5d1f1f, 0, -0.2, -0.41);
  return { g, root, legs, arms, head, torso };
}

function lumberjack() {
  const p = blockPerson({ shirt: 0xc62828, pants: 0x1e4f9c });
  for (const y of [1.45, 1.75, 2.05]) box(p.root, 1.08, 0.08, 0.58, 0x212121, 0, y, 0); // 格仔恤衫
  for (const x of [-0.25, 0.25]) box(p.root, 0.1, 1.15, 0.58, 0x212121, x, 1.78, 0);
  box(p.head, 0.82, 0.4, 0.25, 0x6d4c41, 0, -0.25, -0.32); // 大鬍鬚
  box(p.head, 0.86, 0.3, 0.86, 0xc62828, 0, 0.45, 0); // 冷帽
  box(p.head, 0.2, 0.2, 0.2, 0xffffff, 0, 0.68, 0);
  // 斧頭
  const axe = pivot(p.arms[1], 0, -1.05, -0.2);
  box(axe, 0.1, 1.4, 0.1, 0x8d6e63, 0, 0.35, 0);
  box(axe, 0.1, 0.45, 0.5, 0xcfd8dc, 0, 0.9, -0.22, { metalness: 0.7, roughness: 0.3 });
  axe.rotation.x = -1.2;
  return p;
}

// Biome 2 Boss：Captain Oil Spill（小朋友 2026-10-15 話舊嗰個好醜）：
// 船長企喺一隻漏油嘅細油輪入面「揸船」喺沙灘衝，煙囪噴黑煙，船底滴油
function captainOil() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  // 腳收埋喺船入面（animateRig 要用）
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.3, 0.9, 0);
    box(hip, 0.4, 0.6, 0.4, 0x263238, 0, -0.3, 0);
    return hip;
  });
  // 油輪：黑色船身、紅色船底、白色字帶、尖船頭（-z）
  const hull = pivot(root, 0, 0, 0);
  box(hull, 2.6, 0.5, 3.6, 0xb71c1c, 0, 0.35, 0.2); // 紅色船底
  box(hull, 2.8, 0.75, 3.8, 0x212121, 0, 0.95, 0.2, { metalness: 0.4, roughness: 0.3 }); // 黑色船身
  box(hull, 2.85, 0.14, 3.85, 0xeceff1, 0, 1.1, 0.2); // 白帶
  const bow = box(hull, 1.98, 0.75, 1.98, 0x212121, 0, 0.95, -1.6, { metalness: 0.4, roughness: 0.3 });
  bow.rotation.y = Math.PI / 4; // 尖船頭
  box(hull, 0.9, 0.5, 0.06, 0xffd600, 0.9, 0.95, 2.12); // 「OIL」牌
  for (const s of [-1, 1]) box(hull, 0.06, 0.5, 2.4, 0x5d4037, s * 1.42, 1.5, 0.6); // 船邊欄杆
  // 後面嘅煙囪 + 油桶
  box(hull, 0.6, 1.5, 0.6, 0xd32f2f, 0, 1.9, 1.6);
  box(hull, 0.7, 0.2, 0.7, 0x212121, 0, 2.7, 1.6);
  for (const s of [-1, 1]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 12), mat(0x1565c0, { metalness: 0.5 }));
    barrel.position.set(s * 0.85, 1.6, 1.4);
    barrel.castShadow = true;
    hull.add(barrel);
  }
  // 船長：深藍外套 + 金鈕 + 金肩章
  const torso = box(root, 1.1, 1.1, 0.6, 0x1a237e, 0, 1.95, -0.2);
  for (let i = 0; i < 3; i++) box(root, 0.1, 0.1, 0.04, 0xffd600, 0.18, 2.25 - i * 0.28, -0.52, { metalness: 0.9 });
  const arms = [-1, 1].map((s) => {
    const shoulder = pivot(root, s * 0.8, 2.4, -0.2);
    box(shoulder, 0.5, 0.18, 0.5, 0xffd600, 0, 0.08, 0, { metalness: 0.8 }); // 肩章
    box(shoulder, 0.42, 0.9, 0.42, 0x1a237e, 0, -0.42, 0);
    box(shoulder, 0.4, 0.22, 0.4, 0x212121, 0, -0.95, 0); // 黑手套（沾晒油）
    return shoulder;
  });
  const head = pivot(root, 0, 2.9, -0.2);
  box(head, 0.82, 0.82, 0.82, 0xf5c99b, 0, 0, 0);
  for (const s of [-1, 1]) {
    box(head, 0.14, 0.17, 0.04, 0xff1744, s * 0.18, 0.08, -0.42, { emissive: 0xff1744, emissiveIntensity: 2.5 });
    const brow = box(head, 0.26, 0.07, 0.05, 0x111111, s * 0.18, 0.24, -0.43);
    brow.rotation.z = s * 0.35;
  }
  box(head, 0.86, 0.4, 0.2, 0x111111, 0, -0.26, -0.36); // 黑色大鬍子
  for (let i = 0; i < 3; i++) box(head, 0.12, 0.2 + (i % 2) * 0.12, 0.1, 0x111111, -0.25 + i * 0.25, -0.55, -0.38); // 鬍子滴油
  // 船長帽
  box(head, 1.0, 0.12, 1.05, 0x111111, 0, 0.46, -0.05); // 帽簷
  box(head, 0.95, 0.38, 0.95, 0x1a237e, 0, 0.66, 0);
  box(head, 0.97, 0.1, 0.97, 0xffd600, 0, 0.5, 0, { metalness: 0.8 });
  box(head, 0.24, 0.3, 0.06, 0x111111, 0, 0.7, -0.49); // 油滴徽章
  // 煙
  const smoke = [];
  for (let i = 0; i < 5; i++) {
    const puff = box(root, 0.6, 0.6, 0.6, 0x212121, 0, 3, 1.6, { transparent: true, opacity: 0.75 });
    puff.material = puff.material.clone();
    puff.castShadow = false;
    smoke.push(puff);
  }
  // 船底滴油
  const drips = [];
  for (let i = 0; i < 3; i++) {
    const d = box(root, 0.18, 0.25, 0.18, 0x111111, -0.8 + i * 0.8, 0.1, 1.5, { metalness: 0.6, roughness: 0.1 });
    drips.push(d);
  }
  g.userData.extra = (t) => {
    smoke.forEach((p, i) => {
      const k = (t * 0.7 + i / 5) % 1;
      p.position.set(Math.sin(k * 5) * 0.3, 2.9 + k * 2.5, 1.6 + k * 1.2);
      p.scale.setScalar(0.6 + k * 1.2);
      p.material.opacity = 0.75 * (1 - k);
    });
    drips.forEach((d, i) => {
      const k = (t * 1.5 + i / 3) % 1;
      d.position.y = 0.3 - k * 0.3;
      d.scale.setScalar(1 - k * 0.6);
    });
    hull.rotation.z = Math.sin(t * 2) * 0.04; // 好似喺水上面搖
    hull.rotation.x = Math.sin(t * 1.6) * 0.03;
  };
  return { g, root, legs, arms, head, torso };
}

function hunter() {
  const p = blockPerson({ shirt: 0x556b2f, pants: 0x8d7b5f });
  for (let i = 0; i < 6; i++) box(p.root, 0.3, 0.25, 0.04, i % 2 ? 0x3e4a1f : 0x8d7b4f, ((i % 3) - 1) * 0.32, 1.5 + Math.floor(i / 3) * 0.5, -0.29); // 迷彩
  box(p.head, 1.3, 0.08, 1.3, 0x6d4c41, 0, 0.42, 0); // 闊邊帽
  box(p.head, 0.82, 0.35, 0.82, 0x6d4c41, 0, 0.6, 0);
  // 捕網（唔係槍）
  const net = pivot(p.arms[1], 0, -1.05, -0.2);
  box(net, 0.08, 1.8, 0.08, 0x8d6e63, 0, 0.6, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 4), mat(0x5d4037));
  ring.position.set(0, 1.7, 0);
  ring.rotation.set(Math.PI / 2, 0, Math.PI / 4);
  net.add(ring);
  const bag = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.7, 4, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
  bag.position.set(0, 1.35, 0);
  bag.rotation.set(Math.PI, Math.PI / 4, 0);
  net.add(bag);
  net.rotation.x = -1.0;
  return p;
}

function oilDriller() {
  const p = blockPerson({ shirt: 0xef6c00, pants: 0xef6c00, shoes: 0x212121 });
  for (const x of [-0.28, 0.28]) box(p.root, 0.1, 1.15, 0.58, 0xffeb3b, x, 1.78, 0); // 反光帶
  box(p.root, 1.08, 0.1, 0.58, 0xffeb3b, 0, 1.5, 0);
  for (let i = 0; i < 4; i++) box(p.root, 0.2, 0.15, 0.04, 0x111111, ((i * 3) % 4 - 1.5) * 0.25, 1.4 + i * 0.2, -0.29); // 油漬
  box(p.head, 0.92, 0.32, 0.92, 0xffd600, 0, 0.45, 0); // 安全帽
  box(p.head, 1.0, 0.06, 1.1, 0xffd600, 0, 0.3, -0.05);
  const wrench = pivot(p.arms[1], 0, -1.05, -0.2);
  box(wrench, 0.12, 1.3, 0.08, 0x9e9e9e, 0, 0.45, 0, { metalness: 0.8, roughness: 0.3 });
  box(wrench, 0.4, 0.3, 0.1, 0x9e9e9e, 0, 1.15, 0, { metalness: 0.8, roughness: 0.3 });
  box(wrench, 0.14, 0.18, 0.12, 0x616161, 0, 1.25, 0);
  wrench.rotation.x = -1.1;
  return p;
}

function smugglerKing() {
  const p = blockPerson({ shirt: 0x212121, pants: 0x212121, shoes: 0x000000 });
  box(p.root, 0.35, 0.9, 0.04, 0xffffff, 0, 1.85, -0.28); // 白恤衫
  box(p.root, 0.12, 0.7, 0.05, 0xd50000, 0, 1.8, -0.3); // 呔
  box(p.head, 0.7, 0.16, 0.06, 0x111111, 0, 0.06, -0.42, { metalness: 0.5 }); // 黑超
  box(p.head, 0.86, 0.22, 0.86, 0xffd600, 0, 0.5, 0, { metalness: 0.8, roughness: 0.25 }); // 皇冠
  for (const [x, z] of [[-0.33, -0.33], [0.33, -0.33], [-0.33, 0.33], [0.33, 0.33], [0, -0.38]]) {
    box(p.head, 0.16, 0.25, 0.16, 0xffd600, x, 0.72, z, { metalness: 0.8, roughness: 0.25 });
  }
  box(p.head, 0.1, 0.1, 0.04, 0xe53935, 0, 0.5, -0.44); // 紅寶石
  const cape = box(p.root, 1.2, 2.0, 0.08, 0xb71c1c, 0, 1.55, 0.36);
  cape.rotation.x = 0.12;
  const bag = pivot(p.arms[0], 0, -1.2, 0);
  box(bag, 0.18, 0.5, 0.7, 0x4e342e, 0, -0.2, 0);
  box(bag, 0.2, 0.08, 0.25, 0xffd600, 0, 0.1, 0);
  p.g.userData.extra = (t) => (cape.rotation.x = 0.12 + Math.abs(Math.sin(t * 3)) * 0.15);
  return p;
}

// Biome 6：Mega Digger — 黃色挖土機機械人，有履帶腳同大鏟手
function megaDigger() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const yellow = 0xffb300;
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.65, 1.1, 0);
    box(hip, 0.6, 1.0, 1.4, 0x424242, 0, -0.5, 0); // 履帶
    for (let i = 0; i < 4; i++) box(hip, 0.62, 0.12, 0.2, 0x212121, 0, -0.95, -0.55 + i * 0.37);
    return hip;
  });
  const torso = box(root, 1.9, 1.4, 1.4, yellow, 0, 1.85, 0);
  box(root, 1.95, 0.15, 1.45, 0x212121, 0, 1.25, 0); // 黑黃警告帶
  for (let i = 0; i < 5; i++) box(root, 0.18, 0.16, 1.46, yellow, -0.8 + i * 0.4, 1.25, 0);
  const head = pivot(root, 0, 2.9, -0.1);
  box(head, 1.2, 0.8, 1.0, yellow, 0, 0, 0); // 駕駛室
  box(head, 1.0, 0.5, 0.06, 0x80deea, 0, 0.05, -0.51, { metalness: 0.5, roughness: 0.1 }); // 玻璃
  for (const s of [-1, 1]) {
    box(head, 0.2, 0.2, 0.04, 0xff1744, s * 0.25, 0.08, -0.55, { emissive: 0xd50000 });
    const brow = box(head, 0.35, 0.08, 0.05, 0x212121, s * 0.25, 0.3, -0.56);
    brow.rotation.z = s * 0.35;
  }
  box(head, 0.08, 0.5, 0.08, 0x9e9e9e, 0.45, 0.6, 0.2); // 天線
  box(head, 0.16, 0.16, 0.16, 0xff1744, 0.45, 0.9, 0.2, { emissive: 0xd50000 });
  const arms = [-1, 1].map((s) => {
    const shoulder = pivot(root, s * 1.15, 2.3, 0);
    box(shoulder, 0.4, 1.2, 0.4, yellow, 0, -0.55, 0);
    if (s === 1) {
      // 大鏟
      box(shoulder, 0.9, 0.5, 0.7, 0x757575, 0, -1.3, -0.2, { metalness: 0.6 });
      for (let i = 0; i < 3; i++) box(shoulder, 0.15, 0.25, 0.15, 0xbdbdbd, -0.3 + i * 0.3, -1.6, -0.45);
    } else box(shoulder, 0.45, 0.35, 0.45, 0x757575, 0, -1.25, 0);
    return shoulder;
  });
  return { g, root, legs, arms, head, torso };
}

const BUILDERS = [lumberjack, captainOil, hunter, oilDriller, smugglerKing, megaDigger, buildGuardianRig]; // 7：Enchanted Royal Guardian
// 每個 Boss 嘅主題色（光環同碎片）
const AURA_COLORS = [0xff7043, 0x7c4dff, 0xffab00, 0x00b0ff, 0xffd600, 0xff9100, 0xffd54f];

// 開場動畫用：攞一個 Boss 公仔
export const buildBossRig = (i) => BUILDERS[i]();

export function createBosses(scene) {
  return BOSSES.map((info, biome) => {
    const rect = biomeRect(biome);
    const rig = BUILDERS[biome]();
    const group = new THREE.Group();
    rig.g.scale.setScalar(1.1);
    group.add(rig.g);

    const label = makeLabel([{ text: `BOSS: ${info.name}`, color: '#ff5252' }, { text: `${info.speed.toLocaleString('en-US')} Speed`, color: '#ffeb3b' }], 1.1);
    label.position.y = 4.7;
    group.add(label);

    // 暈咗時頭頂轉圈嘅星星
    const stars = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.17), new THREE.MeshBasicMaterial({ color: 0xffeb3b }));
      const a = (i / 5) * Math.PI * 2;
      star.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7);
      stars.add(star);
    }
    stars.position.y = 4.0;
    stars.visible = false;
    group.add(stars);

    // Mega Digger 守喺山腳前面（山中間佢入唔到）
    // 型啲：腳下光環 + 身邊轉嘅發光碎片
    const color = AURA_COLORS[biome];
    const auraMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    const aura = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.9, 40), auraMat);
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.06;
    group.add(aura);
    const auraInner = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.75, 6), auraMat);
    auraInner.rotation.x = -Math.PI / 2;
    auraInner.position.y = 0.07;
    group.add(auraInner);
    const shardMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.5 });
    const shards = [];
    for (let i = 0; i < 6; i++) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), shardMat);
      shard.scale.y = 1.8;
      group.add(shard);
      shards.push(shard);
    }
    const home = biome === 6 ? new THREE.Vector3(0, KINGDOM_Y, rect.minZ + 18) // Biome 7：守喺皇宮前面（天空王國嘅高度）
      : new THREE.Vector3(0, 0, biome === 5 ? rect.maxZ - 8 : rect.minZ + 4);
    group.position.copy(home);
    scene.add(group);
    return { biome, info, rect, group, rig, stars, home, aura, auraInner, auraMat, auraColor: new THREE.Color(color), shards, mode: 'guard', stun: 0, grace: 0, runPhase: 0, angry: 0 };
  });
}

export function bossSpeed(boss) {
  return walkSpeed(boss.info.speed);
}

// 手腳動畫：moving 0 = 企定，1 = 全速跑
export function animateRig(b, dt, time, moving) {
  const { rig } = b;
  b.runPhase += dt * (4 + 8 * moving);
  const swing = Math.sin(b.runPhase) * 0.9 * moving;
  rig.legs[0].rotation.x = swing;
  rig.legs[1].rotation.x = -swing;
  rig.arms[0].rotation.x = -swing + Math.sin(time * 1.5) * 0.05;
  rig.arms[1].rotation.x = swing * 0.6 - 0.2;
  rig.root.position.y = Math.abs(Math.sin(b.runPhase)) * 0.12 * moving;
  rig.root.rotation.x = -0.12 * moving; // 跑嗰陣向前傾
  rig.torso.scale.y = 1 + Math.sin(time * 2) * 0.015; // 呼吸
  if (rig.g.userData.extra) rig.g.userData.extra(time);
}

// mode：guard（守住）→ chase（追）→ stunned（暈）／ return（返屋企）
// 回傳捉到玩家嗰個 Boss（冇就 null）
export function updateBosses(bosses, dt, time, player) {
  let caught = null;
  for (const b of bosses) {
    const pos = b.group.position;
    const inBiome = player.z <= b.rect.maxZ && player.z >= b.rect.minZ;
    const dist = Math.hypot(player.x - pos.x, player.z - pos.z);
    b.grace = Math.max(0, b.grace - dt);
    // 光環同碎片動畫：追緊你就變紅、變大、轉快啲
    b.angry += ((b.mode === 'chase' ? 1 : 0) - b.angry) * Math.min(1, dt * 4);
    const pulse = 1 + Math.sin(time * 4) * 0.08;
    b.aura.scale.setScalar((1 + b.angry * 0.5) * pulse);
    b.aura.rotation.z = time * 0.5;
    b.auraInner.rotation.z = -time * (1 + b.angry * 3);
    b.auraMat.color.copy(b.auraColor).lerp(RED, b.angry);
    b.auraMat.opacity = 0.45 + b.angry * 0.3;
    b.shards.forEach((shard, i) => {
      const a = time * (1.2 + b.angry * 2.5) + (i / b.shards.length) * Math.PI * 2;
      const r = 1.6 + b.angry * 0.4;
      shard.position.set(Math.cos(a) * r, 1.6 + Math.sin(time * 2 + i) * 0.6, Math.sin(a) * r);
      shard.rotation.y = time * 3;
    });
    b.rig.g.scale.setScalar(1.1 * (1 + b.angry * 0.12)); // 嬲起上嚟大隻啲

    if (b.mode === 'stunned') {
      b.stun -= dt;
      b.stars.visible = true;
      b.stars.rotation.y = time * 4;
      b.rig.root.rotation.z = Math.sin(time * 6) * 0.15;
      animateRig(b, dt, time, 0);
      if (b.stun <= 0) {
        b.mode = 'return';
        b.stars.visible = false;
        b.rig.root.rotation.z = 0;
      }
      continue;
    }

    // 只追借咗佢動物嘅玩家；走出佢個生態區都照追（小朋友 2026-10-11），追到 Hub 門口為止
    const carryingMine = player.carryingBiome === b.biome;
    const wantsToChase = b.grace <= 0 && carryingMine && (inBiome || b.mode === 'chase');
    if (wantsToChase) b.mode = 'chase';
    else if (b.mode === 'chase') b.mode = 'return';

    let target = null;
    let speed = bossSpeed(b);
    if (b.mode === 'chase') target = player;
    else if (b.mode === 'return') {
      target = b.home;
      speed = Math.min(speed, 15); // 行返屋企（可能要經過幾個生態區）
    }

    let moving = 0;
    if (target) {
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.05) {
        const step = Math.min(d, speed * dt);
        pos.x += (dx / d) * step;
        pos.z += (dz / d) * step;
        b.group.rotation.y = Math.atan2(-dx, -dz);
        moving = b.mode === 'chase' ? 1 : 0.6;
      }
      // 留喺生態區通道入面：可以向 Hub 方向追出去，但唔可以入 Hub（Hub 係安全區）
      // Biome 7（天空王國）：留喺王國入面（闊啲），唔會飛出條橋
      const limitX = b.biome === 6 ? (b.rect.maxX - b.rect.minX) / 2 - 2 : (STEM.maxX - STEM.minX) / 2 - 1;
      pos.x = THREE.MathUtils.clamp(pos.x, -limitX, limitX);
      pos.z = THREE.MathUtils.clamp(pos.z, b.rect.minZ + 1, b.biome === 6 ? b.rect.maxZ - 2 : STEM.maxZ - 1);
      if (b.mode === 'return' && d < 0.3) b.mode = 'guard';
    } else if (inBiome) {
      // 守住：望住玩家
      b.group.rotation.y = Math.atan2(-(player.x - pos.x), -(player.z - pos.z));
    }
    animateRig(b, dt, time, moving);

    // Boss 唔識跳：你企喺高處佢捉你唔到
    if (b.mode === 'chase' && dist < CATCH_DISTANCE && (player.feetY ?? 0) - b.group.position.y < 1.5 && !caught) caught = b;
  }
  return caught;
}

export function stunBoss(boss, seconds) {
  boss.mode = 'stunned';
  boss.stun = seconds;
}

// 冇咗動物就返屋企，幾秒內唔會再追
export function sendBossHome(boss) {
  boss.mode = 'return';
  boss.grace = 3;
}

export function resetBosses(bosses) {
  for (const b of bosses) {
    b.group.position.copy(b.home);
    b.mode = 'guard';
    b.stars.visible = false;
  }
}
