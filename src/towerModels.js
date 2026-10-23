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
//         Issue #14：'leaper' | 'shield' | 'bomber' | 'frost' | 'splitter' | 'mini' | 'necro'
//   userData.crouch = 0–1（Leaper 跳之前踎低）· userData.bomb（Bomber 手上個南瓜炸彈）· userData.orb（Necro 杖頭綠光球）
//   userData.handGlow（Frost 雙手發光材質）· parts() 入面 block: true + fwd = 盾牌（Shield Zombie，喺前面 fwd 米）
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
const EYE_GLOW = { walker: 0xd4ff3a, runner: 0x40ffd0, spitter: 0x76ff03, brute: 0xffab40, king: 0xff4081, leaper: 0x40c4ff, shield: 0xffd740, bomber: 0xff9100, frost: 0x80e8ff, splitter: 0xff4fd8, mini: 0xff80ab, necro: 0x69f0ae };

export const ZOMBIE_LOOK = {
  walker: { scale: 1, hat: 'hair' },
  runner: { scale: 0.86, hat: 'cap' },
  spitter: { scale: 1.02, hat: 'beanie', belly: true },
  brute: { scale: 1.55, hat: 'bandage', broad: true },
  king: { scale: 2.5, hat: 'crown', broad: true, cape: true },
  // Issue #14
  leaper: { scale: 0.95, hat: 'headband', lanky: true },
  shield: { scale: 1.12, hat: 'helmet', shield: true },
  bomber: { scale: 1.05, hat: 'pumpkin', bomber: true },
  frost: { scale: 1.05, hat: 'icicles', frost: true },
  splitter: { scale: 1.3, hat: 'split', broad: true, belly: true, split: true },
  mini: { scale: 0.62, hat: 'sprout' },
  necro: { scale: 1.1, hat: 'witch', cape: true, staff: true },
};

export function buildZombie(kind = 'walker', { seed = 1 } = {}) {
  const look = ZOMBIE_LOOK[kind] || ZOMBIE_LOOK.walker;
  const R = rng(seed + kind.length * 31);
  const pick = (list) => list[Math.floor(R() * list.length) % list.length];
  const root = new THREE.Group();
  const body = new THREE.Group(); // 成個身（搖嚟搖去）
  root.add(body);
  const { B, glow, piv } = kit(root);
  const skin = kind === 'king' ? 0x86cf55 : kind === 'frost' ? 0x9fdcf0 : kind === 'necro' ? 0xa8cf8a : kind === 'splitter' ? 0x9be85a : pick(SKINS);
  const skinDark = new THREE.Color(skin).multiplyScalar(0.78).getHex();
  const shirt = kind === 'king' ? 0x6a1b9a : kind === 'runner' ? pick([0xff7043, 0x29b6f6, 0xffca28])
    : { leaper: 0x37474f, shield: 0x8d6e63, bomber: 0x5d4037, frost: 0x1e88e5, splitter: 0x7e57c2, necro: 0x4a148c, mini: pick([0xff8a65, 0x4dd0e1, 0xffd54f]) }[kind] ?? pick(SHIRTS);
  const shirtDark = new THREE.Color(shirt).multiplyScalar(0.72).getHex();
  const pants = kind === 'brute' ? 0x3d5a80 : pick(PANTS);
  const eyeC = EYE_GLOW[kind] || EYE_GLOW.walker;
  const broad = look.broad ? 1.18 : 1;

  // ---- 腳 ----
  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = piv(body, sx * 0.19 * broad, 0.78, 0);
    const shortLeg = kind === 'runner' || kind === 'mini'; // 短褲
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
  let handGlow = null;
  for (const sx of [-1, 1]) {
    const sh = piv(torso, sx * (tw / 2 + 0.11), th - 0.1, 0);
    B(sh, 0.22, 0.24, 0.24, shirt, 0, -0.04, 0, { line: 0.06 }); // 衫袖
    const armL = look.lanky ? 1.3 : 1; // Leaper：長手
    B(sh, 0.19, 0.5 * armL, 0.19, skin, 0, -0.36 * armL, 0, { line: 0.07 });
    if (sx === -1 && !look.frost) B(sh, 0.21, 0.08, 0.21, 0xf5f0e1, 0, -0.32, 0, { line: 0, r: 0.2 }); // 繃帶
    if (sx === -1 && !look.frost) B(sh, 0.21, 0.06, 0.21, 0xe0d8c3, 0, -0.42, 0, { line: 0, r: 0.2 });
    const handM = look.frost ? (handGlow ||= glow(0x80e8ff, 0.8)) : skin; // ❄️ Frost：雙手發藍光
    const hand = B(sh, 0.22, 0.2, 0.22, handM, 0, -0.66 * armL - (armL - 1) * 0.1, 0, { line: 0.07 });
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

  // ---- Issue #14：新殭屍嘅帽 + 道具 ----
  const extra = {};
  if (look.hat === 'headband') { // 🦘 Leaper：紅色頭巾 + 兩條帶喺後面飄 + 護膝
    B(head, hw + 0.05, 0.1, 0.6, 0xe53935, 0, 0.16, 0, { line: 0.06 });
    const tails = piv(head, 0.12, 0.16, 0.31);
    for (const [x, rz] of [[-0.05, 0.3], [0.07, -0.2]]) B(tails, 0.07, 0.3, 0.03, 0xc62828, x, -0.14, 0.02, { line: 0.1 }).rotation.z = rz;
    extra.tails = tails;
    for (let i = 0; i < 4; i++) B(head, 0.12, 0.12, 0.12, 0x263238, -0.18 + i * 0.12, 0.33, 0.02, { line: 0.1 }).rotation.z = (i - 1.5) * 0.25; // 刺刺頭髮
    for (const hip of legs) B(hip, 0.27, 0.14, 0.06, 0x546e7a, 0, -0.44, -0.16, { line: 0.1 });
  } else if (look.hat === 'helmet') { // 🛡️ Shield：鐵桶頭盔（中間一條罅見到發光眼）
    const steel = 0x90a4ae;
    B(head, hw + 0.1, 0.5, 0.66, steel, 0, 0.14, 0, { line: 0.05, o: { metalness: 0.6, roughness: 0.35 } });
    B(head, hw + 0.12, 0.06, 0.03, 0x37474f, 0, 0.1, -0.34, { line: 0, r: 0.2 }); // 眼罅
    B(head, 0.08, 0.3, 0.03, 0x78909c, 0, -0.05, -0.335, { line: 0.1 });
    B(head, 0.1, 0.22, 0.1, 0xff1744, 0, 0.48, 0.05, { line: 0.1 }); // 紅色羽毛
    for (const sx of [-1, 1]) B(head, 0.05, 0.05, 0.05, 0xffd54f, sx * 0.3, 0.14, -0.3, { line: 0, r: 0.5 });
    // 大木盾（擋子彈！）：木板 + 鐵邊 + 南瓜徽章 + 釘
    const shield = piv(torso, 0.05, th * 0.42, -0.8);
    shield.rotation.y = 0.08;
    const sw = 0.95;
    const shh = 1.15;
    B(shield, sw, shh, 0.1, 0x8d5a2b, 0, 0, 0, { line: 0.25 });
    for (let i = 0; i < 4; i++) B(shield, 0.012, shh * 0.96, 0.02, 0x5d3a1a, -sw / 2 + (i + 1) * (sw / 5), 0, -0.055, { line: 0, r: 0.1 }); // 木紋
    B(shield, sw + 0.06, 0.08, 0.13, 0x607d8b, 0, shh / 2, 0, { line: 0.1, o: { metalness: 0.6, roughness: 0.35 } });
    B(shield, sw + 0.06, 0.08, 0.13, 0x607d8b, 0, -shh / 2, 0, { line: 0.1, o: { metalness: 0.6, roughness: 0.35 } });
    for (const sx of [-1, 1]) B(shield, 0.08, shh, 0.13, 0x607d8b, sx * sw / 2, 0, 0, { line: 0.1, o: { metalness: 0.6, roughness: 0.35 } });
    const emblem = B(shield, 0.34, 0.3, 0.06, 0xff8f00, 0, 0.05, -0.07, { line: 0.12, r: 0.45 });
    B(emblem, 0.05, 0.08, 0.03, 0x2e7d32, 0, 0.19, 0, { line: 0.1 });
    for (const sx of [-1, 1]) B(emblem, 0.07, 0.06, 0.02, glow(0xffe082, 1.6), sx * 0.08, 0.03, -0.035, { line: 0, r: 0.3 });
    B(emblem, 0.16, 0.04, 0.02, glow(0xffe082, 1.6), 0, -0.07, -0.035, { line: 0, r: 0.3 });
    for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) B(shield, 0.06, 0.06, 0.04, 0xcfd8dc, x * (sw / 2 - 0.12), y * (shh / 2 - 0.13), -0.06, { line: 0, r: 0.5 });
    extra.shield = shield;
  } else if (look.hat === 'pumpkin') { // 💣 Bomber：戴住個南瓜殼做頭盔 + 心口一條南瓜炸彈帶
    const pk = B(head, hw + 0.14, 0.34, 0.7, 0xff8f00, 0, 0.3, 0, { line: 0.07, r: 0.45 });
    for (const x of [-0.2, 0, 0.2]) B(pk, 0.03, 0.32, 0.72, 0xe65100, x, 0, 0, { line: 0, r: 0.3 });
    B(pk, 0.08, 0.14, 0.08, 0x2e7d32, 0.05, 0.22, 0, { line: 0.1 });
    // 斜孭帶 + 三粒細南瓜炸彈（引信發光）
    const strap = piv(torso, 0, th * 0.55, -0.2);
    strap.rotation.z = 0.75;
    B(strap, 0.1, 1.05, 0.04, 0x3e2723, 0, 0, 0, { line: 0.1 });
    for (let i = 0; i < 3; i++) {
      const pb = B(strap, 0.15, 0.13, 0.13, 0xff9100, 0, -0.3 + i * 0.3, -0.07, { line: 0.12, r: 0.45 });
      B(pb, 0.02, 0.07, 0.02, glow(0xffeb3b, 2.5), 0, 0.09, 0, { line: 0 });
    }
    // 手上準備掟嘅南瓜炸彈（攻擊先出）
    const hand = arms[1];
    const bomb = piv(hand, 0, -0.85, 0);
    const bb = B(bomb, 0.34, 0.3, 0.34, 0xff8f00, 0, 0, 0, { line: 0.1, r: 0.45 });
    for (const sx of [-1, 1]) B(bb, 0.07, 0.06, 0.02, glow(0xffe082, 2), sx * 0.07, 0.03, -0.17, { line: 0, r: 0.3 });
    B(bb, 0.15, 0.04, 0.02, glow(0xffe082, 2), 0, -0.06, -0.17, { line: 0, r: 0.3 });
    const fuse = B(bb, 0.03, 0.12, 0.03, 0x5d4037, 0, 0.19, 0, { line: 0 });
    B(fuse, 0.08, 0.08, 0.08, glow(0xffeb3b, 3), 0, 0.07, 0, { line: 0, r: 0.5 });
    bomb.visible = false;
    extra.bomb = bomb;
  } else if (look.hat === 'icicles') { // ❄️ Frost：冰柱皇冠 + 圍巾 + 膊頭冰晶
    const ice = glow(0x80e8ff, 1.3);
    B(head, hw + 0.04, 0.08, 0.6, 0xe1f5fe, 0, 0.3, 0, { line: 0.08 }); // 雪帽邊
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      const c = new THREE.Mesh(cached('icecone', () => new THREE.ConeGeometry(0.07, 0.3, 5)), ice);
      c.position.set(Math.sin(a) * 0.22, 0.46 + (i % 2) * 0.06, Math.cos(a) * 0.22);
      head.add(c);
    }
    for (const sx of [-1, 1]) {
      const c = new THREE.Mesh(cached('icecone2', () => new THREE.ConeGeometry(0.1, 0.32, 5)), ice);
      c.position.set(sx * (tw / 2 + 0.1), th + 0.12, 0.02);
      c.rotation.z = -sx * 0.4;
      torso.add(c);
    }
    B(torso, tw + 0.08, 0.14, 0.44, 0xffffff, 0, th - 0.02, 0, { line: 0.08 }); // 白藍圍巾
    B(torso, 0.14, 0.4, 0.06, 0x29b6f6, tw * 0.25, th * 0.7, -0.23, { line: 0.1 });
    for (let i = 0; i < 3; i++) B(torso, 0.15, 0.04, 0.07, 0xffffff, tw * 0.25, th * 0.8 - i * 0.12, -0.24, { line: 0 });
  } else if (look.hat === 'split') { // ✂️ Splitter：一邊綠一邊紫、中間一條大縫線（打散 = 一開二）
    B(torso, tw / 2, th * 0.98, 0.39, 0x26a69a, tw / 4, th / 2, 0, { line: 0.05 }); // 半邊衫唔同色
    stitch(B, torso, 0, th * 0.5, -0.215, th * 0.9, { vertical: true, n: 6, color: 0xffeb3b });
    stitch(B, head, 0, 0.0, -0.3, 0.56, { vertical: true, n: 4, color: 0xffeb3b });
    for (const sx of [-1, 1]) B(head, 0.18, 0.12, 0.18, sx < 0 ? 0x6a1b9a : 0x00897b, sx * 0.16, 0.34, 0, { line: 0.1 });
  } else if (look.hat === 'sprout') { // 🌱 Mini：頭頂一棵芽
    B(head, 0.04, 0.16, 0.04, 0x388e3c, 0, 0.36, 0, { line: 0.1 });
    for (const sx of [-1, 1]) B(head, 0.14, 0.05, 0.08, 0x66bb6a, sx * 0.08, 0.44, 0, { line: 0.1, r: 0.4 }).rotation.z = sx * 0.4;
  } else if (look.hat === 'witch') { // 🧙 Necro-Witch：尖帽 + 綠光法杖
    const hatM = 0x311b92;
    B(head, hw + 0.4, 0.06, 0.95, hatM, 0, 0.3, 0, { line: 0.1 }); // 帽邊
    const cone1 = piv(head, 0, 0.32, 0);
    B(cone1, 0.6, 0.3, 0.6, hatM, 0, 0.15, 0, { line: 0.08, r: 0.2 });
    B(cone1, 0.62, 0.08, 0.62, 0x69f0ae, 0, 0.06, 0, { line: 0.05 });
    B(cone1, 0.14, 0.1, 0.04, 0xffd54f, 0, 0.06, -0.32, { line: 0.1 });
    const c2 = piv(cone1, 0, 0.3, 0);
    c2.rotation.z = 0.25;
    B(c2, 0.4, 0.3, 0.4, hatM, 0.03, 0.12, 0, { line: 0.08, r: 0.2 });
    const c3 = piv(c2, 0.05, 0.25, 0);
    c3.rotation.z = 0.4;
    B(c3, 0.2, 0.25, 0.2, hatM, 0.04, 0.1, 0, { line: 0.1, r: 0.3 });
    // 法杖（右手）
    const staff = piv(arms[1], 0, -0.68, 0);
    const st = B(staff, 0.08, 0.08, 1.7, 0x4e342e, 0, 0, 0.35, { line: 0.12 });
    st.rotation.x = 0;
    for (const z of [-0.2, 0.6]) B(staff, 0.11, 0.11, 0.06, 0xffd54f, 0, 0, z, { line: 0.1 });
    const orbG = piv(staff, 0, 0, 1.3);
    B(orbG, 0.3, 0.3, 0.3, glow(0x69f0ae, 2.6), 0, 0, 0, { line: 0.08, r: 0.5 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      B(orbG, 0.05, 0.05, 0.22, 0x4e342e, Math.cos(a) * 0.17, Math.sin(a) * 0.17, -0.12, { line: 0.1 });
    }
    extra.orb = orbG;
  }
  if (look.shield) { // 左手托住塊盾
    arms[0].rotation.x = -PI / 2 + 0.6;
  }

  // 傾側個頭（每隻唔同）
  const tilt = (R() - 0.5) * 0.5 + (R() < 0.5 ? 0.18 : -0.18);
  neck.rotation.z = tilt;
  root.scale.setScalar(look.scale);
  const height = (0.78 + th + 0.04 + 0.6 + 0.3) * look.scale;
  const phase = R() * 10;
  const limp = 0.6 + R() * 0.5; // 拖腳：一隻腳郁得少啲
  const speedK = kind === 'runner' || kind === 'mini' ? 1.8 : kind === 'leaper' ? 1.3 : kind === 'brute' || kind === 'king' || kind === 'splitter' ? 0.75 : 1;
  const sc = look.scale;
  const partList = [
    { y: 1.2 * sc, radius: 0.6 * sc * broad, mult: 1 },
    { y: 2.05 * sc, radius: 0.42 * sc, mult: 1.5, crit: true },
  ];
  if (look.shield) partList.push({ y: 1.12 * sc, radius: 0.64 * sc, mult: 0, block: true, fwd: 0.66 * sc }); // 🛡️ 盾牌（前面）
  root.userData = {
    ...root.userData,
    kind, height, eyes, head, arms, legs, cape, crouch: 0, handGlow, ...extra,
    // 打中範圍（世界座標由 witchTower.js 加返位置；fwd = 向前移幾多）
    parts: () => partList,
    animate(t, moving = 1, attackK = 0) {
      const w = (t + phase) * 5.2 * speedK;
      const s = Math.sin(w);
      const cr = root.userData.crouch || 0; // 🦘 踎低
      legs[0].rotation.x = s * 0.55 * moving - cr * 1.1;
      legs[1].rotation.x = -s * 0.55 * limp * moving - cr * 1.1;
      body.position.y = Math.abs(Math.cos(w)) * 0.06 * moving - cr * 0.3;
      if (extra.tails) extra.tails.rotation.x = 0.3 + Math.sin(t * 9 + phase) * 0.25 * (0.4 + moving);
      if (extra.orb) extra.orb.rotation.z = t * 2;
      if (handGlow) handGlow.emissiveIntensity = 0.7 + Math.sin(t * 4 + phase) * 0.25 + attackK * 2.5;
      body.rotation.z = Math.sin(w) * 0.07 * moving; // 搖嚟搖去
      torso.rotation.x = 0.12 + (kind === 'runner' || kind === 'leaper' ? 0.15 * moving : 0) - attackK * 0.25 + cr * 0.45;
      // 手：伸前、一上一落；攻擊 = 舉高再拍落
      const up = attackK < 0.6 ? attackK / 0.6 : 1 - (attackK - 0.6) / 0.4;
      const smash = attackK >= 0.6 ? (attackK - 0.6) / 0.4 : 0;
      arms[0].rotation.x = look.shield ? -PI / 2 + 0.6 + Math.sin(w + 1) * 0.04 * moving : -PI / 2 + 0.15 + Math.sin(w + 1) * 0.12 * moving - up * 1.1 + smash * 1.6 + cr * 1.2;
      arms[1].rotation.x = -PI / 2 + 0.15 + Math.sin(w + 2.2) * 0.12 * moving - up * 1.1 + smash * 1.6 + cr * 1.2;
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

// ---------- 📦 Weapon Crate（Issue #14：殭屍有機會跌）：木箱 + 紫色鐵角 + 發光「?」+ 蓋罅發光 ----------
// userData.animate(t)、userData.open(k 0–1：個蓋彈開）
let crateTexture = null;
function crateTex() {
  if (crateTexture) return crateTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#fff';
  g.font = '900 96px "Arial Rounded MT Bold", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('?', 64, 70);
  crateTexture = new THREE.CanvasTexture(c);
  return crateTexture;
}
export function buildWeaponCrate() {
  const root = new THREE.Group();
  const box = new THREE.Group();
  root.add(box);
  const { B, glow } = kit(root);
  const wood = 0xa86b32;
  const woodDark = 0x6d4320;
  const metal = 0x5e35b1;
  B(box, 0.9, 0.62, 0.9, wood, 0, 0.31, 0, { line: 0.06, r: 0.12 });
  for (const y of [0.12, 0.31, 0.5]) for (const s of [-1, 1]) { // 木板罅
    B(box, 0.92, 0.025, 0.02, woodDark, 0, y, s * 0.455, { line: 0, r: 0.1 });
    B(box, 0.02, 0.025, 0.92, woodDark, s * 0.455, y, 0, { line: 0, r: 0.1 });
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(box, 0.14, 0.66, 0.14, metal, sx * 0.42, 0.32, sz * 0.42, { line: 0.1, o: { metalness: 0.6, roughness: 0.35 } });
  // 四面發光「?」
  const qMat = new THREE.MeshBasicMaterial({ map: crateTex(), color: 0xffd740, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const q = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), qMat);
    const a = (i * PI) / 2;
    q.position.set(Math.sin(a) * 0.462, 0.31, Math.cos(a) * 0.462);
    q.rotation.y = a;
    box.add(q);
  }
  // 蓋（會彈開）+ 蓋罅發光
  const lid = new THREE.Group();
  lid.position.set(0, 0.62, -0.45);
  box.add(lid);
  B(lid, 0.96, 0.14, 0.96, woodDark, 0, 0.07, 0.45, { line: 0.08, r: 0.15 });
  B(lid, 0.3, 0.06, 0.3, glow(0xffd740, 1.4), 0, 0.16, 0.45, { line: 0.1, r: 0.3 });
  const seamM = glow(0xe040fb, 2.4);
  B(box, 0.94, 0.04, 0.94, seamM, 0, 0.61, 0, { line: 0, r: 0.1 });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xe040fb, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(2.2);
  halo.position.y = 0.35;
  root.add(halo);
  root.userData.animate = (t) => {
    box.rotation.y = t * 1.2;
    box.position.y = 0.25 + Math.sin(t * 3) * 0.12;
    seamM.emissiveIntensity = 2 + Math.sin(t * 6) * 0.8;
    qMat.opacity = 0.75 + Math.sin(t * 4) * 0.25;
    halo.material.opacity = 0.5 + Math.sin(t * 3) * 0.2;
    halo.material.color.setHSL(0.78 + Math.sin(t * 0.9) * 0.08, 1, 0.6);
  };
  root.userData.open = (k) => (lid.rotation.x = -k * 1.9);
  const baseDispose = root.userData.dispose;
  root.userData.dispose = () => {
    baseDispose();
    qMat.dispose();
    halo.material.dispose();
  };
  return root;
}
