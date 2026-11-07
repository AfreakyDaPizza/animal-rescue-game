// 🤠 CATCH & TAME（小朋友 GitHub Issue #16，好似 Rodeo Stampede）
// 「GO IN THE PORTAL SELECT ONE MAP (SAVANNA, DESERT, TAIGA) SO YOU WILL SPAWN AS A PERSON RIDING A HORSE AND THEN YOU WILL SEE
//   3 HEARTS AND A FULLY ENDLESS MAP ... PRESS SPACE TO GET OFF HORSE AND YOU'LL RAGDOLL FLY AND THIS IS WHERE THE LASSO COMES IN HANDY
//   ... RIDE ON IT AND YOU'LL SEE A TAME BAR ... TAME IT WITH THE TAMING FLUTE ... WHEN GOT HIT BY 3 OBSTACLES YOU WILL RETURN TO THE HUB」
//
// 流程：
//   傳送門（Helper A：src/tameStalls.js）叫 rodeo.openMapSelect() → 揀地圖面板（🦒 Savanna／🐪 Desert／🌲 Taiga）
//   → 🤠 載入畫面（loading.js 'rodeo' 主題）→ 好遠嘅東邊（x = 4000，src/rodeoShape.js）騎住 🐎 馬自動向前跑（-z），越跑越快
//   A／D（← →、滑鼠左右、手機搖桿）= 左右；撞到障礙物（白蟻丘、仙人掌、倒咗嘅樹…）= 扣一粒 ❤️（一陣唔會再扣）
//   SPACE（手機 JUMP）= 跳落馬 → 飛起（ragdoll 打筋斗）→ 🪢 套索自動套最近、喺範圍入面嘅動物（LASSO_LEVELS 越高越遠）→ 拉你上佢背
//     套唔到 = 跌落地扣一粒 ❤️，之後騎返隻新馬
//   騎住野生動物：佢會彈（難啲控制），🎵 馴服笛令馴服條慢慢滿（FLUTE_LEVELS 越高越快）；未滿就跳走 = 佢跑走咗
//   滿咗 = 🤠 TAMED! 加入今次嘅名單，可以繼續騎（馴服咗嘅好順）
//   冇晒 ❤️ → 載入畫面 → 返 Hub（RODEO_RETURN，Catch & Tame 傳送門附近）→ 結果面板：馴服咗嘅變寵物 + 🤠 Tame Tokens
// 數值：src/data/tame.js（共用）+ src/data/tameAnimals.js（動物、速度、馴服時間）
// 地圖樣：src/rodeoMaps.js；動物模型：src/rodeoModels.js（+ 遊戲本身嘅 buildAnimalModel）
// 測試（console）：game.rodeo.start('savanna'|'desert'|'taiga')、game.rodeo.end()、game.rodeo.god = true、
//                  game.rodeo.tameNow()、game.rodeo.spawn('Cheetah')、game.rodeo.dist(2000)、game.rodeo.hearts(1)

import * as THREE from 'three';
import { state, save } from './state.js';
import { addSounds } from './sound.js';
import { touchInput } from './player.js';
import { makeLabel } from './signs.js';
import { buildAnimalModel } from './animalModels.js';
import { findAnimal, randomKg, itemMoney } from './data/animals.js';
import { rarityInfo, INDEX_NEW_SPECIES_REWARD } from './data/balance.js';
import { RODEO_MAPS, RODEO_HEARTS, RODEO_TOKENS_PER_TAME, LASSO_LEVELS, FLUTE_LEVELS, FLING_SLOWMO, FLING_SLOWMO_MIN_HEIGHT } from './data/tame.js';
import {
  TAME_ANIMALS, tameAnimalsOn, TAME_PET_BIOME, TAME_TOKEN_BONUS, TAME_SECONDS, TAME_BUCK, TAME_SPAWN_WEIGHT,
  RODEO_START_SPEED, RODEO_MAX_SPEED, RODEO_SPEED_UP, RODEO_LANE, RODEO_HIT_SAFE, RODEO_MAX_ANIMALS,
} from './data/tameAnimals.js';
import { RODEO_ORIGIN, inRodeo } from './rodeoShape.js';
import { MAP_LOOK, CHUNK_LEN, buildGround, buildHorizon, disposeHorizon, buildChunk, disposeChunk, groundY, slopeZ } from './rodeoMaps.js';
import { fluteFrame, stopFlute } from './tamerFlute.js'; // 🎵 Tamer Ranger 吹笛（Issue #17）
import { buildHorse } from './rodeoModels.js';
import { short } from './format.js';
import { TAME_PORTAL } from './hubShape.js';
import { rodeoIntro, playRodeoIntro } from './rodeoIntro.js'; // 🎬 第一次入傳送門嘅開場短片（Issue #14 留言 2026-11-07）
import { movie } from './movie.js';

// 完咗返 Hub 邊度：Catch & Tame 傳送門（TAME_PORTAL，Hub 右邊，src/hubShape.js）前面；想改就改 rodeo.returnTo
export const RODEO_RETURN = { x: TAME_PORTAL.x - 6, z: TAME_PORTAL.z, rotY: -Math.PI / 2 }; // 傳送門前面 6 米，望住個傳送門（第三身鏡頭唔會卡入門度）
export { inRodeo };

const X0 = RODEO_ORIGIN.x;
const PI = Math.PI;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = THREE.MathUtils.clamp;
const AHEAD_CHUNKS = 9; // 前面起幾多段
const GRAVITY = 20;
const HORSE_H = 3.0;
const HORSE_SEAT = 2.2;
const MIN_RIDE_H = 1.6; // 細隻動物喺 Catch & Tame 入面放大到最少咁高（騎得到）
const ADDM = (color, opacity = 0.8) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });

// ---------- 聲效 ----------
addSounds({
  gallop: (t, { noise, tone }) => {
    noise(t, 0.05, { vol: 0.16, freq: 700, q: 1.2, type: 'bandpass' });
    tone(140, t, 0.06, { type: 'sine', vol: 0.08, slide: 0.7 });
    noise(t + 0.09, 0.05, { vol: 0.12, freq: 600, q: 1.2, type: 'bandpass' });
  },
  lassoSwing: (t, { noise }) => {
    noise(t, 0.18, { vol: 0.16, freq: 1600, q: 0.8, type: 'bandpass' });
    noise(t + 0.2, 0.18, { vol: 0.2, freq: 1900, q: 0.8, type: 'bandpass' });
  },
  lassoCatch: (t, { tone, noise }) => {
    noise(t, 0.12, { vol: 0.25, freq: 900, q: 1, type: 'bandpass' });
    tone(392, t + 0.05, 0.15, { type: 'triangle', vol: 0.12, slide: 1.5 });
    tone(587, t + 0.15, 0.25, { type: 'triangle', vol: 0.12 });
  },
  fluteNote: (t, { tone }) => {
    const notes = [523, 587, 659, 784, 880, 1047];
    const f = notes[Math.floor(Math.random() * notes.length)];
    tone(f, t, 0.32, { type: 'sine', vol: 0.09, slide: 1.01 });
    tone(f * 2, t, 0.2, { type: 'sine', vol: 0.02 });
  },
  tamed: (t, { arp, tone }) => {
    arp(t, [392, 523, 659, 784], 0.08, { type: 'square', vol: 0.08 });
    arp(t + 0.35, [784, 988, 1175, 1568], 0.07, { type: 'triangle', vol: 0.12 });
    tone(1568, t + 0.7, 0.5, { type: 'sine', vol: 0.08 });
  },
  yeehaw: (t, { tone }) => {
    tone(330, t, 0.25, { type: 'sawtooth', vol: 0.05, slide: 1.8 });
    tone(600, t + 0.22, 0.3, { type: 'triangle', vol: 0.07, slide: 0.8 });
  },
  crash: (t, { noise, tone }) => {
    noise(t, 0.35, { vol: 0.45, freq: 350 });
    tone(110, t, 0.3, { type: 'square', vol: 0.08, slide: 0.5 });
  },
  buck: (t, { noise }) => noise(t, 0.12, { vol: 0.12, freq: 500, q: 1, type: 'bandpass' }),
});

// ---------- 介面（DOM）----------
const CSS = `
#rodeo-hud { position: fixed; left: 50%; top: calc(10px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); z-index: 6; pointer-events: none;
  display: flex; gap: 10px; align-items: center; padding: 6px 16px; border-radius: 18px; color: #fff8e1; font-weight: 800; font-size: 17px;
  background: linear-gradient(180deg, rgba(109, 59, 28, 0.92), rgba(62, 35, 16, 0.92)); border: 3px solid #ffb74d; box-shadow: 0 4px 0 rgba(0,0,0,0.25); white-space: nowrap; }
#rodeo-hud .map { font-size: 22px; }
#rodeo-hud .dist { font-size: 22px; color: #fff; text-shadow: 0 2px 0 #3e2310; min-width: 92px; text-align: center; }
#rodeo-hud .best { color: #ffe082; font-size: 14px; }
#rodeo-hearts { position: fixed; left: 50%; transform: translateX(-50%); top: calc(62px + env(safe-area-inset-top, 0px)); z-index: 6; pointer-events: none;
  font-size: 34px; letter-spacing: 2px; filter: drop-shadow(0 3px 0 rgba(0,0,0,0.35)); }
#rodeo-hearts.hit { animation: rodeo-shake 0.4s; }
@keyframes rodeo-shake { 0%,100% { transform: translateX(-50%); } 25% { transform: translateX(calc(-50% - 8px)); } 75% { transform: translateX(calc(-50% + 8px)); } }
#rodeo-tamed { position: fixed; right: calc(14px + env(safe-area-inset-right, 0px)); top: calc(64px + env(safe-area-inset-top, 0px)); z-index: 6; pointer-events: none;
  padding: 6px 12px; border-radius: 14px; background: rgba(62, 35, 16, 0.85); border: 2px solid #ffb74d; color: #fff8e1; font-weight: 800; font-size: 15px; max-width: 220px; text-align: right; }
#rodeo-tamed .list { font-size: 22px; letter-spacing: 1px; }
#rodeo-tame { position: fixed; left: 50%; top: calc(112px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); z-index: 6; pointer-events: none;
  width: min(420px, 82vw); padding: 7px 14px 10px; border-radius: 16px; background: linear-gradient(180deg, rgba(74, 20, 140, 0.9), rgba(30, 8, 60, 0.9)); border: 3px solid #ffd54f; color: #fff; font-weight: 800; text-align: center; }
#rodeo-tame .name { font-size: 15px; }
#rodeo-tame .bar { position: relative; height: 18px; margin-top: 5px; border-radius: 9px; background: #1c0a33; border: 2px solid #b388ff; overflow: hidden; }
#rodeo-tame .bar i { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: linear-gradient(90deg, #69f0ae, #ffd54f 70%, #ff9100); transition: width 0.1s; }
#rodeo-tame .flute { position: absolute; left: -26px; top: -6px; font-size: 30px; animation: rodeo-bob 0.5s ease-in-out infinite alternate; }
#rodeo-tame .note { position: absolute; font-size: 20px; animation: rodeo-note 1.4s ease-out forwards; }
@keyframes rodeo-bob { from { transform: rotate(-12deg); } to { transform: rotate(8deg) translateY(-3px); } }
@keyframes rodeo-note { from { opacity: 1; transform: translate(0, 0) scale(0.8); } to { opacity: 0; transform: translate(var(--dx), -70px) scale(1.3) rotate(20deg); } }
#rodeo-tip { position: fixed; left: 50%; bottom: calc(118px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); z-index: 6; pointer-events: none;
  padding: 4px 14px; border-radius: 999px; background: rgba(0,0,0,0.55); color: #fff; font-weight: 800; font-size: 14px; white-space: nowrap; }
#rodeo-hurt { position: fixed; inset: 0; z-index: 5; pointer-events: none; opacity: 0; background: radial-gradient(ellipse at center, rgba(255,0,0,0) 45%, rgba(255, 40, 0, 0.45) 80%, rgba(140, 0, 0, 0.85) 100%); transition: opacity 0.15s; }
#rodeo-banner { position: fixed; left: 50%; top: 30%; transform: translate(-50%, -50%) scale(0.6); z-index: 7; pointer-events: none; opacity: 0;
  font-family: 'Fredoka', 'Trebuchet MS', system-ui, sans-serif; font-weight: 900; font-size: clamp(34px, 7vw, 72px); color: #ffd54f; text-align: center;
  -webkit-text-stroke: 3px #3e2310; text-shadow: 0 6px 0 #3e2310; transition: opacity 0.25s, transform 0.35s cubic-bezier(.2,1.6,.4,1); white-space: nowrap; }
#rodeo-banner.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }
#rodeo-banner small { display: block; font-size: 0.4em; color: #fff; -webkit-text-stroke: 2px #3e2310; }
#rodeo-haze { position: fixed; left: 0; right: 0; top: 30%; height: 22%; z-index: 4; pointer-events: none; -webkit-backdrop-filter: blur(1.6px); backdrop-filter: blur(1.6px);
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 40%, #000 60%, transparent); mask-image: linear-gradient(180deg, transparent, #000 40%, #000 60%, transparent);
  animation: rodeo-haze 1.6s ease-in-out infinite alternate; }
@keyframes rodeo-haze { from { transform: translateY(-4px) scaleY(1); } to { transform: translateY(5px) scaleY(1.08); } }
body.in-rodeo #hotbar-wrap { opacity: 0.35; }
body.in-rodeo #tutorial, body.in-rodeo #tutorial-arrow, body.in-rodeo #hud-timer, body.in-rodeo #event-banner, body.in-rodeo #hud-help, body.in-rodeo #crosshair, body.in-rodeo #sightings { display: none !important; }
.rodeo-panel { color: #3e2310; }
.rodeo-panel .rp-intro { font-weight: 700; margin: 0 0 10px; }
.rodeo-maps { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.rodeo-map { border-radius: 18px; padding: 12px; color: #fff; text-align: center; border: 3px solid rgba(255,255,255,0.7); box-shadow: 0 5px 0 rgba(0,0,0,0.25); background: var(--bg); }
.rodeo-map .em { font-size: 54px; line-height: 1.1; filter: drop-shadow(0 3px 0 rgba(0,0,0,0.25)); }
.rodeo-map h3 { margin: 4px 0; font-size: 22px; text-shadow: 0 2px 0 rgba(0,0,0,0.35); }
.rodeo-map p { margin: 4px 0; font-size: 13px; min-height: 34px; }
.rodeo-map .animals { font-size: 20px; letter-spacing: 1px; margin: 4px 0; }
.rodeo-map .best { font-weight: 800; background: rgba(0,0,0,0.25); border-radius: 999px; padding: 3px 8px; display: inline-block; margin: 4px 0 8px; }
.rodeo-map button, .rodeo-res .btns button { font-weight: 800; font-size: 16px; padding: 8px 18px; border-radius: 999px; border: 3px solid #3e2310; background: #ffd54f; color: #3e2310; cursor: pointer; }
.rodeo-gear { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 12px 0 2px; font-weight: 800; }
.rodeo-gear span { background: #fff3e0; border: 2px solid #ffb74d; border-radius: 999px; padding: 4px 12px; }
.rodeo-replay { text-align: center; margin-top: 10px; }
.rodeo-replay button { font-weight: 800; font-size: 14px; padding: 5px 14px; border-radius: 999px; border: 2px solid #3e2310; background: #e0e0e0; color: #3e2310; cursor: pointer; }
.rodeo-res { text-align: center; }
.rodeo-res .big { font-size: 52px; }
.rodeo-res .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 10px 0; }
.rodeo-res .grid div { border-radius: 14px; padding: 8px; background: linear-gradient(170deg, #8d5a34, #5d3a1e); color: #fff; }
.rodeo-res .grid b { display: block; font-size: 24px; }
.rodeo-res .grid .newbest { background: linear-gradient(170deg, #ffb300, #e65100); }
.rodeo-res ul { list-style: none; padding: 0; margin: 6px 0; text-align: left; }
.rodeo-res li { padding: 5px 10px; margin: 4px 0; border-radius: 10px; background: rgba(141, 90, 52, 0.12); font-weight: 700; border-left: 6px solid var(--rc); }
.rodeo-res .btns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 10px; }
.rodeo-res .btns .grey { background: #e0e0e0; }
`;
function buildUi() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const el = (id, html = '') => {
    const d = document.createElement('div');
    d.id = id;
    d.hidden = true;
    d.innerHTML = html;
    document.body.appendChild(d);
    return d;
  };
  const ui = {
    hud: el('rodeo-hud', '<span class="map"></span><span class="dist">0 m</span><span class="best"></span>'),
    hearts: el('rodeo-hearts'),
    tamed: el('rodeo-tamed', '<div>🤠 Tamed: <b class="n">0</b></div><div class="list"></div>'),
    tame: el('rodeo-tame', '<div class="name"></div><div class="bar"><i></i></div><span class="flute">🪈</span>'),
    tip: el('rodeo-tip'),
    hurt: el('rodeo-hurt'),
    banner: el('rodeo-banner'),
    haze: el('rodeo-haze'),
  };
  ui.hurt.hidden = false;
  ui.banner.hidden = false;
  return ui;
}

// ================= 💨 效果（Issue #17：「graphics should be better」）=================
const ROPE_SEGS = 26;
// 塵：每粒自己有透明度、大細（ShaderMaterial），圓圓哋、邊位淡
const DUST_MAX = 420;
function makeDust(color) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(DUST_MAX * 3);
  const alpha = new Float32Array(DUST_MAX);
  const size = new Float32Array(DUST_MAX);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, scale: { value: 420 } },
    vertexShader: `attribute float alpha; attribute float size; varying float vA; uniform float scale;
      void main() { vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5 || vA <= 0.0) discard; gl_FragColor = vec4(color, vA * smoothstep(0.5, 0.12, d)); }`,
    transparent: true, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return { pts, pos, alpha, size, vel: new Float32Array(DUST_MAX * 3), age: new Float32Array(DUST_MAX), life: new Float32Array(DUST_MAX), a0: new Float32Array(DUST_MAX), s0: new Float32Array(DUST_MAX), next: 0, live: 0 };
}
function emitDust(d, x, y, z, vx, vy, vz, size, life, a) {
  const i = d.next;
  d.next = (d.next + 1) % DUST_MAX;
  d.pos[i * 3] = x;
  d.pos[i * 3 + 1] = y;
  d.pos[i * 3 + 2] = z;
  d.vel[i * 3] = vx;
  d.vel[i * 3 + 1] = vy;
  d.vel[i * 3 + 2] = vz;
  d.age[i] = 0;
  d.life[i] = life;
  d.a0[i] = a;
  d.s0[i] = size;
  d.live = DUST_MAX;
}
// 風線：圍住你嘅圓柱入面，一條條向後飛
function resetWind(l, anyZ = false) {
  const a = Math.random() * PI * 2;
  const r = 1.6 + Math.random() * 4.5;
  l.userData.o.set(Math.cos(a) * r, Math.sin(a) * r * 0.7 + 0.8, anyZ ? -30 + Math.random() * 38 : -30 - Math.random() * 6);
  l.userData.v = 0.8 + Math.random() * 0.6;
}
// ☁️ 雲：一嚿嚿方塊雲，喺好高好遠，跟住你（每張地圖唔同色）
const CLOUD_LOOK = { savanna: [0xffd2ad, 0.92], desert: [0xffffff, 0.85], taiga: [0xdfe5ec, 0.95] };
function buildClouds(mapId) {
  const g = new THREE.Group();
  const [color, opacity] = CLOUD_LOOK[mapId] || CLOUD_LOOK.desert;
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, fog: false, depthWrite: false });
  g.userData.mat = mat;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const n = mapId === 'taiga' ? 18 : 13;
  for (let i = 0; i < n; i++) {
    const c = new THREE.Group();
    const w = 30 + Math.random() * 50;
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(box, mat);
      m.scale.set(w * (0.4 + Math.random() * 0.5), 6 + Math.random() * 7, 14 + Math.random() * 14);
      m.position.set((Math.random() - 0.5) * w, Math.random() * 4, (Math.random() - 0.5) * 12);
      c.add(m);
    }
    c.position.set(X0 + (Math.random() - 0.5) * 900, 70 + Math.random() * 60, -160 - Math.random() * 380);
    c.userData.vx = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 2.5);
    g.add(c);
  }
  return g;
}

// ================= 主角 =================
export function createRodeo(ctx) {
  const { scene, camera, player, thirdPerson, play, popup, announce, showLoading, teleport, togglePanel, flash, sky, hemi, sun } = ctx;
  const ui = buildUi();
  const view = new THREE.PerspectiveCamera(70, camera.aspect, 0.1, 700);
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Space' && api.active && !lastPaused && !e.repeat) jumpOff(); // 飛緊再撳 = 即刻拋套索
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  // R：今次嘅狀態
  const R = {
    mapId: 'savanna', phase: 'idle', panel: 'maps', travelling: false,
    z: 0, x: 0, dist: 0, speed: RODEO_START_SPEED, hearts: RODEO_HEARTS, safeT: 0, t: 0,
    mount: null, fly: null, wild: [], runners: [], chunks: new Map(), run: null, results: null,
    camPos: new THREE.Vector3(), camLook: new THREE.Vector3(), shake: 0, lastGallop: 0, lastNote: 0, overT: 0, downT: 0, tip: '',
    jumpWas: false, steerV: 0, mouseSteer: 0,
  };
  let world = null; // { root, ground, horizon, particles, ring, mark, rope, loop }
  let lastPaused = false;
  let savedZoom = null;

  const api = {
    active: false,
    view,
    returnTo: { ...RODEO_RETURN },
    openMapSelect,
    start: (mapId) => start(mapId),
    update,
    debug: null,
  };

  // ================= 揀地圖 =================
  function openMapSelect() {
    if (R.travelling || api.active || rodeoIntro.active) return;
    if (!state.rodeoIntroSeen) return playIntro(); // 🎬 第一次：先睇開場短片（舊存檔冇呢個 flag = 都睇一次）
    R.panel = 'maps';
    togglePanel('rodeo');
  }
  // 🎬 開場短片：播完（或者跳過）→ 開揀地圖面板
  function playIntro() {
    if (rodeoIntro.active || movie.active || api.active) return;
    player.controls.unlock();
    playRodeoIntro({
      scene, camera,
      onDone() {
        state.rodeoIntroSeen = true;
        save();
        R.panel = 'maps';
        togglePanel('rodeo');
      },
    });
  }
  const lasso = () => LASSO_LEVELS[clamp((state.lassoLevel || 1) - 1, 0, LASSO_LEVELS.length - 1)];
  const flute = () => FLUTE_LEVELS[clamp((state.fluteLevel || 1) - 1, 0, FLUTE_LEVELS.length - 1)];
  const best = (id) => Math.floor(state.rodeoBest?.[id] || 0);
  const MAP_TEXT = {
    savanna: { bg: 'linear-gradient(170deg, #ffb74d, #e65100 70%, #8e3a8c)', desc: 'Golden grass, acacia trees and a big sunset. Watch out for termite mounds!' },
    desert: { bg: 'linear-gradient(170deg, #ffe082, #f0a050 60%, #b85a35)', desc: 'Hot sand dunes, cactus and red rocks. The air is wobbly with heat!' },
    taiga: { bg: 'linear-gradient(170deg, #90a4ae, #2e7d32 65%, #1b3a2a)', desc: 'A snowy pine forest. Jump over fallen logs and stumps in the mist!' },
  };
  function mapsHtml() {
    const card = (m) => {
      const t = MAP_TEXT[m.id];
      const icons = tameAnimalsOn(m.id).map((a) => a.emoji).join('');
      return `<div class="rodeo-map" style="--bg:${t.bg}"><div class="em">${m.emoji}</div><h3>${m.name}</h3><p>${t.desc}</p>
        <div class="animals">${icons}</div><div class="best">🏆 Best: ${best(m.id).toLocaleString('en-US')} m</div><br>
        <button data-rodeo="start" data-map="${m.id}">🐎 Ride!</button></div>`;
    };
    const L = lasso();
    const F = flute();
    return `<div class="rodeo-panel"><p class="rp-intro">🤠 Pick a map! You ride a horse 🐎 that runs by itself. Steer with <b>A / D</b> (or the mouse). Press <b>SPACE</b> to jump off and 🪢 lasso an animal. Ride it while your 🪈 flute tames it!</p>
      <div class="rodeo-maps">${RODEO_MAPS.map(card).join('')}</div>
      <div class="rodeo-replay"><button data-rodeo="intro" class="grey">🎬 Watch intro</button></div>
      <div class="rodeo-gear"><span>🪢 Lasso Lv ${state.lassoLevel || 1} · ${L.range} m range · ${L.height} m jump</span><span>🪈 Flute Lv ${state.fluteLevel || 1} · ×${F.speed} taming speed</span><span>❤️ × ${RODEO_HEARTS}</span><span>🤠 ${short(state.tameTokens || 0)} Tame Tokens</span></div></div>`;
  }
  function resultsHtml() {
    const r = R.results;
    if (!r) return '<p>No results yet.</p>';
    const m = RODEO_MAPS.find((x) => x.id === r.mapId);
    const title = r.how === 'away' ? '🏃 You left Catch & Tame!' : '💫 Your ride is over!';
    const rc = (r) => (rarityInfo(r).color === '#cfd8dc' ? '#78909c' : rarityInfo(r).color); // Common 嘅淺灰喺米色底睇唔到
    const li = (p) => `<li style="--rc:${rc(p.rarity)}">${p.emoji} <b>${p.name}</b> · <span style="color:${rc(p.rarity)}">${p.rarity}</span> · ⚖️ ${p.kg.toLocaleString('en-US')} kg · 💰 $${short(p.money)}/sec · 🤠 +${p.tokens}${p.isNew ? ' · 📖 NEW!' : ''}</li>`;
    return `<div class="rodeo-panel rodeo-res">
      <div class="big">${r.tamed.length ? '🤠' : '🐎'}</div><h2>${title}</h2>
      <div>${m.emoji} ${m.name}</div>
      <div class="grid">
        <div><b>${r.dist.toLocaleString('en-US')} m</b><span>📏 Distance</span></div>
        <div class="${r.newBest ? 'newbest' : ''}"><b>${r.best.toLocaleString('en-US')} m</b><span>🏆 Best${r.newBest ? ' — NEW BEST!' : ''}</span></div>
        <div><b>${r.tamed.length}</b><span>🐾 Animals tamed</span></div>
        <div><b>+${r.tokens}</b><span>🤠 Tame Tokens</span></div>
      </div>
      ${r.tamed.length ? `<h3>🐾 Your new pets</h3><ul>${r.tamed.map(li).join('')}</ul><p>🎒 They are in your Backpack already (press <b>\`</b> → 🐉 Animals). Put them in your 🐾 Safety Zoo to earn 💰 money!</p>`
        : '<p>No animals tamed this time. Jump off (SPACE) near an animal, lasso it and ride it until the tame bar is full!</p>'}
      ${r.indexMoney ? `<p>📖 New species in your Index: +$${short(r.indexMoney)}</p>` : ''}
      <div class="btns"><button data-rodeo="start" data-map="${r.mapId}">🐎 Ride again (${m.name})</button><button data-rodeo="maps" class="grey">🗺️ Change map</button></div></div>`;
  }
  ctx.extraPanels.rodeo = ['🤠 Catch & Tame', () => (R.panel === 'results' ? resultsHtml() : mapsHtml()), 'E'];
  document.getElementById('panel-body')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-rodeo]');
    if (!b) return;
    if (b.dataset.rodeo === 'maps') {
      R.panel = 'maps';
      document.getElementById('panel-body').innerHTML = mapsHtml();
      return;
    }
    togglePanel('rodeo'); // 收埋面板
    if (b.dataset.rodeo === 'intro') return playIntro(); // 🎬 重播開場短片
    start(b.dataset.map);
  });

  // ================= 起／拆地圖 =================
  function buildWorld(mapId) {
    const root = new THREE.Group();
    root.name = 'rodeo';
    scene.add(root);
    const ground = buildGround(mapId);
    root.add(ground.mesh);
    const horizon = buildHorizon(mapId);
    root.add(horizon);
    // ✨ 粒子（金色塵／風沙／雪）
    const pc = MAP_LOOK[mapId].particles;
    const pos = new Float32Array(pc.count * 3);
    for (let i = 0; i < pc.count; i++) {
      pos[i * 3] = X0 + rand(-35, 35);
      pos[i * 3 + 1] = rand(0, 22);
      pos[i * 3 + 2] = rand(-60, 15);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const particles = new THREE.Points(geo, new THREE.PointsMaterial({ color: pc.color, size: pc.size, transparent: true, opacity: 0.85, depthWrite: false }));
    particles.frustumCulled = false;
    root.add(particles);
    // 🪢 套索範圍圈 + 目標圈 + 繩 + 繩圈
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), ADDM(0xffd54f, 0.55));
    ring.rotation.x = -PI / 2;
    ring.visible = false;
    root.add(ring);
    const mark = new THREE.Group();
    const markRing = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 32), ADDM(0x76ff03, 0.9));
    markRing.rotation.x = -PI / 2;
    mark.add(markRing);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0x76ff03, fog: false }));
    arrow.rotation.x = PI;
    mark.add(arrow);
    mark.userData.arrow = arrow;
    mark.visible = false;
    root.add(mark);
    // 🪢 條繩：兩隻色一節節（好似扭埋嘅麻繩），粗啲、多啲節（Issue #17：靚啲）
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd7b98e, roughness: 0.85 });
    const ropeMat2 = new THREE.MeshStandardMaterial({ color: 0xa8824f, roughness: 0.85 });
    const ropeGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 6);
    ropeGeo.rotateX(PI / 2);
    const rope = new THREE.Group();
    for (let i = 0; i < ROPE_SEGS; i++) rope.add(new THREE.Mesh(ropeGeo, i % 2 ? ropeMat2 : ropeMat));
    rope.visible = false;
    root.add(rope);
    const loop = new THREE.Group(); // 繩圈 + 結
    loop.add(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.065, 6, 22), ropeMat));
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.26), ropeMat2);
    knot.position.x = 0.7;
    loop.add(knot);
    loop.visible = false;
    root.add(loop);
    // 💨 塵（動物跑過、落地）、風線（飛緊）、雲
    const dust = makeDust(MAP_LOOK[mapId].dust ?? 0xd9b77a);
    root.add(dust.pts);
    const wind = new THREE.Group();
    const windGeo = new THREE.BoxGeometry(0.03, 0.03, 2.6);
    const windMat = ADDM(0xffffff, 0);
    for (let i = 0; i < 30; i++) {
      const l = new THREE.Mesh(windGeo, windMat);
      l.userData.o = new THREE.Vector3();
      resetWind(l, true);
      wind.add(l);
    }
    wind.visible = false;
    root.add(wind);
    const clouds = buildClouds(mapId);
    root.add(clouds);
    // 手上個馴服笛（騎緊野生動物先拎出嚟）
    const fluteMesh = new THREE.Group();
    const fm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.62), new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.6 }));
    fluteMesh.add(fm);
    for (let i = 0; i < 3; i++) {
      const hole = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.05), new THREE.MeshBasicMaterial({ color: 0x2b1a10 }));
      hole.position.set(0, 0.055, -0.1 + i * 0.12);
      fluteMesh.add(hole);
    }
    fluteMesh.position.set(0, -0.8, -0.28);
    fluteMesh.visible = false;
    thirdPerson.avatar.arms[1].add(fluteMesh);
    return { root, ground, horizon, particles, ring, mark, rope, loop, fluteMesh, dust, wind, windGeo, windMat, ropeGeo, ropeMat2, clouds };
  }
  function destroyWorld() {
    if (!world) return;
    for (const c of R.chunks.values()) disposeChunk(c);
    R.chunks.clear();
    for (const a of [...R.wild, ...R.runners, ...(R.mount ? [R.mount] : [])]) {
      a.holder.removeFromParent();
      disposeExtras(a);
    }
    R.wild = [];
    R.runners = [];
    R.mount = null;
    R.pose = null;
    world.ground.dispose();
    disposeHorizon(world.horizon);
    world.particles.geometry.dispose();
    world.particles.material.dispose();
    for (const o of [world.ring, ...world.mark.children, ...world.loop.children]) {
      o.geometry.dispose();
      o.material.dispose();
    }
    world.ropeGeo.dispose();
    world.ropeMat2.dispose();
    world.dust.pts.geometry.dispose();
    world.dust.pts.material.dispose();
    world.windGeo.dispose();
    world.windMat.dispose();
    world.clouds.traverse((o) => o.isMesh && o.geometry.dispose());
    world.clouds.userData.mat.dispose();
    world.fluteMesh.removeFromParent();
    world.root.removeFromParent();
    world = null;
  }

  // 一段段地圖：前面起、後面拆
  function updateChunks(all = false) {
    const cur = Math.floor(-R.z / CHUNK_LEN);
    for (const [i, c] of R.chunks) if (i < cur - 2 || i > cur + AHEAD_CHUNKS + 1) {
      disposeChunk(c);
      R.chunks.delete(i);
    }
    let made = 0;
    for (let i = cur - 1; i <= cur + AHEAD_CHUNKS; i++) {
      if (R.chunks.has(i)) continue;
      const diff = Math.min(1, Math.max(0, (i * CHUNK_LEN - 60) / 2600));
      const c = buildChunk(R.mapId, i, diff, i <= 1);
      world.root.add(c.group);
      R.chunks.set(i, c);
      if (!all && ++made >= 1) break; // 一格畫面最多起一段（唔好卡）
    }
  }
  // (x 偏移, z) 有冇撞到障礙物
  function obstacleAt(lx, z, radius) {
    const i = Math.floor(-z / CHUNK_LEN);
    for (const k of [i - 1, i, i + 1]) {
      const c = R.chunks.get(k);
      if (!c) continue;
      for (const o of c.obstacles) for (const ci of o.circles) {
        const dx = X0 + lx - ci.x;
        const dz = z - ci.z;
        if (dx * dx + dz * dz < (ci.r + radius) ** 2) return { o, ci };
      }
    }
    return null;
  }

  // ================= 動物 =================
  function animalModel(info, displayH) {
    const inner = buildAnimalModel(findAnimal(info.name) || info);
    const holder = new THREE.Group();
    const h = Math.max(0.1, inner.userData.height || 1);
    const k = displayH / h;
    inner.scale.multiplyScalar(k);
    holder.add(inner);
    inner.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    return { holder, inner };
  }
  const weightFor = (a) => TAME_SPAWN_WEIGHT[a.rarity] * (a.rarity === 'Common' ? 1 : 1 + Math.min(1.5, R.dist / 3000));
  function pickSpecies() {
    const list = tameAnimalsOn(R.mapId);
    let tot = 0;
    for (const a of list) tot += weightFor(a);
    let x = Math.random() * tot;
    for (const a of list) if ((x -= weightFor(a)) < 0) return a;
    return list[0];
  }
  function spawnWild(info, x, z) {
    const displayH = Math.max(MIN_RIDE_H, info.h);
    const { holder, inner } = animalModel(info, displayH);
    holder.position.set(X0 + x, groundY(X0 + x, z), z);
    world.root.add(holder);
    const rar = rarityInfo(info.rarity);
    let label = null;
    if (info.rarity !== 'Common') {
      label = makeLabel([{ text: `${info.emoji} ${info.rarity}`, color: rar.color }], 0.8);
      label.position.y = displayH + 0.9;
      holder.add(label);
    }
    let glow = null;
    if (info.rarity === 'Legendary' || info.rarity === 'Mythic') {
      glow = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.5 + displayH * 0.15, 28), ADDM(new THREE.Color(rar.color).getHex(), 0.55));
      glow.rotation.x = -PI / 2;
      glow.position.y = 0.06;
      holder.add(glow);
    }
    const a = {
      info, holder, inner, label, glow, x, z, h: displayH, seat: displayH * (info.seat ?? 0.72), r: 0.5 + displayH * 0.12,
      spd: info.speed * rand(0.6, 0.72), wob: Math.random() * 10, t: Math.random() * 10, escaped: false, dustT: Math.random() * 0.2,
    };
    R.wild.push(a);
    return a;
  }
  function spawnHerd() {
    const info = pickSpecies();
    const n = info.rarity === 'Mythic' || info.rarity === 'Legendary' ? 1 + (Math.random() < 0.3 ? 1 : 0) : 2 + Math.floor(Math.random() * 3);
    const cx = rand(-RODEO_LANE + 3, RODEO_LANE - 3);
    const cz = R.z - rand(70, 150);
    for (let i = 0; i < n && R.wild.length < RODEO_MAX_ANIMALS; i++) spawnWild(info, clamp(cx + rand(-4, 4), -RODEO_LANE, RODEO_LANE), cz + rand(-7, 7));
  }
  function updateWild(dt, time) {
    if (R.wild.length < RODEO_MAX_ANIMALS - 2 && Math.random() < dt * 0.9) spawnHerd();
    for (const a of [...R.wild]) {
      a.t += dt;
      const vz = R.speed * a.spd;
      a.z -= vz * dt;
      // 輕輕左右行 + 避開前面嘅障礙物
      let ax = Math.sin(a.t * 0.6 + a.wob) * 0.9;
      const hit = obstacleAt(a.x, a.z - 4, a.r + 0.6);
      if (hit) ax += (X0 + a.x >= hit.ci.x ? 1 : -1) * 9;
      a.x = clamp(a.x + ax * dt, -RODEO_LANE - 2, RODEO_LANE + 2);
      a.holder.position.set(X0 + a.x, groundY(X0 + a.x, a.z), a.z);
      a.holder.rotation.set(slopeZ(X0 + a.x, a.z) * 0.8, -ax * 0.04, 0);
      a.inner.userData.animate?.(time * 1.7 * a.info.speed, 1);
      kickDust(a, dt, 1);
      if (a.glow) a.glow.material.opacity = 0.35 + Math.sin(time * 5) * 0.2;
      if (a.z > R.z + 30 || a.z < R.z - 260) removeWild(a);
    }
    // 跑走咗嘅（跳走咗、馬）
    for (const a of [...R.runners]) {
      a.t += dt;
      a.z -= a.vz * dt;
      a.x += a.vx * dt;
      a.holder.position.set(X0 + a.x, groundY(X0 + a.x, a.z), a.z);
      a.holder.rotation.y = -Math.atan2(a.vx, a.vz) * 0.6;
      kickDust(a, dt, 1);
      a.inner.userData.animate?.(time * 1.8, 1);
      if (a.t > 4 || a.z > R.z + 40) {
        a.holder.removeFromParent();
        disposeExtras(a);
        R.runners.splice(R.runners.indexOf(a), 1);
      }
    }
  }
  // 每隻動物自己嘅頭頂字、光圈（模型本身嘅 geometry 係共用 cache，唔好 dispose）
  function disposeExtras(a) {
    if (a.label) {
      a.label.material.map?.dispose();
      a.label.material.dispose();
    }
    if (a.glow) {
      a.glow.geometry.dispose();
      a.glow.material.dispose();
    }
  }
  function removeWild(a, keep = false) {
    a.holder.removeFromParent();
    if (!keep) disposeExtras(a);
    const i = R.wild.indexOf(a);
    if (i >= 0) R.wild.splice(i, 1);
  }
  // 由坐騎變做跑走嘅動物（打側跑出去）
  function letGo(m, sideways = true) {
    if (!m) return;
    m.holder.rotation.set(0, 0, 0);
    m.holder.position.y = groundY(X0 + R.x, R.z);
    if (m.label) m.label.visible = true;
    R.runners.push({ holder: m.holder, inner: m.inner, label: m.label, glow: m.glow, x: R.x, z: R.z, vx: sideways ? (R.x > 0 ? 1 : -1) * rand(6, 9) : 0, vz: R.speed * 0.7, t: 0, h: m.h, r: m.r, dustT: 0 });
  }

  // ================= 坐騎 =================
  function newHorse() {
    const inner = buildHorse(Math.floor(Math.random() * 4));
    const holder = new THREE.Group();
    holder.add(inner);
    world.root.add(holder);
    return { kind: 'horse', holder, inner, h: HORSE_H, seat: HORSE_SEAT, r: 0.75, tamed: true, tame: 1, info: null, mul: 1 };
  }
  function mountWild(a) {
    removeWild(a, true);
    world.root.add(a.holder);
    if (a.label) a.label.visible = false;
    const tamedInfo = a.info;
    R.mount = { kind: 'wild', holder: a.holder, inner: a.inner, label: a.label, glow: a.glow, h: a.h, seat: a.seat, r: a.r, tamed: false, tame: 0, info: tamedInfo,
      mul: clamp(0.8 + 0.25 * tamedInfo.speed, 0.88, 1.15), buckT: 0 };
    R.phase = 'ride';
    R.fly = null;
    dustBurst(X0 + a.x, a.z, 18, 4.5);
    play('lassoCatch');
    popup(`🪢 You caught a ${tamedInfo.rarity} ${tamedInfo.name}! Hold on while your 🪈 flute tames it!`);
    showTame(true);
  }

  // ================= 開始／完 =================
  async function start(mapId = 'savanna') {
    if (R.travelling || api.active) return;
    if (!RODEO_MAPS.some((m) => m.id === mapId)) mapId = 'savanna';
    R.travelling = true;
    play('portal');
    const m = RODEO_MAPS.find((x) => x.id === mapId);
    const ok = await showLoading('🤠 Saddling up your horse...', async (progress) => {
      R.mapId = mapId;
      world = buildWorld(mapId);
      Object.assign(R, { z: 0, x: 0, dist: 0, speed: RODEO_START_SPEED, hearts: RODEO_HEARTS, safeT: 2, t: 0, fly: null, overT: 0, downT: 0, steerV: 0 });
      R.run = { mapId, tamed: [], newBest: false };
      updateChunks(true);
      progress(0.6);
      R.mount = newHorse();
      R.phase = 'ride';
      for (let i = 0; i < 4; i++) spawnHerd();
      for (const a of R.wild) a.z += 40; // 頭幾群近啲
      api.active = true;
      savedZoom = thirdPerson.zoom;
      if (thirdPerson.zoom < 3) thirdPerson.zoom = 5; // 拎住寵物唔好喺第一身飄喺半空
      thirdPerson.headSlot.visible = false;
      thirdPerson.flute.byRodeo = true; // 🎵 支笛由 Catch & Tame 控制（唔好企定吹）
      stopFlute(thirdPerson.flute);
      player.walking = false;
      placeEye();
      snapCamera();
      applySky();
      progress(1);
    }, 1.6, { theme: 'rodeo', title: m.name, kicker: `🤠 Catch & Tame · ${m.emoji}` });
    R.travelling = false;
    if (!ok) {
      cleanup();
      return;
    }
    document.body.classList.add('in-rodeo');
    showHud(true);
    banner(`${m.emoji} ${m.name.toUpperCase()}!`, 'SPACE = jump off & lasso! A / D = steer');
    play('yeehaw');
    announce(`🤠 CATCH & TAME · ${m.emoji} ${m.name} · 🏆 Best: ${best(mapId).toLocaleString('en-US')} m`);
  }
  // 冇晒心（how = 'ko'）／俾人傳送走咗（'away'）
  async function finish(how) {
    if (!R.run || R.phase === 'leaving') return;
    const run = R.run;
    R.phase = 'leaving';
    const dist = Math.floor(R.dist);
    const before = best(run.mapId);
    state.rodeoBest = { ...(state.rodeoBest || {}) };
    if (dist > before) state.rodeoBest[run.mapId] = dist;
    // 🐾 馴服咗嘅：馴服嗰下已經放咗入背包（tameDone，Issue #17），呢度淨係計總數
    const tamed = run.tamed;
    const tokens = tamed.reduce((n, t) => n + t.tokens, 0);
    const indexMoney = tamed.reduce((n, t) => n + t.indexMoney, 0);
    save();
    R.results = { how, mapId: run.mapId, dist, best: best(run.mapId), newBest: dist > before && dist > 0, tamed, tokens, indexMoney };
    R.run = null;
    showHud(false);
    showTame(false);
    if (how === 'away') {
      cleanup();
      if (tamed.length) popup(`🤠 You left Catch & Tame: ${tamed.length} new pet${tamed.length > 1 ? 's' : ''} + ${tokens} Tame Tokens!`);
      return;
    }
    R.travelling = true;
    const ret = api.returnTo || RODEO_RETURN;
    await showLoading('🐎 Riding back to the Hub...', async () => {
      cleanup();
      teleport(ret.x, ret.z, ret.rotY ?? RODEO_RETURN.rotY);
    }, 1.6, { theme: 'rodeo', title: 'Animal Rescue Park', kicker: '🤠 Back home to' });
    R.travelling = false;
    setTimeout(() => {
      R.panel = 'results';
      togglePanel('rodeo');
      play(tamed.length ? 'coin' : 'click');
    }, 250);
  }
  function cleanup() {
    api.active = false;
    R.phase = 'idle';
    R.fly = null;
    destroyWorld();
    document.body.classList.remove('in-rodeo');
    showHud(false);
    showTame(false);
    ui.haze.hidden = true;
    ui.banner.classList.remove('show');
    ui.hurt.style.opacity = '0';
    thirdPerson.headSlot.visible = true;
    thirdPerson.flute.byRodeo = false;
    stopFlute(thirdPerson.flute);
    if (savedZoom !== null) thirdPerson.zoom = savedZoom;
    savedZoom = null;
    const av = thirdPerson.avatar;
    av.g.rotation.set(0, 0, 0);
    av.g.position.y = 0;
  }

  // ================= 動作 =================
  function jumpOff() {
    if (R.phase === 'fly' && R.fly && R.fly.t > 0.12) R.fly.throwNow = true; // 飛緊再撳 SPACE：即刻拋套索（唔使等跌落嚟）
    if (R.phase !== 'ride' || !R.mount) return;
    const m = R.mount;
    if (m.kind === 'wild' && !m.tamed) popup(`💨 The ${m.info.name} ran away! (The tame bar was not full)`);
    letGo(m, true);
    R.mount = null;
    showTame(false);
    R.phase = 'fly';
    // 🚀 Issue #17：套索越好，飛得越高、越遠（LASSO_LEVELS 嘅 height／fling）
    const L = lasso();
    const vy = Math.sqrt(2 * GRAVITY * L.height);
    R.fly = { t: 0, y: m.holder.position.y + m.seat, vy, vy0: vy, height: L.height, fling: L.fling, slow: 1, throwNow: false, target: null,
      spin: rand(5, 8) * (Math.random() < 0.5 ? -1 : 1) * (0.7 + L.height * 0.06), roll: rand(-3, 3) };
    dustBurst(X0 + R.x, R.z, 10, 3);
    R.shake = 0.15;
    play('boing');
    play('lassoSwing');
  }
  function hurt(why) {
    if (api.debug.god) return;
    R.hearts -= 1;
    R.safeT = RODEO_HIT_SAFE;
    R.shake = 0.5;
    play('crash');
    play('heartLost');
    ui.hurt.style.opacity = '1';
    setTimeout(() => (ui.hurt.style.opacity = '0'), 220);
    ui.hearts.classList.remove('hit');
    void ui.hearts.offsetWidth;
    ui.hearts.classList.add('hit');
    if (R.hearts <= 0) {
      R.phase = 'over';
      R.overT = 0;
      if (R.mount) {
        letGo(R.mount, true);
        R.mount = null;
      }
      showTame(false);
      banner('💫 RUN OVER!', `📏 ${Math.floor(R.dist).toLocaleString('en-US')} m · 🤠 ${R.run.tamed.length} tamed`);
      play('knockedOut');
      return;
    }
    popup(why === 'fall' ? '💥 Ouch! You missed and hit the ground! -1 ❤️' : `💥 You crashed into a ${why}! -1 ❤️`);
  }
  function tameDone() {
    const m = R.mount;
    m.tamed = true;
    m.tame = 1;
    // 🎒 即刻變寵物、放入背包 + 🤠 Tame Tokens + 存檔（Issue #17：以前要等成個 run 完先俾，中途閂咗個 game 或者開背包睇就見唔到）
    const info = m.info;
    const kg = randomKg(info);
    const pet = { name: info.name, biome: TAME_PET_BIOME, kg, rarity: info.rarity, onPlot: false };
    state.pets.push(pet);
    const tokens = RODEO_TOKENS_PER_TAME * (TAME_TOKEN_BONUS[info.rarity] || 1);
    state.tameTokens = (state.tameTokens || 0) + tokens;
    state.totalTames = (state.totalTames || 0) + 1;
    let indexMoney = 0;
    if (!state.indexFound.includes(info.name)) {
      state.indexFound.push(info.name);
      indexMoney = INDEX_NEW_SPECIES_REWARD[TAME_PET_BIOME] || 0;
      state.money += indexMoney;
    }
    save();
    R.run.tamed.push({ info, name: info.name, emoji: info.emoji, rarity: info.rarity, kg, money: itemMoney(pet), tokens, isNew: indexMoney > 0, indexMoney });
    popup(`🎒 ${info.emoji} ${info.name} went into your Backpack! +${tokens} 🤠`);
    play('tamed');
    banner('🤠 TAMED!', `${m.info.emoji} ${m.info.name} · ${m.info.rarity}`);
    showTame(false);
    if (m.label) m.label.visible = false;
  }

  // ================= 每格 =================
  const _v = new THREE.Vector3();
  const _w = new THREE.Vector3();
  function steerInput() {
    let s = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1;
    if (Math.abs(touchInput.x) > 0.12) s += clamp(touchInput.x, -1, 1);
    return clamp(s, -1, 1);
  }
  function update(dt, time, { paused = false } = {}) {
    lastPaused = paused;
    if (rodeoIntro.savanna) applySky('savanna'); // 🎬 開場短片喺大草原：蓋過日夜系統個天
    if (!api.active || !world) return;
    // 俾人傳送走咗（控制面板、其他嘢）→ 結束
    if (R.phase !== 'leaving' && !inRodeo(camera.position.x)) {
      finish('away');
      return;
    }
    // 滑鼠／手機拖：鏡頭轉咗幾多 → 當係左右
    const yaw = camera.rotation.y;
    if (!paused && Math.abs(yaw) < 1.5) R.mouseSteer += -yaw * 22;
    if (paused || R.phase === 'leaving' || api.debug.freeze) {
      R.pose?.(); // updateThirdPerson 每格都擺返企直：暫停時都要擺返騎馬／飛緊嘅樣
      fluteFrame(thirdPerson.flute, 0, { on: thirdPerson.flute.on, third: true });
      placeEye();
      applySky();
      return;
    }
    // 手機 JUMP 掣（撳落嗰下）
    if (touchInput.jump && !R.jumpWas) jumpOff();
    R.jumpWas = touchInput.jump;
    // ⏱️ 慢鏡：飛得夠高，喺最高點附近成個世界慢落嚟（FLING_SLOWMO）
    if (R.phase === 'fly' && R.fly) {
      const f = R.fly;
      const want = f.height >= FLING_SLOWMO_MIN_HEIGHT && Math.abs(f.vy) < f.vy0 * 0.4 && !f.throwNow ? FLING_SLOWMO : 1;
      f.slow += (want - f.slow) * Math.min(1, dt * 12);
      dt *= f.slow;
    }
    R.t += dt;
    R.safeT = Math.max(0, R.safeT - dt);
    R.speed = Math.min(RODEO_MAX_SPEED, RODEO_START_SPEED + R.dist * RODEO_SPEED_UP);
    const steer = steerInput();
    const mouse = clamp(R.mouseSteer, -12, 12);
    R.mouseSteer -= mouse;
    if (R.phase === 'ride') ride(dt, time, steer, mouse);
    else if (R.phase === 'fly') flyUpdate(dt, time, steer, mouse);
    else if (R.phase === 'pull') pullUpdate(dt, time);
    else if (R.phase === 'down') downUpdate(dt);
    else if (R.phase === 'over') {
      R.overT += dt;
      R.z -= Math.max(0, R.speed * (1 - R.overT * 1.5)) * dt;
      poseDown(dt);
      R.pose = () => poseDown(0.016);
      if (R.overT > 2.2) finish('ko');
    }
    if (R.phase !== 'ride') fluteFrame(thirdPerson.flute, dt, { on: false, third: true, quick: true });
    if (!api.active) return; // finish() 拆咗個世界
    updateChunks();
    updateWild(dt, time);
    world.ground.follow(R.z);
    world.horizon.position.z = R.z;
    updateParticles(dt, time);
    updateLassoFx(time);
    updateDust(dt);
    updateWind(dt);
    updateClouds(dt);
    placeEye();
    followCamera(dt);
    applySky();
    updateHud();
  }
  function ride(dt, time, steer, mouse) {
    const m = R.mount;
    const wildBuck = m.kind === 'wild' && !m.tamed;
    const buck = wildBuck ? TAME_BUCK[m.info.rarity] ?? 0.5 : 0;
    const vz = R.speed * m.mul;
    R.z -= vz * dt;
    R.dist += vz * dt;
    // 左右：馴服咗／馬 = 順；野生 = 慢啲 + 亂咁彈
    const lat = wildBuck ? 7 : 11;
    let want = steer * lat;
    if (wildBuck) {
      m.buckT -= dt;
      if (m.buckT <= 0) {
        m.buckT = rand(0.35, 0.9) / (0.5 + buck);
        m.jerk = rand(-1, 1) * 9 * buck;
        play('buck');
      }
      want += m.jerk;
    }
    R.steerV += (want - R.steerV) * Math.min(1, dt * (wildBuck ? 5 : 9));
    R.x = clamp(R.x + R.steerV * dt + mouse * (wildBuck ? 0.6 : 1), -RODEO_LANE, RODEO_LANE);
    // 撞嘢
    if (R.safeT <= 0) {
      const hit = obstacleAt(R.x, R.z, m.r);
      if (hit) {
        hurt(hit.o.kind);
        R.x = clamp(R.x + (X0 + R.x >= hit.ci.x ? 1 : -1) * 1.2, -RODEO_LANE, RODEO_LANE);
      }
    }
    if (R.phase !== 'ride') return;
    // 🎵 馴服
    if (wildBuck) {
      m.tame = Math.min(1, m.tame + (dt / (TAME_SECONDS[m.info.rarity] || 6)) * flute().speed * (api.debug.fastTame ? 20 : 1));
      if (time - R.lastNote > 0.32) {
        R.lastNote = time;
        play('fluteNote');
        musicNote();
      }
      if (m.tame >= 1) tameDone();
    }
    // 位置、彈、跑步動畫
    const hop = Math.abs(Math.sin(R.t * 9 * m.mul)) * 0.12;
    const by = wildBuck ? Math.abs(Math.sin(R.t * 8)) * 0.45 * buck : 0;
    const gy = groundY(X0 + R.x, R.z);
    m.holder.position.set(X0 + R.x, gy + hop + by, R.z);
    m.holder.rotation.set((wildBuck ? Math.sin(R.t * 8) * 0.22 * buck : 0) + slopeZ(X0 + R.x, R.z) * 0.8, -R.steerV * 0.035, wildBuck ? Math.sin(R.t * 6.3) * 0.14 * buck : -R.steerV * 0.01);
    kickDust(m, dt, 1.3);
    m.inner.userData.animate?.(time * (m.kind === 'horse' ? 1.6 : 1.7 * (m.info?.speed || 1)), 1);
    if (time - R.lastGallop > 0.36 / m.mul) {
      R.lastGallop = time;
      play('gallop');
    }
    // 🤠 公仔坐喺背上
    m.holder.updateMatrixWorld(true);
    _v.set(0, m.seat / (m.holder.scale.y || 1), 0);
    m.holder.localToWorld(_v);
    const seat = _v.clone();
    const rot = m.holder.rotation.clone();
    R.pose = () => poseRider(seat, rot, wildBuck, buck);
    R.pose();
    // 🎵 Tamer Ranger：馴服緊就雙手舉起吹笛（tamerFlute.js），音符跟住隻動物一齊向前飄
    fluteFrame(thirdPerson.flute, dt, { on: wildBuck && state.rangerSkin === 'tamer', third: true, carry: _carry.set(0, 0, -vz), quick: !wildBuck });
  }
  function flyUpdate(dt, time, steer, mouse) {
    const f = R.fly;
    f.t += dt;
    f.vy -= GRAVITY * dt;
    f.y += f.vy * dt;
    const vz = R.speed * 0.95 + f.fling; // 🚀 套索越好飛得越遠
    R.z -= vz * dt;
    R.dist += vz * dt;
    R.x = clamp(R.x + steer * 7 * dt + mouse * 0.6, -RODEO_LANE - 1, RODEO_LANE + 1);
    // 🪢 搵最近、喺範圍入面嘅動物
    const range = lasso().range;
    let best2 = null;
    let bd = Infinity;
    for (const a of R.wild) {
      if (a.escaped) continue;
      const d = Math.hypot(a.x - R.x, a.z - R.z);
      const score = d + (a.z > R.z ? 3 : 0); // 前面嗰啲優先
      if (d <= range && score < bd) {
        bd = score;
        best2 = a;
      }
    }
    f.target = best2;
    // 上升緊：淨係瞄（綠色箭咀）；過咗最高點（開始跌）先自動拋，或者再撳 SPACE 即刻拋 → 飛得高都可以揀落邊隻
    if (best2 && f.t > 0.15 && (f.vy < 0 || f.throwNow)) {
      R.phase = 'pull';
      R.pull = { t: 0, from: new THREE.Vector3(X0 + R.x, f.y, R.z), target: best2 };
      play('lassoSwing');
      return;
    }
    R.pose = () => poseRagdoll(time, f);
    R.pose();
    if (f.vy < 0 && f.y <= groundY(X0 + R.x, R.z)) {
      // 套唔到 → 跌落地
      R.phase = 'down';
      R.downT = 0;
      R.fly = null;
      const g = thirdPerson.avatar.g;
      g.rotation.x = Math.atan2(Math.sin(g.rotation.x), Math.cos(g.rotation.x));
      dustBurst(X0 + R.x, R.z, 26, 6);
      hurt('fall');
    }
  }
  function pullUpdate(dt, time) {
    const P = R.pull;
    const a = P.target;
    P.t += dt;
    const k = Math.min(1, P.t / 0.42);
    const tx = X0 + a.x;
    const ty = groundY(tx, a.z) + a.seat;
    const tz = a.z;
    const x = THREE.MathUtils.lerp(P.from.x, tx, k);
    const z = THREE.MathUtils.lerp(P.from.z, tz, k);
    const y = THREE.MathUtils.lerp(P.from.y, ty, k) + Math.sin(k * PI) * 1.6;
    R.x = x - X0;
    R.z = z;
    const f = { y, spin: 3, roll: 0, t: P.t + 1 };
    R.pose = () => poseRagdoll(time, f);
    R.pose();
    if (k >= 1) {
      R.x = a.x;
      mountWild(a);
      R.pull = null;
    }
  }
  function downUpdate(dt) {
    R.downT += dt;
    R.z -= Math.max(0, R.speed * (0.6 - R.downT)) * dt; // 碌兩碌停低
    poseDown(dt);
    R.pose = () => poseDown(0.016);
    if (R.downT > 1.1 && R.phase === 'down') {
      R.mount = newHorse();
      R.phase = 'ride';
      R.safeT = Math.max(R.safeT, 2);
      play('yeehaw');
      popup('🐎 A new horse! Keep going!');
    }
  }

  // ---------- 公仔姿勢（thirdPerson 個 avatar）----------
  function poseRider(seat, rot, bucking, buck) {
    const av = thirdPerson.avatar;
    av.g.visible = true;
    av.g.scale.setScalar(1);
    av.g.position.set(seat.x, seat.y - 0.88, seat.z);
    av.g.rotation.set(rot.x * 0.7, rot.y, rot.z * 0.7);
    av.torso.position.set(0, 0, 0);
    av.torso.rotation.set(bucking ? Math.sin(R.t * 8 + 1) * 0.25 * buck : -0.12, 0, 0);
    av.legs.forEach((l, i) => l.rotation.set(1.15, 0, (i ? 1 : -1) * 0.45));
    av.knees.forEach((k) => k.rotation.set(0, 0, 0));
    av.elbows.forEach((e) => e.rotation.set(0, 0, 0));
    if (bucking) {
      // 一隻手揸實，另一隻手吹笛
      av.arms[0].rotation.set(Math.PI - 0.4 + Math.sin(R.t * 10) * 0.3, 0, -0.3);
      av.arms[1].rotation.set(2.5, 0, 0.55);
      world.fluteMesh.visible = state.rangerSkin !== 'tamer'; // 🧢 Tamer：用 tamerFlute.js 嗰支靚笛（雙手吹）
    } else {
      av.arms[0].rotation.set(0.75, 0, 0.15);
      av.arms[1].rotation.set(0.75, 0, -0.15);
      world.fluteMesh.visible = false;
    }
    av.head.rotation.set(0, 0, 0);
  }
  function poseRagdoll(time, f) {
    const av = thirdPerson.avatar;
    av.g.visible = true;
    av.g.scale.setScalar(1);
    av.g.position.set(X0 + R.x, Math.max(groundY(X0 + R.x, R.z), f.y), R.z);
    av.g.rotation.set(f.t * f.spin, 0, f.t * f.roll);
    av.torso.rotation.set(0, 0, 0);
    av.legs.forEach((l, i) => l.rotation.set(Math.sin(time * 14 + i * 2) * 1.1, 0, (i ? 1 : -1) * (0.4 + Math.sin(time * 9 + i) * 0.3)));
    av.arms.forEach((a, i) => a.rotation.set(Math.sin(time * 12 + i * 3) * 1.4, 0, (i ? -1 : 1) * (1.4 + Math.sin(time * 10 + i) * 0.5)));
    av.head.rotation.set(Math.sin(time * 8) * 0.3, 0, 0);
    world.fluteMesh.visible = false;
  }
  function poseDown(dt) {
    const av = thirdPerson.avatar;
    av.g.visible = true;
    av.g.position.set(X0 + R.x, groundY(X0 + R.x, R.z) + 0.35, R.z);
    av.g.rotation.x += (-PI / 2 - av.g.rotation.x) * Math.min(1, dt * 8);
    av.g.rotation.z *= 0.9;
    av.legs.forEach((l, i) => l.rotation.set(0, 0, (i ? 1 : -1) * 0.5));
    av.arms.forEach((a, i) => a.rotation.set(0, 0, (i ? -1 : 1) * 1.2));
    world.fluteMesh.visible = false;
  }

  // ---------- 💨 塵、風、雲 ----------
  const _carry = new THREE.Vector3();
  // 動物／馬跑過：腳底後面踢起一嚿嚿塵（Taiga = 雪粉）
  function kickDust(a, dt, k = 1) {
    if (!world || dt <= 0) return;
    a.dustT = (a.dustT ?? 0) - dt;
    if (a.dustT > 0) return;
    a.dustT = 0.07 + Math.random() * 0.08;
    const p = a.holder.position;
    const r = a.r || 0.6;
    const big = Math.min(2.2, 0.7 + (a.h || 1.5) * 0.25) * k;
    emitDust(world.dust, p.x + rand(-r, r), p.y + 0.25, p.z + r * 0.8, rand(-0.8, 0.8), rand(0.4, 1.4), rand(0.5, 2), big * rand(0.6, 1), rand(0.8, 1.3), 0.5);
  }
  // 落地「噗」一聲：一圈塵向外散
  function dustBurst(x, z, n = 18, speed = 5) {
    if (!world) return;
    const y = groundY(x, z) + 0.2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + Math.random() * 0.3;
      const v = speed * rand(0.6, 1.1);
      emitDust(world.dust, x + Math.cos(a) * 0.6, y, z + Math.sin(a) * 0.6, Math.cos(a) * v, rand(0.8, 2.2), Math.sin(a) * v - R.speed * 0.3, rand(1.1, 2), rand(0.7, 1.2), 0.75);
    }
  }
  function updateDust(dt) {
    const d = world.dust;
    if (!d.live) return;
    let alive = 0;
    const drag = Math.max(0, 1 - dt * 1.8);
    for (let i = 0; i < DUST_MAX; i++) {
      if (d.age[i] >= d.life[i]) {
        d.alpha[i] = 0;
        continue;
      }
      alive++;
      d.age[i] += dt;
      const k = d.age[i] / d.life[i];
      d.vel[i * 3] *= drag;
      d.vel[i * 3 + 1] = d.vel[i * 3 + 1] * drag - 0.4 * dt;
      d.vel[i * 3 + 2] *= drag;
      d.pos[i * 3] += d.vel[i * 3] * dt;
      d.pos[i * 3 + 1] += d.vel[i * 3 + 1] * dt;
      d.pos[i * 3 + 2] += d.vel[i * 3 + 2] * dt;
      d.alpha[i] = d.a0[i] * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
      d.size[i] = d.s0[i] * (0.6 + k * 1.6);
    }
    d.live = alive;
    const g = d.pts.geometry.attributes;
    g.position.needsUpdate = true;
    g.alpha.needsUpdate = true;
    g.size.needsUpdate = true;
    d.pts.material.uniforms.scale.value = (renderH() / 2) / Math.tan((view.fov * PI) / 360);
  }
  const renderH = () => (window.innerHeight || 800);
  // 💨 風線：飛緊（同跑得好快）嗰陣圍住你向後飛
  function updateWind(dt) {
    const w = world.wind;
    const flying = R.phase === 'fly' || R.phase === 'pull';
    const want = flying ? 1 : clamp((R.speed - RODEO_START_SPEED) / (RODEO_MAX_SPEED - RODEO_START_SPEED), 0, 1) * 0.3;
    R.windK = (R.windK || 0) + (want - (R.windK || 0)) * Math.min(1, dt * 4);
    w.visible = R.windK > 0.02;
    if (!w.visible) return;
    world.windMat.opacity = R.windK * 0.45;
    riderPos(_v);
    const sp = (R.speed + (R.fly?.fling || 0)) * 1.6;
    for (const l of w.children) {
      const o = l.userData.o;
      o.z += sp * l.userData.v * dt;
      if (o.z > 8) resetWind(l);
      l.position.set(_v.x + o.x, _v.y + o.y, _v.z + o.z);
      l.scale.z = 0.6 + R.windK * 1.2;
    }
  }
  function updateClouds(dt) {
    const c = world.clouds;
    c.position.z = R.z;
    for (const g of c.children) {
      g.position.x += g.userData.vx * dt;
      if (g.position.x > X0 + 460) g.position.x -= 920;
      if (g.position.x < X0 - 460) g.position.x += 920;
    }
  }

  // ---------- 🪢 套索效果 ----------
  function updateLassoFx(time) {
    const flying = R.phase === 'fly';
    const range = lasso().range;
    world.ring.visible = flying;
    if (flying) {
      world.ring.position.set(X0 + R.x, groundY(X0 + R.x, R.z) + 0.12, R.z);
      world.ring.scale.setScalar(range);
    }
    // 目標
    const target = R.phase === 'fly' ? R.fly?.target : R.phase === 'pull' ? R.pull?.target : null;
    world.mark.visible = !!target;
    if (target) {
      world.mark.position.set(X0 + target.x, groundY(X0 + target.x, target.z) + 0.14, target.z);
      world.mark.children[0].material.color.setHex(R.phase === 'fly' && R.fly.vy >= 0 && !R.fly.throwNow ? 0xffd54f : 0x76ff03); // 黃 = 瞄緊；綠 = 拋！
      world.mark.scale.setScalar(target.r * 1.4 + Math.sin(time * 10) * 0.08);
      world.mark.userData.arrow.position.y = (target.h + 1.6 + Math.sin(time * 6) * 0.25) / (target.r * 1.4);
      world.mark.userData.arrow.rotation.y = time * 3;
    }
    // 繩：由右手去目標條頸；飛緊就喺頭頂轉個繩圈（好似真牛仔咁）
    const pulling = R.phase === 'pull' && R.pull;
    world.rope.visible = !!pulling || flying;
    world.loop.visible = !!pulling || flying;
    if (flying && !pulling) {
      const av = thirdPerson.avatar;
      av.g.updateMatrixWorld(true);
      _v.set(0, -0.75, 0);
      av.arms[1].localToWorld(_v);
      const spinA = time * 13;
      _w.set(_v.x + Math.cos(spinA) * 0.35, _v.y + 0.9, _v.z + Math.sin(spinA) * 0.35);
      const n = world.rope.children.length;
      const short = 5;
      let prev = _v.clone();
      for (let i = 1; i <= n; i++) {
        const s = world.rope.children[i - 1];
        s.visible = i <= short;
        if (!s.visible) continue;
        const p = _v.clone().lerp(_w, i / short);
        s.position.copy(prev).add(p).multiplyScalar(0.5);
        s.scale.z = Math.max(0.01, prev.distanceTo(p));
        s.lookAt(p);
        prev = p;
      }
      world.loop.position.set(_w.x - Math.cos(spinA) * 0.7, _w.y + 0.05, _w.z - Math.sin(spinA) * 0.7);
      world.loop.rotation.set(-PI / 2 + Math.sin(time * 6) * 0.12, 0, -spinA);
    }
    if (pulling) {
      for (const s of world.rope.children) s.visible = true;
      const a = R.pull.target;
      const av = thirdPerson.avatar;
      av.g.updateMatrixWorld(true);
      _v.set(0, -0.75, 0);
      av.arms[1].localToWorld(_v);
      _w.set(X0 + a.x, groundY(X0 + a.x, a.z) + a.h * 0.85, a.z - a.r * 0.6);
      const n = world.rope.children.length;
      const sag = Math.max(0, 1 - R.pull.t / 0.42) * 1.2;
      let prev = _v.clone();
      for (let i = 1; i <= n; i++) {
        const k = i / n;
        const p = _v.clone().lerp(_w, k);
        p.y -= Math.sin(k * PI) * sag;
        const s = world.rope.children[i - 1];
        s.position.copy(prev).add(p).multiplyScalar(0.5);
        s.scale.z = Math.max(0.01, prev.distanceTo(p));
        s.lookAt(p);
        prev = p;
      }
      world.loop.position.copy(_w);
      world.loop.rotation.set(PI / 2, 0, time * 4);
    }
  }

  // ---------- 鏡頭 ----------
  function riderPos(out) {
    const av = thirdPerson.avatar;
    return out.set(X0 + R.x, Math.max(0.5, av.g.position.y + 1.2), R.z);
  }
  function placeEye() {
    // 「眼」鏡頭（移動、whereIs、太陽跟住佢）擺喺騎手個位；望住前面（-z）。滑鼠轉咗嘅角度上面已經讀咗
    camera.position.set(X0 + R.x, (thirdPerson.avatar.g.position.y || 0) + 1.7, R.z);
    camera.rotation.set(0, 0, 0, 'YXZ');
    player.feetY = 0;
    player.vy = 0;
    player.grounded = true;
  }
  function snapCamera() {
    riderPos(_v);
    R.camPos.set(_v.x, _v.y + 4, _v.z + 10);
    R.camLook.set(_v.x, _v.y + 1, _v.z - 8);
    view.position.copy(R.camPos);
    view.lookAt(R.camLook);
  }
  function followCamera(dt) {
    riderPos(_v);
    const mh = R.mount ? R.mount.h : 2;
    // 🚀 飛緊：鏡頭跟住你升高、退後少少、望落前面（睇到落邊隻動物度）
    const flying = R.phase === 'fly' || R.phase === 'pull';
    const air = flying ? Math.max(0, _v.y - 1.2 - groundY(_v.x, _v.z)) : 0;
    R.camAir = (R.camAir || 0) + (air - (R.camAir || 0)) * Math.min(1, dt * 5);
    const back = 7.5 + mh * 0.6 + (flying ? 3 : 0) + R.camAir * 0.55;
    const up = 4.6 + mh * 0.5 + (R.phase === 'fly' ? 1.5 : 0) - R.camAir * 0.35;
    _w.set(_v.x * 0.85 + X0 * 0.15, Math.max(_v.y + up, groundY(_v.x, _v.z + back) + 2), _v.z + back);
    R.camPos.lerp(_w, Math.min(1, dt * (flying ? 7 : 6)));
    R.camPos.z = Math.min(R.camPos.z, _v.z + back + 2); // 前面跑得快都唔好甩得太遠
    R.camLook.lerp(_w.set(_v.x, _v.y + 0.3 - R.camAir * 0.45, _v.z - 10 - R.camAir * 0.8), Math.min(1, dt * 8));
    view.position.copy(R.camPos);
    if (R.shake > 0) {
      R.shake = Math.max(0, R.shake - dt);
      view.position.x += (Math.random() - 0.5) * R.shake;
      view.position.y += (Math.random() - 0.5) * R.shake;
    }
    view.lookAt(R.camLook);
    view.aspect = camera.aspect;
    const slow = R.phase === 'fly' && R.fly ? 1 - R.fly.slow : 0;
    view.fov = 68 + (R.speed - RODEO_START_SPEED) * 0.6 + R.camAir * 0.8 - slow * 6; // 慢鏡：鏡頭推近少少
    view.updateProjectionMatrix();
  }

  // ---------- 天、霧、光（每格蓋過日夜系統）----------
  const _c = new THREE.Color();
  function applySky(mapId = R.mapId) {
    const L = MAP_LOOK[mapId];
    if (!L) return;
    scene.background?.setHex?.(L.sky[0]);
    if (scene.fog) {
      scene.fog.color.setHex(L.fog[0]);
      scene.fog.near = L.fog[1];
      scene.fog.far = L.fog[2];
    }
    if (sky?.uniforms) {
      const u = sky.uniforms;
      u.bottom.value.setHex(L.sky[0]);
      u.top.value.setHex(L.sky[1]);
      if (u.sunDir) {
        u.sunDir.value.set(...L.sunDir).normalize();
        u.sunColor.value.setHex(L.sunColor);
        u.sunAmt.value = L.sunAmt;
        u.moonAmt.value = 0;
      }
    }
    if (hemi) {
      hemi.color.setHex(L.hemi[0]);
      hemi.groundColor.setHex(L.hemi[1]);
      hemi.intensity = L.hemi[2];
    }
    if (sun) {
      sun.color.copy(_c.setHex(L.light[0]));
      sun.intensity = L.light[1];
    }
  }
  function updateParticles(dt, time) {
    const pc = MAP_LOOK[R.mapId].particles;
    const arr = world.particles.geometry.attributes.position.array;
    const cx = X0 + R.x;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += Math.sin(time * 0.7 + i) * pc.drift * dt + (R.mapId === 'desert' ? pc.drift * dt : 0);
      arr[i + 1] -= pc.fall * dt;
      if (arr[i + 1] < 0) arr[i + 1] += 22;
      if (arr[i + 1] > 22) arr[i + 1] -= 22;
      if (arr[i + 2] > R.z + 15) arr[i + 2] -= 75;
      if (arr[i + 2] < R.z - 60) arr[i + 2] += 75;
      if (arr[i] > cx + 35) arr[i] -= 70;
      if (arr[i] < cx - 35) arr[i] += 70;
    }
    world.particles.geometry.attributes.position.needsUpdate = true;
  }

  // ---------- HUD ----------
  let hudKey = '';
  function showHud(on) {
    ui.hud.hidden = !on;
    ui.hearts.hidden = !on;
    ui.tamed.hidden = !on;
    ui.tip.hidden = !on;
    ui.haze.hidden = !(on && MAP_LOOK[R.mapId]?.haze);
    hudKey = '';
  }
  function showTame(on) {
    ui.tame.hidden = !on;
    if (on && R.mount?.info) {
      const i = R.mount.info;
      ui.tame.querySelector('.name').innerHTML = `🪈 Taming <span style="color:${rarityInfo(i.rarity).color}">${i.rarity}</span> ${i.emoji} ${i.name}... hold on!`;
    }
  }
  function musicNote() {
    const n = document.createElement('span');
    n.className = 'note';
    n.textContent = ['🎵', '🎶', '♪'][Math.floor(Math.random() * 3)];
    n.style.left = `${rand(5, 90)}%`;
    n.style.top = '-6px';
    n.style.setProperty('--dx', `${rand(-30, 30)}px`);
    ui.tame.appendChild(n);
    setTimeout(() => n.remove(), 1400);
  }
  let bannerTimer = 0;
  function banner(text, small = '') {
    ui.banner.innerHTML = `${text}${small ? `<small>${small}</small>` : ''}`;
    ui.banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => ui.banner.classList.remove('show'), 1900);
  }
  function updateHud() {
    const m = RODEO_MAPS.find((x) => x.id === R.mapId);
    const d = Math.floor(R.dist);
    const tip = R.phase === 'fly' ? `🪢 Lasso range ${lasso().range} m — steer to an animal! SPACE again = throw now!`
      : R.phase === 'ride' && R.mount?.kind === 'wild' && !R.mount.tamed ? '🪈 Taming... SPACE = let go (it runs away!)'
        : R.phase === 'ride' ? '⌨️ A / D = steer · SPACE = jump off & lasso!' : R.phase === 'down' ? '💥 Ouch!' : '';
    const key = `${d}|${R.hearts}|${R.run?.tamed.length}|${tip}|${R.safeT > 0}`;
    if (key !== hudKey) {
      hudKey = key;
      ui.hud.querySelector('.map').textContent = m.emoji;
      ui.hud.querySelector('.dist').textContent = `📏 ${d.toLocaleString('en-US')} m`;
      const b = Math.max(best(R.mapId), 0);
      ui.hud.querySelector('.best').textContent = d > b && b > 0 ? '🏆 NEW BEST!' : `🏆 ${b.toLocaleString('en-US')} m`;
      ui.hearts.textContent = '❤️'.repeat(Math.max(0, R.hearts)) + '🖤'.repeat(Math.max(0, RODEO_HEARTS - R.hearts));
      ui.hearts.style.opacity = R.safeT > 0 && R.phase === 'ride' ? '0.6' : '1';
      const t = R.run?.tamed || [];
      ui.tamed.querySelector('.n').textContent = t.length;
      ui.tamed.querySelector('.list').textContent = t.slice(-8).map((x) => x.info.emoji).join('');
      ui.tip.textContent = tip;
      ui.tip.hidden = !tip;
    }
    if (!ui.tame.hidden && R.mount) ui.tame.querySelector('.bar i').style.width = `${Math.round(R.mount.tame * 100)}%`;
  }

  // ================= 測試（game.rodeo.*）=================
  api.debug = {
    god: false,
    fastTame: false,
    freeze: false, // 測試影相：成個 Catch & Tame 停低
    start: (mapId = 'savanna') => start(mapId),
    open: () => openMapSelect(),
    intro: () => playIntro(), // 🎬 game.rodeo.intro()
    end: () => api.active && finish('ko'),
    leave: () => api.active && finish('away'),
    tameNow() {
      if (R.mount?.kind === 'wild' && !R.mount.tamed) tameDone();
    },
    spawn(name) {
      const info = TAME_ANIMALS.find((a) => a.name === name) || pickSpecies();
      if (!world) return null;
      return spawnWild(info, R.x + 2, R.z - 10).info.name;
    },
    jump: () => jumpOff(),
    hearts(n = RODEO_HEARTS) {
      R.hearts = n;
    },
    dist(m = 1000) {
      R.dist = m;
    },
    steer(x) {
      R.x = x;
    },
    get R() {
      return R;
    },
  };
  return api;
}
