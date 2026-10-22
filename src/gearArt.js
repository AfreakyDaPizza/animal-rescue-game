// 💎 Gear 美術（小朋友 2026-10-22：「mutation shards 要好似 Halloween 同 Meteoric 嗰啲咁有設計」）
// 每種變異 Shard 一個樣：水晶碎 + 自己嘅顏色、光、圖案
//   🔮 Halloween：紫色水晶 + 橙色南瓜符文   ☄️ Meteoric：藍色水晶 + 流星 + 隕石底
//   🌌 Astral：入面係星空 + 光環             🔥 Fire：橙紅水晶 + 火焰
//   🌑 Eclipse：黑水晶 + 日蝕光圈            👻 Spectral：半透明青色 + 鬼仔 + 煙
//   🟣 Phantom：紫羅蘭水晶 + 漩渦煙 + 新月
// 兩樣嘢：
//   gearIcon(type)：2D canvas 畫 → data URL（背包卡、快捷欄、商店、控制台用）；畫一次就記住
//   buildShardModel(type)：3D 水晶（快捷欄揀咗 Shard 時拎喺手）
// 點解 2D canvas 唔用 3D 影相（animalPics.js 嗰種）：即刻畫到（唔使等 WebGL）、好細、可以畫星空同符文呢啲細節
// 新 Gear 想要自己個樣：喺 GEARS 加 art: '<下面 STYLES 嘅 key>'；冇 art 嘅 Gear（例如寶箱）照用 emoji

import * as THREE from 'three';
import { gearInfo } from './data/gears.js';
import { mutationInfo } from './data/animals.js';

// body：[亮, 中, 暗]；glow：外光；accent：圖案顏色
const STYLES = {
  halloween: { body: ['#e1bee7', '#9c4dff', '#4a148c'], glow: '#ff9100', accent: '#ffab40', motif: 'pumpkin' },
  meteoric: { body: ['#e1f5fe', '#29b6f6', '#01579b'], glow: '#40c4ff', accent: '#ffffff', motif: 'meteor' },
  astral: { body: ['#f8bbd0', '#7c4dff', '#1a0b4d'], glow: '#ea80fc', accent: '#fff59d', motif: 'stars' },
  fire: { body: ['#fff59d', '#ff6d00', '#b71c1c'], glow: '#ff3d00', accent: '#ffd740', motif: 'flames' },
  eclipse: { body: ['#9575cd', '#311b92', '#0b0420'], glow: '#ea80fc', accent: '#ffd740', motif: 'eclipse' },
  spectral: { body: ['#ffffff', '#84ffff', '#00838f'], glow: '#84ffff', accent: '#e0f7fa', motif: 'ghost', alpha: 0.78 },
  phantom: { body: ['#e1bee7', '#aa00ff', '#311b92'], glow: '#b388ff', accent: '#f3e5f5', motif: 'swirl' },
};

// 呢個 Gear 用邊個樣（冇 = null → 用 emoji）
function styleOf(type) {
  const g = gearInfo(type);
  if (g.art && STYLES[g.art]) return STYLES[g.art];
  if (g.mutation) {
    // 將來新變異：用佢自己嘅顏色
    const c = mutationInfo(g.mutation)?.color || g.color;
    return { body: ['#ffffff', c, '#263238'], glow: c, accent: '#ffffff', motif: null };
  }
  return null;
}
export const hasGearArt = (type) => !!styleOf(type);

// ---------- 2D 圖示 ----------
const S = 256; // 畫大啲，縮細清楚
const iconCache = new Map();

// 細細嘅固定隨機數（每次畫都一樣嘅星）
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// 水晶形狀（中心 0,0，高 200）
const SHARD = [[0, -100], [38, -46], [30, 72], [0, 100], [-30, 72], [-38, -46]];
function shardPath(c) {
  c.beginPath();
  SHARD.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
}
function poly(c, pts, fill) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

// 一粒水晶：外光 → 三塊面（左暗、中、右亮）→ 邊 → 反光；inside(c) = 喺水晶入面畫嘢（例如星空）
function drawShard(c, x, y, scale, rot, st, inside = null) {
  const [light, mid, dark] = st.body;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(scale, scale);
  c.globalAlpha = st.alpha || 1;
  // 外光
  c.save();
  c.shadowColor = st.glow;
  c.shadowBlur = 34 * scale; // shadowBlur 唔跟 scale 變
  shardPath(c);
  c.fillStyle = mid;
  c.fill();
  c.restore();
  // 三塊面
  const g = c.createLinearGradient(0, -100, 0, 100);
  g.addColorStop(0, light);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, dark);
  poly(c, [[0, -100], [14, -40], [12, 72], [0, 100], [-12, 72], [-14, -40]], g);
  poly(c, [[0, -100], [-38, -46], [-30, 72], [0, 100], [-12, 72], [-14, -40]], dark);
  c.globalAlpha = (st.alpha || 1) * 0.55;
  poly(c, [[0, -100], [-38, -46], [-30, 72], [0, 100], [-12, 72], [-14, -40]], mid);
  c.globalAlpha = st.alpha || 1;
  const rg = c.createLinearGradient(0, -100, 40, 80);
  rg.addColorStop(0, light);
  rg.addColorStop(1, mid);
  poly(c, [[0, -100], [38, -46], [30, 72], [0, 100], [12, 72], [14, -40]], rg);
  if (inside) {
    c.save();
    shardPath(c);
    c.clip();
    inside(c);
    c.restore();
  }
  // 邊
  shardPath(c);
  c.lineJoin = 'round';
  c.lineWidth = 4;
  c.strokeStyle = dark;
  c.stroke();
  c.lineWidth = 1.5;
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.beginPath();
  c.moveTo(-14, -40); c.lineTo(0, -100); c.lineTo(14, -40); c.lineTo(12, 72); c.lineTo(0, 100); c.lineTo(-12, 72); c.closePath();
  c.stroke();
  // 反光
  c.globalAlpha = 0.75;
  poly(c, [[20, -60], [28, -44], [22, 20], [17, 6]], '#ffffff');
  c.restore();
}

// ✦ 四角星
function sparkle(c, x, y, r, color) {
  c.save();
  c.translate(x, y);
  c.fillStyle = color;
  c.shadowColor = color;
  c.shadowBlur = r;
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.28 : r;
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
  c.restore();
}

function flame(c, x, y, w, h, outer, inner) {
  for (const [k, col] of [[1, outer], [0.55, inner]]) {
    c.beginPath();
    c.moveTo(x, y - h * k);
    c.bezierCurveTo(x + w * 0.7 * k, y - h * 0.45 * k, x + w * 0.6 * k, y, x, y);
    c.bezierCurveTo(x - w * 0.6 * k, y, x - w * 0.7 * k, y - h * 0.45 * k, x, y - h * k);
    c.fillStyle = col;
    c.fill();
  }
}

// 圖案：back = 水晶後面，front = 水晶前面，inside = 水晶入面
const MOTIFS = {
  pumpkin: {
    back(c, st) {
      const r = rng(7);
      for (let i = 0; i < 9; i++) sparkle(c, 30 + r() * 196, 30 + r() * 196, 5 + r() * 6, i % 3 ? st.accent : '#ce93d8');
    },
    // 南瓜符文：發光橙色南瓜 + 三角眼 + 鋸齒口
    inside(c, st) {
      c.save();
      c.translate(0, 8);
      c.shadowColor = st.glow;
      c.shadowBlur = 14;
      c.strokeStyle = st.accent;
      c.lineWidth = 5;
      c.beginPath();
      c.ellipse(0, 0, 25, 21, 0, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(0, -21); c.quadraticCurveTo(-3, -30, 4, -34);
      c.stroke();
      c.fillStyle = st.accent;
      for (const s of [-1, 1]) poly(c, [[s * 12, -10], [s * 4, 0], [s * 18, 0]], st.accent);
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(-14, 8); c.lineTo(-8, 14); c.lineTo(-3, 8); c.lineTo(3, 14); c.lineTo(8, 8); c.lineTo(14, 14);
      c.stroke();
      c.restore();
    },
  },
  meteor: {
    // 流星：右上角飛落嚟，有條光尾
    back(c, st) {
      c.save();
      const g = c.createLinearGradient(240, 6, 150, 96);
      g.addColorStop(0, 'rgba(64,196,255,0)');
      g.addColorStop(1, 'rgba(225,245,254,0.95)');
      c.strokeStyle = g;
      c.lineCap = 'round';
      c.lineWidth = 20;
      c.beginPath();
      c.moveTo(250, 0); c.lineTo(168, 82);
      c.stroke();
      c.lineWidth = 8;
      c.beginPath();
      c.moveTo(210, 0); c.lineTo(150, 60);
      c.stroke();
      c.shadowColor = st.glow;
      c.shadowBlur = 24;
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(164, 86, 13, 0, Math.PI * 2);
      c.fill();
      c.restore();
      const r = rng(3);
      for (let i = 0; i < 6; i++) sparkle(c, 20 + r() * 110, 20 + r() * 120, 4 + r() * 5, '#e1f5fe');
    },
    // 隕石底：灰色石 + 藍色裂紋
    front(c, st) {
      c.save();
      c.fillStyle = '#455a64';
      c.strokeStyle = '#263238';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(66, 222); c.quadraticCurveTo(76, 196, 110, 200); c.quadraticCurveTo(128, 190, 150, 200);
      c.quadraticCurveTo(186, 196, 192, 222); c.quadraticCurveTo(128, 238, 66, 222);
      c.fill();
      c.stroke();
      c.shadowColor = st.glow;
      c.shadowBlur = 10;
      c.strokeStyle = st.glow;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(90, 214); c.lineTo(102, 208); c.lineTo(110, 218);
      c.moveTo(150, 206); c.lineTo(160, 216); c.lineTo(174, 212);
      c.stroke();
      c.restore();
    },
  },
  stars: {
    // 光環後半（喺水晶後面）
    back(c, st) {
      const r = rng(11);
      for (let i = 0; i < 10; i++) sparkle(c, 16 + r() * 224, 16 + r() * 224, 4 + r() * 8, i % 2 ? st.accent : '#ea80fc');
      ring(c, st, Math.PI, Math.PI * 2);
    },
    // 入面：星雲 + 星
    inside(c, st) {
      const g = c.createRadialGradient(-6, -10, 4, 0, 0, 110);
      g.addColorStop(0, 'rgba(255,128,171,0.9)');
      g.addColorStop(0.35, 'rgba(124,77,255,0.85)');
      g.addColorStop(1, 'rgba(10,4,40,0.95)');
      c.fillStyle = g;
      c.fillRect(-50, -110, 100, 220);
      const r = rng(5);
      for (let i = 0; i < 26; i++) {
        c.fillStyle = i % 4 ? '#ffffff' : st.accent;
        c.beginPath();
        c.arc(-36 + r() * 72, -90 + r() * 180, 0.8 + r() * 2.2, 0, Math.PI * 2);
        c.fill();
      }
      sparkle(c, 6, -30, 12, '#ffffff');
      sparkle(c, -12, 34, 8, st.accent);
    },
    front(c, st) {
      ring(c, st, 0, Math.PI);
    },
  },
  flames: {
    back(c, st) {
      flame(c, 82, 214, 46, 100, '#ff3d00', '#ffab00');
      flame(c, 176, 214, 44, 92, '#ff3d00', '#ffab00');
      flame(c, 128, 226, 70, 150, 'rgba(255,61,0,0.85)', 'rgba(255,171,0,0.85)');
    },
    front(c, st) {
      flame(c, 104, 230, 30, 56, '#ff6d00', st.accent);
      flame(c, 156, 230, 28, 50, '#ff6d00', st.accent);
      const r = rng(9);
      c.save();
      c.shadowColor = '#ffab00';
      c.shadowBlur = 8;
      for (let i = 0; i < 12; i++) {
        c.fillStyle = i % 2 ? '#ffd740' : '#ff9100';
        c.beginPath();
        c.arc(40 + r() * 176, 20 + r() * 150, 2 + r() * 3, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    },
  },
  eclipse: {
    // 日蝕：發光光圈 + 黑色太陽 + 金邊
    back(c, st) {
      c.save();
      const g = c.createRadialGradient(128, 112, 56, 128, 112, 108);
      g.addColorStop(0, 'rgba(255,215,64,0.95)');
      g.addColorStop(0.18, 'rgba(234,128,252,0.85)');
      g.addColorStop(1, 'rgba(234,128,252,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(128, 112, 108, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#07020f';
      c.beginPath();
      c.arc(128, 112, 60, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 3;
      c.strokeStyle = st.accent;
      c.shadowColor = st.accent;
      c.shadowBlur = 12;
      c.stroke();
      c.restore();
    },
    inside(c, st) {
      c.save();
      c.strokeStyle = 'rgba(234,128,252,0.9)';
      c.shadowColor = '#ea80fc';
      c.shadowBlur = 10;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(0, 4, 16, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#0b0420';
      c.beginPath();
      c.arc(5, 1, 13, 0, Math.PI * 2);
      c.fill();
      c.restore();
    },
  },
  ghost: {
    back(c, st) {
      c.save();
      c.strokeStyle = 'rgba(132,255,255,0.55)';
      c.lineCap = 'round';
      c.lineWidth = 7;
      for (const [x, y, k] of [[56, 200, 1], [196, 180, -1], [70, 80, 1]]) {
        c.beginPath();
        c.moveTo(x, y);
        c.bezierCurveTo(x + 20 * k, y - 30, x - 18 * k, y - 50, x + 4 * k, y - 80);
        c.stroke();
      }
      c.restore();
    },
    // 鬼仔：右下角，白色，兩粒眼
    front(c, st) {
      c.save();
      c.translate(184, 184);
      c.shadowColor = st.glow;
      c.shadowBlur = 16;
      c.fillStyle = 'rgba(255,255,255,0.95)';
      c.beginPath();
      c.arc(0, -10, 24, Math.PI, 0);
      c.lineTo(24, 22);
      for (let i = 0; i < 4; i++) c.quadraticCurveTo(18 - i * 12, 12, 12 - i * 12, 22);
      c.closePath();
      c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#006064';
      for (const s of [-1, 1]) {
        c.beginPath();
        c.ellipse(s * 9, -10, 4, 6, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.beginPath();
      c.ellipse(0, 4, 5, 4, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    },
  },
  swirl: {
    // 漩渦煙
    back(c, st) {
      c.save();
      c.lineCap = 'round';
      for (const [r0, col, w] of [[96, 'rgba(170,0,255,0.45)', 12], [76, 'rgba(179,136,255,0.55)', 7]]) {
        c.strokeStyle = col;
        c.lineWidth = w;
        c.beginPath();
        for (let a = 0; a < Math.PI * 3.2; a += 0.08) {
          const r = r0 - a * 9;
          const x = 128 + Math.cos(a) * r;
          const y = 128 + Math.sin(a) * r * 0.9;
          a ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
      c.restore();
      const r = rng(13);
      for (let i = 0; i < 7; i++) sparkle(c, 20 + r() * 216, 20 + r() * 216, 4 + r() * 6, '#e1bee7');
    },
    // 新月符文
    inside(c, st) {
      c.save();
      c.translate(0, 6);
      c.shadowColor = '#ffffff';
      c.shadowBlur = 14;
      c.fillStyle = st.accent;
      c.beginPath();
      c.arc(0, 0, 20, 0, Math.PI * 2);
      c.arc(9, -5, 17, 0, Math.PI * 2, true);
      c.fill('evenodd');
      c.restore();
    },
  },
};

// 光環（橢圓）：from–to 角度（後半 / 前半分開畫，似圍住水晶）
function ring(c, st, from, to) {
  c.save();
  c.strokeStyle = st.glow;
  c.shadowColor = st.glow;
  c.shadowBlur = 12;
  c.lineWidth = 6;
  c.beginPath();
  c.ellipse(128, 140, 100, 26, -0.25, from, to);
  c.stroke();
  c.restore();
}

function drawIcon(st) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const m = MOTIFS[st.motif] || {};
  // 柔和光暈底
  const halo = c.createRadialGradient(128, 128, 10, 128, 128, 128);
  halo.addColorStop(0, `${st.glow}88`);
  halo.addColorStop(1, `${st.glow}00`);
  c.fillStyle = halo;
  c.fillRect(0, 0, S, S);
  m.back?.(c, st);
  drawShard(c, 74, 168, 0.42, -0.5, st); // 兩粒細水晶喺後面
  drawShard(c, 184, 172, 0.36, 0.45, st);
  drawShard(c, 128, 122, 0.98, 0.06, st, m.inside ? (cc) => m.inside(cc, st) : null);
  m.front?.(c, st);
  return cv.toDataURL('image/png');
}

// 圖示 data URL（冇樣 = null）
export function gearIconUrl(type) {
  if (iconCache.has(type)) return iconCache.get(type);
  const st = styleOf(type);
  let url = null;
  try {
    url = st ? drawIcon(st) : null;
  } catch {
    url = null; // 冇 canvas（好舊嘅瀏覽器）：用 emoji
  }
  iconCache.set(type, url);
  return url;
}

// HTML：有樣用 <img>，冇就用 emoji；cls 加落個 class（例如快捷欄、背包大圖）
export function gearIcon(type, cls = '') {
  const url = gearIconUrl(type);
  return url ? `<img class="gear-icon ${cls}" src="${url}" alt="${gearInfo(type).name}" draggable="false">` : `<span class="emoji gear-emoji ${cls}">${gearInfo(type).emoji}</span>`;
}

// 背包／商店卡用嘅「相框」（同寵物相一樣大，底色跟 Gear 顏色）
export const gearPic = (type) => `<div class="pet-pic gear-pic" style="--pic-bg:${gearInfo(type).color}">${gearIcon(type)}</div>`;

// ---------- 3D：手上嘅水晶 ----------
const TAU = Math.PI * 2;
const crystalGeo = new THREE.LatheGeometry(
  [new THREE.Vector2(0, -0.5), new THREE.Vector2(0.22, -0.3), new THREE.Vector2(0.26, 0.25), new THREE.Vector2(0, 0.62)],
  6,
);
crystalGeo.computeVertexNormals();
const bitGeo = new THREE.OctahedronGeometry(0.07, 0);
const modelCache = new Map();

function glowMaterial(color, emissive, intensity, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color, emissive, emissiveIntensity: intensity, roughness: 0.15, metalness: 0.15, flatShading: true,
    transparent: opacity < 1, opacity,
  });
}

// type 嘅 3D 水晶（冇樣 = null）。userData.animate(t)：轉 + 浮
export function buildShardModel(type) {
  const st = styleOf(type);
  if (!st) return null;
  const g = new THREE.Group();
  const spin = new THREE.Group();
  g.add(spin);
  const body = glowMaterial(st.body[1], st.glow, st.motif === 'eclipse' ? 0.25 : 0.45, st.alpha ? 0.72 : 1);
  const main = new THREE.Mesh(crystalGeo, body);
  spin.add(main);
  for (const [x, s, rz] of [[-0.24, 0.45, 0.5], [0.22, 0.38, -0.45]]) {
    const small = new THREE.Mesh(crystalGeo, body);
    small.scale.setScalar(s);
    small.position.set(x, -0.3, 0.04);
    small.rotation.z = rz;
    spin.add(small);
  }
  const accent = glowMaterial(st.accent, st.accent, 1.4);
  // 圍住轉嘅細光點
  const orbit = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(bitGeo, i % 2 ? accent : glowMaterial(st.glow, st.glow, 1.6));
    const a = (i / 4) * TAU;
    b.position.set(Math.cos(a) * 0.45, 0.1 + (i % 2) * 0.15, Math.sin(a) * 0.45);
    orbit.add(b);
  }
  g.add(orbit);
  // 每種自己少少特別嘢
  if (st.motif === 'stars' || st.motif === 'eclipse') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.025, 6, 32), glowMaterial(st.glow, st.glow, 1.8));
    ring.rotation.x = Math.PI / 2 - 0.35;
    g.add(ring);
  }
  if (st.motif === 'eclipse') {
    const sun = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), new THREE.MeshBasicMaterial({ color: 0x07020f }));
    sun.position.set(0, 0.25, 0.3);
    g.add(sun);
  }
  if (st.motif === 'meteor') {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.9, flatShading: true }));
    rock.scale.set(1.3, 0.45, 1);
    rock.position.y = -0.5;
    g.add(rock);
  }
  if (st.motif === 'flames') {
    const fire = glowMaterial('#ff6d00', '#ff3d00', 1.6, 0.85);
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 5), fire);
      const a = (i / 5) * TAU;
      f.position.set(Math.cos(a) * 0.28, -0.35, Math.sin(a) * 0.28);
      orbit.add(f);
    }
  }
  if (st.motif === 'pumpkin') {
    const pumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), glowMaterial('#ff9100', '#ff6d00', 1.2));
    pumpkin.scale.y = 0.8;
    pumpkin.position.set(0, 0.05, 0.24);
    spin.add(pumpkin);
  }
  g.userData.animate = (t) => {
    spin.rotation.y = t * 1.2;
    orbit.rotation.y = -t * 2;
    g.position.y = (g.userData.baseY ?? 0) + Math.sin(t * 2.4) * 0.04;
  };
  return g;
}

// 共用：同一種 Gear 用返同一個模型（換嚟換去唔使重新整）
export function shardModel(type, slot) {
  const key = `${type}|${slot}`;
  if (!modelCache.has(key)) modelCache.set(key, buildShardModel(type));
  return modelCache.get(key);
}
