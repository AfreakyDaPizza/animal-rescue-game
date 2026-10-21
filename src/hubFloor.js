// Hub 地板重做（小朋友 Issue #8：「the floors in the hub is very ugly」）
// 以前：草地、路、區域地磚全部係一隻平色 → 好似塑膠。
// 而家：全部用 canvas 即場畫像素紋理（同 biomeArt.js 一樣嘅方塊風），而且：
//   - 草地：細草紋理 + 大範圍深淺（頂點顏色），近牆邊暗少少（好似有影）
//   - 路：暖色石磚（錯縫砌），兩邊有深色石邊
//   - 中間廣場（傳送門）：圓形放射石板 + 彩色馬賽克圈 + 深色外框
//   - 每個區域：自己一款地磚（健身房膠地、商店格仔、繁殖室菱形…），四邊有凸起石框
// 紋理用「世界座標」做 UV（每 unit 米重複一次）→ 大細唔同都唔會拉長；
// 兩條路重疊嘅地方用同一份物料 + 同一個 UV，所以唔會閃（z-fighting）。
// 高度（由低到高，每層隔 2cm 避免閃）：草 0 → 路邊 0.02 → 路 0.04 → 區域石框 0.06 → 區域地磚／廣場 0.08

import * as THREE from 'three';

// ---------- 細工具 ----------
function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; // 像素風：近睇唔會矇
  t.anisotropy = 8; // 斜斜望遠處地面唔會變一嚿糊
  return t;
}
function shade(c, l) {
  const col = new THREE.Color(c);
  col.offsetHSL(0, 0, l);
  return '#' + col.getHexString();
}
// 固定 seed 嘅隨機數（每次開遊戲地板都一樣）
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 喺可以無縫重複嘅 canvas 畫長方形（出界嘅部分喺對面再畫一次）
function wrapRect(ctx, s, x, y, w, h) {
  for (const dx of [0, -s]) for (const dy of [0, -s]) ctx.fillRect(x + dx, y + dy, w, h);
}

const mats = new Map();
function mat(key, make) {
  if (!mats.has(key)) mats.set(key, make());
  return mats.get(key);
}
const stdMat = (map, extra = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.92, ...extra });
// 自己發少少光嘅地磚（光同紋理一樣顏色：淺色／水晶嗰啲磚最光）
const glowMat = (map, k) => stdMat(map, { emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, roughness: 0.6 });

// 平放嘅方塊（頂面 y = top，厚 h），UV 用世界座標（unit 米一格紋理）
function slab(root, material, cx, cz, w, d, top, h, rotY = 0, unit = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateY(rotY);
  g.translate(cx, top - h / 2, cz);
  worldUV(g, unit);
  const m = new THREE.Mesh(g, material);
  m.receiveShadow = true;
  root.add(m);
  return m;
}
function worldUV(g, unit) {
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / unit, -p.getZ(i) / unit);
  uv.needsUpdate = true;
}

// =====================================================================
// 紋理
// =====================================================================

// 草：4 米一格，2px 一粒；深淺草葉 + 少少三葉草同細花
function grassTexture() {
  return canvasTex(256, (ctx, s) => {
    const rand = seeded(11);
    for (let y = 0; y < s; y += 2)
      for (let x = 0; x < s; x += 2) {
        ctx.fillStyle = shade(0x67a84a, (rand() - 0.5) * 0.06);
        ctx.fillRect(x, y, 2, 2);
      }
    // 一笪笪淺色／深色（細範圍變化）
    for (let n = 0; n < 26; n++) {
      ctx.fillStyle = n % 2 ? 'rgba(130,190,80,0.22)' : 'rgba(40,95,35,0.16)';
      const cx = rand() * s, cy = rand() * s, r = 10 + rand() * 22;
      for (let k = 0; k < 14; k++) wrapRect(ctx, s, Math.floor((cx + (rand() - 0.5) * r * 2) / 2) * 2, Math.floor((cy + (rand() - 0.5) * r * 2) / 2) * 2, 6, 4);
    }
    // 草葉（短直線，上淺下深）
    for (let n = 0; n < 900; n++) {
      const x = Math.floor(rand() * 128) * 2, y = Math.floor(rand() * 128) * 2;
      const tall = 2 + Math.floor(rand() * 3) * 2;
      ctx.fillStyle = rand() < 0.5 ? '#4f8f37' : '#3f7a2c';
      wrapRect(ctx, s, x, y, 2, tall);
      ctx.fillStyle = rand() < 0.6 ? '#8cc966' : '#7dbb58';
      wrapRect(ctx, s, x, y - 2, 2, 2);
    }
    // 三葉草（細細嚿深綠）
    for (let n = 0; n < 7; n++) {
      const x = Math.floor(rand() * 128) * 2, y = Math.floor(rand() * 128) * 2;
      ctx.fillStyle = '#3d7d2e';
      wrapRect(ctx, s, x, y, 4, 2);
      wrapRect(ctx, s, x + 2, y - 2, 2, 6);
    }
    // 細花（白／黃，好疏）
    for (let n = 0; n < 10; n++) {
      ctx.fillStyle = ['#ffffff', '#fff176', '#ffffff', '#f8bbd0'][n % 4];
      wrapRect(ctx, s, Math.floor(rand() * 128) * 2, Math.floor(rand() * 128) * 2, 2, 2);
    }
  });
}

// 路：暖色石磚（50cm × 25cm 錯縫），每塊深淺唔同 + 立體邊；2 米一格
function paverTexture() {
  return canvasTex(256, (ctx, s) => {
    const rand = seeded(23);
    ctx.fillStyle = '#9c8a6c'; // 磚縫
    ctx.fillRect(0, 0, s, s);
    const tones = [0xdcc9a4, 0xd4bf98, 0xe4d4b3, 0xcdb68d, 0xd9c49c, 0xc4ab82];
    const bw = 64, bh = 32;
    for (let row = 0; row < s / bh; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col < s / bw; col++) {
        const x = col * bw + off, y = row * bh;
        const base = tones[Math.floor(rand() * tones.length)];
        // 磚身（噪點）
        for (let py = 3; py < bh - 1; py += 2)
          for (let px = 3; px < bw - 1; px += 2) {
            ctx.fillStyle = shade(base, (rand() - 0.5) * 0.05);
            wrapRect(ctx, s, x + px, y + py, 2, 2);
          }
        // 立體邊：左上淺、右下深
        ctx.fillStyle = shade(base, 0.07);
        wrapRect(ctx, s, x + 3, y + 3, bw - 4, 2);
        wrapRect(ctx, s, x + 3, y + 3, 2, bh - 4);
        ctx.fillStyle = shade(base, -0.1);
        wrapRect(ctx, s, x + 3, y + bh - 3, bw - 4, 2);
        wrapRect(ctx, s, x + bw - 3, y + 3, 2, bh - 4);
        // 少少裂紋／污漬
        if (rand() < 0.25) {
          ctx.fillStyle = shade(base, -0.13);
          for (let k = 0; k < 5; k++) wrapRect(ctx, s, x + 12 + k * 4 + Math.floor(rand() * 3) * 2, y + 10 + Math.floor(rand() * 5) * 2, 2, 2);
        }
      }
    }
  });
}

// 路邊／石框：深色細方石（每粒 25cm），1 米一格
function settTexture(base = 0x8a7d68, grout = '#5f5444', seed = 31) {
  return canvasTex(128, (ctx, s) => {
    const rand = seeded(seed);
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, s, s);
    const n = 4, c = s / n;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const b = shade(base, (rand() - 0.5) * 0.1);
        for (let py = 2; py < c - 2; py += 2)
          for (let px = 2; px < c - 2; px += 2) {
            ctx.fillStyle = shade(b, (rand() - 0.5) * 0.05);
            ctx.fillRect(i * c + px, j * c + py, 2, 2);
          }
        ctx.fillStyle = shade(b, 0.08);
        ctx.fillRect(i * c + 2, j * c + 2, c - 4, 2);
        ctx.fillStyle = shade(b, -0.08);
        ctx.fillRect(i * c + 2, j * c + c - 4, c - 4, 2);
      }
  });
}

// 方格地磚（兩隻色交替，有磚縫同立體邊）；n×n 格一張紋理
// opts.diamond：菱形（45 度格仔）；opts.fleck：膠地彩色碎粒
function tileTexture({ a, b, grout, n = 2, diamond = false, fleck = null, seed = 41 }) {
  return canvasTex(256, (ctx, s) => {
    const rand = seeded(seed);
    const c = s / n;
    const paint = (x, y, base) => {
      for (let py = 0; py < c; py += 4)
        for (let px = 0; px < c; px += 4) {
          ctx.fillStyle = shade(base, (rand() - 0.5) * 0.035);
          ctx.fillRect(x + px, y + py, 4, 4);
        }
    };
    if (!diamond) {
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) paint(i * c, j * c, (i + j) % 2 ? b : a);
    } else {
      // 菱形：底色 a，每格中間畫一個 b 色菱形（四角啱啱掂到格邊）
      paint(0, 0, a);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) paint(i * c, j * c, a);
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const cx = i * c + c / 2, cy = j * c + c / 2;
          for (let py = 0; py < c; py += 4)
            for (let px = 0; px < c; px += 4) {
              const dx = Math.abs(px + 2 - c / 2), dy = Math.abs(py + 2 - c / 2);
              if (dx + dy < c / 2 - 6) {
                ctx.fillStyle = shade(b, (rand() - 0.5) * 0.035);
                ctx.fillRect(cx - c / 2 + px, cy - c / 2 + py, 4, 4);
              }
            }
        }
    }
    if (fleck)
      for (let k = 0; k < 260; k++) {
        ctx.fillStyle = fleck[k % fleck.length];
        ctx.fillRect(Math.floor(rand() * 128) * 2, Math.floor(rand() * 128) * 2, 2, 2);
      }
    // 磚縫 + 立體邊
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const x = i * c, y = j * c;
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x + 2, y + 2, c - 4, 2);
        ctx.fillRect(x + 2, y + 2, 2, c - 4);
        ctx.fillStyle = 'rgba(0,0,0,0.13)';
        ctx.fillRect(x + 2, y + c - 4, c - 4, 2);
        ctx.fillRect(x + c - 4, y + 2, 2, c - 4);
        ctx.fillStyle = grout;
        ctx.fillRect(x, y, c, 2);
        ctx.fillRect(x, y, 2, c);
      }
  });
}

// 鋼板（Fuse Machine）：防滑凸紋
function steelTexture() {
  return canvasTex(128, (ctx, s) => {
    const rand = seeded(53);
    for (let y = 0; y < s; y += 2)
      for (let x = 0; x < s; x += 2) {
        ctx.fillStyle = shade(0xa9b4ba, (rand() - 0.5) * 0.04);
        ctx.fillRect(x, y, 2, 2);
      }
    for (let j = 0; j < 8; j++)
      for (let i = 0; i < 8; i++) {
        const x = i * 16 + (j % 2) * 8, y = j * 16;
        const h = (i + j) % 2 === 0;
        ctx.fillStyle = '#d5dde1';
        wrapRect(ctx, s, x + 3, y + 6, h ? 8 : 2, h ? 2 : 8);
        ctx.fillStyle = '#7d878d';
        wrapRect(ctx, s, x + 3, y + 8, h ? 8 : 2, 2);
      }
  });
}

// 沙（遊樂場）
function sandTexture() {
  return canvasTex(128, (ctx, s) => {
    const rand = seeded(61);
    for (let y = 0; y < s; y += 2)
      for (let x = 0; x < s; x += 2) {
        ctx.fillStyle = shade(0xefd29a, (rand() - 0.5) * 0.08);
        ctx.fillRect(x, y, 2, 2);
      }
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = k % 3 ? '#d9b97a' : '#fff1cf';
      ctx.fillRect(Math.floor(rand() * 64) * 2, Math.floor(rand() * 64) * 2, 2, 2);
    }
  });
}

// 圓形放射石板（成個圓一張紋理）：rings = [{ r1, r2, tones, n（一圈幾多塊）}]，r 用 0–1（半徑比例）
function radialTexture(size, rings, grout, extra) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const rand = seeded(71);
  // 每塊石預先揀色
  const colors = rings.map((ring) => Array.from({ length: ring.n }, () => new THREE.Color(ring.tones[Math.floor(rand() * ring.tones.length)])));
  const g = new THREE.Color(grout);
  const px = size / 256; // 像素粒大細（1024 → 4px ≈ 7cm）
  const half = size / 2;
  const col = new THREE.Color();
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      // 用像素格嘅中心計（方塊風）
      const gx = (Math.floor(x / px) + 0.5) * px - half;
      const gy = (Math.floor(y / px) + 0.5) * px - half;
      const r = Math.hypot(gx, gy) / half;
      let a = Math.atan2(gy, gx) / (Math.PI * 2);
      if (a < 0) a += 1;
      const ri = rings.findIndex((q) => r >= q.r1 && r < q.r2);
      const o = (y * size + x) * 4;
      if (ri < 0) {
        img.data[o + 3] = 0;
        continue;
      }
      const ring = rings[ri];
      const k = (a * ring.n + (ring.offset || 0)) % ring.n;
      const idx = Math.floor(k);
      const fa = k - idx; // 喺塊石入面嘅位置（0–1）
      const fr = (r - ring.r1) / (ring.r2 - ring.r1);
      const arcLen = ((Math.PI * 2 * r * half) / ring.n) * (1 - fa); // 離右邊磚縫幾遠（像素）
      const arcLen0 = ((Math.PI * 2 * r * half) / ring.n) * fa;
      const radial = (ring.r2 - ring.r1) * half;
      const gw = px; // 磚縫一粒像素咁闊
      if (arcLen0 < gw || fr * radial < gw) col.copy(g);
      else {
        col.copy(colors[ri][idx]);
        if (arcLen < gw || (1 - fr) * radial < gw) col.offsetHSL(0, 0, -0.06);
        else if (arcLen0 < gw * 2 || fr * radial < gw * 2) col.offsetHSL(0, 0, 0.05);
        // 每粒像素少少噪點（固定）
        const h = Math.sin(Math.floor(x / px) * 12.9898 + Math.floor(y / px) * 78.233) * 43758.5453;
        col.offsetHSL(0, 0, (h - Math.floor(h) - 0.5) * 0.04);
      }
      img.data[o] = col.r * 255;
      img.data[o + 1] = col.g * 255;
      img.data[o + 2] = col.b * 255;
      img.data[o + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  extra?.(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.anisotropy = 8;
  return t;
}

// =====================================================================
// Hub 草地（world.js 用）：圓形，頂嗰截 z < 0 切走
// 用一個「極座標網格」（一圈圈 + 一條條），等每個點都可以有自己嘅顏色 → 大範圍深淺變化
// =====================================================================
export function buildHubGrass(scene, HUB) {
  const { cx, cz, r: R } = HUB;
  const SEG = 128; // 一圈幾多段
  const RINGS = 28; // 由中心到牆幾多圈
  const pos = [];
  const colors = [];
  const uvs = [];
  const index = [];
  // 大範圍變化：幾個 sin 疊埋（固定，唔會每次唔同）
  const macro = (x, z) =>
    0.5 * Math.sin(x * 0.11 + 1.3) * Math.sin(z * 0.13 + 0.4) + 0.3 * Math.sin(x * 0.27 - z * 0.21 + 2.1) + 0.2 * Math.sin(x * 0.53 + z * 0.47);
  const c = new THREE.Color();
  for (let j = 0; j <= RINGS; j++) {
    const rr = (R * Math.sqrt(j / RINGS)) * 1.0; // 外面密啲（牆邊要做影）
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const x = cx + Math.cos(a) * rr;
      const z = Math.max(0, cz + Math.sin(a) * rr); // 頂嗰截壓扁落 z = 0（同生態區通道接住）
      pos.push(x, 0, z);
      uvs.push(x / 4, -z / 4); // 4 米一格草紋理
      const m = macro(x, z);
      // 牆邊暗啲（好似有影）、中間廣場附近淺少少
      const edge = THREE.MathUtils.smoothstep(rr, R - 4, R);
      const l = 0.93 + m * 0.1 - edge * 0.16;
      c.setRGB(l, l, l);
      // 少少黃綠／藍綠變化
      c.r *= 1 + m * 0.05;
      c.b *= 1 - m * 0.04;
      colors.push(c.r, c.g, c.b);
    }
  }
  const row = SEG + 1;
  for (let j = 0; j < RINGS; j++)
    for (let i = 0; i < SEG; i++) {
      const a = j * row + i, b = a + 1, d = a + row, e = d + 1;
      index.push(a, b, d, b, e, d); // 逆時針（由上面望）→ 面向上
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  // 法線一定向上（壓扁咗嗰截可能計錯）
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  const floor = new THREE.Mesh(g, stdMat(grassTexture(), { vertexColors: true, roughness: 0.97 }));
  floor.receiveShadow = true;
  scene.add(floor);
  return floor;
}

// =====================================================================
// 路、廣場、區域地磚（hubPark.js 用；全部放 staticRoot 焊埋）
// =====================================================================
const paver = () => mat('paver', () => stdMat(paverTexture()));
const curb = () => mat('curb', () => stdMat(settTexture()));

// 一條直路：中間石磚 + 兩邊深色石邊（石邊喺下面一層，所以路口交叉唔會有石邊橫過條路）
export function pathStrip(root, x1, z1, x2, z2, width) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const rot = Math.atan2(x2 - x1, z2 - z1);
  const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
  slab(root, curb(), mx, mz, width + 0.7, len + 0.7, 0.02, 0.02, rot, 1);
  slab(root, paver(), mx, mz, width, len, 0.04, 0.04, rot, 2);
}

const FLAG = [0xe6d8b8, 0xddcca8, 0xeadfc4, 0xd8c6a2, 0xe1d1ae]; // 廣場石板（同條路一樣暖色，但淺啲、平均啲）
// 中間廣場（傳送門周圍）：圓形放射石板 + 彩色馬賽克圈 + 深色外框
export function centralPlaza(root, x, z, r) {
  const tex = radialTexture(1024, [
    { r1: 0, r2: 0.5, tones: [0x6d6458, 0x756b5e], n: 12 }, // 傳送門石台下面（睇唔到）
    { r1: 0.5, r2: 0.6, tones: [0xffcc80, 0x80cbc4, 0xf8bbd0, 0xb39ddb, 0xa5d6a7, 0xfff59d], n: 48 }, // 彩色馬賽克圈
    { r1: 0.6, r2: 0.635, tones: [0x7c6f5c], n: 64 },
    { r1: 0.635, r2: 0.745, tones: FLAG, n: 40, offset: 0.5 },
    { r1: 0.745, r2: 0.855, tones: FLAG, n: 46 },
    { r1: 0.855, r2: 0.955, tones: FLAG, n: 52, offset: 0.5 },
    { r1: 0.955, r2: 1.0, tones: [0x8a7d68, 0x7f735f, 0x948670], n: 96 }, // 外框
  ], '#a8977a', (ctx, s) => {
    // 四個方向（十字路口）嵌一粒金色星
    for (let q = 0; q < 4; q++) {
      const a = (q * Math.PI) / 2;
      const px = s / 2 + Math.cos(a) * s * 0.4; // 半徑 80% 位（石板圈入面，正對四條路）
      const py = s / 2 + Math.sin(a) * s * 0.4;
      star(ctx, px, py, s * 0.028, '#ffca28', '#c79100');
    }
  });
  const m = mat('plaza', () => stdMat(tex, { transparent: false }));
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 96), m);
  disc.position.set(x, 0.06, z);
  disc.receiveShadow = true;
  root.add(disc);
}
function star(ctx, x, y, r, fill, line) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.15);
  ctx.strokeStyle = line;
  ctx.stroke();
}

// 每個區域嘅地磚款式
export const PAD_STYLES = {
  training: { a: 0xffb74d, b: 0xffa040, grout: '#c46f1c', n: 2, fleck: ['#ffe0b2', '#e65100', '#fff3e0'], unit: 2, frame: 0x8d6e63 }, // 膠地（健身房）
  entrance: { a: 0xeeeae2, b: 0xd9d4cb, grout: '#a9a39a', n: 4, unit: 4, frame: 0x8a7d68 }, // 淺色雲石
  shop: { a: 0xffffff, b: 0x81d4fa, grout: '#5c9fc4', n: 4, unit: 2, frame: 0x546e7a }, // 藍白格仔
  breeding: { a: 0xfdecf2, b: 0xf8bbd0, grout: '#e091ae', n: 2, diamond: true, unit: 3, frame: 0xad1457 }, // 粉紅菱形
};

// 長方形區域：凸起石框 + 地磚
export function tilePad(root, x, z, w, d, style) {
  const st = PAD_STYLES[style];
  const frame = mat('frame' + st.frame, () => stdMat(settTexture(st.frame, shade(st.frame, -0.15), st.frame & 0xff)));
  slab(root, frame, x, z, w + 0.7, d + 0.7, 0.06, 0.06, 0, 1);
  const tiles = mat('pad' + style, () => stdMat(tileTexture({ ...st, seed: st.a & 0xff }), { roughness: style === 'shop' ? 0.6 : 0.9 }));
  slab(root, tiles, x, z, w, d, 0.08, 0.02, 0, st.unit);
}

// 圓形區域（Magic Library 紫色星星地、Fuse Machine 鋼板、遊樂場沙）
export function roundPad(root, x, z, r, style) {
  let m;
  if (style === 'library')
    m = mat('library', () =>
      stdMat(
        radialTexture(512, [
          { r1: 0, r2: 0.3, tones: [0x9575cd, 0x8c6bc8], n: 8 },
          { r1: 0.3, r2: 0.55, tones: [0xd1c4e9, 0xc5b3e6, 0xb39ddb], n: 16, offset: 0.5 },
          { r1: 0.55, r2: 0.8, tones: [0xd1c4e9, 0xc5b3e6, 0xdcd0ef], n: 28 },
          { r1: 0.8, r2: 0.9, tones: [0xffd54f, 0x7e57c2], n: 36 },
          { r1: 0.9, r2: 1, tones: [0x5e35b1, 0x673ab7], n: 48 },
        ], '#6a4f9e', (ctx, s) => {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            star(ctx, s / 2 + Math.cos(a) * s * 0.21, s / 2 + Math.sin(a) * s * 0.21, s * 0.035, '#fff59d', '#fbc02d');
          }
          star(ctx, s / 2, s / 2, s * 0.08, '#ffe082', '#f9a825');
        }),
      ),
    );
  else if (style === 'steel') m = mat('steel', () => stdMat(steelTexture(), { metalness: 0.35, roughness: 0.55 }));
  else if (style === 'meteor')
    // ☄️ Meteoric Shop（Issue #10）：深藍星空石 + 一圈發光藍水晶磚 + 白色星星
    m = mat('meteor', () =>
      glowMat(
        radialTexture(512, [
          { r1: 0, r2: 0.28, tones: [0x1a237e, 0x283593], n: 6 },
          { r1: 0.28, r2: 0.36, tones: [0x4fc3f7, 0x29b6f6, 0x81d4fa], n: 24 },
          { r1: 0.36, r2: 0.62, tones: [0x1e2a5a, 0x22306a, 0x1b2550], n: 20, offset: 0.5 },
          { r1: 0.62, r2: 0.82, tones: [0x283593, 0x303f9f, 0x26328a], n: 30 },
          { r1: 0.82, r2: 0.9, tones: [0x00e5ff, 0x40c4ff, 0x18ffff], n: 40 },
          { r1: 0.9, r2: 1, tones: [0x121a40, 0x162050], n: 48 },
        ], '#0b1030', (ctx, s) => {
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + 0.3;
            star(ctx, s / 2 + Math.cos(a) * s * 0.245, s / 2 + Math.sin(a) * s * 0.245, s * 0.03, '#e1f5fe', '#4fc3f7');
          }
          star(ctx, s / 2, s / 2, s * 0.07, '#b3e5fc', '#0288d1');
        }),
        0.35,
      ),
    );
  else if (style === 'fuse')
    // 🧪 Fuse Machine（Issue #10 醒目啲）：中間鋼板、一圈發光綠色、外面黃黑警告間條
    m = mat('fuse', () =>
      glowMat(
        radialTexture(512, [
          { r1: 0, r2: 0.62, tones: [0x78909c, 0x6f8591, 0x83969f], n: 10 },
          { r1: 0.62, r2: 0.7, tones: [0x76ff03, 0x64dd17], n: 32 },
          { r1: 0.7, r2: 0.86, tones: [0x37474f, 0x3e5059], n: 24, offset: 0.5 },
          { r1: 0.86, r2: 1, tones: [0xffd600, 0x212121], n: 40 },
        ], '#263238'),
        0.2,
      ),
    );
  else m = mat('sand', () => stdMat(sandTexture(), { roughness: 1 }));
  // 石框（下一層，闊少少）
  const frameColor = style === 'library' ? 0x4527a0 : style === 'steel' || style === 'fuse' ? 0x546e7a : style === 'meteor' ? 0x1a237e : 0xbcaaa4;
  const frame = mat('rframe' + frameColor, () => stdMat(settTexture(frameColor, shade(frameColor, -0.15), 77)));
  const fg = new THREE.CylinderGeometry(r + 0.35, r + 0.35, 0.06, 64);
  fg.translate(x, 0.03, z);
  worldUV(fg, 1);
  const f = new THREE.Mesh(fg, frame);
  f.receiveShadow = true;
  root.add(f);
  const pg = new THREE.CylinderGeometry(r, r, 0.02, 64);
  pg.translate(x, 0.07, z);
  if (!['library', 'meteor', 'fuse'].includes(style)) worldUV(pg, style === 'steel' ? 2 : 3); // 放射紋理成個圓一張，唔使 worldUV
  const p = new THREE.Mesh(pg, m);
  p.receiveShadow = true;
  root.add(p);
}

// 🐾 地塊地面（hub.js 用）：灰白色細紋理，皮膚改 color 就會染色（草、沙、雪、糖果…都啱用）
export function plotGroundTexture(w, d) {
  const t = canvasTex(128, (ctx, s) => {
    const rand = seeded(83);
    for (let y = 0; y < s; y += 2)
      for (let x = 0; x < s; x += 2) {
        const v = 228 + Math.floor((rand() - 0.5) * 22);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 2, 2);
      }
    // 一笪笪深淺 + 細點（草葉／沙粒）
    for (let n = 0; n < 14; n++) {
      ctx.fillStyle = n % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.07)';
      const cx = rand() * s, cy = rand() * s;
      for (let k = 0; k < 10; k++) wrapRect(ctx, s, Math.floor((cx + (rand() - 0.5) * 24) / 2) * 2, Math.floor((cy + (rand() - 0.5) * 24) / 2) * 2, 6, 4);
    }
    for (let n = 0; n < 260; n++) {
      ctx.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.45)';
      wrapRect(ctx, s, Math.floor(rand() * 64) * 2, Math.floor(rand() * 64) * 2, 2, 2 + Math.floor(rand() * 2) * 2);
    }
  });
  t.repeat.set(w / 3, d / 3);
  return t;
}
