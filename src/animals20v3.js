// 頭 20 隻動物（Biome 1–3）第三版：Issue #18 小朋友話「some animals are very very ugly」→「the top 20 animals」
// 風格：軟軟嘅方塊公仔（似 Roblox Adopt Me）：大頭、大眼（眼白 + 眼珠 + 兩粒反光，識眨眼）、面紅紅、細細個笑口，
//       每隻都有真實嘅特徵同花紋（熊貓黑眼圈、象鼻象牙、犀牛兩隻角同尖嘴、鯨鯊白點、雀嘅勾嘴同羽毛……）
// 全部面向 -z。每個回傳 Group：userData.animate(time, moving)、userData.height（未計 g.scale）、userData.move
// 靜止嘅零件會用 bake() 焊埋（每個轉軸入面同一隻色嘅焊成一舊），少啲 draw call
// 舊版（第二版）嘅共用 builder 仲喺 animals20.js（animals30／fusePets／worstPets／enchantedModels 用緊）

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, pivot, ball, slab, material, BLACK, WHITE } from './modelKit.js';
import { sleek, noseIn, tailOut, smooth01, seeded } from './animals20.js';

const PI = Math.PI;
const INK = 0x2a1c18; // 口、鼻窿
const BLUSH = 0xff9eaa; // 面紅紅
const SHINE = { emissive: 0xffffff, emissiveIntensity: 0.35 }; // 眼入面反光（微微發亮）

// ================= 工具 =================
const geoCache = new Map();
const cached = (key, make) => {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
};
function addMesh(parent, geo, color, x = 0, y = 0, z = 0, extra) {
  const m = new THREE.Mesh(geo, color?.isMaterial ? color : material(color, extra));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// 圓柱（腳、象鼻、尾）：中心喺 x,y,z，直企（沿 y）
function cyl(parent, rTop, rBot, h, color, x = 0, y = 0, z = 0, seg = 14) {
  return addMesh(parent, cached(`cy${rTop.toFixed(3)}|${rBot.toFixed(3)}|${h.toFixed(3)}|${seg}`, () => new THREE.CylinderGeometry(rTop, rBot, h, seg)), color, x, y, z);
}
// 圓錐（犀牛角、爪）：尖向 +y
function cone(parent, r, h, color, x = 0, y = 0, z = 0, seg = 16) {
  return addMesh(parent, cached(`co${r.toFixed(3)}|${h.toFixed(3)}|${seg}`, () => new THREE.ConeGeometry(r, h, seg)), color, x, y, z);
}
// 側面形狀拉出嚟嘅厚片（plane side：形狀 x → 向前），越向前越窄（taper）：雀嘴用，前面睇都係尖尖
function taperSlab(parent, pts, depth, color, { key, bevel = 0.025, x = 0, y = 0, z = 0, taper = 0.65 } = {}) {
  const geo = cached(`ts|${key}|${depth}`, () => {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    shape.splineThru([...pts.slice(1), pts[0]].map(([a, b]) => new THREE.Vector2(a, b)));
    let g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 8 });
    g.translate(0, 0, -depth / 2);
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    g = mergeVertices(g);
    const p = g.attributes.position;
    const xmax = Math.max(...pts.map((q) => q[0]));
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * (1 - taper * Math.min(1, Math.max(0, p.getX(i) / xmax)) ** 1.3));
    g.computeVertexNormals();
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.count * 2), 2));
    return g;
  });
  const m = addMesh(parent, geo, color, x, y, z);
  m.rotation.y = PI / 2;
  return m;
}
// 笑口：半個圓圈（開口向上），貼喺 z 面
function smile(parent, r, tube, x, y, z, color = INK) {
  const m = addMesh(parent, cached(`sm${r.toFixed(3)}|${tube.toFixed(3)}`, () => new THREE.TorusGeometry(r, tube, 6, 14, PI)), color, x, y, z);
  m.rotation.z = PI;
  return m;
}
// 面紅紅（扁扁嘅粉紅波波）
function blush(parent, x, y, z, r, turn = 0) {
  const m = ball(parent, r, r * 0.6, r * 0.3, BLUSH, x, y, z);
  m.rotation.y = turn;
  return m;
}
// 可愛大眼：眼白 + 有色眼珠 + 黑瞳 + 一大一細反光（眨眼：animate 改 pivot.scale.y）
// turn：側面嘅眼向外轉幾多；lash：眼睫毛顏色
function eye(head, x, y, z, r, { iris = 0x3b2a20, turn = 0, lash = null, white = 0xffffff, ring = null, ringK = 1.4 } = {}) {
  const s = x < 0 ? -1 : 1;
  const p = pivot(head, x, y, z);
  p.rotation.y = -s * turn;
  if (ring) ball(p, r * ringK, r * ringK * 1.06, r * 0.32, ring, 0, 0, r * 0.12);
  ball(p, r, r * 1.12, r * 0.5, white, 0, 0, 0);
  ball(p, r * 0.74, r * 0.84, r * 0.28, iris, 0, -r * 0.1, -r * 0.3);
  ball(p, r * 0.44, r * 0.52, r * 0.22, 0x0d0b0a, 0, -r * 0.12, -r * 0.42);
  ball(p, r * 0.25, r * 0.25, r * 0.12, 0xffffff, -r * 0.24, r * 0.26, -r * 0.6, SHINE);
  ball(p, r * 0.11, r * 0.11, r * 0.08, 0xffffff, r * 0.22, -r * 0.32, -r * 0.6, SHINE);
  if (lash) for (const k of [-1, 0, 1]) {
    const l = box(p, r * 0.12, r * 0.42, r * 0.1, lash, s * (r * 0.55 + k * r * 0.3), r * 1.0 - Math.abs(k) * r * 0.08, -r * 0.05, 0.4);
    l.rotation.z = -s * (0.6 + k * 0.35);
  }
  return p;
}
// 眨眼：每隻動物唔同時間眨
const blinkAt = (t, off) => {
  const c = (t + off) % 4.3;
  return c < 0.14 ? 0.12 + (Math.abs(c - 0.07) / 0.07) * 0.88 : 1;
};
// 焊埋：每個轉軸入面，同一隻物料嘅 mesh 焊成一舊（userData.keep 嘅唔焊）
function bake(root) {
  const parents = [];
  root.traverse((o) => o.children.some((c) => c.isMesh) && parents.push(o));
  for (const P of parents) {
    const buckets = new Map();
    for (const c of P.children) {
      if (!c.isMesh || c.userData.keep || Array.isArray(c.material)) continue;
      if (!buckets.has(c.material)) buckets.set(c.material, []);
      buckets.get(c.material).push(c);
    }
    for (const [mat, list] of buckets) {
      if (list.length < 2) continue;
      const geos = list.map((m) => {
        m.updateMatrix();
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        g.clearGroups();
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
        g.applyMatrix4(m.matrix);
        if (m.matrix.determinant() < 0) {
          // 鏡像咗：三角形要反轉，唔係會睇唔到
          for (const a of Object.values(g.attributes)) {
            const n = a.itemSize;
            for (let i = 0; i < a.count; i += 3) for (let k = 0; k < n; k++) {
              const t = a.array[(i + 1) * n + k];
              a.array[(i + 1) * n + k] = a.array[(i + 2) * n + k];
              a.array[(i + 2) * n + k] = t;
            }
          }
        }
        return g;
      });
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mm = new THREE.Mesh(merged, mat);
      mm.castShadow = true;
      mm.receiveShadow = true;
      for (const m of list) P.remove(m);
      P.add(mm);
    }
  }
  return root;
}
// 一條腳：hip 轉軸喺 (x, top, z)；大髀 + 小腿（knee 轉軸，行路識屈）+ 腳掌
// o：thigh（大髀色）、foot（腳掌色）、toes（腳甲色）、socks [[y0, y1, color]]（小腿上面嘅紋，y 由腳底計起）
function leg(root, x, top, z, w, color, o = {}) {
  const len = top;
  const hip = pivot(root, x, top, z);
  const tw = w * (o.thick ?? 1.15);
  box(hip, tw, len * 0.55, tw * 1.04, o.thigh ?? color, 0, -len * 0.24, 0, 0.42);
  const knee = pivot(hip, 0, -len * 0.48, 0);
  const shin = len * 0.52;
  box(knee, w, shin, w, color, 0, -shin / 2 + 0.02, 0, 0.4);
  const fh = Math.min(0.22, len * (o.hoof ? 0.12 : 0.16));
  box(knee, w * 1.14, fh, w * 1.22, o.foot ?? color, 0, -shin + fh / 2, -w * 0.07, o.hoof ? 0.25 : 0.45);
  for (const [y0, y1, c] of o.socks || []) box(knee, w * 1.05, y1 - y0, w * 1.05, c, 0, -shin + (y0 + y1) / 2, 0, 0.3);
  if (o.toes) for (const tx of [-1, 0, 1]) ball(knee, w * 0.15, w * 0.11, w * 0.1, o.toes, tx * w * 0.3, -shin + w * 0.12, -w * 0.62);
  return { hip, knee, front: z < 0, phase: 0 };
}
// 四隻腳行路（左前同右後一齊）＋屈膝
function walk(legs, t, moving, speed, amp) {
  legs.forEach((l, i) => {
    const a = Math.sin(t * speed + (i === 0 || i === 3 ? 0 : PI));
    l.hip.rotation.x = a * amp * moving;
    l.knee.rotation.x = Math.max(0, l.front ? -a : a) * amp * 1.1 * moving;
  });
}
// 一條識擺嘅尾：n 節（每節一個轉軸），沿 +z；r0 → r1 越嚟越幼；colors(i) 每節嘅色；回傳轉軸 list
function tailChain(parent, x, y, z, n, segLen, r0, r1, colors, bendX = 0) {
  const segs = [];
  let p = pivot(parent, x, y, z);
  for (let i = 0; i < n; i++) {
    if (i) p = pivot(p, 0, 0, segLen);
    p.rotation.x = bendX;
    const r = r0 + ((r1 - r0) * i) / Math.max(1, n - 1);
    const c = colors(i);
    ball(p, r, r, r, c, 0, 0, 0);
    cyl(p, r, r, segLen, c, 0, 0, segLen / 2).rotation.x = PI / 2;
    segs.push(p);
  }
  return segs;
}

// ================= 🐼 Giant Panda =================
function panda() {
  const W = 0xf8f6ef;
  const K = 0x1f1d1f;
  const g = new THREE.Group();
  const root = pivot(g);
  const legs = [[-0.37, -0.48], [0.37, -0.48], [-0.37, 0.5], [0.37, 0.5]].map(([x, z]) => leg(root, x, 0.78, z, 0.42, K, { foot: 0x2c292b }));
  box(root, 1.3, 1.08, 1.62, W, 0, 1.02, 0.02, 0.45); // 身（胖胖）
  box(root, 1.36, 1.12, 0.56, K, 0, 1.03, -0.4, 0.44); // 膊頭黑色帶
  box(root, 1.0, 0.3, 1.3, 0xf1eee4, 0, 0.55, 0.05, 0.45); // 肚
  const tail = pivot(root, 0, 1.28, 0.82);
  ball(tail, 0.15, 0.13, 0.12, W, 0, 0, 0.02);
  // 頭
  const neck = pivot(root, 0, 1.46, -0.8);
  const head = pivot(neck);
  const zf = -0.69;
  box(head, 1.14, 0.98, 0.94, W, 0, 0.12, -0.22, 0.48);
  for (const s of [-1, 1]) {
    ball(head, 0.23, 0.22, 0.13, K, s * 0.43, 0.6, -0.1); // 圓耳
    ball(head, 0.12, 0.11, 0.05, 0x3a3436, s * 0.43, 0.59, -0.21);
    const patch = ball(head, 0.17, 0.235, 0.08, K, s * 0.25, 0.1, zf + 0.02); // 斜斜嘅黑眼圈
    patch.rotation.z = s * 0.5;
    blush(head, s * 0.42, -0.14, zf + 0.06, 0.09, s * -0.4);
  }
  const eyes = [-1, 1].map((s) => eye(head, s * 0.25, 0.11, zf - 0.065, 0.085, { iris: 0x3a2618 }));
  ball(head, 0.3, 0.2, 0.15, 0xfffdf7, 0, -0.19, zf - 0.02); // 口鼻
  ball(head, 0.1, 0.07, 0.06, K, 0, -0.1, zf - 0.16); // 鼻
  smile(head, 0.045, 0.012, -0.045, -0.24, zf - 0.155);
  smile(head, 0.045, 0.012, 0.045, -0.24, zf - 0.155);
  // 咬住一枝竹
  const bamboo = pivot(head, 0, -0.27, zf - 0.13);
  const stalk = pivot(bamboo, 0.12, 0, 0);
  stalk.rotation.z = PI / 2 - 0.25;
  cyl(stalk, 0.045, 0.045, 0.95, 0x8bc34a, 0, 0, 0);
  for (const y of [-0.3, 0, 0.3]) cyl(stalk, 0.055, 0.055, 0.04, 0x689f38, 0, y, 0);
  for (const [r, k] of [[0.5, 1], [-0.3, 0.8], [1.2, 0.7]]) {
    const lf = pivot(stalk, 0, 0.42, 0);
    lf.rotation.set(0, 0, r);
    slab(lf, [[0, 0], [0.06, 0.12 * k], [0, 0.36 * k], [-0.06, 0.12 * k]], 0.02, 0x9ccc65, { key: `pd-leaf${k}`, bevel: 0.01, z: 0 });
  }
  g.userData.animate = (t, moving) => {
    walk(legs, t, moving, 6.5, 0.42);
    root.position.y = Math.abs(Math.sin(t * 6.5)) * 0.05 * moving;
    root.rotation.z = Math.sin(t * 6.5) * 0.03 * moving; // 搖下搖下咁行
    neck.rotation.x = Math.sin(t * 2) * 0.04;
    neck.rotation.y = Math.sin(t * 0.7) * 0.3 * (1 - moving);
    neck.rotation.z = Math.sin(t * 0.9) * 0.08 * (1 - moving); // 側頭
    bamboo.rotation.z = Math.sin(t * 7) * 0.06; // 咬竹
    bamboo.position.y = -0.27 + Math.abs(Math.sin(t * 7)) * 0.015;
    tail.rotation.y = Math.sin(t * 5) * 0.3;
    const b = blinkAt(t, 0.3);
    eyes.forEach((e) => (e.scale.y = b));
  };
  g.userData.height = 2.1;
  g.userData.move = 'walk';
  return bake(g);
}

// ================= 🐘 Elephants =================
// 大耳仔形狀：草原象似非洲地圖（下面尖）、森林象細啲圓啲
const EAR_SAVANNA = [[0.05, 0.16], [-0.35, 0.44], [-0.9, 0.48], [-1.3, 0.22], [-1.44, -0.3], [-1.26, -0.8], [-0.96, -1.12], [-0.62, -1.52], [-0.38, -1.46], [-0.3, -1.0], [-0.12, -0.56], [0.05, -0.26]];
const EAR_FOREST = [[0.05, 0.12], [-0.35, 0.36], [-0.75, 0.34], [-1.0, 0.04], [-1.0, -0.4], [-0.8, -0.76], [-0.46, -0.9], [-0.2, -0.74], [-0.04, -0.4]];
function elephant3(forest) {
  const skin = forest ? 0x7d756f : 0xa39c93;
  const dark = forest ? 0x655e58 : 0x8a837b;
  const pinkIn = forest ? 0xd99a96 : 0xeeaaa6;
  const nail = 0xf3ead8;
  const ivory = forest ? 0xf4e8cf : 0xfff6e0;
  const g = new THREE.Group();
  const root = pivot(g);
  const legs = [[-0.58, -0.75], [0.58, -0.75], [-0.58, 0.78], [0.58, 0.78]].map(([x, z]) => leg(root, x, 1.6, z, 0.64, skin, { thick: 1.12, toes: nail }));
  box(root, 2.0, 1.75, 2.5, skin, 0, 2.2, 0.02, 0.45);
  ball(root, 0.85, 0.45, 0.9, skin, 0, 2.95, -0.35); // 背脊（膊頭高啲）
  const tailRoot = pivot(root, 0, 2.55, 1.26);
  tailRoot.rotation.x = -0.35;
  cyl(tailRoot, 0.05, 0.04, 0.75, skin, 0, -0.37, 0);
  ball(tailRoot, 0.08, 0.14, 0.08, 0x3e3a36, 0, -0.78, 0);
  // 頭
  const neck = pivot(root, 0, 2.75, -1.22);
  const head = pivot(neck);
  const zf = -0.84;
  box(head, 1.42, 1.36, 1.08, skin, 0, 0.05, -0.3, 0.46);
  for (const s of [-1, 1]) ball(head, 0.36, 0.3, 0.32, skin, s * 0.28, 0.6, -0.5); // 額頭兩嚿
  const eyes = [-1, 1].map((s) => eye(head, s * 0.47, 0.16, zf + 0.06, 0.11, { iris: 0x4a3426, turn: 0.35, lash: 0x3a3532 }));
  for (const s of [-1, 1]) blush(head, s * 0.56, -0.14, zf + 0.12, 0.1, s * -0.45);
  ball(head, 0.16, 0.09, 0.1, 0xd88c8c, 0, -0.56, zf + 0.12); // 下唇（喺象鼻後面）
  // 大耳仔：皮 → 粉紅耳窩 → 向前摺嘅耳邊；撥下撥下
  const outline = forest ? EAR_FOREST : EAR_SAVANNA;
  const L = forest ? 1.0 : 1.44;
  const bend = (x, y) => 0.2 * Math.max(0, -x / L) ** 1.6 * L + 0.1 * ((y + L * 0.3) / L) ** 2;
  const cx = -L * 0.5;
  const cy = -L * 0.3;
  const inner = outline.map(([x, y]) => [cx + (x - cx) * 0.76, cy + (y - cy) * 0.76]);
  const kk = forest ? 'e3f' : 'e3s';
  const ears = [-1, 1].map((s) => {
    const ear = pivot(head, s * 0.66, 0.3, -0.12);
    ear.scale.x = s;
    slab(ear, outline, 0.08, skin, { plane: 'side', key: `${kk}-ear`, bevel: 0.04, bend });
    slab(ear, inner, 0.03, pinkIn, { plane: 'side', key: `${kk}-in`, bevel: 0.02, bend, x: 0.09 });
    return { ear, s };
  });
  // 象鼻：6 節，越落越幼，鼻尖向前捲起；每節有皺紋
  const R = [0.26, 0.23, 0.2, 0.17, 0.145, 0.12, 0.1];
  const REST = [0.12, 0.06, 0.08, 0.16, 0.32, 0.5];
  const trunk = [];
  let parent = pivot(head, 0, -0.22, zf + 0.08);
  for (let i = 0; i < 6; i++) {
    const seg = i ? pivot(parent, 0, -0.32, 0) : parent;
    ball(seg, R[i], R[i], R[i], skin, 0, 0, 0);
    cyl(seg, R[i], R[i + 1], 0.33, skin, 0, -0.165, 0);
    cyl(seg, R[i] * 0.97 + 0.012, R[i] * 0.97 + 0.012, 0.025, dark, 0, -0.1, 0);
    cyl(seg, R[i] * 0.92 + 0.012, R[i] * 0.92 + 0.012, 0.025, dark, 0, -0.22, 0);
    if (i === 5) {
      ball(seg, R[6] * 1.15, R[6] * 0.6, R[6] * 1.15, skin, 0, -0.34, 0);
      for (const sx of [-1, 1]) ball(seg, 0.025, 0.02, 0.025, INK, sx * 0.04, -0.39, 0);
    }
    trunk.push(seg);
    parent = seg;
  }
  // 象牙：兩節，向前再向上彎（森林象：幼啲、直啲、向下）
  for (const s of [-1, 1]) {
    const t1 = pivot(head, s * 0.32, -0.42, zf + 0.15);
    t1.rotation.set(forest ? 0.45 : 0.75, 0, s * (forest ? 0.04 : 0.14));
    const r0 = forest ? 0.065 : 0.085;
    ball(t1, r0 * 1.5, r0 * 1.2, r0 * 1.5, skin, 0, 0.02, 0); // 牙肉
    cyl(t1, r0, r0 * 0.88, 0.36, ivory, 0, -0.18, 0);
    const t2 = pivot(t1, 0, -0.36, 0);
    t2.rotation.x = forest ? 0.25 : 0.7;
    ball(t2, r0 * 0.88, r0 * 0.88, r0 * 0.88, ivory, 0, 0, 0);
    cone(t2, r0 * 0.88, forest ? 0.34 : 0.3, ivory, 0, -0.15, 0).rotation.x = PI;
  }
  g.userData.animate = (t, moving) => {
    walk(legs, t, moving, 5.2, 0.3);
    root.position.y = Math.abs(Math.sin(t * 5.2)) * 0.06 * moving;
    neck.rotation.x = Math.sin(t * 1.6) * 0.04 + Math.sin(t * 10.4) * 0.02 * moving;
    neck.rotation.y = Math.sin(t * 0.6) * 0.22 * (1 - moving);
    trunk.forEach((seg, i) => (seg.rotation.x = REST[i] + Math.sin(t * 1.5 - i * 0.55) * (0.08 + i * 0.03)));
    trunk.forEach((seg, i) => (seg.rotation.z = Math.sin(t * 1.1 - i * 0.4) * 0.05 * i));
    ears.forEach(({ ear, s }) => (ear.rotation.y = s * (0.45 + Math.sin(t * 2.2) * 0.18)));
    tailRoot.rotation.z = Math.sin(t * 3) * 0.25;
    const b = blinkAt(t, forest ? 1.7 : 0.9);
    eyes.forEach((e) => (e.scale.y = b));
  };
  g.userData.height = 3.4;
  g.userData.move = 'walk';
  if (forest) g.scale.setScalar(0.82);
  return bake(g);
}

// ================= 🦏 Black Rhinoceros =================
function blackRhino() {
  const skin = 0x8a8178;
  const dark = 0x6e665e;
  const horn = 0xc9b99c;
  const g = new THREE.Group();
  const root = pivot(g);
  const legs = [[-0.45, -0.68], [0.45, -0.68], [-0.45, 0.72], [0.45, 0.72]].map(([x, z]) => leg(root, x, 0.98, z, 0.48, skin, { foot: dark, toes: 0xe2d6c6, hoof: true }));
  box(root, 1.55, 1.25, 2.3, skin, 0, 1.38, 0.02, 0.45);
  ball(root, 0.62, 0.32, 0.6, skin, 0, 1.92, -0.55); // 膊頭隆起
  ball(root, 0.62, 0.62, 0.2, dark, 0, 1.45, -1.12); // 頸嘅皮摺
  const tailRoot = pivot(root, 0, 1.72, 1.16);
  tailRoot.rotation.x = -0.4;
  cyl(tailRoot, 0.045, 0.035, 0.5, skin, 0, -0.25, 0);
  ball(tailRoot, 0.06, 0.1, 0.06, 0x3e3a36, 0, -0.53, 0);
  // 頭（微微向下）
  const neck = pivot(root, 0, 1.55, -1.12);
  const head = pivot(neck);
  head.rotation.x = 0.2;
  head.scale.setScalar(1.15);
  box(head, 0.86, 0.8, 0.9, skin, 0, 0, -0.32, 0.45);
  box(head, 0.7, 0.62, 0.56, skin, 0, -0.12, -0.86, 0.45); // 口鼻
  cone(head, 0.18, 0.86, horn, 0, 0.6, -0.98).rotation.x = -0.28; // 大角
  cone(head, 0.13, 0.46, horn, 0, 0.56, -0.58).rotation.x = -0.15; // 細角
  ball(head, 0.19, 0.06, 0.19, 0xb3a385, 0, 0.2, -0.98);
  // 尖尖嘅上唇（黑犀牛嘅特徵，用嚟捉樹葉）
  const lip = ball(head, 0.17, 0.13, 0.15, 0x7a7067, 0, -0.33, -1.15);
  lip.rotation.x = 0.3;
  cone(head, 0.07, 0.14, 0x7a7067, 0, -0.43, -1.24).rotation.x = PI + 0.5;
  smile(head, 0.08, 0.014, 0, -0.38, -1.07);
  for (const s of [-1, 1]) {
    ball(head, 0.06, 0.08, 0.04, INK, s * 0.18, -0.06, -1.14); // 鼻窿
    blush(head, s * 0.36, -0.2, -0.86, 0.08, s * -1.1);
    // 管狀耳仔 + 耳尖毛
    const ear = pivot(head, s * 0.32, 0.4, -0.1);
    ear.rotation.z = s * -0.25;
    cyl(ear, 0.11, 0.07, 0.3, skin, 0, 0.15, 0);
    ball(ear, 0.07, 0.03, 0.07, 0xd9a3a0, 0, 0.3, -0.02);
    ball(ear, 0.05, 0.07, 0.05, 0x3e3a36, 0, 0.34, 0.02);
  }
  const eyes = [-1, 1].map((s) => eye(head, s * 0.42, 0.06, -0.62, 0.085, { iris: 0x4a3426, turn: 0.75, lash: 0x3a3532 }));
  g.userData.animate = (t, moving) => {
    walk(legs, t, moving, 6.5, 0.45);
    root.position.y = Math.abs(Math.sin(t * 6.5)) * 0.05 * moving;
    neck.rotation.x = Math.sin(t * 2) * 0.04 + Math.sin(t * 13) * 0.03 * moving;
    neck.rotation.y = Math.sin(t * 0.7) * 0.25 * (1 - moving);
    tailRoot.rotation.z = Math.sin(t * 5) * 0.4;
    const b = blinkAt(t, 2.2);
    eyes.forEach((e) => (e.scale.y = b));
  };
  g.userData.height = 2.15;
  g.userData.move = 'walk';
  return bake(g);
}

// ================= 🦝 Red Panda =================
function redPanda() {
  const fur = 0xcc5520;
  const dark = 0x2e1a14;
  const white = 0xfbf5ea;
  const g = new THREE.Group();
  const root = pivot(g);
  const legs = [[-0.2, -0.32], [0.2, -0.32], [-0.2, 0.34], [0.2, 0.34]].map(([x, z]) => leg(root, x, 0.46, z, 0.2, dark, { foot: 0x22130e }));
  box(root, 0.64, 0.54, 1.02, fur, 0, 0.66, 0.02, 0.45);
  box(root, 0.52, 0.2, 0.86, dark, 0, 0.44, 0.02, 0.45); // 黑肚
  // 大毛尾：一節節紅白相間，向後向上
  const tail = tailChain(root, 0, 0.74, 0.5, 6, 0.19, 0.17, 0.14, (i) => (i === 5 ? 0x5a2410 : i % 2 ? 0xebb57e : fur), -0.12);
  // 頭
  const neck = pivot(root, 0, 0.92, -0.52);
  const head = pivot(neck);
  const zf = -0.46;
  box(head, 0.8, 0.64, 0.6, fur, 0, 0.08, -0.16, 0.48);
  for (const s of [-1, 1]) {
    ball(head, 0.15, 0.13, 0.08, white, s * 0.25, -0.1, zf + 0.03); // 白面頰
    ball(head, 0.075, 0.045, 0.03, white, s * 0.17, 0.23, zf + 0.005); // 白眉
    const tear = box(head, 0.07, 0.2, 0.03, 0x8a2f12, s * 0.12, -0.12, zf - 0.005, 0.45); // 淚痕
    tear.rotation.z = s * -0.15;
    const ear = pivot(head, s * 0.28, 0.38, -0.05);
    ear.rotation.z = s * -0.25;
    box(ear, 0.25, 0.25, 0.08, white, 0, 0.06, 0, 0.5);
    box(ear, 0.16, 0.16, 0.05, 0x5a2410, 0, 0.05, -0.03, 0.5);
    blush(head, s * 0.3, -0.04, zf - 0.03, 0.06);
  }
  const eyes = [-1, 1].map((s) => eye(head, s * 0.17, 0.07, zf - 0.04, 0.075, { iris: 0x3a2114 }));
  ball(head, 0.19, 0.13, 0.12, white, 0, -0.13, zf - 0.03); // 白口鼻
  ball(head, 0.065, 0.045, 0.04, BLACK, 0, -0.07, zf - 0.14);
  smile(head, 0.035, 0.01, -0.035, -0.16, zf - 0.135);
  smile(head, 0.035, 0.01, 0.035, -0.16, zf - 0.135);
  g.userData.animate = (t, moving) => {
    walk(legs, t, moving, 10, 0.55);
    root.position.y = Math.abs(Math.sin(t * 10)) * 0.04 * moving;
    neck.rotation.x = Math.sin(t * 2.2) * 0.05;
    neck.rotation.y = Math.sin(t * 0.8) * 0.35 * (1 - moving);
    neck.rotation.z = Math.sin(t * 1.1) * 0.1 * (1 - moving);
    tail.forEach((sp, i) => (sp.rotation.y = Math.sin(t * 3.5 - i * 0.5) * (0.1 + i * 0.05)));
    const b = blinkAt(t, 1.1);
    eyes.forEach((e) => (e.scale.y = b));
  };
  g.userData.height = 1.35;
  g.userData.move = 'walk';
  return bake(g);
}

// ================= 🦓 Okapi =================
// 朱古力色身、屁股同腳有斑馬紋、白襪、淺色面、長頸、大耳、兩隻細角、間中伸條藍色長脷出嚟
function okapi() {
  const fur = 0x4d2018;
  const face = 0xddd0b8;
  const nose = 0x2b1d18;
  const white = 0xf4eee2;
  const black = 0x1e1512;
  const g = new THREE.Group();
  const root = pivot(g);
  const legs = [[-0.27, -0.55], [0.27, -0.55], [-0.27, 0.56], [0.27, 0.56]].map(([x, z]) => {
    const back = z > 0;
    const l = leg(root, x, 1.36, z, 0.2, white, { thigh: white, foot: 0x2a1d17, hoof: true, socks: [[0.14, 0.2, black]] });
    // 斑馬紋（後腳大髀成條、前腳上面幾條）
    const n = back ? 5 : 3;
    for (let i = 0; i < n; i++) box(l.hip, 0.245, 0.055, 0.245, black, 0, -0.1 - i * 0.12, 0, 0.3);
    if (back) for (let i = 0; i < 3; i++) box(l.knee, 0.215, 0.05, 0.215, black, 0, -0.08 - i * 0.12, 0, 0.3);
    return l;
  });
  box(root, 0.86, 0.9, 1.56, fur, 0, 1.66, 0.02, 0.42);
  // 屁股斑馬紋
  for (let i = 0; i < 4; i++) box(root, 0.89, 0.06, 0.42, white, 0, 1.36 + i * 0.13, 0.58, 0.3);
  const tailRoot = pivot(root, 0, 1.95, 0.8);
  tailRoot.rotation.x = -0.3;
  cyl(tailRoot, 0.035, 0.03, 0.55, fur, 0, -0.27, 0);
  ball(tailRoot, 0.06, 0.1, 0.06, black, 0, -0.58, 0);
  // 長頸 + 頭
  const neckBase = pivot(root, 0, 1.85, -0.62);
  neckBase.rotation.x = -0.42;
  box(neckBase, 0.36, 1.05, 0.42, fur, 0, 0.45, 0, 0.42);
  const neck = pivot(neckBase, 0, 1.0, -0.02);
  const head = pivot(neck);
  head.rotation.x = 0.42;
  box(head, 0.46, 0.5, 0.62, fur, 0, 0.02, -0.14, 0.45);
  for (const s of [-1, 1]) ball(head, 0.1, 0.17, 0.22, face, s * 0.19, -0.05, -0.24); // 淺色面頰
  box(head, 0.38, 0.32, 0.34, face, 0, -0.1, -0.5, 0.45); // 口鼻
  ball(head, 0.17, 0.1, 0.08, nose, 0, -0.03, -0.66); // 黑鼻
  for (const s of [-1, 1]) ball(head, 0.035, 0.03, 0.02, black, s * 0.08, -0.01, -0.705);
  smile(head, 0.05, 0.012, 0, -0.2, -0.67);
  const eyes = [-1, 1].map((s) => eye(head, s * 0.21, 0.1, -0.32, 0.08, { iris: 0x3a2114, turn: 0.55, lash: black }));
  for (const s of [-1, 1]) {
    blush(head, s * 0.2, -0.12, -0.5, 0.06, s * -0.9);
    const ear = pivot(head, s * 0.22, 0.2, -0.02);
    ear.rotation.z = s * -0.75;
    ball(ear, 0.08, 0.24, 0.14, fur, 0, 0.18, 0);
    ball(ear, 0.04, 0.17, 0.1, face, 0, 0.18, -0.05);
    const oss = pivot(head, s * 0.1, 0.28, 0.02);
    oss.rotation.z = s * -0.15;
    cyl(oss, 0.035, 0.045, 0.2, fur, 0, 0.08, 0);
    ball(oss, 0.045, 0.045, 0.045, black, 0, 0.19, 0);
  }
  // 藍色長脷（間中舔一下）
  const tongue = pivot(head, 0, -0.22, -0.6);
  const tg = box(tongue, 0.1, 0.04, 0.3, 0x4b4f9a, 0, 0, -0.12, 0.5);
  tg.userData.keep = true;
  tongue.scale.z = 0.01;
  g.userData.animate = (t, moving) => {
    walk(legs, t, moving, 7, 0.45);
    root.position.y = Math.abs(Math.sin(t * 7)) * 0.05 * moving;
    neckBase.rotation.x = -0.42 + Math.sin(t * 7 * 2) * 0.03 * moving + Math.sin(t * 1.3) * 0.03;
    neck.rotation.y = Math.sin(t * 0.7) * 0.35 * (1 - moving);
    const lc = (t + 3) % 6;
    const lick = lc < 0.9 ? Math.sin((lc / 0.9) * PI) : 0; // 舔一舔
    tongue.scale.z = 0.01 + lick;
    tongue.rotation.x = -lick * 0.6;
    tailRoot.rotation.z = Math.sin(t * 4) * 0.35;
    const b = blinkAt(t, 3.1);
    eyes.forEach((e) => (e.scale.y = b));
  };
  g.userData.height = 3.0;
  g.userData.move = 'walk';
  return bake(g);
}

// ================= 🌊 海洋動物 =================
// 順滑身上嘅可愛大眼（眼白 + 眼珠 + 兩粒反光）；u 位置、ang 角度（0 = 右邊）、size 米
function sleekCuteEyes(dot, u, ang, size, len, rad, iris = 0x23303c) {
  for (const a of [ang, PI - ang]) {
    const up = a < PI / 2 ? 1 : -1; // 向背脊嗰邊轉
    const du = size / len;
    const da = size / rad;
    dot(u, a, size, size * 0.4, size * 1.12, 0xffffff, -size * 0.16);
    dot(u - du * 0.06, a - up * da * 0.06, size * 0.72, size * 0.34, size * 0.8, iris, size * 0.0);
    dot(u - du * 0.1, a - up * da * 0.08, size * 0.44, size * 0.34, size * 0.5, 0x0d0b0a, size * 0.07);
    dot(u - du * 0.32, a + up * da * 0.3, size * 0.22, size * 0.2, size * 0.24, 0xffffff, size * 0.15);
    dot(u + du * 0.25, a - up * da * 0.28, size * 0.1, size * 0.15, size * 0.11, 0xffffff, size * 0.14);
  }
}
// 順滑身上嘅面紅紅
function sleekBlush(dot, u, ang, size) {
  for (const a of [ang, PI - ang]) dot(u, a, size, size * 0.2, size * 1.2, BLUSH, -size * 0.12);
}

// 🐋 藍鯨：胖啲短啲（公仔款）、闊頭、大眼、笑笑口、喉嚨坑紋、背上淺色斑、細背鰭、長胸鰭、闊尾
function blueWhale() {
  const skin = 0x5079a0;
  const len = 5.0;
  const w = 1.5;
  const h = 1.3;
  return sleek({
    skin, belly: 0xc9d8e6, len, w, h, n: 2.3, belt: -0.3,
    prof: (u) => [noseIn(u, 0.22) * tailOut(u, 0.45, 0.1), noseIn(u, 0.3) * tailOut(u, 0.4, 0.17) * (0.86 + 0.14 * smooth01(0, 0.4, u)), -0.1 * (1 - smooth01(0, 0.35, u))],
    extras({ dot, fin, tail }) {
      const rand = seeded(7);
      sleekCuteEyes(dot, 0.2, -0.12, 0.16, len, w / 2);
      sleekBlush(dot, 0.16, -0.42, 0.12);
      for (const side of [0, 1]) for (let k = 0; k < 13; k++) {
        const a = -0.72 + k * 0.03 + (k > 9 ? (k - 9) * 0.05 : 0); // 笑口：嘴角向上
        dot(0.03 + k * 0.012, side ? PI - a : a, 0.035, 0.02, 0.05, 0x2f4a62, 0.004);
      }
      for (let i = -4; i <= 4; i++) for (let k = 0; k < 6; k++) dot(0.06 + k * 0.05, -PI / 2 + i * 0.14, 0.024, 0.012, 0.05, 0x9db2c6, 0.003); // 喉嚨坑紋
      for (const s of [-1, 1]) dot(0.17, PI / 2 + s * 0.1, 0.04, 0.02, 0.08, 0x2f4a62, 0.03); // 噴氣孔
      for (let i = 0; i < 24; i++) {
        const sz = 0.06 + rand() * 0.08;
        dot(0.24 + rand() * 0.58, PI / 2 + (rand() - 0.5) * 2.2, sz, 0.008, sz * 1.5, 0x6d91b3, -0.002);
      }
      fin(0.72, PI / 2, [[0.28, 0], [0.08, 0.1], [-0.1, 0.24], [-0.2, 0.22], [-0.16, 0.06], [-0.22, 0]], { key: 'bw3-dorsal', depth: 0.08 });
      const pecs = fin(0.3, -0.45, [[0, 0.16], [0.35, 0.12], [0.75, -0.02], [1.0, -0.2], [0.9, -0.27], [0.45, -0.16], [0, -0.12]], { plane: 'flat', key: 'bw3-pec', mirror: true, rot: [0, -0.35, -0.45], depth: 0.06 });
      const fluke = [[0, 0.1], [0.3, 0.04], [0.62, -0.12], [0.9, -0.36], [0.74, -0.36], [0.4, -0.28], [0.1, -0.33], [0, -0.24], [-0.1, -0.33], [-0.4, -0.28], [-0.74, -0.36], [-0.9, -0.36], [-0.62, -0.12], [-0.3, 0.04]];
      slab(tail, fluke, 0.07, skin, { plane: 'flat', key: 'bw3-fluke', bevel: 0.035, z: -0.06 });
      return pecs;
    },
  });
}

// 🐬 小頭鼠海豚：細細隻胖胖、灰背白肚、黑眼圈 + 黑嘴唇（似笑緊）、三角背鰭
function vaquita() {
  const skin = 0x84909a;
  const len = 1.6;
  const w = 0.6;
  return sleek({
    skin, belly: 0xedf0f2, len, w, h: 0.56, n: 2.2, belt: -0.15,
    prof: (u) => [noseIn(u, 0.24) * tailOut(u, 0.5, 0.12), noseIn(u, 0.28) * tailOut(u, 0.45, 0.18), -0.05 * (1 - smooth01(0, 0.3, u))],
    extras({ dot, fin, tail }) {
      for (const a of [-0.02, PI + 0.02]) dot(0.18, a, 0.14, 0.02, 0.15, 0x1d1d1d, -0.01); // 黑眼圈
      sleekCuteEyes(dot, 0.18, -0.02, 0.1, len, w / 2);
      sleekBlush(dot, 0.12, -0.5, 0.06);
      for (const side of [0, 1]) for (let k = 0; k < 9; k++) {
        const a = -0.95 + k * 0.07 + (k > 6 ? (k - 6) * 0.06 : 0);
        dot(0.015 + k * 0.012, side ? PI - a : a, 0.03, 0.02, 0.045, 0x1d1d1d, 0.004);
      }
      fin(0.45, PI / 2, [[0.22, 0], [0.05, 0.2], [-0.04, 0.34], [-0.1, 0.3], [-0.12, 0.08], [-0.18, 0]], { key: 'vq3-dorsal', depth: 0.05 });
      slab(tail, [[0, 0.06], [0.2, 0], [0.34, -0.14], [0.24, -0.18], [0.06, -0.14], [0, -0.1], [-0.06, -0.14], [-0.24, -0.18], [-0.34, -0.14], [-0.2, 0]], 0.04, skin, { plane: 'flat', key: 'vq3-fluke', bevel: 0.02 });
      return fin(0.3, -0.55, [[0, 0.06], [0.18, 0.02], [0.3, -0.1], [0.2, -0.12], [0, -0.06]], { plane: 'flat', key: 'vq3-pec', mirror: true, rot: [0, -0.3, -0.5], depth: 0.04, color: 0x2a2f33 });
    },
  });
}

// 🧜 儒艮：胖胖、向下彎嘅大鼻（有鬚）、大眼、海豚尾
function dugong() {
  const skin = 0xa1978d;
  const len = 2.4;
  const w = 1.05;
  const h = 0.88;
  return sleek({
    skin, belly: 0xd6cec4, len, w, h, n: 2.3, belt: -0.25,
    prof: (u) => [noseIn(u, 0.05) * (0.62 + 0.38 * noseIn(u, 0.3)) * tailOut(u, 0.5, 0.12), noseIn(u, 0.05) * (0.6 + 0.4 * noseIn(u, 0.3)) * tailOut(u, 0.44, 0.14), -0.15 * (1 - smooth01(0, 0.25, u))],
    extras({ head, dot, fin, tail }) {
      const snout = pivot(head, 0, -h * 0.18, 0.02);
      snout.rotation.x = 0.55;
      ball(snout, 0.36, 0.27, 0.22, 0xbab0a5, 0, -0.06, -0.08);
      ball(snout, 0.3, 0.22, 0.06, 0x968c82, 0, -0.08, -0.26);
      for (let i = 0; i < 10; i++) ball(snout, 0.018, 0.018, 0.03, 0x5d5853, ((i % 5) - 2) * 0.1, -0.02 - Math.floor(i / 5) * 0.1, -0.31); // 鬚
      for (const s of [-1, 1]) ball(snout, 0.045, 0.03, 0.025, 0x4e4842, s * 0.09, 0.14, -0.24);
      smile(snout, 0.06, 0.012, 0, -0.2, -0.3, 0x4e4842);
      sleekCuteEyes(dot, 0.17, 0.12, 0.09, len, w / 2);
      sleekBlush(dot, 0.17, -0.3, 0.07);
      fin(0.3, -0.6, [[0, 0.08], [0.25, 0.04], [0.42, -0.12], [0.3, -0.18], [0, -0.08]], { plane: 'flat', key: 'dg3-pec', mirror: true, rot: [0, -0.2, -0.5], depth: 0.05 });
      slab(tail, [[0, 0.08], [0.3, 0.02], [0.56, -0.2], [0.44, -0.28], [0.16, -0.22], [0, -0.14], [-0.16, -0.22], [-0.44, -0.28], [-0.56, -0.2], [-0.3, 0.02]], 0.06, skin, { plane: 'flat', key: 'dg3-fluke', bevel: 0.03 });
      return [];
    },
  });
}

const SHARK_TAIL = [[0.08, 0], [0, 0.3], [-0.2, 0.65], [-0.46, 0.98], [-0.52, 0.92], [-0.38, 0.5], [-0.3, 0.08], [-0.36, -0.3], [-0.44, -0.52], [-0.34, -0.5], [-0.1, -0.24], [0.07, -0.1]];
const SHARK_DORSAL = [[0.3, 0], [0.18, 0.3], [0.02, 0.62], [-0.08, 0.86], [-0.18, 0.82], [-0.14, 0.4], [-0.24, 0.06], [-0.3, 0]];
const SHARK_PEC = [[0, 0.16], [0.3, 0.1], [0.6, -0.08], [0.8, -0.3], [0.68, -0.3], [0.32, -0.16], [0, -0.12]];

// 🦈 錘頭鯊：打橫嘅錘頭（波浪邊），兩頭有大眼；胖啲短啲
function hammerhead() {
  const skin = 0x7d8b98;
  const len = 2.5;
  return sleek({
    skin, belly: 0xeef1f3, len, w: 0.66, h: 0.66, kind: 'shark', n: 2.3, belt: -0.15,
    prof: (u) => [noseIn(u, 0.15) * tailOut(u, 0.34, 0.13), noseIn(u, 0.2) * tailOut(u, 0.32, 0.17), 0.08 * (1 - smooth01(0, 0.3, u))],
    extras({ head, dot, fin, tail }) {
      const hammer = pivot(head, 0, 0.06, 0.2);
      const half = [[0, 0.17], [0.16, 0.13], [0.32, 0.16], [0.48, 0.11], [0.64, 0.11], [0.78, 0.05], [0.83, -0.05], [0.77, -0.13], [0.56, -0.11], [0.3, -0.15], [0.12, -0.28]];
      const outline = [...half, [0, -0.33], ...half.slice(1).reverse().map(([x, y]) => [-x, y])];
      slab(hammer, outline, 0.1, skin, { plane: 'flat', key: 'hh3-hammer', bevel: 0.04 });
      slab(hammer, outline.map(([x, y]) => [x * 0.94, y * 0.85]), 0.04, 0xeef1f3, { plane: 'flat', key: 'hh3-belly', bevel: 0.02, y: -0.05 });
      for (const s of [-1, 1]) {
        const e = eye(hammer, s * 0.83, 0.03, -0.01, 0.075, { iris: 0x2f3a44, turn: PI / 2 - 0.25 });
        e.position.x += s * 0.02;
        blush(hammer, s * 0.55, -0.02, -0.15, 0.06);
      }
      for (const a of [-0.05, PI + 0.05]) for (let i = 0; i < 5; i++) dot(0.22 + i * 0.025, a, 0.12, 0.01, 0.012, 0x66717c, 0, 0); // 鰓
      for (let k = -4; k <= 4; k++) dot(0.11 + Math.abs(k) * 0.006 - (Math.abs(k) > 2 ? 0.012 : 0), -PI / 2 + k * 0.15, 0.035, 0.012, 0.022, 0x3d454d, 0.003); // 笑口
      fin(0.36, PI / 2, SHARK_DORSAL.map(([x, y]) => [x * 0.9, y * 0.75]), { key: 'hh3-dorsal', depth: 0.05 });
      fin(0.72, PI / 2, SHARK_DORSAL.map(([x, y]) => [x * 0.3, y * 0.2]), { key: 'hh3-dorsal2', depth: 0.04 });
      slab(tail, SHARK_TAIL.map(([x, y]) => [x * 0.75, y * 0.75]), 0.05, skin, { plane: 'side', key: 'hh3-tail', bevel: 0.02, z: -0.04 });
      return fin(0.28, -0.55, SHARK_PEC.map(([x, y]) => [x * 0.75, y * 0.75]), { plane: 'flat', key: 'hh3-pec', mirror: true, rot: [0, -0.3, -0.5], depth: 0.04 });
    },
  });
}

// 🦈 鯨鯊：闊扁頭、大闊口（笑緊）、成身白點同淺色直紋、背脊有三條凸線
function whaleShark() {
  const skin = 0x3f6080;
  const len = 4.0;
  const w = 1.35;
  return sleek({
    skin, belly: 0xe8ecef, len, w, h: 0.9, kind: 'shark', n: 2.8, belt: -0.4,
    prof: (u) => [noseIn(u, 0.06) * tailOut(u, 0.42, 0.1), noseIn(u, 0.14) * tailOut(u, 0.4, 0.15) * (0.7 + 0.3 * smooth01(0, 0.35, u)), 0],
    extras({ dot, fin, tail }) {
      const rand = seeded(11);
      for (let k = 0; k <= 16; k++) {
        const a = -0.3 - k * ((PI - 0.6) / 16);
        const curve = Math.abs(k - 8) > 6 ? 0.008 : 0; // 嘴角向上
        dot(0.012 + curve, a + (k < 8 ? 1 : -1) * curve * 6, 0.07, 0.03, 0.04, 0x22313f, 0.004);
      }
      sleekCuteEyes(dot, 0.085, 0.0, 0.11, len, w / 2);
      sleekBlush(dot, 0.07, -0.35, 0.08);
      for (const a of [-0.12, PI + 0.12]) for (let i = 0; i < 5; i++) dot(0.19 + i * 0.022, a, 0.15, 0.012, 0.014, 0x2b4256, 0);
      for (const r of [0.38, 0.8, 1.2]) for (const a of [r, PI - r]) for (let k = 0; k < 15; k++) dot(0.24 + k * 0.04, a, 0.03, 0.025, 0.06, 0x5a7896, 0);
      for (let row = 0; row < 14; row++) {
        const u = 0.14 + row * 0.054;
        const size = 0.07 * (1 - u * 0.45);
        for (let a = 0.12 + (row % 2) * 0.13; a < PI - 0.1; a += 0.26) dot(u + (rand() - 0.5) * 0.012, a, size, 0.012, size, WHITE, 0.004);
        if (row % 2) for (const a of [0.1, PI - 0.1]) dot(u + 0.026, a, 0.014, 0.01, 0.014, WHITE, 0.004);
      }
      fin(0.5, PI / 2, SHARK_DORSAL.map(([x, y]) => [x * 1.3, y * 0.8]), { key: 'ws3-dorsal', depth: 0.08 });
      fin(0.8, PI / 2, SHARK_DORSAL.map(([x, y]) => [x * 0.45, y * 0.3]), { key: 'ws3-dorsal2', depth: 0.05 });
      slab(tail, SHARK_TAIL.map(([x, y]) => [x * 1.2, y * 1.1]), 0.07, skin, { plane: 'side', key: 'ws3-tail', bevel: 0.03, z: -0.06 });
      return fin(0.25, -0.75, SHARK_PEC.map(([x, y]) => [x * 1.3, y * 1.15]), { plane: 'flat', key: 'ws3-pec', mirror: true, rot: [0, -0.3, -0.35], depth: 0.06 });
    },
  });
}

// 🐟 魔鬼魚：闊闊三角翼（深色背、白肚、背上白色 V 斑）、捲捲頭鰭、大眼、笑口、幼長尾
function manta() {
  const top = 0x34404f;
  const belly = 0xf2f4f5;
  const g = new THREE.Group();
  const root = pivot(g, 0, 0.95, 0);
  ball(root, 0.4, 0.17, 0.64, top, 0, 0, 0.02);
  ball(root, 0.36, 0.09, 0.58, belly, 0, -0.07, 0.02);
  const INNER = [[0, 0.52], [0.45, 0.38], [0.95, 0.12], [0.95, -0.28], [0.45, -0.4], [0, -0.48]];
  const OUTER = [[0, 0.12], [0.42, -0.06], [0.9, -0.42], [0.6, -0.4], [0.25, -0.33], [0, -0.28]];
  const wings = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.24, 0, 0);
    p.scale.x = s;
    slab(p, INNER, 0.11, top, { plane: 'flat', key: 'mt3-in', bevel: 0.045 });
    slab(p, INNER.map(([x, y]) => [x * 0.96, y * 0.9]), 0.04, belly, { plane: 'flat', key: 'mt3-in-b', bevel: 0.02, y: -0.065 });
    const v = box(p, 0.46, 0.03, 0.22, 0xe3e8ec, 0.3, 0.1, 0.12, 0.45); // 背上白斑（V 字一邊）
    v.rotation.y = -0.4;
    const tip = pivot(p, 0.93, 0, 0);
    slab(tip, OUTER, 0.09, top, { plane: 'flat', key: 'mt3-out', bevel: 0.035 });
    slab(tip, OUTER.map(([x, y]) => [x * 0.94, y * 0.88]), 0.03, belly, { plane: 'flat', key: 'mt3-out-b', bevel: 0.015, y: -0.055 });
    return { p, tip, s };
  });
  const lobes = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.3, -0.02, -0.56);
    slab(p, [[0, 0.06], [0.2, 0.05], [0.38, -0.02], [0.42, -0.14], [0.32, -0.17], [0.18, -0.08], [0, -0.06]], 0.08, top, { plane: 'side', key: 'mt3-lobe', bevel: 0.03 });
    ball(p, 0.03, 0.04, 0.12, belly, 0, -0.08, -0.14);
    return p;
  });
  const eyes = [-1, 1].map((s) => {
    const e = eye(root, s * 0.2, 0.1, -0.5, 0.085, { iris: 0x34404c, turn: 0.45 }); // 眼喺頭頂前面（公仔款）
    e.rotation.x = -0.35;
    return e;
  });
  for (const s of [-1, 1]) blush(root, s * 0.3, 0.06, -0.52, 0.05, s * -0.5);
  smile(root, 0.17, 0.02, 0, -0.04, -0.64, 0x14181c);
  box(root, 0.42, 0.04, 0.05, 0x9aa6b0, 0, -0.1, -0.6, 0.3);
  for (let i = 0; i < 5; i++) box(root, 0.38, 0.015, 0.03, 0xc5ccd2, 0, -0.165, -0.32 + i * 0.07, 0.3); // 肚底鰓縫
  const tail = pivot(root, 0, 0, 0.6);
  cyl(tail, 0.04, 0.015, 1.3, top, 0, 0, 0.65).rotation.x = PI / 2;
  g.userData.animate = (t, moving) => {
    const sp = 2.2 + moving * 1.2;
    wings.forEach(({ p, tip, s }) => {
      p.rotation.z = s * Math.sin(t * sp) * 0.32;
      tip.rotation.z = Math.sin(t * sp - 0.8) * 0.42;
    });
    lobes.forEach((l, i) => (l.rotation.x = Math.sin(t * 3 + i) * 0.15));
    tail.rotation.y = Math.sin(t * 2) * 0.15;
    root.rotation.x = Math.sin(t * sp - 1.4) * 0.06;
    root.position.y = 0.95 + Math.sin(t * sp - 1) * 0.12;
    const b = blinkAt(t, 0.5);
    eyes.forEach((e) => (e.scale.y = b));
  };
  g.userData.height = 1.3;
  g.userData.move = 'swim';
  return bake(g);
}

// 🐢 海龜：圓拱殼（六角形殼片 + 殼邊）、淺色肚殼、大眼鳥嘴頭、頭同鰭有淺色鱗、長前鰭（似翼咁撥）
function seaTurtle() {
  const shell = 0x5e4a2c;
  const scute = 0x9a7a45;
  const scuteHi = 0xb8945a;
  const rim = 0x4c3b22;
  const skin = 0x7f9a68;
  const scale = 0xdcd6a0;
  const g = new THREE.Group();
  const root = pivot(g, 0, 0.55, 0);
  const A = 0.72;
  const B = 0.36;
  const C = 0.9;
  const CY = 0.02;
  ball(root, A, B, C, shell, 0, CY, 0);
  ball(root, A * 0.94, 0.1, C * 0.94, 0xeedfb0, 0, -0.04, 0); // 肚殼
  // 殼片：喺拱面上面貼六角形
  const UP = new THREE.Vector3(0, 1, 0);
  const plate = (x, z, r, color) => {
    const k = 1 - (x / A) ** 2 - (z / C) ** 2;
    if (k <= 0.02) return;
    const y = CY + B * Math.sqrt(k);
    const n = new THREE.Vector3(x / (A * A), (y - CY) / (B * B), z / (C * C)).normalize();
    const m = cyl(root, r, r * 1.06, 0.05, color, x + n.x * 0.005, y, z + n.z * 0.005, 6);
    m.quaternion.setFromUnitVectors(UP, n);
    m.scale.set(1, 1, 1.12);
  };
  for (let i = 0; i < 5; i++) plate(0, -0.56 + i * 0.28, 0.15, i % 2 ? scute : scuteHi);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) plate(s * 0.36, -0.44 + i * 0.29, 0.14, i % 2 ? scuteHi : scute);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * PI * 2;
    const m = box(root, 0.16, 0.08, 0.14, rim, Math.sin(a) * A * 0.98, CY + 0.02, -Math.cos(a) * C * 0.98, 0.4); // 殼邊
    m.rotation.y = -a;
  }
  // 頭
  const head = pivot(root, 0, 0.1, -0.86);
  head.scale.setScalar(1.3);
  ball(head, 0.15, 0.14, 0.2, skin, 0, -0.02, 0.06); // 頸
  ball(head, 0.24, 0.21, 0.25, skin, 0, 0.04, -0.17);
  for (const [x, y, z, r] of [[0, 0.22, -0.2, 0.06], [-0.09, 0.2, -0.1, 0.045], [0.09, 0.2, -0.1, 0.045], [0, 0.2, -0.04, 0.05], [-0.15, 0.12, -0.24, 0.04], [0.15, 0.12, -0.24, 0.04]]) ball(head, r, r * 0.35, r, scale, x, y, z);
  slab(head, [[0, 0.06], [0.1, 0.05], [0.16, -0.02], [0.14, -0.08], [0, -0.06]], 0.14, 0xb6a774, { plane: 'side', key: 'tt3-beak', bevel: 0.03, y: -0.04, z: -0.36 });
  smile(head, 0.06, 0.012, 0, -0.06, -0.41, 0x4c4430);
  const eyes = [-1, 1].map((s) => eye(head, s * 0.15, 0.08, -0.33, 0.075, { iris: 0x2b2416, turn: 0.55 }));
  for (const s of [-1, 1]) blush(head, s * 0.17, -0.04, -0.3, 0.045, s * -0.7);
  // 鰭：前面兩塊長長似翼、後面兩塊細
  const FRONT = [[0, 0.1], [0.3, 0.12], [0.62, 0.04], [0.9, -0.1], [0.82, -0.18], [0.5, -0.16], [0.2, -0.14], [0, -0.1]];
  const BACK = [[0, 0.1], [0.2, 0.08], [0.32, -0.04], [0.24, -0.16], [0.08, -0.14], [0, -0.1]];
  const flippers = [[-1, -0.42, FRONT, 'tt3-ff'], [1, -0.42, FRONT, 'tt3-ff'], [-1, 0.6, BACK, 'tt3-bf'], [1, 0.6, BACK, 'tt3-bf']].map(([s, z, pts, key], i) => {
    const p = pivot(root, s * 0.6, -0.02, z);
    p.rotation.y = s * (i < 2 ? -0.35 : 0.6);
    const q = pivot(p);
    q.scale.x = s;
    slab(q, pts, 0.07, skin, { plane: 'flat', key, bevel: 0.03 });
    if (i < 2) for (let k = 0; k < 3; k++) ball(q, 0.05, 0.02, 0.05, scale, 0.25 + k * 0.22, 0.04, 0.0);
    return { p, s, i };
  });
  g.userData.animate = (t, moving) => {
    const sp = 2.2 + moving;
    flippers.forEach(({ p, s, i }) => {
      p.rotation.z = s * Math.sin(t * sp + (i < 2 ? 0 : 1.2)) * (0.3 + moving * 0.25);
      p.rotation.x = i < 2 ? Math.sin(t * sp - 0.6) * 0.25 : 0;
    });
    head.rotation.y = Math.sin(t * 0.8) * 0.3;
    head.rotation.x = Math.sin(t * 1.3) * 0.08;
    root.position.y = 0.55 + Math.sin(t * 1.5) * 0.08;
    const b = blinkAt(t, 2.6);
    eyes.forEach((e) => (e.scale.y = b));
  };
  g.userData.height = 1.05;
  g.userData.move = 'swim';
  return bake(g);
}

// ================= 🦜 雀 =================
// 胖胖蛋形身 + 大圓頭（公仔比例）、側前面嘅大眼、有形嘅嘴（側面睇係勾嘴）、
// 翼係三段羽毛（肩、中、飛羽，可以唔同色），收埋喺身兩邊；飛嗰陣打開拍翼；長尾羽
const BEAKS = {
  parrot: { up: [[0, 0.13], [0.12, 0.14], [0.22, 0.07], [0.27, -0.05], [0.24, -0.17], [0.17, -0.13], [0.12, -0.04], [0, -0.03]], low: [[0, -0.02], [0.12, -0.04], [0.13, -0.1], [0.05, -0.14], [0, -0.1]], w: 0.17 },
  raptor: { up: [[0, 0.15], [0.14, 0.17], [0.27, 0.09], [0.33, -0.04], [0.3, -0.15], [0.24, -0.09], [0.19, -0.03], [0, -0.04]], low: [[0, -0.03], [0.16, -0.05], [0.17, -0.1], [0, -0.11]], w: 0.13 },
  condor: { up: [[0, 0.08], [0.2, 0.09], [0.3, 0.03], [0.34, -0.08], [0.29, -0.11], [0.26, -0.04], [0, -0.03]], low: [[0, -0.03], [0.22, -0.04], [0.21, -0.09], [0, -0.09]], w: 0.12 },
  short: { up: [[0, 0.07], [0.12, 0.04], [0.25, -0.01], [0.12, -0.02], [0, -0.02]], low: [[0, -0.02], [0.2, -0.02], [0.1, -0.06], [0, -0.07]], w: 0.1 },
};
const WING_ZONES = [
  [[0, 0.07], [0.3, 0.1], [0.46, 0.07], [0.48, -0.14], [0.4, -0.3], [0.2, -0.34], [0, -0.3]],
  [[0.36, 0.08], [0.6, 0.07], [0.72, 0.0], [0.74, -0.2], [0.62, -0.32], [0.38, -0.32]],
  [[0.6, 0.05], [0.8, 0.02], [0.98, -0.06], [1.06, -0.17], [0.92, -0.25], [0.74, -0.3], [0.6, -0.3]],
];
function birdie(o) {
  const {
    key, body, chest = body, head: headC = body, wing = body, wingMid = wing, wingTip = wingMid, tail: tailC = wing, tailTip = tailC,
    beak = 0x2b2b2b, beakLow = beak, beakType = 'parrot', beakK = 0.72, iris = 0x2a1a10, eyeRing = null, eyeRingK = 1.45, face = null, legC = 0x7d7d7d,
    size = 1, tailLen = 0.6, tailW = 0.22, chunky = false, flightless = false, more,
  } = o;
  const g = new THREE.Group();
  const root = pivot(g);
  const legH = chunky ? 0.26 : 0.34;
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.13, legH + 0.06, 0.02);
    ball(hip, 0.085, 0.08, 0.085, chest, 0, 0, 0); // 腳毛
    cyl(hip, 0.035, 0.03, legH, legC, 0, -legH / 2, 0, 8);
    for (const [tx, tz, ry] of [[-0.035, -0.06, 0.3], [0.035, -0.06, -0.3], [-0.03, 0.05, -0.3], [0.03, 0.05, 0.3]]) {
      const toe = box(hip, 0.04, 0.035, 0.12, legC, tx, -legH + 0.015, tz, 0.4); // 兩隻腳趾向前、兩隻向後
      toe.rotation.y = ry;
    }
    return hip;
  });
  const bodyY = legH + (chunky ? 0.36 : 0.34);
  const torso = pivot(root, 0, bodyY, 0);
  const bw = chunky ? 0.42 : 0.33;
  ball(torso, bw, chunky ? 0.42 : 0.4, chunky ? 0.42 : 0.36, body, 0, 0, 0.03);
  ball(torso, bw * 0.82, chunky ? 0.34 : 0.32, 0.2, chest, 0, -0.03, -0.17); // 心口
  // 頭
  const head = pivot(torso, 0, chunky ? 0.44 : 0.46, -0.08);
  const hr = chunky ? 0.32 : 0.29;
  ball(head, hr, hr * 0.96, hr * 0.98, headC, 0, 0, 0);
  if (face) ball(head, hr * 0.8, hr * 0.66, hr * 0.5, face, 0, -0.04, -hr * 0.53); // 面（淺色／唔同色）
  const eyes = [-1, 1].map((s) => eye(head, s * hr * 0.6, 0.04, -hr * 0.66, 0.08, { iris, turn: 0.55, ring: eyeRing, ringK: eyeRingK }));
  for (const s of [-1, 1]) blush(head, s * hr * 0.72, -0.08, -hr * 0.55, 0.05, s * -0.75);
  const B = BEAKS[beakType];
  const bk = (pts) => pts.map(([x, y]) => [x * beakK, y * beakK]);
  taperSlab(head, bk(B.up), B.w * beakK, beak, { key: `bk-${beakType}-up-${beakK}`, y: -0.04, z: -hr * 0.86 });
  taperSlab(head, bk(B.low), B.w * beakK * 0.85, beakLow, { key: `bk-${beakType}-lo-${beakK}`, bevel: 0.02, y: -0.04, z: -hr * 0.86, taper: 0.5 });
  // 翼
  const span = chunky ? 0.62 : 0.78;
  const chord = chunky ? 0.36 : 0.42;
  const wings = [-1, 1].map((s) => {
    const shoulder = pivot(torso, s * bw * 0.86, 0.14, -0.08);
    const mir = pivot(shoulder);
    mir.scale.x = s;
    const A = pivot(mir);
    const Bp = pivot(A);
    [wing, wingMid, wingTip].forEach((c, i) => {
      slab(Bp, WING_ZONES[i].map(([x, y]) => [x * span, y * chord]), 0.085 - i * 0.015, c, { plane: 'flat', key: `wg-${key}-${i}`, bevel: 0.03 });
    });
    return { shoulder, A, B: Bp, s };
  });
  // 尾
  const tail = pivot(torso, 0, -0.24, 0.26);
  const TL = tailLen;
  const TW = tailW;
  slab(tail, [[-TW / 2, 0.04], [TW / 2, 0.04], [TW * 0.42, -TL * 0.66], [-TW * 0.42, -TL * 0.66]], 0.05, tailC, { plane: 'flat', key: `tl-${key}-a`, bevel: 0.02, smooth: false });
  slab(tail, [[-TW * 0.42, -TL * 0.62], [TW * 0.42, -TL * 0.62], [TW * 0.2, -TL * 0.92], [0, -TL], [-TW * 0.2, -TL * 0.92]], 0.065, tailTip, { plane: 'flat', key: `tl-${key}-b`, bevel: 0.02 });
  const parts = { g, root, torso, head, hr, wings, tail, legs, eyes, animate: null };
  more?.(parts);
  const fold = (k) => wings.forEach(({ shoulder, A, B: Bp }) => {
    shoulder.rotation.x = 0.55 * k; // 收埋嘅翼向後向下（貼住身）
    A.rotation.y = -PI / 2 * k;
    Bp.rotation.x = (PI / 2) * k;
  });
  g.scale.setScalar(size);
  g.userData.move = flightless ? 'walk' : 'fly';
  g.userData.animate = (t, moving) => {
    const b = blinkAt(t, size * 3);
    eyes.forEach((e) => (e.scale.y = b));
    parts.animate?.(t, moving);
    if (g.userData.flying) {
      legs.forEach((l) => (l.rotation.x = 1.2));
      torso.rotation.x = -0.75;
      head.rotation.x = 0.7;
      head.rotation.y = 0;
      head.rotation.z = 0;
      fold(0.12);
      const f = Math.sin(t * 11);
      wings.forEach(({ shoulder, s }) => (shoulder.rotation.z = s * f * 0.75));
      tail.rotation.x = 0.15;
      root.position.y = Math.sin(t * 11 - 1) * 0.04;
      return;
    }
    // 企喺度／行路：翼收埋，間中拍兩下
    const burst = Math.max(0, Math.sin(t * 1.1)) > 0.92 ? 1 : 0;
    fold(1 - burst * 0.75);
    wings.forEach(({ shoulder, s }) => (shoulder.rotation.z = burst ? s * (0.4 + Math.sin(t * 22) * 0.4) : 0));
    torso.rotation.x = -0.12 + Math.sin(t * 2) * 0.025 + (flightless ? Math.sin(t * 10) * 0.05 * moving : 0);
    torso.rotation.z = flightless ? Math.sin(t * 10) * 0.12 * moving : 0; // 搖下搖下咁行（鴞鸚鵡）
    head.rotation.x = 0.12;
    head.rotation.y = Math.sin(t * 1.7) * 0.45 * (1 - moving);
    head.rotation.z = Math.sin(t * 0.9) * 0.16;
    legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 10 + i * PI) * 0.6 * moving));
    root.position.y = Math.abs(Math.sin(t * 10)) * 0.05 * moving;
    tail.rotation.x = 0.75 + Math.sin(t * 2.5) * 0.05;
    tail.rotation.y = Math.sin(t * 2.5) * 0.08;
  };
  g.userData.height = bodyY + (chunky ? 0.44 : 0.46) + hr;
  return bake(g);
}

// 毛毛冠（鷹：成個頭後面一圈尖毛；八哥：頭頂一撮長毛向後）
function crest(head, hr, n, color, tipColor, len, spread, lift = 0.15) {
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : i / (n - 1) - 0.5;
    const p = pivot(head, f * hr * 1.1, hr * 0.55 - Math.abs(f) * hr * 0.4, hr * 0.2);
    p.rotation.set(0.9 + lift - Math.abs(f) * 0.3, 0, -f * spread);
    const L = len * (1 - Math.abs(f) * 0.35);
    slab(p, [[-0.05, 0], [0.05, 0], [0.02, L * 0.8], [0, L], [-0.02, L * 0.8]], 0.05, color, { key: `cr-${color}-${L.toFixed(2)}`, bevel: 0.02 });
    if (tipColor) ball(p, 0.025, 0.06, 0.03, tipColor, 0, L * 0.82, 0);
  }
}

const BIRDS = {
  "Spix's Macaw": () => birdie({
    key: 'spix', body: 0x3a7bd5, chest: 0x5e9ae6, head: 0xa8c3e6, wing: 0x2f6cc4, wingMid: 0x2658b0, wingTip: 0x1b4590,
    tail: 0x2f6cc4, tailTip: 0x1b4590, beak: 0x2b2b2b, iris: 0xd9a23a, eyeRing: 0x55606c, eyeRingK: 1.7, tailLen: 1.0, tailW: 0.2, legC: 0x6f6f6f,
  }),
  'Philippine Eagle': () => birdie({
    key: 'eagle', body: 0x6b4a2e, chest: 0xf7f2e6, head: 0xeadcc0, wing: 0x5f4128, wingMid: 0x4f3620, wingTip: 0x3c2916,
    tail: 0x5f4128, tailTip: 0x3c2916, beak: 0x5f7184, beakLow: 0x6f8296, beakType: 'raptor', beakK: 0.85, iris: 0x7fb6e6, legC: 0xf2c94c,
    size: 1.5, tailLen: 0.55, tailW: 0.3,
    more({ head, hr, legs }) {
      crest(head, hr, 9, 0xd6bd8c, 0x6b4a2e, 0.42, 2.4); // 獅子咁嘅毛冠
      crest(head, hr * 0.8, 6, 0xc4a472, null, 0.32, 2.0, 0.5);
      for (const l of legs) for (const [x, z] of [[-0.05, -0.15], [0.05, -0.15]]) cone(l, 0.018, 0.06, 0x222222, x, -0.33, z).rotation.x = -PI / 2 - 0.4; // 爪
    },
  }),
  Kakapo: () => birdie({
    key: 'kakapo', body: 0x7d9b36, chest: 0xc5bb5c, head: 0x9aab4c, face: 0xd8c983, wing: 0x6d8c2d, wingMid: 0x5f7d27, wingTip: 0x4e6a1f,
    tail: 0x6d8c2d, tailTip: 0x55701f, beak: 0xe6dcc4, beakK: 0.6, iris: 0x2a1a10, chunky: true, flightless: true, size: 1.15, tailLen: 0.36, tailW: 0.3, legC: 0xb0a0a0,
    more({ torso, head, hr }) {
      // 背上深色斑紋 + 面上鬚毛（似貓頭鷹）
      const rand = seeded(5);
      for (let i = 0; i < 18; i++) {
        const a = (rand() - 0.5) * 2.4;
        const y = (rand() - 0.3) * 0.6;
        const m = box(torso, 0.1, 0.025, 0.03, 0x3f5317, Math.sin(a) * 0.41, y, Math.cos(a) * 0.36 + 0.03, 0.3);
        m.rotation.y = a;
      }
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const w = box(head, 0.16, 0.012, 0.012, 0xefe6c0, s * 0.2, -0.1 - i * 0.04, -hr * 0.88, 0.3);
        w.rotation.z = s * (0.25 - i * 0.2);
      }
    },
  }),
  'Hyacinth Macaw': () => birdie({
    key: 'hyacinth', body: 0x2a4fbf, chest: 0x3560cf, head: 0x2f57c7, wing: 0x2446ad, wingMid: 0x1f3d99, wingTip: 0x1a3383,
    tail: 0x2446ad, tailTip: 0x1a3383, beak: 0x1f1f1f, beakK: 0.88, iris: 0x2a1a10, eyeRing: 0xffd600, tailLen: 1.15, tailW: 0.22, size: 1.3, legC: 0x4a4a4a,
    more({ head, hr }) {
      ball(head, 0.1, 0.035, 0.05, 0xffd600, 0, -0.14, -hr * 0.86); // 下嘴邊嘅黃色
    },
  }),
  'Sun Conure': () => birdie({
    key: 'conure', body: 0xffc21a, chest: 0xff9a1f, head: 0xffb81c, face: 0xff7a14, wing: 0xffc21a, wingMid: 0x7cc142, wingTip: 0x2a7fd8,
    tail: 0x7cc142, tailTip: 0x2a7fd8, beak: 0x2b2b2b, iris: 0x2a1a10, eyeRing: 0xf5f0e6, eyeRingK: 1.3, tailLen: 0.7, size: 0.85,
  }),
  'California Condor': () => birdie({
    key: 'condor', body: 0x1e1e1e, chest: 0x262626, head: 0xf08a6a, wing: 0x1a1a1a, wingMid: 0xf2f2f2, wingTip: 0x161616,
    tail: 0x1a1a1a, beak: 0xeadcbc, beakType: 'condor', beakK: 0.8, iris: 0xc62828, tailLen: 0.5, tailW: 0.3, size: 1.55, legC: 0xa0a0a0,
    more({ torso, head, hr }) {
      // 頸毛（黑色一圈尖毛）+ 光頭上面嘅皺紋同面紅
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * PI * 2;
        const p = pivot(torso, Math.sin(a) * 0.2, 0.28, Math.cos(a) * 0.18 - 0.05);
        p.rotation.set(Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9);
        cone(p, 0.07, 0.24, 0x111111, 0, 0.1, 0, 6);
      }
      ball(head, hr * 0.55, hr * 0.3, 0.1, 0xe2574c, 0, -0.14, -hr * 0.7); // 喉嚨紅色
    },
  }),
  'Bali Myna': () => birdie({
    key: 'myna', body: 0xf8f8f4, chest: 0xffffff, head: 0xf8f8f4, wing: 0xf0f0ea, wingMid: 0xf0f0ea, wingTip: 0x1d1d1d,
    tail: 0xf0f0ea, tailTip: 0x1d1d1d, beak: 0xf5cd47, beakType: 'short', beakK: 0.95, iris: 0x2a1a10, eyeRing: 0x2f7fe0, eyeRingK: 1.75, tailLen: 0.5, size: 0.8, legC: 0x8fa3b0,
    more({ head, hr }) {
      crest(head, hr * 0.7, 5, 0xffffff, null, 0.36, 0.8, -0.3); // 頭頂一撮白毛
    },
  }),
};

export const ANIMALS_20 = {
  'Giant Panda': panda,
  'African Savanna Elephant': () => elephant3(false),
  'African Forest Elephant': () => elephant3(true),
  'Black Rhinoceros': blackRhino,
  'Red Panda': redPanda,
  Okapi: okapi,

  'Manta Ray': manta,
  'Scalloped Hammerhead Shark': hammerhead,
  'Blue Whale': blueWhale,
  Vaquita: vaquita,
  'Sea Turtle': seaTurtle,
  'Whale Shark': whaleShark,
  Dugong: dugong,

  ...BIRDS,
};
