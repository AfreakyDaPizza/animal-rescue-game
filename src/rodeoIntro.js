// 🎬 Catch & Tame 開場短片（小朋友 Issue #14 留言 2026-11-07）：
// 「when you go into the portal for the first time you will have an animation riding a horse
//   and then seeing a lot of animals escaping from the lab. like cutscene」
// 第一次喺傳送門撳 E（state.rodeoIntroSeen 未有）→ 播呢段 → 黑畫面 → 先開揀地圖面板
// 流程（約 28 秒，撳任何掣／滑鼠跳過）：
//   1. Hub 傳送門：鏡頭衝入漩渦，白光一閃
//   2. 大草原（好遠嘅一個專用佈景，SET）：你騎住馬飛奔，幾個跟拍鏡頭
//   3. 路邊間舊實驗室：警報、紅燈閃，道門「砰」一聲爆開（火花、煙），一大群動物衝出嚟
//   4. 你回頭望、匹馬企起身嘶叫，動物喺你兩邊跑過（踢起塵）
//   5. 你轉頭追過去、喺頭頂轉套索 → 黑畫面大字 → 揀地圖
// 用法：playRodeoIntro({ scene, camera, onDone })；rodeoIntro.active / .savanna 俾 rodeo.js 每格蓋天空
// 測試：game.rodeo.intro()；揀地圖面板有「🎬 Watch intro」重播

import * as THREE from 'three';
import { movie, playMovie, once, shake } from './movie.js';
import { play, addSounds } from './sound.js';
import { state } from './state.js';
import { buildAvatar, applyRangerSkin } from './thirdPerson.js';
import { RANGER_SKINS } from './skins.js';
import { buildHorse } from './rodeoModels.js';
import { buildAnimalModel } from './animalModels.js';
import { findAnimal } from './data/animals.js';
import { tameAnimal } from './data/tameAnimals.js';
import { TAME_PORTAL } from './hubShape.js';
import { makeLabel } from './signs.js';

export const rodeoIntro = { active: false, savanna: false };

const PI = Math.PI;
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
// 佈景喺 Catch & Tame 嗰邊（x = 4000）但係 +z 好遠：Catch & Tame 地圖向 -z 跑，唔會撞到
const SET = { x: 4000, z: 3000 };
const W = (x, y, z) => new THREE.Vector3(SET.x + x, y, SET.z + z);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// 實驗室（路右邊）：道門向 -x（對住條路）
const LAB = { x: 30, z: -10, w: 14, h: 9, d: 24 };
const DOOR = { x: LAB.x - LAB.w / 2, z: LAB.z, w: 6, h: 6 };
// 時間表（秒）
const T = {
  savanna: 2.4, // 傳送門 → 大草原
  alarm: 10.6, // 實驗室警報
  burst: 12.2, // 道門爆開
  stopAt: 11.4, // 馬開始慢落嚟
  stopped: 13.0,
  rear: 13.6, // 馬企起身
  rearEnd: 15.8,
  chase: 20.8, // 追動物
  end: 28,
};
const GALLOP = 13; // 馬跑幾快（米／秒）
const START_Z = 75;
const CHASE_MAX = 16; // 最後追動物：最快幾快
const CHASE_ACC = 7;

// 一群衝出嚟嘅動物（Catch & Tame 三張地圖都有啲）
const HERD = [
  ['Zebra', 6], ['Giraffe', 3], ['African Elephant', 2], ['Wildebeest', 4], ['Camel', 2], ['Dromedary', 1],
  ['Moose', 2], ['Ostrich', 2], ['Rhino', 1], ['Hippo', 1], ['Reindeer', 2], ['Bison', 2], ['Arabian Oryx', 2],
  ['Warthog', 2], ['Addax', 1], ['Cheetah', 1],
];

addSounds({
  // 🐴 馬嘶叫
  neigh: (t, { tone, noise }) => {
    tone(620, t, 0.18, { type: 'sawtooth', vol: 0.07, slide: 1.4 });
    tone(880, t + 0.16, 0.5, { type: 'sawtooth', vol: 0.06, slide: 0.55 });
    tone(900, t + 0.16, 0.5, { type: 'triangle', vol: 0.05, slide: 0.5 });
    noise(t, 0.6, { vol: 0.05, freq: 2200, q: 2, type: 'bandpass' });
  },
  // 🌀 入傳送門
  whoosh: (t, { noise, tone }) => {
    noise(t, 0.9, { vol: 0.22, freq: 900, q: 0.7, type: 'bandpass' });
    tone(220, t, 0.9, { type: 'sine', vol: 0.12, slide: 4 });
  },
  // 🐾 一大群動物跑（低沉隆隆聲 + 好多蹄聲）
  stampede: (t, { noise }) => {
    noise(t, 1.4, { vol: 0.28, freq: 160, type: 'lowpass' });
    for (let i = 0; i < 8; i++) noise(t + i * 0.16 + Math.random() * 0.05, 0.05, { vol: 0.1, freq: 500 + Math.random() * 300, q: 1.2, type: 'bandpass' });
  },
});

export function playRodeoIntro({ scene, camera, onDone }) {
  if (rodeoIntro.active) return;
  rodeoIntro.active = true;
  rodeoIntro.savanna = false;
  const back = { p: camera.position.clone(), r: camera.rotation.clone() };
  const own = []; // 自己整嘅 geometry／material（完咗 dispose；動物模型共用 cache 唔好掉）
  const mine = (x) => (own.push(x), x);
  const mat = (color, extra = {}) => mine(new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra }));
  const glow = (color, k = 2.5) => mine(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k }));
  const BOX = mine(new THREE.BoxGeometry(1, 1, 1));
  const put = (parent, m, x, y, z, sx, sy, sz, geo = BOX) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const root = new THREE.Group();
  root.name = 'rodeo-intro';
  root.position.set(SET.x, 0, SET.z);
  root.visible = false; // 頭 2.4 秒喺 Hub 傳送門
  scene.add(root);

  // ---------- 🌅 大草原佈景 ----------
  const ground = put(root, mat(0xd2ad62), 0, -0.5, -60, 700, 1, 700);
  ground.castShadow = false;
  put(root, mat(0xb08550), 0, 0.01, -60, 7, 0.02, 400).castShadow = false; // 泥路
  // 草叢（InstancedMesh：好多都唔慢）
  const grassGeo = mine(new THREE.ConeGeometry(0.35, 1, 4));
  const grass = new THREE.InstancedMesh(grassGeo, mat(0xc9a24a), 500);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 500; i++) {
    let x = rand(-120, 120);
    if (Math.abs(x) < 4.5) x += x < 0 ? -5 : 5;
    const s = rand(0.6, 1.5);
    m4.compose(V(x, s * 0.45, rand(-260, 110)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand(0, PI), 0)), V(s, s, s));
    grass.setMatrixAt(i, m4);
  }
  root.add(grass);
  // 金合歡樹（平頂）
  const trunkM = mat(0x5d4030);
  const leafM = mat(0x6b8e3a);
  const leafM2 = mat(0x597a30);
  const tree = (x, z, s = 1) => {
    put(root, trunkM, x, 1.6 * s, z, 0.45 * s, 3.2 * s, 0.45 * s);
    put(root, trunkM, x + 0.7 * s, 3.3 * s, z, 0.3 * s, 1.4 * s, 0.3 * s).rotation.z = -0.6;
    put(root, leafM, x + 0.4 * s, 4 * s, z, 5.5 * s, 0.7 * s, 4.2 * s);
    put(root, leafM2, x + 0.6 * s, 4.5 * s, z - 0.3 * s, 3.6 * s, 0.5 * s, 3 * s);
  };
  for (let i = 0; i < 34; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * rand(12, 90);
    const z = rand(-240, 100);
    if (x > 15 && x < 45 && z > -30 && z < 12) continue; // 唔好擺喺實驗室度
    tree(x, z, rand(0.8, 1.4));
  }
  // 遠山（平頂石山）+ 大石
  const rockM = mat(0xa0643c);
  const rockM2 = mat(0x8a5434);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * PI * 2;
    const r = rand(190, 230);
    put(root, i % 2 ? rockM : rockM2, Math.cos(a) * r, 8, -60 + Math.sin(a) * r, rand(30, 60), rand(12, 28), rand(20, 40));
  }
  for (let i = 0; i < 12; i++) put(root, rockM2, (i % 2 ? 1 : -1) * rand(8, 40), 0.5, rand(-200, 90), rand(1, 2.5), rand(0.8, 1.6), rand(1, 2));

  // ---------- 🔬 實驗室（簡化版：金屬 + 玻璃 + 青色發光條）----------
  const lab = new THREE.Group();
  lab.position.set(LAB.x, 0, LAB.z);
  root.add(lab);
  const metal = mat(0x4a5a78, { roughness: 0.4, metalness: 0.4, flatShading: false });
  const metal2 = mat(0x5d6d8a, { roughness: 0.45, metalness: 0.3, flatShading: false });
  const cyan = glow(0x00e5ff, 2.2);
  const glass = mine(new THREE.MeshStandardMaterial({ color: 0x80deea, emissive: 0x00838f, emissiveIntensity: 0.8, transparent: true, opacity: 0.55, roughness: 0.1 }));
  const fw = -LAB.w / 2; // 前面（向路）
  // 前面道牆分開幾嚿（中間留道門位）
  const side = (LAB.d - DOOR.w) / 2;
  put(lab, metal, 0, LAB.h / 2, 0, LAB.w - 0.6, LAB.h, LAB.d - 0.6); // 主體
  for (const s of [-1, 1]) {
    put(lab, metal2, fw, LAB.h / 2, s * (DOOR.w / 2 + side / 2), 0.6, LAB.h, side);
    for (let i = 0; i < 2; i++) put(lab, glass, fw - 0.32, 5.2, s * (DOOR.w / 2 + 1.6 + i * 3.4), 0.1, 2.2, 2.6); // 玻璃窗
    put(lab, cyan, fw - 0.34, 0.5, s * (DOOR.w / 2 + side / 2), 0.08, 0.16, side); // 地腳發光條
  }
  put(lab, metal2, fw, DOOR.h + (LAB.h - DOOR.h) / 2, 0, 0.6, LAB.h - DOOR.h, DOOR.w); // 門頂
  put(lab, cyan, fw - 0.34, LAB.h - 0.3, 0, 0.08, 0.2, LAB.d); // 頂發光條
  for (const s of [-1, 1]) put(lab, cyan, fw - 0.34, DOOR.h / 2, s * (DOOR.w / 2 + 0.2), 0.1, DOOR.h, 0.18); // 門框
  put(lab, mine(new THREE.MeshStandardMaterial({ color: 0x050a12 })), fw + 0.4, DOOR.h / 2, 0, 0.2, DOOR.h, DOOR.w); // 門後面黑黑
  // 圓頂 + 天線
  const dome = new THREE.Mesh(mine(new THREE.SphereGeometry(4, 18, 10, 0, PI * 2, 0, PI / 2)), glass);
  dome.position.set(1.5, LAB.h, 4);
  lab.add(dome);
  put(lab, metal2, -2, LAB.h + 2, -6, 0.2, 4, 0.2);
  put(lab, glow(0xff1744, 2), -2, LAB.h + 4.1, -6, 0.5, 0.5, 0.5);
  // 🚨 警報燈（屋頂三粒 + 門頂一排）：閃紅
  const alarmM = mine(new THREE.MeshStandardMaterial({ color: 0x5a0f12, emissive: 0xff1744, emissiveIntensity: 0 }));
  for (const z of [-8, 0, 8]) put(lab, alarmM, fw + 1, LAB.h + 0.45, z, 0.9, 0.9, 0.9);
  for (let i = 0; i < 5; i++) put(lab, alarmM, fw - 0.4, DOOR.h + 0.5, -2 + i, 0.3, 0.3, 0.3);
  // 招牌
  const sign = makeLabel([{ text: '🔬 RESEARCH LAB', color: '#80deea' }], 2.2);
  sign.position.set(fw - 0.6, LAB.h + 1.4, 0);
  lab.add(sign);
  // 道門（兩塊鋼門，黃黑警告間條）：爆開時飛出去
  const doorM = mat(0x78909c, { metalness: 0.5, roughness: 0.4, flatShading: false });
  const stripeM = mat(0xffd600);
  const doors = [-1, 1].map((s) => {
    const d = new THREE.Group();
    d.position.set(fw - 0.1, DOOR.h / 2, s * DOOR.w / 4);
    put(d, doorM, 0, 0, 0, 0.3, DOOR.h, DOOR.w / 2);
    for (let i = 0; i < 3; i++) put(d, stripeM, -0.17, -1.6 + i * 1.6, 0, 0.04, 0.35, DOOR.w / 2 - 0.1).rotation.x = 0.6 * s;
    lab.add(d);
    return { d, v: V(0, 0, 0), spin: V(0, 0, 0), s };
  });
  // 前面「KEEP OUT」牌 + 兩條燈柱
  const keep = makeLabel([{ text: '⚠️ KEEP OUT', color: '#ffd600' }], 1.1);
  keep.position.set(fw - 7, 2.4, DOOR.w / 2 + 4);
  lab.add(keep);
  put(lab, metal2, fw - 7, 1, DOOR.w / 2 + 4, 0.15, 2, 0.15);

  // ---------- 🤠 你 + 🐎 匹馬 ----------
  // rig（喺地面，跟住條路）→ rear（後腳做軸，企起身用）→ 馬 + 公仔
  const rig = new THREE.Group();
  root.add(rig);
  const rear = new THREE.Group();
  rear.position.z = 0.7;
  rig.add(rear);
  const horse = buildHorse(0);
  horse.position.z = -0.7;
  horse.traverse((o) => o.isMesh && (o.castShadow = true));
  rear.add(horse);
  const me = buildAvatar();
  applyRangerSkin({ avatar: me }, RANGER_SKINS.find((r) => r.id === state.rangerSkin) || RANGER_SKINS[0]);
  me.g.position.set(0, 2.2 - 0.88, -0.75);
  me.g.traverse((o) => o.isMesh && (o.castShadow = true));
  rear.add(me.g);
  // 🪢 頭頂轉嘅套索圈（最後追動物先出）
  const ropeM = mat(0xd7b98e);
  const loop = new THREE.Group();
  const ring = new THREE.Mesh(mine(new THREE.TorusGeometry(0.9, 0.06, 6, 24)), ropeM);
  ring.rotation.x = PI / 2;
  loop.add(ring);
  loop.position.set(0.55, 4.2, -0.6);
  loop.visible = false;
  rear.add(loop);
  const riderZ = (t) => {
    const k = Math.max(0, t - T.savanna);
    const run = T.stopAt - T.savanna;
    if (k <= run) return START_Z - GALLOP * k;
    const z1 = START_Z - GALLOP * run;
    const dur = T.stopped - T.stopAt;
    const s = Math.min(dur, k - run);
    let z = z1 - GALLOP * s + (GALLOP / (2 * dur)) * s * s; // 慢慢停
    if (t > T.chase) {
      // 再起步：加速到 CHASE_MAX，之後一路咁快
      const c = t - T.chase;
      const ta = CHASE_MAX / CHASE_ACC;
      z -= c < ta ? (CHASE_ACC * c * c) / 2 : (CHASE_ACC * ta * ta) / 2 + CHASE_MAX * (c - ta);
    }
    return z;
  };
  const riderSpeed = (t) => (t < T.stopAt ? GALLOP : t < T.stopped ? GALLOP * (1 - (t - T.stopAt) / (T.stopped - T.stopAt)) : t > T.chase ? Math.min(CHASE_MAX, CHASE_ACC * (t - T.chase)) : 0);

  // ---------- 🐾 一大群動物 ----------
  const herd = [];
  let n = 0;
  for (const [name, count] of HERD) {
    const info = tameAnimal(name);
    if (!info) continue;
    for (let c = 0; c < count; c++) {
      const inner = buildAnimalModel(findAnimal(name) || info);
      const h = Math.max(1.6, info.h);
      inner.scale.multiplyScalar(h / Math.max(0.1, inner.userData.height || 1));
      inner.traverse((o) => o.isMesh && (o.castShadow = true));
      const holder = new THREE.Group();
      holder.add(inner);
      holder.visible = false;
      root.add(holder);
      const big = h > 2.6;
      const sideSign = n % 2 ? 1 : -1;
      const lane = sideSign * (big ? rand(6, 15) : rand(4, 14));
      herd.push({
        holder, inner, info, h, lane,
        t0: T.burst + 0.15 + n * 0.13 + Math.random() * 0.1,
        x: DOOR.x + 1, z: DOOR.z + rand(-2, 2), vx: -1, vz: 0, step: 0,
        spd: rand(11, 14) * (big ? 0.92 : 1), dustT: Math.random() * 0.2,
      });
      n++;
    }
  }
  // 💨 塵：一嚿嚿方塊，慢慢變大、變淡
  const dustGeo = mine(new THREE.BoxGeometry(1, 1, 1));
  const puffs = Array.from({ length: 160 }, () => {
    const m = new THREE.Mesh(dustGeo, mine(new THREE.MeshStandardMaterial({ color: 0xd8b47c, transparent: true, opacity: 0, depthWrite: false })));
    m.visible = false;
    root.add(m);
    return { m, life: 0, max: 1, v: V(0, 0, 0) };
  });
  let puffI = 0;
  const puff = (x, y, z, size, life, vy = 1, color = 0xd8b47c) => {
    const p = puffs[puffI++ % puffs.length];
    p.m.position.set(x, y, z);
    p.m.scale.setScalar(size);
    p.m.rotation.set(rand(0, 3), rand(0, 3), 0);
    p.m.material.color.setHex(color);
    p.m.visible = true;
    p.life = 0;
    p.max = life;
    p.size = size;
    p.gray = color !== 0xd8b47c; // 煙（灰色）濃啲，塵淡啲
    p.v.set(rand(-0.6, 0.6), vy, rand(-0.6, 0.6));
  };
  // ✨ 火花（道門爆開）
  const sparkM = glow(0xffd740, 3);
  const sparkGeo = mine(new THREE.OctahedronGeometry(0.14));
  const sparks = Array.from({ length: 50 }, () => {
    const m = new THREE.Mesh(sparkGeo, sparkM);
    m.visible = false;
    root.add(m);
    return { m, v: V(0, 0, 0) };
  });

  // 🚨 警報紅光（畫面四邊）
  const alarmFx = document.createElement('div');
  alarmFx.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;z-index:2;background:radial-gradient(circle, rgba(0,0,0,0) 45%, rgba(220,30,40,0.55) 100%)';
  $('movie').appendChild(alarmFx);

  // ---------- 🎥 鏡頭（每格自己計，跟住馬／動物）----------
  const P = TAME_PORTAL;
  const riderPos = V(0, 0, 0);
  const shots = [
    // 0. Hub：衝入傳送門
    [0, T.savanna, (k) => [V(P.x - 9 + 7.6 * k * k, 3.1, P.z), V(P.x + 2, 3.4, P.z)]],
    // 1. 大草原：低角度，馬由遠處衝過嚟、跑過鏡頭
    [T.savanna, 6.6, (k, t, r) => [W(-8, 1.3, 26 - k * 4), W(r.x, 1.8, r.z)]],
    // 2. 跟拍：喺馬左前面，望返轉頭（見到後面間實驗室）
    [6.6, 10.4, (k, t, r) => [W(r.x - 7 + k * 2, 3 - k * 0.4, r.z - 6.5), W(r.x + 3, 2, r.z + 3)]],
    // 3. 實驗室：警報 → 道門爆開 → 動物衝出嚟
    [10.4, 13.8, (k) => [W(-5 - k * 1.5, 2.6 + k * 0.6, -33 + k * 3), W(DOOR.x, 3, DOOR.z - 1)]],
    // 4. 你回頭望、匹馬企起身（後面一大群衝緊過嚟）
    [13.8, 17.2, (k, t, r) => [W(r.x - 2.6 - k * 0.6, 2.4, r.z - 6.5 - k * 0.8), W(r.x, 2.6, r.z + 2)]],
    // 5. 大場面：側邊高位，動物喺你兩邊跑過
    [17.2, 21.2, (k, t, r) => [W(-20 + k * 2, 6.5 + k * 1.5, r.z - 6 - k * 14), W(0, 1.5, r.z - 10 - k * 12)]],
    // 6. 英雄鏡頭：正面低角度，你一路追一路轉套索
    [21.2, 24, (k, t, r) => [W(r.x + 3.2, 1.6, r.z - 8.5), W(r.x, 2.9, r.z)]],
    // 7. 後面：你追住前面一大群動物，向住日落
    [24, T.end, (k, t, r) => [W(r.x + 4, 3 + k * 2, r.z + 8 + k * 2), W(r.x, 2, r.z - 22)]],
  ];
  let lastShot = -1;
  const blink = () => {
    const b = $('movie-blink');
    b.classList.remove('on');
    void b.offsetWidth;
    b.classList.add('on');
  };
  const moveCam = (t) => {
    const i = shots.findIndex(([a, b]) => t >= a && t < b);
    if (i < 0) return;
    if (i !== lastShot) {
      lastShot = i;
      if (i > 1) blink(); // 0 → 1 用白光，唔使黑閃
    }
    const [a, b, f] = shots[i];
    const k = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
    const [p, l] = f(k, t, riderPos);
    camera.position.copy(p);
    return l;
  };

  const fade = $('movie-fade');
  let lastGallop = 0;
  let lastAlarm = 0;
  let lastRumble = 0;
  playMovie(camera, {
    length: T.end,
    shots: [], // 鏡頭喺 update 自己郁（要跟住馬）
    captions: [
      [T.savanna + 0.4, '🌅 Far, far away... on the wild savanna...'],
      [6.6, '🐎 You are riding out on patrol, partner!'],
      [8.8, '🔬 ...past the old Research Lab.'],
      [T.alarm, '🚨 BEEP! BEEP! BEEP! The Lab alarm is going off!'],
      [T.burst + 0.1, '💥 CRASH! The big door burst open!'],
      [13.8, '🚨 The animals escaped from the Lab!'],
      [17.2, '🦓🦒🐘 Zebras, giraffes, elephants, camels... they are running everywhere!'],
      [21.2, '🤠 Lasso them, tame them, and bring them home safe!'],
    ],
    lines: [
      [14.6, 16.6, () => me.head, 'Whoa, horsey! Easy there!', 'ranger'],
      [21.6, 23.8, () => me.head, "Yee-haw! Let's go, partner!", 'ranger'],
    ],
    final: { at: 26, html: 'Ready, partner?<span>🤠 CATCH & TAME</span><small>Pick a map and start taming! 🐎🪢</small>' },
    update(t, dt) {
      // ---- 1. 傳送門 → 白光 → 大草原 ----
      if (once('portal')) play('portal');
      if (t > 1.3 && once('whoosh')) play('whoosh');
      if (t < T.savanna) {
        fade.style.background = '#fff';
        fade.style.opacity = Math.max(0, (t - 1.5) / (T.savanna - 1.5));
        shake(0.04 * t);
      } else if (t < T.savanna + 1) {
        if (once('cut')) {
          root.visible = true;
          rodeoIntro.savanna = true; // rodeo.js：每格蓋返大草原個天
          play('swoosh');
        }
        fade.style.opacity = 1 - (t - T.savanna);
      } else if (once('fadeBack')) {
        fade.style.opacity = 0;
        fade.style.background = '#000';
      }

      // ---- 2. 匹馬 ----
      const z = riderZ(t);
      riderPos.set(0, 0, z);
      rig.position.set(0, 0, z);
      const spd = riderSpeed(t);
      const moving = Math.min(1, spd / 6);
      const rearK = t > T.rear && t < T.rearEnd ? Math.sin(((t - T.rear) / (T.rearEnd - T.rear)) * PI) : 0;
      rear.rotation.x = rearK * 0.75;
      horse.userData.animate?.(t * 1.6, Math.max(moving, rearK));
      rig.position.y = moving > 0.2 ? Math.abs(Math.sin(t * 9)) * 0.12 * moving : 0;
      if (spd > 4 && t > T.savanna && t - lastGallop > 0.34 - spd * 0.008) {
        lastGallop = t;
        play('gallop');
      }
      if (spd > 3 && t > T.savanna && Math.random() < dt * 14) puff(rand(-0.6, 0.6), 0.3, z + 1.4, rand(0.5, 0.9), 0.9, 0.8);
      if (t > T.rear + 0.2 && once('neigh')) {
        play('neigh');
        shake(0.12);
      }
      if (t > T.rearEnd - 0.1 && once('land')) for (let i = 0; i < 8; i++) puff(rand(-1.4, 1.4), 0.2, z - 1.4 + rand(-0.6, 0.6), rand(0.4, 0.7), 0.9, 0.4);

      // ---- 公仔姿勢：騎馬 → 回頭望 → 轉套索 ----
      me.legs.forEach((l, i) => l.rotation.set(1.15, 0, (i ? 1 : -1) * 0.45));
      me.knees.forEach((k) => k.rotation.set(0, 0, 0));
      me.elbows.forEach((e) => e.rotation.set(0, 0, 0));
      me.torso.position.set(0, 0, 0);
      const look = t > T.burst + 0.3 && t < T.chase ? Math.min(1, (t - T.burst - 0.3) * 2.5) : 0; // 聽到「砰」→ 回頭
      me.torso.rotation.set(-0.12 - rearK * 0.25, look * 0.9, 0);
      me.head.rotation.set(0, look * 0.8, 0);
      const lasso = t > T.chase + 0.4;
      loop.visible = lasso;
      if (lasso) {
        loop.rotation.y += dt * 9;
        me.arms[0].rotation.set(PI - 0.25, 0, -0.2 + Math.sin(t * 9) * 0.15);
        me.arms[1].rotation.set(0.75, 0, -0.15);
        if (once('swing')) play('lassoSwing');
      } else if (rearK > 0.05) {
        me.arms[0].rotation.set(1.2, 0, 0.3);
        me.arms[1].rotation.set(1.2, 0, -0.3);
      } else {
        me.arms[0].rotation.set(0.75, 0, 0.15);
        me.arms[1].rotation.set(0.75, 0, -0.15);
      }

      // ---- 3. 實驗室：警報、紅燈、道門爆開 ----
      if (t > T.alarm && t < 19) {
        const on = Math.floor(t * 3) % 2 === 0;
        alarmM.emissiveIntensity = on ? 4 : 0.3;
        alarmFx.style.opacity = t < 17 ? (on ? 1 : 0.35) : 0;
        if (t - lastAlarm > 1.1 && t < 17) {
          lastAlarm = t;
          play('alarm');
        }
      } else {
        alarmM.emissiveIntensity = 0;
        alarmFx.style.opacity = 0;
      }
      if (t > T.alarm && t < T.burst) {
        doors.forEach((d, i) => (d.d.position.x = fw - 0.1 + Math.sin(t * 50 + i) * 0.06)); // 道門震
        if (t > T.burst - 0.8) shake(0.05);
      }
      if (t > T.burst && once('burst')) {
        play('boom');
        play('slam');
        shake(0.45);
        doors.forEach((d) => {
          d.v.set(-rand(9, 13), rand(4, 7), d.s * rand(3, 6));
          d.spin.set(rand(-3, 3), rand(-4, 4), d.s * rand(2, 4));
        });
        for (const s of sparks) {
          s.m.position.set(DOOR.x - 0.5, rand(1, DOOR.h), DOOR.z + rand(-DOOR.w / 2, DOOR.w / 2));
          s.m.visible = true;
          s.v.set(-rand(3, 10), rand(2, 9), rand(-6, 6));
        }
        for (let i = 0; i < 26; i++) puff(DOOR.x - rand(0.5, 3), rand(0.5, 5), DOOR.z + rand(-3.5, 3.5), rand(1.5, 2.8), rand(2, 3.4), rand(0.6, 1.6), 0x8d959c);
      }
      if (t > T.burst) {
        for (const d of doors) {
          if (d.d.position.y <= 0.2 && d.v.lengthSq() === 0) continue;
          d.v.y -= 22 * dt;
          d.d.position.addScaledVector(d.v, dt);
          d.d.rotation.x += d.spin.x * dt;
          d.d.rotation.y += d.spin.y * dt;
          d.d.rotation.z += d.spin.z * dt;
          if (d.d.position.y < 0.2) {
            d.d.position.y = 0.2;
            d.d.rotation.set(0, d.d.rotation.y, PI / 2);
            d.v.set(0, 0, 0);
            if (once(`door${d.s}`)) play('hit');
          }
        }
        for (const s of sparks) {
          if (!s.m.visible) continue;
          s.v.y -= 14 * dt;
          s.m.position.addScaledVector(s.v, dt);
          s.m.rotation.y += dt * 9;
          if (s.m.position.y < 0) s.m.visible = false;
        }
        if (t < 18 && Math.random() < dt * 8) puff(DOOR.x - 1, rand(1, 4), DOOR.z + rand(-2.5, 2.5), rand(1.2, 2.2), 2.5, 1.2, 0x8d959c); // 門口一直有煙
        if (t - lastRumble > 1.3 && t < 23) {
          lastRumble = t;
          play('stampede');
          if (t > 13.5 && t < 21) shake(0.06);
        }
      }

      // ---- 4. 動物衝出嚟：出門口 → 散開去兩邊行 → 沿住條路一直跑 ----
      for (const a of herd) {
        if (t < a.t0) continue;
        if (!a.holder.visible) {
          a.holder.visible = true;
          play('pop');
        }
        let tx;
        let tz;
        if (a.step === 0) {
          tx = a.lane + (a.lane > 0 ? 2 : -2);
          tz = DOOR.z - 16;
          if (Math.hypot(tx - a.x, tz - a.z) < 4) a.step = 1;
        } else {
          tx = a.lane;
          tz = a.z - 40;
        }
        const dx = tx - a.x;
        const dz = tz - a.z;
        const d = Math.hypot(dx, dz) || 1;
        const turn = Math.min(1, dt * 3.2);
        a.vx += (dx / d - a.vx) * turn;
        a.vz += (dz / d - a.vz) * turn;
        const vl = Math.hypot(a.vx, a.vz) || 1;
        a.x += (a.vx / vl) * a.spd * dt;
        a.z += (a.vz / vl) * a.spd * dt;
        a.holder.position.set(a.x, Math.abs(Math.sin(t * 8 + a.lane)) * 0.08, a.z);
        a.holder.rotation.y = Math.atan2(-a.vx, -a.vz);
        a.inner.userData.animate?.(t * 1.7 * (a.info.speed || 1), 1);
        a.dustT -= dt;
        if (a.dustT < 0) {
          a.dustT = 0.16 + Math.random() * 0.12;
          puff(a.x + rand(-0.4, 0.4), 0.25, a.z + a.h * 0.4, rand(0.4, 0.7) * Math.min(1.6, a.h / 1.8), 0.9, 0.7);
        }
      }

      // ---- 💨 塵 ----
      for (const p of puffs) {
        if (!p.m.visible) continue;
        p.life += dt;
        const k = p.life / p.max;
        if (k >= 1) {
          p.m.visible = false;
          continue;
        }
        p.m.position.addScaledVector(p.v, dt);
        p.m.scale.setScalar(p.size * (1 + k * 1.2));
        p.m.material.opacity = (p.gray ? 0.6 : 0.32) * (1 - k);
      }

      // ---- 🎥 鏡頭 ----
      const l = moveCam(t);
      if (l) movie.lookAt.copy(l); // movie.js 冇 shot 嗰陣照樣 cam.lookAt(movie.lookAt)
      return null;
    },
    onDone() {
      // 跳過都要執返好：拆晒佈景、天空交返日夜系統、鏡頭返傳送門前面
      scene.remove(root);
      for (const x of own) x.dispose?.();
      // Issue #18：再睇多次唔好越積越多：招牌（canvas texture）、自己個公仔嘅材質、草（InstancedMesh buffer）
      for (const l of [sign, keep]) {
        l.material.map?.dispose();
        l.material.dispose();
      }
      me.g.traverse((o) => o.isMesh && o.material.dispose?.());
      grass.dispose();
      alarmFx.remove();
      fade.style.background = '#000';
      fade.style.opacity = 0;
      camera.position.copy(back.p);
      camera.rotation.copy(back.r);
      rodeoIntro.active = false;
      rodeoIntro.savanna = false;
      onDone?.();
    },
  });
}
