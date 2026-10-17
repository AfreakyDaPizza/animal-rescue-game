// 地圖：倒轉 T 字（⊥）
// 由上面望落去：-z 係「上」（生態區方向），+z 係「下」（Hub 底邊）。
//
//            ┌──┐  ← Biome 5（最頂）
//            │  │
//            │  │  ← Biome 1
//   ┌────────┘  └────────┐
//    \       HUB        /   ← 圓形（小朋友 2026-10-15）
//      `--------------`

import * as THREE from 'three';
import { biomeFloorTexture } from './biomeArt.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { decorateBiome } from './biomes.js';
import { buildHubPark } from './hubPark.js';
import { makeSign, dynamicSign, signOnPosts, THEMES } from './signs.js';
import { BOSSES, BIOME_BASE_MONEY } from './data/balance.js';

// ---- 地圖尺寸（想改大細就改呢度）----
import { HUB } from './hubShape.js';
import { GATE_LANE, YARD, LAB_DOOR, LAB, LAB_DOOR_Z, ARENA, BEACH, BEACH_PASS } from './labShape.js';
import { beach } from './secretBeach.js';
export { HUB };
const HUB_TOP_HALF = Math.sqrt(HUB.r ** 2 - HUB.cz ** 2); // 頂嗰條直線有幾闊（一半）
export const BIOME_LENGTH = 62;                                     // 每個生態區有幾長
export const STEM = { minX: -21, maxX: 21, minZ: -6 * BIOME_LENGTH, maxZ: 0 }; // 直嘅通道（小朋友 2026-10-15：生態區大啲、長啲）

const WALL_HEIGHT = 3.5;
const WALL_THICKNESS = 1;

export const BIOMES = [
  { name: 'Biome 1 - Deforestation Site', short: 'Deforestation Site', floor: 0x5f8a2e },
  { name: 'Biome 2 - Polluted Ocean', short: 'Polluted Ocean', floor: 0xd9c38f },
  { name: 'Biome 3 - Bird Poaching Site', short: 'Bird Poaching Site', floor: 0x3f6b2a },
  { name: 'Biome 4 - Arctic Meltdown', short: 'Arctic Meltdown', floor: 0xeef6fa },
  { name: "Biome 5 - Smuggler's Compound", short: "Smuggler's Compound", floor: 0x4a4550 },
  { name: 'Biome 6 - Mining Mountain', short: 'Mining Mountain', floor: 0x8a7f72 },
];

// 每個生態區嘅範圍（i = 0 係 Biome 1）
export function biomeRect(i) {
  const maxZ = STEM.maxZ - i * BIOME_LENGTH;
  return { minX: STEM.minX, maxX: STEM.maxX, minZ: maxZ - BIOME_LENGTH, maxZ };
}

// 玩家而家喺邊？（Hub 或者第幾個生態區）
export function whereIs(x, z) {
  // Hub 大門外面（Issue #2）：前院、實驗室、圓形 Boss Arena（好遠，經傳送門去）
  if (z > ARENA.z - ARENA.r - 5) return 'Boss Arena';
  if (z > LAB_DOOR_Z + 0.5) return 'Laboratory';
  if (x > BEACH.minX && z > BEACH.minZ && z < BEACH.maxZ) return 'Secret Beach';
  if (z > STEM.maxZ && Math.hypot(x - HUB.cx, z - HUB.cz) > HUB.r - 0.3) return 'Outside the Park';
  if (z > STEM.maxZ) return 'Hub';
  const i = Math.min(BIOMES.length - 1, Math.floor((STEM.maxZ - z) / BIOME_LENGTH));
  return BIOMES[i].name;
}

// ---- 撞嘢 ----
// 圓形障礙物（樹、箱、跑步機…），玩家行唔穿
export const colliders = [];
export function addCollider(x, z, r) {
  colliders.push({ x, z, r });
}

// 一個點（加埋公仔嘅闊度 radius）行唔行得到？
// 夜晚：生態區入口鎖住（有道閘）
export const gate = { locked: false, mesh: null };
// Hub 底大門（ANIMAL RESCUE PARK）：圖鑑有 25 隻先開（Issue #2）；開咗先行得出去前院同實驗室
export const parkGate = { open: false };

// ---- 石台（可以跳上去企）----
// { minX, maxX, minZ, maxZ, top }：top 係台面有幾高
export const platforms = [];
// bottom（可以唔俾）：塊台有幾厚 → 例如天橋，下面夠高就可以喺下面行過（唔會當牆）
export function addPlatform(rect, top, bottom = null) {
  platforms.push({ ...rect, top, bottom });
}
const HEADROOM = 2.2; // 喺天橋下面行要幾高位
const STEP_UP = 0.45; // 低過呢個高度嘅台，行過去自動踏上去（例如跑步機）

// 喺 (x, z) 腳下最高嘅台面（腳嘅高度 feetY 要夠高先企得上去）；冇台就係地面 0
export function groundAt(x, z, feetY) {
  let ground = 0;
  for (const p of platforms) {
    if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ && p.top <= feetY + STEP_UP) ground = Math.max(ground, p.top);
  }
  return ground;
}

// feetY：玩家腳嘅高度。太矮嘅時候，石台就好似牆咁擋住（要跳先上到）
export function isWalkable(x, z, radius, feetY = 0) {
  if (gate.locked && z < 0.8) return false; // 閘口落咗，入唔到通道
  for (const p of platforms) {
    // 矮嘅樓梯級唔計公仔闊度（級太淺，計埋就會俾第二級擋住，踏唔上第一級）
    if (p.bottom !== null && feetY + HEADROOM < p.bottom) continue; // 喺天橋下面行過
    const m = p.top - feetY <= STEP_UP * 2.2 ? 0 : radius;
    if (feetY + STEP_UP < p.top && x > p.minX - m && x < p.maxX + m && z > p.minZ - m && z < p.maxZ + m) return false;
  }
  const r = radius + WALL_THICKNESS / 2; // 牆有一半厚度企喺地圖入面
  const inRect = (rect) =>
    x >= rect.minX + r && x <= rect.maxX - r && z >= rect.minZ + r && z <= rect.maxZ - r;
  const inHub = z >= HUB.minZ + r && Math.hypot(x - HUB.cx, z - HUB.cz) <= HUB.r - r;
  // 通道向下伸入 Hub 少少，等兩部分接得順，唔會喺接口卡住
  const stemIntoHub = { ...STEM, maxZ: 8 };
  const outside = parkGate.open && (inRect(GATE_LANE) || inRect(YARD) || inRect(LAB_DOOR) || inRect(LAB) || (beach.open && (inRect(BEACH_PASS) || inRect(BEACH))));
  if (Math.hypot(x - ARENA.x, z - ARENA.z) <= ARENA.r - r) return colliders.every((c) => Math.hypot(x - c.x, z - c.z) >= c.r + radius); // 圓形 Arena：圓形力場牆擋住
  if (!inHub && !inRect(stemIntoHub) && !outside) return false;
  return colliders.every((c) => Math.hypot(x - c.x, z - c.z) >= c.r + radius);
}

// ---- 起成個世界 ----
// 回傳一個 update(dt, time) 俾主迴圈每格畫面叫，用嚟郁水、雀、雪
export function buildWorld(scene) {
  const animators = [];

  addHubFloor(scene);
  const staticRoot = new THREE.Group(); // 唔會郁嘅裝飾先放埋呢度，最後焊埋
  animators.push(buildHubPark(staticRoot, scene));

  BIOMES.forEach((biome, i) => {
    const rect = biomeRect(i);
    addFloor(scene, rect, biome.floor, i === 3 ? 0.03 : 0.1, i);
    addBanner(scene, biome.name, rect.maxZ - 0.5, i);
    addBossSign(scene, i, rect.maxZ - 3);
    animators.push(decorateBiome(staticRoot, i, rect, scene));
  });

  // 圍牆：通道（直）+ Hub 頂嘅兩截直線 + Hub 個圓弧（大門口留個窿）
  const wallMaterial = new THREE.MeshStandardMaterial({ map: stoneTexture() });
  const stemWall = [
    [-HUB_TOP_HALF, 0],
    [STEM.minX, 0],
    [STEM.minX, STEM.minZ],
    [STEM.maxX, STEM.minZ],
    [STEM.maxX, 0],
    [HUB_TOP_HALF, 0],
  ];
  for (let i = 0; i < stemWall.length - 1; i++) addWall(scene, ...stemWall[i], ...stemWall[i + 1], wallMaterial);
  const a0 = Math.asin(-HUB.cz / HUB.r); // 右上角（z = 0）嘅角度
  const a1 = Math.PI - a0; // 左上角
  const SEGMENTS = 60;
  const arc = (a) => [HUB.cx + Math.cos(a) * HUB.r, HUB.cz + Math.sin(a) * HUB.r];
  for (let i = 0; i < SEGMENTS; i++) {
    const [x1, z1] = arc(a0 + ((a1 - a0) * i) / SEGMENTS);
    const [x2, z2] = arc(a0 + ((a1 - a0) * (i + 1)) / SEGMENTS);
    if (Math.abs((x1 + x2) / 2) < 3.2 && z1 > HUB.cz) continue; // 大門口
    addWall(scene, x1, z1, x2, z2, wallMaterial, 0.15);
  }

  addClouds(staticRoot);
  bakeStatic(staticRoot, scene);
  addSky(scene);
  addGate(scene);

  return (dt, time) => {
    animators.forEach((update) => update && update(dt, time));
    // 閘口慢慢升起／降落
    const target = gate.locked ? 0 : -6.5;
    gate.mesh.position.y += (target - gate.mesh.position.y) * Math.min(1, dt * 2);
  };
}

function addFloor(scene, rect, color, variation, i = -1) {
  const w = rect.maxX - rect.minX;
  const d = rect.maxZ - rect.minZ;
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(w, 1, d),
    new THREE.MeshStandardMaterial({ map: biomeFloorTexture(i, w, d) || noiseTexture(color, variation, w / 4, d / 4) }),
  );
  floor.position.set(rect.minX + w / 2, -0.5, rect.minZ + d / 2);
  floor.receiveShadow = true;
  scene.add(floor);
}

// 圓形 Hub 地板（頂嗰截 z < 0 切走）
function addHubFloor(scene) {
  const shape = new THREE.Shape();
  const a0 = Math.asin(-HUB.cz / HUB.r);
  const a1 = Math.PI - a0;
  // Shape 喺 XY 平面，之後轉落地：y = -z
  for (let i = 0; i <= 64; i++) {
    const a = a0 + ((a1 - a0) * i) / 64;
    const x = HUB.cx + Math.cos(a) * HUB.r;
    const z = HUB.cz + Math.sin(a) * HUB.r;
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  }
  shape.closePath();
  const floor = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 1),
    new THREE.MeshStandardMaterial({ map: noiseTexture(0x7fb069, 0.08, 0.25, 0.25) }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
}

// 一幅直線牆，由 (x1,z1) 去 (x2,z2)；extra = 兩頭加長幾多（轉角位唔會有窿）
function addWall(scene, x1, z1, x2, z2, material, extra = WALL_THICKNESS) {
  const length = Math.hypot(x2 - x1, z2 - z1) + extra;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(length, WALL_HEIGHT, WALL_THICKNESS), material);
  wall.position.set((x1 + x2) / 2, WALL_HEIGHT / 2, (z1 + z2) / 2);
  wall.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
}

export const BIOME_THEMES = [THEMES.green, THEMES.blue, THEMES.orange, THEMES.ice, THEMES.purple, THEMES.wood];
const PILLAR_COLORS = [0x6d4c41, 0x546e7a, 0x8d6e63, 0xb3e5fc, 0x4a3b52, 0x5d5d5d];

// 每個生態區入口：兩條方柱 + 橫樑 + 大牌（好似一道門）
function addBanner(scene, text, z, i) {
  const pillar = new THREE.MeshStandardMaterial({ color: PILLAR_COLORS[i], roughness: 0.7 });
  const cap = new THREE.MeshStandardMaterial({ color: 0xfff3e0, roughness: 0.5 });
  for (const x of [STEM.minX + 1.2, STEM.maxX - 1.2]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.0, 6.5, 1.0), pillar);
    p.position.set(x, 3.25, z);
    p.castShadow = true;
    scene.add(p);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 1.3), cap);
    top.position.set(x, 6.6, z);
    scene.add(top);
    addCollider(x, z, 0.8);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(STEM.maxX - STEM.minX - 2, 0.5, 0.6), pillar);
  beam.position.set(0, 6.3, z);
  scene.add(beam);
  const board = makeSign(text, STEM.maxX - STEM.minX - 6, 2.2, BIOME_THEMES[i]);
  board.position.set(0, 4.9, z);
  scene.add(board);
}

// 入口隔籬嘅 Boss 牌：要幾多 Speed／IQ，你夠唔夠
const bossSigns = [];
function addBossSign(scene, i, z) {
  const sign = dynamicSign(4.2, 2.6);
  const group = signOnPosts(sign.mesh, 4.2, 2.6, 2.0);
  group.position.set(STEM.minX + 3.6, 0, z);
  group.rotation.y = 0.35; // 斜斜對住行入嚟嘅玩家
  scene.add(group);
  addCollider(STEM.minX + 3.6, z, 1.2);
  bossSigns.push({ i, sign });
}

const fmt = (n) => Math.floor(n).toLocaleString('en-US');
export function updateBossSigns(speed, iq) {
  for (const { i, sign } of bossSigns) {
    const boss = BOSSES[i];
    const speedOk = speed >= boss.speed;
    const iqOk = iq >= boss.iq;
    sign.draw(THEMES.red, [
      { text: `BOSS: ${boss.name.toUpperCase()}`, size: 0.17, color: '#ffeb3b' },
      { text: `Speed needed: ${fmt(boss.speed)} ${speedOk ? '✔' : '✘'}`, size: 0.12, color: speedOk ? '#b9f6ca' : '#ffcdd2' },
      { text: `IQ needed: ${fmt(boss.iq)} ${iqOk ? '✔' : '✘'}`, size: 0.12, color: iqOk ? '#b9f6ca' : '#ffcdd2' },
      { text: `You: ${fmt(speed)} Speed · ${fmt(iq)} IQ`, size: 0.1 },
      { text: `Pets from here: $${fmt(BIOME_BASE_MONEY[i])}+/sec (heavier = more)`, size: 0.1, color: '#fff59d' },
    ]);
  }
}

// 將一大堆唔會郁嘅嘢「焊埋」：同一種物料嘅全部合併做一件
// 幾千件變幾十件，電腦畫得快好多，樣子完全一樣
export function bakeStatic(root, scene) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const key = `${o.material.uuid}|${o.castShadow}`;
    if (!buckets.has(key)) buckets.set(key, { material: o.material, castShadow: o.castShadow, geometries: [] });
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    g.applyMatrix4(o.matrixWorld);
    buckets.get(key).geometries.push(g);
  });
  for (const { material, castShadow, geometries } of buckets.values()) {
    const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}

// 入口鐵閘：日頭收埋喺地底，夜晚升起
function addGate(scene) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x455a64, metalness: 0.7, roughness: 0.4 });
  const width = STEM.maxX - STEM.minX;
  for (let x = STEM.minX + 0.5; x <= STEM.maxX - 0.5; x += 0.8) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 6, 0.15), metal);
    bar.position.set(x, 3, 0);
    bar.castShadow = true;
    g.add(bar);
  }
  for (const y of [1.2, 3.5, 5.8]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.25, 0.2), metal);
    beam.position.set(0, y, 0);
    g.add(beam);
  }
  const sign = makeSign([{ text: 'CLOSED AT NIGHT', size: 0.36 }, { text: 'Come back in the morning!', size: 0.24 }], 6, 1.6, THEMES.dark);
  sign.position.set(0, 2.4, 0.15);
  g.add(sign);
  g.position.set(0, -6.5, 0.3);
  scene.add(g);
  gate.mesh = g;
}

// 舊名，方便其他檔案用：一塊寫咗字嘅牌
export function makeTextPlane(text, width, height, theme = THEMES.dark) {
  return makeSign(text, width, height, theme);
}

// 天空：上面深藍、地平線淺色嘅漸變（日夜會轉色）
export const sky = {
  uniforms: {
    top: { value: new THREE.Color(0x3d8fe0) },
    bottom: { value: new THREE.Color(0xcfeaff) },
  },
};
function addSky(scene) {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(450, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: sky.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 vPos; void main() { vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vPos;
        void main() { float h = clamp(vPos.y * 1.6, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.7)), 1.0); }`,
    }),
  );
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  dome.onBeforeRender = (renderer, scene, camera) => dome.position.copy(camera.position);
  scene.add(dome);
}

// 有少少斑點嘅顏色紋理，等地板唔會死板一片
export function noiseTexture(color, variation, repeatX = 1, repeatY = 1) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(color);
  const c = new THREE.Color();
  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      c.copy(base).offsetHSL(0, 0, (Math.random() - 0.5) * variation);
      ctx.fillStyle = `#${c.getHexString()}`;
      ctx.fillRect(x, y, 4, 4);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

// 石磚牆紋理
function stoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8a8478'; // 磚之間嘅灰
  ctx.fillRect(0, 0, 128, 128);
  const shades = ['#c9c1b0', '#bdb5a3', '#d3cbbb', '#b8af9c'];
  for (let row = 0; row < 4; row++) {
    const offset = row % 2 ? 16 : 0;
    for (let col = -1; col < 4; col++) {
      ctx.fillStyle = shades[(row * 3 + col + 4) % shades.length];
      ctx.fillRect(col * 32 + offset + 2, row * 32 + 2, 28, 28);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 1);
  return texture;
}

// 天上嘅雲
function addClouds(scene) {
  // 雲自己識發光少少，由下面望上去都係白色
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaaaaa, transparent: true, opacity: 0.9 });
  const geometry = new THREE.SphereGeometry(1, 12, 8);
  for (let i = 0; i < 40; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const puff = new THREE.Mesh(geometry, material);
      puff.scale.set(3 + Math.random() * 3, 1.5 + Math.random(), 2.5 + Math.random() * 2);
      puff.position.set(j * 3 - 4.5, Math.random(), Math.random() * 2);
      cloud.add(puff);
    }
    cloud.position.set((Math.random() - 0.5) * 220, 35 + Math.random() * 20, 50 - Math.random() * 380);
    scene.add(cloud);
  }
}
