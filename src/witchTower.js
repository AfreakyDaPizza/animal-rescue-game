// 🗼 Endless Witch Tower（小朋友 GitHub Issue #11 + #12）
// 「enter the tower and fight zombies and corrupted endangered animals, you have some weapons like a pistol, a blaster,
//   a slingshot etc. The tower is endless and the more floors + zombies you beat, the rarer and cooler stuff you get.」
//
// 流程：
//   Witch Castle 塔門撳 E → 揀難度（🟢 Easy／🟡 Medium／🔴 Hard，每個難度記住最高層數）→ 載入畫面 → 塔入面（src/towerShape.js）
//   每層：殭屍（walker／runner／spitter／brute）+ 😵 腐化動物（衝過嚟撞你）由地上嘅魔法陣爬出嚟
//     🧟 殭屍打散 = 變糖果閃粉（POOF!）
//     😵 腐化動物永遠唔會死：HP 到 0 → 紫色腐化爆走 → 變返正常顏色「💚 Cured!」開心咁跑走、慢慢消失
//   每 5 層：MINI-BOSS（👑 Zombie King／😵 GIANT 腐化動物）
//   打完一層：小獎入 🎒 袋；5、10、15… 層：大獎即刻俾（src/data/towerRewards.js）
//   中間個 ✨ 升降魔法陣：企上去 = 魔法升降機上下一層（牆向下飛、光柱、閃光）
//   🚪 南邊個門：打完一層之後離開 = 成袋獎都係你嘅；俾人打暈（冇晒 ❤️）= 淨係留返一半（TOWER_KO_KEEP）
//   完咗：結果卡（打咗幾多層、幾多殭屍、救咗幾多隻動物、攞咗咩獎）→ 返去 Witch Castle 庭園
// 武器：src/weapons.js（第一次入嚟送晒 3 支）；數值：balance.js 嘅 TOWER_*；獎品：src/data/towerRewards.js
// 測試（console）：game.tower.enter('hard')、game.tower.floor(10)、game.tower.clear()、game.tower.god = true、game.tower.ko()、game.tower.lineup()

import * as THREE from 'three';
import { state, save } from './state.js';
import { addSounds } from './sound.js';
import { bakeStatic } from './world.js';
import { makeLabel } from './signs.js';
import { canvasTex, seeded } from './halloweenArt.js';
import { flame, bx, cyl, sph, cone } from './halloweenKit.js';
import { ANIMALS } from './data/animals.js';
import { buildAnimalModel } from './animalModels.js';
import { buildZombie, corrupt, towerGlowTex } from './towerModels.js';
import { giveReward } from './demonicRewards.js';
import {
  TOWER_ARENA as A, TOWER_LIFT, TOWER_ARRIVE, TOWER_EXIT, TOWER_CAULDRONS, TOWER_SHELVES, towerPolar, inTowerArena, clampTower,
} from './towerShape.js';
import {
  TOWER_HEARTS, TOWER_HEART_REGEN, TOWER_HIT_SAFE, TOWER_KO_KEEP, TOWER_BASE_ENEMIES, TOWER_ENEMIES_PER_FLOOR, TOWER_MAX_ENEMIES,
  TOWER_MAX_AT_ONCE, TOWER_HP_GROWTH, TOWER_SPEED_GROWTH, TOWER_MAX_SPEED_MULT, TOWER_DOUBLE_DAMAGE_FLOOR, TOWER_BOSS_EVERY,
  TOWER_ANIMAL_SHARE, TOWER_ANIMAL_SHARE_GROWTH, TOWER_ANIMAL_SHARE_MAX, TOWER_ENEMIES, TOWER_BOSS_HP, TOWER_BOSS_GROWTH,
} from './data/balance.js';
import {
  TOWER_MODES, TOWER_MODE_ORDER, TOWER_REWARD_LOOK, TOWER_RARE_TYPES, TOWER_PER_ZOMBIE, TOWER_PER_CURE, TOWER_PER_BOSS,
  rollFloorRewards, milestoneRewards, rollAmount,
} from './data/towerRewards.js';
import { short } from './format.js';

const $ = (id) => document.getElementById(id);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const PI = Math.PI;
const rand = (a, b) => a + Math.random() * (b - a);
const ADDM = (color, opacity = 0.8) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });

// 每層換一個顏色（火把、魔法陣、霧）
const THEMES = [
  { fire: [0xf3c5ff, 0xd500f9, 0x6a1b9a], circle: 0xd500f9, fog: 0x1c0a2c, light: 0xb04dff },
  { fire: [0xe6ffb0, 0x76ff03, 0x1b5e20], circle: 0x76ff03, fog: 0x0b1c10, light: 0x76ff03 },
  { fire: [0xe1f5fe, 0x40c4ff, 0x01579b], circle: 0x40c4ff, fog: 0x081a2a, light: 0x40c4ff },
  { fire: [0xffecb3, 0xff9100, 0xbf360c], circle: 0xff9100, fog: 0x221006, light: 0xff9100 },
  { fire: [0xffd6e7, 0xff4081, 0x880e4f], circle: 0xff4081, fog: 0x220a18, light: 0xff4081 },
];
const CANDY = [0xff4081, 0xffeb3b, 0x40c4ff, 0x76ff03, 0xff9100, 0xe040fb, 0xffffff].map((c) => new THREE.MeshBasicMaterial({ color: c }));

// ---------- 聲效 ----------
addSounds({
  zombieGroan: (t, { tone }) => {
    tone(130, t, 0.7, { type: 'sawtooth', vol: 0.05, slide: 0.8 });
    tone(98, t + 0.15, 0.6, { type: 'triangle', vol: 0.06, slide: 1.15 });
  },
  zombieSwipe: (t, { noise }) => noise(t, 0.18, { vol: 0.25, freq: 1400, q: 0.9, type: 'bandpass' }),
  candyPoof: (t, { tone, noise, arp }) => {
    noise(t, 0.25, { vol: 0.3, freq: 3000, q: 0.6, type: 'bandpass' });
    arp(t + 0.03, [784, 1047, 1319, 1568], 0.04, { type: 'triangle', vol: 0.09 });
    tone(300, t, 0.15, { type: 'sine', vol: 0.12, slide: 2.5 });
  },
  animalCured: (t, { arp, noise }) => {
    noise(t, 0.4, { vol: 0.2, freq: 900, q: 0.5, type: 'bandpass' });
    arp(t + 0.15, [523, 659, 784, 1047, 1319], 0.08, { type: 'sine', vol: 0.14 });
  },
  chargeUp: (t, { tone }) => tone(160, t, 0.7, { type: 'sawtooth', vol: 0.06, slide: 2.2 }),
  chargeGo: (t, { noise, tone }) => {
    noise(t, 0.5, { vol: 0.3, freq: 600, q: 0.7, type: 'bandpass' });
    tone(90, t, 0.4, { type: 'square', vol: 0.06, slide: 0.6 });
  },
  slimeSpit: (t, { tone, noise }) => {
    tone(500, t, 0.18, { type: 'sine', vol: 0.12, slide: 0.4 });
    noise(t, 0.12, { vol: 0.15, freq: 1200, type: 'bandpass' });
  },
  slimeSplat: (t, { noise, tone }) => {
    noise(t, 0.3, { vol: 0.3, freq: 700, q: 0.8, type: 'bandpass' });
    tone(180, t, 0.2, { type: 'sine', vol: 0.12, slide: 0.5 });
  },
  shockwave: (t, { tone, noise }) => {
    tone(60, t, 0.9, { type: 'sine', vol: 0.5, slide: 0.5 });
    noise(t, 0.8, { vol: 0.55, freq: 400 });
  },
  portalRise: (t, { tone }) => tone(220, t, 0.5, { type: 'triangle', vol: 0.05, slide: 1.8 }),
  floorClear: (t, { arp }) => {
    arp(t, [523, 659, 784, 1047], 0.09, { type: 'square', vol: 0.08 });
    arp(t + 0.4, [784, 1047, 1319, 1568, 2093], 0.07, { type: 'triangle', vol: 0.12 });
  },
  elevator: (t, { tone, noise }) => {
    tone(110, t, 2.6, { type: 'sawtooth', vol: 0.05, slide: 3.2 });
    tone(220, t + 0.2, 2.4, { type: 'sine', vol: 0.08, slide: 2.6 });
    noise(t, 2.6, { vol: 0.18, freq: 900, q: 0.4, type: 'bandpass' });
  },
  bossIntro: (t, { tone, noise }) => {
    tone(70, t, 1.4, { type: 'sawtooth', vol: 0.2, slide: 0.6 });
    noise(t, 1.2, { vol: 0.4, freq: 300 });
  },
});

// ---------- 畫面 ----------
const CSS = `
#tower-hud { position: fixed; left: 50%; top: calc(10px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); z-index: 8; pointer-events: none; text-align: center;
  padding: 6px 18px 8px; border-radius: 18px; color: #fff; background: linear-gradient(180deg, rgba(52, 16, 74, 0.92), rgba(20, 6, 32, 0.92)); border: 3px solid #b388ff; box-shadow: 0 0 18px rgba(179, 136, 255, 0.55); min-width: 230px; }
#tower-hud .t1 { font-size: 12px; font-weight: 800; color: #e1bee7; letter-spacing: 1px; }
#tower-hud .t2 { font-size: 30px; font-weight: 900; line-height: 1.05; color: #fff; -webkit-text-stroke: 2px #2a0a3a; paint-order: stroke fill; text-shadow: 0 0 12px #d500f9; }
#tower-hud .t3 { font-size: 14px; font-weight: 800; color: #fff3e0; }
#tower-hud .t4 { font-size: 12px; font-weight: 700; color: #ce93d8; }
#tower-bag { position: fixed; left: 50%; transform: translateX(-50%); top: calc(118px + env(safe-area-inset-top, 0px)); z-index: 7; pointer-events: none; max-width: min(92vw, 640px);
  padding: 3px 12px; border-radius: 999px; background: rgba(20, 8, 30, 0.78); border: 2px solid #7e57c2; color: #f3e5f5; font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#tower-boss { position: fixed; left: 50%; top: calc(146px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); z-index: 8; pointer-events: none; width: min(560px, 88vw); text-align: center; color: #fff;
  padding: 5px 14px 8px; border-radius: 14px; background: linear-gradient(180deg, rgba(60, 10, 40, 0.92), rgba(24, 4, 18, 0.92)); border: 3px solid #ff4081; box-shadow: 0 0 18px rgba(255, 64, 129, 0.5); }
#tower-boss b { font-size: 16px; color: #ff80ab; letter-spacing: 1px; }
#tower-boss .hpbar { position: relative; height: 18px; margin-top: 4px; background: #1a0610; border: 2px solid #ff80ab; border-radius: 9px; overflow: hidden; }
#tower-boss .hpbar i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #c51162, #ff4081 60%, #ff80ab); transition: width 0.12s; }
#tower-boss .hpbar span { position: absolute; inset: 0; font-size: 12px; font-weight: 900; line-height: 14px; -webkit-text-stroke: 3px #1a0610; paint-order: stroke fill; }
#tower-hearts { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(190px + env(safe-area-inset-bottom, 0px)); z-index: 6; pointer-events: none; display: flex; gap: 4px; padding: 4px 12px; border-radius: 999px; background: linear-gradient(180deg, rgba(42, 22, 64, 0.85), rgba(22, 11, 36, 0.85)); border: 3px solid #ff5252; }
#tower-hearts .h { font-size: 24px; line-height: 1; filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.5)); transition: transform 0.15s; }
#tower-hearts .h.empty { opacity: 0.45; }
#tower-hearts .h.filling { opacity: calc(0.35 + var(--regen, 0) * 0.65); transform: scale(calc(0.75 + var(--regen, 0) * 0.25)); }
#tower-hearts .h.lost { animation: hw-heart-lost 0.5s ease-out; }
#tower-hurt { position: fixed; inset: 0; z-index: 5; pointer-events: none; opacity: 0; background: radial-gradient(ellipse at center, rgba(255, 0, 0, 0) 45%, rgba(213, 0, 249, 0.45) 80%, rgba(120, 0, 60, 0.85) 100%); }
#tower-hurt.on { animation: hw-hurt 0.8s ease-out; }
#tower-big { position: fixed; left: 50%; top: 32%; transform: translate(-50%, -50%); z-index: 20; pointer-events: none; text-align: center; font-weight: 900; color: #fff; width: 94vw; }
#tower-big b { display: block; font-size: clamp(40px, 8vw, 96px); -webkit-text-stroke: 3px #2a0a3a; paint-order: stroke fill; text-shadow: 0 0 24px var(--c, #d500f9), 0 6px 0 rgba(0,0,0,0.4); }
#tower-big span { display: block; font-size: clamp(16px, 2.6vw, 26px); color: #f3e5f5; -webkit-text-stroke: 1.5px #2a0a3a; paint-order: stroke fill; }
#tower-big.on { animation: tower-big 2.4s ease-out forwards; }
@keyframes tower-big { 0% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); } 12% { opacity: 1; transform: translate(-50%, -50%) scale(0.95); } 20% { transform: translate(-50%, -50%) scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -60%) scale(1); } }
#tower-reward { position: fixed; right: calc(14px + env(safe-area-inset-right, 0px)); top: 30%; z-index: 21; pointer-events: none; width: min(330px, 86vw); color: #fff;
  padding: 12px 16px; border-radius: 18px; background: linear-gradient(160deg, rgba(74, 20, 140, 0.95), rgba(26, 6, 40, 0.95)); border: 3px solid #ffd740; box-shadow: 0 0 26px rgba(255, 215, 64, 0.45); }
#tower-reward.on { animation: tower-slide 0.5s cubic-bezier(.2,1.4,.4,1); }
@keyframes tower-slide { 0% { transform: translateX(120%); } 100% { transform: translateX(0); } }
#tower-reward h4 { margin: 0 0 6px; font-size: 18px; color: #ffd740; text-align: center; }
#tower-reward .ms { margin-top: 8px; padding-top: 6px; border-top: 2px dashed rgba(255, 215, 64, 0.5); }
#tower-reward .ms h5 { margin: 0 0 4px; color: #ffab40; font-size: 15px; text-align: center; }
#tower-reward ul { margin: 0; padding: 0; list-style: none; }
#tower-reward li { font-size: 15px; font-weight: 800; padding: 3px 8px; margin: 3px 0; border-radius: 10px; background: rgba(255, 255, 255, 0.08); }
#tower-reward li.rare { background: linear-gradient(90deg, rgba(255, 196, 0, 0.35), rgba(255, 64, 129, 0.25)); box-shadow: 0 0 10px rgba(255, 215, 64, 0.6); color: #fff8e1; }
#tower-reward .hint { font-size: 12px; color: #e1bee7; text-align: center; margin-top: 6px; }
#tower-lift { position: fixed; inset: 0; z-index: 9; pointer-events: none; opacity: 0; display: flex; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, var(--lc, rgba(213, 0, 249, 0.5)) 100%); }
#tower-lift b { font-size: clamp(30px, 6vw, 64px); font-weight: 900; color: #fff; -webkit-text-stroke: 3px #2a0a3a; paint-order: stroke fill; text-shadow: 0 0 20px #fff; }
#tower-ko { position: fixed; inset: 0; z-index: 60; pointer-events: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: radial-gradient(circle, #2a1040 0%, #0a0412 75%); color: #fff; text-align: center; font-weight: 800; }
#tower-ko.on { animation: hw-ko 2.2s ease-in-out forwards; }
#tower-ko b { font-size: 44px; color: #ea80fc; -webkit-text-stroke: 2px #2a0a3a; paint-order: stroke fill; }
#tower-ko span { font-size: 18px; color: #e1bee7; }
#tower-ko .ko-stars { font-size: 64px; animation: hw-ko-spin 1s linear infinite; }
body:has(#tower-hud:not([hidden])) #event-banner, body:has(#tower-hud:not([hidden])) #reaper-pill { display: none; }
body.in-movie #tower-hud, body.in-movie #tower-hearts, body.in-movie #tower-bag, body.in-movie #tower-boss { visibility: hidden; }
body.mobile #tower-hud { top: calc(44px + env(safe-area-inset-top, 0px)); padding: 2px 10px 3px; min-width: 0; border-width: 2px; } body.mobile #tower-hud .t2 { font-size: 18px; } body.mobile #tower-hud .t1, body.mobile #tower-hud .t4 { font-size: 9px; } body.mobile #tower-hud .t3 { font-size: 10px; }
body.mobile #tower-hearts { bottom: auto; top: calc(112px + env(safe-area-inset-top, 0px)); padding: 1px 8px; border-width: 2px; } body.mobile #tower-hearts .h { font-size: 15px; }
body.mobile #tower-bag { top: calc(138px + env(safe-area-inset-top, 0px)); font-size: 10px; padding: 1px 8px; max-width: 56vw; }
body.mobile #tower-boss { top: calc(160px + env(safe-area-inset-top, 0px)); width: min(380px, 56vw); padding: 2px 8px 4px; border-width: 2px; } body.mobile #tower-boss b { font-size: 11px; } body.mobile #tower-boss .hpbar { height: 12px; } body.mobile #tower-boss .hpbar span { font-size: 9px; line-height: 9px; }
body.mobile #tower-reward { top: calc(96px + env(safe-area-inset-top, 0px)); left: calc(8px + env(safe-area-inset-left, 0px)); right: auto; width: min(300px, 40vw); padding: 6px 10px; }
body.mobile #tower-reward h4 { font-size: 13px; } body.mobile #tower-reward li { font-size: 11px; padding: 2px 6px; } body.mobile #tower-reward .ms h5 { font-size: 12px; } body.mobile #tower-reward .hint { display: none; }
body.mobile #tower-big b { font-size: 42px; } body.mobile #tower-big span { font-size: 15px; }
/* 面板：揀難度 + 結果卡 */
.tower-panel { text-align: center; }
.tower-panel .tp-intro { margin: 0 0 10px; color: #4a2a5e; font-weight: 700; }
.tower-modes { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
.tower-mode { border-radius: 16px; padding: 12px; background: linear-gradient(170deg, #3a1450, #1c0828); color: #fff; border: 3px solid var(--mc); box-shadow: 0 0 12px color-mix(in srgb, var(--mc) 50%, transparent); }
.tower-mode .em { font-size: 34px; }
.tower-mode h3 { margin: 2px 0; font-size: 22px; color: var(--mc); }
.tower-mode p { margin: 4px 0; font-size: 13px; color: #e1bee7; min-height: 34px; }
.tower-mode .best { font-weight: 900; color: #ffd740; margin: 6px 0; }
.tower-mode button { width: 100%; font-size: 16px; }
.tower-panel .tp-note { font-size: 13px; color: #5e3a72; margin-top: 10px; }
.tower-res .big { font-size: 60px; }
.tower-res h2 { margin: 2px 0 2px; }
.tower-res .mode { font-weight: 900; }
.tower-res .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 12px 0; }
.tower-res .grid div { border-radius: 14px; padding: 8px; background: linear-gradient(170deg, #3a1450, #1c0828); color: #fff; }
.tower-res .grid b { display: block; font-size: 28px; color: #ffd740; }
.tower-res .grid span { font-size: 13px; color: #e1bee7; font-weight: 700; }
.tower-res .grid .newbest { box-shadow: 0 0 14px #ffd740; border: 2px solid #ffd740; }
.tower-res ul { list-style: none; padding: 0; margin: 6px 0; text-align: left; max-height: 220px; overflow: auto; }
.tower-res li { padding: 4px 10px; margin: 3px 0; border-radius: 10px; background: rgba(90, 40, 120, 0.12); font-weight: 700; }
.tower-res li.rare { background: linear-gradient(90deg, rgba(255, 196, 0, 0.35), rgba(255, 64, 129, 0.2)); }
.tower-res .kept { color: #8e244a; font-weight: 800; }
.tower-res .btns { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 10px; }
`;
function buildUi() {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const mk = (id, html = '', shown = false) => {
    const el = document.createElement('div');
    el.id = id;
    el.innerHTML = html;
    el.hidden = !shown;
    document.body.appendChild(el);
    return el;
  };
  return {
    hud: mk('tower-hud', '<div class="t1"></div><div class="t2"></div><div class="t3"></div><div class="t4"></div>'),
    bag: mk('tower-bag'),
    boss: mk('tower-boss', '<b></b><div class="hpbar"><i></i><span></span></div>'),
    hearts: mk('tower-hearts'),
    hurt: mk('tower-hurt', '', true),
    big: mk('tower-big', '<b></b><span></span>'),
    reward: mk('tower-reward'),
    lift: mk('tower-lift', '<b></b>', true),
    ko: mk('tower-ko', '<div class="ko-stars">💫</div><b>Knocked out!</b><span>The tower spits you out...</span>'),
  };
}

// ---------- 貼圖 ----------
function floorTex() {
  return canvasTex(256, (g, s) => {
    const r = seeded(77);
    g.fillStyle = '#1d1726';
    g.fillRect(0, 0, s, s);
    // 一塊塊石板（唔齊）
    for (let y = 0; y < s; y += 32) {
      const off = (y / 32) % 2 ? 24 : 0;
      for (let x = -48; x < s; x += 48) {
        const k = 0.8 + r() * 0.35;
        g.fillStyle = `rgb(${Math.round(78 * k)},${Math.round(70 * k)},${Math.round(92 * k)})`;
        g.fillRect(x + off + 2, y + 2, 44, 28);
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(x + off + 2, y + 2, 44, 3);
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.fillRect(x + off + 2, y + 27, 44, 3);
        if (r() < 0.25) { // 裂紋
          g.strokeStyle = 'rgba(10,6,16,0.7)';
          g.lineWidth = 1.5;
          g.beginPath();
          let cx = x + off + 6 + r() * 30;
          let cy = y + 6;
          g.moveTo(cx, cy);
          for (let i = 0; i < 4; i++) g.lineTo((cx += (r() - 0.5) * 12), (cy += 5));
          g.stroke();
        }
        if (r() < 0.18) { // 青苔
          g.fillStyle = 'rgba(90,140,80,0.45)';
          g.fillRect(x + off + 2 + r() * 30, y + 22, 10, 6);
        }
      }
    }
  }, { nearest: false });
}
function wallTex() {
  return canvasTex(256, (g, s) => {
    const r = seeded(31);
    g.fillStyle = '#120c18';
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 22) {
      const off = (y / 22) % 2 ? 26 : 0;
      for (let x = -52; x < s; x += 52) {
        const k = 0.75 + r() * 0.4;
        g.fillStyle = `rgb(${Math.round(64 * k)},${Math.round(52 * k)},${Math.round(80 * k)})`;
        g.fillRect(x + off + 2, y + 2, 48, 18);
        g.fillStyle = 'rgba(255,255,255,0.05)';
        g.fillRect(x + off + 2, y + 2, 48, 3);
        if (r() < 0.12) {
          g.fillStyle = 'rgba(80,130,70,0.45)';
          g.fillRect(x + off + 6 + r() * 30, y + 14, 12, 5);
        }
      }
    }
  }, { nearest: false });
}
// 牆上嘅窗（月光）：黑色底 = 唔發光；單獨一張發光貼圖
function windowTex() {
  return canvasTex(256, (g, s) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, s, s);
    const w = 40;
    const x = s / 2 - w / 2;
    g.fillStyle = '#6f86ff';
    g.fillRect(x, 70, w, 120);
    g.beginPath();
    g.arc(s / 2, 70, w / 2, PI, 0);
    g.fill();
    g.fillStyle = '#000';
    g.fillRect(s / 2 - 2, 50, 4, 140);
    g.fillRect(x, 120, w, 4);
  }, { nearest: false });
}
// 魔法陣（白色線，用材質上色）
function circleTex(kind = 'lift') {
  return canvasTex(512, (g, s) => {
    const c = s / 2;
    g.clearRect(0, 0, s, s);
    g.strokeStyle = '#fff';
    g.fillStyle = '#fff';
    g.lineWidth = 10;
    g.beginPath();
    g.arc(c, c, c - 12, 0, PI * 2);
    g.stroke();
    g.lineWidth = 4;
    g.beginPath();
    g.arc(c, c, c - 36, 0, PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(c, c, c * 0.55, 0, PI * 2);
    g.stroke();
    // 一圈符文（自己畫嘅細線）
    const r = seeded(kind === 'lift' ? 5 : 9);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * PI * 2;
      g.save();
      g.translate(c + Math.cos(a) * (c - 24), c + Math.sin(a) * (c - 24));
      g.rotate(a + PI / 2);
      g.lineWidth = 3;
      g.beginPath();
      for (let k = 0; k < 3; k++) {
        g.moveTo((r() - 0.5) * 14, (r() - 0.5) * 12);
        g.lineTo((r() - 0.5) * 14, (r() - 0.5) * 12);
      }
      g.stroke();
      g.restore();
    }
    // 8 角星（兩個正方形）
    g.lineWidth = 5;
    for (const rot of [0, PI / 4]) {
      g.beginPath();
      for (let i = 0; i <= 4; i++) {
        const a = rot + (i / 4) * PI * 2;
        const x = c + Math.cos(a) * (c - 40);
        const y = c + Math.sin(a) * (c - 40);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    // 中間：月亮 + 星星
    if (kind === 'lift') {
      g.beginPath();
      g.arc(c, c, c * 0.24, 0, PI * 2);
      g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      g.arc(c + c * 0.1, c - c * 0.05, c * 0.21, 0, PI * 2);
      g.fill();
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2 + 0.3;
        const x = c + Math.cos(a) * c * 0.4;
        const y = c + Math.sin(a) * c * 0.4;
        g.beginPath();
        for (let k = 0; k < 10; k++) {
          const rr = k % 2 ? 6 : 15;
          const aa = (k / 10) * PI * 2;
          g.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr);
        }
        g.fill();
      }
    } else {
      g.lineWidth = 6;
      g.beginPath();
      g.arc(c, c, c * 0.3, 0, PI * 2);
      g.stroke();
    }
  }, { nearest: false, wrap: false });
}
function floorSignTex(lines, color = '#ea80fc') {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 300;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.font = '900 150px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
  g.lineWidth = 18;
  g.strokeStyle = '#1a0628';
  g.strokeText(lines[0], 512, 120);
  g.fillStyle = color;
  g.fillText(lines[0], 512, 120);
  g.font = '800 60px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
  g.lineWidth = 10;
  g.strokeText(lines[1] || '', 512, 240);
  g.fillStyle = '#fff3e0';
  g.fillText(lines[1] || '', 512, 240);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 揀邊啲動物會俾人腐化：真實嘅陸上瀕危動物（唔要魚、唔要魔法寵物）
let corruptible = null;
function corruptibleAnimals() {
  if (corruptible) return corruptible;
  corruptible = ANIMALS.filter((a) => a.biome !== 1 && a.biome <= 6 && !a.magical && !a.halloween && /Endangered|Vulnerable|Threatened|Extinct/.test(a.status || ''));
  return corruptible;
}

export function createWitchTower(ctx) {
  const { scene, camera, player, weapons, play, popup, announce, isWalkable, showLoading, teleport, toCastle, togglePanel, flash } = ctx;
  const ui = buildUi();

  // ================= 塔入面（第一次入先起）=================
  let arena = null;
  function buildArena() {
    const g = new THREE.Group();
    g.position.set(A.x, 0, A.z);
    scene.add(g);
    const R = A.r;
    const H = A.wallH;
    const stat = new THREE.Group(); // 唔郁嘅嘢：焊埋（bakeStatic）
    // 地板
    const fTex = floorTex();
    fTex.repeat.set(9, 9);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 0.8, 72), new THREE.MeshStandardMaterial({ map: fTex, roughness: 0.92 }));
    floor.rotation.x = -PI / 2;
    floor.receiveShadow = true;
    g.add(floor);
    const edge = new THREE.Mesh(new THREE.RingGeometry(R - 1.6, R + 0.8, 72), new THREE.MeshStandardMaterial({ color: 0x241a30, roughness: 0.9 }));
    edge.rotation.x = -PI / 2;
    edge.position.y = 0.01;
    g.add(edge);
    // 牆（入面向住你）：磚 + 月光窗（窗貼圖分開，升降機時一齊向下飛）
    const wTex = wallTex();
    wTex.repeat.set(26, 7);
    const winTex = windowTex();
    winTex.repeat.set(9, 2);
    const wallM = new THREE.MeshStandardMaterial({ map: wTex, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 1.3, roughness: 0.9, side: THREE.BackSide });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.7, R + 0.7, H, 64, 1, true), wallM);
    wall.position.y = H / 2;
    g.add(wall);
    // 牆腳 + 牆頂石邊
    const trimM = new THREE.MeshStandardMaterial({ color: 0x2c2238, roughness: 0.85 });
    const trim = new THREE.Mesh(new THREE.TorusGeometry(R + 0.5, 0.45, 6, 64), trimM);
    trim.rotation.x = PI / 2;
    trim.position.y = 0.3;
    g.add(trim);
    const top = new THREE.Mesh(new THREE.TorusGeometry(R + 0.4, 0.6, 6, 64), trimM);
    top.rotation.x = PI / 2;
    top.position.y = H;
    g.add(top);

    // ---- 📖 書架（向住中間）----
    const woodM = new THREE.MeshStandardMaterial({ color: 0x3b2418, roughness: 0.85 });
    const bookCols = [0x8e24aa, 0x3949ab, 0x00897b, 0xc62828, 0xf9a825, 0x6d4c41, 0x2e7d32, 0xad1457].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
    const potionM = [0x76ff03, 0xff4081, 0x40c4ff, 0xffd740].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, roughness: 0.2 }));
    const rr = seeded(404);
    for (const s of TOWER_SHELVES) {
      const sh = new THREE.Group();
      const p = towerPolar(s.deg, R - 1.1);
      sh.position.set(p.x - A.x, 0, p.z - A.z);
      sh.rotation.y = -(s.deg * PI) / 180;
      stat.add(sh);
      bx(sh, 3.8, 4.6, 0.9, woodM, 0, 2.3, -0.1, 0.05);
      bx(sh, 4.1, 0.3, 1.1, woodM, 0, 4.7, 0, 0.1);
      for (let row = 0; row < 4; row++) {
        const y = 0.35 + row * 1.08;
        bx(sh, 3.6, 0.12, 0.85, woodM, 0, y, 0.05, 0.1);
        let x = -1.65;
        while (x < 1.55) {
          const w = 0.14 + rr() * 0.14;
          const h = 0.55 + rr() * 0.32;
          if (rr() < 0.12) { // 魔法藥水
            const m = potionM[Math.floor(rr() * potionM.length)];
            sph(sh, 0.16, 0.18, 0.16, m, x + 0.16, y + 0.24, 0.25, true);
            cyl(sh, 0.05, 0.16, m, x + 0.16, y + 0.46, 0.25);
            x += 0.4;
            continue;
          }
          const b = bx(sh, w, h, 0.6, bookCols[Math.floor(rr() * bookCols.length)], x + w / 2, y + 0.06 + h / 2, 0.15, 0.08);
          if (rr() < 0.15) b.rotation.z = 0.25;
          x += w + 0.02;
        }
      }
    }
    // ---- 🧪 大鍋（冒泡）----
    const potM = new THREE.MeshStandardMaterial({ color: 0x1c1a22, roughness: 0.4, metalness: 0.5 });
    const brewM = new THREE.MeshStandardMaterial({ color: 0x76ff03, emissive: 0x64dd17, emissiveIntensity: 1.8, roughness: 0.3 });
    const bubbleM = new THREE.MeshStandardMaterial({ color: 0xb2ff59, emissive: 0x76ff03, emissiveIntensity: 1.4, transparent: true, opacity: 0.85 });
    const cauldrons = [];
    const flames = [];
    for (const c of TOWER_CAULDRONS) {
      const cg = new THREE.Group();
      cg.position.set(c.x - A.x, 0, c.z - A.z);
      const pot = new THREE.Mesh(new THREE.SphereGeometry(1.25, 18, 12, 0, PI * 2, PI * 0.18, PI * 0.82), potM);
      pot.position.y = 1.25;
      pot.castShadow = true;
      cg.add(pot);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.14, 8, 24), potM);
      lip.rotation.x = PI / 2;
      lip.position.y = 2.32;
      cg.add(lip);
      const brew = new THREE.Mesh(new THREE.CircleGeometry(1.05, 24), brewM);
      brew.rotation.x = -PI / 2;
      brew.position.y = 2.15;
      cg.add(brew);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * PI * 2;
        cyl(cg, 0.1, 0.6, potM, Math.cos(a) * 0.9, 0.25, Math.sin(a) * 0.9);
      }
      // 柴 + 火
      for (let i = 0; i < 3; i++) {
        const log = cyl(cg, 0.12, 1.4, woodM, 0, 0.12, 0, PI / 2, 0);
        log.rotation.y = (i / 3) * PI;
      }
      flames.push(flame(cg, 0, 0.1, 0, 1.6, [0xb2ff59, 0x76ff03, 0x1b5e20]));
      const bubbles = [];
      for (let i = 0; i < 6; i++) {
        const b = sph(cg, 0.12, 0.12, 0.12, bubbleM, 0, 2.2, 0, true);
        b.userData = { t: Math.random() * 1.6, x: rand(-0.6, 0.6), z: rand(-0.6, 0.6) };
        bubbles.push(b);
      }
      const steam = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color: 0x76ff03, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
      steam.scale.set(3.4, 3.4, 1);
      steam.position.y = 3;
      cg.add(steam);
      g.add(cg);
      cauldrons.push({ g: cg, bubbles, steam, brew });
    }
    // ---- 🔥 紫色火把（喺牆上）----
    const fireMats = [0, 1, 2].map((i) => ADDM(THEMES[0].fire[i], 0.78 - i * 0.14));
    const torches = [];
    const ironM = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.6 });
    for (const deg of [15, 55, 95, 130, 165, 195, 230, 265, 305, 345]) {
      const p = towerPolar(deg, R - 0.25);
      const t = new THREE.Group();
      t.position.set(p.x - A.x, 3.4, p.z - A.z);
      t.rotation.y = -(deg * PI) / 180;
      bx(t, 0.24, 0.9, 0.24, ironM, 0, -0.3, 0.2, 0.2);
      cyl(t, 0.32, 0.3, ironM, 0, 0.18, 0.55, 0, 0, 0.2);
      const f = new THREE.Group();
      f.position.set(0, 0.3, 0.55);
      t.add(f);
      const layers = fireMats.map((m, i) => {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.16 + i * 0.1, 0.55 + i * 0.3, 7), m);
        c.position.y = 0.28 + i * 0.15;
        f.add(c);
        return c;
      });
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color: THEMES[0].light, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.setScalar(2.6);
      halo.position.y = 0.5;
      f.add(halo);
      g.add(t);
      torches.push({ f, layers, halo, seed: Math.random() * 10 });
    }
    // ---- 🕯️ 飄浮蠟燭 ----
    const waxM = new THREE.MeshStandardMaterial({ color: 0xfff3e0, roughness: 0.6, emissive: 0x332211, emissiveIntensity: 0.3 });
    const candleFlame = new THREE.SpriteMaterial({ map: towerGlowTex(), color: 0xffcc66, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const candles = [];
    const cr = seeded(88);
    for (let i = 0; i < 34; i++) {
      const a = cr() * PI * 2;
      const d = 4 + cr() * (R - 7);
      const c = new THREE.Group();
      c.position.set(Math.cos(a) * d, 4 + cr() * 5, Math.sin(a) * d);
      const h = 0.35 + cr() * 0.4;
      const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, h, 8), waxM);
      c.add(wax);
      const fl = new THREE.Sprite(candleFlame);
      fl.scale.set(0.4, 0.55, 1);
      fl.position.y = h / 2 + 0.16;
      c.add(fl);
      g.add(c);
      candles.push({ c, y: c.position.y, seed: cr() * 10, fl });
    }
    // ---- ✨ 中間嘅升降魔法陣 + 光柱 ----
    const liftMat = ADDM(THEMES[0].circle, 0.9);
    liftMat.map = circleTex('lift');
    const lift = new THREE.Mesh(new THREE.CircleGeometry(TOWER_LIFT.r, 48), liftMat);
    lift.rotation.x = -PI / 2;
    lift.position.y = 0.04;
    g.add(lift);
    const liftBase = new THREE.Mesh(new THREE.CylinderGeometry(TOWER_LIFT.r + 0.25, TOWER_LIFT.r + 0.4, 0.12, 40), new THREE.MeshStandardMaterial({ color: 0x2a1f36, roughness: 0.6, metalness: 0.3 }));
    liftBase.position.y = 0.0;
    g.add(liftBase);
    const beamMat = ADDM(THEMES[0].circle, 0);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(TOWER_LIFT.r * 0.95, TOWER_LIFT.r, 26, 32, 1, true), beamMat);
    beam.position.y = 13;
    g.add(beam);
    // 細魔法陣（地上四個）+ 8 個出怪魔法陣
    const smallTex = circleTex('small');
    const decoCircles = [];
    for (let i = 0; i < 4; i++) {
      const a = PI / 4 + (i * PI) / 2;
      const m = ADDM(0x7c4dff, 0.35);
      m.map = smallTex;
      const c = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), m);
      c.rotation.x = -PI / 2;
      c.position.set(Math.cos(a) * 10, 0.03, Math.sin(a) * 10);
      g.add(c);
      decoCircles.push(c);
    }
    const portals = [];
    for (let i = 0; i < 8; i++) {
      const a = PI / 8 + (i * PI) / 4;
      const m = ADDM(0x76ff03, 0);
      m.map = smallTex;
      const c = new THREE.Mesh(new THREE.CircleGeometry(1.8, 32), m);
      c.rotation.x = -PI / 2;
      c.position.set(Math.cos(a) * 16.5, 0.05, Math.sin(a) * 16.5);
      g.add(c);
      portals.push({ mesh: c, glow: 0, x: A.x + c.position.x, z: A.z + c.position.z });
    }
    // ---- 天上：大符文圈 + 飛天掃把 ----
    const runeMat = ADDM(0xb388ff, 0.5);
    runeMat.map = circleTex('small');
    const sky = new THREE.Mesh(new THREE.CircleGeometry(9, 48), runeMat);
    sky.rotation.x = PI / 2;
    sky.position.y = H - 3;
    g.add(sky);
    const broom = new THREE.Group();
    const stickM = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7 });
    const strawM = new THREE.MeshStandardMaterial({ color: 0xffca28, roughness: 0.8 });
    cyl(broom, 0.07, 2.4, stickM, 0, 0, 0, 0, PI / 2);
    cone(broom, 0.35, 0.9, strawM, -1.5, 0, 0, 0, PI / 2, 8);
    g.add(broom);
    // ---- 🚪 出口（南牆）----
    const door = new THREE.Group();
    door.position.set(0, 0, R + 0.35);
    g.add(door);
    const doorM = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.8, emissive: 0x2a0a3a, emissiveIntensity: 0.4 });
    bx(door, 3.2, 4.4, 0.4, doorM, 0, 2.2, 0, 0.05);
    const arch = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16, 0, PI), doorM);
    arch.position.set(0, 4.4, -0.21);
    arch.rotation.y = PI;
    door.add(arch);
    for (const sx of [-1, 1]) bx(door, 0.5, 6.4, 0.6, trimM, sx * 1.85, 3.2, -0.1, 0.1);
    bx(door, 0.3, 0.3, 0.12, new THREE.MeshStandardMaterial({ color: 0xffd740, metalness: 0.8, roughness: 0.3 }), 0.9, 2.2, -0.25, 0.3);
    const exitGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 6), ADDM(0xb388ff, 0.4));
    exitGlow.position.set(0, 3, -0.3);
    exitGlow.material.map = towerGlowTex();
    door.add(exitGlow);
    const exitLabel = makeLabel([{ text: '🚪 EXIT', color: '#ea80fc' }, { text: 'Leave the tower', color: '#ffffff' }], 1.1);
    exitLabel.position.set(0, 6.8, -0.6);
    door.add(exitLabel);
    // ---- 層數牌（北牆上面）----
    const signTex = floorSignTex(['FLOOR 1', '🟡 Medium']);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.8), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
    sign.position.set(0, 10.5, -R + 0.6);
    g.add(sign);
    // ---- 燈（入咗塔先著）----
    const lights = [];
    const center = new THREE.PointLight(THEMES[0].light, 30, 40, 1.4);
    center.position.set(0, 9, 0);
    g.add(center);
    lights.push(center);
    for (const c of TOWER_CAULDRONS) {
      const l = new THREE.PointLight(0x76ff03, 10, 14, 1.6);
      l.position.set(c.x - A.x, 3, c.z - A.z);
      g.add(l);
    }
    const doorLight = new THREE.PointLight(0xb388ff, 8, 14, 1.6);
    doorLight.position.set(0, 4, R - 2);
    g.add(doorLight);
    bakeStatic(stat, g); // 書架：焊埋（快好多）
    g.visible = false;
    return { g, wall, wallM, wTex, winTex, lift, liftMat, beam, beamMat, decoCircles, portals, torches, fireMats, candles, cauldrons, flames, sky, broom, sign, signTex, center, exitGlow, theme: 0 };
  }
  function applyTheme(i) {
    if (!arena) return;
    const th = THEMES[i % THEMES.length];
    arena.theme = i % THEMES.length;
    arena.fireMats.forEach((m, k) => m.color.setHex(th.fire[k]));
    for (const t of arena.torches) t.halo.material.color.setHex(th.light);
    arena.liftMat.color.setHex(th.circle);
    arena.beamMat.color.setHex(th.circle);
    arena.center.color.setHex(th.light);
  }
  function drawSign() {
    if (!arena) return;
    const m = TOWER_MODES[R.mode];
    arena.signTex.dispose();
    arena.signTex = floorSignTex([`FLOOR ${R.floor}`, `${m.emoji} ${m.name}${isBossFloor(R.floor) ? ' · 👑 MINI-BOSS' : ''}`], ['#ea80fc', '#b2ff59', '#80d8ff', '#ffd180', '#ff80ab'][arena.theme]);
    arena.sign.material.map = arena.signTex;
    arena.sign.material.needsUpdate = true;
  }

  // ================= 遊戲狀態 =================
  const R = {
    inside: false, phase: 'idle', mode: 'medium', floor: 1, t: 0,
    hearts: TOWER_HEARTS, safeT: 0, regenT: 0, ko: -1, knock: V(),
    queue: [], spawnT: 0, liftHold: 0, god: false, calm: false,
    run: null, panel: 'modes', results: null, travelling: false, bossCount: 0,
  };
  const enemies = [];
  const shots = []; // 🟢 Slime 彈
  const waves = []; // 💥 震波
  const fx = []; // 粒子
  const tmp = V();
  const playerPos = () => V(camera.position.x, player.feetY, camera.position.z);
  const modeInfo = () => TOWER_MODES[R.mode] || TOWER_MODES.medium;
  const isBossFloor = (n) => n % TOWER_BOSS_EVERY === 0;
  const hpMul = (n) => (1 + TOWER_HP_GROWTH * (n - 1)) * modeInfo().hp;
  const speedMul = (n) => Math.min(TOWER_MAX_SPEED_MULT, 1 + TOWER_SPEED_GROWTH * (n - 1)) * modeInfo().speed;
  const doubleFloor = () => (modeInfo().damage < 0.8 ? Infinity : Math.round(TOWER_DOUBLE_DAMAGE_FLOOR / modeInfo().damage));
  const hitHearts = () => (R.floor >= doubleFloor() ? 2 : 1);
  const enemyCount = (n) => Math.min(TOWER_MAX_ENEMIES, Math.round(TOWER_BASE_ENEMIES + n * TOWER_ENEMIES_PER_FLOOR));
  const animalShare = (n) => (n < TOWER_ENEMIES.animal.from ? 0 : Math.min(TOWER_ANIMAL_SHARE_MAX, TOWER_ANIMAL_SHARE + n * TOWER_ANIMAL_SHARE_GROWTH));
  const bestOf = (mode) => state.towerBestByMode?.[mode] || 0;

  // ---- 🎒 袋 ----
  function bagAdd(r) {
    if (!R.run || !r) return;
    R.run.bag.set(r.type, (R.run.bag.get(r.type) || 0) + r.amount);
  }
  const lookOf = (type) => TOWER_REWARD_LOOK[type] || ['🎁', type];
  const rewardText = (r) => {
    const [em, name] = lookOf(r.type);
    if (r.type === 'money') return `${em} $${short(r.amount)}`;
    return `${em} ${['demonicSkin', 'demonicBossSkin'].includes(r.type) ? '' : `${short(r.amount)} `}${name}`;
  };
  function bagText() {
    if (!R.run || !R.run.bag.size) return '🎒 Bag: empty — beat a floor to fill it!';
    return `🎒 Bag: ${[...R.run.bag].map(([type, amount]) => rewardText({ type, amount })).join(' · ')}`;
  }

  // ================= 心 =================
  let heartsHtml = '';
  let lostAt = -1;
  let lostT = 0;
  function drawHearts() {
    let html = '';
    for (let i = 0; i < TOWER_HEARTS; i++) {
      const full = i < R.hearts;
      const filling = i === R.hearts && R.hearts < TOWER_HEARTS;
      html += `<span class="h ${full ? 'full' : 'empty'}${lostT > 0 && i >= lostAt && i < lostAt + 2 ? ' lost' : ''}${filling ? ' filling' : ''}">${full ? '❤️' : '🖤'}</span>`;
    }
    if (html !== heartsHtml) ui.hearts.innerHTML = heartsHtml = html;
  }
  function hitPlayer(what, push = null) {
    if (R.safeT > 0 || R.ko >= 0 || R.god || !['fight', 'intro'].includes(R.phase)) return false;
    const n = hitHearts();
    R.hearts = Math.max(0, R.hearts - n);
    R.safeT = TOWER_HIT_SAFE;
    R.regenT = 0;
    lostAt = R.hearts;
    lostT = 0.5;
    ui.hurt.classList.remove('on');
    void ui.hurt.offsetWidth;
    ui.hurt.classList.add('on');
    shake = Math.max(shake, 0.4);
    if (push) {
      R.knock.set(push.x, 0, push.z);
      player.vy = push.y ?? 5;
      player.grounded = false;
    }
    if (R.hearts > 0) {
      play('heartLost');
      popup(`💥 ${what}! ${n > 1 ? `-${n} ❤️ · ` : ''}${R.hearts} ❤️ left`);
    } else {
      R.ko = 0;
      R.phase = 'ko';
      ui.ko.hidden = false;
      ui.ko.classList.remove('on');
      void ui.ko.offsetWidth;
      ui.ko.classList.add('on');
      play('knockedOut');
    }
    return true;
  }

  // ================= 粒子 =================
  const candyGeos = [new THREE.BoxGeometry(0.16, 0.16, 0.16), new THREE.SphereGeometry(0.1, 8, 6), new THREE.OctahedronGeometry(0.13)];
  function particle(obj, { vel = V(), life = 1, grav = 9, spin = 0, shrink = true, fade = null } = {}) {
    arena.g.add(obj);
    fx.push({ obj, vel, life, max: life, grav, spin, shrink, fade, s0: obj.scale.x });
  }
  function candyBurst(p, n = 26, size = 1) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(candyGeos[i % 3], CANDY[i % CANDY.length]);
      m.position.set(p.x - A.x, p.y, p.z - A.z);
      m.scale.setScalar(size * rand(0.8, 1.5));
      const a = Math.random() * PI * 2;
      const sp = rand(2.5, 6.5) * size;
      particle(m, { vel: V(Math.cos(a) * sp, rand(3, 8) * Math.sqrt(size), Math.sin(a) * sp), life: rand(0.8, 1.4), grav: 12, spin: rand(4, 12) });
    }
    // 白色一嚿煙
    const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    puff.position.set(p.x - A.x, p.y, p.z - A.z);
    puff.scale.setScalar(1.5 * size);
    particle(puff, { vel: V(0, 0.6, 0), life: 0.5, grav: 0, shrink: false, fade: (o, k) => { o.scale.setScalar((1.5 + (1 - k) * 3.5) * size); o.material.opacity = k * 0.9; } });
  }
  function sparkle(p, color, n = 10, sp = 3, life = 0.8, size = 0.6) {
    const mat = new THREE.SpriteMaterial({ map: towerGlowTex(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(mat);
      s.position.set(p.x - A.x + rand(-0.3, 0.3), p.y + rand(-0.3, 0.3), p.z - A.z + rand(-0.3, 0.3));
      s.scale.setScalar(size * rand(0.6, 1.3));
      const a = Math.random() * PI * 2;
      particle(s, { vel: V(Math.cos(a) * sp * rand(0.3, 1), rand(0.5, 2.5) * sp * 0.6, Math.sin(a) * sp * rand(0.3, 1)), life: life * rand(0.7, 1.3), grav: 1.5 });
    }
  }
  function floatText(p, lines, scale = 1, life = 1.6) {
    const l = makeLabel(lines, scale);
    l.position.set(p.x - A.x, p.y, p.z - A.z);
    l.material.transparent = true;
    particle(l, { vel: V(0, 1.4, 0), life, grav: 0, shrink: false, fade: (o, k) => (o.material.opacity = Math.min(1, k * 2.5)) });
  }
  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.life -= dt;
      if (f.life <= 0) {
        f.obj.removeFromParent();
        if (f.obj.isSprite && f.fade) f.obj.material.dispose();
        fx.splice(i, 1);
        continue;
      }
      f.vel.y -= f.grav * dt;
      f.obj.position.addScaledVector(f.vel, dt);
      if (f.obj.position.y < 0.08 && f.grav > 2) {
        f.obj.position.y = 0.08;
        f.vel.y *= -0.35;
        f.vel.x *= 0.7;
        f.vel.z *= 0.7;
      }
      if (f.spin) {
        f.obj.rotation.x += f.spin * dt;
        f.obj.rotation.y += f.spin * 0.7 * dt;
      }
      const k = f.life / f.max;
      if (f.fade) f.fade(f.obj, k);
      else if (f.shrink) f.obj.scale.setScalar(f.s0 * Math.min(1, k * 2.2));
    }
  }

  // ================= 敵人 =================
  // HP 條（兩個 sprite：底 + 前；前面嗰個用 center 由左邊開始縮）
  const barBgM = new THREE.SpriteMaterial({ color: 0x1a0610, depthTest: false, transparent: true, opacity: 0.85 });
  function hpBar(w) {
    const g = new THREE.Group();
    const bg = new THREE.Sprite(barBgM);
    bg.scale.set(w + 0.08, 0.2, 1);
    bg.renderOrder = 11;
    g.add(bg);
    const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x76ff03, depthTest: false }));
    fg.scale.set(w, 0.13, 1);
    fg.renderOrder = 12;
    g.add(fg);
    return {
      g,
      set(k, color) {
        k = Math.max(0.001, Math.min(1, k));
        fg.scale.x = w * k;
        fg.center.set(0.5 / k, 0.5);
        if (color) fg.material.color.setHex(color);
      },
      dispose() {
        fg.material.dispose();
      },
    };
  }
  function pickSpawn(far = 9) {
    const p = playerPos();
    const list = arena.portals.filter((q) => Math.hypot(q.x - p.x, q.z - p.z) > far);
    return (list.length ? list : arena.portals)[Math.floor(Math.random() * (list.length || arena.portals.length))];
  }
  function zombieKindFor(n) {
    const w = Object.entries({ walker: 5, runner: 3, spitter: 2, brute: 1.5 }).filter(([k]) => n >= TOWER_ENEMIES[k].from);
    const total = w.reduce((s, [, x]) => s + x, 0);
    let r = Math.random() * total;
    return (w.find(([, x]) => (r -= x) < 0) || w[0])[0];
  }
  let seedN = 1;
  function spawnEnemy(kind, { boss = false, at = null, giant = false, name = null } = {}) {
    const portal = at || pickSpawn();
    const n = R.floor;
    const isAnimal = kind === 'animal';
    const g = new THREE.Group();
    g.position.set(portal.x + rand(-0.5, 0.5), -2.2, portal.z + rand(-0.5, 0.5));
    let model = null;
    let corr = null;
    let animal = null;
    let size = null;
    if (isAnimal) {
      const list = corruptibleAnimals();
      for (let tries = 0; tries < 10; tries++) {
        animal = (name && list.find((a) => a.name === name)) || list[Math.floor(Math.random() * list.length)];
        model = buildAnimalModel(animal);
        if (model.userData.move !== 'swim') break;
      }
      if (model.userData.move === 'fly') model.userData.flying = false;
      const s0 = new THREE.Box3().setFromObject(model).getSize(V());
      const want = giant ? 6.5 : 2.3;
      model.scale.multiplyScalar(Math.min(giant ? 8 : 2.4, want / Math.max(s0.x, s0.y, s0.z)));
      g.add(model);
      corr = corrupt(model);
      g.add(corr.aura);
      size = new THREE.Box3().setFromObject(model).getSize(V());
    } else {
      model = buildZombie(kind, { seed: seedN++ });
      g.add(model);
      size = V(0.9, model.userData.height, 0.6).multiplyScalar(1);
    }
    arena.g.add(g);
    g.position.x -= A.x;
    g.position.z -= A.z;
    const def = boss ? null : TOWER_ENEMIES[isAnimal ? 'animal' : kind];
    let hp = def ? def.hp * hpMul(n) : (giant ? TOWER_BOSS_HP.giant : TOWER_BOSS_HP.king) * (1 + TOWER_BOSS_GROWTH * R.bossCount) * modeInfo().hp;
    hp = Math.round(hp);
    const baseSpeed = boss ? (giant ? 3.2 : 1.9) : def.speed;
    const e = {
      kind: boss ? (giant ? 'giant' : 'king') : kind, isAnimal, boss, giant, g, model, corr, animal, size,
      hp, maxHp: hp, speed: baseSpeed * speedMul(n) * (0.9 + Math.random() * 0.2),
      state: 'rise', t: 0, cd: rand(0.8, 1.6), atk: 0, dir: V(0, 0, -1), flashT: 0, bar: null, label: null, specialT: boss ? 4 : 0, summonT: boss ? 8 : 0, groanT: rand(2, 6),
      reach: (boss ? 2.6 : kind === 'brute' ? 1.9 : 1.35) + (isAnimal ? Math.max(size.x, size.z) * 0.35 : 0),
      radius: isAnimal ? Math.max(0.6, Math.max(size.x, size.z) * 0.38) : (boss ? 1.4 : kind === 'brute' ? 0.85 : 0.55),
    };
    if (!boss) {
      e.bar = hpBar(isAnimal ? 1.3 : kind === 'brute' ? 1.5 : 1.1);
      e.bar.g.position.y = (isAnimal ? size.y : model.userData.height) + 0.45;
      g.add(e.bar.g);
      e.bar.set(1, isAnimal ? 0xea80fc : 0x76ff03);
    } else {
      e.label = makeLabel([{ text: giant ? `😵 GIANT Corrupted ${animal.name}` : '👑 ZOMBIE KING', color: giant ? '#ea80fc' : '#ffd740' }, { text: '', color: '#fff' }], 1.6);
      e.label.position.y = (isAnimal ? size.y : model.userData.height) + 1.2;
      g.add(e.label);
    }
    if (isAnimal && !boss) {
      e.label = makeLabel([{ text: `😵 Corrupted ${animal.name}`, color: '#ea80fc' }, { text: '', color: '#fff' }], 0.75);
      e.label.position.y = size.y + 0.95;
      g.add(e.label);
    }
    // 🎯 武器目標
    e.target = weapons.registerTarget({
      getPos: () => tmp.set(A.x + g.position.x, g.position.y + size.y * 0.5, A.z + g.position.z),
      radius: Math.max(size.x, size.y, size.z) * 0.5,
      parts: () => {
        const wx = A.x + g.position.x;
        const wz = A.z + g.position.z;
        if (!isAnimal) return model.userData.parts().map((p) => ({ pos: V(wx, g.position.y + p.y, wz), radius: p.radius, mult: p.mult, crit: p.crit }));
        const fwd = e.dir;
        return [
          { pos: V(wx, g.position.y + size.y * 0.45, wz), radius: Math.max(size.x, size.y, size.z) * 0.45, mult: 1 },
          { pos: V(wx + fwd.x * size.z * 0.38, g.position.y + size.y * 0.72, wz + fwd.z * size.z * 0.38), radius: Math.min(size.x, size.y) * 0.32 + 0.15, mult: 1.5, crit: true },
        ];
      },
      alive: () => e.hp > 0 && e.state !== 'gone',
      onHit(dmg) {
        if (e.hp <= 0) return false;
        e.hp -= dmg;
        e.flashT = 0.14;
        if (e.hp <= 0) {
          e.hp = 0;
          if (isAnimal) cure(e);
          else poof(e);
        }
        return dmg;
      },
    });
    portal.glow = 1.2;
    play('portalRise');
    enemies.push(e);
    return e;
  }
  function removeEnemy(e) {
    e.target?.remove();
    e.g.removeFromParent();
    if (e.corr) e.corr.dispose();
    else e.model.userData.dispose?.();
    e.warnM?.removeFromParent();
    e.slamWarn?.removeFromParent();
    e.bar?.dispose();
    if (e.label) e.label.material.map?.dispose();
    const i = enemies.indexOf(e);
    if (i >= 0) enemies.splice(i, 1);
  }
  function clearEnemies() {
    for (const e of [...enemies]) removeEnemy(e);
    for (const s of shots) {
      s.g.removeFromParent();
      s.warn.removeFromParent();
    }
    shots.length = 0;
    for (const w of waves) w.m.removeFromParent();
    waves.length = 0;
    R.queue.length = 0;
  }

  // 🧟 打散：變糖果閃粉
  function poof(e) {
    e.state = 'poof';
    e.t = 0;
    e.target.remove();
    play('candyPoof');
    R.run.zombies += 1;
    bagAdd(rollAmount(TOWER_PER_ZOMBIE, R.floor, R.mode));
    if (e.boss) {
      R.run.bosses += 1;
      bagAdd(rollAmount(TOWER_PER_BOSS, R.floor, R.mode));
    }
  }
  // 💚 救返：腐化爆走 → 變返正常 → 開心咁跑走
  function cure(e) {
    e.state = 'cured';
    e.t = 0;
    e.target.remove();
    play('animalCured');
    R.run.cured += 1;
    bagAdd(rollAmount(TOWER_PER_CURE, R.floor, R.mode));
    if (e.boss) {
      R.run.bosses += 1;
      bagAdd(rollAmount(TOWER_PER_BOSS, R.floor, R.mode));
    }
    const p = V(A.x + e.g.position.x, e.size.y * 0.6, A.z + e.g.position.z);
    sparkle(p, 0xd500f9, e.boss ? 40 : 18, e.boss ? 7 : 4, 0.9, e.boss ? 1.6 : 0.8);
    sparkle(p, 0x69f0ae, e.boss ? 24 : 10, 2, 1.4, 0.5);
    e.bar?.g.removeFromParent();
    if (e.label) {
      e.label.userData.setLines([{ text: '💚 Cured!', color: '#69f0ae' }, { text: `The ${e.animal.name} is free!`, color: '#ffffff' }]);
      e.label.scale.multiplyScalar(e.boss ? 1 : 1.3);
    }
    if (e.boss) popup(`💚 You CURED the GIANT ${e.animal.name}! It's happy again!`);
    // 跑去離玩家最遠嗰邊
    const pp = playerPos();
    e.dir.set(A.x + e.g.position.x - pp.x, 0, A.z + e.g.position.z - pp.z).normalize();
    if (!R.run.curedNames.includes(e.animal.name)) R.run.curedNames.push(e.animal.name);
  }

  // ---- 攻擊 ----
  function spit(e) {
    const pp = playerPos();
    const from = V(e.g.position.x, 1.9, e.g.position.z);
    const to = V(pp.x - A.x + rand(-1, 1), 0.1, pp.z - A.z + rand(-1, 1));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshStandardMaterial({ color: 0x76ff03, emissive: 0x64dd17, emissiveIntensity: 2 }));
    ball.position.copy(from);
    const sg = new THREE.Group();
    sg.add(ball);
    arena.g.add(sg);
    const warn = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.7, 28), ADDM(0xff1744, 0.0));
    warn.rotation.x = -PI / 2;
    warn.position.set(to.x, 0.07, to.z);
    arena.g.add(warn);
    shots.push({ g: sg, ball, warn, from, to, t: 0, dur: 1.15 });
    play('slimeSpit');
  }
  function shockwave(e, maxR = 15) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), ADDM(e.giant ? 0xd500f9 : 0xff6d00, 0.85));
    m.rotation.x = -PI / 2;
    m.position.set(e.g.position.x, 0.1, e.g.position.z);
    arena.g.add(m);
    waves.push({ m, r: 1, max: maxR, hit: false });
    play('shockwave');
    shake = Math.max(shake, 0.6);
    if (!R.run.toldJump) {
      R.run.toldJump = true;
      popup('⚠️ JUMP over the shockwave! (Space)');
    }
  }
  function dashWarn(e, len) {
    if (!e.warnM) {
      e.warnM = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ADDM(0xff1744, 0));
      e.warnM.rotation.x = -PI / 2;
      arena.g.add(e.warnM);
    }
    const w = e.radius * 2;
    e.warnM.scale.set(w, len, 1);
    e.warnM.position.set(e.g.position.x + e.dir.x * len * 0.5, 0.06, e.g.position.z + e.dir.z * len * 0.5);
    e.warnM.rotation.z = Math.atan2(e.dir.x, e.dir.z);
    e.warnM.material.opacity = 0;
    e.warnM.visible = true;
  }

  // ---- 每隻敵人每格 ----
  function updateEnemy(e, dt, time) {
    e.t += dt;
    const g = e.g;
    const pp = playerPos();
    const px = pp.x - A.x;
    const pz = pp.z - A.z;
    const dx = px - g.position.x;
    const dz = pz - g.position.z;
    const dist = Math.hypot(dx, dz);
    const u = e.model.userData;
    // 打中白一白
    if (e.flashT > 0) {
      e.flashT -= dt;
      const k = Math.max(0, e.flashT / 0.14);
      if (e.corr) e.corr.flash(k);
      else u.flash?.(k);
    }
    e.corr?.update(time, dt, camera.position);
    if (e.bar) e.bar.set(e.hp / e.maxHp);
    const face = (x, z, k = 8) => {
      const want = Math.atan2(-x, -z);
      let d = want - g.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      g.rotation.y += d * Math.min(1, dt * k);
    };
    const move = (vx, vz, sp) => {
      g.position.x += vx * sp * dt;
      g.position.z += vz * sp * dt;
      tmp.set(g.position.x + A.x, 0, g.position.z + A.z);
      clampTower(tmp, e.radius + 0.4);
      g.position.x = tmp.x - A.x;
      g.position.z = tmp.z - A.z;
    };
    switch (e.state) {
      case 'rise': { // 由魔法陣爬出嚟
        g.position.y = Math.min(0, -2.2 + e.t * 2.8);
        face(dx, dz, 4);
        u.animate?.(time, 0.6, 0);
        if (e.t > 0.85) {
          g.position.y = 0;
          e.state = 'walk';
          e.t = 0;
          if (!e.isAnimal && Math.random() < 0.5) play('zombieGroan');
        }
        return;
      }
      case 'poof': { // 扁咗 + 轉 → 糖果
        const k = e.t / 0.28;
        // 脹一脹 → 縮細 → 變糖果（彈高少少、轉圈）
        const b = (e.baseScale ??= e.model.scale.x);
        e.model.scale.setScalar(b * (k < 0.6 ? 1 + k * 0.45 : 1.27 * (1 - ((k - 0.6) / 0.4) * 0.85)));
        g.position.y = Math.sin(Math.min(1, k) * PI) * 0.5;
        g.rotation.y += dt * 16;
        if (e.t >= 0.28) {
          const p = V(A.x + g.position.x, (e.boss ? 2.5 : 1) * 1.1, A.z + g.position.z);
          candyBurst(p, e.boss ? 70 : e.kind === 'brute' ? 40 : 26, e.boss ? 2.2 : e.kind === 'brute' ? 1.4 : 1);
          floatText(V(p.x, p.y + 1.2, p.z), [{ text: e.boss ? '👑 POOF!!' : 'POOF! 🍬', color: '#ff80ab' }], e.boss ? 1.6 : 0.9);
          if (e.boss) popup('👑 The ZOMBIE KING went POOF into candy! 🍬');
          removeEnemy(e);
        }
        return;
      }
      case 'cured': { // 變返正常顏色，跑走，慢慢消失
        const k = Math.min(1, e.t / 0.6);
        e.corr.setCure(k);
        e.corr.aura.scale.setScalar(1 + k * 1.5);
        if (e.t > 0.6) {
          const run = Math.min(1, (e.t - 0.6) / 2);
          const sp = (e.giant ? 7 : 5.5) * Math.min(1, (e.t - 0.6) * 2);
          face(e.dir.x, e.dir.z, 6);
          g.position.x += e.dir.x * sp * dt;
          g.position.z += e.dir.z * sp * dt;
          g.position.y = Math.abs(Math.sin(e.t * 9)) * 0.25; // 開心跳跳紮
          u.animate?.(time * 1.6, 1);
          e.corr.fade(run);
          e.label.material.opacity = 1 - run * run;
          if (Math.random() < dt * 6) sparkle(V(A.x + g.position.x, e.size.y + 0.3, A.z + g.position.z), 0x69f0ae, 1, 0.6, 1, 0.5);
          if (run >= 1) removeEnemy(e);
        } else u.animate?.(time, 0);
        return;
      }
    }
    if (R.phase !== 'fight' || R.calm) {
      u.animate?.(time, R.calm === 'walk' ? 1 : 0, 0);
      return;
    }
    // 互相推開（唔好疊埋一嚿）
    for (const o of enemies) {
      if (o === e || o.state === 'poof' || o.state === 'cured') continue;
      const ox = g.position.x - o.g.position.x;
      const oz = g.position.z - o.g.position.z;
      const od = Math.hypot(ox, oz);
      const min = e.radius + o.radius;
      if (od < min && od > 0.001) {
        g.position.x += (ox / od) * (min - od) * 0.5;
        g.position.z += (oz / od) * (min - od) * 0.5;
      }
    }
    e.cd -= dt;
    e.groanT -= dt;
    if (e.groanT <= 0 && !e.isAnimal) {
      e.groanT = rand(4, 9);
      if (dist < 16) play('zombieGroan');
    }
    if (e.isAnimal) updateCharger(e, dt, time, dx, dz, dist);
    else updateZombie(e, dt, time, dx, dz, dist, face, move);
    if (e.isAnimal) {
      tmp.set(g.position.x + A.x, 0, g.position.z + A.z);
      clampTower(tmp, e.radius + 0.4);
      g.position.x = tmp.x - A.x;
      g.position.z = tmp.z - A.z;
    }
  }
  function updateZombie(e, dt, time, dx, dz, dist, face, move) {
    const u = e.model.userData;
    const nx = dist > 0.01 ? dx / dist : 0;
    const nz = dist > 0.01 ? dz / dist : 0;
    e.dir.set(nx, 0, nz);
    // 👑 Zombie King：震波 + 叫細殭屍
    if (e.boss) {
      e.specialT -= dt;
      e.summonT -= dt;
      if (e.summonT <= 0) {
        e.summonT = 9;
        if (enemies.filter((o) => o.state !== 'poof' && o.state !== 'cured').length < TOWER_MAX_AT_ONCE) {
          for (let i = 0; i < 2; i++) spawnEnemy(R.floor >= 15 ? 'runner' : 'walker');
          popup('👑 The Zombie King calls his zombie friends!');
        }
      }
      if (e.state === 'walk' && e.specialT <= 0) {
        e.state = 'slam';
        e.t = 0;
        e.specialT = 6.5;
        play('chargeUp');
      }
    }
    switch (e.state) {
      case 'walk': {
        face(dx, dz);
        if (e.kind === 'spitter') {
          // 企遠遠掟 Slime
          const want = dist > 11 ? 1 : dist < 7 ? -0.8 : 0;
          if (want) move(nx * want, nz * want, e.speed);
          u.animate(time, Math.abs(want), 0);
          if (e.cd <= 0 && dist < 22) {
            e.state = 'windup';
            e.t = 0;
          }
          return;
        }
        if (dist > e.reach * 0.85) move(nx, nz, e.speed);
        u.animate(time, dist > e.reach * 0.85 ? 1 : 0.2, 0);
        if (dist < e.reach && e.cd <= 0) {
          e.state = 'windup';
          e.t = 0;
          play('zombieSwipe');
        }
        return;
      }
      case 'windup': {
        face(dx, dz, 10);
        const wind = e.kind === 'spitter' ? 0.6 : e.boss ? 0.7 : 0.5;
        u.animate(time, 0, Math.min(0.6, (e.t / wind) * 0.6));
        if (e.t >= wind) {
          if (e.kind === 'spitter') spit(e);
          else if (dist < e.reach + 0.6) {
            const push = e.boss || e.kind === 'brute' ? { x: (dx / Math.max(0.1, dist)) * 10, y: 5, z: (dz / Math.max(0.1, dist)) * 10 } : null;
            hitPlayer(e.boss ? 'The Zombie King smashed you' : `A ${TOWER_ENEMIES[e.kind]?.name || 'zombie'} bonked you`, push);
          }
          e.state = 'recover';
          e.t = 0;
        }
        return;
      }
      case 'recover': {
        u.animate(time, 0, Math.min(1, 0.6 + (e.t / 0.4) * 0.4));
        if (e.t > 0.45) {
          e.state = 'walk';
          e.t = 0;
          e.cd = (e.kind === 'spitter' ? 3.2 : e.boss ? 1.6 : 1.3) / Math.sqrt(speedMul(R.floor));
        }
        return;
      }
      case 'slam': { // 👑 舉高雙手 → 踩地：震波
        face(dx, dz, 4);
        const k = Math.min(1, e.t / 1.0);
        u.animate(time, 0, k * 0.6);
        e.g.position.y = Math.sin(k * PI) * 0.6;
        if (!e.slamWarn) {
          e.slamWarn = new THREE.Mesh(new THREE.CircleGeometry(3, 32), ADDM(0xff1744, 0));
          e.slamWarn.rotation.x = -PI / 2;
          arena.g.add(e.slamWarn);
        }
        e.slamWarn.position.set(e.g.position.x, 0.06, e.g.position.z);
        e.slamWarn.material.opacity = 0.25 + Math.sin(e.t * 20) * 0.15;
        if (e.t >= 1.0) {
          e.g.position.y = 0;
          e.slamWarn.removeFromParent();
          e.slamWarn = null;
          shockwave(e, 16);
          e.state = 'recover';
          e.t = 0;
        }
        return;
      }
    }
  }
  // 😵 腐化動物：行近 → 停低刨地（地上紅色路線）→ 直線衝 → 暈一暈
  function updateCharger(e, dt, time, dx, dz, dist) {
    const g = e.g;
    const u = e.model.userData;
    const nx = dist > 0.01 ? dx / dist : 0;
    const nz = dist > 0.01 ? dz / dist : 0;
    const face = (x, z, k = 8) => {
      const want = Math.atan2(-x, -z);
      let d = want - g.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      g.rotation.y += d * Math.min(1, dt * k);
    };
    if (e.giant) {
      e.specialT -= dt;
      e.summonT -= dt;
      if (e.summonT <= 0) {
        e.summonT = 11;
        if (enemies.filter((o) => o.state !== 'poof' && o.state !== 'cured').length < TOWER_MAX_AT_ONCE) {
          for (let i = 0; i < 2; i++) spawnEnemy('animal');
          popup(`😵 The GIANT ${e.animal.name} spreads its corruption to more animals!`);
        }
      }
      if (e.state === 'walk' && e.specialT <= 0) {
        e.state = 'stomp';
        e.t = 0;
        e.specialT = 7.5;
        play('chargeUp');
      }
    }
    const dashLen = e.giant ? 22 : 15;
    switch (e.state) {
      case 'walk': {
        e.dir.set(nx, 0, nz);
        face(nx, nz);
        if (dist > 2) {
          g.position.x += nx * e.speed * dt;
          g.position.z += nz * e.speed * dt;
        }
        u.animate?.(time, dist > 2 ? 1 : 0);
        if (e.cd <= 0 && dist < (e.giant ? 20 : 13)) {
          e.state = 'windup';
          e.t = 0;
          e.dir.set(nx, 0, nz);
          dashWarn(e, Math.min(dashLen, dist + 4));
          play('chargeUp');
        } else if (dist < e.reach && e.cd <= 0.5) { // 好近：撞一撞
          hitPlayer(`The corrupted ${e.animal.name} bumped you`, { x: nx * 8, y: 4, z: nz * 8 });
          e.cd = 1.4;
        }
        return;
      }
      case 'windup': {
        const wind = e.giant ? 1.0 : 0.8;
        face(e.dir.x, e.dir.z, 12);
        g.position.x += Math.sin(e.t * 60) * 0.02; // 震震下
        u.animate?.(time * 2.5, 0.4);
        if (e.warnM) e.warnM.material.opacity = 0.15 + (e.t / wind) * 0.4 + Math.sin(e.t * 24) * 0.08;
        if (e.t >= wind) {
          e.state = 'dash';
          e.t = 0;
          e.hitDone = false;
          play('chargeGo');
        }
        return;
      }
      case 'dash': {
        const sp = TOWER_ENEMIES.animal.dash * Math.sqrt(speedMul(R.floor)) * (e.giant ? 1.1 : 1);
        const bx0 = g.position.x;
        const bz0 = g.position.z;
        g.position.x += e.dir.x * sp * dt;
        g.position.z += e.dir.z * sp * dt;
        tmp.set(g.position.x + A.x, 0, g.position.z + A.z);
        clampTower(tmp, e.radius + 0.4);
        const blocked = Math.hypot(tmp.x - A.x - g.position.x, tmp.z - A.z - g.position.z) > 0.05;
        g.position.x = tmp.x - A.x;
        g.position.z = tmp.z - A.z;
        u.animate?.(time * 2.2, 1);
        if (e.warnM) e.warnM.material.opacity *= Math.exp(-dt * 4);
        if (Math.random() < dt * 20) sparkle(V(A.x + bx0, 0.3, A.z + bz0), 0x9c27b0, 1, 0.8, 0.6, 0.9);
        if (!e.hitDone && dist < e.radius + 0.9 && player.feetY < 1.4) {
          e.hitDone = true;
          hitPlayer(e.giant ? `The GIANT ${e.animal.name} charged into you` : `The corrupted ${e.animal.name} charged into you`, { x: e.dir.x * 14, y: 6, z: e.dir.z * 14 });
        }
        if (e.t * sp >= dashLen || blocked) {
          e.state = 'dizzy';
          e.t = 0;
          if (e.warnM) e.warnM.visible = false;
          if (blocked) shake = Math.max(shake, e.giant ? 0.5 : 0.15);
        }
        return;
      }
      case 'dizzy': {
        u.animate?.(time, 0);
        g.rotation.z = Math.sin(e.t * 10) * 0.08;
        if (e.t > (e.giant ? 1.3 : 1.0)) {
          g.rotation.z = 0;
          e.state = 'walk';
          e.t = 0;
          e.cd = rand(2, 3.2) / Math.sqrt(speedMul(R.floor));
        }
        return;
      }
      case 'stomp': { // GIANT：企高 → 踩落地 = 震波
        const k = Math.min(1, e.t / 1.1);
        u.animate?.(time, 0);
        g.rotation.x = -Math.sin(k * PI) * 0.35;
        g.position.y = Math.sin(k * PI) * 1.2;
        if (e.t >= 1.1) {
          g.rotation.x = 0;
          g.position.y = 0;
          shockwave(e, 18);
          e.state = 'dizzy';
          e.t = 0.6;
        }
        return;
      }
    }
  }
  function updateShots(dt) {
    const pp = playerPos();
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      s.ball.position.lerpVectors(s.from, s.to, k);
      s.ball.position.y += Math.sin(k * PI) * 4.5;
      s.warn.material.opacity = 0.3 + k * 0.45;
      s.warn.scale.setScalar(0.6 + k * 0.4);
      if (k >= 1) {
        play('slimeSplat');
        sparkle(V(A.x + s.to.x, 0.3, A.z + s.to.z), 0x76ff03, 14, 3, 0.6, 0.7);
        if (Math.hypot(pp.x - A.x - s.to.x, pp.z - A.z - s.to.z) < 1.8 && player.feetY < 1.2) hitPlayer('Splat! Green slime got you');
        s.g.removeFromParent();
        s.warn.removeFromParent();
        s.ball.geometry.dispose();
        shots.splice(i, 1);
      }
    }
  }
  function updateWaves(dt) {
    const pp = playerPos();
    const px = pp.x - A.x;
    const pz = pp.z - A.z;
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.r += dt * 13;
      w.m.scale.setScalar(w.r);
      w.m.material.opacity = 0.85 * (1 - w.r / w.max);
      const d = Math.hypot(px - w.m.position.x, pz - w.m.position.z);
      if (!w.hit && Math.abs(d - w.r) < 0.9 && player.feetY < 0.45) {
        w.hit = true;
        hitPlayer('The shockwave hit you', { x: ((px - w.m.position.x) / Math.max(0.1, d)) * 9, y: 6, z: ((pz - w.m.position.z) / Math.max(0.1, d)) * 9 });
      }
      if (w.r >= w.max) {
        w.m.removeFromParent();
        w.m.geometry.dispose();
        waves.splice(i, 1);
      }
    }
  }

  // ================= 一層層 =================
  function startFloor(n) {
    R.floor = n;
    R.phase = 'intro';
    R.t = 0;
    R.liftHold = 0;
    weapons.refill();
    const boss = isBossFloor(n);
    const count = boss ? Math.ceil(enemyCount(n) * 0.5) : enemyCount(n);
    const share = animalShare(n);
    R.queue = [];
    for (let i = 0; i < count; i++) R.queue.push(Math.random() < share ? 'animal' : zombieKindFor(n));
    // 最少有一隻動物（第 2 層起）
    if (n >= TOWER_ENEMIES.animal.from && !R.queue.includes('animal')) R.queue[R.queue.length - 1] = 'animal';
    R.bossPending = boss ? ((n / TOWER_BOSS_EVERY) % 2 === 1 ? 'king' : 'giant') : null;
    applyTheme(n - 1);
    drawSign();
    bigText(boss ? `FLOOR ${n}` : `FLOOR ${n}`, boss ? '👑 MINI-BOSS FLOOR!' : `${count} enemies · ${TOWER_MODES[R.mode].emoji} ${TOWER_MODES[R.mode].name}`, boss ? '#ff4081' : '#d500f9');
    if (boss) play('bossIntro');
  }
  function bigText(a, b = '', c = '#d500f9') {
    ui.big.querySelector('b').textContent = a;
    ui.big.querySelector('span').textContent = b;
    ui.big.style.setProperty('--c', c);
    ui.big.hidden = false;
    ui.big.classList.remove('on');
    void ui.big.offsetWidth;
    ui.big.classList.add('on');
    clearTimeout(bigText.tm);
    bigText.tm = setTimeout(() => (ui.big.hidden = true), 2500);
  }
  function showRewardCard(n, items, milestone) {
    const li = (r) => `<li class="${TOWER_RARE_TYPES.includes(r.type) ? 'rare' : ''}">${r.text || rewardText(r)}</li>`;
    ui.reward.innerHTML = `<h4>✅ FLOOR ${n} CLEARED!</h4><ul>${items.map(li).join('')}</ul>${milestone ? `<div class="ms"><h5>🏆 FLOOR ${n} MILESTONE PRIZE!</h5><ul>${milestone.map(li).join('')}</ul></div>` : ''}
      <div class="hint">🎒 = in your tower bag${milestone ? ' · 🏆 = yours already!' : ''}</div>`;
    ui.reward.hidden = false;
    ui.reward.classList.remove('on');
    void ui.reward.offsetWidth;
    ui.reward.classList.add('on');
    clearTimeout(showRewardCard.tm);
    showRewardCard.tm = setTimeout(() => (ui.reward.hidden = true), milestone ? 7000 : 4800);
  }
  function clearFloor() {
    const n = R.floor;
    R.phase = 'clear';
    R.t = 0;
    R.run.floorsCleared = n;
    // 🏆 最高層數（每個難度）
    const byMode = { easy: 0, medium: 0, hard: 0, ...(state.towerBestByMode || {}) };
    if (n > byMode[R.mode]) {
      byMode[R.mode] = n;
      R.run.newBest = true;
    }
    state.towerBestByMode = byMode;
    state.towerBest = Math.max(state.towerBest || 0, n);
    // 🎒 入袋
    const items = rollFloorRewards(n, R.mode);
    items.forEach(bagAdd);
    // 🏆 里程碑：即刻俾
    let ms = null;
    const msList = milestoneRewards(n, R.mode, TOWER_BOSS_EVERY);
    if (msList) {
      ms = msList.map((r) => ({ ...r, text: giveReward({ ...r, quiet: true }).text || rewardText(r) }));
      R.run.banked.push(...ms);
      play('demonic');
    }
    save();
    R.hearts = Math.min(TOWER_HEARTS, R.hearts + 1); // 打完一層：+1 ❤️
    play('floorClear');
    bigText('FLOOR CLEARED!', ms ? `🏆 Floor ${n} milestone prize!` : '✨ Step on the magic circle to go UP', '#69f0ae');
    showRewardCard(n, items, ms);
    setTimeout(() => {
      if (R.phase === 'clear') popup('✨ Stand on the glowing magic circle to go up · 🚪 or leave by the door (keep your whole bag)');
    }, 2600);
  }
  function startLift() {
    if (R.phase !== 'clear') return;
    R.phase = 'lift';
    R.t = 0;
    play('elevator');
    ui.lift.querySelector('b').textContent = `⬆️ FLOOR ${R.floor + 1}`;
    flash?.();
  }
  function updateLift(dt) {
    const T = 3.0;
    const k = R.t / T;
    const ease = Math.sin(Math.min(1, k) * PI); // 慢 → 快 → 慢
    // 牆向下飛（= 我哋向上升）
    arena.wTex.offset.y -= dt * ease * 3.2;
    arena.winTex.offset.y -= dt * ease * 0.85;
    arena.beamMat.opacity = 0.06 + ease * 0.2;
    arena.lift.rotation.z += dt * (1 + ease * 8);
    shake = Math.max(shake, ease * 0.12);
    if (Math.random() < dt * 40) {
      const a = Math.random() * PI * 2;
      const r = Math.random() * TOWER_LIFT.r;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color: THEMES[arena.theme].circle, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.set(A.x + Math.cos(a) * r, 0.2, A.z + Math.sin(a) * r);
      s.position.x -= A.x;
      s.position.z -= A.z;
      s.scale.setScalar(rand(0.3, 0.7));
      particle(s, { vel: V(0, rand(5, 10), 0), life: 1.2, grav: 0, shrink: true, fade: (o, kk) => (o.material.opacity = kk) });
    }
    ui.lift.style.opacity = String(Math.min(1, ease * 1.4));
    ui.lift.style.setProperty('--lc', `#${new THREE.Color(THEMES[arena.theme].circle).getHexString()}88`);
    // 企喺魔法陣入面（升緊）
    const pos = camera.position;
    const d = Math.hypot(pos.x - A.x, pos.z - A.z);
    if (d > TOWER_LIFT.r - 0.5) {
      pos.x = A.x + ((pos.x - A.x) / d) * (TOWER_LIFT.r - 0.5);
      pos.z = A.z + ((pos.z - A.z) / d) * (TOWER_LIFT.r - 0.5);
    }
    if (k >= 0.5 && k - dt / T < 0.5) {
      applyTheme(R.floor); // 下一層嘅顏色
      flash?.();
    }
    if (k >= 1) {
      ui.lift.style.opacity = '0';
      arena.beamMat.opacity = 0;
      startFloor(R.floor + 1);
    }
  }

  // ================= 入／出 =================
  function openModes() {
    if (R.travelling || R.inside) return;
    R.panel = 'modes';
    togglePanel('tower');
  }
  async function enter(mode = 'medium', floor = 1) {
    if (R.travelling) return;
    R.travelling = true;
    R.mode = TOWER_MODES[mode] ? mode : 'medium';
    play('portal');
    const ok = await showLoading('🗼 Climbing into the Witch Tower...', async () => {
      if (!arena) arena = buildArena();
      clearEnemies();
      arena.g.visible = true;
      teleport(TOWER_ARRIVE.x, TOWER_ARRIVE.z, TOWER_ARRIVE.rotY);
    }, 1.4, { theme: 'hell', title: 'Witch Tower', kicker: `🧙 ${TOWER_MODES[R.mode].emoji} ${TOWER_MODES[R.mode].name} · Endless` });
    R.travelling = false;
    if (!ok) return;
    startRun(floor);
  }
  function startRun(floor = 1) {
    R.inside = true;
    R.hearts = TOWER_HEARTS;
    R.safeT = 2;
    R.ko = -1;
    R.knock.set(0, 0, 0);
    R.bossCount = Math.floor((floor - 1) / TOWER_BOSS_EVERY);
    R.run = { floorsCleared: floor - 1, startFloor: floor, zombies: 0, cured: 0, bosses: 0, bag: new Map(), banked: [], curedNames: [], newBest: false, toldJump: false, mode: R.mode };
    state.towerStats = { runs: 0, zombies: 0, cured: 0, ...(state.towerStats || {}) };
    state.towerStats.runs += 1;
    save();
    weapons.setZone('tower', true);
    const fresh = ['soulBlaster', 'candyPistol', 'slingshot'].filter((id) => weapons.give(id));
    weapons.refill();
    if (fresh.length) {
      setTimeout(() => {
        announce(`🎁 The Witch gives you ${fresh.length === 3 ? '3 magic weapons' : 'new magic weapons'}: ${fresh.map((id) => `${weapons.WEAPONS[id].emoji} ${weapons.WEAPONS[id].name}`).join(' · ')}! Press 1–3 to switch`);
        play('upgrade');
      }, 3000);
    }
    const best = bestOf(R.mode);
    announce(`🗼 THE WITCH TOWER · ${TOWER_MODES[R.mode].emoji} ${TOWER_MODES[R.mode].name} · 🏆 Best: Floor ${best}`);
    startFloor(floor);
  }
  // 結束：how = 'left'（行門口，成袋）| 'ko'（暈低）| 'ran'（打緊走人）| 'away'（俾人傳送走咗）
  async function finishRun(how) {
    if (!R.run) return;
    const run = R.run;
    const keep = how === 'left' ? 1 : TOWER_KO_KEEP;
    const payout = [];
    for (const [type, amount] of run.bag) {
      let n = amount * keep;
      n = n < 10 ? Math.floor(n) + (Math.random() < n - Math.floor(n) ? 1 : 0) : Math.round(n);
      if (n > 0) payout.push({ type, amount: n });
    }
    const given = payout.map((r) => ({ ...r, text: giveReward({ ...r, quiet: true }).text || rewardText(r) }));
    state.towerStats = { runs: 1, zombies: 0, cured: 0, ...(state.towerStats || {}) };
    state.towerStats.zombies += run.zombies;
    state.towerStats.cured += run.cured;
    save();
    R.results = { how, mode: run.mode, floor: R.floor, cleared: run.floorsCleared, startFloor: run.startFloor, zombies: run.zombies, cured: run.cured, bosses: run.bosses, given, banked: run.banked, newBest: run.newBest, best: bestOf(run.mode), keep, curedNames: run.curedNames };
    R.run = null;
    clearEnemies();
    weapons.setZone('tower', false);
    R.inside = false;
    R.phase = 'idle';
    R.knock.set(0, 0, 0);
    ui.reward.hidden = true;
    ui.lift.style.opacity = '0';
    if (arena) arena.beamMat.opacity = 0;
    if (how === 'away') {
      if (given.length) popup(`🗼 You left the Witch Tower: ${given.map((g) => g.text).join(' · ')}`);
      return;
    }
    play(how === 'left' ? 'portal' : 'knockedOut');
    R.travelling = true;
    await toCastle();
    R.travelling = false;
    if (arena) arena.g.visible = false;
    setTimeout(() => {
      R.panel = 'results';
      togglePanel('tower');
      play(given.length || R.results.banked.length ? 'coin' : 'click');
    }, how === 'ko' ? 900 : 300);
  }

  // ================= 面板 =================
  function modesHtml() {
    const card = (id) => {
      const m = TOWER_MODES[id];
      return `<div class="tower-mode" style="--mc:${m.color}"><div class="em">${m.emoji}</div><h3>${m.name}</h3><p>${m.desc}</p>
        <div class="best">🏆 Best: Floor ${bestOf(id)}</div><button data-tower="start" data-mode="${id}">Enter (${m.name})</button></div>`;
    };
    return `<div class="tower-panel"><p class="tp-intro">🧙‍♀️ "Climb my endless tower, hero! Poof the zombies 🧟 and CURE the corrupted animals 💚. The higher you go, the cooler the prizes!"</p>
      <div class="tower-modes">${TOWER_MODE_ORDER.map(card).join('')}</div>
      <p class="tp-note">👑 Every ${TOWER_BOSS_EVERY} floors: a MINI-BOSS and a 🏆 big prize · 🎒 leave by the door to keep your whole bag (knocked out = keep ${Math.round(TOWER_KO_KEEP * 100)}%) · You have ${TOWER_HEARTS} ❤️</p></div>`;
  }
  function resultsHtml() {
    const r = R.results;
    if (!r) return '<p>No results yet.</p>';
    const m = TOWER_MODES[r.mode];
    const title = r.how === 'left' ? '🏃 You left the tower safely!' : r.how === 'ko' ? `💫 Knocked out on Floor ${r.floor}!` : '🏃 You ran out of the tower!';
    const li = (x) => `<li class="${TOWER_RARE_TYPES.includes(x.type) ? 'rare' : ''}">${x.text}</li>`;
    const all = [...r.banked.map((x) => ({ ...x, text: `🏆 ${x.text}` })), ...r.given];
    return `<div class="tower-panel tower-res">
      <div class="big">${r.how === 'ko' ? '💫' : '🗼'}</div><h2>${title}</h2>
      <div class="mode" style="color:${m.color}">${m.emoji} ${m.name} mode</div>
      <div class="grid">
        <div><b>${r.cleared - (r.startFloor - 1)}</b><span>🗼 Floors cleared${r.startFloor > 1 ? ` (from floor ${r.startFloor})` : ''}</span></div>
        <div><b>${r.zombies}</b><span>🧟 Zombies poofed</span></div>
        <div><b>${r.cured}</b><span>💚 Animals cured</span></div>
        <div class="${r.newBest ? 'newbest' : ''}"><b>${r.best}</b><span>🏆 Best floor${r.newBest ? ' — NEW BEST!' : ''}</span></div>
      </div>
      ${r.curedNames.length ? `<p>💚 You saved: ${r.curedNames.slice(0, 8).join(', ')}${r.curedNames.length > 8 ? '...' : ''}</p>` : ''}
      <h3>🎁 Rewards</h3>
      ${all.length ? `<ul>${all.map(li).join('')}</ul>` : '<p>No rewards this time. Beat a floor to fill your 🎒 bag!</p>'}
      ${r.keep < 1 ? `<p class="kept">💫 You were knocked out, so you kept ${Math.round(r.keep * 100)}% of your 🎒 bag. (🏆 prizes are always yours!)</p>` : ''}
      <div class="btns"><button data-tower="again" data-mode="${r.mode}">🗼 Play again (${m.name})</button><button data-tower="modes" class="grey">🎚️ Change mode</button></div></div>`;
  }
  ctx.extraPanels.tower = ['🗼 The Witch Tower', () => (R.panel === 'results' ? resultsHtml() : modesHtml()), 'E'];
  $('panel-body').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tower]');
    if (!b) return;
    const what = b.dataset.tower;
    if (what === 'modes') {
      R.panel = 'modes';
      $('panel-body').innerHTML = modesHtml();
      return;
    }
    togglePanel('tower'); // 收埋面板
    if (what === 'start' || what === 'again') enter(b.dataset.mode);
  });

  // ================= 每格 =================
  let shake = 0;
  let hudKey = '';
  function updateUi() {
    const show = R.inside && !!R.run;
    ui.hud.hidden = !show;
    ui.bag.hidden = !show;
    ui.hearts.hidden = !show || R.phase === 'idle';
    if (!show) {
      ui.boss.hidden = true;
      return;
    }
    const m = modeInfo();
    const alive = enemies.filter((e) => e.state !== 'poof' && e.state !== 'cured');
    const z = alive.filter((e) => !e.isAnimal).length + R.queue.filter((k) => k !== 'animal').length;
    const an = alive.filter((e) => e.isAnimal).length + R.queue.filter((k) => k === 'animal').length;
    const t3 = R.phase === 'clear' ? '✅ Cleared! ✨ Magic circle = go up · 🚪 Door = leave'
      : R.phase === 'lift' ? '⬆️ Going up...'
        : `${R.bossPending || alive.some((e) => e.boss) ? '👑 Boss · ' : ''}🧟 ${z} · 😵 ${an} left`;
    const key = `${R.floor}|${R.mode}|${t3}|${bestOf(R.mode)}`;
    if (key !== hudKey) {
      hudKey = key;
      ui.hud.querySelector('.t1').textContent = `🗼 WITCH TOWER · ${m.emoji} ${m.name.toUpperCase()}`;
      ui.hud.querySelector('.t2').textContent = `FLOOR ${R.floor}`;
      ui.hud.querySelector('.t3').textContent = t3;
      ui.hud.querySelector('.t4').textContent = `🏆 Best: Floor ${bestOf(R.mode)}${R.floor >= doubleFloor() ? ' · ⚠️ hits take 2 ❤️' : ''}`;
    }
    const bt = bagText();
    if (ui.bag.textContent !== bt) ui.bag.textContent = bt;
    const boss = alive.find((e) => e.boss);
    ui.boss.hidden = !boss;
    if (boss) {
      ui.boss.querySelector('b').textContent = boss.giant ? `😵 GIANT CORRUPTED ${boss.animal.name.toUpperCase()}` : '👑 ZOMBIE KING';
      ui.boss.querySelector('i').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      ui.boss.querySelector('span').textContent = `${short(Math.ceil(boss.hp))} / ${short(boss.maxHp)}`;
    }
    ui.hearts.style.setProperty('--regen', R.hearts < TOWER_HEARTS ? (R.regenT / TOWER_HEART_REGEN).toFixed(2) : '0');
    drawHearts();
  }
  function animateDecor(dt, time) {
    if (!arena) return;
    for (const t of arena.torches) {
      t.layers.forEach((m, i) => {
        const k = 1 + Math.sin(time * (11 + i * 3) + t.seed + i) * 0.15;
        m.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
      });
      t.halo.material.opacity = 0.45 + Math.sin(time * 7 + t.seed) * 0.1;
    }
    for (const c of arena.candles) {
      c.c.position.y = c.y + Math.sin(time * 0.9 + c.seed) * 0.35;
      c.c.rotation.z = Math.sin(time * 0.7 + c.seed) * 0.08;
      c.fl.scale.y = 0.5 + Math.sin(time * 14 + c.seed) * 0.06;
    }
    for (const f of arena.flames) f.userData.flicker(time);
    for (const c of arena.cauldrons) {
      for (const b of c.bubbles) {
        b.userData.t += dt;
        const k = b.userData.t / 1.6;
        if (k >= 1) {
          b.userData.t = 0;
          b.userData.x = rand(-0.6, 0.6);
          b.userData.z = rand(-0.6, 0.6);
        }
        b.position.set(b.userData.x, 2.15 + k * 0.6, b.userData.z);
        b.scale.setScalar(0.08 + Math.sin(k * PI) * 0.16);
      }
      c.steam.material.opacity = 0.25 + Math.sin(time * 2 + c.g.position.x) * 0.1;
    }
    arena.lift.rotation.z += dt * 0.3;
    const glowOn = R.phase === 'clear';
    arena.liftMat.opacity = glowOn ? 0.7 + Math.sin(time * 6) * 0.25 : 0.22;
    if (R.phase === 'clear') arena.beamMat.opacity = 0.07 + Math.sin(time * 4) * 0.03 + R.liftHold * 0.12;
    else if (R.phase !== 'lift') arena.beamMat.opacity = 0;
    for (const c of arena.decoCircles) c.rotation.z -= dt * 0.2;
    for (const p of arena.portals) {
      p.glow = Math.max(0, p.glow - dt);
      p.mesh.material.opacity = Math.min(0.95, p.glow);
      p.mesh.rotation.z += dt * 2;
    }
    arena.sky.rotation.z += dt * 0.15;
    const a = time * 0.35;
    arena.broom.position.set(Math.cos(a) * 14, 15 + Math.sin(time * 1.3) * 1.2, Math.sin(a) * 14);
    arena.broom.rotation.y = -a + PI;
    arena.exitGlow.material.opacity = (R.phase === 'clear' ? 0.6 : 0.3) + Math.sin(time * 3) * 0.12;
  }

  function update(dt, time, { paused = false, frozen = false, view = camera } = {}) {
    const pos = camera.position;
    const inside = inTowerArena(pos.x, pos.z);
    if (arena) arena.g.visible = inside || R.inside;
    // 俾人傳送走咗（控制台等等）
    if (!inside && R.inside && !R.travelling) finishRun('away');
    // 冇經門口入嚟（例如控制台傳送）：照樣開始
    if (inside && !R.inside && !R.travelling && arena && R.phase === 'idle') startRun(1);
    updateUi();
    if (!R.inside || !arena) return;
    // 第三身鏡頭唔好退出牆外
    if (view !== camera) {
      const dx = view.position.x - A.x;
      const dz = view.position.z - A.z;
      const d = Math.hypot(dx, dz);
      const max = A.r - 1.2;
      if (d > max) view.position.set(A.x + (dx / d) * max, view.position.y, A.z + (dz / d) * max);
    }
    // 塔入面嘅霧
    if (scene.fog) {
      scene.fog.color.lerp(new THREE.Color(THEMES[arena.theme].fog), 0.6);
      scene.fog.near = 26;
      scene.fog.far = 120;
    }
    if (paused || frozen) return;
    animateDecor(dt, time);
    updateFx(dt);
    shake = Math.max(0, shake - dt * 1.5);
    // 暈低
    if (R.ko >= 0) {
      R.ko += dt;
      if (R.ko >= 1.0 && R.ko - dt < 1.0) {
        setTimeout(() => (ui.ko.hidden = true), 1300);
        finishRun('ko');
      }
      return;
    }
    R.t += dt;
    R.safeT = Math.max(0, R.safeT - dt);
    lostT = Math.max(0, lostT - dt);
    if (R.hearts < TOWER_HEARTS && R.phase === 'fight') {
      R.regenT += dt;
      if (R.regenT >= TOWER_HEART_REGEN) {
        R.regenT = 0;
        R.hearts += 1;
        play('heartBack');
      }
    }
    // 彈飛
    if (R.knock.lengthSq() > 0.01) {
      for (let i = 0; i < 4; i++) {
        const nx = pos.x + (R.knock.x * dt) / 4;
        const nz = pos.z + (R.knock.z * dt) / 4;
        if (isWalkable(nx, pos.z, 0.4, player.feetY)) pos.x = nx;
        else R.knock.x *= -0.3;
        if (isWalkable(pos.x, nz, 0.4, player.feetY)) pos.z = nz;
        else R.knock.z *= -0.3;
      }
      R.knock.multiplyScalar(Math.exp(-dt * (player.grounded ? 6 : 1.5)));
    }
    // 階段
    if (R.phase === 'intro' && R.t > 2.2) {
      R.phase = 'fight';
      R.t = 0;
      R.spawnT = 0;
      if (R.bossPending) {
        const b = spawnEnemy(R.bossPending === 'giant' ? 'animal' : 'king', { boss: true, giant: R.bossPending === 'giant', at: pickSpawn(16) });
        R.bossCount += 1;
        R.bossPending = null;
        announce(b.giant ? `😵 MINI-BOSS: a GIANT corrupted ${b.animal.name}! Cure it! 💚` : '👑 MINI-BOSS: the ZOMBIE KING! Jump over his shockwaves!');
      }
    }
    if (R.phase === 'fight') {
      R.spawnT -= dt;
      const alive = enemies.filter((e) => e.state !== 'poof' && e.state !== 'cured');
      if (R.queue.length && alive.length < TOWER_MAX_AT_ONCE && R.spawnT <= 0 && !R.calm) {
        spawnEnemy(R.queue.shift());
        R.spawnT = 0.75;
      }
      if (!R.queue.length && !alive.length && !R.bossPending) clearFloor();
    }
    if (R.phase === 'clear') {
      const inLift = Math.hypot(pos.x - TOWER_LIFT.x, pos.z - TOWER_LIFT.z) < TOWER_LIFT.r - 0.3;
      R.liftHold = inLift && R.t > 1.5 ? R.liftHold + dt : 0;
      if (R.liftHold > 1.4) startLift();
    }
    if (R.phase === 'lift') updateLift(dt);
    for (const e of [...enemies]) updateEnemy(e, dt, time);
    updateShots(dt);
    updateWaves(dt);
  }
  const shakeV = V();
  function shakeOffset() {
    if (!R.inside || shake <= 0.01) return null;
    const a = shake * 0.35;
    return shakeV.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a * 0.8, (Math.random() - 0.5) * a);
  }
  function interaction(pos) {
    if (!R.inside || R.travelling || R.phase === 'lift' || R.phase === 'ko') return null;
    if (Math.hypot(pos.x - TOWER_EXIT.x, pos.z - TOWER_EXIT.z) < 3) {
      if (R.phase === 'clear') return { prompt: '<kbd>E</kbd> 🚪 Leave the tower (keep your WHOLE 🎒 bag)', action: () => finishRun('left') };
      return { prompt: `<kbd>E</kbd> 🏃 Run away (you keep ${Math.round(TOWER_KO_KEEP * 100)}% of your 🎒 bag)`, action: () => finishRun('ran') };
    }
    if (R.phase === 'clear' && Math.hypot(pos.x - TOWER_LIFT.x, pos.z - TOWER_LIFT.z) < TOWER_LIFT.r) return { prompt: `<kbd>E</kbd> ⬆️ Go up to FLOOR ${R.floor + 1}`, action: startLift };
    return null;
  }

  // ---- 測試／控制台 ----
  const debug = {
    open: () => openModes(),
    enter: (mode = 'medium', floor = 1) => enter(mode, floor),
    // 跳去第 n 層（未入塔就用 Medium 入）
    async floor(n = 5, mode = null) {
      n = Math.max(1, Math.floor(n));
      if (!R.inside) return enter(mode || R.mode || 'medium', n);
      clearEnemies();
      R.bossCount = Math.floor((n - 1) / TOWER_BOSS_EVERY);
      if (R.run) R.run.floorsCleared = Math.max(R.run.floorsCleared, n - 1);
      startFloor(n);
      return n;
    },
    clear() { // 即刻打完呢層
      R.queue.length = 0;
      R.bossPending = null;
      for (const e of [...enemies]) if (e.hp > 0) e.target.onHit(e.hp + 1);
    },
    hurtAll(n = 1000) {
      for (const e of [...enemies]) if (e.hp > 0) e.target.onHit(Math.min(n, e.hp - 1) || 1);
    },
    ko() { R.god = false; R.safeT = 0; R.hearts = 1; hitPlayer('Test'); },
    leave: () => finishRun(R.phase === 'clear' ? 'left' : 'ran'),
    lift: () => startLift(),
    spawn: (kind = 'walker', o = {}) => spawnEnemy(kind, o),
    // 影相用：所有款殭屍企成一排
    lineup(walk = true) {
      R.calm = walk ? 'walk' : true;
      clearEnemies();
      const kinds = ['walker', 'walker', 'runner', 'spitter', 'brute', 'walker'];
      kinds.forEach((k, i) => {
        const e = spawnEnemy(k, { at: { x: A.x - 6.25 + i * 2.5, z: A.z - 3, glow: 0 } });
        e.state = 'walk';
        e.g.position.y = 0;
        e.g.rotation.y = PI;
      });
      const king = spawnEnemy('king', { boss: true, at: { x: A.x, z: A.z - 9, glow: 0 } });
      king.state = 'walk';
      king.g.position.y = 0;
      king.g.rotation.y = PI;
      return enemies.length;
    },
    set god(v) { R.god = v; },
    get god() { return R.god; },
    set calm(v) { R.calm = v; },
    get state() { return { phase: R.phase, floor: R.floor, mode: R.mode, hearts: R.hearts, queue: R.queue.length, enemies: enemies.map((e) => `${e.kind}:${e.state}:${Math.ceil(e.hp)}`), bag: R.run ? Object.fromEntries(R.run.bag) : null, run: R.run && { ...R.run, bag: undefined } }; },
    get enemies() { return enemies; },
    get arena() { return arena; },
  };

  return {
    update, interaction, enter, openModes, debug, shake: shakeOffset,
    get inside() { return R.inside; },
    get battle() { return R.inside && ['intro', 'fight'].includes(R.phase); },
    get busy() { return R.travelling; },
  };
}
