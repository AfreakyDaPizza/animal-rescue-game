// 🔫 魔法武器系統（Issue #11）：Soul Blaster、Candy Pistol、Spooky Slingshot
// 可以重用：Pumpkin Reaper Dragon（src/reaperBoss.js）用緊，之後嘅 Endless Tower 都會用
// 數值喺 src/data/weapons.js；模型喺 src/weaponModels.js
//
// ================= 點樣用（API）=================
//   import { createWeapons } from './weapons.js';
//   const weapons = createWeapons({ scene, camera, avatar, play, controls, isActive });
//     controls = player.controls（MouseLook：開鏡時滑鼠會慢啲）
//     camera   = 玩家個頭（第一身鏡頭，移動用嗰個）
//     avatar   = thirdPerson.avatar（第三身公仔，槍掛喺右手）
//     play     = sound.js 嘅 play
//     isActive = () => true 先可以射（例如冇暫停、滑鼠鎖住咗）
//   每格：weapons.update(dt, { view, third, time, paused })   ← 要喺 updateThirdPerson 之後叫（view = 畫畫面嗰個鏡頭）
//
//   ⚔️ 戰鬥區：weapons.setZone('reaper', true)  → 有嘅武器出現喺快捷欄最前面（自動揀第 1 格）
//                weapons.setZone('reaper', false) → 收返埋（可以同時有幾個區，例如 'tower'）
//   🎁 武器：weapons.give('soulBlaster') → 存入 state.weapons（永遠有）；weapons.has(id)
//   🎯 目標：const t = weapons.registerTarget({
//              getPos: () => Vector3,      // 中心（世界座標）
//              radius: 1.2,                // 打中範圍（球）
//              parts: () => [{ pos, radius, mult, crit }],  // （可選）幾個球，例如個頭 mult 1.5 = 爆擊
//              alive: () => true,          // （可選）false = 唔再打得中
//              onHit(damage, { point, crit, weapon }) { ... return false = 擋咗（顯示 BLOCKED） },
//            });
//            t.remove() → 唔再係目標
//   🗼 Issue #14：weapons.setLoadout('tower', ['candyPistol']) → 喺呢個區淨係用呢幾支（唔使真係擁有；出咗區就冇）
//            weapons.setLoadout('tower', null) → 用返自己擁有嘅（state.weapons）
//            weapons.select(id) → 揀快捷欄嗰支武器
//   打中資料：onHit(damage, { point, crit, weapon, part, slow, splash, chain })
//            part = 打中嗰個球（parts() 入面嘅 object，可以加 block: true = 盾牌）· slow = { mult, time }（Frost Wand）
//            splash = 爆炸波及（Pumpkin Launcher）· chain = 閃電跳過嚟（Lightning Staff）
//   其他：weapons.held（而家拎住嘅武器資料或者 null）、weapons.aiming（0–1）、weapons.refill()（補滿子彈）
//         weapons.ammoOf(id)、weapons.onShot = (def) => {}（射咗一下）
//   射擊：Hitscan（即中，畫一條發光彈道）或者 projectile（會飛、有地心吸力，例如 Slingshot）
//   操作：電腦 左鍵射（Soul Blaster 揸住連射）、右鍵開鏡、R 換彈（冇子彈會自動換）
//         手機 FIRE（揸住）/ AIM（開／關鏡）/ RELOAD 三粒掣（拎住武器先出）

import * as THREE from 'three';
import { WEAPONS, WEAPON_ORDER } from './data/weapons.js';
import { buildWeaponModel, muzzleFlash, glowTexture, projectileModel } from './weaponModels.js';
import { state, save } from './state.js';
import { selectedHotbarItem, selectSlot, toolFlags, popup, hotbarItems } from './hud.js';
import { addSounds } from './sound.js';

const $ = (id) => document.getElementById(id);
const DEG = Math.PI / 180;
const RANGE = 160; // 子彈最遠飛幾遠（米）

// ---------- 聲效（Web Audio 合成，同 sound.js 一樣）----------
addSounds({
  blasterShot: (t, { tone, noise }) => {
    tone(1400, t, 0.09, { type: 'sawtooth', vol: 0.07, slide: 0.3 });
    tone(520, t, 0.12, { type: 'square', vol: 0.06, slide: 0.4 });
    noise(t, 0.08, { vol: 0.16, freq: 3200, q: 0.8, type: 'bandpass' });
  },
  pistolShot: (t, { tone, noise }) => {
    tone(1800, t, 0.12, { type: 'triangle', vol: 0.12, slide: 0.45 });
    tone(900, t + 0.02, 0.1, { type: 'sine', vol: 0.1, slide: 1.6 });
    noise(t, 0.05, { vol: 0.1, freq: 5000, type: 'highpass' });
  },
  slingPull: (t, { tone }) => tone(200, t, 0.35, { type: 'triangle', vol: 0.06, slide: 1.8 }),
  slingShot: (t, { tone, noise }) => {
    tone(160, t, 0.18, { type: 'sine', vol: 0.22, slide: 3.5 });
    noise(t, 0.2, { vol: 0.14, freq: 1800, q: 0.7, type: 'bandpass' });
  },
  dryFire: (t, { tone }) => tone(2400, t, 0.03, { type: 'square', vol: 0.05 }),
  reloadStart: (t, { tone, noise }) => {
    noise(t, 0.06, { vol: 0.2, freq: 2400, type: 'highpass' });
    tone(300, t + 0.05, 0.4, { type: 'sine', vol: 0.08, slide: 3 });
  },
  reloadDone: (t, { tone, noise }) => {
    noise(t, 0.05, { vol: 0.25, freq: 1800, type: 'highpass' });
    tone(660, t + 0.04, 0.08, { type: 'square', vol: 0.06 });
    tone(990, t + 0.1, 0.12, { type: 'triangle', vol: 0.08 });
  },
  // Issue #14 新武器
  pumpkinLaunch: (t, { tone, noise }) => {
    tone(140, t, 0.25, { type: 'sine', vol: 0.3, slide: 0.45 });
    noise(t, 0.18, { vol: 0.2, freq: 700, q: 0.7, type: 'bandpass' });
    tone(520, t + 0.02, 0.2, { type: 'triangle', vol: 0.06, slide: 1.8 });
  },
  pumpkinBoom: (t, { tone, noise, arp }) => {
    tone(70, t, 0.6, { type: 'sine', vol: 0.45, slide: 0.4 });
    noise(t, 0.5, { vol: 0.45, freq: 500 });
    arp(t + 0.08, [880, 1175, 1568], 0.05, { type: 'triangle', vol: 0.07 });
  },
  frostZap: (t, { tone, noise }) => {
    tone(2600, t, 0.06, { type: 'sine', vol: 0.05, slide: 0.7 });
    noise(t, 0.07, { vol: 0.08, freq: 6000, type: 'highpass' });
  },
  lightningZap: (t, { tone, noise }) => {
    noise(t, 0.25, { vol: 0.35, freq: 3500, q: 0.5, type: 'bandpass' });
    tone(180, t, 0.2, { type: 'sawtooth', vol: 0.12, slide: 0.5 });
    tone(1200, t + 0.03, 0.12, { type: 'square', vol: 0.05, slide: 0.3 });
  },
  ghostBlast: (t, { tone, noise }) => {
    noise(t, 0.22, { vol: 0.38, freq: 1400, q: 0.6, type: 'bandpass' });
    tone(420, t, 0.35, { type: 'sine', vol: 0.12, slide: 0.5 });
    tone(640, t + 0.05, 0.4, { type: 'triangle', vol: 0.06, slide: 1.3 }); // 「呼～」鬼叫
  },
  batScreech: (t, { tone }) => {
    tone(2400, t, 0.08, { type: 'triangle', vol: 0.06, slide: 1.4 });
    tone(2900, t + 0.06, 0.07, { type: 'triangle', vol: 0.05, slide: 0.8 });
    tone(300, t, 0.15, { type: 'sine', vol: 0.12, slide: 2 });
  },
  hitMarker: (t, { tone }) => tone(2600, t, 0.04, { type: 'triangle', vol: 0.07 }),
  critMarker: (t, { tone }) => {
    tone(2200, t, 0.05, { type: 'triangle', vol: 0.09 });
    tone(3300, t + 0.04, 0.07, { type: 'triangle', vol: 0.08 });
  },
});

// ---------- 畫面（準星、彈藥、開鏡、傷害數字、手機掣）----------
const CSS = `
#wpn-cross { position: fixed; left: 50%; top: 50%; width: 0; height: 0; z-index: 7; pointer-events: none; --gap: 8px; --c: #fff; }
#wpn-cross i { position: absolute; background: var(--c); box-shadow: 0 0 3px #000, 0 0 6px var(--glow, #40ffd0); border-radius: 2px; }
#wpn-cross i.u, #wpn-cross i.d { width: 2px; height: 9px; left: -1px; }
#wpn-cross i.l, #wpn-cross i.r { height: 2px; width: 9px; top: -1px; }
#wpn-cross i.u { bottom: var(--gap); } #wpn-cross i.d { top: var(--gap); }
#wpn-cross i.l { right: var(--gap); } #wpn-cross i.r { left: var(--gap); }
#wpn-cross b { position: absolute; left: -2px; top: -2px; width: 4px; height: 4px; border-radius: 50%; background: var(--c); box-shadow: 0 0 4px var(--glow, #40ffd0); }
#wpn-cross .hm { position: absolute; left: -14px; top: -14px; width: 28px; height: 28px; opacity: 0; }
#wpn-cross .hm::before, #wpn-cross .hm::after { content: ''; position: absolute; left: 13px; top: 0; width: 3px; height: 28px; background: #fff; box-shadow: 0 0 4px #000; transform: rotate(45deg); clip-path: polygon(0 0, 100% 0, 100% 30%, 0 30%, 0 70%, 100% 70%, 100% 100%, 0 100%); }
#wpn-cross .hm::after { transform: rotate(-45deg); }
#wpn-cross .hm.on { animation: wpn-hm 0.22s ease-out; }
#wpn-cross .hm.crit::before, #wpn-cross .hm.crit::after { background: #ff5252; }
@keyframes wpn-hm { 0% { opacity: 1; transform: scale(1.4); } 100% { opacity: 0; transform: scale(1); } }
#wpn-cross .charge { position: absolute; left: -22px; top: 18px; width: 44px; height: 5px; border-radius: 3px; background: rgba(0,0,0,0.5); overflow: hidden; }
#wpn-cross .charge i { position: static; display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ffd54f, #ff6d00); box-shadow: none; }
body.holding-weapon #crosshair { display: none; }
#wpn-ammo { position: fixed; right: calc(18px + env(safe-area-inset-right, 0px)); bottom: calc(118px + env(safe-area-inset-bottom, 0px)); z-index: 6; pointer-events: none;
  padding: 6px 14px; border-radius: 14px; background: linear-gradient(180deg, rgba(30, 16, 52, 0.88), rgba(14, 8, 26, 0.88)); border: 3px solid var(--c, #40ffd0);
  color: #fff; font-weight: 900; text-align: right; box-shadow: 0 0 14px var(--c, #40ffd0); min-width: 150px; }
#wpn-ammo .n { font-size: 30px; line-height: 1; } #wpn-ammo .n small { font-size: 16px; opacity: 0.7; }
#wpn-ammo .nm { font-size: 13px; opacity: 0.9; } #wpn-ammo .rl { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.15); margin-top: 4px; overflow: hidden; }
#wpn-ammo .rl i { display: block; height: 100%; width: 0; background: var(--c, #40ffd0); }
#wpn-ammo.low .n { color: #ff8a80; } #wpn-ammo .tip { font-size: 11px; opacity: 0.75; font-weight: 700; }
#wpn-scope { position: fixed; inset: 0; z-index: 4; pointer-events: none; opacity: 0;
  background: radial-gradient(circle at center, rgba(0,0,0,0) 0, rgba(0,0,0,0) min(34vh, 34vw), rgba(4, 20, 18, 0.92) calc(min(34vh, 34vw) + 2px), rgba(2, 8, 10, 0.97) 100%); }
#wpn-scope::before { content: ''; position: absolute; left: 50%; top: 50%; width: min(68vh, 68vw); height: min(68vh, 68vw); transform: translate(-50%, -50%); border-radius: 50%;
  border: 3px solid rgba(64, 255, 208, 0.9); box-shadow: 0 0 18px #40ffd0, inset 0 0 40px rgba(64, 255, 208, 0.25);
  background: linear-gradient(rgba(64,255,208,0.7), rgba(64,255,208,0.7)) center / 2px 100% no-repeat, linear-gradient(90deg, rgba(64,255,208,0.7), rgba(64,255,208,0.7)) center / 100% 2px no-repeat; }
#wpn-scope::after { content: ''; position: absolute; left: 50%; top: 50%; width: 14px; height: 14px; transform: translate(-50%, -50%); border-radius: 50%; border: 2px solid #ff5252; box-shadow: 0 0 8px #ff5252; }
#wpn-dmg { position: fixed; inset: 0; z-index: 8; pointer-events: none; overflow: hidden; }
#wpn-dmg span { position: absolute; left: 0; top: 0; font-weight: 900; font-size: 22px; color: #fff; -webkit-text-stroke: 3px #1a0b2e; paint-order: stroke fill; white-space: nowrap; will-change: transform, opacity; }
#wpn-dmg span.crit { color: #ffd740; font-size: 30px; } #wpn-dmg span.aoe { color: #ffcc80; font-size: 19px; } #wpn-dmg span.blocked { color: #b0bec5; font-size: 16px; }
#wpn-touch { position: fixed; right: calc(118px + env(safe-area-inset-right, 0px)); bottom: calc(22vh + env(safe-area-inset-bottom, 0px)); z-index: 21; display: none; flex-direction: column; gap: 8px; align-items: center; }
#wpn-touch .row { display: flex; gap: 8px; }
body.mobile.holding-weapon #wpn-touch { display: flex; }
#wpn-touch button { pointer-events: auto; touch-action: none; border: 3px solid rgba(255,255,255,0.75); color: #fff; font-weight: 900; text-shadow: 0 1px 3px #000; border-radius: 50%; margin: 0; padding: 0; }
#wpn-touch .fire { width: 84px; height: 84px; font-size: 18px; background: radial-gradient(circle, rgba(255, 82, 82, 0.85), rgba(183, 28, 28, 0.75)); }
#wpn-touch .aim, #wpn-touch .rel { width: 56px; height: 56px; font-size: 12px; background: rgba(30, 16, 52, 0.75); }
#wpn-touch .aim.on { background: rgba(64, 255, 208, 0.65); }
#wpn-touch button.down { filter: brightness(1.4); transform: scale(0.94); }
body.mobile #wpn-ammo { bottom: auto; top: calc(var(--m-row2, 110px) + 4px); right: calc(var(--m-edge, 10px) + env(safe-area-inset-right, 0px)); padding: 3px 10px; min-width: 110px; border-width: 2px; }
body.mobile #wpn-ammo .n { font-size: 20px; } body.mobile #wpn-ammo .tip { display: none; }
body.in-movie #wpn-ammo, body.in-movie #wpn-cross, body.in-movie #wpn-touch { display: none !important; }
`;

function buildUi() {
  if (!$('wpn-style')) {
    const st = document.createElement('style');
    st.id = 'wpn-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const mk = (id, html = '') => {
    const el = document.createElement('div');
    el.id = id;
    el.innerHTML = html;
    el.hidden = true;
    document.body.appendChild(el);
    return el;
  };
  const cross = mk('wpn-cross', '<i class="u"></i><i class="d"></i><i class="l"></i><i class="r"></i><b></b><div class="hm"></div><div class="charge" hidden><i></i></div>');
  const ammo = mk('wpn-ammo', '<div class="nm"></div><div class="n"></div><div class="rl"><i></i></div><div class="tip">Click shoot · Right-click aim · R reload</div>');
  const scope = mk('wpn-scope');
  scope.hidden = false;
  const dmg = mk('wpn-dmg');
  dmg.hidden = false;
  const touch = mk('wpn-touch', '<div class="row"><button class="aim">AIM</button><button class="rel">RELOAD</button></div><button class="fire">FIRE</button>');
  touch.hidden = false;
  return {
    cross, ammo, scope, dmg, touch,
    hm: cross.querySelector('.hm'), charge: cross.querySelector('.charge'), chargeFill: cross.querySelector('.charge i'),
    ammoName: ammo.querySelector('.nm'), ammoN: ammo.querySelector('.n'), ammoBar: ammo.querySelector('.rl i'),
  };
}

// 射線打球：回傳距離（打唔中 = -1）
function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const h = b * b - cc;
  if (h < 0) return -1;
  const s = Math.sqrt(h);
  const t = -b - s;
  if (t >= 0) return t;
  return -b + s >= 0 ? 0 : -1; // 喺個球入面
}

export function createWeapons({ scene, camera, avatar, play, controls = null, isActive = () => true }) {
  const ui = buildUi();
  if (!Array.isArray(state.weapons)) state.weapons = [];
  const ammo = {}; // id → 剩幾多發
  for (const id of Object.keys(WEAPONS)) ammo[id] = WEAPONS[id].mag;
  const zones = new Set();
  const loadouts = {}; // Issue #14：區 → 呢個區用嘅武器（例如女巫塔：每次入塔得一支）
  const targets = new Set();

  // ---- 模型：第一身掛鏡頭，第三身掛右手 ----
  const fpRoot = new THREE.Group();
  camera.add(fpRoot);
  const tpRoot = new THREE.Group();
  avatar.arms[1].add(tpRoot);
  tpRoot.position.set(0, -0.78, -0.12);
  tpRoot.rotation.x = -Math.PI / 2; // 槍管跟手臂方向（手臂舉向前）
  tpRoot.scale.setScalar(1.45); // Issue #12：大少少，第三身睇得清啲
  const models = {};
  function modelsOf(id) {
    if (!models[id]) {
      const fp = buildWeaponModel(id);
      const tp = buildWeaponModel(id);
      fp.visible = tp.visible = false;
      const def = WEAPONS[id];
      const fpFlash = muzzleFlash(def.color);
      fpFlash.scale.setScalar(0.35 * (fp.userData.flashScale ?? 1)); // flashScale：模型可以話閃光要細啲（例如 Slingshot）
      fp.userData.muzzle.add(fpFlash);
      const tpFlash = muzzleFlash(def.color);
      tpFlash.scale.setScalar(0.5 * (tp.userData.flashScale ?? 1));
      tp.userData.muzzle.add(tpFlash);
      fpRoot.add(fp);
      tpRoot.add(tp);
      models[id] = { fp, tp, fpFlash, tpFlash };
    }
    return models[id];
  }

  // ---- 彈道、會飛嘅彈、碎粒 ----
  const tracerGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  tracerGeo.rotateX(Math.PI / 2); // 沿 z
  const tracers = [];
  const shots = []; // projectile
  const sparks = [];
  const sparkGeo = new THREE.PlaneGeometry(1, 1);
  const sparkMats = {};
  const sparkMat = (color) => (sparkMats[color] ||= new THREE.MeshBasicMaterial({ map: glowTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  // Issue #12：彈道 = 白色芯 + 彩色光暈 + 前面一嚿光頭（樣由模型 userData.tracer 決定）
  const tracerCoreMats = {};
  const tracerCoreMat = (color) => (tracerCoreMats[color] ||= new THREE.MeshBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.65), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const tracerGlowMats = {};
  const tracerGlowMat = (color) => (tracerGlowMats[color] ||= new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  function tracer(from, to, color, style = {}) {
    const len = from.distanceTo(to);
    const m = new THREE.Group();
    const core = new THREE.Mesh(tracerGeo, tracerCoreMat(color));
    const glow = new THREE.Mesh(tracerGeo, tracerGlowMat(color));
    glow.scale.set(3.2, 3.2, 1);
    m.add(core, glow);
    m.position.copy(from);
    m.lookAt(to);
    scene.add(m);
    const head = new THREE.Mesh(sparkGeo, sparkMat(color));
    head.frustumCulled = false;
    head.scale.setScalar(style.head ?? 0.45);
    scene.add(head);
    m.traverse((o) => (o.frustumCulled = false));
    // 一嚿光（長 length 米）由槍嘴飛去目標（好快）
    tracers.push({ m, head, from: from.clone(), dir: to.clone().sub(from).normalize(), len, t: 0, speed: style.speed ?? 260, width: style.width ?? 0.03, length: style.length ?? 4, size: style.head ?? 0.45 });
  }
  // Issue #12：射嘢時由彈殼位噴出細能量粒／糖果碎（Candy Pistol 係彩色糖碎）
  const shellGeo = new THREE.CapsuleGeometry(0.5, 0.6, 3, 8); // 細細粒膠囊形
  const shells = [];
  const shellMats = {};
  const shellMat = (color) => (shellMats[color] ||= new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.2, roughness: 0.3 }));
  const ejectW = new THREE.Vector3();
  function ejectShells(model, view, third) {
    const u = model.userData;
    if (!u.eject || !u.shell) return;
    u.eject.getWorldPosition(ejectW);
    const right = tmpV.set(1, 0, 0).applyQuaternion(view.quaternion);
    const sc = third ? 1.6 : 0.3; // 第一身：模型縮細咗，粒粒都要細
    const n = u.shell.sprinkle ? 4 : 1;
    for (let i = 0; i < n; i++) {
      const col = u.shell.colors[Math.floor(Math.random() * u.shell.colors.length)];
      const s = new THREE.Mesh(shellGeo, shellMat(col));
      s.position.copy(ejectW);
      s.scale.set(1, u.shell.sprinkle ? 2.2 : 1.4, 1).multiplyScalar(u.shell.size * sc);
      s.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      s.frustumCulled = false;
      scene.add(s);
      const v = right.clone().multiplyScalar(third ? 2.8 + Math.random() * 2.4 : 0.45 + Math.random() * 0.35);
      v.y += third ? 2.1 + Math.random() * 1.8 : 0.4 + Math.random() * 0.35;
      v.addScaledVector(new THREE.Vector3().randomDirection(), third ? 0.8 : 0.25);
      const glow = new THREE.Mesh(sparkGeo, sparkMat(col)); // 光暈（永遠面向鏡頭）
      glow.frustumCulled = false;
      scene.add(glow);
      shells.push({ s, glow, v, spin: new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10), t: 0, life: 0.5 + Math.random() * 0.25, g: third ? 9 : 4, size: u.shell.size * sc * (third ? 2.5 : 1.8) });
    }
  }
  function sparkBurst(p, color, n = 6, size = 0.5) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(sparkGeo, sparkMat(color));
      s.position.copy(p);
      s.scale.setScalar(size * (0.5 + Math.random()));
      scene.add(s);
      sparks.push({ s, v: new THREE.Vector3().randomDirection().multiplyScalar(3 + Math.random() * 5), life: 0.35 + Math.random() * 0.2, t: 0, size: s.scale.x });
    }
  }

  // ---- 傷害數字 ----
  const nums = [];
  function damageNumber(point, text, cls) {
    const el = document.createElement('span');
    el.textContent = text;
    if (cls) el.className = cls;
    ui.dmg.appendChild(el);
    nums.push({ el, p: point.clone(), t: 0, dx: (Math.random() - 0.5) * 40 });
  }
  function hitMarker(crit) {
    ui.hm.classList.remove('on', 'crit');
    void ui.hm.offsetWidth;
    ui.hm.classList.add('on');
    if (crit) ui.hm.classList.add('crit');
  }

  // ---- 打中邊個目標？ ----
  const tmpV = new THREE.Vector3();
  function sphereList(tg) {
    if (tg.parts) return tg.parts();
    return [{ pos: tg.getPos(), radius: tg.radius ?? 1, mult: 1 }];
  }
  function rayHit(origin, dir, maxDist = RANGE) {
    let best = null;
    for (const tg of targets) {
      if (tg.alive && !tg.alive()) continue;
      sphereList(tg).forEach((sp, pi) => {
        const d = raySphere(origin, dir, sp.pos, sp.radius);
        if (d >= 0 && d <= maxDist && (!best || d < best.dist)) best = { tg, sp, pi, dist: d };
      });
    }
    return best;
  }
  // 回傳 false = 擋咗（盾牌）、否則係扣咗幾多
  function applyHit(hit, point, damage, def, extra = {}) {
    // 🌳 Skill Tree（Issue #14，skillTree.js）：Spell Power 加傷害、Lucky Crit 有機會 ×1.5 爆擊
    const sk = window.__skills;
    const lucky = !hit.sp.crit && Math.random() < (sk?.mult('crit') || 0);
    const crit = !!hit.sp.crit || lucky;
    const dmg = Math.round(damage * (hit.sp.mult ?? 1) * (lucky ? 1.5 : 1) * (sk?.mult('damage') ?? 1));
    const res = hit.tg.onHit?.(dmg, { point, crit, weapon: def.id, part: hit.sp, slow: def.slow || null, ...extra });
    if (res === false) {
      damageNumber(point, 'BLOCKED', 'blocked');
      sparkBurst(point, 0xb0bec5, 4, 0.4);
      return false;
    }
    damageNumber(point, String(typeof res === 'number' ? res : dmg), crit ? 'crit' : extra.splash || extra.chain ? 'aoe' : '');
    hitMarker(crit);
    play(crit ? 'critMarker' : 'hitMarker');
    sparkBurst(point, def.color, crit ? 10 : 6, crit ? 0.8 : 0.55);
    if (def.slow) sparkBurst(point, 0xe1f5fe, 3, 0.45); // ❄️ 雪花粒
    return typeof res === 'number' ? res : dmg;
  }
  // ---- Issue #14：🎃 爆炸（打中附近所有目標，越近中間扣越多）----
  const tmpC = new THREE.Vector3();
  const centerOf = (tg) => tmpC.copy(tg.getPos());
  function splashAt(point, def) {
    const P = def.projectile;
    boom(point, def.color, P.splash);
    play('pumpkinBoom');
    for (const tg of [...targets]) {
      if (tg.alive && !tg.alive()) continue;
      const c = centerOf(tg);
      const d = Math.max(0, c.distanceTo(point) - (tg.radius ?? 1) * 0.6);
      if (d > P.splash) continue;
      const dmg = P.splashDamage * (1 - 0.6 * (d / P.splash));
      applyHit({ tg, sp: { mult: 1 } }, c.clone().lerp(point, 0.3), dmg, def, { splash: true });
    }
  }
  // 爆炸畫面：光球 + 擴散光圈 + 南瓜碎粒
  const rings = [];
  const ringGeo = new THREE.RingGeometry(0.8, 1, 40);
  function boom(p, color, r) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, Math.max(0.08, p.y - 0.4), p.z);
    m.frustumCulled = false;
    scene.add(m);
    const flashS = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xffe082, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    flashS.position.copy(p);
    flashS.frustumCulled = false;
    scene.add(flashS);
    rings.push({ m, flashS, t: 0, r });
    sparkBurst(p, color, 18, 0.9);
    sparkBurst(p, 0xffeb3b, 10, 0.6);
    sparkBurst(p, 0x76ff03, 4, 0.5); // 南瓜蒂（綠色）
  }
  // ---- ⚡ 閃電（之字形，一閃一閃）----
  const bolts = [];
  function bolt(from, to, color) {
    const g = new THREE.Group();
    const n = Math.max(4, Math.min(12, Math.round(from.distanceTo(to) / 1.2)));
    const dir = to.clone().sub(from);
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(side, dir).normalize();
    let a = from.clone();
    for (let i = 1; i <= n; i++) {
      const b = from.clone().addScaledVector(dir, i / n);
      if (i < n) {
        const j = Math.min(0.6, dir.length() * 0.05);
        b.addScaledVector(side, (Math.random() - 0.5) * 2 * j).addScaledVector(up, (Math.random() - 0.5) * 2 * j);
      }
      const len = a.distanceTo(b);
      for (const [mat, w] of [[tracerCoreMat(color), 0.05], [tracerGlowMat(color), 0.22]]) {
        const seg = new THREE.Mesh(tracerGeo, mat);
        seg.position.copy(a).lerp(b, 0.5);
        seg.lookAt(b);
        seg.scale.set(w, w, len);
        seg.frustumCulled = false;
        g.add(seg);
      }
      a = b;
    }
    scene.add(g);
    bolts.push({ g, t: 0 });
    sparkBurst(to, color, 6, 0.6);
  }
  function chainFrom(firstTg, point, damage, def) {
    const C = def.chain;
    const done = new Set([firstTg]);
    let at = point.clone();
    let dmg = damage;
    for (let j = 0; j < C.jumps; j++) {
      let best = null;
      let bd = C.range;
      for (const tg of targets) {
        if (done.has(tg) || (tg.alive && !tg.alive())) continue;
        const d = centerOf(tg).distanceTo(at);
        if (d < bd) {
          bd = d;
          best = tg;
        }
      }
      if (!best) break;
      done.add(best);
      dmg *= C.falloff;
      const c = centerOf(best).clone();
      bolt(at, c, def.color);
      applyHit({ tg: best, sp: { mult: 1 } }, c, dmg, def, { chain: true });
      at = c;
    }
  }

  // ---- 輸入 ----
  const input = { down: false, pressed: false, released: false, aimHold: false, aimToggle: false };
  const mobile = () => document.body.classList.contains('mobile');
  let current = null; // 拎住嘅武器 def
  window.addEventListener('mousedown', (e) => {
    if (mobile() || !current || !isActive()) return;
    if (e.button === 0) {
      input.down = true;
      input.pressed = true;
    }
    if (e.button === 2) input.aimHold = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0 && input.down) {
      input.down = false;
      input.released = true;
    }
    if (e.button === 2) input.aimHold = false;
  });
  window.addEventListener('blur', () => {
    input.down = input.aimHold = false;
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && current && isActive()) startReload();
  });
  const tbtn = (sel, fn) => {
    const b = ui.touch.querySelector(sel);
    b.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      b.classList.add('down');
      fn(true);
    }, { passive: false });
    const up = (e) => {
      e.preventDefault();
      b.classList.remove('down');
      fn(false);
    };
    b.addEventListener('touchend', up, { passive: false });
    b.addEventListener('touchcancel', up, { passive: false });
    b.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      fn(true);
      setTimeout(() => fn(false), 120);
    });
    return b;
  };
  tbtn('.fire', (down) => {
    if (down) {
      input.down = true;
      input.pressed = true;
    } else if (input.down) {
      input.down = false;
      input.released = true;
    }
  });
  const aimBtn = tbtn('.aim', (down) => {
    if (!down) return;
    input.aimToggle = !input.aimToggle;
    aimBtn.classList.toggle('on', input.aimToggle);
  });
  tbtn('.rel', (down) => down && startReload());

  // ---- 狀態 ----
  let cooldown = 0;
  let reloading = 0; // >0 = 換緊（秒）
  let charge = -1; // >=0 = Slingshot 拉緊（秒）
  let aimK = 0;
  let kick = 0; // 槍向後彈
  let kickRoll = 0; // 後座力左右擰（隨機）
  let flashK = 0;
  let baseFov = camera.fov;
  let fovTouched = false;
  let lastHeld = null;

  function startReload() {
    if (!current || reloading > 0 || ammo[current.id] >= current.mag) return;
    reloading = 0.0001;
    charge = -1;
    play('reloadStart');
  }

  const aimDir = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const muzzleW = new THREE.Vector3();
  const spreadRight = new THREE.Vector3();
  const spreadUp = new THREE.Vector3();
  function shoot(def, view, third, chargeK = 0) {
    ammo[def.id] -= 1;
    // 瞄準：由畫面中間（準星）射出去
    view.getWorldPosition(origin);
    view.getWorldDirection(aimDir);
    const spread = THREE.MathUtils.lerp(def.spread, def.aimSpread, aimK) * DEG * (def.charge ? 1 - chargeK * 0.8 : 1);
    if (spread > 0) {
      spreadRight.set(1, 0, 0).applyQuaternion(view.quaternion);
      spreadUp.set(0, 1, 0).applyQuaternion(view.quaternion);
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * Math.tan(spread);
      aimDir.addScaledVector(spreadRight, Math.cos(a) * r).addScaledVector(spreadUp, Math.sin(a) * r).normalize();
    }
    if (third) origin.addScaledVector(aimDir, Math.max(0, tmpV.copy(camera.position).sub(origin).dot(aimDir)) - 0.5); // 第三身：由公仔前面開始計（唔好打中後面嘅嘢）
    const m = modelsOf(def.id);
    (third ? m.tp : m.fp).userData.muzzle.getWorldPosition(muzzleW);
    const damage = def.charge ? Math.round(THREE.MathUtils.lerp(def.charge.minDamage, def.charge.maxDamage, chargeK)) : def.damage;
    const range = def.range || RANGE;
    if (def.projectile) {
      // 會飛嘅彈：由槍嘴飛向準星對住嘅位
      const P = def.projectile;
      const hit = rayHit(origin, aimDir);
      const aimPoint = tmpV.copy(origin).addScaledVector(aimDir, hit ? hit.dist : 60).clone();
      const speed = P.speed * (def.charge ? 0.55 + chargeK * 0.45 : 1);
      const side = new THREE.Vector3(1, 0, 0).applyQuaternion(view.quaternion);
      for (let k = 0; k < (P.count || 1); k++) {
        const v = aimPoint.clone().sub(muzzleW).normalize().multiplyScalar(speed);
        v.y += P.gravity * (muzzleW.distanceTo(aimPoint) / speed) * 0.5; // 預返地心吸力
        if (P.count > 1) { // 🦇 幾隻蝙蝠：散開少少飛出去（之後自己追敵人）
          v.addScaledVector(side, (k - (P.count - 1) / 2) * speed * 0.35);
          v.y += (k % 2 ? 1 : -0.3) * speed * 0.12;
        }
        let s;
        if (P.model) {
          s = projectileModel(P.model, def.color);
          if (!third) s.scale.multiplyScalar(0.8);
        } else {
          s = new THREE.Mesh(sparkGeo, sparkMat(def.color));
          s.scale.setScalar(0.6 + chargeK * 0.6);
          const core = new THREE.Mesh(new THREE.SphereGeometry(0.09 + chargeK * 0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0xffa000, emissiveIntensity: 2.5 }));
          s.add(core);
        }
        s.position.copy(muzzleW);
        s.traverse((o) => (o.frustumCulled = false));
        scene.add(s);
        shots.push({ s, v, def, damage, t: 0, gravity: P.gravity, model: !!P.model, homing: P.homing || 0, delay: k * 0.07 });
      }
    } else {
      // Hitscan：Ghost Shotgun 一下幾粒（每隻敵人每個部位加埋先出一個數）
      const pellets = def.pellets || 1;
      const agg = new Map();
      for (let k = 0; k < pellets; k++) {
        const dir = aimDir.clone();
        if (pellets > 1 && k > 0) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * Math.tan(spread);
          dir.addScaledVector(spreadRight.set(1, 0, 0).applyQuaternion(view.quaternion), Math.cos(a) * r).addScaledVector(spreadUp.set(0, 1, 0).applyQuaternion(view.quaternion), Math.sin(a) * r).normalize();
        }
        const hit = rayHit(origin, dir, range);
        let end;
        if (hit) {
          end = origin.clone().addScaledVector(dir, hit.dist);
          if (pellets > 1) {
            if (!agg.has(hit.tg)) agg.set(hit.tg, new Map());
            const parts = agg.get(hit.tg);
            const a = parts.get(hit.pi) || { hit, point: end, dmg: 0 };
            a.dmg += damage;
            parts.set(hit.pi, a);
          } else {
            const res = applyHit(hit, end, damage, def);
            if (def.chain && res !== false) chainFrom(hit.tg, end, damage, def);
          }
        } else {
          // 打唔中：去到地面或者好遠
          let d = Math.min(range, RANGE * 0.4);
          if (dir.y < -0.01) d = Math.min(d, (origin.y - 0.02) / -dir.y);
          end = origin.clone().addScaledVector(dir, d);
          if (dir.y < -0.01 && d < range) sparkBurst(end, def.color, 3, 0.35);
        }
        // 第一身：光由槍嘴前面少少開始（太近鏡頭會好大條）
        const from = muzzleW.clone();
        if (!third) from.addScaledVector(tmpV.copy(end).sub(from).normalize(), Math.min(1.2, from.distanceTo(end) * 0.5));
        if (def.chain) bolt(from, end, def.color);
        else tracer(from, end, def.color, (third ? m.tp : m.fp).userData.tracer);
      }
      for (const parts of agg.values()) for (const a of parts.values()) applyHit(a.hit, a.point, a.dmg, def);
    }
    // 後座力：鏡頭向上彈少少（隨機左右）
    const rec = def.recoil * DEG * (1 - aimK * 0.5);
    camera.rotation.x = Math.min(1.45, camera.rotation.x + rec);
    camera.rotation.y += (Math.random() - 0.5) * rec * 0.6;
    kick = 1;
    kickRoll = (Math.random() - 0.5) * 2;
    flashK = 1;
    m.fp.userData.fire?.();
    m.tp.userData.fire?.();
    ejectShells(third ? m.tp : m.fp, view, third);
    play(def.sound || 'blasterShot');
    for (const g of [m.fp, m.tp]) for (const mat of g.userData.glows) mat.emissiveIntensity = 5;
    api.onShot?.(def);
    if (ammo[def.id] <= 0) setTimeout(() => current === def && ammo[def.id] <= 0 && startReload(), 250); // 冇子彈：自動換
  }

  function setFov(view, fov) {
    for (const c of new Set([camera, view])) {
      if (Math.abs(c.fov - fov) > 0.001) {
        c.fov = fov;
        c.updateProjectionMatrix();
      }
    }
  }

  function updateHeldModels(def, third, time, dt) {
    for (const [id, m] of Object.entries(models)) {
      const on = def && def.id === id;
      m.fp.visible = on && !third && !(aimK > 0.85 && def.zoom >= 2); // 開鏡（瞄準鏡）：收埋槍，用鏡嘅畫面
      m.tp.visible = on && third;
    }
    if (!def) return;
    const m = modelsOf(def.id);
    m.fp.visible = !third && !(aimK > 0.85 && def.zoom >= 2);
    m.tp.visible = third;
    const ud = m.fp.userData;
    // 換彈動畫：槍斜落、彈匣跌出去再入返
    const rk = reloading > 0 ? Math.min(1, reloading / def.reload) : 0;
    const dip = reloading > 0 ? Math.sin(rk * Math.PI) : 0;
    const magOut = reloading > 0 ? Math.max(0, Math.sin(Math.min(1, rk * 1.4) * Math.PI)) : 0;
    for (const g of [m.fp, m.tp]) {
      const u = g.userData;
      if (u.reload) u.reload(rk); // Issue #12：模型自己嘅換彈動畫（能量罐飛出去再塞返）
      else if (u.mag && u.magRest && !u.setPull) {
        u.mag.position.copy(u.magRest);
        u.mag.position.y -= magOut * 0.35;
        u.mag.rotation.x = magOut * 0.6;
      }
      if (u.setPull) u.setPull(charge >= 0 ? Math.min(1, charge / def.charge.max) : 0);
      if (u.ammo) u.ammo.visible = reloading <= 0 && ammo[def.id] > 0;
      u.animate?.(time);
      for (const mat of u.glows) mat.emissiveIntensity += (2.2 - mat.emissiveIntensity) * Math.min(1, dt * 10);
    }
    // 第一身位置：腰射 ↔ 開鏡（槍去畫面中間）
    const hip = ud.hip || { x: 0.26, y: -0.25, z: -0.62 };
    const ads = { x: 0, y: (ud.aimY ?? -0.2) * 0.6, z: ud.adsZ ?? -0.45 }; // adsZ：瞄準鏡要貼近眼
    const bob = Math.sin(time * 1.6) * 0.006;
    // 後座力：一下子彈後（kick²，快）再慢慢返；力度跟 recoil；開鏡時細啲
    const kk = kick * kick * Math.min(1.6, 0.6 + def.recoil * 0.5) * (1 - aimK * 0.6);
    const kxy = 1 - (1 - aimK) * (1 - aimK); // 開鏡：先移去畫面中間…
    const kz = aimK * aimK; // …先至貼近隻眼（瞄準鏡唔會大嚿咁喺角落飛過）
    // 換彈：槍擰側少少（彈匣嗰邊向住畫面中間），睇到能量罐飛出飛入
    fpRoot.position.set(
      THREE.MathUtils.lerp(hip.x, ads.x, kxy) + kk * kickRoll * 0.008 - dip * 0.06,
      THREE.MathUtils.lerp(hip.y, ads.y, kxy) + bob + dip * 0.03 + kk * 0.012,
      THREE.MathUtils.lerp(hip.z, ads.z, kz) + kk * 0.07,
    );
    fpRoot.rotation.set(kk * 0.16 - dip * 0.3 + Math.sin(rk * Math.PI * 2) * dip * 0.08, (1 - aimK) * 0.06 + dip * 0.35, -dip * 0.55 + kk * kickRoll * 0.06);
    fpRoot.scale.setScalar(0.3);
    m.fpFlash.userData.show(!third ? flashK : 0);
    m.tpFlash.userData.show(third ? flashK : 0);
  }

  // 第三身：右手（同左手扶住）舉起向前，跟住鏡頭上下
  function poseArms(view) {
    const pitch = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').x;
    const k = reloading > 0 ? 0.6 : 1;
    avatar.arms[1].rotation.set(Math.PI / 2 + pitch * k - kick * 0.15, 0, -0.08);
    avatar.arms[0].rotation.set(Math.PI / 2 + pitch * k - 0.1, 0, 0.55);
  }

  const proj = new THREE.Vector3();
  function update(dt, { view = camera, third = false, time = 0, paused = false } = {}) {
    dt = Math.max(0, dt || 0); // 時鐘偶然倒退（dt < 0）：閃光／後座力會變到好大（成個畫面白晒），當 0 算
    const sel = selectedHotbarItem();
    const def = !paused && zones.size > 0 && sel?.item.weapon ? WEAPONS[sel.item.weapon] : null; // 戰鬥區以外一定唔拎槍（小朋友 Issue #13）
    if (def !== current) {
      charge = -1;
      reloading = 0;
      input.down = false;
    }
    current = def;
    api.held = def;
    document.body.classList.toggle('holding-weapon', !!def);
    // 開鏡
    const wantAim = !!def && reloading <= 0 && (input.aimHold || input.aimToggle) && isActive();
    aimK += ((wantAim ? 1 : 0) - aimK) * Math.min(1, dt * 12);
    if (aimK < 0.002) aimK = 0;
    api.aiming = aimK;
    if (controls) controls.sensMul = def && aimK > 0 ? 1 / (1 + (def.zoom - 1) * aimK) : 1; // 開鏡：滑鼠慢啲，易瞄
    if (!fovTouched && aimK === 0) baseFov = camera.fov;
    if (aimK > 0 && def) {
      setFov(view, baseFov / (1 + (def.zoom - 1) * aimK));
      fovTouched = true;
    } else if (fovTouched) {
      setFov(view, baseFov);
      fovTouched = false;
    }
    ui.scope.style.opacity = def && def.zoom >= 2 && aimK > 0.6 ? String((aimK - 0.6) / 0.4) : '0';
    // 第三身拎住武器：鏡頭喺右膊頭後面（公仔唔會遮住準星）；開鏡再行近啲
    if (def && third && view !== camera) {
      view.position.add(tmpV.set(1.1, 0.15, 0).applyQuaternion(camera.quaternion));
      if (aimK > 0) view.position.lerp(tmpV.set(0.8, 0.1, 0).applyQuaternion(camera.quaternion).add(camera.position), aimK * 0.65);
    }
    // 射擊
    cooldown = Math.max(0, cooldown - dt);
    kick = Math.max(0, kick - dt * 8);
    flashK = Math.max(0, flashK - dt * 18);
    if (def) {
      if (reloading > 0) {
        reloading += dt * (window.__skills?.mult('reload') ?? 1); // 🌳 Quick Hands：換快啲
        if (reloading >= def.reload) {
          reloading = 0;
          ammo[def.id] = def.mag;
          play('reloadDone');
        }
      }
      const canShoot = isActive() && reloading <= 0;
      if (def.charge) {
        if (input.pressed && canShoot) {
          if (ammo[def.id] <= 0) {
            play('dryFire');
            startReload();
          } else if (cooldown <= 0) {
            charge = 0;
            play('slingPull');
          }
        }
        if (charge >= 0) {
          charge = Math.min(def.charge.max, charge + dt);
          if (input.released || !input.down) {
            if (charge >= def.charge.min && canShoot) {
              shoot(def, view, third, Math.min(1, charge / def.charge.max));
              cooldown = 1 / def.fireRate;
            }
            charge = -1;
          }
        }
      } else if (canShoot && cooldown <= 0 && ((def.auto && input.down) || (!def.auto && input.pressed))) {
        if (ammo[def.id] > 0) {
          shoot(def, view, third);
          cooldown = 1 / def.fireRate;
        } else if (input.pressed) {
          play('dryFire');
          startReload();
        }
      }
      if (third && !paused) poseArms(view);
    }
    input.pressed = false;
    input.released = false;
    updateHeldModels(def, third, time, dt);
    if (def && def !== lastHeld) popup(`${def.emoji} ${def.name}: ${def.desc}`);
    lastHeld = def;

    // 準星 + 彈藥
    ui.cross.hidden = !def;
    ui.ammo.hidden = !def;
    ui.touch.style.display = def && mobile() ? 'flex' : '';
    if (def) {
      const gap = 6 + THREE.MathUtils.lerp(def.spread, def.aimSpread, aimK) * 4 + kick * 6;
      ui.cross.style.setProperty('--gap', `${gap.toFixed(1)}px`);
      const col = `#${def.color.toString(16).padStart(6, '0')}`;
      ui.cross.style.setProperty('--glow', col);
      ui.cross.style.opacity = def.zoom >= 2 && aimK > 0.6 ? '0' : '1';
      ui.ammo.style.setProperty('--c', col);
      const nm = `${def.emoji} ${def.name}`;
      if (ui.ammoName.textContent !== nm) ui.ammoName.textContent = nm;
      const n = reloading > 0 ? 'RELOADING' : `${ammo[def.id]}<small> / ${def.mag}</small>`;
      if (ui.ammoN.innerHTML !== n) ui.ammoN.innerHTML = n;
      ui.ammo.classList.toggle('low', reloading <= 0 && ammo[def.id] <= Math.ceil(def.mag * 0.2));
      ui.ammoBar.style.width = `${reloading > 0 ? Math.min(100, (reloading / def.reload) * 100) : (ammo[def.id] / def.mag) * 100}%`;
      ui.charge.hidden = !def.charge;
      if (def.charge) ui.chargeFill.style.width = `${charge >= 0 ? (charge / def.charge.max) * 100 : 0}%`;
    }

    // 彈道
    for (let i = tracers.length - 1; i >= 0; i--) {
      const tr = tracers[i];
      tr.t += dt;
      const raw = tr.t * tr.speed; // 光頭飛咗幾遠
      const head = Math.min(tr.len, raw);
      const tail = Math.min(tr.len, Math.max(0, raw - tr.length)); // 光尾
      tr.m.position.copy(tr.from).addScaledVector(tr.dir, (head + tail) / 2);
      tr.m.scale.set(tr.width, tr.width, Math.max(0.01, head - tail));
      tr.head.position.copy(tr.from).addScaledVector(tr.dir, head);
      tr.head.quaternion.copy(view.quaternion);
      tr.head.scale.setScalar(tr.size * (raw >= tr.len ? Math.max(0, 1 - (raw - tr.len) / tr.length) * 1.6 : 1));
      if (raw - tr.length >= tr.len) {
        scene.remove(tr.m, tr.head);
        tracers.splice(i, 1);
      }
    }
    // 會飛嘅彈
    for (let i = shots.length - 1; i >= 0; i--) {
      const sh = shots[i];
      if (sh.delay > 0) { // 🦇 一隻跟一隻飛出去
        sh.delay -= dt;
        sh.s.visible = false;
        continue;
      }
      sh.t += dt;
      sh.s.visible = true;
      const from = sh.s.position.clone();
      // 🦇 追敵人：揾前面最近嘅目標，慢慢轉彎
      if (sh.homing && sh.t > 0.12) {
        let best = null;
        let bd = 30;
        const sp = sh.v.length();
        const fwd = tmpV.copy(sh.v).normalize();
        for (const tg of targets) {
          if (tg.alive && !tg.alive()) continue;
          const c = centerOf(tg);
          const d = c.distanceTo(from);
          if (d < bd && fwd.dot(c.clone().sub(from).normalize()) > 0.1) {
            bd = d;
            best = c.clone();
          }
        }
        if (best) {
          const want = best.sub(from).normalize().multiplyScalar(sp);
          sh.v.lerp(want, Math.min(1, sh.homing * dt)).setLength(sp);
        }
      }
      sh.v.y -= sh.gravity * dt;
      sh.s.position.addScaledVector(sh.v, dt);
      if (sh.model) sh.s.userData.fly?.(sh.v, sh.t, dt);
      else sh.s.quaternion.copy(view.quaternion);
      // Issue #12：飛行時留低一串發光尾巴
      sh.trail = (sh.trail || 0) + dt;
      if (sh.trail > 0.02) {
        sh.trail = 0;
        const tp = new THREE.Mesh(sparkGeo, sparkMat(sh.def.color));
        tp.position.copy(sh.s.position);
        tp.scale.setScalar((sh.model ? 0.25 : 0.35) + Math.random() * 0.15);
        scene.add(tp);
        sparks.push({ s: tp, v: new THREE.Vector3().randomDirection().multiplyScalar(0.4), life: 0.3, t: 0, size: tp.scale.x });
      }
      const step = sh.s.position.distanceTo(from);
      const dir = sh.s.position.clone().sub(from).normalize();
      const hit = rayHit(from, dir, step);
      let p = null;
      if (hit) {
        p = from.clone().addScaledVector(dir, hit.dist);
        applyHit(hit, p, sh.damage, sh.def);
      }
      if (hit || sh.s.position.y < 0 || sh.t > 4) {
        if (sh.def.projectile.splash) splashAt(p || sh.s.position.clone().setY(Math.max(0.3, sh.s.position.y)), sh.def);
        else if (!hit) sparkBurst(sh.s.position, sh.def.color, 5, 0.4);
        scene.remove(sh.s);
        if (sh.model) sh.s.userData.dispose?.();
        else sh.s.children[0].geometry.dispose();
        shots.splice(i, 1);
      }
    }
    // 🎃 爆炸光圈 + ⚡ 閃電（Issue #14）
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.t += dt;
      const k = r.t / 0.45;
      r.m.scale.setScalar(0.5 + k * r.r);
      r.m.material.opacity = 0.9 * (1 - k);
      r.flashS.quaternion.copy(view.quaternion);
      r.flashS.scale.setScalar(r.r * 1.6 * (1 - k * 0.5));
      r.flashS.material.opacity = Math.max(0, 1 - k * 2);
      if (k >= 1) {
        scene.remove(r.m, r.flashS);
        r.m.material.dispose();
        r.flashS.material.dispose();
        rings.splice(i, 1);
      }
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.t += dt;
      b.g.visible = b.t < 0.06 || Math.sin(b.t * 90) > -0.3; // 一閃一閃
      if (b.t > 0.2) {
        scene.remove(b.g);
        bolts.splice(i, 1);
      }
    }
    // 彈殼粒（Issue #12）
    for (let i = shells.length - 1; i >= 0; i--) {
      const sh = shells[i];
      sh.t += dt;
      sh.v.y -= sh.g * dt;
      sh.s.position.addScaledVector(sh.v, dt);
      sh.s.rotation.x += sh.spin.x * dt;
      sh.s.rotation.y += sh.spin.y * dt;
      sh.s.rotation.z += sh.spin.z * dt;
      sh.glow.position.copy(sh.s.position);
      sh.glow.quaternion.copy(view.quaternion);
      sh.glow.scale.setScalar(sh.size * Math.max(0.01, 1 - sh.t / sh.life));
      if (sh.t >= sh.life) {
        scene.remove(sh.s, sh.glow);
        shells.splice(i, 1);
      }
    }
    // 火花
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.t += dt;
      sp.v.y -= 6 * dt;
      sp.s.position.addScaledVector(sp.v, dt);
      sp.s.quaternion.copy(view.quaternion);
      sp.s.scale.setScalar(sp.size * Math.max(0.01, 1 - sp.t / sp.life));
      if (sp.t >= sp.life) {
        scene.remove(sp.s);
        sparks.splice(i, 1);
      }
    }
    // 傷害數字（跟住世界位置，飄上去）
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i];
      n.t += dt;
      proj.copy(n.p);
      proj.y += n.t * 1.6;
      proj.project(view);
      const k = n.t / 0.9;
      if (k >= 1 || proj.z > 1) {
        n.el.remove();
        nums.splice(i, 1);
        continue;
      }
      const x = (proj.x * 0.5 + 0.5) * w + n.dx * k;
      const y = (-proj.y * 0.5 + 0.5) * h;
      const sc = k < 0.15 ? 1.4 - k * 2.6 : 1;
      n.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${sc.toFixed(2)})`;
      n.el.style.opacity = String(Math.min(1, (1 - k) * 2.5));
    }
  }

  // ---- 快捷欄：喺戰鬥區先出 ----
  function refreshHotbar() {
    const armed = zones.size > 0;
    const before = toolFlags.weapons?.join(',') || '';
    const lo = [...zones].map((z) => loadouts[z]).find(Boolean); // Issue #14：呢個區有自己嘅武器（例如女巫塔）
    toolFlags.weapons = !armed ? [] : lo ? lo.filter((id) => WEAPONS[id]) : WEAPON_ORDER.filter((id) => state.weapons.includes(id));
    if (toolFlags.weapons.join(',') !== before && toolFlags.weapons.length) selectSlot(0);
  }
  function setZone(name, on) {
    if (on === zones.has(name)) return;
    if (on) zones.add(name);
    else zones.delete(name);
    refreshHotbar();
    if (!on && !zones.size) {
      input.aimToggle = false;
      ui.touch.querySelector('.aim').classList.remove('on');
    }
  }
  function give(id) {
    if (!WEAPONS[id] || state.weapons.includes(id)) return false;
    state.weapons.push(id);
    save();
    refreshHotbar();
    return true;
  }
  function setLoadout(zone, ids) {
    loadouts[zone] = ids ? [...ids] : null;
    refreshHotbar();
  }
  function select(id) {
    const i = hotbarItems().findIndex((x) => x?.item?.weapon === id);
    if (i >= 0) selectSlot(i);
  }
  function registerTarget(t) {
    targets.add(t);
    t.remove = () => targets.delete(t);
    return t;
  }

  const api = {
    update, setZone, give, registerTarget, setLoadout, select,
    has: (id) => state.weapons.includes(id),
    refill: () => Object.keys(WEAPONS).forEach((id) => (ammo[id] = WEAPONS[id].mag)),
    ammoOf: (id) => ammo[id],
    get reloading() { return reloading > 0; },
    get armed() { return zones.size > 0; },
    held: null, aiming: 0, onShot: null,
    targets, WEAPONS,
    debugFx: () => ({ tracers: tracers.map((t) => [t.t.toFixed(2), t.len.toFixed(1)]), shots: shots.length, sparks: sparks.length, flash: flashK, booms: rings.length, bolts: bolts.length }),
  };
  return api;
}
