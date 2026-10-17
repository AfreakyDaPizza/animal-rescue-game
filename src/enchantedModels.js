// Biome 7「Enchanted Kingdom」嘅 3D 模型（小朋友 2026-10-17）：方塊（Roblox）風格
//   buildSkywhaleModel()     ：Royal Skywhale（最勁嘅寵物）：喺天上游水咁飛嘅大鯨魚，戴金皇冠、有寶石翼、發光符文
//   buildGuardianRig()       ：Boss「Enchanted Royal Guardian」：白金色水晶騎士，皇冠頭盔、水晶大劍、皇家盾、披風
//   buildCrystalButterfly(c) ：水晶蝴蝶（翼半透明發光），userData.flap(t) 拍翼
//   buildRune(c)             ：地上嘅魔法符文圈（canvas 畫），userData.spin(t) 轉
// 全部面向 -z（同其他動物、Boss 一樣）

import * as THREE from 'three';
import { box, pivot, cuteEyes, spike, material } from './modelKit.js';

const PI = Math.PI;

// 發光／半透明物料（同一款共用一份）
const glowCache = new Map();
function glow(color, k = 1.2, extra = {}) {
  const key = `${color}|${k}|${JSON.stringify(extra)}`;
  if (!glowCache.has(key)) glowCache.set(key, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.3, ...extra }));
  return glowCache.get(key);
}
const crystal = (color, k = 0.8) => glow(color, k, { transparent: true, opacity: 0.75, metalness: 0.2 });
const gold = () => material(0xffc107, { metalness: 0.85, roughness: 0.25, emissive: 0x6d4c00, emissiveIntensity: 0.35 });

// ================= Royal Skywhale =================
// 身分三截（頭 → 中身 → 後身 → 尾），由 pivot 一截截擺，好似喺天上游水
export function buildSkywhaleModel() {
  const BODY = 0x283593; // 深皇家藍
  const BACK = 0x4527a0; // 紫色背脊
  const BELLY = 0xc5cae9; // 淺色肚
  const RUNE = 0x80d8ff;
  const g = new THREE.Group();
  const flyY = 1.6;
  const root = pivot(g, 0, flyY, 0);
  const len = 6;

  // ---- 頭（前面 -z）----
  const head = pivot(root, 0, 0, -len / 2 + 1.2);
  box(head, 1.5, 1.25, 2.4, BODY, 0, 0, 0, 0.38);
  box(head, 1.3, 0.25, 2.2, BACK, 0, 0.55, 0.05, 0.4); // 背脊
  box(head, 1.25, 0.45, 2.2, BELLY, 0, -0.45, 0, 0.4); // 肚
  for (let i = 0; i < 5; i++) box(head, 1.28, 0.04, 0.12, 0x9fa8da, 0, -0.62, -0.9 + i * 0.4, 0.3); // 肚坑紋
  box(head, 1.0, 0.08, 0.06, 0x1a237e, 0, -0.15, -1.21, 0.3); // 微笑大口
  for (const s of [-1, 1]) {
    // 側面大眼
    const eye = pivot(head, s * 0.76, 0.12, -0.55);
    eye.rotation.y = s * PI / 2;
    cuteEyes(eye, 0, 0, 0, 0.26, { iris: 0x40c4ff });
    box(head, 0.06, 0.12, 0.18, 0xff80ab, s * 0.76, -0.12, -0.75, 0.4); // 面珠
  }
  // 金皇冠：一圈底 + 5 支尖 + 寶石
  const crown = pivot(head, 0, 0.75, -0.2);
  box(crown, 1.0, 0.22, 0.85, 0xffc107, 0, 0, 0, 0.25, { metalness: 0.85, roughness: 0.25, emissive: 0x6d4c00, emissiveIntensity: 0.35 });
  [[-0.38, -0.32], [0.38, -0.32], [0, -0.36], [-0.38, 0.32], [0.38, 0.32]].forEach(([x, z], i) => {
    spike(crown, 0.11, 0.42, 0xffd54f, x, 0.3, z);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), glow([0xff1744, 0x00e5ff, 0x76ff03][i % 3], 1.6));
    gem.position.set(x, 0.05, z < 0 ? z - 0.09 : z + 0.09);
    crown.add(gem);
  });
  const crownGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), glow(0xe040fb, 2));
  crownGem.position.set(0, 0.12, -0.46);
  crown.add(crownGem);
  // 噴水孔噴出閃粉
  box(head, 0.25, 0.08, 0.25, 0x1a237e, 0, 0.68, 0.6, 0.4);

  // ---- 中身 ----
  const mid = pivot(root, 0, 0, -len / 2 + 2.4);
  box(mid, 1.35, 1.15, 1.9, BODY, 0, 0, 0.95, 0.38);
  box(mid, 1.15, 0.22, 1.8, BACK, 0, 0.5, 0.95, 0.4);
  box(mid, 1.1, 0.4, 1.8, BELLY, 0, -0.42, 0.95, 0.4);
  // 發光符文（背脊同兩邊）
  const runes = [];
  for (let i = 0; i < 3; i++) {
    runes.push(box(mid, 0.28, 0.05, 0.28, RUNE, 0, 0.63, 0.35 + i * 0.6, 0.3, { emissive: RUNE, emissiveIntensity: 1.6 }));
    for (const s of [-1, 1]) runes.push(box(mid, 0.05, 0.22, 0.22, RUNE, s * 0.68, 0.1, 0.4 + i * 0.55, 0.3, { emissive: RUNE, emissiveIntensity: 1.6 }));
  }
  // 小披風（背上，紅色有金邊，跟風擺）
  const cape = pivot(mid, 0, 0.62, 0.2);
  box(cape, 1.0, 0.05, 1.3, 0xc62828, 0, 0, 0.62, 0.2);
  box(cape, 1.04, 0.06, 0.1, 0xffc107, 0, 0.01, 1.25, 0.2);
  // 寶石大翼（兩邊胸鰭變成翼）
  const wings = [-1, 1].map((s) => {
    const w = pivot(mid, s * 0.65, -0.1, 0.5);
    box(w, 1.3, 0.1, 0.9, 0x3949ab, s * 0.65, 0, 0, 0.3);
    box(w, 1.0, 0.1, 0.7, 0x5c6bc0, s * 1.6, 0, 0.2, 0.3);
    box(w, 0.7, 0.08, 0.5, crystal(0x80d8ff, 0.9), s * 2.3, 0, 0.35, 0.3);
    for (let i = 0; i < 3; i++) {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), glow([0x00e5ff, 0xe040fb, 0xffd740][i], 1.5));
      gem.position.set(s * (0.6 + i * 0.75), 0.09, 0.05 + i * 0.1);
      w.add(gem);
    }
    return { w, s };
  });

  // ---- 後身 + 尾 ----
  const rear = pivot(mid, 0, 0, 1.9);
  box(rear, 1.0, 0.9, 1.4, BODY, 0, 0.02, 0.7, 0.38);
  box(rear, 0.85, 0.2, 1.3, BACK, 0, 0.4, 0.7, 0.4);
  box(rear, 0.8, 0.3, 1.3, BELLY, 0, -0.32, 0.7, 0.4);
  box(rear, 0.12, 0.35, 0.5, BACK, 0, 0.6, 0.6, 0.3); // 小背鰭
  const fluke = pivot(rear, 0, 0, 1.4);
  box(fluke, 0.55, 0.5, 0.7, BODY, 0, 0, 0.3, 0.35);
  for (const s of [-1, 1]) {
    const lobe = box(fluke, 1.2, 0.12, 0.6, 0x3949ab, s * 0.6, 0, 0.75, 0.3);
    lobe.rotation.y = s * -0.35;
    box(fluke, 0.6, 0.1, 0.35, crystal(0x80d8ff, 1), s * 1.05, 0, 0.95, 0.3).rotation.y = s * -0.35;
  }

  // 閃粉尾巴（一粒粒細星，由尾飄出嚟）
  const SPARK = 24;
  const pos = new Float32Array(SPARK * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xfff59d, size: 0.18, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparks.frustumCulled = false;
  g.add(sparks);

  g.userData.animate = (t, moving) => {
    const sp = 1.8 + moving * 1.2;
    mid.rotation.x = Math.sin(t * sp) * 0.06;
    rear.rotation.x = Math.sin(t * sp - 0.9) * 0.12;
    fluke.rotation.x = Math.sin(t * sp - 1.8) * 0.28;
    head.rotation.x = Math.sin(t * sp + 0.9) * 0.04;
    wings.forEach(({ w, s }) => (w.rotation.z = s * (0.15 + Math.sin(t * sp) * 0.45)));
    cape.rotation.x = -0.15 - Math.abs(Math.sin(t * 3)) * 0.25;
    root.position.y = flyY + Math.sin(t * 1.2) * 0.25;
    crownGem.rotation.y = t * 2;
    const k = 1.2 + Math.sin(t * 3) * 0.6;
    for (const r of runes) r.material.emissiveIntensity = k;
    // 閃粉：由尾後面飄出去，慢慢升高散開
    for (let i = 0; i < SPARK; i++) {
      const p = (t * 0.5 + i / SPARK) % 1;
      pos[i * 3] = Math.sin(i * 2.4 + t) * (0.2 + p * 0.9);
      pos[i * 3 + 1] = root.position.y + Math.cos(i * 1.7) * 0.3 + p * 0.8;
      pos[i * 3 + 2] = len / 2 + 0.6 + p * 3;
    }
    sparkGeo.attributes.position.needsUpdate = true;
  };
  g.userData.move = 'fly'; // 喺天上飛（地塊入面會喺上面飛圈）
  g.userData.flying = true;
  g.userData.height = flyY + 1.4;
  return g;
}

// ================= Enchanted Royal Guardian（Boss） =================
// 骨架同 bosses.js 嘅 blockPerson 一樣：root、legs、arms、head、torso（animateRig 用）
export function buildGuardianRig() {
  const ARMOUR = 0xf5f5f0; // 白色盔甲
  const TRIM = 0xffc107; // 金邊
  const CRYSTAL = 0x80deea; // 水晶藍
  const RUNE = 0x18ffff;
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const goldM = gold();
  const glowing = [];
  const runeBox = (parent, w, h, d, x, y, z) => {
    const m = box(parent, w, h, d, RUNE, x, y, z, 0.3, { emissive: RUNE, emissiveIntensity: 1.8 });
    glowing.push(m);
    return m;
  };

  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.3, 1.2, 0);
    box(hip, 0.55, 0.55, 0.55, ARMOUR, 0, -0.25, 0, 0.25, { metalness: 0.4, roughness: 0.35 });
    box(hip, 0.6, 0.18, 0.6, TRIM, 0, -0.52, 0, 0.3, { metalness: 0.85, roughness: 0.25 }); // 金色膝甲
    box(hip, 0.5, 0.45, 0.5, ARMOUR, 0, -0.8, 0, 0.25, { metalness: 0.4, roughness: 0.35 });
    box(hip, 0.58, 0.22, 0.72, 0xb0bec5, 0, -1.08, -0.06, 0.3, { metalness: 0.6, roughness: 0.3 }); // 鐵靴
    runeBox(hip, 0.16, 0.16, 0.04, 0, -0.75, -0.26);
    return hip;
  });
  // 身：白色胸甲 + 金邊 + 中間一粒大水晶
  const torso = box(root, 1.2, 1.2, 0.65, ARMOUR, 0, 1.8, 0, 0.22, { metalness: 0.4, roughness: 0.35 });
  box(root, 1.24, 0.14, 0.69, TRIM, 0, 1.25, 0, 0.3, { metalness: 0.85, roughness: 0.25 }); // 腰帶
  box(root, 1.24, 0.1, 0.69, TRIM, 0, 2.35, 0, 0.3, { metalness: 0.85, roughness: 0.25 });
  const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), glow(CRYSTAL, 1.8));
  heart.position.set(0, 1.85, -0.38);
  heart.scale.y = 1.4;
  root.add(heart);
  glowing.push(heart);
  for (const s of [-1, 1]) runeBox(root, 0.08, 0.5, 0.04, s * 0.38, 1.8, -0.34); // 胸前符文線
  // 披風（背後，深紫有金邊）
  const cape = pivot(root, 0, 2.3, 0.34);
  box(cape, 1.3, 1.9, 0.08, 0x4a148c, 0, -0.95, 0.05, 0.15);
  box(cape, 1.34, 0.12, 0.1, TRIM, 0, -1.88, 0.05, 0.2);
  // 手：膊甲 + 白手臂 + 金手套
  const arms = [-1, 1].map((s) => {
    const shoulder = pivot(root, s * 0.85, 2.25, 0);
    box(shoulder, 0.65, 0.4, 0.65, TRIM, 0, 0.05, 0, 0.3, { metalness: 0.85, roughness: 0.25 }); // 金膊甲
    spike(shoulder, 0.1, 0.35, CRYSTAL, s * 0.18, 0.35, 0);
    box(shoulder, 0.45, 0.95, 0.45, ARMOUR, 0, -0.45, 0, 0.25, { metalness: 0.4, roughness: 0.35 });
    box(shoulder, 0.48, 0.28, 0.48, TRIM, 0, -1.0, 0, 0.3, { metalness: 0.85, roughness: 0.25 });
    return shoulder;
  });
  // 右手（+x）：水晶大劍（劍尖向前）
  const sword = pivot(arms[1], 0, -1.08, 0);
  box(sword, 0.14, 0.32, 0.14, 0x5d4037, 0, 0, 0, 0.3); // 手柄
  box(sword, 0.7, 0.1, 0.16, TRIM, 0, -0.05, -0.15, 0.3, { metalness: 0.85, roughness: 0.25 }); // 護手
  const blade = box(sword, 0.22, 0.08, 1.9, crystal(CRYSTAL, 1.2), 0, -0.05, -1.2, 0.2);
  glowing.push(blade);
  spike(sword, 0.12, 0.35, CRYSTAL, 0, -0.05, -2.3, -PI / 2);
  // 左手（-x）：皇家盾（金邊、藍底、中間符文）
  const shield = pivot(arms[0], -0.28, -0.8, -0.05);
  box(shield, 0.12, 1.2, 0.95, 0x1565c0, 0, 0, 0, 0.25);
  box(shield, 0.14, 1.28, 0.1, TRIM, 0, 0, -0.5, 0.2, { metalness: 0.85, roughness: 0.25 });
  box(shield, 0.14, 1.28, 0.1, TRIM, 0, 0, 0.5, 0.2, { metalness: 0.85, roughness: 0.25 });
  const shieldRune = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 6, 20), glow(RUNE, 1.8));
  shieldRune.position.set(-0.08, 0, 0);
  shieldRune.rotation.y = PI / 2;
  shield.add(shieldRune);
  glowing.push(shieldRune);
  // 頭：頭盔 + 發光眼罩 + 皇冠
  const head = pivot(root, 0, 2.75, 0);
  box(head, 0.82, 0.82, 0.82, ARMOUR, 0, 0, 0, 0.3, { metalness: 0.4, roughness: 0.35 });
  const visor = box(head, 0.66, 0.16, 0.06, RUNE, 0, 0.04, -0.42, 0.3, { emissive: RUNE, emissiveIntensity: 2.4 });
  glowing.push(visor);
  box(head, 0.06, 0.5, 0.06, TRIM, 0, -0.1, -0.42, 0.3); // 鼻甲
  const crown = pivot(head, 0, 0.46, 0);
  box(crown, 0.88, 0.16, 0.88, TRIM, 0, 0, 0, 0.25, { metalness: 0.85, roughness: 0.25 });
  for (const [x, z] of [[-0.34, -0.34], [0.34, -0.34], [-0.34, 0.34], [0.34, 0.34], [0, -0.4]]) spike(crown, 0.08, 0.32, 0xffd54f, x, 0.22, z);
  const crownGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), glow(0xe040fb, 2));
  crownGem.position.set(0, 0.08, -0.46);
  crown.add(crownGem);
  // 頭盔頂嘅羽毛（水晶色）
  box(head, 0.12, 0.45, 0.6, crystal(CRYSTAL, 1), 0, 0.85, 0.15, 0.3);
  // 身邊浮住嘅水晶碎（會轉）
  const orbit = pivot(root, 0, 1.9, 0);
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), crystal(CRYSTAL, 1.4));
    const a = (i / 4) * PI * 2;
    c.position.set(Math.cos(a) * 1.3, Math.sin(i) * 0.3, Math.sin(a) * 1.3);
    c.scale.y = 1.6;
    orbit.add(c);
  }
  g.userData.extra = (t) => {
    const k = 1.4 + Math.sin(t * 3) * 0.7;
    for (const m of glowing) m.material.emissiveIntensity = k;
    orbit.rotation.y = t * 1.2;
    cape.rotation.x = 0.1 + Math.sin(t * 2.2) * 0.08;
    crownGem.rotation.y = t * 2;
  };
  return { g, root, legs, arms, head, torso };
}

// ================= 水晶蝴蝶 =================
// 兩邊各有上下兩塊翼（半透明發光），由身中間嘅 pivot 拍
const butterflyGeo = {
  body: new THREE.BoxGeometry(0.05, 0.05, 0.3),
  upper: new THREE.PlaneGeometry(0.32, 0.26).translate(0.17, 0, -0.04),
  lower: new THREE.PlaneGeometry(0.24, 0.2).translate(0.13, 0, 0.12),
};
const wingMats = new Map();
function wingMat(color) {
  if (!wingMats.has(color)) wingMats.set(color, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false, metalness: 0.3, roughness: 0.2 }));
  return wingMats.get(color);
}
export function buildCrystalButterfly(color = 0x80d8ff) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(butterflyGeo.body, material(0x37474f)));
  const m = wingMat(color);
  const wings = [-1, 1].map((s) => {
    const p = new THREE.Group();
    p.scale.x = s;
    for (const geo of [butterflyGeo.upper, butterflyGeo.lower]) {
      const w = new THREE.Mesh(geo, m);
      w.rotation.x = -PI / 2; // 平放
      p.add(w);
    }
    g.add(p);
    return { p, s };
  });
  const phase = Math.random() * 6;
  g.userData.flap = (t) => {
    const a = 0.25 + Math.abs(Math.sin(t * 9 + phase)) * 1.1;
    for (const { p, s } of wings) p.rotation.z = s * a;
  };
  return g;
}

// ================= 魔法符文圈 =================
// 一塊平放喺地上嘅發光圈：外圈、內圈、六芒星、一圈符號（canvas 畫）
const runeTex = new Map();
function runeTexture(color) {
  if (runeTex.has(color)) return runeTex.get(color);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const hex = `#${new THREE.Color(color).getHexString()}`;
  ctx.strokeStyle = hex;
  ctx.fillStyle = hex;
  ctx.shadowColor = hex;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(128, 128, 92, 0, PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(128, 128, 40, 0, PI * 2);
  ctx.stroke();
  // 六芒星（兩個三角形）
  for (const off of [0, PI / 3]) {
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = off + (i / 3) * PI * 2 - PI / 2;
      const x = 128 + Math.cos(a) * 88;
      const y = 128 + Math.sin(a) * 88;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // 外圈之間嘅符號
  ctx.font = 'bold 20px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyphs = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ'];
  glyphs.forEach((ch, i) => {
    const a = (i / glyphs.length) * PI * 2;
    ctx.save();
    ctx.translate(128 + Math.cos(a) * 105, 128 + Math.sin(a) * 105);
    ctx.rotate(a + PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  runeTex.set(color, tex);
  return tex;
}
export function buildRune(color = 0x18ffff) {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ map: runeTexture(color), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  disc.rotation.x = -PI / 2;
  disc.position.y = 0.04;
  g.add(disc);
  // 中間浮住一粒水晶
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), glow(color, 1.6));
  gem.position.y = 0.6;
  gem.scale.y = 1.5;
  g.add(gem);
  g.userData.spin = (t) => {
    disc.rotation.z = t * 0.5;
    m.opacity = 0.65 + Math.sin(t * 2.5) * 0.25;
    gem.position.y = 0.6 + Math.sin(t * 2) * 0.12;
    gem.rotation.y = t * 1.5;
  };
  return g;
}
