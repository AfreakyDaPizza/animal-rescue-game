// 🎪 RANCH MINI-GAMES（Issue #21 留言，小朋友 2026-11-14：「make the catch and tame more fun by adding a rotation for mini games 10min rotate」）
// 牧場右下角個場地（BUCKING_BULL）每 RANCH_ROTATE_MINUTES 分鐘換一個小遊戲（跟真實時鐘，個個人見到同一個）：
//   🐂 Bucking Bull（buckingBull.js）→ 🪢 Lasso Toss → 🐴 Horseshoe Toss → 再返隻牛
// 玩緊嗰陣到鐘：等你玩完先換。數值喺 src/data/tame.js（RANCH_*、LASSO_TOSS_*、HORSESHOE_*）。
//
// 用法（main.js）：同 buckingBull 一樣
//   const ranch = createRanchGames({ scene, play, popup, announce, onStart, onEnd })
//   ranch.interaction(pos) / ranch.update(dt, time) / ranch.afterView(avatar) / ranch.active / ranch.view
//   測試：game.ranch.next()（即刻換下一個）、game.ranch.debug.bull.start()

import * as THREE from 'three';
import { state, save } from './state.js';
import { makeSign, makeLabel, THEMES } from './signs.js';
import { BUCKING_BULL } from './hubShape.js';
import { createBuckingBull } from './buckingBull.js';
import {
  RANCH_ROTATE_MINUTES, RANCH_BEST_BONUS, LASSO_TOSS_THROWS, LASSO_TOSS_TOKEN_EVERY, LASSO_TOSS_SPEED,
  HORSESHOE_THROWS, HORSESHOE_TOKEN_EVERY, HORSESHOE_BAR_SPEED,
} from './data/tame.js';

const PI = Math.PI;
const $ = (id) => document.getElementById(id);
const ACT = 3.4;
const GAMES = [
  { id: 'bull', name: '🐂 Bucking Bull', short: 'Bucking Bull' },
  { id: 'lasso', name: '🪢 Lasso Toss', short: 'Lasso Toss' },
  { id: 'horseshoe', name: '🐴 Horseshoe Toss', short: 'Horseshoe Toss' },
];
const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
function add(p, geo, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  p.add(m);
  return m;
}

// ---------- 🐮 木牛仔（Lasso Toss 個靶，有轆）----------
function buildCalf() {
  const g = new THREE.Group();
  const wood = M(0xb98454);
  const dark = M(0x5d3a1f);
  add(g, new THREE.BoxGeometry(1.1, 0.6, 0.5), wood, 0, 0.75, 0);
  add(g, new THREE.BoxGeometry(0.45, 0.45, 0.42), wood, 0.7, 1.05, 0);
  add(g, new THREE.BoxGeometry(0.22, 0.18, 0.3), M(0xf8bbd0), 0.95, 0.95, 0);
  for (const s of [-1, 1]) {
    add(g, new THREE.ConeGeometry(0.05, 0.22, 6), M(0xfff8e1), 0.72, 1.35, s * 0.15).rotation.x = s * 0.4;
    add(g, new THREE.BoxGeometry(0.06, 0.06, 0.02), M(0x111111), 0.93, 1.12, s * 0.12, false);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    add(g, new THREE.BoxGeometry(0.1, 0.35, 0.1), dark, sx * 0.4, 0.38, sz * 0.18);
    const w = add(g, new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12), M(0x333333), sx * 0.4, 0.13, sz * 0.26);
    w.rotation.x = PI / 2;
  }
  add(g, new THREE.BoxGeometry(0.3, 0.3, 0.02), M(0x8d5a32), -0.2, 0.8, 0.26, false); // 斑
  return g;
}

// ---------- 🪢 套索（一個圈 + 一條繩）----------
function buildLasso() {
  const g = new THREE.Group();
  const rope = M(0xd7b98a);
  const loop = add(g, new THREE.TorusGeometry(0.45, 0.045, 6, 24), rope, 0, 0, 0, false);
  loop.rotation.x = PI / 2;
  g.userData.loop = loop;
  g.visible = false;
  return g;
}

// ---------- 🐴 馬蹄鐵 + 木樁 ----------
function buildHorseshoe() {
  const g = new THREE.Group();
  const shoe = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 16, PI * 1.4), M(0xb0bec5, { metalness: 0.9, roughness: 0.3 }));
  shoe.rotation.z = -PI * 0.2;
  g.add(shoe);
  g.visible = false;
  return g;
}

function hudHtml(kind) {
  if (kind === 'lasso') {
    return `<div class="rg-top"><b>🪢 LASSO TOSS</b><span id="rg-score">0</span><small id="rg-info"></small></div>
      <div class="rg-hint">Press <kbd>E</kbd> / <kbd>Space</kbd> to throw when the calf is in the <b>middle</b>!</div>
      <div class="rg-btns"><button id="rg-throw">🪢 THROW</button></div>`;
  }
  return `<div class="rg-top"><b>🐴 HORSESHOE TOSS</b><span id="rg-score">0</span><small id="rg-info"></small></div>
    <div class="rg-bar"><div class="rg-yellow"></div><div class="rg-green"></div><div id="rg-marker"></div></div>
    <div class="rg-hint">Press <kbd>E</kbd> / <kbd>Space</kbd> when the power is in the <b>green</b>!</div>
    <div class="rg-btns"><button id="rg-throw">🐴 THROW</button></div>`;
}

export function createRanchGames({ scene, play = () => {}, popup = () => {}, announce = () => {}, onStart = () => {}, onEnd = () => {} }) {
  const { x: X, z: Z } = BUCKING_BULL;
  const bull = createBuckingBull({ scene, play, popup, announce, onStart, onEnd });

  // 🎪 輪替招牌（場地後面）
  const board = new THREE.Group();
  board.position.set(X, 0, Z - 3.6);
  scene.add(board);
  for (const s of [-1, 1]) add(board, new THREE.BoxGeometry(0.16, 3.4, 0.16), M(0x5d3a1f), s * 1.9, 1.7, -0.06);
  const sign = makeSign([{ text: '🎪 MINI-GAME ROTATION', size: 0.36 }, { text: 'A new game every 10 min!', size: 0.26 }], 4.0, 1.0, THEMES.orange);
  sign.position.y = 3.3;
  board.add(sign);
  const nowLabel = makeLabel([{ text: 'NOW: -' }], 1.0);
  nowLabel.position.y = 4.35;
  board.add(nowLabel);

  // ---- 投擲位（場地西南邊，向住場地中間）----
  const spot = new THREE.Vector3(X - 2.6, 0, Z + 3.6);
  const center = new THREE.Vector3(X, 0, Z);
  const dir = center.clone().sub(spot).normalize(); // 向場地
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);
  const throwYaw = Math.atan2(-dir.x, -dir.z); // 公仔面向（-z 為前）
  const view = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
  addEventListener('resize', () => {
    view.aspect = innerWidth / innerHeight;
    view.updateProjectionMatrix();
  });

  // ---- 道具 ----
  const calf = buildCalf();
  calf.visible = false;
  scene.add(calf);
  const lasso = buildLasso();
  scene.add(lasso);
  const ropeGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const rope = new THREE.Line(ropeGeo, new THREE.LineBasicMaterial({ color: 0xd7b98a }));
  rope.frustumCulled = false;
  rope.visible = false;
  scene.add(rope);
  const stakeSpot = center.clone().addScaledVector(dir, 1.4);
  const stake = new THREE.Group();
  stake.position.copy(stakeSpot);
  stake.visible = false;
  scene.add(stake);
  add(stake, new THREE.CylinderGeometry(0.05, 0.06, 0.8, 8), M(0x8d6e63), 0, 0.4, 0);
  add(stake, new THREE.CylinderGeometry(0.5, 0.5, 0.04, 24), M(0xc8a165), 0, 0.14, 0); // 沙圈
  const shoe = buildHorseshoe();
  scene.add(shoe);
  const landed = []; // 跌咗喺地上嘅馬蹄鐵

  // ---- HUD ----
  const hud = document.createElement('div');
  hud.id = 'rg-hud';
  hud.hidden = true;
  document.body.appendChild(hud);
  const style = document.createElement('style');
  style.textContent = `
    #rg-hud{position:fixed;left:50%;top:150px;transform:translateX(-50%);z-index:40;text-align:center;color:#fff;pointer-events:none;width:min(520px,92vw)}
    #rg-hud .rg-top{display:flex;gap:14px;justify-content:center;align-items:baseline;background:rgba(93,58,31,.85);border:3px solid #ffca28;border-radius:14px;padding:6px 14px;font-size:20px;text-shadow:0 2px 0 #000}
    #rg-hud #rg-score{font-size:28px;color:#ffeb3b;min-width:60px}
    #rg-hud .rg-hint{display:none}
    #rg-hud .rg-bar{position:relative;height:24px;margin:10px 0 4px;border-radius:12px;border:3px solid #fff;background:#e53935;overflow:hidden}
    #rg-hud .rg-yellow,#rg-hud .rg-green{position:absolute;top:0;bottom:0}
    #rg-hud .rg-yellow{background:#ffb300}
    #rg-hud .rg-green{background:#43a047}
    #rg-hud #rg-marker{position:absolute;top:-2px;bottom:-2px;width:10px;margin-left:-5px;background:#fff;border:2px solid #000;border-radius:5px}
    #rg-hud .rg-btns{position:absolute;left:50%;top:310px;transform:translateX(-50%);pointer-events:auto}
    #rg-hud .rg-btns button{width:160px;height:64px;font-size:24px;border-radius:16px;border:3px solid #fff;background:rgba(93,58,31,.8);color:#fff;touch-action:none}
    body:not(.mobile) #rg-hud .rg-btns{opacity:.8}`;
  document.head.appendChild(style);

  // ---- 狀態 ----
  let manual = null; // 測試：game.ranch.next() 用
  const currentIndex = () => (manual ?? Math.floor(Date.now() / (RANCH_ROTATE_MINUTES * 60000))) % GAMES.length;
  let shown = -1; // 場地而家擺緊邊個
  const G = { kind: null, phase: 'idle', t: 0, throws: 0, score: 0, flying: 0, s: 0, speed: 0, dirSign: 1, power: 0, pdir: 1, barSpeed: 0, result: '', armT: 0, aim: 0, from: new THREE.Vector3(), to: new THREE.Vector3() };
  const ZONE = { greenLo: 0.66, greenHi: 0.74, yellowLo: 0.56, yellowHi: 0.84 };

  function showGame(i) {
    shown = i;
    const id = GAMES[i].id;
    bull.setEnabled(id === 'bull');
    calf.visible = id === 'lasso';
    stake.visible = id === 'horseshoe';
    landed.forEach((m) => scene.remove(m));
    landed.length = 0;
    if (id === 'lasso') {
      calf.position.copy(center);
      calf.rotation.y = Math.atan2(-perp.z, perp.x);
    }
  }

  function start(kind) {
    Object.assign(G, { kind, phase: 'play', t: 0, throws: 0, score: 0, flying: 0, s: -2.2, speed: LASSO_TOSS_SPEED, dirSign: 1, power: 0, pdir: 1, barSpeed: HORSESHOE_BAR_SPEED, result: '', armT: 0 });
    hud.innerHTML = hudHtml(kind);
    if (kind === 'horseshoe') {
      hud.querySelector('.rg-yellow').style.cssText = `left:${ZONE.yellowLo * 100}%;width:${(ZONE.yellowHi - ZONE.yellowLo) * 100}%`;
      hud.querySelector('.rg-green').style.cssText = `left:${ZONE.greenLo * 100}%;width:${(ZONE.greenHi - ZONE.greenLo) * 100}%`;
    }
    hud.querySelector('#rg-throw').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      doThrow();
    });
    hud.hidden = false;
    refresh();
    play('whistle');
    popup(kind === 'lasso' ? '🪢 LASSO TOSS! Throw when the calf is in the middle!' : '🐴 HORSESHOE TOSS! Stop the power in the green!');
    onStart();
  }

  function refresh() {
    const total = G.kind === 'lasso' ? LASSO_TOSS_THROWS : HORSESHOE_THROWS;
    $('rg-score').textContent = G.kind === 'lasso' ? `🐮 ${G.score}` : `⭐ ${G.score}`;
    const best = G.kind === 'lasso' ? state.lassoTossBest : state.horseshoeBest;
    $('rg-info').textContent = `Throw ${Math.min(G.throws + 1, total)}/${total}${best ? ` · Best ${best}` : ''}`;
  }

  function doThrow() {
    if (G.phase !== 'play' || G.flying > 0) return;
    G.throws++;
    G.armT = 0.35;
    play('swoosh');
    if (G.kind === 'lasso') {
      G.flying = 0.45;
      G.aim = 0; // 套索永遠拋去場地中間
      lasso.visible = rope.visible = true;
    } else {
      G.flying = 0.8;
      G.aim = G.power;
      const dist = spot.distanceTo(stakeSpot);
      const k = G.power / ((ZONE.greenLo + ZONE.greenHi) / 2);
      G.from.copy(spot).setY(1.5);
      G.to.copy(spot).addScaledVector(dir, dist * k).setY(0.15);
      const miss = Math.abs(G.power - 0.7);
      if (miss > (ZONE.yellowHi - ZONE.yellowLo) / 2) G.to.addScaledVector(perp, (Math.random() - 0.5) * 1.2); // 甩咗：唔直
      shoe.visible = true;
    }
  }

  function landThrow() {
    const total = G.kind === 'lasso' ? LASSO_TOSS_THROWS : HORSESHOE_THROWS;
    if (G.kind === 'lasso') {
      const hit = Math.abs(G.s) < 0.6;
      if (hit) {
        G.score++;
        G.speed *= 1.12;
        play('ding');
        popup(`🪢 YEEHAW! Caught it! (${G.score})`);
      } else {
        play('wrong');
        popup('🪢 Missed! Wait for the middle!');
      }
      setTimeout(() => (lasso.visible = rope.visible = false), hit ? 600 : 200);
    } else {
      const off = Math.abs(G.aim - 0.7);
      const pts = G.aim >= ZONE.greenLo && G.aim <= ZONE.greenHi ? 3 : G.aim >= ZONE.yellowLo && G.aim <= ZONE.yellowHi ? 1 : 0;
      G.score += pts;
      G.barSpeed *= 1.15;
      const dropped = shoe.clone();
      if (pts === 3) {
        dropped.position.copy(stakeSpot).setY(0.2);
        dropped.rotation.set(-PI / 2, 0, Math.random() * PI);
      } else {
        dropped.position.copy(G.to);
        dropped.rotation.set(-PI / 2, 0, Math.random() * PI);
      }
      scene.add(dropped);
      landed.push(dropped);
      shoe.visible = false;
      if (pts === 3) {
        play('tierUp');
        popup('🐴 RINGER!! +3 ⭐');
      } else if (pts === 1) {
        play('ding');
        popup(`🐴 Close! +1 ⭐ (${off < 0.12 && G.aim < 0.7 ? 'a bit more power' : 'a bit less power'})`);
      } else {
        play('wrong');
        popup(G.aim < 0.7 ? '🐴 Too weak! More power!' : '🐴 Too strong! Less power!');
      }
    }
    refresh();
    if (G.throws >= total) {
      G.phase = 'done';
      G.t = 0;
    }
  }

  function finish() {
    const isLasso = G.kind === 'lasso';
    const key = isLasso ? 'lassoTossBest' : 'horseshoeBest';
    const prev = state[key] || 0;
    const record = G.score > prev;
    let tokens = Math.floor(G.score / (isLasso ? LASSO_TOSS_TOKEN_EVERY : HORSESHOE_TOKEN_EVERY));
    if (record && prev > 0) tokens += RANCH_BEST_BONUS;
    if (record) state[key] = G.score;
    if (tokens > 0) state.tameTokens = (state.tameTokens || 0) + tokens;
    save();
    const what = isLasso ? `caught ${G.score} calf${G.score === 1 ? '' : 's'}` : `scored ${G.score} ⭐`;
    const tok = tokens > 0 ? ` +${tokens} 🤠 Tame Token${tokens > 1 ? 's' : ''}!` : '';
    if (record && prev > 0) announce(`🏆 NEW ${isLasso ? 'LASSO' : 'HORSESHOE'} RECORD! You ${what}!${tok}`);
    else popup(`🎪 You ${what}!${tok}`);
    if (tokens > 0) play('coin');
    hud.hidden = true;
    G.phase = 'idle';
    G.kind = null;
    onEnd({ x: spot.x, z: spot.z + 0.6 });
  }

  addEventListener('keydown', (e) => {
    if (G.phase === 'play' && e.code === 'Space') {
      e.preventDefault();
      doThrow();
    }
  });

  // ---- 每格 ----
  const _v = new THREE.Vector3();
  function update(dt, time) {
    // 輪替（玩緊就唔換）
    const idx = currentIndex();
    if (idx !== shown && !api.active) showGame(idx);
    const msLeft = RANCH_ROTATE_MINUTES * 60000 - (Date.now() % (RANCH_ROTATE_MINUTES * 60000));
    const mm = Math.floor(msLeft / 60000);
    const ss = String(Math.floor((msLeft % 60000) / 1000)).padStart(2, '0');
    const next = GAMES[(shown + 1) % GAMES.length];
    const label = `NOW: ${GAMES[shown].name} · Next: ${next.short} in ${mm}:${ss}`;
    if (nowLabel.userData.last !== label) {
      nowLabel.userData.last = label;
      nowLabel.userData.setLines([{ text: label, color: '#ffeb3b' }]);
    }
    bull.update(dt, time);

    // 🐮 木牛仔左右行（冇人玩都慢慢行）
    if (calf.visible && dt > 0) {
      const sp = G.kind === 'lasso' ? G.speed : 1.2;
      if (!(G.kind === 'lasso' && G.flying <= 0 && lasso.visible && Math.abs(G.s) < 0.6)) G.s += G.dirSign * sp * dt; // 套中咗：停一停
      if (G.s > 2.3) G.dirSign = -1;
      if (G.s < -2.3) G.dirSign = 1;
      calf.position.copy(center).addScaledVector(perp, G.s);
      calf.rotation.y = Math.atan2(-perp.z * G.dirSign, perp.x * G.dirSign);
      calf.position.y = Math.abs(Math.sin(time * 10)) * 0.04;
    }
    if (G.phase === 'play' && dt > 0) {
      G.armT = Math.max(0, G.armT - dt);
      if (G.kind === 'horseshoe' && G.flying <= 0) {
        G.power += G.pdir * G.barSpeed * dt;
        if (G.power > 1) (G.power = 1), (G.pdir = -1);
        if (G.power < 0) (G.power = 0), (G.pdir = 1);
        $('rg-marker').style.left = `${G.power * 100}%`;
      }
      if (G.flying > 0) {
        G.flying -= dt;
        if (G.kind === 'lasso') {
          const k = 1 - Math.max(0, G.flying) / 0.45;
          const hand = spot.clone().setY(1.6);
          const target = center.clone().setY(1.1);
          lasso.position.lerpVectors(hand, target, k);
          lasso.position.y += Math.sin(k * PI) * 1.2;
          lasso.userData.loop.scale.setScalar(0.6 + k * 0.6);
          lasso.rotation.y = time * 12;
        } else {
          const k = 1 - Math.max(0, G.flying) / 0.8;
          shoe.position.lerpVectors(G.from, G.to, k);
          shoe.position.y += Math.sin(k * PI) * 1.8;
          shoe.rotation.set(time * 9, time * 3, 0);
        }
        if (G.flying <= 0) landThrow();
      }
    } else if (G.phase === 'done') {
      G.t += dt;
      if (G.t > 1.2) finish();
    }
    if (rope.visible) {
      const a = ropeGeo.attributes.position.array;
      a.set([spot.x + perp.x * 0.3, 1.6, spot.z + perp.z * 0.3, lasso.position.x, lasso.position.y, lasso.position.z]);
      ropeGeo.attributes.position.needsUpdate = true;
    }
    // 鏡頭：喺你後面少少、高少少，望住場地
    if (G.kind) {
      _v.copy(spot).addScaledVector(dir, -2.6).addScaledVector(perp, -2.4);
      view.position.set(_v.x, 4.4, _v.z);
      view.lookAt(center.x, 0.6, center.z);
    }
  }

  // 你個公仔：企喺投擲位、揮手拋
  function afterView(av) {
    if (!G.kind) return bull.afterView(av);
    av.g.visible = true;
    av.g.position.set(spot.x, 0, spot.z);
    av.g.rotation.set(0, throwYaw, 0, 'YXZ');
    const [L, R] = av.legs;
    const [AL, AR] = av.arms;
    L.rotation.set(0.2, 0, 0);
    R.rotation.set(-0.2, 0, 0);
    AL.rotation.set(0.3, 0, -0.2);
    const swing = G.armT > 0 ? G.armT / 0.35 : 0;
    AR.rotation.set(G.kind === 'lasso' && G.flying <= 0 && G.armT <= 0 ? 2.9 : 1.4 + swing * 1.6, G.kind === 'lasso' ? Math.sin(Date.now() / 90) * 0.6 : 0, 0.2);
  }

  const api = {
    get active() { return bull.active || G.phase !== 'idle'; },
    get view() { return G.kind ? view : bull.view; },
    interaction(pos) {
      if (G.phase === 'play') return { prompt: `<kbd>E</kbd> / <kbd>Space</kbd> ${G.kind === 'lasso' ? '🪢 Throw the lasso!' : '🐴 Throw the horseshoe!'}`, action: doThrow };
      if (G.phase === 'done') return { prompt: '🎪 Nice throwing!' };
      const b = bull.interaction(pos);
      if (b) return b;
      const id = GAMES[shown]?.id;
      if (id === 'bull' || shown < 0) return null;
      if (Math.hypot(pos.x - spot.x, pos.z - spot.z) > ACT && Math.hypot(pos.x - X, pos.z - Z) > ACT) return null;
      return { prompt: `<kbd>E</kbd> ${GAMES[shown].name}! (${id === 'lasso' ? `${LASSO_TOSS_THROWS} throws` : `${HORSESHOE_THROWS} throws`})`, action: () => start(id) };
    },
    update,
    afterView,
    next() {
      manual = (currentIndex() + 1) % GAMES.length;
    },
    debug: { bull: bull.debug, start, get state() { return G; } },
  };
  return api;
}
