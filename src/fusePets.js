// Fuse Machine 先有嘅 5 隻特別寵物（小朋友 2026-10-17 Issue #4）：
// Rhinoblade（Common）、Spideron（Rare）、Dunkleosteus（Epic）、Puffaball（Legendary）、Endangered Combination（Mythic）
// 方塊風格，同其他動物一樣面向 -z；userData.animate(time, moving)、userData.height、userData.move

import * as THREE from 'three';
import { box, pivot, cuteEyes, spike, WHITE } from './modelKit.js';
import { beast, swimmer } from './animals20.js';

const PI = Math.PI;
const glow = (c, k = 2) => ({ emissive: c, emissiveIntensity: k });

// ---- Rhinoblade：犀牛 + 刀角 + 鐵甲 ----
function rhinoblade() {
  const skin = 0x6d6a75;
  const steel = 0xcfd8dc;
  return beast({
    body: { w: 1.45, h: 1.2, d: 2.1, y: 1.35, color: skin },
    head: { w: 0.8, h: 0.72, d: 1.05, y: 1.28, z: -1.5, color: skin },
    legs: { w: 0.46, h: 0.84, x: 0.42, zf: -0.6, zb: 0.6, color: skin, paw: 0x37474f, toes: steel },
    tail: { w: 0.08, h: 0.08, d: 0.45, y: 1.6, color: skin, angle: 0.9, tip: 0x263238 },
    eyeSize: 0.11,
    eyeOpts: { iris: 0xff1744 },
    walkSpeed: 7,
    extras(p) {
      p.head.rotation.x = 0.22;
      // 兩把刀角（銀色、發藍光）
      const blade = box(p.head, 0.08, 1.1, 0.34, steel, 0, 0.75, -0.42, 0.15, { metalness: 0.9, roughness: 0.2, ...glow(0x40c4ff, 0.6) });
      blade.rotation.x = -0.45;
      const blade2 = box(p.head, 0.06, 0.55, 0.24, steel, 0, 0.55, -0.02, 0.15, { metalness: 0.9, roughness: 0.2, ...glow(0x40c4ff, 0.6) });
      blade2.rotation.x = -0.25;
      // 鐵甲：背脊幾塊 + 膊頭
      for (let i = 0; i < 4; i++) box(p.root, 1.2 - i * 0.08, 0.16, 0.42, 0x90a4ae, 0, 1.98, -0.7 + i * 0.48, 0.25, { metalness: 0.8, roughness: 0.3 });
      for (let i = 0; i < 4; i++) spike(p.root, 0.1, 0.36, steel, 0, 2.18, -0.7 + i * 0.48);
      for (const s of [-1, 1]) {
        box(p.root, 0.12, 0.7, 0.9, 0x90a4ae, s * 0.75, 1.45, -0.55, 0.25, { metalness: 0.8, roughness: 0.3 });
        const ear = pivot(p.head, s * 0.3, 0.38, 0.38);
        box(ear, 0.14, 0.3, 0.1, skin, 0, 0.12, 0, 0.45);
        p.ears.push(ear);
      }
      box(p.head, 0.84, 0.12, 0.6, 0x90a4ae, 0, 0.36, 0.1, 0.25, { metalness: 0.8, roughness: 0.3 }); // 頭盔
    },
  });
}

// ---- Spideron：大蜘蛛（八隻腳、好多隻眼、背上有發光花紋）----
function spideron() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 0.9, 0);
  const shell = 0x311b92;
  const fur = 0x4527a0;
  box(root, 1.5, 1.0, 1.7, shell, 0, 0.25, 0.75, 0.4); // 大肚
  for (const [x, z] of [[0, 0.4], [-0.35, 0.85], [0.35, 0.85], [0, 1.3]]) box(root, 0.3, 0.04, 0.3, 0x00e5ff, x, 0.77, z, 0.4, glow(0x00e5ff, 2)); // 背上發光花紋
  box(root, 1.0, 0.75, 0.9, fur, 0, 0.1, -0.35, 0.38); // 頭胸
  const head = pivot(root, 0, 0.15, -0.8);
  cuteEyes(head, 0.18, 0.12, 0, 0.16, { iris: 0xd500f9 });
  for (const s of [-1, 1]) for (const y of [0.32, -0.08]) box(head, 0.08, 0.08, 0.04, 0xea80fc, s * 0.36, y, -0.01, 0.4, glow(0xea80fc, 2)); // 細眼
  for (const s of [-1, 1]) {
    const fang = box(head, 0.1, 0.28, 0.1, WHITE, s * 0.12, -0.32, -0.02, 0.3);
    fang.rotation.x = 0.2;
  }
  const legs = [];
  for (let i = 0; i < 4; i++) {
    for (const s of [-1, 1]) {
      const hip = pivot(root, s * 0.45, 0.1, -0.65 + i * 0.32);
      hip.rotation.y = s * (0.5 - i * 0.33);
      const upper = box(hip, 0.9, 0.14, 0.14, fur, s * 0.45, 0.25, 0, 0.3);
      upper.rotation.z = s * 0.55;
      const knee = pivot(hip, s * 0.85, 0.5, 0);
      box(knee, 0.12, 1.0, 0.12, shell, s * 0.12, -0.45, 0, 0.3).rotation.z = s * 0.25;
      box(knee, 0.14, 0.14, 0.14, 0x00e5ff, s * 0.26, -0.95, 0, 0.4, glow(0x00e5ff, 1.5)); // 腳尖
      legs.push({ hip, s, phase: i * 1.3 + (s > 0 ? PI : 0) });
    }
  }
  g.userData.animate = (t, moving) => {
    for (const l of legs) l.hip.rotation.x = Math.sin(t * 12 + l.phase) * 0.35 * moving;
    root.position.y = 0.9 + Math.abs(Math.sin(t * 12)) * 0.04 * moving + Math.sin(t * 2) * 0.03;
    head.rotation.y = Math.sin(t * 0.8) * 0.2;
  };
  g.userData.height = 1.95;
  g.userData.move = 'walk';
  return g;
}

// ---- Dunkleosteus：古代鐵甲魚（頭有骨甲、刀咁嘅牙）----
function dunkleosteus() {
  const armor = 0x5d4e37;
  return swimmer({
    skin: 0x546e7a, belly: 0xb0bec5, len: 4.2, w: 1.1, h: 1.0, whale: false, dorsal: 0.8, eyeSize: 0.001,
    extras({ root }) {
      // 頭甲：幾塊骨板
      box(root, 1.2, 1.1, 1.4, armor, 0, 0.05, -1.45, 0.25);
      for (const y of [0.35, -0.05]) box(root, 1.24, 0.08, 1.3, 0x3e3323, 0, y, -1.45, 0.2);
      box(root, 1.1, 0.25, 0.3, armor, 0, 0.5, -0.8, 0.25);
      // 張大口：刀咁嘅上下骨牙
      box(root, 1.0, 0.18, 0.12, 0x1b1b1b, 0, -0.18, -2.15, 0.2);
      for (const s of [-1, 1]) {
        spike(root, 0.12, 0.35, 0xfff8e1, s * 0.3, -0.05, -2.18, PI);
        spike(root, 0.1, 0.3, 0xfff8e1, s * 0.3, -0.32, -2.16, 0);
      }
      // 側面兇眼（發紅光）
      for (const s of [-1, 1]) {
        box(root, 0.04, 0.24, 0.24, 0xffffff, s * 0.62, 0.2, -1.75, 0.4);
        box(root, 0.05, 0.13, 0.13, 0xff1744, s * 0.64, 0.18, -1.75, 0.4, glow(0xff1744, 1.5));
      }
      for (let i = 0; i < 5; i++) box(root, 1.13, 0.03, 0.06, 0x455a64, 0, 0.1 - i * 0.1, -0.6 + i * 0.02, 0.2); // 鰓紋
    },
  });
}

// ---- Puffaball：圓碌碌河豚球（有刺、大眼、會脹會縮、浮喺半空）----
function puffaball() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 1.3, 0);
  const body = pivot(root);
  const yellow = 0xffd54f;
  box(body, 1.5, 1.4, 1.5, yellow, 0, 0, 0, 0.5);
  box(body, 1.2, 0.5, 1.2, 0xfff8e1, 0, -0.5, 0, 0.5); // 白肚
  for (let i = 0; i < 6; i++) box(body, 0.22, 0.04, 0.22, 0xff8f00, ((i % 3) - 1) * 0.42, 0.71, (Math.floor(i / 3) - 0.5) * 0.5, 0.4); // 背上斑點
  // 一圈圈嘅刺
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2 + r * 0.4;
      const y = (r - 1) * 0.45;
      const rr = r === 1 ? 0.78 : 0.62;
      const m = spike(body, 0.07, 0.3, 0xff6f00, Math.cos(a) * rr, y, Math.sin(a) * rr);
      m.lookAt(new THREE.Vector3(Math.cos(a) * 5, y * 5, Math.sin(a) * 5));
      m.rotateX(PI / 2);
    }
  }
  cuteEyes(body, 0.32, 0.18, -0.76, 0.26, { iris: 0x00b0ff });
  box(body, 0.3, 0.2, 0.06, 0xff8a80, 0, -0.18, -0.77, 0.45); // 嘟嘴
  const fins = [-1, 1].map((s) => {
    const p = pivot(body, s * 0.76, -0.05, 0.1);
    box(p, 0.06, 0.35, 0.4, 0xffb300, s * 0.04, 0, 0.1, 0.4);
    return { p, s };
  });
  const tail = pivot(body, 0, 0, 0.76);
  box(tail, 0.06, 0.5, 0.4, 0xffb300, 0, 0, 0.2, 0.4);
  g.userData.animate = (t, moving) => {
    const puff = 1 + Math.max(0, Math.sin(t * 0.7)) ** 6 * 0.25; // 間中脹大
    body.scale.setScalar(puff);
    root.position.y = 1.3 + Math.sin(t * 1.8) * 0.15;
    root.rotation.z = Math.sin(t * 1.2) * 0.08;
    fins.forEach(({ p, s }) => (p.rotation.y = s * Math.sin(t * 9) * 0.5));
    tail.rotation.y = Math.sin(t * 6 + moving) * 0.4;
  };
  g.userData.height = 2.1;
  g.userData.move = 'swim';
  return g;
}

// ---- Endangered Combination：熊貓頭 + 象鼻象耳 + 鷹翼 + 龜殼 + 老虎間紋，全身發光 ----
function endangeredCombination() {
  const tiger = 0xff8f00;
  const stripe = 0x212121;
  const g = beast({
    body: { w: 1.5, h: 1.25, d: 2.1, y: 1.45, color: tiger },
    head: { w: 1.1, h: 0.98, d: 0.92, y: 2.0, z: -1.35, color: WHITE },
    legs: { w: 0.46, h: 0.85, x: 0.45, zf: -0.62, zb: 0.62, color: tiger, paw: 0x1d1d1d, toes: WHITE },
    tail: { w: 0.16, h: 0.16, d: 1.1, y: 1.75, color: tiger, angle: 0.5, tip: stripe },
    eyes: false,
    extraHeight: 0.8,
    extras(p) {
      // 老虎間紋
      for (let i = 0; i < 5; i++) box(p.root, 1.54, 0.5, 0.1, stripe, 0, 1.55, -0.85 + i * 0.42, 0.2);
      // 龜殼（背上）
      box(p.root, 1.3, 0.35, 1.6, 0x5b7a3a, 0, 2.15, 0.15, 0.4);
      box(p.root, 1.0, 0.25, 1.25, 0x5b7a3a, 0, 2.38, 0.15, 0.45);
      for (let i = 0; i < 5; i++) box(p.root, 0.34, 0.05, 0.34, 0x8b9d52, i === 2 ? 0 : ((i % 2) - 0.5) * 0.5, 2.52, -0.3 + Math.floor(i / 2) * 0.42, 0.4);
      // 熊貓頭：黑耳、黑眼圈、大眼
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.42, 0.44, 0.05);
        box(ear, 0.32, 0.3, 0.2, 0x1d1d1d, 0, 0.08, 0, 0.45);
        p.ears.push(ear);
        box(p.head, 0.3, 0.36, 0.05, 0x1d1d1d, s * 0.24, 0.06, -0.47, 0.45).rotation.z = s * -0.35;
      }
      cuteEyes(p.head, 0.24, 0.07, -0.5, 0.13, { iris: 0x76ff03 });
      // 象耳 + 象鼻
      const ears = [-1, 1].map((s) => {
        const ear = pivot(p.head, s * 0.56, 0.05, 0.1);
        box(ear, 0.08, 0.9, 0.8, 0x9c968f, s * 0.05, -0.1, 0.32, 0.35);
        box(ear, 0.04, 0.65, 0.55, 0xd7a9a3, s * 0.02, -0.1, 0.34, 0.35);
        return { ear, s };
      });
      let parent = p.head;
      const trunk = [];
      [0.3, 0.25, 0.2].forEach((w, i) => {
        const seg = pivot(parent, 0, i === 0 ? -0.25 : -0.36, i === 0 ? -0.5 : 0);
        box(seg, w, 0.42, w, 0x9c968f, 0, -0.19, 0, 0.4);
        trunk.push(seg);
        parent = seg;
      });
      // 鷹翼（發光邊）
      const wings = [-1, 1].map((s) => {
        const sh = pivot(p.root, s * 0.75, 2.1, -0.4);
        box(sh, 1.3, 0.1, 0.7, 0x5d4037, s * 0.65, 0, 0, 0.3);
        box(sh, 0.9, 0.08, 0.55, WHITE, s * 1.55, 0, 0.1, 0.3);
        box(sh, 0.5, 0.06, 0.4, 0x76ff03, s * 2.1, 0, 0.15, 0.3, glow(0x76ff03, 2));
        return { sh, s };
      });
      // 發光光環（頭頂）
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 8, 24), new THREE.MeshStandardMaterial({ color: 0xffeb3b, ...glow(0xffeb3b, 2.5) }));
      halo.rotation.x = PI / 2;
      halo.position.set(0, 0.85, 0);
      p.head.add(halo);
      p.animate = (t) => {
        trunk.forEach((seg, i) => (seg.rotation.x = Math.sin(t * 1.4 + i * 0.6) * 0.2 + (i ? 0.12 : 0)));
        ears.forEach(({ ear, s }) => (ear.rotation.y = s * (0.2 + Math.sin(t * 2) * 0.15)));
        wings.forEach(({ sh, s }) => (sh.rotation.z = s * (0.15 + Math.sin(t * 3) * 0.3)));
        halo.position.y = 0.85 + Math.sin(t * 2) * 0.05;
        halo.rotation.z = t;
      };
    },
  });
  return g;
}

export const FUSE_MODELS = {
  Rhinoblade: rhinoblade,
  Spideron: spideron,
  Dunkleosteus: dunkleosteus,
  Puffaball: puffaball,
  'Endangered Combination': endangeredCombination,
};
