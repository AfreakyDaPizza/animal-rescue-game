// 📖🔍 Index 3D 寵物睇圖（小朋友 2026-11-03 GitHub Issue）：
// 「喺 Index 揀一隻動物 → 見到隻動物，可以郁鏡頭睇、揀變異同外觀、做動作、甚至試吓行嚟行去，UI 要好乾淨有動畫」
//
// 點用：openIndexViewer(name, { skinSwatch })   ← hud.js 撳 Index 入面已經搵到嘅動物卡就叫
// - 自己一個細 Three.js 場景 + renderer（畫喺個 overlay 嘅 canvas），閂咗就 dispose
// - 變異／皮膚／動作全部只係預覽：唔改 state，唔會存檔
// - 開住嘅時候 Index 面板仲開喺後面 → 遊戲照樣暫停、滑鼠唔會被鎖
// - 鍵盤：Esc 閂；開咗「Try moving」就 WASD／方向鍵行（用 capture 截住，唔會傳去遊戲）

import * as THREE from 'three';
import './indexViewer.css';
import { buildAnimalModel } from './animalModels.js';
import { findAnimal, MUTATIONS, mutationInfo } from './data/animals.js';
import { rarityInfo, RARITIES, PET_SKINS_ON } from './data/balance.js';
import { BIOMES } from './data/biomeList.js';
import { HALLOWEEN_BIOMES } from './data/halloween.js';
import { PET_SKINS, applyPetSkin, animateSkins } from './skins.js';
import { addFireAura, animateFireAuras } from './fireAura.js';
import { play } from './sound.js';

const FLOOR_R = 5.2; // 圓台半徑
const PET_SIZE = 2.2; // 每隻動物都縮放到差唔多大（最長嗰邊幾米）
const WALK_SPEED = 2.4;
const RUN_SPEED = 4.6;
const ANIMS = [
  { id: 'idle', label: '🧍 Idle' },
  { id: 'walk', label: '🚶 Walk' },
  { id: 'run', label: '🏃 Run' },
  { id: 'sit', label: '🪑 Sit' },
  { id: 'jump', label: '🦘 Jump' },
  { id: 'dance', label: '💃 Dance' },
];
const STATUS_COLOR = {
  'Critically Endangered': '#ff5252', Endangered: '#ff9100', Vulnerable: '#ffd740',
  'Near Threatened': '#b2ff59', 'Least Concern': '#69f0ae',
};

let v = null; // 而家開住嘅睇圖（一次得一個）
export const isIndexViewerOpen = () => !!v;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- 介面 ----------
function buildDom(animal, skinSwatch) {
  const rarity = animal.rarity ? rarityInfo(animal.rarity) : null;
  const where = animal.where || BIOMES[animal.biome]?.short || HALLOWEEN_BIOMES.find((h) => h.key === animal.hw)?.name || null;
  const rarityHtml = rarity
    ? `<span class="iv-pill" style="--c:${rarity.color}">${rarity.name}</span>`
    : `<span class="iv-pill iv-rainbow">${RARITIES.filter((r) => r.chance > 0).map((r) => `<i style="background:${r.color}"></i>`).join('')} Any rarity</span>`;
  const statusHtml = animal.status ? `<span class="iv-pill" style="--c:${STATUS_COLOR[animal.status] || '#90a4ae'}">🌍 ${esc(animal.status)}</span>` : '';
  const kg = animal.kg ? `${animal.kg[0].toLocaleString('en-US')}–${animal.kg[1].toLocaleString('en-US')} kg` : '?';
  const chip = (group, id, inner, on = false, style = '') => `<button class="iv-chip${on ? ' on' : ''}" data-${group}="${id}"${style ? ` style="${style}"` : ''}>${inner}</button>`;
  const sw = (id) => {
    const colors = skinSwatch?.[id] || ['#a5d6a7', '#8d6e63'];
    return `<span class="iv-sw" style="background:linear-gradient(135deg, ${colors.join(', ')})"></span>`;
  };
  const el = document.createElement('div');
  el.id = 'index-viewer';
  el.className = 'iv';
  el.innerHTML = `
    <div class="iv-shell" role="dialog" aria-label="${esc(animal.name)} 3D viewer">
      <div class="iv-stage">
        <canvas class="iv-canvas"></canvas>
        <div class="iv-glow"></div>
        <div class="iv-title"><span class="iv-emoji">${animal.emoji || '🐾'}</span><b>${esc(animal.name)}</b></div>
        <button class="iv-x" title="Close (Esc)">✕</button>
        <div class="iv-hint">🖱️ Drag to spin · Scroll to zoom</div>
        <div class="iv-pad" hidden>
          <button data-pad="up">▲</button>
          <button data-pad="left">◀</button><button data-pad="down">▼</button><button data-pad="right">▶</button>
        </div>
        <button class="iv-move-btn">🕹️ Try moving around</button>
        <div class="iv-tip" hidden>🕹️ <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows to walk</div>
      </div>
      <aside class="iv-side">
        <section class="iv-card iv-info">
          <div class="iv-pills">${rarityHtml}${statusHtml}</div>
          <div class="iv-stats">
            <div><small>Weight</small><b>⚖️ ${kg}</b></div>
            ${where ? `<div><small>Home</small><b>📍 ${esc(where)}</b></div>` : ''}
          </div>
          ${animal.fact ? `<p class="iv-fact">${esc(animal.fact)}</p>` : ''}
        </section>
        <section class="iv-card">
          <h4>✨ Mutations <small>tap to mix</small></h4>
          <div class="iv-chips" data-group="mut">
            ${chip('mut', 'none', '🐾 Normal', true)}
            ${MUTATIONS.map((m) => chip('mut', m, `${mutationInfo(m).emoji} ${mutationInfo(m).name[0]}${mutationInfo(m).name.slice(1).toLowerCase()}`, false, `--c:${mutationInfo(m).color}`)).join('')}
          </div>
        </section>
        <section class="iv-card" ${PET_SKINS_ON ? '' : 'style="display:none"'}>
          <h4>🎨 Looks</h4>
          <div class="iv-chips" data-group="skin">
            ${PET_SKINS.map((s) => chip('skin', s.id, `${sw(s.id)}${esc(s.name)}`, s.id === 'none')).join('')}
          </div>
        </section>
        <section class="iv-card">
          <h4>🎬 Animations</h4>
          <div class="iv-chips" data-group="anim">
            ${ANIMS.map((a) => chip('anim', a.id, a.label, a.id === 'idle')).join('')}
          </div>
        </section>
        <p class="iv-note">Just a preview - your real pets don't change.</p>
      </aside>
    </div>`;
  return el;
}

// 圓台上面嘅淡淡圓圈紋
function floorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#dfe9f3');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(80, 120, 170, 0.13)';
  for (let r = 40; r < 256; r += 44) {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(256, 256, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- 開 ----------
export function openIndexViewer(name, { skinSwatch } = {}) {
  const animal = findAnimal(name);
  if (!animal) return;
  if (v) closeIndexViewer(true);
  play('click');
  const root = buildDom(animal, skinSwatch);
  document.body.appendChild(root);
  const canvas = root.querySelector('.iv-canvas');
  const stage = root.querySelector('.iv-stage');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    root.remove();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x16233f, 18, 40);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
  const own = []; // 自己整嘅 geometry／material／texture（閂嗰陣 dispose）
  const keep = (x) => (own.push(x), x);

  // 燈：天光 + 主光（有影）+ 背光勾邊
  scene.add(new THREE.HemisphereLight(0xdff1ff, 0x5a6b8a, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(4, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 4;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9ecbff, 1.3);
  rim.position.set(-5, 4, -6);
  scene.add(rim);

  // 圓台：白色台面 + 稀有度顏色發光邊
  const ringColor = new THREE.Color(animal.rarity ? rarityInfo(animal.rarity).color : '#80deea');
  const floorTex = keep(floorTexture());
  const top = new THREE.Mesh(keep(new THREE.CylinderGeometry(FLOOR_R, FLOOR_R + 0.25, 0.4, 72)), [
    keep(new THREE.MeshStandardMaterial({ color: 0xe8eef6, roughness: 0.6 })),
    keep(new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55 })),
    keep(new THREE.MeshStandardMaterial({ color: 0xc5d3e3 })),
  ]);
  top.position.y = -0.2;
  top.receiveShadow = true;
  scene.add(top);
  const base = new THREE.Mesh(keep(new THREE.CylinderGeometry(FLOOR_R + 0.5, FLOOR_R + 0.9, 0.5, 72)), keep(new THREE.MeshStandardMaterial({ color: 0x8fa3bf, roughness: 0.8 })));
  base.position.y = -0.6;
  scene.add(base);
  const glowMat = keep(new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.9 }));
  const glowRing = new THREE.Mesh(keep(new THREE.TorusGeometry(FLOOR_R + 0.12, 0.06, 8, 96)), glowMat);
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.y = 0.01;
  scene.add(glowRing);

  // 飄嚟飄去嘅光點
  const N = 60;
  const dotPos = new Float32Array(N * 3);
  const dotGeo = keep(new THREE.BufferGeometry());
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
  const dotMat = keep(new THREE.PointsMaterial({ color: 0xbfe3ff, size: 0.07, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  const dotPts = new THREE.Points(dotGeo, dotMat);
  dotPts.frustumCulled = false;
  scene.add(dotPts);

  // 寵物：holder（位置 + 轉向）> tilt（坐低／跳）> model
  const holder = new THREE.Group();
  const tilt = new THREE.Group();
  holder.add(tilt);
  scene.add(holder);

  v = {
    animal, root, renderer, scene, camera, own, holder, tilt, model: null, size: new THREE.Vector3(1, 1, 1), rearZ: 0, flying: false,
    mutations: new Set(), skin: 'none', anim: 'idle', moving: false, keys: new Set(),
    yaw: Math.PI - 0.55, pitch: 0.26, dist: 7.5, yawT: Math.PI - 0.55, pitchT: 0.26, distT: 7.5, target: new THREE.Vector3(0, 1, 0),
    dotGeo, lastTouch: -10, time: 0, sitK: 0, raf: 0, clock: new THREE.Clock(), facing: 0, speed: 0, pointers: new Map(), pinch: 0,
  };
  buildPet();

  // ---- 尺寸 ----
  const resize = () => {
    const w = Math.max(1, stage.clientWidth);
    const h = Math.max(1, stage.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  v.ro = new ResizeObserver(resize);
  v.ro.observe(stage);
  resize();

  // ---- 掣 ----
  root.addEventListener('click', (e) => {
    if (e.target === root) return closeIndexViewer(); // 撳外面黑色位
    if (e.target.closest('.iv-x')) return closeIndexViewer();
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.mut) {
      const m = b.dataset.mut;
      if (m === 'none') v.mutations.clear();
      else if (v.mutations.has(m)) v.mutations.delete(m);
      else v.mutations.add(m);
      play('click');
      buildPet();
    } else if (b.dataset.skin) {
      v.skin = b.dataset.skin;
      play('click');
      buildPet();
    } else if (b.dataset.anim) {
      v.anim = b.dataset.anim;
      play('click');
    } else if (b.classList.contains('iv-move-btn')) {
      setMoveMode(!v.moving);
      play('click');
    } else return;
    refreshChips();
  });

  // 畫面上嘅方向掣（手機／滑鼠都得）：撳住就行
  const padKey = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
  for (const b of root.querySelectorAll('[data-pad]')) {
    const k = padKey[b.dataset.pad];
    const up = () => (v?.keys.delete(k), b.classList.remove('held'));
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture?.(e.pointerId);
      v?.keys.add(k);
      b.classList.add('held');
    });
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
  }

  // ---- 拖鏡頭／兩隻手指 zoom ----
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    v.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    v.lastTouch = v.time;
    v.pinch = 0;
    stage.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = v?.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    v.lastTouch = v.time;
    if (v.pointers.size >= 2) {
      const [a, b] = [...v.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (v.pinch) v.distT = THREE.MathUtils.clamp(v.distT * (v.pinch / d), 3, 16);
      v.pinch = d;
      return;
    }
    v.yawT -= dx * 0.008;
    v.pitchT = THREE.MathUtils.clamp(v.pitchT + dy * 0.006, -0.05, 1.35);
  });
  const release = (e) => {
    if (!v) return;
    v.pointers.delete(e.pointerId);
    v.pinch = 0;
    if (!v.pointers.size) stage.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    v.distT = THREE.MathUtils.clamp(v.distT * Math.exp(e.deltaY * 0.0012), 3, 16);
    v.lastTouch = v.time;
  }, { passive: false });

  // ---- 鍵盤（capture：遊戲嘅掣全部唔收到）----
  v.onKey = (e) => {
    if (!v) return;
    e.stopImmediatePropagation();
    if (e.code === 'Escape') {
      e.preventDefault();
      return closeIndexViewer();
    }
    const map = { ArrowUp: 'KeyW', ArrowDown: 'KeyS', ArrowLeft: 'KeyA', ArrowRight: 'KeyD' };
    const k = map[e.code] || e.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(k)) {
      e.preventDefault();
      if (!v.moving && !e.repeat) {
        setMoveMode(true);
        refreshChips();
      }
      v.keys.add(k);
    }
  };
  v.onKeyUp = (e) => {
    if (!v) return;
    const map = { ArrowUp: 'KeyW', ArrowDown: 'KeyS', ArrowLeft: 'KeyA', ArrowRight: 'KeyD' };
    v.keys.delete(map[e.code] || e.code);
  };
  v.onBlur = () => v?.keys.clear();
  window.addEventListener('keydown', v.onKey, true);
  window.addEventListener('keyup', v.onKeyUp, true);
  window.addEventListener('blur', v.onBlur);

  requestAnimationFrame(() => root.classList.add('show')); // 淡入 + 彈出
  loop();
}

// ---------- 閂 ----------
export function closeIndexViewer(instant = false) {
  if (!v) return;
  const { root, renderer, raf, ro, onKey, onKeyUp, onBlur, own } = v;
  cancelAnimationFrame(raf);
  ro?.disconnect();
  window.removeEventListener('keydown', onKey, true);
  window.removeEventListener('keyup', onKeyUp, true);
  window.removeEventListener('blur', onBlur);
  dropPet();
  own.forEach((x) => x.dispose());
  renderer.dispose();
  renderer.forceContextLoss?.();
  v = null;
  if (instant) return root.remove();
  play('click');
  root.classList.remove('show');
  root.classList.add('hide');
  setTimeout(() => root.remove(), 220);
}

// ---------- 寵物模型（換變異／皮膚就重新整過）----------
function dropPet() {
  if (!v.model) return;
  // 皮膚粒子：冇咗 parent 先會由 skins.js 嘅 list 清走
  const pts = [];
  v.model.traverse((o) => o.isPoints && pts.push(o));
  pts.forEach((o) => o.removeFromParent());
  v.model.removeFromParent();
  v.model = null;
}

function buildPet() {
  dropPet();
  const model = buildAnimalModel(v.animal);
  applyPetSkin(model, v.skin); // 同地塊一樣：先換皮膚，再縮放
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const s = PET_SIZE / Math.max(0.01, size.x, size.y, size.z);
  model.scale.multiplyScalar(s);
  const fly = model.userData.move === 'fly';
  // 坐低：以屁股做軸心（model 面向 -z，屁股喺 +z 嗰邊）
  const rearZ = box.max.z * s;
  const pivot = new THREE.Group();
  pivot.position.z = -rearZ;
  pivot.position.y = Math.max(0, -box.min.y * s); // 有啲腳仔低過 0：抬返上地面
  pivot.add(model);
  const body = new THREE.Group(); // 變異特效加喺呢層（同地塊一樣：model 外面）
  body.add(pivot);
  body.userData.noFireAura = model.userData.noFireAura;
  model.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  for (const m of MUTATIONS) if (v.mutations.has(m)) addFireAura(body, m);
  v.tilt.position.z = rearZ;
  v.tilt.clear();
  v.tilt.add(body);
  v.model = body;
  v.inner = model;
  v.size.copy(size).multiplyScalar(s);
  v.flying = fly;
  v.rearZ = rearZ;
}

function refreshChips() {
  const root = v.root;
  for (const b of root.querySelectorAll('[data-mut]')) b.classList.toggle('on', b.dataset.mut === 'none' ? !v.mutations.size : v.mutations.has(b.dataset.mut));
  for (const b of root.querySelectorAll('[data-skin]')) b.classList.toggle('on', b.dataset.skin === v.skin);
  for (const b of root.querySelectorAll('[data-anim]')) b.classList.toggle('on', b.dataset.anim === v.anim);
  const mv = root.querySelector('.iv-move-btn');
  mv.classList.toggle('on', v.moving);
  mv.textContent = v.moving ? '⏹️ Stop moving' : '🕹️ Try moving around';
}

function setMoveMode(on) {
  v.moving = on;
  v.keys.clear();
  v.root.querySelector('.iv-pad').hidden = !on;
  v.root.querySelector('.iv-tip').hidden = !on;
  v.root.querySelector('.iv-hint').hidden = on;
  if (on) v.lastTouch = v.time; // 唔好自己轉圈
  else {
    // 行完返去中間
    v.homing = true;
  }
}

// ---------- 每格 ----------
const _dir = new THREE.Vector3();
function loop() {
  if (!v) return;
  v.raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, v.clock.getDelta());
  v.time += dt;
  const t = v.time;
  const { holder, tilt, camera } = v;
  const inner = v.inner;

  // ---- 試吓行 ----
  let moveAmt = 0;
  if (v.moving) {
    const f = (v.keys.has('KeyW') ? 1 : 0) - (v.keys.has('KeyS') ? 1 : 0);
    const r = (v.keys.has('KeyD') ? 1 : 0) - (v.keys.has('KeyA') ? 1 : 0);
    if (f || r) {
      const sy = Math.sin(v.yaw);
      const cy = Math.cos(v.yaw);
      // 鏡頭向前 = (-sin, -cos)；右 = (cos, -sin)
      _dir.set(-sy * f + cy * r, 0, -cy * f - sy * r).normalize();
      const speed = v.anim === 'run' ? RUN_SPEED : WALK_SPEED;
      holder.position.addScaledVector(_dir, speed * dt);
      const lim = FLOOR_R - Math.max(0.6, Math.max(v.size.x, v.size.z) * 0.45);
      const d = Math.hypot(holder.position.x, holder.position.z);
      if (d > lim) holder.position.multiplyScalar(lim / d);
      v.facing = Math.atan2(-_dir.x, -_dir.z);
      moveAmt = 1;
      v.lastTouch = t;
    }
  } else if (v.homing) {
    holder.position.multiplyScalar(Math.max(0, 1 - dt * 3));
    if (holder.position.length() < 0.02) {
      holder.position.set(0, 0, 0);
      v.homing = false;
    }
  }
  // 慢慢轉身（行最短嗰邊）
  let diff = v.facing - holder.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  holder.rotation.y += diff * Math.min(1, dt * 10);
  v.speed += (moveAmt - v.speed) * Math.min(1, dt * 8);

  // ---- 動作 ----
  const anim = v.anim;
  let at = t; // 俾 model.animate 嘅時間（跑 = 快啲）
  let moving = 0;
  let y = v.flying ? 0.7 + Math.sin(t * 2) * 0.12 : 0;
  let pitch = 0;
  let squash = 1;
  let wiggle = 0;
  if (anim === 'walk') moving = 1;
  if (anim === 'run') {
    moving = 1;
    at = t * 1.9;
    y += Math.abs(Math.sin(t * 9)) * 0.08;
    pitch = -0.06;
  }
  if (anim === 'idle') squash = 1 + Math.sin(t * 2.2) * 0.012; // 呼吸
  if (anim === 'jump') {
    const k = (t % 1.2) / 1.2;
    if (k < 0.18) squash = 1 - Math.sin((k / 0.18) * Math.PI) * 0.16; // 蹲低
    else if (k < 0.72) {
      const u = (k - 0.18) / 0.54;
      y += Math.sin(u * Math.PI) * 1.4;
      squash = 1.06;
      pitch = (0.5 - u) * 0.35;
      moving = 0.5;
    } else squash = 1 - Math.sin(((k - 0.72) / 0.28) * Math.PI) * 0.12; // 落地
  }
  if (anim === 'dance') {
    y += Math.abs(Math.sin(t * 6)) * 0.25;
    wiggle = Math.sin(t * 6) * 0.35;
    squash = 1 + Math.sin(t * 12) * 0.04;
    moving = 0.4;
  }
  // 試吓行：行緊就用行／跑動畫
  if (v.speed > 0.05 && anim !== 'run' && anim !== 'jump' && anim !== 'dance') moving = Math.max(moving, v.speed);
  if (v.speed > 0.05 && anim === 'sit') {
    v.anim = 'walk'; // 坐住唔行得：自動起身
    refreshChips();
  }
  const sitTarget = anim === 'sit' ? 1 : 0;
  v.sitK += (sitTarget - v.sitK) * Math.min(1, dt * 6);
  pitch += v.sitK * 0.42;
  tilt.rotation.x += (pitch - tilt.rotation.x) * Math.min(1, dt * 12);
  tilt.rotation.z = wiggle * 0.3;
  tilt.position.y = y - v.sitK * 0.04;
  tilt.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
  if (anim === 'dance') holder.rotation.y += wiggle * dt * 2;
  inner?.userData.animate?.(at, moving);

  // ---- 鏡頭 ----
  const idle = !v.moving && t - v.lastTouch > 3 && !v.pointers.size;
  if (idle) v.yawT += dt * 0.25; // 冇人郁就自己慢慢轉
  const k = Math.min(1, dt * 7);
  v.yaw += (v.yawT - v.yaw) * k;
  v.pitch += (v.pitchT - v.pitch) * k;
  v.dist += (v.distT - v.dist) * k;
  const tgtY = (v.flying ? 0.7 : 0) + v.size.y * 0.45;
  v.target.x += (holder.position.x - v.target.x) * Math.min(1, dt * 5);
  v.target.z += (holder.position.z - v.target.z) * Math.min(1, dt * 5);
  v.target.y += (tgtY - v.target.y) * Math.min(1, dt * 5);
  const cp = Math.cos(v.pitch);
  camera.position.set(v.target.x + Math.sin(v.yaw) * cp * v.dist, v.target.y + Math.sin(v.pitch) * v.dist + 0.4, v.target.z + Math.cos(v.yaw) * cp * v.dist);
  camera.lookAt(v.target);

  // ---- 光點 ----
  const pos = v.dotGeo.attributes.position;
  {
    for (let i = 0; i < pos.count; i++) {
      const a = (i * 2.399) + t * 0.05 * (1 + (i % 5) * 0.2);
      const r = 2.2 + ((i * 37) % 60) / 10;
      pos.setXYZ(i, Math.cos(a) * r, ((i * 13) % 50) / 10 + Math.sin(t * 0.6 + i) * 0.3 + ((t * 0.15 + i * 0.1) % 1) * 0.6, Math.sin(a) * r);
    }
    pos.needsUpdate = true;
  }

  animateSkins(t); // 遊戲暫停咗唔會郁特效：自己郁
  v.renderer.render(v.scene, camera);
  animateFireAuras(t); // 要喺 render 之後（onBeforeRender 記低有畫到嘅特效）
}
