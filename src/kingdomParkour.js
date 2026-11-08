// 🍄 Enchanted Kingdom 跳菇 Parkour（小朋友 Issue #18）：
//   「make it so you can jump on the mushrooms to boost you to the islands in the enchanted kingdom
//    and when completed you will get a isotope angel legendary pet」
// 王國左邊（閘門入嚟左手面）有一粒發光大蘑菇 → 跳上去就彈上第 1 個浮島 → 每個島邊有另一粒蘑菇彈去下一個島 …
// → 第 6 個（最高）島 = 👼 Isotope Angel（Legendary，每個存檔一次：state.isotopeAngelClaimed）
// 跌落嚟冇事，返到王國地面再由第一粒蘑菇開始。
//
// 點樣運作：
//   - 浮島同蘑菇都係圓形石台（world.js platforms：{ cx, cz, r, top, bottom }），企得上去；
//     bottom = 塊石有幾厚 → 喺下面行過唔會當牆
//   - 企到蘑菇頂（grounded）→ 自動彈：vy 計到最高點 = 下一個島 + BOUNCE_EXTRA 米，
//     另外俾一個「幫手」嘅水平速度（自己飛都會跌正喺島中間），玩家自己郁就慢啲（PARKOUR_AIR_SPEED）
//   - 喺浮島上面限速（PARKOUR_ISLAND_SPEED），Speed 好高嘅人都唔會一下衝咗出島
// buildParkour(view, deco)：enchanted.js 起王國時叫（3D 模型 + 石台）；回傳 animate(dt, t)
// createKingdomParkour({ player, ... })：main.js 每格 update(dt)（喺 updatePlayer 之後）；debug = game.kingdomParkour
//   game.kingdomParkour.teleport(n)：n = 0 → 第一粒蘑菇前面；1–6 → 第 n 個島
//   game.kingdomParkour.finish()：當你上咗最頂（俾獎）

import * as THREE from 'three';
import { platforms, isWalkable, KINGDOM_Y } from './world.js';
import { GRAVITY, moveOpts, walkSpeed, updatePlayer } from './player.js';
import { boostMult } from './boosts.js';
import { addSounds } from './sound.js';
import { buildIsotopeAngel } from './isotopeAngel.js';
import { state, save } from './state.js';
import { ISOTOPE_ANGEL, findAnimal, randomKg } from './data/animals.js';
import { INDEX_NEW_SPECIES_REWARD } from './data/balance.js';

// ---- 路線（世界 x、z；h = 島面比王國地面高幾多米；r = 半徑）----
// 王國：x -75…75、z -716…-516（閘門喺 z -516）；中間 |x| < 46 係動物範圍，所以成條路喺左邊
export const PARKOUR_START = { x: -56, z: -527 }; // 地上第一粒蘑菇
export const PARKOUR_ISLANDS = [
  { x: -60, z: -541, h: 5, r: 5 },
  { x: -51, z: -557, h: 9.5, r: 5 },
  { x: -62, z: -573, h: 14, r: 5 },
  { x: -51, z: -590, h: 18.5, r: 5 },
  { x: -62, z: -607, h: 23, r: 5 },
  { x: -55, z: -626, h: 28, r: 7.5 }, // 👼 最高：Isotope Angel
];
// 樹唔好種喺條路度（enchanted.js 用）
export const inParkourZone = (x, z, m = 0) => x < -43 + m && z > -640 - m && z < -518 + m;

const MUSH_TOP = 1.0; // 蘑菇頂比佢企嘅地方高幾多（要跳先上到：STEP_UP 0.45）
const MUSH_R = 1.35;
const BOUNCE_EXTRA = 4; // 彈到比目標島高幾多米先跌落嚟
const PARKOUR_AIR_SPEED = 3.5; // 彈緊嘅時候自己郁最快幾快（米／秒）
const PARKOUR_ISLAND_SPEED = 8; // 喺浮島上面最快幾快
const ISLAND_THICK = 1.2;

const P = { mushrooms: [], islands: [], built: false, bursts: null, angel: null };
const COLORS = [0xff4081, 0x18ffff, 0x76ff03, 0xffab00, 0xd500f9, 0xffea00];

addSounds({
  // 🍄 彈：低沉「boing」+ 高音「啵」
  mushBounce: (t, { tone }) => {
    tone(120, t, 0.45, { type: 'sine', vol: 0.4, slide: 5 });
    tone(480, t + 0.04, 0.3, { type: 'triangle', vol: 0.14, slide: 2.6 });
  },
  // 🏝️ 落到島：叮叮
  islandLand: (t, { arp }) => arp(t, [784, 988, 1319], 0.07, { type: 'triangle', vol: 0.16 }),
  // 👼 攞到天使：好長嘅上升琶音
  angelWin: (t, { arp, tone }) => {
    arp(t, [523, 659, 784, 1047, 1319, 1568, 2093], 0.09, { type: 'sine', vol: 0.2 });
    tone(262, t, 1.6, { type: 'triangle', vol: 0.15 });
    tone(392, t + 0.6, 1.4, { type: 'sine', vol: 0.12 });
  },
});

// 蘑菇喺邊（世界 x、z；base = 佢企嗰度比地面高幾多）→ 彈去第 to 個島
function mushroomSpots() {
  const list = [{ x: PARKOUR_START.x, z: PARKOUR_START.z, base: 0, to: 0 }];
  for (let i = 0; i < PARKOUR_ISLANDS.length - 1; i++) {
    const a = PARKOUR_ISLANDS[i];
    const b = PARKOUR_ISLANDS[i + 1];
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const k = (a.r - 1.7) / d;
    list.push({ x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, base: a.h, to: i + 1 });
  }
  return list;
}

// 由 (x, z, 高度 y0) 彈去第 to 個島：回傳 { vy, vx, vz, T }（y 全部比王國地面）
function bounceFor(x, z, y0, to) {
  const isl = PARKOUR_ISLANDS[to];
  const dh = isl.h - y0;
  const H = Math.max(BOUNCE_EXTRA, dh + BOUNCE_EXTRA);
  const vy = Math.sqrt(2 * GRAVITY * H);
  const T = vy / GRAVITY + Math.sqrt((2 * (H - dh)) / GRAVITY);
  return { vy, vx: (isl.x - x) / T, vz: (isl.z - z) / T, T };
}

// 細細個發光字（Sprite：永遠面向鏡頭）
function textSprite(lines, w = 6, color = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 160;
  const g = c.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.85)';
  g.shadowBlur = 10;
  lines.forEach(([text, size], i) => {
    g.font = `900 ${size}px system-ui, sans-serif`;
    g.fillStyle = i === 0 ? color : '#ffffff';
    g.fillText(text, 512, lines.length === 1 ? 80 : 52 + i * 62);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(w, (w * 160) / 1024, 1);
  return s;
}

// 🍄 彈彈蘑菇：粗白莖、好大嘅發光蘑菇頂 + 白點、底下一圈發光菌褶、上面一個上下郁嘅箭咀、地下一個擴散嘅光圈
function buildMushroom(color) {
  const g = new THREE.Group();
  const stemM = new THREE.MeshStandardMaterial({ color: 0xfff8e1, emissive: 0xfff3c4, emissiveIntensity: 0.25, roughness: 0.6 });
  const capM = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1, roughness: 0.35 });
  const glowM = (c, k) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.4 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.45, 10), stemM);
  stem.position.y = 0.22;
  stem.castShadow = true;
  g.add(stem);
  const cap = new THREE.Group();
  cap.position.y = 0.32;
  g.add(cap);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.45, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), capM);
  dome.scale.y = 0.47;
  dome.castShadow = true;
  cap.add(dome);
  // 白點
  const spotM = glowM(0xffffff, 0.6);
  const spotGeo = new THREE.SphereGeometry(0.2, 8, 6);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.3;
    const el = i === 8 ? Math.PI / 2 : 0.45 + (i % 3) * 0.28;
    const s = new THREE.Mesh(spotGeo, spotM);
    const r = 1.45;
    s.position.set(Math.cos(a) * Math.cos(el) * r, Math.sin(el) * r * 0.47, Math.sin(a) * Math.cos(el) * r);
    s.scale.set(1, 0.45, 1);
    cap.add(s);
  }
  // 菌褶（發光圈）
  const gills = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 6, 24), glowM(0xfff59d, 1.4));
  gills.rotation.x = Math.PI / 2;
  gills.position.y = 0.02;
  cap.add(gills);
  // 箭咀（向上）：提你跳上去
  const arrowM = glowM(0xffea00, 1.8);
  const arrow = new THREE.Group();
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.6, 4), arrowM);
  head.position.y = 0.55;
  arrow.add(head);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), arrowM);
  shaft.position.y = 0.05;
  arrow.add(shaft);
  arrow.position.y = 2.3;
  g.add(arrow);
  // 地上擴散嘅光圈
  const pulseM = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const pulse = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 28), pulseM);
  pulse.rotation.x = -Math.PI / 2;
  pulse.position.y = 0.05;
  g.add(pulse);
  return { g, cap, capM, arrow, pulse, pulseM, squash: 0 };
}

// 一個浮島（下面倒轉嘅石尖 + 紫色草面 + 金邊），deco(group, s) = enchanted.js 種棵細樹
function buildIsland(isl, i, deco) {
  const g = new THREE.Group();
  const last = i === PARKOUR_ISLANDS.length - 1;
  const r = isl.r;
  const rock = new THREE.MeshStandardMaterial({ color: 0x6d4c41, flatShading: true, roughness: 0.8 });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 0.95, r * 1.5, 8), rock);
  cone.rotation.x = Math.PI;
  cone.position.y = -ISLAND_THICK - r * 0.75 + 0.2;
  g.add(cone);
  const slabM = new THREE.MeshStandardMaterial({ color: 0x5e35b1, flatShading: true, roughness: 0.7 });
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.95, ISLAND_THICK, 16), slabM);
  slab.position.y = -ISLAND_THICK / 2;
  slab.castShadow = slab.receiveShadow = true;
  g.add(slab);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.05, r - 0.05, 0.06, 24), new THREE.MeshStandardMaterial({ color: last ? 0xfff8e1 : 0x9575cd, roughness: 0.6 }));
  top.position.y = 0.0;
  top.receiveShadow = true;
  g.add(top);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 6, 40), new THREE.MeshStandardMaterial({ color: 0xffd740, emissive: 0xffd740, emissiveIntensity: 1.2 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.03;
  g.add(rim);
  // 吊喺下面嘅細水晶
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + i;
    const c = COLORS[(k + i) % COLORS.length];
    const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2, flatShading: true }));
    cr.position.set(Math.cos(a) * r * 0.6, -ISLAND_THICK - 0.4 - (k % 2) * 0.6, Math.sin(a) * r * 0.6);
    cr.scale.y = 2;
    g.add(cr);
  }
  // 號碼牌
  const label = textSprite(last ? [['👼 ISOTOPE ANGEL', 64], ['Reach the top to win!', 40]] : [[`🏝️ ${i + 1} / ${PARKOUR_ISLANDS.length}`, 72]], last ? 14 : 8, last ? '#b9f6ca' : '#ffe57f');
  label.position.y = last ? 8.6 : 4.2;
  g.add(label);
  if (!last && deco) {
    // 細樹喺島嘅一邊（同蘑菇相反嗰邊；行得穿）
    const next = PARKOUR_ISLANDS[i + 1];
    const d = Math.hypot(next.x - isl.x, next.z - isl.z);
    deco(g, -(next.x - isl.x) / d * (r - 1.5), -(next.z - isl.z) / d * (r - 1.5), 0.55);
  }
  return { g, label, last };
}

// 👼 最頂嗰個島：金色台 + 一條光柱（好遠都見到）+ 天使浮喺上面
function buildFinal(island) {
  let g = island;
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0xffb300, emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.3 });
  // 天使企喺島後面（-z）：你落地喺中間唔會撞埋一齊
  const back = new THREE.Group();
  back.position.z = -3.6;
  g.add(back);
  g = back;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.35, 12), gold);
  ped.position.y = 0.18;
  g.add(ped);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.08, 6, 40), new THREE.MeshStandardMaterial({ color: 0x69f0ae, emissive: 0x69f0ae, emissiveIntensity: 1.6 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.4;
  g.add(ring);
  const beamM = new THREE.MeshBasicMaterial({ color: 0x84ffff, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 60, 16, 1, true), beamM);
  beam.position.y = 30;
  g.add(beam);
  const angel = buildIsotopeAngel();
  angel.scale.setScalar(1.5);
  angel.position.y = 0.35;
  angel.rotation.y = Math.PI; // 面向閘門（+z）
  g.add(angel);
  P.angel = angel;
  return { ring, beamM };
}

// 弧線（金色光點沿住彈嘅路線流過去）：由蘑菇頂彈去下一個島中間
function arcPoints(m) {
  const y0 = m.base + MUSH_TOP;
  const b = bounceFor(m.x, m.z, y0, m.to);
  const pts = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * b.T;
    pts.push(new THREE.Vector3(m.x + b.vx * t, y0 + b.vy * t - 0.5 * GRAVITY * t * t + 0.4, m.z + b.vz * t));
  }
  return new THREE.CatmullRomCurve3(pts);
}

// enchanted.js 起王國時叫：view = 王國 group（y = KINGDOM_Y，所以入面嘅 y 係「比地面高幾多」）
export function buildParkour(view, deco) {
  const KY = KINGDOM_Y;
  // 浮島（企得上去）
  PARKOUR_ISLANDS.forEach((isl, i) => {
    const b = buildIsland(isl, i, deco);
    b.g.position.set(isl.x, isl.h, isl.z);
    view.add(b.g);
    if (b.last) Object.assign(b, buildFinal(b.g));
    // 圓形石台（world.js 嘅 onPlat 識 cx/cz/r）；bottom = 塊石底 → 喺下面行過唔當牆
    platforms.push({ cx: isl.x, cz: isl.z, r: isl.r, top: KY + isl.h, bottom: KY + isl.h - ISLAND_THICK });
    P.islands.push({ ...isl, ...b, top: KY + isl.h });
  });
  // 蘑菇
  mushroomSpots().forEach((m, i) => {
    const b = buildMushroom(COLORS[i % COLORS.length]);
    b.g.position.set(m.x, m.base, m.z);
    view.add(b.g);
    const top = KY + m.base + MUSH_TOP;
    platforms.push({ cx: m.x, cz: m.z, r: MUSH_R, top, bottom: KY + m.base });
    P.mushrooms.push({ ...m, ...b, top, i });
  });
  // 入口牌：喺第一粒蘑菇後面
  const sign = textSprite([['🍄 BOUNCE PARKOUR', 66], ['Jump on the mushroom! 👼 Win a pet!', 38]], 14, '#ff80ab');
  sign.position.set(PARKOUR_START.x, 4.2, PARKOUR_START.z - 1.5);
  view.add(sign);
  // 光點路線
  const curves = P.mushrooms.map(arcPoints);
  const PER = 22;
  const n = curves.length * PER;
  const pos = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const trail = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffe57f, size: 0.45, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  trail.frustumCulled = false;
  view.add(trail);
  // 落地閃光（共用一個 Points，一次最多 60 粒）
  const BN = 60;
  const bpos = new Float32Array(BN * 3);
  const bgeo = new THREE.BufferGeometry();
  bgeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
  const bmat = new THREE.PointsMaterial({ color: 0xb9f6ca, size: 0.35, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const bpts = new THREE.Points(bgeo, bmat);
  bpts.frustumCulled = false;
  view.add(bpts);
  P.bursts = { pos: bpos, geo: bgeo, mat: bmat, vel: new Float32Array(BN * 3), age: 9, color: bmat.color };
  P.built = true;
  const tmp = new THREE.Vector3();

  return (dt, t) => {
    for (const m of P.mushrooms) {
      m.squash = Math.max(0, m.squash - dt * 3);
      const sq = Math.sin(m.squash * Math.PI) * m.squash;
      m.cap.scale.set(1 + sq * 0.3, 1 - sq * 0.45, 1 + sq * 0.3);
      m.capM.emissiveIntensity = 0.85 + Math.sin(t * 3 + m.i) * 0.35 + m.squash;
      m.arrow.position.y = 2.3 + Math.abs(Math.sin(t * 3 + m.i)) * 0.5;
      m.arrow.rotation.y = t * 1.5;
      const k = (t * 0.7 + m.i * 0.3) % 1;
      m.pulse.scale.setScalar(1 + k * 1.4);
      m.pulseM.opacity = 0.6 * (1 - k);
    }
    // 光點沿住弧線流
    curves.forEach((c, ci) => {
      for (let i = 0; i < PER; i++) {
        c.getPointAt(((i / PER) + t * 0.18) % 1, tmp);
        const j = (ci * PER + i) * 3;
        pos[j] = tmp.x;
        pos[j + 1] = tmp.y;
        pos[j + 2] = tmp.z;
      }
    });
    geo.attributes.position.needsUpdate = true;
    const fin = P.islands[P.islands.length - 1];
    if (fin) {
      fin.ring.rotation.z = t * 0.6;
      fin.beamM.opacity = 0.08 + Math.sin(t * 2) * 0.03;
    }
    P.angel?.userData.animate?.(t, 0);
    // 閃光
    const B = P.bursts;
    if (B.age < 1.2) {
      B.age += dt;
      for (let i = 0; i < BN; i++) {
        B.vel[i * 3 + 1] -= 9 * dt;
        for (let a = 0; a < 3; a++) B.pos[i * 3 + a] += B.vel[i * 3 + a] * dt;
      }
      B.mat.opacity = Math.max(0, 1 - B.age / 1.2);
      B.geo.attributes.position.needsUpdate = true;
    }
  };
}

// 喺 (x, 世界 y, z) 爆一堆閃光
function burst(x, y, z, color = 0xb9f6ca, power = 1) {
  const B = P.bursts;
  if (!B) return;
  B.age = 0;
  B.color.setHex(color);
  const n = B.pos.length / 3;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (2 + Math.random() * 4) * power;
    B.pos[i * 3] = x;
    B.pos[i * 3 + 1] = y - KINGDOM_Y + 0.2;
    B.pos[i * 3 + 2] = z;
    B.vel[i * 3] = Math.cos(a) * s;
    B.vel[i * 3 + 1] = (2 + Math.random() * 4) * power;
    B.vel[i * 3 + 2] = Math.sin(a) * s;
  }
}

// ---- HUD + 彩紙 ----
const CSS = `
#kp-hud { position: fixed; top: 250px; left: 50%; transform: translateX(-50%); z-index: 30; pointer-events: none;
  background: linear-gradient(180deg, rgba(74,20,140,0.92), rgba(40,10,80,0.92)); color: #fff; border: 3px solid #ffd740; border-radius: 16px;
  padding: 6px 16px; font-weight: 900; font-size: 20px; text-align: center; box-shadow: 0 0 18px rgba(255,215,64,0.5); }
#kp-hud small { display: block; font-size: 13px; font-weight: 700; color: #e1bee7; }
#kp-hud .kp-dots { letter-spacing: 3px; font-size: 15px; }
.kp-confetti { position: fixed; z-index: 45; pointer-events: none; font-size: 24px; left: 50%; top: 32%;
  animation: kp-fall var(--d) cubic-bezier(.2,.6,.4,1) forwards; }
@keyframes kp-fall { from { transform: translate(-50%, 0) rotate(0); opacity: 1; } to { transform: translate(calc(-50% + var(--x)), var(--y)) rotate(var(--r)); opacity: 0; } }
`;
function confetti(n = 48) {
  const bits = ['👼', '✨', '⚛️', '🍄', '⭐', '💚', '🏝️', '🌟'];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'kp-confetti';
    el.textContent = bits[i % bits.length];
    const a = Math.random() * Math.PI * 2;
    const r = 160 + Math.random() * 340;
    el.style.setProperty('--x', `${Math.cos(a) * r}px`);
    el.style.setProperty('--y', `${Math.sin(a) * r * 0.7 + 200}px`);
    el.style.setProperty('--r', `${(Math.random() - 0.5) * 720}deg`);
    el.style.setProperty('--d', `${1.4 + Math.random() * 1}s`);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
}

// main.js：每格（喺 updatePlayer 之後）叫 update(dt)
export function createKingdomParkour({ player, kingdom, play, popup, announce, short = (n) => n }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const hud = document.createElement('div');
  hud.id = 'kp-hud';
  hud.hidden = true;
  document.body.appendChild(hud);
  const S = { flight: null, island: -1, lastIsland: -1, onFinal: false, hintAt: 0 };
  const total = PARKOUR_ISLANDS.length;

  function setHud(html) {
    if (hud.dataset.html === html) return;
    hud.dataset.html = html;
    hud.innerHTML = html;
  }

  function finish() {
    const fin = PARKOUR_ISLANDS[total - 1];
    burst(fin.x, KINGDOM_Y + fin.h, fin.z, 0xb9f6ca, 1.6);
    state.kingdomIslandBest = total;
    if (state.isotopeAngelClaimed) {
      popup('👼 You already have the Isotope Angel! You are a parkour pro! 🏆');
      play('islandLand');
      save();
      return false;
    }
    const info = findAnimal(ISOTOPE_ANGEL);
    state.isotopeAngelClaimed = true;
    state.pets.push({ name: ISOTOPE_ANGEL, biome: info.biome, kg: randomKg(info), rarity: 'Legendary', onPlot: false });
    let bonus = '';
    if (!state.indexFound.includes(ISOTOPE_ANGEL)) {
      state.indexFound.push(ISOTOPE_ANGEL);
      const reward = INDEX_NEW_SPECIES_REWARD[info.biome] || 0;
      state.money += reward;
      if (reward) bonus = ` 📖 NEW! +$${short(reward)}`;
    }
    save();
    announce('👼 You got the ISOTOPE ANGEL! (LEGENDARY)');
    setTimeout(() => popup(`🎒 The Isotope Angel went into your Backpack!${bonus}`), 900);
    confetti();
    play('angelWin');
    return true;
  }

  function teleport(n = 0) {
    const cam = player.camera;
    if (n <= 0) {
      cam.position.set(PARKOUR_START.x, KINGDOM_Y + 1.6, PARKOUR_START.z + 4);
      player.feetY = KINGDOM_Y;
    } else {
      const isl = PARKOUR_ISLANDS[Math.min(n, total) - 1];
      cam.position.set(isl.x, KINGDOM_Y + isl.h + 1.6, isl.z);
      player.feetY = KINGDOM_Y + isl.h;
    }
    player.vy = 0;
    player.grounded = true;
    S.flight = null;
    S.prev = null;
    cam.rotation.set(0, 0, 0); // 望住 -z（下一個島方向）
  }

  // 企喺邊個島（-1 = 唔係）
  function islandAt(x, z, feetY) {
    for (let i = 0; i < P.islands.length; i++) {
      const isl = P.islands[i];
      if (Math.abs(feetY - isl.top) < 0.06 && Math.hypot(x - isl.x, z - isl.z) <= isl.r + 0.05) return i;
    }
    return -1;
  }

  function update(dt) {
    moveOpts.parkourMul = 1;
    if (!P.built || !kingdom.open) {
      hud.hidden = true;
      S.flight = null;
      return;
    }
    const p = player.camera.position;
    const near = inParkourZone(p.x, p.z, 6) && player.feetY > KINGDOM_Y - 1;
    if (!near && !S.flight) {
      hud.hidden = true;
      S.island = -1;
      return;
    }
    const base = walkSpeed(state.speed) * boostMult('speed');
    // 彈緊：幫手推去下一個島（撞到嘢就停嗰邊）
    if (S.flight) {
      if (player.grounded) S.flight = null;
      else {
        moveOpts.parkourMul = Math.min(1, PARKOUR_AIR_SPEED / Math.max(0.1, base));
        // 自己撳 W 向前嗰部分唔再加（唔係就會飛過咗個島、跌咗落下一粒蘑菇）：
        // 幫手推 = 路線速度 − 你自己今格沿住路線行咗幾多；打側／向後照郁得（可以自己控制）
        const f = S.flight;
        const own = S.prev ? (p.x - S.prev.x) * f.dx + (p.z - S.prev.z) * f.dz : 0;
        const push = Math.max(0, f.speed * dt - Math.max(0, own));
        const parts = Math.max(1, Math.ceil(push / 0.3));
        for (let k = 0; k < parts; k++) {
          const mx = (f.dx * push) / parts;
          const mz = (f.dz * push) / parts;
          if (isWalkable(p.x + mx, p.z, 0.4, player.feetY)) p.x += mx;
          if (isWalkable(p.x, p.z + mz, 0.4, player.feetY)) p.z += mz;
        }
      }
    }
    if (player.grounded) {
      // 🍄 企咗喺蘑菇頂 → 彈！
      const m = P.mushrooms.find((mm) => Math.abs(player.feetY - mm.top) < 0.06 && Math.hypot(p.x - mm.x, p.z - mm.z) <= MUSH_R + 0.05);
      if (m) {
        const b = bounceFor(p.x, p.z, player.feetY - KINGDOM_Y, m.to);
        player.vy = b.vy;
        player.grounded = false;
        player.jumped = false;
        const sp = Math.hypot(b.vx, b.vz);
        S.flight = { speed: sp, dx: b.vx / (sp || 1), dz: b.vz / (sp || 1), to: m.to };
        m.squash = 1;
        burst(m.x, m.top, m.z, COLORS[m.i % COLORS.length], 0.8);
        play('mushBounce');
        if (m.i === 0 && S.lastIsland < 0) popup('🍄 BOING! Fly to the island!');
      } else {
        const i = islandAt(p.x, p.z, player.feetY);
        if (i >= 0 && i !== S.island) {
          // 🏝️ 啱啱落到一個島
          burst(p.x, player.feetY, p.z, 0xffe57f, 0.7);
          if (i === total - 1) finish();
          else {
            play('islandLand');
            if (i > S.lastIsland) popup(`🏝️ Island ${i + 1}/${total}! Find the next 🍄`);
          }
          S.lastIsland = Math.max(S.lastIsland, i);
          state.kingdomIslandBest = Math.max(state.kingdomIslandBest || 0, i + 1);
        }
        if (i < 0 && player.feetY < KINGDOM_Y + 0.1 && S.lastIsland >= 0) {
          // 跌返落地：由頭再嚟（冇扣嘢）
          popup('🍄 Oops, you fell! Bounce on the first mushroom to try again!');
          S.lastIsland = -1;
        }
        S.island = i;
      }
    }
    // 喺浮島上面、或者第一粒蘑菇隔籬：限速（Speed 好高嘅人一跳就飛過咗粒蘑菇／衝咗出島）
    if (S.island >= 0 || (!S.flight && Math.hypot(p.x - PARKOUR_START.x, p.z - PARKOUR_START.z) < 9)) moveOpts.parkourMul = Math.min(1, PARKOUR_ISLAND_SPEED / Math.max(0.1, base));
    // HUD
    hud.hidden = false;
    const reached = S.island >= 0 ? S.island + 1 : S.flight ? S.flight.to : 0;
    const dots = Array.from({ length: total }, (_, i) => (i < reached ? '🟡' : '⚪')).join('');
    const sub = S.flight ? '🍄 BOING! Steer gently with WASD' : S.island === total - 1 ? (state.isotopeAngelClaimed ? '👼 You have the Isotope Angel!' : '👼 Isotope Angel!') : S.island >= 0 ? 'Jump on the glowing 🍄 by the edge!' : 'Jump on the glowing 🍄 to bounce up!';
    S.prev = { x: p.x, z: p.z };
    setHud(`🏝️ Island ${S.flight ? `${S.flight.to} → ${S.flight.to + 1}` : reached}/${total}<div class="kp-dots">${dots}</div><small>${sub}</small>`);
  }

  return { update, debug: { teleport, finish, update, simStep: (dt) => (updatePlayer(player, dt, 0), update(dt)), moveOpts, state: S, islands: PARKOUR_ISLANDS, mushrooms: P.mushrooms, start: PARKOUR_START, bounceFor } };
}
