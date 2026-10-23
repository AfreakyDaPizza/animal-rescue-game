// 護林員皮膚嘅花紋（小朋友 Issue #14：「Ranger skins too ugly」）
// 全部用 canvas 畫（唔使下載圖），畫一次就記住（同一款花紋所有公仔共用）
// 花紋（pattern）：可以重複鋪（RepeatWrapping）—— 布紋、迷彩、條紋、星星、鱗片、電路板、鎖子甲…
// 徽章（decal）：一張透明底嘅細圖（襟章、臂章、紋章），貼喺薄片上面

import * as THREE from 'three';

const cache = new Map();
const S = 128; // 花紋大細（px）

// 固定 seed 嘅隨機數：每次畫出嚟都一樣（唔會每次開遊戲花紋都唔同）
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashKey = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const css = (n) => (typeof n === 'number' ? `#${n.toString(16).padStart(6, '0')}` : n);

function make(key, draw, { size = S, srgb = true, repeat = true } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size, rng(hashKey(key)));
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

// 喺邊位附近畫嘢：四邊都畫多次，咁鋪起嚟唔見接駁位
function wrap(size, x, y, r, fn) {
  for (const dx of [-size, 0, size]) {
    for (const dy of [-size, 0, size]) {
      if (x + dx + r < 0 || x + dx - r > size || y + dy + r < 0 || y + dy - r > size) continue;
      fn(x + dx, y + dy);
    }
  }
}

// ---------- 花紋 ----------
// 布紋：底色 + 好幼嘅經緯線 + 細點（似帆布／卡其布）
export const fabric = (base, k = 1) => make(`fabric${base}|${k}`, (ctx, s, r) => {
  ctx.fillStyle = css(base);
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < s; i += 2) {
    ctx.fillStyle = `rgba(0,0,0,${0.05 * k})`;
    ctx.fillRect(0, i, s, 1);
    ctx.fillStyle = `rgba(255,255,255,${0.04 * k})`;
    ctx.fillRect(i, 0, 1, s);
  }
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = r() < 0.5 ? `rgba(0,0,0,${0.08 * k})` : `rgba(255,255,255,${0.07 * k})`;
    ctx.fillRect(r() * s, r() * s, 1 + r() * 2, 1);
  }
});

// 迷彩：一嚿嚿唔規則嘅色塊
export const camo = (colors) => make(`camo${colors}`, (ctx, s, r) => {
  ctx.fillStyle = css(colors[0]);
  ctx.fillRect(0, 0, s, s);
  colors.slice(1).forEach((c) => {
    ctx.fillStyle = css(c);
    for (let i = 0; i < 9; i++) {
      const x = r() * s;
      const y = r() * s;
      const rad = 8 + r() * 14;
      wrap(s, x, y, rad * 2.2, (px, py) => {
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.ellipse(px + (r() - 0.5) * rad * 1.6, py + (r() - 0.5) * rad, rad * (0.6 + r() * 0.6), rad * (0.4 + r() * 0.4), r() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  });
});

// 條紋：dir 'h' 打橫、'v' 打直、'd' 斜
export const stripes = (colors, w = 16, dir = 'h') => make(`stripes${colors}|${w}|${dir}`, (ctx, s) => {
  const n = Math.round(s / w);
  if (dir === 'd') {
    for (let i = -n; i < n * 2; i++) {
      ctx.fillStyle = css(colors[((i % colors.length) + colors.length) % colors.length]);
      ctx.beginPath();
      ctx.moveTo(i * w, 0);
      ctx.lineTo(i * w + w, 0);
      ctx.lineTo(i * w + w - s, s);
      ctx.lineTo(i * w - s, s);
      ctx.fill();
    }
  } else {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = css(colors[i % colors.length]);
      if (dir === 'h') ctx.fillRect(0, i * w, s, w);
      else ctx.fillRect(i * w, 0, w, s);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < s; i += 2) ctx.fillRect(0, i, s, 1);
});

// 星空：底色 + 幾團星雲 + 星星（有啲係四角星）
export const starfield = (bg, nebula = [], starCols = ['#ffffff'], n = 60, { glowOnly = false } = {}) => make(`stars${bg}|${nebula}|${starCols}|${n}|${glowOnly}`, (ctx, s, r) => {
  ctx.fillStyle = glowOnly ? '#000' : css(bg);
  ctx.fillRect(0, 0, s, s);
  if (!glowOnly) {
    nebula.forEach((c, i) => {
      const x = r() * s;
      const y = r() * s;
      const rad = 30 + r() * 30;
      wrap(s, x, y, rad, (px, py) => {
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, css(c));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = g;
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        ctx.globalAlpha = 1;
      });
      if (i > 3) return;
    });
  }
  for (let i = 0; i < n; i++) {
    const x = r() * s;
    const y = r() * s;
    ctx.fillStyle = css(starCols[i % starCols.length]);
    if (i % 9 === 0) {
      // 四角星
      ctx.beginPath();
      const a = 4 + r() * 2;
      ctx.moveTo(x, y - a);
      ctx.lineTo(x + 1, y - 1);
      ctx.lineTo(x + a, y);
      ctx.lineTo(x + 1, y + 1);
      ctx.lineTo(x, y + a);
      ctx.lineTo(x - 1, y + 1);
      ctx.lineTo(x - a, y);
      ctx.lineTo(x - 1, y - 1);
      ctx.fill();
    } else ctx.fillRect(x, y, r() < 0.3 ? 2 : 1, r() < 0.3 ? 2 : 1);
  }
});

// 鱗片：一行行半圓（龍、惡魔）
export const scales = (base, light, dark, w = 16) => make(`scales${base}|${light}|${dark}|${w}`, (ctx, s) => {
  ctx.fillStyle = css(dark);
  ctx.fillRect(0, 0, s, s);
  const h = w * 0.7;
  for (let row = -1; row < s / h + 1; row++) {
    for (let col = -1; col < s / w + 1; col++) {
      const x = col * w + (row % 2 ? w / 2 : 0);
      const y = row * h;
      const g = ctx.createLinearGradient(x, y, x, y + w * 0.8);
      g.addColorStop(0, css(light));
      g.addColorStop(1, css(base));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + w / 2, y, w / 2 - 0.8, 0, Math.PI);
      ctx.fill();
    }
  }
});

// 電路板：直角嘅線 + 圓點；glowOnly = 黑底白線（做 emissiveMap 用）
export const circuit = (bg, line, { glowOnly = false } = {}) => make(`circuit${bg}|${line}|${glowOnly}`, (ctx, s, r) => {
  ctx.fillStyle = glowOnly ? '#000' : css(bg);
  ctx.fillRect(0, 0, s, s);
  if (!glowOnly) {
    // 暗暗哋嘅格仔底
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i <= s; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, s);
      ctx.moveTo(0, i);
      ctx.lineTo(s, i);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = glowOnly ? '#fff' : css(line);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 2;
  ctx.lineCap = 'square';
  for (let i = 0; i < 12; i++) {
    let x = Math.round((r() * s) / 8) * 8;
    let y = Math.round((r() * s) / 8) * 8;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
    let horiz = r() < 0.5;
    for (let k = 0; k < 4; k++) {
      const len = (1 + Math.floor(r() * 4)) * 8 * (r() < 0.5 ? -1 : 1);
      if (horiz) x += len;
      else y += len;
      if (k === 1) {
        // 斜一斜（似真電路板）
        x += 8;
        y += 8;
      }
      ctx.lineTo(x, y);
      horiz = !horiz;
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(x - 3, y - 3, 6, 6);
    ctx.fill();
  }
});

// 鎖子甲：一行行細圈
export const chainmail = (base) => make(`chain${base}`, (ctx, s) => {
  ctx.fillStyle = '#263238';
  ctx.fillRect(0, 0, s, s);
  const w = 8;
  for (let row = 0; row <= s / (w * 0.6) + 1; row++) {
    for (let col = -1; col <= s / w; col++) {
      const x = col * w + (row % 2 ? w / 2 : 0) + w / 2;
      const y = row * w * 0.6;
      ctx.strokeStyle = css(base);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, w * 0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, w * 0.38, Math.PI * 1.1, Math.PI * 1.6);
      ctx.stroke();
    }
  }
});

// 太空衣嘅棉格：一格格鼓起 + 縫線
export const quilt = (base, seam, cell = 32) => make(`quilt${base}|${seam}|${cell}`, (ctx, s) => {
  ctx.fillStyle = css(base);
  ctx.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += cell) {
    for (let x = 0; x < s; x += cell) {
      const g = ctx.createRadialGradient(x + cell * 0.4, y + cell * 0.4, 1, x + cell / 2, y + cell / 2, cell * 0.7);
      g.addColorStop(0, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.strokeStyle = css(seam);
  ctx.lineWidth = 2;
  for (let i = 0; i <= s; i += cell) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, s);
    ctx.moveTo(0, i);
    ctx.lineTo(s, i);
    ctx.stroke();
  }
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  for (let i = 4; i <= s; i += cell) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, s);
    ctx.stroke();
  }
});

// 毛：好多細細嘅短線（熊貓衫）
export const fur = (base, light, dark) => make(`fur${base}|${light}|${dark}`, (ctx, s, r) => {
  ctx.fillStyle = css(base);
  ctx.fillRect(0, 0, s, s);
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 900; i++) {
    const x = r() * s;
    const y = r() * s;
    const a = Math.PI / 2 + (r() - 0.5) * 0.9;
    ctx.strokeStyle = css(r() < 0.5 ? light : dark);
    ctx.globalAlpha = 0.35 + r() * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
});

// 熔岩／惡魔裂紋（黑底白線：做 emissiveMap；或者有底色）
export const cracks = (bg, line, n = 14, w = 2.5) => make(`cracks${bg}|${line}|${n}|${w}`, (ctx, s, r) => {
  ctx.fillStyle = css(bg);
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = css(line);
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    let x = r() * s;
    let y = r() * s;
    let a = r() * Math.PI * 2;
    let lw = w + r() * w;
    for (let k = 0; k < 6; k++) {
      a += (r() - 0.5) * 1.4;
      const nx = x + Math.cos(a) * (8 + r() * 10);
      const ny = y + Math.sin(a) * (8 + r() * 10);
      ctx.lineWidth = lw;
      for (const dx of [-s, 0, s]) {
        for (const dy of [-s, 0, s]) {
          ctx.beginPath();
          ctx.moveTo(x + dx, y + dy);
          ctx.lineTo(nx + dx, ny + dy);
          ctx.stroke();
        }
      }
      x = nx;
      y = ny;
      lw = Math.max(0.8, lw * 0.8);
    }
  }
});

// 冰霜：淺色底 + 雪花／冰晶線
export const frost = (base, line) => make(`frost${base}|${line}`, (ctx, s, r) => {
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, css(base));
  g.addColorStop(0.5, '#e1f5fe');
  g.addColorStop(1, css(base));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = css(line);
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const x = r() * s;
    const y = r() * s;
    const rad = 6 + r() * 9;
    wrap(s, x, y, rad, (px, py) => {
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(a) * rad, py + Math.sin(a) * rad);
        const mx = px + Math.cos(a) * rad * 0.55;
        const my = py + Math.sin(a) * rad * 0.55;
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(a + 0.7) * rad * 0.3, my + Math.sin(a + 0.7) * rad * 0.3);
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(a - 0.7) * rad * 0.3, my + Math.sin(a - 0.7) * rad * 0.3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
  }
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.5})`;
    ctx.fillRect(r() * s, r() * s, 1, 1);
  }
});

// 皇室花紋（damask）：菱形格 + 小花
export const damask = (base, motif) => make(`damask${base}|${motif}`, (ctx, s) => {
  ctx.fillStyle = css(base);
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = css(motif);
  ctx.fillStyle = css(motif);
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.5;
  const c = 32;
  for (let y = 0; y <= s; y += c) {
    for (let x = 0; x <= s; x += c) {
      ctx.beginPath();
      ctx.moveTo(x, y - c / 2);
      ctx.lineTo(x + c / 2, y);
      ctx.lineTo(x, y + c / 2);
      ctx.lineTo(x - c / 2, y);
      ctx.closePath();
      ctx.stroke();
      // 中間細花（4 塊花瓣）
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(x + c / 2 + Math.cos(a) * 3.5, y + c / 2 + Math.sin(a) * 3.5, 3.2, 1.8, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
});

// 白貂毛（皇帝披風領）：白底 + 黑色小尾巴點
export const ermine = () => make('ermine', (ctx, s, r) => {
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(150,150,170,${r() * 0.25})`;
    ctx.fillRect(r() * s, r() * s, 1, 3);
  }
  ctx.fillStyle = '#111';
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * 32 + (row % 2 ? 16 : 0) + 8;
      const y = row * 32 + 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 9);
      ctx.lineTo(x + 3, y + 9);
      ctx.fill();
      ctx.fillRect(x - 1, y - 2, 2, 4);
    }
  }
});

// 六角格（科幻、金色英雄）
export const hexes = (base, line, glowOnly = false) => make(`hex${base}|${line}|${glowOnly}`, (ctx, s) => {
  ctx.fillStyle = glowOnly ? '#000' : css(base);
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = glowOnly ? '#fff' : css(line);
  ctx.lineWidth = glowOnly ? 1.5 : 1.2;
  const rad = 8;
  const w = rad * Math.sqrt(3);
  for (let row = -1; row < s / (rad * 1.5) + 1; row++) {
    for (let col = -1; col < s / w + 1; col++) {
      const cx = col * w + (row % 2 ? w / 2 : 0);
      const cy = row * rad * 1.5;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k / 6) * Math.PI * 2;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
});

// 皮革：底色 + 斑駁 + 少少皺
export const leather = (base) => make(`leather${base}`, (ctx, s, r) => {
  ctx.fillStyle = css(base);
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 40; i++) {
    const x = r() * s;
    const y = r() * s;
    const rad = 6 + r() * 12;
    wrap(s, x, y, rad, (px, py) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    });
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < 12; i++) {
    const x = r() * s;
    const y = r() * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 14, y + (r() - 0.5) * 6);
    ctx.stroke();
  }
});

// 金屬拉絲：打橫細紋（盔甲、金色英雄）
export const brushed = (base) => make(`brushed${base}`, (ctx, s, r) => {
  ctx.fillStyle = css(base);
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = r() < 0.5 ? `rgba(255,255,255,${r() * 0.12})` : `rgba(0,0,0,${r() * 0.12})`;
    ctx.fillRect(0, r() * s, s, 1);
  }
});

// 彩虹斜紋（會郁：offset 由皮膚動畫推）
export const rainbow = () => make('rainbow', (ctx, s) => {
  for (let i = 0; i < s; i++) {
    ctx.fillStyle = `hsl(${(i / s) * 360}, 95%, 58%)`;
    ctx.fillRect(i, 0, 1, s);
  }
  // 斜嘅白光條
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#fff';
  for (let i = -s; i < s * 2; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 8, 0);
    ctx.lineTo(i + 8 - s, s);
    ctx.lineTo(i - s, s);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
});

// 星星同月亮（魔法師長袍）
export const moonStars = (base, col) => make(`moonstars${base}|${col}`, (ctx, s, r) => {
  ctx.fillStyle = css(base);
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < s; i += 3) ctx.fillRect(0, i, s, 1);
  ctx.fillStyle = css(col);
  const star = (x, y, a) => {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const rr = k % 2 ? a * 0.42 : a;
      const ang = -Math.PI / 2 + (k / 10) * Math.PI * 2;
      ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    }
    ctx.fill();
  };
  for (let i = 0; i < 7; i++) star(r() * s, r() * s, 3 + r() * 4);
  for (let i = 0; i < 2; i++) {
    const x = 20 + r() * (s - 40);
    const y = 20 + r() * (s - 40);
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x + 4, y - 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  for (let i = 0; i < 40; i++) ctx.fillRect(r() * s, r() * s, 1, 1);
});

// 柔軟圓點（粒子用）
export const softDot = () => make('softDot', (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}, { size: 32, repeat: false });

// ---------- 徽章（透明底） ----------
const decal = (key, draw) => make(`decal:${key}`, (ctx, s, r) => draw(ctx, s, r), { repeat: false });

function shieldPath(ctx, s, inset = 0) {
  const a = inset;
  ctx.beginPath();
  ctx.moveTo(a + 8, a + 6);
  ctx.lineTo(s - a - 8, a + 6);
  ctx.lineTo(s - a - 8, s * 0.55);
  ctx.quadraticCurveTo(s - a - 10, s * 0.85, s / 2, s - a - 4);
  ctx.quadraticCurveTo(a + 10, s * 0.85, a + 8, s * 0.55);
  ctx.closePath();
}
function starPath(ctx, x, y, R, r0 = 0.45, n = 5) {
  ctx.beginPath();
  for (let k = 0; k < n * 2; k++) {
    const rr = k % 2 ? R * r0 : R;
    const a = -Math.PI / 2 + (k / (n * 2)) * Math.PI * 2;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function paw(ctx, x, y, k, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(x, y + 6 * k, 11 * k, 9 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, dy] of [[-12, -6], [-4, -13], [4, -13], [12, -6]]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * k, y + dy * k, 4 * k, 5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const DECALS = {
  // 護林員金色襟章：盾形 + 星
  rangerBadge: () => decal('rangerBadge', (ctx, s) => {
    shieldPath(ctx, s);
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#fff59d');
    g.addColorStop(0.5, '#ffc107');
    g.addColorStop(1, '#ff8f00');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#8d5a00';
    ctx.stroke();
    starPath(ctx, s / 2, s * 0.48, s * 0.26);
    ctx.fillStyle = '#b26a00';
    ctx.fill();
    starPath(ctx, s / 2, s * 0.47, s * 0.2);
    ctx.fillStyle = '#ffe082';
    ctx.fill();
  }),
  // 護林員臂章：啡色邊、綠色底、雪山 + 松樹 + 腳印
  rangerPatch: () => decal('rangerPatch', (ctx, s) => {
    shieldPath(ctx, s);
    ctx.fillStyle = '#5d4037';
    ctx.fill();
    shieldPath(ctx, s, 9);
    ctx.fillStyle = '#2e7d32';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#81d4fa';
    ctx.fillRect(0, 0, s, s * 0.45);
    ctx.fillStyle = '#eceff1';
    ctx.beginPath();
    ctx.moveTo(s * 0.15, s * 0.55);
    ctx.lineTo(s * 0.45, s * 0.2);
    ctx.lineTo(s * 0.75, s * 0.55);
    ctx.fill();
    ctx.fillStyle = '#1b5e20';
    for (const [x, h] of [[0.3, 0.4], [0.62, 0.48], [0.78, 0.34]]) {
      ctx.beginPath();
      ctx.moveTo(s * x, s * (0.82 - h));
      ctx.lineTo(s * (x + 0.1), s * 0.8);
      ctx.lineTo(s * (x - 0.1), s * 0.8);
      ctx.fill();
    }
    ctx.fillStyle = '#33691e';
    ctx.fillRect(0, s * 0.78, s, s);
    ctx.restore();
    paw(ctx, s / 2, s * 0.8, 0.8, '#fff8e1');
    ctx.fillStyle = '#ffd54f';
    ctx.font = `bold ${s * 0.13}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('RANGER', s / 2, s * 0.17);
  }),
  // 名牌
  nameTag: () => decal('nameTag', (ctx, s) => {
    ctx.fillStyle = '#263238';
    ctx.fillRect(4, s * 0.3, s - 8, s * 0.4);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${s * 0.22}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('RESCUE', s / 2, s * 0.58);
  }),
  // 太空任務徽章：圓形、星球 + 軌道
  mission: () => decal('mission', (ctx, s) => {
    ctx.fillStyle = '#0d47a1';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#e0e0e0';
    ctx.stroke();
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.arc(s * 0.45, s * 0.55, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff7043';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(s / 2, s / 2, s * 0.36, s * 0.12, -0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    for (const [x, y] of [[0.3, 0.25], [0.72, 0.3], [0.68, 0.75]]) {
      starPath(ctx, s * x, s * y, 6);
      ctx.fill();
    }
  }),
  // 騎士紋章：藍盾 + 金色腳印（保育騎士！）
  crest: () => decal('crest', (ctx, s) => {
    shieldPath(ctx, s);
    ctx.fillStyle = '#ffd54f';
    ctx.fill();
    shieldPath(ctx, s, 8);
    ctx.fillStyle = '#1565c0';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#1e88e5';
    ctx.fillRect(s / 2, 0, s, s * 0.5);
    ctx.fillRect(0, s * 0.5, s / 2, s);
    ctx.restore();
    paw(ctx, s / 2, s * 0.5, 1.3, '#ffd54f');
  }),
  // 船錨（海盜帽）
  anchor: () => decal('anchor', (ctx, s) => {
    ctx.strokeStyle = '#ffd54f';
    ctx.fillStyle = '#ffd54f';
    ctx.lineWidth = s * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.18, s * 0.08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s / 2, s * 0.26);
    ctx.lineTo(s / 2, s * 0.85);
    ctx.moveTo(s * 0.3, s * 0.38);
    ctx.lineTo(s * 0.7, s * 0.38);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.55, s * 0.3, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }),
  // 雪花（發光）
  snowflake: () => decal('snowflake', (ctx, s) => {
    ctx.strokeStyle = '#e1f5fe';
    ctx.shadowColor = '#40c4ff';
    ctx.shadowBlur = 10;
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.06;
    const c = s / 2;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const ex = c + Math.cos(a) * s * 0.4;
      const ey = c + Math.sin(a) * s * 0.4;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.lineTo(ex, ey);
      const mx = c + Math.cos(a) * s * 0.25;
      const my = c + Math.sin(a) * s * 0.25;
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.cos(a + 0.8) * s * 0.12, my + Math.sin(a + 0.8) * s * 0.12);
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.cos(a - 0.8) * s * 0.12, my + Math.sin(a - 0.8) * s * 0.12);
      ctx.stroke();
    }
  }),
  // 電子忍者標誌：六角形 + 閃電
  cyberLogo: () => decal('cyberLogo', (ctx, s) => {
    ctx.strokeStyle = '#18ffff';
    ctx.shadowColor = '#18ffff';
    ctx.shadowBlur = 8;
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + (k / 6) * Math.PI * 2;
      ctx.lineTo(s / 2 + Math.cos(a) * s * 0.4, s / 2 + Math.sin(a) * s * 0.4);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#ff4081';
    ctx.shadowColor = '#ff4081';
    ctx.beginPath();
    ctx.moveTo(s * 0.56, s * 0.2);
    ctx.lineTo(s * 0.34, s * 0.54);
    ctx.lineTo(s * 0.5, s * 0.54);
    ctx.lineTo(s * 0.42, s * 0.82);
    ctx.lineTo(s * 0.68, s * 0.44);
    ctx.lineTo(s * 0.52, s * 0.44);
    ctx.closePath();
    ctx.fill();
  }),
  // 銀河星球徽章
  planet: () => decal('planet', (ctx, s) => {
    const g = ctx.createRadialGradient(s * 0.4, s * 0.4, 2, s / 2, s / 2, s * 0.3);
    g.addColorStop(0, '#ea80fc');
    g.addColorStop(1, '#6200ea');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd740';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.ellipse(s / 2, s / 2, s * 0.45, s * 0.12, -0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    starPath(ctx, s * 0.8, s * 0.2, s * 0.08);
    ctx.fill();
  }),
  // 皇室徽：紫底金冠
  royal: () => decal('royal', (ctx, s) => {
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a148c';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.moveTo(s * 0.28, s * 0.66);
    ctx.lineTo(s * 0.28, s * 0.38);
    ctx.lineTo(s * 0.39, s * 0.5);
    ctx.lineTo(s * 0.5, s * 0.32);
    ctx.lineTo(s * 0.61, s * 0.5);
    ctx.lineTo(s * 0.72, s * 0.38);
    ctx.lineTo(s * 0.72, s * 0.66);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.58, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }),
};
