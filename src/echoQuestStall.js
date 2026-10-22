// 🐾 Echo's Questline 攤位 + 面板 + HUD（小朋友 2026-10-22）
// 「add a daily questline in the Halloween thing, so add a new stall that says Echo's Questline, and Echo should be a ghost dog.
//   10 quests and each quest is harder but gives you better rewards. Unlocks at 24th October.」
//
// - 攤位：Spawn Ruins 西北面（同 Echo 個寶箱舖左右對稱），鬼魂狗 Echo 浮喺櫃面；後面有塊告示板，10 張任務紙（做完變綠）
// - 撳 E → 面板：今日 10 個任務、而家做緊邊個、進度、獎品；做完撳 Claim
// - HUD：喺 Halloween 世界左邊有個細追蹤器（而家個任務 + 進度條）
// - 做完 → 彈個慶祝卡（彩紙 + Claim 掣，撳 Enter 都得）
// 數據／計數喺 questline.js；任務同獎品喺 data/balance.js（ECHO_QUESTS）
//
// main.js 用法：
//   const ql = createEchoQuests({ scene, openPanel, popup, announce })   // 第一次入 Halloween 世界先起
//   ql.update(dt, time, camera.position)
//   ql.interaction(pos) → { prompt, action } | null

import * as THREE from 'three';
import { ECHO_QUESTS } from './data/balance.js';
import { questline, isQuestlineOpen, questlineLockText, questlineToday, questComplete, rewardList, msToMidnight } from './questline.js';
import { HW_X, RUINS } from './halloweenShape.js';
import { halloween } from './halloweenWorld.js';
import { extraPanels, panelKind, closePanel } from './hud.js';
import { makeLabel, dynamicSign } from './signs.js';
import { addCollider } from './world.js';
import { buildEcho } from './echoShop.js';
import { short } from './format.js';
import { play } from './sound.js';
import { V, B, S, pivot, cone, cyl, limb, torus, candyCorn } from './echoPetModels.js';

const PI = Math.PI;
const $ = (id) => document.getElementById(id);

// 📍 攤位位置：出生點西北面（Echo 寶箱舖喺東北面 HW_X + 10），面向你一到埗企嘅位
export const QUEST_STALL = { x: HW_X - 10, z: RUINS.z - 9 };
const ROT = Math.atan2(HW_X - QUEST_STALL.x, 4 - QUEST_STALL.z); // 前面（local +z）望住出生點
const FRONT = V(Math.sin(ROT), 0, Math.cos(ROT));
const SPOT = { x: QUEST_STALL.x + FRONT.x * 2.6, z: QUEST_STALL.z + FRONT.z * 2.6 }; // 企喺度撳 E
const GHOST_THEME = { top: '#4dd0e1', bottom: '#00838f', border: '#003c44', text: '#ffffff' };
const LOCK_THEME = { top: '#78909c', bottom: '#37474f', border: '#1c262b', text: '#ffffff' };

const fmtLeft = (ms) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h}h ${m}m` : `${m}m`;
};

// ======================== 🏪 攤位 ========================
function buildStall(scene) {
  const g = new THREE.Group();
  g.position.set(QUEST_STALL.x, 0, QUEST_STALL.z);
  g.rotation.y = ROT;
  scene.add(g);
  const woodD = 0x37474f;
  const woodL = 0x607d8b;
  const glowM = (c, o = 0.9) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
  // 地台（舊石 + 一圈青光）
  B(g, 4.4, 0.18, 2.6, 0x34424f, 0, 0.09, 0, {}, { r: 0.2 });
  // 櫃位（深色木 + 青色前板 + 發光狗腳印）
  B(g, 3.4, 1.0, 0.9, woodD, 0, 0.68, 0.4, {}, { line: 0.02, r: 0.08 });
  B(g, 3.2, 0.7, 0.04, 0x006064, 0, 0.66, 0.86, {}, { r: 0.2 });
  B(g, 3.5, 0.12, 1.0, woodL, 0, 1.22, 0.4, {}, { r: 0.3 });
  const pawM = glowM(0x84ffff, 0.9);
  const paw = pivot(g, 0, 0.62, 0.89);
  S(paw, 0.17, 0.14, 0.02, 0x84ffff, 0, -0.04, 0, pawM);
  for (const [x, y] of [[-0.17, 0.12], [-0.06, 0.2], [0.06, 0.2], [0.17, 0.12]]) S(paw, 0.06, 0.07, 0.02, 0x84ffff, x, y, 0, pawM, { lo: true });
  for (const x of [-1.15, 1.15]) { // 兩邊細腳印
    const p = pivot(g, x, 0.66, 0.89);
    p.scale.setScalar(0.55);
    S(p, 0.17, 0.14, 0.02, 0x84ffff, 0, -0.04, 0, pawM);
    for (const [px, py] of [[-0.17, 0.12], [-0.06, 0.2], [0.06, 0.2], [0.17, 0.12]]) S(p, 0.06, 0.07, 0.02, 0x84ffff, px, py, 0, pawM, { lo: true });
  }
  // 柱 + 條紋簷篷（青 / 深紫）
  for (const x of [-1.9, 1.9]) for (const z of [-0.9, 0.9]) B(g, 0.16, 3.1, 0.16, woodL, x, 1.6, z, {}, { line: 0.05 });
  const awning = pivot(g, 0, 3.15, 0.1);
  awning.rotation.x = 0.28;
  for (let i = 0; i < 8; i++) B(awning, 0.52, 0.08, 2.5, i % 2 ? 0x311b92 : 0x26c6da, -1.82 + i * 0.52, 0, 0, i % 2 ? {} : { emissive: 0x00bcd4, emissiveIntensity: 0.3 }, { r: 0.3 });
  for (let i = 0; i < 8; i++) {
    const c = cone(awning, 0.26, 0.3, i % 2 ? 0x311b92 : 0x26c6da, -1.82 + i * 0.52, -0.15, 1.25, {}, 3);
    c.rotation.x = PI;
  }
  // 📜 後面告示板：10 張任務紙（做完變綠、而家嗰張發光）
  const board = pivot(g, 0, 2.15, -0.85);
  B(board, 3.3, 1.5, 0.1, 0x8d6e63, 0, 0, 0, {}, { line: 0.04, r: 0.15 });
  B(board, 3.1, 1.3, 0.04, 0xbcaaa4, 0, 0, 0.05, {}, { r: 0.2 });
  const notes = [];
  for (let i = 0; i < 10; i++) {
    const col = i % 5, row = Math.floor(i / 5);
    const m = new THREE.MeshStandardMaterial({ color: 0xfff8e1, roughness: 0.8, emissive: 0x000000 });
    const n = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.48), m);
    n.position.set(-1.2 + col * 0.6, 0.3 - row * 0.62, 0.08);
    n.rotation.z = Math.sin(i * 2.7) * 0.08;
    board.add(n);
    for (let k = 0; k < 3; k++) { // 紙上嘅「字」（細橫線）
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.28 - (k === 2 ? 0.1 : 0), 0.03), new THREE.MeshBasicMaterial({ color: 0x8d6e63 }));
      line.position.set(0, 0.06 - k * 0.09, 0.002);
      n.add(line);
    }
    S(n, 0.035, 0.035, 0.02, [0xef5350, 0x42a5f5, 0x66bb6a, 0xffca28, 0xab47bc][i % 5], 0, 0.2, 0.01, {}, { lo: true }); // 圖釘
    notes.push(m);
  }
  // 吊住嘅鬼火燈（青色光球）
  const lanterns = [-1.5, 1.5].map((x) => {
    const h = pivot(g, x, 2.95, 1.1);
    limb(h, V(0, 0, 0), V(0, -0.35, 0), 0.01, 0x212121, {});
    cyl(h, 0.12, 0.16, 0.06, 0x263238, 0, -0.38, 0, {}, 12);
    S(h, 0.14, 0.16, 0.14, 0x84ffff, 0, -0.52, 0, glowM(0x84ffff, 0.8), { lo: true });
    S(h, 0.07, 0.08, 0.07, 0xffffff, 0, -0.52, 0, glowM(0xffffff, 0.9), { lo: true });
    return h;
  });
  const lamp = new THREE.PointLight(0x4dd0e1, 10, 14, 1.6);
  lamp.position.set(0, 2.4, 1.4);
  g.add(lamp);
  // 櫃面：一疊任務紙 + 一樽 Candy Corn（獎品）
  const stack = pivot(g, 1.1, 1.29, 0.45);
  for (let k = 0; k < 4; k++) B(stack, 0.5, 0.025, 0.36, 0xfff8e1, Math.sin(k * 3) * 0.03, k * 0.028, 0, {}, { r: 0.3 }).rotation.y = Math.sin(k * 5) * 0.15;
  const jar = pivot(g, -1.3, 1.28, 0.45);
  cyl(jar, 0.2, 0.2, 0.42, 0xe0f7fa, 0, 0.21, 0, { transparent: true, opacity: 0.35, roughness: 0.05 }, 20);
  cyl(jar, 0.17, 0.17, 0.08, 0x00838f, 0, 0.46, 0, {}, 20);
  for (let i = 0; i < 9; i++) {
    const c = candyCorn(jar, 0.06, Math.cos(i * 2.1) * 0.09, 0.08 + (i % 3) * 0.1, Math.sin(i * 2.1) * 0.09);
    c.rotation.set(i, i * 2, 0);
  }
  // 獎盃（Quest 10 大獎）
  const cup = pivot(g, 1.55, 1.28, 0.1);
  cyl(cup, 0.05, 0.1, 0.06, 0xffc400, 0, 0.03, 0, { metalness: 0.7, roughness: 0.3 }, 12);
  cyl(cup, 0.03, 0.03, 0.12, 0xffc400, 0, 0.12, 0, { metalness: 0.7, roughness: 0.3 }, 8);
  cyl(cup, 0.13, 0.06, 0.18, 0xffd740, 0, 0.27, 0, { metalness: 0.7, roughness: 0.25, emissive: 0xffab00, emissiveIntensity: 0.4 }, 16);
  for (const s of [-1, 1]) torus(cup, 0.05, 0.012, 0xffc400, s * 0.14, 0.28, 0, { metalness: 0.7 }).rotation.y = PI / 2;
  // 招牌（會變：未開就顯示幾時開）
  const sign = dynamicSign(3.8, 1.0);
  sign.mesh.material.fog = false;
  sign.mesh.material.toneMapped = false;
  sign.mesh.position.set(0, 3.9, 1.0);
  g.add(sign.mesh);
  const signBack = sign.mesh.clone();
  signBack.rotation.y = PI;
  signBack.position.z = 0.98;
  g.add(signBack);
  // 地上發光圈（企喺度撳 E）
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 40), new THREE.MeshBasicMaterial({ color: 0x18ffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -PI / 2;
  ring.position.set(0, 0.2, 2.6);
  g.add(ring);
  // 👻🐕 Echo 浮喺櫃面（望住客人）
  const echo = buildEcho();
  echo.g.position.set(-0.35, 1.28, 0.35);
  echo.g.rotation.y = PI;
  echo.g.scale.setScalar(1.05);
  g.add(echo.g);
  const label = makeLabel([{ text: "🐾 ECHO'S QUESTLINE", color: '#84ffff' }, { text: '10 daily quests', color: '#ffd54f' }], 0.7);
  label.material.fog = false;
  label.material.depthTest = false;
  label.position.set(-0.35, 3.0, 0.6);
  g.add(label);
  // 碰撞：櫃位唔行得穿（兩個圓）
  for (const s of [-0.9, 0.9]) {
    const lx = s, lz = 0.2;
    addCollider(QUEST_STALL.x + lx * Math.cos(ROT) + lz * Math.sin(ROT), QUEST_STALL.z - lx * Math.sin(ROT) + lz * Math.cos(ROT), 0.95);
  }
  return { g, echo, sign, notes, lanterns, ring, label };
}

// 👻🐕 Echo 嘅相（完成卡上面用）：用一個細 renderer 影一次，之後重用
let echoPic = null;
function echoPicture() {
  if (echoPic !== null) return echoPic;
  try {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(240, 200, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.setClearColor(0, 0);
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.4));
    const d = new THREE.DirectionalLight(0xffffff, 2);
    d.position.set(2, 4, -4);
    sc.add(d);
    const e = buildEcho();
    e.animate(0.5, null, 0.016, 0);
    e.g.rotation.y = 0.5;
    sc.add(e.g);
    const cam = new THREE.PerspectiveCamera(30, 240 / 200, 0.1, 50);
    cam.position.set(-1.1, 1.4, -2.6);
    cam.lookAt(0, 0.85, 0);
    r.render(sc, cam);
    echoPic = r.domElement.toDataURL();
    r.dispose();
    r.forceContextLoss();
  } catch {
    echoPic = '';
  }
  return echoPic;
}

// ======================== 📜 面板 ========================
const rewardChips = (r) => rewardList(r).map((x) => `<span class="eq-chip${x.big ? ' big' : ''}">${x.icon} ${x.text}</span>`).join('');
function panelHtml() {
  if (!isQuestlineOpen()) return `<p class="index-summary">${questlineLockText()}</p><p class="hint">🐾 Echo says: "Woof! I'm writing 10 quests for you. Come back on 24 October!"</p>`;
  const s = questlineToday();
  const rows = ECHO_QUESTS.map((q, i) => {
    const done = i < s.index || (i === s.index && s.claimed);
    const now = i === s.index && !s.claimed;
    const ready = now && s.progress >= q.target;
    const pct = now ? Math.min(100, (s.progress / q.target) * 100) : done ? 100 : 0;
    const state = done ? 'done' : ready ? 'ready' : now ? 'now' : 'locked';
    const right = done ? '<span class="eq-tick">✅</span>' : ready ? '<button data-eq="claim" class="eq-claim">🎁 Claim!</button>' : now ? `<span class="eq-count">${short(s.progress)} / ${short(q.target)}</span>` : '<span class="eq-tick">🔒</span>';
    return `<div class="eq-row eq-${state}">
      <div class="eq-num">${i + 1}</div>
      <div class="eq-main"><b>${q.emoji} ${q.text}</b>
        ${now || done ? `<div class="eq-bar"><div style="width:${pct}%"></div></div>` : ''}
        <div class="eq-chips">${rewardChips(q.reward)}</div></div>
      ${right}</div>`;
  }).join('');
  const all = s.claimed;
  const doneCount = s.index + (s.claimed ? 1 : 0);
  return `<p class="index-summary">🐾 Quest <b>${Math.min(10, doneCount + (all ? 0 : 1))} of 10</b> · ✅ ${doneCount} done today · 🌙 New quests in <b>${fmtLeft(msToMidnight())}</b></p>
    <div class="eq-list">${rows}</div>
    <p class="hint">👻🐕 Echo says: "${all ? 'WOOF WOOF! You did ALL 10! You are the best ghost hunter ever! See you tomorrow!' : questComplete() ? 'You did it! Take your prize, woof!' : 'Do one quest at a time. Each one is harder, but the prizes get BIGGER! Woof!'}"</p>`;
}

const CSS = `
.eq-list { display: flex; flex-direction: column; gap: 6px; }
.eq-row { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 12px; border: 2px solid #b2ebf2; background: #f5feff; }
.eq-num { flex: 0 0 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-weight: 900; font-size: 17px; color: #fff; background: #90a4ae; }
.eq-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; text-align: left; }
.eq-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.eq-chip { font-size: 12px; font-weight: 800; padding: 1px 7px; border-radius: 9px; background: rgba(0,131,143,0.12); color: #00525a; white-space: nowrap; }
.eq-chip.big { background: linear-gradient(90deg, #ff4081, #b388ff, #40c4ff); color: #fff; }
.eq-bar { height: 9px; border-radius: 5px; background: rgba(0,0,0,0.12); overflow: hidden; }
.eq-bar div { height: 100%; background: linear-gradient(90deg, #18ffff, #00bcd4); box-shadow: 0 0 8px #18ffff; }
.eq-count { font-size: 18px; font-weight: 900; color: #00838f; white-space: nowrap; }
.eq-tick { font-size: 22px; }
.eq-locked { opacity: 0.55; }
.eq-done { background: #e8f5e9; border-color: #a5d6a7; }
.eq-done .eq-num { background: #43a047; }
.eq-done .eq-bar div { background: #66bb6a; box-shadow: none; }
.eq-now, .eq-ready { border-color: #00bcd4; background: #e0f7fa; box-shadow: 0 0 14px rgba(0,188,212,0.45); }
.eq-now .eq-num, .eq-ready .eq-num { background: #00acc1; }
.eq-ready { border-color: #ffc400; background: #fff8e1; box-shadow: 0 0 16px rgba(255,196,0,0.6); }
.eq-claim { animation: eq-throb 0.6s ease-in-out infinite alternate; }
#eq-tracker { position: fixed; top: calc(100px + env(safe-area-inset-top, 0px)); left: 12px; z-index: 6; width: min(290px, calc(100vw - 24px)); padding: 9px 12px 10px; border-radius: 14px;
  background: linear-gradient(180deg, rgba(0,77,87,0.88), rgba(26,16,60,0.88)); border: 2px solid #4dd0e1; color: #fff; box-shadow: 0 0 16px rgba(24,255,255,0.35), 0 4px 0 rgba(0,0,0,0.3);
  font-family: 'Fredoka', 'Trebuchet MS', sans-serif; pointer-events: none; }
#eq-tracker .eqt-top { font-size: 12px; font-weight: 800; letter-spacing: 1px; color: #84ffff; display: flex; justify-content: space-between; }
#eq-tracker .eqt-text { font-size: 15px; font-weight: 700; margin: 3px 0 6px; line-height: 1.2; }
#eq-tracker .eqt-bar { height: 10px; border-radius: 5px; background: rgba(255,255,255,0.18); overflow: hidden; }
#eq-tracker .eqt-bar div { height: 100%; background: linear-gradient(90deg, #18ffff, #64ffda); box-shadow: 0 0 8px #18ffff; transition: width 0.4s; }
#eq-tracker .eqt-count { font-size: 12px; font-weight: 800; margin-top: 3px; text-align: right; color: #b2ebf2; }
#eq-tracker.ready { border-color: #ffd740; box-shadow: 0 0 20px rgba(255,215,64,0.7); animation: eq-glow 0.8s ease-in-out infinite alternate; }
#eq-tracker.ready .eqt-bar div { background: linear-gradient(90deg, #ffd740, #ffab00); box-shadow: 0 0 8px #ffd740; }
#eq-tracker.bump { animation: eq-bump 0.35s ease-out; }
#eq-done { position: fixed; left: 50%; top: 22%; z-index: 41; transform: translateX(-50%); width: min(420px, calc(100vw - 32px)); text-align: center; padding: 18px 18px 16px; border-radius: 22px;
  background: radial-gradient(circle at 50% 0%, #1de9b6 0%, #00838f 45%, #1a103c 100%); border: 3px solid #ffd740; color: #fff;
  box-shadow: 0 0 40px rgba(24,255,255,0.6), 0 8px 0 rgba(0,0,0,0.35); font-family: 'Fredoka', 'Trebuchet MS', sans-serif; overflow: visible; }
#eq-done.show { animation: eq-pop 0.6s cubic-bezier(.2,1.6,.4,1); }
#eq-done .eqd-kicker { font-size: 14px; font-weight: 900; letter-spacing: 3px; color: #84ffff; }
#eq-done .eqd-title { font-size: clamp(26px, 5vw, 40px); font-weight: 900; color: #ffd740; -webkit-text-stroke: 1.5px rgba(0,0,0,0.5); text-shadow: 0 4px 0 rgba(0,0,0,0.35), 0 0 22px #ffd740; line-height: 1.05; }
#eq-done .eqd-quest { margin: 6px 0 10px; font-size: 16px; font-weight: 700; }
#eq-done .eqd-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-bottom: 12px; }
#eq-done .eq-chip { font-size: 15px; padding: 3px 10px; background: rgba(255,255,255,0.18); color: #fff; border: 1px solid rgba(255,255,255,0.35); }
#eq-done .eq-chip.big { background: linear-gradient(90deg, #ff4081, #b388ff, #40c4ff); }
#eq-done button { font: 900 24px 'Fredoka', 'Trebuchet MS', sans-serif; color: #4e2a00; padding: 10px 34px; border-radius: 16px; border: 3px solid #fff3c4; cursor: pointer;
  background: linear-gradient(180deg, #ffe57f, #ffab00); box-shadow: 0 5px 0 #b26a00, 0 0 18px rgba(255,215,64,0.8); animation: eq-throb 0.6s ease-in-out infinite alternate; }
#eq-done .eqd-key { font-size: 12px; margin-top: 6px; opacity: 0.8; }
#eq-done { padding-top: 46px; }
#eq-done .eqd-dog { position: absolute; top: -64px; left: 50%; transform: translateX(-50%); width: 120px; height: 100px; font-size: 54px; filter: drop-shadow(0 0 12px #18ffff); animation: eq-float 1.4s ease-in-out infinite alternate; }
#eq-done .eqd-dog img { width: 100%; height: 100%; object-fit: contain; }
.eq-confetti { position: fixed; z-index: 42; pointer-events: none; font-size: 22px; animation: eq-fall var(--d) cubic-bezier(.2,.6,.4,1) forwards; }
@keyframes eq-pop { 0% { transform: translateX(-50%) scale(0.3); opacity: 0; } 100% { transform: translateX(-50%) scale(1); opacity: 1; } }
@keyframes eq-throb { from { transform: scale(1); } to { transform: scale(1.07); } }
@keyframes eq-glow { from { box-shadow: 0 0 10px rgba(255,215,64,0.5); } to { box-shadow: 0 0 26px rgba(255,215,64,0.95); } }
@keyframes eq-bump { 0% { transform: scale(1); } 40% { transform: scale(1.06); } 100% { transform: scale(1); } }
@keyframes eq-float { from { transform: translateX(-50%) translateY(0); } to { transform: translateX(-50%) translateY(-8px); } }
@keyframes eq-fall { 0% { transform: translate(0, 0) rotate(0); opacity: 1; } 100% { transform: translate(var(--x), var(--y)) rotate(var(--r)); opacity: 0; } }
`;

function ensureDom() {
  if ($('eq-tracker')) return;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const tr = document.createElement('div');
  tr.id = 'eq-tracker';
  tr.hidden = true;
  document.body.appendChild(tr);
  const done = document.createElement('div');
  done.id = 'eq-done';
  done.hidden = true;
  document.body.appendChild(done);
}

// 🎉 彩紙（由中間噴出嚟）
function confetti(n = 36) {
  const bits = ['🍬', '🌽', '✨', '👻', '🎃', '⭐', '🐾', '💜'];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'eq-confetti';
    el.textContent = bits[i % bits.length];
    el.style.left = `${50 + (Math.random() - 0.5) * 10}%`;
    el.style.top = '30%';
    const a = Math.random() * PI * 2;
    const r = 160 + Math.random() * 320;
    el.style.setProperty('--x', `${Math.cos(a) * r}px`);
    el.style.setProperty('--y', `${Math.sin(a) * r * 0.7 + 180}px`);
    el.style.setProperty('--r', `${(Math.random() - 0.5) * 720}deg`);
    el.style.setProperty('--d', `${1.2 + Math.random() * 0.9}s`);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }
}

// ======================== 主程式 ========================
export function createEchoQuests({ scene, openPanel, popup, announce }) {
  ensureDom();
  extraPanels.echoQuests = ["🐾 Echo's Questline", panelHtml, 'E'];
  const stall = buildStall(scene);
  const tracker = $('eq-tracker');
  const doneCard = $('eq-done');
  const local = new THREE.Vector3();
  const api = {};
  let excited = 0;
  let shownFor = null; // 已經彈過「做完」卡嘅任務（day:index）

  const refresh = () => {
    if (panelKind() === 'echoQuests') $('panel-body').innerHTML = panelHtml();
  };
  function showDone() {
    const s = questlineToday();
    const q = ECHO_QUESTS[s.index];
    shownFor = `${s.day}:${s.index}`;
    const pic = echoPicture();
    doneCard.innerHTML = `<div class="eqd-dog">${pic ? `<img src="${pic}" alt="Echo">` : '🐾'}</div>
      <div class="eqd-kicker">QUEST ${s.index + 1} OF 10</div>
      <div class="eqd-title">QUEST COMPLETE!</div>
      <div class="eqd-quest">${q.emoji} ${q.text}</div>
      <div class="eqd-chips">${rewardChips(q.reward)}</div>
      <button data-eq="claim">🎁 Claim!</button>
      <div class="eqd-key">or press <kbd>Enter</kbd></div>`;
    doneCard.hidden = false;
    doneCard.classList.remove('show');
    void doneCard.offsetWidth;
    doneCard.classList.add('show');
    confetti();
    play('crystal');
    setTimeout(() => play('rescue'), 300);
    excited = 3;
  }
  function claim() {
    const r = questline.claim();
    if (!r) return;
    doneCard.hidden = true;
    confetti(24);
    play('coin');
    setTimeout(() => play('upgrade'), 200);
    const s = questlineToday();
    const list = rewardList(r.reward).map((x) => `${x.icon} ${x.text}`).join(' · ');
    if (s.claimed) {
      announce('🏆 You finished ALL 10 of Echo\'s quests today! WOOF WOOF!');
      setTimeout(() => popup(`🎁 ${list}`), 1500);
    } else {
      popup(`🎁 ${list}`);
      setTimeout(() => popup(`🐾 Next quest: ${ECHO_QUESTS[s.index].emoji} ${ECHO_QUESTS[s.index].text}`), 1800);
    }
    if (r.indexReward) setTimeout(() => popup(`📖 New pet in your Index! +$${short(r.indexReward)}`), 3200);
    excited = 3;
    refresh();
  }
  api.claim = claim;
  doneCard.addEventListener('click', (e) => e.target.closest('button[data-eq="claim"]') && claim());
  $('panel-body').addEventListener('click', (e) => {
    if (panelKind() === 'echoQuests' && e.target.closest('button[data-eq="claim"]')) claim();
  });
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !doneCard.hidden && halloween.sky > 0.5) claim();
  });
  questline.onChange((kind) => {
    if (kind === 'progress') {
      tracker.classList.remove('bump');
      void tracker.offsetWidth;
      tracker.classList.add('bump');
    }
    if (kind !== 'claim') refresh();
  });

  let lastTracker = '';
  api.update = (dt, t, camPos) => {
    const show = halloween.sky > 0.02;
    stall.g.visible = show;
    const open = isQuestlineOpen();
    const s = open ? questlineToday() : null;
    const q = s && ECHO_QUESTS[s.index];
    const ready = !!s && questComplete();
    // 🎉 做完：彈卡（喺 Halloween 世界先彈；離開咗就收埋，返嚟再彈）
    const inside = halloween.sky > 0.5;
    if (ready && inside && shownFor !== `${s.day}:${s.index}`) showDone();
    if (!doneCard.hidden && (!ready || !inside)) {
      doneCard.hidden = true;
      if (!inside) shownFor = null;
    }
    // HUD 追蹤器（開咗面板就收埋；完成卡都暫時收埋）
    const panelOpen = !$('panel').hidden;
    doneCard.style.visibility = panelOpen ? 'hidden' : '';
    tracker.hidden = !open || !inside || panelOpen;
    if (!tracker.hidden) {
      const html = s.claimed
        ? `<div class="eqt-top"><span>🐾 ECHO'S QUESTLINE</span><span>10/10 ✅</span></div><div class="eqt-text">🏆 All 10 quests done today!</div><div class="eqt-count">New quests in ${fmtLeft(msToMidnight())}</div>`
        : `<div class="eqt-top"><span>🐾 ECHO'S QUEST</span><span>${s.index + 1} / 10</span></div>
           <div class="eqt-text">${q.emoji} ${q.text}</div>
           <div class="eqt-bar"><div style="width:${Math.min(100, (s.progress / q.target) * 100)}%"></div></div>
           <div class="eqt-count">${ready ? '✅ Done! Press Enter to claim 🎁' : `${short(s.progress)} / ${short(q.target)}`}</div>`;
      if (html !== lastTracker) {
        tracker.innerHTML = html;
        lastTracker = html;
      }
      tracker.classList.toggle('ready', ready);
    }
    if (!show) return;
    // 招牌 + 名牌
    if (open) stall.sign.draw(GHOST_THEME, [{ text: "🐾 ECHO'S QUESTLINE", size: 0.34 }, { text: s.claimed ? '🏆 All 10 done today! Come back tomorrow' : `Quest ${s.index + 1} of 10 · press E`, size: 0.2 }]);
    else stall.sign.draw(LOCK_THEME, [{ text: "🐾 ECHO'S QUESTLINE", size: 0.34 }, { text: questlineLockText(), size: 0.2 }]);
    stall.label.userData.setLines?.([{ text: "🐾 ECHO'S QUESTLINE", color: '#84ffff' }, { text: open ? (ready ? '🎁 Prize ready!' : s.claimed ? '🏆 10 / 10' : `Quest ${s.index + 1} / 10`) : questlineLockText(), color: '#ffd54f' }]);
    // 告示板：做完嘅紙變綠，而家嗰張發光
    stall.notes.forEach((m, i) => {
      const done = open && (i < s.index || (i === s.index && s.claimed));
      const now = open && i === s.index && !s.claimed;
      m.color.setHex(done ? 0xa5d6a7 : now ? 0xe0f7fa : 0xfff8e1);
      m.emissive.setHex(now ? (ready ? 0xffc400 : 0x18ffff) : 0x000000);
      m.emissiveIntensity = now ? 0.5 + Math.sin(t * 4) * 0.3 : 0;
    });
    const near = Math.hypot(camPos.x - QUEST_STALL.x, camPos.z - QUEST_STALL.z) < 12;
    local.copy(camPos);
    stall.echo.g.worldToLocal(local);
    excited = Math.max(0, excited - dt * 0.5);
    stall.echo.animate(t + 3.1, near ? local : null, dt, Math.min(1, excited + (ready ? 0.5 : 0)));
    stall.lanterns.forEach((l, i) => (l.rotation.z = Math.sin(t * 1.4 + i * 2) * 0.08));
    stall.ring.material.opacity = 0.4 + Math.sin(t * 3) * 0.2;
  };

  api.interaction = (pos) => {
    if (Math.hypot(pos.x - SPOT.x, pos.z - SPOT.z) > 2.6 && Math.hypot(pos.x - QUEST_STALL.x, pos.z - QUEST_STALL.z) > 2.8) return null;
    if (!isQuestlineOpen()) return { prompt: `🐾 Echo's Questline · ${questlineLockText()}` };
    return { prompt: `<kbd>E</kbd> 🐾 Echo's Questline: ${questComplete() ? 'claim your prize! 🎁' : 'see today\'s quests'}`, action: () => { excited = 2; play('boing'); openPanel(); } };
  };
  return api;
}
