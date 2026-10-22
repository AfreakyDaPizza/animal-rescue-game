// 🏰 Witch Castle 重做（小朋友 Issue #12：「The fortress is too ugly and too blank.」）
// 淨係「樣」：位置／牆／行得嘅地方全部跟 hellShape.js（KEEP、COURTYARD、HELL_BLOCKS、TOWER…），玩法唔變
//
// 有咩：
// - 🧱 有紋理嘅石牆（canvas 像素紋理）、高牆 + 城垛 + 牆頂走道、箭窗、扶壁
// - 🏯 主樓：大門、玫瑰窗、旗幟、中間大塔 + 尖頂、4 個角樓（尖屋頂 + 發光窗）、飛扶壁
// - 🚪 大閘樓：兩座塔、尖拱門、吊起嘅鐵閘（有尖）、鐵鏈、旗、機槍孔（machicolation）
// - 🗿 石像鬼（發綠光眼）、⛓️ 鐵鏈、🔥 綠／紫色巫火火盆、吊籠、藥水架、🍄 巫婆花園（發光菇 + 扭曲樹）
// - 🔮 庭園地上嘅魔法陣（會轉）、浮住嘅蠟燭、大鍋冒煙、🦇 蝙蝠圍住座塔飛、🌋 熔岩瀑布由島邊流落去
// - 🗼 Witch Tower：發光符文螺旋上去（一浪浪光向上走）、陽台 + 石像鬼、好有氣勢嘅發光門
//
// 效能：
// - 唔郁嘅嘢全部砌入一個 group，最後一步 bakeStatic → 每隻材質一個 draw call
// - 會郁嘅細嘢（火焰、蠟燭、蝙蝠）用 InstancedMesh；煙／閃粉用 Points
// - quality ≤ 1：收埋蝙蝠、煙、閃粉，蠟燭減半；quality 0 再收埋蠟燭
//
// hellWorld.js 用法：
//   const castle = buildWitchCastle({ root, live, steps, topMat, sideMat, jaggedCone, swirlTex })
//   castle.update(dt, t, quality)   // 每格

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { addCollider, bakeStatic } from './world.js';
import { makeSign, THEMES } from './signs.js';
import { state } from './state.js';
import {
  M, GLOW, add, box, cyl, cone, ball, canvasTex, seeded, glowTex, lightPool, halo, tiledBox, plankTex,
  twistedTree, shroomCluster, giantShroom, pumpkin,
} from './halloweenArt.js';
import {
  HELL, LAVA_Y, CASTLE_TOP, CASTLE_ISLAND, KEEP, COURTYARD, CASTLE_GATE_Z, WITCH, CAULDRON, TOWER, TOWER_DOOR, HELL_BLOCKS,
} from './hellShape.js';

const PI = Math.PI;
const HX = HELL.x;
const rgb = (r, g, b, a = 1) => `rgba(${Math.max(0, Math.min(255, r)) | 0},${Math.max(0, Math.min(255, g)) | 0},${Math.max(0, Math.min(255, b)) | 0},${a})`;

// ======================== 紋理（canvas 像素風）========================
// 長方形 canvas（旗幟用）
function rectTex(w, h, draw, { nearest = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) t.magFilter = THREE.NearestFilter;
  t.anisotropy = 4;
  return t;
}
// 城堡大石磚：每行石塊闊窄唔同、有光邊陰影邊、裂紋、青苔、煙燻
function stoneTex(base, seed, { moss = 0.22, glowCrack = 0 } = {}) {
  return canvasTex(128, (ctx, s) => {
    const rand = seeded(seed);
    ctx.fillStyle = rgb(base[0] * 0.32, base[1] * 0.3, base[2] * 0.34);
    ctx.fillRect(0, 0, s, s);
    const rowH = 16;
    for (let r = 0; r < s / rowH; r++) {
      const widths = [];
      let sum = 0;
      while (sum < s) {
        let w = [16, 24, 32, 32, 40][Math.floor(rand() * 5)];
        if (s - sum - w < 16) w = s - sum;
        widths.push(w);
        sum += w;
      }
      let x = Math.floor(rand() * 8) * 2;
      for (const w of widths) {
        const tone = (rand() - 0.5) * 22;
        const y0 = r * rowH;
        for (const ox of [0, -s]) {
          const bx = x + ox;
          for (let yy = 0; yy < rowH - 2; yy += 2)
            for (let xx = 0; xx < w - 2; xx += 2) {
              let l = tone + (rand() - 0.5) * 9;
              if (yy < 2 || xx < 2) l += 13; // 光邊
              if (yy > rowH - 6 || xx > w - 6) l -= 11; // 陰影邊
              ctx.fillStyle = rgb(base[0] + l, base[1] + l, base[2] + l);
              ctx.fillRect(bx + 1 + xx, y0 + 1 + yy, 2, 2);
            }
        }
        // 裂紋
        if (rand() < 0.22) {
          ctx.fillStyle = glowCrack && rand() < glowCrack ? 'rgba(255,120,40,0.9)' : rgb(base[0] * 0.3, base[1] * 0.3, base[2] * 0.3);
          let cx = x + 4 + Math.floor(rand() * (w - 8) / 2) * 2, cy = y0 + 2;
          for (let k = 0; k < 6; k++) {
            ctx.fillRect(((cx % s) + s) % s, cy, 2, 2);
            cx += rand() < 0.5 ? 2 : -2;
            cy += 2;
          }
        }
        // 青苔（石塊底）
        if (rand() < moss) {
          ctx.fillStyle = 'rgba(96,140,72,0.6)';
          const mx = x + 2 + Math.floor(rand() * Math.max(1, (w - 10) / 2)) * 2;
          ctx.fillRect(((mx % s) + s) % s, y0 + rowH - 5, 6 + Math.floor(rand() * 3) * 2, 3);
        }
        x += w;
      }
    }
    // 煙燻（直條，上下接得順）
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(Math.floor(rand() * 60) * 2, 0, 4 + Math.floor(rand() * 4) * 2, s);
    }
  });
}
// 庭園大石板地：唔規則大石板 + 少少發光熔岩縫
function flagTex() {
  return canvasTex(128, (ctx, s) => {
    const rand = seeded(4242);
    ctx.fillStyle = '#1b1218';
    ctx.fillRect(0, 0, s, s);
    const cells = [];
    for (let gy = 0; gy < 4; gy++)
      for (let gx = 0; gx < 4; gx++) {
        let w = 1, h = 1;
        if (gx < 3 && rand() < 0.3) w = 2;
        else if (gy < 3 && rand() < 0.25) h = 2;
        cells.push([gx, gy, w, h]);
      }
    const used = new Set();
    for (const [gx, gy, w, h] of cells) {
      if (used.has(gx + gy * 4)) continue;
      let ww = w, hh = h;
      if (ww === 2 && used.has(gx + 1 + gy * 4)) ww = 1;
      if (hh === 2 && used.has(gx + (gy + 1) * 4)) hh = 1;
      for (let a = 0; a < ww; a++) for (let b = 0; b < hh; b++) used.add(gx + a + (gy + b) * 4);
      const tone = (rand() - 0.5) * 18;
      const base = [78, 64, 74];
      const x0 = gx * 32, y0 = gy * 32, W = ww * 32, H = hh * 32;
      for (let yy = 2; yy < H - 2; yy += 2)
        for (let xx = 2; xx < W - 2; xx += 2) {
          let l = tone + (rand() - 0.5) * 8;
          if (yy < 4 || xx < 4) l += 10;
          if (yy > H - 6 || xx > W - 6) l -= 10;
          ctx.fillStyle = rgb(base[0] + l, base[1] + l, base[2] + l);
          ctx.fillRect(x0 + xx, y0 + yy, 2, 2);
        }
      if (rand() < 0.35) { // 裂紋
        ctx.fillStyle = 'rgba(20,10,14,0.9)';
        let cx = x0 + 6 + Math.floor(rand() * (W - 12) / 2) * 2, cy = y0 + 4;
        for (let k = 0; k < 9; k++) {
          ctx.fillRect(cx, cy, 2, 2);
          cx += rand() < 0.5 ? 2 : -2;
          cy += 2;
        }
      }
    }
    // 少少石縫發熔岩光
    ctx.fillStyle = 'rgba(255,90,30,0.55)';
    for (let i = 0; i < 6; i++) ctx.fillRect(Math.floor(rand() * 4) * 32, Math.floor(rand() * 64) * 2, 2, 6 + Math.floor(rand() * 6) * 2);
  });
}
// 魚鱗瓦（深紫）
function slateTex() {
  return canvasTex(64, (ctx, s) => {
    const rand = seeded(1313);
    ctx.fillStyle = '#120a1a';
    ctx.fillRect(0, 0, s, s);
    for (let r = 0; r < 8; r++)
      for (let i = -1; i < 5; i++) {
        const x = i * 16 + (r % 2) * 8, y = r * 8;
        const l = (rand() - 0.5) * 16;
        for (let yy = 0; yy < 8; yy += 2)
          for (let xx = 0; xx < 14; xx += 2) {
            const edge = Math.abs(xx - 6) / 7;
            if (yy >= 6 && edge > 0.6) continue; // 圓底
            let k = l + (yy === 0 ? 14 : 0) - yy * 1.5;
            if (yy >= 4 && edge > 0.8) k -= 14;
            ctx.fillStyle = rgb(70 + k, 40 + k, 96 + k);
            ctx.fillRect(x + 1 + xx, y + yy, 2, 2);
          }
      }
  });
}
// 哥德式窗（尖拱 + 鉛條菱格）：白黃色，用 emissive 顏色染色
function windowTex() {
  return canvasTex(64, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const arch = () => {
      ctx.beginPath();
      ctx.moveTo(8, 63);
      ctx.lineTo(8, 26);
      ctx.quadraticCurveTo(8, 8, 32, 1);
      ctx.quadraticCurveTo(56, 8, 56, 26);
      ctx.lineTo(56, 63);
      ctx.closePath();
    };
    arch();
    const g = ctx.createLinearGradient(0, 64, 0, 0);
    g.addColorStop(0, '#fff6c8');
    g.addColorStop(0.6, '#ffd890');
    g.addColorStop(1, '#ffb070');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    arch();
    ctx.clip();
    ctx.strokeStyle = '#1a0f14';
    ctx.lineWidth = 2;
    for (let k = -64; k < 128; k += 10) { // 菱格
      ctx.beginPath();
      ctx.moveTo(k, 64);
      ctx.lineTo(k + 64, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + 64, 64);
      ctx.stroke();
    }
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(32, 8);
    ctx.lineTo(32, 64);
    ctx.moveTo(8, 34);
    ctx.lineTo(56, 34);
    ctx.stroke();
    ctx.restore();
    arch();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#120a10';
    ctx.stroke();
  });
}
// 旗幟：深紫布 + 金邊 + 燕尾 + 女巫帽月亮徽章
function bannerTex() {
  return rectTex(64, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath(); // 燕尾形
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(w / 2, h - 26);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    for (let x = 0; x < w; x += 2) { // 布摺
      const k = Math.sin(x * 0.2) * 14;
      ctx.fillStyle = rgb(78 + k, 20 + k * 0.4, 128 + k);
      ctx.fillRect(x, 0, 2, h);
    }
    ctx.fillStyle = '#ffc107'; // 金邊
    ctx.fillRect(0, 0, 4, h);
    ctx.fillRect(w - 4, 0, 4, h);
    ctx.fillRect(0, 10, w, 4);
    ctx.fillStyle = '#76ff03'; // 綠色條
    ctx.fillRect(8, 18, w - 16, 2);
    ctx.fillRect(8, h - 52, w - 16, 2);
    // 月亮（金）
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(32, 74, 17, 0, PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(80, 22, 130);
    ctx.beginPath();
    ctx.arc(40, 68, 15, 0, PI * 2);
    ctx.fill();
    // 女巫帽（黑 + 綠帶）
    ctx.fillStyle = '#120818';
    ctx.beginPath();
    ctx.moveTo(14, 66);
    ctx.lineTo(50, 66);
    ctx.lineTo(44, 62);
    ctx.lineTo(36, 34);
    ctx.lineTo(42, 30);
    ctx.lineTo(30, 36);
    ctx.lineTo(22, 62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#76ff03';
    ctx.fillRect(23, 57, 19, 4);
    // 星星
    ctx.fillStyle = '#fff59d';
    for (const [x, y] of [[14, 40], [50, 96], [18, 104]]) {
      ctx.fillRect(x - 1, y - 4, 2, 8);
      ctx.fillRect(x - 4, y - 1, 8, 2);
    }
    ctx.restore();
  });
}
// 符文（4×4 格，每格一個發光字）：黑底，加法混合
function runeTex() {
  return canvasTex(128, (ctx, s) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, s, s);
    const rand = seeded(777);
    ctx.lineCap = 'round';
    for (let gy = 0; gy < 4; gy++)
      for (let gx = 0; gx < 4; gx++) {
        const cx = gx * 32 + 16, cy = gy * 32 + 16;
        ctx.strokeStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 5;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 11);
        ctx.lineTo(cx, cy + 11); // 主幹
        const n = 1 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
          const y = cy - 9 + rand() * 16, d = rand() < 0.5 ? -1 : 1;
          ctx.moveTo(cx, y);
          ctx.lineTo(cx + d * (5 + rand() * 4), y + (rand() - 0.3) * 9);
        }
        if (rand() < 0.5) {
          ctx.moveTo(cx - 6, cy + 2);
          ctx.lineTo(cx, cy - 4);
          ctx.lineTo(cx + 6, cy + 2);
        }
        ctx.stroke();
        if (rand() < 0.4) {
          ctx.beginPath();
          ctx.arc(cx + (rand() < 0.5 ? -6 : 6), cy - 7, 2.2, 0, PI * 2);
          ctx.stroke();
        }
      }
  }, { nearest: false });
}
// 魔法陣（綠 + 紫，加法混合）：幾個圈、八角星、一圈符文、四個月亮
function circleTex() {
  return canvasTex(512, (ctx, s) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, s, s);
    const c = s / 2;
    ctx.translate(c, c);
    ctx.lineCap = 'round';
    const glow = (col, blur = 12) => {
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = blur;
    };
    const ring = (r, w) => {
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, PI * 2);
      ctx.stroke();
    };
    glow('#b9ff6a');
    ring(240, 6);
    ring(224, 2.5);
    ring(150, 4);
    ring(60, 3);
    // 一圈符文
    const rand = seeded(99);
    ctx.lineWidth = 3;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(0, -188);
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      const n = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const y = -10 + rand() * 18, d = rand() < 0.5 ? -1 : 1;
        ctx.moveTo(0, y);
        ctx.lineTo(d * 7, y + (rand() - 0.4) * 8);
      }
      ctx.stroke();
      ctx.restore();
    }
    // 八角星（兩個正方形）
    glow('#e48bff');
    ctx.lineWidth = 4;
    for (const rot of [0, PI / 4]) {
      ctx.beginPath();
      for (let k = 0; k <= 4; k++) {
        const a = rot + (k / 4) * PI * 2;
        ctx.lineTo(Math.cos(a) * 150, Math.sin(a) * 150);
      }
      ctx.stroke();
    }
    // 四個月亮 + 細點
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + PI / 8 * 0;
      const x = Math.cos(a + PI / 4) * 105, y = Math.sin(a + PI / 4) * 105;
      glow('#e48bff');
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(x + 7, y - 5, 14, 0, PI * 2);
      ctx.fill();
    }
    glow('#b9ff6a');
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 232, Math.sin(a) * 232, 5, 0, PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, PI * 2);
    ctx.fill();
  }, { nearest: false, wrap: false });
}
// 熔岩瀑布：直條光紋（上下重複，兩邊淡出）
function lavaFallTex() {
  return canvasTex(64, (ctx, s) => {
    const rand = seeded(55);
    for (let x = 0; x < s; x += 2) {
      const edge = Math.min(1, Math.min(x, s - 2 - x) / 14);
      for (let y = 0; y < s; y += 2) {
        const n = Math.sin(x * 0.45 + Math.sin(y * 0.1 + x) * 1.5) * 0.5 + 0.5;
        const crust = Math.sin(y * 0.2 + x * 0.05) > 0.85 ? 0.45 : 1;
        ctx.fillStyle = rgb(255 * crust, (80 + n * 150) * crust, (10 + n * 50) * crust, edge * (0.75 + rand() * 0.25));
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }, { nearest: false });
}
// 火焰：白色漸變（底實頂透明），用材質顏色染色
function whiteFlameTex() {
  return canvasTex(64, (ctx, s) => {
    const g = ctx.createLinearGradient(0, s, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }, { nearest: false, wrap: false });
}

// ======================== 形狀工具 ========================
// UV 跟實際尺寸（每 unit 米重複一次紋理）嘅圓柱／圓錐
const geoCache = new Map();
function tCyl(rt, rb, h, n = 12, unit = 2, open = false) {
  const key = `tc${rt}|${rb}|${h}|${n}|${unit}|${open}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const g = new THREE.CylinderGeometry(rt, rb, h, n, 1, open);
  const uv = g.attributes.uv;
  const circ = (PI * (rt + rb)) / unit, hh = Math.hypot(h, rb - rt) / unit;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(circ)), uv.getY(i) * hh);
  geoCache.set(key, g);
  return g;
}
const tCone = (r, h, n = 12, unit = 2) => tCyl(0, r, h, n, unit);
// 尖拱（哥德式）輪廓：闊 w、拱腳高 sh、頂高 h
function archPath(p, w, sh, h, x0 = 0) {
  p.moveTo(x0 - w / 2, 0);
  p.lineTo(x0 - w / 2, sh);
  p.quadraticCurveTo(x0 - w / 2, sh + (h - sh) * 0.72, x0, h);
  p.quadraticCurveTo(x0 + w / 2, sh + (h - sh) * 0.72, x0 + w / 2, sh);
  p.lineTo(x0 + w / 2, 0);
  return p;
}
// 尖拱門框（厚 t、深 depth）：中間空心，前面向 +z
function archFrame(w, sh, h, t, depth) {
  const key = `af${w}|${sh}|${h}|${t}|${depth}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const outer = new THREE.Shape();
  archPath(outer, w + t * 2, sh, h + t);
  const hole = new THREE.Path();
  // 個洞由底開始（要喺 outer 入面）：底部留一條好幼嘅邊
  hole.moveTo(-w / 2, 0.01);
  hole.lineTo(-w / 2, sh);
  hole.quadraticCurveTo(-w / 2, sh + (h - sh) * 0.72, 0, h);
  hole.quadraticCurveTo(w / 2, sh + (h - sh) * 0.72, w / 2, sh);
  hole.lineTo(w / 2, 0.01);
  outer.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -depth / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 0.5);
  geoCache.set(key, g);
  return g;
}
// 有尖拱門洞嘅一幅牆（闊 W、高 H；門洞闊 w、拱腳 sh、頂 h）：前後兩面向 ±z
function archWall(W, H, w, sh, h, depth) {
  const key = `aw${W}|${H}|${w}|${sh}|${h}|${depth}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const outer = new THREE.Shape();
  outer.moveTo(-W / 2, 0);
  outer.lineTo(W / 2, 0);
  outer.lineTo(W / 2, H);
  outer.lineTo(-W / 2, H);
  outer.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-w / 2, 0.01);
  hole.lineTo(-w / 2, sh);
  hole.quadraticCurveTo(-w / 2, sh + (h - sh) * 0.72, 0, h);
  hole.quadraticCurveTo(w / 2, sh + (h - sh) * 0.72, w / 2, sh);
  hole.lineTo(w / 2, 0.01);
  outer.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 0.5);
  geoCache.set(key, g);
  return g;
}
// 島底嘅石（倒轉四角錐，頂啱啱同長方形島一樣大，向下收窄、凹凸不平）
function underRockGeo() {
  const g = new THREE.ConeGeometry(Math.SQRT2, 1, 4, 6);
  g.rotateY(PI / 4);
  g.rotateX(PI); // 闊嘅一面向上
  const p = g.attributes.position;
  const h3 = (x, y, z) => {
    const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y > 0.49) continue; // 頂唔郁（同島邊齊）
    const k = 0.78 + h3(Math.round(x * 100), Math.round(y * 100), Math.round(z * 100)) * 0.2;
    p.setX(i, x * k);
    p.setZ(i, z * k);
    p.setY(i, y + (h3(Math.round(z * 100), Math.round(x * 100), 3) - 0.5) * 0.05);
  }
  g.computeVertexNormals();
  return g;
}
// 尖拱平面（門／窗用）：UV 0–1
function archPlane(w, sh, h) {
  const key = `ap${w}|${sh}|${h}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const g = new THREE.ShapeGeometry(archPath(new THREE.Shape(), w, sh, h), 10);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h);
  geoCache.set(key, g);
  return g;
}
// 符文平面：用圖集入面第 k 格
function runePlane(k, size = 1) {
  const key = `rp${k}|${size}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const g = new THREE.PlaneGeometry(size, size);
  const uv = g.attributes.uv;
  const gx = k % 4, gy = Math.floor(k / 4) % 4;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (gx + uv.getX(i)) / 4, 1 - (gy + 1 - uv.getY(i)) / 4);
  geoCache.set(key, g);
  return g;
}
// 由 a 拉去 b 嘅一條條（柱、樑）
function beam(parent, a, b, thick, mat, shadow = true) {
  const len = a.distanceTo(b);
  const m = add(parent, box(thick, len, thick), mat, 0, 0, 0, shadow);
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
// ⛓️ 鐵鏈（一個個鏈環，垂低 sag）
const linkGeo = (s) => geo2(`link${s}`, () => new THREE.TorusGeometry(0.2 * s, 0.055 * s, 5, 8));
function geo2(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
function chain(parent, a, b, sag, mat, s = 1) {
  const len = a.distanceTo(b);
  const n = Math.max(2, Math.floor(len / (0.3 * s)));
  const up = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n, t2 = Math.min(1, t + 0.02);
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * PI) * sag;
    const q = a.clone().lerp(b, t2);
    q.y -= Math.sin(t2 * PI) * sag;
    const dir = q.sub(p).normalize();
    const m = add(parent, linkGeo(s), mat, p.x, p.y, p.z, false);
    m.quaternion.setFromUnitVectors(up, dir);
    m.rotateZ(i % 2 ? PI / 2 : 0);
    m.rotateX(PI / 2);
  }
}
// 一條「發光脈衝」材質：世界高度 y 有一浪浪光向上走（焊埋之後都得，因為 position 已經係世界座標）
function pulseMat(opts, { freq = 0.22, speed = 2.6 } = {}) {
  const m = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, ...opts });
  const uTime = { value: 0 };
  m.userData.uTime = uTime;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'varying float vWY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWY = (modelMatrix * vec4(position, 1.0)).y;');
    sh.fragmentShader = 'uniform float uTime;\nvarying float vWY;\n' + sh.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
  float wv = 0.5 + 0.5 * sin(vWY * ${freq.toFixed(3)} - uTime * ${speed.toFixed(3)});
  diffuseColor.rgb *= 0.4 + 1.8 * pow(wv, 3.0);`,
    );
  };
  m.customProgramCacheKey = () => `pulse${freq}|${speed}`;
  return m;
}

// ======================== 起座城堡 ========================
export function buildWitchCastle({ root, live, steps, topMat, sideMat, jaggedCone, swirlTex }) {
  const rand = seeded(1212);
  // 所有唔郁嘅嘢砌入 cg（local 座標：x = 離 HX 幾遠、y = 離城堡地面幾高、z = 真 z），最尾焊埋
  const cg = new THREE.Group();
  cg.position.set(HX, CASTLE_TOP, 0);
  const fx = new THREE.Group(); // 會郁嘅嘢（同一個座標）
  fx.position.set(HX, CASTLE_TOP, 0);
  live.add(fx);
  const col = (x, z, r) => addCollider(HX + x, z, r);
  const L = (r) => ({ minX: r.minX - HX, maxX: r.maxX - HX, minZ: r.minZ, maxZ: r.maxZ });
  const I = L(CASTLE_ISLAND), K = L(KEEP), C = L(COURTYARD);
  const T = { x: TOWER.x - HX, z: TOWER.z, r: TOWER.r, h: TOWER.h };
  const DOOR = { x: TOWER_DOOR.x - HX, z: TOWER_DOOR.z };

  // ---- 材質 ----
  const stoneMat = M(0xffffff, { map: stoneTex([92, 78, 96], 21, { moss: 0.2 }) });
  const darkMap = stoneTex([62, 52, 70], 22, { moss: 0.12, glowCrack: 0.25 });
  const darkMat = M(0xffffff, { map: darkMap });
  const trimMat = M(0xffffff, { map: stoneTex([120, 106, 118], 23, { moss: 0.05 }) });
  const slateMat = M(0xffffff, { map: slateTex(), roughness: 0.6 });
  const floorMat = M(0xffffff, { map: flagTex() });
  const iron = M(0x221e2a, { metalness: 0.5, roughness: 0.45 }); // 同 halloweenArt 嘅鐵欄杆共用
  const wood = M(0xffffff, { map: plankTex(0x4a3226) });
  const woodDark = M(0xffffff, { map: plankTex(0x2e1f1a) });
  const doorWood = M(0xffffff, { map: plankTex(0x2e1f1a), side: THREE.DoubleSide });
  const blackMat = M(0x07040a);
  const win = windowTex();
  const winWarm = M(0xffffff, { map: win, emissive: 0xffa040, emissiveMap: win, emissiveIntensity: 2.3, alphaTest: 0.5 });
  const winPurple = M(0xffffff, { map: win, emissive: 0xd060ff, emissiveMap: win, emissiveIntensity: 2.4, alphaTest: 0.5 });
  const winGreen = M(0xffffff, { map: win, emissive: 0x8cff40, emissiveMap: win, emissiveIntensity: 2.2, alphaTest: 0.5 });
  const banner = bannerTex();
  const bannerMat = M(0xffffff, { map: banner, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: banner, emissiveIntensity: 0.22, roughness: 0.85 });
  const greenGlow = GLOW(0x76ff03, 2.4);
  const purpleGlow = GLOW(0xd500f9, 2.2);
  const eyeGlow = greenGlow;
  const cyanGlow = GLOW(0x80ffea, 2.2);
  const goldGlow = GLOW(0xffc107, 2);
  const deepPurple = GLOW(0x4a148c, 1.2);
  const runes = runeTex();
  const runeMat = pulseMat({ map: runes, color: 0xe070ff });
  const runeLineMat = pulseMat({ color: 0xc040ff }, {});
  const fallMap = lavaFallTex();
  fallMap.wrapS = THREE.ClampToEdgeWrapping;
  fallMap.repeat.set(1, 2);
  const fallMat = new THREE.MeshBasicMaterial({ map: fallMap, color: new THREE.Color(3, 2.2, 1.6), transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const lavaGlow = M(0xff6a00, { emissive: 0xff5a00, emissiveIntensity: 2.4 });
  const flameTex = whiteFlameTex();

  // 🔥 火盆／火把：先記低位，最後用 InstancedMesh 一次過畫火
  const flames = []; // [x, y, z, size, color]
  const GREEN = 0x76ff03, PURPLE = 0xd500f9;
  function brazier(p, x, z, { y = 0, h = 1.6, color = GREEN, s = 1, pool = true } = {}) {
    // 三腳鐵架 + 碗 + 炭
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      beam(p, new THREE.Vector3(x + Math.cos(a) * 0.55 * s, y, z + Math.sin(a) * 0.55 * s), new THREE.Vector3(x + Math.cos(a) * 0.22 * s, y + h * 0.75, z + Math.sin(a) * 0.22 * s), 0.09 * s, iron);
    }
    add(p, cyl(0.16 * s, 0.22 * s, h * 0.5, 6), iron, x, y + h * 0.6, z);
    add(p, cyl(0.62 * s, 0.32 * s, 0.42 * s, 10), iron, x, y + h + 0.05, z);
    add(p, new THREE.TorusGeometry(0.62 * s, 0.06 * s, 5, 14), iron, x, y + h + 0.26 * s, z).rotation.x = PI / 2;
    for (let i = 0; i < 6; i++) { // 碗邊尖刺
      const a = (i / 6) * PI * 2;
      add(p, cone(0.06 * s, 0.32 * s, 4), iron, x + Math.cos(a) * 0.62 * s, y + h + 0.42 * s, z + Math.sin(a) * 0.62 * s, false);
    }
    add(p, ball(0.42 * s, 8, 5), color === GREEN ? greenGlow : purpleGlow, x, y + h + 0.2 * s, z, false).scale.y = 0.4;
    halo(p, x, y + h + 0.9 * s, z, 2.2 * s, color, 0.4);
    if (pool) lightPool(p, x, z, 3.6 * s, color, 0.3, y + 0.1);
    flames.push([x, y + h + 0.25 * s, z, s, color]);
  }
  // 牆上火把（鐵架 + 火）
  function torch(p, x, y, z, nx, nz, color) {
    const a = new THREE.Vector3(x, y - 0.5, z), b = new THREE.Vector3(x + nx * 0.6, y, z + nz * 0.6);
    beam(p, a, b, 0.08, iron, false);
    add(p, cyl(0.2, 0.1, 0.3, 6), iron, b.x, b.y, b.z, false);
    halo(p, b.x, b.y + 0.6, b.z, 1.6, color, 0.4);
    flames.push([b.x, b.y + 0.1, b.z, 0.55, color]);
  }
  // 🗿 石像鬼（蹲住、有角、有翼、綠光眼）：面向 local -z，ry 轉向
  function gargoyle(p, x, y, z, ry, s = 1) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    g.scale.setScalar(s);
    p.add(g);
    add(g, tiledBox(1.1, 0.35, 1.5, 1), trimMat, 0, 0.17, 0); // 底座
    add(g, box(0.8, 0.8, 0.9), darkMat, 0, 0.75, 0.1); // 身
    add(g, box(0.62, 0.5, 0.6), darkMat, 0, 1.25, -0.35); // 頭
    add(g, box(0.4, 0.26, 0.4), darkMat, 0, 1.12, -0.75); // 口鼻
    for (const sx of [-1, 1]) {
      add(g, box(0.12, 0.08, 0.04), eyeGlow, sx * 0.17, 1.33, -0.66, false);
      const horn = add(g, cone(0.1, 0.5, 4), trimMat, sx * 0.24, 1.6, -0.25);
      horn.rotation.set(-0.5, 0, sx * -0.5);
      const wing = add(g, box(0.1, 0.9, 1.0), darkMat, sx * 0.55, 1.15, 0.35);
      wing.rotation.set(0.3, 0, sx * -0.6);
      add(g, box(0.18, 0.5, 0.22), darkMat, sx * 0.25, 0.55, -0.45); // 前爪
      add(g, cone(0.04, 0.14, 3), trimMat, sx * 0.25, 0.32, -0.62, false).rotation.x = -PI / 2;
    }
    add(g, cone(0.05, 0.18, 3), trimMat, 0.1, 1.02, -0.95, false).rotation.x = PI; // 牙
  }
  // 窗（尖拱發光 + 石窗台 + 拱框）：面向 (nx, nz)
  function windowAt(p, x, y, z, nx, nz, mat = winWarm, w = 1.2, h = 2.4, frame = true) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = Math.atan2(nx, nz);
    p.add(g);
    const pl = add(g, new THREE.PlaneGeometry(w, h), mat, 0, 0, 0.04, false);
    pl.receiveShadow = false;
    if (frame) {
      add(g, archFrame(w * 0.86, h * 0.56, h * 0.98, 0.18, 0.3), trimMat, 0, -h / 2, 0.02);
      add(g, box(w + 0.4, 0.18, 0.4), trimMat, 0, -h / 2 - 0.05, 0.12);
    }
  }
  // 旗幟（掛喺鐵棍）
  function bannerAt(p, x, y, z, nx, nz, w = 1.6, h = 4) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = Math.atan2(nx, nz);
    p.add(g);
    add(g, new THREE.PlaneGeometry(w, h), bannerMat, 0, -h / 2, 0.08, false);
    add(g, box(w + 0.4, 0.12, 0.12), iron, 0, 0.02, 0.12, false);
    for (const sx of [-1, 1]) add(g, ball(0.1, 6, 4), goldGlow, sx * (w / 2 + 0.22), 0.02, 0.12, false);
  }
  // 圓塔：石身、腰線、機槍孔托架、城垛、尖頂（有喇叭形屋簷）、發光窗、頂上發光波
  function roundTower(p, x, z, r, h, { roofH = r * 3, winMat = winWarm, wins = 4, orb = PURPLE, n = 12 } = {}) {
    add(p, tCyl(r + 0.35, r + 0.6, 1.4, n), darkMat, x, 0.7, z);
    add(p, tCyl(r, r + 0.15, h, n), darkMat, x, h / 2, z);
    for (const y of [h * 0.35, h * 0.7]) add(p, tCyl(r + 0.2, r + 0.2, 0.35, n), trimMat, x, y, z);
    const nc = Math.round(r * 4);
    for (let i = 0; i < nc; i++) { // 托架
      const a = (i / nc) * PI * 2;
      const c = add(p, box(0.4, 0.9, 0.7), trimMat, x + Math.cos(a) * (r + 0.2), h - 0.45, z + Math.sin(a) * (r + 0.2));
      c.rotation.y = -a;
    }
    add(p, tCyl(r + 0.55, r + 0.55, 1.3, n), darkMat, x, h + 0.65, z); // 胸牆
    for (let i = 0; i < nc; i += 2) { // 城垛
      const a = ((i + 0.5) / nc) * PI * 2;
      const m = add(p, box(0.8, 0.8, 0.5), darkMat, x + Math.cos(a) * (r + 0.35), h + 1.7, z + Math.sin(a) * (r + 0.35));
      m.rotation.y = -a + PI / 2;
    }
    add(p, tCone(r + 1.3, 1.6, n), slateMat, x, h + 1.4, z); // 喇叭形屋簷
    add(p, tCone(r + 0.5, roofH, n), slateMat, x, h + 0.9 + roofH / 2, z);
    add(p, cyl(0.07, 0.07, 2.2, 5), iron, x, h + 0.9 + roofH + 0.9, z, false);
    add(p, ball(0.38, 10, 8), orb === PURPLE ? purpleGlow : greenGlow, x, h + 0.9 + roofH + 1.9, z, false);
    halo(p, x, h + 0.9 + roofH + 1.9, z, 2.6, orb, 0.4);
    // 窗：螺旋排落去
    for (let i = 0; i < wins; i++) {
      const a = i * 1.9 + x * 0.1, y = 3.5 + (i / Math.max(1, wins - 1)) * (h - 7);
      windowAt(p, x + Math.cos(a) * (r + 0.08), y, z + Math.sin(a) * (r + 0.08), Math.cos(a), Math.sin(a), winMat, 0.9, 1.8);
    }
  }

  // ======================== 1. 城堡島：熔岩瀑布 + 島邊 ========================
  steps.push(() => {
    const ix = (I.minX + I.maxX) / 2, iz = (I.minZ + I.maxZ) / 2;
    add(cg, tiledBox(I.maxX - I.minX, 1.2, I.maxZ - I.minZ, 3), topMat, ix, -0.6, iz);
    const under = add(cg, underRockGeo(), sideMat, ix, -1.2 - 13, iz);
    under.scale.set((I.maxX - I.minX) / 2, 26, (I.maxZ - I.minZ) / 2);
    // 島底吊住嘅尖石（鐘乳石咁）
    for (let i = 0; i < 9; i++) {
      const x = I.minX + 10 + rand() * (I.maxX - I.minX - 20), z = I.minZ + 8 + rand() * (I.maxZ - I.minZ - 16);
      const hh = 8 + rand() * 10;
      const st = add(cg, jaggedCone(3 + rand() * 3, hh, 6, 500 + i), sideMat, x, -8 - hh / 2, z);
      st.rotation.x = PI;
    }
    // 著陸台（同以前一樣）
    add(cg, tiledBox(8, 1.2, 6, 1.6), topMat, 0, -0.6, -141.2);
    const lu = add(cg, jaggedCone(4, 7, 5, 88), sideMat, 0, -1.2 - 3.5, -140.7);
    lu.rotation.x = PI;
    // 著陸台兩邊：由熔岩升上嚟嘅石柱 + 巨型火盆（歡迎你！）
    for (const s of [-1, 1]) {
      const x = s * 6.2, z = -140.6;
      const pil = add(cg, jaggedCone(1.6, CASTLE_TOP + 2, 6, s > 0 ? 61 : 62), sideMat, x, -(CASTLE_TOP + 2) / 2 + 1.2, z);
      pil.rotation.x = PI;
      add(cg, tCyl(1.3, 1.5, 0.6, 8), darkMat, x, 1.1, z);
      brazier(cg, x, z, { y: 1.4, h: 1.2, color: s < 0 ? GREEN : PURPLE, s: 1.3, pool: false });
      chain(cg, new THREE.Vector3(x, 1.4, z), new THREE.Vector3(s * 4.2, 0.1, -141.5), 0.4, iron, 1.2);
    }
    // 🌋 熔岩瀑布：由島邊石縫流落熔岩海
    const fallH = CASTLE_TOP - 1.0 - LAVA_Y;
    const falls = [
      ['s', -30, 4], ['s', -17, 3], ['s', 15, 3.4], ['s', 36, 4.2],
      ['w', -196, 4.4], ['w', -163, 3], ['e', -198, 3.4], ['e', -152, 4],
      ['n', -24, 5], ['n', 6, 3.2], ['n', 30, 4.2],
    ];
    for (const [side, along, w] of falls) {
      let x, z, nx, nz;
      if (side === 's') { x = along; z = I.maxZ + 0.35; nx = 0; nz = 1; }
      else if (side === 'n') { x = along; z = I.minZ - 0.35; nx = 0; nz = -1; }
      else if (side === 'w') { x = I.minX - 0.35; z = along; nx = -1; nz = 0; }
      else { x = I.maxX + 0.35; z = along; nx = 1; nz = 0; }
      const f = add(cg, new THREE.PlaneGeometry(w, fallH), fallMat, x, -1.0 - fallH / 2, z, false);
      f.rotation.y = Math.atan2(nx, nz);
      f.receiveShadow = false;
      const f2 = add(cg, new THREE.PlaneGeometry(w * 0.6, fallH), fallMat, x + nx * 0.5, -1.0 - fallH / 2, z + nz * 0.5, false); // 前面再一層（有厚度）
      f2.rotation.y = Math.atan2(nx, nz);
      // 石縫口（發光）
      const mouth = add(cg, box(nz ? w + 0.4 : 0.6, 0.5, nz ? 0.6 : w + 0.4), lavaGlow, x - nx * 0.2, -0.95, z - nz * 0.2, false);
      mouth.receiveShadow = false;
      // 落到熔岩：一團光 + 光圈
      halo(cg, x + nx * 0.6, LAVA_Y - CASTLE_TOP + 1.2, z + nz * 0.6, w * 0.9, 0xffb040, 0.6);
      lightPool(cg, x + nx * 1.2, z + nz * 1.2, w * 1.3, 0xffb040, 0.6, LAVA_Y - CASTLE_TOP + 0.12);
    }
    // 島嘅外圍：尖石（輪廓好睇啲）
    for (let i = 0; i < 16; i++) {
      const side = i % 4;
      const k = (Math.floor(i / 4) + 0.3 + rand() * 0.4) / 4;
      let x, z;
      if (side === 0) { x = I.minX + 0.8; z = I.minZ + 3 + k * (I.maxZ - I.minZ - 12); }
      else if (side === 1) { x = I.maxX - 0.8; z = I.minZ + 3 + k * (I.maxZ - I.minZ - 6); }
      else if (side === 2) { x = I.minX + 6 + k * (I.maxX - I.minX - 12); z = I.minZ + 0.8; }
      else { x = k < 0.5 ? I.minX + 3 + k * 40 : I.maxX - 3 - (1 - k) * 30; z = I.maxZ - 0.8; }
      if (Math.abs(x) < 9 && side === 3) continue; // 著陸台前面唔放
      if (Math.hypot(x - T.x, z - T.z) < T.r + 2.5) continue;
      const hh = 1.6 + rand() * 2.6;
      add(cg, jaggedCone(0.5 + rand() * 0.4, hh, 5, 300 + i), sideMat, x, hh / 2 - 0.1, z);
      col(x, z, 0.7);
    }
  });

  // ======================== 2. 城牆 + 角樓 + 吊籠 ========================
  const WALL_H = 8.5;
  steps.push(() => {
    for (const b0 of HELL_BLOCKS.slice(1)) {
      const b = L(b0);
      const bw = b.maxX - b.minX, bd = b.maxZ - b.minZ;
      const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
      const long = bw > bd;
      const len = long ? bw : bd;
      // 向外嘅方向
      const ox = long ? 0 : Math.sign(cx), oz = long ? 1 : 0;
      add(cg, tiledBox(bw + 0.6, 1.1, bd + 0.6, 2), darkMat, cx, 0.55, cz); // 牆腳
      add(cg, tiledBox(bw, WALL_H, bd, 2), stoneMat, cx, WALL_H / 2, cz);
      add(cg, tiledBox(bw + 0.3, 0.35, bd + 0.3, 2), trimMat, cx, 5.2, cz); // 腰線
      add(cg, tiledBox(bw + 0.7, 0.45, bd + 0.7, 2), trimMat, cx, WALL_H + 0.2, cz); // 走道（凸出少少）
      // 走道兩邊城垛（一高一低）
      const n = Math.floor(len / 1.6);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        if (i % 2) continue;
        for (const side of [-1, 1]) {
          const x = long ? b.minX + bw * t : cx + side * (bw / 2 + 0.1);
          const z = long ? cz + side * (bd / 2 + 0.1) : b.minZ + bd * t;
          add(cg, box(long ? 1.0 : 0.5, 1.2, long ? 0.5 : 1.0), darkMat, x, WALL_H + 1.0, z);
        }
      }
      // 箭窗（兩面）+ 扶壁（外面）
      for (let d = 3; d < len - 2; d += 4.5) {
        const x = long ? b.minX + d : cx, z = long ? cz : b.minZ + d;
        for (const side of [-1, 1]) {
          const fx0 = x + (long ? 0 : side * (bw / 2 + 0.02)), fz0 = z + (long ? side * (bd / 2 + 0.02) : 0);
          add(cg, box(long ? 0.22 : 0.06, 1.7, long ? 0.06 : 0.22), blackMat, fx0, 3.5, fz0, false); // 箭窗（一條直縫）
          add(cg, box(long ? 0.4 : 0.06, 0.3, long ? 0.06 : 0.4), blackMat, fx0, 2.6, fz0, false);
        }
        if (d % 9 < 4.5) { // 扶壁（斜）
          const px = x + ox * (bw / 2 + 0.35), pz = z + oz * (bd / 2 + 0.35);
          const bt = add(cg, tiledBox(long ? 0.9 : 0.7, 6, long ? 0.7 : 0.9, 2), darkMat, px, 3, pz);
          if (long) bt.rotation.x = -0.08 * oz;
          else bt.rotation.z = 0.08 * ox;
        }
      }
      // 牆頂火把（向內）
      for (let d = 4; d < len - 2; d += 9) {
        const x = long ? b.minX + d : cx - ox * (bw / 2 + 0.05), z = long ? cz - oz * (bd / 2 + 0.05) : b.minZ + d;
        torch(cg, x, 6.6, z, -ox, -oz, (Math.round(d) % 2 ? GREEN : PURPLE));
      }
    }
    // 前牆外面嘅旗幟
    for (const x of [-25, -14, 14, 25]) bannerAt(cg, x, WALL_H - 0.4, CASTLE_GATE_Z + 1.05, 0, 1, 1.5, 4.2);
    // 角樓（城牆四角）+ 東邊缺口兩邊嘅細塔
    for (const [x, z, r, h] of [[-31, -149, 3.1, 15], [31, -149, 3.1, 15], [-31, -187, 3.0, 14], [31, -187, 3.0, 14]]) {
      roundTower(cg, x, z, r, h, { roofH: 8, wins: 3, orb: x < 0 ? GREEN : PURPLE });
      col(x, z, r + 0.1);
    }
    for (const z of [-178.6, -163.4]) {
      roundTower(cg, 31, z, 1.8, 11, { roofH: 5.5, wins: 2, winMat: winPurple, n: 10 });
      col(31, z, 1.8);
    }
    // 前角樓上面嘅石像鬼
    for (const x of [-31, 31]) gargoyle(cg, x + Math.sign(x) * 0.8, 16.35, -146.1, PI + (x < 0 ? -0.5 : 0.5), 1.1);
    // 🔒 吊籠（鐵籠 + 鐵鏈；入面一粒發光鬼火）
    function cage(p, x, yTop, z, len = 2) {
      const yc = yTop - len;
      chain(p, new THREE.Vector3(x, yTop, z), new THREE.Vector3(x, yc + 0.1, z), 0, iron, 0.9);
      add(p, cone(0.7, 0.5, 8), iron, x, yc - 0.15, z);
      add(p, cyl(0.7, 0.7, 0.12, 10), iron, x, yc - 1.75, z);
      for (const y of [-0.45, -1.1]) add(p, new THREE.TorusGeometry(0.68, 0.04, 4, 14), iron, x, yc + y, z, false).rotation.x = PI / 2;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * PI * 2;
        add(p, box(0.05, 1.6, 0.05), iron, x + Math.cos(a) * 0.66, yc - 0.95, z + Math.sin(a) * 0.66, false);
      }
      add(p, ball(0.22, 8, 6), cyanGlow, x, yc - 1.1, z, false);
      halo(p, x, yc - 1.1, z, 1.2, 0x80ffea, 0.4);
    }
    // 西牆內面：鐵臂吊住
    for (const z of [-160.5, -167]) {
      beam(cg, new THREE.Vector3(-29.9, 6.8, z), new THREE.Vector3(-27.6, 7.6, z), 0.16, iron);
      beam(cg, new THREE.Vector3(-29.9, 5.6, z), new THREE.Vector3(-28.4, 7.5, z), 0.1, iron);
      cage(cg, -27.8, 7.5, z, 1.4);
    }
    // 前牆外面
    for (const x of [-20, 20]) {
      beam(cg, new THREE.Vector3(x, 7.4, -147.9), new THREE.Vector3(x, 8.1, -145.8), 0.16, iron);
      cage(cg, x, 8.0, -145.9, 1.6);
    }
    // 島邊絞架（吊籠喺熔岩上面）
    for (const [x, z, dx] of [[I.maxX - 1, -201, 1], [I.minX + 1, -178, -1]]) {
      add(cg, tiledBox(0.5, 7.5, 0.5, 1), woodDark, x, 3.75, z);
      add(cg, tiledBox(3.8, 0.4, 0.4, 1), woodDark, x + dx * 1.6, 7.3, z);
      beam(cg, new THREE.Vector3(x, 5.6, z), new THREE.Vector3(x + dx * 1.6, 7.2, z), 0.22, woodDark);
      cage(cg, x + dx * 3.1, 7.1, z, 2.6);
      col(x, z, 0.5);
    }
  });

  // ======================== 3. 大閘樓 ========================
  steps.push(() => {
    const GZ = CASTLE_GATE_Z;
    const TH = 17;
    for (const s of [-1, 1]) {
      const x = s * 6.5;
      add(cg, tCyl(3.2, 3.5, 1.6, 8), darkMat, x, 0.8, GZ).rotation.y = PI / 8; // 八角形：平面向正前
      add(cg, tCyl(2.9, 3.05, TH, 8), stoneMat, x, TH / 2, GZ).rotation.y = PI / 8;
      for (const y of [6, 12]) add(cg, tCyl(3.1, 3.1, 0.35, 8), trimMat, x, y, GZ).rotation.y = PI / 8;
      for (let i = 0; i < 12; i++) { // 托架 + 城垛
        const a = (i / 12) * PI * 2;
        add(cg, box(0.4, 0.9, 0.6), trimMat, x + Math.cos(a) * 3.1, TH - 0.45, GZ + Math.sin(a) * 3.1).rotation.y = -a;
        if (i % 2 === 0) add(cg, box(0.8, 0.9, 0.5), darkMat, x + Math.cos(a) * 3.3, TH + 1.75, GZ + Math.sin(a) * 3.3).rotation.y = -a + PI / 2;
      }
      add(cg, tCyl(3.5, 3.5, 1.3, 12), darkMat, x, TH + 0.65, GZ);
      add(cg, tCone(4.3, 1.6, 12), slateMat, x, TH + 1.5, GZ);
      add(cg, tCone(3.6, 10, 12), slateMat, x, TH + 1 + 5, GZ);
      add(cg, cyl(0.08, 0.08, 2.4, 5), iron, x, TH + 12, GZ, false);
      add(cg, ball(0.45, 10, 8), s < 0 ? greenGlow : purpleGlow, x, TH + 13.2, GZ, false);
      halo(cg, x, TH + 13.2, GZ, 3, s < 0 ? GREEN : PURPLE, 0.4);
      // 窗 + 旗
      for (const y of [8.5, 13.8]) windowAt(cg, x, y, GZ + 2.8, 0, 1, s < 0 ? winGreen : winPurple, 1.0, 2.0);
      bannerAt(cg, x + s * 1.98, 11.6, GZ + 1.98, s, 1, 1.4, 5);
      gargoyle(cg, x + s * 0.5, TH + 1.35, GZ + 3.4, PI + s * 0.35, 1.0);
    }
    // 門樓（拱門上面）
    add(cg, tiledBox(8, 7, 4.6, 2), stoneMat, 0, 12.5, GZ);
    add(cg, tiledBox(8.6, 0.4, 5.2, 2), trimMat, 0, 9.1, GZ);
    add(cg, tiledBox(8.8, 0.5, 5.4, 2), trimMat, 0, 16.1, GZ);
    for (let x = -3.8; x <= 3.9; x += 1.6) { // 城垛（前後）
      add(cg, box(0.9, 1.1, 0.5), darkMat, x, 16.9, GZ + 2.45);
      add(cg, box(0.9, 1.1, 0.5), darkMat, x, 16.9, GZ - 2.45);
    }
    for (let x = -3.6; x <= 3.7; x += 1.2) add(cg, box(0.45, 0.8, 0.6), trimMat, x, 15.4, GZ + 2.55); // 機槍孔托架
    // 有尖拱門洞嘅牆 + 前後兩面嘅拱框
    add(cg, archWall(8.4, 9.2, 7.0, 5.5, 9.0, 4.0), stoneMat, 0, 0, GZ);
    for (const s of [-1, 1]) {
      const fr = add(cg, archFrame(7.0, 5.5, 9.0, 0.6, 0.4), trimMat, 0, 0, GZ + s * 2.05);
      fr.rotation.y = s < 0 ? PI : 0;
    }
    // 吊起咗嘅鐵閘（尖尖向下）
    const pz = GZ + 0.4;
    for (let x = -3.2; x <= 3.21; x += 0.64) {
      add(cg, box(0.14, 2.6, 0.14), iron, x, 8.0, pz);
      add(cg, cone(0.1, 0.4, 4), iron, x, 6.5, pz, false).rotation.x = PI;
    }
    for (const y of [7.1, 8.2]) add(cg, box(6.8, 0.14, 0.16), iron, 0, y, pz);
    // 鐵閘鐵鏈（拉去入面嘅絞盤）
    for (const s of [-1, 1]) {
      chain(cg, new THREE.Vector3(s * 3, 7.3, pz - 0.1), new THREE.Vector3(s * 3.2, 9.6, GZ - 2.4), 0.3, iron, 1);
      const wheel = add(cg, new THREE.TorusGeometry(0.6, 0.1, 5, 12), woodDark, s * 3.4, 9.8, GZ - 2.6);
      wheel.rotation.y = PI / 2;
    }
    // 門口上面嘅大徽章（發光月亮）
    add(cg, cyl(1.25, 1.25, 0.3, 16), trimMat, 0, 12.7, GZ + 2.4).rotation.x = PI / 2;
    add(cg, cyl(1.0, 1.0, 0.32, 16), deepPurple, 0, 12.7, GZ + 2.42, false).rotation.x = PI / 2;
    const moon = add(cg, new THREE.TorusGeometry(0.6, 0.18, 6, 16, PI * 1.25), goldGlow, 0, 12.7, GZ + 2.62, false);
    moon.rotation.z = PI * 0.6;
    halo(cg, 0, 12.7, GZ + 2.8, 2.6, PURPLE, 0.4);
    // 拱門兩邊火盆（綠）
    for (const s of [-1, 1]) torch(cg, s * 3.85, 4.8, GZ + 2.25, 0, 1, s < 0 ? GREEN : PURPLE);
    // 拱門下面地上一圈紫光
    lightPool(cg, 0, GZ + 1, 5, PURPLE, 0.3, 0.12);
    // 閘樓頂嘅鐵鏈（兩座塔之間）
    chain(cg, new THREE.Vector3(-6.5, 19.4, GZ + 3.4), new THREE.Vector3(6.5, 19.4, GZ + 3.4), 1.6, iron, 1.3);
    for (const s of [-1, 1]) col(s * 6.5, GZ, 2.7);
  });

  // ======================== 4. 主樓 + 中間大塔 + 角樓 + 飛扶壁 ========================
  steps.push(() => {
    const kx = (K.minX + K.maxX) / 2, kz = (K.minZ + K.maxZ) / 2, kw = K.maxX - K.minX, kd = K.maxZ - K.minZ;
    const KH = 20;
    const FZ = K.maxZ; // 正面（向庭園）
    add(cg, tiledBox(kw + 1, 1.4, kd + 1, 2), darkMat, kx, 0.7, kz);
    add(cg, tiledBox(kw, KH, kd, 2), stoneMat, kx, KH / 2, kz);
    for (const y of [7.5, 14.5]) add(cg, tiledBox(kw + 0.4, 0.35, kd + 0.4, 2), trimMat, kx, y, kz);
    add(cg, tiledBox(kw + 0.8, 0.5, kd + 0.8, 2), trimMat, kx, KH + 0.2, kz);
    for (let x = K.minX + 0.6; x <= K.maxX - 0.5; x += 1.6) { // 城垛（前後）
      add(cg, box(0.9, 1.2, 0.5), darkMat, x, KH + 1.05, FZ + 0.15);
      add(cg, box(0.9, 1.2, 0.5), darkMat, x, KH + 1.05, K.minZ - 0.15);
    }
    for (let z = K.minZ + 0.6; z <= K.maxZ - 0.5; z += 1.6) for (const x of [K.minX - 0.15, K.maxX + 0.15]) add(cg, box(0.5, 1.2, 0.9), darkMat, x, KH + 1.05, z);
    // 正面扶柱
    for (const x of [-12.2, -6.6, 6.6, 12.2]) {
      add(cg, tiledBox(1.2, KH - 1, 0.45, 2), darkMat, x, (KH - 1) / 2 + 0.5, FZ + 0.2);
      add(cg, cone(0.7, 2.2, 4), darkMat, x, KH + 2.3, FZ + 0.2).rotation.y = PI / 4; // 小尖塔
      add(cg, box(0.9, 1.2, 0.6), trimMat, x, KH + 0.6, FZ + 0.25);
    }
    // 窗（三行）
    for (const x of [-15.2, -9.4, 9.4, 15.2]) for (const y of [4.2, 11, 17.3]) windowAt(cg, x, y, FZ + 0.01, 0, 1, y > 15 ? winPurple : winWarm, 1.5, 3.0);
    for (const x of [-3.6, 3.6]) windowAt(cg, x * 1.05, 17.3, FZ + 0.01, 0, 1, winPurple, 1.2, 2.6);
    // 兩邊窗
    for (const z of [-197, -193]) for (const s of [-1, 1]) windowAt(cg, s * (kw / 2 + 0.01), 11, z, s, 0, winWarm, 1.3, 2.6);
    // 大門：尖拱門框 + 兩扇木門（中間一條紫光縫）+ 樓梯
    add(cg, archFrame(5.0, 4.6, 7.6, 0.9, 0.7), trimMat, 0, 0, FZ + 0.1);
    add(cg, archPlane(5.0, 4.6, 7.6), blackMat, 0, 0.01, FZ + 0.02, false);
    for (const s of [-1, 1]) {
      const leaf = new THREE.Group();
      leaf.position.set(s * 2.5, 0, FZ + 0.08);
      leaf.rotation.y = s * 0.12;
      cg.add(leaf);
      const dg = new THREE.Shape();
      dg.moveTo(0, 0); dg.lineTo(0, 4.6); dg.quadraticCurveTo(0, 4.6 + 3 * 0.72, -s * 2.5, 7.6); dg.lineTo(-s * 2.5, 0);
      const dgeo = new THREE.ShapeGeometry(dg, 8);
      const uv = dgeo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 0.5);
      add(leaf, dgeo, doorWood, 0, 0, 0, false);
      for (const y of [1.2, 3.4, 5.4]) add(leaf, box(2.3, 0.18, 0.08), iron, -s * 1.2, y, 0.05, false);
      add(leaf, new THREE.TorusGeometry(0.25, 0.05, 5, 12), iron, -s * 2.0, 2.8, 0.1, false);
    }
    add(cg, box(0.22, 7.2, 0.1), purpleGlow, 0, 3.6, FZ + 0.06, false);
    halo(cg, 0, 3.4, FZ + 0.8, 3.2, PURPLE, 0.4);
    for (let i = 0; i < 3; i++) add(cg, tiledBox(7 - i * 0.9, 0.08, 2.2 - i * 0.6, 1), trimMat, 0, 0.12 + i * 0.08, FZ + 1.1 - i * 0.3);
    // 玫瑰窗（紫）
    const RY = 13.2;
    add(cg, new THREE.TorusGeometry(2.3, 0.3, 6, 24), trimMat, 0, RY, FZ + 0.1);
    add(cg, new THREE.CircleGeometry(2.2, 24), purpleGlow, 0, RY, FZ + 0.03, false);
    for (let i = 0; i < 8; i++) add(cg, box(0.14, 4.3, 0.14), trimMat, 0, RY, FZ + 0.12, false).rotation.z = (i / 8) * PI;
    add(cg, new THREE.TorusGeometry(0.8, 0.12, 5, 16), trimMat, 0, RY, FZ + 0.14, false);
    add(cg, new THREE.CircleGeometry(0.7, 16), greenGlow, 0, RY, FZ + 0.15, false);
    halo(cg, 0, RY, FZ + 0.6, 3.4, PURPLE, 0.4);
    // 旗幟
    for (const x of [-5.2, 5.2]) bannerAt(cg, x, KH - 0.3, FZ + 0.25, 0, 1, 1.7, 7);
    // 石像鬼（主樓頂）
    for (const x of [-9.4, -3.8, 3.8, 9.4]) gargoyle(cg, x, KH + 0.45, FZ + 0.35, PI, 1.15);
    // 主樓門口兩個火盆
    for (const s of [-1, 1]) {
      brazier(cg, s * 4.6, FZ + 1.9, { color: PURPLE, s: 1.1 });
      col(s * 4.6, FZ + 1.9, 0.75);
    }
    // ---- 中間大塔 + 尖頂 ----
    const GH = 16, gz = kz - 1;
    add(cg, tiledBox(14, GH, 10, 2), darkMat, kx, KH + GH / 2, gz);
    add(cg, tiledBox(14.6, 0.4, 10.6, 2), trimMat, kx, KH + GH, gz);
    for (let x = -6.6; x <= 6.7; x += 1.65) add(cg, box(0.9, 1.0, 0.5), darkMat, x, KH + GH + 0.7, gz + 5.1);
    for (const x of [-3.6, 0, 3.6]) windowAt(cg, x, KH + 5, gz + 5.01, 0, 1, winWarm, 1.4, 3.2);
    for (const x of [-3.6, 3.6]) windowAt(cg, x, KH + 11.5, gz + 5.01, 0, 1, winPurple, 1.2, 2.8);
    windowAt(cg, 0, KH + 11.5, gz + 5.01, 0, 1, winGreen, 1.6, 3.4);
    const spireG = new THREE.Group();
    spireG.position.set(kx, KH + GH + 0.2 + 9, gz);
    spireG.scale.set(1, 1, 0.72);
    cg.add(spireG);
    add(spireG, tCone(9.6, 18, 4, 2), slateMat, 0, 0, 0).rotation.y = PI / 4;
    add(cg, cyl(0.12, 0.12, 4, 6), iron, kx, KH + GH + 20, gz, false);
    add(cg, ball(0.7, 12, 8), purpleGlow, kx, KH + GH + 22, gz, false);
    halo(cg, kx, KH + GH + 22, gz, 4.5, PURPLE, 0.4);
    // 大塔四角細塔（吊出去）
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = kx + sx * 7, z = gz + sz * 5;
      add(cg, cone(1.1, 1.4, 8), trimMat, x, KH + GH - 1.2, z).rotation.x = PI;
      add(cg, tCyl(1.05, 1.05, 3.2, 8), darkMat, x, KH + GH + 1.1, z);
      add(cg, tCone(1.5, 4.2, 8), slateMat, x, KH + GH + 4.8, z);
      add(cg, ball(0.22, 8, 6), greenGlow, x, KH + GH + 7.1, z, false);
    }
    // ---- 4 個角樓 ----
    for (const [x, z] of [[K.minX, K.minZ], [K.maxX, K.minZ], [K.minX, K.maxZ], [K.maxX, K.maxZ]]) {
      roundTower(cg, x, z, 3.6, 28, { roofH: 13, wins: 5, winMat: z === K.maxZ ? winWarm : winPurple, orb: x < 0 ? GREEN : PURPLE, n: 14 });
    }
    // 鐵鏈（兩個前角樓之間，垂喺主樓前面）
    chain(cg, new THREE.Vector3(K.minX + 3.2, 26, FZ + 1.6), new THREE.Vector3(K.maxX - 3.2, 26, FZ + 1.6), 3.6, iron, 1.6);
    // ---- 飛扶壁（主樓兩邊）----
    for (const s of [-1, 1]) for (const z of [-199.5, -190.5]) {
      const px = s * 25.5;
      add(cg, tiledBox(2, 1.2, 2, 2), darkMat, px, 0.6, z);
      add(cg, tiledBox(1.6, 14, 1.6, 2), stoneMat, px, 7, z);
      add(cg, tiledBox(1.9, 0.4, 1.9, 2), trimMat, px, 14.2, z);
      add(cg, cone(1.0, 3.6, 4), darkMat, px, 16.2, z).rotation.y = PI / 4; // 尖塔
      add(cg, ball(0.22, 8, 6), s < 0 ? greenGlow : purpleGlow, px, 18.2, z, false);
      // 斜樑 + 下面一條弧
      const wallX = s * (kw / 2);
      beam(cg, new THREE.Vector3(px - s * 0.5, 13.6, z), new THREE.Vector3(wallX, 18, z), 0.9, stoneMat);
      const segs = 7;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * PI / 2, a1 = ((i + 1) / segs) * PI / 2;
        const ax = px - s * 0.8, ay = 9;
        const rx = Math.abs(wallX - ax), ry = 6.6;
        const p0 = new THREE.Vector3(ax - s * rx * (1 - Math.cos(a0)), ay + ry * Math.sin(a0), z);
        const p1 = new THREE.Vector3(ax - s * rx * (1 - Math.cos(a1)), ay + ry * Math.sin(a1), z);
        beam(cg, p0, p1, 0.7, trimMat);
      }
      col(px, z, 1.3);
    }
  });

  // ======================== 5. 🗼 Witch Tower ========================
  let towerDoor = null, towerOrb = null, orbitRunes = null, sealBars = null;
  steps.push(() => {
    const rAt = (y) => T.r - (y / T.h) * 0.6; // 塔身由下至上收窄
    add(cg, tCyl(6.85, 6.9, 1.6, 18), darkMat, T.x, 0.8, T.z);
    add(cg, tCyl(T.r - 0.6, T.r, T.h, 18, 2), darkMat, T.x, T.h / 2, T.z);
    for (const y of [12, 24, 36, 48]) add(cg, tCyl(rAt(y) + 0.3, rAt(y) + 0.3, 0.5, 18), trimMat, T.x, y, T.z);
    // 直條扶柱（避開西面道門）
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2 + PI / 6; // 唔會正正喺 PI（門）
      const g = new THREE.Group();
      g.position.set(T.x, 0, T.z);
      g.rotation.y = -a;
      cg.add(g);
      const rib = add(g, tiledBox(0.6, 54, 0.7, 2), stoneMat, T.r + 0.05 - 0.27, 1.6 + 27, 0);
      rib.rotation.z = 0.6 / T.h;
    }
    // 螺旋窗
    for (let i = 0; i < 16; i++) {
      const a = i * 1.15 + 0.7, y = 7 + i * 3.1;
      if (Math.abs(Math.atan2(Math.sin(a - PI), Math.cos(a - PI))) < 0.5 && y < 10) continue;
      const r = rAt(y) + 0.06;
      windowAt(cg, T.x + Math.cos(a) * r, y, T.z + Math.sin(a) * r, Math.cos(a), Math.sin(a), i % 3 === 0 ? winGreen : winPurple, 1.0, 2.0);
    }
    // ✨ 發光符文螺旋（一條光線 + 一路排上去嘅符文）：光一浪浪向上走
    const turns = 4.5, y0 = 4, y1 = 58;
    const helix = (t) => {
      const y = y0 + (y1 - y0) * t, a = PI + 0.9 + t * turns * PI * 2;
      const r = rAt(y) + 0.08;
      return new THREE.Vector3(T.x + Math.cos(a) * r, y, T.z + Math.sin(a) * r);
    };
    class Helix extends THREE.Curve {
      getPoint(t, out = new THREE.Vector3()) {
        return out.copy(helix(t));
      }
    }
    add(cg, new THREE.TubeGeometry(new Helix(), 420, 0.09, 4, false), runeLineMat, 0, 0, 0, false);
    add(cg, new THREE.TubeGeometry(new Helix(), 420, 0.06, 4, false), runeLineMat, 0, 1.9, 0, false);
    const N = 74;
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N;
      const p = helix(t);
      const a = Math.atan2(p.z - T.z, p.x - T.x);
      const m = add(cg, runePlane(Math.floor(rand() * 16), 1.15), runeMat, p.x + Math.cos(a) * 0.02, p.y + 0.95, p.z + Math.sin(a) * 0.02, false);
      m.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
      m.receiveShadow = false;
    }
    // 陽台（y 54）：托架 + 地台 + 城垛 + 石像鬼
    const BY = 54, br = rAt(BY);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * PI * 2;
      add(cg, box(0.5, 1.4, 1.4), trimMat, T.x + Math.cos(a) * (br + 0.6), BY - 0.9, T.z + Math.sin(a) * (br + 0.6)).rotation.y = -a;
    }
    add(cg, tCyl(br + 1.6, br + 1.4, 0.6, 20), darkMat, T.x, BY, T.z);
    for (let i = 0; i < 24; i += 2) {
      const a = ((i + 0.5) / 24) * PI * 2;
      add(cg, box(1.0, 1.1, 0.5), darkMat, T.x + Math.cos(a) * (br + 1.35), BY + 0.85, T.z + Math.sin(a) * (br + 1.35)).rotation.y = -a + PI / 2;
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + PI / 4;
      const x = T.x + Math.cos(a) * (br + 1.5), z = T.z + Math.sin(a) * (br + 1.5);
      gargoyle(cg, x, BY + 0.3, z, Math.atan2(-Math.cos(a), -Math.sin(a)), 1.3);
    }
    // 塔頂：歪咗嘅尖帽（同以前一樣，但用瓦）
    const roof = new THREE.Group();
    roof.position.set(T.x, T.h, T.z);
    cg.add(roof);
    add(roof, tCyl(T.r + 1.6, T.r + 1.6, 0.6, 18), darkMat, 0, 0, 0);
    add(roof, tCone(T.r + 2.4, 1.8, 18), slateMat, 0, 0.9, 0);
    add(roof, tCone(T.r + 1.2, 12, 18), slateMat, 0, 6, 0);
    add(roof, tCyl(6.55, 6.95, 0.7, 18), lavaGlow, 0, 1.6, 0, false); // 橙色帽帶
    const tipG = new THREE.Group();
    tipG.position.set(0, 11.5, 0);
    tipG.rotation.z = 0.5;
    roof.add(tipG);
    add(tipG, tCone(2.4, 7, 12), slateMat, 0, 3, 0);
    halo(tipG, 0, 7, 0, 5, PURPLE, 0.4);
    // 塔頂發光波（自己一份材質，因為會閃）
    const orbM = new THREE.MeshStandardMaterial({ color: 0xea80fc, emissive: 0xea80fc, emissiveIntensity: 3, roughness: 0.4 });
    towerOrb = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), orbM);
    const tipWorld = new THREE.Vector3(0, 7, 0);
    cg.updateMatrixWorld(true);
    tipG.localToWorld(tipWorld);
    towerOrb.position.copy(tipWorld);
    live.add(towerOrb);

    // ---- 🚪 好有氣勢嘅塔門（西面）----
    const DX = T.x - T.r + 0.05; // 塔身西面
    const portal = new THREE.Group();
    portal.position.set(DX, 0, T.z);
    portal.rotation.y = -PI / 2; // 前面向 -x（向庭園）
    cg.add(portal);
    add(portal, archFrame(4.0, 4.0, 6.8, 1.0, 1.8), trimMat, 0, 0, 0.6);
    add(portal, archFrame(5.4, 3.6, 7.6, 0.45, 0.6), darkMat, 0, 0, 1.25);
    add(portal, archPlane(4.0, 4.0, 6.8), blackMat, 0, 0.01, 0.75, false); // 喺塔腳石前面
    for (const s of [-1, 1]) { // 門柱 + 柱頭
      add(portal, tCyl(0.38, 0.42, 6.2, 8), trimMat, s * 2.85, 3.1, 1.55);
      add(portal, box(1.0, 0.5, 1.0), trimMat, s * 2.85, 6.4, 1.55);
      add(portal, box(1.1, 0.4, 1.1), darkMat, s * 2.85, 0.2, 1.55);
    }
    // 門框上嘅符文（沿住拱）
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      let x, y;
      if (t < 0.25) { x = -2.5; y = 0.9 + t * 4 * 3.1; }
      else if (t > 0.75) { x = 2.5; y = 0.9 + (1 - t) * 4 * 3.1; }
      else {
        const k = (t - 0.25) * 2; // 0–1 沿拱
        const qa = k * PI;
        x = -Math.cos(qa) * 2.5;
        y = 4.2 + Math.sin(qa) * 3.0;
      }
      add(portal, runePlane(i % 16, 0.7), runeMat, x, y, 1.52, false);
    }
    // 頂上嘅尖山牆 + 女巫帽徽章
    const gable = add(portal, cone(3.6, 2.6, 3), darkMat, 0, 8.6, 1.0);
    gable.rotation.y = PI / 6 * 0 + PI;
    gable.scale.z = 0.3;
    add(portal, cone(0.45, 1.0, 8), blackMat, 0, 9.0, 1.5, false); // 女巫帽
    add(portal, cyl(0.6, 0.6, 0.06, 12), blackMat, 0, 8.5, 1.5, false);
    add(portal, cyl(0.32, 0.36, 0.1, 12), greenGlow, 0, 8.58, 1.5, false);
    // 門前樓梯（好矮，唔阻行路）
    for (let i = 0; i < 2; i++) add(portal, tiledBox(5.6 - i * 1.2, 0.08, 1.6 - i * 0.6, 1), trimMat, 0, 0.12 + i * 0.08, 2.3 - i * 0.4);
    halo(portal, 0, 3.2, 1.8, 4.6, PURPLE, 0.4);
    // 門兩邊：石座 + 紫火盆
    for (const s of [-1, 1]) {
      const wz = T.z + s * 4.2, wx = DX - 1.6;
      add(cg, tiledBox(1.3, 1.2, 1.3, 1), trimMat, wx, 0.6, wz);
      brazier(cg, wx, wz, { y: 1.2, h: 1.0, color: PURPLE, s: 1.0, pool: false });
      col(wx, wz, 0.75);
    }
    for (const s of [-1, 1]) col(DX - 1.0, T.z + s * 2.6, 0.6); // 門柱
    lightPool(cg, DX - 3, T.z, 5.5, PURPLE, 0.3, 0.12);
    // 發光門（紫色漩渦，尖拱形）
    const doorM = new THREE.MeshBasicMaterial({ map: swirlTex('#e040fb', '#1a0033'), transparent: true, depthWrite: false, side: THREE.DoubleSide });
    towerDoor = new THREE.Mesh(archPlane(3.8, 3.9, 6.6), doorM);
    towerDoor.position.set(DX - 0.85, CASTLE_TOP + 0.02, TOWER.z);
    towerDoor.position.x += HX;
    towerDoor.rotation.y = -PI / 2;
    live.add(towerDoor);
    // 未傾偈：門上面有兩條交叉嘅魔法封印
    sealBars = new THREE.Group();
    sealBars.position.set(HX + DX - 1.05, CASTLE_TOP + 2.8, TOWER.z);
    live.add(sealBars);
    const sealM = new THREE.MeshBasicMaterial({ color: 0xff4081, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const s of [-1, 1]) add(sealBars, box(0.1, 0.25, 5.2), sealM, 0, 0, 0, false).rotation.x = s * 0.7;
    add(sealBars, new THREE.TorusGeometry(0.6, 0.08, 6, 20), sealM, 0, 0, 0, false).rotation.y = PI / 2;
    // 門口招牌
    const sign = makeSign([{ text: '🗼 THE WITCH TOWER', size: 0.34 }, { text: 'Ask the Witch to open the door', size: 0.18 }], 4.6, 1.1, THEMES.purple);
    sign.position.set(HX + DX - 0.3, CASTLE_TOP + 11.2, TOWER.z);
    sign.rotation.y = -PI / 2;
    root.add(sign);
    // 圍住座塔轉嘅符文（一舊 mesh 成個轉）
    const parts = [];
    for (let i = 0; i < 14; i++) {
      const a = i * 0.9, y = 10 + i * 3.6, r = rAt(y) + 2.4;
      const g = runePlane(i % 16, 1.3).clone();
      g.rotateY(PI / 2 - a + PI);
      g.translate(Math.cos(a) * r, y, Math.sin(a) * r);
      parts.push(g);
    }
    orbitRunes = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshBasicMaterial({ map: runes, color: 0xff80f0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    orbitRunes.position.set(TOWER.x, CASTLE_TOP, TOWER.z);
    orbitRunes.frustumCulled = false;
    live.add(orbitRunes);
    // 大鐵鏈：由塔陽台拉落東北角樓
    chain(cg, new THREE.Vector3(T.x - br - 1, BY - 1, T.z - 3), new THREE.Vector3(31, 15.5, -187), 5, iron, 1.5);
  });

  // ======================== 6. 庭園：地板、魔法陣、女巫角、花園、藥水架 ========================
  let circle = null, circle2 = null, crystal = null;
  steps.push(() => {
    add(cg, tiledBox(C.maxX - C.minX, 0.1, C.maxZ - C.minZ, 5), floorMat, (C.minX + C.maxX) / 2, 0.05, (C.minZ + C.maxZ) / 2, false);
    // 閘口入嚟嗰段路
    add(cg, tiledBox(7.6, 0.1, 6, 5), floorMat, 0, 0.05, -147, false);
    // 去 Witch Tower 嘅石板路
    for (let x = C.maxX - 2; x < DOOR.x - 1; x += 2.2) add(cg, tiledBox(1.9, 0.1, 2.8, 1.5), trimMat, x, 0.06, T.z, false);
    // 庭園四角大火盆（綠／紫）
    for (const [x, z, c] of [[C.minX + 3, C.maxZ - 3, GREEN], [C.maxX - 3, C.maxZ - 3, PURPLE], [C.minX + 3, C.minZ + 3, PURPLE], [C.maxX - 3, C.minZ + 3, GREEN]]) {
      brazier(cg, x, z, { color: c, s: 1.25 });
      col(x, z, 0.8);
    }
    lightPool(cg, CAULDRON.x - HX, CAULDRON.z, 5, GREEN, 0.3, 0.12);
    // 🔮 魔法陣（會轉）+ 外圈石 + 6 條發光石柱
    const MC = { x: 2, z: -175.5, r: 5.6 };
    const ring = add(cg, new THREE.RingGeometry(MC.r + 0.1, MC.r + 0.6, 40), trimMat, MC.x, 0.11, MC.z, false);
    ring.rotation.x = -PI / 2;
    const cmap = circleTex();
    const cmat = new THREE.MeshBasicMaterial({ map: cmap, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    circle = add(fx, new THREE.PlaneGeometry(MC.r * 2, MC.r * 2), cmat, MC.x, 0.13, MC.z, false);
    circle.rotation.x = -PI / 2;
    circle2 = add(fx, new THREE.PlaneGeometry(MC.r * 0.9, MC.r * 0.9), cmat, MC.x, 0.14, MC.z, false);
    circle2.rotation.x = -PI / 2;
    lightPool(cg, MC.x, MC.z, MC.r * 1.3, PURPLE, 0.3, 0.12);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      const x = MC.x + Math.cos(a) * (MC.r + 1.2), z = MC.z + Math.sin(a) * (MC.r + 1.2);
      add(cg, tiledBox(0.7, 2.2, 0.7, 1), darkMat, x, 1.1, z);
      add(cg, cone(0.55, 0.8, 4), trimMat, x, 2.6, z).rotation.y = PI / 4;
      const gem = add(cg, new THREE.OctahedronGeometry(0.28), i % 2 ? purpleGlow : greenGlow, x, 3.3, z, false);
      gem.scale.y = 1.5;
      halo(cg, x, 3.3, z, 1.1, i % 2 ? PURPLE : GREEN, 0.4);
      col(x, z, 0.55);
    }
    const crM = new THREE.MeshStandardMaterial({ color: 0xe0a0ff, emissive: 0xc040ff, emissiveIntensity: 2.6, roughness: 0.2, metalness: 0.1, flatShading: true });
    crystal = add(fx, new THREE.OctahedronGeometry(0.7), crM, MC.x, 3.0, MC.z, false);
    crystal.scale.y = 1.6;
    halo(fx, MC.x, 3.0, MC.z, 2.6, PURPLE, 0.4);
    // 🧙‍♀️ 女巫角：後面藥水架、魔法書架台、水晶球枱
    const W = { x: WITCH.x - HX, z: WITCH.z };
    potionShelf(cg, W.x, W.z - 3.6, 0, 3.2);
    col(W.x - 0.9, W.z - 3.6, 0.9);
    col(W.x + 0.9, W.z - 3.6, 0.9);
    // 魔法書架台
    const lx = W.x - 3.4, lz = W.z + 0.6;
    add(cg, cyl(0.12, 0.2, 1.2, 6), woodDark, lx, 0.6, lz);
    add(cg, box(0.8, 0.12, 0.6), woodDark, lx, 1.25, lz).rotation.x = -0.4;
    const book = add(cg, box(0.7, 0.08, 0.5), deepPurple, lx, 1.36, lz, false);
    book.rotation.x = -0.4;
    add(cg, box(0.6, 0.02, 0.42), greenGlow, lx, 1.41, lz + 0.02, false).rotation.x = -0.4;
    halo(cg, lx, 1.7, lz, 1.0, GREEN, 0.4);
    col(lx, lz, 0.45);
    // 水晶球枱
    const tx = W.x - 3.0, tz = W.z - 3.4;
    add(cg, cyl(0.7, 0.7, 0.1, 10), woodDark, tx, 1.0, tz);
    add(cg, cyl(0.12, 0.3, 1.0, 6), woodDark, tx, 0.5, tz);
    add(cg, cyl(0.2, 0.25, 0.15, 8), goldGlow, tx, 1.12, tz, false);
    add(cg, ball(0.34, 12, 10), cyanGlow, tx, 1.48, tz, false);
    halo(cg, tx, 1.5, tz, 1.3, 0x80ffea, 0.4);
    col(tx, tz, 0.7);
    // 東牆內面兩個大藥水架
    for (const z of [-185.3, -181.2]) {
      potionShelf(cg, 29.55, z, -PI / 2, 2.8);
      col(29.2, z, 1.2);
    }
    // 🍄 巫婆花園（西北角）：圍欄、發光菇、扭曲樹、南瓜燈、草藥
    const GA = { minX: -29, maxX: -14, minZ: -184, maxZ: -171 };
    const garden = new THREE.Group();
    cg.add(garden);
    add(garden, tiledBox(GA.maxX - GA.minX, 0.08, GA.maxZ - GA.minZ, 2), M(0x2a1820), (GA.minX + GA.maxX) / 2, 0.12, (GA.minZ + GA.maxZ) / 2, false);
    fence(garden, GA.minX, GA.maxZ, -23.2, GA.maxZ);
    fence(garden, -19.6, GA.maxZ, GA.maxX, GA.maxZ);
    fence(garden, GA.maxX, GA.maxZ, GA.maxX, GA.minZ);
    // 拱門（花園入口）
    for (const s of [-1, 1]) add(garden, tiledBox(0.4, 2.6, 0.4, 1), darkMat, -21.4 + s * 1.8, 1.3, GA.maxZ);
    const garch = add(garden, new THREE.TorusGeometry(1.8, 0.14, 5, 16, PI), iron, -21.4, 2.6, GA.maxZ, false);
    garch.rotation.z = 0;
    for (let i = 0; i < 5; i++) {
      const a = (i / 4) * PI;
      add(garden, ball(0.18, 8, 6), i % 2 ? purpleGlow : greenGlow, -21.4 + Math.cos(a) * 1.8, 2.6 + Math.sin(a) * 1.8, GA.maxZ, false);
    }
    const twist = { vein: 0xd070ff, faceColor: 0x76ff03, leaf: 0x2a0f3a, leaf2: 0x173018, fruit: 0x9cff3a };
    twistedTree(garden, -26, -180.5, 0.72, rand, twist);
    twistedTree(garden, -16.6, -182, 0.55, rand, { ...twist, face: false });
    col(-26, -180.5, 0.9);
    col(-16.6, -182, 0.7);
    giantShroom(garden, -25.6, -174.4, 0.7, 0x76ff03);
    giantShroom(garden, -16.2, -175.4, 0.55, 0xd500f9);
    giantShroom(garden, -21.2, -182.6, 0.45, GREEN);
    col(-25.6, -174.4, 0.6);
    col(-16.2, -175.4, 0.5);
    col(-21.2, -182.6, 0.5);
    const scols = [GREEN, PURPLE];
    for (let i = 0; i < 14; i++) {
      const x = GA.minX + 1 + rand() * (GA.maxX - GA.minX - 2), z = GA.minZ + 1 + rand() * (GA.maxZ - GA.minZ - 2);
      if (Math.hypot(x + 26, z + 180.5) < 1.6 || Math.hypot(x + 16.6, z + 182) < 1.4) continue;
      shroomCluster(garden, x, z, 0.8 + rand() * 0.6, scols[i % 2], rand);
    }
    // 草藥（一行行發光細葉）
    for (let r = 0; r < 3; r++)
      for (let i = 0; i < 9; i++) {
        const x = -27 + i * 1.3 + (r % 2) * 0.6, z = -178.6 + r * 1.2;
        if (Math.hypot(x + 26, z + 180.5) < 1.6) continue;
        const leaf = add(garden, cone(0.14, 0.5, 4), r === 1 ? greenGlow : M(0x2e5d2a), x, 0.38, z, false);
        leaf.rotation.y = i;
      }
    pumpkin(garden, -27.6, -172.4, 0.7, true, PI + 0.4, 0.1);
    pumpkin(garden, -14.8, -172.4, 0.55, true, PI - 0.3, 0.1);
    pumpkin(garden, -19.2, -183.2, 0.6, true, PI, 0.1);
    lightPool(garden, -21.5, -177.5, 8, GREEN, 0.3, 0.13);
    // 鍋邊：柴堆 + 幾個細藥水瓶喺地
    for (let i = 0; i < 4; i++) add(cg, cyl(0.12, 0.12, 1.4, 6), wood, CAULDRON.x - HX - 1.6, 0.16 + (i % 2) * 0.22, CAULDRON.z + 0.6 + (i % 3) * 0.12, true).rotation.set(PI / 2, 0, 0.2 * i);
    for (let i = 0; i < 4; i++) bottle(cg, CAULDRON.x - HX + 1.5 + i * 0.32, 0.1, CAULDRON.z + 0.8 - (i % 2) * 0.3, i);
  });
  // 藥水瓶（4 種形狀、5 隻顏色）
  function bottle(p, x, y, z, k) {
    const m = [greenGlow, purpleGlow, cyanGlow, goldGlow][k % 4];
    const kind = (k * 7) % 4;
    if (kind === 0) {
      add(p, ball(0.15, 8, 6), m, x, y + 0.15, z, false);
      add(p, cyl(0.05, 0.05, 0.16, 5), m, x, y + 0.34, z, false);
    } else if (kind === 1) {
      add(p, cyl(0.08, 0.09, 0.36, 6), m, x, y + 0.18, z, false);
      add(p, cyl(0.04, 0.04, 0.12, 5), m, x, y + 0.42, z, false);
    } else if (kind === 2) {
      add(p, box(0.18, 0.24, 0.12), m, x, y + 0.12, z, false);
      add(p, cyl(0.04, 0.04, 0.1, 5), m, x, y + 0.29, z, false);
    } else {
      add(p, cone(0.14, 0.3, 6), m, x, y + 0.15, z, false);
      add(p, cyl(0.035, 0.035, 0.12, 5), m, x, y + 0.36, z, false);
    }
    add(p, cyl(0.045, 0.045, 0.06, 5), wood, x, y + (kind === 1 ? 0.5 : kind === 0 ? 0.44 : 0.38), z, false); // 木塞
  }
  // 矮鐵欄（尖頂）+ 石柱
  function fence(p, x1, z1, x2, z2, h = 1.1) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.max(2, Math.round(len / 0.4));
    for (let i = 0; i <= n; i++) {
      const k = i / n, x = x1 + (x2 - x1) * k, z = z1 + (z2 - z1) * k;
      add(p, box(0.06, h, 0.06), iron, x, h / 2, z, false);
      add(p, cone(0.07, 0.22, 4), iron, x, h + 0.1, z, false);
    }
    const a = Math.atan2(x2 - x1, z2 - z1);
    for (const y of [0.25, h - 0.2]) add(p, box(0.05, 0.07, len), iron, (x1 + x2) / 2, y, (z1 + z2) / 2, false).rotation.y = a;
    const np = Math.max(1, Math.round(len / 4));
    for (let i = 0; i <= np; i++) {
      const k = i / np;
      add(p, tiledBox(0.45, h + 0.35, 0.45, 1), darkMat, x1 + (x2 - x1) * k, (h + 0.35) / 2, z1 + (z2 - z1) * k);
    }
  }
  // 藥水架：木架 + 3 層 + 瓶 + 書 + 頂上南瓜燈
  function potionShelf(p, x, z, ry, w = 2.8) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    p.add(g);
    const H = 3.0, D = 0.6;
    for (const s of [-1, 1]) add(g, tiledBox(0.14, H, D, 1), wood, s * w / 2, H / 2, 0);
    add(g, tiledBox(w, H, 0.06, 1), woodDark, 0, H / 2, -D / 2 + 0.03);
    add(g, tiledBox(w + 0.3, 0.12, D + 0.1, 1), wood, 0, H, 0);
    const lr = seeded(Math.round(x * 13 + z * 7));
    for (const y of [0.2, 1.1, 2.0]) {
      add(g, tiledBox(w - 0.1, 0.07, D, 1), wood, 0, y, 0, false);
      let px = -w / 2 + 0.25;
      let k = Math.floor(lr() * 5);
      while (px < w / 2 - 0.25) {
        if (lr() < 0.3) { // 書
          const bw = 0.12 + lr() * 0.06, bh = 0.5 + lr() * 0.2;
          const bk = add(g, box(bw, bh, 0.4), lr() < 0.5 ? deepPurple : M(0x5d1a1a), px, y + 0.035 + bh / 2, 0, false);
          bk.rotation.z = (lr() - 0.5) * 0.25;
          px += bw + 0.04;
        } else {
          bottle(g, px + 0.08, y + 0.035, (lr() - 0.5) * 0.2, k++);
          px += 0.36;
        }
      }
    }
    pumpkin(g, -w / 2 + 0.5, 0, 0.35, true, 0, H + 0.06);
    halo(g, 0, 1.4, 0.6, 1.8, PURPLE, 0.4);
  }

  // ======================== 7. 焊埋 + 會郁嘅嘢 ========================
  let flameIM = null, coreIM = null, flameData = [];
  let candles = null, bats = null, smoke = null, sparks = null;
  steps.push(() => {
    // 同一隻材質嘅影一致（唔係會分開兩舊 → 多咗 draw call）：實心嘢有影，發光／透明嘅冇
    cg.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      o.castShadow = !(m.transparent || m.isMeshBasicMaterial || (m.emissiveIntensity > 1 && !m.map));
    });
    bakeStatic(cg, root);
    // 招牌（城堡門口）
    const csign = makeSign([{ text: '🏰 WITCH CASTLE', size: 0.36 }, { text: '🧙‍♀️ The Witch is waiting inside!', size: 0.18 }], 5, 1.2, THEMES.purple);
    csign.position.set(HX, CASTLE_TOP + 10.5, CASTLE_GATE_Z + 2.55);
    root.add(csign);

    // 🔥 巫火（InstancedMesh：外層顏色 + 白色心）
    const fMat = new THREE.MeshBasicMaterial({ map: flameTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const fGeo = new THREE.ConeGeometry(0.42, 1.5, 8, 1, true).translate(0, 0.75, 0);
    const cGeo = new THREE.ConeGeometry(0.2, 0.8, 6, 1, true).translate(0, 0.4, 0);
    flameIM = new THREE.InstancedMesh(fGeo, fMat, flames.length);
    coreIM = new THREE.InstancedMesh(cGeo, fMat, flames.length);
    const c = new THREE.Color();
    flames.forEach(([x, y, z, s, colr], i) => {
      flameIM.setColorAt(i, c.setHex(colr).multiplyScalar(1.6));
      coreIM.setColorAt(i, c.setHex(colr === GREEN ? 0xeaffc0 : 0xffd0ff).multiplyScalar(1.4));
      flameData.push({ x: HX + x, y: CASTLE_TOP + y, z, s, ph: rand() * 10 });
    });
    for (const im of [flameIM, coreIM]) {
      im.frustumCulled = false;
      live.add(im);
    }

    // 🕯️ 浮住嘅蠟燭（蠟 + 火 + 光點）
    const cand = [];
    const MC = { x: 2, z: -175.5 };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      cand.push([MC.x + Math.cos(a) * 4.2, 3.0 + (i % 3) * 0.3, MC.z + Math.sin(a) * 4.2]);
    }
    let tries = 0;
    while (cand.length < 40 && tries++ < 400) {
      const x = C.minX + 2 + rand() * (C.maxX - C.minX - 4), z = C.minZ + 2 + rand() * (C.maxZ - C.minZ - 4);
      if (x < -13 && z < -170) continue; // 花園有樹
      cand.push([x, 3.6 + rand() * 4, z]);
    }
    for (let i = 0; i < 6; i++) cand.push([WITCH.x - HX - 2.4 + i, 2.6 + (i % 2) * 0.5, WITCH.z - 2.6]); // 女巫頭頂
    const n = cand.length;
    const waxM = M(0xfff3e0, { emissive: 0x3a2a10, emissiveIntensity: 0.25 });
    const wax = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.08, 1, 6).translate(0, -0.5, 0), waxM, n);
    const fl = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.24, 5).translate(0, 0.12, 0), GLOW(0xffcc66, 3.2), n);
    const gPos = new Float32Array(n * 3);
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
    const glow = new THREE.Points(gGeo, new THREE.PointsMaterial({ color: 0xffb050, size: 1.1, map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
    for (const o of [wax, fl, glow]) {
      o.frustumCulled = false;
      live.add(o);
    }
    candles = { wax, fl, glow, list: cand.map(([x, y, z]) => ({ x: HX + x, y: CASTLE_TOP + y, z, len: 0.3 + rand() * 0.4, ph: rand() * 10 })) };

    // 🦇 蝙蝠（身 + 左翼 + 右翼，三個 InstancedMesh）
    const batM = new THREE.MeshBasicMaterial({ color: 0x1a0c20, side: THREE.DoubleSide });
    const ws = new THREE.Shape();
    ws.moveTo(0, 0.14); ws.lineTo(0.42, 0.22); ws.lineTo(0.95, 0.06); ws.lineTo(0.76, -0.08); ws.lineTo(0.56, 0); ws.lineTo(0.38, -0.14); ws.lineTo(0.18, -0.04); ws.lineTo(0, -0.12);
    const wR = new THREE.ShapeGeometry(ws).rotateX(-PI / 2);
    const wL = wR.clone().scale(-1, 1, 1);
    const body = new THREE.BoxGeometry(0.22, 0.18, 0.4);
    const NB = 30;
    const mk = (g) => {
      const im = new THREE.InstancedMesh(g, batM, NB);
      im.frustumCulled = false;
      live.add(im);
      return im;
    };
    const centers = [
      [T.x, T.z, 9, 16, 34, 70],
      [0, -196, 10, 20, 28, 48],
      [0, CASTLE_GATE_Z, 6, 10, 18, 26],
    ];
    const list = [];
    for (let i = 0; i < NB; i++) {
      const [cx, cz, r0, r1, y0, y1] = centers[i % 3 === 0 ? 0 : i % 3 === 1 ? (i < 20 ? 0 : 1) : (i % 2 ? 1 : 2)];
      list.push({ cx: HX + cx, cz, r: r0 + rand() * (r1 - r0), y: CASTLE_TOP + y0 + rand() * (y1 - y0), sp: (0.35 + rand() * 0.4) * (rand() < 0.5 ? 1 : -1), ph: rand() * PI * 2, s: 0.9 + rand() * 0.8, f: 10 + rand() * 6 });
    }
    bats = { body: mk(body), wl: mk(wL), wr: mk(wR), list };

    // 🫕 大鍋冒煙（綠色，慢慢升、慢慢散）
    const SN = 46;
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SN * 3), 3));
    smoke = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0x8bc34a, size: 1.5, map: glowTex(), transparent: true, depthWrite: false, opacity: 0.33 }));
    smoke.frustumCulled = false;
    smoke.userData.n = SN;
    live.add(smoke);
    // ✨ 塔門前嘅紫色閃粉
    const PN = 40;
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PN * 3), 3));
    sparks = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xff8cff, size: 0.28, map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sparks.frustumCulled = false;
    sparks.userData.base = Array.from({ length: PN }, () => [rand() * 2.4, (rand() - 0.5) * 4.4, rand(), 0.5 + rand()]);
    live.add(sparks);
  });

  // ======================== 每格更新 ========================
  const o = new THREE.Object3D();
  const ow = new THREE.Object3D();
  return {
    get towerDoor() { return towerDoor; },
    update(dt, t, quality = 3) {
      if (!flameIM) return;
      runeMat.userData.uTime.value = t;
      runeLineMat.userData.uTime.value = t;
      fallMap.offset.y = t * 0.9;
      // 火焰閃
      flameData.forEach((f, i) => {
        const k = 0.85 + Math.sin(t * 11 + f.ph) * 0.12 + Math.sin(t * 23 + f.ph * 2) * 0.06;
        o.position.set(f.x, f.y, f.z);
        o.rotation.set(Math.sin(t * 3 + f.ph) * 0.06, t * 2 + f.ph, Math.cos(t * 2.6 + f.ph) * 0.06);
        o.scale.set(f.s * (1.05 - k * 0.1), f.s * k * 1.15, f.s * (1.05 - k * 0.1));
        o.updateMatrix();
        flameIM.setMatrixAt(i, o.matrix);
        o.scale.set(f.s, f.s * (0.8 + Math.sin(t * 17 + f.ph) * 0.15), f.s);
        o.updateMatrix();
        coreIM.setMatrixAt(i, o.matrix);
      });
      flameIM.instanceMatrix.needsUpdate = coreIM.instanceMatrix.needsUpdate = true;
      // 魔法陣、水晶
      circle.rotation.z = t * 0.12;
      circle2.rotation.z = -t * 0.3;
      circle.material.opacity = 0.75 + Math.sin(t * 2) * 0.2;
      crystal.rotation.y = t * 1.2;
      crystal.position.y = 3.0 + Math.sin(t * 1.5) * 0.25;
      // 塔頂波、塔門、封印、圍住塔轉嘅符文
      towerOrb.material.emissiveIntensity = 2.4 + Math.sin(t * 2) * 0.8;
      towerDoor.material.opacity = state.witchMet ? 0.88 + Math.sin(t * 4) * 0.12 : 0.4;
      towerDoor.material.map.center.set(0.5, 0.5);
      towerDoor.material.map.rotation = t * (state.witchMet ? 0.9 : 0.3);
      sealBars.visible = !state.witchMet;
      if (sealBars.visible) sealBars.rotation.x = Math.sin(t * 1.5) * 0.08;
      orbitRunes.rotation.y = -t * 0.35;
      // 蠟燭
      const showC = quality <= 0 ? 0 : quality <= 1 ? Math.floor(candles.list.length / 2) : candles.list.length;
      candles.wax.count = candles.fl.count = showC;
      candles.glow.visible = showC > 0;
      candles.glow.geometry.setDrawRange(0, showC);
      const gp = candles.glow.geometry.attributes.position.array;
      for (let i = 0; i < showC; i++) {
        const c = candles.list[i];
        const y = c.y + Math.sin(t * 1.3 + c.ph) * 0.25;
        o.position.set(c.x, y, c.z);
        o.rotation.set(Math.sin(t + c.ph) * 0.08, 0, Math.cos(t * 0.8 + c.ph) * 0.08);
        o.scale.set(1, c.len, 1);
        o.updateMatrix();
        candles.wax.setMatrixAt(i, o.matrix);
        o.scale.set(1, 0.8 + Math.sin(t * 14 + c.ph) * 0.2, 1);
        o.updateMatrix();
        candles.fl.setMatrixAt(i, o.matrix);
        gp[i * 3] = c.x;
        gp[i * 3 + 1] = y + 0.15;
        gp[i * 3 + 2] = c.z;
      }
      candles.wax.instanceMatrix.needsUpdate = candles.fl.instanceMatrix.needsUpdate = true;
      candles.glow.geometry.attributes.position.needsUpdate = true;
      // 🦇 蝙蝠
      const showB = quality >= 2;
      bats.body.visible = bats.wl.visible = bats.wr.visible = showB;
      if (showB) {
        bats.list.forEach((b, i) => {
          const a = b.ph + t * b.sp;
          o.position.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(t * 0.9 + b.ph) * 1.6, b.cz + Math.sin(a) * b.r);
          const dir = Math.sign(b.sp);
          o.rotation.set(0, Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir), dir * -0.35, 'YXZ');
          o.scale.setScalar(b.s);
          o.updateMatrix();
          bats.body.setMatrixAt(i, o.matrix);
          const flap = Math.sin(t * b.f + b.ph) * 0.8;
          for (const [im, s] of [[bats.wr, 1], [bats.wl, -1]]) {
            ow.position.set(0, 0, 0);
            ow.rotation.set(0, 0, s * flap);
            ow.scale.setScalar(1);
            ow.updateMatrix();
            ow.matrix.premultiply(o.matrix);
            im.setMatrixAt(i, ow.matrix);
          }
        });
        bats.body.instanceMatrix.needsUpdate = bats.wl.instanceMatrix.needsUpdate = bats.wr.instanceMatrix.needsUpdate = true;
      }
      // 🫕 煙
      smoke.visible = quality >= 2;
      if (smoke.visible) {
        const sp = smoke.geometry.attributes.position.array;
        const n = smoke.userData.n;
        for (let i = 0; i < n; i++) {
          const p = (t * 0.22 + i / n) % 1;
          const a = i * 2.39 + t * 0.4;
          const r = 0.25 + p * 1.6;
          sp[i * 3] = CAULDRON.x + Math.cos(a) * r + Math.sin(t * 0.5 + i) * p * 0.6;
          sp[i * 3 + 1] = CASTLE_TOP + 1.7 + p * 7.5;
          sp[i * 3 + 2] = CAULDRON.z + Math.sin(a) * r;
        }
        smoke.geometry.attributes.position.needsUpdate = true;
      }
      // ✨ 塔門閃粉
      sparks.visible = quality >= 1;
      if (sparks.visible) {
        const pp = sparks.geometry.attributes.position.array;
        sparks.userData.base.forEach(([dx, dz, ph, sp], i) => {
          const k = (t * 0.3 * sp + ph) % 1;
          pp[i * 3] = TOWER_DOOR.x - 0.8 - dx;
          pp[i * 3 + 1] = CASTLE_TOP + 0.3 + k * 6.5;
          pp[i * 3 + 2] = TOWER.z + dz + Math.sin(t * 2 + i) * 0.3;
        });
        sparks.geometry.attributes.position.needsUpdate = true;
        sparks.material.opacity = state.witchMet ? 0.95 : 0.35;
      }
    },
  };
}
