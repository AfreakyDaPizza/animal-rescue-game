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
//
// Issue #14（2026-10-23）：
//   🧟 新殭屍：Leaper（踎低 → 撲落紅圈）、Shield（前面塊盾擋子彈：打個頭／背脊；爆炸／閃電繞得過）、Bomber（掟南瓜炸彈：紅圈 = 爆炸範圍）、
//             Frost（掟冰波：打中 = 慢落嚟）、Splitter（打散 = 一開二變 2 隻 Mini）、Necro-Witch（綠光醫朋友 + 叫 Mini Zombie 出嚟）
//   🔫 每次入塔淨係得一支武器（TOWER_STARTER_WEAPON = Candy Pistol）；殭屍 5%（TOWER_CRATE_CHANCE）跌 📦 Weapon Crate（Boss 一定跌）
//      行過去執 = 隨機一支新武器（越稀有越難抽，WEAPON_RARITY）加入呢次嘅武器（weapons.setLoadout('tower', ...)）；出咗塔就冇
//   測試：game.tower.spawn('leaper'|'shield'|'bomber'|'frost'|'splitter'|'mini'|'necro')、game.tower.crate()（喺前面跌一個 Crate）、
//         game.tower.crateChance = 1（每隻都跌）、game.tower.giveWeapon('pumpkinLauncher')、game.tower.lineup()

import * as THREE from 'three';
import { state, save } from './state.js';
import { addSounds } from './sound.js';
import { bakeStatic } from './world.js';
import { makeLabel } from './signs.js';
import { canvasTex, seeded } from './halloweenArt.js';
import { flame, bx, cyl, sph, cone } from './halloweenKit.js';
import { ANIMALS } from './data/animals.js';
import { buildAnimalModel } from './animalModels.js';
import { buildZombie, corrupt, towerGlowTex, buildWeaponCrate } from './towerModels.js';
import { projectileModel } from './weaponModels.js';
import { WEAPONS, WEAPON_RARITY, TOWER_STARTER_WEAPON } from './data/weapons.js';
import { moveOpts } from './player.js';
import { giveReward } from './demonicRewards.js';
import {
  TOWER_ARENA as A, TOWER_LIFT, TOWER_ARRIVE, TOWER_EXIT, TOWER_CAULDRONS, TOWER_SHELVES, towerPolar, inTowerArena, clampTower,
} from './towerShape.js';
import {
  TOWER_HEARTS, TOWER_HEART_REGEN, TOWER_HIT_SAFE, TOWER_KO_KEEP, TOWER_BASE_ENEMIES, TOWER_ENEMIES_PER_FLOOR, TOWER_MAX_ENEMIES,
  TOWER_MAX_AT_ONCE, TOWER_HP_GROWTH, TOWER_SPEED_GROWTH, TOWER_MAX_SPEED_MULT, TOWER_DOUBLE_DAMAGE_FLOOR, TOWER_BOSS_EVERY,
  TOWER_ANIMAL_SHARE, TOWER_ANIMAL_SHARE_GROWTH, TOWER_ANIMAL_SHARE_MAX, TOWER_ENEMIES, TOWER_BOSS_HP, TOWER_BOSS_GROWTH, TOWER_CRATE_CHANCE,
  TOWER_BOSSES, TOWER_BOSS_ORDER, TOWER_SHIELD_DROP, TOWER_SHIELD_MAX, TOWER_ANGRY_DAMAGE,
} from './data/balance.js';
import {
  TOWER_MODES, TOWER_MODE_ORDER, TOWER_REWARD_LOOK, TOWER_RARE_TYPES, TOWER_PER_ZOMBIE, TOWER_PER_CURE, TOWER_PER_BOSS,
  rollFloorRewards, milestoneRewards, rollAmount,
} from './data/towerRewards.js';
import { short } from './format.js';
// 🧩 Issue #15：擴充模組（每個自己一個檔，用 K 工具箱，見 createWitchTower 入面「擴充 API」）
import { installTowerZombies } from './towerZombies2.js';
import { installTowerBosses } from './towerBosses.js';
import { installTowerFloors } from './towerFloors.js';

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
  // Issue #14 新殭屍 + 📦 Crate
  leapCrouch: (t, { tone }) => tone(240, t, 0.5, { type: 'triangle', vol: 0.08, slide: 2.2 }),
  leapLand: (t, { tone, noise }) => {
    tone(90, t, 0.3, { type: 'sine', vol: 0.35, slide: 0.5 });
    noise(t, 0.25, { vol: 0.3, freq: 500 });
  },
  bombThrow: (t, { tone }) => tone(300, t, 0.3, { type: 'triangle', vol: 0.08, slide: 1.6 }),
  bombFuse: (t, { noise }) => noise(t, 0.5, { vol: 0.08, freq: 5000, type: 'highpass' }),
  bombBoom: (t, { tone, noise, arp }) => {
    tone(65, t, 0.7, { type: 'sine', vol: 0.5, slide: 0.4 });
    noise(t, 0.6, { vol: 0.5, freq: 450 });
    arp(t + 0.1, [1047, 1319, 1568], 0.05, { type: 'triangle', vol: 0.06 });
  },
  iceThrow: (t, { tone, noise }) => {
    tone(1800, t, 0.25, { type: 'sine', vol: 0.06, slide: 0.5 });
    noise(t, 0.2, { vol: 0.1, freq: 4000, type: 'highpass' });
  },
  iceHit: (t, { tone, arp }) => {
    arp(t, [2093, 1760, 1568, 1319], 0.04, { type: 'triangle', vol: 0.08 });
    tone(400, t, 0.3, { type: 'sine', vol: 0.1, slide: 0.6 });
  },
  shieldClang: (t, { tone, noise }) => {
    tone(820, t, 0.18, { type: 'square', vol: 0.05, slide: 0.95 });
    tone(1230, t, 0.14, { type: 'triangle', vol: 0.06 });
    noise(t, 0.05, { vol: 0.12, freq: 3000, type: 'highpass' });
  },
  necroHeal: (t, { arp }) => arp(t, [659, 784, 988, 1175], 0.07, { type: 'sine', vol: 0.07 }),
  necroSummon: (t, { tone, noise }) => {
    tone(150, t, 0.9, { type: 'sawtooth', vol: 0.06, slide: 1.8 });
    noise(t, 0.8, { vol: 0.12, freq: 900, q: 0.5, type: 'bandpass' });
  },
  splitPop: (t, { tone, noise }) => {
    noise(t, 0.15, { vol: 0.25, freq: 1800, q: 0.8, type: 'bandpass' });
    tone(500, t, 0.12, { type: 'sine', vol: 0.12, slide: 1.8 });
    tone(500, t + 0.08, 0.12, { type: 'sine', vol: 0.12, slide: 2.2 });
  },
  crateDrop: (t, { arp }) => arp(t, [523, 784, 1047, 1568], 0.06, { type: 'triangle', vol: 0.1 }),
  crateOpen: (t, { arp, noise }) => {
    noise(t, 0.3, { vol: 0.2, freq: 2500, q: 0.6, type: 'bandpass' });
    arp(t + 0.05, [523, 659, 784, 1047, 1319, 1568, 2093], 0.06, { type: 'square', vol: 0.07 });
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
#tower-frost { position: fixed; inset: 0; z-index: 5; pointer-events: none; opacity: 0; transition: opacity 0.25s;
  background: radial-gradient(ellipse at center, rgba(180, 240, 255, 0) 50%, rgba(160, 230, 255, 0.45) 82%, rgba(225, 250, 255, 0.85) 100%); box-shadow: inset 0 0 60px rgba(255, 255, 255, 0.7); }
#tower-frost span { position: absolute; left: 50%; bottom: calc(230px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); font-weight: 900; font-size: 18px; color: #e1f5fe; -webkit-text-stroke: 2px #01579b; paint-order: stroke fill; }
#tower-wpn { position: fixed; left: calc(14px + env(safe-area-inset-left, 0px)); top: 34%; z-index: 7; pointer-events: none; padding: 6px 10px; border-radius: 14px; background: rgba(20, 8, 30, 0.78); border: 2px solid #7e57c2; color: #f3e5f5; font-size: 12px; font-weight: 800; max-width: 200px; }
#tower-wpn b { display: block; font-size: 12px; color: #ffd740; margin-bottom: 2px; }
#tower-wpn div { white-space: nowrap; }
body.mobile #tower-wpn { display: none; }
body.in-movie #tower-wpn { visibility: hidden; }
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
    frost: mk('tower-frost', '<span>❄️ BRRR! You are FROZEN (slow)</span>', true),
    wpn: mk('tower-wpn'),
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
    const floorM = new THREE.MeshStandardMaterial({ map: fTex, roughness: 0.92 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 0.8, 72), floorM);
    floor.rotation.x = -PI / 2;
    floor.receiveShadow = true;
    g.add(floor);
    const edgeM = new THREE.MeshStandardMaterial({ color: 0x241a30, roughness: 0.9 });
    const edge = new THREE.Mesh(new THREE.RingGeometry(R - 1.6, R + 0.8, 72), edgeM);
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
    const cauldronLights = [];
    for (const c of TOWER_CAULDRONS) {
      const l = new THREE.PointLight(0x76ff03, 10, 14, 1.6);
      l.position.set(c.x - A.x, 3, c.z - A.z);
      g.add(l);
      cauldronLights.push(l);
    }
    const doorLight = new THREE.PointLight(0xb388ff, 8, 14, 1.6);
    doorLight.position.set(0, 4, R - 2);
    g.add(doorLight);
    const shelfG = new THREE.Group(); // 🧩 書架焊埋之後放喺呢度（towerFloors.js 每層換主題時可以收埋）
    g.add(shelfG);
    bakeStatic(stat, shelfG); // 書架：焊埋（快好多）
    g.visible = false;
    return { g, floor, floorM, fTex, edge, edgeM, trim, top, trimM, shelfG, cauldronLights, doorLight, wall, wallM, wTex, winTex, lift, liftMat, beam, beamMat, decoCircles, portals, torches, fireMats, candles, cauldrons, flames, sky, broom, sign, signTex, center, exitGlow, theme: 0 };
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
  function drawSign(look = null) {
    if (!arena) return;
    const m = TOWER_MODES[R.mode];
    arena.signTex.dispose();
    const line2 = look?.name ? `${look.name}${isBossFloor(R.floor) ? ' · 👑 BOSS' : ''}` : `${m.emoji} ${m.name}${isBossFloor(R.floor) ? ' · 👑 MINI-BOSS' : ''}`;
    arena.signTex = floorSignTex([`FLOOR ${R.floor}`, line2], look?.color || ['#ea80fc', '#b2ff59', '#80d8ff', '#ffd180', '#ff80ab'][arena.theme]);
    arena.sign.material.map = arena.signTex;
    arena.sign.material.needsUpdate = true;
  }

  // ================= 遊戲狀態 =================
  const R = {
    inside: false, phase: 'idle', mode: 'medium', floor: 1, t: 0,
    hearts: TOWER_HEARTS, safeT: 0, regenT: 0, ko: -1, knock: V(),
    queue: [], spawnT: 0, liftHold: 0, god: false, calm: false,
    run: null, panel: 'modes', results: null, travelling: false, bossCount: 0,
    slowT: 0, slowMul: 1, crateChance: null,
  };
  // 🧩 擴充（Issue #15）：kinds = 新殭屍、bosses = 新 Boss、floor = 每層唔同嘅地圖；updates／clears = 每格／清場要做嘅嘢
  const EXT = { kinds: {}, bosses: {}, floor: null, updates: [], clears: [] };
  const extOf = (kind) => EXT.kinds[kind] || EXT.bosses[kind] || null;
  // 而家邊個喺度攻擊（😡 Angry Spell：攻擊目標變咗佢嘅朋友；🦇 加咗 buff 嘅打多 ❤️）
  let attacker = null;
  let angryVictim = null;
  const crates = []; // 📦 Weapon Crate（Issue #14）
  const enemies = [];
  const shots = []; // 🟢 Slime 彈
  const waves = []; // 💥 震波
  const fx = []; // 粒子
  const tmp = V();
  const playerPos = () => (angryVictim ? V(A.x + angryVictim.g.position.x, angryVictim.g.position.y, A.z + angryVictim.g.position.z) : V(camera.position.x, player.feetY, camera.position.z));
  const modeInfo = () => TOWER_MODES[R.mode] || TOWER_MODES.medium;
  const isBossFloor = (n) => n % TOWER_BOSS_EVERY === 0;
  const hpMul = (n) => (1 + TOWER_HP_GROWTH * (n - 1)) * modeInfo().hp;
  const speedMul = (n) => Math.min(TOWER_MAX_SPEED_MULT, 1 + TOWER_SPEED_GROWTH * (n - 1)) * modeInfo().speed;
  const doubleFloor = () => (modeInfo().damage < 0.8 ? Infinity : Math.round(TOWER_DOUBLE_DAMAGE_FLOOR / modeInfo().damage));
  const hitHearts = () => (R.floor >= doubleFloor() ? 2 : 1);
  const enemyCount = (n) => Math.min(TOWER_MAX_ENEMIES, Math.round(TOWER_BASE_ENEMIES + n * TOWER_ENEMIES_PER_FLOOR));
  const animalShare = (n) => (n < TOWER_ENEMIES.animal.from ? 0 : Math.min(TOWER_ANIMAL_SHARE_MAX, TOWER_ANIMAL_SHARE + n * TOWER_ANIMAL_SHARE_GROWTH));
  const bestOf = (mode) => state.towerBestByMode?.[mode] || 0;

  // ---- 🌳 Skill Tree（Issue #14，skillTree.js）：心數、回心、開局盾、獎品 ----
  const skill = (id, none = 1) => window.__skills?.mult(id) ?? none;
  const skillAdd = (id) => (window.__skills?.mult(id) ?? 1) - 1; // 加法嘅 skill（例如 crateLuck：每級 +1% = per 0.01）
  const maxHearts = () => Math.max(1, Math.round(TOWER_HEARTS * skill('health')));
  const regenTime = () => TOWER_HEART_REGEN / skill('regen');
  const lootAmount = (r) => {
    if (['demonicSkin', 'demonicBossSkin'].includes(r.type)) return r.amount;
    const m = skill('loot') * (['candyCorn', 'souls'].includes(r.type) ? skill('souls') : 1);
    return m === 1 ? r.amount : Math.max(1, Math.round(r.amount * m));
  };

  // ---- 🎒 袋 ----
  function bagAdd(r) {
    if (!R.run || !r) return;
    const amount = lootAmount(r);
    R.run.bag.set(r.type, (R.run.bag.get(r.type) || 0) + amount);
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
    for (let i = 0; i < maxHearts(); i++) {
      const full = i < R.hearts;
      const filling = i === R.hearts && R.hearts < maxHearts();
      html += `<span class="h ${full ? 'full' : 'empty'}${lostT > 0 && i >= lostAt && i < lostAt + 2 ? ' lost' : ''}${filling ? ' filling' : ''}">${full ? '❤️' : '🖤'}</span>`;
    }
    for (let i = 0; i < (R.shield || 0); i++) html += '<span class="h">🛡️</span>';
    if (html !== heartsHtml) ui.hearts.innerHTML = heartsHtml = html;
  }
  function hitPlayer(what, push = null) {
    // 😡 嬲咗嘅殭屍：打中佢嘅朋友，唔係你
    if (angryVictim) {
      const v = angryVictim;
      if (v.hp > 0 && v.target) {
        const dmg = Math.round(TOWER_ANGRY_DAMAGE * hpMul(R.floor));
        v.target.onHit(dmg, { angryHit: true });
        floatText(V(A.x + v.g.position.x, (v.isAnimal ? v.size.y : v.model.userData.height) + 0.6, A.z + v.g.position.z), [{ text: `😡 -${dmg}`, color: '#ff5252' }], 0.7, 0.9);
      }
      return true;
    }
    if (R.safeT > 0 || R.ko >= 0 || R.god || !['fight', 'intro'].includes(R.phase)) return false;
    if (R.shield > 0) { // 🛡️ Starting Shield 擋一下
      R.shield -= 1;
      R.safeT = TOWER_HIT_SAFE;
      play('heartBack');
      popup(`🛡️ Your shield blocked the ${what}!${R.shield ? ` ${R.shield} 🛡️ left` : ''}`);
      return true;
    }
    const n = hitHearts() + (attacker?.buffT > 0 ? attacker.buff.hearts || 0 : 0);
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
    const BASE = { walker: 5, runner: 3, spitter: 2, brute: 1.5 };
    const necros = enemies.filter((e) => e.kind === 'necro' && e.hp > 0).length + R.queue.filter((k) => k === 'necro').length;
    const bats = enemies.filter((e) => e.kind === 'bat' && e.hp > 0).length + R.queue.filter((k) => k === 'bat').length * 2;
    const w = Object.entries(TOWER_ENEMIES)
      .filter(([k, d]) => k !== 'animal' && n >= d.from && (k !== 'necro' || necros < 2)) // Necro-Witch 最多 2 隻
      .filter(([k, d]) => k !== 'bat' || bats < (d.maxAlive ?? 5)) // 蝙蝠一群群出：同一時間最多 maxAlive 隻
      .map(([k, d]) => [k, d.weight ?? BASE[k] ?? 1]);
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
    } else if (extOf(kind)) { // 🧩 擴充殭屍／Boss：build() 回傳一個好似 buildZombie 嘅 model（userData.animate/parts/height/flash/dispose）
      model = extOf(kind).build({ seed: seedN++, boss, floor: n, mode: R.mode });
      g.add(model);
      size = model.userData.size || V(0.9, model.userData.height, 0.6);
    } else {
      model = buildZombie(kind, { seed: seedN++ });
      g.add(model);
      size = V(0.9, model.userData.height, 0.6).multiplyScalar(1);
    }
    arena.g.add(g);
    g.position.x -= A.x;
    g.position.z -= A.z;
    const xk = extOf(kind);
    const bdef = boss ? TOWER_BOSSES[kind] : null; // 🧩 新 Boss 數值（balance.js TOWER_BOSSES）
    const def = boss ? null : TOWER_ENEMIES[isAnimal ? 'animal' : kind];
    let hp = def ? def.hp * hpMul(n) : (bdef ? bdef.hp : giant ? TOWER_BOSS_HP.giant : TOWER_BOSS_HP.king) * (1 + TOWER_BOSS_GROWTH * R.bossCount) * modeInfo().hp;
    hp = Math.round(hp);
    const baseSpeed = boss ? (bdef ? bdef.speed : giant ? 3.2 : 1.9) : def.speed;
    const e = {
      kind: boss ? (giant ? 'giant' : kind) : kind, isAnimal, boss, giant, g, model, corr, animal, size, xk,
      bossTitle: boss ? (giant ? `😵 GIANT CORRUPTED ${animal.name.toUpperCase()}` : bdef ? `${bdef.emoji} ${bdef.name.toUpperCase()}` : '👑 ZOMBIE KING') : null,
      buffT: 0, buff: null, angryT: 0,
      hp, maxHp: hp, speed: baseSpeed * speedMul(n) * (0.9 + Math.random() * 0.2),
      state: 'rise', t: 0, cd: rand(0.8, 1.6), atk: 0, dir: V(0, 0, -1), flashT: 0, bar: null, label: null, specialT: boss ? 4 : 0, summonT: boss ? 8 : 0, groanT: rand(2, 6),
      reach: (boss ? 2.6 : kind === 'brute' ? 1.9 : kind === 'splitter' || kind === 'shield' ? 1.6 : kind === 'mini' ? 1.1 : 1.35) + (isAnimal ? Math.max(size.x, size.z) * 0.35 : 0),
      radius: isAnimal ? Math.max(0.6, Math.max(size.x, size.z) * 0.38) : (boss ? 1.4 : kind === 'brute' ? 0.85 : kind === 'splitter' ? 0.75 : kind === 'shield' ? 0.7 : kind === 'mini' ? 0.38 : 0.55),
      healT: rand(2.5, 4), sumT: rand(5, 7), slowT: 0, slowMul: 1,
    };
    if (xk) { // 🧩 擴充：自己嘅打中範圍大細
      if (xk.reach != null) e.reach = typeof xk.reach === 'function' ? xk.reach(e) : xk.reach;
      if (xk.radius != null) e.radius = typeof xk.radius === 'function' ? xk.radius(e) : xk.radius;
      e.flying = !!xk.flying;
    }
    if (!boss) {
      e.bar = hpBar(isAnimal ? 1.3 : kind === 'brute' || kind === 'splitter' ? 1.5 : kind === 'mini' ? 0.75 : 1.1);
      e.bar.g.position.y = (isAnimal ? size.y : model.userData.height) + 0.45;
      g.add(e.bar.g);
      e.bar.set(1, isAnimal ? 0xea80fc : 0x76ff03);
    } else {
      e.label = makeLabel([{ text: giant ? `😵 GIANT Corrupted ${animal.name}` : bdef ? `${bdef.emoji} ${bdef.name.toUpperCase()}` : '👑 ZOMBIE KING', color: giant ? '#ea80fc' : bdef?.color || '#ffd740' }, { text: '', color: '#fff' }], 1.6);
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
        if (!isAnimal) {
          const fx = -Math.sin(g.rotation.y); // 模型面向 -z：fwd = 喺前面幾遠（🛡️ 盾牌）
          const fz = -Math.cos(g.rotation.y);
          return model.userData.parts().map((p) => ({ pos: V(wx + fx * (p.fwd || 0), g.position.y + p.y, wz + fz * (p.fwd || 0)), radius: p.radius, mult: p.mult, crit: p.crit, block: p.block }));
        }
        const fwd = e.dir;
        return [
          { pos: V(wx, g.position.y + size.y * 0.45, wz), radius: Math.max(size.x, size.y, size.z) * 0.45, mult: 1 },
          { pos: V(wx + fwd.x * size.z * 0.38, g.position.y + size.y * 0.72, wz + fwd.z * size.z * 0.38), radius: Math.min(size.x, size.y) * 0.32 + 0.15, mult: 1.5, crit: true },
        ];
      },
      alive: () => e.hp > 0 && e.state !== 'gone',
      onHit(dmg, info = {}) {
        if (e.hp <= 0) return false;
        // 🧩 擴充：可以擋（return false）或者改傷害（return 數字）
        if (xk?.onHit) {
          const r = xk.onHit(e, dmg, info);
          if (r === false) return false;
          if (typeof r === 'number') dmg = r;
        }
        // 😡 Angry Spell：變嬲，去打佢嘅朋友（Boss 唔受影響）
        if (info.angry && !e.boss) setAngry(e, info.angry.time);
        // 🛡️ Shield Zombie：打中塊盾 = 擋咗（爆炸、閃電繞得過）
        if (info.part?.block && !info.splash && !info.chain) {
          play('shieldClang');
          e.shieldFlash = 0.2;
          if (!R.run?.toldShield) {
            if (R.run) R.run.toldShield = true;
            popup('🛡️ The shield blocks your shots! Aim for its HEAD or go round its BACK (explosions get round it too)');
          }
          return false;
        }
        // ❄️ Frost Wand：慢落嚟（Boss 慢少啲）
        if (info.slow) {
          e.slowT = info.slow.time;
          e.slowMul = e.boss ? 1 - (1 - info.slow.mult) * 0.5 : info.slow.mult;
        }
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
    xk?.init?.(e);
    return e;
  }
  function removeEnemy(e) {
    e.xk?.remove?.(e);
    e.buffFx?.removeFromParent();
    e.angryFx?.removeFromParent();
    e.target?.remove();
    e.beam?.removeFromParent();
    e.jumpWarn?.removeFromParent();
    e.lineM?.removeFromParent();
    e.iceFx?.removeFromParent();
    for (const m of e.summonMarks || []) m.removeFromParent();
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
      s.warn?.removeFromParent();
      s.warn2?.removeFromParent();
    }
    shots.length = 0;
    for (const w of waves) w.m.removeFromParent();
    waves.length = 0;
    R.queue.length = 0;
    for (const p of [...pickups]) removePickup(p);
    for (const f of EXT.clears) f();
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
    const wp = V(A.x + e.g.position.x, 0, A.z + e.g.position.z);
    e.xk?.onPoof?.(e, wp);
    maybeShield(wp);
    // ✂️ Splitter：一開二 → 兩隻 Mini Zombie
    if (e.kind === 'splitter') {
      play('splitPop');
      const side = V(-e.dir.z, 0, e.dir.x);
      for (const sx of [-1, 1]) {
        const m = spawnEnemy('mini', { at: { x: wp.x + side.x * sx * 0.9, z: wp.z + side.z * sx * 0.9, glow: 0 } });
        m.state = 'walk';
        m.g.position.y = 0;
        m.cd = 0.8;
        m.hop = 0.45; // 彈出嚟
      }
      sparkle(V(wp.x, 1.5, wp.z), 0xffeb3b, 16, 4, 0.7, 0.6);
      if (!R.run.toldSplit) {
        R.run.toldSplit = true;
        popup('✂️ The Splitter Zombie split into 2 Mini Zombies!');
      }
    }
    // 📦 Weapon Crate：5% 機會（Boss 一定跌）
    const chance = e.boss ? 1 : R.crateChance ?? TOWER_CRATE_CHANCE + skillAdd('crateLuck');
    if (Math.random() < chance) dropCrate(wp);
  }

  // ================= 📦 Weapon Crate（Issue #14）=================
  function dropCrate(p) {
    const m = buildWeaponCrate();
    m.position.set(p.x - A.x, 0, p.z - A.z);
    tmp.set(p.x, 0, p.z);
    clampTower(tmp, 1.2);
    const to = V(tmp.x - A.x, 0, tmp.z - A.z);
    arena.g.add(m);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 9, 20, 1, true), ADDM(0xe040fb, 0.18));
    beam.position.y = 4.5;
    m.add(beam);
    const label = makeLabel([{ text: '📦 WEAPON CRATE', color: '#ffd740' }, { text: 'Walk over it!', color: '#ffffff' }], 0.8);
    label.position.y = 2.2;
    m.add(label);
    crates.push({ m, beam, label, from: m.position.clone(), to, t: 0, open: -1 });
    play('crateDrop');
    sparkle(V(p.x, 1, p.z), 0xe040fb, 14, 3, 0.8, 0.6);
    if (!R.run?.toldCrate) {
      if (R.run) R.run.toldCrate = true;
      popup('📦 A zombie dropped a WEAPON CRATE! Walk over it to get a new weapon!');
    }
  }
  function rollWeapon() {
    const have = R.run?.loadout || [];
    const pool = Object.values(WEAPONS).filter((w) => !have.includes(w.id));
    if (!pool.length) return null;
    const wt = (w) => WEAPON_RARITY[w.rarity]?.weight ?? 10;
    let r = Math.random() * pool.reduce((a, w) => a + wt(w), 0);
    return pool.find((w) => (r -= wt(w)) < 0) || pool[pool.length - 1];
  }
  function giveRunWeapon(def) {
    if (!R.run || !def) return;
    if (!R.run.loadout.includes(def.id)) R.run.loadout.push(def.id);
    weapons.setLoadout('tower', R.run.loadout);
    weapons.select(def.id);
    R.run.found.push(def.id);
  }
  function openCrate(c) {
    c.open = 0;
    play('crateOpen');
    const def = rollWeapon();
    const wp = V(A.x + c.m.position.x, 1.2, A.z + c.m.position.z);
    if (!def) {
      weapons.refill();
      floatText(V(wp.x, 2.6, wp.z), [{ text: '🔋 FULL AMMO!', color: '#69f0ae' }, { text: 'You have every weapon!', color: '#fff' }], 1);
      popup('📦 You already have every weapon, so the crate refills all your ammo!');
      return;
    }
    const rar = WEAPON_RARITY[def.rarity] || WEAPON_RARITY.common;
    giveRunWeapon(def);
    const col = parseInt(rar.color.slice(1), 16);
    sparkle(wp, col, 30, 5, 1, 0.8);
    sparkle(wp, 0xffffff, 12, 3, 0.8, 0.5);
    floatText(V(wp.x, 2.8, wp.z), [{ text: `${def.emoji} ${def.name}`, color: rar.color }, { text: `${rar.name} weapon!`, color: '#ffffff' }], 1.1, 2.2);
    bigText(`${def.emoji} ${def.name.toUpperCase()}!`, `📦 NEW ${rar.name.toUpperCase()} WEAPON for this tower run · press ${R.run.loadout.length} to switch`, rar.color);
  }
  function updateCrates(dt, time) {
    const pp = playerPos();
    for (let i = crates.length - 1; i >= 0; i--) {
      const c = crates[i];
      c.t += dt;
      if (c.t < 0.6) { // 彈出嚟：拋物線
        const k = c.t / 0.6;
        c.m.position.lerpVectors(c.from, c.to, k);
        c.m.position.y = Math.sin(k * PI) * 2.2;
      } else c.m.position.y = 0;
      c.m.userData.animate(time);
      c.beam.material.opacity = 0.12 + Math.sin(time * 4) * 0.06;
      if (c.open < 0) {
        const d = Math.hypot(pp.x - A.x - c.m.position.x, pp.z - A.z - c.m.position.z);
        if (c.t > 0.6 && d < 1.8 && player.feetY < 2.5 && R.ko < 0 && R.run) openCrate(c);
        if (Math.random() < dt * 5) sparkle(V(A.x + c.m.position.x, 0.6, A.z + c.m.position.z), 0xffd740, 1, 1, 0.8, 0.4);
        continue;
      }
      c.open += dt;
      c.m.userData.open(Math.min(1, c.open / 0.25));
      const k = c.open / 0.7;
      c.m.scale.setScalar(Math.max(0.01, 1 - Math.max(0, k - 0.4) / 0.6));
      c.label.material.opacity = Math.max(0, 1 - k * 2);
      if (k >= 1) removeCrate(c);
    }
  }
  function removeCrate(c) {
    c.m.removeFromParent();
    c.m.userData.dispose();
    c.beam.geometry.dispose();
    c.beam.material.dispose();
    c.label.material.map?.dispose();
    const i = crates.indexOf(c);
    if (i >= 0) crates.splice(i, 1);
  }
  // ================= 😡 Angry + 🦇 Buff（Issue #15）=================
  function setAngry(e, time) {
    e.angryT = Math.max(e.angryT, time);
    if (!e.angryFx) {
      e.angryFx = makeLabel([{ text: '😡 ANGRY!', color: '#ff5252' }], 0.75);
      e.g.add(e.angryFx);
    }
    e.state = e.state === 'rise' ? 'rise' : 'walk';
    e.t = 0;
    sparkle(V(A.x + e.g.position.x, 1.6, A.z + e.g.position.z), 0xff1744, 12, 3, 0.6, 0.6);
  }
  function angryTargetOf(e) {
    if (e.angryVictim && e.angryVictim.hp > 0 && enemies.includes(e.angryVictim) && e.angryVictim.state !== 'cured' && e.angryVictim.state !== 'poof') return e.angryVictim;
    let best = null;
    let bd = Infinity;
    for (const o of enemies) {
      if (o === e || o.hp <= 0 || o.state === 'poof' || o.state === 'cured' || o.state === 'rise') continue;
      const d = Math.hypot(o.g.position.x - e.g.position.x, o.g.position.z - e.g.position.z);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    e.angryVictim = best;
    return best;
  }
  // 🦇 令敵人變強一陣：{ time 秒, speed 快幾多倍, hearts 打中多扣幾多 ❤️, color }
  function buffEnemy(e, { time = 10, speed = 1.5, hearts = 1, color = 0xff1744 } = {}) {
    if (!e || e.hp <= 0 || e.state === 'poof' || e.state === 'cured') return;
    e.buffT = Math.max(e.buffT, time);
    e.buff = { speed, hearts };
    if (!e.buffFx) {
      const h = e.isAnimal ? e.size.y : e.model.userData.height;
      e.buffFx = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
      e.buffFx.scale.set(Math.max(1.8, h), h * 1.3, 1);
      e.buffFx.position.y = h * 0.5;
      e.g.add(e.buffFx);
    } else e.buffFx.material.color.setHex(color);
  }

  // ================= 🛡️ 盾牌掉落（Issue #15：打散／救返任何敵人 4%）=================
  const pickups = [];
  function maybeShield(p) {
    if (!R.run || Math.random() >= (R.shieldChance ?? TOWER_SHIELD_DROP + skillAdd('shieldLuck'))) return;
    const g = new THREE.Group();
    tmp.set(p.x, 0, p.z);
    clampTower(tmp, 1.2);
    g.position.set(tmp.x - A.x, 0.9, tmp.z - A.z);
    const em = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x64b5f6, emissive: 0x2979ff, emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.3 }));
    em.rotation.x = PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffd740, emissive: 0xffab00, emissiveIntensity: 0.8, metalness: 0.8 }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color: 0x82b1ff, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(2.2);
    const spin = new THREE.Group();
    spin.add(em, rim);
    g.add(spin, glow);
    arena.g.add(g);
    pickups.push({ g, spin, glow, t: 0 });
    play('crateDrop');
    sparkle(V(p.x, 1, p.z), 0x82b1ff, 12, 3, 0.7, 0.5);
    if (!R.run.toldShieldDrop) {
      R.run.toldShieldDrop = true;
      popup('🛡️ A SHIELD dropped! Walk over it: it blocks 1 hit');
    }
  }
  function removePickup(p) {
    p.g.removeFromParent();
    p.g.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    const i = pickups.indexOf(p);
    if (i >= 0) pickups.splice(i, 1);
  }
  function updatePickups(dt, time) {
    const pp = playerPos();
    for (const p of [...pickups]) {
      p.t += dt;
      p.spin.rotation.y += dt * 2.5;
      p.g.position.y = 0.9 + Math.sin(time * 3 + p.t) * 0.2;
      p.glow.material.opacity = 0.5 + Math.sin(time * 5) * 0.2;
      const d = Math.hypot(pp.x - A.x - p.g.position.x, pp.z - A.z - p.g.position.z);
      if (d < 1.6 && player.feetY < 2.5 && R.ko < 0) {
        const max = TOWER_SHIELD_MAX;
        if ((R.shield || 0) >= max) {
          if (!p.told) popup(`🛡️ You already have ${max} shields (the most)!`);
          p.told = true;
          continue;
        }
        R.shield = (R.shield || 0) + 1;
        play('heartBack');
        sparkle(V(A.x + p.g.position.x, 1, A.z + p.g.position.z), 0x82b1ff, 20, 4, 0.8, 0.6);
        floatText(V(A.x + p.g.position.x, 2, A.z + p.g.position.z), [{ text: '+1 🛡️ SHIELD', color: '#82b1ff' }], 0.9);
        removePickup(p);
      } else if (p.t > 30) removePickup(p); // 30 秒冇人執就消失
    }
  }

  function drawWeaponList() {
    if (!R.run) return;
    const html = `<b>🔫 Tower weapons</b>${R.run.loadout.map((id, i) => {
      const w = WEAPONS[id];
      return `<div style="color:${WEAPON_RARITY[w.rarity]?.color || '#fff'}">${i + 1} · ${w.emoji} ${w.name}</div>`;
    }).join('')}<div style="opacity:.75">📦 Crates: ${Math.round((R.crateChance ?? TOWER_CRATE_CHANCE + skillAdd('crateLuck')) * 100)}% per zombie</div>`;
    if (ui.wpn.innerHTML !== html) ui.wpn.innerHTML = html;
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
    maybeShield(V(p.x, 0, p.z));
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
    shots.push({ g: sg, ball, warn, from, to, t: 0, dur: 1.15, owner: e, angry: angryVictim });
    play('slimeSpit');
  }
  function shockwave(e, maxR = 15) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), ADDM(e.giant ? 0xd500f9 : 0xff6d00, 0.85));
    m.rotation.x = -PI / 2;
    m.position.set(e.g.position.x, 0.1, e.g.position.z);
    arena.g.add(m);
    waves.push({ m, r: 1, max: maxR, hit: false, owner: e });
    play('shockwave');
    shake = Math.max(shake, 0.6);
    if (!R.run.toldJump) {
      R.run.toldJump = true;
      popup('⚠️ JUMP over the shockwave! (Space)');
    }
  }
  // 💣 Bomber：南瓜炸彈（紅色實心圈 = 會爆嘅範圍，越嚟越紅）
  const BOMB_R = 2.6;
  function throwBomb(e) {
    const pp = playerPos();
    const from = V(e.g.position.x, 2.6 * (e.model.scale.x || 1), e.g.position.z);
    tmp.set(pp.x + rand(-0.6, 0.6), 0, pp.z + rand(-0.6, 0.6));
    clampTower(tmp, 1);
    const to = V(tmp.x - A.x, 0.25, tmp.z - A.z);
    const sg = new THREE.Group();
    const bomb = projectileModel('pumpkin', 0xff6d00);
    bomb.scale.setScalar(1.6);
    sg.add(bomb);
    arena.g.add(sg);
    const warn = new THREE.Mesh(new THREE.CircleGeometry(BOMB_R, 40), ADDM(0xff1744, 0));
    warn.rotation.x = -PI / 2;
    warn.position.set(to.x, 0.07, to.z);
    arena.g.add(warn);
    const warn2 = new THREE.Mesh(new THREE.RingGeometry(BOMB_R - 0.15, BOMB_R, 40), ADDM(0xff5252, 0.9));
    warn2.rotation.x = -PI / 2;
    warn2.position.set(to.x, 0.08, to.z);
    arena.g.add(warn2);
    shots.push({ type: 'bomb', g: sg, ball: bomb, warn, warn2, from, to, t: 0, dur: 1.45, owner: e, angry: angryVictim });
    play('bombThrow');
    play('bombFuse');
    if (!R.run.toldBomb) {
      R.run.toldBomb = true;
      popup('💣 Pumpkin bomb! Get OUT of the red circle before it goes BOOM!');
    }
  }
  // ❄️ Frost：直線飛嘅冰波（地上藍色線 = 會飛嘅路線）；打中 = 慢落嚟
  function throwIce(e) {
    const pp = playerPos();
    const from = V(e.g.position.x, 1.3 * e.model.scale.x, e.g.position.z);
    const dir = V(pp.x - A.x - from.x, 0, pp.z - A.z - from.z).normalize();
    const sg = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), new THREE.MeshStandardMaterial({ color: 0xb3f0ff, emissive: 0x40c4ff, emissiveIntensity: 1.8, roughness: 0.15, flatShading: true }));
    sg.add(ball);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color: 0x80e8ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(1.8);
    sg.add(halo);
    sg.position.copy(from);
    arena.g.add(sg);
    shots.push({ type: 'ice', g: sg, ball, halo, vel: dir.multiplyScalar(13), t: 0, dur: 2.4, owner: e, angry: angryVictim });
    play('iceThrow');
  }
  function lineWarn(e, len, color) {
    if (!e.lineM) {
      e.lineM = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ADDM(color, 0));
      e.lineM.rotation.x = -PI / 2;
      arena.g.add(e.lineM);
    }
    const pp = playerPos();
    const dx = pp.x - A.x - e.g.position.x;
    const dz = pp.z - A.z - e.g.position.z;
    const d = Math.hypot(dx, dz) || 1;
    e.lineM.scale.set(0.9, len, 1);
    e.lineM.position.set(e.g.position.x + (dx / d) * len * 0.5, 0.06, e.g.position.z + (dz / d) * len * 0.5);
    e.lineM.rotation.z = Math.atan2(dx / d, dz / d);
    e.lineM.visible = true;
    return e.lineM;
  }
  // 🧙 Necro-Witch：綠色光束醫朋友
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).rotateX(PI / 2);
  function orbPos(e) {
    const o = e.model.userData.orb;
    if (!o) return V(e.g.position.x, 2.6, e.g.position.z);
    o.getWorldPosition(tmp);
    return V(tmp.x - A.x, tmp.y, tmp.z - A.z);
  }
  function setBeam(e, to) {
    if (!e.beam) {
      e.beam = new THREE.Group();
      e.beam.add(new THREE.Mesh(beamGeo, ADDM(0xccffd8, 0.95)), new THREE.Mesh(beamGeo, ADDM(0x00e676, 0.6)));
      e.beam.children[0].scale.set(0.06, 0.06, 1);
      e.beam.children[1].scale.set(0.25, 0.25, 1);
      arena.g.add(e.beam);
    }
    const from = orbPos(e);
    const len = from.distanceTo(to);
    e.beam.position.copy(from).lerp(to, 0.5);
    e.beam.lookAt(tmp.copy(to).add(arena.g.position));
    e.beam.scale.set(1, 1, len);
    e.beam.visible = true;
  }
  function slowPlayer(mult, time) {
    R.slowT = Math.max(R.slowT, time);
    R.slowMul = mult;
    play('iceHit');
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
    // ❄️ 俾 Frost Wand 凍住：成隻慢鏡（藍色冰光）
    if (e.slowT > 0 && e.state !== 'poof' && e.state !== 'cured') {
      e.slowT -= dt;
      dt *= e.slowMul;
      if (!e.iceFx) {
        // 淡淡藍光 + 腳下冰圈 + 一圈冰柱（凍住咗嘅樣）
        e.iceFx = new THREE.Group();
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color: 0x40c4ff, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
        const h = e.isAnimal ? e.size.y : e.model.userData.height;
        s.scale.set(Math.max(1.6, h * 0.9), h * 1.2, 1);
        s.position.y = h * 0.5;
        const ringM = new THREE.Mesh(new THREE.RingGeometry(e.radius + 0.2, e.radius + 0.5, 24), ADDM(0xb3f0ff, 0.7));
        ringM.rotation.x = -PI / 2;
        ringM.position.y = 0.08;
        e.iceFx.add(s, ringM);
        const iceM = new THREE.MeshStandardMaterial({ color: 0xb3f0ff, emissive: 0x40c4ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.8, roughness: 0.1, flatShading: true });
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * PI * 2 + rand(-0.2, 0.2);
          const c = new THREE.Mesh(new THREE.ConeGeometry(0.12 + rand(0, 0.08), 0.5 + rand(0, 0.5), 5), iceM);
          c.position.set(Math.cos(a) * (e.radius + 0.25), 0.25, Math.sin(a) * (e.radius + 0.25));
          c.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
          e.iceFx.add(c);
        }
        e.g.add(e.iceFx);
      }
      e.iceFx.visible = true;
      e.iceFx.children[0].material.opacity = 0.16 + Math.sin(time * 8) * 0.06;
      if (Math.random() < dt * 8) sparkle(V(A.x + e.g.position.x + rand(-0.5, 0.5), rand(0.5, 2), A.z + e.g.position.z + rand(-0.5, 0.5)), 0xe1f5fe, 1, 0.6, 0.6, 0.3);
    } else if (e.iceFx) e.iceFx.visible = false;
    if (e.shieldFlash > 0) e.shieldFlash -= dt;
    // 🦇 Buff（快啲 + 打多 ❤️）：成隻快鏡 + 紅光
    if (e.buffT > 0 && e.state !== 'poof' && e.state !== 'cured') {
      e.buffT -= dt;
      dt *= e.buff.speed || 1;
      if (e.buffFx) {
        e.buffFx.visible = true;
        e.buffFx.material.opacity = 0.35 + Math.sin(time * 10) * 0.12;
      }
    } else if (e.buffFx) e.buffFx.visible = false;
    // 😡 Angry：頭頂嬲嬲樣，倒數
    if (e.angryT > 0) {
      e.angryT -= dt;
      if (e.angryFx) e.angryFx.position.y = (e.isAnimal ? e.size.y : e.model.userData.height) + 1.1 + Math.sin(time * 8) * 0.1;
      if (e.angryT <= 0) {
        e.angryFx?.removeFromParent();
        e.angryFx = null;
        e.model.userData.flash?.(0);
      } else e.model.userData.angryTint?.(1);
    }
    if (e.hop > 0) { // 細殭屍彈出嚟
      e.hop -= dt;
      e.g.position.y = Math.max(0, Math.sin((1 - e.hop / 0.45) * PI) * 0.9);
    }
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
          floatText(V(p.x, p.y + 1.2, p.z), [{ text: e.boss ? `${e.bossTitle.split(' ')[0]} POOF!!` : 'POOF! 🍬', color: '#ff80ab' }], e.boss ? 1.6 : 0.9);
          if (e.boss) popup(`${e.bossTitle} went POOF into candy! 🍬`);
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
    if (e.xk?.update) e.xk.update(e, dt, time, { dx, dz, dist, face, move });
    else if (e.isAnimal) updateCharger(e, dt, time, dx, dz, dist);
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
    const px = () => e.g.position.x + dx + A.x; // 玩家（世界座標）
    const pz = () => e.g.position.z + dz + A.z;
    const g = e.g;
    const nx = dist > 0.01 ? dx / dist : 0;
    const nz = dist > 0.01 ? dz / dist : 0;
    e.dir.set(nx, 0, nz);
    // 👑 Zombie King：震波 + 叫細殭屍
    if (e.kind === 'king') {
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
    const RANGED = { spitter: [7, 11, 22], bomber: [9, 14, 20], frost: [6, 11, 16], necro: [10, 15, 0] }; // [太近就退, 太遠就行近, 幾近先攻擊]
    switch (e.state) {
      case 'walk': {
        face(dx, dz, e.kind === 'shield' ? 2.2 : 8); // 🛡️ 轉身慢：繞去佢後面！
        const rg = RANGED[e.kind];
        if (rg) {
          // 企遠遠掟嘢
          const want = dist > rg[1] ? 1 : dist < rg[0] ? -0.8 : 0;
          if (want) move(nx * want, nz * want, e.speed);
          u.animate(time, Math.abs(want), 0);
          if (e.kind === 'necro') { necroThink(e, dt); return; }
          if (e.cd <= 0 && dist < rg[2]) {
            e.state = 'windup';
            e.t = 0;
          }
          return;
        }
        // 🦘 Leaper：唔太近又唔太遠 → 踎低，準備撲
        if (e.kind === 'leaper' && e.cd <= 0 && dist < 11 && dist > 3) {
          e.state = 'crouch';
          e.t = 0;
          tmp.set(px(), 0, pz());
          clampTower(tmp, 1);
          e.jumpFrom = V(g.position.x, 0, g.position.z);
          e.jumpTo = V(tmp.x - A.x, 0, tmp.z - A.z);
          if (!e.jumpWarn) {
            e.jumpWarn = new THREE.Group();
            const fill = new THREE.Mesh(new THREE.CircleGeometry(1.9, 32), ADDM(0xff1744, 0.2));
            const edge = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.9, 32), ADDM(0xff5252, 0.9));
            fill.rotation.x = edge.rotation.x = -PI / 2;
            e.jumpWarn.add(fill, edge);
            arena.g.add(e.jumpWarn);
          }
          e.jumpWarn.position.set(e.jumpTo.x, 0.07, e.jumpTo.z);
          e.jumpWarn.visible = true;
          play('leapCrouch');
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
        const wind = e.kind === 'spitter' || e.kind === 'frost' ? 0.6 : e.kind === 'bomber' ? 0.85 : e.boss ? 0.7 : 0.5;
        u.animate(time, 0, Math.min(0.6, (e.t / wind) * 0.6));
        if (u.bomb) u.bomb.visible = true; // 💣 舉起個南瓜炸彈
        if (e.kind === 'frost') lineWarn(e, Math.min(16, dist + 2), 0x80e8ff).material.opacity = 0.15 + (e.t / wind) * 0.4;
        if (e.t >= wind) {
          if (e.kind === 'spitter') spit(e);
          else if (e.kind === 'bomber') {
            u.bomb.visible = false;
            throwBomb(e);
          } else if (e.kind === 'frost') {
            if (e.lineM) e.lineM.visible = false;
            throwIce(e);
          } else if (dist < e.reach + 0.6) {
            const push = e.boss || e.kind === 'brute' ? { x: (dx / Math.max(0.1, dist)) * 10, y: 5, z: (dz / Math.max(0.1, dist)) * 10 } : null;
            hitPlayer(e.boss ? `${e.bossTitle} smashed you` : `A ${TOWER_ENEMIES[e.kind]?.name || 'zombie'} bonked you`, push);
          }
          e.state = 'recover';
          e.t = 0;
        }
        return;
      }
      case 'recover': {
        u.animate(time, 0, Math.min(1, 0.6 + (e.t / 0.4) * 0.4));
        if (e.t > (e.recoverDur || 0.45)) {
          e.state = 'walk';
          e.t = 0;
          e.recoverDur = 0;
          const CD = { spitter: 3.2, bomber: 3.8, frost: 3, leaper: 2.6, necro: 1.5 };
          e.cd = (CD[e.kind] ?? (e.boss ? 1.6 : 1.3)) / Math.sqrt(speedMul(R.floor));
        }
        return;
      }
      case 'crouch': { // 🦘 踎低（紅圈 = 會撲落嚟嘅位）
        face(e.jumpTo.x - g.position.x, e.jumpTo.z - g.position.z, 10);
        u.crouch = Math.min(1, e.t / 0.3);
        u.animate(time, 0, 0);
        g.position.x += Math.sin(e.t * 50) * 0.01;
        e.jumpWarn.children[0].material.opacity = 0.15 + (e.t / 0.8) * 0.35 + Math.sin(e.t * 22) * 0.06;
        if (e.t >= 0.8) {
          e.state = 'pounce';
          e.t = 0;
          u.crouch = 0;
          play('chargeGo');
        }
        return;
      }
      case 'pounce': { // 🦘 撲！（拋物線飛過去）
        const k = Math.min(1, e.t / 0.6);
        g.position.x = THREE.MathUtils.lerp(e.jumpFrom.x, e.jumpTo.x, k);
        g.position.z = THREE.MathUtils.lerp(e.jumpFrom.z, e.jumpTo.z, k);
        g.position.y = Math.sin(k * PI) * 3.4;
        u.animate(time, 0, 0.5);
        if (k >= 1) {
          g.position.y = 0;
          e.jumpWarn.visible = false;
          play('leapLand');
          shake = Math.max(shake, 0.25);
          sparkle(V(A.x + g.position.x, 0.3, A.z + g.position.z), 0xb0bec5, 14, 4, 0.5, 0.7);
          const pp = playerPos();
          const ddx = pp.x - A.x - g.position.x;
          const ddz = pp.z - A.z - g.position.z;
          const d = Math.hypot(ddx, ddz);
          if (d < 2.0 && player.feetY < 1.2) hitPlayer('The Leaper Zombie POUNCED on you', { x: (ddx / Math.max(0.1, d)) * 9, y: 5, z: (ddz / Math.max(0.1, d)) * 9 });
          e.state = 'recover';
          e.t = 0;
          e.recoverDur = 1.0; // 落地之後暈一暈：快啲打佢！
        }
        return;
      }
      case 'heal': { // 🧙 綠光醫朋友
        const o = e.healTarget;
        if (!o || o.hp <= 0 || !enemies.includes(o) || e.t > 1.6) {
          if (e.beam) e.beam.visible = false;
          e.state = 'recover';
          e.t = 0;
          e.healT = rand(5, 7);
          return;
        }
        face(o.g.position.x - g.position.x, o.g.position.z - g.position.z, 8);
        u.animate(time, 0, 0.35 + Math.sin(e.t * 10) * 0.05);
        const h = o.isAnimal ? o.size.y : o.model.userData.height;
        setBeam(e, V(o.g.position.x, o.g.position.y + h * 0.6, o.g.position.z));
        const heal = ((TOWER_ENEMIES.necro.heal || 160) * hpMul(R.floor) / 1.6) * dt;
        o.hp = Math.min(o.maxHp, o.hp + heal);
        if (Math.random() < dt * 14) sparkle(V(A.x + o.g.position.x, o.g.position.y + h * rand(0.2, 1), A.z + o.g.position.z), 0x69f0ae, 1, 1.2, 0.8, 0.45);
        if (Math.random() < dt * 3) floatText(V(A.x + o.g.position.x, h + 0.8, A.z + o.g.position.z), [{ text: '💚 +HEAL', color: '#69f0ae' }], 0.6, 0.8);
        return;
      }
      case 'summon': { // 🧙 叫 Mini Zombie：地上兩個綠色魔法陣 → 爬出嚟
        u.animate(time, 0, Math.min(0.6, e.t));
        for (const m of e.summonMarks) {
          m.rotation.z += dt * 3;
          m.material.opacity = Math.min(0.9, e.t);
        }
        if (Math.random() < dt * 10) {
          const m = e.summonMarks[Math.floor(Math.random() * e.summonMarks.length)];
          sparkle(V(A.x + m.position.x, 0.3, A.z + m.position.z), 0x69f0ae, 1, 1.5, 0.8, 0.5);
        }
        if (e.t >= 1.1) {
          for (const m of e.summonMarks) {
            spawnEnemy('mini', { at: { x: A.x + m.position.x, z: A.z + m.position.z, glow: 0 } });
            m.removeFromParent();
          }
          e.summonMarks = [];
          e.state = 'recover';
          e.t = 0;
          e.sumT = rand(10, 13);
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
  // 🧙 Necro-Witch：醫朋友（扣咗血嗰隻）或者叫 Mini Zombie
  function necroThink(e, dt) {
    e.healT -= dt;
    e.sumT -= dt;
    if (e.healT <= 0) {
      const g = e.g.position;
      const hurt = enemies.filter((o) => o !== e && !o.isAnimal && o.hp > 0 && o.hp < o.maxHp * 0.9 && o.state !== 'poof' && Math.hypot(o.g.position.x - g.x, o.g.position.z - g.z) < 18)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (hurt) {
        e.state = 'heal';
        e.t = 0;
        e.healTarget = hurt;
        play('necroHeal');
        if (!R.run.toldNecro) {
          R.run.toldNecro = true;
          popup('🧙 The Necro-Witch Zombie is HEALING its friends with a green beam! Poof it first!');
        }
        return;
      }
      e.healT = 1.5;
    }
    if (e.sumT <= 0) {
      const alive = enemies.filter((o) => o.state !== 'poof' && o.state !== 'cured').length;
      if (alive >= TOWER_MAX_AT_ONCE + 2) {
        e.sumT = 3;
        return;
      }
      e.state = 'summon';
      e.t = 0;
      play('necroSummon');
      const tex = arena.portals[0].mesh.material.map;
      e.summonMarks = [-1, 1].map((sx) => {
        const m = new THREE.Mesh(new THREE.CircleGeometry(1.1, 28), ADDM(0x69f0ae, 0));
        m.material.map = tex;
        m.rotation.x = -PI / 2;
        tmp.set(A.x + e.g.position.x - e.dir.z * sx * 2 + e.dir.x * 1.5, 0, A.z + e.g.position.z + e.dir.x * sx * 2 + e.dir.z * 1.5);
        clampTower(tmp, 1);
        m.position.set(tmp.x - A.x, 0.06, tmp.z - A.z);
        arena.g.add(m);
        return m;
      });
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
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      attacker = s.owner || null;
      angryVictim = s.angry && s.angry.hp > 0 && enemies.includes(s.angry) ? s.angry : null;
      const pp = playerPos();
      s.t += dt;
      if (s.type === 'ice') { // ❄️ 直線飛
        s.g.position.addScaledVector(s.vel, dt);
        s.ball.rotation.x += dt * 6;
        s.ball.rotation.y += dt * 4;
        if (Math.random() < dt * 25) sparkle(V(A.x + s.g.position.x, s.g.position.y, A.z + s.g.position.z), 0xe1f5fe, 1, 0.4, 0.5, 0.35);
        const hd = Math.hypot(pp.x - A.x - s.g.position.x, pp.z - A.z - s.g.position.z);
        const hitMe = hd < 0.95 && Math.abs(s.g.position.y - (player.feetY + 0.9)) < 1.2;
        const out = !inTowerArena(A.x + s.g.position.x, A.z + s.g.position.z) || Math.hypot(s.g.position.x, s.g.position.z) > A.r - 1;
        if (hitMe || out || s.t > s.dur) {
          sparkle(V(A.x + s.g.position.x, s.g.position.y, A.z + s.g.position.z), 0x80e8ff, 12, 3, 0.6, 0.55);
          if (hitMe && hitPlayer('Brrr! An ice ball froze you')) {
            const d = TOWER_ENEMIES.frost;
            slowPlayer(d.slow ?? 0.5, d.slowTime ?? 2.5);
          }
          s.g.removeFromParent();
          s.ball.geometry.dispose();
          s.halo.material.dispose();
          shots.splice(i, 1);
        }
        continue;
      }
      const k = Math.min(1, s.t / s.dur);
      if (s.type === 'bomb') { // 💣 拋物線 + 紅圈越嚟越紅 → BOOM
        s.g.position.lerpVectors(s.from, s.to, k);
        s.g.position.y += Math.sin(k * PI) * 6;
        s.ball.userData.fly(null, s.t, dt);
        s.warn.material.opacity = 0.12 + k * k * 0.45 + (k > 0.7 ? Math.sin(s.t * 30) * 0.08 : 0);
        s.warn2.scale.setScalar(1.15 - k * 0.15);
        if (k >= 1) {
          play('bombBoom');
          shake = Math.max(shake, 0.35);
          const wp = V(A.x + s.to.x, 0.6, A.z + s.to.z);
          candyBurst(wp, 22, 1.1);
          sparkle(wp, 0xff9100, 24, 6, 0.6, 0.9);
          sparkle(wp, 0xffeb3b, 12, 4, 0.5, 0.6);
          const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), ADDM(0xff9100, 0.9));
          ring.rotation.x = -PI / 2;
          ring.position.set(s.to.x, 0.1, s.to.z);
          particle(ring, { life: 0.4, grav: 0, shrink: false, fade: (o, kk) => { o.scale.setScalar(BOMB_R * (1.2 - kk)); o.material.opacity = kk * 0.9; } });
          const ddx = pp.x - A.x - s.to.x;
          const ddz = pp.z - A.z - s.to.z;
          const d = Math.hypot(ddx, ddz);
          if (d < BOMB_R && player.feetY < 2.2) hitPlayer('BOOM! A pumpkin bomb got you', { x: (ddx / Math.max(0.1, d)) * 8, y: 6, z: (ddz / Math.max(0.1, d)) * 8 });
          s.g.removeFromParent();
          s.ball.userData.dispose();
          s.warn.removeFromParent();
          s.warn2.removeFromParent();
          s.warn.geometry.dispose();
          s.warn2.geometry.dispose();
          shots.splice(i, 1);
        }
        continue;
      }
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
    attacker = null;
    angryVictim = null;
  }
  function updateWaves(dt) {
    const pp = playerPos();
    const px = pp.x - A.x;
    const pz = pp.z - A.z;
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      attacker = w.owner || null;
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
    attacker = null;
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
    R.bossPending = boss ? bossFor(n) : null;
    applyTheme(n - 1);
    const look = EXT.floor?.start?.(n, R.mode); // 🧩 { name, color }：呢層嘅主題（towerFloors.js）
    drawSign(look);
    const sub = boss ? '👑 MINI-BOSS FLOOR!' : `${count} enemies · ${TOWER_MODES[R.mode].emoji} ${TOWER_MODES[R.mode].name}`;
    bigText(`FLOOR ${n}`, look?.name ? `${look.name} · ${sub}` : sub, boss ? '#ff4081' : look?.color || '#d500f9');
    if (boss) play('bossIntro');
  }
  // 👑 Boss 輪住嚟：Zombie King → GIANT 動物 → 新 Boss（TOWER_BOSS_ORDER 次序，見 balance.js）
  function bossFor(n) {
    const list = ['king', 'giant', ...Object.keys(EXT.bosses)];
    const order = TOWER_BOSS_ORDER?.filter((k) => list.includes(k));
    const use = order?.length ? order : list;
    return use[(Math.round(n / TOWER_BOSS_EVERY) - 1) % use.length];
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
    R.hearts = Math.min(maxHearts(), R.hearts + 1); // 打完一層：+1 ❤️
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
      EXT.floor?.prepare?.(R.floor + 1, R.mode); // 🧩 閃光嗰下換埋下一層嘅地圖
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
    R.hearts = maxHearts();
    R.shield = Math.round(skill('shield', 0)); // 🛡️
    R.safeT = 2;
    R.ko = -1;
    R.knock.set(0, 0, 0);
    R.bossCount = Math.floor((floor - 1) / TOWER_BOSS_EVERY);
    R.run = { floorsCleared: floor - 1, startFloor: floor, zombies: 0, cured: 0, bosses: 0, bag: new Map(), banked: [], curedNames: [], newBest: false, toldJump: false, mode: R.mode, loadout: [TOWER_STARTER_WEAPON], found: [] };
    state.towerStats = { runs: 0, zombies: 0, cured: 0, ...(state.towerStats || {}) };
    state.towerStats.runs += 1;
    save();
    // Issue #14：每次入塔淨係得一支武器（Candy Pistol）；📦 Weapon Crate 先有新武器（淨係呢次入塔用）
    // 舊嘅 3 支照送（永久擁有，Pumpkin Reaper 大廳用），但塔入面唔用
    ['soulBlaster', 'candyPistol', 'slingshot'].forEach((id) => weapons.give(id));
    // 🌳 Skill Tree「Double Holster」（Issue #15）：每級多一支隨機武器開局
    for (let i = 0; i < (window.__skills?.level('slots') || 0); i++) {
      const w = rollWeapon();
      if (w) R.run.loadout.push(w.id);
    }
    weapons.setLoadout('tower', R.run.loadout);
    weapons.setZone('tower', true);
    weapons.refill();
    const sw = WEAPONS[TOWER_STARTER_WEAPON];
    setTimeout(() => {
      if (!R.run) return;
      const more = R.run.loadout.slice(1).map((id) => `${WEAPONS[id].emoji} ${WEAPONS[id].name}`);
      announce(more.length ? `🧙 You start with ${R.run.loadout.length} weapons: ${sw.emoji} ${sw.name} + ${more.join(' + ')}! Poofed zombies can drop a 📦 WEAPON CRATE with more`
        : `🧙 You start with ONE weapon: ${sw.emoji} ${sw.name}! Poofed zombies can drop a 📦 WEAPON CRATE (${Math.round(TOWER_CRATE_CHANCE * 100)}%) with a new weapon`);
    }, 3000);
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
    R.results = { how, mode: run.mode, floor: R.floor, cleared: run.floorsCleared, startFloor: run.startFloor, zombies: run.zombies, cured: run.cured, bosses: run.bosses, given, banked: run.banked, newBest: run.newBest, best: bestOf(run.mode), keep, curedNames: run.curedNames, found: run.found };
    R.run = null;
    clearEnemies();
    for (const c of [...crates]) removeCrate(c);
    EXT.floor?.reset?.();
    weapons.setZone('tower', false);
    weapons.setLoadout('tower', null);
    R.slowT = 0;
    moveOpts.speedMul = 1;
    ui.frost.style.opacity = '0';
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
      <p class="tp-note">🔫 You start with ONE weapon (${WEAPONS[TOWER_STARTER_WEAPON].emoji} ${WEAPONS[TOWER_STARTER_WEAPON].name}). Poofed zombies can drop a 📦 Weapon Crate with a new one!<br>👑 Every ${TOWER_BOSS_EVERY} floors: a MINI-BOSS and a 🏆 big prize · 🎒 leave by the door to keep your whole bag (knocked out = keep ${Math.round(TOWER_KO_KEEP * 100)}%) · You have ${maxHearts()} ❤️</p></div>`;
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
      ${r.found?.length ? `<p>📦 Weapons found this run: ${r.found.map((id) => `${WEAPONS[id].emoji} ${WEAPONS[id].name}`).join(', ')} <small>(they stay in the tower)</small></p>` : ''}
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
      // 🎃 一組 Boss（Pumpkin Brothers）：e.bossGroup = { title, maxHp }，HP 條 = 加埋
      const grp = boss.bossGroup;
      const bhp = grp ? alive.filter((e) => e.bossGroup === grp).reduce((s, e) => s + e.hp, 0) : boss.hp;
      const bmax = grp ? grp.maxHp || boss.maxHp : boss.maxHp;
      ui.boss.querySelector('b').textContent = grp?.title || boss.bossTitle;
      ui.boss.querySelector('i').style.width = `${(bhp / bmax) * 100}%`;
      ui.boss.querySelector('span').textContent = `${short(Math.ceil(bhp))} / ${short(bmax)}`;
    }
    ui.hearts.style.setProperty('--regen', R.hearts < maxHearts() ? (R.regenT / regenTime()).toFixed(2) : '0');
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
    dt = Math.max(0, dt || 0); // 時鐘偶然倒退：當 0
    const pos = camera.position;
    const inside = inTowerArena(pos.x, pos.z);
    if (arena) arena.g.visible = inside || R.inside;
    // 俾人傳送走咗（控制台等等）
    if (!inside && R.inside && !R.travelling) finishRun('away');
    // 冇經門口入嚟（例如控制台傳送）：照樣開始
    if (inside && !R.inside && !R.travelling && arena && R.phase === 'idle') startRun(1);
    updateUi();
    ui.wpn.hidden = !(R.inside && R.run);
    if (!R.inside || !arena) {
      if (moveOpts.speedMul !== 1 && !R.inside) moveOpts.speedMul = 1;
      return;
    }
    drawWeaponList();
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
      scene.fog.color.lerp(new THREE.Color(EXT.floor?.fog ?? THEMES[arena.theme].fog), 0.6);
      scene.fog.near = EXT.floor?.fogNear ?? 26;
      scene.fog.far = EXT.floor?.fogFar ?? 120;
    }
    EXT.floor?.look?.(dt, time, { paused: paused || frozen }); // 🧩 每格（暫停都做）：每層主題嘅燈光
    // ❄️ 俾 Frost Zombie 凍親：行慢啲
    if (!paused && !frozen) R.slowT = Math.max(0, R.slowT - dt);
    moveOpts.speedMul = R.slowT > 0 ? R.slowMul : 1;
    ui.frost.style.opacity = R.slowT > 0 ? String(Math.min(1, R.slowT * 1.5)) : '0';
    if (paused || frozen) return;
    animateDecor(dt, time);
    updateCrates(dt, time);
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
    if (R.hearts < maxHearts() && R.phase === 'fight') {
      R.regenT += dt;
      if (R.regenT >= regenTime()) {
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
        const bk = R.bossPending;
        const b = spawnEnemy(bk === 'giant' ? 'animal' : bk, { boss: true, giant: bk === 'giant', at: pickSpawn(16) });
        R.bossCount += 1;
        R.bossPending = null;
        announce(b.giant ? `😵 MINI-BOSS: a GIANT corrupted ${b.animal.name}! Cure it! 💚` : bk === 'king' ? '👑 MINI-BOSS: the ZOMBIE KING! Jump over his shockwaves!' : `${b.bossTitle}: ${TOWER_BOSSES[bk]?.intro || 'MINI-BOSS!'}`);
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
    for (const e of [...enemies]) {
      attacker = e;
      angryVictim = e.angryT > 0 ? angryTargetOf(e) : null;
      if (e.angryT > 0 && !angryVictim && R.phase === 'fight' && e.state === 'walk') { // 😡 冇朋友打：企定喺度發脾氣
        e.angryT -= dt;
        e.model.userData.animate?.(time, 0, 0);
        continue;
      }
      updateEnemy(e, dt, time);
    }
    attacker = null;
    angryVictim = null;
    updateShots(dt);
    updateWaves(dt);
    updatePickups(dt, time);
    for (const f of EXT.updates) f(dt, time);
    EXT.floor?.update?.(dt, time);
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

  // ================= 🧩 擴充 API（Issue #15）=================
  // 擴充模組 install(K) 回傳 { kinds?, bosses?, floor?, update?, clear? }：
  //   kinds[kind] / bosses[kind] = {
  //     build({ seed, boss, floor, mode }) → THREE.Object3D，userData 要有：
  //        height（米）、animate(time, moving 0-1, attack 0-1)、parts() → [{ y, radius, mult, crit?, block?, fwd? }]（打中範圍，相對腳底）
  //        flash?(k)（打中白一白）、dispose?()、size?（Vector3，冇就用 0.9×height×0.6）
  //     init?(e)：出咗嚟之後（e = 敵人資料，見 spawnEnemy）
  //     update?(e, dt, time, { dx, dz, dist, face(x, z, k), move(nx, nz, speed) })：冇 = 普通殭屍（行近 + 打）
  //        可以叫 K.baseUpdate(e, dt, time, { dx, dz, dist, face, move }) 用返普通殭屍嘅行路 + 打人
  //     onHit?(e, dmg, info) → false = 擋咗、數字 = 改傷害 · onPoof?(e, worldPos) · remove?(e)
  //     reach? radius?（數字或者 (e) => 數字）· flying?（true = 唔會被推落地）
  //   }
  //   數值：普通殭屍 → balance.js TOWER_ENEMIES[kind]（hp/speed/from/weight）；Boss → TOWER_BOSSES[kind]（hp/speed/name/emoji/color/intro）
  //   floor = { start(n, mode) → { name, color }?, prepare?(n, mode)（升降機閃光嗰下）, update(dt, time), look?(dt, time, { paused })（每格，暫停都叫）,
  //             reset(), fog?（顏色，蓋過 THEMES）, fogNear?, fogFar? }
  //   e 常用：e.g（Group，位置相對 K.A）、e.model、e.hp/maxHp、e.state（'walk' 等，自己加新嘅都得）、e.t（呢個 state 幾耐）、e.cd、e.dir、e.speed
  const K = {
    A, R, enemies, shots, THEMES,
    get arena() { return arena; },
    player, camera, play, popup, announce, bigText, tmp,
    playerPos, hitPlayer, spawnEnemy, removeEnemy, pickSpawn, poof, buffEnemy, setAngry, slowPlayer,
    sparkle, candyBurst, floatText, particle, shockwave, dashWarn, lineWarn, spit, throwBomb, throwIce,
    clampTower, hpMul, speedMul, modeInfo, hitHearts, ADDM, rand,
    baseUpdate: (e, dt, time, o) => updateZombie(e, dt, time, o.dx, o.dz, o.dist, o.face, o.move),
    alive: () => enemies.filter((o) => o.state !== 'poof' && o.state !== 'cured'),
    addShake: (v) => (shake = Math.max(shake, v)),
    maxAtOnce: TOWER_MAX_AT_ONCE,
  };
  for (const install of [installTowerZombies, installTowerBosses, installTowerFloors]) {
    const x = install(K) || {};
    Object.assign(EXT.kinds, x.kinds || {});
    Object.assign(EXT.bosses, x.bosses || {});
    if (x.floor) EXT.floor = x.floor;
    if (x.update) EXT.updates.push(x.update);
    if (x.clear) EXT.clears.push(x.clear);
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
    // 影相用：所有款殭屍企成兩排（前排：舊款；後排：Issue #14 新款）
    lineup(walk = true, kinds = null) {
      R.calm = walk ? 'walk' : true;
      clearEnemies();
      const rows = kinds ? [kinds] : [['walker', 'runner', 'spitter', 'brute', 'mini'], ['leaper', 'shield', 'bomber', 'frost', 'splitter', 'necro'], ['bat', 'leader', 'draculo', 'balloon', 'cannon']];
      rows.forEach((row, r) => row.forEach((k, i) => {
        const e = spawnEnemy(k, { at: { x: A.x - ((row.length - 1) * 2.8) / 2 + i * 2.8, z: A.z - 2 - r * 3.6, glow: 0 } });
        e.state = 'walk';
        e.g.position.y = 0;
        e.g.rotation.y = PI;
      }));
      if (kinds) return enemies.length;
      const king = spawnEnemy('king', { boss: true, at: { x: A.x, z: A.z - 11, glow: 0 } });
      king.state = 'walk';
      king.g.position.y = 0;
      king.g.rotation.y = PI;
      return enemies.length;
    },
    // 📦 喺玩家前面跌一個 Weapon Crate
    crate(dist = 4) {
      const fwd = V();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      dropCrate(V(camera.position.x + fwd.x * dist, 0, camera.position.z + fwd.z * dist));
      return crates.length;
    },
    giveWeapon(id) { if (WEAPONS[id]) giveRunWeapon(WEAPONS[id]); return R.run?.loadout; },
    // 測試一款敵人：清晒、唔再出新嘅，喺玩家前面 dist 米出 n 隻（照打）
    only(kind = 'leaper', n = 1, dist = 10) {
      clearEnemies();
      R.phase = 'fight';
      R.bossPending = null;
      const fwd = V();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      const out = [];
      for (let i = 0; i < n; i++) {
        const side = (i - (n - 1) / 2) * 2.5;
        tmp.set(camera.position.x + fwd.x * dist - fwd.z * side, 0, camera.position.z + fwd.z * dist + fwd.x * side);
        clampTower(tmp, 1.5);
        const e = spawnEnemy(kind, { at: { x: tmp.x, z: tmp.z, glow: 0 } });
        e.state = 'walk';
        e.g.position.y = 0;
        out.push(e);
      }
      return out;
    },
    set crateChance(v) { R.crateChance = v; },
    set shieldChance(v) { R.shieldChance = v; }, // 🛡️ 測試：1 = 每隻都跌
    boss(kind = 'king') { // 👑 測試：即刻出一隻 Boss（'king'、'giant' 或者新 Boss）
      R.phase = 'fight';
      const b = spawnEnemy(kind === 'giant' ? 'animal' : kind, { boss: true, giant: kind === 'giant', at: pickSpawn(10) });
      return b;
    },
    angry(t = 8) { for (const e of enemies) if (!e.boss) setAngry(e, t); },
    get ext() { return EXT; },
    get crateChance() { return R.crateChance ?? TOWER_CRATE_CHANCE; },
    get crates() { return crates; },
    get shots() { return shots; },
    slowMe: (t = 2.5) => slowPlayer(0.5, t),
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
