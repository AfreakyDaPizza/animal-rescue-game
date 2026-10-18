// 鏡頭：轆滑鼠拉近／拉遠（小朋友 2026-10-11）；拉到最近 = 第一身，其他 = 第三身見到自己個公仔
// 第三身拎住寵物：寵物頂喺頭上，用返真實大細（show 俾朋友睇！）
// 移動同互動照用原本嘅「眼」鏡頭（camera），淨係畫畫面用另一個鏡頭（view）

import * as THREE from 'three';
import { poseGym, gymFirstPerson } from './gymPoses.js'; // 💪 Gym 動作
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { kgScale } from './data/animals.js';

const MIN_ZOOM = 0; // 0 = 第一身
const MAX_ZOOM = 20;
const ZOOM_STEPS = [0, 3, 5, 8, 12, 16, 20];
const HAND_SIZE = 0.4; // 第一身拎喺手嘅大細（handModel 定嘅）

function box(parent, w, h, d, color, x, y, z) {
  const mat = color.isMaterial ? color : new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.18), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// Roblox 款護林員公仔：顏色由皮膚決定（mats），每款皮膚有自己嘅配件（extras）
export function buildAvatar() {
  const M = () => new THREE.MeshStandardMaterial({ roughness: 0.55 });
  const mats = { shirt: M(), pants: M(), skin: M(), hat: M(), shoes: M() };
  const g = new THREE.Group();
  // 膝頭（knee）：條腳分大髀同小腿，跑步、跳起嗰陣屈得到；預設 0 = 同以前一樣直
  const knees = [];
  const legs = [-1, 1].map((s) => {
    const hip = new THREE.Group();
    hip.position.set(s * 0.22, 0.9, 0);
    box(hip, 0.38, 0.44, 0.38, mats.pants, 0, -0.22, 0);
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    box(knee, 0.37, 0.4, 0.37, mats.pants, 0, -0.18, 0);
    box(knee, 0.4, 0.16, 0.48, mats.shoes, 0, -0.42, -0.04);
    hip.add(knee);
    hip.userData.knee = knee;
    knees.push(knee);
    g.add(hip);
    return hip;
  });
  // 上身（torso）：心口、手、頭都喺入面，原點同 g 一樣（腳底），咁 head.position.y = 2.15 照用得；轉腰、呼吸用
  const torso = new THREE.Group();
  g.add(torso);
  box(torso, 0.85, 0.9, 0.45, mats.shirt, 0, 1.35, 0);
  const badge = box(torso, 0.2, 0.35, 0.05, 0xffd600, 0.22, 1.55, -0.24); // 徽章
  box(torso, 0.87, 0.14, 0.47, mats.shoes, 0, 0.95, 0); // 皮帶（跟鞋顏色）
  box(torso, 0.16, 0.12, 0.04, 0xffd54f, 0, 0.95, -0.24); // 皮帶扣
  box(torso, 0.24, 0.2, 0.04, mats.pants, -0.22, 1.5, -0.235); // 心口袋
  for (const s of [-1, 1]) box(torso, 0.3, 0.1, 0.12, mats.shirt, s * 0.17, 1.82, -0.2).rotation.z = s * -0.3; // 衫領
  // 手踭（elbow）：上臂 + 前臂，跑步嗰陣屈起
  const elbows = [];
  const arms = [-1, 1].map((s) => {
    const sh = new THREE.Group();
    sh.position.set(s * 0.62, 1.75, 0);
    box(sh, 0.34, 0.46, 0.34, mats.shirt, 0, -0.18, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -0.4;
    box(elbow, 0.33, 0.36, 0.33, mats.shirt, 0, -0.14, 0);
    box(elbow, 0.32, 0.2, 0.32, mats.skin, 0, -0.42, 0);
    sh.add(elbow);
    sh.userData.elbow = elbow;
    elbows.push(elbow);
    torso.add(sh);
    return sh;
  });
  const head = new THREE.Group();
  head.position.y = 2.15;
  box(head, 0.66, 0.66, 0.66, mats.skin, 0, 0, 0);
  const hat = new THREE.Group();
  box(hat, 0.72, 0.18, 0.72, mats.hat, 0, 0.36, 0);
  box(hat, 0.9, 0.05, 0.9, mats.hat, 0, 0.28, 0);
  head.add(hat);
  for (const s of [-1, 1]) {
    box(head, 0.15, 0.15, 0.03, 0xffffff, s * 0.15, 0.05, -0.335); // 眼白
    box(head, 0.08, 0.1, 0.03, 0x1b1b1b, s * 0.15, 0.04, -0.348); // 眼珠
    box(head, 0.03, 0.03, 0.02, 0xffffff, s * 0.15 + 0.02, 0.07, -0.362); // 反光
    box(head, 0.16, 0.04, 0.03, 0x4e342e, s * 0.15, 0.17, -0.34); // 眉
    box(head, 0.1, 0.06, 0.02, 0xff8a80, s * 0.24, -0.08, -0.335); // 面珠
  }
  box(head, 0.2, 0.05, 0.04, 0x8d4a3a, 0, -0.16, -0.34); // 笑口
  box(hat, 0.74, 0.07, 0.74, mats.shoes, 0, 0.3, 0); // 帽帶
  torso.add(head);

  // ---- 每款皮膚嘅配件 ----
  const extras = {};
  const make = (name, parent) => {
    const e = new THREE.Group();
    e.visible = false;
    parent.add(e);
    extras[name] = e;
    return e;
  };
  const ninja = make('ninja', head);
  box(ninja, 0.7, 0.12, 0.7, 0xd50000, 0, 0.2, 0); // 紅頭巾
  box(ninja, 0.12, 0.3, 0.06, 0xd50000, 0.12, 0.1, 0.36);
  box(ninja, 0.68, 0.3, 0.05, 0x111111, 0, -0.15, -0.34); // 面罩
  const panda = make('panda', head);
  for (const s of [-1, 1]) {
    box(panda, 0.22, 0.22, 0.12, 0x1d1d1d, s * 0.28, 0.4, 0); // 黑耳
    box(panda, 0.2, 0.22, 0.03, 0x1d1d1d, s * 0.14, 0.03, -0.335); // 黑眼圈
  }
  const astronaut = make('astronaut', head);
  const visor = box(astronaut, 0.86, 0.86, 0.86, new THREE.MeshStandardMaterial({ color: 0x80d8ff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.5 }), 0, 0.02, 0);
  visor.castShadow = false;
  const pack = make('pack', torso);
  box(pack, 0.6, 0.7, 0.3, 0xcfd8dc, 0, 1.4, 0.38); // 背囊
  const knight = make('knight', head);
  box(knight, 0.5, 0.06, 0.04, 0x111111, 0, 0.04, -0.345); // 頭盔隙
  box(knight, 0.1, 0.45, 0.4, 0xd50000, 0, 0.55, 0.05); // 紅羽毛
  const crown = make('crown', head);
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd600, metalness: 0.9, roughness: 0.2, emissive: 0x6d4c00 });
  box(crown, 0.7, 0.15, 0.7, gold, 0, 0.42, 0);
  for (const [x, z] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]]) box(crown, 0.12, 0.2, 0.12, gold, x, 0.58, z);
  const wings = make('wings', torso);
  for (const s of [-1, 1]) {
    const w = box(wings, 0.08, 1.0, 0.6, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3 }), s * 0.6, 1.7, 0.4);
    w.rotation.z = s * -0.5;
  }
  // ---- 新皮膚（小朋友 2026-10-17）：每款有頭上嘅（name）同身上嘅（name + 'Body'）配件 ----
  const SM = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
  const SG = (color, k = 1) => SM(color, { emissive: color, emissiveIntensity: k });
  // 海盜船長：黑色三角帽（金邊）+ 眼罩 + 紅色腰帶
  const pirate = make('pirate', head);
  box(pirate, 0.95, 0.12, 0.8, 0x212121, 0, 0.38, 0);
  box(pirate, 0.7, 0.3, 0.62, 0x212121, 0, 0.55, 0);
  box(pirate, 0.97, 0.04, 0.82, SM(0xffd54f, { metalness: 0.8 }), 0, 0.45, 0);
  box(pirate, 0.18, 0.16, 0.04, 0x111111, 0.15, 0.05, -0.36); // 眼罩
  box(pirate, 0.7, 0.03, 0.03, 0x111111, 0, 0.12, -0.35).rotation.z = -0.3;
  const pirateBody = make('pirateBody', torso);
  box(pirateBody, 0.88, 0.16, 0.48, 0xc62828, 0, 0.95, 0);
  box(pirateBody, 0.18, 0.18, 0.05, SM(0xffd54f, { metalness: 0.8 }), 0, 0.95, -0.25);
  // 魔法師：好高嘅紫色星星帽 + 白鬍子 + 披風
  const wizard = make('wizard', head);
  box(wizard, 0.95, 0.08, 0.95, 0x4a148c, 0, 0.36, 0);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 8), SM(0x6a1b9a));
  cone.position.set(0, 0.95, 0.05);
  cone.rotation.x = -0.15;
  cone.castShadow = true;
  wizard.add(cone);
  for (const [x, y, z] of [[0.15, 0.7, -0.3], [-0.12, 0.95, -0.22], [0.05, 1.2, -0.12]]) box(wizard, 0.09, 0.09, 0.03, SG(0xffeb3b, 1.4), x, y, z);
  box(wizard, 0.5, 0.45, 0.12, 0xf5f5f5, 0, -0.32, -0.32); // 鬍子
  box(wizard, 0.2, 0.2, 0.1, 0xf5f5f5, 0, -0.6, -0.32);
  const wizardBody = make('wizardBody', torso);
  box(wizardBody, 0.95, 1.3, 0.08, 0x311b92, 0, 1.2, 0.3); // 披風
  // 電子忍者：發光藍色護目鏡 + 身上霓虹線
  const cyber = make('cyber', head);
  box(cyber, 0.7, 0.16, 0.06, SG(0x00e5ff, 1.6), 0, 0.06, -0.35);
  box(cyber, 0.72, 0.12, 0.72, 0x263238, 0, 0.3, 0);
  box(cyber, 0.06, 0.4, 0.06, SG(0xff4081, 1.4), 0.3, 0.45, 0.2); // 天線
  const cyberBody = make('cyberBody', torso);
  for (const s of [-1, 1]) box(cyberBody, 0.05, 0.85, 0.05, SG(0x00e5ff, 1.4), s * 0.36, 1.35, -0.24);
  box(cyberBody, 0.6, 0.05, 0.05, SG(0xff4081, 1.4), 0, 1.6, -0.24);
  // 龍騎士：紅色龍頭盔（角）+ 紅色龍翼
  const dragon = make('dragon', head);
  box(dragon, 0.74, 0.22, 0.74, 0xb71c1c, 0, 0.32, 0);
  box(dragon, 0.5, 0.12, 0.2, 0xb71c1c, 0, 0.28, -0.42); // 龍嘴罩
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 6), SM(0xfff8e1));
    horn.position.set(s * 0.25, 0.55, 0.1);
    horn.rotation.set(-0.5, 0, s * -0.4);
    dragon.add(horn);
    box(dragon, 0.06, 0.06, 0.02, SG(0xffab00, 1.6), s * 0.14, 0.2, -0.53); // 頭盔眼
  }
  const dragonBody = make('dragonBody', torso);
  for (const s of [-1, 1]) {
    const w = box(dragonBody, 0.06, 0.9, 0.9, SM(0xd32f2f, { transparent: true, opacity: 0.9 }), s * 0.75, 1.75, 0.45);
    w.rotation.z = s * -0.6;
    box(dragonBody, 0.08, 0.9, 0.08, 0x4e0000, s * 0.62, 1.95, 0.3).rotation.z = s * -0.6; // 翼骨
  }
  // 皇帝：大金皇冠（寶石）+ 紅色披風（白毛邊）
  const king = make('king', head);
  const kg = SM(0xffd600, { metalness: 0.9, roughness: 0.2, emissive: 0x6d4c00 });
  box(king, 0.78, 0.2, 0.78, kg, 0, 0.44, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    box(king, 0.14, 0.24, 0.14, kg, Math.cos(a) * 0.32, 0.64, Math.sin(a) * 0.32);
  }
  for (const [c, x] of [[0xd50000, 0], [0x2962ff, -0.2], [0x00c853, 0.2]]) box(king, 0.1, 0.1, 0.04, SG(c, 0.8), x, 0.45, -0.4);
  const kingBody = make('kingBody', torso);
  box(kingBody, 1.0, 1.45, 0.08, 0xb71c1c, 0, 1.15, 0.3);
  box(kingBody, 1.05, 0.16, 0.5, 0xfafafa, 0, 1.85, 0.08); // 白毛領
  // 冰之守護者：水晶頭盔 + 冰水晶膊頭
  const ice = make('ice', head);
  box(ice, 0.74, 0.2, 0.74, SM(0xb3e5fc, { metalness: 0.4, roughness: 0.1 }), 0, 0.32, 0);
  for (const [x, h] of [[-0.22, 0.4], [0, 0.6], [0.22, 0.4]]) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), SG(0x80d8ff, 0.9));
    c.position.set(x, 0.42 + h / 2, 0);
    c.scale.y = h / 0.2;
    ice.add(c);
  }
  const iceBody = make('iceBody', torso);
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), SG(0x80d8ff, 0.8));
    c.position.set(s * 0.62, 1.95, 0);
    c.scale.y = 1.6;
    iceBody.add(c);
  }
  // 熔岩騎士：黑色頭盔（發光橙色縫）+ 背後火焰劍
  const lava = make('lava', head);
  box(lava, 0.74, 0.74, 0.74, 0x212121, 0, 0.02, 0);
  box(lava, 0.5, 0.06, 0.04, SG(0xff6d00, 1.8), 0, 0.04, -0.375); // 眼縫
  box(lava, 0.08, 0.4, 0.42, SG(0xff3d00, 1.4), 0, 0.5, 0.05); // 火焰冠
  const lavaBody = make('lavaBody', torso);
  box(lavaBody, 0.1, 1.3, 0.05, SG(0xff6d00, 1.5), 0.2, 1.55, 0.3).rotation.z = 0.4; // 背後劍
  box(lavaBody, 0.4, 0.08, 0.08, 0x424242, 0.06, 1.0, 0.3).rotation.z = 0.4;
  // 銀河探險家：透明星空頭盔 + 星星背包
  const galaxy = make('galaxy', head);
  const dome = box(galaxy, 0.86, 0.86, 0.86, SM(0x7c4dff, { transparent: true, opacity: 0.35, roughness: 0.05, emissive: 0x311b92, emissiveIntensity: 0.6 }), 0, 0.02, 0);
  dome.castShadow = false;
  for (const [x, y, z] of [[0.3, 0.3, -0.3], [-0.32, 0.2, 0.2], [0.1, 0.42, 0.3]]) box(galaxy, 0.05, 0.05, 0.05, SG(0xffffff, 2), x, y, z);
  const galaxyBody = make('galaxyBody', torso);
  box(galaxyBody, 0.6, 0.7, 0.3, 0x1a237e, 0, 1.4, 0.38);
  box(galaxyBody, 0.15, 0.15, 0.05, SG(0xffeb3b, 1.6), 0, 1.5, 0.55);
  return { g, torso, legs, arms, knees, elbows, head, mats, extras, hat, badge };
}

// 換護林員皮膚
export function applyRangerSkin(tp, skin) {
  const { mats, extras, hat, badge } = tp.avatar;
  for (const k of Object.keys(mats)) {
    mats[k].color.setHex(skin[k]);
    mats[k].metalness = skin.metal ? 0.85 : 0;
    mats[k].roughness = skin.metal ? 0.25 : 0.55;
  }
  for (const [name, e] of Object.entries(extras)) e.visible = name === skin.extra || name === `${skin.extra}Body` || (name === 'pack' && skin.extra === 'astronaut');
  hat.visible = !skin.extra || skin.extra === 'wings'; // 有自己頭飾嘅皮膚就收埋護林員帽
  badge.visible = skin.id === 'ranger';
  tp.rainbow = !!skin.rainbow;
}

export function createThirdPerson(scene, eye) {
  const avatar = buildAvatar();
  avatar.g.visible = false;
  avatar.g.rotation.order = 'YXZ'; // 先傾（x）再轉向（y）：Gym 瞓低、空翻用
  scene.add(avatar.g);
  const view = new THREE.PerspectiveCamera(eye.fov, eye.aspect, eye.near, eye.far);
  scene.add(view);
  const headSlot = new THREE.Group(); // 寵物放喺度
  headSlot.position.y = 0.36; // 頭頂
  avatar.head.add(headSlot);
  let zoom = 5; // 一開始第三身
  try {
    const saved = localStorage.getItem('animal-rescue-zoom');
    if (saved !== null) zoom = Number(saved);
  } catch {
    // 記唔到就用預設
  }
  return { avatar, view, headSlot, eye, held: null, phase: 0, zoom, smoothZoom: zoom };
}

// 轆滑鼠：dir = 1 拉遠、-1 拉近
export function zoomCamera(tp, dir) {
  let i = ZOOM_STEPS.findIndex((z) => z >= tp.zoom - 0.01);
  if (i < 0) i = ZOOM_STEPS.length - 1;
  i = Math.max(0, Math.min(ZOOM_STEPS.length - 1, i + dir));
  tp.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, ZOOM_STEPS[i]));
  try {
    localStorage.setItem('animal-rescue-zoom', tp.zoom);
  } catch {
    // 記唔到就算
  }
}

// 放返去手（第一身）
function toHand(tp, held) {
  tp.eye.add(held);
  held.position.set(0.5, -0.5, -0.95);
  held.scale.setScalar(1);
  held.userData.inner.rotation.y = Math.PI * 0.8;
}

// ================= 企定／行路／跑步／跳嘅動畫（小朋友 2026-10-18：要型啲）=================
// 用真實移動速度決定行定跑；所有比重（move／run／air）慢慢過渡（約 0.15 秒），唔會一下跳轉
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const mix = (a, b, k) => a + (b - a) * k;
const IDLE_VARIANTS = ['stretch', 'watch', 'hop', 'wave'];
const VARIANT_TIME = { stretch: 2.4, watch: 2.6, hop: 1.4, wave: 2.2 };

function trackMotion(tp, dt, { walking, running, grounded, vy }) {
  const a = (tp.anim ??= { v: 0, move: 0, run: 0, air: 0, phase: 0, still: 0, nextIdle: 8, variant: null, varT: 0, look: 0, lookTo: 0, lookT: 2, land: 0, launch: 0, jumpRun: 0, wasAir: false, vy: 0 });
  const { x, z } = tp.eye.position;
  if (tp.lastX !== undefined && dt > 0) {
    const d = Math.hypot(x - tp.lastX, z - tp.lastZ);
    const v = d < 8 ? d / dt : 0; // 傳送就唔計
    a.v += (Math.min(v, 45) - a.v) * clamp01(dt * 8);
  }
  tp.lastX = x;
  tp.lastZ = z;
  const k = 1 - Math.exp(-dt / 0.15); // 約 0.15 秒過渡
  const kFast = 1 - Math.exp(-dt / 0.07);
  const moving = walking && (running || a.v > 0.6);
  a.move += ((moving ? 1 : 0) - a.move) * k;
  const runTarget = running ? 1 : clamp01((a.v - 7) / 11); // 7 m/s 以下行路，18 m/s 以上全速跑
  a.run += (runTarget - a.run) * k;
  const air = !grounded && !running;
  a.air += ((air ? 1 : 0) - a.air) * kFast;
  a.vy = vy;
  // 起跳／落地
  if (air && !a.wasAir) {
    a.launch = 1;
    a.jumpRun = a.run * a.move;
  }
  if (!air && a.wasAir) a.land = 1;
  a.wasAir = air;
  a.launch = Math.max(0, a.launch - dt * 3.5);
  a.land = Math.max(0, a.land - dt * 3.6);
  // 步伐：行慢啲、跑快啲；喺半空唔郁
  if (!air) a.phase += dt * mix(8.5, 15, a.run) * a.move * (running ? 1.1 : 1);
  // 企定：計時，夠 8 秒先玩特別動作
  if (moving || air) {
    a.still = 0;
    a.variant = null;
    a.nextIdle = 8;
  } else a.still += dt;
  if (!a.variant && a.still > a.nextIdle) {
    a.variant = IDLE_VARIANTS[Math.floor(Math.random() * IDLE_VARIANTS.length)];
    a.varT = 0;
  }
  if (a.variant) {
    a.varT += dt;
    if (a.varT > VARIANT_TIME[a.variant]) {
      a.variant = null;
      a.nextIdle = a.still + 5 + Math.random() * 6;
    }
  }
  // 四圍望：每幾秒轉一轉頭
  a.lookT -= dt;
  if (a.lookT <= 0) {
    a.lookTo = Math.random() < 0.4 ? 0 : (Math.random() * 2 - 1) * 0.55;
    a.lookT = 2 + Math.random() * 3;
  }
  a.look += (a.lookTo - a.look) * clamp01(dt * 3);
  return a;
}

// 一段動作嘅「力度」：0 → 1 → 0（頭尾慢慢郁）
const envelope = (t, total, edge = 0.35) => clamp01(Math.min(t / edge, (total - t) / edge));

function applyLocomotion(avatar, a, { feetY, held, t }) {
  const [L, R] = avatar.legs;
  const [KL, KR] = avatar.knees;
  const [AL, AR] = avatar.arms;
  const [EL, ER] = avatar.elbows;
  const { torso, head, g } = avatar;
  const m = a.move;
  const r = a.run;
  const idle = 1 - m;
  const ph = a.phase;
  const sin = Math.sin(ph);
  const cos = Math.cos(ph);

  // ---- 地面：企定（呼吸、擺手、重心）+ 行／跑 ----
  const breath = Math.sin(t * 2.3);
  const shift = Math.sin(t * 0.45) * 0.035 * idle; // 重心左右移
  const legAmp = mix(0.55, 1.05, r) * m;
  const kneeAmp = mix(0.55, 1.5, r) * m;
  const armAmp = mix(0.5, 1.15, r) * m;
  let lx = sin * legAmp;
  let rx = -sin * legAmp;
  let lk = -Math.max(0, cos) * kneeAmp - 0.04 * idle - Math.max(0, shift) * 3;
  let rk = -Math.max(0, -cos) * kneeAmp - 0.04 * idle - Math.max(0, -shift) * 3;
  let alx = -sin * armAmp + Math.sin(t * 1.1) * 0.04 * idle;
  let arx = sin * armAmp - Math.sin(t * 1.1) * 0.04 * idle;
  let alz = -(0.06 + breath * 0.02) * idle - 0.08 * r * m;
  let arz = (0.06 + breath * 0.02) * idle + 0.08 * r * m;
  let el = mix(0.12, 0.2, m) + mix(0, 1.35, r) * m;
  let er = el;
  let elz = 0;
  let erz = 0;
  let twist = sin * mix(0.08, 0.2, r) * m;
  let lean = -mix(0.04, 0.24, r) * m;
  let bounce = Math.abs(sin) * mix(0.04, 0.17, r) * m;
  let tiltZ = shift;
  let hx = 0.02 * idle;
  let hy = a.look * idle - twist * 0.7;
  let chest = breath * 0.015 * idle;

  // ---- 企耐咗：特別動作 ----
  if (a.variant && idle > 0.5) {
    const v = a.variant;
    const T = VARIANT_TIME[v];
    const e = envelope(a.varT, T);
    if (v === 'stretch' && !held) {
      alx = mix(alx, Math.PI * 0.95, e);
      arx = mix(arx, Math.PI * 0.95, e);
      alz = mix(alz, 0.25, e);
      arz = mix(arz, -0.25, e);
      el = er = mix(el, 0, e);
      lean += 0.1 * e; // 向後拗
      hx = mix(hx, -0.35, e);
      bounce += 0.06 * e; // 踮腳
      hy *= 1 - e;
    } else if (v === 'watch' && !held) {
      alx = mix(alx, 1.25, e);
      alz = mix(alz, 0.55, e);
      el = mix(el, 1.5, e);
      elz = 0;
      hx = mix(hx, 0.4, e);
      hy = mix(hy, 0.35, e);
      rk += -Math.max(0, Math.sin(a.varT * 10)) * 0.25 * e; // 腳踢踢
      rx += Math.max(0, Math.sin(a.varT * 10)) * 0.15 * e;
    } else if (v === 'hop') {
      const p = a.varT / T;
      const hop = Math.max(0, Math.sin(p * Math.PI * 2)); // 兩下細跳
      bounce += hop * 0.32;
      lk -= hop * 0.7;
      rk -= hop * 0.7;
      lx += hop * 0.35;
      rx += hop * 0.35;
      if (!held) {
        alx = mix(alx, 0.9, hop);
        arx = mix(arx, 0.9, hop);
      }
      hx = mix(hx, -0.15, hop);
    } else if (v === 'wave' && !held) {
      arx = mix(arx, 0.3, e);
      arz = mix(arz, 2.5, e);
      er = mix(er, 0.25, e);
      erz = Math.sin(a.varT * 13) * 0.55 * e; // 搖手
      hy = mix(hy, -0.2, e);
      tiltZ -= 0.05 * e;
    }
  }

  // ---- 半空：起跳伸直、半空縮腳、跑跳係跨步 ----
  const air = a.air;
  if (air > 0.001) {
    const jr = a.jumpRun;
    const apex = clamp01(1 - Math.abs(a.vy) / 7); // 去到最高點縮得最緊
    const falling = a.vy < 0 ? clamp01(-a.vy / 9) : 0; // 跌落嚟：腳伸返直準備落地
    const tuck = (0.55 + 0.45 * apex) * (1 - falling * 0.6);
    // 企定跳：雙腳縮埋、雙手舉高
    const sLx = 0.95 * tuck;
    const sLk = -1.7 * tuck;
    const sAx = 2.7;
    const sAz = 0.3;
    // 跑跳：一腳向前、一腳向後；一手前一手後
    const rLx = 1.05 * tuck + 0.15;
    const rLk = -0.45 * tuck;
    const rRx = -0.55;
    const rRk = -1.35 * tuck;
    lx = mix(lx, mix(sLx, rLx, jr), air);
    rx = mix(rx, mix(sLx, rRx, jr), air);
    lk = mix(lk, mix(sLk, rLk, jr), air);
    rk = mix(rk, mix(sLk, rRk, jr), air);
    if (!held) {
      alx = mix(alx, mix(sAx, -0.9, jr), air);
      arx = mix(arx, mix(sAx, 2.2, jr), air);
      alz = mix(alz, mix(-sAz, -0.25, jr), air);
      arz = mix(arz, mix(sAz, 0.2, jr), air);
      el = mix(el, mix(0.15, 0.6, jr), air);
      er = mix(er, mix(0.15, 0.9, jr), air);
    }
    lean = mix(lean, mix(0.05, -0.2, jr), air);
    twist = mix(twist, -0.12 * jr, air);
    bounce *= 1 - air;
    hx = mix(hx, mix(-0.2, 0, jr), air);
    hy *= 1 - air;
    tiltZ *= 1 - air;
  }

  // 抱住寵物：雙手一直舉高托住
  if (held) {
    alx = arx = Math.PI;
    alz = -0.08;
    arz = 0.08;
    el = er = 0.05;
    elz = erz = 0;
  }

  L.rotation.x = lx;
  R.rotation.x = rx;
  KL.rotation.x = lk;
  KR.rotation.x = rk;
  AL.rotation.set(alx, 0, alz);
  AR.rotation.set(arx, 0, arz);
  EL.rotation.set(el, 0, elz);
  ER.rotation.set(er, 0, erz);
  torso.rotation.y = twist;
  torso.position.y = chest;
  head.rotation.set(hx, hy, 0);
  g.rotation.x = lean;
  g.rotation.z = tiltZ;
  g.position.y = feetY + bounce;

  // 起跳先壓低（0.06 秒）再拉長；落地壓扁再彈返
  const l = a.land;
  const sinceLaunch = 1 - a.launch; // 0 → 1（約 0.29 秒）
  let sy = 1;
  if (a.launch > 0) sy = sinceLaunch < 0.2 ? 1 - 0.14 * (sinceLaunch / 0.2) : 1 + 0.1 * a.launch;
  if (l > 0) {
    const sq = Math.sin(l * Math.PI) * 0.75 + l * 0.25;
    sy = Math.min(sy, 1 - 0.2 * sq);
    KL.rotation.x -= 0.9 * sq;
    KR.rotation.x -= 0.9 * sq;
    L.rotation.x += 0.45 * sq;
    R.rotation.x += 0.45 * sq;
    if (!held) {
      AL.rotation.x = mix(AL.rotation.x, 0.6, sq);
      AR.rotation.x = mix(AR.rotation.x, 0.6, sq);
    }
    g.rotation.x -= 0.08 * sq;
  }
  const sxz = 1 + (1 - sy) * 0.6;
  g.scale.set(sxz, sy, sxz);
}

const fwd = new THREE.Vector3();

// held：手上嘅模型；item：嗰隻動物嘅資料（用嚟計真實大細）；回傳要用嚟畫畫面嘅鏡頭
export function updateThirdPerson(tp, dt, { held, item, walking, feetY, grounded = true, vy = 0, station = null, gymStation = null, time = 0 }) {
  const { eye, avatar, view } = tp;
  tp.smoothZoom += (tp.zoom - tp.smoothZoom) * Math.min(1, dt * 10);
  const third = tp.zoom > 0;

  // 寵物：第三身頂喺頭上（向前、真實大細）；第一身拎喺手
  if (tp.held && tp.held !== held) {
    tp.held.visible = true;
    if (tp.held.parent === tp.headSlot) tp.held.removeFromParent();
  }
  tp.held = held;
  if (held) held.visible = !gymStation || gymStation.kind === 'treadmill'; // Gym 做動作（瞓低、爬牆…）嗰陣收埋手上嘅寵物
  if (!gymStation) tp.tramp = null;
  let petSize = 0;
  if (held) {
    if (third) {
      if (held.parent !== tp.headSlot) tp.headSlot.add(held);
      const giant = item?.sizeMul || 1;
      const real = (held.userData.realMax || 1) * (item ? kgScale(item) : 1) * giant;
      petSize = Math.min(real, giant > 1 ? 25 : 8); // 巨型最大 25 米，普通最大 8 米
      held.scale.setScalar(petSize / HAND_SIZE);
      held.userData.inner.rotation.y = 0; // 向前（之前係打側）
      held.position.set(0, Math.abs(Math.sin(tp.phase)) * 0.08, 0);
      held.rotation.set(0, 0, 0);
    } else if (held.parent !== eye) toHand(tp, held);
  }

  avatar.g.visible = third;
  if (!third) return (gymStation && gymFirstPerson(tp, gymStation, { time })) || eye;

  // 公仔跟住玩家（腳嘅位置、面向）
  avatar.g.position.set(eye.position.x, feetY, eye.position.z);
  avatar.g.rotation.set(0, eye.rotation.y, 0);
  avatar.legs.forEach((l) => l.rotation.set(0, 0, 0));
  avatar.arms.forEach((a) => a.rotation.set(0, 0, 0));
  avatar.knees.forEach((k) => k.rotation.set(0, 0, 0));
  avatar.elbows.forEach((e) => e.rotation.set(0, 0, 0));
  avatar.torso.rotation.set(0, 0, 0);
  avatar.torso.position.set(0, 0, 0);
  avatar.g.scale.setScalar(1);
  avatar.head.rotation.set(0, 0, 0);
  avatar.head.position.y = 2.15;
  const running = station?.kind === 'treadmill'; // 跑步機：自動跑
  const sitting = station?.kind === 'table'; // 學生桌：坐低寫字
  if (tp.rainbow) {
    const h = (performance.now() / 4000) % 1;
    avatar.mats.shirt.color.setHSL(h, 1, 0.5);
    avatar.mats.pants.color.setHSL((h + 0.33) % 1, 1, 0.5);
    avatar.mats.shoes.color.setHSL((h + 0.66) % 1, 1, 0.5);
  }
  const t = performance.now() / 1000;
  const anim = trackMotion(tp, dt, { walking: walking || running, running, grounded, vy });
  if (gymStation && poseGym(tp, gymStation, { feetY, dt, time })) {
    // 💪 Gym：gymPoses.js 已經擺好
    anim.still = 0;
  } else if (sitting) {
    // 坐喺張櫈面上、面向書枱：大髀向前打橫，雙手向前放喺枱面，右手寫字，個頭望落本書
    tp.phase2 = (tp.phase2 || 0) + dt * 8;
    avatar.g.position.set(station.x, -0.08, station.z + 1.3); // 櫈面高 0.62，屁股啱啱坐喺上面
    avatar.g.rotation.y = 0;
    avatar.legs.forEach((l) => (l.rotation.x = Math.PI / 2)); // 正數 = 向前
    avatar.knees.forEach((k) => (k.rotation.x = -Math.PI / 2)); // 小腿垂直落地
    avatar.arms[0].rotation.x = 1.15; // 左手撳住本書
    avatar.arms[0].rotation.z = 0;
    avatar.arms[1].rotation.x = 1.15 + Math.sin(tp.phase2) * 0.08; // 右手寫字
    avatar.arms[1].rotation.z = Math.sin(tp.phase2 * 1.7) * 0.1;
    avatar.head.rotation.x = 0.25 + Math.sin(tp.phase2 * 0.3) * 0.05; // 望落枱面
    anim.still = 0;
  } else {
    if (running) avatar.g.rotation.y = 0; // 向住跑步機前面
    applyLocomotion(avatar, anim, { feetY, held: !!held, t });
    tp.phase = anim.phase; // 頭頂寵物跟住步伐輕輕彈
  }

  // 鏡頭：喺公仔後面；寵物越大，退得越後，等你睇得晒
  eye.getWorldDirection(fwd);
  const dist = tp.smoothZoom + petSize * 0.9;
  view.quaternion.copy(eye.quaternion);
  view.position.copy(eye.position).addScaledVector(fwd, -dist);
  view.position.y += 0.6 + petSize * 0.35;
  view.position.y = Math.max(view.position.y, feetY + 0.5);
  view.aspect = eye.aspect;
  view.updateProjectionMatrix();
  return view;
}
