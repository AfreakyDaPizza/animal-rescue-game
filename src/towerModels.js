// 🧟 Witch Tower 嘅敵人模型（小朋友 Issue #11 / #12）：可愛又有啲驚嘅方塊殭屍 + 腐化動物嘅紫色外衣
// 小朋友話之前啲殭屍「ugly」：呢版用圓角方塊 + 深色描邊（同 echoPetModels 一樣嘅卡通風格），
// 每隻膚色唔同（幾種綠）、爛衫有顏色、補丁、縫線、發光眼、每款唔同帽／頭髮，行路拖腳 + 手伸前 + 頭側側
// 冇血、冇骨：俾人打散 = 變糖果閃粉（witchTower.js）
//
// buildZombie(kind, { seed }) → Group（面向 -z）
//   userData.animate(t, moving, attackK, dt)  ← 每格叫：moving 0–1，attackK 0–1（舉手 → 拍落嚟）
//   userData.flash(k)                          ← 俾人打中：成隻白一白（k 0–1）
//   userData.height / userData.parts(scale)    ← 打中範圍（身 + 頭爆擊）
//   kind：'walker' | 'runner' | 'spitter' | 'brute' | 'king'
// corrupt(model) → { mats, eyes, aura, setCure(k), fade(k), update(t) }  ← 動物變紫（腐化），k 1 = 完全變返正常

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const PI = Math.PI;
const geoCache = new Map();
const cached = (k, make) => {
  if (!geoCache.has(k)) geoCache.set(k, make());
  return geoCache.get(k);
};
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x120a18, side: THREE.BackSide });
// 固定亂數（同一個 seed 每次一樣）
function rng(seed) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

// ---------- 每隻殭屍自己嘅材質（打中先可以白一白）----------
function kit(root) {
  const mats = new Map();
  const flashable = [];
  const mat = (color, o = {}) => {
    const key = color + JSON.stringify(o);
    if (!mats.has(key)) {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...o });
      if (!o.emissive) {
        m.emissive = new THREE.Color(0xffffff);
        m.emissiveIntensity = 0;
        flashable.push(m);
      }
      mats.set(key, m);
    }
    return mats.get(key);
  };
  // 圓角方塊：line = 描邊（佔最短邊幾多）
  const B = (parent, w, h, d, color, x = 0, y = 0, z = 0, { r = 0.22, line = 0.08, o = {} } = {}) => {
    const g = cached(`rb${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * r));
    const m = new THREE.Mesh(g, typeof color === 'number' ? mat(color, o) : color);
    m.position.set(x, y, z);
    m.castShadow = true;
    if (line) {
      const t = Math.min(w, h, d) * line;
      const ol = new THREE.Mesh(g, OUTLINE);
      ol.scale.set(1 + (2 * t) / w, 1 + (2 * t) / h, 1 + (2 * t) / d);
      ol.userData.outline = true;
      m.add(ol);
    }
    parent.add(m);
    return m;
  };
  const glow = (color, k = 2.2) => mat(color, { emissive: color, emissiveIntensity: k, roughness: 0.3 });
  const piv = (parent, x = 0, y = 0, z = 0) => {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    parent.add(p);
    return p;
  };
  root.userData.flash = (k) => {
    for (const m of flashable) m.emissiveIntensity = k * 0.9;
  };
  root.userData.dispose = () => mats.forEach((m) => m.dispose()); // 打散咗：清走呢隻自己嘅材質
  return { B, mat, glow, piv };
}

// 一條縫線（貼喺前面）：長嘅一條 + 幾條短嘅交叉線（tilt = 斜幾多）
function stitch(B, parent, x, y, z, len, { vertical = false, n = 3, color = 0x2a1a22, tilt = 0 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.z = tilt + (vertical ? PI / 2 : 0);
  parent.add(g);
  B(g, len, 0.028, 0.02, color, 0, 0, 0, { line: 0, r: 0.1 });
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    B(g, 0.026, 0.09, 0.02, color, t * len * 0.8, 0, -0.005, { line: 0, r: 0.1 }).rotation.z = 0.25;
  }
}

// ---------- 款式 ----------
const SKINS = [0x8fd84a, 0x76c93a, 0xa3e05c, 0x67bf45, 0x6fd28a, 0x9bdc5a, 0xb2d84a, 0x5ec98e]; // 唔同嘅綠（鮮色啲：塔入面紫色燈會令佢灰咗）
const SHIRTS = [0x7e57c2, 0x26a69a, 0xff8a65, 0x5c6bc0, 0xec407a, 0xffb300, 0x42a5f5, 0x8d6e63];
const PANTS = [0x4e5d94, 0x5d4037, 0x37474f, 0x6d4c41, 0x3f51b5];
const EYE_GLOW = { walker: 0xd4ff3a, runner: 0x40ffd0, spitter: 0x76ff03, brute: 0xffab40, king: 0xff4081 };

export const ZOMBIE_LOOK = {
  walker: { scale: 1, hat: 'hair' },
  runner: { scale: 0.86, hat: 'cap' },
  spitter: { scale: 1.02, hat: 'beanie', belly: true },
  brute: { scale: 1.55, hat: 'bandage', broad: true },
  king: { scale: 2.5, hat: 'crown', broad: true, cape: true },
};

export function buildZombie(kind = 'walker', { seed = 1 } = {}) {
  const look = ZOMBIE_LOOK[kind] || ZOMBIE_LOOK.walker;
  const R = rng(seed + kind.length * 31);
  const pick = (list) => list[Math.floor(R() * list.length) % list.length];
  const root = new THREE.Group();
  const body = new THREE.Group(); // 成個身（搖嚟搖去）
  root.add(body);
  const { B, glow, piv } = kit(root);
  const skin = kind === 'king' ? 0x86cf55 : pick(SKINS);
  const skinDark = new THREE.Color(skin).multiplyScalar(0.78).getHex();
  const shirt = kind === 'king' ? 0x6a1b9a : kind === 'runner' ? pick([0xff7043, 0x29b6f6, 0xffca28]) : pick(SHIRTS);
  const shirtDark = new THREE.Color(shirt).multiplyScalar(0.72).getHex();
  const pants = kind === 'brute' ? 0x3d5a80 : pick(PANTS);
  const eyeC = EYE_GLOW[kind] || EYE_GLOW.walker;
  const broad = look.broad ? 1.18 : 1;

  // ---- 腳 ----
  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = piv(body, sx * 0.19 * broad, 0.78, 0);
    const shortLeg = kind === 'runner'; // 短褲
    B(hip, 0.27, 0.42, 0.3, pants, 0, -0.2, 0);
    B(hip, 0.24, 0.32, 0.27, shortLeg ? skin : pants, 0, -0.52, 0, { line: 0.06 });
    if (!shortLeg && R() < 0.6) B(hip, 0.26, 0.06, 0.29, 0x2b2030, 0, -0.42, 0.001, { line: 0, r: 0.2 }); // 破褲口
    if (sx === 1 && !shortLeg) B(hip, 0.16, 0.14, 0.02, pick([0xffd54f, 0xef9a9a, 0x80deea]), 0.02, -0.2, -0.16, { line: 0.1 }); // 膝頭補丁
    B(hip, 0.29, 0.14, 0.38, kind === 'runner' ? 0xffffff : 0x3e2723, 0, -0.71, -0.04, { line: 0.08 }); // 鞋
    if (kind === 'runner') B(hip, 0.3, 0.04, 0.39, 0xff1744, 0, -0.75, -0.04, { line: 0 });
    legs.push(hip);
  }

  // ---- 身 ----
  const torso = piv(body, 0, 0.78, 0);
  const tw = 0.62 * broad;
  const th = 0.78;
  B(torso, tw, th, 0.38, shirt, 0, th / 2, 0);
  if (look.belly) B(torso, tw * 0.8, th * 0.55, 0.16, skin, 0, th * 0.35, -0.2, { line: 0.1 }); // 大肚腩（衫穿咗）
  // 爛衫腳：一舊舊長短唔同
  for (let i = 0; i < 5; i++) {
    const x = (-0.5 + (i + 0.5) / 5) * tw;
    const h = 0.08 + R() * 0.12;
    B(torso, tw / 5.4, h, 0.4, i % 2 ? shirtDark : shirt, x, -h / 2 + 0.03, 0, { line: 0, r: 0.15 });
  }
  // 衫穿咗個窿（見到綠色皮膚）+ 補丁 + 縫線
  if (!look.belly) B(torso, 0.16, 0.12, 0.02, skin, tw * 0.22, th * 0.38, -0.195, { line: 0.12 });
  B(torso, 0.17, 0.17, 0.02, pick([0xffeb3b, 0x80cbc4, 0xf48fb1, 0xb39ddb]), -tw * 0.22, th * 0.66, -0.195, { line: 0.12 });
  stitch(B, torso, tw * 0.05, th * 0.2, -0.2, 0.26, { n: 4, tilt: 0.5 }); // 衫上面一條縫線
  if (kind === 'brute') {
    // 吊帶褲
    B(torso, tw * 0.9, th * 0.45, 0.4, 0x3d5a80, 0, th * 0.22, 0, { line: 0.04 });
    for (const sx of [-1, 1]) B(torso, 0.08, th * 0.6, 0.41, 0x3d5a80, sx * tw * 0.28, th * 0.68, 0, { line: 0 });
    for (const sx of [-1, 1]) B(torso, 0.08, 0.08, 0.02, 0xffd54f, sx * tw * 0.28, th * 0.42, -0.21, { line: 0.1 });
  }
  if (kind === 'runner') B(torso, 0.06, th * 0.8, 0.39, 0xffffff, tw * 0.3, th / 2, 0, { line: 0 }); // 運動衫白間
  // 披風（King）
  let cape = null;
  if (look.cape) {
    cape = piv(torso, 0, th - 0.02, 0.2);
    B(cape, tw * 1.25, 1.25, 0.06, 0x4a148c, 0, -0.62, 0.02, { line: 0.4 });
    B(cape, tw * 1.3, 0.14, 0.18, 0xffffff, 0, -0.02, 0, { line: 0.1 }); // 白毛領
    for (let i = 0; i < 4; i++) B(cape, 0.06, 0.06, 0.02, 0x212121, (-0.4 + i * 0.27) * tw, -0.03, -0.1, { line: 0 });
    for (let i = 0; i < 6; i++) B(cape, (tw * 1.2) / 6.5, 0.12 + R() * 0.12, 0.05, 0x38006b, (-0.5 + (i + 0.5) / 6) * tw * 1.2, -1.24, 0.02, { line: 0 });
  }

  // ---- 手（伸向前）----
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = piv(torso, sx * (tw / 2 + 0.11), th - 0.1, 0);
    B(sh, 0.22, 0.24, 0.24, shirt, 0, -0.04, 0, { line: 0.06 }); // 衫袖
    B(sh, 0.19, 0.5, 0.19, skin, 0, -0.36, 0, { line: 0.07 });
    if (sx === -1) B(sh, 0.21, 0.08, 0.21, 0xf5f0e1, 0, -0.32, 0, { line: 0, r: 0.2 }); // 繃帶
    if (sx === -1) B(sh, 0.21, 0.06, 0.21, 0xe0d8c3, 0, -0.42, 0, { line: 0, r: 0.2 });
    const hand = B(sh, 0.22, 0.2, 0.22, skin, 0, -0.66, 0, { line: 0.07 });
    for (let f = 0; f < 3; f++) B(hand, 0.05, 0.12, 0.05, skinDark, (-0.06 + f * 0.06), -0.14, -0.04, { line: 0, r: 0.3 }); // 手指
    sh.rotation.x = -PI / 2 + 0.15;
    arms.push(sh);
  }

  // ---- 頭 ----
  const neck = piv(torso, 0, th + 0.04, 0);
  const head = piv(neck, 0, 0.3, 0);
  const hw = 0.62;
  B(head, hw, 0.6, 0.58, skin, 0, 0, 0, { r: 0.25 });
  // 眼窩（深色）+ 發光眼（成粒眼發光，黑色眼珠望唔同方向 = 傻傻哋）
  const eyes = [];
  const eyeLight = new THREE.Color(eyeC).lerp(new THREE.Color(0xffffff), 0.12).getHex();
  for (const sx of [-1, 1]) {
    const big = sx === 1 ? 1.15 : 0.9;
    B(head, 0.22 * big, 0.22 * big, 0.03, skinDark, sx * 0.15, 0.07, -0.29, { line: 0, r: 0.35 });
    const ball = B(head, 0.17 * big, 0.17 * big, 0.05, glow(eyeLight, 1.25), sx * 0.15, 0.07, -0.305, { line: 0.12, r: 0.4 });
    B(ball, 0.07 * big, 0.07 * big, 0.03, 0x14081c, sx === 1 ? 0.025 : -0.02, sx === 1 ? -0.02 : 0.025, -0.025, { line: 0, r: 0.4 });
    eyes.push(ball);
  }
  // 眉（一高一低）
  B(head, 0.18, 0.05, 0.03, 0x33402a, -0.15, 0.2, -0.3, { line: 0, r: 0.3 }).rotation.z = -0.25;
  B(head, 0.18, 0.05, 0.03, 0x33402a, 0.15, 0.22, -0.3, { line: 0, r: 0.3 }).rotation.z = 0.1;
  // 嘴：一個深色窿 + 兩隻牙（可愛）或者縫住
  if (kind === 'spitter') {
    B(head, 0.24, 0.13, 0.03, 0x2a1020, 0, -0.15, -0.3, { line: 0, r: 0.4 });
    B(head, 0.1, 0.14, 0.04, glow(0x76ff03, 1.4), 0.04, -0.23, -0.3, { line: 0, r: 0.45 }); // 綠色鼻涕／黏液（唔係血）
  } else {
    B(head, 0.28, 0.08, 0.03, 0x2a1020, 0, -0.15, -0.3, { line: 0, r: 0.3 });
    B(head, 0.06, 0.06, 0.03, 0xffffff, -0.06, -0.12, -0.315, { line: 0, r: 0.2 });
    B(head, 0.06, 0.05, 0.03, 0xffffff, 0.07, -0.125, -0.315, { line: 0, r: 0.2 });
  }
  stitch(B, head, 0.2, -0.04, -0.3, 0.12, { vertical: true, n: 2 }); // 臉頰縫線
  stitch(B, head, -0.06, 0.29, -0.29, 0.24, { n: 4, tilt: -0.15 }); // 額頭縫線
  // 耳仔
  for (const sx of [-1, 1]) B(head, 0.06, 0.14, 0.1, skinDark, sx * (hw / 2 + 0.02), 0, 0, { line: 0.1 });

  // ---- 帽／頭髮 ----
  if (look.hat === 'hair') {
    const hair = pick([0x3e2723, 0x263238, 0x5d4037, 0x6a1b9a]);
    for (let i = 0; i < 5; i++) {
      const s = 0.14 + R() * 0.08;
      B(head, s, 0.12 + R() * 0.1, s, hair, -0.22 + i * 0.11, 0.33, -0.05 + R() * 0.2, { line: 0.1 }).rotation.z = (R() - 0.5) * 0.6;
    }
  } else if (look.hat === 'cap') {
    const c = pick([0xff1744, 0x2979ff, 0x00c853]);
    B(head, hw + 0.04, 0.16, 0.6, c, 0, 0.32, 0, { line: 0.08 });
    B(head, 0.4, 0.04, 0.26, c, 0, 0.26, 0.38, { line: 0.1 }); // 帽舌（戴返轉頭）
    B(head, 0.08, 0.04, 0.08, 0xffffff, 0, 0.42, 0, { line: 0 });
  } else if (look.hat === 'beanie') {
    const c = pick([0xff7043, 0xab47bc, 0x26c6da]);
    B(head, hw + 0.06, 0.24, 0.62, c, 0, 0.32, 0, { line: 0.06 });
    B(head, hw + 0.08, 0.08, 0.64, new THREE.Color(c).multiplyScalar(0.75).getHex(), 0, 0.22, 0, { line: 0 });
    B(head, 0.14, 0.14, 0.14, 0xffffff, 0, 0.5, 0, { line: 0.1, r: 0.5 }); // 毛毛波
  } else if (look.hat === 'bandage') {
    B(head, hw + 0.04, 0.1, 0.6, 0xf5f0e1, 0, 0.18, 0, { line: 0, r: 0.2 });
    B(head, 0.1, 0.12, 0.04, 0xf5f0e1, 0.2, 0.13, -0.31, { line: 0 });
    B(head, 0.2, 0.1, 0.16, 0x3e2723, -0.1, 0.33, 0.05, { line: 0.1 }); // 少少頭髮
  } else if (look.hat === 'crown') {
    const gold = glow(0xffc107, 0.5);
    B(head, hw + 0.02, 0.16, 0.6, gold, 0, 0.36, 0, { line: 0.08 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      B(head, 0.1, 0.18, 0.1, gold, Math.sin(a) * 0.24, 0.52, Math.cos(a) * 0.24, { line: 0.1 });
    }
    for (const [x, c] of [[-0.16, 0xff1744], [0, 0x00e5ff], [0.16, 0x76ff03]]) B(head, 0.07, 0.07, 0.03, glow(c, 1.8), x, 0.36, -0.31, { line: 0 });
  }

  // 傾側個頭（每隻唔同）
  const tilt = (R() - 0.5) * 0.5 + (R() < 0.5 ? 0.18 : -0.18);
  neck.rotation.z = tilt;
  root.scale.setScalar(look.scale);
  const height = (0.78 + th + 0.04 + 0.6 + 0.3) * look.scale;
  const phase = R() * 10;
  const limp = 0.6 + R() * 0.5; // 拖腳：一隻腳郁得少啲
  const speedK = kind === 'runner' ? 1.8 : kind === 'brute' || kind === 'king' ? 0.75 : 1;
  root.userData = {
    ...root.userData,
    kind, height, eyes, head, arms, legs, cape,
    // 打中範圍（世界座標由 witchTower.js 加返位置）
    parts: () => [
      { y: 1.2 * look.scale, radius: 0.6 * look.scale * broad, mult: 1 },
      { y: 2.05 * look.scale, radius: 0.42 * look.scale, mult: 1.5, crit: true },
    ],
    animate(t, moving = 1, attackK = 0) {
      const w = (t + phase) * 5.2 * speedK;
      const s = Math.sin(w);
      legs[0].rotation.x = s * 0.55 * moving;
      legs[1].rotation.x = -s * 0.55 * limp * moving;
      body.position.y = Math.abs(Math.cos(w)) * 0.06 * moving;
      body.rotation.z = Math.sin(w) * 0.07 * moving; // 搖嚟搖去
      torso.rotation.x = 0.12 + (kind === 'runner' ? 0.15 * moving : 0) - attackK * 0.25;
      // 手：伸前、一上一落；攻擊 = 舉高再拍落
      const up = attackK < 0.6 ? attackK / 0.6 : 1 - (attackK - 0.6) / 0.4;
      const smash = attackK >= 0.6 ? (attackK - 0.6) / 0.4 : 0;
      arms[0].rotation.x = -PI / 2 + 0.15 + Math.sin(w + 1) * 0.12 * moving - up * 1.1 + smash * 1.6;
      arms[1].rotation.x = -PI / 2 + 0.15 + Math.sin(w + 2.2) * 0.12 * moving - up * 1.1 + smash * 1.6;
      arms[0].rotation.z = -0.08 + Math.sin(t * 1.3 + phase) * 0.05;
      arms[1].rotation.z = 0.08 - Math.sin(t * 1.1 + phase) * 0.05;
      // 頭：側側 + 慢慢晃（好似瞓唔醒）
      neck.rotation.z = tilt + Math.sin(t * 1.7 + phase) * 0.12;
      neck.rotation.x = Math.sin(t * 2.3 + phase) * 0.06 - attackK * 0.2;
      head.rotation.y = Math.sin(t * 0.9 + phase) * 0.15;
      if (cape) cape.rotation.x = 0.12 + Math.sin(w * 0.5) * 0.06 * moving + moving * 0.12;
      const blink = (Math.sin(t * 0.7 + phase * 3) > 0.985) ? 0.15 : 1; // 間中眨眼
      for (const e of eyes) e.scale.y = blink;
    },
  };
  return root;
}

// ---------- 😵 腐化動物：變深紫、紅色發光眼、紫色煙霧光環 ----------
const PURPLE = new THREE.Color(0x3c0a5a);
const EVIL = new THREE.Color(0x8e24aa);
let glowTexture = null;
function glowTex() {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  glowTexture = new THREE.CanvasTexture(c);
  return glowTexture;
}
export { glowTex as towerGlowTex };

const _dir = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _cam = new THREE.Vector3();
export function corrupt(model) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const mats = [];
  const clones = new Map(); // 同一個材質淨係複製一次（好多模型共用材質）
  model.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const list = [].concat(o.material).map((m) => {
      if (!clones.has(m)) {
        const c = m.clone();
        c.userData.orig = { color: m.color?.clone(), emissive: m.emissive?.clone(), ei: m.emissiveIntensity ?? 0, transparent: m.transparent, opacity: m.opacity };
        clones.set(m, c);
        mats.push(c);
      }
      return clones.get(m);
    });
    o.material = Array.isArray(o.material) ? list : list[0];
  });
  // 紅色發光眼：放喺個頭嘅位置（前面、上面）；透過個頭都睇到（depthTest false），淨係佢望住你先見到
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const eyes = new THREE.Group();
  const eyeMat = new THREE.SpriteMaterial({ map: glowTex(), color: 0xff1744, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true });
  const front = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y + size.y * 0.74, box.min.z + size.z * 0.12).applyMatrix4(inv);
  for (const sx of [-1, 1]) {
    const s = new THREE.Sprite(eyeMat);
    const k = Math.max(0.3, Math.min(size.x, size.y) * 0.22) / Math.max(1e-3, model.scale.x);
    s.scale.setScalar(k);
    s.position.set(front.x + sx * (Math.min(size.x, 1.2) * 0.17) / model.scale.x, front.y, front.z);
    s.renderOrder = 6;
    eyes.add(s);
  }
  model.add(eyes);
  // 光環：腳下紫圈 + 幾團煙
  const aura = new THREE.Group();
  const r = Math.max(size.x, size.z) * 0.6 + 0.3;
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.8, r, 32), new THREE.MeshBasicMaterial({ color: 0xd500f9, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -PI / 2;
  ring.position.y = 0.06;
  aura.add(ring);
  const smokeMat = new THREE.SpriteMaterial({ map: glowTex(), color: 0x7b1fa2, transparent: true, opacity: 0.55, depthWrite: false });
  const puffs = [];
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(smokeMat);
    s.userData = { a: (i / 7) * PI * 2, y: Math.random() * size.y, sp: 0.6 + Math.random() * 0.6 };
    s.scale.setScalar(size.y * 0.5 + 0.4);
    aura.add(s);
    puffs.push(s);
  }
  let cureK = 0;
  const api = {
    mats, eyes, aura, size, ring,
    // k 0 = 腐化，1 = 變返正常
    setCure(k) {
      cureK = k;
      for (const m of mats) {
        const o = m.userData.orig;
        if (o.color) m.color.copy(o.color).lerp(PURPLE, 0.6 * (1 - k));
        if (o.emissive) {
          m.emissive.copy(o.emissive).lerp(EVIL, 1 - k);
          m.emissiveIntensity = o.ei + (0.45 - o.ei) * (1 - k);
        }
      }
      eyeMat.opacity = 1 - k;
      ring.material.opacity = 0.55 * (1 - k);
      smokeMat.opacity = 0.55 * (1 - k);
    },
    // 開心咁走：慢慢透明
    fade(k) {
      for (const m of mats) {
        m.transparent = true;
        m.opacity = (m.userData.orig.opacity ?? 1) * (1 - k);
        m.depthWrite = k < 0.5;
      }
    },
    update(t, dt, camPos = null) {
      ring.rotation.z = t * 1.5;
      // 眼：隻動物面向鏡頭先見到（唔係會由後面透過個身見到）
      if (camPos) {
        model.getWorldDirection(_dir).negate(); // 模型面向 -z
        model.getWorldPosition(_pos);
        eyes.visible = _dir.dot(_cam.copy(camPos).sub(_pos).setY(0).normalize()) > 0.2;
      }
      for (const p of puffs) {
        p.userData.a += dt * p.userData.sp;
        p.userData.y = (p.userData.y + dt * 0.6) % Math.max(0.5, size.y);
        p.position.set(Math.cos(p.userData.a) * r * 0.85, p.userData.y + 0.2, Math.sin(p.userData.a) * r * 0.85);
        p.material.opacity = smokeMat.opacity;
      }
      const flick = 0.85 + Math.sin(t * 13) * 0.15;
      eyes.children.forEach((e) => e.material.opacity = (1 - cureK) * flick);
    },
    dispose() {
      for (const m of mats) m.dispose();
      eyeMat.dispose();
      smokeMat.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
    },
    flash(k) {
      for (const m of mats) if (m.emissive) {
        const o = m.userData.orig;
        m.emissive.copy(o.emissive || new THREE.Color(0)).lerp(EVIL, 1 - cureK).lerp(new THREE.Color(0xffffff), k * 0.6);
      }
    },
  };
  api.setCure(0);
  return api;
}
