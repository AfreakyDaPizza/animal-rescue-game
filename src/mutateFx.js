// ✨ 變異動畫（小朋友 2026-11-03：「the mutation stuff doesnt have any animations」）
// 用 Shard 變異一隻寵物：全畫面播一段 3–4 秒嘅短片
//   寵物彈出嚟 → Shard 水晶飛埋去「撞」落佢身 → 閃光 + 粒子爆 → 寵物用變異顏色發光、轉轉轉
//   → 第二下閃光 → 寵物變咗新樣（有變異特效）+ 大字「🔥 FIRE!」
// ⏳ Time Shard 特別版：時鐘滴答聲、寵物縮到好細 → 「啵」一聲彈返出嚟變可愛、搖搖眼彈出嚟、時鐘光環出現、「⏳ TIME!」
// 撳滑鼠／任何掣：跳過
// 🐎 Ridable Shard（Issue #16）：playSaddleFx —— 寵物瞓低 → 馬鞍由天跌落嚟「啪」一聲放好 + 閃閃 → 寵物企返起身、威威哋 →「🐎 RIDABLE!」
//
// 用法（inventory.js）：playMutationFx({ pet, kind, gearType, before, onDone })
//   pet：寵物資料（已經變咗異，存咗檔；呢度淨係播片，唔改資料）
//   kind：新變異（'fire'…）；before：變之前嘅變異 list（片頭個樣）；gearType：用咗邊種 Shard（飛埋去嗰粒水晶）
//
// 點解用自己一個細 WebGL 畫布（唔用主畫面）：用 Shard 嗰陣背包開住、主世界暫停緊；咁樣唔使改主 loop，播完就收起

import * as THREE from 'three';
import { state } from './state.js';
import { findAnimal, mutationInfo } from './data/animals.js';
import { buildAnimalModel, flipUpsideDown } from './animalModels.js';
import { applyPetSkin, activePetSkin } from './skins.js';
import { addFireAura, animateModelAuras } from './fireAura.js';
import { buildShardModel } from './gearArt.js';
import { addSaddle } from './saddle.js'; // 🐎 Ridable Shard
import { play, addSounds } from './sound.js';

// 🎮 數字（可以自己改）
const LENGTH = 3.8; // 普通變異片長（秒）
const LENGTH_TIME = 4.4; // ⏳ Time 版長啲
const HIT = 1.25; // 水晶撞落寵物嘅時間
const REVEAL = 2.45; // 變好、出大字嘅時間

const PI = Math.PI;
const UP = new THREE.Vector3(0, 1, 0);
const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const backOut = (k) => {
  k = Math.min(1, Math.max(0, k));
  const c = 2.2;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
};
// 彈簧咁彈：0 → 1（過咗少少再返嚟）
const elastic = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -9 * k) * Math.sin(((k * 10 - 0.75) * 2 * PI) / 3) + 1);

addSounds({
  // ⏳ 時鐘滴答
  tick: (t, { tone, noise }) => {
    tone(2400, t, 0.03, { type: 'square', vol: 0.05 });
    noise(t, 0.03, { vol: 0.12, freq: 3500, q: 2, type: 'bandpass' });
  },
  tock: (t, { tone, noise }) => {
    tone(1600, t, 0.035, { type: 'square', vol: 0.05 });
    noise(t, 0.035, { vol: 0.12, freq: 2200, q: 2, type: 'bandpass' });
  },
  // 變異「啵」一聲變好：閃閃琶音 + 高音
  mutateReveal: (t, { tone, noise, arp }) => {
    arp(t, [523, 659, 784, 1047, 1319, 1568], 0.06, { type: 'triangle', vol: 0.16 });
    noise(t, 0.9, { vol: 0.09, freq: 6000, type: 'highpass' });
    tone(2093, t + 0.36, 0.5, { type: 'sine', vol: 0.12 });
  },
  // 🐎 馬鞍放好：皮「啪」一聲 + 金鈴
  saddleThump: (t, { tone, noise, arp }) => {
    noise(t, 0.12, { vol: 0.35, freq: 900, type: 'lowpass' });
    tone(140, t, 0.16, { type: 'sine', vol: 0.3, slide: 0.5 });
    arp(t + 0.08, [1319, 1568, 2093], 0.06, { type: 'triangle', vol: 0.12 });
  },
  // 🐎 寵物企返起身：「嘶～」咁（向上滑嘅音）+ 號角
  proudNeigh: (t, { tone, arp }) => {
    tone(440, t, 0.35, { type: 'sawtooth', vol: 0.06, slide: 1.6 });
    tone(660, t + 0.05, 0.3, { type: 'triangle', vol: 0.08, slide: 1.3 });
    arp(t + 0.3, [523, 659, 784, 1047], 0.08, { type: 'square', vol: 0.07 });
  },
  // ⏳ 可愛版：「啵」+ 搖搖聲 + 鐘聲
  cutePop: (t, { tone, arp }) => {
    tone(260, t, 0.18, { type: 'sine', vol: 0.35, slide: 3.5 });
    tone(520, t + 0.16, 0.35, { type: 'sine', vol: 0.12, slide: 0.6 });
    arp(t + 0.2, [1047, 1319, 1568, 2093], 0.07, { type: 'sine', vol: 0.13 });
    tone(1568, t + 0.5, 0.9, { type: 'triangle', vol: 0.1 });
  },
});

// ---------- 畫面（第一次用先整，之後重用）----------
let ui = null;
function ensureUi() {
  if (ui) return ui;
  const st = document.createElement('style');
  st.textContent = `
#mutate-fx { position: fixed; inset: 0; z-index: 8000; cursor: pointer; user-select: none; overflow: hidden;
  background: radial-gradient(circle at 50% 48%, color-mix(in srgb, var(--c, #fff) 38%, #120a24) 0%, #0b0716 62%, #000 100%);
  opacity: 0; transition: opacity 0.3s; }
#mutate-fx.on { opacity: 1; }
#mutate-fx canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#mutate-fx .mfx-rays { position: absolute; left: 50%; top: 48%; width: 160vmax; height: 160vmax; transform: translate(-50%, -50%); pointer-events: none; opacity: 0;
  background: repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--c, #fff) 30%, transparent) 0deg 8deg, transparent 8deg 20deg);
  -webkit-mask: radial-gradient(circle, #000 0%, transparent 55%); mask: radial-gradient(circle, #000 0%, transparent 55%); animation: mfx-spin 14s linear infinite; transition: opacity 0.6s; }
#mutate-fx.revealed .mfx-rays { opacity: 1; }
@keyframes mfx-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
#mutate-fx .mfx-flash { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(circle at 50% 48%, #fff 0%, var(--c, #fff) 40%, transparent 80%); }
#mutate-fx .mfx-flash.go { animation: mfx-flash 0.7s ease-out; }
@keyframes mfx-flash { 0% { opacity: 1; } 100% { opacity: 0; } }
#mutate-fx .mfx-top { position: absolute; top: calc(6vh + env(safe-area-inset-top, 0px)); left: 0; right: 0; text-align: center; color: #fff; font: 900 clamp(18px, 3.2vw, 30px) system-ui, sans-serif;
  text-shadow: 0 2px 0 #000, 0 0 12px var(--c, #fff); padding: 0 16px; }
#mutate-fx .mfx-label { position: absolute; left: 0; right: 0; bottom: calc(11vh + env(safe-area-inset-bottom, 0px)); text-align: center; pointer-events: none; padding: 0 16px; opacity: 0; transform: scale(0.2); }
#mutate-fx .mfx-label b { display: block; font: 900 clamp(40px, 9vw, 96px) system-ui, sans-serif; color: #fff; letter-spacing: 2px; line-height: 1.05;
  -webkit-text-stroke: 3px color-mix(in srgb, var(--c, #fff) 45%, #000); text-shadow: 0 6px 0 rgba(0,0,0,0.45), 0 0 28px var(--c, #fff), 0 0 60px var(--c, #fff); }
#mutate-fx .mfx-label small { display: block; margin-top: 8px; font: 800 clamp(15px, 2.4vw, 22px) system-ui, sans-serif; color: #fff; text-shadow: 0 2px 0 #000; }
#mutate-fx .mfx-label.go { animation: mfx-pop 0.6s cubic-bezier(0.2, 1.8, 0.4, 1) forwards; }
#mutate-fx .mfx-label.go b { animation: mfx-wiggle 1.2s ease-in-out 0.6s infinite; }
@keyframes mfx-pop { 0% { opacity: 0; transform: scale(0.2) rotate(-8deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
@keyframes mfx-wiggle { 0%, 100% { transform: rotate(-2deg) scale(1); } 50% { transform: rotate(2deg) scale(1.06); } }
#mutate-fx .mfx-skip { position: absolute; right: 16px; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); color: rgba(255,255,255,0.7); font: 700 14px system-ui, sans-serif; text-shadow: 0 1px 0 #000; }
`;
  document.head.appendChild(st);
  const root = document.createElement('div');
  root.id = 'mutate-fx';
  root.hidden = true;
  root.innerHTML = '<div class="mfx-rays"></div><canvas></canvas><div class="mfx-flash"></div><div class="mfx-top"></div><div class="mfx-label"></div><div class="mfx-skip">Click or press any key to skip ⏩</div>';
  document.body.appendChild(root);
  const canvas = root.querySelector('canvas');
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
  } catch {
    renderer = null; // 冇 WebGL：淨係出大字
  }
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100);
  ui = { root, canvas, renderer, camera, flash: root.querySelector('.mfx-flash'), top: root.querySelector('.mfx-top'), label: root.querySelector('.mfx-label') };
  return ui;
}

// ---------- 粒子（一個 pool，爆炸、星光、吸入都用）----------
let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}
function makeParticles(n) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.PointsMaterial({ size: 0.22, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  const list = [];
  const _c = new THREE.Color();
  return {
    pts,
    // 爆出去：n 粒，由 at 向四面八方
    burst(count, at, colors, { speed = 4, life = 1.1, up = 0, gravity = -2 } = {}) {
      for (let i = 0; i < count && list.length < n; i++) {
        const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(speed * (0.35 + Math.random() * 0.65));
        v.y += up;
        list.push({ p: at.clone(), v, life, age: 0, c: _c.set(colors[i % colors.length]).clone(), gravity, drag: 1.6 });
      }
    },
    // 由外面吸入去 at（變緊身嗰陣）
    suck(count, at, colors, radius = 2.4) {
      for (let i = 0; i < count && list.length < n; i++) {
        const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 1.6 - 0.6, Math.random() * 2 - 1).normalize();
        list.push({ p: at.clone().addScaledVector(dir, radius * (0.8 + Math.random() * 0.4)), target: at, life: 0.5 + Math.random() * 0.3, age: 0, c: _c.set(colors[i % colors.length]).clone(), swirl: Math.random() * 2 + 2 });
      }
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const q = list[i];
        q.age += dt;
        if (q.age >= q.life) {
          list.splice(i, 1);
          continue;
        }
        if (q.target) {
          const k = q.age / q.life;
          const d = q.target.clone().sub(q.p);
          q.p.addScaledVector(d, Math.min(1, dt * (2 + k * 10)));
          q.p.sub(q.target).applyAxisAngle(UP, dt * q.swirl).add(q.target); // 一路吸一路打圈
        } else {
          q.v.y += q.gravity * dt;
          q.v.multiplyScalar(Math.max(0, 1 - q.drag * dt));
          q.p.addScaledVector(q.v, dt);
        }
      }
      for (let i = 0; i < n; i++) {
        const q = list[i];
        if (!q) {
          col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
          pos[i * 3] = pos[i * 3 + 1] = pos[i * 3 + 2] = 0;
          continue;
        }
        const a = 1 - q.age / q.life;
        pos.set([q.p.x, q.p.y, q.p.z], i * 3);
        col.set([q.c.r * a, q.c.g * a, q.c.b * a], i * 3); // 加色混合：顏色暗 = 透明
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

// ---------- 寵物模型（同地塊一樣：皮膚、倒轉、舊變異）----------
function buildPet(pet, before) {
  const animal = findAnimal(pet.name);
  if (!animal) return null;
  const model = buildAnimalModel(animal);
  applyPetSkin(model, activePetSkin());
  let body = model;
  if (pet.flipped) {
    body = new THREE.Group();
    body.add(flipUpsideDown(model));
    body.userData.noFireAura = model.userData.noFireAura;
  }
  // 縮放：最長一邊 1.6 米（上面留位俾光環），個中心喺原點
  body.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(body);
  const size = box.getSize(new THREE.Vector3());
  const k = 1.6 / Math.max(0.01, size.x, size.y, size.z);
  body.scale.multiplyScalar(k);
  const center = box.getCenter(new THREE.Vector3()).multiplyScalar(k);
  body.position.sub(center);
  const holder = new THREE.Group(); // 轉、放大縮細用
  holder.add(body);
  holder.updateMatrixWorld(true);
  for (const m of before) addFireAura(body, m);
  // 發光：每件自己一份物料（唔好改到地塊上面嘅寵物共用嘅物料）
  const glows = [];
  body.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    let inAura = false;
    for (let p = o; p && p !== body; p = p.parent) if (p.userData.isMutationAura) inAura = true;
    if (inAura) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const copies = mats.map((m) => {
      const c = m.clone();
      if (c.emissive) glows.push({ m: c, e: c.emissive.clone(), i: c.emissiveIntensity ?? 1 });
      return c;
    });
    o.material = Array.isArray(o.material) ? copies : copies[0];
  });
  return { holder, body, model, glows, height: size.y * k };
}

// ---------- 播片 ----------
let running = null;

export const isMutationFxPlaying = () => !!running;

export function playMutationFx({ pet, kind, gearType = null, before = [], onDone = null }) {
  if (running) running.finish();
  const info = mutationInfo(kind);
  const isTime = kind === 'time';
  const total = isTime ? LENGTH_TIME : LENGTH;
  const u = ensureUi();
  const { root, renderer, camera } = u;
  const color = new THREE.Color(info.color);
  root.style.setProperty('--c', info.color);
  root.classList.remove('revealed');
  u.label.className = 'mfx-label';
  u.label.innerHTML = `<b>${info.emoji} ${info.name}!</b><small>${pet.flipped ? '🙃 ' : ''}${pet.name} is now ${info.name}! 💰 x${info.money} money</small>`;
  u.top.textContent = isTime ? `⏳ Tick tock... ${pet.name} is changing!` : `✨ ${pet.name} is mutating... ✨`;
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add('on'));

  // 場景
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x443355, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(2, 4, 5);
  scene.add(sun);
  const rim = new THREE.PointLight(color, 0, 12);
  rim.position.set(0, 1.5, 2.5);
  scene.add(rim);
  const pb = buildPet(pet, before);
  const stage = new THREE.Group();
  if (pb) {
    pb.holder.rotation.y = PI - 0.4; // 面向鏡頭，斜少少（3/4 角度）
    stage.add(pb.holder);
  }
  scene.add(stage);
  // 水晶
  const shard = gearType ? buildShardModel(gearType) : null;
  if (shard) {
    shard.scale.setScalar(0.55);
    shard.visible = false;
    scene.add(shard);
  }
  const shardFrom = new THREE.Vector3(-4.2, 2.6, -1.5);
  const shardMid = new THREE.Vector3(-1.6, 2.6, 0.4);
  const target = new THREE.Vector3(0, 0, 0);
  // 衝擊波圈 + 光柱
  const waveMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), waveMat);
  scene.add(wave);
  const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.05, 7, 32, 1, true), beamMat);
  scene.add(beam);
  const parts = makeParticles(420);
  scene.add(parts.pts);
  const palette = [info.color, '#ffffff', isTime ? '#18ffff' : info.color];

  // 大細
  const resize = () => {
    if (!renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 52 : 36; // 手機打直：闊啲
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let t = 0;
  let last = performance.now();
  let raf = 0;
  let hitDone = false;
  let revealDone = false;
  let nextTick = HIT;
  let tickN = 0;
  let shake = 0;
  let spin = 0;
  let spinEnd = 0; // 變好之後停喺邊個角度
  const flash = () => {
    u.flash.classList.remove('go');
    void u.flash.offsetWidth; // 重新播 CSS 動畫
    u.flash.classList.add('go');
  };
  const reveal = () => {
    revealDone = true;
    spinEnd = Math.ceil(spin / (PI * 2)) * PI * 2 + PI * 2; // 再轉一個圈，停喺正面
    if (pb) addFireAura(pb.body, kind);
    flash();
    shake = 0.25;
    parts.burst(isTime ? 120 : 150, target.clone().setY(0.2), isTime ? ['#ffd54f', '#fff59d', '#18ffff', '#ffffff', '#ff80ab'] : palette, { speed: 5.5, life: 1.4, up: 1.2, gravity: -1.5 });
    root.classList.add('revealed');
    u.label.classList.add('go');
    u.top.textContent = isTime ? `⏳ ${pet.name} is SO CUTE now!` : `🎉 ${pet.name} mutated!`;
    play(isTime ? 'cutePop' : 'mutateReveal');
    setTimeout(() => play(isTime ? 'ding' : 'tierUp'), 250);
  };

  const step = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    // 1) 寵物彈出嚟
    if (pb) {
      let s = backOut(t / 0.45);
      if (isTime) {
        // ⏳ 撞完：縮到好細 → 變好嗰下「啵」彈返出嚟（大過少少再返嚟）
        if (t > HIT && t < REVEAL) s = THREE.MathUtils.lerp(1, 0.14, ease((t - HIT) / (REVEAL - HIT - 0.15)));
        else if (t >= REVEAL) s = 0.14 + (1 - 0.14) * elastic((t - REVEAL) / 0.9);
      }
      stage.scale.setScalar(Math.max(0.001, s));
    }
    // 2) 水晶飛埋去（彎彎咁）
    if (shard) {
      const k = (t - 0.35) / (HIT - 0.35);
      shard.visible = k > 0 && k < 1;
      if (shard.visible) {
        const e = k * k; // 越飛越快
        const a = shardFrom.clone().lerp(shardMid, e);
        const b = shardMid.clone().lerp(target, e);
        a.lerp(b, e);
        shard.userData.animate?.(t); // 水晶自己轉（會改 y，所以之後先擺位）
        shard.position.copy(a);
        shard.rotation.set(t * 3, t * 14, t * 2);
        if (Math.random() < 0.9) parts.burst(2, shard.position, palette, { speed: 0.4, life: 0.45, gravity: 0 }); // 尾巴
      }
      if (k > 0 && !step.whoosh) {
        step.whoosh = true;
        play('swoosh');
        setTimeout(() => play('meteorWhoosh'), 80);
      }
    }
    // 3) 撞落去：閃光 + 爆 + 衝擊波
    if (!hitDone && t >= HIT) {
      hitDone = true;
      flash();
      shake = 0.35;
      parts.burst(130, target, palette, { speed: 7, life: 1, gravity: -1 });
      play('crystal');
      play('boom');
    }
    if (hitDone) {
      const k = (t - HIT) / 0.8;
      wave.visible = k < 1;
      wave.scale.setScalar(0.3 + ease(k) * 2.4);
      waveMat.opacity = Math.max(0, 1 - k) * 0.9;
      wave.quaternion.copy(camera.quaternion);
    } else wave.visible = false;
    // 4) 變緊身：轉轉轉 + 發光 + 吸入粒子 +（Time）滴答聲
    const charging = t >= HIT && t < REVEAL;
    const chargeK = charging ? (t - HIT) / (REVEAL - HIT) : 0;
    if (!revealDone) {
      spin += dt * (charging ? 2 + chargeK * chargeK * 26 : 0.6);
      stage.rotation.y = spin;
    } else {
      // 變好：慢落嚟、轉多一個圈，停喺面向鏡頭（俾你睇清楚新樣），之後輕輕擺下擺下
      const k = Math.min(1, (t - REVEAL) / 1.1);
      stage.rotation.y = spin + (spinEnd - spin) * ease(k) + Math.sin((t - REVEAL) * 2.2) * 0.22 * k;
    }
    if (charging && Math.random() < 0.8) parts.suck(4, target, palette, 2.6);
    if (isTime && charging && t >= nextTick) {
      play(tickN++ % 2 ? 'tock' : 'tick');
      nextTick += Math.max(0.07, 0.2 - chargeK * 0.13); // 越嚟越快
    }
    const glowK = charging ? chargeK : revealDone ? Math.max(0, 1 - (t - REVEAL) / 0.35) : 0;
    if (pb) for (const g of pb.glows) {
      g.m.emissive.copy(g.e).lerp(color, Math.min(1, glowK * 0.9));
      g.m.emissiveIntensity = g.i + glowK * (0.55 + 0.3 * Math.sin(t * 30));
    }
    rim.intensity = glowK * 8;
    beamMat.opacity = charging ? chargeK * 0.14 : revealDone ? Math.max(0, 0.2 * (1 - (t - REVEAL) / 0.5)) : 0;
    beam.scale.set(1 + chargeK * 0.3, 1, 1 + chargeK * 0.3);
    beam.rotation.y = t;
    // 5) 變好
    if (!revealDone && t >= REVEAL) reveal();
    if (revealDone && Math.random() < 0.3) parts.burst(1, new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2.4 - 0.6, (Math.random() - 0.5) * 2), ['#ffffff', info.color], { speed: 0.3, life: 0.9, gravity: 0.6 });
    parts.update(dt);
    if (pb) {
      pb.model.userData.animate?.(t, revealDone ? 0.4 : 0); // 寵物自己嘅動畫（郁尾、拍翼）
      animateModelAuras(pb.body, t);
    }
    // 鏡頭：慢慢推近 + 震
    shake = Math.max(0, shake - dt);
    const push = 7.2 - ease(t / total) * 0.7;
    camera.position.set((Math.random() - 0.5) * shake, 0.5 + (Math.random() - 0.5) * shake, push);
    camera.lookAt(0, -0.2, 0); // 寵物喺畫面中間偏上（下面留位出大字）
    renderer?.render(scene, camera);
    if (t >= total) return finish();
    if (t >= total - 0.35) root.classList.remove('on');
    raf = requestAnimationFrame(step);
  };

  // 跳過
  const skip = (e) => {
    e.preventDefault?.();
    e.stopImmediatePropagation?.();
    finish();
  };
  const onKey = (e) => {
    if (e.repeat) return;
    skip(e);
  };
  root.addEventListener('pointerdown', skip);
  window.addEventListener('keydown', onKey, true); // capture：唔好俾遊戲收到呢下掣（例如 ` 閂背包）

  let done = false;
  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    root.removeEventListener('pointerdown', skip);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', resize);
    root.classList.remove('on', 'revealed');
    root.hidden = true;
    running = null;
    // 執埋：自己整嘅物料、形狀
    parts.dispose();
    wave.geometry.dispose();
    waveMat.dispose();
    beam.geometry.dispose();
    beamMat.dispose();
    if (pb) for (const g of pb.glows) g.m.dispose();
    renderer?.renderLists.dispose();
    onDone?.();
  }
  running = { finish };
  raf = requestAnimationFrame(step);
  return running;
}

// ================= 🐎 Ridable Shard 動畫（小朋友 Issue #16）=================
// 寵物彈出嚟 → 慢慢瞓低（壓扁、蹲低）→ 馬鞍由天跌落嚟、彈一彈放好 + 金色閃閃 → 寵物企返起身（彈一彈、跳一跳）→ 大字「🐎 RIDABLE!」
// 用法（inventory.js）：playSaddleFx({ pet, onDone })；pet 已經 rideable = true、存咗檔，呢度淨係播片
const SADDLE_LEN = 4.4;
const LIE = [0.55, 1.15]; // 瞓低
const DROP = [1.15, 1.85]; // 馬鞍跌落嚟（1.85 撞落背脊）
const STAND = 2.55; // 企返起身 + 出大字
export function playSaddleFx({ pet, onDone = null }) {
  if (running) running.finish();
  const colorHex = '#ffb74d';
  const u = ensureUi();
  const { root, renderer, camera } = u;
  const color = new THREE.Color(colorHex);
  root.style.setProperty('--c', colorHex);
  root.classList.remove('revealed');
  u.label.className = 'mfx-label';
  u.label.innerHTML = `<b>🐎 RIDABLE!</b><small>${pet.name} has a saddle! Press <b style="display:inline;font-size:inherit;-webkit-text-stroke:0">1</b> to ride it!</small>`;
  u.top.textContent = `🐎 ${pet.name}, lie down please...`;
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add('on'));

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x443355, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(2, 4, 5);
  scene.add(sun);
  const rim = new THREE.PointLight(color, 0, 12);
  rim.position.set(0, 1.5, 2.5);
  scene.add(rim);
  const before = (pet.mutation || '').split('+').filter(Boolean);
  const pb = buildPet({ ...pet, rideable: false }, before);
  const stage = new THREE.Group();
  let saddle = null;
  let saddleY = 0;
  let saddleFrom = 0;
  if (pb) {
    pb.holder.rotation.y = PI - 0.75; // 側身多啲：睇到個背
    stage.add(pb.holder);
    pb.holder.updateMatrixWorld(true);
    const got = addSaddle(pb.model);
    if (got) {
      saddle = got.saddle;
      saddleY = saddle.position.y;
      const ws = pb.model.getWorldScale(new THREE.Vector3()).y || 1;
      saddleFrom = saddleY + 2.6 / ws; // 由畫面頂跌落嚟
      saddle.position.y = saddleFrom;
      saddle.visible = false;
    }
  }
  scene.add(stage);
  const waveMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), waveMat);
  wave.rotation.x = -PI / 2;
  wave.visible = false;
  scene.add(wave);
  const parts = makeParticles(360);
  scene.add(parts.pts);
  const palette = ['#ffd740', '#ffffff', '#ffb74d', '#ff9e40'];

  const resize = () => {
    if (!renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 52 : 36;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let t = 0;
  let last = performance.now();
  let raf = 0;
  let landed = false;
  let stood = false;
  let shake = 0;
  const flash = () => {
    u.flash.classList.remove('go');
    void u.flash.offsetWidth;
    u.flash.classList.add('go');
  };
  const baseY = pb ? -pb.height * 0.5 : 0; // 腳喺邊（buildPet 擺咗中心喺原點）
  const step = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    stage.scale.setScalar(Math.max(0.001, backOut(t / 0.45)));
    // 瞓低：壓扁 + 蹲低（腳仍然貼地）；企返起身：彈返高 + 跳一跳
    let lie = ease((t - LIE[0]) / (LIE[1] - LIE[0]));
    let hop = 0;
    if (t >= STAND) {
      const k = (t - STAND) / 0.8;
      lie = Math.max(0, 1 - elastic(k));
      hop = Math.max(0, Math.sin(Math.min(1, k * 1.6) * PI)) * 0.35;
    }
    if (pb) {
      const sy = 1 - 0.38 * lie;
      pb.holder.scale.set(1 + 0.06 * lie, sy, 1 + 0.04 * lie);
      pb.holder.position.y = baseY * (1 - sy) + hop; // 壓扁時腳仍然貼地
      pb.holder.rotation.z = Math.sin(t * 2) * 0.03 * lie; // 瞓住輕輕搖
    }
    if (t > LIE[0] && t < LIE[0] + dt + 0.001) {
      u.top.textContent = `🐎 Here comes the saddle!`;
      play('swoosh');
    }
    // 馬鞍跌落嚟（越跌越快）→ 撞落背脊彈一彈
    if (saddle) {
      const k = (t - DROP[0]) / (DROP[1] - DROP[0]);
      saddle.visible = k > 0;
      if (k > 0 && k < 1) {
        saddle.position.y = saddleFrom + (saddleY - saddleFrom) * k * k;
        saddle.rotation.set(Math.sin(t * 9) * 0.25 * (1 - k), (1 - k) * 2.5, 0);
        if (Math.random() < 0.6) parts.burst(1, saddle.getWorldPosition(new THREE.Vector3()), palette, { speed: 0.3, life: 0.5, gravity: 0 });
      } else if (k >= 1) {
        const b = (t - DROP[1]) / 0.5;
        saddle.position.y = saddleY + Math.max(0, Math.sin(Math.min(1, b) * PI)) * 0.25 * (saddleFrom - saddleY) * 0.15 * (1 - Math.min(1, b));
        saddle.rotation.set(0, 0, 0);
        // 兩邊腳踏搖下搖下
        for (const [i, sd] of (saddle.userData.sides || []).entries()) sd.rotation.z = Math.sin((t - DROP[1]) * 9 + i) * 0.4 * Math.exp(-(t - DROP[1]) * 2.5);
      }
    }
    if (!landed && t >= DROP[1]) {
      landed = true;
      flash();
      shake = 0.3;
      const at = saddle ? saddle.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
      parts.burst(140, at, palette, { speed: 5, life: 1.1, up: 1, gravity: -2 });
      play('saddleThump');
      u.top.textContent = `✨ Saddle on! ✨`;
    }
    if (landed) {
      const k = (t - DROP[1]) / 0.8;
      wave.visible = k < 1;
      wave.position.y = baseY + 0.02;
      wave.scale.setScalar(0.3 + ease(k) * 2.4);
      waveMat.opacity = Math.max(0, 1 - k) * 0.9;
    }
    if (!stood && t >= STAND) {
      stood = true;
      flash();
      root.classList.add('revealed');
      u.label.classList.add('go');
      u.top.textContent = `🎉 ${pet.name} is ready to ride!`;
      parts.burst(150, new THREE.Vector3(0, 0.2, 0), palette, { speed: 5.5, life: 1.4, up: 1.2, gravity: -1.5 });
      play('proudNeigh');
      setTimeout(() => play('tierUp'), 250);
    }
    rim.intensity = (landed ? Math.max(0, 1 - (t - DROP[1]) / 0.6) : 0) * 8 + (stood ? 2 : 0);
    if (stood && Math.random() < 0.3) parts.burst(1, new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2.4 - 0.6, (Math.random() - 0.5) * 2), ['#ffffff', colorHex], { speed: 0.3, life: 0.9, gravity: 0.6 });
    parts.update(dt);
    // 轉：一開始慢慢轉，瞓低時停喺側面（睇到馬鞍），企返起身轉返正面
    stage.rotation.y = t < LIE[0] ? t * 0.6 : stood ? Math.sin((t - STAND) * 2.2) * 0.22 + Math.min(1, (t - STAND) / 0.8) * 0.6 : LIE[0] * 0.6;
    if (pb) {
      pb.model.userData.animate?.(t, stood ? 0.5 : 0);
      animateModelAuras(pb.body, t);
    }
    shake = Math.max(0, shake - dt);
    const push = 7.2 - ease(t / SADDLE_LEN) * 0.7;
    camera.position.set((Math.random() - 0.5) * shake, 0.9 + (Math.random() - 0.5) * shake, push);
    camera.lookAt(0, -0.2, 0);
    renderer?.render(scene, camera);
    if (t >= SADDLE_LEN) return finish();
    if (t >= SADDLE_LEN - 0.35) root.classList.remove('on');
    raf = requestAnimationFrame(step);
  };

  const skip = (e) => {
    e.preventDefault?.();
    e.stopImmediatePropagation?.();
    finish();
  };
  const onKey = (e) => {
    if (e.repeat) return;
    skip(e);
  };
  root.addEventListener('pointerdown', skip);
  window.addEventListener('keydown', onKey, true);

  let done = false;
  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    root.removeEventListener('pointerdown', skip);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', resize);
    root.classList.remove('on', 'revealed');
    root.hidden = true;
    running = null;
    parts.dispose();
    wave.geometry.dispose();
    waveMat.dispose();
    if (pb) for (const g of pb.glows) g.m.dispose();
    renderer?.renderLists.dispose();
    onDone?.();
  }
  running = { finish };
  raf = requestAnimationFrame(step);
  return running;
}
