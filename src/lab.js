// Laboratory（小朋友 Issue #2）：Hub 底大門外面嘅「恐怖但唔嚇親小朋友」科學實驗室
// - 圖鑑未夠 25 隻：大門有鐵鏈 + 大鎖 + 牌（話你仲差幾多隻）
// - 開咗：前院 + 實驗室（冇屋頂嘅大房，Boss 戰喺入面打）
// - 入面：綠色發光試管、電腦、喉管、6 個玻璃艙（瞓住被捉嘅瀕危動物）、4 個 Solar Energy Capsule、傳送門
// - 指路：地上一行發光箭咀 + 頭頂跳下跳下嘅大箭咀 + 畫面箭咀（第一次行入實驗室之後收埋）
// 唔郁嘅嘢放 staticRoot（最後焊埋，畫得快）；會郁嘅放 live

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { addCollider, bakeStatic, parkGate } from './world.js';
import { makeLabel, dynamicSign, THEMES } from './signs.js';
import { PARK_GATE, setGateOpen } from './hubPark.js';
import { buildAnimalModel } from './animalModels.js';
import { ANIMALS } from './data/animals.js';
import { LAB_PODS, LAB_PORTAL_BY_PODS, LAB_PORTAL_BY_LEGENDARY, LAB_LEGENDARY_NEEDED } from './data/balance.js';
import { state } from './state.js';
import { LAB, LAB_DOOR_Z, CAPSULES, PODS, PORTAL, ARENA, BOSS_PORTAL, EXIT_PORTAL, RED_BUTTON, HAMMER_SPOT } from './labShape.js';

const LAB_MID = { x: 0, z: 124 }; // 實驗室中間（地上燈帶、頂上光環）

const $ = (id) => document.getElementById(id);

// 其他檔案要郁嘅嘢
export const lab = {
  capsules: [], pods: [], doors: [], lock: null, lights: [], guide: null, doorOpen: 0,
  labPortal: null, // 實驗室傳送門（開咗就入得 Boss Arena）
  bossPortal: null, // Arena 入面，Boss 叫生態區 Boss 出嚟嘅傳送門
  exitPortal: null, // Arena 南邊：返實驗室
  button: null, hammer: null, effects: [], scene: null,
};

// ---- 傳送門幾時開（小朋友 2026-10-15：做到其中一樣就得）----
export const podsDone = () => state.labPodsSmashed.length >= Math.min(LAB_PODS, PODS.length);
export const legendaryDone = () => state.labLegendaryGiven >= LAB_LEGENDARY_NEEDED;
export const portalReady = () => (LAB_PORTAL_BY_PODS && podsDone()) || (LAB_PORTAL_BY_LEGENDARY && legendaryDone());

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

// ---------- 紋理（未來感：深色金屬板 + 霓虹光線） ----------
function canvasTex(size, draw, repeatX = 1, repeatY = 1, nearest = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  if (nearest) t.magFilter = THREE.NearestFilter;
  return t;
}
const CYAN = 0x00e5ff;
const MAGENTA = 0xea00ff;
// 金屬牆板（map）+ 發光接縫（emissiveMap）
function techPanel(rx, ry) {
  const map = canvasTex(64, (ctx) => {
    ctx.fillStyle = '#2b3850';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#3a4a66';
    ctx.fillRect(2, 2, 60, 28);
    ctx.fillRect(2, 34, 28, 28);
    ctx.fillRect(34, 34, 28, 28);
    ctx.fillStyle = '#4a5d7e';
    ctx.fillRect(4, 4, 56, 3);
    ctx.fillStyle = '#121822';
    for (const [x, y] of [[5, 22], [56, 22], [6, 56], [54, 56]]) ctx.fillRect(x, y, 3, 3);
  }, rx, ry);
  const emissiveMap = canvasTex(64, (ctx) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(0, 31, 64, 2);
    ctx.fillRect(31, 33, 2, 31);
    ctx.fillStyle = '#ea00ff';
    ctx.fillRect(10, 12, 14, 2);
    ctx.fillStyle = '#76ff03';
    ctx.fillRect(48, 44, 4, 4);
  }, rx, ry);
  return new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 1.2, metalness: 0.5, roughness: 0.35 });
}
// 金屬地板 + 發光燈帶
function techFloor(rx, ry) {
  const map = canvasTex(128, (ctx) => {
    ctx.fillStyle = '#1c2430';
    ctx.fillRect(0, 0, 128, 128);
    for (const [x, y] of [[2, 2], [66, 2], [2, 66], [66, 66]]) {
      ctx.fillStyle = (x + y) % 128 ? '#334155' : '#2c3849';
      ctx.fillRect(x, y, 60, 60);
      ctx.fillStyle = '#46566e';
      ctx.fillRect(x + 4, y + 4, 52, 2);
      ctx.fillRect(x + 4, y + 4, 2, 52);
    }
    ctx.fillStyle = '#0d1117';
    for (let i = 0; i < 6; i++) ctx.fillRect(20 + i * 4, 100, 2, 14); // 散熱孔
  }, rx, ry);
  const emissiveMap = canvasTex(128, (ctx) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#00b8d4';
    ctx.fillRect(0, 63, 128, 2);
    ctx.fillRect(63, 0, 2, 128);
    ctx.fillStyle = '#00e5ff';
    for (const [x, y] of [[60, 60], [0, 60], [60, 0]]) ctx.fillRect(x, y, 8, 8);
    ctx.fillStyle = '#ea00ff';
    ctx.fillRect(84, 20, 24, 2);
  }, rx, ry);
  return new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 1, metalness: 0.6, roughness: 0.3 });
}
// 力場牆：六角形格仔（透明、發光）
function hexTexture(rx, ry) {
  return canvasTex(128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(120,240,255,0.9)';
    ctx.lineWidth = 2;
    const r = 16;
    const h = Math.sqrt(3) * r;
    for (let row = -1; row < 6; row++) {
      for (let col = -1; col < 6; col++) {
        const cx = col * r * 3 + (row % 2 ? r * 1.5 : 0);
        const cy = row * h / 2 * 1;
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }, rx, ry, false);
}
// 全息屏幕：透明底 + 青色框 + 掃描線 + 字
function holoPanel(lines, w, h, color = '#00e5ff') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.round((512 * h) / w);
  const ctx = c.getContext('2d');
  const H = c.height;
  ctx.fillStyle = 'rgba(0,229,255,0.12)';
  ctx.fillRect(0, 0, 512, H);
  for (let y = 0; y < H; y += 6) {
    ctx.fillStyle = 'rgba(0,229,255,0.08)';
    ctx.fillRect(0, y, 512, 2);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 500, H - 12);
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, 476, H - 36);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    ctx.font = `900 ${l.size}px "Trebuchet MS", system-ui, sans-serif`;
    ctx.fillStyle = l.color || '#e0f7fa';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillText(l.text, 256, ((i + 1) * H) / (lines.length + 1), 470);
  });
  // 細柱狀圖（似數據）
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(118,255,3,0.7)';
  for (let i = 0; i < 10; i++) ctx.fillRect(36 + i * 14, H - 30 - ((i * 37) % 30), 8, 8 + ((i * 37) % 30));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
    map: t, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  return m;
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
  lab.scene = scene;
  const updates = [];

  buildShell(staticRoot, live, updates);
  buildInterior(staticRoot, live, updates);
  buildArena(staticRoot, live, updates);
  buildCapsules(live);
  buildPods(live);
  lab.labPortal = makePortal(staticRoot, live, updates, { ...PORTAL, color: 0xd500f9 });
  lab.bossPortal = makePortal(staticRoot, live, updates, { ...BOSS_PORTAL, color: 0xff1744 });
  lab.exitPortal = makePortal(staticRoot, live, updates, { ...EXIT_PORTAL, r: 2.4, color: 0x00e676, rotY: Math.PI });
  lab.exitPortal.target = 1; // 出口一直開住
  const exitSign = holoPanel([{ text: '⬅ EXIT', size: 70, color: '#b9f6ca' }, { text: 'back to the Lab', size: 40 }], 4, 1.8, '#00e676');
  exitSign.position.set(EXIT_PORTAL.x, EXIT_PORTAL.y + 4, EXIT_PORTAL.z);
  live.add(exitSign);
  buildRedButton(live);
  buildHammer(live);
  buildGateLock(live);
  buildGuide(live);
  bakeStatic(staticRoot, scene);

  // 舊存檔：大門一開始就打開；打爛咗嘅玻璃艙保持爛咗；執咗嘅鎚仔唔再出
  parkGate.open = !!state.labUnlocked;
  for (const i of state.labPodsSmashed) if (lab.pods[i]) breakPodNow(lab.pods[i]);
  if (state.hasHammer) lab.hammer.g.visible = false;
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
    // 困住嘅動物：呼吸、字浮上浮落；放咗出嚟：跳兩下，再跑出實驗室門口
    for (const p of lab.pods) {
      if (!p.free) {
        p.model.userData.animate?.(time * 0.3, 0);
        p.zzz.position.y = p.zzzY + Math.sin(time * 1.5 + p.x) * 0.2;
      } else if (p.runner) updateFreedAnimal(p, dt, time);
    }
    // 實驗室傳送門：開咗先有旋渦（打贏咗就閂）
    lab.labPortal.target = portalReady() && !state.labBossDefeated ? 1 : 0;
    // 紅色掣：撳落去再彈返上嚟
    lab.button.press = Math.max(0, lab.button.press - dt * 2);
    lab.button.cap.position.y = 1.0 - Math.sin(Math.min(1, lab.button.press) * Math.PI) * 0.18;
    lab.button.ring.material.emissiveIntensity = 1.5 + Math.sin(time * 4) * 1;
    // 鎚仔：浮下浮下、轉
    if (lab.hammer.g.visible) {
      lab.hammer.tool.position.y = 1.4 + Math.sin(time * 2) * 0.15;
      lab.hammer.tool.rotation.y = time * 1.2;
    }
    updateEffects(dt);
    // 燈只係喺附近先開（每盞燈都會令成個世界畫慢啲）
    const inLabZone = playerPos.z > 90 && playerPos.z < 170;
    const inArenaZone = playerPos.z > 260;
    for (const l of lab.lights) l.visible = inLabZone;
    for (const l of lab.arenaLights) l.visible = inArenaZone;
  };
}

// ---------- 外殼：未來感實驗室競技場 ----------
// 前面：深色金屬大樓（霓虹邊框、全息大牌、天線塔、浮喺頂嘅光環）
// 兩邊同後面：力場牆（透明六角格仔，會流動）+ 霓虹柱
function buildShell(root, live, updates) {
  const { minX, maxX, minZ, maxZ, wallH } = LAB;
  const W = maxX - minX;
  const D = maxZ - minZ;
  const dark = mat(0x2a3448, { metalness: 0.6, roughness: 0.35 });
  const neonC = glow(CYAN, 2.2);
  const neonM = glow(MAGENTA, 2.2);
  // 地板：金屬板 + 發光接縫
  const floor = add(root, box(W, 0.2, D), techFloor(W / 6, D / 6), 0, -0.09, (minZ + maxZ) / 2, false);
  floor.receiveShadow = true;
  // 前院：門口前面一條發光「跑道」
  add(root, box(7, 0.04, 30), mat(0x1b2433, { metalness: 0.5 }), 0, 0.03, minZ - 15, false);
  for (const s of [-1, 1]) add(root, box(0.18, 0.06, 30), neonC, s * 3.4, 0.05, minZ - 15, false);

  // ---- 前面大樓（實心）----
  const panel = (len) => {
    const m = techPanel(len / 4, wallH / 4);
    return m;
  };
  const frontWall = (x1, x2) => {
    const len = x2 - x1;
    add(root, box(len, wallH + 2, 1.4), panel(len), (x1 + x2) / 2, (wallH + 2) / 2, minZ);
    add(root, box(len, 0.25, 1.6), neonC, (x1 + x2) / 2, wallH + 2, minZ); // 頂部霓虹邊
    add(root, box(len, 0.2, 1.6), neonM, (x1 + x2) / 2, 0.15, minZ); // 底部霓虹邊
  };
  frontWall(minX, -4.5);
  frontWall(4.5, maxX);
  // 斜斜嘅「翼」（似太空站）
  for (const s of [-1, 1]) {
    const wing = add(root, box(8, 0.5, 4), dark, s * 22, wallH + 2.6, minZ + 0.5);
    wing.rotation.z = s * 0.25;
    add(root, box(8, 0.12, 0.2), neonC, s * 22, wallH + 2.4, minZ - 1.55).rotation.z = s * 0.25;
  }
  // 門框：霓虹方框
  for (const s of [-1, 1]) {
    add(root, box(1.0, 7, 1.8), dark, s * 5, 3.5, minZ);
    add(root, box(0.2, 7, 1.9), neonC, s * 4.45, 3.5, minZ);
    addCollider(s * 5, minZ, 0.8);
  }
  add(root, box(11, 1.0, 1.8), dark, 0, 7.4, minZ);
  add(root, box(9.2, 0.2, 1.9), neonC, 0, 6.85, minZ);
  // 全息大牌「LABORATORY」+ 投影機
  const sign = holoPanel([{ text: '🔬 LABORATORY', size: 70, color: '#e0f7fa' }], 14, 2.6);
  sign.position.set(0, wallH + 4.6, minZ - 0.4);
  sign.rotation.y = Math.PI;
  live.add(sign);
  add(root, box(10, 0.4, 1.2), dark, 0, wallH + 2.9, minZ - 0.3);
  const warn = holoPanel([{ text: '⚠️ DANGER', size: 64, color: '#ffeb3b' }, { text: 'MUTANT SCIENCE INSIDE', size: 34 }], 5.5, 2.6, '#ff1744');
  warn.position.set(-12, 4.4, minZ - 0.8);
  warn.rotation.y = Math.PI;
  live.add(warn);
  const warn2 = holoPanel([{ text: '☣️ KEEP OUT', size: 60, color: '#b9f6ca' }, { text: 'Rangers only!', size: 38 }], 5.5, 2.6, '#ea00ff');
  warn2.position.set(12, 4.4, minZ - 0.8);
  warn2.rotation.y = Math.PI;
  live.add(warn2);
  // 兩扇趟門（行近自動開）：深色 + 霓虹線
  lab.doors = [-1, 1].map((s) => {
    const d = new THREE.Group();
    add(d, box(4.5, 6.4, 0.4), mat(0x1e2a3a, { metalness: 0.8, roughness: 0.25 }), 0, 3.2, 0);
    add(d, box(0.14, 6.2, 0.45), neonC, -s * 2.1, 3.2, 0);
    add(d, box(3.6, 0.14, 0.45), neonM, 0, 4.6, 0);
    add(d, box(3.6, 0.14, 0.45), neonM, 0, 1.8, 0);
    d.position.set(s * 2.25, 0, minZ);
    d.userData.side = s;
    live.add(d);
    return d;
  });

  // ---- 兩邊同後面：力場牆 ----
  const hexMat = new THREE.MeshBasicMaterial({
    map: hexTexture(W / 6, wallH / 6), color: 0x66f2ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const hexMatZ = hexMat.clone();
  hexMatZ.map = hexTexture(D / 6, wallH / 6);
  const field = (x1, z1, x2, z2, m) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const rotY = -Math.atan2(z2 - z1, x2 - x1);
    const f = add(live, new THREE.PlaneGeometry(len, wallH - 1.4), m, (x1 + x2) / 2, 1.4 + (wallH - 1.4) / 2, (z1 + z2) / 2, false);
    f.rotation.y = rotY;
    f.receiveShadow = false;
    // 底座（矮金屬牆 + 霓虹線）
    const base = add(root, box(len + 1, 1.4, 1), dark, (x1 + x2) / 2, 0.7, (z1 + z2) / 2);
    base.rotation.y = rotY;
    const line = add(root, box(len + 1, 0.16, 1.1), neonC, (x1 + x2) / 2, 1.42, (z1 + z2) / 2, false);
    line.rotation.y = rotY;
    const top = add(root, box(len + 1, 0.3, 0.5), dark, (x1 + x2) / 2, wallH, (z1 + z2) / 2);
    top.rotation.y = rotY;
    const topLine = add(root, box(len + 1, 0.1, 0.6), neonM, (x1 + x2) / 2, wallH - 0.2, (z1 + z2) / 2, false);
    topLine.rotation.y = rotY;
  };
  field(minX, minZ, minX, maxZ, hexMatZ);
  field(maxX, minZ, maxX, maxZ, hexMatZ);
  // 後面：實心科技牆（掛屏幕、試管）
  add(root, box(W + 1, wallH + 3, 1), techPanel(W / 4, (wallH + 3) / 4), 0, (wallH + 3) / 2, maxZ);
  add(root, box(W + 1, 0.25, 1.2), neonC, 0, wallH + 3, maxZ);
  // 霓虹柱（每 10 米一條）
  const orbs = [];
  for (const x of [minX, maxX]) {
    for (let z = minZ; z <= maxZ; z += 10) {
      add(root, box(1.2, wallH + 1.5, 1.2), dark, x, (wallH + 1.5) / 2, z);
      add(root, box(0.2, wallH, 1.25), (z / 10) % 2 ? neonC : neonM, x - Math.sign(x) * 0.55, wallH / 2 + 0.5, z, false);
      const orb = add(live, new THREE.SphereGeometry(0.4, 12, 8), glow(CYAN, 3).clone(), x, wallH + 2, z, false);
      orbs.push(orb);
    }
  }
  // 頂：浮喺半空嘅大光環（喺 Boss 上面轉）
  const halo = new THREE.Group();
  halo.position.set(LAB_MID.x, wallH + 5, LAB_MID.z);
  const h1 = new THREE.Mesh(new THREE.TorusGeometry(14, 0.25, 8, 64), neonC);
  h1.rotation.x = Math.PI / 2;
  const h2 = new THREE.Mesh(new THREE.TorusGeometry(10, 0.18, 8, 64), neonM);
  h2.rotation.x = Math.PI / 2;
  halo.add(h1, h2);
  for (let i = 0; i < 4; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 28), neonC);
    beam.rotation.y = (i / 4) * Math.PI;
    halo.add(beam);
  }
  live.add(halo);
  // 天線塔（閃紅燈）
  const blinkers = [];
  for (const x of [-26, 26]) {
    add(root, box(0.6, 7, 0.6), dark, x, wallH + 5, minZ + 1);
    for (let k = 0; k < 3; k++) add(root, box(2 - k * 0.5, 0.12, 0.12), neonC, x, wallH + 3 + k * 2, minZ + 1, false);
    blinkers.push(add(live, new THREE.SphereGeometry(0.35, 10, 8), glow(0xff1744, 3).clone(), x, wallH + 8.8, minZ + 1, false));
  }
  // 門口兩邊：大玻璃缸（發光液體 + 霓虹圈）
  const glass = new THREE.MeshStandardMaterial({ color: 0xb2ebf2, transparent: true, opacity: 0.3, roughness: 0.05 });
  for (const s of [-1, 1]) {
    const x = s * 17;
    add(root, cyl(2.2, 0.6, 20), dark, x, 0.3, minZ - 4);
    add(root, cyl(1.9, 4.2, 20), glow(s < 0 ? 0x64dd17 : 0x00b8d4, 0.9), x, 2.6, minZ - 4);
    add(root, cyl(2.05, 4.8, 20), glass, x, 2.9, minZ - 4, false);
    add(root, cyl(2.2, 0.5, 20), dark, x, 5.45, minZ - 4);
    for (const y of [0.65, 5.15]) {
      const r = add(root, new THREE.TorusGeometry(2.15, 0.08, 6, 32), neonC, x, y, minZ - 4, false);
      r.rotation.x = Math.PI / 2;
    }
    addCollider(x, minZ - 4, 2.4);
  }
  updates.push((dt, time) => {
    hexMat.map.offset.y = time * 0.05; // 力場慢慢流動
    hexMatZ.map.offset.y = time * 0.05;
    hexMat.opacity = hexMatZ.opacity = 0.38 + Math.sin(time * 2) * 0.08;
    halo.rotation.y = time * 0.15;
    h2.rotation.z = -time * 0.4;
    halo.position.y = wallH + 5 + Math.sin(time * 0.8) * 0.4;
    orbs.forEach((o, i) => (o.material.emissiveIntensity = 2 + Math.sin(time * 3 + i) * 1.5));
    blinkers.forEach((b) => (b.material.emissiveIntensity = Math.sin(time * 4) > 0 ? 4 : 0.2));
    sign.material.opacity = 0.85 + (Math.random() < 0.03 ? -0.4 : 0); // 全息偶然閃一閃
  });
}

// ---------- 入面：試管、全息屏幕、控制台、地上燈帶 ----------
function buildInterior(root, live, updates) {
  const { minZ, maxZ } = LAB;
  const glass = new THREE.MeshStandardMaterial({ color: 0xb2ebf2, transparent: true, opacity: 0.25, roughness: 0.05 });
  const dark = mat(0x2a3448, { metalness: 0.6, roughness: 0.35 });
  const neonC = glow(CYAN, 2.2);
  const neonM = glow(MAGENTA, 2.2);
  // 後牆：大試管（4 支，發光液體 + 氣泡 + 霓虹圈）
  const bubbles = [];
  const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xe8f5e9, emissive: 0xccff90, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 });
  const liquid = [0x76ff03, 0x00e5ff, 0x76ff03, 0xea00ff];
  [-22, -12, 12, 22].forEach((x, i) => {
    const z = maxZ - 3;
    add(root, cyl(1.7, 0.7, 20), dark, x, 0.35, z);
    add(root, cyl(1.4, 5.5, 20), glow(liquid[i], 0.8), x, 3.4, z);
    add(root, cyl(1.55, 6.2, 20), glass, x, 3.8, z, false);
    add(root, cyl(1.7, 0.6, 20), dark, x, 7.0, z);
    for (const y of [0.75, 6.65]) {
      const r = add(root, new THREE.TorusGeometry(1.65, 0.07, 6, 32), neonC, x, y, z, false);
      r.rotation.x = Math.PI / 2;
    }
    add(root, box(0.5, 2.5, 0.5), dark, x, 8.4, z);
    addCollider(x, z, 1.9);
    for (let b = 0; b < 4; b++) {
      const m = add(live, new THREE.SphereGeometry(0.18, 8, 6), bubbleMat, x, 1, z, false);
      bubbles.push({ m, x, z, phase: b / 4 + i * 0.13 });
    }
  });
  // 全息大屏幕（後牆頂，傳送門上面）
  const holos = [];
  const bigScreen = holoPanel([
    { text: '🧬 MUTATION LAB', size: 56, color: '#e0f7fa' },
    { text: 'EXPERIMENT ████ 99%', size: 40, color: '#76ff03' },
    { text: '⚠️ SPECIMENS CAPTURED: 6', size: 36, color: '#ff8a80' },
  ], 10, 4.6);
  bigScreen.position.set(0, 12, maxZ - 1);
  bigScreen.rotation.y = Math.PI;
  live.add(bigScreen);
  holos.push({ m: bigScreen, y: 12, phase: 0 });
  // 兩邊浮喺半空嘅細全息屏幕（每個下面有投影機 + 光錐）
  const smallScreens = [
    { x: -14, z: 104.5, rot: Math.PI, lines: [{ text: 'DNA SCAN', size: 60, color: '#e0f7fa' }, { text: '🧬 ▓▓▓▓▓░░ 71%', size: 44, color: '#76ff03' }] },
    { x: 14, z: 104.5, rot: Math.PI, lines: [{ text: 'SPECIMENS', size: 60, color: '#ffe082' }, { text: '🔨 SMASH TO FREE', size: 40, color: '#ffd740' }] },
    { x: -7.5, z: maxZ - 6.5, rot: Math.PI, lines: [{ text: 'PORTAL', size: 64, color: '#ea80fc' }, { text: '🌀 BOSS ARENA', size: 42 }] },
    { x: 7.5, z: maxZ - 6.5, rot: Math.PI, lines: [{ text: 'DRONE BAY', size: 60, color: '#e0f7fa' }, { text: '🛸 READY', size: 46, color: '#76ff03' }] },
  ];
  const coneMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (const s of smallScreens) {
    const m = holoPanel(s.lines, 4.4, 2.2);
    m.position.set(s.x, 4.2, s.z);
    m.rotation.y = s.rot;
    live.add(m);
    holos.push({ m, y: 4.2, phase: s.x });
    add(root, cyl(0.7, 0.5, 16), dark, s.x, 0.25, s.z);
    add(root, cyl(0.45, 0.1, 16), neonC, s.x, 0.52, s.z, false);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 0.4, 2.6, 16, 1, true), coneMat);
    cone.position.set(s.x, 1.85, s.z);
    live.add(cone);
    addCollider(s.x, s.z, 0.8);
  }
  // 控制台（後面兩邊）：斜面 + 發光掣
  const buttons = [];
  for (const s of [-1, 1]) {
    const x = s * 7.5;
    const z = maxZ - 4.5;
    add(root, rbox(4, 1.2, 1.6), dark, x, 0.6, z);
    add(root, box(3.6, 0.8, 0.2), mat(0x0d1117), x, 1.65, z + 0.6).rotation.x = -0.4;
    add(root, box(4.05, 0.1, 1.65), neonC, x, 1.21, z, false);
    addCollider(x - 1, z, 1.1);
    addCollider(x + 1, z, 1.1);
    for (let i = 0; i < 6; i++) {
      const colors = [0xff1744, 0x76ff03, 0xffea00, CYAN];
      const b = add(live, box(0.3, 0.12, 0.3), glow(colors[i % 4], 2).clone(), x - 1.3 + (i % 3) * 0.5 + (i > 2 ? 0.2 : 0), 1.3, z - 0.4 + Math.floor(i / 3) * 0.4, false);
      buttons.push({ b, phase: i * 1.7 + s });
    }
  }
  // 地上燈帶：Boss 位一個霓虹八角形 + 由中間射出去嘅光線（會一閃一閃咁流動）
  const strips = [];
  const stripMats = [CYAN, MAGENTA].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2 }));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const r = 7.5;
    const seg = add(live, box(2 * r * Math.sin(Math.PI / 8) + 0.2, 0.06, 0.25), stripMats[0], LAB_MID.x + Math.cos(a) * r * Math.cos(Math.PI / 8), 0.04, LAB_MID.z + Math.sin(a) * r * Math.cos(Math.PI / 8), false);
    seg.rotation.y = -a + Math.PI / 2;
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    for (let k = 0; k < 5; k++) {
      const d = 9 + k * 3.2;
      const x = LAB_MID.x + Math.cos(a) * d;
      const z = LAB_MID.z + Math.sin(a) * d;
      if (x < LAB.minX + 1.5 || x > LAB.maxX - 1.5 || z < minZ + 1.5 || z > maxZ - 1.5) continue;
      const m = stripMats[1].clone();
      const seg = add(live, box(0.25, 0.05, 2.2), m, x, 0.04, z, false);
      seg.rotation.y = -a + Math.PI / 2;
      strips.push({ m, k });
    }
  }
  // 頂上燈（細細粒，未來感）
  const green = new THREE.PointLight(0x76ff03, 16, 30, 1.6);
  green.position.set(0, 6, maxZ - 8);
  const cyanLight = new THREE.PointLight(CYAN, 14, 34, 1.5);
  cyanLight.position.set(-12, 7, 118);
  const magentaLight = new THREE.PointLight(MAGENTA, 14, 34, 1.5);
  magentaLight.position.set(12, 7, 118);
  live.add(green, cyanLight, magentaLight);
  lab.lights = [green, cyanLight, magentaLight];
  updates.push((dt, time) => {
    for (const { m, x, z, phase } of bubbles) {
      const k = (time * 0.4 + phase) % 1;
      m.position.set(x + Math.sin(k * 9 + phase * 10) * 0.6, 1 + k * 5.2, z + Math.cos(k * 7 + phase * 10) * 0.5);
    }
    for (const { b, phase } of buttons) b.material.emissiveIntensity = Math.sin(time * 4 + phase) > 0.2 ? 3 : 0.3;
    for (const h of holos) {
      h.m.position.y = h.y + Math.sin(time * 1.2 + h.phase) * 0.12;
      h.m.material.opacity = 0.8 + Math.sin(time * 9 + h.phase) * 0.06;
    }
    for (const s of strips) s.m.emissiveIntensity = 0.4 + Math.max(0, Math.sin(time * 4 - s.k * 1.1)) * 3; // 光由中間向外流
    stripMats[0].emissiveIntensity = 1.6 + Math.sin(time * 2) * 0.8;
    green.intensity = 14 + Math.sin(time * 2.3) * 4;
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

// ---------- 玻璃艙：困住被捉嘅瀕危動物（用鎚仔打爛救佢哋） ----------
const POD_ANIMALS = ['Giant Panda', 'Red Panda', 'Polar Bear', 'Snow Leopard'];
function buildPods(live) {
  const metal = mat(0x2a3448, { metalness: 0.6, roughness: 0.35 });
  lab.pods = PODS.slice(0, LAB_PODS).map(({ x, z }, i) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    add(g, cyl(1.9, 0.6, 20), metal, 0, 0.3, 0);
    add(g, cyl(1.7, 0.08, 20), glow(CYAN, 1.2), 0, 0.64, 0, false);
    const lid = new THREE.Group(); // 玻璃罩 + 頂（打爛就冇咗）
    add(lid, cyl(1.75, 3.4, 20), new THREE.MeshStandardMaterial({ color: 0x80deea, transparent: true, opacity: 0.3, roughness: 0.05 }), 0, 2.4, 0, false);
    add(lid, cyl(1.9, 0.5, 20), metal, 0, 4.35, 0);
    add(lid, new THREE.SphereGeometry(0.25, 8, 6), glow(CYAN, 2.5), 0, 4.75, 0, false);
    for (const y of [1.0, 3.9]) {
      const r = add(lid, new THREE.TorusGeometry(1.78, 0.06, 6, 32), glow(MAGENTA, 2), 0, y, 0, false);
      r.rotation.x = Math.PI / 2;
    }
    g.add(lid);
    const animal = ANIMALS.find((a) => a.name === POD_ANIMALS[i % POD_ANIMALS.length]) || ANIMALS[i * 7];
    const model = buildAnimalModel(animal);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.scale.multiplyScalar(Math.min(1.4, 2.2 / Math.max(size.x, size.y, size.z)));
    if (model.userData.move === 'fly') model.userData.flying = false;
    model.position.y = 0.66;
    model.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2; // 面向場中間
    g.add(model);
    const zzzY = 3.6;
    const zzz = makeLabel([{ text: '😢 Help! Trapped!', color: '#b3e5fc' }], 0.8);
    zzz.position.y = zzzY;
    g.add(zzz);
    const base = add(g, cyl(1.95, 0.1, 20), glow(0xff1744, 1), 0, 0.05, 0, false); // 紅光 = 未救
    live.add(g);
    addCollider(x, z, 2.1);
    return { i, x, z, g, lid, model, animal, zzz, zzzY, base, free: false, runner: null };
  });
}

// 打爛玻璃艙（即刻，例如讀存檔）
function breakPodNow(p) {
  p.free = true;
  p.lid.visible = false;
  p.model.visible = false;
  p.zzz.visible = false;
  p.base.material = glow(0x00e676, 1);
}

// 用鎚仔打爛：玻璃碎飛散、動物開心咁跳，再跑出實驗室
export function smashPod(p) {
  p.free = true;
  p.lid.visible = false;
  p.base.material = glow(0x00e676, 1);
  p.zzz.userData.setLines([{ text: `❤ Thank you! ❤`, color: '#ff80ab' }]);
  shards(p.g.position.clone().setY(2.2), 0x80deea, 40);
  shards(p.g.position.clone().setY(2.2), 0xffffff, 16);
  p.runner = { t: 0 };
}
function updateFreedAnimal(p, dt, time) {
  const r = p.runner;
  r.t += dt;
  const m = p.model;
  if (r.t < 1.6) {
    m.position.y = 0.66 + Math.abs(Math.sin(r.t * 7)) * 0.9; // 開心到跳
    m.userData.animate?.(time, 0);
    return;
  }
  // 跑去實驗室門口，然後消失（返屋企）
  const world = p.g.position.clone().add(m.position);
  const goal = new THREE.Vector3(0, 0, LAB_DOOR_Z - 2);
  const d = goal.clone().sub(world);
  d.y = 0;
  if (d.length() < 1 || r.t > 9) {
    m.visible = false;
    p.zzz.visible = false;
    p.runner = null;
    return;
  }
  d.normalize();
  m.position.addScaledVector(d, dt * 8);
  m.position.y = 0;
  m.rotation.y = Math.atan2(-d.x, -d.z);
  p.zzz.position.set(m.position.x, p.zzzY, m.position.z);
  m.userData.animate?.(time, 1);
}

// 玻璃碎／閃光：一堆細方塊四圍飛
function shards(at, color, n) {
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, transparent: true, opacity: 0.9 });
  const g = new THREE.Group();
  const parts = [];
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.05), m);
    p.position.copy(at);
    g.add(p);
    parts.push({ p, v: new THREE.Vector3().randomDirection().multiplyScalar(4 + Math.random() * 4).add(new THREE.Vector3(0, 3, 0)) });
  }
  lab.scene.add(g);
  lab.effects.push({ life: 0, max: 1.6, update: (k, dt) => {
    for (const q of parts) {
      q.v.y -= 14 * dt;
      q.p.position.addScaledVector(q.v, dt);
      if (q.p.position.y < 0.05) {
        q.p.position.y = 0.05;
        q.v.set(0, 0, 0);
      }
      q.p.rotation.x += dt * 9;
    }
    m.opacity = 0.9 * (1 - k);
  }, done: () => lab.scene.remove(g) });
}
export const sparkleBurst = shards;
function updateEffects(dt) {
  for (let i = lab.effects.length - 1; i >= 0; i--) {
    const e = lab.effects[i];
    e.life += dt;
    const k = Math.min(1, e.life / e.max);
    e.update(k, dt);
    if (k >= 1) {
      e.done();
      lab.effects.splice(i, 1);
    }
  }
}

// ---------- 傳送門（實驗室一個、Arena 兩個） ----------
// { x, y, z, r（大細）, color, rotY }；回傳 { swirl, open, target }：target 1 = 開
function makePortal(root, live, updates, { x, y, z, r = 3.7, color = 0xd500f9, rotY = 0 }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  const metal = mat(0x263238, { metalness: 0.7, roughness: 0.3 });
  const frame = new THREE.Mesh(new THREE.TorusGeometry(r, 0.5, 10, 36), metal);
  frame.position.y = y;
  g.add(frame);
  for (const s of [-1, 1]) add(g, rbox(1.2, y, 1.2), metal, s * (r + 0.2), y / 2, 0);
  add(g, rbox(r * 2 + 2, 0.6, 2.5), metal, 0, 0.3, 0);
  const lights = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    lights.push(add(g, new THREE.SphereGeometry(0.2, 8, 6), glow(color, 1).clone(), Math.cos(a) * r, y + Math.sin(a) * r, -0.45, false));
  }
  const swirl = new THREE.Mesh(new THREE.CircleGeometry(r - 0.4, 40), new THREE.MeshBasicMaterial({ map: swirlTexture(), color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  swirl.position.set(0, y, -0.1);
  swirl.scale.setScalar(0.001);
  g.add(swirl);
  live.add(g);
  const portal = { g, swirl, open: 0, target: 0, lights, x, z };
  updates.push((dt, time) => {
    portal.open += (portal.target - portal.open) * Math.min(1, dt * 2.5);
    swirl.scale.setScalar(Math.max(0.001, portal.open));
    swirl.rotation.z = time * 2.5;
    swirl.visible = portal.open > 0.01;
    lights.forEach((l, i) => (l.material.emissiveIntensity = portal.open > 0.1 ? 1.5 + Math.sin(time * 8 + i) * 1.5 : 0.4));
  });
  void root;
  return portal;
}

// ---------- 圓形 Boss Arena（小朋友：好未來感、圓形） ----------
// 浮喺天空嘅圓形平台：金屬地板 + 霓虹圈、圓形力場牆、霓虹柱、全息屏幕、玻璃試管、頂上光環
function buildArena(root, live, updates) {
  const { x: cx, z: cz, r } = ARENA;
  const dark = mat(0x2a3448, { metalness: 0.6, roughness: 0.35 });
  const neonC = glow(CYAN, 2.2);
  const neonM = glow(MAGENTA, 2.2);
  const H = 9;
  // 外圍深色大平台（似太空站）+ 圓形地板
  add(root, cyl(r + 16, 1.2, 64), mat(0x0f1520, { metalness: 0.7, roughness: 0.4 }), cx, -0.62, cz, false);
  add(root, cyl(r + 0.8, 0.2, 64), techFloor(r / 3, r / 3), cx, -0.09, cz, false);
  // 地上霓虹圈 + 由中間射出去嘅光線
  const rings = [];
  const k = r / 26; // 地上嘅圈跟 Arena 大細
  [[6 * k, MAGENTA], [12 * k, CYAN], [18.5 * k, MAGENTA], [(r - 1.4), CYAN]].forEach(([rr, c]) => {
    const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2, side: THREE.DoubleSide });
    const ring = add(live, new THREE.RingGeometry(rr - 0.16, rr + 0.16, 96), m, cx, 0.03, cz, false);
    ring.rotation.x = -Math.PI / 2;
    rings.push({ m, rr });
  });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const seg = add(root, box(0.14, 0.05, 6 * k), i % 2 ? neonC : neonM, cx + Math.cos(a) * r * 0.585, 0.03, cz + Math.sin(a) * r * 0.585, false);
    seg.rotation.y = -a + Math.PI / 2;
  }
  // 圓形力場牆（透明六角格仔，會流動）+ 底座 + 頂部霓虹圈
  const hexMat = new THREE.MeshBasicMaterial({
    map: hexTexture((2 * Math.PI * r) / 6, H / 6), color: 0x66f2ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  add(live, new THREE.CylinderGeometry(r + 0.6, r + 0.6, H - 1.4, 72, 1, true), hexMat, cx, 1.4 + (H - 1.4) / 2, cz, false);
  add(root, new THREE.CylinderGeometry(r + 0.6, r + 0.6, 1.4, 72, 1, true), mat(0x2a3448, { metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide }), cx, 0.7, cz);
  for (const [y, m, t] of [[1.45, neonC, 0.14], [H, neonM, 0.18]]) {
    const ring = add(root, new THREE.TorusGeometry(r + 0.6, t, 8, 128), m, cx, y, cz, false);
    ring.rotation.x = Math.PI / 2;
  }
  // 霓虹柱 + 柱頂光球（避開兩個傳送門）
  const orbs = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
    const px = cx + Math.cos(a) * (r + 1.3);
    const pz = cz + Math.sin(a) * (r + 1.3);
    add(root, box(1.2, H + 1.5, 1.2), dark, px, (H + 1.5) / 2, pz).rotation.y = -a;
    add(root, box(0.25, H, 1.25), i % 2 ? neonC : neonM, cx + Math.cos(a) * (r + 0.65), H / 2 + 0.5, cz + Math.sin(a) * (r + 0.65), false).rotation.y = -a;
    orbs.push(add(live, new THREE.SphereGeometry(0.45, 12, 8), glow(i % 2 ? CYAN : MAGENTA, 3).clone(), px, H + 2.1, pz, false));
  }
  // 全息屏幕（向住中間）
  const holos = [];
  [[200, 'BOSS ARENA', '⚠️ DANGER LEVEL: MAX'], [340, 'SOLAR CAPSULES', '☀️ x4 READY'], [20, 'MUTATION', '🧬 ▓▓▓▓▓▓▓ 99%'], [160, 'ARENA SHIELD', '🛡️ ONLINE']].forEach(([deg, t1, t2], i) => {
    const a = (deg * Math.PI) / 180;
    const m = holoPanel([{ text: t1, size: 58, color: '#e0f7fa' }, { text: t2, size: 40, color: '#76ff03' }], 6, 2.8, i % 2 ? '#ea00ff' : '#00e5ff');
    m.position.set(cx + Math.cos(a) * (r - 0.5), 6.4, cz + Math.sin(a) * (r - 0.5));
    m.lookAt(cx, 6.4, cz);
    live.add(m);
    holos.push({ m, phase: i });
  });
  // 玻璃試管（東西兩邊，貼住牆）
  const glass = new THREE.MeshStandardMaterial({ color: 0xb2ebf2, transparent: true, opacity: 0.25, roughness: 0.05 });
  [0, 180, 25, 155, 205, 335].forEach((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const x = cx + Math.cos(a) * (r - 2.2);
    const z = cz + Math.sin(a) * (r - 2.2);
    add(root, cyl(1.3, 0.6, 18), dark, x, 0.3, z);
    add(root, cyl(1.05, 4.6, 18), glow([0x76ff03, 0x00e5ff, 0xea00ff][i % 3], 0.8), x, 2.9, z);
    add(root, cyl(1.2, 5.2, 18), glass, x, 3.2, z, false);
    add(root, cyl(1.3, 0.5, 18), dark, x, 5.95, z);
    const rr = add(root, new THREE.TorusGeometry(1.25, 0.06, 6, 28), neonC, x, 0.65, z, false);
    rr.rotation.x = Math.PI / 2;
    addCollider(x, z, 1.5);
  });
  // 頂上浮喺半空嘅光環
  const halo = new THREE.Group();
  halo.position.set(cx, H + 6, cz);
  const h1 = new THREE.Mesh(new THREE.TorusGeometry(16, 0.3, 8, 72), neonC);
  h1.rotation.x = Math.PI / 2;
  const h2 = new THREE.Mesh(new THREE.TorusGeometry(11, 0.22, 8, 72), neonM);
  h2.rotation.x = Math.PI / 2;
  halo.add(h1, h2);
  for (let i = 0; i < 6; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 32), neonC);
    beam.rotation.y = (i / 6) * Math.PI;
    halo.add(beam);
  }
  live.add(halo);
  // 燈
  const l1 = new THREE.PointLight(CYAN, 16, 40, 1.4);
  l1.position.set(cx - 12, 8, cz);
  const l2 = new THREE.PointLight(MAGENTA, 16, 40, 1.4);
  l2.position.set(cx + 12, 8, cz);
  const l3 = new THREE.PointLight(0xffffff, 10, 45, 1.2);
  l3.position.set(cx, 14, cz);
  live.add(l1, l2, l3);
  lab.arenaLights = [l1, l2, l3];
  updates.push((dt, time) => {
    hexMat.map.offset.y = time * 0.05;
    hexMat.opacity = 0.38 + Math.sin(time * 2) * 0.08;
    halo.rotation.y = time * 0.15;
    h2.rotation.z = -time * 0.4;
    orbs.forEach((o, i) => (o.material.emissiveIntensity = 2 + Math.sin(time * 3 + i) * 1.5));
    rings.forEach(({ m, rr }) => (m.emissiveIntensity = 0.8 + Math.max(0, Math.sin(time * 3 - rr * 0.25)) * 2.5)); // 光圈由中間向外一圈圈閃
    holos.forEach(({ m, phase }) => (m.material.opacity = 0.8 + Math.sin(time * 9 + phase) * 0.06));
  });
}

// ---------- Hub 入面嘅秘密紅色掣（Magic Library 後面） ----------
function buildRedButton(live) {
  const g = new THREE.Group();
  g.position.set(RED_BUTTON.x, 0, RED_BUTTON.z);
  add(g, cyl(0.9, 1.0, 20), mat(0x37474f, { metalness: 0.6 }), 0, 0.5, 0);
  const ring = add(g, new THREE.TorusGeometry(0.72, 0.08, 8, 28), glow(0xffd600, 1.5).clone(), 0, 1.02, 0, false);
  ring.rotation.x = Math.PI / 2;
  const cap = add(g, new THREE.SphereGeometry(0.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xff1744, { emissive: 0xd50000, emissiveIntensity: 0.6 }), 0, 1.25, 0);
  cap.scale.y = 0.6;
  const sign = makeLabel([{ text: '🔴 DO NOT PRESS', color: '#ff5252' }], 0.9);
  sign.position.y = 2.4;
  g.add(sign);
  live.add(g);
  addCollider(RED_BUTTON.x, RED_BUTTON.z, 0.9);
  lab.button = { g, cap, ring, press: 0 };
}
export function pressButton() {
  lab.button.press = 1;
}

// ---------- Biome 6 座山後面嘅鎚仔 ----------
export function hammerModel() {
  const g = new THREE.Group();
  add(g, box(0.12, 1.0, 0.12), mat(0x8d6e63), 0, 0, 0);
  add(g, box(0.14, 0.25, 0.14), mat(0x3e2723), 0, -0.4, 0); // 手柄
  add(g, rbox(0.55, 0.3, 0.3), mat(0x90a4ae, { metalness: 0.8, roughness: 0.25 }), 0, 0.55, 0);
  add(g, box(0.57, 0.08, 0.32), mat(0xffd600, { metalness: 0.9, roughness: 0.2 }), 0, 0.55, 0);
  return g;
}
function buildHammer(live) {
  const g = new THREE.Group();
  g.position.set(HAMMER_SPOT.x, 0, HAMMER_SPOT.z);
  add(g, rbox(1.2, 0.5, 1.0), mat(0x6d6359), 0, 0.25, 0); // 石頭
  const ringM = new THREE.MeshBasicMaterial({ color: 0xffd600, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 32), ringM);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.52;
  g.add(ring);
  const tool = hammerModel();
  tool.scale.setScalar(1.3);
  tool.rotation.z = 0.3;
  g.add(tool);
  const label = makeLabel([{ text: '🔨 HAMMER', color: '#ffeb3b' }], 0.8);
  label.position.y = 2.6;
  g.add(label);
  live.add(g);
  lab.hammer = { g, tool };
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
  lab.lock.sign.draw(THEMES.dark, [
    { text: '🔒 LOCKED', size: 0.3, color: '#ffeb3b' },
    { text: 'Something is hiding behind this gate...', size: 0.15 },
    { text: 'Find the secret RED BUTTON 🔴 to open it!', size: 0.16, color: '#ff8a80' },
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
