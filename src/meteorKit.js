// ☄️ 隕石工具箱（Issue #10）：發光藍色水晶、隕石、拖尾、光暈貼圖
// meteorDecor.js（長期裝飾 + 流星）、meteorEvent.js（METEORIC 活動）、meteorBoss.js（Boss 爛咗樣）一齊用
// 物料全部共用（同一種物料 bakeStatic 先焊得埋做一件）

import * as THREE from 'three';

// 固定隨機（每次開遊戲都一樣）
export function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 水晶顏色：主要係藍色，加少少青、紫、粉紅（活動時「好多顏色」）
export const CRYSTAL_COLORS = [0x40c4ff, 0x18ffff, 0x7c4dff, 0xea80fc, 0x448aff];
const crystalMats = new Map();
export function crystalMat(color = 0x40c4ff, glow = 0.9) {
  const key = `${color}|${glow}`;
  if (!crystalMats.has(key)) {
    crystalMats.set(key, new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: glow, roughness: 0.25, metalness: 0.1, flatShading: true,
    }));
  }
  return crystalMats.get(key);
}
// 隕石：深藍黑色石（入面嘅藍光由一粒細啲嘅發光波「篤出嚟」）
export const rockMat = new THREE.MeshStandardMaterial({ color: 0x232a3d, roughness: 0.95, flatShading: true });
export const rockMat2 = new THREE.MeshStandardMaterial({ color: 0x3a3f52, roughness: 0.9, flatShading: true });
export const veinMat = new THREE.MeshStandardMaterial({ color: 0x00b0ff, emissive: 0x00b0ff, emissiveIntensity: 1.4, roughness: 0.4, flatShading: true });

export const GEO = {
  spike: new THREE.OctahedronGeometry(0.5, 0), // 拉長做水晶
  rock: new THREE.DodecahedronGeometry(0.5, 0),
  vein: new THREE.IcosahedronGeometry(0.5, 0),
  box: new THREE.BoxGeometry(1, 1, 1),
};

// 一嚿隕石：深色石 + 篤出嚟嘅藍光（vein 比石大少少、轉咗角度，啲尖角就會由石面穿出嚟）
export function meteorRock(root, x, y, z, size, rand) {
  const rock = new THREE.Mesh(GEO.rock, rand() < 0.5 ? rockMat : rockMat2);
  rock.scale.set(size * (0.9 + rand() * 0.4), size * (0.65 + rand() * 0.3), size * (0.9 + rand() * 0.4));
  rock.position.set(x, y + size * 0.25, z);
  rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
  root.add(rock);
  const vein = new THREE.Mesh(GEO.vein, veinMat);
  vein.scale.copy(rock.scale).multiplyScalar(0.93);
  vein.position.copy(rock.position);
  vein.rotation.set(rand() * 3, rand() * 3, rand() * 3);
  root.add(vein);
  return rock;
}

// 一叢水晶：幾條尖尖嘅八面體，由中間向外斜（lean = 整叢向邊個方向側）
export function crystalCluster(root, x, y, z, height, rand, { colors = [0x40c4ff], glow = 0.9, count = 0, lean = null } = {}) {
  const n = count || 3 + Math.floor(rand() * 3);
  const g = new THREE.Group();
  g.position.set(x, y, z);
  for (let i = 0; i < n; i++) {
    const h = height * (i === 0 ? 1 : 0.4 + rand() * 0.5);
    const w = h * (0.22 + rand() * 0.1);
    const m = new THREE.Mesh(GEO.spike, crystalMat(colors[Math.floor(rand() * colors.length)], glow));
    m.scale.set(w, h, w);
    const a = rand() * Math.PI * 2;
    const r = i === 0 ? 0 : height * 0.18 * (0.5 + rand());
    m.position.set(Math.cos(a) * r, h * 0.38, Math.sin(a) * r);
    m.rotation.set(Math.sin(a) * (i === 0 ? 0.08 : 0.45), rand() * 3, -Math.cos(a) * (i === 0 ? 0.08 : 0.45), 'YXZ');
    g.add(m);
  }
  // 底嘅碎石
  const base = new THREE.Mesh(GEO.rock, rockMat);
  base.scale.set(height * 0.5, height * 0.2, height * 0.5);
  base.position.y = height * 0.04;
  g.add(base);
  if (lean) g.rotation.set(lean.x || 0, lean.y || 0, lean.z || 0);
  root.add(g);
  return g;
}

// 圓形漸變（光暈、閃光、塵）
const texCache = new Map();
export function glowTexture(stops = [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(160,230,255,0.85)'], [0.6, 'rgba(0,145,255,0.3)'], [1, 'rgba(0,60,255,0)']]) {
  const key = JSON.stringify(stops);
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  texCache.set(key, tex);
  return tex;
}
// 拖尾：頭（x = 0）最光，尾（x = 1）透明；中間（y = 0.5）最光
let trailTex = null;
export function trailTexture() {
  if (trailTex) return trailTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 32;
  const ctx = c.getContext('2d');
  const along = ctx.createLinearGradient(0, 0, 128, 0);
  along.addColorStop(0, 'rgba(255,255,255,1)');
  along.addColorStop(0.12, 'rgba(170,235,255,0.95)');
  along.addColorStop(0.5, 'rgba(40,150,255,0.45)');
  along.addColorStop(1, 'rgba(20,60,255,0)');
  ctx.fillStyle = along;
  ctx.fillRect(0, 0, 128, 32);
  // 上下兩邊淡出
  ctx.globalCompositeOperation = 'destination-in';
  const across = ctx.createLinearGradient(0, 0, 0, 32);
  across.addColorStop(0, 'rgba(0,0,0,0)');
  across.addColorStop(0.5, 'rgba(0,0,0,1)');
  across.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, 128, 32);
  trailTex = new THREE.CanvasTexture(c);
  return trailTex;
}

// 一條拖尾（plane：x 由 0 到 1 = 頭到尾）；每格用 orientTrail 擺向鏡頭
export function makeTrail(color = 0xffffff, opacity = 1) {
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.translate(0.5, 0, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map: trailTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
  }));
  m.frustumCulled = false;
  return m;
}
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();
// head：頭喺邊；back：向尾嘅方向（單位向量）；length、width：幾長幾闊；camPos：等塊 plane 對住鏡頭
export function orientTrail(mesh, head, back, length, width, camPos) {
  _x.copy(back).normalize();
  _z.subVectors(camPos, head);
  _z.addScaledVector(_x, -_z.dot(_x));
  if (_z.lengthSq() < 1e-6) _z.set(0, 1, 0);
  _z.normalize();
  _y.crossVectors(_z, _x);
  _m.makeBasis(_x.multiplyScalar(length), _y.multiplyScalar(width), _z);
  _m.setPosition(head);
  mesh.matrixAutoUpdate = false;
  mesh.matrix.copy(_m);
  mesh.matrixWorldNeedsUpdate = true;
}

// 一堆粒子（閃閃、塵、火花）：一個 Points = 一個 draw call
// spawn(pos, vel, life, size, color)；update(dt, gravity, drag)
export function particlePool(scene, max, { texture = glowTexture(), additive = true, size = 1 } = {}) {
  const pos = new Float32Array(max * 3);
  const col = new Float32Array(max * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size, map: texture, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  const parts = [];
  for (let i = 0; i < max; i++) parts.push({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, c: new THREE.Color() });
  let next = 0;
  let busy = false; // 冇粒子嘅時候唔使逐粒計
  const pool = {
    points,
    spawn(p, v, life, color) {
      const q = parts[next];
      next = (next + 1) % max;
      q.alive = true;
      q.p.copy(p);
      q.v.copy(v);
      q.life = q.max = life;
      q.c.set(color);
      busy = true;
    },
    update(dt, gravity = 0, drag = 0) {
      if (!busy) return;
      let any = false;
      for (let i = 0; i < max; i++) {
        const q = parts[i];
        if (q.alive) {
          q.life -= dt;
          if (q.life <= 0) q.alive = false;
          q.v.y -= gravity * dt;
          q.v.multiplyScalar(Math.max(0, 1 - drag * dt));
          q.p.addScaledVector(q.v, dt);
        }
        const k = q.alive ? Math.min(1, q.life / q.max * 1.5) : 0;
        pos[i * 3] = q.p.x;
        pos[i * 3 + 1] = q.alive ? q.p.y : -999;
        pos[i * 3 + 2] = q.p.z;
        col[i * 3] = q.c.r * k;
        col[i * 3 + 1] = q.c.g * k;
        col[i * 3 + 2] = q.c.b * k;
        any = any || q.alive;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      points.visible = any;
      busy = any;
    },
  };
  return pool;
}
