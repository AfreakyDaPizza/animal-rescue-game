// 🧹 Ghost Vacuum + 👻 Ghost World 嘅鬼魂（小朋友 Issue #6 Halloween）
// 喺 Ghost World 嘅吸塵機舖用 Soul Dust 買／升級（Lv1–5，數值喺 balance.js GHOST_VACUUM）
// 揸住 E（或者滑鼠掣／手機 USE）：吸塵機嘴噴出一條旋轉漩渦光柱，光柱入面嘅鬼會「定住」（唔再周圍飄），
// 向住吸塵機嘴拉長、震；頭頂有條進度條慢慢升（Issue #9），滿咗就「啵」一聲爆出 Soul Dust，粒粒吸返入吸塵機 → 得 Soul Dust
// 強啲嘅鬼要吸耐啲，仲會發光之後掟慢慢飛嘅光球（好易閃）；中咗會跌一粒心 ❤️（唔係扣 Soul Dust，Issue #9）
// 冇晒心 → 暈低，喺 Ghost World 火車站醒返，心補返滿
// 吸塵機淨係喺 Halloween 世界先見到（唔入普通世界嘅背包）

import * as THREE from 'three';
import { state, save } from './state.js';
import { GHOST_VACUUM, GHOST_MAX_SOULS, GHOST_HEARTS, GHOST_HEART_REGEN, GHOST_HIT_SAFE } from './data/balance.js';
import { buildSoul, randomSoulType, rollSoulDust, launchSoulOrb } from './halloweenSouls.js';
import { GHOST_WORLD, GHOST_SPAWN_R, STATUE_OF_HALLOWEEN, VACUUM_SHOP, GHOST_TRAIN_STOP, GHOST_ARRIVE, inHalloween, inGhostWorld } from './halloweenShape.js';
import { vacuumHum } from './sound.js';
import { extraPanels, openPanel, panelKind } from './hud.js';
import { short } from './format.js';
import { THEMES } from './signs.js';
import { beacon, glowSign } from './hwBeacons.js';

const WHITE = new THREE.Color(0xffffff);
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const $ = (id) => document.getElementById(id);
const tmp = new THREE.Vector3();
const fwd = new THREE.Vector3();

export const vacuumInfo = (level = state.vacuumLevel) => GHOST_VACUUM[Math.max(1, level) - 1];

// ---------- 吸塵機模型（每級一個色；Lv5 金色 + 發光嘅鬼魂缸）----------
// userData.animate(t, sucking, strain, kick)：strain 0→1 = 吸緊嗰隻鬼幾接近捉到（震得越勁、越光）；kick 0→1 = 啱啱捉到（向後彈 + 缸閃）
// userData.mouth：吸塵機嘴（拎佢嘅世界座標做光柱起點）
export function buildVacuumModel(level) {
  const info = GHOST_VACUUM[Math.max(1, level) - 1];
  const g = new THREE.Group();
  const rig = new THREE.Group(); // 震／彈都喺 rig 度做，唔郁 g 本身嘅位置
  g.add(rig);
  const gold = level >= 5;
  const body = new THREE.MeshStandardMaterial({ color: gold ? 0xffc107 : info.color, metalness: gold ? 0.9 : 0.4, roughness: gold ? 0.25 : 0.45, emissive: info.color, emissiveIntensity: level >= 2 ? 0.18 : 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.6, roughness: 0.4 });
  const glowMat = new THREE.MeshStandardMaterial({ color: info.color, emissive: info.color, emissiveIntensity: 1.8, transparent: true, opacity: 0.85 });
  const tankMat = new THREE.MeshStandardMaterial({ color: info.color, emissive: info.color, emissiveIntensity: 1.8, transparent: true, opacity: 0.85 });
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    rig.add(m);
    return m;
  };
  // 缸（鬼魂吸入去會喺度轉）
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 14), body, 0, 0, 0.15).rotation.x = Math.PI / 2;
  const tank = add(new THREE.SphereGeometry(0.16, 12, 10), tankMat, 0, 0.22, 0.15);
  // 缸入面轉緊嘅細鬼火
  const wisps = [0, 1, 2].map(() => {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    tank.add(w);
    return w;
  });
  add(new THREE.TorusGeometry(0.22, 0.03, 6, 16), dark, 0, 0, -0.12);
  // 槍管 + 闊嘴
  add(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 10), dark, 0, 0, -0.45).rotation.x = Math.PI / 2;
  // 槍管上面三粒燈：吸得越耐着得越多
  const leds = [0, 1, 2].map((i) => add(new THREE.SphereGeometry(0.025, 6, 5), new THREE.MeshBasicMaterial({ color: 0x333333 }), 0, 0.075, -0.3 - i * 0.14));
  const nozzle = add(new THREE.CylinderGeometry(0.16, 0.09, 0.22, 14, 1, true), body, 0, 0, -0.85);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.material = body.clone();
  nozzle.material.side = THREE.DoubleSide;
  const mouth = add(new THREE.RingGeometry(0.06, 0.15, 16), glowMat, 0, 0, -0.96);
  mouth.rotation.y = Math.PI;
  // 嘴入面嘅漩渦（吸緊先轉得快）
  const swirl = add(new THREE.RingGeometry(0.01, 0.1, 12, 1, 0, Math.PI * 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0, -0.93);
  // 手柄
  add(new THREE.BoxGeometry(0.08, 0.26, 0.1), dark, 0, -0.2, 0.05);
  // 高級：兩邊有鰭 / 金色尖角
  if (level >= 3) for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.18, 0.3), glowMat, s * 0.24, 0.06, 0.15);
  if (level >= 4) for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.05, 0.2, 6), glowMat, s * 0.12, 0.26, -0.1);
  if (gold) add(new THREE.TorusGeometry(0.28, 0.025, 6, 20), glowMat, 0, 0, 0.42);
  const base = new THREE.Color(info.color);
  const hot = new THREE.Color(0xffffff);
  const tmpC = new THREE.Color();
  let on = 0; // 0 → 1：開機（慢慢加速）
  g.userData = {
    level,
    mouth,
    // tint：而家吸緊嗰隻鬼嘅顏色（缸會慢慢變佢嘅色）
    animate(t, sucking, strain = 0, kick = 0, tint = null, dt = 1 / 60) {
      on += ((sucking ? 1 : 0) - on) * Math.min(1, dt * 6);
      const k = strain * on;
      // 震：吸緊會震，越接近捉到震得越勁；捉到就向後彈
      const amp = on * (0.006 + k * 0.022);
      rig.position.set(Math.sin(t * 61) * amp, Math.cos(t * 73) * amp, Math.sin(t * 47) * amp * 0.5 + kick * 0.12);
      rig.rotation.x = kick * 0.25 + Math.sin(t * 55) * amp * 2;
      tank.scale.setScalar(1 + Math.sin(t * (3 + on * 15)) * (0.05 + on * 0.1) + kick * 0.5);
      tmpC.copy(base);
      if (tint) tmpC.lerp(tint, Math.min(1, k * 1.2));
      tmpC.lerp(hot, kick * 0.8);
      tankMat.color.copy(tmpC);
      tankMat.emissive.copy(tmpC);
      tankMat.emissiveIntensity = 1.6 + on * 1.6 + k * 2 + kick * 4;
      glowMat.emissiveIntensity = 1.6 + on * 1.8 + Math.sin(t * (2 + on * 20)) * 0.3;
      body.emissiveIntensity = (level >= 2 ? 0.18 : 0.05) + on * 0.35 + k * 0.5;
      mouth.rotation.z = t * (1 + on * 14);
      swirl.rotation.z = -t * (2 + on * 22);
      swirl.material.opacity = on * 0.8;
      swirl.material.color.copy(tmpC).lerp(hot, 0.5);
      wisps.forEach((w, i) => {
        const a = t * (2 + on * 9) + (i / 3) * Math.PI * 2;
        w.position.set(Math.cos(a) * 0.09, Math.sin(a * 1.3) * 0.05, Math.sin(a) * 0.09);
      });
      leds.forEach((l, i) => l.material.color.setHex(k > (i + 0.5) / 3.5 ? 0x76ff03 : on > 0.5 && i === 0 ? 0xffeb3b : 0x333333));
    },
  };
  return g;
}

// ---------- 吸塵機舖面板 ----------
function shopHtml() {
  const lv = state.vacuumLevel;
  const rows = GHOST_VACUUM.map((v, i) => {
    const n = i + 1;
    const owned = lv >= n;
    const next = n === lv + 1;
    const can = state.soulDust >= v.cost;
    const btn = owned ? '<span class="owned">✔ Owned</span>'
      : next ? `<button data-hw="buyVac" data-lv="${n}" class="${can ? '' : 'grey'}">${n === 1 ? (v.cost ? `Get it (${short(v.cost)} 💀)` : 'Get it FREE!') : `Upgrade (${short(v.cost)} 💀)`}</button>`
        : '<span class="locked">🔒</span>';
    return `<div class="card-animal ${owned ? 'equipped' : ''}" style="border-color:#${v.color.toString(16).padStart(6, '0')}">
      <div class="emoji">🧹</div><b>Lv ${n} · ${v.name}</b>
      <small>⚡ Speed x${v.power} · 📏 ${v.range} m reach · 🔦 ${v.cone}° beam</small>
      ${btn}</div>`;
  }).join('');
  return `<p class="index-summary">💀 Soul Dust: <b>${short(state.soulDust)}</b> · 🧹 Your vacuum: <b>${lv ? `Lv ${lv} ${vacuumInfo().name}` : 'none yet'}</b></p>
    <p class="hint">Hold <kbd>E</kbd> (or the mouse button / USE) to suck up ghosts. A better vacuum catches them faster and from further away!</p>
    <div class="cards">${rows}</div>`;
}
extraPanels.vacuum = ['🧹 Ghost Vacuum Shop', shopHtml, 'E'];

// ---------- 光柱用嘅材質／貼圖 ----------
// 圓圓柔柔嘅光點（粒子用，唔係四四方方）
let dotTex = null;
function softDot() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.8)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}
const dotMat = (color, size, opacity = 1) => new THREE.PointsMaterial({ color, size, map: softDot(), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });

// 漩渦光柱：圓錐面上有螺旋光紋，一路轉一路流向吸塵機嘴（uv.y = 1 係嘴，0 係最遠）
function vortexMaterial(twist, speed, base) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xb2ff59) }, uOpacity: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
      void main() {
        float v = vUv.y;
        float sw = fract(vUv.x * ${twist.toFixed(1)} + v * 2.5 - uTime * ${speed.toFixed(2)});
        float stripe = smoothstep(0.0, 0.18, sw) * smoothstep(0.55, 0.25, sw);
        float flow = 0.5 + 0.5 * sin(v * 16.0 - uTime * 12.0);
        float a = (${base.toFixed(2)} + stripe * 0.75 + flow * 0.15) * smoothstep(0.0, 0.4, v) * (0.6 + 0.4 * v) * uOpacity;
        vec3 c = mix(uColor, vec3(1.0), stripe * 0.45 + v * 0.25);
        gl_FragColor = vec4(c * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

// ---------- 主體 ----------
// respawn(x, z, rotY)：冇晒心嗰陣將你送返 Ghost World 火車站
export function createGhostHunt({ scene, camera, avatar, isFirstPerson, isBlocked, popup, announce, play, knockback, respawn }) {
  // 拎喺手：第一身掛鏡頭；第三身掛公仔右手
  let handModel = null;
  let avatarModel = null;
  function refreshModels() {
    handModel?.removeFromParent();
    avatarModel?.removeFromParent();
    handModel = avatarModel = null;
    if (!state.vacuumLevel) return;
    handModel = buildVacuumModel(state.vacuumLevel);
    handModel.position.set(0.4, -0.38, -0.95);
    handModel.rotation.y = 0.12; // 槍嘴微微向返畫面中間
    handModel.scale.setScalar(0.5);
    camera.add(handModel);
    avatarModel = buildVacuumModel(state.vacuumLevel);
    avatarModel.position.set(0.05, -0.75, -0.35);
    // 手垂直落地，槍管照向前（-z）
    avatarModel.scale.setScalar(1.6);
    avatar.arms[1].add(avatarModel);
  }
  refreshModels();
  // 吸塵機舖：發光大牌 + 燈 + 指路圈（遠遠都見到）
  const shopBeacon = beacon(scene, VACUUM_SHOP.x, VACUUM_SHOP.z + 3, { color: 0x40c4ff, radius: 1.6 });
  const shopSign = glowSign([{ text: '🧹 GHOST VACUUM SHOP', size: 0.4 }, { text: 'Get & upgrade your vacuum · press E', size: 0.2 }], 5.4, 1.4, THEMES.blue);
  shopSign.position.set(VACUUM_SHOP.x, 6.6, VACUUM_SHOP.z + 1.8);
  scene.add(shopSign);

  // ---- 吸塵光柱（世界座標，每格跟住吸塵機嘴）：beam 嘅 +z 指住嘴，中心喺光柱中間 ----
  const beam = new THREE.Group();
  const outerMat = vortexMaterial(3, 1.6, 0.22);
  const innerMat = vortexMaterial(2, 2.6, 0.35);
  const outer = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 40, 1, true), outerMat);
  outer.rotation.x = Math.PI / 2; // 尖嗰頭喺吸塵機嘴（+z），開口向遠處
  const inner = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24, 1, true), innerMat);
  inner.rotation.x = Math.PI / 2;
  beam.add(outer, inner);
  // 一圈圈光環由遠處縮埋入嘴
  const RINGS = 5;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const rings = Array.from({ length: RINGS }, () => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 4, 40), ringMat.clone());
    beam.add(r);
    return r;
  });
  // 螺旋粒子：由遠處捲入嘴
  const PN = 140;
  const pPos = new Float32Array(PN * 3);
  const pSeed = Array.from({ length: PN }, () => [Math.random(), Math.random() * Math.PI * 2, 0.3 + Math.random() * 0.7, 0.8 + Math.random() * 0.8]);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const parts = new THREE.Points(pGeo, dotMat(0xe0ffff, 0.22, 0.95));
  parts.frustumCulled = false;
  beam.add(parts);
  beam.visible = false;
  scene.add(beam);
  // 嘴度嘅光（照亮附近嘅鬼）
  const mouthLight = new THREE.PointLight(0xb2ff59, 0, 9, 1.5);
  scene.add(mouthLight);
  // 俾吸緊嘅鬼 → 嘴：一條條鬼魂色嘅光點流
  const SN = 120;
  const sPos = new Float32Array(SN * 3);
  const sSeed = Array.from({ length: SN }, () => [Math.random(), Math.random() * Math.PI * 2, Math.random()]);
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SN * 3), 3));
  const streamMat = dotMat(0xffffff, 0.2, 1);
  streamMat.vertexColors = true;
  const stream = new THREE.Points(sGeo, streamMat);
  stream.frustumCulled = false;
  stream.visible = false;
  scene.add(stream);

  // ---- 捉到鬼：「啵」爆開 → Soul Dust 粒粒彈出去，之後俾吸返入吸塵機嘴 ----
  const bursts = [];
  const GOLD = new THREE.Color(0xffd740);
  function burst(at, color) {
    const N = 46;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const c = new THREE.Color(color);
    const vel = Array.from({ length: N }, (_, i) => {
      const cc = i % 2 ? GOLD : c;
      col.set([cc.r, cc.g, cc.b], i * 3);
      pos.set([at.x, at.y, at.z], i * 3);
      return new THREE.Vector3().randomDirection().multiplyScalar(3 + Math.random() * 4);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = dotMat(0xffffff, 0.32, 1);
    mat.vertexColors = true;
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    // 衝擊波光環 + 一嚿閃光
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    ring.position.copy(at);
    ring.lookAt(camera.getWorldPosition(new THREE.Vector3()));
    const flashBall = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    flashBall.position.copy(at);
    scene.add(ring, flashBall);
    bursts.push({ pts, pos, vel, geo, ring, flashBall, t: 0, N, alive: new Array(N).fill(true) });
  }

  // ---- HUD：Soul Dust + Shard ----
  const hud = document.createElement('div');
  hud.id = 'hw-dust-hud';
  hud.className = 'hud-box';
  hud.hidden = true;
  document.body.appendChild(hud);
  // ❤️ 心（淨係 Ghost World 先見到）
  const heartsEl = document.createElement('div');
  heartsEl.id = 'hw-hearts';
  heartsEl.hidden = true;
  document.body.appendChild(heartsEl);
  // 俾打中：畫面四邊閃紅
  const hurtEl = document.createElement('div');
  hurtEl.id = 'hw-hurt';
  document.body.appendChild(hurtEl);
  // 暈低畫面
  const koEl = document.createElement('div');
  koEl.id = 'hw-ko';
  koEl.hidden = true;
  koEl.innerHTML = '<div class="ko-stars">💫</div><b>Knocked out!</b><span>Too many soul orbs! You wake up at the train stop.</span>';
  document.body.appendChild(koEl);
  // 進度條（跟住俾吸緊嘅鬼，喺佢頭頂）
  const barsEl = document.createElement('div');
  barsEl.id = 'hw-suck-bars';
  document.body.appendChild(barsEl);
  const barPool = [];
  function bar(i) {
    while (barPool.length <= i) {
      const el = document.createElement('div');
      el.className = 'hw-suck';
      el.innerHTML = '<b></b><div class="bar"><i></i></div>';
      barsEl.appendChild(el);
      barPool.push({ el, name: el.querySelector('b'), fill: el.querySelector('i'), last: '' });
    }
    return barPool[i];
  }

  // ---- 心 ----
  let hearts = GHOST_HEARTS;
  let regenT = 0; // 幾耐冇俾人打中（夠 GHOST_HEART_REGEN 秒就回一粒心）
  let safeT = 0; // 俾打中之後嘅保護時間
  let ko = -1; // >= 0：暈低緊（秒）
  let heartsHtml = '';
  let lostAt = -1; // 啱啱跌咗嗰粒心（彈一彈）
  let lostT = 0;
  function drawHearts() {
    const lostIndex = lostT > 0 ? lostAt : -1;
    let html = '';
    for (let i = 0; i < GHOST_HEARTS; i++) {
      const full = i < hearts;
      const filling = i === hearts && hearts < GHOST_HEARTS; // 下一粒：慢慢回緊
      html += `<span class="h ${full ? 'full' : 'empty'}${i === lostIndex ? ' lost' : ''}${filling ? ' filling' : ''}">${full ? '❤️' : '🖤'}</span>`;
    }
    if (html !== heartsHtml) heartsEl.innerHTML = heartsHtml = html;
  }
  drawHearts();
  function hurt() {
    hurtEl.classList.remove('on');
    void hurtEl.offsetWidth;
    hurtEl.classList.add('on');
  }

  // ---- 輸入：揸住 E／滑鼠左掣／手機 USE ----
  const hold = { key: false, mouse: false, touch: false };
  window.addEventListener('keydown', (e) => e.code === 'KeyE' && (hold.key = true));
  window.addEventListener('keyup', (e) => e.code === 'KeyE' && (hold.key = false));
  window.addEventListener('mousedown', (e) => e.button === 0 && (hold.mouse = true));
  window.addEventListener('mouseup', (e) => e.button === 0 && (hold.mouse = false));
  window.addEventListener('blur', () => (hold.key = hold.mouse = hold.touch = false));
  let touchHooked = false;
  function hookTouch() {
    const b = $('t-use');
    if (!b || touchHooked) return;
    touchHooked = true;
    b.addEventListener('touchstart', () => (hold.touch = true), { passive: true });
    b.addEventListener('touchend', () => (hold.touch = false), { passive: true });
    b.addEventListener('touchcancel', () => (hold.touch = false), { passive: true });
  }

  // 近住呢啲嘢嘅時候撳 E 係用嗰樣嘢，唔係吸塵
  const nearThing = (p) => [STATUE_OF_HALLOWEEN, VACUUM_SHOP, GHOST_TRAIN_STOP].some((o) => Math.hypot(p.x - o.x, p.z - o.z) < 5.5);

  // ---- 鬼魂 ----
  const souls = [];
  const orbs = [];
  function spawnSoul(playerPos) {
    const type = randomSoulType();
    let x;
    let z;
    for (let tries = 0; tries < 12; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = 12 + Math.random() * (GHOST_SPAWN_R - 14);
      x = GHOST_WORLD.x + Math.cos(a) * r;
      z = GHOST_WORLD.z + Math.sin(a) * r;
      if (Math.hypot(x - playerPos.x, z - playerPos.z) > 10 && Math.hypot(x - GHOST_TRAIN_STOP.x, z - GHOST_TRAIN_STOP.z) > 8) break;
    }
    const g = buildSoul(type.id);
    g.position.set(x, 0.8 + Math.random() * 1.6, z);
    g.scale.setScalar(0.01); // 慢慢出現
    scene.add(g);
    souls.push({ g, type, p: 0, target: new THREE.Vector3(x, g.position.y, z), wait: 0, attack: type.attackEvery ? type.attackEvery * (0.6 + Math.random()) : 0, charge: 0, appear: 0, held: 0, caught: -1 });
  }
  function clearOrbs() {
    for (const o of orbs) o.dispose();
    orbs.length = 0;
  }
  function clearAll() {
    for (const s of souls) scene.remove(s.g);
    souls.length = 0;
    clearOrbs();
  }

  let wasGhost = false;
  let sucking = false;
  let kick = 0; // 啱啱捉到：吸塵機向後彈
  const tint = new THREE.Color();
  const mouthPos = new THREE.Vector3();
  const aimFrom = new THREE.Vector3();
  const beamDir = new THREE.Vector3();
  const head = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3();
  const sCol = sGeo.attributes.color.array;

  function hideBars(from = 0) {
    for (let i = from; i < barPool.length; i++) if (!barPool[i].el.hidden) barPool[i].el.hidden = true;
  }
  function stopFx() {
    beam.visible = false;
    stream.visible = false;
    mouthLight.intensity = 0;
    vacuumHum(false);
    hideBars();
  }

  function update(dt, t, { pos, feetY, paused, view = camera }) {
    hookTouch();
    const inside = inHalloween(pos.x, pos.z);
    const ghost = inGhostWorld(pos.x, pos.z);
    // 吸塵機：喺 Halloween 世界先見到
    const fp = isFirstPerson();
    if (handModel) handModel.visible = inside && fp && !paused;
    if (avatarModel) avatarModel.visible = inside;
    // HUD
    const panelOpen = !$('panel').hidden;
    hud.hidden = !inside || panelOpen;
    heartsEl.hidden = !ghost || panelOpen;
    if (inside && !panelOpen) {
      const text = `💀 Soul Dust: ${short(state.soulDust)} · 🔮 Shards: ${state.hwShards}${state.vacuumLevel ? ` · 🧹 Lv ${state.vacuumLevel}` : ''}`;
      if (hud.textContent !== text) hud.textContent = text;
    }
    if (ghost) shopBeacon.update(t);
    // 離開 Ghost World：清晒啲鬼，心補返滿
    if (!ghost) {
      if (wasGhost) clearAll();
      wasGhost = false;
      sucking = false;
      hearts = GHOST_HEARTS;
      regenT = 0;
      if (ko >= 0) {
        ko = -1;
        koEl.hidden = true;
      }
      stopFx();
      return;
    }
    wasGhost = true;
    if (paused) {
      stopFx();
      return;
    }
    while (souls.length < GHOST_MAX_SOULS) spawnSoul(pos);

    // ---- 心：冇俾人打中就慢慢回 ----
    safeT = Math.max(0, safeT - dt);
    if (ko < 0 && hearts < GHOST_HEARTS) {
      regenT += dt;
      if (regenT >= GHOST_HEART_REGEN) {
        regenT = 0;
        hearts += 1;
        play('heartBack');
      }
    }
    lostT = Math.max(0, lostT - dt);
    heartsEl.style.setProperty('--regen', hearts < GHOST_HEARTS ? (regenT / GHOST_HEART_REGEN).toFixed(2) : '0');
    drawHearts();
    // ---- 暈低：黑畫面 → 送返火車站 → 心補返滿 ----
    if (ko >= 0) {
      ko += dt;
      if (ko >= 0.7 && ko - dt < 0.7) {
        clearOrbs();
        respawn?.(GHOST_ARRIVE.x, GHOST_ARRIVE.z, GHOST_ARRIVE.rotY);
        hearts = GHOST_HEARTS;
        regenT = 0;
        safeT = 3; // 醒返有 3 秒保護
      }
      if (ko >= 2.6) {
        ko = -1;
        koEl.hidden = true;
      }
    }

    // ---- 吸緊？ ----
    const holding = hold.key || hold.mouse || hold.touch;
    sucking = holding && ko < 0 && state.vacuumLevel > 0 && !isBlocked() && !nearThing(pos);
    if (holding && !state.vacuumLevel && !nearThing(pos) && !isBlocked() && Math.random() < dt * 2) popup('🧹 Get a Ghost Vacuum at the Vacuum Shop first! (near the train)');
    const info = vacuumInfo();
    camera.getWorldDirection(fwd);
    fwd.y = Math.max(-0.35, Math.min(0.35, fwd.y));
    fwd.normalize();
    // 光柱起點：手上吸塵機個嘴（第一身／第三身），冇就用胸口前面
    const model = fp ? handModel : avatarModel;
    if (model?.visible) model.userData.mouth.getWorldPosition(mouthPos).addScaledVector(fwd, 0.04);
    else mouthPos.set(pos.x, (feetY ?? 0) + 1.2, pos.z).addScaledVector(fwd, 0.8);
    // 瞄準就跟眼（畫面中間），光柱就由吸塵機嘴射去眼望住嘅最遠點
    aimFrom.copy(pos);
    beamDir.copy(aimFrom).addScaledVector(fwd, info.range).sub(mouthPos);
    const beamLen = beamDir.length();
    beamDir.normalize();
    const rad = Math.tan(THREE.MathUtils.degToRad(info.cone / 2)) * info.range;
    const cosCone = Math.cos(THREE.MathUtils.degToRad(info.cone / 2));

    // ---- 每隻鬼 ----
    let strain = 0; // 最接近捉到嗰隻有幾接近
    let strainColor = null;
    const targets = [];
    for (let i = souls.length - 1; i >= 0; i--) {
      const s = souls[i];
      const g = s.g;
      // 捉到咗：0.3 秒「咻」一聲縮細飛去吸塵機嘴，之後「啵」
      if (s.caught >= 0) {
        s.caught += dt;
        const k = Math.min(1, s.caught / 0.3);
        g.position.lerp(mouthPos, k * 0.18);
        g.userData.pull(k, mouthPos);
        g.scale.setScalar(Math.max(0.01, 1 - k * k));
        g.userData.update(t);
        if (k >= 1) {
          head.copy(g.position).y += g.userData.mid;
          burst(head, s.type.color);
          scene.remove(g);
          souls.splice(i, 1);
        }
        continue;
      }
      s.appear = Math.min(1, s.appear + dt * 1.5);
      const d = tmp.copy(g.position).sub(aimFrom);
      d.y += g.userData.mid; // 對住隻鬼個身中間
      const dist = d.length();
      // 已經吸住咗嘅鬼：光柱稍為偏少少都唔會甩（易啲捉）
      const inBeam = sucking && dist < info.range + (s.held ? 1 : 0) && d.normalize().dot(fwd) > (s.held ? cosCone - 0.06 : cosCone);
      if (inBeam) {
        s.held = 0.25;
        s.p += (dt * info.power) / s.type.catchSeconds;
        // 定住唔郁（Issue #9）：唔再周圍飄，淨係喺原位掙扎（震喺 halloweenSouls 入面做）
        s.target.copy(g.position);
        s.wait = 1.5;
        if (s.p >= strain) {
          strain = s.p;
          strainColor = s.type.color;
        }
        targets.push(s);
      } else {
        s.held = Math.max(0, s.held - dt);
        s.p = Math.max(0, s.p - dt * 0.35); // 走甩咗：慢慢回復
        // 啱啱甩咗（held 未到 0）：仲係定住一陣先再飄
        if (!s.held) {
          s.wait -= dt;
          if (s.wait <= 0) {
            s.wait = 2 + Math.random() * 3;
            const a = Math.random() * Math.PI * 2;
            const r = 8 + Math.random() * (GHOST_SPAWN_R - 10);
            s.target.set(GHOST_WORLD.x + Math.cos(a) * r, 0.8 + Math.random() * 1.8, GHOST_WORLD.z + Math.sin(a) * r);
          }
          g.position.lerp(s.target, Math.min(1, dt * 0.25));
        }
      }
      g.scale.setScalar(s.appear);
      g.userData.suck(s.p, mouthPos);
      g.userData.update(t);
      if (s.p >= 1) {
        // 捉到！
        const dust = rollSoulDust(s.type);
        state.soulDust += dust;
        save();
        s.caught = 0;
        kick = 1;
        play('soulCatch');
        popup(`👻 Caught a ${s.type.name}! +${short(dust)} 💀 Soul Dust`);
        continue;
      }
      // 攻擊：發光（預告）→ 掟一粒慢慢飛嘅光球去你企嘅位
      if (s.type.attackEvery && !inBeam) {
        const near = Math.hypot(g.position.x - pos.x, g.position.z - pos.z) < 26;
        s.attack -= dt;
        if (near && s.attack <= 0.9 && s.attack > 0) g.userData.charge(1 - s.attack / 0.9);
        else g.userData.charge(0);
        if (s.attack <= 0) {
          s.attack = s.type.attackEvery * (0.8 + Math.random() * 0.5);
          if (near && ko < 0) orbs.push(launchSoulOrb(scene, g.position.clone().setY(g.position.y + g.userData.mid), new THREE.Vector3(pos.x, (feetY ?? 0) + 1.1, pos.z), s.type.color));
        }
      } else g.userData.charge(0);
    }

    // ---- 進度條（喺俾吸緊／啱啱甩咗嘅鬼頭頂）----
    let nBar = 0;
    let barMinY = 44;
    for (const s of souls) {
      if (s.caught >= 0 || s.p < 0.01) continue;
      head.copy(s.g.position).y += s.g.userData.mid + s.g.userData.height * 0.55 + 0.35;
      head.project(view);
      if (head.z > 1 || Math.abs(head.x) > 1.1 || Math.abs(head.y) > 1.1) continue;
      const b = bar(nBar++);
      b.el.hidden = false;
      // 唔好疊住上面嘅活動橫額：條 bar 最高只可以去到橫額下面
      if (nBar === 1) {
        const ban = document.getElementById('event-banner');
        const r = ban && ban.offsetParent ? ban.getBoundingClientRect() : null;
        barMinY = r && r.height ? r.bottom + 44 : 44;
      }
      const sy = Math.max(barMinY, ((1 - head.y) / 2) * innerHeight);
      b.el.style.transform = `translate(${((head.x + 1) / 2) * innerWidth}px, ${sy}px) translate(-50%, -100%)`;
      const pct = Math.min(99, Math.floor(s.p * 100));
      const key = `${s.type.id}${pct}${targets.includes(s) ? 1 : 0}`;
      if (b.last !== key) {
        b.last = key;
        b.name.textContent = `${s.type.name} ${pct}%`;
        b.fill.style.width = `${s.p * 100}%`;
        b.el.style.setProperty('--c', `#${s.type.color.toString(16).padStart(6, '0')}`);
        b.el.classList.toggle('slipping', !targets.includes(s));
        b.el.classList.toggle('almost', s.p > 0.75);
      }
    }
    hideBars(nBar);

    // ---- 光柱 ----
    kick = Math.max(0, kick - dt * 4);
    beam.visible = sucking;
    if (sucking) {
      beam.position.copy(mouthPos).addScaledVector(beamDir, beamLen / 2);
      beam.lookAt(mouthPos);
      outer.scale.set(rad, beamLen, rad);
      inner.scale.set(rad * 0.38, beamLen, rad * 0.38);
      const col = tint.setHex(info.color);
      if (strainColor) col.lerp(new THREE.Color(strainColor), 0.35);
      const pulse = 0.85 + Math.sin(t * 20) * 0.15;
      for (const [m, o] of [[outerMat, 0.75], [innerMat, 0.9]]) {
        m.uniforms.uTime.value = t;
        m.uniforms.uColor.value.copy(col);
        m.uniforms.uOpacity.value = o * pulse * (1 + strain * 0.4);
      }
      rings.forEach((r, i) => {
        const k = (i / RINGS + t * 0.9) % 1; // 0 = 最遠，1 = 嘴
        r.position.z = -beamLen / 2 + k * beamLen;
        r.scale.setScalar(Math.max(0.01, rad * (1 - k)));
        r.rotation.z = t * 3 + i;
        r.material.color.copy(col).lerp(WHITE, 0.4);
        r.material.opacity = 0.3 * Math.sin(k * Math.PI);
      });
      parts.material.color.copy(col).lerp(WHITE, 0.55);
      // 粒子：螺旋捲入嘴，越近越快、越細圈
      pSeed.forEach((s, i) => {
        const k = (s[0] + t * 0.9 * s[3]) % 1;
        const kk = k * k;
        const along = -beamLen / 2 + kk * beamLen;
        const rr = rad * (1 - kk) * s[2];
        const a = s[1] + t * 3 + kk * 9;
        pPos[i * 3] = Math.cos(a) * rr;
        pPos[i * 3 + 1] = Math.sin(a) * rr;
        pPos[i * 3 + 2] = along;
      });
      pGeo.attributes.position.needsUpdate = true;
      mouthLight.position.copy(mouthPos).addScaledVector(beamDir, 0.6);
      mouthLight.color.copy(col);
      mouthLight.intensity = 6 + strain * 10 + Math.sin(t * 25) * 1.5;
    } else mouthLight.intensity = kick * 12;
    // 鬼 → 嘴嘅光點流（吸住咗先有）
    stream.visible = targets.length > 0;
    if (stream.visible) {
      for (let i = 0; i < SN; i++) {
        const s = targets[i % targets.length];
        const seed = sSeed[i];
        const k = (seed[0] + t * (1.2 + s.p)) % 1;
        head.copy(s.g.position).y += s.g.userData.mid;
        tmp.copy(mouthPos).sub(head);
        const len = tmp.length();
        tmp.normalize();
        side.crossVectors(tmp, WORLD_UP).normalize();
        up.crossVectors(side, tmp);
        const r = (1 - k) * 0.55 * (0.4 + seed[2] * 0.6) * (1 + s.p * 0.5);
        const a = seed[1] + t * 7 + k * 8;
        head.addScaledVector(tmp, len * k * k).addScaledVector(side, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r);
        sPos.set([head.x, head.y, head.z], i * 3);
        const c = tint.setHex(s.type.color).lerp(WHITE, k * 0.5);
        sCol.set([c.r, c.g, c.b], i * 3);
      }
      sGeo.attributes.position.needsUpdate = true;
      sGeo.attributes.color.needsUpdate = true;
    }
    // 吸塵機：震 + 發光 + 聲
    const tintC = strainColor ? new THREE.Color(strainColor) : null;
    if (handModel) handModel.userData.animate(t, sucking, strain, kick, tintC, dt);
    if (avatarModel) avatarModel.userData.animate(t, sucking, strain, kick, tintC, dt);
    vacuumHum(sucking, strain);

    // ---- 光球 ----
    const chest = new THREE.Vector3(pos.x, (feetY ?? 0) + 1.1, pos.z);
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      const r = o.update(dt);
      if (r === 'done') {
        orbs.splice(i, 1);
        continue;
      }
      if (o.flying && ko < 0 && safeT <= 0 && o.position.distanceTo(chest) < o.radius + 0.55) {
        o.dispose();
        orbs.splice(i, 1);
        // Issue #9：唔再扣 Soul Dust，係跌一粒心
        hearts = Math.max(0, hearts - 1);
        regenT = 0;
        safeT = GHOST_HIT_SAFE;
        lostAt = hearts;
        lostT = 0.5;
        drawHearts();
        hurt();
        knockback(tmp.copy(chest).sub(o.position).setY(0).normalize());
        if (hearts > 0) {
          play('heartLost');
          popup(`💥 A soul orb hit you! ${hearts} ❤️ left - dodge them!`);
        } else {
          play('knockedOut');
          ko = 0;
          koEl.hidden = false;
          koEl.classList.remove('on');
          void koEl.offsetWidth;
          koEl.classList.add('on');
          hold.key = hold.mouse = hold.touch = false;
        }
      }
    }

    // ---- 爆閃：Soul Dust 先彈開，之後俾吸返入吸塵機嘴 ----
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.t += dt;
      let left = 0;
      b.vel.forEach((v, k) => {
        if (!b.alive[k]) return;
        const p = tmp.fromArray(b.pos, k * 3);
        if (b.t < 0.35) {
          v.multiplyScalar(1 - dt * 3);
          p.addScaledVector(v, dt);
        } else {
          // 吸返入嘴：越嚟越快
          const pull = side.copy(mouthPos).sub(p);
          const dd = pull.length();
          if (dd < 0.25) {
            b.alive[k] = false;
            p.set(0, -999, 0);
          } else {
            v.lerp(pull.multiplyScalar((14 + (b.t - 0.35) * 30) / dd), Math.min(1, dt * 6));
            p.addScaledVector(v, dt);
          }
        }
        if (b.alive[k]) left++;
        p.toArray(b.pos, k * 3);
      });
      b.geo.attributes.position.needsUpdate = true;
      b.ring.scale.setScalar(1 + b.t * 9);
      b.ring.material.opacity = Math.max(0, 0.9 - b.t * 2.2);
      b.flashBall.scale.setScalar(1 + b.t * 3);
      b.flashBall.material.opacity = Math.max(0, 1 - b.t * 5);
      if (left === 0 || b.t > 2) {
        scene.remove(b.pts, b.ring, b.flashBall);
        b.geo.dispose();
        b.ring.geometry.dispose();
        b.flashBall.geometry.dispose();
        bursts.splice(i, 1);
        kick = Math.max(kick, 0.5); // 最後一粒入缸：再彈一下
      }
    }
  }

  // 吸塵機舖
  function interaction(pos) {
    if (!inGhostWorld(pos.x, pos.z)) return null;
    if (Math.hypot(pos.x - VACUUM_SHOP.x, pos.z - VACUUM_SHOP.z - 2) < 5) return { prompt: `<kbd>E</kbd> 🧹 Ghost Vacuum Shop${state.vacuumLevel ? ` (you have Lv ${state.vacuumLevel})` : ' - get your vacuum here!'}`, action: () => openPanel('vacuum') };
    return null;
  }
  function buy(level) {
    const v = GHOST_VACUUM[level - 1];
    if (!v || level !== state.vacuumLevel + 1) return;
    if (state.soulDust < v.cost) return popup(`💀 You need ${short(v.cost - state.soulDust)} more Soul Dust! Catch more ghosts.`);
    state.soulDust -= v.cost;
    state.vacuumLevel = level;
    save();
    refreshModels();
    play('upgrade');
    announce(`🧹 You got the Lv ${level} ${v.name}!`);
  }
  $('panel-body').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-hw="buyVac"]');
    if (!b || panelKind() !== 'vacuum') return;
    buy(Number(b.dataset.lv));
    $('panel-body').innerHTML = shopHtml();
  });

  return {
    update, interaction, buy, souls, orbs, bursts, hold, refreshModels, clearAll,
    get sucking() { return sucking; },
    get mouth() { return mouthPos; },
    get hearts() { return hearts; },
    set hearts(n) { hearts = Math.max(0, Math.min(GHOST_HEARTS, n)); },
    get knockedOut() { return ko >= 0; },
  };
}
