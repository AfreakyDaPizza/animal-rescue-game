// 皮膚：護林員皮膚（改你個公仔）同寵物皮膚（改晒你啲寵物），用 Skin Tokens 喺皮膚商店買
// 擴建 Hub：用代幣令 Hub 大啲，每次多一個新區域

import * as THREE from 'three';

export const RANGER_SKINS = [
  { id: 'ranger', name: 'Classic Ranger', cost: 0, shirt: 0x2e7d32, pants: 0x5d4037, skin: 0xf5c99b, hat: 0x33691e, shoes: 0x3e2723 },
  { id: 'ninja', name: 'Ninja', cost: 8, shirt: 0x212121, pants: 0x212121, skin: 0xf5c99b, hat: 0x212121, shoes: 0x111111, extra: 'ninja' },
  { id: 'panda', name: 'Panda Suit', cost: 12, shirt: 0xf5f5f0, pants: 0x1d1d1d, skin: 0xf5f5f0, hat: 0xf5f5f0, shoes: 0x1d1d1d, extra: 'panda' },
  { id: 'astronaut', name: 'Astronaut', cost: 18, shirt: 0xeceff1, pants: 0xeceff1, skin: 0xf5c99b, hat: 0xeceff1, shoes: 0x90a4ae, extra: 'astronaut' },
  { id: 'knight', name: 'Knight', cost: 24, shirt: 0xb0bec5, pants: 0x78909c, skin: 0xb0bec5, hat: 0xb0bec5, shoes: 0x546e7a, metal: true, extra: 'knight' },
  { id: 'golden', name: 'Golden Hero', cost: 35, shirt: 0xffc107, pants: 0xffa000, skin: 0xffd54f, hat: 0xffc107, shoes: 0xff8f00, metal: true, extra: 'crown' },
  { id: 'rainbow', name: 'Rainbow Legend', cost: 50, shirt: 0xff1744, pants: 0x2979ff, skin: 0xf5c99b, hat: 0xffea00, shoes: 0x00e676, rainbow: true, extra: 'wings' },
];

export const PET_SKINS = [
  { id: 'none', name: 'Natural', cost: 0 },
  { id: 'shadow', name: 'Shadow', cost: 10 },
  { id: 'golden', name: 'Golden', cost: 20 },
  { id: 'neon', name: 'Neon', cost: 25 },
  { id: 'galaxy', name: 'Galaxy', cost: 40 },
  { id: 'rainbow', name: 'Rainbow', cost: 60 },
];

export const HUB_EXPANSIONS = [
  { name: 'Fountain Garden', cost: 15 },
  { name: 'Statue Park', cost: 30 },
  { name: 'Pet Playground', cost: 50 },
];

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

export function applyPetSkin(model, skinId) {
  if (!skinId || skinId === 'none') return;
  model.traverse((o) => {
    if (!o.isMesh || !o.material || o.material.isMeshBasicMaterial) return;
    const base = o.material;
    if (skinId === 'golden') o.material = (shared.golden ??= new THREE.MeshStandardMaterial({ color: 0xffc107, metalness: 0.95, roughness: 0.2, emissive: 0x6d4c00, emissiveIntensity: 0.3 }));
    else if (skinId === 'shadow') o.material = (shared.shadow ??= new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.4, emissive: 0x311b92, emissiveIntensity: 0.25 }));
    else if (skinId === 'galaxy') o.material = (shared.galaxy ??= new THREE.MeshStandardMaterial({ map: galaxyTexture(), emissive: 0xffffff, emissiveMap: galaxyTexture(), emissiveIntensity: 0.5 }));
    else if (skinId === 'rainbow') o.material = rainbowPetMat();
    else if (skinId === 'neon') {
      o.material = base.clone();
      o.material.emissive = base.color.clone();
      o.material.emissiveIntensity = 0.9;
    }
  });
}

// 每格畫面：彩虹寵物轉色
export function animateSkins(time) {
  if (shared.rainbow) {
    shared.rainbow.color.setHSL((time * 0.2) % 1, 1, 0.55);
    shared.rainbow.emissive.setHSL((time * 0.2) % 1, 1, 0.3);
  }
}
