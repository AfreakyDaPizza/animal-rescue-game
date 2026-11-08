// 👼 Isotope Angel（小朋友 Issue #18：Enchanted Kingdom 跳菇上到最高嘅浮島就有，Legendary）
// 方塊（Roblox）風格嘅天使：白色長袍、薄荷綠發光眼、金綠色光環、一對好大嘅羽毛翼（每層羽毛尖發青光）、
// 心口一粒「原子核」（綠色同青色細波波砌成，一閃一閃）、三條電子軌道（斜斜咁圍住成個身轉，每條有粒發光電子）、
// 身邊有細細粒閃光飄上去。輕輕喺半空浮下浮下、慢慢拍翼。
// 全部面向 -z（塊面喺 -z）；回傳 Group：userData.animate(time, moving)、userData.height、userData.move = 'fly'
// 發光物料 emissiveIntensity > 1 → 有 Bloom

import * as THREE from 'three';
import { box, pivot } from './modelKit.js';

const PI = Math.PI;
const glowMat = (color, k = 1.4, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.3, ...extra });
const ROBE = 0xf4fbff;
const ROBE2 = 0xd9f2f7;
const SKIN = 0xfff3e6;
const GOLD = 0xffe082;

function mesh(parent, geo, m, x, y, z) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  parent.add(o);
  return o;
}

// 一隻翼：好似扇咁打開嘅三層羽毛（前面短、後面長），每條羽毛尖發青光；s = -1 左、1 右
// 每條羽毛係一條扁方塊，由翼根向外射出去（角度由斜上到斜下）
function wing(parent, s, tipMat) {
  const w = pivot(parent, s * 0.26, 1.7, 0.26);
  const layers = [
    { n: 5, from: 62, to: 5, len: (k) => 0.55 + k * 0.08, z: -0.02, c: ROBE, wd: 0.2 }, // 前面細羽毛
    { n: 6, from: 58, to: -25, len: (k) => 0.95 + Math.sin(k * PI) * 0.25, z: 0.03, c: 0xeaf7fb, wd: 0.18 },
    { n: 7, from: 52, to: -48, len: (k) => 1.3 + Math.sin(k * PI) * 0.45, z: 0.08, c: ROBE2, wd: 0.17 }, // 後面長羽毛
  ];
  for (const L of layers) {
    for (let i = 0; i < L.n; i++) {
      const k = i / (L.n - 1);
      const th = ((L.from + (L.to - L.from) * k) * PI) / 180;
      const len = L.len(k);
      const f = box(w, len, L.wd, 0.07, L.c, s * Math.cos(th) * (len / 2 + 0.08), Math.sin(th) * (len / 2 + 0.08), L.z, 0.45);
      f.rotation.z = s * th;
      // 羽毛尖：發光
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.18, L.wd * 0.85, 0.08), tipMat);
      tip.position.set(s * (len / 2 - 0.06), 0, 0.006);
      f.add(tip);
    }
  }
  return { w, s };
}

export function buildIsotopeAngel() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const cyan = glowMat(0x18ffff, 1.6);
  const mint = glowMat(0x69f0ae, 1.5);
  const halo = glowMat(0xccff90, 2.2, { metalness: 0.4 });
  const tipMat = glowMat(0x64ffda, 1.3);
  const nucleusA = glowMat(0x76ff03, 1.8);
  const nucleusB = glowMat(0x00e5ff, 1.8);

  // ---- 身（長袍）----
  const body = pivot(root, 0, 0, 0);
  box(body, 0.62, 0.7, 0.42, ROBE, 0, 1.5, 0); // 心口
  box(body, 0.74, 0.5, 0.5, ROBE2, 0, 1.0, 0); // 腰下長袍
  box(body, 0.86, 0.42, 0.58, ROBE, 0, 0.6, 0); // 長袍尾（闊啲）
  box(body, 0.9, 0.08, 0.62, GOLD, 0, 0.4, 0, 0.3, { metalness: 0.6, roughness: 0.3 }); // 金邊
  box(body, 0.66, 0.08, 0.46, GOLD, 0, 1.2, 0, 0.3, { metalness: 0.6, roughness: 0.3 }); // 金腰帶
  // 長袍上面發光嘅薄荷綠條紋（同位素光）
  for (const [w, y, d] of [[0.92, 0.48, 0.64], [0.78, 0.86, 0.54]]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), mint);
    band.position.y = y;
    body.add(band);
  }
  // 長袍下面淡淡青光（好似浮喺光上面）
  const under = mesh(body, new THREE.CylinderGeometry(0.34, 0.02, 0.35, 8), cyan, 0, 0.22, 0);
  under.material = glowMat(0x18ffff, 1.2, { transparent: true, opacity: 0.7 });

  // 心口嘅原子核：一嚿細波波（質子綠、中子青）
  const nucleus = pivot(body, 0, 1.55, -0.24);
  const ball = new THREE.SphereGeometry(0.07, 10, 8);
  const NUC = [[0, 0, 0], [0.08, 0.04, 0], [-0.07, 0.05, 0.02], [0.02, -0.08, 0.02], [-0.04, -0.04, -0.06], [0.05, 0.02, -0.07], [-0.02, 0.09, -0.04]];
  NUC.forEach(([x, y, z], i) => mesh(nucleus, ball, i % 2 ? nucleusB : nucleusA, x, y, z));
  // 原子核外面一個細光圈
  const core = mesh(nucleus, new THREE.TorusGeometry(0.17, 0.02, 6, 20), cyan, 0, 0, 0);

  // ---- 手 ----
  const arms = [-1, 1].map((s) => {
    const a = pivot(body, s * 0.38, 1.78, 0);
    box(a, 0.2, 0.62, 0.22, ROBE, 0, -0.28, 0);
    box(a, 0.22, 0.12, 0.24, GOLD, 0, -0.55, 0, 0.3, { metalness: 0.6 });
    box(a, 0.16, 0.16, 0.16, SKIN, 0, -0.66, 0);
    a.rotation.z = s * 0.25;
    return { a, s };
  });

  // ---- 頭 ----
  const head = pivot(root, 0, 1.88, 0);
  box(head, 0.5, 0.5, 0.48, SKIN, 0, 0.25, 0);
  // 頭髮（淺金色，一嚿嚿）
  box(head, 0.56, 0.16, 0.54, 0xfff59d, 0, 0.5, 0.02);
  box(head, 0.56, 0.34, 0.14, 0xfff59d, 0, 0.36, 0.22);
  for (const s of [-1, 1]) box(head, 0.12, 0.3, 0.42, 0xfff59d, s * 0.27, 0.34, 0.04);
  // 眼：發薄荷綠光
  for (const s of [-1, 1]) {
    const e = mesh(head, new THREE.BoxGeometry(0.1, 0.13, 0.04), mint, s * 0.12, 0.26, -0.25);
    e.castShadow = false;
    mesh(head, new THREE.BoxGeometry(0.035, 0.035, 0.02), glowMat(0xffffff, 2), s * 0.12 + 0.02, 0.3, -0.272).castShadow = false; // 眼神光
    mesh(head, new THREE.BoxGeometry(0.09, 0.05, 0.02), glowMat(0xff8a80, 0.5, { transparent: true, opacity: 0.7 }), s * 0.18, 0.15, -0.248).castShadow = false; // 面紅紅
  }
  mesh(head, new THREE.BoxGeometry(0.12, 0.03, 0.02), new THREE.MeshStandardMaterial({ color: 0xd84315 }), 0, 0.12, -0.248).castShadow = false; // 笑
  // 光環
  const haloP = pivot(head, 0, 0.78, 0);
  const ring = mesh(haloP, new THREE.TorusGeometry(0.34, 0.055, 8, 28), halo, 0, 0, 0);
  ring.rotation.x = PI / 2;
  ring.castShadow = false;
  // 光環上面細細粒「同位素」光點
  const haloDots = [];
  for (let i = 0; i < 6; i++) {
    const d = mesh(haloP, new THREE.OctahedronGeometry(0.05), i % 2 ? cyan : mint, 0, 0, 0);
    d.castShadow = false;
    haloDots.push(d);
  }

  // ---- 翼 ----
  const wings = [-1, 1].map((s) => wing(body, s, tipMat));

  // ---- 電子軌道：三條斜嘅光圈，每條一粒電子 ----
  const orbit = pivot(root, 0, 1.3, 0);
  const ringMat = glowMat(0x84ffff, 1.6, { transparent: true, opacity: 0.8, depthWrite: false });
  const electronGeo = new THREE.SphereGeometry(0.12, 10, 8);
  const orbits = [0, 1, 2].map((i) => {
    const p = pivot(orbit, 0, 0, 0);
    p.rotation.set(PI / 2 + (i - 1) * 0.95, i * 1.05, 0);
    const r = mesh(p, new THREE.TorusGeometry(1.05, 0.03, 6, 48), ringMat, 0, 0, 0);
    r.castShadow = false;
    r.userData.noSaddle = true;
    const e = mesh(p, electronGeo, i === 1 ? nucleusA : nucleusB, 1.05, 0, 0);
    e.castShadow = false;
    e.userData.noSaddle = true;
    return { p, e, speed: 1.6 + i * 0.5, ph: i * 2.1 };
  });

  // ---- 閃光（細細粒飄上去）----
  const N = 26;
  const pos = new Float32Array(N * 3);
  const seeds = Array.from({ length: N }, (_, i) => ({ a: (i / N) * PI * 2, r: 0.5 + ((i * 37) % 10) / 14, k: ((i * 53) % 100) / 100 }));
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparkles = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0xb9f6ca, size: 0.09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparkles.frustumCulled = false;
  sparkles.userData.noSaddle = true;
  root.add(sparkles);

  const FLY_Y = 0.55;
  g.userData.animate = (t, moving = 0) => {
    root.position.y = FLY_Y + Math.sin(t * 1.8) * 0.12;
    body.rotation.x = 0.05 * moving + Math.sin(t * 1.8) * 0.03;
    // 拍翼：慢慢、大大下
    const flap = Math.sin(t * (3 + moving * 2));
    wings.forEach(({ w, s }) => {
      w.rotation.y = s * (-0.25 + flap * 0.4); // 向後收、向前拍
      w.rotation.z = s * flap * 0.15;
    });
    arms.forEach(({ a, s }) => (a.rotation.z = s * (0.25 + Math.sin(t * 1.8 + 1) * 0.08)));
    head.rotation.y = Math.sin(t * 0.7) * 0.25;
    haloP.position.y = 0.78 + Math.sin(t * 2.2) * 0.04;
    ring.rotation.z = t * 0.8;
    haloDots.forEach((d, i) => {
      const a = t * 1.5 + (i / haloDots.length) * PI * 2;
      d.position.set(Math.cos(a) * 0.34, Math.sin(t * 3 + i) * 0.03, Math.sin(a) * 0.3);
      d.rotation.y = t * 3;
    });
    halo.emissiveIntensity = 2 + Math.sin(t * 3) * 0.5;
    // 原子核一閃一閃 + 慢慢轉
    nucleus.rotation.y = t * 1.2;
    nucleus.rotation.x = t * 0.7;
    nucleusA.emissiveIntensity = 1.6 + Math.sin(t * 4) * 0.6;
    nucleusB.emissiveIntensity = 1.6 + Math.cos(t * 4) * 0.6;
    core.rotation.y = -t * 2;
    // 電子沿住軌道轉
    orbit.rotation.y = t * 0.3;
    for (const o of orbits) {
      const a = t * o.speed + o.ph;
      o.e.position.set(Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0);
    }
    tipMat.emissiveIntensity = 1.1 + Math.sin(t * 2.5) * 0.4;
    for (let i = 0; i < N; i++) {
      const s = seeds[i];
      const k = (s.k + t * 0.25) % 1;
      pos[i * 3] = Math.cos(s.a + t * 0.4) * s.r;
      pos[i * 3 + 1] = 0.2 + k * 2.4;
      pos[i * 3 + 2] = Math.sin(s.a + t * 0.4) * s.r;
    }
    pgeo.attributes.position.needsUpdate = true;
  };
  g.userData.animate(0, 0);
  g.userData.move = 'fly';
  g.userData.flying = true;
  g.userData.height = FLY_Y + 2.9;
  return g;
}
