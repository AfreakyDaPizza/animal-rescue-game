// 🌳 Witch's Skill Tree（小朋友 Issue #14：「Add a skill tree next to the witch, where you spend Skele Tokens on skills
//   such as health, damage, loot luck and more」）—— 數值喺 src/data/skills.js
//
// 存檔：state.skills = { id: level }；用 ☠️ Skele Tokens（state.skeleTokens）買
//
// API（塔、武器讀；未買 = 冇效果）：
//   import { skillLevel, skillMult, fightSpeed } from './skillTree.js'
//   或者 window.__skills = { level(id), mult(id), fightSpeed(x, z), list }
//   mult(id) 回傳：
//     'damage' 傷害 ×  · 'health' 心數 ×（5 心 × 1.2 = 6 心；即係每級 +1 心）· 'loot' 塔獎品數量 ×
//     'reload' 換彈速度 ×（換彈時間 ÷ 呢個）· 'regen' 回心速度 ×（回心時間 ÷ 呢個）· 'speed' 打架時跑步速度 ×
//     'souls' Candy Corn／Souls 數量 ×（疊埋 loot）
//     ⚠️ 'crit' = 爆擊機會（0–0.25，唔係 ×）；'shield' = 開局有幾多個 🛡️（0–3，每個擋一下）
//     唔識嘅 id → 1
//
// 3D：buildSkillTreeStall(parent, x, y, z, ry) → { update(t, quality), pos }（hellWorld.js 叫，擺喺女巫隔籬）
// 面板：createSkillTreePanel({ play, popup, announce }) → extraPanels.skills；main 撳 E 用 openSkills()

import * as THREE from 'three';
import { state, save } from './state.js';
import { extraPanels } from './hud.js';
import { SKILLS, SKILL_BRANCHES } from './data/skills.js';
import { inTowerArena } from './towerShape.js';
import { inReaperHall } from './reaperShape.js';
import { makeSign, THEMES } from './signs.js';
import { M, add, cyl, ball, halo, lightPool, glowTex } from './halloweenArt.js';

const PI = Math.PI;
const byId = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
const maxOf = (s) => s.costs.length;

// ======================== API ========================
export function skillLevel(id) {
  const s = byId[id];
  if (!s) return 0;
  return Math.max(0, Math.min(maxOf(s), Math.floor(state.skills?.[id] || 0)));
}
export function skillMult(id) {
  const s = byId[id];
  if (!s) return 1;
  const L = skillLevel(id);
  if (id === 'crit' || id === 'shield') return L * s.per; // 機會率／幾多個盾
  return 1 + L * s.per;
}
// 打架嘅地方（Witch Tower、Pumpkin Reaper 大廳）先快啲
export const fightSpeed = (x, z) => (inTowerArena(x, z) || inReaperHall(x, z) ? skillMult('speed') : 1);
export const skillCost = (id) => {
  const s = byId[id];
  const L = skillLevel(id);
  return s && L < maxOf(s) ? s.costs[L] : null;
};
export function skillUnlocked(id) {
  const s = byId[id];
  return !!s && (!s.parent || skillLevel(s.parent) >= (s.needs || 1));
}
// 買一級：回傳 null = 成功，否則係原因
export function buySkill(id) {
  const s = byId[id];
  if (!s) return 'No such skill';
  if (!skillUnlocked(id)) return `🔒 Needs ${byId[s.parent].name} Lv ${s.needs || 1} first`;
  const cost = skillCost(id);
  if (cost == null) return '⭐ Already MAX level!';
  if ((state.skeleTokens || 0) < cost) return `Need ${cost - (state.skeleTokens || 0)} more ☠️ Skele Tokens`;
  state.skeleTokens -= cost;
  state.skills = { ...(state.skills || {}), [id]: skillLevel(id) + 1 };
  save();
  return null;
}
window.__skills = { level: skillLevel, mult: skillMult, fightSpeed, list: SKILLS };

// ======================== 面板 ========================
// 樹嘅位（%）：底 = 🔮 種子，中間 = 3 個根技能，頂 = 6 個分支
const LAYOUT = {
  health: [17, 60], regen: [7, 20], shield: [27, 20],
  damage: [50, 60], crit: [40, 20], reload: [60, 20],
  loot: [83, 60], souls: [73, 20], speed: [93, 20],
};
const SEED = [50, 91];
let selected = 'health';
const CSS = `
#panel[data-kind="skills"] #panel-title { background: linear-gradient(180deg, #7c4dff 0%, #4a148c 100%); border-bottom-color: #2a0a52; }
.sk-wrap { display: flex; flex-direction: column; gap: 12px; }
.sk-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.sk-top .sk-tokens { background: #1d0b33; color: #fff; border: 2px solid #b388ff; border-radius: 999px; padding: 5px 14px; font-weight: 800; }
.sk-top small { color: #5e4a7a; }
.sk-tree { position: relative; width: 100%; aspect-ratio: 2.1; min-height: 230px; border-radius: 18px; overflow: hidden;
  background: radial-gradient(ellipse at 50% 100%, #4a1d7a 0%, #22093d 55%, #12041f 100%); border: 3px solid #5e35b1; box-shadow: inset 0 0 40px rgba(124, 77, 255, 0.35); }
.sk-tree::before { content: ''; position: absolute; inset: 0; opacity: 0.55; pointer-events: none;
  background-image: radial-gradient(#fff 1px, transparent 1.5px), radial-gradient(#d1c4e9 1px, transparent 1.5px); background-size: 46px 46px, 71px 71px; background-position: 0 0, 23px 31px; }
.sk-tree svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.sk-tree svg path { fill: none; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.sk-tree svg .bark { stroke: #3b1f2b; stroke-width: 14; }
.sk-tree svg .vein { stroke-width: 4; opacity: 0.35; }
.sk-tree svg .vein.on { opacity: 1; stroke-dasharray: 6 8; animation: sk-flow 1.2s linear infinite; filter: drop-shadow(0 0 4px currentColor); }
@keyframes sk-flow { to { stroke-dashoffset: -28; } }
.card .sk-tree button.sk-node { position: absolute; transform: translate(-50%, -50%); width: 64px; height: 64px; border-radius: 50%; border: 4px solid var(--c); padding: 0;
  background: radial-gradient(circle at 35% 30%, #5b3a8a, #1c0b33 70%); margin: 0; min-width: 0; text-shadow: none; font-size: 30px; line-height: 1; cursor: pointer; display: grid; place-items: center;
  box-shadow: 0 0 0 3px rgba(0,0,0,0.35), 0 0 14px var(--c); transition: transform 0.12s; color: #fff; }
.card .sk-tree button.sk-node:hover { background: radial-gradient(circle at 35% 30%, #7a52b3, #2a1048 70%); transform: translate(-50%, -50%) scale(1.1); }
.card .sk-tree button.sk-node:active { transform: translate(-50%, -50%) scale(0.95); }
.card .sk-tree button.sk-node.sel { outline: 4px solid #fff; outline-offset: 3px; }
.card .sk-tree button.sk-node.locked { filter: grayscale(1) brightness(0.6); box-shadow: 0 0 0 3px rgba(0,0,0,0.35); }
.card .sk-tree button.sk-node.locked::after { content: '🔒'; position: absolute; right: -6px; top: -6px; font-size: 18px; }
.card .sk-tree button.sk-node.can { animation: sk-pulse 1.1s ease-in-out infinite; }
@keyframes sk-pulse { 50% { box-shadow: 0 0 0 3px rgba(0,0,0,0.35), 0 0 28px 6px var(--c); } }
.card .sk-tree button.sk-node.max { border-color: #ffd740; box-shadow: 0 0 0 3px rgba(0,0,0,0.35), 0 0 22px #ffd740; }
.card .sk-tree button.sk-node.max::after { content: '⭐'; position: absolute; right: -8px; top: -8px; font-size: 18px; }
.card .sk-tree button.sk-node .lv { position: absolute; bottom: -9px; left: 50%; transform: translateX(-50%); background: #120420; border: 2px solid var(--c); border-radius: 999px;
  font: 800 11px 'Fredoka', system-ui, sans-serif; padding: 0 6px; white-space: nowrap; }
.card .sk-tree button.sk-node .nm { position: absolute; top: calc(100% + 11px); left: 50%; transform: translateX(-50%); font: 700 12px 'Fredoka', system-ui, sans-serif;
  color: #ede7f6; white-space: nowrap; text-shadow: 0 2px 0 #000; pointer-events: none; }
.sk-seed { position: absolute; transform: translate(-50%, -50%); font-size: 34px; filter: drop-shadow(0 0 12px #e040fb); animation: sk-bob 2.4s ease-in-out infinite; pointer-events: none; }
@keyframes sk-bob { 50% { transform: translate(-50%, -58%); } }
.sk-branch { position: absolute; bottom: 6px; transform: translateX(-50%); font: 800 12px 'Fredoka', system-ui, sans-serif; color: var(--c); text-shadow: 0 2px 0 #000; letter-spacing: 1px; pointer-events: none; }
.sk-info { display: grid; grid-template-columns: 74px 1fr auto; gap: 12px; align-items: center; background: #f3e5f5; border: 3px solid var(--c); border-radius: 16px; padding: 10px 14px; color: #2a0a3a; }
.sk-info .big { font-size: 46px; text-align: center; }
.sk-info h4 { margin: 0; font-size: 20px; }
.sk-info p { margin: 2px 0; font-size: 14px; }
.sk-info .pips { display: flex; gap: 4px; margin: 4px 0; }
.sk-info .pips i { width: 18px; height: 10px; border-radius: 4px; background: #d1c4e9; border: 2px solid #9575cd; }
.sk-info .pips i.on { background: var(--c); border-color: #4a148c; }
.sk-info .why { color: #b71c1c; font-weight: 700; }
.sk-info button { white-space: nowrap; font-size: 16px; }
body.mobile .card .sk-tree button.sk-node { width: 44px; height: 44px; font-size: 20px; border-width: 3px; }
body.mobile .card .sk-tree button.sk-node .nm { font-size: 9px; top: calc(100% + 8px); }
body.mobile .sk-info { grid-template-columns: 48px 1fr; } body.mobile .sk-info .big { font-size: 32px; } body.mobile .sk-info .act { grid-column: 1 / -1; }
@media (max-width: 640px) { .card .sk-tree button.sk-node { width: 46px; height: 46px; font-size: 21px; } .card .sk-tree button.sk-node .nm { font-size: 9px; } .sk-info { grid-template-columns: 48px 1fr; } .sk-info .act { grid-column: 1 / -1; } }
`;
function ensureCss() {
  if (document.getElementById('skill-tree-css')) return;
  const st = document.createElement('style');
  st.id = 'skill-tree-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}
const colorOf = (s) => SKILL_BRANCHES[s.branch].color;
// 彎彎嘅樹枝（由 a 去 b）
const curve = ([x1, y1], [x2, y2]) => `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2 + 6}, ${x2} ${y2}`;

function skillsHtml() {
  const tokens = state.skeleTokens || 0;
  const lines = [];
  for (const s of SKILLS) {
    const from = s.parent ? LAYOUT[s.parent] : SEED;
    const on = s.parent ? skillLevel(s.id) > 0 : skillLevel(s.id) > 0;
    lines.push({ d: curve(from, LAYOUT[s.id]), c: colorOf(s), on });
  }
  const svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">
    ${lines.map((l) => `<path class="bark" d="${l.d}"/>`).join('')}
    ${lines.map((l) => `<path class="vein ${l.on ? 'on' : ''}" d="${l.d}" stroke="${l.c}" style="color:${l.c}"/>`).join('')}
  </svg>`;
  const nodes = SKILLS.map((s) => {
    const L = skillLevel(s.id), max = maxOf(s), cost = skillCost(s.id);
    const locked = !skillUnlocked(s.id);
    const cls = [locked ? 'locked' : '', L >= max ? 'max' : '', !locked && cost != null && tokens >= cost ? 'can' : '', selected === s.id ? 'sel' : ''].join(' ');
    const [x, y] = LAYOUT[s.id];
    return `<button class="sk-node ${cls}" data-skill="${s.id}" style="left:${x}%;top:${y}%;--c:${colorOf(s)}" title="${s.name}">${s.emoji}<span class="lv">${L >= max ? 'MAX' : `${L}/${max}`}</span><span class="nm">${s.name}</span></button>`;
  }).join('');
  const branches = Object.entries(SKILL_BRANCHES).map(([id, b]) => `<span class="sk-branch" style="left:${LAYOUT[SKILLS.find((s) => s.branch === id && !s.parent).id][0]}%;--c:${b.color}">${b.emoji} ${b.name.toUpperCase()}</span>`).join('');
  // 揀咗嘅技能
  const s = byId[selected] || SKILLS[0];
  const L = skillLevel(s.id), max = maxOf(s), cost = skillCost(s.id);
  const locked = !skillUnlocked(s.id);
  let act;
  if (L >= max) act = '<span class="tag">⭐ MAX LEVEL</span>';
  else if (locked) act = `<span class="why">🔒 Needs ${byId[s.parent].emoji} ${byId[s.parent].name} Lv ${s.needs || 1}</span>`;
  else if (tokens < cost) act = `<button disabled class="grey">Need ${cost - tokens} more ☠️</button>`;
  else act = `<button data-skill-buy="${s.id}" class="sell">Learn Lv ${L + 1} · ☠️ ${cost}</button>`;
  const info = `<div class="sk-info" style="--c:${colorOf(s)}">
    <div class="big">${s.emoji}</div>
    <div><h4>${s.name} <small style="color:${colorOf(s)}">${SKILL_BRANCHES[s.branch].emoji} ${SKILL_BRANCHES[s.branch].name}</small></h4>
      <div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < L ? 'on' : ''}"></i>`).join('')}</div>
      <p>${s.text}${max > 1 ? ' (each level)' : ''}.</p>
      <p><b>Now:</b> ${L ? s.show(L) : 'nothing yet'}${L < max ? ` → <b>Next:</b> ${s.show(L + 1)}` : ''}</p></div>
    <div class="act">${act}</div></div>`;
  return `<div class="sk-wrap">
    <div class="sk-top"><span class="sk-tokens">☠️ ${tokens} Skele Tokens</span><small>Win Skele Tokens in the 🗼 Witch Tower · tap a skill to see it</small></div>
    <div class="sk-tree">${svg}<span class="sk-seed" style="left:${SEED[0]}%;top:${SEED[1]}%">🔮</span>${branches}${nodes}</div>
    ${info}
    <p class="hint">🧙‍♀️ "Skills work in the Witch Tower and in boss fights! Learn a skill to grow the branches above it, dearie!"</p>
  </div>`;
}

export function createSkillTreePanel({ play = () => {}, popup = () => {}, announce = () => {} } = {}) {
  ensureCss();
  extraPanels.skills = ['🌳 The Witch\'s Skill Tree', skillsHtml, 'E'];
  const body = document.getElementById('panel-body');
  const redraw = () => {
    if (document.getElementById('panel').dataset.kind === 'skills') body.innerHTML = skillsHtml();
  };
  body.addEventListener('click', (e) => {
    if (document.getElementById('panel').dataset.kind !== 'skills') return;
    const node = e.target.closest('[data-skill]');
    if (node) {
      selected = node.dataset.skill;
      play('blip');
      return redraw();
    }
    const buy = e.target.closest('[data-skill-buy]');
    if (!buy) return;
    const id = buy.dataset.skillBuy;
    const why = buySkill(id);
    if (why) {
      play('wrong');
      popup(why);
    } else {
      const s = byId[id], L = skillLevel(id);
      play(L >= maxOf(s) ? 'tierUp' : 'upgrade');
      if (L >= maxOf(s)) announce(`⭐ ${s.emoji} ${s.name} is MAX level!`);
      else popup(`${s.emoji} ${s.name} Lv ${L}! ${s.show(L)}`);
    }
    redraw();
  });
}

// ======================== 🌳 3D：發光符文樹 ========================
// 樹面向 +z（ry 轉）；節點位置同面板差唔多（左 Survival、中 Power、右 Fortune）
export function buildSkillTreeStall(parent, x, y, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  const bark = M(0x3b2430, { roughness: 0.85 });
  const stone = M(0x3a3344, { roughness: 0.9 });
  const stoneL = M(0x5a5068, { roughness: 0.85 });
  // 石台（六角）+ 發光符文圈
  add(g, cyl(2.3, 2.5, 0.45, 6), stone, 0, 0.22, 0);
  add(g, cyl(2.0, 2.1, 0.12, 6), stoneL, 0, 0.5, 0);
  const runeM = new THREE.MeshBasicMaterial({ color: 0xb388ff, map: runeRingTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = add(g, new THREE.PlaneGeometry(4.2, 4.2), runeM, 0, 0.58, 0, false);
  ring.userData.keep = true; // 會郁：唔好焊
  ring.rotation.x = -PI / 2;
  lightPool(g, 0, 0, 4.2, 0x9c4dff, 0.35, 0.08);
  // 樹幹 + 樹枝（TubeGeometry）
  const V = (a, b, c) => new THREE.Vector3(a, b, c);
  const tube = (pts, r, mat) => {
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, r, 7, false), mat);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  tube([V(0, 0.5, 0), V(0.15, 1.4, 0.05), V(-0.1, 2.3, 0), V(0, 3.0, 0)], 0.36, bark);
  for (const [dx, dz] of [[0.5, 0.2], [-0.45, 0.25], [0.1, -0.5]]) tube([V(0, 0.9, 0), V(dx * 1.3, 0.55, dz * 1.3), V(dx * 2.1, 0.52, dz * 2.1)], 0.13, bark); // 樹根
  const P = { // 節點位（同面板 LAYOUT 一樣次序）
    health: V(-1.7, 4.0, 0.15), damage: V(0, 4.5, 0.2), loot: V(1.7, 4.0, 0.15),
    regen: V(-2.6, 5.6, 0.1), shield: V(-1.2, 6.0, 0.25), crit: V(-0.5, 6.4, 0.2), reload: V(0.55, 6.4, 0.2), souls: V(1.2, 6.0, 0.25), speed: V(2.6, 5.6, 0.1),
  };
  const top = V(0, 3.0, 0);
  const veins = [];
  const veinMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const s of SKILLS) {
    const a = s.parent ? P[s.parent] : top, b = P[s.id];
    const mid = a.clone().lerp(b, 0.5).add(V(0, 0.35, 0.05));
    tube([a, mid, b], s.parent ? 0.09 : 0.16, bark);
    const vm = veinMat(SKILL_BRANCHES[s.branch].color);
    const v = tube([a.clone().add(V(0, 0, 0.1)), mid.clone().add(V(0, 0, s.parent ? 0.08 : 0.14)), b.clone().add(V(0, 0, 0.1))], s.parent ? 0.025 : 0.035, vm);
    v.castShadow = false;
    veins.push({ s, m: vm });
  }
  // 技能節點：發光寶石（等級越高越光；未解鎖 = 暗）
  const nodes = [];
  const gemGeo = new THREE.IcosahedronGeometry(0.34, 0);
  for (const s of SKILLS) {
    const c = new THREE.Color(SKILL_BRANCHES[s.branch].color);
    const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1, roughness: 0.25, flatShading: true });
    const gem = add(g, gemGeo, m, P[s.id].x, P[s.id].y, P[s.id].z, false);
    gem.userData.keep = true; // 會郁：唔好焊
    gem.scale.setScalar(s.parent ? 0.85 : 1.1);
    const cup = add(g, cyl(0.2, 0.08, 0.2, 6), bark, P[s.id].x, P[s.id].y - 0.36, P[s.id].z);
    cup.castShadow = false;
    halo(g, P[s.id].x, P[s.id].y, P[s.id].z + 0.05, 0.9, c.getHex(), 0.35);
    nodes.push({ s, gem, m, ph: nodes.length * 0.9 });
  }
  // 頂嘅水晶球（種子）+ 浮住嘅符文碎
  const orbM = new THREE.MeshStandardMaterial({ color: 0xe1bee7, emissive: 0xd500f9, emissiveIntensity: 2.2, roughness: 0.1 });
  const orb = add(g, ball(0.42, 16, 12), orbM, 0, 3.15, 0.15, false);
  orb.userData.keep = true; // 會郁：唔好焊
  halo(g, 0, 3.15, 0.15, 1.6, 0xd500f9, 0.45);
  const motes = new THREE.Group();
  g.add(motes);
  const moteM = new THREE.SpriteMaterial({ color: 0xf3c6ff, map: glowTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Sprite(moteM);
    m.scale.setScalar(0.32);
    m.userData = { a: (i / 14) * PI * 2, r: 2 + (i % 3) * 0.5, y: 1 + (i % 5) * 1.1, sp: 0.3 + (i % 4) * 0.12 };
    motes.add(m);
  }
  // 牌（前面）
  const sign = makeSign([{ text: '🌳 SKILL TREE', size: 0.36 }, { text: 'Spend ☠️ Skele Tokens on skills! (E)', size: 0.15 }], 4.0, 1.05, THEMES.purple);
  sign.position.set(0, 1.55, 2.05);
  sign.rotation.x = -0.12;
  g.add(sign);
  for (const s of [-1, 1]) add(g, cyl(0.07, 0.07, 1.6, 6), bark, s * 1.8, 0.8, 2.05);
  const pos = new THREE.Vector3();
  g.updateWorldMatrix(true, false);
  g.localToWorld(pos.set(0, 0, 1.4));
  return {
    g, pos: { x: pos.x, z: pos.z }, center: { x, z },
    update(t, quality = 3) {
      ring.rotation.z = t * 0.25;
      runeM.opacity = 0.65 + Math.sin(t * 2) * 0.25;
      orb.position.y = 3.15 + Math.sin(t * 1.6) * 0.12;
      orbM.emissiveIntensity = 2 + Math.sin(t * 3) * 0.6;
      for (const n of nodes) {
        const L = skillLevel(n.s.id), max = maxOf(n.s);
        const open = skillUnlocked(n.s.id);
        const k = L >= max ? 3.2 : L > 0 ? 1.2 + (L / max) * 1.6 : open ? 0.55 : 0.12;
        n.m.emissiveIntensity = k * (0.85 + Math.sin(t * 2.2 + n.ph) * 0.15);
        n.gem.rotation.y = t * (L ? 1.2 : 0.3) + n.ph;
        n.gem.position.y = P[n.s.id].y + Math.sin(t * 1.4 + n.ph) * 0.06;
      }
      for (const v of veins) v.m.opacity = skillLevel(v.s.id) > 0 ? 0.7 + Math.sin(t * 4 + v.s.id.length) * 0.3 : 0.18;
      motes.visible = quality >= 1;
      if (motes.visible) for (const m of motes.children) {
        const d = m.userData;
        const a = d.a + t * d.sp;
        m.position.set(Math.cos(a) * d.r, d.y + Math.sin(t + d.a) * 0.3, Math.sin(a) * d.r * 0.6);
      }
    },
  };
}
// 地上符文圈紋理
let _runeRing = null;
function runeRingTex() {
  if (_runeRing) return _runeRing;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.translate(128, 128);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  for (const r of [120, 98]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 3;
  ctx.font = 'bold 18px serif';
  ctx.fillStyle = '#fff';
  const glyphs = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒ';
  for (let i = 0; i < 18; i++) {
    ctx.save();
    ctx.rotate((i / 18) * PI * 2);
    ctx.fillText(glyphs[i], -6, -103);
    ctx.restore();
  }
  ctx.beginPath(); // 三角星
  for (let i = 0; i <= 6; i++) {
    const a = (i * 2 / 6) * PI * 2 - PI / 2;
    ctx.lineTo(Math.cos(a) * 92, Math.sin(a) * 92);
  }
  ctx.stroke();
  _runeRing = new THREE.CanvasTexture(c);
  return _runeRing;
}
