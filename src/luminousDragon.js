// 🐉 Luminous God Dragon（小朋友 Issue #16：⭐ Special's Stall 200 🤠 Tame Tokens；$/秒 = 你最勁嗰隻寵物 ×1.2）
// Issue #17（小朋友：「graphics should be better」）：成隻重做，照參考圖 ——
//   好長嘅方塊東方龍（22 節身，越近尾越幼）、紫色身 + 每節兩邊一層層發光嘅粉紅／白色月牙紋（一波波咁閃）、
//   背脊一排紫色尖刺（發光尖）、頭有鼻樑脊、鹿角、發白光嘅眼、上下兩排白牙、分叉脷、會飄嘅長龍鬚、
//   尾有發光月牙尾鰭、兩條紫色能量帶螺旋咁圍住個身轉、閃電、細細粒星星、成條龍有一圈淡淡嘅光暈、頭頂一個新月
// 全部面向 -z（頭喺 -z，尾喺 +z）；回傳 Group：userData.animate(time, moving)、userData.height、userData.move = 'fly'
// 身體一節節跟住波浪郁（好似喺天上游水），飛得快啲波浪快啲
// 效能：每節 / 個頭 / 每隻腳嘅唔郁零件用 bake() 焊埋（同物料 = 1 個 mesh），物料全部共用；
//   特效（能量帶、閃電、星星、光暈）每隻龍各 1 個 draw call，點數有上限
// 🐎 馬鞍（saddle.js）由上面射線搵背脊：尖刺、發光紋、特效全部 noSaddle，只會撞到身；有馬鞍嗰節嘅尖刺會收埋

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const PI = Math.PI;
const N = 22; // 幾多節身
const GAP = 0.3; // 每節距離
const kOf = (i) => 1 - Math.pow(i / (N - 1), 1.15) * 0.72; // 每節粗幼（1 = 頸，越近尾越幼）

// ---------- 顏色 ----------
const C = {
  body: new THREE.Color(0x5a1fae),
  body2: new THREE.Color(0x40128a),
  plate: new THREE.Color(0x2c0a66), // 背脊深色鱗片
  belly: new THREE.Color(0xc7a6ff),
  belly2: new THREE.Color(0xa780f5),
  horn: new THREE.Color(0xeedcff),
  hornDark: new THREE.Color(0xb48cf0),
  claw: new THREE.Color(0xf6ecff),
  // 發光（乘埋物料嘅亮度，> 1 先會有 Bloom）
  pink: new THREE.Color(1.0, 0.22, 0.82),
  white: new THREE.Color(1.0, 0.94, 1.0),
  violet: new THREE.Color(0.72, 0.36, 1.0),
  eye: new THREE.Color(1.6, 1.6, 1.7),
  // 口（唔發光）
  mouth: new THREE.Color(0x26052f),
  tooth: new THREE.Color(0xfbf6ff),
  tongue: new THREE.Color(0xff4f9e),
  gum: new THREE.Color(0x8a1458),
};

// ---------- 物料（全部共用）----------
const MAT = {
  hide: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.08, emissive: 0x2a0a5e, emissiveIntensity: 0.6 }),
  spike: new THREE.MeshStandardMaterial({ color: 0x6a1fd6, emissive: 0x8e24ff, emissiveIntensity: 0.85, roughness: 0.35, flatShading: true }),
  flat: new THREE.MeshBasicMaterial({ vertexColors: true }), // 口入面、牙、脷
  // 發光紋分 3 組，輪流閃 → 一波波咁由頭行去尾
  glow: [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ vertexColors: true })),
  glowHead: new THREE.MeshBasicMaterial({ vertexColors: true }),
  whisker: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 0.42, 1.15) }), // 龍鬚（冇焊，唔用頂點顏色）
  moon: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.55, 1.8) }),
  ribbon: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  bolt: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.05, 2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
};

// ---------- 貼圖（canvas 畫，共用）----------
function canvasTex(draw, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let TEX = null;
const tex = () => (TEX ??= {
  // 四角星（閃粉）
  star: canvasTex((x, s) => {
    const h = s / 2;
    const g = x.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,220,255,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    x.fillStyle = '#fff';
    x.beginPath();
    x.moveTo(h, 2);
    x.quadraticCurveTo(h, h, s - 2, h);
    x.quadraticCurveTo(h, h, h, s - 2);
    x.quadraticCurveTo(h, h, 2, h);
    x.quadraticCurveTo(h, h, h, 2);
    x.fill();
  }),
  // 柔和光團（光暈）
  soft: canvasTex((x, s) => {
    const h = s / 2;
    const g = x.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
  }),
});

// ---------- 形狀（共用）----------
const geoCache = new Map();
const rbox = (w, h, d, r = 0.2) => {
  const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r}`;
  if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * r));
  return geoCache.get(k);
};
// 月牙：外圓減內圓（打側貼喺身度）
function crescentGeo(thick, inner = 0.8, off = 0.38) {
  const s = new THREE.Shape();
  s.absarc(0, 0, 1, PI * 0.5, PI * 1.5, false);
  s.absarc(off, 0, inner, PI * 1.38, PI * 0.62, true);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -thick / 2);
  return g;
}
const CRESCENT = crescentGeo(0.06);
const CRESCENT_THIN = crescentGeo(0.06, 0.86, 0.3);
const MOON = crescentGeo(0.12);
const SPIKE = new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0);
const TOOTH = new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0).rotateX(PI); // 尖向下（底喺原點）
const ORB = new THREE.OctahedronGeometry(1, 0);

// 擺一件零件（userData.c = 頂點顏色）
const part = (parent, geo, mat, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  m.userData.c = c;
  parent.add(m);
  return m;
};

// 焊埋：group 入面（唔計 keep 嗰啲子 group）嘅 mesh 按物料合併，每種物料 1 個 mesh
// 回傳 Map(物料 → mesh)
function bake(group, keep = []) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map();
  const dead = [];
  const _m = new THREE.Matrix4();
  group.traverse((o) => {
    if (!o.isMesh) return;
    for (let p = o; p && p !== group; p = p.parent) if (keep.includes(p)) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    g.applyMatrix4(_m.multiplyMatrices(inv, o.matrixWorld));
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    const c = o.userData.c || C.white;
    for (let i = 0; i < n; i++) c.toArray(col, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(g);
    dead.push(o);
  });
  for (const o of dead) o.removeFromParent();
  const out = new Map();
  for (const [mat, list] of byMat) {
    const merged = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = mat.isMeshStandardMaterial;
    group.add(m);
    out.set(mat, m);
  }
  return out;
}
const noSaddle = (m) => m && (m.userData.noSaddle = true);

// ---------- 一節身（本地：+z = 向住個頭，x = 左右，y = 上）----------
function segment(i) {
  const k = kOf(i);
  const w = 0.86 * k;
  const h = 0.78 * k;
  const d = GAP * 1.55;
  const g = new THREE.Group();
  // 身 + 背脊深色鱗片 + 肚（一格格）
  part(g, rbox(w, h, d, 0.28), MAT.hide, i % 2 ? C.body2 : C.body);
  part(g, rbox(w * 0.62, h * 0.18, d * 0.8, 0.35), MAT.hide, C.plate, 0, h * 0.45, -0.02);
  part(g, rbox(w * 0.8, h * 0.3, d * 0.86, 0.3), MAT.hide, i % 2 ? C.belly2 : C.belly, 0, -h * 0.4, 0);
  // 兩邊發光月牙：外層粉紅 + 入面白色（一層層），尖向頭
  const glowMat = MAT.glow[i % 3];
  for (const s of [-1, 1]) {
    const x = s * (w / 2 + 0.01);
    part(g, CRESCENT, glowMat, C.pink, x, 0.02, 0.01, 0, s * PI / 2, s > 0 ? 0 : PI, h * 0.38);
    part(g, CRESCENT_THIN, glowMat, C.white, x + s * 0.025, 0.02, -0.02, 0, s * PI / 2, s > 0 ? 0 : PI, h * 0.25);
  }
  // 細發光點（肚邊一粒粒）
  if (i % 2 === 0) for (const s of [-1, 1]) part(g, ORB, glowMat, C.violet, s * w * 0.36, -h * 0.42, 0, 0, 0, 0, 0.035 * k + 0.015);
  const meshes = bake(g);
  noSaddle(meshes.get(glowMat));
  // 背脊尖刺（另外一組，有馬鞍就收埋）：大尖刺向後斜 + 發光尖；每兩節多兩支細嘅
  const fin = new THREE.Group();
  if (i < N - 1) {
    const sh = 0.5 * k + 0.08;
    part(fin, SPIKE, MAT.spike, null, 0, h / 2 + 0.02, -0.04, -0.55, PI / 4, 0, 0.13 * k + 0.03, sh, 0.13 * k + 0.03);
    part(fin, SPIKE, glowMat, C.pink, 0, h / 2 + 0.02 + Math.cos(0.55) * sh * 0.78, -0.04 - Math.sin(0.55) * sh * 0.78, -0.55, PI / 4, 0, 0.06 * k + 0.015, sh * 0.3, 0.06 * k + 0.015);
    if (i % 2 === 0 && i < N - 4) for (const s of [-1, 1]) part(fin, SPIKE, MAT.spike, null, s * w * 0.3, h * 0.42, 0, -0.7, PI / 4, s * -0.5, 0.05 * k + 0.01, 0.26 * k, 0.05 * k + 0.01);
  }
  g.add(fin);
  for (const m of bake(fin).values()) noSaddle(m);
  noSaddle(fin);
  g.userData.k = k;
  g.userData.fin = fin;
  return g;
}

// ---------- 頭（本地：+z = 向前）----------
function head() {
  const g = new THREE.Group();
  // 頭殼、長鼻、鼻頭
  part(g, rbox(0.96, 0.66, 0.76, 0.22), MAT.hide, C.body, 0, 0.12, 0);
  part(g, rbox(0.74, 0.36, 0.8, 0.22), MAT.hide, C.body, 0, 0.14, 0.66); // 上顎
  part(g, rbox(0.82, 0.34, 0.24, 0.3), MAT.hide, C.body2, 0, 0.18, 1.06); // 鼻頭（闊少少）
  // 鼻樑脊：中間一條 + 兩邊兩條，好似參考圖嘅坑紋
  part(g, rbox(0.16, 0.12, 0.78, 0.35), MAT.hide, C.plate, 0, 0.35, 0.62);
  for (const s of [-1, 1]) part(g, rbox(0.1, 0.08, 0.6, 0.35), MAT.hide, C.plate, s * 0.25, 0.32, 0.66, 0, s * 0.06, 0);
  for (let i = 0; i < 3; i++) part(g, rbox(0.42 - i * 0.06, 0.05, 0.06, 0.3), MAT.hide, C.body2, 0, 0.33, 0.42 + i * 0.2);
  // 頭頂鱗甲 + 額頭新月
  part(g, rbox(0.6, 0.12, 0.5, 0.3), MAT.hide, C.plate, 0, 0.47, -0.02);
  part(g, CRESCENT, MAT.glowHead, C.pink, 0, 0.5, 0.26, -PI / 2 + 0.25, 0, -PI / 2, 0.16);
  // 眉骨（向上斜，好威）+ 發白光嘅眼 + 眼角發光
  for (const s of [-1, 1]) {
    part(g, rbox(0.34, 0.12, 0.26, 0.3), MAT.hide, C.plate, s * 0.3, 0.44, 0.24, 0.15, 0, s * -0.35);
    part(g, rbox(0.24, 0.14, 0.1, 0.35), MAT.glowHead, C.eye, s * 0.31, 0.3, 0.37, 0, s * 0.25, s * -0.15);
    part(g, rbox(0.16, 0.05, 0.06, 0.3), MAT.glowHead, C.pink, s * 0.46, 0.33, 0.27, 0, s * 0.6, s * -0.3);
    // 鼻孔（發光）
    part(g, rbox(0.12, 0.08, 0.08, 0.3), MAT.glowHead, C.pink, s * 0.2, 0.3, 1.18);
    // 腮邊鰭（向後打開）
    for (let j = 0; j < 3; j++) part(g, SPIKE, MAT.spike, null, s * 0.48, 0.06 + j * 0.13, -0.18, -1.2 - j * 0.15, PI / 4, s * (1.0 - j * 0.2), 0.06, 0.42 - j * 0.08, 0.06);
    // 兩邊月牙紋（塊面都有）
    part(g, CRESCENT, MAT.glowHead, C.pink, s * 0.485, 0.08, 0.02, 0, s * PI / 2, s > 0 ? 0 : PI, 0.2);
  }
  // 口入面（深色）+ 上排牙（兩邊一排 + 兩隻大獠牙 + 門牙）
  part(g, rbox(0.62, 0.06, 0.82, 0.3), MAT.flat, C.mouth, 0, -0.04, 0.62);
  part(g, rbox(0.7, 0.05, 0.86, 0.3), MAT.flat, C.gum, 0, -0.01, 0.64);
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) part(g, TOOTH, MAT.flat, C.tooth, s * (0.31 - i * 0.006), 0.0, 0.32 + i * 0.13, 0, 0, 0, 0.038, 0.13, 0.038);
  for (const s of [-1, 1]) part(g, TOOTH, MAT.flat, C.tooth, s * 0.22, 0.02, 1.02, 0, 0, s * 0.08, 0.06, 0.26, 0.06); // 獠牙
  for (const x of [-0.08, 0.08]) part(g, TOOTH, MAT.flat, C.tooth, x, 0.02, 1.1, 0, 0, 0, 0.04, 0.12, 0.04);
  // 角：兩支大鹿角，向後彎，有分叉，發光尖
  for (const s of [-1, 1]) {
    const h = new THREE.Group();
    h.position.set(s * 0.28, 0.44, -0.12);
    h.rotation.set(-1.05, s * -0.2, s * -0.32);
    g.add(h);
    part(h, rbox(0.13, 0.42, 0.13, 0.3), MAT.hide, C.hornDark, 0, 0.21, 0);
    const up = new THREE.Group();
    up.position.set(0, 0.4, 0);
    up.rotation.set(0.35, 0, s * 0.08);
    h.add(up);
    part(up, rbox(0.1, 0.46, 0.1, 0.3), MAT.hide, C.horn, 0, 0.23, 0);
    part(up, SPIKE, MAT.glowHead, C.pink, 0, 0.45, 0, 0, PI / 4, 0, 0.07, 0.24, 0.07);
    // 分叉
    for (const [y, a, l] of [[0.12, 0.9, 0.3], [0.3, 0.75, 0.24]]) {
      const t = new THREE.Group();
      t.position.set(s * 0.03, y, 0);
      t.rotation.z = s * -a;
      up.add(t);
      part(t, rbox(0.07, l, 0.07, 0.3), MAT.hide, C.horn, 0, l / 2, 0);
      part(t, SPIKE, MAT.glowHead, C.pink, 0, l, 0, 0, PI / 4, 0, 0.05, 0.14, 0.05);
    }
    const t2 = new THREE.Group();
    t2.position.set(0, 0.18, 0);
    t2.rotation.x = -0.9;
    h.add(t2);
    part(t2, rbox(0.07, 0.26, 0.07, 0.3), MAT.hide, C.horn, 0, 0.13, 0);
  }
  // 頸後鬃毛（一排向後嘅尖刺 + 發光尖）
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.2;
    const l = 0.5 - Math.abs(i - 3) * 0.06;
    part(g, SPIKE, MAT.spike, null, Math.sin(a) * 0.4, 0.28 + Math.cos(a) * 0.12, -0.34, -1.3, PI / 4, a * 1.2, 0.08, l, 0.08);
  }
  // 下巴鬚（三條尖）
  for (const s of [-1, 0, 1]) part(g, SPIKE, MAT.spike, null, s * 0.12, -0.2, 0.2, PI - 0.5, PI / 4, s * 0.2, 0.05, 0.28, 0.05);

  // 下顎（會開合）
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.1, 0.12);
  g.add(jaw);
  part(jaw, rbox(0.68, 0.2, 0.92, 0.25), MAT.hide, C.body, 0, -0.08, 0.44);
  part(jaw, rbox(0.54, 0.09, 0.8, 0.3), MAT.hide, C.belly, 0, -0.19, 0.42);
  for (let i = 0; i < 3; i++) part(jaw, rbox(0.4 - i * 0.05, 0.03, 0.05, 0.3), MAT.hide, C.belly2, 0, -0.24, 0.2 + i * 0.22);
  part(jaw, rbox(0.52, 0.05, 0.78, 0.3), MAT.flat, C.mouth, 0, 0.03, 0.44);
  // 分叉脷
  part(jaw, rbox(0.2, 0.05, 0.52, 0.45), MAT.flat, C.tongue, 0, 0.07, 0.42);
  for (const s of [-1, 1]) part(jaw, rbox(0.06, 0.04, 0.22, 0.45), MAT.flat, C.tongue, s * 0.05, 0.08, 0.76, 0.12, s * 0.28, 0);
  // 下排牙 + 下獠牙
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) part(jaw, SPIKE, MAT.flat, C.tooth, s * 0.27, 0.01, 0.28 + i * 0.13, 0, 0, 0, 0.036, 0.12, 0.036);
  for (const s of [-1, 1]) part(jaw, SPIKE, MAT.flat, C.tooth, s * 0.2, 0.01, 0.86, 0, 0, s * -0.1, 0.055, 0.22, 0.055);
  // 下顎邊嘅月牙紋
  for (const s of [-1, 1]) part(jaw, CRESCENT_THIN, MAT.glowHead, C.pink, s * 0.345, -0.08, 0.42, 0, s * PI / 2, s > 0 ? 0 : PI, 0.11);
  bake(jaw);

  // 龍鬚：兩條長長嘅發光鬚（一節節，會飄）
  const whiskers = [-1, 1].map((s) => {
    const w = new THREE.Group();
    w.position.set(s * 0.34, 0.16, 1.08);
    w.rotation.y = s * 1.15;
    g.add(w);
    let p = w;
    const parts = [];
    for (let i = 0; i < 7; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, 0, i ? 0.2 : 0);
      p.add(seg);
      const th = 0.05 - i * 0.005;
      const m = new THREE.Mesh(rbox(th, th, 0.22, 0.4), MAT.whisker);
      m.position.z = 0.1;
      m.userData.noSaddle = true;
      seg.add(m);
      parts.push(seg);
      p = seg;
    }
    return { w, parts, s };
  });
  const keep = [jaw, ...whiskers.map((w) => w.w)];
  for (const [mat, m] of bake(g, keep)) if (mat !== MAT.hide) noSaddle(m);
  return { g, jaw, whiskers };
}

// 細腳仔 + 爪（成隻腳焊埋，行嗰陣成隻轉）
function leg(parent, s, k) {
  const g = new THREE.Group();
  g.position.set(s * 0.38 * k, -0.22 * k, 0);
  parent.add(g);
  part(g, rbox(0.22, 0.34, 0.24, 0.3), MAT.hide, C.body2, s * 0.06, -0.12, 0, 0, 0, s * 0.4);
  part(g, rbox(0.16, 0.3, 0.18, 0.3), MAT.hide, C.body, s * 0.14, -0.34, 0.06, 0.4, 0, s * 0.1);
  part(g, SPIKE, MAT.spike, null, s * 0.12, -0.12, -0.12, -2.2, PI / 4, s * 0.3, 0.04, 0.24, 0.04); // 手肘尖
  part(g, rbox(0.24, 0.1, 0.26, 0.3), MAT.hide, C.belly, s * 0.16, -0.5, 0.14);
  for (let c = 0; c < 3; c++) part(g, SPIKE, MAT.glowHead, C.white, s * 0.16 + (c - 1) * 0.075, -0.52, 0.28, PI / 2 + 0.3, 0, 0, 0.03, 0.14, 0.03);
  for (const [mat, m] of bake(g)) if (mat !== MAT.hide) noSaddle(m);
  g.scale.setScalar(k);
  return g;
}

// 尾鰭：大大塊發光月牙（企直）+ 兩邊尖刺
function tailFin(parent) {
  const fin = new THREE.Group();
  fin.position.set(0, 0, -0.18);
  parent.add(fin);
  part(fin, CRESCENT, MAT.glow[0], C.pink, 0, 0.05, -0.32, 0, PI / 2, -PI / 2 - 0.35, 0.42);
  part(fin, CRESCENT_THIN, MAT.glow[1], C.white, 0.035, 0.05, -0.34, 0, PI / 2, -PI / 2 - 0.35, 0.3);
  part(fin, CRESCENT_THIN, MAT.glow[1], C.white, -0.035, 0.05, -0.34, 0, PI / 2, -PI / 2 - 0.35, 0.3);
  for (const [rz, sc] of [[0.8, 0.34], [-0.8, 0.34], [PI, 0.26]]) part(fin, SPIKE, MAT.spike, null, 0, 0, -0.06, -PI / 2, 0, rz, 0.05, sc, 0.05);
  for (const m of bake(fin).values()) noSaddle(m);
  noSaddle(fin);
  return fin;
}

// ---------- 動態特效（每隻龍自己一份 geometry，物料共用）----------
const BIG = new THREE.Sphere(new THREE.Vector3(0, 1.3, 0), 6.5); // 特效嘅大概範圍（俾 frustum culling 用）
function dynMesh(nVerts, mat, indexed) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(nVerts * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  if (indexed) geo.setIndex(indexed);
  geo.boundingSphere = BIG.clone();
  geo.boundingBox = new THREE.Box3(new THREE.Vector3(-1.2, 0.4, -3.6), new THREE.Vector3(1.2, 2.6, 3.4));
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = false;
  m.renderOrder = 2;
  return m;
}

const RIB_S = 72; // 能量帶有幾多點
const BOLTS = 4;
const BOLT_P = 6; // 每條閃電幾多段
const SPARKS = 36;
const AURA = 14;

export function buildLuminousDragon() {
  const g = new THREE.Group();
  const root = new THREE.Group();
  g.add(root);
  const segs = Array.from({ length: N }, (_, i) => {
    const s = segment(i);
    root.add(s);
    return s;
  });
  const legs = [];
  for (const i of [3, 12]) for (const s of [-1, 1]) legs.push({ g: leg(segs[i], s, segs[i].userData.k), s, i });
  const H = head();
  root.add(H.g);
  const tailEnd = tailFin(segs[N - 1]);

  // 頭頂新月 + 光暈
  const moon = new THREE.Group();
  moon.position.set(0, 3.0, -2.2);
  const moonMesh = new THREE.Mesh(MOON, MAT.moon);
  moonMesh.rotation.z = -0.5;
  moonMesh.scale.setScalar(0.42);
  moon.add(moonMesh);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex().soft, color: new THREE.Color(0.75, 0.42, 1.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
  moonGlow.scale.setScalar(1.7);
  moon.add(moonGlow);
  moon.userData.noSaddle = true; // 🐎 量馬鞍位唔好計個月亮
  root.add(moon);

  // 特效 group（唔係身體：Spectral 分身、搵頭、量馬鞍都唔計）
  const fx = new THREE.Group();
  fx.userData.isMutationAura = true;
  fx.userData.noSaddle = true;
  root.add(fx);

  // 🌀 兩條紫色能量帶，螺旋咁圍住個身（一段段光由頭流去尾）
  const ribIndex = [];
  for (let j = 0; j < RIB_S - 1; j++) {
    const a = j * 2;
    ribIndex.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const ribbons = [0, 1].map(() => {
    const m = dynMesh(RIB_S * 2, MAT.ribbon, ribIndex);
    m.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(RIB_S * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    fx.add(m);
    return m;
  });
  // ⚡ 閃電：每條鋸齒閃電係兩塊十字交叉嘅薄片（邊個角度睇都睇到）
  const boltVerts = BOLTS * BOLT_P * 2 * 6;
  const bolt = dynMesh(boltVerts, MAT.bolt);
  fx.add(bolt);
  const boltPos = bolt.geometry.attributes.position.array;
  let nextBolt = 0;
  // ✨ 星星閃粉
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3).setUsage(THREE.DynamicDrawUsage));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3).setUsage(THREE.DynamicDrawUsage));
  sparkGeo.boundingSphere = BIG.clone();
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ map: tex().star, size: 0.32, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  fx.add(sparks);
  const sparkSeed = Array.from({ length: SPARKS }, (_, i) => ({ u: Math.random(), a: Math.random() * PI * 2, r: 0.5 + Math.random() * 0.9, sp: 0.04 + Math.random() * 0.08, tw: Math.random() * 10, c: i % 3 }));
  // 🔮 光暈：沿住條身幾團好大好淡嘅紫光
  const auraGeo = new THREE.BufferGeometry();
  auraGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(AURA * 3), 3).setUsage(THREE.DynamicDrawUsage));
  auraGeo.boundingSphere = BIG.clone();
  const aura = new THREE.Points(auraGeo, new THREE.PointsMaterial({ map: tex().soft, size: 1.9, color: new THREE.Color(0.11, 0.035, 0.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  aura.renderOrder = 1;
  fx.add(aura);
  // 眼光（Sprite：唔會俾馬鞍撞到）
  const eyeGlowMat = new THREE.SpriteMaterial({ map: tex().soft, color: new THREE.Color(1.0, 0.8, 1.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  for (const s of [-1, 1]) {
    const sp = new THREE.Sprite(eyeGlowMat);
    sp.position.set(s * 0.33, 0.3, 0.4);
    sp.scale.setScalar(0.55);
    H.g.add(sp);
  }

  // ---------- 身體擺位：一條 S 形波浪（頭喺 -z）----------
  const pts = Array.from({ length: N + 1 }, () => new THREE.Vector3());
  const len = N * GAP;
  const place = (t, m) => {
    const f = 1.4 + m * 1.6;
    for (let i = 0; i <= N; i++) {
      const u = i / N; // 0 = 頭，1 = 尾
      const amp = 0.14 + u * 0.6;
      pts[i].set(
        Math.sin(t * f - i * 0.42) * amp,
        1.3 + Math.sin(t * f * 0.75 - i * 0.34) * (0.16 + u * 0.32) + Math.sin(u * PI) * 0.4 - u * 0.15,
        -len * 0.5 + i * GAP - 0.2,
      );
    }
  };
  const _d = new THREE.Vector3();
  const orient = (obj, from, to) => {
    _d.subVectors(to, from);
    const l = _d.length() || 1;
    obj.rotation.set(-Math.asin(THREE.MathUtils.clamp(_d.y / l, -1, 1)), Math.atan2(_d.x, _d.z), 0, 'YXZ');
  };
  const pose = (t, m) => {
    place(t, m);
    H.g.position.copy(pts[0]).add(_d.set(0, 0.14, -0.5));
    orient(H.g, pts[1], pts[0]);
    H.g.rotation.x += Math.sin(t * 1.1) * 0.08;
    for (let i = 0; i < N; i++) {
      const s = segs[i];
      s.position.copy(pts[i + 1]);
      orient(s, pts[i + 1], pts[i]);
    }
  };

  // 沿住條脊骨搵點（u：0 = 頭，1 = 尾）+ 嗰度嘅橫／上方向
  const _p = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _side = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const spine = (u) => {
    const f = THREE.MathUtils.clamp(u, 0, 1) * N;
    const i = Math.min(N - 1, Math.floor(f));
    const a = pts[i];
    const b = pts[i + 1];
    _p.lerpVectors(a, b, f - i);
    _t.subVectors(b, a).normalize();
    _side.crossVectors(_t, UP).normalize();
    _up.crossVectors(_side, _t);
    return kOf(Math.min(N - 1, f));
  };

  const ribParams = [{ ph: 0, sp: 2.6, turns: 5.5 }, { ph: PI, sp: -2.1, turns: 4.5 }];
  const updateRibbons = (t) => {
    ribbons.forEach((rb, n) => {
      const P = ribParams[n];
      const pos = rb.geometry.attributes.position.array;
      const col = rb.geometry.attributes.color.array;
      for (let j = 0; j < RIB_S; j++) {
        const u = 0.02 + (j / (RIB_S - 1)) * 0.95;
        const k = spine(u);
        const r = 0.5 * k + 0.22;
        const a = u * P.turns * PI * 2 + t * P.sp + P.ph;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const cx = _p.x + (_side.x * ca + _up.x * sa) * r;
        const cy = _p.y + (_side.y * ca + _up.y * sa) * r;
        const cz = _p.z + (_side.z * ca + _up.z * sa) * r;
        const w = 0.07 * k + 0.025;
        pos[j * 6] = cx - _t.x * w;
        pos[j * 6 + 1] = cy - _t.y * w;
        pos[j * 6 + 2] = cz - _t.z * w;
        pos[j * 6 + 3] = cx + _t.x * w;
        pos[j * 6 + 4] = cy + _t.y * w;
        pos[j * 6 + 5] = cz + _t.z * w;
        // 一段段光流：兩頭淡、中間有幾團光由頭流去尾
        const flow = Math.pow(0.5 + 0.5 * Math.sin(u * 14 - t * 4 + n * 2), 2);
        const edge = Math.min(1, u * 8, (1 - u) * 6);
        const v = edge * (0.25 + flow * 1.1);
        for (const o of [0, 3]) {
          col[j * 6 + o] = 0.62 * v;
          col[j * 6 + o + 1] = 0.16 * v;
          col[j * 6 + o + 2] = 1.0 * v;
        }
      }
      rb.geometry.attributes.position.needsUpdate = true;
      rb.geometry.attributes.color.needsUpdate = true;
    });
  };

  // 一段閃電片（十字兩塊）
  const _q0 = new THREE.Vector3();
  const _q1 = new THREE.Vector3();
  const _w = new THREE.Vector3();
  let bk = 0;
  const quad = (a, b, wx, wy, wz) => {
    const s = [a.x - wx, a.y - wy, a.z - wz, a.x + wx, a.y + wy, a.z + wz, b.x + wx, b.y + wy, b.z + wz, b.x - wx, b.y - wy, b.z - wz];
    boltPos.set([s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], s[0], s[1], s[2], s[6], s[7], s[8], s[9], s[10], s[11]], bk);
    bk += 18;
  };
  const updateBolts = (t) => {
    if (!(t >= nextBolt || t < nextBolt - 1)) return;
    nextBolt = t + 0.05 + Math.random() * 0.09;
    boltPos.fill(0);
    bk = 0;
    for (let b = 0; b < BOLTS; b++) {
      if (Math.random() < 0.3) {
        bk += BOLT_P * 36;
        continue;
      }
      // 一半係由身度射出去，一半係沿住身打嘅弧
      const arc = b % 2 === 1;
      const u0 = 0.08 + Math.random() * 0.8;
      const k = spine(u0);
      const a0 = Math.random() * PI * 2;
      const r = 0.5 * k + 0.2;
      _q0.copy(_p).addScaledVector(_side, Math.cos(a0) * r).addScaledVector(_up, Math.sin(a0) * r);
      const out = new THREE.Vector3().copy(_side).multiplyScalar(Math.cos(a0)).addScaledVector(_up, Math.sin(a0));
      const along = _t.clone();
      for (let p = 0; p < BOLT_P; p++) {
        const step = arc ? along.clone().multiplyScalar(0.22).addScaledVector(out, (p < BOLT_P / 2 ? 0.08 : -0.08)) : out.clone().multiplyScalar(0.2);
        _q1.copy(_q0).add(step).add(_w.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.22));
        const th = 0.022 * (1 - p / BOLT_P) + 0.008;
        quad(_q0, _q1, 0, th, 0);
        quad(_q0, _q1, th, 0, 0);
        _q0.copy(_q1);
      }
    }
    bolt.geometry.attributes.position.needsUpdate = true;
  };

  const sparkPos = sparkGeo.attributes.position.array;
  const sparkCol = sparkGeo.attributes.color.array;
  const SPARK_C = [C.white, C.pink, C.violet];
  const updateSparks = (t) => {
    sparkSeed.forEach((s, i) => {
      const u = (s.u + t * s.sp) % 1;
      spine(u);
      const a = s.a + t * 0.7;
      const r = s.r + Math.sin(t * 1.3 + s.tw) * 0.15;
      sparkPos[i * 3] = _p.x + (_side.x * Math.cos(a) + _up.x * Math.sin(a)) * r;
      sparkPos[i * 3 + 1] = _p.y + (_side.y * Math.cos(a) + _up.y * Math.sin(a)) * r + 0.1;
      sparkPos[i * 3 + 2] = _p.z + (_side.z * Math.cos(a) + _up.z * Math.sin(a)) * r;
      const tw = Math.pow(Math.max(0, Math.sin(t * 3.5 + s.tw)), 3) * Math.min(1, u * 10, (1 - u) * 10) * 1.6;
      const c = SPARK_C[s.c];
      sparkCol[i * 3] = c.r * tw;
      sparkCol[i * 3 + 1] = c.g * tw;
      sparkCol[i * 3 + 2] = c.b * tw;
    });
    sparkGeo.attributes.position.needsUpdate = true;
    sparkGeo.attributes.color.needsUpdate = true;
    const ap = auraGeo.attributes.position.array;
    for (let i = 0; i < AURA; i++) {
      const p = i === 0 ? H.g.position : pts[Math.round((i / (AURA - 1)) * N)];
      ap[i * 3] = p.x;
      ap[i * 3 + 1] = p.y + 0.1;
      ap[i * 3 + 2] = p.z;
    }
    auraGeo.attributes.position.needsUpdate = true;
  };

  // 🐎 有馬鞍（saddle.js 加喺 g）：馬鞍跟住下面嗰節身上上落落；嗰幾節嘅背脊尖刺收埋
  let saddle;
  const saddleFollow = () => {
    if (saddle === undefined || (saddle && saddle.parent !== g)) {
      saddle = g.getObjectByName('saddle') || null;
      for (const s of segs) s.userData.fin.visible = true;
      if (saddle) {
        pose(0, 0);
        const z = saddle.position.z;
        const idx = segs.reduce((a, b, i) => (Math.abs(b.position.z - z) < Math.abs(segs[a].position.z - z) ? i : a), 0);
        saddle.userData.seg = segs[idx];
        saddle.userData.dy = saddle.position.y - segs[idx].position.y;
        for (let i = idx - 2; i <= idx + 2; i++) if (segs[i]) segs[i].userData.fin.visible = false;
      }
    }
    if (saddle) {
      saddle.position.y = saddle.userData.seg.position.y + saddle.userData.dy;
      saddle.position.x = saddle.userData.seg.position.x;
      saddle.rotation.y = saddle.userData.seg.rotation.y + PI;
    }
  };

  g.userData.animate = (t, moving = 0) => {
    pose(t, moving);
    if (saddle !== null) saddleFollow();
    // 張口（好似吼緊），閉埋少少又再張大
    H.jaw.rotation.x = 0.32 + Math.max(0, Math.sin(t * 0.9)) * 0.38;
    for (const w of H.whiskers) w.parts.forEach((p, i) => p.rotation.set(Math.sin(t * 2.6 - i * 0.6) * 0.22 + 0.04, w.s * Math.sin(t * 1.9 - i * 0.55) * 0.2, 0));
    for (const l of legs) l.g.rotation.x = Math.sin(t * 4 + l.i + (l.s > 0 ? PI : 0)) * 0.5;
    tailEnd.rotation.y = Math.sin(t * 2.2) * 0.35;
    moon.position.y = 3.0 + Math.sin(t * 1.3) * 0.12;
    moonMesh.rotation.z = -0.5 + Math.sin(t * 0.7) * 0.1;
    // 發光紋一波波（3 組輪流），眼同角尖慢慢呼吸
    MAT.glow.forEach((m, i) => m.color.setScalar(1.2 + Math.sin(t * 3.4 - i * 2.1) * 0.4));
    MAT.glowHead.color.setScalar(1.7 + Math.sin(t * 2) * 0.25);
    MAT.bolt.opacity = 0.7 + Math.random() * 0.3;
    eyeGlowMat.opacity = 0.75 + Math.sin(t * 2) * 0.2;
    updateRibbons(t);
    updateBolts(t);
    updateSparks(t);
  };
  g.userData.animate(0, 0);
  pose(0, 0);
  root.updateMatrixWorld(true);
  g.userData.height = 3.2;
  g.userData.move = 'fly';
  return g;
}
