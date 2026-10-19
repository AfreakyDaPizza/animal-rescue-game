// 🪵 靚啲嘅圍欄（小朋友 2026-10-19：「make the fences, everything cool」）
// 全部加落一個 root group，之後由 bakeStatic 按材質焊埋，所以幾長都唔會多好多 draw call。
// 只係裝飾：唔加 collider，碰撞照用返原本嘅（位置唔變）。

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const cache = new Map();
// 同一隻顏色／設定共用一個材質（焊埋嗰陣先會併埋一齊）
export function fenceMat(color, extra = {}) {
  const key = `${color}|${JSON.stringify(extra)}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }));
  return cache.get(key);
}

const geoCache = new Map();
const geo = (key, make) => {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
};
export const roundBox = (w, h, d, r = Math.min(w, h, d) * 0.18) => geo(`rb${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r));
const boxG = (w, h, d) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));

function put(root, g, m, x, y, z, ry = 0, shadow = true) {
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = shadow;
  root.add(mesh);
  return mesh;
}

// 一條柱：底座 + 柱身 + 柱頂（cap: 'pyramid' | 'ball' | 'gem' | 'flat'）
export function fencePost(root, x, z, s) {
  const { post, trim, h = 1.3, w = 0.26, cap = 'pyramid', capMat = trim, gem = null } = s;
  put(root, roundBox(w + 0.12, 0.16, w + 0.12), trim, x, 0.08, z); // 底座
  put(root, roundBox(w, h, w), post, x, h / 2, z);
  put(root, boxG(w + 0.06, 0.08, w + 0.06), trim, x, h - 0.16, z, 0, false); // 頂下面一圈裝飾
  if (cap === 'pyramid') {
    const c = put(root, geo('pyr', () => new THREE.ConeGeometry(0.72, 0.26, 4)), capMat, x, h + 0.13, z, Math.PI / 4);
    c.scale.set(w * 1.15, 1, w * 1.15);
  } else if (cap === 'ball') put(root, geo('ball', () => new THREE.SphereGeometry(1, 12, 8)), capMat, x, h + 0.12, z).scale.setScalar(w * 0.62);
  else if (cap === 'flat') put(root, roundBox(w + 0.1, 0.1, w + 0.1), capMat, x, h + 0.05, z);
  if (gem) {
    const g = put(root, geo('gem', () => new THREE.OctahedronGeometry(1, 0)), gem, x, h + 0.55, z, 0, false);
    g.scale.set(w * 0.55, w * 0.95, w * 0.55);
  }
}

// 兩條柱之間嘅橫木（有一條細啲嘅飾邊）
export function fenceRails(root, x1, z1, x2, z2, s) {
  const { rail, trim, rails = [0.42, 0.95], railW = 0.1, railH = 0.13 } = s;
  const len = Math.hypot(x2 - x1, z2 - z1);
  const ry = Math.atan2(x2 - x1, z2 - z1);
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  for (const y of rails) put(root, roundBox(railW, railH, len + 0.02, 0.03), rail, cx, y, cz, ry);
  if (s.pickets) {
    // 尖頂直木條（白色欄杆款）
    const n = Math.max(1, Math.floor(len / s.pickets));
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n;
      const px = x1 + (x2 - x1) * k;
      const pz = z1 + (z2 - z1) * k;
      put(root, boxG(0.12, s.pickH ?? 1.0, 0.06), rail, px, (s.pickH ?? 1.0) / 2, pz, ry + Math.PI / 2, false);
      put(root, geo('pick', () => new THREE.ConeGeometry(0.09, 0.16, 4)), rail, px, (s.pickH ?? 1.0) + 0.08, pz, ry + Math.PI / 4, false);
    }
  }
  if (s.vines) {
    // 幾嚿藤葉掛喺橫木度
    const n = Math.floor(len / 0.9);
    for (let i = 0; i < n; i++) {
      if ((Math.sin(x1 * 7.1 + z1 * 3.3 + i * 2.7) + 1) / 2 > s.vines) continue;
      const k = (i + 0.5) / n;
      put(root, roundBox(0.22, 0.16, 0.22, 0.05), s.leaf, x1 + (x2 - x1) * k, rails[rails.length - 1] - 0.05 - (i % 2) * 0.22, z1 + (z2 - z1) * k, ry + i, false);
    }
  }
}

// 沿住一串點起圍欄：每 spacing 米一條柱，skip(x, z) = true 嗰度唔起（例如閘口）
// gemEvery：每幾多條柱有一粒發光寶石
export function fenceLine(root, points, s) {
  const spacing = s.spacing ?? 1.6;
  let count = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const steps = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / spacing));
    for (let k = 0; k <= steps; k++) {
      if (k === 0 && i > 0) continue; // 轉角柱上一段已經起咗
      const x = ax + ((bx - ax) * k) / steps;
      const z = az + ((bz - az) * k) / steps;
      if (s.skip?.(x, z)) continue;
      const big = s.gemEvery && count % s.gemEvery === 0;
      fencePost(root, x, z, big ? { ...s, w: (s.w ?? 0.26) * 1.25, h: (s.h ?? 1.3) + 0.2, gem: s.gem ?? null } : s);
      count++;
      if (k < steps) {
        const nx = ax + ((bx - ax) * (k + 1)) / steps;
        const nz = az + ((bz - az) * (k + 1)) / steps;
        if (!s.skip?.(nx, nz)) fenceRails(root, x, z, nx, nz, s);
      }
    }
  }
}

// 圓拱（喺 x = 常數嗰塊面，跨過 z1–z2），例如閘口
export function archX(root, x, z1, z2, y, material, tube = 0.14) {
  const r = Math.abs(z2 - z1) / 2;
  const a = put(root, new THREE.TorusGeometry(r, tube, 8, 24, Math.PI), material, x, y, (z1 + z2) / 2, Math.PI / 2);
  return a;
}
