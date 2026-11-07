// 每個生態區（同 Hub）嘅裝飾：樹、珊瑚、冰、箱…
// 裝飾放喺兩邊，中間留條路（|x| < 3）俾玩家行。

import * as THREE from 'three';
import { addPlatform, addCollider, kingdom, KINGDOM_Y } from './world.js';
import { state } from './state.js';
import { enchanted } from './enchanted.js';
import { arcticV2, smugglersV2 } from './biomeArt.js'; // Issue #2：Biome 4、5 新美術
import { dynamicSign, makeLabel, THEMES } from './signs.js';
import { NEW_BIOME_DATE, NEW_BIOME_ON } from './data/balance.js';
import { shimmerTexture } from './ambience.js';
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
// Issue #17：生態區大咗（42×62 → 52×86），裝飾跟面積加多（以前 42×62 = 2.5 倍），唔會變得空蕩蕩
const density = (rect) => Math.min(4.5, (2.5 * (rect.maxX - rect.minX) * (rect.maxZ - rect.minZ)) / (42 * 62));

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

// ---------------- 地面變化 + 雜項（Issue #17「graphics should be better」）----------------
const put = (scene, geo, material, x, y, z, shadow = true) => add(scene, new THREE.Mesh(geo, material), x, y, z, shadow);
// 一笪笪唔同顏色嘅地（泥、深草、落葉）：幾個扁平多邊形疊埋，形狀唔規則；焊埋之後好平
function groundPatches(scene, rect, rand, colors, count) {
  const half = (rect.maxX - rect.minX) / 2 - 1.5;
  for (let n = 0; n < count; n++) {
    const cx = (rand() * 2 - 1) * half;
    const cz = rect.minZ + 2 + rand() * (rect.maxZ - rect.minZ - 4);
    const c = colors[n % colors.length];
    const blobs = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < blobs; k++) {
      const r = 0.9 + rand() * 1.8;
      const m = put(scene, new THREE.CylinderGeometry(r, r, 0.02, 7), mat(c, { roughness: 1 }), cx + (rand() - 0.5) * 2.4, 0.012 + n * 0.00002, cz + (rand() - 0.5) * 2.4, false);
      m.scale.z = 0.6 + rand() * 0.6;
      m.rotation.y = rand() * 3;
    }
  }
}
// 彎彎曲曲嘅泥路（由入口一路去到 Boss 附近），中間少少偏左偏右
function dirtTrail(scene, rect, rand, color, width = 2.4) {
  for (let z = rect.maxZ - 1; z > rect.minZ + 6; z -= 1.6) {
    const x = Math.sin(z * 0.08) * 2.2 + (rand() - 0.5) * 0.6;
    const m = put(scene, new THREE.CylinderGeometry(width / 2, width / 2, 0.02, 8), mat(color, { roughness: 1 }), x, 0.014, z, false);
    m.scale.z = 1.3;
  }
}
// 石頭（一嚿大 + 兩嚿細）
function rockCluster(scene, x, z, s, color = 0x8d8a85) {
  const m = mat(color, { flatShading: true });
  put(scene, new THREE.DodecahedronGeometry(0.6 * s, 0), m, x, 0.3 * s, z).rotation.y = x;
  put(scene, new THREE.DodecahedronGeometry(0.32 * s, 0), m, x + 0.7 * s, 0.15 * s, z + 0.3 * s);
  put(scene, new THREE.DodecahedronGeometry(0.25 * s, 0), m, x - 0.5 * s, 0.12 * s, z + 0.5 * s);
}
// 方塊矮樹叢
function bush(scene, x, z, s, color = 0x388e3c) {
  put(scene, new THREE.BoxGeometry(1.1 * s, 0.7 * s, 1.0 * s), mat(color), x, 0.35 * s, z).rotation.y = z;
  put(scene, new THREE.BoxGeometry(0.7 * s, 0.5 * s, 0.7 * s), mat(color === 0x388e3c ? 0x4caf50 : color), x + 0.3 * s, 0.75 * s, z - 0.1 * s);
}
// 細花（一粒粒）
function flowerDots(scene, rect, rand, colors, count) {
  for (let n = 0; n < count; n++) {
    const [x, z] = sidePosition(rand, rect);
    put(scene, new THREE.BoxGeometry(0.16, 0.16, 0.16), mat(colors[n % colors.length]), x, 0.12, z, false);
  }
}

// ---------------- 生態區 ----------------
// scene：放唔會郁嘅裝飾（之後會焊埋做一大件，畫得快啲）；live：放會郁嘅嘢
export function decorateBiome(scene, i, rect, live) {
  const rand = seededRandom(100 + i);
  return [deforestation, ocean, birds, arcticV2, smugglersV2, mining, enchanted][i](scene, rect, rand, live);
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
  // Issue #17：地面有泥地、車胎印同深色草；仲有一堆堆斬咗嘅木、石、樹叢、蘑菇
  groundPatches(scene, rect, rand, [0x6d5a3a, 0x4e7a26, 0x7a6a45], Math.round(10 * k));
  dirtTrail(scene, rect, rand, 0x7b6646);
  for (let n = 0; n < 2 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    const ry = rand() * Math.PI;
    for (const [dx, dy] of [[-0.32, 0.3], [0.32, 0.3], [0, 0.82]]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 10), stumpMat);
      l.rotation.set(0, ry, Math.PI / 2);
      add(scene, l, x + Math.cos(ry) * 0 + dx * Math.sin(ry), dy, z + dx * Math.cos(ry));
    }
  }
  for (let n = 0; n < 4 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    rockCluster(scene, x, z, 0.8 + rand() * 0.7);
  }
  for (let n = 0; n < 6 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    bush(scene, x, z, 0.7 + rand() * 0.6);
  }
  for (let n = 0; n < 5 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    put(scene, new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6), mat(0xf5f5f5), x, 0.15, z, false);
    put(scene, new THREE.CylinderGeometry(0.02, 0.22, 0.14, 8), mat(n % 2 ? 0xe53935 : 0xff8f00), x, 0.34, z, false);
  }
  flowerDots(scene, rect, rand, [0xfff176, 0xffffff, 0xce93d8], Math.round(14 * k));
  return null;
}

// Biome 2：污染海灘（小朋友 2026-10-15 揀「沙灘 + 海」）：
// 左邊係海（有浪、有隻漏油嘅大油輪），右邊係沙灘（棕櫚樹、遮陽傘、救生員塔、沙堡、蟹、海鷗）
// 沙灘同淺水有垃圾：行埋去撳 E 執走（TRASH，main.js 處理）
export const TRASH = [];
const SHORE_X = -8; // 海同沙灘嘅分界（Issue #17 生態區闊咗：海都闊啲）
function palmTree(scene, x, z, s = 1) {
  const trunk = mat(0x8d6e63);
  for (let i = 0; i < 6; i++) add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.45 * s, 0.75 * s, 0.45 * s), i % 2 ? trunk : mat(0x795548)), x + i * 0.08 * s, (0.375 + i * 0.72) * s, z);
  const top = 4.5 * s;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.6 * s, 0.1 * s, 0.6 * s), mat(i % 2 ? 0x43a047 : 0x2e7d32));
    leaf.geometry.translate(1.3 * s, 0, 0);
    leaf.rotation.set(0, a, -0.45);
    add(scene, leaf, x + 0.45 * s, top, z);
  }
  for (let i = 0; i < 3; i++) add(scene, new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 8, 6), mat(0x6d4c41)), x + 0.45 * s + Math.cos(i * 2.1) * 0.3 * s, top - 0.3 * s, z + Math.sin(i * 2.1) * 0.3 * s);
}
function ocean(scene, rect, rand, live) {
  const k = density(rect);
  const d = rect.maxZ - rect.minZ;
  const cz = (rect.minZ + rect.maxZ) / 2;
  const seaW = SHORE_X - rect.minX;
  const seaX = (rect.minX + SHORE_X) / 2;

  // 海底（深藍）+ 濕沙
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(seaW, 0.04, d), mat(0x0d47a1)), seaX, 0.01, cz, false);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.035, d), mat(0xbfa877)), SHORE_X + 1.2, 0.01, cz, false);

  // 海面：有浪（頂點上下郁）
  const waterGeo = new THREE.PlaneGeometry(seaW, d, Math.round(seaW), Math.round(d / 1.5));
  waterGeo.rotateX(-Math.PI / 2);
  const shimmer = shimmerTexture(seaW / 6, d / 6); // 水面閃光（ambience.js 會郁）
  const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: 0x29b6f6, map: shimmer, emissive: 0x4fc3f7, emissiveMap: shimmer, emissiveIntensity: 0.18, transparent: true, opacity: 0.72, roughness: 0.12, metalness: 0.1 }));
  water.position.set(seaX, 0.3, cz);
  live.add(water);
  const base = waterGeo.attributes.position.array.slice();
  // 海浪白泡：沖上沙灘又退返
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(1.2, d), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
  foam.rotation.x = -Math.PI / 2;
  live.add(foam);

  // 漏油嘅大油輪（喺海度，擋住唔行得穿）
  const ship = new THREE.Group();
  const sx = rect.minX + 7;
  const sz = cz - 6;
  ship.position.set(sx, 0, sz);
  ship.rotation.y = 0.12;
  const hull = mat(0x263238, { metalness: 0.4, roughness: 0.4 });
  add(ship, new THREE.Mesh(new THREE.BoxGeometry(7, 2.2, 20), hull), 0, 1.0, 0);
  add(ship, new THREE.Mesh(new THREE.BoxGeometry(7.05, 0.8, 20.05), mat(0xb71c1c)), 0, 0.2, 0);
  const bow = add(ship, new THREE.Mesh(new THREE.BoxGeometry(4.95, 2.2, 4.95), hull), 0, 1.0, -10);
  bow.rotation.y = Math.PI / 4;
  add(ship, new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.25, 20.1), mat(0xeceff1)), 0, 2.1, 0);
  add(ship, new THREE.Mesh(new THREE.BoxGeometry(5, 3.4, 4), mat(0xeceff1)), 0, 3.8, 6.5); // 駕駛樓
  add(ship, new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.6, 0.05), mat(0x4fc3f7, { emissive: 0x01579b, emissiveIntensity: 0.4 })), 0, 4.6, 4.48, false); // 窗
  add(ship, new THREE.Mesh(new THREE.BoxGeometry(1.4, 3, 1.4), mat(0xd32f2f)), 0, 6.5, 7.5); // 煙囪
  add(ship, new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 1.5), mat(0x212121)), 0, 8.1, 7.5);
  for (let i = 0; i < 3; i++) add(ship, new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.6, 16), mat(0x37474f)), 0, 2.4, -6 + i * 4); // 油缸
  add(ship, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 2.2), mat(0x111111)), 3.56, 1.0, -2); // 爛咗個窿
  const shipLabel = makeTextBlock('OIL', 0xffd600);
  shipLabel.position.set(3.53, 1.2, 2.5);
  shipLabel.rotation.y = Math.PI / 2;
  ship.add(shipLabel);
  scene.add(ship);
  for (let i = -10; i <= 9; i += 2.5) addCollider(sx + Math.sin(0.12) * i, sz + Math.cos(0.12) * i, 3.6);
  // 黑煙
  const smoke = [];
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0x212121, transparent: true, opacity: 0.7 }));
    live.add(puff);
    smoke.push(puff);
  }
  // 油污：由個窿漏出嚟，一大灘浮喺海面（會慢慢變大變細）
  const oilMat = mat(0x0d0d12, { transparent: true, opacity: 0.85, roughness: 0.05, metalness: 0.8 });
  const slicks = [];
  for (let n = 0; n < 7; n++) {
    const oil = new THREE.Mesh(new THREE.CircleGeometry(1.2 + rand() * 1.4, 18), oilMat);
    oil.rotation.x = -Math.PI / 2;
    oil.position.set(sx + 4.5 + rand() * 4, 0.36, sz - 6 + rand() * 12);
    live.add(oil);
    slicks.push({ oil, phase: rand() * 6 });
  }

  // 沙灘：棕櫚樹、遮陽傘 + 毛巾、救生員塔、沙堡、石、貝殼、海星
  const beachX = () => SHORE_X + 4 + rand() * (rect.maxX - SHORE_X - 6);
  const okX = (x) => Math.abs(x) > 3.5; // 中間條路留空
  for (let n = 0; n < 4 * k; n++) {
    const x = rect.maxX - 2.5 - rand() * 3;
    palmTree(scene, x, rect.minZ + 3 + rand() * (d - 6), 0.9 + rand() * 0.3);
  }
  const umbrellaColors = [0xff5252, 0xffeb3b, 0x40c4ff, 0x69f0ae];
  const umbrellas = Math.round(3 * d / 62); // Issue #17：沙灘長咗，多幾把遮
  for (let n = 0; n < umbrellas; n++) {
    const x = 8 + rand() * (rect.maxX - 14);
    const z = rect.minZ + 8 + n * ((d - 10) / umbrellas);
    add(scene, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), mat(0xeeeeee)), x, 1.3, z);
    const top = add(scene, new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.7, 8), mat(umbrellaColors[n % 4])), x, 2.6, z);
    top.rotation.z = 0.15;
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, 2), mat(umbrellaColors[(n + 1) % 4])), x + 1.2, 0.02, z + 0.4, false); // 毛巾
  }
  // 救生員塔
  {
    const x = 15;
    const z = rect.maxZ - 12;
    const wood = mat(0xffffff);
    for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.2), wood), x + dx, 1.5, z + dz);
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 2.2), wood), x, 3.0, z);
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 0.1), mat(0xe53935)), x, 3.6, z - 1.05);
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 2.6), mat(0xe53935)), x, 4.6, z);
    for (const [dx, dz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), wood), x + dx, 3.85, z + dz);
    addCollider(x, z, 1.3);
  }
  // 沙堡
  {
    const x = 6;
    const z = rect.minZ + 14;
    const sand = mat(0xe6cf98, { flatShading: true });
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 2), sand), x, 0.4, z);
    for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
      add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), sand), x + dx, 0.7, z + dz);
      add(scene, new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 4), sand), x + dx, 1.65, z + dz).rotation.y = Math.PI / 4;
    }
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.02), mat(0x795548)), x, 1.05, z);
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.02), mat(0xff5252)), x + 0.2, 1.2, z, false);
  }
  for (let n = 0; n < 8 * k; n++) {
    const x = beachX();
    if (!okX(x)) continue;
    const z = rect.minZ + 1 + rand() * (d - 2);
    if (n % 3 === 0) add(scene, new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + rand() * 0.4), mat(0x9e9e9e, { flatShading: true })), x, 0.2, z);
    else {
      const star = add(scene, new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 5), mat(n % 2 ? 0xff7043 : 0xffab91)), x, 0.03, z, false);
      star.rotation.y = rand() * 3;
    }
  }

  // Issue #17：沙灘有濕沙／乾沙深淺、海草、浮木
  groundPatches({ add: (m) => (m.position.x > SHORE_X + 1.5 ? scene.add(m) : null) }, rect, rand, [0xe8d5a3, 0xcdb27a, 0xf0e2b8], Math.round(9 * k));
  for (let n = 0; n < 5 * k; n++) {
    const x = beachX();
    if (!okX(x)) continue;
    const z = rect.minZ + 3 + rand() * (d - 6);
    if (n % 2) {
      const wood = put(scene, new THREE.CylinderGeometry(0.15, 0.2, 1.8 + rand(), 7), mat(0xbcaaa4, { flatShading: true }), x, 0.15, z);
      wood.rotation.set(0, rand() * 3, Math.PI / 2);
    } else for (let q = 0; q < 3; q++) put(scene, new THREE.BoxGeometry(0.08, 0.5 + rand() * 0.4, 0.08), mat(0x558b2f), x + q * 0.15, 0.25, z + (q % 2) * 0.12, false); // 海草
  }

  // 垃圾（可以執）：膠樽、罐、膠袋、舊車胎
  const trashKinds = [
    { name: 'plastic bottle', make: () => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.42, 8), mat(0x80deea, { transparent: true, opacity: 0.75 }));
      m.rotation.z = Math.PI / 2;
      return m;
    } },
    { name: 'soda can', make: () => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.26, 10), mat(0xe53935, { metalness: 0.7 }));
      m.rotation.z = Math.PI / 2;
      return m;
    } },
    { name: 'plastic bag', make: () => new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mat(0xffffff, { transparent: true, opacity: 0.6 })) },
    { name: 'old tyre', make: () => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.14, 8, 16), mat(0x212121));
      m.rotation.x = Math.PI / 2;
      return m;
    } },
  ];
  TRASH.length = 0;
  for (let n = 0; n < 14; n++) {
    const kind = trashKinds[n % trashKinds.length];
    const x = n % 3 === 0 ? SHORE_X - 1 - rand() * 3 : SHORE_X + 1 + rand() * (rect.maxX - SHORE_X - 4);
    const z = rect.minZ + 3 + rand() * (d - 6);
    const g = new THREE.Group();
    const m = kind.make();
    m.castShadow = true;
    g.add(m);
    // 細細粒發光圈，等小朋友見到
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 20), new THREE.MeshBasicMaterial({ color: 0x76ff03, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.08;
    g.add(halo);
    g.position.set(x, 0.15, z);
    g.rotation.y = rand() * 3;
    live.add(g);
    TRASH.push({ x, z, name: kind.name, group: g, halo, back: 0 });
  }

  // 蟹（打橫行）同海鷗
  const crabs = [];
  for (let n = 0; n < 4; n++) {
    const g = new THREE.Group();
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.38), mat(0xe64a19)), 0, 0.15, 0, false);
    for (const s of [-1, 1]) {
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), mat(0xff7043)), s * 0.35, 0.2, -0.22, false);
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), mat(0x111111)), s * 0.1, 0.32, -0.15, false);
    }
    live.add(g);
    crabs.push({ g, x: SHORE_X + 3 + rand() * 6, z: rect.minZ + 5 + rand() * (d - 10), phase: rand() * 6 });
  }
  const gulls = [0, 1, 2, 3].map((i) => {
    const g = new THREE.Group();
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.6), mat(0xffffff)), 0, 0, 0, false);
    const wings = [-1, 1].map((s) => {
      const p = new THREE.Group();
      p.position.x = s * 0.15;
      add(p, new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.3), mat(0xeceff1)), s * 0.4, 0, 0, false);
      g.add(p);
      return p;
    });
    live.add(g);
    return { g, wings, r: 6 + i * 2, h: 8 + i, speed: 0.4 + i * 0.07, phase: i * 1.7 };
  });

  return (dt, t) => {
    const pos = waterGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      pos.array[i * 3 + 1] = Math.sin(x * 0.7 + t * 1.8) * 0.12 + Math.cos(z * 0.5 + t * 1.2) * 0.08;
    }
    pos.needsUpdate = true;
    waterGeo.computeVertexNormals();
    const wave = (Math.sin(t * 0.9) + 1) / 2;
    foam.position.set(SHORE_X - 0.4 + wave * 2.2, 0.33, cz);
    foam.material.opacity = 0.35 + (1 - wave) * 0.5;
    smoke.forEach((p, i) => {
      const k = (t * 0.25 + i / smoke.length) % 1;
      p.position.set(sx + Math.sin(0.12) * 7.5 + k * 2, 8.5 + k * 7, sz + Math.cos(0.12) * 7.5 + k * 3);
      p.scale.setScalar(0.8 + k * 2.5);
      p.material.opacity = 0.7 * (1 - k);
    });
    for (const s of slicks) s.oil.scale.setScalar(1 + Math.sin(t * 0.5 + s.phase) * 0.12);
    for (const c of crabs) {
      c.g.position.set(c.x + Math.sin(t * 0.8 + c.phase) * 2.5, 0, c.z);
      c.g.rotation.y = Math.sin(t * 8) * 0.1;
    }
    for (const gl of gulls) {
      const a = t * gl.speed + gl.phase;
      gl.g.position.set(SHORE_X + Math.cos(a) * gl.r, gl.h, cz + Math.sin(a) * gl.r * 2);
      gl.g.rotation.y = -a + Math.PI;
      const flap = Math.sin(t * 9 + gl.phase) * 0.6;
      gl.wings[0].rotation.z = flap;
      gl.wings[1].rotation.z = -flap;
    }
    for (const tr of TRASH) {
      if (tr.back && t > tr.back) {
        tr.back = 0;
        tr.group.visible = true; // 過咗一陣又有人亂拋垃圾……
      }
      tr.halo.material.opacity = 0.35 + Math.sin(t * 4) * 0.25;
      tr.group.position.y = tr.x < SHORE_X ? 0.3 + Math.sin(t * 2 + tr.z) * 0.08 : 0.15; // 喺水度嘅會浮
    }
  };
}

// 一塊寫咗字嘅方塊（例如油輪上面嘅「OIL」）
function makeTextBlock(text, color) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
  ctx.font = 'bold 84px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(3, 1.1), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
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
  // Issue #17：深淺唔同嘅草地 + 泥路 + 石 + 大樹叢
  groundPatches(scene, rect, rand, [0x2f5a1f, 0x557a2a, 0x5d4a2e], Math.round(10 * k));
  dirtTrail(scene, rect, rand, 0x6b5536, 2.0);
  for (let n = 0; n < 3 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    rockCluster(scene, x, z, 0.7 + rand() * 0.6, 0x6f7d6a);
  }
  for (let n = 0; n < 6 * k; n++) {
    const [x, z] = sidePosition(rand, rect);
    bush(scene, x, z, 0.8 + rand() * 0.7, 0x2e7d32);
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
// Biome 6 盡頭通去 Biome 7 嘅閘門：open 0（關）→ 1（開）；fast = 開門動畫慢慢開
export const KINGDOM_GATE = { open: 0, fast: false, bars: null, swirl: null, z: 0, y: 0 };
export const MOUNTAIN = { minX: -15, maxX: 15, minZ: 0, maxZ: 0 }; // 山腳範圍（main／hazards 用）
const STAIRS = { z: 0 }; // 樓梯口

// 座山嘅形狀（Issue #14 小朋友 2026-11-07：「now make the mountain bigger」→「still too small」）
// 10 層 13 米 → 18 層 23.4 米 → 34 層 44.2 米；山腳 44×~60（差唔多成個生態區咁闊）。前面每級 1.25 米闊（中間樓梯），
// 兩邊好斜，後面差唔多係懸崖；條橋由山頂背面落少少去王國閘門（王國升咗去 KINGDOM_Y = 40 米）
const MTN = {
  LAYERS: 34,
  LAYER: 1.3,        // 每層幾高（跳得上，大約跳到 1.5 米）
  SHRINK_X: 0.47,    // 兩邊每級幾闊（兩邊好斜）
  SHRINK_FRONT: 1.25, // 前面每級幾闊（樓梯每層 3 級就喺度）
  SHRINK_BACK: 0.2,  // 後面每級幾闊（差唔多直嘅懸崖，喺條橋下面）
  TOP_HX: 6.5,       // 最頂嗰層（一半）：夠位俾兩隻動物一左一右
  TOP_HZ: 5.5,
  STAIR_HALF: 2.5,   // 中間條樓梯（一半闊）
  cz: 0,             // 山頂中心 z（buildMountain 計）
};
const mtnHx = (i) => MTN.TOP_HX + (MTN.LAYERS - 1 - i) * MTN.SHRINK_X;
const mtnFront = (i) => MTN.cz + MTN.TOP_HZ + (MTN.LAYERS - 1 - i) * MTN.SHRINK_FRONT; // 第 i 層前面（入口嗰邊）
const mtnBack = (i) => MTN.cz - MTN.TOP_HZ - (MTN.LAYERS - 1 - i) * MTN.SHRINK_BACK;   // 第 i 層後面（閘門嗰邊）
// 條橋：山頂背面（topA）→ 平路 → 一級級落（每級矮過 0.45 米，行返上嚟都唔使跳）→ 平路 → 閘門（topB = KINGDOM_Y）
const BRIDGE = { z1: 0, zA: 0, zB: 0, z2: 0, topA: 0, topB: 0, steps: 1, stepH: 0.3, tread: 0.45 };
// 橋面喺 z 有幾高
function bridgeDeckAt(z) {
  const b = BRIDGE;
  if (z >= b.zA) return b.topA;
  if (z <= b.zB) return b.topB;
  const k = Math.min(b.steps - 1, Math.floor((b.zA - z) / b.tread));
  return b.topA - (k + 1) * b.stepH;
}
// 扶手嗰條斜線（樓梯段打斜，兩頭平）
function bridgeRailAt(z) {
  const b = BRIDGE;
  if (z >= b.zA) return b.topA;
  if (z <= b.zB) return b.topB;
  return b.topB + ((z - b.zB) / (b.zA - b.zB)) * (b.topA - b.topB);
}
// 兩點之間一條斜嘅長方條（沿住 z 方向；橋樓梯段嘅扶手、玻璃）
function slab(scene, material, x, w, h, za, ya, zb, yb, shadow = false) {
  const len = Math.hypot(za - zb, ya - yb);
  const m = add(scene, new THREE.Mesh(new THREE.BoxGeometry(w, h, len), material), x, (ya + yb) / 2, (za + zb) / 2, shadow);
  m.rotation.x = -Math.atan2(ya - yb, za - zb);
  return m;
}

// 一座方塊金字塔山：一層疊一層，每層要跳先上到（或者行中間條樓梯）；石層有幾種顏色 + 深色石紋，頂 4 層有雪
function buildMountain(scene, rect) {
  const { LAYERS, LAYER } = MTN;
  const top = LAYER * LAYERS;
  // 先計條橋要幾長，再由閘門倒推座山擺喺邊
  const stepH0 = 0.3;
  const steps = Math.max(1, Math.ceil((top - KINGDOM_Y) / stepH0 - 1e-6));
  const z2 = rect.minZ + 0.5; // 盡頭幅牆
  const zB = z2 + 5;          // 閘門前面 5 米平路
  const zA = zB + steps * 0.45;
  const z1 = zA + 3;          // 山頂背面出去 3 米平路
  Object.assign(BRIDGE, { z1, zA, zB, z2, topA: top, topB: KINGDOM_Y, steps, stepH: (top - KINGDOM_Y) / steps, tread: 0.45 });
  MTN.cz = z1 + MTN.TOP_HZ;
  const cz = MTN.cz;

  // 石層：底（啡灰）→ 中（深啡）→ 上（淺灰）→ 雪
  const bands = [
    [mat(0x7a6f63, { flatShading: true }), mat(0x857a6d, { flatShading: true })],
    [mat(0x6b5f55, { flatShading: true }), mat(0x75695e, { flatShading: true })],
    [mat(0x8a8178, { flatShading: true }), mat(0x958c82, { flatShading: true })],
  ];
  const stripe = mat(0x4e463e, { flatShading: true });
  const snow = mat(0xf5f7fa);
  const snowLip = mat(0xffffff, { roughness: 0.4 });
  const SNOW_FROM = LAYERS - 8; // 頂 8 層有雪
  for (let i = 0; i < LAYERS; i++) {
    const hx = mtnHx(i);
    const f = mtnFront(i);
    const b = mtnBack(i);
    const y = LAYER * (i + 1);
    const material = i >= SNOW_FROM ? snow : bands[Math.min(2, Math.floor((i * 3) / SNOW_FROM))][i % 2];
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(hx * 2, LAYER, f - b), material), 0, y - LAYER / 2, (f + b) / 2);
    addPlatform({ minX: -hx, maxX: hx, minZ: b, maxZ: f }, y);
    if (i < SNOW_FROM) add(scene, new THREE.Mesh(new THREE.BoxGeometry(hx * 2 + 0.06, 0.14, f - b + 0.06), stripe), 0, y - LAYER * 0.58, (f + b) / 2, false); // 深色石紋
    else add(scene, new THREE.Mesh(new THREE.BoxGeometry(hx * 2 + 0.14, 0.2, f - b + 0.14), snowLip), 0, y - 0.1, (f + b) / 2, false); // 雪邊（凸出少少）
  }
  // 山前面中間一條樓梯（小朋友 2026-10-15：爬山唔好慢）：每層 3 級，每級矮過 0.45 米，行上去唔使跳
  const STEPS = 3;
  const SH = MTN.SHRINK_FRONT;
  const SW = MTN.STAIR_HALF;
  const stepMat = mat(0xcfc6b8, { flatShading: true });
  const edgeMat = mat(0xffd54f, { metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i < LAYERS; i++) {
    const front = mtnFront(i); // 呢層嘅前面
    const base = LAYER * i;
    for (let j = 0; j < STEPS; j++) {
      const stepTop = base + (LAYER * (j + 1)) / STEPS;
      const za = front + SH - (SH * (j + 1)) / STEPS; // 越高越入
      const zb = front + SH - (SH * j) / STEPS;
      add(scene, new THREE.Mesh(new THREE.BoxGeometry(SW * 2, stepTop - base + 0.01, zb - za), stepMat), 0, (base + stepTop) / 2, (za + zb) / 2);
      add(scene, new THREE.Mesh(new THREE.BoxGeometry(SW * 2, 0.05, 0.08), edgeMat), 0, stepTop + 0.02, zb - 0.05, false);
      addPlatform({ minX: -SW, maxX: SW, minZ: za, maxZ: zb }, stepTop);
    }
  }
  // 樓梯兩邊嘅石欄（矮矮，裝飾）：每層一嚿
  const curb = mat(0x5d544b, { flatShading: true });
  for (let i = 0; i < LAYERS; i++) {
    for (const s of [-1, 1]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.3, LAYER + 0.35, SH), curb), s * (SW + 0.15), LAYER * i + (LAYER + 0.35) / 2, mtnFront(i) + SH / 2);
  }
  // 樓梯口：大石門 + 橫樑
  const trailZ = mtnFront(0) + SH + 0.6;
  for (const s of [-1, 1]) {
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.0, 5.6, 1.0), mat(0x6d6359, { flatShading: true })), s * (SW + 0.9), 2.8, trailZ);
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 1.3), mat(0x4e463e, { flatShading: true })), s * (SW + 0.9), 0.25, trailZ);
  }
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(SW * 2 + 3.2, 0.8, 1.2), mat(0x5d4037)), 0, 5.8, trailZ);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(SW * 2 + 1.6, 0.12, 0.08), edgeMat), 0, 5.4, trailZ + 0.62, false);
  STAIRS.z = trailZ;

  // 山頂：支旗
  const hx = mtnHx(LAYERS - 1);
  const back = mtnBack(LAYERS - 1);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.5, 0.18), mat(0x5d4037)), hx - 0.5, top + 2.25, back + 0.6);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.05), mat(0xe53935)), hx - 1.4, top + 3.9, back + 0.6, false);
  Object.assign(SUMMIT, { x: 0, z: cz, top, halfX: MTN.TOP_HX - 0.9, halfZ: MTN.TOP_HZ - 0.9 });
  Object.assign(MOUNTAIN, { minX: -mtnHx(0), maxX: mtnHx(0), minZ: mtnBack(0), maxZ: mtnFront(0) });
}

// 礦洞口：石框 + 黑窿 + 木支架 + 礦燈 + 黃牌（rotY：0 = 向 +z，±π/2 = 向兩邊）
function mineDoor(scene, x, y, z, rotY = 0, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.scale.setScalar(s);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.2, 1.4), mat(0x5d544b, { flatShading: true })), 0, 1.6, -0.5);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 0.1), mat(0x111111)), 0, 1.2, 0.22, false);
  for (const sx of [-1, 1]) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.7, 0.4), mat(0x6d4c41)), sx * 1.25, 1.35, 0.35);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.4, 0.45), mat(0x6d4c41)), 0, 2.75, 0.35);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.06), mat(0xffd54f)), 0, 3.2, 0.4, false); // 牌
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8), mat(0xfff59d, { emissive: 0xffd54f, emissiveIntensity: 1.5 })), 0, 2.35, 0.55, false); // 礦燈
  for (const sx of [-0.45, 0.45]) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.2), mat(0x9e9e9e, { metalness: 0.7 })), sx, 0.06, 1.1, false);
  scene.add(g);
  return g;
}
// 一條直路軌（沿 z）：兩條鐵 + 一條條枕木
function railLine(scene, x, za, zb) {
  const len = Math.abs(zb - za);
  const zc = (za + zb) / 2;
  const iron = mat(0x9e9e9e, { metalness: 0.7 });
  const sleeper = mat(0x5d4037);
  for (const sx of [-0.6, 0.6]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, len), iron), x + sx, 0.12, zc, false);
  for (let z = Math.min(za, zb) + 0.4; z < Math.max(za, zb); z += 0.8) add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 0.22), sleeper), x, 0.04, z, false);
}

// Biome 6 再型啲（小朋友 2026-10-15）：瀑布一級級流落嚟、水池、礦洞口 + 路軌、山頂金光圈、鷹喺山頂飛、雪
// Issue #14（2026-11-07）：座山大咗；小朋友話唔好咁多裝飾 → 冇晒松樹、細水晶、礦燈柱，淨係幾嚿大水晶、3 個礦洞口、路軌
function coolMountain(scene, live, rect, rand) {
  const cz = SUMMIT.z;
  const LAYER = MTN.LAYER;
  const SH = MTN.SHRINK_FRONT;
  const LAYERS = MTN.LAYERS;

  // 瀑布：一條流動嘅水，由第 16 層一級級流落山腳（x = -4.6，樓梯左邊）
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
  const wx = -4.6;
  const FALL_TOP = 16;
  for (let i = 0; i <= FALL_TOP; i++) {
    const front = mtnFront(i);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, LAYER), waterMat);
    face.position.set(wx, LAYER * i + LAYER / 2, front + 0.03);
    live.add(face);
    if (i > 0) {
      const flat = new THREE.Mesh(new THREE.PlaneGeometry(1.6, SH), waterMat);
      flat.rotation.x = -Math.PI / 2;
      flat.position.set(wx, LAYER * i + 0.03, front + SH / 2);
      live.add(flat);
    }
  }
  // 瀑布源頭：山上面一個冰洞
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 0.1), mat(0x0d47a1, { emissive: 0x01579b, emissiveIntensity: 0.6 })), wx, LAYER * (FALL_TOP + 1) + 0.5, mtnFront(FALL_TOP + 1) + 0.04, false);
  // 山腳水池 + 水花
  const poolZ = mtnFront(0) + 1.4;
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

  // 礦洞口（小朋友 2026-11-07：唔好咁多裝飾 → 淨係 3 個）：山腳前面（+ 路軌、礦車）、半山一個、右邊山腳一個（駁住礦車路軌）
  const mx = 9;
  const mz = mtnFront(0) + 0.05;
  mineDoor(scene, mx, 0, mz);
  railLine(scene, mx, mz + 0.4, mz + 6.4);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 1.4), mat(0x795548)), mx, 0.55, mz + 3.5);
  const DOOR_HIGH = [11, 14]; // [x, 第幾層]
  mineDoor(scene, DOOR_HIGH[0], LAYER * DOOR_HIGH[1], mtnFront(DOOR_HIGH[1]) + 0.05, 0, 0.9);
  const laneX = MOUNTAIN.maxX + 2.5; // 礦車條路（hazards.js 用同一個位）
  const sideZ = cz + 10;
  mineDoor(scene, mtnHx(0) + 0.05, 0, sideZ, Math.PI / 2);
  const spur = new THREE.Group(); // 礦洞口出嚟嘅短路軌（打橫）駁去礦車路
  railLine(spur, 0, 0, laneX - mtnHx(0) - 0.4);
  spur.rotation.y = Math.PI / 2;
  spur.position.set(mtnHx(0) + 0.4, 0, sideZ);
  scene.add(spur);
  for (const s of [-1, 1]) railLine(scene, s * laneX, MOUNTAIN.minZ + 0.5, rect.maxZ - 1.5); // 兩邊長路軌（礦車喺度上落）

  // 幾嚿大水晶（企喺山級上面同山腳兩個角）：一嚿大 + 兩嚿細，發光
  const crystalColors = [0x7c4dff, 0x00e5ff, 0xff4081];
  const bigCrystal = (x, y, z, size, color) => {
    const m = mat(color, { emissive: color, emissiveIntensity: 1.8, flatShading: true });
    [[0, 0, 1, 0], [0.7, 0.3, 0.6, 0.5], [-0.6, -0.2, 0.5, -0.45]].forEach(([dx, dz, k, lean]) => {
      const cr = add(scene, new THREE.Mesh(new THREE.OctahedronGeometry(size * k), m), x + dx * size, y + size * k * 1.4, z + dz * size, false);
      cr.scale.y = 1.9;
      cr.rotation.z = lean;
    });
  };
  [[-15, 4], [14, 8], [-9, 21]].forEach(([x, i], n) => bigCrystal(x, LAYER * (i + 1), mtnFront(i + 1) + MTN.SHRINK_FRONT / 2, 0.9, crystalColors[n % 3]));
  bigCrystal(-17, 0, mtnFront(0) + 5, 1.4, crystalColors[1]);
  bigCrystal(17, 0, mtnFront(0) + 9, 1.2, crystalColors[0]);

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
    return { g, wings, r: 10 + i * 4, h: SUMMIT.top + 6 + i * 2.5, speed: 0.3 + i * 0.08, phase: i * 2 };
  });

  // 山頂附近落雪
  const SNOW = 200;
  const snowPos = new Float32Array(SNOW * 3);
  const flakes = [];
  for (let i = 0; i < SNOW; i++) flakes.push({ x: (rand() * 2 - 1) * 13, z: cz + (rand() * 2 - 1) * 14, k: rand(), speed: 0.5 + rand() * 0.5 });
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
      snowPos[i * 3 + 1] = SUMMIT.top + 10 - k * 14;
      snowPos[i * 3 + 2] = f.z;
    }
    snowGeo.attributes.position.needsUpdate = true;
  };
}

// Biome 6 山頂後面嘅吊橋（小朋友 Issue #4）：由山頂一路去到生態區盡頭幅牆，
// 兩頭有高高嘅橋塔 + 吊索；盡頭幅牆有個倒數牌「NEW BIOME IS COMING...」
// 橋面係一塊薄台（addPlatform 有 bottom），下面嘅人照行得過（去攞山後面嘅鎚仔）
// 新生態區開咗未（日期到咗）
export function isNewBiomeOpen(now = new Date()) {
  if (!NEW_BIOME_ON) return false; // 2026-11-03 小朋友：收埋 Enchanted Kingdom
  const [y, m, d] = NEW_BIOME_DATE.split('-').map(Number);
  return now >= new Date(y, m - 1, d);
}
export function newBiomeCountdown(now = new Date()) {
  const [y, m, d] = NEW_BIOME_DATE.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((target - today) / 86400000);
  if (days > 1) return `In ${days} days`;
  if (days === 1) return 'Tomorrow!';
  if (days === 0) return 'Coming today!';
  return 'Coming soon!';
}
function buildBridge(scene, live, rect) {
  // Issue #14（2026-11-07）：座山高咗（44.2 米），王國升咗去 KINGDOM_Y（40 米）→ 條橋由山頂平行 3 米，
  // 之後一級級落（木級，每級矮過 0.45 米，返上山都唔使跳），最尾平行 5 米入閘門（數喺 BRIDGE，buildMountain 計）
  const { z1, zA, zB, z2, topA, topB, steps, stepH, tread } = BRIDGE;
  const len = z1 - z2;
  const W = 7; // 橋面闊（小朋友：要大啲）
  const wood = mat(0x8d6e63);
  const wood2 = mat(0x6d4c41);
  const iron = mat(0x455a64, { metalness: 0.6, roughness: 0.4 });
  const gold = mat(0xffc400, { metalness: 0.7, roughness: 0.3 });
  const glass = mat(0xb3e5fc, { transparent: true, opacity: 0.35, roughness: 0.05 });
  const carpet = mat(0xb71c1c);
  // 橋面：兩段平路係闊木板，中間樓梯係一級級木級；中間一條紅地毯
  const planks = (za, zb, y) => {
    const n = Math.max(1, Math.round((za - zb) / 0.6));
    for (let i = 0; i < n; i++) add(scene, new THREE.Mesh(new THREE.BoxGeometry(W, 0.25, (za - zb) / n - 0.06), i % 2 ? wood : wood2), 0, y - 0.125, za - ((i + 0.5) * (za - zb)) / n, false);
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, za - zb), carpet), 0, y + 0.01, (za + zb) / 2, false);
  };
  planks(z1, zA, topA);
  planks(zB, z2 - 0.7, topB);
  addPlatform({ minX: -W / 2, maxX: W / 2, minZ: zA, maxZ: z1 }, topA, topA - 0.4);
  addPlatform({ minX: -W / 2, maxX: W / 2, minZ: z2 - 0.7, maxZ: zB }, topB, topB - 0.4); // 伸過閘門少少，接住王國塊地（以前中間有 0.5 米窿，行得慢會跌落去）
  for (let k = 0; k < steps; k++) {
    const za = zA - k * tread;
    const zb = za - tread;
    const y = topA - (k + 1) * stepH;
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(W, stepH + 0.25, tread), k % 2 ? wood : wood2), 0, y - (stepH + 0.25) / 2, (za + zb) / 2, false);
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, tread), carpet), 0, y + 0.01, (za + zb) / 2, false);
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, 0.06), gold), 0, y + 0.02, za - 0.03, false); // 金色級邊
    addPlatform({ minX: -W / 2, maxX: W / 2, minZ: zb, maxZ: za }, y, y - 0.4);
  }
  // 三段（平、落、平）：扶手、玻璃、側邊鐵樑都跟住呢條線
  const sections = [[z1, topA, zA, topA], [zA, topA, zB, topB], [zB, topB, z2, topB]];
  for (const s of [-1, 1]) {
    for (const [za, ya, zb, yb] of sections) {
      slab(scene, iron, s * (W / 2), 0.4, 0.6, za, ya - 0.35, zb, yb - 0.35, true);
      slab(scene, gold, s * (W / 2 + 0.1), 0.14, 0.1, za, ya + 0.18, zb, yb + 0.18); // 底邊金條
      slab(scene, glass, s * (W / 2 + 0.1), 0.06, 1.2, za, ya + 0.7, zb, yb + 0.7);
      slab(scene, gold, s * (W / 2 + 0.1), 0.2, 0.15, za, ya + 1.6, zb, yb + 1.6);
    }
  }
  // 跌唔落去（小朋友：unfallable）：兩邊有高高嘅隱形欄杆台，只會擋住企喺橋上面嘅人；
  // 有 bottom，所以喺地面行嘅人照可以喺橋下面行過去
  const GUARD = 3.2; // 欄杆擋到幾高（高過跳得到）
  const guard = (za, zb, y) => {
    for (const s of [-1, 1]) addPlatform({ minX: s > 0 ? W / 2 : -W / 2 - 0.4, maxX: s > 0 ? W / 2 + 0.4 : -W / 2, minZ: zb, maxZ: za }, y + GUARD, y - 0.1);
  };
  guard(z1 + 0.05, zA, topA);
  for (let k = 0; k < steps; k++) guard(zA - k * tread, zA - (k + 1) * tread, topA - (k + 1) * stepH);
  guard(zB, z2, topB);
  const hx = SUMMIT.halfX + 0.9; // 山頂最頂嗰層有幾闊（一半）
  if (hx < W / 2) {
    // 接山頂嗰頭：山頂比橋窄，橋兩邊角位都封住
    for (const s of [-1, 1]) addPlatform({ minX: s > 0 ? hx : -W / 2 - 0.4, maxX: s > 0 ? W / 2 + 0.4 : -hx, minZ: z1, maxZ: z1 + 0.4 }, topA + GUARD, topA - 0.1);
  }
  // 睇得見嘅欄杆柱：鐵柱 + 柱頂金球 + 底座（小朋友 2026-10-19：欄杆要型啲）
  const posts = Math.floor(len / 3);
  for (const s of [-1, 1]) {
    for (let i = 0; i <= posts; i++) {
      const pz = z1 - (i * len) / posts;
      const y = bridgeRailAt(pz);
      add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.6, 0.25), iron), s * (W / 2 + 0.1), y + 0.8, pz);
      add(scene, new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), gold), s * (W / 2 + 0.1), y + 1.82, pz, false);
      add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), gold), s * (W / 2 + 0.1), y + 0.07, pz, false);
    }
  }
  // 條橋下面嘅石柱（撐住條橋）
  const pier = mat(0x5d544b, { flatShading: true });
  for (const pz of [MOUNTAIN.minZ - 1.6]) { // 一對，企喺山後面懸崖同閘門中間（唔好貼住山，會卡人）
    const y = bridgeDeckAt(pz) - 0.6;
    for (const s of [-1, 1]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.2, y, 1.2), pier), s * (W / 2 - 0.8), y / 2, pz);
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 0.6, 1.0), pier), 0, y - 0.3, pz);
    for (const s of [-1, 1]) addPlatform({ minX: s * (W / 2 - 0.8) - 0.6, maxX: s * (W / 2 - 0.8) + 0.6, minZ: pz - 0.6, maxZ: pz + 0.6 }, y); // 地面行會撞到（橋面高過佢，唔阻）
  }
  // 燈籠水晶（沿住欄杆，會一閃一閃）
  const lanterns = [];
  const LN = Math.floor(len / 5);
  for (const s of [-1, 1]) {
    for (let i = 0; i <= LN; i++) {
      const c = [0x00e5ff, 0xd500f9, 0x76ff03][(i + (s > 0 ? 1 : 0)) % 3];
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, flatShading: true }));
      m.scale.y = 1.6;
      const lz = z1 - (i * len) / LN;
      m.position.set(s * (W / 2 + 0.1), bridgeRailAt(lz) + 2.15, lz);
      live.add(m);
      lanterns.push(m);
    }
  }
  // 兩座更高嘅橋塔 + 粗吊索（山頂嗰座企喺山頂背面；盡頭座塔貼住幅牆）
  const TOWER_H = 15;
  const towers = [[z1 - 0.8, topA - 3, W / 2 + 1.1, topA + 12], [z2 - 0.2, 0, 5.6, topB + TOWER_H]];
  for (const [tz, base, towerX, tTop] of towers) {
    for (const s of [-1, 1]) {
      const h = tTop - base;
      add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.2, h, 1.2), iron), s * towerX, base + h / 2, tz);
      add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.5), gold), s * towerX, tTop + 0.25, tz);
      add(scene, new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 4), mat(0xd32f2f)), s * towerX, tTop + 1.3, tz).rotation.y = Math.PI / 4;
      if (base === 0) addCollider(s * towerX, tz, 0.5);
    }
    const deck = bridgeDeckAt(tz);
    for (const y of [deck + 4.5, tTop - 0.6]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(towerX * 2 + 1.2, 0.6, 0.7), iron), 0, y, tz);
  }
  const rope = mat(0xbcaaa4);
  const [tA, , xA, yA] = towers[0];
  const [tB, , xB, yB] = towers[1];
  const SEG = 22;
  const sag = Math.max(0, (yA + yB) / 2 - bridgeRailAt((tA + tB) / 2) - 3);
  for (const s of [-1, 1]) {
    let prev = null;
    for (let i = 0; i <= SEG; i++) {
      const k = i / SEG;
      const z = tA + (tB - tA) * k;
      const y = Math.max(bridgeRailAt(z) + 2.6, yA + (yB - yA) * k - Math.sin(k * Math.PI) * sag);
      const p = new THREE.Vector3(s * (xA + (xB - xA) * k), y, z);
      if (prev) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, prev.distanceTo(p), 8), rope);
        seg.position.copy(prev).add(p).multiplyScalar(0.5);
        seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().sub(prev).normalize());
        scene.add(seg);
        if (i < SEG) {
          const foot = new THREE.Vector3(s * (W / 2 + 0.1), bridgeRailAt(z) + 1.6, z);
          const h = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, p.distanceTo(foot), 5), rope);
          h.position.copy(p).add(foot).multiplyScalar(0.5);
          h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), foot.clone().sub(p).normalize());
          scene.add(h);
        }
      }
      prev = p;
    }
  }
  // 閘門地台 = 王國高度（KINGDOM_Y），唔係山頂
  const top = topB;
  // ---- 盡頭：神秘大閘門（新生態區）----
// （KINGDOM_GATE：main.js／開門動畫用）
  // 好大嘅石框 + 圓形金庫門（有會轉嘅符文圈）+ 鐵枝後面旋轉緊嘅紫色能量 + 會浮嘅「?」+ 火花 + 個鎖一閃一閃
  const wallZ = rect.minZ + 0.25;
  const GATE_W = 24;
  const GATE_H = Math.max(top + 14, topA + 8); // 高過座山頂少少
  const stone = mat(0x263238, { roughness: 0.8, flatShading: true });
  const stone2 = mat(0x37474f, { roughness: 0.8, flatShading: true });
  // 牆中間留個門窿（閘門開咗就行得入 Biome 7）
  const HOLE_W = 8.4;
  const HOLE_TOP = top + 10.4;
  const sideW = (GATE_W - HOLE_W) / 2;
  for (const s of [-1, 1]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(sideW, GATE_H, 1.2), stone), s * (HOLE_W / 2 + sideW / 2), GATE_H / 2, wallZ);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(HOLE_W, top, 1.2), stone), 0, top / 2, wallZ);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(HOLE_W, GATE_H - HOLE_TOP, 1.2), stone), 0, (GATE_H + HOLE_TOP) / 2, wallZ);
  // 閘門兩邊嘅牆一路去到山（小朋友：傳送門旁邊冇咗牆，望到個天）
  const sideSpan = rect.maxX + 14 - GATE_W / 2;
  for (const s of [-1, 1]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(sideSpan, GATE_H, 1.6), stone), s * (GATE_W / 2 + sideSpan / 2), GATE_H / 2, wallZ - 0.2);
  for (const s of [-1, 1]) {
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(2.4, GATE_H + 4, 2.4), stone2), s * (GATE_W / 2), (GATE_H + 4) / 2, wallZ + 0.4); // 大柱
    add(scene, new THREE.Mesh(new THREE.OctahedronGeometry(1.3), mat(0xd500f9, { emissive: 0xd500f9, emissiveIntensity: 1.4, flatShading: true })), s * (GATE_W / 2), GATE_H + 5, wallZ + 0.4);
  }
  // 圓形金庫門（喺橋嘅高度）
  const doorY = top + 5.5;
  const R = 5.2;
  add(scene, new THREE.Mesh(new THREE.TorusGeometry(R + 0.5, 0.7, 10, 48), gold), 0, doorY, wallZ + 0.7);
  // 旋轉嘅紫色能量（canvas 漩渦）
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.25, '#ea80fc');
  grd.addColorStop(0.7, '#6a1b9a');
  grd.addColorStop(1, '#12002b');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    for (let a = 0; a < 9; a += 0.1) {
      const r = a * 6.5;
      const x = 64 + Math.cos(a + (k * Math.PI) / 2) * r;
      const y = 64 + Math.sin(a + (k * Math.PI) / 2) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const swirlTex = new THREE.CanvasTexture(c);
  swirlTex.colorSpace = THREE.SRGBColorSpace;
  const swirl = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshBasicMaterial({ map: swirlTex, transparent: true, opacity: 0.95 }));
  swirl.position.set(0, doorY, wallZ + 0.65);
  live.add(swirl);
  // 鐵枝（擋住個能量門）：閘門開嗰陣升上去
  const bars = new THREE.Group();
  for (let i = -4; i <= 4; i++) {
    const hh = 2 * Math.sqrt(Math.max(0, R * R - (i * 1.15) ** 2));
    add(bars, new THREE.Mesh(new THREE.BoxGeometry(0.22, hh, 0.22), iron), i * 1.15, doorY, wallZ + 0.85);
  }
  live.add(bars);
  Object.assign(KINGDOM_GATE, { bars, swirl, z: wallZ, y: top });
  // 開咗之後：一道會閃嘅魔法傳送門（行得穿）：星空漩渦 + 兩圈會轉嘅光環 + 吸入去嘅閃粉
  const pc = document.createElement('canvas');
  pc.width = pc.height = 256;
  const pctx = pc.getContext('2d');
  const pg = pctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  pg.addColorStop(0, 'rgba(255,255,255,1)');
  pg.addColorStop(0.3, 'rgba(128,216,255,0.9)');
  pg.addColorStop(0.65, 'rgba(234,128,252,0.7)');
  pg.addColorStop(1, 'rgba(49,27,146,0)');
  pctx.fillStyle = pg;
  pctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    pctx.fillStyle = ['#fff', '#fff59d', '#b9f6ca'][i % 3];
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 120;
    pctx.fillRect(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 2.5, 2.5);
  }
  const portalTex = new THREE.CanvasTexture(pc);
  portalTex.colorSpace = THREE.SRGBColorSpace;
  const portal = new THREE.Group();
  portal.position.set(0, doorY, wallZ + 0.7);
  const face = new THREE.Mesh(new THREE.CircleGeometry(R - 0.1, 48), new THREE.MeshBasicMaterial({ map: portalTex, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  portal.add(face);
  const rings = [[R + 0.2, 0xffd740], [R - 0.6, 0x18ffff], [R - 1.6, 0xea80fc]].map(([rr, c]) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.12, 8, 64), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    portal.add(m);
    return m;
  });
  const PN = 60;
  const pPos = new Float32Array(PN * 3);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pPts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pPts.frustumCulled = false;
  portal.add(pPts);
  portal.visible = false;
  live.add(portal);
  Object.assign(KINGDOM_GATE, { portal, face, rings, pPos, pGeo, R });
  // 兩圈會轉嘅符文
  const runes = [R + 1.7, R + 2.6].map((rr, k) => {
    const g = new THREE.Group();
    const runeMat = new THREE.MeshStandardMaterial({ color: k ? 0x00e5ff : 0x76ff03, emissive: k ? 0x00e5ff : 0x76ff03, emissiveIntensity: 1.5 });
    const count = k ? 16 : 12;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), runeMat);
      m.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0);
      m.rotation.z = a + (i % 2 ? 0.8 : 0);
      g.add(m);
    }
    g.position.set(0, doorY, wallZ + 0.75);
    live.add(g);
    return g;
  });
  // 大鎖（一閃一閃）
  const lock = makeLabel([{ text: '🔒', color: '#ffffff' }], 3.2);
  lock.position.set(0, doorY - R - 1.3, wallZ + 1.6);
  live.add(lock);
  const lockScale = lock.scale.clone();
  // 會浮嘅「?」同方塊
  const qMat = new THREE.MeshStandardMaterial({ color: 0xffd600, emissive: 0xffab00, emissiveIntensity: 1 });
  const qs = [-9, -6, 6, 9].map((x, i) => {
    const q = makeLabel([{ text: '❓', color: '#ffeb3b' }], 1.6);
    q.position.set(x, top + 7 + (i % 2) * 2, wallZ + 1.4);
    live.add(q);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), qMat);
    cube.position.set(x * 0.85, top + 11 + (i % 2), wallZ + 1.6);
    live.add(cube);
    return { q, cube, base: q.position.y, cbase: cube.position.y, i };
  });
  // 牆頂後面嘅神秘剪影（似一座座好大嘅嘢喺霧入面）
  for (const [x, h, w] of [[-7, 9, 4], [-2, 14, 3], [4, 11, 5], [9, 7, 3]]) {
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), mat(0x1a1030)), x, GATE_H + h / 2 - 2, wallZ - 3, false);
  }
  const fog = new THREE.Mesh(new THREE.PlaneGeometry(GATE_W + 4, 10), new THREE.MeshBasicMaterial({ color: 0xb39ddb, transparent: true, opacity: 0.35, depthWrite: false }));
  fog.position.set(0, GATE_H + 3, wallZ - 1.4);
  live.add(fog);
  // 火花（由能量門噴出嚟）
  const SP = 50;
  const spPos = new Float32Array(SP * 3);
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xea80fc, size: 0.25, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparks.frustumCulled = false;
  live.add(sparks);
  const seeds = Array.from({ length: SP }, () => ({ a: Math.random() * Math.PI * 2, k: Math.random(), s: 0.5 + Math.random() }));
  // 全息倒數牌（喺能量門上面）
  const sign = dynamicSign(11, 3.2);
  sign.mesh.position.set(0, doorY + R + 3.6, wallZ + 1.0);
  live.add(sign.mesh);
  let lastCheck = -1;
  return (dt, t) => {
    // 閘門開：鐵枝升上去、漩渦消失、鎖唔見
    const target = kingdom.open ? 1 : 0;
    KINGDOM_GATE.open += (target - KINGDOM_GATE.open) * Math.min(1, dt * (KINGDOM_GATE.fast ? 0.8 : 3));
    const k = KINGDOM_GATE.open;
    bars.position.y = k * 12;
    swirl.material.opacity = 0.95 * (1 - k);
    swirl.visible = k < 0.98;
    lock.visible = k < 0.5;
    // 魔法傳送門（開咗先有）
    const G = KINGDOM_GATE;
    G.portal.visible = k > 0.3;
    if (G.portal.visible) {
      G.portal.scale.setScalar(Math.min(1, (k - 0.3) / 0.6));
      G.face.rotation.z = t * 0.6;
      G.face.material.opacity = 0.55 + Math.sin(t * 2.5) * 0.15;
      G.rings.forEach((r, i) => {
        r.rotation.z = t * (i % 2 ? -0.8 : 1.1);
        r.rotation.x = Math.sin(t * 0.9 + i) * 0.25;
      });
      for (let i = 0; i < 60; i++) {
        const kk = (t * 0.35 + i / 60) % 1;
        const a = i * 2.4 + kk * 6;
        const r = G.R * (1 - kk);
        G.pPos[i * 3] = Math.cos(a) * r;
        G.pPos[i * 3 + 1] = Math.sin(a) * r;
        G.pPos[i * 3 + 2] = 0.3 - kk * 0.6;
      }
      G.pGeo.attributes.position.needsUpdate = true;
    }
    if (Math.floor(t) !== lastCheck && (kingdom.open || (NEW_BIOME_ON && state.bigButton) || isNewBiomeOpen())) {
      lastCheck = Math.floor(t);
      sign.draw(THEMES.purple, [
        { text: '👑 THE ENCHANTED KINGDOM 👑', size: 0.14, color: '#fff59d' },
        { text: 'IS OPEN!', size: 0.22 },
        { text: 'Walk through the gate...', size: 0.08, color: '#e1bee7' },
      ]);
    } else if (Math.floor(t) !== lastCheck && !NEW_BIOME_ON) {
      lastCheck = Math.floor(t);
      sign.draw(THEMES.purple, [
        { text: '👑 THE ENCHANTED KINGDOM 👑', size: 0.14, color: '#fff59d' },
        { text: '🔒 CLOSED', size: 0.22 },
        { text: 'The gate is locked for now...', size: 0.08, color: '#e1bee7' },
      ]);
    } else if (Math.floor(t) !== lastCheck) {
      lastCheck = Math.floor(t);
      sign.draw(THEMES.purple, [
        { text: '✨ NEW BIOME IS COMING... ✨', size: 0.13, color: '#fff59d' },
        { text: newBiomeCountdown(), size: 0.22 },
        { text: 'Something BIG is behind this gate...', size: 0.075, color: '#e1bee7' },
      ]);
    }
    swirl.rotation.z = -t * 0.8;
    runes[0].rotation.z = t * 0.3;
    runes[1].rotation.z = -t * 0.2;
    lock.scale.copy(lockScale).multiplyScalar(1 + Math.sin(t * 3) * 0.08);
    for (const q of qs) {
      q.q.position.y = q.base + Math.sin(t * 2 + q.i) * 0.5;
      q.cube.position.y = q.cbase + Math.sin(t * 1.5 + q.i * 2) * 0.4;
      q.cube.rotation.set(t * 0.7 + q.i, t + q.i, 0);
    }
    lanterns.forEach((l, i) => (l.material.emissiveIntensity = 1.1 + Math.sin(t * 3 + i * 0.7) * 0.6));
    for (let i = 0; i < SP; i++) {
      const sd = seeds[i];
      const k = (sd.k + t * 0.4 * sd.s) % 1;
      const r = R * (0.2 + k * 0.9);
      spPos[i * 3] = Math.cos(sd.a + t * 0.5) * r;
      spPos[i * 3 + 1] = doorY + Math.sin(sd.a + t * 0.5) * r;
      spPos[i * 3 + 2] = wallZ + 1.0 + k * 4;
    }
    spGeo.attributes.position.needsUpdate = true;
    fog.material.opacity = 0.3 + Math.sin(t * 0.7) * 0.08;
  };
}

// Biome 6：採礦山 — 中間一座好大嘅三角形山（要跳上去），山前面有石、水晶、鑽機
function mining(scene, rect, rand, live) {
  // Issue #14（小朋友 2026-11-07：「dont add too many decorations」）：唔再擺一堆細石、細水晶、木支架、鑽機；
  // 淨係一座大山（石層、雪頂、幾嚿大水晶、礦洞口、路軌），乾淨型啲
  buildMountain(scene, rect);
  const updateCool = coolMountain(scene, live, rect, rand);
  const updateBridge = buildBridge(scene, live, rect);
  return (dt, t) => {
    updateCool(dt, t);
    updateBridge(dt, t);
  };
}
