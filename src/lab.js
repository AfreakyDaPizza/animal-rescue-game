// Laboratory（小朋友 Issue #2）：Hub 底大門外面嘅「恐怖但唔嚇親小朋友」科學實驗室
// - 圖鑑未夠 25 隻：大門有鐵鏈 + 大鎖 + 牌（話你仲差幾多隻）
// - 開咗：前院 + 實驗室（冇屋頂嘅大房，Boss 戰喺入面打）
// - 入面：綠色發光試管、電腦、喉管、6 個玻璃艙（瞓住被捉嘅瀕危動物）、4 個 Solar Energy Capsule、傳送門
// - 指路：地上一行發光箭咀 + 頭頂跳下跳下嘅大箭咀 + 畫面箭咀（第一次行入實驗室之後收埋）
// 唔郁嘅嘢放 staticRoot（最後焊埋，畫得快）；會郁嘅放 live

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { addCollider, bakeStatic, parkGate } from './world.js';
import { makeSign, makeLabel, dynamicSign, THEMES } from './signs.js';
import { PARK_GATE, setGateOpen } from './hubPark.js';
import { buildAnimalModel } from './animalModels.js';
import { ANIMALS } from './data/animals.js';
import { LAB_UNLOCK_PETS } from './data/balance.js';
import { state } from './state.js';
import { LAB, LAB_DOOR_Z, CAPSULES, PODS, PORTAL, BOSS_HOME } from './labShape.js';

const $ = (id) => document.getElementById(id);

// 其他檔案要郁嘅嘢
export const lab = {
  capsules: [], pods: [], portal: null, doors: [], lock: null, lights: [],
  guide: null, doorOpen: 0,
};

const materials = new Map();
function mat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }));
  return materials.get(key);
}
const glow = (color, k = 2) => mat(color, { emissive: color, emissiveIntensity: k });
function add(parent, geo, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const rbox = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.15);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r, h, n = 16) => new THREE.CylinderGeometry(r, r, h, n);

// ---------- 紋理 ----------
function canvasTex(size, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.magFilter = THREE.NearestFilter;
  return t;
}
// 鐵板牆：灰藍色鐵板 + 螺絲 + 少少綠色污漬
function panelTexture(rx, ry) {
  return canvasTex(64, (ctx) => {
    ctx.fillStyle = '#5b6770';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#4a555d';
    ctx.fillRect(0, 31, 64, 2);
    ctx.fillRect(31, 0, 2, 64);
    ctx.fillStyle = '#6e7b84';
    ctx.fillRect(2, 2, 28, 3);
    ctx.fillRect(34, 34, 28, 3);
    ctx.fillStyle = '#2f373c';
    for (const [x, y] of [[4, 8], [26, 8], [4, 26], [26, 26], [38, 40], [58, 40], [38, 58], [58, 58]]) ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = 'rgba(118,255,3,0.25)';
    ctx.fillRect(40, 6, 3, 18);
    ctx.fillRect(10, 44, 3, 12);
  }, rx, ry);
}
// 實驗室地板：深色方磚 + 綠色電路線
function floorTexture(rx, ry) {
  return canvasTex(64, (ctx) => {
    ctx.fillStyle = '#2b3036';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#353b42';
    ctx.fillRect(2, 2, 28, 28);
    ctx.fillRect(34, 34, 28, 28);
    ctx.fillStyle = '#30353b';
    ctx.fillRect(34, 2, 28, 28);
    ctx.fillRect(2, 34, 28, 28);
    ctx.fillStyle = '#39d353';
    ctx.fillRect(14, 30, 36, 2);
    ctx.fillRect(48, 14, 2, 18);
    ctx.fillRect(14, 30, 2, 16);
    ctx.fillStyle = '#b9f6ca';
    ctx.fillRect(13, 45, 4, 4);
    ctx.fillRect(47, 12, 4, 4);
  }, rx, ry);
}
// 黃黑警告斜紋
function hazardTexture(rx = 1, ry = 1) {
  return canvasTex(64, (ctx) => {
    ctx.fillStyle = '#ffca28';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#212121';
    for (let i = -64; i < 128; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 16, 0);
      ctx.lineTo(i + 16 + 64, 64);
      ctx.lineTo(i + 64, 64);
      ctx.fill();
    }
  }, rx, ry);
}
// 傳送門旋渦
function swirlTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, '#e040fb');
  g.addColorStop(0.7, '#6a1b9a');
  g.addColorStop(1, 'rgba(40,0,70,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 4;
  for (let arm = 0; arm < 4; arm++) {
    ctx.beginPath();
    for (let k = 0; k < 60; k++) {
      const a = arm * (Math.PI / 2) + k * 0.12;
      const r = k * 1.0;
      const x = 64 + Math.cos(a) * r;
      const y = 64 + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ================= 起成個實驗室 =================
export function buildLab(scene) {
  const staticRoot = new THREE.Group();
  const live = new THREE.Group();
  scene.add(live);
  const updates = [];

  buildShell(staticRoot, live, updates);
  buildInterior(staticRoot, live, updates);
  buildCapsules(live);
  buildPods(live);
  buildPortal(staticRoot, live, updates);
  buildGateLock(live);
  buildGuide(live);
  bakeStatic(staticRoot, scene);

  // 已經開咗（舊存檔）：大門一開始就打開
  parkGate.open = !!state.labUnlocked;
  if (parkGate.open) {
    setGateOpen(1);
    lab.lock.group.visible = false;
  }

  return (dt, time, playerPos) => {
    updates.forEach((u) => u(dt, time));
    updateLockSign();
    // 實驗室門：行近先打開（開咗大門先得）
    const near = parkGate.open && Math.abs(playerPos.x) < 12 && Math.abs(playerPos.z - LAB_DOOR_Z) < 14;
    lab.doorOpen += ((near ? 1 : 0) - lab.doorOpen) * Math.min(1, dt * 3);
    for (const d of lab.doors) d.position.x = d.userData.side * (2.25 + lab.doorOpen * 4.3);
    // Capsule 慢慢轉、發光
    for (const c of lab.capsules) {
      if (c.used) continue;
      c.ring.rotation.y = time * 1.5;
      c.ring2.rotation.y = -time * 1.1;
      c.core.material.emissiveIntensity = 1.6 + Math.sin(time * 3 + c.x) * 0.5;
    }
    // 瞓覺嘅動物：呼吸、Zzz 浮上浮落
    for (const p of lab.pods) {
      if (p.free) continue;
      p.model.userData.animate?.(time * 0.3, 0);
      p.zzz.position.y = p.zzzY + Math.sin(time * 1.5 + p.x) * 0.2;
    }
  };
}

// ---------- 外殼：牆、門、前面嘅大牌、煙囪 ----------
function buildShell(root, live, updates) {
  const { minX, maxX, minZ, maxZ, wallH } = LAB;
  const W = maxX - minX;
  const D = maxZ - minZ;
  // 地板
  const floor = add(root, box(W, 0.2, D), new THREE.MeshStandardMaterial({ map: floorTexture(W / 4, D / 4), roughness: 0.8 }), 0, -0.09, (minZ + maxZ) / 2, false);
  floor.receiveShadow = true;
  // 前院：灰色石屎地 + 黃色斜紋邊
  add(root, box(48, 0.04, 2), new THREE.MeshStandardMaterial({ map: hazardTexture(12, 0.5) }), 0, 0.03, 98.6, false);

  const wall = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1) + 1;
    const m = new THREE.MeshStandardMaterial({ map: panelTexture(len / 4, wallH / 4), roughness: 0.55, metalness: 0.3 });
    const w = add(root, box(len, wallH, 1), m, (x1 + x2) / 2, wallH / 2, (z1 + z2) / 2);
    w.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    // 頂部黃黑警告帶
    const stripe = add(root, box(len + 0.1, 0.6, 1.1), new THREE.MeshStandardMaterial({ map: hazardTexture(len / 2, 0.3) }), (x1 + x2) / 2, wallH - 0.3, (z1 + z2) / 2, false);
    stripe.rotation.y = w.rotation.y;
  };
  wall(minX, minZ, -4.5, minZ);
  wall(4.5, minZ, maxX, minZ);
  wall(minX, minZ, minX, maxZ);
  wall(maxX, minZ, maxX, maxZ);
  wall(minX, maxZ, maxX, maxZ);
  // 屋頂鐵架（唔遮鏡頭，淨係有幾條橫樑）
  const girder = mat(0x37474f, { metalness: 0.6, roughness: 0.4 });
  for (let z = minZ + 10; z < maxZ; z += 10) add(root, box(W, 0.5, 0.5), girder, 0, wallH + 0.2, z);
  add(root, box(0.5, 0.5, D), girder, 0, wallH + 0.25, (minZ + maxZ) / 2);

  // 門框（黃黑斜紋）+ 門頂發光牌
  const haz = new THREE.MeshStandardMaterial({ map: hazardTexture(1, 4) });
  for (const s of [-1, 1]) add(root, box(1.2, 6.4, 1.6), haz, s * 5.1, 3.2, minZ);
  add(root, box(11.4, 1.2, 1.6), new THREE.MeshStandardMaterial({ map: hazardTexture(5, 0.6) }), 0, 6.9, minZ);
  for (let s = -1; s <= 1; s += 2) addCollider(s * 5.1, minZ, 0.9);
  const sign = makeSign([{ text: '🔬 LABORATORY', size: 0.55, color: '#b9f6ca' }], 13, 2.2, THEMES.dark);
  sign.position.set(0, 8.3, minZ - 0.62);
  sign.rotation.y = Math.PI;
  live.add(sign);
  const warn = makeSign([{ text: '⚠️ DANGER', size: 0.4, color: '#ffeb3b' }, { text: 'MUTANT SCIENCE INSIDE', size: 0.24 }], 5, 2, THEMES.red);
  warn.position.set(-11, 4.2, minZ - 0.56);
  warn.rotation.y = Math.PI;
  live.add(warn);
  const warn2 = makeSign([{ text: '☣️ KEEP OUT', size: 0.38, color: '#b9f6ca' }, { text: 'Rangers only!', size: 0.26 }], 5, 2, THEMES.purple);
  warn2.position.set(11, 4.2, minZ - 0.56);
  warn2.rotation.y = Math.PI;
  live.add(warn2);
  // 兩扇趟門（行近自動開）
  const doorMat = mat(0x455a64, { metalness: 0.7, roughness: 0.35 });
  lab.doors = [-1, 1].map((s) => {
    const d = new THREE.Group();
    add(d, box(4.5, 5.6, 0.4), doorMat, 0, 2.8, 0);
    add(d, box(3.6, 0.5, 0.45), new THREE.MeshStandardMaterial({ map: hazardTexture(3, 0.4) }), 0, 1.0, 0);
    add(d, box(0.6, 0.6, 0.46), glow(0x76ff03, 2.5), -s * 1.6, 3.9, 0);
    d.position.set(s * 2.25, 0, minZ);
    d.userData.side = s;
    live.add(d);
    return d;
  });

  // 門口兩邊：大儲存缸（綠色液體）+ 喉管
  const glass = new THREE.MeshStandardMaterial({ color: 0xb2ebf2, transparent: true, opacity: 0.35, roughness: 0.05 });
  for (const s of [-1, 1]) {
    const x = s * 17;
    add(root, cyl(2.2, 0.6, 20), mat(0x37474f, { metalness: 0.6 }), x, 0.3, minZ - 4);
    add(root, cyl(1.9, 4.2, 20), glow(0x64dd17, 0.9), x, 2.6, minZ - 4);
    add(root, cyl(2.05, 4.8, 20), glass, x, 2.9, minZ - 4, false);
    add(root, cyl(2.2, 0.5, 20), mat(0x37474f, { metalness: 0.6 }), x, 5.45, minZ - 4);
    add(root, box(0.5, 0.5, 4), mat(0x78909c, { metalness: 0.6 }), x, 5.2, minZ - 2.2);
    addCollider(x, minZ - 4, 2.4);
  }
  // 牆頂煙囪：噴綠色煙
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0x9ccc65, transparent: true, opacity: 0.6, emissive: 0x33691e, emissiveIntensity: 0.6 });
  const puffs = [];
  for (const x of [-20, 22]) {
    add(root, cyl(0.9, 4, 12), mat(0x546e7a, { metalness: 0.5 }), x, wallH + 2, minZ + 3);
    add(root, cyl(1.05, 0.5, 12), mat(0x263238), x, wallH + 4.1, minZ + 3);
    for (let i = 0; i < 5; i++) {
      const p = add(live, rbox(1.2, 1.2, 1.2), smokeMat.clone(), x, wallH + 5, minZ + 3, false);
      puffs.push({ p, x, i });
    }
  }
  // 雷達碟
  const radar = new THREE.Group();
  radar.position.set(-26, wallH + 0.5, minZ + 6);
  add(radar, cyl(0.2, 2.5, 8), mat(0x9e9e9e), 0, 1.25, 0);
  const dish = add(radar, new THREE.SphereGeometry(1.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), mat(0xeceff1, { side: THREE.DoubleSide }), 0, 2.6, 0);
  dish.rotation.x = -1.0;
  add(radar, new THREE.SphereGeometry(0.2, 8, 6), glow(0xff1744, 3), 0, 3.2, -0.5);
  live.add(radar);
  updates.push((dt, time) => {
    radar.rotation.y = time * 0.6;
    for (const { p, x, i } of puffs) {
      const k = (time * 0.35 + i / 5) % 1;
      p.position.set(x + Math.sin(k * 4 + i) * 0.8, wallH + 4.6 + k * 6, minZ + 3 + k * 2);
      p.scale.setScalar(0.6 + k * 1.6);
      p.material.opacity = 0.6 * (1 - k);
    }
  });
}

// ---------- 入面：試管、電腦、喉管、地上警告圈 ----------
function buildInterior(root, live, updates) {
  const { maxZ } = LAB;
  const glass = new THREE.MeshStandardMaterial({ color: 0xb2ebf2, transparent: true, opacity: 0.3, roughness: 0.05 });
  const metal = mat(0x37474f, { metalness: 0.6, roughness: 0.35 });
  // 後牆：大試管（4 支，入面有氣泡）
  const bubbles = [];
  const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xe8f5e9, emissive: 0xccff90, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 });
  const liquid = [0x76ff03, 0x00e5ff, 0x76ff03, 0xd500f9];
  [-22, -12, 12, 22].forEach((x, i) => {
    const z = maxZ - 3;
    add(root, cyl(1.7, 0.7, 20), metal, x, 0.35, z);
    add(root, cyl(1.4, 5.5, 20), glow(liquid[i], 0.8), x, 3.4, z);
    add(root, cyl(1.55, 6.2, 20), glass, x, 3.8, z, false);
    add(root, cyl(1.7, 0.6, 20), metal, x, 7.0, z);
    add(root, box(0.5, 2.5, 0.5), metal, x, 8.4, z);
    addCollider(x, z, 1.9);
    for (let b = 0; b < 4; b++) {
      const m = add(live, new THREE.SphereGeometry(0.18, 8, 6), bubbleMat, x, 1, z, false);
      bubbles.push({ m, x, z, phase: b / 4 + i * 0.13 });
    }
  });
  // 後牆大電腦：屏幕 + 按鈕（閃）
  // 掛喺後牆頂（傳送門上面），成個實驗室都望到
  add(root, box(9, 5, 1), metal, 0, 11.3, maxZ - 0.9);
  for (const s of [-1, 1]) add(root, box(0.6, 4, 0.6), metal, s * 3.5, 8.5, maxZ - 0.9);
  const screen = makeSign([{ text: '🧬 MUTATION LAB', size: 0.24, color: '#b9f6ca' }, { text: 'Experiment: ███ 99%', size: 0.17, color: '#76ff03' }, { text: '⚠️ ANIMALS CAPTURED: 6', size: 0.15, color: '#ff8a80' }], 8, 4.2, THEMES.dark);
  screen.position.set(0, 11.3, maxZ - 1.42);
  screen.rotation.y = Math.PI;
  live.add(screen);
  // 控制台（兩邊）
  const buttons = [];
  for (const s of [-1, 1]) {
    const x = s * 7.5;
    const z = maxZ - 4.5;
    const desk = add(root, rbox(4, 1.2, 1.6), metal, x, 0.6, z);
    desk.rotation.y = 0;
    add(root, box(3.6, 0.8, 0.2), mat(0x263238), x, 1.65, z + 0.6).rotation.x = -0.4;
    addCollider(x - 1, z, 1.1);
    addCollider(x + 1, z, 1.1);
    for (let i = 0; i < 6; i++) {
      const colors = [0xff1744, 0x76ff03, 0xffea00, 0x00e5ff];
      const b = add(live, box(0.3, 0.12, 0.3), glow(colors[i % 4], 2).clone(), x - 1.3 + (i % 3) * 0.5 + (i > 2 ? 0.2 : 0), 1.25, z - 0.4 + Math.floor(i / 3) * 0.4, false);
      buttons.push({ b, phase: i * 1.7 + s });
    }
  }
  // 地上：喉管 + 電線
  const pipe = mat(0x78909c, { metalness: 0.6, roughness: 0.3 });
  for (const s of [-1, 1]) {
    add(root, cyl(0.35, 40, 10), pipe, s * 29, 0.4, 125).rotation.x = Math.PI / 2;
    add(root, cyl(0.25, 40, 10), mat(0x8bc34a), s * 28.6, 1.2, 125).rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 6; i++) {
    const cable = add(root, box(0.15, 0.08, 9 + i), mat(i % 2 ? 0x212121 : 0xd32f2f), -6 + i * 2.4, 0.05, maxZ - 9 - i * 0.5, false);
    cable.rotation.y = (i - 2.5) * 0.12;
  }
  // Boss 企嘅位：地上黃黑警告圈
  const ring = add(root, new THREE.RingGeometry(6, 7, 48), new THREE.MeshStandardMaterial({ map: hazardTexture(12, 1), side: THREE.DoubleSide }), BOSS_HOME.x, 0.04, BOSS_HOME.z, false);
  ring.rotation.x = -Math.PI / 2;
  // 恐怖燈：綠光（試管）+ 紫光（傳送門）會閃
  const green = new THREE.PointLight(0x76ff03, 18, 30, 1.6);
  green.position.set(0, 6, maxZ - 8);
  const purple = new THREE.PointLight(0xd500f9, 14, 28, 1.6);
  purple.position.set(0, 5, 118);
  live.add(green, purple);
  lab.lights = [green, purple];
  updates.push((dt, time) => {
    for (const { m, x, z, phase } of bubbles) {
      const k = (time * 0.4 + phase) % 1;
      m.position.set(x + Math.sin(k * 9 + phase * 10) * 0.6, 1 + k * 5.2, z + Math.cos(k * 7 + phase * 10) * 0.5);
    }
    for (const { b, phase } of buttons) b.material.emissiveIntensity = Math.sin(time * 4 + phase) > 0.2 ? 3 : 0.3;
    green.intensity = 16 + Math.sin(time * 2.3) * 4 + (Math.random() < 0.02 ? -10 : 0); // 偶然閃一下
    purple.intensity = 12 + Math.sin(time * 1.7) * 3;
  });
}

// ---------- 4 個 Solar Energy Capsule ----------
function buildCapsules(live) {
  const metal = mat(0x546e7a, { metalness: 0.7, roughness: 0.3 });
  const panelMat = new THREE.MeshStandardMaterial({ map: canvasTex(32, (ctx) => {
    ctx.fillStyle = '#0d47a1';
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = '#90caf9';
    for (let i = 0; i <= 32; i += 8) {
      ctx.strokeRect(i, 0, 0.5, 32);
      ctx.strokeRect(0, i, 32, 0.5);
    }
  }), metalness: 0.5, roughness: 0.25 });
  lab.capsules = CAPSULES.map(({ x, z }) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    add(g, rbox(2.4, 0.5, 2.4), metal, 0, 0.25, 0);
    add(g, cyl(0.8, 0.3, 16), metal, 0, 0.65, 0);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0xffab00, emissiveIntensity: 2 });
    const core = add(g, cyl(0.55, 1.9, 16), coreMat, 0, 1.75, 0);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xfff8e1, transparent: true, opacity: 0.35, roughness: 0.05 });
    add(g, cyl(0.72, 2.2, 16), glassMat, 0, 1.8, 0, false);
    add(g, cyl(0.8, 0.25, 16), metal, 0, 2.95, 0);
    add(g, new THREE.SphereGeometry(0.3, 12, 8), glow(0xffea00, 3), 0, 3.2, 0, false);
    // 細太陽能板（4 塊，斜斜向天）
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const p = new THREE.Group();
      p.position.set(Math.cos(a) * 1.45, 0.75, Math.sin(a) * 1.45);
      p.rotation.y = -a;
      add(p, box(0.08, 0.6, 0.08), metal, 0, -0.1, 0);
      add(p, box(0.9, 0.05, 0.7), panelMat, 0, 0.25, 0).rotation.z = 0.5;
      g.add(p);
    }
    // 轉緊嘅光環
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd740, transparent: true, opacity: 0.7 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.05, 6, 32), ringMat);
    ring.position.y = 1.8;
    ring.rotation.x = Math.PI / 2.4;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.04, 6, 32), ringMat);
    ring2.position.y = 1.6;
    ring2.rotation.x = Math.PI / 1.8;
    g.add(ring, ring2);
    const label = makeLabel([{ text: '☀️ SOLAR ENERGY CAPSULE', color: '#ffe082' }], 1.1);
    label.position.y = 4.1;
    g.add(label);
    live.add(g);
    addCollider(x, z, 1.25);
    return { x, z, g, core, ring, ring2, label, glassMat, used: false };
  });
}

// Capsule 用完：變暗、裂開（labBoss.js 叫）
export function breakCapsule(c) {
  c.used = true;
  c.core.material.color.set(0x424242);
  c.core.material.emissiveIntensity = 0;
  c.glassMat.color.set(0x616161);
  c.ring.visible = c.ring2.visible = false;
  c.label.userData.setLines([{ text: '💥 Used up!', color: '#bdbdbd' }]);
}
// 新一場戰鬥：變返新
export function resetCapsules() {
  for (const c of lab.capsules) {
    c.used = false;
    c.core.material.color.set(0xffd54f);
    c.core.material.emissiveIntensity = 2;
    c.glassMat.color.set(0xfff8e1);
    c.ring.visible = c.ring2.visible = true;
    c.label.userData.setLines([{ text: '☀️ SOLAR ENERGY CAPSULE', color: '#ffe082' }]);
  }
}

// ---------- 玻璃艙：瞓住被捉嘅瀕危動物 ----------
const POD_ANIMALS = ['Giant Panda', 'Red Panda', 'Kakapo', 'Polar Bear', 'Pangolin', 'Snow Leopard'];
function buildPods(live) {
  const metal = mat(0x455a64, { metalness: 0.6, roughness: 0.35 });
  lab.pods = PODS.map(({ x, z }, i) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    add(g, cyl(1.9, 0.6, 20), metal, 0, 0.3, 0);
    add(g, cyl(1.7, 0.08, 20), glow(0x00e5ff, 1.2), 0, 0.64, 0, false);
    const lid = new THREE.Group(); // 玻璃罩 + 頂（結局會升起）
    add(lid, cyl(1.75, 3.4, 20), new THREE.MeshStandardMaterial({ color: 0x80deea, transparent: true, opacity: 0.28, roughness: 0.05 }), 0, 2.4, 0, false);
    add(lid, cyl(1.9, 0.5, 20), metal, 0, 4.35, 0);
    add(lid, new THREE.SphereGeometry(0.25, 8, 6), glow(0x00e5ff, 2.5), 0, 4.75, 0, false);
    g.add(lid);
    const animal = ANIMALS.find((a) => a.name === POD_ANIMALS[i]) || ANIMALS[i * 7];
    const model = buildAnimalModel(animal);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.scale.multiplyScalar(Math.min(1.4, 2.2 / Math.max(size.x, size.y, size.z)));
    if (model.userData.move === 'fly') model.userData.flying = false;
    model.position.y = 0.66;
    model.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2; // 面向場中間
    g.add(model);
    const zzzY = 3.6;
    const zzz = makeLabel([{ text: '💤 Zzz...', color: '#b3e5fc' }], 0.8);
    zzz.position.y = zzzY;
    g.add(zzz);
    live.add(g);
    addCollider(x, z, 2.1);
    return { x, z, g, lid, model, animal, zzz, zzzY, free: false };
  });
}

// ---------- 傳送門（後牆前面；Boss 戰先開） ----------
function buildPortal(root, live, updates) {
  const { x, z, y } = PORTAL;
  const metal = mat(0x263238, { metalness: 0.7, roughness: 0.3 });
  const frame = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.5, 10, 36), metal);
  frame.position.set(x, y, z);
  root.add(frame);
  for (const s of [-1, 1]) add(root, rbox(1.2, y, 1.2), metal, x + s * 3.9, y / 2, z);
  add(root, rbox(9.5, 0.6, 2.5), metal, x, 0.3, z);
  // 一圈紫色燈
  const lights = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const l = add(live, new THREE.SphereGeometry(0.2, 8, 6), glow(0xd500f9, 1).clone(), x + Math.cos(a) * 3.7, y + Math.sin(a) * 3.7, z - 0.45, false);
    lights.push(l);
  }
  const swirl = new THREE.Mesh(new THREE.CircleGeometry(3.3, 40), new THREE.MeshBasicMaterial({ map: swirlTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  swirl.position.set(x, y, z - 0.1);
  swirl.scale.setScalar(0.001);
  live.add(swirl);
  lab.portal = { swirl, open: 0, target: 0, lights };
  updates.push((dt, time) => {
    const p = lab.portal;
    p.open += (p.target - p.open) * Math.min(1, dt * 2.5);
    swirl.scale.setScalar(Math.max(0.001, p.open));
    swirl.rotation.z = time * 2.5;
    swirl.visible = p.open > 0.01;
    lights.forEach((l, i) => (l.material.emissiveIntensity = p.open > 0.1 ? 1.5 + Math.sin(time * 8 + i) * 1.5 : 0.4));
  });
}

// ---------- 大門鎖（Hub 嗰邊）：鐵鏈打交叉 + 大鎖 + 「仲差幾多隻」牌 ----------
function buildGateLock(live) {
  const { x, z } = PARK_GATE;
  const g = new THREE.Group();
  g.position.set(x, 0, z - 0.35);
  const chainMat = mat(0x9e9e9e, { metalness: 0.85, roughness: 0.3 });
  const link = new THREE.TorusGeometry(0.16, 0.05, 6, 12);
  const chains = [];
  for (const s of [-1, 1]) {
    const chain = new THREE.Group();
    // 一條斜斜嘅鐵鏈（由左上去右下）
    for (let i = 0; i < 16; i++) {
      const l = new THREE.Mesh(link, chainMat);
      l.position.set(-2.6 + i * 0.35, 0, 0);
      l.rotation.x = i % 2 ? Math.PI / 2 : 0;
      chain.add(l);
    }
    chain.position.set(0, 2.4, 0);
    chain.rotation.z = s * 0.55;
    g.add(chain);
    chains.push(chain);
  }
  const padlock = new THREE.Group();
  padlock.position.set(0, 2.4, -0.15);
  add(padlock, rbox(0.9, 0.8, 0.35), mat(0xffc107, { metalness: 0.8, roughness: 0.25 }), 0, 0, 0);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 8, 16, Math.PI), chainMat);
  shackle.position.y = 0.4;
  padlock.add(shackle);
  add(padlock, box(0.12, 0.25, 0.05), mat(0x212121), 0, -0.05, -0.18);
  g.add(padlock);
  const sign = dynamicSign(4.6, 1.5);
  sign.mesh.position.set(0, 4.1, -0.1);
  sign.mesh.rotation.y = Math.PI; // 面向 Hub
  g.add(sign.mesh);
  live.add(g);
  lab.lock = { group: g, chains, padlock, sign, shackle };
}

function updateLockSign() {
  if (!lab.lock.group.visible) return;
  const have = state.indexFound.length;
  lab.lock.sign.draw(THEMES.dark, [
    { text: '🔒 LOCKED', size: 0.3, color: '#ffeb3b' },
    { text: `Find ${LAB_UNLOCK_PETS} pets in your 📖 Index to open`, size: 0.15 },
    { text: `You have ${Math.min(have, LAB_UNLOCK_PETS)} / ${LAB_UNLOCK_PETS}`, size: 0.2, color: have >= LAB_UNLOCK_PETS ? '#b9f6ca' : '#ffcdd2' },
  ]);
}

// ---------- 指路：地上發光箭咀 + 頭頂大箭咀 ----------
function buildGuide(live) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x76ff03, emissive: 0x64dd17, emissiveIntensity: 2, transparent: true, opacity: 0.9 });
  // 一個「V」字（尖頭向 +z = 去實驗室方向）
  const chevron = new THREE.Group();
  for (const s of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 1.6), m);
    bar.position.set(s * 0.5, 0, 0);
    bar.rotation.y = s * 0.75;
    chevron.add(bar);
  }
  const chevrons = [];
  for (let z = 45; z < 99; z += 3) {
    const c = chevron.clone();
    c.position.set(0, 0.08, z);
    g.add(c);
    chevrons.push(c);
  }
  // 頭頂大箭咀
  const big = new THREE.Group();
  const bigMat = new THREE.MeshStandardMaterial({ color: 0x76ff03, emissive: 0x64dd17, emissiveIntensity: 2 });
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.1, 4), bigMat);
  head.rotation.x = Math.PI;
  big.add(head);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1, 0.38), bigMat);
  shaft.position.y = 1;
  big.add(shaft);
  g.add(big);
  g.visible = false;
  live.add(g);
  lab.guide = { g, chevrons, big, mat: m };
}

// 每格畫面：要唔要指路（開咗門、未入過實驗室）；指去大門 → 實驗室門口
export function updateLabGuide(camera, time, show) {
  const { g, chevrons, big, mat: m } = lab.guide;
  const el = $('lab-arrow');
  g.visible = show;
  el.hidden = !show;
  if (!show) return;
  const pos = camera.position;
  const target = pos.z < PARK_GATE.z - 1 ? new THREE.Vector3(0, 0, PARK_GATE.z) : new THREE.Vector3(0, 0, LAB_DOOR_Z + 2);
  big.position.set(target.x, 5 + Math.sin(time * 4) * 0.4, target.z);
  big.rotation.y = time * 2;
  // 箭咀一個接一個咁亮（好似向前流）
  chevrons.forEach((c, i) => c.scale.setScalar(1 + Math.max(0, Math.sin(time * 6 - i * 0.6)) * 0.35));
  m.emissiveIntensity = 1.6 + Math.sin(time * 5) * 0.6;
  const fx = -Math.sin(camera.rotation.y);
  const fz = -Math.cos(camera.rotation.y);
  const tx = target.x - pos.x;
  const tz = target.z - pos.z;
  const angle = Math.atan2(fx * tz - fz * tx, fx * tx + fz * tz);
  el.querySelector('span').style.transform = `rotate(${Math.round((angle * 180) / Math.PI)}deg)`;
  el.querySelector('small').textContent = `🔬 Laboratory · ${Math.round(Math.hypot(tx, LAB_DOOR_Z - pos.z))} m`;
}

// 大門開咗（開鎖動畫完／debug 用）
export function openParkGate() {
  parkGate.open = true;
  lab.lock.group.visible = false;
  setGateOpen(1);
}
