// 🎃 Halloween 世界嘅美術（Issue #9：小朋友話「Halloween map is very ugly」→ 成個重做）
// 紋理全部用 canvas 即場畫（像素風，同成個遊戲嘅方塊風格夾，但對比柔和啲，唔好「花」）
// 呢個檔淨係「樣」：地形、路、燈、道具；位置／行得嘅範圍全部跟 halloweenShape.js（唔郁玩法）
//
// 效能：
// - 地形係一大塊 mesh（有 vertex 顏色），唔焊（bakeStatic 會刪咗 color）
// - 其他唔郁嘅嘢放 root，每一區自己 bakeStatic → 每區一舊，望唔到嗰區會被 frustum cull
// - 重複好多次嘅細嘢（草、石、鬼火、蠟燭火）用 InstancedMesh／Points，一個 draw call 搞掂

import * as THREE from 'three';
import {
  HW_X, RUINS, HW_BIOMES, EGG_GRAVEYARD, STATION, LAKE_WATER, LAKE_SHORE, TRACK_X,
} from './halloweenShape.js';

// ---------- 細工具 ----------
export function canvasTex(size, draw, { nearest = true, wrap = true } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (nearest) t.magFilter = THREE.NearestFilter; // 像素風：近睇唔會矇
  t.anisotropy = 4;
  return t;
}
const shade = (c, l, s = 0) => '#' + new THREE.Color(c).offsetHSL(0, s, l).getHexString();
// 固定嘅亂數（每次開都一樣）
export function seeded(n) {
  let h = n * 2654435761;
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
// 一格格噪點（像素風底色）
function pixelNoise(ctx, size, base, amount, px, rand) {
  for (let y = 0; y < size; y += px)
    for (let x = 0; x < size; x += px) {
      ctx.fillStyle = shade(base, (rand() - 0.5) * amount);
      ctx.fillRect(x, y, px, px);
    }
}
// 2D value noise（地形高低、顏色一笪笪）
function hash(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
export function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, z) => vnoise(x, z) * 0.5 + vnoise(x * 2.03 + 5.2, z * 2.03 + 1.3) * 0.3 + vnoise(x * 4.1 + 9.7, z * 4.1 + 3.1) * 0.2;

// 方塊嘅 UV 跟實際尺寸（每 unit 米重複一次紋理）
const tiledGeos = new Map();
export function tiledBox(w, h, d, unit = 2) {
  const key = `${w}|${h}|${d}|${unit}`;
  if (tiledGeos.has(key)) return tiledGeos.get(key);
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++)
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / unit, (uv.getY(i) * dims[f][1]) / unit);
    }
  tiledGeos.set(key, g);
  return g;
}

// ---------- 材質（共用，焊嘅時候同一份材質會變一個 draw call）----------
const mats = new Map();
export function M(color, extra = {}) {
  const key = 'm' + color + Object.entries(extra).map(([k, v]) => `${k}:${v && v.isTexture ? v.uuid : v}`).join(',');
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra }));
  return mats.get(key);
}
export const GLOW = (color, k = 2) => M(color, { emissive: color, emissiveIntensity: k, roughness: 0.5 });
const geos = new Map();
export const geo = (key, make) => {
  if (!geos.has(key)) geos.set(key, make());
  return geos.get(key);
};
export const box = (w, h, d) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
export const ball = (r, w = 10, h = 7) => geo(`s${r}|${w}|${h}`, () => new THREE.SphereGeometry(r, w, h));
export const cyl = (rt, rb, h, n = 8) => geo(`c${rt}|${rb}|${h}|${n}`, () => new THREE.CylinderGeometry(rt, rb, h, n));
export const cone = (r, h, n = 6) => geo(`k${r}|${h}|${n}`, () => new THREE.ConeGeometry(r, h, n));
export function add(parent, g, m, x = 0, y = 0, z = 0, shadow = true) {
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export function grp(parent, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}

// =====================================================================
// 紋理
// =====================================================================
// 地面細紋（灰白色，乘 vertex 顏色）：草葉、細石、泥點；對比好細，唔會花
const groundDetail = (() => {
  let t = null;
  return () => {
    if (t) return t;
    t = canvasTex(128, (ctx, s) => {
      const rand = seeded(11);
      pixelNoise(ctx, s, 0xe6e6e6, 0.07, 2, rand);
      for (let n = 0; n < 18; n++) {
        ctx.fillStyle = n % 2 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.07)';
        const cx = rand() * s, cy = rand() * s;
        for (let k = 0; k < 12; k++) ctx.fillRect(Math.floor((cx + (rand() - 0.5) * 26) / 2) * 2, Math.floor((cy + (rand() - 0.5) * 26) / 2) * 2, 6, 4);
      }
      for (let n = 0; n < 420; n++) { // 草葉（一條條短直線）
        ctx.fillStyle = rand() < 0.55 ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.22)';
        ctx.fillRect(Math.floor(rand() * 64) * 2, Math.floor(rand() * 64) * 2, 2, 2 + Math.floor(rand() * 3) * 2);
      }
    });
    return t;
  };
})();

// 石仔路：一粒粒唔規則嘅石，有光邊同陰影邊、石縫、青苔
const PATH_PALETTES = {
  warm: { grout: '#2c2630', stones: [0x8a8090, 0x7d7484, 0x958b8a, 0x847a76], moss: 'rgba(110,140,70,0.55)' },
  moss: { grout: '#14241f', stones: [0x5d7468, 0x50685c, 0x667a6c, 0x4c5f57], moss: 'rgba(120,255,200,0.35)' },
  slate: { grout: '#1c1724', stones: [0x6a6078, 0x5e5470, 0x73688a, 0x655a74], moss: 'rgba(150,120,190,0.35)' },
  sand: { grout: '#3a2e26', stones: [0x9b8a74, 0x8f7e6a, 0xa59480, 0x887764], moss: 'rgba(100,130,70,0.45)' },
};
const pathTexCache = new Map();
export function pathTex(kind) {
  if (pathTexCache.has(kind)) return pathTexCache.get(kind);
  const P = PATH_PALETTES[kind];
  const t = canvasTex(128, (ctx, s) => {
    const rand = seeded(kind.length * 31 + 7);
    ctx.fillStyle = P.grout;
    ctx.fillRect(0, 0, s, s);
    const rows = 5;
    const rh = s / rows;
    for (let r = 0; r < rows; r++) {
      let x = r % 2 ? -10 : 0;
      while (x < s) {
        const w = 18 + Math.floor(rand() * 14);
        const base = P.stones[Math.floor(rand() * P.stones.length)];
        const y0 = Math.round(r * rh + 2), h = Math.round(rh - 4);
        const x0 = Math.round(x + 2), ww = w - 4;
        for (let yy = 0; yy < h; yy += 2)
          for (let xx = 0; xx < ww; xx += 2) {
            // 圓角：角落唔畫
            const cx = Math.min(xx, ww - xx - 2), cy = Math.min(yy, h - yy - 2);
            if (cx + cy < 3) continue;
            let l = (rand() - 0.5) * 0.05;
            if (yy < 3 || xx < 3) l += 0.06; // 光邊
            if (yy > h - 5 || xx > ww - 5) l -= 0.07; // 陰影邊
            ctx.fillStyle = shade(base, l);
            for (const ox of [0, s, -s]) ctx.fillRect(x0 + xx + ox, y0 + yy, 2, 2);
          }
        // 少少青苔／裂紋
        if (rand() < 0.35) {
          ctx.fillStyle = P.moss;
          for (let k = 0; k < 6; k++) ctx.fillRect(x0 + Math.floor(rand() * ww / 2) * 2, y0 + h - 4 + Math.floor(rand() * 2) * 2, 4, 2);
        }
        x += w;
      }
    }
  });
  pathTexCache.set(kind, t);
  return t;
}
// 泥（路邊）
const dirtTex = (() => {
  let t = null;
  return () => {
    if (t) return t;
    t = canvasTex(64, (ctx, s) => {
      const rand = seeded(5);
      pixelNoise(ctx, s, 0x5a4636, 0.1, 2, rand);
      for (let n = 0; n < 50; n++) {
        ctx.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,230,200,0.12)';
        ctx.fillRect(Math.floor(rand() * 32) * 2, Math.floor(rand() * 32) * 2, 2, 2);
      }
    });
    return t;
  };
})();
// 木板（大屋外牆、月台、碼頭）：直條木 + 木紋 + 釘
const plankCache = new Map();
export function plankTex(base) {
  if (plankCache.has(base)) return plankCache.get(base);
  const t = canvasTex(64, (ctx, s) => {
    const rand = seeded(base & 0xffff);
    for (let i = 0; i < 4; i++) {
      const c = shade(base, (rand() - 0.5) * 0.08);
      ctx.fillStyle = c;
      ctx.fillRect(i * 16, 0, 16, s);
      for (let k = 0; k < 7; k++) { // 木紋
        ctx.fillStyle = shade(base, -0.05 - rand() * 0.04);
        ctx.fillRect(i * 16 + 2 + Math.floor(rand() * 6) * 2, Math.floor(rand() * 30) * 2, 2, 6 + Math.floor(rand() * 8) * 2);
      }
      ctx.fillStyle = shade(base, -0.16);
      ctx.fillRect(i * 16 + 14, 0, 2, s); // 板縫
      ctx.fillStyle = shade(base, 0.06);
      ctx.fillRect(i * 16, 0, 2, s); // 光邊
      ctx.fillStyle = shade(base, -0.2);
      ctx.fillRect(i * 16 + 6, 4, 2, 2); // 釘
      ctx.fillRect(i * 16 + 6, 36, 2, 2);
    }
  });
  plankCache.set(base, t);
  return t;
}
// 屋頂瓦（一行行錯開）
const shingleCache = new Map();
export function shingleTex(base) {
  if (shingleCache.has(base)) return shingleCache.get(base);
  const t = canvasTex(64, (ctx, s) => {
    const rand = seeded((base >> 4) & 0xffff);
    ctx.fillStyle = shade(base, -0.12);
    ctx.fillRect(0, 0, s, s);
    for (let r = 0; r < 8; r++)
      for (let i = -1; i < 5; i++) {
        const x = i * 16 + (r % 2) * 8;
        ctx.fillStyle = shade(base, (rand() - 0.5) * 0.1);
        ctx.fillRect(x + 1, r * 8, 14, 7);
        ctx.fillStyle = shade(base, -0.08);
        ctx.fillRect(x + 1, r * 8 + 5, 14, 2); // 瓦底陰影
      }
  });
  shingleCache.set(base, t);
  return t;
}
// 石磚（墓穴、石柱、大屋地基、閘柱）
const brickCache = new Map();
export function brickTex(base) {
  if (brickCache.has(base)) return brickCache.get(base);
  const t = canvasTex(64, (ctx, s) => {
    const rand = seeded((base >> 3) & 0xffff);
    ctx.fillStyle = shade(base, -0.17);
    ctx.fillRect(0, 0, s, s);
    for (let r = 0; r < 4; r++)
      for (let i = -1; i < 3; i++) {
        const x = i * 32 + (r % 2) * 16;
        const c = (rand() - 0.5) * 0.09;
        for (let yy = 0; yy < 14; yy += 2)
          for (let xx = 0; xx < 30; xx += 2) {
            let l = c + (rand() - 0.5) * 0.035;
            if (yy < 2) l += 0.05;
            if (yy > 10) l -= 0.04;
            ctx.fillStyle = shade(base, l);
            ctx.fillRect(x + 1 + xx, r * 16 + 1 + yy, 2, 2);
          }
        if (rand() < 0.3) { // 青苔
          ctx.fillStyle = 'rgba(95,130,70,0.55)';
          ctx.fillRect(x + 4 + Math.floor(rand() * 10) * 2, r * 16 + 11, 8, 4);
        }
      }
  });
  brickCache.set(base, t);
  return t;
}
// 墓碑石：平滑、少少斑點（唔係磚）
const stoneCache = new Map();
export function stoneTex(base) {
  if (stoneCache.has(base)) return stoneCache.get(base);
  const t = canvasTex(64, (ctx, s) => {
    const rand = seeded((base >> 5) & 0xffff);
    pixelNoise(ctx, s, base, 0.05, 2, rand);
    for (let n = 0; n < 40; n++) {
      ctx.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
      ctx.fillRect(Math.floor(rand() * 32) * 2, Math.floor(rand() * 32) * 2, 2, 2);
    }
  });
  stoneCache.set(base, t);
  return t;
}
// 圓形柔光（鬼火、燈光落地、光暈）
export const glowTex = (() => {
  let t = null;
  return () => {
    if (t) return t;
    t = canvasTex(64, (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.15)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }, { nearest: false, wrap: false });
    return t;
  };
})();
// 霧（一團團軟雲，四邊接得埋）
const mistTex = (() => {
  let t = null;
  return () => {
    if (t) return t;
    t = canvasTex(256, (ctx, s) => {
      const rand = seeded(77);
      // 一團軟雲（中間濃、四邊淡到冇）→ 塊板嘅邊唔會見到
      for (let n = 0; n < 30; n++) {
        const a = rand() * Math.PI * 2, d = rand() * s * 0.25;
        const x = s / 2 + Math.cos(a) * d, y = s / 2 + Math.sin(a) * d, r = s * (0.12 + rand() * 0.14);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.3)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }, { nearest: false, wrap: false });
    return t;
  };
})();

// =====================================================================
// 地形：一大塊，行得嘅地方平（y = 0），出面慢慢升做山（取代以前嘅方塊懸崖）
// =====================================================================
const [B1, B2, B3] = HW_BIOMES;
const FLATS = [
  { minX: B1.rect.minX, maxX: B1.rect.maxX, minZ: B3.rect.minZ, maxZ: B1.rect.maxZ },
  EGG_GRAVEYARD,
  STATION,
  LAKE_SHORE,
  LAKE_WATER,
  { minX: HW_X - 7, maxX: HW_X + 7, minZ: -28, maxZ: -18 },
  { minX: TRACK_X - 4, maxX: TRACK_X + 4, minZ: -420, maxZ: 220 }, // 路軌經過嘅山谷
];
function rectSdf(r, x, z) {
  const dx = Math.max(r.minX - x, x - r.maxX);
  const dz = Math.max(r.minZ - z, z - r.maxZ);
  const ox = Math.max(dx, 0), oz = Math.max(dz, 0);
  return Math.hypot(ox, oz) + Math.min(Math.max(dx, dz), 0);
}
// 離最近行得嘅地方幾遠（出面 = 正數）
export function flatSdf(x, z) {
  let d = Math.hypot(x - RUINS.x, z - RUINS.z) - RUINS.r;
  for (const r of FLATS) d = Math.min(d, rectSdf(r, x, z));
  return d;
}
export function terrainHeight(x, z) {
  const d = flatSdf(x, z);
  const w = rectSdf(LAKE_WATER, x, z);
  if (w < 0) return -1.5 * THREE.MathUtils.smoothstep(-w, 0, 6); // 湖底（岸邊斜落去）
  if (d <= 1.5) return 0;
  const big = THREE.MathUtils.smoothstep(d, 1.5, 18) * (5 + 15 * fbm(x * 0.035, z * 0.035));
  const bumps = THREE.MathUtils.smoothstep(d, 1.5, 7) * (fbm(x * 0.25, z * 0.25) - 0.3) * 1.6;
  return Math.max(0, big + bumps);
}
// 每區地面顏色
const ZONE_COLORS = [
  { rect: B1.rect, c: 0x5e5236, blend: 7 }, // 🎃 乾草泥地（暖啡帶少少橙）
  { rect: B2.rect, c: 0x2f5a4e, blend: 7 }, // 👻 深青苔
  { rect: B3.rect, c: 0x4a3f58, blend: 7 }, // 🏚️ 灰紫枯草
  { rect: EGG_GRAVEYARD, c: 0x4d6040, blend: 4 },
  { rect: STATION, c: 0x575062, blend: 4 },
  { rect: LAKE_SHORE, c: 0x3f5a42, blend: 4 },
  { rect: { minX: HW_X - 7, maxX: HW_X + 7, minZ: -28, maxZ: -18 }, c: 0x5c5a40, blend: 6 },
];
const _c = new THREE.Color();
const _c2 = new THREE.Color();
function groundColor(x, z, h) {
  const out = new THREE.Color(0, 0, 0);
  let wsum = 0;
  const ruinsD = Math.hypot(x - RUINS.x, z - RUINS.z) - RUINS.r;
  const wr = 1 - THREE.MathUtils.smoothstep(ruinsD, -3, 4);
  if (wr > 0) {
    out.add(_c.setHex(0x52623f).multiplyScalar(wr)); // ⭕ 出生點：青草
    wsum += wr;
  }
  for (const zc of ZONE_COLORS) {
    const d = rectSdf(zc.rect, x, z);
    const w = 1 - THREE.MathUtils.smoothstep(d, -zc.blend, zc.blend);
    if (w <= 0) continue;
    out.add(_c.setHex(zc.c).multiplyScalar(w));
    wsum += w;
  }
  const hill = _c2.setHex(0x2e2538).lerp(_c.setHex(0x4a4258), THREE.MathUtils.smoothstep(h, 3, 14)); // 山：深紫灰 → 高啲淺色石
  if (wsum < 1) out.add(hill.clone().multiplyScalar(1 - wsum)), (wsum = 1);
  out.multiplyScalar(1 / wsum);
  if (h > 0.4) out.lerp(hill, THREE.MathUtils.smoothstep(h, 0.4, 3));
  if (h < -0.05) out.lerp(_c.setHex(0x1d2a26), THREE.MathUtils.smoothstep(-h, 0.05, 0.6)); // 湖底泥
  const m = fbm(x * 0.06, z * 0.06);
  out.multiplyScalar(0.8 + m * 0.4); // 一笪笪深淺
  const m2 = vnoise(x * 0.21 + 3, z * 0.21 + 7);
  if (m2 > 0.72 && h >= 0 && h < 0.3) out.lerp(_c.setHex(0x6f6a3c), (m2 - 0.72) * 1.4); // 少少黃草
  return out;
}
export function buildTerrain(scene) {
  const minX = HW_X - 135, maxX = HW_X + 120, minZ = -420, maxZ = 200;
  const step = 3;
  const nx = Math.round((maxX - minX) / step), nz = Math.round((maxZ - minZ) / step);
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3);
  const col = new Float32Array((nx + 1) * (nz + 1) * 3);
  const uv = new Float32Array((nx + 1) * (nz + 1) * 2);
  let p = 0;
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++, p++) {
      const x = minX + i * step, z = minZ + j * step;
      const h = terrainHeight(x, z);
      pos.set([x, h, z], p * 3);
      const c = groundColor(x, z, h);
      col.set([c.r, c.g, c.b], p * 3);
      uv.set([x / 4, -z / 4], p * 2);
    }
  const index = [];
  const row = nx + 1;
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * row + i, b = a + 1, d = a + row, e = d + 1;
      index.push(a, d, b, b, d, e);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: groundDetail(), vertexColors: true, roughness: 0.96 }));
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// =====================================================================
// 彎彎曲曲嘅路：中間石仔、兩邊泥邊（Catmull-Rom 曲線）
// =====================================================================
const OFFSET = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
export const pathCurves = []; // 俾道具避開
function ribbon(curve, width, wobble, y, vScale) {
  const len = curve.getLength();
  const n = Math.max(2, Math.ceil(len / 0.8));
  const pos = [], uv = [], idx = [];
  const tan = new THREE.Vector3();
  let dist = 0;
  let prev = curve.getPointAt(0);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const pt = curve.getPointAt(t);
    dist += pt.distanceTo(prev);
    prev = pt;
    curve.getTangentAt(t, tan);
    const nx = -tan.z, nz = tan.x;
    const w = width / 2 + (fbm(pt.x * 0.4, pt.z * 0.4) - 0.5) * wobble;
    const k = Math.min(1, Math.min(t, 1 - t) * len / 2) * 0.25 + 0.75; // 兩頭收窄少少
    pos.push(pt.x + nx * w * k, y, pt.z + nz * w * k, pt.x - nx * w * k, y, pt.z - nz * w * k);
    uv.push(0, dist / vScale, (width / vScale) * 1, dist / vScale);
    if (i < n) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); // 面向上
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nrm = g.attributes.normal;
  for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
  return g;
}
const dirtMat = () => M(0xffffff, { map: dirtTex(), roughness: 1, ...OFFSET });
export function path(root, pts, { width = 4.2, kind = 'warm' } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  pathCurves.push({ pts: curve.getSpacedPoints(Math.ceil(curve.getLength() / 2)), r: width / 2 + 0.8 });
  add(root, ribbon(curve, width + 1.8, 1.4, 0.025, 2), dirtMat(), 0, 0, 0, false);
  const stone = M(0xffffff, { map: pathTex(kind), roughness: 0.92, ...OFFSET, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  add(root, ribbon(curve, width, 0.6, 0.045, 2.4), stone, 0, 0, 0, false);
  return curve;
}
// 呢個點近唔近條路（道具唔好擋路）
export function nearPath(x, z, extra = 0) {
  for (const c of pathCurves) for (const p of c.pts) if ((p.x - x) ** 2 + (p.z - z) ** 2 < (c.r + extra) ** 2) return true;
  return false;
}

// 一圈柔光（燈照落地）：加亮、唔寫深度；同一隻色共用一份材質 → 焊埋一個 draw call
export function lightPool(root, x, z, r, color, k = 0.55, y = 0.06) {
  const key = 'pool' + color + k;
  if (!mats.has(key)) mats.set(key, new THREE.MeshBasicMaterial({ color, map: glowTex(), transparent: true, opacity: k, blending: THREE.AdditiveBlending, depthWrite: false, ...OFFSET, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
  const g = geo('poolGeo', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2));
  const mesh = add(root, g, mats.get(key), x, y, z, false);
  mesh.scale.set(r, 1, r);
  mesh.receiveShadow = false;
  return mesh;
}
// 光暈（燈泡周圍一團，向住四方八面：用兩塊交叉）
export function halo(root, x, y, z, r, color, k = 0.5) {
  const key = 'halo' + color + k;
  if (!mats.has(key)) mats.set(key, new THREE.MeshBasicMaterial({ color, map: glowTex(), transparent: true, opacity: k, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  for (const ry of [0, Math.PI / 2]) {
    const m = add(root, geo('haloGeo', () => new THREE.PlaneGeometry(2, 2)), mats.get(key), x, y, z, false);
    m.rotation.y = ry;
    m.scale.setScalar(r);
    m.receiveShadow = false;
  }
}

// =====================================================================
// 重複好多嘅細嘢：InstancedMesh
// =====================================================================
export function instanced(scene, g, m, list, { shadow = false } = {}) {
  if (!list.length) return null;
  const im = new THREE.InstancedMesh(g, m, list.length);
  const o = new THREE.Object3D();
  list.forEach(([x, y, z, s, ry = 0, sy = s], i) => {
    o.position.set(x, y, z);
    o.rotation.set(0, ry, 0);
    o.scale.set(s, sy, s);
    o.updateMatrix();
    im.setMatrixAt(i, o.matrix);
  });
  im.castShadow = shadow;
  im.receiveShadow = true;
  im.computeBoundingSphere();
  scene.add(im);
  return im;
}
// 一棵草（3 塊交叉）
export const tuftGeo = () =>
  geo('tuft', () => {
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const p = new THREE.PlaneGeometry(0.7, 0.55);
      p.translate(0, 0.27, 0);
      p.rotateY((i / 3) * Math.PI);
      parts.push(p);
    }
    return mergeSimple(parts);
  });
function mergeSimple(list) {
  const pos = [], nrm = [], uv = [];
  for (const g of list) {
    const ng = g.index ? g.toNonIndexed() : g;
    pos.push(...ng.attributes.position.array);
    nrm.push(...ng.attributes.normal.array);
    uv.push(...ng.attributes.uv.array);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
const tuftTex = (() => {
  let t = null;
  return () => {
    if (t) return t;
    t = canvasTex(32, (ctx, s) => {
      const rand = seeded(9);
      for (let i = 0; i < 9; i++) {
        const x = 2 + Math.floor(rand() * 14) * 2;
        const h = 10 + Math.floor(rand() * 10) * 2;
        ctx.fillStyle = shade(0xd8d8d8, (rand() - 0.5) * 0.2);
        ctx.fillRect(x, s - h, 2, h);
        ctx.fillRect(x + (rand() < 0.5 ? -2 : 2), s - h - 2, 2, 4);
      }
    }, { wrap: false });
    return t;
  };
})();
export const tuftMat = (color) => M(color, { map: tuftTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });

// =====================================================================
// 道具
// =====================================================================
// 南瓜（8 條坑紋）；lantern = 發光鬼臉（笑口，唔恐怖）
export function pumpkin(root, x, z, s = 1, lantern = false, rot = 0, y = 0) {
  const g = grp(root, x, y, z, rot);
  const tones = [M(0xf07d16, { roughness: 0.55 }), M(0xd9650c, { roughness: 0.55 })];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    const seg = add(g, ball(0.55 * s, s > 1.5 ? 12 : s >= 1 ? 8 : 7, s > 1.5 ? 9 : s >= 1 ? 6 : 5), tones[i % 2], 0, 0.5 * s, 0, s > 1);
    seg.scale.set(1.05, 0.85, 0.55);
    seg.rotation.y = a;
  }
  add(g, cyl(0.06 * s, 0.11 * s, 0.34 * s, 6), M(0x4e6b1f), 0.03 * s, 0.98 * s, 0, false).rotation.z = 0.3;
  if (lantern) {
    const face = GLOW(0xffb636, 2.6);
    const fz = -0.53 * s;
    for (const sx of [-1, 1]) {
      const eye = add(g, cone(0.12 * s, 0.18 * s, 3), face, sx * 0.2 * s, 0.62 * s, fz, false);
      eye.rotation.x = -Math.PI / 2;
      eye.scale.z = 0.3;
    }
    add(g, box(0.12 * s, 0.1 * s, 0.05), face, 0, 0.5 * s, fz, false); // 鼻
    const mouth = add(g, box(0.5 * s, 0.13 * s, 0.05), face, 0, 0.32 * s, fz + 0.04 * s, false); // 笑口
    mouth.scale.y = 1;
    for (const sx of [-1, 1]) add(g, box(0.1 * s, 0.1 * s, 0.05), face, sx * 0.27 * s, 0.38 * s, fz + 0.02 * s, false);
  }
  return g;
}
// 南瓜藤（地上一條條綠藤 + 葉）
export function vine(root, x1, z1, x2, z2, rand) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const a = Math.atan2(x2 - x1, z2 - z1);
  const v = add(root, box(0.12, 0.1, len), M(0x3f5f22), (x1 + x2) / 2, 0.06, (z1 + z2) / 2, false);
  v.rotation.y = a;
  const leaf = M(0x4f7a2a);
  for (let t = 0.1; t < 1; t += 0.22) {
    const l = add(root, box(0.55, 0.06, 0.45), leaf, x1 + (x2 - x1) * t + (rand() - 0.5) * 0.5, 0.1, z1 + (z2 - z1) * t + (rand() - 0.5) * 0.5, false);
    l.rotation.set((rand() - 0.5) * 0.3, rand() * 3, 0);
  }
}
// 墓碑：4 款（圓頂、十字、尖塔、闊身），淺灰紫色（夜晚都睇得清）
const tombMats = () => [M(0xffffff, { map: stoneTex(0x8e8a9c) }), M(0xffffff, { map: stoneTex(0x7d798c) })];
export function tombstone(root, x, z, s, rand, rot) {
  const [m1, m2] = tombMats();
  const stone = rand() < 0.5 ? m1 : m2;
  const moss = M(0x5f7d3a);
  const g = grp(root, x, 0, z, rot);
  g.rotation.z = (rand() - 0.5) * 0.18; // 歪少少
  const k = rand();
  if (k < 0.3) { // 十字
    add(g, tiledBox(0.28 * s, 1.6 * s, 0.26 * s, 1), stone, 0, 0.8 * s, 0);
    add(g, tiledBox(0.95 * s, 0.26 * s, 0.26 * s, 1), stone, 0, 1.12 * s, 0);
  } else if (k < 0.45) { // 尖塔
    add(g, tiledBox(0.8 * s, 0.35 * s, 0.8 * s, 1), stone, 0, 0.17 * s, 0);
    add(g, tiledBox(0.5 * s, 1.8 * s, 0.5 * s, 1), stone, 0, 1.2 * s, 0);
    add(g, cone(0.42 * s, 0.7 * s, 4), stone, 0, 2.45 * s, 0).rotation.y = Math.PI / 4;
  } else { // 圓頂（最多）
    const w = k < 0.8 ? 1 : 1.5;
    add(g, tiledBox(w * s, 1.15 * s, 0.3 * s, 1), stone, 0, 0.57 * s, 0);
    const top = add(g, cyl(0.5 * w * s, 0.5 * w * s, 0.3 * s, 12), stone, 0, 1.15 * s, 0);
    top.rotation.x = Math.PI / 2;
    top.scale.z = 1;
    add(g, box(0.5 * s, 0.07 * s, 0.04), M(0x4a4652), 0, 0.92 * s, -0.16 * s, false); // 刻字
    add(g, box(0.36 * s, 0.07 * s, 0.04), M(0x4a4652), 0, 0.78 * s, -0.16 * s, false);
    if (rand() < 0.5) add(g, box(w * 0.7 * s, 0.1 * s, 0.34 * s), moss, (rand() - 0.5) * 0.2, 1.33 * s, 0, false); // 頂青苔
  }
  add(g, box(1.1 * s, 0.14, 1.5 * s), M(0x4a3a2c), 0, 0.05, -0.95 * s, false); // 泥堆
  return g;
}
// 鐵欄杆（有尖頂、每 4 米一條石柱）
export function ironFence(root, x1, z1, x2, z2, h = 1.9, posts = true) {
  const iron = M(0x221e2a, { metalness: 0.5, roughness: 0.45 });
  const stone = M(0x7d7889, { map: brickTex(0x7d7889) });
  const len = Math.hypot(x2 - x1, z2 - z1);
  const a = Math.atan2(x2 - x1, z2 - z1);
  const n = Math.max(2, Math.round(len / 0.45));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const x = x1 + (x2 - x1) * k, z = z1 + (z2 - z1) * k;
    add(root, box(0.07, h, 0.07), iron, x, h / 2, z, false);
    add(root, cone(0.08, 0.26, 4), iron, x, h + 0.1, z, false);
  }
  for (const y of [0.3, h - 0.25]) add(root, box(0.06, 0.08, len), iron, (x1 + x2) / 2, y, (z1 + z2) / 2, false).rotation.y = a;
  if (posts) {
    const np = Math.max(1, Math.round(len / 4));
    for (let i = 0; i <= np; i++) {
      const k = i / np;
      const x = x1 + (x2 - x1) * k, z = z1 + (z2 - z1) * k;
      add(root, tiledBox(0.5, h + 0.4, 0.5, 1), stone, x, (h + 0.4) / 2, z);
      add(root, box(0.62, 0.14, 0.62), M(0x5f5a6b), x, h + 0.47, z);
    }
  }
}
// 燈柱：黑鐵柱 + 掛住嘅燈籠（發光）+ 地上一圈光
export function lanternPost(root, x, z, color = 0xffa040, rand = Math.random, h = 3.4) {
  const iron = M(0x1f1b26, { metalness: 0.5, roughness: 0.45 });
  add(root, box(0.22, h, 0.22), iron, x, h / 2, z);
  add(root, box(0.5, 0.2, 0.5), iron, x, 0.1, z);
  const dir = rand() < 0.5 ? 1 : -1;
  add(root, box(0.9, 0.1, 0.1), iron, x + dir * 0.4, h - 0.1, z, false); // 橫枝
  const lx = x + dir * 0.75;
  add(root, box(0.42, 0.08, 0.42), iron, lx, h - 0.35, z, false);
  add(root, box(0.32, 0.45, 0.32), GLOW(color, 2.4), lx, h - 0.62, z, false); // 燈
  add(root, cone(0.3, 0.25, 4), iron, lx, h - 0.22, z, false).rotation.y = Math.PI / 4;
  add(root, box(0.42, 0.06, 0.42), iron, lx, h - 0.86, z, false);
  halo(root, lx, h - 0.62, z, 1.1, color, 0.35);
  lightPool(root, lx, z, 4.2, color, 0.24);
}
// 枯樹：分叉樹枝（2 層），粗身漸幼
export function deadTree(root, x, z, s, rand, bark = 0x3a2e2c) {
  const m = M(bark);
  const g = grp(root, x, 0, z, rand() * 6);
  const h = (5 + rand() * 3) * s;
  g.rotation.z = (rand() - 0.5) * 0.12;
  add(g, cyl(0.22 * s, 0.45 * s, h, 6), m, 0, h / 2, 0);
  for (const a of [0, 2.1, 4.2]) add(g, cone(0.35 * s, 0.9 * s, 4), m, Math.cos(a) * 0.35 * s, 0.25 * s, Math.sin(a) * 0.35 * s).rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); // 樹根
  const nb = 4 + Math.floor(rand() * 2);
  for (let i = 0; i < nb; i++) {
    const y = h * (0.5 + (i / nb) * 0.45);
    const a = (i / nb) * Math.PI * 2 + rand();
    const len = (1.6 + rand() * 1.6) * s;
    const tilt = 0.7 + rand() * 0.5;
    const b = grp(g, 0, y, 0, a);
    const br = add(b, cyl(0.06 * s, 0.14 * s, len, 5), m, 0, 0, 0);
    br.rotation.z = -tilt;
    br.position.set(Math.sin(tilt) * len / 2, Math.cos(tilt) * len / 2, 0);
    // 第二層細枝
    const tx = Math.sin(tilt) * len, ty = Math.cos(tilt) * len;
    const tw = add(b, cyl(0.03 * s, 0.06 * s, len * 0.55, 4), m, tx + 0.15 * s, ty + len * 0.2, 0);
    tw.rotation.z = -0.2;
    const tw2 = add(b, cyl(0.03 * s, 0.06 * s, len * 0.45, 4), m, tx * 0.7, ty * 0.7 + len * 0.18, 0.2 * s);
    tw2.rotation.set(0.5, 0, 0.3);
  }
  return { g, h };
}
// 墓穴（Mausoleum）：石屋 + 兩條柱 + 三角頂 + 門縫發光（綠）+ 門口兩盞燈
export function crypt(root, x, z, rot, glowColor = 0x7dffb0) {
  const g = grp(root, x, 0, z, rot);
  const stone = M(0x8d889a, { map: brickTex(0x8d889a) });
  const dark = M(0x5f596e, { map: brickTex(0x5f596e) });
  add(g, tiledBox(7, 0.6, 8, 2), dark, 0, 0.3, 0); // 地台
  add(g, tiledBox(6, 4.6, 6, 2), stone, 0, 2.9, 0.6); // 屋身
  for (let i = 0; i < 3; i++) add(g, tiledBox(4.4 - i * 0.6, 0.3, 0.7), dark, 0, 0.15 + i * 0.3, -3.4 - i * 0.35 + 0.7); // 樓梯
  for (const sx of [-1, 1]) {
    add(g, cyl(0.32, 0.36, 4.2, 10), M(0xb4afc0), sx * 2.2, 2.7, -2.7); // 柱
    add(g, box(0.9, 0.3, 0.9), dark, sx * 2.2, 4.9, -2.7);
    add(g, box(0.9, 0.3, 0.9), dark, sx * 2.2, 0.75, -2.7);
  }
  add(g, tiledBox(6.6, 0.5, 7.4, 2), dark, 0, 5.3, 0.1); // 簷
  // 三角頂（兩塊斜板）
  const roof = M(0x3a3048, { map: shingleTex(0x4a3e5c) });
  for (const s of [-1, 1]) {
    const r = add(g, tiledBox(3.9, 0.35, 7.6, 2), roof, s * 1.6, 6.35, 0.1);
    r.rotation.z = -s * 0.55;
  }
  const ped = add(g, cone(3.4, 1.9, 3), stone, 0, 6.3, -3.4); // 前面三角
  ped.rotation.set(0, Math.PI, 0);
  ped.scale.set(1, 1, 0.12);
  add(g, box(0.4, 1.2, 0.4), M(0xb4afc0), 0, 7.9, -3.2); // 頂十字
  add(g, box(1.1, 0.35, 0.4), M(0xb4afc0), 0, 8.1, -3.2);
  // 門（兩扇石門中間一條光縫）
  add(g, box(2.4, 3.2, 0.2), M(0x2a2532), 0, 2.2, -2.42);
  add(g, box(0.14, 3.0, 0.22), GLOW(glowColor, 2.4), 0, 2.2, -2.45, false);
  add(g, box(2.0, 0.12, 0.22), GLOW(glowColor, 1.6), 0, 0.66, -2.45, false);
  add(g, box(1.6, 0.4, 0.1), M(0xd8d2c4), 0, 4.2, -2.42, false); // 名牌
  halo(g, 0, 2.2, -2.8, 1.8, glowColor, 0.28);
  lightPool(g, 0, -4.5, 3.5, glowColor, 0.3);
  // 門口兩個南瓜燈
  for (const sx of [-1, 1]) {
    pumpkin(g, sx * 1.8, -4.3, 0.55, true, Math.PI + sx * 0.3, 0.3);
    lightPool(g, sx * 1.8, -4.4, 2, 0xffa040, 0.3);
  }
  return g;
}
// 稻草人（南瓜頭、破帽）
export function scarecrow(root, x, z, rot) {
  const g = grp(root, x, 0, z, rot);
  const wood = M(0x6b4a2e);
  add(g, box(0.22, 3.4, 0.22), wood, 0, 1.7, 0);
  add(g, box(2.6, 0.18, 0.18), wood, 0, 2.5, 0);
  add(g, box(1.0, 1.2, 0.55), M(0x6a5a8a), 0, 2.2, 0); // 衫
  for (const s of [-1, 1]) {
    add(g, box(0.8, 0.35, 0.4), M(0x6a5a8a), s * 0.85, 2.5, 0);
    add(g, box(0.25, 0.45, 0.25), M(0xd8b45a), s * 1.35, 2.4, 0, false); // 禾草手
  }
  add(g, box(0.9, 0.2, 0.6), M(0x8a5a3a), 0, 1.6, 0);
  pumpkin(g, 0, 0, 0.75, true, Math.PI, 2.85);
  add(g, cyl(0.7, 0.7, 0.06, 10), M(0x2a2232), 0, 3.6, 0); // 帽邊
  add(g, cone(0.42, 0.9, 8), M(0x2a2232), 0.05, 4.05, 0).rotation.z = 0.25; // 尖帽
  // 一隻烏鴉企喺手上
  const crow = grp(g, 1.1, 2.62, 0, 0.6);
  add(crow, box(0.28, 0.24, 0.42), M(0x15121b), 0, 0.12, 0, false);
  add(crow, box(0.2, 0.2, 0.2), M(0x15121b), 0, 0.3, -0.2, false);
  add(crow, cone(0.05, 0.16, 4), M(0xffb300), 0, 0.3, -0.36, false).rotation.x = -Math.PI / 2;
}
// 扭曲發光大樹（Hollow Sprites）：一節節彎、樹身有發光紋、友善嘅發光樹窿面、掛住發光果
export function twistedTree(root, x, z, s, rand, opts = {}) {
  const bark = M(0x3b2b4c);
  const vein = GLOW(opts.vein ?? 0x5dfcff, 1.6);
  const g = grp(root, x, 0, z, rand() * 6);
  let px = 0, pz = 0, py = 0;
  const lean = rand() * Math.PI * 2;
  const n = 6;
  let r = 0.75 * s;
  const tops = [];
  for (let i = 0; i < n; i++) {
    const segH = 1.7 * s;
    const bend = 0.18 + i * 0.05;
    const dx = Math.cos(lean + i * 0.7) * bend * s, dz = Math.sin(lean + i * 0.7) * bend * s;
    const a = new THREE.Vector3(px, py, pz);
    const b = new THREE.Vector3(px + dx, py + segH, pz + dz);
    const seg = add(g, cyl(r * 0.82, r, a.distanceTo(b) + 0.15, 7), bark, 0, 0, 0);
    seg.position.copy(a).lerp(b, 0.5);
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    if (i === 1 || i === 3) { // 發光紋
      const v = add(g, box(0.08, segH * 0.8, 0.08), vein, 0, 0, 0, false);
      v.position.copy(seg.position).add(new THREE.Vector3(Math.cos(i) * r * 0.9, 0, Math.sin(i) * r * 0.9));
      v.rotation.z = 0.3;
    }
    px = b.x; py = b.y; pz = b.z;
    r *= 0.82;
    if (i >= 3) tops.push(b.clone());
  }
  // 樹根
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rand();
    const root1 = add(g, cone(0.45 * s, 1.6 * s, 4), bark, Math.cos(a) * 0.7 * s, 0.35 * s, Math.sin(a) * 0.7 * s);
    root1.rotation.set(Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25);
  }
  // 友善樹窿面（兩隻眼一個 O 嘴，發光）
  if (opts.face !== false) {
    const face = GLOW(opts.faceColor ?? 0xb6ff5c, 2.2);
    const fz = -0.62 * s;
    for (const sx of [-1, 1]) add(g, box(0.16 * s, 0.22 * s, 0.1), face, sx * 0.22 * s, 2.0 * s, fz, false);
    add(g, box(0.26 * s, 0.3 * s, 0.1), face, 0, 1.55 * s, fz, false);
  }
  // 樹枝 + 樹冠（深紫／深青一嚿嚿）+ 掛住發光果
  const leafA = M(opts.leaf ?? 0x2b1e46, { flatShading: true });
  const leafB = M(opts.leaf2 ?? 0x1f3a46, { flatShading: true });
  const fruit = GLOW(opts.fruit ?? 0xff8af5, 2.4);
  const nb = 4;
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand();
    const t = tops[Math.min(tops.length - 1, i % tops.length)];
    const len = (1.8 + rand() * 1.2) * s;
    const end = t.clone().add(new THREE.Vector3(Math.cos(a) * len, len * 0.55, Math.sin(a) * len));
    const br = add(g, cyl(0.1 * s, 0.22 * s, t.distanceTo(end), 5), bark, 0, 0, 0);
    br.position.copy(t).lerp(end, 0.5);
    br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(t).normalize());
    const blob = add(g, geo('leafBlob', () => new THREE.DodecahedronGeometry(1, 0)), i % 2 ? leafA : leafB, end.x, end.y + 0.3 * s, end.z);
    blob.scale.set(1.6 * s, 1.0 * s, 1.6 * s);
    blob.rotation.set(rand(), rand(), rand());
    if (i % 2 === 0) { // 掛果
      const fx = end.x * 0.85, fz = end.z * 0.85;
      add(g, box(0.03, 0.8 * s, 0.03), M(0x1a1420), fx, end.y - 0.6 * s, fz, false);
      add(g, ball(0.16 * s, 8, 6), fruit, fx, end.y - 1.05 * s, fz, false);
    }
  }
  const top = add(g, geo('leafBlob', () => new THREE.DodecahedronGeometry(1, 0)), leafA, px, py + 0.6 * s, pz);
  top.scale.set(2.2 * s, 1.5 * s, 2.2 * s);
  top.rotation.y = rand() * 3;
  return g;
}
// 發光菇（一叢）
export function shroomCluster(root, x, z, s, color, rand) {
  const stem = M(0xece2d0);
  const cap = GLOW(color, 1.4);
  const spot = M(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 });
  const n = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const k = i === 0 ? 1 : 0.45 + rand() * 0.4;
    const ox = i === 0 ? 0 : (rand() - 0.5) * 1.1 * s, oz = i === 0 ? 0 : (rand() - 0.5) * 1.1 * s;
    const h = 0.7 * s * k;
    add(root, cyl(0.09 * s * k, 0.13 * s * k, h, 6), stem, x + ox, h / 2, z + oz, false);
    const c = add(root, ball(0.4 * s * k, 10, 5), cap, x + ox, h, z + oz, false);
    c.scale.y = 0.55;
    if (k > 0.8) for (let j = 0; j < 3; j++) add(root, box(0.09 * s, 0.05 * s, 0.09 * s), spot, x + ox + Math.cos(j * 2.1) * 0.22 * s, h + 0.18 * s, z + oz + Math.sin(j * 2.1) * 0.22 * s, false);
  }
}
// 大發光菇（地標，3–5 米高）
export function giantShroom(root, x, z, s, color) {
  add(root, cyl(0.35 * s, 0.55 * s, 3 * s, 10), M(0xe8dcc8), x, 1.5 * s, z);
  const cap = add(root, ball(1.6 * s, 14, 8), GLOW(color, 1.15), x, 3.1 * s, z);
  cap.scale.y = 0.5;
  add(root, cyl(1.4 * s, 1.4 * s, 0.12 * s, 14), M(0xf2e8ff), x, 2.85 * s, z, false); // 菇底
  for (let j = 0; j < 6; j++) {
    const a = (j / 6) * Math.PI * 2;
    add(root, box(0.28 * s, 0.12 * s, 0.28 * s), M(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.5 }), x + Math.cos(a) * 0.95 * s, 3.55 * s, z + Math.sin(a) * 0.95 * s, false).rotation.y = a;
  }
  halo(root, x, 3 * s, z, 3.2 * s, color, 0.22);
  lightPool(root, x, z, 5 * s, color, 0.38);
}
// 石（一嚿嚿，平面陰影）：InstancedMesh 用嘅形狀
export const rockGeo = () => geo('rock', () => new THREE.DodecahedronGeometry(1, 0));

// 地上一層霧（幾塊大薄片，合埋一個 mesh；紋理慢慢郁）
export function mistLayer(live, rects, rand, { color = 0xd8c8ff, opacity = 0.35, count = 10, y = [0.5, 1.6], size = [16, 30] } = {}) {
  const tex = mistTex();
  const parts = [];
  for (const r of rects)
    for (let i = 0; i < count; i++) {
      const w = size[0] + rand() * (size[1] - size[0]);
      const p = new THREE.PlaneGeometry(w, w * 0.8);
      p.rotateX(-Math.PI / 2);
      p.rotateY(rand() * Math.PI);
      p.translate(r.minX + rand() * (r.maxX - r.minX), y[0] + rand() * (y[1] - y[0]), r.minZ + rand() * (r.maxZ - r.minZ));
      parts.push(p);
    }
  const g = mergeSimple(parts);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, map: tex, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.renderOrder = 3;
  live.add(m);
  const p0 = rand() * 6;
  return { mesh: m, update: (t) => m.position.set(Math.sin(t * 0.05 + p0) * 3, 0, Math.cos(t * 0.04 + p0) * 2) }; // 慢慢飄
}

// 鬼火／螢火蟲：一堆發光點（Points，一個 draw call）
export function wispCloud(live, rects, n, colors, rand, { size = 0.9, y = [0.8, 4], r = [1, 3] } = {}) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const seeds = [];
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const rect = rects[i % rects.length];
    seeds.push({
      x: rect.minX + rand() * (rect.maxX - rect.minX), z: rect.minZ + rand() * (rect.maxZ - rect.minZ),
      y: y[0] + rand() * (y[1] - y[0]), p: rand() * 6, r: r[0] + rand() * (r[1] - r[0]), sp: 0.4 + rand() * 0.5,
    });
    c.setHex(colors[i % colors.length]);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size, map: glowTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.95 }));
  pts.frustumCulled = false;
  live.add(pts);
  return {
    update(t) {
      for (let i = 0; i < n; i++) {
        const s = seeds[i];
        const k = t * s.sp + s.p;
        pos[i * 3] = s.x + Math.cos(k) * s.r;
        pos[i * 3 + 1] = s.y + Math.sin(k * 1.7) * 0.5;
        pos[i * 3 + 2] = s.z + Math.sin(k * 0.8) * s.r;
      }
      g.attributes.position.needsUpdate = true;
    },
  };
}
