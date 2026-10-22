// 🦸 Cosmic Meteor Ranger 超級英雄落地（小朋友 2026-10-22：「跳完落地好似 Spider-Man 咁」）
// 着住 Cosmic Meteor Ranger 皮膚，跳起（或者由高處跌落嚟）一落地：
//   - 第三身：公仔單膝跪地、一隻手撳地（thirdPerson.js 嘅 applySuperLand，讀 tp.land）
//   - 地上：藍色衝擊波圈 + 發光裂紋 + 塵 + 藍色火花 + 閃光，「嘭」一聲
//   - 第一身：鏡頭沉一沉（好似膝頭屈落去）
// 其他皮膚：完全唔會觸發（照舊普通落地）
//
// main.js：
//   const superLand = createCosmicLanding(scene)
//   updateCosmicLanding(superLand, dt, { player, camera, tp: thirdPerson, on: 著緊呢套皮膚, play })   // 要喺 updatePlayer（同彈床）之後

import * as THREE from 'three';
import { SUPER_LAND_DUR } from './thirdPerson.js';

const MIN_AIR = 0.28; // 喺半空最少幾耐先算（行落樓梯、細細級唔會觸發）
const MIN_FALL_SPEED = 6; // 落地嗰陣最少幾快（米／秒）
const DIP = 0.42; // 第一身鏡頭沉幾多米
const CYAN = 0x40c4ff;

const additive = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });

// 地上裂紋（畫一次，之後共用）
let crackTex = null;
function crackTexture() {
  if (crackTex) return crackTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const glow = ctx.createRadialGradient(128, 128, 0, 128, 128, 70);
  glow.addColorStop(0, 'rgba(128,216,255,0.9)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#80d8ff';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 8;
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    let a = (i / 9) * Math.PI * 2 + Math.sin(i * 7.3) * 0.3;
    let x = 128;
    let y = 128;
    let w = 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      a += Math.sin(i * 3.1 + k * 2.3) * 0.5;
      const step = 14 + ((i * 13 + k * 7) % 9);
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      ctx.lineWidth = w;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      w = Math.max(1, w - 0.8);
      if (k === 2 && i % 2) {
        // 分叉
        ctx.save();
        ctx.lineWidth = 2;
        ctx.lineTo(x + Math.cos(a + 0.9) * 22, y + Math.sin(a + 0.9) * 22);
        ctx.stroke();
        ctx.restore();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  }
  crackTex = new THREE.CanvasTexture(c);
  return crackTex;
}

const ringGeo = new THREE.RingGeometry(0.85, 1, 56);
const ringGeo2 = new THREE.RingGeometry(0.95, 1, 56);
const decalGeo = new THREE.PlaneGeometry(3.6, 3.6);
const flashGeo = new THREE.PlaneGeometry(3, 3);
let flashTex = null;
function flashTexture() {
  if (flashTex) return flashTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(64,196,255,0.6)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  flashTex = new THREE.CanvasTexture(c);
  return flashTex;
}

export function createCosmicLanding(scene) {
  const L = { scene, fx: [], air: 0, minVy: 0, was: true, dipT: -1 };
  if (import.meta.env?.DEV) window.superLand = L; // 測試用（影相時停住特效）
  return L;
}

function spawn(L, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y + 0.04, z);
  L.scene.add(g);
  const flat = (mesh, h) => {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = h;
    g.add(mesh);
    return mesh;
  };
  const rings = [flat(new THREE.Mesh(ringGeo, additive(CYAN, 0.95)), 0.06), flat(new THREE.Mesh(ringGeo2, additive(0xe1f5fe, 0.9)), 0.08), flat(new THREE.Mesh(ringGeo, additive(0x7c4dff, 0.6)), 0.05)];
  const decal = flat(new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({ map: crackTexture(), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 })), 0.03);
  decal.rotation.z = Math.random() * Math.PI * 2;
  // 塵（灰藍）同火花（光藍）：每粒自己嘅速度
  const makePoints = (n, color, size, speed, up) => {
    const pos = new Float32Array(n * 3);
    const vel = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.6 + Math.random() * 0.6);
      vel.push([Math.cos(a) * v, up * (0.4 + Math.random()), Math.sin(a) * v]);
      pos[i * 3] = Math.cos(a) * 0.3;
      pos[i * 3 + 1] = 0.1;
      pos[i * 3 + 2] = Math.sin(a) * 0.3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size, map: flashTexture(), transparent: true, opacity: 0.9, depthWrite: false, blending: color === 0x9fa8da ? THREE.NormalBlending : THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    g.add(pts);
    return { pts, pos, vel, geo, mat };
  };
  const dust = makePoints(36, 0x9fa8da, 0.35, 4.5, 1.6);
  const sparks = makePoints(26, 0x80d8ff, 0.16, 8, 4.5);
  // 閃光：用發光圓片（唔用 PointLight —— 加燈會令成個場景嘅 shader 重新編譯，會卡一下）
  const flash = flat(new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ map: flashTexture(), color: 0xb3e5fc, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending })), 0.1);
  L.fx.push({ g, rings, decal, dust, sparks, flash, t: 0 });
}

function updateFx(L, dt) {
  for (const f of [...L.fx]) {
    f.t += dt;
    const t = f.t;
    f.rings.forEach((r, i) => {
      const k = Math.max(0, t - i * 0.07) / 0.65; // 一個個擴出去
      r.scale.setScalar(0.3 + (1 - (1 - Math.min(1, k)) ** 3) * (i === 2 ? 4 : 5.5));
      r.material.opacity = Math.max(0, 1 - k) * (i === 2 ? 0.6 : 0.95);
    });
    f.decal.material.opacity = t < 1.1 ? 1 : Math.max(0, 1 - (t - 1.1) / 0.9);
    f.decal.scale.setScalar(Math.min(1, 0.4 + t * 6));
    for (const p of [f.dust, f.sparks]) {
      const drag = p === f.dust ? 3.2 : 1.2;
      const grav = p === f.dust ? 1.5 : 14;
      p.vel.forEach((v, i) => {
        v[0] *= Math.exp(-drag * dt);
        v[2] *= Math.exp(-drag * dt);
        v[1] = v[1] * Math.exp(-drag * dt) - grav * dt;
        p.pos[i * 3] += v[0] * dt;
        p.pos[i * 3 + 1] = Math.max(0.03, p.pos[i * 3 + 1] + v[1] * dt);
        p.pos[i * 3 + 2] += v[2] * dt;
      });
      p.geo.attributes.position.needsUpdate = true;
      p.mat.opacity = Math.max(0, 1 - t / (p === f.dust ? 1.2 : 0.7)) * 0.9;
    }
    f.flash.material.opacity = Math.max(0, 1 - t / 0.4);
    f.flash.scale.setScalar(1 + t * 3);
    if (t > 2.1) {
      f.g.removeFromParent();
      for (const p of [f.dust, f.sparks]) {
        p.geo.dispose();
        p.mat.dispose();
      }
      f.rings.forEach((r) => r.material.dispose());
      f.decal.material.dispose();
      f.flash.material.dispose();
      L.fx.splice(L.fx.indexOf(f), 1);
    }
  }
}

// on：而家著住 Cosmic Meteor Ranger；ready：可以觸發（例如唔係播緊片）
export function updateCosmicLanding(L, dt, { player, camera, tp, on, ready = true, play }) {
  updateFx(L, dt);
  if (tp.land) {
    tp.land.t += dt;
    if (tp.land.t >= SUPER_LAND_DUR) tp.land = null;
  }
  // 偵測落地：上一格喺半空，呢格企到地
  if (!player.grounded) {
    L.air += dt;
    L.minVy = Math.min(L.minVy, player.vy);
  } else {
    if (!L.was && on && ready && L.air >= MIN_AIR && L.minVy <= -MIN_FALL_SPEED) {
      tp.land = { t: 0 };
      L.dipT = 0;
      spawn(L, camera.position.x, player.feetY, camera.position.z);
      play?.('superLand');
    }
    L.air = 0;
    L.minVy = 0;
  }
  L.was = player.grounded;
  // 第一身（同第三身）鏡頭沉一沉：0.07 秒落去，0.4 秒慢慢返上嚟
  if (L.dipT >= 0) {
    L.dipT += dt;
    const t = L.dipT;
    const k = t < 0.07 ? t / 0.07 : Math.max(0, 1 - (t - 0.07) / 0.4);
    camera.position.y -= DIP * k * k * (3 - 2 * k);
    if (t > 0.5) L.dipT = -1;
  }
}
