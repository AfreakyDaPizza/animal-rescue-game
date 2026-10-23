// Lv16 Prehistoric Age（Issue #14 小朋友 2026-10-23：「change astral kings kingdom into prehistoric age」）
// 跑步機／學生桌共用（本來係 Astral King's Kingdom，等級、x6 加成全部照舊，淨係換外觀）：
// 化石石頭機身、冒煙嘅細火山、蕨類、巨型菇、蘇鐵、恐龍骨（肋骨 + 頭骨）、發光琥珀、石圍欄、
// 恐龍腳印、一窩恐龍蛋（會郁）、頭頂幾隻翼龍剪影圍住飛
// 用法（hub.js）：buildPrehistoric(make('prehistoric'))；animateExtras 入面 animatePrehistoric(group, time)
// 機身紋理：prehistoricTexture()（applyTier 用）

import * as THREE from 'three';

const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const glowMat = (color, intensity = 2) => M(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.3 });

function add(group, geometry, material, x, y, z, shadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  group.add(mesh);
  return mesh;
}

// ---- 機身紋理：啡色石頭 + 一層層岩層 + 白色化石骨 + 幾點琥珀 ----
let tex = null;
export function prehistoricTexture() {
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  let r = 7;
  const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  ctx.fillStyle = '#6b4f36';
  ctx.fillRect(0, 0, 256, 256);
  // 岩層（橫間）
  for (let y = 0; y < 256; y += 18 + Math.floor(rand() * 14)) {
    ctx.fillStyle = ['#7d5d40', '#5a4230', '#8a6a4a', '#634832'][Math.floor(rand() * 4)];
    ctx.fillRect(0, y, 256, 8 + rand() * 8);
  }
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(${30 + rand() * 40},${20 + rand() * 30},${10 + rand() * 20},0.35)`;
    ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 6, 2 + rand() * 4);
  }
  // 化石：魚骨 + 螺殼
  ctx.strokeStyle = '#efe3c8';
  ctx.lineWidth = 3;
  for (const [x, y] of [[60, 70], [180, 190]]) {
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(x + 30, y);
    for (let k = -24; k <= 24; k += 8) {
      ctx.moveTo(x + k, y - 12);
      ctx.lineTo(x + k + 4, y + 12);
    }
    ctx.stroke();
  }
  for (const [x, y] of [[190, 60], [70, 190]]) {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 6; a += 0.2) ctx.lineTo(x + Math.cos(a) * a * 2.2, y + Math.sin(a) * a * 2.2);
    ctx.stroke();
  }
  // 琥珀點（發光）
  for (let i = 0; i < 6; i++) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 7);
    g.addColorStop(0, '#ffe082');
    g.addColorStop(1, 'rgba(255,143,0,0)');
    ctx.save();
    ctx.translate(rand() * 256, rand() * 256);
    ctx.fillStyle = g;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// 一棵蕨：一條條彎彎嘅葉向外散開
function fern(group, mat, x, z, size = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  group.add(g);
  const frondGeo = new THREE.BoxGeometry(0.2, 0.03, 1.5);
  frondGeo.translate(0, 0, 0.75);
  for (let i = 0; i < 9; i++) {
    const f = add(g, frondGeo, mat, 0, 0.12, 0);
    f.rotation.set(-0.55 - (i % 3) * 0.2, (i / 9) * Math.PI * 2, 0);
    f.scale.setScalar(size * (0.8 + (i % 2) * 0.3));
  }
  return g;
}

// 巨型菇：粗莖 + 大圓帽 + 白點
function mushroom(group, x, z, h, capColor) {
  add(group, new THREE.CylinderGeometry(0.16, 0.24, h, 8), M(0xf5ecd7), x, h / 2, z);
  const cap = add(group, new THREE.SphereGeometry(0.75, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(capColor, { roughness: 0.5 }), x, h - 0.05, z);
  cap.scale.y = 0.65;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(group, new THREE.SphereGeometry(0.09, 8, 6), M(0xffffff), x + Math.cos(a) * 0.45, h + 0.22, z + Math.sin(a) * 0.45, false);
  }
}

// 蘇鐵：一節節嘅樹身 + 頂上一圈長葉
function cycad(group, x, z, h, leafMat) {
  const trunk = M(0x6d4c41);
  for (let k = 0; k < 6; k++) add(group, new THREE.CylinderGeometry(0.26 - k * 0.012, 0.3 - k * 0.012, h / 6, 7), k % 2 ? trunk : M(0x5d4037), x, (k + 0.5) * (h / 6), z);
  const leafGeo = new THREE.BoxGeometry(0.22, 0.03, 1.5);
  leafGeo.translate(0, 0, 0.75);
  const leaves = [];
  for (let i = 0; i < 10; i++) {
    const l = add(group, leafGeo, leafMat, x, h, z);
    l.rotation.set(-0.35 - (i % 2) * 0.25, (i / 10) * Math.PI * 2, 0);
    leaves.push(l);
  }
  return leaves;
}

// 一條骨（兩頭圓圓）
function bone(group, mat, x, y, z, len, rotY = 0, rotZ = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.set(0, rotY, rotZ);
  group.add(g);
  add(g, new THREE.CylinderGeometry(0.06, 0.06, len, 6), mat, 0, 0, 0).rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) for (const d of [-1, 1]) add(g, new THREE.SphereGeometry(0.08, 8, 6), mat, s * len / 2, 0, d * 0.05);
  return g;
}

// 翼龍剪影（黑色扁身 + 兩隻會拍嘅三角翼 + 尖頭冠）
function pterodactyl(mat) {
  const g = new THREE.Group();
  const body = add(g, new THREE.BoxGeometry(0.16, 0.12, 0.8), mat, 0, 0, 0, false);
  body.scale.z = 1;
  const head = add(g, new THREE.ConeGeometry(0.08, 0.6, 4), mat, 0, 0.04, -0.6, false);
  head.rotation.x = -Math.PI / 2;
  add(g, new THREE.ConeGeometry(0.05, 0.4, 4), mat, 0, 0.12, -0.25, false).rotation.x = Math.PI / 2 + 0.4; // 頭冠
  const wings = [-1, 1].map((s) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.25);
    shape.lineTo(s * 1.3, -0.05);
    shape.lineTo(0, -0.35);
    shape.closePath();
    const w = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    w.rotation.x = -Math.PI / 2;
    const pivot = new THREE.Group();
    pivot.add(w);
    g.add(pivot);
    return { pivot, s };
  });
  g.userData.wings = wings;
  return g;
}

export function buildPrehistoric(group) {
  const stone = M(0x8d7b68, { flatShading: true, roughness: 0.95 });
  const stone2 = M(0x6f6152, { flatShading: true, roughness: 0.95 });
  const boneMat = M(0xefe3c8, { roughness: 0.6 });
  const fernMat = M(0x2e7d32, { side: THREE.DoubleSide });
  const fernMat2 = M(0x558b2f, { side: THREE.DoubleSide });
  const lava = glowMat(0xff6d00, 2.4);
  const amber = new THREE.MeshStandardMaterial({ color: 0xffb300, emissive: 0xff8f00, emissiveIntensity: 1.6, transparent: true, opacity: 0.85, roughness: 0.15 });

  // 1. 細火山（後面左手邊）：石錐 + 發光火山口 + 熔岩流 + 煙
  const volcano = new THREE.Group();
  volcano.position.set(-3.7, 0, -3.3);
  group.add(volcano);
  add(volcano, new THREE.CylinderGeometry(0.45, 1.7, 3.6, 9, 3), M(0x4e3b31, { flatShading: true, roughness: 0.95 }), 0, 1.8, 0);
  const crater = add(volcano, new THREE.CylinderGeometry(0.42, 0.42, 0.08, 12), lava, 0, 3.62, 0, false);
  for (const a of [0.4, 2.2, 4.4]) {
    const flow = add(volcano, new THREE.BoxGeometry(0.16, 2.2, 0.06), lava, Math.cos(a) * 0.95, 2.35, Math.sin(a) * 0.95, false);
    flow.lookAt(Math.cos(a) * 3, 2.35, Math.sin(a) * 3);
    flow.rotateX(-0.42); // 貼住山坡
  }
  const smokeMat = M(0x9e9e9e, { transparent: true, opacity: 0.6 });
  const smoke = [0, 1, 2, 3, 4].map((i) => {
    const s = add(volcano, new THREE.DodecahedronGeometry(0.3, 0), smokeMat.clone(), 0, 3.8, 0, false);
    return { s, phase: i / 5 };
  });
  const sparkMat = glowMat(0xffab40, 3);
  const sparks = [0, 1, 2, 3, 4, 5].map((i) => ({ m: add(volcano, new THREE.BoxGeometry(0.09, 0.09, 0.09), sparkMat, 0, 3.7, 0, false), phase: i / 6, a: i * 1.05 }));

  // 2. 石圍欄（兩邊）：一嚿嚿石 + 中間矮石牆
  const fenceStones = [];
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) fenceStones.push([s * 2.85, -2.2 + k * 0.95, k]);
  fenceStones.forEach(([x, z, k]) => {
    const post = add(group, new THREE.DodecahedronGeometry(0.32, 0), k % 2 ? stone : stone2, x, 0.4, z);
    post.scale.set(0.9, 1.4, 0.9);
    post.rotation.set(k, k * 0.7, 0);
    if (k < 5) add(group, new THREE.BoxGeometry(0.3, 0.35, 0.7), stone2, x, 0.2, z + 0.47).rotation.y = (k % 2) * 0.1;
  });

  // 3. 蕨類（周圍）
  [[-2.9, 2.9, 1.1], [2.9, 2.9, 1.2], [-2.4, -3.0, 0.9], [3.4, -1.0, 1.0], [-3.3, 0.9, 0.8], [1.2, 3.3, 0.8]].forEach(([x, z, sz], i) => fern(group, i % 2 ? fernMat : fernMat2, x, z, sz));

  // 4. 巨型菇（後面右手邊）+ 蘇鐵（前面右角）
  mushroom(group, 3.5, -3.0, 2.0, 0xd84315);
  mushroom(group, 2.7, -3.7, 1.3, 0xff8a65);
  mushroom(group, 4.1, -2.0, 0.9, 0xbf360c);
  const cycadLeaves = cycad(group, 3.6, 2.6, 2.4, fernMat2);

  // 5. 恐龍骨：左邊一副肋骨（一條條彎骨）+ 前面一個頭骨
  const ribs = new THREE.Group();
  ribs.position.set(-3.4, 0, 2.2);
  group.add(ribs);
  add(ribs, new THREE.CylinderGeometry(0.09, 0.09, 2.2, 6), boneMat, 0, 0.12, 0).rotation.x = Math.PI / 2; // 脊骨
  for (let k = 0; k < 5; k++) {
    const rib = add(ribs, new THREE.TorusGeometry(0.55 - Math.abs(k - 2) * 0.06, 0.05, 6, 16, Math.PI), boneMat, 0, 0.1, -0.85 + k * 0.42);
    rib.rotation.y = 0;
  }
  const skull = new THREE.Group();
  skull.position.set(-2.6, 0, -2.9);
  skull.rotation.y = 0.6;
  group.add(skull);
  add(skull, new THREE.BoxGeometry(0.6, 0.45, 0.7), boneMat, 0, 0.25, 0);
  add(skull, new THREE.BoxGeometry(0.4, 0.25, 0.6), boneMat, 0, 0.18, -0.6);
  for (const s of [-1, 1]) add(skull, new THREE.SphereGeometry(0.09, 8, 6), M(0x3e2723), s * 0.18, 0.36, -0.3); // 眼窿
  for (let t = 0; t < 4; t++) add(skull, new THREE.ConeGeometry(0.04, 0.14, 4), boneMat, -0.14 + t * 0.09, 0.02, -0.82).rotation.x = Math.PI;
  bone(group, boneMat, 1.9, 0.08, 3.4, 0.9, 0.5);
  bone(group, boneMat, -1.5, 0.08, 3.5, 0.7, -0.8);

  // 6. 琥珀（石頭上面，入面有隻細蚊）
  const ambers = [];
  [[-3.1, -1.2], [3.2, 0.6], [-1.9, -3.4], [2.3, 3.5]].forEach(([x, z], i) => {
    add(group, new THREE.DodecahedronGeometry(0.4, 0), stone2, x, 0.25, z);
    const a = add(group, new THREE.DodecahedronGeometry(0.3, 0), amber, x, 0.75, z, false);
    a.scale.y = 1.4;
    add(group, new THREE.BoxGeometry(0.06, 0.03, 0.08), M(0x212121), x, 0.75, z, false); // 蚊
    ambers.push({ a, i });
  });

  // 7. 恐龍蛋窩（前面左邊）：草窩 + 三隻斑點蛋（會郁）
  const nest = new THREE.Group();
  nest.position.set(-2.2, 0, 3.4);
  group.add(nest);
  const ring = add(nest, new THREE.TorusGeometry(0.5, 0.14, 6, 16), M(0xa1887f), 0, 0.1, 0);
  ring.rotation.x = Math.PI / 2;
  const eggMat = M(0xe8f5e9, { roughness: 0.5 });
  const spotMat = M(0x8d6e63);
  const eggs = [[0, 0], [0.26, 0.18], [-0.24, 0.16]].map(([x, z], i) => {
    const e = new THREE.Group();
    e.position.set(x, 0.25, z);
    nest.add(e);
    const shell = add(e, new THREE.SphereGeometry(0.2, 12, 10), eggMat, 0, 0, 0);
    shell.scale.y = 1.35;
    for (let k = 0; k < 4; k++) add(e, new THREE.SphereGeometry(0.04, 6, 4), spotMat, Math.cos(k * 1.6) * 0.18, (k % 3 - 1) * 0.12, Math.sin(k * 1.6) * 0.18, false);
    return { e, i };
  });

  // 8. 恐龍腳印（三隻腳趾），由後面行到前面
  const printMat = new THREE.MeshBasicMaterial({ color: 0x3e2723, transparent: true, opacity: 0.55, depthWrite: false });
  for (let k = 0; k < 6; k++) {
    const p = new THREE.Group();
    p.position.set(k % 2 ? 2.3 : 2.0, 0.07, -2.6 + k * 1.05);
    group.add(p);
    const heel = add(p, new THREE.CircleGeometry(0.15, 10), printMat, 0, 0, 0.05, false);
    heel.rotation.x = -Math.PI / 2;
    for (const a of [-0.45, 0, 0.45]) {
      const toe = add(p, new THREE.PlaneGeometry(0.08, 0.32), printMat, Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2 + 0.02, false);
      toe.rotation.set(-Math.PI / 2, 0, -a);
    }
  }

  // 9. 翼龍剪影：頭頂圍住飛
  const ptMat = new THREE.MeshBasicMaterial({ color: 0x2b1d14, side: THREE.DoubleSide });
  const pteros = [0, 1, 2].map((i) => {
    const p = pterodactyl(ptMat);
    p.scale.setScalar(0.9 - i * 0.15);
    group.add(p);
    return { p, i };
  });

  group.userData = { crater, smoke, sparks, ambers, eggs, pteros, cycadLeaves };
}

export function animatePrehistoric(group, time) {
  const u = group.userData;
  u.crater.material.emissiveIntensity = 2 + Math.sin(time * 4) * 0.8;
  for (const { s, phase } of u.smoke) {
    const k = (time * 0.35 + phase) % 1;
    s.position.set(Math.sin(k * 5 + phase * 9) * 0.3, 3.8 + k * 2.6, Math.cos(k * 4) * 0.2);
    s.scale.setScalar(0.6 + k * 1.8);
    s.material.opacity = 0.55 * (1 - k);
  }
  for (const sp of u.sparks) {
    const k = (time * 0.8 + sp.phase) % 1;
    sp.m.position.set(Math.cos(sp.a) * k * 0.9, 3.7 + Math.sin(k * Math.PI) * 1.4, Math.sin(sp.a) * k * 0.9);
    sp.m.visible = k < 0.95;
  }
  for (const { a, i } of u.ambers) {
    a.material.emissiveIntensity = 1.3 + Math.sin(time * 2 + i) * 0.5;
    a.rotation.y = time * 0.6 + i;
  }
  // 蛋：間中搖吓（好似就快爆殼）
  for (const { e, i } of u.eggs) {
    const shake = Math.max(0, Math.sin(time * 1.3 + i * 2.1)) ** 8;
    e.rotation.z = Math.sin(time * 25 + i) * 0.25 * shake;
  }
  u.cycadLeaves.forEach((l, i) => (l.rotation.z = Math.sin(time * 1.2 + i) * 0.06));
  // 翼龍：喺頭頂大圈飛，翼一拍一拍
  for (const { p, i } of u.pteros) {
    const a = time * (0.35 + i * 0.08) + i * 2.1;
    const r = 3.6 + i * 0.8;
    p.position.set(Math.cos(a) * r, 6.2 + i * 0.7 + Math.sin(time * 1.5 + i) * 0.3, Math.sin(a) * r);
    p.rotation.set(0, Math.PI - a, Math.sin(time * 1.5 + i) * 0.15); // 頭（本地 -z）向住飛嘅方向
    const flap = Math.sin(time * 6 + i) * 0.5;
    for (const { pivot, s } of p.userData.wings) pivot.rotation.z = s * flap;
  }
}
