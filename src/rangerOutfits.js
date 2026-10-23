// 護林員皮膚 v2（小朋友 Issue #14：「Ranger skins too ugly」→ 每款都要靚、要唔同）
// 每款皮膚 = 身體物料（布紋／花紋，畫喺 rangerTextures.js）+ 一層層嘅衫褲配件（外套、背心、皮帶、袋、靴、手套、帽、背囊、徽章）
//           + 會郁嘅細節（披風、翼、羽毛、鸚鵡、飄嘅書、星球）+ 粒子特效（跟畫質：最低畫質唔出粒子）
//
// 效能：唔郁嘅配件全部「焊埋」—— 同一個關節（頭／身／手／腳）同一種物料嘅嘢合併做一個 mesh（mergeGeometries）
//       每款皮膚第一次著先砌（lazy），砌過就記住，換返嗰款即刻有
//
// 座標（公仔望住 -z）：
//   torso：腳底 = 0；個身 x ±0.425、y 0.9–1.8、z ±0.225（前面 z = -0.225）
//   head：頭中心 = 0；±0.33（塊面 z = -0.33）
//   armL / armR：膊頭 = 0；衫袖 y +0.05 → -0.69、±0.17；手掌 y -0.70 → -0.92
//   legL / legR：髖 = 0；條腳 y 0 → -0.8、±0.19；鞋 y -0.76 → -0.92
//   armL / legL 喺 x 負數嗰邊（s = -1），armR / legR 喺 x 正數（s = +1）

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as T from './rangerTextures.js';

const PI = Math.PI;
const SKIN = 0xf5c99b;
const QF = [0, 0.35, 0.7, 1]; // 畫質 0–3：粒子數目比例

// ---------- 形狀（共用，唔好 dispose）----------
const geoCache = new Map();
const G = (key, mk) => {
  if (!geoCache.has(key)) geoCache.set(key, mk());
  return geoCache.get(key);
};
const rbox = (w, h, d, r = 0.18) => G(`b${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * r));
const cylG = (rt, rb, h, n = 12) => G(`c${rt}|${rb}|${h}|${n}`, () => new THREE.CylinderGeometry(rt, rb, h, n));
const coneG = (r, h, n = 8) => G(`k${r}|${h}|${n}`, () => new THREE.ConeGeometry(r, h, n));
const octG = G('oct', () => new THREE.OctahedronGeometry(1, 0));
const ballG = G('ball', () => new THREE.SphereGeometry(1, 14, 10));
const icoG = G('ico', () => new THREE.IcosahedronGeometry(1, 0));
const torusG = (R, r, arc = PI * 2, n = 24) => G(`t${R}|${r}|${arc}|${n}`, () => new THREE.TorusGeometry(R, r, 8, n, arc));
const planeG = (w, h) => G(`p${w}|${h}`, () => new THREE.PlaneGeometry(w, h));
function starGeo(R, depth = 0.04, n = 5, inner = 0.45) {
  return G(`star${R}|${depth}|${n}|${inner}`, () => {
    const s = new THREE.Shape();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? R * inner : R;
      const a = PI / 2 + (i / (n * 2)) * PI * 2;
      if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * 0.3, bevelSize: R * 0.06, bevelSegments: 1 });
    g.translate(0, 0, -depth / 2);
    return g;
  });
}

// ---------- 物料（共用；會郁嘅用 fresh 版）----------
const matCache = new Map();
const keyOf = (o) => Object.entries(o).map(([k, v]) => `${k}:${v?.isTexture ? v.uuid : v}`).join(',');
export function mat(color, o = {}) {
  const key = `${color}|${keyOf(o)}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...o }));
  return matCache.get(key);
}
const fresh = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o });
const glow = (c, k = 1.6, o = {}) => mat(c, { emissive: c, emissiveIntensity: k, roughness: 0.35, ...o });
const glowF = (c, k = 1.6, o = {}) => fresh(c, { emissive: c, emissiveIntensity: k, roughness: 0.35, ...o });
const metal = (c, rough = 0.3, o = {}) => mat(c, { metalness: 0.85, roughness: rough, ...o });
const tex = (t, o = {}) => mat(0xffffff, { map: t, ...o });
const decal = (t, o = {}) => mat(0xffffff, { map: t, transparent: true, alphaTest: 0.35, roughness: 0.5, ...o });
const basic = (c, o = 0.6) => mat(c, { transparent: true, opacity: o, depthWrite: false, emissive: c, emissiveIntensity: 1.5 });

// ---------- 砌嘢工具（kit）：配件全部記低，最後同關節同物料嘅合併 ----------
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
function prep(geo, matrix) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  g.clearGroups();
  g.applyMatrix4(matrix);
  return g;
}
function kit(bones) {
  const buckets = new Map();
  const stack = [new THREE.Matrix4()];
  const fx = [];
  const tgt = (t) => (typeof t === 'string' ? bones[t] : t);
  const k = {
    bones,
    fx: (fn) => fx.push(fn),
    add(t, geo, material, x = 0, y = 0, z = 0, rot = null, scl = null) {
      _e.set(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0, rot?.[3] || 'XYZ');
      _q.setFromEuler(_e);
      if (typeof scl === 'number') _s.setScalar(scl);
      else _s.set(scl?.[0] ?? 1, scl?.[1] ?? 1, scl?.[2] ?? 1);
      _m.compose(_p.set(x, y, z), _q, _s).premultiply(stack[stack.length - 1]);
      const target = tgt(t);
      if (!buckets.has(target)) buckets.set(target, new Map());
      const b = buckets.get(target);
      if (!b.has(material)) b.set(material, []);
      b.get(material).push(prep(geo, _m));
    },
    // 喺一個「轉咗嘅位」入面砌（例如斜嘅劍、三角帽嘅邊）
    at(x, y, z, rot, fn) {
      _e.set(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0, rot?.[3] || 'XYZ');
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(_e), new THREE.Vector3(1, 1, 1));
      stack.push(stack[stack.length - 1].clone().multiply(m));
      fn();
      stack.pop();
    },
    box: (t, w, h, d, m, x, y, z, rot, r = 0.18) => k.add(t, rbox(w, h, d, r), m, x, y, z, rot),
    cyl: (t, rt, rb, h, m, x, y, z, rot, n = 12) => k.add(t, cylG(rt, rb, h, n), m, x, y, z, rot),
    cone: (t, r, h, m, x, y, z, rot, n = 8) => k.add(t, coneG(r, h, n), m, x, y, z, rot),
    gem: (t, r, m, x, y, z, rot, scl = [1, 1.6, 1]) => k.add(t, octG, m, x, y, z, rot, scl.map((v) => v * r)),
    ball: (t, r, m, x, y, z, scl = [1, 1, 1], rot) => k.add(t, ballG, m, x, y, z, rot, scl.map((v) => v * r)),
    ico: (t, r, m, x, y, z, rot) => k.add(t, icoG, m, x, y, z, rot, r),
    torus: (t, R, r, m, x, y, z, rot, arc) => k.add(t, torusG(R, r, arc), m, x, y, z, rot),
    plane: (t, w, h, m, x, y, z, rot) => k.add(t, planeG(w, h), m, x, y, z, rot),
    star: (t, R, m, x, y, z, rot, depth = 0.04) => k.add(t, starGeo(R, depth), m, x, y, z, rot),
    // 前面（-z）貼徽章
    front: (t, w, h, m, x, y, z) => k.add(t, planeG(w, h), m, x, y, z, [0, PI, 0]),
    group(t, x = 0, y = 0, z = 0) {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      tgt(t).add(g);
      return g;
    },
    finish() {
      for (const [target, b] of buckets) {
        for (const [material, list] of b) {
          const mesh = new THREE.Mesh(list.length === 1 ? list[0] : mergeGeometries(list), material);
          mesh.castShadow = !material.transparent;
          mesh.userData.outfitGeo = true;
          target.add(mesh);
        }
      }
      buckets.clear();
      return fx;
    },
  };
  return k;
}

// ---------- 常用配件 ----------
const ARMS = [['armL', -1], ['armR', 1]];
const LEGS = [['legL', -1], ['legR', 1]];
function belt(k, m, buckle, { y = 0.97, h = 0.12 } = {}) {
  k.box('torso', 0.9, h, 0.5, m, 0, y, 0, null, 0.1);
  if (buckle) k.box('torso', 0.17, h + 0.03, 0.04, buckle, 0, y, -0.256, null, 0.25);
}
function gloves(k, m, cuff, { big = 0 } = {}) {
  for (const [b] of ARMS) {
    k.box(b, 0.38 + big, 0.26, 0.38 + big, m, 0, -0.81, 0);
    if (cuff) k.box(b, 0.41 + big, 0.09, 0.41 + big, cuff, 0, -0.665, 0, null, 0.25);
  }
}
function boots(k, m, { h = 0.3, cuff, sole, toe = m } = {}) {
  for (const [b] of LEGS) {
    k.box(b, 0.43, 0.2, 0.5, toe, 0, -0.83, -0.035);
    k.box(b, 0.41, h, 0.41, m, 0, -0.75 + h / 2, 0);
    if (cuff) k.box(b, 0.45, 0.08, 0.45, cuff, 0, -0.75 + h, 0, null, 0.25);
    if (sole) k.box(b, 0.45, 0.06, 0.52, sole, 0, -0.915, -0.035, null, 0.25);
  }
}
function pads(k, m, { w = 0.46, h = 0.14, y = 0.07, layers = 1, trim } = {}) {
  for (const [b, s] of ARMS) {
    for (let i = 0; i < layers; i++) k.box(b, w - i * 0.03, h, w - i * 0.03, m, s * 0.02 * i, y - i * (h * 0.75), 0, [0, 0, s * 0.12 * i]);
    if (trim) k.box(b, w + 0.01, 0.03, w + 0.01, trim, 0, y - h / 2 - (layers - 1) * h * 0.75, 0, null, 0.3);
  }
}
function hair(k, m, { long = false, fringe = true } = {}) {
  k.box('head', 0.7, 0.12, 0.7, m, 0, 0.33, 0, null, 0.3);
  k.box('head', 0.7, long ? 0.62 : 0.44, 0.08, m, 0, long ? -0.02 : 0.08, 0.33);
  for (const s of [-1, 1]) k.box('head', 0.06, 0.3, 0.46, m, s * 0.34, 0.13, 0.08);
  if (fringe) k.box('head', 0.68, 0.09, 0.06, m, 0, 0.29, -0.33);
}
function cape(k, m, { trim, w = 0.9, h = 1.4, y = 1.84, z = 0.27, collar, rest = 0.08 } = {}) {
  const g = k.group('torso', 0, y, z);
  k.box(g, w, h, 0.04, m, 0, -h / 2, 0, null, 0.1);
  if (trim) k.box(g, w + 0.02, 0.06, 0.06, trim, 0, -h + 0.02, 0, null, 0.25);
  if (collar) k.box(g, w + 0.06, 0.1, 0.1, collar, 0, 0, -0.02);
  k.fx((t, a) => swing(g, t, a, rest));
  return g;
}
function swing(g, t, a, rest = 0.08) {
  const move = a ? a.move * (0.35 + a.run * 0.55) : 0;
  const air = a ? a.air * 0.5 : 0;
  g.rotation.x = -(rest + move + air) + Math.sin(t * 2.3) * 0.05 + Math.sin(t * 9) * 0.03 * move;
  g.rotation.z = Math.sin(t * 1.4) * 0.04;
}
// 背後背住一樣嘢（斜斜）：fn 喺嗰個斜咗嘅位入面砌
const onBack = (k, x, y, z, rz, fn) => k.at(x, y, z, [0, 0, rz], fn);

// ---------- 粒子（跟畫質；喺公仔附近，跟住公仔郁）----------
function particles(k, { n = 16, colors = [0xffffff], size = 0.09, mode = 'spark', c = [0, 1.3, 0], r = [0.75, 0.95, 0.6], speed = 0.4, rainbow = false }) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setDrawRange(0, 0); // 未郁（例如過場動畫入面嘅公仔）就唔畫
  const m = new THREE.PointsMaterial({ size, map: T.softDot(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, m);
  pts.frustumCulled = false;
  k.bones.root.add(pts);
  const seeds = Array.from({ length: n }, (_, i) => ({ a: Math.random() * PI * 2, h: Math.random(), k: Math.random(), c: new THREE.Color(colors[i % colors.length]) }));
  const tmp = new THREE.Color();
  k.fx((t, a, q) => {
    const cnt = Math.floor(n * QF[q ?? 3]);
    geo.setDrawRange(0, cnt);
    for (let i = 0; i < cnt; i++) {
      const sd = seeds[i];
      let x;
      let y;
      let z;
      let f;
      if (mode === 'orbit') {
        const ang = sd.a + t * speed * (0.7 + sd.k);
        x = Math.cos(ang) * r[0];
        z = Math.sin(ang) * r[2];
        y = (sd.h - 0.5) * 2 * r[1] + Math.sin(t * 2 + i) * 0.08;
        f = 0.6 + 0.4 * Math.sin(t * 3 + i);
      } else if (mode === 'rise' || mode === 'fall') {
        const p = (sd.k + t * speed * (0.6 + sd.h * 0.6)) % 1;
        const rr = 0.35 + sd.h * 0.65;
        x = Math.cos(sd.a + p) * r[0] * rr;
        z = Math.sin(sd.a + p) * r[2] * rr;
        y = mode === 'rise' ? -r[1] + p * r[1] * 2 : r[1] - p * r[1] * 2;
        f = Math.sin(p * PI);
      } else {
        const p = (sd.k + t * speed) % 1;
        if (p < sd.last) sd.a = Math.random() * PI * 2;
        sd.last = p;
        x = Math.cos(sd.a) * r[0] * (0.55 + sd.h * 0.45);
        z = Math.sin(sd.a) * r[2] * (0.55 + sd.h * 0.45);
        y = (sd.h - 0.5) * 2 * r[1];
        f = Math.max(0, Math.sin(p * PI)) ** 3;
      }
      pos[i * 3] = c[0] + x;
      pos[i * 3 + 1] = c[1] + y;
      pos[i * 3 + 2] = c[2] + z;
      if (rainbow) tmp.setHSL((t * 0.25 + i / n) % 1, 1, 0.6);
      else tmp.copy(sd.c);
      col[i * 3] = tmp.r * f;
      col[i * 3 + 1] = tmp.g * f;
      col[i * 3 + 2] = tmp.b * f;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });
}

// =====================================================================
// 每款皮膚
//   body：身體物料（shirt 個身、sleeve 衫袖、pants 褲、shoes 鞋、skin 皮膚／手）
//         { c 顏色, map 花紋, em 發光色, emMap 發光花紋, ei 發光強度, metal, rough, rep 花紋大細 }
//   face：{ brows 眉色, hide 收埋塊面（全頭盔）, cheeks: false 唔要面珠 }
//   build(k, ctx)：砌配件；ctx = { avatar }；k.fx(fn) 登記每格要郁嘅嘢 fn(t, anim, quality)
// =====================================================================
const OUTFITS = {};

// ---------------- 🌲 Classic Ranger：卡其恤衫 + 金章 + 臂章 + 護林員帽 + 工裝褲 + 靴 + 背囊 ----------------
OUTFITS.ranger = {
  body: {
    shirt: { map: T.fabric(0xc8b07c) }, sleeve: { map: T.fabric(0xc8b07c) },
    pants: { map: T.fabric(0x5a6640, 1.3) }, shoes: { c: 0x4e342e }, skin: { c: SKIN },
  },
  face: { brows: 0x5d4037 },
  build(k) {
    const khakiD = tex(T.fabric(0xa98f5c));
    const leatherM = tex(T.leather(0x6d4c41), { roughness: 0.7 });
    const darkLeather = tex(T.leather(0x4e342e));
    const brass = metal(0xd4a537, 0.35);
    const hatM = tex(T.fabric(0x9c7a4f, 0.8), { roughness: 0.8 });
    hair(k, mat(0x6d4c41));
    // 護林員帽（Montana peak：闊邊 + 四邊撳咗嘅尖頂）
    k.box('head', 1.04, 0.045, 1.04, hatM, 0, 0.34, 0, null, 0.4);
    k.box('head', 0.66, 0.2, 0.66, hatM, 0, 0.46, 0);
    k.cone('head', 0.47, 0.24, hatM, 0, 0.67, 0, [0, PI / 4, 0], 4);
    k.box('head', 0.68, 0.065, 0.68, darkLeather, 0, 0.395, 0, null, 0.2);
    k.ball('head', 0.035, brass, 0.2, 0.4, -0.345);
    for (const s of [-1, 1]) k.box('head', 0.025, 0.42, 0.03, darkLeather, s * 0.345, 0.12, -0.06, [0.2, 0, 0]); // 帽帶
    // 恤衫：衫領、門襟 + 鈕、兩個心口袋（有袋蓋）、金章、名牌
    for (const s of [-1, 1]) k.box('torso', 0.3, 0.1, 0.13, khakiD, s * 0.17, 1.81, -0.19, [0, 0, s * -0.3]);
    k.box('torso', 0.07, 0.86, 0.02, khakiD, 0, 1.36, -0.232);
    for (const y of [1.66, 1.46, 1.26, 1.08]) k.cyl('torso', 0.022, 0.022, 0.02, mat(0x5d4037), 0, y, -0.245, [PI / 2, 0, 0]);
    for (const s of [-1, 1]) {
      k.box('torso', 0.2, 0.2, 0.03, khakiD, s * 0.18, 1.38, -0.236);
      k.box('torso', 0.22, 0.08, 0.05, khakiD, s * 0.18, 1.5, -0.24);
      k.cyl('torso', 0.018, 0.018, 0.02, mat(0x5d4037), s * 0.18, 1.49, -0.268, [PI / 2, 0, 0]);
    }
    k.box('torso', 0.15, 0.17, 0.02, brass, 0.18, 1.665, -0.236, null, 0.3);
    k.front('torso', 0.15, 0.17, decal(T.DECALS.rangerBadge(), { metalness: 0.6, roughness: 0.3 }), 0.18, 1.665, -0.248);
    k.front('torso', 0.2, 0.2, decal(T.DECALS.nameTag()), -0.18, 1.66, -0.24);
    // 皮帶 + 銅扣 + 腰包 + 對講機
    belt(k, leatherM, brass);
    k.box('torso', 0.15, 0.17, 0.12, darkLeather, -0.34, 0.96, -0.2);
    k.box('torso', 0.1, 0.2, 0.08, mat(0x37474f), 0.34, 0.97, -0.21);
    k.cyl('torso', 0.012, 0.012, 0.16, mat(0x212121), 0.37, 1.13, -0.21);
    // 衫袖：膊頭肩帶、摺起嘅袖口、臂章
    for (const [b, s] of ARMS) {
      k.box(b, 0.14, 0.04, 0.36, khakiD, 0, 0.065, 0);
      k.box(b, 0.37, 0.11, 0.37, khakiD, 0, -0.62, 0, null, 0.3);
      k.plane(b, 0.21, 0.23, decal(T.DECALS.rangerPatch()), s * 0.176, -0.16, 0, [0, s * PI / 2, 0]);
    }
    // 工裝褲：大髀側袋
    const pantsD = tex(T.fabric(0x48532f, 1.3));
    for (const [b, s] of LEGS) {
      k.box(b, 0.05, 0.22, 0.24, pantsD, s * 0.205, -0.4, 0);
      k.box(b, 0.06, 0.06, 0.26, pantsD, s * 0.208, -0.28, 0);
    }
    // 行山靴：鞋帶
    boots(k, leatherM, { h: 0.26, cuff: darkLeather, sole: mat(0x3e2723) });
    for (const [b] of LEGS) for (const y of [-0.58, -0.66, -0.74]) k.box(b, 0.2, 0.025, 0.02, mat(0xd7ccc8), 0, y, -0.215, null, 0.4);
    // 背囊：主袋、袋蓋、前袋、睡袋卷、水樽、肩帶
    const packM = tex(T.fabric(0x3d6b42, 1.2));
    const packD = tex(T.fabric(0x2c5130, 1.2));
    k.box('torso', 0.62, 0.66, 0.26, packM, 0, 1.36, 0.355);
    k.box('torso', 0.64, 0.2, 0.29, packD, 0, 1.62, 0.36);
    for (const s of [-1, 1]) {
      k.box('torso', 0.05, 0.2, 0.02, darkLeather, s * 0.16, 1.52, 0.505);
      k.box('torso', 0.07, 0.05, 0.03, brass, s * 0.16, 1.44, 0.505);
    }
    k.box('torso', 0.42, 0.24, 0.08, packD, 0, 1.2, 0.51);
    k.cyl('torso', 0.11, 0.11, 0.72, tex(T.fabric(0xb5651d, 0.8)), 0, 1.79, 0.36, [0, 0, PI / 2]);
    for (const s of [-1, 1]) k.cyl('torso', 0.115, 0.115, 0.04, darkLeather, s * 0.2, 1.79, 0.36, [0, 0, PI / 2]);
    k.cyl('torso', 0.07, 0.07, 0.26, metal(0x90a4ae, 0.35), 0.37, 1.28, 0.36);
    k.cyl('torso', 0.04, 0.04, 0.06, mat(0x1b5e20), 0.37, 1.44, 0.36);
    for (const s of [-1, 1]) {
      k.box('torso', 0.09, 0.03, 0.5, packD, s * 0.33, 1.81, 0.02);
      k.box('torso', 0.09, 0.55, 0.03, packD, s * 0.33, 1.54, -0.236);
    }
    // 🦋 一隻細蝴蝶圍住頂帽飛（自然公園嘅感覺）
    const fly = k.group('root', 0.6, 2.7, 0);
    const wings = [-1, 1].map((s) => {
      const w = k.group(fly);
      k.box(w, 0.13, 0.015, 0.11, mat(0xff8f00, { emissive: 0xff6f00, emissiveIntensity: 0.25 }), s * 0.07, 0, -0.02, null, 0.3);
      k.box(w, 0.09, 0.012, 0.08, mat(0xffa726), s * 0.05, 0, 0.07, null, 0.3);
      k.box(w, 0.14, 0.017, 0.02, mat(0x212121), s * 0.07, 0, -0.075, null, 0.3);
      return w;
    });
    k.box(fly, 0.025, 0.025, 0.14, mat(0x212121), 0, 0, 0, null, 0.4);
    k.fx((t) => {
      const ang = t * 0.6;
      fly.position.set(Math.cos(ang) * 0.75, 2.75 + Math.sin(t * 1.7) * 0.12, Math.sin(ang) * 0.75);
      fly.rotation.y = -ang;
      const f = Math.sin(t * 22) * 0.9;
      wings[0].rotation.z = f;
      wings[1].rotation.z = -f;
    });
  },
};

// ---------------- 🥷 Ninja：交叉衫襟、紅腰帶、頭巾（會飄）、綁手綁腳、背後木劍 ----------------
OUTFITS.ninja = {
  body: {
    shirt: { map: T.fabric(0x2a2e37, 1.8) }, sleeve: { map: T.fabric(0x2a2e37, 1.8) },
    pants: { map: T.fabric(0x22252d, 1.8) }, shoes: { c: 0x15171b }, skin: { c: SKIN },
  },
  face: { brows: 0x15171b, hideBrows: true },
  build(k) {
    const hood = tex(T.fabric(0x23262e, 1.6));
    const dark = mat(0x15171b);
    const red = tex(T.fabric(0xc62828));
    const wrapM = mat(0x3b404b);
    const steel = metal(0x9aa6b0, 0.3);
    // 頭罩：淨係見到對眼
    k.box('head', 0.73, 0.15, 0.73, hood, 0, 0.31, 0);
    for (const s of [-1, 1]) k.box('head', 0.05, 0.66, 0.72, hood, s * 0.355, -0.01, 0);
    k.box('head', 0.72, 0.7, 0.06, hood, 0, -0.01, 0.35);
    k.box('head', 0.73, 0.3, 0.06, hood, 0, -0.2, -0.35);
    for (const y of [-0.13, -0.22]) k.box('head', 0.6, 0.02, 0.02, dark, 0, y, -0.383, null, 0.4);
    // 紅頭巾 + 鐵牌 + 後面兩條會飄嘅帶
    k.box('head', 0.76, 0.1, 0.76, red, 0, 0.205, 0, null, 0.2);
    k.box('head', 0.24, 0.085, 0.03, steel, 0, 0.205, -0.385, null, 0.25);
    k.box('head', 0.16, 0.012, 0.012, dark, 0, 0.205, -0.402, null, 0.4);
    k.box('head', 0.12, 0.12, 0.08, red, 0, 0.2, 0.4);
    const tails = [-1, 1].map((s) => {
      const g = k.group('head', s * 0.04, 0.19, 0.42);
      k.box(g, 0.07, 0.035, 0.42, red, 0, 0, 0.2, null, 0.3);
      return g;
    });
    k.fx((t, a) => {
      const mv = a ? a.move : 0;
      tails.forEach((g, i) => {
        g.rotation.x = 0.5 - mv * 0.45 + Math.sin(t * (4 + mv * 8) + i) * (0.08 + mv * 0.1);
        g.rotation.y = (i ? 1 : -1) * (0.15 + Math.sin(t * 3 + i * 2) * 0.06);
      });
    });
    // 交叉衫襟、底衫
    k.box('torso', 0.12, 1.0, 0.03, dark, 0.04, 1.4, -0.236, [0, 0, 0.5]);
    k.box('torso', 0.05, 0.98, 0.032, wrapM, 0.1, 1.4, -0.24, [0, 0, 0.5]);
    k.box('torso', 0.3, 0.2, 0.025, mat(0x3a3f4a), -0.1, 1.72, -0.232, [0, 0, 0.5]);
    // 紅腰帶 + 打結 + 兩條帶尾
    k.box('torso', 0.9, 0.16, 0.5, red, 0, 0.98, 0, null, 0.15);
    k.box('torso', 0.16, 0.15, 0.08, red, 0.24, 0.98, -0.26);
    k.box('torso', 0.08, 0.3, 0.03, red, 0.2, 0.8, -0.265, [0, 0, 0.18]);
    k.box('torso', 0.08, 0.26, 0.03, red, 0.29, 0.82, -0.265, [0, 0, -0.2]);
    // 單邊膊甲
    k.box('armL', 0.44, 0.13, 0.42, mat(0x37414f, { metalness: 0.4, roughness: 0.45 }), -0.02, 0.06, 0, [0, 0, -0.1]);
    k.box('armL', 0.45, 0.025, 0.43, red, -0.02, -0.01, 0, [0, 0, -0.1], 0.3);
    // 綁手：護腕 + 布條；黑色露指手套
    for (const [b, s] of ARMS) {
      k.box(b, 0.37, 0.3, 0.37, mat(0x323844), 0, -0.52, 0);
      k.box(b, 0.04, 0.26, 0.2, steel, s * 0.19, -0.52, 0, null, 0.3);
      for (const y of [-0.42, -0.5, -0.58]) k.box(b, 0.38, 0.03, 0.38, wrapM, 0, y, 0, [0.12, 0, 0], 0.3);
    }
    gloves(k, mat(0x111317), null);
    // 綁腳 + 分趾鞋
    for (const [b] of LEGS) for (const y of [-0.36, -0.46, -0.56, -0.66]) k.box(b, 0.4, 0.03, 0.4, wrapM, 0, y, 0, [0.1, 0, 0], 0.3);
    boots(k, mat(0x111317), { h: 0.16 });
    for (const [b] of LEGS) k.box(b, 0.02, 0.15, 0.04, mat(0x2b2f38), 0, -0.84, -0.27);
    // 背後木劍（練習用）
    onBack(k, 0, 1.4, 0.3, 0.62, () => {
      k.box('torso', 0.09, 0.95, 0.06, mat(0x5d1a1a), 0, -0.1, 0);
      k.box('torso', 0.1, 0.05, 0.07, metal(0xffc107, 0.35), 0, -0.55, 0);
      k.box('torso', 0.2, 0.04, 0.12, metal(0xffc107, 0.35), 0, 0.38, 0, null, 0.3);
      k.box('torso', 0.065, 0.32, 0.065, tex(T.stripes([0xeeeeee, 0x212121], 10, 'd')), 0, 0.56, 0);
      k.box('torso', 0.075, 0.04, 0.075, metal(0xffc107, 0.35), 0, 0.73, 0);
    });
  },
};

// ---------------- 🐼 Panda Suit：熊貓連身衫（毛毛花紋）、熊貓帽（耳仔）、黑色膊頭、肚、尾、肉球手套、竹 ----------------
OUTFITS.panda = {
  body: {
    shirt: { map: T.fur(0xf4f3ee, 0xffffff, 0xd6d5cc) }, sleeve: { map: T.fur(0x202020, 0x3d3d3d, 0x000000) },
    pants: { map: T.fur(0x202020, 0x3d3d3d, 0x000000) }, shoes: { c: 0x1d1d1d }, skin: { c: SKIN },
  },
  face: { brows: 0x4e342e },
  build(k) {
    const white = tex(T.fur(0xf4f3ee, 0xffffff, 0xd6d5cc));
    const black = tex(T.fur(0x202020, 0x3d3d3d, 0x000000));
    const pink = mat(0xf48fb1);
    // 熊貓帽：包住個頭，前面露個樣
    k.box('head', 0.77, 0.17, 0.77, white, 0, 0.32, 0);
    for (const s of [-1, 1]) k.box('head', 0.07, 0.68, 0.77, white, s * 0.37, -0.01, 0);
    k.box('head', 0.77, 0.72, 0.07, white, 0, -0.01, 0.37);
    k.box('head', 0.77, 0.07, 0.08, white, 0, -0.34, -0.33);
    // 帽上面嘅熊貓面：黑眼圈、眼、鼻
    for (const s of [-1, 1]) {
      k.box('head', 0.17, 0.11, 0.04, black, s * 0.17, 0.37, -0.385, [0, 0, s * -0.3]);
      k.box('head', 0.045, 0.045, 0.02, mat(0xffffff), s * 0.17, 0.38, -0.408, null, 0.4);
    }
    k.box('head', 0.08, 0.05, 0.04, mat(0x111111), 0, 0.32, -0.395, null, 0.4);
    // 耳仔（會郁吓郁吓）
    const ears = [-1, 1].map((s) => {
      const g = k.group('head', s * 0.27, 0.42, 0.04);
      k.cyl(g, 0.13, 0.13, 0.09, black, 0, 0.06, 0, [PI / 2, 0, 0], 16);
      k.cyl(g, 0.075, 0.075, 0.02, pink, 0, 0.06, -0.05, [PI / 2, 0, 0], 16);
      return g;
    });
    k.fx((t) => {
      const tw = Math.max(0, Math.sin(t * 0.9) - 0.9) * 4;
      ears[0].rotation.z = 0.08 + tw * 0.3;
      ears[1].rotation.z = -0.08 - Math.max(0, Math.sin(t * 0.9 + 2) - 0.9) * 1.2;
    });
    // 黑色膊頭帶（真熊貓都係咁）、白肚、拉鍊、袋鼠袋、尾巴
    k.box('torso', 0.88, 0.22, 0.48, black, 0, 1.71, 0);
    k.box('torso', 0.5, 0.5, 0.03, tex(T.fur(0xfffdf2, 0xffffff, 0xe8e2cf)), 0, 1.28, -0.234, null, 0.3);
    k.box('torso', 0.03, 0.62, 0.02, metal(0xcfd8dc, 0.3), 0, 1.3, -0.252);
    k.box('torso', 0.05, 0.09, 0.02, metal(0xcfd8dc, 0.3), 0, 1.56, -0.262);
    k.box('torso', 0.52, 0.17, 0.05, white, 0, 1.08, -0.245);
    k.ball('torso', 0.12, white, 0, 0.98, 0.27);
    // 肉球手套 + 拖鞋
    gloves(k, black, null);
    for (const [b] of ARMS) {
      k.ball(b, 0.07, pink, 0, -0.83, -0.19, [1, 1, 0.4]);
      for (const x of [-0.09, 0, 0.09]) k.ball(b, 0.03, pink, x, -0.73, -0.19, [1, 1, 0.4]);
    }
    boots(k, black, { h: 0.12 });
    for (const [b] of LEGS) for (const x of [-0.12, 0, 0.12]) k.ball(b, 0.04, pink, x, -0.76, -0.27, [1, 0.7, 0.6]);
    // 背後一支竹（熊貓最鍾意食！）
    onBack(k, 0.05, 1.42, 0.3, 0.35, () => {
      k.cyl('torso', 0.05, 0.055, 1.15, tex(T.stripes([0x7cb342, 0x8bc34a], 8, 'v')), 0, 0, 0);
      for (const y of [-0.35, 0, 0.35]) k.cyl('torso', 0.058, 0.058, 0.03, mat(0x558b2f), 0, y, 0);
      for (const [y, r] of [[0.5, 0.6], [0.42, -0.7], [0.58, -0.2]]) k.box('torso', 0.05, 0.26, 0.012, mat(0x66bb6a), Math.sin(r) * 0.12, y, 0, [0, 0, r], 0.4);
    });
  },
};

// ---------------- 🚀 Astronaut：太空衣（棉格）、頭盔 + 金色面罩、心口控制盒、維生背包、喉管、天線 ----------------
OUTFITS.astronaut = {
  body: {
    shirt: { map: T.quilt(0xf2f4f5, 0xb0bec5) }, sleeve: { map: T.quilt(0xf2f4f5, 0xb0bec5) },
    pants: { map: T.quilt(0xf2f4f5, 0xb0bec5) }, shoes: { c: 0xcfd8dc }, skin: { c: SKIN },
  },
  face: { brows: 0x5d4037 },
  build(k) {
    const shell = mat(0xf7f9fa, { roughness: 0.35 });
    const grey = mat(0x90a4ae, { roughness: 0.5 });
    const blue = mat(0x1e88e5, { roughness: 0.4 });
    const dark = mat(0x37474f);
    // 頭盔：殼 + 前面窗框 + 金色反光面罩（睇到個樣）
    k.box('head', 0.9, 0.2, 0.9, shell, 0, 0.37, 0);
    k.box('head', 0.9, 0.9, 0.14, shell, 0, 0, 0.38);
    for (const s of [-1, 1]) {
      k.box('head', 0.13, 0.9, 0.9, shell, s * 0.385, 0, 0);
      k.cyl('head', 0.15, 0.15, 0.06, grey, s * 0.46, 0.02, 0.02, [0, 0, PI / 2], 16);
      k.cyl('head', 0.1, 0.1, 0.07, blue, s * 0.465, 0.02, 0.02, [0, 0, PI / 2], 16);
    }
    k.box('head', 0.9, 0.14, 0.1, shell, 0, 0.3, -0.4);
    k.box('head', 0.9, 0.18, 0.1, shell, 0, -0.33, -0.4);
    k.box('head', 0.68, 0.48, 0.03, mat(0xffcc80, { transparent: true, opacity: 0.32, metalness: 0.9, roughness: 0.05, depthWrite: false }), 0, -0.02, -0.43);
    k.box('head', 0.08, 0.06, 0.06, glow(0xfff59d, 1.8), 0.3, 0.38, -0.42);
    // 頸圈
    k.cyl('torso', 0.4, 0.42, 0.1, blue, 0, 1.83, 0, null, 20);
    // 心口控制盒 + 掣（會閃）
    k.box('torso', 0.44, 0.26, 0.1, grey, 0, 1.5, -0.27);
    k.box('torso', 0.38, 0.06, 0.02, mat(0x263238), 0, 1.56, -0.325);
    const blink = [glowF(0xff5252, 2), glowF(0x69f0ae, 2), glowF(0xffd740, 2)];
    blink.forEach((m, i) => k.box('torso', 0.06, 0.06, 0.03, m, -0.12 + i * 0.12, 1.44, -0.33, null, 0.3));
    k.cyl('torso', 0.035, 0.035, 0.03, dark, 0.15, 1.56, -0.33, [PI / 2, 0, 0]);
    k.front('torso', 0.18, 0.18, decal(T.DECALS.mission()), -0.24, 1.72, -0.233);
    // 喉管：心口去背包
    for (const s of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.16, 1.47, -0.3), new THREE.Vector3(s * 0.4, 1.32, -0.22), new THREE.Vector3(s * 0.45, 1.3, 0.1), new THREE.Vector3(s * 0.36, 1.4, 0.32)]);
      k.add('torso', G(`hose${s}`, () => new THREE.TubeGeometry(curve, 16, 0.03, 6, false)), dark);
    }
    // 皮帶 + 工具袋
    belt(k, grey, mat(0xb0bec5, { metalness: 0.6, roughness: 0.3 }));
    for (const s of [-1, 1]) k.box('torso', 0.14, 0.16, 0.1, grey, s * 0.34, 0.95, -0.2);
    // 維生背包：大盒、散熱槽、兩個氧氣樽、燈、天線
    k.box('torso', 0.76, 0.86, 0.32, shell, 0, 1.4, 0.39);
    for (const y of [1.6, 1.52, 1.44]) k.box('torso', 0.4, 0.035, 0.03, dark, 0, y, 0.555, null, 0.3);
    for (const s of [-1, 1]) {
      k.cyl('torso', 0.1, 0.1, 0.72, grey, s * 0.25, 1.36, 0.58, null, 14);
      k.cyl('torso', 0.06, 0.06, 0.06, dark, s * 0.25, 1.75, 0.58, null, 10);
    }
    const lights = [glowF(0x40c4ff, 2), glowF(0x69f0ae, 2)];
    lights.forEach((m, i) => k.box('torso', 0.07, 0.07, 0.03, m, -0.08 + i * 0.16, 1.24, 0.555, null, 0.3));
    k.cyl('torso', 0.012, 0.012, 0.4, dark, 0.27, 2.0, 0.4);
    const tip = glowF(0xff1744, 2.5);
    k.ball('torso', 0.035, tip, 0.27, 2.21, 0.4);
    // 手臂：藍色條、任務徽章；手套 + 靴
    for (const [b, s] of ARMS) {
      k.box(b, 0.36, 0.06, 0.36, blue, 0, -0.18, 0, null, 0.3);
      k.plane(b, 0.19, 0.19, decal(T.DECALS.mission()), s * 0.183, -0.03, 0, [0, s * PI / 2, 0]);
    }
    gloves(k, shell, blue, { big: 0.03 });
    boots(k, shell, { h: 0.3, cuff: blue, sole: grey });
    for (const [b] of LEGS) k.box(b, 0.26, 0.18, 0.06, grey, 0, -0.42, -0.2, null, 0.3);
    k.fx((t) => {
      blink.forEach((m, i) => (m.emissiveIntensity = Math.sin(t * 3 + i * 2.1) > 0.3 ? 2.4 : 0.2));
      lights.forEach((m, i) => (m.emissiveIntensity = 1 + Math.sin(t * 2 + i * PI) * 0.9));
      tip.emissiveIntensity = (t % 1.2) < 0.25 ? 3 : 0.3;
    });
  },
};

// ---------------- 🛡️ Knight：鎖子甲 + 胸甲 + 藍色外袍（腳印紋章）+ 多層膊甲 + 頭盔 + 紅羽毛（會擺）+ 盾 ----------------
OUTFITS.knight = {
  body: {
    shirt: { map: T.chainmail(0xb0bcc5), metal: 0.6, rough: 0.45 }, sleeve: { map: T.chainmail(0xb0bcc5), metal: 0.6, rough: 0.45 },
    pants: { map: T.chainmail(0xa0acb5), metal: 0.6, rough: 0.45 }, shoes: { c: 0x78909c, metal: 0.8, rough: 0.3 }, skin: { c: SKIN },
  },
  face: { hide: true },
  build(k) {
    const steel = tex(T.brushed(0xcfd8dc), { metalness: 0.9, roughness: 0.28 });
    const steelD = tex(T.brushed(0x8a99a3), { metalness: 0.9, roughness: 0.32 });
    const gold = metal(0xffc107, 0.25);
    const blue = tex(T.fabric(0x1565c0, 1.2));
    const black = mat(0x111111);
    // 頭盔
    k.box('head', 0.76, 0.76, 0.76, steel, 0, 0.02, 0, null, 0.15);
    k.box('head', 0.58, 0.06, 0.04, black, 0, 0.06, -0.38, null, 0.3);
    k.box('head', 0.06, 0.34, 0.04, steelD, 0, -0.06, -0.39, null, 0.3);
    for (const x of [0.12, 0.2, 0.28]) for (const y of [-0.14, -0.22]) k.box('head', 0.035, 0.035, 0.03, black, x, y, -0.382, null, 0.4);
    k.box('head', 0.78, 0.045, 0.78, gold, 0, 0.17, 0, null, 0.3);
    k.box('head', 0.08, 0.1, 0.8, gold, 0, 0.4, 0, null, 0.3);
    // 羽毛（會擺）
    const plume = k.group('head', 0, 0.45, 0.05);
    for (let i = 0; i < 6; i++) {
      const a = i * 0.32;
      k.box(plume, 0.09, 0.2, 0.14, mat([0xd50000, 0xff1744, 0xb71c1c][i % 3]), 0, 0.08 + Math.sin(a) * 0.32, Math.sin(a * 0.9) * 0.05 + i * 0.07, [-0.2 - i * 0.25, 0, 0], 0.4);
    }
    k.fx((t, a) => {
      const mv = a ? a.move : 0;
      plume.rotation.x = Math.sin(t * 2.2) * 0.06 - mv * 0.18;
      plume.rotation.z = Math.sin(t * 1.6) * 0.05;
    });
    // 胸甲、背甲、金邊
    k.box('torso', 0.92, 0.74, 0.14, steel, 0, 1.44, -0.17, null, 0.2);
    k.box('torso', 0.92, 0.74, 0.1, steel, 0, 1.44, 0.2, null, 0.2);
    k.box('torso', 0.94, 0.05, 0.5, gold, 0, 1.8, 0, null, 0.3);
    // 藍色外袍 + 紋章 + 金邊
    k.box('torso', 0.56, 1.0, 0.03, blue, 0, 1.27, -0.255);
    k.box('torso', 0.56, 0.95, 0.03, blue, 0, 1.3, 0.262);
    for (const s of [-1, 1]) k.box('torso', 0.03, 1.0, 0.04, gold, s * 0.28, 1.27, -0.257, null, 0.3);
    k.box('torso', 0.58, 0.03, 0.04, gold, 0, 0.775, -0.257, null, 0.3);
    k.front('torso', 0.38, 0.42, decal(T.DECALS.crest()), 0, 1.47, -0.274);
    belt(k, tex(T.leather(0x5d4037)), gold, { y: 0.98, h: 0.1 });
    // 膊甲（三層）+ 手甲 + 鐵手套
    pads(k, steel, { w: 0.5, h: 0.14, y: 0.09, layers: 3, trim: gold });
    for (const [b, s] of ARMS) {
      k.box(b, 0.38, 0.3, 0.38, steel, 0, -0.5, 0);
      k.box(b, 0.2, 0.14, 0.08, steelD, 0, -0.36, 0.19, null, 0.4);
      k.box(b, 0.04, 0.2, 0.2, gold, s * 0.19, -0.5, 0, null, 0.3);
    }
    gloves(k, steelD, steel);
    // 腳甲：大髀、膝蓋、小腿、鐵鞋
    for (const [b] of LEGS) {
      k.box(b, 0.41, 0.28, 0.41, steel, 0, -0.16, 0);
      k.box(b, 0.26, 0.16, 0.1, steel, 0, -0.42, -0.2, null, 0.4);
      k.ball(b, 0.04, gold, 0, -0.42, -0.255);
      k.box(b, 0.42, 0.28, 0.42, steel, 0, -0.62, 0);
    }
    boots(k, steelD, { h: 0.1, toe: steel });
    for (const [b] of LEGS) for (const z of [-0.12, -0.2]) k.box(b, 0.44, 0.03, 0.04, steelD, 0, -0.76, z, null, 0.4);
    // 盾（背後）
    k.box('torso', 0.64, 0.78, 0.07, steelD, 0, 1.36, 0.3, null, 0.15);
    k.box('torso', 0.58, 0.72, 0.03, blue, 0, 1.36, 0.34);
    k.plane('torso', 0.5, 0.6, decal(T.DECALS.crest()), 0, 1.36, 0.358);
  },
};

// ---------------- ⭐ Golden Hero：金色六角紋戰衣、發光星章、紅披風、眼罩、金頭箍（小翼）、金靴（小翼）----------------
OUTFITS.golden = {
  body: {
    shirt: { map: T.hexes(0xf2b705, 0xffe57f), metal: 0.75, rough: 0.28 }, sleeve: { map: T.hexes(0xf2b705, 0xffe57f), metal: 0.75, rough: 0.28 },
    pants: { map: T.brushed(0xd99a00), metal: 0.8, rough: 0.3 }, shoes: { c: 0xffb300, metal: 0.8, rough: 0.25 }, skin: { c: SKIN },
  },
  face: { brows: 0x8d6e00 },
  build(k) {
    const gold = tex(T.brushed(0xffc107), { metalness: 0.9, roughness: 0.22, emissive: 0x6d4c00, emissiveIntensity: 0.25 });
    const crimson = tex(T.fabric(0xb71c1c));
    const ivory = mat(0xfff8e1, { metalness: 0.3, roughness: 0.3 });
    const starM = glowF(0xfff176, 1.0, { metalness: 0.6 });
    // 金色頭髮（尖尖）
    const hairM = mat(0xffe082, { roughness: 0.5 });
    hair(k, hairM, { fringe: false });
    for (const [x, z, r] of [[-0.2, -0.15, -0.3], [0, -0.2, 0], [0.2, -0.15, 0.3], [-0.12, 0.12, -0.2], [0.14, 0.14, 0.2]]) k.cone('head', 0.11, 0.24, hairM, x, 0.45, z, [-0.3, 0, r], 4);
    // 頭箍 + 紅寶石 + 兩邊小翼
    k.box('head', 0.7, 0.06, 0.7, gold, 0, 0.23, 0, null, 0.3);
    k.gem('head', 0.06, glow(0xff1744, 1.4), 0, 0.24, -0.36, null, [1, 1.4, 0.6]);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.box('head', 0.03, 0.16 - i * 0.03, 0.06, ivory, s * (0.37 + i * 0.015), 0.32 + i * 0.03, 0.05 + i * 0.07, [-0.6, 0, s * -0.3], 0.3);
    // 眼罩（露眼）
    const maskM = mat(0x8e1b1b);
    k.box('head', 0.62, 0.05, 0.03, maskM, 0, 0.155, -0.345, null, 0.3);
    k.box('head', 0.6, 0.04, 0.03, maskM, 0, -0.045, -0.345, null, 0.3);
    for (const s of [-1, 1]) k.box('head', 0.08, 0.17, 0.03, maskM, s * 0.27, 0.06, -0.345, [0, 0, s * 0.2], 0.3);
    k.box('head', 0.07, 0.12, 0.03, maskM, 0, 0.07, -0.345, null, 0.3);
    // 心口：紅色圓底 + 發光金星
    k.cyl('torso', 0.22, 0.22, 0.03, crimson, 0, 1.5, -0.235, [PI / 2, 0, 0], 24);
    k.torus('torso', 0.22, 0.02, gold, 0, 1.5, -0.25);
    k.star('torso', 0.16, starM, 0, 1.5, -0.265);
    for (const s of [-1, 1]) k.box('torso', 0.02, 0.36, 0.02, metal(0xb07d00, 0.35), s * 0.12, 1.13, -0.232);
    k.box('torso', 0.3, 0.02, 0.02, metal(0xb07d00, 0.35), 0, 1.15, -0.232);
    // 紅皮帶 + 星扣
    belt(k, crimson, null, { h: 0.11 });
    k.cyl('torso', 0.08, 0.08, 0.04, gold, 0, 0.97, -0.26, [PI / 2, 0, 0], 16);
    k.star('torso', 0.06, starM, 0, 0.97, -0.285, null, 0.02);
    // 金膊甲 + 紅披風（金邊）
    pads(k, gold, { w: 0.47, h: 0.13, layers: 2, trim: crimson });
    cape(k, crimson, { trim: gold, collar: gold, h: 1.42 });
    // 金手套（紅袖口 + 小鰭）+ 金靴（紅邊 + 小翼）
    gloves(k, gold, crimson);
    for (const [b, s] of ARMS) k.box(b, 0.03, 0.2, 0.12, gold, s * 0.2, -0.56, 0.06, [0.3, 0, 0], 0.3);
    boots(k, gold, { h: 0.34, cuff: crimson });
    for (const [b, s] of LEGS) for (let i = 0; i < 3; i++) k.box(b, 0.03, 0.12 - i * 0.025, 0.05, ivory, s * (0.215 + i * 0.01), -0.62 + i * 0.03, 0.12 + i * 0.05, [-0.7, 0, 0], 0.3);
    particles(k, { n: 18, colors: [0xfff59d, 0xffd54f, 0xffffff], mode: 'spark', speed: 0.6, size: 0.1 });
    k.fx((t) => (starM.emissiveIntensity = 0.9 + Math.sin(t * 2.5) * 0.45));
  },
};

// ---------------- 🌈 Rainbow Legend：會流動嘅彩虹衫、珍珠白背心、彩虹光環、彩虹大翼（會拍）、雲靴、彩虹粒子 ----------------
OUTFITS.rainbow = {
  body: {
    shirt: { map: T.rainbow(), em: 0xffffff, emMap: T.rainbow(), ei: 0.25 }, sleeve: { map: T.fabric(0xf7f4ff, 0.8), rough: 0.35 },
    pants: { map: T.starfield(0x1e1450, [0x4527a0, 0x283593], ['#ffffff', '#ffd6ff'], 50) }, shoes: { c: 0xffffff }, skin: { c: SKIN },
  },
  face: { brows: 0xeeeeee },
  build(k, { avatar }) {
    const pearl = mat(0xfbf8ff, { roughness: 0.3, metalness: 0.2 });
    const gold = metal(0xffd54f, 0.25);
    const rb = glowF(0xffffff, 0.9, { map: T.rainbow(), emissiveMap: T.rainbow() });
    // 白金色頭髮（尖）
    const hairM = mat(0xf5f5f5, { roughness: 0.4 });
    hair(k, hairM, { fringe: false });
    for (const [x, z, r] of [[-0.18, -0.12, -0.35], [0.02, -0.18, 0], [0.2, -0.1, 0.35], [0, 0.15, 0]]) k.cone('head', 0.1, 0.22, hairM, x, 0.44, z, [-0.4, 0, r], 4);
    // 彩虹光環（浮喺頭頂、慢慢轉）
    const halo = k.group('head', 0, 0.66, 0);
    k.torus(halo, 0.3, 0.035, rb, 0, 0, 0, [PI / 2, 0, 0]);
    // 珍珠白背心（前面開胸見到彩虹）+ 金邊 + 星扣
    for (const s of [-1, 1]) {
      k.box('torso', 0.26, 0.9, 0.05, pearl, s * 0.3, 1.36, -0.235);
      k.box('torso', 0.03, 0.9, 0.06, gold, s * 0.17, 1.36, -0.237, null, 0.3);
      k.box('torso', 0.16, 0.86, 0.48, pearl, s * 0.36, 1.36, 0);
    }
    k.box('torso', 0.9, 0.9, 0.05, pearl, 0, 1.36, 0.235);
    k.box('torso', 0.96, 0.12, 0.56, pearl, 0, 1.83, 0, null, 0.4);
    belt(k, gold, null, { h: 0.1 });
    k.star('torso', 0.08, glow(0xffffff, 1.2), 0, 0.97, -0.27);
    // 雲咁嘅袖口、手套、靴（彩虹鞋底）
    for (const [b] of ARMS) for (const [x, z] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1], [0, 0]]) k.ball(b, 0.11, pearl, x, -0.62, z);
    gloves(k, pearl, null);
    boots(k, pearl, { h: 0.26 });
    for (const [b] of LEGS) {
      k.box(b, 0.46, 0.06, 0.53, rb, 0, -0.9, -0.035, null, 0.3);
      for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) k.ball(b, 0.1, pearl, x, -0.5, z);
    }
    // 彩虹大翼：一把扇咁嘅羽毛（紅 → 紫），兩層
    const wings = [-1, 1].map((s) => {
      const w = k.group('torso', s * 0.16, 1.62, 0.27);
      for (let layer = 0; layer < 2; layer++) {
        for (let i = 0; i < 7; i++) {
          const th = -0.55 + i * 0.27; // 由斜落去到向上
          const len = (layer ? 0.5 : 0.95) * (1 - Math.abs(i - 4) * 0.07);
          const c = new THREE.Color().setHSL((i / 7) * 0.8, 1, layer ? 0.75 : 0.56).getHex();
          const dx = s * Math.cos(th);
          const dy = Math.sin(th);
          k.box(w, len, 0.13, 0.035, mat(c, { emissive: c, emissiveIntensity: 0.45, roughness: 0.35 }), dx * (len / 2 + 0.05), dy * (len / 2 + 0.05), 0.02 + layer * 0.03, [0, 0, Math.atan2(dy, dx)], 0.45);
        }
      }
      k.ball(w, 0.08, pearl, 0, 0, 0.04);
      return w;
    });
    k.fx((t, a) => {
      const fly = a ? Math.max(a.move, a.air) : 0;
      const f = Math.sin(t * (2 + fly * 6));
      wings.forEach((w, i) => {
        const s = i ? 1 : -1;
        w.rotation.y = s * -(0.6 + f * (0.15 + fly * 0.25));
        w.rotation.z = s * (0.05 + f * 0.06);
      });
      halo.rotation.y = t * 0.8;
      halo.position.y = 0.66 + Math.sin(t * 2) * 0.03;
      const off = (t * 0.15) % 1;
      if (avatar.mats.shirt.map) avatar.mats.shirt.map.offset.x = off;
      T.rainbow().offset.x = off;
    });
    particles(k, { n: 22, mode: 'orbit', rainbow: true, speed: 0.7, size: 0.11, r: [0.95, 0.9, 0.95] });
  },
};

// ---------------- 🏴‍☠️ Pirate Captain：船長紅外套（金鈕、金邊大袖口）、白恤衫花邊、三角帽（船錨）、斜皮帶、望遠鏡、高筒靴、鸚鵡 ----------------
OUTFITS.pirate = {
  body: {
    shirt: { map: T.fabric(0xf3efe6, 0.8) }, sleeve: { map: T.fabric(0x8e1c22, 1.2) },
    pants: { map: T.fabric(0x3e2f25, 1.2) }, shoes: { c: 0x1a1a1a }, skin: { c: SKIN },
  },
  face: { brows: 0x3e2723 },
  build(k) {
    const coat = tex(T.fabric(0x8e1c22, 1.2));
    const coatD = tex(T.fabric(0x6d1218, 1.2));
    const gold = metal(0xffc107, 0.3);
    const black = tex(T.fabric(0x1c1c1c, 1.5));
    const leatherM = tex(T.leather(0x5d4037));
    const white = mat(0xfafafa);
    // 頭髮（長啲、後面紮馬尾）+ 鬍鬚 + 眼罩
    const hairM = mat(0x3e2723);
    hair(k, hairM, { long: true, fringe: false });
    k.box('head', 0.12, 0.3, 0.1, hairM, 0, -0.3, 0.38);
    k.box('head', 0.14, 0.05, 0.12, mat(0xc62828), 0, -0.16, 0.38, null, 0.3);
    for (const s of [-1, 1]) k.box('head', 0.16, 0.05, 0.04, hairM, s * 0.09, -0.1, -0.35, [0, 0, s * 0.25], 0.4);
    k.box('head', 0.17, 0.15, 0.03, mat(0x111111), 0.15, 0.05, -0.36, null, 0.3);
    k.box('head', 0.72, 0.025, 0.02, mat(0x111111), 0, 0.13, -0.35, [0, 0, -0.32], 0.3);
    // 三角帽：帽身 + 三邊向上摺（金邊）+ 船錨
    k.cyl('head', 0.34, 0.37, 0.32, black, 0, 0.5, 0.02, null, 16);
    k.ball('head', 0.34, black, 0, 0.64, 0.02, [1, 0.35, 1]);
    k.cyl('head', 0.78, 0.78, 0.04, black, 0, 0.34, 0.02, [0, PI, 0], 3); // 三角形帽邊（cylinder 3 邊 = 三角，尖向前）
    const corners = [[0, -0.78], [-0.675, 0.39], [0.675, 0.39]].map(([x, z]) => new THREE.Vector2(x, z + 0.02));
    for (let i = 0; i < 3; i++) {
      const p = corners[i];
      const q = corners[(i + 1) % 3];
      const mx = (p.x + q.x) / 2;
      const mz = (p.y + q.y) / 2;
      const len = p.distanceTo(q);
      const nx = mx;
      const nz = mz;
      const ry = Math.atan2(-nx, -nz);
      const roll = [-0.2, 0, 0.2][i]; // 前面嗰個角壓低啲（三角帽嘅樣）
      k.at(mx, 0.47, mz, [0, ry, 0], () => {
        k.at(0, 0, 0, [-0.2, 0, roll], () => {
          k.box('head', len * 0.94, 0.28, 0.05, black, 0, 0, 0, null, 0.3);
          k.box('head', len * 0.94, 0.035, 0.065, gold, 0, 0.14, 0, null, 0.3);
          if (i === 2) k.plane('head', 0.18, 0.18, decal(T.DECALS.anchor(), { metalness: 0.6 }), 0, 0, -0.03, [0, PI, 0]);
        });
      });
    }
    // 紅外套：前面兩幅、側、背、大領、金鈕、後面衫尾
    for (const s of [-1, 1]) {
      k.box('torso', 0.27, 0.92, 0.05, coat, s * 0.31, 1.35, -0.24);
      k.box('torso', 0.035, 0.92, 0.06, gold, s * 0.175, 1.35, -0.242, null, 0.3);
      k.box('torso', 0.06, 0.92, 0.48, coat, s * 0.44, 1.35, 0);
      for (const y of [1.6, 1.42, 1.24]) k.ball('torso', 0.028, gold, s * 0.24, y, -0.27);
      k.box('torso', 0.14, 0.3, 0.06, coatD, s * 0.27, 1.68, -0.25, [0, 0, s * 0.35]);
    }
    k.box('torso', 0.9, 0.92, 0.06, coat, 0, 1.35, 0.235);
    k.box('torso', 0.92, 0.2, 0.1, coatD, 0, 1.84, 0.22, [-0.35, 0, 0]);
    k.box('torso', 0.88, 0.48, 0.05, coat, 0, 0.68, 0.27, [0.14, 0, 0]);
    k.box('torso', 0.9, 0.04, 0.06, gold, 0, 0.45, 0.31, [0.14, 0, 0], 0.3);
    // 白恤衫花邊
    for (const [y, w] of [[1.7, 0.24], [1.6, 0.21], [1.5, 0.17]]) k.box('torso', w, 0.1, 0.06, white, 0, y, -0.25, [0.25, 0, 0], 0.4);
    // 紅白腰帶（打結）+ 斜皮帶 + 望遠鏡
    const sash = tex(T.stripes([0xc62828, 0xe53935, 0xfafafa], 6));
    k.box('torso', 0.92, 0.16, 0.52, sash, 0, 1.0, 0, null, 0.15);
    k.box('torso', 0.14, 0.14, 0.08, sash, -0.3, 0.99, -0.27);
    k.box('torso', 0.08, 0.3, 0.03, sash, -0.33, 0.8, -0.275, [0, 0, -0.15]);
    k.box('torso', 0.1, 1.15, 0.03, leatherM, 0, 1.35, -0.275, [0, 0, -0.62]);
    k.box('torso', 0.13, 0.11, 0.035, gold, 0, 1.35, -0.29, [0, 0, -0.62], 0.3);
    k.cyl('torso', 0.035, 0.045, 0.32, gold, 0.3, 0.95, -0.29, [0, 0, 1.25]);
    // 袖：金邊大袖口 + 白花邊
    for (const [b] of ARMS) {
      k.box(b, 0.4, 0.2, 0.4, coatD, 0, -0.58, 0);
      k.box(b, 0.41, 0.035, 0.41, gold, 0, -0.47, 0, null, 0.3);
      k.box(b, 0.36, 0.06, 0.36, white, 0, -0.7, 0, null, 0.4);
    }
    // 高筒靴（摺邊 + 金扣）
    boots(k, black, { h: 0.48, cuff: leatherM });
    for (const [b] of LEGS) k.box(b, 0.12, 0.08, 0.03, gold, 0, -0.55, -0.215, null, 0.3);
    // 🦜 鸚鵡（企喺膊頭，點頭、拍翼）
    const bird = k.group('torso', -0.4, 1.88, 0.05);
    const red = mat(0xe53935);
    k.box(bird, 0.17, 0.22, 0.16, red, 0, 0.1, 0, [0.2, 0, 0], 0.35);
    k.box(bird, 0.06, 0.24, 0.04, mat(0x1e88e5), 0, -0.04, 0.12, [0.6, 0, 0], 0.3);
    const head = k.group(bird, 0, 0.24, -0.03);
    k.box(head, 0.14, 0.13, 0.14, red, 0, 0.04, 0, null, 0.35);
    k.box(head, 0.1, 0.06, 0.02, mat(0xfafafa), 0, 0.05, -0.075, null, 0.3);
    for (const s of [-1, 1]) k.box(head, 0.02, 0.03, 0.02, mat(0x111111), s * 0.072, 0.06, -0.02, null, 0.3);
    k.cone(head, 0.035, 0.08, mat(0xfff3e0), 0, 0.02, -0.1, [-PI / 2 - 0.4, 0, 0], 6);
    const bw = [-1, 1].map((s) => {
      const w = k.group(bird, s * 0.09, 0.16, 0);
      k.box(w, 0.035, 0.18, 0.13, mat(0x1e88e5), 0, -0.07, 0.01, null, 0.3);
      k.box(w, 0.036, 0.06, 0.13, mat(0xfdd835), 0, 0.0, 0.01, null, 0.3);
      return w;
    });
    k.fx((t) => {
      head.rotation.x = Math.max(0, Math.sin(t * 1.3)) * 0.35;
      head.rotation.y = Math.sin(t * 0.7) * 0.5;
      const flap = Math.sin(t * 0.5) > 0.85 ? Math.sin(t * 30) * 0.6 : 0;
      bw[0].rotation.z = -0.05 - Math.abs(flap);
      bw[1].rotation.z = 0.05 + Math.abs(flap);
    });
  },
};

// ---------------- 🧙 Wizard：星星月亮長袍、尖帽（彎）、長白鬍、披風、短披肩、腰帶 + 月亮扣、背後法杖、飄浮魔法書 ----------------
OUTFITS.wizard = {
  body: {
    shirt: { map: T.moonStars(0x3b1c80, 0xffd54f) }, sleeve: { map: T.moonStars(0x3b1c80, 0xffd54f) },
    pants: { map: T.moonStars(0x341a72, 0xffd54f) }, shoes: { c: 0x2a1645 }, skin: { c: SKIN },
  },
  face: { brows: 0xeeeeee },
  build(k) {
    const hatM = tex(T.moonStars(0x4527a0, 0xffd54f));
    const robeD = tex(T.fabric(0x1a237e));
    const gold = metal(0xffb300, 0.3);
    const beard = tex(T.fur(0xf5f5f5, 0xffffff, 0xd0d0d0));
    // 長白鬍 + 白頭髮
    hair(k, beard, { long: true, fringe: false });
    k.box('head', 0.56, 0.42, 0.12, beard, 0, -0.3, -0.34, null, 0.3);
    k.box('head', 0.42, 0.3, 0.1, beard, 0, -0.6, -0.32, null, 0.3);
    k.box('head', 0.2, 0.18, 0.08, beard, 0, -0.82, -0.3, null, 0.3);
    for (const s of [-1, 1]) k.box('head', 0.22, 0.07, 0.07, beard, s * 0.1, -0.1, -0.37, [0, 0, s * -0.2], 0.4);
    // 尖帽：闊邊 + 帽身 + 彎尖 + 金帶 + 星
    k.cyl('head', 0.6, 0.6, 0.04, hatM, 0, 0.34, 0, null, 20);
    k.cyl('head', 0.27, 0.41, 0.48, hatM, 0, 0.6, 0, null, 12);
    k.cyl('head', 0.42, 0.42, 0.08, gold, 0, 0.4, 0, null, 12);
    const starM = glowF(0xffeb3b, 1.6);
    k.star('head', 0.07, starM, 0, 0.4, -0.43, null, 0.03);
    k.at(0, 0.83, 0.01, [0.5, 0, 0], () => {
      k.cone('head', 0.27, 0.5, hatM, 0, 0.2, 0, null, 12);
      k.star('head', 0.07, starM, 0, 0.47, 0, [0, 0, 0.3], 0.03);
    });
    for (const [x, y, z] of [[0.18, 0.62, -0.3], [-0.2, 0.7, -0.25]]) k.star('head', 0.045, starM, x, y, z, [-0.3, 0, 0], 0.02);
    // 短披肩 + 高領 + 披風
    k.box('torso', 1.0, 0.2, 0.56, robeD, 0, 1.74, 0, null, 0.3);
    k.box('torso', 1.02, 0.035, 0.58, gold, 0, 1.635, 0, null, 0.3);
    k.box('torso', 0.9, 0.32, 0.07, tex(T.starfield(0x1a237e, [0x4527a0], ['#ffffff', '#fff59d'], 40)), 0, 1.95, 0.25, [-0.25, 0, 0]);
    cape(k, tex(T.starfield(0x1a237e, [0x4527a0, 0x283593], ['#ffffff', '#fff59d'], 60), { emissive: 0xffffff, emissiveMap: T.starfield(0x1a237e, [], ['#ffffff', '#fff59d'], 60, { glowOnly: true }), emissiveIntensity: 0.5 }), { trim: gold, h: 1.45 });
    // 長袍金邊 + 腰帶 + 月亮扣 + 卷軸 + 袋
    k.box('torso', 0.08, 0.72, 0.02, gold, 0, 1.25, -0.233);
    belt(k, tex(T.fabric(0x6a1b9a)), null);
    k.torus('torso', 0.07, 0.022, glow(0xfff59d, 1.4), 0, 0.97, -0.27, [0, 0, 0.6], PI * 1.3);
    k.cyl('torso', 0.05, 0.05, 0.28, mat(0xfff3e0), -0.32, 0.92, -0.24, [0, 0, 0.25]);
    k.cyl('torso', 0.055, 0.055, 0.04, mat(0xc62828), -0.32, 0.92, -0.24, [0, 0, 0.25]);
    k.box('torso', 0.14, 0.16, 0.1, tex(T.leather(0x6d4c41)), 0.34, 0.93, -0.2);
    // 喇叭袖 + 金邊；長袍腳（金邊、闊啲）
    for (const [b] of ARMS) {
      k.box(b, 0.44, 0.26, 0.44, tex(T.moonStars(0x3b1c80, 0xffd54f)), 0, -0.58, 0);
      k.box(b, 0.45, 0.04, 0.45, gold, 0, -0.7, 0, null, 0.3);
    }
    for (const [b] of LEGS) {
      k.box(b, 0.44, 0.3, 0.44, tex(T.moonStars(0x341a72, 0xffd54f)), 0, -0.58, 0);
      k.box(b, 0.45, 0.04, 0.45, gold, 0, -0.72, 0, null, 0.3);
    }
    boots(k, mat(0x2a1645), { h: 0.06, toe: mat(0x4a148c) });
    // 背後法杖（頂有發光水晶球）
    const orbM = glowF(0xb388ff, 1.8);
    onBack(k, 0.02, 1.35, 0.3, -0.4, () => {
      k.cyl('torso', 0.035, 0.04, 1.6, tex(T.leather(0x6d4c41)), 0, 0, 0, null, 8);
      for (const a of [0, 2.1, 4.2]) k.box('torso', 0.03, 0.2, 0.03, gold, Math.cos(a) * 0.07, 0.86, Math.sin(a) * 0.07, [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4]);
      k.ico('torso', 0.1, orbM, 0, 0.95, 0);
    });
    // 📖 飄浮魔法書
    const book = k.group('root', 0.95, 1.4, -0.15);
    k.box(book, 0.32, 0.4, 0.09, mat(0x6a1b9a), 0, 0, 0, null, 0.2);
    k.box(book, 0.3, 0.37, 0.07, mat(0xfff8e1), 0.015, 0, 0, null, 0.1);
    k.box(book, 0.33, 0.41, 0.02, gold, 0, 0, -0.045, null, 0.15);
    const rune = glowF(0xb388ff, 2);
    k.star(book, 0.07, rune, 0, 0, -0.065, null, 0.015);
    k.fx((t) => {
      book.position.set(0.95, 1.4 + Math.sin(t * 1.6) * 0.1, -0.15);
      book.rotation.set(Math.sin(t * 1.1) * 0.15, -0.5 + Math.sin(t * 0.7) * 0.3, Math.sin(t * 1.3) * 0.1);
      orbM.emissiveIntensity = 1.4 + Math.sin(t * 2.4) * 0.7;
      rune.emissiveIntensity = 1.5 + Math.sin(t * 3) * 0.8;
      starM.emissiveIntensity = 1.3 + Math.sin(t * 2) * 0.4;
    });
    particles(k, { n: 16, colors: [0xb388ff, 0xfff59d, 0xea80fc], mode: 'rise', speed: 0.25, size: 0.09, r: [0.8, 1.1, 0.7] });
  },
};

// ---------------- 🤖 Cyber Ninja：電路板戰衣（會發光）、頭盔 + 發光護目鏡（掃描）、胸甲 + 標誌、兩把光劍、光環、數碼粒子 ----------------
OUTFITS.cyber = {
  body: {
    shirt: { map: T.circuit(0x161a21, 0x00e5ff), em: 0x00e5ff, emMap: T.circuit(0x161a21, 0x00e5ff, { glowOnly: true }), ei: 1.1 },
    sleeve: { map: T.circuit(0x161a21, 0x00e5ff), em: 0x00e5ff, emMap: T.circuit(0x161a21, 0x00e5ff, { glowOnly: true }), ei: 1.1 },
    pants: { map: T.circuit(0x12151b, 0xff4081), em: 0xff4081, emMap: T.circuit(0x12151b, 0xff4081, { glowOnly: true }), ei: 0.9 },
    shoes: { c: 0x0b0d10 }, skin: { c: SKIN },
  },
  face: { brows: 0x111111, hideBrows: true },
  build(k, { avatar }) {
    const gun = tex(T.brushed(0x37474f), { metalness: 0.85, roughness: 0.35 });
    const dark = mat(0x1c2228, { metalness: 0.6, roughness: 0.4 });
    const cyan = glowF(0x00e5ff, 2);
    const pink = glowF(0xff4081, 2);
    // 頭盔 + 護目鏡 + 面罩 + 耳機 + 頂上發光鰭
    k.box('head', 0.74, 0.2, 0.74, gun, 0, 0.3, 0);
    k.box('head', 0.74, 0.66, 0.07, gun, 0, -0.01, 0.35);
    for (const s of [-1, 1]) {
      k.box('head', 0.06, 0.66, 0.72, dark, s * 0.355, -0.01, 0);
      k.box('head', 0.09, 0.3, 0.3, gun, s * 0.38, 0.02, 0, null, 0.3);
      k.cyl('head', 0.09, 0.09, 0.02, cyan, s * 0.43, 0.02, 0, [0, 0, PI / 2], 16);
    }
    k.box('head', 0.74, 0.16, 0.05, cyan, 0, 0.06, -0.36, null, 0.3);
    const scan = k.group('head', 0, 0.06, -0.39);
    k.box(scan, 0.06, 0.14, 0.02, glow(0xffffff, 3), 0, 0, 0, null, 0.3);
    k.box('head', 0.73, 0.27, 0.06, dark, 0, -0.19, -0.35);
    for (const y of [-0.14, -0.2, -0.26]) k.box('head', 0.3, 0.02, 0.02, pink, 0, y, -0.383, null, 0.4);
    for (let i = 0; i < 4; i++) k.box('head', 0.04, 0.1 + (i === 1 || i === 2 ? 0.05 : 0), 0.14, cyan, 0, 0.42 + (i === 1 || i === 2 ? 0.02 : 0), -0.24 + i * 0.16, null, 0.3);
    k.cyl('head', 0.012, 0.012, 0.32, dark, 0.3, 0.52, 0.18);
    k.ball('head', 0.035, pink, 0.3, 0.69, 0.18);
    // 胸甲：V 字光線 + 標誌 + 腹甲
    k.box('torso', 0.72, 0.5, 0.08, gun, 0, 1.55, -0.25, null, 0.2);
    for (const s of [-1, 1]) k.box('torso', 0.03, 0.42, 0.02, cyan, s * 0.17, 1.55, -0.296, [0, 0, s * 0.45], 0.4);
    k.front('torso', 0.2, 0.2, decal(T.DECALS.cyberLogo(), { emissive: 0xffffff, emissiveMap: T.DECALS.cyberLogo(), emissiveIntensity: 1.5 }), 0, 1.52, -0.296);
    for (const y of [1.2, 1.07]) for (const s of [-1, 1]) k.box('torso', 0.2, 0.1, 0.04, dark, s * 0.12, y, -0.235, null, 0.3);
    belt(k, dark, cyan, { h: 0.1 });
    for (const s of [-1, 1]) k.box('torso', 0.12, 0.14, 0.1, gun, s * 0.33, 0.96, -0.2);
    // 膊甲（粉紅光邊）
    pads(k, gun, { w: 0.46, h: 0.15, trim: pink });
    // 手甲 + 全息屏 + 手套（發光指節）
    const holo = mat(0x18ffff, { transparent: true, opacity: 0.45, emissive: 0x18ffff, emissiveIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
    for (const [b, s] of ARMS) {
      k.box(b, 0.39, 0.34, 0.39, gun, 0, -0.52, 0);
      k.box(b, 0.4, 0.025, 0.4, cyan, 0, -0.37, 0, null, 0.3);
      k.plane(b, 0.22, 0.16, holo, s * 0.23, -0.5, 0, [0, s * PI / 2, 0]);
    }
    gloves(k, mat(0x0f1215), null);
    for (const [b] of ARMS) k.box(b, 0.3, 0.025, 0.02, cyan, 0, -0.76, -0.195, null, 0.4);
    // 膝甲 + 靴（發光鞋底）
    for (const [b] of LEGS) {
      k.box(b, 0.3, 0.2, 0.08, gun, 0, -0.4, -0.21, null, 0.3);
      k.box(b, 0.06, 0.06, 0.02, pink, 0, -0.4, -0.255, null, 0.4);
    }
    boots(k, mat(0x0f1215), { h: 0.3, cuff: gun });
    for (const [b] of LEGS) k.box(b, 0.46, 0.04, 0.53, cyan, 0, -0.9, -0.035, null, 0.3);
    // 背後兩把光劍（交叉）
    for (const [rz, bm] of [[0.55, cyan], [-0.55, pink]]) {
      onBack(k, 0, 1.38, 0.3, rz, () => {
        k.box('torso', 0.06, 0.26, 0.06, mat(0x111111), 0, -0.48, 0);
        k.box('torso', 0.14, 0.03, 0.1, gun, 0, -0.34, 0, null, 0.3);
        k.box('torso', 0.045, 0.9, 0.02, bm, 0, 0.12, 0, null, 0.4);
      });
    }
    // 腰間光環（轉）
    const ring = k.group('root', 0, 1.1, 0);
    k.torus(ring, 0.68, 0.012, basic(0x18ffff, 0.7), 0, 0, 0, [PI / 2, 0, 0]);
    k.torus(ring, 0.74, 0.008, basic(0xff4081, 0.6), 0, 0.04, 0, [PI / 2, 0, 0], PI * 1.2);
    k.fx((t) => {
      const p = 0.5 + 0.5 * Math.sin(t * 2.4);
      avatar.mats.shirt.emissiveIntensity = 0.7 + p * 0.9;
      avatar.mats.sleeve.emissiveIntensity = 0.7 + p * 0.9;
      avatar.mats.pants.emissiveIntensity = 0.6 + (1 - p) * 0.7;
      cyan.emissiveIntensity = 1.6 + p;
      pink.emissiveIntensity = 1.6 + (1 - p);
      scan.position.x = Math.sin(t * 2.2) * 0.3;
      ring.rotation.y = t * 1.4;
      ring.position.y = 1.1 + Math.sin(t * 1.3) * 0.12;
    });
    particles(k, { n: 14, colors: [0x18ffff, 0xff4081], mode: 'rise', speed: 0.3, size: 0.07, r: [0.7, 1.0, 0.6] });
  },
};

// ---------------- 🐉 Dragon Rider：龍鱗胸甲、龍頭盔（角 + 牙）、尖刺膊甲、皮帶交叉、龍眼護身符、龍翼（會拍）、火星 ----------------
OUTFITS.dragon = {
  body: {
    shirt: { map: T.scales(0xb71c1c, 0xef5350, 0x3a0000) }, sleeve: { map: T.leather(0x4e342e) },
    pants: { map: T.leather(0x3e2723) }, shoes: { c: 0x2b1a14 }, skin: { c: SKIN },
  },
  face: { brows: 0x3e2723 },
  build(k) {
    const scaleM = tex(T.scales(0xb71c1c, 0xef5350, 0x3a0000), { roughness: 0.4, metalness: 0.2 });
    const scaleD = tex(T.scales(0x7f0000, 0xc62828, 0x2a0000), { roughness: 0.4, metalness: 0.2 });
    const ivory = mat(0xfff3d6, { roughness: 0.4 });
    const leatherM = tex(T.leather(0x5d4037));
    const gold = metal(0xffc107, 0.3);
    const amber = glowF(0xffab00, 1.8);
    // 龍頭盔：頂、後、兩邊護面、眉骨、龍嘴（牙）、角、背脊
    k.box('head', 0.76, 0.22, 0.76, scaleM, 0, 0.3, 0);
    k.box('head', 0.76, 0.62, 0.08, scaleM, 0, 0.02, 0.36);
    for (const s of [-1, 1]) k.box('head', 0.06, 0.42, 0.5, scaleM, s * 0.37, 0.02, 0.1);
    k.box('head', 0.78, 0.08, 0.12, scaleD, 0, 0.2, -0.35);
    k.box('head', 0.44, 0.14, 0.26, scaleM, 0, 0.3, -0.48);
    for (const s of [-1, 1]) {
      k.box('head', 0.05, 0.03, 0.02, mat(0x111111), s * 0.1, 0.33, -0.612, null, 0.4);
      k.gem('head', 0.05, amber, s * 0.17, 0.26, -0.42, null, [1.4, 0.8, 0.6]);
      for (const x of [0.06, 0.15]) k.cone('head', 0.022, 0.07, ivory, s * x, 0.21, -0.58, [PI, 0, 0], 5);
      k.at(s * 0.28, 0.42, 0.12, [-0.7, 0, s * -0.5], () => {
        k.cone('head', 0.075, 0.24, ivory, 0, 0.1, 0, null, 6);
        k.cone('head', 0.05, 0.2, ivory, 0, 0.27, 0.06, [0.6, 0, 0], 6);
      });
    }
    for (let i = 0; i < 4; i++) k.cone('head', 0.05, 0.14, scaleD, 0, 0.44 - i * 0.02, -0.15 + i * 0.16, [-0.3, 0, 0], 4);
    // 皮帶交叉 + 金環 + 皮帶 + 龍眼護身符
    for (const s of [-1, 1]) k.box('torso', 0.09, 1.0, 0.03, leatherM, 0, 1.38, -0.237, [0, 0, s * 0.62]);
    k.torus('torso', 0.06, 0.02, gold, 0, 1.38, -0.252);
    belt(k, leatherM, null);
    k.box('torso', 0.16, 0.16, 0.04, gold, 0, 0.97, -0.26, [0, 0, PI / 4], 0.25);
    k.gem('torso', 0.06, amber, 0, 0.97, -0.285, null, [0.7, 1.2, 0.5]);
    // 背脊尖刺
    for (let i = 0; i < 5; i++) k.cone('torso', 0.05, 0.16, ivory, 0, 1.75 - i * 0.18, 0.24, [PI / 2 + 0.3, 0, 0], 4);
    // 尖刺膊甲 + 護腕 + 爪手套
    pads(k, scaleM, { w: 0.48, h: 0.15, layers: 2, trim: gold });
    for (const [b, s] of ARMS) {
      k.cone(b, 0.06, 0.2, ivory, s * 0.12, 0.2, -0.08, [0, 0, s * -0.4], 5);
      k.cone(b, 0.05, 0.16, ivory, s * 0.16, 0.18, 0.1, [0, 0, s * -0.6], 5);
      k.box(b, 0.38, 0.3, 0.38, scaleD, 0, -0.5, 0);
      k.box(b, 0.03, 0.18, 0.18, ivory, s * 0.2, -0.5, 0.04, [0.4, 0, 0], 0.3);
    }
    gloves(k, leatherM, gold);
    for (const [b] of ARMS) for (const x of [-0.12, -0.04, 0.04, 0.12]) k.cone(b, 0.022, 0.07, ivory, x, -0.97, -0.15, [PI, 0, 0], 5);
    // 靴：鱗片護膝 + 爪
    boots(k, leatherM, { h: 0.34, cuff: scaleD });
    for (const [b] of LEGS) {
      k.box(b, 0.36, 0.2, 0.1, scaleM, 0, -0.38, -0.2, null, 0.3);
      for (const x of [-0.12, 0, 0.12]) k.cone(b, 0.035, 0.1, ivory, x, -0.86, -0.32, [-PI / 2, 0, 0], 5);
    }
    // 龍翼（膜 + 骨）
    const memb = mat(0xc62828, { side: THREE.DoubleSide, transparent: true, opacity: 0.92, emissive: 0x5a0000, emissiveIntensity: 0.4, roughness: 0.6 });
    const bone = mat(0x4a0000);
    const wings = [-1, 1].map((s) => {
      const w = k.group('torso', s * 0.16, 1.66, 0.27);
      const pts = [[0, 0.05], [0.55, 0.42], [1.05, 0.25], [0.88, -0.1], [0.7, -0.05], [0.58, -0.38], [0.36, -0.22], [0.2, -0.45], [0, -0.2]];
      const shp = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * s, y)));
      k.add(w, G(`dwing${s}`, () => new THREE.ShapeGeometry(shp)), memb);
      for (const [x, y] of [[0.55, 0.42], [1.05, 0.25], [0.88, -0.1], [0.58, -0.38], [0.2, -0.45]]) {
        const len = Math.hypot(x, y);
        k.box(w, len, 0.035, 0.035, bone, (x * s) / 2, y / 2, 0, [0, 0, Math.atan2(y, x * s)], 0.3);
      }
      k.cone(w, 0.03, 0.1, ivory, s * 0.55, 0.48, 0, [0, 0, s * -0.6], 4);
      return w;
    });
    k.fx((t, a) => {
      const fly = a ? Math.max(a.move, a.air) : 0;
      const f = Math.sin(t * (1.8 + fly * 5));
      wings.forEach((w, i) => {
        const s = i ? 1 : -1;
        w.rotation.y = s * -(0.55 + f * (0.2 + fly * 0.25));
      });
      amber.emissiveIntensity = 1.4 + Math.sin(t * 2.6) * 0.6;
    });
    particles(k, { n: 12, colors: [0xff6d00, 0xffab00, 0xff3d00], mode: 'rise', speed: 0.35, size: 0.08, r: [0.7, 1.0, 0.7] });
  },
};

// ---------------- 👑 Royal King：紫色皇室花紋外衣、大皇冠（寶石）、紅絲絨披風 + 白貂毛、金鏈勳章、肩帶、鬍鬚、白手套 ----------------
OUTFITS.king = {
  body: {
    shirt: { map: T.damask(0x5e1a8a, 0xffd54f) }, sleeve: { map: T.damask(0x5e1a8a, 0xffd54f) },
    pants: { map: T.fabric(0x2a1440, 1.3) }, shoes: { c: 0x1a1a1a }, skin: { c: SKIN },
  },
  face: { brows: 0x5d4037 },
  build(k) {
    const gold = tex(T.brushed(0xffca28), { metalness: 0.9, roughness: 0.22, emissive: 0x5d4000, emissiveIntensity: 0.25 });
    const velvet = tex(T.fabric(0xb71c1c, 1.4), { roughness: 0.85 });
    const erm = tex(T.ermine());
    const hairM = mat(0x6d4c41);
    // 頭髮 + 鬍鬚
    hair(k, hairM, { fringe: false });
    k.box('head', 0.6, 0.2, 0.08, hairM, 0, -0.26, -0.34, null, 0.3);
    for (const s of [-1, 1]) {
      k.box('head', 0.06, 0.4, 0.2, hairM, s * 0.33, -0.12, -0.24, null, 0.3);
      k.box('head', 0.18, 0.05, 0.05, hairM, s * 0.1, -0.1, -0.36, [0, 0, s * 0.2], 0.4);
    }
    // 皇冠：白貂邊、金冠身、冠尖、寶石、紅絲絨、頂上十字球
    k.cyl('head', 0.42, 0.42, 0.07, erm, 0, 0.36, 0, null, 16);
    k.cyl('head', 0.39, 0.39, 0.15, gold, 0, 0.47, 0, null, 8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2 + PI / 8;
      k.cone('head', 0.07, i % 2 ? 0.16 : 0.24, gold, Math.sin(a) * 0.36, 0.62 + (i % 2 ? 0 : 0.04), -Math.cos(a) * 0.36, null, 4);
      k.ball('head', 0.03, gold, Math.sin(a) * 0.36, i % 2 ? 0.72 : 0.78, -Math.cos(a) * 0.36);
    }
    const gems = [glowF(0xff1744, 1.2), glowF(0x2979ff, 1.2), glowF(0x00e676, 1.2)];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      k.gem('head', 0.05, gems[i % 3], Math.sin(a) * 0.4, 0.47, -Math.cos(a) * 0.4, [0, -a, 0], [1, 1.3, 0.5]);
    }
    k.ball('head', 0.3, velvet, 0, 0.55, 0, [1, 0.6, 1]);
    k.ball('head', 0.05, gold, 0, 0.75, 0);
    k.box('head', 0.03, 0.12, 0.03, gold, 0, 0.84, 0, null, 0.3);
    k.box('head', 0.08, 0.03, 0.03, gold, 0, 0.85, 0, null, 0.3);
    // 披風（紅絲絨 + 白貂毛邊）+ 白貂大領
    const cp = cape(k, velvet, { trim: erm, h: 1.55, w: 0.96, y: 1.86, rest: 0.1 });
    for (const s of [-1, 1]) k.box(cp, 0.08, 1.5, 0.06, erm, s * 0.46, -0.76, 0, null, 0.3);
    k.box('torso', 1.04, 0.2, 0.6, erm, 0, 1.82, 0.02, null, 0.35);
    // 外衣：金鈕、金邊、藍肩帶、金鏈勳章
    k.box('torso', 0.06, 0.8, 0.02, gold, 0, 1.3, -0.232);
    for (const y of [1.6, 1.45, 1.3, 1.15]) k.ball('torso', 0.025, gold, 0.08, y, -0.24);
    k.box('torso', 0.12, 1.08, 0.03, tex(T.fabric(0x1565c0)), 0, 1.36, -0.242, [0, 0, 0.62]);
    for (let i = 0; i <= 8; i++) {
      const a = PI * (0.15 + 0.7 * (i / 8));
      k.torus('torso', 0.025, 0.008, gold, Math.cos(a) * 0.25, 1.75 - Math.sin(a) * 0.3, -0.25, [0, 0, a]);
    }
    k.cyl('torso', 0.09, 0.09, 0.025, gold, 0, 1.43, -0.27, [PI / 2, 0, 0], 20);
    k.front('torso', 0.15, 0.15, decal(T.DECALS.royal()), 0, 1.43, -0.284);
    belt(k, gold, null, { h: 0.1 });
    k.gem('torso', 0.06, gems[0], 0, 0.97, -0.27, null, [1, 1.2, 0.5]);
    // 膊頭泡泡袖 + 白手套（金袖口）+ 黑靴（金邊 + 扣）
    for (const [b] of ARMS) {
      k.box(b, 0.44, 0.2, 0.44, tex(T.damask(0x5e1a8a, 0xffd54f)), 0, 0.0, 0, null, 0.4);
      k.box(b, 0.45, 0.04, 0.45, gold, 0, -0.1, 0, null, 0.3);
    }
    gloves(k, mat(0xfafafa), gold);
    boots(k, tex(T.leather(0x1a1a1a)), { h: 0.32, cuff: gold });
    for (const [b] of LEGS) k.box(b, 0.12, 0.08, 0.03, gold, 0, -0.84, -0.29, null, 0.3);
    k.fx((t) => gems.forEach((g, i) => (g.emissiveIntensity = 0.9 + Math.max(0, Math.sin(t * 1.5 + i * 2)) * 1.4)));
    particles(k, { n: 10, colors: [0xfff59d, 0xffffff], mode: 'spark', speed: 0.45, size: 0.09 });
  },
};

// ---------------- ❄️ Ice Guardian：冰霜盔甲、水晶冠（冰刺）、透明冰胸甲 + 發光雪花、水晶膊頭、冰披風（冰柱邊）、圍住轉嘅冰晶、落雪 ----------------
OUTFITS.ice = {
  body: {
    shirt: { map: T.frost(0x81d4fa, 0x0288d1), metal: 0.3, rough: 0.25 }, sleeve: { map: T.frost(0x81d4fa, 0x0288d1), metal: 0.3, rough: 0.25 },
    pants: { map: T.frost(0x4fc3f7, 0x01579b), metal: 0.3, rough: 0.25 }, shoes: { c: 0x0277bd, metal: 0.5, rough: 0.2 }, skin: { c: 0xe8f6fd },
  },
  face: { brows: 0x81d4fa },
  build(k) {
    const icy = mat(0xb3e5fc, { metalness: 0.5, roughness: 0.15, emissive: 0x4fc3f7, emissiveIntensity: 0.2 });
    const silver = metal(0xe1f5fe, 0.2);
    const crystal = mat(0xb3ecff, { transparent: true, opacity: 0.8, emissive: 0x40c4ff, emissiveIntensity: 0.8, roughness: 0.05, metalness: 0.2 });
    const clear = mat(0xd7f4ff, { transparent: true, opacity: 0.55, emissive: 0x4fc3f7, emissiveIntensity: 0.35, roughness: 0.05, metalness: 0.3, depthWrite: false });
    const flake = decal(T.DECALS.snowflake(), { emissive: 0xffffff, emissiveMap: T.DECALS.snowflake(), emissiveIntensity: 1.6 });
    // 白藍頭髮 + 水晶冠
    hair(k, mat(0xe1f5fe, { roughness: 0.4 }), { fringe: true });
    k.box('head', 0.76, 0.1, 0.76, icy, 0, 0.27, 0, null, 0.3);
    k.box('head', 0.2, 0.12, 0.03, silver, 0, 0.27, -0.39, null, 0.3);
    k.gem('head', 0.06, crystal, 0, 0.27, -0.41, null, [1, 1.2, 0.5]);
    for (const [x, h, z] of [[-0.3, 0.22, -0.2], [-0.16, 0.34, -0.3], [0, 0.48, -0.32], [0.16, 0.34, -0.3], [0.3, 0.22, -0.2], [-0.2, 0.26, 0.15], [0.2, 0.26, 0.15]]) {
      k.gem('head', 0.07, crystal, x, 0.32 + h / 2, z, [0, PI / 4, x * -0.6], [1, h / 0.07 / 2, 1]);
    }
    for (const s of [-1, 1]) k.box('head', 0.05, 0.36, 0.32, clear, s * 0.37, -0.05, -0.05, null, 0.3);
    // 透明冰胸甲 + 雪花 + 銀邊
    k.box('torso', 0.88, 0.62, 0.1, clear, 0, 1.5, -0.2, null, 0.2);
    k.front('torso', 0.3, 0.3, flake, 0, 1.5, -0.256);
    k.box('torso', 0.9, 0.04, 0.5, silver, 0, 1.8, 0, null, 0.3);
    belt(k, silver, null, { h: 0.1 });
    k.gem('torso', 0.07, crystal, 0, 0.97, -0.27, null, [1, 1.3, 0.5]);
    // 水晶膊頭（一嚿嚿冰晶）
    pads(k, icy, { w: 0.46, h: 0.13 });
    for (const [b, s] of ARMS) {
      for (const [x, z, h, r] of [[0.06, 0, 0.32, 0.4], [-0.06, 0.1, 0.22, 0.2], [0.12, -0.1, 0.2, 0.7], [-0.02, -0.12, 0.18, 0.1]]) {
        k.gem(b, 0.06, crystal, s * x, 0.16 + h / 2.4, z, [0, 0, s * -r], [1, h / 0.06 / 2, 1]);
      }
      k.box(b, 0.38, 0.3, 0.38, icy, 0, -0.5, 0);
      k.gem(b, 0.04, crystal, s * 0.2, -0.5, 0, [0, 0, s * -1.2], [1, 2.2, 1]);
    }
    gloves(k, silver, icy);
    boots(k, icy, { h: 0.34, cuff: silver });
    for (const [b, s] of LEGS) k.gem(b, 0.04, crystal, s * 0.22, -0.55, 0, [0, 0, s * -0.9], [1, 2.5, 1]);
    // 冰披風 + 冰柱邊
    const cp = cape(k, mat(0xffffff, { map: T.frost(0x81d4fa, 0x0288d1), transparent: true, opacity: 0.85, roughness: 0.15, metalness: 0.2, side: THREE.DoubleSide }), { collar: silver, h: 1.3 });
    for (let i = 0; i < 7; i++) k.cone(cp, 0.05, 0.14 + (i % 2) * 0.08, crystal, -0.39 + i * 0.13, -1.36 - (i % 2) * 0.04, 0, [PI, 0, 0], 4);
    // 圍住轉嘅冰晶
    const orbit = k.group('root', 0, 1.3, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      k.gem(orbit, 0.09, crystal, Math.cos(a) * 0.95, Math.sin(a * 2) * 0.2, Math.sin(a) * 0.95, [0.3, a, 0], [1, 2, 1]);
    }
    k.fx((t) => {
      orbit.rotation.y = t * 0.9;
      orbit.position.y = 1.3 + Math.sin(t * 1.2) * 0.1;
    });
    particles(k, { n: 20, colors: [0xffffff, 0xb3e5fc], mode: 'fall', speed: 0.22, size: 0.08, c: [0, 1.4, 0], r: [0.9, 1.3, 0.9] });
  },
};

// ---------------- 🌋 Lava Knight：黑曜石盔甲 + 熔岩裂紋（會閃）、全罩頭盔（T 字發光縫）、火焰冠（會跳）、熔岩心核、尖刺膊甲、火焰劍、火星 ----------------
OUTFITS.lava = {
  body: {
    shirt: { map: T.cracks(0x1c1412, 0x2c1d18, 10, 2), em: 0xff5a00, emMap: T.cracks('#000', '#fff', 14, 2.5), ei: 1.6, rough: 0.6 },
    sleeve: { map: T.cracks(0x1c1412, 0x2c1d18, 10, 2), em: 0xff5a00, emMap: T.cracks('#000', '#fff', 14, 2.5), ei: 1.6, rough: 0.6 },
    pants: { map: T.cracks(0x1a1210, 0x2c1d18, 10, 2), em: 0xff3d00, emMap: T.cracks('#000', '#fff', 10, 2), ei: 1.4, rough: 0.6 },
    shoes: { c: 0x1a0f0c }, skin: { c: 0x3e2723 },
  },
  face: { hide: true },
  build(k, { avatar }) {
    const obs = tex(T.brushed(0x221a18), { metalness: 0.7, roughness: 0.35 });
    const obsD = mat(0x120c0a, { metalness: 0.6, roughness: 0.4 });
    const lavaG = glowF(0xff6d00, 2.2);
    const core = glowF(0xffab00, 2.4);
    // 頭盔 + T 字發光縫 + 小角 + 火焰冠
    k.box('head', 0.76, 0.76, 0.76, obs, 0, 0.02, 0, null, 0.15);
    k.box('head', 0.56, 0.055, 0.04, lavaG, 0, 0.06, -0.38, null, 0.3);
    k.box('head', 0.055, 0.26, 0.04, lavaG, 0, -0.08, -0.38, null, 0.3);
    k.box('head', 0.78, 0.05, 0.78, obsD, 0, 0.2, 0, null, 0.3);
    for (const s of [-1, 1]) k.cone('head', 0.06, 0.2, obsD, s * 0.33, 0.42, -0.1, [0, 0, s * -0.5], 5);
    const flame = k.group('head', 0, 0.4, 0.05);
    k.cone(flame, 0.13, 0.4, glow(0xff3d00, 2.4, { transparent: true, opacity: 0.9 }), 0, 0.2, 0, null, 6);
    k.cone(flame, 0.09, 0.32, glow(0xff9100, 2.6), 0, 0.16, -0.03, null, 6);
    k.cone(flame, 0.05, 0.22, glow(0xffe082, 3), 0, 0.11, -0.05, null, 6);
    // 胸甲 + 熔岩心核 + 裂紋
    k.box('torso', 0.9, 0.7, 0.13, obs, 0, 1.46, -0.17, null, 0.2);
    k.torus('torso', 0.13, 0.035, obsD, 0, 1.5, -0.245);
    k.ico('torso', 0.1, core, 0, 1.5, -0.25);
    for (const [x, y, r] of [[-0.25, 1.62, 0.6], [0.26, 1.35, -0.5], [-0.2, 1.3, -0.3], [0.28, 1.68, 0.4]]) k.box('torso', 0.025, 0.2, 0.02, lavaG, x, y, -0.24, [0, 0, r], 0.4);
    belt(k, obsD, lavaG, { h: 0.11 });
    // 尖刺膊甲（發光邊）+ 手甲 + 手套
    pads(k, obs, { w: 0.5, h: 0.16, layers: 2, trim: lavaG });
    for (const [b, s] of ARMS) {
      for (const [x, z, r] of [[0.1, -0.08, 0.3], [0.14, 0.1, 0.5]]) k.cone(b, 0.06, 0.24, obsD, s * x, 0.24, z, [0, 0, s * -r], 5);
      k.box(b, 0.39, 0.32, 0.39, obs, 0, -0.5, 0);
      k.box(b, 0.4, 0.025, 0.4, lavaG, 0, -0.62, 0, null, 0.3);
    }
    gloves(k, obsD, null);
    // 腳甲 + 熔岩鞋底
    for (const [b] of LEGS) {
      k.box(b, 0.41, 0.3, 0.41, obs, 0, -0.18, 0);
      k.box(b, 0.26, 0.16, 0.1, obsD, 0, -0.42, -0.2, null, 0.3);
    }
    boots(k, obs, { h: 0.3, cuff: obsD });
    for (const [b] of LEGS) k.box(b, 0.46, 0.04, 0.53, lavaG, 0, -0.9, -0.035, null, 0.3);
    // 背後火焰劍
    onBack(k, 0.02, 1.4, 0.3, 0.45, () => {
      k.box('torso', 0.07, 0.24, 0.07, obsD, 0, -0.55, 0);
      k.box('torso', 0.24, 0.05, 0.1, obs, 0, -0.42, 0, null, 0.3);
      k.box('torso', 0.1, 0.95, 0.03, lavaG, 0, 0.08, 0, null, 0.3);
      k.cone('torso', 0.07, 0.15, lavaG, 0, 0.62, 0, null, 4);
    });
    k.fx((t) => {
      const p = 0.5 + 0.5 * Math.sin(t * 3);
      for (const key of ['shirt', 'sleeve', 'pants']) avatar.mats[key].emissiveIntensity = 1.1 + p * 1.1;
      lavaG.emissiveIntensity = 1.8 + p * 1.2;
      core.emissiveIntensity = 2 + Math.sin(t * 5) * 0.8;
      flame.scale.set(1 + Math.sin(t * 13) * 0.08, 0.85 + Math.sin(t * 9) * 0.2 + Math.sin(t * 23) * 0.05, 1);
      flame.rotation.z = Math.sin(t * 4) * 0.08;
    });
    particles(k, { n: 20, colors: [0xff6d00, 0xffab00, 0xff3d00], mode: 'rise', speed: 0.4, size: 0.09, r: [0.75, 1.1, 0.7] });
  },
};

// ---------------- 🌌 Galaxy Explorer：星雲太空衣（星星會閃）、泡泡頭盔（金邊 + 天線）、銀色裝甲、星球徽章、噴射背包（火會跳）、小星球圍住轉 ----------------
OUTFITS.galaxy = {
  body: {
    shirt: { map: T.starfield(0x140a3a, [0x5e35b1, 0x1e88e5, 0xd81b60], ['#ffffff', '#e1bee7', '#80d8ff'], 70), em: 0xffffff, emMap: T.starfield(0x140a3a, [], ['#ffffff', '#e1bee7', '#80d8ff'], 70, { glowOnly: true }), ei: 0.8 },
    sleeve: { map: T.starfield(0x140a3a, [0x5e35b1, 0x1e88e5, 0xd81b60], ['#ffffff', '#e1bee7', '#80d8ff'], 70), em: 0xffffff, emMap: T.starfield(0x140a3a, [], ['#ffffff', '#e1bee7', '#80d8ff'], 70, { glowOnly: true }), ei: 0.8 },
    pants: { map: T.starfield(0x0e0830, [0x4527a0, 0x1565c0], ['#ffffff', '#b388ff'], 60) }, shoes: { c: 0xcfd8dc, metal: 0.8, rough: 0.25 }, skin: { c: SKIN },
  },
  face: { brows: 0x4a148c },
  build(k) {
    const silver = tex(T.brushed(0xd5dde3), { metalness: 0.85, roughness: 0.25 });
    const gold = metal(0xffd54f, 0.25);
    const violet = glowF(0xb388ff, 1.6);
    // 紫色頭髮 + 泡泡頭盔 + 金邊 + 天線
    hair(k, mat(0x7e57c2, { roughness: 0.4 }));
    k.box('head', 0.94, 0.94, 0.94, mat(0xd1c4e9, { transparent: true, opacity: 0.22, roughness: 0.02, metalness: 0.4, emissive: 0x7c4dff, emissiveIntensity: 0.25, depthWrite: false }), 0, 0.04, 0, null, 0.48);
    k.torus('head', 0.46, 0.04, gold, 0, -0.38, 0, [PI / 2, 0, 0]);
    k.cyl('head', 0.012, 0.012, 0.3, silver, 0.26, 0.6, 0.1);
    k.star('head', 0.06, violet, 0.26, 0.78, 0.1, null, 0.025);
    // 銀色胸前裝甲 + 側板 + 星球徽章
    for (const s of [-1, 1]) k.box('torso', 0.16, 0.86, 0.5, silver, s * 0.37, 1.36, 0, null, 0.3);
    k.box('torso', 0.9, 0.14, 0.52, silver, 0, 1.76, 0, null, 0.3);
    k.cyl('torso', 0.13, 0.13, 0.025, silver, 0, 1.5, -0.235, [PI / 2, 0, 0], 20);
    k.front('torso', 0.24, 0.24, decal(T.DECALS.planet(), { emissive: 0xffffff, emissiveMap: T.DECALS.planet(), emissiveIntensity: 0.7 }), 0, 1.5, -0.252);
    belt(k, silver, null, { h: 0.1 });
    k.star('torso', 0.07, violet, 0, 0.97, -0.27, null, 0.03);
    // 噴射背包：兩個推進器 + 噴火
    k.box('torso', 0.5, 0.56, 0.16, silver, 0, 1.42, 0.3, null, 0.25);
    const fire = [];
    for (const s of [-1, 1]) {
      k.cyl('torso', 0.12, 0.12, 0.62, silver, s * 0.2, 1.4, 0.42, null, 14);
      k.cyl('torso', 0.125, 0.125, 0.06, gold, s * 0.2, 1.68, 0.42, null, 14);
      k.cone('torso', 0.12, 0.1, mat(0x37474f, { metalness: 0.7 }), s * 0.2, 1.05, 0.42, [PI, 0, 0], 12);
      k.box('torso', 0.08, 0.04, 0.03, violet, s * 0.2, 1.52, 0.55, null, 0.3);
      const f = k.group('torso', s * 0.2, 0.98, 0.42);
      k.cone(f, 0.09, 0.32, basic(0x7c4dff, 0.75), 0, -0.16, 0, [PI, 0, 0], 10);
      k.cone(f, 0.05, 0.2, basic(0x80d8ff, 0.9), 0, -0.1, 0, [PI, 0, 0], 10);
      fire.push(f);
    }
    pads(k, silver, { w: 0.46, h: 0.13, trim: violet });
    gloves(k, silver, violet);
    boots(k, silver, { h: 0.34, cuff: violet });
    // 🪐 小星球 + 月亮圍住轉
    const orbit = k.group('root', 0, 1.5, 0);
    const planet = k.group(orbit, 1.0, 0, 0);
    k.ball(planet, 0.13, mat(0xff8a65, { emissive: 0xff5722, emissiveIntensity: 0.3 }), 0, 0, 0);
    k.torus(planet, 0.2, 0.015, mat(0xffe082, { emissive: 0xffd54f, emissiveIntensity: 0.6 }), 0, 0, 0, [PI / 2 - 0.4, 0, 0]);
    k.ball(orbit, 0.06, mat(0xeceff1, { emissive: 0xb0bec5, emissiveIntensity: 0.4 }), -0.85, 0.3, 0.3);
    k.fx((t, a) => {
      orbit.rotation.y = t * 0.8;
      orbit.position.y = 1.5 + Math.sin(t * 1.1) * 0.15;
      planet.rotation.y = t * 2;
      const boost = a ? Math.max(a.move, a.air) : 0;
      fire.forEach((f, i) => f.scale.set(1, 0.6 + boost * 0.8 + Math.sin(t * 25 + i) * 0.12, 1));
    });
    particles(k, { n: 18, colors: [0xffffff, 0xe1bee7, 0x80d8ff], mode: 'spark', speed: 0.5, size: 0.09, r: [0.9, 1.0, 0.9] });
  },
};

// ---------------- 🌠 Cosmic Meteor Ranger（升級）：星空戰衣（星會閃）+ 分節裝甲、裝甲手腳、多袋腰帶、星光粒子 ----------------
// 頭盔、裂紋、膊頭水晶、披風、細隕石：仍然喺 thirdPerson.js 嘅 buildCosmic（動畫唔變）
OUTFITS.cosmic = {
  body: {
    shirt: { map: T.starfield(0x13235f, [0x283593, 0x1a237e], ['#ffffff', '#80d8ff'], 50), em: 0x80d8ff, emMap: T.starfield(0x13235f, [], ['#ffffff', '#80d8ff'], 50, { glowOnly: true }), ei: 0.7 },
    sleeve: { map: T.starfield(0x13235f, [0x283593, 0x1a237e], ['#ffffff', '#80d8ff'], 50), em: 0x80d8ff, emMap: T.starfield(0x13235f, [], ['#ffffff', '#80d8ff'], 50, { glowOnly: true }), ei: 0.7 },
    pants: { map: T.starfield(0x0c1848, [0x1a237e], ['#ffffff', '#80d8ff'], 40) }, shoes: { c: 0x0b1030 }, skin: { c: 0x1a2a6c },
  },
  face: { hide: true },
  build(k) {
    const navy = tex(T.brushed(0x1a2a6c), { metalness: 0.6, roughness: 0.3 });
    const edge = glow(0x00e5ff, 1.4);
    // 分節腹甲 + 頸圈
    for (const y of [1.24, 1.1]) for (const s of [-1, 1]) {
      k.box('torso', 0.22, 0.11, 0.05, navy, s * 0.13, y, -0.24, null, 0.3);
      k.box('torso', 0.22, 0.015, 0.02, edge, s * 0.13, y - 0.06, -0.262, null, 0.4);
    }
    k.cyl('torso', 0.36, 0.4, 0.08, navy, 0, 1.83, 0, null, 16);
    // 多袋腰帶
    for (const x of [-0.34, -0.2, 0.2, 0.34]) k.box('torso', 0.11, 0.13, 0.08, navy, x, 0.98, -0.22, null, 0.3);
    // 裝甲手（前臂）+ 腳（膝 + 小腿）
    for (const [b] of ARMS) {
      k.box(b, 0.38, 0.26, 0.38, navy, 0, -0.48, 0);
      k.box(b, 0.39, 0.02, 0.39, edge, 0, -0.36, 0, null, 0.3);
    }
    for (const [b] of LEGS) {
      k.box(b, 0.28, 0.18, 0.08, navy, 0, -0.38, -0.21, null, 0.3);
      k.box(b, 0.1, 0.03, 0.02, edge, 0, -0.38, -0.255, null, 0.4);
      k.box(b, 0.42, 0.24, 0.42, navy, 0, -0.62, 0);
    }
    particles(k, { n: 12, colors: [0x80d8ff, 0xffffff, 0xb388ff], mode: 'spark', speed: 0.5, size: 0.08 });
  },
};

// ---------------- 😈 Demonic Ranger（升級）：暗紅鱗片戰衣（發光裂紋）、黑色胸甲 + 尖領、尖刺膊甲、尖刺護腕、爪靴、火星 ----------------
// 角、翼、尾、頭頂細火：仍然喺 demonicRanger.js（飛、火噴射動畫唔變）
OUTFITS.demonic = {
  body: {
    shirt: { map: T.scales(0x5a0f16, 0x8e1c24, 0x1a0306), em: 0xff3d00, emMap: T.cracks('#000', '#fff', 8, 1.5), ei: 0.9 },
    sleeve: { map: T.scales(0x5a0f16, 0x8e1c24, 0x1a0306), em: 0xff3d00, emMap: T.cracks('#000', '#fff', 8, 1.5), ei: 0.9 },
    pants: { map: T.leather(0x1f0a0d) }, shoes: { c: 0x0d0505 }, skin: { c: 0xc62828 },
  },
  face: { brows: 0x1a0a0c },
  build(k, { avatar }) {
    const plate = tex(T.brushed(0x1f0a0d), { metalness: 0.6, roughness: 0.35 });
    const horn = mat(0x2b0d0f, { roughness: 0.4 });
    const ember = glowF(0xff6d00, 2);
    // 胸甲（V 領）+ 尖領 + 發光寶石
    k.box('torso', 0.8, 0.48, 0.08, plate, 0, 1.52, -0.25, null, 0.2);
    for (const s of [-1, 1]) {
      k.box('torso', 0.05, 0.4, 0.03, ember, s * 0.16, 1.55, -0.295, [0, 0, s * 0.5], 0.4);
      k.cone('torso', 0.06, 0.22, horn, s * 0.3, 1.9, -0.05, [0, 0, s * -0.4], 4);
    }
    k.gem('torso', 0.07, ember, 0, 1.4, -0.3, null, [1, 1.4, 0.5]);
    // 尖刺膊甲 + 護腕
    pads(k, plate, { w: 0.48, h: 0.15, layers: 2, trim: ember });
    for (const [b, s] of ARMS) {
      for (const [x, z, h] of [[0.08, -0.1, 0.24], [0.14, 0.08, 0.3], [0.05, 0.14, 0.18]]) k.cone(b, 0.055, h, horn, s * x, 0.2 + h / 2.5, z, [0, 0, s * -0.35], 5);
      k.box(b, 0.38, 0.3, 0.38, plate, 0, -0.5, 0);
      for (const y of [-0.42, -0.56]) k.cone(b, 0.035, 0.12, horn, s * 0.24, y, 0, [0, 0, s * -PI / 2], 4);
    }
    // 爪靴
    boots(k, plate, { h: 0.3, cuff: ember });
    for (const [b] of LEGS) for (const x of [-0.12, 0, 0.12]) k.cone(b, 0.035, 0.12, horn, x, -0.86, -0.32, [-PI / 2, 0, 0], 4);
    k.fx((t) => {
      const p = 0.5 + 0.5 * Math.sin(t * 2.8);
      avatar.mats.shirt.emissiveIntensity = 0.6 + p * 0.8;
      avatar.mats.sleeve.emissiveIntensity = 0.6 + p * 0.8;
      ember.emissiveIntensity = 1.6 + p;
    });
    particles(k, { n: 10, colors: [0xff3d00, 0xff9100], mode: 'rise', speed: 0.35, size: 0.08, r: [0.7, 1.0, 0.6] });
  },
};

// ---------------- 其他（將來新加、未有專屬造型嘅皮膚）：用皮膚記錄嘅顏色砌一套簡單但整齊嘅衫 ----------------
function genericOutfit(skin) {
  const has = (k) => typeof skin[k] === 'number';
  return {
    body: {
      shirt: { map: T.fabric(has('shirt') ? skin.shirt : 0x2e7d32), metal: skin.metal ? 0.7 : 0, rough: skin.metal ? 0.3 : 0.7 },
      sleeve: { map: T.fabric(has('shirt') ? skin.shirt : 0x2e7d32), metal: skin.metal ? 0.7 : 0, rough: skin.metal ? 0.3 : 0.7 },
      pants: { map: T.fabric(has('pants') ? skin.pants : 0x5d4037) }, shoes: { c: has('shoes') ? skin.shoes : 0x3e2723 }, skin: { c: has('skin') ? skin.skin : SKIN },
    },
    face: { brows: 0x4e342e },
    build(k) {
      const hatM = tex(T.fabric(has('hat') ? skin.hat : 0x33691e));
      const shoeM = mat(has('shoes') ? skin.shoes : 0x3e2723);
      const gold = metal(0xffc107, 0.3);
      hair(k, mat(0x5d4037));
      k.box('head', 0.72, 0.18, 0.72, hatM, 0, 0.38, 0);
      k.box('head', 0.6, 0.04, 0.3, hatM, 0, 0.31, -0.45, null, 0.3);
      for (const s of [-1, 1]) k.box('torso', 0.3, 0.1, 0.13, hatM, s * 0.17, 1.81, -0.19, [0, 0, s * -0.3]);
      belt(k, shoeM, gold);
      k.star('torso', 0.07, gold, 0.2, 1.62, -0.25, null, 0.03);
      boots(k, shoeM, { h: 0.24 });
    },
  };
}

// =====================================================================
// 砌一套衫（buildOutfit）同埋將身體物料換做呢款（applyBody）
// =====================================================================
export function hasOutfit(id) {
  return !!OUTFITS[id];
}

export function buildOutfit(avatar, skin) {
  const def = OUTFITS[skin.id] || genericOutfit(skin);
  const parts = { root: avatar.g, head: avatar.head, torso: avatar.torso, armL: avatar.arms[0], armR: avatar.arms[1], legL: avatar.legs[0], legR: avatar.legs[1] };
  const bones = {};
  const groups = [];
  for (const [name, bone] of Object.entries(parts)) {
    const g = new THREE.Group();
    g.name = `outfit:${skin.id}:${name}`;
    bone.add(g);
    bones[name] = g;
    groups.push(g);
  }
  const k = kit(bones);
  def.build(k, { avatar, skin });
  const fx = k.finish();
  return {
    id: skin.id,
    body: def.body,
    face: def.face || {},
    groups,
    setVisible(v) {
      for (const g of groups) g.visible = v;
    },
    animate(t, a, q = 3) {
      for (const fn of fx) fn(t, a, q);
    },
  };
}

// 身體物料：每個公仔自己一份（mats），換皮膚就改晒
const REP = { shirt: [1.7, 1.8], sleeve: [0.7, 1.5], pants: [0.8, 1.6], shoes: [1, 0.4], skin: [1, 1] };
const repCache = new Map();
function repeated(t, rep) {
  if (!t) return null;
  const key = `${t.uuid}|${rep}`;
  if (!repCache.has(key)) {
    const c = t.clone();
    c.repeat.set(rep[0], rep[1]);
    c.needsUpdate = true;
    repCache.set(key, c);
  }
  return repCache.get(key);
}
export function applyBody(mats, body) {
  for (const [key, m] of Object.entries(mats)) {
    const spec = body[key] || body[key === 'sleeve' ? 'shirt' : 'skin'] || {};
    const rep = (spec.rep || [1, 1]).map((v, i) => v * REP[key][i]);
    const map = repeated(spec.map, rep);
    const emMap = repeated(spec.emMap, rep);
    if (m.map !== map || m.emissiveMap !== emMap) m.needsUpdate = true;
    m.map = map;
    m.emissiveMap = emMap;
    m.color.setHex(spec.c ?? 0xffffff);
    m.emissive.setHex(spec.em ?? 0x000000);
    m.emissiveIntensity = spec.ei ?? 1;
    m.metalness = spec.metal ?? 0;
    m.roughness = spec.rough ?? 0.7;
  }
}
