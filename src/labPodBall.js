// ⚡ Phase 3：POD BALL（小朋友 2026-11-03）
// 機械人爆開、科學家縮埋做一個有盔甲嘅大鐵波（發光接縫），會滾、會衝你；
// 帶佢撞落 Solar Capsule → Capsule 用大電（CHARGE）電佢，電 3 次就贏
// 呢個檔淨係「睇到嘅嘢」：波嘅模型、爆開嘅碎片、電、閃光、地上箭咀、畫面提示；
// 玩法（幾時衝、撞中乜）喺 labBoss.js
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TOXIC = 0x76ff03;
const ANGRY = 0xff1744;
const ZAP = 0x40c4ff;

// ================= 波嘅模型 =================
// g：喺地上（y = 半徑）；spin：滾嗰陣轉；plates：盔甲板（變身嗰陣由外面合埋）
export function buildPodBall(scene, R) {
  const g = new THREE.Group();
  const spin = new THREE.Group();
  g.add(spin);
  const metal = new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.45, roughness: 0.35 });
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x5c6670, metalness: 0.4, roughness: 0.35 });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xccff90, emissive: TOXIC, emissiveIntensity: 2.2 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.97, 28, 20), metal);
  core.castShadow = true;
  spin.add(core);
  // 發光接縫：三個大圈（好似波上面嘅線）
  for (const [rx, ry] of [[0, 0], [Math.PI / 2, 0], [Math.PI / 2, Math.PI / 2]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.985, R * 0.035, 8, 48), seamMat);
    ring.rotation.set(rx, ry, 0);
    spin.add(ring);
  }
  // 盔甲板：8 塊（每個象限一塊），中間有粒發光釘
  const plates = [];
  const plateGeo = new RoundedBoxGeometry(R * 0.78, R * 0.78, R * 0.16, 2, R * 0.05);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const dir = V(sx, sy, sz).normalize();
    const p = new THREE.Group();
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.castShadow = true;
    p.add(plate);
    const stud = new THREE.Mesh(new THREE.SphereGeometry(R * 0.08, 10, 8), seamMat);
    stud.position.z = R * 0.1;
    p.add(stud);
    p.lookAt(dir); // 塊板面向外
    p.position.copy(dir).multiplyScalar(R);
    spin.add(p);
    plates.push({ p, dir });
  }
  // 一隻發光「眼」（佢喺入面望住你）
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffee58, emissive: 0xffea00, emissiveIntensity: 3 });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(R * 0.16, 12, 10), eyeMat);
  eye.position.set(0, 0, -R * 0.97);
  spin.add(eye);
  // 暈咗嘅星星（喺波頂，唔跟住滾）
  const stars = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshBasicMaterial({ color: 0xffeb3b }));
    const a = (i / 6) * Math.PI * 2;
    st.position.set(Math.cos(a) * R * 0.8, 0, Math.sin(a) * R * 0.8);
    stars.add(st);
  }
  stars.position.y = R * 1.35;
  stars.visible = false;
  g.add(stars);
  // 衝之前嘅警告：地上一條紅色闊線（波 → 你）
  const aim = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: ANGRY, transparent: true, opacity: 0.4, depthWrite: false }));
  aim.rotation.x = -Math.PI / 2;
  aim.visible = false;
  scene.add(aim);
  // 指路：地上嘅黃色箭咀（由你指去最近嘅 Capsule）
  const guide = buildGroundArrow();
  scene.add(guide.g);
  g.visible = false;
  scene.add(g);
  return { g, spin, R, seamMat, eyeMat, plates, stars, aim, guide, mode: 'roll', t: 0, dir: V(0, 0, 1), aimDir: V(0, 0, 1) };
}

// 接縫顏色：綠 = 普通，紅 = 準備衝，藍 = 俾電緊
export function setPodGlow(pod, color, k) {
  pod.seamMat.emissive.setHex(color);
  pod.seamMat.color.setHex(color);
  pod.seamMat.emissiveIntensity = k;
}
export const POD_COLORS = { normal: TOXIC, angry: ANGRY, zap: ZAP };

// 變身：k = 0（盔甲板喺好遠）→ 1（合埋）
export function closePlates(pod, k) {
  const e = 1 - (1 - k) * (1 - k);
  for (const { p, dir } of pod.plates) p.position.copy(dir).multiplyScalar(pod.R * (1 + (1 - e) * 2.2));
  pod.spin.scale.setScalar(Math.max(0.01, 0.35 + 0.65 * e));
}

// 滾：行咗 (dx, dz) 米，個波照實轉（轉軸 = 上 × 方向）
const tmpAxis = V();
const tmpQ = new THREE.Quaternion();
export function rollPod(pod, dx, dz) {
  const d = Math.hypot(dx, dz);
  if (d < 1e-4) return;
  tmpAxis.set(dz / d, 0, -dx / d);
  tmpQ.setFromAxisAngle(tmpAxis, d / pod.R);
  pod.spin.quaternion.premultiply(tmpQ);
}

// 紅色警告線：由波去 to，闊 = 波嘅直徑
export function showAim(pod, to, blink) {
  const a = pod.g.position;
  const dx = to.x - a.x;
  const dz = to.z - a.z;
  const len = Math.max(1, Math.hypot(dx, dz));
  pod.aim.visible = true;
  pod.aim.scale.set(pod.R * 1.6, len, 1);
  pod.aim.position.set(a.x + dx / 2, 0.08, a.z + dz / 2);
  pod.aim.rotation.set(-Math.PI / 2, 0, Math.atan2(dx, dz) + Math.PI);
  pod.aim.material.opacity = blink ? 0.55 : 0.2;
}

// ================= 效果（用 labBoss.js 嘅 fight.fx／fight.effects） =================
function effect(fight, obj, max, update) {
  fight.fx.add(obj);
  fight.effects.push({ obj, life: 0, max, update });
}

// 一下大閃光（白色／藍色波一下變大）
export function flash(fight, at, color = 0xffffff, size = 8, max = 0.5) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false }));
  m.position.copy(at);
  effect(fight, m, max, (e, k) => {
    m.scale.setScalar(0.5 + k * size);
    m.material.opacity = 0.95 * (1 - k);
  });
}

// 機械人爆開：一舊舊黑色／灰色／發光嘅碎片向四面八方飛，跌落地彈吓
export function mechDebris(fight, at, scale = 1) {
  const g = new THREE.Group();
  const parts = [];
  const colors = [0x23272e, 0x4a525c, 0x9aa3ad, 0x23272e];
  for (let i = 0; i < 26; i++) {
    const glow = i % 6 === 0;
    const w = (0.4 + Math.random() * 0.9) * scale;
    const h = (0.3 + Math.random() * 0.7) * scale;
    const d = (0.3 + Math.random() * 0.8) * scale;
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.15), new THREE.MeshStandardMaterial({
      color: glow ? 0xccff90 : colors[i % colors.length], metalness: 0.35, roughness: 0.4, transparent: true,
      ...(glow ? { emissive: TOXIC, emissiveIntensity: 2 } : {}),
    }));
    m.castShadow = true;
    m.position.set(at.x + (Math.random() - 0.5) * 2, at.y + Math.random() * 3, at.z + (Math.random() - 0.5) * 2);
    g.add(m);
    const out = V(Math.random() - 0.5, 0, Math.random() - 0.5).normalize().multiplyScalar(6 + Math.random() * 10);
    parts.push({ m, v: out.setY(7 + Math.random() * 9), spin: V().randomDirection().multiplyScalar(6) });
  }
  effect(fight, g, 3.2, (e, k, dt) => {
    for (const q of parts) {
      q.v.y -= 22 * dt;
      q.m.position.addScaledVector(q.v, dt);
      if (q.m.position.y < 0.3) {
        q.m.position.y = 0.3;
        q.v.y = Math.abs(q.v.y) * 0.35;
        q.v.x *= 0.6;
        q.v.z *= 0.6;
        q.spin.multiplyScalar(0.6);
      }
      q.m.rotation.x += q.spin.x * dt;
      q.m.rotation.y += q.spin.y * dt;
      q.m.rotation.z += q.spin.z * dt;
      q.m.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    }
  });
}

// 電火花：細細粒黃／藍色光點彈出嚟
export function sparks(fight, at, color = 0xffea00, n = 10) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true });
  const g = new THREE.Group();
  const parts = [];
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), m);
    p.position.copy(at);
    const v = V().randomDirection().multiplyScalar(5 + Math.random() * 6);
    v.y = Math.abs(v.y) + 2;
    p.lookAt(at.clone().add(v));
    g.add(p);
    parts.push({ p, v });
  }
  effect(fight, g, 0.5, (e, k, dt) => {
    for (const q of parts) {
      q.v.y -= 20 * dt;
      q.p.position.addScaledVector(q.v, dt);
    }
    m.opacity = 1 - k;
  });
}

// 大電：Capsule → 波，幾條閃電（每格重新亂畫，好似閃緊）
function boltPoints(a, b, n = 10, jag = 1.2) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(b, i / n);
    if (i > 0 && i < n) p.add(V((Math.random() - 0.5) * jag, (Math.random() - 0.5) * jag, (Math.random() - 0.5) * jag));
    pts.push(p);
  }
  return pts;
}
export function bigZap(fight, from, pod, max = 1.6) {
  const g = new THREE.Group();
  const bolts = [];
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.LineBasicMaterial({ color: i % 2 ? 0xffffff : ZAP, transparent: true });
    const line = new THREE.Line(new THREE.BufferGeometry(), mat);
    g.add(line);
    bolts.push(line);
  }
  // 包住個波嘅電網
  const cage = new THREE.Mesh(new THREE.SphereGeometry(pod.R * 1.15, 16, 12), new THREE.MeshBasicMaterial({ color: ZAP, wireframe: true, transparent: true, opacity: 0.8 }));
  g.add(cage);
  effect(fight, g, max, (e, k) => {
    const to = pod.g.position;
    cage.position.copy(to);
    cage.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    cage.material.opacity = 0.8 * (1 - k);
    bolts.forEach((line, i) => {
      const end = to.clone().add(V().randomDirection().multiplyScalar(pod.R * 0.8));
      line.geometry.setFromPoints(boltPoints(from, end, 12, 1.4 + i * 0.2));
      line.material.opacity = (Math.random() < 0.8 ? 1 : 0.2) * (1 - k * 0.7);
    });
  });
}

// ================= 指路：地上箭咀 =================
function buildGroundArrow() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.4);
  shape.lineTo(1.1, 0.2);
  shape.lineTo(0.45, 0.2);
  shape.lineTo(0.45, -1.2);
  shape.lineTo(-0.45, -1.2);
  shape.lineTo(-0.45, 0.2);
  shape.lineTo(-1.1, 0.2);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2); // 平放喺地，箭頭指向 -z
  const mat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.9, depthWrite: false });
  const g = new THREE.Group();
  const arrows = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.z = -i * 2.6;
    g.add(m);
    return m;
  });
  g.visible = false;
  return { g, arrows, mat };
}

// 每格：由你（P）指去 target（最近嘅 Capsule）；target = null 就收埋
export function updateGroundArrow(pod, P, target, time) {
  const { g, arrows, mat } = pod.guide;
  g.visible = !!target;
  if (!target) return;
  const dx = target.x - P.x;
  const dz = target.z - P.z;
  const d = Math.hypot(dx, dz);
  if (d < 4) {
    g.visible = false; // 已經企喺 Capsule 隔籬
    return;
  }
  g.position.set(P.x + (dx / d) * 2.5, 0.12, P.z + (dz / d) * 2.5);
  g.rotation.y = Math.atan2(-dx, -dz);
  arrows.forEach((a, i) => {
    a.visible = i * 2.6 + 2.5 < d - 2;
    a.scale.setScalar(1 + Math.max(0, Math.sin(time * 7 - i * 0.9)) * 0.3);
  });
  mat.opacity = 0.65 + Math.sin(time * 6) * 0.25;
}

// ================= 畫面提示（大字 + 箭咀 + 進度） =================
let hud = null;
function makeHud() {
  if (hud) return hud;
  const style = document.createElement('style');
  style.textContent = `
#pod-hud { position: fixed; top: 232px; left: 50%; transform: translateX(-50%); z-index: 3; pointer-events: none;
  display: flex; flex-direction: column; align-items: center; gap: 2px; font-weight: 800; text-align: center; }
#pod-hud .msg { font-size: clamp(16px, 2.6vw, 26px); color: #ffea00; padding: 6px 16px; border-radius: 14px;
  background: rgba(13, 30, 60, 0.82); border: 3px solid #40c4ff; text-shadow: 0 2px 4px #000; animation: pod-pulse 0.9s ease-in-out infinite; }
#pod-hud .row { display: flex; align-items: center; gap: 12px; color: #fff; text-shadow: 0 2px 4px #000; font-size: 20px; }
#pod-hud .arrow { font-size: 54px; color: #ffea00; display: inline-block; transition: transform 0.1s; filter: drop-shadow(0 0 8px #ffab00); }
#pod-hud .prog { font-size: 26px; color: #40c4ff; }
#pod-hud.zap .msg { border-color: #fff; color: #fff; background: rgba(0, 120, 220, 0.9); }
@keyframes pod-pulse { 50% { transform: scale(1.06); } }
body.intro #pod-hud { display: none !important; }
@media (max-width: 700px) { #pod-hud { top: 200px; } #pod-hud .arrow { font-size: 40px; } }`;
  document.head.appendChild(style);
  const el = document.createElement('div');
  el.id = 'pod-hud';
  el.hidden = true;
  el.innerHTML = '<div class="msg"></div><div class="row"><span class="arrow">⬆</span><span class="dist"></span><span class="prog"></span></div>';
  document.body.appendChild(el);
  hud = { el, msg: el.querySelector('.msg'), arrow: el.querySelector('.arrow'), dist: el.querySelector('.dist'), prog: el.querySelector('.prog') };
  return hud;
}

// info = null → 收埋；否則 { text, done, need, angle（弧度，相對鏡頭；null = 冇箭咀）, dist, zap }
export function updatePodHud(info) {
  if (!info) {
    if (hud) hud.el.hidden = true;
    return;
  }
  const h = makeHud();
  h.el.hidden = false;
  h.el.classList.toggle('zap', !!info.zap);
  if (h.msg.textContent !== info.text) h.msg.textContent = info.text;
  h.prog.textContent = `⚡ ${info.done}/${info.need}`;
  const hasArrow = info.angle != null && info.dist != null;
  h.arrow.hidden = !hasArrow;
  h.dist.textContent = hasArrow ? `☀️ ${Math.round(info.dist)} m` : '';
  if (hasArrow) h.arrow.style.transform = `rotate(${Math.round((info.angle * 180) / Math.PI)}deg)`;
}
