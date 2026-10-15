// 開場動畫（小朋友 2026-10-15 Issue #1 寫嘅故事）：
// 1. Owner 瞓喺吊床食 pizza，動物喺隔籬開心咁玩
// 2. 佢覺得怪怪地……望一望枱面杯水：水喺度震！
// 3. Boss 衝入嚟捉走動物（Owner 頭頂出「!」）
// 4. Owner 追，追唔到
// 5. 佢用手機搜尋「top tier ranger」
// 6. Ranger 揸車由大門入嚟，同 Owner 握手
// 7. 畫面變黑：「YOU are the ranger! ...」
// 撳任何掣／滑鼠跳過

import * as THREE from 'three';
import { ANIMALS } from './data/animals.js';
import { buildAnimalModel } from './animalModels.js';
import { buildBossRig, animateRig } from './bosses.js';
import { buildAvatar, applyRangerSkin } from './thirdPerson.js';
import { RANGER_SKINS } from './skins.js';
import { state } from './state.js';
import { makeLabel, makeSign, THEMES } from './signs.js';
import { park, HAMMOCK, DESK, PARK_GATE, lieOnHammock, standUp, setGateOpen } from './hubPark.js';
import { play } from './sound.js';

const LENGTH = 46; // 秒
const $ = (id) => document.getElementById(id);
const PLAY_SPOT = new THREE.Vector3(-10, 0, 49); // 動物玩嘅地方（吊床隔籬）
const MEET = new THREE.Vector3(0, 0, 53); // 握手嘅位
const SEARCH = 'top tier ranger';

// 每一幕幾時開始（秒）
const T = { relax: 0, strange: 7, bosses: 12, chase: 18.5, phone: 23.5, ranger: 30, shake: 37, black: 41.5 };

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
    g.position.set(PLAY_SPOT.x + Math.cos(a) * 5, 0, PLAY_SPOT.z + Math.sin(a) * 4);
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
    group.position.set(-16 + i * 4, 0, 28 - (i % 2) * 2);
    group.visible = false;
    root.add(group);
    return { rig, group, runPhase: 0, targets: [animals[i * 2], animals[i * 2 + 1]], step: 0 };
  });

  // Owner 手上嘅 pizza
  const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 3), new THREE.MeshStandardMaterial({ color: 0xffb300 }));
  slice.rotation.z = Math.PI / 2;
  slice.position.set(0, -1.15, -0.15);
  park.owner.arms[1].add(slice);
  park.pizza.visible = false;

  // Ranger + 架車（喺大門外面等）
  const ranger = buildAvatar();
  applyRangerSkin({ avatar: ranger }, RANGER_SKINS.find((s) => s.id === state.rangerSkin) || RANGER_SKINS[0]);
  ranger.g.scale.setScalar(1.2);
  ranger.g.visible = false;
  root.add(ranger.g);
  const rangerLabel = makeLabel([{ text: '⭐ TOP TIER RANGER', color: '#69f0ae' }], 0.8);
  rangerLabel.position.y = 3.2;
  ranger.g.add(rangerLabel);
  const jeep = buildJeep();
  jeep.g.position.set(PARK_GATE.x, 0, PARK_GATE.z + 40);
  root.add(jeep.g);

  // 「?」（覺得怪怪地）
  const question = makeLabel([{ text: '?', color: '#ffeb3b' }], 1.6);
  question.visible = false;
  park.owner.head.add(question);
  question.position.y = 1.5;

  const intro = {
    active: true, time: 0, root, animals, bosses, camera, scene, ranger, jeep, slice, question,
    ownerPhase: 0, rangerPhase: 0, typed: 0, cues: new Set(),
    lookAt: new THREE.Vector3(),
  };

  const overlay = $('intro');
  overlay.hidden = false;
  const skip = () => finish(intro);
  intro.skipHandler = skip;
  window.addEventListener('keydown', skip, { once: true });
  overlay.addEventListener('click', skip, { once: true });
  return intro;
}

// 方塊 Ranger 吉普車
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
  const green = M(0x558b2f);
  part(new THREE.BoxGeometry(2.4, 1.0, 4.4), green, 0, 1.0, 0);
  part(new THREE.BoxGeometry(2.3, 0.9, 2.0), green, 0, 1.9, 0.5);
  part(new THREE.BoxGeometry(2.1, 0.7, 0.08), M(0x81d4fa, { transparent: true, opacity: 0.6, roughness: 0.05 }), 0, 1.95, -0.55);
  part(new THREE.BoxGeometry(2.5, 0.25, 0.3), M(0x424242), 0, 0.7, -2.25); // 前保險槓
  for (const s of [-1, 1]) {
    part(new THREE.BoxGeometry(0.4, 0.3, 0.1), M(0xfff9c4, { emissive: 0xfff59d, emissiveIntensity: 1.5 }), s * 0.8, 1.15, -2.22); // 車頭燈
    part(new THREE.BoxGeometry(0.5, 0.2, 0.25), M(s > 0 ? 0x2979ff : 0xff1744, { emissive: s > 0 ? 0x2979ff : 0xff1744, emissiveIntensity: 2 }), s * 0.45, 2.45, 0.5); // 警示燈
  }
  const wheels = [];
  for (const [x, z] of [[-1.25, -1.4], [1.25, -1.4], [-1.25, 1.4], [1.25, 1.4]]) {
    const w = part(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), M(0x212121), x, 0.55, z);
    w.rotation.z = Math.PI / 2;
    wheels.push(w);
  }
  for (const s of [-1, 1]) {
    const sign = makeSign([{ text: 'RANGER', size: 0.5 }], 2.2, 0.6, THEMES.green);
    sign.position.set(s * 1.22, 1.05, 0.2);
    sign.rotation.y = s * Math.PI / 2;
    g.add(sign);
  }
  return { g, wheels };
}

function caption(text) {
  const el = $('intro-caption');
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
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

// 鏡頭：去 pos，望住 look（slow = 慢慢跟）
function shot(intro, pos, look, dt, slow = 0) {
  const cam = intro.camera;
  if (slow) {
    cam.position.lerp(pos, Math.min(1, dt * slow));
    intro.lookAt.lerp(look, Math.min(1, dt * slow));
  } else {
    cam.position.copy(pos);
    intro.lookAt.copy(look);
  }
  cam.lookAt(intro.lookAt);
}

// 某個時間只做一次（例如出聲）
const once = (intro, key) => !intro.cues.has(key) && intro.cues.add(key);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
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

  // ===== 第 1 幕：瞓喺吊床食 pizza =====
  if (t < T.strange) {
    if (t < 3.5) caption('The animal park owner was relaxing on his hammock, eating pizza... 🍕');
    else caption('The animals were playing happily together.');
    // 隻手攞 pizza 去個口
    const bite = Math.max(0, Math.sin(t * 1.6));
    owner.arms[1].rotation.set(0.3 + bite * 2.2, 0, -0.3 * bite); // 正數 = 隻手向前
    shot(intro, V(HAMMOCK.x + 10 - t * 0.2, 3.8, HAMMOCK.z - 7.5 + t * 0.15), V(HAMMOCK.x + 2.5, 1.2, HAMMOCK.z), dt);
  }

  // ===== 第 2 幕：怪怪地……杯水震緊 =====
  if (t >= T.strange && t < T.bosses) {
    if (once(intro, 'strange')) {
      play('rumble');
      owner.arms[1].rotation.set(0.3, 0, 0);
    }
    const k = t - T.strange;
    if (k < 2) {
      caption('Hmm... he felt a little bit strange...');
      intro.question.visible = true;
      owner.head.rotation.y = Math.sin(t * 3) * 0.3;
      shot(intro, V(HAMMOCK.x + 4, 3.2, HAMMOCK.z + 4.5), V(HAMMOCK.x + 1.5, 2.0, HAMMOCK.z), dt);
    } else {
      caption('He looked at the glass of water... the water was SHAKING!');
      intro.question.visible = false;
      if (once(intro, 'rumble2')) play('rumble');
      // 近鏡：杯水
      const shake = 0.025 * Math.min(1, k - 2);
      park.glass.position.x = DESK.x - 0.35 + (Math.random() - 0.5) * shake;
      park.water.position.x = park.glass.position.x;
      park.water.rotation.z = Math.sin(t * 40) * 0.12;
      park.water.rotation.x = Math.cos(t * 33) * 0.1;
      park.water.scale.y = 1 + Math.sin(t * 50) * 0.08;
      shot(intro, V(DESK.x + 0.45, 1.45 + Math.sin(t * 30) * 0.01, DESK.z + 0.9), V(DESK.x - 0.35, 1.2, DESK.z), dt);
    }
  }

  // ===== 第 3 幕：Boss 衝入嚟捉動物 =====
  if (t >= T.bosses && once(intro, 'bosses')) {
    play('alarm');
    standUp(owner, HAMMOCK.x + 2, HAMMOCK.z + 2.2, -Math.PI / 2 - 0.5);
    owner.alert.visible = true;
    for (const b of intro.bosses) b.group.visible = true;
    park.water.rotation.set(0, 0, 0);
    park.water.scale.y = 1;
  }
  if (t >= T.bosses && t < T.chase) {
    caption('Oh no! The BOSSES came and captured the animals!');
    owner.arms[0].rotation.x = 2.8 + Math.sin(t * 8) * 0.2; // 舉高手驚
    owner.arms[1].rotation.x = 2.8 - Math.sin(t * 8) * 0.2;
    shot(intro, V(-5, 9, 63), V(-6, 0, 44), dt);
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
    if (t > T.bosses + 0.5) {
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

  // ===== 第 4 幕：Owner 追，追唔到 =====
  if (t >= T.chase && t < T.phone) {
    const k = t - T.chase;
    if (k < 3.2) {
      caption('He tried to catch them back...');
      const p = owner.g.position;
      p.z -= dt * 4.5;
      p.x += (-4 - p.x) * Math.min(1, dt); // 喺兩部繁殖機中間跑過
      owner.g.rotation.y = 0; // 面向 -z
      walkRig(owner, 'ownerPhase', intro, dt, t, 1);
      owner.arms[0].rotation.x = 1.5; // 伸手想捉
    } else {
      caption('...but they were too fast! 😢');
      walkRig(owner, 'ownerPhase', intro, dt, t, 0);
      owner.arms[0].rotation.x = 0;
      owner.arms[1].rotation.x = 0;
      owner.head.rotation.x = 0.35; // 耷低頭
      owner.alert.visible = false;
    }
    const p = owner.g.position;
    shot(intro, V(p.x + 6, 4, p.z + 9), V(p.x, 1.8, p.z - 4), dt, k < 0.1 ? 0 : 4);
  }

  // ===== 第 5 幕：用手機搜尋 =====
  if (t >= T.phone && t < T.ranger) {
    const k = t - T.phone;
    if (once(intro, 'phone')) {
      owner.head.rotation.x = 0.25;
      owner.phone.visible = true;
      intro.slice.visible = false;
      owner.g.rotation.y = Math.PI; // 轉身面向鏡頭
      $('intro-phone').classList.add('show');
    }
    caption('So he used his phone and searched for help...');
    owner.arms[1].rotation.set(1.5, 0, 0.45);
    // 一個一個字打
    const typed = Math.min(SEARCH.length, Math.floor(Math.max(0, k - 0.8) * 7));
    if (typed !== intro.typed) {
      intro.typed = typed;
      $('phone-text').textContent = SEARCH.slice(0, typed);
      play('type');
    }
    if (k > 3.6 && once(intro, 'result')) {
      $('phone-result').classList.add('show');
      play('ring');
    }
    const p = owner.g.position;
    shot(intro, V(p.x - 1.2, 3.4, p.z + 3.4), V(p.x, 2.6, p.z), dt);
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
    setGateOpen(Math.min(1, k / 1.5));
    const jp = intro.jeep.g.position;
    const stopZ = MEET.z + 4.5;
    if (k < T.shake - T.ranger - 2) {
      caption('The TOP TIER RANGER came to help! 🚙');
      if (jp.z > stopZ) {
        const speed = Math.min(14, (jp.z - stopZ) * 1.6 + 1);
        jp.z = Math.max(stopZ, jp.z - dt * speed);
        for (const w of intro.jeep.wheels) w.rotation.x -= dt * speed * 2;
      } else if (once(intro, 'park')) {
        play('pop');
        intro.ranger.g.visible = true;
        intro.ranger.g.position.set(MEET.x + 2.2, 0, stopZ - 1.5);
      }
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
    // 握手
    if (t >= T.shake) {
      caption('They shook hands. 🤝 "Please save my animals!"');
      if (once(intro, 'shake')) play('ding');
      const pump = Math.sin((t - T.shake) * 12) * 0.25;
      owner.arms[1].rotation.set(1.3 + pump, 0, 0);
      intro.ranger.arms[1].rotation.set(1.3 - pump, 0, 0);
    }
    walkRig(owner, 'ownerPhase', intro, dt, t, 0);
    if (t >= T.shake) owner.arms[1].rotation.x = 1.3 + Math.sin((t - T.shake) * 12) * 0.25;
    // 鏡頭：先睇住架車入大門，之後側面睇握手
    if (k < 4) shot(intro, V(5, 3.2, MEET.z - 6), V(jp.x, 1.5, jp.z), dt, k < 0.1 ? 0 : 5);
    else shot(intro, V(MEET.x, 3, MEET.z - 7.5), V(MEET.x, 2.1, MEET.z), dt, 2);
  }

  // ===== 第 7 幕：變黑 + 大字 =====
  const fade = $('intro-fade');
  if (t > T.black) {
    fade.style.opacity = Math.min(1, (t - T.black) / 1.2);
    $('intro-caption').classList.remove('show');
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
  park.glass.position.x = DESK.x - 0.35;
  park.water.position.x = DESK.x - 0.35;
  park.water.rotation.set(0, 0, 0);
  park.water.scale.y = 1;
  lieOnHammock();
  setGateOpen(0);
  window.removeEventListener('keydown', intro.skipHandler);
  $('intro-phone').classList.remove('show');
  $('intro').hidden = true;
  intro.onDone?.();
}
