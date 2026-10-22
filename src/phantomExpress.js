// 🚂 Phantom Express（小朋友 Issue #6 Halloween）：每個鐘頭準時（:00）由霧入面駛入車站，停 30 分鐘
// 跟真實時鐘，所以全世界都係同一個時間有車；上車 → 載入畫面 → Ghost World 捉鬼
// 30 分鐘一到（或者自己喺 Ghost World 個站撳 E），火車就送你返 Halloween 世界個站
// 用法：createPhantomExpress({ scene, teleport, showLoading, ... })；main.js 每格叫 update()

import * as THREE from 'three';
import { STATION, STATION_PLATFORM, TRACK_X, TRAIN_STOP, TRAIN_BOARD, GHOST_ARRIVE, GHOST_TRAIN_STOP, inHalloween, inGhostWorld } from './halloweenShape.js';
import { THEMES, dynamicSign } from './signs.js';
import { beacon, glowSign } from './hwBeacons.js';
import { PHANTOM_EXPRESS_EVERY_MINUTES, PHANTOM_EXPRESS_STAY_MINUTES } from './data/balance.js';
import { questline } from './questline.js'; // 🐾 Echo's Questline 報數

const MIN = 60 * 1000;
const ROLL_SECONDS = 8; // 入站／出站要幾耐
const ROLL_DIST = 150; // 由幾遠駛入嚟

let forced = null; // 測試／控制台：即刻嚟一班（{ start }）

// 而家係咪有車？{ boarding, left（毫秒，仲有幾耐開車）, next（毫秒，下一班幾時到）, start }
export function trainStatus(now = Date.now()) {
  const every = PHANTOM_EXPRESS_EVERY_MINUTES * MIN;
  const stay = PHANTOM_EXPRESS_STAY_MINUTES * MIN;
  if (forced && now - forced.start < stay) return { boarding: true, start: forced.start, left: forced.start + stay - now, next: 0 };
  const start = Math.floor(now / every) * every; // 每個鐘 :00
  if (now - start < stay) return { boarding: true, start, left: start + stay - now, next: 0 };
  return { boarding: false, start: start + every, left: 0, next: start + every - now };
}
export function forceTrain() {
  forced = { start: Date.now() };
}

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ---------- 火車模型（黑紫色蒸汽火車頭 + 綠色鬼火 + 兩卡發光車卡）----------
// 車頭向住 -z；成架車長大約 32 米，中心喺 (0, 0, 0)
function buildTrain() {
  const g = new THREE.Group();
  const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
  const glow = (c, k = 2) => M(c, { emissive: c, emissiveIntensity: k });
  const black = M(0x17121f, { metalness: 0.6, roughness: 0.35 });
  const purple = M(0x4a148c, { metalness: 0.4, roughness: 0.4 });
  const trim = M(0xb388ff, { metalness: 0.7, roughness: 0.3, emissive: 0x2a0b55, emissiveIntensity: 0.6 });
  const ghostFire = [0x76ff03, 0x00e676, 0xb2ff59].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2.4, transparent: true, opacity: 0.85, depthWrite: false }));
  const add = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const wheels = [];
  const wheel = (parent, x, z, r = 0.75) => {
    const w = add(parent, new THREE.CylinderGeometry(r, r, 0.35, 16), black, x, r, z);
    w.rotation.z = Math.PI / 2;
    const rim = add(parent, new THREE.TorusGeometry(r * 0.78, 0.07, 6, 18), glow(0xd500f9, 1.6), x + Math.sign(x) * 0.2, r, z);
    rim.rotation.y = Math.PI / 2;
    wheels.push(w, rim);
  };
  // 車頭
  const engine = new THREE.Group();
  engine.position.z = -11;
  g.add(engine);
  add(engine, new THREE.BoxGeometry(3, 0.6, 9), black, 0, 0.9, 0); // 底盤
  const boiler = add(engine, new THREE.CylinderGeometry(1.25, 1.25, 6, 18), purple, 0, 2.4, -1.3);
  boiler.rotation.x = Math.PI / 2;
  for (const z of [-3.6, -1.6, 0.4]) {
    const band = add(engine, new THREE.TorusGeometry(1.27, 0.08, 6, 24), trim, 0, 2.4, z);
    band.castShadow = false;
  }
  add(engine, new THREE.CylinderGeometry(1.3, 1.3, 0.4, 18), black, 0, 2.4, -4.4).rotation.x = Math.PI / 2; // 車頭面
  const lamp = add(engine, new THREE.SphereGeometry(0.42, 14, 10), glow(0x76ff03, 3), 0, 2.6, -4.7); // 綠色車頭燈
  lamp.castShadow = false;
  const cow = add(engine, new THREE.ConeGeometry(1.5, 1.2, 4), black, 0, 0.8, -4.9); // 排障器
  cow.rotation.x = -Math.PI / 2;
  cow.rotation.y = Math.PI / 4;
  // 煙囪 + 鬼火
  add(engine, new THREE.CylinderGeometry(0.45, 0.32, 1.8, 12), black, 0, 4.2, -3.2);
  add(engine, new THREE.CylinderGeometry(0.7, 0.45, 0.4, 12), trim, 0, 5.2, -3.2);
  const fire = new THREE.Group();
  fire.position.set(0, 5.4, -3.2);
  engine.add(fire);
  const flames = [0, 1, 2, 3, 4].map((i) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.28 - i * 0.03, 1.2 - i * 0.1, 7), ghostFire[i % 3]);
    const a = (i / 5) * Math.PI * 2;
    f.position.set(Math.cos(a) * 0.18, 0.5, Math.sin(a) * 0.18);
    fire.add(f);
    return f;
  });
  // 司機室（發光窗）
  add(engine, new THREE.BoxGeometry(3.1, 2.8, 2.8), purple, 0, 2.8, 2.6);
  add(engine, new THREE.BoxGeometry(3.5, 0.3, 3.3), black, 0, 4.35, 2.6);
  for (const s of [-1, 1]) add(engine, new THREE.BoxGeometry(0.05, 1, 1.4), glow(0x76ff03, 1.4), s * 1.58, 3.1, 2.6);
  for (const s of [-1, 1]) for (const z of [-3.2, -1.2, 1.2, 3.2]) wheel(engine, s * 1.5, z, z < 0 ? 0.9 : 0.7);
  // 兩卡車卡
  const windows = [];
  for (const cz of [1, 12]) {
    const car = new THREE.Group();
    car.position.z = cz;
    g.add(car);
    add(car, new THREE.BoxGeometry(3, 0.5, 9.4), black, 0, 0.9, 0);
    add(car, new THREE.BoxGeometry(3.1, 2.8, 9), purple, 0, 2.6, 0);
    const roof = add(car, new THREE.CylinderGeometry(1.75, 1.75, 9.4, 14, 1, false, 0, Math.PI), black, 0, 3.9, 0);
    roof.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    roof.scale.set(1, 1, 0.35);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const w = add(car, new THREE.BoxGeometry(0.06, 1, 1.4), glow(i % 2 ? 0xb388ff : 0x76ff03, 1.5), s * 1.57, 2.9, -3.1 + i * 2.05);
        w.castShadow = false;
        windows.push(w);
      }
      add(car, new THREE.BoxGeometry(0.06, 0.12, 9), trim, s * 1.57, 1.6, 0);
    }
    for (const s of [-1, 1]) for (const z of [-3, 3]) wheel(car, s * 1.5, z, 0.6);
  }
  // 煙：一嚿嚿紫灰色煙由煙囪升上去
  const N = 40;
  const pos = new Float32Array(N * 3);
  const seeds = Array.from({ length: N }, (_, i) => ({ k: i / N, dx: (Math.random() - 0.5) * 1.2, dz: Math.random() * 3 }));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const smoke = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xb39ddb, size: 1.4, transparent: true, opacity: 0.55, depthWrite: false }));
  smoke.frustumCulled = false;
  g.add(smoke);
  g.userData = {
    animate(t, moving) {
      flames.forEach((f, i) => f.scale.set(1, 0.7 + Math.abs(Math.sin(t * 9 + i * 1.3)) * 0.8, 1));
      fire.rotation.y = t * 2;
      windows.forEach((w, i) => (w.material.emissiveIntensity = 1.1 + Math.sin(t * 3 + i) * 0.5));
      if (moving) wheels.forEach((w) => (w.rotation.x += 0.4));
      seeds.forEach((s, i) => {
        const k = (s.k + t * 0.18) % 1;
        pos[i * 3] = s.dx * (1 + k * 3);
        pos[i * 3 + 1] = 5.6 + k * 9;
        pos[i * 3 + 2] = -14.2 + s.dz + k * (moving ? 10 : 2.5); // 行緊：煙向後飄
      });
      geo.attributes.position.needsUpdate = true;
      smoke.material.opacity = 0.5;
    },
  };
  return g;
}

// ---------- 主體 ----------
export function createPhantomExpress({ scene, teleport, showLoading, popup, announce, play, faceTo }) {
  // Halloween 世界個站：沿住 TRACK_X（打直，z 方向），停喺 TRAIN_STOP
  const train = buildTrain();
  train.position.set(TRACK_X, 0, TRAIN_STOP.z);
  train.visible = false;
  scene.add(train);
  // Ghost World 個站：路軌打橫（x 方向），喺返程月台後面；你喺嗰邊嗰陣火車一直停喺度
  const ghostTrain = buildTrain();
  ghostTrain.position.set(GHOST_TRAIN_STOP.x, 0, GHOST_TRAIN_STOP.z + 6.5);
  ghostTrain.rotation.y = Math.PI / 2;
  ghostTrain.visible = false;
  scene.add(ghostTrain);

  // ---- 車站：時間表大牌、售票亭、上車位（小朋友話太黑睇唔到）----
  const P = STATION_PLATFORM;
  const BOOTH = { x: P.minX + 3, z: P.maxZ - 2.6 }; // halloweenWorld.js 起咗嘅售票亭
  // 入口時間表（面向西面嘅出生點）
  const timetable = dynamicSign(7, 3);
  timetable.mesh.material.fog = false;
  timetable.mesh.material.toneMapped = false;
  const boardGroup = new THREE.Group();
  boardGroup.position.set(STATION.minX + 5, 0, 0);
  boardGroup.rotation.y = -Math.PI / 2;
  timetable.mesh.position.y = 4.4;
  boardGroup.add(timetable.mesh);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2b2433, metalness: 0.5, roughness: 0.5 });
  for (const sx of [-3.2, 3.2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.9, 0.3), postMat);
    post.position.set(sx, 2.95, -0.1);
    boardGroup.add(post);
  }
  scene.add(boardGroup);
  const boardLight = new THREE.PointLight(0xb388ff, 10, 18, 1.6);
  boardLight.position.set(STATION.minX + 3, 6, 0);
  scene.add(boardLight);
  // 售票亭：發光大字 + 燈 + 指路圈
  const boothSign = glowSign([{ text: '🎟️ TICKET BOOTH', size: 0.42 }, { text: 'Phantom Express · press E', size: 0.22 }], 4.6, 1.3, THEMES.orange);
  boothSign.position.set(BOOTH.x - 2.15, P.top + 4.4, BOOTH.z);
  boothSign.rotation.y = -Math.PI / 2;
  scene.add(boothSign);
  const boothBeacon = beacon(scene, BOOTH.x - 3.4, BOOTH.z, { y: P.top, color: 0xffab40, radius: 1.3, lightY: 3.4 });
  // 上車位：綠色（有車）／紅色（未到）
  const boardBeacon = beacon(scene, TRAIN_BOARD.x, TRAIN_BOARD.z, { y: P.top, color: 0x76ff03, radius: 1.8 });
  const boardSign = glowSign([{ text: '🚂 BOARD HERE', size: 0.5 }], 3.6, 0.9, THEMES.green);
  boardSign.position.set(TRAIN_BOARD.x, P.top + 5.6, TRAIN_BOARD.z);
  boardSign.rotation.y = -Math.PI / 2;
  scene.add(boardSign);
  // Ghost World 返程站
  const backBeacon = beacon(scene, GHOST_TRAIN_STOP.x, GHOST_TRAIN_STOP.z, { y: 0.4, color: 0x76ff03, radius: 2 });
  const backSign = glowSign([{ text: '🚂 TRAIN BACK', size: 0.48 }, { text: 'to the Halloween station · press E', size: 0.2 }], 5, 1.3, THEMES.green);
  backSign.position.set(GHOST_TRAIN_STOP.x, 5.4, GHOST_TRAIN_STOP.z - 0.5);
  scene.add(backSign);
  const nearBooth = (pos) => Math.hypot(pos.x - (BOOTH.x - 3.4), pos.z - BOOTH.z) < 3.5;

  const hud = document.createElement('div');
  hud.id = 'hw-train-hud';
  hud.className = 'hud-box';
  hud.hidden = true;
  document.body.appendChild(hud);

  let lastSlot = null; // 每班車只響一次汽笛
  let warned = null; // Ghost World：開車前 1 分鐘提一次
  let travelling = false;

  async function board() {
    if (travelling || !trainStatus().boarding) return;
    travelling = true;
    play('whistle');
    const ok = await showLoading('🚂 All aboard the PHANTOM EXPRESS...', async () => {
      teleport(GHOST_ARRIVE.x, GHOST_ARRIVE.z);
      faceTo(GHOST_ARRIVE.rotY);
    }, 2.6, { theme: 'ghost', kicker: 'All aboard!', title: 'Ghost World' });
    travelling = false;
    if (!ok) return;
    questline.track('trainRide'); // 🐾
    announce('👻 Welcome to the GHOST WORLD! Get a vacuum and catch the souls!');
    setTimeout(() => popup('🧹 Hold E (or the mouse button) to suck up ghosts. Stronger ghosts take longer!'), 2600);
  }
  async function rideBack(auto = false) {
    if (travelling) return;
    travelling = true;
    play('whistle');
    const ok = await showLoading(auto ? '🚂 The Phantom Express is leaving... back to the station!' : '🚂 Riding back to the station...', async () => {
      teleport(TRAIN_BOARD.x - 6, TRAIN_BOARD.z);
      faceTo(Math.PI / 2); // 望住出生點（西邊）
    }, 2, { theme: 'halloween', kicker: 'Next stop', title: 'Train Station' });
    travelling = false;
    if (!ok) return;
    announce(auto ? '🚂 The ghost hunt is over! The Phantom Express comes back next hour.' : '🚂 Back at the Train Station!');
  }

  function interaction(pos) {
    if (!inHalloween(pos.x, pos.z) || travelling) return null;
    const st = trainStatus();
    if (nearBooth(pos)) {
      if (!st.boarding) return { prompt: `🎟️ Next Phantom Express in ${fmt(st.next)} - it comes every hour and waits 30 minutes!` };
      return { prompt: `<kbd>E</kbd> 🎟️ Get a ticket & board the PHANTOM EXPRESS (leaves in ${fmt(st.left)})`, action: board };
    }
    if (Math.hypot(pos.x - TRAIN_BOARD.x, pos.z - TRAIN_BOARD.z) < 4) {
      if (!st.boarding) return { prompt: `🚂 Next train in ${fmt(st.next)} - it comes every hour (at :00) and waits 30 minutes` };
      const since = Date.now() - st.start;
      if (since < ROLL_SECONDS * 1000) return { prompt: '🚂 The train is pulling in... wait!' };
      return { prompt: `<kbd>E</kbd> 🚂 Board the PHANTOM EXPRESS (leaves in ${fmt(st.left)})`, action: board };
    }
    if (inGhostWorld(pos.x, pos.z) && Math.hypot(pos.x - GHOST_TRAIN_STOP.x, pos.z - GHOST_TRAIN_STOP.z) < 5) {
      return { prompt: '<kbd>E</kbd> 🚂 Ride the Phantom Express back to the station', action: () => rideBack(false) };
    }
    return null;
  }

  function update(dt, t, camPos) {
    const now = Date.now();
    const st = trainStatus(now);
    const inside = inHalloween(camPos.x, camPos.z);
    const ghost = inGhostWorld(camPos.x, camPos.z);
    // 火車位置：入站（由北面霧入面駛入）→ 停 → 出站（向南駛走）
    const since = (now - st.start) / 1000;
    let z = null;
    let moving = false;
    if (st.boarding) {
      if (since < ROLL_SECONDS) {
        const k = 1 - since / ROLL_SECONDS;
        z = TRAIN_STOP.z - ROLL_DIST * k * k; // 慢慢停
        moving = true;
      } else z = TRAIN_STOP.z;
    } else {
      // 啱啱開走：駛去南面
      const gone = (now - (st.start - (PHANTOM_EXPRESS_EVERY_MINUTES - PHANTOM_EXPRESS_STAY_MINUTES) * MIN)) / 1000;
      if (gone >= 0 && gone < ROLL_SECONDS) {
        const k = gone / ROLL_SECONDS;
        z = TRAIN_STOP.z + ROLL_DIST * k * k;
        moving = true;
      }
    }
    train.visible = inside && !ghost && z !== null;
    if (train.visible) {
      train.position.z = z;
      train.userData.animate(t, moving);
    }
    ghostTrain.visible = ghost;
    if (ghost) ghostTrain.userData.animate(t, false);
    // 汽笛：每班車入站一次（喺 Halloween 世界先聽到）
    if (st.boarding && lastSlot !== st.start) {
      lastSlot = st.start;
      if (inside && !ghost) {
        play('whistle');
        announce('🚂 The PHANTOM EXPRESS has arrived at the Train Station! 👻');
      }
    }
    // Ghost World：30 分鐘完 → 自動送返去；開車前 1 分鐘提你
    if (ghost && !travelling) {
      if (!st.boarding) rideBack(true);
      else if (st.left < MIN && warned !== st.start) {
        warned = st.start;
        announce('⚠️ The Phantom Express leaves in 1 minute! Catch your last ghosts!');
        play('whistle');
      }
    }
    // 車站燈 + 時間表
    if (inside) {
      boothBeacon.update(t);
      boardBeacon.update(t, st.boarding ? 0x76ff03 : 0xff1744);
      backBeacon.update(t);
      const mins = new Date(now + (st.boarding ? 0 : st.next));
      timetable.draw(st.boarding ? THEMES.green : THEMES.purple, st.boarding
        ? [{ text: '🚂 PHANTOM EXPRESS', size: 0.3 }, { text: 'BOARDING NOW!', size: 0.26 }, { text: `Leaves in ${fmt(st.left)}`, size: 0.24 }]
        : [{ text: '🚂 PHANTOM EXPRESS', size: 0.3 }, { text: `Next train in ${fmt(st.next)}`, size: 0.24 }, { text: `Arrives at ${mins.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · stays 30 min`, size: 0.16 }]);
    }
    // HUD 倒數
    const panelOpen = !document.getElementById('panel').hidden;
    hud.hidden = !inside || panelOpen;
    if (inside && !panelOpen) {
      const text = ghost
        ? `🚂 Train back leaves in ${fmt(st.left)}`
        : st.boarding ? `🚂 Phantom Express boarding! Leaves in ${fmt(st.left)}` : `🚂 Phantom Express arrives in ${fmt(st.next)}`;
      if (hud.textContent !== text) hud.textContent = text;
      hud.classList.toggle('live', st.boarding);
    }
  }

  return { train, ghostTrain, interaction, update, board, rideBack, get travelling() { return travelling; } };
}
