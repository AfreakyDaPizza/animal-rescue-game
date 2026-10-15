// 每個生態區（同 Hub）嘅裝飾：樹、珊瑚、冰、箱…
// 裝飾放喺兩邊，中間留條路（|x| < 3）俾玩家行。

import * as THREE from 'three';
import { addPlatform } from './world.js';
// 裝飾全部可以行穿（小朋友話太多嘢擋路）

// 固定嘅「隨機」：每次開遊戲裝飾都喺同一個位，唔會成日變
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 同一種顏色共用一份物料（焊埋時先合得埋做一件）
const materialCache = new Map();
const mat = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, ...extra }));
  return materialCache.get(key);
};

function add(scene, mesh, x, y, z, shadow = true) {
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// 喺生態區兩邊揀一個位（中間條路留空）
function sidePosition(rand, rect) {
  const side = rand() < 0.5 ? -1 : 1;
  const half = (rect.maxX - rect.minX) / 2;
  const x = side * (4 + rand() * (half - 5.2));
  const z = rect.minZ + 1.5 + rand() * (rect.maxZ - rect.minZ - 3);
  return [x, z];
}

// 地方大啲，裝飾就多啲（以 14×20 為 1 倍）
const density = (rect) => Math.min(2.5, ((rect.maxX - rect.minX) * (rect.maxZ - rect.minZ)) / (14 * 20)); // 最多 2.5 倍，唔好太迫

// ---------------- 樹 ----------------
const trunkMat = mat(0x6b4423);
const leafMat = mat(0x2e7d32);
const leafMat2 = mat(0x43a047);

// 方塊松樹：樹幹 + 三層越嚟越細嘅葉
function pineTree(scene, x, z, s = 1) {
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.45 * s, 1.6 * s, 0.45 * s), trunkMat), x, 0.8 * s, z);
  [[2.4, 1.0, 2.0], [1.8, 0.9, 2.8], [1.1, 0.8, 3.5]].forEach(([w, h, y], i) => {
    const layer = add(scene, new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, w * s), i % 2 ? leafMat2 : leafMat), x, y * s, z);
    layer.rotation.y = i * 0.4;
  });
}

// 方塊大樹：樹幹 + 幾嚿方形樹冠
function roundTree(scene, x, z, s = 1) {
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.6 * s, 4 * s, 0.6 * s), trunkMat), x, 2 * s, z);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(3 * s, 2 * s, 3 * s), leafMat), x, 4.6 * s, z);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(2 * s, 1.4 * s, 2 * s), leafMat2), x + 0.6 * s, 5.8 * s, z + 0.3 * s);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.6 * s, 1.2 * s, 1.6 * s), leafMat2), x - 0.8 * s, 5.2 * s, z - 0.7 * s);
}

// ---------------- 生態區 ----------------
// scene：放唔會郁嘅裝飾（之後會焊埋做一大件，畫得快啲）；live：放會郁嘅嘢
export function decorateBiome(scene, i, rect, live) {
  const rand = seededRandom(100 + i);
  return [deforestation, ocean, birds, arctic, smugglers, mining][i](scene, rect, rand, live);
}

// Biome 1：砍伐森林 — 有啲樹仲企喺度，有啲已經俾人斬咗淨返樹頭
function deforestation(scene, rect, rand) {
  const k = density(rect);
  const stumpMat = mat(0x8b5a2b);
  const ringMat = mat(0xd2a76a);
  for (let n = 0; n < 7 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    pineTree(scene, x, z, 0.9 + rand() * 0.5);
  }
  for (let n = 0; n < 9 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    const r = 0.3 + rand() * 0.2;
    add(scene, new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.2, 0.5, 10), stumpMat), x, 0.25, z);
    add(scene, new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.02, 10), ringMat), x, 0.51, z, false);
  }
  // 倒咗喺地嘅木
  for (let n = 0; n < 3 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.5, 10), stumpMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = rand() * Math.PI;
    add(scene, log, x, 0.3, z);
  }
  return null;
}

// Biome 2：污染海洋 — 淺水、珊瑚、海草，仲有油污同膠樽
function ocean(scene, rect, rand, live) {
  const k = density(rect);
  const w = rect.maxX - rect.minX;
  const d = rect.maxZ - rect.minZ;
  const cx = (rect.minX + rect.maxX) / 2;
  const cz = (rect.minZ + rect.maxZ) / 2;

  // 珊瑚
  const coralColors = [0xff7f50, 0xff6f91, 0xffc75f, 0xc34a36, 0x9b59b6];
  for (let n = 0; n < 14 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    const coral = new THREE.Group();
    const color = coralColors[n % coralColors.length];
    for (let k = 0; k < 4; k++) {
      const branch = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.8 + rand() * 0.8, 6), mat(color));
      branch.position.set((rand() - 0.5) * 0.5, 0.5, (rand() - 0.5) * 0.5);
      branch.rotation.set((rand() - 0.5) * 0.8, 0, (rand() - 0.5) * 0.8);
      branch.castShadow = true;
      coral.add(branch);
    }
    coral.position.set(x, 0, z);
    scene.add(coral);
  }

  // 石
  for (let n = 0; n < 6 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + rand() * 0.4), mat(0x7a7a7a, { flatShading: true }));
    add(scene, rock, x, 0.2, z);
  }

  // 海草（會擺嚟擺去）
  const seaweed = [];
  for (let n = 0; n < 20 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.2 + rand(), 4), mat(0x2e8b57));
    blade.geometry.translate(0, (1.2 + rand()) / 2, 0); // 由根部擺動
    add(live, blade, x, 0, z, false);
    seaweed.push({ blade, phase: rand() * 6 });
  }

  // 膠樽（污染）
  const bottleMat = mat(0x9fd8ef, { transparent: true, opacity: 0.7 });
  for (let n = 0; n < 6 * k; n++) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8), bottleMat);
    bottle.rotation.z = Math.PI / 2;
    bottle.rotation.y = rand() * Math.PI;
    add(scene, bottle, (rand() - 0.5) * (w - 4), 0.1, rect.minZ + 1 + rand() * (d - 2), false);
  }

  // 水（半透明，有波浪）
  const waterGeo = new THREE.PlaneGeometry(w, d, Math.round(w), Math.round(d));
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(
    waterGeo,
    new THREE.MeshStandardMaterial({ color: 0x1e88c8, transparent: true, opacity: 0.45, roughness: 0.2, metalness: 0.1 }),
  );
  water.position.set(cx, 0.35, cz);
  live.add(water);
  const basePositions = waterGeo.attributes.position.array.slice();

  // 油污（浮喺水面嘅黑色一灘灘）
  const oilMat = mat(0x1a1a22, { transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.6 });
  for (let n = 0; n < 4 * k; n++) {
    const oil = new THREE.Mesh(new THREE.CircleGeometry(0.8 + rand() * 0.8, 16), oilMat);
    oil.rotation.x = -Math.PI / 2;
    oil.scale.y = 0.6 + rand() * 0.5;
    add(scene, oil, (rand() - 0.5) * (w - 6), 0.38, rect.minZ + 2 + rand() * (d - 4), false);
  }

  return (dt, t) => {
    const pos = waterGeo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const x = basePositions[k * 3];
      const z = basePositions[k * 3 + 2];
      pos.array[k * 3 + 1] = Math.sin(x * 0.8 + t * 1.5) * 0.06 + Math.cos(z * 0.6 + t) * 0.06;
    }
    pos.needsUpdate = true;
    waterGeo.computeVertexNormals();
    for (const s of seaweed) s.blade.rotation.z = Math.sin(t * 1.2 + s.phase) * 0.25;
  };
}

// Biome 3：雀鳥偷獵場 — 熱帶森林、花，色彩繽紛嘅雀喺天上飛
function birds(scene, rect, rand, live) {
  const k = density(rect);
  for (let n = 0; n < 8 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    roundTree(scene, x, z, 0.8 + rand() * 0.5);
  }
  // 蕨類 / 大葉
  for (let n = 0; n < 16 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + rand() * 0.3, 0), mat(0x2e7d32, { flatShading: true }));
    bush.scale.y = 0.6;
    add(scene, bush, x, 0.25, z);
  }
  // 熱帶花
  const flowerColors = [0xff1744, 0xffea00, 0xff9100, 0xd500f9];
  for (let n = 0; n < 30 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    add(scene, new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mat(flowerColors[n % 4])), x, 0.3, z, false);
  }

  // 飛緊嘅雀（身 + 兩隻翼）
  const birdColors = [0x1565c0, 0xd32f2f, 0x2e7d32, 0xffb300, 0x6a1b9a];
  const flock = [];
  for (let n = 0; n < 7 * k; n++) {
    const color = birdColors[n % birdColors.length];
    const bird = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.7, 6), mat(color));
    body.rotation.x = Math.PI / 2;
    bird.add(body);
    const wingGeo = new THREE.BoxGeometry(0.6, 0.03, 0.25);
    const left = new THREE.Mesh(wingGeo, mat(color));
    const right = new THREE.Mesh(wingGeo, mat(color));
    left.geometry = wingGeo.clone().translate(-0.3, 0, 0);
    right.geometry = wingGeo.clone().translate(0.3, 0, 0);
    bird.add(left, right);
    live.add(bird);
    flock.push({
      bird, left, right,
      cx: (rand() - 0.5) * 10, cz: (rect.minZ + rect.maxZ) / 2 + (rand() - 0.5) * (rect.maxZ - rect.minZ - 10),
      radius: 3 + rand() * 5, height: 6 + rand() * 5, speed: 0.4 + rand() * 0.5, phase: rand() * 6,
    });
  }
  return (dt, t) => {
    for (const f of flock) {
      const a = t * f.speed + f.phase;
      f.bird.position.set(f.cx + Math.cos(a) * f.radius, f.height + Math.sin(t * 2 + f.phase) * 0.3, f.cz + Math.sin(a) * f.radius);
      f.bird.rotation.y = -a; // 望住飛緊嘅方向
      const flap = Math.sin(t * 12 + f.phase) * 0.6;
      f.left.rotation.z = flap;
      f.right.rotation.z = -flap;
    }
  };
}

// Biome 4：北極冰融 — 雪地、冰塊、融冰水氹，落緊雪
function arctic(scene, rect, rand, live) {
  const k = density(rect);
  const iceMat = mat(0xb3e5fc, { transparent: true, opacity: 0.85, roughness: 0.1, flatShading: true });
  for (let n = 0; n < 10 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    const s = 0.6 + rand() * 0.9;
    const ice = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), iceMat);
    ice.scale.y = 0.6 + rand() * 0.8;
    ice.rotation.y = rand() * 3;
    add(scene, ice, x, s * 0.4, z);
  }
  // 冰柱
  for (let n = 0; n < 6 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2 + rand() * 2, 5), iceMat);
    add(scene, spike, x, 1.2, z);
  }
  // 融冰水氹
  const puddleMat = mat(0x4fc3f7, { transparent: true, opacity: 0.7, roughness: 0.05 });
  for (let n = 0; n < 6 * k; n++) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.6 + rand() * 0.9, 16), puddleMat);
    puddle.rotation.x = -Math.PI / 2;
    add(scene, puddle, (rand() - 0.5) * (rect.maxX - rect.minX - 4), 0.02, rect.minZ + 2 + rand() * (rect.maxZ - rect.minZ - 4), false);
  }

  // 落雪
  const count = Math.min(1500, Math.round(500 * k));
  const positions = new Float32Array(count * 3);
  for (let k = 0; k < count; k++) {
    positions[k * 3] = rect.minX + rand() * (rect.maxX - rect.minX);
    positions[k * 3 + 1] = rand() * 14;
    positions[k * 3 + 2] = rect.minZ + rand() * (rect.maxZ - rect.minZ);
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  live.add(new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06 })));
  return (dt, t) => {
    for (let k = 0; k < count; k++) {
      positions[k * 3 + 1] -= dt * 1.5;
      positions[k * 3] += Math.sin(t + k) * dt * 0.2;
      if (positions[k * 3 + 1] < 0) positions[k * 3 + 1] = 14;
    }
    snowGeo.attributes.position.needsUpdate = true;
  };
}

// Biome 5：走私營 — 木箱、油桶、鐵絲網、探射燈
function smugglers(scene, rect, rand, live) {
  const k = density(rect);
  const crateMat = mat(0x8d6e63);
  const crateEdge = mat(0x5d4037);
  for (let n = 0; n < 10 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    const s = 0.8 + rand() * 0.5;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.rotation.y = rand();
    add(scene, crate, x, s / 2, z);
    const band = new THREE.Mesh(new THREE.BoxGeometry(s * 1.02, s * 0.15, s * 1.02), crateEdge);
    band.rotation.y = crate.rotation.y;
    add(scene, band, x, s / 2, z, false);
    if (rand() < 0.4) {
      const top = new THREE.Mesh(new THREE.BoxGeometry(s * 0.7, s * 0.7, s * 0.7), crateMat);
      top.rotation.y = rand();
      add(scene, top, x, s + s * 0.35, z);
    }
  }
  // 油桶
  const barrelColors = [0x1565c0, 0xc62828, 0x2e7d32];
  for (let n = 0; n < 6 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    add(scene, new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1, 12), mat(barrelColors[n % 3], { metalness: 0.4 })), x, 0.5, z);
  }
  // 鐵絲網（貼住兩邊牆）
  const fenceMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true });
  for (const x of [rect.minX + 0.7, rect.maxX - 0.7]) {
    const fence = new THREE.Mesh(new THREE.PlaneGeometry(rect.maxZ - rect.minZ, 2.5, 30, 4), fenceMat);
    fence.rotation.y = Math.PI / 2;
    add(scene, fence, x, 1.25, (rect.minZ + rect.maxZ) / 2, false);
  }
  // 街燈
  const lampMat = mat(0xfff3b0, { emissive: 0xffe082, emissiveIntensity: 1.5 });
  const lampX = (rect.maxX - rect.minX) / 2 - 1.5;
  for (let z = rect.maxZ - 6, side = -1; z > rect.minZ + 3; z -= 12, side = -side) {
    const x = side * lampX;
    add(scene, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 8), mat(0x333333)), x, 2.5, z);
    add(scene, new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), lampMat), x, 5.1, z, false);
  }
  // 探射燈（喺頂上轉嚟轉去）
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(3, 13, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.geometry.translate(0, -6.5, 0); // 由燈頭射落地
  const pivot = new THREE.Group();
  pivot.position.set(0, 12, (rect.minZ + rect.maxZ) / 2);
  pivot.add(beam);
  beam.rotation.x = 0.6;
  live.add(pivot);
  return (dt, t) => {
    pivot.rotation.y = t * 0.6;
  };
}

// Biome 6 嘅山頂：動物喺度出現，唔會落山（小朋友：「a massive triangle mountain」，要跳上去）
export const SUMMIT = { x: 0, z: 0, top: 0, halfX: 1, halfZ: 1 };
export const MOUNTAIN = { minX: -15, maxX: 15, minZ: 0, maxZ: 0 }; // 山腳範圍（main／hazards 用）
const STAIRS = { z: 0 }; // 樓梯口

// 一座方塊金字塔山：一層疊一層，每層要跳先上到；頂幾層有雪
function buildMountain(scene, rect) {
  const LAYERS = 10;
  const LAYER_HEIGHT = 1.3; // 跳得上（大約跳到 2 米）
  const SHRINK = 1.4;       // 每層細幾多（即係每級有幾闊企）
  const cz = rect.minZ + 20;
  const baseHalfX = 15;
  const baseHalfZ = 17;
  const rocks = [mat(0x7a6f63, { flatShading: true }), mat(0x8c8072, { flatShading: true })];
  const snow = mat(0xf5f7fa);
  for (let i = 0; i < LAYERS; i++) {
    const hx = baseHalfX - i * SHRINK;
    const hz = baseHalfZ - i * SHRINK;
    const top = LAYER_HEIGHT * (i + 1);
    const material = i >= LAYERS - 3 ? snow : rocks[i % 2];
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(hx * 2, LAYER_HEIGHT, hz * 2), material), 0, top - LAYER_HEIGHT / 2, cz);
    addPlatform({ minX: -hx, maxX: hx, minZ: cz - hz, maxZ: cz + hz }, top);
  }
  // 山前面中間一條樓梯（小朋友 2026-10-15：爬山唔好慢）：每層 3 級，每級矮過 0.45 米，行上去唔使跳
  const STEPS = 3;
  const stepMat = mat(0xcfc6b8, { flatShading: true });
  const edgeMat = mat(0xffd54f, { metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i < LAYERS; i++) {
    const front = cz + (baseHalfZ - i * SHRINK); // 呢層嘅前面
    const base = LAYER_HEIGHT * i;
    for (let j = 0; j < STEPS; j++) {
      const top = base + (LAYER_HEIGHT * (j + 1)) / STEPS;
      const z1 = front + SHRINK - (SHRINK * (j + 1)) / STEPS; // 越高越入
      const z2 = front + SHRINK - (SHRINK * j) / STEPS;
      add(scene, new THREE.Mesh(new THREE.BoxGeometry(4, top - base + 0.01, z2 - z1), stepMat), 0, (base + top) / 2, (z1 + z2) / 2);
      add(scene, new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 0.08), edgeMat), 0, top + 0.02, z2 - 0.05, false);
      addPlatform({ minX: -2, maxX: 2, minZ: z1, maxZ: z2 }, top);
    }
  }
  // 樓梯口：石門 + 牌
  const trailZ = cz + baseHalfZ + SHRINK + 0.6;
  for (const s of [-1, 1]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.4, 0.8), mat(0x6d6359, { flatShading: true })), s * 2.6, 2.2, trailZ);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.7, 1.0), mat(0x5d4037)), 0, 4.6, trailZ);
  STAIRS.z = trailZ;

  // 山頂支旗
  const top = LAYER_HEIGHT * LAYERS;
  const hx = baseHalfX - (LAYERS - 1) * SHRINK;
  const hz = baseHalfZ - (LAYERS - 1) * SHRINK;
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.5, 0.15), mat(0x5d4037)), hx - 0.4, top + 1.75, cz - hz + 0.4);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.05), mat(0xe53935)), hx - 1.1, top + 3, cz - hz + 0.4, false);
  Object.assign(SUMMIT, { x: 0, z: cz, top, halfX: hx - 0.9, halfZ: hz - 0.9 });
  Object.assign(MOUNTAIN, { minX: -baseHalfX, maxX: baseHalfX, minZ: cz - baseHalfZ, maxZ: cz + baseHalfZ });
}

// Biome 6 再型啲（小朋友 2026-10-15）：瀑布一級級流落嚟、水池、礦洞口 + 路軌、山上有松樹、山頂金光圈、鷹喺山頂飛、雪
function coolMountain(scene, live, rect, rand) {
  const cz = SUMMIT.z;
  const LAYER = 1.3;
  const SHRINK = 1.4;
  const hzOf = (i) => 17 - i * SHRINK;
  const hxOf = (i) => 15 - i * SHRINK;

  // 瀑布：一條流動嘅水，由第 7 層一級級流落山腳（x = -4.2）
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 64;
  const ctx = c.getContext('2d');
  for (let y = 0; y < 64; y++) {
    ctx.fillStyle = y % 8 < 3 ? '#e1f5fe' : '#4fc3f7';
    ctx.fillRect(0, y, 16, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const waterMat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0x0277bd, emissiveIntensity: 0.35, transparent: true, opacity: 0.88, roughness: 0.1 });
  const wx = -4.2;
  for (let i = 0; i <= 7; i++) {
    const front = cz + hzOf(i);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, LAYER), waterMat);
    face.position.set(wx, LAYER * i + LAYER / 2, front + 0.03);
    live.add(face);
    if (i > 0) {
      const flat = new THREE.Mesh(new THREE.PlaneGeometry(1.6, SHRINK), waterMat);
      flat.rotation.x = -Math.PI / 2;
      flat.position.set(wx, LAYER * i + 0.03, front + SHRINK / 2);
      live.add(flat);
    }
  }
  // 山腳水池 + 水花
  const poolZ = cz + hzOf(0) + 1.4;
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 2.4), mat(0x8c8072, { flatShading: true })), wx, 0.15, poolZ);
  const pool = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.06, 1.9), waterMat);
  pool.position.set(wx, 0.31, poolZ);
  live.add(pool);
  const SPLASH = 40;
  const splashPos = new Float32Array(SPLASH * 3);
  const splashGeo = new THREE.BufferGeometry();
  splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPos, 3));
  const splash = new THREE.Points(splashGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8, depthWrite: false }));
  splash.frustumCulled = false;
  live.add(splash);

  // 礦洞口（山腳右邊）+ 路軌 + 一架礦車
  const mx = 8;
  const mz = cz + hzOf(0) + 0.05;
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 0.1), mat(0x111111)), mx, 1.2, mz, false);
  for (const sx of [-1, 1]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.7, 0.4), mat(0x6d4c41)), mx + sx * 1.45, 1.35, mz + 0.1);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 0.45), mat(0x6d4c41)), mx, 2.75, mz + 0.1);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.06), mat(0xffd54f)), mx, 3.2, mz + 0.15, false); // 牌
  for (const sx of [-0.45, 0.45]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 6), mat(0x9e9e9e, { metalness: 0.7 })), mx + sx, 0.06, mz + 3, false);
  for (let k = 0; k < 10; k++) add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.2), mat(0x5d4037)), mx, 0.03, mz + 0.4 + k * 0.6, false);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 1.4), mat(0x795548)), mx, 0.55, mz + 3.5);
  for (let k = 0; k < 5; k++) {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), mat([0x00e5ff, 0xff4081, 0xffd600][k % 3], { emissive: [0x00e5ff, 0xff4081, 0xffd600][k % 3], emissiveIntensity: 2 }));
    add(scene, gem, mx - 0.4 + (k % 3) * 0.4, 1.0, mz + 3.2 + Math.floor(k / 3) * 0.5);
  }

  // 山上每級都有啲松樹（避開樓梯同瀑布）
  for (let i = 0; i < 7; i++) {
    for (let n = 0; n < 3; n++) {
      const side = rand() < 0.5 ? -1 : 1;
      const x = side * (6 + rand() * Math.max(0.5, hxOf(i) - 7));
      if (Math.abs(x - wx) < 1.6) continue;
      const z = cz + (rand() * 2 - 1) * (hzOf(i) - 0.7);
      const onLedge = Math.abs(z - cz) > hzOf(i + 1) || Math.abs(x) > hxOf(i + 1);
      if (!onLedge) continue;
      const g = new THREE.Group();
      pineTree(g, 0, 0, 0.55 + rand() * 0.3);
      g.position.set(x, LAYER * (i + 1), z); // 種喺嗰級上面
      scene.add(g);
    }
  }

  // 山頂金光圈（動物喺度）
  const ring = new THREE.Mesh(new THREE.RingGeometry(SUMMIT.halfX + 0.4, SUMMIT.halfX + 0.7, 32), new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, SUMMIT.top + 0.05, cz);
  live.add(ring);

  // 鷹喺山頂上面飛圈
  const eagles = [0, 1, 2].map((i) => {
    const g = new THREE.Group();
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 1.0), mat(0x5d4037)), 0, 0, 0, false);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat(0xffffff)), 0, 0.1, -0.6, false);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.2), mat(0xffc107)), 0, 0.05, -0.85, false);
    const wings = [-1, 1].map((s) => {
      const p = new THREE.Group();
      p.position.set(s * 0.25, 0.1, 0);
      add(p, new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.6), mat(0x4e342e)), s * 0.7, 0, 0, false);
      g.add(p);
      return p;
    });
    live.add(g);
    return { g, wings, r: 7 + i * 3, h: SUMMIT.top + 5 + i * 2, speed: 0.35 + i * 0.1, phase: i * 2 };
  });

  // 山頂附近落雪
  const SNOW = 160;
  const snowPos = new Float32Array(SNOW * 3);
  const flakes = [];
  for (let i = 0; i < SNOW; i++) flakes.push({ x: (rand() * 2 - 1) * 9, z: cz + (rand() * 2 - 1) * 10, k: rand(), speed: 0.5 + rand() * 0.5 });
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.9, depthWrite: false }));
  snow.frustumCulled = false;
  live.add(snow);

  return (dt, t) => {
    tex.offset.y = -t * 1.5;
    for (let i = 0; i < SPLASH; i++) {
      const k = (t * 1.2 + i / SPLASH) % 1;
      const a = i * 2.4;
      splashPos[i * 3] = wx + Math.cos(a) * k * 1.2;
      splashPos[i * 3 + 1] = 0.35 + Math.sin(k * Math.PI) * 0.8;
      splashPos[i * 3 + 2] = poolZ - 0.8 + Math.sin(a) * k * 0.6;
    }
    splashGeo.attributes.position.needsUpdate = true;
    ring.material.opacity = 0.5 + Math.sin(t * 3) * 0.3;
    for (const e of eagles) {
      const a = t * e.speed + e.phase;
      e.g.position.set(Math.cos(a) * e.r, e.h + Math.sin(t + e.phase) * 0.5, cz + Math.sin(a) * e.r);
      e.g.rotation.y = -a + Math.PI;
      e.g.rotation.z = 0.3;
      const flap = Math.sin(t * 5 + e.phase) * 0.35;
      e.wings[0].rotation.z = flap;
      e.wings[1].rotation.z = -flap;
    }
    for (let i = 0; i < SNOW; i++) {
      const f = flakes[i];
      const k = (f.k + t * 0.08 * f.speed) % 1;
      snowPos[i * 3] = f.x + Math.sin(t + i) * 0.3;
      snowPos[i * 3 + 1] = SUMMIT.top + 9 - k * 9;
      snowPos[i * 3 + 2] = f.z;
    }
    snowGeo.attributes.position.needsUpdate = true;
  };
}

// Biome 6：採礦山 — 中間一座好大嘅三角形山（要跳上去），山前面有石、水晶、鑽機
function mining(scene, rect, rand, live) {
  const k = density(rect);
  buildMountain(scene, rect);
  const rock = mat(0x6d6359, { flatShading: true });
  const rock2 = mat(0x857a6e, { flatShading: true });
  // 山前面嘅空地（入口同山腳之間）先放裝飾
  const front = () => [(rand() * 2 - 1) * 16, MOUNTAIN.maxZ + 1.5 + rand() * (rect.maxZ - MOUNTAIN.maxZ - 3)];
  for (let n = 0; n < 6 * k; n++) {
    const [x, z] = front();
    if (Math.abs(x) < 4) continue; // 中間留路
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.6 + rand(), 0.5 + rand() * 0.6, 0.6 + rand()), n % 2 ? rock : rock2), x, 0.3, z).rotation.y = rand() * 3;
  }
  // 發光水晶（山前面同山嘅每一級上面）
  const crystalColors = [0x7c4dff, 0x00e5ff, 0xff4081];
  for (let n = 0; n < 8 * k; n++) {
    const [x, z] = front();
    if (Math.abs(x) < 4) continue;
    const c = crystalColors[n % 3];
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.35 + rand() * 0.3), mat(c, { emissive: c, emissiveIntensity: 2.2, flatShading: true }));
    crystal.scale.y = 1.8;
    add(scene, crystal, x, 0.5, z);
  }
  // 會郁嘅鑽油機（喺山前面兩個角，上下鑽）
  const drills = [];
  for (const [x, z] of [[-14, rect.maxZ - 6], [14, rect.maxZ - 6]]) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 2), mat(0xffc107)), 0, 0.3, 0);
    for (const s of [-0.7, 0.7]) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), mat(0x616161)), s, 2.3, 0);
    const bit = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 6), mat(0x9e9e9e, { metalness: 0.8 }));
    bit.rotation.x = Math.PI;
    g.add(bit);
    live.add(g);
    drills.push(bit);
  }
  const updateCool = coolMountain(scene, live, rect, rand);
  return (dt, t) => {
    updateCool(dt, t);
    drills.forEach((bit, i) => {
      bit.position.y = 2 + Math.sin(t * 3 + i) * 1.2;
      bit.rotation.y = t * 8;
    });
  };
}
