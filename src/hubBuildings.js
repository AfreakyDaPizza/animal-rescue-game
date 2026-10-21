// Hub 嘅建築（小朋友 2026-10-15）：魔法圖書館（Index，取代舊嗰個石台）同賣寵物攤位
// 每個 build 回傳 { spot（企喺邊度撳 E）, update(dt, time) }

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { addCollider, bakeStatic } from './world.js';
import { makeSign, THEMES } from './signs.js';

const materials = new Map();
const mat = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }));
  return materials.get(key);
};
const glow = (color, k = 2) => mat(color, { emissive: color, emissiveIntensity: k });
function add(parent, geo, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const rbox = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.15);
// 本地座標 (lx, lz) 轉做世界座標（group 轉咗 rotY）
const toWorld = (x, z, rotY, lx, lz) => [x + lx * Math.cos(rotY) + lz * Math.sin(rotY), z - lx * Math.sin(rotY) + lz * Math.cos(rotY)];

// ================= 魔法圖書館 =================
// 入口向 +z（本地）；rotY 轉佢面向 Hub 中間
export function buildMagicLibrary(scene, x, z, rotY) {
  const still = new THREE.Group(); // 唔郁嘅：焊埋
  const live = new THREE.Group();
  for (const g of [still, live]) {
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
  }
  scene.add(live);

  // 地台：紫色石 + 金邊 + 魔法陣
  add(still, new THREE.CylinderGeometry(5.6, 5.9, 0.4, 8), mat(0x4a3570), 0, 0.2, 0);
  add(still, new THREE.CylinderGeometry(5.65, 5.65, 0.06, 8), mat(0xffd54f, { metalness: 0.8, roughness: 0.3 }), 0, 0.42, 0);
  add(still, new THREE.CylinderGeometry(5.3, 5.3, 0.04, 8), mat(0x5e4590), 0, 0.46, 0, false);
  const circle = add(live, new THREE.RingGeometry(2.0, 2.25, 6), new THREE.MeshBasicMaterial({ color: 0xb388ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }), 0, 0.5, 0, false);
  circle.rotation.x = -Math.PI / 2;
  const circle2 = add(live, new THREE.RingGeometry(1.2, 1.32, 5), new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.8, side: THREE.DoubleSide }), 0, 0.51, 0, false);
  circle2.rotation.x = -Math.PI / 2;

  // 後面一圈書架（半圓），書架上面一格格彩色書
  const shelfWood = mat(0x4e342e);
  const bookColors = [0xc62828, 0x1565c0, 0x2e7d32, 0x6a1b9a, 0xef6c00, 0x00838f, 0xf9a825, 0xad1457];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i - 2) * 0.55; // 喺 -z 嗰邊
    const sx = Math.sin(a) * 4.3;
    const sz = Math.cos(a) * 4.3;
    const shelf = new THREE.Group();
    shelf.position.set(sx, 0.45, sz);
    shelf.rotation.y = a + Math.PI;
    still.add(shelf);
    add(shelf, rbox(2.3, 4.6, 0.7), shelfWood, 0, 2.3, 0);
    for (let row = 0; row < 4; row++) {
      add(shelf, new THREE.BoxGeometry(2.0, 0.08, 0.5), mat(0x6d4c41), 0, 0.45 + row * 1.05, 0.12);
      let bx = -0.95;
      let n = 0;
      while (bx < 0.9) {
        const w = 0.14 + ((i * 7 + row * 3 + n) % 4) * 0.04;
        const h = 0.6 + ((i + row * 5 + n * 3) % 5) * 0.06;
        add(shelf, new THREE.BoxGeometry(w, h, 0.4), mat(bookColors[(i * 3 + row * 2 + n) % bookColors.length]), bx + w / 2, 0.5 + row * 1.05 + h / 2, 0.15, false);
        bx += w + 0.02;
        n++;
      }
    }
    const [wx, wz] = toWorld(x, z, rotY, sx, sz);
    addCollider(wx, wz, 1.2);
  }

  // 前面兩條柱，頂有發光水晶；中間拱門 + 圓頂
  const stone = mat(0xd1c4e9);
  const crystals = [];
  for (const s of [-1, 1]) {
    add(still, rbox(0.9, 6.2, 0.9), stone, s * 3.6, 3.5, 3.2);
    add(still, rbox(1.2, 0.4, 1.2), mat(0xffd54f, { metalness: 0.8, roughness: 0.3 }), s * 3.6, 6.7, 3.2);
    const c = add(live, new THREE.OctahedronGeometry(0.45), glow(0xe040fb, 2.5), s * 3.6, 7.5, 3.2, false);
    c.scale.y = 1.6;
    crystals.push(c);
    const [wx, wz] = toWorld(x, z, rotY, s * 3.6, 3.2);
    addCollider(wx, wz, 0.7);
  }
  add(still, new THREE.TorusGeometry(3.6, 0.3, 8, 24, Math.PI), stone, 0, 6.6, 3.2);
  const dome = add(still, new THREE.SphereGeometry(4.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7e57c2, { roughness: 0.4 }), 0, 6.9, -0.6);
  dome.scale.y = 0.6;
  add(still, new THREE.TorusGeometry(4.6, 0.18, 8, 32), mat(0xffd54f, { metalness: 0.8, roughness: 0.3 }), 0, 6.9, -0.6).rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    add(still, rbox(0.7, 6.4, 0.7), stone, Math.cos(a) * 4.2, 3.6, -0.6 + Math.sin(a) * 4.2 * 0.9);
  }
  const star = add(live, new THREE.OctahedronGeometry(0.6), glow(0xffeb3b, 3), 0, 10.2, -0.6, false);

  // 中間：講台 + 打開咗嘅大書（發光）
  add(still, new THREE.CylinderGeometry(0.55, 0.8, 1.2, 8), mat(0x5d4037), 0, 1.05, 0.4);
  const book = new THREE.Group();
  book.position.set(0, 1.75, 0.4);
  book.rotation.x = -0.35;
  live.add(book);
  for (const s of [-1, 1]) {
    const page = add(book, new THREE.BoxGeometry(0.75, 0.05, 1.0), glow(0xfff8e1, 0.9), s * 0.4, 0, 0, false);
    page.rotation.z = s * -0.18;
  }
  add(book, new THREE.BoxGeometry(1.7, 0.05, 1.08), mat(0x6a1b9a), 0, -0.05, 0, false);
  addCollider(...toWorld(x, z, rotY, 0, 0.4), 1.0);

  // 喺書上面浮住嘅水晶球
  const orb = add(live, new THREE.SphereGeometry(0.42, 20, 14), new THREE.MeshStandardMaterial({ color: 0xb388ff, emissive: 0x7c4dff, emissiveIntensity: 1.6, transparent: true, opacity: 0.85, roughness: 0.1 }), 0, 3.0, 0.4, false);

  // 飛嚟飛去嘅書（開合）
  const flyers = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    const color = bookColors[i % bookColors.length];
    const halves = [-1, 1].map((s) => {
      const p = new THREE.Group();
      add(p, new THREE.BoxGeometry(0.36, 0.05, 0.5), mat(color), s * 0.18, 0, 0, false);
      add(p, new THREE.BoxGeometry(0.32, 0.06, 0.46), mat(0xfffde7), s * 0.17, 0.03, 0, false);
      g.add(p);
      return { p, s };
    });
    live.add(g);
    flyers.push({ g, halves, r: 2.0 + (i % 3) * 0.6, h: 2.6 + (i % 4) * 0.7, speed: 0.5 + (i % 3) * 0.2, phase: i * 0.9 });
  }

  // 閃粉
  const COUNT = 60;
  const pos = new Float32Array(COUNT * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xffe57f, size: 0.12, transparent: true, opacity: 0.9, depthWrite: false }));
  sparks.frustumCulled = false;
  live.add(sparks);

  const sign = makeSign([{ text: '✨ MAGIC LIBRARY ✨', size: 0.36 }, { text: 'Press E: Animal Index', size: 0.22 }], 5.2, 1.3, THEMES.purple);
  sign.position.set(0, 5.4, 3.75);
  live.add(sign);

  bakeStatic(still, scene);
  const [sx, sz] = toWorld(x, z, rotY, 0, 3.0);
  return {
    spot: { x: sx, z: sz },
    update(dt, time) {
      circle.rotation.z = time * 0.4;
      circle2.rotation.z = -time * 0.7;
      orb.position.y = 3.0 + Math.sin(time * 2) * 0.15;
      orb.material.emissiveIntensity = 1.4 + Math.sin(time * 3) * 0.4;
      star.rotation.y = time;
      crystals.forEach((c, i) => {
        c.rotation.y = time * (i ? 1 : -1);
        c.position.y = 7.5 + Math.sin(time * 2 + i) * 0.15;
      });
      for (const f of flyers) {
        const a = time * f.speed + f.phase;
        f.g.position.set(Math.cos(a) * f.r, f.h + Math.sin(time * 1.5 + f.phase) * 0.3, 0.4 + Math.sin(a) * f.r);
        f.g.rotation.y = -a;
        const open = 0.5 + Math.sin(time * 6 + f.phase) * 0.4;
        for (const { p, s } of f.halves) p.rotation.z = s * open;
      }
      for (let i = 0; i < COUNT; i++) {
        const k = (time * 0.3 + i / COUNT) % 1;
        const a = i * 2.4 + time * 0.5;
        pos[i * 3] = Math.cos(a) * (0.6 + k * 2.2);
        pos[i * 3 + 1] = 1.8 + k * 3.5;
        pos[i * 3 + 2] = 0.4 + Math.sin(a) * (0.6 + k * 2.2);
      }
      sparkGeo.attributes.position.needsUpdate = true;
    },
  };
}

// ================= 賣寵物攤位 =================
// 前面（本地 +z）係櫃枱；rotY 轉佢面向條路
export function buildSellStall(scene, x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  const wood = mat(0x8d6e63);
  add(g, rbox(4.2, 1.1, 1.2), mat(0x2e7d32), 0, 0.55, 0.6); // 綠色櫃枱
  add(g, rbox(4.3, 0.12, 1.3), mat(0xffd54f), 0, 1.15, 0.6);
  for (const s of [-1, 1]) for (const zz of [-1.4, 1.1]) add(g, rbox(0.18, 3.2, 0.18), wood, s * 2.0, 1.6, zz);
  // 黃綠間條帳篷
  for (let i = 0; i < 7; i++) {
    add(g, new THREE.BoxGeometry(0.62, 0.12, 2.9), mat(i % 2 ? 0xfff176 : 0x43a047), -1.86 + i * 0.62, 3.25, -0.15).rotation.x = 0.18;
    add(g, new THREE.ConeGeometry(0.3, 0.35, 3), mat(i % 2 ? 0xfff176 : 0x43a047), -1.86 + i * 0.62, 2.95, 1.2).rotation.x = Math.PI;
  }
  // 櫃枱上面：天秤、錢袋、一堆金幣
  const gold = mat(0xffc107, { metalness: 0.9, roughness: 0.25, emissive: 0x6d4c00, emissiveIntensity: 0.4 });
  add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), mat(0x9e9e9e), -1.2, 1.65, 0.6);
  add(g, new THREE.BoxGeometry(1.0, 0.05, 0.05), mat(0x9e9e9e), -1.2, 2.1, 0.6);
  for (const s of [-1, 1]) add(g, new THREE.CylinderGeometry(0.25, 0.2, 0.06, 12), gold, -1.2 + s * 0.5, 1.85, 0.6);
  add(g, new THREE.SphereGeometry(0.35, 12, 10), mat(0x8d6e63), 0.2, 1.55, 0.6).scale.y = 1.1; // 錢袋
  add(g, new THREE.BoxGeometry(0.2, 0.15, 0.2), mat(0x5d4037), 0.2, 1.95, 0.6);
  const coins = [];
  for (let i = 0; i < 9; i++) {
    const c = add(g, new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), gold, 1.2 + (i % 3) * 0.12 - 0.12, 1.25 + Math.floor(i / 3) * 0.05, 0.5 + (i % 2) * 0.1, false);
    coins.push(c);
  }
  // 一粒彈下彈下嘅大金幣
  const big = add(g, new THREE.CylinderGeometry(0.45, 0.45, 0.1, 24), gold, 0, 4.4, 1.0, false);
  big.rotation.x = Math.PI / 2;
  const sign = makeSign([{ text: '💰 SELL STALL', size: 0.42 }, { text: 'Sell your pets for cash!', size: 0.22 }], 3.6, 1.1, THEMES.green);
  sign.position.set(0, 3.5, 1.35);
  g.add(sign);
  addCollider(x, z, 2.2);
  const [sx, sz] = toWorld(x, z, rotY, 0, 2.4);
  return {
    spot: { x: sx, z: sz },
    update(dt, time) {
      big.rotation.z = time * 2;
      big.position.y = 4.4 + Math.abs(Math.sin(time * 2.5)) * 0.25;
    },
  };
}

// ================= 💾 存檔攤位（Issue #8：Save your progress stall）=================
// 藍白間條帳篷 + 櫃枱上一部發光電腦 + 頭頂轉緊嘅雲；撳 E 即刻存上帳號（account.js）
export function buildSaveStall(scene, x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  const wood = mat(0x8d6e63);
  add(g, rbox(4.2, 1.1, 1.2), mat(0x1565c0), 0, 0.55, 0.6); // 藍色櫃枱
  add(g, rbox(4.3, 0.12, 1.3), mat(0xe3f2fd), 0, 1.15, 0.6);
  for (const s of [-1, 1]) for (const zz of [-1.4, 1.1]) add(g, rbox(0.18, 3.2, 0.18), wood, s * 2.0, 1.6, zz);
  for (let i = 0; i < 7; i++) {
    add(g, new THREE.BoxGeometry(0.62, 0.12, 2.9), mat(i % 2 ? 0xffffff : 0x1e88e5), -1.86 + i * 0.62, 3.25, -0.15).rotation.x = 0.18;
    add(g, new THREE.ConeGeometry(0.3, 0.35, 3), mat(i % 2 ? 0xffffff : 0x1e88e5), -1.86 + i * 0.62, 2.95, 1.2).rotation.x = Math.PI;
  }
  // 櫃枱上面：電腦（發光螢幕）+ 一疊磁碟
  add(g, rbox(1.3, 0.85, 0.12), mat(0x263238), -0.8, 1.75, 0.45);
  add(g, new THREE.PlaneGeometry(1.1, 0.65), glow(0x4fc3f7, 1.2), -0.8, 1.75, 0.52, false);
  add(g, new THREE.BoxGeometry(0.15, 0.3, 0.15), mat(0x455a64), -0.8, 1.32, 0.45);
  add(g, new THREE.BoxGeometry(0.9, 0.04, 0.35), mat(0x37474f), -0.8, 1.23, 0.85);
  const disks = [0xff7043, 0x66bb6a, 0xffca28];
  disks.forEach((c, i) => {
    add(g, new THREE.BoxGeometry(0.45, 0.06, 0.45), mat(c), 0.9, 1.25 + i * 0.07, 0.6).rotation.y = i * 0.3;
  });
  // 頭頂一朵發光雲（☁️ = 存上網），上下浮
  const cloud = new THREE.Group();
  for (const [cx, cy, r] of [[0, 0, 0.42], [-0.42, -0.08, 0.3], [0.42, -0.08, 0.32], [0.18, 0.2, 0.3]]) add(cloud, new THREE.SphereGeometry(r, 14, 10), glow(0xe1f5fe, 0.6), cx, cy, 0, false);
  const arrow = add(cloud, new THREE.ConeGeometry(0.18, 0.3, 4), glow(0x29b6f6, 1.5), 0, -0.05, 0.35, false);
  arrow.rotation.x = Math.PI; // 箭咀指向雲 = 上載
  cloud.position.set(0, 4.5, 1.0);
  g.add(cloud);
  const sign = makeSign([{ text: '💾 SAVE STALL', size: 0.42 }, { text: 'Save your progress!', size: 0.22 }], 3.6, 1.1, THEMES.blue);
  sign.position.set(0, 3.5, 1.35);
  g.add(sign);
  addCollider(x, z, 2.2);
  const [sx, sz] = toWorld(x, z, rotY, 0, 2.4);
  return {
    spot: { x: sx, z: sz },
    update(dt, time) {
      cloud.position.y = 4.5 + Math.sin(time * 1.6) * 0.18;
      cloud.rotation.y = Math.sin(time * 0.8) * 0.4;
    },
  };
}
