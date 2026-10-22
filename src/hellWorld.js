// 🔥 Halloween World 2：Hell（小朋友 Issue #11）—— 地圖／數字喺 hellShape.js
// 「You can teleport to the Hell, which looks sick, and then you have to parkour the flying lava rocks to the Witch Castle,
//   and you can see a witch and a tower, so you ask the witch and the witch guides you to enter the tower.」
//
// 有咩：
// - 🌋 熔岩海（會流、會發光）、暗紅天、灰燼同火星（Points）、黑色尖石柱、大鐵鏈、火柱（間中噴火）
// - 🔥 Parkour：飛天熔岩石（hellShape.js 嘅 HELL_ROCKS）—— 會左右飄、上落浮、打圈轉、兜圈飛；企喺上面會載住你郁
// - 🚩 Checkpoint 0–5：跌落熔岩 → 火燒特效 + 返去上一個 Checkpoint（唔扣嘢）
// - 🏰 Witch Castle：庭園、🧙‍♀️ 女巫（大鍋 + 黑貓 + 對白泡泡）、🗼 Witch Tower（發光嘅門）
//
// main.js 用法：
//   const hell = await buildHell(scene, progress, { place, popup, announce, play, openWitch, goBack })
//   hell.update(dt, t, { pos, player, paused, quality })   // 要喺 updatePlayer 之後
//   hell.interaction(pos) → { prompt, action } | null
//   hell.arrive()                                           // 傳送咗入嚟（重設 Checkpoint）
//
// 🗼 Witch Tower 入面（下一位 helper 整）：
//   import { setWitchTowerEntry } from './hellWorld.js'; setWitchTowerEntry(() => { ... })
//   或者 window.__enterWitchTower = () => { ... }
//   未有就彈「🗼 The Witch Tower — coming next!」

import * as THREE from 'three';
import { addPlatform, platforms, addCollider, bakeStatic } from './world.js';
import { makeSign, makeLabel, THEMES } from './signs.js';
import { state, save } from './state.js';
import { extraPanels } from './hud.js';
import { M, GLOW, add, box, cyl, cone, ball, canvasTex, seeded, glowTex, lightPool, halo, tiledBox } from './halloweenArt.js';
import { B, S, pivot, bigEyes, smile, cone as kCone, cyl as kCyl, GLOW as KGLOW } from './echoPetModels.js';
import {
  HELL, LAVA_Y, LAVA_KILL, HELL_START, HELL_PORTAL, HELL_ROCKS, HELL_CHECKPOINTS, HELL_LAST_CP, rockAt, inHell,
  CASTLE_TOP, CASTLE_ISLAND, CASTLE_LANDING, KEEP, COURTYARD, CASTLE_GATE_Z, WITCH, CAULDRON, WITCH_CAT, TOWER, TOWER_DOOR, CASTLE_PORTAL, HELL_BLOCKS,
} from './hellShape.js';

const PI = Math.PI;
const HX = HELL.x;
const $ = (id) => document.getElementById(id);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

// 🗼 Witch Tower 入口（下一位 helper 用）
let towerEntry = null;
export function setWitchTowerEntry(fn) {
  towerEntry = fn;
}

// ======================== 紋理 ========================
const rgb = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
// 熔岩：發光橙黃底 + 一塊塊黑色硬殼（會流）
function lavaTex() {
  return canvasTex(256, (ctx, s) => {
    const rand = seeded(911);
    for (let y = 0; y < s; y += 4)
      for (let x = 0; x < s; x += 4) {
        const n = Math.sin(x * 0.05 + Math.sin(y * 0.04) * 2) * 0.5 + 0.5;
        ctx.fillStyle = rgb(255, 90 + n * 120 + rand() * 30, 10 + n * 40);
        ctx.fillRect(x, y, 4, 4);
      }
    // 黑色硬殼（四邊重複，接得順）
    for (let i = 0; i < 46; i++) {
      const cx = rand() * s, cy = rand() * s, r = 8 + rand() * 22;
      for (const ox of [-s, 0, s])
        for (const oy of [-s, 0, s]) {
          ctx.beginPath();
          const pts = 7;
          for (let k = 0; k <= pts; k++) {
            const a = (k / pts) * PI * 2;
            const rr = r * (0.65 + Math.sin(a * 3 + i) * 0.2 + 0.15);
            ctx.lineTo(cx + ox + Math.cos(a) * rr, cy + oy + Math.sin(a) * rr);
          }
          ctx.fillStyle = rgb(40 + rand() * 25, 12, 8, 0.88);
          ctx.fill();
          ctx.strokeStyle = rgb(255, 170, 40, 0.5);
          ctx.lineWidth = 2;
          ctx.stroke();
        }
    }
  }, { nearest: false });
}
// 熔岩上面一層流動嘅光（加法混合）
function flowTex() {
  return canvasTex(128, (ctx, s) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, s, s);
    const rand = seeded(77);
    for (let i = 0; i < 60; i++) {
      const x = rand() * s, y = rand() * s, w = 10 + rand() * 30;
      const g = ctx.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, 'rgba(255,200,80,0)');
      g.addColorStop(0.5, `rgba(255,${180 + rand() * 60},${60 + rand() * 60},0.9)`);
      g.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = g;
      for (const ox of [-s, 0, s]) ctx.fillRect(x + ox, y, w, 1.5 + rand() * 2);
    }
  }, { nearest: false });
}
// 黑色玄武岩 + 發光裂紋（石嘅側面／尖石柱）
function crackTex(glowy = true) {
  return canvasTex(128, (ctx, s) => {
    const rand = seeded(glowy ? 5 : 6);
    for (let y = 0; y < s; y += 4)
      for (let x = 0; x < s; x += 4) {
        const v = 18 + rand() * 16;
        ctx.fillStyle = rgb(v + 6, v, v);
        ctx.fillRect(x, y, 4, 4);
      }
    ctx.lineCap = 'round';
    for (let i = 0; i < (glowy ? 14 : 6); i++) {
      let x = rand() * s, y = rand() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (rand() - 0.5) * 30;
        y += rand() * 22;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = glowy ? rgb(255, 110 + rand() * 80, 20) : rgb(120, 40, 20, 0.6);
      ctx.lineWidth = glowy ? 2 + rand() * 2 : 1.5;
      ctx.stroke();
    }
  });
}
// 石面：深灰石板 + 少少發光縫
function topTex() {
  return canvasTex(64, (ctx, s) => {
    const rand = seeded(31);
    for (let y = 0; y < s; y += 2)
      for (let x = 0; x < s; x += 2) {
        const v = 44 + rand() * 18;
        ctx.fillStyle = rgb(v + 8, v - 4, v - 6);
        ctx.fillRect(x, y, 2, 2);
      }
    ctx.strokeStyle = 'rgba(255,120,40,0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      let x = rand() * s, y = rand() * s;
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) ctx.lineTo((x += (rand() - 0.5) * 20), (y += (rand() - 0.5) * 20));
      ctx.stroke();
    }
  });
}
// 城堡磚：深紫灰
function castleBrickTex(base = [58, 46, 66]) {
  return canvasTex(64, (ctx, s) => {
    const rand = seeded(base[0] * 7 + base[2]);
    ctx.fillStyle = rgb(base[0] * 0.5, base[1] * 0.5, base[2] * 0.5);
    ctx.fillRect(0, 0, s, s);
    for (let r = 0; r < 4; r++)
      for (let i = -1; i < 3; i++) {
        const x = i * 32 + (r % 2) * 16;
        const c = (rand() - 0.5) * 18;
        for (let yy = 0; yy < 14; yy += 2)
          for (let xx = 0; xx < 30; xx += 2) {
            const l = c + (rand() - 0.5) * 8 + (yy < 2 ? 8 : yy > 10 ? -6 : 0);
            ctx.fillStyle = rgb(base[0] + l, base[1] + l, base[2] + l);
            ctx.fillRect(x + 1 + xx, r * 16 + 1 + yy, 2, 2);
          }
      }
  });
}
// 傳送門漩渦
function swirlTex(c1, c2) {
  return canvasTex(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.3, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    for (let a = 0; a < 5; a++) {
      ctx.beginPath();
      for (let k = 0; k < 60; k++) {
        const t = k / 60;
        const ang = a * (PI * 2 / 5) + t * 5;
        ctx.lineTo(s / 2 + Math.cos(ang) * t * s * 0.5, s / 2 + Math.sin(ang) * t * s * 0.5);
      }
      ctx.stroke();
    }
  }, { nearest: false, wrap: false });
}
// 圓點（灰燼／火星）
function dotTex() {
  return canvasTex(32, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }, { nearest: false, wrap: false });
}
// 火焰柱漸變（底黃、頂紅、透明）
function flameTex() {
  return canvasTex(64, (ctx, s) => {
    const g = ctx.createLinearGradient(0, s, 0, 0);
    g.addColorStop(0, 'rgba(255,240,160,1)');
    g.addColorStop(0.35, 'rgba(255,150,30,0.95)');
    g.addColorStop(0.75, 'rgba(230,40,10,0.6)');
    g.addColorStop(1, 'rgba(120,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }, { nearest: false, wrap: false });
}

// 尖石：圓錐，頂點亂咗少少（有棱角）
function jaggedCone(r, h, sides, seed) {
  const g = new THREE.ConeGeometry(r, h, sides, 3);
  const rand = seeded(seed);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > h / 2 - 0.01) continue; // 尖頂唔郁
    const k = 0.75 + rand() * 0.5;
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
    p.setY(i, y + (rand() - 0.5) * h * 0.06);
  }
  g.computeVertexNormals();
  return g;
}

// ======================== 🧙‍♀️ 女巫（方塊風、可愛少少恐怖）========================
function buildWitch(parent) {
  const g = pivot(parent, WITCH.x, CASTLE_TOP, WITCH.z);
  g.rotation.y = PI; // 面向 +z（模型面向 -z）
  const robe = 0x4a148c, robeD = 0x2a0a52, skin = 0xb9f6ca, hair = 0x7e57c2;
  const body = pivot(g, 0, 0, 0);
  // 長袍（上窄下闊）
  kCyl(body, 0.42, 0.72, 1.3, robe, 0, 0.65, 0, { roughness: 0.6 }, 8);
  B(body, 0.78, 0.12, 0.6, 0xffb300, 0, 1.0, 0, KGLOW(0xffb300, 0.3), { r: 0.3 }); // 金色腰帶
  B(body, 0.22, 0.2, 0.06, 0xffe082, 0, 1.0, -0.31, KGLOW(0xffe082, 0.6), { r: 0.2 }); // 帶扣
  for (const s of [-1, 1]) S(body, 0.16, 0.08, 0.16, 0x1a0a2e, s * 0.2, 0.05, -0.32, {}, { lo: true }); // 尖頭鞋
  // 頭
  const head = pivot(body, 0, 1.62, 0);
  B(head, 0.62, 0.56, 0.56, skin, 0, 0, 0, {}, { line: 0.04, r: 0.3 });
  bigEyes(head, 0.14, 0.04, -0.27, 0.1, 0xff9100, { glow: true, glowI: 0.8 });
  smile(head, 0, -0.14, -0.28, 0.09, 0x2a1220);
  for (const s of [-1, 1]) S(head, 0.06, 0.04, 0.02, 0xff80ab, s * 0.21, -0.1, -0.28, {}, { lo: true }); // 面紅紅
  const nose = kCone(head, 0.05, 0.16, skin, 0, -0.02, -0.34, {}, 6);
  nose.rotation.x = -PI / 2;
  S(head, 0.03, 0.03, 0.03, 0x4caf50, 0.04, -0.05, -0.4, {}, { lo: true }); // 鼻上粒疣（可愛版）
  // 頭髮（兩邊垂落）
  for (const s of [-1, 1]) B(head, 0.14, 0.62, 0.5, hair, s * 0.34, -0.12, 0.04, {}, { r: 0.4 });
  B(head, 0.7, 0.18, 0.2, hair, 0, 0.22, 0.24, {}, { r: 0.4 });
  // 尖帽（彎少少）
  const hat = pivot(head, 0, 0.3, 0);
  kCyl(hat, 0.62, 0.62, 0.05, robeD, 0, 0, 0, {}, 20);
  kCyl(hat, 0.36, 0.38, 0.14, 0xff6d00, 0, 0.08, 0, KGLOW(0xff6d00, 0.5), 16); // 橙色帽帶
  const tip1 = pivot(hat, 0, 0.1, 0);
  kCone(tip1, 0.36, 0.7, robeD, 0, 0.35, 0, {}, 12);
  const tip2 = pivot(tip1, 0, 0.62, 0);
  tip2.rotation.x = 0.5;
  kCone(tip2, 0.16, 0.42, robeD, 0, 0.16, 0, {}, 10);
  S(tip2, 0.06, 0.06, 0.06, 0xffeb3b, 0, 0.38, 0, KGLOW(0xffeb3b, 1.5), { lo: true }); // 帽尖星星
  // 手（一隻揸住攪拌棍）
  const armL = pivot(body, -0.48, 1.25, 0);
  B(armL, 0.2, 0.62, 0.2, robe, 0, -0.26, 0, {}, { r: 0.4 });
  S(armL, 0.1, 0.1, 0.1, skin, 0, -0.6, 0, {}, { lo: true });
  const armR = pivot(body, 0.48, 1.25, 0);
  B(armR, 0.2, 0.62, 0.2, robe, 0, -0.26, 0, {}, { r: 0.4 });
  S(armR, 0.1, 0.1, 0.1, skin, 0, -0.6, 0, {}, { lo: true });
  armR.rotation.x = -0.9;
  const stick = kCyl(armR, 0.035, 0.035, 1.5, 0x5d4037, 0, -0.75, -0.25, {}, 6);
  stick.rotation.x = 0.5;
  // 掃把（挨住後面）
  const broom = pivot(g, 0.85, 0, 0.45);
  broom.rotation.z = -0.25;
  kCyl(broom, 0.04, 0.04, 2.0, 0x6d4c41, 0, 1.0, 0, {}, 6);
  kCone(broom, 0.22, 0.6, 0xc9a24a, 0, 0.25, 0, {}, 10).rotation.x = PI;
  // 對白泡泡
  const bubble = makeLabel([{ text: 'Psst! Over here! 🧙‍♀️', color: '#ffe082' }], 1.1);
  bubble.position.set(0, 3.2, 0);
  g.add(bubble);
  return {
    g, bubble,
    animate(t, talking) {
      body.position.y = Math.abs(Math.sin(t * 1.6)) * 0.05;
      head.rotation.z = Math.sin(t * 1.1) * 0.08;
      hat.rotation.z = Math.sin(t * 1.3 + 1) * 0.06;
      armR.rotation.z = Math.sin(t * 2.4) * 0.35; // 攪大鍋
      armL.rotation.x = talking ? -1.2 + Math.sin(t * 6) * 0.3 : Math.sin(t * 0.9) * 0.1;
      bubble.position.y = 3.2 + Math.sin(t * 2) * 0.08;
    },
  };
}
// 🐈‍⬛ 黑貓（黃色發光眼、條尾搖下搖下）
function buildCat(parent) {
  const g = pivot(parent, WITCH_CAT.x, CASTLE_TOP, WITCH_CAT.z);
  g.rotation.y = PI - 0.5;
  const fur = 0x1b1424;
  B(g, 0.42, 0.34, 0.62, fur, 0, 0.3, 0.05, {}, { line: 0.05, r: 0.4 });
  const head = pivot(g, 0, 0.62, -0.28);
  B(head, 0.4, 0.34, 0.34, fur, 0, 0, 0, {}, { line: 0.05, r: 0.4 });
  for (const s of [-1, 1]) {
    const e = kCone(head, 0.08, 0.16, fur, s * 0.13, 0.22, 0, {}, 4);
    e.rotation.y = PI / 4;
    S(head, 0.05, 0.06, 0.02, 0xffea00, s * 0.09, 0.03, -0.17, KGLOW(0xffea00, 2), { lo: true });
  }
  S(head, 0.03, 0.025, 0.02, 0xff80ab, 0, -0.04, -0.18, {}, { lo: true });
  for (const [x, z] of [[-0.13, -0.18], [0.13, -0.18], [-0.13, 0.25], [0.13, 0.25]]) B(g, 0.1, 0.16, 0.1, fur, x, 0.08, z, {}, { r: 0.4 });
  const tail = pivot(g, 0, 0.36, 0.36);
  kCyl(tail, 0.04, 0.05, 0.7, fur, 0, 0.32, 0, {}, 6);
  return {
    g,
    animate(t) {
      tail.rotation.z = Math.sin(t * 2.2) * 0.5;
      tail.rotation.x = -0.4 + Math.sin(t * 1.3) * 0.15;
      head.rotation.y = Math.sin(t * 0.7) * 0.4;
    },
  };
}
// 🫕 大鍋（綠色泡泡）
function buildCauldron(parent) {
  const g = pivot(parent, CAULDRON.x, CASTLE_TOP, CAULDRON.z);
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12, 0, PI * 2, PI * 0.25, PI * 0.75), M(0x1c1a22, { metalness: 0.6, roughness: 0.45, side: THREE.DoubleSide }));
  pot.position.y = 0.85;
  pot.castShadow = true;
  g.add(pot);
  add(g, new THREE.TorusGeometry(0.62, 0.08, 8, 24), M(0x2a2733, { metalness: 0.6, roughness: 0.4 }), 0, 1.45, 0).rotation.x = PI / 2;
  const brew = add(g, new THREE.CircleGeometry(0.6, 24), GLOW(0x76ff03, 1.6), 0, 1.36, 0, false);
  brew.rotation.x = -PI / 2;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    add(g, box(0.14, 0.4, 0.14), M(0x1c1a22), Math.cos(a) * 0.55, 0.15, Math.sin(a) * 0.55);
  }
  // 柴火
  for (let i = 0; i < 4; i++) add(g, cyl(0.08, 0.08, 1, 6), M(0x4e342e), 0, 0.12, 0).rotation.set(PI / 2, (i / 4) * PI, 0);
  const fire = add(g, cone(0.4, 0.7, 8), new THREE.MeshBasicMaterial({ color: 0xff8f00, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.35, 0, false);
  halo(g, 0, 1.6, 0, 1.6, 0x76ff03, 0.35);
  const bubbles = [];
  for (let i = 0; i < 6; i++) {
    const b = add(g, ball(0.09, 8, 6), GLOW(0xb2ff59, 1.8), 0, 1.4, 0, false);
    bubbles.push(b);
  }
  return {
    g,
    animate(t) {
      bubbles.forEach((b, i) => {
        const p = (t * 0.8 + i / 6) % 1;
        const a = i * 2.4;
        b.position.set(Math.cos(a) * 0.3 * (1 - p * 0.3), 1.4 + p * 1.1, Math.sin(a) * 0.3);
        b.scale.setScalar(p < 0.85 ? 0.6 + p : (1 - p) * 8);
      });
      fire.scale.set(1, 0.85 + Math.sin(t * 13) * 0.15, 1);
      brew.material.emissiveIntensity = 1.4 + Math.sin(t * 3) * 0.3;
    },
  };
}

// ======================== 💬 對白面板 ========================
const WITCH_LINES = [
  'Hehehe! A brave little ranger made it across the flying lava rocks! 🔥',
  'Welcome to my Witch Castle! This is my cat. She says "meow". 🐈‍⬛',
  'See that tall dark tower? That is my <b>Witch Tower</b>. 🗼',
  'It goes up, and up, and UP... and it is full of spooky trouble! 👻',
  'Only a real hero can climb it. I think that hero is YOU! ⭐',
  'Follow the glowing path out of the east side of my courtyard. The tower door will open for you! ✨',
];
let witchStep = 0;
function witchHtml() {
  const last = witchStep >= WITCH_LINES.length - 1;
  return `<div class="witch-talk">
    <div class="witch-face">🧙‍♀️<span>🐈‍⬛</span></div>
    <div class="witch-bubble">${WITCH_LINES[witchStep]}</div>
    <div class="witch-dots">${WITCH_LINES.map((_, i) => `<i class="${i <= witchStep ? 'on' : ''}"></i>`).join('')}</div>
    <div class="pet-actions">${last ? '<button data-witch="done" class="sell">✨ Show me the tower!</button>' : '<button data-witch="next">Next ▶</button>'}</div>
  </div>`;
}
const CSS = `
.witch-talk { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 6px 4px 2px; }
.witch-face { font-size: 64px; line-height: 1; filter: drop-shadow(0 0 14px rgba(178, 255, 89, 0.6)); position: relative; }
.witch-face span { font-size: 30px; position: absolute; right: -30px; bottom: -2px; }
.witch-bubble { position: relative; background: #f3e5f5; color: #2a0a3a; border: 3px solid #7b1fa2; border-radius: 18px; padding: 14px 18px; font-size: 18px; line-height: 1.4; max-width: 460px; text-align: center; animation: witch-pop 0.25s ease-out; }
.witch-bubble::before { content: ''; position: absolute; top: -12px; left: 50%; margin-left: -10px; border: 10px solid transparent; border-top: 0; border-bottom-color: #7b1fa2; }
.witch-dots { display: flex; gap: 6px; }
.witch-dots i { width: 10px; height: 10px; border-radius: 50%; background: #ccc; }
.witch-dots i.on { background: #8e24aa; }
@keyframes witch-pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
#hell-burn { position: fixed; inset: 0; pointer-events: none; z-index: 60; opacity: 0;
  background: radial-gradient(circle at 50% 120%, rgba(255,235,59,0.95) 0%, rgba(255,109,0,0.9) 30%, rgba(213,0,0,0.75) 60%, rgba(60,0,0,0.6) 100%); }
#hell-burn.show { animation: hell-burn 1.3s ease-out forwards; }
#hell-burn .hb-flames { position: absolute; left: 0; right: 0; bottom: -10px; text-align: center; font-size: 90px; letter-spacing: -20px; white-space: nowrap; overflow: hidden; }
#hell-burn .hb-text { position: absolute; left: 50%; top: 40%; transform: translate(-50%, -50%); color: #fff; font: 900 clamp(26px, 5vw, 54px) 'Fredoka', system-ui, sans-serif; text-shadow: 0 4px 0 #7f0000, 0 0 30px #ff3d00; white-space: nowrap; }
@keyframes hell-burn { 0% { opacity: 0; } 12% { opacity: 1; } 55% { opacity: 1; } 100% { opacity: 0; } }
#hell-burn.show .hb-flames { animation: hell-flames 1.3s ease-out forwards; }
@keyframes hell-flames { from { transform: translateY(40px) scaleY(0.6); } 40% { transform: translateY(-30px) scaleY(1.2); } to { transform: translateY(80px) scaleY(0.4); } }
#hell-cp { position: fixed; bottom: 232px; left: 50%; transform: translateX(-50%); z-index: 40; pointer-events: none; background: rgba(40, 4, 4, 0.78); color: #ffe0b2; border: 2px solid #ff7043; border-radius: 999px; padding: 6px 16px; font: 700 15px 'Fredoka', system-ui, sans-serif; display: flex; gap: 6px; align-items: center; }
#hell-cp b { color: #fff; }
#hell-cp i { width: 14px; height: 14px; border-radius: 50%; background: #5d1a12; border: 2px solid #ff8a65; display: inline-block; }
#hell-cp i.on { background: #76ff03; border-color: #ccff90; box-shadow: 0 0 8px #76ff03; }
`;
function ensureDom() {
  if ($('hell-burn')) return;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const burn = document.createElement('div');
  burn.id = 'hell-burn';
  burn.innerHTML = '<div class="hb-flames">🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥</div><div class="hb-text"></div>';
  document.body.appendChild(burn);
  const cp = document.createElement('div');
  cp.id = 'hell-cp';
  cp.hidden = true;
  document.body.appendChild(cp);
}

// ======================== 起成個 Hell ========================
export async function buildHell(scene, progress = () => {}, ctx = {}) {
  ensureDom();
  const { place, popup = () => {}, announce = () => {}, play = () => {}, openWitch = () => {}, closeWitch = () => {}, goBack = () => {} } = ctx;
  extraPanels.witch = ['🧙‍♀️ The Witch', witchHtml, 'E'];
  const root = new THREE.Group(); // 成個 Hell（唔喺 Hell 就收埋）
  scene.add(root);
  const live = new THREE.Group(); // 會郁嘅嘢
  root.add(live);
  const rand = seeded(2026);
  const steps = [];
  const bake = (fn) => steps.push(() => {
    const r = new THREE.Group();
    fn(r);
    bakeStatic(r, root);
  });

  // ---- 材質 ----
  const lavaMap = lavaTex();
  lavaMap.repeat.set(70, 70);
  const lavaMat = new THREE.MeshStandardMaterial({ map: lavaMap, emissive: 0xffffff, emissiveMap: lavaMap, emissiveIntensity: 1.05, roughness: 0.55 });
  const flowMap = flowTex();
  flowMap.repeat.set(40, 40);
  const flowMat = new THREE.MeshBasicMaterial({ map: flowMap, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const crackMap = crackTex(true);
  const sideMat = M(0xffffff, { map: crackMap, emissive: 0xff5a1a, emissiveMap: crackMap, emissiveIntensity: 1.3 });
  const spireMap = crackTex(true);
  spireMap.repeat.set(2, 4);
  const spireMat = M(0xffffff, { map: spireMap, emissive: 0xff4a10, emissiveMap: spireMap, emissiveIntensity: 0.9, roughness: 0.95 });
  const rockTop = topTex();
  const topMat = M(0xffffff, { map: rockTop, emissive: 0xff6a20, emissiveMap: rockTop, emissiveIntensity: 0.35 });
  const brick = castleBrickTex();
  const brickMat = M(0xffffff, { map: brick });
  const brickDark = castleBrickTex([40, 32, 48]);
  const brickDarkMat = M(0xffffff, { map: brickDark });
  const roofMat = M(0x4a148c, { roughness: 0.7 });
  const windowMat = GLOW(0xffa040, 2.2);
  const purpleGlow = GLOW(0xd500f9, 2);
  const flame = flameTex();
  const flameMat = new THREE.MeshBasicMaterial({ map: flame, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  // ---- 🌋 熔岩海 ----
  steps.push(() => {
    const lava = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), lavaMat);
    lava.rotation.x = -PI / 2;
    lava.position.set(HX, LAVA_Y, -80);
    root.add(lava);
    const flow = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), flowMat);
    flow.rotation.x = -PI / 2;
    flow.position.set(HX, LAVA_Y + 0.04, -80);
    flow.renderOrder = 1;
    root.add(flow);
  });

  // ---- 🔥 飛天熔岩石（Parkour）----
  const rocks = []; // { rock, group, plat, cp }
  const checkpoints = []; // { cp, flag, flameM, banner, label }
  steps.push(() => {
    for (const rock of HELL_ROCKS) {
      const g = new THREE.Group();
      g.position.set(rock.x, rock.top, rock.z);
      if (rock.shape === 'circle') {
        const sides = rock.island ? 14 : 10;
        add(g, cyl(rock.r, rock.r * 0.92, 0.9, sides), topMat, 0, -0.45, 0);
        const depth = rock.island ? rock.top + 2 : 2.4 + rock.r * 0.5;
        const under = add(g, jaggedCone(rock.r * 0.95, depth, sides, (rock.z * 13) | 0), sideMat, 0, -0.9 - depth / 2, 0);
        under.rotation.x = PI;
      } else {
        add(g, tiledBox(rock.w, 0.9, rock.d, 1.6), topMat, 0, -0.45, 0);
        const r = Math.max(rock.w, rock.d) * 0.62;
        const depth = 2.2 + r * 0.6;
        const under = add(g, jaggedCone(r, depth, 5, (rock.z * 17) | 0), sideMat, 0, -0.9 - depth / 2, 0);
        under.rotation.x = PI;
        under.rotation.y = PI / 4;
      }
      // 底下滴緊嘅熔岩光
      halo(g, 0, -2.4, 0, rock.island ? 6 : 2.4, 0xff5a1a, 0.45);
      let plat;
      if (rock.shape === 'circle') plat = addPlatform({ cx: rock.x, cz: rock.z, r: rock.r, minX: rock.x - rock.r, maxX: rock.x + rock.r, minZ: rock.z - rock.r, maxZ: rock.z + rock.r }, rock.top);
      else plat = addPlatform({ minX: rock.x - rock.w / 2, maxX: rock.x + rock.w / 2, minZ: rock.z - rock.d / 2, maxZ: rock.z + rock.d / 2 }, rock.top);
      if (rock.move) live.add(g);
      else root.add(g);
      rocks.push({ rock, g, plat, last: { x: rock.x, z: rock.z, top: rock.top, angle: 0 } });
      // 🚩 Checkpoint 旗 + 火盆
      if (rock.cp != null && rock.cp > 0) {
        checkpoints.push(makeCheckpoint(rock.x + (rock.r - 1.2) * 0.7, rock.top, rock.z + (rock.r - 1.2) * 0.7, rock.cp));
      }
    }
    // 城堡著陸台嘅 Checkpoint 5
    const L = CASTLE_LANDING;
    checkpoints.push(makeCheckpoint(L.maxX - 0.8, CASTLE_TOP, L.maxZ - 0.8, HELL_LAST_CP));
  });
  function makeCheckpoint(x, y, z, cp) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    live.add(g);
    add(g, cyl(0.07, 0.07, 3.2, 6), M(0x2b2b2b, { metalness: 0.6 }), 0, 1.6, 0);
    const bannerM = new THREE.MeshStandardMaterial({ color: 0x5d4037, emissive: 0x000000, side: THREE.DoubleSide, roughness: 0.8 });
    const banner = add(g, new THREE.PlaneGeometry(1.2, 0.75), bannerM, 0.62, 2.75, 0, false);
    add(g, cyl(0.38, 0.22, 0.32, 8), M(0x2b2b2b, { metalness: 0.6 }), 0, 0.16, 0);
    const fl = add(g, cone(0.28, 0.75, 8), new THREE.MeshBasicMaterial({ color: 0x76ff03, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.68, 0, false);
    fl.visible = false;
    const label = makeLabel([{ text: `🚩 CHECKPOINT ${cp}`, color: '#ffccbc' }], 0.9);
    label.position.set(0, 3.8, 0);
    g.add(label);
    return { cp, g, banner, bannerM, fl, label, lit: false };
  }

  // ---- ⭕ 到埗石島：傳送門 + 歡迎牌 ----
  const portals = [];
  function buildPortal(parent, x, y, z, ry, text) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    parent.add(g);
    for (const s of [-1, 1]) {
      const p = add(g, jaggedCone(0.9, 6.5, 5, s > 0 ? 3 : 4), spireMat, s * 2.4, 3.25, 0);
      p.rotation.z = s * 0.06;
    }
    add(g, tiledBox(6, 0.8, 1, 1.5), brickDarkMat, 0, 5.8, 0);
    const swirlM = new THREE.MeshBasicMaterial({ map: swirlTex('#ff9e40', '#6a0080'), transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false });
    const disc = add(g, new THREE.CircleGeometry(2, 40), swirlM, 0, 3, 0, false);
    halo(g, 0, 3, 0, 3.4, 0xff6d00, 0.35);
    const sign = makeSign([{ text, size: 0.3 }], 4, 0.7, THEMES.purple);
    sign.position.set(0, 6.8, 0.1);
    g.add(sign);
    portals.push({ disc, x, z });
    return g;
  }
  bake((r) => {
    lightPool(r, HELL_START.x, HELL_START.z, 9, 0xff6d00, 0.25, HELL_START.top + 0.05);
    // 一圈尖石（邊）
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2 + 0.2;
      if (Math.abs(Math.atan2(Math.sin(a + PI / 2), Math.cos(a + PI / 2))) < 0.5) continue; // 北面（-z）留路出去跳
      if (Math.abs(Math.atan2(Math.sin(a - PI / 2), Math.cos(a - PI / 2))) < 0.4) continue; // 南面係傳送門
      const x = HELL_START.x + Math.cos(a) * (HELL_START.r - 1.2), z = HELL_START.z + Math.sin(a) * (HELL_START.r - 1.2);
      const h = 2 + rand() * 3;
      add(r, jaggedCone(0.7 + rand() * 0.4, h, 5, i + 40), spireMat, x, HELL_START.top + h / 2, z);
      addCollider(x, z, 0.8);
    }
  });
  steps.push(() => {
    buildPortal(root, HELL_PORTAL.x, HELL_START.top, HELL_PORTAL.z, PI, '🌀 Back to Halloween World');
    for (const s of [-1, 1]) addCollider(HELL_PORTAL.x + s * 2.4, HELL_PORTAL.z, 0.9);
    const welcome = makeSign([{ text: '🔥 WELCOME TO HELL 🔥', size: 0.36 }, { text: 'Jump across the flying lava rocks to the Witch Castle!', size: 0.17 }, { text: '🚩 Checkpoints save you if you fall', size: 0.15 }], 5.6, 1.9, THEMES.red);
    welcome.position.set(HELL_START.x + 5.5, HELL_START.top + 2.6, HELL_START.z - 6);
    welcome.rotation.y = -0.5;
    root.add(welcome);
    for (const s of [-1, 1]) add(root, box(0.2, 3.2, 0.2), M(0x1a1a1a), welcome.position.x + Math.cos(-0.5) * s * 2.6, HELL_START.top + 1.6, welcome.position.z - Math.sin(-0.5) * s * 2.6);
  });

  // ---- 🗻 黑色尖石柱 + ⛓️ 大鐵鏈 ----
  const spires = [];
  bake((r) => {
    const onPath = (x, z, m) => (Math.abs(x - HX) < 14 + m && z < 58 && z > -142) || (x > CASTLE_ISLAND.minX - 8 - m && x < CASTLE_ISLAND.maxX + 8 + m && z > CASTLE_ISLAND.minZ - 8 - m && z < CASTLE_ISLAND.maxZ + 8 + m);
    let tries = 0;
    while (spires.length < 46 && tries++ < 800) {
      const x = HX + (rand() - 0.5) * 300, z = -90 + (rand() - 0.5) * 360;
      const rad = 2.5 + rand() * 5;
      if (onPath(x, z, rad)) continue;
      if (spires.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + rad + 6)) continue;
      const h = 14 + rand() * 42;
      add(r, jaggedCone(rad, h, 6, spires.length + 100), spireMat, x, h / 2 - 1, z);
      for (let k = 0; k < 3; k++) { // 腳邊細尖石
        const a = rand() * PI * 2, d = rad + rand() * 2;
        const hh = h * (0.18 + rand() * 0.25);
        add(r, jaggedCone(rad * 0.4, hh, 5, spires.length * 3 + k), spireMat, x + Math.cos(a) * d, hh / 2 - 0.5, z + Math.sin(a) * d);
      }
      halo(r, x, 1, z, rad * 2, 0xff3d00, 0.3);
      spires.push({ x, z, r: rad, h });
    }
  });
  steps.push(() => {
    // 鐵鏈：由尖石頂拉去城堡島／另一條尖石（垂低）
    const linkGeo = new THREE.TorusGeometry(0.42, 0.11, 6, 10);
    const pts = [];
    const chain = (a, b, sag) => {
      const len = a.distanceTo(b);
      const n = Math.floor(len / 0.7);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = a.clone().lerp(b, t);
        p.y -= Math.sin(t * PI) * sag;
        const q = a.clone().lerp(b, Math.min(1, t + 0.01));
        q.y -= Math.sin(Math.min(1, t + 0.01) * PI) * sag;
        pts.push([p, q.sub(p).normalize(), i % 2]);
      }
    };
    const near = (x, z) => spires.slice().sort((s, u) => Math.hypot(s.x - x, s.z - z) - Math.hypot(u.x - x, u.z - z))[0];
    const I = CASTLE_ISLAND;
    for (const [cx, cz] of [[I.minX + 2, I.minZ + 4], [I.maxX - 2, I.minZ + 4], [I.minX + 2, I.maxZ - 3], [I.maxX - 2, I.maxZ - 3]]) {
      const s = near(cx, cz);
      if (s) chain(new THREE.Vector3(cx, CASTLE_TOP - 1, cz), new THREE.Vector3(s.x, s.h * 0.75, s.z), 6);
    }
    for (let i = 0; i < 6; i++) { // 跨過條 parkour 路頂嘅鏈（好有氣勢）
      const z = 30 - i * 30;
      const l = spires.filter((s) => s.x < HX && s.h > 25).sort((s, u) => Math.abs(s.z - z) - Math.abs(u.z - z))[0];
      const rr = spires.filter((s) => s.x > HX && s.h > 25).sort((s, u) => Math.abs(s.z - z) - Math.abs(u.z - z))[0];
      if (l && rr) chain(new THREE.Vector3(l.x, l.h * 0.7, l.z), new THREE.Vector3(rr.x, rr.h * 0.7, rr.z), 8 + rand() * 6);
    }
    const im = new THREE.InstancedMesh(linkGeo, M(0x3a3438, { metalness: 0.8, roughness: 0.45 }), pts.length);
    const o = new THREE.Object3D();
    const up = new THREE.Vector3(0, 0, 1);
    pts.forEach(([p, dir, odd], i) => {
      o.position.copy(p);
      o.quaternion.setFromUnitVectors(up, dir);
      o.rotateZ(odd ? PI / 2 : 0);
      o.rotateX(PI / 2);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
    });
    im.castShadow = false;
    im.computeBoundingSphere();
    root.add(im);
  });

  // ---- 🔥 火柱（噴火泉）----
  const geysers = [];
  steps.push(() => {
    const spots = [];
    for (let z = 30; z > -140; z -= 14) for (const s of [-1, 1]) if (rand() < 0.75) spots.push([HX + s * (9 + rand() * 7), z + (rand() - 0.5) * 8]);
    for (const [x, z] of spots) {
      const g = new THREE.Group();
      g.position.set(x, LAVA_Y, z);
      live.add(g);
      const ring = add(g, new THREE.RingGeometry(0.6, 1.6, 20), new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.06, 0, false);
      ring.rotation.x = -PI / 2;
      add(g, jaggedCone(2, 1.4, 7, (x * 3) | 0), spireMat, 0, 0.3, 0);
      const col = add(g, new THREE.CylinderGeometry(0.5, 1.3, 1, 10, 1, true), flameMat, 0, 0.5, 0, false);
      const core = add(g, new THREE.CylinderGeometry(0.2, 0.6, 1, 8, 1, true), flameMat, 0, 0.5, 0, false);
      col.visible = core.visible = false;
      geysers.push({ g, ring, col, core, next: 1 + rand() * 6, t: -1, h: 9 + rand() * 7 });
    }
  });

  // ---- 🏰 城堡島 + 城堡 ----
  addPlatform(CASTLE_ISLAND, CASTLE_TOP); // 企得上去
  addPlatform(CASTLE_LANDING, CASTLE_TOP);
  bake((r) => {
    const I = CASTLE_ISLAND;
    const cx = (I.minX + I.maxX) / 2, cz = (I.minZ + I.maxZ) / 2, w = I.maxX - I.minX, d = I.maxZ - I.minZ;
    add(r, tiledBox(w, 1.2, d, 3), topMat, cx, CASTLE_TOP - 0.6, cz);
    const under = add(r, jaggedCone(1, 1, 9, 77), sideMat, cx, CASTLE_TOP - 1.2 - 14, cz);
    under.rotation.x = PI;
    under.scale.set(w * 0.62, 28, d * 0.62);
    const L = CASTLE_LANDING;
    add(r, tiledBox(L.maxX - L.minX, 1.2, L.maxZ - L.minZ, 1.6), topMat, (L.minX + L.maxX) / 2, CASTLE_TOP - 0.6, (L.minZ + L.maxZ) / 2);
    const lu = add(r, jaggedCone(4, 7, 5, 88), sideMat, (L.minX + L.maxX) / 2, CASTLE_TOP - 1.2 - 3.5, (L.minZ + L.maxZ) / 2 + 0.5);
    lu.rotation.x = PI;
    // 庭園地板
    const C = COURTYARD;
    add(r, tiledBox(C.maxX - C.minX, 0.1, C.maxZ - C.minZ, 2.5), M(0xffffff, { map: castleBrickTex([70, 56, 64]) }), (C.minX + C.maxX) / 2, CASTLE_TOP + 0.05, (C.minZ + C.maxZ) / 2, false);
    // 去 Witch Tower 嘅小路（石板）
    for (let x = C.maxX - 2; x < TOWER_DOOR.x; x += 2.2) add(r, tiledBox(1.8, 0.1, 2.6, 1.8), M(0xffffff, { map: castleBrickTex([70, 56, 64]) }), x, CASTLE_TOP + 0.05, TOWER.z, false);
    // ---- 城堡主樓 ----
    const K = KEEP;
    const kx = (K.minX + K.maxX) / 2, kz = (K.minZ + K.maxZ) / 2, kw = K.maxX - K.minX, kd = K.maxZ - K.minZ;
    const kh = 16;
    add(r, tiledBox(kw, kh, kd, 2), brickMat, kx, CASTLE_TOP + kh / 2, kz);
    for (let x = K.minX + 0.8; x <= K.maxX - 0.8; x += 2) { // 城垛
      add(r, box(1.1, 1.2, 1), brickMat, x, CASTLE_TOP + kh + 0.6, K.maxZ - 0.5);
      add(r, box(1.1, 1.2, 1), brickMat, x, CASTLE_TOP + kh + 0.6, K.minZ + 0.5);
    }
    // 中間大塔
    add(r, tiledBox(12, 14, 10, 2), brickDarkMat, kx, CASTLE_TOP + kh + 7, kz - 1);
    add(r, cone(9.5, 12, 4), roofMat, kx, CASTLE_TOP + kh + 20, kz - 1).rotation.y = PI / 4;
    add(r, box(0.3, 4, 0.3), purpleGlow, kx, CASTLE_TOP + kh + 27.5, kz - 1);
    // 4 個角樓
    for (const [x, z] of [[K.minX, K.minZ], [K.maxX, K.minZ], [K.minX, K.maxZ], [K.maxX, K.maxZ]]) {
      add(r, cyl(3.2, 3.6, 26, 10), brickDarkMat, x, CASTLE_TOP + 13, z);
      add(r, cone(4.4, 10, 10), roofMat, x, CASTLE_TOP + 31, z);
      for (let y = 6; y < 24; y += 5) add(r, box(0.6, 1.6, 0.3), windowMat, x, CASTLE_TOP + y, z + 3.4);
    }
    // 正門（大拱門，發紫光）+ 窗（橙光）
    add(r, box(6.4, 8.6, 0.6), brickDarkMat, kx, CASTLE_TOP + 4.3, K.maxZ + 0.2);
    add(r, box(4.6, 6.6, 0.3), GLOW(0x7b1fa2, 1.4), kx, CASTLE_TOP + 3.3, K.maxZ + 0.5, false);
    add(r, cyl(2.3, 2.3, 0.32, 16, ), GLOW(0x7b1fa2, 1.4), kx, CASTLE_TOP + 6.6, K.maxZ + 0.5, false).rotation.x = PI / 2;
    for (const x of [-12, -7, 7, 12]) for (const y of [4, 10]) {
      add(r, box(1.4, 2.4, 0.3), windowMat, kx + x, CASTLE_TOP + y, K.maxZ + 0.1, false);
      add(r, cone(0.7, 0.8, 4), windowMat, kx + x, CASTLE_TOP + y + 1.6, K.maxZ + 0.1, false).rotation.y = PI / 4;
    }
    // ---- 城牆 + 閘樓 ----
    for (const b of HELL_BLOCKS.slice(1)) {
      const bw = b.maxX - b.minX, bd = b.maxZ - b.minZ;
      add(r, tiledBox(bw, 5, bd, 2), brickMat, (b.minX + b.maxX) / 2, CASTLE_TOP + 2.5, (b.minZ + b.maxZ) / 2);
      const long = bw > bd;
      const n = Math.floor((long ? bw : bd) / 2);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = long ? b.minX + bw * t : (b.minX + b.maxX) / 2;
        const z = long ? (b.minZ + b.maxZ) / 2 : b.minZ + bd * t;
        if (i % 2 === 0) add(r, box(long ? 1 : 2.2, 1, long ? 2.2 : 1), brickMat, x, CASTLE_TOP + 5.5, z);
      }
    }
    for (const s of [-1, 1]) {
      const x = HX + s * 6.5;
      add(r, cyl(2.4, 2.7, 11, 8), brickDarkMat, x, CASTLE_TOP + 5.5, CASTLE_GATE_Z);
      add(r, cone(3.2, 6, 8), roofMat, x, CASTLE_TOP + 14, CASTLE_GATE_Z);
      addCollider(x, CASTLE_GATE_Z, 2.7);
    }
    add(r, tiledBox(11, 2, 2.4, 2), brickDarkMat, HX, CASTLE_TOP + 7.4, CASTLE_GATE_Z); // 閘門頂
    for (let x = -4; x <= 4; x += 0.8) add(r, box(0.14, 1.6, 0.14), M(0x2b2b2b, { metalness: 0.7 }), HX + x, CASTLE_TOP + 5.6, CASTLE_GATE_Z); // 吊起咗嘅鐵閘
    // 庭園：4 個綠火盆、南瓜燈
    for (const [x, z] of [[C.minX + 3, C.maxZ - 3], [C.maxX - 3, C.maxZ - 3], [C.minX + 3, C.minZ + 3], [C.maxX - 3, C.minZ + 3]]) {
      add(r, cyl(0.25, 0.35, 1.4, 8), M(0x2b2b2b, { metalness: 0.6 }), x, CASTLE_TOP + 0.7, z);
      add(r, cyl(0.7, 0.4, 0.5, 8), M(0x2b2b2b, { metalness: 0.6 }), x, CASTLE_TOP + 1.6, z);
      halo(r, x, CASTLE_TOP + 2.4, z, 2.2, 0x76ff03, 0.45);
      lightPool(r, x, z, 4, 0x76ff03, 0.3, CASTLE_TOP + 0.12);
      addCollider(x, z, 0.8);
    }
    lightPool(r, CAULDRON.x, CAULDRON.z, 5, 0x76ff03, 0.35, CASTLE_TOP + 0.12);
    // 🗼 Witch Tower
    const T = TOWER;
    add(r, cyl(T.r - 0.6, T.r, T.h, 14), brickDarkMat, T.x, CASTLE_TOP + T.h / 2, T.z);
    for (let y = 14; y < T.h; y += 16) add(r, new THREE.TorusGeometry(T.r - 0.2, 0.5, 6, 20), brickMat, T.x, CASTLE_TOP + y, T.z).rotation.x = PI / 2;
    for (let i = 0; i < 18; i++) { // 螺旋窗（紫光）
      const a = i * 1.1 + 0.4, y = 8 + i * 3.1;
      const rr = T.r - 0.45;
      const wnd = add(r, box(0.9, 1.6, 0.4), purpleGlow, T.x + Math.cos(a) * rr, CASTLE_TOP + y, T.z + Math.sin(a) * rr, false);
      wnd.rotation.y = -a + PI / 2;
    }
    // 門框（向西）
    add(r, box(1.2, 7.2, 5), brickMat, TOWER_DOOR.x + 0.3, CASTLE_TOP + 3.6, T.z);
  });
  // 塔頂（歪咗嘅尖帽）+ 會郁嘅嘢
  let towerOrb = null, towerDoor = null, runes = [], pathStones = [];
  steps.push(() => {
    const T = TOWER;
    const roof = new THREE.Group();
    roof.position.set(T.x, CASTLE_TOP + T.h, T.z);
    root.add(roof);
    add(roof, cyl(T.r + 2, T.r + 2, 0.6, 16), roofMat, 0, 0, 0);
    add(roof, cone(T.r + 1.2, 12, 14), roofMat, 0, 6, 0);
    const tipG = new THREE.Group();
    tipG.position.set(0, 11.5, 0);
    tipG.rotation.z = 0.5;
    roof.add(tipG);
    add(tipG, cone(2.4, 7, 12), roofMat, 0, 3, 0);
    towerOrb = add(tipG, ball(0.9, 14, 10), GLOW(0xea80fc, 3), 0, 7, 0, false);
    halo(tipG, 0, 7, 0, 5, 0xd500f9, 0.5);
    // 發光門（紫色漩渦）
    const doorM = new THREE.MeshBasicMaterial({ map: swirlTex('#e040fb', '#1a0033'), transparent: true, depthWrite: false, side: THREE.DoubleSide });
    towerDoor = add(root, new THREE.PlaneGeometry(3, 5), doorM, TOWER_DOOR.x - 0.32, CASTLE_TOP + 2.5, T.z, false);
    towerDoor.rotation.y = -PI / 2;
    halo(root, TOWER_DOOR.x - 0.6, CASTLE_TOP + 2.6, T.z, 3.4, 0xd500f9, 0.45);
    const sign = makeSign([{ text: '🗼 THE WITCH TOWER', size: 0.34 }, { text: 'Ask the Witch to open the door', size: 0.18 }], 4.6, 1.1, THEMES.purple);
    sign.position.set(TOWER_DOOR.x - 0.75, CASTLE_TOP + 6.2, T.z);
    sign.rotation.y = -PI / 2;
    root.add(sign);
    // 浮住嘅符文（圍住座塔轉）
    const runeM = new THREE.MeshBasicMaterial({ color: 0xea80fc, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 10; i++) {
      const m = add(live, new THREE.RingGeometry(0.5, 0.75, 5), runeM, T.x, CASTLE_TOP + 10 + i * 5, T.z, false);
      runes.push({ m, a: i * 0.7, y: 10 + i * 5 });
    }
    // ✨ 發光小路（女巫 → 塔門）：傾完偈先亮
    const pathM = new THREE.MeshBasicMaterial({ color: 0xea80fc, map: glowTex(), transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false });
    const from = new THREE.Vector2(WITCH.x + 2, WITCH.z + 1.5);
    const mid = new THREE.Vector2(COURTYARD.maxX - 3, TOWER.z);
    const to = new THREE.Vector2(TOWER_DOOR.x - 1.4, TOWER.z);
    const pts = [];
    for (let t = 0; t <= 1; t += 0.07) pts.push(from.clone().lerp(mid, t));
    for (let t = 0.1; t <= 1; t += 0.2) pts.push(mid.clone().lerp(to, t));
    pts.forEach((p, i) => {
      const m = add(live, geoPlane(), pathM.clone(), p.x, CASTLE_TOP + 0.14, p.y, false);
      m.scale.setScalar(1.1);
      pathStones.push({ m, i });
    });
    // 城堡嗰邊嘅傳送門
    buildPortal(root, CASTLE_PORTAL.x, CASTLE_TOP, CASTLE_PORTAL.z, PI / 2, '🌀 Back to Halloween World');
    for (const s of [-1, 1]) addCollider(CASTLE_PORTAL.x, CASTLE_PORTAL.z + s * 2.4, 0.9);
    // 城堡門口指示牌
    const csign = makeSign([{ text: '🏰 WITCH CASTLE', size: 0.36 }, { text: '🧙‍♀️ The Witch is waiting inside!', size: 0.18 }], 5, 1.2, THEMES.purple);
    csign.position.set(HX, CASTLE_TOP + 9.6, CASTLE_GATE_Z + 1.3);
    root.add(csign);
  });
  const _plane = { g: null };
  function geoPlane() {
    if (!_plane.g) _plane.g = new THREE.PlaneGeometry(2, 2).rotateX(-PI / 2);
    return _plane.g;
  }

  // ---- 🧙‍♀️ 女巫、貓、大鍋 ----
  let witch = null, cat = null, cauldron = null;
  steps.push(() => {
    witch = buildWitch(live);
    cat = buildCat(live);
    cauldron = buildCauldron(live);
    addCollider(WITCH.x, WITCH.z, 0.7);
    addCollider(CAULDRON.x, CAULDRON.z, 1.0);
    addCollider(WITCH_CAT.x, WITCH_CAT.z, 0.4);
  });

  // ---- 灰燼 + 火星（跟住鏡頭）----
  let ash = null, embers = null;
  const ASH_N = 700, EMBER_N = 420, BOX = 90;
  steps.push(() => {
    const dot = dotTex();
    const mk = (n, color, size, blending) => {
      const pos = new Float32Array(n * 3);
      const base = new Float32Array(n * 4); // x, y, z, speed
      for (let i = 0; i < n; i++) {
        base.set([rand() * BOX, rand() * 40, rand() * BOX, 0.5 + rand()], i * 4);
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geom, new THREE.PointsMaterial({ color, size, map: dot, transparent: true, depthWrite: false, blending, opacity: 0.9 }));
      pts.frustumCulled = false;
      live.add(pts);
      return { pts, base, n };
    };
    ash = mk(ASH_N, 0x9e9e9e, 0.28, THREE.NormalBlending);
    embers = mk(EMBER_N, 0xff8a3d, 0.35, THREE.AdditiveBlending);
  });

  // 一步步起
  for (let i = 0; i < steps.length; i++) {
    steps[i]();
    progress((i + 1) / steps.length);
    await nextFrame();
  }

  // ======================== 狀態 + 每格更新 ========================
  const cpHud = $('hell-cp');
  const burnEl = $('hell-burn');
  let reached = 0; // 去到第幾個 Checkpoint
  let safe = 0; // 啱啱重生：一陣唔會再燒
  let bubbleI = 0, bubbleT = 0;
  let talking = 0;
  let rockT = 0; // 石嘅時間（暫停嗰陣唔行）
  const wrapNear = (v, c, size) => c - size / 2 + ((((v - (c - size / 2)) % size) + size) % size);

  function lightCheckpoint(c, on) {
    c.lit = on;
    c.bannerM.color.setHex(on ? 0x76ff03 : 0x5d4037);
    c.bannerM.emissive.setHex(on ? 0x64dd17 : 0x000000);
    c.bannerM.emissiveIntensity = on ? 0.8 : 0;
    c.fl.visible = on;
    c.label.userData.setLines?.([{ text: on ? `✅ CHECKPOINT ${c.cp}` : `🚩 CHECKPOINT ${c.cp}`, color: on ? '#ccff90' : '#ffccbc' }]);
  }
  function setReached(n) {
    reached = n;
    for (const c of checkpoints) lightCheckpoint(c, c.cp <= n);
  }
  function renderHud() {
    cpHud.innerHTML = `🚩 <b>Checkpoint ${reached}/${HELL_LAST_CP}</b> ${HELL_CHECKPOINTS.slice(1).map((c) => `<i class="${c.cp <= reached ? 'on' : ''}"></i>`).join('')}`;
  }
  function respawn() {
    const c = HELL_CHECKPOINTS[reached];
    place?.(c.x, c.top, c.z, 0);
    safe = 1.2;
  }
  function burn() {
    play('poof');
    play('ouch');
    burnEl.querySelector('.hb-text').textContent = reached ? `🔥 HOT HOT HOT! Back to Checkpoint ${reached}` : '🔥 HOT HOT HOT! Try again!';
    burnEl.classList.remove('show');
    void burnEl.offsetWidth;
    burnEl.classList.add('show');
    respawn();
    fireBurst();
  }
  // 重生嗰陣腳邊一圈火（燒完即散）
  const burst = [];
  function fireBurst() {
    const c = HELL_CHECKPOINTS[reached];
    for (let i = 0; i < 10; i++) {
      let b = burst[i];
      if (!b) {
        b = add(live, cone(0.35, 1.4, 6), flameMat, 0, 0, 0, false);
        burst[i] = b;
      }
      const a = (i / 10) * PI * 2;
      b.userData = { a, t: 0 };
      b.position.set(c.x + Math.cos(a) * 0.9, c.top + 0.6, c.z + Math.sin(a) * 0.9);
      b.visible = true;
    }
  }

  const api = {
    get checkpoint() { return reached; },
    get time() { return rockT; }, // 石嘅時間（rockAt(rock, hell.time) = 而家個位；測試用）
    setCheckpoint(n) { setReached(Math.max(0, Math.min(HELL_LAST_CP, n))); renderHud(); },
    respawn,
    arrive() {
      setReached(0);
      renderHud();
      safe = 1;
    },
    // 測試：直接跳去某個 Checkpoint
    goCheckpoint(n) {
      api.setCheckpoint(n);
      respawn();
    },
    get witchStep() { return witchStep; },
    update(dt, t, { pos, player, paused = false, quality = 3 } = {}) {
      const inside = inHell(pos.x, pos.z);
      root.visible = inside;
      cpHud.hidden = !inside || !$('panel').hidden;
      if (!inside) return;
      if (!paused) rockT += dt;
      // 熔岩流
      lavaMap.offset.x = t * 0.004;
      lavaMap.offset.y = t * 0.006;
      flowMap.offset.x = -t * 0.012;
      flowMap.offset.y = t * 0.02;
      lavaMat.emissiveIntensity = 0.98 + Math.sin(t * 0.9) * 0.12;
      // 🔥 會郁嘅石：搬 platform + 載住企喺上面嘅玩家
      const standing = player && player.grounded;
      for (const rk of rocks) {
        if (!rk.rock.move) continue;
        const now = rockAt(rk.rock, rockT);
        const prev = rk.last;
        const p = rk.plat;
        const onIt = standing && Math.abs(player.feetY - p.top) < 0.12 && (p.r ? (pos.x - p.cx) ** 2 + (pos.z - p.cz) ** 2 <= p.r * p.r : pos.x >= p.minX && pos.x <= p.maxX && pos.z >= p.minZ && pos.z <= p.maxZ);
        if (onIt && !paused) {
          let nx = pos.x + (now.x - prev.x), nz = pos.z + (now.z - prev.z);
          const da = now.angle - prev.angle;
          if (da) { // 跟住轉
            const ox = nx - now.x, oz = nz - now.z;
            const c = Math.cos(-da), s = Math.sin(-da);
            nx = now.x + ox * c - oz * s;
            nz = now.z + ox * s + oz * c;
          }
          const eye = pos.y - player.feetY;
          pos.x = nx;
          pos.z = nz;
          player.feetY = now.top;
          pos.y = now.top + eye;
        }
        if (p.r) {
          p.cx = now.x; p.cz = now.z;
          p.minX = now.x - p.r; p.maxX = now.x + p.r; p.minZ = now.z - p.r; p.maxZ = now.z + p.r;
        } else {
          const hw = rk.rock.w / 2, hd = rk.rock.d / 2;
          p.minX = now.x - hw; p.maxX = now.x + hw; p.minZ = now.z - hd; p.maxZ = now.z + hd;
        }
        p.top = now.top;
        rk.g.position.set(now.x, now.top, now.z);
        rk.g.rotation.y = now.angle;
        rk.last = now;
      }
      // 🚩 Checkpoint：企到上面就記住
      if (player && player.grounded) {
        for (const c of HELL_CHECKPOINTS) {
          if (c.cp <= reached) continue;
          const isLand = c.cp === HELL_LAST_CP;
          const L = CASTLE_LANDING;
          const on = isLand
            ? pos.x > CASTLE_ISLAND.minX && pos.x < CASTLE_ISLAND.maxX && pos.z > CASTLE_ISLAND.minZ && pos.z < L.maxZ && player.feetY > CASTLE_TOP - 0.2
            : Math.hypot(pos.x - c.x, pos.z - (HELL_ROCKS.find((r) => r.cp === c.cp).z)) < 4.6 && Math.abs(player.feetY - c.top) < 0.3;
          if (on) {
            setReached(c.cp);
            renderHud();
            play('ding');
            if (isLand) {
              announce('🏰 You made it to the WITCH CASTLE! 🎉');
              setTimeout(() => popup('🧙‍♀️ The Witch is in the courtyard. Go and say hi!'), 2200);
            } else popup(`🚩 Checkpoint ${c.cp} of ${HELL_LAST_CP}!`);
          }
        }
      }
      // 🔥 跌咗落熔岩
      safe = Math.max(0, safe - dt);
      if (player && !paused && safe <= 0 && player.feetY < LAVA_KILL) burn();
      // 重生火圈
      for (const b of burst) {
        if (!b.visible) continue;
        b.userData.t += dt;
        const k = b.userData.t / 0.9;
        if (k >= 1) { b.visible = false; continue; }
        b.scale.set(1 - k * 0.6, 1 + k, 1 - k * 0.6);
        b.position.y += dt * 1.5;
      }
      // 火柱
      for (const gy of geysers) {
        if (gy.t < 0) {
          gy.next -= dt;
          gy.ring.material.opacity = 0.35 + Math.sin(t * 6 + gy.h) * 0.2 + (gy.next < 1 ? (1 - gy.next) * 0.5 : 0); // 就噴之前光啲
          if (gy.next <= 0) {
            gy.t = 0;
            gy.col.visible = gy.core.visible = true;
            if (Math.hypot(pos.x - gy.g.position.x, pos.z - gy.g.position.z) < 30) play('swoosh');
          }
        } else {
          gy.t += dt;
          const k = gy.t / 1.8;
          const h = gy.h * (k < 0.2 ? k / 0.2 : k > 0.7 ? Math.max(0, 1 - (k - 0.7) / 0.3) : 1) * (0.9 + Math.sin(t * 25) * 0.1);
          gy.col.scale.set(1, Math.max(0.01, h), 1);
          gy.col.position.y = h / 2;
          gy.core.scale.set(1, Math.max(0.01, h * 1.1), 1);
          gy.core.position.y = h * 0.55;
          gy.col.rotation.y = t * 3;
          if (k >= 1) {
            gy.t = -1;
            gy.next = 3 + Math.random() * 5;
            gy.col.visible = gy.core.visible = false;
          }
        }
      }
      // 灰燼（慢慢跌落）+ 火星（由熔岩升上去）
      const showN = quality <= 1 ? 0.4 : 1;
      for (const [sys, dir] of [[ash, -1], [embers, 1]]) {
        const arr = sys.pts.geometry.attributes.position.array;
        const n = Math.floor(sys.n * showN);
        sys.pts.geometry.setDrawRange(0, n);
        for (let i = 0; i < n; i++) {
          const bx = sys.base[i * 4], by = sys.base[i * 4 + 1], bz = sys.base[i * 4 + 2], sp = sys.base[i * 4 + 3];
          const yy = ((by + dir * t * sp * (dir > 0 ? 2.2 : 0.9)) % 40 + 40) % 40;
          const sway = Math.sin(t * sp + i) * (dir > 0 ? 0.6 : 1.4);
          arr[i * 3] = wrapNear(bx + t * 0.8 + sway, pos.x, BOX);
          arr[i * 3 + 1] = (dir > 0 ? LAVA_Y : 0) + yy;
          arr[i * 3 + 2] = wrapNear(bz + sway * 0.5, pos.z, BOX);
        }
        sys.pts.geometry.attributes.position.needsUpdate = true;
      }
      embers.pts.material.opacity = 0.7 + Math.sin(t * 7) * 0.2;
      // 傳送門轉、塔頂光、符文
      for (const p of portals) p.disc.rotation.z = -t * 1.6;
      if (towerOrb) towerOrb.material.emissiveIntensity = 2.4 + Math.sin(t * 2) * 0.8;
      if (towerDoor) {
        towerDoor.rotation.x = 0;
        towerDoor.material.opacity = state.witchMet ? 0.85 + Math.sin(t * 4) * 0.15 : 0.35;
        towerDoor.material.map.rotation = t * 0.6;
        towerDoor.material.map.center.set(0.5, 0.5);
      }
      for (const r of runes) {
        const a = r.a + t * 0.5;
        r.m.position.set(TOWER.x + Math.cos(a) * (TOWER.r + 2.2), CASTLE_TOP + r.y + Math.sin(t + r.a) * 0.6, TOWER.z + Math.sin(a) * (TOWER.r + 2.2));
        r.m.lookAt(TOWER.x, r.m.position.y, TOWER.z);
      }
      for (const s of pathStones) s.m.material.opacity = state.witchMet ? 0.35 + Math.max(0, Math.sin(t * 4 - s.i * 0.5)) * 0.55 : 0.08;
      // 🧙‍♀️ 女巫：對白泡泡輪住換
      talking = Math.max(0, talking - dt);
      witch.animate(t, talking > 0);
      cat.animate(t);
      cauldron.animate(t);
      bubbleT -= dt;
      if (bubbleT <= 0) {
        bubbleT = 3.5;
        const lines = state.witchMet
          ? ['The tower is that way! ➡️🗼', 'Hehehe... good luck, hero! ⭐', 'Mind the lava, dearie! 🔥']
          : ['Psst! Over here! 🧙‍♀️', 'Hehehe... come closer! 🔮', 'I have a job for a hero! (E)'];
        witch.bubble.userData.setLines?.([{ text: lines[bubbleI++ % lines.length], color: '#ffe082' }]);
      }
    },
    interaction(p) {
      if (!inHell(p.x, p.z)) return null;
      const d = (a) => Math.hypot(p.x - a.x, p.z - a.z);
      if (d(HELL_PORTAL) < 3.4 || d(CASTLE_PORTAL) < 3.4) return { prompt: '<kbd>E</kbd> 🌀 Go back to the Halloween World', action: goBack };
      if (d(WITCH) < 3.6 || d(CAULDRON) < 3) return { prompt: `<kbd>E</kbd> 🧙‍♀️ Talk to the Witch${state.witchMet ? ' again' : ''}`, action: () => { witchStep = 0; talking = 2; play('magic'); openWitch(); } };
      if (d(TOWER_DOOR) < 3.2) {
        if (!state.witchMet) return { prompt: '🔒 The door is sealed by magic... talk to the Witch first! 🧙‍♀️' };
        return { prompt: '<kbd>E</kbd> 🗼 Enter the Witch Tower', action: enterTower };
      }
      return null;
    },
  };
  function enterTower() {
    play('portal');
    const fn = towerEntry || window.__enterWitchTower;
    if (typeof fn === 'function') return fn();
    announce('🗼 The Witch Tower — coming next!');
    setTimeout(() => popup('🧙‍♀️ "The tower is still getting ready... come back soon, hero!"'), 1800);
  }
  api.enterTower = enterTower;
  // 💬 對白掣
  $('panel-body').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-witch]');
    if (!b) return;
    if (b.dataset.witch === 'next') {
      witchStep = Math.min(WITCH_LINES.length - 1, witchStep + 1);
      talking = 2;
      play('blip');
      $('panel-body').innerHTML = witchHtml();
    } else if (b.dataset.witch === 'done') {
      const first = !state.witchMet;
      state.witchMet = true;
      save();
      closeWitch();
      play('magic');
      setTimeout(() => play('upgrade'), 300);
      announce(first ? '✨ The Witch Tower door is OPEN! Follow the glowing path! 🗼' : '✨ Follow the glowing path to the Witch Tower! 🗼');
    }
  });
  setReached(0);
  renderHud();
  return api;
}
