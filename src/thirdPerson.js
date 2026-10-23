// 鏡頭：轆滑鼠拉近／拉遠（小朋友 2026-10-11）；拉到最近 = 第一身，其他 = 第三身見到自己個公仔
// 第三身拎住寵物：寵物頂喺頭上，用返真實大細（show 俾朋友睇！）
// 移動同互動照用原本嘅「眼」鏡頭（camera），淨係畫畫面用另一個鏡頭（view）

import * as THREE from 'three';
import { poseGym, gymFirstPerson } from './gymPoses.js'; // 💪 Gym 動作
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { kgScale } from './data/animals.js';
import { buildDemonicParts, animateDemonic } from './demonicRanger.js'; // 😈 Demonic Ranger（Issue #11）
import { buildOutfit, applyBody } from './rangerOutfits.js'; // 👕 每款皮膚嘅衫（Issue #14）

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

// Roblox 款護林員公仔：淨係砌「身體」（頭、身、手、腳、塊面）；衫褲帽、背囊、徽章等等由皮膚決定
// （小朋友 Issue #14：皮膚要靚 → 每款皮膚嘅衫喺 rangerOutfits.js，第一次著先砌，焊埋做幾個 mesh）
export function buildAvatar() {
  const M = () => new THREE.MeshStandardMaterial({ roughness: 0.55 });
  const mats = { shirt: M(), sleeve: M(), pants: M(), skin: M(), shoes: M() };
  const g = new THREE.Group();
  // 膝頭（knee）：條腳分大髀同小腿，跑步、跳起嗰陣屈得到；預設 0 = 同以前一樣直
  const knees = [];
  const legs = [-1, 1].map((s) => {
    const hip = new THREE.Group();
    hip.position.set(s * 0.22, 0.9, 0);
    // Minecraft 款：成條腳一嚿實心方塊（以前分大髀／小腿兩嚿，中間見到條縫，小朋友話醜）
    box(hip, 0.38, 0.8, 0.38, mats.pants, 0, -0.4, 0);
    const knee = new THREE.Group(); // 保留（舊 code 會 reset 佢），永遠 0
    knee.position.y = -0.42;
    box(knee, 0.4, 0.16, 0.44, mats.shoes, 0, -0.42, -0.02);
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
  // 手踭（elbow）：上臂 + 前臂，跑步嗰陣屈起
  const elbows = [];
  const arms = [-1, 1].map((s) => {
    const sh = new THREE.Group();
    sh.position.set(s * 0.62, 1.75, 0);
    // Minecraft 款：成隻手一嚿實心方塊（衫袖）+ 手掌，冇手踭縫
    box(sh, 0.34, 0.74, 0.34, mats.sleeve, 0, -0.32, 0);
    const elbow = new THREE.Group(); // 保留（舊 code 會 reset 佢），永遠 0
    elbow.position.y = -0.4;
    box(elbow, 0.34, 0.22, 0.34, mats.skin, 0, -0.41, 0);
    sh.add(elbow);
    sh.userData.elbow = elbow;
    elbows.push(elbow);
    torso.add(sh);
    return sh;
  });
  const head = new THREE.Group();
  head.position.y = 2.15;
  box(head, 0.66, 0.66, 0.66, mats.skin, 0, 0, 0);
  // 塊面（全罩頭盔嘅皮膚會收埋）
  const face = new THREE.Group();
  head.add(face);
  const browMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.6 });
  const brows = [];
  const cheeks = [];
  for (const s of [-1, 1]) {
    box(face, 0.15, 0.15, 0.03, 0xffffff, s * 0.15, 0.05, -0.335); // 眼白
    box(face, 0.08, 0.1, 0.03, 0x1b1b1b, s * 0.15, 0.04, -0.348); // 眼珠
    box(face, 0.03, 0.03, 0.02, 0xffffff, s * 0.15 + 0.02, 0.07, -0.362); // 反光
    brows.push(box(face, 0.16, 0.04, 0.03, browMat, s * 0.15, 0.17, -0.34)); // 眉
    cheeks.push(box(face, 0.1, 0.06, 0.02, 0xff8a80, s * 0.24, -0.08, -0.335)); // 面珠
  }
  box(face, 0.2, 0.05, 0.04, 0x8d4a3a, 0, -0.16, -0.34); // 笑口
  torso.add(head);
  // 舊 code 會讀 hat／badge：保留兩個空 Group（而家帽同徽章係皮膚衫嘅一部分）
  const hat = new THREE.Group();
  const badge = new THREE.Group();
  head.add(hat);
  torso.add(badge);

  // ---- 特別皮膚嘅配件（有自己動畫）：用 make 整，applyRangerSkin 開／收 ----
  const extras = {};
  const make = (name, parent) => {
    const e = new THREE.Group();
    e.visible = false;
    parent.add(e);
    extras[name] = e;
    return e;
  };
  const avatar = { g, torso, legs, arms, knees, elbows, head, mats, extras, hat, badge, cosmic: null, demonic: null, face, brows, browMat, cheeks, make, outfits: {}, outfit: null };
  return avatar;
}

const SM = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
const SG = (color, k = 1) => SM(color, { emissive: color, emissiveIntensity: k });

// ---- 🌠 Cosmic Meteor Ranger（小朋友 2026-10-22）----
// 深藍戰衣 + 發光藍色隕石裂紋、星空披風、膊頭水晶、發光面罩、一粒細隕石圍住你轉
// 手腳嘅裂紋用 'cosmic_xxx'（applyRangerSkin 會一齊開／收）
let capeTex = null;
function starCapeTexture() {
  if (capeTex) return capeTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#0d1b4a');
  g.addColorStop(0.6, '#1a237e');
  g.addColorStop(1, '#311b92');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 46; i++) {
    ctx.fillStyle = ['#ffffff', '#80d8ff', '#b388ff'][i % 3];
    const r = i % 7 === 0 ? 2 : 1;
    ctx.fillRect((i * 37) % 64, (i * 53 + i * i) % 128, r, r);
  }
  capeTex = new THREE.CanvasTexture(c);
  capeTex.colorSpace = THREE.SRGBColorSpace;
  capeTex.magFilter = THREE.NearestFilter;
  return capeTex;
}
function buildCosmic({ make, head, torso, arms, legs, SM, SG }) {
  const crackMat = SG(0x00e5ff, 1.6); // 一齊閃（animateCosmic 改 emissiveIntensity）
  const visorMat = SG(0x40c4ff, 2.2);
  const crystMat = SM(0x80d8ff, { emissive: 0x00b0ff, emissiveIntensity: 1.1, roughness: 0.1, metalness: 0.3 });
  const navy = SM(0x0d1b4a, { metalness: 0.5, roughness: 0.35 });
  // 一條「之」字裂紋：幾段斜斜嘅細條
  const crack = (parent, x, y, z, len, segs = 3, w = 0.035) => {
    let cx = x;
    let cy = y;
    for (let i = 0; i < segs; i++) {
      const ang = (i % 2 ? 0.5 : -0.45) + (i === 0 ? 0.2 : 0);
      const l = len / segs;
      const m = box(parent, w, l, 0.02, crackMat, cx + Math.sin(ang) * l * 0.5, cy - Math.cos(ang) * l * 0.5, z);
      m.rotation.z = ang;
      m.castShadow = false;
      cx += Math.sin(ang) * l;
      cy -= Math.cos(ang) * l;
    }
  };
  const gem = (parent, r, x, y, z, sy = 1.6, rz = 0) => {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(r), crystMat);
    c.position.set(x, y, z);
    c.scale.y = sy;
    c.rotation.z = rz;
    parent.add(c);
    return c;
  };
  // 頭盔 + 發光面罩 + 頂上水晶
  const helm = make('cosmic', head);
  box(helm, 0.74, 0.74, 0.74, navy, 0, 0.03, 0);
  box(helm, 0.62, 0.2, 0.04, visorMat, 0, 0.05, -0.375);
  box(helm, 0.66, 0.05, 0.05, crackMat, 0, -0.1, -0.37);
  for (const s of [-1, 1]) {
    const side = new THREE.Group();
    side.position.set(s * 0.375, 0, 0);
    side.rotation.y = s * Math.PI / 2;
    helm.add(side);
    crack(side, 0.05, 0.3, 0.005, 0.55, 3, 0.03);
  }
  gem(helm, 0.1, 0, 0.5, 0.05, 2);
  gem(helm, 0.06, -0.14, 0.45, 0.1, 1.6, 0.4);
  gem(helm, 0.06, 0.14, 0.45, 0.1, 1.6, -0.4);
  // 身：心口裂紋 + 隕石徽章 + 發光皮帶 + 膊頭水晶 + 星空披風 + 圍住轉嘅細隕石
  const body = make('cosmicBody', torso);
  crack(body, -0.2, 1.75, -0.24, 0.75, 4);
  crack(body, 0.25, 1.7, -0.24, 0.6, 3);
  crack(body, 0.05, 1.35, -0.24, 0.35, 2, 0.03);
  const emblem = gem(body, 0.11, 0, 1.52, -0.27, 1.3);
  emblem.rotation.y = Math.PI / 4;
  box(body, 0.88, 0.06, 0.48, crackMat, 0, 1.02, 0).castShadow = false;
  for (const s of [-1, 1]) {
    gem(body, 0.12, s * 0.66, 2.12, 0, 1.8, s * -0.35);
    gem(body, 0.08, s * 0.5, 2.05, 0.05, 1.5, s * -0.7);
    gem(body, 0.07, s * 0.78, 2.02, -0.05, 1.4, s * -0.15);
  }
  const cape = new THREE.Group(); // 披風（喺膊頭吊落嚟，會飄）
  cape.position.set(0, 1.86, 0.27);
  body.add(cape);
  const capeMat = new THREE.MeshStandardMaterial({ map: starCapeTexture(), emissive: 0xffffff, emissiveMap: starCapeTexture(), emissiveIntensity: 0.35, roughness: 0.6, side: THREE.DoubleSide });
  const capeMesh = box(cape, 0.92, 1.55, 0.04, capeMat, 0, -0.78, 0);
  const capeHem = box(cape, 0.94, 0.05, 0.06, crackMat, 0, -1.55, 0);
  capeHem.castShadow = false;
  box(cape, 0.96, 0.08, 0.1, navy, 0, -0.02, -0.02);
  capeMesh.castShadow = true;
  const orbit = new THREE.Group(); // 細隕石：圍住個身轉圈
  orbit.position.y = 1.45;
  body.add(orbit);
  const rock = new THREE.Group();
  rock.position.set(0.95, 0, 0);
  orbit.add(rock);
  const rockM = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14), SM(0x283593, { roughness: 0.8, flatShading: true }));
  rock.add(rockM);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), SG(0x18ffff, 2.4));
  core.position.set(0, 0.04, -0.06);
  rock.add(core);
  const tailMat = new THREE.MeshBasicMaterial({ color: 0x40c4ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 10, 1, true), tailMat);
  tail.rotation.x = Math.PI / 2; // 尾向後（轉圈嘅反方向），尖嘅一頭喺後面
  tail.position.z = 0.32;
  rock.add(tail);
  // 手腳：裂紋 + 發光手套／靴邊
  arms.forEach((sh, i) => {
    const e = make(`cosmic_arm${i}`, sh);
    crack(e, 0, -0.08, -0.175, 0.5, 2, 0.03);
    box(e, 0.37, 0.07, 0.37, crackMat, 0, -0.66, 0).castShadow = false;
    gem(e, 0.06, (i ? 1 : -1) * 0.18, -0.25, 0, 1.6, (i ? -1 : 1) * 0.6);
  });
  legs.forEach((hip, i) => {
    const e = make(`cosmic_leg${i}`, hip);
    crack(e, 0, -0.1, -0.195, 0.5, 2, 0.03);
    box(e, 0.42, 0.06, 0.46, crackMat, 0, -0.72, -0.02).castShadow = false;
  });
  return { crackMat, visorMat, crystMat, capeMat, cape, orbit, rock, spin: rockM, core, tail };
}

// 🌠 每格：裂紋一閃一閃、細隕石轉圈、披風跟住郁（行／跑／半空飄後）
function animateCosmic(avatar, t, a) {
  const c = avatar.cosmic;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
  c.crackMat.emissiveIntensity = 1.1 + pulse * 1.3;
  c.visorMat.emissiveIntensity = 1.8 + Math.sin(t * 2.1) * 0.5;
  c.crystMat.emissiveIntensity = 0.9 + Math.sin(t * 2.6 + 1) * 0.4;
  c.capeMat.emissiveIntensity = 0.25 + pulse * 0.2;
  c.orbit.rotation.y = t * 2.2;
  c.orbit.position.y = 1.45 + Math.sin(t * 1.7) * 0.18;
  c.spin.rotation.set(t * 3, t * 2, 0);
  c.core.rotation.y = t * 4;
  c.tail.scale.set(1, 0.85 + Math.sin(t * 12) * 0.15, 1);
  // 披風：企定輕輕飄；行／跑向後揚；跳起飄高
  const move = a ? a.move * (0.35 + a.run * 0.55) : 0;
  const air = a ? a.air * 0.5 : 0;
  c.cape.rotation.x = -(0.08 + move + air) + Math.sin(t * 2.3) * 0.05 + Math.sin(t * 9) * 0.03 * move;
  c.cape.rotation.z = Math.sin(t * 1.4) * 0.04;
}

// 🦸 超級英雄落地（Spider-Man 款）：單膝跪地、右手撳地、左手向後揚、望住前面
// land = { t（落地咗幾耐）, dur }；頭 0.06 秒落去，停住，最後 0.3 秒企返起身
export const SUPER_LAND_HOLD = 0.55;
export const SUPER_LAND_DUR = 0.85;
function applySuperLand(avatar, land, held) {
  const t = land.t;
  const w = t < 0.06 ? t / 0.06 : t < SUPER_LAND_HOLD ? 1 : Math.max(0, 1 - (t - SUPER_LAND_HOLD) / (SUPER_LAND_DUR - SUPER_LAND_HOLD));
  const k = w * w * (3 - 2 * w); // smoothstep
  if (k <= 0) return;
  const [L, R] = avatar.legs;
  const [AL, AR] = avatar.arms;
  const lerpRot = (o, x, y, z) => o.rotation.set(mix(o.rotation.x, x, k), mix(o.rotation.y, y, k), mix(o.rotation.z, z, k));
  const drop = 0.55 * k;
  avatar.g.position.y -= drop;
  avatar.g.rotation.x = mix(avatar.g.rotation.x, 0, k);
  lerpRot(L, 1.18, 0, -0.12); // 左腳向前踩地
  lerpRot(R, -1.2, 0, 0.1); // 右膝跪地
  // 上身向前傾（以髖關節 y=0.9 做軸）
  const a = -0.75 * k;
  avatar.torso.rotation.x = a;
  avatar.torso.position.set(0, 0.9 - 0.9 * Math.cos(a), -0.9 * Math.sin(a));
  if (!held) {
    lerpRot(AR, 0.9, 0, -0.15); // 右手撳地
    lerpRot(AL, -0.55, 0, -1.15); // 左手向後揚
  }
  lerpRot(avatar.head, -0.6, 0, 0); // 抬頭望前面
}

// 換護林員皮膚：身體物料 + 嗰款皮膚嘅衫（第一次著先砌）+ 特別皮膚嘅動畫配件
export function applyRangerSkin(tp, skin) {
  const av = tp.avatar;
  const { extras } = av;
  // 特別皮膚（有自己動畫）：第一次先砌
  if (skin.extra === 'cosmic' && !av.cosmic) av.cosmic = buildCosmic({ make: av.make, head: av.head, torso: av.torso, arms: av.arms, legs: av.legs, SM, SG });
  if (skin.extra === 'demonic' && !av.demonic) av.demonic = buildDemonicParts(av.make, { head: av.head, torso: av.torso, arms: av.arms, legs: av.legs }); // 😈 角、翼、尾
  for (const [name, e] of Object.entries(extras)) e.visible = !!skin.extra && (name === skin.extra || name === `${skin.extra}Body` || name.startsWith(`${skin.extra}_`));
  // 衫褲配件（rangerOutfits.js）
  const outfit = (av.outfits[skin.id] ??= buildOutfit(av, skin));
  for (const o of Object.values(av.outfits)) o.setVisible(o === outfit);
  av.outfit = outfit;
  applyBody(av.mats, outfit.body);
  const f = outfit.face;
  av.face.visible = !f.hide;
  av.browMat.color.setHex(f.brows ?? 0x4e342e);
  for (const b of av.brows) b.visible = !f.hideBrows;
  for (const c of av.cheeks) c.visible = f.cheeks !== false;
  outfit.animate(0, null, 0); // 擺好姿勢（粒子要等每格郁先出）
  tp.rainbow = !!skin.rainbow;
  tp.cosmic = skin.extra === 'cosmic'; // 🌠 動畫 + 超級英雄落地
  tp.demonic = skin.extra === 'demonic'; // 😈 飛 + 火噴射跳（demonicRanger.js）
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

// ================= 企定／行路／跑步／跳嘅動畫（小朋友 2026-10-18：要 Minecraft 款）=================
// Minecraft 款：手腳硬直，淨係喺膊頭／髖關節好似鐘擺咁擺；左手同右腳一齊向前
// 用真實移動速度決定行定跑；所有比重（move／run／air）慢慢過渡（約 0.15 秒），唔會一下跳轉
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const mix = (a, b, k) => a + (b - a) * k;

function trackMotion(tp, dt, { walking, running, grounded, vy }) {
  const a = (tp.anim ??= { v: 0, move: 0, run: 0, air: 0, phase: 0, still: 0, look: 0, lookTo: 0, lookT: 2, vy: 0 });
  const { x, z } = tp.eye.position;
  if (tp.lastX !== undefined && dt > 0) {
    const d = Math.hypot(x - tp.lastX, z - tp.lastZ);
    const v = d < 8 ? d / dt : 0; // 傳送就唔計
    a.v += (Math.min(v, 45) - a.v) * clamp01(dt * 8);
  }
  tp.lastX = x;
  tp.lastZ = z;
  const k = 1 - Math.exp(-dt / 0.15); // 約 0.15 秒過渡
  const kFast = 1 - Math.exp(-dt / 0.08);
  const moving = walking && (running || a.v > 0.6);
  a.move += ((moving ? 1 : 0) - a.move) * k;
  const runTarget = running ? 1 : clamp01((a.v - 7) / 11); // 7 m/s 以下行路，18 m/s 以上全速跑
  a.run += (runTarget - a.run) * k;
  const air = !grounded && !running;
  a.air += ((air ? 1 : 0) - a.air) * kFast;
  a.vy = vy;
  // 步伐：行慢啲、跑快啲；喺半空唔郁（手腳慢慢擺返埋中間）
  if (!air) a.phase += dt * mix(7, 12.5, a.run) * a.move;
  if (moving || air) a.still = 0;
  else a.still += dt;
  // 企定：每幾秒輕輕轉一轉頭（Minecraft 咁四圍望）
  a.lookT -= dt;
  if (a.lookT <= 0) {
    a.lookTo = Math.random() < 0.45 ? 0 : (Math.random() * 2 - 1) * 0.5;
    a.lookT = 2.5 + Math.random() * 3.5;
  }
  a.look += (a.lookTo - a.look) * clamp01(dt * 2.5);
  return a;
}

function applyLocomotion(avatar, a, { feetY, held, t }) {
  const [L, R] = avatar.legs;
  const [AL, AR] = avatar.arms;
  const { head, g } = avatar;
  const m = a.move;
  const r = a.run;
  const idle = 1 - m;
  const s = Math.sin(a.phase);

  // 行：±0.6；跑：±1.0（鐘擺咁擺）
  const swing = mix(0.6, 1.0, r) * m;
  let lx = s * swing;
  let rx = -s * swing;
  // 手同對面隻腳一齊：左手向前 = 右腳向前
  let alx = -s * swing;
  let arx = s * swing;
  // 企定：手好輕好慢咁飄（Minecraft idle）
  // 擺手時少少向外（Minecraft 都有）：由後面望都睇得出手一前一後
  let alz = -(0.05 + Math.sin(t * 0.9) * 0.035) * idle - (0.04 + Math.abs(s) * 0.09) * m;
  let arz = (0.05 + Math.sin(t * 0.9) * 0.035) * idle + (0.04 + Math.abs(s) * 0.09) * m;
  alx += Math.sin(t * 0.67) * 0.045 * idle;
  arx -= Math.sin(t * 0.67) * 0.045 * idle;
  let llz = 0;
  let rlz = 0;
  // 頭：企定四圍望；行路輕輕上下點
  let hx = Math.sin(a.phase * 2) * 0.035 * m;
  let hy = a.look * idle;
  // 跑：成個人少少向前傾
  let lean = -0.13 * r * m;
  let bob = Math.abs(Math.cos(a.phase)) * 0.045 * m;

  // 半空：雙腳併埋、雙手少少向外向上
  const air = a.air;
  if (air > 0.001) {
    lx = mix(lx, 0, air);
    rx = mix(rx, 0, air);
    llz = mix(llz, -0.05, air);
    rlz = mix(rlz, 0.05, air);
    alx = mix(alx, 0.35, air);
    arx = mix(arx, 0.35, air);
    alz = mix(alz, -0.5, air);
    arz = mix(arz, 0.5, air);
    hy *= 1 - air;
    hx = mix(hx, -0.08, air);
    bob *= 1 - air;
  }

  // 抱住寵物：雙手打直舉起托住（隻寵物喺頭頂），腳照擺
  if (held) {
    alx = Math.PI * 0.92 + s * 0.05 * m;
    arx = Math.PI * 0.92 - s * 0.05 * m;
    alz = -0.08;
    arz = 0.08;
  }

  L.rotation.set(lx, 0, llz);
  R.rotation.set(rx, 0, rlz);
  AL.rotation.set(alx, 0, alz);
  AR.rotation.set(arx, 0, arz);
  head.rotation.set(hx, hy, 0);
  g.rotation.x = lean;
  g.position.y = feetY + bob;
}

const fwd = new THREE.Vector3();

// held：手上嘅模型；item：嗰隻動物嘅資料（用嚟計真實大細）；回傳要用嚟畫畫面嘅鏡頭
export function updateThirdPerson(tp, dt, { held, item, walking, feetY, grounded = true, vy = 0, station = null, gymStation = null, time = 0, quality = 3 }) {
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
    // Minecraft 款：對腳打直向前（膝頭唔屈）
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
    if (tp.land) applySuperLand(avatar, tp.land, !!held); // 🦸 Cosmic Meteor Ranger 落地（cosmicLanding.js 設定 tp.land）
  }
  avatar.outfit?.animate(t, anim, quality); // 👕 皮膚嘅細動畫（披風、翼、羽毛、粒子…；粒子跟畫質）
  if (tp.cosmic) animateCosmic(avatar, t, anim); // 🌠 披風、細隕石、裂紋閃
  if (tp.demonic && !sitting && !gymStation) animateDemonic(avatar, t, anim, !!held); // 😈 行路 = 飛、拍翼

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
