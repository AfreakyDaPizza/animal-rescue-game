// Lv17 Inferno Sanctuary（小朋友 2026-10-18：「make the inferno thing cooler and add a baby pet dragon flying around you」）
// 跑步機／學生桌共用：熔岩裂紋機身、火山石門 + 熔岩瀑布、旋轉火龍捲、火焰圈、熱力光、熔岩泡泡、火花、
// 每次練到嘢就爆一圈火；仲有一隻 BB 火龍：你喺部機度練嘅時候圍住你飛，唔喺度就圍住部機飛

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const rbox = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2);
const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
const glowMat = (color, intensity = 2) => M(color, { emissive: color, emissiveIntensity: intensity });
const additive = (color, opacity, map = null) => new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

function add(group, geometry, material, x, y, z, shadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  group.add(mesh);
  return mesh;
}

// ---- 紋理 ----
function canvasTex(size, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// 黑色火山石 + 一條條發光熔岩裂紋（機身用：map 同 emissiveMap 都係佢，所以裂紋會發光）
function drawCracks(ctx, s, seed = 1) {
  let r = seed * 9301;
  const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  ctx.fillStyle = '#1b0d08';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(${40 + rand() * 30},${18 + rand() * 12},${10},${0.5})`;
    ctx.fillRect(rand() * s, rand() * s, 4 + rand() * 10, 4 + rand() * 10);
  }
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass ? '#fff176' : '#ff6d00';
    ctx.lineWidth = pass ? 1.5 : 5;
    ctx.shadowColor = '#ff3d00';
    ctx.shadowBlur = pass ? 4 : 14;
    r = seed * 9301; // 兩次畫同一啲線（粗橙 + 幼黃 = 發光核心）
    for (let k = 0; k < 9; k++) {
      let x = rand() * s;
      let y = rand() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 0; j < 7; j++) {
        x += (rand() - 0.5) * 70;
        y += (rand() - 0.5) * 70;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
}
let crackTex = null;
export function infernoTexture() {
  return (crackTex ??= canvasTex(256, (ctx, s) => drawCracks(ctx, s, 3)));
}

// 熔岩（流動）：橙黃色一條條波紋
const lavaTex = () => canvasTex(128, (ctx, s) => {
  const g = ctx.createLinearGradient(0, 0, s, 0);
  g.addColorStop(0, '#d84315');
  g.addColorStop(0.5, '#ff9100');
  g.addColorStop(1, '#d84315');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = i % 3 ? 'rgba(255,235,59,0.75)' : 'rgba(120,20,0,0.55)';
    ctx.fillRect(Math.random() * s, Math.random() * s, 6 + Math.random() * 30, 3 + Math.random() * 6);
  }
});

// 火龍捲：直條火焰紋（上面透明）
const tornadoTex = () => canvasTex(128, (ctx, s) => {
  for (let x = 0; x < s; x += 2) {
    const k = (Math.sin(x * 0.2) + Math.sin(x * 0.07 + 1)) * 0.25 + 0.5;
    const g = ctx.createLinearGradient(0, s, 0, 0);
    g.addColorStop(0, `rgba(255,${120 + k * 120},0,${0.9 * k})`);
    g.addColorStop(0.6, `rgba(255,${60 + k * 80},0,${0.6 * k})`);
    g.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 2, s);
  }
});

// 圓形光暈（熱力光、火花用）
const glowTex = () => canvasTex(128, (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,200,80,1)');
  g.addColorStop(0.35, 'rgba(255,110,0,0.55)');
  g.addColorStop(1, 'rgba(255,40,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}, false);

// 一堆石（合埋做一個 mesh，慳效能）
function rockPile(list, material) {
  const geos = list.map(([x, y, z, r, sy = 1, rot = 0]) => {
    const g = new THREE.DodecahedronGeometry(r, 0);
    g.scale(1, sy, 1);
    g.rotateY(rot);
    g.translate(x, y, z);
    return g;
  });
  const mesh = new THREE.Mesh(mergeGeometries(geos), material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// ================= BB 火龍（Roblox 方塊款：大頭、大眼、細翼、細角、紅橙色 + 黃肚） =================
export function buildBabyDragon() {
  const g = new THREE.Group();
  const body = new THREE.Group(); // 成隻（會上下 bob、會側身）
  g.add(body);
  const red = M(0xff5722, { emissive: 0x6d1b00, emissiveIntensity: 0.35 });
  const dark = M(0xd84315, { emissive: 0x4a1000, emissiveIntensity: 0.3 });
  const belly = M(0xffd54f, { emissive: 0x5d4000, emissiveIntensity: 0.3 });
  const horn = M(0xfff3e0);
  const black = M(0x111111, { roughness: 0.2 });
  const white = M(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.25 });
  const wingMat = M(0xff9800, { emissive: 0x7a2e00, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  const pink = M(0xff8a80);

  add(body, rbox(0.46, 0.42, 0.6), red, 0, 0, 0); // 身
  add(body, rbox(0.34, 0.3, 0.5), belly, 0, -0.08, 0.06); // 黃肚
  for (const [x, z] of [[-0.15, 0.18], [0.15, 0.18], [-0.15, -0.18], [0.15, -0.18]]) add(body, rbox(0.12, 0.16, 0.14), dark, x, -0.24, z); // 細腳仔
  // 大頭（比個身仲大，咁先可愛）
  const head = new THREE.Group();
  head.position.set(0, 0.3, 0.38);
  body.add(head);
  add(head, rbox(0.56, 0.5, 0.5), red, 0, 0, 0);
  add(head, rbox(0.38, 0.22, 0.26), red, 0, -0.1, 0.32); // 鼻
  add(head, rbox(0.3, 0.08, 0.22), belly, 0, -0.2, 0.32); // 下巴（黃色）
  for (const s of [-1, 1]) {
    add(head, rbox(0.05, 0.04, 0.03), black, s * 0.08, -0.04, 0.46, false); // 鼻窿
    add(head, rbox(0.17, 0.2, 0.04), white, s * 0.14, 0.06, 0.255, false); // 大眼（白）
    add(head, rbox(0.09, 0.13, 0.03), black, s * 0.13, 0.04, 0.275, false); // 眼仔
    add(head, rbox(0.04, 0.04, 0.02), white, s * 0.1, 0.08, 0.29, false); // 反光
    add(head, rbox(0.09, 0.05, 0.02), pink, s * 0.22, -0.08, 0.255, false); // 面珠紅紅
    const h = add(head, new THREE.ConeGeometry(0.06, 0.22, 6), horn, s * 0.15, 0.3, -0.08); // 細角
    h.rotation.x = -0.5;
    h.rotation.z = -s * 0.25;
  }
  // 背脊黃色細尖
  for (let k = 0; k < 3; k++) add(body, new THREE.ConeGeometry(0.05, 0.14, 4), belly, 0, 0.25, 0.12 - k * 0.18);
  // 細翼（兩邊會拍）：一條骨 + 一塊翼膜
  const wings = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.22, 0.14, 0.02);
    body.add(pivot);
    add(pivot, rbox(0.42, 0.05, 0.06), dark, s * 0.21, 0.02, 0.1);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.12);
    shape.lineTo(0.42, 0.14);
    shape.lineTo(0.5, -0.06);
    shape.lineTo(0.34, -0.2);
    shape.lineTo(0.2, -0.12);
    shape.lineTo(0.08, -0.2);
    shape.lineTo(0, -0.12);
    const memb = new THREE.Mesh(new THREE.ShapeGeometry(shape), wingMat);
    memb.rotation.x = -Math.PI / 2;
    if (s < 0) memb.scale.x = -1;
    memb.castShadow = true;
    pivot.add(memb);
    return { pivot, s };
  });
  // 尾（3 節，越嚟越細，尾尖有團火）
  const tail = new THREE.Group();
  tail.position.set(0, -0.02, -0.3);
  body.add(tail);
  let prev = tail;
  const tailParts = [];
  [[0.24, 0.2], [0.18, 0.18], [0.12, 0.16]].forEach(([w, l]) => {
    const seg = new THREE.Group();
    seg.position.z = prev === tail ? 0 : -l;
    prev.add(seg);
    add(seg, rbox(w, w * 0.85, l + 0.04), red, 0, 0, -l / 2);
    tailParts.push(seg);
    prev = seg;
  });
  const tailFlame = new THREE.Group();
  tailFlame.position.z = -0.2;
  prev.add(tailFlame);
  [[0xffeb3b, 0.06, 0.18], [0xff6d00, 0.1, 0.26]].forEach(([c, r, h]) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), additive(c, 0.9));
    f.rotation.x = -Math.PI / 2;
    f.position.z = -h / 2;
    tailFlame.add(f);
  });
  // 口噴出嚟嘅細火球（隔幾秒噴一次）
  const puffs = Array.from({ length: 6 }, (_, i) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), additive(i % 2 ? 0xffab00 : 0xff5722, 0.9));
    p.visible = false;
    head.add(p);
    return p;
  });
  g.userData = { body, head, wings, tailParts, tailFlame, puffs };
  return g;
}

function animateDragon(d, t) {
  const u = d.userData;
  const flap = Math.sin(t * 13);
  u.wings.forEach(({ pivot, s }) => (pivot.rotation.z = s * (0.25 + flap * 0.55)));
  u.body.position.y = Math.sin(t * 13 + 1.2) * 0.04; // 拍翼時上下郁
  u.head.rotation.x = Math.sin(t * 2.3) * 0.08;
  u.tailParts.forEach((seg, i) => (seg.rotation.y = Math.sin(t * 4 - i * 0.8) * 0.35));
  u.tailFlame.scale.setScalar(1 + Math.sin(t * 20) * 0.15);
  // 噴火：每 3.5 秒噴一次，0.7 秒
  const k = (t % 3.5) / 0.7;
  u.puffs.forEach((p, i) => {
    const q = k - i * 0.08;
    p.visible = q > 0 && q < 1;
    if (!p.visible) return;
    p.position.set(Math.sin(i * 2.1) * 0.05 * q, -0.08 + q * 0.05, 0.48 + q * 0.6);
    p.scale.setScalar(0.6 + q * 1.4);
    p.material.opacity = 0.9 * (1 - q);
  });
}

// ================= 成套 Inferno 特效 =================
// group：station.extras.inferno（喺部機嘅本地座標，機身大約 x ±1.6、z −2.8 … 2.9）
export function buildInferno(group) {
  const basalt = M(0x2b1510, { roughness: 0.85, flatShading: true, map: infernoTexture(), emissiveMap: infernoTexture(), emissive: 0xffffff, emissiveIntensity: 0.55 });
  const lava = glowMat(0xff6d00, 2.4);

  // 1. 火山石門（喺部機前面，框住個屏幕／黑板）+ 兩邊熔岩瀑布 + 熔岩池
  const GZ = -3.6;
  const rocks = [];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++) rocks.push([s * (2.95 + Math.sin(k * 1.7) * 0.12), 0.45 + k * 1.0, GZ + Math.cos(k) * 0.1, 0.62 - k * 0.03, 1.1, k]);
    rocks.push([s * 3.35, 0.35, GZ + 0.5, 0.5, 0.8, 2], [s * 3.3, 0.3, GZ - 0.5, 0.45, 0.7, 4]); // 腳下嘅石
  }
  for (let k = 0; k < 9; k++) {
    const x = -3.1 + k * 0.775;
    rocks.push([x, 6.45 + Math.sin(k * 0.9) * 0.15 - Math.abs(x) * 0.04 + (k === 4 ? 0.35 : 0), GZ, 0.55 + (k % 3) * 0.06, 0.9, k]);
  }
  group.add(rockPile(rocks, basalt));
  // 門頂中間：發光火焰徽章
  const emblem = new THREE.Group();
  emblem.position.set(0, 7.25, GZ + 0.35);
  group.add(emblem);
  add(emblem, new THREE.TorusGeometry(0.5, 0.09, 8, 28), lava, 0, 0, 0, false);
  const emblemFlames = [[0xffeb3b, 0.16, 0.55], [0xff9100, 0.26, 0.8], [0xff3d00, 0.36, 1.05]].map(([c, r, h]) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), additive(c, 0.85));
    f.position.y = -0.25 + h / 2;
    emblem.add(f);
    return f;
  });
  // 熔岩瀑布：由門頂流落嚟（紋理向下流）
  const fallTex = lavaTex();
  fallTex.repeat.set(1, 3);
  const fallMat = new THREE.MeshBasicMaterial({ map: fallTex, color: 0xffffff });
  const fallGlowMat = additive(0xff6d00, 0.35);
  for (const s of [-1, 1]) {
    const fall = add(group, new THREE.PlaneGeometry(0.7, 6.0), fallMat, s * 2.42, 3.2, GZ + 0.35, false);
    fall.rotation.y = -s * 0.35;
    const glow = add(group, new THREE.PlaneGeometry(1.4, 6.2), fallGlowMat, s * 2.4, 3.2, GZ + 0.45, false);
    glow.rotation.y = -s * 0.35;
  }
  // 熔岩池（門腳）
  const poolTex = lavaTex();
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex });
  const pools = [-1, 1].map((s) => {
    const p = add(group, new THREE.CircleGeometry(0.85, 20), poolMat, s * 2.4, 0.07, GZ + 0.7, false);
    p.rotation.x = -Math.PI / 2;
    return { x: s * 2.4, z: GZ + 0.7 };
  });

  // 2. 後面兩邊兩個細火盆（擺開啲、矮啲，唔好擋住第三身鏡頭）
  const braziers = [];
  for (const s of [-1, 1]) {
    const x = s * 3.7;
    const z = -1.9;
    add(group, new THREE.CylinderGeometry(0.24, 0.36, 1.2, 6), basalt, x, 0.6, z);
    add(group, new THREE.CylinderGeometry(0.42, 0.3, 0.26, 6), lava, x, 1.3, z);
    const fl = new THREE.Group();
    [[0xffeb3b, 0.14, 0.5], [0xff9100, 0.22, 0.8], [0xff3d00, 0.3, 1.05]].forEach(([c, r, h]) => {
      const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), additive(c, 0.6));
      f.position.y = h / 2;
      fl.add(f);
    });
    fl.position.set(x, 1.4, z);
    group.add(fl);
    braziers.push(fl);
  }

  // 3. 地上：熱力光 + 熔岩圈 + 圍住轉嘅火舌（火焰圈）
  const heat = add(group, new THREE.PlaneGeometry(10, 11), additive(0xffffff, 0.4, glowTex()), 0, 0.06, 0, false);
  heat.rotation.x = -Math.PI / 2;
  const ring = add(group, new THREE.RingGeometry(3.15, 3.5, 48), additive(0xff6d00, 0.85), 0, 0.09, 0, false);
  ring.rotation.x = -Math.PI / 2;
  const tongues = new THREE.Group();
  group.add(tongues);
  const tongueList = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 6), additive(i % 2 ? 0xff9100 : 0xffc400, 0.6));
    f.position.set(Math.cos(a) * 3.32, 0.38, Math.sin(a) * 3.6);
    tongues.add(f);
    return f;
  });

  // 4. 兩個圍住部機慢慢轉嘅火龍捲
  const tTex = tornadoTex();
  const tornadoes = [0, 1].map((i) => {
    const t = new THREE.Group();
    group.add(t);
    const shells = [[0.12, 0.55, 1.6, 0], [0.4, 0.95, 1.6, 1.5], [0.25, 0.7, 2.6, 0.2]].map(([r0, r1, h, y], k) => {
      const tex = tTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(2 + k, 1);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 20, 1, true), additive(k === 1 ? 0xffab40 : 0xffd180, 0.5, tex));
      m.position.y = y + h / 2;
      t.add(m);
      return m;
    });
    // 螺旋火花（圍住個龍捲向上轉）
    const N = 42;
    const pos = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const spiral = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffd180, size: 0.22, map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    spiral.frustumCulled = false;
    t.add(spiral);
    return { t, shells, phase: i * Math.PI, spiral: { pos, geo, N } };
  });

  // 5. 熔岩泡泡（熔岩池 + 熔岩圈度）
  const bubbleMat = glowMat(0xffab00, 2.6);
  const bubbles = Array.from({ length: 14 }, (_, i) => {
    const b = add(group, new THREE.SphereGeometry(0.12, 10, 8), bubbleMat, 0, 0, 0, false);
    const onPool = i < 6;
    const a = Math.random() * Math.PI * 2;
    const at = onPool ? { x: pools[i % 2].x + Math.cos(a) * 0.45, z: pools[i % 2].z + Math.sin(a) * 0.45 } : { x: Math.cos(a) * 3.32, z: Math.sin(a) * 3.6 };
    return { b, ...at, p: Math.random(), s: 0.6 + Math.random() * 0.8 };
  });

  // 6. 火花：細粒 + 大粒，唔同顏色，閃下閃下
  const makeEmbers = (n, size) => {
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const seeds = Array.from({ length: n }, (_, i) => {
      const c = new THREE.Color([0xffeb3b, 0xffab40, 0xff6d00, 0xff3d00][i % 4]);
      col.set([c.r, c.g, c.b], i * 3);
      return [(Math.random() * 2 - 1) * 3.4, Math.random() * 7, (Math.random() * 2 - 1) * 3.8, 0.5 + Math.random() * 1.2, Math.random() * 6];
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: glowTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false;
    group.add(pts);
    return { pts, pos, seeds, geo };
  };
  const embers = [makeEmbers(150, 0.16), makeEmbers(40, 0.38)];

  // 7. 頭頂火焰皇冠
  const crown = new THREE.Group();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.75, 6), additive(k % 2 ? 0xff9100 : 0xffeb3b, 0.9));
    f.position.set(Math.cos(a) * 0.7, 0.37, Math.sin(a) * 0.7);
    crown.add(f);
  }
  add(crown, new THREE.TorusGeometry(0.7, 0.09, 8, 28), lava, 0, 0, 0, false).rotation.x = Math.PI / 2;
  crown.position.set(0, 5.6, 0.4);
  group.add(crown);

  // 8. 練到嘢嗰下：一圈火爆出嚟
  const burst = new THREE.Group();
  burst.visible = false;
  group.add(burst);
  const burstRing = add(burst, new THREE.RingGeometry(0.6, 0.85, 40), additive(0xffab00, 0.7), 0, 0.15, 0, false);
  burstRing.rotation.x = -Math.PI / 2;
  const burstFlames = Array.from({ length: 10 }, (_, i) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 6), additive(i % 2 ? 0xff6d00 : 0xffeb3b, 0.7));
    burst.add(f);
    return { f, a: (i / 10) * Math.PI * 2 };
  });

  // 9. BB 火龍
  const dragon = buildBabyDragon();
  dragon.scale.setScalar(1.3);
  group.add(dragon);

  group.userData = { emblemFlames, fallTex, poolTex, braziers, heat, ring, tongues, tongueList, tornadoes, bubbles, embers, crown, burst, burstRing, burstFlames, dragon, fly: null };
}

// station：要 station.playerLocal（{ x, z, on }，updateHub 每格寫）、station.infernoBurstAt、station.standHeight
export function animateInferno(group, station, time) {
  const u = group.userData;
  // 機身熔岩裂紋一明一暗
  station.baseMat.emissiveIntensity = 0.85 + Math.sin(time * 2.2) * 0.3;
  station.trimMat.emissiveIntensity = 0.7 + Math.sin(time * 3.1) * 0.3;
  u.fallTex.offset.y = time * 0.45; // 熔岩向下流
  u.poolTex.offset.set(time * 0.05, time * 0.08);
  u.emblemFlames.forEach((f, i) => f.scale.set(1, 1 + Math.sin(time * 9 + i * 2) * 0.15, 1));
  u.braziers.forEach((f, i) => {
    f.scale.set(1 + Math.sin(time * 13 + i) * 0.08, 1 + Math.sin(time * 9 + i * 2) * 0.18, 1 + Math.cos(time * 11 + i) * 0.08);
    f.rotation.y = time * 2 + i;
  });
  u.heat.material.opacity = 0.42 + Math.sin(time * 1.8) * 0.14;
  u.ring.material.opacity = 0.6 + Math.sin(time * 3) * 0.25;
  u.tongues.rotation.y = time * 0.6;
  u.tongueList.forEach((f, i) => f.scale.set(1, 0.7 + Math.abs(Math.sin(time * 6 + i * 1.3)) * 0.9, 1));
  // 火龍捲：圍住部機行一個大橢圓，自己轉好快
  u.tornadoes.forEach(({ t, shells, phase, spiral: sp }) => {
    // 喺兩邊前後走（唔會走去後面擋住鏡頭）
    const side = phase === 0 ? -1 : 1;
    t.position.set(side * (4.3 + Math.sin(time * 0.5 + phase) * 0.4), 0, -0.9 + Math.sin(time * 0.42 + phase * 0.7) * 2.2);
    shells.forEach((m, k) => {
      m.rotation.y = time * (4 + k * 1.5) * (k % 2 ? -1 : 1);
      m.material.map.offset.y = -time * 0.6;
    });
    t.scale.set(1, 1 + Math.sin(time * 3 + phase) * 0.08, 1);
    for (let k = 0; k < sp.N; k++) {
      const h = ((k / sp.N + time * 0.35) % 1) * 4.2;
      const a = k * 0.9 + time * 7;
      const r = 0.15 + h * 0.2;
      sp.pos[k * 3] = Math.cos(a) * r;
      sp.pos[k * 3 + 1] = h;
      sp.pos[k * 3 + 2] = Math.sin(a) * r;
    }
    sp.geo.attributes.position.needsUpdate = true;
  });
  // 熔岩泡泡：慢慢脹大，然後「啵」
  for (const b of u.bubbles) {
    const k = (time * b.s + b.p) % 1;
    b.b.position.set(b.x, 0.1 + k * 0.12, b.z);
    b.b.scale.setScalar(k < 0.85 ? 0.3 + k * 1.1 : (1 - k) * 8);
  }
  // 火花向上飄、左右搖
  for (const e of u.embers) {
    e.seeds.forEach(([x, y0, z, sp, ph], i) => {
      e.pos[i * 3] = x + Math.sin(time * 1.3 + ph) * 0.35;
      e.pos[i * 3 + 1] = (y0 + time * sp) % 7.5;
      e.pos[i * 3 + 2] = z + Math.cos(time + ph) * 0.3;
    });
    e.geo.attributes.position.needsUpdate = true;
    e.pts.material.opacity = 0.75 + Math.sin(time * 17) * 0.2;
  }
  u.crown.rotation.y = time * 0.8;
  u.crown.position.y = 5.6 + Math.sin(time * 1.7) * 0.2;

  // 練到嘢：火圈爆開（0.7 秒）
  const bk = station.infernoBurstAt != null ? (time - station.infernoBurstAt) / 0.55 : 9;
  u.burst.visible = bk >= 0 && bk < 1;
  if (u.burst.visible) {
    const p = station.playerLocal?.on ? station.playerLocal : { x: 0, z: 0 };
    u.burst.position.set(p.x, station.standHeight || 0, p.z);
    u.burstRing.scale.setScalar(1 + bk * 3.2);
    u.burstRing.material.opacity = 0.7 * (1 - bk);
    for (const { f, a } of u.burstFlames) {
      const r = 0.7 + bk * 1.6;
      f.position.set(Math.cos(a) * r, 0.3 + bk * 0.4, Math.sin(a) * r);
      f.scale.set(1, 0.6 + Math.sin(bk * Math.PI), 1);
      f.material.opacity = 0.7 * (1 - bk);
    }
    station.baseMat.emissiveIntensity += (1 - bk) * 0.6; // 機身閃一閃
  }

  // BB 火龍：你喺度練就圍住你飛（細圈、近啲），唔喺度就圍住部機飛（大圈、高啲）
  const d = u.dragon;
  const pl = station.playerLocal;
  const on = !!pl?.on;
  const fly = (u.fly ??= { a: 0, last: null, pos: new THREE.Vector3(), prev: new THREE.Vector3() });
  const dt = fly.last == null ? 0 : Math.min(0.1, Math.max(0, time - fly.last));
  fly.last = time;
  fly.a += dt * (on ? 1.7 : 0.75);
  const cx = on ? pl.x : 0;
  const cz = on ? pl.z : 0.2;
  const r = on ? 1.6 : 3.3;
  const target = new THREE.Vector3(cx + Math.cos(fly.a) * r, (on ? (station.standHeight || 0) + 2.25 : 4.4) + Math.sin(time * 1.6) * 0.25, cz + Math.sin(fly.a) * r * (on ? 1 : 1.15));
  if (dt === 0) fly.pos.copy(target);
  else fly.pos.lerp(target, 1 - Math.exp(-dt * 3.5));
  const vx = fly.pos.x - fly.prev.x;
  const vz = fly.pos.z - fly.prev.z;
  if (dt === 0 || vx * vx + vz * vz < 1e-8) {
    d.rotation.y = Math.atan2(-Math.sin(fly.a), Math.cos(fly.a)); // 第一格：望住飛嘅方向（切線）
  } else {
    const want = Math.atan2(vx, vz);
    let diff = want - d.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    d.rotation.y += diff * Math.min(1, dt * 8);
    d.userData.body.rotation.z = THREE.MathUtils.clamp(-diff * 2, -0.5, 0.5); // 轉彎時側身
  }
  fly.prev.copy(fly.pos);
  d.position.copy(fly.pos);
  animateDragon(d, time);
}
