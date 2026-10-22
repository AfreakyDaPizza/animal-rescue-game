// 💪 RANGER GYM（小朋友 2026-10-18）
// 實驗室爆炸之後喺實驗室原位出現（實驗室冇咗）；GYM_OPEN_DATE（31 Oct）先開門，之前門口有「OPENING SOON」牌同倒數
// 門外有個傳送門去秘密沙灘
// 入面：
//   ⚡ 4X Treadmill：每 2–4 秒加 Speed（= 4 × Hub 跑步機每秒加嘅）
//   🦘 Trampoline：企上去自動彈，每 5 秒 +1 Jump Power（冇升級）
//   🧠 Brain Bench：每 3 秒同時加 Speed 同 IQ
//   🧗 Climbing Wall of Wisdom：一路爬一路加 IQ（每 2–4 秒）
//   🥊 Punching Bag of Power：打沙包加 Speed；🚣 Rowing Machine of Wisdom：划艇加 Speed + IQ（2026-10-18）
// 公仔動作喺 gymPoses.js
// 數值喺 balance.js 嘅 GYM_*

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { colliders, platforms, bakeStatic } from './world.js';
import { makeSign, dynamicSign, THEMES } from './signs.js';
import {
  GYM_LOCAL as GYM, GYM_DOOR_Z_LOCAL as GYM_DOOR_Z, GYM_DOOR_LOCAL as GYM_DOOR, GYM_PORTAL_LOCAL as GYM_PORTAL,
  GYM_TURN, GYM_SHIFT, gymToWorld, gymToLocal, gymRectToWorld,
} from './labShape.js';
import {
  GYM_OPEN_DATE, trainingGain, GYM_TREADMILL_MULTI, GYM_TREADMILL_EVERY, GYM_JUMP_GAIN, GYM_JUMP_EVERY,
  GYM_BENCH_MULTI, GYM_BENCH_EVERY, GYM_WALL_MULTI, GYM_WALL_EVERY,
  GYM_BAG_MULTI, GYM_BAG_EVERY, GYM_ROW_MULTI, GYM_ROW_EVERY,
} from './data/balance.js';
import { benchBarY, punchReach, rowSeatDz, ROW_POSE } from './gymPoses.js';
import { state } from './state.js';
import { boost } from './events.js';
import { boostMult } from './boosts.js'; // ⚡ 2x IQ／2x Treadmill

export const gym = {
  holder: null, // 成座 Gym（打贏實驗室 Boss 先見到）
  present: false, // setGymPresent() 設定
  debug: false, // game.openGym()：唔理日子即刻開
  open: false,
  doors: [],
  doorOpen: 0,
  stations: [],
  bounce: 0, // 彈床張網凹落去幾多（main.js 每次彈就設 1）
};

// 呢個檔所有座標都係「設計座標」（大門向 +x）；撞嘢、石台要轉做世界座標（Gym 成座轉咗 90° 搬去實驗室個位）
// 未出現（實驗室仲喺度）嘅時候唔放入世界，唔係就會喺實驗室入面有隱形牆
const myColliders = [];
const myPlatforms = [];
const addCollider = (x, z, r) => {
  const w = gymToWorld(x, z);
  myColliders.push({ x: w.x, z: w.z, r });
};
const addPlatform = (rect, top, bottom = null) => myPlatforms.push({ ...gymRectToWorld(rect), top, bottom });
// main.js：Gym 出現／消失（撞嘢同石台跟住加入／拎走）
export function setGymPresent(on) {
  if (gym.present === on) return;
  gym.present = on;
  gym.holder.visible = on;
  for (const [list, mine] of [[colliders, myColliders], [platforms, myPlatforms]]) {
    for (const o of mine) {
      const i = list.indexOf(o);
      if (on && i < 0) list.push(o);
      if (!on && i >= 0) list.splice(i, 1);
    }
  }
}

// ---- 日子 ----
const openDate = () => {
  const [y, m, d] = GYM_OPEN_DATE.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const isGymOpen = (now = new Date()) => gym.debug || !!state.gymEarly || now >= openDate(); // gymEarly：秘密控制台提早開
export const gymOpenDateText = () => openDate().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
export function gymCountdown(now = new Date()) {
  const ms = Math.max(0, openDate() - now);
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d >= 1) return `${d} day${d > 1 ? 's' : ''} ${h} h ${m} min`;
  return `${h} h ${m} min ${s % 60} s`;
}

// ---- 材料同小工具 ----
const materials = new Map();
const mat = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }));
  return materials.get(key);
};
const glow = (color, k = 2) => mat(color, { emissive: color, emissiveIntensity: k });
function add(parent, geo, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const rbox = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.18);
const cyl = (r, h, n = 16) => new THREE.CylinderGeometry(r, r, h, n);
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.magFilter = THREE.NearestFilter;
  return t;
}

const ORANGE = 0xff6d00;
const TEAL = 0x00bfa5;
const CREAM = 0xf5f0e6;
const DARK = 0x263238;
const STEEL = 0x90a4ae;

// 一個訓練位：zone 判斷企喺唔喺度；every() 下次幾耐加；gain() 加啲乜
function station(def) {
  gym.stations.push(def);
  return def;
}
const between = ([a, b]) => a + Math.random() * (b - a);

// ================= 起 Gym =================
export function buildGym(scene) {
  const holder = new THREE.Group();
  const frame = new THREE.Group(); // 設計座標 → 世界（實驗室原位，大門向前院）
  frame.rotation.y = GYM_TURN;
  frame.position.set(GYM_SHIFT.x, 0, GYM_SHIFT.z);
  holder.add(frame);
  const still = new THREE.Group();
  const live = new THREE.Group();
  frame.add(live);
  scene.add(holder);
  gym.holder = holder;
  holder.visible = false;
  const updates = [];

  buildShell(still, live, updates);
  buildTreadmill(still, live, updates, -57, 70.5);
  buildBench(still, live, updates, -42.5, 70.5);
  buildTrampoline(still, live, updates, -50, 88.5);
  buildClimbingWall(still, live, updates, 92);
  buildPunchBag(still, live, updates, -37, 94);
  buildRower(still, live, updates, -57.5, 95);
  buildDecor(still, live, updates);
  buildPortal(still, live, updates);
  bakeStatic(still, frame);

  return (dt, time, worldPos) => {
    gym.open = isGymOpen();
    if (!holder.visible) return;
    const pos = gymToLocal(worldPos.x, worldPos.z);
    const near = gym.open && Math.abs(pos.z - GYM_DOOR_Z) < 9 && pos.x > GYM.maxX - 9 && pos.x < GYM.maxX + 12;
    gym.doorOpen += ((near ? 1 : 0) - gym.doorOpen) * Math.min(1, dt * 3);
    for (const d of gym.doors) d.position.z = GYM_DOOR_Z + d.userData.side * (1.6 + gym.doorOpen * 3.1);
    gym.bounce = Math.max(0, gym.bounce - dt * 3);
    updates.forEach((u) => u(dt, time, pos));
  };
}

// ---------- 外殼：白色大樓 + 橙色間條 + 大玻璃窗；前面（+x）大牌同大門 ----------
function buildShell(root, live, updates) {
  const { minX, maxX, minZ, maxZ, wallH } = GYM;
  const W = maxX - minX;
  const D = maxZ - minZ;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const wall = mat(CREAM);
  const orange = mat(ORANGE, { roughness: 0.45 });
  const teal = mat(TEAL, { roughness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x81d4fa, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.2 });
  // 地板：深灰色橡膠地 + 橙色線（好似真 Gym）
  const floorTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a454c';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) {
      g.fillStyle = Math.random() < 0.5 ? '#46525a' : '#323c42';
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
    g.strokeStyle = '#2b3439';
    g.lineWidth = 4;
    g.strokeRect(0, 0, w, h); // 一塊塊地墊
  }, W / 4, D / 4);
  add(root, box(W, 0.12, D), mat(0xffffff, { map: floorTex, roughness: 0.9 }), cx, 0.05, cz, false);
  // 地下中間：大大個 Gym 標誌（橙圈 + 啞鈴）
  const logo = canvasTex(512, 512, (g, w) => {
    g.clearRect(0, 0, w, w);
    g.strokeStyle = '#ff6d00';
    g.lineWidth = 26;
    g.beginPath();
    g.arc(w / 2, w / 2, w / 2 - 20, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.fillRect(w * 0.28, w * 0.46, w * 0.44, w * 0.08);
    for (const s of [-1, 1]) {
      g.fillRect(w / 2 + s * w * 0.22 - (s > 0 ? 0 : w * 0.08), w * 0.32, w * 0.08, w * 0.36);
      g.fillRect(w / 2 + s * w * 0.3 - (s > 0 ? 0 : w * 0.06), w * 0.37, w * 0.06, w * 0.26);
    }
    g.font = '900 64px "Arial Rounded MT Bold", system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#ff9e40';
    g.fillText('RANGER GYM', w / 2, w * 0.84);
  });
  logo.magFilter = THREE.LinearFilter;
  logo.repeat.set(1, 1);
  const logoMesh = add(root, new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ map: logo, transparent: true, roughness: 0.8 }), -47, 0.12, 80.5, false);
  logoMesh.rotation.x = -Math.PI / 2;
  logoMesh.rotation.z = Math.PI / 2; // 字向住大門

  // 牆：白色 + 底下青綠色 + 上面橙色間條 + 頂邊
  const wallZ = (z, x1, x2) => {
    const len = x2 - x1;
    const x = (x1 + x2) / 2;
    add(root, box(len + 1, wallH, 1), wall, x, wallH / 2, z);
    add(root, box(len + 1.1, 1.2, 1.1), teal, x, 0.6, z);
    add(root, box(len + 1.1, 0.7, 1.1), orange, x, wallH - 1.6, z);
    add(root, box(len + 1.3, 0.4, 1.3), mat(DARK), x, wallH + 0.2, z);
  };
  const wallX = (x, z1, z2) => {
    const len = z2 - z1;
    const z = (z1 + z2) / 2;
    add(root, box(1, wallH, len), wall, x, wallH / 2, z);
    add(root, box(1.1, 1.2, len + 0.1), teal, x, 0.6, z);
    add(root, box(1.1, 0.7, len + 0.1), orange, x, wallH - 1.6, z);
    add(root, box(1.3, 0.4, len + 0.3), mat(DARK), x, wallH + 0.2, z);
  };
  wallZ(minZ, minX, maxX);
  wallZ(maxZ, minX, maxX);
  wallX(minX, minZ, maxZ);
  const half = 3.4; // 大門一半闊
  wallX(maxX, minZ, GYM_DOOR_Z - half);
  wallX(maxX, GYM_DOOR_Z + half, maxZ);
  add(root, box(1, wallH - 6, half * 2), wall, maxX, 6 + (wallH - 6) / 2, GYM_DOOR_Z); // 門頂
  add(root, box(1.3, 0.4, half * 2 + 0.3), mat(DARK), maxX, wallH + 0.2, GYM_DOOR_Z);
  // 大窗（外面望到入面）：北、南牆各 3 個，西牆 2 個
  const frame = mat(DARK, { metalness: 0.4 });
  for (const z of [minZ, maxZ]) {
    for (const x of [-60, -48, -36]) {
      for (const s of [-0.55, 0.55]) add(root, box(7.4, 3.2, 0.12), glass, x, 4.1, z + s, false);
      add(root, box(7.8, 0.3, 1.25), frame, x, 2.4, z);
      add(root, box(7.8, 0.3, 1.25), frame, x, 5.8, z);
      for (const dx of [-3.8, 0, 3.8]) add(root, box(0.25, 3.6, 1.25), frame, x + dx, 4.1, z);
    }
  }
  // 屋頂：鋼樑（冇實心屋頂，第三身鏡頭唔會俾天花擋住）
  for (let x = minX + 4; x < maxX - 1; x += 6) {
    add(root, box(0.5, 0.7, D), mat(0x546e7a, { metalness: 0.6, roughness: 0.4 }), x, wallH - 0.1, cz);
  }
  for (let z = minZ + 6; z < maxZ - 1; z += 9) add(root, box(W, 0.35, 0.35), mat(0x546e7a, { metalness: 0.6 }), cx, wallH - 0.3, z);
  // 吊燈（發光長條）
  for (let x = minX + 7; x < maxX - 3; x += 12) {
    for (let z = minZ + 9; z < maxZ - 3; z += 13) {
      add(root, box(0.06, 1.4, 0.06), mat(0x37474f), x, wallH - 1.1, z, false);
      add(root, box(3.2, 0.25, 0.7), glow(0xfff8e1, 0.7), x, wallH - 1.9, z, false);
    }
  }

  // ---- 前面（+x）：大牌、旗、門 ----
  // 大牌座（高過牆）
  add(root, box(1.4, 4.5, 18), mat(DARK), maxX + 0.2, wallH + 2.2, GYM_DOOR_Z);
  add(root, box(1.5, 0.35, 18.4), orange, maxX + 0.2, wallH + 4.5, GYM_DOOR_Z);
  const big = makeSign([{ text: '💪 RANGER GYM', size: 0.48 }, { text: 'Get faster · Get smarter', size: 0.2, color: '#ffe0b2' }], 16, 3.8, THEMES.orange);
  big.position.set(maxX + 0.95, wallH + 2.25, GYM_DOOR_Z);
  big.rotation.y = Math.PI / 2;
  live.add(big);
  // 大門框
  for (const s of [-1, 1]) {
    add(root, rbox(1.2, 6.4, 1.2), orange, maxX + 0.2, 3.2, GYM_DOOR_Z + s * (half + 0.2));
    addCollider(maxX + 0.2, GYM_DOOR_Z + s * (half + 0.2), 0.7);
  }
  add(root, rbox(1.3, 0.9, half * 2 + 2), orange, maxX + 0.2, 6.3, GYM_DOOR_Z);
  // 兩扇玻璃趟門（開咗先行近會開）
  gym.doors = [-1, 1].map((s) => {
    const d = new THREE.Group();
    add(d, box(0.25, 5.8, 3.2), glass, 0, 2.9, 0, false);
    add(d, box(0.35, 0.3, 3.3), frame, 0, 5.75, 0);
    add(d, box(0.35, 0.3, 3.3), frame, 0, 0.15, 0);
    add(d, box(0.35, 5.8, 0.25), frame, 0, 2.9, -s * 1.55);
    add(d, box(0.4, 0.15, 1.6), glow(ORANGE, 1.5), 0, 3, 0, false);
    d.position.set(maxX, 0, GYM_DOOR_Z + s * 1.6);
    d.userData.side = s;
    live.add(d);
    return d;
  });
  // 門口條路（駁去前院）
  add(root, box(GYM_DOOR.maxX - GYM_DOOR.minX + 2, 0.06, 5.6), mat(0x9e9e9e), (GYM_DOOR.minX + GYM_DOOR.maxX) / 2 + 1, 0.03, GYM_DOOR_Z, false);
  for (const s of [-1, 1]) add(root, box(GYM_DOOR.maxX - GYM_DOOR.minX + 2, 0.08, 0.25), mat(ORANGE), (GYM_DOOR.minX + GYM_DOOR.maxX) / 2 + 1, 0.05, GYM_DOOR_Z + s * 2.8, false);
  // 兩支旗
  for (const z of [GYM.minZ + 2.5, GYM.maxZ - 2.5]) {
    add(root, cyl(0.12, 12, 8), mat(0xcfd8dc, { metalness: 0.7 }), maxX + 2, 6, z);
    const flag = add(live, box(0.08, 1.8, 3), mat(z < GYM_DOOR_Z ? ORANGE : TEAL, { side: THREE.DoubleSide }), maxX + 2, 10.9, z + 1.55, false);
    updates.push((dt, time) => (flag.rotation.y = Math.sin(time * 2 + z) * 0.25));
  }

  // ---- 未開門：「OPENING SOON」牌 + 倒數 + 圍欄 ----
  const countdown = dynamicSign(7.5, 4.2);
  countdown.mesh.position.set(maxX + 0.62, 3.6, GYM_DOOR_Z + 9.6);
  countdown.mesh.rotation.y = Math.PI / 2;
  live.add(countdown.mesh);
  const barrier = new THREE.Group();
  live.add(barrier);
  const stripes = canvasTex(128, 32, (g, w, h) => {
    for (let i = -2; i < 10; i++) {
      g.fillStyle = i % 2 ? '#212121' : '#ffd600';
      g.beginPath();
      g.moveTo(i * 16, h);
      g.lineTo(i * 16 + 16, h);
      g.lineTo(i * 16 + 32, 0);
      g.lineTo(i * 16 + 16, 0);
      g.fill();
    }
  });
  for (const y of [0.9, 1.7]) add(barrier, box(0.2, 0.42, 7.6), mat(0xffffff, { map: stripes }), maxX + 1.8, y, GYM_DOOR_Z);
  for (const s of [-1, 1]) add(barrier, box(0.25, 2.1, 0.25), mat(0x424242), maxX + 1.8, 1.05, GYM_DOOR_Z + s * 3.6);
  for (const s of [-1, 1]) {
    // 雪糕筒
    add(barrier, new THREE.ConeGeometry(0.4, 1.1, 10), mat(ORANGE), maxX + 3.3, 0.55, GYM_DOOR_Z + s * 2.2);
    add(barrier, cyl(0.28, 0.16, 10), mat(0xffffff), maxX + 3.3, 0.6, GYM_DOOR_Z + s * 2.2);
  }
  const soon = makeSign([{ text: '🚧 OPENING SOON 🚧', size: 0.5 }], 6.4, 1.3, THEMES.red);
  soon.position.set(maxX + 0.75, 4.6, GYM_DOOR_Z);
  soon.rotation.y = Math.PI / 2;
  barrier.add(soon);
  let tick = -1;
  updates.push((dt, time) => {
    barrier.visible = !gym.open;
    const now = Math.floor(Date.now() / 1000);
    if (now === tick) return;
    tick = now;
    if (gym.open) countdown.draw(THEMES.green, [{ text: '✅ NOW OPEN!', size: 0.3 }, { text: 'Come in and train!', size: 0.16 }, { text: '⚡ Speed · 🧠 IQ · 🦘 Jump', size: 0.13, color: '#c8e6c9' }]);
    else countdown.draw(THEMES.orange, [
      { text: 'OPENING SOON', size: 0.22 },
      { text: gymOpenDateText(), size: 0.15, color: '#fff3e0' },
      { text: `⏳ ${gymCountdown()}`, size: 0.15, color: '#ffff8d' },
      { text: '4X Treadmill · Trampoline · Brain Bench', size: 0.085, color: '#ffe0b2' },
    ]);
  });
}

// 每部機頂上浮住嘅牌
function floatSign(live, updates, lines, theme, x, y, z, rotY = 0, w = 5, h = 1.7) {
  const s = makeSign(lines, w, h, theme);
  s.position.set(x, y, z);
  s.rotation.y = rotY;
  live.add(s);
  updates.push((dt, time) => (s.position.y = y + Math.sin(time * 1.6 + x) * 0.12));
  return s;
}

// ---------- ⚡ 4X Treadmill：跑帶向 -z，前面有大屏幕「4X」----------
function buildTreadmill(root, live, updates, x, z) {
  const base = mat(0x212121, { roughness: 0.5 });
  const neon = glow(ORANGE, 2.2);
  const neonT = glow(0x00e5ff, 2.2);
  add(root, rbox(3.4, 0.36, 5.8), base, x, 0.18, z);
  for (const s of [-1, 1]) {
    add(root, box(0.12, 0.1, 5.8), neon, x + s * 1.66, 0.33, z, false);
    add(root, rbox(0.35, 0.3, 5.8), mat(0x37474f), x + s * 1.5, 0.42, z); // 兩邊踏腳位
  }
  const beltTex = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#1b1b1b';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff6d00';
    g.fillRect(0, h * 0.45, w, h * 0.1);
  }, 1, 6);
  add(live, box(2.6, 0.06, 5.4), mat(0xffffff, { map: beltTex, roughness: 0.8 }), x, 0.38, z, false);
  // 扶手 + 控制台
  const steel = mat(STEEL, { metalness: 0.8, roughness: 0.3 });
  for (const s of [-1, 1]) {
    add(root, box(0.16, 1.9, 0.16), steel, x + s * 1.55, 1.3, z - 2.6);
    add(root, box(0.14, 0.14, 2.6), steel, x + s * 1.55, 2.2, z - 1.4);
  }
  add(root, rbox(3.4, 1.1, 0.5), mat(0x263238), x, 2.5, z - 2.75);
  const screen = canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#001a1f';
    g.fillRect(0, 0, w, h);
    g.font = '900 64px "Arial Rounded MT Bold", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#00e5ff';
    g.fillText('4X ⚡', w / 2, h / 2 + 4);
  });
  screen.magFilter = THREE.LinearFilter;
  screen.repeat.set(1, 1);
  const scr = add(live, new THREE.PlaneGeometry(2.6, 0.85), new THREE.MeshBasicMaterial({ map: screen }), x, 2.55, z - 2.49, false);
  scr.material.toneMapped = false;
  add(root, box(3.5, 0.1, 0.55), neonT, x, 3.08, z - 2.75, false);
  // 後面：火箭噴射（好快嘅感覺）
  const flames = [-0.8, 0.8].map((dx) => {
    const f = add(live, new THREE.ConeGeometry(0.32, 1.4, 10), glow(0xff9100, 3), x + dx, 0.3, z + 3.4, false);
    f.rotation.x = Math.PI / 2;
    return f;
  });
  addCollider(x, z - 3.1, 0.9);
  floatSign(live, updates, [{ text: '⚡ 4X TREADMILL', size: 0.4 }, { text: 'Speed x4 every 2-4 sec!', size: 0.22 }], THEMES.orange, x, 5, z - 3, 0, 6.2, 2.1);
  const st = station({
    kind: 'treadmill', name: '4X Treadmill', x, z, standHeight: 0.4,
    enterText: '⚡ 4X TREADMILL! Keep running!',
    inZone: (px, pz) => Math.abs(px - x) < 1.35 && Math.abs(pz - z) < 2.5,
    every: () => between(GYM_TREADMILL_EVERY),
    gain: () => [{ key: 'speed', label: 'Speed', amount: GYM_TREADMILL_MULTI * trainingGain(state.treadmillLevel, 'speed') * boost.train }],
    active: false,
  });
  updates.push((dt, time) => {
    beltTex.offset.y -= dt * (st.active ? 5 : 0.4);
    for (const f of flames) {
      f.visible = st.active;
      f.scale.setScalar(0.8 + Math.random() * 0.4);
    }
  });
}

// ---------- 🧠 Brain Bench：舉重櫈，槓鈴兩邊係發光嘅「腦」----------
function buildBench(root, live, updates, x, z) {
  const pad = mat(0x212121, { roughness: 0.4 });
  const steel = mat(STEEL, { metalness: 0.8, roughness: 0.3 });
  add(root, rbox(1.2, 0.35, 4), pad, x, 0.85, z + 0.6); // 櫈墊
  add(root, rbox(1.25, 0.12, 4.05), mat(ORANGE), x, 0.66, z + 0.6);
  for (const dz of [-1, 2.2]) add(root, box(0.9, 0.7, 0.3), steel, x, 0.35, z + dz);
  // 槓鈴架
  for (const s of [-1, 1]) {
    add(root, box(0.18, 2.6, 0.18), steel, x + s * 1.1, 1.3, z - 1.2);
    add(root, box(0.4, 0.12, 0.3), steel, x + s * 1.1, 2.1, z - 1.05);
  }
  const bar = new THREE.Group();
  bar.position.set(x, 2.25, z - 1.05);
  live.add(bar);
  add(bar, new THREE.CylinderGeometry(0.06, 0.06, 4.6, 8), steel, 0, 0, 0).rotation.z = Math.PI / 2;
  const brainMat = mat(0xff80ab, { emissive: 0xff4081, emissiveIntensity: 0.5, roughness: 0.5 });
  const fold = mat(0xc2185b);
  for (const s of [-1, 1]) {
    const brain = new THREE.Group();
    brain.position.x = s * 1.85;
    bar.add(brain);
    add(brain, new THREE.SphereGeometry(0.55, 16, 12), brainMat, 0, 0, 0);
    for (let i = 0; i < 4; i++) {
      const t = add(brain, new THREE.TorusGeometry(0.42 - i * 0.04, 0.05, 6, 16, Math.PI * 1.3), fold, 0, 0.08, -0.25 + i * 0.17, false);
      t.rotation.y = Math.PI / 2;
      t.rotation.x = 0.4;
    }
    add(brain, box(0.06, 0.95, 0.06), fold, 0, 0, 0, false);
  }
  // 腦電波光圈
  const ring = add(live, new THREE.TorusGeometry(1.2, 0.06, 6, 32), glow(0xea80fc, 2.5), x, 3.4, z - 1.05, false);
  ring.rotation.x = Math.PI / 2;
  addCollider(x - 1.1, z - 1.2, 0.3);
  addCollider(x + 1.1, z - 1.2, 0.3);
  floatSign(live, updates, [{ text: '🧠 BRAIN BENCH', size: 0.4 }, { text: 'Speed + IQ every 3 sec!', size: 0.22 }], THEMES.pink, x, 5, z - 2.2, 0, 6.2, 2.1);
  const st = station({
    kind: 'bench', name: 'Brain Bench', x, z,
    standHeight: 0,
    enterText: '🧠 BRAIN BENCH! Lift those brains!',
    inZone: (px, pz) => Math.abs(px - x) < 1.7 && pz > z - 1.6 && pz < z + 3,
    every: () => GYM_BENCH_EVERY,
    gain: () => [
      { key: 'speed', label: 'Speed', amount: GYM_BENCH_MULTI * trainingGain(state.treadmillLevel, 'speed') * boost.train },
      { key: 'iq', label: 'IQ', amount: GYM_BENCH_MULTI * trainingGain(state.tableLevel) * boost.train },
    ],
    active: false,
  });
  let t = 0;
  updates.push((dt, time) => {
    // 臥推：推上 0.9 秒、放落 1.1 秒；槓鈴跟住公仔對手（gymPoses.js benchBarY）
    t = st.active ? t + dt : 0;
    const k = (t % 2) / 2;
    st.lift = st.active ? (k < 0.45 ? Math.sin((k / 0.45) * Math.PI / 2) : Math.cos(((k - 0.45) / 0.55) * Math.PI / 2)) : 0;
    const target = st.active ? benchBarY(st.lift) : 2.25;
    bar.position.y += (target - bar.position.y) * Math.min(1, dt * (st.active ? 30 : 4));
    ring.visible = st.active;
    ring.position.y = bar.position.y + 1.15;
    ring.scale.setScalar(1 + ((time * 1.5) % 1) * 0.6);
    brainMat.emissiveIntensity = st.active ? 1.4 + Math.sin(time * 8) * 0.6 : 0.4;
  });
}

// ---------- 🦘 Trampoline：圓形彈床（企上去自動彈）----------
function buildTrampoline(root, live, updates, x, z) {
  const R = 3.2;
  const TOP = 0.42;
  add(root, new THREE.TorusGeometry(R, 0.28, 10, 40), mat(0x1e88e5, { roughness: 0.5 }), x, TOP, z).rotation.x = Math.PI / 2;
  add(root, new THREE.TorusGeometry(R + 0.05, 0.08, 6, 40), glow(0x00e5ff, 2), x, TOP + 0.26, z, false).rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(root, box(0.16, TOP, 0.16), mat(0x37474f, { metalness: 0.6 }), x + Math.cos(a) * R, TOP / 2, z + Math.sin(a) * R);
  }
  // 張網（彈嘅時候凹落去）
  const netTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#111';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ff6d00';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#ff6d00';
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.08, 0, Math.PI * 2);
    g.fill();
  });
  netTex.magFilter = THREE.LinearFilter;
  netTex.repeat.set(1, 1);
  const net = add(live, new THREE.CircleGeometry(R - 0.15, 32), new THREE.MeshStandardMaterial({ map: netTex, roughness: 0.8 }), x, TOP + 0.02, z, false);
  net.rotation.x = -Math.PI / 2;
  addPlatform({ minX: x - 2.3, maxX: x + 2.3, minZ: z - 2.3, maxZ: z + 2.3 }, TOP);
  // 彈起嘅星星
  const stars = Array.from({ length: 10 }, (_, i) => add(live, new THREE.OctahedronGeometry(0.16), glow(i % 2 ? 0xffeb3b : 0x00e5ff, 3), x, 1, z, false));
  floatSign(live, updates, [{ text: '🦘 TRAMPOLINE', size: 0.4 }, { text: '+1 Jump Power every 5 sec!', size: 0.22 }], THEMES.blue, x - 4.4, 4.6, z, Math.PI / 2, 6.2, 2.1);
  const st = station({
    kind: 'trampoline', name: 'Trampoline', x, z, standHeight: 0, top: TOP,
    enterText: '🦘 BOING! Keep bouncing for Jump Power!',
    inZone: (px, pz) => Math.hypot(px - x, pz - z) < R - 0.6,
    every: () => GYM_JUMP_EVERY,
    gain: () => [{ key: 'jumpPower', label: 'Jump Power', amount: GYM_JUMP_GAIN }],
    active: false,
  });
  updates.push((dt, time) => {
    net.position.y = TOP + 0.02 - gym.bounce * 0.35;
    net.scale.setScalar(1 - gym.bounce * 0.03);
    stars.forEach((s, i) => {
      s.visible = st.active;
      const a = time * 1.5 + (i / stars.length) * Math.PI * 2;
      s.position.set(x + Math.cos(a) * 2.2, 1.2 + ((time * 0.8 + i * 0.37) % 1) * 3, z + Math.sin(a) * 2.2);
      s.rotation.y = time * 3;
    });
  });
}

// ---------- 🧗 Climbing Wall of Wisdom：西牆，啲手抓會發光（有書、問號、燈泡）----------
function buildClimbingWall(root, live, updates, z) {
  const x = GYM.minX + 0.55;
  const L = 11;
  add(root, box(0.5, 7.2, L), mat(0x5d4037, { roughness: 0.9 }), x + 0.25, 3.6, z);
  add(root, box(0.6, 0.35, L + 0.4), mat(ORANGE), x + 0.3, 7.3, z);
  // 地墊
  add(root, rbox(3, 0.3, L), mat(0x1565c0), x + 1.9, 0.15, z);
  const colors = [0xff1744, 0xffea00, 0x00e676, 0x2979ff, 0xd500f9, 0xff9100];
  const holdMats = colors.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.15, roughness: 0.5 })); // 每隻顏色一個材料（少啲 draw call）
  for (let i = 0; i < 34; i++) {
    const hz = z - L / 2 + 0.6 + ((i * 3.7) % (L - 1.2));
    const hy = 0.8 + ((i * 1.93) % 6);
    const h = add(root, i % 3 ? new THREE.DodecahedronGeometry(0.22) : rbox(0.25, 0.3, 0.4), holdMats[i % colors.length], x + 0.62, hy, hz, false);
    h.rotation.set(i, i * 2, 0);
  }
  // 頂上：大燈泡（「諗到！」）
  const bulb = add(live, new THREE.SphereGeometry(0.6, 16, 12), glow(0xfff59d, 1), x + 0.9, 8.4, z, false);
  add(live, cyl(0.3, 0.4, 10), mat(0x9e9e9e, { metalness: 0.7 }), x + 0.9, 7.75, z, false);
  floatSign(live, updates, [{ text: '🧗 CLIMBING WALL', size: 0.36 }, { text: 'OF WISDOM · IQ x4 every 2-4 sec!', size: 0.18 }], THEMES.purple, x + 3.2, 6.6, z, Math.PI / 2, 5.6, 1.7);
  let climb = 0; // 爬咗幾高
  const st = station({
    kind: 'wall', name: 'Climbing Wall of Wisdom', x, z, faceX: x + 0.62, halfLen: L / 2, mode: 'climb', modeT: 0, climb: 0,
    get standHeight() {
      return climb;
    },
    enterText: '🧗 Climb the Wall of Wisdom! Get SMARTER!',
    inZone: (px, pz) => px < GYM.minX + 3.6 && Math.abs(pz - z) < L / 2 - 0.4,
    every: () => between(GYM_WALL_EVERY),
    gain: () => [{ key: 'iq', label: 'IQ', amount: GYM_WALL_MULTI * trainingGain(state.tableLevel) * boost.train }],
    active: false,
  });
  updates.push((dt, time) => {
    // 爬上去 → 到頂揮拳 1.3 秒 → 滑返落嚟 → 再爬
    st.modeT += dt;
    if (!st.active) {
      climb = Math.max(0, climb - dt * 4);
      st.mode = 'climb';
    } else if (st.mode === 'climb') {
      climb = Math.min(3.2, climb + dt * 0.7);
      if (climb >= 3.2) Object.assign(st, { mode: 'top', modeT: 0 });
    } else if (st.mode === 'top') {
      if (st.modeT > 1.3) Object.assign(st, { mode: 'slide', modeT: 0 });
    } else {
      climb = Math.max(0, climb - dt * 3);
      if (climb <= 0) Object.assign(st, { mode: 'climb', modeT: 0 });
    }
    st.climb = climb;
    holdMats.forEach((m, i) => (m.emissiveIntensity = st.active && Math.floor(time * 4) % colors.length === i ? 2.5 : 0.15)); // 一隻顏色一隻顏色咁閃
    bulb.material.emissiveIntensity = st.active ? 2 + Math.sin(time * 6) : 0.6;
  });
}

// ---------- 🥊 Punching Bag of Power：吊住嘅大沙包，企喺前面打（每拳個沙包會盪開）----------
function buildPunchBag(root, live, updates, bagX, bagZ) {
  const steel = mat(STEEL, { metalness: 0.8, roughness: 0.3 });
  const top = GYM.wallH - 0.6;
  add(root, box(0.2, 0.2, 3), steel, bagX, top, bagZ);
  const bag = new THREE.Group();
  bag.position.set(bagX, top, bagZ);
  live.add(bag);
  add(bag, new THREE.CylinderGeometry(0.02, 0.02, 4.5, 4), mat(0x212121), 0, -2.25, 0, false);
  const bagMat = mat(0xd32f2f, { roughness: 0.4, emissive: 0xff1744, emissiveIntensity: 0 });
  add(bag, new THREE.CylinderGeometry(0.55, 0.55, 2.2, 14), bagMat, 0, -5.7, 0);
  add(bag, cyl(0.57, 0.25, 14), mat(0x212121), 0, -4.6, 0);
  add(bag, cyl(0.57, 0.2, 14), mat(0x212121), 0, -6.8, 0);
  // 前面地上有對腳印（企呢度打）
  const standZ = bagZ - 1.35;
  for (const s of [-1, 1]) add(root, box(0.3, 0.03, 0.5), mat(0xffd600), bagX + s * 0.3, 0.14, standZ + (s > 0 ? 0.25 : -0.15), false);
  add(root, box(3.2, 0.04, 3.6), mat(0x4e342e, { roughness: 0.9 }), bagX, 0.12, bagZ - 0.6, false);
  addCollider(bagX, bagZ, 0.7);
  floatSign(live, updates, [{ text: '🥊 PUNCHING BAG', size: 0.36 }, { text: 'OF POWER · Speed every 1.5-2.5 sec!', size: 0.18 }], THEMES.red, bagX, 4.9, bagZ + 1.6, Math.PI, 5.6, 1.7);
  const st = station({
    kind: 'bag', name: 'Punching Bag of Power', x: bagX, z: bagZ, standZ, standHeight: 0, punchT: 1, hand: 0,
    enterText: '🥊 PUNCHING BAG OF POWER! Jab, jab, POW!',
    inZone: (px, pz) => Math.hypot(px - bagX, pz - standZ) < 1.1,
    every: () => between(GYM_BAG_EVERY),
    gain: () => [{ key: 'speed', label: 'Speed', amount: GYM_BAG_MULTI * trainingGain(state.treadmillLevel, 'speed') * boost.train }],
    active: false,
  });
  let swing = 0;
  let vel = 0;
  let wait = 0;
  let hit = true;
  updates.push((dt, time) => {
    if (st.active) {
      st.punchT += dt;
      if (st.punchT > wait) {
        st.punchT = 0;
        st.hand = st.hand ? 0 : 1;
        wait = 0.42 + Math.random() * 0.25;
        hit = false;
      }
      if (!hit && st.punchT >= 0.12) {
        hit = true;
        vel -= 1.1; // 沙包向後盪
        st.onHit?.();
      }
    } else st.punchT = 1;
    // 彈簧：盪開再返嚟
    vel += (-swing * 9 - vel * 1.6) * dt;
    swing += vel * dt;
    bag.rotation.x = swing * 0.12 + Math.cos(time * 1.1) * 0.02;
    bag.rotation.z = Math.sin(time * 1.3) * 0.04;
    bagMat.emissiveIntensity = st.active ? punchReach(st.punchT) * 0.6 : 0;
  });
}

// ---------- 🚣 Rowing Machine of Wisdom：櫈仔前後滑、手柄拉繩，前面個飛輪轉 ----------
function buildRower(root, live, updates, x, z) {
  const steel = mat(STEEL, { metalness: 0.8, roughness: 0.3 });
  const dark = mat(0x263238);
  add(root, box(3.2, 0.04, 5.6), mat(0x1b5e20, { roughness: 0.9 }), x, 0.12, z - 0.3, false); // 地墊
  add(root, rbox(0.5, 0.18, 4.4), dark, x, 0.42, z - 0.1); // 路軌
  add(root, box(0.56, 0.06, 4.4), glow(TEAL, 1.6), x, 0.53, z - 0.1, false);
  for (const dz of [-1.9, 1.9]) add(root, box(0.8, 0.4, 0.3), steel, x, 0.2, z + dz);
  // 腳踏
  for (const s of [-1, 1]) {
    const f = add(root, rbox(0.3, 0.08, 0.5), mat(ORANGE), x + s * 0.24, ROW_POSE.footY, z + ROW_POSE.footDz, false);
    f.rotation.x = 0.7;
  }
  // 飛輪（前面）
  const wheel = new THREE.Group();
  wheel.position.set(x, 0.75, z - 2.1);
  live.add(wheel);
  const disc = add(wheel, cyl(0.6, 0.3, 20), mat(0x1565c0, { metalness: 0.4, roughness: 0.4 }), 0, 0, 0);
  disc.rotation.z = Math.PI / 2;
  for (let i = 0; i < 3; i++) {
    const spoke = add(wheel, box(0.32, 1.05, 0.08), glow(0x40c4ff, 1.8), 0, 0, 0, false);
    spoke.rotation.x = (i / 3) * Math.PI;
  }
  add(root, rbox(0.5, 0.9, 0.5), dark, x, 0.45, z - 2.1);
  // 櫈仔 + 手柄 + 繩
  const seat = add(live, rbox(0.6, 0.14, 0.6), mat(0x212121, { roughness: 0.4 }), x, ROW_POSE.seatTop - 0.07, z, true);
  const handle = add(live, new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), mat(ORANGE), x, 1.0, z - 1.7, false);
  handle.rotation.z = Math.PI / 2;
  const cord = add(live, box(0.03, 0.03, 1), mat(0x212121), x, 0.9, z - 1.9, false);
  addCollider(x, z - 2.1, 0.55);
  floatSign(live, updates, [{ text: '🚣 ROWING MACHINE', size: 0.34 }, { text: 'OF WISDOM · Speed + IQ every 2.5 sec!', size: 0.17 }], THEMES.green, x, 4.4, z - 2.6, 0, 5.6, 1.7);
  const st = station({
    kind: 'row', name: 'Rowing Machine of Wisdom', x, z, standHeight: 0, drive: 0,
    enterText: '🚣 ROW, ROW, ROW! Get faster AND smarter!',
    inZone: (px, pz) => Math.abs(px - x) < 1.1 && pz > z - 1.4 && pz < z + 1.6,
    every: () => GYM_ROW_EVERY,
    gain: () => [
      { key: 'speed', label: 'Speed', amount: GYM_ROW_MULTI * trainingGain(state.treadmillLevel, 'speed') * boost.train },
      { key: 'iq', label: 'IQ', amount: GYM_ROW_MULTI * trainingGain(state.tableLevel) * boost.train },
    ],
    active: false,
  });
  let t = 0;
  updates.push((dt) => {
    // 一下 2 秒：推腳拉手 0.8 秒、慢慢返去 1.2 秒
    t = st.active ? t + dt : 0;
    const k = (t % 2) / 2;
    const target = st.active ? (k < 0.4 ? Math.sin((k / 0.4) * Math.PI / 2) : Math.cos(((k - 0.4) / 0.6) * Math.PI / 2)) : 0;
    st.drive += (target - st.drive) * Math.min(1, dt * (st.active ? 30 : 5));
    const d = st.drive;
    seat.position.z = z + rowSeatDz(d);
    // 手柄：縮埋時喺前面，拉盡時去到個肚
    const hz = st.active ? z + rowSeatDz(d) - 0.95 + d * 0.55 : z - 1.75;
    const hy = st.active ? 1.0 + d * 0.15 : 0.95;
    handle.position.set(x, hy, hz);
    const fz = z - 1.85;
    const len = Math.max(0.05, Math.hypot(hz - fz, hy - 0.85));
    cord.scale.z = len;
    cord.position.set(x, (hy + 0.85) / 2, (hz + fz) / 2);
    cord.rotation.x = -Math.atan2(hy - 0.85, hz - fz);
    wheel.rotation.x -= dt * (st.active ? 4 + d * 10 : 0.3);
  });
}

// ---------- 裝飾：啞鈴架、鏡、沙包、儲物櫃、飲水機、標語 ----------
function buildDecor(root, live, updates) {
  const { minX, maxX, minZ, maxZ } = GYM;
  const steel = mat(STEEL, { metalness: 0.8, roughness: 0.3 });
  // 南牆：啞鈴架（彩色啞鈴）
  const rackX = -47;
  add(root, box(12, 0.2, 1.4), mat(0x37474f, { metalness: 0.5 }), rackX, 0.9, maxZ - 1.4);
  add(root, box(12, 0.2, 1.4), mat(0x37474f, { metalness: 0.5 }), rackX, 1.6, maxZ - 1.4);
  for (const dx of [-5.8, 0, 5.8]) add(root, box(0.2, 1.8, 1.2), steel, rackX + dx, 0.9, maxZ - 1.4);
  const dbColors = [0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x1e88e5, 0x8e24aa];
  for (let i = 0; i < 12; i++) {
    const dx = rackX - 5.2 + i * 0.95;
    const y = i % 2 ? 1.85 : 1.15;
    const m = mat(dbColors[i % dbColors.length]);
    add(root, new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), steel, dx, y, maxZ - 1.4).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) add(root, rbox(0.3, 0.3, 0.2), m, dx, y, maxZ - 1.4 + s * 0.3);
  }
  // 北牆：大鏡
  for (const x of [-60, -48, -36]) {
    add(root, box(7, 2.5, 0.08), mat(0xb3e5fc, { metalness: 0.1, roughness: 0.08, emissive: 0x4fc3f7, emissiveIntensity: 0.18 }), x, 1.55, minZ + 0.58, false);
    add(root, box(7.3, 2.8, 0.05), mat(0xeceff1), x, 1.55, minZ + 0.55, false);
  }
  // 每部機下面一塊彩色地墊
  for (const [x, z, w, d, c] of [[-57, 70.5, 6, 9, 0xbf360c], [-42.5, 70.5, 6, 8, 0x880e4f], [-50, 88.5, 9, 9, 0x0d47a1], [GYM.minX + 2.6, 92, 4.6, 12, 0x4a148c]]) { // （沙包、划艇有自己嘅地墊）
    add(root, box(w, 0.04, d), mat(c, { roughness: 0.9 }), x, 0.13, z, false);
  }
  // 儲物櫃（門口左邊）
  for (let i = 0; i < 5; i++) {
    const lz = GYM_DOOR_Z + 6 + i * 1.05;
    add(root, box(0.9, 2.4, 1), mat(i % 2 ? TEAL : 0x26a69a), maxX - 1.1, 1.2, lz);
    add(root, box(0.05, 0.6, 0.08), mat(0xeeeeee), maxX - 1.58, 1.4, lz + 0.3);
    for (const y of [1.9, 2.05]) add(root, box(0.05, 0.05, 0.6), mat(0x004d40), maxX - 1.58, y, lz);
  }
  addCollider(maxX - 1.1, GYM_DOOR_Z + 8.1, 1.5);
  // 飲水機（門口右邊）
  const wx = maxX - 1.3;
  const wz = GYM_DOOR_Z - 6;
  add(root, rbox(0.9, 1.4, 0.9), mat(0xeceff1), wx, 0.7, wz);
  add(root, cyl(0.38, 0.9, 14), new THREE.MeshStandardMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.7, roughness: 0.05 }), wx, 1.85, wz, false);
  addCollider(wx, wz, 0.7);
  // 藥球（彈床隔籬）
  for (let i = 0; i < 5; i++) add(root, new THREE.SphereGeometry(0.35, 12, 10), mat(dbColors[i]), -44 + i * 0.8, 0.35, maxZ - 5.2);
  // 標語（牆上）
  const s1 = makeSign([{ text: 'TRAIN HARD · RESCUE FASTER', size: 0.42 }], 10, 1.3, THEMES.dark);
  s1.position.set(-48, 6.3, minZ + 0.6);
  live.add(s1);
  const s2 = makeSign([{ text: 'BIG BRAIN = BIG GAINS 🧠💪', size: 0.42 }], 10, 1.3, THEMES.dark);
  s2.position.set(-48, 6.3, maxZ - 0.6);
  s2.rotation.y = Math.PI;
  live.add(s2);
}

// ---------- 門外：去秘密沙灘嘅傳送門（面向 +x，對住前院）----------
function buildPortal(root, live, updates) {
  const { x, z, y } = GYM_PORTAL;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = Math.PI / 2;
  live.add(g);
  // 沙色石框 + 貝殼
  add(root, rbox(1.6, 0.6, 6.6), mat(0xe6c88a, { roughness: 0.9 }), x, 0.3, z);
  const ring = add(g, new THREE.TorusGeometry(2.3, 0.32, 12, 48), mat(0xffcc80, { roughness: 0.6 }), 0, 0, 0);
  const ring2 = add(g, new THREE.TorusGeometry(2.05, 0.1, 8, 48), glow(0x18ffff, 2.6), 0, 0, 0.05, false);
  const swirlTex = canvasTex(256, 256, (c, w) => {
    const grd = c.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w / 2);
    grd.addColorStop(0, '#fff9c4');
    grd.addColorStop(0.35, '#4dd0e1');
    grd.addColorStop(0.8, '#0277bd');
    grd.addColorStop(1, 'rgba(1,87,155,0)');
    c.fillStyle = grd;
    c.fillRect(0, 0, w, w);
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 6;
    for (let a = 0; a < 4; a++) {
      c.beginPath();
      for (let t = 0; t < 1; t += 0.02) {
        const ang = a * (Math.PI / 2) + t * 5;
        const r = t * w * 0.48;
        c.lineTo(w / 2 + Math.cos(ang) * r, w / 2 + Math.sin(ang) * r);
      }
      c.stroke();
    }
  });
  swirlTex.magFilter = THREE.LinearFilter;
  swirlTex.repeat.set(1, 1);
  swirlTex.center.set(0.5, 0.5);
  const swirl = add(g, new THREE.CircleGeometry(2.05, 40), new THREE.MeshBasicMaterial({ map: swirlTex, transparent: true, side: THREE.DoubleSide, toneMapped: false }), 0, 0, 0, false);
  // 貝殼同海星（框上面）
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    add(g, new THREE.ConeGeometry(0.18, 0.3, 5), mat(i % 2 ? 0xff8a80 : 0xfff3e0), Math.cos(a) * 2.35, Math.sin(a) * 2.35, 0.3, false).rotation.z = a;
  }
  // 兩棵細椰樹
  for (const s of [-1, 1]) {
    const tz = z + s * 3.6;
    for (let k = 0; k < 6; k++) add(root, rbox(0.4, 0.75, 0.4), mat(0x8d6e63), x + Math.sin(k * 0.4) * 0.15 * k * 0.3, 0.4 + k * 0.7, tz);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const leaf = add(root, box(2.2, 0.08, 0.6), mat(0x43a047), x + Math.cos(a) * 1, 4.6, tz + Math.sin(a) * 1);
      leaf.rotation.y = -a;
      leaf.rotation.z = -0.35;
    }
  }
  // 浮住嘅泡泡
  const bubbles = Array.from({ length: 14 }, (_, i) => add(live, new THREE.SphereGeometry(0.1 + (i % 3) * 0.05, 8, 6), glow(i % 2 ? 0x84ffff : 0xffffff, 2), x, y, z, false));
  const sign = makeSign([{ text: '🏖️ SECRET BEACH', size: 0.45 }, { text: 'Press E to go!', size: 0.25 }], 4.6, 1.5, THEMES.ice);
  sign.position.set(x + 0.2, y + 3.3, z);
  sign.rotation.y = Math.PI / 2;
  live.add(sign);
  updates.push((dt, time) => {
    swirlTex.rotation = -time * 1.2;
    ring2.material.emissiveIntensity = 2.2 + Math.sin(time * 3) * 0.8;
    ring.rotation.z = Math.sin(time * 0.5) * 0.05;
    bubbles.forEach((b, i) => {
      const a = time * 0.8 + (i / bubbles.length) * Math.PI * 2;
      const r = 2.6 + Math.sin(time * 2 + i) * 0.2;
      b.position.set(x + Math.sin(time + i) * 0.4, y + Math.sin(a) * r, z + Math.cos(a) * r);
    });
  });
}

// ================= 訓練（main.js 每格畫面叫）=================
// 玩家企喺邊部 Gym 機（冇 / 未開門就 null）
export function gymStationAt(x, z) {
  if (!gym.open || !gym.holder?.visible) return null;
  const p = gymToLocal(x, z);
  return gym.stations.find((s) => s.inZone(p.x, p.z)) || null;
}
let current = null;
let timer = 0;
let next = 0;
// 回傳今格加咗啲乜：[{ key, label, amount }]（已經加咗落 state）
export function trainInGym(st, dt) {
  for (const s of gym.stations) s.active = s === st;
  if (st !== current) {
    current = st;
    timer = 0;
    next = st ? st.every() : 0;
  }
  if (!st) return [];
  timer += dt;
  if (timer < next) return [];
  timer = 0;
  next = st.every();
  // ⚡ Boosts：所有 IQ x2（2x IQ）；4X Treadmill 嘅 Speed x2（2x Treadmill）
  const extra = (g) => (g.key === 'iq' ? boostMult('iq') : 1) * (g.key === 'speed' && st.kind === 'treadmill' ? boostMult('treadmill') : 1);
  const gains = st.gain().map((g) => ({ ...g, amount: Math.max(1, Math.round(g.amount * extra(g))) }));
  for (const g of gains) state[g.key] = (state[g.key] || 0) + g.amount;
  return gains;
}
