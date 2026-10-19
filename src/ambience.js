// ✨ 氣氛（2026-10-18 小朋友：聽日喺學校 present，要成個遊戲靚啲）
// - 每個地方有自己嘅飄浮粒子：Hub 花粉、森林落葉、海水花、雀鳥森林螢火蟲、北極雪、走私營地塵、礦山霧
// - 每個生態區嘅霧色（遠處）唔同
// - 會飄嘅雲（跟天空變色：日頭白、黃昏粉橙、夜晚深藍）
// - 水面閃光紋理（海、噴水池共用）
// - 全部 Points 用圓點（唔再係四方格）
// 畫質（G 掣）：最低 = 冇粒子、低 = 一半、中／高 = 全部

import * as THREE from 'three';
import { BIOMES } from './data/biomeList.js';

// ---------- 圓形柔光點（俾所有 Points 用）----------
let roundTex = null;
export function roundTexture() {
  if (roundTex) return roundTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  roundTex = new THREE.CanvasTexture(c);
  roundTex.colorSpace = THREE.SRGBColorSpace;
  return roundTex;
}

// 所有冇貼圖嘅 Points（水花、閃粉、星星…）第一次畫嘅時候自動變圓點
export function roundAllPoints() {
  const proto = THREE.Points.prototype;
  if (proto.__rounded) return;
  proto.__rounded = true;
  const before = proto.onBeforeRender;
  proto.onBeforeRender = function (...args) {
    const m = this.material;
    if (m && m.isPointsMaterial && !m.map && !m.userData.square) {
      m.map = roundTexture();
      m.transparent = true;
      m.alphaTest = Math.max(m.alphaTest || 0, 0.02);
      m.needsUpdate = true;
    }
    before?.apply(this, args);
  };
}

// ---------- 水面閃光（海、噴水池）----------
const shimmerTextures = [];
export function shimmerTexture(repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#d9ecf5';
  g.fillRect(0, 0, 128, 128);
  // 彎彎嘅光紋（似水底光影）
  g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const y = Math.random() * 128;
    const x = Math.random() * 128;
    g.strokeStyle = `rgba(255,255,255,${0.55 + Math.random() * 0.45})`;
    g.lineWidth = 1.5 + Math.random() * 2.5;
    g.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = x + k * 7;
      const py = y + Math.sin(k * 1.3 + i) * 4;
      if (k === 0) g.moveTo(px % 128, py);
      else g.lineTo(px % 128, py);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  shimmerTextures.push(tex);
  return tex;
}
function updateShimmer(time) {
  shimmerTextures.forEach((t, i) => {
    t.offset.set(Math.sin(time * 0.05 + i) * 0.4 + time * 0.012, time * 0.02);
  });
}

// ---------- 每個地方嘅粒子 ----------
// motion：fall（向下跌）、rise（向上飄）、drift（橫飄）、wander（螢火蟲亂飛）、mist（貼地慢慢飄）
const PROFILES = {
  pollen: { colors: [0xfff59d, 0xffffff, 0xffe082], size: 0.13, opacity: 0.85, motion: 'rise', speed: 0.25, sway: 0.5, additive: true },
  leaves: { colors: [0xff9800, 0x8bc34a, 0xffc107, 0xd84315, 0x689f38], size: 0.32, opacity: 0.95, motion: 'fall', speed: 0.9, sway: 1.4 },
  spray: { colors: [0xffffff, 0xe1f5fe, 0xb3e5fc], size: 0.16, opacity: 0.7, motion: 'drift', speed: 1.6, sway: 0.4 },
  fireflies: { colors: [0xeeff41, 0xc6ff00, 0xfff176], size: 0.22, opacity: 1, motion: 'wander', speed: 0.6, sway: 1, additive: true, blink: true },
  snow: { colors: [0xffffff, 0xf5fbff], size: 0.2, opacity: 0.95, motion: 'fall', speed: 1.3, sway: 0.8 },
  dust: { colors: [0xd7b98e, 0xbca07a, 0xe6d3b0], size: 0.14, opacity: 0.55, motion: 'drift', speed: 1.1, sway: 0.6 },
  mist: { colors: [0xf3f0ff, 0xe8eaf6], size: 2.6, opacity: 0.16, motion: 'mist', speed: 0.5, sway: 0.4, few: true },
  embers: { colors: [0xffab40, 0xff6e40, 0xfff59d], size: 0.15, opacity: 0.9, motion: 'rise', speed: 0.7, sway: 0.6, additive: true, blink: true },
  // 🎃 Halloween 世界
  wisps: { colors: [0x18ffff, 0x76ff03, 0xea80fc], size: 0.26, opacity: 1, motion: 'wander', speed: 0.5, sway: 1.2, additive: true, blink: true },
  ghostmist: { colors: [0xb39ddb, 0x9575cd, 0x7e57c2], size: 3, opacity: 0.14, motion: 'mist', speed: 0.4, sway: 0.5, few: true },
  ash: { colors: [0x9e9e9e, 0x757575, 0xff7043], size: 0.14, opacity: 0.7, motion: 'fall', speed: 0.5, sway: 1 },
};
// 地方名（whereIs 回傳）→ 粒子；夜晚 Hub 變螢火蟲
const B = (i) => BIOMES[i].name;
const AREA = {
  Hub: 'pollen',
  [B(0)]: 'leaves',
  [B(1)]: 'spray',
  [B(2)]: 'fireflies',
  [B(3)]: 'snow',
  [B(4)]: 'dust',
  [B(5)]: 'mist',
  'Secret Beach': 'spray',
  Gym: 'pollen',
  'Outside the Park': 'pollen',
  // 🎃 Halloween 世界（halloweenShape.js 嘅地方名）
  '🎃 Spawn Ruins': 'embers',
  'Pumpkin Graveyard': 'embers',
  'Hollow Sprites': 'wisps',
  'Abandoned Manor': 'ash',
  'Egg Graveyard': 'ghostmist',
  'Train Station': 'ghostmist',
  'Fishing Lake': 'ghostmist',
  'Ghost World': 'wisps',
};
// 每個地方嘅霧色（遠處）；會同天空色混埋，夜晚就淡返
const FOG_TINT = {
  [B(0)]: [0xd8e6c0, 0.3, 60, 200],
  [B(1)]: [0xbfe3f2, 0.35, 65, 210],
  [B(2)]: [0xc8e6c9, 0.35, 50, 180],
  [B(3)]: [0xf0f6ff, 0.45, 45, 170],
  [B(4)]: [0xd9c3a0, 0.4, 45, 170],
  [B(5)]: [0xd8d2e8, 0.45, 40, 160],
};

const BOX = { x: 44, y: 16, z: 44 }; // 粒子圍住鏡頭嘅範圍

export function createAmbience(scene) {
  roundAllPoints();
  const MAX = 320;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX * 3);
  const col = new Float32Array(MAX * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.15, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, map: roundTexture(), sizeAttenuation: true });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 2;
  scene.add(points);
  // 每粒嘅「本來位置」（相對鏡頭嘅盒入面，0–1）
  const seeds = Array.from({ length: MAX }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), p: Math.random() * 100, s: 0.6 + Math.random() * 0.8 }));
  const amb = { scene, points, geo, pos, col, mat, seeds, MAX, count: MAX, profile: null, next: null, fade: 0, t: 0, quality: 3, clouds: createClouds(scene), fogNear: 70, fogFar: 220, tintK: 0 };
  return amb;
}

export function setAmbienceQuality(amb, level) {
  amb.quality = level;
  amb.points.visible = level > 0;
  amb.count = level >= 2 ? amb.MAX : level === 1 ? Math.floor(amb.MAX / 2) : 0;
  amb.geo.setDrawRange(0, amb.count);
}

function applyProfile(amb, name) {
  amb.profile = name;
  const pr = PROFILES[name];
  if (!pr) return;
  const c = new THREE.Color();
  for (let i = 0; i < amb.MAX; i++) {
    c.setHex(pr.colors[i % pr.colors.length]);
    amb.col[i * 3] = c.r;
    amb.col[i * 3 + 1] = c.g;
    amb.col[i * 3 + 2] = c.b;
  }
  amb.geo.attributes.color.needsUpdate = true;
  amb.mat.size = pr.size;
  amb.mat.blending = pr.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
  amb.mat.needsUpdate = true;
  amb.geo.setDrawRange(0, pr.few ? Math.min(amb.count, 60) : amb.count);
}

const wrap = (v) => v - Math.floor(v);

// 每格畫面：camPos = 鏡頭位置；night 0–1；dusk 0–1
export function updateAmbience(amb, dt, time, camPos, location, night, dusk, sky) {
  amb.t += dt;
  updateShimmer(time);
  updateClouds(amb.clouds, dt, sky, night, dusk);

  // 揀粒子（夜晚 Hub／Gym 變螢火蟲）；轉地方先淡出再換
  let want = AREA[location] || null;
  if (night > 0.5 && (want === 'pollen' || want === 'leaves')) want = 'fireflies';
  if (amb.halloween && !want) want = 'embers'; // 🎃 Halloween 世界未有名嘅地方
  if (want !== amb.profile) {
    amb.fade = Math.max(0, amb.fade - dt * 1.5);
    if (amb.fade === 0) applyProfile(amb, want);
  } else amb.fade = Math.min(1, amb.fade + dt * 0.8);
  const pr = PROFILES[amb.profile];
  amb.points.visible = !!pr && amb.count > 0;

  // 霧色：每個生態區唔同（同天空色混）
  const scene = amb.scene;
  const tint = FOG_TINT[location];
  const targetNear = tint ? tint[2] : 70;
  const targetFar = tint ? tint[3] : 220;
  amb.fogNear += (targetNear - amb.fogNear) * Math.min(1, dt * 0.8);
  amb.fogFar += (targetFar - amb.fogFar) * Math.min(1, dt * 0.8);
  if (scene.fog && !scene.fog.isFogExp2) {
    scene.fog.near = amb.fogNear;
    scene.fog.far = amb.fogFar;
    // 每格由天空色重新計（暫停嘅時候都唔會越變越深）
    if (scene.background?.isColor) scene.fog.color.copy(scene.background);
    amb._c ??= new THREE.Color();
    amb.tintK += ((tint ? tint[1] : 0) - amb.tintK) * Math.min(1, dt * 0.8);
    if (tint) amb._c.setHex(tint[0]);
    if (amb.tintK > 0.001) scene.fog.color.lerp(amb._c, amb.tintK * (1 - night) * (1 - dusk * 0.6));
  }
  if (!amb.points.visible) return;

  const n = Math.min(amb.count, pr.few ? 60 : amb.count);
  const { pos, seeds } = amb;
  const t = amb.t;
  const ox = camPos.x - BOX.x / 2;
  const oy = (pr.motion === 'mist' ? 0 : camPos.y - 3);
  const oz = camPos.z - BOX.z / 2;
  for (let i = 0; i < n; i++) {
    const s = seeds[i];
    let x = s.x;
    let y = s.y;
    let z = s.z;
    const sp = pr.speed * s.s;
    const sway = Math.sin(t * 0.9 + s.p) * pr.sway;
    if (pr.motion === 'fall') y = wrap(s.y - (t * sp) / BOX.y);
    else if (pr.motion === 'rise') y = wrap(s.y + (t * sp) / BOX.y);
    else if (pr.motion === 'drift') x = wrap(s.x + (t * sp) / BOX.x);
    else if (pr.motion === 'wander') {
      x = wrap(s.x + Math.sin(t * 0.3 * s.s + s.p) * 0.04);
      z = wrap(s.z + Math.cos(t * 0.25 * s.s + s.p) * 0.04);
      y = 0.05 + s.y * 0.35 + Math.sin(t * 0.8 + s.p) * 0.03;
    } else if (pr.motion === 'mist') {
      x = wrap(s.x + (t * sp) / BOX.x);
      y = s.y * 0.12;
    }
    // 跟住鏡頭（世界座標固定，等佢哋唔會跟住你郁）
    const wx = ox + wrap(x - ox / BOX.x) * BOX.x;
    const wz = oz + wrap(z - oz / BOX.z) * BOX.z;
    pos[i * 3] = wx + sway * 0.3;
    pos[i * 3 + 1] = pr.motion === 'mist' || pr.motion === 'wander' ? oy + 0.4 + y * BOX.y : oy + y * BOX.y;
    pos[i * 3 + 2] = wz + Math.cos(t * 0.7 + s.p) * pr.sway * 0.2;
  }
  amb.geo.attributes.position.needsUpdate = true;
  let op = pr.opacity * amb.fade;
  if (pr.blink) op *= 0.75 + Math.sin(t * 3) * 0.25;
  if (amb.profile === 'fireflies') op *= 0.55 + 0.45 * Math.max(night, dusk); // 夜晚／黃昏更光
  amb.mat.opacity = op;
}

// ---------- 雲（一個 InstancedMesh，慢慢飄，跟天空變色）----------
function createClouds(scene) {
  const PER = 6;
  const CLOUDS = 36;
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x9aa6b2, transparent: true, opacity: 0.94, fog: false });
  const mesh = new THREE.InstancedMesh(geo, mat, PER * CLOUDS);
  mesh.frustumCulled = false;
  const puffs = [];
  for (let c = 0; c < CLOUDS; c++) {
    const cx = (Math.random() - 0.5) * 260;
    const cy = 38 + Math.random() * 22;
    const cz = 60 - Math.random() * 460;
    const big = 0.8 + Math.random() * 0.8;
    for (let j = 0; j < PER; j++) {
      const k = j / (PER - 1) - 0.5;
      puffs.push({
        cx, cy, cz,
        ox: k * 9 * big + (Math.random() - 0.5) * 1.5,
        oy: (1 - Math.abs(k) * 1.6) * 1.6 * big + Math.random() * 0.6,
        oz: (Math.random() - 0.5) * 3 * big,
        s: [(2.4 + Math.random() * 1.8) * big, (1.6 + Math.random() * 0.8) * big, (2 + Math.random() * 1.4) * big],
        speed: 0.6 + (c % 5) * 0.12,
      });
    }
  }
  scene.add(mesh);
  return { mesh, mat, puffs, t: 0, m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), sc: new THREE.Vector3(), c1: new THREE.Color(), c2: new THREE.Color() };
}

const CLOUD_DAY = new THREE.Color(0xffffff);
const CLOUD_DUSK = new THREE.Color(0xffc1a8);
const CLOUD_NIGHT = new THREE.Color(0x3a4470);
function updateClouds(cl, dt, sky, night, dusk) {
  cl.t += dt;
  const span = 320;
  cl.puffs.forEach((pf, i) => {
    let x = pf.cx + cl.t * pf.speed;
    x = ((x + span / 2) % span + span) % span - span / 2; // 飄出去就由另一邊返嚟
    cl.p.set(x + pf.ox, pf.cy + pf.oy, pf.cz + pf.oz);
    cl.sc.set(pf.s[0], pf.s[1], pf.s[2]);
    cl.m.compose(cl.p, cl.q, cl.sc);
    cl.mesh.setMatrixAt(i, cl.m);
  });
  cl.mesh.instanceMatrix.needsUpdate = true;
  // 顏色：日頭白、黃昏粉橙、夜晚深藍
  cl.c1.copy(CLOUD_DAY).lerp(CLOUD_DUSK, dusk * 0.8).lerp(CLOUD_NIGHT, night);
  cl.mat.color.copy(cl.c1);
  cl.mat.emissive.copy(cl.c1).multiplyScalar(0.55 - night * 0.5);
}
