// 🔫 魔法武器嘅 3D 模型（Issue #11）：Soul Blaster、Candy Pistol、Spooky Slingshot
// 全部係科幻／魔法款（發光靈魂能量、糖果），唔係真槍
// 每個模型：槍管向 -z，手柄喺原點附近；長度大約 1（掛上鏡頭時再縮細）
// userData：muzzle（槍嘴，閃光／子彈由度出）、mag（換彈時郁嘅部分）、glows（發光材質，射嘢時閃）、band（彈叉條橡筋）、pouch（彈叉皮兜）

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.3, ...extra });
const GLOW = (color, k = 2.2, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.3, ...extra });
function rbox(parent, w, h, d, mat, x = 0, y = 0, z = 0, r = 0.25) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * r), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function cyl(parent, r1, r2, h, mat, x = 0, y = 0, z = 0, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);
  m.position.set(x, y, z);
  m.rotation.x = Math.PI / 2; // 打橫（沿 z）
  parent.add(m);
  return m;
}
function ring(parent, r, tube, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 24), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// 圓形柔光貼圖（閃光、光暈、霧用）
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}
// 星形閃光（槍嘴閃）
let starTex = null;
function starTexture() {
  if (starTex) return starTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.translate(64, 64);
  for (let i = 0; i < 6; i++) {
    g.rotate(Math.PI / 3);
    const gr = g.createLinearGradient(0, 0, 60, 0);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, -7);
    g.lineTo(62, 0);
    g.lineTo(0, 7);
    g.fill();
  }
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 30);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(-64, -64, 128, 128);
  starTex = new THREE.CanvasTexture(c);
  return starTex;
}
// 槍嘴閃光：一個星形 + 一個圓光（加亮）；flash.userData.show(k) 0–1
export function muzzleFlash(color) {
  const g = new THREE.Group();
  const star = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: starTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const ball = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const side = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.6), star.material); // 由側面望都見到
  side.rotation.x = Math.PI / 2;
  side.position.z = -0.5;
  g.add(star, ball, side);
  g.visible = false;
  g.userData.show = (k) => {
    g.visible = k > 0.01;
    if (!g.visible) return;
    star.rotation.z = Math.random() * Math.PI;
    star.scale.setScalar(0.5 + k * 0.6 + Math.random() * 0.2);
    ball.scale.setScalar(0.9 * k);
    side.scale.set(1, 0.6 + k, 1);
    star.material.opacity = k;
    ball.material.opacity = k * 0.8;
  };
  return g;
}

// ---------- 💠 Soul Blaster（小朋友嘅「AK-47」→ 改做靈魂能量步槍）----------
function soulBlaster() {
  const g = new THREE.Group();
  const shell = M(0x241a3a, { metalness: 0.55, roughness: 0.35 });
  const trim = M(0x6a52a8, { metalness: 0.75, roughness: 0.3 });
  const dark = M(0x120c1e);
  const soul = GLOW(0x40ffd0, 2.6);
  const soulSoft = GLOW(0x40ffd0, 1.2, { transparent: true, opacity: 0.75 });
  // 機身
  rbox(g, 0.16, 0.2, 0.62, shell, 0, 0.02, -0.12);
  rbox(g, 0.12, 0.06, 0.66, trim, 0, 0.14, -0.12, 0.4); // 頂嘅飾條
  // 能量核心（玻璃窗入面發光）
  const core = cyl(g, 0.055, 0.055, 0.34, soulSoft, 0.075, 0.03, -0.12);
  core.rotation.z = 0;
  cyl(g, 0.055, 0.055, 0.34, soulSoft, -0.075, 0.03, -0.12);
  // 槍管 + 3 個發光圈
  cyl(g, 0.045, 0.055, 0.5, shell, 0, 0.03, -0.66);
  for (const z of [-0.5, -0.64, -0.78]) ring(g, 0.07, 0.016, soul, 0, 0.03, z);
  const tip = cyl(g, 0.07, 0.05, 0.08, trim, 0, 0.03, -0.92);
  tip.castShadow = false;
  rbox(g, 0.05, 0.03, 0.04, soul, 0, 0.11, -0.86, 0.3); // 前準星
  // 槍托
  rbox(g, 0.12, 0.16, 0.3, shell, 0, -0.02, 0.32);
  rbox(g, 0.13, 0.05, 0.26, soul, 0, 0.06, 0.32, 0.4);
  // 手柄
  const grip = rbox(g, 0.09, 0.2, 0.1, dark, 0, -0.14, 0.06);
  grip.rotation.x = 0.25;
  // 彈匣 = 彎彎嘅靈魂水晶
  const mag = new THREE.Group();
  mag.position.set(0, -0.08, -0.2);
  g.add(mag);
  const crystal = rbox(mag, 0.08, 0.24, 0.1, soul, 0, -0.12, 0.02, 0.35);
  crystal.rotation.x = -0.35;
  rbox(mag, 0.1, 0.04, 0.12, trim, 0, -0.01, 0, 0.3);
  // 瞄準鏡
  const scope = new THREE.Group();
  scope.position.set(0, 0.24, -0.1);
  g.add(scope);
  cyl(scope, 0.05, 0.05, 0.3, dark, 0, 0, 0);
  cyl(scope, 0.062, 0.062, 0.05, trim, 0, 0, -0.16);
  cyl(scope, 0.062, 0.062, 0.05, trim, 0, 0, 0.16);
  const lens = cyl(scope, 0.048, 0.048, 0.01, GLOW(0x80ffe8, 1.6), 0, 0, -0.19);
  lens.castShadow = false;
  rbox(scope, 0.04, 0.06, 0.12, trim, 0, -0.06, 0);
  // 槍嘴
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.03, -0.98);
  g.add(muzzle);
  // 漂浮細能量粒（圍住槍管轉）
  const orbs = [];
  for (let i = 0; i < 3; i++) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), soul);
    g.add(o);
    orbs.push(o);
  }
  g.userData = { muzzle, mag, glows: [soul], orbs, magRest: mag.position.clone(), aimY: -0.24 };
  g.userData.animate = (t) => orbs.forEach((o, i) => {
    const a = t * 3 + (i * Math.PI * 2) / 3;
    o.position.set(Math.cos(a) * 0.11, 0.03 + Math.sin(a) * 0.11, -0.64 + Math.sin(t * 2 + i) * 0.12);
  });
  return g;
}

// ---------- 🍭 Candy Pistol ----------
function stripeTex() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#ff4fa3';
  for (let i = -64; i < 128; i += 16) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i + 8, 0);
    x.lineTo(i + 8 + 64, 64);
    x.lineTo(i + 64, 64);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function candyPistol() {
  const g = new THREE.Group();
  const pink = M(0xff6ec7, { roughness: 0.3, metalness: 0.1 });
  const white = M(0xfff0fa, { roughness: 0.3, metalness: 0.05 });
  const cane = new THREE.MeshStandardMaterial({ map: stripeTex(), roughness: 0.3 });
  const glow = GLOW(0xff6ec7, 2.4);
  const mint = GLOW(0x7dffd0, 1.6);
  rbox(g, 0.13, 0.15, 0.36, pink, 0, 0.02, -0.08, 0.4);
  // 拐杖糖槍管
  const barrel = cyl(g, 0.045, 0.045, 0.34, cane, 0, 0.04, -0.4);
  barrel.material.map.repeat.set(1, 2);
  ring(g, 0.055, 0.015, glow, 0, 0.04, -0.57);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.04, -0.6);
  g.add(muzzle);
  // 手柄（白色糖果棒）
  const grip = rbox(g, 0.08, 0.2, 0.09, white, 0, -0.13, 0.04, 0.4);
  grip.rotation.x = 0.3;
  // 後面嘅波板糖
  const lolly = new THREE.Group();
  lolly.position.set(0, 0.12, 0.12);
  g.add(lolly);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 20), new THREE.MeshStandardMaterial({ map: stripeTex(), emissive: 0xff3d9a, emissiveIntensity: 0.3 }));
  disc.rotation.z = Math.PI / 2;
  lolly.add(disc);
  // 彈匣 = 透明糖果筒（入面有發光糖）
  const mag = new THREE.Group();
  mag.position.set(0, -0.06, -0.12);
  g.add(mag);
  rbox(mag, 0.07, 0.16, 0.08, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.1 }), 0, -0.08, 0, 0.3);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), i % 2 ? mint : glow);
    s.position.set(0, -0.03 - i * 0.045, 0);
    mag.add(s);
  }
  rbox(g, 0.03, 0.04, 0.03, mint, 0, 0.11, -0.22, 0.3); // 準星
  g.userData = { muzzle, mag, glows: [glow], magRest: mag.position.clone(), lolly, aimY: -0.12 };
  g.userData.animate = (t) => (lolly.rotation.x = t * 2);
  return g;
}

// ---------- 🎯 Spooky Slingshot ----------
function slingshot() {
  const g = new THREE.Group();
  const wood = M(0x5d3a1f, { roughness: 0.8, metalness: 0 });
  const bark = M(0x3e2412, { roughness: 0.9, metalness: 0 });
  const band = GLOW(0xffa726, 2);
  const seed = GLOW(0xffd54f, 2.6);
  // Y 字樹枝（向前企）
  const stem = cyl(g, 0.035, 0.045, 0.3, wood, 0, -0.08, 0);
  stem.rotation.x = 0;
  const forkL = cyl(g, 0.03, 0.035, 0.22, wood, -0.07, 0.15, -0.0);
  forkL.rotation.set(0, 0, 0.4);
  const forkR = cyl(g, 0.03, 0.035, 0.22, wood, 0.07, 0.15, -0.0);
  forkR.rotation.set(0, 0, -0.4);
  for (const s of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), bark);
    knob.position.set(s * 0.13, 0.25, 0);
    g.add(knob);
    // 細南瓜裝飾
  }
  const pumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), GLOW(0xff7a00, 0.8));
  pumpkin.scale.y = 0.8;
  pumpkin.position.set(0, -0.02, 0.03);
  g.add(pumpkin);
  // 橡筋：兩條，由叉頭去皮兜（拉後 = pouch.position.z 變大）
  const pouch = new THREE.Group();
  pouch.position.set(0, 0.24, 0.08);
  g.add(pouch);
  rbox(pouch, 0.07, 0.04, 0.05, bark, 0, 0, 0, 0.3);
  const ammo = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), seed);
  ammo.scale.set(0.8, 0.8, 1.2);
  pouch.add(ammo);
  const bands = [-1, 1].map((s) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), band);
    b.userData.from = new THREE.Vector3(s * 0.13, 0.25, 0);
    g.add(b);
    return b;
  });
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.25, -0.05);
  g.add(muzzle);
  const tmp = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const placeBands = () => bands.forEach((b) => {
    tmp.copy(pouch.position).sub(b.userData.from);
    b.position.copy(b.userData.from).addScaledVector(tmp, 0.5);
    b.scale.y = tmp.length();
    b.quaternion.setFromUnitVectors(up, tmp.normalize());
  });
  placeBands();
  g.userData = { muzzle, mag: pouch, glows: [band, seed], magRest: pouch.position.clone(), pouch, ammo, aimY: -0.25 };
  // pull 0–1：拉後幾多
  g.userData.setPull = (pull) => {
    pouch.position.z = 0.08 + pull * 0.3;
    placeBands();
  };
  return g;
}

const BUILDERS = { soulBlaster, candyPistol, slingshot };
export function buildWeaponModel(id) {
  const g = (BUILDERS[id] || soulBlaster)();
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false; // 手上嘅嘢唔使影（第一身會遮住畫面）
      o.frustumCulled = false;
    }
  });
  return g;
}
