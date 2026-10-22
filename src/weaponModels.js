// 🔫 魔法武器嘅 3D 模型（Issue #11，Issue #12 重畫：「啲槍好樣衰」→ 玩具科幻款）
// Soul Blaster、Candy Pistol、Spooky Slingshot：全部係科幻／魔法款（發光靈魂能量、糖果），唔係真槍
// 風格：Roblox／Fortnite 咁嘅玩具科幻：大大嚿、一層層圓角板、金屬 + 彩色飾邊、發光能量管（會一閃一閃，配合 Bloom）
// 每個模型：槍管向 -z，手柄喺原點附近；長度大約 1（掛上鏡頭時再縮細）
//
// userData（weapons.js 會用）：
//   muzzle   槍嘴（閃光／子彈由度出）     mag     換彈時郁嘅部分      magRest  mag 本來位置
//   glows    發光材質（射嘢時閃一下）       aimY    開鏡時槍要擺幾低（令準星／瞄準鏡喺畫面正中）
//   animate(t)   每格叫（t = 秒）：能量管閃、粒子轉
//   （Issue #12 新加，全部可以冇）
//   fire()       射咗一下：槍身部件向後彈、能量管閃
//   reload(k)    換彈動畫（k 0–1，0 = 冇換緊）：彈匣／能量罐飛出去再塞返入去
//   eject        彈殼位（射嘢時噴出細能量粒）   shell = { colors, size, sprinkle }：噴乜嘢（sprinkle = 糖碎）
//   tracer       彈道樣：{ width 粗幼, length 光長（米）, head 光頭大細, speed 米/秒 }
//   flashScale   槍嘴閃光大細（1 = 正常）
//   hip / adsZ   第一身腰射位置／開鏡時槍離鏡頭幾遠（瞄準鏡要貼近眼）
//   Slingshot：pouch（皮兜）、ammo（皮兜入面嘅南瓜籽）、setPull(0–1)

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// ---------- 材質 ----------
const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.3, ...extra });
const METAL = (color, extra = {}) => M(color, { metalness: 0.8, roughness: 0.28, ...extra });
const GLOW = (color, k = 2.2, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.3, ...extra });
// 玻璃（透明，入面嘅發光芯透出嚟）
const GLASS = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.1, emissive: color, emissiveIntensity: 0.25, depthWrite: false, ...extra });

// ---------- 砌模型小工具 ----------
function rbox(parent, w, h, d, mat, x = 0, y = 0, z = 0, r = 0.25) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * r), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
// 圓柱（打橫，沿 z）
function cyl(parent, r1, r2, h, mat, x = 0, y = 0, z = 0, seg = 16, open = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg, 1, open), mat);
  m.position.set(x, y, z);
  m.rotation.x = Math.PI / 2;
  parent.add(m);
  return m;
}
// 圓柱（企直，沿 y）
function vcyl(parent, r1, r2, h, mat, x = 0, y = 0, z = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
// 圈（面向 z）
function ring(parent, r, tube, mat, x, y, z, seg = 28) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, seg), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function ball(parent, r, mat, x, y, z, seg = 12) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 4)), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
// 螺旋（圍住 z 軸轉）：發光能量絲、糖果螺紋
function helix(parent, r, len, turns, tube, mat, x = 0, y = 0, z = 0) {
  const pts = [];
  const n = Math.ceil(turns * 16);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, (i / n - 0.5) * len));
  }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, tube, 6, false), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
// 彎彎曲曲嘅樹枝（粗幼由 r0 變 r1，再加啲凹凸）
function branch(parent, points, r0, r1, mat, bumpy = 0.18, seed = 1) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const tub = 24;
  const rad = 9;
  const geo = new THREE.TubeGeometry(curve, tub, 1, rad, false);
  const pos = geo.attributes.position;
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= tub; i++) {
    const t = i / tub;
    curve.getPointAt(t, c);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c);
      const jj = j % rad;
      const n = 1 + bumpy * (Math.sin(t * 17 + seed * 3.1 + jj * 1.3) * 0.6 + Math.sin(t * 41 + jj * 2.7 + seed) * 0.4);
      v.multiplyScalar(THREE.MathUtils.lerp(r0, r1, t) * n).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  parent.add(m);
  return m;
}
const ease = (k) => k * k * (3 - 2 * k);
const clamp01 = (k) => Math.min(1, Math.max(0, k));

// ---------- 貼圖（canvas 畫，全部共用）----------
const texCache = {};
function canvasTex(key, w, h, draw, repeat = false) {
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache[key] = t;
  return t;
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
// 星形閃光（槍嘴閃）：8 條尖光（長短夾雜）+ 中間一嚿白
const starTexture = () => canvasTex('star', 128, 128, (g) => {
  g.translate(64, 64);
  for (let i = 0; i < 8; i++) {
    g.rotate(Math.PI / 4);
    const L = i % 2 ? 40 : 62;
    const gr = g.createLinearGradient(0, 0, L, 0);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, -8);
    g.lineTo(L, 0);
    g.lineTo(0, 8);
    g.fill();
  }
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 30);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(-64, -64, 128, 128);
});
// 能量圈（槍嘴向外擴散嘅衝擊波）
const ringTexture = () => canvasTex('ring', 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 34, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.55, 'rgba(255,255,255,1)');
  gr.addColorStop(0.7, 'rgba(255,255,255,0.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
});
// 向前噴嘅火舌（側面望到）
const flameTexture = () => canvasTex('flame', 64, 128, (g) => {
  const gr = g.createLinearGradient(0, 128, 0, 0);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(10, 128);
  g.quadraticCurveTo(0, 50, 32, 0);
  g.quadraticCurveTo(64, 50, 54, 128);
  g.fill();
});
// 拐杖糖斜紋（粉紅 + 白 + 薄荷）
const stripeTex = () => canvasTex('stripe', 64, 64, (x) => {
  x.fillStyle = '#fff6fb';
  x.fillRect(0, 0, 64, 64);
  const band = (col, off, w) => {
    x.fillStyle = col;
    for (let i = -64; i < 128; i += 32) {
      x.beginPath();
      x.moveTo(i + off, 0);
      x.lineTo(i + off + w, 0);
      x.lineTo(i + off + w + 64, 64);
      x.lineTo(i + off + 64, 64);
      x.fill();
    }
  };
  band('#ff3f9a', 0, 12);
  band('#7dffd0', 18, 4);
}, true);
// 波板糖螺旋
const swirlTex = () => canvasTex('swirl', 128, 128, (g) => {
  g.fillStyle = '#fff4fa';
  g.fillRect(0, 0, 128, 128);
  g.translate(64, 64);
  const cols = ['#ff3f9a', '#ffd54f', '#7dffd0', '#b388ff'];
  for (let arm = 0; arm < 4; arm++) {
    g.fillStyle = cols[arm];
    g.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const a = t * Math.PI * 3.2 + (arm * Math.PI) / 2;
      const r = t * 64;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    for (let i = 60; i >= 0; i--) {
      const t = i / 60;
      const a = t * Math.PI * 3.2 + (arm * Math.PI) / 2 + 0.55;
      const r = t * 64;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.fill();
  }
  g.strokeStyle = '#ff3f9a';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(0, 0, 61, 0, Math.PI * 2);
  g.stroke();
});
// 發光符文（Slingshot）：透明底，白色線（emissiveMap 染色）
const runeTex = () => canvasTex('rune', 256, 64, (g) => {
  g.clearRect(0, 0, 256, 64);
  g.strokeStyle = '#fff';
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const glyphs = [
    [[0, 0, 0, 1], [0, 0.3, 0.6, 0], [0, 0.6, 0.6, 0.3]],
    [[0.3, 0, 0.3, 1], [0, 0.25, 0.3, 0.5, 0.6, 0.25]],
    [[0, 1, 0.3, 0, 0.6, 1], [0.12, 0.6, 0.48, 0.6]],
    [[0, 0, 0.6, 1], [0.6, 0, 0, 1], [0.3, 0, 0.3, 0.3]],
    [[0, 0.5, 0.3, 0, 0.6, 0.5, 0.3, 1, 0, 0.5]],
    [[0.3, 0, 0.3, 1], [0, 0.4, 0.3, 0.15, 0.6, 0.4]],
  ];
  glyphs.forEach((gl, i) => {
    const ox = 12 + i * 42;
    for (const line of gl) {
      g.beginPath();
      for (let p = 0; p < line.length; p += 2) g.lineTo(ox + line[p] * 30, 12 + line[p + 1] * 40);
      g.stroke();
    }
  });
}, true);
// 皮兜皮紋
const leatherTex = () => canvasTex('leather', 64, 64, (g) => {
  g.fillStyle = '#5a3420';
  g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`;
    g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  }
  g.strokeStyle = '#ffb74d';
  g.setLineDash([5, 4]);
  g.lineWidth = 3;
  g.strokeRect(5, 5, 54, 54);
});

// ---------- 💥 槍嘴閃光：能量爆 + 擴散光圈 + 向前火舌；flash.userData.show(k) 0–1 ----------
export function muzzleFlash(color) {
  const g = new THREE.Group();
  const add = (map, w, h) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    m.frustumCulled = false;
    g.add(m);
    return m;
  };
  const star = add(starTexture(), 1, 1);
  const core = add(glowTexture(), 1, 1);
  core.material.color = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.6); // 中間近白色
  const halo = add(glowTexture(), 1, 1);
  const shock = add(ringTexture(), 1, 1); // 衝擊波圈
  shock.position.z = -0.25;
  // 兩塊交叉嘅火舌（由側面、上面望都見到）
  const jets = [0, Math.PI / 2].map((rz) => {
    const j = add(flameTexture(), 0.55, 1.8);
    j.rotation.set(-Math.PI / 2, 0, 0);
    j.rotation.order = 'ZXY';
    j.rotation.z = rz;
    j.position.z = -0.75;
    return j;
  });
  g.visible = false;
  let last = 0;
  g.userData.show = (k) => {
    g.visible = k > 0.01;
    if (!g.visible) return (last = 0);
    if (k > last + 0.3) star.rotation.z = Math.random() * Math.PI; // 新一槍：轉個角度
    last = k;
    const out = 1 - k; // 0 → 1：光圈越擴越大
    star.scale.setScalar(0.55 + k * 0.7);
    star.material.opacity = k;
    core.scale.setScalar(0.45 + k * 0.35);
    core.material.opacity = Math.min(1, k * 1.4);
    halo.scale.setScalar(1.3 + out * 0.6);
    halo.material.opacity = k * 0.45;
    shock.scale.setScalar(0.35 + out * 1.5);
    shock.material.opacity = Math.min(1, k * 1.6) * 0.9;
    jets.forEach((j) => {
      j.scale.set(0.8 + k * 0.4, 0.5 + k * 0.7, 1);
      j.position.z = -0.2 - (0.5 + k * 0.7) * 0.9;
      j.material.opacity = k;
    });
  };
  return g;
}

// 能量管（玻璃管 + 發光芯 + 螺旋絲），沿 z；回傳 { group, core, swirl }
function energyTube(parent, r, len, color, x, y, z) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  parent.add(grp);
  const coreMat = GLOW(color, 2.4);
  cyl(grp, r * 0.45, r * 0.45, len * 0.96, coreMat, 0, 0, 0, 10);
  const swirl = helix(grp, r * 0.72, len * 0.9, 3, r * 0.1, GLOW(0xffffff, 1.6, { color: 0xeafffa }));
  cyl(grp, r, r, len, GLASS(color), 0, 0, 0, 18);
  return { group: grp, coreMat, swirl };
}

// ---------- 💠 Soul Blaster（小朋友最鍾意！自動步槍 + 瞄準鏡）----------
function soulBlaster() {
  const g = new THREE.Group();
  const SOUL = 0x40ffd0;
  const shell = METAL(0x3a2d5e, { metalness: 0.45, roughness: 0.38 }); // 深紫機身
  const plate = METAL(0x8f6bff, { metalness: 0.5, roughness: 0.3 }); // 紫色裝甲板
  const trim = METAL(0xc9d6e8, { metalness: 0.9, roughness: 0.2 }); // 銀色飾邊
  const gold = METAL(0xffc94d, { metalness: 0.9, roughness: 0.25 });
  const dark = M(0x120c1e, { roughness: 0.6 });
  const rubber = M(0x1a1426, { roughness: 0.85, metalness: 0 });
  const soul = GLOW(SOUL, 2.4); // 射嘢時閃（glows）
  const vent = GLOW(SOUL, 1.4);
  const crystal = GLOW(0x5fffe0, 1.3); // 大塊發光嘅嘢唔好太光（Bloom 會糊）

  // ── 機身：一層層板 ──
  rbox(g, 0.18, 0.2, 0.58, shell, 0, 0.03, -0.1, 0.22);
  rbox(g, 0.2, 0.06, 0.5, plate, 0, -0.07, -0.12, 0.35); // 底板
  rbox(g, 0.14, 0.05, 0.64, trim, 0, 0.15, -0.12, 0.4); // 頂嘅路軌
  for (let i = 0; i < 7; i++) rbox(g, 0.15, 0.015, 0.03, dark, 0, 0.18, -0.38 + i * 0.075, 0.3); // 路軌坑紋
  for (const s of [-1, 1]) {
    // 側面裝甲板 + 發光坑
    rbox(g, 0.03, 0.15, 0.4, plate, s * 0.1, 0.04, -0.12, 0.35);
    rbox(g, 0.02, 0.06, 0.18, shell, s * 0.115, 0.1, -0.02, 0.35);
    for (let i = 0; i < 3; i++) rbox(g, 0.012, 0.075, 0.018, vent, s * 0.12, 0.035, 0.05 + i * 0.035, 0.3); // 散熱發光坑
    ball(g, 0.012, gold, s * 0.118, 0.1, -0.29, 8); // 螺絲
    ball(g, 0.012, gold, s * 0.118, -0.02, -0.29, 8);
  }
  // ── 兩邊能量管（玻璃 + 發光芯 + 螺旋）──
  const tubes = [-1, 1].map((s) => {
    const t = energyTube(g, 0.042, 0.28, SOUL, s * 0.128, 0.0, -0.17);
    cyl(g, 0.05, 0.05, 0.03, trim, s * 0.128, 0.0, -0.32);
    cyl(g, 0.05, 0.05, 0.03, trim, s * 0.128, 0.0, -0.02);
    return t;
  });

  // ── 槍管：六角護罩 + 3 個會轉嘅發光圈 ──
  const barrel = new THREE.Group(); // 射嘢時向後縮少少
  g.add(barrel);
  cyl(barrel, 0.075, 0.08, 0.34, shell, 0, 0.03, -0.54, 6).rotation.y = Math.PI / 6;
  cyl(barrel, 0.036, 0.036, 0.5, dark, 0, 0.03, -0.66, 12);
  for (const z of [-0.43, -0.65]) cyl(barrel, 0.084, 0.084, 0.02, plate, 0, 0.03, z, 6).rotation.y = Math.PI / 6;
  const rings = [-0.49, -0.545, -0.6].map((z) => ring(barrel, 0.074, 0.012, soul, 0, 0.03, z));
  // 槍嘴：三爪發射器 + 發光圈
  cyl(barrel, 0.06, 0.07, 0.07, trim, 0, 0.03, -0.86);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const prong = rbox(barrel, 0.03, 0.025, 0.12, plate, Math.cos(a) * 0.06, 0.03 + Math.sin(a) * 0.06, -0.93, 0.35);
    prong.lookAt(Math.cos(a) * 0.1, 0.03 + Math.sin(a) * 0.1, -1.1);
  }
  const muzzleRing = ring(barrel, 0.048, 0.013, soul, 0, 0.03, -0.95);
  const muzzleCore = ball(barrel, 0.03, GLOW(0x9ffff0, 2), 0, 0.03, -0.92, 10);
  // 前準星
  rbox(g, 0.03, 0.05, 0.03, gold, 0, 0.12, -0.8, 0.3);
  rbox(g, 0.014, 0.022, 0.014, soul, 0, 0.15, -0.8, 0.3);
  // 前手柄
  rbox(g, 0.07, 0.12, 0.08, rubber, 0, -0.1, -0.47, 0.35).rotation.x = -0.15;
  rbox(g, 0.075, 0.02, 0.085, plate, 0, -0.04, -0.47, 0.35);

  // ── 槍托：斜斜嘅 + 發光靈魂水晶 ──
  const stock = rbox(g, 0.12, 0.15, 0.3, shell, 0, 0.0, 0.33, 0.3);
  stock.rotation.x = 0.06;
  rbox(g, 0.13, 0.05, 0.26, plate, 0, 0.08, 0.32, 0.4);
  rbox(g, 0.14, 0.2, 0.05, rubber, 0, -0.01, 0.5, 0.3); // 膊頭墊
  for (const s of [-1, 1]) {
    const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), crystal);
    cr.position.set(s * 0.065, 0.0, 0.33);
    cr.scale.set(0.5, 1, 1.5);
    g.add(cr);
  }

  // ── 手柄 + 扳機護圈 ──
  const grip = rbox(g, 0.085, 0.21, 0.1, rubber, 0, -0.15, 0.08, 0.35);
  grip.rotation.x = 0.28;
  rbox(g, 0.09, 0.05, 0.11, plate, 0, -0.25, 0.11, 0.35).rotation.x = 0.28;
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 16, Math.PI), trim);
  guard.rotation.set(0, Math.PI / 2, Math.PI);
  guard.position.set(0, -0.08, -0.02);
  g.add(guard);
  rbox(g, 0.015, 0.05, 0.02, gold, 0, -0.1, -0.01, 0.3); // 扳機

  // ── 彈匣 = 靈魂能量罐（玻璃 + 發光液 + 金屬蓋）──
  const mag = new THREE.Group();
  mag.position.set(0, -0.07, -0.2);
  mag.rotation.x = -0.22;
  g.add(mag);
  vcyl(mag, 0.055, 0.055, 0.035, trim, 0, -0.01, 0, 14);
  const canGlass = vcyl(mag, 0.048, 0.048, 0.17, GLASS(SOUL), 0, -0.115, 0, 16);
  canGlass.renderOrder = 2;
  const liquidMat = GLOW(SOUL, 1.5);
  vcyl(mag, 0.036, 0.036, 0.15, liquidMat, 0, -0.115, 0, 12);
  vcyl(mag, 0.057, 0.05, 0.035, plate, 0, -0.215, 0, 14);
  for (let i = 0; i < 4; i++) vcyl(mag, 0.008, 0.008, 0.17, trim, Math.cos((i * Math.PI) / 2 + 0.78) * 0.05, -0.115, Math.sin((i * Math.PI) / 2 + 0.78) * 0.05, 4);
  const bubbles = [0, 1, 2].map(() => ball(mag, 0.011, GLOW(0xeafffa, 2.6), 0, -0.15, 0, 6));

  // ── 瞄準鏡：粗身、發光前鏡、後面開口（開鏡時由度望出去）──
  const scope = new THREE.Group();
  scope.position.set(0, 0.25, -0.08);
  g.add(scope);
  const tubeMat = METAL(0x1d1630, { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide });
  cyl(scope, 0.055, 0.055, 0.26, tubeMat, 0, 0, 0, 20, true);
  cyl(scope, 0.088, 0.055, 0.08, tubeMat, 0, 0, 0.17, 20, true); // 後面目鏡（開口）
  cyl(scope, 0.055, 0.085, 0.09, tubeMat, 0, 0, -0.17, 20, true); // 前面大鏡
  ring(scope, 0.088, 0.012, rubber, 0, 0, 0.21); // 目鏡膠圈
  ring(scope, 0.086, 0.012, trim, 0, 0, -0.215);
  const eyeMat = GLOW(SOUL, 1);
  ring(scope, 0.075, 0.004, eyeMat, 0, 0, 0.205); // 目鏡發光邊（淡淡哋，開鏡時唔會太刺眼）
  // 前鏡：由前面望係發光（向前嘅面），由後面望係淡淡透明（開鏡時望得穿）
  const lensFront = new THREE.Mesh(new THREE.CircleGeometry(0.082, 24), GLOW(0x80ffe8, 2.2, { transparent: true, opacity: 0.85 }));
  lensFront.position.z = -0.21;
  lensFront.rotation.y = Math.PI; // 面向 -z（前面）
  scope.add(lensFront);
  const lensBack = new THREE.Mesh(new THREE.CircleGeometry(0.082, 24), new THREE.MeshBasicMaterial({ color: 0x1fa88a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  lensBack.position.z = -0.205;
  scope.add(lensBack);
  // 鏡上嘅調校轆 + 發光細窗
  vcyl(scope, 0.028, 0.028, 0.04, plate, 0, 0.065, 0, 12);
  rbox(scope, 0.04, 0.012, 0.012, soul, 0, 0.087, 0, 0.3);
  cyl(scope, 0.025, 0.025, 0.04, plate, 0.065, 0, 0, 12).rotation.set(0, 0, Math.PI / 2);
  // 鏡腳
  for (const z of [-0.08, 0.08]) {
    ring(scope, 0.06, 0.012, trim, 0, 0, z);
    rbox(scope, 0.05, 0.08, 0.04, shell, 0, -0.07, z, 0.3);
  }

  // ── 槍嘴、彈殼位 ──
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.03, -0.99);
  g.add(muzzle);
  const eject = new THREE.Object3D();
  eject.position.set(0.11, 0.08, -0.05);
  g.add(eject);

  // ── 漂浮能量粒（圍住槍管轉）──
  const orbs = [];
  for (let i = 0; i < 3; i++) orbs.push(ball(g, 0.016, soul, 0, 0, 0, 8));

  let fireT = -9; // 上一槍幾時
  let fired = false;
  let lastT = 0;
  g.userData = {
    muzzle, mag, glows: [soul], orbs, magRest: mag.position.clone(), aimY: -0.125, adsZ: -0.2,
    hip: { x: 0.23, y: -0.22, z: -0.52 },
    eject, shell: { colors: [SOUL, 0xb388ff], size: 0.024 },
    tracer: { width: 0.05, length: 4, head: 0.5, speed: 190 },
  };
  const magRot = mag.rotation.x;
  g.userData.fire = () => (fired = true);
  // 換彈：能量罐跌落去（轉住）→ 新嘅升返上嚟 → 「咔」一聲發光
  g.userData.reload = (k) => {
    mag.position.copy(g.userData.magRest);
    mag.rotation.set(magRot, 0, 0);
    mag.visible = true;
    if (k <= 0) return void (liquidMat.emissiveIntensity = 1.5);
    if (k < 0.4) {
      const o = ease(k / 0.4);
      mag.position.y -= o * 0.32;
      mag.position.x -= o * 0.08;
      mag.position.z += o * 0.06;
      mag.rotation.x += o * 1.2;
      mag.rotation.z = -o * 0.9;
      liquidMat.emissiveIntensity = 1.5 * (1 - o);
    } else if (k < 0.55) {
      mag.position.y -= 0.5;
      mag.visible = false;
    } else {
      mag.visible = true;
      const i = 1 - ease(clamp01((k - 0.55) / 0.3));
      mag.position.y -= i * 0.3;
      mag.position.x -= i * 0.05;
      mag.rotation.x -= i * 0.3;
      liquidMat.emissiveIntensity = k > 0.85 ? 4 - (k - 0.85) * 16 : 1;
    }
  };
  g.userData.animate = (t) => {
    const dt = Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    if (fired) {
      fired = false;
      fireT = t;
    }
    const f = clamp01(1 - (t - fireT) / 0.12); // 射嘢後 0.12 秒
    // 能量管：慢慢呼吸咁閃，射嘢時爆光
    const pulse = 1.5 + Math.sin(t * 4) * 0.5 + f * 2.5;
    crystal.emissiveIntensity = 1.1 + Math.sin(t * 4 + 1) * 0.4 + f * 1.5;
    tubes.forEach((tb, i) => {
      tb.coreMat.emissiveIntensity = pulse;
      tb.swirl.rotation.z = t * (3 + f * 20) * (i ? 1 : -1);
    });
    vent.emissiveIntensity = 1.4 + f * 3.5;
    muzzleCore.material.emissiveIntensity = 1.6 + Math.sin(t * 6) * 0.6 + f * 4;
    muzzleCore.scale.setScalar(1 + f * 0.6);
    // 槍管向後縮（後座力）
    barrel.position.z = f * 0.05;
    rings.forEach((r, i) => (r.rotation.z += dt * (2 + f * 25) * (i % 2 ? -1 : 1)));
    muzzleRing.scale.setScalar(1 + f * 0.35);
    // 能量罐入面嘅泡泡
    bubbles.forEach((b, i) => {
      const k = (t * 0.6 + i / 3) % 1;
      b.position.set(Math.sin(t * 3 + i * 2) * 0.018, -0.19 + k * 0.15, Math.cos(t * 2 + i) * 0.018);
    });
    orbs.forEach((o, i) => {
      const a = t * 3 + (i * Math.PI * 2) / 3;
      o.position.set(Math.cos(a) * 0.12, 0.03 + Math.sin(a) * 0.12, -0.6 + Math.sin(t * 2 + i) * 0.1);
    });
  };
  return g;
}

// ---------- 🍭 Candy Pistol（拐杖糖槍管 + 波板糖 + 糖果包裝紙）----------
function candyPistol() {
  const g = new THREE.Group();
  const pink = M(0xff5cb8, { roughness: 0.22, metalness: 0.15 });
  const pinkDeep = M(0xd81b78, { roughness: 0.25, metalness: 0.2 });
  const cream = M(0xfff2fa, { roughness: 0.25, metalness: 0.05 });
  const mintM = M(0x5ff2c0, { roughness: 0.25, metalness: 0.1 });
  const chrome = METAL(0xf3e5f5, { metalness: 0.9, roughness: 0.18 });
  const cane = new THREE.MeshStandardMaterial({ map: stripeTex(), roughness: 0.25 });
  const glow = GLOW(0xff6ec7, 2.4);
  const mint = GLOW(0x7dffd0, 2);
  const lemon = GLOW(0xffe36e, 2);
  const cello = new THREE.MeshStandardMaterial({ color: 0xffb3e6, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, emissive: 0xff6ec7, emissiveIntensity: 0.3 });

  // ── 機身：圓滾滾糖果 + 白色頂蓋 ──
  rbox(g, 0.14, 0.15, 0.36, pink, 0, 0.02, -0.1, 0.42);
  const slide = new THREE.Group(); // 頂蓋：射嘢時向後彈
  g.add(slide);
  rbox(slide, 0.12, 0.06, 0.38, cream, 0, 0.105, -0.1, 0.45);
  for (let i = 0; i < 4; i++) rbox(slide, 0.125, 0.04, 0.012, pinkDeep, 0, 0.1, 0.03 + i * 0.022, 0.3); // 後面坑紋
  // 側面：一粒粒發光糖豆（好似 LED）
  for (const s of [-1, 1]) {
    rbox(g, 0.02, 0.07, 0.22, pinkDeep, s * 0.07, 0.02, -0.12, 0.4);
    [glow, mint, lemon].forEach((mat, i) => ball(g, 0.016, mat, s * 0.082, 0.02, -0.2 + i * 0.06, 8));
  }
  // ── 拐杖糖槍管（斜紋）+ 糖果螺旋 ──
  const barrel = cyl(g, 0.045, 0.045, 0.34, cane, 0, 0.04, -0.4, 18);
  barrel.material.map.repeat.set(2, 2);
  const swirl = helix(g, 0.05, 0.28, 3, 0.008, glow, 0, 0.04, -0.4);
  // 槍嘴：薄荷糖圈 + 發光糖心
  cyl(g, 0.065, 0.06, 0.05, mintM, 0, 0.04, -0.58, 18);
  const muzzleRing = ring(g, 0.06, 0.016, glow, 0, 0.04, -0.605);
  ball(g, 0.03, GLOW(0xffd6f0, 3), 0, 0.04, -0.6, 10);
  cyl(g, 0.055, 0.055, 0.04, chrome, 0, 0.04, -0.235, 18);
  // 準星 = 一粒啫喱糖（企喺高高嘅糖棍上面：開鏡時槍管喺準星下面，唔會遮住目標）
  vcyl(g, 0.008, 0.01, 0.1, cream, 0, 0.13, -0.5, 8);
  const gum = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mint);
  gum.position.set(0, 0.18, -0.5);
  g.add(gum);
  // 後照門：兩粒粉紅糖中間有條罅
  rbox(g, 0.07, 0.04, 0.03, pinkDeep, 0, 0.15, 0.04, 0.3);
  for (const sx of [-1, 1]) rbox(g, 0.022, 0.04, 0.03, pinkDeep, sx * 0.024, 0.18, 0.04, 0.3);

  // ── 手柄：白色糖果棒 + 粉紅圈紋 + 包裝紙扭位 ──
  const gripG = new THREE.Group();
  gripG.position.set(0, -0.06, 0.04);
  gripG.rotation.x = 0.3;
  g.add(gripG);
  rbox(gripG, 0.085, 0.22, 0.1, cream, 0, -0.08, 0, 0.42);
  for (let i = 0; i < 4; i++) rbox(gripG, 0.09, 0.018, 0.105, pink, 0, -0.01 - i * 0.045, 0, 0.4);
  // 包裝紙：兩個錐形扭埋一齊（好似糖果紙兩頭）
  const tw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.07, 8, 1, true), cello);
  tw.position.set(0, -0.22, 0);
  tw.rotation.x = Math.PI;
  gripG.add(tw);
  const tw2 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.06, 8, 1, true), cello);
  tw2.position.set(0, -0.27, 0);
  gripG.add(tw2);
  ball(gripG, 0.016, pinkDeep, 0, -0.245, 0, 8);
  // 扳機 + 護圈
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 6, 16, Math.PI), mintM);
  guard.rotation.set(0, Math.PI / 2, Math.PI);
  guard.position.set(0, -0.06, -0.06);
  g.add(guard);
  rbox(g, 0.015, 0.045, 0.02, chrome, 0, -0.08, -0.05, 0.3);

  // ── 後面嘅波板糖（射嘢時轉得快啲）──
  const lolly = new THREE.Group();
  lolly.position.set(0.1, 0.1, 0.11); // 擺喺右邊：開鏡時唔會遮住照門
  g.add(lolly);
  const swirlMat = new THREE.MeshStandardMaterial({ map: swirlTex(), emissive: 0xffffff, emissiveMap: swirlTex(), emissiveIntensity: 0.25, roughness: 0.2 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 28), [M(0xff3f9a, { roughness: 0.2 }), swirlMat, swirlMat]);
  disc.rotation.z = Math.PI / 2;
  lolly.add(disc);
  const lollyRim = ring(lolly, 0.1, 0.008, glow, 0, 0, 0);
  lollyRim.rotation.y = Math.PI / 2;
  cyl(g, 0.012, 0.012, 0.1, cream, 0.05, 0.1, 0.11, 8).rotation.set(0, 0, Math.PI / 2); // 波板糖棍（由機身伸出去）

  // ── 彈匣 = 透明糖果筒（入面有發光糖）由手柄底跌出 ──
  const mag = new THREE.Group();
  mag.position.set(0, -0.1, 0.06);
  mag.rotation.x = 0.3;
  g.add(mag);
  vcyl(mag, 0.036, 0.036, 0.15, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false }), 0, -0.08, 0.045, 12);
  vcyl(mag, 0.04, 0.04, 0.02, pinkDeep, 0, -0.16, 0.045, 12);
  const candies = [];
  for (let i = 0; i < 3; i++) candies.push(ball(mag, 0.024, [glow, mint, lemon][i], 0, -0.035 - i * 0.045, 0.045, 8));

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.04, -0.62);
  g.add(muzzle);
  const eject = new THREE.Object3D();
  eject.position.set(0.07, 0.11, -0.12);
  g.add(eject);

  let fireT = -9;
  let fired = false;
  let lastT = 0;
  let spin = 0;
  g.userData = {
    muzzle, mag, glows: [glow], magRest: mag.position.clone(), lolly, aimY: -0.12,
    hip: { x: 0.2, y: -0.17, z: -0.42 },
    eject, shell: { colors: [0xff6ec7, 0x7dffd0, 0xffe36e, 0xb388ff], size: 0.02, sprinkle: true },
    tracer: { width: 0.06, length: 1.6, head: 0.7, speed: 120 },
  };
  const magRot = mag.rotation.x;
  g.userData.fire = () => (fired = true);
  // 換彈：糖果筒向下滑出 → 新筒塞返入去，入面啲糖一粒粒亮返
  g.userData.reload = (k) => {
    mag.position.copy(g.userData.magRest);
    mag.rotation.set(magRot, 0, 0);
    candies.forEach((c) => (c.visible = true));
    if (k <= 0) return;
    const out = k < 0.45 ? ease(k / 0.45) : 1 - ease(clamp01((k - 0.5) / 0.35));
    mag.position.y -= out * 0.35;
    mag.position.z += out * 0.1;
    mag.rotation.z = out * (k < 0.45 ? 0.5 : -0.3);
    candies.forEach((c, i) => (c.visible = k > 0.5 ? k > 0.55 + i * 0.1 : out < 0.3));
  };
  g.userData.animate = (t) => {
    const dt = Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    if (fired) {
      fired = false;
      fireT = t;
    }
    const f = clamp01(1 - (t - fireT) / 0.14);
    slide.position.z = f * 0.06;
    spin += dt * (2 + f * 30);
    lolly.rotation.x = spin;
    swirl.rotation.z = -t * 2;
    muzzleRing.scale.setScalar(1 + f * 0.4);
    mint.emissiveIntensity = 1.6 + Math.sin(t * 5) * 0.6 + f * 3;
    lemon.emissiveIntensity = 1.6 + Math.sin(t * 5 + 2) * 0.6 + f * 3;
    gum.scale.y = 1 + Math.sin(t * 8) * 0.08; // 啫喱糖 boing boing
  };
  return g;
}

// ---------- 🎯 Spooky Slingshot（扭曲樹枝 + 發光符文 + 會伸長嘅發光橡筋）----------
function slingshot() {
  const g = new THREE.Group();
  const wood = M(0x5b3a24, { roughness: 0.85, metalness: 0 });
  const bark = M(0x2f1c10, { roughness: 0.95, metalness: 0 });
  const iron = METAL(0x4a4458, { metalness: 0.8, roughness: 0.4 });
  const band = GLOW(0xffa726, 2.2); // 橡筋（glows）
  const seed = GLOW(0xffc23d, 1.8);
  // 符文材質：每條帶自己一張貼圖（可以各自轉）
  const runeMaterial = (color, rep) => {
    const tex = runeTex().clone();
    tex.repeat.set(rep, 1);
    tex.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveMap: tex, emissiveIntensity: 2.6, alphaMap: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  };

  // ── 扭曲嘅 Y 字樹枝 ──
  branch(g, [[0, -0.3, 0.02], [0.01, -0.18, 0], [-0.01, -0.06, 0.01], [0, 0.02, 0]], 0.05, 0.045, wood, 0.2, 1);
  branch(g, [[0, 0.0, 0], [-0.06, 0.07, 0], [-0.13, 0.16, 0.01], [-0.14, 0.27, -0.01]], 0.044, 0.026, wood, 0.22, 2);
  branch(g, [[0, 0.0, 0], [0.06, 0.07, 0], [0.13, 0.16, -0.01], [0.15, 0.27, 0.0]], 0.044, 0.026, wood, 0.22, 3);
  // 細樹枝 + 樹結
  branch(g, [[-0.1, 0.13, 0], [-0.16, 0.13, 0.01], [-0.19, 0.17, 0.03]], 0.014, 0.004, bark, 0.1, 4);
  branch(g, [[0.03, -0.14, 0], [0.08, -0.13, 0.02], [0.1, -0.09, 0.03]], 0.012, 0.004, bark, 0.1, 5);
  ball(g, 0.026, bark, 0.035, 0.03, 0.015, 8).scale.set(1, 0.7, 0.6);
  ball(g, 0.02, bark, -0.035, -0.2, -0.02, 8).scale.set(1, 0.8, 0.6);
  // 叉頭：鐵帽 + 發光符文石（橡筋綁喺度）
  const tips = [-1, 1].map((s) => {
    const p = new THREE.Vector3(s * 0.145, 0.275, -0.005);
    vcyl(g, 0.034, 0.03, 0.04, iron, p.x, p.y - 0.01, p.z, 10);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.026, 0), GLOW(0xff9a3c, 2.4));
    gem.position.set(p.x, p.y + 0.035, p.z);
    gem.scale.y = 1.5;
    g.add(gem);
    return { p, gem };
  });
  // 符文帶：圍住手柄同兩條叉（發光字）
  const runeBands = [];
  const runeBand = (r, h, x, y, z, rz, color, rep) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20, 1, true), runeMaterial(color, rep));
    m.position.set(x, y, z);
    m.rotation.z = rz;
    g.add(m);
    runeBands.push(m);
    return m;
  };
  runeBand(0.052, 0.05, 0, -0.12, 0.005, 0, 0xff9a3c, 2);
  runeBand(0.04, 0.04, -0.09, 0.11, 0.005, 0.6, 0xb36bff, 1);
  runeBand(0.04, 0.04, 0.09, 0.11, 0.0, -0.6, 0xb36bff, 1);
  // 手柄纏住嘅皮帶
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.009, 6, 18), bark);
    w.rotation.x = Math.PI / 2 + (i % 2 ? 0.25 : -0.25);
    w.position.set(0, -0.2 - i * 0.025, 0.015);
    g.add(w);
  }
  // 底部：發光南瓜（有葉）
  const pumpkin = new THREE.Group();
  pumpkin.position.set(0, -0.34, 0.02);
  g.add(pumpkin);
  const pumpGlow = GLOW(0xff7a00, 1.2, { roughness: 0.4 });
  for (let i = 0; i < 6; i++) {
    const lobe = ball(pumpkin, 0.04, pumpGlow, Math.cos((i / 6) * Math.PI * 2) * 0.022, 0, Math.sin((i / 6) * Math.PI * 2) * 0.022, 10);
    lobe.scale.set(0.7, 0.85, 0.7);
  }
  vcyl(pumpkin, 0.008, 0.01, 0.03, M(0x3e7b2a), 0, 0.04, 0, 6);
  const leaf = rbox(pumpkin, 0.04, 0.005, 0.022, M(0x4caf50), 0.02, 0.045, 0, 0.3);
  leaf.rotation.z = 0.4;
  // 南瓜發光眼（細細嘅）
  for (const s of [-1, 1]) rbox(pumpkin, 0.012, 0.012, 0.004, GLOW(0xfff176, 3), s * 0.013, 0.005, -0.04, 0.3);

  // ── 皮兜 + 南瓜籽 ──
  const pouch = new THREE.Group();
  pouch.position.set(0, 0.25, 0.06);
  g.add(pouch);
  const leather = M(0xffffff, { map: leatherTex(), roughness: 0.8, metalness: 0 });
  const pouchMesh = rbox(pouch, 0.09, 0.05, 0.04, leather, 0, 0, 0.005, 0.45);
  pouchMesh.scale.z = 0.8;
  const ammo = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), seed);
  ammo.scale.set(0.75, 0.95, 1.25);
  ammo.position.z = -0.01;
  pouch.add(ammo);
  const seedHalo = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xffa726, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  ammo.add(seedHalo);
  // 換彈用：一粒新籽由下面飛入皮兜
  const spare = ball(g, 0.035, seed, 0, 0, 0, 10);
  spare.scale.set(0.75, 0.95, 1.25);
  spare.visible = false;

  // ── 橡筋：兩條發光管，由叉頭去皮兜兩邊；拉長會變幼 ──
  const bands = tips.map(({ p }, i) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1, 8), band);
    b.userData.from = p.clone().add(new THREE.Vector3(0, 0.005, 0));
    b.userData.side = i ? 1 : -1;
    g.add(b);
    return b;
  });
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.25, -0.05);
  g.add(muzzle);

  const tmp = new THREE.Vector3();
  const to = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const placeBands = () => bands.forEach((b) => {
    to.copy(pouch.position);
    to.x += b.userData.side * 0.045;
    tmp.copy(to).sub(b.userData.from);
    const len = tmp.length();
    b.position.copy(b.userData.from).addScaledVector(tmp, 0.5);
    const thin = Math.max(0.45, Math.min(1, 0.12 / len)); // 越拉越幼
    b.scale.set(thin, len, thin);
    b.quaternion.setFromUnitVectors(up, tmp.normalize());
  });
  let pull = 0;
  let snapT = -9; // 放手嗰刻（橡筋彈下彈下）
  let snapAmp = 0;
  let lastT = 0;
  let now = 0;
  placeBands();
  g.userData = {
    muzzle, mag: pouch, glows: [band, seed], magRest: pouch.position.clone(), pouch, ammo, aimY: -0.25,
    hip: { x: 0.2, y: -0.2, z: -0.45 },
    flashScale: 0.55, // 彈叉唔使咁大嚿閃光
    tracer: { width: 0.04, length: 2, head: 0.6 },
  };
  // pull 0–1：拉後幾多
  g.userData.setPull = (p) => {
    if (pull > 0.15 && p < pull - 0.1) {
      snapT = now;
      snapAmp = pull;
    }
    pull = p;
    pouch.position.z = 0.06 + p * 0.3;
    pouch.position.y = 0.25 - p * 0.03;
    placeBands();
  };
  // 換彈：一粒發光新籽由手柄下面飛上皮兜
  g.userData.reload = (k) => {
    spare.visible = k > 0.2 && k < 0.95;
    if (!spare.visible) return;
    const q = ease(clamp01((k - 0.2) / 0.7));
    spare.position.set(0.18 * (1 - q), -0.25 + q * 0.5 + Math.sin(q * Math.PI) * 0.12, 0.12 * (1 - q) + pouch.position.z * q);
    spare.rotation.y = q * 8;
  };
  g.userData.animate = (t) => {
    const dt = Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    now = t;
    // 放手：皮兜向前彈過龍再彈返（好似真橡筋）
    const s = t - snapT;
    if (s < 0.6) {
      pouch.position.z += -Math.sin(s * 38) * Math.exp(-s * 7) * 0.09 * snapAmp;
      placeBands();
    }
    // 符文慢慢閃、慢慢轉
    runeBands.forEach((r, i) => {
      r.material.emissiveIntensity = 2 + Math.sin(t * 3 + i * 1.5) * 0.8 + pull * 2.5;
      r.material.emissiveMap.offset.x += dt * (i ? -0.025 : 0.04);
    });
    tips.forEach(({ gem }, i) => {
      gem.rotation.y = t * 2 + i;
      gem.material.emissiveIntensity = 2 + pull * 3 + Math.sin(t * 5 + i) * 0.5;
    });
    pumpGlow.emissiveIntensity = 1 + Math.sin(t * 2) * 0.3;
    seedHalo.material.opacity = 0.45 + pull * 0.5;
    seedHalo.scale.setScalar(1 + pull * 0.8);
    ammo.rotation.z = Math.sin(t * 6) * 0.15 * pull;
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
