// 🧟 Witch Tower 新殭屍模型（小朋友 Issue #15，2026-10-25）：同 towerModels.js 一樣嘅圓角方塊 + 深色描邊卡通風格
//   buildBat()      🦇 Vampire Bat：細細隻、翼會拍、紅色發光眼、兩隻細牙（可愛唔恐怖）
//   buildLeader()   🚩 Zombie Leader：大隻、鐵頭盔 + 金色皇冠尖 + 角、背脊一支旗、右手一個戰號角
//   buildDraculo()  🧛 Draculo：白綠面、黑頭髮尖額、黑紅披風 + 高衫領、紅煲呔
//   buildBalloon()  🎈 Zombie Balloon：吊喺 4 個氣球下面，腰間一袋南瓜炸彈；userData.pop(i) 爆一個、userData.land() 跌落地變普通殭屍
//   buildCannon()   💥 Zombie Cannon：推住一門有轆嘅南瓜大炮（userData.barrel 升降、userData.recoil(k)、userData.wheelSpin(d)）
//   buildCannonball() 大炮彈（黑鐵 + 發光南瓜面 + 引信火花）
// 每個 model：userData.height / animate(t, moving, attackK) / parts() / flash(k) / dispose()（同 buildZombie 一樣）；全部面向 -z

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { towerGlowTex } from './towerModels.js';

const PI = Math.PI;
const geoCache = new Map();
const cached = (k, make) => {
  if (!geoCache.has(k)) geoCache.set(k, make());
  return geoCache.get(k);
};
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x120a18, side: THREE.BackSide });
function rng(seed) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

// ---------- 每隻自己嘅材質（打中白一白）+ 圓角方塊 ----------
function kit(root) {
  const mats = new Map();
  const flashable = [];
  const extra = []; // sprite 等等要自己 dispose
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
  const B = (parent, w, h, d, color, x = 0, y = 0, z = 0, { r = 0.22, line = 0.08, o = {} } = {}) => {
    const g = cached(`rb${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * r));
    const m = new THREE.Mesh(g, typeof color === 'number' ? mat(color, o) : color);
    m.position.set(x, y, z);
    m.castShadow = true;
    if (line) {
      const t = Math.min(w, h, d) * line;
      const ol = new THREE.Mesh(g, OUTLINE);
      ol.scale.set(1 + (2 * t) / w, 1 + (2 * t) / h, 1 + (2 * t) / d);
      m.add(ol);
    }
    parent.add(m);
    return m;
  };
  // 其他形狀（球、圓柱）：geo 用 cache，材質用返 mat()
  const S = (parent, geoKey, makeGeo, color, x = 0, y = 0, z = 0, { line = 0, o = {} } = {}) => {
    const g = cached(geoKey, makeGeo);
    const m = new THREE.Mesh(g, typeof color === 'number' ? mat(color, o) : color);
    m.position.set(x, y, z);
    m.castShadow = true;
    if (line) {
      const ol = new THREE.Mesh(g, OUTLINE);
      ol.scale.setScalar(1 + line);
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
  const halo = (parent, color, size, y = 0, opacity = 0.6) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(size);
    s.position.y = y;
    parent.add(s);
    extra.push(s.material);
    return s;
  };
  root.userData.flash = (k) => {
    for (const m of flashable) m.emissiveIntensity = k * 0.9;
  };
  root.userData.dispose = () => {
    mats.forEach((m) => m.dispose());
    for (const m of extra) m.dispose();
  };
  return { B, S, mat, glow, piv, halo };
}

// 一條縫線
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

// ---------- 方塊殭屍身（腳、身、手、頭、眼）：同 buildZombie 一樣嘅比例，等每款加自己嘅帽同道具 ----------
const SKINS = [0x8fd84a, 0x76c93a, 0xa3e05c, 0x67bf45, 0x6fd28a, 0x9bdc5a];
function zombieBase(root, R, { skin, shirt, pants = 0x4e5d94, shoes = 0x3e2723, eye = 0xd4ff3a, broad = 1, mouth = 'teeth', bandage = true, patch = true }) {
  const kitApi = kit(root);
  const { B, glow, piv } = kitApi;
  const body = piv(root);
  const skinDark = new THREE.Color(skin).multiplyScalar(0.78).getHex();
  const shirtDark = new THREE.Color(shirt).multiplyScalar(0.72).getHex();
  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = piv(body, sx * 0.19 * broad, 0.78, 0);
    B(hip, 0.27, 0.42, 0.3, pants, 0, -0.2, 0);
    B(hip, 0.24, 0.32, 0.27, pants, 0, -0.52, 0, { line: 0.06 });
    B(hip, 0.29, 0.14, 0.38, shoes, 0, -0.71, -0.04, { line: 0.08 });
    legs.push(hip);
  }
  const torso = piv(body, 0, 0.78, 0);
  const tw = 0.62 * broad;
  const th = 0.78;
  B(torso, tw, th, 0.38, shirt, 0, th / 2, 0);
  for (let i = 0; i < 5; i++) {
    const x = (-0.5 + (i + 0.5) / 5) * tw;
    const h = 0.08 + R() * 0.12;
    B(torso, tw / 5.4, h, 0.4, i % 2 ? shirtDark : shirt, x, -h / 2 + 0.03, 0, { line: 0, r: 0.15 });
  }
  if (patch) {
    B(torso, 0.16, 0.12, 0.02, skin, tw * 0.22, th * 0.38, -0.195, { line: 0.12 });
    stitch(B, torso, -tw * 0.12, th * 0.2, -0.2, 0.22, { n: 3, tilt: 0.5 });
  }
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = piv(torso, sx * (tw / 2 + 0.11), th - 0.1, 0);
    B(sh, 0.22, 0.24, 0.24, shirt, 0, -0.04, 0, { line: 0.06 });
    B(sh, 0.19, 0.5, 0.19, skin, 0, -0.36, 0, { line: 0.07 });
    if (sx === -1 && bandage) B(sh, 0.21, 0.08, 0.21, 0xf5f0e1, 0, -0.32, 0, { line: 0, r: 0.2 });
    const hand = B(sh, 0.22, 0.2, 0.22, skin, 0, -0.66, 0, { line: 0.07 });
    for (let f = 0; f < 3; f++) B(hand, 0.05, 0.12, 0.05, skinDark, -0.06 + f * 0.06, -0.14, -0.04, { line: 0, r: 0.3 });
    sh.rotation.x = -PI / 2 + 0.15;
    arms.push(sh);
  }
  const neck = piv(torso, 0, th + 0.04, 0);
  const head = piv(neck, 0, 0.3, 0);
  const hw = 0.62;
  B(head, hw, 0.6, 0.58, skin, 0, 0, 0, { r: 0.25 });
  const eyes = [];
  const eyeLight = new THREE.Color(eye).lerp(new THREE.Color(0xffffff), 0.12).getHex();
  for (const sx of [-1, 1]) {
    const big = sx === 1 ? 1.12 : 0.92;
    B(head, 0.22 * big, 0.22 * big, 0.03, skinDark, sx * 0.15, 0.07, -0.29, { line: 0, r: 0.35 });
    const ball = B(head, 0.17 * big, 0.17 * big, 0.05, glow(eyeLight, 1.3), sx * 0.15, 0.07, -0.305, { line: 0.12, r: 0.4 });
    B(ball, 0.07 * big, 0.07 * big, 0.03, 0x14081c, sx === 1 ? 0.02 : -0.02, -0.01, -0.025, { line: 0, r: 0.4 });
    eyes.push(ball);
  }
  if (mouth === 'teeth') {
    B(head, 0.28, 0.08, 0.03, 0x2a1020, 0, -0.15, -0.3, { line: 0, r: 0.3 });
    B(head, 0.06, 0.06, 0.03, 0xffffff, -0.06, -0.12, -0.315, { line: 0, r: 0.2 });
    B(head, 0.06, 0.05, 0.03, 0xffffff, 0.07, -0.125, -0.315, { line: 0, r: 0.2 });
  } else if (mouth === 'fangs') { // 🧛 兩隻尖牙（白色，冇血）
    B(head, 0.26, 0.06, 0.03, 0x2a1020, 0, -0.15, -0.3, { line: 0, r: 0.3 });
    for (const sx of [-1, 1]) {
      const f = new THREE.Mesh(cached('fang', () => new THREE.ConeGeometry(0.035, 0.12, 4)), kitApi.mat(0xffffff));
      f.rotation.x = PI;
      f.position.set(sx * 0.08, -0.21, -0.31);
      head.add(f);
    }
  } else if (mouth === 'grin') { // 開心笑（大炮殭屍）
    B(head, 0.3, 0.1, 0.03, 0x2a1020, 0, -0.15, -0.3, { line: 0, r: 0.4 });
    for (const x of [-0.09, 0, 0.09]) B(head, 0.06, 0.05, 0.03, 0xffffff, x, -0.12, -0.315, { line: 0, r: 0.2 });
  }
  for (const sx of [-1, 1]) B(head, 0.06, 0.14, 0.1, skinDark, sx * (hw / 2 + 0.02), 0, 0, { line: 0.1 });
  const tilt = (R() - 0.5) * 0.4;
  neck.rotation.z = tilt;
  const phase = R() * 10;
  const limp = 0.6 + R() * 0.5;
  // 普通殭屍行路 + 攻擊（同 buildZombie 一樣）
  const animate = (t, moving = 1, attackK = 0, speedK = 1) => {
    const w = (t + phase) * 5.2 * speedK;
    const s = Math.sin(w);
    legs[0].rotation.x = s * 0.55 * moving;
    legs[1].rotation.x = -s * 0.55 * limp * moving;
    body.position.y = Math.abs(Math.cos(w)) * 0.06 * moving;
    body.rotation.z = Math.sin(w) * 0.07 * moving;
    torso.rotation.x = 0.12 - attackK * 0.25;
    const up = attackK < 0.6 ? attackK / 0.6 : 1 - (attackK - 0.6) / 0.4;
    const smash = attackK >= 0.6 ? (attackK - 0.6) / 0.4 : 0;
    arms[0].rotation.set(-PI / 2 + 0.15 + Math.sin(w + 1) * 0.12 * moving - up * 1.1 + smash * 1.6, 0, -0.08 + Math.sin(t * 1.3 + phase) * 0.05);
    arms[1].rotation.set(-PI / 2 + 0.15 + Math.sin(w + 2.2) * 0.12 * moving - up * 1.1 + smash * 1.6, 0, 0.08 - Math.sin(t * 1.1 + phase) * 0.05);
    neck.rotation.z = tilt + Math.sin(t * 1.7 + phase) * 0.12;
    neck.rotation.x = Math.sin(t * 2.3 + phase) * 0.06 - attackK * 0.2;
    head.rotation.y = Math.sin(t * 0.9 + phase) * 0.15;
    const blink = Math.sin(t * 0.7 + phase * 3) > 0.985 ? 0.15 : 1;
    for (const e of eyes) e.scale.y = blink;
    return w;
  };
  return { ...kitApi, body, legs, torso, arms, neck, head, eyes, tw, th, hw, skin, skinDark, shirt, phase, animate };
}

// ================= 🦇 Vampire Bat =================
export function buildBat({ seed = 1 } = {}) {
  const R = rng(seed + 7);
  const root = new THREE.Group();
  const { B, glow, piv, halo } = kit(root);
  const fur = [0x5a3a7e, 0x63408a, 0x4f3472][Math.floor(R() * 3)]; // 唔好太深色：塔入面紫色背景都睇到
  const belly = 0xa784b8;
  const wingC = 0x8e44b8;
  const wingDark = 0x6a2f90;
  const body = piv(root, 0, 0.9, 0); // 身喺腳底上面 0.9 米（企喺地都似喺度飛）
  B(body, 0.42, 0.4, 0.5, fur, 0, 0, 0, { r: 0.4 });
  B(body, 0.3, 0.26, 0.06, belly, 0, -0.04, -0.24, { line: 0.1, r: 0.4 });
  // 頭 + 大耳仔
  const head = piv(body, 0, 0.17, -0.3);
  B(head, 0.36, 0.32, 0.32, fur, 0, 0, 0, { r: 0.35 });
  for (const sx of [-1, 1]) {
    const ear = piv(head, sx * 0.12, 0.14, 0.02);
    ear.rotation.z = -sx * 0.3;
    B(ear, 0.12, 0.26, 0.06, fur, 0, 0.12, 0, { line: 0.12, r: 0.3 });
    B(ear, 0.06, 0.16, 0.02, 0xf48fb1, 0, 0.11, -0.035, { line: 0, r: 0.3 });
  }
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = B(head, 0.1, 0.1, 0.04, glow(0xff1744, 2.6), sx * 0.085, 0.04, -0.165, { line: 0.12, r: 0.45 });
    B(e, 0.035, 0.035, 0.02, 0xffffff, sx * 0.015, 0.02, -0.02, { line: 0, r: 0.4 }); // 亮點
    eyes.push(e);
  }
  B(head, 0.1, 0.06, 0.05, 0xd48aa8, 0, -0.04, -0.17, { line: 0.1, r: 0.4 }); // 豬仔鼻
  for (const sx of [-1, 1]) {
    const f = new THREE.Mesh(cached('batFang', () => new THREE.ConeGeometry(0.02, 0.06, 4)), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    root.userData._fangMats = (root.userData._fangMats || []).concat(f.material);
    f.rotation.x = PI;
    f.position.set(sx * 0.04, -0.12, -0.16);
    head.add(f);
  }
  // 翼：膊頭 → 手肘 → 三塊翼膜（一塊比一塊短）
  const wings = [];
  for (const sx of [-1, 1]) {
    const sh = piv(body, sx * 0.2, 0.08, 0);
    const bone1 = B(sh, 0.45, 0.06, 0.06, fur, sx * 0.22, 0, 0, { line: 0.15 });
    void bone1;
    B(sh, 0.45, 0.03, 0.42, wingC, sx * 0.22, -0.02, 0.18, { line: 0.25, r: 0.1 });
    const elbow = piv(sh, sx * 0.44, 0, 0);
    B(elbow, 0.5, 0.05, 0.05, fur, sx * 0.25, 0, 0, { line: 0.15 });
    for (let i = 0; i < 3; i++) {
      const len = 0.5 - i * 0.08;
      const panel = B(elbow, len * 0.9, 0.025, 0.36 - i * 0.06, i % 2 ? wingDark : wingC, sx * (0.06 + i * 0.16), -0.02, 0.17 + i * 0.03, { line: 0.25, r: 0.1 });
      panel.rotation.y = sx * (0.15 + i * 0.2);
    }
    B(elbow, 0.08, 0.08, 0.08, 0xcfd8dc, sx * 0.5, 0.02, 0, { line: 0.1, r: 0.4 }); // 翼尖細爪
    wings.push({ sh, elbow, sx });
  }
  // 腳仔
  const feet = piv(body, 0, -0.2, 0.15);
  for (const sx of [-1, 1]) B(feet, 0.06, 0.12, 0.06, 0x2a1a3a, sx * 0.08, -0.04, 0, { line: 0.1 });
  const glowS = halo(body, 0xff1744, 1.3, 0.1, 0.35);
  const phase = R() * 10;
  root.userData = {
    ...root.userData,
    height: 1.45,
    size: new THREE.Vector3(1.4, 0.7, 0.7),
    eyes, wings,
    parts: () => [
      { y: 0.9, radius: 0.6, mult: 1 },
      { y: 1.08, radius: 0.3, mult: 1.5, crit: true, fwd: 0.3 },
    ],
    // moving 0–1：拍翼速度；attackK 1 = 收埋翼俯衝
    animate(t, moving = 1, attackK = 0) {
      const sp = 14 + moving * 8;
      const fl = Math.sin((t + phase) * sp);
      for (const w of wings) {
        const open = 1 - attackK * 0.75;
        w.sh.rotation.z = w.sx * (fl * 0.75 * open + 0.1 - attackK * 0.5);
        w.elbow.rotation.z = w.sx * (fl * 0.45 * open - attackK * 0.6);
        w.sh.rotation.y = -w.sx * attackK * 0.6; // 向後收
      }
      body.position.y = 0.9 - fl * 0.06 * (1 - attackK);
      body.rotation.x = attackK * 0.5;
      head.rotation.y = Math.sin(t * 2 + phase) * 0.2 * (1 - attackK);
      glowS.material.opacity = 0.25 + attackK * 0.5;
      for (const e of eyes) e.material.emissiveIntensity = 2.4 + attackK * 2;
    },
  };
  const baseDispose = root.userData.dispose;
  root.userData.dispose = () => {
    baseDispose();
    for (const m of root.userData._fangMats || []) m.dispose();
  };
  return root;
}

// ================= 🚩 Zombie Leader =================
export function buildLeader({ seed = 1 } = {}) {
  const R = rng(seed + 31);
  const root = new THREE.Group();
  const Z = zombieBase(root, R, { skin: 0x7fcf4a, shirt: 0x8e1b1b, pants: 0x3e2723, shoes: 0x212121, eye: 0xff9100, broad: 1.2 });
  const { B, S, glow, piv, torso, head, arms, tw, th, hw } = Z;
  const iron = { o: { metalness: 0.6, roughness: 0.35 } };
  const gold = glow(0xffc107, 0.45);
  // 金邊戰袍 + 腰帶 + 鐵膊甲
  B(torso, tw + 0.02, 0.07, 0.4, 0xffc107, 0, th * 0.98, 0, { line: 0.05 });
  B(torso, tw * 0.5, th * 0.75, 0.04, 0xffb300, 0, th * 0.5, -0.2, { line: 0.1 });
  B(torso, tw * 0.42, th * 0.68, 0.04, 0x6a1b9a, 0, th * 0.5, -0.215, { line: 0 });
  const emb = B(torso, 0.2, 0.18, 0.04, 0xff8f00, 0, th * 0.55, -0.235, { line: 0.15, r: 0.45 }); // 南瓜徽章
  for (const sx of [-1, 1]) B(emb, 0.05, 0.04, 0.02, glow(0xffe082, 2), sx * 0.045, 0.02, -0.025, { line: 0, r: 0.3 });
  B(torso, tw + 0.06, 0.12, 0.42, 0x4e342e, 0, 0.06, 0, { line: 0.06 });
  B(torso, 0.14, 0.12, 0.04, 0xffc107, 0, 0.06, -0.22, { line: 0.1 });
  for (const sx of [-1, 1]) {
    const pad = piv(torso, sx * (tw / 2 + 0.1), th - 0.02, 0);
    B(pad, 0.34, 0.14, 0.4, 0x78909c, 0, 0, 0, { line: 0.08, ...iron });
    B(pad, 0.36, 0.05, 0.42, 0xffc107, 0, -0.07, 0, { line: 0 });
    for (const z of [-0.12, 0.12]) B(pad, 0.06, 0.06, 0.06, 0xcfd8dc, sx * 0.08, 0.08, z, { line: 0, r: 0.5 });
  }
  // 鐵頭盔 + 金皇冠尖 + 兩隻角
  B(head, hw + 0.1, 0.32, 0.66, 0x78909c, 0, 0.24, 0, { line: 0.05, ...iron });
  B(head, hw + 0.12, 0.08, 0.68, 0xffc107, 0, 0.1, 0, { line: 0.05 });
  B(head, 0.08, 0.26, 0.04, 0x90a4ae, 0, 0.0, -0.33, { line: 0.1, ...iron }); // 護鼻
  for (let i = 0; i < 5; i++) {
    const x = -0.24 + i * 0.12;
    B(head, 0.08, i === 2 ? 0.24 : 0.16, 0.08, gold, x, 0.46 + (i === 2 ? 0.04 : 0), -0.28, { line: 0.1 });
  }
  B(head, 0.08, 0.08, 0.03, glow(0xff1744, 2), 0, 0.3, -0.345, { line: 0 });
  for (const sx of [-1, 1]) {
    const horn = piv(head, sx * 0.36, 0.3, 0);
    horn.rotation.z = -sx * 0.9;
    B(horn, 0.12, 0.22, 0.12, 0xf5f0e1, 0, 0.1, 0, { line: 0.1 });
    const h2 = piv(horn, 0, 0.2, 0);
    h2.rotation.z = sx * 0.7;
    B(h2, 0.09, 0.2, 0.09, 0xe8dcc0, 0, 0.09, 0, { line: 0.1 });
    B(h2, 0.06, 0.12, 0.06, 0xd7c7a0, 0, 0.23, 0, { line: 0.1 });
  }
  // 背脊一支旗（旗會飄）
  const pole = piv(torso, -tw * 0.3, th * 0.4, 0.28);
  B(pole, 0.07, 2.3, 0.07, 0x5d4037, 0, 0.9, 0, { line: 0.12 });
  S(pole, 'leaderPoleTop', () => new THREE.OctahedronGeometry(0.11), gold, 0, 2.1, 0);
  const flag = [];
  let fp = piv(pole, 0.03, 1.95, 0);
  for (let i = 0; i < 4; i++) {
    const seg = piv(fp, 0, 0, 0);
    B(seg, 0.24, 0.8, 0.03, i % 2 ? 0x7b1fa2 : 0x8e24aa, 0.12, -0.38, 0, { line: 0.12, r: 0.1 });
    B(seg, 0.24, 0.08, 0.04, 0xffc107, 0.12, 0.0, 0, { line: 0 });
    if (i === 1) {
      const pk = B(seg, 0.3, 0.26, 0.05, 0xff8f00, 0.12, -0.4, 0, { line: 0.12, r: 0.45 });
      for (const sx of [-1, 1]) B(pk, 0.06, 0.05, 0.06, glow(0xffe082, 2.2), sx * 0.07, 0.03, 0, { line: 0, r: 0.3 });
      B(pk, 0.14, 0.035, 0.06, glow(0xffe082, 2.2), 0, -0.06, 0, { line: 0, r: 0.3 });
    }
    if (i === 3) for (let k = 0; k < 2; k++) B(seg, 0.1, 0.14, 0.03, 0x7b1fa2, 0.06 + k * 0.12, -0.84, 0, { line: 0.12, r: 0.1 }).rotation.z = PI / 4;
    flag.push(seg);
    fp = piv(seg, 0.24, 0, 0);
  }
  // 右手：戰號角（象牙色 + 金圈，越嚟越大）
  const horn = piv(arms[1], 0, -0.7, -0.05);
  const hornParts = [];
  for (let i = 0; i < 4; i++) {
    const s = 0.1 + i * 0.05;
    hornParts.push(B(horn, s, s, 0.2, i === 3 ? 0xffc107 : 0xf5f0e1, 0, i * 0.04, -0.05 - i * 0.17, { line: 0.1, r: 0.3 }));
  }
  B(horn, 0.32, 0.32, 0.04, 0x2a1020, 0, 0.12, -0.6, { line: 0, r: 0.4 });
  B(horn, 0.05, 0.05, 0.05, 0xffc107, 0, -0.02, 0.06, { line: 0 });
  const hornGlow = Z.halo(horn, 0xffd740, 1.2, 0.12, 0);
  hornGlow.position.z = -0.7;
  const sc = 1.35;
  root.scale.setScalar(sc);
  root.userData = {
    ...root.userData,
    height: 2.55 * sc,
    size: new THREE.Vector3(1.1 * sc, 2.55 * sc, 0.8 * sc),
    rally: 0, // 0–1：吹號角
    parts: () => [
      { y: 1.2 * sc, radius: 0.66 * sc, mult: 1 },
      { y: 2.05 * sc, radius: 0.44 * sc, mult: 1.5, crit: true },
    ],
    animate(t, moving = 1, attackK = 0) {
      const w = Z.animate(t, moving, attackK, 0.85);
      for (let i = 0; i < flag.length; i++) flag[i].rotation.y = Math.sin(t * 4 - i * 0.9) * (0.25 + i * 0.05) + moving * 0.15;
      const r = root.userData.rally || 0;
      if (r > 0) { // 舉起號角放埋嘴邊，個頭向後仰
        arms[1].rotation.x = THREE.MathUtils.lerp(arms[1].rotation.x, -PI + 0.35, Math.min(1, r * 2));
        arms[1].rotation.z = THREE.MathUtils.lerp(arms[1].rotation.z, -0.55, Math.min(1, r * 2));
        arms[0].rotation.x = -PI / 2 - 0.9 * r;
        Z.neck.rotation.x = -0.35 * Math.min(1, r * 2);
        for (let i = 0; i < hornParts.length; i++) hornParts[i].scale.setScalar(1 + Math.sin(t * 30 + i) * 0.06 * r);
      }
      hornGlow.material.opacity = r * (0.6 + Math.sin(t * 20) * 0.3);
      void w;
    },
  };
  return root;
}

// ================= 🧛 Draculo =================
export function buildDraculo({ seed = 1 } = {}) {
  const R = rng(seed + 53);
  const root = new THREE.Group();
  const Z = zombieBase(root, R, { skin: 0xc9e4b4, shirt: 0x1c1430, pants: 0x1c1430, shoes: 0x111111, eye: 0xff1744, mouth: 'fangs', bandage: false, patch: false });
  const { B, glow, piv, torso, head, arms, tw, th, hw } = Z;
  // 白恤衫 + 紅煲呔 + 金心口章
  B(torso, tw * 0.36, th * 0.75, 0.04, 0xf5f5f5, 0, th * 0.58, -0.19, { line: 0.08 });
  for (const sx of [-1, 1]) B(torso, 0.13, 0.1, 0.05, 0xd50000, sx * 0.08, th * 0.9, -0.22, { line: 0.12, r: 0.3 });
  B(torso, 0.07, 0.07, 0.06, 0xb71c1c, 0, th * 0.9, -0.225, { line: 0.1 });
  const medal = B(torso, 0.13, 0.13, 0.04, glow(0xffc107, 0.6), 0, th * 0.62, -0.23, { line: 0.12, r: 0.45 });
  B(medal, 0.06, 0.06, 0.02, glow(0xff1744, 2.2), 0, 0, -0.025, { line: 0, r: 0.45 });
  // 黑頭髮向後梳 + 尖額（美人尖）+ 尖耳
  B(head, hw + 0.04, 0.16, 0.62, 0x15101e, 0, 0.27, 0.02, { line: 0.07 });
  B(head, hw + 0.06, 0.32, 0.12, 0x15101e, 0, 0.1, 0.27, { line: 0.07 });
  const peak = new THREE.Mesh(cached('drPeak', () => new THREE.ConeGeometry(0.1, 0.16, 4)), Z.mat(0x15101e));
  peak.position.set(0, 0.17, -0.29);
  peak.rotation.set(PI, PI / 4, 0);
  peak.scale.set(1, 1, 0.3);
  head.add(peak);
  for (const sx of [-1, 1]) {
    const ear = piv(head, sx * (hw / 2 + 0.02), 0.04, 0);
    ear.rotation.z = -sx * 0.6;
    B(ear, 0.06, 0.2, 0.1, Z.skinDark, 0, 0.09, 0, { line: 0.1 });
  }
  // 眉（嬲嬲樣）
  for (const sx of [-1, 1]) B(head, 0.18, 0.05, 0.03, 0x15101e, sx * 0.15, 0.2, -0.3, { line: 0, r: 0.3 }).rotation.z = sx * 0.3;
  // 披風：外黑內紅 + 高衫領
  const cape = piv(torso, 0, th - 0.02, 0.22);
  B(cape, tw * 1.45, 1.45, 0.06, 0x120c1c, 0, -0.7, 0.03, { line: 0.4 });
  B(cape, tw * 1.35, 1.38, 0.03, 0xb71c1c, 0, -0.68, -0.02, { line: 0 });
  for (let i = 0; i < 5; i++) { // 蝙蝠翼咁嘅尾
    const p = B(cape, (tw * 1.45) / 5.2, 0.22, 0.06, 0x120c1c, (-0.5 + (i + 0.5) / 5) * tw * 1.45, -1.46, 0.03, { line: 0.2 });
    p.rotation.z = PI / 4;
  }
  for (const sx of [-1, 1]) {
    const col = piv(cape, sx * tw * 0.42, 0.02, -0.02);
    col.rotation.z = -sx * 0.35;
    col.rotation.x = 0.15;
    B(col, 0.26, 0.5, 0.05, 0x120c1c, 0, 0.24, 0, { line: 0.2 });
    B(col, 0.2, 0.44, 0.02, 0xb71c1c, 0, 0.23, -0.03, { line: 0 });
  }
  // 手套（白）
  for (const a of arms) B(a, 0.24, 0.08, 0.24, 0xeeeeee, 0, -0.55, 0, { line: 0.06 });
  const sc = 1.12;
  root.scale.setScalar(sc);
  root.userData = {
    ...root.userData,
    height: 2.5 * sc,
    size: new THREE.Vector3(1 * sc, 2.5 * sc, 0.7 * sc),
    cape,
    parts: () => [
      { y: 1.2 * sc, radius: 0.6 * sc, mult: 1 },
      { y: 2.05 * sc, radius: 0.42 * sc, mult: 1.5, crit: true },
    ],
    // attackK：0–0.6 舉起披風，0.6–1 一下掃過去
    animate(t, moving = 1, attackK = 0) {
      Z.animate(t, moving, 0, 1.1);
      Z.torso.rotation.x = 0.05;
      const up = attackK < 0.6 ? attackK / 0.6 : 1;
      const sweep = attackK >= 0.6 ? (attackK - 0.6) / 0.4 : 0;
      if (attackK > 0) {
        arms[1].rotation.set(-PI / 2 - up * 0.5, up * 1.2 - sweep * 2.6, 0.3 * up);
        arms[0].rotation.set(-PI / 2 - up * 0.3, -up * 0.6 + sweep * 1.4, -0.2 * up);
        Z.body.rotation.y = up * 0.5 - sweep * 1.2;
      } else {
        // 普通行路：雙手放低少少，似紳士
        arms[0].rotation.x = -PI / 2 + 0.7 + Math.sin(t * 2) * 0.05;
        arms[1].rotation.x = -PI / 2 + 0.7 - Math.sin(t * 2) * 0.05;
        Z.body.rotation.y = 0;
      }
      cape.rotation.x = 0.15 + moving * 0.25 + Math.sin(t * 3) * 0.05 + up * 0.5;
      cape.rotation.z = -sweep * 0.5 + up * 0.25;
    },
  };
  return root;
}

// ================= 🎈 Zombie Balloon =================
const BALLOON_COLORS = [0xff1744, 0xab47bc, 0xff9100, 0x00e676, 0x29b6f6];
export function buildBalloon({ seed = 1 } = {}) {
  const R = rng(seed + 77);
  const root = new THREE.Group();
  const Z = zombieBase(root, R, { skin: SKINS[Math.floor(R() * SKINS.length)], shirt: 0xffb300, pants: 0x3f51b5, eye: 0x40c4ff });
  const { B, S, glow, piv, torso, head, arms, legs, tw, th, hw } = Z;
  // 間條 T 恤 + 吊帶 + 派對帽
  for (let i = 0; i < 3; i++) B(torso, tw + 0.02, 0.08, 0.4, 0xe65100, 0, th * (0.25 + i * 0.25), 0, { line: 0 });
  for (const sx of [-1, 1]) B(torso, 0.09, th + 0.1, 0.42, 0x5d4037, sx * tw * 0.26, th / 2, 0, { line: 0.05 });
  B(torso, tw + 0.08, 0.12, 0.44, 0x5d4037, 0, 0.1, 0, { line: 0.05 });
  const hat = new THREE.Mesh(cached('partyHat', () => new THREE.ConeGeometry(0.2, 0.42, 8)), Z.mat(0x00bcd4));
  hat.position.set(0.05, 0.48, 0);
  hat.rotation.z = -0.2;
  head.add(hat);
  S(hat, 'partyPom', () => new THREE.SphereGeometry(0.07, 8, 6), 0xffeb3b, 0, 0.23, 0);
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(cached(`partyBand${i}`, () => new THREE.TorusGeometry(0.18 - i * 0.05, 0.018, 4, 12)), Z.mat(0xff4081));
    band.rotation.x = PI / 2;
    band.position.y = -0.14 + i * 0.12;
    hat.add(band);
  }
  // 腰間一袋南瓜炸彈
  const sack = piv(torso, tw * 0.45, 0.05, -0.1);
  B(sack, 0.36, 0.34, 0.3, 0x8d6e63, 0, -0.12, 0, { line: 0.08, r: 0.4 });
  for (const [x, z] of [[-0.08, -0.05], [0.08, 0.04]]) {
    const pb = B(sack, 0.16, 0.14, 0.14, 0xff8f00, x, 0.08, z, { line: 0.12, r: 0.45 });
    B(pb, 0.03, 0.06, 0.03, glow(0xffeb3b, 2.6), 0, 0.09, 0, { line: 0 });
  }
  // 吊繩 + 圓圈 + 5 個氣球
  const rig = piv(root, 0, 2.55, 0);
  const ringM = new THREE.Mesh(cached('balRing', () => new THREE.TorusGeometry(0.22, 0.04, 6, 16)), Z.mat(0x8d6e63));
  ringM.rotation.x = PI / 2;
  ringM.position.y = 0.55;
  rig.add(ringM);
  const ropeGeo = cached('balRope', () => new THREE.CylinderGeometry(0.018, 0.018, 1, 4).translate(0, 0.5, 0));
  const ropeM = Z.mat(0xeeeeee);
  const rope = (parent, from, to) => {
    const m = new THREE.Mesh(ropeGeo, ropeM);
    m.position.copy(from);
    const d = to.clone().sub(from);
    m.scale.y = d.length();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    parent.add(m);
    return m;
  };
  // 兩隻手捉住條繩（向上）
  for (const sx of [-1, 1]) rope(rig, new THREE.Vector3(sx * 0.42, -0.35, 0), new THREE.Vector3(sx * 0.12, 0.55, 0));
  const cluster = piv(rig, 0, 0.6, 0);
  const balloons = [];
  const SPOTS = [[0, 1.3, 0.05], [-0.5, 0.95, 0.15], [0.5, 0.95, -0.1], [0.05, 0.9, -0.5]]; // 4 個氣球
  const balloonGeo = cached('balloon', () => new THREE.SphereGeometry(0.42, 16, 12));
  SPOTS.forEach(([x, y, z], i) => {
    const bg = piv(cluster, 0, 0, 0);
    const c = BALLOON_COLORS[(i + Math.floor(R() * 5)) % 5]; // 每個唔同色
    const ball = S(bg, 'balloon', () => balloonGeo, 0, x, y, z, { line: 0.06 });
    ball.material = Z.mat(c, { roughness: 0.2, metalness: 0.05 });
    ball.scale.set(1, 1.18, 1);
    const knot = new THREE.Mesh(cached('balKnot', () => new THREE.ConeGeometry(0.06, 0.1, 6)), ball.material);
    knot.position.set(0, -0.48, 0);
    ball.add(knot);
    S(ball, 'balShine', () => new THREE.SphereGeometry(0.08, 8, 6), 0xffffff, -0.15, 0.18, -0.3, { o: { emissive: 0xffffff, emissiveIntensity: 0.8 } });
    rope(bg, new THREE.Vector3(0, -0.05, 0), new THREE.Vector3(x, y - 0.5, z));
    balloons.push({ g: bg, ball, color: c, popped: false });
  });
  const sc = 0.95;
  root.scale.setScalar(sc);
  let landed = false;
  const partsFly = [
    { y: 1.15 * sc, radius: 0.62 * sc, mult: 1 },
    { y: 2.0 * sc, radius: 0.42 * sc, mult: 1.5, crit: true },
    { y: 4.0 * sc, radius: 1.05 * sc, mult: 1 }, // 🎈 氣球（witchTower 傳 info.point：高過 3 米 = 打中氣球）
  ];
  const partsLand = partsFly.slice(0, 2);
  const phase = R() * 10;
  root.userData = {
    ...root.userData,
    height: 2.55 * sc,
    size: new THREE.Vector3(1.4 * sc, 4.6 * sc, 1.4 * sc),
    balloonY: 3.1 * sc, // 高過呢度 = 氣球
    balloons, sack,
    parts: () => (landed ? partsLand : partsFly),
    pop(i) {
      const b = balloons[i];
      if (!b || b.popped) return null;
      b.popped = true;
      b.g.visible = false;
      return b;
    },
    get left() { return balloons.filter((b) => !b.popped).length; },
    land() {
      landed = true;
      rig.visible = false;
    },
    get landed() { return landed; },
    // attackK > 0 = 打開袋掟炸彈
    animate(t, moving = 1, attackK = 0) {
      if (landed) {
        Z.animate(t, moving, attackK, 0.8);
        return;
      }
      Z.animate(t, 0, 0);
      // 吊住：腳仔郁吓郁吓，手向上捉繩
      legs[0].rotation.x = Math.sin(t * 2.2 + phase) * 0.35;
      legs[1].rotation.x = Math.sin(t * 2.2 + phase + 1.6) * 0.35;
      arms[0].rotation.set(-PI + 0.35, 0, -0.2);
      arms[1].rotation.set(-PI + 0.35 + attackK * 1.6, 0, 0.2);
      Z.torso.rotation.x = 0.05;
      sack.rotation.z = -attackK * 0.8;
      cluster.rotation.y = Math.sin(t * 0.6 + phase) * 0.4;
      cluster.rotation.z = Math.sin(t * 1.1 + phase) * 0.06;
      for (let i = 0; i < balloons.length; i++) balloons[i].ball.position.y = SPOTS[i][1] + Math.sin(t * 1.8 + i * 1.3) * 0.05;
      Z.body.rotation.z = Math.sin(t * 1.1 + phase) * 0.06;
    },
  };
  return root;
}

// ================= 💥 Zombie Cannon =================
export function buildCannon({ seed = 1 } = {}) {
  const R = rng(seed + 99);
  const root = new THREE.Group();
  // 殭屍企喺大炮後面推
  const zg = new THREE.Group();
  zg.position.z = 0.65;
  root.add(zg);
  const Z = zombieBase(zg, R, { skin: SKINS[Math.floor(R() * SKINS.length)], shirt: 0x283593, pants: 0x37474f, eye: 0xff6d00, mouth: 'grin' });
  root.userData.flash = zg.userData.flash;
  root.userData.dispose = zg.userData.dispose;
  const { B, S, glow, piv, torso, head, arms, tw, th, hw } = Z;
  // 海盜三角帽 + 南瓜徽 + 頸巾
  B(head, hw + 0.36, 0.06, 0.8, 0x212121, 0, 0.3, 0, { line: 0.1 });
  B(head, hw + 0.04, 0.24, 0.56, 0x212121, 0, 0.42, 0.02, { line: 0.08 });
  for (const sx of [-1, 1]) {
    const flap = piv(head, sx * 0.4, 0.32, 0);
    flap.rotation.z = -sx * 0.9;
    B(flap, 0.3, 0.05, 0.7, 0x212121, 0, 0, 0, { line: 0.12 });
  }
  B(head, hw + 0.38, 0.03, 0.82, 0xffc107, 0, 0.27, 0, { line: 0 });
  const badge = B(head, 0.16, 0.14, 0.04, 0xff8f00, 0, 0.42, -0.3, { line: 0.12, r: 0.45 });
  for (const sx of [-1, 1]) B(badge, 0.04, 0.035, 0.02, glow(0xffe082, 2), sx * 0.035, 0.015, -0.022, { line: 0 });
  B(torso, tw + 0.06, 0.12, 0.42, 0xd32f2f, 0, th - 0.02, 0, { line: 0.06 });
  for (let i = 0; i < 4; i++) B(torso, 0.07, 0.07, 0.02, 0xffd54f, 0, th * (0.2 + i * 0.17), -0.2, { line: 0, r: 0.4 });
  // ---- 大炮（喺前面）----
  const cart = piv(root, 0, 0, -0.55);
  cart.scale.setScalar(0.85); // 細細門大炮
  const wood = 0x6d4320;
  B(cart, 0.9, 0.36, 1.35, wood, 0, 0.5, 0, { line: 0.06, r: 0.12 });
  for (const z of [-0.45, 0.45]) B(cart, 0.94, 0.06, 0.08, 0x37474f, 0, 0.5, z, { line: 0, o: { metalness: 0.6, roughness: 0.4 } });
  for (const sx of [-1, 1]) B(cart, 0.08, 0.06, 0.7, 0x5d4037, sx * 0.3, 0.72, 0.85, { line: 0.12 }); // 把手
  // 轆
  const wheels = [];
  for (const sx of [-1, 1]) for (const z of [-0.4, 0.4]) {
    const w = piv(cart, sx * 0.52, 0.36, z);
    const rim = new THREE.Mesh(cached('cWheel', () => new THREE.CylinderGeometry(0.36, 0.36, 0.12, 14).rotateZ(PI / 2)), Z.mat(0x4e342e));
    w.add(rim);
    const ol = new THREE.Mesh(rim.geometry, OUTLINE);
    ol.scale.setScalar(1.08);
    rim.add(ol);
    const tyre = new THREE.Mesh(cached('cTyre', () => new THREE.TorusGeometry(0.36, 0.045, 6, 18).rotateY(PI / 2)), Z.mat(0x263238, { metalness: 0.5, roughness: 0.4 }));
    w.add(tyre);
    for (let i = 0; i < 3; i++) B(w, 0.14, 0.6, 0.06, 0x8d6e63, sx * 0.02, 0, 0, { line: 0, r: 0.2 }).rotation.x = (i / 3) * PI;
    S(w, 'cHub', () => new THREE.CylinderGeometry(0.09, 0.09, 0.16, 8).rotateZ(PI / 2), 0xffc107, 0, 0, 0);
    wheels.push(w);
  }
  // 炮管（可以升降）
  const barrel = piv(cart, 0, 0.85, 0.1);
  const ironM = Z.mat(0x37474f, { metalness: 0.6, roughness: 0.35 });
  const tube = S(barrel, 'cTube', () => new THREE.CylinderGeometry(0.3, 0.36, 1.7, 16).rotateX(PI / 2), ironM, 0, 0, -0.45, { line: 0.07 });
  void tube;
  for (const z of [0.25, -0.4, -1.1]) S(barrel, 'cBand', () => new THREE.CylinderGeometry(0.38, 0.38, 0.1, 16).rotateX(PI / 2), 0xffb300, 0, 0, z, { o: { metalness: 0.5, roughness: 0.4 } });
  S(barrel, 'cBack', () => new THREE.SphereGeometry(0.36, 14, 10), ironM, 0, 0, 0.4);
  S(barrel, 'cKnob', () => new THREE.SphereGeometry(0.1, 8, 6), 0xffb300, 0, 0, 0.78);
  const mouthGlow = glow(0xff6d00, 1.2);
  const mouth = S(barrel, 'cMouth', () => new THREE.CylinderGeometry(0.33, 0.33, 0.06, 16).rotateX(PI / 2), 0x120a18, 0, 0, -1.31);
  void mouth;
  const lip = new THREE.Mesh(cached('cLip', () => new THREE.TorusGeometry(0.33, 0.06, 6, 18)), mouthGlow);
  lip.position.z = -1.31;
  barrel.add(lip);
  // 炮管上面畫咗南瓜面（發光）
  for (const sx of [-1, 1]) B(barrel, 0.12, 0.1, 0.12, glow(0xffe082, 1.6), sx * 0.12, 0.33, -0.55, { line: 0, r: 0.3 });
  B(barrel, 0.3, 0.06, 0.12, glow(0xffe082, 1.6), 0, 0.33, -0.78, { line: 0, r: 0.3 });
  // 引信（點火時發光）
  const fuse = piv(barrel, 0, 0.36, 0.3);
  B(fuse, 0.04, 0.16, 0.04, 0x5d4037, 0, 0.06, 0, { line: 0 });
  const sparkM = glow(0xffeb3b, 0.3);
  const spark = B(fuse, 0.1, 0.1, 0.1, sparkM, 0, 0.17, 0, { line: 0, r: 0.5 });
  const sparkHalo = Z.halo(fuse, 0xffab40, 0.8, 0.17, 0);
  const mouthHalo = Z.halo(barrel, 0xff6d00, 1.3, 0, 0);
  mouthHalo.position.z = -1.35;
  // 兩粒炮彈放喺車上
  for (const sx of [-1, 1]) S(cart, 'cBall', () => new THREE.SphereGeometry(0.15, 10, 8), 0x263238, sx * 0.25, 0.8, 0.55, { o: { metalness: 0.4, roughness: 0.4 } });
  let recoil = 0;
  root.userData = {
    ...root.userData,
    height: 2.5,
    size: new THREE.Vector3(1.4, 2.5, 2.4),
    barrel, wheels,
    aim: 0, // 0–1：瞄準（引信著火 + 炮口發光）
    parts: () => [
      { y: 1.2, radius: 0.62, mult: 1, fwd: -0.65 },
      { y: 2.05, radius: 0.42, mult: 1.5, crit: true, fwd: -0.65 },
      { y: 0.65, radius: 0.7, mult: 0.7, fwd: 0.7 }, // 大炮（鐵：傷害少啲）
    ],
    recoil(k) { recoil = Math.max(recoil, k); },
    wheelSpin(d) { for (const w of wheels) w.rotation.x -= d / 0.36; },
    animate(t, moving = 1, attackK = 0) {
      Z.animate(t, moving, 0, 0.8);
      // 雙手推住把手
      arms[0].rotation.set(-PI / 2 + 0.55, 0, 0.12);
      arms[1].rotation.set(-PI / 2 + 0.55, 0, -0.12);
      Z.torso.rotation.x = 0.3 + moving * 0.1;
      const aim = root.userData.aim || 0;
      recoil = Math.max(0, recoil - 0.05);
      barrel.position.z = 0.1 + recoil * 0.35;
      cart.position.z = -0.55 + recoil * 0.1;
      sparkM.emissiveIntensity = aim > 0 ? 2 + Math.sin(t * 40) * 1.2 : 0.3;
      spark.scale.setScalar(aim > 0 ? 1 + Math.sin(t * 50) * 0.3 : 0.7);
      sparkHalo.material.opacity = aim > 0 ? 0.7 + Math.sin(t * 40) * 0.25 : 0;
      mouthGlow.emissiveIntensity = 1.2 + aim * 2.5 + recoil * 4;
      mouthHalo.material.opacity = aim * 0.5 + recoil;
      void attackK;
    },
  };
  return root;
}

// 💥 大炮彈：黑鐵 + 發光南瓜面 + 引信火花
export function buildCannonball() {
  const root = new THREE.Group();
  const { S, B, glow, halo } = kit(root);
  const ball = new THREE.Group();
  root.add(ball);
  S(ball, 'cbBall', () => new THREE.SphereGeometry(0.5, 16, 12), 0x263238, 0, 0, 0, { line: 0.06, o: { metalness: 0.5, roughness: 0.35 } });
  const face = glow(0xffab40, 2.6);
  for (const sx of [-1, 1]) B(ball, 0.14, 0.12, 0.08, face, sx * 0.16, 0.1, -0.45, { line: 0, r: 0.3 });
  B(ball, 0.32, 0.08, 0.08, face, 0, -0.14, -0.44, { line: 0, r: 0.3 });
  B(ball, 0.06, 0.2, 0.06, 0x5d4037, 0, 0.55, 0, { line: 0 });
  B(ball, 0.14, 0.14, 0.14, glow(0xffeb3b, 3), 0, 0.68, 0, { line: 0, r: 0.5 });
  const h = halo(root, 0xff6d00, 2.2, 0, 0.7);
  root.userData.fly = (v, t, dt) => {
    ball.rotation.x += dt * 7;
    ball.rotation.z += dt * 3;
    h.material.opacity = 0.55 + Math.sin(t * 30) * 0.2;
  };
  return root;
}
