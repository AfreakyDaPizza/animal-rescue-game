// 🎣 Halloween 釣魚（小朋友 2026-10-19；Issue #8 #9 2026-10-21 新玩法）
// 流程：喺碼頭／岸邊撳 E（或者滑鼠左掣／手機 USE）
//   → ⚡ 力度條上上落落，再撳一下拋竿（越高越好運：蛋稀有啲、Candy Corn 多啲、拋得遠啲）
//   → 浮標一條弧線飛出去，落水濺水花 → 等魚咬（魚竿越好越快）
//   → 浮標一沉「❗」：限時內撳 E 上鈎
//   → 🎣 狂撳 E／click／USE 收線（條收線條會慢慢跌返落嚟；跌晒 = 走甩）
//   → 收滿：60% 🌽 Candy Corn、40% Halloween 蛋，由水入面飛出嚟
// Mythic／Eternal 蛋或者 CANDY MOUNTAIN：大獎動畫（閃光、光芒、彩紙、大字、音樂）
// 魚竿：每個人都有免費 Twig Rod；用 Candy Corn 喺魚竿舖升級（rodShop.js），會存低，返普通世界都唔會斷
import * as THREE from 'three';
import { state } from './state.js';
import { FISHING_BITE_WINDOW, FISHING_CAST_RANGE, FISHING_POWER_PERIOD, FISHING_REEL, FISHING_REEL_WEIGHT, rarityInfo } from './data/balance.js';
import { buildHalloweenEgg } from './halloweenPets.js';
import { ROD_SHOP, FISH_SPOT, DOCK, LAKE_WATER, LAKE_SHORE, LAKE, RUINS } from './halloweenShape.js';
import { addEgg } from './halloweenEggs.js';
import { RODS, currentRod, rodIndex, rollCatch } from './rodShop.js';
import { makeLabel } from './signs.js';
import { short } from './format.js';

const WATER_Y = -0.08;
const RARE = ['Legendary', 'Mythic', 'Eternal'];
const BIG_EGG = ['Mythic', 'Eternal'];
const $ = (id) => document.getElementById(id);
const ease = (k) => 1 - (1 - k) ** 3; // 慢慢停
const tri = (x) => 1 - Math.abs(((x % 2) + 2) % 2 - 1); // 0 → 1 → 0 三角波

// ---------- 魚竿模型（沿 +Y 伸出去）：6 節，每節一個關節，收線嗰陣識彎 ----------
function rodModel(rod, len = 2.4, eyes = true) {
  const g = new THREE.Group();
  const glow = new THREE.Color(rod.glow);
  const tier = RODS.indexOf(rod);
  const shaftMat = new THREE.MeshStandardMaterial({ color: rod.color, roughness: 0.5, metalness: tier > 7 ? 0.5 : 0.1 });
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 }));
  grip.position.y = 0.2;
  g.add(grip);
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: tier > 4 ? 0.8 : 0.2 }));
  reel.rotation.z = Math.PI / 2;
  reel.position.set(0.1, 0.5, 0);
  g.add(reel);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.14), new THREE.MeshStandardMaterial({ color: 0x212121 }));
  handle.position.set(0.16, 0.5, 0.06);
  g.add(handle);
  // 一節一節：每節嘅關節喺上一節嘅頂
  const N = 6;
  const segLen = (len - 0.4) / N;
  const joints = [];
  const ringMat = new THREE.MeshBasicMaterial({ color: glow });
  let parent = new THREE.Group();
  parent.position.y = 0.4;
  g.add(parent);
  for (let i = 0; i < N; i++) {
    const j = new THREE.Group();
    if (i > 0) j.position.y = segLen;
    parent.add(j);
    const r0 = 0.05 - (0.03 * i) / N;
    const r1 = 0.05 - (0.03 * (i + 1)) / N;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, segLen, 7), shaftMat);
    seg.position.y = segLen / 2;
    j.add(seg);
    if (i > 0 && eyes) { // 穿線嘅小圈（第一身唔要，太近鏡頭會好大）
      const eye = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 4, 10), ringMat);
      eye.position.set(0, 0.02, 0.06);
      j.add(eye);
    }
    joints.push(j);
    parent = j;
  }
  const tip = new THREE.Group();
  tip.position.y = segLen;
  parent.add(tip);
  // 竿頭發光（高級竿越光，仲有一粒粒閃光）
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06 + tier * 0.004, 10, 8), new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 1 + tier * 0.25 }));
  tip.add(dot);
  if (tier >= 9) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 20), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.8 }));
    tip.add(ring);
    g.userData.ring = ring;
  }
  if (tier >= 12) {
    const sparks = [];
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), new THREE.MeshBasicMaterial({ color: glow }));
      tip.add(s);
      sparks.push(s);
    }
    g.userData.sparks = sparks;
  }
  g.userData.joints = joints;
  g.userData.tip = tip;
  g.userData.len = len;
  return g;
}
// 彎竿：amount = 總共彎幾多（弧度），越近竿頭彎得越多；正數 = 竿頭向前向下（俾條線拉住）
function bendRod(r, amount) {
  const js = r.userData.joints;
  const total = (js.length * (js.length + 1)) / 2;
  js.forEach((j, i) => (j.rotation.x = (-amount * (i + 1)) / total));
}

// ---------- 🌽 Candy Corn 模型（黃底、橙中間、白尖）----------
const CANDY_GEO = [
  new THREE.CylinderGeometry(0.085, 0.12, 0.1, 10),
  new THREE.CylinderGeometry(0.05, 0.085, 0.1, 10),
  new THREE.ConeGeometry(0.05, 0.09, 10),
];
const CANDY_MAT = [0xffc400, 0xff6d00, 0xfffde7].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.45 }));
function candyCorn() {
  const g = new THREE.Group();
  CANDY_GEO.forEach((geo, i) => {
    const m = new THREE.Mesh(geo, CANDY_MAT[i]);
    m.position.y = 0.05 + i * 0.095;
    g.add(m);
  });
  return g;
}
function candyPile(amount, big) {
  const g = new THREE.Group();
  const n = Math.min(big ? 26 : 14, 3 + Math.floor(Math.log2(amount + 1) * 1.4));
  for (let i = 0; i < n; i++) {
    const c = candyCorn();
    const a = i * 2.4;
    const r = 0.06 * Math.sqrt(i) * 2.2;
    c.position.set(Math.cos(a) * r, Math.max(0, 0.32 - r * 0.9) + (i % 3) * 0.03, Math.sin(a) * r);
    c.rotation.set((Math.random() - 0.5) * 1.4, Math.random() * 6, (Math.random() - 0.5) * 1.4);
    g.add(c);
  }
  g.scale.setScalar(big ? 2.6 : 1.7);
  return g;
}

// ---------- 💦 水花粒子（一個 Points 循環用）----------
function makeSplash(scene) {
  const N = 220;
  const pos = new Float32Array(N * 3).fill(-1000);
  const vel = new Float32Array(N * 3);
  const life = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd8fbff, size: 0.17, transparent: true, opacity: 0.9, depthWrite: false }));
  pts.frustumCulled = false;
  scene.add(pts);
  let next = 0;
  return {
    pts,
    emit(at, n, speed = 3, up = 4) {
      for (let k = 0; k < n; k++) {
        const i = next;
        next = (next + 1) % N;
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.7);
        pos.set([at.x + Math.cos(a) * 0.15, at.y + 0.05, at.z + Math.sin(a) * 0.15], i * 3);
        vel.set([Math.cos(a) * s, up * (0.5 + Math.random() * 0.7), Math.sin(a) * s], i * 3);
        life[i] = 0.5 + Math.random() * 0.6;
      }
    },
    update(dt) {
      let any = false;
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        any = true;
        life[i] -= dt;
        vel[i * 3 + 1] -= 14 * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (life[i] <= 0 || pos[i * 3 + 1] < WATER_Y - 0.1) {
          life[i] = 0;
          pos[i * 3 + 1] = -1000;
        }
      }
      if (any) geo.attributes.position.needsUpdate = true;
      pts.visible = any;
    },
  };
}
// ---------- 波紋（6 個圈循環用）----------
function makeRings(scene) {
  const rings = [];
  for (let i = 0; i < 8; i++) {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.4, 32), new THREE.MeshBasicMaterial({ color: 0xc8f7ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    r.rotation.x = -Math.PI / 2;
    r.visible = false;
    scene.add(r);
    rings.push({ r, t: 1, life: 1, size: 1, op: 0.5 });
  }
  let next = 0;
  return {
    spawn(at, size = 3, life = 1.2, op = 0.55) {
      const o = rings[next];
      next = (next + 1) % rings.length;
      Object.assign(o, { t: 0, life, size, op });
      o.r.position.set(at.x, WATER_Y + 0.03, at.z);
      o.r.visible = true;
    },
    update(dt) {
      for (const o of rings) {
        if (!o.r.visible) continue;
        o.t += dt;
        const k = o.t / o.life;
        if (k >= 1) {
          o.r.visible = false;
          continue;
        }
        o.r.scale.setScalar(0.4 + ease(k) * o.size);
        o.r.material.opacity = (1 - k) * o.op;
      }
    },
  };
}

// ---------- 魚竿舖旁邊：友善骷髏漁夫 + 燈籠；湖：發光魚、霧、沉船桅杆 ----------
function signBoard(lines, w, h, accent) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.round((512 * h) / w);
  const g = c.getContext('2d');
  g.fillStyle = '#1a0f05';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = accent;
  g.lineWidth = 10;
  g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach(([text, size, color, y]) => {
    g.font = `bold ${size}px sans-serif`;
    g.lineWidth = 8;
    g.strokeStyle = '#4e2600';
    g.strokeText(text, 256, y * c.height);
    g.fillStyle = color;
    g.fillText(text, 256, y * c.height);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
  const both = new THREE.Group();
  both.add(front);
  const back = front.clone();
  back.rotation.y = Math.PI;
  back.position.z = -0.02;
  both.add(back);
  return both;
}
function buildDecor(scene) {
  const root = new THREE.Group();
  const bone = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 });
  // 骷髏 Sam：企喺櫃枱後面（舖頭面向 +x）
  const sam = new THREE.Group();
  sam.position.set(ROD_SHOP.x - 0.9, 0, ROD_SHOP.z);
  sam.rotation.y = -Math.PI / 2; // 面向 +x
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), bone);
  skull.position.y = 2.15;
  sam.add(skull);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: 0x18ffff, emissive: 0x18ffff, emissiveIntensity: 2 }));
    eye.position.set(s * 0.15, 2.2, -0.36);
    sam.add(eye);
  }
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.3), bone);
  jaw.position.set(0, 1.86, -0.12);
  sam.add(jaw);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.3, 14), new THREE.MeshStandardMaterial({ color: 0xffca28 })); // 漁夫帽
  hat.position.y = 2.55;
  sam.add(hat);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.35), new THREE.MeshStandardMaterial({ color: 0x1565c0 })); // 背心
  body.position.y = 1.4;
  sam.add(body);
  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), bone);
    rib.position.set(0, 1.25 + i * 0.16, -0.19);
    sam.add(rib);
  }
  const arm = new THREE.Group();
  arm.position.set(0.42, 1.75, 0);
  const armBone = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), bone);
  armBone.position.y = -0.3;
  arm.add(armBone);
  sam.add(arm);
  root.add(sam);
  // 燈籠（舖頭兩邊）
  const lanterns = [];
  for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), new THREE.MeshStandardMaterial({ color: 0xffab40, emissive: 0xff6d00, emissiveIntensity: 2 }));
    l.position.set(ROD_SHOP.x + 1.2, 3.1, ROD_SHOP.z + s * 2.3);
    root.add(l);
    lanterns.push(l);
  }
  const lamp = new THREE.PointLight(0xffb74d, 14, 22, 1.6);
  lamp.position.set(ROD_SHOP.x + 2.5, 3.5, ROD_SHOP.z);
  root.add(lamp);
  // 大大個發光招牌（唔受燈光影響，黑麻麻都遠遠見到）
  const board = signBoard([['🎣 ROD SHOP', 74, '#ffe082', 0.42], ['🌽 Upgrade your rod with Candy Corn!', 26, '#b2ebf2', 0.8]], 5.2, 1.6, '#ffb300');
  board.position.set(ROD_SHOP.x + 1.6, 5.4, ROD_SHOP.z);
  board.rotation.y = Math.PI / 2; // 面向 +x（出生點）
  root.add(board);
  // 頂上一條暖黃色光柱（遠遠都知道舖頭喺邊）
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 30, 12, 1, true), beamMat);
  beam.position.set(ROD_SHOP.x, 15, ROD_SHOP.z);
  root.add(beam);
  // 🎣 碼頭入口：「FISH HERE」牌 + 碼頭尾一條藍色光柱
  const fishSign = signBoard([['🎣 FISH HERE!', 64, '#80deea', 0.4], ['Dock or shore · aim at the water · press E', 22, '#fff3e0', 0.8]], 4, 1.2, '#00e5ff');
  fishSign.position.set(DOCK.maxX + 1.2, 2.6, DOCK.maxZ + 1.4);
  fishSign.rotation.y = Math.PI / 2;
  root.add(fishSign);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
    post.position.set(DOCK.maxX + 1.2, 1.2, DOCK.maxZ + 1.4 + s * 1.7);
    root.add(post);
  }
  const spotBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 24, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  spotBeam.position.set(FISH_SPOT.x, 12, FISH_SPOT.z);
  root.add(spotBeam);
  // 由出生點石圈去舖頭：一路發光南瓜燈做路標
  const from = new THREE.Vector3(RUINS.x - RUINS.r + 2, 0, RUINS.z + 3.5);
  const to = new THREE.Vector3(ROD_SHOP.x + 3.4, 0, ROD_SHOP.z - 3.2);
  const markMat = new THREE.MeshStandardMaterial({ color: 0xff8f00, emissive: 0xff6d00, emissiveIntensity: 2.2 });
  for (let i = 0; i <= 3; i++) {
    const p = from.clone().lerp(to, i / 3);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
    post.position.set(p.x, 0.5, p.z);
    root.add(post);
    const pumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), markMat);
    pumpkin.scale.y = 0.8;
    pumpkin.position.set(p.x, 1.15, p.z);
    root.add(pumpkin);
  }
  // 水底發光魚影
  const fish = [];
  const fishMat = new THREE.MeshBasicMaterial({ color: 0x64ffda, transparent: true, opacity: 0.35, depthWrite: false });
  const fishGeo = new THREE.PlaneGeometry(1.2, 0.45);
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(fishGeo, fishMat);
    f.rotation.x = -Math.PI / 2;
    root.add(f);
    fish.push({ f, cx: LAKE_WATER.minX + 8 + Math.random() * (LAKE_WATER.maxX - LAKE_WATER.minX - 16), cz: LAKE_WATER.minZ + 6 + Math.random() * (LAKE_WATER.maxZ - LAKE_WATER.minZ - 12), r: 2 + Math.random() * 5, s: 0.3 + Math.random() * 0.5, p: Math.random() * 6 });
  }
  // 沉船：斜咗嘅桅杆 + 破帆
  const wreck = new THREE.Group();
  wreck.position.set(LAKE_WATER.minX + 10, 0, LAKE_WATER.minZ + 12);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 9, 8), new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 }));
  mast.position.y = 3;
  mast.rotation.z = 0.35;
  wreck.add(mast);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3), new THREE.MeshStandardMaterial({ color: 0x9e9d89, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  sail.position.set(-1.2, 4.6, 0.2);
  sail.rotation.z = 0.35;
  wreck.add(sail);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 2), new THREE.MeshStandardMaterial({ color: 0x2b1d14 }));
  hull.position.set(0.5, -0.2, 0);
  hull.rotation.set(0.2, 0.4, -0.25);
  wreck.add(hull);
  root.add(wreck);
  // 水面霧（幾塊淡淡嘅板）
  const mistMat = new THREE.MeshBasicMaterial({ color: 0xb2dfdb, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
  const mist = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 2.4), mistMat);
    m.position.set(LAKE_WATER.minX + 10 + i * 6, 0.9, LAKE_WATER.minZ + 8 + ((i * 11) % (LAKE_WATER.maxZ - LAKE_WATER.minZ - 16)));
    m.rotation.y = i * 0.7;
    root.add(m);
    mist.push(m);
  }
  scene.add(root);
  return { root, sam, arm, jaw, lanterns, fish, mist, beamMat };
}

// ---------- 畫面上嘅 UI：力度條、收線條、大獎、🌽 HUD ----------
function buildUi() {
  const ui = document.createElement('div');
  ui.id = 'fish-ui';
  ui.innerHTML = `
    <div id="fish-power" hidden>
      <div class="fp-title">⚡ POWER</div>
      <div class="fp-track"><div class="fp-perfect">PERFECT</div><div class="fp-needle"></div></div>
      <div class="fp-hint"></div>
    </div>
    <div id="fish-reel" hidden>
      <div class="fr-title">🎣 REEL IT IN!</div>
      <div class="fr-track"><div class="fr-fill"></div><div class="fr-fish">🐟</div><div class="fr-goal">🏁</div></div>
      <div class="fr-hint"></div>
    </div>
    <div id="fish-perfect" hidden></div>`;
  document.body.appendChild(ui);
  const big = document.createElement('div');
  big.id = 'fish-big';
  big.hidden = true;
  big.innerHTML = '<div class="fb-flash"></div><div class="fb-rays"></div><div class="fb-confetti"></div><div class="fb-text"><div class="fb-kicker"></div><div class="fb-title"></div><div class="fb-sub"></div></div>';
  document.body.appendChild(big);
  const hud = document.createElement('div');
  hud.id = 'hw-candy-hud';
  hud.className = 'hud-box';
  hud.hidden = true;
  document.body.appendChild(hud);
  return { ui, big, hud };
}
const mobile = () => document.body.classList.contains('mobile');
const pressWord = () => (mobile() ? 'TAP USE' : 'PRESS E / CLICK');
const key = () => (mobile() ? '<kbd>USE</kbd>' : '<kbd>E</kbd>'); // 提示：手機講 USE 掣

// 大獎動畫（Mythic／Eternal 蛋、CANDY MOUNTAIN）
let bigTimer = 0;
function showBigCatch(fishing, { kicker, title, sub, color, eternal }) {
  const big = fishing.dom.big;
  big.style.setProperty('--fb', color);
  big.querySelector('.fb-kicker').textContent = kicker;
  big.querySelector('.fb-title').textContent = title;
  big.querySelector('.fb-sub').textContent = sub;
  const conf = big.querySelector('.fb-confetti');
  conf.innerHTML = '';
  const colors = eternal ? ['#18ffff', '#ea80fc', '#ffffff', '#b388ff', '#ffd740'] : [color, '#ffd740', '#ff6d00', '#fffde7', '#b2ff59', '#ff4081'];
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('i');
    s.style.left = `${Math.random() * 100}%`;
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = `${Math.random() * 0.9}s`;
    s.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
    s.style.setProperty('--x', `${(Math.random() - 0.5) * 240}px`);
    s.style.setProperty('--r', `${Math.random() * 1080 - 540}deg`);
    if (i % 4 === 0) {
      s.textContent = '🌽';
      s.className = 'emoji';
      s.style.background = 'none';
    }
    conf.appendChild(s);
  }
  big.hidden = false;
  big.classList.remove('on');
  void big.offsetWidth;
  big.classList.add('on');
  clearTimeout(bigTimer);
  bigTimer = setTimeout(() => {
    big.classList.remove('on');
    big.hidden = true;
  }, 3800);
}

// ---------- 主體 ----------
export function createFishing({ scene, camera, avatar, view = null }) {
  const fishing = {
    scene, camera, avatar, view, third: false, aim: { point: new THREE.Vector3(), ok: true, why: '' },
    phase: 'idle', t: 0, waitLeft: 0, castFrom: null, target: new THREE.Vector3(), launch: new THREE.Vector3(),
    power: 0, progress: 0, catch: null, weight: 1, kick: 0, tugIn: 1.5, cool: 0, nibbleIn: 2, nibble: 0, splashIn: 0, ringIn: 0,
    decor: null, handRod: null, avatarRod: null, rodIndex: -1,
    prize: null, prizeFrom: new THREE.Vector3(),
    debugBite: false, lastCandy: state.candyCorn,
  };
  // 浮標（紅白波 + 一支發光天線）
  const bob = new THREE.Group();
  const bobBody = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 0.8 }));
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 20), new THREE.MeshStandardMaterial({ color: 0x212121 }));
  band.rotation.x = Math.PI / 2;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  stick.position.y = 0.22;
  const glowDot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffff8d }));
  glowDot.position.y = 0.34;
  bobBody.add(top, bottom, band, stick, glowDot);
  bob.add(bobBody);
  bob.visible = false;
  scene.add(bob);
  // 魚絲：24 點嘅曲線（會垂低）
  const LINE_N = 24;
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINE_N * 3), 3));
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xf1fdff, transparent: true, opacity: 0.9 }));
  line.frustumCulled = false;
  line.visible = false;
  scene.add(line);
  const bang = makeLabel([{ text: '❗', color: '#ffeb3b' }], 4.5);
  bang.userData.base = bang.scale.clone();
  bang.visible = false;
  scene.add(bang);
  const splash = makeSplash(scene);
  const rings = makeRings(scene);
  // 每次畫畫面之前（矩陣已經更新好）先擺魚絲：就算其他程式喺 updateFishing 之後再郁過公仔／鏡頭，條線都唔會甩（Issue #10）
  const before = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    before.apply(this, args);
    if (line.visible && fishing.handRod) drawLine(fishing);
  };
  // 🎯 瞄準記號（Issue #10）：撳緊力度條嗰陣，水面一個圈話你知會落喺邊 + 一條虛線弧
  const marker = new THREE.Group();
  // depthTest: false = 隔住公仔（第三身準星喺公仔後面）都見到
  const markMat = new THREE.MeshBasicMaterial({ color: 0x18ffff, transparent: true, opacity: 0.85, depthWrite: false, depthTest: false, side: THREE.DoubleSide, fog: false });
  const markRing = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.8, 40).rotateX(-Math.PI / 2), markMat);
  const markOuter = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.13, 40).rotateX(-Math.PI / 2), markMat);
  const markDot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16).rotateX(-Math.PI / 2), markMat);
  marker.add(markRing, markOuter, markDot);
  marker.traverse((o) => (o.renderOrder = 20));
  marker.visible = false;
  scene.add(marker);
  const ARC_N = 26;
  const arcGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_N * 3), 3));
  const arc = new THREE.Points(arcGeo, new THREE.PointsMaterial({ color: 0xb2ffff, size: 0.13, transparent: true, opacity: 0.8, depthWrite: false, depthTest: false, fog: false }));
  arc.frustumCulled = false;
  arc.visible = false;
  arc.renderOrder = 20;
  scene.add(arc);
  Object.assign(fishing, { bob, bobBody, glowDot, line, lineGeo, LINE_N, bang, splash, rings, marker, markMat, markOuter, arc, arcGeo, ARC_N, dom: buildUi() });
  // 試大獎動畫（console：game.fishing.testBig()）
  fishing.testBig = (o = { kicker: '✨ MYTHIC CATCH! ✨', title: 'Ghost Reaper egg!', sub: 'You fished up a MYTHIC egg 🥚', color: '#ff4081' }) => showBigCatch(fishing, o);
  return fishing;
}

// 拎住嘅魚竿：第一身擺喺鏡頭左下角，第三身擺喺左手
function syncRodModels(fishing) {
  const idx = rodIndex();
  if (idx === fishing.rodIndex) return;
  const rod = RODS[idx];
  fishing.handRod?.removeFromParent();
  fishing.avatarRod?.removeFromParent();
  fishing.rodIndex = idx;
  const hand = new THREE.Group();
  const hr = rodModel(rod, 1.5, false);
  hr.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.15, 0.5, -0.85).normalize());
  hand.add(hr);
  hand.position.set(-0.42, -0.5, -0.7);
  fishing.camera.add(hand);
  hand.userData.rod = hr;
  fishing.handRod = hand;
  const av = new THREE.Group();
  const ar = rodModel(rod, 2.6);
  // 手臂向前 ~1 rad 嗰陣，竿向前向上
  ar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -0.46, -0.89).normalize());
  av.add(ar);
  av.position.set(0, -0.75, -0.05);
  av.userData.rod = ar;
  fishing.avatar.arms[0].add(av);
  fishing.avatarRod = av;
}

// 喺邊度釣得：成條碼頭，或者成條湖邊（近水嗰幾米）都得（Issue #10）
export function canFishAt(x, z) {
  const onDock = x >= DOCK.minX - 0.5 && x <= DOCK.maxX + 0.5 && z >= DOCK.minZ - 0.6 && z <= DOCK.maxZ + 0.6;
  const onShore = x >= LAKE_SHORE.minX - 0.5 && x <= LAKE_SHORE.minX + 4.5 && z >= LAKE_SHORE.minZ && z <= LAKE_SHORE.maxZ;
  return onDock || onShore;
}

// 力度 → 最遠拋到幾遠（米）
export const castRange = (power) => FISHING_CAST_RANGE.min + (FISHING_CAST_RANGE.max - FISHING_CAST_RANGE.min) * power;

// 最近嘅「拋得落」水面點：喺湖入面（唔好太埋邊／蘆葦），唔好落喺碼頭上面
const DOCK_GAP = 0.9;
function clampToWater(v) {
  const W = LAKE_WATER;
  v.x = THREE.MathUtils.clamp(v.x, W.minX + 1.5, W.maxX - 1.4);
  v.z = THREE.MathUtils.clamp(v.z, W.minZ + 1.5, W.maxZ - 1.5);
  if (v.x > DOCK.minX - DOCK_GAP && Math.abs(v.z) < DOCK.maxZ + DOCK_GAP) {
    // 喺碼頭上面：推去最近嗰邊（左／右／碼頭尾前面）
    const side = DOCK.maxZ + DOCK_GAP - Math.abs(v.z);
    const front = v.x - (DOCK.minX - DOCK_GAP);
    if (front < side) v.x = DOCK.minX - DOCK_GAP;
    else v.z = (v.z >= 0 ? 1 : -1) * (DOCK.maxZ + DOCK_GAP);
  }
  v.y = WATER_Y;
  return v;
}

// 🎯 瞄準（Issue #10）：準星（畫面正中）條射線打落水面 → 浮標落點
// 太遠 → 縮返去力度夠到嘅位；望住地／碼頭 → 搵最近嘅水面
const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
function aimPoint(fishing, pos, power) {
  const cam = fishing.third && fishing.view ? fishing.view : fishing.camera;
  cam.updateWorldMatrix(true, false);
  cam.getWorldPosition(_o);
  cam.getWorldDirection(_d);
  const flat = new THREE.Vector3(_d.x, 0, _d.z);
  if (flat.lengthSq() < 1e-4) flat.set(-1, 0, 0);
  flat.normalize();
  const range = castRange(power);
  const hit = new THREE.Vector3();
  if (_d.y < -0.01) hit.copy(_o).addScaledVector(_d, (WATER_Y - _o.y) / _d.y);
  else hit.set(pos.x + flat.x * 999, WATER_Y, pos.z + flat.z * 999); // 望天：拋到最遠
  // 由玩家量：太近推遠少少，太遠縮返
  const v = new THREE.Vector3(hit.x - pos.x, 0, hit.z - pos.z);
  let d = v.length();
  if (d < 1e-3) v.copy(flat), (d = 1);
  v.divideScalar(d);
  if (v.dot(flat) < 0) v.copy(flat), (d = 2.5); // 第三身望好低：射線打中公仔後面 → 當你向前拋近近
  const want = THREE.MathUtils.clamp(d, 2.5, range);
  const raw = new THREE.Vector3(pos.x + v.x * want, WATER_Y, pos.z + v.z * want);
  const p = clampToWater(raw.clone());
  const far = d > range + 0.01;
  const land = p.distanceTo(raw) >= 0.3;
  if (Math.hypot(p.x - pos.x, p.z - pos.z) > range + 1.5) {
    // 望住相反方向（背住個湖）：夾完都太遠 → 拋落離你最近嘅水面
    clampToWater(p.set(pos.x - 4, WATER_Y, pos.z));
    if (Math.hypot(p.x - pos.x, p.z - pos.z) < 2.5) clampToWater(p.set(pos.x - 6, WATER_Y, pos.z));
  }
  fishing.aim.point.copy(p);
  fishing.aim.ok = !land; // false = 望住地：幫你搵最近嘅水（記號變橙色）；太遠 = 縮返去力度夠到嘅位（仍然藍色）
  fishing.aim.why = land ? 'land' : far ? 'far' : '';
  return fishing.aim;
}

// E 掣提示（main.js currentInteraction 用）；fish: true = 釣魚動作（滑鼠左掣都用得）
export function fishingInteraction(fishing, pos, { openShop, ui }) {
  const act = (prompt, action) => ({ prompt, action, fish: true });
  const busy = () => {}; // 拋緊／飛緊：撳都唔做嘢（狂撳唔會打亂）
  switch (fishing.phase) {
    case 'power': return act(`${key()} CAST! Stop the bar HIGH to throw farther`, () => cast(fishing, pos, ui));
    case 'cast': return act('🎣 Casting...', busy);
    case 'wait': return act('🎣 Waiting for a bite... watch the bobber!', () => fishing.t > 1.2 && cancel(fishing, ui, '🎣 You reeled in... nothing. Wait for the ❗ next time!'));
    case 'bite': return act(`❗ ${key()} HOOK IT NOW!`, () => hook(fishing, ui));
    case 'reel': return act(mobile() ? '🎣 TAP <kbd>USE</kbd> FAST to reel it in!' : '🎣 SPAM <kbd>E</kbd> / CLICK to reel it in!', () => reelPress(fishing, ui));
    case 'catch': return act('🎣 ...', busy);
    default:
  }
  if (Math.hypot(pos.x - ROD_SHOP.x - 2.6, pos.z - ROD_SHOP.z) < 3.4) return { prompt: '<kbd>E</kbd> 🎣 Talk to Skeleton Sam (Rod Shop · upgrade with 🌽)', action: openShop };
  if (!canFishAt(pos.x, pos.z)) return null;
  if (fishing.cool > 0) return act(`🎣 ${currentRod().name}`, busy);
  return act(`${key()} 🎣 Fish with your ${currentRod().name} (aim at the water)`, () => startPower(fishing, pos, ui));
}
// 滑鼠左掣（main.js mousedown）：只係做釣魚動作，唔開舖
export function fishingPress(fishing, pos, ui) {
  const it = fishingInteraction(fishing, pos, { openShop: null, ui });
  if (!it?.fish) return false;
  it.action?.();
  return true;
}
// 釣緊魚（main.js：長撳 E 嘅自動重複唔當狂撳）
export const fishingBusy = (fishing) => fishing.phase !== 'idle';

function startPower(fishing, pos, ui) {
  fishing.phase = 'power';
  fishing.t = Math.random() * 0.3;
  fishing.castFrom = { x: pos.x, z: pos.z };
  ui.play('click');
}

function cast(fishing, pos, ui) {
  const rod = currentRod();
  fishing.power = tri(fishing.t / (FISHING_POWER_PERIOD / 2));
  fishing.phase = 'cast';
  fishing.t = 0;
  fishing.castFrom = { x: pos.x, z: pos.z };
  fishing.target.copy(aimPoint(fishing, pos, fishing.power).point); // 🎯 落喺你瞄住嘅位（Issue #10）
  // 等幾耐：竿決定，力度高少少快啲
  fishing.waitLeft = (rod.bite[0] + Math.random() * (rod.bite[1] - rod.bite[0])) * (1 - fishing.power * 0.15);
  fishing.nibbleIn = 1.5 + Math.random() * 2;
  ui.play('cast');
  const p = fishing.power;
  const msg = p >= 0.9 ? '⚡ PERFECT CAST! Super lucky!' : p >= 0.65 ? '⚡ Great cast!' : p >= 0.35 ? '🎣 Nice cast.' : '🎣 Weak cast... stop the bar higher next time!';
  const el = $('fish-perfect');
  el.textContent = msg;
  el.className = p >= 0.9 ? 'perfect' : p >= 0.65 ? 'great' : '';
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.hidden = true), 1400);
}

function cancel(fishing, ui, text) {
  fishing.phase = 'idle';
  fishing.cool = 0.6;
  fishing.bob.visible = fishing.line.visible = fishing.bang.visible = false;
  if (text) ui?.popup(text);
}

// ❗ 上鈎：而家決定釣到咩（稀有啲嘅重啲，要撳多啲）
function hook(fishing, ui) {
  const c = rollCatch(fishing.power);
  fishing.catch = c;
  fishing.weight = c.kind === 'candy' ? FISHING_REEL_WEIGHT[c.pile.big ? 'bigCandy' : 'candy'] : FISHING_REEL_WEIGHT[c.pet.rarity] ?? 1;
  fishing.phase = 'reel';
  fishing.t = 0;
  fishing.progress = FISHING_REEL.start;
  fishing.tugIn = 1 + Math.random();
  fishing.bang.visible = false;
  ui.play('splash');
  fishing.splash.emit(fishing.bob.position, 26, 2.5, 5);
  reelPress(fishing, ui);
}
function reelPress(fishing, ui) {
  if (fishing.phase !== 'reel') return;
  const gain = (FISHING_REEL.gain * (1 + rodIndex() * FISHING_REEL.rodBonus)) / fishing.weight;
  fishing.progress = Math.min(1, fishing.progress + gain);
  fishing.kick = 1;
  ui.play('reel');
  if (fishing.progress >= 1) catchIt(fishing, ui); // 收滿（喺度判斷，唔係等下一格，因為下一格會先跌少少）
}

function catchIt(fishing, ui) {
  const c = fishing.catch;
  fishing.phase = 'catch';
  fishing.t = 0;
  fishing.prize = c.kind === 'candy' ? candyPile(c.amount, c.pile.big) : buildHalloweenEgg(c.pet.name, c.pet.rarity);
  if (c.kind === 'egg') {
    const size = new THREE.Box3().setFromObject(fishing.prize).getSize(new THREE.Vector3());
    fishing.prize.scale.multiplyScalar((BIG_EGG.includes(c.pet.rarity) ? 1.3 : 0.9) / Math.max(size.x, size.y, size.z));
  }
  fishing.prizeFrom.copy(fishing.bob.position);
  fishing.prize.position.copy(fishing.prizeFrom);
  fishing.scene.add(fishing.prize);
  fishing.bob.visible = fishing.line.visible = false;
  fishing.splash.emit(fishing.prizeFrom, 70, 3.5, 7);
  fishing.rings.spawn(fishing.prizeFrom, 5, 1.4, 0.8);
  fishing.rings.spawn(fishing.prizeFrom, 3, 1, 0.8);
  ui.play('splash');
  ui.play('pop');
}

function finishCatch(fishing, ui) {
  const c = fishing.catch;
  fishing.prize.removeFromParent();
  fishing.prize = null;
  fishing.phase = 'idle';
  fishing.cool = 0.8;
  if (c.kind === 'candy') {
    state.candyCorn = (state.candyCorn || 0) + c.amount;
    ui.save();
    if (c.pile.big) {
      ui.play('bigCatch');
      showBigCatch(fishing, { kicker: '🌽 JACKPOT! 🌽', title: 'CANDY MOUNTAIN!', sub: `+${short(c.amount)} Candy Corn`, color: '#ffab00' });
      ui.announce(`🌽 CANDY MOUNTAIN! +${short(c.amount)} Candy Corn!`);
    } else {
      ui.play('candy');
      ui.popup(`🌽 +${short(c.amount)} Candy Corn! ${c.pile.name === 'Handful' ? '' : `(${c.pile.name}!)`}`);
    }
    return;
  }
  const pet = c.pet;
  addEgg(pet.name, pet.rarity);
  ui.save();
  const info = rarityInfo(pet.rarity);
  if (BIG_EGG.includes(pet.rarity)) {
    const eternal = pet.rarity === 'Eternal';
    ui.play('bigCatch');
    if (eternal) ui.play('drumroll');
    showBigCatch(fishing, { kicker: eternal ? '🥁✨ ETERNAL CATCH!!! ✨🥁' : '✨ MYTHIC CATCH! ✨', title: `${pet.name} egg!`, sub: `You fished up a ${pet.rarity.toUpperCase()} egg 🥚`, color: info.color, eternal });
    ui.announce(`${eternal ? '🥁✨ ETERNAL CATCH!!! ' : '✨ '}You fished up a ${pet.rarity.toUpperCase()} ${pet.name} egg! 🥚`);
  } else if (RARE.includes(pet.rarity)) {
    ui.play('magic');
    ui.flash?.(info.color);
    ui.announce(`✨ You fished up a ${pet.rarity.toUpperCase()} ${pet.name} egg! 🥚`);
  } else {
    ui.play('coin');
    ui.popup(`🥚 You fished up a ${pet.rarity} ${pet.name} egg!`);
  }
}

// 每格畫面（main.js：喺 updateThirdPerson 之後叫，咁先可以改手臂動作）
export function updateFishing(fishing, dt, time, { inside, pos, third, ui, paused = false }) {
  fishing.third = !!third;
  if (inside && !fishing.decor) fishing.decor = buildDecor(fishing.scene);
  syncRodModels(fishing);
  const d = fishing.dom;
  // 🌽 HUD：喺 Halloween 世界就見到
  const panelOpen = !($('panel')?.hidden ?? true);
  d.hud.hidden = !inside || panelOpen;
  if (inside) {
    const text = `🌽 Candy Corn: ${short(state.candyCorn || 0)} · 🎣 ${currentRod().name}`;
    if (d.hud.textContent !== text) d.hud.textContent = text;
    if ((state.candyCorn || 0) > fishing.lastCandy) {
      d.hud.classList.remove('bump');
      void d.hud.offsetWidth;
      d.hud.classList.add('bump');
    }
  }
  fishing.lastCandy = state.candyCorn || 0;

  // 拎住竿：喺釣魚湖附近或者釣緊魚先拎出嚟（唔好成個 Halloween 世界都遮住畫面）
  const showRod = inside && (fishing.phase !== 'idle' || (pos.x >= LAKE.minX && pos.x <= LAKE.maxX + 3 && pos.z >= LAKE.minZ && pos.z <= LAKE.maxZ));
  if (fishing.handRod) fishing.handRod.visible = showRod && !third;
  if (fishing.avatarRod) fishing.avatarRod.visible = showRod;
  const rods = [fishing.handRod?.userData.rod, fishing.avatarRod?.userData.rod].filter(Boolean);
  for (const r of rods) {
    if (r.userData.ring) r.userData.ring.rotation.x = time * 2;
    r.userData.sparks?.forEach((s, i) => {
      const a = time * 3 + i * 1.26;
      s.position.set(Math.cos(a) * 0.22, -0.1 + Math.sin(time * 4 + i) * 0.15, Math.sin(a) * 0.22);
    });
  }
  // 湖嘅小動畫
  if (fishing.decor && inside) {
    const dc = fishing.decor;
    dc.arm.rotation.z = Math.sin(time * 2.2) * 0.5 + 0.6; // 骷髏 Sam 揮手
    dc.jaw.position.y = 1.86 - Math.max(0, Math.sin(time * 6)) * 0.05;
    for (const f of dc.fish) {
      const a = time * f.s + f.p;
      f.f.position.set(f.cx + Math.cos(a) * f.r, -0.25, f.cz + Math.sin(a) * f.r);
      f.f.rotation.z = -a - Math.PI / 2;
    }
    dc.lanterns.forEach((l, i) => (l.material.emissiveIntensity = 1.6 + Math.sin(time * 5 + i * 2) * 0.4));
    dc.mist.forEach((m, i) => (m.position.y = 0.8 + Math.sin(time * 0.4 + i) * 0.2));
    dc.beamMat.opacity = 0.16 + Math.sin(time * 2) * 0.05;
  }
  fishing.splash.update(paused ? 0 : dt);
  fishing.rings.update(paused ? 0 : dt);

  // 離開岸邊／出咗 Halloween 世界：收線
  const active = fishing.phase !== 'idle' && fishing.phase !== 'catch';
  if (active && (!inside || Math.hypot(pos.x - fishing.castFrom.x, pos.z - fishing.castFrom.z) > 4)) {
    cancel(fishing, ui, inside ? '🎣 You walked away, so you reeled your line in.' : null);
  }
  if (paused) dt = 0;
  fishing.cool = Math.max(0, fishing.cool - dt);
  fishing.kick = Math.max(0, fishing.kick - dt * 6);

  const arm = fishing.avatar.arms[0];
  let armX = showRod ? 0.9 : null; // 拎住竿：手向前
  let swing = 0; // 第一身：成支竿向後（正數）／向前（負數）
  let bend = 0;
  let shake = 0;
  fishing.t += dt;
  const bob = fishing.bob;
  const tipNow = () => rodTip(fishing, third);
  let fly = null; // 拋緊：浮標飛到幾成（0–1）

  if (fishing.phase === 'power') {
    // ⚡ 力度條上上落落；竿慢慢向後拉
    const p = tri(fishing.t / (FISHING_POWER_PERIOD / 2));
    fishing.power = p;
    swing = 0.05 + p * 0.3;
    bend = -0.08 * p;
    armX = 0.9 - p * 1.4;
  } else if (fishing.phase === 'cast') {
    // 向後拉 → 向前一揮 → 浮標一條弧線飛出去
    const WIND = 0.18;
    const flight = 0.55 + fishing.target.distanceTo(new THREE.Vector3(pos.x, WATER_Y, pos.z)) * 0.045;
    const t = fishing.t;
    if (t < WIND) {
      const k = t / WIND;
      swing = 0.35 + k * 0.1;
      bend = -0.25 * k;
      armX = -0.5 - k * 0.3;
      bob.visible = false;
    } else {
      const k = Math.min(1, (t - WIND) / flight);
      const s = Math.min(1, (t - WIND) / 0.16); // 一揮好快
      swing = 0.45 - s * 0.8 + Math.max(0, k - 0.3) * 0.45; // 揮過頭，再返嚟
      bend = 0.45 * Math.sin(s * Math.PI) - 0.1 * Math.sin(k * Math.PI * 3) * (1 - k);
      armX = -0.8 + s * 2.3 - k * 0.5;
      fly = k; // 浮標飛：等擺好竿先計（竿頭要用今格嘅位）
    }
  } else if (fishing.phase === 'wait') {
    // 浮標輕輕浮下浮下；有時魚仔試吓咬（細細下一沉）
    fishing.nibbleIn -= dt;
    if (fishing.nibbleIn <= 0) {
      fishing.nibble = 0.35;
      fishing.nibbleIn = 1.2 + Math.random() * 2.5;
      fishing.rings.spawn(fishing.target, 1.2, 0.8, 0.45);
      ui.play('blip');
    }
    fishing.nibble = Math.max(0, fishing.nibble - dt);
    const dip = Math.sin((fishing.nibble / 0.35) * Math.PI) * 0.09;
    bob.position.set(fishing.target.x, WATER_Y + Math.sin(time * 2.5) * 0.035 - dip, fishing.target.z);
    fishing.bobBody.rotation.set(Math.sin(time * 1.7) * 0.12, 0, Math.cos(time * 1.3) * 0.12);
    bend = 0.08 + dip * 0.6;
    fishing.ringIn -= dt;
    if (fishing.ringIn <= 0) {
      fishing.ringIn = 1.6;
      fishing.rings.spawn(fishing.target, 1.6, 1.6, 0.25);
    }
    fishing.waitLeft -= dt * (fishing.debugBite ? 20 : 1);
    if (fishing.waitLeft <= 0) {
      fishing.phase = 'bite';
      fishing.t = 0;
      ui.play('splash');
      fishing.splash.emit(fishing.target, 24, 2, 4);
      ui.popup(`❗ Something bit! ${pressWord()} NOW!`);
    }
  } else if (fishing.phase === 'bite') {
    // ❗ 浮標一沉一沉，水花四濺
    const dive = (Math.sin(time * 16) * 0.5 + 0.5) * 0.22;
    bob.position.set(fishing.target.x + Math.sin(time * 9) * 0.08, WATER_Y - 0.08 - dive, fishing.target.z);
    fishing.bobBody.rotation.set(Math.sin(time * 13) * 0.35, 0, Math.cos(time * 11) * 0.35);
    fishing.bang.visible = true;
    fishing.bang.position.set(fishing.target.x, 2.2 + Math.abs(Math.sin(time * 8)) * 0.25, fishing.target.z);
    fishing.bang.scale.copy(fishing.bang.userData.base).multiplyScalar(1 + Math.sin(time * 16) * 0.1);
    fishing.ringIn -= dt;
    if (fishing.ringIn <= 0) {
      fishing.ringIn = 0.25;
      fishing.rings.spawn(fishing.target, 2.6, 0.7, 0.7);
      fishing.splash.emit(bob.position, 6, 1.2, 3);
    }
    armX = 0.9 + Math.sin(time * 18) * 0.08;
    bend = 0.35 + Math.sin(time * 16) * 0.15;
    shake = 0.015;
    if (fishing.t > FISHING_BITE_WINDOW * (fishing.debugBite ? 10 : 1)) cancel(fishing, ui, `💨 It got away! ${pressWord()} faster when you see the ❗`);
  } else if (fishing.phase === 'reel') {
    // 🎣 狂撳收線：條會跌返落嚟，魚仔間中扯一扯
    fishing.progress -= FISHING_REEL.drain * dt;
    fishing.tugIn -= dt;
    if (fishing.tugIn <= 0) {
      fishing.tugIn = 1.1 + Math.random() * 1.4;
      fishing.progress -= FISHING_REEL.tug * fishing.weight;
      fishing.splash.emit(bob.position, 14, 2, 3.5);
      fishing.kick = -1;
    }
    const pr = Math.max(0, fishing.progress);
    // 浮標俾你拉近岸邊，魚仔左右走
    const toward = new THREE.Vector3(fishing.castFrom.x, WATER_Y, fishing.castFrom.z).sub(fishing.target);
    const side = new THREE.Vector3(-toward.z, 0, toward.x).normalize();
    const reach = Math.max(0, toward.length() - 2.5);
    toward.normalize();
    const zig = Math.sin(time * 3.1) * 1.4 * (1 - pr) + Math.sin(time * 7.3) * 0.25;
    bob.position.copy(fishing.target).addScaledVector(toward, reach * pr * 0.85).addScaledVector(side, zig);
    clampToWater(bob.position); // 唔好拉咗上岸／碼頭
    bob.position.y = WATER_Y - 0.12 + Math.sin(time * 14) * 0.05;
    fishing.bobBody.rotation.set(Math.sin(time * 10) * 0.4, 0, Math.cos(time * 9) * 0.4);
    fishing.ringIn -= dt;
    if (fishing.ringIn <= 0) {
      fishing.ringIn = 0.18;
      fishing.splash.emit(bob.position, 5, 1.6, 3);
      fishing.rings.spawn(bob.position, 1.4, 0.6, 0.5);
    }
    bend = 0.55 + 0.25 * fishing.weight + Math.max(0, fishing.kick) * 0.25 + Math.min(0, fishing.kick) * -0.35 + Math.sin(time * 30) * 0.04;
    swing = 0.38 + Math.max(0, fishing.kick) * 0.1; // 第一身：竿舉高（好似拉住條魚）
    shake = 0.012 + Math.max(0, fishing.kick) * 0.012;
    armX = 1.15 + Math.sin(time * 25) * 0.06 - Math.max(0, fishing.kick) * 0.2;
    if (fishing.progress >= 1) catchIt(fishing, ui);
    else if (fishing.progress <= 0) cancel(fishing, ui, `💨 It got away! Keep ${document.body.classList.contains('mobile') ? 'tapping USE' : 'pressing E (or clicking)'} FAST to reel it in!`);
  } else if (fishing.phase === 'catch') {
    // 獎品由水入面飛出嚟，一條弧線飛落你面前
    const k = Math.min(1, fishing.t / 1.15);
    armX = 0.9 + Math.sin(k * Math.PI) * 0.9;
    swing = 0.6 * Math.sin(k * Math.PI);
    const to = new THREE.Vector3(pos.x, pos.y - 0.3, pos.z);
    const e = ease(k);
    fishing.prize.position.lerpVectors(fishing.prizeFrom, to, e);
    fishing.prize.position.y += Math.sin(k * Math.PI) * 4.5;
    fishing.prize.rotation.y += dt * 8;
    fishing.prize.scale.multiplyScalar(k > 0.85 ? 1 - dt * 3 : 1);
    fishing.prize.userData.animate?.(time);
    if (k < 0.7 && Math.random() < 0.6) fishing.splash.emit(fishing.prize.position, 1, 0.6, 0.5); // 滴水
    if (k >= 1) finishCatch(fishing, ui);
  }

  // ---- 先擺好竿（第三身手臂、第一身竿、彎），之後先計竿頭位 → 條線一定由竿頭出（Issue #10）----
  // 以前：第三身手臂喺畫完條線之後先擺，條線用咗手臂垂低時嘅竿頭（updateThirdPerson 每格將手臂歸零），所以接唔到
  if (armX !== null && showRod) arm.rotation.set(armX, 0, -0.1); // 第三身：左手拎竿（Minecraft 式直手）
  // 第一身：成支竿嘅動作 + 彎
  if (fishing.handRod) {
    const h = fishing.handRod;
    h.rotation.x += (swing - h.rotation.x) * Math.min(1, dt * (fishing.phase === 'cast' ? 30 : 12));
    h.position.set(-0.42 + (Math.random() - 0.5) * shake, -0.5 + (Math.random() - 0.5) * shake, -0.7);
  }
  for (const r of rods) {
    r.userData.bendNow = (r.userData.bendNow ?? 0) + (bend - (r.userData.bendNow ?? 0)) * Math.min(1, dt * 14);
    bendRod(r, r.userData.bendNow * (r === fishing.handRod?.userData.rod ? 0.7 : 1));
  }

  // 浮標一條弧線飛出去（竿頭 → 高高嘅中間 → 落水位）
  if (fly !== null) {
    if (!bob.visible) {
      bob.visible = true;
      fishing.launch.copy(tipNow());
    }
    arcPoint(fishing.launch, fishing.target, fly, bob.position);
    fishing.bobBody.rotation.x += dt * 9; // 喺空中轉
    if (fly >= 1) {
      const to = fishing.target;
      fishing.phase = 'wait';
      fishing.t = 0;
      fishing.bobBody.rotation.set(0, 0, 0);
      fishing.splash.emit(to, 30, 2.2, 4.5);
      fishing.rings.spawn(to, 3.5, 1.3, 0.7);
      fishing.rings.spawn(to, 2, 0.9, 0.6);
      ui.play('plop');
    }
  }

  // 🎯 瞄準記號 + 虛線弧（撳緊力度條嗰陣）
  const aiming = fishing.phase === 'power';
  fishing.marker.visible = fishing.arc.visible = aiming;
  if (aiming) {
    const aim = aimPoint(fishing, pos, fishing.power);
    const m = fishing.marker;
    m.position.set(aim.point.x, WATER_Y + 0.05, aim.point.z);
    m.rotation.y = time * 1.5;
    m.scale.setScalar(1 + Math.sin(time * 6) * 0.06);
    fishing.markOuter.scale.setScalar(0.9 + ((time * 1.2) % 1) * 0.5);
    fishing.markMat.color.setHex(aim.ok ? (fishing.power >= 0.9 ? 0xffd740 : 0x18ffff) : 0xff9100); // 橙色 = 望住地／碼頭，幫你搵咗最近嘅水
    const from = tipNow();
    const ap = fishing.arcGeo.attributes.position;
    const tmp = new THREE.Vector3();
    const N = fishing.ARC_N;
    for (let i = 0; i < N; i++) {
      arcPoint(from, aim.point, (i + ((time * 1.5) % 1)) / N, tmp); // 一點點向前行
      ap.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
    ap.needsUpdate = true;
  }

  // 🎛️ 力度條、收線條（釣緊魚：收埋火車／Soul Dust 嗰兩粒，唔好遮住提示）
  document.body.classList.toggle('fishing', inside && fishing.phase !== 'idle');
  const showPower = fishing.phase === 'power';
  const showReel = fishing.phase === 'reel';
  $('fish-power').hidden = !showPower;
  $('fish-reel').hidden = !showReel;
  if (showPower) {
    d.ui.querySelector('.fp-needle').style.bottom = `${fishing.power * 100}%`;
    const why = fishing.aim.why === 'land' ? '🎯 Aim at the WATER!' : fishing.aim.why === 'far' ? '⚡ Stop the bar higher to throw farther' : `🎯 ${mobile() ? 'Drag to aim' : 'Look to aim'}`;
    d.ui.querySelector('.fp-hint').textContent = `${why} · ${pressWord()} to cast!`;
    d.ui.querySelector('.fp-track').classList.toggle('hot', fishing.power >= 0.9);
  }
  if (showReel) {
    const pr = Math.max(0, Math.min(1, fishing.progress));
    d.ui.querySelector('.fr-fill').style.width = `${pr * 100}%`;
    d.ui.querySelector('.fr-fish').style.left = `${pr * 100}%`;
    d.ui.querySelector('.fr-hint').textContent = document.body.classList.contains('mobile') ? 'TAP USE REALLY FAST!' : 'SPAM E or CLICK REALLY FAST!';
    d.ui.querySelector('#fish-reel').classList.toggle('kick', fishing.kick > 0.5);
    d.ui.querySelector('#fish-reel').classList.toggle('danger', pr < 0.2);
  }

  // 魚絲：真正畫係喺 scene.onBeforeRender（drawLine），咁就一定用到畫面嗰一刻嘅竿頭位
  fishing.line.visible = bob.visible && ['cast', 'wait', 'bite', 'reel'].includes(fishing.phase);
  fishing.time = time;
  if (fishing.line.visible) drawLine(fishing); // 呢度都畫一次（冇 render 嘅時候都啱）
  if (fishing.phase !== 'bite') fishing.bang.visible = false;
}

// 魚絲：竿頭 → 浮標天線頂，中間垂低（等緊魚：鬆啲；收線：拉直）
// Issue #10：條線一定要由「畫出嚟嗰支竿」嘅竿頭出：第一身 = 鏡頭前面嗰支（掛喺 camera），第三身 = 公仔手上嗰支
const _tip = new THREE.Vector3();
const _end = new THREE.Vector3();
const _mid = new THREE.Vector3();
function drawLine(fishing) {
  const tip = rodTip(fishing, fishing.third, _tip);
  const end = fishing.glowDot.getWorldPosition(_end); // 浮標天線頂
  const dist = tip.distanceTo(end);
  const ph = fishing.phase;
  const sag = ph === 'cast' ? 0.15 : ph === 'wait' ? 0.12 * dist : ph === 'bite' ? 0.05 * dist : 0.01 * dist;
  const mid = _mid.copy(tip).lerp(end, 0.5);
  mid.y -= sag * 2;
  const p = fishing.lineGeo.attributes.position;
  const N = fishing.LINE_N;
  const tremble = ph === 'reel' ? 0.02 : 0;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    let x = (1 - u) ** 2 * tip.x + 2 * (1 - u) * u * mid.x + u * u * end.x;
    let y = (1 - u) ** 2 * tip.y + 2 * (1 - u) * u * mid.y + u * u * end.y;
    const z = (1 - u) ** 2 * tip.z + 2 * (1 - u) * u * mid.z + u * u * end.z;
    if (i > 0) y = Math.max(y, WATER_Y + 0.02); // 第一點一定係竿頭
    x += Math.sin(u * Math.PI) * Math.sin(fishing.time * 60 + u * 10) * tremble;
    p.setXYZ(i, x, y, z);
  }
  p.needsUpdate = true;
}

// 二次貝茲弧：from → 高高嘅中間 → to（拋竿同瞄準虛線用同一條）
function arcPoint(from, to, u, out) {
  const dist = Math.hypot(to.x - from.x, to.z - from.z);
  const cx = (from.x + to.x) / 2;
  const cy = Math.max(from.y, to.y) + 1.5 + dist * 0.35;
  const cz = (from.z + to.z) / 2;
  const a = (1 - u) ** 2, b = 2 * (1 - u) * u, c = u * u;
  return out.set(a * from.x + b * cx + c * to.x, a * from.y + b * cy + c * to.y, a * from.z + b * cz + c * to.z);
}

function rodTip(fishing, third, out = new THREE.Vector3()) {
  const holder = third ? fishing.avatarRod : fishing.handRod;
  const r = holder?.userData.rod;
  if (!r) return out.copy(fishing.camera.position);
  return r.userData.tip.getWorldPosition(out); // getWorldPosition 會由上到下更新晒（手臂、彎竿都計埋）
}

// 返普通世界：收線（魚竿會留低，Issue #8 #9：唔再斷）
export function stopFishing(fishing) {
  if (!fishing) return;
  if (fishing.prize) {
    fishing.prize.removeFromParent();
    fishing.prize = null;
  }
  cancel(fishing, null);
}

// 升級魚竿（魚竿舖面板）：用 🌽 Candy Corn
export function buyRod(i, ui) {
  const rod = RODS[i];
  if (!rod || i <= rodIndex() || (state.candyCorn || 0) < rod.price) return false;
  state.candyCorn -= rod.price;
  state.rod = i;
  ui.save();
  ui.play('upgrade');
  ui.popup(`🎣 You upgraded to the ${rod.name}! Go to the dock and press E to fish.`);
  return true;
}

export { FISH_SPOT };
