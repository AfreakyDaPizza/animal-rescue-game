// 🏚️ 鬼鎮（Ghost World 嘅樣）—— 小朋友 2026-10-22：「make the ghost town more abandoned town vibe」
// 以前係一塊紫色格仔地 + 幾嚿石；而家係一個荒廢咗嘅西部小鎮：
// - 裂咗嘅石仔大街、爛街燈（有啲閃下閃下）、歪歪斜斜封咗木板嘅屋同舖（爛窗）
// - 北面一座斜咗嘅鐘樓教堂（個鐘停咗）、生鏽水塔、爛圍欄、枯樹、風滾草、蜘蛛網
// - 舊酒館招牌喺度搖、廢棄木頭車、街上飄緊嘅霧、烏鴉（企喺屋頂、喺天上兜圈）
// 位置（每間屋行唔入嘅長方形）喺 halloweenShape.js GHOST_TOWN；鬼魂只喺空地出現（ghostOpen）
// 玩法唔郁：火車站、Statue of Halloween、吸塵機舖、鬼魂空地全部保留（呢個檔淨係「樣」）
//
// 效能：唔郁嘅嘢全部放 root（halloweenWorld.js 個 region 會 bakeStatic 焊埋，同一份材質 = 一個 draw call）
// 閃燈係郁「材質」（焊埋之後都得）；風滾草／霧／飛緊嘅烏鴉用 InstancedMesh；數量跟畫質（G 掣）

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { addCollider } from './world.js';
import { GHOST_WORLD, GHOST_TOWN, inGhostWorld } from './halloweenShape.js';
import {
  M, GLOW, add, grp, box, cyl, cone, ball, geo, tiledBox, canvasTex, seeded, plankTex, shingleTex, brickTex, glowTex,
  deadTree, tombstone, instanced, tuftGeo, tuftMat, rockGeo, mistLayer,
} from './halloweenArt.js';

const G = GHOST_WORLD;
const shade = (c, l) => '#' + new THREE.Color(c).offsetHSL(0, 0, l).getHexString();

// ---------- 紋理（canvas 即場畫，像素風）----------
// 長方形 canvas（招牌用；canvasTex 只畫正方形）
function rectTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const once = (make) => {
  let t = null;
  return () => t || (t = make());
};
// 同一張圖、唔同重複次數（每塊地自己一份 repeat）
const repeated = (tex, rx, ry) => {
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
};

// 裂咗嘅石仔路：一粒粒圓角石，有裂紋、甩咗嘅石（露出泥）、石縫生雜草
const cobbleTex = once(() => canvasTex(128, (ctx, s) => {
  const rand = seeded(311);
  ctx.fillStyle = '#1d1922';
  ctx.fillRect(0, 0, s, s);
  const tones = [0x6b6370, 0x5f5866, 0x726b6a, 0x5a5260, 0x676070];
  const rows = 6, rh = s / rows;
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -9 : 0;
    while (x < s) {
      const w = 16 + Math.floor(rand() * 10) * 2;
      const y0 = Math.round(r * rh + 2), h = Math.round(rh - 4);
      const x0 = Math.round(x + 2), ww = w - 4;
      const missing = rand() < 0.07; // 甩咗嘅石：泥
      const base = tones[Math.floor(rand() * tones.length)];
      for (let yy = 0; yy < h; yy += 2)
        for (let xx = 0; xx < ww; xx += 2) {
          const cx = Math.min(xx, ww - xx - 2), cy = Math.min(yy, h - yy - 2);
          if (cx + cy < 3) continue;
          let col;
          if (missing) col = shade(0x3a2f28, (rand() - 0.5) * 0.06);
          else {
            let l = (rand() - 0.5) * 0.05;
            if (yy < 3 || xx < 3) l += 0.06;
            if (yy > h - 5 || xx > ww - 5) l -= 0.08;
            col = shade(base, l);
          }
          ctx.fillStyle = col;
          for (const ox of [0, s, -s]) ctx.fillRect(x0 + xx + ox, y0 + yy, 2, 2);
        }
      if (!missing && rand() < 0.3) { // 枯草（石縫）
        ctx.fillStyle = 'rgba(120,130,80,0.6)';
        for (let k = 0; k < 4; k++) ctx.fillRect(x0 + Math.floor(rand() * ww / 2) * 2, y0 + h - 2, 2, 2 + Math.floor(rand() * 2) * 2);
      }
      x += w;
    }
  }
  // 裂紋：一條條彎彎曲曲嘅深色線
  ctx.fillStyle = '#120f16';
  for (let n = 0; n < 7; n++) {
    let px = rand() * s, py = rand() * s;
    let dir = rand() * Math.PI * 2;
    for (let k = 0; k < 18; k++) {
      ctx.fillRect(Math.floor(px / 2) * 2, Math.floor(py / 2) * 2, 2, 2);
      dir += (rand() - 0.5) * 1.2;
      px = (px + Math.cos(dir) * 2 + s) % s;
      py = (py + Math.sin(dir) * 2 + s) % s;
    }
  }
}));
// 泥地：深啡紫色，有枯草、細石
const dirtTex = once(() => canvasTex(128, (ctx, s) => {
  const rand = seeded(97);
  for (let y = 0; y < s; y += 2)
    for (let x = 0; x < s; x += 2) {
      ctx.fillStyle = shade(0x3a3034, (rand() - 0.5) * 0.06);
      ctx.fillRect(x, y, 2, 2);
    }
  for (let n = 0; n < 260; n++) { // 枯草
    ctx.fillStyle = rand() < 0.6 ? 'rgba(150,130,90,0.35)' : 'rgba(90,100,70,0.35)';
    ctx.fillRect(Math.floor(rand() * 64) * 2, Math.floor(rand() * 64) * 2, 2, 2 + Math.floor(rand() * 3) * 2);
  }
  for (let n = 0; n < 60; n++) { // 細石
    ctx.fillStyle = rand() < 0.5 ? 'rgba(160,150,170,0.35)' : 'rgba(0,0,0,0.25)';
    ctx.fillRect(Math.floor(rand() * 64) * 2, Math.floor(rand() * 64) * 2, 4, 2);
  }
}));
// 窗：broken = 爛玻璃（剩返幾塊尖角）；lit = 入面有淡綠光，仲有隻小鬼仔望出嚟（可愛，唔恐怖）
const windowTex = (kind) => canvasTex(64, (ctx, s) => {
  const rand = seeded(kind === 'lit' ? 41 : 17);
  ctx.fillStyle = '#2b2119';
  ctx.fillRect(0, 0, s, s);
  for (const [x, y] of [[6, 6], [34, 6], [6, 34], [34, 34]]) {
    if (kind === 'lit') {
      const g = ctx.createLinearGradient(0, y, 0, y + 24);
      g.addColorStop(0, '#b9ffd2');
      g.addColorStop(1, '#3f9a6a');
      ctx.fillStyle = g;
    } else ctx.fillStyle = '#0e0c16';
    ctx.fillRect(x, y, 24, 24);
    if (kind === 'broken') {
      ctx.fillStyle = 'rgba(170,185,215,0.6)';
      for (let k = 0; k < 4; k++) { // 角落嘅玻璃碎
        const sx = k % 2 ? -1 : 1, sy = k > 1 ? -1 : 1;
        const cx = x + (k % 2 ? 24 : 0), cy = y + (k > 1 ? 24 : 0);
        if (rand() < 0.35) continue;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + sx * (5 + rand() * 13), cy);
        ctx.lineTo(cx + sx * rand() * 6, cy + sy * (5 + rand() * 13));
        ctx.fill();
      }
    } else if (kind === 'lit') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x + 3, y + 3, 4, 14);
    }
  }
  if (kind === 'lit') { // 小鬼仔：白色波波頭 + 兩粒眼
    ctx.fillStyle = '#f4fff8';
    ctx.beginPath();
    ctx.arc(46, 46, 8, Math.PI, 0);
    ctx.lineTo(54, 58);
    ctx.lineTo(50, 55);
    ctx.lineTo(46, 58);
    ctx.lineTo(42, 55);
    ctx.lineTo(38, 58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#20302a';
    ctx.fillRect(42, 44, 3, 4);
    ctx.fillRect(48, 44, 3, 4);
  }
});
// 招牌：舊木板 + 褪色油漆字（甩油）
function signTex(lines, { ink = '#e9dcbc', wood = 0x5a4232, w = 512, h = 128 } = {}) {
  return rectTex(w, h, (ctx) => {
    const rand = seeded(lines.join('').length * 7 + 3);
    const boards = 3;
    for (let i = 0; i < boards; i++) {
      ctx.fillStyle = shade(wood, (rand() - 0.5) * 0.08);
      ctx.fillRect(0, (i * h) / boards, w, h / boards);
      ctx.fillStyle = shade(wood, -0.12);
      ctx.fillRect(0, ((i + 1) * h) / boards - 3, w, 3);
      for (let k = 0; k < 14; k++) {
        ctx.fillStyle = shade(wood, -0.05 - rand() * 0.05);
        ctx.fillRect(rand() * w, (i * h) / boards + 4 + rand() * (h / boards - 10), 20 + rand() * 60, 2);
      }
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const main = lines[0];
    let size = h * (lines.length > 1 ? 0.42 : 0.62);
    ctx.font = `bold ${size}px Georgia, 'Times New Roman', serif`;
    while (ctx.measureText(main).width > w * 0.9) ctx.font = `bold ${(size *= 0.92)}px Georgia, 'Times New Roman', serif`;
    const y1 = lines.length > 1 ? h * 0.36 : h * 0.54;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText(main, w / 2 + 3, y1 + 3);
    ctx.fillStyle = ink;
    ctx.fillText(main, w / 2, y1);
    if (lines[1]) {
      let s2 = h * 0.2;
      ctx.font = `bold ${s2}px Georgia, serif`;
      while (ctx.measureText(lines[1]).width > w * 0.9) ctx.font = `bold ${(s2 *= 0.92)}px Georgia, serif`;
      ctx.fillText(lines[1], w / 2, h * 0.77);
    }
    // 甩油：一笪笪木色蓋住啲字
    for (let n = 0; n < 160; n++) {
      ctx.fillStyle = shade(wood, (rand() - 0.5) * 0.06);
      ctx.globalAlpha = 0.5 + rand() * 0.5;
      ctx.fillRect(rand() * w, rand() * h, 2 + rand() * 7, 2 + rand() * 4);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1b1410'; // 釘
    for (const x of [10, w - 16]) for (const y of [8, h - 14]) ctx.fillRect(x, y, 5, 5);
  });
}
// 停咗嘅鐘：12 點差 2 分（指針唔郁）+ 一條裂痕
const clockTex = once(() => canvasTex(128, (ctx, s) => {
  ctx.fillStyle = '#d9cfae';
  ctx.fillRect(0, 0, s, s);
  const c = s / 2;
  ctx.strokeStyle = '#2a2126';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(c, c, c - 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#2a2126';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r1 = c - 14, big = i % 3 === 0;
    ctx.save();
    ctx.translate(c + Math.sin(a) * r1, c - Math.cos(a) * r1);
    ctx.rotate(a);
    ctx.fillRect(-2, -(big ? 8 : 5), 4, big ? 14 : 8);
    ctx.restore();
  }
  const hand = (a, len, w) => {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(a);
    ctx.fillRect(-w / 2, -len, w, len + 6);
    ctx.restore();
  };
  hand(-0.21, c * 0.72, 4); // 分針：58 分
  hand(-0.04, c * 0.48, 7); // 時針：差唔多 12 點
  ctx.beginPath();
  ctx.arc(c, c, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,30,0.8)'; // 裂痕
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(18, 40);
  for (const [x, y] of [[40, 52], [52, 50], [70, 70], [84, 74], [104, 100]]) ctx.lineTo(x, y);
  ctx.stroke();
}, { nearest: false }));
// 生鏽鐵：橫接縫 + 鉚釘 + 鏽水痕
const rustTex = once(() => canvasTex(64, (ctx, s) => {
  const rand = seeded(55);
  for (let y = 0; y < s; y += 2)
    for (let x = 0; x < s; x += 2) {
      ctx.fillStyle = shade(0x6e4a3a, (rand() - 0.5) * 0.07);
      ctx.fillRect(x, y, 2, 2);
    }
  for (let n = 0; n < 16; n++) { // 鏽水痕（向下流）
    ctx.fillStyle = rand() < 0.6 ? 'rgba(170,90,40,0.55)' : 'rgba(40,24,18,0.5)';
    ctx.fillRect(Math.floor(rand() * 32) * 2, Math.floor(rand() * 32) * 2, 2, 6 + Math.floor(rand() * 10) * 2);
  }
  for (let r = 0; r < 4; r++) {
    ctx.fillStyle = '#3a2620';
    ctx.fillRect(0, r * 16 + 14, s, 2);
    ctx.fillStyle = '#9a7a62';
    for (let x = 2; x < s; x += 8) ctx.fillRect(x, r * 16 + 11, 2, 2);
  }
}));
// 蜘蛛網（四分一個網，貼喺角落）
const webTex = once(() => canvasTex(64, (ctx, s) => {
  ctx.clearRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(235,235,250,0.85)';
  ctx.lineWidth = 1.2;
  const spokes = 6;
  for (let i = 0; i <= spokes; i++) {
    const a = (i / spokes) * (Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * s * 1.1, Math.sin(a) * s * 1.1);
    ctx.stroke();
  }
  for (let r = 8; r < s; r += 9) {
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * (Math.PI / 2);
      const rr = r * (i % 2 ? 0.92 : 1); // 少少垂低
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.stroke();
  }
}, { nearest: false, wrap: false }));
// 「WANTED: GHOSTS」街招（可愛版）
const posterTex = once(() => canvasTex(64, (ctx, s) => {
  ctx.fillStyle = '#d6c49a';
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = 'rgba(120,90,50,0.35)';
  ctx.fillRect(0, 0, s, 3);
  ctx.fillRect(0, s - 4, s, 4);
  ctx.fillStyle = '#3a2618';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('WANTED', s / 2, 14);
  ctx.font = 'bold 9px Georgia, serif';
  ctx.fillText('GHOSTS', s / 2, 58);
  ctx.fillStyle = '#fbfbf4'; // 小鬼仔
  ctx.beginPath();
  ctx.arc(32, 32, 10, Math.PI, 0);
  ctx.lineTo(42, 46);
  ctx.lineTo(37, 42);
  ctx.lineTo(32, 46);
  ctx.lineTo(27, 42);
  ctx.lineTo(22, 46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a2226';
  ctx.fillRect(27, 28, 3, 4);
  ctx.fillRect(34, 28, 3, 4);
}));
// 理髮舖柱：紅白斜紋
const barberTex = once(() => canvasTex(32, (ctx, s) => {
  ctx.fillStyle = '#e8e2d6';
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#9a2f2f';
  for (let i = -s; i < s * 2; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 8, 0);
    ctx.lineTo(i + 8 + s, s);
    ctx.lineTo(i + s, s);
    ctx.fill();
  }
}));

// ---------- 材質 ----------
const WALLS = [0x5d4b3f, 0x4f4a54, 0x6a5547, 0x4a3f4a]; // 少啲款 = 焊埋之後少啲 draw call
const wallM = (c) => M(0xffffff, { map: plankTex(c) });
const roofM = (c) => M(0xffffff, { map: shingleTex(c) });
const stoneM = (c) => M(0xffffff, { map: brickTex(c) });
const dark = () => M(0x16121a);
const iron = () => M(0x1d1a22, { metalness: 0.5, roughness: 0.5 });
const oldWood = () => M(0xffffff, { map: plankTex(0x6a5f55) });
const boardM = () => M(0xffffff, { map: plankTex(0x7a6650) });
const windowMats = once(() => ({
  broken: M(0xffffff, { map: windowTex('broken') }),
  lit: (() => {
    const t = windowTex('lit');
    return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.9, roughness: 0.6 });
  })(),
}));
const webM = once(() => new THREE.MeshBasicMaterial({ map: webTex(), transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false, opacity: 0.8 }));
const poolMat = (color, k) => new THREE.MeshBasicMaterial({ color, map: glowTex(), transparent: true, opacity: k, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 });
const haloMat = (color, k) => new THREE.MeshBasicMaterial({ color, map: glowTex(), transparent: true, opacity: k, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const LAMP = 0xffbe6a;

// 三角形（山牆）：底闊 d、高 h、厚 w（沿 x）
const prism = (w, d, h) => geo(`gtPrism${w}|${d}|${h}`, () => {
  const sh = new THREE.Shape();
  sh.moveTo(-d / 2, 0);
  sh.lineTo(d / 2, 0);
  sh.lineTo(0, h);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(-w / 2, 0, 0);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 0.5);
  return g;
});
const plane = (w, h) => geo(`gtPlane${w}|${h}`, () => new THREE.PlaneGeometry(w, h));

// ---------- 小道具 ----------
// 蜘蛛網：貼喺 (x, y, z)，flip 揀向邊個角
function web(parent, x, y, z, s = 1, ry = 0, flip = 0) {
  const m = add(parent, plane(1, 1), webM(), x, y, z, false);
  m.rotation.set(0, ry, flip);
  m.scale.setScalar(s);
  m.receiveShadow = false;
  return m;
}
// 烏鴉（企喺度）：黑色身、頭、灰色嘴、尾
function crow(parent, x, y, z, ry = 0) {
  const g = grp(parent, x, y, z, ry);
  const black = M(0x121016);
  add(g, box(0.28, 0.26, 0.46), black, 0, 0.2, 0, false);
  add(g, box(0.22, 0.22, 0.22), black, 0, 0.38, 0.22, false);
  add(g, cone(0.06, 0.2, 4), M(0x55505c), 0, 0.37, 0.4, false).rotation.x = Math.PI / 2;
  add(g, box(0.2, 0.04, 0.3), black, 0, 0.22, -0.32, false).rotation.x = -0.4;
  for (const s of [-1, 1]) add(g, box(0.03, 0.03, 0.03), M(0xfff6c0), s * 0.08, 0.42, 0.33, false); // 眼
  for (const s of [-1, 1]) add(g, box(0.03, 0.12, 0.03), M(0x3a3438), s * 0.07, 0.03, 0.02, false); // 腳
  return g;
}
// 木桶（有鐵箍）
function barrel(parent, x, z, rand, tipped = false) {
  const g = grp(parent, x, tipped ? 0.42 : 0, z, rand() * 6);
  if (tipped) g.rotation.z = Math.PI / 2;
  add(g, cyl(0.38, 0.42, 0.95, 10), M(0xffffff, { map: plankTex(0x6b4c36) }), 0, tipped ? 0 : 0.475, 0);
  for (const y of [0.18, 0.77]) add(g, cyl(0.43, 0.43, 0.07, 10), iron(), 0, (tipped ? -0.475 : 0) + y, 0, false);
}
// 木箱（有啲爛咗、歪咗）
function crate(parent, x, z, rand, y = 0, s = 0.8) {
  const c = add(parent, tiledBox(s, s, s, 1), boardM(), x, y + s / 2, z);
  c.rotation.set(0, rand() * 1.5, (rand() - 0.5) * 0.1);
  return c;
}

// ---------- 屋 ----------
const FACE_ROT = { '+z': 0, '+x': Math.PI / 2, '-z': Math.PI, '-x': -Math.PI / 2 };
function frameOf(b) {
  const alongZ = b.face.endsWith('x'); // 正門向東／西 → 屋闊沿 z
  return {
    cx: (b.minX + b.maxX) / 2, cz: (b.minZ + b.maxZ) / 2,
    W: alongZ ? b.maxZ - b.minZ : b.maxX - b.minX,
    D: alongZ ? b.maxX - b.minX : b.maxZ - b.minZ,
    ry: FACE_ROT[b.face],
  };
}
// 屋內座標 (lx, ly, lz)（正門 = +z）→ 世界座標
const toWorld = (f, lx, ly, lz) => new THREE.Vector3(f.cx + lx * Math.cos(f.ry) + lz * Math.sin(f.ry), ly, f.cz - lx * Math.sin(f.ry) + lz * Math.cos(f.ry));

// 斜屋頂（兩塊瓦 + 山牆），可以穿咗個窿（露出木樑）
function gableRoof(g, W, D, H, pitch, roof, wall, rand, hole = false) {
  const span = D / 2 + 0.5;
  const Ls = span / Math.cos(pitch);
  const ridgeY = H + (D / 2) * Math.tan(pitch);
  add(g, prism(W, D, (D / 2) * Math.tan(pitch)), wall, 0, H, 0);
  const pieces = 3, pw = (W + 0.6) / pieces;
  for (const s of [1, -1]) {
    for (let i = 0; i < pieces; i++) {
      const x = -W / 2 - 0.3 + pw * (i + 0.5);
      if (hole && s === 1 && i === 1) { // 穿窿：淨係剩返幾條木樑
        for (const dx of [-pw * 0.3, 0.05, pw * 0.32]) {
          const r = add(g, box(0.14, 0.14, Ls), M(0x3a2c24), x + dx, 0, 0, false);
          r.rotation.x = pitch;
          r.position.set(x + dx, ridgeY - (Ls / 2) * Math.sin(pitch), (Ls / 2) * Math.cos(pitch));
        }
        continue;
      }
      const m = add(g, tiledBox(Number(pw.toFixed(2)), 0.22, Number(Ls.toFixed(2)), 2), roof, 0, 0, 0);
      m.rotation.x = s > 0 ? pitch : Math.PI - pitch;
      m.position.set(x, ridgeY - (Ls / 2) * Math.sin(pitch) + (rand() - 0.5) * 0.06, s * (Ls / 2) * Math.cos(pitch));
    }
  }
  add(g, box(W + 0.7, 0.2, 0.26), M(0x2e2420), 0, ridgeY + 0.08, 0); // 屋脊
  return ridgeY;
}

// 一間荒廢咗嘅屋／舖（b = halloweenShape GHOST_TOWN.blocks 入面一個）
function building(root, b, rand, ctx) {
  const f = frameOf(b);
  const { W, D } = f;
  const g = grp(root, f.cx, 0, f.cz, f.ry);
  const body = grp(g, 0, 0, 0);
  body.rotation.z = (rand() - 0.5) * 0.06; // 歪歪斜斜
  body.rotation.x = (rand() - 0.5) * 0.03;
  const wc = WALLS[Math.floor(rand() * WALLS.length)];
  const wall = wallM(wc);
  const roof = roofM(rand() < 0.5 ? 0x3f3846 : 0x4a3a34);
  const tall = b.kind === 'tall';
  const shed = b.kind === 'shed';
  const H = tall ? 7.6 : shed ? 3.4 : 4.4;
  add(g, tiledBox(W + 0.3, 0.4, D + 0.3, 2), stoneM(0x5a5462), 0, 0.2, 0); // 地基
  add(body, tiledBox(W, H, D, 2), wall, 0, H / 2 + 0.3, 0);
  const top = H + 0.3;
  const ridgeY = gableRoof(body, W, D, top, shed ? 0.45 : 0.6, roof, wall, rand, rand() < 0.45);
  ctx.ridges.push({ f, y: ridgeY + 0.15, W });
  // 煙囱（歪咗）
  if (!shed) {
    const ch = add(body, tiledBox(0.9, 2.4, 0.9, 1), stoneM(0x6b5a58), W * 0.3, ridgeY - 0.2, -D * 0.2);
    ch.rotation.z = (rand() - 0.5) * 0.2;
  }
  const front = D / 2;
  const wm = windowMats();
  // 窗：爛玻璃，有啲封咗木板，有啲有百葉窗吊咗一邊；間中有一個發淡綠光（入面有隻小鬼仔）
  const floors = tall ? [2.2, 5.8] : [2.1];
  const cols = W > 11 ? [-0.34, 0, 0.34] : [-0.3, 0.3];
  for (const y of floors)
    for (const k of cols) {
      const x = k * W;
      if (y < 3 && Math.abs(x) < 1.2) continue; // 門口位
      const lit = rand() < 0.14;
      add(body, box(1.2, 1.4, 0.08), lit ? wm.lit : wm.broken, x, y + 0.3, front + 0.03, false);
      add(body, box(1.45, 0.14, 0.18), M(0x2a2018), x, y + 0.3 - 0.75, front + 0.08, false); // 窗台
      if (!lit && rand() < 0.4) { // 封木板
        for (const [dy, rz] of [[0.35, 0.12], [-0.05, -0.08], [-0.4, 0.05]]) add(body, box(1.6, 0.2, 0.06), boardM(), x, y + 0.3 + dy, front + 0.1, false).rotation.z = rz;
      } else if (rand() < 0.5) { // 百葉窗吊咗一邊
        const sh = add(body, box(0.58, 1.4, 0.06), M(0xffffff, { map: plankTex(0x4b5a52) }), x + 0.95, y + 0.1, front + 0.12, false);
        sh.rotation.z = 0.35;
      }
      if (rand() < 0.4) web(body, x - 0.55, y + 0.95, front + 0.12, 0.6, 0, -Math.PI / 2);
    }
  // 門：黑窿 + 交叉木板封住（酒館係半截彈弓門）
  if (b.sign === 'SALOON') {
    add(body, box(1.6, 2.4, 0.06), dark(), 0, 1.5, front + 0.03, false);
    for (const s of [-1, 1]) add(body, box(0.72, 1.0, 0.08), boardM(), s * 0.42, 1.6, front + 0.25 + s * 0.12, false).rotation.y = s * 0.5; // 彈弓門（開咗少少）
  } else {
    add(body, box(1.3, 2.3, 0.06), dark(), 0, 1.45, front + 0.03, false);
    add(body, box(1.7, 0.22, 0.07), boardM(), 0, 1.9, front + 0.1, false).rotation.z = 0.5;
    add(body, box(1.7, 0.22, 0.07), boardM(), 0, 1.2, front + 0.1, false).rotation.z = -0.45;
  }
  // 假門面（西部舖頭）：高身木牆 + 大招牌
  const signText = b.sign;
  if (b.kind === 'shop') {
    const Hf = top + 2.6;
    add(body, tiledBox(W + 0.2, Hf, 0.3, 2), wall, 0, Hf / 2, front + 0.15);
    add(body, tiledBox(W * 0.5, 0.8, 0.3, 2), wall, 0, Hf + 0.4, front + 0.15); // 梯級頂
    add(body, box(W + 0.5, 0.18, 0.5), M(0x2e2420), 0, Hf, front + 0.15, false);
    if (signText) {
      const s = add(body, plane(Math.min(W * 0.8, 9), 1.3), M(0xffffff, { map: signTex([signText]), roughness: 0.9 }), 0, top + 1.3, front + 0.32, false);
      s.rotation.z = (rand() - 0.5) * 0.06;
    }
  } else if (signText) { // 屋仔：招牌釘喺門頂
    const s = add(body, plane(3.4, 0.85), M(0xffffff, { map: signTex([signText]), roughness: 0.9 }), 0, 3.25, front + 0.06, false);
    s.rotation.z = (rand() - 0.5) * 0.12;
  }
  if (signText === 'BARBER') { // 理髮舖柱
    const tex = barberTex();
    add(body, cyl(0.16, 0.16, 1.4, 10), M(0xffffff, { map: tex }), 1.3, 1.6, front + 0.3, false);
    add(body, ball(0.18, 8, 6), M(0xd8d0c0), 1.3, 2.4, front + 0.3, false);
  }
  if (signText === 'GENERAL STORE') add(body, plane(0.8, 0.8), M(0xffffff, { map: posterTex() }), -2.6, 1.7, front + 0.06, false).rotation.z = 0.08;
  // 前廊：木地板（有甩板、翹起嘅板）+ 簷篷（一條柱斷咗，簷篷塌低一邊）
  if (!shed && b.kind !== 'chapel') {
    for (let x = -W / 2 + 0.2; x < W / 2 - 0.1; x += 0.36) {
      if (rand() < 0.07) continue;
      const p = add(g, box(0.32, 0.08, 2), M(0xffffff, { map: plankTex(0x5a4a3c) }), x, 0.05, front + 1.15, false);
      if (rand() < 0.06) {
        p.rotation.x = 0.18;
        p.position.y = 0.2;
      }
    }
    const broken = rand() < 0.5;
    const aw = grp(g, 0, top > 4 ? 3.5 : 3.1, front + 1.1);
    add(aw, tiledBox(Number((W * 0.92).toFixed(2)), 0.12, 2.4, 2), roof, 0, 0, 0);
    aw.rotation.x = 0.12;
    if (broken) {
      aw.rotation.z = 0.08;
      aw.position.y -= 0.2;
    }
    const postH = aw.position.y;
    for (const s of [-1, 1]) {
      if (broken && s === 1) { // 斷咗嘅柱：剩返半截 + 跌咗喺地
        add(g, box(0.18, 1.2, 0.18), oldWood(), s * W * 0.43, 0.6, front + 2.1, false);
        const fall = add(g, box(0.18, postH - 1.2, 0.18), oldWood(), s * W * 0.43 - 0.9, 0.1, front + 2.4, false);
        fall.rotation.set(0.2, 0, Math.PI / 2);
        continue;
      }
      add(g, box(0.18, postH, 0.18), oldWood(), s * W * 0.43, postH / 2, front + 2.1, false);
      web(g, s * W * 0.43 - s * 0.05, postH - 0.15, front + 2.1, 0.8, Math.PI / 2, s > 0 ? Math.PI : -Math.PI / 2);
    }
    // 前廊上面嘅木桶、木箱
    if (rand() < 0.8) barrel(g, -W * 0.36, front + 1.0, rand, rand() < 0.25);
    if (rand() < 0.7) crate(g, W * 0.3, front + 0.9, rand, 0.09);
  }
  // 牆身嘅枯藤（由地爬上）
  for (const s of [-1, 1]) {
    if (rand() < 0.4) continue;
    let y = 0.4, x = s * (W / 2 - 0.3);
    while (y < top * 0.8) {
      add(body, box(0.32, 0.28, 0.05), M(rand() < 0.5 ? 0x3d4a2e : 0x4a5232), x, y, front + 0.05, false).rotation.z = rand();
      y += 0.25 + rand() * 0.2;
      x += (rand() - 0.5) * 0.3;
    }
  }
  return { f, g, top, front };
}

// 鐘樓教堂：石屋 + 斜咗嘅鐘樓（鐘停咗、鐘樓頂有個鐘、風向標歪咗）
function chapel(root, b, rand, ctx) {
  const f = frameOf(b);
  const { D } = f;
  const g = grp(root, f.cx, 0, f.cz, f.ry);
  const stone = stoneM(0x5f5868);
  const W = 10;
  add(g, tiledBox(W + 0.6, 0.5, D + 0.6, 2), stoneM(0x4a4452), 0, 0.25, 0);
  add(g, tiledBox(W, 6.5, D, 2), stone, 0, 3.75, 0);
  gableRoof(g, W, D, 7, 0.85, roofM(0x3a3442), stone, rand, true);
  const wm = windowMats();
  for (const s of [-1, 1]) // 側面長窗
    for (const z of [-2.5, 1]) {
      const w = add(g, box(0.08, 2.8, 1.1), rand() < 0.3 ? wm.lit : wm.broken, s * (W / 2 + 0.03), 3.8, z, false);
      w.rotation.y = 0;
    }
  // 鐘樓（向前凸出少少，斜咗）
  const T = grp(g, 0, 0.5, D / 2 - 1.2);
  T.rotation.z = 0.085;
  T.rotation.x = 0.04;
  add(T, tiledBox(4.2, 13, 4.2, 2), stone, 0, 6.5, 0);
  add(T, box(4.6, 0.3, 4.6), M(0x3a3442), 0, 13.1, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(T, box(0.55, 3.6, 0.55), stone, sx * 1.8, 15, sz * 1.8);
  add(T, box(4.6, 0.3, 4.6), M(0x3a3442), 0, 16.9, 0);
  const spire = add(T, cone(3.3, 6.5, 4), roofM(0x2f2a38), 0, 20.3, 0);
  spire.rotation.y = Math.PI / 4;
  add(T, cyl(0.6, 1.05, 1.3, 12), M(0x6a5a3a, { metalness: 0.6, roughness: 0.5 }), 0, 15.1, 0, false); // 鐘
  add(T, ball(0.62, 10, 6), M(0x6a5a3a, { metalness: 0.6, roughness: 0.5 }), 0, 15.7, 0, false);
  add(T, cyl(0.04, 0.04, 2.2, 4), iron(), 0, 24.2, 0, false); // 風向標（歪咗）
  const vane = add(T, box(0.08, 0.3, 1.6), iron(), 0.1, 24.8, 0, false);
  vane.rotation.set(0.3, 0.6, 0.2);
  // 鐘面（前面同兩邊），停咗喺 11:58
  const face = M(0xffffff, { map: clockTex(), roughness: 0.7 });
  const ring = geo('gtClockRing', () => new THREE.TorusGeometry(1.55, 0.14, 6, 24));
  const disc = geo('gtClockDisc', () => new THREE.CircleGeometry(1.5, 24));
  for (const [x, z, ry] of [[0, 2.12, 0], [2.12, 0, Math.PI / 2], [-2.12, 0, -Math.PI / 2]]) {
    add(T, disc, face, x, 10.6, z, false).rotation.y = ry;
    add(T, ring, M(0x2a2228), x, 10.6, z, false).rotation.y = ry;
  }
  // 大門（封咗）+ 樓梯
  add(g, box(2.4, 3.4, 0.1), dark(), 0, 2.2, D / 2 + 1.05, false);
  for (const [y, rz] of [[2.8, 0.3], [1.8, -0.25]]) add(g, box(2.9, 0.26, 0.08), boardM(), 0, y, D / 2 + 1.12, false).rotation.z = rz;
  for (let i = 0; i < 3; i++) add(g, tiledBox(5 - i * 0.6, 0.22, 0.7, 1), stoneM(0x4a4452), 0, 0.11 + i * 0.22, D / 2 + 2.5 - i * 0.45);
  web(g, -1.2, 3.8, D / 2 + 1.12, 1, 0, -Math.PI / 2);
  web(g, 1.2, 3.8, D / 2 + 1.12, 1, 0, Math.PI);
  // 烏鴉企喺鐘樓
  ctx.perches.push([1.6, 17.05, 1.7, T], [-1.7, 17.05, -1.5, T]);
}

// 生鏽水塔（四條腳 + 交叉支架 + 鐵罐 + 尖頂 + 梯）
function waterTower(root, x, z, rand, ctx) {
  const g = grp(root, x, 0, z, rand() * 6);
  g.rotation.z = 0.05; // 斜咗少少
  const leg = M(0xffffff, { map: plankTex(0x4a3c34) });
  const legH = 8;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const l = add(g, cyl(0.16, 0.22, legH, 6), leg, sx * 2.2, legH / 2, sz * 2.2);
    l.rotation.set(-sz * 0.04, 0, sx * 0.04);
  }
  for (const [ax, az, ry] of [[0, -2.2, 0], [2.2, 0, Math.PI / 2], [0, 2.2, 0], [-2.2, 0, Math.PI / 2]])
    for (const [y, rz] of [[3, 0.9], [3, -0.9], [6.2, 0.9]]) {
      if (rand() < 0.15) continue; // 斷咗嘅支架
      const br = add(g, box(5.6, 0.14, 0.14), leg, ax, y, az, false);
      br.rotation.set(0, ry, rz * 0.55);
    }
  const tex = repeated(rustTex(), 5, 1.4);
  const rust = M(0xffffff, { map: tex, metalness: 0.35, roughness: 0.75 });
  add(g, cyl(3, 3, 4.4, 16), rust, 0, legH + 2.2, 0);
  add(g, cyl(3.15, 3.15, 0.25, 16), M(0x3a2a24), 0, legH + 0.1, 0);
  add(g, cone(3.5, 1.9, 16), M(0x4a3028, { metalness: 0.3 }), 0, legH + 5.35, 0);
  for (const y of [legH + 1, legH + 3.4]) add(g, cyl(3.06, 3.06, 0.12, 16), M(0x2f201c), 0, y, 0, false); // 鐵箍
  // 梯
  for (const s of [-0.3, 0.3]) add(g, box(0.07, legH + 1, 0.07), iron(), 3.05 + s * 0, (legH + 1) / 2, s, false);
  for (let y = 0.6; y < legH + 0.8; y += 0.55) add(g, box(0.05, 0.05, 0.64), iron(), 3.05, y, 0, false);
  // 漏水管（吊低、屈咗）
  const pipe = add(g, cyl(0.12, 0.12, 2.4, 6), M(0x3a2a24, { metalness: 0.4 }), -2.2, legH - 0.8, 1.2, false);
  pipe.rotation.z = 0.7;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const p = new THREE.Vector3(sx * 2.2, 0, sz * 2.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y);
    addCollider(x + p.x, z + p.z, 0.45);
  }
  ctx.perchesWorld.push([x, legH + 6.3, z, 0]);
}

// 街燈：on（著住）、flicker（閃下閃下）、broken（玻璃爛咗）、bent（屈咗）、fallen（跌咗喺地）
function streetLamp(root, x, z, kind, ry, mats) {
  const g = grp(root, x, 0, z, ry);
  const pole = iron();
  add(g, box(0.42, 0.35, 0.42), pole, 0, 0.17, 0);
  if (kind === 'fallen') {
    const t = grp(g, 0, 0.35, 0);
    t.rotation.z = Math.PI / 2 - 0.08;
    add(t, cyl(0.08, 0.12, 3.6, 6), pole, 0, 1.8, 0, false);
    add(t, box(0.36, 0.5, 0.36), M(0x2a2a35), 0.3, 3.5, 0, false);
    return;
  }
  add(g, cyl(0.09, 0.13, 1.8, 6), pole, 0, 1.2, 0);
  const up = grp(g, 0, 2.1, 0);
  if (kind === 'bent') up.rotation.z = 0.55;
  add(up, cyl(0.08, 0.09, 1.9, 6), pole, 0, 0.95, 0);
  add(up, box(0.8, 0.08, 0.08), pole, 0.3, 1.85, 0, false);
  const lx = 0.62;
  add(up, cone(0.34, 0.3, 4), pole, lx, 1.85, 0, false).rotation.y = Math.PI / 4;
  add(up, box(0.4, 0.06, 0.4), pole, lx, 1.2, 0, false);
  const glass = kind === 'on' ? mats.steady.lamp : kind === 'flicker' ? mats.flick[mats.next % mats.flick.length].lamp : M(0x2a2a35);
  add(up, box(0.32, 0.5, 0.32), glass, lx, 1.47, 0, false);
  if (kind === 'broken') add(up, cone(0.08, 0.25, 3), M(0x9aa6c0, { transparent: true, opacity: 0.6 }), lx + 0.12, 1.3, 0.1, false);
  if (kind === 'on' || kind === 'flicker') {
    const set = kind === 'on' ? mats.steady : mats.flick[mats.next++ % mats.flick.length];
    for (const r of [0, Math.PI / 2]) { // 燈泡周圍一團光
      const h = add(up, plane(2, 2), set.halo, lx, 1.47, 0, false);
      h.rotation.y = r;
      h.scale.setScalar(0.9);
    }
    const w = toWorld({ cx: x, cz: z, ry }, lx, 0, 0);
    const pool = add(root, geo('gtPool', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)), set.pool, w.x, 0.07, w.z, false);
    pool.scale.set(4.2, 1, 4.2);
  }
  return up;
}

// 廢棄木頭車：一個轆甩咗（跌咗喺隔籬），架車側埋一邊
function cart(root, x, z, ry, rand) {
  const g = grp(root, x, 0, z, ry);
  const wood = M(0xffffff, { map: plankTex(0x5e4a38) });
  const body = grp(g, 0, 0.95, 0);
  body.rotation.z = -0.14;
  body.rotation.x = 0.05;
  add(body, tiledBox(2, 0.18, 3.4, 1), wood, 0, 0, 0);
  for (const s of [-1, 1]) add(body, tiledBox(0.12, 0.6, 3.4, 1), wood, s * 0.95, 0.35, 0);
  add(body, tiledBox(2, 0.6, 0.12, 1), wood, 0, 0.35, -1.65);
  for (let i = 0; i < 3; i++) add(body, box(0.5, 0.5, 0.5), M(0x8a7a50), (rand() - 0.5) * 1.2, 0.35, (rand() - 0.5) * 2.4, false).rotation.y = rand(); // 舊禾稈
  const wheel = (parent, wx, wy, wz, ry2 = 0, rz = 0) => {
    const w = grp(parent, wx, wy, wz, ry2);
    w.rotation.z = rz;
    const rim = add(w, geo('gtWheel', () => new THREE.TorusGeometry(0.62, 0.07, 5, 14)), M(0x3a2c22), 0, 0, 0, false);
    rim.rotation.y = Math.PI / 2;
    for (let k = 0; k < 6; k++) add(w, box(0.05, 1.2, 0.06), M(0x4a3a2c), 0, 0, 0, false).rotation.x = (k / 6) * Math.PI;
    add(w, cyl(0.12, 0.12, 0.2, 8), M(0x2a2018), 0, 0, 0, false).rotation.z = Math.PI / 2;
  };
  wheel(g, -1.1, 0.62, 1.1);
  wheel(g, -1.1, 0.62, -1.1);
  wheel(g, 1.05, 0.42, -1.1, 0, 0);
  wheel(g, 2.2, 0.07, 1.6, 0.3, Math.PI / 2); // 甩咗嘅轆（跌咗喺地）
  const shaft = add(g, box(0.1, 0.1, 2.6), wood, -0.4, 0.5, 2.9, false);
  shaft.rotation.x = 0.35;
  add(g, box(0.1, 0.1, 2.6), wood, 0.4, 0.5, 2.9, false).rotation.x = 0.35;
  addCollider(x, z, 1.7);
  return g;
}

// 爛咗嘅木柵欄：由 (x1,z1) 去 (x2,z2)；有啲柵板甩咗／歪咗，橫木斷咗一截
function picketFence(root, x1, z1, x2, z2, rand, m) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const a = Math.atan2(x2 - x1, z2 - z1);
  const n = Math.max(2, Math.round(len / 0.36));
  for (let i = 0; i <= n; i++) {
    if (rand() < 0.16) continue;
    const k = i / n;
    const h = 1.1 + rand() * 0.35;
    const p = add(root, box(0.13, h, 0.05), m, x1 + (x2 - x1) * k, h / 2, z1 + (z2 - z1) * k, false);
    p.rotation.set(0, a + Math.PI / 2, rand() < 0.2 ? (rand() - 0.5) * 0.7 : (rand() - 0.5) * 0.08);
  }
  for (const y of [0.35, 0.9]) {
    const cut = rand() < 0.3 ? 0.55 : 1;
    const r = add(root, box(0.06, 0.1, len * cut), m, x1 + ((x2 - x1) * cut) / 2, y, z1 + ((z2 - z1) * cut) / 2, false);
    r.rotation.y = a;
    if (cut < 1) r.rotation.x = 0.1;
  }
}

// 風滾草：好多個圈圈（枯枝）揉埋一舊
const tumbleGeo = once(() => {
  const r = seeded(77);
  const parts = [];
  for (let i = 0; i < 14; i++) {
    const t = new THREE.TorusGeometry(i > 9 ? 0.26 : 0.36 + r() * 0.1, 0.022, 3, 9);
    t.rotateX(r() * Math.PI);
    t.rotateY(r() * Math.PI);
    parts.push(t);
  }
  return mergeGeometries(parts);
});

// =====================================================================
// 主體：起成個鬼鎮。root = 焊埋嘅靜態嘢；live = 會郁嘅嘢
// =====================================================================
export function buildGhostTown(root, live) {
  const rand = seeded(2210);
  const T = GHOST_TOWN;
  const W = (x, z) => [G.x + x, G.z + z]; // 相對 → 世界座標
  const town = new THREE.Group(); // 鬼鎮會郁嘅嘢（唔喺 Ghost World 就收埋）
  live.add(town);
  const ctx = { ridges: [], perches: [], perchesWorld: [] };

  // ---- 地：泥地 + 裂石仔大街、橫街、圓形廣場 ----
  add(root, cyl(G.r - 1, G.r - 1, 0.2, 48), M(0xffffff, { map: repeated(dirtTex(), 16, 16), roughness: 1 }), G.x, -0.1, G.z, false);
  const cob = (rx, ry, k) => M(0x8f8896, { map: repeated(cobbleTex(), rx, ry), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -k, polygonOffsetUnits: -k });
  const S = T.street, Cx = T.cross;
  const mainLen = S.maxZ - S.minZ;
  add(root, plane(S.halfW * 2, mainLen), cob((S.halfW * 2) / 3.2, mainLen / 3.2, 2), G.x, 0.015, G.z + (S.minZ + S.maxZ) / 2, false).rotation.x = -Math.PI / 2;
  const crossLen = Cx.maxX - Cx.minX;
  add(root, plane(crossLen, Cx.halfW * 2), cob(crossLen / 3.2, (Cx.halfW * 2) / 3.2, 3), G.x + (Cx.minX + Cx.maxX) / 2, 0.02, G.z, false).rotation.x = -Math.PI / 2;
  add(root, geo('gtPlaza', () => new THREE.CircleGeometry(T.plazaR, 40)), cob(9, 9, 4), G.x, 0.025, G.z, false).rotation.x = -Math.PI / 2;
  // 甩咗石嘅泥窿（有雜草）
  const holeM = M(0xffffff, { map: repeated(dirtTex(), 1, 1), roughness: 1, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
  const potholes = [[3, 22], [-4, 9], [5, -20], [-3, -34], [-22, 2], [18, -2], [38, 1], [-40, -2]];
  for (const [px, pz] of potholes) {
    const [x, z] = W(px, pz);
    const h = add(root, geo('gtHole', () => new THREE.CircleGeometry(1, 9)), holeM, x, 0.035, z, false);
    h.rotation.set(-Math.PI / 2, 0, rand() * 6);
    h.scale.set(0.8 + rand() * 1.2, 0.6 + rand() * 0.8, 1);
  }

  // ---- 屋 ----
  const buildings = [];
  for (const b of T.blocks) {
    if (b.kind === 'chapel') chapel(root, b, rand, ctx);
    else buildings.push({ b, ...building(root, b, rand, ctx) });
  }

  // ---- 酒館／旅館嘅吊牌（會喺風入面搖）----
  const swings = [];
  const hangSign = (bb, text, lx) => {
    const f = frameOf(bb);
    const p = toWorld(f, lx, 0, f.D / 2 + 2.25);
    const pivot = new THREE.Group();
    pivot.position.set(p.x, 3.05, p.z);
    pivot.rotation.order = 'YXZ';
    pivot.rotation.y = f.ry;
    const board = add(pivot, plane(2.2, 0.75), new THREE.MeshStandardMaterial({ map: signTex([text], { wood: 0x4a3426, h: 160 }), side: THREE.DoubleSide, roughness: 0.9 }), 0, -0.85, 0, false);
    board.rotation.z = 0.18; // 一邊條鏈斷咗：歪咗
    for (const s of [-1, 1]) add(pivot, box(0.03, 0.45, 0.03), iron(), s * 0.9, -0.25 + (s > 0 ? 0.1 : 0), 0, false);
    town.add(pivot);
    swings.push({ pivot, p: rand() * 6 });
  };
  for (const { b } of buildings) {
    if (b.sign === 'SALOON') hangSign(b, 'OLD SALOON', 0);
    if (b.sign === 'HOTEL') hangSign(b, 'ROOMS', 2.5);
  }

  // ---- 歡迎牌（落車就見到）----
  {
    const [x, z] = W(-8.5, 33);
    const g = grp(root, x, 0, z, 0.35);
    add(g, box(0.25, 3, 0.25), oldWood(), -2.1, 1.5, 0);
    add(g, box(0.25, 1.9, 0.25), oldWood(), 2.1, 0.95, 0); // 斷咗半截
    const bd = add(g, plane(4.6, 1.6), M(0xffffff, { map: signTex(['WELCOME TO GHOST TOWN', 'Population: 0 ... just ghosts!'], { w: 512, h: 180 }), side: THREE.DoubleSide }), 0, 2.0, 0.14, false);
    bd.rotation.z = -0.1;
    crow(g, -2.1, 3.0, 0, 0.8);
  }

  // ---- 車站：殘舊嘅候車長櫈、行李箱 ----
  {
    const [x, z] = W(-6.5, 47.5);
    const g = grp(root, x, 0, z, 0);
    add(g, tiledBox(2.6, 0.12, 0.6, 1), oldWood(), 0, 0.55, 0).rotation.z = 0.12; // 櫈（一隻腳斷咗）
    add(g, box(0.12, 0.5, 0.5), iron(), -1.1, 0.25, 0);
    add(g, tiledBox(2.6, 0.5, 0.1, 1), oldWood(), 0, 0.95, -0.28).rotation.z = 0.12;
    add(g, box(0.9, 0.55, 0.5), M(0x5a3a2e), 2.2, 0.28, 0.2).rotation.y = 0.4; // 行李箱
    add(g, box(0.92, 0.08, 0.52), M(0x2a1e18), 2.2, 0.48, 0.2).rotation.y = 0.4;
  }

  // ---- 街燈 ----
  const mats = {
    steady: { lamp: GLOW(LAMP, 1.6), pool: poolMat(LAMP, 0.26), halo: haloMat(LAMP, 0.35) },
    flick: [0, 1, 2].map(() => ({ lamp: new THREE.MeshStandardMaterial({ color: LAMP, emissive: LAMP, emissiveIntensity: 2, roughness: 0.5 }), pool: poolMat(LAMP, 0.26), halo: haloMat(LAMP, 0.35), p: rand() * 10 })),
    next: 0,
  };
  const LAMPS = [
    [-7.4, 28, 'flicker'], [7.4, 27, 'on'], [-7.4, -12, 'broken'], [7.4, -12, 'flicker'], [-7.4, -29, 'on'], [7.4, -29.5, 'bent'],
    [-7.4, -41, 'flicker'], [7.4, -41, 'on'],
    [-20, -6.6, 'on'], [-34, 6.6, 'flicker'], [-48, -6.6, 'fallen'], [20, 6.6, 'flicker'], [34, -6.6, 'broken'], [47, 6.6, 'on'],
    [10.6, 10.6, 'flicker'], [-10.6, -10.6, 'on'], [10.6, -10.6, 'bent'], [-10.6, 10.6, 'on'],
    [7.6, 44, 'on'], [-7.6, 44, 'flicker'],
  ];
  for (const [lx, lz, kind] of LAMPS) {
    const [x, z] = W(lx, lz);
    // 燈嘅橫枝（local +x）指向街中間
    const [dx, dz] = Math.abs(lx) < 12 && Math.abs(lz) > 11 ? [-Math.sign(lx), 0] : Math.abs(lz) < 8 ? [0, -Math.sign(lz)] : [-lx, -lz];
    const ry = Math.atan2(-dz, dx);
    streetLamp(root, x, z, kind, ry, mats);
  }

  // ---- 鐘樓、水塔 ----
  {
    const [x, z] = W(-31, 33);
    waterTower(root, x, z, rand, ctx);
  }

  // ---- 廢棄木頭車 ----
  for (const [cx, cz, ry] of [[4.6, 17, 0.25], [-27, -33, 1.2], [37, 28, -0.6]]) {
    const [x, z] = W(cx, cz);
    const c = cart(root, x, z, ry, rand);
    if (rand() < 0.8) crow(c, 0.9, 1.35, -1.6, rand() * 6);
  }

  // ---- 空地：枯樹、石、枯草；揀位要避開街、屋、車站、雕像 ----
  const used = [];
  const inStreet = (x, z, m = 0) => (Math.abs(x) < S.halfW + 2 + m && z > S.minZ - 2 && z < S.maxZ + 2) || (Math.abs(z) < Cx.halfW + 2 + m) || Math.hypot(x, z) < T.plazaR + 2 + m;
  const nearBlock = (x, z, m) => T.blocks.some((b) => G.x + x > b.minX - m && G.x + x < b.maxX + m && G.z + z > b.minZ - m && G.z + z < b.maxZ + m);
  const station = (x, z) => z > 36 && Math.abs(x) < 20;
  const freeSpot = (r, ringMin = 18, ringMax = 52) => {
    for (let k = 0; k < 40; k++) {
      const a = rand() * Math.PI * 2, d = ringMin + rand() * (ringMax - ringMin);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (inStreet(x, z, r) || nearBlock(x, z, r + 1.5) || station(x, z)) continue;
      if (Math.hypot(x + 31, z - 33) < 6 + r || Math.hypot(x - 18, z - 32) < 5 + r) continue; // 水塔、吸塵機舖
      if (used.some(([ux, uz, ur]) => Math.hypot(x - ux, z - uz) < ur + r)) continue;
      used.push([x, z, r]);
      return [x, z];
    }
    return null;
  };
  for (const [cx, cz] of [[-27, -33], [37, 28], [-31, 33]]) used.push([cx, cz, 5]);
  // Boot Hill：細細個墓地（東北面）
  {
    const bx = 30, bz = -33;
    used.push([bx, bz, 9]);
    for (let i = 0; i < 7; i++) {
      const [x, z] = W(bx - 5 + (i % 4) * 3.2 + (rand() - 0.5), bz - 3 + Math.floor(i / 4) * 4 + (rand() - 0.5));
      tombstone(root, x, z, 0.8 + rand() * 0.2, rand, Math.PI / 2 + (rand() - 0.5) * 0.4);
    }
    const fm = M(0xffffff, { map: plankTex(0x6d655c) });
    const [ax, az] = W(bx - 8, bz - 6), [bx2, bz2] = W(bx + 6, bz - 6), [cx2, cz2] = W(bx + 6, bz + 7), [dx, dz] = W(bx - 8, bz + 7);
    picketFence(root, ax, az, bx2, bz2, rand, fm);
    picketFence(root, dx, dz, ax, az, rand, fm);
    picketFence(root, cx2, cz2, dx + 6, dz, rand, fm);
  }
  // 枯樹
  for (let i = 0; i < 16; i++) {
    const p = freeSpot(2.2);
    if (!p) continue;
    const [x, z] = W(...p);
    const t = deadTree(root, x, z, 0.85 + rand() * 0.5, rand, rand() < 0.5 ? 0x3a2e2c : 0x2e2a30);
    addCollider(x, z, 0.55);
    if (i % 3 === 0) ctx.perchesWorld.push([x, t.h * 0.82, z, rand() * 6]);
  }
  // 石同枯樹叢
  const rocks = [], bushes = [], tufts = [];
  for (let i = 0; i < 26; i++) {
    const p = freeSpot(0.8, 16, 54);
    if (!p) continue;
    const [x, z] = W(...p);
    (i % 2 ? rocks : bushes).push([x, i % 2 ? 0.1 : 0.25, z, 0.4 + rand() * 0.6, rand() * 6, i % 2 ? 0.45 : 0.5]);
  }
  instanced(town, rockGeo(), M(0x4a4452, { flatShading: true }), rocks, { shadow: true });
  instanced(town, geo('gtBush', () => new THREE.IcosahedronGeometry(1, 0)), M(0x3e3428, { flatShading: true }), bushes);
  // 枯草：空地好多，街上石縫少少
  for (let i = 0; i < 420; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * 53;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const street = inStreet(x, z, -2);
    if (nearBlock(x, z, 0.3) || (street && rand() < 0.88) || Math.hypot(x, z) < 6) continue;
    tufts.push([G.x + x, 0, G.z + z, (street ? 0.5 : 0.8) + rand() * 0.6, rand() * 3]);
  }
  instanced(town, tuftGeo(), tuftMat(0x7a6e4e), tufts.filter((_, i) => i % 3));
  instanced(town, tuftGeo(), tuftMat(0x55603e), tufts.filter((_, i) => !(i % 3)));

  // ---- 島邊：爛木柵欄一圈（車站嗰度留空）----
  {
    const fm = M(0xffffff, { map: plankTex(0x6d655c) });
    const R = 52.5, segs = 64;
    for (let i = 0; i < segs; i++) {
      const a1 = (i / segs) * Math.PI * 2, a2 = ((i + 1) / segs) * Math.PI * 2;
      const x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R, x2 = Math.cos(a2) * R, z2 = Math.sin(a2) * R;
      if ((z1 > 38 && Math.abs(x1) < 24) || (z2 > 38 && Math.abs(x2) < 24)) continue; // 車站
      if (Math.abs(z1) < Cx.halfW + 1 || Math.abs(x1) < S.halfW && z1 < 0) continue; // 街尾留個缺口
      if (rand() < 0.22) continue; // 冧咗成截
      const [wx1, wz1] = W(x1, z1), [wx2, wz2] = W(x2, z2);
      picketFence(root, wx1, wz1, wx2, wz2, rand, fm);
      if (i % 9 === 0) ctx.perchesWorld.push([wx1, 1.45, wz1, a1]);
    }
  }

  // ---- 屋前空地嘅雜物 ----
  for (let i = 0; i < 10; i++) {
    const p = freeSpot(1, 14, 48);
    if (!p) continue;
    const [x, z] = W(...p);
    if (rand() < 0.5) barrel(root, x, z, rand, rand() < 0.4);
    else {
      crate(root, x, z, rand);
      if (rand() < 0.5) crate(root, x + 0.2, z + 0.1, rand, 0.8, 0.6);
    }
  }

  // ---- 烏鴉（企喺屋頂、柵欄、樹、水塔）----
  for (const r of ctx.ridges) {
    if (rand() < 0.35) continue;
    const n = 1 + Math.floor(rand() * 2);
    for (let k = 0; k < n; k++) {
      const p = toWorld(r.f, (rand() - 0.5) * r.W * 0.8, 0, 0);
      crow(root, p.x, r.y, p.z, rand() * 6);
    }
  }
  for (const [x, y, z, ry] of ctx.perchesWorld) crow(root, x, y, z, ry);
  for (const [x, y, z, parent] of ctx.perches) crow(parent, x, y, z, rand() * 6);

  // ---- 會郁嘅嘢 ----
  // 1) 風滾草：沿住大街（向南吹）同橫街（向東吹）滾，彈下彈下
  const TW_MAX = 8;
  const tw = new THREE.InstancedMesh(tumbleGeo(), M(0x9a7f55, { roughness: 1 }), TW_MAX);
  tw.frustumCulled = false;
  tw.castShadow = true;
  town.add(tw);
  const tws = Array.from({ length: TW_MAX }, (_, i) => ({
    lane: i % 3 === 2 ? 'x' : 'z', s: rand(), off: (rand() - 0.5) * 9, sp: 2 + rand() * 1.8, p: rand() * 6, size: 0.7 + rand() * 0.6,
  }));
  // 2) 霧：一塊塊軟霧沿住街慢慢飄
  const FOG_MAX = 18;
  const fogMat = new THREE.MeshBasicMaterial({ color: 0xbfb0e0, map: glowTex(), transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const fog = new THREE.InstancedMesh(geo('gtFogPlane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), fogMat, FOG_MAX);
  fog.frustumCulled = false;
  fog.renderOrder = 3;
  town.add(fog);
  const fogs = Array.from({ length: FOG_MAX }, (_, i) => ({
    lane: i % 3 === 2 ? 'x' : 'z', s: rand(), off: (rand() - 0.5) * 10, y: 0.3 + rand() * 0.9, w: 10 + rand() * 8, d: 7 + rand() * 5, sp: 0.5 + rand() * 0.6,
  }));
  const groundMist = mistLayer(town, [{ minX: G.x - 46, maxX: G.x + 46, minZ: G.z - 46, maxZ: G.z + 40 }], rand, { color: 0x9a8cc0, opacity: 0.12, count: 9, y: [0.1, 0.5], size: [18, 28] });
  // 3) 飛緊嘅烏鴉：喺鎮上面兜圈（間中滑翔）
  const CROW_MAX = 6;
  const crowM = M(0x121016);
  const cBody = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.28, 0.6), crowM, CROW_MAX);
  const cHead = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.24, 0.24).translate(0, 0.1, 0.38), crowM, CROW_MAX);
  const wingG = (s) => new THREE.BoxGeometry(1.0, 0.04, 0.42).translate(s * 0.5, 0, 0);
  const cWl = new THREE.InstancedMesh(wingG(-1), crowM, CROW_MAX);
  const cWr = new THREE.InstancedMesh(wingG(1), crowM, CROW_MAX);
  for (const m of [cBody, cHead, cWl, cWr]) {
    m.frustumCulled = false;
    town.add(m);
  }
  const crows = Array.from({ length: CROW_MAX }, () => ({ r: 14 + rand() * 22, y: 15 + rand() * 10, sp: (0.18 + rand() * 0.15) * (rand() < 0.5 ? -1 : 1), p: rand() * 6 }));
  const o = new THREE.Object3D();
  const w = new THREE.Object3D();

  // 閃燈：大部分時間著，間中「啪啪」閃兩下，間中熄幾秒
  const flickerAt = (t, p) => {
    if ((t * 0.17 + p) % 1 < 0.07) return 0.05;
    const n = Math.sin(t * 31 + p) * Math.sin(t * 13.7 + p * 3) + Math.sin(t * 4.3 + p) * 0.6;
    return n < -0.75 ? 0.12 : 1;
  };
  const lit = windowMats().lit;

  return {
    update(dt, t, camPos, quality = 3) {
      const on = inGhostWorld(camPos.x, camPos.z);
      town.visible = on;
      if (!on) return;
      for (const f of mats.flick) {
        const v = flickerAt(t, f.p);
        f.lamp.emissiveIntensity = 0.25 + 2.2 * v;
        f.pool.opacity = 0.26 * v;
        f.halo.opacity = 0.35 * v;
      }
      lit.emissiveIntensity = 0.7 + Math.sin(t * 0.9) * 0.3; // 窗入面淡綠光慢慢一光一暗
      for (const s of swings) s.pivot.rotation.x = Math.sin(t * 1.25 + s.p) * 0.14 + Math.sin(t * 0.37 + s.p) * 0.06;
      // 風滾草
      const nTw = [2, 4, 6, 8][quality] ?? 8;
      tw.count = nTw;
      for (let i = 0; i < nTw; i++) {
        const k = tws[i];
        const len = k.lane === 'z' ? mainLen + 8 : crossLen;
        const gust = 0.55 + 0.7 * Math.sin(t * 0.45 + k.p) ** 2;
        k.s += (dt * k.sp * gust) / len;
        if (k.s > 1) {
          k.s -= 1;
          k.off = (rand() - 0.5) * 9;
        }
        const d = k.s * len;
        const fade = Math.min(1, k.s * 12, (1 - k.s) * 12);
        const hop = Math.abs(Math.sin(d * 0.9 + k.p)) * 0.55;
        const size = k.size * fade;
        if (k.lane === 'z') {
          o.position.set(G.x + k.off * 0.9, 0.45 * size + hop, G.z + S.minZ - 4 + d);
          o.rotation.set(d / 0.45, k.p, 0);
        } else {
          o.position.set(G.x + Cx.minX + d, 0.45 * size + hop, G.z + k.off * 0.6);
          o.rotation.set(0, k.p, -d / 0.45);
        }
        o.scale.setScalar(Math.max(0.001, size));
        o.updateMatrix();
        tw.setMatrixAt(i, o.matrix);
      }
      tw.instanceMatrix.needsUpdate = true;
      // 霧
      const nFog = [0, 8, 14, 18][quality] ?? 18;
      fog.count = nFog;
      groundMist.mesh.visible = quality > 0;
      groundMist.update(t);
      for (let i = 0; i < nFog; i++) {
        const k = fogs[i];
        const len = k.lane === 'z' ? mainLen + 10 : crossLen;
        k.s = (k.s + (dt * k.sp) / len) % 1;
        const d = k.s * len;
        const fade = Math.min(1, k.s * 6, (1 - k.s) * 6);
        if (k.lane === 'z') o.position.set(G.x + k.off * 0.6, k.y, G.z + S.minZ - 5 + d);
        else o.position.set(G.x + Cx.minX + d, k.y, G.z + k.off * 0.5);
        o.rotation.set(0, Math.sin(t * 0.05 + i) * 0.4, 0);
        o.scale.set(k.w * fade + 0.001, 1, k.d * fade + 0.001);
        o.updateMatrix();
        fog.setMatrixAt(i, o.matrix);
      }
      fog.instanceMatrix.needsUpdate = true;
      // 烏鴉
      const nCrow = [2, 3, 5, 6][quality] ?? 6;
      for (const m of [cBody, cHead, cWl, cWr]) m.count = nCrow;
      for (let i = 0; i < nCrow; i++) {
        const c = crows[i];
        const a = t * c.sp + c.p;
        o.position.set(G.x + Math.cos(a) * c.r, c.y + Math.sin(t * 0.7 + c.p) * 1.5, G.z + Math.sin(a) * c.r);
        o.rotation.set(0, -a + (c.sp > 0 ? Math.PI : 0), Math.sign(c.sp) * 0.25);
        o.scale.setScalar(1);
        o.updateMatrix();
        cBody.setMatrixAt(i, o.matrix);
        cHead.setMatrixAt(i, o.matrix);
        const glide = Math.sin(t * 0.6 + c.p) > 0.3; // 滑翔：翼打開唔郁
        const flap = glide ? 0.12 : Math.sin(t * 9 + c.p) * 0.75;
        for (const [m, s] of [[cWl, -1], [cWr, 1]]) {
          w.position.set(s * 0.15, 0.06, 0);
          w.rotation.set(0, 0, s * flap);
          w.scale.setScalar(1);
          w.updateMatrix();
          w.matrix.premultiply(o.matrix);
          m.setMatrixAt(i, w.matrix);
        }
      }
      for (const m of [cBody, cHead, cWl, cWr]) m.instanceMatrix.needsUpdate = true;
    },
  };
}
