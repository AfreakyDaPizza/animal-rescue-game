// 實驗室 Boss：Mutated Scientist Poacher（小朋友 Issue #2）
// 四隻手（兩隻普通、兩隻變異）嘅瘋狂科學家偷獵者，方塊（Roblox）風格，同 bosses.js 一樣
// 招式（每一輪都會出晒）：
//   a. 放炸彈無人機（地上有紅圈 = 炸彈跌落嚟嘅位）
//   b. 叫腐化咗嘅瀕危動物追你 30 秒，之後變灰燼
//   c. 開傳送門，生態區 Boss 出嚟追你 1 分鐘，之後返入傳送門
//   d. 用手拍你：地上紅框跟住你 3 秒（小朋友 2026-10-15），之後停低，隻手就拍落嚟
// 出完晒招佢會攰（tired）：佢會用「懶散拍」拍你企嘅位 → 帶佢隻手拍落 Solar Energy Capsule！拍中 4 次就贏
// 俾任何嘢打中：同其他 Boss 一樣彈飛你（彈去實驗室門口，唔使行返 Hub）

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { buildBossRig, animateRig } from './bosses.js';
import { buildAnimalModel } from './animalModels.js';
import { ANIMALS } from './data/animals.js';
import { walkSpeed } from './player.js';
import { state } from './state.js';
import { makeLabel } from './signs.js';
import { popup, announce } from './hud.js';
import { play } from './sound.js';
import { lab, breakCapsule, resetCapsules } from './lab.js';
import { ARENA, BOSS_HOME, BOSS_PORTAL as PORTAL, clampArena } from './labShape.js';
import {
  BOSSES, LAB_DRONES, LAB_CORRUPTED_ANIMALS, LAB_CORRUPTED_SECONDS, LAB_PORTAL_BOSSES, LAB_PORTAL_SECONDS,
  LAB_SQUASH_FOLLOW, LAB_SQUASH_WARNING, LAB_TIRED_SECONDS, LAB_CAPSULE_HITS, LAB_LIVES,
} from './data/balance.js';

const $ = (id) => document.getElementById(id);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const S = 2.1; // Boss 有幾大（普通 Boss 1.1）
const SQUASH_SIZE = 4.2; // 普通拍：紅框幾闊（米）
const LAZY_SIZE = 5.2; // 懶散拍：紅框大啲
const LAZY_WARNING = 1.0; // 懶散拍：紅框停低之後耐啲先拍（佢攰）
const SQUASH_GAP = 1.5; // 拍完一次，隔幾秒再拍
const LEAVE_RESET = 1.5; // 你離開咗 Arena（出口傳送門／心冇晒）：成場重新嚟過
// 每一輪招式幾時出（秒）
const T_DRONES = 1;
const T_ANIMALS = 8;
const T_PORTAL = 16;

// ---------- 方塊工具（同 bosses.js 一樣） ----------
const materials = new Map();
function mat(color, extra) {
  const key = color + JSON.stringify(extra || {});
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }));
  return materials.get(key);
}
function box(parent, w, h, d, color, x = 0, y = 0, z = 0, extra) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.15), color.isMaterial ? color : mat(color, extra));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function pivot(parent, x, y, z) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  parent.add(p);
  return p;
}
const GLOW = (c, k = 2.5) => ({ emissive: c, emissiveIntensity: k });

// ================= Boss 公仔 =================
// 小朋友 2026-10-15：舊款「好醜」，要似 Roblox「Steal an Egg」嘅 Dr. Scramble：
// 瘋狂科學家坐喺一部靚靚嘅機械人（mech）入面：白色實驗袍、大頭、發光護目鏡、蓬鬆白髮、紫色手套、
// 背後一個發綠光嘅藥水缸、四隻金屬機械手（有爪 + 霓虹燈），會行、會浮、會郁
const SPHERE = new THREE.SphereGeometry(1, 20, 14);
function ball(parent, r, color, x, y, z, extra, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(SPHERE, color.isMaterial ? color : mat(color, extra));
  m.scale.set(r * sx, r * sy, r * sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function soft(parent, w, h, d, color, x, y, z, extra, round = 0.3) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(w, h, d) * round), color.isMaterial ? color : mat(color, extra));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function tube(parent, r, h, color, x, y, z, extra, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), color.isMaterial ? color : mat(color, extra));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
const CHROME = { metalness: 0.35, roughness: 0.3 }; // 冇環境反光，太金屬會變黑
const NEON_C = 0x00e5ff;
const NEON_M = 0xea00ff;

function buildScientist() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const SILVER = 0xdfe6ec;
  const DARK = 0x2b3445;
  const SKIN = 0xd7f0b8; // 少少綠（俾藥水變異咗），但係可愛
  const COAT = 0xffffff;

  // ---- 機械腳（會行）----
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.55, 1.25, 0);
    ball(hip, 0.26, DARK, 0, 0, 0, CHROME);
    tube(hip, 0.17, 0.55, SILVER, 0, -0.3, 0, CHROME);
    ball(hip, 0.2, NEON_C, 0, -0.62, 0, GLOW(NEON_C, 2.5)); // 發光膝頭
    soft(hip, 0.42, 0.5, 0.42, DARK, 0, -0.92, 0, CHROME);
    soft(hip, 0.6, 0.22, 0.85, SILVER, 0, -1.16, -0.1, CHROME, 0.45); // 大腳板
    soft(hip, 0.62, 0.05, 0.1, NEON_C, 0, -1.1, -0.53, GLOW(NEON_C, 2.5));
    return hip;
  });
  // ---- 機械人身（駕駛艙）：銀色圓潤 + 霓虹邊 ----
  soft(root, 1.25, 0.35, 0.9, DARK, 0, 1.35, 0, CHROME, 0.4); // 腰
  const torso = soft(root, 1.9, 1.15, 1.35, SILVER, 0, 1.95, 0, CHROME, 0.38);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.045, 8, 48), mat(NEON_C, GLOW(NEON_C, 3)));
  trim.rotation.x = Math.PI / 2;
  trim.scale.set(1, 0.72, 1);
  trim.position.y = 2.45;
  root.add(trim);
  // 前面：圓形發光標誌（原子）+ 兩粒大燈
  const emblem = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 32), mat(NEON_M, GLOW(NEON_M, 3)));
  emblem.position.set(0, 1.85, -0.69);
  root.add(emblem);
  ball(root, 0.08, 0xffffff, 0, 1.85, -0.7, GLOW(0xffffff, 3));
  for (const s of [-1, 1]) {
    ball(root, 0.13, 0xfff59d, s * 0.6, 1.7, -0.62, GLOW(0xffee58, 3), 1, 1, 0.5);
    soft(root, 0.08, 0.6, 0.06, NEON_C, s * 0.93, 1.95, -0.3, GLOW(NEON_C, 2.5));
  }
  // ---- 科學家（坐喺駕駛艙，上半身露出嚟）----
  const coat = soft(root, 1.15, 0.85, 0.8, COAT, 0, 2.75, 0.05, undefined, 0.35);
  for (const s of [-1, 1]) {
    const lapel = soft(root, 0.28, 0.6, 0.06, 0xeeeeee, s * 0.2, 2.85, -0.36, undefined, 0.4); // 衫領
    lapel.rotation.z = s * 0.35;
  }
  soft(root, 0.14, 0.42, 0.05, 0x7b1fa2, 0, 2.78, -0.37); // 紫色呔
  soft(root, 0.2, 0.16, 0.04, 0x90caf9, 0.32, 2.62, -0.38); // 心口袋
  for (let i = 0; i < 2; i++) tube(root, 0.025, 0.2, [0xff5252, 0x40c4ff][i], 0.27 + i * 0.08, 2.72, -0.39, undefined, 6); // 筆
  // 自己兩隻手（紫色手套）揸住控制桿
  for (const s of [-1, 1]) {
    const arm = pivot(root, s * 0.62, 2.95, 0);
    const sleeve = tube(arm, 0.14, 0.55, COAT, 0, -0.22, -0.12);
    sleeve.rotation.x = 0.6;
    ball(arm, 0.15, 0x8e24aa, 0, -0.45, -0.32); // 紫色手套
    tube(arm, 0.035, 0.35, DARK, 0, -0.55, -0.32, CHROME, 8);
    ball(arm, 0.07, 0xff1744, 0, -0.38, -0.32, GLOW(0xff1744, 2.5)); // 控制桿紅掣
  }
  // ---- 大頭 ----
  const head = pivot(root, 0, 3.55, 0);
  soft(head, 1.05, 1.0, 0.95, SKIN, 0, 0, 0, undefined, 0.42);
  ball(head, 0.17, 0xc5e1a5, 0, -0.08, -0.5); // 大鼻
  for (const s of [-1, 1]) ball(head, 0.13, 0xc5e1a5, s * 0.55, 0, 0); // 耳仔
  // 奸笑大口 + 牙
  soft(head, 0.5, 0.14, 0.06, 0x4e342e, 0, -0.3, -0.47, undefined, 0.45);
  for (let i = 0; i < 4; i++) soft(head, 0.1, 0.07, 0.03, 0xffffff, -0.15 + i * 0.1, -0.26, -0.5, undefined, 0.2);
  // 護目鏡：金色厚框 + 發光鏡片 + 黑色帶
  soft(head, 1.1, 0.16, 1.0, 0x263238, 0, 0.18, 0, undefined, 0.4);
  const lenses = [-1, 1].map((s) => {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.065, 10, 24), mat(0xffb300, CHROME));
    rim.position.set(s * 0.24, 0.18, -0.52);
    head.add(rim);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshStandardMaterial({ color: 0xb9f6ca, ...GLOW(0x69f0ae, 3) }));
    lens.position.set(s * 0.24, 0.18, -0.535);
    lens.rotation.y = Math.PI;
    head.add(lens);
    ball(head, 0.05, 0xffffff, s * 0.24 + 0.07, 0.25, -0.55, GLOW(0xffffff, 2)); // 反光
    const brow = soft(head, 0.32, 0.09, 0.08, 0xffffff, s * 0.25, 0.43, -0.48, undefined, 0.45); // 白色粗眉
    brow.rotation.z = s * 0.35;
    return lens;
  });
  // 蓬鬆白髮（一舊舊雲咁）
  const hairMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.9 });
  for (const [x, y, z, r] of [[0, 0.55, 0.15, 0.32], [-0.38, 0.48, 0.1, 0.27], [0.38, 0.48, 0.1, 0.27], [-0.58, 0.18, 0.15, 0.24], [0.58, 0.18, 0.15, 0.24], [-0.22, 0.45, 0.42, 0.26], [0.22, 0.45, 0.42, 0.26], [0, 0.28, 0.5, 0.28], [-0.62, 0.45, 0.3, 0.17], [0.62, 0.45, 0.3, 0.17]]) {
    ball(head, r, hairMat, x, y, z);
  }
  // ---- 背後：發綠光嘅藥水缸（啵啵聲）+ 喉管 ----
  const tankGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.3, 20), new THREE.MeshStandardMaterial({ color: 0xccff90, transparent: true, opacity: 0.35, roughness: 0.05 }));
  tankGlass.position.set(0, 2.55, 0.95);
  root.add(tankGlass);
  const tank = tube(root, 0.36, 1.15, 0x76ff03, 0, 2.5, 0.95, { ...GLOW(0x64dd17, 1.6), transparent: true, opacity: 0.9 });
  for (const y of [1.88, 3.22]) tube(root, 0.46, 0.14, SILVER, 0, y, 0.95, CHROME);
  ball(root, 0.12, NEON_C, 0, 3.35, 0.95, GLOW(NEON_C, 3));
  const vials = [];
  for (let i = 0; i < 3; i++) vials.push(ball(root, 0.09, 0xe8f5e9, (i - 1) * 0.15, 2, 0.95, GLOW(0xccff90, 2)));
  // ---- 四個機械膊頭（上兩個、下兩個）----
  const shoulders = [
    pivot(root, -1.05, 2.25, 0.05), pivot(root, 1.05, 2.25, 0.05),
    pivot(root, -1.0, 1.65, 0.1), pivot(root, 1.0, 1.65, 0.1),
  ];
  shoulders.forEach((sh, i) => {
    ball(sh, 0.3, DARK, 0, 0, 0, CHROME);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 24), mat(i < 2 ? NEON_C : NEON_M, GLOW(i < 2 ? NEON_C : NEON_M, 3)));
    ring.rotation.y = Math.PI / 2;
    sh.add(ring);
  });

  // ---- 受傷樣（每拍中一次 Capsule 多一層）----
  const damage = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
  damage.forEach((d) => {
    d.visible = false;
    root.add(d);
  });
  const SOOT = 0x37474f;
  // 第 1 層：護目鏡裂、機身燶黑
  for (const s of [-1, 1]) soft(damage[0], 0.04, 0.34, 0.02, 0x111111, s * 0.24, 3.73, -0.56).rotation.z = 0.6 * s;
  for (const [x, y] of [[-0.5, 2.1], [0.55, 1.75], [0.2, 2.25]]) ball(damage[0], 0.15, SOOT, x, y, -0.66, undefined, 1, 1, 0.3);
  // 第 2 層：頭紮繃帶、藥水缸冒煙、袍燶咗
  soft(damage[1], 1.08, 0.18, 1.0, 0xfffde7, 0, 3.92, 0, undefined, 0.4);
  soft(damage[1], 0.16, 0.16, 0.05, 0xef9a9a, 0.3, 3.92, -0.5);
  for (const [x, y] of [[-0.35, 2.9], [0.3, 2.5]]) ball(damage[1], 0.12, SOOT, x, y, -0.4, undefined, 1, 1, 0.3);
  const smoke = [];
  for (let i = 0; i < 4; i++) {
    const p = soft(damage[1], 0.4, 0.4, 0.4, 0x616161, 0, 3.4, 0.95, { transparent: true, opacity: 0.7 });
    p.material = p.material.clone();
    p.castShadow = false;
    smoke.push(p);
  }
  // 第 3 層：電火花、機身凹咗
  for (const [x, y, z] of [[0.75, 2.3, -0.5], [-0.8, 1.9, -0.4], [0, 2.9, 1.2]]) ball(damage[2], 0.08, 0xffeb3b, x, y, z, GLOW(0xffea00, 4));
  for (const [x, y] of [[0.35, 1.6], [-0.3, 2.3]]) ball(damage[2], 0.2, 0x212121, x, y, -0.68, undefined, 1, 1, 0.25);

  // 暈咗嘅星星
  const stars = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshBasicMaterial({ color: 0xffeb3b }));
    const a = (i / 6) * Math.PI * 2;
    st.position.set(Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8);
    stars.add(st);
  }
  stars.position.y = 4.4;
  stars.visible = false;
  root.add(stars);

  g.scale.setScalar(S * 0.95);
  return { g, root, legs, arms: [shoulders[0], shoulders[1]], head, torso, shoulders, lenses, damage, stars, hairMat, tank, vials, smoke };
}

// ---------- 四隻機械手（喺世界度畫，可以伸到好長） ----------
const SEG = new THREE.CylinderGeometry(1, 1, 1, 14).rotateX(Math.PI / 2).translate(0, 0, 0.5); // 由起點向 +z 伸 1 米
function buildArm(scene, i) {
  const mutant = i >= 2;
  const neon = mutant ? NEON_M : NEON_C;
  const thick = (mutant ? 0.3 : 0.26) * S;
  const upper = new THREE.Mesh(SEG, mat(0xcfd8dc, CHROME));
  const lower = new THREE.Mesh(SEG, mat(0x90a4ae, CHROME));
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(thick * 1.25, 14, 10), mat(neon, GLOW(neon, 2.5)));
  for (const m of [upper, lower, elbow]) {
    m.castShadow = true;
    scene.add(m);
  }
  // 機械爪：手腕 + 掌 + 3 隻彎爪（爪尖發光）
  const hand = new THREE.Group();
  tube(hand, 0.32, 0.35, 0x37474f, 0, 0.35, 0, CHROME);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.05, 8, 24), mat(neon, GLOW(neon, 3)));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  hand.add(ring);
  soft(hand, 0.9, 0.35, 0.9, 0xdfe6ec, 0, 0.05, 0, CHROME, 0.4);
  for (let f = 0; f < 3; f++) {
    const a = (f / 3) * Math.PI * 2;
    const claw = new THREE.Group();
    claw.position.set(Math.sin(a) * 0.38, -0.1, Math.cos(a) * 0.38);
    claw.rotation.y = a;
    const c1 = soft(claw, 0.16, 0.42, 0.16, 0x546e7a, 0, -0.2, 0, CHROME, 0.45);
    c1.rotation.x = 0.35;
    const c2 = soft(claw, 0.13, 0.32, 0.13, 0x37474f, 0, -0.48, -0.12, CHROME, 0.45);
    c2.rotation.x = -0.4;
    ball(claw, 0.07, neon, 0, -0.64, -0.2, GLOW(neon, 3));
    hand.add(claw);
  }
  hand.scale.setScalar(S * 0.72);
  scene.add(hand);
  return { i, mutant, thick, upper, lower, elbow, hand, pos: V(), busy: false, limp: false };
}

function placeSegment(mesh, a, b, thick) {
  mesh.position.copy(a);
  mesh.lookAt(b);
  mesh.scale.set(thick, thick, Math.max(0.01, a.distanceTo(b)));
}

// ================= 建立成場戰鬥 =================
export function createLabFight(scene) {
  const rig = buildScientist();
  const group = new THREE.Group();
  group.add(rig.g);
  group.position.set(BOSS_HOME.x, 0, BOSS_HOME.z);
  scene.add(group);
  const label = makeLabel([{ text: '🧪 MUTATED SCIENTIST POACHER', color: '#ea80fc' }, { text: 'Sleeping... 💤', color: '#b3e5fc' }], 1.5);
  label.position.y = 9.6;
  group.add(label);
  const arms = [0, 1, 2, 3].map((i) => buildArm(scene, i));
  const fx = new THREE.Group(); // 炸彈、紅框、灰燼、星星等效果
  scene.add(fx);
  const fight = {
    scene, rig, group, label, arms, fx,
    phase: state.labBossDefeated ? 'gone' : 'sleep', // sleep → wake → attack → tired → hurt → (attack …) → defeated
    t: 0, round: 0, hp: LAB_CAPSULE_HITS, runPhase: 0,
    drones: [], bombs: [], animals: [], portalBosses: [], slams: [], effects: [],
    nextSquash: 0, nextLazy: 0, events: new Set(), onDefeat: null, hitInfo: null,
    clock: 0, pending: [], away: 0, timeScale: 1, lives: LAB_LIVES, // clock：一直行嘅時鐘（傳送門 Boss 排隊出嚟用）；away：你喺實驗室外面幾耐
  };
  if (fight.phase === 'gone') hideBoss(fight);
  return fight;
}

function hideBoss(fight) {
  fight.group.visible = false;
  for (const a of fight.arms) for (const m of [a.upper, a.lower, a.elbow, a.hand]) m.visible = false;
}

// ---------- 每格畫面 ----------
// player：{ x, z, feetY, inside（喺實驗室入面）, safe（啱啱俾人打中，幾秒內唔會再中） }
// 回傳：打中你嘅嘢嘅名（冇就 null）
export function updateLabFight(fight, dt, time, player) {
  if (fight.phase === 'gone') {
    showBar(null);
    return null;
  }
  fight.hitInfo = null;
  dt *= fight.timeScale; // 測試用：快轉
  fight.playerInside = player.inside;
  fight.t += dt;
  fight.clock += dt;
  const P = player;
  const pos = fight.group.position;

  // 你離開咗 Arena：收晒招、成場重新嚟過（返嚟可以再挑戰）
  fight.away = P.inside ? 0 : fight.away + dt;
  if (fight.away > LEAVE_RESET && ['wake', 'attack', 'tired', 'hurt'].includes(fight.phase)) {
    resetFight(fight);
    return null;
  }
  updateBossLabel(fight);

  // ---- 狀態機 ----
  if (fight.phase === 'sleep') {
    if (P.inside) {
      setPhase(fight, 'wake');
      fight.lives = LAB_LIVES;
    }
  } else if (fight.phase === 'wake') {
    if (once(fight, 'wake')) {
      play('roar');
      announce('🧪 The MUTATED SCIENTIST POACHER woke up!');
      setTimeout(() => popup('Dodge! Red boxes follow you for 3 seconds, then his hand slams down!'), 1600);
    }
    if (fight.t > 3) startRound(fight, fight.round);
  } else if (fight.phase === 'attack') {
    updateAttackRound(fight, P);
  } else if (fight.phase === 'tired') {
    updateTired(fight, dt, P);
  } else if (fight.phase === 'hurt') {
    if (fight.t > 3.2) {
      if (fight.hp <= 0) setPhase(fight, 'defeated');
      else startRound(fight, fight.round + 1);
    }
  } else if (fight.phase === 'defeated') {
    if (once(fight, 'defeated')) {
      play('tierUp');
      clearMinions(fight);
      fight.onDefeat?.();
    }
  }

  // ---- Boss 身：望住你、呼吸、手腳 ----
  const tired = fight.phase === 'tired';
  if (fight.phase !== 'defeated' && fight.phase !== 'sleep') {
    const want = Math.atan2(-(P.x - pos.x), -(P.z - pos.z));
    let diff = want - fight.group.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    fight.group.rotation.y += diff * Math.min(1, dt * (tired ? 1.5 : 3));
  }
  const r = fight.rig;
  let moving = 0;
  if (tired && P.inside) {
    // 攰攰哋咁行埋嚟（帶佢去 Capsule 度！）
    const dx = P.x - pos.x;
    const dz = P.z - pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 7) {
      const step = Math.min(d - 7, 2.6 * dt);
      pos.x += (dx / d) * step;
      pos.z += (dz / d) * step;
      moving = 0.4;
    }
  } else if (fight.phase === 'attack' && P.inside) {
    // 小朋友 2026-10-15：Boss 要喺場入面行嚟行去：每幾秒揀一個新位（喺你附近 9–13 米），慢慢行過去
    const summoning = (fight.t > T_ANIMALS - 0.8 && fight.t < T_ANIMALS + 1.2) || (fight.t > T_PORTAL - 0.5 && fight.t < T_PORTAL + 2);
    fight.roamTimer = (fight.roamTimer ?? 0) - dt;
    if (!fight.roam || fight.roamTimer <= 0) {
      const a = Math.random() * Math.PI * 2;
      const d = 9 + Math.random() * 4;
      fight.roam = clampArena(V(P.x + Math.cos(a) * d, 0, P.z + Math.sin(a) * d), 6);
      fight.roamTimer = 3.5 + Math.random() * 2.5;
    }
    const dx = fight.roam.x - pos.x;
    const dz = fight.roam.z - pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.4 && !summoning) {
      const step = Math.min(d, 5.5 * dt);
      pos.x += (dx / d) * step;
      pos.z += (dz / d) * step;
      moving = 1;
    }
  }
  clampArena(pos, 5);
  fight.runPhase += dt * (4 + 6 * moving);
  const swing = Math.sin(fight.runPhase) * 0.6 * moving;
  r.legs[0].rotation.x = swing;
  r.legs[1].rotation.x = -swing;
  r.torso.scale.y = 1 + Math.sin(time * (tired ? 6 : 2)) * (tired ? 0.05 : 0.015); // 攰：大力抖氣
  r.head.rotation.x = tired ? 0.35 + Math.sin(time * 6) * 0.06 : Math.sin(time * 1.3) * 0.05;
  r.head.rotation.z = fight.phase === 'wake' ? Math.sin(time * 18) * 0.15 : 0;
  r.root.position.y = fight.phase === 'wake' ? Math.abs(Math.sin(time * 10)) * 0.15 : Math.abs(Math.sin(fight.runPhase)) * 0.08 * moving;
  r.root.rotation.x = fight.phase === 'defeated' ? r.root.rotation.x : -0.08 * moving; // 行嗰陣向前傾少少
  r.shoulders.forEach((sh, i) => (sh.rotation.z = Math.sin(time * 3 + i) * 0.2));
  r.vials.forEach((v, i) => (v.material.emissiveIntensity = 1.5 + Math.sin(time * 5 + i) * 1));
  // 受傷冒煙（第 2 層）
  r.smoke.forEach((p, i) => {
    const k = (time * 0.6 + i / 4) % 1;
    p.position.set(Math.sin(k * 5 + i) * 0.3, 2.8 + k * 2.2, 0.7 + k * 0.5);
    p.scale.setScalar(0.6 + k * 1.4);
    p.material.opacity = 0.7 * (1 - k);
  });
  // 攰咗：Capsule 頭頂有跳下跳下嘅黃色大箭咀
  updateCapsuleArrows(fight, time);
  r.lenses.forEach((l) => (l.material.emissiveIntensity = tired ? 0.8 : 3 + Math.sin(time * 7) * 0.8));
  if (fight.phase === 'hurt') {
    r.stars.visible = true;
    r.stars.rotation.y = time * 5;
    r.root.rotation.z = Math.sin(time * 9) * 0.12;
  } else if (fight.phase !== 'defeated') {
    r.stars.visible = false;
    r.root.rotation.z = 0;
  }
  if (fight.phase === 'defeated') {
    r.stars.visible = true;
    r.stars.rotation.y = time * 4;
    r.root.rotation.x += (-Math.PI / 2 + 0.05 - r.root.rotation.x) * Math.min(1, dt * 3); // 向後瞓低
    r.root.position.y += (0.6 - r.root.position.y) * Math.min(1, dt * 3);
  }

  // ---- 四隻手 ----
  updateArms(fight, dt, time, P);
  // ---- 招式 ----
  updateDrones(fight, dt, time, P);
  updateBombs(fight, dt, P);
  updateCorrupted(fight, dt, time, P);
  updatePortalBosses(fight, dt, time, P);
  updateSlams(fight, dt, time, P);
  updateEffects(fight, dt);

  showBar(fight);
  return P.safe ? null : fight.hitInfo;
}

const once = (fight, key) => !fight.events.has(key) && fight.events.add(key);
function setPhase(fight, phase) {
  fight.phase = phase;
  fight.t = 0;
  fight.events.clear();
}

// 俾嘢打中（招式叫）：記低係乜（main.js 處理彈飛）
function hit(fight, P, what) {
  if (!P.safe && !fight.hitInfo) fight.hitInfo = what;
}

// ================= 一輪攻擊 =================
function startRound(fight, round) {
  const again = fight.phase !== 'wake';
  fight.round = round;
  setPhase(fight, 'attack');
  fight.nextSquash = 3;
  if (again) {
    announce('😡 He caught his breath... here he comes again!');
    play('roar');
  }
}

function updateAttackRound(fight, P) {
  const t = fight.t;
  if (t >= T_DRONES && once(fight, 'drones')) launchDrones(fight, LAB_DRONES + fight.round);
  if (t >= T_ANIMALS && once(fight, 'animals')) summonCorrupted(fight, LAB_CORRUPTED_ANIMALS);
  if (t >= T_PORTAL && once(fight, 'portal')) openPortal(fight);
  // 招式 d：用手拍（出其他招嗰陣都會拍）
  if (t >= fight.nextSquash && P.inside && !fight.slams.length) startSlam(fight, P, false);
  // 出晒招、啲手下走晒 → 佢攰咗
  const busy = fight.drones.length || fight.bombs.length || fight.animals.length || fight.portalBosses.length || fight.pending.length || lab.bossPortal.target > 0;
  if (t > T_PORTAL + 3 && !busy && !fight.slams.length) {
    setPhase(fight, 'tired');
    fight.nextLazy = 1.5;
    announce('😮‍💨 He is TIRED! Lead his lazy slam onto a ☀️ Solar Energy Capsule!');
    play('yawn');
    setTimeout(() => popup('The red box follows you: lead it next to a glowing capsule, then RUN when it stops!'), 2500);
  }
}

// 「懶散拍」：攰咗嗰陣，拍你企嘅位；拍中 Capsule 佢就受傷
function updateTired(fight, dt, P) {
  for (const c of lab.capsules) {
    if (c.used) continue;
    c.label.userData.setLines([{ text: '⬇ LEAD HIS HAND HERE ⬇', color: '#ffeb3b' }, { text: '☀️ SOLAR ENERGY CAPSULE', color: '#ffe082' }]);
  }
  if (fight.t >= fight.nextLazy && P.inside && !fight.slams.length) startSlam(fight, P, true);
  if (fight.t > LAB_TIRED_SECONDS && !fight.slams.length) {
    resetCapsuleLabels();
    startRound(fight, fight.round + 1);
  }
}
function resetCapsuleLabels() {
  for (const c of lab.capsules) if (!c.used) c.label.userData.setLines([{ text: '☀️ SOLAR ENERGY CAPSULE', color: '#ffe082' }]);
}

// 拍中 Capsule！
function capsuleHit(fight, capsule) {
  breakCapsule(capsule);
  fight.hp -= 1;
  resetCapsuleLabels();
  fight.slams.forEach((s) => s.box && (s.box.visible = false));
  play('solar');
  play('ouch');
  burst(fight, V(capsule.x, 2, capsule.z), 0xffd740, 60, 9);
  burst(fight, V(capsule.x, 2, capsule.z), 0xffffff, 25, 6);
  // 受傷樣：每拍中一次多一層
  const hits = LAB_CAPSULE_HITS - fight.hp;
  fight.rig.damage.forEach((d, i) => (d.visible = hits >= i + 1));
  if (hits >= 2) fight.rig.hairMat.color.set(0x757575); // 頭髮燶咗
  if (hits >= 3) fight.arms[3].limp = true; // 一隻變異手冇力
  if (fight.hp > 0) {
    announce(`☀️ SOLAR BLAST! He got hurt! ${fight.hp} more to go!`);
    setPhase(fight, 'hurt');
  } else {
    announce('☀️☀️ FINAL SOLAR BLAST! The Mutated Scientist Poacher is DEFEATED! 🎉');
    setPhase(fight, 'hurt');
  }
}

// 攰咗嗰陣：每個未用嘅 Capsule 頭頂一個黃色箭咀
function updateCapsuleArrows(fight, time) {
  if (!fight.capArrows) {
    const m = new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffc400, emissiveIntensity: 2 });
    fight.capArrows = lab.capsules.map((c) => {
      const g = new THREE.Group();
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.9, 4), m);
      head.rotation.x = Math.PI;
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), m);
      shaft.position.y = 0.8;
      g.add(head, shaft);
      g.position.set(c.x, 6, c.z);
      fight.scene.add(g);
      return { g, c };
    });
  }
  for (const { g, c } of fight.capArrows) {
    g.visible = fight.phase === 'tired' && !c.used && fight.playerInside;
    g.position.y = 5.6 + Math.sin(time * 4 + c.x) * 0.35;
    g.rotation.y = time * 2;
  }
}

// ================= 手：休息位 + 拍 =================
const tmpA = V();
const tmpB = V();
const tmpE = V();
function restPos(fight, arm, time, out) {
  const raise = fight.phase === 'attack' && fight.t > T_ANIMALS - 0.8 && fight.t < T_ANIMALS + 1.2 ? 1 // 叫動物：舉高手
    : fight.phase === 'attack' && fight.t > T_PORTAL - 0.5 && fight.t < T_PORTAL + 2 ? 1 : 0;
  const side = arm.i % 2 ? 1 : -1;
  const lowerArm = arm.mutant;
  const wig = Math.sin(time * 2 + arm.i * 1.7) * 0.3;
  let local;
  if (fight.phase === 'defeated') local = V(side * 3.5, 0.6, lowerArm ? 1.5 : -0.5);
  else if (arm.limp) local = V(side * 2.4, 0.8, -0.3);
  else if (fight.phase === 'tired') local = V(side * 2.6, lowerArm ? 0.9 : 1.6, -1.2 + wig * 0.2); // 攰：手拖地
  else if (raise) local = V(side * 2.6, lowerArm ? 6.5 : 8.5, -0.5 + wig);
  else local = V(side * (lowerArm ? 4.4 : 3.8), (lowerArm ? 3.0 : 6.2) + wig, lowerArm ? -0.6 : 0.2); // 兩邊張開，唔好遮住塊面
  out.copy(local).applyAxisAngle(V(0, 1, 0), fight.group.rotation.y).add(fight.group.position);
  return out;
}

function updateArms(fight, dt, time, P) {
  fight.group.updateMatrixWorld(true);
  for (const arm of fight.arms) {
    const slam = fight.slams.find((s) => s.arm === arm);
    let target;
    if (slam) target = slam.handTarget;
    else target = restPos(fight, arm, time, tmpB);
    if (!arm.ready) {
      arm.pos.copy(target);
      arm.ready = true;
    }
    if (slam) arm.pos.copy(target);
    else arm.pos.lerp(target, Math.min(1, dt * 5));
    const shoulder = fight.rig.shoulders[arm.i].getWorldPosition(tmpA);
    // 手肘：中間再高少少（似人手咁屈）
    const d = shoulder.distanceTo(arm.pos);
    tmpE.lerpVectors(shoulder, arm.pos, 0.5);
    tmpE.y += Math.min(3.5, d * 0.3);
    const side = arm.i % 2 ? 1 : -1;
    tmpE.add(V(side * Math.min(2, d * 0.15), 0, 0).applyAxisAngle(V(0, 1, 0), fight.group.rotation.y));
    placeSegment(arm.upper, shoulder, tmpE, arm.thick);
    placeSegment(arm.lower, tmpE, arm.pos, arm.thick * 0.9);
    arm.elbow.position.copy(tmpE);
    arm.hand.position.copy(arm.pos);
    arm.hand.rotation.set(0, fight.group.rotation.y, 0);
  }
}

// 開始拍：紅框喺你企嘅位閃，之後隻手拍落嚟
function startSlam(fight, P, lazy) {
  const free = fight.arms.filter((a) => !a.limp && !fight.slams.some((s) => s.arm === a));
  if (!free.length) return false;
  // 揀近你嗰邊嘅手
  free.sort((a, b) => a.pos.distanceTo(V(P.x, 0, P.z)) - b.pos.distanceTo(V(P.x, 0, P.z)));
  const arm = free[0];
  const size = lazy ? LAZY_SIZE : SQUASH_SIZE;
  const { x, z } = clampArena(V(P.x, 0, P.z), size / 2);
  const box = warningBox(size);
  box.position.set(x, 0.06, z);
  fight.fx.add(box);
  fight.slams.push({
    arm, lazy, x, z, size, box, t: 0, follow: LAB_SQUASH_FOLLOW, warn: LAB_SQUASH_FOLLOW + (lazy ? LAZY_WARNING : LAB_SQUASH_WARNING),
    drop: lazy ? 0.45 : 0.16, hold: lazy ? 1.3 : 0.5, from: arm.pos.clone(), handTarget: arm.pos.clone(), landed: false,
  });
  play(lazy ? 'yawn' : 'swoosh');
  return true;
}

// 閃紅光嘅框（地上）
function warningBox(size) {
  const g = new THREE.Group();
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.3, depthWrite: false }));
  fill.rotation.x = -Math.PI / 2;
  g.add(fill);
  const edge = new THREE.MeshBasicMaterial({ color: 0xff1744 });
  for (const [w, d, x, z] of [[size, 0.25, 0, -size / 2], [size, 0.25, 0, size / 2], [0.25, size, -size / 2, 0], [0.25, size, size / 2, 0]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), edge);
    b.position.set(x, 0.03, z);
    g.add(b);
  }
  g.userData.fill = fill;
  g.userData.edge = edge;
  return g;
}

function updateSlams(fight, dt, time, P) {
  for (let i = fight.slams.length - 1; i >= 0; i--) {
    const s = fight.slams[i];
    s.t += dt;
    // 頭 3 秒：紅框跟住你行（小朋友 2026-10-15）；之後停低，隻手拍落嚟
    if (s.t < s.follow && P.inside) {
      const k = Math.min(1, dt * 7);
      const want = clampArena(V(P.x, 0, P.z), s.size / 2);
      s.x += (want.x - s.x) * k;
      s.z += (want.z - s.z) * k;
      s.box.position.set(s.x, 0.06, s.z);
    } else if (!s.locked) {
      s.locked = true;
      play('blip');
    }
    const above = V(s.x, s.lazy ? 6 : 7.5, s.z);
    const ground = V(s.x, 1.05, s.z); // 爪尖啱啱掂地
    if (s.t < s.warn) {
      // 隻手飛去紅框上面（跟住紅框），停低之後震下震下
      const k = Math.min(1, s.t / 1.2);
      s.handTarget.lerpVectors(s.from, above, k * k * (3 - 2 * k));
      if (s.locked) s.handTarget.add(V(Math.sin(time * 30) * 0.1, 0, 0));
      const blink = Math.sin(time * (s.locked ? 40 : 14)) > 0;
      s.box.userData.fill.material.opacity = blink ? 0.45 : 0.15;
      s.box.userData.edge.color.set(blink ? 0xff1744 : 0xffeb3b);
    } else if (s.t < s.warn + s.drop) {
      const k = (s.t - s.warn) / s.drop;
      s.handTarget.lerpVectors(above, ground, k * k);
    } else if (!s.landed) {
      s.landed = true;
      s.handTarget.copy(ground);
      s.box.visible = false;
      play('slam');
      shockwave(fight, s.x, s.z, s.size);
      // 打中你？（喺紅框入面、冇跳到好高）
      const half = s.size / 2 + 0.3;
      if (P.inside && Math.abs(P.x - s.x) < half && Math.abs(P.z - s.z) < half && P.feetY < 2) hit(fight, P, s.lazy ? 'his lazy slam' : 'his giant hand');
      // 懶散拍：拍中 Capsule？
      if (s.lazy && fight.phase === 'tired') {
        const c = lab.capsules.find((cc) => !cc.used && Math.abs(cc.x - s.x) < s.size / 2 + 1.1 && Math.abs(cc.z - s.z) < s.size / 2 + 1.1);
        if (c) capsuleHit(fight, c);
        else popup('Missed! Stand right next to a ☀️ capsule!');
      }
    } else if (s.t < s.warn + s.drop + s.hold) {
      s.handTarget.copy(ground);
    } else {
      fight.fx.remove(s.box);
      fight.slams.splice(i, 1);
      if (s.lazy) fight.nextLazy = fight.t + SQUASH_GAP;
      else fight.nextSquash = fight.t + SQUASH_GAP;
    }
  }
}

// 拍落地：一圈塵
function shockwave(fight, x, z, size) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 1, 32), new THREE.MeshBasicMaterial({ color: 0xd7ccc8, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.1, z);
  fight.fx.add(ring);
  fight.effects.push({ obj: ring, life: 0, max: 0.6, update: (e, k) => { ring.scale.setScalar(1 + k * size); ring.material.opacity = 0.8 * (1 - k); } });
  burst(fight, V(x, 0.5, z), 0xa1887f, 16, 5);
}

// 一堆方塊向四面八方飛（爆炸、塵、閃光）
function burst(fight, at, color, n, speed) {
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: color === 0xa1887f || color === 0x9e9e9e ? 0 : 2.5, transparent: true });
  const parts = [];
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), m);
    p.position.copy(at);
    g.add(p);
    parts.push({ p, v: V().randomDirection().multiplyScalar(speed * (0.4 + Math.random() * 0.6)).add(V(0, speed * 0.5, 0)) });
  }
  fight.fx.add(g);
  fight.effects.push({ obj: g, life: 0, max: 1.2, update: (e, k, dt) => {
    for (const q of parts) {
      q.v.y -= 15 * dt;
      q.p.position.addScaledVector(q.v, dt);
      if (q.p.position.y < 0.1) {
        q.p.position.y = 0.1;
        q.v.multiplyScalar(0.5);
      }
      q.p.rotation.x += dt * 5;
    }
    m.opacity = 1 - k;
  } });
}

function updateEffects(fight, dt) {
  for (let i = fight.effects.length - 1; i >= 0; i--) {
    const e = fight.effects[i];
    e.life += dt;
    const k = Math.min(1, e.life / e.max);
    e.update(e, k, dt);
    if (k >= 1) {
      fight.fx.remove(e.obj);
      fight.effects.splice(i, 1);
    }
  }
}

// ================= a. 炸彈無人機 =================
function buildDrone() {
  const g = new THREE.Group();
  box(g, 1.1, 0.4, 1.1, 0x37474f, 0, 0, 0, { metalness: 0.6 });
  box(g, 0.5, 0.2, 0.2, 0xff1744, 0, 0, -0.55, GLOW(0xff1744, 3)); // 紅眼
  const rotors = [];
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 1.1), mat(0x263238));
    arm.position.set(x / 2, 0.05, z / 2);
    arm.rotation.y = Math.atan2(x, z);
    g.add(arm);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.14), mat(0xb0bec5));
    rotor.position.set(x, 0.25, z);
    g.add(rotor);
    rotors.push(rotor);
  }
  const bomb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), mat(0x212121, { metalness: 0.4 }));
  bomb.position.y = -0.45;
  g.add(bomb);
  g.scale.setScalar(1.3);
  return { g, rotors, bomb };
}

function launchDrones(fight, n) {
  play('drone');
  popup(`🛸 ${n} bomber drones! Watch for red circles!`);
  for (let i = 0; i < n; i++) {
    const d = buildDrone();
    d.g.position.set(fight.group.position.x, 9, fight.group.position.z + 1);
    fight.fx.add(d.g);
    fight.drones.push({ ...d, bombs: 3, cool: 1 + i * 0.7, offset: V().randomDirection().setY(0).normalize().multiplyScalar(2 + Math.random() * 3), leaving: false });
  }
}

function playerSpeed() {
  return walkSpeed(state.speed);
}

function updateDrones(fight, dt, time, P) {
  const speed = Math.max(9, playerSpeed() * 0.6);
  for (let i = fight.drones.length - 1; i >= 0; i--) {
    const d = fight.drones[i];
    d.rotors.forEach((r, k) => (r.rotation.y = time * 30 + k));
    const p = d.g.position;
    if (d.leaving || fight.phase === 'defeated') {
      p.y += dt * 8;
      if (p.y > 30) {
        fight.fx.remove(d.g);
        fight.drones.splice(i, 1);
      }
      continue;
    }
    // 飛去你頭頂（喺實驗室入面先追）
    const goal = P.inside ? V(P.x + d.offset.x, 8, P.z + d.offset.z) : V(BOSS_HOME.x + d.offset.x * 2, 9, BOSS_HOME.z + d.offset.z);
    const delta = goal.clone().sub(p);
    const dist = delta.length();
    if (dist > 0.1) p.addScaledVector(delta.normalize(), Math.min(dist, speed * dt));
    p.y = 8 + Math.sin(time * 3 + i) * 0.3;
    d.g.rotation.z = Math.sin(time * 4 + i) * 0.1;
    d.cool -= dt;
    if (P.inside && d.cool <= 0 && Math.hypot(P.x - p.x, P.z - p.z) < 6) {
      dropBomb(fight, p.clone(), V(P.x, 0, P.z));
      d.bombs -= 1;
      d.cool = 2.2;
      if (d.bombs <= 0) {
        d.leaving = true;
        d.bomb.visible = false;
      }
    }
  }
}

function dropBomb(fight, from, at) {
  clampArena(at, 1);
  const bomb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), mat(0x212121, { metalness: 0.4 }));
  bomb.position.copy(from);
  const fuse = new THREE.Mesh(new THREE.OctahedronGeometry(0.15), new THREE.MeshBasicMaterial({ color: 0xffea00 }));
  fuse.position.y = 0.45;
  bomb.add(fuse);
  const circle = new THREE.Group();
  const fill = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.3, depthWrite: false }));
  fill.rotation.x = -Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.25, 32), new THREE.MeshBasicMaterial({ color: 0xff1744, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  circle.add(fill, ring);
  circle.position.set(at.x, 0.07, at.z);
  fight.fx.add(bomb, circle);
  fight.bombs.push({ bomb, circle, fill, from, at, t: 0, fall: 1.3 });
  play('blip');
}

function updateBombs(fight, dt, P) {
  for (let i = fight.bombs.length - 1; i >= 0; i--) {
    const b = fight.bombs[i];
    b.t += dt;
    const k = Math.min(1, b.t / b.fall);
    b.bomb.position.lerpVectors(b.from, b.at, k * k);
    b.bomb.rotation.x += dt * 6;
    b.fill.material.opacity = Math.sin(b.t * 25) > 0 ? 0.45 : 0.15;
    if (k >= 1) {
      fight.fx.remove(b.bomb, b.circle);
      fight.bombs.splice(i, 1);
      explode(fight, b.at);
      if (P.inside && Math.hypot(P.x - b.at.x, P.z - b.at.z) < 2.4 && P.feetY < 2) hit(fight, P, 'a drone bomb');
    }
  }
}

// 卡通爆炸：橙色波 + 黃色閃光方塊
function explode(fight, at) {
  play('boom');
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff9100, transparent: true, opacity: 0.9 }));
  ball.position.copy(at);
  fight.fx.add(ball);
  fight.effects.push({ obj: ball, life: 0, max: 0.45, update: (e, k) => { ball.scale.setScalar(0.5 + k * 2.6); ball.material.opacity = 0.9 * (1 - k); } });
  burst(fight, V(at.x, 0.5, at.z), 0xffea00, 14, 6);
}

// ================= b. 腐化動物（30 秒後變灰燼） =================
const PURPLE = new THREE.Color(0x4a148c);
function summonCorrupted(fight, n) {
  play('portal');
  announce(`😵 He corrupted ${n} endangered animals! RUN!`);
  setTimeout(() => popup(`They hunt you for ${LAB_CORRUPTED_SECONDS} seconds... jump to dodge!`), 1500);
  const land = ANIMALS.filter((a) => a.biome !== 1);
  for (let i = 0; i < n; i++) {
    let model = null;
    let animal = null;
    for (let tries = 0; tries < 12; tries++) {
      animal = land[Math.floor(Math.random() * land.length)];
      model = buildAnimalModel(animal);
      if (model.userData.move !== 'swim') break;
    }
    if (model.userData.move === 'fly') model.userData.flying = false;
    const size = new THREE.Box3().setFromObject(model).getSize(V());
    model.scale.multiplyScalar(Math.min(1.6, 2.4 / Math.max(size.x, size.y, size.z)));
    // 變紫色（腐化咗）
    const mats = [];
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      o.material.color?.lerp(PURPLE, 0.5);
      if (o.material.emissive) {
        o.material.emissive.set(0x6a1b9a);
        o.material.emissiveIntensity = 0.35;
      }
      mats.push(o.material);
    });
    const g = new THREE.Group();
    g.add(model);
    const aura = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.3, 24), new THREE.MeshBasicMaterial({ color: 0xd500f9, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.05;
    g.add(aura);
    const label = makeLabel([{ text: `😵 Corrupted ${animal.name}`, color: '#ea80fc' }, { text: '', color: '#ffffff' }], 0.9);
    label.position.y = new THREE.Box3().setFromObject(model).max.y + 0.8;
    g.add(label);
    const a = (i / n) * Math.PI * 2;
    g.position.set(BOSS_HOME.x + Math.cos(a) * 6, 0, BOSS_HOME.z - 4 + Math.sin(a) * 4);
    fight.fx.add(g);
    burst(fight, V(g.position.x, 0.5, g.position.z), 0xd500f9, 12, 4);
    fight.animals.push({ g, model, mats, aura, label, animal, life: LAB_CORRUPTED_SECONDS, ash: 0 });
  }
}

function updateCorrupted(fight, dt, time, P) {
  const speed = THREE.MathUtils.clamp(playerSpeed() * 0.62, 6, 20);
  let crumbled = false;
  for (let i = fight.animals.length - 1; i >= 0; i--) {
    const a = fight.animals[i];
    a.life -= dt;
    a.aura.rotation.z = time * 2;
    if (a.life > 0 && fight.phase !== 'defeated') {
      a.label.userData.setLines([{ text: `😵 Corrupted ${a.animal.name}`, color: '#ea80fc' }, { text: `${Math.ceil(a.life)}s`, color: '#ffffff' }]);
      // 追你（你喺實驗室外面就喺入面行嚟行去）
      const goal = P.inside ? V(P.x, 0, P.z) : V(ARENA.x + Math.sin(time + i) * 10, 0, ARENA.z + Math.cos(time * 0.7 + i) * 8);
      const d = goal.sub(a.g.position);
      d.y = 0;
      const dist = d.length();
      if (dist > 0.2) {
        a.g.position.addScaledVector(d.normalize(), Math.min(dist, speed * dt * (P.inside ? 1 : 0.4)));
        a.model.rotation.y = Math.atan2(-d.x, -d.z);
      }
      // 唔好疊埋一齊
      for (const b of fight.animals) {
        if (b === a) continue;
        const dx = a.g.position.x - b.g.position.x;
        const dz = a.g.position.z - b.g.position.z;
        const dd = Math.hypot(dx, dz);
        if (dd < 1.6 && dd > 0.01) a.g.position.add(V(dx / dd, 0, dz / dd).multiplyScalar((1.6 - dd) * 0.5));
      }
      clampArena(a.g.position, 1.5);
      a.model.userData.animate?.(time, 1);
      if (P.inside && Math.hypot(P.x - a.g.position.x, P.z - a.g.position.z) < 1.5 && P.feetY < 1.2) hit(fight, P, `the Corrupted ${a.animal.name}`);
    } else {
      // 變灰燼：慢慢變灰、縮細、散開做塵
      if (a.ash === 0) {
        burst(fight, V(a.g.position.x, 1, a.g.position.z), 0x9e9e9e, 18, 3);
        play('poof');
        crumbled = true;
        a.label.visible = false;
        a.aura.visible = false;
      }
      a.ash += dt;
      const k = Math.min(1, a.ash / 1.2);
      for (const m of a.mats) {
        m.color?.lerp(new THREE.Color(0x9e9e9e), Math.min(1, dt * 4));
        if (m.emissive) m.emissiveIntensity = 0.35 * (1 - k);
      }
      a.model.scale.y = Math.max(0.05, a.model.scale.x * (1 - k));
      if (k >= 1) {
        fight.fx.remove(a.g);
        fight.animals.splice(i, 1);
      }
    }
  }
  if (crumbled && once(fight, 'ashes')) popup('💨 The corrupted animals crumbled into ashes...');
}

// ================= c. 傳送門 Boss（1 分鐘後返入傳送門） =================
function openPortal(fight) {
  lab.bossPortal.target = 1;
  play('portal');
  announce('🌀 He opened a PORTAL! Biome Bosses are coming out!');
  const picks = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, LAB_PORTAL_BOSSES);
  // 排隊：一個一個由傳送門行出嚟（用 fight.clock，暫停／收招都唔會亂出）
  picks.forEach((b, i) => fight.pending.push({ at: fight.clock + 1.5 + i * 0.9, biome: b, slot: i, count: picks.length }));
}

function spawnPortalBoss(fight, { biome: b, slot: i, count }) {
  {
    const rig = buildBossRig(b);
    const group = new THREE.Group();
    group.add(rig.g);
    rig.g.scale.setScalar(0.01);
    const label = makeLabel([{ text: `BOSS: ${BOSSES[b].name}`, color: '#ff5252' }, { text: '', color: '#ffffff' }], 1.1);
    label.position.y = 4.7;
    group.add(label);
    group.position.set(PORTAL.x + (i - (count - 1) / 2) * 1.5, 0, PORTAL.z + 0.6);
    fight.fx.add(group);
    fight.portalBosses.push({ biome: b, rig, group, label, life: LAB_PORTAL_SECONDS, runPhase: 0, grow: 0 });
    play('alarm');
  }
}

function updatePortalBosses(fight, dt, time, P) {
  for (let i = fight.pending.length - 1; i >= 0; i--) {
    if (fight.clock < fight.pending[i].at) continue;
    spawnPortalBoss(fight, fight.pending[i]);
    fight.pending.splice(i, 1);
  }
  for (let i = fight.portalBosses.length - 1; i >= 0; i--) {
    const b = fight.portalBosses[i];
    b.life -= dt;
    const pos = b.group.position;
    const leaving = b.life <= 0 || fight.phase === 'defeated';
    let goal;
    let speed;
    if (leaving) {
      goal = V(PORTAL.x, 0, PORTAL.z + 0.4);
      speed = 9;
      b.label.userData.setLines([{ text: `BOSS: ${BOSSES[b.biome].name}`, color: '#ff5252' }, { text: 'Going back! 🌀', color: '#ea80fc' }]);
    } else {
      b.grow = Math.min(1, b.grow + dt * 1.5);
      goal = P.inside ? V(P.x, 0, P.z) : V(PORTAL.x + Math.sin(time + i * 2) * 8, 0, ARENA.z - 8);
      speed = THREE.MathUtils.clamp(Math.min(walkSpeed(BOSSES[b.biome].speed), playerSpeed() * 0.7), 6, 22) * (P.inside ? 1 : 0.4);
      b.label.userData.setLines([{ text: `BOSS: ${BOSSES[b.biome].name}`, color: '#ff5252' }, { text: `${Math.ceil(b.life)}s`, color: '#ffffff' }]);
    }
    const d = goal.sub(pos);
    d.y = 0;
    const dist = d.length();
    let moving = 0;
    if (dist > 0.2) {
      pos.addScaledVector(d.normalize(), Math.min(dist, speed * dt));
      b.group.rotation.y = Math.atan2(-d.x, -d.z);
      moving = 1;
    }
    clampArena(pos, 1.2);
    if (leaving && dist < 0.6) b.grow -= dt * 2.5; // 縮細返入傳送門
    b.rig.g.scale.setScalar(Math.max(0.01, b.grow) * 1.15);
    animateRig(b, dt, time, moving);
    if (!leaving && b.grow > 0.9 && P.inside && Math.hypot(P.x - pos.x, P.z - pos.z) < 1.6 && P.feetY < 1.5) hit(fight, P, BOSSES[b.biome].name);
    if (leaving && b.grow <= 0) {
      fight.fx.remove(b.group);
      fight.portalBosses.splice(i, 1);
      if (!fight.portalBosses.length) {
        lab.bossPortal.target = 0; // 全部返晒入去：閂門
        popup('🌀 The Bosses went back into the portal!');
      }
    }
  }
}

// 打贏／重新開始／你走咗：清走所有手下（poof = 有一陣煙咁消失）
function clearMinions(fight, poof = false) {
  if (poof) {
    for (const o of [...fight.drones.map((d) => d.g), ...fight.animals.map((a) => a.g), ...fight.portalBosses.map((b) => b.group)]) {
      burst(fight, V(o.position.x, 1, o.position.z), 0xb39ddb, 10, 3);
    }
  }
  const keep = poof ? fight.effects.map((e) => e.obj) : [];
  for (const list of [fight.drones, fight.animals, fight.portalBosses, fight.bombs, fight.slams, fight.pending]) list.length = 0;
  for (const o of [...fight.fx.children]) if (!keep.includes(o)) fight.fx.remove(o);
  if (!poof) fight.effects.length = 0;
  lab.bossPortal.target = 0;
}

// Boss 頭頂個牌：而家做緊乜
function updateBossLabel(fight) {
  const lines = {
    sleep: 'Sleeping... 💤',
    wake: '😠 WAKING UP!',
    attack: '😈 ATTACKING!',
    tired: '😮‍💨 So tired...',
    hurt: '💫 OUCH!',
    defeated: '💫 Defeated!',
  };
  fight.label.userData.setLines([{ text: '🧪 MUTATED SCIENTIST POACHER', color: '#ea80fc' }, { text: lines[fight.phase] || '', color: fight.phase === 'tired' ? '#ffe082' : '#ffffff' }]);
}

// ================= 頂部 Boss 血條 =================
function showBar(fight) {
  const el = $('boss-bar');
  const show = fight && fight.phase !== 'sleep' && fight.phase !== 'gone' && fight.phase !== 'defeated' && fight.playerInside;
  el.hidden = !show;
  if (!show) return;
  const hits = LAB_CAPSULE_HITS - fight.hp;
  const suns = Array.from({ length: LAB_CAPSULE_HITS }, (_, i) => (i < hits ? '💥' : '☀️')).join(' ');
  const status = {
    wake: '😠 Waking up...',
    attack: fight.t < T_ANIMALS ? '🛸 Bomber drones!' : fight.t < T_PORTAL ? '😵 Corrupted animals!' : '🌀 Portal Bosses! Dodge the red boxes!',
    tired: `😮‍💨 TIRED! Lead his lazy slam onto a capsule! (${Math.max(0, Math.ceil(LAB_TIRED_SECONDS - fight.t))}s)`,
    hurt: '💫 OUCH!',
  }[fight.phase] || '';
  const lives = `${'💚'.repeat(Math.max(0, fight.lives))}${'🤍'.repeat(Math.max(0, LAB_LIVES - fight.lives))}`;
  const html = `<b>🧪 MUTATED SCIENTIST POACHER</b><div class="hp">${'❤️'.repeat(Math.max(0, fight.hp))}${'🖤'.repeat(hits)}</div><small>Capsule hits: ${suns}</small><div class="status">${status}</div><small class="you">You: ${lives}</small>`;
  if (el.innerHTML !== html) el.innerHTML = html;
}

// 第三身鏡頭鑽咗入 Boss 個身（佢好大隻）：暫時收埋個身，唔係成個畫面得一片灰
export function avoidCameraClip(fight, camPos) {
  if (fight.phase === 'gone') return;
  const p = fight.group.position;
  const inside = Math.hypot(camPos.x - p.x, camPos.z - p.z) < 2.2 * S * 0.75 && camPos.y < 8;
  fight.rig.g.visible = !inside;
  // 條手（可以拉好長）掃過鏡頭：收埋嗰隻手
  for (const arm of fight.arms) {
    let near = arm.hand.position.distanceTo(camPos) < 2.2;
    for (const seg of [arm.upper, arm.lower]) {
      const a = seg.position;
      const dir = tmpSeg.set(0, 0, 1).applyQuaternion(seg.quaternion);
      const k = THREE.MathUtils.clamp(tmpSeg2.copy(camPos).sub(a).dot(dir), 0, seg.scale.z);
      if (tmpSeg2.copy(a).addScaledVector(dir, k).distanceTo(camPos) < arm.thick * 1.2) near = true;
    }
    for (const m of [arm.upper, arm.lower, arm.elbow, arm.hand]) m.visible = !near;
  }
}
const tmpSeg = new THREE.Vector3();
const tmpSeg2 = new THREE.Vector3();

// ================= 測試用（game.lab） =================
export function debugFight(fight, what) {
  if (what === 'drones') launchDrones(fight, LAB_DRONES);
  if (what === 'animals') summonCorrupted(fight, LAB_CORRUPTED_ANIMALS);
  if (what === 'portal') openPortal(fight);
  if (what === 'tired') {
    clearMinions(fight);
    setPhase(fight, 'tired');
    fight.nextLazy = 1;
  }
  if (what === 'hit') {
    const c = lab.capsules.find((cc) => !cc.used);
    if (c) capsuleHit(fight, c);
  }
}

// 新一場（測試用／重新挑戰）
export function resetFight(fight) {
  clearMinions(fight);
  fight.hp = LAB_CAPSULE_HITS;
  fight.rig.damage.forEach((d) => (d.visible = false));
  fight.rig.hairMat.color.set(0xf5f5f5);
  fight.rig.root.rotation.set(0, 0, 0);
  fight.rig.root.position.set(0, 0, 0);
  fight.arms.forEach((a) => (a.limp = false));
  fight.group.visible = true;
  for (const a of fight.arms) for (const m of [a.upper, a.lower, a.elbow, a.hand]) m.visible = true;
  fight.group.position.set(BOSS_HOME.x, 0, BOSS_HOME.z);
  fight.group.rotation.set(0, Math.PI, 0); // 面向南（玩家入嚟嗰邊）
  fight.lives = LAB_LIVES;
  fight.round = 0;
  fight.away = 0;
  resetCapsules();
  setPhase(fight, 'sleep');
}

export { hideBoss };
