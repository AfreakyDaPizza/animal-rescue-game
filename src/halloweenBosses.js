// 🎃 Halloween 3 隻 Boss（小朋友 Issue #6 設計；Issue #9「好醜」→ 2026-10-21 全部重做）
// 同 bosses.js 嘅 Boss 一樣格式：{ g, root, legs[2], arms[2], head, torso }，面向 -z
// animateRig 每格先擺 legs／arms／root，跟住叫 g.userData.extra(t)：我哋喺 extra 入面再加自己嘅動作（所以唔會俾佢蓋過）
// 遊戲入面放大 ×3（HALLOWEEN_BOSS_SIZE）
//   Pumpkin Tyrant（南瓜暴君）：南瓜燈頭嘅國王，金皇冠、頭頂火、藤手、紫色披風、權杖；userData.pound(k) 雙手舉高砸地
//   Hollow Wraith（空洞幽靈）：破爛斗篷浮住，帽入面得一對發光眼，鐵鏈 + 靈魂燈籠 + 一條條幽靈尾；userData.flicker(k) 瞬移閃爍
//   Bone Drake（骨龍）：骷髏龍，肋骨入面同口入面有綠色靈魂火，骨翼識拍；userData.fly(k) 拍翼飛
// 共用：userData.setMood(chasing) → 追緊你就變惡（眼更光、姿勢更兇），啱啱開始追 + 追得耐會吼（roar）
import * as THREE from 'three';
import { M, G, ADD, bx, sph, cone, cyl, piv, chain, flame, between } from './halloweenKit.js';

const PI = Math.PI;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;
const smooth = (x) => x * x * (3 - 2 * x);

// ---------- 共用小工具 ----------
// 一條彎彎、由粗變幼嘅管（藤、骨、角）：pts 係幾個點，r0 頭粗、r1 尾幼
function taper(parent, pts, r0, r1, mat, segs = 14, radial = 7) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const p = geo.attributes.position;
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, c);
    const r = lerp(r0, r1, i / segs);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c);
      p.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = !mat.transparent;
  parent.add(m);
  return m;
}
// 一圈鐵鏈繞住身（橢圓，可以斜）
const linkGeo = new THREE.TorusGeometry(0.085, 0.028, 5, 10);
function loopChain(parent, y, rx, rz, tilt, n, mat) {
  const g = piv(parent, 0, y, 0);
  g.rotation.x = tilt;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    const l = new THREE.Mesh(linkGeo, mat);
    l.position.set(Math.cos(a) * rx, 0, Math.sin(a) * rz);
    l.rotation.order = 'YXZ'; // 每個圈順住條鏈嘅方向，一個企一個瞓
    l.rotation.set(i % 2 ? PI / 2 : 0, -a - PI / 2, 0);
    g.add(l);
  }
  return g;
}
// 吊住嘅鐵鏈（直落），回傳 pivot（擺佢就會成條郁）
function hangChain(parent, x, y, z, len, mat) {
  const p = piv(parent, x, y, z);
  const n = Math.round(len / 0.12);
  for (let i = 0; i < n; i++) {
    const l = new THREE.Mesh(linkGeo, mat);
    l.position.y = -i * 0.12;
    l.rotation.y = i % 2 ? PI / 2 : 0;
    p.add(l);
  }
  return p;
}
// 計 dt（extra 淨係有 t）+ 心情：anger 0→1（追緊）、roar 0→1→0（吼）
const ROAR = 1.4;
function mood(ud) {
  const s = { anger: 0, want: 0, roarT: 0, roar: 0, last: null, nextRoar: 8 };
  ud.setMood = (chasing) => {
    const w = chasing ? 1 : 0;
    if (w && !s.want) s.roarT = ROAR; // 啱啱開始追：吼一聲
    s.want = w;
  };
  ud.roar = () => (s.roarT = ROAR);
  s.tick = (t) => {
    const dt = s.last == null ? 1 / 60 : clamp(t - s.last, 0, 0.1);
    s.last = t;
    s.anger += (s.want - s.anger) * Math.min(1, dt * 3);
    if (s.want) {
      s.nextRoar -= dt;
      if (s.nextRoar <= 0) {
        s.nextRoar = 7 + Math.random() * 5;
        s.roarT = ROAR;
      }
    }
    s.roarT = Math.max(0, s.roarT - dt);
    const p = 1 - s.roarT / ROAR; // 0→1
    s.roar = s.roarT > 0 ? smooth(p < 0.22 ? p / 0.22 : p > 0.75 ? (1 - p) / 0.25 : 1) : 0;
    return dt;
  };
  return s;
}
// 地上一圈柔光（放射漸變，唔會見到多邊形）
let glowTex = null;
function glowDisc(parent, r, color, opacity) {
  if (!glowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    glowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m.rotation.x = -PI / 2;
  m.position.y = 0.04;
  m.castShadow = false;
  parent.add(m);
  return m;
}
// 火星：一粒粒向上飄嘅細方塊（加亮），回傳 update(dt, strength)
function embers(parent, n, color, x, y, z, spread, rise) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), ADD(i % 3 ? color : 0xffffff, 0.9));
    m.userData.k = i / n;
    m.userData.dx = (Math.random() - 0.5) * spread;
    m.userData.dz = (Math.random() - 0.5) * spread;
    parent.add(m);
    list.push(m);
  }
  return (dt, s = 1) => {
    for (const m of list) {
      m.visible = s > 0;
      const u = m.userData;
      u.k = (u.k + dt * (0.5 + s * 0.4)) % 1;
      m.position.set(x + u.dx * (1 + u.k), y + u.k * rise * (0.7 + s * 0.5), z + u.dz * (1 + u.k));
      m.rotation.set(u.k * 6, u.k * 9, 0);
      m.scale.setScalar((1 - u.k) * (0.8 + s * 0.5));
      m.material.opacity = 0.9 * (1 - u.k);
    }
  };
}

// ======================= 🎃 Pumpkin Tyrant =======================
// 南瓜皮：一條條瓣（坑）+ 上下兩頭凹入；open = 頂部開個窿（火由度噴出嚟）
function pumpkinGeo(ribs = 10, depth = 0.1, open = 0) {
  const geo = new THREE.SphereGeometry(1, 60, 30, 0, PI * 2, open, PI - open);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const phi = Math.atan2(v.z, v.x);
    const lobe = Math.pow(Math.abs(Math.cos((ribs * (phi + PI / 2)) / 2)), 0.5); // 正面中間係一瓣
    const r = 1 - depth * (1 - lobe);
    const s = Math.hypot(v.x, v.z);
    v.x *= r;
    v.z *= r;
    v.y = v.y * 0.84 - Math.sign(v.y) * 0.16 * Math.pow(1 - s, 3); // 上下凹
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}
// 南瓜燈皮 + 雕咗嘅面（equirect canvas：u 0.75 = 正面 -z）
// map：橙皮 + 雕口嘅黃色果肉邊；emissiveMap：淨係個窿發光（內火）
let tyrantTex = null;
function tyrantTextures() {
  if (tyrantTex) return tyrantTex;
  const W = 1024;
  const H = 512;
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return c;
  };
  const base = mk();
  const glowC = mk();
  const b = base.getContext('2d');
  const e = glowC.getContext('2d');
  // 皮：橙色，瓣嘅坑深色啲，上下兩頭深色
  for (let x = 0; x < W; x++) {
    const phi = PI - (x / W) * PI * 2;
    const lobe = Math.abs(Math.cos((10 * (phi + PI / 2)) / 2));
    const k = 0.62 + 0.38 * Math.pow(lobe, 0.6);
    b.fillStyle = `rgb(${Math.round(250 * k)},${Math.round(120 * k)},${Math.round(18 * k)})`;
    b.fillRect(x, 0, 1, H);
  }
  const vg = b.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, 'rgba(70,25,0,0.75)');
  vg.addColorStop(0.22, 'rgba(70,25,0,0)');
  vg.addColorStop(0.8, 'rgba(70,25,0,0)');
  vg.addColorStop(1, 'rgba(50,15,0,0.8)');
  b.fillStyle = vg;
  b.fillRect(0, 0, W, H);
  e.fillStyle = '#000';
  e.fillRect(0, 0, W, H);
  // 面（中心 x 768）：怒目、鼻、大鋸齒口
  const cx = 768;
  const shapes = [];
  const eye = (s) => [[cx + s * 18, 196], [cx + s * 112, 160], [cx + s * 96, 236], [cx + s * 40, 232]]; // 向中間斜落 = 好嬲
  shapes.push(eye(-1), eye(1));
  shapes.push([[cx, 238], [cx - 18, 272], [cx + 18, 272]]); // 鼻
  const mouth = [];
  const top = [[-150, 290], [-118, 300], [-96, 286], [-74, 316], [-48, 300], [-24, 318], [0, 302], [24, 318], [48, 300], [74, 316], [96, 286], [118, 300], [150, 290]];
  for (const [dx, y] of top) mouth.push([cx + dx, y]);
  const bottom = [[132, 318], [100, 352], [70, 362], [56, 340], [36, 368], [0, 376], [-36, 368], [-56, 340], [-70, 362], [-100, 352], [-132, 318]];
  for (const [dx, y] of bottom) mouth.push([cx + dx, y]);
  shapes.push(mouth);
  const path = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  for (const pts of shapes) {
    // 皮：雕口邊係淺色果肉，入面暖黃
    path(b, pts);
    b.lineJoin = 'round';
    b.lineWidth = 14;
    b.strokeStyle = '#ffd08a';
    b.stroke();
    b.fillStyle = '#ffe9a8';
    b.fill();
    // 發光：外圈橙，中間淡黃
    e.save();
    path(e, pts);
    e.lineJoin = 'round';
    e.lineWidth = 10;
    e.strokeStyle = '#a63c00';
    e.stroke();
    e.clip();
    const minY = Math.min(...pts.map((q) => q[1]));
    const maxY = Math.max(...pts.map((q) => q[1]));
    const gr = e.createLinearGradient(0, minY, 0, maxY);
    gr.addColorStop(0, '#ff8f00');
    gr.addColorStop(0.55, '#ffd54f');
    gr.addColorStop(1, '#fff8e1');
    e.fillStyle = gr;
    e.fillRect(cx - 200, minY - 10, 400, maxY - minY + 20);
    e.restore();
  }
  const tex = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  tyrantTex = { map: tex(base), emissiveMap: tex(glowC) };
  return tyrantTex;
}
// 披風：上窄下闊，下面爛咗一條條；彎少少包住個背
function capeGeo(wTop, wBot, h, teeth) {
  const s = new THREE.Shape();
  s.moveTo(-wTop / 2, 0);
  s.lineTo(wTop / 2, 0);
  s.lineTo(wBot / 2, -h);
  for (let i = 1; i < teeth * 2; i++) {
    const x = wBot / 2 - (wBot * i) / (teeth * 2);
    const up = i % 2 ? 0.18 + ((i * 37) % 7) * 0.035 : ((i * 13) % 5) * 0.03;
    s.lineTo(x, -h + up);
  }
  s.lineTo(-wBot / 2, -h);
  s.closePath();
  const geo = new THREE.ShapeGeometry(s, 6);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, (x * x) * 0.22 - y * 0.08); // 兩邊向前包 + 下面向後飄少少
  }
  geo.computeVertexNormals();
  return geo;
}

export function buildPumpkinTyrant() {
  const g = new THREE.Group();
  const ud = g.userData;
  const S = mood(ud);
  const root = piv(g);
  const bark = M(0x3d2b1f, { roughness: 0.92 });
  const barkDark = M(0x281b12, { roughness: 0.95 });
  const vine = M(0x356b21, { roughness: 0.75 });
  const vineDark = M(0x1f4314, { roughness: 0.8 });
  const leaf = M(0x5c9e2e, { roughness: 0.7, side: THREE.DoubleSide });
  const gold = M(0xf5b82e, { metalness: 0.85, roughness: 0.3, emissive: 0x4a2e00, emissiveIntensity: 0.7 });
  const capeMat = M(0x4a1478, { roughness: 0.75, side: THREE.DoubleSide });
  const capeIn = M(0x2a0a45, { roughness: 0.8, side: THREE.DoubleSide });
  const { map, emissiveMap } = tyrantTextures();
  const skin = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.5 });
  const plainPumpkin = M(0xf07a12, { roughness: 0.5 });
  const inside = G(0xff8f00, 2.2, { side: THREE.BackSide });
  const ember = G(0xffa000, 2.6);
  const gemP = G(0xd500f9, 2.2);
  const gemG = G(0x76ff03, 2.2);
  const glowing = [gemP, gemG];
  const headGeo = pumpkinGeo(10, 0.11, PI * 0.13);
  const smallGeo = pumpkinGeo(8, 0.12);

  // ---- 腳：粗樹根腳，腳趾係樹根 ----
  const legs = [-1, 1].map((s) => {
    const hip = piv(root, s * 0.5, 1.25, 0);
    bx(hip, 0.66, 0.72, 0.66, bark, 0, -0.3, 0, 0.25);
    bx(hip, 0.56, 0.5, 0.58, barkDark, 0, -0.82, 0, 0.25);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 6, 16), vine);
    ring.rotation.x = PI / 2 + 0.25;
    ring.position.y = -0.6;
    hip.add(ring);
    bx(hip, 0.8, 0.26, 0.86, bark, 0, -1.12, -0.08, 0.3);
    for (const c of [-1, 0, 1]) taper(hip, [V(c * 0.24, -1.08, -0.4), V(c * 0.32, -1.14, -0.68), V(c * 0.36, -1.24, -0.86)], 0.1, 0.02, barkDark, 6, 6);
    return hip;
  });
  // ---- 腰 + 金腰帶 ----
  bx(root, 1.3, 0.45, 0.84, barkDark, 0, 1.42, 0, 0.3);
  bx(root, 1.46, 0.18, 0.96, gold, 0, 1.6, 0, 0.4);
  const buckle = sph(root, 0.16, 0.14, 0.08, ember, 0, 1.6, -0.5);
  buckle.castShadow = false;

  // ---- 身：樹皮胸，心口有一團火（藤交叉擋住）----
  const torso = piv(root, 0, 1.62, 0);
  bx(torso, 1.75, 1.2, 1.02, bark, 0, 0.62, 0, 0.22);
  bx(torso, 1.55, 0.5, 0.9, barkDark, 0, 0.05, 0, 0.25); // 肚
  sph(torso, 0.4, 0.4, 0.1, M(0x120804), 0, 0.66, -0.49); // 心口窿
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 20), gold);
  rim.position.set(0, 0.66, -0.52);
  torso.add(rim);
  const heart = sph(torso, 0.26, 0.28, 0.14, ember, 0, 0.66, -0.5);
  const heartHalo = sph(torso, 0.36, 0.36, 0.08, ADD(0xff6d00, 0.35), 0, 0.66, -0.56, true);
  heart.castShadow = heartHalo.castShadow = false;
  for (const s of [-1, 1]) taper(torso, [V(s * 0.5, 1.05, -0.5), V(s * 0.1, 0.7, -0.62), V(-s * 0.2, 0.45, -0.6), V(-s * 0.5, 0.25, -0.52)], 0.09, 0.05, vine, 10, 6);
  // 金領（王袍領）
  bx(torso, 1.95, 0.22, 1.16, gold, 0, 1.25, 0, 0.4);
  for (const s of [-1, 1]) {
    const gem = sph(torso, 0.07, 0.07, 0.04, s > 0 ? gemP : gemG, s * 0.55, 1.25, -0.59);
    gem.castShadow = false;
  }
  // 披風（背後）
  const cape = piv(root, 0, 2.85, 0.52);
  const capeG = capeGeo(1.9, 2.5, 2.6, 7);
  const capeM = new THREE.Mesh(capeG, capeMat);
  capeM.castShadow = true;
  cape.add(capeM);
  const capeL = new THREE.Mesh(capeG, capeIn);
  capeL.position.z = -0.02;
  cape.add(capeL);
  bx(cape, 2.0, 0.14, 0.14, gold, 0, -0.02, 0, 0.4);

  // ---- 手：藤手（彎彎、有刺、有葉）+ 爪；左手拎權杖 ----
  const arms = [-1, 1].map((s) => {
    const sh = piv(root, s * 1.12, 2.72, 0);
    // 膊頭：細南瓜燈（都有發光面）
    const pp = new THREE.Mesh(smallGeo, plainPumpkin);
    pp.scale.set(0.46, 0.4, 0.46);
    pp.position.set(s * 0.12, 0.22, 0);
    pp.rotation.y = s * 0.35;
    pp.castShadow = true;
    sh.add(pp);
    cyl(sh, 0.04, 0.16, vineDark, s * 0.12, 0.52, 0, 0, s * 0.3);
    const armPts = [V(0, 0, 0), V(s * 0.16, -0.5, -0.04), V(s * 0.12, -1.0, -0.1), V(s * 0.04, -1.42, -0.12)];
    taper(sh, armPts, 0.24, 0.15, vine, 14, 8);
    // 繞住手嘅幼藤（螺旋）
    const helix = [];
    for (let i = 0; i <= 18; i++) {
      const k = i / 18;
      const a = k * PI * 5;
      const c = new THREE.CatmullRomCurve3(armPts).getPointAt(k * 0.95);
      helix.push(V(c.x + Math.cos(a) * 0.2, c.y, c.z + Math.sin(a) * 0.2));
    }
    taper(sh, helix, 0.045, 0.03, vineDark, 40, 5);
    for (const [k, y] of [[0, -0.35], [1, -0.85]]) {
      const lf = sph(sh, 0.2, 0.03, 0.11, leaf, s * (0.32 + k * 0.05), y, -0.12, true);
      lf.rotation.set(0.3, k ? 0.6 : -0.5, s * (0.5 + k * 0.3));
    }
    for (let i = 0; i < 4; i++) cone(sh, 0.035, 0.14, barkDark, s * (0.2 + (i % 2) * 0.05), -0.2 - i * 0.3, (i % 2 ? 0.12 : -0.18), (i % 2 ? 1.2 : -1.2), s * -1.2, 4);
    // 爪：4 隻彎彎嘅藤指
    const hand = piv(sh, s * 0.04, -1.52, -0.14);
    sph(hand, 0.22, 0.2, 0.22, vineDark, 0, 0, 0);
    const fingers = [];
    for (let f = 0; f < 4; f++) {
      const fp = piv(hand, (f - 1.5) * 0.11, -0.08, -0.06);
      fp.rotation.z = (f - 1.5) * 0.18;
      taper(fp, [V(0, 0, 0), V(0, -0.22, -0.12), V(0, -0.36, -0.06), V(0, -0.42, 0.06)], 0.06, 0.012, f === 0 || f === 3 ? vine : vineDark, 8, 5);
      fingers.push(fp);
    }
    sh.userData.fingers = fingers;
    sh.userData.hand = hand;
    return sh;
  });
  // 權杖：arms[0] 揸住，頂有金框 + 發光南瓜
  const staff = piv(arms[0].userData.hand, 0, 0, -0.05);
  cyl(staff, 0.06, 2.7, bark, 0, -0.2, 0);
  for (const y of [0.95, 0.15, -1.2]) cyl(staff, 0.08, 0.1, gold, 0, y, 0);
  const orbP = new THREE.Mesh(smallGeo, skin);
  orbP.scale.set(0.3, 0.27, 0.3);
  orbP.position.y = 1.4;
  staff.add(orbP);
  const orbHalo = sph(staff, 0.55, 0.55, 0.55, ADD(0xff9100, 0.22), 0, 1.4, 0, true);
  orbHalo.castShadow = false;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2;
    taper(staff, [V(Math.cos(a) * 0.08, 1.02, Math.sin(a) * 0.08), V(Math.cos(a) * 0.32, 1.25, Math.sin(a) * 0.32), V(Math.cos(a) * 0.3, 1.55, Math.sin(a) * 0.3), V(Math.cos(a) * 0.12, 1.72, Math.sin(a) * 0.12)], 0.035, 0.02, gold, 8, 5);
  }
  staff.rotation.set(0.1, 0, 0.32); // 斜出去，唔好遮住膊頭

  // ---- 頭：大南瓜燈（頂開咗，入面有火）+ 金皇冠 + 兩條捲藤似角 ----
  const head = piv(root, 0, 3.45, 0);
  cyl(root, 0.32, 0.4, vineDark, 0, 3.0, 0);
  const pumpkin = new THREE.Mesh(headGeo, skin);
  pumpkin.scale.set(0.98, 0.82, 0.94);
  pumpkin.castShadow = true;
  head.add(pumpkin);
  const inner = new THREE.Mesh(headGeo, inside);
  inner.scale.set(0.93, 0.78, 0.89);
  head.add(inner);
  // 皇冠：一圈金片 + 尖 + 寶石，斜少少戴
  const crown = piv(head, 0.04, 0.62, 0.02);
  crown.rotation.set(-0.08, 0, -0.14);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.44, 0.2, 16, 1, true), gold);
  band.material.side = THREE.DoubleSide;
  crown.add(band);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 2; // i=0 正面
    const tall = i % 2 === 0;
    const x = Math.cos(a) * 0.46;
    const z = -Math.sin(a) * 0.46;
    const spike = cone(crown, 0.11, tall ? 0.42 : 0.26, gold, x, 0.1 + (tall ? 0.21 : 0.13), z, 0, 0, 4);
    spike.rotation.y = a;
    const gem = sph(crown, 0.06, 0.07, 0.04, tall ? gemP : gemG, Math.cos(a) * 0.49, 0.0, -Math.sin(a) * 0.49);
    gem.rotation.y = a + PI / 2;
    gem.castShadow = false;
    if (tall) sph(crown, 0.05, 0.05, 0.05, gold, x * 1.0, 0.1 + 0.44, z * 1.0);
  }
  const flames = [flame(head, 0, 0.42, 0, 1.15), flame(head, -0.2, 0.4, 0.1, 0.7), flame(head, 0.22, 0.4, -0.05, 0.75)];
  const headEmbers = embers(head, 10, 0xffab40, 0, 0.9, 0, 0.5, 1.6);
  for (const s of [-1, 1]) {
    taper(head, [V(s * 0.62, 0.3, 0.12), V(s * 0.98, 0.6, 0.22), V(s * 1.12, 1.02, 0.05), V(s * 0.98, 1.24, -0.14), V(s * 0.82, 1.15, -0.12)], 0.09, 0.02, vine, 18, 6);
    const lf = sph(head, 0.18, 0.03, 0.1, leaf, s * 0.95, 0.62, 0.2, true);
    lf.rotation.set(0.2, 0.4 * s, s * 0.9);
  }
  // ---- 腳下：熔岩光圈 + 砸地衝擊波 ----
  const pool = glowDisc(g, 2.0, 0xff6d00, 0.5);
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), ADD(0xffab40, 0));
  wave.rotation.x = -PI / 2;
  wave.position.set(0, 0.06, -1.4);
  g.add(wave);
  const waveEmbers = embers(g, 14, 0xff9100, 0, 0.1, -1.4, 2.4, 1.2);

  // 砸地：一開始（k 由 0 變大）就自己跑一套 1.1 秒動作：舉高 → 砸落 → 衝擊波 → 收返
  let poundT = -1;
  g.userData.pound = (k) => {
    if (k > 0.05 && poundT < 0) poundT = 0;
  };
  ud.height = 4.6;
  ud.extra = (t) => {
    const dt = S.tick(t);
    const a = S.anger;
    const r = S.roar;
    // 內火閃（好似燭光）
    const fl = 0.86 + Math.sin(t * 13) * 0.07 + Math.sin(t * 7.3 + 1) * 0.06 + Math.sin(t * 23) * 0.03;
    skin.emissiveIntensity = (1.1 + a * 0.4 + r * 0.7) * fl;
    inside.emissiveIntensity = (2 + r * 1.2) * fl;
    ember.emissiveIntensity = (1.6 + a * 0.6 + r * 1.2) * fl;
    for (const m of glowing) if (m !== ember) m.emissiveIntensity = 1.8 + Math.sin(t * 3) * 0.4 + r;
    const hs = 0.36 * (1 + Math.sin(t * 3) * 0.12 + r * 0.5);
    heartHalo.scale.set(hs, hs, 0.1);
    heart.scale.setScalar(0.27 * (1 + Math.sin(t * 6) * 0.08));
    flames.forEach((f, i) => {
      f.userData.flicker(t);
      f.scale.setScalar((i ? 1 : 1.15) * (1 + a * 0.2 + r * 0.4));
    });
    headEmbers(dt, 1 + a + r * 2);
    orbHalo.scale.setScalar(0.55 * (1 + Math.sin(t * 4) * 0.1));
    // 走路：重重咁踩（腳擺細啲）、身左右搖
    const swing = legs[0].rotation.x;
    legs[0].rotation.x *= 0.6;
    legs[1].rotation.x *= 0.6;
    root.rotation.z = swing * 0.07;
    // 頭：慢慢左右睇；追緊就盯實前面；吼就仰後
    head.position.y = 3.45 + Math.sin(t * 2) * 0.03;
    head.rotation.y = Math.sin(t * 0.7) * 0.18 * (1 - a);
    head.rotation.z = -swing * 0.05;
    head.rotation.x = r * 0.5 - a * 0.08;
    // 手：追緊就向前伸出爪；吼就攤開
    arms.forEach((arm, i) => {
      const s = i ? 1 : -1;
      arm.rotation.x += a * 0.45 - r * 0.5;
      arm.rotation.z = s * (0.08 + r * 0.9 + a * 0.12);
      arm.userData.fingers.forEach((f, j) => (f.rotation.x = 0.2 + a * 0.4 + Math.sin(t * 3 + j) * 0.08 - r * 0.4));
    });
    torso.rotation.x = -r * 0.15;
    cape.rotation.x = 0.06 + a * 0.3 + Math.sin(t * 2.1) * 0.04 + Math.abs(swing) * 0.1;
    // 砸地
    let pk = 0;
    if (poundT >= 0) {
      poundT += dt;
      const p = poundT / 1.1;
      if (p >= 1) poundT = -1;
      else {
        const up = p < 0.5 ? smooth(p / 0.5) : p < 0.62 ? 1 - smooth((p - 0.5) / 0.12) : 0;
        const slam = p >= 0.62 ? 1 - smooth((p - 0.62) / 0.38) : 0;
        for (const arm of arms) {
          arm.rotation.x = 2.75 * up + 0.7 * slam;
          arm.rotation.z *= 0.3;
        }
        root.rotation.x = -0.12 * up + 0.38 * slam;
        root.position.y += up * 0.2;
        head.rotation.x = -0.35 * up + 0.2 * slam;
        if (p >= 0.62) pk = (p - 0.62) / 0.38;
      }
    }
    wave.visible = pk > 0;
    if (pk > 0) {
      wave.scale.setScalar(0.4 + pk * 4.5);
      wave.material.opacity = 0.9 * (1 - pk);
    }
    waveEmbers(pk > 0 ? dt * 2 : 0, pk > 0 ? 1 : 0);
    pool.material.opacity = 0.45 + Math.sin(t * 2.4) * 0.08 + a * 0.12 + (pk > 0 ? (1 - pk) * 0.5 : 0);
    pool.scale.setScalar(1 + (pk > 0 ? (1 - pk) * 0.6 : 0));
  };
  return { g, root, legs, arms, head, torso };
}

// ======================= 👻 Hollow Wraith =======================
// 斗篷用 Lathe（轉一圈嘅形）：下面爛邊一條條尖，每格郁 vertex 好似喺風入面飄
function tatteredLathe(profile, teeth, depth, seed = 1) {
  // 由下至上排（咁樣面先向外；uv v 0 = 底）
  const geo = new THREE.LatheGeometry([...profile].sort((a, b) => a[1] - b[1]).map(([r, y]) => new THREE.Vector2(r, y)), 36);
  const p = geo.attributes.position;
  const ys = profile.map((q) => q[1]);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const jag = [];
  for (let i = 0; i < teeth; i++) jag.push(0.55 + (((i + seed) * 7919) % 100) / 220);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const h = (y - yMin) / (yMax - yMin);
    if (h < 0.4) {
      const a = (Math.atan2(x, z) + PI) / (PI * 2);
      const f = (a * teeth) % 1;
      const tooth = jag[Math.floor(a * teeth) % teeth];
      const tri = 1 - Math.abs(2 * f - 1);
      p.setY(i, y - depth * tooth * Math.pow(tri, 1.6) * ((0.4 - h) / 0.4));
    }
  }
  geo.computeVertexNormals();
  geo.userData.base = Float32Array.from(p.array);
  geo.userData.yMin = yMin - depth;
  geo.userData.yMax = yMax;
  return geo;
}
// 斗篷由上至下慢慢變透明（幽靈感）：alphaMap 用 v 方向漸變
let fadeTex = null;
function fadeMap() {
  if (fadeTex) return fadeTex;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 128;
  const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#fff'); // canvas 頂 = v 1 = 斗篷頂；canvas 底 = v 0 = 爛邊
  gr.addColorStop(0.6, '#fff');
  gr.addColorStop(0.88, '#555');
  gr.addColorStop(1, '#000');
  x.fillStyle = gr;
  x.fillRect(0, 0, 4, 128);
  fadeTex = new THREE.CanvasTexture(c);
  return fadeTex;
}
// 斗篷飄：k = 飄幾多，back = 向後拖（追緊人）
function rippleCloth(geo, t, k, back, phase = 0) {
  const p = geo.attributes.position;
  const b = geo.userData.base;
  const { yMin, yMax } = geo.userData;
  for (let i = 0; i < p.count; i++) {
    const x = b[i * 3];
    const y = b[i * 3 + 1];
    const z = b[i * 3 + 2];
    const w = Math.pow(1 - clamp((y - yMin) / (yMax - yMin), 0, 1), 1.6);
    const a = Math.atan2(x, z);
    const wave = Math.sin(t * 2.8 + a * 3 + y * 2.5 + phase);
    p.setXYZ(i, x * (1 + wave * 0.06 * k * w), y + Math.cos(t * 3.1 + a * 4) * 0.05 * w * k, z + (wave * 0.07 * k + back * 0.55) * w);
  }
  p.needsUpdate = true;
}

export function buildHollowWraith() {
  const g = new THREE.Group();
  const ud = g.userData;
  const S = mood(ud);
  const root = piv(g, 0, 0.9, 0); // 浮高咗
  const GLOW = 0x5effc4;
  const cloth = new THREE.MeshStandardMaterial({ color: 0x16242a, emissive: 0x0b3a32, emissiveIntensity: 0.45, roughness: 0.9, side: THREE.DoubleSide });
  const robeMat = new THREE.MeshStandardMaterial({ color: 0x16242a, emissive: 0x0b3a32, emissiveIntensity: 0.45, roughness: 0.9, side: THREE.FrontSide, transparent: true, alphaMap: fadeMap() });
  const clothLight = new THREE.MeshStandardMaterial({ color: 0x223a3c, emissive: 0x0e4a40, emissiveIntensity: 0.5, roughness: 0.85, side: THREE.DoubleSide });
  const lining = new THREE.MeshStandardMaterial({ color: 0x06140f, emissive: 0x1de9b6, emissiveIntensity: 0.3, roughness: 0.9, side: THREE.BackSide, transparent: true, alphaMap: fadeMap(), depthWrite: false });
  const bone = new THREE.MeshStandardMaterial({ color: 0xd5efe3, emissive: 0x1de9b6, emissiveIntensity: 0.22, roughness: 0.6 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x8a9aa0, emissive: 0x0b3a32, emissiveIntensity: 0.35, metalness: 0.7, roughness: 0.35 });
  const hoodDark = new THREE.MeshStandardMaterial({ color: 0x030807, roughness: 1, side: THREE.DoubleSide });
  const eyeMat = G(GLOW, 4);
  const fading = [cloth, clothLight, bone, iron, hoodDark];
  const alwaysSeeThrough = [robeMat, lining];
  const legs = [-1, 1].map((s) => piv(root, s * 0.3, 1, 0)); // 冇腳：隱形 pivot（animateRig 照擺都冇事）

  // ---- 斗篷：長袍 + 入面發光嘅裏 + 膊頭披肩 ----
  const torso = piv(root, 0, 0, 0);
  const robeGeo = tatteredLathe([[0.38, 2.8], [0.56, 2.45], [0.66, 1.9], [0.84, 1.25], [1.08, 0.6], [1.28, 0.1]], 11, 0.6, 3);
  const robe = new THREE.Mesh(robeGeo, robeMat);
  robe.castShadow = true;
  torso.add(robe);
  const robeIn = new THREE.Mesh(robeGeo, lining);
  robeIn.scale.set(0.97, 1, 0.97);
  torso.add(robeIn);
  const mantleGeo = tatteredLathe([[0.36, 3.0], [0.62, 2.85], [0.88, 2.55], [1.02, 2.15]], 9, 0.35, 7);
  const mantle = new THREE.Mesh(mantleGeo, clothLight);
  mantle.castShadow = true;
  torso.add(mantle);
  // 鐵鏈：斜斜繞住身兩圈 + 心口一個發光鎖
  loopChain(torso, 1.55, 0.86, 0.8, 0.22, 26, iron);
  loopChain(torso, 1.05, 0.98, 0.92, -0.18, 28, iron);
  bx(torso, 0.22, 0.24, 0.1, iron, 0.0, 1.38, -0.86, 0.3);
  const lockGlow = sph(torso, 0.05, 0.06, 0.03, G(GLOW, 3), 0, 1.36, -0.92);
  lockGlow.castShadow = false;
  // ---- 幽靈尾：斗篷下面拖住幾條發光煙 ----
  const wisps = [];
  for (let w = 0; w < 5; w++) {
    const a = (w / 5) * PI * 2 + 0.3;
    const parts = [];
    for (let i = 0; i < 12; i++) {
      const m = sph(root, 1, 1, 1, ADD(i % 2 ? GLOW : 0x9effe0, 0.2 - i * 0.014), 0, 0, 0, true);
      m.castShadow = false;
      parts.push(m);
    }
    wisps.push({ a, parts, ph: w * 1.7 });
  }
  const mist = glowDisc(g, 2.2, GLOW, 0.3);

  // ---- 帽：尖帽向後，前面開口；入面全黑，得一對發光眼同一個嗚嗚聲嘅口 ----
  const head = piv(root, 0, 3.0, -0.02);
  const OPEN = 1.9;
  const hoodGeo = new THREE.SphereGeometry(1, 26, 18, (3 * PI) / 2 + OPEN / 2, PI * 2 - OPEN, 0, PI * 0.78);
  {
    const p = hoodGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y > 0) {
        p.setZ(i, p.getZ(i) + y * y * y * 0.55);
        p.setY(i, y + y * y * y * 0.45);
      }
    }
    hoodGeo.computeVertexNormals();
  }
  const hood = new THREE.Mesh(hoodGeo, clothLight);
  hood.scale.set(0.62, 0.7, 0.66);
  hood.castShadow = true;
  head.add(hood);
  const hoodIn = new THREE.Mesh(hoodGeo, hoodDark);
  hoodIn.scale.set(0.58, 0.66, 0.62);
  head.add(hoodIn);
  const voidM = sph(head, 0.5, 0.58, 0.5, new THREE.MeshBasicMaterial({ color: 0x010403 }), 0, -0.04, 0.05);
  voidM.castShadow = false;
  const eyes = [-1, 1].map((s) => {
    const e = piv(head, s * 0.16, 0.02, -0.44);
    e.rotation.z = s * -0.5; // 斜 = 兇
    sph(e, 0.085, 0.022, 0.03, eyeMat, 0, 0, 0).castShadow = false;
    const halo = sph(e, 0.15, 0.06, 0.02, ADD(GLOW, 0.3), 0, 0, -0.01, true);
    halo.castShadow = false;
    return e;
  });
  const mouthGlow = sph(head, 0.09, 0.13, 0.02, ADD(GLOW, 0.3), 0, -0.24, -0.44, true);
  mouthGlow.castShadow = false;

  // ---- 手：好闊嘅爛袖 + 幽靈骨爪 + 手腕鐵鐐同斷鏈；左手吊住一盞靈魂燈籠 ----
  const sleeveGeo = tatteredLathe([[0.16, 0], [0.22, -0.45], [0.3, -0.85], [0.42, -1.2]], 7, 0.3, 11);
  const arms = [-1, 1].map((s) => {
    const sh = piv(root, s * 0.88, 2.62, 0);
    const sleeve = new THREE.Mesh(sleeveGeo, cloth);
    sleeve.castShadow = true;
    sh.add(sleeve);
    const sleeveIn = new THREE.Mesh(sleeveGeo, lining);
    sleeveIn.scale.set(0.94, 1, 0.94);
    sh.add(sleeveIn);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 14), iron);
    shackle.rotation.x = PI / 2;
    shackle.position.y = -1.18;
    sh.add(shackle);
    const hand = piv(sh, 0, -1.25, 0);
    bx(hand, 0.2, 0.18, 0.12, bone, 0, -0.06, 0, 0.3);
    const fingers = [];
    for (let f = 0; f < 4; f++) {
      const f1 = piv(hand, (f - 1.5) * 0.055, -0.14, -0.02);
      f1.rotation.z = (f - 1.5) * 0.12;
      bx(f1, 0.045, 0.2, 0.045, bone, 0, -0.1, 0, 0.3);
      const f2 = piv(f1, 0, -0.2, 0);
      bx(f2, 0.04, 0.18, 0.04, bone, 0, -0.09, 0, 0.3);
      cone(f2, 0.025, 0.12, bone, 0, -0.22, 0, PI, 0, 4);
      fingers.push([f1, f2]);
    }
    const broken = hangChain(sh, s * 0.12, -1.22, 0.08, 0.6, iron);
    sh.userData = { fingers, hand, broken };
    return sh;
  });
  const lanternRope = hangChain(arms[0].userData.hand, 0, -0.12, 0, 0.5, iron);
  const lantern = piv(lanternRope, 0, -0.6, 0);
  for (const y of [0.02, -0.5]) bx(lantern, 0.36, 0.06, 0.36, iron, 0, y, 0, 0.3);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(lantern, 0.06, 0.5, 0.06, iron, x * 0.16, -0.24, z * 0.16, 0.3);
  cone(lantern, 0.2, 0.18, iron, 0, 0.13, 0, 0, 0, 4).rotation.y = PI / 4;
  const soul = sph(lantern, 0.07, 0.09, 0.07, G(0xb9ffe6, 2.2), 0, -0.26, 0);
  soul.castShadow = false;
  const soulFlame = flame(lantern, 0, -0.33, 0, 0.45, [0xe0fff4, GLOW, 0x00bfa5]);
  const soulHalo = sph(lantern, 0.3, 0.3, 0.3, ADD(GLOW, 0.12), 0, -0.24, 0, true);
  soulHalo.castShadow = false;

  let flick = 0;
  let lastFlick = 0;
  ud.height = 4.4;
  ud.floating = true;
  ud.extra = (t) => {
    S.tick(t);
    const a = S.anger;
    const r = S.roar;
    // 浮：上下 + 追緊就向前傾、吼就仰後
    root.position.y = 0.9 + Math.sin(t * 1.6) * 0.18;
    root.rotation.x = -0.26 * a + r * 0.22;
    root.rotation.z = Math.sin(t * 1.1) * 0.04;
    rippleCloth(robeGeo, t, 1 + a * 0.6, a * 0.8);
    rippleCloth(mantleGeo, t, 0.8 + a * 0.4, a * 0.25, 1.3);
    rippleCloth(sleeveGeo, t, 0.9, a * 0.2, 2.1);
    // 幽靈尾：由斗篷底拖出嚟，左右擺，追緊就拖長啲
    for (const w of wisps) {
      w.parts.forEach((m, i) => {
        const k = i / w.parts.length;
        const sway = Math.sin(t * 2.2 - i * 0.55 + w.ph) * 0.25 * k;
        const rr = 0.85 + k * 0.4;
        m.position.set(Math.cos(w.a) * rr + sway, -0.05 - k * 0.7, Math.sin(w.a) * rr + k * (0.6 + a * 1.6));
        const sc = (0.2 - k * 0.16) * (1 + Math.sin(t * 4 + i + w.ph) * 0.12);
        m.scale.set(sc, sc * 1.3, sc * 1.6);
      });
    }
    mist.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
    // 眼：閃吓閃吓，嬲／吼就更光更大
    eyeMat.emissiveIntensity = (3.5 + Math.sin(t * 5) * 0.6) * (1 + a * 0.4 + r * 0.8);
    eyes.forEach((e) => e.scale.setScalar(1 + a * 0.15 + r * 0.15));
    mouthGlow.scale.set(0.09 + r * 0.04, 0.13 + r * 0.12, 0.02);
    mouthGlow.material.opacity = 0.25 + r * 0.55 + Math.sin(t * 3) * 0.05;
    head.rotation.x = r * 0.45 - a * 0.1;
    head.rotation.y = Math.sin(t * 0.6) * 0.25 * (1 - a);
    // 手：平時垂低慢慢郁；追緊就向前伸爪；吼就攤大
    arms.forEach((arm, i) => {
      const s = i ? 1 : -1;
      const idleX = 0.35 + Math.sin(t * 1.3 + i * 2) * 0.1;
      arm.rotation.x = lerp(idleX, 1.25 + Math.sin(t * 5 + i * PI) * 0.12, a) * (1 - r) + 0.4 * r;
      arm.rotation.z = s * (0.18 + r * 1.1 - a * 0.08);
      arm.userData.fingers.forEach(([f1, f2], j) => {
        const c = 0.25 + a * 0.35 + Math.sin(t * 4 + j * 0.8 + i) * 0.15 * a - r * 0.3;
        f1.rotation.x = c;
        f2.rotation.x = c * 1.2;
      });
      arm.userData.broken.rotation.x = -arm.rotation.x + Math.sin(t * 2.2 + i) * 0.25;
      arm.userData.broken.rotation.z = -arm.rotation.z;
    });
    lanternRope.rotation.x = -arms[0].rotation.x - root.rotation.x + Math.sin(t * 1.9) * 0.3;
    lanternRope.rotation.z = -arms[0].rotation.z + Math.sin(t * 1.4) * 0.15;
    soulFlame.userData.flicker(t);
    soulHalo.scale.setScalar(0.3 * (1 + Math.sin(t * 4) * 0.12 + r * 0.4));
    soul.material.emissiveIntensity = 2 + Math.sin(t * 6) * 0.4;
    // 瞬移閃爍
    const on = flick > 0.001;
    if (on !== lastFlick > 0.001) for (const m of fading) m.transparent = on;
    lastFlick = flick;
    for (const m of fading) m.opacity = 1 - flick * 0.92;
    for (const m of alwaysSeeThrough) m.opacity = 1 - flick * 0.92;
    voidM.visible = flick < 0.75;
    if (flick > 0) {
      root.position.x = (Math.random() - 0.5) * 0.14 * flick;
      root.scale.set(1 - flick * 0.3, 1 + flick * 0.4, 1 - flick * 0.3);
    } else {
      root.position.x = 0;
      root.scale.setScalar(1);
    }
    mist.material.opacity = 0.3 + flick * 0.5 + a * 0.1;
  };
  // 瞬移閃爍：k 0→1 慢慢消失（帶靈氣），1→0 出返嚟
  ud.flicker = (k) => (flick = clamp(k, 0, 1));
  return { g, root, legs, arms, head, torso };
}

// ======================= 🐉 Bone Drake =======================
// 四隻腳：legs[0] = 左前（同右後一齊擺），legs[1] = 右前（同左後）
export function buildBoneDrake() {
  const g = new THREE.Group();
  const ud = g.userData;
  const S = mood(ud);
  const root = piv(g);
  const bone = M(0xeee3cc, { roughness: 0.7 });
  const boneMid = M(0xd2c2a2, { roughness: 0.75 });
  const boneDark = M(0xa8977a, { roughness: 0.8 });
  const socket = M(0x0c140e, { roughness: 1 });
  const iron = M(0x37474f, { metalness: 0.7, roughness: 0.4 });
  const SOUL = [0xeaffd0, 0x76ff03, 0x00c853];
  const soulCore = G(0x9cff57, 2);
  const eyeMat = G(0xb2ff59, 4);
  const runeMat = G(0x76ff03, 1.6);
  const spineY = 2.0;

  // ---- 脊骨：一節節 + 背脊骨刺（向後斜）----
  const torso = piv(root, 0, spineY, 0);
  for (let i = 0; i < 10; i++) {
    const z = 1.25 - i * 0.26;
    bx(torso, 0.34, 0.26, 0.2, i % 2 ? bone : boneMid, 0, 0, z, 0.3);
    const h = 0.28 + Math.sin((i / 9) * PI) * 0.32;
    const sp = cone(torso, 0.07, h, bone, 0, 0.12 + h / 2, z, 0.45, 0, 4);
    sp.castShadow = true;
  }
  // 肋骨籠：兩邊一條條彎骨，中間最大
  for (let i = 0; i < 6; i++) {
    const z = -0.8 + i * 0.27;
    const k = 1 - Math.abs(i - 2) * 0.12;
    for (const s of [-1, 1]) {
      taper(torso, [V(s * 0.14, -0.02, z), V(s * 0.6 * k, -0.12, z + 0.06), V(s * 0.7 * k, -0.62 * k, z + 0.12), V(s * 0.42 * k, -1.02 * k, z + 0.08), V(s * 0.08, -1.12 * k, z + 0.02)], 0.065, 0.035, i % 2 ? boneMid : bone, 14, 6);
    }
  }
  bx(torso, 0.2, 0.12, 1.5, boneMid, 0, -1.1, -0.15, 0.4); // 胸骨
  // 心口：綠色靈魂火
  const core = sph(torso, 0.24, 0.26, 0.22, soulCore, 0, -0.62, -0.2);
  const coreHalo = sph(torso, 0.45, 0.45, 0.45, ADD(0x76ff03, 0.2), 0, -0.62, -0.2, true);
  core.castShadow = coreHalo.castShadow = false;
  const chestFire = [flame(torso, 0, -0.95, -0.2, 1.35, SOUL), flame(torso, -0.18, -0.95, 0.1, 0.8, SOUL), flame(torso, 0.18, -0.95, -0.4, 0.8, SOUL)];
  const chestEmbers = embers(torso, 8, 0xb2ff59, 0, -0.7, -0.2, 0.5, 1.2);
  // 膊胛骨 + 盤骨
  for (const s of [-1, 1]) {
    const sc = bx(torso, 0.1, 0.5, 0.42, bone, s * 0.42, -0.08, -0.85, 0.35);
    sc.rotation.z = s * 0.35;
  }
  bx(torso, 0.95, 0.32, 0.5, bone, 0, -0.1, 1.22, 0.35);
  for (const s of [-1, 1]) cone(torso, 0.07, 0.3, boneMid, s * 0.5, 0.08, 1.3, 0.6, -s * 0.8, 4);
  // 鐵鏈：頸度一圈斷咗嘅鏈（以前俾人鎖住）
  hangChain(torso, -0.3, -0.25, -1.05, 0.7, iron).rotation.z = 0.2;

  // ---- 尾：一節節細落去，尾尖係骨刀 + 綠光 ----
  const tailSegs = [];
  let tp = piv(torso, 0, -0.05, 1.45);
  for (let i = 0; i < 11; i++) {
    const s = 1 - i * 0.075;
    bx(tp, 0.24 * s, 0.2 * s, 0.28, i % 2 ? boneMid : bone, 0, 0, 0.14, 0.3);
    cone(tp, 0.05 * s, 0.22 * s, bone, 0, 0.16 * s, 0.14, 0.5, 0, 4);
    const next = piv(tp, 0, 0, 0.28);
    next.rotation.x = i < 4 ? 0.05 : -0.04;
    tailSegs.push(next);
    tp = next;
  }
  const blade = bx(tp, 0.06, 0.34, 0.5, bone, 0, 0, 0.25, 0.3);
  blade.rotation.x = 0.3;
  for (const s of [-1, 1]) cone(tp, 0.05, 0.36, bone, s * 0.12, 0, 0.2, PI / 2, s * 0.6, 4);
  const tailGlow = sph(tp, 0.12, 0.12, 0.2, ADD(0x76ff03, 0.45), 0, 0, 0.22, true);
  tailGlow.castShadow = false;

  // ---- 頸：S 形一節節（向上彎）----
  const neckSegs = [];
  let np = piv(torso, 0, 0.12, -1.2);
  const neckRest = [0.4, 0.32, 0.22, 0.08, -0.08, -0.18];
  for (let i = 0; i < 6; i++) {
    const seg = piv(np, 0, 0, 0);
    seg.rotation.x = neckRest[i];
    bx(seg, 0.26 - i * 0.012, 0.24, 0.28, i % 2 ? boneMid : bone, 0, 0, -0.13, 0.3);
    cone(seg, 0.05, 0.26 - i * 0.02, bone, 0, 0.22, -0.1, 0.5, 0, 4);
    neckSegs.push(seg);
    np = piv(seg, 0, 0, -0.27);
  }
  // ---- 頭：骷髏龍頭 ----
  const head = piv(np, 0, 0.02, -0.05);
  head.scale.setScalar(1.25);
  const skull = piv(head, 0, 0, 0);
  bx(skull, 0.64, 0.46, 0.62, bone, 0, 0.08, -0.05, 0.3); // 頭殼
  bx(skull, 0.46, 0.28, 0.6, bone, 0, 0.02, -0.6, 0.3); // 上顎
  bx(skull, 0.34, 0.22, 0.24, boneMid, 0, 0.02, -0.98, 0.35); // 鼻尖
  for (const s of [-1, 1]) {
    sph(skull, 0.04, 0.03, 0.03, socket, s * 0.08, 0.1, -1.1); // 鼻孔
    // 眉骨：斜落中間 = 好兇
    const brow = bx(skull, 0.3, 0.1, 0.32, bone, s * 0.2, 0.32, -0.32, 0.3);
    brow.rotation.z = s * 0.32;
    brow.rotation.x = -0.15;
    bx(skull, 0.2, 0.17, 0.08, socket, s * 0.21, 0.16, -0.36, 0.3); // 眼窩
    // 面頰骨刺
    cone(skull, 0.07, 0.4, boneMid, s * 0.36, -0.02, 0.18, PI / 2 + 0.2, -s * 0.5, 4);
    // 大角：向後彎
    taper(skull, [V(s * 0.2, 0.28, 0.05), V(s * 0.36, 0.52, 0.32), V(s * 0.44, 0.6, 0.7), V(s * 0.38, 0.42, 1.05), V(s * 0.3, 0.24, 1.15)], 0.1, 0.015, bone, 18, 7);
    taper(skull, [V(s * 0.28, 0.12, 0.12), V(s * 0.5, 0.2, 0.36), V(s * 0.62, 0.16, 0.58)], 0.06, 0.012, boneMid, 10, 6);
  }
  // 眼：綠火
  const eyeFlames = [-1, 1].map((s) => {
    sph(skull, 0.065, 0.05, 0.03, eyeMat, s * 0.21, 0.16, -0.4).castShadow = false;
    const f = flame(skull, s * 0.21, 0.15, -0.36, 0.32, SOUL);
    f.rotation.x = 0.5;
    return f;
  });
  // 牙
  const tooth = M(0xfffdf5, { roughness: 0.5 });
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) cone(skull, 0.035, 0.14, tooth, s * 0.17, -0.16, -0.42 - i * 0.14, PI, 0, 4);
  cone(skull, 0.05, 0.22, tooth, -0.12, -0.18, -0.92, PI, 0, 4);
  cone(skull, 0.05, 0.22, tooth, 0.12, -0.18, -0.92, PI, 0, 4);
  // 下巴
  const jaw = piv(head, 0, -0.12, -0.12);
  bx(jaw, 0.42, 0.12, 0.85, boneMid, 0, -0.04, -0.42, 0.3);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) cone(jaw, 0.032, 0.12, tooth, s * 0.15, 0.06, -0.3 - i * 0.14, 0, 0, 4);
  // 口入面嘅綠火 + 吐息
  const mouthFire = piv(head, 0, -0.1, -0.5);
  mouthFire.rotation.x = -PI / 2;
  const mf = flame(mouthFire, 0, -0.1, 0, 0.6, SOUL);
  const mouthGlow = sph(head, 0.16, 0.1, 0.4, ADD(0x76ff03, 0.5), 0, -0.1, -0.5, true);
  mouthGlow.castShadow = false;
  const breath = piv(head, 0, -0.12, -1.05);
  const puffs = [];
  for (let i = 0; i < 8; i++) {
    const p = sph(breath, 1, 1, 1, ADD(i % 2 ? 0x76ff03 : 0xccff90, 0.4), 0, 0, 0, true);
    p.castShadow = false;
    puffs.push(p);
  }

  // ---- 腳：大髀 → 膝 → 小腿 → 腳掌 + 爪 ----
  const leg = (x, z, front) => {
    const hip = piv(torso, x, -0.3, z);
    sph(hip, 0.19, 0.19, 0.19, boneMid, 0, 0, 0);
    const kneeP = V(0, -0.85, front ? -0.12 : 0.18);
    between(hip, V(), kneeP, 0.14, bone, 0.1);
    const knee = piv(hip, kneeP.x, kneeP.y, kneeP.z);
    sph(knee, 0.13, 0.13, 0.13, boneMid, 0, 0, 0);
    const ankle = V(0, -0.8, front ? 0.1 : -0.16);
    between(knee, V(), ankle, 0.1, bone, 0.075);
    sph(knee, 0.08, 0.08, 0.08, boneMid, ankle.x, ankle.y, ankle.z);
    bx(knee, 0.3, 0.1, 0.36, boneMid, 0, ankle.y - 0.04, ankle.z - 0.1, 0.35);
    for (const c of [-1, 0, 1]) taper(knee, [V(c * 0.1, ankle.y - 0.02, ankle.z - 0.25), V(c * 0.13, ankle.y - 0.04, ankle.z - 0.42), V(c * 0.14, ankle.y - 0.1, ankle.z - 0.5)], 0.04, 0.008, boneDark, 6, 5);
    hip.userData.knee = knee;
    return hip;
  };
  const fl = leg(-0.48, -0.85, true);
  const fr = leg(0.48, -0.85, true);
  const bl = leg(-0.5, 1.2, false);
  const br = leg(0.5, 1.2, false);
  const legs = [fl, fr];
  bx(fr, 0.26, 0.1, 0.26, iron, 0, -0.6, 0, 0.3); // 腳鐐（斷咗）

  // ---- 骨翼：上臂 + 前臂 + 4 條指骨 + 爛爛嘅薄膜（扇貝邊）----
  const membrane = new THREE.MeshStandardMaterial({ color: 0x24302a, emissive: 0x00e676, emissiveIntensity: 0.08, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, roughness: 0.8 });
  const wings = [-1, 1].map((s) => {
    const w = piv(torso, s * 0.32, 0.22, -0.75);
    const E = V(s * 1.25, 0.55, 0.1);
    between(w, V(), E, 0.085, bone, 0.065);
    sph(w, 0.12, 0.12, 0.12, boneMid, E.x, E.y, E.z);
    const elbow = piv(w, E.x, E.y, E.z);
    const W = V(s * 1.15, 0.3, 0.25);
    between(elbow, V(), W, 0.065, bone, 0.05);
    sph(elbow, 0.09, 0.09, 0.09, boneMid, W.x, W.y, W.z);
    cone(elbow, 0.05, 0.3, bone, W.x + s * 0.05, W.y + 0.16, W.z - 0.05, -0.3, -s * 0.4, 4); // 拇指爪
    const tips = [V(s * 1.15, -0.55, 0.75), V(s * 0.75, -1.15, 1.25), V(s * 0.2, -1.4, 1.5), V(-s * 0.4, -1.25, 1.45)].map((d) => W.clone().add(d));
    for (const T of tips) {
      const mid = W.clone().lerp(T, 0.55).add(V(0, 0.08, 0));
      taper(elbow, [W, mid, T], 0.045, 0.012, boneMid, 8, 5);
    }
    // 膜（喺 elbow 入面）：W → 指尖（中間凹入）→ 貼返身
    const B = V(-s * 1.2, -0.55, 0.75); // 身側（背）
    const poly = [tips[0]];
    for (let i = 1; i < tips.length; i++) {
      poly.push(tips[i - 1].clone().lerp(tips[i], 0.5).lerp(W, 0.28));
      poly.push(tips[i]);
    }
    poly.push(tips[3].clone().lerp(B, 0.5).lerp(W, 0.2), B, V(-s * 0.1, -0.15, 0.05));
    const v = [];
    for (let i = 0; i < poly.length - 1; i++) v.push(...W.toArray(), ...poly[i].toArray(), ...poly[i + 1].toArray());
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.computeVertexNormals();
    elbow.add(new THREE.Mesh(geo, membrane));
    // 指骨上嘅綠色符文光點
    for (const T of tips.slice(0, 3)) sph(elbow, 0.04, 0.04, 0.04, runeMat, T.x, T.y, T.z).castShadow = false;
    w.userData.elbow = elbow;
    return w;
  });
  // arms：骨龍冇手，用隱形 pivot（bosses.js 照擺都冇事）
  const arms = [piv(root), piv(root)];
  const mist = glowDisc(g, 2.8, 0x76ff03, 0.22);

  let flyK = 0;
  let flyWant = 0;
  ud.height = 3.9;
  ud.extra = (t) => {
    const dt = S.tick(t);
    const a = S.anger;
    const r = S.roar;
    flyK += (flyWant - flyK) * Math.min(1, dt * 4);
    // 腳：前後對角一齊行；飛嘅時候縮埋
    const swing = fl.rotation.x * 0.6;
    const swing2 = fr.rotation.x * 0.6;
    const fk = smooth(clamp((flyK - 0.3) / 0.7, 0, 1));
    fl.rotation.x = lerp(swing, -0.9, fk);
    fr.rotation.x = lerp(swing2, -0.9, fk);
    br.rotation.x = lerp(swing, -1.0, fk);
    bl.rotation.x = lerp(swing2, -1.0, fk);
    for (const [h, sw] of [[fl, swing], [fr, swing2], [bl, swing2], [br, swing]]) h.userData.knee.rotation.x = lerp(Math.max(0, -sw) * 0.6, 0.8, fk);
    // 呼吸 + 心口火
    const pulse = 1 + Math.sin(t * 4) * 0.12 + r * 0.4;
    core.scale.set(0.24 * pulse, 0.26 * pulse, 0.22 * pulse);
    coreHalo.scale.setScalar(0.45 * pulse);
    soulCore.emissiveIntensity = 1.8 + Math.sin(t * 4) * 0.4 + r * 2;
    chestFire.forEach((f, i) => {
      f.userData.flicker(t);
      f.scale.setScalar((i ? 0.7 : 1.1) * (1 + a * 0.2 + r * 0.5));
    });
    chestEmbers(dt, 1 + a + r * 2);
    eyeMat.emissiveIntensity = (3.5 + Math.sin(t * 6) * 0.6) * (1 + a * 0.4 + r * 0.6);
    eyeFlames.forEach((f) => {
      f.userData.flicker(t + 1);
      f.scale.setScalar(0.32 * (1 + a * 0.5 + r));
    });
    runeMat.emissiveIntensity = 1.4 + Math.sin(t * 2.5) * 0.5 + r;
    // 尾：左右擺（行就擺大啲），飛就伸直
    tailSegs.forEach((s, i) => {
      s.rotation.y = Math.sin(t * 2 - i * 0.45) * (0.08 + a * 0.05) * (1 - fk * 0.6);
      s.rotation.x = (i < 4 ? 0.05 : -0.04) * (1 - fk) + Math.sin(t * 1.5 - i * 0.4) * 0.03;
    });
    // 頸 + 頭：慢慢左右睇；追緊就壓低向前；吼就抬高、張大口
    neckSegs.forEach((s, i) => {
      s.rotation.x = neckRest[i] * (1 - a * 0.35) + r * (i < 3 ? 0.08 : -0.06) - fk * 0.05 + Math.sin(t * 1.4 - i * 0.3) * 0.02;
      s.rotation.y = Math.sin(t * 0.7) * 0.06 * (1 - a);
    });
    head.rotation.x = -0.6 + a * 0.15 + r * 0.12;
    jaw.rotation.x = 0.12 + Math.sin(t * 1.5) * 0.06 + a * 0.18 + r * 0.6 + fk * 0.15;
    mf.userData.flicker(t);
    mf.scale.setScalar(0.6 * (1 + a * 0.4 + r * 1.2));
    mouthGlow.material.opacity = 0.35 + a * 0.2 + r * 0.4;
    // 吐息：吼或者飛撲嘅時候噴綠火
    const blow = Math.max(r, fk * 0.7);
    puffs.forEach((p, i) => {
      const k = (t * 1.8 + i / puffs.length) % 1;
      p.visible = blow > 0.02;
      p.position.set(Math.sin(i * 2.3 + t * 3) * 0.08 * k, -k * 0.35, -k * 1.8);
      p.scale.setScalar((0.08 + k * 0.32) * blow);
      p.material.opacity = 0.5 * (1 - k) * blow;
    });
    // 翼：平時收埋（向後摺）；追緊半開；飛／吼就大力拍
    const open = Math.max(fk, a * 0.45, r);
    const beat = flyK > 0.2 ? Math.sin(t * 6.5) * 0.75 * flyK : Math.sin(t * 1.2) * 0.05;
    wings.forEach((w, i) => {
      const s = i ? 1 : -1;
      w.rotation.z = s * lerp(0.55, 0.2 + r * 0.5, open) + s * beat;
      w.rotation.y = s * lerp(-0.95, 0, open);
      w.rotation.x = lerp(-0.2, 0, open);
      w.userData.elbow.rotation.y = s * lerp(-1.25, 0, open) - s * beat * 0.25;
      w.userData.elbow.rotation.z = s * lerp(-0.35, 0, open) + s * beat * 0.35;
    });
    root.position.y = flyK * (1.4 + Math.sin(t * 6.5 - 0.6) * 0.22);
    root.rotation.x += -fk * 0.1;
    mist.material.opacity = 0.2 + a * 0.1 + Math.sin(t * 2) * 0.04;
  };
  // 飛：k 0 = 喺地上、1 = 完全飛起
  ud.fly = (k) => (flyWant = clamp(k, 0, 1));
  return { g, root, legs, arms, head, torso };
}

export const HALLOWEEN_BOSS_BUILDERS = [buildPumpkinTyrant, buildHollowWraith, buildBoneDrake];
