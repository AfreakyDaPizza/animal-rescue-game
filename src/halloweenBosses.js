// 🎃 Halloween 3 隻 Boss（小朋友 Issue #6 嘅設計圖：scratchpad/hw_bosses.png）
// 同 bosses.js 嘅 Boss 一樣格式：{ g, root, legs[2], arms[2], head, torso }，面向 -z；g.userData.extra(t) 每格畫面叫
// 遊戲入面同 Enchanted Royal Guardian 一樣放大 ×3
//   Pumpkin Tyrant（南瓜暴君）：熔岩石巨人 + 南瓜燈頭 + 藤 + 頭頂火；userData.pound(k) 雙手舉高砸落地（k 0→1）
//   Hollow Wraith（空洞幽靈）：浮住嘅綠色死神，帽入面係星空，綠色鐮刀 + 靈魂球；userData.flicker(k) 瞬移閃爍（k 0→1→0）
//   Bone Drake（骨龍）：骨頭龍，紫色心同眼、骨翼、鐵鏈、紫色吐息；四隻腳行，userData.fly(k) 拍翼飛（k 0→1）
import * as THREE from 'three';
import { M, G, ADD, GHOST, bx, sph, cone, cyl, piv, chain, flame, between } from './halloweenKit.js';

const PI = Math.PI;

// ======================= 🎃 Pumpkin Tyrant =======================
// 熔岩裂紋：canvas 畫一條條分叉嘅裂（emissiveMap），石頭就用同一張做底色
let lavaTex = null;
function lavaTextures() {
  if (lavaTex) return lavaTex;
  const S = 256;
  const make = () => {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    return c;
  };
  const base = make();
  const glowC = make();
  const b = base.getContext('2d');
  const e = glowC.getContext('2d');
  b.fillStyle = '#3b2a24';
  b.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) { // 石頭斑點
    b.fillStyle = ['#2c1f1a', '#4a362d', '#33241e'][i % 3];
    b.fillRect(Math.random() * S, Math.random() * S, 6 + Math.random() * 14, 6 + Math.random() * 14);
  }
  e.fillStyle = '#000';
  e.fillRect(0, 0, S, S);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // 一條裂：先揀好啲點，再喺兩張 canvas 畫（石頭上黑邊、發光圖上橙色 + 黃色芯）
  const crack = (x, y, a, len, w, depth) => {
    const pts = [[x, y]];
    let px = x, py = y, pa = a;
    const branches = [];
    for (let i = 0; i < len; i++) {
      pa += (rnd() - 0.5) * 0.9;
      px += Math.cos(pa) * 9;
      py += Math.sin(pa) * 9;
      pts.push([px, py]);
      if (depth > 0 && rnd() < 0.18) branches.push([px, py, pa + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.6)]);
    }
    for (const [ctx, color, lw] of [[b, '#1a0f0b', w + 2], [e, '#ff6d00', w], [e, '#ffd54f', w * 0.45]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, lw);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      pts.forEach(([qx, qy], i) => (i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy)));
      ctx.stroke();
    }
    for (const [bx0, by0, ba] of branches) crack(bx0, by0, ba, Math.ceil(len * 0.5), w * 0.65, depth - 1);
  };
  for (let i = 0; i < 6; i++) crack(rnd() * S, rnd() * S, rnd() * PI * 2, 14, 5, 2);
  const tex = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  lavaTex = { map: tex(base), emissiveMap: tex(glowC) };
  return lavaTex;
}
// 南瓜燈面（透明底，淨係發光嘅眼、鼻、鋸齒口）
let faceTex = null;
function pumpkinFace() {
  if (faceTex) return faceTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const x = c.getContext('2d');
  const glow = (draw) => {
    x.save();
    x.shadowColor = '#ff9100';
    x.shadowBlur = 18;
    const gr = x.createRadialGradient(128, 140, 10, 128, 140, 130);
    gr.addColorStop(0, '#fff59d');
    gr.addColorStop(1, '#ffab00');
    x.fillStyle = gr;
    x.beginPath();
    draw();
    x.fill();
    x.restore();
  };
  // 怒目三角眼（向中間斜）
  glow(() => {
    x.moveTo(52, 70); x.lineTo(112, 92); x.lineTo(70, 124); x.closePath();
    x.moveTo(204, 70); x.lineTo(144, 92); x.lineTo(186, 124); x.closePath();
  });
  glow(() => { x.moveTo(128, 120); x.lineTo(114, 146); x.lineTo(142, 146); x.closePath(); }); // 鼻
  // 鋸齒大口
  glow(() => {
    x.moveTo(40, 160);
    for (const [px, py] of [[60, 172], [76, 160], [92, 176], [108, 162], [128, 178], [148, 162], [164, 176], [180, 160], [196, 172], [216, 160]]) x.lineTo(px, py);
    x.quadraticCurveTo(200, 222, 128, 228);
    x.quadraticCurveTo(56, 222, 40, 160);
  });
  x.globalCompositeOperation = 'destination-out'; // 口入面兩隻牙
  x.fillRect(96, 206, 16, 26);
  x.fillRect(146, 206, 16, 26);
  faceTex = new THREE.CanvasTexture(c);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  return faceTex;
}

export function buildPumpkinTyrant() {
  const VINE = 0x2e5d1a;
  const g = new THREE.Group();
  const root = piv(g);
  const { map, emissiveMap } = lavaTextures();
  const rock = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.9 });
  const rockDark = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.95, color: 0x9e8a80 });
  const vine = M(VINE, { roughness: 0.8 });
  const leaf = M(0x558b2f, { roughness: 0.7, side: THREE.DoubleSide });
  const lavaHot = G(0xffc400, 2.6);
  // 藤：用一段段彎彎嘅 torus 繞住手臂 + 幾塊葉
  const wrapArm = (parent, y0, y1, r) => {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.055, 6, 14, PI * 1.6), vine);
      m.position.y = y0 + ((y1 - y0) * i) / (n - 1);
      m.rotation.set(PI / 2 + 0.35, 0, i * 1.4);
      m.castShadow = true;
      parent.add(m);
    }
    for (let i = 0; i < 3; i++) {
      const lf = sph(parent, 0.13, 0.03, 0.08, leaf, (i % 2 ? 1 : -1) * r, y0 + (y1 - y0) * (i / 2), -r * 0.6, true);
      lf.rotation.z = (i % 2 ? -1 : 1) * 0.6;
    }
  };

  // 腳：粗石柱 + 熔岩裂（紋理）
  const legs = [-1, 1].map((s) => {
    const hip = piv(root, s * 0.48, 1.3, 0);
    bx(hip, 0.75, 0.75, 0.75, rock, 0, -0.3, 0, 0.2);
    bx(hip, 0.7, 0.55, 0.7, rockDark, 0, -0.88, 0, 0.2);
    bx(hip, 0.85, 0.24, 1.0, rock, 0, -1.18, -0.08, 0.25); // 腳板
    return hip;
  });
  // 身：好大嘅石胸 + 中間發光核
  const torso = bx(root, 1.9, 1.3, 1.1, rock, 0, 2.15, 0, 0.2);
  bx(root, 1.5, 0.6, 0.95, rockDark, 0, 1.38, 0, 0.22); // 腰
  const core = sph(root, 0.24, 0.24, 0.1, lavaHot, 0, 2.15, -0.56);
  const coreHalo = sph(root, 0.42, 0.42, 0.06, ADD(0xff6d00, 0.5), 0, 2.15, -0.58, true);
  core.castShadow = coreHalo.castShadow = false;
  // 細南瓜（膊頭、腳邊）
  const pumpkinMat = M(0xf57c00, { roughness: 0.55 });
  const miniPumpkin = (parent, x, y, z, s) => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      sph(parent, 0.1 * s, 0.14 * s, 0.1 * s, pumpkinMat, x + Math.cos(a) * 0.08 * s, y, z + Math.sin(a) * 0.08 * s, true);
    }
    cyl(parent, 0.025 * s, 0.1 * s, vine, x, y + 0.16 * s, z);
  };
  // 手：石臂 + 藤 + 大拳頭
  const arms = [-1, 1].map((s) => {
    const sh = piv(root, s * 1.2, 2.6, 0);
    bx(sh, 0.9, 0.62, 0.9, rockDark, 0, 0.05, 0, 0.25); // 膊甲
    miniPumpkin(sh, s * 0.12, 0.48, 0.05, 1.2);
    bx(sh, 0.58, 1.05, 0.58, rock, 0, -0.6, 0, 0.2);
    wrapArm(sh, -0.25, -0.95, 0.34);
    const fist = bx(sh, 0.75, 0.66, 0.75, rock, 0, -1.4, -0.05, 0.25);
    sh.userData.fist = fist;
    return sh;
  });
  // 背後兩條大藤（由膊頭彎過頭頂，好似設計圖）
  for (const s of [-1, 1]) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.08, 6, 18, PI * 0.9), vine);
    arc.position.set(s * 0.7, 2.75, 0.5);
    arc.rotation.set(0, 0, s > 0 ? -0.2 : PI + 0.2);
    arc.castShadow = true;
    root.add(arc);
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 14, PI * 1.5), vine);
    curl.position.set(s * 1.45, 3.15, 0.5);
    curl.rotation.z = s > 0 ? 0.5 : PI - 0.5;
    root.add(curl);
    for (let i = 0; i < 3; i++) {
      const lf = sph(root, 0.16, 0.03, 0.1, leaf, s * (0.25 + i * 0.4), 3.25 + Math.sin(i) * 0.25, 0.55, true);
      lf.rotation.set(0.4, i, s * 0.5);
    }
  }
  // 頭：大南瓜燈（一條條瓣）+ 前面一塊發光嘅面
  const head = piv(root, 0, 3.4, 0);
  const pump = M(0xef6c00, { roughness: 0.5 });
  const pumpDark = M(0xd84315, { roughness: 0.55 });
  const R = 0.78;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    const m = sph(head, 0.42, 0.66, 0.42, i % 2 ? pump : pumpDark, Math.cos(a) * R * 0.55, 0, Math.sin(a) * R * 0.55);
    m.rotation.y = -a;
  }
  sph(head, R * 0.85, 0.64, R * 0.85, pump, 0, 0, 0); // 中間填實
  const stem = cyl(head, 0.1, 0.36, M(0x4e342e), 0.04, 0.72, 0.02, 0.2, -0.2, 0.07);
  stem.castShadow = true;
  // 面：一塊彎彎嘅球面（跟南瓜前面），貼 canvas 發光面
  const faceMat = new THREE.MeshBasicMaterial({ map: pumpkinFace(), transparent: true, depthWrite: false, fog: false });
  const face = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16, PI * 0.25, PI * 0.5, PI * 0.22, PI * 0.56), faceMat);
  face.scale.set(0.9, 0.7, 0.93); // 要喺南瓜瓣外面先見到
  face.rotation.y = PI; // 面向 -z
  head.add(face);
  // 頭頂火焰
  const flames = [flame(head, 0, 0.62, 0.15, 1.15), flame(head, -0.38, 0.45, 0.2, 0.8), flame(head, 0.4, 0.48, 0.18, 0.85), flame(head, 0.05, 0.5, 0.5, 0.75)];
  // 腳邊熔岩光 + 細南瓜
  const pool = new THREE.Mesh(new THREE.RingGeometry(0.2, 1.5, 28), ADD(0xff6d00, 0.3));
  pool.rotation.x = -PI / 2;
  pool.position.y = 0.03;
  g.add(pool);
  miniPumpkin(g, -1.1, 0.13, -0.6, 1.4);
  miniPumpkin(g, 1.2, 0.13, -0.3, 1.1);

  let poundK = 0;
  g.userData.height = 4.3;
  g.userData.extra = (t) => {
    const k = 0.85 + Math.sin(t * 2.4) * 0.2 + Math.sin(t * 7.1) * 0.06;
    rock.emissiveIntensity = 1.6 * k;
    rockDark.emissiveIntensity = 1.2 * k;
    faceMat.opacity = 0.85 + Math.sin(t * 9) * 0.15;
    const h = 0.42 * (1 + Math.sin(t * 3) * 0.15);
    coreHalo.scale.set(h, h, 0.06);
    flames.forEach((f) => f.userData.flicker(t));
    pool.material.opacity = 0.22 + Math.sin(t * 2.4) * 0.06 + poundK * 0.45;
    pool.scale.setScalar(1 + poundK * 0.8);
  };
  // 砸地：0→0.6 雙手慢慢舉高，0.6→0.75 用力砸落，之後收返
  g.userData.pound = (k) => {
    poundK = k > 0.6 && k < 0.95 ? 1 - (k - 0.6) / 0.35 : 0;
    const up = k < 0.6 ? k / 0.6 : k < 0.75 ? 1 - (k - 0.6) / 0.15 : 0;
    for (const a of arms) a.rotation.x = -PI * 0.95 * up;
    root.rotation.x = k > 0.6 && k < 0.8 ? 0.25 * Math.sin(((k - 0.6) / 0.2) * PI) : -0.08 * up;
    root.position.y = k < 0.6 ? up * 0.15 : 0;
  };
  return { g, root, legs, arms, head, torso };
}

// ======================= 👻 Hollow Wraith =======================
// 浮住：冇腳（legs 係隱形 pivot，等 bosses.js 照擺都唔會出事）
let starTex = null;
function voidTexture() {
  if (starTex) return starTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const grad = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, '#1b3a2a');
  grad.addColorStop(1, '#020604');
  x.fillStyle = grad;
  x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 70; i++) {
    x.fillStyle = ['#ffffff', '#b9f6ca', '#69f0ae', '#e1bee7'][i % 4];
    const s = Math.random() < 0.15 ? 2.5 : 1.3;
    x.fillRect(Math.random() * 128, Math.random() * 128, s, s);
  }
  starTex = new THREE.CanvasTexture(c);
  starTex.colorSpace = THREE.SRGBColorSpace;
  return starTex;
}

export function buildHollowWraith() {
  const ROBE = 0x1b5e20;
  const g = new THREE.Group();
  const root = piv(g, 0, 0.6, 0); // 浮高咗
  const robe = GHOST(ROBE, 0.95, 0.35);
  const robeDark = GHOST(0x0d3311, 0.95, 0.25);
  const ectoplasm = ADD(0x69f0ae, 0.45);
  const fade = [robe, robeDark];
  const legs = [-1, 1].map((s) => piv(root, s * 0.3, 1, 0));
  // 袍：上窄下闊，一層層
  const torso = piv(root, 0, 0, 0);
  const robeGeo = new THREE.CylinderGeometry(0.55, 1.05, 2.4, 10, 1, true);
  const body = new THREE.Mesh(robeGeo, robe);
  body.position.y = 1.5;
  torso.add(body);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.95, 2.3, 10), robeDark);
  inner.position.y = 1.5;
  torso.add(inner);
  bx(torso, 1.2, 0.12, 0.85, M(0x33691e), 0, 2.05, 0, 0.4).material = robeDark; // 腰帶
  // 破爛袍腳：一條條會飄
  const tatters = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * PI * 2;
    const p = piv(torso, Math.cos(a) * 0.93, 0.34, Math.sin(a) * 0.93);
    p.rotation.y = -a;
    const len = 0.35 + ((i * 7) % 5) * 0.09;
    const strip = bx(p, 0.26, len, 0.04, i % 2 ? robe : robeDark, 0, -len / 2, 0, 0.3);
    strip.castShadow = false;
    tatters.push(p);
  }
  // 腳底綠色靈氣
  const mist = sph(root, 1.1, 0.25, 1.1, ectoplasm, 0, 0.15, 0, true);
  mist.castShadow = false;
  // 帽：前面開咗個口嘅殼（好似真帽），入面係一個星空波波，眼喺星空度發光
  const head = piv(root, 0, 2.95, 0);
  const OPEN = 1.8; // 帽口幾闊（弧度）
  const hood = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16, (3 * PI) / 2 + OPEN / 2, PI * 2 - OPEN), robe);
  hood.scale.set(0.62, 0.72, 0.66);
  hood.position.z = 0.04;
  head.add(hood);
  const lining = new THREE.Mesh(hood.geometry, robeDark); // 帽入面深色
  lining.scale.set(0.58, 0.68, 0.62);
  lining.position.z = 0.04;
  head.add(lining);
  cone(head, 0.4, 0.65, robe, 0, 0.55, 0.32, -0.75, 0, 9); // 帽尖向後
  const voidMat = new THREE.MeshBasicMaterial({ map: voidTexture(), fog: false });
  const hole = sph(head, 0.47, 0.6, 0.47, voidMat, 0, -0.02, 0.06);
  hole.castShadow = false;
  const eyeMat = G(0x76ff03, 3);
  const eyes = [-1, 1].map((s) => {
    const e = sph(head, 0.075, 0.04, 0.03, eyeMat, s * 0.14, 0.04, -0.42);
    e.rotation.z = s * -0.25;
    e.castShadow = false;
    return e;
  });
  bx(root, 1.7, 0.4, 0.8, robe, 0, 2.6, 0, 0.45); // 膊
  // 手：長袖 + 骨手
  const bone = M(0xd7ccc8);
  const arms = [-1, 1].map((s) => {
    const sh = piv(root, s * 0.85, 2.6, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 1.3, 8, 1, true), robe);
    sleeve.position.y = -0.6;
    sh.add(sleeve);
    bx(sh, 0.2, 0.3, 0.2, bone, 0, -1.3, 0, 0.3);
    for (let k = 0; k < 3; k++) bx(sh, 0.05, 0.22, 0.05, bone, -0.06 + k * 0.06, -1.5, -0.06, 0.3);
    return sh;
  });
  arms[0].rotation.x = -1.05; // 左手向前托住靈魂球
  arms[1].rotation.x = -0.25;
  // 右手（+x）：鐮刀
  const scythe = piv(arms[1], 0, -1.35, 0);
  const handle = cyl(scythe, 0.05, 3.4, M(0x263238, { metalness: 0.4 }), 0, 0.4, 0);
  handle.castShadow = true;
  const bladeMat = G(0x00c853, 1.1, { transparent: true, opacity: 0.95 });
  const blade = piv(scythe, 0, 2.05, 0);
  // 彎刀：由棍頂向前（-z）彎落嚟，越嚟越窄
  const N = 8;
  const at = (k) => new THREE.Vector3(0, 0.1 - k * k * 0.9, -k * 1.6);
  for (let i = 0; i < N; i++) {
    const a = at(i / N);
    const b = at((i + 1) / N);
    const seg = bx(blade, 0.07, 0.34 * (1 - i / (N + 2)), a.distanceTo(b) + 0.05, bladeMat, 0, 0, 0, 0.3);
    seg.position.copy(a).lerp(b, 0.5);
    seg.position.y += 0.08;
    seg.rotation.x = Math.atan2(-(b.y - a.y), b.z - a.z);
    seg.castShadow = false;
  }
  cyl(scythe, 0.09, 0.14, M(0x9e9e9e, { metalness: 0.8 }), 0, 2.0, 0); // 接口
  // 左手：靈魂球（會轉嘅光）
  const orb = piv(arms[0], 0, -1.65, 0);
  const orbCore = sph(orb, 0.2, 0.2, 0.2, G(0xb9f6ca, 3), 0, 0, 0);
  const orbHalo = sph(orb, 0.36, 0.36, 0.36, ADD(0x00e676, 0.4), 0, 0, 0, true);
  orbCore.castShadow = orbHalo.castShadow = false;
  const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 4, 18), ADD(0xccff90, 0.8));
  orb.add(swirl);

  let flick = 0;
  g.userData.height = 4.2;
  g.userData.floating = true;
  g.userData.extra = (t) => {
    root.position.y = 0.6 + Math.sin(t * 1.6) * 0.18;
    tatters.forEach((p, i) => (p.rotation.x = Math.sin(t * 3 + i * 0.9) * 0.35));
    mist.scale.set(1.1 + Math.sin(t * 2) * 0.1, 0.25, 1.1 + Math.cos(t * 2) * 0.1);
    eyeMat.emissiveIntensity = 2.6 + Math.sin(t * 5) * 0.6;
    bladeMat.emissiveIntensity = 1.0 + Math.sin(t * 3.3) * 0.3;
    swirl.rotation.set(t * 2, t * 3, 0);
    orbHalo.scale.setScalar(0.36 * (1 + Math.sin(t * 4) * 0.12));
    const o = 0.95 * (1 - flick);
    for (const m of fade) m.opacity = o;
    hole.visible = flick < 0.7;
    eyes.forEach((e) => (e.visible = flick < 0.9));
  };
  // 瞬移閃爍：k 0→1 慢慢消失（帶靈氣），1→0 出返嚟
  g.userData.flicker = (k) => {
    flick = THREE.MathUtils.clamp(k, 0, 1);
    const jitter = flick > 0 ? (Math.random() - 0.5) * 0.12 * flick : 0;
    root.position.x = jitter;
    root.scale.set(1 - flick * 0.3, 1 + flick * 0.4, 1 - flick * 0.3);
    mist.material.opacity = 0.45 + flick * 0.5;
  };
  return { g, root, legs, arms, head, torso };
}

// ======================= 🐉 Bone Drake =======================
// 四隻腳：legs[0] = 左前（同埋右後一齊擺），legs[1] = 右前（同埋左後）
export function buildBoneDrake() {
  const BONE = 0xe0d6c8;
  const g = new THREE.Group();
  const root = piv(g);
  const bone = M(BONE, { roughness: 0.75 });
  const boneDark = M(0xb8ab98, { roughness: 0.8 });
  const purple = G(0xd500f9, 2.4);
  const purpleSoft = ADD(0xb388ff, 0.5);
  const iron = M(0x37474f, { metalness: 0.7, roughness: 0.4 });
  const crystalMat = G(0xaa00ff, 1.4, { transparent: true, opacity: 0.9 });
  const glowing = [purple, crystalMat];
  const spineY = 2.1;

  // 脊骨（由尾去到頸）：一節節
  const torso = piv(root, 0, spineY, 0);
  for (let i = 0; i < 9; i++) {
    const z = 1.1 - i * 0.28;
    bx(torso, 0.3, 0.26, 0.2, bone, 0, 0, z, 0.3);
    if (i % 2 === 0) cone(torso, 0.08, 0.32 + (i % 4) * 0.08, crystalMat, 0, 0.3, z, 0, 0, 4).castShadow = false; // 背脊紫水晶
  }
  // 肋骨籠：兩邊彎彎嘅骨（半圈 torus）
  const ribGeo = new THREE.TorusGeometry(0.62, 0.05, 5, 14, PI * 0.95);
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(ribGeo, bone);
    r.position.set(0, -0.05, 0.7 - i * 0.24);
    r.rotation.set(0, PI / 2, PI + 0.02);
    r.scale.set(1, 1 - Math.abs(i - 2.5) * 0.09, 0.85);
    r.castShadow = true;
    torso.add(r);
  }
  bx(torso, 0.18, 0.08, 1.4, boneDark, 0, -1.2, -0.1, 0.4); // 胸骨
  // 紫色心（喺肋骨入面）
  const heart = sph(torso, 0.24, 0.26, 0.22, G(0xd500f9, 1.4), 0, -0.55, -0.15);
  const heartHalo = sph(torso, 0.45, 0.45, 0.45, purpleSoft, 0, -0.55, -0.15, true);
  heart.castShadow = heartHalo.castShadow = false;
  // 盤骨
  bx(torso, 0.8, 0.35, 0.45, bone, 0, -0.15, 1.15, 0.35);
  // 尾：一節節細落去
  const tail = piv(torso, 0, -0.05, 1.35);
  let tp = tail;
  const tailSegs = [];
  for (let i = 0; i < 8; i++) {
    const s = 1 - i * 0.1;
    bx(tp, 0.22 * s, 0.18 * s, 0.3, bone, 0, 0, 0.15, 0.3);
    if (i % 2 === 1) cone(tp, 0.05 * s, 0.2 * s, crystalMat, 0, 0.16 * s, 0.15, 0, 0, 4).castShadow = false;
    const next = piv(tp, 0, 0, 0.3);
    tailSegs.push(next);
    tp = next;
  }
  cone(tp, 0.1, 0.4, crystalMat, 0, 0, 0.15, PI / 2, 0, 4);
  // 頸：彎向上
  const neck = piv(torso, 0, 0.05, -1.25);
  let np = neck;
  for (let i = 0; i < 5; i++) {
    bx(np, 0.24, 0.22, 0.24, bone, 0, 0.08, -0.12, 0.3);
    const next = piv(np, 0, 0.18, -0.2);
    next.rotation.x = 0.22;
    np = next;
  }
  // 頭：骷髏龍頭 + 角 + 紫眼 + 開口（有牙）+ 紫色吐息
  const head = piv(np, 0, 0.15, -0.15);
  head.rotation.x = -0.9; // 返平
  bx(head, 0.62, 0.42, 0.6, bone, 0, 0.05, 0, 0.3); // 頭殼
  bx(head, 0.42, 0.22, 0.65, bone, 0, 0.05, -0.55, 0.3); // 上顎（長嘴）
  const jaw = piv(head, 0, -0.12, -0.15);
  bx(jaw, 0.38, 0.1, 0.7, boneDark, 0, -0.05, -0.35, 0.3);
  jaw.rotation.x = 0.35; // 開口
  const tooth = M(0xfafafa);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    cone(head, 0.03, 0.12, tooth, s * 0.15, -0.1, -0.35 - i * 0.18, PI, 0, 4);
    cone(jaw, 0.03, 0.1, tooth, s * 0.13, 0.04, -0.2 - i * 0.18, 0, 0, 4);
  }
  // 眼窩 + 紫光
  const eyeMat = G(0xea80fc, 3.2);
  glowing.push(eyeMat);
  for (const s of [-1, 1]) {
    bx(head, 0.18, 0.14, 0.06, M(0x1a0f1f), s * 0.2, 0.14, -0.3, 0.3);
    sph(head, 0.06, 0.05, 0.03, eyeMat, s * 0.2, 0.14, -0.34).castShadow = false;
    // 角：彎向後
    const h = piv(head, s * 0.22, 0.25, 0.15);
    h.rotation.set(-0.7, 0, -s * 0.35);
    cone(h, 0.08, 0.6, bone, 0, 0.3, 0, 0, 0, 6);
    cone(h, 0.05, 0.35, crystalMat, 0, 0.75, 0.12, -0.6, 0, 4).castShadow = false;
  }
  // 吐息：口前面一串紫色加亮錐（會郁）
  const breath = piv(head, 0, -0.1, -0.85);
  const puffs = [];
  for (let i = 0; i < 5; i++) {
    const p = sph(breath, 0.08 + i * 0.04, 0.07 + i * 0.03, 0.12 + i * 0.04, ADD(i % 2 ? 0xaa00ff : 0x7c4dff, 0.35 - i * 0.05), 0, -i * 0.03, -i * 0.28, true);
    p.castShadow = false;
    puffs.push(p);
  }
  // 腳：大髀 + 小腿 + 爪
  const leg = (x, z, front) => {
    const hip = piv(torso, x, -0.15, z);
    bx(hip, 0.2, 0.75, 0.2, bone, 0, -0.35, 0, 0.35);
    const knee = piv(hip, 0, -0.72, 0);
    knee.rotation.x = front ? 0.35 : -0.35;
    bx(knee, 0.16, 0.85, 0.16, bone, 0, -0.38, 0, 0.35);
    bx(knee, 0.3, 0.12, 0.38, boneDark, 0, -0.85, -0.08, 0.35);
    for (const c of [-1, 0, 1]) cone(knee, 0.04, 0.18, boneDark, c * 0.1, -0.88, -0.3, -PI / 2, 0, 4);
    // 腳鐐 + 鐵鏈
    bx(hip, 0.3, 0.12, 0.3, iron, 0, -0.55, 0, 0.3);
    return hip;
  };
  const fl = leg(-0.42, -0.85, true);
  const fr = leg(0.42, -0.85, true);
  const bl = leg(-0.42, 1.05, false);
  const br = leg(0.42, 1.05, false);
  const legs = [fl, fr];
  // 鐵鏈：由前腳鐐吊去後腳鐐
  for (const s of [-1, 1]) chain(torso, new THREE.Vector3(s * 0.45, -0.7, -0.85), new THREE.Vector3(s * 0.45, -0.7, 1.05), 12, iron);
  chain(torso, new THREE.Vector3(-0.3, 0.1, -1.1), new THREE.Vector3(0.3, 0.1, -1.1), 6, iron); // 頸鏈
  // 骨翼：上臂 + 前臂 + 三條指骨 + 半透明紫膜
  const membrane = new THREE.MeshStandardMaterial({ color: 0x4a148c, emissive: 0x6a1b9a, emissiveIntensity: 0.5, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  const wings = [-1, 1].map((s) => {
    const w = piv(torso, s * 0.2, 0.15, -0.55);
    const O = new THREE.Vector3();
    between(w, O, new THREE.Vector3(s * 1.15, 0.6, 0), 0.07, bone, 0.05);
    sph(w, 0.1, 0.1, 0.1, bone, s * 1.15, 0.6, 0);
    const elbow = piv(w, s * 1.15, 0.6, 0);
    const tip = new THREE.Vector3(s * 1.1, 0.35, 0.2);
    between(elbow, O, tip, 0.055, bone, 0.04);
    sph(elbow, 0.07, 0.07, 0.07, bone, tip.x, tip.y, tip.z);
    const fingers = [[0.2, -0.9, 0.5], [0.05, -1.3, 0.9], [-0.1, -1.1, 1.3]];
    const pts = [O];
    for (const [dx, dy, dz] of fingers) {
      const end = new THREE.Vector3(tip.x + s * dx, tip.y + dy, tip.z + dz);
      between(elbow, tip, end, 0.035, boneDark, 0.02);
      pts.push(end);
    }
    // 膜：由手肘去指尖嘅三角
    const geo = new THREE.BufferGeometry();
    const v = [];
    const shapePts = [new THREE.Vector3(-s * 1.15, -0.6, 0.2), tip, ...pts.slice(1)];
    for (let i = 1; i < shapePts.length - 1; i++) v.push(...shapePts[0].toArray(), ...shapePts[i].toArray(), ...shapePts[i + 1].toArray());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.computeVertexNormals();
    elbow.add(new THREE.Mesh(geo, membrane));
    cone(elbow, 0.05, 0.25, crystalMat, tip.x, tip.y + 0.1, tip.z, 0, -s * 0.5, 4).castShadow = false;
    w.userData.elbow = elbow;
    return w;
  });
  // arms：bosses.js 會擺佢哋；骨龍冇手，用隱形 pivot
  const arms = [piv(root), piv(root)];
  // 浮住嘅骨碎同古物（好似設計圖嗰啲瓶、方塊）
  const relics = piv(root, 0, 3.2, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2;
    const r = i % 2 ? cyl(relics, 0.1, 0.22, M(0x5d4f6b), Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6, 0, 0, 0.07) : bx(relics, 0.2, 0.2, 0.2, M(0x6d5a7b), Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6, 0.2);
    r.castShadow = false;
  }

  let flyK = 0;
  g.userData.height = 3.6;
  g.userData.extra = (t) => {
    // 後腳跟住前腳（對角）
    br.rotation.x = fl.rotation.x;
    bl.rotation.x = fr.rotation.x;
    const pulse = 1 + Math.sin(t * 4) * 0.15;
    heart.scale.set(0.24 * pulse, 0.26 * pulse, 0.22 * pulse);
    heartHalo.scale.setScalar(0.45 * pulse);
    purple.emissiveIntensity = 2 + Math.sin(t * 4) * 0.5;
    eyeMat.emissiveIntensity = 2.8 + Math.sin(t * 6) * 0.5;
    crystalMat.emissiveIntensity = 1.2 + Math.sin(t * 2) * 0.3;
    tailSegs.forEach((s, i) => (s.rotation.y = Math.sin(t * 2 - i * 0.5) * 0.12));
    jaw.rotation.x = 0.3 + Math.sin(t * 1.5) * 0.12;
    puffs.forEach((p, i) => {
      const k = (t * 1.6 + i * 0.2) % 1;
      p.position.z = -k * 1.4 - i * 0.05;
      p.material.opacity = (0.38 - i * 0.05) * (1 - k * 0.7);
      p.scale.setScalar((0.09 + i * 0.04) * (0.7 + k));
    });
    relics.rotation.y = t * 0.5;
    relics.position.y = 3.2 + Math.sin(t) * 0.1;
    // 翼：平時半收、慢慢郁；飛嘅時候大力拍
    const flap = flyK > 0 ? Math.sin(t * 6) * 0.7 * flyK : Math.sin(t * 1.2) * 0.08;
    wings.forEach((w, i) => {
      const s = i ? 1 : -1;
      w.rotation.z = s * (0.25 - 0.25 * flyK + flap);
      w.rotation.y = s * (0.7 * (1 - flyK));
      w.userData.elbow.rotation.z = s * (0.5 * (1 - flyK) + flap * 0.4);
    });
    root.position.y = flyK * (1.5 + Math.sin(t * 6) * 0.25);
  };
  // 飛：k 0 = 喺地上、1 = 完全飛起
  g.userData.fly = (k) => (flyK = THREE.MathUtils.clamp(k, 0, 1));
  return { g, root, legs, arms, head, torso };
}

export const HALLOWEEN_BOSS_BUILDERS = [buildPumpkinTyrant, buildHollowWraith, buildBoneDrake];
