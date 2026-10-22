// 🐉 Pumpkin Reaper Dragon 嘅 3D 模型（Issue #11）
// 南瓜燈頭（雕咗嘅嬲面 + 頭頂噴火 + 龍角 + 死神帽兜）、龍身（胸口熔岩裂紋）、爛咗嘅死神斗篷、
// 兩隻爪（右手揸住大鐮刀）、一對爛咗嘅翼、身邊有紫綠色霧同火星（Bloom 會發光）
// 下半身喺地板下面（佢由地板個窿鑽出嚟），所以淨係起腰以上
// 面向 +z；userData.update(t, dt, pose) 每格郁（pose：breath 噴火張口、throwK 掟鐮刀、lobK 掟炸彈、summonK 叫魚、hurt 中槍閃、rage 嬲）

import * as THREE from 'three';
import { bx, sph, cone, cyl, between, piv, flame, ADD } from './halloweenKit.js';
import { glowTexture } from './weaponModels.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const PI = Math.PI;
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const glowM = (color, k = 2.2, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4, ...extra });

// ---------- 南瓜頭 ----------
function pumpkinGeo(ribs = 12, depth = 0.11) {
  const geo = new THREE.SphereGeometry(1, 64, 32);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const phi = Math.atan2(v.z, v.x);
    const lobe = Math.pow(Math.abs(Math.cos((ribs * phi) / 2)), 0.5);
    const r = 1 - depth * (1 - lobe);
    const s = Math.hypot(v.x, v.z);
    v.x *= r;
    v.z *= r;
    v.y = v.y * 0.84 - Math.sign(v.y) * 0.16 * Math.pow(1 - s, 3);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}
// 皮 + 雕面（u 0.25 = 正面 +z）：map = 橙皮；emissiveMap = 個窿入面嘅火光
function pumpkinTextures() {
  const W = 1024;
  const H = 512;
  const mk = () => Object.assign(document.createElement('canvas'), { width: W, height: H });
  const base = mk();
  const glowC = mk();
  const b = base.getContext('2d');
  const e = glowC.getContext('2d');
  for (let x = 0; x < W; x++) {
    const phi = (x / W) * PI * 2;
    const lobe = Math.abs(Math.cos(6 * phi));
    const k = 0.55 + 0.45 * Math.pow(lobe, 0.6);
    b.fillStyle = `rgb(${Math.round(235 * k)},${Math.round(98 * k)},${Math.round(12 * k)})`;
    b.fillRect(x, 0, 1, H);
  }
  const vg = b.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, 'rgba(40,10,0,0.85)');
  vg.addColorStop(0.25, 'rgba(40,10,0,0)');
  vg.addColorStop(0.78, 'rgba(40,10,0,0)');
  vg.addColorStop(1, 'rgba(30,5,0,0.9)');
  b.fillStyle = vg;
  b.fillRect(0, 0, W, H);
  // 燒焦咗嘅黑紋（似俾火燒過）
  for (let i = 0; i < 40; i++) {
    b.fillStyle = `rgba(30,8,0,${0.08 + Math.random() * 0.12})`;
    b.beginPath();
    b.ellipse(Math.random() * W, Math.random() * H, 10 + Math.random() * 40, 4 + Math.random() * 14, Math.random() * 3, 0, PI * 2);
    b.fill();
  }
  e.fillStyle = '#000';
  e.fillRect(0, 0, W, H);
  const cx = W * 0.25;
  const eye = (s) => [[cx + s * 22, 200], [cx + s * 126, 150], [cx + s * 112, 238], [cx + s * 48, 236]];
  const shapes = [eye(-1), eye(1), [[cx, 240], [cx - 22, 280], [cx + 22, 280]]];
  const mouth = [];
  const top = [[-170, 286], [-140, 300], [-112, 282], [-86, 318], [-58, 296], [-30, 322], [0, 298], [30, 322], [58, 296], [86, 318], [112, 282], [140, 300], [170, 286]];
  const bottom = [[150, 322], [116, 362], [84, 374], [64, 344], [40, 380], [0, 388], [-40, 380], [-64, 344], [-84, 374], [-116, 362], [-150, 322]];
  for (const [dx, y] of [...top, ...bottom]) mouth.push([cx + dx, y]);
  shapes.push(mouth);
  const path = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  for (const pts of shapes) {
    path(b, pts);
    b.lineJoin = 'round';
    b.lineWidth = 16;
    b.strokeStyle = '#ffcf7a';
    b.stroke();
    b.fillStyle = '#ffe9a8';
    b.fill();
    e.save();
    path(e, pts);
    e.lineJoin = 'round';
    e.lineWidth = 12;
    e.strokeStyle = '#b33a00';
    e.stroke();
    e.clip();
    const ys = pts.map((q) => q[1]);
    const gr = e.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    gr.addColorStop(0, '#ff6d00');
    gr.addColorStop(0.5, '#ffd54f');
    gr.addColorStop(1, '#fffde7');
    e.fillStyle = gr;
    e.fillRect(cx - 220, 100, 440, 320);
    e.restore();
  }
  const tex = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: tex(base), emissiveMap: tex(glowC) };
}

// ---------- 鐮刀（手上一把；掟出去嗰把用同一個樣）----------
export function buildScythe() {
  const g = new THREE.Group();
  const wood = std(0x2a1a14, { roughness: 0.8 });
  const iron = std(0x2b2735, { roughness: 0.35, metalness: 0.6 });
  const soul = glowM(0x9cff57, 2.4);
  // 柄（沿 y）
  cyl(g, 0.22, 13, wood, 0, 2.5, 0);
  for (const y of [-2.8, 0.4, 3.6, 6.4]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 16), soul);
    r.rotation.x = PI / 2;
    r.position.y = y;
    g.add(r);
  }
  // 尾：細南瓜
  const pk = sph(g, 0.55, 0.45, 0.55, glowM(0xff6d00, 1.2), 0, -4.3, 0);
  pk.castShadow = false;
  // 刀頭：一塊彎月形（由柄頂向 +x 彎落去）
  const top = 8.6;
  bx(g, 0.7, 1.0, 0.7, iron, 0, top, 0, 0.2);
  const s = new THREE.Shape();
  s.moveTo(0, 0.5);
  s.quadraticCurveTo(4.2, 2.4, 8.6, -1.6);
  s.quadraticCurveTo(4.4, 0.0, 0, -0.6);
  s.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1, curveSegments: 20 });
  bladeGeo.translate(0, 0, -0.09);
  const blade = new THREE.Mesh(bladeGeo, std(0x3a2f48, { metalness: 0.7, roughness: 0.25, emissive: 0xff3d00, emissiveIntensity: 0.35 }));
  blade.position.set(0.2, top, 0);
  blade.castShadow = true;
  g.add(blade);
  // 發光刀口（外面條弧）
  const edgeCurve = new THREE.QuadraticBezierCurve3(V(0.2, top + 0.5, 0), V(4.4, top + 2.4, 0), V(8.8, top - 1.6, 0));
  const edge = new THREE.Mesh(new THREE.TubeGeometry(edgeCurve, 24, 0.12, 6, false), glowM(0xffab40, 3.2));
  g.add(edge);
  // 刀上嘅靈魂火
  const fire = flame(g, 6.2, top - 0.2, 0, 1.6, [0xb2ff59, 0x76ff03, 0x00c853]);
  g.userData = { blade, edge, fire, soul };
  g.userData.flicker = (t) => fire.userData.flicker(t);
  return g;
}

// ---------- 爛咗嘅斗篷（上窄下闊，下面一條條爛布）----------
function raggedCloth(wTop, wBot, h, teeth, curl = 0.25) {
  const s = new THREE.Shape();
  s.moveTo(-wTop / 2, 0);
  s.lineTo(wTop / 2, 0);
  s.lineTo(wBot / 2, -h);
  for (let i = 1; i < teeth * 2; i++) {
    const x = wBot / 2 - (wBot * i) / (teeth * 2);
    const up = i % 2 ? 0.5 + ((i * 37) % 7) * 0.22 : ((i * 13) % 5) * 0.12;
    s.lineTo(x, -h + up);
  }
  s.lineTo(-wBot / 2, -h);
  s.closePath();
  const geo = new THREE.ShapeGeometry(s, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, x * x * curl * 0.1 - y * 0.12);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------- 翼（右邊，沿 +x 伸出去；左邊用 scale.x = -1）----------
function wingGeo() {
  const s = new THREE.Shape();
  const pts = [
    [0, 0], [3.5, 2.6], [6.6, 3.6], [12.4, 1.6],
    [10.4, -0.1], [11.2, -0.9], [9.9, -1.5], [10.8, -3.2],
    [8.8, -3.4], [9.2, -4.4], [7.9, -4.7], [8.2, -6.3],
    [6.7, -5.3], [6.4, -6.4], [5.4, -5.7], [5.0, -6.8],
    [3.5, -4.6], [2.3, -5.0], [1.3, -2.4],
  ];
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  // 爛咗嘅窿
  for (const [hx, hy, r] of [[8.3, -1.6, 0.55], [5.6, -3.3, 0.4], [10.2, 0.6, 0.3], [3.4, -2.2, 0.32]]) {
    const hole = new THREE.Path();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      const rr = r * (0.7 + ((i * 7) % 5) * 0.12);
      if (i === 0) hole.moveTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 1.3);
      else hole.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 1.3);
    }
    hole.closePath();
    s.holes.push(hole);
  }
  return new THREE.ShapeGeometry(s, 4);
}
function buildWing(parent, side, mats) {
  const pivot = piv(parent, side * 1.8, 8.4, -2.1);
  const inner = piv(pivot);
  inner.scale.x = side;
  const mem = new THREE.Mesh(wingGeo(), mats.membrane);
  mem.castShadow = true;
  inner.add(mem);
  const B = (a, b, r) => between(inner, V(...a, 0.12), V(...b, 0.12), r, mats.wingBone, r * 0.7);
  B([0, 0], [3.5, 2.6], 0.34);
  B([3.5, 2.6], [6.6, 3.6], 0.28);
  for (const tip of [[12.4, 1.6], [10.8, -3.2], [8.2, -6.3], [5.0, -6.8]]) {
    B([6.6, 3.6], tip, 0.14);
    const claw = cone(inner, 0.12, 0.6, mats.claw, tip[0], tip[1], 0.12);
    claw.castShadow = false;
  }
  cone(inner, 0.28, 1.2, mats.claw, 6.6, 4.3, 0.12); // 翼爪
  return pivot;
}

// ---------- 成隻 Boss ----------
export function buildReaperDragon() {
  const root = new THREE.Group();
  const body = piv(root); // 震、起身、死嘅動畫郁呢個
  const tex = pumpkinTextures();
  const mats = {
    scale: std(0x2b1c3a, { roughness: 0.5, metalness: 0.2 }),
    scaleDark: std(0x180f22, { roughness: 0.7 }),
    belly: std(0x3b2830, { roughness: 0.55 }),
    lava: glowM(0xff6a00, 2.4),
    soul: glowM(0x9cff57, 2.2),
    bone: std(0xd8cbb2, { roughness: 0.7 }),
    claw: std(0x1a1414, { roughness: 0.35, metalness: 0.4 }),
    wingBone: std(0x2a1d33, { roughness: 0.6 }),
    membrane: new THREE.MeshStandardMaterial({ color: 0x3d1758, emissive: 0x2a0844, emissiveIntensity: 0.7, roughness: 0.85, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    robe: new THREE.MeshStandardMaterial({ color: 0x150b1f, roughness: 0.95, side: THREE.DoubleSide }),
    robeEdge: glowM(0x7c2bff, 1.2, { side: THREE.DoubleSide }),
    pumpkin: new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissiveMap, emissive: 0xffffff, emissiveIntensity: 2.4, roughness: 0.55 }),
    stem: std(0x2e3b16, { roughness: 0.8 }),
  };
  const flames = [];

  // 身（腰以下喺地板下面）
  bx(body, 5.4, 7, 4.4, mats.scaleDark, 0, -1.8, 0, 0.3);
  const chest = bx(body, 6, 4.8, 4.8, mats.scale, 0, 4.2, 0, 0.3);
  bx(body, 6.6, 2, 4, mats.scale, 0, 6.9, -0.2, 0.35); // 膊頭
  for (const s of [-1, 1]) sph(body, 2, 1.7, 2, mats.scale, s * 3.2, 7.0, 0); // 圓膊
  // 胸口：熔岩裂紋（後面發光，前面一塊塊鱗甲，罅隙透光）
  bx(body, 2.4, 7.0, 0.3, mats.lava, 0, 2.6, 2.3, 0.2);
  for (let i = 0; i < 6; i++) bx(body, 3.1 - Math.abs(i - 2.5) * 0.16, 0.95, 0.5, mats.belly, 0, -0.2 + i * 1.18, 2.48, 0.3);
  for (let i = 0; i < 3; i++) { // 胸口兩邊嘅細裂紋
    for (const s of [-1, 1]) {
      const c = bx(body, 0.1, 0.9, 0.1, mats.lava, s * (2.1 + (i % 2) * 0.3), 1.6 + i * 1.7, 2.38, 0.3);
      c.rotation.z = s * (0.5 + (i % 2) * 0.4);
    }
  }
  // 背脊尖刺
  for (let i = 0; i < 6; i++) {
    const sp = cone(body, 0.45 - i * 0.03, 1.6 - i * 0.1, mats.bone, 0, 0.5 + i * 1.4, -2.5 - i * 0.05, -0.9, 0);
    sp.castShadow = true;
  }
  // 斗篷：背後同兩邊掛落嚟，邊有紫光
  const cloak = new THREE.Mesh(raggedCloth(8.4, 12, 10, 9), mats.robe);
  cloak.position.set(0, 8.2, -2.5);
  cloak.rotation.set(0.12, PI, 0);
  body.add(cloak);
  for (const s of [-1, 1]) {
    const sideCloth = new THREE.Mesh(raggedCloth(3.6, 5, 8, 4, 0.6), mats.robe);
    sideCloth.position.set(s * 4.1, 8, 0);
    sideCloth.rotation.set(0.05, s * PI / 2, s * 0.12);
    body.add(sideCloth);
  }
  // 骨刺頸圈（圍住條頸）
  for (let i = 0; i < 9; i++) {
    const a = PI * 0.15 + (i / 8) * PI * 1.7; // 前面留空（唔遮塊面）
    const sp = cone(body, 0.35, 1.8 + (i % 2) * 0.8, i % 3 === 1 ? mats.soul : mats.bone, Math.sin(a) * 2.6, 8.4, -Math.cos(a) * 2.2 - 0.2, 0, 0);
    sp.rotation.set(-Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6);
  }

  // 頸 + 頭
  const neck = piv(body, 0, 7.6, 0.6);
  // 條頸：一粒粒圓鱗（由粗到幼，彎向前），背脊有骨刺
  const neckCurve = new THREE.CatmullRomCurve3([V(0, -0.4, -0.2), V(0, 1.4, 0.3), V(0, 2.9, 1.1), V(0, 4.3, 2.2)]);
  for (let i = 0; i < 8; i++) {
    const k = i / 7;
    const p = neckCurve.getPoint(k);
    const r = 1.45 - k * 0.45;
    sph(neck, r, r * 0.9, r, i % 2 ? mats.scaleDark : mats.scale, p.x, p.y, p.z);
    sph(neck, r * 0.6, r * 0.5, r * 0.3, mats.belly, p.x, p.y - 0.1, p.z + r * 0.8, true); // 頸前面淺色鱗
    if (i % 2 === 0) cone(neck, 0.3, 1.1, mats.bone, 0, p.y + 0.3, p.z - r * 0.95, -1.1, 0);
  }
  const head = piv(neck, 0, 5.2, 2.7);
  const pumpkin = new THREE.Mesh(pumpkinGeo(), mats.pumpkin);
  pumpkin.scale.set(2.4, 2.0, 2.2);
  pumpkin.castShadow = true;
  head.add(pumpkin);
  cyl(head, 0.32, 1.2, mats.stem, 0, 1.9, -0.2, -0.3, 0.2, 0.22); // 柄
  // 眼 + 口嘅光（Bloom）
  const eyeGlow = [];
  for (const s of [-1, 1]) {
    const eg = sph(head, 0.42, 0.3, 0.2, ADD(0xffea80, 0.9), s * 0.9, 0.45, 2.08, true);
    eyeGlow.push(eg);
  }
  const innerFire = sph(head, 1.7, 1.3, 1.5, ADD(0xff8f00, 0.45), 0, 0, 0.2, true);
  // 下巴（龍顎，噴火時張開）
  const jaw = piv(head, 0, -1.2, -0.2);
  bx(jaw, 2.3, 0.55, 2.2, mats.scaleDark, 0, -0.25, 0.9, 0.4);
  for (let i = 0; i < 5; i++) {
    const tooth = cone(jaw, 0.14, 0.5, mats.bone, -0.9 + i * 0.45, 0.2, 1.85, 0, 0);
    tooth.castShadow = false;
  }
  const mouthFire = sph(head, 1.1, 0.5, 0.8, ADD(0xffb300, 0), 0, -1.35, 1.6, true);
  // 龍角（彎向後）
  for (const s of [-1, 1]) {
    const pts = [V(s * 1.5, 1.1, -0.1), V(s * 2.6, 2.3, -0.8), V(s * 3.1, 3.5, -1.9), V(s * 2.8, 4.4, -3.1), V(s * 2.3, 4.8, -3.9)];
    for (let i = 0; i < pts.length - 1; i++) between(head, pts[i], pts[i + 1], 0.48 - i * 0.1, i === pts.length - 2 ? mats.soul : mats.claw, 0.4 - i * 0.1);
    flames.push(flame(head, pts[4].x, pts[4].y, pts[4].z, 0.9, [0xccff90, 0x76ff03, 0x00c853]));
  }
  // 死神帽兜（包住頭後面）
  const hoodGeo = new THREE.SphereGeometry(3.1, 24, 14, PI * 0.85, PI * 1.3, 0, PI * 0.62);
  const hood = new THREE.Mesh(hoodGeo, mats.robe);
  hood.position.set(0, 0.3, -0.5);
  hood.scale.set(1, 1.1, 1.05);
  head.add(hood);
  // 頭頂大火
  flames.push(flame(head, 0, 1.6, -0.3, 3.4));

  // 手（右手揸鐮刀）
  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = piv(body, s * 4.1, 7.0, 0.4);
    bx(shoulder, 2.2, 1.6, 2.2, mats.scale, 0, 0.1, 0, 0.35); // 膊頭甲
    cone(shoulder, 0.5, 1.6, mats.bone, s * 0.5, 1.2, -0.2, 0, -s * 0.5);
    const upper = piv(shoulder, 0, 0, 0);
    bx(upper, 1.5, 3.6, 1.5, mats.scale, 0, -1.7, 0, 0.35);
    const elbow = piv(upper, 0, -3.3, 0);
    bx(elbow, 1.3, 3.2, 1.3, mats.scaleDark, 0, -1.5, 0, 0.35);
    bx(elbow, 1.36, 0.4, 1.36, mats.lava, 0, -2.4, 0, 0.3); // 手腕火圈
    const hand = piv(elbow, 0, -3.2, 0);
    bx(hand, 1.6, 0.9, 1.4, mats.scale, 0, -0.2, 0, 0.35);
    for (let i = 0; i < 3; i++) cone(hand, 0.18, 1.1, mats.claw, -0.5 + i * 0.5, -1.0, 0.5, 0.5, 0);
    cone(hand, 0.18, 0.9, mats.claw, s * -0.8, -0.6, 0.2, 0.3, s * 0.6);
    arms.push({ s, shoulder, upper, elbow, hand });
  }
  const scythe = buildScythe();
  scythe.position.set(0, -0.4, 0.3);
  scythe.rotation.set(0.15, PI / 2, 0);
  arms[1].hand.add(scythe);

  // 翼
  const wings = [buildWing(body, -1, mats), buildWing(body, 1, mats)];

  // 霧氣光環（紫色霧 + 綠色光）+ 火星
  const aura = new THREE.Group();
  root.add(aura);
  const fogs = [];
  for (let i = 0; i < 12; i++) {
    const add = i % 3 === 0;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: add ? 0x76ff03 : i % 2 ? 0x5a1f86 : 0x2a0f3a, transparent: true,
      opacity: add ? 0.16 : 0.42, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    sp.userData = { a: (i / 12) * PI * 2, r: 6 + (i % 4) * 1.3, y: 1 + (i % 5) * 1.6, s: 7 + (i % 3) * 3, spd: 0.15 + (i % 4) * 0.05 };
    aura.add(sp);
    fogs.push(sp);
  }
  const EMB = 90;
  const embGeo = new THREE.BufferGeometry();
  const embPos = new Float32Array(EMB * 3);
  const embSeed = [];
  for (let i = 0; i < EMB; i++) embSeed.push({ a: Math.random() * PI * 2, r: 2 + Math.random() * 7, sp: 1 + Math.random() * 2.5, o: Math.random() * 14 });
  embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
  const embers = new THREE.Points(embGeo, new THREE.PointsMaterial({ color: 0xffa040, size: 0.35, map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  embers.frustumCulled = false;
  aura.add(embers);

  root.traverse((o) => {
    if (o.isMesh && o.material?.transparent) o.castShadow = false;
  });

  const flashMats = [mats.scale, mats.scaleDark, mats.belly];
  const rest = arms.map((a) => ({ x: a.upper.rotation.x, z: a.upper.rotation.z }));
  root.userData = {
    body, head, neck, jaw, arms, scythe, wings, mouthFire, innerFire, eyeGlow, flames, fogs, embers, mats, chest,
    // 出鐮刀嗰隻手嘅世界位置
    handPos: (out) => arms[1].hand.getWorldPosition(out),
    leftHandPos: (out) => arms[0].hand.getWorldPosition(out),
    mouthPos: (out) => mouthFire.getWorldPosition(out),
  };
  root.userData.update = (t, dt, pose = {}) => {
    const { breath = 0, throwK = 0, lobK = 0, summonK = 0, hurt = 0, rage = 0, roar = 0, dying = 0 } = pose;
    // 呼吸 + 搖頭
    const br = Math.sin(t * 1.6);
    body.scale.set(1 + br * 0.012, 1 + br * 0.01, 1 + br * 0.012);
    neck.rotation.x = -0.15 + Math.sin(t * 0.9) * 0.05 + breath * 0.45 - roar * 0.35;
    neck.rotation.z = Math.sin(t * 0.7) * 0.06;
    head.rotation.set(-breath * 0.15 - roar * 0.25, Math.sin(t * 0.5) * 0.12, 0);
    jaw.rotation.x = 0.1 + breath * 0.75 + roar * 0.6 + Math.max(0, Math.sin(t * 3)) * 0.04;
    mouthFire.material.opacity = 0.15 + breath * 0.85 + roar * 0.4;
    mouthFire.scale.set(1.1 + breath * 0.6, 0.5 + breath * 0.6, 0.8 + breath * 0.5);
    innerFire.material.opacity = 0.35 + Math.sin(t * 9) * 0.07 + rage * 0.2;
    mats.pumpkin.emissiveIntensity = 2.2 + Math.sin(t * 7) * 0.25 + rage * 0.8 + breath * 0.8;
    for (const e of eyeGlow) e.material.opacity = 0.75 + Math.sin(t * 5) * 0.15 + rage * 0.2;
    mats.lava.emissiveIntensity = 2.2 + Math.sin(t * 2.2) * 0.5 + rage * 1.2;
    // 手：休息 → 掟鐮刀（右手向後再向前）／掟炸彈（左手舉高）／叫魚（兩手舉高）
    const [L, R] = arms;
    const idle = Math.sin(t * 1.2) * 0.06;
    const throwSwing = throwK < 0.7 ? -(throwK / 0.7) * 1.2 : -1.2 + ((throwK - 0.7) / 0.3) * 2.6; // 先舉後，再大力揮前
    R.upper.rotation.set(-0.25 + idle - throwSwing * 0.9 - summonK * 2.2, 0, 0.25 + throwK * 0.3 + summonK * 0.3);
    R.elbow.rotation.x = -0.6 - throwK * 0.4;
    L.upper.rotation.set(-0.35 - idle - lobK * 2.4 - summonK * 2.2, 0, -0.3 - summonK * 0.3);
    L.elbow.rotation.x = -0.7 - lobK * 0.5;
    // 翼：慢慢拍（嬲嗰陣拍快啲、大啲）
    const fl = Math.sin(t * (1.4 + rage * 0.8)) * (0.22 + rage * 0.1 + roar * 0.3);
    wings[0].rotation.set(0.1, -0.5, -fl - 0.15 - roar * 0.3);
    wings[1].rotation.set(0.1, 0.5, fl + 0.15 + roar * 0.3);
    // 中槍閃白
    for (const m of flashMats) {
      m.emissive.setRGB(hurt * 0.45, hurt * 0.12, hurt * 0.02); // 中槍：閃少少橙紅
      m.emissiveIntensity = 1;
    }
    for (const f of flames) f.userData.flicker(t);
    scythe.userData.flicker(t);
    // 霧
    for (const sp of aura.children) {
      if (!sp.isSprite) continue;
      const u = sp.userData;
      const a = u.a + t * u.spd;
      sp.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * 0.6 + u.a) * 0.6, Math.sin(a) * u.r);
      sp.scale.setScalar(u.s * (1 + Math.sin(t * 0.8 + u.a) * 0.12) * (1 - dying * 0.6));
    }
    for (let i = 0; i < EMB; i++) {
      const e = embSeed[i];
      const y = (e.o + t * e.sp) % 14;
      const a = e.a + t * 0.2;
      embPos[i * 3] = Math.cos(a) * e.r * (1 - y / 30);
      embPos[i * 3 + 1] = y - 1;
      embPos[i * 3 + 2] = Math.sin(a) * e.r * (1 - y / 30);
    }
    embGeo.attributes.position.needsUpdate = true;
    void dt;
  };
  return root;
}

// ---------- 細嘢：南瓜炸彈、鬼魚 ----------
let bombParts = null; // 南瓜炸彈嘅形狀同材質（共用，唔使每個都整）
export function buildPumpkinBomb() {
  bombParts ||= { geo: pumpkinGeo(10, 0.12), skin: new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff3d00, emissiveIntensity: 0.6, roughness: 0.5 }), eye: ADD(0xfff176, 0.95), fuse: ADD(0xffeb3b, 0.95) };
  const g = new THREE.Group();
  const pk = new THREE.Mesh(bombParts.geo, bombParts.skin);
  pk.scale.set(0.9, 0.75, 0.9);
  pk.castShadow = true;
  g.add(pk);
  for (const s of [-1, 1]) sph(g, 0.16, 0.12, 0.08, bombParts.eye, s * 0.3, 0.12, 0.82, true);
  cyl(g, 0.08, 0.5, bombParts.skin, 0, 0.85, 0);
  const spark = sph(g, 0.22, 0.22, 0.22, bombParts.fuse, 0, 1.15, 0, true);
  g.userData.spark = spark;
  return g;
}
export function buildGhostFish() {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x80ffea, emissive: 0x1de9b6, emissiveIntensity: 0.9, transparent: true, opacity: 0.72, roughness: 0.3, depthWrite: false });
  const fin = new THREE.MeshStandardMaterial({ color: 0xb388ff, emissive: 0x7c4dff, emissiveIntensity: 0.9, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
  sph(g, 0.55, 0.5, 0.95, body, 0, 0, 0);
  // 尾（向後 -z）
  const tail = piv(g, 0, 0, -0.85);
  const tailM = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 4), fin);
  tailM.rotation.x = -PI / 2;
  tailM.position.z = -0.35;
  tailM.scale.x = 0.25;
  tail.add(tailM);
  // 背鰭
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 3), fin);
  dorsal.position.set(0, 0.55, -0.1);
  dorsal.scale.z = 0.3;
  g.add(dorsal);
  // 大口 + 牙（卡通款，唔恐怖）
  const jaw = piv(g, 0, -0.1, 0.6);
  sph(jaw, 0.4, 0.15, 0.35, std(0x1a0b2e), 0, 0, 0.1);
  for (let i = 0; i < 4; i++) {
    const tooth = cone(jaw, 0.05, 0.16, std(0xffffff), -0.18 + i * 0.12, 0.1, 0.38, PI, 0);
    tooth.castShadow = false;
  }
  for (const s of [-1, 1]) {
    sph(g, 0.16, 0.16, 0.1, ADD(0xffffff, 0.95), s * 0.32, 0.2, 0.62, true);
    sph(g, 0.07, 0.07, 0.06, std(0x1a0b2e), s * 0.34, 0.2, 0.7, true);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x1de9b6, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(3);
  g.add(glow);
  g.traverse((o) => o.isMesh && (o.castShadow = false));
  g.userData = { tail, jaw, body };
  return g;
}
