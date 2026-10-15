// 開場動畫（小朋友 2026-10-15 Issue #1 寫嘅故事；之後話要「好似電影」）：
// 1. Owner 瞓喺吊床食 pizza，動物喺隔籬開心咁玩
// 2. 佢覺得怪怪地……望一望枱面杯水：水喺度震！
// 3. Boss 衝入嚟捉走動物（Owner 頭頂出「!」）
// 4. Owner 追，追唔到
// 5. 佢用手機搜尋「top tier ranger」
// 6. Ranger 揸車由大門入嚟，同 Owner 握手
// 7. 畫面變黑：「YOU are the ranger! ...」
// 電影感：上下黑邊、鏡頭慢慢郁（每個鏡頭由 from 移去 to）、對白泡泡、地震時畫面震、轉鏡頭時閃黑
// 撳任何掣／滑鼠跳過

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ANIMALS } from './data/animals.js';
import { buildAnimalModel } from './animalModels.js';
import { buildBossRig, animateRig } from './bosses.js';
import { buildAvatar, applyRangerSkin } from './thirdPerson.js';
import { RANGER_SKINS } from './skins.js';
import { state } from './state.js';
import { makeLabel, makeSign, THEMES } from './signs.js';
import { park, HAMMOCK, DESK, PARK_GATE, lieOnHammock, standUp, setGateOpen } from './hubPark.js';
import { play } from './sound.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PLAY_SPOT = V(-10, 0, 49); // 動物玩嘅地方（吊床隔籬）
const MEET = V(0, 0, 52); // 握手嘅位
const SEARCH = 'top tier ranger';

// 每一幕幾時開始（秒）
const T = { relax: 0, strange: 7, glass: 9.5, bosses: 13, capture: 15.5, chase: 19.5, phone: 24.5, ranger: 31, shake: 37.5, black: 42.5 };
const LENGTH = 48;

// 鏡頭表：[開始, 完, 由 {p 位置, l 望住}, 去 {p, l}]；冇寫嘅時間鏡頭跟住角色（見 follow）
const H = HAMMOCK;
const SHOTS = [
  [0, 7, { p: V(-8, 6, 42.5), l: V(-14, 1, 50) }, { p: V(-14.5, 2.8, 45), l: V(-19, 1.3, 50) }], // 慢慢推近吊床
  [7, 9.5, { p: V(H.x + 0.5, 2.6, H.z - 3.4), l: V(H.x - 1.2, 1.8, H.z) }, { p: V(H.x + 0.2, 2.3, H.z - 2.6), l: V(H.x - 1.2, 1.8, H.z) }], // Owner 個樣
  [9.5, 13, { p: V(DESK.x + 0.7, 1.55, DESK.z - 1.1), l: V(DESK.x - 0.35, 1.2, DESK.z) }, { p: V(DESK.x + 0.35, 1.4, DESK.z - 0.7), l: V(DESK.x - 0.35, 1.2, DESK.z) }], // 杯水
  [13, 15.5, { p: V(-9, 1.4, 57), l: V(-8, 2.4, 36) }, { p: V(-9.5, 1.2, 55.5), l: V(-9, 2.2, 42) }], // 低角度：Boss 衝埋嚟
  [15.5, 19.5, { p: V(0, 12, 60), l: V(-9, 0, 46) }, { p: V(-2, 9, 58), l: V(-9, 0, 44) }], // 高角度：捉動物
  [31, 34.5, { p: V(3.2, 1.1, 56.5), l: V(0, 1.6, 80) }, { p: V(3.6, 1.3, 55), l: V(0, 1.4, 60) }], // 喺大門入面望住架車入嚟
  [34.5, 37.5, { p: V(0, 2.9, 46), l: V(0, 2.0, 53) }, { p: V(0, 2.7, 47), l: V(0, 2.1, 53) }], // 兩個人
  [37.5, 40, { p: V(-0.2, 2.6, 48.6), l: V(0, 2.1, 52) }, { p: V(0, 2.5, 49.2), l: V(0, 2.1, 52) }], // 握手
  [40, 42.5, { p: V(-0.2, 3.0, 48.0), l: V(MEET.x + 1.1, 2.9, MEET.z) }, { p: V(0.2, 3.0, 48.7), l: V(MEET.x + 1.1, 2.9, MEET.z) }], // Ranger 近鏡
];

// 對白（幾時開始、幾時完、邊個講、講乜）
const LINES = [
  [1.2, 5.2, 'owner', 'Mmm... pizza! 🍕'],
  [7.4, 9.4, 'owner', 'Hmm? Something feels strange...'],
  [15.8, 18.8, 'owner', 'WHAT?! NO! My animals!'],
  [20, 22.5, 'owner', 'Come back!!'],
  [22.6, 24.4, 'owner', 'They are too fast... 😢'],
  [25, 28, 'owner', 'I need the best ranger...'],
  [35, 37.4, 'owner', 'Thank you for coming!'],
  [38, 40, 'owner', 'Please save my animals!'],
  [40.2, 42.4, 'ranger', "Don't worry. I'll save them ALL! 💪"],
];
// 旁白（下面黑邊入面）
const CAPTIONS = [
  [0, 'At the Animal Rescue Park, the owner was having a lazy afternoon...'],
  [9.5, 'Then the ground started to shake!'],
  [13, 'The BOSSES came to capture the animals!'],
  [19.5, 'He tried to catch them back... but they were too fast.'],
  [24.5, 'So he searched his phone for help...'],
  [31, 'And the TOP TIER RANGER arrived!'],
  [37.5, ''],
];

export function createIntro(scene, camera) {
  const root = new THREE.Group();
  scene.add(root);

  // 12 隻隨機動物喺吊床隔籬玩
  const pool = [...ANIMALS].sort(() => Math.random() - 0.5).slice(0, 12);
  const animals = pool.map((animal, i) => {
    const model = buildAnimalModel(animal);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.scale.multiplyScalar(Math.min(1, 2.0 / Math.max(size.x, size.y, size.z)));
    if (model.userData.move === 'fly') model.userData.flying = false;
    const g = new THREE.Group();
    g.add(model);
    const a = (i / 12) * Math.PI * 2;
    g.position.set(PLAY_SPOT.x + Math.cos(a) * 4.5, 0, PLAY_SPOT.z + Math.sin(a) * 3.5);
    root.add(g);
    const heart = makeLabel([{ text: '❤', color: '#ff4081' }], 0.5);
    heart.position.y = new THREE.Box3().setFromObject(model).max.y + 0.6;
    g.add(heart);
    return { g, model, heart, target: g.position.clone(), wait: Math.random() * 2, caged: false, cage: null, boss: null };
  });

  // 6 個 Boss：喺噴水池嗰邊等，第 3 幕衝埋嚟
  const bosses = [0, 1, 2, 3, 4, 5].map((i) => {
    const rig = buildBossRig(i);
    const group = new THREE.Group();
    group.add(rig.g);
    group.position.set(-17 + i * 3.6, 0, 30 - (i % 2) * 2);
    group.visible = false;
    root.add(group);
    return { rig, group, runPhase: 0, targets: [animals[i * 2], animals[i * 2 + 1]], step: 0 };
  });

  // Owner 手上嘅 pizza
  const slice = new THREE.Group();
  slice.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 3), new THREE.MeshStandardMaterial({ color: 0xffb300 })));
  for (let i = 0; i < 3; i++) {
    const pep = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8), new THREE.MeshStandardMaterial({ color: 0xd32f2f }));
    pep.position.set((i - 1) * 0.08, 0.04, 0.02 * i);
    slice.add(pep);
  }
  slice.rotation.z = Math.PI / 2;
  slice.position.set(0, -1.12, -0.18);
  park.owner.arms[1].add(slice);
  park.pizza.visible = false;

  // Ranger + 架車（喺大門外面等）
  const ranger = buildAvatar();
  applyRangerSkin({ avatar: ranger }, RANGER_SKINS.find((s) => s.id === state.rangerSkin) || RANGER_SKINS[0]);
  ranger.g.scale.setScalar(1.2);
  ranger.g.visible = false;
  root.add(ranger.g);
  const jeep = buildJeep();
  jeep.g.position.set(PARK_GATE.x, 0, PARK_GATE.z + 40);
  root.add(jeep.g);

  // 「?」（覺得怪怪地）
  const question = makeLabel([{ text: '?', color: '#ffeb3b' }], 1.6);
  question.visible = false;
  park.owner.head.add(question);
  question.position.y = 1.5;
  park.owner.label.visible = false; // 電影入面唔使名牌

  const intro = {
    active: true, time: 0, root, animals, bosses, camera, scene, ranger, jeep, slice, question,
    ownerPhase: 0, rangerPhase: 0, typed: 0, cues: new Set(), shake: 0, lookAt: new THREE.Vector3(), lastShot: -2,
  };

  document.body.classList.add('movie');
  const overlay = $('intro');
  overlay.hidden = false;
  const skip = () => finish(intro);
  intro.skipHandler = skip;
  window.addEventListener('keydown', skip, { once: true });
  overlay.addEventListener('click', skip, { once: true });
  return intro;
}

// 方塊 Ranger 吉普車：圓角車身、防滾架、後備胎、車頭格柵、警示燈、腳印標誌
function buildJeep() {
  const g = new THREE.Group();
  const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
  const part = (geo, m, x, y, z) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  const RB = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2);
  const green = M(0x689f38);
  const dark = M(0x33691e);
  const black = M(0x212121);
  const chrome = M(0xcfd8dc, { metalness: 0.9, roughness: 0.2 });
  part(RB(2.5, 0.9, 4.6), green, 0, 1.05, 0); // 車身
  part(RB(2.6, 0.2, 4.7), dark, 0, 0.62, 0); // 車底邊
  part(RB(2.4, 0.5, 1.6), green, 0, 1.7, -1.4); // 車頭蓋
  for (const s of [-1, 1]) for (const z of [-1.5, 1.5]) part(RB(0.5, 0.35, 1.3), dark, s * 1.2, 1.25, z); // 輪弧
  // 擋風玻璃 + 防滾架
  part(RB(2.3, 0.9, 0.08), M(0x81d4fa, { transparent: true, opacity: 0.5, roughness: 0.05 }), 0, 2.4, -0.5).rotation.x = -0.15;
  part(RB(2.4, 0.1, 0.12), black, 0, 2.85, -0.45);
  for (const s of [-1, 1]) {
    part(RB(0.12, 1.4, 0.12), black, s * 1.15, 2.2, -0.5);
    part(RB(0.12, 1.5, 0.12), black, s * 1.15, 2.25, 1.6);
    part(RB(0.12, 0.12, 2.1), black, s * 1.15, 2.95, 0.55);
    part(RB(0.25, 0.2, 0.1), chrome, s * 1.35, 2.1, -0.6); // 倒後鏡
  }
  part(RB(2.42, 0.12, 0.12), black, 0, 2.95, 1.6);
  // 座位
  for (const s of [-1, 1]) {
    part(RB(0.8, 0.25, 0.8), M(0x5d4037), s * 0.55, 1.6, 0.4);
    part(RB(0.8, 0.9, 0.2), M(0x5d4037), s * 0.55, 2.0, 0.8);
  }
  // 車頭：格柵、大燈、保險槓
  for (let i = 0; i < 6; i++) part(RB(0.1, 0.45, 0.06), black, -0.5 + i * 0.2, 1.15, -2.32);
  for (const s of [-1, 1]) {
    part(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16), M(0xfff9c4, { emissive: 0xfff59d, emissiveIntensity: 2 }), s * 0.85, 1.2, -2.32).rotation.x = Math.PI / 2;
    part(RB(0.5, 0.2, 0.25), M(s > 0 ? 0x2979ff : 0xff1744, { emissive: s > 0 ? 0x2979ff : 0xff1744, emissiveIntensity: 2.5 }), s * 0.45, 3.1, 0.55); // 警示燈
  }
  part(RB(2.7, 0.3, 0.35), black, 0, 0.7, -2.4);
  part(RB(2.7, 0.3, 0.35), black, 0, 0.7, 2.4);
  // 後備胎
  part(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16), black, 0, 1.5, 2.5).rotation.x = Math.PI / 2;
  part(new THREE.CylinderGeometry(0.25, 0.25, 0.32, 12), chrome, 0, 1.5, 2.5).rotation.x = Math.PI / 2;
  part(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), black, -1.1, 3.3, 1.6); // 天線
  const wheels = [];
  for (const [x, z] of [[-1.25, -1.5], [1.25, -1.5], [-1.25, 1.5], [1.25, 1.5]]) {
    const w = new THREE.Group();
    w.position.set(x, 0.6, z);
    g.add(w);
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.45, 18), black);
    tyre.rotation.z = Math.PI / 2;
    tyre.castShadow = true;
    w.add(tyre);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.47, 6), chrome);
    hub.rotation.z = Math.PI / 2;
    w.add(hub);
    wheels.push(w);
  }
  for (const s of [-1, 1]) {
    const sign = makeSign([{ text: '🐾 RANGER', size: 0.48 }], 2.4, 0.6, THEMES.green);
    sign.position.set(s * 1.27, 1.05, 0.3);
    sign.rotation.y = s * Math.PI / 2;
    g.add(sign);
  }
  return { g, wheels };
}

// 籠：由天跌落嚟罩住動物
function makeCage() {
  const g = new THREE.Group();
  const bar = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, metalness: 0.8, roughness: 0.3 });
  for (let i = 0; i < 5; i++) {
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 0.08), bar);
      a.position.set(-1 + i * 0.5, 1.2, s * 1);
      g.add(a);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 0.08), bar);
      b.position.set(s * 1, 1.2, -1 + i * 0.5);
      g.add(b);
    }
  }
  for (const y of [0.05, 2.4]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 2.1), bar);
    plate.position.y = y;
    g.add(plate);
  }
  return g;
}

// ---------- 電影效果 ----------
function caption(text) {
  const el = $('intro-caption');
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  if (text) el.classList.add('show');
}

const ease = (k) => k * k * (3 - 2 * k);
// 鏡頭跟鏡頭表；冇鏡頭嘅時間就由 follow 決定（跟住角色）
function updateCamera(intro, t, dt, follow) {
  const cam = intro.camera;
  const i = SHOTS.findIndex(([a, b]) => t >= a && t < b);
  if (i !== intro.lastShot) {
    intro.lastShot = i;
    // 轉鏡頭：閃一閃黑
    const blink = $('intro-blink');
    blink.classList.remove('on');
    void blink.offsetWidth;
    blink.classList.add('on');
  }
  if (i >= 0) {
    const [a, b, from, to] = SHOTS[i];
    const k = ease((t - a) / (b - a));
    cam.position.lerpVectors(from.p, to.p, k);
    intro.lookAt.lerpVectors(from.l, to.l, k);
  } else if (follow) {
    const [p, l] = follow;
    if (intro.followReset) {
      cam.position.copy(p);
      intro.lookAt.copy(l);
      intro.followReset = false;
    } else {
      cam.position.lerp(p, Math.min(1, dt * 3));
      intro.lookAt.lerp(l, Math.min(1, dt * 3));
    }
  }
  // 地震／Boss 衝埋嚟：畫面震
  intro.shake = Math.max(0, intro.shake - dt * 0.6);
  if (intro.shake > 0) cam.position.add(V((Math.random() - 0.5) * intro.shake, (Math.random() - 0.5) * intro.shake, (Math.random() - 0.5) * intro.shake));
  cam.lookAt(intro.lookAt);
}

// 對白泡泡：跟住講嘢嗰個人個頭（3D 位置 → 畫面位置）
const headPos = new THREE.Vector3();
function updateBubble(intro, t) {
  const el = $('intro-bubble');
  const line = LINES.find(([a, b]) => t >= a && t < b);
  if (!line) {
    el.classList.remove('show');
    return;
  }
  const [a, , who, text] = line;
  const target = who === 'owner' ? park.owner.head : intro.ranger.head;
  target.getWorldPosition(headPos);
  headPos.y += who === 'owner' ? 1.1 : 1.0;
  intro.camera.updateMatrixWorld();
  headPos.project(intro.camera);
  const shown = text.slice(0, Math.floor((t - a) * 28)); // 一個一個字出
  if (el.dataset.text !== shown) {
    el.dataset.text = shown;
    el.textContent = shown;
    el.classList.toggle('ranger', who === 'ranger');
  }
  el.classList.toggle('show', headPos.z < 1 && shown.length > 0);
  const x = Math.min(0.85, Math.max(0.15, headPos.x * 0.5 + 0.5));
  const y = Math.min(0.75, Math.max(0.2, -headPos.y * 0.5 + 0.5));
  el.style.left = `${x * 100}%`;
  el.style.top = `${y * 100}%`;
}

// 某個時間只做一次（例如出聲）
const once = (intro, key) => !intro.cues.has(key) && intro.cues.add(key);
const walkRig = (who, phaseKey, intro, dt, t, moving) => {
  const fake = { rig: who, runPhase: intro[phaseKey] };
  animateRig(fake, dt, t, moving);
  intro[phaseKey] = fake.runPhase;
};

export function updateIntro(intro, dt) {
  if (!intro.active) return;
  intro.time += dt;
  const t = intro.time;
  const owner = park.owner;
  let follow = null;

  const cap = [...CAPTIONS].reverse().find(([a]) => t >= a);
  if (t < T.black) caption(cap ? cap[1] : '');

  // ===== 第 1 幕：瞓喺吊床食 pizza =====
  if (t < T.strange) {
    const bite = Math.max(0, Math.sin(t * 1.6));
    owner.arms[1].rotation.set(0.3 + bite * 2.2, 0, -0.3 * bite); // 正數 = 隻手向前
  }

  // ===== 第 2 幕：怪怪地……杯水震緊 =====
  if (t >= T.strange && t < T.bosses) {
    if (once(intro, 'strange')) {
      play('rumble');
      intro.shake = 0.05;
      owner.arms[1].rotation.set(0.3, 0, 0);
      intro.question.visible = true;
    }
    owner.head.rotation.y = Math.sin(t * 3) * 0.3;
    if (t >= T.glass) {
      if (once(intro, 'glass')) {
        intro.question.visible = false;
        play('rumble');
      }
      const k = Math.min(1, t - T.glass);
      park.glass.position.x = DESK.x - 0.35 + (Math.random() - 0.5) * 0.025 * k;
      park.water.position.x = park.glass.position.x;
      park.water.rotation.z = Math.sin(t * 40) * 0.12 * k;
      park.water.rotation.x = Math.cos(t * 33) * 0.1 * k;
      park.water.scale.y = 1 + Math.sin(t * 50) * 0.08 * k;
      intro.shake = Math.max(intro.shake, 0.012 * k);
    }
  }

  // ===== 第 3 幕：Boss 衝入嚟捉動物 =====
  if (t >= T.bosses && once(intro, 'bosses')) {
    play('alarm');
    intro.shake = 0.25;
    for (const b of intro.bosses) b.group.visible = true;
    park.water.rotation.set(0, 0, 0);
    park.water.scale.y = 1;
    owner.head.rotation.y = 0;
  }
  if (t >= T.capture && once(intro, 'standup')) {
    standUp(owner, HAMMOCK.x + 2.5, HAMMOCK.z - 1.5, Math.PI - 0.6);
    owner.alert.visible = true;
    play('hit');
  }
  if (t >= T.capture && t < T.chase) {
    owner.arms[0].rotation.x = 2.8 + Math.sin(t * 8) * 0.2; // 舉高手驚
    owner.arms[1].rotation.x = 2.8 - Math.sin(t * 8) * 0.2;
  }

  // 動物：行嚟行去（Boss 嚟咗就走快啲）
  const scared = t > T.bosses;
  for (const a of intro.animals) {
    if (a.caged) {
      a.model.userData.animate(t, 0);
      continue;
    }
    if (a.wait > 0 && !scared) {
      a.wait -= dt;
      a.model.userData.animate(t, 0);
    } else {
      const d = a.target.clone().sub(a.g.position);
      d.y = 0;
      if (d.length() < 0.3) {
        a.target.set(PLAY_SPOT.x + (Math.random() - 0.5) * 9, 0, PLAY_SPOT.z + (Math.random() - 0.5) * 7);
        a.wait = scared ? 0 : 1 + Math.random() * 2;
      } else {
        a.g.position.add(d.normalize().multiplyScalar(dt * (scared ? 3.5 : 1.3)));
        a.model.rotation.y = Math.atan2(-d.x, -d.z);
      }
      a.model.userData.animate(t, 1);
    }
  }

  // Boss：衝去捉動物，籠由天跌落，再拖返去生態區（-z）
  for (const b of intro.bosses) {
    let moving = 0;
    if (t > T.bosses + 0.3) {
      const target = b.targets[b.step];
      const free = target && !target.caged;
      const goal = free ? target.g.position : V(b.group.position.x, 0, -10);
      const d = goal.clone().sub(b.group.position);
      d.y = 0;
      if (d.length() > 1.6 || !free) {
        b.group.position.add(d.normalize().multiplyScalar(dt * (free ? 8 : 4.2)));
        b.group.rotation.y = Math.atan2(-d.x, -d.z);
        moving = 1;
      } else {
        target.caged = true;
        target.cage = makeCage();
        target.cage.position.y = 8;
        target.g.add(target.cage);
        target.heart.userData.setLines([{ text: '😢', color: '#90caf9' }]);
        target.boss = b;
        play('hit');
        intro.shake = Math.max(intro.shake, 0.08);
        b.step += 1;
      }
    }
    animateRig(b, dt, t, moving);
  }
  for (const a of intro.animals) {
    if (!a.cage) continue;
    a.cage.position.y = Math.max(0, a.cage.position.y - dt * 14);
    if (a.cage.position.y === 0 && a.boss) {
      const behind = a.boss.group.position.clone().add(V(0, 0, 1.8).applyQuaternion(a.boss.group.quaternion));
      a.g.position.lerp(behind, Math.min(1, dt * 3));
    }
  }

  // ===== 第 4 幕：Owner 追，追唔到（鏡頭跟住佢） =====
  if (t >= T.chase && t < T.phone) {
    if (once(intro, 'chase')) intro.followReset = true;
    const k = t - T.chase;
    const p = owner.g.position;
    if (k < 3) {
      p.z -= dt * 4.5;
      p.x += (-4 - p.x) * Math.min(1, dt); // 喺兩部繁殖機中間跑過
      owner.g.rotation.y = 0; // 面向 -z
      walkRig(owner, 'ownerPhase', intro, dt, t, 1);
      owner.arms[0].rotation.x = 1.5; // 伸手想捉
    } else {
      walkRig(owner, 'ownerPhase', intro, dt, t, 0);
      owner.arms[0].rotation.x = 0;
      owner.arms[1].rotation.x = 0;
      owner.head.rotation.x = 0.35; // 耷低頭
      owner.alert.visible = false;
    }
    follow = k < 3 ? [V(p.x + 4.5, 2.8, p.z + 6.5), V(p.x, 2, p.z - 5)] : [V(p.x - 2.2, 2.6, p.z - 3.6), V(p.x, 2.4, p.z)];
  }

  // ===== 第 5 幕：用手機搜尋 =====
  if (t >= T.phone && t < T.ranger) {
    const k = t - T.phone;
    if (once(intro, 'phone')) {
      owner.head.rotation.x = 0.25;
      owner.phone.visible = true;
      intro.slice.visible = false;
      owner.g.rotation.y = Math.PI; // 轉身面向鏡頭
      intro.followReset = true;
    }
    if (k > 1.2 && once(intro, 'phoneUp')) $('intro-phone').classList.add('show');
    owner.arms[1].rotation.set(1.5, 0, 0.45);
    const typed = Math.min(SEARCH.length, Math.floor(Math.max(0, k - 1.8) * 7));
    if (typed !== intro.typed) {
      intro.typed = typed;
      $('phone-text').textContent = SEARCH.slice(0, typed);
      play('type');
    }
    if (k > 4.6 && once(intro, 'result')) {
      $('phone-result').classList.add('show');
      play('ring');
    }
    const p = owner.g.position;
    follow = [V(p.x - 1.4, 3.3, p.z + 3.6 - k * 0.1), V(p.x + 0.4, 2.7, p.z)];
  }

  // ===== 第 6 幕：Ranger 揸車入嚟，握手 =====
  if (t >= T.ranger && once(intro, 'ranger')) {
    $('intro-phone').classList.remove('show');
    owner.phone.visible = false;
    owner.head.rotation.set(0, 0, 0);
    standUp(owner, MEET.x - 1.1, MEET.z, -Math.PI / 2); // 面向 +x
    for (const b of intro.bosses) b.group.visible = false;
    for (const a of intro.animals) a.g.visible = false;
    play('engine');
  }
  if (t >= T.ranger && t < T.black) {
    const k = t - T.ranger;
    setGateOpen(Math.min(1, k / 1.2));
    const jp = intro.jeep.g.position;
    const stopZ = MEET.z + 5;
    if (jp.z > stopZ) {
      const speed = Math.min(16, (jp.z - stopZ) * 2 + 1);
      jp.z = Math.max(stopZ, jp.z - dt * speed);
      for (const w of intro.jeep.wheels) w.rotation.x -= dt * speed * 1.7;
      jp.y = Math.sin(t * 20) * 0.03; // 震下震下
    } else if (once(intro, 'park')) {
      jp.y = 0;
      play('pop');
      intro.ranger.g.visible = true;
      intro.ranger.g.position.set(MEET.x + 2.2, 0, stopZ - 1.8);
    }
    // Ranger 行去 Owner 度
    const r = intro.ranger.g;
    if (r.visible) {
      const goal = V(MEET.x + 1.1, 0, MEET.z);
      const d = goal.clone().sub(r.position);
      d.y = 0;
      const moving = d.length() > 0.05 ? 1 : 0;
      if (moving) {
        r.position.add(d.clampLength(0, dt * 2.5));
        r.rotation.y = Math.atan2(-d.x, -d.z);
      } else r.rotation.y = Math.PI / 2; // 面向 -x（Owner）
      intro.rangerPhase += dt * 10 * moving;
      const swing = Math.sin(intro.rangerPhase) * 0.8 * moving;
      intro.ranger.legs[0].rotation.x = swing;
      intro.ranger.legs[1].rotation.x = -swing;
      intro.ranger.arms[0].rotation.x = -swing;
      intro.ranger.arms[1].rotation.x = swing;
    }
    walkRig(owner, 'ownerPhase', intro, dt, t, 0);
    // 握手
    if (t >= T.shake) {
      if (once(intro, 'shake')) play('ding');
      const pump = Math.sin((t - T.shake) * 12) * 0.25;
      owner.arms[1].rotation.set(1.3 + pump, 0, 0);
      intro.ranger.arms[1].rotation.set(1.3 - pump, 0, 0);
    }
  }

  updateCamera(intro, t, dt, follow);
  updateBubble(intro, t);

  // ===== 第 7 幕：變黑 + 大字 =====
  const fade = $('intro-fade');
  if (t > T.black) {
    fade.style.opacity = Math.min(1, (t - T.black) / 1.2);
    caption('');
  }
  if (t > T.black + 1.3) {
    $('intro-final').classList.add('show');
    if (once(intro, 'final')) play('magic');
  }
  if (t > LENGTH) finish(intro);
}

function finish(intro) {
  if (!intro.active) return;
  intro.active = false;
  intro.scene.remove(intro.root);
  intro.slice.removeFromParent();
  intro.question.removeFromParent();
  park.pizza.visible = true;
  park.owner.label.visible = true;
  park.glass.position.x = DESK.x - 0.35;
  park.water.position.x = DESK.x - 0.35;
  park.water.rotation.set(0, 0, 0);
  park.water.scale.y = 1;
  lieOnHammock();
  setGateOpen(0);
  window.removeEventListener('keydown', intro.skipHandler);
  $('intro-phone').classList.remove('show');
  $('intro-bubble').classList.remove('show');
  document.body.classList.remove('movie');
  $('intro').hidden = true;
  intro.onDone?.();
}
