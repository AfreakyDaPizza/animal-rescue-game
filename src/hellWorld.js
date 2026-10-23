// 🔥 Halloween World 2：Hell（小朋友 Issue #11）—— 地圖／數字喺 hellShape.js
// 「You can teleport to the Hell, which looks sick, and then you have to parkour the flying lava rocks to the Witch Castle,
//   and you can see a witch and a tower, so you ask the witch and the witch guides you to enter the tower.」
//
// 有咩：
// - 🌋 熔岩海（會流、會發光）、暗紅天、灰燼同火星（Points）、黑色尖石柱、大鐵鏈、火柱（間中噴火）
// - 🔥 Parkour：飛天熔岩石（hellShape.js 嘅 HELL_ROCKS）—— 會左右飄、上落浮、打圈轉、兜圈飛；企喺上面會載住你郁
// - 🚩 Checkpoint 0–5：跌落熔岩 → 火燒特效 + 返去上一個 Checkpoint（唔扣嘢）
// - 🏰 Witch Castle：庭園、🧙‍♀️ 女巫（大鍋 + 黑貓 + 對白泡泡）、🗼 Witch Tower（發光嘅門）
//   城堡／塔嘅樣喺 witchCastle.js（Issue #12 重做）；呢度淨係女巫、傳送門、發光小路同玩法
// - Issue #14：女巫重做（buildWitch）、🌀 城堡正門 = 返 Halloween World 嘅傳送門（舊庭園傳送門刪咗）、
//   🌳 Skill Tree（skillTree.js）同 🛒 Castle Shop（castleShop.js）攤位
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
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { addPlatform, platforms, addCollider, bakeStatic } from './world.js';
import { makeSign, makeLabel, THEMES } from './signs.js';
import { state, save } from './state.js';
import { extraPanels } from './hud.js';
import { M, GLOW, add, box, cyl, cone, ball, canvasTex, seeded, glowTex, lightPool, halo, tiledBox } from './halloweenArt.js';
import { buildWitchCastle } from './witchCastle.js'; // 🏰 Witch Castle 嘅樣（Issue #12）
import { B, S, V as V3, pivot, bigEyes, smile, blinkAt, cached as kCached, add as kAdd, tube as kTube, torus as kTorus, cone as kCone, cyl as kCyl, GLOW as KGLOW } from './echoPetModels.js';
import {
  HELL, LAVA_Y, LAVA_KILL, HELL_START, HELL_PORTAL, HELL_ROCKS, HELL_CHECKPOINTS, HELL_LAST_CP, rockAt, inHell,
  CASTLE_TOP, CASTLE_ISLAND, CASTLE_LANDING, COURTYARD, WITCH, CAULDRON, WITCH_CAT, TOWER, TOWER_DOOR, CASTLE_PORTAL, CASTLE_GATE_Z,
  SKILL_TREE, CASTLE_SHOP,
} from './hellShape.js';
import { buildSkillTreeStall, createSkillTreePanel } from './skillTree.js'; // 🌳 Issue #14
import { buildCastleShopStall, createCastleShopPanel } from './castleShop.js'; // 🛒 Issue #14

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

// ======================== 🧙‍♀️ 女巫（Issue #14 重做：「The witch looks too ugly」）========================
// 可愛少少恐怖嘅方塊風女巫：大尖帽（金扣 + 星星 + 月亮）、長長紫色頭髮（會飄）、大眼 + 古惑笑、
// 兩層長袍 + 斗篷 + 腰包、間條襪 + 彎頭靴、發光魔杖、浮住嘅魔法書、閃粉
// 動畫：攪大鍋（平時）→ 揮手 → 笑到彈下彈下（hehehe!）；傾偈嗰陣一路揮手一路笑
function starGeo(r = 0.12, depth = 0.04) {
  return kCached(`wstar${r}|${depth}`, () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2 + PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * 0.3, bevelSize: depth * 0.3, bevelSegments: 1 });
    geo.translate(0, 0, -depth / 2);
    return geo;
  });
}
// 減 draw call：每個 pivot（Group）入面唔郁嘅 mesh 按材質焊埋（pivot 照郁）；userData.keep / 收埋咗嘅唔焊
function mergePivots(root) {
  const pivots = [];
  root.traverse((o) => { if (!o.isMesh && !o.isPoints && !o.isSprite) pivots.push(o); });
  for (const p of pivots) {
    const found = [];
    const walk = (o, m) => {
      for (const c of o.children) {
        if (!c.isMesh || c.userData.keep || !c.visible) continue;
        c.updateMatrix();
        const cm = m.clone().multiply(c.matrix);
        found.push([c, cm]);
        walk(c, cm);
      }
    };
    walk(p, new THREE.Matrix4());
    if (found.length < 2) continue;
    const buckets = new Map();
    for (const [c, m] of found) {
      const key = `${c.material.uuid}|${c.castShadow}`;
      if (!buckets.has(key)) buckets.set(key, { material: c.material, castShadow: c.castShadow, list: [] });
      const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      g.clearGroups();
      g.applyMatrix4(m);
      buckets.get(key).list.push(g);
    }
    if (!buckets.size || [...buckets.values()].some((b) => b.list.some((g) => !g.attributes.uv))) continue; // 安全：冇 uv 嘅唔理
    for (const [c] of found) c.removeFromParent();
    for (const { material, castShadow, list } of buckets.values()) {
      const mesh = new THREE.Mesh(list.length === 1 ? list[0] : mergeGeometries(list), material);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      p.add(mesh);
    }
  }
}
function buildWitch(parent) {
  const g = pivot(parent, WITCH.x, CASTLE_TOP, WITCH.z);
  g.rotation.y = PI; // 面向 +z（模型面向 -z）
  const robe = 0x5b1f9e, robeD = 0x2e0f57, robeL = 0x8e44d8, skin = 0x9ff0b4, hair = 0x7c4dff, hairD = 0x5530b8;
  const hatC = 0x24123f, gold = 0xffc94a, boot = 0x1c1030;
  const W = pivot(g, 0, 0, 0); // 成隻（笑嗰陣彈）
  W.scale.setScalar(1.12);
  // ---- 👢 彎頭靴 + 間條襪 ----
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = pivot(W, s * 0.2, 0, 0);
    legs.push(leg);
    B(leg, 0.26, 0.24, 0.42, boot, 0, 0.12, -0.06, {}, { line: 0.05, r: 0.35 });
    B(leg, 0.28, 0.08, 0.3, 0x3d2466, 0, 0.29, 0.02, {}, { r: 0.3 }); // 靴口
    const curl = kTorus(leg, 0.09, 0.035, boot, 0, 0.2, -0.32, {}, PI * 1.4);
    curl.rotation.set(0, PI / 2, PI * 0.15); // 彎彎靴頭
    S(leg, 0.04, 0.04, 0.04, gold, 0, 0.3, -0.38, KGLOW(gold, 0.8), { lo: true }); // 靴頭金波
    for (let i = 0; i < 4; i++) kCyl(leg, 0.095, 0.095, 0.075, i % 2 ? 0x1a1024 : 0x76ff03, 0, 0.37 + i * 0.075, 0.02, i % 2 ? {} : KGLOW(0x76ff03, 0.25), 10); // 間條襪
  }
  // ---- 👗 兩層長袍 ----
  const body = pivot(W, 0, 0, 0);
  kCyl(body, 0.42, 0.66, 0.75, robeD, 0, 0.88, 0, { roughness: 0.7 }, 12); // 底層
  for (let i = 0; i < 12; i++) { // 底層鋸齒裙邊
    const a = (i / 12) * PI * 2;
    kCone(body, 0.13, 0.22, robeD, Math.cos(a) * 0.6, 0.47, Math.sin(a) * 0.6, {}, 4).rotation.x = PI;
  }
  kCyl(body, 0.4, 0.58, 0.5, robe, 0, 1.08, 0, { roughness: 0.6 }, 12); // 上層（短啲）
  for (let i = 0; i < 10; i++) { // 上層彎彎邊
    const a = (i / 10) * PI * 2 + 0.3;
    S(body, 0.16, 0.08, 0.16, robe, Math.cos(a) * 0.55, 0.84, Math.sin(a) * 0.55, {}, { lo: true });
  }
  B(body, 0.74, 0.5, 0.56, robe, 0, 1.5, 0, {}, { line: 0.04, r: 0.35 }); // 上身
  B(body, 0.3, 0.42, 0.04, robeL, 0, 1.52, -0.29, {}, { r: 0.3 }); // 心口
  for (let i = 0; i < 3; i++) S(body, 0.035, 0.035, 0.02, gold, 0, 1.64 - i * 0.11, -0.32, KGLOW(gold, 0.6), { lo: true }); // 鈕
  // 腰帶 + 金扣 + 腰包 + 細藥水瓶
  B(body, 0.8, 0.12, 0.62, 0x3e2418, 0, 1.25, 0, {}, { r: 0.3 });
  B(body, 0.2, 0.17, 0.05, gold, 0, 1.25, -0.32, KGLOW(gold, 0.5), { r: 0.2 });
  B(body, 0.1, 0.08, 0.06, 0x3e2418, 0, 1.25, -0.33, {}, { r: 0.2 });
  for (const s of [-1, 1]) {
    B(body, 0.2, 0.22, 0.14, 0x6d4430, s * 0.36, 1.12, -0.2, {}, { line: 0.05, r: 0.3 }); // 腰包
    B(body, 0.21, 0.08, 0.15, 0x4e2f20, s * 0.36, 1.21, -0.2, {}, { r: 0.3 }); // 包蓋
    S(body, 0.025, 0.025, 0.02, gold, s * 0.36, 1.17, -0.28, {}, { lo: true });
  }
  const vial = pivot(body, 0.15, 1.15, -0.33);
  S(vial, 0.06, 0.07, 0.06, 0xff4fd8, 0, -0.05, 0, KGLOW(0xff4fd8, 1.2), { lo: true });
  kCyl(vial, 0.02, 0.02, 0.05, 0xd7ccc8, 0, 0.03, 0, {}, 6);
  // ---- 🦇 斗篷（後面，有高領）----
  const cape = pivot(body, 0, 1.72, 0.22);
  const capeIn = 0xc2185b;
  const capePieces = [];
  for (let i = 0; i < 3; i++) {
    const seg = pivot(i ? capePieces[i - 1] : cape, 0, i ? -0.48 : 0, 0);
    B(seg, 0.95 + i * 0.1, 0.5, 0.05, robeD, 0, -0.24, 0.03, {}, { r: 0.3 });
    B(seg, 0.9 + i * 0.1, 0.48, 0.02, capeIn, 0, -0.24, -0.01, KGLOW(capeIn, 0.15), { r: 0.3 });
    capePieces.push(seg);
  }
  for (let i = 0; i < 5; i++) kCone(capePieces[2], 0.11, 0.2, robeD, -0.46 + i * 0.23, -0.55, 0.03, {}, 4).rotation.x = PI; // 斗篷鋸齒
  for (const s of [-1, 1]) { // 高領（尖尖）
    const c = kCone(body, 0.15, 0.42, robeD, s * 0.3, 1.88, 0.12, {}, 4);
    c.rotation.set(-0.3, 0, -s * 0.45);
  }
  // ---- 🙋 手（大袖）----
  const arm = (s) => {
    const sh = pivot(body, s * 0.45, 1.66, 0);
    B(sh, 0.2, 0.42, 0.2, robe, 0, -0.2, 0, {}, { r: 0.4 });
    const fore = pivot(sh, 0, -0.4, 0);
    kCyl(fore, 0.1, 0.17, 0.32, robe, 0, -0.12, 0, {}, 10);
    kCyl(fore, 0.17, 0.19, 0.05, robeL, 0, -0.28, 0, {}, 10); // 袖口
    const hand = pivot(fore, 0, -0.36, 0);
    S(hand, 0.1, 0.1, 0.1, skin, 0, 0, 0, {}, { lo: true });
    return { sh, fore, hand };
  };
  const armL = arm(-1), armR = arm(1);
  // 右手：攪大鍋嘅大木羹
  const spoon = pivot(armR.hand, 0, 0, 0);
  kCyl(spoon, 0.03, 0.03, 1.5, 0x6d4c41, 0, -0.55, 0, {}, 6);
  S(spoon, 0.12, 0.05, 0.16, 0x6d4c41, 0, -1.3, 0, {}, { lo: true });
  // 左手邊：🔮 發光魔杖（企喺地，左手揸住；頂嘅水晶喺帽邊外面，唔會遮塊面）
  const staffMat = new THREE.MeshStandardMaterial({ color: 0xe1bee7, emissive: 0xd500f9, emissiveIntensity: 2.4, roughness: 0.15, flatShading: true });
  const staff = pivot(body, -1.02, 0, -0.12);
  kTube(staff, [V3(0, 0.02, 0), V3(0.04, 0.8, 0.02), V3(-0.03, 1.6, 0), V3(0.02, 2.45, 0), V3(-0.14, 2.68, 0), V3(-0.1, 2.86, 0)], 0.045, 0x5d4037, {}, 24);
  const orb = kAdd(staff, new THREE.OctahedronGeometry(0.17), 0, staffMat, 0, 2.7, 0);
  orb.scale.y = 1.4;
  orb.userData.keep = true;
  halo(staff, 0, 2.7, 0, 0.7, 0xd500f9, 0.5);
  for (let i = 0; i < 3; i++) S(staff, 0.035, 0.035, 0.035, 0x76ff03, Math.cos(i * 2.1) * 0.13, 2.45, Math.sin(i * 2.1) * 0.13, KGLOW(0x76ff03, 1.5), { lo: true });
  // ---- 🙂 頭 ----
  const neck = pivot(body, 0, 1.78, 0);
  const head = pivot(neck, 0, 0.36, 0);
  B(head, 0.78, 0.7, 0.68, skin, 0, 0, 0, KGLOW(0x2e7d32, 0.18), { line: 0.04, r: 0.34 });
  const eyes = bigEyes(head, 0.17, 0.02, -0.33, 0.13, 0xb388ff, { glow: true, glowI: 0.9, tilt: 0.2 });
  eyes.forEach((e, i) => { // 眼睫毛（外眼角）
    const s = i ? 1 : -1;
    for (let k = 0; k < 2; k++) {
      const l = B(e, 0.05, 0.015, 0.015, 0x1a0a2e, s * (0.13 + k * 0.02), 0.08 + k * 0.05, -0.02, {}, { r: 0.4 });
      l.rotation.z = s * (0.5 + k * 0.4);
    }
  });
  const brows = [-1, 1].map((s) => {
    const b = B(head, 0.16, 0.035, 0.03, hairD, s * 0.17, 0.2, -0.34, {}, { r: 0.4 });
    b.rotation.z = s * -0.2;
    b.userData.keep = true;
    return b;
  });
  const mouth = pivot(head, 0.03, -0.17, -0.345);
  mouth.rotation.z = -0.15; // 古惑笑：一邊高啲
  smile(mouth, 0, 0, 0, 0.1, 0x2a1220, {}, 2.4);
  const openMouth = S(mouth, 0.08, 0.05, 0.02, 0x5a1030, 0, -0.04, 0, {}, { lo: true });
  openMouth.userData.keep = true;
  S(mouth, 0.03, 0.02, 0.012, 0xffffff, -0.03, -0.01, -0.01, {}, { lo: true }); // 一隻尖牙仔
  for (const s of [-1, 1]) {
    S(head, 0.08, 0.045, 0.02, 0xff80ab, s * 0.26, -0.1, -0.335, KGLOW(0xff80ab, 0.25), { lo: true }); // 面紅紅
    for (let k = 0; k < 2; k++) S(head, 0.012, 0.012, 0.01, 0x4caf50, s * (0.22 + k * 0.05), -0.04 - k * 0.025, -0.345, {}, { lo: true }); // 雀斑
  }
  const nose = kCone(head, 0.05, 0.15, skin, 0, -0.06, -0.38, {}, 6);
  nose.rotation.x = -PI / 2 - 0.25;
  // ---- 💜 長頭髮（後面一條條會飄）----
  B(head, 0.84, 0.24, 0.72, hair, 0, 0.27, 0.02, {}, { r: 0.4 }); // 頭頂
  for (let i = 0; i < 3; i++) { // 瀏海
    const f = B(head, 0.28, 0.16, 0.08, hair, -0.26 + i * 0.26, 0.24, -0.34, {}, { r: 0.45 });
    f.rotation.z = (i - 1) * -0.25;
  }
  for (const s of [-1, 1]) B(head, 0.14, 0.5, 0.5, hair, s * 0.42, -0.1, 0.06, {}, { r: 0.45 }); // 兩邊
  const locks = [];
  for (let i = 0; i < 5; i++) {
    let p = pivot(head, -0.32 + i * 0.16, 0.1, 0.36);
    const chain = [p];
    for (let k = 0; k < 4; k++) {
      B(p, 0.17 - k * 0.012, 0.36, 0.12, k % 2 ? hairD : hair, 0, -0.17, 0, {}, { r: 0.45 });
      if (k < 3) {
        p = pivot(p, 0, -0.33, 0);
        chain.push(p);
      }
    }
    S(p, 0.08, 0.08, 0.08, hair, 0, -0.36, -0.04, {}, { lo: true }); // 髮尾捲
    locks.push({ chain, ph: i * 0.7 });
  }
  for (const s of [-1, 1]) { // 前面兩條長辮
    let p = pivot(head, s * 0.4, -0.3, -0.12);
    const chain = [p];
    for (let k = 0; k < 3; k++) {
      B(p, 0.12, 0.3, 0.12, k % 2 ? hairD : hair, 0, -0.14, 0, {}, { r: 0.45 });
      if (k < 2) {
        p = pivot(p, 0, -0.28, 0);
        chain.push(p);
      }
    }
    S(p, 0.08, 0.06, 0.08, 0x76ff03, 0, -0.3, 0, KGLOW(0x76ff03, 1), { lo: true }); // 髮夾
    locks.push({ chain, ph: s * 1.3, front: true });
  }
  // ---- 🎩 大尖帽（金扣 + 星星 + 月亮，帽尖彎）----
  const hat = pivot(head, 0, 0.36, 0);
  hat.rotation.set(0.05, 0, 0.08);
  kCyl(hat, 0.88, 0.92, 0.06, hatC, 0, 0, 0, {}, 28);
  kCyl(hat, 0.48, 0.52, 0.2, 0x7b1fa2, 0, 0.13, 0, KGLOW(0x7b1fa2, 0.2), 20); // 帽帶
  const buckle = pivot(hat, 0, 0.13, -0.5);
  buckle.rotation.x = 0.08;
  for (const [w, h, x, y] of [[0.26, 0.05, 0, 0.09], [0.26, 0.05, 0, -0.09], [0.05, 0.22, -0.11, 0], [0.05, 0.22, 0.11, 0]]) B(buckle, w, h, 0.04, gold, x, y, 0, KGLOW(gold, 0.7), { r: 0.3 });
  const t1 = pivot(hat, 0, 0.22, 0);
  kCone(t1, 0.48, 0.85, hatC, 0, 0.42, 0, {}, 18);
  const t2 = pivot(t1, 0, 0.72, 0);
  t2.rotation.x = 0.35;
  kCone(t2, 0.26, 0.6, hatC, 0, 0.22, 0, {}, 14);
  const t3 = pivot(t2, 0, 0.42, 0);
  t3.rotation.x = 0.7;
  kCone(t3, 0.13, 0.4, hatC, 0, 0.16, 0, {}, 10);
  const tipStar = pivot(t3, 0, 0.42, 0);
  kAdd(tipStar, starGeo(0.14, 0.05), 0xffeb3b, KGLOW(0xffeb3b, 2.2));
  for (const [x, y, z, r, rz] of [[-0.3, 0.4, -0.28, 0.08, 0.3], [0.22, 0.65, -0.24, 0.06, -0.2], [0.3, 0.25, -0.36, 0.05, 0.5], [-0.12, 0.85, -0.16, 0.05, 0]]) {
    const st = kAdd(t1, starGeo(r, 0.02), 0xffe082, KGLOW(0xffd54f, 1.8), x, y, z);
    st.rotation.set(-0.45, 0, rz);
  }
  const moon = kTorus(t1, 0.09, 0.03, 0xfff59d, -0.05, 0.2, -0.42, KGLOW(0xfff59d, 1.6), PI * 1.3);
  moon.rotation.set(-0.4, 0, 0.6);
  // ---- 📖 浮住嘅魔法書（右邊）----
  const book = pivot(W, 0.95, 1.55, -0.25);
  const pageGlow = new THREE.MeshStandardMaterial({ color: 0xf8f0ff, emissive: 0xb388ff, emissiveIntensity: 0.9, roughness: 0.6 });
  for (const s of [-1, 1]) {
    const c = pivot(book, 0, 0, 0);
    c.rotation.z = s * -0.18;
    B(c, 0.34, 0.03, 0.46, 0x6a1b9a, s * 0.17, 0, 0, {}, { r: 0.3 });
    kAdd(c, kCached('wpage', () => new THREE.BoxGeometry(0.3, 0.04, 0.42)), 0, pageGlow, s * 0.16, 0.03, 0);
    S(c, 0.04, 0.01, 0.04, gold, s * 0.3, -0.02, 0, KGLOW(gold, 0.6), { lo: true });
  }
  const flap = pivot(book, 0, 0.04, 0); // 自己揭嘅一頁
  kAdd(flap, kCached('wflap', () => new THREE.BoxGeometry(0.3, 0.01, 0.4).translate(0.15, 0, 0)), 0, pageGlow);
  const runeM = new THREE.MeshBasicMaterial({ color: 0xea80fc, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const runes = [];
  for (let i = 0; i < 4; i++) runes.push(kAdd(book, starGeo(0.035, 0.01), 0, runeM, 0, 0.1, 0));
  for (const r of runes) r.userData.keep = true;
  halo(book, 0, 0.1, 0, 0.8, 0xb388ff, 0.35);
  // ---- ✨ 閃粉（Points，圍住佢升上去）----
  const SP = 26;
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SP * 3), 3));
  const sparkles = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xf3c6ff, size: 0.16, map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparkles.frustumCulled = false;
  W.add(sparkles);
  const spRand = seeded(1414);
  const spBase = Array.from({ length: SP }, () => [spRand() * PI * 2, 0.6 + spRand() * 0.6, spRand(), 0.4 + spRand() * 0.5]);
  mergePivots(g); // 190 → 少好多 draw call
  // ---- 💬 對白泡泡 ----
  const bubble = makeLabel([{ text: 'Psst! Over here! 🧙‍♀️', color: '#ffe082' }], 1.1);
  bubble.position.set(0, 4.6, 0);
  g.add(bubble);
  // ---- 動畫 ----
  const lerp = (a, b, k) => a + (b - a) * k;
  let mode = 'stir', modeT = 0, wv = 0, lg = 0, st = 1;
  return {
    g, bubble,
    // 測試／影相：witch.pose('wave' | 'laugh' | 'stir')
    pose(m) { mode = m; modeT = -30; },
    animate(t, talking, dt = 1 / 60) {
      // 揀動作：平時攪 7 秒 → 揮手 2.5 秒 → 笑 2.5 秒；傾偈嗰陣揮手 + 笑
      modeT += dt;
      if (talking) mode = Math.sin(t * 1.4) > 0 ? 'laugh' : 'wave';
      else if (mode === 'stir' && modeT > 7) { mode = 'wave'; modeT = 0; }
      else if (mode === 'wave' && modeT > 2.5) { mode = 'laugh'; modeT = 0; }
      else if (mode === 'laugh' && modeT > 2.5) { mode = 'stir'; modeT = 0; }
      const k = Math.min(1, dt * 6);
      wv = lerp(wv, mode === 'wave' ? 1 : 0, k);
      lg = lerp(lg, mode === 'laugh' ? 1 : 0, k);
      st = lerp(st, mode === 'stir' ? 1 : 0, k);
      // 笑：成隻彈、頭向後、口開、帽震
      W.position.y = Math.abs(Math.sin(t * 1.6)) * 0.03 + Math.abs(Math.sin(t * 11)) * 0.09 * lg;
      body.rotation.x = -0.12 * lg + Math.sin(t * 1.1) * 0.02;
      head.rotation.set(-0.25 * lg + 0.05 * st, Math.sin(t * 0.7) * 0.15 * (1 - lg), Math.sin(t * 1.1) * 0.07 + Math.sin(t * 11) * 0.06 * lg);
      hat.rotation.z = 0.08 + Math.sin(t * 1.3 + 1) * 0.05 + Math.sin(t * 13) * 0.06 * lg;
      t2.rotation.z = Math.sin(t * 1.7) * 0.1;
      t3.rotation.z = Math.sin(t * 2.1 + 0.5) * 0.18;
      tipStar.rotation.y = t * 2;
      openMouth.scale.set(0.08, 0.05 + 0.05 * lg * (0.6 + Math.abs(Math.sin(t * 11)) * 0.4), 0.02);
      brows.forEach((b, i) => (b.position.y = 0.2 + 0.04 * lg + (i ? 0.03 * Math.max(0, Math.sin(t * 0.9)) : 0))); // 一邊眉揚起（古惑）
      const blink = blinkAt(t, 3);
      for (const e of eyes) e.scale.y = blink * (1 - 0.35 * lg); // 笑到眯埋眼
      // 右手：攪大鍋（羹仔畫圈）／揮手
      const sa = t * 2.4;
      armR.sh.rotation.set(lerp(0.85 + Math.sin(sa) * 0.15, 2.75, wv), 0, lerp(0.2 + Math.cos(sa) * 0.18, 0.3, wv));
      armR.fore.rotation.set(lerp(0.3, 0.15, wv), 0, lerp(0, Math.sin(t * 10) * 0.6, wv));
      spoon.rotation.set(-1.15 - Math.sin(sa) * 0.15, 0, 0); // 羹垂直插落鍋
      spoon.visible = wv < 0.6;
      // 左手：揸住魔杖；笑嗰陣舉高
      armL.sh.rotation.set(0.25 + 0.3 * lg, 0, -0.55 - 0.15 * lg);
      armL.fore.rotation.set(0.45, 0, 0.05);
      staff.position.y = 0.35 * lg * (0.7 + Math.abs(Math.sin(t * 11)) * 0.3); // 笑嗰陣舉起魔杖
      staff.rotation.z = Math.sin(t * 1.2) * 0.03;
      orb.rotation.y = t * 2.5;
      staffMat.emissiveIntensity = 2.2 + Math.sin(t * 4) * 0.6 + lg * 1.5;
      // 腳仔踢下踢下（笑嗰陣）
      legs[0].rotation.x = Math.sin(t * 11) * 0.15 * lg;
      legs[1].rotation.x = -Math.sin(t * 11) * 0.15 * lg;
      // 頭髮 + 斗篷飄
      for (const l of locks) l.chain.forEach((p, i) => {
        p.rotation.x = (l.front ? 0.05 : 0.18 + i * 0.06) + Math.sin(t * 1.8 + l.ph + i * 0.6) * (0.06 + i * 0.03) + lg * 0.1;
        p.rotation.z = Math.sin(t * 1.3 + l.ph + i) * 0.05;
      });
      capePieces.forEach((p, i) => (p.rotation.x = 0.12 + i * 0.05 + Math.sin(t * 1.6 + i * 0.7) * (0.05 + i * 0.03)));
      // 📖 魔法書：浮、轉、自己揭頁、符文飛出嚟
      book.position.set(0.95 + Math.sin(t * 0.6) * 0.06, 1.55 + Math.sin(t * 1.5) * 0.12, -0.25);
      book.rotation.set(-0.5 + Math.sin(t * 1.1) * 0.08, -0.4 + Math.sin(t * 0.5) * 0.2, 0);
      const fp = (t * 0.45) % 1;
      flap.rotation.z = fp < 0.4 ? -(fp / 0.4) * PI * 0.92 + 0.15 : -PI * 0.92 + 0.15;
      flap.visible = fp < 0.6;
      runes.forEach((r, i) => {
        const p = (t * 0.5 + i / runes.length) % 1;
        r.position.set(Math.sin(i * 2.3 + t) * 0.15 * p, 0.08 + p * 0.7, Math.cos(i * 1.7) * 0.1);
        r.rotation.set(t + i, t * 2, 0);
        r.scale.setScalar(p < 0.8 ? 1 : (1 - p) * 5);
      });
      // ✨ 閃粉
      const arr = spGeo.attributes.position.array;
      spBase.forEach(([a, r, ph, sp], i) => {
        const p = (t * 0.25 * sp + ph) % 1;
        const aa = a + t * sp * 0.8;
        arr[i * 3] = Math.cos(aa) * r;
        arr[i * 3 + 1] = 0.3 + p * 3.2;
        arr[i * 3 + 2] = Math.sin(aa) * r;
      });
      spGeo.attributes.position.needsUpdate = true;
      sparkles.material.opacity = 0.6 + Math.sin(t * 5) * 0.25 + lg * 0.2;
      bubble.position.y = 4.6 + Math.sin(t * 2) * 0.08;
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
  const { place, popup = () => {}, announce = () => {}, play = () => {}, openWitch = () => {}, closeWitch = () => {}, goBack = () => {}, openPanel = () => {} } = ctx;
  const openSkills = () => openPanel('skills'), openShop = () => openPanel('castleShop');
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
  const brickDark = castleBrickTex([40, 32, 48]);
  const brickDarkMat = M(0xffffff, { map: brickDark });
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

  // ---- 🏰 城堡島 + 城堡（Issue #12 重做：witchCastle.js）----
  addPlatform(CASTLE_ISLAND, CASTLE_TOP); // 企得上去
  addPlatform(CASTLE_LANDING, CASTLE_TOP);
  const castle = buildWitchCastle({ root, live, steps, topMat, sideMat, jaggedCone, swirlTex });
  let pathStones = [];
  steps.push(() => {
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
    // 🌀 城堡正門 = 傳送門（Issue #14）：閘口入面一塊尖拱形漩渦
    gateVeil = buildGatePortal(live);
  });
  let gateVeil = null;
  // 尖拱形（同閘口一樣：闊 6.8、直邊 5.4、頂 8.8）嘅漩渦 + 外圈光 + 閃粉 + 牌
  function buildGatePortal(parent) {
    const w = 6.6, sh = 5.3, h = 8.6;
    const shp = new THREE.Shape();
    shp.moveTo(-w / 2, 0);
    shp.lineTo(w / 2, 0);
    shp.lineTo(w / 2, sh);
    shp.quadraticCurveTo(w / 2, sh + (h - sh) * 0.75, 0, h);
    shp.quadraticCurveTo(-w / 2, sh + (h - sh) * 0.75, -w / 2, sh);
    shp.closePath();
    const geo = new THREE.ShapeGeometry(shp, 16);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, p.getY(i) / h); // UV 0–1
    const g = new THREE.Group();
    g.position.set(CASTLE_PORTAL.x, CASTLE_TOP, CASTLE_PORTAL.z);
    parent.add(g);
    const tex1 = swirlTex('#e040fb', '#2a0050');
    tex1.center.set(0.5, 0.5);
    const tex2 = swirlTex('#ff9e40', '#6a0080');
    tex2.center.set(0.5, 0.5);
    const m1 = new THREE.MeshBasicMaterial({ map: tex1, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    const m2 = new THREE.MeshBasicMaterial({ map: tex2, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    add(g, geo, m1, 0, 0.05, 0, false);
    const v2 = add(g, geo, m2, 0, 0.05, -0.08, false);
    v2.scale.set(0.96, 0.98, 1);
    halo(g, 0, 4.2, -0.3, 5.2, 0xd500f9, 0.35);
    lightPool(g, 0, -1, 4.5, 0xd500f9, 0.4, 0.1);
    // 閃粉升上去
    const N = 40;
    const geoP = new THREE.BufferGeometry();
    geoP.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const pts = new THREE.Points(geoP, new THREE.PointsMaterial({ color: 0xf8bbff, size: 0.22, map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false;
    g.add(pts);
    const base = Array.from({ length: N }, () => [(rand() - 0.5) * w * 0.9, rand(), 0.4 + rand() * 0.6]);
    // 牌：入面（向庭園）同外面（向著陸台）
    const inSign = makeSign([{ text: '🌀 Back to Halloween World', size: 0.3 }, { text: 'Walk out through the gate · or press E', size: 0.16 }], 4.6, 1.0, THEMES.purple);
    inSign.position.set(0, 9.6, -0.9);
    inSign.rotation.y = PI;
    g.add(inSign);
    const outSign = makeSign([{ text: '🏰 WITCH CASTLE', size: 0.32 }, { text: 'Walk in! (walk back out = 🌀 home)', size: 0.16 }], 4.4, 1.0, THEMES.purple);
    outSign.position.set(0, 10.2, 3.9);
    g.add(outSign);
    return {
      update(t, quality) {
        tex1.rotation = -t * 1.2;
        tex2.rotation = t * 0.8;
        m1.opacity = 0.82 + Math.sin(t * 2.2) * 0.1;
        pts.visible = quality >= 1;
        if (!pts.visible) return;
        const a = geoP.attributes.position.array;
        base.forEach(([x, ph, sp], i) => {
          const k = (t * 0.25 * sp + ph) % 1;
          a[i * 3] = x + Math.sin(t * 2 + i) * 0.2;
          a[i * 3 + 1] = k * 8;
          a[i * 3 + 2] = -0.3 - Math.sin(k * PI) * 0.4;
        });
        geoP.attributes.position.needsUpdate = true;
      },
    };
  }
  const _plane = { g: null };
  function geoPlane() {
    if (!_plane.g) _plane.g = new THREE.PlaneGeometry(2, 2).rotateX(-PI / 2);
    return _plane.g;
  }

  // ---- 🧙‍♀️ 女巫、貓、大鍋 ----
  let witch = null, cat = null, cauldron = null, skillStall = null, shopStall = null;
  createSkillTreePanel({ play, popup, announce });
  createCastleShopPanel({ play, popup, announce, equipRanger: ctx.equipRanger });
  steps.push(() => {
    // 🌳 Skill Tree（女巫隔籬）+ 🛒 Castle Shop（庭園東邊）—— Issue #14
    skillStall = buildSkillTreeStall(live, SKILL_TREE.x, CASTLE_TOP, SKILL_TREE.z, SKILL_TREE.ry);
    addCollider(SKILL_TREE.x, SKILL_TREE.z, 2.3);
    shopStall = buildCastleShopStall(live, CASTLE_SHOP.x, CASTLE_TOP, CASTLE_SHOP.z, CASTLE_SHOP.ry);
    mergePivots(skillStall.g);
    mergePivots(shopStall.g);
    const c = Math.cos(CASTLE_SHOP.ry), sn = Math.sin(CASTLE_SHOP.ry);
    for (const lx of [-3.4, -1.7, 0, 1.7, 3.4]) addCollider(CASTLE_SHOP.x + lx * c, CASTLE_SHOP.z - lx * sn, 1.3); // 攤位成排（本地 x 方向）
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
  let lastGateZ = null, gateCd = 0; // 🌀 正門傳送門
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
    get witch() { return witch; }, // 測試：game.hell.witch.pose('wave' | 'laugh' | 'stir')
    openSkills: () => openSkills(), openShop: () => openShop(), // 測試：🌳／🛒 面板
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
      // 傳送門轉；🏰 城堡（火、蠟燭、蝙蝠、符文、塔門…）
      for (const p of portals) p.disc.rotation.z = -t * 1.6;
      castle.update(dt, t, quality);
      for (const s of pathStones) s.m.material.opacity = state.witchMet ? 0.35 + Math.max(0, Math.sin(t * 4 - s.i * 0.5)) * 0.55 : 0.08;
      // 🧙‍♀️ 女巫：對白泡泡輪住換
      talking = Math.max(0, talking - dt);
      witch.animate(t, talking > 0, dt);
      skillStall.update(t, quality);
      shopStall.update(t, quality);
      gateVeil.update(t, quality);
      // 🌀 由庭園行出正門（穿過漩渦向 +z）= 返 Halloween World；外面行入嚟唔會
      gateCd = Math.max(0, gateCd - dt);
      const atGate = Math.abs(pos.x - CASTLE_PORTAL.x) < CASTLE_PORTAL.w && player && player.feetY > CASTLE_TOP - 0.6;
      if (atGate && lastGateZ != null && gateCd <= 0 && lastGateZ < CASTLE_PORTAL.z && pos.z >= CASTLE_PORTAL.z && pos.z - lastGateZ < 1.5) {
        gateCd = 4;
        goBack();
      }
      lastGateZ = pos.z;
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
      if (d(HELL_PORTAL) < 3.4) return { prompt: '<kbd>E</kbd> 🌀 Go back to the Halloween World', action: goBack };
      if (Math.abs(p.x - CASTLE_PORTAL.x) < CASTLE_PORTAL.w && p.z > CASTLE_GATE_Z - 3.4 && p.z < CASTLE_GATE_Z + 2.2) return { prompt: '<kbd>E</kbd> 🌀 Go back to the Halloween World (castle gate portal)', action: goBack };
      if (d(skillStall.pos) < 3.2 || d(SKILL_TREE) < 3.6) return { prompt: '<kbd>E</kbd> 🌳 Open the Witch\'s Skill Tree (☠️ Skele Tokens)', action: () => { play('magic'); openSkills(); } };
      if (d(shopStall.pos) < 3.4) return { prompt: '<kbd>E</kbd> 🛒 Open the Castle Shop (skins for ☠️ Skele Tokens)', action: openShop };
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
