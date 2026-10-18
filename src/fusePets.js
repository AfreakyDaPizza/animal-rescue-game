// Fuse Machine 先有嘅 5 隻特別寵物（小朋友 2026-10-17 Issue #4；之後話「make all pets look good」再整靚）：
// Rhinoblade（Common）、Spideron（Rare）、Dunkleosteus（Epic）、Puffaball（Legendary）、Endangered Combination（Mythic）
// 方塊風格，同其他動物一樣面向 -z；userData.animate(time, moving)、userData.height、userData.move
// 發光位用 glowMat（每隻寵物自己一份，咁先可以一閃一閃，唔會影響其他寵物）

import * as THREE from 'three';
import { box, pivot, cuteEyes, spike, slab, WHITE } from './modelKit.js';
import { beast, swimmer } from './animals20.js';

const PI = Math.PI;
const METAL = { metalness: 0.75, roughness: 0.28 };
// 每隻寵物自己嘅發光物料（會閃）
const glowMat = (c, k = 1.2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.4 });
// 發光方塊（用自己嘅物料）
function glowBox(parent, w, h, d, m, x, y, z, round = 0.3) {
  const mesh = box(parent, w, h, d, 0xffffff, x, y, z, round);
  mesh.material = m;
  mesh.castShadow = false;
  return mesh;
}
// 細細嘅閃粉光環（Mythic／Legendary 用）：一粒粒細方塊圍住隻寵物轉
function sparkleRing(parent, r, y, color, n = 12) {
  const ring = pivot(parent, 0, y, 0);
  const m = glowMat(color, 1.5);
  const bits = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    const b = glowBox(ring, 0.09, 0.09, 0.09, m, Math.cos(a) * r, 0, Math.sin(a) * r, 0.2);
    bits.push({ b, a });
  }
  return (t) => {
    ring.rotation.y = t * 0.8;
    bits.forEach(({ b, a }, i) => {
      b.position.y = Math.sin(t * 3 + i) * 0.25;
      b.scale.setScalar(0.6 + Math.abs(Math.sin(t * 4 + a * 3)) * 0.8);
    });
    m.emissiveIntensity = 1.2 + Math.sin(t * 3) * 0.4;
  };
}

// ================= Rhinoblade：鐵甲犀牛，鼻上一把發藍光大刀角 =================
function rhinoblade() {
  const skin = 0x7b8aa6; // 鐵灰藍（光啲，唔好黑矇矇）
  const plate = 0xc5ced6; // 銀色鐵甲
  const dark = 0x263238;
  const edge = glowMat(0x40c4ff, 1.4); // 刀鋒藍光
  const eye = glowMat(0xff1744, 1.4);
  const face = 0xb4c2d4; // 光亮鋼面（唔好黑矇矇）
  const steel = 0xdde4ec;
  const STEEL = { metalness: 0.35, roughness: 0.3 }; // 冇環境反光，金屬感低啲先唔會變黑
  return beast({
    body: { w: 1.6, h: 1.25, d: 2.2, y: 1.4, color: skin },
    head: { w: 0.92, h: 0.8, d: 1.15, y: 1.3, z: -1.55, color: face },
    legs: { w: 0.5, h: 0.88, x: 0.46, zf: -0.65, zb: 0.65, color: skin, paw: dark, toes: plate },
    tail: { w: 0.1, h: 0.1, d: 0.5, y: 1.65, color: skin, angle: 0.9, tip: dark },
    eyes: false,
    walkSpeed: 7,
    extras(p) {
      p.head.rotation.x = 0.18;
      // 光亮鋼面：頭盔 + 一層層鼻甲（越前越窄），面頰甲
      box(p.head, 0.98, 0.22, 0.8, steel, 0, 0.42, 0.05, 0.3, STEEL);
      box(p.head, 0.8, 0.36, 0.5, steel, 0, 0.08, -0.48, 0.3, STEEL);
      box(p.head, 0.64, 0.3, 0.32, face, 0, -0.08, -0.74, 0.35, STEEL); // 口鼻
      box(p.head, 0.5, 0.06, 0.06, dark, 0, -0.2, -0.9, 0.3); // 口
      for (const s of [-1, 1]) {
        box(p.head, 0.08, 0.06, 0.07, dark, s * 0.17, 0.0, -0.9, 0.4); // 鼻窿
        box(p.head, 0.1, 0.28, 0.55, steel, s * 0.46, -0.26, 0.0, 0.35, STEEL); // 面頰甲
      }
      // 刀角：彎彎嘅鋼刀（前面係發藍光嘅刀鋒），一把大嘅喺鼻，一把細嘅喺後
      const t = (i) => i / 8;
      const front = Array.from({ length: 9 }, (_, i) => [0.24 - 0.52 * t(i) ** 1.8, 1.6 * t(i)]);
      const back = Array.from({ length: 9 }, (_, i) => [-0.2 - 0.14 * t(i) ** 1.5, 1.45 * t(i)]);
      const blade = [...front, [-0.36, 1.7], ...back.reverse()];
      const edgeLine = [...front.slice(1).map(([x, y]) => [x + 0.02, y]), [-0.35, 1.72], ...front.slice(1).reverse().map(([x, y]) => [x - 0.06, y - 0.02])];
      const makeBlade = (parent, k) => {
        const b = pivot(parent);
        b.scale.setScalar(k);
        slab(b, blade, 0.1, 0xe3e9ef, { plane: 'side', key: 'rb-blade', bevel: 0.03, smooth: false, extra: STEEL });
        slab(b, edgeLine, 0.17, 0, { plane: 'side', key: 'rb-edge', bevel: 0.01, smooth: false, extra: edge });
        return b;
      };
      const horn = pivot(p.head, 0, 0.18, -0.72);
      horn.rotation.x = -0.15;
      makeBlade(horn, 0.85);
      const horn2 = pivot(p.head, 0, 0.5, -0.12);
      horn2.rotation.x = -0.1;
      makeBlade(horn2, 0.42);
      // 大大對眼：眼白 + 紅光眼珠 + 黑瞳 + 反光，上面有斜斜嘅鋼眉（好有型）
      for (const s of [-1, 1]) {
        const e = pivot(p.head, s * 0.45, 0.17, -0.48);
        e.rotation.y = -s * 0.8;
        box(e, 0.32, 0.28, 0.04, 0xffffff, 0, 0, 0, 0.4);
        glowBox(e, 0.2, 0.2, 0.04, eye, s * 0.03, -0.02, -0.02, 0.4);
        box(e, 0.09, 0.12, 0.03, dark, s * 0.03, -0.02, -0.045, 0.4);
        box(e, 0.05, 0.05, 0.02, 0xffffff, s * -0.04, 0.05, -0.06, 0.4);
        const brow = box(e, 0.38, 0.09, 0.1, steel, 0, 0.18, -0.03, 0.3, STEEL);
        brow.rotation.z = s * 0.3;
        const ear = pivot(p.head, s * 0.33, 0.48, 0.42);
        box(ear, 0.16, 0.32, 0.1, skin, 0, 0.13, 0, 0.45);
        p.ears.push(ear);
      }
      // 背甲：一塊塊疊住，每塊有尖刺同藍光縫
      for (let i = 0; i < 5; i++) {
        const z = -0.85 + i * 0.42;
        box(p.root, 1.4 - i * 0.06, 0.2, 0.4, plate, 0, 2.08, z, 0.25, STEEL);
        glowBox(p.root, 1.42 - i * 0.06, 0.04, 0.05, edge, 0, 2.08, z + 0.2, 0.2);
        spike(p.root, 0.12, 0.45, 0xeceff1, 0, 2.38, z);
      }
      // 膊頭大鐵甲 + 腳甲
      for (const s of [-1, 1]) {
        box(p.root, 0.16, 0.85, 1.0, plate, s * 0.83, 1.55, -0.5, 0.25, STEEL);
        spike(p.root, 0.1, 0.35, 0xeceff1, s * 0.95, 1.95, -0.5, 0, s * -1.2);
        box(p.root, 0.16, 0.7, 0.8, plate, s * 0.83, 1.5, 0.6, 0.25, STEEL);
      }
      p.legs.forEach(({ hip }) => box(hip, 0.56, 0.22, 0.56, plate, 0, -0.35, 0, 0.3, STEEL));
      p.animate = (t, moving) => {
        edge.emissiveIntensity = 0.9 + Math.sin(t * 3) * 0.35;
        eye.emissiveIntensity = 1.2 + Math.max(0, Math.sin(t * 1.3)) * 0.6;
        horn.rotation.x = -0.15 + Math.sin(t * 8) * 0.04 * moving; // 衝嗰陣個角郁吓
      };
    },
  });
}

// ================= Spideron：大蜘蛛（八隻粗腳、一堆發光眼、背上發光花紋）=================
function spideron() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 1.0, 0);
  const shell = 0x1a1036; // 黑紫甲殼
  const fur = 0x4527a0;
  const neon = glowMat(0x00e5ff, 1.3);
  const eyesM = glowMat(0xea80fc, 1.6);
  // 大肚（兩層甲殼）+ 背上發光花紋（沙漏形）
  const abdomen = pivot(root, 0, 0.3, 0.85);
  box(abdomen, 1.7, 1.15, 1.9, shell, 0, 0, 0, 0.42, { roughness: 0.3, metalness: 0.3 });
  box(abdomen, 1.4, 0.3, 1.6, fur, 0, 0.5, 0, 0.42);
  for (const [x, z, w] of [[0, -0.5, 0.5], [0, -0.15, 0.3], [0, 0.2, 0.3], [0, 0.55, 0.5]]) glowBox(abdomen, w, 0.05, 0.22, neon, x, 0.67, z, 0.4);
  for (const s of [-1, 1]) glowBox(abdomen, 0.05, 0.6, 1.0, neon, s * 0.86, 0, 0, 0.4); // 兩邊發光條
  spike(abdomen, 0.12, 0.5, 0xea80fc, 0, 0.1, 1.05, PI / 2);
  // 頭胸 + 頭
  box(root, 1.15, 0.8, 1.0, fur, 0, 0.1, -0.35, 0.38);
  box(root, 0.95, 0.12, 0.85, shell, 0, 0.52, -0.35, 0.38);
  const head = pivot(root, 0, 0.18, -0.88);
  box(head, 0.95, 0.7, 0.45, shell, 0, 0, 0, 0.4);
  cuteEyes(head, 0.2, 0.08, -0.24, 0.18, { iris: 0xd500f9 });
  for (const [x, y, s] of [[-0.38, 0.25, 0.09], [0.38, 0.25, 0.09], [-0.15, 0.3, 0.07], [0.15, 0.3, 0.07], [-0.4, -0.05, 0.07], [0.4, -0.05, 0.07]]) glowBox(head, s, s, 0.04, eyesM, x, y, -0.24, 0.4); // 一堆細眼
  const fangs = [-1, 1].map((s) => {
    const f = pivot(head, s * 0.16, -0.3, -0.18);
    box(f, 0.14, 0.34, 0.14, 0x311b92, 0, -0.12, 0, 0.3);
    spike(f, 0.07, 0.22, WHITE, 0, -0.38, 0, PI);
    return f;
  });
  // 八隻粗腳：上腳 + 膝頭（發光）+ 下腳 + 尖腳
  const legs = [];
  for (let i = 0; i < 4; i++) {
    for (const s of [-1, 1]) {
      const hip = pivot(root, s * 0.52, 0.12, -0.7 + i * 0.32);
      hip.rotation.y = s * (0.6 - i * 0.38);
      const upper = box(hip, 1.0, 0.2, 0.2, fur, s * 0.5, 0.3, 0, 0.3);
      upper.rotation.z = s * 0.6;
      const knee = pivot(hip, s * 0.95, 0.58, 0);
      glowBox(knee, 0.22, 0.22, 0.22, neon, 0, 0, 0, 0.4);
      const lower = box(knee, 0.17, 1.2, 0.17, shell, s * 0.16, -0.55, 0, 0.3);
      lower.rotation.z = s * 0.28;
      spike(knee, 0.08, 0.3, 0xea80fc, s * 0.33, -1.2, 0, PI);
      legs.push({ hip, s, phase: i * 1.3 + (s > 0 ? PI : 0) });
    }
  }
  g.userData.animate = (t, moving) => {
    for (const l of legs) l.hip.rotation.x = Math.sin(t * 12 + l.phase) * 0.35 * moving + Math.sin(t * 2 + l.phase) * 0.04;
    root.position.y = 1.0 + Math.abs(Math.sin(t * 12)) * 0.04 * moving + Math.sin(t * 2) * 0.03;
    head.rotation.y = Math.sin(t * 0.8) * 0.2;
    abdomen.rotation.x = Math.sin(t * 1.6) * 0.06; // 個肚郁吓郁吓
    fangs.forEach((f, i) => (f.rotation.x = Math.sin(t * 6 + i * PI) * 0.15));
    neon.emissiveIntensity = 1.1 + Math.sin(t * 2.5) * 0.4;
    eyesM.emissiveIntensity = 1.3 + Math.sin(t * 5) * 0.4;
  };
  g.userData.height = 2.1;
  g.userData.move = 'walk';
  return g;
}

// ================= Dunkleosteus：古代鐵甲魚（銅色骨甲、刀咁嘅骨牙、發光骨縫、浮喺半空游）=================
function dunkleosteus() {
  const armor = 0xb0874f; // 銅色骨甲（光啲）
  const armor2 = 0x7a5a3a;
  const seam = glowMat(0xffab40, 1.5); // 骨縫發橙光
  const eye = glowMat(0xff1744, 1.5);
  let jaw = null;
  let swimRoot = null;
  const g = swimmer({
    skin: 0x4f7486, belly: 0xc5d3da, len: 4.6, w: 1.2, h: 1.1, whale: false, dorsal: 1.0, eyeSize: 0.001,
    extras({ root, mid, rear }) {
      swimRoot = root;
      // 頭甲：一大塊 + 幾層骨板 + 發光縫
      box(root, 1.32, 1.2, 1.5, armor, 0, 0.08, -1.6, 0.25, { roughness: 0.4, metalness: 0.35 });
      for (const y of [0.42, 0.02]) {
        box(root, 1.36, 0.08, 1.4, armor2, 0, y, -1.6, 0.2);
        glowBox(root, 1.38, 0.03, 0.05, seam, 0, y, -0.88, 0.2);
      }
      box(root, 1.2, 0.3, 0.5, armor, 0, 0.6, -0.8, 0.25, { roughness: 0.4, metalness: 0.35 }); // 頸甲
      for (let i = 0; i < 3; i++) spike(root, 0.12, 0.45, 0xd7ccc8, 0, 0.82, -1.9 + i * 0.45, -0.3); // 頭頂骨刺
      // 下巴（會開合）+ 刀咁嘅骨牙
      jaw = pivot(root, 0, -0.38, -1.0);
      box(jaw, 1.1, 0.3, 1.2, armor2, 0, -0.1, -0.65, 0.2);
      for (const s of [-1, 1]) {
        spike(jaw, 0.11, 0.38, 0xfff8e1, s * 0.32, 0.15, -1.2, 0);
        spike(root, 0.13, 0.42, 0xfff8e1, s * 0.32, -0.25, -2.32, PI);
      }
      glowBox(root, 0.9, 0.12, 0.1, glowMat(0x4a0000, 0.6), 0, -0.36, -2.3, 0.2); // 口入面紅紅哋
      // 兇眼（側面、發紅光）
      for (const s of [-1, 1]) {
        box(root, 0.05, 0.3, 0.3, 0xfff8e1, s * 0.67, 0.25, -1.9, 0.4);
        glowBox(root, 0.06, 0.16, 0.16, eye, s * 0.69, 0.23, -1.9, 0.4);
      }
      // 身上鰓紋 + 背上鐵甲排 + 尾段發光線
      for (let i = 0; i < 5; i++) box(root, 1.22, 0.03, 0.06, 0x263238, 0, 0.12 - i * 0.1, -0.7 + i * 0.02, 0.2);
      for (let i = 0; i < 3; i++) box(mid, 1.0 - i * 0.1, 0.12, 0.35, armor, 0, 0.52, 0.2 + i * 0.45, 0.25);
      for (const s of [-1, 1]) glowBox(rear, 0.04, 0.08, 0.9, seam, s * 0.37, 0.05, 0.5, 0.3);
    },
  });
  const base = g.userData.animate;
  g.userData.animate = (t, moving) => {
    base(t, moving);
    swimRoot.position.y += 0.8; // 浮高啲，好似喺半空游
    jaw.rotation.x = Math.max(0, Math.sin(t * 1.4)) ** 3 * 0.45; // 間中張大口
    seam.emissiveIntensity = 1 + Math.sin(t * 2) * 0.35;
  };
  g.userData.height += 0.8;
  g.userData.move = 'swim';
  return g;
}

// ================= Puffaball：金色河豚球（好多刺、發光面珠、細皇冠、會脹會縮、浮喺半空）=================
function puffaball() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 1.4, 0);
  const body = pivot(root);
  const gold = 0xffca28;
  const spikeM = glowMat(0xff6d00, 0.8);
  const cheek = glowMat(0xff80ab, 0.9);
  box(body, 1.6, 1.5, 1.6, gold, 0, 0, 0, 0.5);
  box(body, 1.3, 0.55, 1.3, 0xfff8e1, 0, -0.52, 0, 0.5); // 白肚
  for (let i = 0; i < 7; i++) box(body, 0.2, 0.04, 0.2, 0xff8f00, ((i % 3) - 1) * 0.44, 0.76, (Math.floor(i / 3) - 1) * 0.42, 0.4); // 背上斑點
  // 刺：四圈 + 頂底
  const spikes = [];
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * PI * 2 + r * 0.35;
      const y = (r - 1.5) * 0.4;
      const rr = r === 1 || r === 2 ? 0.84 : 0.66;
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 4), spikeM);
      m.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
      m.lookAt(new THREE.Vector3(Math.cos(a) * 5, y * 4, Math.sin(a) * 5));
      m.rotateX(PI / 2);
      body.add(m);
      spikes.push(m);
    }
  }
  // 大眼 + 發光面珠 + 嘟嘴
  cuteEyes(body, 0.34, 0.18, -0.81, 0.3, { iris: 0x00b0ff });
  for (const s of [-1, 1]) glowBox(body, 0.22, 0.12, 0.04, cheek, s * 0.5, -0.12, -0.8, 0.45);
  box(body, 0.3, 0.2, 0.08, 0xff8a80, 0, -0.22, -0.82, 0.45);
  // 細金皇冠（Legendary！）
  const crown = pivot(body, 0, 0.82, 0);
  box(crown, 0.6, 0.16, 0.6, 0xffd600, 0, 0, 0, 0.2, METAL);
  for (const [x, z] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) spike(crown, 0.07, 0.24, 0xffd600, x, 0.18, z);
  glowBox(crown, 0.12, 0.12, 0.05, glowMat(0x18ffff, 1.4), 0, 0.02, -0.31, 0.3);
  const fins = [-1, 1].map((s) => {
    const p = pivot(body, s * 0.8, -0.05, 0.1);
    box(p, 0.06, 0.4, 0.45, 0xffb300, s * 0.04, 0, 0.12, 0.4);
    return { p, s };
  });
  const tail = pivot(body, 0, 0, 0.8);
  box(tail, 0.06, 0.6, 0.45, 0xffb300, 0, 0, 0.22, 0.4);
  const sparkle = sparkleRing(root, 1.4, 0, 0xffe57f, 10);
  g.userData.animate = (t, moving) => {
    const puff = 1 + Math.max(0, Math.sin(t * 0.7)) ** 6 * 0.28; // 間中脹大
    body.scale.setScalar(puff);
    spikes.forEach((m) => (m.scale.y = 0.8 + (puff - 1) * 3)); // 脹嗰陣啲刺伸長
    root.position.y = 1.4 + Math.sin(t * 1.8) * 0.15;
    root.rotation.z = Math.sin(t * 1.2) * 0.08;
    fins.forEach(({ p, s }) => (p.rotation.y = s * Math.sin(t * 9) * 0.5));
    tail.rotation.y = Math.sin(t * 6 + moving) * 0.4;
    spikeM.emissiveIntensity = 0.6 + (puff - 1) * 3;
    sparkle(t);
  };
  g.userData.height = 2.3;
  g.userData.move = 'swim';
  return g;
}

// ================= Endangered Combination：熊貓頭 + 象耳象鼻 + 鷹翼 + 龜殼 + 老虎身，全身發光（Mythic）=================
function endangeredCombination() {
  const tiger = 0xff9800;
  const stripe = 0x212121;
  const rune = glowMat(0x76ff03, 1.2); // 綠色魔法光
  const haloM = glowMat(0xffeb3b, 1.5);
  let sparkle = null;
  const g = beast({
    body: { w: 1.6, h: 1.3, d: 2.2, y: 1.5, color: tiger },
    head: { w: 1.25, h: 1.1, d: 1.0, y: 2.15, z: -1.4, color: WHITE },
    legs: { w: 0.5, h: 0.9, x: 0.48, zf: -0.66, zb: 0.66, color: tiger, paw: 0x1d1d1d, toes: WHITE },
    tail: { w: 0.18, h: 0.18, d: 1.2, y: 1.85, color: tiger, angle: 0.5, tip: stripe },
    belly: 0xfff3e0,
    eyes: false,
    extraHeight: 1.0,
    extras(p) {
      // 老虎間紋（身同腳）
      for (let i = 0; i < 5; i++) box(p.root, 1.64, 0.55, 0.1, stripe, 0, 1.62, -0.9 + i * 0.45, 0.2);
      p.legs.forEach(({ hip }) => box(hip, 0.54, 0.1, 0.54, stripe, 0, -0.35, 0, 0.2));
      // 龜殼：綠色、六角片、片之間發綠光
      box(p.root, 1.4, 0.4, 1.7, 0x4e7d34, 0, 2.25, 0.2, 0.42);
      box(p.root, 1.08, 0.3, 1.32, 0x5b8f3c, 0, 2.5, 0.2, 0.45);
      for (const [x, z] of [[0, -0.25], [-0.36, 0.2], [0.36, 0.2], [0, 0.62], [0, 0.2]]) {
        box(p.root, 0.34, 0.06, 0.34, 0x8bc34a, x, 2.67, z, 0.4);
        glowBox(p.root, 0.38, 0.03, 0.38, rune, x, 2.65, z, 0.4);
      }
      // 熊貓頭：黑耳、黑眼圈、大綠眼、黑鼻
      for (const s of [-1, 1]) {
        const ear = pivot(p.head, s * 0.48, 0.5, 0.05);
        box(ear, 0.36, 0.34, 0.22, 0x1d1d1d, 0, 0.1, 0, 0.45);
        p.ears.push(ear);
        box(p.head, 0.34, 0.42, 0.05, 0x1d1d1d, s * 0.27, 0.06, -0.52, 0.45).rotation.z = s * -0.35;
      }
      cuteEyes(p.head, 0.27, 0.07, -0.56, 0.15, { iris: 0x76ff03 });
      box(p.head, 0.2, 0.12, 0.08, 0x1d1d1d, 0, -0.16, -0.54, 0.45);
      // 象耳（大大塊、粉紅內耳）+ 象鼻（三節，尖端發光）
      const ears = [-1, 1].map((s) => {
        const ear = pivot(p.head, s * 0.62, 0.0, 0.1);
        box(ear, 0.08, 1.05, 0.95, 0x9c968f, s * 0.05, -0.1, 0.36, 0.35);
        box(ear, 0.04, 0.78, 0.66, 0xf48fb1, s * 0.02, -0.1, 0.38, 0.35);
        return { ear, s };
      });
      let parent = p.head;
      const trunk = [];
      [0.32, 0.27, 0.22].forEach((w, i) => {
        const seg = pivot(parent, 0, i === 0 ? -0.3 : -0.38, i === 0 ? -0.55 : 0);
        box(seg, w, 0.44, w, 0x9c968f, 0, -0.2, 0, 0.4);
        trunk.push(seg);
        parent = seg;
      });
      glowBox(parent, 0.24, 0.1, 0.24, rune, 0, -0.42, 0, 0.4);
      // 鷹翼：啡色 + 白色羽 + 尖端發光，三層羽毛
      const wings = [-1, 1].map((s) => {
        const base = pivot(p.root, s * 0.8, 2.35, -0.3);
        base.rotation.x = -0.5; // 翼面斜斜對住前面，前後都睇到
        const sh = pivot(base);
        for (let k = 0; k < 4; k++) {
          const len = 0.95 - k * 0.1;
          box(sh, len, 0.16, 0.42, k < 2 ? 0x5d4037 : 0x8d6e63, s * (0.45 + k * 0.62), 0.03 * k, 0.05 * k, 0.3);
          box(sh, 0.5, 0.12, 0.8, k % 2 ? WHITE : 0xeeeeee, s * (0.45 + k * 0.62), -0.04, 0.55, 0.3); // 下面嘅長羽
        }
        glowBox(sh, 0.6, 0.12, 0.7, rune, s * 2.78, 0.06, 0.4, 0.3);
        return { sh, s };
      });
      // 頭頂發光光環
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 28), haloM);
      halo.rotation.x = PI / 2;
      halo.position.set(0, 0.95, 0);
      p.head.add(halo);
      sparkle = sparkleRing(p.root, 2.2, 1.9, 0xb9f6ca, 14);
      p.animate = (t) => {
        trunk.forEach((seg, i) => (seg.rotation.x = Math.sin(t * 1.4 + i * 0.6) * 0.22 + (i ? 0.12 : 0)));
        ears.forEach(({ ear, s }) => (ear.rotation.y = s * (0.2 + Math.sin(t * 2) * 0.18)));
        wings.forEach(({ sh, s }) => (sh.rotation.z = s * (0.45 + Math.sin(t * 3) * 0.3))); // 翼舉高、拍吓拍吓
        halo.position.y = 0.95 + Math.sin(t * 2) * 0.06;
        halo.rotation.z = t;
        rune.emissiveIntensity = 1 + Math.sin(t * 2.4) * 0.4;
        haloM.emissiveIntensity = 1.3 + Math.sin(t * 3) * 0.3;
        sparkle(t);
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
