// 皮膚：護林員皮膚（改你個公仔）同寵物皮膚（改晒你啲寵物），用 Skin Tokens 喺皮膚商店買
// （以前有「擴建 Hub」：2026-10-15 小朋友話唔使買，Hub 本身已經好大，噴水池、石像、遊樂場全部免費有）

import * as THREE from 'three';

export const RANGER_SKINS = [
  { id: 'ranger', name: 'Classic Ranger', cost: 0, shirt: 0x2e7d32, pants: 0x5d4037, skin: 0xf5c99b, hat: 0x33691e, shoes: 0x3e2723 },
  { id: 'ninja', name: 'Ninja', cost: 8, shirt: 0x212121, pants: 0x212121, skin: 0xf5c99b, hat: 0x212121, shoes: 0x111111, extra: 'ninja' },
  { id: 'panda', name: 'Panda Suit', cost: 12, shirt: 0xf5f5f0, pants: 0x1d1d1d, skin: 0xf5f5f0, hat: 0xf5f5f0, shoes: 0x1d1d1d, extra: 'panda' },
  { id: 'astronaut', name: 'Astronaut', cost: 18, shirt: 0xeceff1, pants: 0xeceff1, skin: 0xf5c99b, hat: 0xeceff1, shoes: 0x90a4ae, extra: 'astronaut' },
  { id: 'knight', name: 'Knight', cost: 24, shirt: 0xb0bec5, pants: 0x78909c, skin: 0xb0bec5, hat: 0xb0bec5, shoes: 0x546e7a, metal: true, extra: 'knight' },
  { id: 'golden', name: 'Golden Hero', cost: 35, shirt: 0xffc107, pants: 0xffa000, skin: 0xffd54f, hat: 0xffc107, shoes: 0xff8f00, metal: true, extra: 'crown' },
  { id: 'rainbow', name: 'Rainbow Legend', cost: 50, shirt: 0xff1744, pants: 0x2979ff, skin: 0xf5c99b, hat: 0xffea00, shoes: 0x00e676, rainbow: true, extra: 'wings' },
  // 小朋友 2026-10-17：再多啲皮膚
  { id: 'pirate', name: 'Pirate Captain', cost: 60, shirt: 0xfafafa, pants: 0x3e2723, skin: 0xf5c99b, hat: 0x212121, shoes: 0x212121, extra: 'pirate' },
  { id: 'wizard', name: 'Wizard', cost: 75, shirt: 0x4a148c, pants: 0x311b92, skin: 0xf5c99b, hat: 0x6a1b9a, shoes: 0x1a0033, extra: 'wizard' },
  { id: 'cyber', name: 'Cyber Ninja', cost: 90, shirt: 0x263238, pants: 0x1c262b, skin: 0xf5c99b, hat: 0x263238, shoes: 0x00e5ff, extra: 'cyber' },
  { id: 'dragon', name: 'Dragon Rider', cost: 110, shirt: 0x8e0000, pants: 0x3e2723, skin: 0xf5c99b, hat: 0xb71c1c, shoes: 0x4e0000, extra: 'dragon' },
  { id: 'king', name: 'Royal King', cost: 130, shirt: 0x6a1b9a, pants: 0x4a148c, skin: 0xf5c99b, hat: 0xffd600, shoes: 0x212121, extra: 'king' },
  { id: 'ice', name: 'Ice Guardian', cost: 150, shirt: 0x81d4fa, pants: 0x4fc3f7, skin: 0xe1f5fe, hat: 0xb3e5fc, shoes: 0x0288d1, metal: true, extra: 'ice' },
  { id: 'lava', name: 'Lava Knight', cost: 170, shirt: 0x212121, pants: 0x3e2723, skin: 0x424242, hat: 0x212121, shoes: 0xbf360c, metal: true, extra: 'lava' },
  { id: 'galaxy', name: 'Galaxy Explorer', cost: 200, shirt: 0x1a237e, pants: 0x0d1452, skin: 0xf5c99b, hat: 0x311b92, shoes: 0x7c4dff, extra: 'galaxy' },
];

export const PET_SKINS = [
  { id: 'none', name: 'Natural', cost: 0 },
  { id: 'shadow', name: 'Shadow', cost: 10 },
  { id: 'golden', name: 'Golden', cost: 20 },
  { id: 'neon', name: 'Neon', cost: 25 },
  { id: 'galaxy', name: 'Galaxy', cost: 40 },
  { id: 'rainbow', name: 'Rainbow', cost: 60 },
  // 小朋友 2026-10-17（Issue #3）：皮膚要型啲 → 每款都有特效，再加 4 款
  { id: 'lava', name: 'Lava', cost: 75 },
  { id: 'frost', name: 'Frost', cost: 90 },
  { id: 'electric', name: 'Electric', cost: 120 },
  { id: 'diamond', name: 'Diamond', cost: 150 },
];

// 舊存檔買過擴建：退返代幣（15 + 30 + 50）
export const OLD_HUB_EXPANSION_COSTS = [15, 30, 50];

// ---------- 寵物皮膚：換晒隻寵物嘅物料 ----------
let starTex = null;
function galaxyTexture() {
  if (starTex) return starTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 128, 128);
  g.addColorStop(0, '#1a0640');
  g.addColorStop(1, '#0b2a6b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = ['#fff', '#e1bee7', '#80d8ff'][i % 3];
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5);
  }
  starTex = new THREE.CanvasTexture(c);
  starTex.colorSpace = THREE.SRGBColorSpace;
  return starTex;
}

const shared = {};
export const rainbowPetMat = () => (shared.rainbow ??= new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.4, roughness: 0.3 }));

// 熔岩紋理：黑色石頭 + 發光橙色裂縫
let lavaTex = null;
function lavaTexture() {
  if (lavaTex) return lavaTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#fff';
  for (let i = 0; i < 14; i++) {
    ctx.lineWidth = 2 + Math.random() * 3;
    ctx.beginPath();
    let x = Math.random() * 128;
    let y = Math.random() * 128;
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (Math.random() - 0.5) * 50;
      y += (Math.random() - 0.5) * 50;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  lavaTex = new THREE.CanvasTexture(c);
  lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
  return lavaTex;
}

// 每款皮膚嘅物料（同一款皮膚嘅寵物共用一份，咁先一齊閃）
function skinMaterial(skinId, base) {
  switch (skinId) {
    case 'golden': return (shared.golden ??= new THREE.MeshStandardMaterial({ color: 0xffc107, metalness: 0.95, roughness: 0.2, emissive: 0x6d4c00, emissiveIntensity: 0.3 }));
    case 'shadow': return (shared.shadow ??= new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.4, emissive: 0x4527a0, emissiveIntensity: 0.35 }));
    case 'galaxy': return (shared.galaxy ??= new THREE.MeshStandardMaterial({ map: galaxyTexture(), emissive: 0xffffff, emissiveMap: galaxyTexture(), emissiveIntensity: 0.6 }));
    case 'rainbow': return rainbowPetMat();
    case 'lava': return (shared.lava ??= new THREE.MeshStandardMaterial({ color: 0x2b1a14, roughness: 0.8, emissive: 0xff5722, emissiveMap: lavaTexture(), emissiveIntensity: 2 }));
    case 'frost': return (shared.frost ??= new THREE.MeshStandardMaterial({ color: 0xb3e5fc, roughness: 0.1, metalness: 0.3, emissive: 0x4fc3f7, emissiveIntensity: 0.35, transparent: true, opacity: 0.85 }));
    case 'electric': return (shared.electric ??= new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.3, metalness: 0.5, emissive: 0x00b0ff, emissiveIntensity: 1.2 }));
    case 'diamond': return (shared.diamond ??= new THREE.MeshPhysicalMaterial({ color: 0xe0f7fa, roughness: 0.05, metalness: 0.1, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.8, emissive: 0x80deea, emissiveIntensity: 0.25 }));
    case 'neon': {
      const m = base.clone();
      m.emissive = base.color.clone();
      m.emissiveIntensity = 0.9;
      (shared.neonList ??= []).push(m);
      return m;
    }
    default: return base;
  }
}

// ---------- 皮膚特效：喺寵物身邊飄嘅粒子 ----------
// 每款：顏色、粒子數目、點樣郁（rise 升、fall 落、orbit 圍住轉、spark 閃）
const EFFECTS = {
  shadow: { color: 0x7c4dff, n: 18, move: 'rise', size: 0.12, opacity: 0.7 },
  golden: { color: 0xfff59d, n: 16, move: 'spark', size: 0.1 },
  neon: { color: 0xff4081, n: 10, move: 'orbit', size: 0.12 },
  galaxy: { color: 0xe1bee7, n: 22, move: 'orbit', size: 0.08 },
  rainbow: { color: 0xffffff, n: 14, move: 'orbit', size: 0.14, rainbow: true },
  lava: { color: 0xff9100, n: 20, move: 'rise', size: 0.12 },
  frost: { color: 0xffffff, n: 22, move: 'fall', size: 0.1 },
  electric: { color: 0x80d8ff, n: 16, move: 'spark', size: 0.14 },
  diamond: { color: 0xffffff, n: 18, move: 'spark', size: 0.12 },
};
const effects = new Set(); // 而家喺場嘅特效（animateSkins 每格郁）
function addEffect(model, skinId) {
  const fx = EFFECTS[skinId];
  if (!fx) return;
  const box = new THREE.Box3().setFromObject(model);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const pos = new Float32Array(fx.n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: fx.color, size: fx.size * Math.max(1, Math.max(size.x, size.y, size.z) / 1.5), transparent: true, opacity: fx.opacity ?? 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, m);
  points.frustumCulled = false;
  model.add(points);
  const seeds = Array.from({ length: fx.n }, (_, i) => ({ a: Math.random() * Math.PI * 2, k: Math.random(), h: Math.random(), i }));
  effects.add({ points, geo, pos, seeds, fx, size, center, m });
}
// 寵物仲喺唔喺場景入面（拎走咗就唔再郁佢嘅特效）
const onStage = (o) => {
  while (o.parent) o = o.parent;
  return o.isScene;
};

export function applyPetSkin(model, skinId) {
  if (!skinId || skinId === 'none') return;
  model.traverse((o) => {
    if (!o.isMesh || !o.material || o.material.isMeshBasicMaterial) return;
    o.material = skinMaterial(skinId, o.material);
  });
  addEffect(model, skinId);
}

// 每格畫面：彩虹轉色、熔岩一閃一閃、電光閃、銀河星星郁，同埋所有特效粒子
export function animateSkins(time) {
  if (shared.rainbow) {
    shared.rainbow.color.setHSL((time * 0.2) % 1, 1, 0.55);
    shared.rainbow.emissive.setHSL((time * 0.2) % 1, 1, 0.3);
  }
  if (shared.lava) {
    shared.lava.emissiveIntensity = 1.6 + Math.sin(time * 3) * 0.6;
    lavaTex.offset.y = time * 0.05;
  }
  if (shared.electric) shared.electric.emissiveIntensity = Math.random() < 0.12 ? 3 : 1 + Math.sin(time * 20) * 0.2;
  if (shared.galaxy) starTex.offset.x = time * 0.03;
  if (shared.frost) shared.frost.emissiveIntensity = 0.3 + Math.sin(time * 2) * 0.15;
  if (shared.neonList) for (const m of shared.neonList) m.emissiveIntensity = 0.8 + Math.sin(time * 4) * 0.4;
  for (const e of effects) {
    if (!e.points.parent || !onStage(e.points)) {
      if (!e.points.parent) effects.delete(e);
      continue;
    }
    const { pos, seeds, fx, size, center } = e;
    const rx = size.x * 0.6 + 0.2;
    const rz = size.z * 0.6 + 0.2;
    for (const sd of seeds) {
      let x;
      let y;
      let z;
      if (fx.move === 'orbit') {
        const a = sd.a + time * (0.8 + sd.k);
        x = center.x + Math.cos(a) * rx;
        z = center.z + Math.sin(a) * rz;
        y = center.y + (sd.h - 0.5) * size.y + Math.sin(time * 2 + sd.i) * 0.1;
      } else if (fx.move === 'rise' || fx.move === 'fall') {
        const k = (sd.k + time * 0.35) % 1;
        x = center.x + Math.cos(sd.a) * rx * sd.h;
        z = center.z + Math.sin(sd.a) * rz * sd.h;
        y = fx.move === 'rise' ? center.y - size.y / 2 + k * size.y * 1.4 : center.y + size.y * 0.8 - k * size.y * 1.3;
      } else {
        // spark：喺身邊隨機位閃一下
        const k = (sd.k + time * 0.8) % 1;
        if (k < 0.02) sd.a = Math.random() * Math.PI * 2;
        x = center.x + Math.cos(sd.a) * rx * (0.5 + sd.h * 0.5);
        z = center.z + Math.sin(sd.a) * rz * (0.5 + sd.h * 0.5);
        y = center.y + (sd.h - 0.5) * size.y * 1.1 + (fx === EFFECTS.electric ? (Math.random() - 0.5) * 0.1 : 0);
        if (Math.sin(k * Math.PI) < 0.3) y = -9999; // 熄咗
      }
      pos[sd.i * 3] = x;
      pos[sd.i * 3 + 1] = y;
      pos[sd.i * 3 + 2] = z;
    }
    e.geo.attributes.position.needsUpdate = true;
    if (fx.rainbow) e.m.color.setHSL((time * 0.3) % 1, 1, 0.6);
  }
}
