// 🗺️ World Expedition 地圖（小朋友 Issue #11）：Spawn Ruins 入面一張發光大地圖枱
// 「When the boss dies it teleports you back to the Halloween world and you can see there's a new World Expedition map,
//   which needs Soul Candy to unlock Halloween World 2 (each boss kill = 1 Soul Candy, 5 to unlock World 2).」
//
// - 地圖畫住 World 1（Halloween）同 World 2（Hell），未開 World 2 有鎖 + 鐵鏈；開咗就發光
// - 撳 E → 面板：🍬 Soul Candy x/5、Unlock 掣（夠 5 粒先撳到，用走 5 粒）、開咗之後 🔥 Travel to Hell
// - Soul Candy：state.soulCandy（Pumpkin Reaper Dragon 嗰位 helper 加）；開咗：state.world2Unlocked
//
// main.js 用法：
//   const ex = createExpedition({ scene, openPanel, closePanel, travel, popup, announce })   // 第一次入 Halloween 世界先起
//   ex.update(dt, t, camPos)
//   ex.interaction(pos) → { prompt, action } | null

import * as THREE from 'three';
import { HW_X, RUINS } from './halloweenShape.js';
import { halloween } from './halloweenWorld.js';
import { extraPanels, panelKind } from './hud.js';
import { makeSign, makeLabel, THEMES } from './signs.js';
import { addCollider } from './world.js';
import { state, save } from './state.js';
import { play } from './sound.js';
import { M, GLOW, add, box, cyl, cone, ball, halo, lightPool, glowTex } from './halloweenArt.js';

export const SOUL_CANDY_TO_UNLOCK = 5; // 🍬 開 World 2 要幾多粒
// 📍 位置：出生點東南面（Echo 寶箱舖喺東北 HW_X+10, -9；Echo's Questline 喺西北 HW_X-10, -9；返 Hub 傳送門喺 HW_X, 12）
export const EXPEDITION_MAP = { x: HW_X + 12, z: RUINS.z + 9 };
const ROT = Math.atan2(HW_X - EXPEDITION_MAP.x, 4 - EXPEDITION_MAP.z); // 前面（local +z）望住到埗嘅位
const FRONT = { x: Math.sin(ROT), z: Math.cos(ROT) };
export const EXPEDITION_SPOT = { x: EXPEDITION_MAP.x + FRONT.x * 3, z: EXPEDITION_MAP.z + FRONT.z * 3, rotY: ROT }; // 企喺度望住地圖（鏡頭 rotation.y = ROT 即係望住 -FRONT）
const PI = Math.PI;
const $ = (id) => document.getElementById(id);
export const soulCandy = () => state.soulCandy || 0;

// ======================== 🗺️ 地圖畫面（canvas，唔用 emoji，冇字型都畫到）========================
function drawMap(ctx, W, H, { candy, unlocked }) {
  // 羊皮紙
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, W * 0.65);
  g.addColorStop(0, '#f7e3b5');
  g.addColorStop(0.7, '#e3c48a');
  g.addColorStop(1, '#9c7444');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 燒焦咗嘅邊
  ctx.strokeStyle = 'rgba(70,40,15,0.7)';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, W - 14, H - 14);
  ctx.strokeStyle = 'rgba(120,80,40,0.6)';
  ctx.lineWidth = 3;
  ctx.strokeRect(26, 26, W - 52, H - 52);
  // 海（波紋）
  ctx.strokeStyle = 'rgba(90,110,140,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const x = 60 + ((i * 197) % (W - 120)), y = 70 + ((i * 131) % (H - 140));
    ctx.beginPath();
    ctx.arc(x, y, 9, PI * 1.1, PI * 1.9);
    ctx.arc(x + 18, y, 9, PI * 1.1, PI * 1.9);
    ctx.stroke();
  }
  // 標題
  ctx.fillStyle = '#4a2a10';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('WORLD EXPEDITION', W / 2, 82);
  // ---- World 1：Halloween 島 ----
  const w1 = { x: W * 0.25, y: H * 0.55 };
  island(ctx, w1.x, w1.y, 150, '#6d8a4a', '#4e6a33');
  // 南瓜
  for (const [dx, dy, r] of [[-50, 10, 22], [10, 30, 16], [40, -10, 19]]) pumpkinIcon(ctx, w1.x + dx, w1.y + dy, r);
  // 大屋
  ctx.fillStyle = '#3d2b4f';
  ctx.fillRect(w1.x - 30, w1.y - 90, 60, 44);
  ctx.beginPath();
  ctx.moveTo(w1.x - 38, w1.y - 90); ctx.lineTo(w1.x, w1.y - 125); ctx.lineTo(w1.x + 38, w1.y - 90); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffb74d';
  for (const dx of [-16, 8]) ctx.fillRect(w1.x + dx, w1.y - 80, 9, 12);
  // ✔ 你喺度
  label(ctx, 'WORLD 1', w1.x, w1.y + 118, '#4a2a10', 30);
  label(ctx, 'HALLOWEEN', w1.x, w1.y + 150, '#bf360c', 34);
  ctx.fillStyle = '#c62828';
  ctx.beginPath();
  ctx.arc(w1.x + 70, w1.y - 60, 14, PI, 0);
  ctx.lineTo(w1.x + 70, w1.y - 30);
  ctx.closePath();
  ctx.fill();
  // ---- 虛線路 ----
  const w2 = { x: W * 0.74, y: H * 0.5 };
  ctx.setLineDash([16, 14]);
  ctx.strokeStyle = unlocked ? '#d84315' : 'rgba(120,60,30,0.7)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(w1.x + 120, w1.y);
  ctx.bezierCurveTo(W * 0.45, H * 0.25, W * 0.55, H * 0.8, w2.x - 130, w2.y + 10);
  ctx.stroke();
  ctx.setLineDash([]);
  // ---- World 2：Hell（火山島）----
  island(ctx, w2.x, w2.y, 160, '#3a1d1a', '#1c0d0b');
  // 熔岩光
  const lg = ctx.createRadialGradient(w2.x, w2.y, 10, w2.x, w2.y, 150);
  lg.addColorStop(0, unlocked ? 'rgba(255,120,0,0.75)' : 'rgba(255,120,0,0.35)');
  lg.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.arc(w2.x, w2.y, 150, 0, PI * 2); ctx.fill();
  // 火山
  ctx.fillStyle = '#2b1410';
  ctx.beginPath();
  ctx.moveTo(w2.x - 90, w2.y + 40); ctx.lineTo(w2.x - 22, w2.y - 80); ctx.lineTo(w2.x + 22, w2.y - 80); ctx.lineTo(w2.x + 90, w2.y + 40); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff6d00';
  ctx.beginPath();
  ctx.moveTo(w2.x - 22, w2.y - 80); ctx.lineTo(w2.x - 8, w2.y - 30); ctx.lineTo(w2.x + 4, w2.y - 62); ctx.lineTo(w2.x + 14, w2.y - 20); ctx.lineTo(w2.x + 22, w2.y - 80); ctx.closePath();
  ctx.fill();
  // 女巫塔
  ctx.fillStyle = '#4a148c';
  ctx.fillRect(w2.x + 80, w2.y - 110, 22, 100);
  ctx.beginPath(); ctx.moveTo(w2.x + 74, w2.y - 110); ctx.lineTo(w2.x + 98, w2.y - 160); ctx.lineTo(w2.x + 108, w2.y - 110); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ea80fc';
  ctx.beginPath(); ctx.arc(w2.x + 98, w2.y - 162, 6, 0, PI * 2); ctx.fill();
  // 飛天石
  ctx.fillStyle = '#5d2a1c';
  for (const [dx, dy] of [[-120, 70], [-90, 95], [-55, 80]]) { ctx.beginPath(); ctx.ellipse(w2.x + dx, w2.y + dy, 14, 7, 0, 0, PI * 2); ctx.fill(); }
  label(ctx, 'WORLD 2', w2.x, w2.y + 128, '#4a2a10', 30);
  label(ctx, 'HELL', w2.x, w2.y + 162, '#b71c1c', 40);
  if (!unlocked) {
    // 🔒 鐵鏈 + 鎖
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 8;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w2.x - 150, w2.y - 120 * s); ctx.lineTo(w2.x + 150, w2.y + 120 * s);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffca28';
    ctx.fillRect(w2.x - 34, w2.y - 10, 68, 56);
    ctx.strokeStyle = '#ffca28';
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(w2.x, w2.y - 10, 24, PI, 0); ctx.stroke();
    ctx.fillStyle = '#5d4037';
    ctx.beginPath(); ctx.arc(w2.x, w2.y + 12, 8, 0, PI * 2); ctx.fill();
    ctx.fillRect(w2.x - 4, w2.y + 12, 8, 20);
    // Soul Candy 進度
    const n = Math.min(candy, SOUL_CANDY_TO_UNLOCK);
    for (let i = 0; i < SOUL_CANDY_TO_UNLOCK; i++) candyIcon(ctx, w2.x - 100 + i * 50, H - 70, i < n);
  } else {
    label(ctx, 'UNLOCKED!', w2.x, H - 58, '#2e7d32', 38);
  }
  // 指南針
  const cx = W * 0.5, cy = H - 90;
  ctx.fillStyle = 'rgba(80,50,20,0.8)';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34);
    ctx.lineTo(cx + Math.cos(a + PI / 2) * 8, cy + Math.sin(a + PI / 2) * 8);
    ctx.lineTo(cx + Math.cos(a - PI / 2) * 8, cy + Math.sin(a - PI / 2) * 8);
    ctx.fill();
  }
}
function island(ctx, x, y, r, c1, c2) {
  ctx.fillStyle = c2;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * PI * 2;
    const rr = r * (0.85 + Math.sin(a * 5 + x) * 0.08 + Math.cos(a * 3) * 0.06);
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.62);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c1;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * PI * 2;
    const rr = r * 0.82 * (0.85 + Math.sin(a * 5 + x) * 0.08 + Math.cos(a * 3) * 0.06);
    ctx.lineTo(x + Math.cos(a) * rr, y - 8 + Math.sin(a) * rr * 0.58);
  }
  ctx.closePath();
  ctx.fill();
}
function pumpkinIcon(ctx, x, y, r) {
  ctx.fillStyle = '#ef6c00';
  for (const dx of [-0.45, 0, 0.45]) { ctx.beginPath(); ctx.ellipse(x + dx * r, y, r * 0.6, r * 0.8, 0, 0, PI * 2); ctx.fill(); }
  ctx.fillStyle = '#33691e';
  ctx.fillRect(x - 2, y - r * 1.05, 5, r * 0.4);
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.15); ctx.lineTo(x - r * 0.2, y - r * 0.4); ctx.lineTo(x - r * 0.05, y - r * 0.15); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + r * 0.05, y - r * 0.15); ctx.lineTo(x + r * 0.2, y - r * 0.4); ctx.lineTo(x + r * 0.4, y - r * 0.15); ctx.fill();
}
function candyIcon(ctx, x, y, full) {
  ctx.fillStyle = full ? '#ec407a' : 'rgba(90,60,40,0.35)';
  ctx.beginPath(); ctx.arc(x, y, 15, 0, PI * 2); ctx.fill();
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + s * 13, y); ctx.lineTo(x + s * 28, y - 11); ctx.lineTo(x + s * 28, y + 11); ctx.closePath(); ctx.fill();
  }
  if (full) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(x - 5, y - 5, 4, 0, PI * 2); ctx.fill();
  }
}
function label(ctx, text, x, y, color, size) {
  ctx.font = `bold ${size}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(255,240,210,0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// ======================== 面板 ========================
function panelHtml() {
  const c = soulCandy();
  const need = SOUL_CANDY_TO_UNLOCK;
  const open = !!state.world2Unlocked;
  const pct = Math.min(100, (c / need) * 100);
  const w2 = open
    ? `<p class="wx-text">🌋 Lava sea, flying rocks and a spooky <b>Witch Castle</b>. Parkour the flying lava rocks to get there!</p>
       <div class="pet-actions"><button data-wx="travel" class="sell">🔥 Travel to Hell</button></div>`
    : `<div class="wx-candy">🍬 Soul Candy <b>${Math.min(c, 9999)}/${need}</b></div>
       <div class="wx-bar"><div style="width:${pct}%"></div></div>
       <p class="wx-text">${c >= need ? '✨ You have enough Soul Candy! Unlock World 2!' : `Beat the <b>Pumpkin Reaper Dragon</b> in the 🏚️ Abandoned Manor. Every win gives you 1 🍬.`}</p>
       <div class="pet-actions"><button data-wx="unlock" ${c >= need ? 'class="sell"' : 'class="grey" disabled'}>🔓 Unlock World 2 (${need} 🍬)</button></div>`;
  return `<div class="wx">
    <div class="wx-card here">
      <div class="wx-art">🎃</div>
      <div class="wx-kicker">WORLD 1</div><b class="wx-name">Halloween World</b>
      <div class="wx-tag">📍 You are here</div>
      <p class="wx-text">🎃 Pumpkin Graveyard<br>👻 Hollow Sprites<br>🏚️ Abandoned Manor<br>🚂 Ghost World</p>
    </div>
    <div class="wx-path"><span>•</span><span>•</span><span>•</span>➜</div>
    <div class="wx-card ${open ? 'open' : 'locked'}">
      <div class="wx-art">${open ? '🔥' : '🔒'}</div>
      <div class="wx-kicker">WORLD 2</div><b class="wx-name">Hell</b>
      ${w2}
    </div>
  </div>`;
}
const CSS = `
.wx { display: flex; align-items: stretch; gap: 10px; justify-content: center; flex-wrap: wrap; padding: 4px 0; }
.wx-card { flex: 1 1 200px; max-width: 280px; border-radius: 18px; padding: 14px 14px 12px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; border: 3px solid; }
.wx-card.here { background: linear-gradient(180deg, #fff3e0, #ffe0b2); border-color: #ef6c00; color: #4e2600; }
.wx-card.locked { background: linear-gradient(180deg, #efebe9, #d7ccc8); border-color: #6d4c41; color: #3e2723; }
.wx-card.open { background: linear-gradient(180deg, #ffccbc, #ff8a65); border-color: #b71c1c; color: #3e0000; box-shadow: 0 0 24px rgba(255, 87, 34, 0.55); }
.wx-art { font-size: 48px; line-height: 1.1; }
.wx-card.open .wx-art { animation: wx-pulse 1.2s ease-in-out infinite alternate; }
.wx-kicker { font-size: 12px; letter-spacing: 2px; font-weight: 800; opacity: 0.75; }
.wx-name { font-size: 20px; }
.wx-tag { margin-top: 6px; background: #ef6c00; color: #fff; border-radius: 999px; padding: 3px 10px; font-weight: 700; font-size: 13px; }
.wx-path { align-self: center; font-size: 22px; color: #bf360c; letter-spacing: 3px; font-weight: 900; }
.wx-path span { animation: wx-blink 1.2s infinite; }
.wx-path span:nth-child(2) { animation-delay: 0.2s; }
.wx-path span:nth-child(3) { animation-delay: 0.4s; }
.wx-candy { font-size: 17px; margin-top: 6px; }
.wx-bar { width: 100%; height: 14px; background: rgba(0, 0, 0, 0.15); border-radius: 999px; overflow: hidden; }
.wx-bar div { height: 100%; background: linear-gradient(90deg, #f48fb1, #ec407a); border-radius: 999px; transition: width 0.4s; }
.wx-text { font-size: 13.5px; margin: 6px 0 2px; line-height: 1.35; }
@keyframes wx-pulse { from { transform: scale(1); } to { transform: scale(1.12); } }
@keyframes wx-blink { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
`;

// ======================== 起地圖枱 ========================
function buildTable(scene) {
  const g = new THREE.Group();
  g.position.set(EXPEDITION_MAP.x, 0, EXPEDITION_MAP.z);
  g.rotation.y = ROT;
  scene.add(g);
  const wood = M(0x5d4037), woodD = M(0x3e2723), stone = M(0x6d6577), gold = M(0xffca28, { metalness: 0.7, roughness: 0.3 });
  // 石地台 + 魔法圈
  add(g, cyl(3.4, 3.6, 0.24, 20), stone, 0, 0.12, 0.6);
  const ring = add(g, new THREE.RingGeometry(3, 3.3, 48), new THREE.MeshBasicMaterial({ color: 0xffb74d, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.26, 0.6, false);
  ring.rotation.x = -PI / 2;
  lightPool(g, 0, 0.6, 5, 0xffa040, 0.35, 0.27);
  // 大地圖板（企喺後面，微微向後斜）
  const W = 1024, H = 640;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const board = new THREE.Group();
  board.position.set(0, 2.9, -0.4);
  board.rotation.x = -0.12;
  g.add(board);
  add(board, box(6.2, 4.0, 0.25), woodD, 0, 0, -0.14);
  for (const [x, y, w, h] of [[0, 2.02, 6.5, 0.24], [0, -2.02, 6.5, 0.24], [-3.2, 0, 0.24, 4.3], [3.2, 0, 0.24, 4.3]]) add(board, box(w, h, 0.34), gold, x, y, 0);
  const mapMat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.12, roughness: 0.8 }); // 太光會 bloom 到成個畫面白晒
  add(board, new THREE.PlaneGeometry(5.9, 3.7), mapMat, 0, 0, 0.0, false);
  for (const s of [-1, 1]) add(g, box(0.3, 4.8, 0.3), wood, s * 2.9, 2.4, -0.7); // 腳
  // 前面張枱（細啲，放蠟燭、指南針、卷軸）
  add(g, box(3.6, 0.18, 1.6), wood, 0, 1.05, 1.4);
  for (const [x, z] of [[-1.6, 0.75], [1.6, 0.75], [-1.6, 2.05], [1.6, 2.05]]) add(g, box(0.16, 1.0, 0.16), woodD, x, 0.5, z);
  add(g, cyl(0.3, 0.3, 0.06, 16), gold, -1.0, 1.17, 1.4);
  add(g, box(0.05, 0.02, 0.4), GLOW(0xff5252, 1.4), -1.0, 1.21, 1.4, false).rotation.y = 0.6;
  add(g, cyl(0.1, 0.1, 0.9, 10), M(0xf3e0b5), 0.9, 1.25, 1.5, false).rotation.z = PI / 2; // 卷軸
  const flames = [];
  for (const x of [-1.5, 1.5]) {
    add(g, cyl(0.07, 0.08, 0.36, 8), M(0xf3ecd8), x, 1.32, 1.9, false);
    flames.push(add(g, cone(0.06, 0.18, 6), new THREE.MeshBasicMaterial({ color: 0xffc46b }), x, 1.6, 1.9, false));
  }
  // 細細嘅浮空模型：World 2 火山（未開就細細粒、暗暗哋）
  const holo = new THREE.Group();
  holo.position.set(0.3, 1.5, 1.35);
  g.add(holo);
  add(holo, cone(0.28, 0.36, 7), M(0x3a1d1a), 0, 0, 0, false);
  const lavaTop = add(holo, ball(0.09, 8, 6), GLOW(0xff6d00, 2.5), 0, 0.16, 0, false);
  // 光柱（遠遠都睇到）
  const beamM = new THREE.MeshBasicMaterial({ color: 0xffa040, map: glowTex(), transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = add(g, new THREE.CylinderGeometry(0.7, 1.2, 26, 16, 1, true), beamM, 0, 13, -1.6, false); // 喺地圖板後面（唔好遮住地圖）
  halo(g, 0, 3.2, -1.2, 4, 0xffa040, 0.18);
  // 招牌 + 頭頂字
  const sign = makeSign([{ text: '🗺️ WORLD EXPEDITION', size: 0.36 }, { text: 'Unlock Halloween World 2!', size: 0.2 }], 5.4, 1.1, THEMES.orange);
  sign.position.set(0, 5.75, -0.55);
  g.add(sign);
  const lab = makeLabel([{ text: '🗺️ WORLD EXPEDITION', color: '#ffcc80' }, { text: '🍬 0/5', color: '#f8bbd0' }], 1);
  lab.position.set(0, 7.3, -0.4);
  g.add(lab);
  addCollider(EXPEDITION_MAP.x, EXPEDITION_MAP.z, 1.8);
  addCollider(EXPEDITION_MAP.x + FRONT.x * 1.4, EXPEDITION_MAP.z + FRONT.z * 1.4, 1.2);
  return { g, canvas, tex, ring, flames, holo, lavaTop, beam, lab };
}

export function createExpedition({ scene, openPanel, closePanel, travel, popup = () => {}, announce = () => {} }) {
  if (!$('wx-style')) {
    const st = document.createElement('style');
    st.id = 'wx-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  extraPanels.expedition = ['🗺️ World Expedition', panelHtml, 'E'];
  const t = buildTable(scene);
  let lastKey = '';
  const refresh = () => {
    if (panelKind() === 'expedition') $('panel-body').innerHTML = panelHtml();
  };
  function unlock() {
    if (state.world2Unlocked) return;
    if (soulCandy() < SOUL_CANDY_TO_UNLOCK) {
      play('wrong');
      return popup(`🍬 You need ${SOUL_CANDY_TO_UNLOCK} Soul Candy. Beat the Pumpkin Reaper Dragon to get more!`);
    }
    state.soulCandy = soulCandy() - SOUL_CANDY_TO_UNLOCK;
    state.world2Unlocked = true;
    save();
    play('magic');
    setTimeout(() => play('upgrade'), 400);
    announce('🔓 HALLOWEEN WORLD 2 UNLOCKED! 🔥 The Hell awaits...');
    refresh();
  }
  $('panel-body').addEventListener('click', (e) => {
    if (panelKind() !== 'expedition') return;
    const b = e.target.closest('button[data-wx]');
    if (!b || b.disabled) return;
    if (b.dataset.wx === 'unlock') unlock();
    else if (b.dataset.wx === 'travel') {
      closePanel();
      travel();
    }
  });
  const api = {
    unlock,
    update(dt, time, camPos) {
      const show = halloween.sky > 0.02 && Math.abs(camPos.x - EXPEDITION_MAP.x) < 400;
      t.g.visible = show;
      if (!show) return;
      const key = `${soulCandy()}|${state.world2Unlocked ? 1 : 0}`;
      if (key !== lastKey) { // 數字變咗先重畫地圖
        lastKey = key;
        drawMap(t.canvas.getContext('2d'), t.canvas.width, t.canvas.height, { candy: soulCandy(), unlocked: !!state.world2Unlocked });
        t.tex.needsUpdate = true;
        t.lab.userData.setLines?.([{ text: '🗺️ WORLD EXPEDITION', color: '#ffcc80' }, { text: state.world2Unlocked ? '🔥 World 2 is OPEN!' : `🍬 Soul Candy ${Math.min(soulCandy(), SOUL_CANDY_TO_UNLOCK)}/${SOUL_CANDY_TO_UNLOCK}`, color: state.world2Unlocked ? '#ff8a65' : '#f8bbd0' }]);
        t.beam.material.color.setHex(state.world2Unlocked ? 0xff5722 : 0xffa040);
        refresh();
      }
      const ready = state.world2Unlocked || soulCandy() >= SOUL_CANDY_TO_UNLOCK;
      t.ring.material.opacity = 0.4 + Math.sin(time * (ready ? 6 : 2)) * 0.25;
      t.beam.material.opacity = (ready ? 0.32 : 0.2) + Math.sin(time * 2) * 0.06;
      t.flames.forEach((f, i) => f.scale.set(1, 0.85 + Math.sin(time * 13 + i * 2) * 0.2, 1));
      t.holo.rotation.y = time * 0.8;
      t.holo.position.y = 1.5 + Math.sin(time * 2) * 0.05;
      t.holo.scale.setScalar(state.world2Unlocked ? 1.3 : 0.9);
      t.lavaTop.material.emissiveIntensity = 2 + Math.sin(time * 5) * 0.8;
    },
    interaction(pos) {
      if (Math.hypot(pos.x - EXPEDITION_SPOT.x, pos.z - EXPEDITION_SPOT.z) > 2.8 && Math.hypot(pos.x - EXPEDITION_MAP.x, pos.z - EXPEDITION_MAP.z) > 3.6) return null;
      const extra = state.world2Unlocked ? '🔥 travel to Hell' : soulCandy() >= SOUL_CANDY_TO_UNLOCK ? '🔓 unlock World 2!' : `🍬 ${soulCandy()}/${SOUL_CANDY_TO_UNLOCK} Soul Candy`;
      return { prompt: `<kbd>E</kbd> 🗺️ World Expedition: ${extra}`, action: () => { play('boing'); openPanel(); } };
    },
  };
  return api;
}
