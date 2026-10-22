// 🐉 Pumpkin Reaper Dragon（小朋友 GitHub Issue #11，家長批准咗嘅版本）
// 每個鐘頭（真實時鐘，預設 :30，唔撞 Phantom Express 嘅 :00）喺 🏚️ Abandoned Manor 醒：
//   早 1 分鐘：全世界見到紅色警告字
//   醒咗（REAPER_WINDOW_MINUTES 分鐘）：大屋前門開咗（發光），行入去 = 入爛咗嘅大廳（src/reaperShape.js）
//   Boss 撞爛地板衝上嚟（地板爆開、碎片飛），企喺中間唔郁，但係會：
//     🌀 掟鐮刀（迴力鏢咁飛一圈返嚟，要避）
//     🔥 噴火（地上紅色扇形 = 會噴嘅位；中咗會彈飛你）
//     🎃 南瓜炸彈（拋過嚟，跌落之前地上有紅圈）
//     🐟 鬼魚由地板跳出嚟咬你（可以射佢哋）
//   10,000 HP，有大血條；你有 ❤️（同 Ghost World 一樣）
//   打贏：大爆炸死亡動畫 → 🍬 +1 Soul Candy（state.soulCandy）→ 送返 Halloween 世界 Spawn Ruins
//   冇晒心：踢返出大屋門口，Boss 留喺度（扣咗嘅 HP 保留）直到時間完
// 入去冇 Soul Blaster 會送一支（之後都留住）。武器系統喺 src/weapons.js
// 數值喺 balance.js 嘅 REAPER_*；測試：game.reaper.spawn()、game.reaper.goto()、game.reaper.attack('scythe'|'fire'|'bombs'|'fish')、game.reaper.hurt(9000)

import * as THREE from 'three';
import { state, save } from './state.js';
import { addSounds } from './sound.js';
import { MANOR, HW_ARRIVE } from './halloweenShape.js';
import { REAPER_HALL as HALL, REAPER_ARRIVE, REAPER_EXIT, REAPER_PILLARS, REAPER_HOLE_R, inReaperHall, clampHall } from './reaperShape.js';
import { buildReaperDragon, buildScythe, buildPumpkinBomb, buildGhostFish } from './reaperModel.js';
import { glowTexture } from './weaponModels.js';
import { flame, bx, cyl, cone, sph, ADD } from './halloweenKit.js';
import { glowSign, beacon } from './hwBeacons.js';
import { THEMES } from './signs.js';
import {
  REAPER_EVERY_MINUTES, REAPER_AT_MINUTE, REAPER_WINDOW_MINUTES, REAPER_WARNING_SECONDS, REAPER_HP, REAPER_HEAD_MULT,
  REAPER_HEARTS, REAPER_HEART_REGEN, REAPER_HIT_SAFE, REAPER_ATTACK_GAP, REAPER_ENRAGE_GAP, REAPER_BOMBS, REAPER_BOMB_RADIUS,
  REAPER_FISH_PER_SUMMON, REAPER_FISH_MAX, REAPER_FISH_HP, REAPER_FIRE_PUSH, REAPER_KEEP_DAMAGE, REAPER_SOUL_CANDY,
} from './data/balance.js';

const $ = (id) => document.getElementById(id);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const PI = Math.PI;
const MIN = 60 * 1000;
const CENTER = V(HALL.x, 0, HALL.z);
const MANOR_FRONT = MANOR.z + MANOR.d / 2; // 大屋前面嘅牆
const MANOR_DOOR = { x: MANOR.x, z: MANOR_FRONT + 1.4 }; // 大屋前門（企喺門口）
const KICK_OUT = { x: MANOR.x, z: MANOR.z + MANOR.d / 2 + 7, rotY: PI }; // 俾佢打低：踢返出門口（望住南邊）
const FIRE_HALF = 17 * (PI / 180); // 噴火扇形一半角度
const FIRE_RANGE = 25;
const FIRE_SPEED = 30;
const INTRO_WAIT = 2.2; // 入咗大廳等幾耐先爆地板
const INTRO_LEN = 5.2; // 爆地板 + 起身 + 吼
const DIE_LEN = 9;

// ---------- 時間表（真實時鐘：全世界同一個時間）----------
let forced = null; // 控制台／測試：{ start }（可以係將來 = 先出警告）
export function reaperStatus(now = Date.now()) {
  const every = REAPER_EVERY_MINUTES * MIN;
  const at = REAPER_AT_MINUTE * MIN;
  const win = REAPER_WINDOW_MINUTES * MIN;
  if (forced) {
    if (now < forced.start) return { active: false, start: forced.start, left: 0, next: forced.start - now };
    if (now - forced.start < win) return { active: true, start: forced.start, left: forced.start + win - now, next: 0 };
  }
  const start = Math.floor((now - at) / every) * every + at;
  if (now - start < win) return { active: true, start, left: start + win - now, next: 0 };
  return { active: false, start: start + every, left: 0, next: start + every - now };
}
const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ---------- 聲效 ----------
addSounds({
  reaperRoar: (t, { tone, noise }) => {
    tone(90, t, 1.6, { type: 'sawtooth', vol: 0.22, slide: 0.55 });
    tone(140, t + 0.05, 1.3, { type: 'square', vol: 0.08, slide: 0.5 });
    noise(t, 1.5, { vol: 0.5, freq: 380 });
    noise(t + 0.1, 1.2, { vol: 0.15, freq: 1500, q: 0.6, type: 'bandpass' });
  },
  floorCrack: (t, { tone, noise }) => {
    noise(t, 0.25, { vol: 0.5, freq: 1200, q: 0.8, type: 'bandpass' });
    tone(60, t, 0.6, { type: 'sine', vol: 0.35, slide: 0.6 });
  },
  floorBurst: (t, { tone, noise }) => {
    noise(t, 1.6, { vol: 0.95, freq: 500 });
    noise(t, 0.4, { vol: 0.5, freq: 2200, q: 0.5, type: 'bandpass' });
    tone(55, t, 1.4, { type: 'sine', vol: 0.6, slide: 0.4 });
    for (let i = 0; i < 6; i++) noise(t + 0.2 + i * 0.11, 0.08, { vol: 0.25, freq: 900 + i * 300, type: 'bandpass' }); // 木碎「咔咔」
  },
  scytheSpin: (t, { noise }) => noise(t, 0.3, { vol: 0.3, freq: 900, q: 1.2, type: 'bandpass' }),
  fireBreath: (t, { tone, noise }) => {
    noise(t, 1.8, { vol: 0.55, freq: 700, q: 0.4, type: 'bandpass' });
    tone(110, t, 1.6, { type: 'sawtooth', vol: 0.06, slide: 0.7 });
  },
  bombLob: (t, { tone }) => tone(300, t, 0.5, { type: 'sine', vol: 0.15, slide: 2.4 }),
  bombBoom: (t, { tone, noise }) => {
    noise(t, 0.8, { vol: 0.7, freq: 600 });
    tone(80, t, 0.6, { type: 'sine', vol: 0.4, slide: 0.4 });
  },
  fishPop: (t, { tone, noise }) => {
    noise(t, 0.3, { vol: 0.25, freq: 1800, q: 0.8, type: 'bandpass' });
    tone(400, t, 0.25, { type: 'sine', vol: 0.18, slide: 2.5 });
  },
  fishBite: (t, { tone }) => {
    tone(700, t, 0.06, { type: 'square', vol: 0.1, slide: 0.5 });
    tone(500, t + 0.07, 0.06, { type: 'square', vol: 0.1, slide: 0.5 });
  },
  reaperWarn: (t, { tone }) => {
    for (let i = 0; i < 3; i++) {
      tone(880, t + i * 0.5, 0.25, { type: 'square', vol: 0.08 });
      tone(660, t + i * 0.5 + 0.25, 0.25, { type: 'square', vol: 0.08 });
    }
  },
  reaperDie: (t, { tone, noise, arp }) => {
    tone(160, t, 2.5, { type: 'sawtooth', vol: 0.2, slide: 0.25 });
    noise(t, 2.6, { vol: 0.6, freq: 420 });
    arp(t + 2.2, [523, 659, 784, 1047, 1319, 1568], 0.1, { type: 'triangle', vol: 0.16 });
  },
});

// ---------- 畫面 ----------
const CSS = `
#reaper-warn { position: fixed; left: 50%; top: calc(18% + env(safe-area-inset-top, 0px)); transform: translateX(-50%); z-index: 30; pointer-events: none; text-align: center;
  font-weight: 900; font-size: clamp(20px, 3.6vw, 38px); color: #ff1744; -webkit-text-stroke: 2px #2a0008; paint-order: stroke fill;
  text-shadow: 0 0 18px #ff1744, 0 0 4px #000; animation: reaper-warn 0.9s ease-in-out infinite; width: min(92vw, 1000px); }
#reaper-warn small { display: block; font-size: 0.55em; color: #ffcdd2; -webkit-text-stroke: 1px #2a0008; }
@keyframes reaper-warn { 0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); } 50% { opacity: 0.75; transform: translateX(-50%) scale(1.04); } }
#reaper-pill { position: fixed; left: 50%; top: calc(64px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); z-index: 6; pointer-events: none;
  padding: 5px 14px; border-radius: 999px; background: rgba(40, 6, 14, 0.85); border: 2px solid #ff5252; color: #ffcdd2; font-weight: 800; font-size: 14px; white-space: nowrap; box-shadow: 0 0 12px #ff1744; }
#reaper-bar { position: fixed; left: 50%; top: calc(12px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); z-index: 9; pointer-events: none; width: min(640px, 90vw);
  padding: 8px 16px 10px; border-radius: 16px; text-align: center; color: #fff; background: linear-gradient(180deg, rgba(48, 14, 30, 0.92), rgba(20, 6, 16, 0.92)); border: 3px solid #ff6d00; box-shadow: 0 0 22px rgba(255, 109, 0, 0.6); }
#reaper-bar b { font-size: 18px; color: #ffab40; letter-spacing: 1px; text-shadow: 0 0 8px #ff6d00; }
#reaper-bar .hpbar { position: relative; height: 22px; margin: 6px 0 3px; background: #1a0610; border: 2px solid #ffab40; border-radius: 11px; overflow: hidden; }
#reaper-bar .hpbar i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #d50000, #ff6d00 60%, #ffd54f); box-shadow: 0 0 12px #ff6d00; transition: width 0.12s; }
#reaper-bar .hpbar u { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(255,255,255,0.65); transition: width 0.6s 0.25s; }
#reaper-bar .hpbar span { position: absolute; inset: 0; font-size: 14px; font-weight: 900; line-height: 18px; -webkit-text-stroke: 3px #1a0610; paint-order: stroke fill; }
#reaper-bar .status { font-size: 14px; color: #ffe0b2; font-weight: 700; }
body.mobile #reaper-bar { top: calc(52px + env(safe-area-inset-top, 0px)); padding: 4px 10px 6px; } body.mobile #reaper-bar b { font-size: 14px; } body.mobile #reaper-bar .hpbar { height: 16px; } body.mobile #reaper-bar .hpbar span { font-size: 11px; line-height: 13px; }
body:has(#reaper-bar:not([hidden])) #event-banner, body:has(#reaper-bar:not([hidden])) #reaper-pill { display: none; }
#reaper-hearts { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(190px + env(safe-area-inset-bottom, 0px)); z-index: 6; pointer-events: none; display: flex; gap: 4px; padding: 4px 12px; border-radius: 999px; background: linear-gradient(180deg, rgba(42, 22, 64, 0.85), rgba(22, 11, 36, 0.85)); border: 3px solid #ff5252; }
#reaper-hearts .h { font-size: 24px; line-height: 1; filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.5)); transition: transform 0.15s; }
#reaper-hearts .h.empty { opacity: 0.45; }
#reaper-hearts .h.filling { opacity: calc(0.35 + var(--regen, 0) * 0.65); transform: scale(calc(0.75 + var(--regen, 0) * 0.25)); }
#reaper-hearts .h.lost { animation: hw-heart-lost 0.5s ease-out; }
body.mobile #reaper-hearts { bottom: auto; top: calc(var(--m-row2, 100px) + 128px); padding: 2px 10px; border-width: 2px; } body.mobile #reaper-hearts .h { font-size: 16px; }
#reaper-hurt { position: fixed; inset: 0; z-index: 5; pointer-events: none; opacity: 0; background: radial-gradient(ellipse at center, rgba(255, 0, 0, 0) 45%, rgba(255, 61, 0, 0.55) 80%, rgba(183, 28, 28, 0.85) 100%); }
#reaper-hurt.on { animation: hw-hurt 0.8s ease-out; }
#reaper-ko { position: fixed; inset: 0; z-index: 60; pointer-events: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: radial-gradient(circle, #3a1020 0%, #0e0408 75%); color: #fff; text-align: center; font-weight: 800; }
#reaper-ko.on { animation: hw-ko 2.6s ease-in-out forwards; }
#reaper-ko b { font-size: 44px; color: #ff8a80; -webkit-text-stroke: 2px #4a0010; paint-order: stroke fill; }
#reaper-ko span { font-size: 18px; color: #ffccbc; }
#reaper-ko .ko-stars { font-size: 64px; animation: hw-ko-spin 1s linear infinite; }
#reaper-win { position: fixed; inset: 0; z-index: 40; pointer-events: none; display: flex; align-items: center; justify-content: center; }
#reaper-win .card { text-align: center; padding: 22px 36px; border-radius: 24px; color: #fff; background: radial-gradient(circle at 50% 30%, rgba(120, 30, 70, 0.95), rgba(30, 6, 22, 0.95)); border: 4px solid #ffab40; box-shadow: 0 0 40px #ff6d00; animation: reaper-pop 0.6s cubic-bezier(.2,1.6,.4,1); }
#reaper-win .big { font-size: 80px; animation: hw-ko-spin 3s linear infinite; display: inline-block; }
#reaper-win b { display: block; font-size: 30px; color: #ffd54f; -webkit-text-stroke: 2px #4a0010; paint-order: stroke fill; }
#reaper-win span { font-size: 18px; color: #ffe0b2; }
@keyframes reaper-pop { 0% { transform: scale(0.3); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
body.in-movie #reaper-bar, body.in-movie #reaper-hearts, body.in-movie #reaper-pill { visibility: hidden; }
`;
function buildUi() {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const mk = (id, html = '') => {
    const el = document.createElement('div');
    el.id = id;
    el.innerHTML = html;
    el.hidden = true;
    document.body.appendChild(el);
    return el;
  };
  return {
    warn: mk('reaper-warn'),
    pill: mk('reaper-pill'),
    bar: mk('reaper-bar', '<b>🎃🐉 PUMPKIN REAPER DRAGON</b><div class="hpbar"><u></u><i></i><span></span></div><div class="status"></div>'),
    hearts: mk('reaper-hearts'),
    hurt: (() => {
      const e = mk('reaper-hurt');
      e.hidden = false;
      return e;
    })(),
    ko: mk('reaper-ko', '<div class="ko-stars">💫</div><b>Knocked out!</b><span>The dragon threw you out of the manor! It is still in there...</span>'),
    win: mk('reaper-win', `<div class="card"><div class="big">🍬</div><b>+${REAPER_SOUL_CANDY} SOUL CANDY!</b><span>You beat the PUMPKIN REAPER DRAGON! 🐉</span></div>`),
  };
}

// ---------- 貼圖 ----------
function canvasTex(w, h, draw, repeat = null) {
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}
// 舊木地板（有爛位、污漬）
function floorTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#2e1f1a';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      for (let x = (y / 32) % 2 ? -64 : 0; x < w; x += 128) {
        const k = 0.75 + Math.random() * 0.35;
        g.fillStyle = `rgb(${Math.round(78 * k)},${Math.round(52 * k)},${Math.round(40 * k)})`;
        g.fillRect(x + 1, y + 1, 126, 30);
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(x + 4, y + 6 + i * 9 + Math.random() * 3);
          g.lineTo(x + 124, y + 6 + i * 9 + Math.random() * 3);
          g.stroke();
        }
      }
    }
    for (let i = 0; i < 14; i++) {
      g.fillStyle = `rgba(10,5,10,${0.15 + Math.random() * 0.2})`;
      g.beginPath();
      g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 50, 10 + Math.random() * 30, Math.random() * 3, 0, PI * 2);
      g.fill();
    }
  }, [5, 4]);
}
// 爛咗嘅紫色牆紙（直紋 + 花紋 + 甩咗嘅位）
function wallTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a2048';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = 'rgba(90, 50, 110, 0.6)';
      g.fillRect(x, 0, 12, h);
    }
    g.fillStyle = 'rgba(160, 110, 60, 0.35)';
    for (let y = 16; y < h; y += 48) for (let x = 22; x < w; x += 64) {
      g.beginPath();
      g.arc(x, y, 6, 0, PI * 2);
      g.fill();
    }
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(40, 28, 30, 0.85)';
      g.beginPath();
      const x = Math.random() * w;
      const y = Math.random() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 7; k++) g.lineTo(x + (Math.random() - 0.5) * 70, y + (Math.random() - 0.5) * 70);
      g.fill();
    }
  }, [6, 2]);
}

// 清走用完嘅材質（形狀好多係共用，唔清）
function disposeMats(root) {
  root.traverse((o) => {
    if (!o.material) return;
    for (const m of [].concat(o.material)) m.dispose();
  });
}

export function createReaper(ctx) {
  const { scene, camera, player, weapons, play, popup, announce, teleport, isWalkable, flash, isOpen = () => true, showLoading = null, onReward = null } = ctx;
  const ui = buildUi();

  // ================= 🏚️ 大屋前門（Boss 醒咗先發光、行得入）=================
  const door = new THREE.Group();
  door.position.set(MANOR_DOOR.x, 0, MANOR.z + MANOR.d / 2 - 2.2 + 3.45);
  scene.add(door);
  const portalMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xff3d00, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.2), portalMat);
  portal.position.y = 4.1;
  door.add(portal);
  const swirl = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.6, 6, 1), new THREE.MeshBasicMaterial({ color: 0xffab40, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  swirl.position.set(0, 4.1, 0.05);
  door.add(swirl);
  const doorSign = glowSign([{ text: '🐉 PUMPKIN REAPER DRAGON', size: 0.36 }, { text: 'The manor is OPEN! Walk in... if you dare!', size: 0.2 }], 6.4, 1.5, THEMES.red || THEMES.purple);
  doorSign.position.set(0, 9.6, 0.4);
  door.add(doorSign);
  const doorBeacon = beacon(scene, MANOR_DOOR.x, MANOR_DOOR.z + 2.5, { color: 0xff3d00, radius: 2.2, light: false });
  door.visible = false;
  doorBeacon.visible = false;

  // ================= 🏚️ 大廳（第一次入先起）=================
  let hall = null;
  function buildHall() {
    const g = new THREE.Group();
    scene.add(g);
    const W = HALL.w;
    const D = HALL.d;
    const Hh = HALL.wallH;
    const floorM = new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.85 });
    // 地板（中間有個窿）+ 未爆之前蓋住個窿嘅一塊
    const shape = new THREE.Shape();
    shape.moveTo(-W / 2, -D / 2);
    shape.lineTo(W / 2, -D / 2);
    shape.lineTo(W / 2, D / 2);
    shape.lineTo(-W / 2, D / 2);
    shape.closePath();
    const holeP = new THREE.Path();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * PI * 2;
      const r = REAPER_HOLE_R * (0.92 + ((i * 7) % 5) * 0.03);
      if (i === 0) holeP.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else holeP.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    shape.holes.push(holeP);
    const floorGeo = new THREE.ShapeGeometry(shape, 24);
    floorGeo.rotateX(-PI / 2);
    // UV：跟世界尺寸
    const uv = floorGeo.attributes.uv;
    const pos = floorGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, (pos.getZ(i) + D / 2) / D);
    const floor = new THREE.Mesh(floorGeo, floorM);
    floor.position.set(HALL.x, 0, HALL.z);
    floor.receiveShadow = true;
    g.add(floor);
    const patchGeo = new THREE.CircleGeometry(REAPER_HOLE_R + 0.4, 28);
    patchGeo.rotateX(-PI / 2);
    const patch = new THREE.Mesh(patchGeo, new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.85, emissive: 0xff5a00, emissiveIntensity: 0 }));
    patch.position.set(HALL.x, 0.01, HALL.z);
    patch.receiveShadow = true;
    g.add(patch);
    // 地板裂紋（Boss 嚟之前會發光）
    const crackM = new THREE.MeshBasicMaterial({ color: 0xff6d00, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const cracks = new THREE.Group();
    cracks.position.set(HALL.x, 0.03, HALL.z);
    g.add(cracks);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * PI * 2 + Math.random() * 0.3;
      let r = 1;
      let x = Math.cos(a) * r;
      let z = Math.sin(a) * r;
      for (let k = 0; k < 4; k++) {
        const len = 1.5 + Math.random() * 2.2;
        const na = a + (Math.random() - 0.5) * 0.8;
        const nx = x + Math.cos(na) * len;
        const nz = z + Math.sin(na) * len;
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.18, len), crackM);
        seg.rotation.x = -PI / 2;
        seg.rotation.z = -Math.atan2(nz - z, nx - x) + PI / 2;
        seg.position.set((x + nx) / 2, 0, (z + nz) / 2);
        cracks.add(seg);
        x = nx;
        z = nz;
        r += len;
        if (r > 11) break;
      }
    }
    // 個窿：爛木邊 + 深處火光
    const rim = new THREE.Group();
    rim.position.set(HALL.x, 0, HALL.z);
    rim.visible = false;
    g.add(rim);
    const plankM = new THREE.MeshStandardMaterial({ color: 0x4e3426, roughness: 0.9 });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * PI * 2;
      const p = bx(rim, 0.5, 0.25, 1.6 + Math.random() * 1.4, plankM, Math.cos(a) * (REAPER_HOLE_R + 0.2), 0.12, Math.sin(a) * (REAPER_HOLE_R + 0.2), 0.1);
      p.rotation.set((Math.random() - 0.5) * 0.6, -a + PI / 2, -0.35 - Math.random() * 0.5);
    }
    const pit = new THREE.Mesh(new THREE.CylinderGeometry(REAPER_HOLE_R, REAPER_HOLE_R * 0.8, 10, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x1a0d0a, side: THREE.BackSide, emissive: 0x401000, emissiveIntensity: 0.6 }));
    pit.position.y = -5;
    rim.add(pit);
    const pitFire = new THREE.Mesh(new THREE.CircleGeometry(REAPER_HOLE_R * 0.95, 24), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xff6d00, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    pitFire.rotation.x = -PI / 2;
    pitFire.position.y = -3;
    rim.add(pitFire);
    // 牆
    const wallM = new THREE.MeshStandardMaterial({ map: wallTex(), roughness: 0.9 });
    const trimM = new THREE.MeshStandardMaterial({ color: 0x2a1820, roughness: 0.8 });
    const wall = (w, x, z, ry) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, Hh, 1), wallM);
      m.position.set(x, Hh / 2, z);
      m.rotation.y = ry;
      m.receiveShadow = true;
      g.add(m);
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, 1.3), trimM);
      base.position.set(x, 0.6, z);
      base.rotation.y = ry;
      g.add(base);
      // 牆頂爛咗（一舊舊唔齊）
      for (let i = 0; i < w / 4; i++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random() * 2, 0.6 + Math.random() * 2.2, 1.1), wallM);
        const off = -w / 2 + 2 + i * 4;
        c.position.set(x + Math.cos(ry) * off, Hh + c.geometry.parameters.height / 2 - 0.2, z - Math.sin(ry) * off);
        c.rotation.y = ry;
        if (Math.random() < 0.5) g.add(c);
      }
    };
    wall(W, HALL.x, HALL.z - D / 2 - 0.5, 0);
    wall(W, HALL.x, HALL.z + D / 2 + 0.5, 0);
    wall(D + 2, HALL.x - W / 2 - 0.5, HALL.z, PI / 2);
    wall(D + 2, HALL.x + W / 2 + 0.5, HALL.z, PI / 2);
    // 拱窗（月光）+ 爛窗簾
    const winM = new THREE.MeshStandardMaterial({ color: 0x8fa6ff, emissive: 0x6f86ff, emissiveIntensity: 1.6, roughness: 0.3 });
    const frameM = new THREE.MeshStandardMaterial({ color: 0x1a1018, roughness: 0.7 });
    const curtainM = new THREE.MeshStandardMaterial({ color: 0x7a1030, roughness: 0.95, side: THREE.DoubleSide });
    const windowAt = (x, z, ry) => {
      const w = new THREE.Group();
      w.position.set(x, 0, z);
      w.rotation.y = ry;
      g.add(w);
      bx(w, 3.2, 6.5, 0.2, winM, 0, 6.5, 0, 0.05);
      const arch = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16, 0, PI), winM);
      arch.position.set(0, 9.75, 0.01);
      w.add(arch);
      for (const dx of [-1.6, 0, 1.6]) bx(w, 0.18, 8.2, 0.35, frameM, dx, 7.1, 0.1, 0.1);
      for (const y of [4.5, 7, 9.2]) bx(w, 3.4, 0.15, 0.35, frameM, 0, y, 0.1, 0.1);
      for (const s of [-1, 1]) {
        const c = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 8.5, 1, 4), curtainM);
        c.position.set(s * 2.1, 6.2, 0.45);
        c.rotation.z = s * 0.04;
        w.add(c);
      }
      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 16), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x6f86ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      shaft.position.set(0, 4, 5);
      shaft.rotation.x = -0.9;
      w.add(shaft);
    };
    for (const dx of [-21, -7, 7, 21]) windowAt(HALL.x + dx, HALL.z - D / 2 + 0.05, 0);
    for (const dz of [-12, 6]) {
      windowAt(HALL.x - W / 2 + 0.05, HALL.z + dz, PI / 2);
      windowAt(HALL.x + W / 2 - 0.05, HALL.z + dz, -PI / 2);
    }
    // 屋頂：爛咗嘅橫樑（中間冇晒，見到天）
    const beamM = new THREE.MeshStandardMaterial({ color: 0x3a281f, roughness: 0.9 });
    for (let i = 0; i < 6; i++) {
      const z = HALL.z - D / 2 + 4 + i * 8.4;
      const broken = i % 2 === 1;
      if (!broken) bx(g, W + 1, 0.9, 0.9, beamM, HALL.x, Hh - 0.3, z, 0.1);
      else for (const s of [-1, 1]) {
        const b = bx(g, W * 0.32, 0.9, 0.9, beamM, HALL.x + s * W * 0.35, Hh - 0.8, z, 0.1);
        b.rotation.z = s * 0.12;
      }
    }
    // 跌咗落嚟嘅樑
    const fallen = bx(g, 12, 0.9, 0.9, beamM, HALL.x + 14, 0.8, HALL.z + 18, 0.1);
    fallen.rotation.set(0, 0.5, 0.12);
    // 屋頂邊（四邊有少少瓦，中間開咗）
    const roofM = new THREE.MeshStandardMaterial({ color: 0x2a2036, roughness: 0.9, side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(W + 2, 0.4, 7), roofM);
      r.position.set(HALL.x, Hh + 0.4, HALL.z + s * (D / 2 - 2.5));
      r.rotation.x = s * 0.2;
      g.add(r);
    }
    // 石柱（爛咗頂）
    const stoneM = new THREE.MeshStandardMaterial({ color: 0x6a6178, roughness: 0.85 });
    for (const [i, p] of REAPER_PILLARS.entries()) {
      const h = i % 2 ? 7 : 11;
      cyl(g, p.r, h, stoneM, p.x, h / 2, p.z, 0, 0, p.r * 0.9);
      bx(g, p.r * 2.6, 0.8, p.r * 2.6, stoneM, p.x, 0.4, p.z, 0.1);
      const top = cone(g, p.r * 0.9, 1.6, stoneM, p.x, h + 0.4, p.z, 0.3, 0.2, 5);
      top.castShadow = true;
      // 柱上嘅鬼火燈
      const f = flame(g, p.x, 3.6, p.z + p.r + 0.2, 1.2, [0xccff90, 0x76ff03, 0x00c853]);
      bx(g, 0.6, 0.3, 0.6, frameM, p.x, 3.5, p.z + p.r + 0.2, 0.2);
      (g.userData.flames ||= []).push(f);
    }
    // 燭台（牆邊）
    for (const [x, z] of [[-27, -22], [27, -22], [-27, 22], [27, 22], [-12, 23.5], [12, 23.5], [-29, 0], [29, 0]]) {
      const cx = HALL.x + x;
      const cz = HALL.z + z;
      cyl(g, 0.12, 2.6, frameM, cx, 1.3, cz, 0, 0, 0.08);
      for (const dx of [-0.5, 0, 0.5]) {
        cyl(g, 0.08, 0.5, new THREE.MeshStandardMaterial({ color: 0xfff3e0 }), cx + dx, 2.85, cz, 0, 0, 0.08);
        g.userData.flames.push(flame(g, cx + dx, 3.1, cz, 0.6));
      }
    }
    // 跌咗落地嘅水晶吊燈
    const chand = new THREE.Group();
    chand.position.set(HALL.x - 14, 0.2, HALL.z + 16);
    chand.rotation.set(0.3, 0.6, 0.15);
    g.add(chand);
    const gold = new THREE.MeshStandardMaterial({ color: 0xb8902a, metalness: 0.7, roughness: 0.35 });
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.14, 8, 28), gold);
    ringM.rotation.x = PI / 2;
    chand.add(ringM);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      sph(chand, 0.18, 0.3, 0.18, ADD(0xb3e5fc, 0.8), Math.cos(a) * 2.2, -0.3, Math.sin(a) * 2.2, true);
    }
    // 牆上歪咗嘅畫（眼會發光）
    const paintTex = canvasTex(128, 160, (c, w, h) => {
      c.fillStyle = '#1a1220';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#3a2a40';
      c.beginPath();
      c.ellipse(64, 70, 34, 44, 0, 0, PI * 2);
      c.fill();
      c.fillStyle = '#2a1a30';
      c.fillRect(20, 110, 88, 50);
    });
    for (const [x, z, ry, rz] of [[-W / 2 + 0.6, -4, PI / 2, 0.1], [W / 2 - 0.6, -4, -PI / 2, -0.12], [-14, -D / 2 + 0.6, 0, -0.08], [14, -D / 2 + 0.6, 0, 0.15]]) {
      const p = new THREE.Group();
      p.position.set(HALL.x + x, 7.5, HALL.z + z);
      p.rotation.set(0, ry, rz);
      g.add(p);
      bx(p, 3, 3.8, 0.25, gold, 0, 0, 0, 0.1);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.2), new THREE.MeshStandardMaterial({ map: paintTex }));
      pic.position.z = 0.14;
      p.add(pic);
      for (const s of [-1, 1]) sph(p, 0.12, 0.08, 0.05, ADD(0xff1744, 0.95), s * 0.35, 0.45, 0.2, true);
    }
    // 牆角南瓜燈
    for (const [x, z] of [[-26, -20], [26, -20], [-26, 20], [26, 20], [-8, 22], [8, 22]]) {
      sph(g, 0.8, 0.65, 0.8, new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 0.9 }), HALL.x + x, 0.6, HALL.z + z);
    }
    // 出口門（南牆中間）
    const exit = new THREE.Group();
    exit.position.set(REAPER_EXIT.x, 0, HALL.z + D / 2 - 0.05);
    g.add(exit);
    bx(exit, 4.6, 6.2, 0.3, frameM, 0, 3.1, 0, 0.05);
    const exitGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 5.6), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x76ff03, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    exitGlow.position.set(0, 2.9, -0.2);
    exitGlow.rotation.y = PI;
    exit.add(exitGlow);
    const exitSign = glowSign([{ text: '🚪 EXIT', size: 0.5 }, { text: 'press E here to leave', size: 0.22 }], 3.4, 1.2, THEMES.green || THEMES.purple);
    exitSign.position.set(0, 7, -0.5);
    exitSign.rotation.y = PI;
    exit.add(exitSign);
    // 一盞燈：由個窿射上嚟嘅火光（照住 Boss）
    const pitLight = new THREE.PointLight(0xff6d00, 0, 40, 1.4);
    pitLight.position.set(HALL.x, 2, HALL.z);
    g.add(pitLight);
    g.traverse((o) => {
      if (o.isMesh && o !== floor && o !== patch) o.receiveShadow = false;
    });

    // Boss
    const boss = buildReaperDragon();
    boss.position.set(HALL.x, -16, HALL.z);
    boss.visible = false;
    g.add(boss);
    return { g, floor, patch, cracks, crackM, rim, pitFire, pitLight, boss, exitGlow };
  }

  // ================= 戰鬥狀態 =================
  const fx = { debris: [], bursts: [], fires: [], beams: [] };
  const bombs = [];
  const fish = [];
  let thrown = null; // 飛緊嘅鐮刀
  let attack = null; // 而家出緊嘅招 { kind, t, ... }
  const R = {
    phase: 'idle', // idle（冇人喺入面）、wait、intro、fight、dying、done
    t: 0,
    hp: REAPER_HP,
    shown: REAPER_HP, // 血條白色「跟住跌」嗰段
    risen: false, // 地板爆咗、Boss 喺度
    windowStart: 0,
    nextAttack: 2,
    lastKind: '',
    hearts: REAPER_HEARTS,
    regenT: 0,
    safeT: 0,
    ko: -1,
    hurt: 0,
    roar: 0,
    shake: 0,
    knock: V(),
    god: false,
    inside: false,
  };
  const pose = { breath: 0, throwK: 0, lobK: 0, summonK: 0, hurt: 0, rage: 0, roar: 0, dying: 0 };
  let warnPlayedFor = 0;
  let awakeSaidFor = 0;
  let travelling = false;

  // 🎯 Boss 俾武器打嘅位（身、頸、南瓜頭 = 爆擊）
  const pChest = V();
  const pHead = V();
  const pLow = V();
  const pNeck = V();
  weapons.registerTarget({
    alive: () => R.inside && hall && (R.phase === 'fight' || R.phase === 'intro'),
    parts() {
      const b = hall.boss;
      const u = b.userData;
      u.chest.getWorldPosition(pChest);
      u.head.getWorldPosition(pHead);
      u.neck.getWorldPosition(pNeck);
      pLow.set(b.position.x, b.position.y + 1.5, b.position.z);
      return [
        { pos: pHead, radius: 2.5, mult: REAPER_HEAD_MULT, crit: true },
        { pos: pNeck, radius: 1.8, mult: 1 },
        { pos: pChest, radius: 3.8, mult: 1 },
        { pos: pLow, radius: 3.2, mult: 1 },
      ];
    },
    onHit(dmg) {
      if (R.phase !== 'fight') return false; // 爆地板嗰陣打唔到
      R.hp = Math.max(0, R.hp - dmg);
      R.hurt = 1;
      if (R.hp <= 0) startDying();
      return dmg;
    },
  });

  // ---- 心 ----
  let heartsHtml = '';
  let lostAt = -1;
  let lostT = 0;
  function drawHearts() {
    let html = '';
    for (let i = 0; i < REAPER_HEARTS; i++) {
      const full = i < R.hearts;
      const filling = i === R.hearts && R.hearts < REAPER_HEARTS;
      html += `<span class="h ${full ? 'full' : 'empty'}${lostT > 0 && i === lostAt ? ' lost' : ''}${filling ? ' filling' : ''}">${full ? '❤️' : '🖤'}</span>`;
    }
    if (html !== heartsHtml) ui.hearts.innerHTML = heartsHtml = html;
  }
  function hitPlayer(what, push = null) {
    if (R.safeT > 0 || R.ko >= 0 || R.god || R.phase === 'dying') return false;
    R.hearts = Math.max(0, R.hearts - 1);
    R.safeT = REAPER_HIT_SAFE;
    R.regenT = 0;
    lostAt = R.hearts;
    lostT = 0.5;
    ui.hurt.classList.remove('on');
    void ui.hurt.offsetWidth;
    ui.hurt.classList.add('on');
    R.shake = Math.max(R.shake, 0.5);
    if (push) {
      R.knock.set(push.x, 0, push.z);
      player.vy = push.y ?? 6;
      player.grounded = false;
    }
    if (R.hearts > 0) {
      play('heartLost');
      popup(`💥 ${what}! ${R.hearts} ❤️ left`);
    } else knockOut();
    return true;
  }
  function knockOut() {
    R.ko = 0;
    ui.ko.hidden = false;
    ui.ko.classList.remove('on');
    void ui.ko.offsetWidth;
    ui.ko.classList.add('on');
    play('knockedOut');
  }

  // ---- 清走所有招式 ----
  function clearAttacks() {
    attack = null;
    if (thrown) {
      thrown.g.removeFromParent();
      thrown = null;
    }
    if (hall) hall.boss.userData.scythe.visible = true;
    for (const b of bombs) {
      b.g.removeFromParent();
      b.circle.removeFromParent();
      disposeMats(b.circle);
    }
    bombs.length = 0;
    for (const f of fish) {
      f.g.removeFromParent();
      f.splash.removeFromParent();
      f.target.remove();
      disposeMats(f.g);
      disposeMats(f.splash);
    }
    fish.length = 0;
    for (const f of fx.fires) f.s.removeFromParent();
    fx.fires.length = 0;
    if (fireWarn) fireWarn.visible = false;
  }
  function resetBoss() {
    clearAttacks();
    R.hp = R.shown = REAPER_HP;
    R.risen = false;
    R.phase = 'idle';
    if (hall) {
      hall.boss.visible = false;
      hall.boss.position.y = -16;
      hall.boss.userData.body.rotation.set(0, 0, 0);
      hall.boss.userData.body.position.set(0, 0, 0);
      hall.patch.visible = true;
      hall.rim.visible = false;
      hall.crackM.opacity = 0;
      hall.pitLight.intensity = 0;
    }
  }

  // ================= 入／出大廳 =================
  async function enter() {
    if (travelling) return;
    const st = reaperStatus();
    if (!st.active || state.reaperBeatenAt === st.start) return;
    travelling = true;
    play('portal');
    const go = () => {
      if (!hall) hall = buildHall();
      if (R.windowStart !== st.start) {
        resetBoss();
        R.windowStart = st.start;
      }
      teleport(REAPER_ARRIVE.x, REAPER_ARRIVE.z, REAPER_ARRIVE.rotY);
    };
    if (showLoading) {
      const ok = await showLoading('🏚️ Entering the Abandoned Manor...', async () => go(), 1.2, { theme: 'halloween', kicker: 'Something is under the floor...', title: 'The Abandoned Manor' });
      if (!ok) {
        travelling = false;
        return;
      }
    } else {
      flash?.();
      go();
    }
    travelling = false;
    R.hearts = REAPER_HEARTS;
    R.safeT = 2;
    R.ko = -1;
    R.knock.set(0, 0, 0);
    weapons.refill();
    if (weapons.give('soulBlaster')) {
      setTimeout(() => {
        announce('🎁 You got a FREE 💠 SOUL BLASTER! Click to shoot · right-click to aim · R to reload');
        play('upgrade');
      }, 600);
    }
    if (R.risen) {
      R.phase = 'fight';
      R.nextAttack = 2.5;
      R.roar = 1;
      play('reaperRoar');
      announce('🐉 The PUMPKIN REAPER DRAGON is waiting for you!');
    } else {
      R.phase = 'wait';
      R.t = 0;
      announce('🏚️ The floor is shaking...');
    }
  }
  function leave(how) {
    weapons.setZone('reaper', false);
    R.inside = false;
    clearAttacks();
    R.knock.set(0, 0, 0);
    if (R.phase !== 'done') R.phase = 'idle';
    if (how === 'exit') {
      flash?.();
      play('portal');
      teleport(KICK_OUT.x, KICK_OUT.z, KICK_OUT.rotY);
      announce('🏃 You ran out of the manor! The dragon is still in there...');
    }
  }

  // ================= 招式 =================
  const tmp = V();
  const tmp2 = V();
  const playerPos = () => V(camera.position.x, player.feetY, camera.position.z);
  function chooseAttack() {
    const kinds = ['scythe', 'fire', 'bombs', 'fish'];
    const weights = { scythe: 3, fire: 3, bombs: 3, fish: fish.length < REAPER_FISH_MAX - 1 ? 2 : 0 };
    weights[R.lastKind] = 0; // 唔好連續兩次同一招
    const total = kinds.reduce((n, k) => n + weights[k], 0);
    let r = Math.random() * total;
    for (const k of kinds) {
      r -= weights[k];
      if (r <= 0) return k;
    }
    return 'scythe';
  }
  function startAttack(kind) {
    R.lastKind = kind;
    attack = { kind, t: 0, fired: false };
    if (kind === 'fire') {
      attack.dir = tmp.copy(camera.position).sub(CENTER).setY(0).normalize().clone();
      play('reaperRoar');
    }
    if (kind === 'bombs') play('bombLob');
  }
  const angry = () => R.hp < REAPER_HP / 2;

  // 🌀 掟鐮刀：迴力鏢（出去一邊，返嚟另一邊）
  let thrownModel = null;
  function throwScythe() {
    const b = hall.boss.userData;
    b.scythe.visible = false;
    if (!thrownModel) {
      // 掟出去嗰把（只整一次，之後重用）
      const g = new THREE.Group();
      const spin = new THREE.Group();
      g.add(spin);
      const s = buildScythe();
      s.rotation.x = PI / 2; // 打瞓
      s.position.set(-4.3, 0, 6.2); // 刀頭喺中心附近轉
      spin.add(s);
      g.scale.setScalar(0.75);
      thrownModel = { g, spin };
    }
    const { g, spin } = thrownModel;
    scene.add(g);
    const p = playerPos();
    const d = V(p.x - CENTER.x, 0, p.z - CENTER.z);
    const dist = d.length();
    d.normalize();
    const side = V(-d.z, 0, d.x).multiplyScalar(Math.random() < 0.5 ? 1 : -1);
    thrown = { g, spin, d, side, L: THREE.MathUtils.clamp(dist + 6, 12, 26), W: 15, t: 0, dur: angry() ? 2.4 : 2.9, sound: 0 };
  }
  function updateScythe(dt) {
    const th = thrown;
    th.t += dt;
    const u = Math.min(1, th.t / th.dur);
    const f = th.L * Math.sin(PI * u);
    const s = th.W * 0.5 * Math.sin(2 * PI * u);
    tmp.copy(CENTER).addScaledVector(th.d, f + REAPER_HOLE_R * 0.6 * Math.sin(PI * u)).addScaledVector(th.side, s);
    clampHall(tmp, 1.5);
    const y = 1.5 + Math.pow(1 - Math.sin(PI * u), 2) * 6;
    th.g.position.set(tmp.x, y, tmp.z);
    th.spin.rotation.y += dt * 14;
    th.sound -= dt;
    if (th.sound <= 0) {
      th.sound = 0.32;
      play('scytheSpin');
    }
    // 打中？（刀轉一圈大約 3 米半徑）
    const pp = camera.position;
    if (Math.hypot(pp.x - tmp.x, pp.z - tmp.z) < 3.1 && Math.abs(y - (player.feetY + 0.9)) < 1.5) {
      tmp2.set(pp.x - tmp.x, 0, pp.z - tmp.z).normalize().multiplyScalar(8);
      hitPlayer('The SCYTHE got you', { x: tmp2.x, z: tmp2.z, y: 4 });
    }
    // 火花尾
    if (Math.random() < 0.7) spark(th.g.position, 0x9cff57, 0.9);
    if (u >= 1) {
      th.g.removeFromParent();
      thrown = null;
      hall.boss.userData.scythe.visible = true;
    }
  }

  // 🔥 噴火：地上紅色扇形先，然後噴（會彈飛你）
  let fireWarn = null;
  function ensureFireWarn() {
    if (fireWarn) return fireWarn;
    const geo = new THREE.CircleGeometry(FIRE_RANGE, 24, -FIRE_HALF, FIRE_HALF * 2);
    geo.rotateX(-PI / 2);
    fireWarn = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.35, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    fireWarn.position.set(CENTER.x, 0.05, CENTER.z);
    fireWarn.visible = false;
    scene.add(fireWarn);
    return fireWarn;
  }
  const fireMats = [0xffc400, 0xff9100, 0xff3d00, 0xd50000].map((c, i) => new THREE.SpriteMaterial({ map: glowTexture(), color: c, transparent: true, opacity: i ? 0.55 : 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  function updateFire(dt) {
    const a = attack;
    const WIND = 1.1;
    const LEN = 1.9;
    const w = ensureFireWarn();
    if (a.t < WIND) {
      // 慢慢跟住你轉，最後 0.3 秒定住
      if (a.t < WIND - 0.3) {
        tmp.copy(camera.position).sub(CENTER).setY(0).normalize();
        a.dir.lerp(tmp, Math.min(1, dt * 3)).normalize();
      }
      pose.breath = THREE.MathUtils.lerp(pose.breath, 0.35, Math.min(1, dt * 5));
      w.rotation.y = Math.atan2(-a.dir.z, a.dir.x);
      w.visible = true;
      w.material.opacity = 0.2 + Math.sin(a.t * 18) * 0.12 + a.t * 0.15;
    } else if (a.t < WIND + LEN) {
      if (!a.fired) {
        a.fired = true;
        play('fireBreath');
        R.shake = Math.max(R.shake, 0.3);
      }
      w.visible = true;
      w.material.opacity = 0.18;
      pose.breath = 1;
      const sweep = Math.sin(((a.t - WIND) / LEN) * PI * 2) * 0.12; // 左右掃少少
      const dir = tmp.copy(a.dir).applyAxisAngle(V(0, 1, 0), sweep);
      w.rotation.y = Math.atan2(-dir.z, dir.x);
      // 噴火粒子
      const mouth = hall.boss.userData.mouthPos(tmp2);
      for (let i = 0; i < 3; i++) {
        const s = new THREE.Sprite(fireMats[(Math.random() * 4) | 0]);
        s.position.copy(mouth);
        const v = V(dir.x, 0, dir.z).applyAxisAngle(V(0, 1, 0), (Math.random() - 0.5) * FIRE_HALF * 1.6).multiplyScalar(FIRE_SPEED * (0.8 + Math.random() * 0.4));
        v.y = (-mouth.y / (FIRE_RANGE / FIRE_SPEED)) * (0.7 + Math.random() * 0.5); // 向下噴到地
        s.scale.setScalar(1);
        scene.add(s);
        fx.fires.push({ s, v, t: 0, life: 0.85 });
      }
      // 打中？（喺扇形入面 + 火已經去到你嗰度）
      const pp = camera.position;
      const dx = pp.x - CENTER.x;
      const dz = pp.z - CENTER.z;
      const dist = Math.hypot(dx, dz);
      const ang = Math.abs(Math.atan2(dir.x * dz - dir.z * dx, dir.x * dx + dir.z * dz));
      if (dist < FIRE_RANGE && ang < FIRE_HALF && (a.t - WIND) * FIRE_SPEED > dist - 2 && player.feetY < 3) {
        hitPlayer('FIRE BREATH! You got flung', { x: (dx / dist) * REAPER_FIRE_PUSH, z: (dz / dist) * REAPER_FIRE_PUSH, y: 9 });
      }
    } else {
      w.visible = false;
      attack = null;
    }
  }

  // 🎃 南瓜炸彈：拋物線 + 地上紅圈
  const circleGeo = new THREE.RingGeometry(REAPER_BOMB_RADIUS - 0.3, REAPER_BOMB_RADIUS, 32);
  circleGeo.rotateX(-PI / 2);
  const discGeo = new THREE.CircleGeometry(REAPER_BOMB_RADIUS, 32);
  discGeo.rotateX(-PI / 2);
  function lobBombs() {
    const n = REAPER_BOMBS + (angry() ? 1 : 0);
    const p = playerPos();
    const hand = hall.boss.userData.leftHandPos(V());
    for (let i = 0; i < n; i++) {
      const target = i === 0 ? V(p.x, 0, p.z) : V(p.x + (Math.random() - 0.5) * 14, 0, p.z + (Math.random() - 0.5) * 14);
      clampHall(target, 2);
      const circle = new THREE.Group();
      const ring = new THREE.Mesh(circleGeo, new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
      const disc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.25, depthWrite: false, fog: false }));
      const fill = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: 0xff5252, transparent: true, opacity: 0.35, depthWrite: false, fog: false }));
      circle.add(ring, disc, fill);
      circle.position.set(target.x, 0.06 + i * 0.002, target.z);
      scene.add(circle);
      const g = buildPumpkinBomb();
      g.position.copy(hand);
      scene.add(g);
      bombs.push({ g, circle, fill, ring, from: hand.clone(), to: target, t: -i * 0.18, dur: 1.5 + Math.random() * 0.3, height: 9 + Math.random() * 4 });
    }
  }
  function updateBombs(dt) {
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i];
      b.t += dt;
      const u = THREE.MathUtils.clamp(b.t / b.dur, 0, 1);
      b.g.visible = b.t > 0;
      b.g.position.lerpVectors(b.from, b.to, u);
      b.g.position.y = THREE.MathUtils.lerp(b.from.y, 0.6, u) + b.height * 4 * u * (1 - u);
      b.g.rotation.x += dt * 6;
      b.g.rotation.z += dt * 4;
      b.g.userData.spark.scale.setScalar(0.8 + Math.random() * 0.6);
      b.fill.scale.setScalar(Math.max(0.01, u));
      b.ring.material.opacity = 0.6 + Math.sin(b.t * 20) * 0.35;
      if (u >= 1) {
        explode(b.to, 0xff6d00, 1);
        play('bombBoom');
        const pp = camera.position;
        if (Math.hypot(pp.x - b.to.x, pp.z - b.to.z) < REAPER_BOMB_RADIUS + 0.3 && player.feetY < 2.5) {
          tmp.set(pp.x - b.to.x, 0, pp.z - b.to.z).normalize().multiplyScalar(7);
          hitPlayer('A PUMPKIN BOMB blew up on you', { x: tmp.x, z: tmp.z, y: 6 });
        }
        b.g.removeFromParent();
        b.circle.removeFromParent();
        disposeMats(b.circle);
        bombs.splice(i, 1);
      }
    }
  }

  // 🐟 鬼魚：由地板跳出嚟，追住你咬（打得死）
  function summonFish() {
    const n = Math.min(REAPER_FISH_PER_SUMMON + (angry() ? 1 : 0), REAPER_FISH_MAX - fish.length);
    const p = playerPos();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * PI * 2;
      const r = 5 + Math.random() * 4;
      const at = clampHall(V(p.x + Math.cos(a) * r, 0, p.z + Math.sin(a) * r), 2.5);
      const g = buildGhostFish();
      g.position.set(at.x, -1.5, at.z);
      scene.add(g);
      // 地上綠色水花圈
      const splash = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.4, 20), new THREE.MeshBasicMaterial({ color: 0x1de9b6, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      splash.rotation.x = -PI / 2;
      splash.position.set(at.x, 0.07, at.z);
      scene.add(splash);
      const f = { g, splash, hp: REAPER_FISH_HP, state: 'emerge', t: -i * 0.25, bite: 0, life: 0, phase: Math.random() * 6, hurt: 0, alive: true };
      f.target = weapons.registerTarget({
        alive: () => f.alive && f.state !== 'emerge',
        getPos: () => f.g.position,
        radius: 1.0,
        onHit(dmg) {
          f.hp -= dmg;
          f.hurt = 1;
          if (f.hp <= 0) killFish(f);
          return dmg;
        },
      });
      fish.push(f);
    }
    play('fishPop');
  }
  function killFish(f) {
    if (!f.alive) return;
    f.alive = false;
    f.target.remove();
    explode(f.g.position, 0x1de9b6, 0.45);
    play('fishPop');
    f.g.removeFromParent();
    f.splash.removeFromParent();
    disposeMats(f.g);
    disposeMats(f.splash);
    fish.splice(fish.indexOf(f), 1);
  }
  function updateFish(dt, time) {
    const pp = camera.position;
    for (const f of [...fish]) {
      f.t += dt;
      f.life += dt;
      f.hurt = Math.max(0, f.hurt - dt * 5);
      const u = f.g.userData;
      u.tail.rotation.y = Math.sin(time * 12 + f.phase) * 0.5;
      u.body.emissiveIntensity = 0.9 + f.hurt * 2;
      const toP = tmp.set(pp.x - f.g.position.x, 0, pp.z - f.g.position.z);
      const d = toP.length();
      if (f.state === 'emerge') {
        if (f.t < 0) continue;
        const k = Math.min(1, f.t / 0.8);
        f.g.position.y = -1.5 + Math.sin(k * PI * 0.5) * 3 + Math.sin(k * PI) * 1.2;
        f.splash.scale.setScalar(1 + k * 1.5);
        f.splash.material.opacity = 0.9 * (1 - k);
        f.g.rotation.x = -0.8 * (1 - k);
        if (k >= 1) {
          f.state = 'swim';
          f.splash.visible = false;
        }
        continue;
      }
      // 面向你
      f.g.rotation.set(0, Math.atan2(toP.x, toP.z), 0);
      const baseY = 1.3 + Math.sin(time * 3 + f.phase) * 0.25;
      if (f.state === 'swim') {
        const sp = 4.2 + (angry() ? 0.8 : 0);
        if (d > 1.2) f.g.position.addScaledVector(toP.normalize(), Math.min(d - 1, sp * dt));
        f.g.position.y += (baseY - f.g.position.y) * Math.min(1, dt * 4);
        u.jaw.rotation.x = 0.15 + Math.sin(time * 6 + f.phase) * 0.1;
        f.bite = Math.max(0, f.bite - dt);
        if (d < 1.7 && f.bite <= 0) {
          f.state = 'bite';
          f.t = 0;
          play('fishBite');
        }
      } else if (f.state === 'bite') {
        u.jaw.rotation.x = 0.7;
        if (d > 0.9) f.g.position.addScaledVector(toP.normalize(), Math.min(d - 0.8, 9 * dt));
        f.g.position.y += (camera.position.y - 0.4 - f.g.position.y) * Math.min(1, dt * 8);
        if (f.t > 0.3) {
          if (d < 2) hitPlayer('A GHOST FISH bit you');
          f.state = 'retreat';
          f.t = 0;
        }
      } else if (f.state === 'retreat') {
        u.jaw.rotation.x = 0.1;
        f.g.position.addScaledVector(toP.normalize(), -3.5 * dt);
        f.g.position.y += (baseY + 0.6 - f.g.position.y) * Math.min(1, dt * 3);
        if (f.t > 1.4) {
          f.state = 'swim';
          f.bite = 0.8;
        }
      }
      clampHall(f.g.position, 1.2);
      if (f.life > 28) killFish(f); // 太耐：潛返落地下
    }
  }

  // ---- 特效：爆炸、碎片、火花 ----
  const sparkMats = {};
  const sparkMat = (c) => (sparkMats[c] ||= new THREE.SpriteMaterial({ map: glowTexture(), color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  function spark(p, color, size = 0.6, vel = 2) {
    const s = new THREE.Sprite(sparkMat(color));
    s.position.copy(p);
    s.scale.setScalar(size);
    scene.add(s);
    fx.bursts.push({ s, v: V().randomDirection().multiplyScalar(vel), t: 0, life: 0.5, size, grow: 0 });
  }
  function explode(p, color, k = 1) {
    const s = new THREE.Sprite(sparkMat(color).clone()); // 自己一份材質（要慢慢淡）
    s.position.copy(p).setY(Math.max(p.y, 0.8));
    scene.add(s);
    fx.bursts.push({ s, v: V(), t: 0, life: 0.45, size: 1, grow: 10 * k, own: true });
    for (let i = 0; i < 10 * k + 4; i++) {
      const sp = new THREE.Sprite(sparkMat(i % 2 ? color : 0xffeb3b));
      sp.position.copy(s.position);
      sp.scale.setScalar(0.6 * k + 0.2);
      scene.add(sp);
      fx.bursts.push({ s: sp, v: V().randomDirection().multiplyScalar(6 + Math.random() * 6).setY(3 + Math.random() * 6), t: 0, life: 0.7, size: sp.scale.x, grow: 0, grav: 12 });
    }
  }
  const debrisGeo = new THREE.BoxGeometry(1, 0.25, 0.5);
  const debrisM = new THREE.MeshStandardMaterial({ color: 0x5a3c2c, roughness: 0.9 });
  function floorBurst() {
    for (let i = 0; i < 46; i++) {
      const m = new THREE.Mesh(debrisGeo, debrisM);
      const a = Math.random() * PI * 2;
      const r = Math.random() * REAPER_HOLE_R;
      m.position.set(CENTER.x + Math.cos(a) * r, 0.2, CENTER.z + Math.sin(a) * r);
      m.scale.set(0.6 + Math.random() * 1.4, 1, 0.6 + Math.random());
      m.castShadow = true;
      scene.add(m);
      const v = V(Math.cos(a) * (3 + Math.random() * 8), 8 + Math.random() * 12, Math.sin(a) * (3 + Math.random() * 8));
      fx.debris.push({ m, v, spin: V(Math.random() * 8, Math.random() * 8, Math.random() * 8), t: 0, life: 4 + Math.random() * 2 });
    }
    explode(V(CENTER.x, 1, CENTER.z), 0xff6d00, 2.4);
  }
  function updateFx(dt, view) {
    for (let i = fx.debris.length - 1; i >= 0; i--) {
      const d = fx.debris[i];
      d.t += dt;
      d.v.y -= 22 * dt;
      d.m.position.addScaledVector(d.v, dt);
      if (d.m.position.y < 0.12 && Math.hypot(d.m.position.x - CENTER.x, d.m.position.z - CENTER.z) > REAPER_HOLE_R) {
        d.m.position.y = 0.12;
        d.v.multiplyScalar(0.4);
        d.v.y = Math.abs(d.v.y) * 0.3;
        d.spin.multiplyScalar(0.5);
      }
      d.m.rotation.x += d.spin.x * dt;
      d.m.rotation.y += d.spin.y * dt;
      d.m.rotation.z += d.spin.z * dt;
      if (d.t > d.life || d.m.position.y < -8) {
        d.m.removeFromParent();
        fx.debris.splice(i, 1);
      }
    }
    for (let i = fx.bursts.length - 1; i >= 0; i--) {
      const b = fx.bursts[i];
      b.t += dt;
      if (b.grav) b.v.y -= b.grav * dt;
      b.s.position.addScaledVector(b.v, dt);
      const k = b.t / b.life;
      if (k >= 1) {
        b.s.removeFromParent();
        if (b.own) b.s.material.dispose();
        fx.bursts.splice(i, 1);
      } else if (b.grow) {
        b.s.scale.setScalar(b.size + b.grow * Math.sqrt(k));
        b.s.material.opacity = 1 - k * k;
      } else b.s.scale.setScalar(b.size * (1 - k));
    }
    for (let i = fx.fires.length - 1; i >= 0; i--) {
      const f = fx.fires[i];
      f.t += dt;
      f.s.position.addScaledVector(f.v, dt);
      if (f.s.position.y < 0.4) {
        f.s.position.y = 0.4;
        f.v.y = 0;
      }
      const k = f.t / f.life;
      f.s.scale.setScalar(0.8 + k * 4.5);
      if (k >= 1) {
        f.s.removeFromParent();
        fx.fires.splice(i, 1);
      }
    }
    for (let i = fx.beams.length - 1; i >= 0; i--) {
      const b = fx.beams[i];
      b.t += dt;
      b.m.scale.set(1 + b.t * 0.3, Math.min(14, b.t * 14), 1 + b.t * 0.3);
      if (b.t > 3.2) {
        b.m.removeFromParent();
        b.m.geometry.dispose();
        b.m.material.dispose();
        fx.beams.splice(i, 1);
      }
    }
    void view;
  }

  // ================= 💀 打贏 =================
  function startDying() {
    if (R.phase === 'dying') return;
    clearAttacks();
    R.phase = 'dying';
    R.t = 0;
    play('reaperDie');
    announce('💥 The PUMPKIN REAPER DRAGON is falling!');
    R.shake = 1;
  }
  function updateDying(dt) {
    const b = hall.boss;
    const u = b.userData;
    const t = R.t;
    pose.dying = Math.min(1, t / 5);
    pose.roar = t < 2.5 ? 1 : Math.max(0, 1 - (t - 2.5));
    pose.rage = 1;
    u.body.position.set((Math.random() - 0.5) * 0.4 * (t < 5 ? 1 : 0), 0, (Math.random() - 0.5) * 0.4 * (t < 5 ? 1 : 0));
    u.body.rotation.x = -Math.min(0.5, t * 0.12);
    // 身上射出光柱（裂開）
    if (t < 4.6 && Math.random() < dt * 6) {
      const beam = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0xff9100 : 0x76ff03, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
      beam.geometry.translate(0, 0.5, 0);
      u.chest.getWorldPosition(beam.position);
      beam.position.y += (Math.random() - 0.3) * 6;
      beam.quaternion.setFromUnitVectors(V(0, 1, 0), V().randomDirection().setY(Math.random() * 0.8));
      scene.add(beam);
      fx.beams.push({ m: beam, t: 0 });
    }
    if (t < 5 && Math.random() < dt * 6) explode(u.chest.getWorldPosition(V()).add(V((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4)), Math.random() < 0.5 ? 0xff6d00 : 0x9cff57, 0.7);
    if (t > 4.6) b.position.y = THREE.MathUtils.lerp(b.position.y, -20, Math.min(1, dt * 1.6)); // 跌返落個窿
    if (t >= 4.8 && t - dt < 4.8) {
      flash?.();
      play('floorBurst');
      R.shake = 1.2;
      explode(V(CENTER.x, 4, CENTER.z), 0xffd54f, 3);
      for (let i = 0; i < 24; i++) spark(V(CENTER.x + (Math.random() - 0.5) * 8, 2 + Math.random() * 10, CENTER.z + (Math.random() - 0.5) * 8), 0x9cff57, 1.2, 8);
    }
    if (t >= 5.6 && t - dt < 5.6) {
      b.visible = false;
      state.soulCandy = (state.soulCandy || 0) + REAPER_SOUL_CANDY;
      state.reaperBeatenAt = R.windowStart;
      save();
      onReward?.();
      ui.win.hidden = false;
      play('bigCatch');
      announce(`🍬 +${REAPER_SOUL_CANDY} SOUL CANDY! You beat the PUMPKIN REAPER DRAGON! 🐉`);
    }
    if (t >= DIE_LEN && t - dt < DIE_LEN) {
      ui.win.hidden = true;
      R.phase = 'done';
      weapons.setZone('reaper', false);
      R.inside = false;
      flash?.();
      play('portal');
      teleport(HW_ARRIVE.x, HW_ARRIVE.z, HW_ARRIVE.rotY);
      announce('🎃 Back at the Spawn Ruins. Keep your Soul Blaster! 💠');
    }
  }

  // ================= 每格 =================
  let lastStatusText = '';
  function updateUi(st, inHw, inside) {
    // 紅色警告（全世界、早 1 分鐘）
    const warning = !st.active && st.next <= REAPER_WARNING_SECONDS * 1000 && isOpen();
    ui.warn.hidden = !warning;
    if (warning) {
      const html = `⚠️ The PUMPKIN REAPER DRAGON awakens in the Abandoned Manor! ⚠️<small>in ${fmt(st.next)}</small>`;
      if (ui.warn.innerHTML !== html) ui.warn.innerHTML = html;
      if (warnPlayedFor !== st.start) {
        warnPlayedFor = st.start;
        play('reaperWarn');
      }
    }
    const beaten = state.reaperBeatenAt === st.start;
    if (st.active && !beaten && awakeSaidFor !== st.start && isOpen()) {
      awakeSaidFor = st.start;
      if (inHw && !inside) {
        announce('🐉 The PUMPKIN REAPER DRAGON is AWAKE! Go to the Abandoned Manor door!');
        play('reaperRoar');
      }
    }
    ui.pill.hidden = !(st.active && !beaten && inHw && !inside);
    if (!ui.pill.hidden) {
      const text = `🐉 The Pumpkin Reaper Dragon is awake in the 🏚️ Abandoned Manor! ⏱️ ${fmt(st.left)}`;
      if (ui.pill.textContent !== text) ui.pill.textContent = text;
    }
    // 血條
    const fighting = inside && hall && ['intro', 'fight', 'dying'].includes(R.phase) && R.ko < 0;
    ui.bar.hidden = !fighting;
    if (fighting) {
      R.shown = Math.max(R.hp, R.shown - REAPER_HP * 0.25 * (1 / 60));
      const pct = (R.hp / REAPER_HP) * 100;
      ui.bar.querySelector('i').style.width = `${pct}%`;
      ui.bar.querySelector('u').style.width = `${(R.shown / REAPER_HP) * 100}%`;
      const nums = `${Math.ceil(R.hp).toLocaleString()} / ${REAPER_HP.toLocaleString()} HP`;
      const sp = ui.bar.querySelector('span');
      if (sp.textContent !== nums) sp.textContent = nums;
      const status = R.phase === 'intro' ? '😱 It burst through the floor!' : R.phase === 'dying' ? '💥 It is falling!' : `${angry() ? '😡 ANGRY! ' : ''}💠 Shoot it! Aim for the 🎃 head · dodge the 🌀 scythe, 🔥 fire, 🎃 bombs and 🐟 fish · ⏱️ ${fmt(st.left)}`;
      const s = ui.bar.querySelector('.status');
      if (status !== lastStatusText) s.textContent = lastStatusText = status;
    }
    ui.hearts.hidden = !(inside && hall && R.phase !== 'idle' && R.phase !== 'done');
    if (!ui.hearts.hidden) {
      ui.hearts.style.setProperty('--regen', R.hearts < REAPER_HEARTS ? (R.regenT / REAPER_HEART_REGEN).toFixed(2) : '0');
      drawHearts();
    }
  }

  function update(dt, time, { paused = false, inHw = false, view = camera, frozen = false } = {}) {
    const st = reaperStatus();
    const pos = camera.position;
    const inside = inReaperHall(pos.x, pos.z);
    // 門：醒咗、未打贏先開
    const beaten = state.reaperBeatenAt === st.start;
    const open = st.active && !beaten && isOpen();
    door.visible = open && inHw;
    doorBeacon.visible = open && inHw;
    if (door.visible) {
      portal.material.opacity = 0.75 + Math.sin(time * 4) * 0.2;
      swirl.rotation.z = time * 2;
      swirl.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
      doorBeacon.update(time);
    }
    // 新一場：重新嚟過
    if (st.active && R.windowStart !== st.start && !inside) {
      resetBoss();
      R.windowStart = st.start;
    }
    // 時間到（Boss 返去瞓）
    if (!st.active && R.windowStart && R.phase !== 'dying') {
      if (inside && R.phase !== 'done') {
        announce('🌙 The PUMPKIN REAPER DRAGON sinks back under the floor... Come back next hour!');
        leave('exit');
      }
      if (!inside) {
        resetBoss();
        R.windowStart = 0;
      }
    }
    updateUi(st, inHw, inside);
    if (!hall) return;
    hall.g.visible = inside || R.phase === 'dying';
    if (!inside && R.inside) leave(); // 例如用控制台傳送走咗
    if (!inside) return;
    if (!R.inside) {
      R.inside = true;
      weapons.setZone('reaper', true);
      // 唔係經前門入嚟（例如控制台傳送）：照樣開打
      if (R.phase === 'idle' && st.active && !beaten && !travelling) {
        if (!hall.boss.visible && !R.risen) {
          R.phase = 'wait';
          R.t = 0;
        } else R.phase = 'fight';
        R.hearts = REAPER_HEARTS;
        weapons.give('soulBlaster');
      }
    }
    // 第三身鏡頭唔好退出牆外
    if (view !== camera) {
      view.position.x = THREE.MathUtils.clamp(view.position.x, HALL.x - HALL.w / 2 + 1, HALL.x + HALL.w / 2 - 1);
      view.position.z = THREE.MathUtils.clamp(view.position.z, HALL.z - HALL.d / 2 + 1, HALL.z + HALL.d / 2 - 1);
    }
    // 大廳入面嘅霧：暗紅紫
    if (scene.fog) {
      scene.fog.color.lerp(new THREE.Color(0x2a1226), 0.6);
      scene.fog.near = 20;
      scene.fog.far = 110;
    }
    for (const f of hall.g.userData.flames || []) f.userData.flicker(time);
    hall.exitGlow.material.opacity = 0.45 + Math.sin(time * 3) * 0.15;
    if (paused || frozen) return;

    // 暈低
    if (R.ko >= 0) {
      R.ko += dt;
      if (R.ko >= 0.7 && R.ko - dt < 0.7) {
        clearAttacks();
        weapons.setZone('reaper', false);
        R.inside = false;
        if (!REAPER_KEEP_DAMAGE) R.hp = R.shown = REAPER_HP;
        R.phase = 'idle';
        R.ko = -1;
        R.hearts = REAPER_HEARTS;
        teleport(KICK_OUT.x, KICK_OUT.z, KICK_OUT.rotY);
        setTimeout(() => (ui.ko.hidden = true), 1900);
        announce('💫 The dragon threw you out! Go back in and try again!');
      }
      return;
    }
    // 心慢慢回
    R.safeT = Math.max(0, R.safeT - dt);
    lostT = Math.max(0, lostT - dt);
    if (R.hearts < REAPER_HEARTS && R.phase === 'fight') {
      R.regenT += dt;
      if (R.regenT >= REAPER_HEART_REGEN) {
        R.regenT = 0;
        R.hearts += 1;
        play('heartBack');
      }
    }
    // 彈飛（噴火／爆炸）
    if (R.knock.lengthSq() > 0.01) {
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const nx = pos.x + (R.knock.x * dt) / steps;
        const nz = pos.z + (R.knock.z * dt) / steps;
        if (isWalkable(nx, pos.z, 0.4, player.feetY)) pos.x = nx;
        else R.knock.x *= -0.3;
        if (isWalkable(pos.x, nz, 0.4, player.feetY)) pos.z = nz;
        else R.knock.z *= -0.3;
      }
      R.knock.multiplyScalar(Math.exp(-dt * (player.grounded ? 6 : 1.5)));
    }

    R.t += dt;
    const boss = hall.boss;
    const u = boss.userData;
    R.hurt = Math.max(0, R.hurt - dt * 6);
    R.roar = Math.max(0, R.roar - dt * 0.8);
    pose.hurt = R.hurt;
    pose.roar = R.roar;
    pose.rage = angry() ? 1 : 0;
    pose.throwK = 0;
    pose.lobK = 0;
    pose.summonK = 0;
    if (!attack || attack.kind !== 'fire') pose.breath = Math.max(0, pose.breath - dt * 3);
    // 面向你（慢慢轉）
    if (R.phase === 'fight' || R.phase === 'intro') {
      const want = Math.atan2(pos.x - CENTER.x, pos.z - CENTER.z);
      let diff = want - boss.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const turn = attack?.kind === 'fire' && attack.t > 0.8 ? 0 : 1.6;
      boss.rotation.y += THREE.MathUtils.clamp(diff, -turn * dt, turn * dt);
    }

    if (R.phase === 'wait') {
      // 地板震 + 裂紋發光
      const k = Math.min(1, R.t / INTRO_WAIT);
      hall.crackM.opacity = k * (0.7 + Math.sin(R.t * 20) * 0.3);
      hall.patch.material.emissiveIntensity = k * 0.5;
      R.shake = Math.max(R.shake, 0.15 + k * 0.3);
      if (Math.floor(R.t * 2.5) !== Math.floor((R.t - dt) * 2.5)) play('floorCrack');
      if (R.t >= INTRO_WAIT) {
        R.phase = 'intro';
        R.t = 0;
        hall.patch.visible = false;
        hall.rim.visible = true;
        boss.visible = true;
        boss.position.y = -14;
        boss.rotation.y = Math.atan2(pos.x - CENTER.x, pos.z - CENTER.z);
        floorBurst();
        play('floorBurst');
        flash?.();
        R.shake = 1.4;
        announce('🎃🐉 THE PUMPKIN REAPER DRAGON BURSTS OUT OF THE FLOOR!');
      }
    } else if (R.phase === 'intro') {
      const k = Math.min(1, R.t / 1.6);
      boss.position.y = THREE.MathUtils.lerp(-14, 0, 1 - Math.pow(1 - k, 3)) + (k < 1 ? 0 : Math.sin(R.t * 3) * 0.05);
      hall.crackM.opacity = Math.max(0, 1 - R.t);
      hall.pitLight.intensity = 30 + Math.sin(time * 9) * 6;
      if (R.t > 1.7 && R.t - dt <= 1.7) {
        R.roar = 1.6;
        play('reaperRoar');
        R.shake = 0.9;
      }
      if (R.t >= INTRO_LEN) {
        R.phase = 'fight';
        R.risen = true;
        R.nextAttack = 1.2;
        announce('💠 SHOOT IT! Aim for the glowing pumpkin head!');
      }
    } else if (R.phase === 'fight') {
      hall.pitLight.intensity = 26 + Math.sin(time * 9) * 6 + (angry() ? 10 : 0);
      if (!attack && !R.calm) {
        R.nextAttack -= dt;
        if (R.nextAttack <= 0) startAttack(chooseAttack());
      }
      if (attack) {
        attack.t += dt;
        const a = attack;
        if (a.kind === 'scythe') {
          pose.throwK = thrown ? 0 : Math.min(1, a.t / 0.9);
          if (a.t >= 0.9 && !a.fired) {
            a.fired = true;
            throwScythe();
            play('swoosh');
          }
          if (a.fired && !thrown) attack = null;
        } else if (a.kind === 'fire') updateFire(dt);
        else if (a.kind === 'bombs') {
          pose.lobK = Math.sin(Math.min(1, a.t / 0.9) * PI);
          if (a.t >= 0.55 && !a.fired) {
            a.fired = true;
            lobBombs();
          }
          if (a.t > 1.2) attack = null;
        } else if (a.kind === 'fish') {
          pose.summonK = Math.sin(Math.min(1, a.t / 1.1) * PI);
          hall.crackM.opacity = pose.summonK * 0.6;
          if (a.t >= 0.6 && !a.fired) {
            a.fired = true;
            summonFish();
          }
          if (a.t > 1.2) attack = null;
        }
        if (!attack) R.nextAttack = REAPER_ATTACK_GAP * (angry() ? REAPER_ENRAGE_GAP : 1) * (0.8 + Math.random() * 0.4);
      }
    } else if (R.phase === 'dying') {
      updateDying(dt);
    }
    if (thrown) updateScythe(dt);
    updateBombs(dt);
    updateFish(dt, time);
    updateFx(dt, view);
    if (boss.visible) u.update(time, dt, pose);
    R.shake = Math.max(0, R.shake - dt * 1.4);
  }
  // 震畫面：main.js 畫之前加落鏡頭，畫完減返（同 meteorShake 一樣）
  const shakeV = V();
  function shake() {
    if (!R.inside || R.shake <= 0.01) return null;
    const a = R.shake * 0.35;
    return shakeV.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a * 0.8, (Math.random() - 0.5) * a);
  }

  function interaction(pos) {
    // 大廳出口：撳 E 先出（唔係行入去，因為俾火彈飛都可能撞到門口）
    if (R.inside && R.phase !== 'dying' && Math.hypot(pos.x - REAPER_EXIT.x, pos.z - REAPER_EXIT.z) < 3) return { prompt: '<kbd>E</kbd> 🚪 Run out of the manor (the dragon stays here)', action: () => leave('exit') };
    if (Math.hypot(pos.x - MANOR_DOOR.x, pos.z - MANOR_DOOR.z) > 3.6) return null;
    if (!door.visible) {
      // 未醒／打贏咗：話你知幾時醒（小朋友 Issue #12「Boss 冇出現」：佢每個鐘 :30 先醒 10 分鐘）
      const st = reaperStatus();
      const beaten = st.active && state.reaperBeatenAt === st.start;
      const wait = beaten ? st.start + REAPER_EVERY_MINUTES * MIN - Date.now() : st.next;
      return { prompt: `${beaten ? '🏆 You beat the dragon this time!' : '😴 The PUMPKIN REAPER DRAGON is sleeping...'} It wakes up in <b>${fmt(wait)}</b> (every hour at :${String(REAPER_AT_MINUTE).padStart(2, '0')})` };
    }
    if (ctx.isCarryingEgg?.()) return { prompt: '🥚 Take your egg to the Spawn Ruins first, then fight the dragon!' };
    return { prompt: '<kbd>E</kbd> 🐉 Enter the manor and fight the PUMPKIN REAPER DRAGON!', action: enter };
  }
  // 行入門口都入得（唔使撳 E）
  function autoEnter(pos) {
    if (!door.visible || travelling || ctx.isCarryingEgg?.()) return;
    if (Math.abs(pos.x - MANOR_DOOR.x) < 1.8 && pos.z > MANOR_FRONT - 1 && pos.z < MANOR_FRONT + 1.8) enter();
  }

  // ---- 測試／控制台 ----
  const debug = {
    // 召喚：delay 秒之後醒（> 0 = 先見到紅色警告）
    spawn(delay = 0) {
      forced = { start: Date.now() + delay * 1000 };
      if (state.reaperBeatenAt && state.reaperBeatenAt !== forced.start) state.reaperBeatenAt = 0;
      return reaperStatus();
    },
    // 即刻入大廳（未醒就叫醒佢）
    async goto() {
      if (!reaperStatus().active || state.reaperBeatenAt === reaperStatus().start) debug.spawn(0);
      await enter();
    },
    attack(kind) {
      if (R.phase !== 'fight') return 'not fighting';
      clearAttacks();
      startAttack(kind);
      return kind;
    },
    hurt(n = 1000) {
      if (R.phase !== 'fight') return 'not fighting';
      R.hp = Math.max(1, R.hp - n);
      return R.hp;
    },
    kill() {
      if (R.phase === 'fight') startDying();
    },
    set god(v) { R.god = v; },
    set calm(v) { R.calm = v; }, // true = 唔自己出招（影相用）
    get god() { return R.god; },
    get state() { return { ...R, knock: R.knock.toArray(), attack: attack?.kind || null, attackT: attack?.t || 0, thrown: !!thrown, fish: fish.length, bombs: bombs.length }; },
    status: () => reaperStatus(),
    get hall() { return hall; },
  };

  return {
    update, interaction, autoEnter, enter, debug, shake,
    get battle() { return R.inside && ['wait', 'intro', 'fight', 'dying'].includes(R.phase); },
    get inside() { return R.inside; },
    get busy() { return travelling || R.phase === 'dying'; },
  };
}
