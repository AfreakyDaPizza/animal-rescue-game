// 🍀 LUCK MACHINE + LUCK TRAILS（Issue #21，小朋友 2026-11-09 / 2026-11-14）
// 「THE LUCK MACHINE YOU PRESS E TO ENTER UI BEING GREEN AND HAVING LUCK AURA AROUND IT SO YOU CAN BUY LUCK TRAILS
//   WHICH WHEN EQUIPED YOU'LL GET MORE LUCK ON SPAWNS」
// - Hub 圍牆邊（Magic Library 隔籬，以前 Meteoric Shop 個位 LUCK_MACHINE）：綠色幸運機 + 四葉草 + 綠色運氣光環
// - 撳 E → 綠色面板：買／裝備 Trail（數值 src/data/luck.js 嘅 TRAILS）
// - 裝備咗：Legendary／Mythic／Eternal 野生動物 × luck 咁多倍容易出（balance.js setRarityLuck）
// - 行路時身後拖住一條彩色光帶
// state.trails = [買咗嘅 id]、state.trail = 裝備緊嘅 id（或者 null）
//
// 用法（main.js）：
//   const luck = createLuckMachine({ scene, play, popup, announce })
//   luck.setToggle((kind) => togglePanel(kind))
//   luck.interaction(pos)                    // E 掣
//   luck.update(dt, time, feet, visible)     // feet = 腳底世界座標（Vector3）；visible = 要唔要畫條 trail

import * as THREE from 'three';
import { state, save } from './state.js';
import { extraPanels } from './hud.js';
import { addCollider } from './world.js';
import { makeSign, makeLabel, THEMES } from './signs.js';
import { LUCK_MACHINE } from './hubShape.js';
import { TRAILS, findTrail, trailLuck } from './data/luck.js';
import { setRarityLuck, rarityChances, RARITIES } from './data/balance.js';
import { short as fmt } from './format.js';

const PI = Math.PI;
const $ = (id) => document.getElementById(id);
const ACT = 3.4;
const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
const GLOW = (color, k = 1.4) => M(color, { emissive: color, emissiveIntensity: k });
const additive = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
function add(p, geo, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  p.add(m);
  return m;
}

// 🍀 四葉草（4 塊心形葉）
function clover(size, mat) {
  const g = new THREE.Group();
  const heart = new THREE.Shape();
  heart.moveTo(0, 0);
  heart.bezierCurveTo(-0.5, 0.35, -0.55, 0.95, 0, 0.8);
  heart.bezierCurveTo(0.55, 0.95, 0.5, 0.35, 0, 0);
  const geo = new THREE.ExtrudeGeometry(heart, { depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
  geo.translate(0, 0, -0.06);
  for (let k = 0; k < 4; k++) {
    const leaf = new THREE.Mesh(geo, mat);
    leaf.rotation.z = (k / 4) * PI * 2 + PI / 4;
    leaf.scale.setScalar(size);
    g.add(leaf);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * size * 2, 0.05 * size * 2, 0.9 * size, 6), mat);
  stem.position.set(0.15 * size, -0.45 * size, 0);
  stem.rotation.z = 0.35;
  g.add(stem);
  return g;
}

// 老虎機捲軸紋理：🍀 7 ⭐ 💰 一格格（直排，會向下轉）
function reelTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fffde7';
  g.fillRect(0, 0, 64, 256);
  g.font = '44px serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  ['🍀', '7️⃣', '⭐', '💰'].forEach((e, i) => {
    g.fillStyle = i % 2 ? '#fff9c4' : '#fffde7';
    g.fillRect(0, i * 64, 64, 64);
    g.fillStyle = '#c62828';
    g.fillText(e, 32, i * 64 + 34);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 0.5);
  return t;
}

// ======================== 🏗️ 部機 ========================
function buildMachine(scene) {
  const { x, z, rot } = LUCK_MACHINE;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  scene.add(g);
  const green = M(0x1b8a3a, { metalness: 0.3 });
  const dark = M(0x0b3d1c, { metalness: 0.4 });
  const gold = M(0xffd54f, { metalness: 0.8, roughness: 0.25, emissive: 0x6d4c00, emissiveIntensity: 0.3 });
  const leafMat = GLOW(0x00e676, 0.9);
  // 底座（圓台 + 金邊）
  add(g, new THREE.CylinderGeometry(2.4, 2.6, 0.3, 32), dark, 0, 0.15, 0);
  add(g, new THREE.TorusGeometry(2.5, 0.08, 8, 48), gold, 0, 0.3, 0, false).rotation.x = PI / 2;
  // 機身（圓角大櫃）+ 前面玻璃窗 + 入面嘅幸運星／金幣
  const body = add(g, new THREE.CylinderGeometry(1.3, 1.5, 3.2, 8), green, 0, 1.9, 0);
  body.rotation.y = PI / 8;
  add(g, new THREE.CylinderGeometry(1.36, 1.36, 0.16, 8), gold, 0, 3.5, 0).rotation.y = PI / 8;
  add(g, new THREE.CylinderGeometry(1.56, 1.56, 0.16, 8), gold, 0, 0.36, 0).rotation.y = PI / 8;
  const glass = add(g, new THREE.SphereGeometry(1.05, 24, 16), new THREE.MeshStandardMaterial({ color: 0xb9f6ca, transparent: true, opacity: 0.3, roughness: 0.05, emissive: 0x00c853, emissiveIntensity: 0.3, depthWrite: false }), 0, 1.55, 0.6, false);
  glass.scale.set(0.8, 0.62, 0.55);
  const balls = [];
  const ballCols = [0xffd54f, 0x00e676, 0x18ffff, 0xea80fc, 0xff5252];
  for (let k = 0; k < 9; k++) balls.push(add(g, new THREE.SphereGeometry(0.18, 12, 8), GLOW(ballCols[k % 5], 0.8), (Math.random() - 0.5) * 1.0, 1.3 + Math.random() * 0.5, 0.5 + (Math.random() - 0.5) * 0.4, false));
  // 前面：老虎機面板（三格捲軸 🍀 7 ⭐ 會轉）+ 金色拉桿 + 出口槽
  add(g, new THREE.BoxGeometry(1.9, 1.2, 0.3), dark, 0, 2.95, 1.3);
  add(g, new THREE.BoxGeometry(2.0, 0.1, 0.34), gold, 0, 3.58, 1.3);
  add(g, new THREE.BoxGeometry(2.0, 0.1, 0.34), gold, 0, 2.32, 1.3);
  const reelTex = reelTexture();
  const reels = [];
  for (let k = -1; k <= 1; k++) {
    const tex = reelTex.clone();
    tex.needsUpdate = true;
    const r = add(g, new THREE.PlaneGeometry(0.5, 0.8), new THREE.MeshBasicMaterial({ map: tex }), k * 0.58, 2.95, 1.46, false);
    reels.push(r);
  }
  const lever = new THREE.Group();
  lever.position.set(1.45, 2.4, 0.6);
  g.add(lever);
  add(lever, new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), gold, 0, 0.55, 0);
  add(lever, new THREE.SphereGeometry(0.17, 14, 10), GLOW(0xff1744, 0.9), 0, 1.15, 0, false);
  add(g, new THREE.BoxGeometry(0.8, 0.3, 0.3), dark, 0, 0.62, 1.38);
  const button = add(g, new THREE.CylinderGeometry(0.22, 0.22, 0.14, 20), GLOW(0xff1744, 1.2), 0.75, 1.15, 1.32, false);
  button.rotation.x = PI / 2;
  // 頂：大四葉草（會轉）
  const big = clover(0.9, leafMat);
  big.position.set(0, 4.7, 0);
  g.add(big);
  add(g, new THREE.CylinderGeometry(0.06, 0.08, 1.0, 8), gold, 0, 4.0, 0);
  // 兩邊細四葉草燈柱
  const smalls = [];
  for (const s of [-1, 1]) {
    add(g, new THREE.CylinderGeometry(0.08, 0.12, 2.6, 8), gold, s * 2.0, 1.45, 0.6);
    const c = clover(0.35, leafMat);
    c.position.set(s * 2.0, 2.95, 0.6);
    g.add(c);
    smalls.push(c);
  }
  // 運氣光環：地上兩圈綠光 + 一條條升起嘅光柱 + 飄浮四葉草粒子
  const ring = add(g, new THREE.RingGeometry(2.6, 3.0, 64), additive(0x00e676, 0.45), 0, 0.05, 0, false);
  ring.rotation.x = -PI / 2;
  const ring2 = add(g, new THREE.RingGeometry(3.2, 3.35, 64), additive(0xb9f6ca, 0.35), 0, 0.05, 0, false);
  ring2.rotation.x = -PI / 2;
  const aura = add(g, new THREE.CylinderGeometry(2.7, 2.9, 5.5, 32, 1, true), additive(0x00e676, 0.09), 0, 2.75, 0, false);
  const floaters = [];
  for (let k = 0; k < 10; k++) {
    const c = clover(0.12, leafMat);
    c.userData = { a: (k / 10) * PI * 2, h: Math.random() * 5, r: 2.2 + Math.random() * 0.7, sp: 0.4 + Math.random() * 0.5 };
    g.add(c);
    floaters.push(c);
  }
  // 招牌
  const sign = makeSign([{ text: '🍀 LUCK MACHINE', size: 0.42 }, { text: 'Press E · Luck Trails!', size: 0.28 }], 3.4, 0.95, THEMES.green);
  sign.position.set(0, 5.9, 0.2);
  g.add(sign);
  const luckLabel = makeLabel([{ text: '🍀 Luck x1' }], 0.8);
  luckLabel.position.set(0, 6.75, 0.2);
  g.add(luckLabel);
  addCollider(x, z, 1.7);
  // 撳 E 嘅位：部機前面（本地 +z）
  const spot = { x: x + Math.sin(rot) * 2.9, z: z + Math.cos(rot) * 2.9 };
  return { g, big, smalls, ring, ring2, aura, floaters, balls, luckLabel, spot, reels, lever };
}

// ======================== 🌈 條 trail（身後嘅光帶）========================
const N = 34; // 最多幾多個點
const TRAIL_LIFE = 0.8; // 條尾留幾耐（秒）
function createTrail(scene) {
  // 每個點 4 個頂點：0/1 = 直企條帶（下／上）、2/3 = 打橫條帶（左／右）——由後面望都見到
  const pos = new Float32Array(N * 4 * 3);
  const col = new Float32Array(N * 4 * 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const idx = [];
  for (let i = 0; i < N - 1; i++) {
    const a = i * 4;
    const b = a + 4;
    idx.push(a, a + 1, b, a + 1, b + 1, b); // 直
    idx.push(a + 2, a + 3, b + 2, a + 3, b + 3, b + 2); // 橫
  }
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false }); // 普通混合：日頭都睇到啲顏色（加法會變白）
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  // 星星（Galaxy）
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(N * 3);
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  stars.frustumCulled = false;
  stars.visible = false;
  scene.add(stars);
  return { mesh, stars, pts: [], colors: [], id: null };
}

function paletteFor(trail) {
  const cols = trail.colors.map((c) => new THREE.Color(c));
  return (t, time) => {
    // t：0 = 最前（你身邊）→ 1 = 尾
    if (trail.rainbow) return new THREE.Color().setHSL((t * 0.9 + time * 0.25) % 1, 1, 0.55);
    const f = Math.min(cols.length - 1.0001, t * (cols.length - 1) + (trail.stars ? Math.sin(time * 2) * 0.2 : 0));
    const i = Math.max(0, Math.floor(f));
    return cols[i].clone().lerp(cols[Math.min(cols.length - 1, i + 1)], f - i);
  };
}

function updateTrail(T, trail, feet, show, time) {
  if (!trail || !show) {
    T.mesh.visible = T.stars.visible = false;
    T.pts.length = 0;
    T.age = [];
    return;
  }
  if (T.id !== trail.id) {
    T.id = trail.id;
    T.paint = paletteFor(trail);
  }
  // 每個點記住幾時加（T.age）：最近 TRAIL_LIFE 秒行過嘅位置先畫，企定就慢慢消失
  const head = T.pts[0];
  if (!head || T.pts[1]?.distanceToSquared(feet) > 0.04 || !T.pts[1]) {
    T.pts.unshift(feet.clone());
    T.age = [time, ...(T.age || [])];
  } else head.copy(feet);
  T.age[0] = time;
  while (T.pts.length > N || (T.pts.length > 1 && time - T.age[T.pts.length - 1] > TRAIL_LIFE)) {
    T.pts.pop();
    T.age.pop();
  }
  const n = T.pts.length;
  T.mesh.visible = n > 2;
  T.stars.visible = n > 2 && !!trail.stars;
  if (n <= 2) return;
  const pos = T.mesh.geometry.attributes.position.array;
  const col = T.mesh.geometry.attributes.color.array;
  const sp = T.stars.geometry.attributes.position.array;
  for (let i = 0; i < N; i++) {
    const p = T.pts[Math.min(i, n - 1)];
    const q = T.pts[Math.min(i + 1, n - 1)];
    let dx = p.x - q.x;
    let dz = p.z - q.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const t = i / (N - 1);
    const wave = Math.sin(time * 6 - i * 0.5) * 0.06;
    const lo = 0.35 + wave;
    const hi = 1.15 - t * 0.35 + wave; // 尾越嚟越窄
    const half = 0.4 * (1 - t * 0.6);
    const mid = p.y + 0.75 + wave;
    pos.set([p.x, p.y + lo, p.z, p.x, p.y + hi, p.z, p.x - dz * half, mid, p.z + dx * half, p.x + dz * half, mid, p.z - dx * half], i * 12);
    const c = T.paint(t, time);
    const a = i >= n ? 0 : Math.min(1, (1 - t) * 1.2);
    col.set([c.r, c.g, c.b, a * 0.7, c.r, c.g, c.b, a, c.r, c.g, c.b, a * 0.8, c.r, c.g, c.b, a * 0.8], i * 16);
    sp.set([p.x + Math.sin(i * 12.9 + time) * 0.25, p.y + 0.4 + ((i * 0.37 + time * 0.5) % 0.8), p.z + Math.cos(i * 7.3 + time) * 0.25], i * 3);
  }
  T.mesh.geometry.attributes.position.needsUpdate = true;
  T.mesh.geometry.attributes.color.needsUpdate = true;
  T.stars.geometry.attributes.position.needsUpdate = true;
}

// ======================== 🧾 面板 ========================
function ensureCss() {
  if ($('luck-css')) return;
  const st = document.createElement('style');
  st.id = 'luck-css';
  st.textContent = `
  #panel[data-kind="luck"] .card.wide { background: radial-gradient(ellipse at 50% 0%, #2e7d32, #0b3d1c 70%); border-color: #69f0ae; box-shadow: 0 0 0 3px rgba(0,230,118,.5), 0 0 50px rgba(0,230,118,.6), 0 20px 50px rgba(0,0,0,.45); }
  #panel[data-kind="luck"] #panel-title { background: linear-gradient(180deg, #00e676 0%, #00a152 100%); border-bottom-color: #00692f; text-shadow: 0 0 10px #b9f6ca, 0 3px 0 rgba(0,0,0,.3); }
  .lk-top { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
  .lk-pill { background: rgba(0,0,0,.35); border: 2px solid #69f0ae; color: #e8f5e9; border-radius: 999px; padding: 4px 12px; font-weight: 800; }
  .lk-odds { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 10px; font-size: 13px; color: #e8f5e9; }
  .lk-odds span { background: rgba(0,0,0,.3); border-radius: 8px; padding: 2px 8px; border-left: 5px solid var(--c); }
  .lk-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .lk-card { background: rgba(0,0,0,.35); border: 2px solid rgba(185,246,202,.4); border-radius: 14px; padding: 8px; color: #e8f5e9; text-align: center; display: flex; flex-direction: column; gap: 4px; }
  .lk-card.on { border-color: #ffd54f; box-shadow: 0 0 14px rgba(255,213,79,.7); }
  .lk-swatch { height: 34px; border-radius: 10px; border: 2px solid rgba(255,255,255,.6); }
  .lk-card b { font-size: 15px; }
  .lk-luck { font-size: 18px; font-weight: 900; color: #69f0ae; }
  .lk-card button { width: 100%; }
  .lk-say { color: #e8f5e9; margin-bottom: 8px; }`;
  document.head.appendChild(st);
}
const swatch = (t) => (t.rainbow ? `linear-gradient(90deg, ${t.colors.join(',')})` : `linear-gradient(90deg, ${t.colors.join(',')})`);
function panelHtml() {
  const owned = new Set(state.trails || []);
  const on = state.trail;
  const luck = trailLuck(on);
  const odds = rarityChances(luck).filter((r) => r.chance > 0).map((r) => {
    const c = RARITIES.find((x) => x.name === r.name).color;
    return `<span style="--c:${c}">${r.name} ${r.chance < 1 ? r.chance.toFixed(2) : r.chance.toFixed(1)}%</span>`;
  }).join('');
  const cards = TRAILS.map((t) => {
    const have = owned.has(t.id);
    const btn = on === t.id
      ? '<button data-luck="unequip" class="grey">✔ Equipped (take off)</button>'
      : have
        ? `<button data-luck="equip" data-id="${t.id}">Equip</button>`
        : state.money >= t.cost
          ? `<button data-luck="buy" data-id="${t.id}">Buy 💰 ${fmt(t.cost)}</button>`
          : `<button class="grey" disabled>💰 ${fmt(t.cost)}</button>`;
    return `<div class="lk-card ${on === t.id ? 'on' : ''}"><div class="lk-swatch" style="background:${swatch(t)}"></div><b>${t.name}</b><span class="lk-luck">🍀 x${t.luck} Luck</span>${btn}</div>`;
  }).join('');
  return `<div class="lk-top"><span class="lk-pill">🍀 Your luck: x${luck}</span><span class="lk-pill">💰 ${fmt(state.money)}</span><span class="lk-pill">🌈 ${owned.size}/${TRAILS.length} trails</span></div>
    <div class="lk-say">🍀 <b>Lucky Clover:</b> "Wear a Luck Trail and <b>Legendary</b>, <b>Mythic</b> and <b>Eternal</b> animals show up MORE often in the biomes! You keep every trail you buy."</div>
    <div class="lk-odds">Wild animal chances now: ${odds}</div>
    <div class="lk-cards">${cards}</div>`;
}

// ======================== 🚀 起晒 ========================
export function createLuckMachine({ scene, play = () => {}, popup = () => {}, announce = () => {} }) {
  ensureCss();
  const m = buildMachine(scene);
  const T = createTrail(scene);
  const applyLuck = () => {
    if (state.trail && !(state.trails || []).includes(state.trail)) state.trail = null; // 舊存檔／唔見咗
    const luck = trailLuck(state.trail);
    setRarityLuck(luck);
    m.luckLabel.userData.setLines([{ text: `🍀 Your luck: x${luck}`, color: '#b9f6ca' }]);
  };
  applyLuck();
  extraPanels.luck = ['🍀 Luck Machine', panelHtml, 'E'];
  let toggle = () => {};

  $('panel-body').addEventListener('click', (e) => {
    if ($('panel').dataset.kind !== 'luck') return;
    const b = e.target.closest('button[data-luck]');
    if (!b) return;
    const t = findTrail(b.dataset.id);
    const act = b.dataset.luck;
    if (act === 'buy' && t) {
      if (state.money < t.cost) {
        play('wrong');
        popup('💰 Not enough money yet!');
      } else {
        state.money -= t.cost;
        state.trails = [...new Set([...(state.trails || []), t.id])];
        state.trail = t.id;
        play('magic');
        announce(`🍀 You got the ${t.name}! Luck x${t.luck}: Legendary, Mythic and Eternal animals show up more!`);
      }
    } else if (act === 'equip' && t) {
      state.trail = t.id;
      play('upgrade');
      popup(`🍀 ${t.name} on! Luck x${t.luck}`);
    } else if (act === 'unequip') {
      state.trail = null;
      play('click');
      popup('🍀 Trail off. Luck x1');
    }
    applyLuck();
    save();
    $('panel-body').innerHTML = panelHtml();
  });

  const feetV = new THREE.Vector3();
  return {
    setToggle(fn) {
      toggle = fn;
    },
    applyLuck,
    debugTrail: T,
    interaction(pos) {
      if (Math.hypot(pos.x - m.spot.x, pos.z - m.spot.z) > ACT) return null;
      return { prompt: `<kbd>E</kbd> 🍀 Open the LUCK MACHINE (luck x${trailLuck(state.trail)})`, action: () => toggle('luck') };
    },
    update(dt, time, feet, show = true) {
      setRarityLuck(trailLuck(state.trail)); // 載入咗另一個存檔都跟到
      // 部機動畫
      m.big.rotation.y = time * 0.8;
      m.big.position.y = 4.7 + Math.sin(time * 1.5) * 0.12;
      m.smalls.forEach((c, i) => (c.rotation.y = -time * 1.2 + i));
      m.ring.material.opacity = 0.35 + Math.sin(time * 2.4) * 0.15;
      m.ring.rotation.z = time * 0.3;
      m.aura.material.opacity = 0.07 + Math.sin(time * 1.8) * 0.03;
      m.floaters.forEach((c) => {
        const u = c.userData;
        u.h = (u.h + dt * u.sp) % 5.5;
        c.position.set(Math.cos(u.a + time * 0.4) * u.r, u.h, Math.sin(u.a + time * 0.4) * u.r);
        c.rotation.set(time, time * 1.3, 0);
        c.scale.setScalar(Math.sin((u.h / 5.5) * PI));
      });
      m.balls.forEach((b, i) => (b.position.y = 1.3 + Math.abs(Math.sin(time * 2.2 + i * 1.3)) * 0.55));
      // 捲軸：轉一陣、停一陣（停喺 🍀）
      const spin = time % 5 < 2.2;
      m.reels.forEach((r, i) => {
        const tex = r.material.map;
        if (spin && time % 5 < 1.2 + i * 0.5) tex.offset.y = (tex.offset.y + dt * (6 + i)) % 1;
        else tex.offset.y = 0.5; // 停喺 🍀
      });
      m.lever.rotation.x = time % 5 < 0.4 ? Math.sin((time % 5) / 0.4 * PI) * 0.9 : 0;
      // 身後條 trail
      if (feet) feetV.copy(feet);
      updateTrail(T, findTrail(state.trail), feetV, show && !!feet, time);
    },
  };
}
