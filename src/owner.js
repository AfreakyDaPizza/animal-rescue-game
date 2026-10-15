// 動物公園嘅 Owner（開場動畫主角，平時瞓喺 Hub 嘅吊床）：Roblox 款公仔，著夏威夷恤、戴太陽帽
// 回傳嘅骨架同 Boss 一樣（root/legs/arms/head/torso），可以用 animateRig 行路

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const materials = new Map();
function mat(color, extra) {
  const key = color + JSON.stringify(extra || {});
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }));
  return materials.get(key);
}
function box(parent, w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.15), color.isMaterial ? color : mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function pivot(parent, x, y, z) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  parent.add(p);
  return p;
}

// 夏威夷恤紋理（藍底 + 花）
let shirtTex = null;
function shirtMaterial() {
  if (!shirtTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1e88e5';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = ['#ffeb3b', '#ff4081', '#ffffff'][i % 3];
      const x = (i * 23) % 64;
      const y = (i * 37) % 64;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    shirtTex = new THREE.CanvasTexture(c);
    shirtTex.colorSpace = THREE.SRGBColorSpace;
    shirtTex.magFilter = THREE.NearestFilter;
  }
  return new THREE.MeshStandardMaterial({ map: shirtTex, roughness: 0.6 });
}

export function buildOwner() {
  const skin = 0xf1c27d;
  const g = new THREE.Group();
  const root = pivot(g, 0, 0, 0);
  const shirt = shirtMaterial();
  const legs = [-1, 1].map((s) => {
    const hip = pivot(root, s * 0.27, 1.2, 0);
    box(hip, 0.5, 0.55, 0.5, 0xffb74d, 0, -0.27, 0); // 短褲
    box(hip, 0.42, 0.5, 0.42, skin, 0, -0.78, 0);
    box(hip, 0.48, 0.18, 0.6, 0x5d4037, 0, -1.1, -0.05); // 拖鞋
    return hip;
  });
  const torso = box(root, 1.1, 1.15, 0.6, shirt, 0, 1.78, 0);
  box(root, 1.12, 0.2, 0.62, 0x5d4037, 0, 1.25, 0); // 皮帶
  const arms = [-1, 1].map((s) => {
    const shoulder = pivot(root, s * 0.8, 2.25, 0);
    box(shoulder, 0.46, 0.5, 0.46, shirt, 0, -0.2, 0);
    box(shoulder, 0.4, 0.6, 0.4, skin, 0, -0.72, 0);
    return shoulder;
  });
  const head = pivot(root, 0, 2.72, 0);
  box(head, 0.8, 0.8, 0.8, skin, 0, 0, 0);
  // 開心樣：眼、笑口、鬚
  for (const s of [-1, 1]) box(head, 0.12, 0.14, 0.04, 0x212121, s * 0.17, 0.08, -0.41);
  box(head, 0.36, 0.08, 0.04, 0x6d4c41, 0, -0.1, -0.41); // 鬚
  const mouth = box(head, 0.22, 0.06, 0.04, 0xc62828, 0, -0.22, -0.41);
  // 太陽帽
  box(head, 1.25, 0.06, 1.25, 0xfff59d, 0, 0.42, 0);
  box(head, 0.82, 0.3, 0.82, 0xfff59d, 0, 0.58, 0);
  box(head, 0.84, 0.1, 0.84, 0xe53935, 0, 0.48, 0);
  // 「!」（見到 Boss 嗰陣先出）
  const alert = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 1.5 });
  box(alert, 0.22, 0.7, 0.22, red, 0, 0.45, 0);
  box(alert, 0.24, 0.24, 0.24, red, 0, -0.1, 0);
  alert.position.y = 1.5;
  alert.visible = false;
  head.add(alert);
  // 手機（打電話嗰陣先出）
  const phone = box(arms[1], 0.28, 0.48, 0.06, 0x212121, 0, -1.05, -0.2);
  phone.visible = false;
  return { g, root, legs, arms, head, torso, alert, phone, mouth };
}
