// 🐂 BUCKING BULL（Issue #21 留言，小朋友 2026-11-13：「add some new entertainment for the catch and tame event」）
// Hub 🤠 牧場區右下角一隻機械牛：撳 E 坐上去，佢會跳、會轉、會左右擺，你用 A / D（或者 ◀ ▶ 掣）保持平衡，
// 越坐得耐越難；跌落嚟就計時。每坐 BULL_TOKEN_SECONDS 秒得 1 個 🤠 Tame Token（每次最多 BULL_MAX_TOKENS），
// 破自己紀錄再加 BULL_BEST_BONUS。數值喺 src/data/tame.js（BULL_*）；位置 BUCKING_BULL 喺 src/hubShape.js。
//
// 用法（main.js）：
//   const bull = createBuckingBull({ scene, play, popup, announce, onStart, onEnd })
//   bull.interaction(pos)         // E 掣：{ prompt, action } 或者 null
//   bull.update(dt, time)         // 每格（暫停時 dt = 0）
//   bull.afterView(avatar)        // updateThirdPerson 之後：將你個公仔擺上牛背
//   bull.active / bull.view       // 坐緊嗰陣用 bull.view 做鏡頭
//   bull.debug.start() / .fall()  // 測試

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { state, save } from './state.js';
import { addCollider } from './world.js';
import { makeSign, makeLabel, THEMES } from './signs.js';
import { BUCKING_BULL } from './hubShape.js';
import { BULL_TOKEN_SECONDS, BULL_MAX_TOKENS, BULL_BEST_BONUS, BULL_START_PUSH, BULL_PUSH_GROWTH, BULL_CONTROL, BULL_TIP } from './data/tame.js';

const PI = Math.PI;
const ACT = 3.2; // 行到幾近先撳得 E
const $ = (id) => document.getElementById(id);

const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
const GLOW = (color, k = 1.5) => M(color, { emissive: color, emissiveIntensity: k });
const rbox = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2);
function add(parent, geo, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ---------- 🐂 機械牛（正面 -z；pivot 喺支柱頂）----------
function buildBull() {
  const pivot = new THREE.Group();
  const hide = M(0x6d4c41);
  const dark = M(0x3e2723);
  const metal = M(0xb0bec5, { metalness: 0.8, roughness: 0.3 });
  const horn = M(0xfff8e1);
  const red = M(0xd32f2f);
  const gold = M(0xffca28, { metalness: 0.7, roughness: 0.3 });
  add(pivot, rbox(1.05, 0.85, 1.9), hide, 0, 0.5, 0); // 身
  add(pivot, rbox(1.1, 0.3, 0.6), dark, 0, 0.82, -0.62); // 膊頭隆起
  // 頭
  const head = new THREE.Group();
  head.position.set(0, 0.62, -1.05);
  pivot.add(head);
  add(head, rbox(0.72, 0.62, 0.62), hide, 0, 0, -0.18);
  add(head, rbox(0.6, 0.34, 0.24), M(0xf8bbd0), 0, -0.15, -0.52); // 鼻
  for (const s of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.045, 8, 6), dark, s * 0.13, -0.12, -0.65, false); // 鼻孔
    add(head, new THREE.BoxGeometry(0.12, 0.12, 0.04), M(0xffffff), s * 0.2, 0.12, -0.5, false);
    add(head, new THREE.BoxGeometry(0.06, 0.08, 0.02), dark, s * 0.2, 0.11, -0.525, false);
    add(head, new THREE.BoxGeometry(0.16, 0.04, 0.03), dark, s * 0.2, 0.22, -0.5, false).rotation.z = s * 0.35; // 眉（扮惡）
    const h = add(head, new THREE.ConeGeometry(0.08, 0.5, 8), horn, s * 0.5, 0.3, -0.15);
    h.rotation.z = -s * 1.0;
    add(head, rbox(0.14, 0.2, 0.08), hide, s * 0.42, 0.08, -0.05); // 耳
  }
  add(head, new THREE.TorusGeometry(0.1, 0.025, 6, 14), gold, 0, -0.27, -0.64, false); // 鼻環
  // 腳（短，似機械牛）+ 螺絲
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    add(pivot, rbox(0.26, 0.45, 0.26), dark, sx * 0.34, 0.02, sz * 0.65);
    add(pivot, new THREE.CylinderGeometry(0.06, 0.06, 0.04, 6), metal, sx * 0.535, 0.55, sz * 0.5, false).rotation.z = PI / 2;
  }
  // 馬鞍 + 繩
  add(pivot, rbox(0.95, 0.12, 0.8), red, 0, 0.96, 0.05);
  add(pivot, rbox(1.08, 0.06, 0.16), gold, 0, 0.62, 0.05);
  add(pivot, new THREE.TorusGeometry(0.16, 0.035, 6, 14), M(0xd7b98a), 0, 1.08, -0.38, false).rotation.x = PI / 2.4; // 手抽
  // 尾
  const tail = add(pivot, new THREE.BoxGeometry(0.07, 0.6, 0.07), dark, 0, 0.55, 1.0);
  tail.geometry.translate(0, -0.3, 0);
  tail.position.y = 0.85;
  tail.rotation.x = -0.4;
  add(tail, new THREE.BoxGeometry(0.14, 0.16, 0.14), dark, 0, -0.62, 0, false);
  pivot.userData = { head, tail };
  return pivot;
}

export function createBuckingBull({ scene, play = () => {}, popup = () => {}, announce = () => {}, onStart = () => {}, onEnd = () => {} }) {
  const { x: X, z: Z } = BUCKING_BULL;
  const root = new THREE.Group();
  root.position.set(X, 0, Z);
  scene.add(root);

  // 共用場地（🎪 三個小遊戲都用）：一直見到
  const arena = new THREE.Group();
  arena.position.set(X, 0, Z);
  scene.add(arena);
  // ---- 場地：軟墊圓圈 + 紅白欄 + 燈 ----
  const mat = add(arena, new THREE.CylinderGeometry(3.1, 3.1, 0.12, 40), M(0x1e88e5), 0, 0.06, 0);
  mat.castShadow = false;
  const ring = add(arena, new THREE.TorusGeometry(3.1, 0.18, 8, 48), M(0xfdd835), 0, 0.14, 0);
  ring.rotation.x = PI / 2;
  for (let k = 0; k < 8; k++) { // 軟墊一格格
    const a = (k / 8) * PI * 2;
    const seg = add(arena, new THREE.BoxGeometry(0.06, 0.02, 2.2), M(0x1565c0), Math.cos(a) * 1.9, 0.13, Math.sin(a) * 1.9, false);
    seg.rotation.y = -a + PI / 2;
  }
  // 支柱（紅白間條）
  for (let k = 0; k < 5; k++) add(root, new THREE.CylinderGeometry(0.42, 0.42, 0.2, 16), M(k % 2 ? 0xffffff : 0xe53935), 0, 0.22 + k * 0.2, 0);
  add(root, new THREE.CylinderGeometry(0.7, 0.8, 0.16, 20), M(0x546e7a, { metalness: 0.6 }), 0, 0.12, 0);
  // 燈柱（四角，頂有一粒燈）
  const bulbs = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * PI * 2 + PI / 4;
    const px = Math.cos(a) * 3.6;
    const pz = Math.sin(a) * 3.6;
    add(arena, new THREE.BoxGeometry(0.18, 2.6, 0.18), M(0x8d5a32), px, 1.3, pz);
    bulbs.push(add(arena, new THREE.SphereGeometry(0.2, 12, 8), GLOW(k % 2 ? 0xffeb3b : 0xff7043, 1.2), px, 2.7, pz, false));
  }
  // 招牌（🎪 輪替招牌由 ranchGames.js 起；呢塊細牌跟隻牛）
  const sign = makeSign([{ text: '🐂 BUCKING BULL', size: 0.42 }, { text: 'Press E · Hold on tight!', size: 0.28 }], 3.0, 0.85, THEMES.red || THEMES.orange);
  sign.position.set(-2.6, 1.3, 2.6);
  sign.rotation.y = -PI / 4;
  root.add(sign);
  const bestLabel = makeLabel([{ text: '🏆 Best: -' }], 0.8);
  bestLabel.position.set(-2.6, 2.05, 2.6);
  root.add(bestLabel);
  const showBest = () => bestLabel.userData.setLines([{ text: `🏆 Your best: ${(state.bullBest || 0).toFixed(1)} s`, color: '#ffeb3b' }]);
  showBest();
  addCollider(X, Z, 1.1); // 支柱 + 牛（行唔穿）

  // ---- 隻牛 ----
  const base = new THREE.Group(); // 轉身（y）
  base.position.y = 1.25;
  root.add(base);
  const bull = buildBull();
  base.add(bull);

  // ---- 鏡頭 ----
  const view = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
  addEventListener('resize', () => {
    view.aspect = innerWidth / innerHeight;
    view.updateProjectionMatrix();
  });

  // ---- HUD ----
  const hud = document.createElement('div');
  hud.id = 'bull-hud';
  hud.hidden = true;
  hud.innerHTML = `
    <div class="bull-top"><b>🐂 BUCKING BULL</b><span id="bull-time">0.0 s</span><small id="bull-best"></small></div>
    <div class="bull-bar"><div class="bull-safe"></div><div id="bull-marker"></div></div>
    <div class="bull-hint">Hold <kbd>A</kbd> / <kbd>D</kbd> to lean back to the middle!</div>
    <div class="bull-btns"><button id="bull-left">◀</button><button id="bull-right">▶</button></div>`;
  document.body.appendChild(hud);
  const style = document.createElement('style');
  style.textContent = `
    #bull-hud{position:fixed;left:50%;top:190px;transform:translateX(-50%);z-index:40;text-align:center;font-family:inherit;color:#fff;pointer-events:none;width:min(520px,92vw)}
    #bull-hud .bull-top{display:flex;gap:14px;justify-content:center;align-items:baseline;background:rgba(93,58,31,.85);border:3px solid #ffca28;border-radius:14px;padding:6px 14px;font-size:20px;text-shadow:0 2px 0 #000}
    #bull-hud #bull-time{font-size:28px;color:#ffeb3b;min-width:90px}
    #bull-hud small{opacity:.9}
    #bull-hud .bull-bar{position:relative;height:22px;margin:10px 0 6px;border-radius:11px;border:3px solid #fff;background:linear-gradient(90deg,#e53935,#ffb300 22%,#43a047 38%,#43a047 62%,#ffb300 78%,#e53935)}
    #bull-hud .bull-safe{position:absolute;left:38%;right:38%;top:0;bottom:0;box-shadow:inset 0 0 0 2px rgba(255,255,255,.5);border-radius:6px}
    #bull-hud #bull-marker{position:absolute;top:-8px;width:12px;height:32px;margin-left:-6px;left:50%;background:#fff;border:2px solid #000;border-radius:6px}
    #bull-hud .bull-hint{font-size:15px;text-shadow:0 2px 0 #000}
    #bull-hud .bull-btns{display:flex;justify-content:space-between;margin-top:14px;pointer-events:auto}
    #bull-hud .bull-btns button{width:96px;height:72px;font-size:34px;border-radius:16px;border:3px solid #fff;background:rgba(93,58,31,.75);color:#fff;touch-action:none}
    #bull-hud .bull-btns button.on{background:#ffb300}
    body:not(.mobile) #bull-hud .bull-btns{opacity:.75}`;
  document.head.appendChild(style);

  // ---- 狀態 ----
  const B = { phase: 'idle', t: 0, lean: 0, push: 0, pushDir: 1, nextSwitch: 0, spin: 0, spinDir: 1, fallT: 0, fallFrom: null, fallTo: null, left: false, right: false, camA: 0 };
  const keys = (on) => (e) => {
    if (B.phase !== 'ride') return;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') B.left = on;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') B.right = on;
  };
  addEventListener('keydown', keys(true));
  addEventListener('keyup', keys(false));
  const hold = (id, k) => {
    const el = hud.querySelector(id);
    const set = (on) => (e) => {
      e.preventDefault();
      B[k] = on && B.phase === 'ride';
      el.classList.toggle('on', B[k]);
    };
    el.addEventListener('pointerdown', set(true));
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, set(false));
  };
  hold('#bull-left', 'left');
  hold('#bull-right', 'right');

  let enabled = true;
  const api = {
    get active() { return B.phase !== 'idle'; },
    // 🎪 小遊戲輪替（ranchGames.js）：唔係輪到隻牛就收埋
    setEnabled(on) {
      enabled = on;
      root.visible = on || B.phase !== 'idle';
    },
    view,
    interaction,
    update,
    afterView,
    arena,
    debug: { start: () => start(), fall: () => fall(), get state() { return B; } },
  };

  function interaction(pos) {
    if (B.phase !== 'idle') return { prompt: B.phase === 'ride' ? '🐂 Hold on! <kbd>A</kbd> / <kbd>D</kbd> to balance' : '💥 Woah!' };
    if (!enabled || Math.hypot(pos.x - X, pos.z - Z) > ACT) return null;
    return { prompt: '<kbd>E</kbd> 🐂 Ride the BUCKING BULL!', action: start };
  }

  function start() {
    Object.assign(B, { phase: 'ride', t: 0, lean: (Math.random() - 0.5) * 0.1, push: 0, pushDir: Math.random() < 0.5 ? -1 : 1, nextSwitch: 1.2, spin: 0, spinDir: 1, left: false, right: false, camA: 0 });
    base.rotation.set(0, 0, 0);
    hud.hidden = false;
    $('bull-best').textContent = state.bullBest ? `Best ${state.bullBest.toFixed(1)} s` : '';
    play('whistle');
    popup('🐂 YEEHAW! Hold A / D to stay in the middle!');
    onStart();
  }

  function fall() {
    if (B.phase !== 'ride') return;
    B.phase = 'fall';
    B.fallT = 0;
    const side = Math.sign(B.lean) || 1;
    // 由牛背飛去軟墊邊（向你跌嗰邊）
    const seat = new THREE.Vector3(0, 1.0, 0.05);
    bull.localToWorld(seat);
    B.fallFrom = seat;
    const dir = new THREE.Vector3(side, 0, 0).applyQuaternion(base.getWorldQuaternion(new THREE.Quaternion()));
    B.fallTo = new THREE.Vector3(X + dir.x * 2.5, 0.12, Z + dir.z * 2.5);
    B.fallSide = side;
    hud.hidden = true;
    play('swoosh');
    setTimeout(() => play('ouch'), 650);
  }

  function finish() {
    const secs = B.t;
    const prevBest = state.bullBest || 0;
    const best = secs > prevBest;
    let tokens = Math.min(BULL_MAX_TOKENS, Math.floor(secs / BULL_TOKEN_SECONDS));
    if (best && prevBest > 0) tokens += BULL_BEST_BONUS;
    if (best) state.bullBest = secs;
    state.bullRides = (state.bullRides || 0) + 1;
    if (tokens > 0) state.tameTokens = (state.tameTokens || 0) + tokens;
    save();
    showBest();
    const tok = tokens > 0 ? ` +${tokens} 🤠 Tame Token${tokens > 1 ? 's' : ''}!` : ` (Stay ${BULL_TOKEN_SECONDS} s to win a 🤠 Tame Token)`;
    if (best && prevBest > 0) announce(`🏆 NEW BULL RECORD: ${secs.toFixed(1)} s!${tok}`);
    else popup(`🐂 You stayed on for ${secs.toFixed(1)} s!${tok}`);
    if (tokens > 0) play('coin');
    B.phase = 'idle';
    B.left = B.right = false;
    onEnd({ x: X - 2.4, z: Z + 3.6 }); // 企返喺軟墊外面（西南邊，近 Special's Stall）
  }

  // ---- 每格 ----
  const _q = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  function update(dt, time) {
    bulbs.forEach((b, i) => (b.material.emissiveIntensity = B.phase === 'ride' ? (Math.sin(time * 10 + i * 1.6) > 0 ? 2.2 : 0.4) : 1 + Math.sin(time * 2 + i) * 0.3));
    const { head, tail } = bull.userData;
    if (B.phase === 'idle') {
      // 冇人坐：慢慢搖
      base.rotation.y += dt * 0.25;
      bull.rotation.set(Math.sin(time * 1.3) * 0.06, 0, Math.sin(time * 0.9) * 0.04);
      tail.rotation.z = Math.sin(time * 2) * 0.3;
      head.rotation.x = Math.sin(time * 1.3) * 0.05;
      return;
    }
    if (B.phase === 'ride' && dt > 0) {
      B.t += dt;
      // 越耐越勁：推力越大、轉方向越快
      const grace = Math.min(1, B.t / 1.5);
      B.push = (BULL_START_PUSH + BULL_PUSH_GROWTH * B.t) * grace;
      B.nextSwitch -= dt;
      if (B.nextSwitch <= 0) {
        B.pushDir = Math.random() < 0.65 ? -B.pushDir : B.pushDir;
        const quick = Math.max(0.35, 1.1 - B.t * 0.015);
        B.nextSwitch = quick * (0.6 + Math.random() * 0.8);
        if (Math.random() < 0.4) B.spinDir = -B.spinDir;
        play('boing');
      }
      const input = (B.right ? 1 : 0) - (B.left ? 1 : 0);
      B.lean += (B.pushDir * B.push + input * BULL_CONTROL + B.lean * BULL_TIP) * dt;
      B.lean = THREE.MathUtils.clamp(B.lean, -1.05, 1.05);
      if (Math.abs(B.lean) >= 1) fall();
      $('bull-time').textContent = `${B.t.toFixed(1)} s`;
      $('bull-marker').style.left = `${50 + B.lean * 50}%`;
    }
    if (dt > 0) {
      // 跳、踢、轉：速度跟難度
      const wild = B.phase === 'ride' ? Math.min(1, 0.35 + B.t / 40) : 0.2;
      const f = 4 + wild * 4;
      B.spin += dt * B.spinDir * (0.6 + wild * 2.2);
      base.rotation.y = B.spin;
      const kick = Math.sin(B.t * f);
      bull.rotation.set(kick * 0.32 * wild, 0, B.pushDir * 0.12 * wild + B.lean * 0.15);
      bull.position.y = Math.max(0, kick) * 0.25 * wild;
      head.rotation.x = -kick * 0.2;
      tail.rotation.z = Math.sin(B.t * 9) * 0.6;
    }
    if (B.phase === 'fall') {
      B.fallT += dt;
      if (B.fallT > 2.0) finish();
    }
    // 鏡頭：喺場邊慢慢轉，望住隻牛；跳得勁會震
    B.camA += dt * 0.25;
    const ca = PI * 0.75 + Math.sin(B.camA) * 0.4; // 喺西南邊（東邊係 Hub 圍牆）
    view.position.set(X + Math.cos(ca) * 6.2, 3.0, Z + Math.sin(ca) * 6.2);
    const shake = B.phase === 'ride' ? Math.min(0.06, B.t * 0.002) : 0;
    view.lookAt(X + (Math.random() - 0.5) * shake, 1.7 + (Math.random() - 0.5) * shake, Z);
  }

  // ---- 你個公仔：坐喺牛背／跌落軟墊 ----
  function afterView(av) {
    if (B.phase === 'idle' || !av) return;
    av.g.visible = true;
    const [L, R] = av.legs;
    const [AL, AR] = av.arms;
    if (B.phase === 'ride' || (B.phase === 'fall' && B.fallT < 0.05)) {
      // 屁股坐喺馬鞍（髖 0.9 米）
      _v.set(0, 1.02, 0.05);
      bull.localToWorld(_v);
      bull.getWorldQuaternion(_q);
      av.g.quaternion.copy(_q);
      av.g.rotateZ(-B.lean * 0.6); // 身體跟住傾
      av.g.position.copy(_v).add(new THREE.Vector3(0, -0.9, 0).applyQuaternion(av.g.quaternion));
      L.rotation.set(1.0, 0, -0.55);
      R.rotation.set(1.0, 0, 0.55);
      AL.rotation.set(0.9, 0, -0.1); // 左手揸住手抽
      AR.rotation.set(2.8, 0, 0.3 + Math.sin(B.t * 8) * 0.35); // 右手舉高揮（牛仔款）
      return;
    }
    // 跌：拋物線飛去軟墊，之後瞓喺度
    const k = Math.min(1, B.fallT / 0.7);
    _v.lerpVectors(B.fallFrom, B.fallTo, k);
    _v.y += Math.sin(k * PI) * 1.4 - 0.9 * (1 - k);
    av.g.position.copy(_v);
    av.g.rotation.set(0, B.spin, 0, 'YXZ');
    av.g.rotation.z = -B.fallSide * Math.min(PI / 2, k * PI * 0.9 + (k < 1 ? B.fallT * 6 : 0));
    if (k >= 1) av.g.rotation.z = -B.fallSide * PI / 2;
    av.g.position.y = k >= 1 ? 0.35 : _v.y;
    L.rotation.set(0.3, 0, -0.3);
    R.rotation.set(-0.2, 0, 0.3);
    AL.rotation.set(0, 0, -1.4);
    AR.rotation.set(0, 0, 1.4);
  }

  return api;
}
