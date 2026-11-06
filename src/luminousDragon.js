// 🐉 Luminous God Dragon（小朋友 Issue #16：⭐ Special's Stall 200 🤠 Tame Tokens；$/秒 = 你最勁嗰隻寵物 ×1.2）
// 照小朋友張參考圖：好長嘅方塊東方龍（一節節身）、紫色身 + 每節兩邊發光嘅粉紅／白色月牙紋、背脊一排紫色尖刺、
// 發白光嘅眼、大大個張開嘅口（白色牙）、身邊有紫色閃電同能量漩渦、頭頂有個月牙
// 全部面向 -z（頭喺 -z，尾喺 +z）；回傳 Group：userData.animate(time, moving)、userData.height、userData.move = 'fly'
// 身體一節節跟住波浪郁（好似喺天上游水），飛得快啲波浪快啲

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const PI = Math.PI;
const N = 16; // 幾多節身
const GAP = 0.36; // 每節距離

// ---------- 物料（全部共用）----------
const std = (color, emissive = 0x000000, ei = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, roughness: 0.45, ...extra });
const MAT = {
  body: std(0x4a1a8c, 0x2a0a5a, 0.55),
  body2: std(0x36106e, 0x1e0646, 0.5),
  belly: std(0xc9a8ff, 0x7c4dff, 0.55),
  panel: std(0xffd6ff, 0xff3fd2, 2.3),
  panelWhite: std(0xffffff, 0xf3e5ff, 2.6),
  spike: std(0x6a1bd1, 0x8e24ff, 0.9),
  spikeTip: std(0xf3c6ff, 0xe040fb, 2.2),
  horn: std(0xe9d5ff, 0xb388ff, 0.55),
  eye: std(0xffffff, 0xffffff, 3.2),
  mouth: std(0x2a0636, 0x4a0050, 0.4),
  tongue: std(0xff4fa3, 0xc2185b, 0.4),
  tooth: std(0xffffff, 0xffffff, 0.35),
  claw: std(0xf3e5ff, 0xb388ff, 0.8),
  whisker: std(0xf8bbff, 0xe040fb, 1.6),
  moon: new THREE.MeshBasicMaterial({ color: 0xfff6ff }),
  moonGlow: new THREE.MeshBasicMaterial({ color: 0xd59cff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
  swirl: new THREE.MeshBasicMaterial({ color: 0xc06bff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  bolt: new THREE.LineBasicMaterial({ color: 0xe6b3ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
};

// ---------- 形狀（共用）----------
const geoCache = new Map();
const rbox = (w, h, d, r = 0.2) => {
  const k = `${w}|${h}|${d}|${r}`;
  if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * r));
  return geoCache.get(k);
};
// 月牙：外圓減內圓（側面貼喺身度）
function crescentGeo(thick = 0.04) {
  const s = new THREE.Shape();
  s.absarc(0, 0, 1, PI * 0.5, PI * 1.5, false);
  s.absarc(0.38, 0, 0.8, PI * 1.38, PI * 0.62, true);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 14 });
  g.translate(0, 0, -thick / 2);
  return g;
}
const CRESCENT = crescentGeo(0.05);
const MOON = crescentGeo(0.12);
const SPIKE = new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0);
const TOOTH = new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0).rotateX(PI); // 尖向下（底喺原點）
const SWIRL = new THREE.TorusGeometry(1, 0.035, 6, 48, PI * 1.4);

const mesh = (parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  parent.add(m);
  return m;
};

// ---------- 一節身（本地：+z = 向住個頭，x = 左右，y = 上）----------
function segment(i) {
  const k = 1 - (i / (N - 1)) * 0.62; // 越近尾越幼
  const w = 0.82 * k;
  const h = 0.74 * k;
  const g = new THREE.Group();
  mesh(g, rbox(w, h, 0.46, 0.25), i % 2 ? MAT.body2 : MAT.body);
  mesh(g, rbox(w * 0.78, h * 0.32, 0.4, 0.3), MAT.belly, 0, -h * 0.4, 0); // 肚
  // 兩邊發光月牙（大細一節一節咁變，好似參考圖咁一閃一閃）
  for (const s of [-1, 1]) {
    const c = mesh(g, CRESCENT, i % 3 === 1 ? MAT.panelWhite : MAT.panel, s * (w / 2 + 0.005), 0.02, 0, 0, s * PI / 2, 0, h * 0.34);
    c.rotation.z = s > 0 ? 0 : PI; // 兩邊都係「(」向頭
  }
  // 背脊尖刺 + 發光尖
  if (i < N - 1) {
    const sp = mesh(g, SPIKE, MAT.spike, 0, h / 2 - 0.02, -0.02, -0.35, PI / 4, 0, 0.12 * k + 0.03, 0.42 * k + 0.08, 0.12 * k + 0.03);
    mesh(sp, SPIKE, MAT.spikeTip, 0, 0.72, 0, 0, 0, 0, 0.45, 0.4, 0.45);
  }
  g.userData.k = k;
  return g;
}

// ---------- 頭（本地：+z = 向前）----------
function head() {
  const g = new THREE.Group();
  // 頭殼 + 長鼻
  mesh(g, rbox(0.9, 0.62, 0.7, 0.2), MAT.body, 0, 0.12, 0);
  mesh(g, rbox(0.68, 0.36, 0.72, 0.22), MAT.body, 0, 0.12, 0.62); // 上顎（鼻）
  mesh(g, rbox(0.5, 0.12, 0.3, 0.3), MAT.body2, 0, 0.32, 0.86); // 鼻樑
  for (const s of [-1, 1]) mesh(g, rbox(0.1, 0.08, 0.08, 0.3), MAT.panel, s * 0.17, 0.32, 0.99); // 鼻孔發光
  // 眉骨 + 發白光嘅眼
  for (const s of [-1, 1]) {
    mesh(g, rbox(0.3, 0.1, 0.22, 0.3), MAT.body2, s * 0.3, 0.42, 0.22, 0, 0, s * -0.25);
    mesh(g, rbox(0.2, 0.13, 0.08, 0.3), MAT.eye, s * 0.3, 0.3, 0.33);
  }
  // 上排牙
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) mesh(g, TOOTH, MAT.tooth, s * 0.27, 0.04, 0.38 + i * 0.13, 0, 0, 0, 0.035, 0.12, 0.035);
  mesh(g, TOOTH, MAT.tooth, 0, 0.04, 0.96, 0, 0, 0, 0.04, 0.14, 0.04);
  // 口入面（深紫）
  mesh(g, rbox(0.56, 0.06, 0.66, 0.3), MAT.mouth, 0, -0.06, 0.6);
  // 下顎（會開合）
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.12, 0.1);
  g.add(jaw);
  mesh(jaw, rbox(0.62, 0.18, 0.84, 0.25), MAT.body, 0, -0.08, 0.42);
  mesh(jaw, rbox(0.46, 0.06, 0.7, 0.3), MAT.mouth, 0, 0.02, 0.42);
  mesh(jaw, rbox(0.22, 0.05, 0.4, 0.4), MAT.tongue, 0, 0.05, 0.48);
  mesh(jaw, rbox(0.5, 0.08, 0.6, 0.3), MAT.belly, 0, -0.18, 0.4);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) mesh(jaw, SPIKE, MAT.tooth, s * 0.24, 0.0, 0.3 + i * 0.15, 0, 0, 0, 0.035, 0.12, 0.035);
  // 角：兩支向後分叉（鹿角款）
  for (const s of [-1, 1]) {
    const h = new THREE.Group();
    h.position.set(s * 0.26, 0.42, -0.15);
    h.rotation.set(-0.95, 0, s * -0.3);
    g.add(h);
    mesh(h, rbox(0.1, 0.62, 0.1, 0.3), MAT.horn, 0, 0.31, 0);
    mesh(h, rbox(0.08, 0.3, 0.08, 0.3), MAT.horn, s * 0.1, 0.42, 0, 0, 0, s * -0.7);
    mesh(h, SPIKE, MAT.spikeTip, 0, 0.6, 0, 0, PI / 4, 0, 0.06, 0.18, 0.06);
  }
  // 頸後鬃毛尖刺
  for (let i = 0; i < 5; i++) mesh(g, SPIKE, MAT.spike, (i - 2) * 0.17, 0.3, -0.32, -1.25, PI / 4, (i - 2) * 0.25, 0.08, 0.38 - Math.abs(i - 2) * 0.06, 0.08);
  // 龍鬚：兩條長長嘅發光鬚（會飄）
  const whiskers = [-1, 1].map((s) => {
    const w = new THREE.Group();
    w.position.set(s * 0.3, 0.18, 0.92);
    g.add(w);
    let p = w;
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, 0, i ? 0.2 : 0);
      p.add(seg);
      mesh(seg, rbox(0.04, 0.04, 0.22, 0.4), MAT.whisker, 0, 0, 0.1);
      parts.push(seg);
      p = seg;
    }
    w.rotation.y = s * 1.1;
    return { w, parts, s };
  });
  return { g, jaw, whiskers };
}

// 細腳仔 + 爪
function leg(parent, s, k) {
  const g = new THREE.Group();
  g.position.set(s * 0.36 * k, -0.24 * k, 0);
  parent.add(g);
  mesh(g, rbox(0.18, 0.4, 0.2, 0.3), MAT.body2, s * 0.05, -0.16, 0, 0, 0, s * 0.35);
  const foot = new THREE.Group();
  foot.position.set(s * 0.13, -0.36, 0.04);
  g.add(foot);
  mesh(foot, rbox(0.2, 0.1, 0.24, 0.3), MAT.belly);
  for (let c = 0; c < 3; c++) mesh(foot, SPIKE, MAT.claw, (c - 1) * 0.06, -0.02, 0.14, PI / 2, 0, 0, 0.025, 0.1, 0.025);
  return g;
}

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
  for (const i of [3, 10]) for (const s of [-1, 1]) legs.push({ g: leg(segs[i], s, segs[i].userData.k), s, i });
  const H = head();
  root.add(H.g);
  // 尾：最後一節後面一撮發光尖鰭
  const fin = new THREE.Group();
  segs[N - 1].add(fin);
  for (const [rz, sc] of [[0, 0.5], [0.7, 0.36], [-0.7, 0.36]]) mesh(fin, SPIKE, MAT.spikeTip, 0, 0, -0.16, -PI / 2 - 0.2, 0, rz, 0.09, sc, 0.09);
  // 頭頂月牙（參考圖嘅新月）
  const moon = new THREE.Group();
  moon.position.set(0, 2.85, -1.6);
  mesh(moon, MOON, MAT.moon, 0, 0, 0, 0, 0, -0.5, 0.42);
  mesh(moon, new THREE.CircleGeometry(1, 24), MAT.moonGlow, 0, 0, -0.08, 0, 0, 0, 0.8);
  moon.traverse((o) => (o.castShadow = false));
  moon.userData.noSaddle = true; // 🐎 量馬鞍位唔好計個月亮
  root.add(moon);
  // 能量漩渦（兩個斜斜嘅光環圍住個身轉）
  const swirls = [0, 1].map((i) => {
    const p = new THREE.Group();
    p.position.set(0, 1.2, 0.4);
    p.userData.noSaddle = true;
    root.add(p);
    const m = mesh(p, SWIRL, MAT.swirl, 0, 0, 0, PI / 2 + (i ? 0.5 : -0.4), 0, 0, 1.5 + i * 0.35, 1.5 + i * 0.35, 1.5 + i * 0.35);
    m.castShadow = false;
    return p;
  });
  // ⚡ 紫色閃電：幾條鋸齒線，每 0.08 秒重新畫（一閃一閃）
  const BOLTS = 3;
  const PTS = 7;
  const boltPos = new Float32Array(BOLTS * (PTS - 1) * 2 * 3);
  const boltGeo = new THREE.BufferGeometry();
  boltGeo.setAttribute('position', new THREE.BufferAttribute(boltPos, 3).setUsage(THREE.DynamicDrawUsage));
  const bolts = new THREE.LineSegments(boltGeo, MAT.bolt);
  bolts.frustumCulled = false;
  root.add(bolts);
  let nextBolt = 0;

  // 身體擺位：一條 S 形波浪（頭喺 -z），t = 時間、speed = 郁得幾快
  const pts = Array.from({ length: N + 1 }, () => new THREE.Vector3());
  const len = N * GAP;
  const place = (t, m) => {
    const f = 1.4 + m * 1.6;
    for (let i = 0; i <= N; i++) {
      const u = i / N; // 0 = 頭，1 = 尾
      const amp = 0.12 + u * 0.55;
      pts[i].set(Math.sin(t * f - i * 0.55) * amp, 1.25 + Math.sin(t * f * 0.75 - i * 0.42) * (0.18 + u * 0.3) + Math.sin(u * PI) * 0.35, -len * 0.5 + i * GAP - 0.2);
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
    // 頭：喺第 0 點前面，望住前面（-z）少少跟住波浪
    H.g.position.copy(pts[0]).add(_d.set(0, 0.12, -0.48));
    orient(H.g, pts[1], pts[0]);
    H.g.rotation.x += Math.sin(t * 1.1) * 0.08;
    for (let i = 0; i < N; i++) {
      const s = segs[i];
      s.position.copy(pts[i + 1]);
      orient(s, pts[i + 1], pts[i]);
    }
  };
  pose(0, 0);
  root.updateMatrixWorld(true);

  // 🐎 有馬鞍（saddle.js 加喺 g）：馬鞍跟住下面嗰節身上上落落
  let saddle;
  const saddleFollow = () => {
    if (saddle === undefined || (saddle && saddle.parent !== g)) {
      saddle = g.getObjectByName('saddle') || null;
      if (saddle) {
        pose(0, 0);
        const z = saddle.position.z;
        saddle.userData.seg = segs.reduce((a, b) => (Math.abs(b.position.z - z) < Math.abs(a.position.z - z) ? b : a));
        saddle.userData.dy = saddle.position.y - saddle.userData.seg.position.y;
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
    H.jaw.rotation.x = 0.35 + Math.max(0, Math.sin(t * 0.9)) * 0.35;
    for (const w of H.whiskers) w.parts.forEach((p, i) => (p.rotation.set(Math.sin(t * 3 - i * 0.7) * 0.25, w.s * Math.sin(t * 2.2 - i * 0.6) * 0.18, 0)));
    for (const l of legs) l.g.rotation.x = Math.sin(t * 4 + l.i + (l.s > 0 ? PI : 0)) * 0.5;
    moon.position.y = 2.85 + Math.sin(t * 1.3) * 0.12;
    moon.rotation.z = Math.sin(t * 0.7) * 0.1;
    swirls[0].rotation.y = t * 1.6;
    swirls[1].rotation.y = -t * 1.1;
    swirls[1].rotation.z = Math.sin(t * 0.8) * 0.3;
    MAT.panel.emissiveIntensity = 1.9 + Math.sin(t * 3.2) * 0.6;
    MAT.panelWhite.emissiveIntensity = 2.3 + Math.sin(t * 3.2 + 1.5) * 0.5;
    MAT.swirl.opacity = 0.4 + Math.sin(t * 2.4) * 0.2;
    // 閃電
    if (t >= nextBolt || t < nextBolt - 1) {
      nextBolt = t + 0.06 + Math.random() * 0.1;
      let k = 0;
      for (let b = 0; b < BOLTS; b++) {
        const on = Math.random() < 0.75;
        const a = pts[1 + Math.floor(Math.random() * (N - 2))];
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).normalize();
        let px = a.x;
        let py = a.y;
        let pz = a.z;
        for (let p = 0; p < PTS - 1; p++) {
          const nx = px + dir.x * 0.28 + (Math.random() - 0.5) * 0.3;
          const ny = py + dir.y * 0.28 + (Math.random() - 0.5) * 0.3;
          const nz = pz + dir.z * 0.28 + (Math.random() - 0.5) * 0.3;
          boltPos.set(on ? [px, py, pz, nx, ny, nz] : [0, 0, 0, 0, 0, 0], k);
          k += 6;
          px = nx;
          py = ny;
          pz = nz;
        }
      }
      boltGeo.attributes.position.needsUpdate = true;
    }
  };
  g.userData.height = 3.2;
  g.userData.move = 'fly';
  return g;
}
