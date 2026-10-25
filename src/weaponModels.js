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
// Issue #14 新加：🎃 Pumpkin Launcher、❄️ Frost Wand、⚡ Lightning Staff、👻 Ghost Shotgun、🦇 Bat Swarm Bow
//   + projectileModel('pumpkin' | 'bat', color)：會飛嘅彈個樣（userData.fly(v, t, dt)、dispose()）
// Issue #15 新加：🐉 Dragon Breath、🗡️ Spirit Daggers、🧪 Fire Potion、🎆 Firework Launcher、😡 Angry Spell
//   + projectileModel('dagger' | 'potion' | 'firework' | 'angryOrb')；projectile 可以有 userData.tail()（尾巴火花喺邊）
//   新 userData（可以冇）：ammoCount(n, mag) 剩幾多發（例如掛住嘅後備煙花）· cooldown(k) 法術冷卻 0–1（1 = 用得）

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

// ================= Issue #14：新魔法武器（淨係喺女巫塔 📦 Weapon Crate 抽到）=================
// 同上面三支一樣：玩具魔法款、發光、圓角；槍管向 -z

// 蝙蝠翼形狀（平面，向 +x 伸出去，下面一個個扇形凹位）
function batWingShape(span = 1, h = 0.45) {
  const s = new THREE.Shape();
  s.moveTo(0, 0.1 * h);
  s.quadraticCurveTo(span * 0.45, h * 1.05, span, h * 0.7);
  s.lineTo(span * 0.92, h * 0.1);
  const n = 3;
  for (let i = 0; i < n; i++) { // 扇形凹位（翼骨中間）
    const x0 = span * (0.92 - (i * 0.92) / n);
    const x1 = span * (0.92 - ((i + 1) * 0.92) / n);
    s.quadraticCurveTo((x0 + x1) / 2, h * 0.42, x1, i === n - 1 ? -0.05 * h : h * 0.05);
  }
  s.lineTo(0, 0.1 * h);
  return s;
}

// ---------- 🎃 Pumpkin Launcher（藤蔓纏住嘅大炮筒 + 玻璃斗入面有粒發光南瓜）----------
function pumpkinLauncher() {
  const g = new THREE.Group();
  const orange = M(0xff8f00, { roughness: 0.4, metalness: 0.1 });
  const orangeDeep = M(0xe65100, { roughness: 0.45, metalness: 0.1 });
  const vineM = M(0x2e7d32, { roughness: 0.6, metalness: 0 });
  const leafM = M(0x66bb6a, { roughness: 0.5, metalness: 0, side: THREE.DoubleSide });
  const purple = M(0x4a2a6a, { roughness: 0.5, metalness: 0.2 });
  const iron = METAL(0x3b3346, { metalness: 0.75, roughness: 0.35 });
  const gold = METAL(0xffc94d, { metalness: 0.9, roughness: 0.25 });
  const fire = GLOW(0xffb300, 2.6);
  const eyeGlow = GLOW(0xffe082, 3);

  // ── 炮筒：南瓜色一節節（好似南瓜坑紋）+ 鐵圈 ──
  const barrel = new THREE.Group();
  g.add(barrel);
  cyl(barrel, 0.1, 0.11, 0.62, orange, 0, 0.05, -0.28, 20);
  for (let i = 0; i < 8; i++) { // 坑紋
    const a = (i / 8) * Math.PI * 2;
    const r = rbox(barrel, 0.03, 0.03, 0.6, orangeDeep, Math.cos(a) * 0.1, 0.05 + Math.sin(a) * 0.1, -0.28, 0.5);
    r.rotation.z = a;
  }
  for (const z of [-0.02, -0.3, -0.56]) cyl(barrel, 0.122, 0.122, 0.035, iron, 0, 0.05, z, 20);
  // 炮口：喇叭形 + 發光內圈（好似南瓜燈個口）
  cyl(barrel, 0.16, 0.12, 0.12, orangeDeep, 0, 0.05, -0.64, 20);
  const mouthRing = ring(barrel, 0.14, 0.022, fire, 0, 0.05, -0.705);
  const mouthCore = cyl(barrel, 0.11, 0.11, 0.02, GLOW(0xff6d00, 1.8), 0, 0.05, -0.69, 20);
  // 炮口上面三角眼（南瓜燈個樣）
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.045, 3), eyeGlow);
    eye.position.set(sx * 0.055, 0.135, -0.665);
    eye.rotation.set(Math.PI / 2, 0, Math.PI);
    barrel.add(eye);
  }
  // ── 藤蔓纏住 + 葉 ──
  helix(barrel, 0.125, 0.52, 2.2, 0.012, vineM, 0, 0.05, -0.3);
  const leaves = [];
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + 0.4;
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.045, 6), leafM);
    leaf.scale.set(1, 0.55, 1);
    leaf.position.set(Math.cos(a) * 0.14, 0.05 + Math.sin(a) * 0.14, -0.1 - i * 0.13);
    leaf.rotation.set(0.3, a, 0.6);
    barrel.add(leaf);
    leaves.push(leaf);
  }
  // ── 上面嘅玻璃斗：入面有粒發光細南瓜（彈藥）──
  const hopper = new THREE.Group();
  hopper.position.set(0, 0.2, -0.02);
  g.add(hopper);
  vcyl(hopper, 0.07, 0.05, 0.08, gold, 0, -0.04, 0, 14);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), GLASS(0xffcc80));
  hopper.add(dome);
  const ammo = new THREE.Group();
  hopper.add(ammo);
  const pumpkinBall = ball(ammo, 0.05, GLOW(0xff9100, 1.4), 0, 0.04, 0, 12);
  pumpkinBall.scale.set(1, 0.8, 1);
  vcyl(ammo, 0.008, 0.01, 0.03, vineM, 0, 0.09, 0, 6);
  // ── 機身、手柄、托 ──
  rbox(g, 0.15, 0.12, 0.3, purple, 0, -0.05, 0.08, 0.3);
  rbox(g, 0.16, 0.02, 0.31, gold, 0, 0.01, 0.08, 0.3);
  const grip = rbox(g, 0.08, 0.2, 0.1, purple, 0, -0.17, 0.1, 0.35);
  grip.rotation.x = 0.25;
  rbox(g, 0.09, 0.03, 0.11, gold, 0, -0.27, 0.13, 0.3).rotation.x = 0.25;
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 14, Math.PI), iron);
  guard.rotation.set(0, Math.PI / 2, Math.PI);
  guard.position.set(0, -0.11, 0.02);
  g.add(guard);
  // 前手柄（扶手）+ 後托（膊頭）
  rbox(g, 0.06, 0.13, 0.07, purple, 0, -0.08, -0.36, 0.4);
  rbox(g, 0.13, 0.16, 0.22, purple, 0, -0.04, 0.32, 0.35);
  rbox(g, 0.14, 0.17, 0.03, M(0x1a1426, { roughness: 0.85 }), 0, -0.04, 0.44, 0.3);
  // 側面：一細粒南瓜燈（發光眼口）
  const side = new THREE.Group();
  side.position.set(0.1, -0.02, 0.1);
  g.add(side);
  ball(side, 0.05, orange, 0, 0, 0, 12).scale.set(0.7, 0.85, 1);
  for (const sz of [-1, 1]) rbox(side, 0.01, 0.018, 0.018, eyeGlow, 0.036, 0.015, sz * 0.018, 0.2);
  rbox(side, 0.01, 0.012, 0.045, eyeGlow, 0.036, -0.02, 0, 0.2);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.05, -0.74);
  g.add(muzzle);
  let fireT = -9;
  let fired = false;
  g.userData = {
    muzzle, mag: hopper, glows: [fire], magRest: hopper.position.clone(), ammo, aimY: -0.2,
    hip: { x: 0.24, y: -0.24, z: -0.5 }, flashScale: 1.2,
  };
  g.userData.fire = () => (fired = true);
  // 換彈：一粒新南瓜由上面跌入玻璃斗
  g.userData.reload = (k) => {
    ammo.position.set(0, 0, 0);
    ammo.visible = true;
    if (k <= 0) return;
    if (k < 0.35) ammo.visible = false;
    else {
      const q = ease(clamp01((k - 0.35) / 0.5));
      ammo.position.y = (1 - q) * 0.3 + Math.sin(q * Math.PI) * 0.03;
      ammo.rotation.y = q * 6;
    }
  };
  g.userData.animate = (t) => {
    if (fired) {
      fired = false;
      fireT = t;
    }
    const f = clamp01(1 - (t - fireT) / 0.25);
    barrel.position.z = f * 0.08;
    mouthRing.scale.setScalar(1 + f * 0.5);
    mouthCore.material.emissiveIntensity = 1.6 + Math.sin(t * 4) * 0.5 + f * 4;
    eyeGlow.emissiveIntensity = 2.5 + Math.sin(t * 7) * 0.6 + f * 3;
    ammo.scale.setScalar(1 + Math.sin(t * 5) * 0.04);
    leaves.forEach((l, i) => (l.rotation.z = 0.6 + Math.sin(t * 2 + i) * 0.15));
  };
  return g;
}

// ---------- ❄️ Frost Wand（白銀魔杖 + 冰晶頭 + 轉緊嘅雪花圈）----------
function frostWand() {
  const g = new THREE.Group();
  const ICE = 0x80e8ff;
  const silver = METAL(0xe3f2fd, { metalness: 0.85, roughness: 0.2 });
  const wood = M(0xf1f8ff, { roughness: 0.4, metalness: 0.1 });
  const wrap = M(0x1e88e5, { roughness: 0.5, metalness: 0.1 });
  const ice = GLOW(ICE, 2.2);
  const iceSoft = GLOW(0xb3f0ff, 1.2, { transparent: true, opacity: 0.85 });
  const glass = GLASS(0xb3f0ff, { opacity: 0.45 });

  // ── 手柄：白色杖身 + 藍色繃帶纏住 ──
  cyl(g, 0.032, 0.04, 0.5, wood, 0, 0, -0.1, 12);
  for (let i = 0; i < 6; i++) cyl(g, 0.043, 0.043, 0.025, wrap, 0, 0, 0.06 - i * 0.045, 12).rotation.z = 0.2;
  ball(g, 0.05, silver, 0, 0, 0.17, 12); // 尾球
  ball(g, 0.025, ice, 0, 0, 0.215, 8);
  // 護手：雪花形銀片
  const guard = new THREE.Group();
  guard.position.z = -0.22;
  g.add(guard);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const arm = rbox(guard, 0.02, 0.1, 0.02, silver, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0, 0.4);
    arm.rotation.z = a - Math.PI / 2;
  }
  cyl(g, 0.05, 0.035, 0.06, silver, 0, 0, -0.27, 14);
  cyl(g, 0.028, 0.035, 0.18, wood, 0, 0, -0.38, 12);
  // ── 冰晶頭（換彈時縮細再大返）──
  const crystal = new THREE.Group();
  crystal.position.z = -0.52;
  g.add(crystal);
  const main = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), ice);
  main.scale.set(0.8, 0.8, 1.7);
  crystal.add(main);
  const shell = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), glass);
  shell.scale.set(0.8, 0.8, 1.6);
  crystal.add(shell);
  for (let i = 0; i < 5; i++) { // 細冰柱圍住
    const a = (i / 5) * Math.PI * 2;
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.12, 5), iceSoft);
    c.position.set(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.02);
    c.rotation.set(-Math.PI / 2 + Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    crystal.add(c);
  }
  // ── 雪花圈（兩個轉緊嘅圈 + 圍住飛嘅雪花碎）──
  const halo = new THREE.Group();
  halo.position.z = -0.5;
  g.add(halo);
  const r1 = ring(halo, 0.12, 0.007, ice, 0, 0, 0, 40);
  const r2 = ring(halo, 0.09, 0.005, iceSoft, 0, 0, 0, 40);
  const flakes = [];
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Group();
    for (let k = 0; k < 3; k++) rbox(f, 0.006, 0.04, 0.004, ice, 0, 0, 0, 0.3).rotation.z = (k * Math.PI) / 3;
    halo.add(f);
    flakes.push(f);
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, -0.66);
  g.add(muzzle);
  let fireT = -9;
  let fired = false;
  g.userData = {
    muzzle, mag: crystal, glows: [ice], magRest: crystal.position.clone(), aimY: -0.16,
    hip: { x: 0.22, y: -0.2, z: -0.48 }, flashScale: 0.6,
    tracer: { width: 0.08, length: 7, head: 0.55, speed: 260 },
  };
  g.userData.fire = () => (fired = true);
  g.userData.reload = (k) => {
    const s = k <= 0 ? 1 : k < 0.4 ? 1 - ease(k / 0.4) * 0.9 : 0.1 + ease(clamp01((k - 0.4) / 0.55)) * 0.9;
    crystal.scale.setScalar(s);
  };
  g.userData.animate = (t) => {
    if (fired) {
      fired = false;
      fireT = t;
    }
    const f = clamp01(1 - (t - fireT) / 0.1);
    r1.rotation.z = t * 1.5;
    r1.rotation.x = Math.sin(t * 1.3) * 0.4;
    r2.rotation.z = -t * 2.2;
    r2.rotation.y = Math.cos(t * 1.1) * 0.4;
    flakes.forEach((fl, i) => {
      const a = t * (1.2 + f * 3) + (i / 6) * Math.PI * 2;
      fl.position.set(Math.cos(a) * 0.15, Math.sin(a) * 0.15, Math.sin(t * 2 + i) * 0.05);
      fl.rotation.z = t * 3 + i;
    });
    main.rotation.z = t * 0.8;
    ice.emissiveIntensity = 2 + Math.sin(t * 3) * 0.4 + f * 2.5;
    crystal.position.z = g.userData.magRest.z + f * 0.025;
  };
  return g;
}

// ---------- ⚡ Lightning Staff（深色木杖 + 金色爪抓住一粒閃電球）----------
function lightningStaff() {
  const g = new THREE.Group();
  const wood = M(0x3e2a1e, { roughness: 0.8, metalness: 0 });
  const gold = METAL(0xffc94d, { metalness: 0.9, roughness: 0.22 });
  const dark = METAL(0x2a2440, { metalness: 0.6, roughness: 0.35 });
  const volt = GLOW(0xffee58, 2.6);
  const voltSoft = GLOW(0xfff59d, 1.4);
  const arcM = new THREE.MeshBasicMaterial({ color: 0xfffde7, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });

  // ── 杖身（彎彎哋嘅樹枝）+ 金圈 ──
  branch(g, [[0, -0.02, 0.32], [0.01, 0, 0.1], [-0.01, 0.01, -0.15], [0, 0.02, -0.42]], 0.035, 0.03, wood, 0.12, 7);
  for (const z of [0.22, -0.02, -0.3]) cyl(g, 0.042, 0.042, 0.03, gold, 0, 0.005, z, 14);
  // 手柄位：深色皮 + 金色閃電標誌
  cyl(g, 0.045, 0.045, 0.14, dark, 0, 0, 0.08, 14);
  const badge = new THREE.Shape();
  badge.moveTo(0.01, 0.05); badge.lineTo(-0.02, 0); badge.lineTo(0.005, 0); badge.lineTo(-0.012, -0.05); badge.lineTo(0.025, 0.008); badge.lineTo(0, 0.008); badge.lineTo(0.02, 0.05);
  const bm = new THREE.Mesh(new THREE.ExtrudeGeometry(badge, { depth: 0.008, bevelEnabled: false }), volt);
  bm.position.set(0.047, 0, 0.08);
  bm.rotation.y = Math.PI / 2;
  g.add(bm);
  // ── 金爪（三隻）抓住閃電球 ──
  const head = new THREE.Group();
  head.position.set(0, 0.02, -0.5);
  g.add(head);
  cyl(head, 0.05, 0.035, 0.07, gold, 0, 0, 0.06, 14);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const claw = new THREE.Group();
    claw.position.set(Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0.03);
    claw.rotation.set(-Math.sin(a) * 0.5, Math.cos(a) * 0.5, 0);
    head.add(claw);
    cyl(claw, 0.012, 0.016, 0.1, gold, 0, 0, -0.05, 8);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 6), gold);
    tip.rotation.x = -Math.PI / 2 - 0.7;
    tip.position.set(-Math.cos(a) * 0.015, -Math.sin(a) * 0.015, -0.11);
    claw.add(tip);
  }
  const orb = new THREE.Group();
  orb.position.z = -0.08;
  head.add(orb);
  const core = ball(orb, 0.045, volt, 0, 0, 0, 14);
  const shell = ball(orb, 0.065, GLASS(0xfff176, { opacity: 0.35 }), 0, 0, 0, 16);
  // 電弧：細細條白光，每格隨機重新擺位
  const arcs = [];
  for (let i = 0; i < 5; i++) {
    const a = rbox(orb, 0.005, 0.005, 0.06, arcM, 0, 0, 0, 0.2);
    arcs.push(a);
  }
  // 浮喺杖頭附近嘅細電球
  const sparksG = [];
  for (let i = 0; i < 3; i++) sparksG.push(ball(head, 0.012, voltSoft, 0, 0, 0, 6));
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.02, -0.6);
  g.add(muzzle);
  let fireT = -9;
  let fired = false;
  let charge = 1;
  g.userData = {
    muzzle, mag: orb, glows: [volt], magRest: orb.position.clone(), aimY: -0.15,
    hip: { x: 0.22, y: -0.22, z: -0.46 }, flashScale: 0.9,
  };
  g.userData.fire = () => (fired = true);
  g.userData.reload = (k) => (charge = k <= 0 ? 1 : k < 0.3 ? 1 - k / 0.3 : (k - 0.3) / 0.7);
  g.userData.animate = (t) => {
    if (fired) {
      fired = false;
      fireT = t;
    }
    const f = clamp01(1 - (t - fireT) / 0.15);
    orb.scale.setScalar(0.3 + charge * 0.7 + f * 0.3);
    core.material.emissiveIntensity = (1.8 + Math.sin(t * 25) * 0.6) * (0.3 + charge * 0.7) + f * 4;
    shell.rotation.y = t * 2;
    arcs.forEach((a) => {
      a.visible = Math.random() < 0.3 + charge * 0.5 + f;
      a.position.set((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08);
      a.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      a.scale.z = 0.6 + Math.random() * (1 + f * 2);
    });
    sparksG.forEach((s, i) => {
      const a = t * 4 + (i * Math.PI * 2) / 3;
      s.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, -0.06 + Math.sin(t * 6 + i) * 0.03);
    });
  };
  return g;
}

// ---------- 👻 Ghost Shotgun（雙管 + 玻璃艙入面有隻細鬼仔）----------
function ghostShotgun() {
  const g = new THREE.Group();
  const SPIRIT = 0xb9f6ff;
  const wood = M(0x5e3a6e, { roughness: 0.55, metalness: 0.1 });
  const plate = METAL(0x7e8fb8, { metalness: 0.7, roughness: 0.3 });
  const trim = METAL(0xd1d9ff, { metalness: 0.9, roughness: 0.2 });
  const spirit = GLOW(SPIRIT, 2.3);
  const spiritSoft = GLOW(0xe0f7fa, 1.2, { transparent: true, opacity: 0.8 });
  const dark = M(0x14101e, { roughness: 0.7 });

  // ── 雙管（換彈時「啪」一聲向下摺）──
  const barrels = new THREE.Group();
  barrels.position.set(0, 0.04, -0.06);
  g.add(barrels);
  for (const sx of [-1, 1]) {
    cyl(barrels, 0.045, 0.045, 0.56, plate, sx * 0.048, 0.02, -0.3, 16);
    cyl(barrels, 0.032, 0.032, 0.01, dark, sx * 0.048, 0.02, -0.585, 12);
    ring(barrels, 0.047, 0.012, spirit, sx * 0.048, 0.02, -0.58, 20);
    cyl(barrels, 0.05, 0.05, 0.04, trim, sx * 0.048, 0.02, -0.06, 16);
  }
  rbox(barrels, 0.03, 0.03, 0.5, trim, 0, 0.075, -0.3, 0.4); // 中間條肋
  // 槍管下面：鬼魂煙（發光波浪片）
  const wisps = [];
  for (let i = 0; i < 3; i++) {
    const w = ball(barrels, 0.03, spiritSoft, 0, -0.04, -0.15 - i * 0.14, 8);
    w.scale.set(1.6, 0.6, 1.2);
    wisps.push(w);
  }
  // ── 機身 + 玻璃艙（入面隻鬼仔）──
  rbox(g, 0.15, 0.15, 0.24, plate, 0, 0.0, 0.06, 0.3);
  rbox(g, 0.155, 0.03, 0.245, trim, 0, 0.06, 0.06, 0.3);
  const pod = new THREE.Group();
  pod.position.set(0, 0.13, 0.06);
  g.add(pod);
  vcyl(pod, 0.06, 0.06, 0.02, trim, 0, -0.04, 0, 16);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), GLASS(SPIRIT, { opacity: 0.3 }));
  dome.position.y = -0.035;
  pod.add(dome);
  const ghost = new THREE.Group();
  pod.add(ghost);
  ball(ghost, 0.032, spirit, 0, 0, 0, 12);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.04, 10), spirit);
  tail.position.y = -0.025;
  tail.rotation.x = Math.PI;
  ghost.add(tail);
  for (const sx of [-1, 1]) ball(ghost, 0.007, dark, sx * 0.012, 0.006, -0.028, 6);
  ball(ghost, 0.008, dark, 0, -0.01, -0.03, 6).scale.set(1, 1.3, 0.5); // 「O」嘴
  // ── 槍托 + 手柄 ──
  const stock = rbox(g, 0.1, 0.15, 0.3, wood, 0, -0.06, 0.3, 0.35);
  stock.rotation.x = 0.12;
  rbox(g, 0.105, 0.16, 0.03, dark, 0, -0.08, 0.45, 0.3).rotation.x = 0.12;
  for (let i = 0; i < 3; i++) ball(g, 0.012, spirit, 0.052, -0.05 - i * 0.03, 0.26 + i * 0.03, 6); // 鬼火燈
  const grip = rbox(g, 0.075, 0.17, 0.09, wood, 0, -0.12, 0.16, 0.35);
  grip.rotation.x = 0.35;
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 6, 14, Math.PI), trim);
  guard.rotation.set(0, Math.PI / 2, Math.PI);
  guard.position.set(0, -0.08, 0.08);
  g.add(guard);
  rbox(g, 0.09, 0.06, 0.24, wood, 0, -0.04, -0.3, 0.4); // 前手托

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.06, -0.66);
  g.add(muzzle);
  const eject = new THREE.Object3D();
  eject.position.set(0, 0.08, -0.04);
  g.add(eject);
  let fireT = -9;
  let fired = false;
  g.userData = {
    muzzle, mag: barrels, glows: [spirit], magRest: barrels.position.clone(), aimY: -0.16,
    hip: { x: 0.24, y: -0.23, z: -0.5 }, flashScale: 1.1,
    eject, shell: { colors: [SPIRIT, 0xe1bee7], size: 0.03 },
    tracer: { width: 0.035, length: 1.4, head: 0.42, speed: 150 },
  };
  g.userData.fire = () => (fired = true);
  // 換彈：槍管向下摺（break-action）→ 兩粒鬼魂彈飛入 → 摺返上
  g.userData.reload = (k) => {
    const o = k <= 0 ? 0 : k < 0.25 ? ease(k / 0.25) : k < 0.75 ? 1 : 1 - ease((k - 0.75) / 0.25);
    barrels.rotation.x = -o * 0.55;
  };
  g.userData.animate = (t) => {
    if (fired) {
      fired = false;
      fireT = t;
    }
    const f = clamp01(1 - (t - fireT) / 0.3);
    ghost.position.y = Math.sin(t * 3) * 0.008 + f * 0.02;
    ghost.rotation.y = Math.sin(t * 1.5) * 0.6;
    ghost.scale.setScalar(1 + f * 0.3); // 射嘢時鬼仔嚇一嚇
    spirit.emissiveIntensity = 2 + Math.sin(t * 4) * 0.4 + f * 3;
    wisps.forEach((w, i) => {
      w.position.y = -0.04 + Math.sin(t * 3 + i * 1.3) * 0.012;
      w.material.opacity = 0.5 + Math.sin(t * 4 + i) * 0.25;
    });
    if (barrels.rotation.x === 0) barrels.position.z = g.userData.magRest.z + f * 0.04;
  };
  return g;
}

// ---------- 🦇 Bat Swarm Bow（蝙蝠翼十字弓 + 發光弦 + 搭住一支蝙蝠箭）----------
function batBow() {
  const g = new THREE.Group();
  const BAT = 0xd05cff;
  const wood = M(0x2a1638, { roughness: 0.6, metalness: 0.1 });
  const wingM = M(0x3a1d52, { roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide });
  const bone = M(0x8a6aa8, { roughness: 0.5, metalness: 0.2 });
  const silver = METAL(0xcfc4e8, { metalness: 0.85, roughness: 0.25 });
  const glow = GLOW(BAT, 2.4);
  const eyeM = GLOW(0xff4081, 3);

  // ── 弓身（長嘅木托）──
  rbox(g, 0.08, 0.08, 0.62, wood, 0, 0, -0.12, 0.35);
  rbox(g, 0.085, 0.02, 0.6, silver, 0, 0.045, -0.12, 0.3);
  helix(g, 0.05, 0.18, 2.5, 0.006, glow, 0, 0, 0.1);
  // 頭：一個蝙蝠頭（耳 + 發光眼）
  const headG = new THREE.Group();
  headG.position.set(0, 0.0, -0.45);
  g.add(headG);
  ball(headG, 0.055, wood, 0, 0, 0, 12).scale.set(1.1, 0.95, 1.1);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 4), wood);
    ear.position.set(sx * 0.03, 0.06, 0);
    ear.rotation.z = -sx * 0.3;
    headG.add(ear);
    ball(headG, 0.011, eyeM, sx * 0.022, 0.01, -0.048, 6);
  }
  // ── 兩隻蝙蝠翼 = 弓臂 ──
  const wings = [];
  const wGeo = new THREE.ShapeGeometry(batWingShape(0.34, 0.16));
  for (const sx of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(sx * 0.04, 0.0, -0.4);
    w.scale.x = sx;
    g.add(w);
    const mesh = new THREE.Mesh(wGeo, wingM);
    mesh.rotation.x = -Math.PI / 2; // 平放（翼向兩邊伸）
    mesh.rotation.z = 0;
    w.add(mesh);
    // 翼骨
    for (let i = 0; i < 3; i++) {
      const b = rbox(w, 0.3 - i * 0.07, 0.01, 0.01, bone, (0.3 - i * 0.07) / 2, 0.006, -0.02 + i * 0.045, 0.3);
      b.rotation.y = -0.25 + i * 0.25;
    }
    ball(w, 0.014, glow, 0.34, 0, -0.11, 8); // 翼尖發光
    wings.push(w);
  }
  // ── 弦（由兩邊翼尖去中間）──
  const strings = [];
  const nock = new THREE.Object3D();
  nock.position.set(0, 0.06, -0.12);
  g.add(nock);
  const strMat = GLOW(0xf3c5ff, 2.4);
  for (const sx of [-1, 1]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 6), strMat);
    s.userData.tip = new THREE.Vector3(sx * 0.37, 0.0, -0.51);
    g.add(s);
    strings.push(s);
  }
  // ── 搭住嘅蝙蝠箭 ──
  const arrow = new THREE.Group();
  g.add(arrow);
  cyl(arrow, 0.008, 0.008, 0.36, silver, 0, 0.06, -0.3, 6);
  const bat = projectileModel('bat', BAT);
  bat.scale.setScalar(0.35);
  bat.position.set(0, 0.07, -0.5);
  arrow.add(bat);
  const up = new THREE.Vector3(0, 1, 0);
  const tmp = new THREE.Vector3();
  const placeStrings = () => strings.forEach((s) => {
    tmp.copy(nock.position).sub(s.userData.tip);
    s.position.copy(s.userData.tip).addScaledVector(tmp, 0.5);
    s.scale.set(1, tmp.length(), 1);
    s.quaternion.setFromUnitVectors(up, tmp.normalize());
  });
  placeStrings();
  // ── 手柄 ──
  const grip = rbox(g, 0.07, 0.17, 0.09, wood, 0, -0.1, 0.07, 0.35);
  grip.rotation.x = 0.3;
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.009, 6, 14, Math.PI), silver);
  guard.rotation.set(0, Math.PI / 2, Math.PI);
  guard.position.set(0, -0.06, -0.01);
  g.add(guard);
  rbox(g, 0.09, 0.12, 0.16, wood, 0, -0.03, 0.24, 0.35); // 托

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.07, -0.56);
  g.add(muzzle);
  let fireT = -9;
  let fired = false;
  g.userData = {
    muzzle, mag: arrow, glows: [glow, strMat], magRest: arrow.position.clone(), ammo: arrow, aimY: -0.2,
    hip: { x: 0.22, y: -0.22, z: -0.48 }, flashScale: 0.6,
  };
  g.userData.fire = () => (fired = true);
  // 換彈：新蝙蝠箭由後面飛返上弦
  g.userData.reload = (k) => {
    arrow.position.copy(g.userData.magRest);
    if (k <= 0) return;
    const q = ease(clamp01((k - 0.2) / 0.7));
    arrow.position.z += (1 - q) * 0.3;
    arrow.position.y += (1 - q) * 0.12;
  };
  g.userData.animate = (t) => {
    if (fired) {
      fired = false;
      fireT = t;
    }
    const s = t - fireT;
    const f = clamp01(1 - s / 0.2);
    // 弦：拉後；射完彈前少少再返
    nock.position.z = -0.12 + (s < 0.5 ? -Math.sin(s * 30) * Math.exp(-s * 8) * 0.06 : 0) + (1 - f) * 0.0;
    placeStrings();
    wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (Math.sin(t * 2.5) * 0.08 - f * 0.25)));
    bat.userData.fly?.(null, t, 0);
    glow.emissiveIntensity = 2 + Math.sin(t * 3) * 0.5 + f * 3;
  };
  return g;
}

// ---------- 會飛嘅彈：🎃 南瓜燈 · 🦇 蝙蝠（weapons.js 用 projectileModel）----------
//   userData.fly(v, t, dt)：每格叫（v = 速度，可以係 null）· userData.dispose()
export function projectileModel(kind, color = 0xff8f00) {
  const g = new THREE.Group();
  const mats = [];
  const keep = (m) => (mats.push(m), m);
  if (['dagger', 'potion', 'firework', 'angryOrb'].includes(kind)) projectileModel15(kind, color, g, keep); // Issue #15
  else if (kind === 'pumpkin') {
    const skin = keep(new THREE.MeshStandardMaterial({ color: 0xff8f00, emissive: 0xff6d00, emissiveIntensity: 0.5, roughness: 0.4 }));
    const face = keep(GLOW(0xffe082, 3.2));
    const stem = keep(M(0x2e7d32, { roughness: 0.6 }));
    const body = new THREE.Group();
    g.add(body);
    for (let i = 0; i < 6; i++) { // 一瓣瓣
      const lobe = ball(body, 0.2, skin, 0, 0, 0, 12);
      lobe.scale.set(0.55, 0.85, 1);
      lobe.rotation.y = (i / 6) * Math.PI;
    }
    vcyl(body, 0.025, 0.035, 0.1, stem, 0, 0.2, 0, 6);
    // 南瓜燈個樣：三角眼 + 鋸齒嘴（發光）
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.06, 3), face);
      eye.position.set(sx * 0.07, 0.05, -0.18);
      eye.rotation.x = Math.PI / 2;
      eye.rotation.y = Math.PI;
      body.add(eye);
    }
    rbox(body, 0.18, 0.04, 0.03, face, 0, -0.06, -0.185, 0.3);
    for (const x of [-0.05, 0.05]) rbox(body, 0.035, 0.035, 0.03, face, x, -0.03, -0.19, 0.2);
    const halo = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })));
    halo.scale.setScalar(0.9);
    g.add(halo);
    g.userData.fly = (v, t, dt) => {
      body.rotation.x += dt * 9;
      body.rotation.y += dt * 4;
      face.emissiveIntensity = 2.5 + Math.sin(t * 20) * 0.8;
    };
  } else { // 🦇 bat
    const fur = keep(M(0x2a1638, { roughness: 0.6 }));
    const wingM = keep(new THREE.MeshStandardMaterial({ color: 0x4a2470, emissive: color, emissiveIntensity: 0.6, roughness: 0.5, side: THREE.DoubleSide }));
    const eyes = keep(GLOW(0xff4081, 3.2));
    const body = ball(g, 0.09, fur, 0, 0, 0, 10);
    body.scale.set(0.9, 0.85, 1.3);
    ball(g, 0.07, fur, 0, 0.03, -0.1, 10);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 4), fur);
      ear.position.set(sx * 0.035, 0.1, -0.1);
      g.add(ear);
      ball(g, 0.014, eyes, sx * 0.028, 0.045, -0.16, 6);
    }
    const wGeo = new THREE.ShapeGeometry(batWingShape(0.36, 0.22));
    const wings = [-1, 1].map((sx) => {
      const w = new THREE.Group();
      w.position.set(sx * 0.05, 0.02, 0);
      w.scale.x = sx;
      g.add(w);
      const m = new THREE.Mesh(wGeo, wingM);
      m.rotation.x = -Math.PI / 2;
      m.position.z = 0.1;
      w.add(m);
      return w;
    });
    const halo = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));
    halo.scale.setScalar(0.8);
    g.add(halo);
    const look = new THREE.Vector3();
    g.userData.fly = (v, t) => {
      const flap = Math.sin(t * 32) * 0.9;
      wings[0].rotation.z = flap;
      wings[1].rotation.z = -flap;
      if (v) g.lookAt(look.copy(g.position).sub(v)); // 個頭（-z）向住飛嘅方向
    };
    wingM.userData.keep = true;
  }
  g.userData.dispose = () => mats.forEach((m) => m.dispose());
  return g;
}

// ======================== Issue #15（小朋友 2026-10-25）：再多 5 支魔法武器 ========================
// 龍鱗紋（Dragon Breath）
const scaleTex = () => canvasTex('dragonScale', 64, 64, (g) => {
  g.fillStyle = '#2e7d32';
  g.fillRect(0, 0, 64, 64);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const x = col * 16 + (row % 2 ? 8 : 0) - 8;
      const y = row * 14 - 4;
      const gr = g.createRadialGradient(x + 8, y + 4, 1, x + 8, y + 8, 12);
      gr.addColorStop(0, '#81c784');
      gr.addColorStop(0.7, '#388e3c');
      gr.addColorStop(1, '#1b5e20');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x + 8, y + 4, 9, 0, Math.PI);
      g.fill();
      g.strokeStyle = 'rgba(10,40,12,0.7)';
      g.lineWidth = 1.5;
      g.stroke();
    }
  }
}, true);
// 煙花筒紋（紅白斜紋 + 金星）
const fireworkTex = () => canvasTex('fireworkTube', 128, 64, (g) => {
  g.fillStyle = '#c62828';
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#fff3e0';
  for (let i = -64; i < 160; i += 32) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 12, 0);
    g.lineTo(i + 44, 64);
    g.lineTo(i + 32, 64);
    g.fill();
  }
  g.fillStyle = '#ffd740';
  const star = (cx, cy, r) => {
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = k % 2 ? r * 0.45 : r;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.fill();
  };
  star(20, 18, 9); star(64, 46, 9); star(104, 16, 9);
  g.fillStyle = '#1565c0';
  g.fillRect(0, 0, 128, 5);
  g.fillRect(0, 59, 128, 5);
}, true);
// 一條會閃嘅細火舌（兩塊交叉 plane，面向 -z 噴）：回傳 { group, mats }
function pilotFlame(parent, x, y, z, size = 0.12) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  parent.add(grp);
  const mats = [];
  for (const [col, sc] of [[0xff6d00, 1], [0xffe082, 0.55]]) {
    for (const rz of [0, Math.PI / 2]) {
      const m = new THREE.MeshBasicMaterial({ map: flameTexture(), color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.6 * sc, size * 1.6 * sc), m);
      p.rotation.order = 'ZXY';
      p.rotation.set(-Math.PI / 2, 0, rz);
      p.position.z = -size * 0.7 * sc;
      grp.add(p);
      mats.push(m);
    }
  }
  return { group: grp, mats };
}

// ---------- 🐉 Dragon Breath（龍頭噴火器：後面一個岩漿玻璃球，前面龍頭，噴火時張口）----------
function dragonBreath() {
  const g = new THREE.Group();
  const scales = new THREE.MeshStandardMaterial({ map: scaleTex(), roughness: 0.5, metalness: 0.15 });
  const belly = M(0xd4e157, { roughness: 0.5, metalness: 0.05 });
  const green = M(0x2e7d32, { roughness: 0.45, metalness: 0.15 });
  const greenDark = M(0x1b4d20, { roughness: 0.55, metalness: 0.1 });
  const gold = METAL(0xffc94d, { metalness: 0.9, roughness: 0.22 });
  const horn = M(0xfff3d6, { roughness: 0.35, metalness: 0.05 });
  const frill = M(0x8e24aa, { roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide });
  const dark = M(0x1a1426, { roughness: 0.8 });
  const lava = GLOW(0xff7a1a, 2.6);
  const lavaHot = GLOW(0xffd54f, 2.4);
  const eye = GLOW(0xffea00, 3);
  const mouthGlow = GLOW(0xff6d00, 2.2);

  // ── 身（龍鱗管）+ 金圈 ──
  cyl(g, 0.085, 0.075, 0.5, scales, 0, 0.03, -0.12, 18);
  for (const z of [0.08, -0.16, -0.36]) cyl(g, 0.093, 0.093, 0.03, gold, 0, 0.03, z, 18);
  rbox(g, 0.1, 0.05, 0.44, belly, 0, -0.035, -0.12, 0.4); // 肚（淺色）
  // 背脊尖刺
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07 - i * 0.006, 5), frill);
    sp.position.set(0, 0.125, 0.12 - i * 0.11);
    sp.rotation.x = -0.4;
    g.add(sp);
  }
  // ── 龍頭（向 -z）──
  const head = new THREE.Group();
  head.position.set(0, 0.045, -0.43);
  head.scale.setScalar(1.3);
  g.add(head);
  rbox(head, 0.16, 0.12, 0.16, green, 0, 0.01, 0, 0.4); // 頭殼
  rbox(head, 0.12, 0.07, 0.16, green, 0, 0.015, -0.12, 0.35); // 上顎（長嘴）
  rbox(head, 0.125, 0.02, 0.15, greenDark, 0, 0.055, -0.11, 0.3); // 鼻樑
  for (const sx of [-1, 1]) {
    ball(head, 0.012, lavaHot, sx * 0.03, 0.04, -0.2, 6); // 鼻孔（發光）
    // 眼：發光黃 + 黑色直瞳
    ball(head, 0.026, eye, sx * 0.07, 0.05, -0.02, 10);
    rbox(head, 0.006, 0.03, 0.006, dark, sx * 0.093, 0.05, -0.022, 0.3);
    rbox(head, 0.045, 0.012, 0.04, greenDark, sx * 0.06, 0.08, -0.02, 0.3).rotation.z = sx * -0.35; // 眉骨（型啲）
    // 角：向後彎
    const h1 = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.16, 8), horn);
    h1.position.set(sx * 0.05, 0.1, 0.07);
    h1.rotation.set(1.1, 0, sx * -0.35);
    head.add(h1);
    const h2 = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.08, 6), horn);
    h2.position.set(sx * 0.085, 0.06, 0.06);
    h2.rotation.set(1.3, 0, sx * -0.9);
    head.add(h2);
    // 耳鰭（紫色）
    const fr = new THREE.Shape();
    fr.moveTo(0, 0); fr.lineTo(0.09, 0.03); fr.lineTo(0.07, -0.01); fr.lineTo(0.1, -0.04); fr.lineTo(0, -0.04);
    const fm = new THREE.Mesh(new THREE.ShapeGeometry(fr), frill);
    fm.position.set(sx * 0.08, 0.0, 0.05);
    fm.rotation.set(0, sx > 0 ? -Math.PI / 2 + 0.5 : Math.PI / 2 - 0.5, 0);
    head.add(fm);
  }
  // 上排牙
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.025, 4), horn);
    t.position.set(sx * 0.045, -0.025, -0.08 - i * 0.04);
    t.rotation.x = Math.PI;
    head.add(t);
  }
  // 下顎（噴火時張開）
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.03, 0.02);
  head.add(jaw);
  rbox(jaw, 0.11, 0.035, 0.2, green, 0, -0.02, -0.1, 0.35);
  rbox(jaw, 0.08, 0.01, 0.17, mouthGlow, 0, 0.0, -0.1, 0.3); // 口入面（發光）
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.022, 4), horn);
    t.position.set(sx * 0.04, 0.012, -0.08 - i * 0.045);
    jaw.add(t);
  }
  const throat = ball(head, 0.04, mouthGlow, 0, -0.01, -0.14, 10); // 喉嚨入面嘅火光
  throat.scale.set(1, 0.6, 1.4);
  const pilot = pilotFlame(head, 0, -0.005, -0.22, 0.12); // 口度一路有細火
  // ── 後面：岩漿玻璃球（燃料）+ 金籠 ──
  const tank = new THREE.Group();
  tank.position.set(0, 0.075, 0.2);
  tank.scale.setScalar(0.8);
  g.add(tank);
  const core = ball(tank, 0.075, lava, 0, 0, 0, 16);
  const swirl = helix(tank, 0.06, 0.12, 2, 0.008, lavaHot, 0, 0, 0);
  ball(tank, 0.1, GLASS(0xffab40, { opacity: 0.3 }), 0, 0, 0, 18);
  for (let i = 0; i < 3; i++) {
    const r = ring(tank, 0.102, 0.008, gold, 0, 0, 0, 30);
    r.rotation.y = (i / 3) * Math.PI;
  }
  vcyl(tank, 0.05, 0.065, 0.04, gold, 0, -0.1, 0, 14);
  const bubbles = [];
  for (let i = 0; i < 4; i++) bubbles.push(ball(tank, 0.012, lavaHot, 0, 0, 0, 6));
  // ── 手柄、扳機、前扶手、尾 ──
  rbox(g, 0.12, 0.1, 0.2, greenDark, 0, -0.02, 0.2, 0.35);
  const grip = rbox(g, 0.075, 0.18, 0.09, dark, 0, -0.14, 0.18, 0.35);
  grip.rotation.x = 0.3;
  rbox(g, 0.085, 0.025, 0.1, gold, 0, -0.23, 0.21, 0.3).rotation.x = 0.3;
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 6, 14, Math.PI), gold);
  guard.rotation.set(0, Math.PI / 2, Math.PI);
  guard.position.set(0, -0.08, 0.1);
  g.add(guard);
  rbox(g, 0.06, 0.13, 0.07, dark, 0, -0.09, -0.2, 0.4).rotation.x = -0.15;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 10), scales); // 尾（後面）
  tail.position.set(0, 0.0, 0.4);
  tail.rotation.x = Math.PI / 2 + 0.25;
  g.add(tail);
  const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.06, 4), frill);
  tailTip.position.set(0, -0.03, 0.52);
  tailTip.rotation.x = Math.PI / 2 + 0.25;
  g.add(tailTip);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.03, -0.74);
  g.add(muzzle);
  let fireT = -9;
  let fired = false;
  g.userData = {
    muzzle, mag: tank, glows: [lava, mouthGlow], magRest: tank.position.clone(), aimY: -0.2,
    hip: { x: 0.24, y: -0.25, z: -0.5 }, flashScale: 0.35,
  };
  g.userData.fire = () => (fired = true);
  // 換彈：岩漿球縮細（用晒）→ 再大返、變返好光
  g.userData.reload = (k) => {
    const s = k <= 0 ? 1 : k < 0.3 ? 1 - ease(k / 0.3) * 0.7 : 0.3 + ease(clamp01((k - 0.3) / 0.6)) * 0.7;
    core.scale.setScalar(s);
    swirl.scale.setScalar(s);
  };
  g.userData.animate = (t) => {
    if (fired) {
      fired = false;
      fireT = t;
    }
    const f = clamp01(1 - (t - fireT) / 0.18); // 噴緊火 ≈ 1
    jaw.rotation.x = THREE.MathUtils.lerp(jaw.rotation.x, f > 0 ? 0.55 : 0.06 + Math.sin(t * 2) * 0.03, 0.3);
    swirl.rotation.z = t * 4;
    lava.emissiveIntensity = 2.2 + Math.sin(t * 5) * 0.4 + f * 1.5;
    mouthGlow.emissiveIntensity = 1.8 + f * 3 + Math.sin(t * 17) * 0.3;
    eye.emissiveIntensity = 2.6 + f * 2;
    const flick = 0.8 + Math.sin(t * 31) * 0.15 + Math.sin(t * 47) * 0.1;
    pilot.group.scale.set(flick * (1 + f * 0.8), flick * (1 + f * 0.8), flick * (1 + f * 3.5)); // 噴緊火：口度條火舌拉長
    pilot.mats.forEach((m) => (m.opacity = 0.75 + f * 0.25));
    bubbles.forEach((b, i) => {
      const k = (t * 0.6 + i / 4) % 1;
      b.position.set(Math.sin(i * 2.1 + t) * 0.03, -0.06 + k * 0.12, Math.cos(i * 1.7) * 0.03);
      b.scale.setScalar(1 - k * 0.7);
    });
  };
  return g;
}

// ---------- 🗡️ Spirit Daggers（手上一把鬼魂匕首 + 兩把喺隔籬浮住；掟晒之後再「變」返出嚟）----------
function daggerShape(len = 0.26, w = 0.045) {
  const s = new THREE.Shape(); // 刀身（葉形），喺 xy 平面，尖向 +y
  s.moveTo(0, len);
  s.quadraticCurveTo(w * 1.2, len * 0.55, w, 0.02);
  s.lineTo(w * 0.6, 0);
  s.lineTo(-w * 0.6, 0);
  s.lineTo(-w, 0.02);
  s.quadraticCurveTo(-w * 1.2, len * 0.55, 0, len);
  return s;
}
// 一把匕首（刀尖向 -z）：回傳 { group, blade }
function spiritDagger(parent, mats, len = 0.26) {
  const d = new THREE.Group();
  parent.add(d);
  const bladeGeo = new THREE.ExtrudeGeometry(daggerShape(len, len * 0.22), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2 });
  bladeGeo.translate(0, 0, -0.006);
  const blade = new THREE.Mesh(bladeGeo, mats.blade);
  blade.rotation.x = -Math.PI / 2; // +y → -z
  d.add(blade);
  const coreGeo = new THREE.ExtrudeGeometry(daggerShape(len * 0.85, len * 0.05), { depth: 0.002, bevelEnabled: false });
  const core = new THREE.Mesh(coreGeo, mats.core);
  core.rotation.x = -Math.PI / 2;
  core.position.y = 0.007;
  d.add(core);
  // 護手：兩邊彎彎嘅銀翼 + 中間一粒寶石
  for (const sx of [-1, 1]) {
    const wing = rbox(d, 0.07, 0.022, 0.025, mats.silver, sx * 0.045, 0, 0.012, 0.4);
    wing.rotation.y = sx * 0.35;
    ball(d, 0.012, mats.core, sx * 0.08, 0, 0.03, 6);
  }
  ball(d, 0.018, mats.gem, 0, 0.012, 0.01, 10);
  // 手柄（纏住）+ 尾珠
  cyl(d, 0.017, 0.019, 0.1, mats.wrap, 0, 0, 0.07, 10);
  for (let i = 0; i < 4; i++) cyl(d, 0.021, 0.021, 0.008, mats.silver, 0, 0, 0.03 + i * 0.026, 10);
  ball(d, 0.024, mats.silver, 0, 0, 0.13, 10);
  ball(d, 0.012, mats.gem, 0, 0, 0.152, 8);
  return { group: d, blade };
}
function daggerMats() {
  return {
    blade: new THREE.MeshStandardMaterial({ color: 0xb2fbff, emissive: 0x40e0ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.72, roughness: 0.1, metalness: 0.2 }),
    core: GLOW(0xe0ffff, 2.6),
    silver: METAL(0xdfe6f5, { metalness: 0.9, roughness: 0.2 }),
    wrap: M(0x3a2a6a, { roughness: 0.7 }),
    gem: GLOW(0x7c4dff, 2.4),
  };
}
function spiritDaggers() {
  const g = new THREE.Group();
  const mats = daggerMats();
  // 手柄位：轉緊嘅鬼火符文圈（隻手握住把刀）
  const runeRing = ring(g, 0.06, 0.006, mats.core, 0, 0, 0.04, 30);
  const runeRing2 = ring(g, 0.075, 0.004, mats.gem, 0, 0, 0.06, 30);
  // 手上嗰把（中間）
  const hand = new THREE.Group();
  hand.position.set(0, 0, -0.02);
  g.add(hand);
  const main = spiritDagger(hand, mats, 0.3);
  main.group.position.z = -0.08;
  // 兩把浮喺隔籬（轉緊）
  const floats = [-1, 1].map((sx) => {
    const p = new THREE.Group();
    p.position.set(sx * 0.13, 0.06, -0.06);
    g.add(p);
    const d = spiritDagger(p, mats, 0.22);
    d.group.rotation.z = sx * 0.3;
    return p;
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x40e0ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(0.4);
  halo.position.set(0, 0, -0.25);
  g.add(halo);
  const wisps = [];
  for (let i = 0; i < 5; i++) wisps.push(ball(g, 0.01, mats.core, 0, 0, 0, 6));

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, -0.42);
  g.add(muzzle);
  let fireT = -9;
  let fired = false;
  let back = 1; // 0 = 啱啱掟咗（冇刀）→ 1 = 變返出嚟
  g.userData = {
    muzzle, glows: [mats.core, mats.gem], aimY: -0.14,
    hip: { x: 0.22, y: -0.2, z: -0.46 }, flashScale: 0.35,
  };
  g.userData.fire = () => (fired = true);
  // 換彈：三把刀由兩邊轉返入嚟
  let reloadK = 0;
  g.userData.reload = (k) => (reloadK = k);
  g.userData.animate = (t) => {
    if (fired) {
      fired = false;
      fireT = t;
    }
    const since = t - fireT;
    back = reloadK > 0 ? ease(clamp01((reloadK - 0.3) / 0.6)) : ease(clamp01((since - 0.08) / 0.25));
    const spin = reloadK > 0 ? (1 - back) * 9 : 0;
    hand.scale.setScalar(Math.max(0.001, back));
    hand.rotation.z = spin;
    floats.forEach((p, i) => {
      const sx = i ? 1 : -1;
      p.scale.setScalar(Math.max(0.001, back));
      p.position.set(sx * (0.13 + (1 - back) * 0.2), 0.06 + Math.sin(t * 2.4 + i * 2) * 0.015, -0.06);
      p.rotation.set(Math.sin(t * 1.7 + i) * 0.12, sx * 0.08, spin * sx);
    });
    mats.blade.opacity = 0.6 + Math.sin(t * 3) * 0.12;
    mats.core.emissiveIntensity = 2.2 + Math.sin(t * 4) * 0.5 + clamp01(1 - since / 0.2) * 3;
    halo.material.opacity = 0.25 + Math.sin(t * 3) * 0.08;
    runeRing.rotation.set(Math.sin(t * 1.3) * 0.4, t * 2, 0);
    runeRing2.rotation.set(t * 1.6, Math.cos(t) * 0.5, 0);
    wisps.forEach((w, i) => {
      const a = t * 2 + (i / 5) * Math.PI * 2;
      w.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, -0.15 - Math.sin(t * 3 + i) * 0.08);
    });
  };
  return g;
}

// ---------- 🧪 Fire Potion（金籠提住一樽發光岩漿藥水，木塞上面有粒細火）----------
// 一樽藥水（樽口向 +y）：回傳 { group, liquid, bubbles, flame }
function potionBottle(parent, s = 1) {
  const p = new THREE.Group();
  parent.add(p);
  const liquidM = new THREE.MeshStandardMaterial({ color: 0xff3d00, emissive: 0xff3d00, emissiveIntensity: 1.3, roughness: 0.2 });
  const liquidTop = GLOW(0xffd54f, 2);
  const glass = GLASS(0xfff3e0, { opacity: 0.22, emissiveIntensity: 0.1 });
  const cork = M(0x8d6e63, { roughness: 0.9 });
  const label = M(0xfff3e0, { roughness: 0.8, side: THREE.DoubleSide });
  const liquid = ball(p, 0.082 * s, liquidM, 0, -0.008 * s, 0, 16);
  liquid.scale.y = 0.8;
  vcyl(p, 0.066 * s, 0.066 * s, 0.006 * s, liquidTop, 0, 0.05 * s, 0, 18); // 液面（發光）
  ball(p, 0.1 * s, glass, 0, 0, 0, 18);
  vcyl(p, 0.03 * s, 0.035 * s, 0.09 * s, glass, 0, 0.12 * s, 0, 12);
  vcyl(p, 0.038 * s, 0.038 * s, 0.015 * s, METAL(0xffc94d), 0, 0.165 * s, 0, 12); // 樽口金邊
  vcyl(p, 0.028 * s, 0.024 * s, 0.05 * s, cork, 0, 0.19 * s, 0, 10);
  // 標籤：骷髏 → 改做火焰符號（魔法藥水）
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.102 * s, 0.102 * s, 0.045 * s, 18, 1, true, Math.PI - 0.55, 1.1), label); // 標籤（向住玩家，+z）
  p.add(lab);
  const sym = new THREE.Mesh(new THREE.ConeGeometry(0.013 * s, 0.03 * s, 6), GLOW(0xff6d00, 2)); // 火焰符號
  sym.position.set(0, 0, 0.106 * s);
  p.add(sym);
  const bubbles = [];
  for (let i = 0; i < 5; i++) bubbles.push(ball(p, 0.01 * s, liquidTop, 0, 0, 0, 6));
  const flame = pilotFlame(p, 0, 0.215 * s, 0, 0.09 * s);
  flame.group.rotation.x = -Math.PI / 2; // 細火向上
  return { group: p, liquid, liquidM, bubbles, flame };
}
function firePotion() {
  const g = new THREE.Group();
  const gold = METAL(0xffc94d, { metalness: 0.9, roughness: 0.22 });
  const iron = METAL(0x3b3346, { metalness: 0.7, roughness: 0.35 });
  const leather = new THREE.MeshStandardMaterial({ map: leatherTex(), roughness: 0.8 });
  // 手柄（皮）+ 金托
  const grip = rbox(g, 0.075, 0.2, 0.085, leather, 0, -0.13, 0.04, 0.4);
  grip.rotation.x = 0.15;
  vcyl(g, 0.11, 0.08, 0.04, gold, 0, -0.02, -0.02, 18);
  ring(g, 0.11, 0.012, iron, 0, 0, -0.02, 30).rotation.x = Math.PI / 2;
  // 金籠（三條彎骨）
  const cage = new THREE.Group();
  cage.position.set(0, 0.1, -0.02);
  g.add(cage);
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.007, 6, 24, Math.PI), gold);
    r.rotation.y = (i / 3) * Math.PI;
    r.position.y = -0.02;
    cage.add(r);
  }
  // 藥水（彈藥）
  const ammo = new THREE.Group();
  ammo.position.set(0, 0.1, -0.02);
  g.add(ammo);
  const bottle = potionBottle(ammo, 1);
  // 後備藥水（手柄隔籬掛住兩樽細嘅：剩幾多就見幾多）
  const spare = [-1, 1].map((sx) => {
    const holder = new THREE.Group();
    holder.position.set(sx * 0.088, -0.1, 0.1);
    g.add(holder);
    const b = potionBottle(holder, 0.38);
    b.flame.group.visible = false;
    return holder;
  });

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.12, -0.14);
  g.add(muzzle);
  let fireT = -9;
  let fired = false;
  g.userData = {
    muzzle, glows: [bottle.liquidM], aimY: -0.18, ammo,
    hip: { x: 0.24, y: -0.24, z: -0.46 }, flashScale: 0.3,
  };
  g.userData.fire = () => (fired = true);
  let reloadK = 0;
  g.userData.reload = (k) => (reloadK = k);
  g.userData.ammoCount = (n) => spare.forEach((s, i) => (s.visible = n > i + 1)); // 腰帶上仲有幾樽
  g.userData.animate = (t) => {
    if (fired) {
      fired = false;
      fireT = t;
    }
    const since = t - fireT;
    // 掟咗：樽冇咗 → 0.25 秒後由下面升返上嚟一樽新嘅
    const k = reloadK > 0 ? ease(clamp01((reloadK - 0.4) / 0.5)) : ease(clamp01((since - 0.25) / 0.3));
    bottle.group.position.y = (1 - k) * -0.25;
    bottle.group.scale.setScalar(Math.max(0.001, k));
    bottle.group.rotation.y = t * 0.6;
    bottle.liquid.scale.set(1 + Math.sin(t * 5) * 0.03, 0.85 + Math.sin(t * 4) * 0.04, 1);
    bottle.liquidM.emissiveIntensity = 2 + Math.sin(t * 6) * 0.5;
    bottle.bubbles.forEach((b, i) => {
      const q = (t * 0.8 + i / 5) % 1;
      b.position.set(Math.sin(i * 2.3) * 0.04, -0.06 + q * 0.11, Math.cos(i * 1.9) * 0.04);
      b.scale.setScalar(1 - q * 0.6);
    });
    const fl = 0.85 + Math.sin(t * 29) * 0.15;
    bottle.flame.group.scale.setScalar(fl);
  };
  return g;
}

// ---------- 🎆 Firework Launcher（紅白星星煙花筒 + 前面探出個火箭頭；旁邊掛住後備煙花）----------
// 一支煙花火箭（頭向 -z）：回傳 group（userData.exhaust）
function fireworkRocket(parent, s = 1) {
  const r = new THREE.Group();
  parent.add(r);
  const body = new THREE.MeshStandardMaterial({ map: fireworkTex(), roughness: 0.45, metalness: 0.1 });
  const nose = M(0xffd740, { roughness: 0.3, metalness: 0.4 });
  const fin = M(0x1565c0, { roughness: 0.4, metalness: 0.2 });
  cyl(r, 0.045 * s, 0.045 * s, 0.22 * s, body, 0, 0, 0, 16);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.047 * s, 0.1 * s, 16), nose);
  cone.rotation.x = -Math.PI / 2;
  cone.position.z = -0.16 * s;
  r.add(cone);
  ball(r, 0.012 * s, GLOW(0xffffff, 2), 0, 0, -0.21 * s, 6);
  for (let i = 0; i < 4; i++) {
    const f = rbox(r, 0.006 * s, 0.05 * s, 0.06 * s, fin, 0, 0, 0.1 * s, 0.3);
    f.position.set(Math.cos((i / 4) * Math.PI * 2) * 0.05 * s, Math.sin((i / 4) * Math.PI * 2) * 0.05 * s, 0.1 * s);
    f.rotation.z = (i / 4) * Math.PI * 2 + Math.PI / 2;
  }
  cyl(r, 0.03 * s, 0.038 * s, 0.03 * s, METAL(0x9e9e9e), 0, 0, 0.125 * s, 12);
  return r;
}
function fireworkLauncher() {
  const g = new THREE.Group();
  const tubeM = new THREE.MeshStandardMaterial({ map: fireworkTex(), roughness: 0.5, metalness: 0.1 });
  const navy = M(0x1a237e, { roughness: 0.45, metalness: 0.25 });
  const gold = METAL(0xffc94d, { metalness: 0.9, roughness: 0.22 });
  const dark = M(0x15131f, { roughness: 0.8 });
  const sparkle = GLOW(0xff4fd8, 2.4);
  const starM = GLOW(0xffea00, 2.4);

  // ── 大炮筒（扛喺膊頭）──
  const tube = new THREE.Group();
  g.add(tube);
  cyl(tube, 0.09, 0.09, 0.78, tubeM, 0, 0.07, -0.14, 22);
  cyl(tube, 0.075, 0.075, 0.79, dark, 0, 0.07, -0.14, 18, true); // 入面黑色
  for (const z of [-0.5, 0.22]) cyl(tube, 0.1, 0.1, 0.05, gold, 0, 0.07, z, 22);
  const mouth = ring(tube, 0.092, 0.016, sparkle, 0, 0.07, -0.535, 30); // 前面發光圈
  ring(tube, 0.092, 0.014, GLOW(0xff6d00, 2), 0, 0.07, 0.25, 30); // 後面（火箭尾噴氣口）
  // 前面探出嚟嘅火箭頭（彈藥）
  const ammo = new THREE.Group();
  ammo.position.set(0, 0.07, -0.44);
  g.add(ammo);
  fireworkRocket(ammo, 1.3);
  // ── 瞄準器（星形）──
  vcyl(g, 0.012, 0.012, 0.06, gold, 0, 0.18, -0.3, 8);
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry((() => {
    const s = new THREE.Shape();
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
      const rr = k % 2 ? 0.014 : 0.032;
      if (k === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    return s;
  })(), { depth: 0.008, bevelEnabled: false }), starM);
  star.position.set(0, 0.23, -0.3);
  g.add(star);
  // ── 手柄 + 扳機 + 前扶手 ──
  rbox(g, 0.1, 0.06, 0.24, navy, 0, -0.03, 0.02, 0.35);
  const grip = rbox(g, 0.07, 0.17, 0.085, navy, 0, -0.13, 0.08, 0.35);
  grip.rotation.x = 0.3;
  rbox(g, 0.08, 0.025, 0.095, gold, 0, -0.22, 0.11, 0.3).rotation.x = 0.3;
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 6, 14, Math.PI), gold);
  guard.rotation.set(0, Math.PI / 2, Math.PI);
  guard.position.set(0, -0.07, 0.0);
  g.add(guard);
  const fore = rbox(g, 0.06, 0.14, 0.07, navy, 0, -0.08, -0.28, 0.4);
  fore.rotation.x = -0.2;
  // ── 側面掛住後備煙花（剩幾多發就掛幾多支）──
  const spares = [];
  for (let i = 0; i < 3; i++) {
    const holder = new THREE.Group();
    holder.position.set(0.125, 0.03 - i * 0.0, -0.05 - i * 0.09);
    holder.rotation.x = 0;
    g.add(holder);
    fireworkRocket(holder, 0.55);
    spares.push(holder);
  }
  rbox(g, 0.02, 0.05, 0.3, gold, 0.1, 0.03, -0.14, 0.3);
  // 一粒粒閃光（筒身上面嘅 LED 星）
  const leds = [];
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    const l = ball(tube, 0.011, GLOW([0xff1744, 0xffea00, 0x00e5ff, 0x76ff03, 0xd500f9][i], 2.5), -Math.sin(a) * 0.094, 0.07 + Math.cos(a) * 0.094, -0.4, 6);
    leds.push(l);
  }

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.07, -0.6);
  g.add(muzzle);
  let fireT = -9;
  let fired = false;
  g.userData = {
    muzzle, glows: [sparkle], aimY: -0.24, ammo,
    hip: { x: 0.26, y: -0.24, z: -0.5 }, flashScale: 1.1,
  };
  g.userData.fire = () => (fired = true);
  // 換彈：新火箭由後面塞入去，滑去前面
  let reloadK = 0;
  g.userData.reload = (k) => (reloadK = k);
  g.userData.ammoCount = (n) => spares.forEach((s, i) => (s.visible = i < n - 1)); // 側面嘅後備：前面嗰支以外仲有幾多支
  g.userData.animate = (t) => {
    if (fired) {
      fired = false;
      fireT = t;
    }
    const f = clamp01(1 - (t - fireT) / 0.3);
    // 射咗：前面嗰支飛走咗 → 下一支由後面滑入去（換彈都係咁）
    const q = reloadK > 0 ? ease(clamp01((reloadK - 0.3) / 0.6)) : ease(clamp01((t - fireT - 0.2) / 0.4));
    ammo.position.z = THREE.MathUtils.lerp(0.3, -0.44, q);
    ammo.visible = ammo.visible && q > 0.02;
    tube.position.z = f * 0.06;
    mouth.scale.setScalar(1 + f * 0.4);
    sparkle.emissiveIntensity = 2 + Math.sin(t * 6) * 0.6 + f * 3;
    star.rotation.z = Math.sin(t * 2) * 0.2;
    leds.forEach((l, i) => (l.material.emissiveIntensity = Math.sin(t * 6 + i * 1.3) > 0 ? 3 : 0.6));
  };
  return g;
}

// ---------- 😡 Angry Spell（扭紋黑木杖 + 爪抓住一粒「嬲嬲」紅波，有眉有嘴，頂會出煙）----------
// 嬲嬲波：塊嬲嬲面向 +z（向住玩家：拎住時、掟出去飛走時都睇到佢個樣）：回傳 { group, face, orbM }
function angryOrb(parent, r = 0.08) {
  const o = new THREE.Group();
  parent.add(o);
  const orbM = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xd50000, emissiveIntensity: 1.1, roughness: 0.35 });
  const brow = M(0x2a0a12, { roughness: 0.6 });
  const white = GLOW(0xffffff, 1.1);
  const pupil = M(0x14040a, { roughness: 0.5 });
  ball(o, r, orbM, 0, 0, 0, 20);
  const face = new THREE.Group();
  o.add(face);
  for (const sx of [-1, 1]) {
    ball(face, r * 0.24, white, sx * r * 0.38, r * 0.05, r * 0.84, 10).scale.set(1, 0.75, 0.5); // 眼白
    ball(face, r * 0.12, pupil, sx * r * 0.33, r * 0.02, r * 0.97, 8); // 眼仁（望中間：鬥雞眼咁嬲）
    const b = rbox(face, r * 0.62, r * 0.17, r * 0.14, brow, sx * r * 0.36, r * 0.4, r * 0.86, 0.4); // 嬲眉（斜落中間）
    b.rotation.z = sx * 0.55;
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(r * 0.32, r * 0.07, 6, 14, Math.PI), brow); // 扁嘴（倒轉 U）
  mouth.position.set(0, -r * 0.45, r * 0.86);
  face.add(mouth);
  return { group: o, face, orbM };
}
function angrySpell() {
  const g = new THREE.Group();
  const wood = M(0x2b1622, { roughness: 0.8, metalness: 0 });
  const gold = METAL(0xffb300, { metalness: 0.85, roughness: 0.25 });
  const red = GLOW(0xff2d55, 2.4);
  const smokeM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffcdd2, emissiveIntensity: 0.6, transparent: true, opacity: 0.7, roughness: 0.9 });

  // ── 扭紋杖身 + 金圈 + 紅色符文 ──
  branch(g, [[0, -0.03, 0.3], [0.012, -0.01, 0.1], [-0.01, 0, -0.1], [0, 0.01, -0.26]], 0.034, 0.026, wood, 0.22, 3);
  helix(g, 0.036, 0.42, 3, 0.006, red, 0, -0.01, 0.03);
  for (const z of [0.22, -0.02]) cyl(g, 0.042, 0.042, 0.03, gold, 0, -0.01, z, 14);
  ball(g, 0.04, gold, 0, -0.03, 0.32, 12);
  ball(g, 0.018, red, 0, -0.03, 0.36, 8);
  // ── 爪（四隻金爪抓住粒波）──
  const clawRoot = new THREE.Group();
  clawRoot.position.set(0, 0.015, -0.28);
  g.add(clawRoot);
  cyl(clawRoot, 0.045, 0.03, 0.05, gold, 0, 0, 0, 14);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.12, 6), gold);
    c.position.set(Math.cos(a) * 0.05, Math.sin(a) * 0.05, -0.06);
    c.rotation.set(-Math.PI / 2 - Math.sin(a) * 0.55, 0, Math.cos(a) * 0.55);
    clawRoot.add(c);
  }
  // ── 嬲嬲波（彈藥）──
  const orbHold = new THREE.Group();
  orbHold.position.set(0, 0.015, -0.39);
  g.add(orbHold);
  const orb = angryOrb(orbHold, 0.075);
  const rings = [0, 1].map((i) => {
    const r = ring(orbHold, 0.11 + i * 0.02, 0.005, red, 0, 0, 0, 40);
    return r;
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff2d55, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(0.38);
  orbHold.add(halo);
  // 頂出「嬲到出煙」
  const puffs = [];
  for (let i = 0; i < 4; i++) puffs.push(ball(orbHold, 0.02, smokeM, 0, 0, 0, 8));

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.015, -0.48);
  g.add(muzzle);
  let fireT = -9;
  let fired = false;
  let ready = 1; // 冷卻：0（啱啱用咗）→ 1（用得）
  const grey = new THREE.Color(0x6d5a60);
  const hot = new THREE.Color(0xff1744);
  const hotE = new THREE.Color(0xd50000);
  g.userData = {
    muzzle, glows: [red], aimY: -0.16,
    hip: { x: 0.22, y: -0.21, z: -0.46 }, flashScale: 0.5,
  };
  g.userData.fire = () => (fired = true);
  g.userData.cooldown = (k) => (ready = k); // weapons.js：法術冷卻進度
  g.userData.animate = (t) => {
    if (fired) {
      fired = false;
      fireT = t;
    }
    const f = clamp01(1 - (t - fireT) / 0.25);
    const full = ready >= 1;
    // 冷卻緊：粒波細細粒、灰色，慢慢大返；用得 = 跳吓跳吓
    const s = full ? 1 + Math.sin(t * 7) * 0.05 : 0.25 + ready * 0.55;
    orb.group.scale.setScalar(s);
    orb.orbM.color.copy(grey).lerp(hot, full ? 1 : ready * 0.6);
    orb.orbM.emissive.copy(grey).lerp(hotE, full ? 1 : ready * 0.5);
    orb.orbM.emissiveIntensity = full ? 1.1 + Math.sin(t * 9) * 0.3 : 0.3 + ready * 0.6;
    orb.face.position.x = full ? Math.sin(t * 23) * 0.003 : 0; // 嬲到震
    orb.face.visible = ready > 0.35;
    rings.forEach((r, i) => {
      r.visible = full;
      r.rotation.set(t * (1.4 + i), t * (0.9 - i * 1.8), 0);
    });
    halo.material.opacity = full ? 0.45 + Math.sin(t * 5) * 0.15 : 0.12;
    red.emissiveIntensity = (full ? 2.2 : 1) + f * 3;
    puffs.forEach((p, i) => {
      const q = (t * 0.9 + i / 4) % 1;
      p.visible = full;
      p.position.set((i % 2 ? 1 : -1) * (0.03 + q * 0.03), 0.07 + q * 0.12, 0.01);
      p.scale.setScalar(0.6 + q * 1.4);
      p.material.opacity = 0.7 * (1 - q);
    });
  };
  return g;
}

// 會飛嘅彈（Issue #15）：🗡️ dagger · 🧪 potion · 🎆 firework · 😡 angryOrb
function projectileModel15(kind, color, g, keep) {
  const look = new THREE.Vector3();
  const face = (v) => v && v.lengthSq() > 0.0001 && g.lookAt(look.copy(g.position).sub(v)); // -z 向住飛嘅方向
  const haloOf = (col, sc, op = 0.6) => {
    const h = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })));
    h.scale.setScalar(sc);
    g.add(h);
    return h;
  };
  if (kind === 'dagger') {
    const mats = daggerMats();
    Object.values(mats).forEach(keep);
    const spinner = new THREE.Group();
    g.add(spinner);
    const d = spiritDagger(spinner, mats, 0.42);
    d.group.position.z = 0.05;
    haloOf(color, 0.7, 0.5);
    g.userData.fly = (v, t) => {
      face(v);
      spinner.rotation.z = t * 14; // 轉住飛
    };
  } else if (kind === 'potion') {
    const tumble = new THREE.Group();
    g.add(tumble);
    const b = potionBottle(tumble, 1.5);
    b.group.traverse((o) => o.material && keep(o.material));
    haloOf(0xff6d00, 0.8, 0.5);
    g.userData.fly = (v, t, dt) => {
      tumble.rotation.x += dt * 8; // 喺空中翻筋斗
      tumble.rotation.z += dt * 3;
      b.liquidM.emissiveIntensity = 2.2 + Math.sin(t * 20) * 0.5;
    };
  } else if (kind === 'firework') {
    const spinner = new THREE.Group();
    g.add(spinner);
    const r = fireworkRocket(spinner, 2.2);
    r.traverse((o) => o.material && keep(o.material));
    const ex = pilotFlame(spinner, 0, 0, 0.36, 0.35); // 尾噴火（向後）
    ex.group.rotation.y = Math.PI;
    ex.mats.forEach(keep);
    const glow = haloOf(0xffd180, 1.1, 0.7);
    glow.position.z = 0.4;
    const tailV = new THREE.Vector3();
    g.userData.tail = () => tailV.set(0, 0, 0.45).applyQuaternion(g.quaternion);
    g.userData.fly = (v, t) => {
      face(v);
      spinner.rotation.z = t * 6;
      ex.group.scale.setScalar(0.8 + Math.sin(t * 40) * 0.25);
    };
  } else { // 😡 angryOrb
    const o = angryOrb(g, 0.22);
    keep(o.orbM);
    o.group.traverse((m) => m.material && keep(m.material));
    const rs = [0, 1].map((i) => {
      const m = keep(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.3 + i * 0.06, 0.012, 6, 36), m);
      g.add(r);
      return r;
    });
    haloOf(color, 1.2, 0.6);
    g.userData.fly = (v, t) => {
      face(v);
      o.group.scale.setScalar(1 + Math.sin(t * 14) * 0.08);
      rs.forEach((r, i) => r.rotation.set(t * (3 + i), t * (2 - i * 4), 0));
    };
  }
}

const BUILDERS = { soulBlaster, candyPistol, slingshot, pumpkinLauncher, frostWand, lightningStaff, ghostShotgun, batBow, dragonBreath, spiritDaggers, firePotion, fireworkLauncher, angrySpell };
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
