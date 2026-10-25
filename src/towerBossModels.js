// 👑 Witch Tower 新 MINI-BOSS 模型（小朋友 2026-10-25：5 個新 Boss）—— 玩法喺 src/towerBosses.js
// 同 towerModels.js 一樣：圓角方塊 + 深色描邊（Roblox／卡通風格），面向 -z，腳底 y = 0
//   buildHogRider       🐗 Zombie Rider：大野豬（獠牙、鬃毛、鞍）+ 殭屍騎士（牛仔帽、燈籠棍）；setMounted(false) = 騎士跳咗落馬
//   buildRiderZombie    🧟 跳咗落嚟嘅騎士（自己行、揮燈籠棍）
//   buildBogWitch       🧹 Magical Witch：駝背、灰綠皮膚、爛帽、發光法杖、掃把（setFly 0–1）
//   buildDustler        💨 Dustler：一團轉嚟轉去嘅塵（發光眼）
//   buildVampiro        🧛 Vampiro：大吸血鬼伯爵 + 大披風（spread 0–1 張開、mist 0–1 變蝙蝠霧）
//   buildPumpkinBro     🎃 Pumpkin Brothers：南瓜頭兩兄弟（little = 細佬）；ball 0–1 = 縮埋一嚿俾人掟
//   buildSmallPumpkin   🎃 細南瓜（兄弟爆開變 4 個）
//   buildBanshee        👻 Banshee Queen：飄浮鬼魂女王（setAlpha 透明度、scream 0–1 張大口）
// 每個 model：userData.height、animate(t, moving 0–1, attack 0–1)、parts() → 打中範圍、flash(k)、dispose()、size
// 冇血：俾人打散 = 變糖果（witchTower.js poof）；Vampiro 嘅紅色係「魔法藥水」唔係血

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { buildZombie, towerGlowTex } from './towerModels.js';

const PI = Math.PI;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
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

// ---------- 工具（同 towerModels.js 嘅 kit 一樣，多咗 adopt = 收埋入面嘅殭屍 model）----------
function kit(root) {
  const mats = new Map();
  const flashable = [];
  const extra = []; // 唔係 cache 嘅嘢（sprite 材質等），dispose 時清
  const subs = []; // 入面嘅 buildZombie model
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
  const halo = (parent, color, size, opacity = 0.6, y = 0) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: towerGlowTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(size);
    s.position.y = y;
    parent.add(s);
    extra.push(s.material);
    return s;
  };
  const adopt = (sub) => {
    subs.push(sub);
    return sub;
  };
  root.userData.flash = (k) => {
    for (const m of flashable) m.emissiveIntensity = k * 0.9;
    for (const s of subs) s.userData.flash?.(k);
  };
  root.userData.dispose = () => {
    mats.forEach((m) => m.dispose());
    for (const m of extra) m.dispose();
    for (const s of subs) s.userData.dispose?.();
  };
  return { B, mat, glow, piv, halo, adopt, extra };
}

// ================= 🐗 Zombie Rider =================
// 騎士身上嘅嘢：破牛仔帽 + 燈籠棍（右手）；z = buildZombie model
function riderGear(z, { B, glow, piv }) {
  const u = z.userData;
  const head = u.head;
  // 破牛仔帽
  B(head, 1.0, 0.07, 0.9, 0x5d4037, 0, 0.33, 0, { line: 0.12, r: 0.3 });
  B(head, 0.62, 0.3, 0.56, 0x6d4c41, 0, 0.5, 0, { line: 0.08, r: 0.25 });
  B(head, 0.64, 0.08, 0.58, 0x8e24aa, 0, 0.4, 0, { line: 0 }); // 帽帶
  B(head, 0.14, 0.1, 0.03, 0x3e2723, 0.18, 0.55, -0.29, { line: 0 }); // 窿
  // 紅頸巾
  B(u.head.parent.parent, 0.7, 0.12, 0.44, 0xd32f2f, 0, 0.76, 0, { line: 0.08 });
  // 燈籠棍：木棍 + 鐵框燈籠（綠色鬼火）
  const club = piv(u.arms[1], 0, -0.66, 0);
  B(club, 0.09, 0.09, 1.1, 0x5d4037, 0, 0, -0.35, { line: 0.12 });
  const lan = piv(club, 0, 0, -0.95);
  B(lan, 0.34, 0.06, 0.34, 0x37474f, 0, 0.2, 0, { line: 0.1, o: { metalness: 0.6, roughness: 0.4 } });
  B(lan, 0.34, 0.06, 0.34, 0x37474f, 0, -0.2, 0, { line: 0.1, o: { metalness: 0.6, roughness: 0.4 } });
  for (const [x, zz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(lan, 0.05, 0.4, 0.05, 0x37474f, x * 0.15, 0, zz * 0.15, { line: 0 });
  const fire = B(lan, 0.22, 0.3, 0.22, glow(0x76ff03, 2.6), 0, 0, 0, { line: 0, r: 0.45 });
  return { club, lan, fire };
}

export function buildHogRider({ seed = 1 } = {}) {
  const root = new THREE.Group();
  const K = kit(root);
  const { B, glow, piv, halo, adopt } = K;
  const S = 1.5;
  const hog = piv(root);
  hog.scale.setScalar(S);
  const body = piv(hog);
  const fur = 0x6d5246;
  const furDark = 0x3e2a24;
  const belly = 0x9a7b68;
  const pink = 0xe79a9a;
  // 身：大大嚿 + 膊頭隆起
  B(body, 1.5, 1.1, 2.3, fur, 0, 1.3, 0.1);
  B(body, 1.66, 0.75, 1.0, fur, 0, 1.55, -0.6, { line: 0.06 });
  B(body, 1.3, 0.36, 2.0, belly, 0, 0.82, 0.1, { line: 0.06 });
  // 鬃毛（背脊一排）
  for (let i = 0; i < 8; i++) {
    const m = B(body, 0.2, 0.32 + (i % 3) * 0.06, 0.24, furDark, 0, (i < 3 ? 2.0 : 1.88) + (i % 2) * 0.03, -1.05 + i * 0.3, { line: 0.1 });
    m.rotation.x = 0.35;
  }
  // 斑 + 疤（縫住）
  B(body, 0.03, 0.5, 0.6, 0x8a6a58, 0.76, 1.35, 0.5, { line: 0 });
  B(body, 0.03, 0.3, 0.4, 0x8a6a58, -0.76, 1.1, -0.2, { line: 0 });
  for (let i = 0; i < 3; i++) B(body, 0.03, 0.18, 0.04, 0x2a1a16, -0.765, 1.42, 0.25 + i * 0.12, { line: 0 });
  B(body, 0.03, 0.04, 0.42, 0x2a1a16, -0.765, 1.42, 0.37, { line: 0 });
  // 鞍 + 紫色鞍氈 + 金邊 + 南瓜徽章
  B(body, 1.68, 0.72, 1.05, 0x6a1b9a, 0, 1.58, 0.35, { line: 0.05 });
  B(body, 1.7, 0.08, 1.07, 0xffc107, 0, 1.22, 0.35, { line: 0 });
  for (const sx of [-1, 1]) {
    const pk = B(body, 0.05, 0.28, 0.32, 0xff8f00, sx * 0.86, 1.6, 0.35, { line: 0.15, r: 0.4 });
    B(pk, 0.06, 0.06, 0.06, 0x2e7d32, 0, 0.17, 0, { line: 0 });
  }
  B(body, 1.2, 0.18, 1.0, 0x8d4e2a, 0, 1.98, 0.35, { line: 0.1 });
  B(body, 0.18, 0.28, 0.18, 0x6d3a1f, 0, 2.15, -0.1, { line: 0.12 }); // 鞍角
  // 頭
  const head = piv(body, 0, 1.45, -1.25);
  B(head, 1.15, 0.98, 0.95, fur, 0, 0, -0.25);
  B(head, 1.0, 0.25, 0.9, furDark, 0, 0.5, -0.15, { line: 0.06 }); // 頭頂毛
  const snout = B(head, 0.62, 0.42, 0.4, pink, 0, -0.26, -0.86, { line: 0.07 });
  for (const sx of [-1, 1]) B(snout, 0.12, 0.15, 0.04, 0x5a2a2a, sx * 0.14, 0, -0.21, { line: 0, r: 0.4 });
  B(head, 0.8, 0.07, 0.04, 0x2a1414, 0, -0.44, -0.73, { line: 0, r: 0.3 }); // 嘴
  // 獠牙（向上彎）
  for (const sx of [-1, 1]) {
    const t1 = piv(head, sx * 0.36, -0.42, -0.84);
    t1.rotation.z = -sx * 0.35;
    B(t1, 0.13, 0.32, 0.13, 0xfff3d6, 0, 0.12, 0, { line: 0.12 });
    const t2 = piv(t1, 0, 0.27, 0);
    t2.rotation.z = -sx * 0.55;
    t2.rotation.x = 0.35;
    B(t2, 0.1, 0.24, 0.1, 0xfffbea, 0, 0.1, 0, { line: 0.12 });
  }
  // 發光嬲眼 + 眉
  const eyeM = glow(0xff6e40, 2.4);
  for (const sx of [-1, 1]) {
    B(head, 0.3, 0.24, 0.05, 0x1a0c0a, sx * 0.3, 0.16, -0.74, { line: 0, r: 0.3 });
    B(head, 0.2, 0.16, 0.06, eyeM, sx * 0.3, 0.16, -0.76, { line: 0, r: 0.4 });
    B(head, 0.38, 0.1, 0.08, furDark, sx * 0.3, 0.34, -0.75, { line: 0 }).rotation.z = sx * 0.4;
  }
  // 耳
  const ears = [];
  for (const sx of [-1, 1]) {
    const ear = piv(head, sx * 0.45, 0.45, -0.05);
    ear.rotation.z = -sx * 0.6;
    B(ear, 0.3, 0.42, 0.12, fur, 0, 0.18, 0, { line: 0.1 });
    B(ear, 0.16, 0.26, 0.04, pink, 0, 0.16, -0.06, { line: 0 });
    ears.push(ear);
  }
  // 腳（唔跟身郁）
  const legs = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = piv(hog, sx * 0.52, 0.82, sz * 0.78 + 0.05);
    B(leg, 0.38, 0.62, 0.42, fur, 0, -0.3, 0, { line: 0.07 });
    B(leg, 0.42, 0.2, 0.46, 0x2b1d18, 0, -0.7, -0.02, { line: 0.08 });
    legs.push(leg);
  }
  // 卷尾
  const tail = piv(body, 0, 1.55, 1.25);
  B(tail, 0.1, 0.1, 0.24, pink, 0, 0, 0.1, { line: 0.12 });
  B(tail, 0.1, 0.22, 0.1, pink, 0, 0.1, 0.22, { line: 0.12 });
  B(tail, 0.1, 0.1, 0.18, pink, 0, 0.2, 0.15, { line: 0.12 });
  // 🧟 騎士
  const seat = piv(root, 0, 0, 0.35 * S);
  const rider = adopt(buildZombie('walker', { seed: seed + 7 }));
  const RS = 1.15;
  rider.scale.setScalar(RS);
  rider.position.y = 2.07 * S - 0.78 * RS + 0.08;
  seat.add(rider);
  const gear = riderGear(rider, K);
  const lanGlow = halo(gear.lan, 0x76ff03, 1.4, 0.7);
  // 韁繩（左手 → 豬頭）
  const rein = B(seat, 0.04, 0.04, 1.6, 0x3e2723, 0, 1.75 * S, -0.95 * S, { line: 0 });
  rein.rotation.x = 0.55;
  const ru = rider.userData;
  const height = 2.07 * S + 2.5 * RS * 0.9;
  let mounted = true;
  const phase = (seed % 7) * 0.7;
  root.userData = {
    ...root.userData,
    height, size: V(1.7 * S, height, 3 * S), snort: 0, gallop: 1,
    lantern: gear.lan,
    setMounted(v) {
      mounted = v;
      seat.visible = v;
      root.userData.height = v ? height : 2.3 * S;
    },
    get mounted() { return mounted; },
    parts: () => {
      const p = [
        { y: 1.3 * S, radius: 1.05 * S, mult: 1 },
        { y: 1.3 * S, radius: 0.85 * S, mult: 1, fwd: 1.0 * S },
        { y: 1.4 * S, radius: 0.62 * S, mult: 1.5, crit: true, fwd: 2.0 * S },
      ];
      if (mounted) p.push({ y: 2.07 * S + 0.9, radius: 0.6, mult: 1 }, { y: 2.07 * S + 1.7, radius: 0.45, mult: 1.5, crit: true, fwd: 0.35 * S });
      return p;
    },
    animate(t, moving = 1, attackK = 0) {
      const g = root.userData.gallop || 1;
      const w = (t + phase) * 7 * g;
      const s = Math.sin(w);
      const sn = root.userData.snort || 0;
      // 跑：對角兩隻腳一齊
      legs[0].rotation.x = s * 0.7 * moving;
      legs[3].rotation.x = s * 0.7 * moving;
      legs[1].rotation.x = -s * 0.7 * moving;
      legs[2].rotation.x = -s * 0.7 * moving;
      if (sn > 0) legs[0].rotation.x = Math.max(0, Math.sin(t * 16)) * 0.9 * sn; // 刨地
      body.position.y = Math.abs(Math.cos(w)) * 0.1 * moving;
      body.rotation.x = Math.sin(w) * 0.04 * moving - sn * 0.08;
      head.rotation.x = Math.sin(w + 1) * 0.08 * moving + sn * 0.35 + Math.sin(t * 30) * 0.04 * sn;
      head.rotation.y = Math.sin(t * 1.3 + phase) * 0.1 * (1 - moving);
      head.position.x = Math.sin(t * 24) * 0.03 * sn;
      for (const [i, e] of ears.entries()) e.rotation.x = Math.sin(w + i) * 0.2 * moving - 0.3 * moving;
      tail.rotation.z = Math.sin(t * 9) * 0.4;
      eyeM.emissiveIntensity = 2.2 + sn * 2;
      if (mounted) {
        seat.position.y = body.position.y * S;
        ru.animate(t, 0, attackK);
        // 坐喺鞍上：大髀向前、腳向兩邊
        ru.legs[0].rotation.x = 1.25;
        ru.legs[1].rotation.x = 1.25;
        ru.legs[0].rotation.z = -0.35;
        ru.legs[1].rotation.z = 0.35;
        ru.arms[0].rotation.x = 0.9 + Math.sin(w) * 0.1 * moving; // 揸住韁繩
        if (attackK <= 0) ru.arms[1].rotation.x = 1.2 + Math.sin(t * 2 + phase) * 0.2 + Math.sin(w) * 0.15 * moving; // 燈籠舉起
        gear.fire.scale.setScalar(0.85 + Math.sin(t * 13) * 0.15);
        lanGlow.material.opacity = 0.55 + Math.sin(t * 9) * 0.15;
      }
    },
  };
  return root;
}

export function buildRiderZombie({ seed = 1 } = {}) {
  const root = new THREE.Group();
  const K = kit(root);
  const z = K.adopt(buildZombie('walker', { seed: seed + 7 }));
  const RS = 1.15;
  z.scale.setScalar(RS);
  root.add(z);
  const gear = riderGear(z, K);
  const lanGlow = K.halo(gear.lan, 0x76ff03, 1.4, 0.7);
  const zu = z.userData;
  root.userData = {
    ...root.userData,
    height: zu.height * RS / 1 + 0.3,
    parts: () => zu.parts().map((p) => ({ ...p, y: p.y * RS, radius: p.radius * RS })),
    animate(t, moving = 1, attackK = 0) {
      zu.animate(t, moving, attackK);
      gear.fire.scale.setScalar(0.85 + Math.sin(t * 13) * 0.15);
      lanGlow.material.opacity = 0.55 + Math.sin(t * 9) * 0.15;
    },
  };
  return root;
}

// ================= 🧹 Magical Witch（殭屍女巫：唔係城堡嗰個好女巫）=================
export function buildBogWitch({ seed = 1 } = {}) {
  const root = new THREE.Group();
  const { B, glow, piv, halo } = kit(root);
  const R = rng(seed + 33);
  const skin = 0x9fbf8f; // 灰綠
  const skinDark = 0x76906c;
  const robe = 0x4a3b5e;
  const robeDark = 0x2e2440;
  const rag = 0x5e4b78;
  const SC = 1.75;
  const body = piv(root);
  body.scale.setScalar(SC);
  // 長袍（下面闊、爛爛哋）
  const skirt = piv(body, 0, 0, 0);
  B(skirt, 0.86, 0.5, 0.7, robe, 0, 0.3, 0);
  B(skirt, 0.74, 0.4, 0.6, robe, 0, 0.72, 0);
  for (let i = 0; i < 7; i++) { // 爛袍腳
    const a = (i / 7) * PI * 2;
    const h = 0.14 + R() * 0.14;
    B(skirt, 0.22, h, 0.08, i % 2 ? robeDark : rag, Math.sin(a) * 0.38, 0.06 - h * 0.3, Math.cos(a) * 0.32, { line: 0, r: 0.15 }).rotation.y = a;
  }
  B(skirt, 0.2, 0.18, 0.02, 0x6a5acd, 0.22, 0.4, -0.355, { line: 0.12 }); // 補丁
  // 上身：駝背（向前彎）
  const torso = piv(body, 0, 0.88, 0);
  torso.rotation.x = -0.55;
  B(torso, 0.66, 0.6, 0.46, robe, 0, 0.28, 0);
  B(torso, 0.5, 0.36, 0.3, robeDark, 0, 0.5, 0.2, { line: 0.06 }); // 駝背隆起
  B(torso, 0.7, 0.12, 0.5, 0x5d4037, 0, 0.02, 0, { line: 0.08 }); // 腰帶
  B(torso, 0.14, 0.12, 0.04, 0xbdbdbd, 0, 0.02, -0.26, { line: 0.1 });
  // 披肩（爛）
  B(torso, 0.78, 0.18, 0.52, rag, 0, 0.6, 0, { line: 0.06 });
  // 頭
  const neck = piv(torso, 0, 0.62, -0.08);
  neck.rotation.x = 0.4; // 抬返起頭望你
  const head = piv(neck, 0, 0.26, -0.04);
  B(head, 0.56, 0.52, 0.52, skin, 0, 0, 0, { r: 0.28 });
  // 長鉤鼻 + 疣
  const nose = piv(head, 0, -0.02, -0.26);
  nose.rotation.x = 0.35;
  B(nose, 0.12, 0.12, 0.26, skin, 0, 0, -0.1, { line: 0.1 });
  B(nose, 0.09, 0.09, 0.14, skin, 0, -0.06, -0.24, { line: 0.1 });
  B(nose, 0.06, 0.06, 0.06, 0x5f8f4a, 0.06, 0.04, -0.12, { line: 0, r: 0.5 });
  // 發光紫眼（一大一細）+ 皺眉
  const eyeM = glow(0xe040fb, 2.2);
  for (const sx of [-1, 1]) {
    const big = sx === 1 ? 1.1 : 0.85;
    B(head, 0.18 * big, 0.14 * big, 0.03, 0x1c1022, sx * 0.13, 0.08, -0.26, { line: 0, r: 0.35 });
    B(head, 0.12 * big, 0.09 * big, 0.04, eyeM, sx * 0.13, 0.08, -0.27, { line: 0, r: 0.4 });
    B(head, 0.18, 0.04, 0.03, 0x3b4a36, sx * 0.13, 0.18, -0.27, { line: 0 }).rotation.z = sx * 0.4;
  }
  // 嘴：歪歪 + 一隻牙
  B(head, 0.24, 0.05, 0.03, 0x22101c, 0.02, -0.15, -0.265, { line: 0, r: 0.3 }).rotation.z = 0.15;
  B(head, 0.05, 0.06, 0.03, 0xfff8e1, 0.06, -0.12, -0.275, { line: 0 });
  // 灰色亂頭髮（兩邊垂落嚟）
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    B(head, 0.1, 0.42 + R() * 0.2, 0.12, i % 2 ? 0xb0bec5 : 0x90a4ae, sx * (0.28 + i * 0.03), -0.16 - i * 0.04, -0.05 + i * 0.14, { line: 0.1 }).rotation.z = sx * 0.15;
  }
  // 爛尖帽（彎咗、穿咗窿、補丁）
  const hatM = 0x2b2533;
  B(head, 1.0, 0.06, 0.92, hatM, 0, 0.27, 0, { line: 0.12, r: 0.3 });
  for (let i = 0; i < 4; i++) B(head, 0.12, 0.05, 0.08, robeDark, -0.42 + i * 0.28, 0.25, -0.45 + (i % 2) * 0.9, { line: 0 }); // 帽邊爛口
  const h1 = piv(head, 0, 0.3, 0);
  B(h1, 0.56, 0.3, 0.56, hatM, 0, 0.15, 0, { line: 0.08, r: 0.2 });
  B(h1, 0.58, 0.08, 0.58, 0x558b2f, 0, 0.05, 0, { line: 0.05 }); // 綠帶
  B(h1, 0.12, 0.12, 0.03, 0xffd54f, 0, 0.05, -0.3, { line: 0.1 }); // 扣
  B(h1, 0.16, 0.14, 0.02, 0x6a5acd, 0.18, 0.2, -0.28, { line: 0.12 }); // 補丁
  const h2 = piv(h1, 0, 0.28, 0);
  h2.rotation.z = -0.35;
  h2.rotation.x = 0.2;
  B(h2, 0.38, 0.3, 0.38, hatM, 0, 0.12, 0, { line: 0.08, r: 0.2 });
  B(h2, 0.06, 0.08, 0.02, 0x000000, 0.1, 0.1, -0.195, { line: 0 }); // 窿
  const h3 = piv(h2, 0.02, 0.26, 0);
  h3.rotation.z = -0.6;
  B(h3, 0.2, 0.24, 0.2, hatM, 0, 0.1, 0, { line: 0.1, r: 0.3 });
  const h4 = piv(h3, 0, 0.2, 0);
  h4.rotation.z = -0.7;
  B(h4, 0.1, 0.16, 0.1, hatM, 0, 0.07, 0, { line: 0.12, r: 0.3 });
  // 手：瘦長、爪
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = piv(torso, sx * 0.4, 0.48, 0);
    B(sh, 0.24, 0.28, 0.26, rag, 0, -0.06, 0, { line: 0.06 });
    B(sh, 0.15, 0.5, 0.15, skin, 0, -0.38, 0, { line: 0.07 });
    const hand = B(sh, 0.18, 0.16, 0.18, skinDark, 0, -0.68, 0, { line: 0.08 });
    for (let f = 0; f < 3; f++) B(hand, 0.04, 0.14, 0.04, 0x37474f, -0.05 + f * 0.05, -0.12, -0.03, { line: 0, r: 0.3 }); // 長指甲
    arms.push(sh);
  }
  // 發光法杖（右手）：扭紋木 + 爪托住粒水晶
  const staff = piv(arms[1], 0, -0.68, 0);
  staff.rotation.x = -0.45;
  for (let i = 0; i < 5; i++) B(staff, 0.08, 0.36, 0.08, i % 2 ? 0x4e342e : 0x3e2723, Math.sin(i * 1.7) * 0.03, -0.55 + i * 0.32, 0, { line: 0.12 }).rotation.z = Math.sin(i) * 0.15;
  const orb = piv(staff, 0, 1.15, 0);
  const crystal = new THREE.Mesh(cached('witchOrb', () => new THREE.OctahedronGeometry(0.17, 0)), glow(0xb2ff59, 3));
  crystal.scale.set(1, 1.4, 1);
  orb.add(crystal);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    B(orb, 0.05, 0.24, 0.05, 0x3e2723, Math.cos(a) * 0.14, -0.08, Math.sin(a) * 0.14, { line: 0.1 }).rotation.z = Math.cos(a) * 0.4;
  }
  const orbGlow = halo(orb, 0x76ff03, 0.8, 0.55);
  // 🧹 掃把（飛嗰陣先見到）
  const broom = piv(root, 0, 0.6 * SC, 0);
  B(broom, 0.14, 0.14, 2.6, 0x8d6e63, 0, 0, -0.2, { line: 0.12 });
  B(broom, 0.22, 0.22, 0.14, 0xd32f2f, 0, 0, 0.95, { line: 0.1 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    B(broom, 0.14, 0.14, 1.0, i % 2 ? 0xffca28 : 0xffb300, Math.cos(a) * 0.16, Math.sin(a) * 0.16, 1.5, { line: 0.1 }).rotation.set(Math.sin(a) * 0.3, -Math.cos(a) * 0.3, 0);
  }
  const trail = halo(broom, 0x76ff03, 1.8, 0, 0);
  trail.position.z = 2.1;
  broom.scale.setScalar(0.001);
  broom.visible = false;
  const height = 2.3 * SC;
  let fly = 0;
  const phase = R() * 10;
  root.userData = {
    ...root.userData,
    height, size: V(1.1 * SC, height, 1 * SC), orb, cast: 0,
    setFly(k) {
      fly = k;
      broom.visible = k > 0.01;
      broom.scale.setScalar(Math.max(0.001, Math.min(1, k * 1.5)) * SC * 0.9);
      skirt.rotation.x = k * 0.6; // 坐喺掃把上：袍向後飄
      skirt.position.y = k * 0.08;
      trail.material.opacity = k * 0.7;
    },
    parts: () => [
      { y: 0.8 * SC, radius: 0.5 * SC, mult: 1 },
      { y: 1.6 * SC, radius: 0.45 * SC, mult: 1, fwd: 0.25 * SC },
      { y: 2.05 * SC, radius: 0.36 * SC, mult: 1.5, crit: true, fwd: 0.45 * SC },
    ],
    animate(t, moving = 1, attackK = 0) {
      const w = (t + phase) * 4.5;
      const s = Math.sin(w);
      const ground = 1 - fly;
      // 一拐一拐（駝背）
      body.position.y = Math.abs(Math.cos(w)) * 0.05 * moving * ground + Math.sin(t * 2.2) * 0.08 * fly;
      body.rotation.z = s * 0.08 * moving * ground + Math.sin(t * 1.5) * 0.06 * fly;
      skirt.rotation.y = s * 0.1 * moving;
      torso.rotation.x = -0.55 + Math.sin(t * 1.8 + phase) * 0.04 - attackK * 0.15;
      neck.rotation.x = 0.4 + Math.sin(t * 2.4 + phase) * 0.06;
      head.rotation.y = Math.sin(t * 1.1 + phase) * 0.2;
      const cast = Math.max(attackK, root.userData.cast || 0);
      arms[0].rotation.x = 0.4 + s * 0.3 * moving + cast * 1.4 + fly * 0.6;
      arms[0].rotation.z = -0.2 - cast * 0.6;
      arms[1].rotation.x = 0.45 + Math.sin(w + 2) * 0.12 * moving + cast * 1.1;
      arms[1].rotation.z = 0.25 + cast * 0.2;
      h3.rotation.x = Math.sin(t * 3 + phase) * 0.15; // 帽尖搖下搖下
      broom.position.y = 0.6 * SC + Math.sin(t * 2.2) * 0.08;
      broom.rotation.z = Math.sin(t * 1.5) * 0.06;
      crystal.rotation.y = t * 2;
      const gl = 2.6 + Math.sin(t * 6) * 0.6 + cast * 4;
      crystal.material.emissiveIntensity = gl;
      orbGlow.scale.setScalar(0.8 + cast * 1.4);
      eyeM.emissiveIntensity = 2 + cast * 2;
      if (fly > 0.01) trail.scale.setScalar(1.4 + Math.sin(t * 12) * 0.3);
    },
  };
  return root;
}

// ================= 💨 Dustler：一團塵殭屍 =================
export function buildDustler({ seed = 1 } = {}) {
  const root = new THREE.Group();
  const { B, glow, piv, halo, extra } = kit(root);
  const R = rng(seed + 5);
  const cloud = piv(root, 0, 0.95, 0);
  const DUST = [0x9e8a72, 0xb39d82, 0x8a7560, 0xc4b096];
  const lumps = [];
  for (let i = 0; i < 9; i++) {
    const s = 0.34 + R() * 0.26;
    const a = (i / 9) * PI * 2;
    const r = i < 3 ? 0.1 : 0.34;
    const m = B(cloud, s, s * 0.9, s, DUST[i % 4], Math.cos(a) * r, (R() - 0.5) * 0.4 + (i < 3 ? 0.15 : 0), Math.sin(a) * r, { line: 0.07, r: 0.45 });
    lumps.push({ m, a, r, y: m.position.y, sp: 0.8 + R() * 1.2 });
  }
  // 塊臉：發光黃眼 + 嬲嬲嘴
  const face = piv(cloud, 0, 0.1, -0.42);
  const eyeM = glow(0xffd740, 2.5);
  for (const sx of [-1, 1]) {
    B(face, 0.15, 0.13, 0.05, eyeM, sx * 0.13, 0.06, 0, { line: 0.12, r: 0.4 });
    B(face, 0.16, 0.04, 0.03, 0x3e2a1a, sx * 0.13, 0.17, -0.01, { line: 0 }).rotation.z = sx * 0.45;
  }
  B(face, 0.2, 0.06, 0.04, 0x3e2a1a, 0, -0.1, 0, { line: 0, r: 0.3 });
  // 細手
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = piv(cloud, sx * 0.48, 0, -0.1);
    B(sh, 0.13, 0.36, 0.13, 0x8a7560, 0, -0.16, 0, { line: 0.1, r: 0.4 });
    arms.push(sh);
  }
  // 下面一條塵旋風尾
  const tail = piv(root);
  for (let i = 0; i < 4; i++) B(tail, 0.4 - i * 0.08, 0.16, 0.4 - i * 0.08, DUST[(i + 1) % 4], 0, 0.55 - i * 0.15, 0, { line: 0.06, r: 0.45 });
  // 塵粒（細細粒圍住轉）
  const speckM = new THREE.MeshBasicMaterial({ color: 0xd7c4a6, transparent: true, opacity: 0.8 });
  extra.push(speckM);
  const specks = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(cached('dustSpeck', () => new THREE.BoxGeometry(0.07, 0.07, 0.07)), speckM);
    root.add(m);
    specks.push({ m, a: R() * PI * 2, r: 0.55 + R() * 0.35, y: 0.2 + R() * 1.4, sp: 2 + R() * 2 });
  }
  const haze = halo(cloud, 0xbfa88a, 2.1, 0.35);
  haze.material.blending = THREE.NormalBlending;
  root.userData = {
    ...root.userData,
    height: 1.6, size: V(1, 1.6, 1),
    parts: () => [{ y: 0.95, radius: 0.6, mult: 1 }, { y: 1.05, radius: 0.32, mult: 1.5, crit: true, fwd: 0.35 }],
    animate(t, moving = 1, attackK = 0) {
      cloud.position.y = 0.95 + Math.sin(t * 3 + seed) * 0.1;
      cloud.rotation.y = Math.sin(t * 1.2) * 0.25;
      for (const l of lumps) {
        l.a += 0.016 * l.sp;
        l.m.position.x = Math.cos(l.a) * l.r;
        l.m.position.z = Math.sin(l.a) * l.r * 0.8 + 0.05;
        l.m.position.y = l.y + Math.sin(t * 4 + l.a) * 0.05;
        l.m.rotation.y = l.a;
      }
      tail.rotation.y = t * 9;
      for (const s of specks) {
        const a = s.a + t * s.sp;
        s.m.position.set(Math.cos(a) * s.r, s.y + Math.sin(t * 2 + s.a) * 0.15, Math.sin(a) * s.r);
      }
      const up = attackK < 0.6 ? attackK / 0.6 : 1 - (attackK - 0.6) / 0.4;
      arms[0].rotation.x = 0.8 + Math.sin(t * 6) * 0.3 * moving + up * 1.4;
      arms[1].rotation.x = 0.8 + Math.sin(t * 6 + 2) * 0.3 * moving + up * 1.4;
      eyeM.emissiveIntensity = 2.2 + Math.sin(t * 8) * 0.4;
      haze.material.opacity = 0.3 + Math.sin(t * 3) * 0.06;
    },
  };
  return root;
}

// ================= 🧛 Vampiro =================
export function buildVampiro({ seed = 1 } = {}) {
  const root = new THREE.Group();
  const { B, glow, piv, halo } = kit(root);
  const SC = 2.1;
  const body = piv(root);
  body.scale.setScalar(SC);
  const skin = 0xd9d2e9; // 淡紫灰
  const suit = 0x1c1626;
  const vest = 0xb71c1c;
  const capeOut = 0x140f1c;
  const capeIn = 0xad1457;
  // 腳：黑褲 + 尖頭靴
  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = piv(body, sx * 0.17, 0.8, 0);
    B(hip, 0.24, 0.48, 0.26, suit, 0, -0.22, 0);
    B(hip, 0.22, 0.32, 0.24, suit, 0, -0.56, 0, { line: 0.06 });
    B(hip, 0.26, 0.12, 0.4, 0x0d0a12, 0, -0.74, -0.06, { line: 0.08, o: { metalness: 0.4, roughness: 0.3 } });
    legs.push(hip);
  }
  // 身：西裝 + 紅背心 + 白領巾 + 紅寶石胸針
  const torso = piv(body, 0, 0.8, 0);
  B(torso, 0.62, 0.82, 0.36, suit, 0, 0.41, 0);
  B(torso, 0.34, 0.66, 0.04, vest, 0, 0.44, -0.18, { line: 0.08 });
  for (let i = 0; i < 3; i++) B(torso, 0.05, 0.05, 0.03, 0xffd54f, 0, 0.24 + i * 0.16, -0.205, { line: 0 });
  B(torso, 0.2, 0.18, 0.05, 0xfafafa, 0, 0.74, -0.19, { line: 0.08 });
  const gem = B(torso, 0.13, 0.13, 0.05, glow(0xff1744, 2.4), 0, 0.62, -0.225, { line: 0.12, r: 0.45 });
  // 大高領 + 披風（張得開）
  const collar = piv(torso, 0, 0.8, 0.08);
  for (const sx of [-1, 1]) {
    const c = B(collar, 0.36, 0.5, 0.05, capeIn, sx * 0.26, 0.2, 0, { line: 0.15 });
    c.rotation.set(-0.2, sx * 0.5, -sx * 0.25);
  }
  const capeL = piv(torso, -0.3, 0.78, 0.2);
  const capeR = piv(torso, 0.3, 0.78, 0.2);
  for (const [cp, sx] of [[capeL, -1], [capeR, 1]]) {
    const outer = B(cp, 0.5, 1.45, 0.05, capeOut, sx * 0.16, -0.72, 0.02, { line: 0.3 });
    B(cp, 0.46, 1.4, 0.02, capeIn, sx * 0.16, -0.72, -0.02, { line: 0 });
    // 蝙蝠翼咁嘅波浪腳
    for (let i = 0; i < 3; i++) B(cp, 0.16, 0.16, 0.05, capeOut, sx * (0.0 + i * 0.16), -1.46, 0.02, { line: 0.3, r: 0.45 });
    outer.userData.k = 1;
  }
  // 手
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = piv(torso, sx * 0.4, 0.72, 0);
    B(sh, 0.22, 0.26, 0.24, suit, 0, -0.06, 0, { line: 0.06 });
    B(sh, 0.18, 0.48, 0.2, suit, 0, -0.36, 0, { line: 0.06 });
    B(sh, 0.2, 0.06, 0.22, 0xfafafa, 0, -0.6, 0, { line: 0 }); // 白袖口
    const hand = B(sh, 0.18, 0.17, 0.18, skin, 0, -0.71, 0, { line: 0.07 });
    for (let f = 0; f < 3; f++) B(hand, 0.04, 0.13, 0.04, 0x4a148c, -0.05 + f * 0.05, -0.13, -0.03, { line: 0, r: 0.3 }); // 紫色長指甲
    arms.push(sh);
  }
  // 頭：尖耳、美人尖油頭、紅眼、細尖牙
  const neck = piv(torso, 0, 0.84, 0);
  const head = piv(neck, 0, 0.3, 0);
  B(head, 0.56, 0.6, 0.52, skin, 0, 0, 0, { r: 0.25 });
  B(head, 0.6, 0.2, 0.56, 0x120d18, 0, 0.26, 0.02, { line: 0.06 }); // 油頭
  B(head, 0.6, 0.5, 0.18, 0x120d18, 0, 0.05, 0.2, { line: 0.06 });
  const peak = B(head, 0.18, 0.18, 0.05, 0x120d18, 0, 0.18, -0.26, { line: 0 }); // 美人尖
  peak.rotation.z = PI / 4;
  for (const sx of [-1, 1]) {
    const ear = B(head, 0.06, 0.26, 0.14, skin, sx * 0.3, 0.06, 0.02, { line: 0.12 });
    ear.rotation.z = -sx * 0.35;
  }
  const eyeM = glow(0xff1744, 2.6);
  for (const sx of [-1, 1]) {
    B(head, 0.16, 0.08, 0.03, 0x3a0d1a, sx * 0.13, 0.06, -0.26, { line: 0, r: 0.3 });
    B(head, 0.11, 0.06, 0.04, eyeM, sx * 0.13, 0.06, -0.27, { line: 0, r: 0.4 });
    B(head, 0.2, 0.05, 0.03, 0x120d18, sx * 0.13, 0.15, -0.27, { line: 0 }).rotation.z = sx * 0.35; // 奸眉
  }
  B(head, 0.24, 0.05, 0.03, 0x4a0e1e, 0, -0.15, -0.265, { line: 0, r: 0.3 });
  for (const sx of [-1, 1]) B(head, 0.04, 0.08, 0.03, 0xffffff, sx * 0.06, -0.19, -0.27, { line: 0 }); // 細尖牙（可愛款）
  const aura = halo(root, 0xff1744, 3.2 * SC * 0.6, 0.0, 1.4 * SC);
  const height = 2.15 * SC;
  let spread = 0;
  root.userData = {
    ...root.userData,
    height, size: V(1.0 * SC, height, 0.8 * SC), spread: 0, mist: 0, crouch: 0,
    parts: () => [
      { y: 0.6 * SC, radius: 0.42 * SC, mult: 1 },
      { y: 1.25 * SC, radius: 0.5 * SC, mult: 1 },
      { y: 1.95 * SC, radius: 0.34 * SC, mult: 1.5, crit: true },
    ],
    animate(t, moving = 1, attackK = 0) {
      const u = root.userData;
      spread += ((u.spread || 0) - spread) * 0.2;
      const w = t * 4.2;
      const s = Math.sin(w);
      const cr = u.crouch || 0;
      legs[0].rotation.x = s * 0.4 * moving - cr * 0.9;
      legs[1].rotation.x = -s * 0.4 * moving - cr * 0.9;
      body.position.y = Math.abs(Math.cos(w)) * 0.04 * moving - cr * 0.35 * SC * 0.3;
      torso.rotation.x = -0.05 * moving - cr * 0.4;
      // 披風：行路飄、張開 = 叫蝙蝠
      const flap = Math.sin(t * 3) * 0.08 + moving * 0.25;
      capeL.rotation.set(flap + spread * 0.3, 0.35 - spread * 1.2, -spread * 1.1);
      capeR.rotation.set(flap + spread * 0.3, -0.35 + spread * 1.2, spread * 1.1);
      const up = attackK < 0.6 ? attackK / 0.6 : 1 - (attackK - 0.6) / 0.4;
      const smash = attackK >= 0.6 ? (attackK - 0.6) / 0.4 : 0;
      arms[0].rotation.x = s * 0.3 * moving + spread * 0.5 + up * 2.2 - smash * 1.2 + cr * 1.2;
      arms[1].rotation.x = -s * 0.3 * moving + spread * 0.5 + up * 2.2 - smash * 1.2 + cr * 1.2;
      arms[0].rotation.z = -0.1 - spread * 1.6;
      arms[1].rotation.z = 0.1 + spread * 1.6;
      head.rotation.y = Math.sin(t * 0.8) * 0.15;
      neck.rotation.x = -0.05 + spread * -0.25;
      eyeM.emissiveIntensity = 2.4 + Math.sin(t * 5) * 0.5 + spread * 2;
      gem.material.emissiveIntensity = 2.2 + Math.sin(t * 3) * 0.6;
      // 🦇 變霧：縮細 + 紅光
      const mist = u.mist || 0;
      body.scale.setScalar(SC * Math.max(0.02, 1 - mist));
      aura.material.opacity = mist * 0.8 + spread * 0.3;
    },
  };
  return root;
}

// ================= 🎃 Pumpkin Brothers =================
function jackHead(B, glow, piv, parent, s, { y = 0, grin = 0 } = {}) {
  const h = piv(parent, 0, y, 0);
  const orange = 0xff8f00;
  const pk = B(h, 0.86 * s, 0.72 * s, 0.8 * s, orange, 0, 0, 0, { r: 0.42, line: 0.06 });
  for (const x of [-0.26, 0, 0.26]) B(pk, 0.05 * s, 0.7 * s, 0.82 * s, 0xe65100, x * s, 0, 0, { line: 0, r: 0.4 });
  for (const z of [-0.2, 0.2]) B(pk, 0.88 * s, 0.7 * s, 0.05 * s, 0xf57c00, 0, 0, z * s, { line: 0, r: 0.4 });
  // 柄 + 葉 + 卷鬚
  B(h, 0.12 * s, 0.22 * s, 0.12 * s, 0x33691e, 0.04 * s, 0.44 * s, 0, { line: 0.12 }).rotation.z = -0.25;
  B(h, 0.26 * s, 0.04 * s, 0.16 * s, 0x689f38, 0.16 * s, 0.4 * s, 0.05 * s, { line: 0.12, r: 0.4 }).rotation.z = 0.35;
  // 發光雕刻：三角眼 + 鋸齒嘴
  const fire = glow(0xffd740, 2.8);
  const face = piv(h, 0, 0, -0.405 * s);
  for (const sx of [-1, 1]) {
    const e = B(face, 0.17 * s, 0.17 * s, 0.03 * s, fire, sx * 0.19 * s, 0.1 * s, 0, { line: 0, r: 0.1 });
    e.rotation.z = PI / 4;
    e.scale.y = 0.7;
  }
  B(face, 0.09 * s, 0.07 * s, 0.03 * s, fire, 0, -0.01 * s, 0, { line: 0, r: 0.1 }).rotation.z = PI / 4;
  const mouth = piv(face, 0, -0.17 * s, 0);
  B(mouth, 0.46 * s, 0.1 * s, 0.03 * s, fire, 0, 0, 0, { line: 0, r: 0.2 });
  for (let i = 0; i < 4; i++) B(mouth, 0.07 * s, 0.07 * s, 0.035 * s, fire, (-0.15 + i * 0.1) * s, (i % 2 ? 0.06 : -0.06) * s, 0, { line: 0, r: 0.1 }).rotation.z = PI / 4;
  mouth.scale.y = 1 + grin;
  return { h, fire, mouth };
}

export function buildPumpkinBro({ seed = 1, little = false } = {}) {
  const root = new THREE.Group();
  const { B, glow, piv, halo } = kit(root);
  const R = rng(seed + (little ? 99 : 11));
  const SC = little ? 1.15 : 2.0;
  const body = piv(root);
  body.scale.setScalar(SC);
  const cloth = little ? 0x2e7d32 : 0x6a1b9a;
  const clothDark = little ? 0x1b5e20 : 0x4a148c;
  const shirt = little ? 0xffb300 : 0x00897b;
  const straw = 0xffd54f;
  // 腳 + 補丁吊帶褲
  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = piv(body, sx * 0.2, 0.78, 0);
    B(hip, 0.28, 0.44, 0.3, cloth, 0, -0.2, 0);
    B(hip, 0.25, 0.3, 0.27, cloth, 0, -0.52, 0, { line: 0.06 });
    B(hip, 0.3, 0.14, 0.4, 0x3e2723, 0, -0.71, -0.05, { line: 0.08 });
    for (let i = 0; i < 3; i++) B(hip, 0.05, 0.12, 0.05, straw, -0.08 + i * 0.08, -0.62, 0.02, { line: 0 }).rotation.z = (i - 1) * 0.4; // 禾稈
    if (sx === 1) B(hip, 0.16, 0.15, 0.02, little ? 0xff7043 : 0xffeb3b, 0.02, -0.25, -0.16, { line: 0.12 });
    legs.push(hip);
  }
  const torso = piv(body, 0, 0.78, 0);
  B(torso, 0.66, 0.74, 0.4, shirt, 0, 0.37, 0);
  B(torso, 0.6, 0.42, 0.42, cloth, 0, 0.2, 0, { line: 0.05 }); // 吊帶褲
  for (const sx of [-1, 1]) {
    B(torso, 0.09, 0.42, 0.43, cloth, sx * 0.2, 0.55, 0, { line: 0 });
    B(torso, 0.08, 0.08, 0.02, 0xffd54f, sx * 0.2, 0.42, -0.22, { line: 0.1 });
  }
  B(torso, 0.2, 0.16, 0.02, little ? 0x81d4fa : 0xff80ab, -0.12, 0.2, -0.215, { line: 0.12 }); // 補丁
  // 頸：禾稈
  for (let i = 0; i < 5; i++) B(torso, 0.06, 0.18, 0.06, straw, -0.2 + i * 0.1, 0.78, -0.12 + (i % 2) * 0.24, { line: 0 }).rotation.z = (i - 2) * 0.3;
  // 手 + 手套 + 禾稈
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = piv(torso, sx * 0.44, 0.66, 0);
    B(sh, 0.24, 0.26, 0.26, shirt, 0, -0.05, 0, { line: 0.06 });
    B(sh, 0.2, 0.46, 0.2, shirt, 0, -0.34, 0, { line: 0.06 });
    for (let i = 0; i < 3; i++) B(sh, 0.05, 0.14, 0.05, straw, -0.06 + i * 0.06, -0.58, 0, { line: 0 });
    B(sh, 0.24, 0.22, 0.24, little ? 0xd32f2f : 0x795548, 0, -0.7, 0, { line: 0.08 }); // 手套
    arms.push(sh);
  }
  // 細佬：戴頂細帽；大佬：補丁帽
  const neck = piv(torso, 0, 0.8, 0);
  const jh = jackHead(B, glow, piv, neck, 1, { y: 0.4, grin: little ? 0.4 : 0 });
  let hat = null; // 大佬頂帽（細佬坐喺佢個頭上面嗰陣收埋）
  if (little) {
    B(jh.h, 0.5, 0.06, 0.5, 0x5d4037, 0, 0.38, 0, { line: 0.12 });
    B(jh.h, 0.3, 0.2, 0.3, 0x6d4c41, 0, 0.5, 0, { line: 0.08 });
    B(jh.h, 0.31, 0.05, 0.31, 0xff1744, 0, 0.45, 0, { line: 0 });
  } else {
    hat = piv(jh.h);
    B(hat, 1.1, 0.06, 1.0, 0x3e2723, 0, 0.4, 0, { line: 0.12, r: 0.3 });
    const c1 = piv(hat, 0, 0.42, 0);
    B(c1, 0.6, 0.34, 0.56, 0x4e342e, 0, 0.17, 0, { line: 0.08 });
    B(c1, 0.18, 0.16, 0.02, 0xffeb3b, 0.15, 0.2, -0.29, { line: 0.12 });
    c1.rotation.z = 0.12;
  }
  const lamp = halo(jh.h, 0xffab40, 1.6, 0.35, 0);
  const height = (0.78 + 0.8 + 0.4 + 0.4 + (little ? 0.25 : 0.3)) * SC;
  const phase = R() * 10;
  root.userData = {
    ...root.userData,
    height, size: V(1.0 * SC, height, 0.8 * SC), ball: 0, carry: 0, sit: 0, little, hat,
    headTop: (0.78 + 0.8 + 0.4 + 0.36) * SC, // 南瓜頭頂（細佬坐喺度）
    hipY: 0.78 * SC,
    parts: () => {
      const b = root.userData.ball || 0;
      if (b > 0.5) return [{ y: 0.6 * SC, radius: 0.6 * SC, mult: 1 }];
      return [
        { y: 1.1 * SC, radius: 0.55 * SC, mult: 1 },
        { y: 1.98 * SC, radius: 0.46 * SC, mult: 1.5, crit: true },
      ];
    },
    animate(t, moving = 1, attackK = 0) {
      const u = root.userData;
      const w = (t + phase) * (little ? 7 : 4.6);
      const s = Math.sin(w);
      const ball = u.ball || 0; // 縮埋一嚿（俾大佬掟）
      const carry = u.carry || 0; // 舉高雙手（托住細佬）
      const sit = u.sit || 0; // 坐低（騎膊馬）：腳向前、搖下搖下
      legs[0].rotation.x = s * 0.6 * moving * (1 - ball) + ball * 1.6 + sit * (1.45 + Math.sin(t * 6) * 0.2);
      legs[1].rotation.x = -s * 0.6 * moving * (1 - ball) + ball * 1.6 + sit * (1.45 + Math.sin(t * 6 + 2) * 0.2);
      legs[0].rotation.z = -sit * 0.35;
      legs[1].rotation.z = sit * 0.35;
      body.position.y = Math.abs(Math.cos(w)) * 0.08 * moving * (1 - ball) - ball * 0.5 * SC * 0.5;
      body.rotation.z = s * 0.06 * moving;
      torso.rotation.x = -ball * 0.9 - attackK * 0.2;
      const up = attackK < 0.6 ? attackK / 0.6 : 1 - (attackK - 0.6) / 0.4;
      const smash = attackK >= 0.6 ? (attackK - 0.6) / 0.4 : 0;
      const armBase = little ? 0.3 : 0.2;
      for (const [i, a] of arms.entries()) {
        a.rotation.x = armBase + Math.sin(w + i * PI) * 0.35 * moving + up * 2.0 - smash * 0.8 + carry * 2.6 + ball * 1.8;
        a.rotation.z = (i ? 1 : -1) * (0.1 + carry * 0.25 - ball * 0.3);
      }
      neck.rotation.z = Math.sin(t * 1.6 + phase) * 0.12;
      jh.h.rotation.y = Math.sin(t * 1.1 + phase) * 0.15;
      jh.fire.emissiveIntensity = 2.4 + Math.sin(t * 11 + phase) * 0.5 + Math.sin(t * 23) * 0.2;
      lamp.material.opacity = 0.3 + Math.sin(t * 9 + phase) * 0.08;
      jh.mouth.scale.y = 1 + (little ? 0.4 : 0) + up * 0.8;
    },
  };
  return root;
}

export function buildSmallPumpkin({ seed = 1 } = {}) {
  const root = new THREE.Group();
  const { B, glow, piv, halo } = kit(root);
  const body = piv(root);
  const jh = jackHead(B, glow, piv, body, 0.75, { y: 0.48, grin: 0.5 });
  const feet = [];
  for (const sx of [-1, 1]) {
    const f = piv(body, sx * 0.18, 0.18, 0);
    B(f, 0.14, 0.2, 0.14, 0x33691e, 0, -0.02, 0, { line: 0.1 });
    B(f, 0.18, 0.08, 0.22, 0x3e2723, 0, -0.12, -0.03, { line: 0.1 });
    feet.push(f);
  }
  const lamp = halo(jh.h, 0xffab40, 1.1, 0.35, 0);
  const seedK = (seed % 5) * 1.3;
  root.userData = {
    ...root.userData,
    height: 1.0, size: V(0.7, 1.0, 0.7), squash: 0,
    parts: () => [{ y: 0.5, radius: 0.42, mult: 1 }],
    animate(t, moving = 1) {
      const sq = root.userData.squash || 0;
      body.scale.set(1 + sq * 0.25, 1 - sq * 0.3, 1 + sq * 0.25);
      feet[0].rotation.x = Math.sin(t * 12 + seedK) * 0.5 * moving;
      feet[1].rotation.x = -Math.sin(t * 12 + seedK) * 0.5 * moving;
      jh.h.rotation.z = Math.sin(t * 6 + seedK) * 0.12;
      jh.fire.emissiveIntensity = 2.4 + Math.sin(t * 13 + seedK) * 0.5;
      lamp.material.opacity = 0.3 + Math.sin(t * 9 + seedK) * 0.08;
    },
  };
  return root;
}

// ================= 👻 Banshee Queen =================
export function buildBanshee({ seed = 1, copy = false } = {}) {
  const root = new THREE.Group();
  const { glow, piv, halo, extra } = kit(root);
  const R = rng(seed + 71);
  const SC = 1.9;
  const body = piv(root, 0, 0.5, 0);
  body.scale.setScalar(SC);
  // 鬼魂材質：半透明 + 發光（自己做，可以調透明度）
  const ghostMats = [];
  const gm = (color, emissive, ei = 0.6, opacity = 0.82) => {
    const m = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, roughness: 0.4, transparent: true, opacity, depthWrite: true });
    m.userData.base = { ei, opacity };
    ghostMats.push(m);
    extra.push(m);
    return m;
  };
  const robeM = gm(0xb3e5fc, 0x4dd0e1, 0.55, 0.78);
  const robeDarkM = gm(0x80deea, 0x00acc1, 0.6, 0.7);
  const skinM = gm(0xe0f7fa, 0x80deea, 0.5, 0.9);
  const hairM = gm(0xeceff1, 0xb2ebf2, 0.6, 0.85);
  const crownM = gm(0xcfd8dc, 0x90a4ae, 0.4, 1);
  crownM.metalness = 0.7;
  const gemM = gm(0x18ffff, 0x18ffff, 2.5, 1);
  const darkM = gm(0x0a1a2a, 0x000000, 0, 0.95);
  const eyeM = gm(0x84ffff, 0x84ffff, 3, 1);
  const G = (parent, w, h, d, m, x = 0, y = 0, z = 0, r = 0.3) => {
    const g = cached(`rb${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * r));
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  // 長袍（上窄下闊，下面一條條爛布飄）
  G(body, 0.6, 0.6, 0.44, robeM, 0, 1.3, 0);
  G(body, 0.74, 0.5, 0.54, robeM, 0, 0.8, 0);
  G(body, 0.88, 0.42, 0.62, robeM, 0, 0.36, 0);
  G(body, 0.4, 0.5, 0.05, robeDarkM, 0, 1.15, -0.23); // 胸前
  const tatters = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * PI * 2;
    const p = piv(body, Math.sin(a) * 0.36, 0.18, Math.cos(a) * 0.26);
    p.rotation.y = a;
    G(p, 0.2, 0.5 + R() * 0.3, 0.06, i % 2 ? robeDarkM : robeM, 0, -0.25, 0, 0.4);
    tatters.push({ p, a });
  }
  // 頸 + 頭
  const neck = piv(body, 0, 1.62, 0);
  const head = piv(neck, 0, 0.3, 0);
  G(head, 0.5, 0.56, 0.48, skinM, 0, 0, 0, 0.35);
  // 黑色空眼窩 + 發光瞳 + 張得開嘅口
  for (const sx of [-1, 1]) {
    G(head, 0.15, 0.2, 0.04, darkM, sx * 0.12, 0.06, -0.24, 0.45);
    G(head, 0.06, 0.06, 0.04, eyeM, sx * 0.12, 0.05, -0.26, 0.45);
  }
  const mouth = piv(head, 0, -0.14, -0.245);
  G(mouth, 0.14, 0.14, 0.04, darkM, 0, -0.04, 0, 0.45);
  // 長頭髮（向後飄）
  const hair = piv(head, 0, 0.12, 0.18);
  const locks = [];
  for (let i = 0; i < 7; i++) {
    const x = -0.24 + i * 0.08;
    const l = piv(hair, x, 0, 0);
    G(l, 0.09, 0.9 + R() * 0.4, 0.09, hairM, 0, -0.4, 0.05, 0.45);
    l.rotation.x = 0.5;
    locks.push(l);
  }
  for (const sx of [-1, 1]) G(head, 0.1, 0.6, 0.12, hairM, sx * 0.27, -0.2, -0.02, 0.45); // 兩邊頭髮
  // 銀色皇冠 + 青色寶石
  const crown = piv(head, 0, 0.3, 0);
  G(crown, 0.54, 0.1, 0.52, crownM, 0, 0, 0, 0.2);
  for (let i = 0; i < 5; i++) {
    const a = -PI / 2 + ((i - 2) / 4) * PI * 0.9;
    const sh = 0.22 + (i === 2 ? 0.12 : 0);
    const sp = G(crown, 0.07, sh, 0.07, crownM, Math.cos(a) * 0.24, 0.12, Math.sin(a) * 0.24, 0.2);
    G(sp, 0.07, 0.07, 0.07, gemM, 0, sh / 2, 0, 0.45);
  }
  G(crown, 0.1, 0.1, 0.05, gemM, 0, 0.02, -0.27, 0.45);
  // 長袖手（向前伸）
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = piv(body, sx * 0.36, 1.5, 0);
    G(sh, 0.24, 0.6, 0.24, robeM, 0, -0.26, 0, 0.4);
    G(sh, 0.32, 0.3, 0.32, robeDarkM, 0, -0.6, 0, 0.4); // 闊袖口
    G(sh, 0.12, 0.2, 0.12, skinM, 0, -0.8, 0, 0.4);
    sh.rotation.x = 0.7;
    arms.push(sh);
  }
  const aura = halo(body, copy ? 0x80deea : 0x18ffff, 2.6, 0.45, 1);
  const height = 2.6 * SC;
  let alpha = 1;
  const phase = R() * 10;
  root.userData = {
    ...root.userData,
    height, size: V(1 * SC, height, 0.8 * SC), scream: 0, copy,
    setAlpha(k) {
      alpha = k;
      for (const m of ghostMats) {
        m.opacity = m.userData.base.opacity * k;
        m.depthWrite = k > 0.6;
      }
      aura.material.opacity = 0.45 * k;
      root.visible = k > 0.02;
    },
    flash(k) {
      for (const m of ghostMats) m.emissiveIntensity = m.userData.base.ei + k * 2;
    },
    parts: () => [
      { y: 1.2 * SC, radius: 0.5 * SC, mult: 1 },
      { y: 2.2 * SC, radius: 0.36 * SC, mult: 1.5, crit: true },
    ],
    animate(t, moving = 1, attackK = 0) {
      const u = root.userData;
      const sc = u.scream || 0;
      body.position.y = 0.5 + Math.sin(t * 1.8 + phase) * 0.18;
      body.rotation.z = Math.sin(t * 1.3 + phase) * 0.05;
      body.rotation.x = -0.12 * moving;
      for (const tt of tatters) tt.p.rotation.x = Math.sin(t * 4 + tt.a * 2) * 0.25 + 0.15 * moving;
      for (const [i, l] of locks.entries()) l.rotation.x = 0.5 + sc * 0.9 + Math.sin(t * 3 + i) * 0.15 + moving * 0.2;
      mouth.scale.set(1 + sc * 0.6, 1 + sc * 2.4, 1);
      neck.rotation.x = -sc * 0.25;
      const up = Math.max(sc, attackK);
      arms[0].rotation.x = 0.7 + Math.sin(t * 2 + phase) * 0.15 + up * 0.9;
      arms[1].rotation.x = 0.7 + Math.sin(t * 2 + phase + 1) * 0.15 + up * 0.9;
      arms[0].rotation.z = -0.15 - sc * 0.9;
      arms[1].rotation.z = 0.15 + sc * 0.9;
      eyeM.emissiveIntensity = 3 + sc * 4;
      aura.scale.setScalar(2.6 + sc * 1.5 + Math.sin(t * 3) * 0.2);
      // 假嘅：間中閃一閃（細心睇得出）
      if (copy && alpha > 0.5) for (const m of ghostMats) m.opacity = m.userData.base.opacity * alpha * (0.75 + Math.sin(t * 17 + phase) * 0.2);
    },
  };
  return root;
}
