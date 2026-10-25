// 🗼 Witch Tower 每層主題嘅貼圖（canvas 即場畫，冇圖檔）—— towerFloors.js 用
// 2026-10-25 小朋友：「make the floor completely different each time you enter, more scarier and more different each floor」
// 全部 lazy：第一次要先畫，之後 cache 住
import * as THREE from 'three';
import { canvasTex, seeded } from './halloweenArt.js';

const PI = Math.PI;
const cache = new Map();
const once = (key, fn) => {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
};
const rgb = (r, g, b, k = 1) => `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
const smooth = (size, draw, wrap = true) => canvasTex(size, draw, { nearest: false, wrap });

// 一塊塊石／磚（共用）：base = 縫色、col = 磚色 [r,g,b]、h = 磚高、w = 磚闊
function bricks(g, s, r, { base, col, h = 22, w = 52, jit = 0.4, gap = 2 }) {
  g.fillStyle = base;
  g.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += h) {
    const off = (y / h) % 2 ? w / 2 : 0;
    for (let x = -w; x < s; x += w) {
      const k = 1 - jit / 2 + r() * jit;
      g.fillStyle = rgb(...col, k);
      g.fillRect(x + off + gap, y + gap, w - gap * 2, h - gap * 2);
      g.fillStyle = 'rgba(255,255,255,0.05)';
      g.fillRect(x + off + gap, y + gap, w - gap * 2, 3);
    }
  }
}
function crack(g, r, x, y, n = 5, len = 12, color = 'rgba(0,0,0,0.6)', lw = 1.5) {
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.beginPath();
  g.moveTo(x, y);
  for (let i = 0; i < n; i++) g.lineTo((x += (r() - 0.5) * len), (y += (r() - 0.3) * len * 0.7));
  g.stroke();
}
function dots(g, r, s, n, colors, rMin = 1, rMax = 3) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(r() * colors.length)];
    g.beginPath();
    g.arc(r() * s, r() * s, rMin + r() * (rMax - rMin), 0, PI * 2);
    g.fill();
  }
}

// ================= 地板 =================
export const FLOOR_TEX = {
  // 🎃 南瓜田：泥土 + 草 + 落葉
  pumpkin: () => once('f-pumpkin', () => smooth(256, (g, s) => {
    const r = seeded(11);
    g.fillStyle = '#3b2616';
    g.fillRect(0, 0, s, s);
    dots(g, r, s, 900, ['#4a3020', '#2f1d10', '#553722', '#3f2a18'], 1, 4);
    // 一行行犁過嘅泥
    for (let y = 8; y < s; y += 32) {
      g.fillStyle = 'rgba(20,10,4,0.35)';
      g.fillRect(0, y, s, 6);
      g.fillStyle = 'rgba(120,80,40,0.18)';
      g.fillRect(0, y + 6, s, 3);
    }
    // 草
    for (let i = 0; i < 160; i++) {
      const x = r() * s;
      const y = r() * s;
      g.strokeStyle = ['#3d6b2a', '#4f7f2f', '#2f5320'][Math.floor(r() * 3)];
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 6, y - 5 - r() * 6);
      g.stroke();
    }
    // 落葉
    for (let i = 0; i < 40; i++) {
      g.save();
      g.translate(r() * s, r() * s);
      g.rotate(r() * PI * 2);
      g.fillStyle = ['#d35400', '#e67e22', '#a04000', '#f1c40f'][Math.floor(r() * 4)];
      g.beginPath();
      g.ellipse(0, 0, 6, 3, 0, 0, PI * 2);
      g.fill();
      g.restore();
    }
  })),
  // ❄️ 冰：一塊塊淺藍冰磚 + 雪
  frost: () => once('f-frost', () => smooth(256, (g, s) => {
    const r = seeded(12);
    bricks(g, s, r, { base: '#5d7fa6', col: [170, 205, 235], h: 64, w: 64, jit: 0.25, gap: 2 });
    for (let i = 0; i < 18; i++) crack(g, r, r() * s, r() * s, 5, 18, 'rgba(255,255,255,0.55)', 1.2);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath();
      g.ellipse(r() * s, r() * s, 6 + r() * 14, 3 + r() * 6, r() * PI, 0, PI * 2);
      g.fill();
    }
  })),
  // 🕷️ 蜘蛛洞：濕濕嘅黑綠石
  spider: () => once('f-spider', () => smooth(256, (g, s) => {
    const r = seeded(13);
    g.fillStyle = '#16170f';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) { // 圓石
      const k = 0.6 + r() * 0.6;
      g.fillStyle = rgb(48, 52, 40, k);
      g.beginPath();
      g.ellipse(r() * s, r() * s, 10 + r() * 18, 8 + r() * 12, r() * PI, 0, PI * 2);
      g.fill();
    }
    dots(g, r, s, 120, ['rgba(110,150,60,0.35)', 'rgba(20,24,14,0.7)'], 1, 5);
    // 地上一啲蜘蛛絲
    g.strokeStyle = 'rgba(220,230,210,0.18)';
    g.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.moveTo(r() * s, r() * s);
      g.lineTo(r() * s, r() * s);
      g.stroke();
    }
  })),
  // 🪦 墓園：泥 + 苔 + 石板路
  crypt: () => once('f-crypt', () => smooth(256, (g, s) => {
    const r = seeded(14);
    g.fillStyle = '#1f2419';
    g.fillRect(0, 0, s, s);
    dots(g, r, s, 700, ['#28301f', '#1a1e14', '#2f3a22', '#232a1b'], 1, 4);
    for (let i = 0; i < 9; i++) { // 石板
      const k = 0.7 + r() * 0.4;
      g.fillStyle = rgb(80, 82, 86, k);
      const x = r() * s;
      const y = r() * s;
      g.beginPath();
      g.ellipse(x, y, 14 + r() * 10, 10 + r() * 7, r() * PI, 0, PI * 2);
      g.fill();
      crack(g, r, x - 6, y - 4, 3, 8);
    }
    for (let i = 0; i < 120; i++) {
      const x = r() * s;
      const y = r() * s;
      g.strokeStyle = ['#3a4a28', '#2d3b1f', '#4a5a30'][Math.floor(r() * 3)];
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 5, y - 4 - r() * 5);
      g.stroke();
    }
  })),
  // ⛓️ 鐵鏈監獄：鐵網 + 生鏽
  chains: () => once('f-chains', () => smooth(256, (g, s) => {
    const r = seeded(15);
    bricks(g, s, r, { base: '#0e0d10', col: [58, 54, 56], h: 64, w: 64, jit: 0.3, gap: 3 });
    // 中間一塊鐵網
    g.fillStyle = 'rgba(0,0,0,0.65)';
    g.fillRect(70, 70, 116, 116);
    g.strokeStyle = '#5a5054';
    g.lineWidth = 4;
    for (let k = 76; k <= 180; k += 13) {
      g.beginPath(); g.moveTo(k, 70); g.lineTo(k, 186); g.stroke();
      g.beginPath(); g.moveTo(70, k); g.lineTo(186, k); g.stroke();
    }
    g.strokeStyle = '#2a2427';
    g.lineWidth = 6;
    g.strokeRect(70, 70, 116, 116);
    dots(g, r, s, 60, ['rgba(140,70,30,0.35)', 'rgba(110,50,20,0.3)'], 2, 7); // 鏽
  })),
  // 🌋 熔岩地牢：黑色玄武岩（裂紋發光用 LAVA_GLOW）
  lava: () => once('f-lava', () => smooth(256, (g, s) => {
    const r = seeded(16);
    g.fillStyle = '#120807';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 46; i++) {
      const k = 0.6 + r() * 0.5;
      g.fillStyle = rgb(52, 36, 34, k);
      const x = r() * s;
      const y = r() * s;
      g.beginPath();
      const n = 6;
      for (let j = 0; j < n; j++) {
        const a = (j / n) * PI * 2;
        const rr = 14 + r() * 12;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.fill();
    }
    lavaCracks(g, seeded(161), s, '#ff5a1a', 3);
  })),
  // 🌕 血月天台：屋頂瓦（深紅灰）
  bloodmoon: () => once('f-bloodmoon', () => smooth(256, (g, s) => {
    const r = seeded(17);
    g.fillStyle = '#120a0c';
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 24) {
      const off = (y / 24) % 2 ? 16 : 0;
      for (let x = -32; x < s; x += 32) {
        const k = 0.6 + r() * 0.5;
        g.fillStyle = rgb(62, 44, 52, k);
        g.beginPath();
        g.moveTo(x + off + 2, y + 2);
        g.lineTo(x + off + 30, y + 2);
        g.lineTo(x + off + 30, y + 16);
        g.quadraticCurveTo(x + off + 16, y + 26, x + off + 2, y + 16);
        g.fill();
        if (r() < 0.08) { // 冇咗塊瓦
          g.fillStyle = '#07040a';
          g.fillRect(x + off + 6, y + 5, 18, 12);
        }
      }
    }
    dots(g, r, s, 50, ['rgba(150,40,50,0.2)'], 3, 8);
  })),
  // 🌌 虛空：黑紫 + 星
  void: () => once('f-void', () => smooth(256, (g, s) => {
    const r = seeded(18);
    g.fillStyle = '#07040e';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = `rgba(${60 + r() * 60},20,${110 + r() * 80},0.18)`;
      g.beginPath();
      g.ellipse(r() * s, r() * s, 20 + r() * 40, 10 + r() * 20, r() * PI, 0, PI * 2);
      g.fill();
    }
    dots(g, r, s, 140, ['#ffffff', '#d1b3ff', '#8c9eff'], 0.4, 1.4);
  })),
};
function lavaCracks(g, r, s, color, lw) {
  g.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    let x = r() * s;
    let y = r() * s;
    g.strokeStyle = color;
    g.lineWidth = lw + r() * 2;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 6; k++) g.lineTo((x += (r() - 0.5) * 40), (y += (r() - 0.5) * 40));
    g.stroke();
  }
}
// 🌋 地板發光（emissiveMap）：淨係裂紋
export const LAVA_GLOW = () => once('lava-glow', () => smooth(256, (g, s) => {
  g.fillStyle = '#000';
  g.fillRect(0, 0, s, s);
  lavaCracks(g, seeded(161), s, '#ff6a00', 3);
  g.globalAlpha = 0.5;
  lavaCracks(g, seeded(161), s, '#ffd180', 1);
}));
// 🌌 虛空地板發光：符文格 + 星
export const VOID_GLOW = () => once('void-glow', () => smooth(256, (g, s) => {
  const r = seeded(18);
  g.fillStyle = '#000';
  g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(170,90,255,0.55)';
  g.lineWidth = 2;
  for (let k = 0; k <= s; k += 64) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k, s); g.stroke();
    g.beginPath(); g.moveTo(0, k); g.lineTo(s, k); g.stroke();
  }
  dots(g, r, s, 140, ['#ffffff', '#d1b3ff', '#8c9eff'], 0.4, 1.4);
}));

// ================= 牆（入面）=================
export const WALL_TEX = {
  pumpkin: () => once('w-pumpkin', () => smooth(256, (g, s) => { // 木板牆 + 藤
    const r = seeded(21);
    g.fillStyle = '#1a0f08';
    g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 32) {
      const k = 0.65 + r() * 0.45;
      g.fillStyle = rgb(78, 48, 28, k);
      g.fillRect(x + 2, 0, 28, s);
      for (let i = 0; i < 5; i++) { // 木紋
        g.fillStyle = 'rgba(0,0,0,0.2)';
        g.fillRect(x + 4 + r() * 22, r() * s, 1.5, 20 + r() * 40);
      }
      g.fillStyle = '#2a2a2a';
      g.fillRect(x + 14, 30, 4, 4);
      g.fillRect(x + 14, 220, 4, 4);
    }
    g.strokeStyle = '#2e5a1c';
    g.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      let x = r() * s;
      g.moveTo(x, s);
      for (let y = s; y > 0; y -= 20) g.lineTo((x += (r() - 0.5) * 26), y);
      g.stroke();
    }
    dots(g, r, s, 50, ['#3d7a26', '#2e5a1c'], 3, 6);
  })),
  frost: () => once('w-frost', () => smooth(256, (g, s) => {
    const r = seeded(22);
    bricks(g, s, r, { base: '#24364d', col: [96, 130, 170], h: 22, w: 52, jit: 0.35 });
    g.fillStyle = 'rgba(235,245,255,0.55)'; // 磚頂嘅雪
    for (let y = 0; y < s; y += 22) for (let x = 0; x < s; x += 8) if (r() < 0.6) g.fillRect(x, y + 2, 8, 2 + r() * 3);
    for (let i = 0; i < 20; i++) crack(g, r, r() * s, r() * s, 4, 14, 'rgba(220,240,255,0.4)', 1);
  })),
  spider: () => once('w-spider', () => smooth(256, (g, s) => { // 粗石洞壁
    const r = seeded(23);
    g.fillStyle = '#0d0e09';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      const k = 0.5 + r() * 0.6;
      g.fillStyle = rgb(44, 46, 36, k);
      g.beginPath();
      g.ellipse(r() * s, r() * s, 12 + r() * 22, 8 + r() * 14, r() * PI, 0, PI * 2);
      g.fill();
    }
    dots(g, r, s, 80, ['rgba(100,140,50,0.3)'], 2, 6);
  })),
  crypt: () => once('w-crypt', () => smooth(256, (g, s) => { // 大石磚 + 苔 + 細龕
    const r = seeded(24);
    bricks(g, s, r, { base: '#0e100c', col: [70, 74, 66], h: 32, w: 64, jit: 0.4, gap: 3 });
    for (let i = 0; i < 26; i++) {
      g.fillStyle = 'rgba(70,110,50,0.4)';
      g.fillRect(r() * s, r() * s, 10 + r() * 14, 4 + r() * 4);
    }
    for (let i = 0; i < 10; i++) crack(g, r, r() * s, r() * s, 5, 14);
  })),
  chains: () => once('w-chains', () => smooth(256, (g, s) => { // 黑鐵磚 + 鉚釘 + 鏽水痕
    const r = seeded(25);
    bricks(g, s, r, { base: '#09080a', col: [46, 44, 48], h: 32, w: 64, jit: 0.3, gap: 2 });
    g.fillStyle = '#6b6066';
    for (let y = 6; y < s; y += 32) for (let x = 6; x < s; x += 32) g.fillRect(x, y, 3, 3);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = 'rgba(130,60,25,0.35)';
      g.fillRect(r() * s, r() * s, 3 + r() * 3, 30 + r() * 70);
    }
  })),
  lava: () => once('w-lava', () => smooth(256, (g, s) => {
    const r = seeded(26);
    bricks(g, s, r, { base: '#070302', col: [44, 30, 28], h: 26, w: 46, jit: 0.45 });
    lavaCracks(g, seeded(262), s, '#c43c0a', 2);
  })),
  bloodmoon: () => once('w-bloodmoon', () => smooth(256, (g, s) => { // 爛咗嘅磚牆
    const r = seeded(27);
    bricks(g, s, r, { base: '#0c0608', col: [70, 40, 46], h: 22, w: 52, jit: 0.5 });
    for (let i = 0; i < 9; i++) { // 跌咗嘅磚（窿）
      g.fillStyle = '#050204';
      g.fillRect(Math.floor(r() * 5) * 52 + (r() < 0.5 ? 26 : 0), Math.floor(r() * 11) * 22 + 2, 48, 18);
    }
    for (let i = 0; i < 14; i++) crack(g, r, r() * s, r() * s, 5, 14);
  })),
  void: () => once('w-void', () => smooth(256, (g, s) => {
    const r = seeded(28);
    g.fillStyle = '#05030a';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 20; i++) { // 浮動嘅黑石
      g.fillStyle = rgb(28, 22, 40, 0.6 + r() * 0.6);
      g.beginPath();
      g.ellipse(r() * s, r() * s, 10 + r() * 20, 6 + r() * 10, r() * PI, 0, PI * 2);
      g.fill();
    }
  })),
};
// 牆嘅發光貼圖（emissiveMap）：熔岩裂紋、虛空星星
export const WALL_GLOW = {
  lava: () => once('wg-lava', () => smooth(256, (g, s) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, s, s);
    lavaCracks(g, seeded(262), s, '#ff5a00', 2);
  })),
  void: () => once('wg-void', () => smooth(256, (g, s) => {
    const r = seeded(29);
    g.fillStyle = '#000';
    g.fillRect(0, 0, s, s);
    dots(g, r, s, 90, ['#ffffff', '#b388ff', '#82b1ff', '#ea80fc'], 0.5, 1.6);
    g.strokeStyle = 'rgba(179,136,255,0.5)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) crack(g, r, r() * s, r() * s, 6, 30, 'rgba(179,136,255,0.6)', 1.5);
  })),
};

// ================= 道具用 =================
// 🕸️ 蜘蛛網（白線，透明底）
export const webTex = () => once('web', () => smooth(256, (g, s) => {
  g.clearRect(0, 0, s, s);
  const c = s / 2;
  const r = seeded(41);
  g.strokeStyle = 'rgba(240,240,235,0.85)';
  g.lineWidth = 2;
  const spokes = 12;
  const ang = [];
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * PI * 2 + (r() - 0.5) * 0.2;
    ang.push(a);
    g.beginPath();
    g.moveTo(c, c);
    g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c);
    g.stroke();
  }
  g.lineWidth = 1.4;
  for (let ring = 14; ring < c; ring += 13 + r() * 4) {
    g.beginPath();
    ang.forEach((a, i) => {
      const rr = ring * (0.92 + r() * 0.12);
      const x = c + Math.cos(a) * rr;
      const y = c + Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y);
      else g.quadraticCurveTo(c + Math.cos(a - 0.26) * rr * 0.9, c + Math.sin(a - 0.26) * rr * 0.9, x, y);
    });
    g.closePath();
    g.stroke();
  }
}, false));
// 👀 一對發光眼（白色，用材質上色）
export const eyesTex = () => once('eyes', () => smooth(128, (g, s) => {
  g.clearRect(0, 0, s, s);
  for (const x of [38, 90]) {
    const gr = g.createRadialGradient(x, 64, 0, x, 64, 26);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, 64, 24, 16, x < 64 ? 0.25 : -0.25, 0, PI * 2);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.85)'; // 瞳孔（一條縫）
    g.beginPath();
    g.ellipse(x, 64, 3, 10, 0, 0, PI * 2);
    g.fill();
  }
}, false));
// 🎃 南瓜燈個樣（發光貼圖：黑 = 唔發光）
export const jackTex = () => once('jack', () => smooth(256, (g, s) => {
  g.fillStyle = '#000';
  g.fillRect(0, 0, s, s);
  g.fillStyle = '#ffd54f';
  // 眼（三角）
  for (const x of [88, 168]) {
    g.beginPath();
    g.moveTo(x - 26, 120);
    g.lineTo(x + 26, 120);
    g.lineTo(x, 78);
    g.fill();
  }
  // 鼻
  g.beginPath();
  g.moveTo(118, 150); g.lineTo(138, 150); g.lineTo(128, 132); g.fill();
  // 笑口（有牙）
  g.beginPath();
  g.moveTo(60, 170);
  g.quadraticCurveTo(128, 240, 196, 170);
  g.quadraticCurveTo(128, 200, 60, 170);
  g.fill();
  g.fillStyle = '#000';
  g.fillRect(100, 178, 14, 12);
  g.fillRect(142, 178, 14, 12);
}, false));
// 🌕 血月
export const moonTex = () => once('moon', () => smooth(256, (g, s) => {
  const c = s / 2;
  g.clearRect(0, 0, s, s);
  const halo = g.createRadialGradient(c, c, c * 0.5, c, c, c);
  halo.addColorStop(0, 'rgba(255,60,40,0.55)');
  halo.addColorStop(1, 'rgba(255,0,0,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, s, s);
  const body = g.createRadialGradient(c - 18, c - 18, 6, c, c, c * 0.5);
  body.addColorStop(0, '#ff8a65');
  body.addColorStop(0.7, '#d84315');
  body.addColorStop(1, '#8e1b0e');
  g.fillStyle = body;
  g.beginPath();
  g.arc(c, c, c * 0.5, 0, PI * 2);
  g.fill();
  const r = seeded(51);
  for (let i = 0; i < 9; i++) {
    g.fillStyle = 'rgba(110,20,10,0.45)';
    const a = r() * PI * 2;
    const d = r() * c * 0.38;
    g.beginPath();
    g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, 4 + r() * 10, 0, PI * 2);
    g.fill();
  }
}, false));
// 🌫️ 一嚿霧（軟邊）
export const mistTex = () => once('mist', () => smooth(128, (g, s) => {
  g.clearRect(0, 0, s, s);
  const r = seeded(61);
  for (let i = 0; i < 7; i++) {
    const x = 30 + r() * 68;
    const y = 40 + r() * 48;
    const gr = g.createRadialGradient(x, y, 0, x, y, 34);
    gr.addColorStop(0, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
  }
}, false));
// 🪦 墓碑字（RIP）
export const ripTex = () => once('rip', () => smooth(128, (g, s) => {
  g.fillStyle = '#7b7f86';
  g.fillRect(0, 0, s, s);
  const r = seeded(71);
  dots(g, r, s, 200, ['#6c7077', '#8a8e95', '#5f636a'], 1, 3);
  g.fillStyle = '#3a3d42';
  g.font = '900 40px "Trebuchet MS", system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('RIP', 64, 62);
  g.fillRect(34, 80, 60, 5);
  g.fillRect(40, 94, 48, 5);
  dots(g, r, s, 14, ['rgba(70,110,50,0.6)'], 3, 7);
}));
// 👻 影子人（黑色剪影 + 眼）：最高層數先出
export const shadowTex = () => once('shadow', () => smooth(128, (g, s) => {
  g.clearRect(0, 0, s, s);
  g.fillStyle = 'rgba(4,0,10,0.92)';
  g.beginPath();
  g.arc(64, 34, 20, 0, PI * 2); // 頭
  g.fill();
  g.beginPath();
  g.moveTo(36, 128);
  g.quadraticCurveTo(30, 60, 64, 50);
  g.quadraticCurveTo(98, 60, 92, 128);
  g.fill();
  g.fillStyle = '#ff1744';
  g.beginPath(); g.arc(57, 34, 3, 0, PI * 2); g.fill();
  g.beginPath(); g.arc(71, 34, 3, 0, PI * 2); g.fill();
}, false));
