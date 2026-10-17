// 每個生態區（同 Hub）嘅裝飾：樹、珊瑚、冰、箱…
// 裝飾放喺兩邊，中間留條路（|x| < 3）俾玩家行。

import * as THREE from 'three';
import { addPlatform, addCollider, kingdom } from './world.js';
import { state } from './state.js';
import { enchanted } from './enchanted.js';
import { arcticV2, smugglersV2 } from './biomeArt.js'; // Issue #2：Biome 4、5 新美術
import { dynamicSign, makeLabel, THEMES } from './signs.js';
import { NEW_BIOME_DATE } from './data/balance.js';
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
  return null;
}

// Biome 2：污染海灘（小朋友 2026-10-15 揀「沙灘 + 海」）：
// 左邊係海（有浪、有隻漏油嘅大油輪），右邊係沙灘（棕櫚樹、遮陽傘、救生員塔、沙堡、蟹、海鷗）
// 沙灘同淺水有垃圾：行埋去撳 E 執走（TRASH，main.js 處理）
export const TRASH = [];
const SHORE_X = -6; // 海同沙灘嘅分界
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
  const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.7, roughness: 0.15, metalness: 0.1 }));
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
  for (let n = 0; n < 3; n++) {
    const x = 8 + rand() * 8;
    const z = rect.minZ + 8 + n * (d / 3.2);
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

// Biome 6 山頂後面嘅吊橋（小朋友 Issue #4）：由山頂一路去到生態區盡頭幅牆，
// 兩頭有高高嘅橋塔 + 吊索；盡頭幅牆有個倒數牌「NEW BIOME IS COMING...」
// 橋面係一塊薄台（addPlatform 有 bottom），下面嘅人照行得過（去攞山後面嘅鎚仔）
// 新生態區開咗未（日期到咗）
export function isNewBiomeOpen(now = new Date()) {
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
  const top = SUMMIT.top;
  const z1 = SUMMIT.z - SUMMIT.halfZ - 0.9; // 山頂背面（最頂嗰層嘅邊）
  const z2 = rect.minZ + 0.5; // 盡頭幅牆
  const len = z1 - z2;
  const zc = (z1 + z2) / 2;
  const W = 7; // 橋面闊（小朋友：要大啲）
  const wood = mat(0x8d6e63);
  const wood2 = mat(0x6d4c41);
  const iron = mat(0x455a64, { metalness: 0.6, roughness: 0.4 });
  const gold = mat(0xffc400, { metalness: 0.7, roughness: 0.3 });
  const glass = mat(0xb3e5fc, { transparent: true, opacity: 0.35, roughness: 0.05 });
  // 橋面：闊木板 + 中間一條紅地毯
  const n = Math.floor(len / 0.6);
  for (let i = 0; i < n; i++) add(scene, new THREE.Mesh(new THREE.BoxGeometry(W, 0.25, 0.54), i % 2 ? wood : wood2), 0, top - 0.125, z1 - 0.3 - i * (len / n), false);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, len), mat(0xb71c1c)), 0, top + 0.01, zc, false);
  for (const s of [-1, 1]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, len), iron), s * (W / 2), top - 0.35, zc);
  addPlatform({ minX: -W / 2, maxX: W / 2, minZ: z2, maxZ: z1 }, top, top - 0.4);
  // 跌唔落去（小朋友：unfallable）：兩邊有高高嘅隱形欄杆台，只會擋住企喺橋上面嘅人；
  // 有 bottom，所以喺地面行嘅人照可以喺橋下面行過去攞鎚仔
  const GUARD = 3.2; // 欄杆擋到幾高（高過跳得到）
  const hx = SUMMIT.halfX + 0.9; // 山頂最頂嗰層有幾闊（一半）
  for (const s of [-1, 1]) {
    addPlatform({ minX: s > 0 ? W / 2 : -W / 2 - 0.4, maxX: s > 0 ? W / 2 + 0.4 : -W / 2, minZ: z2, maxZ: z1 + 0.05 }, top + GUARD, top - 0.1);
    // 接山頂嗰頭：山頂比橋窄，橋兩邊角位都封住
    addPlatform({ minX: s > 0 ? hx : -W / 2 - 0.4, maxX: s > 0 ? W / 2 + 0.4 : -hx, minZ: z1, maxZ: z1 + 0.4 }, top + GUARD, top - 0.1);
  }
  // 睇得見嘅欄杆：鐵柱 + 玻璃板 + 金色扶手
  const posts = Math.floor(len / 3);
  for (const s of [-1, 1]) {
    for (let i = 0; i <= posts; i++) add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.6, 0.25), iron), s * (W / 2 + 0.1), top + 0.8, z1 - (i * len) / posts);
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, len), glass), s * (W / 2 + 0.1), top + 0.7, zc, false);
    add(scene, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, len), gold), s * (W / 2 + 0.1), top + 1.6, zc, false);
  }
  // 燈籠水晶（沿住欄杆，會一閃一閃）
  const lanterns = [];
  const LN = Math.floor(len / 5);
  for (const s of [-1, 1]) {
    for (let i = 0; i <= LN; i++) {
      const c = [0x00e5ff, 0xd500f9, 0x76ff03][(i + (s > 0 ? 1 : 0)) % 3];
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, flatShading: true }));
      m.scale.y = 1.6;
      m.position.set(s * (W / 2 + 0.1), top + 2.15, z1 - (i * len) / LN);
      live.add(m);
      lanterns.push(m);
    }
  }
  // 兩座更高嘅橋塔 + 粗吊索
  const TOWER_H = 15;
  // 盡頭座塔貼住幅牆（z2 - 0.2），唔好阻住喺橋下面行過去攞鎚仔（z ≈ -370.2）
  const towers = [[z1 - 0.8, top - 3, W / 2 + 1.1], [z2 - 0.2, 0, 5.6]];
  for (const [tz, base, towerX] of towers) {
    for (const s of [-1, 1]) {
      const h = top + TOWER_H - base;
      add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.2, h, 1.2), iron), s * towerX, base + h / 2, tz);
      add(scene, new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.5), gold), s * towerX, top + TOWER_H + 0.25, tz);
      add(scene, new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 4), mat(0xd32f2f)), s * towerX, top + TOWER_H + 1.3, tz).rotation.y = Math.PI / 4;
      if (base === 0) addCollider(s * towerX, tz, 0.5);
    }
    for (const y of [top + 4.5, top + TOWER_H - 0.6]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(towerX * 2 + 1.2, 0.6, 0.7), iron), 0, y, tz);
  }
  const rope = mat(0xbcaaa4);
  const tA = towers[0][0];
  const tB = towers[1][0];
  const SEG = 18;
  for (const s of [-1, 1]) {
    let prev = null;
    for (let i = 0; i <= SEG; i++) {
      const k = i / SEG;
      const z = tA + (tB - tA) * k;
      const y = top + TOWER_H - Math.sin(k * Math.PI) * (TOWER_H - 2.4);
      const p = new THREE.Vector3(s * (towers[0][2] + (towers[1][2] - towers[0][2]) * k), y, z);
      if (prev) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, prev.distanceTo(p), 8), rope);
        seg.position.copy(prev).add(p).multiplyScalar(0.5);
        seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().sub(prev).normalize());
        scene.add(seg);
        if (i < SEG) {
          const foot = new THREE.Vector3(s * (W / 2 + 0.1), top + 1.6, z);
          const h = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, p.distanceTo(foot), 5), rope);
          h.position.copy(p).add(foot).multiplyScalar(0.5);
          h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), foot.clone().sub(p).normalize());
          scene.add(h);
        }
      }
      prev = p;
    }
  }

  // ---- 盡頭：神秘大閘門（新生態區）----
// （KINGDOM_GATE：main.js／開門動畫用）
  // 好大嘅石框 + 圓形金庫門（有會轉嘅符文圈）+ 鐵枝後面旋轉緊嘅紫色能量 + 會浮嘅「?」+ 火花 + 個鎖一閃一閃
  const wallZ = rect.minZ + 0.25;
  const GATE_W = 24;
  const GATE_H = top + 14;
  const stone = mat(0x263238, { roughness: 0.8, flatShading: true });
  const stone2 = mat(0x37474f, { roughness: 0.8, flatShading: true });
  // 牆中間留個門窿（閘門開咗就行得入 Biome 7）
  const HOLE_W = 8.4;
  const HOLE_TOP = top + 10.4;
  const sideW = (GATE_W - HOLE_W) / 2;
  for (const s of [-1, 1]) add(scene, new THREE.Mesh(new THREE.BoxGeometry(sideW, GATE_H, 1.2), stone), s * (HOLE_W / 2 + sideW / 2), GATE_H / 2, wallZ);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(HOLE_W, top, 1.2), stone), 0, top / 2, wallZ);
  add(scene, new THREE.Mesh(new THREE.BoxGeometry(HOLE_W, GATE_H - HOLE_TOP, 1.2), stone), 0, (GATE_H + HOLE_TOP) / 2, wallZ);
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
    if (Math.floor(t) !== lastCheck && (kingdom.open || state.bigButton || isNewBiomeOpen())) {
      lastCheck = Math.floor(t);
      sign.draw(THEMES.purple, [
        { text: '👑 THE ENCHANTED KINGDOM 👑', size: 0.14, color: '#fff59d' },
        { text: 'IS OPEN!', size: 0.22 },
        { text: 'Walk through the gate...', size: 0.08, color: '#e1bee7' },
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
  const updateBridge = buildBridge(scene, live, rect);
  return (dt, t) => {
    updateCool(dt, t);
    updateBridge(dt, t);
    drills.forEach((bit, i) => {
      bit.position.y = 2 + Math.sin(t * 3 + i) * 1.2;
      bit.rotation.y = t * 8;
    });
  };
}
