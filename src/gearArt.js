// 💎 Gear 美術（小朋友 2026-10-22：「mutation shards 要好似 Halloween 同 Meteoric 嗰啲咁有設計」）
// 每種變異 Shard 一個樣：水晶碎 + 自己嘅顏色、光、圖案
//   🔮 Halloween：紫色水晶 + 橙色南瓜符文   ☄️ Meteoric：藍色水晶 + 流星 + 隕石底
//   🌌 Astral：入面係星空 + 光環             🔥 Fire：橙紅水晶 + 火焰
//   🌑 Eclipse：黑水晶 + 日蝕光圈            👻 Spectral：半透明青色 + 鬼仔 + 煙
//   🟣 Phantom：紫羅蘭水晶 + 漩渦煙 + 新月
//   😈 Demonic：紅黑水晶 + 頂上一對彎角 + 底下紅黑火 + 入面細惡魔笑臉（Issue #11）
//   ⏳ Time：金色水晶 + 入面一個時鐘 + 後面一個金色時鐘圈（刻度）+ 青色星光（小朋友 2026-11-03）
//   🤠 Tame：橙啡色水晶 + 入面一頂牛仔帽 + 圍住一個套索繩圈 + 金星（Issue #16）
//   🐎 Ridable Shard：栗色水晶 + 入面一個馬鞍 + 後面一隻金色馬蹄鐵（Issue #16）
//   🪢 Leash：唔係水晶，係一卷繩 + 皮手柄 + 金屬扣（noShard，Issue #16）
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
  demonic: { body: ['#ff8a80', '#d50000', '#1a0505'], glow: '#ff1744', accent: '#ffab00', motif: 'demon' }, // 😈 Issue #11
  time: { body: ['#fffde7', '#ffca28', '#e65100'], glow: '#ffd54f', accent: '#18ffff', motif: 'clock' }, // ⏳ Time Shard
  tame: { body: ['#ffe0b2', '#ff9e40', '#8d4a17'], glow: '#ffab40', accent: '#ffd740', motif: 'cowboy' }, // 🤠 Tame Shard（Issue #16）
  alien: { body: ['#ccff90', '#76ff03', '#1b5e20'], glow: '#76ff03', accent: '#b388ff', motif: 'stars' }, // 👽 Alien Shard（Issue #21）
  ride: { body: ['#ffccbc', '#c0703a', '#4e2a12'], glow: '#ffb74d', accent: '#ffd740', motif: 'saddle' }, // 🐎 Ridable Shard
  leash: { body: ['#ffe0b2', '#d7a86e', '#6d4c2f'], glow: '#ffcc80', accent: '#b0bec5', motif: 'leash', noShard: true }, // 🪢 Leash
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
  demon: {
    // 底下紅黑火 + 火星
    back(c, st) {
      for (const [x, w, h] of [[70, 46, 120], [128, 60, 150], [186, 46, 118], [100, 34, 90], [158, 34, 92]]) flame(c, x, 236, w, h, '#b71c1c', '#ff6d00');
      for (const [x, w, h] of [[96, 22, 60], [128, 28, 80], [160, 22, 58]]) flame(c, x, 236, w, h, '#1a0505', '#3e0a0a');
      const r = rng(31);
      for (let i = 0; i < 10; i++) sparkle(c, 24 + r() * 208, 20 + r() * 150, 3 + r() * 5, i % 2 ? st.accent : '#ff5252');
    },
    // 細惡魔笑臉：兩粒發光眼 + 笑口 + 細牙
    inside(c, st) {
      c.save();
      c.translate(0, 10);
      c.shadowColor = st.accent;
      c.shadowBlur = 12;
      c.fillStyle = st.accent;
      for (const s of [-1, 1]) poly(c, [[s * 4, -12], [s * 17, -16], [s * 15, -4], [s * 5, -4]], st.accent);
      c.strokeStyle = st.accent;
      c.lineWidth = 4;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(0, 2, 14, 0.15 * Math.PI, 0.85 * Math.PI);
      c.stroke();
      poly(c, [[4, 15], [9, 14], [7, 22]], '#ffffff');
      c.restore();
    },
    // 頂上一對彎角（深色 + 發光橙尖）
    front(c, st) {
      for (const s of [-1, 1]) {
        c.save();
        c.translate(128 + s * 26, 46);
        c.scale(s, 1);
        c.shadowColor = st.glow;
        c.shadowBlur = 14;
        c.beginPath();
        c.moveTo(-10, 12);
        c.quadraticCurveTo(-4, -18, 26, -40);
        c.quadraticCurveTo(10, -10, 12, 14);
        c.closePath();
        const gr = c.createLinearGradient(0, 14, 26, -40);
        gr.addColorStop(0, '#3e0a0a');
        gr.addColorStop(0.6, '#7f0000');
        gr.addColorStop(1, st.accent);
        c.fillStyle = gr;
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = '#1a0505';
        c.stroke();
        c.restore();
      }
    },
  },
};

// ⏳ 時鐘：金色時鐘圈喺水晶後面（12 格刻度）+ 青色星光；水晶入面一個細鐘面
MOTIFS.clock = {
  back(c, st) {
    c.save();
    c.translate(128, 118);
    c.shadowColor = st.glow;
    c.shadowBlur = 16;
    c.strokeStyle = st.glow;
    c.lineWidth = 9;
    c.beginPath();
    c.arc(0, 0, 96, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 3;
    c.strokeStyle = '#fff8e1';
    c.beginPath();
    c.arc(0, 0, 84, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r0 = i % 3 ? 78 : 70;
      c.lineWidth = i % 3 ? 4 : 7;
      c.strokeStyle = i % 3 ? '#ffe082' : '#ffffff';
      c.beginPath();
      c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      c.lineTo(Math.cos(a) * 92, Math.sin(a) * 92);
      c.stroke();
    }
    c.restore();
    const r = rng(53);
    for (let i = 0; i < 10; i++) sparkle(c, 20 + r() * 216, 20 + r() * 216, 4 + r() * 7, i % 2 ? st.accent : '#ffffff');
  },
  // 細鐘面：白底 + 兩支針（10:10，好似笑緊）
  inside(c, st) {
    c.save();
    c.translate(0, 4);
    c.shadowColor = '#ffffff';
    c.shadowBlur = 10;
    c.fillStyle = '#fffde7';
    c.beginPath();
    c.arc(0, 0, 25, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.lineWidth = 3;
    c.strokeStyle = '#e65100';
    c.stroke();
    c.lineCap = 'round';
    c.strokeStyle = '#3e2723';
    for (const [a, len, w] of [[-2.1, 13, 4.5], [-1.0, 19, 3]]) {
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      c.stroke();
    }
    c.fillStyle = st.accent;
    c.beginPath();
    c.arc(0, 0, 3.5, 0, Math.PI * 2);
    c.fill();
    c.restore();
  },
};

// 🤠 牛仔帽（2D）：中心 (0,0)，闊 w
function cowboyHat(c, w, col = '#9a6233', band = '#d84315') {
  c.save();
  c.lineJoin = 'round';
  c.lineWidth = w * 0.035;
  c.strokeStyle = '#3e2412';
  // 帽頂（中間凹）
  c.beginPath();
  c.moveTo(-w * 0.28, 0);
  c.bezierCurveTo(-w * 0.3, -w * 0.38, -w * 0.18, -w * 0.46, -w * 0.06, -w * 0.38);
  c.quadraticCurveTo(0, -w * 0.32, w * 0.06, -w * 0.38);
  c.bezierCurveTo(w * 0.18, -w * 0.46, w * 0.3, -w * 0.38, w * 0.28, 0);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.stroke();
  // 帽帶
  c.fillStyle = band;
  c.fillRect(-w * 0.28, -w * 0.11, w * 0.56, w * 0.08);
  // 帽簷：兩邊翹起
  c.beginPath();
  c.moveTo(-w * 0.5, -w * 0.12);
  c.quadraticCurveTo(-w * 0.42, w * 0.06, 0, w * 0.06);
  c.quadraticCurveTo(w * 0.42, w * 0.06, w * 0.5, -w * 0.12);
  c.quadraticCurveTo(w * 0.36, -w * 0.02, 0, -w * 0.02);
  c.quadraticCurveTo(-w * 0.36, -w * 0.02, -w * 0.5, -w * 0.12);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.stroke();
  sparkle(c, 0, -w * 0.07, w * 0.07, '#ffd740');
  c.restore();
}

// 🤠 Tame：後面一個套索繩圈（斜斜）+ 金星；水晶入面一頂細牛仔帽
MOTIFS.cowboy = {
  back(c, st) {
    c.save();
    c.translate(128, 136);
    c.rotate(-0.25);
    c.strokeStyle = '#8d5a2b';
    c.lineWidth = 11;
    c.beginPath();
    c.ellipse(0, 0, 104, 34, 0, Math.PI, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#e0b276';
    c.lineWidth = 7;
    c.setLineDash([10, 6]);
    c.stroke();
    c.restore();
    const r = rng(61);
    for (let i = 0; i < 9; i++) sparkle(c, 20 + r() * 216, 20 + r() * 216, 4 + r() * 7, i % 2 ? st.accent : '#ffffff');
  },
  inside(c) {
    c.save();
    c.translate(0, 12);
    cowboyHat(c, 66);
    c.restore();
  },
  front(c) {
    // 套索前半圈 + 繩結 + 繩尾
    c.save();
    c.translate(128, 136);
    c.rotate(-0.25);
    c.strokeStyle = '#8d5a2b';
    c.lineWidth = 11;
    c.beginPath();
    c.ellipse(0, 0, 104, 34, 0, 0, Math.PI);
    c.stroke();
    c.strokeStyle = '#e0b276';
    c.lineWidth = 7;
    c.setLineDash([10, 6]);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#6d4022';
    c.fillRect(96, -10, 20, 20);
    c.strokeStyle = '#e0b276';
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(108, 0);
    c.quadraticCurveTo(130, -30, 118, -70);
    c.stroke();
    c.restore();
  },
};

// 🐎 Ridable Shard：後面一隻金色馬蹄鐵；水晶入面一個馬鞍
function drawSaddle(c, w) {
  c.save();
  c.lineJoin = 'round';
  c.lineWidth = w * 0.035;
  c.strokeStyle = '#2b160a';
  // 鞍墊（藍紅格仔布）
  c.fillStyle = '#1e5aa8';
  c.beginPath();
  c.roundRect(-w * 0.46, -w * 0.02, w * 0.92, w * 0.26, w * 0.06);
  c.fill();
  c.stroke();
  c.fillStyle = '#e53935';
  c.fillRect(-w * 0.46, w * 0.08, w * 0.92, w * 0.05);
  // 鞍座：前高（鞍頭）後高（鞍尾）中間凹
  c.fillStyle = '#8d4a1f';
  c.beginPath();
  c.moveTo(-w * 0.38, w * 0.02);
  c.quadraticCurveTo(-w * 0.42, -w * 0.22, -w * 0.3, -w * 0.24);
  c.quadraticCurveTo(0, -w * 0.06, w * 0.24, -w * 0.18);
  c.lineTo(w * 0.3, -w * 0.36);
  c.lineTo(w * 0.38, -w * 0.34);
  c.quadraticCurveTo(w * 0.42, -w * 0.08, w * 0.38, w * 0.02);
  c.closePath();
  c.fill();
  c.stroke();
  // 腳踏
  c.strokeStyle = '#5d2f12';
  c.lineWidth = w * 0.05;
  c.beginPath();
  c.moveTo(0, w * 0.0);
  c.lineTo(0, w * 0.32);
  c.stroke();
  c.fillStyle = '#ffd740';
  c.fillRect(-w * 0.08, w * 0.3, w * 0.16, w * 0.06);
  c.restore();
}
MOTIFS.saddle = {
  back(c, st) {
    c.save();
    c.translate(128, 112);
    c.shadowColor = st.accent;
    c.shadowBlur = 14;
    c.strokeStyle = '#ffc400';
    c.lineWidth = 22;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(0, 0, 82, Math.PI * 0.82, Math.PI * 2.18);
    c.stroke();
    c.shadowBlur = 0;
    c.fillStyle = '#7a5200';
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.9 + (i / 6) * Math.PI * 1.2;
      c.beginPath();
      c.arc(Math.cos(a) * 82, Math.sin(a) * 82, 3.5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    const r = rng(29);
    for (let i = 0; i < 9; i++) sparkle(c, 20 + r() * 216, 20 + r() * 216, 4 + r() * 7, i % 2 ? st.accent : '#ffffff');
  },
  inside(c) {
    c.save();
    c.translate(0, 8);
    drawSaddle(c, 64);
    c.restore();
  },
};

// 🪢 Leash：一卷繩（幾個圈疊埋）+ 皮手柄 + 銀色扣（唔畫水晶）
MOTIFS.leash = {
  front(c, st) {
    c.save();
    c.translate(118, 132);
    for (let i = 0; i < 4; i++) {
      c.save();
      c.rotate(-0.35 + i * 0.12);
      c.strokeStyle = '#6d4c2f';
      c.lineWidth = 15;
      c.beginPath();
      c.ellipse(0, i * 4 - 6, 70 - i * 4, 52 - i * 3, 0, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = i % 2 ? '#e0b276' : '#d7a86e';
      c.lineWidth = 10;
      c.setLineDash([12, 5]);
      c.stroke();
      c.restore();
    }
    c.setLineDash([]);
    // 繩尾 → 扣
    c.strokeStyle = '#d7a86e';
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(52, 30);
    c.quadraticCurveTo(96, 60, 100, 92);
    c.stroke();
    c.fillStyle = '#90a4ae';
    c.strokeStyle = '#37474f';
    c.lineWidth = 4;
    c.beginPath();
    c.roundRect(88, 88, 26, 34, 10);
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(101, 82, 8, 0, Math.PI * 2);
    c.stroke();
    // 皮手柄
    c.fillStyle = '#5d2f12';
    c.strokeStyle = '#2b160a';
    c.beginPath();
    c.roundRect(-92, -76, 46, 30, 12);
    c.fill();
    c.stroke();
    c.restore();
    const r = rng(17);
    for (let i = 0; i < 6; i++) sparkle(c, 24 + r() * 208, 24 + r() * 208, 4 + r() * 5, i % 2 ? st.glow : '#ffffff');
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
  if (!st.noShard) {
    drawShard(c, 74, 168, 0.42, -0.5, st); // 兩粒細水晶喺後面
    drawShard(c, 184, 172, 0.36, 0.45, st);
    drawShard(c, 128, 122, 0.98, 0.06, st, m.inside ? (cc) => m.inside(cc, st) : null);
  }
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
  if (st.motif === 'leash') return buildLeashModel();
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
  if (st.motif === 'demon') {
    // 😈 一對細彎角 + 底下紅火
    const hornM = glowMaterial('#3e0a0a', '#ff1744', 0.6);
    const tipM = glowMaterial('#ffab00', '#ff6d00', 2);
    for (const s of [-1, 1]) {
      const h = new THREE.Group();
      h.position.set(s * 0.12, 0.5, 0);
      h.rotation.z = s * -0.5;
      const b = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), hornM);
      b.position.y = 0.1;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 8), tipM);
      tip.position.set(s * 0.04, 0.24, 0);
      tip.rotation.z = s * -0.6;
      h.add(b, tip);
      spin.add(h);
    }
    const fire = glowMaterial('#d50000', '#ff1744', 1.6, 0.85);
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 5), i % 2 ? fire : glowMaterial('#1a0505', '#3e0a0a', 0.6, 0.9));
      const a = (i / 5) * TAU;
      f.position.set(Math.cos(a) * 0.28, -0.35, Math.sin(a) * 0.28);
      orbit.add(f);
    }
  }
  let hands = null;
  if (st.motif === 'clock') {
    // ⏳ 一個企直嘅金色時鐘圈喺水晶後面 + 兩支會行嘅針
    const gold = glowMaterial('#ffca28', '#ffb300', 1.5);
    const clock = new THREE.Group();
    clock.position.set(0, 0.1, -0.12);
    clock.add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 6, 40), gold));
    const tickGeo = new THREE.BoxGeometry(0.03, 0.09, 0.03);
    for (let i = 0; i < 12; i++) {
      const tk = new THREE.Mesh(tickGeo, i % 3 ? gold : glowMaterial('#ffffff', '#ffffff', 1.2));
      const a = (i / 12) * TAU;
      tk.position.set(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0);
      tk.rotation.z = a - Math.PI / 2;
      clock.add(tk);
    }
    hands = [0.3, 0.2].map((len, i) => {
      const h = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, len, 0.02), glowMaterial(i ? '#ffffff' : '#18ffff', i ? '#ffffff' : '#00e5ff', 1.4));
      m.position.y = len / 2;
      h.add(m);
      h.position.z = 0.03;
      clock.add(h);
      return h;
    });
    g.add(clock);
  }
  if (st.motif === 'cowboy') {
    // 🤠 頂上一頂細牛仔帽 + 斜斜一個繩圈
    const hatM = glowMaterial('#9a6233', '#5d2f12', 0.25);
    const hat = new THREE.Group();
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.025, 20), hatM);
    brim.scale.z = 0.85;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.15, 14), hatM);
    crown.position.y = 0.08;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.155, 0.035, 14), glowMaterial('#d84315', '#bf360c', 0.4));
    band.position.y = 0.03;
    hat.add(brim, crown, band);
    hat.position.y = 0.68;
    hat.rotation.z = 0.2;
    spin.add(hat);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.022, 6, 36), glowMaterial('#e0b276', '#8d5a2b', 0.3));
    rope.rotation.x = Math.PI / 2 - 0.4;
    g.add(rope);
  }
  if (st.motif === 'saddle') {
    // 🐎 後面一隻金色馬蹄鐵
    const shoe = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 30, Math.PI * 1.35), glowMaterial('#ffc400', '#ffab00', 1.1));
    shoe.rotation.z = -Math.PI * 0.175 + Math.PI;
    shoe.position.set(0, 0.15, -0.15);
    g.add(shoe);
  }
  g.userData.animate = (t) => {
    if (hands) {
      hands[0].rotation.z = -t * 2.4;
      hands[1].rotation.z = -t * 0.4;
    }
    spin.rotation.y = t * 1.2;
    orbit.rotation.y = -t * 2;
    g.position.y = (g.userData.baseY ?? 0) + Math.sin(t * 2.4) * 0.04;
  };
  return g;
}

// 🪢 Leash 3D：一卷繩 + 手柄 + 扣（拎喺手）
function buildLeashModel() {
  const g = new THREE.Group();
  const coil = new THREE.Group();
  const ropeA = glowMaterial('#d7a86e', '#6d4c2f', 0.15);
  const ropeB = glowMaterial('#e0b276', '#6d4c2f', 0.15);
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.3 - i * 0.015, 0.045, 6, 28), i % 2 ? ropeA : ropeB);
    r.position.y = i * 0.05 - 0.08;
    r.rotation.x = Math.PI / 2 + (i - 1.5) * 0.12;
    coil.add(r);
  }
  coil.rotation.z = 0.5;
  g.add(coil);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.09), glowMaterial('#5d2f12', '#2b160a', 0.2));
  handle.position.set(-0.28, 0.22, 0);
  const clip = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 16), new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.8, roughness: 0.3 }));
  clip.position.set(0.3, -0.25, 0);
  g.add(handle, clip);
  g.userData.animate = (t) => {
    coil.rotation.y = Math.sin(t * 1.5) * 0.25;
    clip.rotation.y = t * 2;
    g.position.y = (g.userData.baseY ?? 0) + Math.sin(t * 2.4) * 0.03;
  };
  return g;
}

// 共用：同一種 Gear 用返同一個模型（換嚟換去唔使重新整）
export function shardModel(type, slot) {
  const key = `${type}|${slot}`;
  if (!modelCache.has(key)) modelCache.set(key, buildShardModel(type));
  return modelCache.get(key);
}
