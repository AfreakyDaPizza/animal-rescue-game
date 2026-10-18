// 「最差 20 隻」入面嘅 11–20 號重新設計（小朋友 2026-10-18：「what bout the rest of the 20」）
// 用圓波波（ball）砌身，輪廓圓啲、似真啲；面要一眼認得出（大眼、招牌嘴／鼻／角）
// 全部面向 -z。每個回傳 Group：userData.animate(time, moving)、userData.height、userData.move
// animalModels.js 嘅 buildAnimalModel 會優先用呢度嘅款

import * as THREE from 'three';
import { box, ball, pivot, slab, spike, material, BLACK, WHITE } from './modelKit.js';
import { sleek, sleekEyes, noseIn, tailOut, smooth01, seeded } from './animals20.js';

const PI = Math.PI;
const UP = new THREE.Vector3(0, 1, 0);

// 圓眼：眼白 + 有色眼珠 + 黑瞳 + 反光（貼喺 parent 嘅 z 面，向 -z）
function roundEyes(parent, dx, y, z, size, { iris = 0x3e2723, white = 0xffffff, pupil = 0x111111, noWhite = false } = {}) {
  for (const s of [-1, 1]) {
    const x = s * dx;
    if (!noWhite) ball(parent, size, size * 1.08, size * 0.5, white, x, y, z);
    ball(parent, size * 0.74, size * 0.8, size * 0.42, iris, x - s * size * 0.06, y - size * 0.06, z - size * 0.14);
    ball(parent, size * 0.42, size * 0.46, size * 0.3, pupil, x - s * size * 0.08, y - size * 0.08, z - size * 0.3);
    ball(parent, size * 0.17, size * 0.17, size * 0.1, 0xffffff, x + s * size * 0.12, y + size * 0.26, z - size * 0.42);
  }
}

// 一嚿嚿毛（細波波），令個身鬆毛啲
function fluff(parent, n, color, cx, cy, cz, rx, ry, rz, size, seed = 1) {
  const r = seeded(seed * 977 + 13);
  for (let i = 0; i < n; i++) {
    const a = r() * PI * 2;
    const b = (r() - 0.5) * PI;
    ball(parent, size, size * 0.85, size, color, cx + Math.cos(a) * Math.cos(b) * rx, cy + Math.sin(b) * ry, cz + Math.sin(a) * Math.cos(b) * rz);
  }
}

// 一條棍由 a 去 b（腳、角、獠牙）
function rod(parent, a, b, w, color, round = 0.45, extra) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = box(parent, w, d.length() + w * 0.6, w, color, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, round, extra);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

// 一串越嚟越幼嘅波波，沿住曲線（角、尾）
function beads(parent, pts, r0, r1, color, n = 12) {
  const curve = new THREE.CatmullRomCurve3(pts);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = curve.getPoint(t);
    const r = r0 + (r1 - r0) * t;
    ball(parent, r, r, r, color, p.x, p.y, p.z);
  }
}

// 喺橢圓身表面放一個圈（海豹嘅 ring 花紋）
const ringGeo = new THREE.TorusGeometry(1, 0.22, 6, 16);
function ringOn(parent, c, r, dir, size, color) {
  const d = dir.clone().normalize();
  const p = new THREE.Vector3(c.x + d.x * r.x, c.y + d.y * r.y, c.z + d.z * r.z);
  const n = new THREE.Vector3(d.x / r.x, d.y / r.y, d.z / r.z).normalize();
  const m = new THREE.Mesh(ringGeo, material(color));
  m.position.copy(p);
  m.scale.set(size, size, size * 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  parent.add(m);
  return m;
}

// 四隻腳（hip 喺 root，腳由 hip 向下）
function legs4(root, { x, zf, zb, h, w, color, paw, pawColor = paw, hoof = false, back = 1 }) {
  return [[-x, zf, 0], [x, zf, PI], [-x, zb, PI], [x, zb, 0]].map(([lx, lz, phase], i) => {
    const hh = i >= 2 ? h * back : h;
    const hip = pivot(root, lx, hh, lz);
    box(hip, w, hh * 0.62, w * 1.05, color, 0, -hh * 0.3, 0, 0.45); // 大髀
    box(hip, w * 0.78, hh * 0.5, w * 0.8, color, 0, -hh * 0.7, 0, 0.45); // 小腿
    if (paw) box(hip, w * (hoof ? 0.9 : 1.1), hh * 0.14, w * (hoof ? 1 : 1.25), pawColor, 0, -hh + hh * 0.07, hoof ? 0 : -w * 0.1, hoof ? 0.25 : 0.45);
    return { hip, phase };
  });
}

function walkAnim(g, root, legs, { speed = 9, swing = 0.5, neck, tail, ears = [], extra } = {}) {
  g.userData.animate = (t, moving) => {
    for (const l of legs) l.hip.rotation.x = Math.sin(t * speed + l.phase) * swing * moving;
    root.position.y = Math.abs(Math.sin(t * speed)) * 0.04 * moving;
    if (neck) {
      neck.rotation.x = Math.sin(t * 2) * 0.05 + Math.sin(t * speed * 2) * 0.03 * moving;
      neck.rotation.y = Math.sin(t * 0.7) * 0.28 * (1 - moving);
    }
    if (tail) tail.rotation.y = Math.sin(t * 6) * 0.3;
    ears.forEach((e, i) => (e.rotation.z = (e.userData.base || 0) + (Math.max(0, Math.sin(t * 1.3 + i)) > 0.95 ? Math.sin(t * 30) * 0.25 : 0)));
    extra?.(t, moving);
  };
  g.userData.move = 'walk';
}

// 雀仔郁法（同 animals20 嘅 bird 一樣：飛緊就拍翼）
function birdAnim(g, root, head, wings, feet, tail) {
  g.userData.animate = (t, moving) => {
    if (g.userData.flying) {
      feet.forEach((l) => (l.rotation.x = 0.9));
      root.rotation.x = 0.35;
      root.position.y = 0;
      wings.forEach(({ p, s }) => (p.rotation.z = s * (0.35 + Math.sin(t * 14) * 0.95)));
      head.rotation.set(-0.3, 0, 0);
      return;
    }
    root.rotation.x = 0;
    feet.forEach((l, i) => (l.rotation.x = Math.sin(t * 12 + i * PI) * 0.6 * moving));
    root.position.y = Math.abs(Math.sin(t * 12)) * 0.05 * moving;
    const flap = Math.max(0, Math.sin(t * 1.3)) > 0.85 ? Math.sin(t * 25) * 0.9 : 0.05;
    wings.forEach(({ p, s }) => (p.rotation.z = s * Math.abs(flap)));
    head.rotation.set(0, Math.sin(t * 1.7) * 0.4 * (1 - moving), Math.sin(t * 0.9) * 0.15);
    if (tail) tail.rotation.x = 0.5 + Math.sin(t * 3) * 0.05;
  };
  g.userData.move = 'fly';
}

// ================= 環斑海豹：胖胖圓身、大黑眼、鬚、背上一個個淺色圈 =================
function ringedSeal() {
  const skin = 0x5d6670;
  const light = 0xc4cbd0;
  const belly = 0xb5bdc3;
  const g = new THREE.Group();
  const root = pivot(g);
  const bc = new THREE.Vector3(0, 0.36, -0.12);
  const br = new THREE.Vector3(0.42, 0.34, 0.62);
  ball(root, br.x, br.y, br.z, skin, bc.x, bc.y, bc.z);
  ball(root, 0.38, 0.22, 0.56, belly, 0, 0.18, -0.14);
  const back = pivot(root, 0, 0.3, 0.38);
  const kc = new THREE.Vector3(0, 0, 0.18);
  const kr = new THREE.Vector3(0.3, 0.24, 0.42);
  ball(back, kr.x, kr.y, kr.z, skin, kc.x, kc.y, kc.z);
  ball(back, 0.26, 0.14, 0.36, belly, 0, -0.12, 0.16);
  const tail = pivot(back, 0, -0.08, 0.56);
  const fan = [[0, 0.06], [0.2, 0.1], [0.36, 0.16], [0.4, 0.04], [0.38, -0.12], [0.2, -0.08], [0, -0.06]];
  for (const s of [-1, 1]) {
    const f = pivot(tail, s * 0.08, 0, 0);
    f.rotation.y = -PI / 2 + s * 0.35;
    slab(f, fan, 0.04, 0x434a52, { plane: 'flat', key: 'seal-hind', bevel: 0.02 });
  }
  // 招牌：淺色圈圈（一個大圈入面係深色）
  const r = seeded(5);
  for (let i = 0; i < 16; i++) {
    const a = (r() - 0.5) * 2.2;
    const zz = -0.85 + r() * 1.5;
    ringOn(root, bc, br, new THREE.Vector3(Math.sin(a), Math.cos(a), zz), 0.045 + r() * 0.02, light);
  }
  for (let i = 0; i < 7; i++) {
    const a = (r() - 0.5) * 2.2;
    ringOn(back, kc, kr, new THREE.Vector3(Math.sin(a), Math.cos(a), -0.3 + r() * 1.1), 0.04 + r() * 0.015, light);
  }
  // 圓頭 + 鬚墊 + 大黑眼
  const head = pivot(root, 0, 0.64, -0.7);
  ball(head, 0.3, 0.27, 0.29, skin, 0, 0, 0);
  ball(head, 0.2, 0.13, 0.14, 0x737c85, 0, -0.08, -0.2);
  for (const s of [-1, 1]) {
    ball(head, 0.09, 0.075, 0.08, 0xd6dbde, s * 0.07, -0.1, -0.29); // 鬚墊（白白胖胖）
    for (let k = 0; k < 3; k++) {
      const w = box(head, 0.26, 0.01, 0.01, 0xf5f5f5, s * 0.24, -0.08 - k * 0.03, -0.3, 0.2);
      w.rotation.y = s * (0.25 + k * 0.12);
      w.rotation.z = s * (k - 1) * 0.15;
    }
    ball(head, 0.085, 0.095, 0.06, 0x111111, s * 0.13, 0.05, -0.24); // 大黑眼
    ball(head, 0.025, 0.028, 0.02, 0xffffff, s * 0.15, 0.09, -0.29);
    ball(head, 0.07, 0.03, 0.05, 0x4b535b, s * 0.14, 0.13, -0.22); // 眉
  }
  ball(head, 0.055, 0.035, 0.03, 0x1a1a1a, 0, -0.03, -0.34); // 鼻
  box(head, 0.08, 0.015, 0.02, 0x2b2b2b, 0, -0.17, -0.3, 0.3);
  // 前鰭（有細爪）
  const paddle = [[0, 0.06], [0.18, 0.08], [0.3, 0.04], [0.32, -0.06], [0.16, -0.08], [0, -0.06]];
  const flippers = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.34, 0.14, -0.4);
    const f = pivot(p, 0, 0, 0);
    f.scale.x = s;
    f.rotation.y = s * 0.4;
    slab(f, paddle, 0.05, 0x4a5259, { plane: 'flat', key: 'seal-front', bevel: 0.02 });
    for (let k = 0; k < 3; k++) ball(p, 0.022, 0.018, 0.03, 0x22262a, s * 0.28, 0.02, -0.12 + k * 0.05);
    return { p, s };
  });
  g.userData.animate = (t, moving) => {
    const sp = 3 + moving * 5;
    back.rotation.x = Math.sin(t * sp) * 0.15;
    tail.rotation.x = Math.sin(t * sp - 1) * 0.3;
    head.rotation.x = Math.sin(t * sp + 1) * 0.1;
    head.rotation.z = Math.sin(t * 0.8) * 0.15;
    flippers.forEach(({ p, s }) => (p.rotation.y = s * Math.sin(t * sp) * 0.4 * moving));
  };
  g.userData.height = 1.0;
  g.userData.move = 'walk';
  return g;
}

// ================= 白鯨：順滑白色身、圓圓凸起嘅大額頭（melon）、短嘴、笑口 =================
function beluga() {
  const melon = (u) => Math.exp(-(((u - 0.1) / 0.075) ** 2));
  const neck = (u) => Math.exp(-(((u - 0.25) / 0.05) ** 2));
  return sleek({
    skin: 0xe9f1f5, belly: 0xffffff, len: 3.3, w: 1.0, h: 0.9, n: 2.2, belt: -0.25,
    prof: (u) => [
      noseIn(u, 0.12) * tailOut(u, 0.5, 0.1) * (1 - 0.07 * neck(u)) * (0.92 + 0.08 * melon(u)),
      noseIn(u, 0.14) * tailOut(u, 0.46, 0.13) * (1 + 0.16 * melon(u) - 0.08 * neck(u)),
      0.16 * melon(u) - 0.1 * (1 - smooth01(0, 0.3, u)),
    ],
    extras({ dot, blob, fin, tail, len, h }) {
      const z0 = -len / 2;
      blob(0, -0.2 * h, z0 + 0.06, 0.2, 0.13, 0.16, 0xf4f8fa); // 短短嘅嘴
      blob(0, -0.27 * h, z0 + 0.1, 0.17, 0.05, 0.12, 0xf3a6b8); // 粉紅舌／下唇
      for (const side of [0, 1]) {
        for (let k = 0; k < 8; k++) {
          const a = -0.55 + k * 0.03; // 笑口：由嘴向後向上
          dot(0.04 + k * 0.016, side ? PI - a : a, 0.022, 0.015, 0.05, 0x9fb4c0, 0.004);
        }
        dot(0.12, side ? PI + 0.35 : -0.35, 0.07, 0.01, 0.07, 0xffc9d6, 0.002); // 粉紅面珠
      }
      sleekEyes(dot, 0.18, -0.12, 0.075);
      for (let k = 0; k < 6; k++) dot(0.27, PI / 2 - 0.9 + k * 0.36, 0.05, 0.01, 0.025, 0xd2dde3, 0.002); // 頸摺
      for (let k = 0; k < 10; k++) dot(0.48 + k * 0.03, PI / 2, 0.06, 0.04, 0.03, 0xdde7ec, 0.01); // 背脊（白鯨冇背鰭，只有一條矮脊）
      const pecs = fin(0.3, -0.45, [[0, 0.1], [0.22, 0.12], [0.42, 0.04], [0.5, -0.08], [0.36, -0.14], [0.14, -0.1], [0, -0.08]], { plane: 'flat', key: 'bel-pec', mirror: true, rot: [0, -0.4, -0.35], depth: 0.06 });
      const fluke = [[0, 0.08], [0.22, 0.04], [0.44, -0.08], [0.56, -0.26], [0.42, -0.26], [0.22, -0.2], [0.06, -0.24], [0, -0.18], [-0.06, -0.24], [-0.22, -0.2], [-0.42, -0.26], [-0.56, -0.26], [-0.44, -0.08], [-0.22, 0.04]];
      slab(tail, fluke, 0.06, 0xe9f1f5, { plane: 'flat', key: 'bel-fluke', bevel: 0.03, z: -0.05 });
      return pecs;
    },
  });
}

// ================= 北極海鸚：黑背白肚、白色大面、三色三角大嘴、橙腳 =================
function puffin() {
  const g = new THREE.Group();
  const root = pivot(g);
  const black = 0x1b1d22;
  const feet = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.13, 0.3, 0.02);
    box(p, 0.07, 0.26, 0.07, 0xff7a1a, 0, -0.13, 0, 0.4);
    slab(p, [[0, 0.07], [0.18, 0.09], [0.18, -0.09], [0, -0.07]], 0.03, 0xff6d00, { plane: 'flat', key: 'puf-foot', y: -0.28, bevel: 0.01 }).rotation.z = -PI / 2;
    return p;
  });
  ball(root, 0.34, 0.38, 0.33, black, 0, 0.66, 0.04);
  ball(root, 0.27, 0.32, 0.2, 0xffffff, 0, 0.6, -0.12); // 白肚
  ball(root, 0.3, 0.12, 0.24, black, 0, 0.95, -0.06); // 黑頸圈
  const head = pivot(root, 0, 1.12, -0.06);
  ball(head, 0.25, 0.24, 0.24, black, 0, 0.03, 0.01);
  ball(head, 0.235, 0.19, 0.2, 0xf1f1ef, 0, -0.04, -0.05); // 白色大面
  roundEyes(head, 0.1, 0.03, -0.235, 0.06, { iris: 0x2b1d14, noWhite: true });
  for (const s of [-1, 1]) {
    slab(head, [[0, 0], [0.05, 0.03], [0.1, 0]], 0.02, 0xff5722, { plane: 'front', x: s * 0.1 - 0.05, y: 0.08, z: -0.235, bevel: 0.005, smooth: false }); // 眼上紅三角
    box(head, 0.1, 0.018, 0.02, 0x555b62, s * 0.16, 0.0, -0.21, 0.3).rotation.z = s * 0.25; // 眼後灰線
  }
  // 三角大嘴：灰藍嘴根 → 黃間 → 橙紅嘴尖
  const bk = pivot(head, 0, -0.04, -0.26);
  bk.scale.setScalar(0.8);
  const beakPts = [[0, 0.12], [0.1, 0.1], [0.24, -0.02], [0.22, -0.06], [0.1, -0.12], [0, -0.13]];
  slab(bk, beakPts, 0.13, 0xff4f1f, { plane: 'side', key: 'puf-beak', bevel: 0.02 });
  slab(bk, [[-0.01, 0.12], [0.05, 0.115], [0.05, -0.125], [-0.01, -0.13]], 0.135, 0x5c7385, { plane: 'side', key: 'puf-base', bevel: 0.015, smooth: false });
  slab(bk, [[0.05, 0.112], [0.085, 0.1], [0.085, -0.12], [0.05, -0.124]], 0.137, 0xffd600, { plane: 'side', key: 'puf-band', bevel: 0.01, smooth: false });
  for (let k = 0; k < 2; k++) box(bk, 0.14, 0.014, 0.014, 0xffb74d, 0, 0.02 - k * 0.06, -0.14 + k * 0.01, 0.3).rotation.x = -0.6; // 嘴上嘅坑
  for (const s of [-1, 1]) ball(head, 0.025, 0.03, 0.025, 0xffd600, s * 0.08, -0.12, -0.22); // 嘴角黃色
  const wings = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.31, 0.86, 0.04);
    ball(p, 0.07, 0.3, 0.22, black, s * 0.02, -0.2, 0.04);
    return { p, s };
  });
  const tail = pivot(root, 0, 0.42, 0.32);
  ball(tail, 0.12, 0.05, 0.14, black, 0, 0, 0.08);
  birdAnim(g, root, head, wings, feet, tail);
  g.scale.setScalar(0.95);
  g.userData.height = 1.4 * 0.95;
  return g;
}

// ================= 皇帝企鵝：圓胖身、白肚、心口淡黃、耳邊橙黃大斑、長長彎嘴 =================
function penguin() {
  const g = new THREE.Group();
  const root = pivot(g);
  const black = 0x161b24;
  const back = 0x33404f;
  ball(root, 0.43, 0.64, 0.4, back, 0, 0.8, 0.05);
  ball(root, 0.4, 0.62, 0.36, black, 0, 0.82, 0.01);
  ball(root, 0.36, 0.58, 0.3, 0xfdfdfb, 0, 0.74, -0.1); // 白肚
  ball(root, 0.28, 0.22, 0.2, 0xfff0b3, 0, 1.12, -0.18); // 心口淡黃
  ball(root, 0.26, 0.24, 0.26, black, 0, 1.42, -0.02); // 頸
  const head = pivot(root, 0, 1.64, -0.03);
  ball(head, 0.24, 0.22, 0.24, black, 0, 0, 0);
  for (const s of [-1, 1]) {
    // 耳邊招牌橙黃斑（由頭邊一路落到頸，越落越淡）
    const p1 = ball(head, 0.06, 0.13, 0.1, 0xff9800, s * 0.2, -0.06, 0.02);
    p1.rotation.z = s * 0.3;
    ball(root, 0.06, 0.12, 0.09, 0xffc947, s * 0.21, 1.4, -0.08).rotation.z = s * 0.2;
    ball(root, 0.05, 0.08, 0.07, 0xffe082, s * 0.2, 1.28, -0.13);
  }
  roundEyes(head, 0.11, 0.05, -0.215, 0.055, { iris: 0x2b1d14, noWhite: true });
  // 長長向下彎嘅嘴：上面黑、下嘴有一條粉橙色
  const beak = pivot(head, 0, -0.07, -0.2);
  beak.rotation.x = 0.32;
  const bp = [[0, 0.05], [0.16, 0.035], [0.32, 0.0], [0.3, -0.02], [0.16, -0.03], [0, -0.05]];
  slab(beak, bp, 0.08, black, { plane: 'side', key: 'peng-beak', bevel: 0.015 });
  slab(beak, [[0.02, -0.02], [0.2, -0.02], [0.2, -0.04], [0.02, -0.05]], 0.085, 0xff8a50, { plane: 'side', key: 'peng-stripe', bevel: 0.01, smooth: false });
  const flippers = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.4, 1.2, 0);
    ball(p, 0.05, 0.4, 0.14, black, s * 0.02, -0.36, 0);
    ball(p, 0.03, 0.3, 0.1, 0xf5f5f5, -s * 0.02, -0.38, -0.01);
    return { p, s };
  });
  const feet = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.16, 0.18, -0.02);
    ball(p, 0.1, 0.04, 0.15, 0x37474f, 0, -0.15, -0.08);
    return p;
  });
  g.scale.setScalar(1.1);
  g.userData.animate = (t, moving) => {
    root.rotation.z = Math.sin(t * 8) * 0.15 * moving; // 搖搖擺擺咁行
    feet.forEach((f, i) => (f.position.y = 0.18 + Math.max(0, Math.sin(t * 8 + i * PI)) * 0.1 * moving));
    flippers.forEach(({ p, s }) => (p.rotation.z = s * (0.2 + Math.sin(t * 3) * 0.15 + moving * Math.abs(Math.sin(t * 8)) * 0.3)));
    head.rotation.y = Math.sin(t * 1.1) * 0.3;
    head.rotation.x = Math.sin(t * 0.7) * 0.1;
  };
  g.userData.height = 2.25;
  g.userData.move = 'walk';
  return g;
}

// ================= 山地侏儒負鼠：細細粒、毛毛圓身、超大黑眼、大圓耳、捲尾 =================
function pygmyPossum() {
  const fur = 0x9a8b7d;
  const fur2 = 0xb3a596;
  const cream = 0xf0e6da;
  const g = new THREE.Group();
  const root = pivot(g);
  const legs = legs4(root, { x: 0.12, zf: -0.13, zb: 0.13, h: 0.16, w: 0.08, color: 0xf2b8c3, paw: true, pawColor: 0xf48fb1 });
  ball(root, 0.23, 0.2, 0.27, fur, 0, 0.27, 0.02);
  ball(root, 0.19, 0.14, 0.22, cream, 0, 0.2, -0.02);
  fluff(root, 14, fur2, 0, 0.3, 0.02, 0.2, 0.16, 0.24, 0.07, 3);
  box(root, 0.05, 0.02, 0.36, 0x6d6158, 0, 0.47, 0.02, 0.45); // 背脊深色線
  const neck = pivot(root, 0, 0.36, -0.26);
  const head = pivot(neck);
  ball(head, 0.2, 0.18, 0.18, fur2, 0, 0, 0);
  for (const s of [-1, 1]) ball(head, 0.09, 0.08, 0.08, cream, s * 0.1, -0.07, -0.08); // 胖面頰
  roundEyes(head, 0.085, 0.03, -0.15, 0.07, { iris: 0x1a1a1a, noWhite: true });
  for (const s of [-1, 1]) ball(head, 0.085, 0.085, 0.03, 0x5e5047, s * 0.085, 0.03, -0.135); // 黑眼圈
  ball(head, 0.035, 0.028, 0.025, 0xf06292, 0, -0.06, -0.18);
  const ears = [-1, 1].map((s) => {
    const e = pivot(head, s * 0.13, 0.13, 0.02);
    e.userData.base = s * -0.25;
    ball(e, 0.08, 0.09, 0.02, fur, 0, 0.06, 0);
    ball(e, 0.055, 0.065, 0.015, 0xf8bbd0, 0, 0.06, -0.012);
    return e;
  });
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const w = box(head, 0.16, 0.006, 0.006, 0x3e3530, s * 0.1, -0.06 + k * 0.015, -0.16, 0.2);
    w.rotation.y = s * (0.2 + k * 0.15);
  }
  // 粉紅長尾：一節節捲起
  let parent = root;
  const tail = [];
  for (let i = 0; i < 9; i++) {
    const seg = pivot(parent, 0, i === 0 ? 0.24 : 0, i === 0 ? 0.26 : 0.06);
    ball(seg, 0.025 - i * 0.0012, 0.025 - i * 0.0012, 0.04, 0xe8a9b4, 0, 0, 0.03);
    seg.rotation.x = i === 0 ? 0.3 : -0.38;
    tail.push(seg);
    parent = seg;
  }
  walkAnim(g, root, legs, { speed: 14, swing: 0.6, neck, ears, extra: (t) => tail.forEach((s, i) => (s.rotation.y = Math.sin(t * 3 + i * 0.4) * 0.08)) });
  g.userData.height = 0.55;
  return g;
}

// ================= 北極狐：鬆毛白身、尖尖狐狸嘴、面毛、細圓耳、大小啱啱好嘅毛毛尾 =================
function arcticFox() {
  const fur = 0xfbfbf8;
  const shade = 0xe6e8ea;
  const g = new THREE.Group();
  const root = pivot(g);
  const legs = legs4(root, { x: 0.15, zf: -0.3, zb: 0.3, h: 0.42, w: 0.13, color: shade, paw: true, pawColor: fur });
  ball(root, 0.29, 0.26, 0.48, fur, 0, 0.62, 0.02);
  fluff(root, 16, shade, 0, 0.62, 0.02, 0.26, 0.22, 0.42, 0.1, 4);
  ball(root, 0.31, 0.29, 0.22, fur, 0, 0.72, -0.36); // 頸圈鬆毛
  const neck = pivot(root, 0, 0.92, -0.58);
  const head = pivot(neck);
  ball(head, 0.23, 0.2, 0.21, fur, 0, 0, 0);
  for (const s of [-1, 1]) {
    const c = ball(head, 0.12, 0.1, 0.11, fur, s * 0.17, -0.08, 0.0); // 面毛（向兩邊散開）
    c.rotation.z = s * 0.4;
  }
  // 尖嘴 + 黑鼻
  const snout = box(head, 0.15, 0.12, 0.24, fur, 0, -0.07, -0.24, 0.45);
  snout.rotation.x = 0.12;
  ball(head, 0.07, 0.055, 0.12, shade, 0, -0.11, -0.22);
  ball(head, 0.045, 0.035, 0.035, 0x111111, 0, -0.04, -0.37);
  box(head, 0.06, 0.012, 0.02, 0x5d4037, 0, -0.15, -0.33, 0.3);
  roundEyes(head, 0.095, 0.04, -0.17, 0.065, { iris: 0xc68a3c });
  const ears = [-1, 1].map((s) => {
    const e = pivot(head, s * 0.13, 0.15, 0.02);
    e.userData.base = s * -0.2;
    slab(e, [[-0.08, 0], [0, 0.12], [0.08, 0]], 0.06, fur, { plane: 'front', key: 'afox-ear', bevel: 0.03, smooth: false });
    slab(e, [[-0.045, 0.01], [0, 0.08], [0.045, 0.01]], 0.02, 0xf8c8d8, { plane: 'front', z: -0.035, key: 'afox-ear-in', bevel: 0.005, smooth: false });
    return e;
  });
  // 毛毛尾：長度大約係身長嘅三分二，尾尖最白
  const tail = pivot(root, 0, 0.7, 0.44);
  ball(tail, 0.1, 0.1, 0.2, shade, 0, 0, 0.14);
  ball(tail, 0.15, 0.14, 0.22, fur, 0, -0.05, 0.36);
  ball(tail, 0.13, 0.12, 0.15, 0xffffff, 0, -0.1, 0.56); // 尾尖最白
  walkAnim(g, root, legs, { speed: 11, swing: 0.55, neck, tail, ears });
  g.userData.height = 1.15;
  return g;
}

// ================= Spideron：圓圓大肚 + 頭胸、八隻高膝頭蜘蛛腳、一堆發光眼、背上發光沙漏紋 =================
function glow(color, intensity) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
}
function spideron() {
  const g = new THREE.Group();
  const root = pivot(g, 0, 1.0, 0);
  const shell = 0x1d1240;
  const fur = 0x4a2aa8;
  const neon = glow(0x00e5ff, 1.2);
  const eyeM = glow(0xff4dff, 1.5);
  const shiny = { roughness: 0.25, metalness: 0.2 };
  // 大肚：圓圓、有光澤、背上發光沙漏紋 + 兩邊發光點
  const abdomen = pivot(root, 0, 0.3, 0.72);
  ball(abdomen, 0.82, 0.68, 0.95, shell, 0, 0, 0.1, shiny);
  ball(abdomen, 0.7, 0.5, 0.82, fur, 0, 0.18, 0.1);
  ball(abdomen, 0.2, 0.05, 0.3, 0, 0, 0.67, -0.12, neon);
  ball(abdomen, 0.1, 0.05, 0.14, 0, 0, 0.7, 0.18, neon);
  ball(abdomen, 0.24, 0.05, 0.32, 0, 0, 0.6, 0.52, neon);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) ball(abdomen, 0.07, 0.07, 0.07, 0, s * 0.74, 0.1, -0.3 + k * 0.38, neon);
  spike(abdomen, 0.1, 0.4, 0xea80fc, 0, -0.05, 1.08, PI / 2);
  // 頭胸（細啲）
  ball(root, 0.56, 0.36, 0.56, fur, 0, 0.08, -0.38);
  ball(root, 0.46, 0.12, 0.46, shell, 0, 0.36, -0.38, shiny);
  const head = pivot(root, 0, 0.14, -0.86);
  ball(head, 0.4, 0.32, 0.26, shell, 0, 0, 0, shiny);
  // 八隻眼：兩隻大 + 六隻細（全部發光）
  for (const s of [-1, 1]) {
    ball(head, 0.1, 0.1, 0.06, 0, s * 0.11, 0.06, -0.22, eyeM);
    ball(head, 0.035, 0.035, 0.02, 0xffffff, s * 0.13, 0.1, -0.28);
    for (const [x, y, r] of [[0.28, 0.12, 0.05], [0.24, 0.24, 0.045], [0.06, 0.24, 0.04]]) ball(head, r, r, r * 0.6, 0, s * x, y, -0.19, eyeM);
  }
  const fangs = [-1, 1].map((s) => {
    const f = pivot(head, s * 0.11, -0.2, -0.16);
    ball(f, 0.08, 0.14, 0.08, 0x311b92, 0, -0.06, 0);
    spike(f, 0.05, 0.18, WHITE, 0, -0.24, -0.02, PI);
    return f;
  });
  // 八隻腳：大髀向外向上去到高高嘅膝頭，再斜斜落地
  const legs = [];
  for (let i = 0; i < 4; i++) {
    for (const s of [-1, 1]) {
      const hip = pivot(root, s * 0.42, 0.1, -0.62 + i * 0.2);
      hip.rotation.y = s * (0.75 - i * 0.48);
      const knee = new THREE.Vector3(s * 0.78, 0.72, 0);
      const ankle = new THREE.Vector3(s * 1.42, -0.55, 0);
      const foot = new THREE.Vector3(s * 1.56, -1.1, 0);
      rod(hip, new THREE.Vector3(0, 0, 0), knee, 0.17, fur);
      ball(hip, 0.12, 0.12, 0.12, 0, knee.x, knee.y, 0, neon); // 發光膝頭
      rod(hip, knee, ankle, 0.13, shell, 0.45, shiny);
      rod(hip, ankle, foot, 0.09, shell, 0.45, shiny);
      ball(hip, 0.06, 0.06, 0.06, 0xea80fc, foot.x, foot.y, 0);
      legs.push({ hip, s, phase: i * 1.3 + (s > 0 ? PI : 0) });
    }
  }
  g.userData.animate = (t, moving) => {
    for (const l of legs) {
      l.hip.rotation.x = Math.sin(t * 12 + l.phase) * 0.3 * moving + Math.sin(t * 2 + l.phase) * 0.03;
      l.hip.rotation.z = l.s * Math.max(0, Math.sin(t * 12 + l.phase)) * 0.12 * moving;
    }
    root.position.y = 1.0 + Math.abs(Math.sin(t * 12)) * 0.04 * moving + Math.sin(t * 2) * 0.03;
    head.rotation.y = Math.sin(t * 0.8) * 0.2;
    abdomen.rotation.x = Math.sin(t * 1.6) * 0.06;
    fangs.forEach((f, i) => (f.rotation.x = Math.sin(t * 6 + i * PI) * 0.15));
    neon.emissiveIntensity = 1.0 + Math.sin(t * 2.5) * 0.35;
    eyeM.emissiveIntensity = 1.3 + Math.sin(t * 5) * 0.4;
  };
  g.userData.height = 2.1;
  g.userData.move = 'walk';
  return g;
}

// ================= 雪鴞：圓滾滾白身、圓面盤、金黃大眼、黑細勾嘴、黑斑、毛毛腳 =================
function snowyOwl() {
  const g = new THREE.Group();
  const root = pivot(g);
  const white = 0xfbfbf9;
  const spot = 0x4f5b62;
  const feet = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.15, 0.22, -0.04);
    ball(p, 0.1, 0.12, 0.12, white, 0, -0.1, 0);
    for (const k of [-1, 0, 1]) spike(p, 0.02, 0.08, 0x263238, k * 0.05, -0.2, -0.11, -PI / 2 - 0.3);
    return p;
  });
  ball(root, 0.42, 0.48, 0.4, white, 0, 0.74, 0.04);
  ball(root, 0.36, 0.38, 0.28, 0xffffff, 0, 0.7, -0.1);
  const r = seeded(9);
  for (let i = 0; i < 12; i++) {
    const a = PI * 0.25 + r() * PI * 0.5; // 斑點喺背同兩邊
    const y = 0.55 + r() * 0.45;
    ball(root, 0.04, 0.02, 0.025, spot, Math.cos(a) * 0.4 * (r() < 0.5 ? -1 : 1), y, Math.sin(a) * 0.38 + 0.04).rotation.y = r();
  }
  const head = pivot(root, 0, 1.3, -0.04);
  ball(head, 0.34, 0.3, 0.31, white, 0, 0, 0);
  ball(head, 0.29, 0.25, 0.08, 0xffffff, 0, -0.03, -0.25); // 圓面盤
  for (const s of [-1, 1]) {
    ball(head, 0.1, 0.1, 0.04, 0xf0f0ec, s * 0.12, 0.02, -0.3); // 眼窩
    ball(head, 0.085, 0.085, 0.04, 0xffc400, s * 0.12, 0.02, -0.325); // 金黃大眼
    ball(head, 0.045, 0.05, 0.03, 0x111111, s * 0.115, 0.015, -0.355);
    ball(head, 0.018, 0.018, 0.01, 0xffffff, s * 0.135, 0.045, -0.375);
    const brow = box(head, 0.12, 0.025, 0.03, 0xe6e6e0, s * 0.12, 0.11, -0.31, 0.4);
    brow.rotation.z = s * -0.2;
    ball(head, 0.035, 0.02, 0.02, spot, s * 0.2, 0.2, -0.12);
  }
  ball(head, 0.035, 0.055, 0.04, 0x263238, 0, -0.08, -0.33); // 勾嘴（埋喺毛入面）
  ball(head, 0.06, 0.05, 0.05, 0xf5f5f2, 0, -0.1, -0.32);
  const wings = [-1, 1].map((s) => {
    const p = pivot(root, s * 0.38, 0.98, 0.04);
    ball(p, 0.08, 0.38, 0.28, 0xf3f3ef, s * 0.03, -0.26, 0.04);
    for (let k = 0; k < 7; k++) ball(p, 0.02, 0.025, 0.035, spot, s * 0.105, -0.1 - (k % 4) * 0.12, -0.04 + Math.floor(k / 4) * 0.14 + (k % 2) * 0.05); // 翼上黑點
    return { p, s };
  });
  const tail = pivot(root, 0, 0.42, 0.36);
  ball(tail, 0.18, 0.05, 0.2, 0xf3f3ef, 0, 0, 0.1);
  for (let k = 0; k < 2; k++) box(tail, 0.24, 0.02, 0.03, spot, 0, 0.04, 0.05 + k * 0.08, 0.3);
  birdAnim(g, root, head, wings, feet, tail);
  g.scale.setScalar(1.15);
  g.userData.height = 1.7 * 1.15;
  return g;
}

// ================= 羚牛：金黃長毛、高高駝峰、超大「駝鹿鼻」、粗粗向外再向後上彎嘅角 =================
function takin() {
  const fur = 0xd8ae4c;
  const fur2 = 0xe9c766;
  const shag = 0xc59a3e;
  const face = 0x4a3426;
  const g = new THREE.Group();
  const root = pivot(g);
  const legs = legs4(root, { x: 0.32, zf: -0.5, zb: 0.55, h: 0.78, w: 0.26, color: 0x4a3426, paw: true, pawColor: 0x1e140d, hoof: true });
  ball(root, 0.58, 0.52, 0.9, fur, 0, 1.2, 0.08);
  ball(root, 0.6, 0.55, 0.55, fur2, 0, 1.45, -0.42); // 膊頭駝峰
  fluff(root, 18, shag, 0, 1.05, 0.0, 0.5, 0.2, 0.8, 0.16, 5);
  for (let i = 0; i < 16; i++) {
    const s = i % 2 ? 1 : -1;
    ball(root, 0.07, 0.17, 0.09, i % 3 ? fur2 : shag, s * 0.48, 0.86 - (i % 4) * 0.02, -0.7 + Math.floor(i / 2) * 0.2); // 垂落嘅長毛
  }
  const neck = pivot(root, 0, 1.4, -0.95);
  const head = pivot(neck);
  head.rotation.x = 0.25;
  ball(head, 0.3, 0.3, 0.36, face, 0, 0, 0);
  ball(head, 0.34, 0.24, 0.22, fur, 0, 0.12, 0.18); // 後腦金毛
  // 超大駝鹿鼻：向前凸、圓圓拱起
  ball(head, 0.24, 0.2, 0.3, 0x3a281d, 0, 0.0, -0.3);
  ball(head, 0.27, 0.23, 0.22, 0x33231a, 0, -0.12, -0.46);
  for (const s of [-1, 1]) ball(head, 0.05, 0.06, 0.03, BLACK, s * 0.1, -0.12, -0.67);
  box(head, 0.2, 0.02, 0.03, 0x1e140d, 0, -0.27, -0.58, 0.3);
  roundEyes(head, 0.2, 0.08, -0.2, 0.06, { iris: 0x4e342e });
  // 粗角：由頭頂向兩邊出 → 向後 → 向上（好似一個鈎）
  for (const s of [-1, 1]) {
    beads(head, [new THREE.Vector3(s * 0.1, 0.24, 0.02), new THREE.Vector3(s * 0.32, 0.26, 0.0), new THREE.Vector3(s * 0.48, 0.22, 0.12), new THREE.Vector3(s * 0.52, 0.36, 0.28), new THREE.Vector3(s * 0.44, 0.52, 0.36)], 0.1, 0.035, 0x2a201a, 14);
    ball(head, 0.13, 0.08, 0.12, 0x3a2c22, s * 0.12, 0.26, 0.02); // 角根
  }
  const ears = [-1, 1].map((s) => {
    const e = pivot(head, s * 0.28, 0.06, 0.12);
    e.userData.base = 0;
    ball(e, 0.12, 0.05, 0.07, face, s * 0.06, 0, 0);
    return e;
  });
  const tail = pivot(root, 0, 1.38, 0.94);
  ball(tail, 0.08, 0.1, 0.08, fur, 0, -0.04, 0.02);
  walkAnim(g, root, legs, { speed: 6, swing: 0.45, neck, tail, ears });
  g.userData.height = 2.0;
  return g;
}

// ================= 喜馬拉雅麝：屁股高高、淺色斑點、大大對兔仔耳、兩隻長獠牙 =================
function muskDeer() {
  const fur = 0x7a5f45;
  const fur2 = 0x8f7458;
  const pale = 0xe2cfaf;
  const g = new THREE.Group();
  const root = pivot(g);
  const legs = legs4(root, { x: 0.14, zf: -0.3, zb: 0.32, h: 0.62, w: 0.1, color: 0x4e3a28, paw: true, pawColor: 0x1e140d, hoof: true, back: 1.15 });
  ball(root, 0.23, 0.25, 0.42, fur, 0, 0.84, -0.02);
  ball(root, 0.25, 0.29, 0.26, fur, 0, 0.92, 0.26); // 屁股高過膊頭
  ball(root, 0.2, 0.12, 0.38, 0xb89c7a, 0, 0.66, 0.02); // 肚
  const r = seeded(3);
  for (let i = 0; i < 18; i++) {
    const s = r() < 0.5 ? -1 : 1;
    ball(root, 0.012, 0.035, 0.035, pale, s * (0.21 + r() * 0.03), 0.8 + r() * 0.22, -0.3 + r() * 0.6);
  }
  ball(root, 0.14, 0.22, 0.16, fur2, 0, 0.98, -0.4); // 頸
  for (const s of [-1, 1]) ball(root, 0.035, 0.16, 0.06, pale, s * 0.1, 0.95, -0.48); // 頸前兩條白紋
  const neck = pivot(root, 0, 1.14, -0.56);
  const head = pivot(neck);
  ball(head, 0.16, 0.15, 0.19, fur2, 0, 0, 0);
  ball(head, 0.1, 0.09, 0.12, 0x5d4637, 0, -0.07, -0.17); // 嘴
  ball(head, 0.04, 0.03, 0.025, BLACK, 0, -0.04, -0.28);
  roundEyes(head, 0.1, 0.04, -0.12, 0.06, { iris: 0x3e2723 });
  for (const s of [-1, 1]) {
    // 長長獠牙：由上顎垂落，微微向後彎
    beads(head, [new THREE.Vector3(s * 0.045, -0.1, -0.2), new THREE.Vector3(s * 0.05, -0.2, -0.19), new THREE.Vector3(s * 0.048, -0.29, -0.15)], 0.018, 0.009, 0xfffaf0, 6);
  }
  const ears = [-1, 1].map((s) => {
    const e = pivot(head, s * 0.11, 0.1, 0.05);
    e.userData.base = s * -0.45;
    ball(e, 0.055, 0.17, 0.1, fur2, 0, 0.14, 0);
    ball(e, 0.03, 0.13, 0.07, 0xe8c9b0, 0, 0.14, -0.035);
    return e;
  });
  const tail = pivot(root, 0, 1.0, 0.5);
  ball(tail, 0.05, 0.06, 0.05, fur, 0, 0, 0.02);
  walkAnim(g, root, legs, { speed: 10, swing: 0.5, neck, tail, ears });
  g.userData.height = 1.45;
  return g;
}

export const WORST_PETS = {
  'Ringed Seal': ringedSeal,
  'Beluga Whale': beluga,
  'Atlantic Puffin': puffin,
  'Emperor Penguin': penguin,
  'Mountain Pygmy Possum': pygmyPossum,
  'Arctic Fox': arcticFox,
  Spideron: spideron,
  'Snowy Owl': snowyOwl,
  Takin: takin,
  'Himalayan Musk Deer': muskDeer,
};
